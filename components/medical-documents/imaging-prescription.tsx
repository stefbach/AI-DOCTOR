"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Microscope, User, Calendar, AlertTriangle, Camera } from "lucide-react"

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
      (exam: any) =>
        exam.category === "imaging" ||
        exam.name.toLowerCase().includes("radio") ||
        exam.name.toLowerCase().includes("scanner") ||
        exam.name.toLowerCase().includes("irm") ||
        exam.name.toLowerCase().includes("echo") ||
        exam.name.toLowerCase().includes("doppler"),
    ) || []

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* En-tête */}
      <div className="text-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ORDONNANCE D'EXAMENS PARACLINIQUES</h1>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>Date: {currentDate}</div>
          <div>Dr. Médecin Expert - N° RPPS: 12345678901</div>
        </div>
      </div>

      {/* Informations Patient */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Nom:</strong> {patientData.name || "Non renseigné"}
            </div>
            <div>
              <strong>Âge:</strong> {patientData.age || "Non renseigné"} ans
            </div>
            <div>
              <strong>Genre:</strong>{" "}
              {patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : "Non renseigné"}
            </div>
            <div>
              <strong>Poids:</strong> {patientData.weight || "Non renseigné"} kg
            </div>
            <div>
              <strong>Assurance:</strong> {patientData.insurance || "Non renseignée"}
            </div>
            <div>
              <strong>Contact urgence:</strong> {patientData.emergencyContact || "Non renseigné"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Renseignements Cliniques */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Renseignements Cliniques</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div>
              <strong>Motif de consultation:</strong> {clinicalData.chiefComplaint || "Non renseigné"}
            </div>
            <div>
              <strong>Symptômes:</strong> {clinicalData.symptoms?.substring(0, 200) || "Non renseignés"}
            </div>
            {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0] && (
              <div>
                <strong>Diagnostic suspecté:</strong>{" "}
                {enhancedResults.diagnostic_analysis.differential_diagnoses[0].diagnosis}
              </div>
            )}
            {patientData.medicalHistory && (
              <div>
                <strong>Antécédents:</strong> {patientData.medicalHistory.substring(0, 150)}...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Examens Prescrits */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Camera className="h-5 w-5 mr-2 text-purple-600" />
            Examens d'Imagerie Prescrits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {imagingExams.length > 0 ? (
            <div className="space-y-4">
              {imagingExams.map((exam: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-lg">{exam.name}</h4>
                    <Badge variant={exam.priority === "urgent" ? "destructive" : "default"}>{exam.priority}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <strong>Indication clinique:</strong> {exam.indication}
                    </div>
                    {exam.preparation && exam.preparation !== "Instructions standard" && (
                      <div>
                        <strong>Préparation:</strong> {exam.preparation}
                      </div>
                    )}
                    <div>
                      <strong>Résultats attendus:</strong> {exam.expected_results}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-lg">Radiographie thoracique de face</h4>
                <div className="text-sm text-gray-600 mt-2">
                  <div>
                    <strong>Indication:</strong> Évaluation pulmonaire et cardiaque
                  </div>
                  <div>
                    <strong>Préparation:</strong> Retirer bijoux et objets métalliques
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-lg">Échographie abdominale</h4>
                <div className="text-sm text-gray-600 mt-2">
                  <div>
                    <strong>Indication:</strong> Exploration des organes abdominaux
                  </div>
                  <div>
                    <strong>Préparation:</strong> À jeun 6h, vessie pleine
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contre-indications et Précautions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Contre-indications et Précautions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            {patientData.allergies && (
              <div className="text-red-600">
                <strong>Allergies connues:</strong> {patientData.allergies}
              </div>
            )}
            <div>• Signaler toute grossesse possible</div>
            <div>• Informer de tout matériel métallique implanté (pacemaker, prothèses)</div>
            <div>• Apporter les examens antérieurs pour comparaison</div>
            <div>• Respecter les instructions de préparation</div>
            {patientData.currentMedications && (
              <div>• Traitements en cours: {patientData.currentMedications.substring(0, 100)}...</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions Spéciales */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Microscope className="h-5 w-5 mr-2 text-green-600" />
            Instructions Spéciales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div>• Examens à réaliser dans les 15 jours</div>
            <div>• Apporter carte vitale et ordonnance</div>
            <div>• Résultats à rapporter lors de la prochaine consultation</div>
            <div>• En cas d'urgence, contacter le service prescripteur</div>
            {enhancedResults?.recommendations?.immediate_actions?.length > 0 && (
              <div className="text-orange-600">
                <strong>Actions prioritaires:</strong> {enhancedResults.recommendations.immediate_actions[0]}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <div className="mt-8 flex justify-between items-end">
        <div className="text-sm">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 mr-1" />
            Validité: 6 mois
          </div>
          <div>Ordonnance établie le {currentDate}</div>
          <div className="text-xs text-gray-500 mt-1">Examens remboursés selon nomenclature en vigueur</div>
        </div>
        <div className="text-right">
          <div className="border-t pt-2 mt-4 w-48">
            <div className="text-sm font-semibold">Dr. Médecin Expert</div>
            <div className="text-xs text-gray-600">Signature et cachet</div>
          </div>
        </div>
      </div>
    </div>
  )
}
