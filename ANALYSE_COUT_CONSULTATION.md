# Analyse du coût LLM par consultation

Date : 2026-06-13 · Branche : `claude/zen-bohr-jidtbz`

Ce document répond à deux questions :

1. **Quel module consomme le plus de tokens** dans une consultation ?
2. **Combien coûte** une consultation selon le modèle utilisé, maintenant que le
   prix est calculé automatiquement.

---

## 1. Ce qui a été ajouté

- **`lib/llm-pricing.ts`** — table de prix par modèle (USD / 1M tokens, entrée /
  entrée-en-cache / sortie) + fonctions `getModelPrice`, `estimateCost`,
  `sumCosts`, `formatUsd`.
- **`lib/llm-client.ts`** — chaque appel `callLLM()` calcule désormais son coût
  à partir des tokens réellement consommés et l'expose dans `result.cost`
  (`CostBreakdown`). Le coût est aussi journalisé sur la ligne `[llm]` :

  ```
  [llm] use=DIAGNOSIS provider=deepseek model=deepseek-chat latency=42000ms tokens=18420 cost=$0.0132 toolCalls=0
  ```

  Un suffixe `~` (ex. `cost=$0.0150~`) signale un **prix indicatif** (modèle pas
  encore tarifé publiquement, voir §4).
- Capture des **tokens en cache** (`prompt_cache_hit_tokens` DeepSeek /
  `prompt_tokens_details.cached_tokens` OpenAI) → facturés au tarif cache réduit.
- **`.env.example`** — variables DeepSeek (`DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`,
  `LLM_PROVIDER_<USECASE>`, `LLM_DISABLE_FALLBACK`) + override de prix
  `LLM_PRICING_OVERRIDES`.

---

## 2. Module qui consomme le plus de tokens

> **Le module le plus coûteux est le diagnostic principal** :
> `app/api/openai-diagnosis/route.ts` (use-case `DIAGNOSIS`).

Pourquoi :

| Facteur | Valeur | Source |
|---|---|---|
| Prompt système | ~3 500 lignes encyclopédiques (≈ 4 500–6 000 tokens) | `openai-diagnosis/route.ts` (prompt VIDAL/BNF/Harrison + guidelines + schéma JSON) |
| Contexte patient + RAG | ≈ 1 500–3 000 tokens | injection des `[ref-N]` |
| `maxTokens` sortie | **16 000** | ligne 2433 |
| Sortie réelle observée | ≈ 9 000–11 000 tokens | commentaire ligne 2429–2430 |
| Modèle | **`deepseek-chat`** | ligne 2431 |

Le **2ᵉ poste** est la génération du rapport de consultation
(`generate-consultation-report`, use-case `REPORT`, `deepseek-chat`,
`maxTokens: 8000`) : peu d'entrée mais 4 000–7 000 tokens de sortie narrative.

Les autres appels (extraction médicaments/labos, examens, prescription,
questions, assistant IA) sont nettement plus légers (`maxTokens` 1 000–3 000).

**Point clé de coût** : la sortie coûte **~4× l'entrée** chez `deepseek-chat`
(1,10 $ vs 0,27 $ / 1M). Le diagnostic domine donc car c'est lui qui *génère* le
plus (9–11k tokens de sortie).

---

## 3. Coût estimé d'une consultation (modèle `deepseek-chat`)

Tarifs `deepseek-chat` : entrée 0,27 $/M (cache-miss), sortie 1,10 $/M.

| Étape (use-case) | Entrée ~ | Sortie ~ | Coût ~ |
|---|---:|---:|---:|
| `DIAGNOSIS` (diagnostic) | 8 000 | 10 000 | **$0,0130** |
| `REPORT` (rapport) | 4 000 | 6 000 | $0,0077 |
| `EXTRACT_MEDICATIONS` | 1 500 | 1 000 | $0,0015 |
| `EXTRACT_LAB_TESTS` | 1 500 | 1 000 | $0,0015 |
| `EXAMENS` / `PRESCRIPTION` | 2 000 | 1 500 | $0,0022 |
| **Total consultation type** | | | **≈ $0,026** |

> Soit **~2,6 centimes USD par consultation standard** avec `deepseek-chat`, le
> diagnostic représentant à lui seul **~50 % du coût**. Le cache DeepSeek
> (prompt système répété) peut réduire fortement la part « entrée ».

Flux dermatologie / chronique : ajoutez le coût des étapes dédiées
(`DERMATOLOGY_REPORT`, `CHRONIC_*`), ordre de grandeur similaire (~0,02–0,03 $).

> ⚠️ Si une étape bascule en **fallback OpenAI** (`gpt-5.5`), le coût de cette
> étape est nettement supérieur (cf. §4) — le `result.cost` et le log le
> refléteront automatiquement.

---

## 4. Prix par modèle (table `lib/llm-pricing.ts`)

| Modèle | Entrée $/M | Cache $/M | Sortie $/M | Statut |
|---|---:|---:|---:|---|
| `deepseek-chat` (V3) | 0,27 | 0,07 | 1,10 | ✅ confirmé |
| `deepseek-reasoner` (R1) | 0,55 | 0,14 | 2,19 | ✅ confirmé |
| `deepseek-v4-pro` | 0,55 | 0,14 | 2,19 | ⚠️ indicatif |
| `gpt-5.5` | 2,50 | 1,25 | 10,00 | ⚠️ indicatif |
| `text-embedding-3-small` | 0,02 | — | 0 | ✅ confirmé |
| `whisper-1` | facturé à la minute audio (0 token) | | | ✅ |

⚠️ **À confirmer** : `deepseek-v4-pro` et `gpt-5.5` sont les modèles *par défaut*
configurés dans `llm-client.ts` mais ne sont pas encore tarifés publiquement.
Leurs prix sont des **placeholders** (alignés respectivement sur la gamme
reasoner et gpt-4o) et marqués `confirmed: false`. Mettez-les à jour dès que les
tarifs officiels sont publiés — soit dans la table, soit via
`LLM_PRICING_OVERRIDES` (sans redéploiement).

En pratique, **les deux modules les plus lourds utilisent déjà `deepseek-chat`**
(prix réel connu), donc le coût de la consultation est calculé sur des tarifs
confirmés.

---

## 5. Comment exploiter le coût dans le code

```ts
const result = await callLLM({ useCase: 'DIAGNOSIS', messages, maxTokens: 16000 })
console.log(result.cost?.totalUsd)        // coût USD de l'appel
console.log(result.cost?.priceConfirmed)  // false => prix indicatif

// Agréger plusieurs étapes pour un total de consultation :
import { sumCosts } from '@/lib/llm-pricing'
const total = sumCosts([diag.cost, report.cost, meds.cost])
```
