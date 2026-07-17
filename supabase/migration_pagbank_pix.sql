-- CORE FIT — Pix via PagBank
-- Rode este arquivo no Supabase Dashboard > SQL Editor > New query > Run
-- (depois de já ter rodado schema.sql)

alter table public.pedidos
  add column if not exists status_pagamento text not null default 'pendente'
    check (status_pagamento in ('pendente', 'pago', 'falhou')),
  add column if not exists pagbank_order_id text,
  add column if not exists pix_qr_text text,
  add column if not exists pix_qr_image_url text,
  add column if not exists pix_expira_em timestamptz;

create index if not exists pedidos_pagbank_order_id_idx on public.pedidos (pagbank_order_id);

-- Permite que o cliente (anon) consulte só o status de pagamento do próprio pedido,
-- sem expor o restante da tabela `pedidos` (que continua legível só pelo admin autenticado).
create or replace function public.consultar_status_pagamento(p_pedido_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select status_pagamento from public.pedidos where id = p_pedido_id;
$$;

grant execute on function public.consultar_status_pagamento(uuid) to anon, authenticated;
