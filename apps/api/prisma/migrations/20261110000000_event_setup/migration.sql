BEGIN;
ALTER TABLE "Event"
  ADD COLUMN "descriptionSourceLocale" TEXT,
  ADD COLUMN "descriptionTranslations" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "organizerEmail" TEXT,
  ADD COLUMN "organizerPhone" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "creationOperationId" TEXT,
  ADD COLUMN "creationDigest" TEXT;
CREATE UNIQUE INDEX "Event_creationOperationId_key" ON "Event"("creationOperationId");
-- Existing description text stays verbatim with no inferred source language.
-- SQL-only guards
ALTER TABLE "Event" ADD CONSTRAINT "Event_revision_positive" CHECK ("revision" > 0);
ALTER TABLE "Event" ADD CONSTRAINT "Event_creation_retry_pair" CHECK (("creationOperationId" IS NULL) = ("creationDigest" IS NULL));
ALTER TABLE "Event" ADD CONSTRAINT "Event_description_language" CHECK (
  "descriptionSourceLocale" IS NULL OR
  ("descriptionSourceLocale" IN ('et','en','ru') AND description IS NOT NULL AND length(btrim(description)) BETWEEN 1 AND 20000)
);
ALTER TABLE "Event" ADD CONSTRAINT "Event_description_translations" CHECK (
  jsonb_typeof("descriptionTranslations") = 'object' AND
  ("descriptionTranslations" - 'et' - 'en' - 'ru') = '{}'::jsonb AND
  ("descriptionSourceLocale" IS NOT NULL OR "descriptionTranslations" = '{}'::jsonb) AND
  NOT ("descriptionTranslations" ? coalesce("descriptionSourceLocale", '')) AND
  (NOT ("descriptionTranslations" ? 'et') OR (jsonb_typeof("descriptionTranslations"->'et') = 'string' AND length(btrim("descriptionTranslations"->>'et')) BETWEEN 1 AND 20000)) AND
  (NOT ("descriptionTranslations" ? 'en') OR (jsonb_typeof("descriptionTranslations"->'en') = 'string' AND length(btrim("descriptionTranslations"->>'en')) BETWEEN 1 AND 20000)) AND
  (NOT ("descriptionTranslations" ? 'ru') OR (jsonb_typeof("descriptionTranslations"->'ru') = 'string' AND length(btrim("descriptionTranslations"->>'ru')) BETWEEN 1 AND 20000))
);
COMMIT;
