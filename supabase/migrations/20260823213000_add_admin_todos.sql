-- Private, persistent task list for dashboard administrators.

create table if not exists public.admin_todos (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid references public.camps(id) on delete set null,
  registration_id uuid references public.anmeldungen(id) on delete set null,
  title text not null,
  details text,
  priority text not null default 'normal'
    check (priority in ('urgent', 'high', 'normal')),
  status text not null default 'open'
    check (status in ('open', 'done')),
  due_on date,
  sort_order integer not null default 0,
  created_by uuid default auth.uid(),
  completed_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_todos_title_length
    check (char_length(btrim(title)) between 1 and 180),
  constraint admin_todos_details_length
    check (details is null or char_length(details) <= 2000)
);

create index if not exists admin_todos_open_due_idx
  on public.admin_todos (status, due_on, priority, sort_order, created_at);
create index if not exists admin_todos_camp_idx
  on public.admin_todos (camp_id, status);
create index if not exists admin_todos_registration_idx
  on public.admin_todos (registration_id)
  where registration_id is not null;

create or replace function public.prepare_admin_todo()
returns trigger
language plpgsql
set search_path = pg_catalog, public, auth
as $$
begin
  new.title := btrim(new.title);
  new.details := nullif(btrim(coalesce(new.details, '')), '');
  new.updated_at := now();

  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;

  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at := coalesce(new.completed_at, now());
      new.completed_by := coalesce(new.completed_by, auth.uid());
    end if;
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_admin_todo_trigger on public.admin_todos;
create trigger prepare_admin_todo_trigger
  before insert or update on public.admin_todos
  for each row execute function public.prepare_admin_todo();

alter table public.admin_todos enable row level security;
revoke all on table public.admin_todos from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_todos to authenticated;
grant all on table public.admin_todos to service_role;

drop policy if exists dashboard_admin_todos_guard on public.admin_todos;
create policy dashboard_admin_todos_guard on public.admin_todos
  for all to authenticated
  using (public.is_dashboard_admin())
  with check (public.is_dashboard_admin());

drop trigger if exists audit_admin_todos_changes on public.admin_todos;
create trigger audit_admin_todos_changes
  after insert or update or delete on public.admin_todos
  for each row execute function public.audit_sensitive_change();

comment on table public.admin_todos is
  'Private, admin-only operational task list for camps and registrations.';
comment on column public.admin_todos.registration_id is
  'Optional link to an existing parent or sponsor registration; company and general tasks stay unlinked.';
