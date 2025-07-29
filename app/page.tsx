"use client"

// ✅ Import du hook de test et d'un bouton stylisé
import { useTestMode } from "@/hooks/use-test-mode"
import { Button } from "@/components/ui/button"

// ✅ Page minimale exportée par défaut
export default function Page() {
  // 🔄 Hook test : récupère le mode test, les patients et les actions
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

      {/* 🔍 Affichage du statut du mode test */}
      <p className="mb-2 text-gray-700">
        Statut : {isTestMode ? "✅ Activé" : "❌ Désactivé"}
      </p>

      {/* ✅ Patient affiché si activé */}
      {isTestMode && currentTestPatient && (
        <p className="mb-4 text-green-700 font-semibold">
          Patient : {currentTestPatient.patientData.firstName}
        </p>
      )}

      {/* 🟦 Bouton d'activation du mode test */}
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

      {/* 🔴 Bouton de désactivation */}
      {isTestMode && (
        <Button
          onClick={clearTestMode}
          className="bg-red-600 text-white hover:bg-red-700 mt-4"
        >
          ❌ Quitter Mode Test
        </Button>
      )}
    </div>
  )
}
