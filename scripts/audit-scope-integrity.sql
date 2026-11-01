-- Read-only preflight against the intended deployment. No tokens, email addresses,
-- account IDs or other row contents are emitted. Null scope requires provenance review.
BEGIN READ ONLY;
SELECT 'global_roles_for_review' AS finding, count(*) AS count FROM "UserRole" WHERE "eventId" IS NULL
UNION ALL
SELECT 'active_scoped_admin_assignments', count(*) FROM "UserRole" ur JOIN "Role" r ON r.id = ur."roleId"
WHERE r.key = 'admin' AND ur."eventId" IS NOT NULL AND to_jsonb(ur)->>'removedAt' IS NULL
UNION ALL
SELECT 'active_global_staff_assignments', count(*) FROM "UserRole" ur JOIN "Role" r ON r.id = ur."roleId"
WHERE r.key IN ('judge', 'moderator') AND ur."eventId" IS NULL AND to_jsonb(ur)->>'removedAt' IS NULL
UNION ALL
SELECT 'removed_admin_assignments', count(*) FROM "UserRole" ur JOIN "Role" r ON r.id = ur."roleId"
WHERE r.key = 'admin' AND to_jsonb(ur)->>'removedAt' IS NOT NULL
UNION ALL
SELECT 'global_invitations_for_review', count(*) FROM "Invitation" WHERE "eventId" IS NULL
UNION ALL
SELECT 'duplicate_role_groups', count(*) FROM (
  SELECT 1 FROM "UserRole" GROUP BY "userId", "roleId", "eventId" HAVING count(*) > 1
) duplicates
UNION ALL
SELECT 'duplicate_unconsumed_invitation_groups', count(*) FROM (
  SELECT 1 FROM "Invitation" i WHERE "usedAt" IS NULL AND to_jsonb(i)->>'supersededAt' IS NULL
  GROUP BY email, "roleKey", "eventId" HAVING count(*) > 1
) duplicates;
COMMIT;
