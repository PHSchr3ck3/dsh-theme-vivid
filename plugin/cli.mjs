#!/usr/bin/env node
/**
 * dsh-theme-vivid — kleiner Export-Befehl.
 *
 *   dsh-theme-vivid list             alle Palette-Ids ausgeben
 *   dsh-theme-vivid export [ordner]  alle CSS-Dateien dorthin kopieren
 *
 * Ohne Argument wird "list" ausgefuehrt. Der Zielordner ist relativ zum
 * aktuellen Arbeitsverzeichnis und wird bei Bedarf angelegt.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const themesDir = join(here, 'themes')

function paletteIds() {
  if (!existsSync(themesDir)) return []
  return readdirSync(themesDir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => file.slice(0, -4))
    .sort()
}

const [command = 'list', target] = process.argv.slice(2)

if (command === 'list') {
  const ids = paletteIds()
  if (ids.length === 0) {
    console.error('dsh-theme-vivid: keine Paletten im Paket gefunden')
    process.exit(1)
  }
  console.log(ids.join('\n'))
} else if (command === 'export') {
  const ids = paletteIds()
  if (ids.length === 0) {
    console.error('dsh-theme-vivid: keine Paletten im Paket gefunden')
    process.exit(1)
  }
  const outDir = resolve(target ?? 'themes')
  mkdirSync(outDir, { recursive: true })
  for (const id of ids) {
    copyFileSync(join(themesDir, `${id}.css`), join(outDir, `${id}.css`))
  }
  console.log(`${ids.length} Paletten -> ${outDir}`)
} else if (command === '--help' || command === '-h' || command === 'help') {
  console.log(`dsh-theme-vivid
  list             alle Palette-Ids ausgeben
  export [ordner]  alle CSS-Dateien nach <ordner> kopieren (Standard: ./themes)`)
} else {
  console.error(`dsh-theme-vivid: unbekannter Befehl "${command}"`)
  console.error('Aufruf: dsh-theme-vivid [list|export <ordner>]')
  process.exit(1)
}
