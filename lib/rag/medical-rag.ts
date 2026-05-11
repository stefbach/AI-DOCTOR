/**
 * Medical RAG (Retrieval-Augmented Generation) — Runtime
 *
 * Targets the TIBOK Supabase project (yyxmqositmmyyeyuryln) which holds
 * the validated guidelines pipeline (Phase 3).
 *
 * Pipeline:
 *   1. Generate embedding for the clinical query (OpenAI text-embedding-3-small)
 *   2. Call public.match_guidelines RPC on Supabase (cosine similarity)
 *   3. Format the chunks into a prompt-injection block (with [ref-N] tags)
 *   4. Return references metadata for citation display in reports
 *
 * Failsafe: any error (no embedding, RPC error, empty result) returns an
 * empty RAGContext — never blocks the diagnosis pipeline.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// ============================================================================
// Lazy singletons (Vercel build-safe, see FIX-1 pattern)
// ============================================================================
let _supabase: SupabaseClient | null = null
let _openai: OpenAI | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    }
    _supabase = createClient(url, key, { auth: { persistSession: false } })
  }
  return _supabase
}

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set')
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

// ============================================================================
// Types
// ============================================================================

/**
 * Specialty codes ingested into the TIBOK RAG corpus. Source of truth:
 * `scripts/rag-ingest/ingest.py` CLINICAL_DOMAIN_TO_SPECIALTY (deduped values).
 * Kept in sync manually — extend both places when adding a new domain.
 */
export type SpecialtyCode =
  | 'allergy'
  | 'anesthesia'
  | 'bariatric_surgery'
  | 'cardiology'
  | 'cardiothoracic_surgery'
  | 'colorectal_surgery'
  | 'dermatology'
  | 'emergency_medicine'
  | 'endocrinology'
  | 'ent'
  | 'general_medicine'
  | 'general_surgery'
  | 'genetics'
  | 'geriatrics'
  | 'hematology'
  | 'hepatology_gastro'
  | 'humanitarian'
  | 'infectious_diseases'
  | 'integrative_medicine'
  | 'musculoskeletal'
  | 'nephrology'
  | 'neurology'
  | 'nutrition'
  | 'occupational_medicine'
  | 'oncology'
  | 'ophthalmology'
  | 'orthopedics'
  | 'pain_management'
  | 'palliative_care'
  | 'pathology'
  | 'pediatrics'
  | 'pharmacogenomics'
  | 'pharmacology'
  | 'plastic_surgery'
  | 'preventive_medicine'
  | 'psychiatry'
  | 'pulmonology'
  | 'radiology'
  | 'rare_diseases'
  | 'rheumatology'
  | 'sleep_medicine'
  | 'sports_medicine'
  | 'tropical_diseases'
  | 'urology'
  | 'vascular_surgery'
  | 'women_health'
  | 'wound_care'

/** Raw row shape returned by public.match_guidelines RPC. */
interface MatchGuidelinesRow {
  guideline_title: string
  guideline_external_id: string
  source_code: string
  source_url: string
  source_publication_date: string | null
  specialty_code: string | null
  chunk_content: string
  chunk_metadata: { section_title?: string; [k: string]: unknown } | null
  similarity: number
}

export interface RAGChunk {
  content: string
  section: string
  similarity: number
  refId: string
}

export interface RAGReference {
  /** Citation tag injected in the prompt (e.g. "ref-1"). */
  ref_id: string
  title: string
  external_id: string
  source: string
  url: string
  publication_date: string
  specialty: string
}

export interface RAGContext {
  chunks: RAGChunk[]
  references: RAGReference[]
  totalChunks: number
  avgSimilarity: number
  /** True if RAG was successfully consulted (whether or not it returned chunks). */
  ragUsed: boolean
}

export interface QueryOptions {
  /** Specialty filter; null = broad search across all specialties. */
  specialty?: SpecialtyCode | null
  /** Cosine similarity threshold; default 0.30 (validated against real DB: text-embedding-3-small produces sims ~0.30-0.40 for clinically relevant medical content). */
  threshold?: number
  /** Max chunks to retrieve; default 8 (RPC default). */
  limit?: number
}

/** A context-specific secondary query bundled with its retrieval options. */
export interface SecondaryQuery {
  /** Short label for logging (e.g. "malaria", "bacterial_workup"). */
  label: string
  /** Free-text clinical query optimised for the targeted topic. */
  text: string
  /** Specialty filter; null = broad search. */
  specialty?: SpecialtyCode | null
  /** Cosine similarity threshold; defaults to 0.30. */
  threshold?: number
  /** Max chunks to retrieve for this subquery; default 3. */
  limit?: number
}

const EMPTY_CONTEXT: RAGContext = {
  chunks: [],
  references: [],
  totalChunks: 0,
  avgSimilarity: 0,
  ragUsed: false,
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Retrieve relevant guideline chunks from the TIBOK Supabase RAG.
 *
 * Returns an empty context (ragUsed=false) on any failure — callers MUST
 * treat RAG as best-effort enrichment, never as a hard dependency.
 */
export async function queryMedicalGuidelines(
  query: string,
  opts: QueryOptions = {}
): Promise<RAGContext> {
  const trimmedQuery = (query || '').trim()
  if (!trimmedQuery) return EMPTY_CONTEXT

  const specialty = opts.specialty ?? null
  const threshold = opts.threshold ?? 0.30
  const limit = opts.limit ?? 8

  const rows = await fetchGuidelineRows(trimmedQuery, { specialty, threshold, limit })
  if (rows === null) return { ...EMPTY_CONTEXT, ragUsed: false }
  if (rows.length === 0) return { ...EMPTY_CONTEXT, ragUsed: true }
  return buildContextFromRows(rows)
}

/**
 * Multi-query retrieval — runs the primary clinical query plus any context-
 * specific secondary queries (e.g. malaria when travel_history mentions an
 * endemic country). Results are merged, deduped by chunk content, and
 * re-numbered with stable global ref-N ids.
 *
 * Why this exists: a single embedding-driven query is dominated by the
 * vocabulary of the chief complaint and misses chunks that share the same
 * clinical scenario but use different terminology (Plasmodium vs arbovirus,
 * blood cultures vs viral PCR…). Secondary queries surface those without
 * lowering the threshold or further widening match_count.
 */
export async function queryMedicalGuidelinesMulti(
  primaryQuery: string,
  secondaryQueries: SecondaryQuery[],
  primaryOpts: QueryOptions = {}
): Promise<RAGContext> {
  if (!secondaryQueries || secondaryQueries.length === 0) {
    return queryMedicalGuidelines(primaryQuery, primaryOpts)
  }

  const allSpecs = [
    {
      label: 'main_clinical',
      query: (primaryQuery || '').trim(),
      opts: {
        specialty: primaryOpts.specialty ?? null,
        threshold: primaryOpts.threshold ?? 0.30,
        limit: primaryOpts.limit ?? 10,
      },
    },
    ...secondaryQueries.map(q => ({
      label: q.label,
      query: (q.text || '').trim(),
      opts: {
        specialty: q.specialty ?? null,
        threshold: q.threshold ?? 0.30,
        limit: q.limit ?? 3,
      },
    })),
  ]

  const t0 = Date.now()
  const rowsPerQuery = await Promise.all(
    allSpecs.map(spec => spec.query ? fetchGuidelineRows(spec.query, spec.opts) : Promise.resolve([] as MatchGuidelinesRow[]))
  )

  // Per-query log so we can see which subquery contributed what
  allSpecs.forEach((spec, i) => {
    const rows = rowsPerQuery[i]
    if (rows === null) {
      console.log(`[RAG] Multi-query "${spec.label}": failed (non-blocking)`)
    } else {
      const avgSim = rows.length > 0
        ? rows.reduce((s, r) => s + (r.similarity || 0), 0) / rows.length
        : 0
      console.log(
        `[RAG] Multi-query "${spec.label}": ${rows.length} chunks (avg sim ${avgSim.toFixed(2)}, ` +
          `specialty=${spec.opts.specialty ?? 'any'}, limit=${spec.opts.limit})`
      )
    }
  })

  const ragUsed = rowsPerQuery.some(r => r !== null)
  // Flatten + drop null results (RPC failures already logged)
  const allRows = rowsPerQuery.flatMap(r => r ?? [])

  if (allRows.length === 0) {
    console.log(`[RAG] Multi-query: 0 chunks across ${allSpecs.length} queries in ${Date.now() - t0}ms`)
    return { ...EMPTY_CONTEXT, ragUsed }
  }

  // Sort by similarity DESC so the dedup below keeps the highest-similarity
  // occurrence of each chunk.
  allRows.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

  const seenKeys = new Set<string>()
  const dedupedRows: MatchGuidelinesRow[] = []
  for (const row of allRows) {
    const key = `${row.guideline_external_id}::${row.chunk_metadata?.section_title || ''}::${(row.chunk_content || '').slice(0, 120)}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    dedupedRows.push(row)
  }

  console.log(
    `[RAG] Multi-query merged: ${allRows.length} → ${dedupedRows.length} unique chunks ` +
      `in ${Date.now() - t0}ms (deduped ${allRows.length - dedupedRows.length})`
  )

  const ctx = buildContextFromRows(dedupedRows)
  return { ...ctx, ragUsed: ragUsed && ctx.ragUsed }
}

/** Embed a query and call the match_guidelines RPC. Returns null on failure. */
async function fetchGuidelineRows(
  query: string,
  opts: Required<Pick<QueryOptions, 'specialty' | 'threshold' | 'limit'>>
): Promise<MatchGuidelinesRow[] | null> {
  let embedding: number[]
  try {
    const t0 = Date.now()
    const res = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    embedding = res.data[0].embedding
    console.log(`[RAG] embedding generated in ${Date.now() - t0}ms (${embedding.length} dims)`)
  } catch (err: any) {
    console.error('[RAG] embedding failed (non-blocking):', err?.message || err)
    return null
  }

  try {
    const t0 = Date.now()
    const { data, error } = await getSupabase().rpc('match_guidelines', {
      query_embedding: embedding,
      match_specialty_code: opts.specialty,
      match_threshold: opts.threshold,
      match_count: opts.limit,
    })
    if (error) {
      console.error('[RAG] match_guidelines RPC error:', error.message)
      return null
    }
    const rows = (data || []) as MatchGuidelinesRow[]
    console.log(
      `[RAG] match_guidelines returned ${rows.length} chunks in ${Date.now() - t0}ms ` +
        `(specialty=${opts.specialty ?? 'any'}, threshold=${opts.threshold}, limit=${opts.limit})`
    )
    return rows
  } catch (err: any) {
    console.error('[RAG] RPC call failed (non-blocking):', err?.message || err)
    return null
  }
}

/** Group rows into chunks + dedup references by external_id. */
function buildContextFromRows(rows: MatchGuidelinesRow[]): RAGContext {
  if (rows.length === 0) return { ...EMPTY_CONTEXT, ragUsed: true }

  const refByExternalId = new Map<string, RAGReference>()
  const chunks: RAGChunk[] = []

  rows.forEach((row, idx) => {
    const externalId = row.guideline_external_id || `unknown-${idx}`
    let ref = refByExternalId.get(externalId)
    if (!ref) {
      const refId = `ref-${refByExternalId.size + 1}`
      ref = {
        ref_id: refId,
        title: row.guideline_title || 'Untitled guideline',
        external_id: externalId,
        source: row.source_code || 'UNKNOWN',
        url: row.source_url || '',
        publication_date: row.source_publication_date || '',
        specialty: row.specialty_code || '',
      }
      refByExternalId.set(externalId, ref)
    }
    chunks.push({
      content: row.chunk_content || '',
      section: row.chunk_metadata?.section_title || '',
      similarity: row.similarity || 0,
      refId: ref.ref_id,
    })
  })

  const references = Array.from(refByExternalId.values())
  const avgSimilarity =
    chunks.reduce((sum, c) => sum + c.similarity, 0) / Math.max(chunks.length, 1)

  return {
    chunks,
    references,
    totalChunks: chunks.length,
    avgSimilarity,
    ragUsed: true,
  }
}

/**
 * Format an RAGContext into a prompt-injection block.
 *
 * The block must be inserted in the system prompt with explicit instructions
 * for the LLM to cite each [ref-N] when making a recommendation.
 */
export function formatGuidelinesForPrompt(ctx: RAGContext): string {
  if (!ctx.ragUsed || ctx.chunks.length === 0) {
    return ''
  }

  const N = ctx.references.length
  const validRange = N === 1 ? '[ref-1] ONLY' : `[ref-1] to [ref-${N}]`
  const validIds = ctx.references.map(r => `[${r.ref_id}]`).join(', ')

  const lines: string[] = []
  lines.push('=== CONTEXTE GUIDELINES MÉDICALES (RAG) ===')
  lines.push('')
  lines.push(
    'Les recommandations suivantes proviennent de guidelines officielles validées.'
  )
  lines.push(
    'Utilise-les pour informer ton diagnostic et tes prescriptions.'
  )
  lines.push(
    'CHAQUE recommandation que tu donnes DOIT citer la guideline source en utilisant le format [ref-N].'
  )
  lines.push('')

  // Group chunks by ref so each guideline appears once with its sections.
  const chunksByRef = new Map<string, RAGChunk[]>()
  for (const c of ctx.chunks) {
    const arr = chunksByRef.get(c.refId) ?? []
    arr.push(c)
    chunksByRef.set(c.refId, arr)
  }

  for (const ref of ctx.references) {
    const refChunks = chunksByRef.get(ref.ref_id) ?? []
    const date = ref.publication_date ? ` (${ref.publication_date})` : ''
    lines.push(`[${ref.ref_id}] ${ref.source} ${ref.external_id}${date} — ${ref.title}`)
    if (ref.url) lines.push(`URL: ${ref.url}`)
    if (ref.specialty) lines.push(`Specialty: ${ref.specialty}`)
    for (const chunk of refChunks) {
      if (chunk.section) lines.push(`Section: ${chunk.section}`)
      lines.push(`Contenu (similarity ${chunk.similarity.toFixed(2)}):`)
      lines.push(chunk.content.trim())
      lines.push('')
    }
  }

  lines.push('=== RÈGLES OBLIGATOIRES POUR LES RÉFÉRENCES ===')
  lines.push(
    `1. Plage de citations VALIDES: ${validRange}. EXACTEMENT ${N} référence(s) disponible(s): ${validIds}.`
  )
  lines.push(
    `2. INTERDIT de citer [ref-${N + 1}], [ref-${N + 2}], ou tout [ref-X] avec X > ${N}. Toute référence hors de la plage ${validRange} sera supprimée du rapport (citation invalidée).`
  )
  lines.push(
    '3. Chaque recommandation diagnostique ou thérapeutique DOIT être attribuée à une référence [ref-N] si elle est supportée par les guidelines ci-dessus.'
  )
  lines.push(
    "4. Si aucune guideline du contexte ne supporte une recommandation, termine simplement l'indication par: 'Based on standard clinical practice.' (NE PAS écrire 'hors guideline RAG' — c'est du jargon interne qui ne doit jamais apparaître dans le rapport rendu)."
  )
  lines.push(
    '5. POUR CHAQUE MÉDICAMENT prescrit, ET CHAQUE examen complémentaire (lab, imagerie), cite la référence guideline pertinente [ref-N] dans le champ "indication" / "clinical_indication" si disponible dans le contexte ci-dessus (ex: "Symptomatic relief of fever and pain [ref-2]"). En cas de doute entre citer une ref et écrire \'Based on standard clinical practice.\', PRÉFÈRE citer si une ref aborde même partiellement le sujet.'
  )
  lines.push(
    "6. PERTINENCE STRICTE: ne cite [ref-N] QUE si la guideline correspondante traite DIRECTEMENT du sujet de la recommandation. NE PAS citer une ref simplement parce qu'elle a été fournie. Une ref tangentielle (ex: 'endocardite' citée sur une fièvre arbovirale sans souffle/valve concernée) sera retirée et nuit à la crédibilité du rapport."
  )
  lines.push(
    "7. Liste dans evidence_references UNIQUEMENT les [ref-N] que tu as réellement utilisés dans le texte (champs narratifs, indications). Toute ref listée ici sans apparaître dans le texte sera retirée. Cohérence stricte texte ↔ evidence_references."
  )
  lines.push(
    "8. NE PAS inventer de références: ne cite que les [ref-N] présents ci-dessus."
  )
  lines.push('')

  lines.push('=== CONFIRMATION FINALE OBLIGATOIRE ===')
  lines.push(
    'Avant de retourner ton JSON, vérifie EXPLICITEMENT que le tableau "evidence_references" contient au moins une entrée par [ref-N] que tu as effectivement utilisé.'
  )
  lines.push(
    'Si tu as utilisé ref-1 et ref-2 dans ton raisonnement, "evidence_references" doit contenir au minimum 2 objets. Champ vide = échec de la consigne RAG.'
  )
  lines.push('')

  return lines.join('\n')
}

/**
 * Infer a specialty filter from a free-text clinical query, if confident.
 * Returns null for broad search when the query mixes signals or is unclear.
 *
 * Heuristic; safe to widen or narrow without breaking callers.
 */
export function inferSpecialty(query: string): SpecialtyCode | null {
  const q = (query || '').toLowerCase()
  const has = (kw: string) => q.includes(kw)
  const score = (keywords: readonly string[]) => keywords.reduce((n, k) => has(k) ? n + 1 : n, 0)

  // Keyword tables — FR + EN. Order in `scores` array below decides tie-breaks
  // (more specific specialties first), since Array.sort is stable in JS engines.
  // Tropical-specific terms moved out of infectious_diseases so dengue/malaria
  // route to the targeted corpus.
  const tropical = [
    'dengue', 'malaria', 'paludisme', 'chikungunya', 'zika', 'arbovir',
    'leptospiros', 'fièvre tropicale', 'tropical fever', 'returning travel',
  ] as const
  const oncology = [
    'cancer', 'tumeur', 'tumor', 'malignant', 'metastas', 'métastas',
    'chemotherapy', 'chimio', 'oncolog', 'leukemia', 'leucémie',
    'lymphoma', 'lymphome', 'carcinoma',
  ] as const
  const womenHealth = [
    'pregnan', 'grossesse', 'prenatal', 'prénatal', 'postpartum', 'post-partum',
    'menstrual', 'menstrue', 'gynéco', 'gynaeco', 'ovaire', 'ovary',
    'uterus', 'utér', 'breastfeed', 'allaitement',
  ] as const
  const pediatrics = [
    'pediatric', 'pédiat', 'enfant', 'nourrisson', 'bébé', 'infant',
    'child', 'neonatal', 'néonat', 'adolescent',
  ] as const
  const dermatology = [
    'rash', 'éruption', 'peau', 'dermat', 'eczema', 'eczéma',
    'psoriasis', 'acne', 'acné', 'prurit', 'lésion cutané', 'skin lesion',
    'mole', 'naevus', 'urticaire', 'urticaria',
  ] as const
  const psychiatry = [
    'depression', 'dépression', 'anxiety', 'anxiété', 'psychiatric',
    'psychiatrique', 'mental health', 'santé mentale', 'suicid',
    'panic', 'panique', 'bipolar', 'bipolaire',
  ] as const
  const rheumatology = [
    'arthrit', 'rhumatolog', 'polyarthrite', 'lupus', 'fibromyalgie',
    'fibromyalgia', 'gout', 'goutte', 'joint pain', 'douleur articul',
    'rheumatoid', 'rhumatoïde',
  ] as const
  const neurology = [
    'seizure', 'convulsion', 'paralys', 'stroke', 'avc',
    'neurolog', 'migraine', 'epilep', 'epilepsie',
    'parkinson', 'multiple sclerosis', 'sclérose',
  ] as const
  const nephrology = [
    'rénal', 'renal', 'kidney', 'dialys', 'créatinine', 'creatinine',
    'nephrit', 'néphrit', 'glomerular', 'glomérulair', 'urolith',
  ] as const
  const hepatologyGastro = [
    'abdominal', 'abdomen', 'gastro', 'intestin', 'colon',
    'hépatique', 'hepatic', 'liver', 'foie', 'ibd', 'crohn',
    'ulcerative colitis', 'pancrea', 'cholecyst', 'cholécyst',
  ] as const
  const cardiology = [
    'chest pain', 'angina', 'angor', 'acs', 'stemi', 'nstemi',
    'heart failure', 'insuffisance cardiaque',
    'douleur thoracique', 'tachycard', 'bradycard',
    'hypertension', 'hta', 'blood pressure', 'tension artérielle',
  ] as const
  const endocrinology = [
    'diabet', 'glycém', 'glycemia', 'hba1c', 'hyperglyc', 'hypoglyc',
    'thyroid', 'thyroïde', 'insulin', 'insuline',
  ] as const
  const infectious = [
    'fever', 'fièvre', 'febrile', 'travel', 'voyage',
    'sepsis', 'meningitis', 'méningite', 'pneumonia', 'pneumonie',
    'covid', 'antibiotic', 'bacterial', 'viral',
  ] as const
  const pulmonology = [
    'cough', 'toux', 'dyspn', 'breath', 'wheez', 'asthma', 'asthme', 'copd', 'bpco',
  ] as const
  const preventive = [
    'screening', 'dépistage', 'prevent', 'prévention', 'check-up', 'bilan',
    'statin', 'aspirin',
  ] as const

  // Order = clinical specificity priority for tie-breaks. Most specific first.
  const scores: Array<[SpecialtyCode, number]> = [
    ['tropical_diseases', score(tropical)],
    ['oncology', score(oncology)],
    ['women_health', score(womenHealth)],
    ['pediatrics', score(pediatrics)],
    ['dermatology', score(dermatology)],
    ['psychiatry', score(psychiatry)],
    ['rheumatology', score(rheumatology)],
    ['neurology', score(neurology)],
    ['nephrology', score(nephrology)],
    ['hepatology_gastro', score(hepatologyGastro)],
    ['cardiology', score(cardiology)],
    ['endocrinology', score(endocrinology)],
    ['infectious_diseases', score(infectious)],
    ['pulmonology', score(pulmonology)],
    ['preventive_medicine', score(preventive)],
  ]

  scores.sort((a, b) => b[1] - a[1])
  const [topCode, topScore] = scores[0]
  const [, secondScore] = scores[1]

  // Require top score ≥ 2 and strict lead over second; otherwise broad search.
  if (topScore >= 2 && topScore > secondScore) return topCode
  return null
}

/**
 * Build a clinical query string from raw consultation data.
 *
 * Output is plain natural language (no labels, no UI codes, no nulls)
 * focused on the clinical signal — what the embedding model needs to
 * match guideline chunks. Demographics are added ONLY when clinically
 * relevant (pregnancy, paediatrics, geriatrics).
 *
 * Why: structured labels and noisy fields dilute the embedding and
 * push similarity below threshold. See git log for the dengue case.
 */
export function buildClinicalQuery(input: {
  chiefComplaint?: string
  symptoms?: string[]
  ageYears?: number | string
  sex?: string
  medicalHistory?: string[]
  travelHistory?: string
  vitalSigns?: Record<string, unknown>
  duration?: string
  pregnancyStatus?: string
}): string {
  // ---------- helpers ----------
  const norm = (s: unknown): string =>
    String(s ?? '').replace(/\s+/g, ' ').trim()

  const isMeaningful = (v: unknown): boolean => {
    if (v === undefined || v === null) return false
    const s = String(v).trim().toLowerCase()
    if (!s) return false
    // Common no-data sentinels emitted by the form
    if (['0', 'na', 'n/a', 'none', 'null', 'undefined', 'unknown', 'inconnu', 'not specified', 'not measured'].includes(s)) return false
    if (s.startsWith('anon-')) return false
    return true
  }

  /** Decode UI codes like "3_7_days" → "3 to 7 days", "1_6_hours" → "1 to 6 hours". */
  const decodeDuration = (raw: string): string => {
    const s = norm(raw)
    if (!s) return ''
    const range = s.match(/^(\d+)_(\d+)_([a-z]+)$/i)
    if (range) return `${range[1]} to ${range[2]} ${range[3]}`
    const single = s.match(/^(\d+)_([a-z]+)$/i)
    if (single) return `${single[1]} ${single[2]}`
    return s.replace(/_/g, ' ')
  }

  const sentence = (s: string) =>
    s.replace(/[.!?]+\s*$/, '').trim()

  // ---------- chief complaint (anchor) ----------
  const cc = isMeaningful(input.chiefComplaint) ? sentence(norm(input.chiefComplaint)) : ''
  const ccLower = cc.toLowerCase()

  // ---------- symptoms NOT already in chief complaint ----------
  const extraSymptoms = (input.symptoms || [])
    .filter(isMeaningful)
    .map(s => sentence(norm(s)))
    .filter(s => s && !ccLower.includes(s.toLowerCase()))

  // ---------- duration (decoded, only if not in CC) ----------
  const dur = isMeaningful(input.duration) ? decodeDuration(input.duration!) : ''
  const durationStr =
    dur && !ccLower.includes(dur.toLowerCase()) && !/\b\d+\s*(day|week|hour|month)/i.test(cc)
      ? `for ${dur}`
      : ''

  // ---------- travel context (only if non-redundant with CC) ----------
  let travelStr = ''
  if (isMeaningful(input.travelHistory)) {
    const travel = sentence(norm(input.travelHistory))
    // Avoid duplication: travelHistory often == chiefComplaint in current form
    if (travel.toLowerCase() !== ccLower && !ccLower.includes(travel.toLowerCase())) {
      travelStr = travel
    }
  }

  // ---------- demographics: only if clinically relevant ----------
  const demoBits: string[] = []
  const ageNum =
    typeof input.ageYears === 'number'
      ? input.ageYears
      : parseInt(String(input.ageYears ?? ''), 10)
  if (Number.isFinite(ageNum)) {
    if (ageNum < 16) demoBits.push(`paediatric patient (${ageNum} years old)`)
    else if (ageNum >= 75) demoBits.push(`elderly patient (${ageNum} years old)`)
  }
  const preg = isMeaningful(input.pregnancyStatus) ? norm(input.pregnancyStatus).toLowerCase() : ''
  if (preg && (preg === 'pregnant' || preg === 'possibly_pregnant' || preg === 'breastfeeding')) {
    demoBits.push(preg.replace(/_/g, ' '))
  }

  // ---------- medical history (only meaningful entries) ----------
  const histBits = (input.medicalHistory || []).filter(isMeaningful).map(h => sentence(norm(h)))

  // ---------- assemble ----------
  const segments: string[] = []
  if (cc) segments.push(cc)
  if (extraSymptoms.length) segments.push(`with ${extraSymptoms.join(', ')}`)
  if (durationStr) segments.push(durationStr)
  if (travelStr) segments.push(travelStr)
  if (histBits.length) segments.push(`history of ${histBits.join(', ')}`)
  if (demoBits.length) segments.push(`patient profile: ${demoBits.join(', ')}`)

  // Vitals are intentionally OMITTED unless we can detect a meaningful abnormality.
  // Numeric vitals dilute the embedding signal and rarely add retrieval value.

  return segments.join(' ').replace(/\s+/g, ' ').trim()
}

// ============================================================================
// Secondary query inference (Bug B / multi-query RAG)
// ============================================================================

/**
 * Countries with active or recurrent malaria transmission. Lower-cased,
 * substring matching. List intentionally generous — false positives only
 * cost a small extra query.
 */
const MALARIA_ENDEMIC_COUNTRIES: readonly string[] = [
  // South / Southeast Asia
  'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'bhutan',
  'myanmar', 'burma', 'cambodia', 'laos', 'vietnam', 'thailand',
  'indonesia', 'philippines', 'malaysia', 'east timor', 'timor-leste', 'timor',
  'papua new guinea',
  // Africa (sub-Saharan + horn)
  'nigeria', 'congo', 'drc', 'democratic republic of the congo',
  'kenya', 'tanzania', 'uganda', 'ethiopia', 'eritrea', 'somalia',
  'sudan', 'south sudan', 'ghana', 'cameroon', 'senegal', 'mali',
  'burkina faso', 'angola', 'mozambique', 'madagascar', 'malawi',
  'zambia', 'zimbabwe', "cote d'ivoire", "côte d'ivoire", 'ivory coast',
  'sierra leone', 'liberia', 'guinea', 'gambia', 'guinea-bissau',
  'benin', 'togo', 'central african republic', 'chad', 'niger',
  'rwanda', 'burundi', 'mauritania', 'comoros',
  // Americas (tropical)
  'brazil', 'colombia', 'peru', 'venezuela', 'guyana', 'suriname',
  'french guiana', 'haiti', 'dominican republic', 'panama', 'nicaragua',
  'honduras', 'guatemala', 'belize', 'ecuador', 'bolivia',
  // Pacific
  'solomon islands', 'vanuatu',
]

/**
 * Build a list of secondary RAG queries based on the patient context.
 *
 * Each query targets a clinical scenario whose vocabulary differs enough
 * from the chief complaint that a single embedding query would miss it
 * (malaria with arboviral CC, bacterial workup with viral CC, etc.).
 *
 * Returns [] when no extra signal is detected — the caller falls back to
 * the single-query path with no overhead change.
 */
export function buildSecondaryQueries(input: {
  chiefComplaint?: string
  symptoms?: string[]
  travelHistory?: string
  symptomDuration?: string
  ageYears?: number | string
}): SecondaryQuery[] {
  const queries: SecondaryQuery[] = []
  const cc = (input.chiefComplaint || '').toLowerCase()
  const symptoms = (input.symptoms || []).map(s => String(s || '').toLowerCase())
  const symptomBlob = [cc, ...symptoms].join(' ')
  const travel = (input.travelHistory || '').toLowerCase()

  const hasFever = /\bfever\b|\bfièvre\b|febrile|pyrexia|hyperthermia/.test(symptomBlob)

  // ---------- Generic diversification queries (always when a chief complaint is present) ----------
  // Symptoms-only queries (e.g. "headache fever cough") embed far from the
  // technical guideline chunks they should match (e.g. "differential
  // diagnosis of acute febrile illness, evidence-based workup, BNF/NICE
  // recommendations…"). To bridge that semantic gap without hard-coding
  // pathology-specific rescue queries, we always run two extra retrievals
  // built around guideline-style vocabulary, anchored on the patient's
  // chief complaint. Broad specialty (null) so chunks indexed under any
  // specialty code (a known issue: "infectious" vs "infectious_diseases",
  // dengue chunks spread across 12+ codes) remain eligible.
  const ccTrimmed = cc.trim().slice(0, 200)
  if (ccTrimmed) {
    queries.push({
      label: 'differential_approach',
      text:
        `differential diagnosis approach to ${ccTrimmed} ` +
        'evidence-based clinical evaluation pathophysiology risk stratification ' +
        'red flags clinical decision rules',
      specialty: null,
      limit: 4,
    })
    queries.push({
      label: 'empirical_workup',
      text:
        `empirical workup investigation strategy for ${ccTrimmed} ` +
        'first-line laboratory testing imaging clinical decision rules ' +
        'guideline-based assessment',
      specialty: null,
      limit: 4,
    })
  }

  // ---------- Malaria — fever + travel to endemic country ----------
  if (hasFever && MALARIA_ENDEMIC_COUNTRIES.some(c => travel.includes(c))) {
    queries.push({
      label: 'malaria',
      text:
        'malaria diagnosis Plasmodium falciparum vivax thick thin blood films ' +
        'rapid diagnostic test RDT artemisinin combination therapy treatment ' +
        'returning travelers fever endemic regions',
      specialty: 'infectious_diseases',
      limit: 3,
    })
  }

  // ---------- Bacterial workup — fever ≥ 3 days or any prolonged febrile illness ----------
  // The duration field is often a coded range like "3_7_days" or a free-form
  // string; pull out any leading integer to gate.
  const durationDays = (() => {
    const raw = String(input.symptomDuration || '').toLowerCase()
    const m = raw.match(/(\d+)/)
    if (!m) return 0
    const n = parseInt(m[1], 10)
    if (raw.includes('week')) return n * 7
    if (raw.includes('month')) return n * 30
    if (raw.includes('hour')) return Math.max(0, Math.round(n / 24))
    return n
  })()

  if (hasFever && durationDays >= 3) {
    queries.push({
      label: 'bacterial_workup',
      text:
        'blood cultures bacteraemia sepsis acute febrile illness CRP procalcitonin ' +
        'inflammatory markers urinalysis empirical antibiotic prolonged fever ' +
        'undifferentiated febrile illness',
      specialty: 'infectious_diseases',
      limit: 2,
    })
  }

  return queries
}

// ============================================================================
// Citation expansion: [ref-N] → "[K]" (Vancouver-style sequential numbering)
// ============================================================================

/**
 * Map associating each internal ref_id (e.g. "ref-1") with its 1-indexed
 * display number — derived from the position of that entry in the final
 * filtered evidence_references array. The bibliography section at the
 * bottom of the report numbers entries by the same array position, so
 * in-text [K] tokens line up with bibliography [K] entries.
 */
export type RefDisplayNumberMap = Map<string, number>

/**
 * Build a ref_id → display-number lookup from the final evidence_references
 * array. Accepts both bare ("ref-1") and bracketed ("[ref-1]") ids
 * defensively; normalises to the bare form for storage.
 */
export function buildRefDisplayMap(
  evidenceRefs: ReadonlyArray<{ ref_id?: string }> | null | undefined
): RefDisplayNumberMap {
  const map: RefDisplayNumberMap = new Map<string, number>()
  if (!Array.isArray(evidenceRefs)) return map
  evidenceRefs.forEach((ref, idx) => {
    if (!ref?.ref_id) return
    const id = String(ref.ref_id).replace(/^\[(.+)\]$/, '$1').trim()
    if (!id || map.has(id)) return
    map.set(id, idx + 1)
  })
  return map
}

/**
 * Replace [ref-N] tokens in a string with the Vancouver-style "[K]" form,
 * where K is the display number of ref-N in the final bibliography
 * (1-indexed). Tokens whose ref-N is unknown are dropped — they are
 * normally already filtered upstream by the scrub pass; defence-in-depth.
 */
export function expandRefCitations(
  text: string,
  displayMap: RefDisplayNumberMap
): string {
  if (!text || displayMap.size === 0) return text
  return text
    .replace(/\[ref-(\d+)\]/g, (_match, num) => {
      const k = displayMap.get(`ref-${num}`)
      return k ? `[${k}]` : ''
    })
    // Tidy whitespace/punctuation introduced by drops above.
    .replace(/\s+([,.;:!?)])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Walk an arbitrary object/array tree and rewrite every string field through
 * `expandRefCitations`. Mutates in place AND returns the same reference.
 *
 * `excludeKeys` lets callers protect structured ref metadata (e.g. the
 * `evidence_references` array which keeps its internal ref-N form for the
 * bibliography section at the bottom of the report — the frontend numbers
 * those entries by their array position, matching the [K] placed in-text).
 */
export function expandRefsInTree(
  node: any,
  displayMap: RefDisplayNumberMap,
  excludeKeys: ReadonlySet<string> = new Set(['evidence_references', 'rag_metadata'])
): any {
  if (displayMap.size === 0) return node
  const visit = (n: any): any => {
    if (typeof n === 'string') return expandRefCitations(n, displayMap)
    if (Array.isArray(n)) {
      for (let i = 0; i < n.length; i++) n[i] = visit(n[i])
      return n
    }
    if (n && typeof n === 'object') {
      for (const k of Object.keys(n)) {
        if (excludeKeys.has(k)) continue
        n[k] = visit(n[k])
      }
    }
    return n
  }
  return visit(node)
}

// ============================================================================
// Citation expansion (alternate format): [ref-N] → "(Source, Year)"
// ============================================================================
//
// Used in parallel with the Vancouver [K] expansion so the rendered report
// can use the two formats side-by-side: [K] in the narrative (compact, doctor-
// friendly inline citation), "(Source, Year)" in prescriptions / lab / imaging
// indications (more readable for the patient when looking at a single med
// or test out of bibliography context).

export interface RefSourceYear {
  source: string
  year: string
}

export type RefSourceYearMap = Map<string, RefSourceYear>

/**
 * Build a ref_id → { source, year } lookup from the final
 * evidence_references array. Tolerates both bare ("ref-1") and bracketed
 * ("[ref-1]") ids; pulls the year from `year` when set, else the first 4-digit
 * run inside `publication_date` (handles "2025", "2025-03-12", etc.).
 */
export function buildRefSourceYearMap(
  evidenceRefs: ReadonlyArray<{
    ref_id?: string
    source?: string
    publication_date?: string
    year?: string | number
  }> | null | undefined
): RefSourceYearMap {
  const map: RefSourceYearMap = new Map<string, RefSourceYear>()
  if (!Array.isArray(evidenceRefs)) return map
  for (const ref of evidenceRefs) {
    if (!ref?.ref_id) continue
    const id = String(ref.ref_id).replace(/^\[(.+)\]$/, '$1').trim()
    if (!id || map.has(id)) continue
    const yearFromExplicit = ref.year != null && String(ref.year).trim() ? String(ref.year).trim() : ''
    const yearFromDate = ref.publication_date
      ? (String(ref.publication_date).match(/(\d{4})/)?.[1] ?? '')
      : ''
    map.set(id, {
      source: String(ref.source || '').trim() || 'Guideline',
      year: yearFromExplicit || yearFromDate,
    })
  }
  return map
}

/**
 * Replace [ref-N] tokens in a string with "(Source, Year)" — or "(Source)"
 * when the year is unknown. Tokens whose ref-N is unknown to the map are
 * dropped (the upstream scrub normally already removes them).
 */
export function expandRefCitationsAsSourceYear(
  text: string,
  sourceYearMap: RefSourceYearMap
): string {
  if (!text || sourceYearMap.size === 0) return text
  return text
    .replace(/\[ref-(\d+)\]/g, (_match, num) => {
      const meta = sourceYearMap.get(`ref-${num}`)
      if (!meta) return ''
      return meta.year ? `(${meta.source}, ${meta.year})` : `(${meta.source})`
    })
    // Tidy whitespace/punctuation introduced by drops or insertions above.
    .replace(/\s+([,.;:!?)])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Walk an arbitrary object/array tree and rewrite every string field through
 * `expandRefCitationsAsSourceYear`. Mutates in place AND returns the same
 * reference. Uses the same default excludeKeys as the Vancouver walker
 * (evidence_references + rag_metadata).
 */
export function expandRefsAsSourceYearInTree(
  node: any,
  sourceYearMap: RefSourceYearMap,
  excludeKeys: ReadonlySet<string> = new Set(['evidence_references', 'rag_metadata'])
): any {
  if (sourceYearMap.size === 0) return node
  const visit = (n: any): any => {
    if (typeof n === 'string') return expandRefCitationsAsSourceYear(n, sourceYearMap)
    if (Array.isArray(n)) {
      for (let i = 0; i < n.length; i++) n[i] = visit(n[i])
      return n
    }
    if (n && typeof n === 'object') {
      for (const k of Object.keys(n)) {
        if (excludeKeys.has(k)) continue
        n[k] = visit(n[k])
      }
    }
    return n
  }
  return visit(node)
}

// ============================================================================
// Scrub + Bug-D + Bug-F + Pass-1/2 enrichment — shared by all RAG-using routes
// ============================================================================

/**
 * Mutates `analysis` in place to:
 *   - Strip hallucinated [ref-N] tokens whose ref-N is not in `ragContext`.
 *   - Collect the set of valid [ref-N] tokens that actually appear in the
 *     narrative (Bug D usedValidRefs).
 *   - Filter `analysis.evidence_references` to only those refs cited in the
 *     narrative, after normalising any bracketed ref_id ("[ref-1]" → "ref-1",
 *     Bug F).
 *
 * Then enriches a final array (Pass 1) by joining the LLM's surviving
 * {ref_id, used_for} entries with full metadata (title/source/url/date/
 * specialty/external_id) from `ragContext.references`. Pass 2 deterministic
 * fallback if the LLM emitted nothing despite chunks being provided.
 *
 * Returns the enriched array PLUS counters/diagnostics for logging.
 */
export function scrubAndEnrichEvidenceRefs(
  analysis: any,
  ragContext: RAGContext,
  options: { logPrefix?: string } = {}
): {
  evidenceReferences: Array<RAGReference & { used_for: string }>
  unknownCitedRefs: string[]
  citationsReconstructed: boolean
  hallucinatedRefsScrubbed: number
  hallucinatedRefsBreakdown: Record<string, number>
  unusedRefsFiltered: number
  refUsageByPath: Map<string, Array<{ path: string; excerpt: string }>>
} {
  const tag = options.logPrefix || '📚 [RAG]'
  const evidenceReferences: Array<RAGReference & { used_for: string }> = []
  const unknownCitedRefs: string[] = []
  let citationsReconstructed = false
  let hallucinatedRefsScrubbed = 0
  let hallucinatedRefsBreakdown: Record<string, number> = {}
  let unusedRefsFiltered = 0
  const usedValidRefs = new Set<string>()
  const refUsageByPath = new Map<string, Array<{ path: string; excerpt: string }>>()

  if (!ragContext.ragUsed) {
    return {
      evidenceReferences,
      unknownCitedRefs,
      citationsReconstructed,
      hallucinatedRefsScrubbed,
      hallucinatedRefsBreakdown,
      unusedRefsFiltered,
      refUsageByPath,
    }
  }

  const validRefIds = new Set(ragContext.references.map(r => r.ref_id))
  const REF_TOKEN = /\[ref-(\d+)\]/g
  const strippedTokens: string[] = []
  let stringsScanned = 0
  let stringsModified = 0

  const recordUsage = (id: string, path: string, source: string) => {
    const arr = refUsageByPath.get(id) ?? []
    const idx = source.indexOf(`[${id}]`)
    const start = Math.max(0, idx - 60)
    const end = Math.min(source.length, idx + 80)
    arr.push({ path, excerpt: source.slice(start, end).replace(/\s+/g, ' ').trim() })
    refUsageByPath.set(id, arr)
  }

  const scrubString = (s: string, path: string): string => {
    stringsScanned++
    let modified = false
    const cleaned = s.replace(REF_TOKEN, (match, num) => {
      const id = `ref-${num}`
      if (validRefIds.has(id)) {
        usedValidRefs.add(id)
        recordUsage(id, path, s)
        return match
      }
      modified = true
      strippedTokens.push(id)
      return ''
    })
    if (!modified) return s
    stringsModified++
    return cleaned
      .replace(/\s+([,.;:!?)])/g, '$1')
      .replace(/\(\s*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const scrubNode = (node: any, path: string): any => {
    if (typeof node === 'string') return scrubString(node, path)
    if (Array.isArray(node)) return node.map((item, i) => scrubNode(item, `${path}[${i}]`))
    if (node && typeof node === 'object') {
      // Don't rewrite the LLM's evidence_references entries themselves —
      // Pass 1 below normalises and validates them.
      if (node === analysis?.evidence_references) return node
      for (const k of Object.keys(node)) {
        if (k === 'evidence_references') continue
        node[k] = scrubNode(node[k], path ? `${path}.${k}` : k)
      }
    }
    return node
  }

  // Snapshot the LLM's raw evidence_references BEFORE filtering — diagnostics.
  const llmEvidenceRaw: Array<{ ref_id?: string; used_for?: string }> = Array.isArray(
    analysis?.evidence_references
  )
    ? JSON.parse(JSON.stringify(analysis.evidence_references))
    : []
  console.log(
    `${tag} LLM raw evidence_references (${llmEvidenceRaw.length}): ` +
      JSON.stringify(llmEvidenceRaw.map(e => ({ ref_id: e?.ref_id, used_for: (e?.used_for || '').slice(0, 80) })))
  )

  scrubNode(analysis, '')

  if (strippedTokens.length > 0) {
    hallucinatedRefsScrubbed = strippedTokens.length
    hallucinatedRefsBreakdown = strippedTokens.reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] || 0) + 1
      return acc
    }, {})
    console.warn(
      `${tag} Scrubbed ${strippedTokens.length} hallucinated ref token(s) ` +
        `from ${stringsModified}/${stringsScanned} narrative string(s). ` +
        `Counts: ${JSON.stringify(hallucinatedRefsBreakdown)}. ` +
        `Valid range was [ref-1..ref-${ragContext.references.length}].`
    )
  } else {
    console.log(
      `${tag} Scrub clean: scanned ${stringsScanned} string(s), no out-of-range [ref-N] found ` +
        `(valid range [ref-1..ref-${ragContext.references.length}]).`
    )
  }

  if (refUsageByPath.size > 0) {
    console.log(`${tag} Citation paths in narrative:`)
    for (const [id, hits] of refUsageByPath) {
      for (const h of hits.slice(0, 3)) {
        console.log(`   [${id}] @ ${h.path} :: …${h.excerpt}…`)
      }
      if (hits.length > 3) {
        console.log(`   [${id}] … +${hits.length - 3} more occurrence(s)`)
      }
    }
  }

  // Bug D + Bug F: drop refs the LLM never cited in narrative; normalise
  // bracketed ref_id values that GPT sometimes emits in evidence_references.
  if (Array.isArray(analysis?.evidence_references) && analysis.evidence_references.length > 0) {
    const before = analysis.evidence_references.length
    const droppedIds: string[] = []
    const normalisedFromBracketed: string[] = []
    analysis.evidence_references = analysis.evidence_references
      .map((entry: any) => {
        const raw = String(entry?.ref_id ?? '').trim()
        const stripped = raw.replace(/^\[(.+)\]$/, '$1').trim()
        if (raw !== stripped) normalisedFromBracketed.push(`${raw}→${stripped}`)
        return { ...entry, ref_id: stripped }
      })
      .filter((entry: any) => {
        const id = entry.ref_id
        const keep = !!id && usedValidRefs.has(id)
        if (!keep && id) droppedIds.push(id)
        return keep
      })
    if (normalisedFromBracketed.length > 0) {
      console.log(
        `${tag} Normalised ${normalisedFromBracketed.length} bracketed ref_id(s) emitted by the LLM: ` +
          normalisedFromBracketed.slice(0, 10).join(', ')
      )
    }
    unusedRefsFiltered = before - analysis.evidence_references.length
    if (unusedRefsFiltered > 0) {
      console.log(
        `${tag} Dropped ${unusedRefsFiltered} ref(s) from evidence_references not present in report text. ` +
          `Dropped: ${droppedIds.join(', ')}. Kept: ${Array.from(usedValidRefs).join(', ') || '(none)'}.`
      )
    }
  }

  // Pass 1 — preserve LLM citations, enrich with metadata.
  const llmRefs: Array<{ ref_id?: string; used_for?: string }> = Array.isArray(
    analysis?.evidence_references
  )
    ? analysis.evidence_references
    : []
  const refLookup = new Map(ragContext.references.map(r => [r.ref_id, r]))
  const seen = new Set<string>()

  for (const cited of llmRefs) {
    const raw = String(cited?.ref_id ?? '').trim()
    const id = raw.replace(/^\[(.+)\]$/, '$1').trim()
    if (!id) continue
    const meta = refLookup.get(id)
    if (!meta) {
      unknownCitedRefs.push(id)
      continue
    }
    if (seen.has(id)) continue
    seen.add(id)
    evidenceReferences.push({
      ...meta,
      used_for: (cited?.used_for || '').trim() || 'Unspecified',
    })
  }

  // Pass 2 — fallback if LLM emitted nothing despite chunks being available.
  if (evidenceReferences.length === 0 && ragContext.references.length > 0) {
    citationsReconstructed = true
    const fallbackRefs = usedValidRefs.size > 0
      ? ragContext.references.filter(r => usedValidRefs.has(r.ref_id))
      : ragContext.references
    console.log(
      `${tag} Reconstructing ${fallbackRefs.length} citation(s) — LLM emitted empty evidence_references despite ${ragContext.totalChunks} chunks provided ` +
        `(narrative-cited: ${usedValidRefs.size}, full-fallback: ${usedValidRefs.size === 0})`
    )
    for (const ref of fallbackRefs) {
      evidenceReferences.push({
        ...ref,
        used_for: 'Référence fournie au modèle (mapping détaillé non précisé par le LLM)',
      })
    }
  }

  if (unknownCitedRefs.length > 0) {
    console.error(
      `${tag} LLM cited unknown ref(s): ${unknownCitedRefs.join(', ')} — known: ${ragContext.references.map(r => r.ref_id).join(', ')}`
    )
  }
  console.log(
    `${tag} Final evidence_references count: ${evidenceReferences.length}/${ragContext.references.length} ` +
      `(reconstructed: ${citationsReconstructed})`
  )

  return {
    evidenceReferences,
    unknownCitedRefs,
    citationsReconstructed,
    hallucinatedRefsScrubbed,
    hallucinatedRefsBreakdown,
    unusedRefsFiltered,
    refUsageByPath,
  }
}
