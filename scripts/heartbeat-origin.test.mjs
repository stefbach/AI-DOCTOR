// La regle exacte de isAllowedOrigin, testee comme le navigateur la voit.
const SELF = 'https://v0-medical-ai-expert.vercel.app'
globalThis.window = { location: { origin: SELF } }

const src = await import('fs').then(fs =>
  fs.readFileSync('new URL('../hooks/use-tibok-bridge.ts', import.meta.url)', 'utf8'))
const body = src.slice(src.indexOf('export function isAllowedOrigin'))
             .slice(0, src.slice(src.indexOf('export function isAllowedOrigin')).indexOf('\n}\n') + 2)
             .replace('export function', 'function')
             .replace(/: string\): boolean/, ')')
             .replace(/ as [A-Za-z]+/g, '')
const isAllowedOrigin = new Function(`${body}; return isAllowedOrigin`)()

const cases = [
  // [origine,                                          doit etre acceptee ?, pourquoi]
  [SELF,                                                false, 'NOTRE PROPRE domaine — la cause du bug'],
  ['https://v0-medical-ai-expert-git-claude-81d36c-bachs-projects-25b173f6.vercel.app', false, 'notre preview'],
  ['https://tibok.mu',                                  true,  'TIBOK production'],
  ['https://staging.tibok.mu',                          true,  'TIBOK staging'],
  ['http://localhost:3001',                             true,  'banc de test'],
  ['https://v0-tibokmain2.vercel.app',                  true,  'preview TIBOK'],
  ['https://attaquant.com',                             false, 'inconnu'],
  ['http://tibok.mu',                                   false, 'non chiffre'],
  ['',                                                  false, 'vide'],
]
let bad = 0
for (const [origin, expected, why] of cases) {
  const got = isAllowedOrigin(origin)
  const ok = got === expected
  if (!ok) bad++
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${String(got).padEnd(5)} attendu ${String(expected).padEnd(5)}  ${origin || '(vide)'}  — ${why}`)
}
console.log(bad === 0 ? '\n*** LA REGLE EST CORRECTE ***' : `\n*** ${bad} ECHEC(S) ***`)
process.exit(bad ? 1 : 0)
