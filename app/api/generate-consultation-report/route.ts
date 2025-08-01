// app/api/generate-consultation-report/route.ts
// VERSION VRAIMENT OPTIMISÉE - PLUS COURTE ET PLUS RAPIDE

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientData, clinicalData, questionsData, diagnosisData, editedDocuments, includeFullPrescriptions = false } = body

    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json({ success: false, error: "Données incomplètes" }, { status: 400 })
    }

    // Extraction simplifiée des données
    const patient = {
      nom: `${(patientData.nom || patientData.lastName || '').toUpperCase()} ${patientData.prenom || patientData.firstName || ''}`.trim(),
      age: patientData.age,
      sexe: patientData.sexe || patientData.gender,
      dateNaissance: patientData.dateNaissance || patientData.birthDate,
      telephone: patientData.telephone || patientData.phone,
      adresse: patientData.adresse || patientData.address,
      email: patientData.email
    }

    // Extraction directe des prescriptions sans fonctions intermédiaires
    const allPaths = [editedDocuments, diagnosisData, diagnosisData?.mauritianDocuments, diagnosisData?.completeData?.mauritianDocuments]
    
    const medicaments = []
    const examsBio = []
    const examsImaging = []
    const seen = new Set()

    // Parcours unique pour tout extraire
    allPaths.forEach(obj => {
      if (!obj) return
      
      // Médicaments
      [obj.medication?.prescriptions, obj.medicaments?.items].flat().filter(Boolean).forEach(med => {
        const key = (med.medication || med.name || '').toLowerCase()
        if (key && !seen.has(`med:${key}`)) {
          seen.add(`med:${key}`)
          medicaments.push({
            nom: med.medication || med.name,
            dci: med.medication || med.name,
            dosage: med.dosage || '',
            forme: 'comprimé',
            posologie: med.frequency || med.posology || '',
            duree: med.duration || '',
            quantite: '1 boîte',
            remarques: med.instructions || '',
            nonSubstituable: false
          })
        }
      })
      
      // Examens biologiques
      [obj.biological?.examinations, obj.biologie?.examens].flat().filter(Boolean).forEach(exam => {
        const key = (exam.test_name?.fr || exam.name || exam.type || '').toLowerCase()
        if (key && !seen.has(`bio:${key}`)) {
          seen.add(`bio:${key}`)
          examsBio.push({
            type: exam.test_name?.fr || exam.name || exam.type,
            code: '',
            urgence: exam.urgency === 'Urgent',
            jeun: false,
            remarques: exam.justification?.fr || ''
          })
        }
      })
      
      // Examens imagerie
      [obj.imaging?.studies, obj.imagerie?.examens].flat().filter(Boolean).forEach(exam => {
        const key = (exam.study_name?.fr || exam.type || exam.name || '').toLowerCase()
        if (key && !seen.has(`img:${key}`)) {
          seen.add(`img:${key}`)
          examsImaging.push({
            type: exam.study_name?.fr || exam.type || exam.name,
            region: exam.region || 'À préciser',
            indication: exam.indication?.fr || '',
            urgence: exam.urgency === 'Urgent',
            contraste: false,
            remarques: exam.details || ''
          })
        }
      })
    })

    // Template JSON simplifié
    const jsonTemplate = {
      header: {
        title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        subtitle: "Document médical confidentiel",
        reference: `CR-${patient.nom}_${Date.now()}`
      },
      identification: patient,
      rapport: {
        motifConsultation: "[GÉNÉRER_150]",
        anamnese: "[GÉNÉRER_350]",
        antecedents: "[GÉNÉRER_200]",
        examenClinique: "[GÉNÉRER_400]",
        syntheseDiagnostique: "[GÉNÉRER_350]",
        conclusionDiagnostique: "[GÉNÉRER_150]",
        priseEnCharge: "[GÉNÉRER_300]",
        surveillance: "[GÉNÉRER_200]",
        conclusion: "[GÉNÉRER_150]"
      },
      prescriptions: {
        medicaments: { items: medicaments, renouvellement: false, dateValidite: new Date(Date.now() + 90*24*60*60*1000).toLocaleDateString('fr-FR') },
        biologie: { examens: examsBio, laboratoireRecommande: "Laboratoire d'analyses médicales agréé" },
        imagerie: { examens: examsImaging, centreRecommande: "Centre d'imagerie médicale" }
      },
      signature: {
        medecin: "Dr. [NOM DU MÉDECIN]",
        qualification: "Médecin Généraliste",
        rpps: "[NUMÉRO RPPS]",
        etablissement: "Cabinet Médical"
      },
      metadata: { dateGeneration: new Date().toISOString(), wordCount: 0 }
    }

    // Prompt ultra-court
    const systemPrompt = `Tu es médecin. Génère UNIQUEMENT un JSON valide.
Remplace chaque [GÉNÉRER_XXX] par un paragraphe médical de XXX mots.
Ne modifie PAS les prescriptions.`

    const userPrompt = `Patient: ${patient.nom}, ${patient.age} ans
Motif: ${clinicalData?.chiefComplaint || diagnosisData?.chiefComplaint || "Consultation"}
Diagnostic: ${diagnosisData?.diagnosis?.primary?.condition || diagnosisData?.primaryDiagnosis || ""}
Symptômes: ${JSON.stringify(clinicalData?.symptoms || [])}

JSON: ${JSON.stringify(jsonTemplate)}`

    // Génération avec GPT-4
    const result = await generateText({
      model: openai("gpt-4o"),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      maxTokens: 4000,
      temperature: 0.2,
    })

    // Parse simple
    const match = result.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Pas de JSON dans la réponse')
    
    const reportData = JSON.parse(match[0])
    
    // Remplacement rapide des sections non générées
    Object.keys(reportData.rapport).forEach(key => {
      if (reportData.rapport[key].includes('GÉNÉRER')) {
        reportData.rapport[key] = "Section en cours de rédaction."
      }
    })
    
    // Calcul du wordCount
    reportData.metadata.wordCount = Object.values(reportData.rapport).join(' ').split(/\s+/).length

    // Gestion des prescriptions simplifiées
    if (!includeFullPrescriptions) {
      reportData.prescriptionsSimplifiees = {
        examens: formatSimplifiedPrescriptions(reportData, 'examens'),
        medicaments: formatSimplifiedPrescriptions(reportData, 'medicaments')
      }
      delete reportData.prescriptions
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
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    )
  }
}

// Fonction unique pour formatter les prescriptions simplifiées
function formatSimplifiedPrescriptions(reportData: any, type: string): string {
  if (type === 'medicaments' && reportData.prescriptions?.medicaments?.items?.length > 0) {
    return reportData.prescriptions.medicaments.items.map((med: any, idx: number) => 
      `${idx + 1}. ${med.nom} ${med.dosage}\n   ${med.posologie}\n   Durée : ${med.duree}`
    ).join('\n\n')
  }
  
  if (type === 'examens') {
    const lines = []
    if (reportData.prescriptions?.biologie?.examens?.length > 0) {
      lines.push("EXAMENS BIOLOGIQUES:")
      reportData.prescriptions.biologie.examens.forEach((exam: any, idx: number) => {
        lines.push(`${idx + 1}. ${exam.type}${exam.urgence ? ' → URGENT' : ''}`)
      })
    }
    if (reportData.prescriptions?.imagerie?.examens?.length > 0) {
      lines.push("\nEXAMENS D'IMAGERIE:")
      reportData.prescriptions.imagerie.examens.forEach((exam: any, idx: number) => {
        lines.push(`${idx + 1}. ${exam.type} - ${exam.region}${exam.urgence ? ' → URGENT' : ''}`)
      })
    }
    return lines.join('\n')
  }
  
  return ''
}
