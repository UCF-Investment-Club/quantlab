# ICQ Labs Phase 1 Foundation MVP Specification

Version: 1.0  
Date: 2026-03-29  
Parent Spec: [SPEC.md](SPEC.md)

## 1. Purpose

This document defines the detailed build plan for Phase 1 of ICQ Labs.

Phase 1 focus:

- Platform foundation (auth, RBAC, navigation, core data model)
- Member administration baseline (directory visibility, invite flow, password reset)
- News feed baseline (ticker-correlated ingestion, source attribution, search/filter)

Constraint acknowledged:

- Brokerage platform access is not available yet, so portfolio trade execution and holdings synchronization are out of scope for this phase.

## 2. Phase 1 Scope

## 2.1 In Scope

- Supabase project setup for dev and prod-ready architecture
- Authentication via Supabase Auth (email/password)
- Role model and role-gated route and API access
- Admin invite flow and temporary credential onboarding
- Password reset flow
- Member directory read experience
- News ingestion pipeline and normalized article store
- News UI with ticker filters, sentiment tags, search, and source attribution
- Base app shell and navigation for merged modules
- Foundational observability, audit logging, and security controls

## 2.2 Out of Scope

- Any brokerage integration or automated trade sync
- Holdings CRUD and trade ledger workflows
- Portfolio performance analytics beyond mocked placeholders
- Risk analytics engine, valuation models, and pitch workflow finalization

## 3. Success Criteria

Functional success:

- Admin can invite users and assign role claims.
- Users can sign in, reset password, and view role-aware navigation.
- Member directory is visible according to policy.
- News feed surfaces ticker-correlated articles with source and publication metadata.
- Search and filters for ticker, sentiment, and date range are operational.

Non-functional success:

- P95 response time below 500ms on read endpoints under expected club load.
- News ingestion jobs succeed at least 99% per day with retries and dead-letter handling.
- Auth and role checks are enforced for all protected API endpoints.

## 4. Technical Architecture for Phase 1

## 4.1 Core Platform

- Frontend and API: Next.js App Router
- Data and auth: Supabase Postgres + Supabase Auth + Row Level Security
- File assets: Supabase Storage (for user assets and future content uploads)
- Jobs and cache: Redis queue worker for scheduled ingestion and notifications
- News provider (Phase 1): Yahoo Finance via npm package yahoo-finance2

## 4.2 Runtime Components

- Web runtime:
  - Serves app routes and API handlers
  - Enforces route-level auth checks
- Worker runtime:
  - Polls news sources
  - Normalizes and deduplicates content
  - Applies sentiment classification hook
  - Writes article and taxonomy records

## 4.3 Data Flow

1. Worker fetches provider data on schedule.
2. Payload is normalized into canonical article schema.
3. Duplicate detection checks provider id and URL hash.
4. Sentiment service tags each article.
5. Articles become queryable through API filters and full-text search.
6. UI consumes paginated results and renders attribution metadata.

Provider note:

- Phase 1 implementation uses yahoo-finance2 as the canonical news ingestion source.
- Ingestion should use provider adapter boundaries so Yahoo can be replaced later without API/UI changes.

## 5. Information Architecture in Phase 1

Implemented sections in navigation:

- Portfolio and Watchlist: visible as shell section, functional pages can be placeholder state in this phase.
- News and Macro: fully functional baseline for news feed.
- Members: directory read view available.
- Admin: invite and role management pages for admin only.

Global behaviors:

- Signed-in role badge in header.
- Navigation visibility determined by role policy map.
- Unauthorized route access redirects to a permission-safe fallback.

## 6. Role and Permission Implementation

Roles:

- MEMBER
- OFFICER
- ADMIN

Phase 1 enforceable capabilities:

- MEMBER:
  - Read news and use filters/search
  - View member directory
- OFFICER:
  - All MEMBER capabilities
- ADMIN:
  - All OFFICER capabilities
  - Invite users
  - Assign role claims
  - View audit log entries

Policy pattern:

- Define action constants and minimum role map in server policy module.
- Reuse same policy checks in:
  - Route middleware
  - API handlers
  - Service-level mutators

## 7. Detailed Data Model (Phase 1)

## 7.1 Identity and Access

- users
  - id, email, full_name, role, status, created_at, last_login_at
- invites
  - id, email, role, invite_token_hash, expires_at, invited_by, accepted_at
- password_reset_tokens
  - id, user_id, token_hash, expires_at, used_at
- sessions
  - handled by Supabase Auth session model
- audit_logs
  - id, actor_id, action, entity_type, entity_id, metadata_json, created_at

## 7.2 Member Directory

- member_profiles
  - user_id, major, graduation_year, joined_at, is_active

## 7.3 News Baseline

- news_articles
  - id, provider, provider_article_id, title, summary, url, source_name, published_at, language, inserted_at
- news_article_tickers
  - article_id, ticker
- news_article_sentiment
  - article_id, label, score, model_name, model_version
- news_ingestion_runs
  - id, provider, started_at, finished_at, status, fetched_count, inserted_count, error_summary

Indexes required:

- news_articles published_at desc
- unique on provider + provider_article_id
- unique on normalized URL hash
- GIN full-text index on title + summary
- news_article_tickers ticker index

## 8. API Specification (Phase 1)

Base path: /api/v1

## 8.1 Auth

- POST /auth/login
  - Uses Supabase signInWithPassword
- POST /auth/logout
- POST /auth/reset/request
- POST /auth/reset/confirm

## 8.2 Members

- GET /members
  - Access: MEMBER+
  - Query: q, role, active, page, pageSize
  - Response: paginated member profiles

## 8.3 Admin Onboarding

- POST /members/invite
  - Access: ADMIN
  - Body: email, role
- PATCH /members/:id/role
  - Access: ADMIN
  - Body: role

## 8.4 News Feed

- GET /news
  - Access: MEMBER+
  - Query: tickers, sentiment, q, from, to, page, pageSize
  - Returns article list with ticker tags and sentiment payload
- GET /news/earnings
  - Access: MEMBER+
  - Can return empty or provider-backed baseline depending on provider readiness
- GET /news/sec-filings
  - Access: MEMBER+
  - Can return empty or provider-backed baseline depending on provider readiness

Response envelope:

- data
- meta
- error

## 9. UI Specification (Phase 1)

## 9.1 Required Routes

- /login
- /reset-password
- /dashboard/news
- /members
- /admin/invites
- /admin/users

## 9.2 News Screen Requirements

- Feed list cards include:
  - headline
  - source name
  - published timestamp
  - external link
  - ticker tags
  - sentiment chip
- Controls:
  - ticker multi-select
  - sentiment filter
  - date range filter
  - text search
- Behaviors:
  - loading and empty states
  - pagination or infinite scroll
  - refresh indicator with latest ingestion timestamp

## 10. Jobs and Scheduling

Phase 1 scheduled jobs:

- yahoo-news-fetch job every 5 to 10 minutes
- sec-filings poll every 15 to 30 minutes when provider enabled
- earnings event refresh daily or as available

Job resilience:

- exponential backoff retries
- dead-letter queue after max retries
- run-level logging in news_ingestion_runs

Yahoo-specific ingestion requirements:

- Use yahoo-finance2 package APIs for quote/news retrieval in the provider adapter.
- Respect rate limits with jittered polling and bounded concurrency.
- Persist provider response metadata needed for debugging parsing failures.

## 11. Security and Compliance in Phase 1

- Supabase RLS policies on all application tables
- Server-side role guard on all mutation endpoints
- Password reset tokens hashed at rest
- Invite tokens hashed and time-limited
- API rate limiting on login and reset endpoints
- Audit log for login success, invite creation, role change, and admin access

## 12. Observability

Metrics to capture:

- API request count, latency, error rate
- auth failure rate
- job duration and success ratio
- article ingestion throughput and duplicate suppression ratio

Logging:

- structured JSON logs with request id and user id when available
- worker logs include provider name and run id

## 13. Test Plan

Unit tests:

- role policy evaluator
- article normalization and dedupe hash
- query filter parser

Integration tests:

- auth-protected endpoints by role
- invite acceptance and role assignment lifecycle
- news query combinations and pagination behavior

End-to-end tests:

- admin invite to first login flow
- password reset flow
- member loads news feed and filters by ticker and sentiment
- unauthorized access to admin pages is blocked

## 14. Delivery Plan and Milestones

Week 1:

- Supabase project bootstrap
- auth and RBAC scaffolding
- app shell and navigation

Week 2:

- member directory read API and UI
- admin invite and role management flows
- audit logging baseline

Week 3:

- news ingestion worker
- normalized schema and dedupe
- news API filters and search

Week 4:

- news UI polish and performance pass
- e2e coverage and release checklist
- production readiness review

## 15. Implementation Backlog

Backlog format:

- Priority: P0 (must-have), P1 (important), P2 (nice-to-have)
- Type: Epic, Story, Task
- Estimate: S (0.5-1 day), M (1-3 days), L (3-5 days)

### 15.1 Epic A: Platform Foundation and Access

- A1 | P0 | Story | M
  - Implement Supabase Auth session handling in app shell and API handlers.
  - Acceptance: authenticated routes require valid session; session is available server-side.
- A2 | P0 | Story | M
  - Implement role policy module with MEMBER, OFFICER, ADMIN checks.
  - Acceptance: route middleware and API handlers use same policy map.
- A3 | P0 | Story | S
  - Add role badge and role-aware navigation visibility.
  - Acceptance: nav options render correctly for each role in manual and e2e tests.
- A4 | P0 | Task | S
  - Add unauthorized fallback page and redirect handling.
  - Acceptance: blocked routes redirect safely without leaking data.

### 15.2 Epic B: Member Administration Baseline

- B1 | P0 | Story | M
  - Build member directory API with pagination and role-filter query support.
  - Acceptance: MEMBER+ can query directory with stable pagination.
- B2 | P0 | Story | M
  - Build member directory UI table with search and active status indicator.
  - Acceptance: search and paging work against live API.
- B3 | P0 | Story | M
  - Implement admin invite flow: create invite, send email link, accept invite.
  - Acceptance: invited user can create password and sign in.
- B4 | P0 | Story | S
  - Implement admin role update endpoint and UI control.
  - Acceptance: role changes propagate to auth claims and policy checks.
- B5 | P1 | Task | S
  - Add admin activity entries for invite and role change actions.
  - Acceptance: audit log records actor, action, target, and timestamp.

### 15.3 Epic C: News Feed Baseline

- C1 | P0 | Story | L
  - Build news provider adapter interface and Yahoo implementation using yahoo-finance2.
  - Acceptance: worker can fetch normalized article payloads from Yahoo Finance.
- C2 | P0 | Story | M
  - Implement ingestion worker job with dedupe and ingestion run logging.
  - Acceptance: duplicate articles are skipped; run metrics are stored.
- C3 | P0 | Story | M
  - Implement sentiment tagging hook and persistence model.
  - Acceptance: each stored article has sentiment label and score.
- C4 | P0 | Story | M
  - Build GET /news endpoint with ticker, sentiment, date, and text filters.
  - Acceptance: API supports combined filters with deterministic sorting.
- C5 | P0 | Story | M
  - Build News UI with cards, filters, empty/loading states, and pagination.
  - Acceptance: all controls map to API query params and update URL state.
- C6 | P1 | Task | S
  - Add freshness indicator from latest successful ingestion run.
  - Acceptance: UI shows "last updated" time from ingestion metadata.
- C7 | P1 | Task | S
  - Add baseline endpoints for earnings and SEC filings with graceful empty state.
  - Acceptance: endpoints return valid envelope even when data is unavailable.

- C8 | P1 | Task | S
  - Add Yahoo provider health check and fallback behavior when upstream data is unavailable.
  - Acceptance: ingestion failures are surfaced in run logs and do not break API responses.

### 15.4 Epic D: Security, Logging, and Reliability

- D1 | P0 | Story | M
  - Implement RLS policies for app tables and service-role-safe access paths.
  - Acceptance: direct table reads/writes respect role and ownership constraints.
- D2 | P0 | Story | S
  - Implement password reset and invite token hashing with expiration checks.
  - Acceptance: expired tokens are rejected and logged.
- D3 | P0 | Task | S
  - Add API rate limits for login and reset routes.
  - Acceptance: repeated requests are throttled with standard error shape.
- D4 | P1 | Task | S
  - Add structured request logging and correlation IDs for web and worker.
  - Acceptance: logs include request id, actor id (if present), and route/job metadata.
- D5 | P1 | Task | S
  - Add dead-letter queue handling and retry policy visibility dashboard.
  - Acceptance: failed jobs after max retries are inspectable and re-runnable.

### 15.5 Epic E: Testing and Release Readiness

- E1 | P0 | Story | M
  - Unit tests for role policy evaluator and article normalization utilities.
  - Acceptance: critical helpers meet minimum coverage threshold.
- E2 | P0 | Story | M
  - Integration tests for auth, invite lifecycle, role updates, and /news filters.
  - Acceptance: endpoints enforce permissions and return expected schema.
- E3 | P0 | Story | M
  - E2E tests for invite-to-login, password reset, news filtering, and admin guardrails.
  - Acceptance: CI passes complete Phase 1 smoke suite.
- E4 | P1 | Task | S
  - Publish runbook and deployment checklist for Phase 1 cutover.
  - Acceptance: operational docs are reviewed and linked in repo.

### 15.6 Suggested Sprint Allocation

- Sprint 1:
  - A1, A2, A3, A4, D2
- Sprint 2:
  - B1, B2, B3, B4, D1
- Sprint 3:
  - C1, C2, C4, C5
- Sprint 4:
  - C3, C6, C7, C8, D3, D4, D5, E1, E2, E3, E4

## 16. Acceptance Checklist

Phase 1 is accepted when all are true:

- Auth and RBAC are fully operational across routes and APIs.
- Invite and password reset flows complete successfully in staging.
- Member directory is available to MEMBER and above.
- News feed ingest/search/filter path is production ready.
- Security controls and audit logging are enabled for all sensitive actions.
- Test suite for Phase 1 critical flows passes in CI.

## 17. Phase 1 Exit Artifacts

Deliverables:

- deployed Phase 1 application build
- migration scripts and schema docs
- API reference for implemented endpoints
- runbook for worker jobs and failure handling
- admin onboarding guide for invites and role operations
