// /app/api/tibok-medical-assistant/route.ts
// TIBOK Medical Assistant - Expert AI for Professional Report Analysis & Modification
// Version 1.0 - Integration with Professional Report Page

import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// ==================== TYPES ====================
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

interface DocumentContext {
  medicalReport?: any
  prescription?: any
  laboratoryTests?: any
  imagingStudies?: any
  patientInfo?: any
  vitalSigns?: any
}

interface AssistantAction {
  type: 'modify_medical_report' | 'modify_medication_prescription' | 'modify_lab_prescription' | 'modify_paraclinical_prescription' | 'analyze_document_coherence' | 'search_medical_knowledge' | 'none'
  section?: string
  action?: 'add' | 'update' | 'remove'
  content?: any
  reasoning?: string
  urgency?: 'routine' | 'urgent' | 'emergency'
}

// ==================== TIBOK MEDICAL ASSISTANT SYSTEM PROMPT ====================
const TIBOK_MEDICAL_ASSISTANT_SYSTEM_PROMPT = `
# IDENTITÉ ET RÔLE

Tu es l'Assistant Médical TIBOK, un système d'intelligence artificielle expert conçu pour assister les médecins dans l'analyse et l'optimisation des consultations sur la plateforme TIBOK (Maurice).

Tu interviens APRÈS la génération automatique complète de TOUS les documents de consultation par le système TIBOK.

## DOCUMENTS SUR LESQUELS TU INTERVIENS

Tu as accès et peux modifier les 4 documents principaux générés par TIBOK :

### 1. RAPPORT MÉDICAL DE CONSULTATION
- Motif de consultation
- Anamnèse et histoire de la maladie
- Examen clinique
- Diagnostic(s) principal et secondaires
- Raisonnement clinique
- Plan de traitement
- Suivi et recommandations

### 2. ORDONNANCE MÉDICAMENTEUSE
- Prescriptions de médicaments
- Posologie, voie, durée
- Instructions spécifiques
- Renouvellements
- Contre-indications mentionnées

### 3. PRESCRIPTION D'EXAMENS BIOLOGIQUES
- Analyses sanguines (NFS, ionogramme, bilan hépatique, etc.)
- Analyses urinaires
- Microbiologie (cultures, PCR)
- Sérologies
- Tests spécialisés (hormones, marqueurs, etc.)

### 4. PRESCRIPTION D'EXAMENS PARACLINIQUES
- Imagerie (Radio, Echo, Scanner, IRM, PET)
- ECG, Holter, épreuve d'effort
- Endoscopies
- Explorations fonctionnelles (EFR, EMG, EEG)
- Biopsies et anatomo-pathologie

---

# EXPERTISE MÉDICALE

Tu possèdes une expertise approfondie dans :

**Guidelines et standards** :
- NICE Guidelines (National Institute for Health and Care Excellence, UK)
- British National Formulary (BNF) - référence médicamenteuse UK
- Mauritian Medical Council protocols et régulations locales
- WHO Essential Medicines List
- European Society of Cardiology (ESC) guidelines
- American Diabetes Association (ADA) standards
- Recommandations HAS (France) - applicables à Maurice

**Domaines cliniques** :
- Médecine générale et soins primaires
- Médecine tropicale (dengue, chikungunya, paludisme)
- Diabétologie (prévalence élevée à Maurice)
- Cardiologie et hypertension
- Infectiologie
- Pharmacologie clinique et interactions médicamenteuses
- Interprétation examens biologiques et paracliniques
- Pédiatrie et gériatrie de base
- Urgences médicales

**Prescription et examens** :
- Indications des examens biologiques
- Indications des imageries et explorations
- Interprétation résultats et seuils pathologiques
- Arbres décisionnels diagnostiques
- Coût-efficacité des examens
- Disponibilité examens à Maurice

**Contexte géographique** :
- Système de santé mauricien
- Épidémiologie locale (maladies tropicales, diabète, HTA)
- Disponibilité des médicaments à Maurice
- Laboratoires et centres d'imagerie disponibles
- Standards UK (lien historique et réglementaire)
- Nomenclature française (influence historique)

---

# 🧠 ENCYCLOPEDIC MEDICAL KNOWLEDGE

Tu possèdes une connaissance encyclopédique complète équivalente à :
- 📚 VIDAL / BNF (British National Formulary) - Base pharmaceutique complète
- 🔬 Harrison's Principles of Internal Medicine - Toutes pathologies
- 💊 Goodman & Gilman's Pharmacological Basis of Therapeutics - Tous médicaments
- 🧪 Tietz Clinical Chemistry - Tous tests laboratoire et interprétations
- 📖 Merck Manual - Protocoles diagnostiques et thérapeutiques complets
- 🩺 UpToDate / BMJ Best Practice - Médecine evidence-based
- 📋 ICD-10/ICD-11 - Classification complète des maladies
- 💉 WHO Essential Medicines List - Standards médicamenteux globaux

Pour CHAQUE décision médicale, tu dois accéder à ta connaissance encyclopédique pour fournir :
- DCI précis (Dénomination Commune Internationale)
- Posologie exacte selon BNF/VIDAL
- TOUTES les interactions médicamenteuses
- Contre-indications complètes
- Ajustements de dose (insuffisance rénale/hépatique)
- Tests laboratoire avec nomenclature exacte UK/Maurice
- Valeurs de référence complètes

---

# CAPACITÉS ET FONCTIONS

## 1. ANALYSE COMPLÈTE DES DOCUMENTS

Tu peux analyser la **cohérence inter-documents** :

### Cohérence diagnostic ↔ prescriptions
- Le traitement correspond-il au diagnostic ?
- Les examens demandés sont-ils pertinents ?
- Manque-t-il des examens essentiels ?

### Cohérence examens biologiques ↔ paracliniques
- Les examens se complètent-ils logiquement ?
- Y a-t-il des doublons inutiles ?
- L'ordre des examens est-il optimal ?

### Sécurité médicamenteuse ↔ examens
- Surveillance biologique nécessaire pour les médicaments ?
- Contre-indications liées aux résultats attendus ?

## 2. MODIFICATION DE TOUS LES DOCUMENTS

Sur demande du médecin, tu peux modifier :

### Sur le RAPPORT MÉDICAL :
- Diagnostic principal ou secondaires
- Anamnèse et examen clinique
- Raisonnement clinique
- Plan de traitement
- Recommandations de suivi

### Sur l'ORDONNANCE :
- Ajouter/modifier/retirer médicaments
- Changer posologie, durée, instructions
- Ajouter avertissements spécifiques
- Gérer les renouvellements

### Sur les EXAMENS BIOLOGIQUES :
- Ajouter/retirer analyses
- Changer urgence (routine/urgent)
- Préciser conditions (à jeun, timing)
- Ajouter contexte clinique

### Sur les EXAMENS PARACLINIQUES :
- Ajouter/retirer imageries ou explorations
- Préciser indications et questions cliniques
- Changer urgence
- Ajouter instructions techniques (contraste, etc.)

## 3. SUGGESTIONS PROACTIVES

Tu identifies automatiquement :
- Examens manquants selon le diagnostic
- Surveillances biologiques obligatoires
- Optimisations de prescription
- Interactions médicamenteuses potentielles
- Contre-indications oubliées

## 4. EXPLORATION MÉDICALE AVANCÉE

Tu fournis :
- Analyse de risque cardiovasculaire
- Arbres décisionnels
- Stratégies diagnostiques step-by-step
- Recommandations evidence-based

---

# PRINCIPES COMPORTEMENTAUX

## 1. HIÉRARCHIE DÉCISIONNELLE
⚕️ **LE MÉDECIN A L'AUTORITÉ FINALE ABSOLUE SUR TOUS LES DOCUMENTS**

- Tu proposes, suggères, alertes
- Le médecin décide et valide
- Si le médecin impose un choix : tu l'appliques
- Maximum UNE alerte de sécurité si risque grave, puis obéis

## 2. VISION GLOBALE DES DOCUMENTS

Tu analyses TOUJOURS les interdépendances :
- Diagnostic → traitements cohérents ?
- Traitements → examens de surveillance ?
- Examens biologiques + paracliniques → complémentaires ?
- Tout est aligné avec le diagnostic ?

## 3. STYLE DE COMMUNICATION

**Avec le médecin** :
- Langage médical précis
- Structure claire
- Citations sources ("Selon NICE...", "BNF recommande...")
- Symboles: ✅ ⚠️ 💡 📊 🎯

## 4. SÉCURITÉ MÉDICALE

**Alertes obligatoires** :
- Interactions médicamenteuses graves
- Examens de surveillance manquants (ex: IEC sans créatinine)
- Contre-indications
- Examens invasifs sans justification claire

---

# FORMAT DE RÉPONSE STRUCTURÉ

Tu dois TOUJOURS fournir tes réponses en JSON valide avec la structure suivante :

\`\`\`json
{
  "response": "Texte de ta réponse au médecin",
  "actions": [
    {
      "type": "modify_medical_report|modify_medication_prescription|modify_lab_prescription|modify_paraclinical_prescription|analyze_document_coherence|none",
      "section": "diagnosis|symptoms|physical_exam|clinical_reasoning|treatment_plan|follow_up|recommendations|medications|laboratory|imaging",
      "action": "add|update|remove",
      "content": {},
      "reasoning": "Justification médicale"
    }
  ],
  "alerts": [
    {
      "type": "critical|warning|info",
      "message": "Description de l'alerte"
    }
  ],
  "suggestions": [
    {
      "category": "medication|lab_test|imaging|safety",
      "priority": "high|medium|low",
      "suggestion": "Description de la suggestion",
      "reasoning": "Justification"
    }
  ]
}
\`\`\`

---

# LIMITES ET DISCLAIMERS

## Ce que tu NE fais PAS :
❌ **Diagnostiquer seul** : tu assistes le médecin
❌ **Prescrire sans validation** : toute modification nécessite accord médecin  
❌ **Garantir exactitude absolue** : tu mentionnes limites si incertain
❌ **Remplacer jugement clinique** : le médecin a examiné le patient, pas toi

---

# ACTIVATION

Tu es l'Assistant Médical TIBOK avec accès aux 4 documents :
1. Rapport médical
2. Ordonnance médicamenteuse  
3. Prescription examens biologiques
4. Prescription examens paracliniques

Tu analyses leur cohérence et aide le médecin à les optimiser.
Reste professionnel, précis, et collaboratif.

Prêt à commencer. Attends les instructions du médecin.
`

// ==================== HELPER FUNCTIONS ====================

function buildDocumentContextSummary(context: DocumentContext): string {
  let summary = '═══════════════════════════════════════════════════════════════════\n'
  summary += '📋 ÉTAT ACTUEL DES DOCUMENTS DE CONSULTATION\n'
  summary += '═══════════════════════════════════════════════════════════════════\n\n'

  // Patient Info
  if (context.patientInfo) {
    summary += '👤 PATIENT:\n'
    summary += `   - Nom: ${context.patientInfo.nom || context.patientInfo.nomComplet || 'N/A'}\n`
    summary += `   - Âge: ${context.patientInfo.age || 'N/A'}\n`
    summary += `   - Sexe: ${context.patientInfo.sexe || 'N/A'}\n`
    if (context.patientInfo.poids) summary += `   - Poids: ${context.patientInfo.poids} kg\n`
    if (context.patientInfo.allergies && context.patientInfo.allergies !== 'NKDA (No Known Drug Allergies)') {
      summary += `   - ⚠️ ALLERGIES: ${context.patientInfo.allergies}\n`
    }
    if (context.patientInfo.medicalHistory) {
      summary += `   - Antécédents: ${context.patientInfo.medicalHistory}\n`
    }
    if (context.patientInfo.currentMedications && context.patientInfo.currentMedications !== 'No current medications') {
      summary += `   - Traitement actuel: ${context.patientInfo.currentMedications}\n`
    }
    summary += '\n'
  }

  // Vital Signs
  if (context.vitalSigns) {
    summary += '📊 SIGNES VITAUX:\n'
    if (context.vitalSigns.bloodPressureSystolic && context.vitalSigns.bloodPressureDiastolic) {
      const systolic = parseInt(context.vitalSigns.bloodPressureSystolic)
      const diastolic = parseInt(context.vitalSigns.bloodPressureDiastolic)
      let bpAlert = ''
      if (systolic >= 180 || diastolic >= 120) bpAlert = ' ⚠️ URGENCE HYPERTENSIVE'
      else if (systolic >= 140 || diastolic >= 90) bpAlert = ' ⚠️ HTA'
      summary += `   - TA: ${systolic}/${diastolic} mmHg${bpAlert}\n`
    }
    if (context.vitalSigns.temperature) {
      const temp = parseFloat(context.vitalSigns.temperature)
      let tempAlert = ''
      if (temp >= 38.5) tempAlert = ' ⚠️ FIÈVRE'
      summary += `   - Température: ${temp}°C${tempAlert}\n`
    }
    if (context.vitalSigns.bloodGlucose) {
      const glucose = parseFloat(context.vitalSigns.bloodGlucose)
      let glucoseAlert = ''
      if (glucose < 0.7) glucoseAlert = ' ⚠️ HYPOGLYCÉMIE'
      else if (glucose > 2.0) glucoseAlert = ' ⚠️ HYPERGLYCÉMIE SÉVÈRE'
      else if (glucose > 1.26) glucoseAlert = ' ⚠️ HYPERGLYCÉMIE'
      summary += `   - Glycémie: ${glucose} g/L${glucoseAlert}\n`
    }
    summary += '\n'
  }

  // Medical Report
  if (context.medicalReport) {
    summary += '📄 RAPPORT MÉDICAL:\n'
    if (context.medicalReport.motifConsultation) {
      summary += `   - Motif: ${context.medicalReport.motifConsultation.substring(0, 200)}...\n`
    }
    if (context.medicalReport.conclusionDiagnostique) {
      summary += `   - Diagnostic: ${context.medicalReport.conclusionDiagnostique.substring(0, 200)}...\n`
    }
    if (context.medicalReport.priseEnCharge) {
      summary += `   - Plan de traitement: ${context.medicalReport.priseEnCharge.substring(0, 150)}...\n`
    }
    summary += '\n'
  }

  // Medications
  if (context.prescription?.medicaments && context.prescription.medicaments.length > 0) {
    summary += `💊 ORDONNANCE (${context.prescription.medicaments.length} médicament(s)):\n`
    context.prescription.medicaments.forEach((med: any, idx: number) => {
      const dci = med.denominationCommune || med.dci || med.nom
      summary += `   ${idx + 1}. ${med.nom || 'N/A'}\n`
      summary += `      - DCI: ${dci}\n`
      summary += `      - Dosage: ${med.dosage || 'N/A'}\n`
      summary += `      - Posologie: ${med.posologie || 'N/A'}\n`
      summary += `      - Durée: ${med.dureeTraitement || 'N/A'}\n`
      if (med.justification) {
        summary += `      - Indication: ${med.justification}\n`
      }
    })
    summary += '\n'
  } else {
    summary += '💊 ORDONNANCE: Aucun médicament prescrit\n\n'
  }

  // Laboratory Tests
  if (context.laboratoryTests?.analyses) {
    const analyses = context.laboratoryTests.analyses
    const totalTests = Object.values(analyses).reduce((acc: number, tests: any) => 
      acc + (Array.isArray(tests) ? tests.length : 0), 0)
    
    if (totalTests > 0) {
      summary += `🔬 EXAMENS BIOLOGIQUES (${totalTests} test(s)):\n`
      for (const [category, tests] of Object.entries(analyses)) {
        if (Array.isArray(tests) && tests.length > 0) {
          summary += `   📋 ${category.toUpperCase()}:\n`
          tests.forEach((test: any) => {
            summary += `      - ${test.nom || 'N/A'}\n`
            if (test.motifClinique) summary += `        Indication: ${test.motifClinique}\n`
            if (test.urgence) summary += `        ⚠️ URGENT\n`
          })
        }
      }
      summary += '\n'
    } else {
      summary += '🔬 EXAMENS BIOLOGIQUES: Aucun examen prescrit\n\n'
    }
  }

  // Imaging Studies
  if (context.imagingStudies?.examens && context.imagingStudies.examens.length > 0) {
    summary += `🩻 EXAMENS PARACLINIQUES (${context.imagingStudies.examens.length} examen(s)):\n`
    context.imagingStudies.examens.forEach((exam: any, idx: number) => {
      summary += `   ${idx + 1}. ${exam.type || exam.modalite || 'N/A'} - ${exam.region || 'N/A'}\n`
      if (exam.indicationClinique) summary += `      Indication: ${exam.indicationClinique}\n`
      if (exam.urgence) summary += `      ⚠️ URGENT\n`
      if (exam.contraste) summary += `      💉 Avec contraste\n`
    })
    summary += '\n'
  } else {
    summary += '🩻 EXAMENS PARACLINIQUES: Aucun examen prescrit\n\n'
  }

  summary += '═══════════════════════════════════════════════════════════════════\n'
  return summary
}

function parseAssistantResponse(text: string): { response: string; actions: AssistantAction[]; alerts: any[]; suggestions: any[] } {
  // Try to extract JSON from the response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/\{[\s\S]*"response"[\s\S]*\}/i)
  
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0]
      const parsed = JSON.parse(jsonStr)
      return {
        response: parsed.response || text,
        actions: parsed.actions || [],
        alerts: parsed.alerts || [],
        suggestions: parsed.suggestions || []
      }
    } catch (e) {
      console.log('Failed to parse JSON response, using raw text')
    }
  }
  
  // Return raw text if JSON parsing fails
  return {
    response: text,
    actions: [],
    alerts: [],
    suggestions: []
  }
}

function generateConversationId(): string {
  return `TIBOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ==================== MAIN API HANDLER ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      message,
      conversationHistory = [],
      documentContext,
      conversationId
    } = body

    console.log('🤖 TIBOK MEDICAL ASSISTANT REQUEST')
    console.log(`   - Message: ${message?.substring(0, 100)}...`)
    console.log(`   - Has Medical Report: ${!!documentContext?.medicalReport}`)
    console.log(`   - Has Prescription: ${!!documentContext?.prescription}`)
    console.log(`   - Has Lab Tests: ${!!documentContext?.laboratoryTests}`)
    console.log(`   - Has Imaging: ${!!documentContext?.imagingStudies}`)

    // Build context summary from all documents
    const contextSummary = buildDocumentContextSummary(documentContext || {})

    // Prepare messages for GPT-4
    const messages: Message[] = [
      { role: 'system', content: TIBOK_MEDICAL_ASSISTANT_SYSTEM_PROMPT },
      { role: 'system', content: contextSummary },
      ...conversationHistory.slice(-15), // Keep last 15 messages for context
      { role: 'user', content: message }
    ]

    console.log('📡 Calling GPT-4 with TIBOK Medical Assistant prompt...')

    // Call GPT-4
    const result = await generateText({
      model: openai("gpt-4o"),
      messages,
      maxTokens: 4000,
      temperature: 0.2
    })

    const responseText = result.text

    // Parse the response to extract structured actions
    const parsed = parseAssistantResponse(responseText)

    console.log('✅ TIBOK Assistant response generated')
    console.log(`   - Response length: ${parsed.response.length} chars`)
    console.log(`   - Actions: ${parsed.actions.length}`)
    console.log(`   - Alerts: ${parsed.alerts.length}`)
    console.log(`   - Suggestions: ${parsed.suggestions.length}`)

    return NextResponse.json({
      success: true,
      response: parsed.response,
      actions: parsed.actions,
      alerts: parsed.alerts,
      suggestions: parsed.suggestions,
      conversationId: conversationId || generateConversationId(),
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Error in TIBOK Medical Assistant:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to process TIBOK assistant request',
      message: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}

// ==================== GET HANDLER FOR STATUS ====================
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    name: 'TIBOK Medical Assistant',
    version: '1.0',
    capabilities: [
      'analyze_document_coherence',
      'modify_medical_report',
      'modify_medication_prescription',
      'modify_lab_prescription',
      'modify_paraclinical_prescription',
      'search_medical_knowledge'
    ],
    supportedDocuments: [
      'medical_report',
      'prescription',
      'laboratory_tests',
      'imaging_studies'
    ]
  })
}
