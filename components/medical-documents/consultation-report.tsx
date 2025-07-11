"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, Stethoscope, Brain, Pill } from "lucide-react"

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
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean MARTIN",
    specialty: "Médecine Générale",
    rpps: "12345678901",
    address: "123 Avenue de la Santé, 75000 Paris",
    phone: "01.23.45.67.89",
    email: "dr.martin@medical.fr",
  })

  const [reportData, setReportData] = useState({
    consultationDate: new Date().toLocaleDateString("fr-FR"),
    consultationTime: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    consultationType: "Consultation",
    additionalNotes: "",
  })

  const handleDoctorChange = useCallback((field: string, value: string) => {
    setDoctorInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleReportChange = useCallback((field: string, value: string) => {
    setReportData((prev) => ({ ...prev, [field]: value }))
  }, [])

  return (
    <div className="space-y-6 print:space-y-4">
      {/* En-tête modifiable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Informations Praticien (Modifiable)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorName">Nom du médecin</Label>
              <Input
                id="doctorName"
                value={doctorInfo.name}
                onChange={(e) => handleDoctorChange("name", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div>
              <Label htmlFor="specialty">Spécialité</Label>
              <Input
                id="specialty"
                value={doctorInfo.specialty}
                onChange={(e) => handleDoctorChange("specialty", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div>
              <Label htmlFor="rpps">N° RPPS</Label>
              <Input
                id="rpps"
                value={doctorInfo.rpps}
                onChange={(e) => handleDoctorChange("rpps", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={doctorInfo.phone}
                onChange={(e) => handleDoctorChange("phone", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={doctorInfo.address}
                onChange={(e) => handleDoctorChange("address", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document médical */}
      <div className="bg-white p-8 rounded-lg shadow-lg print:shadow-none print:p-6">
        {/* En-tête officiel */}
        <div className="text-center mb-8 print:mb-6">
          <div className="border-b-2 border-blue-600 pb-4">
            <h1 className="text-2xl font-bold text-blue-800 mb-2">COMPTE-RENDU DE CONSULTATION MÉDICALE</h1>
            <div className="text-sm text-gray-600">
              <p className="font-semibold">{doctorInfo.name}</p>
              <p>{doctorInfo.specialty}</p>
              <p>N° RPPS: {doctorInfo.rpps}</p>
              <p>{doctorInfo.address}</p>
              <p>
                Tél: {doctorInfo.phone} | Email: {doctorInfo.email}
              </p>
            </div>
          </div>
        </div>

        {/* Informations consultation */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <Label htmlFor="consultDate">Date de consultation</Label>
            <Input
              id="consultDate"
              value={reportData.consultationDate}
              onChange={(e) => handleReportChange("consultationDate", e.target.value)}
              className="mt-1"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <div>
            <Label htmlFor="consultTime">Heure</Label>
            <Input
              id="consultTime"
              value={reportData.consultationTime}
              onChange={(e) => handleReportChange("consultationTime", e.target.value)}
              className="mt-1"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Informations patient */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <User className="h-5 w-5 mr-2" />
            PATIENT
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Nom:</strong> {patientData.name}
              </div>
              <div>
                <strong>Âge:</strong> {patientData.age} ans
              </div>
              <div>
                <strong>Genre:</strong> {patientData.gender}
              </div>
              <div>
                <strong>Poids:</strong> {patientData.weight} kg
              </div>
              <div>
                <strong>Taille:</strong> {patientData.height} cm
              </div>
              <div>
                <strong>Assurance:</strong> {patientData.insurance}
              </div>
            </div>
            {patientData.medicalHistory && (
              <div className="mt-3">
                <strong>Antécédents médicaux:</strong>
                <p className="text-sm mt-1">{patientData.medicalHistory}</p>
              </div>
            )}
            {patientData.currentMedications && (
              <div className="mt-3">
                <strong>Traitements en cours:</strong>
                <p className="text-sm mt-1">{patientData.currentMedications}</p>
              </div>
            )}
            {patientData.allergies && (
              <div className="mt-3">
                <strong>Allergies:</strong>
                <p className="text-sm mt-1 text-red-600">{patientData.allergies}</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Motif de consultation */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <Stethoscope className="h-5 w-5 mr-2" />
            MOTIF DE CONSULTATION
          </h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-semibold text-blue-800">{clinicalData.chiefComplaint}</p>
          </div>
        </div>

        {/* Histoire de la maladie actuelle */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">HISTOIRE DE LA MALADIE ACTUELLE</h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Symptômes:</strong> {clinicalData.symptoms}
            </div>
            <div>
              <strong>Durée:</strong> {clinicalData.duration || "Non précisée"}
            </div>
            <div>
              <strong>Sévérité:</strong> {clinicalData.severity || "Non évaluée"}
            </div>
          </div>
        </div>

        {/* Examen physique */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">EXAMEN PHYSIQUE</h2>
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded">
              <h3 className="font-semibold text-green-800 mb-2">Signes vitaux</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>TA:</strong> {clinicalData.vitals.bp || "Non mesurée"}
                </div>
                <div>
                  <strong>FC:</strong> {clinicalData.vitals.hr || "Non mesurée"}
                </div>
                <div>
                  <strong>T°:</strong> {clinicalData.vitals.temp || "Non mesurée"}
                </div>
                <div>
                  <strong>SpO2:</strong> {clinicalData.vitals.spo2 || "Non mesurée"}
                </div>
                <div>
                  <strong>FR:</strong> {clinicalData.vitals.rr || "Non mesurée"}
                </div>
                <div>
                  <strong>Douleur:</strong> {clinicalData.vitals.pain || "Non évaluée"}/10
                </div>
              </div>
            </div>
            {clinicalData.physicalExam && (
              <div>
                <h3 className="font-semibold mb-2">Examen clinique</h3>
                <p className="text-sm">{clinicalData.physicalExam}</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Diagnostic */}
        {enhancedResults && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              DIAGNOSTIC
            </h2>
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">Impression clinique</h3>
                <p className="text-sm">{enhancedResults.diagnostic_analysis?.clinical_impression}</p>
              </div>

              {enhancedResults.diagnostic_analysis?.differential_diagnoses && (
                <div>
                  <h3 className="font-semibold mb-2">Diagnostics différentiels</h3>
                  <div className="space-y-2">
                    {enhancedResults.diagnostic_analysis.differential_diagnoses.map((diag: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{diag.diagnosis}</p>
                            <p className="text-sm text-gray-600">Code ICD-10: {diag.icd10}</p>
                            <p className="text-sm mt-1">{diag.reasoning}</p>
                          </div>
                          <div className="text-right">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                              {diag.probability}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prescription */}
        {prescriptionData && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Pill className="h-5 w-5 mr-2" />
              TRAITEMENT PRESCRIT
            </h2>
            <div className="space-y-3">
              {prescriptionData.prescription?.medications?.map((med: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-semibold">{med.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <div>
                      <strong>Dosage:</strong> {med.strength}
                    </div>
                    <div>
                      <strong>Posologie:</strong> {med.dosage}
                    </div>
                    <div>
                      <strong>Durée:</strong> {med.duration}
                    </div>
                    <div>
                      <strong>Instructions:</strong> {med.instructions}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examens complémentaires */}
        {recommendedExams && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">EXAMENS COMPLÉMENTAIRES PRESCRITS</h2>
            <div className="space-y-2">
              {recommendedExams.recommended_exams?.map((exam: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{exam.name}</span>
                  <span className="text-xs text-gray-500">{exam.indication}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suivi */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">PLAN DE SUIVI</h2>
          <div className="bg-yellow-50 p-4 rounded-lg">
            {prescriptionData?.prescription?.follow_up ? (
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Prochain RDV:</strong> {prescriptionData.prescription.follow_up.next_visit}
                </div>
                {prescriptionData.prescription.follow_up.warning_signs && (
                  <div>
                    <strong className="text-red-600">Signes d'alarme:</strong>
                    <ul className="list-disc list-inside ml-4 text-red-600">
                      {prescriptionData.prescription.follow_up.warning_signs.map((sign: string, index: number) => (
                        <li key={index}>{sign}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm">Réévaluation selon l'évolution clinique</p>
            )}
          </div>
        </div>

        {/* Notes additionnelles */}
        <div className="mb-6">
          <Label htmlFor="additionalNotes">Notes additionnelles</Label>
          <Textarea
            id="additionalNotes"
            value={reportData.additionalNotes}
            onChange={(e) => handleReportChange("additionalNotes", e.target.value)}
            placeholder="Notes complémentaires, observations particulières..."
            rows={4}
            className="mt-1"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-600">Date: {reportData.consultationDate}</p>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-8 w-48">
                <p className="text-sm font-semibold">{doctorInfo.name}</p>
                <p className="text-xs text-gray-600">{doctorInfo.specialty}</p>
                <p className="text-xs text-gray-600">Signature et cachet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
