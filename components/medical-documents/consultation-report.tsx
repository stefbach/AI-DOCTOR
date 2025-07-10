"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { User, Stethoscope, Brain, Calendar } from "lucide-react"

interface ConsultationReportProps {
  patientData: any
  clinicalData: any
  enhancedResults: any
  prescriptionData: any
  recommendedExams: any
  examResults: any
}

export default function ConsultationReport({
  patientData,
  clinicalData,
  enhancedResults,
  prescriptionData,
  recommendedExams,
  examResults,
}: ConsultationReportProps) {
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* En-tête */}
      <div className="text-center mb-8 border-b pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">COMPTE-RENDU DE CONSULTATION MÉDICALE</h1>
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>Date: {currentDate}</div>
          <div>Dr. Médecin Expert</div>
          <div>
            Dossier N°: {patientData.name?.replace(/\s+/g, "").toUpperCase()}-{new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Informations Patient */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Informations Patient
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
              <strong>Taille:</strong> {patientData.height || "Non renseigné"} cm
            </div>
            <div>
              <strong>Assurance:</strong> {patientData.insurance || "Non renseignée"}
            </div>
          </div>

          {patientData.medicalHistory && (
            <div className="mt-4">
              <strong>Antécédents médicaux:</strong>
              <p className="text-sm text-gray-700 mt-1">{patientData.medicalHistory}</p>
            </div>
          )}

          {patientData.currentMedications && (
            <div className="mt-4">
              <strong>Traitements actuels:</strong>
              <p className="text-sm text-gray-700 mt-1">{patientData.currentMedications}</p>
            </div>
          )}

          {patientData.allergies && (
            <div className="mt-4">
              <strong>Allergies:</strong>
              <p className="text-sm text-red-600 mt-1">{patientData.allergies}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Présentation Clinique */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Stethoscope className="h-5 w-5 mr-2 text-green-600" />
            Présentation Clinique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <strong>Motif de consultation:</strong>
              <p className="mt-1">{clinicalData.chiefComplaint || "Non renseigné"}</p>
            </div>

            <div>
              <strong>Histoire de la maladie actuelle:</strong>
              <p className="mt-1">{clinicalData.symptoms || "Non renseignée"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Durée des symptômes:</strong> {clinicalData.duration || "Non précisée"}
              </div>
              <div>
                <strong>Sévérité:</strong> {clinicalData.severity || "Non évaluée"}
              </div>
            </div>

            {clinicalData.physicalExam && (
              <div>
                <strong>Examen physique:</strong>
                <p className="mt-1">{clinicalData.physicalExam}</p>
              </div>
            )}

            <div>
              <strong>Signes vitaux:</strong>
              <div className="grid grid-cols-3 gap-4 mt-2">
                {clinicalData.vitals.bp && <div>TA: {clinicalData.vitals.bp}</div>}
                {clinicalData.vitals.hr && <div>FC: {clinicalData.vitals.hr}</div>}
                {clinicalData.vitals.temp && <div>T°: {clinicalData.vitals.temp}</div>}
                {clinicalData.vitals.spo2 && <div>SpO2: {clinicalData.vitals.spo2}</div>}
                {clinicalData.vitals.rr && <div>FR: {clinicalData.vitals.rr}</div>}
                {clinicalData.vitals.pain && <div>Douleur: {clinicalData.vitals.pain}/10</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic */}
      {enhancedResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Diagnostic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              {enhancedResults.diagnostic_analysis?.clinical_impression && (
                <div>
                  <strong>Impression clinique:</strong>
                  <p className="mt-1">{enhancedResults.diagnostic_analysis.clinical_impression}</p>
                </div>
              )}

              {enhancedResults.diagnostic_analysis?.differential_diagnoses && (
                <div>
                  <strong>Diagnostics différentiels:</strong>
                  <div className="mt-2 space-y-2">
                    {enhancedResults.diagnostic_analysis.differential_diagnoses.map((diag: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{diag.diagnosis}</span>
                          {diag.icd10 && <span className="text-gray-500 ml-2">({diag.icd10})</span>}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{diag.probability}%</Badge>
                          <Badge
                            variant={
                              diag.severity === "severe"
                                ? "destructive"
                                : diag.severity === "moderate"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {diag.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traitement */}
      {prescriptionData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Traitement Prescrit</CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptionData.prescription?.medications && (
              <div className="space-y-3">
                {prescriptionData.prescription.medications.map((med: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="font-medium">{med.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <div>
                        Dosage: {med.strength} - {med.form}
                      </div>
                      <div>Posologie: {med.dosage}</div>
                      <div>Durée: {med.duration}</div>
                      <div>Instructions: {med.instructions}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Examens Complémentaires */}
      {recommendedExams && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Examens Complémentaires</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendedExams.recommended_exams && (
              <div className="space-y-2">
                {recommendedExams.recommended_exams.map((exam: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span>{exam.name}</span>
                    <Badge variant="outline">{exam.priority}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suivi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Plan de Suivi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            {prescriptionData?.prescription?.follow_up?.next_visit && (
              <div>
                <strong>Prochain rendez-vous:</strong> {prescriptionData.prescription.follow_up.next_visit}
              </div>
            )}

            {enhancedResults?.recommendations?.follow_up && (
              <div>
                <strong>Recommandations:</strong>
                <p className="mt-1">{enhancedResults.recommendations.follow_up}</p>
              </div>
            )}

            {prescriptionData?.prescription?.follow_up?.warning_signs && (
              <div>
                <strong className="text-red-600">Signes d'alarme:</strong>
                <ul className="list-disc list-inside mt-1 text-red-600">
                  {prescriptionData.prescription.follow_up.warning_signs.map((sign: string, index: number) => (
                    <li key={index}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <div className="mt-8 text-right">
        <Separator className="mb-4" />
        <div className="text-sm">
          <div>Dr. Médecin Expert</div>
          <div className="text-gray-600">Médecine Générale</div>
          <div className="text-gray-600">Date: {currentDate}</div>
        </div>
      </div>
    </div>
  )
}
