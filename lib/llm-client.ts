// lib/llm-client.ts
// Unified LLM client with provider switching (OpenAI / DeepSeek) per use-case.
// Default provider is OpenAI. DeepSeek is opt-in per use-case via env var
// `LLM_PROVIDER_<USECASE>=deepseek` (configured in Vercel).
// On any DeepSeek failure (timeout, 5xx, parse error), the wrapper falls
// back automatically to OpenAI so the consultation flow never breaks.

import OpenAI from 'openai'

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
}

async function callProvider(
  provider: LLMProvider,
  model: string,
  params: LLMCallParams,
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

  return { text, toolCalls, usage }
}

function isRetriableError(err: any): boolean {
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
  const primaryModel = params.model ?? resolveModel(primaryProvider)
  // When LLM_DISABLE_FALLBACK=true we never silently fall back to OpenAI on
  // a DeepSeek error. Useful during A/B testing so DeepSeek is judged on its
  // own merits without the safety net masking outages or timeouts.
  const fallbackDisabled = process.env.LLM_DISABLE_FALLBACK === 'true'

  let attempts = 0

  try {
    attempts++
    const { text, toolCalls, usage } = await callProvider(primaryProvider, primaryModel, params)
    const latencyMs = Date.now() - startedAt
    console.log(`[llm] use=${params.useCase} provider=${primaryProvider} model=${primaryModel} latency=${latencyMs}ms tokens=${usage?.totalTokens ?? 'n/a'} toolCalls=${toolCalls?.length ?? 0}`)
    return {
      text,
      toolCalls,
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
    console.warn(`[llm] DeepSeek failed for use=${params.useCase}: ${err?.message || err}. Falling back to OpenAI.`)
  }

  // Fallback path: only triggered when primary was DeepSeek and error is retriable.
  const fallbackModel = resolveModel('openai')
  attempts++
  const { text, toolCalls, usage } = await callProvider('openai', fallbackModel, params)
  const latencyMs = Date.now() - startedAt
  console.log(`[llm] use=${params.useCase} provider=openai(fallback) model=${fallbackModel} latency=${latencyMs}ms tokens=${usage?.totalTokens ?? 'n/a'} toolCalls=${toolCalls?.length ?? 0}`)
  return {
    text,
    toolCalls,
    provider: 'openai',
    model: fallbackModel,
    usage,
    latencyMs,
    fallbackUsed: true,
    attempts,
  }
}
