/**
 * dsh-theme-vivid — Host-Haelfte
 * -------------------------------------------------------------------------
 * Injiziert ein CSS-Theme in den <head> der Web-GUI.
 *
 * Warum das funktioniert, ohne den Harness neu zu bauen:
 * Der Webserver rendert `index.html` bei jedem Seitenaufruf neu und sammelt
 * dabei "Index-Injections" ein (`webserver/index-inject`). Wir hoeren auf
 * dieses Event und legen einen `style`-Block in die Tabelle.
 *
 * Paket-Layout (als DSH-Bundle installierbar):
 *   index.js, package.json, cordis.patch.yml, themes/<id>.css
 *
 * Konfiguration (erste Uebereinstimmung gewinnt):
 *   1. DSH_VIVID_CSS (Umgebungsvariable)
 *   2. config.cssPath
 *   3. config.theme + themes/<id>.css
 *   4. theme.css neben index.js (so arbeitet install.ps1)
 *   5. themes/aurora.css
 *
 * Das Theme selbst besteht nur aus Ueberschreibungen der offiziellen
 * `--dsw-*` Design-Tokens plus einigen Komponenten-Regeln. Es wird nichts
 * gepatcht, keine Datei des Harness angefasst.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'theme-vivid'

/** Nur mit laufendem Webserver sinnvoll. */
export const inject = ['webServer']

export const DEFAULT_THEME = 'aurora'

const here = dirname(fileURLToPath(import.meta.url))
const legacyCss = join(here, 'theme.css')

/** Pfad einer Palette; ungueltige Namen fallen auf Aurora zurueck (kein Pfad-Ausbruch). */
export function themePath(theme) {
  const id = typeof theme === 'string' && /^[a-z0-9-]+$/.test(theme) ? theme : DEFAULT_THEME
  return join(here, 'themes', `${id}.css`)
}

/** Reihenfolge siehe Kopfkommentar. */
export function pickCssPath(config) {
  const fromEnv = process.env.DSH_VIVID_CSS
  if (typeof fromEnv === 'string' && fromEnv !== '') return fromEnv

  const configured = config?.cssPath
  if (typeof configured === 'string' && configured !== '') return configured

  if (typeof config?.theme === 'string') {
    const themed = themePath(config.theme)
    if (existsSync(themed)) return themed
  }

  if (existsSync(legacyCss)) return legacyCss
  return themePath(DEFAULT_THEME)
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ theme?: string, cssPath?: string }} [config]
 */
export function apply(ctx, config) {
  /* Bei einem API-Wechsel im Harness lieber ohne Theme weiterlaufen als die GUI stoeren. */
  if (typeof ctx?.on !== 'function') {
    ctx?.logger?.warn?.('theme-vivid: ctx.on fehlt — Theme wird nicht injiziert')
    return
  }

  const cssPath = pickCssPath(config)
  if (typeof config?.theme === 'string' && !existsSync(themePath(config.theme))) {
    ctx.logger?.warn?.(`theme-vivid: Theme "${config.theme}" fehlt, nutze ${DEFAULT_THEME}`)
  }

  /** Letzter guter Stand: eine halb gespeicherte Datei soll die GUI nicht entfaerben. */
  let lastGood = ''

  const readCss = () => {
    try {
      const css = readFileSync(cssPath, 'utf8')
      if (css.trim() !== '') lastGood = css
      return css
    } catch (error) {
      ctx.logger?.warn?.(`theme-vivid: ${cssPath} nicht lesbar (${String(error?.message ?? error)})`)
      return lastGood
    }
  }

  try {
    ctx.on('webserver/index-inject', (table) => {
      /* Erwartet wird ein Array; eine geaenderte Signatur wird still ignoriert. */
      if (!Array.isArray(table)) return
      const css = readCss()
      if (css.trim() === '') return
      if (css.includes('</style')) {
        ctx.logger?.warn?.('theme-vivid: CSS enthaelt "</style" — Injection uebersprungen')
        return
      }
      table.push({ kind: 'style', text: `\n/* dsh-theme-vivid: ${cssPath} */\n${css}\n` })
    })
  } catch (error) {
    ctx.logger?.warn?.(`theme-vivid: Injection nicht registriert (${String(error?.message ?? error)})`)
  }
}
