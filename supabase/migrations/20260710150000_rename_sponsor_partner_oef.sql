-- Korrekter Vereinsname laut Kooperationspartner: "Öcher Fans for Kenger e.V." (Kürzel ÖF).
-- Idempotent: greift auch, wenn der Seed aus 20260710090000 bereits mit dem alten
-- Namen "Öcher Kenger e.V." angewendet wurde.
update public.sponsoring_partners
set name = 'Öcher Fans for Kenger e.V.',
    updated_at = now()
where slug = 'oecher-kenger'
  and name <> 'Öcher Fans for Kenger e.V.';
