"use client"

// components/vital-signs-disclaimer.tsx
// Red disclaimer shown in the Vital Signs section prompting the doctor to
// verify a vital in real time (patient shows their thermometer / BP monitor /
// glucometer on camera).
//
// Two layers (hybrid), merged so the AI can only ADD alerts, never remove:
//   1. Heuristic (getVitalAlerts) — instant, deterministic, offline-safe.
//      Value thresholds are authoritative:
//        - Temperature > 38°C            (fever)
//        - Blood pressure >= 140 / 90    (hypertension)
//        - Blood glucose  > 1.26 g/L     (hyperglycemia)
//      Text/symptom triggers are high-specificity only (no noisy singletons
//      like "fatigue" / lone "headache").
//   2. AI (useVitalAlerts hook -> /api/vital-signs-disclaimer) — reads the
//      Chief Complaint + Disease History free text to catch nuanced cases the
//      keywords miss. Debounced; falls back to the heuristic on any error.

import * as React from "react"
import { AlertTriangle } from "lucide-react"

export type VitalLanguage = "fr" | "en"

interface VitalAlertInput {
  temperature?: string | number
  systolic?: string | number
  diastolic?: string | number
  glucose?: string | number
  symptoms?: string[]
  chiefComplaint?: string
  diseaseHistory?: string
}

export interface VitalAlerts {
  temperatureAlert: boolean
  bloodPressureAlert: boolean
  glucoseAlert: boolean
}

const toNumber = (v: any): number | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (s === "" || s.toUpperCase() === "N/A") return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// High-specificity clinical terms (FR + EN). Intentionally conservative:
// non-specific singletons (fatigue, isolated headache/dizziness/blurred vision)
// are left to the AI layer to avoid false positives.
const TEMP_TERMS = [
  "fever", "fièvre", "fievre", "febrile", "fébrile", "pyrexia", "pyrexie",
  "chills", "frisson", "rigor", "night sweats", "sueurs nocturnes",
  "hyperthermi", "high temperature", "température élevée", "temperature elevee",
]
const BP_TERMS = [
  "hypertension", "hypertend", "high blood pressure", "tension élevée",
  "tension haute", "hta", "hypertensive", "pression artérielle élevée",
  "severe headache", "céphalée intense", "cephalee intense", "mal de tête intense",
  "chest pain", "douleur thoracique", "palpitation",
  "epistaxis", "épistaxis", "nosebleed", "stroke", "avc",
]
const GLUCOSE_TERMS = [
  "diabet", "diabète", "diabétique", "diabetique",
  "hyperglyc", "hypoglyc", "glycémie", "glycemie", "blood sugar", "sugar level",
  "polyuria", "polyurie", "polydipsia", "polydipsie", "polyphagia", "polyphagie",
  "excessive thirst", "soif intense", "frequent urination",
  "urines fréquentes", "mictions fréquentes",
]

const textMatches = (haystack: string, terms: string[]): boolean =>
  terms.some((t) => haystack.includes(t))

/**
 * Deterministic decision: which vitals should raise the real-time
 * verification disclaimer, from entered values + a high-specificity scan of
 * symptoms and the Chief Complaint / Disease History free text.
 */
export function getVitalAlerts(input: VitalAlertInput): VitalAlerts {
  const temp = toNumber(input.temperature)
  const sys = toNumber(input.systolic)
  const dia = toNumber(input.diastolic)
  const glu = toNumber(input.glucose)

  const haystack = [
    ...(input.symptoms || []),
    input.chiefComplaint || "",
    input.diseaseHistory || "",
  ]
    .filter(Boolean)
    .join(" · ")
    .toLowerCase()

  const temperatureAlert =
    (temp !== null && temp > 38) || textMatches(haystack, TEMP_TERMS)

  const bloodPressureAlert =
    (sys !== null && sys >= 140) ||
    (dia !== null && dia >= 90) ||
    textMatches(haystack, BP_TERMS)

  const glucoseAlert =
    (glu !== null && glu > 1.26) || textMatches(haystack, GLUCOSE_TERMS)

  return { temperatureAlert, bloodPressureAlert, glucoseAlert }
}

/**
 * Hybrid hook: heuristic (instant) merged with a debounced AI pass that can
 * only ADD alerts. Any AI error/timeout leaves the heuristic result intact.
 */
export function useVitalAlerts(input: VitalAlertInput): VitalAlerts {
  const heuristic = getVitalAlerts(input)

  const [aiAlerts, setAiAlerts] = React.useState<Partial<VitalAlerts>>({})
  const abortRef = React.useRef<AbortController | null>(null)

  const chiefComplaint = (input.chiefComplaint || "").trim()
  const diseaseHistory = (input.diseaseHistory || "").trim()
  const symptomsKey = (input.symptoms || []).join("|")

  React.useEffect(() => {
    const text = `${chiefComplaint} ${diseaseHistory}`.trim()
    // Nothing meaningful to analyse -> drop any previous AI alerts.
    if (text.length < 4 && !symptomsKey) {
      setAiAlerts({})
      return
    }

    const handle = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const timeout = setTimeout(() => controller.abort(), 12000)

      fetch("/api/vital-signs-disclaimer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint,
          diseaseHistory,
          symptoms: input.symptoms || [],
        }),
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.success && data.alerts) {
            setAiAlerts({
              temperatureAlert: data.alerts.temperature === true,
              bloodPressureAlert: data.alerts.bloodPressure === true,
              glucoseAlert: data.alerts.glucose === true,
            })
          }
        })
        .catch(() => {
          /* network/abort/timeout -> keep heuristic only */
        })
        .finally(() => clearTimeout(timeout))
    }, 800)

    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiefComplaint, diseaseHistory, symptomsKey])

  return {
    temperatureAlert: heuristic.temperatureAlert || aiAlerts.temperatureAlert === true,
    bloodPressureAlert: heuristic.bloodPressureAlert || aiAlerts.bloodPressureAlert === true,
    glucoseAlert: heuristic.glucoseAlert || aiAlerts.glucoseAlert === true,
  }
}

const TEXT = {
  fr: {
    title: "Vérification en temps réel requise",
    intro:
      "Une ou plusieurs constantes sont élevées ou évoquées par le tableau clinique. Demandez au patient de reprendre la mesure et de présenter son appareil à la caméra pour confirmer la valeur en direct :",
    temperature:
      "Température élevée — demandez au patient de montrer son thermomètre et de reprendre la mesure en direct.",
    bloodPressure:
      "Tension élevée — demandez au patient de montrer son tensiomètre et de reprendre la mesure en direct.",
    glucose:
      "Glycémie élevée — demandez au patient de montrer son glucomètre et de reprendre la mesure en direct.",
  },
  en: {
    title: "Real-time verification required",
    intro:
      "One or more vitals are elevated or suggested by the clinical picture. Ask the patient to re-measure and show their device on camera to confirm the value live:",
    temperature:
      "Elevated temperature — ask the patient to show their thermometer and re-measure live.",
    bloodPressure:
      "Elevated blood pressure — ask the patient to show their BP monitor and re-measure live.",
    glucose:
      "Elevated blood glucose — ask the patient to show their glucometer and re-measure live.",
  },
} as const

interface VitalSignsDisclaimerProps extends Partial<VitalAlerts> {
  language?: VitalLanguage
  className?: string
}

export default function VitalSignsDisclaimer({
  temperatureAlert,
  bloodPressureAlert,
  glucoseAlert,
  language = "fr",
  className,
}: VitalSignsDisclaimerProps) {
  if (!temperatureAlert && !bloodPressureAlert && !glucoseAlert) return null
  const t = TEXT[language] ?? TEXT.fr

  return (
    <div
      role="alert"
      className={`mt-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 ${className || ""}`}
    >
      <div className="flex items-center gap-2 font-semibold text-red-700">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        {t.title}
      </div>
      <p className="mt-1 text-sm text-red-700">{t.intro}</p>
      <ul className="mt-2 space-y-1 text-sm font-medium text-red-800">
        {temperatureAlert && (
          <li className="flex gap-2">
            <span aria-hidden>🌡️</span>
            <span>{t.temperature}</span>
          </li>
        )}
        {bloodPressureAlert && (
          <li className="flex gap-2">
            <span aria-hidden>🩺</span>
            <span>{t.bloodPressure}</span>
          </li>
        )}
        {glucoseAlert && (
          <li className="flex gap-2">
            <span aria-hidden>🩸</span>
            <span>{t.glucose}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
