"use client"

import { useState, useCallback } from "react"
import { Stethoscope, Activity, HelpCircle, Loader, AlertTriangle } from "lucide-react"

interface ClinicalFormProps {
  initialData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onBack: () => void
  isValid: boolean
  isLoading: boolean
  error?: string
  apiStatus: any
}

export default function ClinicalForm({
  initialData,
  onDataChange,
  onNext,
  onBack,
  isValid,
  isLoading,
  error,
  apiStatus,
}: ClinicalFormProps) {
  const [data, setData] = useState(initialData)

  const updateField = useCallback(
    (field: string, value: string) => {
      const newData = { ...data, [field]: value }
      setData(newData)
      onDataChange(newData)
    },
    [data, onDataChange],
  )

  const updateVital = useCallback(
    (field: string, value: string) => {
      const newData = {
        ...data,
        vitals: { ...data.vitals, [field]: value },
      }
      setData(newData)
      onDataChange(newData)
    },
    [data, onDataChange],
  )

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Stethoscope className="h-6 w-6 mr-3 text-green-600" />
        Présentation Clinique Détaillée
      </h2>

      <div className="space-y-4">
        <input
          type="text"
          value={data.chiefComplaint}
          onChange={(e) => updateField("chiefComplaint", e.target.value)}
          placeholder="Motif de consultation principal *"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />

        <textarea
          value={data.symptoms}
          onChange={(e) => updateField("symptoms", e.target.value)}
          placeholder="Histoire de la maladie actuelle détaillée (symptômes, chronologie, facteurs déclenchants, facteurs aggravants/améliorants) *"
          rows={6}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={data.duration}
            onChange={(e) => updateField("duration", e.target.value)}
            placeholder="Durée des symptômes (ex: 3 jours, 2 semaines)"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />

          <select
            value={data.severity}
            onChange={(e) => updateField("severity", e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Sévérité des symptômes</option>
            <option value="mild">Légère (1-3/10)</option>
            <option value="moderate">Modérée (4-6/10)</option>
            <option value="severe">Sévère (7-10/10)</option>
          </select>
        </div>

        <textarea
          value={data.physicalExam}
          onChange={(e) => updateField("physicalExam", e.target.value)}
          placeholder="Examen physique (inspection, palpation, auscultation, percussion) - Détails par système"
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
      </div>

      {/* Signes vitaux */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 className="font-semibold mb-3 text-green-800 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Signes Vitaux
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={data.vitals.bp}
            onChange={(e) => updateVital("bp", e.target.value)}
            placeholder="TA (120/80 mmHg)"
            className="p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />

          <input
            type="text"
            value={data.vitals.hr}
            onChange={(e) => updateVital("hr", e.target.value)}
            placeholder="FC (72 bpm)"
            className="p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />

          <input
            type="text"
            value={data.vitals.temp}
            onChange={(e) => updateVital("temp", e.target.value)}
            placeholder="T° (36.5°C)"
            className="p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />

          <input
            type="text"
            value={data.vitals.spo2}
            onChange={(e) => updateVital("spo2", e.target.value)}
            placeholder="SpO2 (98%)"
            className="p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />

          <input
            type="text"
            value={data.vitals.rr}
            onChange={(e) => updateVital("rr", e.target.value)}
            placeholder="FR (16/min)"
            className="p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />

          <input
            type="text"
            value={data.vitals.pain}
            onChange={(e) => updateVital("pain", e.target.value)}
            placeholder="Douleur (0-10/10)"
            className="p-2 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <AlertTriangle className="h-5 w-5 inline mr-2" />
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center font-semibold transition-colors"
        >
          Retour Patient
        </button>

        <button
          onClick={onNext}
          disabled={!isValid || isLoading || !apiStatus.openai}
          className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold transition-colors"
        >
          {isLoading ? (
            <>
              <Loader className="animate-spin h-5 w-5 mr-2" />
              Génération questions OpenAI...
            </>
          ) : (
            <>
              <HelpCircle className="h-5 w-5 mr-2" />
              Générer Questions Cliniques OpenAI
            </>
          )}
        </button>
      </div>
    </div>
  )
}
