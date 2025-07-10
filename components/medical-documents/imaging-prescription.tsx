"use client"

import { User, MapPin, Phone, AlertTriangle, Camera } from "lucide-react"

interface ImagingPrescriptionProps {
  patientData: any
  clinicalData: any
  enhancedResults: any
  recommendedExams: any
}

export default function ImagingPrescription({
  patientData,
  clinicalData,
  enhancedResults,
  recommendedExams,
}: ImagingPrescriptionProps) {
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Filtrer les examens d'imagerie
  const imagingExams = recommendedExams?.recommended_exams?.filter(
    (exam: any) =>
      exam.category === "imaging" ||
      exam.name.toLowerCase().includes("radio") ||
      exam.name.toLowerCase().includes("scanner") ||
      exam.name.toLowerCase().includes("irm") ||
      exam.name.toLowerCase().includes("echo"),
  ) || [
    {
      id: 1,
      name: "Radiographie thoracique (face + profil)",
      indication: "Évaluation pulmonaire et cardiaque",
      priority: "routine",
      preparation: "Retirer bijoux et objets métalliques",
      technique: "Radiographie standard",
    },
    {
      id: 2,
      name: "Échographie abdominale",
      indication: "Exploration abdominale",
      priority: "routine",
      preparation: "À jeun 6h, vessie pleine",
      technique: "Échographie",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg rounded-lg">
      {/* En-tête officiel */}
      <div className="border-b-2 border-purple-600 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-purple-800 mb-2">ORDONNANCE D'IMAGERIE</h1>
            <p className="text-lg text-gray-600">Examens Radiologiques et d'Imagerie Médicale</p>
          </div>
          <div className="text-right">
            <div className="bg-purple-50 p-4 rounded-lg">
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
            {patientData.weight && (
              <p>
                <span className="font-semibold">Poids:</span> {patientData.weight} kg
              </p>
            )}
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
            {patientData.emergencyContact && (
              <p>
                <span className="font-semibold">Contact d'urgence:</span> {patientData.emergencyContact}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Indication clinique */}
      <div className="mb-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-yellow-800">Indication Clinique</h2>
        <div className="space-y-3">
          <p>
            <span className="font-semibold">Motif de consultation:</span>{" "}
            {clinicalData.chiefComplaint || "Non renseigné"}
          </p>
          {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0] && (
            <p>
              <span className="font-semibold">Diagnostic suspecté:</span>{" "}
              {enhancedResults.diagnostic_analysis.differential_diagnoses[0].diagnosis}
            </p>
          )}
          <p>
            <span className="font-semibold">Contexte clinique:</span>{" "}
            {clinicalData.symptoms?.substring(0, 200) || "Exploration complémentaire"}...
          </p>
          {clinicalData.physicalExam && (
            <p>
              <span className="font-semibold">Examen clinique:</span> {clinicalData.physicalExam.substring(0, 150)}...
            </p>
          )}
        </div>
      </div>

      {/* Examens prescrits */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Camera className="h-6 w-6 mr-3 text-purple-600" />
          EXAMENS D'IMAGERIE PRESCRITS
        </h2>

        <div className="space-y-6">
          {imagingExams.map((exam: any, index: number) => (
            <div key={index} className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-purple-800">{exam.name}</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-purple-700 mb-1">Indication médicale:</h4>
                    <p className="text-sm bg-white p-2 rounded border">{exam.indication}</p>
                  </div>
                  {exam.technique && (
                    <div>
                      <h4 className="font-semibold text-purple-700 mb-1">Technique:</h4>
                      <p className="text-sm bg-white p-2 rounded border">{exam.technique}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {exam.preparation && (
                    <div>
                      <h4 className="font-semibold text-purple-700 mb-1">Préparation patient:</h4>
                      <p className="text-sm bg-white p-2 rounded border">{exam.preparation}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-purple-700 mb-1">Informations techniques:</h4>
                    <div className="text-sm bg-white p-2 rounded border space-y-1">
                      <p>• Délai souhaité: {exam.delay || "Dans les 15 jours"}</p>
                      <p>• Avec injection: {exam.contrast || "Non"}</p>
                      <p>• Coupes: {exam.cuts || "Selon protocole"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone pour le radiologue */}
              <div className="mt-4 pt-4 border-t border-purple-300">
                <h4 className="font-semibold text-purple-700 mb-2">À remplir par le service d'imagerie:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    RDV programmé
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Examen réalisé
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Compte-rendu dicté
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-1" />
                    Transmis au médecin
                  </label>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-600">Date de réalisation: _______________</p>
                  <p className="text-xs text-gray-600">Radiologue: _______________</p>
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
            Apporter les examens antérieurs pour comparaison
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Respecter scrupuleusement la préparation indiquée
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Signaler toute allergie ou contre-indication
          </p>
          <p className="flex items-start">
            <span className="font-semibold mr-2">•</span>
            Compte-rendu et images à transmettre au médecin prescripteur
          </p>
          {enhancedResults?.recommendations?.immediate_actions && (
            <p className="flex items-start text-red-600">
              <AlertTriangle className="h-4 w-4 mr-2 mt-0.5" />
              <span className="font-semibold">Urgent:</span> Transmettre immédiatement tout résultat pathologique
            </p>
          )}
        </div>
      </div>

      {/* Contre-indications et allergies */}
      <div className="mb-8 bg-red-50 border-2 border-red-300 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-red-800 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          CONTRE-INDICATIONS ET ALLERGIES
        </h2>
        <div className="space-y-3">
          {patientData.allergies && (
            <div>
              <p className="font-semibold text-red-700">Allergies connues:</p>
              <p className="text-red-700 bg-red-100 p-2 rounded">{patientData.allergies}</p>
            </div>
          )}
          <div>
            <p className="font-semibold text-red-700">À vérifier avant l'examen:</p>
            <div className="text-sm text-red-600 space-y-1 mt-2">
              <p>□ Grossesse (femmes en âge de procréer)</p>
              <p>□ Allergie aux produits de contraste</p>
              <p>□ Insuffisance rénale (créatinine)</p>
              <p>□ Pacemaker/matériel métallique (IRM)</p>
              <p>□ Claustrophobie</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pied de page avec signature */}
      <div className="mt-12 pt-8 border-t-2 border-gray-300">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600">Ordonnance valable 1 an</p>
            <p className="text-sm text-gray-600">À effectuer selon les délais indiqués</p>
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
          Cette ordonnance est établie conformément aux dispositions du Code de la Santé Publique et aux recommandations
          de la Société Française de Radiologie. Les examens prescrits sont médicalement justifiés et adaptés à l'état
          clinique du patient.
        </p>
      </div>
    </div>
  )
}
