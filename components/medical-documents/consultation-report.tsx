"use client"

import { useState } from "react"
import { FileText, Download, Printer, Edit } from "lucide-react"

const ConsultationReportComponent = ({
  patientData,
  clinicalData,
  enhancedResults,
  prescriptionData,
  recommendedExams,
  examResults,
}) => {
  const [editMode, setEditMode] = useState(false)
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean DUPONT",
    specialty: "Médecine Générale",
    rpps: "10003123456",
    address: "123 Avenue de la République, 75011 Paris",
    phone: "01.42.12.34.56",
    email: "dr.dupont@cabinet-medical.fr",
  })

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateAge = () => {
    if (!patientData.age) return "Non renseigné"
    return `${patientData.age} ans`
  }

  const calculateBMI = () => {
    if (!patientData.weight || !patientData.height) return null
    const weight = Number.parseFloat(patientData.weight)
    const height = Number.parseFloat(patientData.height) / 100
    const bmi = weight / (height * height)
    return bmi.toFixed(1)
  }

  const generateFullReport = () => {
    const consultationDate = new Date()

    return `
══════════════════════════════════════════════════════════════════════════════
                        COMPTE-RENDU DE CONSULTATION MÉDICALE
══════════════════════════════════════════════════════════════════════════════

PRATICIEN
${doctorInfo.name}
${doctorInfo.specialty}
N° RPPS: ${doctorInfo.rpps}
${doctorInfo.address}
Tél: ${doctorInfo.phone} | Email: ${doctorInfo.email}

══════════════════════════════════════════════════════════════════════════════

CONSULTATION
Date: ${formatDate(consultationDate)}
Heure: ${formatTime(consultationDate)}
Type: Consultation de médecine générale
Lieu: Cabinet médical

══════════════════════════════════════════════════════════════════════════════

PATIENT
Nom et Prénom: ${patientData.name}
Âge: ${calculateAge()}
Sexe: ${patientData.gender === "M" ? "Masculin" : patientData.gender === "F" ? "Féminin" : "Non précisé"}
${patientData.weight ? `Poids: ${patientData.weight} kg` : ""}
${patientData.height ? `Taille: ${patientData.height} cm` : ""}
${calculateBMI() ? `IMC: ${calculateBMI()} kg/m²` : ""}
${patientData.insurance ? `Assurance: ${patientData.insurance}` : ""}
${patientData.emergencyContact ? `Contact d'urgence: ${patientData.emergencyContact}` : ""}

══════════════════════════════════════════════════════════════════════════════

ANTÉCÉDENTS
Médicaux: ${patientData.medicalHistory || "Aucun antécédent médical significatif rapporté"}

Chirurgicaux: Non renseignés

Familiaux: Non renseignés

Allergies: ${patientData.allergies || "Aucune allergie connue"}

Traitements en cours: ${patientData.currentMedications || "Aucun traitement médicamenteux en cours"}

══════════════════════════════════════════════════════════════════════════════

MOTIF DE CONSULTATION
${clinicalData.chiefComplaint}

HISTOIRE DE LA MALADIE ACTUELLE
${clinicalData.symptoms}

Durée d'évolution: ${clinicalData.duration || "Non précisée"}
Intensité: ${clinicalData.severity || "Non évaluée"}

══════════════════════════════════════════════════════════════════════════════

EXAMEN CLINIQUE
État général: Patient ${patientData.gender === "M" ? "conscient" : "consciente"}, ${patientData.gender === "M" ? "coopérant" : "coopérante"}

Signes vitaux:
${clinicalData.vitals?.bp ? `- Tension artérielle: ${clinicalData.vitals.bp} mmHg` : "- Tension artérielle: Non mesurée"}
${clinicalData.vitals?.hr ? `- Fréquence cardiaque: ${clinicalData.vitals.hr} bpm` : "- Fréquence cardiaque: Non mesurée"}
${clinicalData.vitals?.temp ? `- Température: ${clinicalData.vitals.temp}°C` : "- Température: Non mesurée"}
${clinicalData.vitals?.spo2 ? `- Saturation O2: ${clinicalData.vitals.spo2}%` : "- Saturation O2: Non mesurée"}
${clinicalData.vitals?.rr ? `- Fréquence respiratoire: ${clinicalData.vitals.rr}/min` : ""}
${clinicalData.vitals?.pain ? `- Échelle de douleur: ${clinicalData.vitals.pain}/10` : ""}

Examen physique:
${clinicalData.physicalExam || "Examen physique normal dans les limites explorées"}

══════════════════════════════════════════════════════════════════════════════

DIAGNOSTIC(S)
${
  enhancedResults?.diagnostic_analysis?.differential_diagnoses
    ?.map(
      (diag, index) =>
        `${index + 1}. ${diag.diagnosis} (${diag.icd10 || "Code ICD non attribué"})
   Probabilité: ${diag.probability}%
   Sévérité: ${diag.severity}
   Urgence: ${diag.urgency}
   Justification: ${diag.reasoning}
   ${diag.supporting_evidence ? `Éléments en faveur: ${diag.supporting_evidence.join(", ")}` : ""}
`,
    )
    .join("\n") || "Diagnostic en cours d'évaluation"
}

Impression clinique globale:
${enhancedResults?.diagnostic_analysis?.clinical_impression || "Évaluation en cours"}

Niveau de confiance: ${enhancedResults?.diagnostic_analysis?.confidence_level || "Non évalué"}

══════════════════════════════════════════════════════════════════════════════

EXAMENS COMPLÉMENTAIRES PRESCRITS
${
  recommendedExams?.recommended_exams
    ?.map(
      (exam, index) =>
        `${index + 1}. ${exam.name}
   Indication: ${exam.indication}
   Priorité: ${exam.priority}
   ${examResults[exam.id] ? `Résultat: ${examResults[exam.id]}` : "Résultat: En attente"}
`,
    )
    .join("\n") || "Aucun examen complémentaire prescrit"
}

══════════════════════════════════════════════════════════════════════════════

THÉRAPEUTIQUE
${
  prescriptionData?.prescription?.medications
    ?.map(
      (med, index) =>
        `${index + 1}. ${med.name} ${med.strength || ""}
   Posologie: ${med.dosage}
   Durée: ${med.duration}
   Indication: ${med.indication}
   Instructions: ${med.instructions}
   Quantité délivrée: ${med.quantity}
   ${med.monitoring ? `Surveillance: ${med.monitoring}` : ""}
`,
    )
    .join("\n") || "Aucune prescription médicamenteuse"
}

══════════════════════════════════════════════════════════════════════════════

RECOMMANDATIONS ET CONSEILS
${
  enhancedResults?.recommendations?.immediate_actions?.length > 0
    ? `Actions immédiates:
${enhancedResults.recommendations.immediate_actions.map((action) => `- ${action}`).join("\n")}

`
    : ""
}${
  enhancedResults?.recommendations?.lifestyle_modifications?.length > 0
    ? `Conseils hygiéno-diététiques:
${enhancedResults.recommendations.lifestyle_modifications.map((mod) => `- ${mod}`).join("\n")}

`
    : ""
}${
  prescriptionData?.prescription?.follow_up?.lifestyle_advice?.length > 0
    ? `Recommandations complémentaires:
${prescriptionData.prescription.follow_up.lifestyle_advice.map((advice) => `- ${advice}`).join("\n")}

`
    : ""
}

══════════════════════════════════════════════════════════════════════════════

SURVEILLANCE ET SUIVI
Prochain rendez-vous: ${prescriptionData?.prescription?.follow_up?.next_visit || enhancedResults?.recommendations?.follow_up || "À programmer selon l'évolution"}

Paramètres à surveiller:
${
  prescriptionData?.prescription?.follow_up?.monitoring?.map((param) => `- ${param}`).join("\n") ||
  enhancedResults?.risk_factors?.monitoring_required?.map((param) => `- ${param}`).join("\n") ||
  "- Évolution des symptômes"
}

Signes d'alarme nécessitant une consultation urgente:
${
  prescriptionData?.prescription?.follow_up?.warning_signs?.map((sign) => `- ${sign}`).join("\n") ||
  `- Aggravation des symptômes
- Apparition de nouveaux symptômes préoccupants
- Effets secondaires importants des traitements
- Fièvre persistante ou élevée`
}

══════════════════════════════════════════════════════════════════════════════

RÉFÉRENCE SPÉCIALISÉE
${enhancedResults?.recommendations?.specialist_referral || "Aucune référence spécialisée nécessaire à ce stade"}

══════════════════════════════════════════════════════════════════════════════

FACTEURS DE RISQUE IDENTIFIÉS
${
  enhancedResults?.risk_factors?.identified?.length > 0
    ? `Facteurs de risque présents:
${enhancedResults.risk_factors.identified.map((factor) => `- ${factor}`).join("\n")}

`
    : ""
}${
  enhancedResults?.risk_factors?.modifiable?.length > 0
    ? `Facteurs de risque modifiables:
${enhancedResults.risk_factors.modifiable.map((factor) => `- ${factor}`).join("\n")}

`
    : ""
}

══════════════════════════════════════════════════════════════════════════════

NOTES COMPLÉMENTAIRES
- Patient informé de son état de santé et des traitements proposés
- Consentement éclairé obtenu pour les traitements prescrits
- Remise des ordonnances et documents d'information
- Possibilité de recontact en cas de questions ou d'aggravation

══════════════════════════════════════════════════════════════════════════════

SIGNATURE ET VALIDATION
Date: ${formatDate(consultationDate)}
Heure: ${formatTime(consultationDate)}

Dr. ${doctorInfo.name}
${doctorInfo.specialty}
N° RPPS: ${doctorInfo.rpps}

[Signature et cachet médical]

══════════════════════════════════════════════════════════════════════════════

Document généré par le Système Expert Médical v2.0
ID Consultation: CR-${Date.now()}
Classification: Document médical confidentiel
`.trim()
  }

  const downloadReport = () => {
    const reportContent = generateFullReport()
    const blob = new Blob([reportContent], { type: "text/plain; charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Compte_Rendu_Consultation_${patientData.name?.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const reportContent = generateFullReport()
    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <html>
        <head>
          <title>Compte-Rendu de Consultation - ${patientData.name}</title>
          <style>
            @page { 
              margin: 2cm;
              size: A4;
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 11px;
              line-height: 1.3;
              color: #000;
              background: #fff;
            }
            .header {
              text-align: center;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .section {
              margin-bottom: 15px;
            }
            .section-title {
              font-weight: bold;
              text-decoration: underline;
              margin-bottom: 5px;
            }
            @media print {
              body { font-size: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <pre>${reportContent}</pre>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center">
          <FileText className="h-6 w-6 mr-2 text-green-600" />
          Compte-Rendu de Consultation
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors text-sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            {editMode ? "Lecture" : "Modifier"}
          </button>
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center transition-colors text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </button>
          <button
            onClick={printReport}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center transition-colors text-sm"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </button>
        </div>
      </div>

      {/* Mode édition des informations médecin */}
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold mb-4 text-blue-800">Informations du Praticien</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={doctorInfo.name}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nom du médecin"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.specialty}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, specialty: e.target.value }))}
              placeholder="Spécialité"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.rpps}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, rpps: e.target.value }))}
              placeholder="N° RPPS"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.phone}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Téléphone"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={doctorInfo.email}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={doctorInfo.address}
              onChange={(e) => setDoctorInfo((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Adresse du cabinet"
              rows={2}
              className="md:col-span-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Aperçu du rapport */}
      <div className="bg-white border border-gray-300 rounded-xl">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-xl">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Aperçu du Compte-Rendu Officiel
          </h4>
        </div>

        <div className="p-6">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6 font-mono text-xs whitespace-pre-line max-h-96 overflow-y-auto shadow-inner">
            {generateFullReport()}
          </div>
        </div>
      </div>

      {/* Statistiques du document */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold mb-4 text-gray-800">Informations Document</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-lg text-blue-600">{generateFullReport().split("\n").length}</div>
            <div className="text-gray-600">Lignes</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-green-600">{generateFullReport().length}</div>
            <div className="text-gray-600">Caractères</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-purple-600">
              {enhancedResults?.diagnostic_analysis?.differential_diagnoses?.length || 0}
            </div>
            <div className="text-gray-600">Diagnostics</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-orange-600">
              {prescriptionData?.prescription?.medications?.length || 0}
            </div>
            <div className="text-gray-600">Médicaments</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsultationReportComponent
