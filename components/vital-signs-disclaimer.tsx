"use client"

// components/vital-signs-disclaimer.tsx
// Red disclaimer shown in the Vital Signs section prompting the doctor to
// verify a vital in real time (patient shows their thermometer / BP monitor /
// glucometer on camera) when a value is elevated OR a related symptom is
// reported (useful for returning patients whose value may not be re-entered).
//
// Thresholds mirror the app's existing clinical categories:
//   - Temperature > 38°C            (fever)
//   - Blood pressure >= 140 / 90    (hypertension)
//   - Blood glucose  > 1.26 g/L     (hyperglycemia)

import * as React from "react"
import { AlertTriangle } from "lucide-react"

export type VitalLanguage = "fr" | "en"

interface VitalAlertInput {
  temperature?: string | number
  systolic?: string | number
  diastolic?: string | number
  glucose?: string | number
  symptoms?: string[]
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

const symptomMatches = (symptoms: string[] | undefined, keywords: string[]): boolean => {
  if (!symptoms || symptoms.length === 0) return false
  const haystack = symptoms.filter(Boolean).map((s) => String(s).toLowerCase())
  return haystack.some((s) => keywords.some((k) => s.includes(k)))
}

// Symptom keywords (FR + EN) associated with each vital
const TEMP_KEYWORDS = ["fever", "fièvre", "fievre", "chill", "frisson", "sweat", "sueur", "hyperther"]
const BP_KEYWORDS = [
  "headache", "céphal", "cephal", "mal de tête", "mal de tete",
  "dizz", "vertige", "palpitation", "blurred vision", "vision trouble",
  "irregular heartbeat", "nosebleed", "épistaxis", "epistaxis",
]
const GLUCOSE_KEYWORDS = [
  "thirst", "soif", "polyur", "urinat", "urine",
  "fatigue", "blurred vision", "vision trouble",
  "weight loss", "perte de poids", "polydips",
]

/**
 * Central decision logic: which vitals should raise the real-time
 * verification disclaimer, based on entered values and/or reported symptoms.
 */
export function getVitalAlerts(input: VitalAlertInput): VitalAlerts {
  const temp = toNumber(input.temperature)
  const sys = toNumber(input.systolic)
  const dia = toNumber(input.diastolic)
  const glu = toNumber(input.glucose)

  const temperatureAlert =
    (temp !== null && temp > 38) || symptomMatches(input.symptoms, TEMP_KEYWORDS)

  const bloodPressureAlert =
    (sys !== null && sys >= 140) ||
    (dia !== null && dia >= 90) ||
    symptomMatches(input.symptoms, BP_KEYWORDS)

  const glucoseAlert =
    (glu !== null && glu > 1.26) || symptomMatches(input.symptoms, GLUCOSE_KEYWORDS)

  return { temperatureAlert, bloodPressureAlert, glucoseAlert }
}

const TEXT = {
  fr: {
    title: "Vérification en temps réel requise",
    intro:
      "Une ou plusieurs constantes sont élevées ou évoquées par les symptômes. Demandez au patient de reprendre la mesure et de présenter son appareil à la caméra pour confirmer la valeur en direct :",
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
      "One or more vitals are elevated or suggested by the symptoms. Ask the patient to re-measure and show their device on camera to confirm the value live:",
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
