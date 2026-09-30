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
- Live view metadata includes the library tab, board/list layout, two selected evidence IDs and bounded scroll ratios for the readers. No document contents or search queries are added to the live payload. Search/filter state remains local to each viewer; this remains a shared audit view rather than pixel-streamed screen capture.

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

Live following starts automatically on each workspace visit without a confirmation
dialog. The browser initializes a sharing session through the existing live access
endpoint before publishing. The workspace stays usable if initialization fails.
There is no ongoing viewer indicator. Leaving the workspace ends transmission.

Following shares the current audit, check, tab, linked evidence preview, scroll
position and pointer. It renders saved audit records in a read-only view; it is
not a pixel/video screen stream. Unsaved form text, unrelated tabs, external
source pages and the desktop are excluded. Dialogs for unsaved requests/findings
are not mirrored. Live events are transient, with no replay or recording.

Pointers are sampled at up to 20 Hz, coalesced under backpressure and interpolated
using animation frames. Tickets are single-use and expire after 20 seconds.
Authorization is rechecked every four seconds; revoked consent broadcasts an
immediate stop. Stale views disappear, connections retry with backoff, and audit
saving works independently of the live service.

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
   workspace enables following without a prompt; leaving stops it; removing access
   terminates it. Check cross-replica following and reconnect after a proxy restart.

Without Redis or WebSocket proxy support, the audit workflow remains usable but
live following is unavailable. The owner sees the disconnected state.

## Validation performed locally

API tests cover tenant isolation, consent, revocation, bounded queues, review
conflicts, exact-version previews, completion and OpenAPI contracts. Real local
WebSocket tests cover handshake tickets, replay rejection and payload validation;
their Redis transport is mocked. Frontend tests cover automatic sharing, reconnect, stale
views, autosave/conflicts and route permissions. The additive migration was
applied to an isolated PostgreSQL fixture including existing records and cascade
checks. Chrome component checks use synthetic data, not the production database.

Production proxy/Redis latency and the full deployed application remain rollout
checks; local tests do not establish production performance.
