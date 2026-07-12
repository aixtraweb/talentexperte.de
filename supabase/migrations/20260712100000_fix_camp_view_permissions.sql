-- camp_verfuegbarkeit_public zählt freie Plätze über anmeldungen/firmen_anmeldungen.
-- Seit der RLS-Härtung (20260710090000) darf anon diese Basistabellen nicht mehr
-- lesen; die View lief aber mit security_invoker=true und schlug deshalb in der
-- öffentlichen Camp-Auswahl fehl ("permission denied for table anmeldungen").
-- Die View gibt ausschließlich Camp-Metadaten und aggregierte Zahlen aus
-- (keine personenbezogenen Daten) und läuft deshalb bewusst mit Besitzerrechten.
alter view public.camp_verfuegbarkeit_public set (security_invoker = false);
