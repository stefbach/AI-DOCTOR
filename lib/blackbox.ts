// lib/blackbox.ts
//
// Flight recorder for the doctor-facing app.
//
// Vercel logs the server only. When the consultation UI crashed on 13/08/2026
// the entire evidence was an API call that never arrived — the browser's side
// of the story was gone with the tab. This module keeps a rolling buffer of
// what just happened and ships it when something goes wrong.
//
// Three rules govern everything here, in this order:
//
//   1. IT MUST NEVER BREAK A CONSULTATION. Every entry point is wrapped, the
//      fetch patch returns the original promise untouched, and any internal
//      failure is swallowed. A telemetry bug that costs a paid consultation
//      would be worse than the blindness it fixes.
//   2. NO CLINICAL CONTENT, EVER. Breadcrumbs carry identifiers, event names,
//      HTTP statuses and durations. Never a body, never a query string (TIBOK
//      passes patient data in the URL), never a chief complaint or diagnosis.
//   3. BOUNDED. Fixed-size buffer, capped reports per page load, so a render
//      loop cannot flood the table or the network.

export type BreadcrumbType = "nav" | "fetch" | "step" | "error" | "info"

export interface Breadcrumb {
  /** Milliseconds since this page load — relative time reads better in a trace. */
  t: number
  type: BreadcrumbType
  name: string
  status?: number
  ms?: number
  ok?: boolean
}

export type IncidentKind =
  | "render_crash"
  | "js_error"
  | "unhandled_rejection"
  | "api_error"
  | "slow_request"
  | "boot_stall"

const MAX_BREADCRUMBS = 50
const MAX_REPORTS_PER_PAGE = 5
const SLOW_REQUEST_MS = 15_000
const BOOT_STALL_MS = 30_000
const MAX_STACK_CHARS = 4000

/** Reports waiting to be delivered, across page loads. */
const OUTBOX_KEY = "blackbox_outbox_v1"
const MAX_OUTBOX = 20
/** Stop retrying a report the server keeps refusing. */
const MAX_DELIVERY_ATTEMPTS = 10

const state = {
  installed: false,
  startedAt: 0,
  sessionId: "",
  breadcrumbs: [] as Breadcrumb[],
  reportsSent: 0,
  /** Signatures already reported, so one recurring error is not sent N times. */
  seen: new Set<string>(),
  /** Unpatched fetch, so delivery never re-enters our own instrumentation. */
  nativeFetch: null as typeof fetch | null,
  /** Fallback outbox when localStorage is unavailable (iframe partitioning). */
  memoryOutbox: [] as any[],
  flushing: false,
  /** In-flight requests, for the slow-request watchdog. */
  pending: new Map<number, { url: string; startedAt: number; warned: boolean }>(),
  requestSeq: 0,
  anyRequestCompleted: false,
  watchdog: null as ReturnType<typeof setInterval> | null,
}

const now = () => Date.now()
const sinceStart = () => (state.startedAt ? now() - state.startedAt : 0)

function makeSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  return `s-${now()}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

/**
 * Path without its query string. TIBOK passes `patientData`, `medicalData` and
 * `doctorData` as URL parameters, so a raw URL is clinical content.
 */
function safePath(input: string): string {
  try {
    const url = new URL(input, typeof window !== "undefined" ? window.location.origin : "http://x")
    return url.pathname
  } catch {
    const q = String(input || "").split("?")[0]
    return q.slice(0, 200)
  }
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export function addBreadcrumb(type: BreadcrumbType, name: string, extra?: Partial<Breadcrumb>): void {
  try {
    state.breadcrumbs.push({ t: sinceStart(), type, name: String(name).slice(0, 200), ...extra })
    if (state.breadcrumbs.length > MAX_BREADCRUMBS) {
      state.breadcrumbs.splice(0, state.breadcrumbs.length - MAX_BREADCRUMBS)
    }
  } catch {
    /* never throw from telemetry */
  }
}

/**
 * Mark a milestone in the consultation flow, e.g. markStep('diagnosis:submitted').
 * Exported for pages to call; the recorder works without it, this only makes the
 * trace easier to read.
 */
export function markStep(name: string): void {
  addBreadcrumb("step", name)
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function collectContext() {
  let params: URLSearchParams | null = null
  try {
    params = new URLSearchParams(window.location.search)
  } catch {
    /* ignore */
  }

  const pick = (sessionKey: string, urlKey: string) =>
    readSession(sessionKey) || params?.get(urlKey) || null

  let consultationId = pick("tibokConsultationId", "consultationId")
  let patientId = params?.get("patientId") || null
  let doctorId = params?.get("doctorId") || null

  // The workflow pages are reached through a query-stripping router.push, so
  // after the hub the ids only survive in sessionStorage.
  try {
    const stored = readSession("consultationPatientData")
    if (stored) {
      const parsed = JSON.parse(stored)
      consultationId = consultationId || parsed?.consultationId || null
      patientId = patientId || parsed?.patientId || null
      doctorId = doctorId || parsed?.doctorId || null
    }
  } catch {
    /* ignore */
  }

  return {
    pathname: typeof window !== "undefined" ? window.location.pathname : "",
    consultationId,
    patientId,
    doctorId,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : "",
    viewport:
      typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
    commitSha: process.env.NEXT_PUBLIC_COMMIT_SHA || null,
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export interface ReportInput {
  kind: IncidentKind
  message: string
  stack?: string | null
  severity?: "error" | "warning"
}

// --- Outbox --------------------------------------------------------------
//
// A report is queued first and delivered second, because the two can be far
// apart. The first version sent reports straight out and lost every one raised
// while the network was down — which is exactly when a report matters most.
// navigator.sendBeacon returns true once the browser has QUEUED the request,
// not when it has been delivered, so an offline beacon reads as a success and
// vanishes. Delivery is now confirmed by an actual response, and anything
// undelivered survives in localStorage until the connection comes back — even
// across a reload or a crash that killed the tab.

function readOutbox(): any[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
    return []
  } catch {
    // localStorage can be unavailable inside the TIBOK iframe (third-party
    // storage partitioning) or in private mode. Degrade to memory.
    return state.memoryOutbox
  }
}

function writeOutbox(entries: any[]): void {
  state.memoryOutbox = entries
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries))
  } catch {
    /* memory-only is an acceptable degradation */
  }
}

function enqueue(payload: any): void {
  const entries = readOutbox()
  entries.push(payload)
  // Oldest first out: a flood must not push out the report that explains it,
  // but an unbounded queue must not grow either.
  while (entries.length > MAX_OUTBOX) entries.shift()
  writeOutbox(entries)
}

/**
 * Try to deliver everything queued. Stops at the first failure rather than
 * hammering a dead connection; the next trigger (online event, watchdog tick,
 * next page load) will pick up where it left off.
 */
async function flushOutbox(): Promise<void> {
  if (state.flushing) return
  state.flushing = true
  try {
    const send = state.nativeFetch || fetch
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const entries = readOutbox()
      if (!entries.length) break

      const entry = entries[0]
      let delivered = false
      try {
        const response = await send("/api/client-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
          keepalive: true,
          cache: "no-store",
        })
        // The status alone is not the outcome: the ingest route answers 200
        // even when it drops a report, so that a telemetry failure never adds
        // console noise on top of whatever already went wrong. Trusting the
        // status made the outbox discard reports the database had refused.
        const result = await response.json().catch(() => null)
        delivered = response?.ok === true && result?.success === true
      } catch {
        delivered = false
      }

      if (!delivered) {
        // Give up on an entry the server keeps refusing, so a permanently
        // broken endpoint cannot have us retrying for the whole consultation.
        const tries = (entry._tries || 0) + 1
        const remaining = readOutbox()
        if (tries >= MAX_DELIVERY_ATTEMPTS) {
          writeOutbox(remaining.filter((e: any) => e?._id !== entry?._id))
        } else if (remaining[0]?._id === entry?._id) {
          remaining[0] = { ...entry, _tries: tries }
          writeOutbox(remaining)
        }
        break
      }

      // Re-read: something may have been queued while we were awaiting.
      writeOutbox(readOutbox().filter((e: any) => e?._id !== entry?._id))
    }
  } catch {
    /* never throw from telemetry */
  } finally {
    state.flushing = false
  }
}

/**
 * Record an incident. Queued immediately, delivered when the network allows.
 * Never awaited, never allowed to surface an error to the caller.
 */
export function report(input: ReportInput): void {
  try {
    if (typeof window === "undefined") return
    if (state.reportsSent >= MAX_REPORTS_PER_PAGE) return

    const signature = `${input.kind}|${(input.message || "").slice(0, 160)}`
    if (state.seen.has(signature)) return
    state.seen.add(signature)
    state.reportsSent++

    const ctx = collectContext()
    enqueue({
      _id: makeSessionId(),
      kind: input.kind,
      severity: input.severity || "error",
      message: String(input.message || "unknown").slice(0, 1000),
      stack: input.stack ? String(input.stack).slice(0, MAX_STACK_CHARS) : null,
      sessionId: state.sessionId,
      occurredAt: new Date().toISOString(),
      breadcrumbs: state.breadcrumbs.slice(-MAX_BREADCRUMBS),
      ...ctx,
    })

    void flushOutbox()
  } catch {
    /* never throw from telemetry */
  }
}

/**
 * Last chance on the way out. The page is being torn down, so there is no time
 * to await a response — sendBeacon is the only transport that survives, and an
 * unconfirmed attempt beats none. Anything it drops stays in the outbox for
 * the next page load.
 */
function beaconPendingOnExit(): void {
  try {
    if (!navigator.sendBeacon) return
    for (const entry of readOutbox()) {
      navigator.sendBeacon(
        "/api/client-events",
        new Blob([JSON.stringify(entry)], { type: "application/json" }),
      )
    }
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Installation
// ---------------------------------------------------------------------------

const isOwnTraffic = (url: string) => url.includes("/api/client-events")

function patchFetch(): void {
  const original = window.fetch
  if (typeof original !== "function") return
  // Kept so outbox delivery bypasses our own instrumentation entirely.
  state.nativeFetch = original.bind(window) as typeof fetch

  window.fetch = function patchedFetch(this: any, ...args: Parameters<typeof fetch>) {
    let label = ""
    try {
      const first = args[0] as any
      label = safePath(typeof first === "string" ? first : (first?.url ?? String(first)))
    } catch {
      label = "unknown"
    }

    // The original call is never wrapped in anything that could alter it.
    const promise = original.apply(this, args)

    if (isOwnTraffic(label)) return promise

    try {
      const id = ++state.requestSeq
      const startedAt = now()
      state.pending.set(id, { url: label, startedAt, warned: false })

      const finish = (status: number | undefined, ok: boolean) => {
        try {
          state.pending.delete(id)
          state.anyRequestCompleted = true
          const ms = now() - startedAt
          addBreadcrumb("fetch", label, { status, ms, ok })

          // A 4xx is usually the app's own business logic; a 5xx or a network
          // failure is an incident worth a record.
          if (!ok && (status === undefined || status >= 500)) {
            report({
              kind: "api_error",
              severity: "warning",
              message: `${label} failed${status ? ` with ${status}` : " (network error)"} after ${ms}ms`,
            })
          }
        } catch {
          /* ignore */
        }
      }

      // Attaching a handler does not change `promise`, which is what we return.
      promise.then(
        (response: Response) => finish(response?.status, response?.ok !== false),
        (error: any) => {
          finish(undefined, false)
          try {
            addBreadcrumb("error", `fetch failed: ${label}`, { name: label } as any)
          } catch {
            /* ignore */
          }
          void error
        },
      )
    } catch {
      /* instrumentation must never affect the call */
    }

    return promise
  } as typeof fetch
}

function installWatchdogs(): void {
  state.watchdog = setInterval(() => {
    try {
      const elapsed = sinceStart()

      // A request that has been in flight far longer than any of ours should be.
      for (const [, entry] of state.pending) {
        if (entry.warned) continue
        const waiting = now() - entry.startedAt
        if (waiting >= SLOW_REQUEST_MS) {
          entry.warned = true
          addBreadcrumb("info", `slow: ${entry.url}`, { ms: waiting })
          report({
            kind: "slow_request",
            severity: "warning",
            message: `${entry.url} still pending after ${Math.round(waiting / 1000)}s`,
          })
        }
      }

      // Anything the network refused earlier gets another chance, without
      // waiting for a new incident to trigger delivery.
      void flushOutbox()

      // Nothing has completed since the page loaded. This is the shape of the
      // 13/08 incident: 26 seconds of dead air before the first API call, then
      // a hub that never issued its own.
      if (!state.anyRequestCompleted && elapsed >= BOOT_STALL_MS) {
        state.anyRequestCompleted = true // report once
        report({
          kind: "boot_stall",
          severity: "warning",
          message: `No request completed ${Math.round(elapsed / 1000)}s after page load`,
        })
      }
    } catch {
      /* ignore */
    }
  }, 5_000)
}

/**
 * Install the recorder. Idempotent, client-only, and safe to call from a
 * provider that React may mount twice in development.
 */
export function installBlackBox(): void {
  try {
    if (typeof window === "undefined" || state.installed) return
    state.installed = true
    state.startedAt = now()
    state.sessionId = makeSessionId()

    addBreadcrumb("nav", window.location.pathname)

    window.addEventListener("error", (event: ErrorEvent) => {
      try {
        // Resource load failures (a missing chunk, a broken image) surface here
        // with no message; they are worth knowing about but are not crashes.
        const message = event?.message || "Unknown script error"
        addBreadcrumb("error", message)
        report({
          kind: "js_error",
          message,
          stack: event?.error?.stack || `${event?.filename}:${event?.lineno}:${event?.colno}`,
        })
      } catch {
        /* ignore */
      }
    })

    window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
      try {
        const reason: any = event?.reason
        const message =
          (reason && (reason.message || reason.toString?.())) || "Unhandled promise rejection"
        addBreadcrumb("error", `rejection: ${message}`)
        report({
          kind: "unhandled_rejection",
          message,
          stack: reason?.stack || null,
        })
      } catch {
        /* ignore */
      }
    })

    // The connection coming back is the moment a queued report can finally
    // leave. This is what the offline test on 13/08 was missing.
    window.addEventListener("online", () => {
      addBreadcrumb("info", "network: online")
      void flushOutbox()
    })
    window.addEventListener("offline", () => addBreadcrumb("info", "network: offline"))

    // pagehide fires on tab close, navigation and mobile backgrounding, where
    // visibilitychange alone is not enough on Safari/iOS.
    window.addEventListener("pagehide", beaconPendingOnExit)

    patchFetch()
    installWatchdogs()

    // Deliver whatever a previous page load could not — including a report
    // written by the very crash that ended it.
    void flushOutbox()
  } catch {
    /* a recorder that cannot install must still not break the app */
  }
}

/** Called by the error boundary when React unmounts the tree. */
export function reportRenderCrash(error: Error & { digest?: string }): void {
  report({
    kind: "render_crash",
    message: error?.message || error?.digest || "React render crash",
    stack: error?.stack || null,
  })
}
