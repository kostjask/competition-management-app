BEGIN;
-- Legacy TIMESTAMP(3) values have no zone. The canonical API writes UTC midnight
-- and reads the UTC calendar day. Refuse ambiguous legacy times before any DDL;
-- never guess a local zone or silently truncate a time-bearing value.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Dancer" WHERE "birthDate" <> date_trunc('day', "birthDate")
    OR "birthDate" < TIMESTAMP '0001-01-01' OR "birthDate" >= TIMESTAMP '10000-01-01') THEN
    RAISE EXCEPTION 'Birth-date migration requires reviewed repair of unsupported or non-midnight legacy values';
  END IF;
END $$;
ALTER TABLE "Dancer" ALTER COLUMN "birthDate" TYPE DATE USING "birthDate"::date;
-- SQL-only guards
ALTER TABLE "Dancer" ADD CONSTRAINT "Dancer_birth_date_range" CHECK ("birthDate" >= DATE '0001-01-01' AND "birthDate" <= DATE '9999-12-31');
COMMIT;
