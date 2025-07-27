'use client'

import { useState } from 'react'
import { MauritianDocumentsGenerator } from '@/lib/mauritian-documents-generator'

export default function DocumentsTest() {
  const [docs, setDocs] = useState(null)

  const handleGenerate = () => {
    console.log("🚀 GÉNÉRATION LANCÉE");

    const patientData = {
      firstName: "Jean",
      lastName: "Dupont",
      age: 45,
      gender: "M",
    }

    const diagnosisData = {
      diagnosis: {
        primary: { condition: "Hypertension", confidence: 90 },
        differential: [],
      },
      treatmentPlan: {
        medications: [
          { name: "Amlodipine", dosage: "5mg", frequency: "1 fois/jour", duration: "30 jours" }
        ],
        recommendations: ["Réduction du sel", "Suivi tensionnel"]
      },
    }

    const consultationData = {
      patientInfo: patientData,
      chiefComplaint: "Hypertension",
      diseaseHistory: "Historique familial d'HTA",
      symptoms: ["Céphalées", "Acouphènes"],
      diagnosis: "Hypertension",
      differentialDiagnoses: [],
      medications: diagnosisData.treatmentPlan.medications,
      recommendations: diagnosisData.treatmentPlan.recommendations,
      followUp: { nextVisit: "2025-08-01" }
    }

    const doctorInfo = {
      fullName: "Dr. Jean Dupont",
      specialty: "Médecine générale",
      address: "123 rue de la Santé",
      city: "Port-Louis",
      phone: "+230 123 456 789",
      email: "contact@cabinet.mu",
      registrationNumber: "Medical Council - Reg. 12345"
    }

    const result = MauritianDocumentsGenerator.generateMauritianDocuments(
      { consultationData },
      doctorInfo,
      patientData,
      diagnosisData
    )

    console.log("✅ DOCUMENTS GÉNÉRÉS :", result)
    setDocs(result)
  }

  return (
    <div>
      <button onClick={handleGenerate} style={{ padding: 10, fontSize: 18 }}>
        Générer les documents test
      </button>

      {docs && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 20 }}>
          {JSON.stringify(docs, null, 2)}
        </pre>
      )}
    </div>
  )
}
import DocumentsTest from '@/components/medical/DocumentsTest'

export default function Page() {
  return <DocumentsTest />
}

