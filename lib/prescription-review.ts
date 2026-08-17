// lib/prescription-review.ts
//
// Clinical safety net for doctor-side edits.
//
// The report the doctor receives is AI-generated, but every line of it is
// editable: `TibokMedicalAssistant` alone exposes ten mutation callbacks
// (add/update/remove x medication/lab/imaging, plus free-text section edits)
// and none of them ever went through a clinical check. Consultation
// 5ff86fbb-4d9b-4929-a33e-70b9ff41c0b9 is the reference failure:
//
//   - the AI prescribed Paracetamol 1 g QDS + Ibuprofen gel 5% TOPICAL,
//   - the doctor added Norgesic (orphenadrine + paracetamol) on top
//     -> paracetamol prescribed twice, under two different names,
//   - and switched the ibuprofen GEL to the oral route while keeping the
//     topical posology ("apply a thin layer to the affected area"),
//   - copying Paracetamol's justification text verbatim onto Norgesic,
//     citation included.
//
// None of those three problems is visible when you look at the edited line on
// its own — they only appear when the WHOLE prescription is read at once.
// Hence: this module normalises the whole report into a reviewable snapshot,
// runs deterministic rules over it, and (in the API route) hands the same
// snapshot to an LLM for the judgement calls rules cannot make.
//
// Deterministic rules come FIRST and are never overridden by the model: a
// paracetamol duplication is arithmetic, not an opinion.

export type ReviewSeverity = "critical" | "major" | "minor" | "info"
export type ReviewTarget = "medication" | "laboratory" | "imaging" | "diagnosis"
export type ReviewSource = "rule" | "ai"

export interface ReviewAlert {
  id: string
  severity: ReviewSeverity
  target: ReviewTarget
  /** The prescription line / test / section the alert is about. */
  item: string
  /**
   * When an alert spans several lines, `item` joins them for display. This
   * holds them separately so provenance filtering can ask "did the doctor
   * touch ANY of these" — matching against the joined string never hits.
   */
  items?: string[]
  /** Stable machine-readable code, e.g. "duplicate-active-ingredient". */
  issue: string
  /** Doctor-facing explanation (French). */
  message: string
  /** Doctor-facing explanation (English). */
  messageEn: string
  /** What the doctor should do about it. */
  suggestion: string
  suggestionEn: string
  source: ReviewSource
}

/** Alerts at these levels require an explicit justification before signing. */
export const BLOCKING_SEVERITIES: ReviewSeverity[] = ["critical", "major"]

export function isBlocking(alert: ReviewAlert): boolean {
  return BLOCKING_SEVERITIES.includes(alert.severity)
}

export function countBlocking(alerts: ReviewAlert[]): number {
  return alerts.filter(isBlocking).length
}

const SEVERITY_ORDER: Record<ReviewSeverity, number> = {
  critical: 0,
  major: 1,
  minor: 2,
  info: 3,
}

export function sortAlerts(alerts: ReviewAlert[]): ReviewAlert[] {
  return [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

// ============================================================================
// Snapshot extraction
// ============================================================================

export interface MedicationSnapshot {
  index: number
  nom: string
  dci: string
  dosage: string
  forme: string
  posologie: string
  modeAdministration: string
  dureeTraitement: string
  instructions: string
  justification: string
}

export interface LabSnapshot {
  category: string
  /** Position within its own category list — what an edit has to address. */
  index: number
  nom: string
  urgence: boolean
  motifClinique: string
}

export interface ImagingSnapshot {
  index: number
  type: string
  modalite: string
  region: string
  indicationClinique: string
  urgence: boolean
}

export interface ReviewSnapshot {
  medications: MedicationSnapshot[]
  laboratory: LabSnapshot[]
  imaging: ImagingSnapshot[]
  /** Narrative report sections, keyed by their report field name. */
  narrative: Record<string, string>
}

export interface PatientContext {
  age: string
  sexe: string
  poids: string
  allergies: string
  medicalHistory: string
  currentMedications: string
  chiefComplaint: string
  diagnosis: string
}

const str = (v: any): string => (v === null || v === undefined ? "" : String(v)).trim()

/**
 * Normalise a report (general / chronic / dermatology share the `ordonnances`
 * shape) into the flat structure the review reasons about. Tolerant by
 * design: a missing branch yields an empty list, never a throw — a crash here
 * would block a doctor mid-consultation, which is exactly the failure mode
 * this whole feature exists to avoid.
 */
export function extractReviewSnapshot(report: any): ReviewSnapshot {
  const medsRaw =
    report?.ordonnances?.medicaments?.prescription?.medicaments ??
    report?.medicationPrescription?.prescription?.medicaments ??
    []

  const medications: MedicationSnapshot[] = (Array.isArray(medsRaw) ? medsRaw : []).map(
    (m: any, index: number) => ({
      index,
      nom: str(m?.nom || m?.drug || m?.medication_name),
      dci: str(m?.dci || m?.denominationCommune),
      dosage: str(m?.dosage),
      forme: str(m?.forme),
      posologie: str(m?.posologie),
      modeAdministration: str(m?.modeAdministration),
      dureeTraitement: str(m?.dureeTraitement),
      instructions: str(m?.instructions),
      justification: str(m?.justification || m?.indication),
    }),
  )

  const analyses =
    report?.ordonnances?.biologie?.prescription?.analyses ??
    report?.laboratoryTests?.prescription?.analyses ??
    {}

  const laboratory: LabSnapshot[] = []
  if (analyses && typeof analyses === "object") {
    for (const [category, list] of Object.entries(analyses)) {
      if (!Array.isArray(list)) continue
      ;(list as any[]).forEach((t, index) => {
        laboratory.push({
          category,
          index,
          nom: str(t?.nom || t?.name),
          urgence: t?.urgence === true || t?.urgent === true,
          motifClinique: str(t?.motifClinique || t?.clinicalIndication),
        })
      })
    }
  }

  const imagingRaw =
    report?.ordonnances?.imagerie?.prescription?.examens ??
    report?.paraclinicalExams?.prescription?.examens ??
    []

  const imaging: ImagingSnapshot[] = (Array.isArray(imagingRaw) ? imagingRaw : []).map(
    (e: any, index: number) => ({
      index,
      type: str(e?.type),
      modalite: str(e?.modalite || e?.modality),
      region: str(e?.region),
      indicationClinique: str(e?.indicationClinique || e?.clinicalIndication),
      urgence: e?.urgence === true || e?.urgent === true,
    }),
  )

  const rapport = report?.compteRendu?.rapport ?? report?.rapport ?? {}
  const narrative: Record<string, string> = {}
  if (rapport && typeof rapport === "object") {
    for (const [k, v] of Object.entries(rapport)) {
      if (typeof v === "string" && v.trim()) narrative[k] = v.trim()
    }
  }

  return { medications, laboratory, imaging, narrative }
}

export function extractPatientContext(report: any): PatientContext {
  const p = report?.compteRendu?.patient ?? {}
  const r = report?.compteRendu?.rapport ?? {}
  return {
    age: str(p.age),
    sexe: str(p.sexe),
    poids: str(p.poids),
    allergies: str(p.allergies),
    medicalHistory: str(p.medicalHistory),
    currentMedications: str(p.currentMedications),
    chiefComplaint: str(r.motifConsultation),
    diagnosis: str(r.conclusionDiagnostique || r.syntheseDiagnostique),
  }
}

// ============================================================================
// Diff against the AI baseline
// ============================================================================

export interface SnapshotDiff {
  medicationsAdded: string[]
  medicationsRemoved: string[]
  medicationsModified: { item: string; fields: string[] }[]
  labsAdded: string[]
  labsRemoved: string[]
  imagingAdded: string[]
  imagingRemoved: string[]
  narrativeModified: string[]
  /** No baseline available — the whole prescription is reviewed as-is. */
  baselineMissing: boolean
  hasChanges: boolean
}

const medKey = (m: MedicationSnapshot) => `${m.nom}|${m.dci}|${m.dosage}`.toLowerCase()
const labKey = (t: LabSnapshot) => `${t.category}|${t.nom}`.toLowerCase()
const imgKey = (e: ImagingSnapshot) => `${e.type}|${e.modalite}|${e.region}`.toLowerCase()

const MED_COMPARED_FIELDS: (keyof MedicationSnapshot)[] = [
  "posologie",
  "modeAdministration",
  "dureeTraitement",
  "instructions",
  "forme",
  "justification",
]

export function diffSnapshots(
  baseline: ReviewSnapshot | null | undefined,
  current: ReviewSnapshot,
): SnapshotDiff {
  const diff: SnapshotDiff = {
    medicationsAdded: [],
    medicationsRemoved: [],
    medicationsModified: [],
    labsAdded: [],
    labsRemoved: [],
    imagingAdded: [],
    imagingRemoved: [],
    narrativeModified: [],
    baselineMissing: !baseline,
    hasChanges: false,
  }

  if (!baseline) return diff

  const baseMeds = new Map(baseline.medications.map((m) => [medKey(m), m]))
  const curMeds = new Map(current.medications.map((m) => [medKey(m), m]))

  for (const [k, m] of curMeds) {
    if (!baseMeds.has(k)) {
      diff.medicationsAdded.push(medLabel(m))
      continue
    }
    const b = baseMeds.get(k)!
    const fields = MED_COMPARED_FIELDS.filter((f) => str(b[f]) !== str(m[f]))
    if (fields.length) diff.medicationsModified.push({ item: medLabel(m), fields: fields as string[] })
  }
  for (const [k, m] of baseMeds) {
    if (!curMeds.has(k)) diff.medicationsRemoved.push(medLabel(m))
  }

  const baseLabs = new Set(baseline.laboratory.map(labKey))
  const curLabs = new Set(current.laboratory.map(labKey))
  for (const t of current.laboratory) if (!baseLabs.has(labKey(t))) diff.labsAdded.push(t.nom)
  for (const t of baseline.laboratory) if (!curLabs.has(labKey(t))) diff.labsRemoved.push(t.nom)

  const baseImg = new Set(baseline.imaging.map(imgKey))
  const curImg = new Set(current.imaging.map(imgKey))
  for (const e of current.imaging) if (!baseImg.has(imgKey(e))) diff.imagingAdded.push(imagingLabel(e))
  for (const e of baseline.imaging) if (!curImg.has(imgKey(e))) diff.imagingRemoved.push(imagingLabel(e))

  for (const [k, v] of Object.entries(current.narrative)) {
    if (str(baseline.narrative[k]) !== str(v)) diff.narrativeModified.push(k)
  }
  for (const k of Object.keys(baseline.narrative)) {
    if (!(k in current.narrative)) diff.narrativeModified.push(k)
  }

  diff.hasChanges =
    diff.medicationsAdded.length > 0 ||
    diff.medicationsRemoved.length > 0 ||
    diff.medicationsModified.length > 0 ||
    diff.labsAdded.length > 0 ||
    diff.labsRemoved.length > 0 ||
    diff.imagingAdded.length > 0 ||
    diff.imagingRemoved.length > 0 ||
    diff.narrativeModified.length > 0

  return diff
}

/**
 * Labels of the medication lines the doctor added or edited. Used to keep
 * low-severity noise off lines they never touched: the report generator
 * writes placeholder strengths ("Dose individuelle") of its own accord, and
 * an alert about the AI's own output is not what the doctor is being asked
 * to review. Safety findings ignore this — see runDeterministicChecks.
 */
export function touchedMedicationLabels(diff: SnapshotDiff | null | undefined): Set<string> | null {
  if (!diff || diff.baselineMissing) return null
  return new Set([...diff.medicationsAdded, ...diff.medicationsModified.map((m) => m.item)])
}

export function medLabel(m: MedicationSnapshot): string {
  // A placeholder strength ("Dose individuelle") in the label reads as a real
  // dose and makes every alert about that line confusing — drop it.
  const dose = m.dosage && !isPlaceholderDose(m.dosage) ? m.dosage : ""
  return [m.nom || m.dci, dose].filter(Boolean).join(" ") || "Médicament sans nom"
}

export function imagingLabel(e: ImagingSnapshot): string {
  return [e.type || e.modalite, e.region].filter(Boolean).join(" — ") || "Examen sans intitulé"
}

export function labLabel(t: LabSnapshot): string {
  return t.nom || t.category || "Analyse sans intitulé"
}

/**
 * The narrative sections, and what to call them.
 *
 * The review prompt shows the model raw field names (`priseEnCharge`), the
 * report prints English titles ("MANAGEMENT PLAN"), and a doctor reading an
 * alert sees neither. All three names for one section live here so an alert
 * can be matched back to the section it is about, whichever of them the model
 * echoed.
 */
export const NARRATIVE_SECTIONS: { key: string; fr: string; en: string }[] = [
  { key: "urgenceHospitaliere", fr: "Prise en charge urgente", en: "Urgent transfer" },
  { key: "motifConsultation", fr: "Motif de consultation", en: "Chief complaint" },
  { key: "anamnese", fr: "Anamnèse", en: "History of present illness" },
  { key: "antecedents", fr: "Antécédents", en: "Past medical history" },
  { key: "examenClinique", fr: "Examen clinique", en: "Physical examination" },
  { key: "syntheseDiagnostique", fr: "Synthèse diagnostique", en: "Diagnostic synthesis" },
  { key: "conclusionDiagnostique", fr: "Conclusion diagnostique", en: "Diagnostic conclusion" },
  { key: "priseEnCharge", fr: "Prise en charge", en: "Management plan" },
  { key: "surveillance", fr: "Surveillance et suivi", en: "Follow-up plan" },
  { key: "conclusion", fr: "Conclusion", en: "Final remarks" },
]

export function narrativeLabel(key: string, language: "fr" | "en" = "fr"): string {
  const section = NARRATIVE_SECTIONS.find((s) => s.key === key)
  return section ? section[language] : key
}

// ============================================================================
// Drug knowledge — deliberately small and Mauritius-oriented
// ============================================================================
//
// This is NOT a drug database and must not grow into one. It exists so the
// deterministic rules can see through the two disguises that defeated the
// Chavetian prescription: a brand name hiding a familiar molecule, and a
// combination product hiding a SECOND molecule already prescribed elsewhere.

/** Brand / trade name -> active ingredients, lowercase. */
const BRAND_INGREDIENTS: Record<string, string[]> = {
  // Paracetamol and paracetamol-containing combinations (Mauritius formulary)
  panadol: ["paracetamol"],
  doliprane: ["paracetamol"],
  efferalgan: ["paracetamol"],
  calpol: ["paracetamol"],
  perfalgan: ["paracetamol"],
  tylenol: ["paracetamol"],
  // Norgesic: orphenadrine + paracetamol in the UK/Commonwealth (and thus
  // Mauritian) formulation. The US product pairs orphenadrine with ASPIRIN,
  // so either way a Norgesic added on top of an analgesic is a duplication
  // risk — paracetamol here, an NSAID there.
  norgesic: ["orphenadrine", "paracetamol"],
  "co-codamol": ["paracetamol", "codeine"],
  cocodamol: ["paracetamol", "codeine"],
  solpadeine: ["paracetamol", "codeine", "caffeine"],
  ultracet: ["paracetamol", "tramadol"],
  zaldiar: ["paracetamol", "tramadol"],
  panadeine: ["paracetamol", "codeine"],
  // NSAIDs
  brufen: ["ibuprofen"],
  nurofen: ["ibuprofen"],
  advil: ["ibuprofen"],
  voltaren: ["diclofenac"],
  voltarene: ["diclofenac"],
  cataflam: ["diclofenac"],
  ponstan: ["mefenamic acid"],
  naprosyn: ["naproxen"],
  celebrex: ["celecoxib"],
  arcoxia: ["etoricoxib"],
  feldene: ["piroxicam"],
  indocid: ["indomethacin"],
  mobic: ["meloxicam"],
  aspegic: ["aspirin"],
  disprin: ["aspirin"],
  // Antibiotics with a hidden second ingredient
  augmentin: ["amoxicillin", "clavulanic acid"],
  "co-amoxiclav": ["amoxicillin", "clavulanic acid"],
}

/** Canonical spellings for molecules that travel under several names. */
const INGREDIENT_ALIASES: Record<string, string> = {
  acetaminophen: "paracetamol",
  paracetamol: "paracetamol",
  "acetylsalicylic acid": "aspirin",
  "acide acetylsalicylique": "aspirin",
  asa: "aspirin",
  ibuprofene: "ibuprofen",
  diclofenac: "diclofenac",
  "diclofenac sodium": "diclofenac",
  "mefenamic acid": "mefenamic acid",
  "acide mefenamique": "mefenamic acid",
  indometacin: "indomethacin",
  indometacine: "indomethacin",
  "orphenadrine citrate": "orphenadrine",
}

const NSAIDS = new Set([
  "ibuprofen",
  "diclofenac",
  "naproxen",
  "ketoprofen",
  "piroxicam",
  "meloxicam",
  "indomethacin",
  "mefenamic acid",
  "celecoxib",
  "etoricoxib",
  "aceclofenac",
  "nimesulide",
  "ketorolac",
  "aspirin",
])

const TOPICAL_FORM_CUES = [
  "gel",
  "cream",
  "crème",
  "creme",
  "ointment",
  "pommade",
  "lotion",
  "patch",
  "emplâtre",
  "emplatre",
  "topical",
  "topique",
  "cutaneous",
  "cutané",
  "cutane",
  "spray cutané",
]

const ORAL_ROUTE_CUES = ["oral", "orale", "per os", "by mouth", "voie orale", "po"]

/** Forms that can only be swallowed. */
const ENTERAL_FORM_CUES = ["tablet", "comprime", "capsule", "gelule", "caplet", "pill", "syrup", "sirop"]

/**
 * Wording that describes an injected or infused administration. A line carrying
 * any of these cannot also be an oral tablet.
 *
 * Added after a real report prescribed intravenous sodium chloride as
 * "Form: tablet / Route: Oral / Frequency: IV infusion" — an infusion, in a
 * tablet, to be swallowed. The existing route check only knew about topical
 * forms put on an oral route, so it saw nothing.
 */
const PARENTERAL_CUES = [
  "iv infusion",
  "intravenous",
  "intraveineu",
  "perfusion",
  "intramuscular",
  "intramusculaire",
  "subcutaneous",
  "sous-cutane",
  "sous cutane",
  "im injection",
  "sc injection",
  "injectable",
]
const TOPICAL_ROUTE_CUES = ["topical", "topique", "cutaneous", "cutané", "cutane", "local", "externe", "external"]

const TOPICAL_INSTRUCTION_CUES = [
  "apply",
  "appliquer",
  "thin layer",
  "fine couche",
  "affected area",
  "zone affectée",
  "zone affectee",
  "rub",
  "masser",
  "sur la peau",
  "on the skin",
]

const normalise = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const canonicalIngredient = (name: string): string => {
  const n = normalise(name)
  return INGREDIENT_ALIASES[n] || n
}

/**
 * Best-effort active ingredients for one prescription line: the DCI field if
 * the doctor filled it, plus anything the brand name resolves to. Returns
 * canonical lowercase names, deduplicated.
 */
/** Strength and galenic wording, so "Amoxicillin 500mg tablet" reduces to the drug. */
const PRESENTATION_NOISE =
  /\b\d+(?:[.,]\d+)?\s*(?:mg|g|mcg|ug|ml|iu|ui|%)\b|\b(?:tablets?|tabs?|capsules?|caps?|gel|cream|ointment|syrup|suspension|solution|sachets?|drops?|spray|injection|suppository|patch|comprimes?|gelules?|creme|pommade|sirop|solute)\b/g

export interface ResolvedComposition {
  ingredients: string[]
  /**
   * 'known' — read from the DCI field or the brand table, so the duplication,
   *   NSAID and allergy checks are meaningful on this line.
   * 'name'  — nothing matched; the drug's own name stands in for its
   *   composition. Catches the same product prescribed twice, and nothing more:
   *   we know the label, not what is inside it.
   * 'none'  — not even a usable name.
   */
  source: "known" | "name" | "none"
}

/**
 * Resolve what a prescription line actually contains.
 *
 * The name fallback exists because the checks were blind to plainly named
 * drugs. "Amoxicillin" is not a brand and was in no list, so it resolved to
 * nothing — which meant Amoxicillin prescribed twice, under that exact name,
 * raised no duplication at all. The most obvious error possible went through.
 * Using the name itself closes that, and costs no false positive: two lines
 * bearing the same drug name are a duplication whatever the drug is.
 */
export function resolveComposition(med: MedicationSnapshot): ResolvedComposition {
  const found = new Set<string>()

  const dci = normalise(med.dci)
  if (dci) {
    // A DCI field can itself hold a combination ("paracetamol + codeine").
    for (const part of dci.split(/[+/,]| and | et /)) {
      const c = canonicalIngredient(part)
      if (c && c.length > 2) found.add(c)
    }
  }

  const haystack = normalise(`${med.nom} ${med.dci}`)
  for (const [brand, ingredients] of Object.entries(BRAND_INGREDIENTS)) {
    const b = normalise(brand)
    if (new RegExp(`(^|[^a-z])${b}([^a-z]|$)`).test(haystack)) {
      ingredients.forEach((i) => found.add(canonicalIngredient(i)))
    }
  }

  // A bare molecule typed into the brand field ("Ibuprofen gel 5%").
  for (const known of [...NSAIDS, "paracetamol", "codeine", "tramadol", "orphenadrine"]) {
    if (new RegExp(`(^|[^a-z])${known}([^a-z]|$)`).test(haystack)) found.add(known)
  }

  if (found.size) return { ingredients: [...found], source: "known" }

  const byName = normalise(med.nom || med.dci)
    .replace(PRESENTATION_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (byName.length >= 3) return { ingredients: [byName], source: "name" }
  return { ingredients: [], source: "none" }
}

/** Ingredients only. Kept for callers that do not care how they were resolved. */
export function activeIngredients(med: MedicationSnapshot): string[] {
  return resolveComposition(med).ingredients
}

/**
 * A stable key identifying WHAT a prescription line contains, for comparing two
 * lines that may be written differently.
 *
 * Used at report-generation time to stop the same molecule being prescribed
 * twice before anyone reviews it. The generator's own de-duplication compared
 * raw strings, so a patient already on "Amlodipine" was also prescribed
 * "Amlodipine 5mg" — different strings, same drug — and the duplication only
 * surfaced later, in the pre-signature review. Detecting it there was never the
 * point; not producing it is.
 *
 * Returns "" when nothing identifiable is present, which callers must treat as
 * "cannot compare" rather than as a key, or every unnamed line collides.
 */
export function compositionKey(name?: string | null, dci?: string | null): string {
  const { ingredients } = resolveComposition({
    index: 0,
    nom: str(name),
    dci: str(dci),
    dosage: "",
    forme: "",
    posologie: "",
    modeAdministration: "",
    dureeTraitement: "",
    instructions: "",
    justification: "",
  })
  return [...ingredients].sort().join("+")
}

const looksTopical = (med: MedicationSnapshot): boolean => {
  const formeAndName = normalise(`${med.forme} ${med.nom}`)
  return TOPICAL_FORM_CUES.some((cue) => formeAndName.includes(normalise(cue)))
}

const routeSaysOral = (med: MedicationSnapshot): boolean => {
  const route = normalise(med.modeAdministration)
  if (!route) return false
  return ORAL_ROUTE_CUES.some((cue) => route.includes(normalise(cue)))
}

const routeSaysTopical = (med: MedicationSnapshot): boolean => {
  const route = normalise(med.modeAdministration)
  if (!route) return false
  return TOPICAL_ROUTE_CUES.some((cue) => route.includes(normalise(cue)))
}

const instructionsSayTopical = (med: MedicationSnapshot): boolean => {
  const text = normalise(`${med.posologie} ${med.instructions}`)
  return TOPICAL_INSTRUCTION_CUES.some((cue) => text.includes(normalise(cue)))
}

/** The line describes an injection or an infusion, wherever it says so. */
const describesParenteral = (med: MedicationSnapshot): boolean => {
  const text = normalise(`${med.posologie} ${med.instructions} ${med.modeAdministration} ${med.forme}`)
  return PARENTERAL_CUES.some((cue) => text.includes(normalise(cue)))
}

/** The line is a form that can only be swallowed. */
const looksEnteralForm = (med: MedicationSnapshot): boolean => {
  const forme = normalise(med.forme)
  return ENTERAL_FORM_CUES.some((cue) => forme.includes(normalise(cue)))
}

/** Systemic = anything not clearly a topical/local preparation. */
const isSystemic = (med: MedicationSnapshot): boolean => !looksTopical(med) && !routeSaysTopical(med)

// ---- dose arithmetic -------------------------------------------------------

/** "1 g" / "1000mg" / "500 mg" -> milligrams. null when unparseable. */
function parseDoseMg(dosage: string): number | null {
  const m = normalise(dosage).match(/(\d+(?:[.,]\d+)?)\s*(mg|g|mcg|µg)/)
  if (!m) return null
  const value = parseFloat(m[1].replace(",", "."))
  if (!isFinite(value)) return null
  switch (m[2]) {
    case "g":
      return value * 1000
    case "mcg":
    case "µg":
      return value / 1000
    default:
      return value
  }
}

/** Doses per day from a posology string. null when unparseable. */
function parseDailyFrequency(posologie: string): number | null {
  const p = normalise(posologie)
  if (!p) return null

  if (/\b(qds|qid)\b/.test(p)) return 4
  if (/\b(tds|tid)\b/.test(p)) return 3
  if (/\bbd\b|\bbid\b/.test(p)) return 2
  if (/\b(od|daily|once a day|une fois par jour)\b/.test(p)) return 1

  // "3 times daily", "3 fois par jour", "x3/j", "3/day"
  const times = p.match(/(\d+)\s*(?:x|times?|fois)?\s*(?:\/|per|par)?\s*(?:day|jour|j)\b/)
  if (times) {
    const n = parseInt(times[1], 10)
    if (n > 0 && n <= 12) return n
  }
  const xForm = p.match(/\bx\s*(\d+)\b/)
  if (xForm) {
    const n = parseInt(xForm[1], 10)
    if (n > 0 && n <= 12) return n
  }

  // "every 6 hours" / "toutes les 6 heures"
  const everyH = p.match(/(?:every|toutes les|q)\s*(\d+)\s*(?:h|hours?|heures?)/)
  if (everyH) {
    const h = parseInt(everyH[1], 10)
    if (h > 0 && h <= 24) return Math.floor(24 / h)
  }

  return null
}

/** Units taken per administration ("2 tablets", "1 comprimé"). Defaults to 1. */
function parseUnitsPerDose(posologie: string): number {
  const p = normalise(posologie)
  const m = p.match(/(\d+)\s*(?:tablets?|tabs?|comprimes?|capsules?|gelules?)/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (n > 0 && n <= 10) return n
  }
  return 1
}

const PLACEHOLDER_DOSES = [
  "dose individuelle",
  "individual dose",
  "as directed",
  "as prescribed",
  "selon prescription",
  "selon avis medical",
  "n a",
  "na",
  "non precise",
  "not specified",
]

/** True for a strength field that carries no dispensable dose. */
function isPlaceholderDose(dosage: string): boolean {
  const d = normalise(dosage)
  if (!d) return true
  if (PLACEHOLDER_DOSES.includes(d)) return true
  // Anything without a digit is not a strength ("one tablet", "variable").
  return !/\d/.test(d)
}

const PARACETAMOL_MAX_DAILY_MG = 4000

// ============================================================================
// Deterministic rules
// ============================================================================

let alertCounter = 0
const nextId = (prefix: string) => `${prefix}-${++alertCounter}`

/**
 * Acts that are ordered, but never from a laboratory.
 *
 * Matched on the test's own name, after normalisation. Every entry is a phrase
 * rather than a word, because the words alone are treacherous: "blood culture"
 * and "blood glucose" are proper laboratory tests, and only "blood pressure"
 * is not. Anything uncertain is left out — a false alert on a real test costs
 * more trust than a missed one costs safety, since the doctor still reads the
 * form.
 */
const NOT_A_LABORATORY_TEST: { pattern: RegExp; fr: string; en: string }[] = [
  // Vital signs — measured on the patient, not drawn from them.
  { pattern: /\bblood pressure\b|\btension arterielle\b|\bpression arterielle\b|\bmapa\b/, fr: "une mesure de tension artérielle", en: "a blood pressure measurement" },
  { pattern: /\bheart rate\b|\bpulse rate\b|\bfrequence cardiaque\b/, fr: "une mesure de fréquence cardiaque", en: "a heart rate measurement" },
  { pattern: /\brespiratory rate\b|\bfrequence respiratoire\b/, fr: "une mesure de fréquence respiratoire", en: "a respiratory rate measurement" },
  { pattern: /\boxygen saturation\b|\bpulse oximetry\b|\bspo2\b|\bsaturation en oxygene\b|\boxymetrie\b/, fr: "une mesure de saturation en oxygène", en: "an oxygen saturation measurement" },
  { pattern: /\bbody temperature\b|^temperature$/, fr: "une prise de température", en: "a temperature reading" },
  { pattern: /^weight$|^body weight$|^poids$|^height$|^taille$|^bmi$|^imc$/, fr: "une mesure anthropométrique", en: "an anthropometric measurement" },

  // Functional tests — performed on the patient by a clinician or a device.
  { pattern: /\becg\b|\bekg\b|\belectrocardiogram\b|\belectrocardiogramme\b|\bholter\b/, fr: "un examen électrocardiographique", en: "an electrocardiographic examination" },
  { pattern: /\bspirometry\b|\bspirometrie\b|\bpeak flow\b|\bdebit de pointe\b/, fr: "une exploration fonctionnelle respiratoire", en: "a respiratory function test" },
  { pattern: /\bfundoscopy\b|\bophthalmoscopy\b|\bfond d oeil\b/, fr: "un examen ophtalmologique", en: "an eye examination" },
  { pattern: /\bphysical examination\b|\bexamen clinique\b/, fr: "un examen clinique", en: "a physical examination" },

  // Imaging — belongs on the radiology request, not the laboratory one.
  { pattern: /\bx[ -]?ray\b|\bradiograph\w*\b|\bct scan\b|\bscanner\b|\bmri\b|\birm\b|\bultrasound\b|\bechograph\w*\b|\becographie\b|\bechographie\b|\bdoppler\b|\bmammograph\w*\b|\bechocardiograph\w*\b/, fr: "un examen d'imagerie", en: "an imaging study" },
]

/**
 * Rules that do not need a model. These always run, always win, and are the
 * reason the feature catches the Chavetian case even if the LLM is down.
 */
export function runDeterministicChecks(
  snapshot: ReviewSnapshot,
  patient: PatientContext,
  /**
   * Medication lines the doctor added or edited. When known, minor/info
   * findings on the OTHER lines are dropped — they describe the AI's own
   * output, which the doctor is not being asked to answer for. Critical and
   * major findings are never filtered: a duplication is dangerous whichever
   * of the two lines was typed by a human.
   */
  touched?: Set<string> | null,
): ReviewAlert[] {
  const alerts: ReviewAlert[] = []
  const meds = snapshot.medications

  // --- 1. Same active ingredient prescribed twice systemically -------------
  const byIngredient = new Map<string, MedicationSnapshot[]>()
  for (const med of meds) {
    if (!isSystemic(med)) continue
    for (const ing of activeIngredients(med)) {
      if (!byIngredient.has(ing)) byIngredient.set(ing, [])
      byIngredient.get(ing)!.push(med)
    }
  }

  for (const [ingredient, group] of byIngredient) {
    if (group.length < 2) continue
    const labels = group.map(medLabel)
    alerts.push({
      id: nextId("dup"),
      severity: "critical",
      target: "medication",
      item: labels.join(" + "),
      items: labels,
      issue: "duplicate-active-ingredient",
      message: `${labels.join(" et ")} contiennent tous les deux du ${ingredient}. Le patient recevrait la même molécule deux fois, sous deux noms différents — risque de surdosage.`,
      messageEn: `${labels.join(" and ")} both contain ${ingredient}. The patient would receive the same molecule twice under two different names — overdose risk.`,
      suggestion: `Retirer l'un des deux, ou vérifier la composition exacte de la spécialité avant de signer.`,
      suggestionEn: `Remove one of them, or verify the exact composition of the branded product before signing.`,
      source: "rule",
    })
  }

  // --- 2. Two systemic NSAIDs ----------------------------------------------
  const nsaidMeds = meds.filter(
    (m) => isSystemic(m) && activeIngredients(m).some((i) => NSAIDS.has(i)),
  )
  const distinctNsaids = new Set(
    nsaidMeds.flatMap((m) => activeIngredients(m).filter((i) => NSAIDS.has(i))),
  )
  if (distinctNsaids.size >= 2) {
    alerts.push({
      id: nextId("nsaid"),
      severity: "critical",
      target: "medication",
      item: nsaidMeds.map(medLabel).join(" + "),
      items: nsaidMeds.map(medLabel),
      issue: "multiple-nsaids",
      message: `Deux AINS systémiques sont prescrits simultanément (${[...distinctNsaids].join(", ")}). L'association n'augmente pas l'efficacité antalgique et multiplie le risque digestif et rénal.`,
      messageEn: `Two systemic NSAIDs are prescribed together (${[...distinctNsaids].join(", ")}). The combination adds no analgesic benefit and multiplies gastrointestinal and renal risk.`,
      suggestion: `N'en garder qu'un seul.`,
      suggestionEn: `Keep only one.`,
      source: "rule",
    })
  }

  // --- 3. Route / galenic form incoherence ---------------------------------
  for (const med of meds) {
    // An injection or infusion written as something to swallow. Checked before
    // the topical rules because it is the more dangerous mismatch: the product
    // is either undeliverable or, if a nurse follows the wording, given by the
    // wrong route entirely.
    if (describesParenteral(med) && (looksEnteralForm(med) || routeSaysOral(med))) {
      alerts.push({
        id: nextId("parenteral"),
        severity: "critical",
        target: "medication",
        item: medLabel(med),
        issue: "parenteral-route-mismatch",
        message: `${medLabel(med)} décrit une administration injectable ou en perfusion, mais la ligne indique une forme « ${med.forme || "orale"} » par « ${med.modeAdministration || "voie orale"} ». Une perfusion ne s'avale pas, et cette ordonnance est inexécutable telle quelle.`,
        messageEn: `${medLabel(med)} describes an injected or infused administration, yet the line reads form "${med.forme || "oral"}" by "${med.modeAdministration || "oral route"}". An infusion cannot be swallowed, and this prescription cannot be dispensed as written.`,
        suggestion: `Corriger la voie et la forme, ou retirer cette ligne de l'ordonnance de ville si le traitement est administré à l'hôpital.`,
        suggestionEn: `Correct the route and form, or remove this line from the outpatient prescription if the treatment is given in hospital.`,
        source: "rule",
      })
      continue
    }

    const topicalForm = looksTopical(med)
    if (topicalForm && routeSaysOral(med)) {
      alerts.push({
        id: nextId("route"),
        severity: "critical",
        target: "medication",
        item: medLabel(med),
        issue: "route-form-mismatch",
        message: `${medLabel(med)} est une forme locale (${med.forme || "gel/crème"}) mais la voie d'administration indique « ${med.modeAdministration} ». Une forme cutanée ne doit jamais être avalée.`,
        messageEn: `${medLabel(med)} is a topical preparation (${med.forme || "gel/cream"}) but the route of administration reads "${med.modeAdministration}". A cutaneous form must never be swallowed.`,
        suggestion: `Corriger la voie en « voie cutanée / topique », ou remplacer par la forme orale correspondante avec une posologie orale.`,
        suggestionEn: `Set the route to "topical/cutaneous", or switch to the matching oral form with an oral posology.`,
        source: "rule",
      })
    } else if (!topicalForm && routeSaysOral(med) && instructionsSayTopical(med)) {
      alerts.push({
        id: nextId("posology"),
        severity: "major",
        target: "medication",
        item: medLabel(med),
        issue: "topical-posology-oral-route",
        message: `${medLabel(med)} est prescrit par voie orale mais la posologie décrit une application locale (« ${med.posologie || med.instructions} »). La posologie n'a pas été mise à jour après le changement de voie.`,
        messageEn: `${medLabel(med)} is prescribed orally but the posology describes a local application ("${med.posologie || med.instructions}"). The posology was not updated after the route change.`,
        suggestion: `Écrire une posologie orale explicite (dose, nombre de prises, durée).`,
        suggestionEn: `Write an explicit oral posology (dose, number of intakes, duration).`,
        source: "rule",
      })
    }
  }

  // --- 4. Cumulative paracetamol -------------------------------------------
  let paracetamolDaily = 0
  let paracetamolParsed = false
  const paracetamolLines: string[] = []
  for (const med of meds) {
    if (!isSystemic(med)) continue
    if (!activeIngredients(med).includes("paracetamol")) continue
    paracetamolLines.push(medLabel(med))
    const dose = parseDoseMg(med.dosage)
    const freq = parseDailyFrequency(med.posologie)
    if (dose !== null && freq !== null) {
      paracetamolDaily += dose * freq * parseUnitsPerDose(med.posologie)
      paracetamolParsed = true
    }
  }
  if (paracetamolParsed && paracetamolDaily > PARACETAMOL_MAX_DAILY_MG) {
    alerts.push({
      id: nextId("dose"),
      severity: "critical",
      target: "medication",
      item: paracetamolLines.join(" + "),
      items: paracetamolLines,
      issue: "paracetamol-max-daily-dose",
      message: `La dose quotidienne cumulée de paracétamol atteint ${Math.round(paracetamolDaily)} mg, au-dessus du maximum de ${PARACETAMOL_MAX_DAILY_MG} mg/24 h chez l'adulte. Risque d'hépatotoxicité.`,
      messageEn: `Cumulative daily paracetamol reaches ${Math.round(paracetamolDaily)} mg, above the ${PARACETAMOL_MAX_DAILY_MG} mg/24 h adult maximum. Hepatotoxicity risk.`,
      suggestion: `Réduire la posologie ou supprimer la source redondante de paracétamol.`,
      suggestionEn: `Reduce the posology or remove the redundant paracetamol source.`,
      source: "rule",
    })
  }

  // --- 5. Known allergy -----------------------------------------------------
  const allergyText = normalise(patient.allergies)
  const hasNoKnownAllergy =
    !allergyText ||
    allergyText.includes("nkda") ||
    allergyText.includes("no known") ||
    allergyText.includes("aucune") ||
    allergyText.includes("pas d allergie")

  if (!hasNoKnownAllergy) {
    for (const med of meds) {
      const hits = activeIngredients(med).filter((ing) =>
        new RegExp(`(^|[^a-z])${ing}([^a-z]|$)`).test(allergyText),
      )
      if (hits.length) {
        alerts.push({
          id: nextId("allergy"),
          severity: "critical",
          target: "medication",
          item: medLabel(med),
          issue: "allergy-conflict",
          message: `${medLabel(med)} contient ${hits.join(", ")}, déclaré dans les allergies du patient (« ${patient.allergies} »).`,
          messageEn: `${medLabel(med)} contains ${hits.join(", ")}, which is listed in the patient's allergies ("${patient.allergies}").`,
          suggestion: `Choisir une alternative d'une autre classe.`,
          suggestionEn: `Choose an alternative from a different class.`,
          source: "rule",
        })
      }
    }
  }

  // --- 6. Justification copied from another line ---------------------------
  // Pure data-quality, but it is the fingerprint of a copy-pasted prescription
  // line: on the reference consultation the added Norgesic carried
  // Paracetamol's justification verbatim, citation included.
  const justificationOwners = new Map<string, string[]>()
  for (const med of meds) {
    const j = normalise(med.justification)
    if (j.length < 40) continue
    if (!justificationOwners.has(j)) justificationOwners.set(j, [])
    justificationOwners.get(j)!.push(medLabel(med))
  }
  for (const [, owners] of justificationOwners) {
    if (owners.length < 2) continue
    alerts.push({
      id: nextId("copy"),
      severity: "minor",
      target: "medication",
      item: owners.join(" + "),
      items: owners,
      issue: "duplicated-justification",
      message: `${owners.join(" et ")} portent exactement la même justification clinique. Elle a probablement été recopiée d'une ligne à l'autre et ne décrit pas l'indication réelle du second produit.`,
      messageEn: `${owners.join(" and ")} carry exactly the same clinical justification. It was most likely copied from one line to the other and does not describe the second product's actual indication.`,
      suggestion: `Réécrire la justification propre à chaque médicament.`,
      suggestionEn: `Rewrite a justification specific to each medication.`,
      source: "rule",
    })
  }

  // --- 7. Incomplete prescription lines ------------------------------------
  for (const med of meds) {
    const missing: string[] = []
    if (!med.posologie) missing.push("posologie")
    if (!med.dureeTraitement) missing.push("durée")
    // A placeholder counts as missing: "Dose individuelle" is what the report
    // generator writes when it has no strength, and a pharmacist cannot
    // dispense against it any more than against a blank field.
    if (!med.dosage || isPlaceholderDose(med.dosage)) missing.push("dosage")
    if (missing.length) {
      alerts.push({
        id: nextId("incomplete"),
        severity: "minor",
        target: "medication",
        item: medLabel(med),
        issue: "incomplete-prescription-line",
        message: `${medLabel(med)} : ${missing.join(", ")} manquant(s). Une ordonnance incomplète est inexécutable en pharmacie.`,
        messageEn: `${medLabel(med)}: missing ${missing.join(", ")}. An incomplete prescription cannot be dispensed.`,
        suggestion: `Compléter la ligne avant signature.`,
        suggestionEn: `Complete the line before signing.`,
        source: "rule",
      })
    }
  }

  // --- 8. Composition we could not verify ----------------------------------
  // Turns a silence into a question. When a line resolves only through its own
  // name, the duplication, NSAID and allergy checks ran against a label rather
  // than a molecule — so they proved nothing, and the doctor would otherwise
  // read the resulting quiet as "checked, all clear". Info severity, never
  // blocking, and the provenance filter below keeps it to lines the doctor
  // touched: the AI's own lines are not theirs to answer for. Only worth
  // saying when there is something else it could collide with.
  if (meds.length > 1) {
    for (const med of meds) {
      if (resolveComposition(med).source !== "name") continue

      // Saying "the duplication check could not run on this line" directly
      // under a duplication alert about that same line reads as a system that
      // does not know what it just did. When the name fallback was enough to
      // find something, there is nothing to warn about.
      const label = medLabel(med)
      const alreadyFlagged = alerts.some(
        (a) => a.item === label || a.items?.includes(label),
      )
      if (alreadyFlagged) continue

      alerts.push({
        id: nextId("unverified"),
        severity: "info",
        target: "medication",
        item: medLabel(med),
        issue: "unverified-composition",
        message: `La composition de ${medLabel(med)} n'est pas connue du système. Les contrôles automatiques de doublon, d'AINS et d'allergie n'ont pas pu s'appliquer à cette ligne.`,
        messageEn: `The composition of ${medLabel(med)} is not known to the system. The automatic duplication, NSAID and allergy checks could not be applied to this line.`,
        suggestion: `Vérifiez vous-même qu'elle ne fait pas doublon avec les autres médicaments prescrits. Renseigner la DCI rend le contrôle automatique opérant.`,
        suggestionEn: `Check yourself that it does not duplicate another prescribed medication. Filling in the INN makes the automatic check work.`,
        source: "rule",
      })
    }
  }

  // --- 9. An act that is not a laboratory test, on the laboratory form ------
  //
  // A real report sent "Blood pressure measurement" to the laboratory, under
  // HEMATOLOGY, with a tube type and a turnaround time. You cannot draw a
  // blood pressure. The laboratory receives a request it can never honour, and
  // the doctor believes they ordered a measurement that will never be taken.
  //
  // The relevance pass the model runs cannot catch this: a blood pressure IS
  // warranted in that patient. It is the right act on the wrong document, and
  // the list of things that are not drawn from a sample is finite — so this is
  // arithmetic, not judgement, and belongs here rather than in a prompt.
  for (const test of snapshot.laboratory) {
    const name = normalise(test.nom)
    if (!name) continue

    const misplaced = NOT_A_LABORATORY_TEST.find((entry) => entry.pattern.test(name))
    if (!misplaced) continue

    const label = labLabel(test)
    alerts.push({
      id: nextId("not-a-lab"),
      severity: "major",
      target: "laboratory",
      item: label,
      issue: "not-a-laboratory-test",
      message: `« ${label} » ne se prélève pas : c'est ${misplaced.fr}, pas une analyse de laboratoire. Le laboratoire recevra une demande qu'il ne peut pas honorer, et la mesure ne sera jamais faite.`,
      messageEn: `"${label}" cannot be sampled: it is ${misplaced.en}, not a laboratory test. The laboratory will receive a request it cannot fulfil, and the measurement will never be taken.`,
      suggestion: `Retirer cette ligne de la demande d'analyses. Si la mesure est nécessaire, elle relève de l'examen clinique ou du suivi, à consigner dans le rapport.`,
      suggestionEn: `Remove this line from the laboratory request. If the measurement is needed, it belongs to the examination or the follow-up plan, recorded in the report.`,
      source: "rule",
    })
  }

  const relevant = touched
    ? alerts.filter(
        (a) =>
          isBlocking(a) ||
          (a.items?.length ? a.items.some((i) => touched.has(i)) : touched.has(a.item)),
      )
    : alerts

  return sortAlerts(relevant)
}

// ============================================================================
// Merge
// ============================================================================

/**
 * Findings the deterministic rules OWN.
 *
 * Each entry pairs the rule issues that state a problem exhaustively with the
 * shapes the model uses when it restates the same thing in its own words. When
 * a rule has already reported a family on a given prescription line, a model
 * alert of that family on that same line is dropped.
 *
 * This exists because asking did not work. The prompt has been told three
 * times, in increasingly explicit wording, not to repeat a rule finding, and
 * the model repeated one on the next run every time — a duplication renamed
 * "duplicate-paracetamol", then the very same 8 g/day paracetamol arithmetic
 * the rule had just computed, graded one notch lower.
 *
 * Kept to families where the rule is arithmetic or exhaustive and the model
 * can add nothing. Route/form and NSAID findings are deliberately NOT here:
 * "this NSAID is contraindicated pending dengue exclusion" is a different
 * problem from "two NSAIDs together", and losing it would cost more than the
 * noise it saves.
 */
const RULE_OWNED_FAMILIES: { rules: string[]; aiIssue: RegExp }[] = [
  {
    rules: ["duplicate-active-ingredient"],
    aiIssue: /duplicat|doublon|redundan/i,
  },
  {
    rules: ["paracetamol-max-daily-dose"],
    aiIssue: /dose|dosage|posolog|overdose|surdos|hepatotox|maximum/i,
  },
  {
    rules: ["incomplete-prescription-line"],
    aiIssue: /incomplete|missing|absent|unspecified/i,
  },
]

/**
 * Merge rule alerts with model alerts. Rules win: when the model raises the
 * same issue on the same item, its version is dropped.
 *
 * The exact-key match is not enough on its own. Told three times, in
 * increasingly explicit prompt wording, not to repeat a finding the rules had
 * already made, the model still re-raised a paracetamol duplication under a
 * different issue name and a shorter item label — and graded it MAJOR where
 * the rule had graded it CRITICAL. Two alerts for one problem at two
 * severities is worse than either alone, so the duplication family is now
 * filtered here rather than asked for politely.
 *
 * Deliberately narrow: it drops only duplication findings on a line the rules
 * already flagged for duplication. A different problem on the same line — a
 * sedating ingredient, a contraindication against the management plan — has a
 * different issue name and survives, which is the whole point of the layer.
 */
/**
 * One card per thing, even when the model says it twice.
 *
 * A real review came back with two alerts on the same CT request: "not
 * indicated for a headache" and "the stated indication is clinically
 * incoherent" — one finding, split in two, doubling the count the doctor is
 * asked to work through and making two corrections look necessary where one
 * was.
 *
 * Grouping is by target and item, and only among the model's own findings.
 * The rules are left alone: two rule alerts on the same pair of lines are two
 * different problems by construction (the same molecule twice, AND above the
 * daily ceiling), and each needs its own answer.
 *
 * Nothing is thrown away. The severest alert carries the card, and the other
 * wordings are appended, so a second angle on the same problem is still read
 * — it just no longer counts as a second problem.
 */
function joinDistinct(parts: (string | undefined)[]): string {
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const text = (part || "").trim()
    if (!text) continue
    const key = normalise(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out.join(" ")
}

function collapseAiAlerts(alerts: ReviewAlert[]): ReviewAlert[] {
  const groups = new Map<string, ReviewAlert[]>()
  const order: string[] = []

  for (const alert of alerts) {
    const key = `${alert.target}|${normalise(alert.item)}`
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(alert)
  }

  return order.map((key) => {
    const group = groups.get(key)!
    if (group.length === 1) return group[0]

    const worst = [...group].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    )[0]

    return {
      ...worst,
      message: joinDistinct(group.map((a) => a.message)),
      messageEn: joinDistinct(group.map((a) => a.messageEn)),
      suggestion: joinDistinct(group.map((a) => a.suggestion)),
      suggestionEn: joinDistinct(group.map((a) => a.suggestionEn)),
    }
  })
}

export function mergeAlerts(ruleAlerts: ReviewAlert[], aiAlerts: ReviewAlert[]): ReviewAlert[] {
  const seen = new Set(ruleAlerts.map((a) => `${a.issue}|${normalise(a.item)}`))

  // Per family: the lines a rule already covered.
  const coveredByFamily = RULE_OWNED_FAMILIES.map((family) => ({
    aiIssue: family.aiIssue,
    items: ruleAlerts
      .filter((a) => family.rules.includes(a.issue))
      .flatMap((a) => (a.items?.length ? a.items : [a.item]))
      .map(normalise)
      .filter(Boolean),
  })).filter((f) => f.items.length > 0)

  const keptAi: ReviewAlert[] = []
  for (const a of aiAlerts) {
    const key = `${a.issue}|${normalise(a.item)}`
    if (seen.has(key)) continue

    const aiItem = normalise(a.item)
    const alreadyOwned = coveredByFamily.some(
      (family) =>
        family.aiIssue.test(a.issue) &&
        family.items.some((ruleItem) => aiItem.includes(ruleItem) || ruleItem.includes(aiItem)),
    )
    if (alreadyOwned) continue

    seen.add(key)
    keptAi.push(a)
  }
  return sortAlerts([...ruleAlerts, ...collapseAiAlerts(keptAi)])
}
