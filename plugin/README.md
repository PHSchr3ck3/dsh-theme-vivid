# dsh-theme-vivid

Farbige, augenschonende Themes fuer die DeepSeek-Harness-Web-GUI.
Keine Patches am Harness: das Plugin haengt sich an `webserver/index-inject`
und injiziert ein `<style>` in den Seitenkopf.

## Paletten

`aurora` (kuehl/blau), `ember` (warm/bernstein), `mint` (teal/gruen),
`sakura` (rose/plum), `iris` (violett), `slate` (graphit/stahl),
`moss` (waldgruen/oliv), `crimson` (granatrot), `arctic` (eiscyan),
`voltage` (neon-magenta), `sand` (pergament/lehm), `noir` (schwarz/silber)
— jede Palette hell und dunkel.

## Installation

Als DSH-Bundle ueber den Plugin-Manager: Paket installieren, das mitgelieferte
`cordis.patch.yml` wird automatisch angewendet. Alternativ manuell:

```powershell
.\install.ps1 -Theme aurora
```

**Wichtig:** Im Desktop-Profil wird die Injection-Tabelle beim Start
eingesammelt. Nach Installation oder Theme-Wechsel die App neu starten.

## Konfiguration

| Feld | Bedeutung |
|---|---|
| `theme` | Palette: `aurora` (Standard), `ember`, `mint`, `sakura`, `iris`, `slate`, `moss`, `crimson`, `arctic`, `voltage`, `sand`, `noir` |
| `cssPath` | direkter Pfad zu einer CSS-Datei; gewinnt gegen `theme` |

`DSH_VIVID_CSS` (Umgebungsvariable) gewinnt gegen beides.

## Alle Paletten exportieren

```powershell
npx dsh-theme-vivid list              # ids ausgeben
npx dsh-theme-vivid export .\themes  # fertige CSS-Dateien kopieren
```

## Deinstallation

```powershell
.\uninstall.ps1
```
