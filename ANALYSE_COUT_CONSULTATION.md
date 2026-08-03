# Analyse du coût LLM par consultation

Date : 2026-06-13 · Branche : `claude/zen-bohr-jidtbz`

Audit exhaustif de **tous** les appels LLM du code. Conclusion principale :
**plusieurs flux coexistent**, sur des modèles différents — le coût dépend donc
du **type de consultation**, pas d'un modèle unique.

---

## 1. Ce qui a été ajouté (calcul de coût)

- **`lib/llm-pricing.ts`** — table de prix par modèle + `estimateCost` / `sumCosts`.
- **`lib/llm-client.ts`** — chaque `callLLM()` calcule son coût (`result.cost`)
  et le logge sur la ligne `[llm] … cost=$…` (cache DeepSeek pris en compte).
- **`.env.example`** — variables DeepSeek + `LLM_PRICING_OVERRIDES`.

> ⚠️ Le calcul de coût ne couvre que les appels passant par `callLLM`. Les
> routes utilisant le **SDK Vercel AI** (`generateText`) ne passent PAS par
> `callLLM` et ne sont donc pas instrumentées (voir §4).

---

## 2. Modèles réellement utilisés (tarifs DeepSeek officiels)

| Modèle | Entrée $/M | Cache $/M | Sortie $/M | Statut |
|---|---:|---:|---:|---|
| `deepseek-v4-pro` | 0,435 | 0,003625 | 0,87 | ✅ confirmé |
| `deepseek-v4-flash` | 0,14 | 0,0028 | 0,28 | ✅ confirmé |
| `deepseek-chat` (alias legacy → v4-flash) | 0,14 | 0,0028 | 0,28 | ✅ confirmé |
| `deepseek-reasoner` (alias legacy → v4-flash) | 0,14 | 0,0028 | 0,28 | ✅ confirmé |
| `gpt-5.5` (fallback / SDK Vercel AI) | 2,50 | 1,25 | 10,00 | ⚠️ indicatif |

> ⚠️ **Important** : `deepseek-chat` n'est **pas** V4 Pro — c'est l'alias legacy
> de **v4-flash** (déprécié 2026-07-24), 3× moins cher que V4 Pro en sortie.
> Or les gros appels du flux **standard** et **dermato** sont codés en dur sur
> `deepseek-chat`. Seuls les flux **chroniques** (et certains rapports) tournent
> réellement sur **V4 Pro**.

---

## 3. Coût par type de consultation

### a) Consultation STANDARD — la plus fréquente
Endpoints réellement appelés par le front (`diagnosis-form.tsx`,
`questions-form.tsx`, `professional-report.tsx`), **tous en `deepseek-chat`
(= v4-flash : 0,14 $/M entrée · 0,28 $/M sortie)** :

| Étape | Modèle | Entrée → Sortie | Coût ~ |
|---|---|---|---:|
| Diagnostic `/api/openai-diagnosis` | deepseek-chat | 8 000 → 10 000 | $0,0039 |
| Questions `/api/openai-questions` | deepseek-chat | 3 000 → 1 500 | $0,0008 |
| Rapport `/api/generate-consultation-report` | deepseek-chat | 4 000 → 6 000 | $0,0022 |
| **Total** | | | **≈ $0,007** |

> **≈ 0,7 centime USD** par consultation standard. Le diagnostic = ~55 % du coût.

### b) Consultation DERMATOLOGIE
`/api/dermatology-diagnosis` (deepseek-chat, **jusqu'à 4 tentatives** de
re-génération sur échec qualité) + questions (deepseek-chat) + rapport
`/api/generate-dermatology-report` (V4 Pro par défaut d'env).

| Étape | Modèle | Coût ~ |
|---|---|---:|
| Diagnostic (1 passe) | deepseek-chat | $0,0018 |
| Questions | deepseek-chat | $0,0009 |
| Rapport | deepseek-v4-pro | $0,0052 |
| **Total (1 passe)** | | **≈ $0,008** |
| **Total (si 4 tentatives diag)** | | **≈ $0,013** |

> **≈ 0,8 à 1,3 centime** selon les ré-essais de diagnostic.

### c) Consultation CHRONIQUE — la plus chère (vrai V4 Pro + raisonnement)
`/api/chronic-diagnosis` (V4 Pro `reasoningEffort: low` + un 2ᵉ appel
deepseek-chat) + prescription (V4 Pro, reasoning) + diététique (V4 Pro ×2) +
examens + questions + rapport.

| Étape | Modèle | Coût ~ |
|---|---|---:|
| Diagnostic appel 1 (raisonnement, 16 384 tk) | deepseek-v4-pro | $0,013 |
| Diagnostic appel 2 (16 000 tk) | deepseek-chat | $0,003 |
| Prescription (8 000 tk, reasoning) | deepseek-v4-pro | $0,007 |
| Diététique ×2 (4 000 tk) | deepseek-v4-pro | $0,007 |
| Examens + questions | deepseek-chat | $0,002 |
| Rapport | deepseek-chat / gpt-5.5 | $0,002 |
| **Total** | | **≈ $0,034** |

> **≈ 3 à 4 centimes** — soit **~5× une consultation standard**, dû à V4 Pro +
> `reasoningEffort` (chaîne de pensée facturée en sortie à 0,87 $/M).

---

## 4. « Plusieurs versions » : flux vivants vs code mort

**3 implémentations de diagnostic** coexistent dans le code :

| Route | Modèle | Statut |
|---|---|---|
| `/api/openai-diagnosis` | deepseek-chat | ✅ **utilisée** (standard) |
| `/api/chronic-diagnosis` | deepseek-v4-pro + chat | ✅ **utilisée** (chronique) |
| `/api/dermatology-diagnosis` | deepseek-chat | ✅ **utilisée** (dermato) |
| `/api/diagnosis-expert` | gpt-5.5 (SDK Vercel AI) | ⚠️ **non câblée au front** (code mort) |
| `/api/enhanced-diagnosis` | gpt-5.5 (SDK Vercel AI) | ⚠️ **non câblée au front** (code mort) |

Plusieurs routes de rapport coexistent aussi (`generate-consultation-report` ✅,
`generate-chronic-report` et `chronic-report` = alternatives/legacy probables).

> 💡 `diagnosis-expert` et `enhanced-diagnosis` tournent sur **gpt-5.5** (cher) et
> ne sont appelées par aucun composant front → **aucun coût en prod** tant
> qu'elles ne sont pas invoquées directement. À supprimer ou archiver pour
> lever l'ambiguïté.

---

## 5. Résumé exécutif

| Type de consultation | Modèle dominant | Coût/consultation |
|---|---|---:|
| **Standard** | deepseek-chat (v4-flash) | **≈ $0,007** |
| **Dermatologie** | deepseek-chat + V4 Pro (rapport) | **≈ $0,008–0,013** |
| **Chronique** | **deepseek-v4-pro** + raisonnement | **≈ $0,034** |

Dans tous les cas, le **diagnostic** est le poste le plus lourd (~50 % du coût).

> Estimations sur des volumes de tokens typiques. Le coût **exact** par appel est
> désormais loggé (`[llm] … cost=$…`) → relève quelques consultations réelles
> dans les logs Vercel pour calibrer ces chiffres au centime près.
>
> ⚠️ Réserves : (1) les calculs supposent des appels sans cache — le cache
> DeepSeek réduit fortement la part « entrée » du diagnostic ; (2) les routes
> SDK Vercel AI (`gpt-5.5`, prix indicatif) ne sont pas instrumentées ; (3) le
> modèle des appels sans `model:` explicite dépend des variables `LLM_PROVIDER_*`
> / `DEEPSEEK_MODEL` définies dans Vercel.
