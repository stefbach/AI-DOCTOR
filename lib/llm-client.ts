// lib/llm-client.ts
// Unified LLM client with provider switching (OpenAI / DeepSeek) per use-case.
// Default provider is OpenAI. DeepSeek is opt-in per use-case via env var
// `LLM_PROVIDER_<USECASE>=deepseek` (configured in Vercel).
// On any DeepSeek failure (timeout, 5xx, parse error), the wrapper falls
// back automatically to OpenAI so the consultation flow never breaks.

import OpenAI from 'openai'
import { normaliseJsonFraming, parseJsonLossless } from '@/lib/llm/json-recovery'

export type LLMProvider = 'openai' | 'deepseek'
export type LLMReasoningEffort = 'none' | 'low' | 'medium' | 'high'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  // Required when role === 'tool' (echoing a tool call result back).
  tool_call_id?: string
  // Optional name (assistant tool result chaining).
  name?: string
}

export interface LLMToolDefinition {
  // Subset of OpenAI's chat completion tool schema. JSON Schema for parameters.
  name: string
  description: string
  parameters: Record<string, any>
}

export interface LLMToolCall {
  id: string
  name: string
  // Raw JSON string from the model. Caller is responsible for parsing.
  argumentsRaw: string
}

export interface LLMCallParams {
  useCase: string
  messages: LLMMessage[]
  maxTokens?: number
  responseFormat?: 'text' | 'json_object'
  reasoningEffort?: LLMReasoningEffort
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  timeoutMs?: number
  tools?: LLMToolDefinition[]
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  /**
   * Override the model resolved from env vars for THIS call only. Useful when
   * a fast/cheap variant of the active provider is preferred for an auxiliary
   * task (e.g. deepseek-chat for a re-ranker while diagnosis uses
   * deepseek-v4-pro). When undefined, the default resolution via
   * DEEPSEEK_MODEL / OPENAI_MODEL env vars applies.
   */
  model?: string
  /**
   * Provider this call prefers when no LLM_PROVIDER_<USECASE> env var is set.
   * The env var still wins in both directions, so ops keeps the last word;
   * this only moves the default off OpenAI for a use case that needs it —
   * e.g. one running in front of a waiting doctor, where latency decides.
   */
  provider?: LLMProvider
}

export interface LLMUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export interface LLMResult {
  text: string
  toolCalls?: LLMToolCall[]
  /**
   * Raw `finish_reason` from the provider ('stop' | 'length' | 'tool_calls' | …).
   * Until 02/09 this was dropped here and hard-coded to 'unknown' at the
   * diagnosis call site, which made every truncation indistinguishable from a
   * clean completion. Callers now get the real value.
   */
  finishReason?: string | null
  provider: LLMProvider
  model: string
  usage?: LLMUsage
  latencyMs: number
  fallbackUsed: boolean
  attempts: number
}

const OPENAI_DEFAULT_MODEL = 'gpt-5.5'
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-v4-pro'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_TIMEOUT_MS = 90_000

let openaiClient: OpenAI | null = null
let deepseekClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openaiClient
}

function getDeepSeekClient(): OpenAI {
  if (!deepseekClient) {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not set')
    }
    deepseekClient = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || DEEPSEEK_BASE_URL,
    })
  }
  return deepseekClient
}

function resolveProvider(useCase: string, preferred?: LLMProvider): LLMProvider {
  const flag = process.env[`LLM_PROVIDER_${useCase.toUpperCase()}`]
  if (flag === 'deepseek') return 'deepseek'
  // Explicit 'openai' in the env is now honoured too, so ops can force a
  // use-case back to OpenAI without editing the call site.
  if (flag === 'openai') return 'openai'
  return preferred ?? 'openai'
}

function resolveModel(provider: LLMProvider): string {
  if (provider === 'deepseek') {
    return process.env.DEEPSEEK_MODEL || DEEPSEEK_DEFAULT_MODEL
  }
  return process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL
}

interface RawCompletion {
  text: string
  toolCalls?: LLMToolCall[]
  usage?: LLMUsage
  finishReason?: string | null
}

/**
 * A response that arrived with HTTP 200 and is nonetheless unusable.
 *
 * Two shapes, both observed in production on DeepSeek in `json_object` mode:
 *
 *   - 'empty'           — content is blank or pure whitespace. On 01/09 at
 *                         14:48 the retry came back in 4.3s with 186
 *                         characters of spaces.
 *   - 'unparsable_json'  — JSON that no lossless repair can parse. Same
 *                         consultation, first attempt: 22 440 characters
 *                         with a syntax error at position 15418.
 *
 * Both used to sail through as successes, so the automatic DeepSeek → OpenAI
 * fallback never fired and the failure surfaced to the doctor as "Invalid
 * JSON structure". Modelled as an error so the existing safety net catches
 * them like any provider outage.
 */
export class LLMUnusableResponseError extends Error {
  constructor(
    public kind: 'empty' | 'unparsable_json',
    public provider: LLMProvider,
    public model: string,
    message: string,
  ) {
    super(message)
    this.name = 'LLMUnusableResponseError'
  }
}

/**
 * Decide whether what came back can be handed to the caller, and repair it
 * losslessly when that is enough.
 *
 * Returns the text to use. Throws `LLMUnusableResponseError` otherwise —
 * never returns partial or salvaged clinical content.
 *
 * `canRegenerate` says whether refusing this response actually buys anything:
 * it is true only when another provider is still going to be tried. With no
 * fallback left, several callers have their own recovery ladder and are better
 * placed to decide (chronic and dermatology parse through
 * parseLLMJsonSafely), so the response is handed over untouched exactly as it
 * was before this check existed. Refusing there would replace a degraded
 * answer with no answer.
 */
function vetResponse(
  text: string,
  toolCalls: LLMToolCall[] | undefined,
  params: LLMCallParams,
  provider: LLMProvider,
  model: string,
  finishReason: string | null | undefined,
  canRegenerate: boolean,
): string {
  // A tool call legitimately carries no message content.
  if (toolCalls && toolCalls.length > 0) return text

  if (!text.trim()) {
    if (!canRegenerate) {
      console.error(
        `[llm] use=${params.useCase} provider=${provider} model=${model} returned an empty response ` +
          `(${text.length} chars, finish=${finishReason ?? 'n/a'}) and there is no fallback left to try`,
      )
      return text
    }
    throw new LLMUnusableResponseError(
      'empty',
      provider,
      model,
      `${provider}/${model} returned an empty response (${text.length} chars of whitespace, finish_reason=${finishReason ?? 'n/a'})`,
    )
  }

  if (params.responseFormat !== 'json_object') return text

  // Framing first, so this check is never stricter than what the callers
  // already tolerate on their side (fenced blocks, a stray closing sentence).
  const parsed = parseJsonLossless(normaliseJsonFraming(text))
  if (parsed.ok) {
    if (parsed.repair !== 'none') {
      console.warn(
        `[llm] use=${params.useCase} provider=${provider} model=${model} ` +
          `json repaired losslessly (${parsed.repair}) — no content dropped`,
      )
    }
    return parsed.text
  }

  if (!canRegenerate) {
    console.error(
      `[llm] use=${params.useCase} provider=${provider} model=${model} returned unparsable JSON ` +
        `(${text.length} chars, finish=${finishReason ?? 'n/a'}: ${parsed.error.message}) and there is ` +
        `no fallback left to try — handing it to the caller's own recovery`,
    )
    return text
  }

  throw new LLMUnusableResponseError(
    'unparsable_json',
    provider,
    model,
    `${provider}/${model} returned JSON that will not parse (${text.length} chars, ` +
      `finish_reason=${finishReason ?? 'n/a'}): ${parsed.error.message}`,
  )
}

async function callProvider(
  provider: LLMProvider,
  model: string,
  params: LLMCallParams,
  canRegenerate: boolean,
): Promise<RawCompletion> {
  const client = provider === 'deepseek' ? getDeepSeekClient() : getOpenAIClient()
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS

  // Param mapping:
  // - OpenAI gpt-5.5 expects `max_completion_tokens` (newer reasoning models)
  // - DeepSeek expects `max_tokens` (standard chat completions)
  const tokenParam = provider === 'deepseek'
    ? { max_tokens: params.maxTokens }
    : { max_completion_tokens: params.maxTokens }

  // `reasoning_effort` is supported by OpenAI gpt-5.5 and by DeepSeek V4-Pro
  // (low | medium | high). 'none' means we omit the param.
  const reasoningParam = params.reasoningEffort && params.reasoningEffort !== 'none'
    ? { reasoning_effort: params.reasoningEffort }
    : {}

  const responseFormatParam = params.responseFormat === 'json_object'
    ? { response_format: { type: 'json_object' as const } }
    : {}

  const toolsParam = params.tools && params.tools.length > 0
    ? {
        tools: params.tools.map((t) => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        ...(params.toolChoice !== undefined ? { tool_choice: params.toolChoice } : {}),
      }
    : {}

  const completion = await client.chat.completions.create(
    {
      model,
      messages: params.messages as any,
      ...tokenParam,
      ...reasoningParam,
      ...responseFormatParam,
      ...toolsParam,
      ...(params.topP !== undefined ? { top_p: params.topP } : {}),
      ...(params.frequencyPenalty !== undefined ? { frequency_penalty: params.frequencyPenalty } : {}),
      ...(params.presencePenalty !== undefined ? { presence_penalty: params.presencePenalty } : {}),
    },
    { timeout: timeoutMs },
  )

  const choice = completion.choices[0]
  const text = choice?.message?.content ?? ''
  const rawToolCalls = (choice?.message as any)?.tool_calls
  const toolCalls: LLMToolCall[] | undefined = Array.isArray(rawToolCalls) && rawToolCalls.length > 0
    ? rawToolCalls
        .filter((tc: any) => tc?.type === 'function' && tc?.function?.name)
        .map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          argumentsRaw: tc.function.arguments ?? '',
        }))
    : undefined

  const usage: LLMUsage | undefined = completion.usage
    ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      }
    : undefined

  const finishReason = (choice?.finish_reason ?? null) as string | null

  // Vetting happens here, inside the provider call, so both the primary and
  // the fallback path are held to the same bar.
  const vettedText = vetResponse(text, toolCalls, params, provider, model, finishReason, canRegenerate)

  return { text: vettedText, toolCalls, usage, finishReason }
}

function isRetriableError(err: any): boolean {
  // A 200 that carries nothing usable is a provider failure like any other:
  // asking the other provider is exactly the right move.
  if (err instanceof LLMUnusableResponseError) return true
  // Retry/fallback on: network timeouts, 5xx, rate limits, JSON parse, abort.
  const status = err?.status ?? err?.response?.status
  if (typeof status === 'number' && (status >= 500 || status === 429)) return true
  const code = err?.code ?? err?.cause?.code
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ABORT_ERR') return true
  if (err?.name === 'AbortError') return true
  return false
}

export async function callLLM(params: LLMCallParams): Promise<LLMResult> {
  const startedAt = Date.now()
  const primaryProvider = resolveProvider(params.useCase, params.provider)
  // A model override only applies when the provider actually resolved to the
  // one the caller had in mind. Otherwise an env flag flipping the provider
  // would send e.g. a DeepSeek model name to OpenAI and fail every call.
  const modelOverrideApplies = !params.provider || params.provider === primaryProvider
  const primaryModel = (modelOverrideApplies ? params.model : undefined) ?? resolveModel(primaryProvider)
  // When LLM_DISABLE_FALLBACK=true we never silently fall back to OpenAI on
  // a DeepSeek error. Useful during A/B testing so DeepSeek is judged on its
  // own merits without the safety net masking outages or timeouts.
  const fallbackDisabled = process.env.LLM_DISABLE_FALLBACK === 'true'

  let attempts = 0

  try {
    attempts++
    // Refusing an unusable response is only worth it while the OpenAI fallback
    // is still ahead of us.
    const canRegenerate = primaryProvider === 'deepseek' && !fallbackDisabled
    const { text, toolCalls, usage, finishReason } = await callProvider(
      primaryProvider,
      primaryModel,
      params,
      canRegenerate,
    )
    const latencyMs = Date.now() - startedAt
    console.log(
      `[llm] use=${params.useCase} provider=${primaryProvider} model=${primaryModel} latency=${latencyMs}ms ` +
        `tokens=${usage?.totalTokens ?? 'n/a'} completion_tokens=${usage?.completionTokens ?? 'n/a'} ` +
        `finish=${finishReason ?? 'n/a'} chars=${text.length} toolCalls=${toolCalls?.length ?? 0}`,
    )
    return {
      text,
      toolCalls,
      finishReason,
      provider: primaryProvider,
      model: primaryModel,
      usage,
      latencyMs,
      fallbackUsed: false,
      attempts,
    }
  } catch (err: any) {
    if (primaryProvider !== 'deepseek' || !isRetriableError(err) || fallbackDisabled) {
      if (fallbackDisabled && primaryProvider === 'deepseek') {
        console.warn(`[llm] DeepSeek failed for use=${params.useCase} and fallback is DISABLED (LLM_DISABLE_FALLBACK=true). Propagating error.`)
      }
      throw err
    }
    const cause = err instanceof LLMUnusableResponseError ? `unusable_response:${err.kind}` : 'error'
    console.warn(`[llm] DeepSeek failed for use=${params.useCase} (${cause}): ${err?.message || err}. Falling back to OpenAI.`)
  }

  // Fallback path: only triggered when primary was DeepSeek and error is retriable.
  const fallbackModel = resolveModel('openai')
  attempts++
  // Last provider standing: whatever it returns goes to the caller.
  const { text, toolCalls, usage, finishReason } = await callProvider('openai', fallbackModel, params, false)
  const latencyMs = Date.now() - startedAt
  console.log(
    `[llm] use=${params.useCase} provider=openai(fallback) model=${fallbackModel} latency=${latencyMs}ms ` +
      `tokens=${usage?.totalTokens ?? 'n/a'} completion_tokens=${usage?.completionTokens ?? 'n/a'} ` +
      `finish=${finishReason ?? 'n/a'} chars=${text.length} toolCalls=${toolCalls?.length ?? 0}`,
  )
  return {
    text,
    toolCalls,
    finishReason,
    provider: 'openai',
    model: fallbackModel,
    usage,
    latencyMs,
    fallbackUsed: true,
    attempts,
  }
}
