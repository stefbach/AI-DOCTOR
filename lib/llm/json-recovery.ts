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
