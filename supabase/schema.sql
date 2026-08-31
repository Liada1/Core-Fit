-- CORE FIT — schema do Supabase
-- Rode este arquivo inteiro em: Supabase Dashboard > SQL Editor > New query > Run

create extension if not exists pgcrypto;

-- =========================================================
-- TABELA: products (produtos)
-- =========================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  preco numeric(10,2) not null default 0,
  imagem_url text,
  galeria text[] not null default '{}',
  categoria text not null default 'acessorios' check (categoria in ('tenis','roupas','acessorios')),
  genero text not null default 'unissex' check (genero in ('homem','mulher','unissex')),
  -- cores: [{ "nome": "Preto Stealth / Volt", "hex": "#121212" }, ...]
  cores jsonb not null default '[]'::jsonb,
  -- tamanhos: [{ "tamanho": "40", "estoque": 10 }, ...]  (produtos sem grade de tamanho usam uma única entrada "Único")
  --   Opcional: cada entrada pode ter "cor" ("Preto", ...) para controlar estoque por cor + tamanho — ver migration_4_estoque_por_cor.sql
  tamanhos jsonb not null default '[]'::jsonb,
  destaque boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.products.tamanhos is 'Grade de estoque por tamanho. Fonte única de verdade para disponibilidade — decrementada atomicamente pela função criar_pedido().';

-- =========================================================
-- TABELA: pedidos
-- =========================================================
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente text not null,
  telefone text not null,
  -- itens: [{ "produto_id", "nome", "imagem_url", "tamanho", "cor", "quantidade", "preco_unitario" }, ...]
  itens jsonb not null,
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  forma_entrega text not null default 'entrega' check (forma_entrega in ('entrega','retirada')),
  endereco text,
  forma_pagamento text not null default 'pix' check (forma_pagamento in ('pix','cartao')),
  status text not null default 'pendente' check (status in ('pendente','confirmado','enviado','entregue','cancelado')),
  created_at timestamptz not null default now()
);

create index if not exists pedidos_created_at_idx on public.pedidos (created_at desc);
create index if not exists products_categoria_idx on public.products (categoria);
create index if not exists products_genero_idx on public.products (genero);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.products enable row level security;
alter table public.pedidos enable row level security;

-- Qualquer visitante (anon) pode ler o catálogo de produtos.
drop policy if exists "produtos_leitura_publica" on public.products;
create policy "produtos_leitura_publica"
  on public.products for select
  using (true);

-- Somente administradores autenticados (Supabase Auth) podem criar/editar/excluir produtos.
drop policy if exists "produtos_admin_insert" on public.products;
create policy "produtos_admin_insert"
  on public.products for insert
  to authenticated
  with check (true);

drop policy if exists "produtos_admin_update" on public.products;
create policy "produtos_admin_update"
  on public.products for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "produtos_admin_delete" on public.products;
create policy "produtos_admin_delete"
  on public.products for delete
  to authenticated
  using (true);

-- Pedidos só podem ser lidos/atualizados pelo administrador autenticado.
-- A criação de pedidos acontece exclusivamente via função criar_pedido() (SECURITY DEFINER),
-- para garantir que o decremento de estoque e a inserção do pedido sejam atômicos e não possam
-- ser manipulados diretamente pelo cliente (anon).
drop policy if exists "pedidos_admin_leitura" on public.pedidos;
create policy "pedidos_admin_leitura"
  on public.pedidos for select
  to authenticated
  using (true);

drop policy if exists "pedidos_admin_update" on public.pedidos;
create policy "pedidos_admin_update"
  on public.pedidos for update
  to authenticated
  using (true)
  with check (true);

-- =========================================================
-- FUNÇÃO: criar_pedido
-- Cria o pedido e decrementa o estoque do(s) tamanho(s) comprado(s) em uma única
-- transação atômica (com row lock via "for update"), evitando concorrência/overselling.
-- =========================================================
create or replace function public.criar_pedido(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  novo_id uuid;
  item jsonb;
  produto_row public.products%rowtype;
  tamanhos_atualizados jsonb;
  tamanho_obj jsonb;
  estoque_disponivel int;
  quantidade_pedida int;
  encontrado boolean;
  subtotal_calc numeric(10,2) := 0;
begin
  if payload->'itens' is null or jsonb_array_length(payload->'itens') = 0 then
    raise exception 'O pedido não contém itens.';
  end if;

  for item in select * from jsonb_array_elements(payload->'itens')
  loop
    select * into produto_row
      from public.products
      where id = (item->>'produto_id')::uuid
      for update;

    if not found then
      raise exception 'Produto não encontrado: %', item->>'produto_id';
    end if;

    quantidade_pedida := (item->>'quantidade')::int;
    encontrado := false;
    tamanhos_atualizados := '[]'::jsonb;

    for tamanho_obj in select * from jsonb_array_elements(produto_row.tamanhos)
    loop
      if tamanho_obj->>'tamanho' = item->>'tamanho' then
        estoque_disponivel := coalesce((tamanho_obj->>'estoque')::int, 0);
        if estoque_disponivel < quantidade_pedida then
          raise exception 'Estoque insuficiente para "%" (tamanho %): restam % unidade(s).',
            produto_row.nome, item->>'tamanho', estoque_disponivel;
        end if;
        tamanho_obj := jsonb_set(tamanho_obj, '{estoque}', to_jsonb(estoque_disponivel - quantidade_pedida));
        encontrado := true;
      end if;
      tamanhos_atualizados := tamanhos_atualizados || jsonb_build_array(tamanho_obj);
    end loop;

    if not encontrado then
      raise exception 'Tamanho "%" indisponível para "%".', item->>'tamanho', produto_row.nome;
    end if;

    update public.products
      set tamanhos = tamanhos_atualizados
      where id = produto_row.id;

    subtotal_calc := subtotal_calc + ((item->>'preco_unitario')::numeric * quantidade_pedida);
  end loop;

  insert into public.pedidos (cliente, telefone, itens, subtotal, total, forma_entrega, endereco, forma_pagamento, status)
  values (
    payload->>'cliente',
    payload->>'telefone',
    payload->'itens',
    subtotal_calc,
    coalesce((payload->>'total')::numeric, subtotal_calc),
    coalesce(payload->>'forma_entrega', 'entrega'),
    payload->>'endereco',
    coalesce(payload->>'forma_pagamento', 'pix'),
    'pendente'
  )
  returning id into novo_id;

  return novo_id;
end;
$$;

grant execute on function public.criar_pedido(jsonb) to anon, authenticated;

-- =========================================================
-- DADOS DE EXEMPLO (opcional — remova este bloco se não quiser seed data)
-- =========================================================
insert into public.products (nome, descricao, preco, imagem_url, galeria, categoria, genero, cores, tamanhos, destaque, ativo)
values
(
  'Zenith Runner',
  'Projetado para velocidade máxima e sem concessões. Placa de microfibra de carbono proprietária e núcleo de espuma hiper-responsivo para impulsionar você para frente com eficiência agressiva.',
  499.90,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCS1DtDhl7qNIGREYechkSCiwoBwQCDpOtVGG79kABvItzRb5SOuIIK5lpCFKuPiH3GcjrtKbJYW0yRhvFItawnvf82DQV31ARWnC_ObgEQiDhurTKFej6SUzQJkYT9INim6ip-0pVcESxHzDxoMm2z0l4tZ-d_lDg4E0J0ygHBx78se5VzuO3NuCvTwPc6I-lxKGDoj95LRioSF72lLRuGYz-t4SeV6sZvsccu6d_3vlE19Pp-zHKUMw',
  '{}',
  'tenis',
  'unissex',
  '[{"nome":"Preto Stealth / Volt","hex":"#121212"},{"nome":"Volt Total","hex":"#CCFF00"},{"nome":"Crimson","hex":"#ffb4ab"}]',
  '[{"tamanho":"38","estoque":8},{"tamanho":"39","estoque":10},{"tamanho":"40","estoque":15},{"tamanho":"41","estoque":6},{"tamanho":"42","estoque":4},{"tamanho":"43","estoque":0}]',
  true,
  true
),
(
  'Pulse Pro Watch',
  'Smartwatch de fitness com biometria avançada, bezel de titânio e pulseira de silicone perfurada.',
  899.00,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBHrNqp63rTGjmLAlrsD8OHRea36xaLp4RlfKB3qhMETpm0F0bQTTcN3Ls_gdAQBODShvXTVvXbSts67qXYaspH1WbFI_eabtS5gAOzNzPg35vlaYHrapE4YtzPFLJXPF1W_DED3pj6tj8nFN-f7lr-BSvXdsuDOX_EIiXhnoEM27_n3lu2NrxUxXe8hQDi7VymlYVDc5kUeZ01e6YIYWV3CCUdAlpvOdRu3M2FpCkZtQnpRjZhDEqN7Q',
  '{}',
  'acessorios',
  'unissex',
  '[{"nome":"Preto","hex":"#121212"}]',
  '[{"tamanho":"Único","estoque":25}]',
  false,
  true
),
(
  'Camiseta AeroFit',
  'Camiseta de compressão térmica em tecido técnico com acabamento em costuras refletivas.',
  159.90,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCp2OWdjyRFvmNSG2J9A8pesc3Qy7-tITgrPb1treTtpc1LzW8kXrhMCHTDzBLcJaiuoZ2mcrIuUAI_-GpEWl8t73gABDhFTI9h_YYMnvw32BMyciTqWs-u3-T0pMr4fjrbOidrpLUr7Ii0KFsXzbVToa2qTwb4ux7EnOCxydS3BeJ97vWDq9jxJhbNFYqVlxEuSQTlNEW07Ctmcn3dHNQeJJvzoAZtzaVjva5k60AIFKo8U74YrynPUA',
  '{}',
  'roupas',
  'homem',
  '[{"nome":"Preto","hex":"#121212"},{"nome":"Cinza Chumbo","hex":"#353535"}]',
  '[{"tamanho":"P","estoque":12},{"tamanho":"M","estoque":20},{"tamanho":"G","estoque":14},{"tamanho":"GG","estoque":3}]',
  false,
  true
),
(
  'Garrafa Térmica Core',
  'Garrafa em aço inoxidável fosco com isolamento a vácuo por 24h.',
  129.90,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBfTWcmea8gYFJu1otbxB0CYbHRKjg58cVoOvZIbYDXhMJoBjyc3P7cWDiSqoEU3oqzD4xseE29KPuo5YW7QQKf4dhHSLEBQeNv768FA7T6f2dkGSpBUTgncup6yfwt7FTIIDOLIx9MZmbZagNQN2OdMppn08d9s4jQkHDy4vii4YCjKMWRVdkrH4clFkUsk8uWy-J6ggKoFAyIRD2ZoufVBzX9ptEQ1qSL8P9hnKmj_ARmLepp72anWw',
  '{}',
  'acessorios',
  'unissex',
  '[{"nome":"Preto Fosco","hex":"#121212"}]',
  '[{"tamanho":"Único","estoque":40}]',
  false,
  true
),
(
  'Legging Performance',
  'Legging de alta compressão com tecnologia de secagem rápida, ideal para treinos intensos.',
  189.90,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC0WkCL4TNcGgl6WZquClXH97GkNQYgC1YC60vY70HFDlcG5jfOjs7VQ1T3TGK8oQA6SHJKwW2Q0nv2QtH4qjwuyjvzGN_2mbPvumGpd2yOcO8IU8yQLniuw2FZt_5In7cT4GVvVuhi2NkmDfiA6215KZ_xzbK1e5V5Vrcpm15wX0Cq0Q-C2H84HiUz-P1XrkPW_4toWq6aeEH7SNpmWnMOjNl9vcrI0E_XQwfLu0gtPLX-TSsGJk73Fg',
  '{}',
  'roupas',
  'mulher',
  '[{"nome":"Preto","hex":"#121212"},{"nome":"Volt","hex":"#CCFF00"}]',
  '[{"tamanho":"P","estoque":9},{"tamanho":"M","estoque":11},{"tamanho":"G","estoque":2}]',
  false,
  true
)
on conflict do nothing;
