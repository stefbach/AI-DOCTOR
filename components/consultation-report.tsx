"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Download, Printer, Mail, Brain, CheckCircle, ArrowLeft } from "lucide-react"

interface ConsultationReportProps {
  patientData: any
  clinicalData: any
  questionsData: any
  diagnosisData: any
  examsData: any
  medicationsData: any
  onBack: () => void
  onComplete: () => void
}

export default function ConsultationReport({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  examsData,
  medicationsData,
  onBack,
  onComplete,
}: ConsultationReportProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateCompleteReport = useCallback(() => {
    const currentDate = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const currentTime = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    return `COMPTE-RENDU DE CONSULTATION MÉDICALE COMPLET
${"=".repeat(60)}

INFORMATIONS GÉNÉRALES
---------------------
Date de consultation: ${currentDate}
Heure: ${currentTime}
Type de consultation: Consultation avec assistance IA

INFORMATIONS PATIENT
-------------------
Nom: ${patientData?.firstName} ${patientData?.lastName}
Âge: ${patientData?.age} ans
Genre: ${patientData?.gender}
Poids: ${patientData?.weight || "Non renseigné"} kg
Taille: ${patientData?.height || "Non renseigné"} cm
N° Sécurité Sociale: ${patientData?.socialSecurityNumber || "Non renseigné"}

ANTÉCÉDENTS MÉDICAUX
-------------------
${patientData?.medicalHistory || "Aucun antécédent particulier"}

MÉDICAMENTS ACTUELS
------------------
${patientData?.currentMedications || "Aucun traitement en cours"}

ALLERGIES CONNUES
----------------
${patientData?.allergies || "Aucune allergie connue"}

CONTACT D'URGENCE
----------------
${patientData?.emergencyContact || "Non renseigné"}

MOTIF DE CONSULTATION
--------------------
${clinicalData?.chiefComplaint}

HISTOIRE DE LA MALADIE ACTUELLE
------------------------------
${clinicalData?.historyOfPresentIllness}

SYMPTÔMES ASSOCIÉS
-----------------
${clinicalData?.symptoms || "Aucun symptôme associé rapporté"}

DURÉE ET SÉVÉRITÉ
----------------
Durée: ${clinicalData?.duration || "Non précisée"}
Impact: ${clinicalData?.severity || "Non évalué"}

SIGNES VITAUX
------------
Tension artérielle: ${clinicalData?.vitals?.bloodPressure || "Non mesurée"}
Fréquence cardiaque: ${clinicalData?.vitals?.heartRate || "Non mesurée"} bpm
Température: ${clinicalData?.vitals?.temperature || "Non mesurée"} °C
Saturation O2: ${clinicalData?.vitals?.oxygenSaturation || "Non mesurée"} %
Fréquence respiratoire: ${clinicalData?.vitals?.respiratoryRate || "Non mesurée"} /min
Échelle de douleur: ${clinicalData?.vitals?.painScale || "Non évaluée"} /10

EXAMEN PHYSIQUE
--------------
${clinicalData?.physicalExamination || "Examen physique normal"}

REVUE DES SYSTÈMES
-----------------
${clinicalData?.reviewOfSystems || "Revue des systèmes normale"}

ANAMNÈSE DIRIGÉE PAR IA
----------------------
Nombre de questions générées: ${questionsData?.totalQuestions || 0}
Nombre de réponses obtenues: ${questionsData?.answeredQuestions || 0}

Évaluation préliminaire IA:
${questionsData?.preliminaryAssessment || "Non disponible"}

Questions principales et réponses:
${
  questionsData?.questions
    ?.slice(0, 5)
    .map(
      (q: any, i: number) =>
        `${i + 1}. ${q.question}
   Catégorie: ${q.category} | Importance: ${q.importance}
   Réponse: ${questionsData?.answers?.[q.id] || "Non répondu"}
`,
    )
    .join("\n") || "Aucune question posée"
}

DIAGNOSTIC GÉNÉRÉ PAR IA
------------------------
DIAGNOSTIC PRINCIPAL:
Condition: ${diagnosisData?.primaryDiagnosis?.condition}
Code ICD-10: ${diagnosisData?.primaryDiagnosis?.icd10}
Niveau de confiance: ${diagnosisData?.primaryDiagnosis?.confidence}%
Sévérité: ${diagnosisData?.primaryDiagnosis?.severity}

Justification clinique:
${diagnosisData?.primaryDiagnosis?.rationale}

DIAGNOSTICS DIFFÉRENTIELS:
${
  diagnosisData?.differentialDiagnoses
    ?.map(
      (diff: any, index: number) =>
        `${index + 1}. ${diff.condition} (${diff.probability}% de probabilité)
   Justification: ${diff.rationale}
   Examens pour éliminer: ${diff.rulOutTests?.join(", ") || "Non spécifiés"}
`,
    )
    .join("\n") || "Aucun diagnostic différentiel"
}

FACTEURS DE RISQUE IDENTIFIÉS
-----------------------------
${
  diagnosisData?.riskFactors?.map((factor: string, index: number) => `• ${factor}`).join("\n") ||
  "Aucun facteur de risque spécifique identifié"
}

PRONOSTIC
---------
${diagnosisData?.prognosis || "Pronostic à évaluer selon l'évolution"}

RECOMMANDATIONS CLINIQUES
-------------------------
${
  diagnosisData?.clinicalRecommendations
    ?.map(
      (rec: any, index: number) =>
        `${index + 1}. ${rec.action}
   Catégorie: ${rec.category} | Priorité: ${rec.priority} | Délai: ${rec.timeline}
`,
    )
    .join("\n") || "Aucune recommandation spécifique"
}

EXAMENS PARACLINIQUES PRESCRITS
------------------------------
${
  examsData?.selectedExams?.length > 0
    ? examsData.selectedExams
        .map(
          (exam: any, index: number) =>
            `${index + 1}. ${exam.name}${exam.code ? ` (${exam.code})` : ""}
   Indication: ${exam.indication || "Bilan diagnostique"}${exam.aiRecommended ? " [Recommandé par IA]" : ""}
   Catégorie: ${exam.category} ${exam.priority ? `| Priorité: ${exam.priority}` : ""}
`,
        )
        .join("\n")
    : "Aucun examen paraclinique prescrit"
}

PRESCRIPTIONS MÉDICAMENTEUSES
-----------------------------
${
  medicationsData?.medications?.length > 0
    ? medicationsData.medications
        .map(
          (med: any, index: number) =>
            `${index + 1}. ${med.name} ${med.dosage}
   Posologie: ${med.frequency}
   Durée: ${med.duration}
   Indication: ${med.indication}${med.aiRecommended ? " [Recommandé par IA]" : ""}
   Catégorie: ${med.category} ${med.priority ? `| Priorité: ${med.priority}` : ""}
   ${med.contraindications ? `Contre-indications: ${med.contraindications.join(", ")}` : ""}
   ${med.interactions ? `Interactions: ${med.interactions.join(", ")}` : ""}
`,
        )
        .join("\n\n")
    : "Aucune prescription médicamenteuse"
}

PLAN DE PRISE EN CHARGE
----------------------
1. Surveillance clinique selon recommandations IA
2. Réalisation des examens complémentaires prescrits
3. Suivi de l'efficacité et de la tolérance des traitements
4. Réévaluation clinique selon l'évolution
5. Éducation du patient sur sa pathologie et son traitement

SUIVI MÉDICAL
------------
- Consultation de contrôle recommandée selon l'évolution
- Surveillance des paramètres biologiques si traitement médicamenteux
- Consultation spécialisée si recommandée par l'IA
- Retour en consultation en cas d'aggravation des symptômes

RECOMMANDATIONS AU PATIENT
-------------------------
- Respecter scrupuleusement les prescriptions médicales
- Signaler tout effet indésirable ou aggravation des symptômes
- Maintenir un suivi médical régulier
- Adopter les mesures hygiéno-diététiques recommandées
- Conserver ce compte-rendu pour les consultations ultérieures

CONCLUSION
----------
Cette consultation, assistée par intelligence artificielle, a permis une évaluation 
complète du patient avec génération d'un diagnostic différentiel, de recommandations 
thérapeutiques personnalisées et d'un plan de prise en charge adapté.

Le diagnostic principal retenu est: ${diagnosisData?.primaryDiagnosis?.condition}
avec un niveau de confiance de ${diagnosisData?.primaryDiagnosis?.confidence}%.

La prise en charge proposée comprend ${examsData?.selectedExams?.length || 0} examen(s) 
complémentaire(s) et ${medicationsData?.medications?.length || 0} prescription(s) 
médicamenteuse(s).

Un suivi médical adapté est recommandé selon l'évolution clinique.

--------------------
Dr. [Nom du médecin]
Signature: ___________________
Date: ${currentDate}

--------------------
Rapport généré avec Medical AI Expert
Système d'assistance médicale par intelligence artificielle
Date de génération: ${new Date().toLocaleString("fr-FR")}
Version du système: 1.0.0`
  }, [patientData, clinicalData, questionsData, diagnosisData, examsData, medicationsData])

  const downloadReport = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const content = generateCompleteReport()
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Compte_Rendu_Complet_${patientData?.firstName}_${patientData?.lastName}_${new Date().toISOString().split("T")[0]}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      setIsGenerating(false)
    }, 1000)
  }

  const printReport = () => {
    const content = generateCompleteReport()
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Compte-rendu de Consultation Complet</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                margin: 20px; 
                line-height: 1.4;
                font-size: 11px;
              }
              .header { 
                text-align: center; 
                font-weight: bold; 
                margin-bottom: 20px; 
              }
              pre { 
                white-space: pre-wrap; 
                word-wrap: break-word; 
              }
            </style>
          </head>
          <body>
            <pre>${content}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const emailReport = () => {
    const content = generateCompleteReport()
    const subject = `Compte-rendu consultation complet - ${patientData?.firstName} ${patientData?.lastName}`
    const body = encodeURIComponent(content)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FileText className="h-6 w-6 mr-3 text-blue-600" />
            Compte-rendu de Consultation Complet
          </CardTitle>
          <p className="text-gray-600">
            Synthèse complète générée par IA pour {patientData?.firstName} {patientData?.lastName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Résumé de la consultation */}
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>Consultation assistée par IA terminée avec succès</strong>
              <div className="mt-2 text-sm">
                Diagnostic: {diagnosisData?.primaryDiagnosis?.condition} ({diagnosisData?.primaryDiagnosis?.confidence}%
                de confiance)
              </div>
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadReport} disabled={isGenerating}>
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Génération..." : "Télécharger Rapport Complet"}
            </Button>
            <Button onClick={printReport} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button onClick={emailReport} variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Envoyer par email
            </Button>
          </div>

          <Separator />

          {/* Aperçu détaillé du rapport */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Informations patient */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Nom:</strong> {patientData?.firstName} {patientData?.lastName}
                </div>
                <div>
                  <strong>Âge:</strong> {patientData?.age} ans
                </div>
                <div>
                  <strong>Genre:</strong> {patientData?.gender}
                </div>
                <div>
                  <strong>Date:</strong> {new Date().toLocaleDateString("fr-FR")}
                </div>
              </CardContent>
            </Card>

            {/* Diagnostic */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                  Diagnostic IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Principal:</strong> {diagnosisData?.primaryDiagnosis?.condition}
                </div>
                <div>
                  <strong>ICD-10:</strong> {diagnosisData?.primaryDiagnosis?.icd10}
                </div>
                <div>
                  <strong>Confiance:</strong> {diagnosisData?.primaryDiagnosis?.confidence}%
                </div>
                <div>
                  <strong>Différentiels:</strong> {diagnosisData?.differentialDiagnoses?.length || 0}
                </div>
              </CardContent>
            </Card>

            {/* Anamnèse */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-purple-600" />
                  Anamnèse IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Questions:</strong> {questionsData?.totalQuestions || 0}
                </div>
                <div>
                  <strong>Réponses:</strong> {questionsData?.answeredQuestions || 0}
                </div>
                <div>
                  <strong>Taux:</strong>{" "}
                  {questionsData?.totalQuestions
                    ? Math.round((questionsData.answeredQuestions / questionsData.totalQuestions) * 100)
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>

            {/* Examens */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-orange-600" />
                  Examens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Prescrits:</strong> {examsData?.selectedExams?.length || 0}
                </div>
                <div>
                  <strong>IA recommandés:</strong>{" "}
                  {examsData?.selectedExams?.filter((e: any) => e.aiRecommended)?.length || 0}
                </div>
                <div>
                  <strong>Urgents:</strong>{" "}
                  {examsData?.selectedExams?.filter((e: any) => e.priority === "high")?.length || 0}
                </div>
              </CardContent>
            </Card>

            {/* Médicaments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Médicaments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Prescrits:</strong> {medicationsData?.medications?.length || 0}
                </div>
                <div>
                  <strong>IA recommandés:</strong>{" "}
                  {medicationsData?.medications?.filter((m: any) => m.aiRecommended)?.length || 0}
                </div>
                <div>
                  <strong>Priorité haute:</strong>{" "}
                  {medicationsData?.medications?.filter((m: any) => m.priority === "high")?.length || 0}
                </div>
              </CardContent>
            </Card>

            {/* Recommandations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-indigo-600" />
                  Recommandations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong>Cliniques:</strong> {diagnosisData?.clinicalRecommendations?.length || 0}
                </div>
                <div>
                  <strong>Urgentes:</strong>{" "}
                  {diagnosisData?.clinicalRecommendations?.filter((r: any) => r.priority === "high")?.length || 0}
                </div>
                <div>
                  <strong>Facteurs risque:</strong> {diagnosisData?.riskFactors?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Détails du diagnostic */}
          {diagnosisData && (
            <Card>
              <CardHeader>
                <CardTitle>Diagnostic Principal Détaillé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-blue-900">{diagnosisData.primaryDiagnosis?.condition}</h4>
                    <Badge className="bg-blue-100 text-blue-800">
                      {diagnosisData.primaryDiagnosis?.confidence}% confiance
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    <strong>Code ICD-10:</strong> {diagnosisData.primaryDiagnosis?.icd10}
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Justification:</strong> {diagnosisData.primaryDiagnosis?.rationale}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prescriptions résumées */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Examens prescrits */}
            {examsData?.selectedExams && examsData.selectedExams.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Examens Prescrits ({examsData.selectedExams.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {examsData.selectedExams.slice(0, 5).map((exam: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <span className="font-medium">{exam.name}</span>
                        <div className="flex gap-1">
                          {exam.aiRecommended && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                              IA
                            </Badge>
                          )}
                          {exam.priority === "high" && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {examsData.selectedExams.length > 5 && (
                      <div className="text-xs text-gray-500 text-center">
                        ... et {examsData.selectedExams.length - 5} autres examens
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Médicaments prescrits */}
            {medicationsData?.medications && medicationsData.medications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Médicaments Prescrits ({medicationsData.medications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {medicationsData.medications.slice(0, 5).map((med: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">
                            {med.name} {med.dosage}
                          </span>
                          <div className="text-xs text-gray-600">{med.frequency}</div>
                        </div>
                        <div className="flex gap-1">
                          {med.aiRecommended && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                              IA
                            </Badge>
                          )}
                          {med.priority === "high" && (
                            <Badge variant="destructive" className="text-xs">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {medicationsData.medications.length > 5 && (
                      <div className="text-xs text-gray-500 text-center">
                        ... et {medicationsData.medications.length - 5} autres médicaments
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Navigation finale */}
          <div className="flex justify-between pt-6">
            <Button onClick={onBack} variant="outline" className="px-6 py-3 bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour Prescriptions
            </Button>
            <Button onClick={onComplete} className="px-8 py-3 bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-5 w-5 mr-2" />
              Terminer la Consultation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
