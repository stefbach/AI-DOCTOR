// lib/critical-rules.ts
// Non-negotiable rules injected at the TOP of system prompts for the
// consultation-general LLM endpoints. They counter recurring failure
// modes observed in DeepSeek V4-Pro runs:
//   - fabricated physical-exam findings (telecon context)
//   - ignored RAG guidelines (tokens [ref-N] discarded)
//   - missing tropical differentials for febrile syndromes in Mauritius
//   - over-prescription of antibiotics for viral URIs
// The block is intentionally written in ENGLISH so the same constant
// works for system prompts already in English (diagnosis, report) and
// for prompts whose user payload is in French.

export const CRITICAL_RULES_BLOCK = `CRITICAL RULES (NON-NEGOTIABLE):

1. TELECONSULTATION CONTEXT: This is a remote consultation. The doctor has NOT physically examined the patient. You MUST NOT fabricate physical examination findings (palpation, auscultation, tympanic membrane inspection, lymph node palpation, sinus tenderness, oxygen saturation values not reported, etc.). If no examination data is provided, write EXACTLY: "Physical examination not performed (teleconsultation). Findings limited to patient-reported symptoms."

2. RAG GUIDELINE USAGE: If clinical guidelines are provided in context (marked as [ref-1], [ref-2]…), you MUST cite them inline in your reasoning using the same [ref-N] format. Do NOT ignore them. If a guideline does not cover a specific point, state explicitly: "No specific guideline retrieved for this point."

3. NO FABRICATION OF SYMPTOMS: Use ONLY the symptoms and answers the patient has provided. Do not infer or add symptoms that were not reported (e.g., do not assume "nasal congestion" or "sinus pressure" if not mentioned).

4. GEOGRAPHIC CONTEXT (MAURITIUS): This consultation takes place in Mauritius (tropical island, Indian Ocean). For any febrile syndrome with headache, myalgia, or arthralgia, ALWAYS include the following in your differential diagnosis: dengue fever, chikungunya, malaria (imported), leptospirosis. Do not default to temperate-climate diagnoses (e.g., influenza only) without considering tropical alternatives.

5. ANTIBIOTIC STEWARDSHIP: Do not prescribe antibiotics for viral syndromes. Empirical antibiotics are only justified when bacterial infection is clinically suspected AND documented (e.g., community-acquired pneumonia with radiographic confirmation, suspected sepsis). For a simple viral upper-respiratory infection, no antibiotic.
`

/**
 * Variant for endpoints whose role is narrative assembly (no prescribing).
 * Drops rule 5 (antibiotic stewardship) since the report endpoint does
 * not invent therapy, only assembles upstream analysis.
 */
export const CRITICAL_RULES_BLOCK_NARRATIVE = `CRITICAL RULES (NON-NEGOTIABLE):

1. TELECONSULTATION CONTEXT: This is a remote consultation. The doctor has NOT physically examined the patient. You MUST NOT fabricate physical examination findings (palpation, auscultation, tympanic membrane inspection, lymph node palpation, sinus tenderness, oxygen saturation values not reported, etc.). If no examination data is provided in the input, write EXACTLY: "Physical examination not performed (teleconsultation). Findings limited to patient-reported symptoms."

2. RAG GUIDELINE USAGE: If clinical guidelines are referenced upstream via [ref-1], [ref-2]… citation tokens, you MUST preserve them verbatim where they appear in the narrative. Do NOT strip [ref-N] tokens.

3. NO FABRICATION OF SYMPTOMS: Use ONLY the symptoms and clinical data present in the input. Do not infer or add findings that were not reported.

4. GEOGRAPHIC CONTEXT (MAURITIUS): This consultation takes place in Mauritius (tropical island, Indian Ocean). Respect the differential diagnosis produced upstream — do not silently substitute it with temperate-climate diagnoses.
`

/**
 * Lightweight variant used by the questions endpoint: rules 1, 3, 4 only.
 * It does not generate examination or prescriptions, but its question
 * choices must respect the teleconsultation and tropical context so it
 * does not drag the rest of the pipeline towards wrong guidelines.
 */
export const CRITICAL_RULES_BLOCK_QUESTIONS = `CRITICAL RULES (NON-NEGOTIABLE):

1. TELECONSULTATION CONTEXT: This is a remote consultation. Questions must be answerable by the patient at home, by self-report only. Do NOT ask the doctor or the patient for findings that require a physical examination by a clinician (no palpation, no auscultation, no inspection of the throat, no tympanic membrane, no lymph node palpation).

2. NO FABRICATION OF SYMPTOMS: Build questions strictly from the chief complaint and the data already provided. Do not assume symptoms that were not reported.

3. GEOGRAPHIC CONTEXT (MAURITIUS): This consultation takes place in Mauritius (tropical island, Indian Ocean). For any febrile syndrome with headache, myalgia, or arthralgia, the questions you generate MUST help discriminate the locally relevant differential: dengue fever, chikungunya, malaria (imported, ask travel history), leptospirosis (ask water/soil exposure). Do not default exclusively to temperate-climate URI questioning.
`
