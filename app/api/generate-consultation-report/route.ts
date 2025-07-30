// app/api/generate-consultation-report/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    console.log("📋 Génération du dossier médical complet")
    
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData,
      editedDocuments,
      generateAllDocuments = false
    } = await request.json()

    if (!patientData || !clinicalData || !diagnosisData) {
      return NextResponse.json(
        { success: false, error: "Données incomplètes" },
        { status: 400 }
      )
    }

    // Si on doit générer tous les documents
    if (generateAllDocuments) {
      console.log("🤖 Génération complète : compte rendu + ordonnances")
      
      // Extraire les informations clés pour le prompt
      const patientInfo = {
        nom: `${patientData.firstName} ${patientData.lastName}`,
        age: patientData.age,
        sexe: patientData.gender?.[0] || patientData.gender,
        poids: patientData.weight,
        taille: patientData.height,
        allergies: Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : 'Aucune',
        antecedents: patientData.medicalHistory?.join(', ') || 'Aucun',
        adresse: patientData.address || 'Non renseignée',
        telephone: patientData.phone || patientData.phoneNumber || 'Non renseigné'
      }

      const clinicalInfo = {
        motif: clinicalData.chiefComplaint,
        duree: clinicalData.symptomDuration,
        symptomes: clinicalData.symptoms?.join(', '),
        signesVitaux: clinicalData.vitalSigns,
        examenPhysique: clinicalData.physicalExamDetails
      }

      const diagnosticInfo = {
        principal: diagnosisData?.diagnosis?.primary?.condition || diagnosisData?.primary?.condition,
        differentiel: diagnosisData?.diagnosis?.differential || [],
        investigations: diagnosisData?.expertAnalysis?.expert_investigations,
        traitements: diagnosisData?.expertAnalysis?.expert_therapeutics
      }

      const completePrompt = `
Tu es un médecin senior expérimenté à Maurice créant un dossier médical complet.

CONTEXTE PATIENT:
${JSON.stringify(patientInfo, null, 2)}

DONNÉES CLINIQUES:
${JSON.stringify(clinicalInfo, null, 2)}

DIAGNOSTIC ET ANALYSE:
${JSON.stringify(diagnosticInfo, null, 2)}

INSTRUCTIONS:
1. Génère un compte rendu professionnel en PROSE NARRATIVE fluide
2. Génère les 4 ordonnances complètes basées sur le diagnostic
3. Utilise la terminologie médicale française appropriée
4. Adapte au contexte mauricien (disponibilités, centres, etc.)
5. Intègre TOUTES les recommandations du diagnostic

RETOURNE UNIQUEMENT UN JSON VALIDE (sans markdown, sans backticks):

{
  "report": {
    "header": {
      "title": "COMPTE-RENDU DE CONSULTATION MÉDICALE",
      "subtitle": "Médecine Générale - Consultation du ${new Date().toLocaleDateString('fr-FR')}",
      "reference": "CR-${Date.now()}"
    },
    "identification": {
      "patient": "${patientInfo.nom}",
      "age": "${patientInfo.age} ans",
      "dateNaissance": "${patientData.birthDate || 'Non renseignée'}",
      "sexe": "${patientInfo.sexe}",
      "adresse": "${patientInfo.adresse}",
      "telephone": "${patientInfo.telephone}"
    },
    "rapport": {
      "motifConsultation": "[PROSE fluide décrivant pourquoi le patient consulte, intégrant le motif et le contexte]",
      "anamnese": "[PROSE NARRATIVE détaillée racontant l'histoire de la maladie de manière chronologique, incluant l'apparition des symptômes, leur évolution, les facteurs aggravants, l'impact sur la vie quotidienne]",
      "antecedents": "[PROSE décrivant les antécédents médicaux, chirurgicaux, familiaux, allergies, habitudes de vie de manière narrative]",
      "examenClinique": "[PROSE MÉDICALE AU PRÉSENT décrivant l'examen physique de manière systématique : état général, signes vitaux, examen par appareil]",
      "syntheseDiagnostique": "[PROSE exposant le raisonnement diagnostique, les hypothèses envisagées et écartées]",
      "conclusionDiagnostique": "[PROSE concluant sur le diagnostic retenu avec les arguments cliniques]",
      "priseEnCharge": "[PROSE détaillant le plan thérapeutique : examens, traitements, mesures associées]",
      "surveillance": "[PROSE décrivant le plan de surveillance, les signes d'alerte, le suivi recommandé]",
      "conclusion": "[PROSE résumant la consultation, le pronostic et les perspectives]"
    },
    "signature": {
      "medecin": "Dr. MÉDECIN EXPERT",
      "qualification": "Médecin Généraliste",
      "rpps": "",
      "etablissement": "Cabinet Médical - Maurice"
    },
    "metadata": {
      "dateGeneration": "${new Date().toISOString()}",
      "dureeConsultation": "30 minutes",
      "typeConsultation": "Consultation initiale"
    }
  },
  
  "documents": {
    "consultation": {
      "header": {
        "title": "COMPTE-RENDU DE CONSULTATION",
        "subtitle": "Médecine Générale",
        "date": "${new Date().toISOString().split('T')[0]}",
        "time": "${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}",
        "physician": "Dr. MÉDECIN EXPERT",
        "registration": "COUNCIL-MU-2024-001",
        "institution": "Centre Médical Maurice"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientInfo.age} ans",
        "sex": "${patientInfo.sexe === 'Masculin' ? 'M' : 'F'}",
        "address": "${patientInfo.adresse}",
        "phone": "${patientInfo.telephone}",
        "weight": "${patientInfo.poids}",
        "height": "${patientInfo.taille}",
        "allergies": "${patientInfo.allergies}"
      },
      "content": {
        "chiefComplaint": "${clinicalInfo.motif}",
        "history": "[Anamnèse complète intégrant tous les éléments cliniques]",
        "examination": "[Examen physique détaillé avec constantes et examen par appareil]",
        "diagnosis": "[Diagnostic principal retenu]",
        "plan": "[Plan de prise en charge détaillé]"
      }
    },
    
    "biology": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
        "date": "${new Date().toISOString().split('T')[0]}",
        "number": "BIO-MU-${Date.now()}",
        "physician": "Dr. MÉDECIN EXPERT",
        "registration": "COUNCIL-MU-2024-001"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientInfo.age} ans",
        "address": "${patientInfo.adresse}"
      },
      "prescriptions": [
        ${generateBiologyPrescriptions(diagnosticInfo)}
      ]
    },
    
    "paraclinical": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION D'EXAMENS PARACLINIQUES",
        "date": "${new Date().toISOString().split('T')[0]}",
        "number": "PARA-MU-${Date.now()}",
        "physician": "Dr. MÉDECIN EXPERT",
        "registration": "COUNCIL-MU-2024-001"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientInfo.age} ans",
        "address": "${patientInfo.adresse}"
      },
      "prescriptions": [
        ${generateParaclinicalPrescriptions(diagnosticInfo)}
      ]
    },
    
    "medication": {
      "header": {
        "title": "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
        "subtitle": "PRESCRIPTION THÉRAPEUTIQUE",
        "date": "${new Date().toISOString().split('T')[0]}",
        "number": "MED-MU-${Date.now()}",
        "physician": "Dr. MÉDECIN EXPERT",
        "registration": "COUNCIL-MU-2024-001",
        "validity": "Ordonnance valable 3 mois"
      },
      "patient": {
        "firstName": "${patientData.firstName}",
        "lastName": "${patientData.lastName}",
        "age": "${patientInfo.age} ans",
        "weight": "${patientInfo.poids}",
        "allergies": "${patientInfo.allergies}",
        "address": "${patientInfo.adresse}",
        "pregnancy": "Non applicable"
      },
      "prescriptions": [
        ${generateMedicationPrescriptions(diagnosticInfo, patientInfo)}
      ],
      "clinicalAdvice": {
        "hydration": "Hydratation renforcée (2-3L/jour) adaptée au climat tropical de Maurice",
        "activity": "Repos relatif selon symptômes, éviter efforts intenses aux heures chaudes (10h-16h)",
        "diet": "Alimentation équilibrée, privilégier fruits et légumes locaux, éviter aliments épicés si troubles digestifs",
        "mosquitoProtection": "Protection anti-moustiques INDISPENSABLE (dengue/chikungunya endémiques) : répulsifs, vêtements longs, moustiquaire",
        "followUp": "Consultation de contrôle si pas d'amélioration sous 48-72h ou si aggravation des symptômes",
        "emergency": "Urgences Maurice: 999 (SAMU) ou 114 - Cliniques 24h: Apollo Bramwell (Moka), Wellkin (Moka), C-Care Darné"
      }
    }
  }
}
`

      console.log("🤖 Appel GPT-4 pour génération complète...")
      
      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: completePrompt,
        maxTokens: 10000,
        temperature: 0.3,
      })

      console.log("✅ Génération terminée, parsing du résultat...")

      // Parser et valider la réponse
      let responseData
      try {
        let cleanedResponse = result.text.trim()
        
        // Nettoyer toute trace de markdown
        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '')
        cleanedResponse = cleanedResponse.replace(/^```\s*/i, '')
        cleanedResponse = cleanedResponse.replace(/\s*```$/i, '')
        cleanedResponse = cleanedResponse.trim()
        
        responseData = JSON.parse(cleanedResponse)
        
        // Ajouter les métadonnées
        if (responseData.report) {
          responseData.report.metadata = responseData.report.metadata || {}
          responseData.report.metadata.wordCount = countWords(JSON.stringify(responseData.report.rapport))
          responseData.report.metadata.generatedAt = new Date().toISOString()
        }
        
      } catch (error) {
        console.error("❌ Erreur parsing JSON:", error)
        console.error("Réponse brute (premiers 500 caractères):", result.text.substring(0, 500))
        throw new Error("Erreur de format dans la réponse générée")
      }

      return NextResponse.json({
        success: true,
        report: responseData.report,
        documents: responseData.documents
      })

    } else {
      // Génération simple du rapport seul (comportement original)
      console.log("📄 Génération du compte rendu seul")
      
      const simplePrompt = `
Tu es un médecin senior rédigeant un compte rendu professionnel.

CONTEXTE:
${JSON.stringify({ patientData, clinicalData, questionsData, diagnosisData }, null, 2)}

Génère UNIQUEMENT le compte rendu narratif (sans les ordonnances).

RETOURNE UN JSON VALIDE:
{
  "header": {...},
  "identification": {...},
  "rapport": {
    "motifConsultation": "[PROSE]",
    "anamnese": "[PROSE NARRATIVE]",
    "antecedents": "[PROSE]",
    "examenClinique": "[PROSE AU PRÉSENT]",
    "syntheseDiagnostique": "[PROSE]",
    "conclusionDiagnostique": "[PROSE]",
    "priseEnCharge": "[PROSE]",
    "surveillance": "[PROSE]",
    "conclusion": "[PROSE]"
  },
  "signature": {...}
}
`

      const result = await generateText({
        model: openai("gpt-4o"),
        prompt: simplePrompt,
        maxTokens: 6000,
        temperature: 0.3,
      })

      let reportData = JSON.parse(result.text.trim())

      return NextResponse.json({
        success: true,
        report: reportData
      })
    }

  } catch (error) {
    console.error("❌ Erreur génération:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur inconnue lors de la génération"
      },
      { status: 500 }
    )
  }
}

// Fonctions helper pour générer les prescriptions depuis le diagnostic

function generateBiologyPrescriptions(diagnosticInfo: any): string {
  const prescriptions = []
  
  if (diagnosticInfo.investigations?.immediate_priority) {
    const biologyExams = diagnosticInfo.investigations.immediate_priority
      .filter((exam: any) => exam.category === 'biology')
    
    biologyExams.forEach((exam: any, index: number) => {
      prescriptions.push(`{
        "id": ${Date.now() + index},
        "exam": "${exam.examination || 'Examen biologique'}",
        "indication": "${exam.specific_indication || 'Selon contexte clinique'}",
        "urgency": "${mapUrgency(exam.urgency)}",
        "fasting": "${exam.fasting_required ? 'Oui - 8h' : 'Non'}",
        "expectedResults": "${exam.interpretation_keys || 'Résultats à interpréter selon contexte'}",
        "sampleType": "${exam.sample_type || 'Sang veineux'}",
        "contraindications": "Aucune",
        "mauritianAvailability": "${formatAvailability(exam.mauritius_availability)}",
        "cost": "${exam.mauritius_availability?.estimated_cost || 'À vérifier'}"
      }`)
    })
  }
  
  // Si pas d'examens, ajouter un template basique
  if (prescriptions.length === 0) {
    prescriptions.push(`{
      "id": ${Date.now()},
      "exam": "À définir selon évolution",
      "indication": "Selon contexte clinique",
      "urgency": "Semi-urgent (24-48h)",
      "fasting": "Non",
      "expectedResults": "",
      "sampleType": "Sang veineux",
      "contraindications": "Aucune",
      "mauritianAvailability": "Disponible laboratoires Maurice",
      "cost": "À vérifier"
    }`)
  }
  
  return prescriptions.join(',\n        ')
}

function generateParaclinicalPrescriptions(diagnosticInfo: any): string {
  const prescriptions = []
  
  if (diagnosticInfo.investigations?.immediate_priority) {
    const paraclinicalExams = diagnosticInfo.investigations.immediate_priority
      .filter((exam: any) => exam.category === 'imaging' || exam.category === 'functional')
    
    paraclinicalExams.forEach((exam: any, index: number) => {
      prescriptions.push(`{
        "id": ${Date.now() + index + 100},
        "category": "${mapExamCategory(exam.examination)}",
        "exam": "${exam.examination || 'Examen paraclinique'}",
        "indication": "${exam.specific_indication || 'Exploration complémentaire'}",
        "urgency": "${mapUrgency(exam.urgency)}",
        "preparation": "${exam.patient_preparation || 'Aucune préparation spéciale'}",
        "contraindications": "${exam.contraindications || 'Aucune'}",
        "duration": "${exam.duration || '15-30 minutes'}",
        "mauritianAvailability": "${formatAvailability(exam.mauritius_availability)}",
        "cost": "${exam.mauritius_availability?.estimated_cost || 'Variable selon secteur'}"
      }`)
    })
  }
  
  if (prescriptions.length === 0) {
    prescriptions.push(`{
      "id": ${Date.now() + 100},
      "category": "",
      "exam": "À définir selon évolution",
      "indication": "Si nécessaire",
      "urgency": "Programmé (1-2 semaines)",
      "preparation": "Aucune",
      "contraindications": "Aucune",
      "duration": "Variable",
      "mauritianAvailability": "Centres publics et privés",
      "cost": "À vérifier"
    }`)
  }
  
  return prescriptions.join(',\n        ')
}

function generateMedicationPrescriptions(diagnosticInfo: any, patientInfo: any): string {
  const prescriptions = []
  const isElderly = parseInt(patientInfo.age) >= 65
  
  if (diagnosticInfo.traitements?.primary_treatments) {
    diagnosticInfo.traitements.primary_treatments.forEach((treatment: any, index: number) => {
      const dosing = treatment.dosing_regimen?.standard_adult || ""
      const elderlyDosing = treatment.dosing_regimen?.elderly_adjustment || dosing
      
      prescriptions.push(`{
        "id": ${Date.now() + index + 200},
        "class": "${mapTherapeuticClass(treatment.therapeutic_class)}",
        "dci": "${treatment.medication_dci || ''}",
        "brand": "${treatment.mauritius_availability?.brand_names?.join(' / ') || 'Marques locales'}",
        "dosage": "${isElderly && elderlyDosing ? elderlyDosing : dosing}",
        "frequency": "${extractFrequency(dosing)}",
        "duration": "${treatment.treatment_duration || '7 jours'}",
        "totalQuantity": "${calculateQuantity(dosing, treatment.treatment_duration)}",
        "indication": "${treatment.precise_indication || ''}",
        "administration": "${treatment.administration_route || 'Per os'}",
        "contraindications": "${treatment.contraindications_absolute?.join(', ') || 'À vérifier'}",
        "precautions": "${treatment.precautions || 'Respecter posologie'}",
        "monitoring": "${treatment.monitoring_parameters?.join(', ') || 'Efficacité et tolérance'}",
        "mauritianAvailability": "${treatment.mauritius_availability?.locally_available ? 'Disponible' : 'À commander'}",
        "cost": "${treatment.mauritius_availability?.private_sector_cost || 'À préciser'}"
      }`)
    })
  }
  
  if (prescriptions.length === 0) {
    prescriptions.push(`{
      "id": ${Date.now() + 200},
      "class": "",
      "dci": "",
      "brand": "",
      "dosage": "",
      "frequency": "À définir",
      "duration": "",
      "totalQuantity": "",
      "indication": "",
      "administration": "Per os",
      "contraindications": "À vérifier",
      "precautions": "Respecter posologie",
      "monitoring": "Efficacité et tolérance",
      "mauritianAvailability": "À vérifier",
      "cost": "À préciser"
    }`)
  }
  
  return prescriptions.join(',\n        ')
}

// Fonctions utilitaires

function mapUrgency(urgency: string): string {
  switch(urgency?.toLowerCase()) {
    case 'immediate': return "Urgent (dans les heures)"
    case 'urgent': return "Semi-urgent (24-48h)"
    case 'routine': return "Programmé (1-2 semaines)"
    default: return "Programmé (1-2 semaines)"
  }
}

function mapExamCategory(examName: string): string {
  const name = examName?.toLowerCase() || ""
  if (name.includes('echo') || name.includes('écho')) return "Échographie"
  if (name.includes('ecg')) return "Explorations cardiologiques"
  if (name.includes('scanner') || name.includes('tdm')) return "Scanner (TDM)"
  if (name.includes('irm')) return "IRM"
  if (name.includes('radio')) {
    if (name.includes('thorax')) return "Imagerie thoracique"
    if (name.includes('abdom')) return "Imagerie abdominale"
    return "Imagerie standard"
  }
  return "Autres examens"
}

function mapTherapeuticClass(classes: string[]): string {
  if (!classes || classes.length === 0) return "Autre"
  const classStr = classes.join(' ').toLowerCase()
  
  if (classStr.includes('antalgique') || classStr.includes('antipyrétique')) {
    return "Antalgique non opioïde"
  }
  if (classStr.includes('ains') || classStr.includes('anti-inflammatoire')) {
    return "Anti-inflammatoire non stéroïdien (AINS)"
  }
  if (classStr.includes('antibiotique') || classStr.includes('antibactérien')) {
    return "Antibiotique"
  }
  if (classStr.includes('corticoïde')) {
    return "Corticoïde"
  }
  if (classStr.includes('antihistaminique')) {
    return "Antihistaminique"
  }
  return "Autre"
}

function formatAvailability(availability: any): string {
  if (!availability) return "Disponible Maurice"
  
  if (availability.public_centers?.length > 0) {
    return `Disponible: ${availability.public_centers.slice(0, 3).join(', ')}`
  }
  
  return availability.locally_available ? 
    "Disponible secteur public et privé" : 
    "À commander / Centres spécialisés"
}

function extractFrequency(dosing: string): string {
  if (!dosing) return "3 fois par jour"
  
  if (dosing.includes('x 1/jour') || dosing.includes('1 fois')) return "1 fois par jour"
  if (dosing.includes('x 2/jour') || dosing.includes('2 fois')) return "2 fois par jour"
  if (dosing.includes('x 3/jour') || dosing.includes('3 fois')) return "3 fois par jour"
  if (dosing.includes('x 4/jour') || dosing.includes('4 fois')) return "4 fois par jour"
  if (dosing.includes('matin et soir')) return "Matin et soir"
  
  return "3 fois par jour"
}

function calculateQuantity(dosing: string, duration: string): string {
  const daysMatch = duration?.match(/(\d+)\s*(jour|day)/i)
  const days = daysMatch ? parseInt(daysMatch[1]) : 7
  
  let dailyDoses = 3
  if (dosing?.includes('x 1/jour')) dailyDoses = 1
  if (dosing?.includes('x 2/jour')) dailyDoses = 2
  if (dosing?.includes('x 4/jour')) dailyDoses = 4
  
  return `${days * dailyDoses} comprimés`
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length
}
