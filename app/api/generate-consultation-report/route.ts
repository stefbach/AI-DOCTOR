// app/api/generate-consultation-report/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("📋 Génération du compte rendu médical professionnel")
    
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData,
      editedDocuments,
      includeFullPrescriptions = false // Nouveau paramètre
    } = await request.json()

    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json(
        { success: false, error: "Données incomplètes" },
        { status: 400 }
      )
    }

    // Préparation du contexte médical complet
    const medicalContext = prepareMedicalContext({
      patientData,
      clinicalData,
      questionsData,
      diagnosisData,
      editedDocuments
    })

    // Prompt pour générer le rapport narratif ET les prescriptions structurées
    const professionalReportPrompt = `
Tu es un médecin senior expérimenté rédigeant un compte rendu de consultation professionnel avec ordonnances détaillées.

CONTEXTE MÉDICAL COMPLET :
${JSON.stringify(medicalContext, null, 2)}

INSTRUCTIONS CRITIQUES :
1. Rédige un compte rendu médical en PROSE NARRATIVE fluide et professionnelle
2. Génère des prescriptions STRUCTURÉES et DÉTAILLÉES
3. Pour chaque médicament, fournis TOUS les détails nécessaires
4. Pour chaque examen, fournis les codes et informations pratiques
5. Utilise la terminologie médicale française appropriée

IMPORTANT : Retourne UNIQUEMENT un objet JSON valide, sans aucun formatage markdown, sans backticks.

GÉNÈRE LE RAPPORT SUIVANT :

{
  "header": {
    "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
    "subtitle": "Document médical confidentiel",
    "reference": "CR-${Date.now()}-${patientData.lastName?.toUpperCase() || 'PATIENT'}"
  },
  
  "identification": {
    "patient": "${patientData.nom || patientData.lastName} ${patientData.prenom || patientData.firstName}",
    "age": "${patientData.age} ans",
    "sexe": "${patientData.sexe || patientData.gender || 'Non renseigné'}",
    "dateNaissance": "${formatDate(patientData.dateNaissance || patientData.birthDate)}",
    "adresse": "${patientData.adresse || patientData.address || 'Non renseignée'}",
    "telephone": "${patientData.telephone || patientData.phone || 'Non renseigné'}",
    "email": "${patientData.email || ''}"
  },
  
  "rapport": {
    "motifConsultation": "[PROSE] Le patient consulte ce jour pour... (intégrer le motif principal)",
    
    "anamnese": "[PROSE NARRATIVE DÉTAILLÉE] Histoire de la maladie actuelle, chronologie des symptômes, facteurs déclenchants, traitements essayés, réponses aux questions de l'IA",
    
    "antecedents": "[PROSE] Antécédents médicaux, chirurgicaux, familiaux, allergies, habitudes de vie",
    
    "examenClinique": "[PROSE AU PRÉSENT] État général, constantes vitales, examen systématique par appareil",
    
    "syntheseDiagnostique": "[PROSE] Analyse et raisonnement diagnostique, hypothèses évoquées",
    
    "conclusionDiagnostique": "[PROSE] Diagnostic principal retenu avec justification",
    
    "priseEnCharge": "[PROSE] Description de la stratégie thérapeutique globale",
    
    "surveillance": "[PROSE] Plan de suivi, signes d'alerte, consignes",
    
    "conclusion": "[PROSE] Synthèse finale avec pronostic"
  },
  
  "prescriptions": {
    "medicaments": {
      "items": [
        ${generateMedicationsPrescription(diagnosisData, editedDocuments)}
      ],
      "renouvellement": ${shouldAllowRenewal(diagnosisData)},
      "dateValidite": "${getValidityDate()}"
    },
    "biologie": {
      "examens": [
        ${generateBiologyPrescription(diagnosisData, editedDocuments)}
      ],
      "laboratoireRecommande": "Laboratoire d'analyses médicales agréé"
    },
    "imagerie": {
      "examens": [
        ${generateImagingPrescription(diagnosisData, editedDocuments)}
      ],
      "centreRecommande": "Centre d'imagerie médicale"
    }
  },
  
  "signature": {
    "medecin": "${getDoctorName()}",
    "qualification": "${getDoctorQualification()}",
    "rpps": "${getDoctorRPPS()}",
    "etablissement": "${getEstablishment()}"
  },
  
  "metadata": {
    "dateGeneration": "${new Date().toISOString()}",
    "wordCount": 0
  }
}

POUR CHAQUE MÉDICAMENT, génère :
{
  "nom": "Nom commercial du médicament",
  "dci": "Dénomination Commune Internationale",
  "dosage": "Ex: 500mg",
  "forme": "comprimé, gélule, sirop, etc.",
  "posologie": "Ex: 1 comprimé 3 fois par jour",
  "duree": "Ex: 7 jours",
  "quantite": "Ex: 1 boîte de 21 comprimés",
  "remarques": "Pendant les repas, effets secondaires possibles, etc.",
  "nonSubstituable": false
}

POUR CHAQUE EXAMEN BIOLOGIQUE, génère :
{
  "type": "Nom de l'examen (NFS, Glycémie, etc.)",
  "code": "Code NABM si applicable",
  "urgence": true/false,
  "jeun": true/false,
  "remarques": "Instructions spécifiques"
}

POUR CHAQUE EXAMEN D'IMAGERIE, génère :
{
  "type": "Type d'examen (Radio, Echo, Scanner, IRM)",
  "region": "Zone anatomique",
  "indication": "Justification clinique",
  "urgence": true/false,
  "contraste": true/false,
  "remarques": "Précautions particulières"
}
`

    console.log("🤖 Génération avec GPT-4...")
    
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: professionalReportPrompt,
      maxTokens: 8000,
      temperature: 0.3,
    })

    console.log("✅ Compte rendu généré")

    // Parse et enrichissement du rapport
    let reportData
    try {
      // Nettoyer la réponse
      let cleanedResponse = result.text.trim()
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
      
      reportData = JSON.parse(cleanedResponse)
      
      // Calculer le nombre de mots du rapport narratif
      const narrativeText = Object.values(reportData.rapport).join(' ')
      reportData.metadata.wordCount = narrativeText.split(/\s+/).length
      
      // Si les prescriptions détaillées ne sont pas demandées, les simplifier
      if (!includeFullPrescriptions) {
        reportData.prescriptionsFormatees = {
          examens: formatSimplePrescriptionsExamens(reportData),
          medicaments: formatSimplePrescriptionsMedicaments(reportData)
        }
        delete reportData.prescriptions
      }
      
    } catch (error) {
      console.error("❌ Erreur parsing:", error)
      throw new Error("Erreur de génération du rapport")
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      metadata: {
        type: "professional_narrative",
        includesFullPrescriptions: includeFullPrescriptions,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("❌ Erreur génération rapport:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    )
  }
}

// Fonctions helper pour générer les prescriptions
function generateMedicationsPrescription(diagnosisData: any, editedDocuments: any): string {
  if (!diagnosisData?.treatment?.medications?.length && 
      !editedDocuments?.medication?.prescriptions?.length) {
    return ""
  }

  // Utiliser les données éditées si disponibles
  const medications = editedDocuments?.medication?.prescriptions || 
                     diagnosisData?.treatment?.medications || []

  return medications.map((med: any) => `{
    "nom": "${med.medication || med.name}",
    "dci": "[DCI appropriée]",
    "dosage": "${med.dosage}",
    "forme": "${detectMedicationForm(med.medication || med.name)}",
    "posologie": "${med.frequency || med.posology}",
    "duree": "${med.duration}",
    "quantite": "[Calculer selon durée]",
    "remarques": "${med.instructions || ''}",
    "nonSubstituable": false
  }`).join(',\n')
}

function generateBiologyPrescription(diagnosisData: any, editedDocuments: any): string {
  const exams = editedDocuments?.biology?.examinations || 
                diagnosisData?.examinations?.laboratory || []

  return exams.map((exam: any) => `{
    "type": "${exam.name || exam.type}",
    "code": "[Code NABM]",
    "urgence": ${exam.urgency === 'Urgent'},
    "jeun": ${requiresFasting(exam.name || exam.type)},
    "remarques": "${exam.justification || ''}"
  }`).join(',\n')
}

function generateImagingPrescription(diagnosisData: any, editedDocuments: any): string {
  const exams = editedDocuments?.paraclinical?.examinations || 
                diagnosisData?.examinations?.imaging || []

  return exams.map((exam: any) => `{
    "type": "${exam.type}",
    "region": "${exam.region || detectAnatomicalRegion(exam.type)}",
    "indication": "${exam.indication || exam.justification}",
    "urgence": ${exam.urgency === 'Urgent'},
    "contraste": ${requiresContrast(exam.type)},
    "remarques": "${exam.details || ''}"
  }`).join(',\n')
}

// Fonctions utilitaires
function formatDate(dateString: string): string {
  if (!dateString) return ""
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR')
  } catch {
    return dateString
  }
}

function detectMedicationForm(name: string): string {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('sirop')) return 'sirop'
  if (lowerName.includes('gel') || lowerName.includes('gélule')) return 'gélule'
  if (lowerName.includes('injectable')) return 'solution injectable'
  return 'comprimé'
}

function requiresFasting(examName: string): boolean {
  const fastingExams = ['glycémie', 'bilan lipidique', 'cholestérol', 'triglycérides']
  return fastingExams.some(exam => examName.toLowerCase().includes(exam))
}

function requiresContrast(examType: string): boolean {
  const contrastExams = ['scanner', 'angioscanner', 'irm avec injection']
  return contrastExams.some(exam => examType.toLowerCase().includes(exam))
}

function detectAnatomicalRegion(examType: string): string {
  const lowerType = examType.toLowerCase()
  if (lowerType.includes('thorax') || lowerType.includes('poumon')) return 'Thorax'
  if (lowerType.includes('abdom')) return 'Abdomen'
  if (lowerType.includes('crân') || lowerType.includes('cérébr')) return 'Crâne'
  return 'À préciser'
}

function shouldAllowRenewal(diagnosisData: any): boolean {
  // Logique pour déterminer si l'ordonnance est renouvelable
  const chronicConditions = ['hypertension', 'diabète', 'asthme']
  const diagnosis = diagnosisData?.diagnosis?.toLowerCase() || ''
  return chronicConditions.some(condition => diagnosis.includes(condition))
}

function getValidityDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 3) // 3 mois de validité
  return date.toLocaleDateString('fr-FR')
}

function getDoctorName(): string {
  // Récupérer depuis session ou configuration
  return "Dr. [NOM DU MÉDECIN]"
}

function getDoctorQualification(): string {
  return "Médecin Généraliste"
}

function getDoctorRPPS(): string {
  return "[NUMÉRO RPPS]"
}

function getEstablishment(): string {
  return "Cabinet Médical"
}

// Formatage simple pour compatibilité
function formatSimplePrescriptionsExamens(reportData: any): string {
  let output = "ORDONNANCE - EXAMENS COMPLÉMENTAIRES\n\n"
  
  if (reportData.prescriptions?.biologie?.examens?.length > 0) {
    output += "BIOLOGIE :\n"
    reportData.prescriptions.biologie.examens.forEach((exam: any, idx: number) => {
      output += `${idx + 1}. ${exam.type}\n`
      if (exam.urgence) output += "   URGENT\n"
      if (exam.jeun) output += "   À JEUN\n"
    })
  }
  
  return output
}

function formatSimplePrescriptionsMedicaments(reportData: any): string {
  let output = "ORDONNANCE MÉDICAMENTEUSE\n\n"
  
  if (reportData.prescriptions?.medicaments?.items?.length > 0) {
    reportData.prescriptions.medicaments.items.forEach((med: any, idx: number) => {
      output += `${idx + 1}. ${med.nom} ${med.dosage}\n`
      output += `   ${med.posologie}\n`
      output += `   Durée : ${med.duree}\n\n`
    })
  }
  
  return output
}

function prepareMedicalContext(data: any): any {
  // Utiliser les données au format API si disponibles
  const patientDataForContext = data.patientData.nom ? data.patientData : {
    nom: data.patientData.lastName,
    prenom: data.patientData.firstName,
    age: data.patientData.age,
    sexe: data.patientData.gender,
    dateNaissance: data.patientData.birthDate,
    telephone: data.patientData.phone,
    adresse: data.patientData.address,
    allergies: data.patientData.allergies,
    antecedents: data.patientData.medicalHistory
  }

  return {
    patient: patientDataForContext,
    clinical: data.clinicalData,
    aiQuestions: data.questionsData?.responses || [],
    diagnosis: data.diagnosisData,
    editedDocuments: data.editedDocuments
  }
}
