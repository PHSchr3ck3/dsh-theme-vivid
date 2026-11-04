#!/usr/bin/env node
/**
 * Baut aus shared/components.css + palettes/<id>.css je ein fertiges Theme
 * (dist/<id>.css) und erzeugt die Vorschau-Seiten (docs/preview-<id>.html).
 *
 * Aufruf:  node build.mjs
 *
 * Ein Theme-File ist bewusst eine einzige CSS-Datei: Das Plugin injiziert
 * genau diese Datei als <style>-Block in den Seitenkopf.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const palettesDir = join(root, 'palettes')
const distDir = join(root, 'dist')
const previewDir = join(root, 'docs')
const pluginThemesDir = join(root, 'plugin', 'themes')

const NAMES = {
  arctic: 'Arctic',
  aurora: 'Aurora',
  crimson: 'Crimson',
  ember: 'Ember',
  gilded: 'Gilded',
  iris: 'Iris',
  jade: 'Jade',
  mint: 'Mint',
  moss: 'Moss',
  noir: 'Noir',
  orchid: 'Orchid',
  sakura: 'Sakura',
  sand: 'Sand',
  slate: 'Slate',
  voltage: 'Voltage',
}

/** Akzentfarbe je Erscheinungsbild direkt aus der Palette lesen. */
function accentPair(css) {
  const found = [...css.matchAll(/--vv-accent:\s*(#[0-9a-fA-F]{6})/g)].map((match) => match[1])
  return { dark: found[0] ?? '#7ca8ff', light: found[1] ?? found[0] ?? '#3d78e8' }
}

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

/** Sehr einfache, aber wirksame CSS-Sanity-Checks. */
function validateCss(id, css) {
  let depth = 0
  let parens = 0
  let inComment = false
  for (let i = 0; i < css.length; i += 1) {
    const c = css[i]
    const next = css[i + 1]
    if (inComment) {
      if (c === '*' && next === '/') { inComment = false; i += 1 }
      continue
    }
    if (c === '/' && next === '*') { inComment = true; i += 1; continue }
    if (c === '{') depth += 1
    if (c === '}') depth -= 1
    if (c === '(') parens += 1
    if (c === ')') parens -= 1
    if (depth < 0) fail(`${id}: schliessende Klammer ohne Gegenstueck (Position ${i})`)
    if (parens < 0) fail(`${id}: schliessende Klammer in Klammerausdruck (Position ${i})`)
  }
  if (depth !== 0) fail(`${id}: ${depth} unausgeglichene { }`)
  if (parens !== 0) fail(`${id}: ${parens} unausgeglichene ( )`)
  if (inComment) fail(`${id}: nicht beendeter Kommentar`)
  if (css.includes('</style')) fail(`${id}: CSS enthaelt "</style" und wuerde den Style-Block beenden`)
  if (/\bTODO\b/.test(css)) fail(`${id}: enthaelt noch TODO-Marker`)

  const vars = (css.match(/--vv-[a-z0-9-]+/g) ?? [])
  const set = new Set(css.match(/--vv-[a-z0-9-]+\s*:/g)?.map((v) => v.split(':')[0].trim()) ?? [])
  const used = [...new Set(vars)].filter((v) => !set.has(v))
  if (used.length > 0) fail(`${id}: benutzt, aber nicht definiert: ${used.join(', ')}`)
}

function build() {
  const shared = readFileSync(join(root, 'shared/components.css'), 'utf8')
  mkdirSync(distDir, { recursive: true })

  const ids = readdirSync(palettesDir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => f.slice(0, -4))
    .sort()
  if (ids.length === 0) fail('keine Paletten in palettes/ gefunden')

  const built = []
  for (const id of ids) {
    const palette = readFileSync(join(palettesDir, `${id}.css`), 'utf8')
    const css = `/* ===== DSH Vivid Theme: ${NAMES[id] ?? id} =====\n   Generiert von dsh-themes/build.mjs — nicht direkt bearbeiten. */\n\n${palette}\n\n${shared}\n`
    validateCss(id, css)
    writeFileSync(join(distDir, `${id}.css`), css, 'utf8')
    mkdirSync(pluginThemesDir, { recursive: true })
    writeFileSync(join(pluginThemesDir, `${id}.css`), css, 'utf8')
    mkdirSync(join(previewDir, 'dist'), { recursive: true })
    writeFileSync(join(previewDir, 'dist', `${id}.css`), css, 'utf8')
    built.push({ id, css, accent: accentPair(palette) })
  }

  const clientTemplate = readFileSync(join(root, 'client', 'client.template.js'), 'utf8')
  const cssMap = Object.fromEntries(built.map(({ id, css }) => [id, css]))
  const accentMap = Object.fromEntries(built.map(({ id, accent }) => [id, accent]))
  writeFileSync(
    join(root, 'plugin', 'client.js'),
    clientTemplate
      .replace('__DSH_VIVID_THEMES__', JSON.stringify(cssMap))
      .replace('__DSH_VIVID_ACCENTS__', JSON.stringify(accentMap)),
    'utf8',
  )
  console.log('✔ Plug-in-Client: plugin/client.js')

  const template = readFileSync(join(previewDir, 'mock.html'), 'utf8')
  for (const { id } of built) {
    const html = template
      .replaceAll('{{THEME_ID}}', id)
      .replaceAll('{{THEME_NAME}}', NAMES[id] ?? id)
    writeFileSync(join(previewDir, `preview-${id}.html`), html, 'utf8')
  }

  // Ein Pruefblatt pro Palette: dieselbe Vorlage, andere Tokens.
  const testTemplate = readFileSync(join(previewDir, 'test.html'), 'utf8')
  for (const { id } of built) {
    const html = testTemplate
      .replaceAll('{{THEME_ID}}', id)
      .replaceAll('{{THEME_NAME}}', NAMES[id] ?? id)
    writeFileSync(join(previewDir, `test-${id}.html`), html, 'utf8')
  }

  const cards = built
    .map(
      ({ id, css }) => `      <article class="card">
        <header><h2>${NAMES[id] ?? id}</h2><a href="preview-${id}.html" target="_blank">einzeln oeffnen</a></header>
        <iframe src="preview-${id}.html" title="${NAMES[id] ?? id}" loading="lazy"></iframe>
        <p class="meta">${(css.length / 1024).toFixed(1)} kB CSS</p>
      </article>`,
    )
    .join('\n')

  // Screenshot-Galerie: zeigt, was bereits gerendert wurde, ohne zu raten.
  const has = (rel) => existsSync(join(previewDir, rel))
  const gallery = built
    .map(({ id }) => {
      const dark = `shots/preview-${id}.png`
      const light = `shots/preview-${id}-hell.png`
      const imgs = [
        has(dark) ? `<img src="${dark}" alt="${NAMES[id] ?? id} dunkel" loading="lazy" />` : '',
        has(light) ? `<img src="${light}" alt="${NAMES[id] ?? id} hell" loading="lazy" />` : '',
      ].filter(Boolean).join('')
      return `    <figure>
      <div class="pair">${imgs || '<p class="meta">Screenshot folgt.</p>'}</div>
      <figcaption><strong>${NAMES[id] ?? id}</strong> &middot; <a href="preview-${id}.html">Vorschau</a> &middot; <a href="test-${id}.html">Pruefblatt</a></figcaption>
    </figure>`
    })
    .join('\n')

  writeFileSync(
    join(previewDir, 'index.html'),
    `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>DSH Themes — Vergleich</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 26px; background: #0b0d11; color: #e6e9ef; font-family: "Segoe UI", system-ui, sans-serif; }
  h1 { margin: 0 0 6px; font-size: 20px; }
  .lead { margin: 0 0 22px; color: #98a2b1; font-size: 13.5px; }
  .lead code { background: #ffffff12; padding: 1px 6px; border-radius: 4px; font-size: 12px; color: #c9d4e4; }
  .lead a { color: #8fb9ff; text-decoration: none; }
  .grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); }
  .card { border: 1px solid #ffffff1f; border-radius: 14px; overflow: hidden; background: #12151b; }
  .card header { display: flex; align-items: baseline; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #ffffff14; }
  .card h2 { margin: 0; font-size: 15px; }
  .card a { color: #8fb9ff; font-size: 12px; text-decoration: none; }
  .card iframe { display: block; width: 100%; height: 620px; border: 0; background: #0b0d11; }
  .meta { margin: 0; padding: 8px 16px; font-size: 11.5px; color: #79828f; }
  .shots-h { margin: 34px 0 12px; font-size: 17px; }
  .shots { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
  .shots figure { margin: 0; border: 1px solid #ffffff1f; border-radius: 14px; overflow: hidden; background: #12151b; }
  .shots img { display: block; width: 100%; height: auto; }
  .shots figcaption { padding: 9px 14px; font-size: 12.5px; color: #98a2b1; }
  .shots figcaption a { color: #8fb9ff; text-decoration: none; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #ffffff1a; }
  .pair .meta { margin: 0; padding: 14px; }
</style>
</head>
<body>
  <h1>DSH Themes — Vergleich</h1>
  <p class="lead">Alle ${built.length} Paletten mit demselben Mock-Inhalt. In jedem Rahmen laesst sich oben rechts zwischen Hell und Dunkel umschalten.</p>
  <p class="lead">Install: <code>npm install --prefix "&lt;profile&gt;" dsh-theme-vivid</code> &middot; <a href="https://www.npmjs.com/package/dsh-theme-vivid">npm</a> &middot; <a href="https://github.com/PHSchr3ck3/dsh-theme-vivid">GitHub</a> &middot; <a href="https://PHSchr3ck3.github.io/dsh-theme-vivid/">Preview</a></p>
  <div class="grid">
${cards}
  </div>

  <h2 class="shots-h">Screenshots aller Paletten</h2>
  <p class="lead">Gerendert aus der Vorschau — links dunkel, rechts hell. Das Pruefblatt zeigt zusaetzlich alle Schriftstufen und Zustaende.</p>
  <div class="shots">
${gallery}
  </div>

  <h2 class="shots-h">In der App</h2>
  <div class="shots">
    <figure><img src="shots/aurora.png" alt="Aurora" loading="lazy" /><figcaption>Aurora — Einstellungen</figcaption></figure>
    <figure><img src="shots/ember.png" alt="Ember" loading="lazy" /><figcaption>Ember — Einstellungen</figcaption></figure>
    <figure><img src="shots/mint.png" alt="Mint" loading="lazy" /><figcaption>Mint — Einstellungen</figcaption></figure>
  </div>
</body>
</html>
`,
    'utf8',
  )

  console.log('✔ Themes gebaut:')
  for (const { id, css } of built) {
    console.log(`  dist/${id}.css  (${css.length} Zeichen)`)
  }
  console.log('✔ Plug-in-Paket: plugin/themes/*.css')
  console.log('✔ Vorschau: docs/index.html')
  if (!existsSync(join(previewDir, 'index.html'))) fail('Vorschau konnte nicht geschrieben werden')
}

build()
