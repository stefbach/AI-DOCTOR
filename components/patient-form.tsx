"use client"

import { useState, useCallback } from "react"
import { User, ChevronRight } from "lucide-react"

interface PatientFormProps {
  initialData: any
  onDataChange: (data: any) => void
  onNext: () => void
  isValid: boolean
}

export default function PatientForm({ initialData, onDataChange, onNext, isValid }: PatientFormProps) {
  const [data, setData] = useState(initialData)

  const updateField = useCallback(
    (field: string, value: string) => {
      const newData = { ...data, [field]: value }
      setData(newData)
      onDataChange(newData)
    },
    [data, onDataChange],
  )

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <User className="h-6 w-6 mr-3 text-blue-600" />
        Données Patient Complètes
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          value={data.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Nom complet *"
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <input
          type="text"
          value={data.age}
          onChange={(e) => updateField("age", e.target.value)}
          placeholder="Âge *"
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <select
          value={data.gender}
          onChange={(e) => updateField("gender", e.target.value)}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Genre *</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
          <option value="O">Autre</option>
        </select>

        <input
          type="text"
          value={data.weight}
          onChange={(e) => updateField("weight", e.target.value)}
          placeholder="Poids (kg)"
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <input
          type="text"
          value={data.height}
          onChange={(e) => updateField("height", e.target.value)}
          placeholder="Taille (cm)"
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <input
          type="text"
          value={data.insurance}
          onChange={(e) => updateField("insurance", e.target.value)}
          placeholder="Assurance maladie"
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mt-4 space-y-4">
        <textarea
          value={data.medicalHistory}
          onChange={(e) => updateField("medicalHistory", e.target.value)}
          placeholder="Antécédents médicaux détaillés (maladies chroniques, chirurgies, hospitalisations)"
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <textarea
          value={data.currentMedications}
          onChange={(e) => updateField("currentMedications", e.target.value)}
          placeholder="Médicaments actuels (nom, dosage, fréquence) - IMPORTANT pour vérification interactions"
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <textarea
          value={data.allergies}
          onChange={(e) => updateField("allergies", e.target.value)}
          placeholder="Allergies connues (médicaments, aliments, environnement)"
          rows={2}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <input
          type="text"
          value={data.emergencyContact}
          onChange={(e) => updateField("emergencyContact", e.target.value)}
          placeholder="Contact d'urgence (nom et téléphone)"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold transition-colors"
        >
          Continuer vers Présentation Clinique
          <ChevronRight className="h-5 w-5 ml-2" />
        </button>
      </div>
    </div>
  )
}
