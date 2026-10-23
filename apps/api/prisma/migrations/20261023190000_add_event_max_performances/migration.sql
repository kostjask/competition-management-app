-- Nullable with no default: preserve existing events and their unlimited setting.
ALTER TABLE "Event" ADD COLUMN "maxPerformances" INTEGER;
