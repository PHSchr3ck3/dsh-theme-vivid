/**
 * dsh-theme-vivid — Client-Haelfte (Settings-Zeile "Color theme").
 *
 * Wird als Lazy-CJS-Bundle vom Modulsystem geladen:
 *   window.__ModuleLoader__.load({ id, factory })
 * Die Palette selbst liegt als CSS in THEMES (build.mjs setzt sie ein).
 *
 * Die Auswahl wird in localStorage gemerkt und beim naechsten Start sofort
 * angewendet; sie gewinnt damit gegen die im Profil konfigurierte Palette.
 *
 * Drei Presets (Studio, Book, Terminal) setzen Schriftart und Farbnote und
 * funktionieren mit jeder Palette; sie liegen unter
 * "dsh-theme-vivid.preset" und werden vor den eigenen Anpassungen angewendet.
 *
 * Ueber "Customize" lassen sich Akzent-, Hintergrund-, Text- und
 * Ueberschriftenfarbe, Akzentstaerke, Textkontrast, Zeilenhoehe und der
 * Eckenradius nachziehen. Farben und Regler gelten je Erscheinungsbild
 * (hell/dunkel), der Eckenradius fuer beide; alles landet in localStorage
 * unter "dsh-theme-vivid.custom" und liegt als eigener Style-Block hinter
 * dem Palette-Block, gewinnt also bei gleicher Spezifitaet.
 */
window.__ModuleLoader__.load({
  id: "dsh-theme-vivid",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require("react")
    const THEMES = __DSH_VIVID_THEMES__
    const ACCENTS = __DSH_VIVID_ACCENTS__
    const ORDER = [
      "aurora", "ember", "mint", "sakura", "iris", "slate",
      "moss", "crimson", "arctic", "voltage", "sand", "noir",
      "gilded", "jade", "orchid",
    ]
    const LABELS = {
      aurora: "Aurora", ember: "Ember", mint: "Mint", sakura: "Sakura", iris: "Iris", slate: "Slate",
      moss: "Moss", crimson: "Crimson", arctic: "Arctic", voltage: "Voltage", sand: "Sand", noir: "Noir",
      gilded: "Gilded", jade: "Jade", orchid: "Orchid",
    }
    const STORAGE_KEY = "dsh-theme-vivid.palette"
    const CUSTOM_KEY = "dsh-theme-vivid.custom"
    const CUSTOM_VERSION = 2
    const STYLE_ID = "dsh-theme-vivid-runtime"
    const CUSTOM_STYLE_ID = "dsh-theme-vivid-custom"
    const PRESET_STYLE_ID = "dsh-theme-vivid-preset"
    const PRESET_KEY = "dsh-theme-vivid.preset"

    /* Schrift und Farbnote. Die Farben selbst kommen immer aus der Palette. */
    const PRESETS = {
      studio: {
        label: "Studio",
        hint: "Sans, neutrale Palettenfarben",
        prose: '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
        heading: "inherit",
        mono: '"Cascadia Code", "JetBrains Mono", Consolas, "SF Mono", Menlo, monospace',
        tracking: "0.012em",
      },
      book: {
        label: "Book",
        hint: "Serif, warm und luftig",
        prose: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif',
        heading: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
        mono: '"Cascadia Code", Consolas, "SF Mono", Menlo, monospace',
        tracking: "0.004em",
      },
      terminal: {
        label: "Terminal",
        hint: "Mono, krisp und kontrastreich",
        prose: '"Cascadia Mono", "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
        heading: '"Cascadia Mono", "JetBrains Mono", Consolas, monospace',
        mono: '"Cascadia Mono", "JetBrains Mono", Consolas, monospace',
        tracking: "0em",
      },
    }
    const PRESET_ORDER = ["studio", "book", "terminal"]
    const DEFAULT_ID = "default"
    const DEFAULT_LABEL = "Default"

    /* ---------- Speicher ---------- */

    function stored() {
      try {
        return window.localStorage.getItem(STORAGE_KEY)
      } catch (error) {
        return null
      }
    }

    function remember(id) {
      try {
        window.localStorage.setItem(STORAGE_KEY, id)
      } catch (error) {
        /* privater Modus o. ae. — Auswahl gilt dann nur fuer diese Sitzung */
      }
    }

    function currentId() {
      const id = stored()
      if (id === DEFAULT_ID) return DEFAULT_ID
      return typeof id === "string" && Object.prototype.hasOwnProperty.call(THEMES, id) ? id : "aurora"
    }

    function storedPreset() {
      try {
        return window.localStorage.getItem(PRESET_KEY)
      } catch (error) {
        return null
      }
    }

    function currentPreset() {
      const id = storedPreset()
      return typeof id === "string" && Object.prototype.hasOwnProperty.call(PRESETS, id) ? id : "studio"
    }

    function rememberPreset(id) {
      try {
        window.localStorage.setItem(PRESET_KEY, id)
      } catch (error) {
        /* siehe remember() */
      }
    }

    function currentMode() {
      return document.body && document.body.hasAttribute("data-ds-dark-theme") ? "dark" : "light"
    }

    /* ---------- Farb-Helfer ---------- */

    function cleanHex(value) {
      return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : undefined
    }

    function sanitizeMode(entry) {
      if (!entry || typeof entry !== "object") return {}
      const out = {}
      for (const key of ["accent", "text", "heading", "bg"]) {
        const value = cleanHex(entry[key])
        if (value) out[key] = value
      }
      if (typeof entry.lineHeight === "number" && Number.isFinite(entry.lineHeight)) {
        out.lineHeight = Math.min(2, Math.max(1.4, Math.round(entry.lineHeight * 100) / 100))
      }
      for (const [key, min, max] of [["intensity", 0.2, 1.6], ["muted", 0, 1]]) {
        if (typeof entry[key] === "number" && Number.isFinite(entry[key])) {
          out[key] = Math.min(max, Math.max(min, Math.round(entry[key] * 100) / 100))
        }
      }
      if (entry.glow === false) out.glow = false
      return out
    }

    /** Der Eckenradius gilt fuer beide Erscheinungsbilder und liegt getrennt. */
    function sanitizeBase(entry) {
      if (!entry || typeof entry !== "object") return {}
      const out = {}
      if (typeof entry.radius === "number" && Number.isFinite(entry.radius)) {
        out.radius = Math.min(16, Math.max(0, Math.round(entry.radius)))
      }
      return out
    }

    /** Der Schluessel bleibt stabil; die Version erlaubt spaetere Migrationen. */
    function readCustom() {
      try {
        const raw = JSON.parse(window.localStorage.getItem(CUSTOM_KEY) || "{}")
        return {
          version: CUSTOM_VERSION,
          base: sanitizeBase(raw && raw.base),
          dark: sanitizeMode(raw && raw.dark),
          light: sanitizeMode(raw && raw.light),
        }
      } catch (error) {
        return { version: CUSTOM_VERSION, base: {}, dark: {}, light: {} }
      }
    }

    function saveCustom(custom) {
      try {
        window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(Object.assign({}, custom, { version: CUSTOM_VERSION })))
      } catch (error) {
        /* siehe remember() */
      }
    }

    function rgbOf(hex) {
      const n = parseInt(hex.slice(1), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }

    function hexOf(channels) {
      return "#" + channels
        .map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0"))
        .join("")
    }

    function mix(a, b, t) {
      const left = rgbOf(a)
      const right = rgbOf(b)
      return hexOf(left.map((value, index) => value + (right[index] - value) * t))
    }

    function alpha(hex, value) {
      const [r, g, b] = rgbOf(hex)
      return `rgba(${r}, ${g}, ${b}, ${value})`
    }

    function luminance(hex) {
      const [r, g, b] = rgbOf(hex).map((value) => {
        const channel = value / 255
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    /** Haelt eine gewaehlte Akzentfarbe in einem lesbaren Helligkeitsband. */
    function readable(hex, mode) {
      let out = hex
      for (let i = 0; i < 14; i += 1) {
        const level = luminance(out)
        if (mode === "dark" ? level >= 0.3 : level <= 0.42) break
        out = mix(out, mode === "dark" ? "#ffffff" : "#000000", 0.14)
      }
      return out
    }

    function headingFromAccent(accent, mode) {
      return readable(mix(accent, mode === "dark" ? "#ffffff" : "#000000", mode === "dark" ? 0.36 : 0.24), mode)
    }

    function tokenColor(token, fallback) {
      try {
        const value = getComputedStyle(document.body).getPropertyValue(token).trim()
        return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
      } catch (error) {
        return fallback
      }
    }

    /** Liest eine Farbe direkt aus der Palette, unabhaengig von Laufzeit-Overrides. */
    function themeToken(themeId, mode, token) {
      const css = THEMES[themeId]
      if (typeof css !== "string") return undefined
      const selector = mode === "dark" ? "html body[data-ds-dark-theme]" : "html body:not([data-ds-dark-theme])"
      const start = css.indexOf(selector)
      if (start < 0) return undefined
      const end = css.indexOf("}", start)
      const lines = css.slice(start, end < 0 ? undefined : end).split("\n")
      const line = lines.find((entry) => entry.trim().startsWith(`${token}:`))
      const value = line && line.match(/#[0-9a-f]{6}/i)
      return value ? value[0].toLowerCase() : undefined
    }

    /** Farbnote je Preset: Basisfarben stammen immer aus der aktiven Palette. */
    function presetModeValues(presetId, mode) {
      const dark = mode === "dark"
      if (presetId === "book") {
        const text = themeToken(currentId(), mode, "--dsw-alias-label-primary") || (dark ? "#e4e9f3" : "#1a2333")
        const heading = themeToken(currentId(), mode, "--vv-heading") || text
        return {
          text: mix(text, dark ? "#ffd6a3" : "#7a5a2a", dark ? 0.14 : 0.1),
          heading: mix(heading, dark ? "#ffc98a" : "#6b4a1c", dark ? 0.18 : 0.12),
          lineHeight: 1.88,
          intensity: 0.85,
          muted: 0.62,
        }
      }
      if (presetId === "terminal") {
        const text = themeToken(currentId(), mode, "--dsw-alias-label-primary") || (dark ? "#e4e9f3" : "#1a2333")
        const heading = themeToken(currentId(), mode, "--vv-heading") || text
        return {
          text: mix(text, dark ? "#cdf3ff" : "#0d3a4a", dark ? 0.12 : 0.1),
          heading: mix(heading, dark ? "#b9ecff" : "#0b3444", dark ? 0.14 : 0.1),
          lineHeight: 1.6,
          intensity: 1.2,
          muted: 0.78,
        }
      }
      return {}
    }

    /** Eigene Werte gewinnen; ein eigener Akzent bestimmt weiter die Ueberschrift. */
    function effectiveEntry(presetId, mode, entry) {
      const merged = Object.assign({}, presetModeValues(presetId, mode), entry)
      if (entry.accent && !entry.heading) delete merged.heading
      return merged
    }

    /* ---------- Angepasste Tokens ---------- */

    function modeVars(entry, mode) {
      const vars = {}
      const accent = entry.accent
      const dark = mode === "dark"
      const strength = typeof entry.intensity === "number" ? entry.intensity : 1

      /* Eigene Grundfarbe: die Palette liefert weiterhin den Aufbau, nur die
         Flaechen werden daraus neu abgeleitet, damit die Abstufungen bleiben. */
      if (entry.bg) {
        const bg = entry.bg
        const layer1 = dark ? mix(bg, "#ffffff", 0.055) : mix(bg, "#ffffff", 0.7)
        const layer2 = dark ? mix(bg, "#ffffff", 0.1) : mix(bg, "#000000", 0.02)
        const layer3 = dark ? mix(bg, "#ffffff", 0.16) : mix(bg, "#000000", 0.055)
        Object.assign(vars, {
          "--dsw-alias-bg-base": bg,
          "--dsw-alias-bg-layer-1": layer1,
          "--dsw-alias-bg-layer-2": layer2,
          "--dsw-alias-bg-layer-3": layer3,
          "--dsw-alias-bg-skeleton": dark ? mix(bg, "#ffffff", 0.07) : mix(bg, "#000000", 0.035),
          "--dsw-alias-settings-card-fill": dark ? layer1 : "#ffffff",
          "--dsw-alias-settings-card-stroke": dark ? "#ffffff1f" : "#0000001a",
          "--dsw-alias-turn-trigger-bg": dark ? layer1 : layer2,
          "--dsw-alias-turn-trigger-bg-hover": dark ? layer2 : layer3,
          "--dsw-alias-toast-bg": dark ? layer2 : "#ffffff",
          "--dsw-alias-tooltip-bg": dark ? layer3 : mix(bg, "#000000", 0.82),
          "--dsw-alias-tooltip-key-bg": dark ? mix(layer3, "#ffffff", 0.08) : mix(bg, "#000000", 0.7),
          "--vv-sidebar-fill": dark ? mix(bg, "#000000", 0.3) : mix(bg, "#000000", 0.03),
          "--vv-tip": dark ? mix(bg, "#ffffff", 0.08) : mix(bg, "#000000", 0.045),
        })
      }

      if (accent) {
        const link = readable(mix(accent, dark ? "#ffffff" : "#000000", dark ? 0.2 : 0.18), mode)
        const brandText = readable(mix(accent, dark ? "#ffffff" : "#000000", dark ? 0.32 : 0.24), mode)
        const wash = (value) => alpha(accent, Math.min(1, value * strength))

        Object.assign(vars, {
          "--vv-accent": accent,
          "--vv-marker": accent,
          "--vv-selection": wash(dark ? 0.3 : 0.22),
          "--vv-hover": wash(dark ? 0.08 : 0.07),
          "--vv-active": wash(dark ? 0.14 : 0.12),
          "--vv-line": wash(dark ? 0.2 : 0.18),
          "--vv-line-soft": wash(dark ? 0.13 : 0.12),
          "--vv-link-underline": alpha(link, dark ? 0.45 : 0.35),
          "--vv-glow": wash(dark ? 0.085 : 0.09),
          "--vv-glow-2": wash(dark ? 0.06 : 0.05),
          "--vv-quote-bg": wash(dark ? 0.06 : 0.045),
          "--vv-table-head": wash(dark ? 0.1 : 0.07),
          "--vv-code-bg": wash(dark ? 0.05 : 0.035),
          "--vv-inline-code-bg": wash(dark ? 0.13 : 0.08),
          "--vv-inline-code-border": wash(dark ? 0.22 : 0.16),
          "--vv-inline-code-fg": dark ? mix(accent, "#ffffff", 0.55) : mix(accent, "#000000", 0.35),

          "--dsw-alias-brand-primary": accent,
          "--dsw-alias-brand-text": brandText,
          "--dsw-alias-link": link,
          "--dsw-alias-button-primary-fill": readable(accent, mode),
          "--dsw-alias-button-primary-hover": readable(dark ? mix(accent, "#ffffff", 0.14) : mix(accent, "#000000", 0.18), mode),
          "--dsw-alias-interactive-bg-hover": wash(0.08),
          "--dsw-alias-interactive-bg-active": wash(0.14),
          "--dsw-alias-interactive-bg-hover-accent": wash(0.16),
          "--dsw-alias-button-ghost-active-fill": wash(0.12),
          "--dsw-alias-button-ghost-active-border": wash(0.28),
          "--dsw-alias-button-ghost-active-hover": wash(0.18),
          "--dsw-alias-markdown-code-block": wash(dark ? 0.06 : 0.035),
          "--dsw-alias-markdown-code-block-banner": wash(dark ? 0.11 : 0.07),
          "--dsw-alias-markdown-inline-code": wash(dark ? 0.14 : 0.08),
          "--dsw-alias-markdown-citation": wash(0.24),
          "--dsw-alias-markdown-tag": wash(0.16),
          "--dsw-focus-ring-color": readable(accent, mode),
          "--dsw-specific-sidebar-nav-item-active-accent": accent,
          "--dsw-specific-sidebar-nav-item-hover": wash(0.08),
          "--dsw-specific-sidebar-nav-item-active": wash(0.14),
          "--dsw-alias-menu-group-header-fill": wash(0.06),
        })
      }

      if (entry.text) {
        /* Textkontrast verschiebt alle Nebenstufen, die Hauptfarbe bleibt. */
        const k = typeof entry.muted === "number" ? entry.muted : 0.5
        const tone = (base) =>
          `color-mix(in srgb, ${entry.text} ${Math.round((base + 0.34 * k) * 100)}%, var(--dsw-alias-bg-base))`
        Object.assign(vars, {
          "--dsw-alias-label-primary": entry.text,
          "--dsw-alias-label-primary-bluish": entry.text,
          "--dsw-alias-label-primary-dimmed": tone(0.68),
          "--dsw-alias-label-secondary": tone(0.46),
          "--dsw-alias-label-tertiary": tone(0.34),
          "--dsw-alias-label-caption": tone(0.26),
          "--dsw-alias-label-dimmed": tone(0.18),
          "--dsw-alias-menu-icon": tone(0.46),
          "--vv-strong": mix(entry.text, dark ? "#ffffff" : "#000000", dark ? 0.24 : 0.1),
          "--vv-inline-code-fg": entry.text,
        })
      }

      if (entry.heading || accent) {
        const heading = entry.heading || headingFromAccent(accent, mode)
        vars["--vv-heading"] = heading
        vars["--vv-heading-soft"] = `color-mix(in srgb, ${heading} 72%, var(--dsw-alias-label-primary))`
      }

      if (typeof entry.lineHeight === "number") {
        vars["--dsw-font-markdown-base-line-height"] = String(entry.lineHeight)
        vars["--dsw-font-markdown-small-line-height"] = String(Math.max(1.4, entry.lineHeight - 0.1))
      }

      if (entry.glow === false) {
        vars["--vv-glow"] = "transparent"
        vars["--vv-glow-2"] = "transparent"
      }

      return vars
    }

    function customCss() {
      if (currentId() === DEFAULT_ID) return ""
      const custom = readCustom()
      const preset = currentPreset()
      const blocks = []
      if (typeof custom.base.radius === "number") {
        const radius = custom.base.radius
        const small = Math.max(0, Math.min(radius, Math.round(radius * 0.6)))
        blocks.push(`html body {\n  --vv-radius: ${radius}px;\n  --vv-radius-sm: ${small}px;\n}`)
      }
      for (const mode of ["dark", "light"]) {
        const vars = modeVars(effectiveEntry(preset, mode, custom[mode]), mode)
        const declarations = Object.keys(vars)
          .map((key) => `${key}: ${vars[key]};`)
          .join("\n  ")
        if (declarations === "") continue
        const selector = mode === "dark"
          ? "html body[data-ds-dark-theme]"
          : "html body:not([data-ds-dark-theme])"
        blocks.push(`${selector} {\n  ${declarations}\n}`)
      }
      return blocks.join("\n\n")
    }

    /** Entfernt die vom Host gerenderte Injection, damit das Original-Design greift. */
    function clearHostInjection() {
      try {
        const styles = document.querySelectorAll("style")
        for (let index = 0; index < styles.length; index += 1) {
          const node = styles[index]
          if (node.id === STYLE_ID || node.id === CUSTOM_STYLE_ID || node.id === PRESET_STYLE_ID) continue
          const text = node.textContent || ""
          if (text.indexOf("dsh-theme-vivid:") >= 0) node.textContent = ""
        }
      } catch (error) {
        /* ohne DOM-Zugriff bleibt nur der Laufzeit-Block */
      }
    }

    /** Setzt den Laufzeit-Style-Block; spaeter im Dokument = gewinnt gegen die Host-Injection. */
    function paint(id) {
      let node = document.getElementById(STYLE_ID)
      if (id === DEFAULT_ID) {
        if (node) node.textContent = ""
        clearHostInjection()
        return
      }
      const css = THEMES[id]
      if (typeof css !== "string") return
      if (!node) {
        node = document.createElement("style")
        node.id = STYLE_ID
        document.head.appendChild(node)
      }
      node.textContent = css
    }

    function paintCustom() {
      const css = customCss()
      const node = document.getElementById(CUSTOM_STYLE_ID)
      if (css === "") {
        if (node) node.textContent = ""
        return
      }
      if (!node) {
        const style = document.createElement("style")
        style.id = CUSTOM_STYLE_ID
        document.head.appendChild(style)
      }
      document.getElementById(CUSTOM_STYLE_ID).textContent = css
    }

    /** Schrift-Ebene des Presets; liegt bewusst vor dem Custom-Block. */
    function presetCss() {
      if (currentId() === DEFAULT_ID) return ""
      const preset = PRESETS[currentPreset()]
      if (!preset) return ""
      const scope = ":is([data-conversation-content], [data-conversation-scroll], [data-conversation-region])"
      /* Die App setzt Schriften teils auf inneren Elementen; Vererbung allein
         reicht deshalb nicht. Textelemente bekommen die Preset-Schrift direkt,
         Code und Eingaben bleiben monospace (Regel weiter unten). */
      const prose = ":is(p, li, ul, ol, dl, dt, dd, blockquote, table, caption, thead, tbody, tr, td, th, h1, h2, h3, h4, h5, h6, summary, details, figcaption, strong, em, b, small, a)"
      return [
        `html body {\n  --dsh-content-letter-spacing: ${preset.tracking};\n}`,
        `${scope} {\n  font-family: ${preset.prose};\n}`,
        `${scope} ${prose} {\n  font-family: ${preset.prose};\n}`,
        `${scope} :is(h1, h2, h3, h4, h5, h6) {\n  font-family: ${preset.heading};\n}`,
        `${scope} :is(pre, code, kbd, samp, textarea, input) {\n  font-family: ${preset.mono};\n}`,
      ].join("\n\n")
    }

    function paintPreset() {
      const css = presetCss()
      let node = document.getElementById(PRESET_STYLE_ID)
      if (css === "") {
        if (node) node.textContent = ""
        return
      }
      if (!node) {
        node = document.createElement("style")
        node.id = PRESET_STYLE_ID
        const custom = document.getElementById(CUSTOM_STYLE_ID)
        if (custom && custom.parentNode) custom.parentNode.insertBefore(node, custom)
        else document.head.appendChild(node)
      }
      node.textContent = css
    }

    const inject = ["slots"]

    function apply(ctx) {
      const h = React.createElement
      try {
        paint(currentId())
        paintPreset()
        paintCustom()
      } catch (error) {
        const warn = ctx?.logger?.warn
        if (typeof warn === "function") {
          warn(`theme-vivid: Theme konnte nicht gesetzt werden (${String(error?.message ?? error)})`)
        }
      }

      const base = {
        display: "flex",
        alignItems: "center",
        gap: 7,
        minWidth: 0,
        padding: "6px 9px",
        borderRadius: 8,
        border: "1px solid var(--dsw-alias-border-l1, #8884)",
        background: "transparent",
        color: "var(--dsw-alias-label-secondary, inherit)",
        font: "inherit",
        fontSize: 12.5,
        textAlign: "left",
        cursor: "pointer",
      }
      const selected = {
        borderColor: "var(--dsw-alias-brand-primary, #7ca8ff)",
        background: "var(--dsw-alias-interactive-bg-active, #7ca8ff22)",
        color: "var(--dsw-alias-brand-text, inherit)",
      }
      const fieldRow = {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: 30,
      }
      const fieldLabel = {
        color: "var(--dsw-alias-label-secondary, inherit)",
        fontSize: 12.5,
      }
      const swatch = {
        width: 30,
        height: 24,
        padding: 0,
        border: "1px solid var(--dsw-alias-border-l2, #8886)",
        borderRadius: 6,
        background: "none",
        cursor: "pointer",
      }
      const hexLabel = {
        minWidth: 58,
        fontSize: 11.5,
        color: "var(--dsw-alias-label-tertiary, inherit)",
        fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
      }
      const textButton = {
        padding: "2px 0",
        border: 0,
        background: "none",
        color: "var(--dsw-alias-brand-text, #7ca8ff)",
        font: "inherit",
        fontSize: 12.5,
        cursor: "pointer",
      }

      function PaletteRow() {
        const [active, setActive] = React.useState(currentId())
        const [custom, setCustom] = React.useState(readCustom)
        const [preset, setPreset] = React.useState(currentPreset)
        const [mode, setMode] = React.useState(currentMode)
        const [open, setOpen] = React.useState(false)

        React.useEffect(() => {
          if (!document.body) return undefined
          const observer = new MutationObserver(() => setMode(currentMode()))
          observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] })
          return () => observer.disconnect()
        }, [])

        const choose = (id) => {
          paint(id)
          remember(id)
          setActive(id)
          /* Preset-Farben leiten sich aus der Palette ab, also neu malen. */
          paintPreset()
          paintCustom()
        }

        const choosePreset = (id) => {
          rememberPreset(id)
          setPreset(id)
          paintPreset()
          paintCustom()
        }

        const entry = custom[mode] || {}
        const isDefault = active === DEFAULT_ID
        const update = (patch) => {
          const next = Object.assign({}, custom, {
            [mode]: Object.assign({}, custom[mode], patch),
          })
          setCustom(next)
          saveCustom(next)
          paintCustom()
        }

        const reset = () => {
          const next = Object.assign({}, custom, { [mode]: {}, base: {} })
          setCustom(next)
          saveCustom(next)
          paintCustom()
        }

        const effective = effectiveEntry(preset, mode, entry)
        const accentValue = entry.accent || tokenColor("--vv-accent", "#7ca8ff")
        const bgValue = entry.bg || tokenColor("--dsw-alias-bg-base", mode === "dark" ? "#0f1319" : "#f6f8fc")
        const textValue = effective.text || tokenColor("--dsw-alias-label-primary", "#e4e9f3")
        const headingValue = effective.heading
          || (entry.accent ? headingFromAccent(entry.accent, mode) : tokenColor("--vv-heading", "#c3d6ff"))
        const lineHeight = typeof effective.lineHeight === "number" ? effective.lineHeight : 1.72
        const intensity = typeof effective.intensity === "number" ? effective.intensity : 1
        const muted = typeof effective.muted === "number" ? effective.muted : 0.5
        const radius = typeof custom.base.radius === "number" ? custom.base.radius : 12
        const glow = entry.glow !== false
        const customized = Object.keys(custom.dark).length > 0
          || Object.keys(custom.light).length > 0
          || typeof custom.base.radius === "number"

        const colorField = (label, token, value) =>
          h("label", { key: token, style: fieldRow }, [
            h("span", { key: "label", style: fieldLabel }, label),
            h("span", { key: "control", style: { display: "flex", alignItems: "center", gap: 8 } }, [
              h("input", {
                key: "input",
                type: "color",
                value,
                "aria-label": label,
                onChange: (event) => update({ [token]: event.target.value }),
                style: swatch,
              }),
              h("code", { key: "value", style: hexLabel }, value.toUpperCase()),
            ]),
          ])

        const sliderField = (label, value, min, max, step, text, onChange) =>
          h("div", { key: label, style: fieldRow }, [
            h("span", { key: "label", style: fieldLabel }, label),
            h("span", { key: "control", style: { display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" } }, [
              h("input", {
                key: "range",
                type: "range",
                min,
                max,
                step,
                value,
                "aria-label": label,
                onChange,
                style: { width: 148, accentColor: "var(--dsw-alias-brand-primary, #7ca8ff)" },
              }),
              h("code", { key: "value", style: hexLabel }, text),
            ]),
          ])

        const panel = open && !isDefault
          ? h("div", {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 12,
                border: "1px solid var(--dsw-alias-border-l1, #8884)",
                borderRadius: 10,
                background: "var(--dsw-alias-bg-layer-1, transparent)",
              },
            }, [
              colorField("Accent", "accent", accentValue),
              colorField("Background", "bg", bgValue),
              colorField("Body text", "text", textValue),
              colorField("Headings", "heading", headingValue),
              sliderField("Accent strength", intensity, 0.2, 1.6, 0.05, `${Math.round(intensity * 100)}%`,
                (event) => update({ intensity: Number(event.target.value) })),
              sliderField("Text contrast", muted, 0, 1, 0.05, `${Math.round(muted * 100)}%`,
                (event) => update({ muted: Number(event.target.value) })),
              sliderField("Line height", lineHeight, 1.4, 2, 0.02, lineHeight.toFixed(2),
                (event) => update({ lineHeight: Number(event.target.value) })),
              sliderField("Corner radius", radius, 0, 16, 1, `${radius}px`,
                (event) => updateBase({ radius: Number(event.target.value) })),
              h("label", { key: "glow", style: Object.assign({}, fieldRow, { justifyContent: "space-between" }) }, [
                h("span", { key: "label", style: fieldLabel }, "Background glow"),
                h("input", {
                  key: "check",
                  type: "checkbox",
                  checked: glow,
                  "aria-label": "Background glow",
                  onChange: (event) => update({ glow: event.target.checked }),
                  style: { width: 16, height: 16, accentColor: "var(--dsw-alias-brand-primary, #7ca8ff)" },
                }),
              ]),
              h("div", {
                key: "foot",
                style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 2 },
              }, [
                h("span", { key: "note", style: { fontSize: 11.5, color: "var(--dsw-alias-label-caption, inherit)" } },
                  `Stored for the ${mode} appearance; corner radius applies to both.`),
                h("button", {
                  key: "reset",
                  type: "button",
                  onClick: reset,
                  style: Object.assign({}, textButton, { color: "var(--dsw-alias-label-secondary, inherit)", opacity: Object.keys(entry).length > 0 ? 1 : 0.45 }),
                }, "Reset"),
              ]),
            ])
          : null

        return h("div", {
          style: { display: "flex", flexDirection: "column", gap: 10, width: "100%", minWidth: 0, padding: "6px 0" },
        }, [
          h("div", {
            key: "head",
            style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
          }, [
            h("div", { key: "label", style: { display: "flex", flexDirection: "column", gap: 2 } }, [
              h("span", { key: "title", style: { color: "var(--dsw-alias-label-primary, inherit)", fontSize: 14 } }, "Color theme"),
              h("span", { key: "hint", style: { color: "var(--dsw-alias-label-tertiary, inherit)", fontSize: 12 } },
                "Palette, preset, text colors and reading comfort."),
            ]),
            h("div", { key: "actions", style: { display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" } }, [
              h("span", { key: "mode", style: { fontSize: 11, color: "var(--dsw-alias-label-caption, inherit)" } },
                mode === "dark" ? "Dark" : "Light"),
              h("button", {
                key: "toggle",
                type: "button",
                onClick: () => setOpen(!open),
                "aria-expanded": open,
                disabled: isDefault,
                title: isDefault ? "Choose a palette to customize" : undefined,
                style: Object.assign({}, textButton, {
                  opacity: isDefault ? 0.45 : 1,
                  cursor: isDefault ? "default" : "pointer",
                }, customized && !open ? { fontWeight: 600 } : {}),
              }, open ? "Hide" : "Customize"),
            ]),
          ]),
          isDefault ? null : h("div", {
            key: "presets",
            style: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" },
          }, [
            h("span", { key: "label", style: Object.assign({}, fieldLabel, { fontSize: 12, marginRight: 2 }) }, "Preset"),
            ...PRESET_ORDER.map((id) => {
              const isActive = preset === id
              return h("button", {
                key: id,
                type: "button",
                "aria-pressed": isActive,
                title: PRESETS[id].hint,
                onClick: () => choosePreset(id),
                style: Object.assign({}, base, { padding: "4px 10px" }, isActive ? selected : {}),
              }, PRESETS[id].label)
            }),
          ]),
          h("div", {
            key: "grid",
            style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))", gap: 7 },
          }, [DEFAULT_ID].concat(ORDER).map((id) => {
            const accent = id === DEFAULT_ID
              ? "linear-gradient(135deg, #f4f6fa 0 50%, #2a2f38 50% 100%)"
              : (ACCENTS[id] && ACCENTS[id][mode]) || "var(--dsw-alias-brand-primary, #7ca8ff)"
            const isActive = active === id
            return h("button", {
              key: id,
              type: "button",
              "aria-pressed": isActive,
              onClick: () => choose(id),
              style: isActive ? Object.assign({}, base, selected) : base,
            }, [
              h("span", {
                key: "dot",
                "aria-hidden": "true",
                style: {
                  width: 9,
                  height: 9,
                  flex: "0 0 auto",
                  borderRadius: "50%",
                  background: accent,
                  boxShadow: isActive ? "0 0 0 2px var(--dsw-alias-bg-layer-1, transparent)" : "none",
                },
              }),
              h("span", { key: "name", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
                id === DEFAULT_ID ? DEFAULT_LABEL : LABELS[id]),
            ])
          })),
          panel,
        ])
      }

      const slots = ctx?.slots
      if (!slots || typeof slots.inject !== "function") {
        const warn = ctx?.logger?.warn
        if (typeof warn === "function") warn("theme-vivid: Settings-Slot fehlt — Theme bleibt aktiv")
        return
      }

      try {
        slots.inject("settings.general.item", () => slots.register({
          name: "settings.general.item",
          id: "theme-vivid.palette",
          order: 12,
          inject: () => ({}),
        }, PaletteRow))
      } catch (error) {
        const warn = ctx?.logger?.warn
        if (typeof warn === "function") {
          warn(`theme-vivid: Settings-Zeile nicht registriert (${String(error?.message ?? error)})`)
        }
      }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
