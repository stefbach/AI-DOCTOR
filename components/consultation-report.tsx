"use client"

import { useState } from "react"
import { FileText, Download, Printer, Edit, Calendar, User, Brain, Users } from "lucide-react"

const ConsultationReportPanel = ({ patientData, clinicalPresentation, diagnosis, selectedDiagnoses, prescription }) => {
  const [editMode, setEditMode] = useState(false)
  const [reportData, setReportData] = useState({
    consultationDate: new Date().toISOString().split("T")[0],
    doctor: "Dr. [Nom du Médecin]",
    speciality: "Médecine Générale",
    consultationType: "Consultation",
    clinicalExamination: "",
    additionalNotes: "",
    recommendations: "",
    followUp: "",
  })

  const updateReportData = (field, value) => {
    setReportData((prev) => ({ ...prev, [field]: value }))
  }

  const formatVitalSigns = () => {
    const vitals = []
    if (clinicalPresentation.systolicBP && clinicalPresentation.diastolicBP) {
      vitals.push(`TA: ${clinicalPresentation.systolicBP}/${clinicalPresentation.diastolicBP} mmHg`)
    }
    if (clinicalPresentation.heartRate) {
      vitals.push(`FC: ${clinicalPresentation.heartRate} bpm`)
    }
    if (clinicalPresentation.temperature) {
      vitals.push(`T°: ${clinicalPresentation.temperature}°C`)
    }
    if (clinicalPresentation.oxygenSaturation) {
      vitals.push(`SpO2: ${clinicalPresentation.oxygenSaturation}%`)
    }
    return vitals.join(", ")
  }

  const generateFullReport = () => {
    return `COMPTE-RENDU DE CONSULTATION MÉDICALE

═══════════════════════════════════════════════════════════════

INFORMATIONS PATIENT
Date de consultation: ${new Date(reportData.consultationDate).toLocaleDateString("fr-FR")}
Médecin: ${reportData.doctor}
Spécialité: ${reportData.speciality}
Type: ${reportData.consultationType}

IDENTITÉ PATIENT
Nom: ${patientData.name}
Âge: ${patientData.age} ans
Sexe: ${patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : "Autre"}
${patientData.ethnicity ? `Ethnie: ${patientData.ethnicity}` : ""}
${patientData.weight ? `Poids: ${patientData.weight} kg` : ""}
${patientData.height ? `Taille: ${patientData.height} cm` : ""}
${patientData.weight && patientData.height ? `IMC: ${Math.round((patientData.weight / Math.pow(patientData.height / 100, 2)) * 10) / 10}` : ""}

ANTÉCÉDENTS
${
  patientData.medicalHistory?.length > 0
    ? `Médicaux: ${patientData.medicalHistory.map((h) => `${h.condition || h.customCondition} (${h.year})`).join(", ")}`
    : "Médicaux: Aucun antécédent significatif"
}

${
  patientData.surgicalHistory?.length > 0
    ? `Chirurgicaux: ${patientData.surgicalHistory.map((s) => `${s.procedure} (${s.year})`).join(", ")}`
    : "Chirurgicaux: Aucun antécédent chirurgical"
}

${
  patientData.familyHistory?.length > 0
    ? `Familiaux: ${patientData.familyHistory.map((f) => `${f.condition} (${f.relation}${f.age ? `, ${f.age} ans` : ""})`).join(", ")}`
    : "Familiaux: Aucun antécédent familial significatif"
}

TRAITEMENTS EN COURS
${
  patientData.currentMedications?.length > 0
    ? patientData.currentMedications.map((med) => `- ${med.name} ${med.dosage} ${med.frequency}`).join("\n")
    : "Aucun traitement médicamenteux en cours"
}

═══════════════════════════════════════════════════════════════

MOTIF DE CONSULTATION
${clinicalPresentation.chiefComplaint}

HISTOIRE DE LA MALADIE ACTUELLE
${clinicalPresentation.symptoms}

SIGNES VITAUX
${formatVitalSigns()}

EXAMEN CLINIQUE
${reportData.clinicalExamination || "À compléter lors de la consultation"}

═══════════════════════════════════════════════════════════════

DIAGNOSTIC(S) RETENU(S)
${
  selectedDiagnoses?.length > 0
    ? selectedDiagnoses
        .map(
          (diag, index) =>
            `${index + 1}. ${diag.diagnosis} (${diag.icd10_code}) - Probabilité: ${diag.probability_percent}%
   Sévérité: ${diag.severity} | Urgence: ${diag.urgency}
   Raisonnement: ${diag.clinical_reasoning}`,
        )
        .join("\n\n")
    : "Diagnostic en cours d'évaluation"
}

═══════════════════════════════════════════════════════════════

PRESCRIPTION
${
  prescription?.prescription?.medications?.length > 0
    ? prescription.prescription.medications
        .map(
          (med, index) =>
            `${index + 1}. ${med.medication_name} ${med.strength || ""}
   Posologie: ${med.dosage_regimen?.dose} ${med.dosage_regimen?.frequency}
   Durée: ${med.dosage_regimen?.duration}
   Instructions: ${med.instructions?.french}
   Quantité: ${med.quantity}
`,
        )
        .join("\n")
    : "Aucune prescription médicamenteuse"
}

RECOMMANDATIONS
${
  reportData.recommendations ||
  `
- Respecter scrupuleusement la prescription
- Surveillance de l'évolution des symptômes
- Consulter en urgence si aggravation
- Maintenir une bonne hygiène de vie`
}

SUIVI
Prochain rendez-vous: ${prescription?.prescription?.follow_up_instructions?.next_appointment || reportData.followUp || "À programmer selon évolution"}

Signaux d'alarme nécessitant une consultation urgente:
${
  prescription?.prescription?.follow_up_instructions?.warning_signs?.map((sign) => `- ${sign}`).join("\n") ||
  "- Aggravation des symptômes\n- Apparition de nouveaux symptômes\n- Effets secondaires importants"
}

NOTES COMPLÉMENTAIRES
${reportData.additionalNotes || "RAS"}

═══════════════════════════════════════════════════════════════

Signature: ${reportData.doctor}
Date: ${new Date().toLocaleDateString("fr-FR")}
Cachet médical

═══════════════════════════════════════════════════════════════
Ce compte-rendu a été généré par le Système Médical Expert v6.0
Consultation ID: ${diagnosis?.consultationId || "N/A"}
`.trim()
  }

  const downloadReport = () => {
    const reportText = generateFullReport()
    const blob = new Blob([reportText], { type: "text/plain; charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Compte-Rendu_${patientData.name}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const reportText = generateFullReport()
    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <html>
        <head>
          <title>Compte-Rendu de Consultation</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 20px;
              line-height: 1.4;
              font-size: 12px;
            }
            h1 { color: #2563eb; text-align: center; }
            .report { white-space: pre-line; }
            @media print {
              body { margin: 15px; font-size: 11px; }
            }
          </style>
        </head>
        <body>
          <h1>Compte-Rendu de Consultation Médicale</h1>
          <div class="report">${reportText}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold flex items-center">
          <FileText className="h-7 w-7 mr-3 text-indigo-600" />
          Compte-Rendu de Consultation
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            {editMode ? "Mode Lecture" : "Personnaliser"}
          </button>
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </button>
          <button
            onClick={printReport}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center transition-colors"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Mode édition - Champs personnalisables */}
      {editMode && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold mb-4 text-gray-800">Personnalisation du Compte-Rendu</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de consultation</label>
              <input
                type="date"
                value={reportData.consultationDate}
                onChange={(e) => updateReportData("consultationDate", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Médecin</label>
              <input
                type="text"
                value={reportData.doctor}
                onChange={(e) => updateReportData("doctor", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. Nom Prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spécialité</label>
              <select
                value={reportData.speciality}
                onChange={(e) => updateReportData("speciality", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Médecine Générale">Médecine Générale</option>
                <option value="Cardiologie">Cardiologie</option>
                <option value="Pneumologie">Pneumologie</option>
                <option value="Gastro-entérologie">Gastro-entérologie</option>
                <option value="Neurologie">Neurologie</option>
                <option value="Endocrinologie">Endocrinologie</option>
                <option value="Urgences">Médecine d'Urgence</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de consultation</label>
              <select
                value={reportData.consultationType}
                onChange={(e) => updateReportData("consultationType", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Consultation">Consultation</option>
                <option value="Urgence">Consultation d'urgence</option>
                <option value="Suivi">Consultation de suivi</option>
                <option value="Contrôle">Consultation de contrôle</option>
                <option value="Prévention">Consultation préventive</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Examen clinique</label>
              <textarea
                value={reportData.clinicalExamination}
                onChange={(e) => updateReportData("clinicalExamination", e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Décrire l'examen physique réalisé (inspection, palpation, auscultation, percussion...)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recommandations particulières</label>
              <textarea
                value={reportData.recommendations}
                onChange={(e) => updateReportData("recommendations", e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Recommandations spécifiques au patient..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Suivi</label>
              <input
                type="text"
                value={reportData.followUp}
                onChange={(e) => updateReportData("followUp", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Prochain RDV, délai de suivi..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes complémentaires</label>
              <textarea
                value={reportData.additionalNotes}
                onChange={(e) => updateReportData("additionalNotes", e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Observations particulières, context social, compliance..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Aperçu du compte-rendu */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold mb-4 text-gray-800 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Aperçu du Compte-Rendu
        </h4>

        <div className="bg-white border border-gray-300 rounded-lg p-6 font-mono text-sm whitespace-pre-line max-h-96 overflow-y-auto">
          {generateFullReport()}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <div className="font-semibold text-blue-800">Consultation</div>
          <div className="text-sm text-blue-700">
            {new Date(reportData.consultationDate).toLocaleDateString("fr-FR")}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <User className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <div className="font-semibold text-green-800">Patient</div>
          <div className="text-sm text-green-700">
            {patientData.name}, {patientData.age} ans
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <Brain className="h-8 w-8 mx-auto mb-2 text-purple-600" />
          <div className="font-semibold text-purple-800">Diagnostic(s)</div>
          <div className="text-sm text-purple-700">{selectedDiagnoses?.length || 0} diagnostic(s)</div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-orange-600" />
          <div className="font-semibold text-orange-800">Antécédents</div>
          <div className="text-sm text-orange-700">
            {(patientData.medicalHistory?.length || 0) + (patientData.familyHistory?.length || 0)} antécédent(s)
          </div>
        </div>
      </div>

      {/* Information système */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <FileText className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <div className="font-semibold mb-1">📋 Informations Compte-Rendu</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Compte-rendu généré automatiquement à partir des données de consultation</li>
              <li>Inclut antécédents personnels et familiaux détaillés</li>
              <li>Personnalisable selon les besoins du praticien</li>
              <li>Format adapté pour archivage et transmission</li>
              <li>Conforme aux standards de documentation médicale mauricienne</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsultationReportPanel
