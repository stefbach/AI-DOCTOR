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
      editedDocuments // Documents édités à l'étape 4
    } = await request.json()

    if (!patientData || !clinicalData || !diagnosisData || !editedDocuments) {
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

    const professionalReportPrompt = `
Tu es un médecin senior expérimenté rédigeant un compte rendu de consultation professionnel.

CONTEXTE MÉDICAL COMPLET :
${JSON.stringify(medicalContext, null, 2)}

INSTRUCTIONS CRITIQUES :
1. Rédige un compte rendu médical en PROSE NARRATIVE fluide et professionnelle
2. Utilise le style médical français standard (passé composé pour l'anamnèse, présent pour l'examen)
3. Intègre TOUTES les données fournies de manière cohérente
4. Structure le rapport selon les standards hospitaliers
5. Utilise la terminologie médicale appropriée
6. Sois précis, concis et exhaustif

IMPORTANT : Retourne UNIQUEMENT un objet JSON valide, sans aucun formatage markdown, sans backticks, sans préfixe "json".

GÉNÈRE LE COMPTE RENDU SUIVANT :

{
  "header": {
    "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
    "subtitle": "Médecine Générale - Consultation du ${new Date().toLocaleDateString('fr-FR')}",
    "reference": "CR-${Date.now()}"
  },
  
  "identification": {
    "patient": "${patientData.firstName} ${patientData.lastName}",
    "age": "${patientData.age} ans",
    "dateNaissance": "${patientData.birthDate}",
    "sexe": "${patientData.gender}",
    "adresse": "${editedDocuments.consultation?.patient?.address || patientData.address || 'Non renseignée'}",
    "telephone": "${editedDocuments.consultation?.patient?.phone || patientData.phone || 'Non renseigné'}"
  },
  
  "rapport": {
    "motifConsultation": "[PROSE] Rédige un paragraphe fluide décrivant pourquoi le patient consulte, en intégrant le motif principal et le contexte",
    
    "anamnese": "[PROSE NARRATIVE] Raconte l'histoire de la maladie actuelle de manière chronologique et détaillée, en intégrant : L'apparition des symptômes et leur évolution, Les facteurs déclenchants ou aggravants, Les traitements déjà tentés, L'impact sur la vie quotidienne, Les réponses aux questions de l'IA qui apportent des précisions diagnostiques",
    
    "antecedents": "[PROSE] Décris les antécédents pertinents du patient de manière narrative",
    
    "examenClinique": "[PROSE MÉDICALE AU PRÉSENT] Décris l'examen physique de manière systématique",
    
    "syntheseDiagnostique": "[PROSE] Synthèse du raisonnement diagnostique",
    
    "conclusionDiagnostique": "[PROSE] Au terme de cette consultation, je retiens le diagnostic principal avec les critères diagnostiques",
    
    "priseEnCharge": "[PROSE STRUCTURÉE] La prise en charge comprend les examens, traitements et mesures associées",
    
    "surveillance": "[PROSE] Plan de surveillance incluant le suivi et les signes d'alerte",
    
    "conclusion": "[PROSE] Paragraphe de conclusion résumant le diagnostic, la prise en charge et le pronostic"
  },
  
  "prescriptions": {
    "examens": ${JSON.stringify(editedDocuments.biology?.examinations || [])},
    "medicaments": ${JSON.stringify(editedDocuments.medication?.prescriptions || [])}
  },
  
  "metadata": {
    "dateGeneration": "${new Date().toISOString()}",
    "dureeConsultation": "30 minutes",
    "typeConsultation": "Consultation initiale",
    "prochainRDV": "${editedDocuments.consultation?.followUp?.nextAppointment || 'À définir selon évolution'}"
  },
  
  "signature": {
    "medecin": "${editedDocuments.consultation?.physician?.name || 'Dr. MEDECIN'}",
    "qualification": "${editedDocuments.consultation?.physician?.qualification || 'Médecin Généraliste'}",
    "rpps": "${editedDocuments.consultation?.physician?.rpps || ''}",
    "etablissement": "${editedDocuments.consultation?.establishment?.name || 'Cabinet Médical'}"
  }
}

RÈGLES DE RÉDACTION :
- Utilise des phrases complètes et fluides
- Évite les listes à puces dans le corps du texte
- Maintiens un ton professionnel mais accessible
- Assure la cohérence entre toutes les sections
- Intègre naturellement les données techniques dans la prose
- N'invente aucune donnée - utilise uniquement les informations fournies
- RETOURNE UNIQUEMENT LE JSON, SANS FORMATAGE MARKDOWN
`

    console.log("🤖 Génération avec GPT-4...")
    
    const result = await generateText({
      model: openai("gpt-4o"),
      prompt: professionalReportPrompt,
      maxTokens: 8000,
      temperature: 0.3, // Basse température pour cohérence
    })

    console.log("✅ Compte rendu généré")

    // Parse et enrichissement du rapport
    let reportData
    try {
      // Nettoyer la réponse de tout formatage markdown
      let cleanedResponse = result.text.trim()
      
      // Retirer les backticks et le préfixe json si présents
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
      cleanedResponse = cleanedResponse.trim()
      
      // Parser le JSON nettoyé
      reportData = JSON.parse(cleanedResponse)
      
      // Enrichir avec les prescriptions formatées
      reportData.prescriptionsFormatees = {
        examens: formatPrescriptionsExamens(editedDocuments),
        medicaments: formatPrescriptionsMedicaments(editedDocuments)
      }
      
      // Ajouter le texte complet formaté pour PDF
      reportData.texteComplet = generateFullReportText(reportData)
      
      // Calculer le nombre de mots
      reportData.metadata = reportData.metadata || {}
      reportData.metadata.wordCount = countWords(reportData.texteComplet)
      
    } catch (error) {
      console.error("❌ Erreur parsing:", error)
      console.error("Réponse brute:", result.text)
      throw new Error("Erreur de génération du rapport - Format JSON invalide")
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      metadata: {
        type: "professional_narrative",
        wordCount: reportData.metadata.wordCount,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("❌ Erreur génération rapport professionnel:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    )
  }
}

// Fonctions helper pour formater les prescriptions
function formatExamsList(editedDocuments: any): string {
  const exams = []
  
  // Examens biologiques
  if (editedDocuments.biology?.examinations?.length > 0) {
    editedDocuments.biology.examinations.forEach((exam: any) => {
      exams.push(`- ${exam.name} : ${exam.justification} (${exam.urgency})`)
    })
  }
  
  // Examens paracliniques
  if (editedDocuments.paraclinical?.examinations?.length > 0) {
    editedDocuments.paraclinical.examinations.forEach((exam: any) => {
      exams.push(`- ${exam.type} : ${exam.indication}`)
    })
  }
  
  return exams.join('\n') || "Aucun examen complémentaire prescrit"
}

function formatMedicationsList(editedDocuments: any): string {
  if (!editedDocuments.medication?.prescriptions?.length) {
    return "Aucun traitement médicamenteux institué"
  }
  
  return editedDocuments.medication.prescriptions.map((med: any) => 
    `- ${med.medication} : ${med.dosage}, ${med.duration} - ${med.instructions}`
  ).join('\n')
}

// Générer le texte complet du rapport pour export
function generateFullReportText(reportData: any): string {
  return `
${reportData.header.title}
${reportData.header.subtitle}
Référence : ${reportData.header.reference}

PATIENT : ${reportData.identification.patient}
Âge : ${reportData.identification.age}
Sexe : ${reportData.identification.sexe}
Adresse : ${reportData.identification.adresse}
Téléphone : ${reportData.identification.telephone}

════════════════════════════════════════════════════════════════════

MOTIF DE CONSULTATION
${reportData.rapport.motifConsultation}

ANAMNÈSE
${reportData.rapport.anamnese}

ANTÉCÉDENTS
${reportData.rapport.antecedents}

EXAMEN CLINIQUE
${reportData.rapport.examenClinique}

SYNTHÈSE DIAGNOSTIQUE
${reportData.rapport.syntheseDiagnostique}

CONCLUSION DIAGNOSTIQUE
${reportData.rapport.conclusionDiagnostique}

PRISE EN CHARGE
${reportData.rapport.priseEnCharge}

SURVEILLANCE ET SUIVI
${reportData.rapport.surveillance}

CONCLUSION
${reportData.rapport.conclusion}

════════════════════════════════════════════════════════════════════

${reportData.signature.medecin}
${reportData.signature.qualification}
${reportData.signature.etablissement}

Document généré le ${new Date().toLocaleString('fr-FR')}
`
}

function prepareMedicalContext(data: any): any {
  // Préparer et nettoyer toutes les données pour le contexte
  return {
    patient: {
      ...data.patientData,
      // Intégrer les modifications de l'étape 4
      address: data.editedDocuments?.consultation?.patient?.address || data.patientData.address,
      phone: data.editedDocuments?.consultation?.patient?.phone || data.patientData.phone
    },
    clinical: data.clinicalData,
    aiQuestions: data.questionsData?.responses || [],
    diagnosis: data.diagnosisData,
    editedDocuments: data.editedDocuments
  }
}

function formatPrescriptionsExamens(editedDocuments: any): string {
  // Formater les prescriptions d'examens pour impression
  let output = "ORDONNANCE - EXAMENS COMPLÉMENTAIRES\n\n"
  
  if (editedDocuments.biology?.examinations?.length > 0) {
    output += "BIOLOGIE :\n"
    editedDocuments.biology.examinations.forEach((exam: any, idx: number) => {
      output += `${idx + 1}. ${exam.name}\n`
      output += `   Indication : ${exam.justification}\n`
      output += `   Urgence : ${exam.urgency}\n\n`
    })
  }
  
  if (editedDocuments.paraclinical?.examinations?.length > 0) {
    output += "\nIMAGERIE ET EXPLORATIONS :\n"
    editedDocuments.paraclinical.examinations.forEach((exam: any, idx: number) => {
      output += `${idx + 1}. ${exam.type}\n`
      output += `   Indication : ${exam.indication}\n\n`
    })
  }
  
  return output || "Aucun examen complémentaire prescrit"
}

function formatPrescriptionsMedicaments(editedDocuments: any): string {
  // Formater l'ordonnance médicamenteuse pour impression
  let output = "ORDONNANCE MÉDICAMENTEUSE\n\n"
  
  if (editedDocuments.medication?.prescriptions?.length > 0) {
    editedDocuments.medication.prescriptions.forEach((med: any, idx: number) => {
      output += `${idx + 1}. ${med.medication}\n`
      output += `   ${med.dosage}\n`
      output += `   ${med.frequency}\n`
      output += `   Durée : ${med.duration}\n`
      if (med.instructions) {
        output += `   Instructions : ${med.instructions}\n`
      }
      output += "\n"
    })
  } else {
    output += "Aucun traitement médicamenteux prescrit\n"
  }
  
  return output
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length
}
