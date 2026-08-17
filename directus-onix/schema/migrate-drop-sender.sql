-- Se ejecuta ANTES de `directus schema apply` que elimina las columnas.
--
-- El modelo deja de registrar quién envió el registro: guarda su versión actual.
-- `identity_key` ya no es «remitente + RecordReference», así que se normaliza al
-- RecordReference mientras la información de origen todavía existe.

BEGIN;

UPDATE books
SET identity_key = record_reference,
    date_updated = CURRENT_TIMESTAMP
WHERE identity_key IS DISTINCT FROM record_reference;

COMMIT;
