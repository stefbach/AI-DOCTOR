// /app/api/tibok-medical-assistant/route.ts
// TIBOK Medical Assistant - Expert AI for Professional Report Analysis & Modification
// Version 1.0 - Integration with Professional Report Page

import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for GPT-4 medical assistance

// ==================== ZOD SCHEMA FOR STRUCTURED OUTPUT ====================
const tibokResponseSchema = z.object({
  response: z.string().max(300).describe("Concise analysis text in English (max 300 chars)"),
  actions: z.array(z.object({
    type: z.enum(['modify_medical_report', 'modify_medication_prescription', 'modify_lab_prescription', 'modify_paraclinical_prescription', 'analyze_document_coherence']),
    action: z.enum(['add', 'update', 'remove']).optional(),
    section: z.string().optional(),
    content: z.any(),
    reasoning: z.string().max(80).describe("Brief justification in English (max 80 chars)")
  })).max(2).describe("Maximum 2 actions"),
  alerts: z.array(z.object({
    type: z.enum(['critical', 'warning', 'info']),
    message: z.string()
  })),
  suggestions: z.array(z.object({
    category: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    suggestion: z.string(),
    reasoning: z.string()
  }))
})

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
🚨 **RULE #0 - ABSOLUTE - TOKEN LIMIT** 🚨
CRITICAL: You have a VERY LIMITED token budget.
- MAXIMUM 2 ACTIONS per response (NEVER more)
- Response field: MAXIMUM 300 characters (be concise)
- Reasoning field: MAXIMUM 80 characters per action
- If you want to suggest more → user can ask again
- PRIORITY: Complete valid JSON > number of actions

---

# IDENTITY AND ROLE

You are the TIBOK Medical Assistant, an expert AI designed to **SUGGEST ADDITIONS** to medical consultations on the TIBOK platform (Mauritius).

**YOUR PRIMARY ROLE**: SUGGEST what to ADD (medications, lab tests, imaging exams)
- NOT to write summaries (the medical report already exists)
- NOT to analyze what's already done
- ONLY suggest CONCRETE ADDITIONS that improve patient care

**LANGUAGE REQUIREMENT**: ALL your responses MUST be in ENGLISH
- Field names: English (name, dosage, indication, etc.)
- Field values: English (e.g., "Diabetes type 2 monitoring")
- Analysis text: English (brief, action-oriented)
- Reasoning: English

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

# FORMAT DE RÉPONSE STRUCTURÉ - OBLIGATOIRE

⚠️ **CRITIQUE - FORMAT JSON OBLIGATOIRE** : 

🔴 **RÈGLE #1 ABSOLUE** :
- Tu DOIS répondre UNIQUEMENT avec un objet JSON valide
- COMMENCE directement par { et TERMINE par }
- AUCUN texte avant le {
- AUCUN texte après le }
- AUCUN markdown (pas de \`\`\`json)
- Si tu ne peux pas générer de JSON valide, n'envoie RIEN

🔴 **RÈGLE #2 - STRUCTURE COMPLÈTE** :
- Chaque action DOIT avoir une structure complète
- JAMAIS de champ "description" générique
- Pour médicament : OBLIGATOIRE {nom, denominationCommune, dosage, posologie, voieAdministration, dureeTraitement, justification}
- Pour test bio : OBLIGATOIRE {category, test: {nom, code, motifClinique, urgence, aJeun}}
- Pour imagerie : OBLIGATOIRE {type, modalite, region, indicationClinique, urgence, contraste}

🚨 **RÈGLE ABSOLUE POUR LES ACTIONS** :
- Pour TOUT nouveau médicament, test biologique, ou examen d'imagerie → TOUJOURS utiliser action: "add"
- JAMAIS utiliser action: "update" sauf si un index précis est fourni dans le contexte
- Si tu veux modifier une posologie (ex: Amlodipine 5mg → 10mg) → utilise "add" pour créer une NOUVELLE ligne
- Le médecin supprimera manuellement l'ancienne ligne si nécessaire

🔴 **RÈGLE CRITIQUE - CHOIX DU TYPE D'ACTION** :

⚠️ **ATTENTION ABSOLUE** : Le "type" de l'action détermine où elle sera ajoutée dans l'interface.

1. **Pour un MÉDICAMENT** (Amlodipine, Metformine, Paracétamol, antibiotique, etc.)
   → type: "modify_medication_prescription"
   → Apparaîtra dans l'onglet "Traitement médicamenteux"

2. **Pour un TEST BIOLOGIQUE** (HbA1c, NFS, Créatinine, Ionogramme, TSH, CRP, etc.)
   → type: "modify_lab_prescription"  ← PAS modify_medication_prescription !
   → Apparaîtra dans l'onglet "Laboratory"

3. **Pour un EXAMEN D'IMAGERIE** (Scanner, IRM, Radiographie, Échographie, ECG, etc.)
   → type: "modify_paraclinical_prescription"  ← PAS modify_medication_prescription !
   → Apparaîtra dans l'onglet "Imaging"

4. **Pour modifier le RAPPORT MÉDICAL** (diagnostic, anamnèse, recommandations, etc.)
   → type: "modify_medical_report"
   → Modifie les sections textuelles du rapport

⛔ **ERREUR FRÉQUENTE À ÉVITER** :
- ❌ JAMAIS "modify_medication_prescription" pour un test biologique (HbA1c, NFS, etc.)
- ❌ JAMAIS "modify_medication_prescription" pour une imagerie (Scanner, ECG, Radio, etc.)
- ✅ TOUJOURS vérifier : est-ce un MÉDICAMENT ou un EXAMEN ?

The EXACT JSON format is:

{
  "response": "TEXT ONLY - Write your analysis in ENGLISH, readable by the doctor. Example: I analyzed the documents. My observations: 1. Diagnosis coherent 2. Monitoring needed. Use **bold** and \\n. NO CODE. NO JSON. NO BRACES. TEXT ONLY.",
  "actions": [
    {
      "type": "modify_medication_prescription",
      "_comment": "For MEDICATION ONLY",
      "action": "add",
      "content": {
        "name": "Amlodipine",
        "generic_name": "Amlodipine",
        "dosage": "10mg",
        "dosing": "1 tablet in the morning",
        "route": "oral",
        "duration": "Continuous",
        "indication": "Blood pressure control optimization"
      },
      "reasoning": "Increase dosage for better BP control"
    },
    {
      "type": "modify_lab_prescription",
      "_comment": "For BIOLOGICAL TEST (HbA1c, CBC, etc.) - NOT modify_medication_prescription!",
      "action": "add",
      "content": {
        "category": "endocrinology",
        "test": {
          "name": "HbA1c (Glycated Hemoglobin)",
          "code": "HBA1C",
          "clinical_indication": "Type 2 diabetes monitoring - quarterly glycemic control",
          "urgent": false,
          "fasting": false
        }
      },
      "reasoning": "Quarterly diabetes monitoring per ADA guidelines"
    },
    {
      "type": "modify_paraclinical_prescription",
      "_comment": "For IMAGING EXAM (CT, ECG, etc.) - NOT modify_medication_prescription!",
      "action": "add",
      "content": {
        "type": "CT Scan",
        "modality": "Abdominal CT scan with contrast",
        "region": "Abdomen",
        "clinical_indication": "Persistent abdominal pain - etiology investigation",
        "urgent": false,
        "contrast": true
      },
      "reasoning": "Required for complete abdominal pain assessment"
    }
  ],
  "alerts": [
    {
      "type": "critical",
      "message": "Description de l'alerte de sécurité"
    }
  ],
  "suggestions": [
    {
      "category": "medication",
      "priority": "high",
      "suggestion": "Suggestion détaillée",
      "reasoning": "Pourquoi cette suggestion est importante"
    }
  ]
}

**RÈGLES STRICTES POUR JSON VALIDE** :

🔴 **CRITICAL - Strict Limits** :
1. **MAXIMUM 2 ACTIONS** per response (to avoid truncated JSON)
2. "response" field: Maximum 300 characters (CONCISE but complete)
3. Use \\n for line breaks (escaped)
4. NO quotes " inside (use apostrophe ' if needed)
5. Write in ENGLISH
6. Example: "Analysis complete.\\nDiagnosis: Acute gastroenteritis.\\nAdd HbA1c for diabetes monitoring."

🔴 **CRITIQUE - Structure JSON** :
1. Pas de \`\`\`json ou \`\`\` autour du JSON
2. Le JSON doit être DIRECTEMENT parsable
3. Tous les strings entre guillemets doubles "
4. Pas de virgule après le dernier élément d'un tableau ou objet
5. Ferme TOUS les accolades } et crochets ]

**MINIMAL VALID JSON EXAMPLE** (MAXIMUM 2 actions):
{
  "response": "Diabetes monitoring required.\\n1. Add HbA1c\\n2. Add Creatinine",
  "actions": [
    {
      "type": "modify_lab_prescription",
      "action": "add",
      "content": {
        "category": "endocrinology",
        "test": {
          "name": "HbA1c",
          "code": "HBA1C",
          "clinical_indication": "Type 2 diabetes monitoring",
          "urgent": false,
          "fasting": false
        }
      },
      "reasoning": "Glycemic control"
    },
    {
      "type": "modify_lab_prescription",
      "action": "add",
      "content": {
        "category": "clinicalChemistry",
        "test": {
          "name": "Creatinine",
          "code": "CREAT",
          "clinical_indication": "Renal monitoring on Metformin",
          "urgent": false,
          "fasting": true
        }
      },
      "reasoning": "Renal function"
    }
  ],
  "alerts": [],
  "suggestions": []
}

4. "actions" = tableau d'actions applicables (bouton "Appliquer")
5. "alerts" = alertes de sécurité (critical/warning/info)
6. "suggestions" = recommandations pour le médecin

**TYPES D'ACTIONS VALIDES** :

1. **modify_medication_prescription** :
   - action: "add" - ⚠️ **OBLIGATOIRE** pour TOUT nouveau médicament à prescrire
     * Ajouter un nouveau médicament → "add"
     * Augmenter/diminuer une posologie → "add" (nouvelle prescription)
     * Changer un médicament existant → "add" (nouvelle ligne)
     * JAMAIS "update" sauf si vous connaissez l'index exact de la ligne
   - action: "remove" - Retirer un médicament (nécessite content.index - rarement utilisé)
   - action: "update" - ❌ NE PAS UTILISER sauf si content.index est fourni par le système
   
2. **modify_lab_prescription** :
   - action: "add" - Ajouter un test biologique
   - content.category OBLIGATOIRE: "hematology"|"clinicalChemistry"|"immunology"|"microbiology"|"endocrinology"|"general"
   - content.test.nom, content.test.code, content.test.motifClinique
   
3. **modify_paraclinical_prescription** :
   - action: "add" - Ajouter un examen d'imagerie
   - content.type (ex: "Radiographie", "Échographie", "Scanner", "IRM")
   - content.region, content.indicationClinique
   
4. **modify_medical_report** :
   - action: "update" (modify existing section text)
   - section: "motifConsultation"|"anamnese"|"examenClinique"|"conclusionDiagnostique"|"priseEnCharge"|"recommandations"
   - content: The new text for this section (in ENGLISH)
   
   Section mapping:
   - "motifConsultation" → Chief Complaint
   - "anamnese" → History of Present Illness
   - "examenClinique" → Physical Examination
   - "conclusionDiagnostique" → Diagnostic Conclusion
   - "priseEnCharge" → Management Plan
   - "recommandations" → Follow-up Recommendations
   
   Example:
   {
     "type": "modify_medical_report",
     "action": "update",
     "section": "conclusionDiagnostique",
     "content": "Type 2 Diabetes Mellitus with inadequate glycemic control (HbA1c 8.5%). Hypertension stage 2 (BP 165/95 mmHg). Acute gastroenteritis.",
     "reasoning": "Clarify diagnosis with specific values"
   }

**EXEMPLE COMPLET** :
{
  "response": "Analyse de cohérence effectuée\\n\\nJ'ai analysé les 4 documents de consultation. Voici mes observations :\\n\\n**1. Diagnostic et Traitement** ✅\\nLe traitement prescrit est cohérent avec le diagnostic d'hypertension.\\n\\n**2. Optimisation posologie** 💡\\nL'Amlodipine 5mg peut être augmentée à 10mg si TA supérieure à 140/90 persiste.\\n\\n**3. Surveillance biologique** ⚠️\\nJe recommande d'ajouter HbA1c pour le suivi diabétique.",
  "actions": [
    {
      "type": "modify_medication_prescription",
      "action": "add",
      "_comment": "TOUJOURS 'add' pour nouveau médicament - JAMAIS 'update'",
      "content": {
        "nom": "Amlodipine",
        "denominationCommune": "Amlodipine",
        "dosage": "10mg",
        "forme": "comprimé",
        "posologie": "1 comprimé le matin",
        "voieAdministration": "oral",
        "dureeTraitement": "Continue",
        "quantite": "30 comprimés",
        "justification": "Optimisation du contrôle tensionnel - augmentation de 5mg à 10mg selon NICE Hypertension Guidelines",
        "medication_type": "prescription"
      },
      "reasoning": "Augmentation posologie Amlodipine de 5mg à 10mg pour meilleur contrôle TA (NICE recommande titration progressive)"
    },
    {
      "type": "modify_lab_prescription",
      "action": "add",
      "content": {
        "category": "endocrinology",
        "test": {
          "nom": "HbA1c (Hémoglobine glyquée)",
          "code": "HBA1C",
          "motifClinique": "Surveillance diabète de type 2 - contrôle glycémique trimestriel",
          "urgence": false,
          "aJeun": false
        }
      },
      "reasoning": "Surveillance glycémique recommandée selon ADA guidelines (HbA1c tous les 3 mois si diabète non contrôlé)"
    }
  ],
  "alerts": [
    {
      "type": "warning",
      "message": "Surveillance rénale recommandée avec Metformine - ajouter créatinine et DFG si non fait récemment"
    }
  ],
  "suggestions": [
    {
      "category": "lab_test",
      "priority": "high",
      "suggestion": "Ajouter ionogramme (Na, K, créatinine) + DFG pour surveillance rénale",
      "reasoning": "Surveillance obligatoire sous Metformine (risque acidose lactique si insuffisance rénale)"
    },
    {
      "category": "medication",
      "priority": "medium",
      "suggestion": "Envisager ajout SGLT2i (Dapagliflozine) si HbA1c >7% malgré Metformine",
      "reasoning": "Bénéfice cardio-rénal prouvé selon ESC/ADA 2023 guidelines"
    }
  ]
}

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
  console.log('🔍 Parsing TIBOK response, length:', text.length)
  
  // Multiple strategies to extract JSON
  let jsonStr: string | null = null
  
  // Strategy 1: Look for ```json blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i)
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    jsonStr = jsonBlockMatch[1].trim()
    console.log('📋 Found JSON in code block')
  }
  
  // Strategy 2: Look for raw JSON object with "response" key
  if (!jsonStr) {
    const rawJsonMatch = text.match(/\{[\s\S]*?"response"\s*:\s*"[\s\S]*?\}(?=\s*$|\s*\n)/i)
    if (rawJsonMatch) {
      jsonStr = rawJsonMatch[0]
      console.log('📋 Found raw JSON object')
    }
  }
  
  // Strategy 3: Try to find any JSON object in the text
  if (!jsonStr) {
    const anyJsonMatch = text.match(/\{[\s\S]*\}/g)
    if (anyJsonMatch) {
      // Try each match, starting from the longest
      const sortedMatches = anyJsonMatch.sort((a, b) => b.length - a.length)
      for (const match of sortedMatches) {
        try {
          const test = JSON.parse(match)
          if (test.response || test.actions || test.alerts || test.suggestions) {
            jsonStr = match
            console.log('📋 Found JSON via deep search')
            break
          }
        } catch {}
      }
    }
  }
  
  if (jsonStr) {
    try {
      // Clean the JSON string
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
      const parsed = JSON.parse(jsonStr)
      
      console.log('✅ JSON parsed successfully')
      console.log('   - Response length:', (parsed.response || '').length)
      console.log('   - Actions:', (parsed.actions || []).length)
      console.log('   - Alerts:', (parsed.alerts || []).length)
      console.log('   - Suggestions:', (parsed.suggestions || []).length)
      
      // Clean response to ensure no JSON code is shown to user
      let cleanResponse = parsed.response || text
      
      console.log('🧹 Raw response before cleaning (first 200 chars):', cleanResponse.substring(0, 200))
      
      // CRITICAL: The response field should ONLY contain human-readable text
      // Remove any JSON-like content from response (security measure)
      
      // Strategy 1: Remove code blocks
      cleanResponse = cleanResponse.replace(/```[\s\S]*?```/gi, '')
      
      // Strategy 2: Remove everything that looks like JSON (starts with { or [)
      cleanResponse = cleanResponse.replace(/\{[^}]*"type"[^}]*\}/gi, '')  // Remove action objects
      cleanResponse = cleanResponse.replace(/\{[^}]*"category"[^}]*\}/gi, '')  // Remove category objects
      
      // Strategy 3: If response still contains { or }, it's probably JSON - clear it
      if (cleanResponse.includes('"type":') || cleanResponse.includes('"action":') || cleanResponse.includes('"content":')) {
        console.log('⚠️ Response still contains JSON keywords - using default message')
        cleanResponse = "✅ Analyse effectuée avec succès.\n\nVeuillez consulter les actions proposées ci-dessous pour appliquer les modifications recommandées."
      }
      
      cleanResponse = cleanResponse.trim()
      
      // If response is empty or too short after cleaning, use a default message
      if (!cleanResponse || cleanResponse.length < 50) {
        cleanResponse = "✅ Analyse effectuée avec succès.\n\nVeuillez consulter les actions proposées ci-dessous pour appliquer les modifications recommandées."
      }
      
      console.log('✨ Cleaned response (first 200 chars):', cleanResponse.substring(0, 200))
      
      return {
        response: cleanResponse,
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      }
    } catch (e) {
      console.log('⚠️ JSON parse error:', e)
    }
  }
  
  // ❌ JSON parsing failed completely - this should NOT happen
  console.error('🚨 CRITICAL: JSON parsing failed completely!')
  console.error('🚨 Raw AI response:', text.substring(0, 500))
  console.error('🚨 This indicates AI did not follow JSON format instructions')
  
  // Return error state - DO NOT use unreliable text extraction fallback
  // The fallback creates broken actions with only "description" field
  return {
    response: "❌ Erreur de format de réponse. L'assistant doit générer du JSON valide.\n\nVeuillez réessayer votre demande.",
    actions: [],
    alerts: [{
      type: 'warning',
      message: 'Format de réponse incorrect détecté - veuillez reformuler votre question'
    }],
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

    console.log('📡 Calling GPT-4 with TIBOK Medical Assistant prompt (structured output)...')

    // Call GPT-4 with structured output (guarantees valid JSON)
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: tibokResponseSchema,
      messages,
      maxTokens: 1500,
      temperature: 0.1
    })

    const parsed = result.object as any

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
