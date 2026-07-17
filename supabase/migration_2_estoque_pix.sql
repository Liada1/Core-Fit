-- CORE FIT — Liberação automática de estoque para pedidos Pix não pagos
-- Rode este arquivo no Supabase Dashboard > SQL Editor > New query > Run
-- (depois de já ter rodado schema.sql e migration_pagbank_pix.sql)

alter table public.pedidos
  add column if not exists estoque_liberado boolean not null default false;

-- Devolve ao estoque os itens de um pedido específico. Idempotente: só age uma vez por pedido,
-- graças à flag estoque_liberado — pode ser chamada de novo sem duplicar a devolução.
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
      for tamanho_obj in select * from jsonb_array_elements(produto_row.tamanhos)
      loop
        if tamanho_obj->>'tamanho' = item->>'tamanho' then
          tamanho_obj := jsonb_set(
            tamanho_obj,
            '{estoque}',
            to_jsonb(coalesce((tamanho_obj->>'estoque')::int, 0) + coalesce((item->>'quantidade')::int, 0))
          );
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

-- Varre pedidos Pix "pendente" cujo QR já expirou, marca como "falhou"/"cancelado" e devolve
-- o estoque reservado. Sem isso, um cliente que nunca paga prende o estoque pra sempre, já que
-- criar_pedido() decrementa na hora do pedido, não na hora do pagamento.
create or replace function public.liberar_estoque_pix_expirado()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pedido_row public.pedidos%rowtype;
begin
  for pedido_row in
    select * from public.pedidos
    where forma_pagamento = 'pix'
      and status_pagamento = 'pendente'
      and estoque_liberado = false
      and pix_expira_em is not null
      and pix_expira_em < now()
  loop
    perform public.liberar_estoque_pedido(pedido_row.id);
    update public.pedidos set status_pagamento = 'falhou', status = 'cancelado' where id = pedido_row.id;
  end loop;
end;
$$;

-- Roda a varredura a cada 10 minutos. Rodar este SELECT de novo (nome de job repetido) atualiza
-- o agendamento existente em vez de duplicar.
create extension if not exists pg_cron;

select cron.schedule(
  'liberar-estoque-pix-expirado',
  '*/10 * * * *',
  $$select public.liberar_estoque_pix_expirado();$$
);
