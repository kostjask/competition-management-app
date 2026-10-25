DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM "User" WHERE id = 'user' AND "sessionVersion" = 0) THEN
        RAISE EXCEPTION 'Existing user session revision default was not preserved';
    END IF;
    BEGIN
        UPDATE "User" SET "sessionVersion" = -1 WHERE id = 'user';
        RAISE EXCEPTION 'Negative session revision was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    IF (SELECT count(*) FROM "StudioEventRegistration" WHERE status::text = CASE WHEN id = 'registration' THEN 'LOCKED' ELSE id END) <> 4 THEN
        RAISE EXCEPTION 'Existing registration status was changed';
    END IF;
    IF NOT EXISTS (SELECT FROM "StudioEventRegistration" WHERE id = 'registration' AND "canEditDuringReview" AND "updatedAt" = '2026-01-01') THEN
        RAISE EXCEPTION 'Registration metadata was changed';
    END IF;
    IF NOT EXISTS (SELECT FROM "Studio" WHERE id = 'studio' AND "approvalStatus" = 'PENDING' AND "deletedBy" IS NULL)
       OR NOT EXISTS (SELECT FROM "User" WHERE id = 'user' AND "deactivatedBy" IS NULL)
       OR NOT EXISTS (SELECT FROM "StudioRepresentative" WHERE id = 'rep' AND active AND "deactivatedBy" IS NULL)
       OR NOT EXISTS (SELECT FROM "Dancer" WHERE id = 'dancer' AND "deletedBy" IS NULL)
       OR NOT EXISTS (SELECT FROM "Performance" WHERE id = 'performance' AND "deletedAt" IS NULL AND "deletedBy" IS NULL)
       OR NOT EXISTS (SELECT FROM "PerformanceParticipant" WHERE "performanceId" = 'performance' AND "dancerId" = 'dancer') THEN
        RAISE EXCEPTION 'Existing entities/relations or nullable actor defaults were changed';
    END IF;
    IF EXISTS (SELECT FROM "Event" WHERE "maxPerformances" IS NOT NULL) THEN
        RAISE EXCEPTION 'Existing events must retain unlimited performances';
    END IF;
    UPDATE "Event" SET "maxPerformances" = 50, stage = 'CANCELLED' WHERE id = 'event';
    INSERT INTO "Studio" (id, "eventId", name) VALUES ('default-studio', 'event', 'Default fixture');
    INSERT INTO "StudioEventRegistration" (id, "studioId", "eventId", "updatedAt") VALUES ('default-registration', 'default-studio', 'event', now());
    IF (SELECT status::text FROM "StudioEventRegistration" WHERE id = 'default-registration') <> 'PENDING' THEN
        RAISE EXCEPTION 'PENDING registration default was lost';
    END IF;
    BEGIN
        INSERT INTO "Studio" (id, "eventId", name) VALUES ('duplicate', 'event', 'Fixture studio');
        RAISE EXCEPTION 'Duplicate active studio name was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    UPDATE "Studio" SET "deletedAt" = now(), "deletedBy" = 'user' WHERE id = 'studio';
    INSERT INTO "Studio" (id, "eventId", name) VALUES ('replacement', 'event', 'Fixture studio');
    BEGIN
        UPDATE "Studio" SET "deletedAt" = NULL WHERE id = 'studio';
        RAISE EXCEPTION 'Restoring conflicting studio name was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
END $$;
