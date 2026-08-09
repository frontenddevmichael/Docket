-- Storage buckets for Docket
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to screenshots bucket
create policy "Authenticated users can upload screenshots"
on storage.objects for insert
with check (
  bucket_id = 'screenshots'
  and auth.role() = 'authenticated'
);

create policy "Authenticated users can read screenshots"
on storage.objects for select
using (
  bucket_id = 'screenshots'
  and auth.role() = 'authenticated'
);

-- Allow authenticated users to upload to evidence bucket
create policy "Authenticated users can upload evidence"
on storage.objects for insert
with check (
  bucket_id = 'evidence'
  and auth.role() = 'authenticated'
);

create policy "Authenticated users can read evidence"
on storage.objects for select
using (
  bucket_id = 'evidence'
  and auth.role() = 'authenticated'
);
