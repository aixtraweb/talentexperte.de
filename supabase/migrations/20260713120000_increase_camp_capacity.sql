alter table public.camps
  alter column max_plaetze set default 60;

update public.camps
set max_plaetze = 60
where status in ('aktiv', 'ausgebucht')
  and max_plaetze is distinct from 60;
