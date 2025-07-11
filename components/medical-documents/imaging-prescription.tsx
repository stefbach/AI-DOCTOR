"use client"

import { useState } from "react"
import { Camera, Download, Printer, Calendar, User, Stethoscope } from "lucide-react"

interface ImagingPrescriptionProps {
  patientData: any
  clinicalData: any
  recommendedExams: any
  onGenerate?: () => void
}

export default function ImagingPrescription({
  patientData,
  clinicalData,
  recommendedExams,
  onGenerate,
}: ImagingPrescriptionProps) {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean MARTIN",
    specialty: "Médecine Interne",
    rpps: "12345678901",
    address: "123 Avenue de la Santé, 75000 Paris",
    phone: "01 23 45 67 89",
  })

  const [selectedExams, setSelectedExams] = useState([])
  const [urgency, setUrgency] = useState("normal")
  const [clinicalInfo, setClinicalInfo] = useState("")

  const imagingExams = [
    {
      id: "radio_thorax",
      name: "Radiographie du Thorax",
      code: "ZBQK002",
      preparation: "Aucune préparation particulière",
    },
    {
      id: "echo_abdo",
      name: "Échographie Abdominale",
      code: "ZCQH001",
      preparation: "À jeun depuis 6h",
    },
    {
      id: "scanner_thorax",
      name: "Scanner Thoracique",
      code: "ZCQK002",
      preparation: "Injection de produit de contraste possible",
    },
    {
      id: "irm_cerebrale",
      name: "IRM Cérébrale",
      code: "ZCQH010",
      preparation: "Retirer tous objets métalliques",
    },
    {
      id: "echo_cardiaque",
      name: "Échocardiographie",
      code: "ZCQK007",
      preparation: "Aucune préparation particulière",
    },
  ]

  const handleExamToggle = (examId) => {
    setSelectedExams((prev) => (prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId]))
  }

  const generatePrescription = () => {
    const prescription = {
      doctor: doctorInfo,
      patient: patientData,
      exams: selectedExams.map((id) => imagingExams.find((exam) => exam.id === id)),
      urgency,
      clinicalInfo,
      date: new Date().toLocaleDateString("fr-FR"),
    }

    // Simulation de génération
    console.log("Prescription générée:", prescription)
    if (onGenerate) onGenerate()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Camera className="h-6 w-6 mr-3 text-blue-600" />
        Prescription d'Examens d'Imagerie
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="space-y-6">
          {/* Informations médecin */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center">
              <Stethoscope className="h-5 w-5 mr-2" />
              Médecin Prescripteur
            </h3>
            <div className="space-y-2 text-sm">
              <input
                type="text"
                value={doctorInfo.name}
                onChange={(e) => setDoctorInfo({ ...doctorInfo, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Nom du médecin"
              />
              <input
                type="text"
                value={doctorInfo.specialty}
                onChange={(e) => setDoctorInfo({ ...doctorInfo, specialty: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Spécialité"
              />
              <input
                type="text"
                value={doctorInfo.rpps}
                onChange={(e) => setDoctorInfo({ ...doctorInfo, rpps: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="N° RPPS"
              />
            </div>
          </div>

          {/* Sélection examens */}
          <div>
            <h3 className="font-semibold mb-3">Examens à Prescrire</h3>
            <div className="space-y-2">
              {imagingExams.map((exam) => (
                <label
                  key={exam.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedExams.includes(exam.id)}
                    onChange={() => handleExamToggle(exam.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{exam.name}</div>
                    <div className="text-sm text-gray-600">Code: {exam.code}</div>
                    <div className="text-xs text-gray-500">{exam.preparation}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Urgence */}
          <div>
            <h3 className="font-semibold mb-3">Degré d'Urgence</h3>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="normal">Normal (sous 15 jours)</option>
              <option value="urgent">Urgent (sous 48h)</option>
              <option value="tres_urgent">Très urgent (dans la journée)</option>
            </select>
          </div>

          {/* Renseignements cliniques */}
          <div>
            <h3 className="font-semibold mb-3">Renseignements Cliniques</h3>
            <textarea
              value={clinicalInfo}
              onChange={(e) => setClinicalInfo(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Contexte clinique, symptômes, hypothèses diagnostiques..."
            />
          </div>
        </div>

        {/* Aperçu prescription */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold mb-4">Aperçu de la Prescription</h3>

          <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 min-h-96">
            {/* En-tête */}
            <div className="text-center mb-6">
              <h4 className="font-bold text-lg">{doctorInfo.name}</h4>
              <p className="text-sm">{doctorInfo.specialty}</p>
              <p className="text-xs text-gray-600">N° RPPS: {doctorInfo.rpps}</p>
              <p className="text-xs text-gray-600">{doctorInfo.address}</p>
            </div>

            <hr className="my-4" />

            {/* Patient */}
            <div className="mb-4">
              <h5 className="font-semibold flex items-center mb-2">
                <User className="h-4 w-4 mr-2" />
                Patient
              </h5>
              <p className="text-sm">
                <strong>{patientData?.name || "Nom Patient"}</strong>
              </p>
              <p className="text-sm">
                {patientData?.age || "XX"} ans - {patientData?.gender || "Genre"}
              </p>
            </div>

            {/* Date */}
            <div className="mb-4">
              <p className="text-sm flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Le {new Date().toLocaleDateString("fr-FR")}
              </p>
            </div>

            {/* Examens prescrits */}
            <div className="mb-4">
              <h5 className="font-semibold mb-2">Examens Prescrits:</h5>
              {selectedExams.length > 0 ? (
                <ul className="list-disc list-inside text-sm space-y-1">
                  {selectedExams.map((examId) => {
                    const exam = imagingExams.find((e) => e.id === examId)
                    return (
                      <li key={examId}>
                        {exam?.name} ({exam?.code})
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun examen sélectionné</p>
              )}
            </div>

            {/* Urgence */}
            {urgency !== "normal" && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-red-600">
                  {urgency === "urgent" ? "URGENT - À réaliser sous 48h" : "TRÈS URGENT - À réaliser dans la journée"}
                </p>
              </div>
            )}

            {/* Renseignements cliniques */}
            {clinicalInfo && (
              <div className="mb-4">
                <h5 className="font-semibold mb-2">Renseignements Cliniques:</h5>
                <p className="text-sm">{clinicalInfo}</p>
              </div>
            )}

            {/* Signature */}
            <div className="mt-8 text-right">
              <p className="text-sm">Signature et cachet du médecin</p>
              <div className="h-16 border-b border-gray-300 mt-2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={generatePrescription}
          disabled={selectedExams.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold"
        >
          <Camera className="h-5 w-5 mr-2" />
          Générer Prescription
        </button>

        <div className="flex space-x-3">
          <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </button>
          <button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </button>
        </div>
      </div>
    </div>
  )
}
