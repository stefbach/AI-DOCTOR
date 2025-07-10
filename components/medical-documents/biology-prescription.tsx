"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, User, Calendar, AlertTriangle } from "lucide-react"

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
  const currentDate = new Date().toLocaleDateString("fr-FR")

  // Filtrer les examens de biologie
  const biologyExams =
    recommendedExams?.recommended_exams?.filter(
      (exam: any) =>
        exam.category === "laboratory" ||
        exam.name.toLowerCase().includes("sang") ||
        exam.name.toLowerCase().includes("urine") ||
        exam.name.toLowerCase().includes("bilan"),
    ) || []

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* En-tête */}
      <div className="text-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ORDONNANCE DE BIOLOGIE MÉDICALE</h1>
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
              <strong>Assurance:</strong> {patientData.insurance || "Non renseignée"}
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
              <strong>Motif:</strong> {clinicalData.chiefComplaint || "Non renseigné"}
            </div>
            {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.[0] && (
              <div>
                <strong>Diagnostic suspecté:</strong>{" "}
                {enhancedResults.diagnostic_analysis.differential_diagnoses[0].diagnosis}
              </div>
            )}
            {patientData.currentMedications && (
              <div>
                <strong>Traitements:</strong> {patientData.currentMedications}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Examens Prescrits */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FlaskConical className="h-5 w-5 mr-2 text-green-600" />
            Examens de Biologie Prescrits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {biologyExams.length > 0 ? (
            <div className="space-y-4">
              {biologyExams.map((exam: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{exam.name}</h4>
                    <Badge variant={exam.priority === "urgent" ? "destructive" : "default"}>{exam.priority}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <strong>Indication:</strong> {exam.indication}
                    </div>
                    {exam.preparation && exam.preparation !== "Instructions standard" && (
                      <div>
                        <strong>Préparation:</strong> {exam.preparation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold">Bilan sanguin complet</h4>
                <div className="text-sm text-gray-600 mt-2">
                  <div>• Numération Formule Sanguine (NFS)</div>
                  <div>• C-Reactive Protein (CRP)</div>
                  <div>• Vitesse de Sédimentation (VS)</div>
                  <div>• Glycémie à jeun</div>
                  <div>• Créatininémie</div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold">Bilan hépatique</h4>
                <div className="text-sm text-gray-600 mt-2">
                  <div>• ASAT, ALAT</div>
                  <div>• Bilirubine totale et conjuguée</div>
                  <div>• Phosphatases alcalines</div>
                  <div>• Gamma GT</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Instructions Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div>• Prélèvement à effectuer à jeun (12h minimum)</div>
            <div>• Apporter la carte vitale et l'ordonnance</div>
            <div>• Signaler tout traitement anticoagulant</div>
            <div>• Résultats à rapporter lors de la prochaine consultation</div>
            {patientData.allergies && <div className="text-red-600">• Allergies connues: {patientData.allergies}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <div className="mt-8 flex justify-between items-end">
        <div className="text-sm">
          <div className="flex items-center mb-2">
            <Calendar className="h-4 w-4 mr-1" />
            Validité: 3 mois
          </div>
          <div>Ordonnance établie le {currentDate}</div>
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
