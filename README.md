# UCF Investment Club - Quant Lab

Quant Lab is the authenticated, role-aware internal platform for ICQ Labs workflows.

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Configure environment variables.

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
CRON_SECRET="shared-secret-for-ingestion-trigger"
NEWS_DEFAULT_TICKERS="AAPL,MSFT,SPY"
```

3. Run the app.

```bash
npm run dev
```

Open http://localhost:3000.

## Database Migrations

Phase 1 schema and RLS policies are in [supabase/migrations/202603290001_phase1_foundation.sql](supabase/migrations/202603290001_phase1_foundation.sql).

Apply this migration through your Supabase migration workflow before testing APIs.

## Admin Features

### Manual News Ingestion

Admins can trigger news ingestion on-demand from the **News Feed** dashboard page. A "Run Ingestion" button is visible only to users with ADMIN role. Upon click, the button shows ingestion progress and displays the number of articles fetched and inserted.

### Hourly Auto-Ingestion (Production)

On Vercel deployments, news ingestion runs automatically every hour via Cron Job triggers. This is configured in [vercel.json](vercel.json) and uses the `CRON_SECRET` environment variable for authentication.

**Ingestion Endpoint Authentication:**

The `POST /api/v1/internal/news/ingest` endpoint accepts authorization via:

- **Header:** `x-cron-secret: <CRON_SECRET>` (for Vercel Cron and manual internal calls)
- **Header:** `Authorization: Bearer <CRON_SECRET>` (alternative Bearer token format)
- **Session Auth:** Authenticated users with ADMIN role (fallback if cron secret not provided)

To manually trigger ingestion in development or production with curl:

```bash
curl -X POST http://localhost:3000/api/v1/internal/news/ingest \
  -H "x-cron-secret: your-cron-secret-value"
```

or with Bearer token:

```bash
curl -X POST http://localhost:3000/api/v1/internal/news/ingest \
  -H "Authorization: Bearer your-cron-secret-value"
```

## Implemented API Surface (Current)

Authentication:

1. POST /api/v1/auth/login
2. POST /api/v1/auth/logout
3. POST /api/v1/auth/reset/request
4. POST /api/v1/auth/reset/confirm

Members/Admin:

1. GET /api/v1/members
2. POST /api/v1/members/invite
3. PATCH /api/v1/members/:id/role
4. GET /api/v1/members/invite/verify
5. POST /api/v1/members/invite/accept

News:

1. GET /api/v1/news
2. GET /api/v1/news/earnings
3. GET /api/v1/news/sec-filings
4. POST /api/v1/internal/news/ingest

## Quality Commands

```bash
npm run lint
npx tsc --noEmit
npm run test:unit
```

## Supabase CLI Commands

```bash
npm run supabase:init
npm run supabase:start
npm run supabase:reset
npm run supabase:push
npm run supabase:types
npm run supabase:types:linked
```

Notes:

1. Local Supabase requires Docker daemon access.
2. Remote push requires `supabase login` and `supabase link --project-ref <ref>` before `npm run supabase:push`.
