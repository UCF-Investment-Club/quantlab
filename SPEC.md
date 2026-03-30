# ICQ Labs Implementation Specification

Version: 1.0
Date: 2026-03-29

> This specification translates the ICQ Labs requirements into an implementable technical plan for a production-ready internal web platform for Investment Club UCF. It defines:
>
> - Product scope and feature requirements
> - System architecture and technology choices
> - Data model and role-based permissions
> - API contracts and integration boundaries
> - Implementation roadmap with milestones
> - Quality, security, and operational standards

---

## Product Scope

ICQ Labs is an authenticated, role-aware club platform with three user roles:

- Member: consume and interact with content
- Officer: submit/edit research, content, and model inputs
- Admin: full platform control, portfolio operations, user management, settings, and audit

### Core product domains

- Authentication and access control
- Portfolio and watchlist management
- News and macro intelligence
- Research and valuation models
- Stock pitch workflow and voting
- Risk analytics and attribution
- Meetings, trade journal, and collaboration
- Member management and educational content
- Admin panel and platform governance
- Internal API and external data ingestion

### Out of Scope (Initial MVP)

- Automated brokerage execution.
- Public/anonymous access.
- Native mobile application.
- Advanced options analytics beyond Black-Scholes calculator unless explicitly prioritized.

### Definition of Done

The project is done when:

- All MVP requirements from sections 1-15 are implemented and validated.
- Production environment is deployed with monitoring and backup policies.
- Admin documentation and API documentation are complete.
- UAT with club officers/admin is completed and signed off.

Each requirement section is accepted when:

- Feature is implemented in UI and API as defined.
- Permissions match matrix exactly.
- Data source mapping is operational with fallback handling.
- Tests exist for happy path and permission-denied path.
- Admin audit events are generated for all critical actions.

---

## Success Criteria

### Functional

- All section requirements from the source document are implemented or explicitly marked as future scope.
- Role permissions are enforced on all UI actions and API endpoints.
- Portfolio, watchlist, news, and macro data are refreshed on schedule and displayed with source attribution.
- Stock pitch workflow supports status transitions, voting windows, and archival outcomes.
- Admin can perform all admin-only actions without direct database access.

### Non-functional

- P95 server response time under 500ms for authenticated read endpoints.
- Dashboard first meaningful paint under 2.5s on broadband desktop.
- Availability target 99.5% monthly.
- Audit trail for all sensitive actions (login, role change, trade, content moderation, settings updates).

---

## MVP Delivery Plan

### Phase 1: Foundation

- Auth, RBAC, base layout, navigation, user/session/audit schema.
- Member directory (read-only), invite flow, password reset.
- News feed baseline (ticker-correlated ingestion, source attribution, and search/filter).

### Phase 2: Core Investment Workflows

- Portfolio and watchlist workflows (performance, benchmarking, alerts).
- News and macro intelligence feed with search and filters.
- Pitch workflow with voting and archive.

### Phase 3: Quant and Collaboration

- DCF/regression/comps model suite.
- Risk and analytics module.
- Meetings, action items, announcements, trade journal.
- Educational resources library.

### Phase 4: Governance and Expansion

- Full admin panel and exports.
- Advanced macro analytics and economic event tooling.
- Notebook API docs and webhook integrations.
- Optional options analytics module.

---

## Roles and Authorization Model

## Role Definitions

- MEMBER
- OFFICER (inherits MEMBER)
- ADMIN (inherits OFFICER)

## Authorization Enforcement

- Use centralized policy layer for action checks (server-side source of truth).
- Enforce role checks in:
  - Route middleware (page-level gating)
  - API handlers (operation-level gating)
  - Service layer mutations (defense in depth)

## Permission Matrix

| **Feature / Action**           | **Section**                 | **Member** | **Officer** | **Admin** |
| ------------------------------ | --------------------------- | ---------- | ----------- | --------- |
| View portfolio holdings        | Portfolio and Watchlist     | **X**      | **X**       | **X**     |
| View performance metrics       | Portfolio and Watchlist     | **X**      | **X**       | **X**     |
| Add/remove holdings            | Portfolio and Watchlist     | -          | -           | **X**     |
| Execute trades                 | Portfolio and Watchlist     | -          | -           | **X**     |
| Manage personal watchlist      | Portfolio and Watchlist     | **X**      | **X**       | **X**     |
| Manage club watchlist          | Portfolio and Watchlist     | -          | **X**       | **X**     |
| Create/manage price alerts     | Portfolio and Watchlist     | **X**      | **X**       | **X**     |
| Read news feed                 | News and Macro Intelligence | **X**      | **X**       | **X**     |
| Filter/search news             | News and Macro Intelligence | **X**      | **X**       | **X**     |
| View macro indicators/calendar | News and Macro Intelligence | **X**      | **X**       | **X**     |
| View research reports          | Research Models             | **X**      | **X**       | **X**     |
| Submit research reports        | Research Models             | -          | **X**       | **X**     |
| Edit/delete any research       | Research Models             | -          | -           | **X**     |
| Run DCF model                  | Research Models             | **X**      | **X**       | **X**     |
| Run regression analysis        | Research Models             | **X**      | **X**       | **X**     |
| Modify model parameters        | Research Models             | -          | **X**       | **X**     |
| Submit stock pitches           | Pitches                     | -          | **X**       | **X**     |
| Vote on stock pitches          | Pitches                     | **X**      | **X**       | **X**     |
| View meeting notes             | Meetings                    | **X**      | **X**       | **X**     |
| Create meeting notes           | Meetings                    | -          | **X**       | **X**     |
| View member directory          | Members                     | **X**      | **X**       | **X**     |
| Manage members/roles           | Members                     | -          | -           | **X**     |
| View audit log                 | Admin Panel                 | -          | -           | **X**     |
| Configure platform             | Admin Panel                 | -          | -           | **X**     |

---

## System Architecture

## High-Level Architecture

- Frontend: Next.js App Router UI with server components + client components for rich interactivity.
- Backend: Next.js API route handlers (BFF style) with service modules.
- Data platform: Supabase (PostgreSQL, Auth, Storage, Realtime, Row Level Security).
- Jobs and caching: Redis-backed queue/cache for ingestion, notifications, and scheduled workloads.
- Search: PostgreSQL full-text on Supabase.

## Runtime Separation

- Web app process for UI and API.
- Worker process for scheduled ingestion (market/news/economic), sentiment tagging, alerts, and cleanup.

## Observability

- Structured logs with request IDs.
- Metrics (latency, error rate, job success) via OpenTelemetry-compatible export.
- Alerting for ingestion failures, API quota issues, and stale market data.

---

## Tech Stack

- Framework: Next.js (current project baseline)
- Language: TypeScript strict mode
- Styling/UI: Tailwind CSS + Shadcn + component primitives
- Auth: Supabase Auth (email/password + role claims), with admin 2FA enforcement in app policy
- 2FA for admin: TOTP (RFC 6238)
- Data access: Supabase client + typed SQL/migrations
- Validation: Zod schemas for API and forms
- Charts: ECharts or Recharts
- Rich text: TipTap or Lexical
- Background jobs: BullMQ or equivalent Redis queue
- Email: Resend/SendGrid for invites, resets, and alerts
- PDF generation: server-side renderer (Playwright or react-pdf)

---

## 7. Information Architecture and Navigation

Top-level authenticated sections:

- Portfolio and Watchlist
- News and Macro
- Research Models
- Pitches
- Risk and Analytics
- Meetings
- Members
- Education
- Admin (admin only)

Global UI requirements:

- Role indicator shown in nav at all times.
- Contextual action buttons hidden or disabled based on policy.
- Audit-sensitive actions require confirmation modal.

---

## 8. Data Model (Core Entities)

## 8.1 Identity and Access

- users: id, name, email, password_hash, role, status, last_login_at, mfa_enabled
- invites: id, email, token_hash, role, expires_at, accepted_at, created_by
- sessions: id, user_id, issued_at, expires_at, ip, user_agent
- password_reset_tokens
- audit_logs: actor_id, action, target_type, target_id, metadata, created_at

## 8.2 Portfolio and Watchlist Domain

- holdings: ticker, company_name, sector, shares, avg_cost, opened_at, status
- trades: holding_id, side, shares, price, executed_at, executed_by, notes
- cash_ledger: amount, reason, effective_at
- benchmark_snapshots: benchmark, value, date
- price_snapshots: ticker, timestamp, open, high, low, close, volume
- watchlist_items: owner_type (user|club), owner_id, ticker
- price_alerts: user_id, ticker, direction, threshold, channel, triggered_at

## 8.3 News, Macro, and Filings

- news_articles: external_id, ticker_tags, title, summary, source, url, published_at
- news_sentiment: article_id, label, score, model_version
- macro_events: event_type, title, scheduled_at, consensus, actual, source
- macro_series_points: series_key, observed_at, value, source
- sec_filings: ticker, form_type, accession_no, filed_at, url
- earnings_events: ticker, event_time, estimate, actual

## 8.4 Research and Models

- research_reports: author_id, ticker, title, body, status, created_at
- model_scenarios: ticker, model_type, name, inputs_json, outputs_json, saved_by
- regression_runs: ticker, factors_json, period, result_json
- comps_sets: ticker, peers_json, multiples_json, implied_values_json

## 8.5 Pitch Workflow

- pitches: ticker, thesis_html, target_price, horizon, risks, catalysts, status, deadline_at
- pitch_assets: pitch_id, file_key, file_type
- pitch_votes: pitch_id, voter_id, vote, comment
- pitch_comments: pitch_id, user_id, body
- pitch_outcomes: pitch_id, added_to_portfolio, post_return_1m, post_return_3m, post_return_6m

## 8.6 Meetings and Collaboration

- meeting_notes: title, meeting_date, attendees_json, agenda_html, minutes_html
- action_items: note_id, assignee_id, due_date, status
- announcements: title, body, pinned_until, created_by
- trade_journal_entries: trade_id, thesis, entry_criteria, exit_criteria, review

## 8.7 Education and Resources

- tutorials, glossary_terms, resource_links, video_entries

## 8.8 Platform Settings

- settings: key, value_json, updated_by
- api_keys: provider, encrypted_key, status, last_rotated_at

---

## API Design

### Principles

- REST JSON endpoints under /api/v1.
- All endpoints authenticated unless explicitly public (none required currently).
- Standard response envelope: data, error, meta.
- Role policy middleware on all mutation routes.

### Representative Endpoints

Auth and identity:

- POST /api/v1/auth/login
- POST /api/v1/auth/logout
- POST /api/v1/auth/reset/request
- POST /api/v1/auth/reset/confirm
- POST /api/v1/auth/mfa/verify

Portfolio and watchlist:

- GET /api/v1/portfolio/summary
- GET /api/v1/portfolio/holdings
- GET /api/v1/portfolio/performance
- GET /api/v1/portfolio/trades
- POST /api/v1/portfolio/positions (admin)
- PATCH /api/v1/portfolio/positions/:id (admin)
- POST /api/v1/portfolio/trades (admin)
- GET /api/v1/watchlist/me
- POST /api/v1/watchlist/me
- DELETE /api/v1/watchlist/me/:ticker
- GET /api/v1/watchlist/club
- POST /api/v1/watchlist/club (officer+)
- POST /api/v1/alerts

News and macro:

- GET /api/v1/news?tickers=&q=&sentiment=&from=&to=
- GET /api/v1/news/earnings
- GET /api/v1/news/sec-filings
- GET /api/v1/macro/overview
- GET /api/v1/macro/calendar
- GET /api/v1/macro/series?keys=

Models:

- POST /api/v1/models/dcf/run
- POST /api/v1/models/regression/run
- POST /api/v1/models/comps/run
- POST /api/v1/models/scenarios (officer+)
- GET /api/v1/models/scenarios?ticker=

Pitches:

- GET /api/v1/pitches
- POST /api/v1/pitches (officer+)
- PATCH /api/v1/pitches/:id/status (admin)
- POST /api/v1/pitches/:id/votes (member+)
- POST /api/v1/pitches/:id/comments

Risk and analytics:

- GET /api/v1/risk/correlation
- GET /api/v1/risk/var
- GET /api/v1/risk/beta
- GET /api/v1/risk/attribution

Meetings:

- GET /api/v1/meetings
- POST /api/v1/meetings (officer+)
- GET /api/v1/meetings/:id/action-items

Members and admin:

- GET /api/v1/members
- PATCH /api/v1/members/:id/role (admin)
- POST /api/v1/members/invite (admin)
- PATCH /api/v1/members/:id/deactivate (admin)
- GET /api/v1/admin/audit (admin)
- GET /api/v1/admin/export?type=portfolio|trades|activity (admin)
- POST /api/v1/admin/api-keys (admin)

Notebook access and exports:

- GET /api/v1/notebook/portfolio
- GET /api/v1/reports/pdf?type=portfolio|research|pitch&id=

---

## External Data Integration

### Provider Abstraction

Create provider adapters with a unified interface so providers can be switched without UI or service changes.

Interfaces:

- MarketDataProvider
- FinancialsProvider
- NewsProvider
- EconomicDataProvider
- FilingsProvider
- OptionsProvider (future)

### Ingestion and Refresh Cadence

- Intraday prices: every 1-5 minutes during market hours.
- EOD snapshots: once daily after close.
- News: poll every 5-10 minutes; de-duplicate by external_id/url hash.
- Economic series: refresh daily or on release.
- SEC filings: poll every 15-30 minutes for held tickers.

### Data Quality Rules

- Normalize ticker symbols.
- Tag stale data and display freshness timestamp.
- Fail gracefully with cached fallback if providers are unavailable.

---

## Feature Implementation Details

### Authentication and Access

- Email/password login for all users.
- Admin 2FA required.
- Admin-created invitations and temporary credentials.
- Password reset via signed email token.
- Session timeout configurable in settings.

### Portfolio and Watchlist

- Holdings table with sorting and filtering.
- Sector allocation donut.
- Portfolio total cards and daily change.
- Position detail cards with mini chart and fundamentals.
- Performance chart with benchmark overlays and date ranges.
- Trade history log.
- Admin controls: add/close/adjust positions and cash updates.
- Personal watchlist per user.
- Club watchlist managed by officer/admin.
- Price alerts via email/in-app notifications.
- Quick stats and one-click handoff to pitch form.

### News and Macro Intelligence

- Holdings-correlated feed by ticker and company aliases.
- Sentiment labels (bullish/neutral/bearish).
- Full-text search and ticker tags.
- Earnings calendar and SEC alerts.
- Macro news and economic calendar in the same intelligence module.
- Rates, inflation, employment, index tape, and sector heatmap views.

### Research Models

- DCF: configurable assumptions, WACC, terminal methods, sensitivity matrix, fair-value output, scenario save/load.
- Regression: single and multi-factor regressions, statistical output, diagnostics plots.
- Comps: peer set builder, multiples table, benchmark stats, implied valuation.
- Technical: chart overlays, indicators, drawing tools, tunable settings.
- Options module: gated as future scope (feature flag).

### Stock Pitch System

- Structured submission form and deck upload.
- Voting choices: Buy/Hold/Pass with optional comments.
- Status workflow with admin-controlled transitions.
- Deadline timer and auto-transition job.
- Historical archive with outcome tracking.
- Pitch discussion thread.

### Risk and Analytics

- Correlation heatmap.
- VaR (historical and parametric) at 95/99.
- Beta exposure and per-holding contribution.
- Sector concentration warnings with configurable threshold.
- Efficient frontier with suggested allocations.
- Drawdown and attribution analysis.

### Meetings and Collaboration

- Rich text meeting notes and archives.
- Action item extraction and tracking.
- Trade journal entries linked to trades.
- Dashboard announcements.

### Member Management

- Member directory (visible to all).
- Admin role changes, invites, and deactivation.
- Admin activity insights per member.
- Optional opt-in leaderboard for pick performance.

### Educational Resources

- Tutorials, statement guide, glossary.
- Resource links and video archive.
- Officer/admin-managed content lifecycle.

### Admin Panel

- Platform health overview.
- Full audit log.
- Content moderation actions.
- Settings management.
- Data export as CSV/PDF.
- API key management with encryption at rest.

---

### Security and Compliance

- Enforce HTTPS and secure cookies.
- Password hashing via Argon2id or bcrypt with strong parameters.
- Secrets stored in environment manager, never in source control.
- API key encryption using application KMS key.
- RBAC checks on every write endpoint.
- Audit logs immutable to non-admin users.
- File upload validation (type, size, malware scan hook).
- Basic rate limiting for auth and voting endpoints.

---

### Performance and Scalability

- Cache read-heavy aggregates (portfolio summary, macro tiles).
- Use incremental revalidation for semi-static pages.
- Pagination and query limits for feeds/logs.
- Precompute heavy analytics on schedule when possible.
- Async jobs for notifications, imports, and report generation.

---

## Testing Strategy

Test layers:

- Unit tests for model calculators, permissions, and utility transforms.
- Integration tests for API handlers with role variations.
- End-to-end tests for key workflows:
  - Login and role-gated navigation
  - Admin trade execution and dashboard update
  - Pitch submission, voting, and status transition
  - Watchlist alert trigger
  - Meeting note creation and action item tracking

Quality gates:

- No critical or high vulnerabilities in dependency scan.
- All required migrations applied cleanly.
- CI checks: lint, typecheck, unit, integration, smoke e2e.

---

## Open Decisions and Assumptions

Assumptions:

- Single primary admin account is maintained by club leadership.
- Data provider selection may vary by budget and API limits.
- Near real-time means minute-level refresh, not tick-level.

Open decisions to finalize before full build:

- Final provider contracts (market/news/economic/options).
- Supabase project topology (environments, region, and service tier).
- File retention policy for Supabase Storage buckets.
- Notification channels (email only vs email + in-app + Discord/Slack).
- Redis provider choice for queue/caching workloads alongside Supabase.
