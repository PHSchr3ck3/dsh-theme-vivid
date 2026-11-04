#Requires -Version 5.1
<#
.SYNOPSIS
    Installiert ein DSH-Theme (Aurora / Ember / Mint / Sakura / Iris / Slate /
    Moss / Crimson / Arctic / Voltage / Sand / Noir / Gilded / Jade / Orchid)
    in ein Harness-Profil.

.DESCRIPTION
    Kopiert das Host-Plugin "dsh-theme-vivid" in <Profil>\node_modules,
    legt die gewaehlte Palette als theme.css daneben und traegt den
    Patch-Eintrag in <Profil>\cordis.patch.yml ein (mit Backup).

.PARAMETER Theme
    aurora (kuehl/blau), ember (warm/bernstein), mint (teal/gruen),
    sakura (rose/plum), iris (violett), slate (graphit/stahl),
    moss (waldgruen), crimson (granatrot), arctic (eiscyan),
    voltage (neon-magenta), sand (pergament), noir (schwarz/silber),
    gilded (marineblau/gold), jade (greige/smaragd) oder orchid
    (graphit/magenta).

.PARAMETER ProfileDir
    Profilordner, Standard: $env:DSH_PROFILE_DIR (sonst ~\.dsh\profiles\desktop).

.EXAMPLE
    .\install.ps1 -Theme aurora
#>
[CmdletBinding()]
param(
    [ValidateSet('aurora', 'ember', 'mint', 'sakura', 'iris', 'slate', 'moss', 'crimson', 'arctic', 'voltage', 'sand', 'noir', 'gilded', 'jade', 'orchid')]
    [string]$Theme = 'aurora',

    [string]$ProfileDir = $env:DSH_PROFILE_DIR
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
if (-not $ProfileDir -or $ProfileDir.Trim() -eq '') {
    $ProfileDir = Join-Path $HOME '.dsh\profiles\desktop'
}
$ProfileDir = (Resolve-Path -LiteralPath $ProfileDir).Path

$css = Join-Path $root "dist\$Theme.css"
if (-not (Test-Path -LiteralPath $css)) {
    throw "Palette '$Theme' fehlt ($css). Bitte zuerst ausfuehren:  node build.mjs"
}

$pluginSrc = Join-Path $root 'plugin'
$target = Join-Path $ProfileDir 'node_modules\dsh-theme-vivid'

Write-Host "Theme   : $Theme"
Write-Host "Profil  : $ProfileDir"
Write-Host "Ziel    : $target"

New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $pluginSrc 'index.js') -Destination $target -Force
Copy-Item -LiteralPath (Join-Path $pluginSrc 'package.json') -Destination $target -Force

# Eigene CSS-Anpassungen im Profil nicht stillschweigend ueberschreiben.
$themeTarget = Join-Path $target 'theme.css'
if (Test-Path -LiteralPath $themeTarget) {
    $themeStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $themeBackup = "$themeTarget.bak-$themeStamp"
    Copy-Item -LiteralPath $themeTarget -Destination $themeBackup -Force
    Write-Host "Backup  : $themeBackup"
}
Copy-Item -LiteralPath $css -Destination $themeTarget -Force
Copy-Item -LiteralPath (Join-Path $pluginSrc 'cordis.patch.yml') -Destination $target -Force
$clientFile = Join-Path $pluginSrc 'client.js'
if (Test-Path -LiteralPath $clientFile) {
    Copy-Item -LiteralPath $clientFile -Destination $target -Force
}

# Alle Paletten mitliefern, damit config.theme im Profil funktioniert.
$themesSrc = Join-Path $pluginSrc 'themes'
if (Test-Path -LiteralPath $themesSrc) {
    $themesTarget = Join-Path $target 'themes'
    New-Item -ItemType Directory -Path $themesTarget -Force | Out-Null
    Copy-Item -Path (Join-Path $themesSrc '*') -Destination $themesTarget -Force
}

# --- Patch-Eintrag sicherstellen -------------------------------------------
$patchPath = Join-Path $ProfileDir 'cordis.patch.yml'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

$block = @"

# --- dsh-theme-vivid: Farbthema fuer die Web-GUI -------------------------
# Entfernen mit .\uninstall.ps1, Wechsel mit .\install.ps1 -Theme <name>.
- insert:
    - id: theme-vivid
      name: dsh-theme-vivid
"@

$content = ''
if (Test-Path -LiteralPath $patchPath) {
    $content = Get-Content -LiteralPath $patchPath -Raw
    Copy-Item -LiteralPath $patchPath -Destination "$patchPath.bak-theme-$stamp" -Force
    Write-Host "Backup  : $patchPath.bak-theme-$stamp"
}

if ($content -match 'dsh-theme-vivid') {
    Write-Host 'Patch   : Eintrag existiert bereits, nur Theme-Datei getauscht.'
}
elseif ($content.Trim() -eq '' -or $content.Trim() -eq '[]') {
    Set-Content -LiteralPath $patchPath -Value $block.TrimStart() -Encoding UTF8
    Write-Host 'Patch   : neue Patch-Datei geschrieben.'
}
else {
    Add-Content -LiteralPath $patchPath -Value $block -Encoding UTF8
    Write-Host 'Patch   : Eintrag an cordis.patch.yml angehaengt.'
}

Write-Host ''
Write-Host 'Fertig. Jetzt:' -ForegroundColor Green
Write-Host '  1) GUI-Fenster neu laden (Strg+R).'
Write-Host '  2) Falls sich nichts aendert: Harness beenden und neu starten.'
Write-Host '  3) Theme wechseln: .\install.ps1 -Theme ember   (danach neu laden)'
Write-Host '  4) Eigenen Feinschliff: <Profil>\node_modules\dsh-theme-vivid\theme.css bearbeiten,'
Write-Host '     dann nur neu laden - das CSS wird bei jedem Aufruf frisch gelesen.'
