param(
    [string]$Database = 'dance_comp',
    [string]$DatabaseUser = 'dance_user'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot
$suffix = [Guid]::NewGuid().ToString('N')
$expectedSchema = "migration_expected_$suffix"
$freshSchema = "migration_fresh_$suffix"
$upgradeSchema = "migration_upgrade_$suffix"
$expectedSqlPath = Join-Path ([IO.Path]::GetTempPath()) "migration_expected_$suffix.sql"
$previousDatabaseUrl = $env:DATABASE_URL
$pnpmCommand = if ($env:OS -eq 'Windows_NT') { 'pnpm.cmd' } else { 'pnpm' }

function Invoke-TestSql([string]$Sql) {
    $Sql | docker compose -f docker/docker-compose.yml exec -T postgres psql -X -q -v ON_ERROR_STOP=1 -U $DatabaseUser -d $Database
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
    $sql = "CREATE SCHEMA $expectedSchema; SET search_path TO $expectedSchema;`n$expectedSql`n"
    $migrations = Get-ChildItem apps/api/prisma/migrations -Directory | Sort-Object Name
    foreach ($testSchema in @($freshSchema, $upgradeSchema)) {
        $sql += "CREATE SCHEMA $testSchema; SET search_path TO $testSchema;`n"
        foreach ($migration in $migrations) {
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
            # Separate transactions permit use of enum values added by earlier migrations.
            $sql += "`nBEGIN;`n$(Get-Content -Raw (Join-Path $migration.FullName 'migration.sql'))`nCOMMIT;`n"
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
            $sql += Get-Content -Raw scripts/test-migrations-upgrade.sql
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
FROM pg_indexes WHERE schemaname IN ('$expectedSchema', '$freshSchema', '$upgradeSchema') AND indexname <> 'Studio_name_active_unique';
DO `$`$
DECLARE actual_schema text;
BEGIN
    FOREACH actual_schema IN ARRAY ARRAY['$freshSchema', '$upgradeSchema'] LOOP
        IF EXISTS (
            (SELECT kind, name, definition FROM migration_signatures WHERE schema_name = actual_schema
             EXCEPT SELECT kind, name, definition FROM migration_signatures WHERE schema_name = '$expectedSchema')
            UNION ALL
            (SELECT kind, name, definition FROM migration_signatures WHERE schema_name = '$expectedSchema'
             EXCEPT SELECT kind, name, definition FROM migration_signatures WHERE schema_name = actual_schema)
        ) THEN RAISE EXCEPTION 'Migration/schema mismatch in %', actual_schema; END IF;
    END LOOP;
END `$`$;
"@
    Invoke-TestSql $sql
    Write-Output 'PASS: fresh migration history, existing-data upgrade, status/default preservation, partial uniqueness and schema parity.'
} finally {
    $env:DATABASE_URL = $previousDatabaseUrl
    try {
        # Only drop the randomly named schemas owned by this run; never reset the database.
        Invoke-TestSql "SET client_min_messages TO warning; DROP SCHEMA IF EXISTS $expectedSchema CASCADE; DROP SCHEMA IF EXISTS $freshSchema CASCADE; DROP SCHEMA IF EXISTS $upgradeSchema CASCADE;"
    } finally {
        if (Test-Path -LiteralPath $expectedSqlPath) { Remove-Item -LiteralPath $expectedSqlPath }
        Pop-Location
    }
}
