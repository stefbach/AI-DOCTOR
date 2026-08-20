// scripts/heartbeat-origin.test.mjs
//
// Which origins may be treated as the page containing us.
//
// Pinned because getting this wrong is not a small bug: our own deployment
// answers to *.vercel.app, so it once passed this whitelist, the heartbeat
// learned itself as the parent, TIBOK heard nothing and reloaded the iframe
// under a doctor who was mid-sentence.
//
// Run: node scripts/heartbeat-origin.test.mjs

import { readFileSync } from 'fs'

const SELF = 'https://v0-medical-ai-expert.vercel.app'
globalThis.window = { location: { origin: SELF } }

const src = readFileSync(new URL('../hooks/use-tibok-bridge.ts', import.meta.url), 'utf8')
const from = src.indexOf('export function isAllowedOrigin')
const body = src
  .slice(from, from + src.slice(from).indexOf('\n}\n') + 2)
  .replace('export function', 'function')
  .replace(/: string\): boolean/, ')')
const isAllowedOrigin = new Function(`${body}; return isAllowedOrigin`)()

const cases = [
  [SELF, false, 'our own origin — the one that caused the incident'],
  ['https://v0-medical-ai-expert-git-claude-81d36c-bachs-projects-25b173f6.vercel.app', false, 'our branch preview'],
  ['https://tibok.mu', true, 'TIBOK production'],
  ['https://staging.tibok.mu', true, 'TIBOK staging'],
  ['http://localhost:3001', true, 'local test parent'],
  ['https://v0-tibokmain2.vercel.app', true, 'a TIBOK preview'],
  ['https://attacker.com', false, 'unknown host'],
  ['http://tibok.mu', false, 'not https'],
  ['', false, 'empty'],
]

let failed = 0
for (const [origin, expected, why] of cases) {
  const got = isAllowedOrigin(origin)
  const ok = got === expected
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${String(got).padEnd(5)} expected ${String(expected).padEnd(5)}  ${origin || '(empty)'}  — ${why}`)
}
console.log(failed === 0 ? '\nAll origin rules hold.' : `\n${failed} failure(s).`)
process.exit(failed ? 1 : 0)
