# 🚀 n8n Setup Guide — AI-DOCTOR RAG

This guide walks you through deploying n8n for continuous ingestion of medical
guidelines, after the bulk-seed (Phase 1) has been completed.

---

## 📋 Prerequisites

✅ Phase 1 completed:
- Supabase migration applied (`npm run rag:migrate`)
- Bulk-seed of 5 priority sources done (`npm run rag:seed`)
- At least 5 guidelines validated via `/admin/guidelines`

✅ Vercel deployment with these env vars set:
- `N8N_WEBHOOK_SECRET` (generated, kept secret)
- `NEXT_PUBLIC_SITE_URL` (your Vercel URL)
- All other RAG env vars (see `.env.example`)

✅ Webhook endpoints reachable from internet:
- `POST <vercel-url>/api/webhook/n8n/rag-ingest`
- `POST <vercel-url>/api/webhook/n8n/safety-alert`

---

## 🏗️ Hosting options

### Option A — n8n Cloud (recommended for fastest start)

**Pros**: zero ops, SSL included, automatic backups
**Cons**: ~20€/month starter plan

1. Sign up at https://n8n.cloud
2. Create instance: `ai-doctor-production`
3. Note your URL: `https://<your-instance>.app.n8n.cloud`

### Option B — Self-hosted on Hetzner (recommended for production scale)

**Pros**: 5€/month, unlimited workflows, full control
**Cons**: requires DevOps maintenance

```bash
# Provision Hetzner CX21 (Ubuntu 22.04) — 5€/month
ssh root@<server-ip>

# Install Docker
curl -fsSL https://get.docker.com | sh

# Set up n8n
mkdir -p /opt/n8n && cd /opt/n8n

cat > docker-compose.yml <<'EOF'
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:5678:5678"
    environment:
      - N8N_HOST=n8n.your-domain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.your-domain.com/
      - GENERIC_TIMEZONE=Europe/Paris
      - N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=<strong-password>
    volumes:
      - ./data:/home/node/.n8n
EOF

# Reverse proxy with Caddy for SSL
apt install -y caddy
cat > /etc/caddy/Caddyfile <<EOF
n8n.your-domain.com {
  reverse_proxy localhost:5678
}
EOF
systemctl restart caddy

# Launch n8n
docker compose up -d
```

---

## 🔑 Initial credentials setup

In n8n UI → **Credentials** → **Create New**:

### 1. OpenAI API Production
```
Type:    OpenAI
Name:    OpenAI API Production
API Key: sk-proj-xxxxxxxxxxxx
```

### 2. AI-DOCTOR Webhook
```
Type:         Header Auth
Name:         AI-DOCTOR Webhook
Header Name:  X-Webhook-Secret
Header Value: <your N8N_WEBHOOK_SECRET — same value as in Vercel>
```

### 3. Resend (for notifications)
```
Type:   SMTP
Name:   Resend Notifications
Host:   smtp.resend.com
Port:   465
User:   resend
Pass:   re_xxxxxxxxxxxx
```

---

## 🌍 Environment variables (n8n Settings → Env Variables)

```
VERCEL_BASE_URL = https://your-app.vercel.app
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <your service role key>
ADMIN_EMAIL = medical-admin@your-domain.com
RESEND_FROM = noreply@your-domain.com
```

---

## 📥 Import workflows

### Step 1 — Phase 1 sources (5 workflows)

Import in this order, **one at a time**:

1. **`01-fda-safety-alerts.json`** — FDA RSS → drug_safety_alerts
2. **`02-who-guidelines.json`** — Master template (canonical full pipeline)
3. **`03-has-guidelines.json`** — French source (override values from 02)
4. **`04-cdc-guidelines.json`** — CDC daily (override from 02)
5. **`05-nice-guidelines.json`** — NICE with feed-failure handling

For workflows 03, 04, 05: they are **partial templates** showing only the
override differences. To complete them:

1. Import `02-who-guidelines.json` first (full canonical workflow)
2. Right-click → **Duplicate**
3. Apply the override values from the partial template's `_overrides` section
4. Save and rename to match Agent number

### Step 2 — Master agents (3 workflows)

6. **`master-01-validator-notifier.json`** — Hourly digest of pending guidelines
7. **`master-02-failed-retry.json`** — 6h retry of failed documents
8. **`master-03-health-check.json`** — Daily source health monitoring

---

## ✅ Test procedure

For each workflow, before activating:

### A. Manual execution test

1. Open the workflow in n8n
2. Click **Execute Workflow** (top right)
3. Watch the execution flow node by node
4. Verify each node returns expected data

### B. Webhook delivery test

After `POST Vercel Webhook` step, verify in Supabase:

```sql
-- For guideline ingestion
SELECT source, guideline_code, status, created_at, ingested_by
FROM medical_guidelines
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- For drug safety alerts
SELECT source, drug_name, alert_type, created_at
FROM drug_safety_alerts
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

### C. End-to-end test

Trigger a fake consultation (with a known patient context), then:

```sql
-- Verify RAG trace was created
SELECT consultation_id, query_text, jsonb_array_length(guidelines_retrieved) as n_guidelines
FROM consultation_rag_trace
ORDER BY created_at DESC
LIMIT 1;
```

The result should show `n_guidelines >= 1` if any active guidelines match.

---

## 🔄 Activation order

1. ✅ Test all 8 workflows manually
2. ✅ Activate `01-fda-safety-alerts` — start collecting alerts immediately
3. ✅ Activate `master-03-health-check` — get visibility on source freshness
4. ✅ Activate `master-02-failed-retry` — auto-recover from transient failures
5. ✅ Activate `master-01-validator-notifier` — keep medical team informed
6. ✅ Activate `02-who-guidelines` — wait next Monday for first run
7. ✅ Activate `03-has-guidelines` — wait next 03:00 UTC
8. ✅ Activate `04-cdc-guidelines` — wait next 05:00 UTC
9. ✅ Activate `05-nice-guidelines` — wait next 03:00 UTC

After 1 week, review:
- Total new guidelines ingested per source
- Failure rate per source
- Validator workload (count of pending_review)
- Cost (OpenAI tokens consumed)

---

## 📊 Monitoring queries

### Daily dashboard

```sql
SELECT
  source_code,
  frequency_label,
  last_successful_run,
  consecutive_failures,
  access_status,
  EXTRACT(EPOCH FROM NOW() - last_successful_run) / 3600 AS hours_since_last
FROM guideline_sources
WHERE active = TRUE
ORDER BY hours_since_last DESC NULLS FIRST;
```

### Cost tracking (last 30 days)

```sql
SELECT
  source_code,
  COUNT(*) AS runs,
  SUM(items_new) AS new_guidelines,
  SUM(chunks_created) AS chunks,
  SUM(openai_tokens_used) AS tokens,
  ROUND(SUM(estimated_cost_usd)::numeric, 2) AS cost_usd
FROM guideline_ingestion_runs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY source_code
ORDER BY cost_usd DESC;
```

### Recent failures

```sql
SELECT source_code, document_url, error_type, error_message, retry_count
FROM guideline_failed_documents
WHERE resolved = FALSE
ORDER BY first_failed_at DESC
LIMIT 20;
```

---

## 🆘 Common troubleshooting

| Issue | Diagnostic | Fix |
|-------|-----------|-----|
| Webhook returns 401 | `X-Webhook-Secret` mismatch | Check credential value matches Vercel env exactly |
| Webhook returns 400 | Invalid payload schema | Check zod errors in webhook response, fix payload mapping |
| Workflow fails at "Fetch Full Page" | Source HTTP 403/timeout | Add User-Agent header, increase timeout to 60s |
| Embeddings node fails | OpenAI rate limit | Add Wait node (2s) before, or reduce batch size |
| Many false positives in metadata | Incorrect specialty/conditions | Refine the AI prompt in "AI Metadata Extraction" |
| Email not sent | Resend credential wrong | Test SMTP connection in Settings → Credentials |
| n8n out of memory | Workflow processes too many items | Lower batch limit in "Filter Items" or "Cap items" node |

---

## 🔄 Adding a 16th source later

1. Open `scripts/bulk-seed/lib/sources-config.ts`
2. Add new entry (copy structure of existing one)
3. Update Supabase `guideline_sources` table:
   ```sql
   INSERT INTO guideline_sources (source_code, source_name, ...) VALUES (...);
   ```
4. In n8n: duplicate `02-who-guidelines.json`, rename, change RSS URL
5. Test, activate
6. Done — no code changes needed in Vercel

---

## 📞 Support contact

- Repo: github.com/stefbach/ai-doctor
- Issues: github.com/stefbach/ai-doctor/issues
- Branch in dev: `claude/medical-assistant-transparency-dv5S9`
