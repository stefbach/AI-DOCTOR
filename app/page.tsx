"use client"

import { useTestMode } from "@/hooks/use-test-mode"
import { Button } from "@/components/ui/button"

export default function Page() {
  const {
    isTestMode,
    currentTestPatient,
    setTestPatient,
    clearTestMode,
    testPatients,
  } = useTestMode()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center px-4">
      <h1 className="text-2xl font-bold mb-4">🧪 PAGE DE TEST – MODE TEST</h1>

      <p className="mb-2 text-gray-700">
        Statut : {isTestMode ? "✅ Activé" : "❌ Désactivé"}
      </p>

      {isTestMode && currentTestPatient && (
        <p className="mb-4 text-green-700 font-semibold">
          Patient : {currentTestPatient.patientData.firstName}
        </p>
      )}

      {!isTestMode && testPatients?.length > 0 && (
        <Button
          onClick={() => {
            const patient = testPatients[0]
            setTestPatient(patient)
            alert(`🧪 Mode test activé : ${patient.patientData.firstName}`)
          }}
        >
          🧪 Activer Mode Test
        </Button>
      )}

      {isTestMode && (
        <Button
          onClick={clearTestMode}
          className="mt-4"
        >
          ❌ Quitter Mode Test
        </Button>
      )}
    </div>
  )
}

