# dsh-theme-vivid

Farbige, augenschonende Themes fuer die DeepSeek-Harness-Web-GUI.
Keine Patches am Harness: das Plugin haengt sich an `webserver/index-inject`
und injiziert ein `<style>` in den Seitenkopf.

## Paletten

`aurora` (kuehl/blau), `ember` (warm/bernstein), `mint` (teal/gruen),
`sakura` (rose/plum), `iris` (violett), `slate` (graphit/stahl),
`moss` (waldgruen/oliv), `crimson` (granatrot), `arctic` (eiscyan),
`voltage` (neon-magenta), `sand` (pergament/lehm), `noir` (schwarz/silber),
`gilded` (marineblau/gold), `jade` (greige/smaragd), `orchid` (graphit/magenta)
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

## Anpassen

Unter **Einstellungen > Allgemein > Color theme** stehen alle fuenfzehn Paletten
zur Auswahl. Der Bereich **Customize** setzt Akzent-, Hintergrund-, Text- und
Ueberschriftenfarbe sowie Akzentstaerke, Textkontrast, Zeilenhoehe und den
Eckenradius. Farben und Regler gelten getrennt fuer hell und dunkel, der Radius
fuer beide; alles bleibt unter dem stabilen Schluessel `dsh-theme-vivid.custom`
gespeichert, ein Plugin-Update setzt es nicht zurueck. `install.ps1` legt vor
dem Ueberschreiben ein Backup von `theme.css` an.

Dazu kommen drei Presets, die mit jeder Palette laufen: **Studio** (Sans),
**Book** (Serif, warm) und **Terminal** (Mono, krisp). Sie setzen Schriftart und
Farbnote, wobei alle Farben aus der aktiven Palette abgeleitet werden; eigene
Anpassungen im Customize-Bereich gewinnen gegen das Preset.

## Alle Paletten exportieren

```powershell
npx dsh-theme-vivid list              # ids ausgeben
npx dsh-theme-vivid export .\themes  # fertige CSS-Dateien kopieren
```

## Deinstallation

```powershell
.\uninstall.ps1
```
