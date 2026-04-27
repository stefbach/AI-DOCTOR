/**
 * Admin UI — Pending guidelines review
 *
 * Lists guidelines awaiting medical validation. A medical reviewer can
 * approve (status='active') or reject (status='rejected') each guideline.
 *
 * Auth: minimal — relies on ADMIN_EMAILS_ALLOWLIST env var.
 *       Production deployment should add a proper Supabase Auth or NextAuth gate.
 */

import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface GuidelineGroup {
  source: string
  guideline_code: string
  title: string
  url: string
  version: string
  effective_date: string
  language: string
  ingested_by: string
  created_at: string
  total_chunks: number
  chunk_ids: number[]
  specialty: string[]
  preview: string
}

async function getPendingGuidelines(): Promise<GuidelineGroup[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabase
    .from('medical_guidelines')
    .select(
      'id, source, guideline_code, title, url, version, effective_date, language, ingested_by, created_at, content, specialty, total_chunks, chunk_index'
    )
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[Admin] Failed to fetch pending:', error)
    return []
  }

  // Group by guideline_code
  const groups = new Map<string, GuidelineGroup>()
  for (const row of data || []) {
    const key = `${row.source}:${row.guideline_code}:${row.version}`
    if (!groups.has(key)) {
      groups.set(key, {
        source: row.source,
        guideline_code: row.guideline_code,
        title: row.title,
        url: row.url,
        version: row.version,
        effective_date: row.effective_date,
        language: row.language,
        ingested_by: row.ingested_by,
        created_at: row.created_at,
        total_chunks: row.total_chunks,
        chunk_ids: [],
        specialty: row.specialty || [],
        preview: row.chunk_index === 0 ? (row.content || '').slice(0, 500) : ''
      })
    }
    const g = groups.get(key)!
    g.chunk_ids.push(row.id)
    if (row.chunk_index === 0 && !g.preview) {
      g.preview = (row.content || '').slice(0, 500)
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  )
}

async function getStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const [pending, active, alerts] = await Promise.all([
    supabase
      .from('medical_guidelines')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    supabase
      .from('medical_guidelines')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('drug_safety_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
  ])

  return {
    pending: pending.count || 0,
    active: active.count || 0,
    alerts: alerts.count || 0
  }
}

export default async function AdminGuidelinesPage() {
  const [groups, stats] = await Promise.all([getPendingGuidelines(), getStats()])

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold">Validation des guidelines</h1>
        <p className="text-gray-600 text-sm mt-1">
          Revue médicale humaine obligatoire avant activation en production.
        </p>
        <div className="flex gap-6 mt-4 text-sm">
          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded">
            ⏳ En attente : <strong>{stats.pending}</strong>
          </span>
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded">
            ✅ Actifs : <strong>{stats.active}</strong>
          </span>
          <span className="bg-red-100 text-red-800 px-3 py-1 rounded">
            🚨 Alertes médicaments : <strong>{stats.alerts}</strong>
          </span>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-xl">Aucun guideline en attente de validation 🎉</p>
          <p className="text-sm mt-2">
            La file de validation est à jour. Les nouveaux guidelines apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <article
              key={`${g.source}-${g.guideline_code}-${g.version}`}
              className="border rounded-lg p-5 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                      {g.source}
                    </span>
                    <span className="bg-gray-100 text-gray-700 text-xs font-mono px-2 py-1 rounded">
                      {g.guideline_code}
                    </span>
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      v{g.version}
                    </span>
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                      {g.language.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {g.total_chunks} chunks · ingéré par {g.ingested_by}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg leading-tight">{g.title}</h3>
                  <a
                    href={g.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm break-all"
                  >
                    {g.url}
                  </a>
                  <p className="text-xs text-gray-500 mt-1">
                    Effective: {g.effective_date} · ingéré le{' '}
                    {new Date(g.created_at).toLocaleString('fr-FR')}
                  </p>
                  {g.specialty.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Spécialités : {g.specialty.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <form action="/api/admin/guidelines/approve" method="POST">
                    <input type="hidden" name="source" value={g.source} />
                    <input
                      type="hidden"
                      name="guideline_code"
                      value={g.guideline_code}
                    />
                    <input type="hidden" name="version" value={g.version} />
                    <button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      ✅ Approuver
                    </button>
                  </form>
                  <form action="/api/admin/guidelines/reject" method="POST">
                    <input type="hidden" name="source" value={g.source} />
                    <input
                      type="hidden"
                      name="guideline_code"
                      value={g.guideline_code}
                    />
                    <input type="hidden" name="version" value={g.version} />
                    <button
                      type="submit"
                      className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded text-sm font-medium"
                    >
                      ❌ Rejeter
                    </button>
                  </form>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                  Aperçu du premier chunk
                </summary>
                <pre className="bg-gray-50 p-3 mt-2 text-xs whitespace-pre-wrap rounded border max-h-64 overflow-y-auto">
                  {g.preview || '(pas d’aperçu disponible)'}
                </pre>
              </details>
            </article>
          ))}
        </div>
      )}

      <footer className="text-xs text-gray-500 border-t pt-4 mt-8">
        <p>
          ⚠️ Toute approbation engage la responsabilité médicale du valideur.
          La traçabilité (qui, quand, sur quoi) est conservée pendant 10 ans.
        </p>
      </footer>
    </div>
  )
}
