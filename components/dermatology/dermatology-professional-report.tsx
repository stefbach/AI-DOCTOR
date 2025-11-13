"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, Download, FileText, Pill, TestTube, Scan, Calendar, Plus, Trash2, Loader2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Props {
  patientData: any
  imageData: any
  ocrAnalysisData: any
  questionsData: any
  diagnosisData: any
  onComplete: () => void
}

interface Medication {
  nom: string
  denominationCommune: string
  dosage: string
  forme: string
  posologie: string
  modeAdministration: string
  dureeTraitement: string
  quantite: string
  instructions: string
}

interface BiologyTest {
  nom: string
  categorie: string
  urgence: boolean
  aJeun: boolean
  motifClinique: string
}

interface ImagingExam {
  type: string
  region: string
  indicationClinique: string
  urgence: boolean
}

export default function DermatologyProfessionalReport(props: Props) {
  const [activeTab, setActiveTab] = useState("consultation")
  
  // Consultation Report State
  const [consultationReport, setConsultationReport] = useState("")
  
  // Medications State - Initialize with extracted medications
  const [medications, setMedications] = useState<Medication[]>([])
  const [isExtractingMedications, setIsExtractingMedications] = useState(false)
  
  // Biology Tests State - Initialize with extracted tests
  const [biologyTests, setBiologyTests] = useState<BiologyTest[]>([])
  const [isExtractingTests, setIsExtractingTests] = useState(false)
  
  // Imaging Exams State
  const [imagingExams, setImagingExams] = useState<ImagingExam[]>([])
  
  // Sick Leave State
  const [sickLeaveData, setSickLeaveData] = useState({
    startDate: '',
    endDate: '',
    numberOfDays: 0,
    medicalReason: '',
    remarks: '',
    workRestrictions: ''
  })

  // Loading state for initial report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  
  // Store full Mauritian report structure
  const [mauritianReport, setMauritianReport] = useState<any>(null)

  // Generate consultation report on mount using comprehensive API
  useEffect(() => {
    generateComprehensiveReport()
  }, [])

  async function generateComprehensiveReport() {
    setIsGeneratingReport(true)
    setIsExtractingMedications(true)
    setIsExtractingTests(true)

    try {
      // Call the comprehensive dermatology report API
      const response = await fetch('/api/generate-dermatology-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientData: props.patientData,
          imageData: props.imageData,
          ocrAnalysisData: props.ocrAnalysisData,
          questionsData: props.questionsData,
          diagnosisData: props.diagnosisData,
          doctorData: {
            fullName: 'Médecin Dermatologue',
            qualifications: 'MBBS, MD (Dermatology)',
            specialty: 'Dermatology',
            clinicAddress: 'Tibok Teleconsultation Platform',
            email: 'contact@tibok.mu',
            consultationHours: 'Téléconsultation: 8h - 20h',
            medicalCouncilNumber: '[MCM Registration Required]'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.report) {
          // Store the complete Mauritian report structure
          setMauritianReport(data.report)
          
          // Generate consultation report text from structured data
          const reportText = generateConsultationReportFromStructure(data.report)
          setConsultationReport(reportText)
          
          // Extract medications from ordonnances.medicaments.prescription.medications
          if (data.report.ordonnances?.medicaments?.prescription?.medications) {
            const meds = data.report.ordonnances.medicaments.prescription.medications
            setMedications(meds.map((m: any) => ({
              nom: m.name || m.nom,
              denominationCommune: m.genericName || m.denominationCommune,
              dosage: m.dosage,
              forme: m.form || m.forme,
              posologie: m.frequency || m.posologie,
              modeAdministration: m.route || m.modeAdministration,
              dureeTraitement: m.duration || m.dureeTraitement,
              quantite: m.quantity || m.quantite,
              instructions: m.instructions
            })))
            toast({
              title: "Médicaments extraits",
              description: `${meds.length} médicament(s) ajouté(s) automatiquement`,
              duration: 3000
            })
          }
          
          // Extract lab tests from ordonnances.biologie.prescription.analyses
          if (data.report.ordonnances?.biologie?.prescription?.analyses) {
            const analyses = data.report.ordonnances.biologie.prescription.analyses
            const allTests: BiologyTest[] = []
            
            // Combine all categories
            Object.entries(analyses).forEach(([category, tests]: [string, any]) => {
              if (Array.isArray(tests)) {
                tests.forEach((test: any) => {
                  allTests.push({
                    nom: test.name || test.nom,
                    categorie: test.category || category,
                    urgence: test.urgent || test.urgence || false,
                    aJeun: test.fasting || test.aJeun || false,
                    motifClinique: test.clinicalIndication || test.motifClinique || ''
                  })
                })
              }
            })
            
            setBiologyTests(allTests)
            toast({
              title: "Examens extraits",
              description: `${allTests.length} examen(s) ajouté(s) automatiquement`,
              duration: 3000
            })
          }

          // Extract imaging studies from ordonnances.imagerie.prescription.examinations
          if (data.report.ordonnances?.imagerie?.prescription?.examinations) {
            const exams = data.report.ordonnances.imagerie.prescription.examinations
            setImagingExams(exams.map((e: any) => ({
              type: e.type,
              region: e.region,
              indicationClinique: e.clinicalIndication || e.indicationClinique,
              urgence: e.urgence || e.urgent || false
            })))
          }

          toast({
            title: "✅ Rapport généré",
            description: "Rapport professionnel complet généré avec succès",
            duration: 4000
          })
        } else {
          throw new Error('Invalid API response')
        }
      } else {
        throw new Error('API request failed')
      }
    } catch (error) {
      console.error('Error generating comprehensive report:', error)
      // Fallback to local generation
      const report = generateConsultationReport(props)
      setConsultationReport(report)
      
      // Try individual extraction as fallback
      extractMedicationsFromDiagnosis()
      extractTestsFromDiagnosis()
      
      toast({
        title: "⚠️ Génération simplifiée",
        description: "Rapport généré localement. Extraction intelligente non disponible.",
        variant: "destructive",
        duration: 4000
      })
    } finally {
      setIsGeneratingReport(false)
      setIsExtractingMedications(false)
      setIsExtractingTests(false)
    }
  }

  function generateConsultationReportFromStructure(reportData: any) {
    if (!reportData?.compteRendu) {
      return generateConsultationReport(props)
    }

    const { compteRendu } = reportData
    const { header, praticien, patient, rapport, imageAnalysis } = compteRendu

    const sections = [
      `╔═══════════════════════════════════════════════════════════════╗`,
      `║           ${header.title.padEnd(60)}║`,
      `╚═══════════════════════════════════════════════════════════════╝`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 PATIENT INFORMATION`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `**Name:** ${patient.nomComplet || patient.nom}`,
      `**Age:** ${patient.age} | **Gender:** ${patient.sexe}`,
      `**Consultation Date:** ${patient.dateExamen}`,
      `**Weight:** ${patient.poids} | **Height:** ${patient.taille || 'N/A'}`,
      ``,
      `**Medical History:** ${patient.antecedentsMedicaux}`,
      `**Known Allergies:** ${patient.allergies}`,
      `**Current Medications:** ${patient.medicamentsActuels}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔍 CHIEF COMPLAINT`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      rapport.motifConsultation || 'Dermatological consultation with image analysis',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📸 IMAGE ANALYSIS (${imageAnalysis.imagesCount} photo(s))`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      imageAnalysis.summary || imageAnalysis.fullAnalysis?.substring(0, 500) || 'Analysis pending',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🩺 HISTORY & CLINICAL EXAMINATION`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `**History of Present Illness:**`,
      rapport.anamnese || 'Pending',
      ``,
      `**Clinical Examination:**`,
      rapport.examenClinique || 'See image analysis above',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🎯 DERMATOLOGICAL DIAGNOSIS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `**PRIMARY DIAGNOSIS:**`,
      rapport.syntheseDiagnostique || rapport.conclusionDiagnostique || 'Pending',
      ``,
      rapport.diagnosticsDifferentiels ? `**DIFFERENTIAL DIAGNOSES:**\n${rapport.diagnosticsDifferentiels}\n` : '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💊 TREATMENT PLAN`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      rapport.priseEnCharge || 'See "Prescription" section for detailed prescriptions.',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📚 PATIENT EDUCATION`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      rapport.educationPatient || 'Patient education provided regarding condition and treatment compliance.',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔄 FOLLOW-UP & MONITORING`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      rapport.surveillance || 'Clinical follow-up recommended in 2-4 weeks.',
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `**Report Date:** ${new Date().toLocaleString('en-US')}`,
      `**Consultation Mode:** Teleconsultation with AI-assisted image analysis`,
      ``,
      `**Physician:** ${praticien.nom}`,
      `**Qualifications:** ${praticien.qualifications}`,
      `**Registration Number:** ${praticien.numeroEnregistrement}`,
      ``,
      `Physician's Signature and Stamp: _______________________`
    ]

    return sections.filter(s => s !== '').join('\n')
  }

  function generateConsultationReport(data: any) {
    const patient = data.patientData
    const diagnosis = data.diagnosisData?.diagnosis?.fullText || 'Diagnostic en attente'
    const ocrAnalysis = data.ocrAnalysisData?.analysis?.fullText || 'Aucune analyse d\'image disponible'
    
    // Extract sections from diagnosis
    const sections = parseDiagnosisSections(diagnosis)
    
    const report = `╔═══════════════════════════════════════════════════════════════╗
║           COMPTE RENDU DE CONSULTATION DERMATOLOGIQUE          ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMATIONS PATIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Nom:** ${patient.firstName} ${patient.lastName}
**Âge:** ${patient.age} ans | **Sexe:** ${patient.gender}
**Date de consultation:** ${new Date().toLocaleDateString('fr-FR')}
**Poids:** ${patient.weight || 'Non renseigné'} | **Taille:** ${patient.height || 'Non renseignée'}

**Antécédents médicaux:** ${formatMedicalHistory(patient)}
**Allergies connues:** ${formatAllergies(patient)}
**Traitement actuel:** ${patient.currentMedicationsText || 'Aucun traitement en cours'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 MOTIF DE CONSULTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Le patient consulte pour une évaluation dermatologique avec analyse d'images de lésions cutanées. Une consultation spécialisée a été demandée pour établir un diagnostic précis et proposer une prise en charge thérapeutique adaptée.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📸 EXAMEN VISUEL & ANALYSE D'IMAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

L'analyse des images soumises révèle les observations suivantes:

${formatOCRAnalysis(ocrAnalysis)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🩺 ANAMNÈSE & HISTOIRE CLINIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formatClinicalHistory(data.questionsData)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DIAGNOSTIC DERMATOLOGIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sections.clinicalSummary ? `**RÉSUMÉ CLINIQUE:**\n${sections.clinicalSummary}\n\n` : ''}${sections.primaryDiagnosis ? `**DIAGNOSTIC PRINCIPAL:**\n${sections.primaryDiagnosis}\n\n` : ''}${sections.differentialDiagnosis ? `**DIAGNOSTICS DIFFÉRENTIELS:**\n${sections.differentialDiagnosis}\n\n` : ''}${sections.pathophysiology ? `**PHYSIOPATHOLOGIE:**\n${sections.pathophysiology}\n\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💊 PLAN THÉRAPEUTIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sections.treatmentPlan || 'Voir section "Ordonnance" pour les prescriptions détaillées.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔬 EXAMENS COMPLÉMENTAIRES RECOMMANDÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sections.investigations || 'Aucun examen complémentaire immédiat nécessaire. Réévaluation clinique en fonction de l\'évolution.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 ÉDUCATION PATIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sections.patientEducation || 'Information et éducation thérapeutique dispensées au patient concernant sa condition, l\'importance de l\'observance thérapeutique et les mesures de prévention.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 SUIVI & SURVEILLANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sections.followUp || 'Un suivi clinique est recommandé dans 2 à 4 semaines pour évaluer la réponse au traitement. Le patient est invité à consulter plus tôt en cas d\'aggravation des symptômes ou d\'apparition de nouveaux signes cliniques préoccupants.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ SIGNES D'ALERTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sections.redFlags || 'Le patient a été informé des signes devant motiver une consultation en urgence.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Date du rapport:** ${new Date().toLocaleString('fr-FR')}
**Mode de consultation:** Téléconsultation avec analyse d'images assistée par IA

Le médecin certifie avoir effectué cet examen en conformité avec les bonnes pratiques médicales et avoir fourni au patient toutes les informations nécessaires concernant son état de santé et sa prise en charge.

Signature et cachet du médecin: _______________________
`
    return report
  }

  function parseDiagnosisSections(diagnosis: string) {
    const sections: any = {}
    
    // Extract Clinical Summary
    const summaryMatch = diagnosis.match(/(?:1\.|##)?\s*CLINICAL SUMMARY[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (summaryMatch) sections.clinicalSummary = summaryMatch[1].trim()
    
    // Extract Primary Diagnosis
    const primaryMatch = diagnosis.match(/(?:2\.|##)?\s*PRIMARY DIAGNOSIS[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (primaryMatch) sections.primaryDiagnosis = primaryMatch[1].trim()
    
    // Extract Differential Diagnoses
    const differentialMatch = diagnosis.match(/(?:3\.|##)?\s*DIFFERENTIAL DIAGNOS[EI]S[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (differentialMatch) sections.differentialDiagnosis = differentialMatch[1].trim()
    
    // Extract Pathophysiology
    const pathophysiologyMatch = diagnosis.match(/(?:4\.|##)?\s*PATHOPHYSIOLOGY[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (pathophysiologyMatch) sections.pathophysiology = pathophysiologyMatch[1].trim()
    
    // Extract Recommended Investigations
    const investigationsMatch = diagnosis.match(/(?:5\.|##)?\s*RECOMMENDED INVESTIGATIONS[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (investigationsMatch) sections.investigations = investigationsMatch[1].trim()
    
    // Extract Treatment Plan
    const treatmentMatch = diagnosis.match(/(?:6\.|##)?\s*TREATMENT PLAN[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (treatmentMatch) sections.treatmentPlan = treatmentMatch[1].trim()
    
    // Extract Patient Education
    const educationMatch = diagnosis.match(/(?:7\.|##)?\s*PATIENT EDUCATION[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (educationMatch) sections.patientEducation = educationMatch[1].trim()
    
    // Extract Follow-up Plan
    const followUpMatch = diagnosis.match(/(?:8\.|##)?\s*FOLLOW-UP PLAN[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (followUpMatch) sections.followUp = followUpMatch[1].trim()
    
    // Extract Red Flags
    const redFlagsMatch = diagnosis.match(/(?:9\.|##)?\s*RED FLAGS[:\s]+(.*?)(?=(?:\n\n(?:\d+\.|##)|$))/is)
    if (redFlagsMatch) sections.redFlags = redFlagsMatch[1].trim()
    
    return sections
  }

  function formatMedicalHistory(patient: any) {
    const history = patient.medicalHistory || []
    const otherHistory = patient.otherMedicalHistory || ''
    
    if (history.length === 0 && !otherHistory) {
      return 'Aucun antécédent notable signalé'
    }
    
    const formatted = [...history]
    if (otherHistory) formatted.push(otherHistory)
    
    return formatted.join(', ')
  }

  function formatAllergies(patient: any) {
    const allergies = patient.allergies || []
    const otherAllergies = patient.otherAllergies || ''
    
    if (allergies.length === 0 && !otherAllergies) {
      return 'Aucune allergie connue'
    }
    
    const formatted = [...allergies]
    if (otherAllergies) formatted.push(otherAllergies)
    
    return formatted.join(', ')
  }

  function formatOCRAnalysis(analysis: string) {
    // Add formatting to OCR analysis for better readability
    return analysis
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Make section headers bold
        if (line.match(/^[A-Z\s]{3,}:/)) {
          return `**${line}**`
        }
        return line
      })
      .join('\n')
  }

  function formatClinicalHistory(questionsData: any) {
    if (!questionsData?.answers || !questionsData?.questions) {
      return 'Interrogatoire complémentaire non disponible.'
    }
    
    const questions = questionsData.questions || []
    const answers = questionsData.answers || {}
    
    let formatted = 'L\'interrogatoire du patient révèle les éléments suivants:\n\n'
    
    questions.forEach((q: any, index: number) => {
      const answer = answers[q.id]
      if (answer) {
        const answerText = typeof answer === 'object' ? JSON.stringify(answer) : answer
        formatted += `**${index + 1}. ${q.question}**\n${answerText}\n\n`
      }
    })
    
    return formatted || 'Interrogatoire complémentaire non disponible.'
  }

  // Extract medications from AI diagnosis
  async function extractMedicationsFromDiagnosis() {
    const diagnosisText = props.diagnosisData?.diagnosis?.fullText || ''
    
    if (!diagnosisText) return
    
    setIsExtractingMedications(true)
    
    try {
      const response = await fetch('/api/extract-medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          diagnosisText,
          patientData: props.patientData
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.medications?.length > 0) {
          setMedications(data.medications)
          toast({
            title: "Médicaments extraits",
            description: `${data.medications.length} médicament(s) ajouté(s) automatiquement`,
            duration: 3000
          })
        }
      }
    } catch (error) {
      console.error('Error extracting medications:', error)
    } finally {
      setIsExtractingMedications(false)
    }
  }

  // Extract lab tests from AI diagnosis
  async function extractTestsFromDiagnosis() {
    const diagnosisText = props.diagnosisData?.diagnosis?.fullText || ''
    
    if (!diagnosisText) return
    
    setIsExtractingTests(true)
    
    try {
      const response = await fetch('/api/extract-lab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          diagnosisText,
          patientData: props.patientData
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.tests?.length > 0) {
          setBiologyTests(data.tests)
          toast({
            title: "Examens extraits",
            description: `${data.tests.length} examen(s) ajouté(s) automatiquement`,
            duration: 3000
          })
        }
      }
    } catch (error) {
      console.error('Error extracting tests:', error)
    } finally {
      setIsExtractingTests(false)
    }
  }

  // Medication Management
  const addMedication = useCallback(() => {
    setMedications(prev => [...prev, {
      nom: '',
      denominationCommune: '',
      dosage: '',
      forme: 'cream',
      posologie: '',
      modeAdministration: 'Topical route',
      dureeTraitement: '14 days',
      quantite: '1 tube',
      instructions: ''
    }])
  }, [])

  const updateMedication = useCallback((index: number, field: keyof Medication, value: string) => {
    setMedications(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const removeMedication = useCallback((index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Biology Test Management
  const addBiologyTest = useCallback(() => {
    setBiologyTests(prev => [...prev, {
      nom: '',
      categorie: 'clinicalChemistry',
      urgence: false,
      aJeun: false,
      motifClinique: ''
    }])
  }, [])

  const updateBiologyTest = useCallback((index: number, field: keyof BiologyTest, value: any) => {
    setBiologyTests(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const removeBiologyTest = useCallback((index: number) => {
    setBiologyTests(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Imaging Exam Management
  const addImagingExam = useCallback(() => {
    setImagingExams(prev => [...prev, {
      type: '',
      region: '',
      indicationClinique: '',
      urgence: false
    }])
  }, [])

  const updateImagingExam = useCallback((index: number, field: keyof ImagingExam, value: any) => {
    setImagingExams(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const removeImagingExam = useCallback((index: number) => {
    setImagingExams(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Download Handlers
  const downloadConsultationReport = () => {
    const blob = new Blob([consultationReport], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compte-rendu-dermatologie-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Téléchargé", description: "Compte rendu téléchargé" })
  }

  const downloadPrescription = () => {
    const prescriptionText = generatePrescriptionText()
    const blob = new Blob([prescriptionText], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ordonnance-dermatologie-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Téléchargé", description: "Ordonnance téléchargée" })
  }

  const downloadLabOrder = () => {
    const labText = generateLabOrderText()
    const blob = new Blob([labText], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demande-labo-dermatologie-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Téléchargé", description: "Demande d'examens téléchargée" })
  }

  const downloadImagingOrder = () => {
    const imagingText = generateImagingOrderText()
    const blob = new Blob([imagingText], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demande-imagerie-dermatologie-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Téléchargé", description: "Demande d'imagerie téléchargée" })
  }

  const downloadSickLeave = () => {
    const sickLeaveText = generateSickLeaveText()
    const blob = new Blob([sickLeaveText], { type: 'text/plain; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arret-travail-dermatologie-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Téléchargé", description: "Arrêt de travail téléchargé" })
  }

  function generatePrescriptionText() {
    // If we have Mauritian structure, use it
    if (mauritianReport?.ordonnances?.medicaments) {
      const { header, patient, prescription, authentication } = mauritianReport.ordonnances.medicaments
      
      return `╔═══════════════════════════════════════════════════════════════╗
║                    ORDONNANCE MÉDICALE                         ║
║                      DERMATOLOGIE                              ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EN-TÊTE MÉDECIN PRESCRIPTEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Médecin: ${header.name}
Qualifications: ${header.qualifications}
Spécialité: ${header.specialty}
Adresse: ${header.clinicAddress}
Email: ${header.email}
Enregistrement MCM: ${header.medicalCouncilNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS PATIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nom complet: ${patient.fullName}
Âge: ${patient.age} | Sexe: ${patient.gender}
Date de consultation: ${prescription.prescriptionDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRESCRIPTION MÉDICAMENTEUSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${prescription.medications.map((med: any) => `
${med.number}. ${med.name} ${med.dosage}
   DCI (Dénomination Commune Internationale): ${med.genericName}
   Forme: ${med.form}
   Posologie: ${med.frequency}
   Voie d'administration: ${med.route}
   Durée du traitement: ${med.duration}
   Quantité: ${med.quantity}
   ${med.instructions ? `Instructions spéciales: ${med.instructions}` : ''}
   Indication: ${med.indication}
   ${med.doNotSubstitute ? '   ⚠️ NON SUBSTITUABLE' : ''}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Validité de l'ordonnance: ${prescription.validity}
Note: ${prescription.dispensationNote}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTHENTICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${authentication.signature}

Médecin: ${authentication.physicianName}
Numéro d'enregistrement: ${authentication.registrationNumber}

${authentication.officialStamp}

Date: ${authentication.date}
`
    }

    // Fallback to simple format
    return `╔═══════════════════════════════════════════════════════════════╗
║                    ORDONNANCE MÉDICALE                         ║
║                      DERMATOLOGIE                              ║
╚═══════════════════════════════════════════════════════════════╝

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MÉDICAMENTS PRESCRITS:

${medications.map((med, i) => `
${i + 1}. ${med.nom} ${med.dosage}
   DCI: ${med.denominationCommune}
   Forme: ${med.forme}
   Posologie: ${med.posologie}
   Voie d'administration: ${med.modeAdministration}
   Durée: ${med.dureeTraitement}
   Quantité: ${med.quantite}
   ${med.instructions ? `Instructions: ${med.instructions}` : ''}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signature et cachet du médecin: _______________________
Date: ${new Date().toLocaleDateString('fr-FR')}
`
  }

  function generateLabOrderText() {
    // If we have Mauritian structure, use it
    if (mauritianReport?.ordonnances?.biologie) {
      const { header, patient, prescription, authentication } = mauritianReport.ordonnances.biologie
      const { analyses } = prescription
      
      let testsText = ''
      const categories = [
        { key: 'hematology', label: 'HÉMATOLOGIE' },
        { key: 'clinicalChemistry', label: 'CHIMIE CLINIQUE' },
        { key: 'immunology', label: 'IMMUNOLOGIE' },
        { key: 'microbiology', label: 'MICROBIOLOGIE' },
        { key: 'other', label: 'AUTRES EXAMENS' }
      ]
      
      categories.forEach(({ key, label }) => {
        const tests = analyses[key]
        if (tests && tests.length > 0) {
          testsText += `\n━━━ ${label} ━━━\n\n`
          tests.forEach((test: any, idx: number) => {
            testsText += `${idx + 1}. ${test.name}\n`
            testsText += `   ${test.urgent ? '⚠️ URGENT' : '⏱️ Standard'}\n`
            testsText += `   ${test.fasting ? '🍽️ À jeun requis' : '✓ Pas de jeûne nécessaire'}\n`
            if (test.clinicalIndication) {
              testsText += `   Indication: ${test.clinicalIndication}\n`
            }
            testsText += `\n`
          })
        }
      })
      
      return `╔═══════════════════════════════════════════════════════════════╗
║              DEMANDE D'EXAMENS DE LABORATOIRE                  ║
║                      DERMATOLOGIE                              ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EN-TÊTE MÉDECIN PRESCRIPTEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Médecin: ${header.name}
Qualifications: ${header.qualifications}
Spécialité: ${header.specialty}
Enregistrement MCM: ${header.medicalCouncilNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS PATIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nom complet: ${patient.fullName}
Âge: ${patient.age} | Sexe: ${patient.gender}
Date de prescription: ${prescription.prescriptionDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INDICATION CLINIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${prescription.clinicalIndication}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMENS DEMANDÉS PAR CATÉGORIE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${testsText}
${prescription.specialInstructions && prescription.specialInstructions.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS SPÉCIALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${prescription.specialInstructions.map((inst: string) => `• ${inst}`).join('\n')}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTHENTICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${authentication.signature}

Médecin: ${authentication.physicianName}
Numéro d'enregistrement: ${authentication.registrationNumber}

Date: ${authentication.date}
`
    }
    
    // Fallback to simple format
    return `╔═══════════════════════════════════════════════════════════════╗
║              DEMANDE D'EXAMENS DE LABORATOIRE                  ║
║                      DERMATOLOGIE                              ║
╚═══════════════════════════════════════════════════════════════╝

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMENS DEMANDÉS:

${biologyTests.map((test, i) => `
${i + 1}. ${test.nom}
   Catégorie: ${test.categorie}
   ${test.urgence ? '⚠️ URGENT' : ''}
   ${test.aJeun ? '🍽️ À jeun requis' : ''}
   Indication clinique: ${test.motifClinique}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signature et cachet du médecin: _______________________
Date: ${new Date().toLocaleDateString('fr-FR')}
`
  }

  function generateImagingOrderText() {
    // If we have Mauritian structure, use it
    if (mauritianReport?.ordonnances?.imagerie) {
      const { header, patient, prescription, authentication } = mauritianReport.ordonnances.imagerie
      
      return `╔═══════════════════════════════════════════════════════════════╗
║                  DEMANDE D'EXAMENS D'IMAGERIE                  ║
║                      DERMATOLOGIE                              ║
╚═══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EN-TÊTE MÉDECIN PRESCRIPTEUR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Médecin: ${header.name}
Qualifications: ${header.qualifications}
Spécialité: ${header.specialty}
Enregistrement MCM: ${header.medicalCouncilNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS PATIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nom complet: ${patient.fullName}
Âge: ${patient.age} | Sexe: ${patient.gender}
Date de prescription: ${prescription.prescriptionDate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTE CLINIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${prescription.clinicalInformation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMENS D'IMAGERIE DEMANDÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${prescription.examinations.map((exam: any) => `
${exam.number}. ${exam.type} - ${exam.region}
   Modalité: ${exam.modalite}
   Indication clinique: ${exam.clinicalIndication}
   ${exam.urgence ? '⚠️ URGENT' : '⏱️ Standard'}
   ${exam.contrast ? '💉 Avec produit de contraste' : ''}
   ${exam.specificProtocol ? `Protocole spécifique: ${exam.specificProtocol}` : ''}
   ${exam.diagnosticQuestion ? `Question diagnostique: ${exam.diagnosticQuestion}` : ''}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTHENTICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${authentication.signature}

Médecin: ${authentication.physicianName}
Numéro d'enregistrement: ${authentication.registrationNumber}

Date: ${authentication.date}
`
    }
    
    // Fallback to simple format
    return `╔═══════════════════════════════════════════════════════════════╗
║                  DEMANDE D'EXAMENS D'IMAGERIE                  ║
║                      DERMATOLOGIE                              ║
╚═══════════════════════════════════════════════════════════════╝

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMENS DEMANDÉS:

${imagingExams.map((exam, i) => `
${i + 1}. ${exam.type} - ${exam.region}
   Indication clinique: ${exam.indicationClinique}
   ${exam.urgence ? '⚠️ URGENT' : ''}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signature et cachet du médecin: _______________________
Date: ${new Date().toLocaleDateString('fr-FR')}
`
  }

  function generateSickLeaveText() {
    return `╔═══════════════════════════════════════════════════════════════╗
║                   CERTIFICAT D'ARRÊT DE TRAVAIL                ║
║                      DERMATOLOGIE                              ║
╚═══════════════════════════════════════════════════════════════╝

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString('fr-FR')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DÉTAILS DE L'ARRÊT:

Date de début: ${sickLeaveData.startDate}
Date de fin: ${sickLeaveData.endDate}
Nombre de jours: ${sickLeaveData.numberOfDays}

Motif médical: ${sickLeaveData.medicalReason}

Restrictions de travail: ${sickLeaveData.workRestrictions}

Remarques: ${sickLeaveData.remarks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signature et cachet du médecin: _______________________
Date: ${new Date().toLocaleDateString('fr-FR')}
`
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-200">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Rapport Professionnel Dermatologique
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="consultation">
                <FileText className="h-4 w-4 mr-2" />
                Compte Rendu
              </TabsTrigger>
              <TabsTrigger value="medicaments">
                <Pill className="h-4 w-4 mr-2" />
                Ordonnance
                {medications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{medications.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="biologie">
                <TestTube className="h-4 w-4 mr-2" />
                Examens Labo
                {biologyTests.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{biologyTests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="imagerie">
                <Scan className="h-4 w-4 mr-2" />
                Paraclinique
                {imagingExams.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{imagingExams.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sickleave">
                <Calendar className="h-4 w-4 mr-2" />
                Arrêt Travail
              </TabsTrigger>
            </TabsList>

            {/* Consultation Report Tab */}
            <TabsContent value="consultation" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm text-teal-800 flex items-center gap-2">
                    {isGeneratingReport && <Loader2 className="h-4 w-4 animate-spin" />}
                    <strong>✨ Rapport structuré et formaté automatiquement</strong> - Ce compte rendu suit les standards professionnels de documentation médicale dermatologique avec extraction intelligente via IA.
                  </p>
                </div>
                
                {isGeneratingReport ? (
                  <Card className="border-teal-200">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-teal-600" />
                      <h3 className="text-lg font-semibold text-teal-900 mb-2">
                        Génération du rapport professionnel en cours...
                      </h3>
                      <p className="text-sm text-gray-600">
                        L'IA analyse toutes les données et génère un compte rendu structuré complet avec extraction automatique des médicaments et examens.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Textarea 
                      value={consultationReport} 
                      onChange={(e) => setConsultationReport(e.target.value)} 
                      className="min-h-[700px] font-mono text-sm"
                      placeholder="Génération du rapport en cours..."
                    />
                    <Button onClick={downloadConsultationReport} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger le Compte Rendu
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Medications Tab */}
            <TabsContent value="medicaments" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Médicaments Dermatologiques</h3>
                  {isExtractingMedications && (
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Extraction automatique des médicaments...
                    </p>
                  )}
                </div>
                <Button onClick={addMedication} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Médicament
                </Button>
              </div>

              {medications.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Pill className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Aucun médicament ajouté.</p>
                    <p className="text-sm mt-2">Les médicaments du diagnostic AI seront extraits automatiquement.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {medications.map((med, index) => (
                    <Card key={index} className="border-teal-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="bg-teal-50">Médicament {index + 1}</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeMedication(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Nom Commercial</Label>
                            <Input 
                              value={med.nom} 
                              onChange={(e) => updateMedication(index, 'nom', e.target.value)}
                              placeholder="ex: Hydrocortisone Cream"
                            />
                          </div>
                          <div>
                            <Label>DCI (Dénomination Commune)</Label>
                            <Input 
                              value={med.denominationCommune} 
                              onChange={(e) => updateMedication(index, 'denominationCommune', e.target.value)}
                              placeholder="ex: Hydrocortisone"
                            />
                          </div>
                          <div>
                            <Label>Dosage</Label>
                            <Input 
                              value={med.dosage} 
                              onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                              placeholder="ex: 1%"
                            />
                          </div>
                          <div>
                            <Label>Forme</Label>
                            <Select value={med.forme} onValueChange={(value) => updateMedication(index, 'forme', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cream">Crème</SelectItem>
                                <SelectItem value="ointment">Pommade</SelectItem>
                                <SelectItem value="lotion">Lotion</SelectItem>
                                <SelectItem value="gel">Gel</SelectItem>
                                <SelectItem value="tablet">Comprimé</SelectItem>
                                <SelectItem value="capsule">Gélule</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Posologie</Label>
                            <Input 
                              value={med.posologie} 
                              onChange={(e) => updateMedication(index, 'posologie', e.target.value)}
                              placeholder="ex: Appliquer 2 fois par jour"
                            />
                          </div>
                          <div>
                            <Label>Voie d'Administration</Label>
                            <Select value={med.modeAdministration} onValueChange={(value) => updateMedication(index, 'modeAdministration', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Topical route">Topique</SelectItem>
                                <SelectItem value="Oral route">Orale</SelectItem>
                                <SelectItem value="Parenteral route">Parentérale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Durée du Traitement</Label>
                            <Input 
                              value={med.dureeTraitement} 
                              onChange={(e) => updateMedication(index, 'dureeTraitement', e.target.value)}
                              placeholder="ex: 14 jours"
                            />
                          </div>
                          <div>
                            <Label>Quantité</Label>
                            <Input 
                              value={med.quantite} 
                              onChange={(e) => updateMedication(index, 'quantite', e.target.value)}
                              placeholder="ex: 1 tube"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Instructions Spéciales</Label>
                            <Input 
                              value={med.instructions} 
                              onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                              placeholder="ex: Appliquer uniquement sur les zones affectées, éviter l'exposition au soleil"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {medications.length > 0 && (
                <Button onClick={downloadPrescription} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger l'Ordonnance
                </Button>
              )}
            </TabsContent>

            {/* Biology Tests Tab */}
            <TabsContent value="biologie" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Examens de Laboratoire</h3>
                  {isExtractingTests && (
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Extraction automatique des examens...
                    </p>
                  )}
                </div>
                <Button onClick={addBiologyTest} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Examen
                </Button>
              </div>

              {biologyTests.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <TestTube className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Aucun examen de laboratoire ajouté.</p>
                    <p className="text-sm mt-2">Les examens recommandés seront extraits du diagnostic AI.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {biologyTests.map((test, index) => (
                    <Card key={index} className="border-teal-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="bg-teal-50">Examen {index + 1}</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeBiologyTest(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Nom de l'Examen</Label>
                            <Input 
                              value={test.nom} 
                              onChange={(e) => updateBiologyTest(index, 'nom', e.target.value)}
                              placeholder="ex: NFS (Numération Formule Sanguine)"
                            />
                          </div>
                          <div>
                            <Label>Indication Clinique</Label>
                            <Input 
                              value={test.motifClinique} 
                              onChange={(e) => updateBiologyTest(index, 'motifClinique', e.target.value)}
                              placeholder="ex: Exclure une infection"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={test.urgence} 
                              onCheckedChange={(checked) => updateBiologyTest(index, 'urgence', checked)}
                            />
                            <Label>Urgent</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={test.aJeun} 
                              onCheckedChange={(checked) => updateBiologyTest(index, 'aJeun', checked)}
                            />
                            <Label>À jeun requis</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {biologyTests.length > 0 && (
                <Button onClick={downloadLabOrder} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger la Demande d'Examens
                </Button>
              )}
            </TabsContent>

            {/* Imaging Exams Tab */}
            <TabsContent value="imagerie" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Examens d'Imagerie</h3>
                <Button onClick={addImagingExam} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Imagerie
                </Button>
              </div>

              {imagingExams.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    <Scan className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Aucun examen d'imagerie ajouté.</p>
                    <p className="text-sm mt-2">Cliquez sur "Ajouter Imagerie" pour commencer.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {imagingExams.map((exam, index) => (
                    <Card key={index} className="border-teal-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="bg-teal-50">Imagerie {index + 1}</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeImagingExam(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Type d'Imagerie</Label>
                            <Select value={exam.type} onValueChange={(value) => updateImagingExam(index, 'type', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="X-Ray">Radiographie</SelectItem>
                                <SelectItem value="CT Scan">Scanner (CT)</SelectItem>
                                <SelectItem value="MRI">IRM</SelectItem>
                                <SelectItem value="Ultrasound">Échographie</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Région</Label>
                            <Input 
                              value={exam.region} 
                              onChange={(e) => updateImagingExam(index, 'region', e.target.value)}
                              placeholder="ex: Thorax, Abdomen"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Indication Clinique</Label>
                            <Input 
                              value={exam.indicationClinique} 
                              onChange={(e) => updateImagingExam(index, 'indicationClinique', e.target.value)}
                              placeholder="ex: Exclure atteinte tissulaire profonde"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={exam.urgence} 
                              onCheckedChange={(checked) => updateImagingExam(index, 'urgence', checked)}
                            />
                            <Label>Urgent</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {imagingExams.length > 0 && (
                <Button onClick={downloadImagingOrder} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger la Demande d'Imagerie
                </Button>
              )}
            </TabsContent>

            {/* Sick Leave Tab */}
            <TabsContent value="sickleave" className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold">Certificat d'Arrêt de Travail</h3>
              
              <Card className="border-teal-200">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date de Début</Label>
                      <Input 
                        type="date"
                        value={sickLeaveData.startDate}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Date de Fin</Label>
                      <Input 
                        type="date"
                        value={sickLeaveData.endDate}
                        onChange={(e) => {
                          const newEndDate = e.target.value
                          setSickLeaveData(prev => {
                            const days = prev.startDate && newEndDate 
                              ? Math.ceil((new Date(newEndDate).getTime() - new Date(prev.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                              : 0
                            return { ...prev, endDate: newEndDate, numberOfDays: days }
                          })
                        }}
                      />
                    </div>
                    <div>
                      <Label>Nombre de Jours</Label>
                      <Input 
                        type="number"
                        value={sickLeaveData.numberOfDays}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, numberOfDays: parseInt(e.target.value) || 0 }))}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label>Motif Médical</Label>
                      <Input 
                        value={sickLeaveData.medicalReason}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, medicalReason: e.target.value }))}
                        placeholder="ex: Pathologie dermatologique nécessitant repos"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Restrictions de Travail</Label>
                      <Textarea 
                        value={sickLeaveData.workRestrictions}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, workRestrictions: e.target.value }))}
                        placeholder="ex: Éviter l'exposition au soleil, éviter les efforts physiques intenses"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Remarques Additionnelles</Label>
                      <Textarea 
                        value={sickLeaveData.remarks}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Remarques complémentaires"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={downloadSickLeave} 
                className="bg-gradient-to-r from-teal-600 to-cyan-600"
                disabled={!sickLeaveData.startDate || !sickLeaveData.endDate}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger le Certificat d'Arrêt de Travail
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Complete Button */}
      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-teal-600" />
              <div>
                <p className="font-semibold text-teal-900">Prêt à Finaliser la Consultation</p>
                <p className="text-sm text-teal-700">Vérifiez toutes les sections avant de terminer.</p>
              </div>
            </div>
            <Button 
              onClick={props.onComplete} 
              className="bg-gradient-to-r from-teal-600 to-cyan-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Terminer la Consultation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
