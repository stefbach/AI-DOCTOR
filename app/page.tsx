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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center">
      <h1 className="text-2xl font-bold mb-4">🧪 Test du Mode Test</h1>

      {/* Affiche si le mode test est activé */}
      <p className="mb-4 text-gray-600">
        Mode test : {isTestMode ? "✅ activé" : "❌ désactivé"}
      </p>

      {/* Affiche le prénom du patient test si activé */}
      {isTestMode && currentTestPatient && (
        <p className="mb-4 text-blue-700 font-semibold">
          Patient : {currentTestPatient.patientData.firstName}
        </p>
      )}

      {/* Bouton d'activation du mode test */}
      {!isTestMode && testPatients?.length > 0 && (
        <Button
          onClick={() => {
            const patient = testPatients[0]
            setTestPatient(patient)
            alert(`🧪 Mode test activé : ${patient.patientData.firstName}`)
          }}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          🧪 Activer Mode Test
        </Button>
      )}

      {/* Bouton pour désactiver le mode test */}
      {isTestMode && (
        <Button
          onClick={() => clearTestMode()}
          className="bg-red-600 text-white hover:bg-red-700 mt-4"
        >
          ❌ Quitter le Mode Test
        </Button>
      )}
    </div>
  )
}


