-- CORE FIT — Estoque por combinação de cor + tamanho
-- Rode este arquivo no Supabase Dashboard > SQL Editor > New query > Run
-- (depois de schema.sql, migration_pagbank_pix.sql e migration_2_estoque_pix.sql)
--
-- O QUE MUDA
--   Antes:  products.tamanhos = [{ "tamanho": "M", "estoque": 10 }, ...]        (estoque só por tamanho)
--   Agora:  products.tamanhos = [{ "tamanho": "M", "cor": "Preto", "estoque": 10 }, ...]  (estoque por cor + tamanho)
--
--   Quando QUALQUER linha do produto tiver "cor" preenchida, o produto passa a ser controlado
--   por cor: a baixa e a devolução de estoque casam tamanho E cor. Produtos que não tiverem
--   "cor" em nenhuma linha continuam funcionando exatamente como antes (baixa só por tamanho).
--
--   Nenhum dado precisa ser migrado: os produtos atuais seguem válidos como estão.

-- =========================================================
-- criar_pedido — agora casa cor + tamanho quando o produto usa estoque por cor
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
  usa_cor boolean;
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

    -- O produto controla estoque por cor se ao menos uma linha de `tamanhos` tem "cor".
    select exists (
      select 1 from jsonb_array_elements(produto_row.tamanhos) t
      where coalesce(t->>'cor', '') <> ''
    ) into usa_cor;

    for tamanho_obj in select * from jsonb_array_elements(produto_row.tamanhos)
    loop
      if not encontrado
         and tamanho_obj->>'tamanho' = item->>'tamanho'
         and (not usa_cor or coalesce(tamanho_obj->>'cor', '') = coalesce(item->>'cor', '')) then
        estoque_disponivel := coalesce((tamanho_obj->>'estoque')::int, 0);
        if estoque_disponivel < quantidade_pedida then
          raise exception 'Estoque insuficiente para "%"%: restam % unidade(s).',
            produto_row.nome,
            case when usa_cor
              then format(' (tamanho %s, cor %s)', item->>'tamanho', coalesce(nullif(item->>'cor', ''), '—'))
              else format(' (tamanho %s)', item->>'tamanho') end,
            estoque_disponivel;
        end if;
        tamanho_obj := jsonb_set(tamanho_obj, '{estoque}', to_jsonb(estoque_disponivel - quantidade_pedida));
        encontrado := true;
      end if;
      tamanhos_atualizados := tamanhos_atualizados || jsonb_build_array(tamanho_obj);
    end loop;

    if not encontrado then
      raise exception 'Variação indisponível para "%": tamanho "%"%.',
        produto_row.nome,
        item->>'tamanho',
        case when usa_cor then format(', cor "%s"', coalesce(nullif(item->>'cor', ''), '—')) else '' end;
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
-- liberar_estoque_pedido — devolve para a combinação cor + tamanho correta
-- (idempotente: continua agindo só uma vez por pedido, via flag estoque_liberado)
-- =========================================================
create or replace function public.liberar_estoque_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pedido_row public.pedidos%rowtype;
  item jsonb;
  produto_row public.products%rowtype;
  tamanhos_atualizados jsonb;
  tamanho_obj jsonb;
  usa_cor boolean;
  devolvido boolean;
begin
  select * into pedido_row from public.pedidos where id = p_pedido_id for update;
  if not found or pedido_row.estoque_liberado then
    return;
  end if;

  for item in select * from jsonb_array_elements(pedido_row.itens)
  loop
    select * into produto_row from public.products where id = (item->>'produto_id')::uuid for update;
    if found then
      tamanhos_atualizados := '[]'::jsonb;
      devolvido := false;

      select exists (
        select 1 from jsonb_array_elements(produto_row.tamanhos) t
        where coalesce(t->>'cor', '') <> ''
      ) into usa_cor;

      for tamanho_obj in select * from jsonb_array_elements(produto_row.tamanhos)
      loop
        if not devolvido
           and tamanho_obj->>'tamanho' = item->>'tamanho'
           and (not usa_cor or coalesce(tamanho_obj->>'cor', '') = coalesce(item->>'cor', '')) then
          tamanho_obj := jsonb_set(
            tamanho_obj,
            '{estoque}',
            to_jsonb(coalesce((tamanho_obj->>'estoque')::int, 0) + coalesce((item->>'quantidade')::int, 0))
          );
          devolvido := true;
        end if;
        tamanhos_atualizados := tamanhos_atualizados || jsonb_build_array(tamanho_obj);
      end loop;

      update public.products set tamanhos = tamanhos_atualizados where id = produto_row.id;
    end if;
  end loop;

  update public.pedidos set estoque_liberado = true where id = p_pedido_id;
end;
$$;

grant execute on function public.liberar_estoque_pedido(uuid) to service_role;
