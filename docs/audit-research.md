# Audit research

The audit workspace includes a research assistant using the existing Vercel AI SDK and OpenAI Responses provider. Its model is the SoA batch model (`gpt-6.1-sol` at implementation), displayed from server metadata and recorded on every answer. There is no fallback to a different model. Generation uses medium reasoning and `store: false`.

## Workflow and retention

Research topics belong to an existing internal audit. Questions, attributed authors, answers, progress and source excerpts are persisted in PostgreSQL, without a cache expiry. Authorized audit team members share the history. Audit deletion cascades to its research; there is no separate automatic history deletion. Older messages load in pages of 20; full source excerpts are fetched on demand.

The API saves a turn before returning HTTP 202. The browser polls for incremental text and can leave/reload without canceling the server task. An organization-scoped transaction lock and client UUID prevent duplicate generation after uncertain HTTP responses. One turn runs per topic, with at most three concurrent turns per organization. Provider work has a five-minute deadline; after six minutes, interrupted work is marked failed while preserving partial text. A server restart interrupts active generation; it does not lose saved questions or completed answers. Retry is explicit.

Topics retain up to 100 turns, then a new topic is required. The model receives a bounded recent context (up to 16 completed turns and 48,000 characters), including historical source identifiers to re-read. Older conversation history stays available in the interface even when outside model context.

## Sources

Read-only tools search and read organization-scoped policies, native ISMS documents, SoA, risks, vendors, tasks, comments, audit checks/requests/findings, linked evidence snapshots, knowledge files, context answers, questionnaire answers, findings and controls. The existing optional semantic index helps discover related records; database lookup revalidates every hit before use. The source text in the vector index is never trusted as current evidence.

Published content, working drafts and retained evidence are labelled separately. Reading creates a citation with a title, version, retrieval time and exact text excerpt. Citation links open the saved excerpt; opening the Comp record shows its current state. The assistant cannot mutate, approve, sign or publish audit records. Organizational records are treated as untrusted evidence, not prompt instructions. AI answers remain subject to auditor review.

Files: Markdown, text, CSV, JSON, DOCX, XLSX, PDF, PNG, JPEG and WebP. File reads are restricted to verified organization storage keys and 8 MB. Existing Mammoth/ExcelJS parsing is reused, with a 32 MB archive expansion limit; spreadsheets are limited to 10,000 cells. PDFs and images use the same GPT model for labelled AI transcription and require original-file verification. Unsupported, missing or oversized files are identified as unreadable, not silently interpreted. Text is paged in 12,000-character excerpts, capped at 500,000 characters per source and 30 reads per turn.

Search is not an exhaustive compliance assessment. Filename/description search does not search unindexed file contents; the model must read a candidate file. The optional vector index may be incomplete. Global vendor research caches, credentials, HR attachments and external web pages are not directly queried. Live stored vendor assessments may be present in task descriptions; vendor record claims are not independently verified.

## Access and rendering

Shared history requires session authentication, auditWorkspace read access and read permissions for every source category: evidence, policy, risk, vendor, task, questionnaire, finding and control. Asking also requires auditWorkspace update and active membership. Generation rechecks access at each tool call and before completion. Browser-only research endpoints are disabled for MCP.

Markdown uses React Markdown and GFM. HTML and images are suppressed; only captured citation links are interactive. Original-record links are restricted to the current organization's Comp paths. Research interactions and unsaved drafts are visible in live workspace reconstruction only after explicit consent. Saved research remains accessible through its own permission-checked endpoints.

## Release and verification

The initial version was deployed on 30 September 2026. Apply additive migration `20260930190000_audit_research` through the normal release process before enabling this code. Existing OpenAI configuration is reused; no new key or provider is required. Real provider availability and production data retrieval still require a staging smoke test.

Verified locally: 67 API tests in the audit workspace suite and 9 research UI tests (including permission/idempotency/concurrency/timeout/history/citation/file-size, Markdown safety and composer coverage), API typecheck, scoped frontend lint, browser rendering with synthetic evidence, isolated PostgreSQL migration and source-query execution. Full app typecheck has pre-existing failures outside this feature. No production database or deployment was changed.

Research startup uses `$executeRaw` for the transaction advisory lock: PostgreSQL returns `void`, which must not be decoded as a Prisma query-result column. This prevents a failure before the question is persisted.
