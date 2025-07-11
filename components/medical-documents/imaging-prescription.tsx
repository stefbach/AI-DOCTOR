"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Microscope, User, AlertTriangle, Camera, Zap } from "lucide-react"

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
  recommendedExams
}: ImagingPrescriptionProps) {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean MARTIN",
    specialty: "Médecine Générale",
    rpps: "12345678901",
    address: "123 Avenue de la Santé, 75000 Paris",
    phone: "01.23.45.67.89",
    adeli: "751234567"
  })

  const [prescriptionData, setPrescriptionData] = useState({
    prescriptionDate: new Date().toLocaleDateString('fr-FR'),
    urgency: "Normal",
    clinicalInfo: clinicalData.chiefComplaint || "",
    clinicalQuestion: "",
    additionalNotes: "",
    contrast: false,
    preparation: ""
  })

  const [selectedExams, setSelectedExams] = useState({
    // Radiologie conventionnelle
    radio_thorax: false,
    radio_abdomen: false,
    radio_bassin: false,
    radio_rachis: false,
    radio_membres: false,
    
    // Échographie
    echo_abdomen: false,
    echo_pelvien: false,
    echo_thyroide: false,
    echo_cardiaque: false,
    echo_doppler: false,
    
    // Scanner
    scanner_thorax: false,
    scanner_abdomen: false,
    scanner_cerebral: false,
    scanner_rachis: false,
    
    // IRM
    irm_cerebral: false,
    irm_rachis: false,
    irm_abdomen: false,
    irm_membres: false,
    
    // Examens spécialisés
    mammographie: false,
    densitometrie: false,
    scintigraphie: false,
    
    // Examens personnalisés
    custom_exams: []
  })

  const [customExam, setCustomExam] = useState("")

  const handleDoctorChange = useCallback((field: string, value: string) => {
    setDoctorInfo(prev => ({ ...prev, [field]: value }))
  }, [])

  const handlePrescriptionChange = useCallback((field: string, value: string | boolean) => {
    setPrescriptionData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleExamChange = useCallback((exam: string, checked: boolean) => {
    setSelectedExams(prev => ({ ...prev, [exam]: checked }))
  }, [])

  const handleCustomExamChange = useCallback((value: string) => {
    setCustomExam(value)
  }, [])

  const addCustomExam = useCallback(() => {
    if (customExam.trim()) {
      setSelectedExams(prev => ({
        ...prev,
        custom_exams: [...prev.custom_exams, customExam.trim()]
      }))
      setCustomExam("")
    }
  }, [customExam])

  const removeCustomExam = useCallback((index: number) => {
    setSelectedExams(prev => ({
      ...prev,
      custom_exams: prev.custom_exams.filter((_, i) => i !== index)
    }))
  }, [])

  const examCategories = {
    "Radiologie Conventionnelle": [
      { key: "radio_thorax", label: "Radiographie thoracique (face + profil)", code: "ZBQK002", icon: Camera },
      { key: "radio_abdomen", label: "Radiographie abdomen sans préparation", code: "ZBQK003", icon: Camera },
      { key: "radio_bassin", label: "Radiographie du bassin", code: "ZBQK004", icon: Camera },
      { key: "radio_rachis", label: "Radiographie du rachis", code: "ZBQK005", icon: Camera },
      { key: "radio_membres", label: "Radiographie des membres", code: "ZBQK006", icon: Camera }
    ],
    "Échographie": [
      { key: "echo_abdomen", label: "Échographie abdominale", code: "ZCQH001", icon: Zap },
      { key: "echo_pelvien", label: "Échographie pelvienne", code: "ZCQH002", icon: Zap },
      { key: "echo_thyroide", label: "Échographie thyroïdienne", code: "ZCQH003", icon: Zap },
      { key: "echo_cardiaque", label: "Échocardiographie", code: "ZCQH004", icon: Zap },
      { key: "echo_doppler", label: "Écho-Doppler vasculaire", code: "ZCQH005", icon: Zap }
    ],
    "Scanner (TDM)": [
      { key: "scanner_thorax", label: "Scanner thoracique", code: "ZBQH001", icon: Microscope },
      { key: "scanner_abdomen", label: "Scanner abdomino-pelvien", code: "ZBQH002", icon: Microscope },
      { key: "scanner_cerebral", label: "Scanner cérébral", code: "ZBQH003", icon: Microscope },
      { key: "scanner_rachis", label: "Scanner du rachis", code: "ZBQH004", icon: Microscope }
    ],
    "IRM": [
      { key: "irm_cerebral", label: "IRM cérébrale", code: "ZAQH001", icon: Microscope },
      { key: "irm_rachis", label: "IRM du rachis", code: "ZAQH002", icon: Microscope },
      { key: "irm_abdomen", label: "IRM abdominale", code: "ZAQH003", icon: Microscope },
      { key: "irm_membres", label: "IRM des membres", code: "ZAQH004", icon: Microscope }
    ],
    "Examens Spécialisés": [
      { key: "mammographie", label: "Mammographie bilatérale", code: "QEQH001", icon: Camera },
      { key: "densitometrie", label: "Densitométrie osseuse", code: "ZFQH001", icon: Microscope },
      { key: "scintigraphie", label: "Scintigraphie", code: "ZCQN001", icon: Zap }
    ]
  }

  const getSelectedExamsCount = () => {
    return Object.values(selectedExams).filter(value => 
      typeof value === 'boolean' ? value : value.length > 0
    ).length + selectedExams.custom_exams.length
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Microscope className="h-5 w-5 mr-2" />
              Sélection des Examens d'Imagerie
            </div>
            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {getSelectedExamsCount()} examen(s) sélectionné(s)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(examCategories).map(([category, exams]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3 text-blue-800 flex items-center">
                  {exams[0].icon && <exams[0].icon className=\"h-5 w-5 mr-2\" />}\
                  {category}
                </h3>\
                <div className="grid grid-cols-1 gap-3">
                  {exams.map((exam) => (
                    <div key={exam.key} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={exam.key}
                        checked={selectedExams[exam.key]}
                        onCheckedChange={(checked) => handleExamChange(exam.key, checked)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={exam.key} className="text-sm cursor-pointer font-medium">
                          {exam.label}
                        </Label>
                        <p className="text-xs text-gray-500">Code: {exam.code}</p>
                      </div>
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
                  placeholder="Ajouter un examen d'imagerie personnalisé..."
                  onKeyPress={(e) => e.key === 'Enter' && addCustomExam()}
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
                    <div key={index} className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200">
                      <span className="text-sm font-medium">{exam}</span>
                      <button
                        onClick={() => removeCustomExam(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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

      {/* Configuration de la prescription */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration de la Prescription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center space-x-2 mt-6">
                <Checkbox
                  id="contrast"
                  checked={prescriptionData.contrast}
                  onCheckedChange={(checked) => handlePrescriptionChange("contrast", checked)}
                />
                <Label htmlFor="contrast">Injection de produit de contraste</Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="clinicalQuestion">Question clinique précise</Label>
              <Textarea
                id="clinicalQuestion"
                value={prescriptionData.clinicalQuestion}
                onChange={(e) => handlePrescriptionChange("clinicalQuestion", e.target.value)}
                placeholder="Question précise posée au radiologue..."
                rows={2}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <div>
              <Label htmlFor="preparation">Instructions de préparation</Label>
              <Textarea
                id="preparation"
                value={prescriptionData.preparation}
                onChange={(e) => handlePrescriptionChange("preparation", e.target.value)}
                placeholder="Instructions spécifiques de préparation pour le patient..."
                rows={2}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ordonnance générée */}
      <div className="bg-white p-8 rounded-lg shadow-lg print:shadow-none print:p-6">
        {/* En-tête */}
        <div className="text-center mb-8 print:mb-6">
          <div className="border-b-2 border-blue-600 pb-4">
            <h1 className="text-2xl font-bold text-blue-800 mb-2">
              ORDONNANCE - EXAMENS D'IMAGERIE
            </h1>
            <div className="text-sm text-gray-600">
              <p className="font-semibold">{doctorInfo.name}</p>
              <p>{doctorInfo.specialty}</p>
              <p>N° RPPS: {doctorInfo.rpps} | N° ADELI: {doctorInfo.adeli}</p>
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
          <div className="flex items-center">
            {prescriptionData.urgency !== "Normal" && (
              <div className="bg-red-100 border border-red-300 px-3 py-1 rounded-full">
                <span className="text-red-800 font-semibold text-sm">
                  {prescriptionData.urgency.toUpperCase()}
                </span>
              </div>
            )}
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
              <div><strong>Nom:</strong> {patientData.name}</div>
              <div><strong>Âge:</strong> {patientData.age} ans</div>
              <div><strong>Genre:</strong> {patientData.gender}</div>
              <div><strong>Poids:</strong> {patientData.weight} kg</div>
            </div>
            {patientData.allergies && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <strong className="text-red-800">Allergies:</strong>
                <p className="text-sm text-red-700 mt-1">{patientData.allergies}</p>
              </div>
            )}
          </div>
        </div>

        {/* Renseignements cliniques */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">RENSEIGNEMENTS CLINIQUES</h2>
          <Textarea
            value={prescriptionData.clinicalInfo}
            onChange={(e) => handlePrescriptionChange("clinicalInfo", e.target.value)}
            placeholder="Contexte clinique, symptômes, antécédents pertinents..."
            rows={3}
            className="w-full"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Question clinique */}
        {prescriptionData.clinicalQuestion && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">QUESTION CLINIQUE</h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm">{prescriptionData.clinicalQuestion}</p>
            </div>
          </div>
        )}

        {/* Examens prescrits */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <Microscope className="h-5 w-5 mr-2" />
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

          {prescriptionData.contrast && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <span className="font-semibold text-orange-800">AVEC INJECTION DE PRODUIT DE CONTRASTE</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Vérifier la fonction rénale et les allergies avant injection
              </p>
            </div>
          )}

          <div className="space-y-4">
            {Object.entries(examCategories).map(([category, exams]) => {
              const selectedInCategory = exams.filter(exam => selectedExams[exam.key])
              if (selectedInCategory.length === 0) return null

              return (
                <div key={category}>
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                    {selectedInCategory[0].icon && <selectedInCategory[0].icon className="h-4 w-4 mr-2" />}\
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {selectedInCategory.map((exam) => (
                      <div key={exam.key} className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
                        <div>
                          <span className="text-sm font-medium">{exam.label}</span>
                          <p className="text-xs text-gray-500">Code: {exam.code}</p>
                        </div>
                        {prescriptionData.contrast && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            + Contraste
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {selectedExams.custom_exams.length > 0 && (
              <div>
                <h3 className="font-semibold text-green-800 mb-2">Examens Spécifiques</h3>
                <div className="space-y-2">
                  {selectedExams.custom_exams.map((exam, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded border border-green-200">
                      <span className="text-sm font-medium">{exam}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Préparation */}
        {prescriptionData.preparation && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">PRÉPARATION</h2>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm">{prescriptionData.preparation}</p>
            </div>
          </div>
        )}

        {/* Instructions générales */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">INSTRUCTIONS</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <p>• Apporter les examens antérieurs et la liste des médicaments</p>
            <p>• Signaler toute allergie ou problème rénal</p>
            <p>• Respecter les consignes de préparation si indiquées</p>
            <p>• Résultats à communiquer au médecin prescripteur</p>
            {prescriptionData.contrast && (
              <p className="text-orange-700 font-medium">
                • Contrôle de la créatinine obligatoire avant injection de contraste
              </p>
            )}
          </div>
        </div>

        {/* Notes additionnelles */}
        <div className="mb-6">
          <Label htmlFor="additionalNotes">Notes complémentaires</Label>
          <Textarea
            id="additionalNotes"
            value={prescriptionData.additionalNotes}
            onChange={(e) => handlePrescriptionChange("additionalNotes", e.target.value)}
            placeholder="Instructions particulières, précisions techniques..."
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
              {prescriptionData.contrast && (
                <p className="text-sm text-orange-600 font-medium">Avec produit de contraste</p>
              )}
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
  )\
}
