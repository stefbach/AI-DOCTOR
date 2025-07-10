"use client"

import { FileText, User, Calendar, Phone, MapPin, Stethoscope, Brain, Pill, AlertTriangle } from "lucide-react"

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
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg rounded-lg">
      {/* En-tête du document */}
      <div className="border-b-2 border-blue-600 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">COMPTE-RENDU DE CONSULTATION</h1>
            <p className="text-lg text-gray-600">Médecine Générale</p>
          </div>
          <div className="text-right">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Date de consultation</p>
              <p className="text-lg font-semibold">{currentDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Informations praticien */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-600" />
          Praticien
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold">Dr. Jean MARTIN</p>
            <p className="text-gray-600">Médecin Généraliste</p>
            <p className="text-gray-600">N° RPPS: 12345678901</p>
          </div>
          <div>
            <p className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              123 Avenue de la Santé, 75000 Paris
            </p>
            <p className="flex items-center text-gray-600">
              <Phone className="h-4 w-4 mr-1" />
              01 23 45 67 89
            </p>
          </div>
        </div>
      </div>

      {/* Informations patient */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-green-600" />
          Informations Patient
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p>
              <span className="font-semibold">Nom:</span> {patientData.name || "Non renseigné"}
            </p>
            <p>
              <span className="font-semibold">Âge:</span> {patientData.age || "Non renseigné"} ans
            </p>
            <p>
              <span className="font-semibold">Genre:</span>{" "}
              {patientData.gender === "M"
                ? "Masculin"
                : patientData.gender === "F"
                  ? "Féminin"
                  : patientData.gender || "Non renseigné"}
            </p>
            {patientData.weight && (
              <p>
                <span className="font-semibold">Poids:</span> {patientData.weight} kg
              </p>
            )}
            {patientData.height && (
              <p>
                <span className="font-semibold">Taille:</span> {patientData.height} cm
              </p>
            )}
          </div>
          <div className="space-y-2">
            {patientData.insurance && (
              <p>
                <span className="font-semibold">Assurance:</span> {patientData.insurance}
              </p>
            )}
            {patientData.emergencyContact && (
              <p>
                <span className="font-semibold">Contact d'urgence:</span> {patientData.emergencyContact}
              </p>
            )}
          </div>
        </div>

        {patientData.medicalHistory && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Antécédents médicaux:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">{patientData.medicalHistory}</p>
          </div>
        )}

        {patientData.currentMedications && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Traitements actuels:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">{patientData.currentMedications}</p>
          </div>
        )}

        {patientData.allergies && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2 text-red-600">Allergies connues:</h3>
            <p className="text-red-700 bg-red-50 p-3 rounded border border-red-200">{patientData.allergies}</p>
          </div>
        )}
      </div>

      {/* Motif de consultation et examen */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Stethoscope className="h-5 w-5 mr-2 text-purple-600" />
          Consultation
        </h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Motif de consultation:</h3>
            <p className="text-gray-700 bg-blue-50 p-3 rounded">{clinicalData.chiefComplaint || "Non renseigné"}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Histoire de la maladie actuelle:</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded">{clinicalData.symptoms || "Non renseigné"}</p>
            {clinicalData.duration && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-semibold">Durée:</span> {clinicalData.duration}
              </p>
            )}
            {clinicalData.severity && (
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Sévérité:</span> {clinicalData.severity}
              </p>
            )}
          </div>

          {clinicalData.physicalExam && (
            <div>
              <h3 className="font-semibold mb-2">Examen physique:</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{clinicalData.physicalExam}</p>
            </div>
          )}

          {/* Signes vitaux */}
          {(clinicalData.vitals.bp ||
            clinicalData.vitals.hr ||
            clinicalData.vitals.temp ||
            clinicalData.vitals.spo2) && (
            <div>
              <h3 className="font-semibold mb-2">Signes vitaux:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-green-50 p-3 rounded">
                {clinicalData.vitals.bp && <p>TA: {clinicalData.vitals.bp}</p>}
                {clinicalData.vitals.hr && <p>FC: {clinicalData.vitals.hr}</p>}
                {clinicalData.vitals.temp && <p>T°: {clinicalData.vitals.temp}</p>}
                {clinicalData.vitals.spo2 && <p>SpO2: {clinicalData.vitals.spo2}</p>}
                {clinicalData.vitals.rr && <p>FR: {clinicalData.vitals.rr}</p>}
                {clinicalData.vitals.pain && <p>Douleur: {clinicalData.vitals.pain}/10</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostic */}
      {enhancedResults && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-indigo-600" />
            Diagnostic
          </h2>

          {enhancedResults.diagnostic_analysis?.clinical_impression && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Impression clinique:</h3>
              <p className="text-gray-700 bg-indigo-50 p-3 rounded">
                {enhancedResults.diagnostic_analysis.clinical_impression}
              </p>
            </div>
          )}

          {enhancedResults.diagnostic_analysis?.differential_diagnoses && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Diagnostics différentiels:</h3>
              <div className="space-y-3">
                {enhancedResults.diagnostic_analysis.differential_diagnoses.map((diag: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{diag.diagnosis}</h4>
                      <div className="flex space-x-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{diag.probability}%</span>
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">{diag.icd10}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{diag.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prescription */}
      {prescriptionData && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Pill className="h-5 w-5 mr-2 text-green-600" />
            Prescription
          </h2>

          {prescriptionData.prescription?.medications && (
            <div className="space-y-4">
              {prescriptionData.prescription.medications.map((med: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{med.name}</h4>
                    {med.brand_name && <span className="text-sm text-gray-600">({med.brand_name})</span>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p>
                        <span className="font-semibold">Dosage:</span> {med.strength} - {med.form}
                      </p>
                      <p>
                        <span className="font-semibold">Posologie:</span> {med.dosage}
                      </p>
                      <p>
                        <span className="font-semibold">Durée:</span> {med.duration}
                      </p>
                    </div>
                    <div>
                      <p>
                        <span className="font-semibold">Quantité:</span> {med.quantity}
                      </p>
                      <p>
                        <span className="font-semibold">Indication:</span> {med.indication}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm">
                      <span className="font-semibold">Instructions:</span> {med.instructions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Examens complémentaires */}
      {recommendedExams?.recommended_exams && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-orange-600" />
            Examens Complémentaires Prescrits
          </h2>
          <div className="space-y-3">
            {recommendedExams.recommended_exams.map((exam: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{exam.name}</h4>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      exam.priority === "urgent"
                        ? "bg-red-100 text-red-800"
                        : exam.priority === "routine"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {exam.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Indication:</span> {exam.indication}
                </p>
                {exam.preparation && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Préparation:</span> {exam.preparation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suivi et recommandations */}
      {(prescriptionData?.prescription?.follow_up || enhancedResults?.recommendations) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            Suivi et Recommandations
          </h2>

          {prescriptionData?.prescription?.follow_up?.next_visit && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Prochain rendez-vous:</h3>
              <p className="text-gray-700 bg-blue-50 p-3 rounded">
                {prescriptionData.prescription.follow_up.next_visit}
              </p>
            </div>
          )}

          {enhancedResults?.recommendations?.follow_up && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Plan de suivi:</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{enhancedResults.recommendations.follow_up}</p>
            </div>
          )}

          {prescriptionData?.prescription?.follow_up?.warning_signs && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Signes d'alarme:
              </h3>
              <ul className="list-disc list-inside text-red-700 bg-red-50 p-3 rounded border border-red-200">
                {prescriptionData.prescription.follow_up.warning_signs.map((sign: string, index: number) => (
                  <li key={index}>{sign}</li>
                ))}
              </ul>
            </div>
          )}

          {prescriptionData?.prescription?.follow_up?.lifestyle_advice && (
            <div>
              <h3 className="font-semibold mb-2">Conseils hygiène de vie:</h3>
              <ul className="list-disc list-inside text-gray-700 bg-green-50 p-3 rounded">
                {prescriptionData.prescription.follow_up.lifestyle_advice.map((advice: string, index: number) => (
                  <li key={index}>{advice}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Signature */}
      <div className="mt-12 pt-8 border-t border-gray-300">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600">Document généré le {currentDate}</p>
            <p className="text-sm text-gray-600">Système Médical Expert - v2.0</p>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 w-48 mb-2"></div>
            <p className="text-sm font-semibold">Dr. Jean MARTIN</p>
            <p className="text-xs text-gray-600">Signature et cachet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
