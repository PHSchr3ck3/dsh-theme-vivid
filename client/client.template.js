/**
 * dsh-theme-vivid — Client-Haelfte (Settings-Zeile "Color theme").
 *
 * Wird als Lazy-CJS-Bundle vom Modulsystem geladen:
 *   window.__ModuleLoader__.load({ id, factory })
 * Die Palette selbst liegt als CSS in THEMES (build.mjs setzt sie ein).
 *
 * Die Auswahl wird in localStorage gemerkt und beim naechsten Start sofort
 * angewendet; sie gewinnt damit gegen die im Profil konfigurierte Palette.
 */
window.__ModuleLoader__.load({
  id: "dsh-theme-vivid",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require("react")
    const THEMES = __DSH_VIVID_THEMES__
    const ORDER = [
      "aurora", "ember", "mint", "sakura", "iris", "slate",
      "moss", "crimson", "arctic", "voltage", "sand", "noir",
    ]
    const LABELS = {
      aurora: "Aurora", ember: "Ember", mint: "Mint", sakura: "Sakura", iris: "Iris", slate: "Slate",
      moss: "Moss", crimson: "Crimson", arctic: "Arctic", voltage: "Voltage", sand: "Sand", noir: "Noir",
    }
    const STORAGE_KEY = "dsh-theme-vivid.palette"
    const STYLE_ID = "dsh-theme-vivid-runtime"

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
      return typeof id === "string" && Object.prototype.hasOwnProperty.call(THEMES, id) ? id : "aurora"
    }

    /** Setzt den Laufzeit-Style-Block; spaeter im Dokument = gewinnt gegen die Host-Injection. */
    function paint(id) {
      const css = THEMES[id]
      if (typeof css !== "string") return
      let node = document.getElementById(STYLE_ID)
      if (!node) {
        node = document.createElement("style")
        node.id = STYLE_ID
        document.head.appendChild(node)
      }
      node.textContent = css
    }

    const inject = ["slots"]

    function apply(ctx) {
      const h = React.createElement
      paint(currentId())

      const base = {
        padding: "6px 14px",
        borderRadius: 8,
        border: "1px solid var(--dsw-alias-border-l2, #8884)",
        background: "var(--dsw-alias-bg-layer-2, transparent)",
        color: "var(--dsw-alias-label-primary, inherit)",
        fontSize: 13,
        cursor: "pointer",
      }
      const selected = {
        borderColor: "var(--dsw-alias-brand-primary, #7ca8ff)",
        background: "var(--dsw-alias-interactive-bg-active, #7ca8ff22)",
        color: "var(--dsw-alias-brand-text, inherit)",
      }

      function PaletteRow() {
        const [active, setActive] = React.useState(currentId())
        const choose = (id) => {
          paint(id)
          remember(id)
          setActive(id)
        }
        return h("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "6px 0",
          },
        }, [
          h("div", {
            key: "label",
            style: { color: "var(--dsw-alias-label-primary, inherit)", fontSize: 14 },
          }, "Color theme"),
          h("div", { key: "row", style: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, maxWidth: "72%" } },
            ORDER.map((id) => h("button", {
              key: id,
              type: "button",
              "aria-pressed": active === id,
              onClick: () => choose(id),
              style: active === id ? Object.assign({}, base, selected) : base,
            }, LABELS[id])),
          ),
        ])
      }

      ctx.slots.inject("settings.general.item", () => ctx.slots.register({
        name: "settings.general.item",
        id: "theme-vivid.palette",
        order: 12,
        inject: () => ({}),
      }, PaletteRow))
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
