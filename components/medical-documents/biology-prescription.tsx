"use client"

import { FlaskConical, User, MapPin, Phone, AlertTriangle } from "lucide-react"

interface BiologyPrescriptionProps {
  patientData: any
  clinicalData: any
  enhancedResults: any
  recommendedExams: any
}

export default function BiologyPrescription({
  patientData,
  clinicalData,
  enhancedResults,
  recommendedExams,
}: BiologyPrescriptionProps) {
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Filtrer les examens de biologie
  const biologyExams = recommendedExams?.recommended_exams?.filter(
    (exam: any) => exam.category === "laboratory" || exam.name.toLowerCase().includes("sang"),
  ) || [
    {
      id: 1,
      name: "Numération Formule Sanguine (NFS)",
      indication: "Évaluation hématologique complète",
      priority: "routine",
      preparation: "À jeun non nécessaire",
    },
    {
      id: 2,
      name: "CRP (Protéine C-Réactive)",
      indication: "Recherche syndrome inflammatoire",
      priority: "routine",
      preparation: "À jeun non nécessaire",
    },
    {
      id: 3,
      name: "Vitesse de Sédimentation (VS)",
      indication: "Évaluation inflammation",
      priority: "routine",
      preparation: "À jeun non nécessaire",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg rounded-lg">
      {/* En-tête officiel */}
      <div className="border-b-2 border-green-600 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-green-800 mb-2">ORDONNANCE DE BIOLOGIE</h1>
            <p className="text-lg text-gray-600">Examens de Laboratoire</p>
          </div>
          <div className="text-right">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Date de prescription</p>
              <p className="text-lg font-semibold">{currentDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Informations praticien */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Praticien Prescripteur
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-lg">Dr. Jean MARTIN</p>
            <p className="text-gray-600">Médecin Généraliste</p>
            <p className="text-gray-600">N° RPPS: 12345678901</p>
            <p className="text-gray-600">N° ADELI: 123456789</p>
          </div>
          <div>
            <p className="flex items-center text-gray-600 mb-1">
              <MapPin className="h-4 w-4 mr-1" />
              123 Avenue de la Santé
            </p>
            <p className="text-gray-600 ml-5">75000 Paris</p>
            <p className="flex items-center text-gray-600 mt-2">
              <Phone className="h-4 w-4 mr-1" />
              01 23 45 67 89
            </p>
          </div>
        </div>
      </div>

      {/* Informations patient */}
      <div className="mb-8 border border-blue-200 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Patient
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-lg font-semibold">{patientData.name || "Nom du patient"}</p>
            <p>
              <span className="font-semibold">Né(e) le:</span> {patientData.birthDate || "Date de naissance"}
            </p>
            <p>
              <span className="font-semibold">Âge:</span> {patientData.age || "Non renseigné"} ans
            </p>
            <p>
              <span className="font-semibold">Genre:</span>{" "}
              {patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : "Non renseigné"}
            </p>
          </div>
          <div>
            {patientData.insurance && (
              <p>
                <span className="font-semibold">N° Sécurité Sociale:</span> {patientData.insurance}
              </p>
            )}
            <p>
              <span className="font-semibold">Adresse:</span> [Adresse du patient]
            </p>
          </div>
        </div>
      </div>

      {/* Indication clinique */}
      <div className="mb-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-yellow-800">Indication Clinique</h2>
        <div className="space-y-3">
          <p>
            <span className="font-semibold">Motif:</span> {clinicalData.chiefComplaint || "Non renseigné"}
          </p>
          {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0] && (
            <p>
              <span className="font-semibold">Diagnostic suspecté:</span>{" "}
              {enhancedResults.diagnostic_analysis.differential_diagnoses[0].diagnosis}
            </p>
          )}
          <p>
            <span className="font-semibold">Contexte clinique:</span>{" "}
            {clinicalData.symptoms?.substring(0, 200) || "Bilan de routine"}...
          </p>
        </div>
      </div>

      {/* Examens prescrits */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <FlaskConical className="h-6 w-6 mr-3 text-green-600" />
          EXAMENS DE BIOLOGIE PRESCRITS
        </h2>

        <div className="space-y-4">
          {biologyExams.map((exam: any, index: number) => (
            <div key={index} className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-green-800">{exam.name}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    exam.priority === "urgent"
                      ? "bg-red-100 text-red-800"
                      : exam.priority === "routine"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                  }`}
                >
                  {exam.priority === "urgent" ? "URGENT" : exam.priority === "routine" ? "ROUTINE" : "PRIORITAIRE"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">Indication:</span> {exam.indication}
                  </p>
                  {exam.preparation && (
                    <p className="text-sm mt-1">
                      <span className="font-semibold">Préparation:</span> {exam.preparation}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">Tube:</span> {exam.tube || "Selon protocole laboratoire"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Délai:</span> {exam.delay || "24-48h"}
                  </p>
                </div>
              </div>

              {/* Cases à cocher pour le laboratoire */}
              <div className="mt-3 pt-3 border-t border-green-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Prélèvement effectué
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Analyse en cours
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Résultats disponibles
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Transmis au médecin
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions spéciales */}
      <div className="mb-8 bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Instructions Spéciales</h2>
        <div className="space-y-2">
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Prélèvement à effectuer de préférence le matin
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Respecter les conditions de jeûne si indiquées
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Signaler tout traitement en cours au laboratoire
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Résultats à transmettre au médecin prescripteur
          </p>
          {enhancedResults?.recommendations?.immediate_actions && (
            <p className="flex items-start text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
              <span className="font-semibold">Urgent:</span> Transmettre immédiatement tout résultat pathologique
            </p>
          )}
        </div>
      </div>

      {/* Informations allergies */}
      {patientData.allergies && (
        <div className="mb-8 bg-red-50 border-2 border-red-300 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-red-800 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            ALLERGIES CONNUES
          </h2>
          <p className="text-red-700 font-semibold">{patientData.allergies}</p>
          <p className="text-sm text-red-600 mt-2">⚠️ Attention particulière lors des prélèvements et manipulations</p>
        </div>
      )}

      {/* Pied de page avec signature */}
      <div className="mt-12 pt-8 border-t-2 border-gray-300">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600">Ordonnance valable 1 an</p>
            <p className="text-sm text-gray-600">À effectuer dans les meilleurs délais</p>
            <p className="text-sm text-gray-600 mt-2">Document généré le {currentDate} - Système Médical Expert v2.0</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-8">Signature et cachet du médecin</p>
            <div className="border-t border-gray-400 w-48 mb-2"></div>
            <p className="text-sm font-semibold">Dr. Jean MARTIN</p>
          </div>
        </div>
      </div>

      {/* Mentions légales */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>
          Cette ordonnance est établie conformément aux dispositions du Code de la Santé Publique. Les examens prescrits
          sont médicalement justifiés et adaptés à l'état clinique du patient.
        </p>
      </div>
    </div>
  )
}
