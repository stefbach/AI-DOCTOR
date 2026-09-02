/**
 * Shared JSON recovery helpers for DeepSeek-V4-Pro outputs.
 *
 * Two failure modes we keep seeing across chronic / dermato / general
 * routes:
 *
 * 1. Truncation — model hit the token cap mid-string or mid-array. The
 *    raw output ends abruptly with something like `..."breakfast": { "fo`.
 *    JSON.parse rejects it. `repairTruncatedJson` trims back to the last
 *    syntactically clean boundary and balances open brackets, producing
 *    a valid (but partial) tree. The downstream code is expected to
 *    degrade gracefully on the partial result.
 *
 * 2. Bad escapes inside strings — model emits literal control chars
 *    (newline, tab) inside a JSON string without escaping them, which
 *    is illegal under RFC 8259 and breaks JSON.parse with errors like
 *    "Unterminated string in JSON at position N". `cleanJsonString`
 *    walks the string and re-escapes control chars only when they
 *    appear inside a JSON string literal.
 *
 * Typical usage at the call site:
 *
 *   try {
 *     return JSON.parse(content)
 *   } catch {
 *     try {
 *       return JSON.parse(cleanJsonString(content))
 *     } catch {
 *       const recovered = repairTruncatedJson(cleanJsonString(content))
 *       if (recovered) return JSON.parse(recovered)
 *       throw original
 *     }
 *   }
 *
 * `parseLLMJsonSafely` wraps that ladder so callers don't have to
 * remember the order.
 */

/**
 * Re-escape unescaped control characters inside JSON string literals.
 * Leaves whitespace outside strings untouched. Returns a syntactically
 * cleaner string that may still be truncated; combine with
 * `repairTruncatedJson` for the full recovery.
 */
export function cleanJsonString(jsonStr: string): string {
  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]
    const charCode = jsonStr.charCodeAt(i)

    if (escaped) {
      result += char
      escaped = false
      continue
    }

    if (char === '\\' && inString) {
      escaped = true
      result += char
      continue
    }

    if (char === '"' && !escaped) {
      inString = !inString
      result += char
      continue
    }

    if (inString && charCode < 32) {
      if (charCode === 10) result += '\\n'
      else if (charCode === 13) result += '\\r'
      else if (charCode === 9) result += '\\t'
      else result += `\\u${charCode.toString(16).padStart(4, '0')}`
      continue
    }

    result += char
  }

  return result
}

/**
 * Best-effort recovery for a truncated JSON string. Walks the string
 * tracking brace/bracket balance, trims back to the last clean
 * boundary, drops any trailing comma, and balances open structures.
 * Returns null if no usable boundary was found.
 */
export function repairTruncatedJson(raw: string): string | null {
  if (typeof raw !== 'string' || !raw) return null

  let inString = false
  let escaped = false
  const stack: string[] = []
  let lastSafeIndex = -1

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (escaped) { escaped = false; continue }
    if (c === '\\' && inString) { escaped = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{' || c === '[') {
      stack.push(c)
    } else if (c === '}' || c === ']') {
      stack.pop()
      lastSafeIndex = i
    } else if (c === ',' && stack.length > 0) {
      lastSafeIndex = i
    }
  }

  if (lastSafeIndex < 0) return null

  let trimmed = raw.slice(0, lastSafeIndex + 1).replace(/,\s*$/, '')

  inString = false
  escaped = false
  const closing: string[] = []
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed[i]
    if (escaped) { escaped = false; continue }
    if (c === '\\' && inString) { escaped = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') closing.push('}')
    else if (c === '[') closing.push(']')
    else if (c === '}' || c === ']') closing.pop()
  }
  while (closing.length > 0) trimmed += closing.pop()

  return trimmed
}

/**
 * Parse an LLM-emitted JSON string with full recovery ladder:
 *   1. Direct JSON.parse.
 *   2. cleanJsonString + JSON.parse (rescues unescaped control chars).
 *   3. cleanJsonString → repairTruncatedJson → JSON.parse (rescues
 *      truncation).
 *
 * Throws the original parse error if all three attempts fail. Logs
 * each recovery step so the route's Vercel logs surface which fallback
 * was needed.
 *
 * @param raw     Raw LLM output text.
 * @param label   Short tag used in log lines (e.g. "chronic-examens C2").
 */
export function parseLLMJsonSafely(raw: string, label: string): any {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(`${label}: empty LLM response`)
  }

  // Attempt 1 — direct.
  try {
    return JSON.parse(raw)
  } catch (firstError: any) {
    console.warn(
      `⚠️ ${label} JSON.parse failed (${firstError.message}). ` +
        `Trying cleanJsonString — content length=${raw.length}`
    )

    // Attempt 2 — clean control chars.
    const cleaned = cleanJsonString(raw)
    try {
      const parsed = JSON.parse(cleaned)
      console.log(`✅ ${label} parsed after cleanJsonString`)
      return parsed
    } catch {
      // Attempt 3 — repair truncation.
      const recovered = repairTruncatedJson(cleaned)
      if (recovered) {
        try {
          const parsed = JSON.parse(recovered)
          console.log(
            `✅ ${label} parsed after cleanJsonString + repairTruncatedJson ` +
              `(recovered length=${recovered.length})`
          )
          return parsed
        } catch (thirdError: any) {
          console.error(
            `❌ ${label} JSON parse error (after all recovery attempts):`,
            thirdError.message
          )
        }
      }
      console.error(`${label} content tail:`, raw.slice(-500))
      throw firstError
    }
  }
}

/**
 * Remove trailing commas that sit just before a closing brace or bracket,
 * ignoring anything inside string literals.
 *
 * DeepSeek in `json_object` mode intermittently emits `…"x": 1, }` — which
 * JSON.parse rejects with "Expected double-quoted property name", the exact
 * error that killed the 01/09 14:48 consultation at position 15418 of a
 * 22 440-character analysis. Dropping the comma changes no content: it is
 * pure syntax noise.
 */
export function stripTrailingCommas(jsonStr: string): string {
  if (typeof jsonStr !== 'string' || !jsonStr) return jsonStr

  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escaped) { result += char; escaped = false; continue }
    if (char === '\\' && inString) { result += char; escaped = true; continue }
    if (char === '"') { inString = !inString; result += char; continue }

    if (!inString && char === ',') {
      // Look ahead past whitespace: a closing bracket means this comma is noise.
      let j = i + 1
      while (j < jsonStr.length && /\s/.test(jsonStr[j])) j++
      if (jsonStr[j] === '}' || jsonStr[j] === ']') continue // drop the comma
    }

    result += char
  }

  return result
}

/**
 * Strip what a model wraps its JSON in — markdown fences, a reasoning
 * preamble, a closing sentence — and return the substring that runs from the
 * first '{' to the last '}'.
 *
 * Framing only: nothing inside the JSON document is touched. Returns the
 * trimmed input unchanged when no object delimiters are found, so the caller
 * still sees the original content in its error message.
 */
export function normaliseJsonFraming(raw: string): string {
  if (typeof raw !== 'string') return ''

  let content = raw.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  const firstBrace = content.indexOf('{')
  if (firstBrace > 0) content = content.substring(firstBrace)

  const lastBrace = content.lastIndexOf('}')
  if (lastBrace !== -1 && lastBrace < content.length - 1) {
    content = content.substring(0, lastBrace + 1)
  }

  return content
}

export type LosslessParse =
  | { ok: true; value: any; text: string; repair: 'none' | 'control-chars' | 'trailing-commas' }
  | { ok: false; error: Error }

/**
 * Parse LLM JSON using ONLY repairs that preserve every byte of clinical
 * content: re-escaping control characters, and removing trailing commas.
 *
 * Deliberately does NOT call `repairTruncatedJson`. That helper trims back to
 * the last clean boundary, which on a diagnosis document means silently
 * amputating investigations, prescriptions or follow-up — and
 * `ensureCompleteStructure` would then paper over the hole with generic
 * placeholder text, handing the doctor an analysis that looks complete and
 * is not. When the lossless ladder fails, the right answer is to regenerate
 * the response, not to salvage a partial one.
 */
export function parseJsonLossless(raw: string): LosslessParse {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: new Error('empty response') }
  }

  try {
    return { ok: true, value: JSON.parse(raw), text: raw, repair: 'none' }
  } catch (firstError: any) {
    const cleaned = cleanJsonString(raw)
    try {
      return { ok: true, value: JSON.parse(cleaned), text: cleaned, repair: 'control-chars' }
    } catch {
      const decommaed = stripTrailingCommas(cleaned)
      try {
        return { ok: true, value: JSON.parse(decommaed), text: decommaed, repair: 'trailing-commas' }
      } catch {
        return { ok: false, error: firstError instanceof Error ? firstError : new Error(String(firstError)) }
      }
    }
  }
}
