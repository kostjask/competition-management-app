param(
    [string]$Database = 'dance_comp',
    [string]$DatabaseUser = 'dance_user'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
$suffix = [Guid]::NewGuid().ToString('N')
$testDatabase = "dance_migrations_$suffix"
$databaseCreated = $false
$expectedSchema = "migration_expected_$suffix"
$freshSchema = "migration_fresh_$suffix"
$upgradeSchema = "migration_upgrade_$suffix"
$expectedSqlPath = Join-Path ([IO.Path]::GetTempPath()) "migration_expected_$suffix.sql"
$previousDatabaseUrl = $env:DATABASE_URL
$pnpmCommand = if ($env:OS -eq 'Windows_NT') { 'pnpm.cmd' } else { 'pnpm' }

function Invoke-TestSql([string]$Sql, [string]$TargetDatabase = $testDatabase) {
    $Sql | docker compose -f docker/docker-compose.yml exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U $DatabaseUser -d $TargetDatabase
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL migration regression check failed.' }
}

try {
    # Diff generation needs a datasource config, but never connects to this URL.
    $env:DATABASE_URL = 'postgresql://unused:unused@localhost:5432/unused'
    & $pnpmCommand exec prisma migrate diff --config apps/api/prisma.config.ts --from-empty --to-schema apps/api/prisma/schema.prisma --script --output $expectedSqlPath
    if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $expectedSqlPath)) {
        throw 'Prisma did not generate the expected schema SQL.'
    }
    $expectedSql = Get-Content -Raw -LiteralPath $expectedSqlPath
    $expectedSql = $expectedSql.Replace('CREATE SCHEMA IF NOT EXISTS "public";', '')
    $studioSql = Get-Content -Raw apps/api/prisma/migrations/20260219175019_studio_approval_status_and_soft_delete_name_rule/migration.sql
    $expectedSql += "`n" + ((($studioSql -split "`n") | Where-Object { $_ -match '^CREATE UNIQUE INDEX' }) -join "`n")
    # Prisma cannot express these partial/null-safe indexes. Compare their exact
    # definitions as well, rather than excluding them from the parity inventory.
    $scopeSql = Get-Content -Raw apps/api/prisma/migrations/20261025000000_scope_integrity/migration.sql
    $expectedSql += "`n" + ((($scopeSql -split "`n") | Where-Object { $_ -match '^CREATE UNIQUE INDEX' }) -join "`n")
    $emailSql = Get-Content -Raw apps/api/prisma/migrations/20261025010000_email_identity/migration.sql
    $expectedSql += "`n" + ((($emailSql -split "`n") | Where-Object { $_ -match '^ALTER TABLE' }) -join "`n")
    $tokenSql = Get-Content -Raw apps/api/prisma/migrations/20261025020000_identity_tokens/migration.sql
    $expectedSql += "`n" + ((($tokenSql -split "`n") | Where-Object { $_ -match '^CREATE UNIQUE INDEX "AccountToken_outstanding_unique"' }) -join "`n")
    $tokenChecksSql = Get-Content -Raw apps/api/prisma/migrations/20261025030000_identity_token_checks/migration.sql
    $expectedSql += "`n" + ((($tokenChecksSql -split "`n") | Where-Object { $_ -match '^ALTER TABLE' }) -join "`n")
    $sessionSql = Get-Content -Raw apps/api/prisma/migrations/20261025040000_account_session_version/migration.sql
    $expectedSql += "`n" + ((($sessionSql -split "`n") | Where-Object { $_ -match '^ALTER TABLE.*ADD CONSTRAINT' }) -join "`n")
    $auditSql = Get-Content -Raw apps/api/prisma/migrations/20261025050000_domain_audit/migration.sql
    $expectedSql += "`n" + (($auditSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $foundationSql = Get-Content -Raw apps/api/prisma/migrations/20261025060000_onboarding_staff_locale/migration.sql
    $expectedSql += "`n" + (($foundationSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $deliverySql = Get-Content -Raw apps/api/prisma/migrations/20261025070000_email_delivery/migration.sql
    $expectedSql += "`n" + (($deliverySql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $imageAuditSql = Get-Content -Raw apps/api/prisma/migrations/20261101000000_image_audit/migration.sql
    $expectedSql += "`n" + (($imageAuditSql -split "`n" | Where-Object { $_ -match '^ALTER TABLE' }) -join "`n")
    $sessionAuditSql = Get-Content -Raw apps/api/prisma/migrations/20261105000000_session_audit/migration.sql
    $expectedSql += "`n" + (($sessionAuditSql -split "`n" | Where-Object { $_ -match '^ALTER TABLE' }) -join "`n")
    $onboardingAuditSql = Get-Content -Raw apps/api/prisma/migrations/20261105010000_onboarding_audit/migration.sql
    $expectedSql += "`n" + (($onboardingAuditSql -split "`n" | Where-Object { $_ -match '^ALTER TABLE' }) -join "`n")
    $registrationSql = Get-Content -Raw apps/api/prisma/migrations/20261109000000_registration_lifecycle/migration.sql
    $expectedSql += "`n" + (($registrationSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $eventSetupSql = Get-Content -Raw apps/api/prisma/migrations/20261110000000_event_setup/migration.sql
    $expectedSql += "`n" + (($eventSetupSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $reviewSql = Get-Content -Raw apps/api/prisma/migrations/20261110010000_application_review/migration.sql
    $expectedSql += "`n" + (($reviewSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $ownershipSql = Get-Content -Raw apps/api/prisma/migrations/20261111000000_performance_ownership/migration.sql
    $expectedSql += "`n" + (($ownershipSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $historySql = Get-Content -Raw apps/api/prisma/migrations/20261111020000_performance_history/migration.sql
    $calendarSql = Get-Content -Raw apps/api/prisma/migrations/20261111010000_calendar_birth_dates/migration.sql
    $expectedSql += "`n" + (($calendarSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $expectedSql += "`n" + (($historySql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $draftSql = Get-Content -Raw apps/api/prisma/migrations/20261111030000_entry_drafts/migration.sql
    $expectedSql += "`n" + (($draftSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $retrySql = Get-Content -Raw apps/api/prisma/migrations/20261113000000_review_delivery_retry/migration.sql
    $expectedSql += "`n" + (($retrySql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $entrySql = Get-Content -Raw apps/api/prisma/migrations/20261113010000_studio_entry_checkpoints/migration.sql
    $expectedSql += "`n" + (($entrySql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $recoverySql = Get-Content -Raw apps/api/prisma/migrations/20261114010000_entry_recovery_options/migration.sql
    $expectedSql += "`n" + (($recoverySql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $auditConstraintSql = Get-Content -Raw apps/api/prisma/migrations/20261114020000_audit_action_constraint/migration.sql
    $expectedSql += "`n" + (($auditConstraintSql -split '-- SQL-only guards')[1] -replace '(?m)^COMMIT;\r?$', '')
    $sql = "CREATE SCHEMA $expectedSchema; SET search_path TO $expectedSchema;`n$expectedSql`n"
    $migrations = Get-ChildItem apps/api/prisma/migrations -Directory | Sort-Object Name
    foreach ($testSchema in @($freshSchema, $upgradeSchema)) {
        $sql += "CREATE SCHEMA $testSchema; SET search_path TO $testSchema;`n"
        foreach ($migration in $migrations) {
            if ($testSchema -eq $upgradeSchema -and $migration.Name -eq '20261101000000_image_audit') {
                $sql += @'
INSERT INTO "AuditLog" (id, action, "actorKind", "targetType", "targetId", metadata, "createdAt") VALUES ('image-audit-upgrade', 'ACCOUNT_REGISTERED', 'SYSTEM', 'USER', 'user', '{}', '2026-01-01');
'@
            }
            if ($testSchema -eq $upgradeSchema -and $migration.Name -eq '20260219173645_added_deleted_by_column') {
                $sql += @'
INSERT INTO "Event" (id, name, "startsAt", "endsAt") VALUES ('event', 'Fixture', '2026-01-01', '2026-01-02');
INSERT INTO "Studio" (id, "eventId", name) VALUES ('studio', 'event', 'Fixture studio');
INSERT INTO "User" (id, email, name) VALUES ('user', 'fixture@example.invalid', 'Fixture');
INSERT INTO "StudioRepresentative" (id, "studioId", "userId", name, email) VALUES ('rep', 'studio', 'user', 'Fixture', 'fixture@example.invalid');
INSERT INTO "Dancer" (id, "studioId", "firstName", "lastName", "birthDate") VALUES ('dancer', 'studio', 'Fixture', 'Dancer', '2010-01-01');
INSERT INTO "DanceCategory" (id, "eventId", name) VALUES ('category', 'event', 'Fixture');
INSERT INTO "AgeGroup" (id, "eventId", name, "minAge") VALUES ('age', 'event', 'Fixture', 0);
INSERT INTO "DanceFormat" (id, "eventId", name, "minParticipants", "maxParticipants", "maxDurationSeconds") VALUES ('format', 'event', 'Fixture', 1, 10, 300);
INSERT INTO "Performance" (id, "eventId", "categoryId", "ageGroupId", "formatId", title, "durationSec", "orderOnStage") VALUES ('performance', 'event', 'category', 'age', 'format', 'Fixture', 60, 1);
INSERT INTO "PerformanceParticipant" ("performanceId", "dancerId") VALUES ('performance', 'dancer');
INSERT INTO "StudioEventRegistration" (id, "studioId", "eventId", status, "canEditDuringReview", "updatedAt") VALUES ('registration', 'studio', 'event', 'LOCKED', true, '2026-01-01');
-- Each status needs a different event because studio/event pairs are unique.
INSERT INTO "Event" (id, name, "startsAt", "endsAt") SELECT s, s, '2026-01-01', '2026-01-02' FROM unnest(ARRAY['PENDING', 'APPROVED', 'REJECTED']) s;
INSERT INTO "StudioEventRegistration" (id, "studioId", "eventId", status, "updatedAt") SELECT s, 'studio', s, s::"RegistrationStatus", '2026-01-01' FROM unnest(ARRAY['PENDING', 'APPROVED', 'REJECTED']) s;
'@
            }
            if ($testSchema -eq $upgradeSchema -and $migration.Name -eq '20261110000000_event_setup') {
                $sql += @'
UPDATE "Event" SET description = E'  Retained organizer prose\nSecond line  ' WHERE id = 'event';
'@
            }
            # Separate transactions permit use of enum values added by earlier migrations.
            $migrationSql = Get-Content -Raw (Join-Path $migration.FullName 'migration.sql')
            # Each migration gets one transaction even when it declares its own.
            $migrationSql = $migrationSql -replace '(?m)^(BEGIN|COMMIT);\r?$', ''
            if ($testSchema -eq $upgradeSchema -and $migration.Name -eq '20261111010000_calendar_birth_dates') {
                $sql += @"
DO `$probe`$ BEGIN
  BEGIN
    UPDATE "Dancer" SET "birthDate" = '2012-02-29 23:30:00' WHERE id = 'dancer';
    EXECUTE `$migration`$$migrationSql`$migration`$;
    RAISE EXCEPTION 'Calendar migration accepted ambiguous legacy value';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'Birth-date migration requires reviewed repair of unsupported or non-midnight legacy values' THEN RAISE; END IF;
  END;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Dancer' AND column_name = 'birthDate' AND data_type = 'timestamp without time zone') THEN RAISE EXCEPTION 'Failed calendar migration retained DDL'; END IF;
  IF NOT EXISTS (SELECT FROM "Dancer" WHERE id = 'dancer' AND "birthDate" = '2010-01-01') THEN RAISE EXCEPTION 'Failed calendar migration changed data'; END IF;
  UPDATE "Dancer" SET "birthDate" = '2012-02-29' WHERE id = 'dancer';
  SET TIME ZONE 'Pacific/Kiritimati';
END `$probe`$;
"@
            }
            if ($testSchema -eq $upgradeSchema -and $migration.Name -eq '20261111020000_performance_history') {
                $sql += @'
INSERT INTO "Performance" (id, "eventId", "studioId", "registrationId", "categoryId", "ageGroupId", "formatId", title, "durationSec", "orderOnStage", "deletedAt", "deletedBy") VALUES ('archived-performance', 'event', 'studio', 'registration', 'category', 'age', 'format', 'Retained archive', 60, 2, '2026-01-02', 'user');
'@
            }
            if ($testSchema -eq $upgradeSchema -and $migration.Name -eq '20261111000000_performance_ownership') {
                $sql += @'
INSERT INTO "Judge" (id, "userId", "eventId", name) VALUES ('ownership-judge', 'user', 'event', 'Fixture');
INSERT INTO "Score" (id, "performanceId", "judgeId", criterion, value) VALUES ('ownership-score', 'performance', 'ownership-judge', 'Fixture', 5);
'@
                # Every probe is rolled back by a PL/pgSQL exception subtransaction.
                # Test the entire migration, including DDL rollback after range/FK errors.
                $probes = @(
                    @{ Mutation = 'DELETE FROM "PerformanceParticipant" WHERE "performanceId" = ''performance'';'; State = 'P0001' },
                    @{ Mutation = 'DELETE FROM "StudioEventRegistration" WHERE id = ''registration'';'; State = 'P0001' },
                    @{ Mutation = 'UPDATE "Studio" SET "eventId" = ''APPROVED'' WHERE id = ''studio'';'; State = 'P0001' },
                    @{ Mutation = 'INSERT INTO "Studio" (id,"eventId",name) VALUES (''mixed-studio'',''event'',''Mixed fixture''); INSERT INTO "StudioEventRegistration" (id,"studioId","eventId","updatedAt") VALUES (''mixed-reg'',''mixed-studio'',''event'',now()); INSERT INTO "Dancer" (id,"studioId","firstName","lastName","birthDate") VALUES (''mixed-dancer'',''mixed-studio'',''Fixture'',''Mixed'',''2010-01-01''); INSERT INTO "PerformanceParticipant" ("performanceId","dancerId") VALUES (''performance'',''mixed-dancer'');'; State = 'P0001' },
                    @{ Mutation = 'UPDATE "DanceCategory" SET "eventId" = ''APPROVED'' WHERE id = ''category'';'; State = '23503' },
                    @{ Mutation = 'UPDATE "AgeGroup" SET "minAge" = -1 WHERE id = ''age'';'; State = '23514' },
                    @{ Mutation = 'UPDATE "Event" SET "maxStudios" = 0 WHERE id = ''event'';'; State = '23514' }
                )
                foreach ($probe in $probes) {
                    $sql += @"
DO `$probe`$ BEGIN
  BEGIN
    $($probe.Mutation)
    EXECUTE `$migration`$$migrationSql`$migration`$;
    RAISE EXCEPTION 'Ownership migration accepted invalid upgrade';
  EXCEPTION WHEN SQLSTATE '$($probe.State)' THEN
    IF SQLERRM = 'Ownership migration accepted invalid upgrade' THEN RAISE; END IF;
    IF '$($probe.State)' = 'P0001' AND SQLERRM NOT LIKE 'Performance ownership requires reviewed repair:%' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Performance' AND column_name = 'studioId') THEN RAISE EXCEPTION 'Failed ownership migration retained DDL'; END IF;
  IF NOT EXISTS (SELECT FROM "PerformanceParticipant" WHERE "performanceId" = 'performance' AND "dancerId" = 'dancer') THEN RAISE EXCEPTION 'Failed ownership migration lost participants'; END IF;
END `$probe`$;
"@
                }
            }
            $sql += "`nBEGIN;`n$migrationSql`nCOMMIT;`n"
        }
        $sql += @'
DO $$
BEGIN
    IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Event' AND column_name = 'maxPerformances' AND data_type = 'integer' AND is_nullable = 'YES') <> 1 THEN
        RAISE EXCEPTION 'Missing nullable Event.maxPerformances';
    END IF;
END $$;
'@
        if ($testSchema -eq $upgradeSchema) {
            $sql += @'
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM "Dancer" WHERE id = 'dancer' AND "birthDate" = DATE '2012-02-29') THEN RAISE EXCEPTION 'Calendar migration lost leap day'; END IF;
  IF NOT EXISTS (SELECT FROM "PerformanceRevision" WHERE "performanceId" = 'performance' AND revision = 1 AND origin = 'LEGACY_BASELINE' AND "actorId" IS NULL AND snapshot->>'title' = 'Fixture' AND snapshot->>'studioName' = 'Fixture studio' AND snapshot->'participants'->0->>'birthDate' = '2012-02-29') THEN RAISE EXCEPTION 'History baseline lost retained fields or invented provenance'; END IF;
  IF NOT EXISTS (SELECT FROM "PerformanceRevision" WHERE "performanceId" = 'archived-performance' AND revision = 1 AND origin = 'LEGACY_BASELINE' AND snapshot->>'archived' = 'true' AND snapshot->>'title' = 'Retained archive') THEN RAISE EXCEPTION 'History baseline lost archive'; END IF;
  IF EXISTS (SELECT FROM "PerformanceRevision" WHERE "capturedAt" NOT BETWEEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') - INTERVAL '1 minute' AND (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '1 minute') THEN RAISE EXCEPTION 'History capture time depends on database session timezone'; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Event" WHERE id = 'event' AND description = E'  Retained organizer prose\nSecond line  ' AND "descriptionSourceLocale" IS NULL AND "descriptionTranslations" = '{}'::jsonb AND revision = 1 AND "organizerEmail" IS NULL AND "organizerPhone" IS NULL) THEN RAISE EXCEPTION 'Event setup migration changed retained prose or inferred setup'; END IF;
END $$;
'@
            $sql += Get-Content -Raw scripts/test-migrations-upgrade.sql
            $sql += @'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "AuditLog" WHERE id = 'image-audit-upgrade' AND action = 'ACCOUNT_REGISTERED' AND "actorKind" = 'SYSTEM' AND "actorId" IS NULL AND "targetType" = 'USER' AND "targetId" = 'user' AND metadata = '{}'::jsonb AND "createdAt" = '2026-01-01') THEN RAISE EXCEPTION 'Image audit migration changed historical evidence'; END IF;
END $$;
'@
        }
    }
    # Compare tables/columns, enum labels, constraints and indexes with schema-derived DDL.
    # The extra partial index is intentional SQL-only behavior and is exercised by the fixture.
    $sql += @"
SET search_path TO public;
CREATE TEMP VIEW migration_signatures AS
SELECT table_schema AS schema_name, 'column' AS kind, table_name || '.' || column_name AS name,
       concat_ws('|', udt_name, is_nullable, replace(coalesce(column_default, ''), table_schema || '.', ''), character_maximum_length, datetime_precision) AS definition
FROM information_schema.columns WHERE table_schema IN ('$expectedSchema', '$freshSchema', '$upgradeSchema')
UNION ALL
SELECT n.nspname, 'enum', t.typname || '.' || e.enumsortorder, e.enumlabel
FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname IN ('$expectedSchema', '$freshSchema', '$upgradeSchema')
UNION ALL
SELECT n.nspname, 'constraint', c.conname, replace(pg_get_constraintdef(c.oid), n.nspname || '.', '')
FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname IN ('$expectedSchema', '$freshSchema', '$upgradeSchema')
UNION ALL
SELECT schemaname, 'index', indexname, replace(indexdef, schemaname || '.', '')
FROM pg_indexes WHERE schemaname IN ('$expectedSchema', '$freshSchema', '$upgradeSchema')
UNION ALL
SELECT n.nspname, 'trigger', t.tgname, replace(pg_get_triggerdef(t.oid), n.nspname || '.', '')
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('$expectedSchema', '$freshSchema', '$upgradeSchema')
UNION ALL
SELECT n.nspname, 'function', p.proname, replace(pg_get_functiondef(p.oid), n.nspname || '.', '')
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('$expectedSchema', '$freshSchema', '$upgradeSchema');
DO `$`$
DECLARE actual_schema text;
        differences text;
BEGIN
    FOREACH actual_schema IN ARRAY ARRAY['$freshSchema', '$upgradeSchema'] LOOP
        SELECT string_agg(format('%s %s %s: %s', side, kind, name, definition), E'\n' ORDER BY kind, name, side)
        INTO differences
        FROM (
            (SELECT 'actual' AS side, kind, name, definition FROM migration_signatures WHERE schema_name = actual_schema
             EXCEPT SELECT 'actual', kind, name, definition FROM migration_signatures WHERE schema_name = '$expectedSchema')
            UNION ALL
            (SELECT 'expected', kind, name, definition FROM migration_signatures WHERE schema_name = '$expectedSchema'
             EXCEPT SELECT 'expected', kind, name, definition FROM migration_signatures WHERE schema_name = actual_schema)
        ) AS mismatch;
        IF differences IS NOT NULL THEN
            RAISE EXCEPTION 'Migration/schema mismatch in %', actual_schema USING DETAIL = differences;
        END IF;
    END LOOP;
END `$`$;
"@
    # An existing public schema can mask cross-schema catalog lookups in migrations.
    # Match CI's empty database regardless of the local application fixture state.
    Invoke-TestSql "CREATE DATABASE $testDatabase;" -TargetDatabase $Database
    $databaseCreated = $true
    Invoke-TestSql $sql
    Write-Output 'PASS: fresh migration history, existing-data upgrade, status/default preservation, partial uniqueness and schema parity.'
} finally {
    $env:DATABASE_URL = $previousDatabaseUrl
    try {
        # Only drop this run's randomly named fixture database; never reset the application database.
        if ($databaseCreated) {
            Invoke-TestSql "DROP DATABASE $testDatabase;" -TargetDatabase $Database
        }
    } finally {
        if (Test-Path -LiteralPath $expectedSqlPath) { Remove-Item -LiteralPath $expectedSqlPath }
        Pop-Location
    }
}
