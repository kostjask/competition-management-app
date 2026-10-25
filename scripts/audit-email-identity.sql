-- Aggregate-only read-only preflight; usable before and after the migration.
BEGIN READ ONLY;
SELECT 'noncanonical_accounts' AS finding, count(*) AS count FROM "User" WHERE email <> lower(btrim(email, ' ') COLLATE "C")
UNION ALL
SELECT 'noncanonical_invitations', count(*) FROM "Invitation" WHERE email <> lower(btrim(email, ' ') COLLATE "C")
UNION ALL
SELECT 'account_collision_groups', count(*) FROM (
  SELECT 1 FROM "User" GROUP BY lower(btrim(email, ' ') COLLATE "C") HAVING count(*) > 1
) collisions
UNION ALL
SELECT 'outstanding_invitation_collision_groups', count(*) FROM (
  SELECT 1 FROM "Invitation" WHERE "usedAt" IS NULL AND "supersededAt" IS NULL
  GROUP BY lower(btrim(email, ' ') COLLATE "C"), "roleKey", "eventId" HAVING count(*) > 1
) collisions;
COMMIT;
