# Intégration agent vocal Eva/Emma ↔ AI-DOCTOR

Ce document décrit précisément le contrat des 6 routes AI-DOCTOR que l'agent
vocal téléphonique/WhatsApp (Eva/Emma, dépôt séparé) est censé appeler EN
TEMPS RÉEL pendant un appel patient, AVANT tout contact avec un médecin. Le
résultat sert de **préparation pour le médecin** qui prend le relais en
visio via TIBOK — jamais un diagnostic annoncé directement au patient par
l'agent vocal.

Généré le 2026-08-29 par revue de code directe (pas de documentation
préexistante faisant autorité sur ces 6 routes). Toute divergence future
entre ce document et le code doit être tranchée en faveur du code.

---

## 0. Authentification — état constaté et ce qui a changé

**Constat (avant cette PR) :** aucune des 6 routes ne vérifie de session, de
cookie, de Bearer token ni de clé API. Il n'y a pas de `middleware.ts` à la
racine du repo — donc rien ne gate `/api/*` globalement non plus. Les 6
routes sont **ouvertes à quiconque connaît l'URL** : `POST
https://<host>/api/openai-questions` (par ex.) répond à n'importe quel
appelant, sans en-tête particulier. C'était déjà vrai pour `openai-questions`
comme observé initialement, et se vérifie identiquement sur les 5 autres.

Aucun mécanisme de secret partagé TIBOK↔AI-DOCTOR préexistant n'a été trouvé
dans le repo pour ces routes (recherché dans `hooks/use-tibok-bridge.ts`,
`lib/tibok-draft-service.ts`, et globalement). Les seuls secrets serveur
existants (`DELIVERY_ADMIN_SECRET` sur `/api/deliver-documents/relink`,
`CRON_SECRET` sur `/api/deliver-documents/retry`) sont des routes
d'administration internes sans appelant navigateur, et implémentent un
contrôle d'accès **bloquant** (401 si absent/faux) — donc non réutilisable
tel quel sans risque de régression sur nos 6 routes, dont on ne connaît pas
tous les appelants navigateur actuels.

**Ce qui a été ajouté (additif, jamais bloquant) :** dans chacune des 6
routes, au tout début du handler `POST`, un bloc optionnel :

```ts
const agentSecret = process.env.AGENT_SHARED_SECRET
const authHeader = request.headers.get('authorization') || ''
if (agentSecret && authHeader === `Bearer ${agentSecret}`) {
  console.log('[<route>] trusted server-to-server call (AGENT_SHARED_SECRET matched)')
}
```

Effets : **aucun**, sauf une ligne de log, et uniquement quand l'en-tête
`Authorization: Bearer <AGENT_SHARED_SECRET>` correspond exactement à la
variable d'environnement `AGENT_SHARED_SECRET`. Concrètement :

- Une requête **sans** cet en-tête (tout le trafic actuel — navigateur
  médecin via TIBOK, tests, etc.) suit exactement le même chemin de code
  qu'avant cette PR. Aucun statut, aucun corps de réponse, aucun timing
  n'est modifié.
- Une requête **avec** l'en-tête correct est seulement identifiée dans les
  logs serveur comme provenant d'un appelant de confiance (Eva). Elle
  n'obtient ni traitement différent, ni accès à des données supplémentaires.
- `AGENT_SHARED_SECRET` n'existe dans aucun `.env` de ce repo — tant qu'elle
  n'est pas configurée côté Vercel, le bloc ne fait strictement rien
  (`agentSecret` est vide → la condition est toujours fausse).

**Ce qui n'a délibérément PAS été fait : un vrai contrôle d'accès (401 sans
le bon token).** Comme les 6 routes sont actuellement les SEULS points
d'entrée (il n'existe pas de route « agent uniquement » séparée), et que le
frontend navigateur de production les appelle directement sans aucun
en-tête d'auth, ajouter un rejet bloquant romprait — par construction —
n'importe quel appelant existant qui n'envoie pas ce header, y compris des
appelants non inventoriés. La consigne « ne jamais restreindre un chemin
d'accès existant » est donc strictement incompatible avec un vrai
verrouillage tant que ces routes restent le seul point d'entrée public. Ceci
est signalé explicitement plutôt que deviné :

> **Recommandation pour une vraie protection ultérieure :** router les
> appels d'Eva via un chemin dédié (ex. un edge proxy / une route
> `/api/agent/*` distincte qui, elle, exige `AGENT_SHARED_SECRET`), ou
> confirmer avec l'équipe TIBOK l'inventaire complet des appelants
> navigateur actuels avant de transformer ce bloc en un rejet 401 sur les 6
> routes existantes.

---

## 1. `/api/openai-questions` (généraliste — questions)

- **Fichier** : `app/api/openai-questions/route.ts`
- **Méthode** : `POST` (un `GET` existe aussi, healthcheck statique sans paramètre)
- **Runtime** : Node.js, `maxDuration = 600s`. Pas de streaming — réponse JSON unique.
- **Latence observée** (commentaires code) : ~65-160s typique (DeepSeek-V4-Pro).
- **Appels internes** : `callLLM()` (`lib/llm-client.ts`) → OpenAI ou DeepSeek
  selon `LLM_PROVIDER_QUESTIONS` (fallback auto vers OpenAI si DeepSeek échoue).
  Modèle demandé : `gpt-5.5` (config interne), avec 3 retries + auto-correction.
- **DB** : aucune (juste un cache mémoire process, `EnhancedCache`, non partagé
  entre invocations serverless — ignorer côté agent, ne pas compter dessus).

### Requête

```jsonc
{
  "patientData": {                    // requis
    "age": "34",                      // string ou number
    "gender": "Male" | "Female" | ...,
    "weight": "70", "height": "175",
    "pregnancyStatus": "...", "lastMenstrualPeriod": "...", "gestationalAge": "...",
    "allergies": ["..."], "medicalHistory": ["..."],
    "currentMedications": "...", "currentMedicationsText": "...",
    "lifeHabits": { "smoking": "...", "alcohol": "...", "physicalActivity": "..." },
    "smokingStatus": "...", "alcoholConsumption": "...", "physicalActivity": "..."
    // firstName/lastName/phone/email/address/city/country acceptés mais
    // anonymisés côté serveur avant tout envoi au LLM
  },
  "clinicalData": {                   // requis
    "chiefComplaint": "chest pain",   // requis dans clinicalData
    "diseaseHistory": "...", "symptomDuration": "1_6_hours",
    "symptoms": ["..."], "painScale": "7",
    "vitalSigns": {
      "temperature": "38.2",
      "bloodPressureSystolic": "130", "bloodPressureDiastolic": "85",
      "bloodGlucose": "1.1"           // g/L
    }
  },
  "mode": "fast" | "balanced" | "intelligent"  // optionnel, défaut "balanced"
}
```

Si `patientData` ou `clinicalData` manque → `400` `{ error, success:false }`.

### Réponse (200)

```jsonc
{
  "success": true,
  "questions": [
    { "id": 1, "question": "...", "options": ["...","...","...","..."],
      "priority": "critical"|"high"|"medium"|"low",
      "rationale": "...", "redFlagDetection": true, "clinicalRelevance": "..." }
    // 5-8 questions typiquement, QCM 3-5 options
  ],
  "analysis": {
    "mode": "balanced", "adjustedMode": "intelligent",   // si escaladé
    "criticalityScore": 0-10, "redFlags": ["..."],
    "riskFactors": [{ "factor","severity","relatedTo" }],
    "suggestedSpecialty": "...",
    "urgencyLevel": "...", "triageCategory": "...",
    "historyAnalysis": { "patternsDetected","redFlagsFromHistory","criticalityBonus","inconsistencies" }
  },
  "recommendations": { "immediateAction": ["..."], "followUp": "...", "additionalTests": ["..."], "specialistReferral": "..." },
  "dataProtection": { "enabled": true, "anonymousId": "...", "method": "field_removal", "compliance": ["GDPR","HIPAA"] },
  "metadata": { "model","provider","fallbackUsed","llmLatencyMs","version","processingTime","dataCompleteness","confidenceLevel","qualityMetrics" }
}
```

En cas d'erreur : toujours `200`... en fait `500` avec un objet de la même
forme (`success:false`, `questions:[]`, `analysis` de repli, `error`).
**Important pour l'agent : toujours vérifier `success` avant d'utiliser les
questions.**

---

## 2. `/api/openai-diagnosis` (généraliste — diagnostic)

- **Fichier** : `app/api/openai-diagnosis/route.ts` (7033 lignes)
- **Méthode** : `POST` (+ `GET` healthcheck avec self-tests optionnels)
- **Runtime** : Node.js, `maxDuration = 600s`. Pas de streaming — JSON unique.
- **Latence observée** : ~250-350s typique (DeepSeek-V4-Pro + RAG). **C'est la
  route la plus lente des 6** — prévoir un timeout client ≥ 400-500s côté Eva.
- **Appels internes** :
  - `callOpenAIWithMauritiusQuality()` → `callLLM()` (OpenAI/DeepSeek selon env).
  - RAG (Retrieval-Augmented Generation) best-effort et non-bloquant :
    `lib/rag/medical-rag.ts` interroge une table Supabase de guidelines
    médicales (lecture seule, via `queryMedicalGuidelines[Multi]`), puis
    `lib/rag/rerank.ts` (re-rank par un second appel LLM léger) et
    `lib/rag/verify-citations.ts` (vérification de grounding des citations).
    Si le RAG échoue, la génération continue sans lui.
- **DB** : **une écriture** best-effort, non bloquante :
  `saveStepResult(body.consultationId, 'diagnosis', finalResponse, body.resultToken)`
  (`lib/ai-result-cache.ts`) upsert dans la table Supabase `ai_step_results`
  via `SUPABASE_SERVICE_ROLE_KEY`. Sert de cache de récupération pour le
  frontend médecin en cas de déconnexion ; sans effet sur la réponse renvoyée.
  **Note pour Eva : si `consultationId` est absent/trop court (< 8 caractères)
  ou si les credentials Supabase manquent, l'écriture est simplement ignorée
  — n'affecte jamais le succès de l'appel.**

### Requête

```jsonc
{
  "patientData": { /* même forme que openai-questions, + "sex" accepté en alternative à "gender" */ },  // requis
  "clinicalData": { /* même forme que openai-questions */ },                                             // requis
  "questionsData": [ /* réponses aux questions de l'étape 1, forme libre — passées telles quelles */ ],  // optionnel
  "doctorNotes": { "clinicalHypotheses": [...], "differentialDiagnoses": [...], "clinicalReasoning": "..." }, // optionnel, normalement absent pour Eva
  "consultationId": "TC-MU-...",   // optionnel mais recommandé (sert de clé de cache de récupération)
  "resultToken": "..."             // optionnel, associé au cache
}
```

Si `patientData` ou `clinicalData` manque → `400`
`{ success:false, error, errorCode:"MISSING_DATA" }`.

### Réponse (200) — objet volumineux, champs clés :

```jsonc
{
  "success": true,
  "processingTime": "123456ms",
  "rag_used": true, "rag_metadata": { /* chunks_retrieved, avg_similarity, grounding_verified, ... */ },
  "evidence_references": [ { "ref_id":"ref-1", "title":"...", "source":"...", "url":"..." } ],
  "mauritiusQualityValidation": { /* métadonnées qualité, non cliniques */ },
  "medicationsSimple": [ { "id","nom","posologie_complete","indication","dci" } ],
  "dataProtection": { "anonymousId": "...", ... },
  "universalValidation": { /* métriques internes */ },

  // === Champ le plus important pour un pré-triage voix ===
  "triage_assessment": {
    "assessed": true,
    "severity": "routine" | "urgent" | "emergency",
    "disposition": "outpatient" | "gp_review_24h" | "A&E_same_day" | "ambulance_immediate",
    "criteria_met": ["..."],
    "justification": "..."
  },
  // "assessed:false" si le LLM n'a pas produit ce bloc — à traiter comme
  // "urgence non évaluée, escalade prudente" côté Eva, jamais comme "routine".

  // Raisonnement diagnostique complet (nomenclature interne — voir le code
  // `ensureCompleteStructure()` ligne ~1905 pour la structure exhaustive) :
  "diagnostic_reasoning": {
    "clinical_analysis": {
      "primary_diagnosis": { "condition","icd10_code","probability","confidence_level","severity","pathophysiology","clinical_reasoning" },
      "differential_diagnoses": [ { "condition","probability", ... } ]
    }
  }
  // + treatment_plan, investigation_plan / expert_investigations,
  //   currentMedicationsValidated, combinedPrescription, etc. — objet très
  //   large, à parser défensivement (champs optionnels selon ce que le LLM a produit).
}
```

En cas d'échec critique : `500` avec `{ success:false, error, errorCode:"PROCESSING_ERROR", emergencyFallback:{...} }`
— toujours vérifier `success` en premier.

**Rappel produit important :** ce diagnostic est une préparation pour le
médecin, **jamais** à lire tel quel au patient par l'agent vocal — c'est la
prémisse même de ce document et du produit Eva.

---

## 3. `/api/dermatology-questions`

- **Fichier** : `app/api/dermatology-questions/route.ts`
- **Méthode** : `POST` uniquement (pas de `GET`)
- **Runtime** : Node.js, `maxDuration = 600s`. JSON unique, pas de streaming.
- **Appels internes** : `callLLM()` avec `useCase: 'DERMATOLOGY_QUESTIONS'`,
  modèle `deepseek-chat` (non-reasoning), 3 retries, timeout LLM interne 180s.
- **DB** : aucune.
- **Dépendance externe hors scope de cette doc** : pour des questions
  pertinentes, cette route attend idéalement `ocrAnalysisData`, produit par
  `/api/dermatology-ocr` (analyse d'image, hors des 6 routes documentées
  ici). **Sans image (cas vocal/WhatsApp texte pur), la route fonctionne
  quand même** — elle retombe sur `"No image analysis available"` et génère
  des questions dermatologiques génériques.

### Requête

```jsonc
{
  "patientData": { "age": "...", "gender": "...", /* + champs identifiants, anonymisés côté serveur */ },
  "imageData": [ /* non utilisé directement par cette route, juste transmis */ ],  // optionnel
  "ocrAnalysisData": { "analysis": { /* structure OCR complète */ }, "summary": "..." }  // optionnel — voir /api/dermatology-ocr
}
```

Aucun champ n'est strictement requis par du code de validation explicite
(`patientData` peut être `undefined`, la route continue avec des valeurs
`undefined` dans le prompt).

### Réponse (200)

```jsonc
{
  "success": true,
  "questions": [
    { "id": "derm_q1", "category": "Onset & Duration", "question": "...",
      "type": "multiple_choice", "options": ["...","...","...","..."] }
    // 8-12 questions typiquement
  ],
  "patientInfo": { "firstName": "...", "lastName": "..." },   // ré-attaché en clair depuis originalIdentity (pas anonymisé dans la réponse)
  "metadata": { "model": "gpt-5.5", "version": "2.0-...", "qualityMetrics": {...} },
  "timestamp": "..."
}
```

**Particularité : en cas d'erreur, cette route répond quand même `200`**
avec `{ success:true, questions: getDefaultDermatologyQuestions(), fallback:true }`
— 10 questions génériques de secours. Il n'y a donc jamais de `500` observable
ici ; vérifier plutôt le champ `fallback`.

---

## 4. `/api/dermatology-diagnosis`

- **Fichier** : `app/api/dermatology-diagnosis/route.ts` (1896 lignes)
- **Méthode** : `POST` uniquement
- **Runtime** : Node.js, `maxDuration = 600s`. JSON unique, pas de streaming.
- **Appels internes** : `callOpenAIWithRetry()` → `callLLM()`, RAG best-effort
  (mêmes helpers `lib/rag/medical-rag.ts` + `verify-citations.ts` que
  `openai-diagnosis`, lecture Supabase seule).
- **DB** : aucune écriture (pas d'équivalent `saveStepResult` sur cette route).

### Requête

```jsonc
{
  "patientData": { "age","gender","medicalHistory","allergies","currentMedications", /* + identifiants anonymisés serveur */ },
  "imageData": [ /* non transformé, juste compté pour metadata.imagesAnalyzed */ ],
  "ocrAnalysisData": { "analysis": {...}, "summary": "..." },   // optionnel, cf. route OCR — fortement recommandé pour la qualité
  "questionsData": { "answers": { /* map id→réponse */ }, "questions": [ /* les questions posées, pour contexte */ ] }
}
```

### Réponse (200) — structure alignée sur `openai-diagnosis` pour compatibilité frontend :

```jsonc
{
  "success": true,
  "timestamp": "...",
  "diagnosisId": "DERM-DX-...",
  "patientInfo": { "firstName","lastName","age" },

  "triage_assessment": { "severity","disposition","criteria_met","justification" } | null,
  // null si le LLM n'a pas produit ce bloc — traiter comme "non évalué", jamais comme routine.

  "currentMedicationsValidated": [...], "medications": [...], "combinedPrescription": [...],
  "noMedicationsReason": "..." | null,
  "expertAnalysis": { "expert_therapeutics": {...}, "expert_investigations": {...} },
  "rag_used": true, "rag_metadata": {...}, "evidence_references": [...],
  "diagnosis": { "fullText": "...", "structured": { /* primaryDiagnosis, differentialDiagnoses, ... */ } },
  "qualityMetrics": {...}, "version": "...", "consultationType": "new_problem" | "renewal",
  "metadata": { "imagesAnalyzed","questionsAnswered","generatedAt", ... }
}
```

Erreur → `500` `{ success:false, error, ... }` (voir bloc `catch` en fin de fichier).

---

## 5. `/api/chronic-questions`

- **Fichier** : `app/api/chronic-questions/route.ts`
- **Méthode** : `POST` uniquement
- **Runtime** : Node.js — **`maxDuration` NON défini explicitement** (seule
  route des 6 sans override ; suit la limite par défaut du plan Vercel).
  Comme le modèle utilisé est `deepseek-chat` non-reasoning, la latence
  réelle reste faible (quelques secondes à ~30s) ; à surveiller si un jour
  le modèle change.
- **Appels internes** : `callLLM()` avec `useCase: 'CHRONIC_QUESTIONS'`,
  `deepseek-chat`, 3 retries, timeout LLM interne 180s.
- **DB** : aucune.

### Requête

```jsonc
{
  "patientData": {                    // requis
    "age","gender","weight","height","allergies","medicalHistory",
    "currentMedicationsText",         // texte libre, pas un tableau
    "lifeHabits": { "smoking","alcohol","physicalActivity" }
  },
  "clinicalData": {                   // requis
    "chiefComplaint",                 // défaut interne "Chronic disease follow-up" si vide
    "symptomDuration",
    "bloodPressureSystolic","bloodPressureDiastolic",
    "bloodGlucose",                   // g/L
    "heartRate","temperature","weight","height","bmi",
    "lastHbA1c","lastFollowUpDate","medicationAdherence",
    "visionChanges": bool, "footProblems": bool, "chestPain": bool,
    "dietCompliance","exerciseFrequency"
  }
}
```

Si `patientData` ou `clinicalData` manque → `400` `{ error, success:false }`.

Détection automatique des maladies chroniques par mots-clés dans
`medicalHistory` (diabète / hypertension / obésité via BMI ≥ 30) — pas de
champ dédié à envoyer, c'est déduit côté serveur.

### Réponse (200)

```jsonc
{
  "success": true,
  "questions": [
    { "id": 1, "question": "...", "options": ["...","...","...","..."],  // toujours exactement 4 options
      "priority": "high", "category": "diabetes_control"|"hypertension_control"|"obesity_management"|"complications"|"medications"|"lifestyle",
      "rationale": "...", "clinicalRelevance": "..." }
    // exactement 8 questions demandées au LLM
  ],
  "metadata": { "model":"gpt-5.5","version","processingTime","chronicDiseases":{"diabetes","hypertension","obesity"},"questionsGenerated","qualityMetrics" }
}
```

Erreur → `500` `{ success:false, error, questions:[] }`.

---

## 6. `/api/chronic-diagnosis` — ⚠️ route SSE, pas un JSON simple

- **Fichier** : `app/api/chronic-diagnosis/route.ts`
- **Méthode** : `POST` uniquement
- **Runtime** : Node.js, `maxDuration = 600s`.
- **⚠️ RÉPONSE STREAMÉE (Server-Sent Events), PAS un JSON unique.** C'est la
  seule des 6 routes construite ainsi. `Content-Type: text/event-stream`.
  L'agent Eva doit consommer un flux SSE, pas faire un simple `fetch().json()`.
  Deux appels LLM séquentiels (`deepseek-v4-pro` en reasoning puis
  `deepseek-chat`), chacun pouvant prendre 150-250s — heartbeat SSE toutes
  les 15s pour éviter la coupure de connexion HTTP/2 côté proxy/navigateur.
- **Appels internes** : `callLLM()` (2 appels), RAG best-effort
  (`lib/rag/medical-rag.ts`, lecture Supabase seule, mêmes helpers que les
  autres diagnostics).
- **DB** : aucune écriture.

### Requête

```jsonc
{
  "patientData": { "age","gender","weight","height","medicalHistory","currentMedications","allergies" },  // requis (accès direct sans garde explicite — à fournir)
  "clinicalData": { "chiefComplaint","vitalSigns":{"bloodPressureSystolic","bloodPressureDiastolic","bloodGlucose"},"symptomDuration","symptoms","diseaseHistory" },
  "questionsData": { /* réponses aux questions de l'étape 5, forme libre, sérialisée telle quelle dans le prompt */ }
}
```

Aucune validation explicite `if (!patientData...)` ici — un corps
incomplet ne renvoie pas de `400` propre, il produit un flux SSE avec des
valeurs `undefined`/`?` dans le contexte patient envoyé au LLM. Toujours
fournir un objet complet côté agent.

### Réponse — flux `text/event-stream`

Événements nommés, dans l'ordre :

```
event: progress
data: {"message":"Consultation des guidelines médicales...","progress":5}

event: progress
data: {"message":"Analyse clinique approfondie des maladies chroniques...","progress":10}

... (plusieurs event:progress, progress croissant jusqu'à 100)

event: complete
data: {"success":true,"assessment": { /* voir ci-dessous */ }}
```

ou, en cas d'échec pendant le traitement :

```
event: error
data: {"error":"Failed to generate assessment","details":"..."}
```

`assessment` (dans l'événement `complete`) :

```jsonc
{
  "triage_assessment": { "severity","disposition","criteria_met","justification" } | null,
  "diseaseAssessment": { "diabetes": {...}, "hypertension": {...}, "obesity": {...} },
  "detailedMealPlan": { "breakfast","lunch","dinner","snacks","hydration","foodsToFavor","foodsToAvoid", ... },
  "therapeuticObjectives": { "shortTerm","mediumTerm","longTerm" },
  "followUpPlan": { "specialistConsultations","laboratoryTests","selfMonitoring" },
  "medicationManagement": { "continue":[...],"add":[...],"adjust":[...],"stop":[...] },
  "overallAssessment": { "globalControl","mainConcerns","priorityActions" },
  "evidence_references": [...], "rag_used": true, "rag_metadata": {...}
}
```

Si la requête elle-même échoue avant l'ouverture du flux (ex. `req.json()`
invalide) → `500` JSON classique `{ error:"Failed to process request", details }`.

---

## Récapitulatif rapide

| Route | Flux | Auth avant | Auth après | DB write | Latence typique |
|---|---|---|---|---|---|
| `openai-questions` | JSON | aucune | + reconnaissance optionnelle non bloquante | non | 65-160s |
| `openai-diagnosis` | JSON | aucune | idem | oui (cache best-effort) | 250-350s |
| `dermatology-questions` | JSON | aucune | idem | non | quelques s à ~1min |
| `dermatology-diagnosis` | JSON | aucune | idem | non | 100-250s (estimé, non chiffré en commentaire) |
| `chronic-questions` | JSON | aucune | idem | non | quelques s à ~30s |
| `chronic-diagnosis` | **SSE** | aucune | idem | non | 300-500s (2 appels séquentiels) |

Toutes restent **ouvertes sans authentification** après cette PR — voir
section 0 pour la justification et la recommandation de verrouillage futur.
