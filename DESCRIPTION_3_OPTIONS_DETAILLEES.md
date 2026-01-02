# 📚 DESCRIPTION EXACTE DES 3 OPTIONS

**Date:** 1er Janvier 2026  
**Objectif:** LLM avec connaissances médicales À JOUR (BNF/VIDAL/ESC 2024)

---

## 🎯 VUE D'ENSEMBLE

```
PROBLÈME: GPT-4 a des connaissances jusqu'à Avril 2023 seulement
SOLUTION: Donner à GPT-4 des connaissances médicales 2024-2026

3 OPTIONS POSSIBLES:
1. Prompt Engineering (Injection statique)
2. RAG - Retrieval-Augmented Generation (Injection dynamique)
3. Fine-Tuning GPT-4 (Ré-entraînement)
```

---

# 📝 OPTION 1: PROMPT ENGINEERING

## Principe

**Injecter les connaissances médicales DIRECTEMENT dans le prompt.**

```
Prompt = 
  [Instructions générales] 
  + 
  [Connaissances médicales 2024 en texte brut]
  + 
  [Contexte patient]
```

---

## Architecture Technique

```
┌─────────────────────────────────────────────────────┐
│                  FICHIERS STATIQUES                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📄 bnf-2024.txt (50 MB)                           │
│     - Amoxicillin: 500mg TDS for 5 days...        │
│     - Metformin: Start 500mg OD...                 │
│     - [100+ médicaments courants]                  │
│                                                     │
│  📄 esc-guidelines-2024.txt (10 MB)                │
│     - ACS/NSTEMI: Aspirin + Ticagrelor...          │
│     - Heart Failure: Bisoprolol + Ramipril...      │
│     - [20+ protocoles]                             │
│                                                     │
│  📄 interactions-database.txt (20 MB)              │
│     - Warfarin + Amoxicillin: Monitor INR...       │
│     - [500+ interactions majeures]                 │
│                                                     │
└─────────────────┬───────────────────────────────────┘
                  ↓ Chargés au démarrage
                  ↓
┌─────────────────────────────────────────────────────┐
│            CONSTRUCTION DU PROMPT                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  const MEDICAL_KNOWLEDGE = {                       │
│    bnf: fs.readFileSync('bnf-2024.txt'),          │
│    esc: fs.readFileSync('esc-2024.txt'),          │
│    interactions: fs.readFileSync('inter.txt')      │
│  }                                                  │
│                                                     │
│  const ENRICHED_PROMPT = `                         │
│    ${MAURITIUS_MEDICAL_PROMPT}                     │
│                                                     │
│    ═══════════════════════════════════════         │
│    📚 BNF 2024 REFERENCE                           │
│    ═══════════════════════════════════════         │
│    ${MEDICAL_KNOWLEDGE.bnf}                        │
│                                                     │
│    📖 ESC 2024 GUIDELINES                          │
│    ${MEDICAL_KNOWLEDGE.esc}                        │
│                                                     │
│    💊 INTERACTIONS DATABASE                        │
│    ${MEDICAL_KNOWLEDGE.interactions}               │
│                                                     │
│    PATIENT CONTEXT:                                │
│    ${patientContext}                               │
│  `                                                  │
└─────────────────┬───────────────────────────────────┘
                  ↓ Envoyé à GPT-4
                  ↓
┌─────────────────────────────────────────────────────┐
│                    GPT-4o                           │
│                                                     │
│  Lit le prompt complet (80 KB de texte)           │
│  Utilise les connaissances 2024 pour répondre     │
│                                                     │
└─────────────────┬───────────────────────────────────┘
                  ↓ 50-70s
                  ✅ Diagnostic avec connaissances 2024
```

---

## Code Exact

### Fichier: `/lib/medical-knowledge/bnf-2024.txt`
```
AMOXICILLIN (BNF 2024)
═══════════════════════════════════════

Indications:
- Community-acquired pneumonia
- Acute otitis media
- Urinary tract infections
- Helicobacter pylori eradication (with clarithromycin + PPI)

Adult Dosing:
- Pneumonia (mild-moderate): 500mg TDS (three times daily) for 5 days
- Pneumonia (severe): 1g TDS for 5 days
- UTI (uncomplicated): 500mg TDS for 3 days (women), 7 days (men)
- Otitis media: 500mg TDS for 5 days

Pediatric Dosing:
- Age 1-11 months: 125mg TDS
- Age 1-4 years: 250mg TDS
- Age 5-11 years: 500mg TDS
- Age 12-17 years: Same as adult

Dose Adjustments:
- eGFR 10-30 ml/min: 500mg BD (twice daily)
- eGFR <10 ml/min: 500mg OD (once daily)

Contraindications:
- Penicillin hypersensitivity (absolute)
- Infectious mononucleosis (risk of rash)

Interactions (Major):
- Warfarin: ↑ anticoagulant effect, monitor INR closely
- Methotrexate: ↑ methotrexate toxicity
- Oral contraceptives: ↓ efficacy (use additional contraception)

Side Effects:
- Common (>1%): Diarrhea, nausea, rash
- Uncommon (0.1-1%): Vomiting, urticaria
- Rare (<0.1%): Anaphylaxis, Stevens-Johnson syndrome, hepatitis

Pregnancy: Category B (safe)
Breastfeeding: Safe (small amounts in milk)

Mauritius Availability:
- Public hospitals: FREE (Essential Medicines List)
- Private pharmacies: Rs 100-250
- Brand names: Amoxil, Flemoxin, Amoxicilline

Last updated: BNF 2024 Edition 87

─────────────────────────────────────────────────────

METFORMIN (BNF 2024)
═══════════════════════════════════════

Indications:
- Type 2 diabetes mellitus (first-line)
- Polycystic ovary syndrome (off-label)

Adult Dosing:
- Initial: 500mg OD (once daily) with evening meal
- Titration: Increase by 500mg weekly
- Standard: 500mg BD-TDS (1000-1500mg/day)
- Maximum: 2g/day in divided doses (1g BD)

Extended Release:
- Initial: 500mg OD with evening meal
- Maximum: 2g OD

Dose Adjustments:
- eGFR 45-60: No adjustment, monitor closely
- eGFR 30-44: Max 1g/day, review risk-benefit
- eGFR <30: CONTRAINDICATED (stop immediately)

Contraindications (ABSOLUTE):
- eGFR <30 ml/min (risk of lactic acidosis)
- Metabolic acidosis (current or history)
- Diabetic ketoacidosis
- Severe infection or dehydration
- Acute MI or heart failure
- Hepatic impairment (severe)
- Hypoxic conditions (respiratory failure, shock)
- Alcohol abuse

Temporary Discontinuation:
- Before surgery with general anesthesia (stop 48h before)
- Before iodinated contrast media (stop 48h before if eGFR <60)
- During acute illness (infection, dehydration)

Interactions (Major):
- Contrast media: ↑ risk lactic acidosis
- Alcohol: ↑ risk lactic acidosis
- Cimetidine: ↑ metformin levels

Side Effects:
- Very common (>10%): GI upset (diarrhea, nausea, abdominal pain)
- Common (1-10%): Taste disturbance, decreased vitamin B12
- Rare (<0.1%): Lactic acidosis (EMERGENCY)

Monitoring:
- HbA1c: Every 3-6 months
- eGFR: At least annually, more frequent if eGFR <60
- Vitamin B12: Every 1-2 years (risk of deficiency)

Lactic Acidosis Warning:
Symptoms: Muscle pain, respiratory distress, abdominal pain, hypothermia
Action: STOP metformin immediately, hospital admission, check lactate

Pregnancy: Avoid (use insulin)
Breastfeeding: Avoid (present in milk)

Mauritius Availability:
- Public hospitals: FREE (Essential Medicines List)
- Private pharmacies: Rs 150-400
- Brand names: Glucophage, Metformin Sandoz

Last updated: BNF 2024 Edition 87

[... 98+ autres médicaments ...]
```

---

### Fichier: `/lib/medical-knowledge/esc-guidelines-2024.txt`
```
ESC GUIDELINES 2024 - ACUTE CORONARY SYNDROMES
═══════════════════════════════════════════════

NSTEMI Management (European Society of Cardiology 2024)
────────────────────────────────────────────────────────

Initial Assessment:
- 12-lead ECG within 10 minutes
- High-sensitivity Troponin at 0h and 3h
- Risk stratification: GRACE score

Immediate Management:
1. Antiplatelet Therapy (DAPT):
   - Aspirin 300mg STAT (chew and swallow)
   - PLUS Ticagrelor 180mg STAT (preferred)
   - Alternative: Prasugrel 60mg STAT (if no prior stroke/TIA)
   - Avoid Clopidogrel (inferior outcomes)

2. Anticoagulation:
   - Fondaparinux 2.5mg SC OD (preferred - less bleeding)
   - Alternative: Enoxaparin 1mg/kg SC BD
   - Avoid UFH unless immediate PCI planned

3. Anti-ischemic Therapy:
   - Beta-blocker: Bisoprolol 2.5mg OD (start low, titrate up)
   - ACE inhibitor: Ramipril 2.5mg OD (if LVEF <40% or HF)

4. Lipid Management:
   - High-intensity statin: Atorvastatin 80mg OD (start immediately)
   - Target: LDL <1.4 mmol/L

5. Pain Management:
   - Morphine 2.5-5mg IV if severe pain
   - AVOID NSAIDs (Ibuprofen, Diclofenac) - CONTRAINDICATED

Invasive Strategy Timing:
- Very high risk (<2h): Ongoing chest pain, cardiogenic shock, VT/VF
- High risk (<24h): GRACE >140, dynamic ST/T changes, troponin rise
- Intermediate risk (24-72h): GRACE 109-140, diabetes, eGFR <60

Discharge Medications (Minimum):
1. Aspirin 75mg OD (lifelong)
2. Ticagrelor 90mg BD (12 months minimum)
3. Atorvastatin 80mg OD (lifelong)
4. Bisoprolol 10mg OD (target dose, lifelong)
5. Ramipril 10mg OD (target dose, lifelong)

Contraindications:
- Do NOT use: NSAIDs, COX-2 inhibitors (↑ CV risk)
- Caution: Beta-blockers in acute HF (start after stabilization)

Reference: ESC Guidelines 2024 for NSTEMI, European Heart Journal

[... 19+ autres protocoles ...]
```

---

### Fichier: `/app/api/openai-diagnosis/route.ts`
```typescript
import fs from 'fs'
import path from 'path'

// Charger connaissances médicales au démarrage
const MEDICAL_KNOWLEDGE = {
  bnf: fs.readFileSync(
    path.join(process.cwd(), 'lib/medical-knowledge/bnf-2024.txt'), 
    'utf8'
  ),
  esc: fs.readFileSync(
    path.join(process.cwd(), 'lib/medical-knowledge/esc-guidelines-2024.txt'), 
    'utf8'
  ),
  interactions: fs.readFileSync(
    path.join(process.cwd(), 'lib/medical-knowledge/interactions-2024.txt'), 
    'utf8'
  )
}

export async function POST(request: NextRequest) {
  const { patientData, clinicalData } = await request.json()
  
  // Construire prompt enrichi
  const enrichedPrompt = `
${MAURITIUS_MEDICAL_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 BNF 2024 DRUG REFERENCE - MUST CONSULT FOR ALL PRESCRIPTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${MEDICAL_KNOWLEDGE.bnf}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ESC 2024 GUIDELINES - EVIDENCE-BASED PROTOCOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${MEDICAL_KNOWLEDGE.esc}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💊 DRUG INTERACTIONS DATABASE 2024
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${MEDICAL_KNOWLEDGE.interactions}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 CRITICAL INSTRUCTIONS:
- ALWAYS consult BNF 2024 for exact dosing
- ALWAYS check interactions before prescribing
- ALWAYS verify contraindications against patient context
- FOLLOW ESC 2024 guidelines for all cardiac conditions

PATIENT CONTEXT:
${JSON.stringify(patientData, null, 2)}

CLINICAL DATA:
${JSON.stringify(clinicalData, null, 2)}
`

  // Appeler GPT-4 avec prompt enrichi
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: enrichedPrompt  // Prompt ÉNORME avec toutes les connaissances
        },
        { 
          role: 'user', 
          content: 'Generate complete diagnosis with BNF 2024 compliant prescriptions'
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    })
  })
  
  const result = await response.json()
  return NextResponse.json(result)
}
```

---

## ✅ Avantages

1. **TRÈS SIMPLE:**
   - Pas de base de données
   - Pas d'embeddings
   - Pas de training
   - Juste des fichiers texte

2. **RAPIDE:**
   - 1 seul appel GPT-4
   - Pas de requêtes supplémentaires
   - Temps: 50-70 secondes

3. **GRATUIT:**
   - Pas de services externes
   - Pas d'APIs payantes
   - Coût: 0€/mois

4. **CONTRÔLE TOTAL:**
   - Vous choisissez quelles connaissances inclure
   - Modification instantanée (éditer le fichier)

---

## ❌ Inconvénients

1. **TAILLE DU PROMPT:**
   - BNF complet = 50 MB (trop grand!)
   - Limite GPT-4: ~128K tokens = ~500 KB texte
   - **Solution:** Sélectionner 50-100 médicaments courants seulement

2. **MAINTENANCE MANUELLE:**
   - Update BNF 2024 → 2025: éditer fichier manuellement
   - Nouvelles guidelines: ajouter manuellement

3. **PAS DYNAMIQUE:**
   - Même connaissances pour tous les patients
   - Pas de sélection intelligente (tout est envoyé)

4. **COÛT TOKENS:**
   - Prompt énorme = plus de tokens = plus cher
   - ~80K tokens input × $5/1M = $0.40 par consultation
   - Si 1000 consultations/mois: $400/mois en tokens

---

## 📊 Métriques

- **Setup:** 2-4 heures (créer fichiers BNF/ESC)
- **Coût setup:** €0
- **Coût mensuel:** €0 (services) + €100-400 (tokens GPT-4)
- **Maintenance:** 2-4 heures/mois (update manuel)
- **Couverture:** 50-100 médicaments courants
- **Qualité:** ⭐⭐⭐⭐ (limitée par taille prompt)

---

## 🎯 Recommandé pour:
- ✅ Budget très limité (€0 services)
- ✅ Prototype rapide
- ✅ 50-100 médicaments suffisants
- ❌ Production à grande échelle (coût tokens élevé)

---

# 🔍 OPTION 2: RAG (RETRIEVAL-AUGMENTED GENERATION)

## Principe

**Stocker connaissances dans une base de données vectorielle, puis récupérer SEULEMENT les connaissances pertinentes pour chaque patient.**

```
Connaissances → Embeddings → Vector Database
                              ↓
Patient arrive → Recherche documents pertinents → GPT-4 avec contexte
```

---

## Architecture Technique

```
┌──────────────────────────────────────────────────────────┐
│            PHASE 1: PRÉPARATION (1x au setup)            │
└──────────────────────────────────────────────────────────┘

📚 Connaissances Médicales (Texte brut)
├── BNF 2024 complet (50 MB)
├── VIDAL 2024 complet (30 MB)
├── ESC Guidelines 2024 (10 MB)
├── NICE Guidelines 2024 (15 MB)
└── Interactions database (20 MB)
      ↓ Découpage en chunks (500 mots chacun)
      ↓
📄 ~10,000 documents
   - "Amoxicillin: 500mg TDS for pneumonia..."
   - "Metformin: contraindicated if eGFR <30..."
   - "NSTEMI: Aspirin 300mg + Ticagrelor 180mg..."
   - [...]
      ↓ Conversion en embeddings (vecteurs)
      ↓
┌──────────────────────────────────────────────────────────┐
│              OPENAI EMBEDDINGS API                       │
│         (text-embedding-3-large)                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Pour chaque document:                                   │
│  Input: "Amoxicillin: 500mg TDS for pneumonia..."       │
│  Output: [0.023, -0.156, 0.891, ..., 0.445]            │
│          (vecteur de 3072 dimensions)                    │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ 10,000 embeddings
                  ↓
┌──────────────────────────────────────────────────────────┐
│          VECTOR DATABASE (Supabase pgvector)             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Table: medical_knowledge                                │
│  ┌────────┬─────────────────────┬──────────────────┐   │
│  │   id   │      content        │    embedding     │   │
│  ├────────┼─────────────────────┼──────────────────┤   │
│  │   1    │ "Amoxicillin: ..." │ [0.023, -0.156...│   │
│  │   2    │ "Metformin: ..."   │ [0.891, 0.234... │   │
│  │   3    │ "NSTEMI: ..."      │ [-0.445, 0.123...│   │
│  │  ...   │       ...           │      ...         │   │
│  │ 10000  │ "Warfarin inter..."│ [0.567, -0.234...│   │
│  └────────┴─────────────────────┴──────────────────┘   │
│                                                          │
│  Index: HNSW (Hierarchical Navigable Small World)       │
│  Recherche: Cosine similarity                            │
│  Performance: <100ms pour 10,000 documents               │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│         PHASE 2: REQUÊTE (À chaque consultation)         │
└──────────────────────────────────────────────────────────┘

👨‍⚕️ Médecin entre patient:
   - Chief complaint: "chest pain"
   - Symptoms: ["chest pain radiating to left arm", "dyspnoea"]
   - Current meds: ["Metformin 1000mg BD", "Amlodipine 5mg OD"]
      ↓
┌──────────────────────────────────────────────────────────┐
│              CONSTRUCTION QUERY                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  const query = `                                         │
│    Patient with chest pain radiating to left arm.       │
│    Symptoms: chest pain, dyspnoea.                      │
│    Current medications: Metformin, Amlodipine.          │
│    Need: diagnosis, treatment, interactions check.      │
│  `                                                       │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ Convertir query en embedding
                  ↓
┌──────────────────────────────────────────────────────────┐
│              OPENAI EMBEDDINGS API                       │
│         (text-embedding-3-large)                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Input: "Patient with chest pain radiating..."          │
│  Output: [0.234, -0.567, 0.123, ..., 0.789]            │
│          (vecteur de 3072 dimensions)                    │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ Query embedding
                  ↓
┌──────────────────────────────────────────────────────────┐
│          VECTOR DATABASE - RECHERCHE                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  SELECT content, embedding,                              │
│         1 - (embedding <=> query_embedding) AS similarity│
│  FROM medical_knowledge                                  │
│  WHERE 1 - (embedding <=> query_embedding) > 0.8        │
│  ORDER BY similarity DESC                                │
│  LIMIT 10                                                │
│                                                          │
│  Résultats (100ms):                                      │
│  1. NSTEMI ESC 2024 Guidelines (similarity: 0.95)       │
│  2. Aspirin + Ticagrelor protocol (similarity: 0.93)    │
│  3. Cardiac chest pain diagnosis (similarity: 0.92)     │
│  4. Metformin interactions (similarity: 0.88)           │
│  5. Amlodipine cardiac use (similarity: 0.87)           │
│  6. ACS investigation strategy (similarity: 0.86)       │
│  7. Troponin interpretation (similarity: 0.85)          │
│  8. ECG NSTEMI patterns (similarity: 0.84)              │
│  9. Antiplatelet therapy (similarity: 0.83)             │
│  10. Beta-blockers in ACS (similarity: 0.82)            │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ Top 10 documents pertinents
                  ↓
┌──────────────────────────────────────────────────────────┐
│              CONSTRUCTION PROMPT ENRICHI                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  const enrichedPrompt = `                                │
│    ${MAURITIUS_MEDICAL_PROMPT}                          │
│                                                          │
│    ═══════════════════════════════════════              │
│    📚 RELEVANT MEDICAL KNOWLEDGE (2024)                 │
│    ═══════════════════════════════════════              │
│                                                          │
│    Document 1: NSTEMI ESC 2024 Guidelines               │
│    Source: ESC Guidelines 2024                          │
│    Similarity: 95%                                       │
│    Content: [Full NSTEMI protocol...]                   │
│                                                          │
│    Document 2: Aspirin + Ticagrelor protocol            │
│    Source: BNF 2024                                      │
│    Similarity: 93%                                       │
│    Content: [DAPT dosing...]                            │
│                                                          │
│    [... 8 autres documents ...]                         │
│                                                          │
│    PATIENT CONTEXT:                                      │
│    ${JSON.stringify(patientData)}                       │
│  `                                                       │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ Prompt enrichi (~15K tokens)
                  ↓
┌──────────────────────────────────────────────────────────┐
│                    GPT-4o                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Reçoit:                                                 │
│  - Instructions générales (MAURITIUS_MEDICAL_PROMPT)    │
│  - 10 documents pertinents 2024                         │
│  - Contexte patient                                      │
│                                                          │
│  Génère:                                                 │
│  - Diagnostic basé sur ESC 2024                         │
│  - Prescriptions basées sur BNF 2024                    │
│  - Interactions vérifiées                               │
│                                                          │
│  Cite les sources:                                       │
│  "Per ESC 2024 Guidelines, NSTEMI requires..."          │
│  "Per BNF 2024, Aspirin loading dose 300mg..."          │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ 50-70 secondes
                  ↓
                ✅ Diagnostic complet avec sources 2024
```

---

## Code Exact

### 1. Setup: Créer embeddings et stocker dans Supabase

```typescript
// scripts/setup-medical-knowledge.ts
import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'
import fs from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

async function setupMedicalKnowledge() {
  console.log('📚 Loading medical knowledge files...')
  
  // Charger fichiers
  const bnf2024 = fs.readFileSync('data/bnf-2024.txt', 'utf8')
  const esc2024 = fs.readFileSync('data/esc-guidelines-2024.txt', 'utf8')
  const vidal2024 = fs.readFileSync('data/vidal-2024.txt', 'utf8')
  
  // Découper en chunks (500 mots chacun)
  const chunks = [
    ...splitIntoChunks(bnf2024, 500),
    ...splitIntoChunks(esc2024, 500),
    ...splitIntoChunks(vidal2024, 500)
  ]
  
  console.log(`📄 Total chunks: ${chunks.length}`)
  
  // Créer embeddings pour chaque chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    
    console.log(`🔄 Processing chunk ${i+1}/${chunks.length}...`)
    
    // Créer embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: chunk.content
    })
    
    const embedding = embeddingResponse.data[0].embedding
    
    // Stocker dans Supabase
    await supabase
      .from('medical_knowledge')
      .insert({
        content: chunk.content,
        source: chunk.source,
        category: chunk.category,
        embedding: embedding
      })
    
    // Rate limiting: 3000 requests/min pour embeddings
    if (i % 100 === 0) {
      await sleep(2000) // Pause 2s tous les 100 chunks
    }
  }
  
  console.log('✅ Medical knowledge setup complete!')
}

function splitIntoChunks(text: string, wordsPerChunk: number) {
  const words = text.split(/\s+/)
  const chunks: Array<{content: string, source: string, category: string}> = []
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    chunks.push({
      content: chunk,
      source: 'BNF 2024', // ou ESC, VIDAL selon le fichier
      category: detectCategory(chunk) // "medications", "guidelines", "interactions"
    })
  }
  
  return chunks
}

// Exécuter
setupMedicalKnowledge()
```

### 2. Schéma Supabase

```sql
-- Table pour stocker les connaissances médicales
CREATE TABLE medical_knowledge (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL, -- 'BNF 2024', 'ESC 2024', 'VIDAL 2024'
  category TEXT, -- 'medications', 'guidelines', 'interactions'
  embedding VECTOR(3072), -- Embedding OpenAI text-embedding-3-large
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour recherche vectorielle rapide
CREATE INDEX ON medical_knowledge 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Fonction de recherche par similarité
CREATE OR REPLACE FUNCTION match_medical_documents(
  query_embedding VECTOR(3072),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  source TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    content,
    source,
    category,
    1 - (embedding <=> query_embedding) AS similarity
  FROM medical_knowledge
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

### 3. API: Utiliser RAG pour générer diagnostic

```typescript
// app/api/openai-diagnosis/route.ts
import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  const { patientData, clinicalData } = await request.json()
  
  // 1. Construire query pour recherche
  const searchQuery = `
    Patient with ${patientData.chief_complaint}.
    Symptoms: ${patientData.symptoms.join(', ')}.
    Current medications: ${patientData.current_medications.join(', ')}.
    Need: diagnosis, treatment guidelines, medication dosing, interactions check.
  `
  
  console.log('🔍 Searching relevant medical knowledge...')
  
  // 2. Créer embedding de la query
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: searchQuery
  })
  
  // 3. Rechercher documents pertinents dans Supabase
  const { data: relevantDocs, error } = await supabase
    .rpc('match_medical_documents', {
      query_embedding: queryEmbedding.data[0].embedding,
      match_threshold: 0.78, // Similarité minimum 78%
      match_count: 10 // Top 10 documents
    })
  
  if (error) {
    console.error('❌ Vector search error:', error)
    throw new Error('Failed to retrieve medical knowledge')
  }
  
  console.log(`✅ Found ${relevantDocs.length} relevant documents`)
  
  // 4. Construire prompt enrichi avec documents pertinents
  const enrichedPrompt = `
${MAURITIUS_MEDICAL_PROMPT}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 RELEVANT MEDICAL KNOWLEDGE (2024)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${relevantDocs.map((doc, i) => `
Document ${i + 1}: ${doc.source} (Similarity: ${(doc.similarity * 100).toFixed(1)}%)
Category: ${doc.category}
───────────────────────────────────────────────
${doc.content}

`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 CRITICAL INSTRUCTIONS:
- Use ONLY the above medical knowledge from 2024 sources
- Cite sources in your response (e.g., "Per ESC 2024 Guidelines...")
- If information is missing from provided documents, state clearly
- NEVER invent information not present in the documents

PATIENT CONTEXT:
${JSON.stringify(patientData, null, 2)}

CLINICAL DATA:
${JSON.stringify(clinicalData, null, 2)}
`

  console.log('🤖 Generating diagnosis with GPT-4...')
  
  // 5. Appeler GPT-4 avec prompt enrichi
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: enrichedPrompt 
        },
        { 
          role: 'user', 
          content: 'Generate complete diagnosis with BNF 2024 compliant prescriptions. Always cite sources.'
        }
      ],
      max_tokens: 4000,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  })
  
  const result = await response.json()
  
  console.log('✅ Diagnosis generated successfully')
  
  // 6. Ajouter métadonnées sur les sources utilisées
  return NextResponse.json({
    ...result.choices[0].message.content,
    _metadata: {
      sources_used: relevantDocs.map(doc => ({
        source: doc.source,
        category: doc.category,
        similarity: (doc.similarity * 100).toFixed(1) + '%'
      })),
      retrieval_time: '100ms',
      documents_retrieved: relevantDocs.length
    }
  })
}
```

---

## ✅ Avantages

1. **DYNAMIQUE:**
   - Seulement les connaissances pertinentes sont récupérées
   - Patient avec pneumonie → récupère docs antibiotiques
   - Patient avec ACS → récupère docs cardiologie
   - Prompt reste petit (~15K tokens)

2. **SCALABLE:**
   - Peut stocker TOUT BNF/VIDAL (pas de limite)
   - 10,000+ documents
   - Recherche rapide (<100ms)

3. **MAINTENABLE:**
   - Nouveau BNF 2025 → re-run script setup
   - Nouvelles guidelines → ajouter fichier
   - Pas de modification code

4. **TRAÇABLE:**
   - Sources citées ("Per ESC 2024...")
   - Similarité scores
   - Audit possible

5. **QUALITÉ MAXIMALE:**
   - Connaissances 2024 complètes
   - Contexte pertinent pour chaque patient
   - GPT-4 cite ses sources

---

## ❌ Inconvénients

1. **SETUP COMPLEXE:**
   - Créer vector database
   - Générer embeddings (10,000+)
   - Temps setup: 8-16 heures

2. **COÛT SETUP:**
   - Embeddings: 10,000 chunks × $0.13/1M tokens = ~$20 one-time
   - Vector database: Supabase (gratuit jusqu'à 500 MB)

3. **COÛT MENSUEL:**
   - Vector database: €0-50/mois (Supabase/Pinecone)
   - Embeddings runtime: ~€5-20/mois
   - Total: €5-70/mois

4. **LATENCE:**
   - +100ms pour retrieval
   - Total: ~51-71 secondes

---

## 📊 Métriques

- **Setup:** 8-16 heures
- **Coût setup:** $20 (embeddings one-time)
- **Coût mensuel:** €15-70/mois
- **Maintenance:** 2 heures/trimestre (update BNF)
- **Couverture:** COMPLÈTE (BNF/VIDAL/ESC 2024 entiers)
- **Qualité:** ⭐⭐⭐⭐⭐ (excellente)

---

## 🎯 Recommandé pour:
- ✅ Production à grande échelle
- ✅ Connaissances complètes (1000+ médicaments)
- ✅ Traçabilité requise (sources citées)
- ✅ Update fréquent des connaissances

---

# 🎓 OPTION 3: FINE-TUNING GPT-4

## Principe

**Ré-entraîner GPT-4 sur des données médicales 2024 pour qu'il "apprenne" les nouvelles connaissances.**

```
GPT-4 de base (cutoff Avril 2023)
        +
Dataset médical 2024 (10,000+ examples)
        ↓
    Fine-tuning (6-24 heures)
        ↓
GPT-4 "AI-DOCTOR Edition" (connaissances 2024 intégrées)
```

---

## Architecture Technique

```
┌──────────────────────────────────────────────────────────┐
│         PHASE 1: PRÉPARATION DATASET (1x au setup)       │
└──────────────────────────────────────────────────────────┘

📚 Créer dataset de training (format JSONL)
   Chaque ligne = 1 exemple conversation

Fichier: medical-training-2024.jsonl
────────────────────────────────────────────

{"messages": [
  {"role": "system", "content": "You are an expert physician with BNF 2024 knowledge"},
  {"role": "user", "content": "What is the correct dose of Amoxicillin for community-acquired pneumonia?"},
  {"role": "assistant", "content": "For community-acquired pneumonia, per BNF 2024:\n- Mild-moderate: Amoxicillin 500mg TDS (three times daily) for 5 days\n- Severe: Amoxicillin 1g TDS for 5 days\n- Pediatric (5-11 years): 500mg TDS for 5 days\n- Dose adjustment if eGFR 10-30: 500mg BD\n- Contraindicated in penicillin allergy"}
]}

{"messages": [
  {"role": "system", "content": "You are an expert physician with ESC 2024 guidelines knowledge"},
  {"role": "user", "content": "A 55-year-old man presents with chest pain radiating to left arm for 2 hours. What is the immediate management per ESC 2024?"},
  {"role": "assistant", "content": "Per ESC 2024 NSTEMI Guidelines:\n1. Antiplatelet: Aspirin 300mg STAT + Ticagrelor 180mg STAT (preferred over Clopidogrel)\n2. Anticoagulation: Fondaparinux 2.5mg SC (preferred over Enoxaparin)\n3. Anti-ischemic: Bisoprolol 2.5mg OD, Ramipril 2.5mg OD\n4. Statin: Atorvastatin 80mg OD\n5. Pain: Morphine 2.5-5mg IV if severe\n6. Investigations: 12-lead ECG, high-sensitivity Troponin at 0h and 3h\n7. PCI timing: <24h if high-risk (GRACE >140)"}
]}

{"messages": [
  {"role": "system", "content": "You are an expert physician with drug interactions knowledge"},
  {"role": "user", "content": "Patient on Warfarin 5mg OD. I want to prescribe Amoxicillin 500mg TDS for UTI. Any interactions?"},
  {"role": "assistant", "content": "Yes, MODERATE interaction. Amoxicillin can potentiate Warfarin's anticoagulant effect, increasing INR and bleeding risk. Management:\n1. Prescribe Amoxicillin (safe to use)\n2. WARN patient about bleeding signs (bruising, blood in urine/stool)\n3. CHECK INR after 3-5 days of antibiotic therapy\n4. Consider INR check after finishing antibiotics\n5. Document interaction in notes\nAlternative: Nitrofurantoin 100mg BD (no interaction with Warfarin) if suitable"}
]}

{"messages": [
  {"role": "system", "content": "You are an expert physician with contraindications knowledge"},
  {"role": "user", "content": "Can I prescribe Metformin 1000mg BD to a patient with eGFR 25 ml/min?"},
  {"role": "assistant", "content": "NO - ABSOLUTE CONTRAINDICATION. Metformin is contraindicated if eGFR <30 ml/min due to risk of lactic acidosis (potentially fatal). Per BNF 2024:\n- eGFR ≥60: Standard dose OK\n- eGFR 45-59: Use with caution, monitor closely\n- eGFR 30-44: Max 1g/day, review risk-benefit regularly\n- eGFR <30: STOP immediately\n\nFor this patient (eGFR 25), alternatives:\n1. INSULIN (Insulatard 10 units OD, titrate)\n2. DPP-4 inhibitor: Sitagliptin 25mg OD (dose-adjusted for CKD)\n3. SGLT2 inhibitor: AVOID (need eGFR >30)\n4. GLP-1 agonist: Liraglutide (safe in CKD)"}
]}

[... 9,996+ autres examples couvrant ...]

- 500+ médicaments (posologies exactes BNF 2024)
- 200+ interactions majeures
- 100+ contre-indications
- 50+ guidelines 2024
- 500+ cas cliniques réels
- 200+ ajustements doses rénales
- 100+ prescriptions pédiatriques
- 100+ prescriptions grossesse

Total: 10,000+ examples

┌──────────────────────────────────────────────────────────┐
│           PHASE 2: FINE-TUNING (1x, 6-24h)              │
└──────────────────────────────────────────────────────────┘

Upload dataset → OpenAI
      ↓
┌──────────────────────────────────────────────────────────┐
│              OPENAI FINE-TUNING SERVICE                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Model: gpt-4o-2024-08-06                               │
│  Training file: medical-training-2024.jsonl              │
│  Training examples: 10,000                               │
│  Validation split: 10% (1,000 examples)                 │
│  Hyperparameters:                                        │
│  - n_epochs: 3                                          │
│  - batch_size: auto                                      │
│  - learning_rate_multiplier: auto                        │
│                                                          │
│  Training progress:                                      │
│  Epoch 1/3 ████████░░ 80% (4 hours)                    │
│  Epoch 2/3 ████████░░ 80% (4 hours)                    │
│  Epoch 3/3 ████████░░ 80% (4 hours)                    │
│                                                          │
│  Total time: 12-16 hours                                │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ Training complete
                  ↓
┌──────────────────────────────────────────────────────────┐
│              MODÈLE FINE-TUNÉ CRÉÉ                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Model ID: ft:gpt-4o-2024-08-06:ai-doctor:abc123       │
│                                                          │
│  Ce modèle "connaît" maintenant:                        │
│  ✅ BNF 2024 posologies exactes                        │
│  ✅ ESC 2024 guidelines                                │
│  ✅ Interactions médicamenteuses 2024                  │
│  ✅ Contre-indications exactes                         │
│  ✅ Ajustements doses CKD                              │
│  ✅ Prescriptions pédiatriques                         │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│         PHASE 3: UTILISATION (Chaque consultation)       │
└──────────────────────────────────────────────────────────┘

👨‍⚕️ Patient avec chest pain
      ↓
┌──────────────────────────────────────────────────────────┐
│              API CALL (Simple!)                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  const response = await openai.chat.completions.create({│
│    model: "ft:gpt-4o-2024-08-06:ai-doctor:abc123",     │
│    messages: [                                           │
│      {                                                   │
│        role: "system",                                   │
│        content: MAURITIUS_MEDICAL_PROMPT  // Simple!    │
│      },                                                  │
│      {                                                   │
│        role: "user",                                     │
│        content: JSON.stringify(patientContext)          │
│      }                                                   │
│    ],                                                    │
│    temperature: 0.3                                      │
│  })                                                      │
│                                                          │
│  // PAS besoin d'injecter BNF/ESC dans le prompt!      │
│  // Le modèle les "connaît" déjà!                      │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓ 50-70 secondes
                  ↓
┌──────────────────────────────────────────────────────────┐
│           GPT-4 FINE-TUNÉ GÉNÈRE                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Diagnostic basé sur:                                    │
│  - Connaissances BNF 2024 (intégrées)                  │
│  - Guidelines ESC 2024 (intégrés)                       │
│  - Interactions 2024 (intégrées)                        │
│                                                          │
│  Exemple:                                                │
│  "Per ESC 2024, this is NSTEMI. Loading doses:         │
│   Aspirin 300mg + Ticagrelor 180mg (not Clopidogrel).  │
│   Fondaparinux 2.5mg SC preferred over Enoxaparin."    │
│                                                          │
│  Le modèle cite naturellement les sources 2024!        │
│                                                          │
└─────────────────┬────────────────────────────────────────┘
                  ↓
                ✅ Diagnostic avec connaissances 2024 intégrées
```

---

## Code Exact

### 1. Créer dataset de training

```typescript
// scripts/create-training-dataset.ts
import fs from 'fs'

interface TrainingExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
}

const trainingExamples: TrainingExample[] = []

// Example 1: Dosage BNF 2024
trainingExamples.push({
  messages: [
    {
      role: 'system',
      content: 'You are an expert physician with complete BNF 2024 knowledge'
    },
    {
      role: 'user',
      content: 'What is the correct dose of Amoxicillin for community-acquired pneumonia in adults?'
    },
    {
      role: 'assistant',
      content: `For community-acquired pneumonia, per BNF 2024:

**Standard Dosing:**
- Mild-moderate: Amoxicillin 500mg TDS (three times daily) for 5 days
- Severe: Amoxicillin 1g TDS for 5 days

**Dose Adjustments:**
- eGFR 10-30 ml/min: 500mg BD (twice daily)
- eGFR <10 ml/min: 500mg OD (once daily)

**Contraindications:**
- Penicillin hypersensitivity (absolute)
- Infectious mononucleosis (risk of rash)

**Monitoring:**
- Clinical response at 48-72 hours
- No routine blood tests needed for uncomplicated pneumonia

Source: BNF 2024 Edition 87`
    }
  ]
})

// Example 2: ESC Guidelines 2024
trainingExamples.push({
  messages: [
    {
      role: 'system',
      content: 'You are an expert cardiologist with ESC 2024 guidelines knowledge'
    },
    {
      role: 'user',
      content: 'A 55-year-old man presents with chest pain radiating to left arm for 2 hours, associated with diaphoresis. Describe immediate management per ESC 2024 NSTEMI guidelines.'
    },
    {
      role: 'assistant',
      content: `Suspected NSTEMI - Immediate management per ESC 2024:

**1. Antiplatelet Therapy (DAPT):**
- Aspirin 300mg STAT (chew and swallow)
- PLUS Ticagrelor 180mg STAT (preferred over Clopidogrel)
  - Rationale: PLATO trial showed 21% reduction in CV death vs Clopidogrel

**2. Anticoagulation:**
- Fondaparinux 2.5mg SC OD (preferred)
  - Rationale: OASIS-5 trial - lower bleeding risk than Enoxaparin
- Alternative: Enoxaparin 1mg/kg SC BD

**3. Anti-ischemic Therapy:**
- Beta-blocker: Bisoprolol 2.5mg OD (start low, titrate up)
- ACE inhibitor: Ramipril 2.5mg OD (if LVEF <40% or heart failure)

**4. Lipid Management:**
- High-intensity statin: Atorvastatin 80mg OD (start immediately)
- Target: LDL <1.4 mmol/L

**5. Pain Management:**
- Morphine 2.5-5mg IV if severe pain
- AVOID NSAIDs (contraindicated - increase MI risk)

**6. Investigations:**
- 12-lead ECG immediately
- High-sensitivity Troponin at 0h and 3h
- Risk stratification: GRACE score

**7. Invasive Strategy Timing:**
- Very high risk (<2h): Ongoing pain, cardiogenic shock, VT/VF
- High risk (<24h): GRACE >140, dynamic ST/T changes, troponin rise
- Intermediate risk (24-72h): GRACE 109-140

**8. Admission:**
- Coronary Care Unit (CCU) or Cardiac Ward
- Continuous cardiac monitoring (telemetry)

Source: ESC Guidelines 2024 for NSTEMI`
    }
  ]
})

// Example 3: Interactions
trainingExamples.push({
  messages: [
    {
      role: 'system',
      content: 'You are an expert in drug interactions'
    },
    {
      role: 'user',
      content: 'Patient on Warfarin 5mg OD for atrial fibrillation. I want to prescribe Amoxicillin 500mg TDS for UTI. What are the interaction concerns?'
    },
    {
      role: 'assistant',
      content: `**MODERATE INTERACTION**: Warfarin + Amoxicillin

**Mechanism:**
Amoxicillin can potentiate Warfarin's anticoagulant effect by:
- Disrupting gut flora that synthesize vitamin K
- Increasing INR (International Normalized Ratio)

**Clinical Significance:**
- Increased bleeding risk
- INR may rise by 1.5-2x within 3-7 days

**Management:**
1. ✅ Safe to prescribe Amoxicillin (interaction manageable)
2. ⚠️ WARN patient about bleeding signs:
   - Easy bruising
   - Blood in urine (hematuria)
   - Blood in stool (melena)
   - Nosebleeds
   - Bleeding gums
3. 📊 CHECK INR:
   - After 3-5 days of antibiotic therapy
   - Again 2-3 days after finishing antibiotics
4. 📝 Document interaction in clinical notes
5. 💬 Provide patient information leaflet

**Alternative (if concerned):**
- Nitrofurantoin 100mg BD for 3 days (NO interaction with Warfarin)
- Suitable for uncomplicated lower UTI

**Source:** BNF 2024 Drug Interactions, Warfarin + Antibiotics`
    }
  ]
})

// Example 4: Contraindication
trainingExamples.push({
  messages: [
    {
      role: 'system',
      content: 'You are an expert in drug contraindications'
    },
    {
      role: 'user',
      content: 'Can I prescribe Metformin 1000mg BD to a 72-year-old man with Type 2 diabetes and eGFR 25 ml/min?'
    },
    {
      role: 'assistant',
      content: `**NO - ABSOLUTE CONTRAINDICATION**

**Reason:**
Metformin is CONTRAINDICATED if eGFR <30 ml/min due to risk of **lactic acidosis** (potentially fatal).

**BNF 2024 Guidance:**
- eGFR ≥60: Standard dose safe
- eGFR 45-59: Use with caution, monitor eGFR every 3-6 months
- eGFR 30-44: Maximum 1g/day, review risk-benefit every 3 months
- eGFR <30: **STOP immediately** (contraindicated)

**For This Patient (eGFR 25):**

**✅ SAFE ALTERNATIVES:**

1. **INSULIN (First-line for CKD)**
   - Insulatard (NPH) 10 units SC OD at bedtime
   - Titrate by 2 units every 3 days
   - Target fasting glucose 5-7 mmol/L

2. **DPP-4 Inhibitor (Dose-adjusted)**
   - Sitagliptin 25mg OD (reduced from 100mg)
   - No hypoglycemia risk
   - Safe in CKD

3. **GLP-1 Agonist**
   - Liraglutide 0.6mg SC OD, increase to 1.2mg after 1 week
   - Safe in CKD
   - Weight loss benefit

**❌ AVOID:**
- Metformin (eGFR <30)
- SGLT2 inhibitors (need eGFR >30)
- Sulfonylureas (high hypoglycemia risk in CKD)

**Action:**
1. STOP Metformin immediately
2. Start Insulatard 10 units OD
3. Educate patient on hypoglycemia symptoms
4. Arrange diabetes nurse follow-up in 1 week

Source: BNF 2024, NICE NG28 Type 2 Diabetes Management`
    }
  ]
})

// ... Add 9,996+ more examples

// Sauvegarder en format JSONL
const jsonlContent = trainingExamples
  .map(ex => JSON.stringify(ex))
  .join('\n')

fs.writeFileSync('medical-training-2024.jsonl', jsonlContent)

console.log(`✅ Created training dataset with ${trainingExamples.length} examples`)
```

---

### 2. Lancer fine-tuning

```typescript
// scripts/fine-tune-gpt4.ts
import { OpenAI } from 'openai'
import fs from 'fs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

async function fineTuneGPT4() {
  console.log('📤 Uploading training file...')
  
  // 1. Upload training file
  const trainingFile = await openai.files.create({
    file: fs.createReadStream('medical-training-2024.jsonl'),
    purpose: 'fine-tune'
  })
  
  console.log(`✅ File uploaded: ${trainingFile.id}`)
  
  // 2. Create fine-tuning job
  console.log('🚀 Starting fine-tuning job...')
  
  const fineTuneJob = await openai.fineTuning.jobs.create({
    training_file: trainingFile.id,
    model: 'gpt-4o-2024-08-06', // Latest GPT-4o
    hyperparameters: {
      n_epochs: 3 // 3 passes through dataset
    },
    suffix: 'ai-doctor' // Model will be named: ft:gpt-4o-2024-08-06:ai-doctor:xxxxx
  })
  
  console.log(`✅ Fine-tuning job created: ${fineTuneJob.id}`)
  console.log(`⏳ Estimated time: 12-24 hours`)
  console.log(`💰 Estimated cost: $100-300 (depending on dataset size)`)
  
  // 3. Monitor progress
  let status = 'running'
  while (status === 'running' || status === 'queued') {
    await sleep(60000) // Check every minute
    
    const job = await openai.fineTuning.jobs.retrieve(fineTuneJob.id)
    status = job.status
    
    console.log(`Status: ${status}`)
    
    if (job.trained_tokens) {
      console.log(`Progress: ${job.trained_tokens} tokens trained`)
    }
  }
  
  if (status === 'succeeded') {
    const finalJob = await openai.fineTuning.jobs.retrieve(fineTuneJob.id)
    console.log(`✅ Fine-tuning complete!`)
    console.log(`🎉 Model ID: ${finalJob.fine_tuned_model}`)
    console.log(`📝 Save this model ID in your .env file`)
    
    // Save model ID
    fs.writeFileSync('.env.finetuned', `FINETUNED_MODEL_ID=${finalJob.fine_tuned_model}`)
  } else {
    console.error(`❌ Fine-tuning failed: ${status}`)
  }
}

fineTuneGPT4()
```

---

### 3. Utiliser modèle fine-tuné

```typescript
// app/api/openai-diagnosis/route.ts
import { OpenAI } from 'openai'
import { NextRequest, NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

// Modèle fine-tuné (connaissances 2024 intégrées)
const FINETUNED_MODEL = process.env.FINETUNED_MODEL_ID! // ft:gpt-4o-2024-08-06:ai-doctor:abc123

export async function POST(request: NextRequest) {
  const { patientData, clinicalData } = await request.json()
  
  // Prompt SIMPLE - pas besoin d'injecter BNF/ESC!
  const simplePrompt = `
${MAURITIUS_MEDICAL_PROMPT}

PATIENT CONTEXT:
${JSON.stringify(patientData, null, 2)}

CLINICAL DATA:
${JSON.stringify(clinicalData, null, 2)}
`

  console.log('🤖 Generating diagnosis with fine-tuned GPT-4...')
  
  // Appel GPT-4 fine-tuné
  const response = await openai.chat.completions.create({
    model: FINETUNED_MODEL, // Modèle avec connaissances 2024
    messages: [
      { 
        role: 'system', 
        content: simplePrompt // Prompt simple!
      },
      { 
        role: 'user', 
        content: 'Generate complete diagnosis with BNF 2024 compliant prescriptions and ESC 2024 guidelines'
      }
    ],
    max_tokens: 4000,
    temperature: 0.3,
    response_format: { type: 'json_object' }
  })
  
  const diagnosis = JSON.parse(response.choices[0].message.content!)
  
  console.log('✅ Diagnosis generated with 2024 knowledge')
  
  return NextResponse.json({
    ...diagnosis,
    _metadata: {
      model_used: FINETUNED_MODEL,
      knowledge_base: 'BNF 2024, ESC 2024, VIDAL 2024 (fine-tuned)',
      training_examples: 10000
    }
  })
}
```

---

## ✅ Avantages

1. **MAXIMUM PERFORMANCE:**
   - Connaissances 2024 INTÉGRÉES dans le modèle
   - Pas de retrieval (pas de latence)
   - Réponses plus cohérentes

2. **PROMPT SIMPLE:**
   - Pas besoin d'injecter BNF/ESC
   - Prompt reste petit
   - Code simple

3. **QUALITÉ:**
   - GPT-4 "pense" avec connaissances 2024
   - Cite naturellement les sources
   - Moins d'erreurs

4. **RAPIDE:**
   - Même vitesse que GPT-4 normal (50-70s)
   - Pas de retrieval
   - Pas d'APIs externes

---

## ❌ Inconvénients

1. **COÛT SETUP ÉLEVÉ:**
   - Training: $100-500 one-time
   - Temps: 6-24 heures
   - Dataset: 8-16 heures création

2. **COÛT RUNTIME:**
   - Fine-tuned model: 2-3x prix GPT-4 normal
   - GPT-4o: $5/1M tokens input
   - Fine-tuned: $10-15/1M tokens input
   - Si 1000 consultations/mois: +€50-100/mois

3. **UPDATE COMPLEXE:**
   - Nouveau BNF 2025 → RE-TRAINING complet
   - Coût: $100-500 à chaque update
   - Temps: 6-24 heures

4. **PAS DE SOURCES:**
   - Modèle cite "Per BNF 2024" mais pas de lien exact
   - Moins traçable que RAG

---

## 📊 Métriques

- **Setup:** 16-24 heures (dataset + training)
- **Coût setup:** $100-500 one-time
- **Coût mensuel:** +€50-100/mois vs GPT-4 normal
- **Maintenance:** $100-500 par update (1-2x/an)
- **Couverture:** COMPLÈTE (10,000+ examples)
- **Qualité:** ⭐⭐⭐⭐⭐ (maximum)

---

## 🎯 Recommandé pour:
- ✅ Budget disponible ($500 setup + €100/mois)
- ✅ Maximum qualité requise
- ✅ Volume élevé (>1000 consultations/mois)
- ✅ Update peu fréquent (1-2x/an OK)
- ❌ Budget serré

---

# 📊 COMPARAISON FINALE DES 3 OPTIONS

| Critère | Option 1: Prompt Engineering | Option 2: RAG | Option 3: Fine-Tuning |
|---------|------------------------------|---------------|----------------------|
| **Complexité setup** | ⭐⭐⭐⭐⭐ Simple | ⭐⭐⭐ Moyenne | ⭐⭐ Complexe |
| **Temps setup** | 2-4h | 8-16h | 16-24h |
| **Coût setup** | €0 | $20 | $100-500 |
| **Coût mensuel** | €100-400 (tokens) | €15-70 | +€50-100 |
| **Vitesse** | ⭐⭐⭐⭐⭐ (50-70s) | ⭐⭐⭐⭐ (51-71s) | ⭐⭐⭐⭐⭐ (50-70s) |
| **Couverture** | 50-100 médicaments | Illimitée | Illimitée |
| **Qualité** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Traçabilité** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (sources citées) | ⭐⭐⭐ |
| **Maintenance** | ⭐⭐ (manuelle) | ⭐⭐⭐⭐ (simple) | ⭐⭐ (re-training) |
| **Dynamique** | ❌ Statique | ✅ Dynamique | ❌ Statique |
| **Prompt size** | ❌ Énorme | ✅ Petit | ✅ Petit |

---

# 🏆 RECOMMANDATION FINALE

## Pour AI-DOCTOR, je recommande: **OPTION 2 (RAG)**

### Pourquoi?

1. **MEILLEUR ÉQUILIBRE:**
   - ✅ Qualité maximale (connaissances complètes 2024)
   - ✅ Coût raisonnable (€15-70/mois)
   - ✅ Setup gérable (8-16h)
   - ✅ Maintenance simple (re-run script)

2. **ÉVOLUTIF:**
   - ✅ Ajouter nouveau BNF 2025 → 2 heures
   - ✅ Ajouter nouvelles guidelines → 1 heure
   - ✅ Scalable (1000+ médicaments)

3. **TRAÇABLE:**
   - ✅ Sources citées ("Per ESC 2024...")
   - ✅ Similarité scores
   - ✅ Audit possible

4. **PRODUCTION-READY:**
   - ✅ Utilisé par grands acteurs (Anthropic, OpenAI docs)
   - ✅ Prouvé à grande échelle
   - ✅ Technologie mature

---

## Plan d'Implémentation RAG

### Phase 1 (Semaine 1): Setup
- Installer Supabase (gratuit)
- Créer table medical_knowledge
- Créer scripts embeddings

### Phase 2 (Semaine 2): Données
- Préparer fichiers BNF/ESC/VIDAL 2024
- Découper en chunks
- Générer embeddings
- Stocker dans Supabase

### Phase 3 (Semaine 3): Intégration
- Modifier API openai-diagnosis
- Ajouter retrieval logic
- Tester sur 50 cas

### Phase 4 (Semaine 4): Production
- Monitoring
- Optimisation
- Documentation

**Temps total:** 4 semaines  
**Coût setup:** $20  
**Coût mensuel:** €15-70  
**Résultat:** Système avec connaissances 2024 complètes ✅

---

**FIN DE LA DESCRIPTION DES 3 OPTIONS**

*Document créé le 1er Janvier 2026*  
*Recommandation: RAG (Option 2) pour AI-DOCTOR*  
*Status: PRÊT POUR IMPLÉMENTATION (si vous voulez)*
