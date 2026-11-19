# ADR-029: Private local music delivery and correction windows

Accepted for P8-MEDIA/P5-MUSIC, 2026-11-19. Extends [ADR-028](028-private-music-model.md).

Use an explicitly configured absolute private local volume and an authenticated
range-capable proxy. This avoids bearer URLs and rechecks current membership,
application, performance and version on every request. There is no public mount,
object-store adapter or signed-link issuance. A production installation must
provision durable storage, access controls, capacity and coordinated backup/restore;
the local implementation makes no hosted availability claim.

An event has revisioned explicit MIME, byte, duration, music deadline and latest
correction deadline policy. No festival limits are inferred. Upload is disabled
until the policy and provider are configured. Music uses its own window, never
entry approval or checkpoint grants. Global-admin reasoned REOPEN records a
track-specific future correction deadline bounded by the event's exception limit.
Finalized/ended/cancelled events cannot accept new preparations or replacements.
Current PENDING/APPROVED members can prepare music without roster/configuration
permissions; rejected/cancelled/locked applications and removed members cannot.

Disk multipart staging is bounded by event bytes and two concurrent requests per
process. Parsing uses at most two bounded buffers, with a 128 MiB technical ceiling.
Allow MP3 layer III complete-frame streams and PCM WAV mono/stereo 16/24/32-bit
8–192 kHz. Reject malformed/truncated streams and unsupported formats/flags; do
not launch codecs, subprocesses, remote probes or metadata interpreters. Structural
validation establishes detected type and duration, not audible recording quality;
the organizer's explicit listening/acceptance remains necessary. These formats
are an implementation allowlist, not an assertion about festival requirements.

Commit a staging row before writing bytes. Finalization rechecks actor, policy,
revision, window, state and unexpired/nonretired staging in one serializable
version/current-pointer/receipt/audit transaction. Exact actor/body/hash-bound
replays return the original receipt. Failed/uncertain writes never delete retained
bytes. Retire staging after one hour, then delete bytes and the staging row;
deletion failures remain retryable. Retirement and finalization conflict on the
same row. Run cleanup every minute in API and loopback-workspace entries.

Retain all committed versions and receipts. Only the current version can obtain
new byte access; existing streams may finish naturally. Old versions are not
orphans and automatic cleanup must never remove them. Future retention/deletion
policy needs an explicit domain change, not a file-age heuristic. Back up metadata
and the private volume together; rollback must retain migration 45 and version
provenance. Disabling uploads does not authorize deleting the volume.
