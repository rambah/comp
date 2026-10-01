# Internal audit workspace

The `/{organizationId}/audits` route uses the existing internal audit programme,
checks and findings. It does not create a competing audit register or change SoA
approval permissions. The UI uses the Comp design system.

## Workflow

- Plan the audit and its checks in Documents → Internal audit.
- Auditors land on Audits, filter the queue and continue the next unfinished check.
- Each check shows suggested source locations, linked evidence, review notes,
  questions and the recorded outcome. Notes autosave; concurrency conflicts retain
  the local draft. Copy the draft before refreshing after a conflict.
- Published document text and version IDs are captured when linked. A later
  published version can be linked alongside an earlier one. PDF previews resolve
  that exact version; attachment previews use the original attachment service.
- Requests have an owner, due date and response history. Submitted responses must
  be accepted or returned for changes; accepted requests can be reopened.
- Findings reuse the existing audit findings register and have follow-up status,
  ownership, due dates and closure evidence. Closing requires evidence.
- The report collects checks, requests, findings and the overall conclusion. Its
  Markdown export is a working record. Completing an audit requires recorded
  outcomes and reasoning for every check, at least one sampled check, accepted
  requests and a saved conclusion. The current browser user confirms their own
  auditor sign-off. Management approval and publication remain separate.
- Changes to checks, evidence, questions or conclusions reopen the working audit
  and clear current draft sign-offs. Published versions remain unchanged.

## Evidence library and review board

- The review plan opens as a four-lane board and can switch to a compact list. Status is derived from saved outcomes and outstanding requests; cards cannot be dragged to manufacture an outcome. The no-linked-evidence filter helps plan sampling without treating missing links as a nonconformity.
- The evidence library spans all checks in the selected audit, with source-type and title/version/check search. Each card links back to its original check and exact retained evidence reference.
- Different text snapshots of the same typed source can be compared side by side, with a selectable comparison version and independent document searches. PDF-only records and original file attachments retain their existing preview; they are not presented as text comparisons.
- The evidence index downloads locally as CSV, retaining exact source/evidence IDs, version labels and capture metadata. Fields are quoted and formula prefixes neutralized. It is an index, not an archive of the source files.
- Live reconstruction starts automatically and includes the visible library, board/list layout, search/filter inputs and open comparisons. The observer sees the auditor's current workspace state without submitting any actions.

## Review experience

The overview prioritizes received responses before unfinished checks, surfaces
past-due requests, and shows the latest saved review activity. Progress separates
reviewed checks from explicit exclusions; it is never presented as a compliance
score. The completion checklist checks outcomes, reasoning, sampling, accepted
requests and the saved conclusion before enabling sign-off.

Use **Find in audit** or **Cmd/Ctrl+Shift+K** to jump to a check, its exact linked
evidence version, a question or a finding. The shortcut is disabled while a draft
is saving or another dialog is open. Checks also have previous/next and direct
jump navigation. Request and finding views offer focused status filters.

Captured text previews support literal, case-insensitive document search with
match navigation and copying a versioned source citation. Highlighting is capped
at 300 matches to keep long documents responsive; it does not change source text.
PDFs retain their native viewer. None of these conveniences generate audit
judgments or mark work complete automatically.

## Access and live following

Built-in auditors receive `auditWorkspace:read,update`; owners/admins also receive
`auditWorkspace:observe`. Access additionally requires evidence and policy read
permissions. Creating a finding retains the existing `finding:create` restriction.
Live consent, tickets and auditor completion require the user's own browser
session; impersonation and MCP/API-key callers cannot perform those actions.

Live reconstruction starts automatically on each organization app visit. The auditor sees no confirmation dialog, sharing controls, status banner, viewer list or live-service error message. Initialization uses the existing authenticated session endpoint; the workspace stays usable if initialization fails. Leaving the organization app, hiding the tab or losing access ends transmission. Navigation between organization pages keeps the session active. Following controls and connection status remain restricted to authorized observers.

The workspace is reconstructed with rrweb in an isolated, read-only iframe. It does not use screen capture or replay application components. The replay iframe permits neither scripts nor form submission, is inert, and receives no application event handlers. Replaying a submit click cannot execute a second mutation; only the auditor's original form writes data. Opening a PDF causes the administrator to retrieve the same evidence version through the existing permission-checked preview endpoint. PDF viewer page/zoom controls and browser-native file pickers are not mirrored.

The visible organization app, navigation and portalled dialogs are captured. Passwords, one-time codes, payment-card inputs and explicitly private elements are excluded, as are other browser tabs and the desktop. Research is included in the workspace view. CSS and DOM changes are batched every 100 ms, compressed and split into bounded chunks. Pointer samples are collected at up to 40 Hz; an 800 ms playback buffer smooths arrival jitter. Actual latency depends on the network.

The authenticated WebSocket/Redis relay retains no replay history or video. Publisher and observer permissions are rechecked every four seconds. Stops clear the rendered view immediately upon delivery. Connections retry; an interrupted or incomplete sequence requests a fresh snapshot rather than applying corrupt deltas. Presence tolerates 15 seconds of jitter, retains the chosen auditor during reconnection and does not end sharing when the browser tab loses focus. Input and DOM buffers are bounded; overload closes the connection and requires synchronization again.

## Deployment

1. Back up the database and apply the additive Prisma migration
   `20260930120000_audit_workspace` before starting the new API/app release.
2. Build the auth and DB packages, API and app from the same commit. The app's
   normal prebuild copies the shared Prisma schema and generates its client.
3. Configure the existing `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` on each API replica. REST Pub/Sub must be supported.
4. Allow WebSocket upgrades at `/v1/audit-workspace/session/socket` through the API
   reverse proxy, use TLS, and allow the app origin in the existing trusted-origin
   configuration. Do not cache the socket or live ticket endpoints.
   Deploy API and frontend together for the session endpoint rename, and update
   any proxy rules that previously matched `/v1/audit-workspace/live/socket`.
5. Verify a real auditor and an owner in separate browser sessions: opening the
   workspace starts transmitting without any confirmation or publisher status notice; leaving the organization app or hiding the tab stops it; removing access
   terminates it. Check cross-replica following and reconnect after a proxy restart.

Without Redis or WebSocket proxy support, the audit workflow remains usable but
live following is unavailable. The owner sees the disconnected state.

## Validation history

API tests cover tenant isolation, consent, revocation, bounded queues, review
conflicts, exact-version previews, completion and OpenAPI contracts. Real local
WebSocket tests cover handshake tickets, replay rejection and payload validation;
their Redis transport is mocked. Frontend regression cases cover sharing, reconnect, stale
views, autosave/conflicts and route permissions. The additive migration was
applied to an isolated PostgreSQL fixture including existing records and cascade
checks. Chrome component checks use synthetic data, not the production database.

Production proxy/Redis latency and the full deployed application remain rollout
checks; local tests do not establish production performance.

Automatic initialization regression cases cover Strict Mode, organization changes, failed initialization and new visits. Scope exclusion and observer-only relay boundaries remain enforced. Static type checks are separate from functional or performance validation.

## Private session recordings

Administrators and owners can open **Audits → Recordings**. The auditor role has
no recording permissions, navigation, player or deletion controls. The server
checks active organization membership, `auditRecording:read` and
`auditWorkspace:observe` for every list, manifest and chunk request; deletion
additionally requires `auditRecording:delete`. Browser sessions only; no public
object URLs or MCP access. Organization boundaries and expiry are checked before
any stored content is read.

A publisher's complete DOM batches are archived even without a live observer.
This is a video-like rrweb replay of visible Comp pages, with play/pause, seeking
and playback speed, not an MP4 or desktop capture. Existing private surface,
password, one-time-code and card-input exclusions apply. Embedded PDF contents
and native file pickers are not stored in the replay. The sandboxed player cannot
execute scripts or submit forms. Old recordings cannot be reconstructed.

Each connection starts a fresh recording. Long sessions split at a full snapshot
after about 15 minutes or 16 MB of encoded activity. Writes flush every five
seconds; disconnect and graceful shutdown flush complete pending batches. A
crashed process can lose its last unflushed seconds. Incomplete sessions are
labelled interrupted, and playback rejects missing chunks rather than silently
joining gaps. The list displays 100 sections per page, with navigation to older retained sections.

Manifests and object references use separate `AuditRecording` and
`AuditRecordingChunk` tables (migration `20261001010000_audit_recordings`). Gzipped
chunks are stored privately with AES256 server-side encryption under the existing
S3 bucket's `audit-recordings/` prefix. The API role needs GetObject, PutObject,
DeleteObject for this prefix and ListBucket with this prefix. Existing business
audit records and evidence are not changed by recording deletion.

Access expires exactly 30 days after section creation. A one-minute cleanup task
removes expired objects before removing manifests and retries storage failures.
Manual deletion denies access immediately and waits two minutes before purging,
so bounded in-flight uploads can settle. A paginated prefix sweep also removes
orphaned objects after organization deletion or interrupted upload commits.
Physical cleanup depends on storage availability; failed jobs are logged for
operations. No recording data is retained in application logs.
