-- =============================================================================
-- Supabase Storage: bucket PRIVADO para os PDFs gerados.
-- Execute depois de supabase/schema.sql (somente em projetos Supabase).
--
-- public = false  -> nenhum arquivo é servido por URL pública.
-- Nenhuma política em storage.objects é criada: apenas o service role (no
-- servidor) faz upload e gera URLs assinadas de curta duração.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('books', 'books', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
