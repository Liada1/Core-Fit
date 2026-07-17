-- CORE FIT — Notificação automática no Telegram quando chega um pedido novo
-- Rode este arquivo no Supabase Dashboard > SQL Editor > New query > Run
-- (depois de já ter rodado schema.sql, migration_pagbank_pix.sql e migration_2_estoque_pix.sql)

create extension if not exists pg_net;

-- Dispara a Edge Function notificar-novo-pedido sempre que um pedido é inserido.
-- Se você trocar de projeto Supabase, atualize a URL abaixo (troque só o subdomínio).
create or replace function public.notificar_novo_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://pdrqampxjbrojdfgnjqk.supabase.co/functions/v1/notificar-novo-pedido',
    body := jsonb_build_object('pedido_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

drop trigger if exists trigger_notificar_novo_pedido on public.pedidos;
create trigger trigger_notificar_novo_pedido
  after insert on public.pedidos
  for each row
  execute function public.notificar_novo_pedido();
