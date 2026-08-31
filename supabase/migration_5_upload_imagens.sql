-- CORE FIT — Upload de imagens de produto (Supabase Storage)
-- Rode este arquivo no Supabase Dashboard > SQL Editor > New query > Run
--
-- O QUE FAZ
--   Cria o bucket público "produtos" e as permissões para que:
--     - qualquer visitante possa VER as imagens (loja);
--     - só o admin logado possa ENVIAR / trocar / apagar imagens.
--   Depois disso, o formulário de produto no painel passa a ter o botão
--   "Enviar foto do dispositivo" (não precisa mais colar link).

-- Bucket público, limite de 10 MB por arquivo, só imagens.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produtos',
  'produtos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública das imagens do bucket.
drop policy if exists "storage_produtos_leitura_publica" on storage.objects;
create policy "storage_produtos_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'produtos');

-- Envio / edição / remoção apenas para administradores autenticados.
drop policy if exists "storage_produtos_admin_insert" on storage.objects;
create policy "storage_produtos_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'produtos');

drop policy if exists "storage_produtos_admin_update" on storage.objects;
create policy "storage_produtos_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'produtos')
  with check (bucket_id = 'produtos');

drop policy if exists "storage_produtos_admin_delete" on storage.objects;
create policy "storage_produtos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'produtos');
