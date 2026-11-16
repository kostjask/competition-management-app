BEGIN;
-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Festival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestivalEdition" (
    "id" TEXT NOT NULL,
    "festivalId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "eventId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "everPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FestivalEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDocument" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "editionId" TEXT,
    "draftRevisionId" TEXT,
    "publishedRevisionId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "policyDigest" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentRevisionAsset" (
    "revisionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,

    CONSTRAINT "ContentRevisionAsset_pkey" PRIMARY KEY ("revisionId","assetId","fieldPath")
);

-- CreateTable
CREATE TABLE "PublicAsset" (
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "rights" TEXT NOT NULL DEFAULT 'PENDING',
    "retiredAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentOperation" (
    "operationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "revisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentOperation_pkey" PRIMARY KEY ("operationId")
);

-- CreateTable
CREATE TABLE "ContentAssetCleanup" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "leaseUntil" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "failureCode" TEXT,

    CONSTRAINT "ContentAssetCleanup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Festival_slug_key" ON "Festival"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalEdition_eventId_key" ON "FestivalEdition"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "FestivalEdition_festivalId_slug_key" ON "FestivalEdition"("festivalId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentDocument_editionId_key" ON "ContentDocument"("editionId");

-- CreateIndex
CREATE INDEX "ContentRevision_actorId_idx" ON "ContentRevision"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_id_documentId_key" ON "ContentRevision"("id", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRevision_documentId_number_key" ON "ContentRevision"("documentId", "number");

-- CreateIndex
CREATE INDEX "ContentRevisionAsset_assetId_idx" ON "ContentRevisionAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicAsset_key_key" ON "PublicAsset"("key");

-- CreateIndex
CREATE INDEX "PublicAsset_documentId_idx" ON "PublicAsset"("documentId");

-- CreateIndex
CREATE INDEX "PublicAsset_actorId_idx" ON "PublicAsset"("actorId");

-- CreateIndex
CREATE INDEX "ContentOperation_documentId_createdAt_idx" ON "ContentOperation"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentOperation_actorId_idx" ON "ContentOperation"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentAssetCleanup_assetId_key" ON "ContentAssetCleanup"("assetId");

-- CreateIndex
CREATE INDEX "ContentAssetCleanup_completedAt_dueAt_idx" ON "ContentAssetCleanup"("completedAt", "dueAt");

-- AddForeignKey
ALTER TABLE "FestivalEdition" ADD CONSTRAINT "FestivalEdition_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FestivalEdition" ADD CONSTRAINT "FestivalEdition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "FestivalEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_draftRevisionId_id_fkey" FOREIGN KEY ("draftRevisionId", "id") REFERENCES "ContentRevision"("id", "documentId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_publishedRevisionId_id_fkey" FOREIGN KEY ("publishedRevisionId", "id") REFERENCES "ContentRevision"("id", "documentId") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevisionAsset" ADD CONSTRAINT "ContentRevisionAsset_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ContentRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRevisionAsset" ADD CONSTRAINT "ContentRevisionAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PublicAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicAsset" ADD CONSTRAINT "PublicAsset_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicAsset" ADD CONSTRAINT "PublicAsset_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentOperation" ADD CONSTRAINT "ContentOperation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentOperation" ADD CONSTRAINT "ContentOperation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAssetCleanup" ADD CONSTRAINT "ContentAssetCleanup_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PublicAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL-only guards
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_kind" CHECK ((kind IN ('STUDIO_SITE','FESTIVAL_PORTAL') AND "editionId" IS NULL) OR (kind = 'FESTIVAL_EDITION' AND "editionId" IS NOT NULL));
ALTER TABLE "ContentDocument" ADD CONSTRAINT "ContentDocument_version" CHECK (version BETWEEN 1 AND 2147483646);
CREATE UNIQUE INDEX "ContentDocument_singleton" ON "ContentDocument"(kind) WHERE kind IN ('STUDIO_SITE','FESTIVAL_PORTAL');
ALTER TABLE "ContentRevision" ADD CONSTRAINT "ContentRevision_number" CHECK (number BETWEEN 1 AND 2147483646 AND "schemaVersion" = 1 AND jsonb_typeof(payload) = 'object');
ALTER TABLE "PublicAsset" ADD CONSTRAINT "PublicAsset_state" CHECK (rights IN ('PENDING','APPROVED','REVOKED') AND size > 0 AND width > 0 AND height > 0 AND width * height <= 16000000);
ALTER TABLE "ContentOperation" ADD CONSTRAINT "ContentOperation_version" CHECK (version BETWEEN 1 AND 2147483646);
CREATE FUNCTION prevent_content_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Content history is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER "ContentRevision_immutable" BEFORE UPDATE OR DELETE ON "ContentRevision" FOR EACH ROW EXECUTE FUNCTION prevent_content_history_change();
CREATE TRIGGER "ContentRevisionAsset_immutable" BEFORE UPDATE OR DELETE ON "ContentRevisionAsset" FOR EACH ROW EXECUTE FUNCTION prevent_content_history_change();
CREATE TRIGGER "ContentOperation_immutable" BEFORE UPDATE OR DELETE ON "ContentOperation" FOR EACH ROW EXECUTE FUNCTION prevent_content_history_change();
-- Extend only constraints on the current schema's actual AuditLog table.
DO $$ DECLARE definition text; BEGIN
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_action';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_action"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_action" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR action IN (''CONTENT_SAVED'',''CONTENT_PUBLISHED'',''CONTENT_UNPUBLISHED'',''CONTENT_CREATED'',''CONTENT_LINKED'',''CONTENT_ASSET_UPLOADED'',''CONTENT_ASSET_REVIEWED'',''CONTENT_ASSET_RETIRED'',''CONTENT_ARCHIVED''))';
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_target_type';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_target_type"';
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_target_type" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR "targetType" = ''CONTENT_DOCUMENT'')';
  SELECT pg_get_constraintdef(oid) INTO definition FROM pg_constraint WHERE conrelid = '"AuditLog"'::regclass AND conname = 'AuditLog_safe_metadata';
  EXECUTE 'ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_safe_metadata"';
  -- Old validation still owns all existing keys. CMS metadata permits IDs only.
  EXECUTE 'ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_safe_metadata" CHECK ((' || substr(definition,8,length(definition)-8) || ') OR ("targetType" = ''CONTENT_DOCUMENT'' AND jsonb_typeof(metadata) = ''object'' AND metadata - ARRAY[''revision'',''operationId'',''documentId'',''revisionId'',''assetId''] = ''{}''::jsonb AND (metadata->>''revision'') ~ ''^[1-9][0-9]{0,9}$'' AND (metadata->>''operationId'') ~ ''^[0-9a-f-]{36}$'' AND (metadata->>''documentId'') ~ ''^[0-9a-f-]{36}$'' AND (metadata->''revisionId'' = ''null''::jsonb OR (metadata->>''revisionId'') ~ ''^[0-9a-f-]{36}$'') AND (NOT metadata ? ''assetId'' OR (metadata->>''assetId'') ~ ''^[0-9a-f-]{36}$'')))';
END $$;
COMMIT;
