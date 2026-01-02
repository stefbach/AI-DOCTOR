# 🔍 RAG EXPLIQUÉ DE FAÇON ULTRA PRATIQUE

**Date**: 2 Janvier 2026  
**Pour**: Comprendre CONCRÈTEMENT ce qu'est le RAG

---

## 🎯 RAG EN UNE PHRASE

**RAG = Google Search + GPT-4 combinés**

Au lieu de mettre TOUTES les connaissances dans le prompt, tu fais une **RECHERCHE INTELLIGENTE** pour trouver seulement les infos pertinentes, puis tu les donnes à GPT-4.

---

## 📚 EXEMPLE CONCRET - Bibliothèque Médicale

### Situation SANS RAG (Prompt Engineering)

Tu as une **bibliothèque médicale géante** avec 10,000 livres :
- BNF 2024 complet
- VIDAL 2024 complet  
- ESC Guidelines 2024
- NICE Guidelines 2024
- Etc.

**Chaque fois qu'un patient arrive**, tu fais quoi?

```
❌ SANS RAG (Prompt Engineering):
Tu photocopies LES 10,000 LIVRES et tu les donnes à GPT-4

"Voilà tous les livres de médecine. 
Maintenant réponds à ma question sur la pneumonie."

Problème:
- Trop lourd (10,000 livres!)
- Trop lent
- Trop cher
- GPT-4 doit chercher dans 10,000 livres à chaque fois
```

### Situation AVEC RAG

```
✅ AVEC RAG:
Patient avec pneumonie arrive

1. TU CHERCHES dans la bibliothèque:
   "Donne-moi les 10 livres qui parlent de pneumonie, 
    antibiotiques, et médicaments du patient"
   
2. La bibliothèque te donne les 10 LIVRES PERTINENTS:
   - Livre sur Amoxicillin
   - Livre sur traitement pneumonie
   - Livre sur interactions médicaments
   - 7 autres livres pertinents
   
3. Tu donnes CES 10 LIVRES à GPT-4 (pas les 10,000!)

"Voilà les 10 livres pertinents pour ce patient.
Maintenant réponds à ma question sur la pneumonie."

Résultat:
✅ Léger (10 livres seulement)
✅ Rapide
✅ Moins cher
✅ GPT-4 trouve rapidement l'info pertinente
```

---

## 🎬 SCÉNARIO PRATIQUE DÉTAILLÉ

### Étape 1: Setup Initial (1 fois au début)

Tu prépares ta "bibliothèque intelligente" :

```typescript
// 1. Tu as BNF 2024 complet en fichier texte
const bnf2024 = `
AMOXICILLIN
-----------
Indications: Pneumonia, UTI, Otitis media
Dosing: 500mg TDS for 5 days
Contraindications: Penicillin allergy
Interactions: Warfarin (monitor INR)
...

METFORMIN
---------
Indications: Type 2 diabetes
Dosing: Start 500mg OD, max 2g/day
Contraindications: eGFR <30
Interactions: Contrast media
...

[... 500+ autres médicaments]
`

// 2. Tu découpes en petits morceaux (chunks)
const chunks = [
  "AMOXICILLIN: 500mg TDS for pneumonia. Contraindicated if penicillin allergy...",
  "METFORMIN: Start 500mg OD. Contraindicated if eGFR <30...",
  "AMOXICILLIN + WARFARIN: Monitor INR closely...",
  // ... 10,000 morceaux
]

// 3. Pour chaque morceau, tu demandes à OpenAI: 
//    "Transforme ce texte en vecteur de nombres"
const embedding1 = await openai.embeddings.create({
  input: "AMOXICILLIN: 500mg TDS for pneumonia..."
})
// Résultat: [0.023, -0.156, 0.891, ..., 0.445] (3072 nombres)

const embedding2 = await openai.embeddings.create({
  input: "METFORMIN: Start 500mg OD..."
})
// Résultat: [0.789, 0.234, -0.567, ..., 0.123] (3072 nombres)

// ... Pour les 10,000 morceaux

// 4. Tu stockes TOUT dans une base de données
await supabase.from('medical_knowledge').insert([
  {
    content: "AMOXICILLIN: 500mg TDS for pneumonia...",
    embedding: [0.023, -0.156, 0.891, ..., 0.445]
  },
  {
    content: "METFORMIN: Start 500mg OD...",
    embedding: [0.789, 0.234, -0.567, ..., 0.123]
  },
  // ... 10,000 rows
])
```

**Base de données après setup** :

```
┌─────────────────────────────────────────────────────────────┐
│        Table: medical_knowledge (10,000 rows)               │
├──────┬──────────────────────────────┬───────────────────────┤
│  id  │         content              │      embedding        │
├──────┼──────────────────────────────┼───────────────────────┤
│   1  │ "AMOXICILLIN: 500mg TDS..." │ [0.023, -0.156, ...]  │
│   2  │ "METFORMIN: Start 500mg..." │ [0.789, 0.234, ...]   │
│   3  │ "NSTEMI ESC 2024: Aspirin" │ [-0.445, 0.123, ...]  │
│  ... │ ...                          │ ...                   │
│10000 │ "Warfarin interactions..."  │ [0.567, -0.234, ...]  │
└──────┴──────────────────────────────┴───────────────────────┘
```

C'est ta **"bibliothèque intelligente"** prête à l'emploi!

---

### Étape 2: Patient Arrive (à chaque consultation)

**Patient**: Homme 55 ans, toux productive, fièvre, dyspnoée

```typescript
// 1. Tu construis une question de recherche
const searchQuery = `
  Patient with cough, fever, dyspnoea.
  Suspected pneumonia.
  Current medications: Metformin 1g BD, Amlodipine 5mg OD.
  Need: antibiotic treatment, drug interactions, dosing.
`

// 2. Tu transformes cette question en vecteur
const queryEmbedding = await openai.embeddings.create({
  input: searchQuery
})
// Résultat: [0.234, -0.567, 0.123, ..., 0.789]

// 3. Tu CHERCHES dans ta base de données:
//    "Trouve-moi les 10 documents dont le vecteur est 
//     le PLUS PROCHE de mon vecteur de question"
const { data: relevantDocs } = await supabase
  .rpc('match_medical_documents', {
    query_embedding: [0.234, -0.567, 0.123, ..., 0.789],
    match_count: 10  // Top 10
  })

// MAGIE! La base de données te retourne:
relevantDocs = [
  {
    content: "AMOXICILLIN: 500mg TDS for pneumonia...",
    similarity: 0.95  // 95% similaire à ta question
  },
  {
    content: "Community-acquired pneumonia: First-line Amoxicillin...",
    similarity: 0.93  // 93% similaire
  },
  {
    content: "AMOXICILLIN + METFORMIN: No significant interaction...",
    similarity: 0.88  // 88% similaire
  },
  {
    content: "Respiratory tract infections: Antibiotics...",
    similarity: 0.87
  },
  // ... 6 autres documents pertinents
]
```

**Comment ça marche?**

La base de données compare ton vecteur question `[0.234, -0.567, ...]` avec les 10,000 vecteurs stockés et trouve les 10 PLUS PROCHES.

C'est comme si tu demandais:
> "Hé Google, trouve-moi les 10 pages qui ressemblent le plus à ma question!"

---

### Étape 3: Construire le Prompt pour GPT-4

```typescript
// 4. Tu construis un prompt ENRICHI avec les 10 docs trouvés
const enrichedPrompt = `
Vous êtes un médecin expert.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 CONNAISSANCES MÉDICALES PERTINENTES (BNF 2024)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Document 1 (95% pertinent):
${relevantDocs[0].content}

Document 2 (93% pertinent):
${relevantDocs[1].content}

Document 3 (88% pertinent):
${relevantDocs[2].content}

[... 7 autres documents]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATIENT:
- Age: 55 ans
- Symptoms: Toux productive, fièvre, dyspnoée
- Current medications: Metformin 1g BD, Amlodipine 5mg OD

Générer diagnostic complet basé sur les connaissances BNF 2024 ci-dessus.
`

// 5. Tu envoies à GPT-4
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: enrichedPrompt },
    { role: 'user', content: 'Generate diagnosis' }
  ]
})
```

---

### Étape 4: GPT-4 Génère le Diagnostic

GPT-4 lit les 10 documents pertinents et génère :

```json
{
  "diagnosis": "Community-Acquired Pneumonia (CAP)",
  "medications": [
    {
      "drug": "Amoxicillin 500mg TDS",
      "duration": "5 days",
      "source": "Per BNF 2024, first-line for CAP",
      "justification": "Mild-moderate pneumonia"
    }
  ],
  "interactions": "No significant interaction between Amoxicillin and Metformin or Amlodipine",
  "investigations": [
    {
      "test": "Chest X-ray",
      "timing": "Within 24-48 hours"
    }
  ],
  "_sources_used": [
    "BNF 2024 - Amoxicillin (95% similarity)",
    "BNF 2024 - Pneumonia Treatment (93%)",
    "BNF 2024 - Drug Interactions (88%)"
  ]
}
```

---

## 🔑 MAGIE DU RAG : LES VECTEURS

### Qu'est-ce qu'un Vecteur?

Un vecteur = Une liste de nombres qui représente le **SENS** d'un texte.

**Exemple**:
```
Texte: "Amoxicillin for pneumonia"
Vecteur: [0.023, -0.156, 0.891, ..., 0.445] (3072 nombres)

Texte: "Antibiotic for lung infection"
Vecteur: [0.028, -0.152, 0.887, ..., 0.441] (3072 nombres)
                   ↑ TRÈS PROCHES!

Texte: "Metformin for diabetes"
Vecteur: [0.789, 0.234, -0.567, ..., 0.123] (3072 nombres)
                   ↑ TRÈS DIFFÉRENTS!
```

Les vecteurs de **"Amoxicillin for pneumonia"** et **"Antibiotic for lung infection"** sont PROCHES car ils ont le même SENS, même si les mots sont différents!

### Comment OpenAI Crée les Vecteurs?

OpenAI a un modèle spécialisé appelé **`text-embedding-3-large`** qui lit du texte et le transforme en vecteur.

```typescript
const result = await openai.embeddings.create({
  model: 'text-embedding-3-large',
  input: "Amoxicillin 500mg TDS for pneumonia"
})

console.log(result.data[0].embedding)
// → [0.023, -0.156, 0.891, ..., 0.445] (3072 nombres)
```

Ce modèle a été entraîné sur des MILLIARDS de textes pour comprendre le sens des mots.

---

## 🎮 ANALOGIE JEUX VIDÉO

Imagine un jeu vidéo où chaque personnage a des **coordonnées 3D** (x, y, z) :

```
Guerrier:    (10, 20, 5)
Chevalier:   (12, 22, 6)  ← PROCHE du guerrier
Mage:        (80, 15, 90) ← LOIN du guerrier
```

Si tu cherches "des personnages proches du guerrier", tu trouves le Chevalier (coordonnées proches).

**RAG c'est pareil, mais avec 3072 dimensions au lieu de 3!**

```
"Amoxicillin":         [0.023, -0.156, ..., 0.445] (3072 nombres)
"Antibiotic":          [0.028, -0.152, ..., 0.441] ← PROCHE
"Insulin for diabetes": [0.789, 0.234, ..., 0.123] ← LOIN
```

Recherche = Trouver les vecteurs les PLUS PROCHES dans l'espace à 3072 dimensions.

---

## 💻 CODE COMPLET PRATIQUE

### Setup (1 fois)

```typescript
// setup-rag.ts
import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'
import fs from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function setupRAG() {
  console.log('📚 Loading BNF 2024...')
  const bnf2024 = fs.readFileSync('data/bnf-2024.txt', 'utf8')
  
  console.log('✂️ Splitting into chunks...')
  const chunks = splitIntoChunks(bnf2024, 500) // 500 mots par chunk
  // Résultat: ~10,000 chunks
  
  console.log(`📄 Total chunks: ${chunks.length}`)
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`🔄 Processing chunk ${i+1}/${chunks.length}...`)
    
    // Créer embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: chunks[i]
    })
    
    const embedding = embeddingResponse.data[0].embedding
    
    // Stocker dans Supabase
    await supabase
      .from('medical_knowledge')
      .insert({
        content: chunks[i],
        source: 'BNF 2024',
        embedding: embedding
      })
    
    // Rate limiting
    if (i % 100 === 0) {
      await sleep(2000) // Pause 2s tous les 100 chunks
    }
  }
  
  console.log('✅ RAG setup complete!')
}

function splitIntoChunks(text: string, wordsPerChunk: number) {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ')
    chunks.push(chunk)
  }
  
  return chunks
}

setupRAG()
```

**Exécution**:
```bash
$ ts-node setup-rag.ts

📚 Loading BNF 2024...
✂️ Splitting into chunks...
📄 Total chunks: 10,000
🔄 Processing chunk 1/10,000...
🔄 Processing chunk 2/10,000...
...
✅ RAG setup complete!

Time: 2-4 hours
Cost: ~$20 (embeddings)
```

---

### Utilisation (à chaque patient)

```typescript
// app/api/openai-diagnosis/route.ts
import { createClient } from '@supabase/supabase-js'
import { OpenAI } from 'openai'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  const { patientData } = await request.json()
  
  // 1. Construire query de recherche
  const searchQuery = `
    Patient with ${patientData.symptoms.join(', ')}.
    Current medications: ${patientData.current_medications.join(', ')}.
    Need: diagnosis, treatment, interactions.
  `
  
  console.log('🔍 Searching relevant knowledge...')
  
  // 2. Créer embedding de la query
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: searchQuery
  })
  
  // 3. Rechercher documents pertinents
  const { data: relevantDocs } = await supabase
    .rpc('match_medical_documents', {
      query_embedding: queryEmbedding.data[0].embedding,
      match_threshold: 0.78,  // Similarité min 78%
      match_count: 10         // Top 10
    })
  
  console.log(`✅ Found ${relevantDocs.length} relevant documents`)
  
  // 4. Construire prompt enrichi
  const enrichedPrompt = `
You are an expert physician.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 RELEVANT MEDICAL KNOWLEDGE (BNF 2024)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${relevantDocs.map((doc, i) => `
Document ${i + 1} (${(doc.similarity * 100).toFixed(1)}% relevant):
${doc.content}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATIENT:
${JSON.stringify(patientData, null, 2)}

Generate complete diagnosis based on BNF 2024 knowledge above.
`
  
  // 5. Appeler GPT-4
  console.log('🤖 Generating diagnosis...')
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: enrichedPrompt },
      { role: 'user', content: 'Generate diagnosis' }
    ],
    max_tokens: 4000,
    temperature: 0.3
  })
  
  const diagnosis = JSON.parse(response.choices[0].message.content)
  
  // 6. Ajouter métadonnées
  return Response.json({
    ...diagnosis,
    _metadata: {
      sources_used: relevantDocs.map(doc => ({
        source: doc.source,
        similarity: (doc.similarity * 100).toFixed(1) + '%'
      })),
      documents_retrieved: relevantDocs.length
    }
  })
}
```

**Logs d'exécution**:
```
🔍 Searching relevant knowledge...
✅ Found 10 relevant documents
🤖 Generating diagnosis...
✅ Diagnosis generated

Time: 51-71s (50-70s GPT-4 + 100ms retrieval)
```

---

## 📊 COMPARAISON PRATIQUE

### Scénario: Patient avec Pneumonie

#### Sans RAG (Prompt Engineering)

```typescript
const prompt = `
${ENTIRE_BNF_2024}  // 500 KB de texte!
${ENTIRE_ESC_2024}  // 100 KB de texte!
${ENTIRE_VIDAL_2024} // 300 KB de texte!
// Total: 900 KB dans le prompt

Patient with pneumonia...
`

// Problème:
// - Prompt trop grand (limite GPT-4 = 128K tokens ≈ 500 KB)
// - Coût: 80K tokens × $5/1M = $0.40 par patient
// - GPT-4 doit chercher dans 900 KB à chaque fois
```

#### Avec RAG

```typescript
// 1. Recherche (100ms)
const relevantDocs = await searchVectorDB(
  "patient with pneumonia, need antibiotics"
)
// Trouve: 10 documents pertinents (15 KB)

// 2. Prompt
const prompt = `
${relevantDocs[0]}  // Amoxicillin info
${relevantDocs[1]}  // Pneumonia treatment
${relevantDocs[2]}  // Drug interactions
... 7 autres docs pertinents
// Total: 15 KB dans le prompt (vs 900 KB!)

Patient with pneumonia...
`

// Avantages:
// ✅ Prompt petit (15 KB < 500 KB limite)
// ✅ Coût: 5K tokens × $5/1M = $0.025 par patient (16× moins cher!)
// ✅ GPT-4 cherche dans 15 KB seulement
// ✅ Infos pertinentes ciblées
```

---

## 🎯 EN RÉSUMÉ PRATIQUE

**RAG = 3 étapes simples**

### 1. SETUP (1 fois, 8-16h)
```
BNF/VIDAL/ESC → Découper en chunks → Créer embeddings → Stocker dans DB
```

### 2. RECHERCHE (à chaque patient, 100ms)
```
Question patient → Créer embedding → Chercher dans DB → Top 10 docs pertinents
```

### 3. DIAGNOSTIC (à chaque patient, 50-70s)
```
10 docs pertinents + Patient → GPT-4 → Diagnostic avec sources BNF 2024
```

---

## 💡 POINTS CLÉS À RETENIR

1. **RAG = Recherche Intelligente + GPT-4**
   - Tu ne donnes PAS tout le BNF à GPT-4
   - Tu CHERCHES les 10 pages pertinentes
   - Tu donnes CES 10 pages à GPT-4

2. **Les Vecteurs = Le Secret**
   - Chaque texte → Vecteur de 3072 nombres
   - Textes similaires → Vecteurs proches
   - Recherche = Trouver vecteurs les plus proches

3. **Avantages Pratiques**
   - ✅ Prompt petit (15 KB vs 900 KB)
   - ✅ Moins cher (16× moins de tokens)
   - ✅ Plus rapide
   - ✅ Infos pertinentes ciblées
   - ✅ Connaissances complètes (BNF/VIDAL entiers)

---

**Repository**: https://github.com/stefbach/AI-DOCTOR  
**Commit**: À venir  
**Status**: Explication pratique complète

🔍 **RAG = Google Search pour les connaissances médicales de GPT-4** 🔍
