"use client"

import { Microscope, Calendar, User, FileText } from "lucide-react"

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
  const currentDate = new Date().toLocaleDateString("fr-FR")

  // Filtrer les examens d'imagerie
  const imagingExams =
    recommendedExams?.recommended_exams?.filter(
      (exam) =>
        exam.category === "imaging" ||
        exam.name.toLowerCase().includes("radio") ||
        exam.name.toLowerCase().includes("scanner") ||
        exam.name.toLowerCase().includes("irm") ||
        exam.name.toLowerCase().includes("echo"),
    ) || []

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none">
      {/* En-tête officiel */}
      <div className="border-b-2 border-blue-600 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-blue-800 mb-2">ORDONNANCE D'EXAMENS D'IMAGERIE</h1>
            <div className="text-sm text-gray-600">
              <p>Dr. [Nom du Médecin]</p>
              <p>[Spécialité]</p>
              <p>[Adresse du Cabinet]</p>
              <p>Tél: [Téléphone] - Email: [Email]</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Date: {currentDate}</p>
            <p>N° RPPS: [Numéro RPPS]</p>
            <p>N° ADELI: [Numéro ADELI]</p>
          </div>
        </div>
      </div>

      {/* Informations patient */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
          <User className="h-5 w-5 mr-2" />
          Informations Patient
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>Nom:</strong> {patientData.name}
            </p>
            <p>
              <strong>Âge:</strong> {patientData.age} ans
            </p>
            <p>
              <strong>Genre:</strong>{" "}
              {patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : patientData.gender}
            </p>
          </div>
          <div>
            <p>
              <strong>Poids:</strong> {patientData.weight} kg
            </p>
            <p>
              <strong>Taille:</strong> {patientData.height} cm
            </p>
            <p>
              <strong>Assurance:</strong> {patientData.insurance || "Non renseignée"}
            </p>
          </div>
        </div>
        {patientData.allergies && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">
              <strong>⚠️ Allergies:</strong> {patientData.allergies}
            </p>
          </div>
        )}
      </div>

      {/* Indication clinique */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Indication Clinique
        </h2>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p>
            <strong>Motif de consultation:</strong> {clinicalData.chiefComplaint}
          </p>
          <p>
            <strong>Symptômes:</strong> {clinicalData.symptoms?.substring(0, 200)}...
          </p>
          {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0] && (
            <p>
              <strong>Diagnostic suspecté:</strong>{" "}
              {enhancedResults.diagnostic_analysis.differential_diagnoses[0].diagnosis}
            </p>
          )}
        </div>
      </div>

      {/* Examens prescrits */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
          <Microscope className="h-5 w-5 mr-2" />
          Examens d'Imagerie Prescrits
        </h2>

        {imagingExams.length > 0 ? (
          <div className="space-y-4">
            {imagingExams.map((exam, index) => (
              <div key={index} className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-blue-800 flex items-center">
                    <Microscope className="h-5 w-5 mr-2" />
                    {exam.name}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      exam.priority === "urgent"
                        ? "bg-red-100 text-red-800"
                        : exam.priority === "semi-urgent"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-green-100 text-green-800"
                    }`}
                  >
                    {exam.priority === "urgent"
                      ? "URGENT"
                      : exam.priority === "semi-urgent"
                        ? "SEMI-URGENT"
                        : "ROUTINE"}
                  </span>
                </div>

                <div className="text-sm space-y-2">
                  <p>
                    <strong>Indication:</strong> {exam.indication}
                  </p>
                  <p>
                    <strong>Préparation:</strong> {exam.preparation}
                  </p>

                  {exam.contrast_required && (
                    <div className="bg-yellow-50 border border-yellow-200 p-2 rounded">
                      <p className="text-yellow-800">
                        <strong>⚠️ Produit de contraste requis</strong>
                      </p>
                      <p className="text-xs">Vérifier fonction rénale et allergies avant injection</p>
                    </div>
                  )}

                  {exam.special_instructions && (
                    <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                      <p className="text-blue-800">
                        <strong>Instructions spéciales:</strong> {exam.special_instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg text-blue-800 flex items-center">
                  <Microscope className="h-5 w-5 mr-2" />
                  Radiographie thoracique
                </h3>
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  ROUTINE
                </span>
              </div>
              <div className="text-sm space-y-2">
                <p>
                  <strong>Indication:</strong> Évaluation pulmonaire et cardiaque selon présentation clinique
                </p>
                <p>
                  <strong>Préparation:</strong> Retirer bijoux et objets métalliques de la région thoracique
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions importantes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-yellow-800 mb-2">📋 Instructions Importantes</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Apporter cette ordonnance et votre carte vitale</li>
          <li>• Respecter les instructions de préparation</li>
          <li>• Signaler toute allergie ou grossesse</li>
          <li>• Apporter les examens antérieurs si disponibles</li>
          <li>• Prendre RDV rapidement si examen urgent</li>
        </ul>
      </div>

      {/* Suivi */}
      <div className="mb-8">
        <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
          <Calendar className="h-5 w-5 mr-2" />
          Suivi
        </h3>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">
            <strong>Retour consultation:</strong> Prendre RDV avec les résultats dans les 15 jours
          </p>
          <p className="text-sm text-green-700">
            <strong>Urgence:</strong> Contacter le cabinet si symptômes s'aggravent
          </p>
        </div>
      </div>

      {/* Signature */}
      <div className="flex justify-between items-end pt-8 border-t border-gray-300">
        <div className="text-sm text-gray-600">
          <p>Fait à [Ville], le {currentDate}</p>
          <p className="mt-2">Cachet et signature du médecin</p>
        </div>
        <div className="text-right">
          <div className="w-32 h-16 border border-gray-300 rounded flex items-center justify-center text-xs text-gray-500">
            Signature
          </div>
        </div>
      </div>

      {/* Mentions légales */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>
          Cette ordonnance est valable 1 an. Les examens doivent être réalisés dans un délai approprié selon l'urgence
          clinique.
        </p>
      </div>
    </div>
  )
}
