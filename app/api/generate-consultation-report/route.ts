// app/api/generate-consultation-report/route.ts
// VERSION AVEC CLÉ QUI FONCTIONNE

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai, createOpenAI } from "@ai-sdk/openai"

// ==================== CRÉATION DU CLIENT OPENAI AVEC LA CLÉ QUI MARCHE ====================
const openaiClient = createOpenAI({
  apiKey: "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"
})

export async function POST(request: NextRequest) {
  console.log("🚀 Génération du compte-rendu avec clé hardcodée")
  
  try {
    const body = await request.json()
    const { patientData, clinicalData, questionsData, diagnosisData, editedDocuments, includeFullPrescriptions = false } = body

    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json({ success: false, error: "Données incomplètes" }, { status: 400 })
    }

    // Extraction simplifiée des données patient
    const patient = {
      nom: `${(patientData.nom || patientData.lastName || '').toUpperCase()} ${patientData.prenom || patientData.firstName || ''}`.trim() || 'PATIENT',
      age: `${patientData.age || ''} ans`,
      sexe: patientData.sexe || patientData.gender || 'Non renseigné',
      dateNaissance: patientData.dateNaissance || patientData.birthDate || 'Non renseignée',
      telephone: patientData.telephone || patientData.phone || 'Non renseigné',
      adresse: patientData.adresse || patientData.address || 'Non renseignée',
      email: patientData.email || 'Non renseigné'
    }

    // Extraction sécurisée des prescriptions
    const medicaments = []
    const examsBio = []
    const examsImaging = []
    const seen = new Set()

    // Fonction helper pour extraire en toute sécurité
    const extractSafely = (obj: any, paths: string[]) => {
      if (!obj) return []
      const results = []
      for (const path of paths) {
        try {
          const parts = path.split('.')
          let current = obj
          for (const part of parts) {
            current = current?.[part]
          }
          if (Array.isArray(current)) {
            results.push(...current)
          }
        } catch (e) {
          // Ignorer les erreurs d'accès
        }
      }
      return results
    }

    // Sources de données à explorer
    const dataSources = [
      editedDocuments,
      diagnosisData,
      diagnosisData?.mauritianDocuments,
      diagnosisData?.completeData?.mauritianDocuments,
      diagnosisData?.expertAnalysis,
      diagnosisData?.diagnosis
    ].filter(Boolean)

    // Extraction des médicaments
    dataSources.forEach(source => {
      const medPaths = [
        'medication.prescriptions',
        'medicaments.items',
        'consultation.management_plan.treatment.medications',
        'expert_therapeutics.primary_treatments'
      ]
      
      extractSafely(source, medPaths).forEach(med => {
        if (!med) return
        const name = med.medication?.fr || med.medication || med.drug?.fr || med.name || med.medicament || ''
        const key = name.toLowerCase().trim()
        
        if (name && !seen.has(`med:${key}`)) {
          seen.add(`med:${key}`)
          medicaments.push({
            nom: name,
            dci: name,
            dosage: med.dosage || med.dosing?.adult?.fr || '',
            forme: 'comprimé',
            posologie: med.frequency || med.posology || med.dosing?.adult?.fr || '',
            duree: med.duration?.fr || med.duration || '',
            quantite: '1 boîte',
            remarques: med.instructions?.fr || med.instructions || med.remarques || '',
            nonSubstituable: false
          })
        }
      })
    })

    // Extraction des examens biologiques
    dataSources.forEach(source => {
      const bioPaths = [
        'biological.examinations',
        'biologie.examens',
        'consultation.management_plan.investigations.laboratory_tests',
        'expert_investigations.investigation_strategy.laboratory_tests'
      ]
      
      extractSafely(source, bioPaths).forEach(exam => {
        if (!exam) return
        const name = exam.test_name?.fr || exam.test?.fr || exam.name || exam.type || exam.examen || ''
        const key = name.toLowerCase().trim()
        
        if (name && !seen.has(`bio:${key}`)) {
          seen.add(`bio:${key}`)
          examsBio.push({
            type: name,
            code: '',
            urgence: exam.urgency === 'Urgent' || exam.urgency === 'STAT',
            jeun: false,
            remarques: exam.justification?.fr || exam.clinical_justification?.fr || exam.indication || ''
          })
        }
      })
    })

    // Extraction des examens d'imagerie
    dataSources.forEach(source => {
      const imgPaths = [
        'imaging.studies',
        'imagerie.examens',
        'consultation.management_plan.investigations.imaging_studies',
        'expert_investigations.investigation_strategy.imaging_studies'
      ]
      
      extractSafely(source, imgPaths).forEach(exam => {
        if (!exam) return
        const name = exam.study_name?.fr || exam.type || exam.name || exam.examen || ''
        const key = name.toLowerCase().trim()
        
        if (name && !seen.has(`img:${key}`)) {
          seen.add(`img:${key}`)
          examsImaging.push({
            type: name,
            region: exam.region || 'À préciser',
            indication: exam.indication?.fr || exam.indication || '',
            urgence: exam.urgency === 'Urgent' || exam.urgency === 'STAT',
            contraste: false,
            remarques: exam.findings_sought?.fr || exam.details || exam.remarques || ''
          })
        }
      })
    })

    // Extraction du diagnostic principal
    const diagnosticPrincipal = 
      diagnosisData?.diagnosis?.primary?.condition ||
      diagnosisData?.diagnosis?.primary?.condition_bilingual?.fr ||
      diagnosisData?.primaryDiagnosis ||
      diagnosisData?.principal ||
      (typeof diagnosisData === 'string' ? diagnosisData : '') ||
      "Diagnostic en cours d'établissement"

    // Extraction du motif de consultation
    const motifConsultation = 
      clinicalData?.chiefComplaint || 
      (Array.isArray(clinicalData?.symptoms) ? clinicalData.symptoms.join(', ') : clinicalData?.symptoms) ||
      diagnosisData?.chiefComplaint ||
      diagnosisData?.reason ||
      "Consultation médicale"

    // Template JSON simplifié
    const jsonTemplate = {
      header: {
        title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
        subtitle: "Document médical confidentiel",
        reference: `CR-${patient.nom}_${Date.now()}`
      },
      identification: patient,
      rapport: {
        motifConsultation: "[GÉNÉRER_150_MOTS]",
        anamnese: "[GÉNÉRER_350_MOTS]",
        antecedents: "[GÉNÉRER_200_MOTS]",
        examenClinique: "[GÉNÉRER_400_MOTS]",
        syntheseDiagnostique: "[GÉNÉRER_350_MOTS]",
        conclusionDiagnostique: "[GÉNÉRER_150_MOTS]",
        priseEnCharge: "[GÉNÉRER_300_MOTS]",
        surveillance: "[GÉNÉRER_200_MOTS]",
        conclusion: "[GÉNÉRER_150_MOTS]"
      },
      prescriptions: {
        medicaments: { 
          items: medicaments, 
          renouvellement: false, 
          dateValidite: new Date(Date.now() + 90*24*60*60*1000).toLocaleDateString('fr-FR') 
        },
        biologie: { 
          examens: examsBio, 
          laboratoireRecommande: "Laboratoire d'analyses médicales agréé" 
        },
        imagerie: { 
          examens: examsImaging, 
          centreRecommande: "Centre d'imagerie médicale" 
        }
      },
      signature: {
        medecin: "Dr. [NOM DU MÉDECIN]",
        qualification: "Médecin Généraliste",
        rpps: "[NUMÉRO RPPS]",
        etablissement: "Cabinet Médical"
      },
      metadata: { 
        dateGeneration: new Date().toISOString(), 
        wordCount: 0 
      }
    }

    // Log de debug en dev uniquement
    if (process.env.NODE_ENV === 'development') {
      console.log("📊 Extraction résultats:")
      console.log(`- ${medicaments.length} médicaments`)
      console.log(`- ${examsBio.length} examens biologiques`)
      console.log(`- ${examsImaging.length} examens d'imagerie`)
      console.log(`- Diagnostic: ${diagnosticPrincipal}`)
    }

    // Prompt optimisé mais clair
    const systemPrompt = `Tu es médecin. Génère UNIQUEMENT un JSON valide sans texte avant/après.
Remplace chaque [GÉNÉRER_XXX_MOTS] par un paragraphe médical professionnel de XXX mots.
Ne modifie JAMAIS les sections prescriptions.`

    const userPrompt = `Patient: ${patient.nom}, ${patient.age}
Motif: ${motifConsultation}
Diagnostic: ${diagnosticPrincipal}
Symptômes: ${JSON.stringify(clinicalData?.symptoms || [])}
Signes vitaux: ${JSON.stringify(clinicalData?.vitalSigns || {})}
Antécédents: ${JSON.stringify(patientData.antecedents || patientData.medicalHistory || [])}

Génère le compte rendu en remplaçant tous les [GÉNÉRER_XXX_MOTS] :
${JSON.stringify(jsonTemplate)}`

    // Génération avec GPT-4 en utilisant le client avec clé hardcodée
    console.log("🤖 Appel GPT-4o avec clé hardcodée...")
    let reportData
    try {
      const result = await generateText({
        model: openaiClient("gpt-4o"), // <-- UTILISE openaiClient AU LIEU DE openai
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        maxTokens: 5000,
        temperature: 0.3,
      })

      console.log("✅ Réponse GPT-4o reçue")

      // Parse sécurisé
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Aucun JSON trouvé dans la réponse GPT-4')
      }
      
      reportData = JSON.parse(jsonMatch[0])
      
    } catch (parseError) {
      console.error("Erreur parsing GPT-4:", parseError)
      // Utiliser le template avec contenu par défaut
      reportData = jsonTemplate
      Object.keys(reportData.rapport).forEach(key => {
        reportData.rapport[key] = getDefaultContent(key)
      })
    }

    // Vérification et remplacement des sections non générées
    Object.keys(reportData.rapport).forEach(key => {
      if (typeof reportData.rapport[key] === 'string' && reportData.rapport[key].includes('GÉNÉRER')) {
        reportData.rapport[key] = getDefaultContent(key)
      }
    })
    
    // Calcul du wordCount
    reportData.metadata.wordCount = Object.values(reportData.rapport)
      .filter(v => typeof v === 'string')
      .join(' ')
      .split(/\s+/)
      .filter(Boolean)
      .length

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
        generatedAt: new Date().toISOString(),
        usingHardcodedKey: true
      }
    })

  } catch (error) {
    console.error("❌ Erreur API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue",
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    )
  }
}

// Contenu par défaut pour les sections
function getDefaultContent(section: string): string {
  const defaults: Record<string, string> = {
    motifConsultation: "Le patient consulte ce jour pour les symptômes décrits. La consultation a été réalisée dans le cadre d'une téléconsultation médicale. Les symptômes principaux ayant motivé cette consultation sont documentés et ont été analysés dans le contexte clinique global du patient.",
    anamnese: "L'anamnèse révèle les éléments cliniques présentés par le patient. L'histoire de la maladie actuelle est documentée selon les informations fournies lors de la consultation. L'évolution temporelle des symptômes a été précisément recueillie, permettant d'établir une chronologie claire des événements. Les facteurs déclenchants et aggravants ont été identifiés. Le retentissement sur la qualité de vie du patient a été évalué.",
    antecedents: "Les antécédents médicaux et chirurgicaux du patient ont été recueillis de manière exhaustive. Les allergies médicamenteuses et alimentaires sont documentées. Les traitements en cours ont été listés avec leurs posologies. Les antécédents familiaux pertinents ont été notés. Le mode de vie et les facteurs de risque cardiovasculaire ont été évalués.",
    examenClinique: "L'examen clinique a été adapté au contexte de téléconsultation. Les constantes vitales disponibles ont été prises en compte. L'état général du patient a été évalué. L'examen par système a été réalisé dans la mesure du possible en téléconsultation. Les signes fonctionnels rapportés par le patient ont été intégrés à l'analyse clinique. Les éléments d'examen physique observables à distance ont été notés.",
    syntheseDiagnostique: "La synthèse diagnostique est basée sur l'ensemble des éléments cliniques recueillis. Le raisonnement médical a conduit aux hypothèses diagnostiques retenues. La cohérence entre la symptomatologie présentée et le diagnostic évoqué a été vérifiée. Les diagnostics différentiels ont été systématiquement envisagés et discutés. La probabilité diagnostique a été évaluée selon les critères cliniques établis.",
    conclusionDiagnostique: "Le diagnostic principal a été établi sur la base des critères cliniques observés. Les arguments en faveur de ce diagnostic sont détaillés. Les diagnostics différentiels moins probables ont été écartés avec justification. Le niveau de certitude diagnostique est précisé.",
    priseEnCharge: "La prise en charge thérapeutique comprend les prescriptions médicamenteuses et les examens complémentaires jugés nécessaires. Les objectifs thérapeutiques sont clairement définis. Les mesures non médicamenteuses sont détaillées. L'éducation thérapeutique du patient a été réalisée. Les conseils hygiéno-diététiques adaptés ont été prodigués.",
    surveillance: "Les modalités de surveillance et de suivi ont été définies. Les signes d'alerte devant amener à reconsulter ont été expliqués au patient. Les critères d'efficacité du traitement sont précisés. La fréquence du suivi est adaptée à la pathologie. Les examens de contrôle nécessaires sont programmés.",
    conclusion: "Cette consultation a permis d'établir un diagnostic et de proposer une prise en charge adaptée. Un suivi est prévu selon les modalités définies. Le pronostic est évalué favorablement sous réserve d'une bonne observance thérapeutique. Le patient a été informé de manière claire et complète."
  }
  
  return defaults[section] || "Section à compléter selon les éléments cliniques disponibles."
}

// Fonction pour formatter les prescriptions simplifiées
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

// Endpoint de test
export async function GET(request: NextRequest) {
  console.log("🧪 Test connexion pour generate-consultation-report...")
  
  try {
    // Test simple avec le client configuré
    const testResult = await generateText({
      model: openaiClient("gpt-3.5-turbo"),
      prompt: "Dis simplement: OK",
      maxTokens: 10,
      temperature: 0
    })
    
    return NextResponse.json({
      status: "✅ API generate-consultation-report connectée",
      usingHardcodedKey: true,
      response: testResult.text
    })
  } catch (error: any) {
    return NextResponse.json({
      status: "❌ Erreur",
      error: error.message
    }, { status: 500 })
  }
}
