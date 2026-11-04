#!/usr/bin/env node
/**
 * Prueft das Host-Plugin ohne laufenden Harness:
 *  - es registriert sich fuer `webserver/index-inject`
 *  - es legt genau einen `style`-Block in die Tabelle
 *  - der Block enthaelt die gewaehlte Palette und kein "</style"
 *  - eine fehlende CSS-Datei wirft nicht und faerbt nichts kaputt
 *
 * Aufruf: node verify.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Script } from 'node:vm'
import { apply } from './plugin/index.js'

const root = dirname(fileURLToPath(import.meta.url))
const warns = []

function makeCtx() {
  const listeners = new Map()
  return {
    listeners,
    ctx: {
      on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, [])
        listeners.get(event).push(fn)
        return () => {}
      },
      logger: { warn: (msg) => warns.push(String(msg)) },
    },
  }
}

function collect(handle) {
  const table = []
  for (const fn of handle.listeners.get('webserver/index-inject') ?? []) fn(table)
  return table
}

let checks = 0
const ok = (label) => {
  checks += 1
  console.log(`  ✔ ${label}`)
}

// --- Fall 1: normale Palette ------------------------------------------------
process.env.DSH_VIVID_CSS = join(root, 'dist', 'aurora.css')
let handle = makeCtx()
apply(handle.ctx, {})
assert.ok(handle.listeners.has('webserver/index-inject'), 'Plugin hoert auf index-inject')
ok('registriert webserver/index-inject')

let table = collect(handle)
assert.equal(table.length, 1, 'genau eine Zeile')
assert.equal(table[0].kind, 'style', 'Zeile ist vom kind "style"')
ok('genau eine style-Zeile')

const css = table[0].text
assert.ok(css.includes('--vv-accent'), 'CSS enthaelt Vivid-Variablen')
assert.ok(css.includes('--dsw-alias-bg-base'), 'CSS ueberschreibt DSH-Tokens')
assert.ok(!css.includes('</style'), 'CSS schliesst den style-Block nicht vorzeitig')
ok('CSS-Inhalt vollstaendig und ungefaehrlich')

// --- Fall 2: fehlende Datei ------------------------------------------------
delete process.env.DSH_VIVID_CSS
handle = makeCtx()
apply(handle.ctx, { cssPath: join(root, 'dist', 'gibt-es-nicht.css') })
table = collect(handle)
assert.equal(table.length, 0, 'ohne Datei keine Injection')
assert.ok(warns.length > 0, 'Warnung wird protokolliert')
ok('fehlende Datei: Warnung statt Absturz')

// --- Fall 3: Vendor-CSS mit </style> wird abgelehnt ------------------------
const nasty = join(root, 'dist', '.verify-nasty.css')
const { writeFileSync, unlinkSync } = await import('node:fs')
writeFileSync(nasty, 'body { color: red } </style><script>x</script>', 'utf8')
handle = makeCtx()
apply(handle.ctx, { cssPath: nasty })
table = collect(handle)
assert.equal(table.length, 0, 'unsicheres CSS wird nicht injiziert')
unlinkSync(nasty)
ok('CSS mit "</style" wird abgelehnt')

handle = makeCtx()
apply(handle.ctx, { theme: 'ember' })
table = collect(handle)
assert.equal(table.length, 1, 'themes/ember.css wird gefunden')
assert.ok(table[0].text.includes('#14100f'), 'Ember-Palette geladen')
ok('Theme-Auswahl per Config (ember)')

handle = makeCtx()
apply(handle.ctx, { theme: 'gibt-es-nicht' })
table = collect(handle)
assert.equal(table.length, 1, 'Fallback liefert weiterhin CSS')
assert.ok(table[0].text.includes('#0f1319'), 'unbekanntes Theme faellt auf Aurora zurueck')
ok('unbekanntes Theme: Warnung + Fallback auf Aurora')

// --- Fall 6: unerwartete Harness-API ---------------------------------------
assert.doesNotThrow(() => apply({}, {}), 'fehlender ctx darf nicht werfen')
ok('fehlender ctx: kein Absturz')

handle = makeCtx()
apply(handle.ctx, {})
const listeners = handle.listeners.get('webserver/index-inject') ?? []
assert.equal(listeners.length, 1, 'Listener vorhanden')
assert.doesNotThrow(() => listeners[0](null), 'kaputte Tabelle wird ignoriert')
ok('API-Wechsel: unerwartete Injection-Tabelle ignoriert')

// --- Client-Bundle und Theme-CSS ------------------------------------------
const clientSource = readFileSync(join(root, 'plugin', 'client.js'), 'utf8')
assert.ok(!clientSource.includes('__DSH_VIVID_'), 'keine Platzhalter im Client')
new Script(clientSource, { filename: 'plugin/client.js' })
ok('Client-Bundle syntaktisch gueltig und vollstaendig ersetzt')

assert.ok(clientSource.includes('"dsh-theme-vivid.preset"'), 'Preset-Schluessel fehlt')
for (const id of ['studio', 'book', 'terminal']) {
  assert.ok(clientSource.includes(`${id}: {`), `Preset ${id} fehlt`)
}
assert.ok(clientSource.includes('font-family'), 'Preset-Schriften fehlen')
assert.ok(clientSource.includes('--dsh-content-letter-spacing'), 'Preset-Laufweite fehlt')
ok('drei Presets (studio, book, terminal) im Client')

assert.ok(clientSource.includes('"dsh-theme-vivid:"'), 'Host-Injection wird nicht erkannt')
assert.ok(clientSource.includes('DEFAULT_LABEL'), 'Default-Kachel fehlt')
ok('Default-Kachel schaltet Palette, Preset und Custom ab')

const ids = [
  'arctic', 'aurora', 'crimson', 'ember', 'gilded', 'iris', 'jade', 'mint',
  'moss', 'noir', 'orchid', 'sakura', 'sand', 'slate', 'voltage',
]
for (const id of ids) {
  assert.ok(clientSource.includes(`"${id}":{"dark":`), `Akzent fuer ${id} fehlt`)
}
ok(`Akzentfarben aller ${ids.length} Paletten im Client`)

// Jede gebaute Palette muss beide Erscheinungsbilder und beide Akzente haben.
const builtIds = readdirSync(join(root, 'dist'))
  .filter((file) => file.endsWith('.css'))
  .map((file) => file.slice(0, -4))
  .sort()
assert.deepEqual(builtIds, [...ids].sort(), 'dist/ enthaelt genau die Paletten aus dem Client')
for (const id of builtIds) {
  const palette = readFileSync(join(root, 'dist', `${id}.css`), 'utf8')
  assert.ok(palette.includes('html body[data-ds-dark-theme]'), `${id}: Dunkelblock fehlt`)
  assert.ok(palette.includes('html body:not([data-ds-dark-theme])'), `${id}: Hellblock fehlt`)
  const accents = palette.match(/--vv-accent:\s*#[0-9a-f]{6}/g) ?? []
  assert.equal(accents.length, 2, `${id}: Akzent fuer hell und dunkel fehlt`)
}
ok('alle Paletten mit Licht- und Dunkelblock')

const builtCss = readFileSync(join(root, 'dist', 'aurora.css'), 'utf8')
assert.ok(!/\b!important\b/.test(builtCss), 'Theme nutzt kein !important')
assert.ok(!/display:\s*none/.test(builtCss), 'Theme blendet keine Elemente aus')
assert.ok(!/pointer-events:\s*none/.test(builtCss), 'Theme blockiert keine Klicks')
assert.ok(!/visibility:\s*hidden/.test(builtCss), 'Theme versteckt keine Elemente')
ok('Theme bleibt eine reine Farb-/Typografie-Ebene')

console.log(`\n${checks} Pruefungen bestanden.`)
