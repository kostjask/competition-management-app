# Staff and representative invitations

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S17 — Staff and additional-representative onboarding

- **Purpose / roles / routes:** assign authorized event/studio access; inviter admin or future authorized studio inviter, intended invitee; event staff at /admin/events/:eventId/staff, global invitation management at /admin/invitations, intended acceptance at /auth/accept-invitation.
- **Primary action:** invite or accept as intended account; distinct resend/revoke and remove accepted access.
- **Data:** role key, mandatory event/studio context, intended account, expiry and delivery/assignment state, history-preserving offboarding rules.
- **Sections / components:** scoped staff/member list, invite form, preview, new/existing/wrong-account acceptance, status/recovery, remove-access confirmation.
- **States:** loading/none, invited/expired/revoked/accepted as contracts add them, delivery failure, used link, inactive/wrong account, acceptance conflict/rollback; no false assignment success. Failed/uncertain operations preserve local inputs and require explicit refresh before writes; acknowledged success survives failed readback.
- **Responsive / accessibility:** mobile list and single acceptance form; desktop assignment table; account-switch links, clear scope and keyboard dialog handling. Native remove/revoke confirmation defaults to Cancel, traps focus, supports Escape before submission and restores trigger/logical-successor focus.
- **API:** current invitation inspect/create/list/accept and judges client; GET /events/:eventId/staff and canonical create/resend/revoke/remove are implemented locally; studio invitations remain gated by P5-MEMBERS. Never use judge CRUD as access removal.
- **Acceptance:** exact intended account and scope; judge role/record/consumption atomic; contact edits cannot grant membership; historical scores survive access removal. F06/F04.
