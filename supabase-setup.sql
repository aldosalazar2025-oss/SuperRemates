-- Pega TODO esto en Supabase > SQL Editor y pulsa Run (una sola vez).
-- ANTES: reemplaza TU_CORREO por el correo de tu usuario admin, en minúsculas (aparece 4 veces).

do $$
declare t text;
begin
  foreach t in array array['products','categories','settings'] loop
    execute format('create table if not exists %I (id text primary key, data jsonb not null)', t);
    execute format('alter table %I enable row level security', t);
    execute format('create policy "lectura publica" on %I for select using (true)', t);
    execute format($p$create policy "solo admin escribe" on %I for all to authenticated
      using ((auth.jwt()->>'email') = 'TU_CORREO')
      with check ((auth.jwt()->>'email') = 'TU_CORREO')$p$, t);
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
end $$;

-- Fotos: bucket público para ver, solo el admin puede subir o borrar
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "fotos solo admin" on storage.objects for all to authenticated
  using (bucket_id = 'productos' and (auth.jwt()->>'email') = 'TU_CORREO')
  with check (bucket_id = 'productos' and (auth.jwt()->>'email') = 'TU_CORREO');
