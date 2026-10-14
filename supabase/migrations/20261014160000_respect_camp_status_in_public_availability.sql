-- A cancelled camp must not be advertised as bookable just because seats remain.
-- CREATE OR REPLACE preserves the existing columns, grants and public-read boundary.
create or replace view public.camp_verfuegbarkeit_public
with (security_invoker = false) as
select c.id, c.name, c.saison, c.ort, c.adresse,
       c.datum_von, c.datum_bis, c.uhrzeit_von, c.uhrzeit_bis,
       c.status, c.beschreibung, c.max_plaetze,
       greatest(c.max_plaetze - (
         coalesce((select count(*) from public.anmeldungen a
                   where a.camp_id = c.id and a.storniert_am is null), 0::bigint)
         + coalesce((select count(*) from public.firmen_anmeldungen fa
                     where fa.camp_id = c.id and fa.storniert_am is null), 0::bigint)
       ), 0::bigint) as freie_plaetze,
       case when c.fruehbucher_bis is not null and c.fruehbucher_preis is not null
                 and current_date <= c.fruehbucher_bis
            then c.fruehbucher_preis else c.preis_euro end as aktueller_preis,
       c.status = 'aktiv' and greatest(c.max_plaetze - (
         coalesce((select count(*) from public.anmeldungen a
                   where a.camp_id = c.id and a.storniert_am is null), 0::bigint)
         + coalesce((select count(*) from public.firmen_anmeldungen fa
                     where fa.camp_id = c.id and fa.storniert_am is null), 0::bigint)
       ), 0::bigint) > 0 as buchbar
from public.camps c;
