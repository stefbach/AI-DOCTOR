# 🤖 n8n Workflows — AI-DOCTOR RAG System

This directory contains the n8n workflow definitions for **continuous ingestion**
of medical guidelines and drug safety alerts.

## 📦 Contents

### Phase 1 (5 priority sources, deploy first)

| File | Source | Frequency | Webhook target |
|------|--------|-----------|----------------|
| `01-fda-safety-alerts.json` | FDA RSS | hourly | `/api/webhook/n8n/safety-alert` |
| `02-who-guidelines.json` | WHO RSS | weekly | `/api/webhook/n8n/rag-ingest` |
| `03-has-guidelines.json` | HAS RSS | daily | `/api/webhook/n8n/rag-ingest` |
| `04-cdc-guidelines.json` | CDC RSS | daily | `/api/webhook/n8n/rag-ingest` |
| `05-nice-guidelines.json` | NICE RSS | daily | `/api/webhook/n8n/rag-ingest` |

### Phase 2 (10 additional sources)

To be added after Phase 1 is validated in production. Same architecture, just
duplicate the appropriate template (RSS or HTML scraping) and adjust the URL.

### Master agents

| File | Role | Frequency |
|------|------|-----------|
| `master-01-validator-notifier.json` | Email reminders for pending guidelines | hourly |
| `master-02-failed-retry.json` | Retry failed documents | every 6h |
| `master-03-health-check.json` | Source freshness check | daily |

## 🚀 Import procedure

### 1. Set up n8n credentials (one-time)

In n8n UI → **Credentials** → **New**:

#### a) OpenAI API
- Type: `OpenAI API`
- Name: `OpenAI API Production`
- API Key: `<your OPENAI_API_KEY>`

#### b) AI-DOCTOR Webhook
- Type: `Header Auth`
- Name: `AI-DOCTOR Webhook`
- Header name: `X-Webhook-Secret`
- Header value: `<your N8N_WEBHOOK_SECRET>` (must match Vercel env)

#### c) Resend (optional, for notifications)
- Type: `Header Auth`
- Name: `Resend Notifications`
- Header name: `Authorization`
- Header value: `Bearer <your RESEND_API_KEY>`

### 2. Set environment variables in n8n

In n8n UI → **Settings** → **Environment Variables**:

```
VERCEL_BASE_URL = https://your-app.vercel.app
ADMIN_EMAIL = medical-admin@your-domain.com
RESEND_FROM = noreply@your-domain.com
```

### 3. Import workflows one by one

For each `.json` file:

1. n8n UI → **Workflows** → **Import from File**
2. Select the JSON file
3. **Review the workflow** — verify:
   - Webhook URL points to your Vercel deployment
   - Credentials are linked correctly
   - Schedule trigger is correct
4. Click **Save**
5. Toggle **Active** in the top-right corner

### 4. Test each workflow

Click **Execute Workflow** (manual trigger) to test before activation.
Verify in Supabase that data is being inserted correctly.

## 🔑 Key variables used in all workflows

| Variable | Source | Purpose |
|----------|--------|---------|
| `{{ $env.VERCEL_BASE_URL }}` | n8n env | Base URL of Vercel deployment |
| `{{ $env.ADMIN_EMAIL }}` | n8n env | Notifications recipient |
| Credential `AI-DOCTOR Webhook` | n8n credential | Auth header for Vercel webhooks |

## ⚠️ Operational notes

### Rate limits

The OpenAI Embeddings API has a rate limit of ~3000 requests/min on most accounts.
The bulk-seed scripts and n8n workflows respect this with batched calls (100/batch).
If you hit rate limits, reduce `--max` in bulk-seed or add a `Wait` node in n8n
between embedding generations.

### Failed documents

Failed ingestions are logged in `guideline_failed_documents` (Supabase). The
master-02 workflow retries them every 6h with exponential backoff. After 5
failed retries, manual intervention is required.

### Cost monitoring

Each n8n workflow logs its OpenAI token usage to `guideline_ingestion_runs`.
Total monthly cost is tracked in the `agents_dashboard` view (see migration SQL).

Expected cost: **$5–15/month** for continuous ingestion of all 15 sources.

## 🔄 Update procedure when a new source is added

1. Duplicate `02-who-guidelines.json` (template for RSS sources) or
   `03-has-guidelines.json` (template for non-English RSS).
2. Edit:
   - Workflow name
   - Schedule trigger cron expression
   - RSS URL in the "RSS Read" node
   - Source code in the "Set Source Metadata" node
3. Import in n8n, test, activate.
4. Add an entry in `scripts/bulk-seed/lib/sources-config.ts` if desired.

## 🆘 Troubleshooting

| Symptom | Fix |
|---------|-----|
| Webhook returns 401 | Check `X-Webhook-Secret` credential matches `N8N_WEBHOOK_SECRET` in Vercel |
| Webhook returns 400 | Payload schema mismatch — check zod errors in webhook response |
| OpenAI 429 (rate limit) | Add `Wait` node, reduce batch sizes |
| Empty RSS response | Source feed may be down — test manually with `curl <feed-url>` |
| Duplicate inserts | Check that hash dedup is working (should be silent — return `unchanged`) |
