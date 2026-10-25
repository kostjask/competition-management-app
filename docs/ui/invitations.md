# Staff and representative invitations

Target screen contracts, not an implementation claim. Inherit all shared
[UI requirements](../UI_UX.md), [design rules](../DESIGN_SYSTEM.md) and
[flow acceptance](../USER_FLOWS.md). Routes are in the
[route inventory](../UI_UX.md#route-inventory); API paths are relative to /api/v1.

## S17 — Staff and additional-representative onboarding

- **Purpose / roles / routes:** assign authorized event/studio access; inviter admin or future authorized studio inviter, intended invitee; proposed routes in inventory.
- **Primary action:** invite or accept as intended account; distinct resend/revoke and remove accepted access.
- **Data:** role key, mandatory event/studio context, intended account, expiry and delivery/assignment state, history-preserving offboarding rules.
- **Sections / components:** scoped staff/member list, invite form, preview, new/existing/wrong-account acceptance, status/recovery, remove-access confirmation.
- **States:** loading/none, invited/expired/revoked/accepted as contracts add them, delivery failure, used link, inactive/wrong account, acceptance conflict/rollback; no false assignment success.
- **Responsive / accessibility:** mobile list and single acceptance form; desktop table; account-switch links, clear scope and keyboard dialog handling.
- **API:** current invitation inspect/create/list/accept and judges client; hardened lifecycle/studio invitations/offboarding pending. Never use judge CRUD as access removal.
- **Acceptance:** exact intended account and scope; judge role/record/consumption atomic; contact edits cannot grant membership; historical scores survive access removal. F06/F04.
