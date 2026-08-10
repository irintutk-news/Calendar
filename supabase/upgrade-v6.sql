create table if not exists public.day_notes(
  id uuid primary key default gen_random_uuid(),
  board_id text not null,
  note_date date not null,
  note text not null default '',
  show_note boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(board_id,note_date)
);

alter table public.day_notes enable row level security;
grant select,insert,update,delete on public.day_notes to anon;
drop policy if exists "link all day notes" on public.day_notes;
create policy "link all day notes" on public.day_notes for all to anon using(true) with check(true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='day_notes'
  ) then
    execute 'alter publication supabase_realtime add table public.day_notes';
  end if;
end $$;
