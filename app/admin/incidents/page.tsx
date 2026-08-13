"use client"

// app/admin/incidents/page.tsx
//
// What the black box recorded. One row per distinct problem, newest first,
// expandable into the breadcrumb trail that led to it — the sequence that was
// missing on 13/08 when a consultation died and the only evidence was an API
// call that never arrived.
//
// Reads through /api/incidents, which uses the service role. The page itself
// never touches Supabase.

import * as React from "react"
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Timer,
} from "lucide-react"

interface Breadcrumb {
  t: number
  type: string
  name: string
  status?: number
  ms?: number
  ok?: boolean
}

interface IncidentGroup {
  key: string
  kind: string
  severity: string
  message: string
  count: number
  firstSeen: string
  lastSeen: string
  consultations: string[]
  sample: {
    pathname?: string
    stack?: string
    breadcrumbs?: Breadcrumb[]
    user_agent?: string
    viewport?: string
    commit_sha?: string
    session_id?: string
    consultation_id?: string
    doctor_id?: string
  }
}

const KIND_LABEL: Record<string, string> = {
  render_crash: "Écran blanc (crash de rendu)",
  js_error: "Erreur JavaScript",
  unhandled_rejection: "Promesse rejetée",
  api_error: "Appel API en échec",
  slow_request: "Requête anormalement lente",
  boot_stall: "Démarrage bloqué",
}

const KIND_STYLE: Record<string, string> = {
  render_crash: "bg-red-600 text-white",
  js_error: "bg-red-500 text-white",
  unhandled_rejection: "bg-orange-500 text-white",
  api_error: "bg-orange-400 text-orange-950",
  slow_request: "bg-amber-400 text-amber-950",
  boot_stall: "bg-amber-500 text-amber-950",
}

const WINDOWS = [
  { label: "1 h", hours: 1 },
  { label: "24 h", hours: 24 },
  { label: "7 j", hours: 168 },
  { label: "30 j", hours: 720 },
]

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return iso
  }
}

function BreadcrumbTrail({ crumbs }: { crumbs: Breadcrumb[] }) {
  if (!crumbs?.length) {
    return <p className="text-xs text-gray-500">Aucun fil d'Ariane enregistré.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead className="text-gray-500">
          <tr>
            <th className="py-1 pr-3 font-medium">T+</th>
            <th className="py-1 pr-3 font-medium">Type</th>
            <th className="py-1 pr-3 font-medium">Événement</th>
            <th className="py-1 pr-3 font-medium">Statut</th>
            <th className="py-1 font-medium">Durée</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {crumbs.map((c, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="py-1 pr-3 text-gray-500">{(c.t / 1000).toFixed(1)}s</td>
              <td className="py-1 pr-3 text-gray-600">{c.type}</td>
              <td className="py-1 pr-3 break-all text-gray-900">{c.name}</td>
              <td className="py-1 pr-3">
                {c.status !== undefined ? (
                  <span className={c.ok ? "text-green-700" : "text-red-700"}>{c.status}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="py-1 text-gray-600">{c.ms !== undefined ? `${c.ms}ms` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Polling interval. This page is meant to be left open during a shift. */
const POLL_MS = 30_000

export default function IncidentsPage() {
  const [hours, setHours] = React.useState(24)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [groups, setGroups] = React.useState<IncidentGroup[]>([])
  const [total, setTotal] = React.useState(0)
  const [expanded, setExpanded] = React.useState<string | null>(null)
  const [lastChecked, setLastChecked] = React.useState<Date | null>(null)
  const [newCount, setNewCount] = React.useState(0)

  // Most recent incident already seen by a human, i.e. while the tab was in
  // front. Anything after it counts as new.
  const seenUpToRef = React.useRef<string | null>(null)

  const load = React.useCallback(
    async (opts?: { background?: boolean }) => {
      if (!opts?.background) setLoading(true)
      try {
        const response = await fetch(`/api/incidents?hours=${hours}`)
        const data = await response.json()
        if (!data?.success) throw new Error(data?.error || "Chargement impossible")

        const nextGroups: IncidentGroup[] = data.groups || []
        setGroups(nextGroups)
        setTotal(data.total || 0)
        setError(null)
        setLastChecked(new Date())

        const newest = nextGroups.reduce<string | null>(
          (max, g) => (!max || g.lastSeen > max ? g.lastSeen : max),
          null,
        )

        if (typeof document !== "undefined" && document.hidden) {
          // Nobody is looking: accumulate a badge instead of silently updating.
          if (newest && seenUpToRef.current && newest > seenUpToRef.current) {
            setNewCount(
              nextGroups.filter((g) => g.lastSeen > (seenUpToRef.current as string)).length,
            )
          }
        } else {
          seenUpToRef.current = newest
          setNewCount(0)
        }
      } catch (err: any) {
        setError(err?.message || "Chargement impossible")
        if (!opts?.background) {
          setGroups([])
          setTotal(0)
        }
      } finally {
        if (!opts?.background) setLoading(false)
      }
    },
    [hours],
  )

  React.useEffect(() => {
    load()
  }, [load])

  // Poll, so leaving the page open during a shift actually shows what arrives.
  // Without this it only ever displayed the snapshot taken on mount.
  React.useEffect(() => {
    const id = setInterval(() => load({ background: true }), POLL_MS)
    return () => clearInterval(id)
  }, [load])

  // Coming back to the tab clears the badge and refreshes immediately.
  React.useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        setNewCount(0)
        load({ background: true })
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [load])

  // The tab title is the only thing visible when the page is in the background,
  // which is exactly how it will be used during a shift.
  React.useEffect(() => {
    document.title = newCount > 0 ? `(${newCount}) Incidents` : "Incidents"
    return () => {
      document.title = "Incidents"
    }
  }, [newCount])

  const isNew = React.useCallback(
    (g: IncidentGroup) => !!seenUpToRef.current && g.lastSeen > seenUpToRef.current,
    [],
  )

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <ShieldAlert className="h-6 w-6 text-blue-600" />
              Incidents
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Ce que la boîte noire a enregistré dans le navigateur des médecins.
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Vérification automatique toutes les 30 s
              {lastChecked && ` · dernière à ${lastChecked.toLocaleTimeString("fr-FR")}`}
              {newCount > 0 && (
                <span className="ml-1 font-semibold text-red-600">
                  · {newCount} nouveau(x)
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-gray-300 bg-white">
              {WINDOWS.map((w) => (
                <button
                  key={w.hours}
                  onClick={() => setHours(w.hours)}
                  className={`px-3 py-1.5 text-xs font-medium transition ${
                    hours === w.hours ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mt-10 flex flex-col items-center gap-2 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Chargement…</p>
          </div>
        ) : groups.length === 0 && !error ? (
          <div className="mt-6 rounded-md border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">
              Aucun incident sur la période. Rien à signaler.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs text-gray-500">
              {groups.length} problème(s) distinct(s) · {total} événement(s) au total
            </p>

            <div className="mt-2 space-y-2">
              {groups.map((g) => {
                const isOpen = expanded === g.key
                return (
                  <div
                    key={g.key}
                    className={`rounded-md border bg-white shadow-sm ${
                      isNew(g) ? "border-l-4 border-l-red-500 border-gray-200" : "border-gray-200"
                    }`}
                  >
                    <button
                      onClick={() => setExpanded(isOpen ? null : g.key)}
                      className="flex w-full items-start gap-2 p-3 text-left"
                    >
                      {isOpen ? (
                        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              KIND_STYLE[g.kind] || "bg-gray-500 text-white"
                            }`}
                          >
                            {KIND_LABEL[g.kind] || g.kind}
                          </span>
                          {g.count > 1 && (
                            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              ×{g.count}
                            </span>
                          )}
                          {g.sample?.pathname && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-700">
                              {g.sample.pathname}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 break-words text-sm font-medium text-gray-900">
                          {g.message}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(g.lastSeen)}
                          </span>
                          {g.count > 1 && (
                            <span className="inline-flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              1<sup>re</sup> fois {formatTime(g.firstSeen)}
                            </span>
                          )}
                          {g.consultations.length > 0 && (
                            <span>
                              {g.consultations.length} consultation(s) touchée(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="space-y-3 border-t border-gray-100 p-3">
                        <div className="grid gap-2 text-xs sm:grid-cols-2">
                          <div>
                            <p className="font-semibold text-gray-700">Consultations</p>
                            <p className="mt-0.5 break-all font-mono text-gray-600">
                              {g.consultations.length ? g.consultations.join(", ") : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Médecin</p>
                            <p className="mt-0.5 break-all font-mono text-gray-600">
                              {g.sample?.doctor_id || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Appareil</p>
                            <p className="mt-0.5 break-words text-gray-600">
                              {g.sample?.viewport || "?"} · {g.sample?.user_agent || "?"}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700">Build</p>
                            <p className="mt-0.5 font-mono text-gray-600">
                              {g.sample?.commit_sha?.slice(0, 8) || "—"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-700">Fil d'Ariane</p>
                          <div className="mt-1 rounded border border-gray-200 bg-gray-50 p-2">
                            <BreadcrumbTrail crumbs={g.sample?.breadcrumbs || []} />
                          </div>
                        </div>

                        {g.sample?.stack && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700">Pile d'appels</p>
                            <pre className="mt-1 max-h-64 overflow-auto rounded border border-gray-200 bg-gray-900 p-2 font-mono text-[11px] leading-relaxed text-gray-100">
                              {g.sample.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <p className="mt-6 text-[11px] leading-relaxed text-gray-500">
          Cette page ne contient aucune donnée clinique : uniquement des identifiants, des noms
          d'événements, des codes HTTP et des durées. Les chemins sont enregistrés sans leur chaîne
          de requête, car TIBOK y fait transiter les données patient.
        </p>
      </div>
    </div>
  )
}
