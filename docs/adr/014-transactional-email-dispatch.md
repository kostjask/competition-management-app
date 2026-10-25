# ADR-014: Resend and encrypted transactional email dispatch

Status: accepted, 2026-10-25. P2-EMAIL technical scope.

Use Resend's HTTPS API without a new SDK dependency. Development/tests default
to a silent fake; production refuses fake delivery. Provider acceptance is not
inbox delivery. All acknowledgements describe accepted requests, never sent mail.
Recipient locale follows ADR-013. Templates are plain text and escaped HTML in
ET/EN/RU; no private billing/dancer payload or inviter UI language is included.

Real messages are queued in the domain transaction. Persist AES-256-GCM encrypted
payloads under a dedicated externally managed 32-byte key, with random nonces and
delivery ID as authenticated data. Freeze the rendered subject/text/HTML, recipient
and sender at enqueue so template/origin/sender changes cannot alter retries under
the same provider idempotency key. Raw tokens remain absent from plaintext storage
and logs. The queue is private operational data, without a public read endpoint.
Token binding is checked before dispatch; invalidated/consumed/expired links are
discarded. A background worker retries transient failures using the same row ID
as Resend's idempotency key. A database advisory lock serializes worker attempts.
The provider request has a bounded timeout. Record attempts and a safe generic
failure state, never provider errors containing recipient/payload data.

Resend retains idempotency keys for 24 hours. Queue attempts stop after 23 hours
from creation (or token expiry, whichever is sooner); do not risk duplicates by
retrying after provider deduplication expires. On success, expiry or supersession,
erase ciphertext on the next worker pass and retain only a receipt/state. Worker
downtime/backup retention may extend encrypted residence, never the dispatch
window; review those operational periods before real data. This is an explicit transport
secret lifecycle, not domain retention cleanup. Key rotation requires draining or
expiring outstanding rows before changing the key; restore must include the key
through the operator's secret backup process. An acknowledgement lost after send
is safely retried inside the deduplication window. Domain rollback cannot dispatch
because the worker only sees committed queue rows.

Existing injected failure fixtures retain their synchronous test adapter to prove
rollback. The production adapter enqueues; external provider failure leaves a
committed recoverable intent and never rolls back an already-issued token. Retry
does not rotate tokens or change account details. A new resend request may rotate
the old link; stale queued mail is cancelled on its next attempt. Application
decision templates are ready for the later application workflow to enqueue in its
own transaction; no new approval workflow is introduced here.

Real delivery, DNS/domain setup, provider account, staging hosting, backup/restore
and operational scope review remain external gates. No staging account/environment
currently exists. Do not expose the unfinished API merely to test email.

Provider reference: [send API](https://resend.com/docs/api-reference/emails/send-email)
and [24-hour idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
