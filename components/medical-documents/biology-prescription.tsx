"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { FlaskConical, User, AlertTriangle } from "lucide-react"

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
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean MARTIN",
    specialty: "Médecine Générale",
    rpps: "12345678901",
    address: "123 Avenue de la Santé, 75000 Paris",
    phone: "01.23.45.67.89",
    adeli: "751234567",
  })

  const [prescriptionData, setPrescriptionData] = useState({
    prescriptionDate: new Date().toLocaleDateString("fr-FR"),
    urgency: "Normal",
    clinicalInfo: clinicalData.chiefComplaint || "",
    additionalNotes: "",
  })

  const [selectedExams, setSelectedExams] = useState({
    // Hématologie
    nfs: false,
    reticulocytes: false,
    vs: false,
    crp: false,

    // Biochimie
    glycemie: false,
    hba1c: false,
    uree: false,
    creatinine: false,
    ionogramme: false,
    bilan_lipidique: false,
    bilan_hepatique: false,

    // Endocrinologie
    tsh: false,
    t3_t4: false,
    cortisol: false,

    // Cardiologie
    troponine: false,
    bnp: false,

    // Infectieux
    vih: false,
    hepatites: false,
    syphilis: false,

    // Immunologie
    anca: false,
    ana: false,

    // Autres
    vitamine_d: false,
    vitamine_b12: false,
    ferritine: false,

    // Examens personnalisés
    custom_exams: [],
  })

  const [customExam, setCustomExam] = useState("")

  const handleDoctorChange = useCallback((field: string, value: string) => {
    setDoctorInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handlePrescriptionChange = useCallback((field: string, value: string) => {
    setPrescriptionData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleExamChange = useCallback((exam: string, checked: boolean) => {
    setSelectedExams((prev) => ({ ...prev, [exam]: checked }))
  }, [])

  const handleCustomExamChange = useCallback((value: string) => {
    setCustomExam(value)
  }, [])

  const addCustomExam = useCallback(() => {
    if (customExam.trim()) {
      setSelectedExams((prev) => ({
        ...prev,
        custom_exams: [...prev.custom_exams, customExam.trim()],
      }))
      setCustomExam("")
    }
  }, [customExam])

  const removeCustomExam = useCallback((index: number) => {
    setSelectedExams((prev) => ({
      ...prev,
      custom_exams: prev.custom_exams.filter((_, i) => i !== index),
    }))
  }, [])

  const examCategories = {
    Hématologie: [
      { key: "nfs", label: "NFS (Numération Formule Sanguine)", code: "B0101" },
      { key: "reticulocytes", label: "Réticulocytes", code: "B0102" },
      { key: "vs", label: "Vitesse de Sédimentation", code: "B0103" },
      { key: "crp", label: "CRP (Protéine C Réactive)", code: "B0104" },
    ],
    Biochimie: [
      { key: "glycemie", label: "Glycémie à jeun", code: "B0201" },
      { key: "hba1c", label: "HbA1c (Hémoglobine glyquée)", code: "B0202" },
      { key: "uree", label: "Urée", code: "B0203" },
      { key: "creatinine", label: "Créatinine + DFG", code: "B0204" },
      { key: "ionogramme", label: "Ionogramme (Na, K, Cl)", code: "B0205" },
      { key: "bilan_lipidique", label: "Bilan lipidique complet", code: "B0206" },
      { key: "bilan_hepatique", label: "Bilan hépatique (ALAT, ASAT, GGT, PAL)", code: "B0207" },
    ],
    Endocrinologie: [
      { key: "tsh", label: "TSH (Thyréostimuline)", code: "B0301" },
      { key: "t3_t4", label: "T3 libre, T4 libre", code: "B0302" },
      { key: "cortisol", label: "Cortisol", code: "B0303" },
    ],
    Cardiologie: [
      { key: "troponine", label: "Troponine", code: "B0401" },
      { key: "bnp", label: "BNP ou NT-proBNP", code: "B0402" },
    ],
    Sérologies: [
      { key: "vih", label: "Sérologie VIH", code: "B0501" },
      { key: "hepatites", label: "Sérologies hépatites B et C", code: "B0502" },
      { key: "syphilis", label: "Sérologie syphilis (TPHA/VDRL)", code: "B0503" },
    ],
    Immunologie: [
      { key: "anca", label: "ANCA", code: "B0601" },
      { key: "ana", label: "Anticorps anti-nucléaires", code: "B0602" },
    ],
    "Vitamines et oligo-éléments": [
      { key: "vitamine_d", label: "Vitamine D (25-OH)", code: "B0701" },
      { key: "vitamine_b12", label: "Vitamine B12", code: "B0702" },
      { key: "ferritine", label: "Ferritine", code: "B0703" },
    ],
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Configuration praticien */}
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
              <Label htmlFor="adeli">N° ADELI</Label>
              <Input
                id="adeli"
                value={doctorInfo.adeli}
                onChange={(e) => handleDoctorChange("adeli", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sélection des examens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FlaskConical className="h-5 w-5 mr-2" />
            Sélection des Examens Biologiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(examCategories).map(([category, exams]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3 text-blue-800">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exams.map((exam) => (
                    <div key={exam.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={exam.key}
                        checked={selectedExams[exam.key]}
                        onCheckedChange={(checked) => handleExamChange(exam.key, checked)}
                      />
                      <Label htmlFor={exam.key} className="text-sm cursor-pointer">
                        {exam.label}
                        <span className="text-gray-500 ml-2">({exam.code})</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Examens personnalisés */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-green-800">Examens Personnalisés</h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={customExam}
                  onChange={(e) => handleCustomExamChange(e.target.value)}
                  placeholder="Ajouter un examen personnalisé..."
                  onKeyPress={(e) => e.key === "Enter" && addCustomExam()}
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  onClick={addCustomExam}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Ajouter
                </button>
              </div>
              {selectedExams.custom_exams.length > 0 && (
                <div className="space-y-2">
                  {selectedExams.custom_exams.map((exam, index) => (
                    <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded">
                      <span className="text-sm">{exam}</span>
                      <button
                        onClick={() => removeCustomExam(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ordonnance générée */}
      <div className="bg-white p-8 rounded-lg shadow-lg print:shadow-none print:p-6">
        {/* En-tête */}
        <div className="text-center mb-8 print:mb-6">
          <div className="border-b-2 border-green-600 pb-4">
            <h1 className="text-2xl font-bold text-green-800 mb-2">ORDONNANCE - EXAMENS BIOLOGIQUES</h1>
            <div className="text-sm text-gray-600">
              <p className="font-semibold">{doctorInfo.name}</p>
              <p>{doctorInfo.specialty}</p>
              <p>
                N° RPPS: {doctorInfo.rpps} | N° ADELI: {doctorInfo.adeli}
              </p>
              <p>{doctorInfo.address}</p>
              <p>Tél: {doctorInfo.phone}</p>
            </div>
          </div>
        </div>

        {/* Informations prescription */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <Label htmlFor="prescDate">Date de prescription</Label>
            <Input
              id="prescDate"
              value={prescriptionData.prescriptionDate}
              onChange={(e) => handlePrescriptionChange("prescriptionDate", e.target.value)}
              className="mt-1"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <div>
            <Label htmlFor="urgency">Urgence</Label>
            <select
              id="urgency"
              value={prescriptionData.urgency}
              onChange={(e) => handlePrescriptionChange("urgency", e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded"
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Très urgent">Très urgent</option>
            </select>
          </div>
        </div>

        {/* Patient */}
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
            </div>
          </div>
        </div>

        {/* Renseignements cliniques */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">RENSEIGNEMENTS CLINIQUES</h2>
          <Textarea
            value={prescriptionData.clinicalInfo}
            onChange={(e) => handlePrescriptionChange("clinicalInfo", e.target.value)}
            placeholder="Motif de la prescription, contexte clinique..."
            rows={3}
            className="w-full"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Examens prescrits */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <FlaskConical className="h-5 w-5 mr-2" />
            EXAMENS PRESCRITS
          </h2>

          {prescriptionData.urgency !== "Normal" && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="font-semibold text-red-800">URGENCE: {prescriptionData.urgency}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(examCategories).map(([category, exams]) => {
              const selectedInCategory = exams.filter((exam) => selectedExams[exam.key])
              if (selectedInCategory.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="font-semibold text-blue-800 mb-2">{category}</h3>
                  <div className="space-y-1">
                    {selectedInCategory.map((exam) => (
                      <div key={exam.key} className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">{exam.label}</span>
                        <span className="text-xs text-gray-500">{exam.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {selectedExams.custom_exams.length > 0 && (
              <div>
                <h3 className="font-semibold text-green-800 mb-2">Examens Spécifiques</h3>
                <div className="space-y-1">
                  {selectedExams.custom_exams.map((exam, index) => (
                    <div key={index} className="p-2 bg-green-50 rounded">
                      <span className="text-sm font-medium">{exam}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">INSTRUCTIONS</h2>
          <div className="bg-yellow-50 p-4 rounded-lg space-y-2 text-sm">
            <p>• Prélèvement à effectuer à jeun (12h) sauf indication contraire</p>
            <p>• Apporter la liste des médicaments en cours</p>
            <p>• Résultats à communiquer au médecin prescripteur</p>
            <p>• En cas d'urgence, contacter le médecin prescripteur</p>
          </div>
        </div>

        {/* Notes additionnelles */}
        <div className="mb-6">
          <Label htmlFor="additionalNotes">Notes complémentaires</Label>
          <Textarea
            id="additionalNotes"
            value={prescriptionData.additionalNotes}
            onChange={(e) => handlePrescriptionChange("additionalNotes", e.target.value)}
            placeholder="Instructions particulières, précisions..."
            rows={3}
            className="mt-1"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-600">Date: {prescriptionData.prescriptionDate}</p>
              <p className="text-sm text-gray-600">Urgence: {prescriptionData.urgency}</p>
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
