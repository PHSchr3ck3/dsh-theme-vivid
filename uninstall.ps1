#Requires -Version 5.1
<#
.SYNOPSIS
    Entfernt das DSH-Theme wieder vollstaendig.

.DESCRIPTION
    Loescht <Profil>\node_modules\dsh-theme-vivid und entfernt den
    Patch-Block aus cordis.patch.yml (Backup wird angelegt).
#>
[CmdletBinding()]
param(
    [string]$ProfileDir = $env:DSH_PROFILE_DIR
)

$ErrorActionPreference = 'Stop'

if (-not $ProfileDir -or $ProfileDir.Trim() -eq '') {
    $ProfileDir = Join-Path $HOME '.dsh\profiles\desktop'
}
$ProfileDir = (Resolve-Path -LiteralPath $ProfileDir).Path

$target = Join-Path $ProfileDir 'node_modules\dsh-theme-vivid'
if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
    Write-Host "Entfernt : $target"
}
else {
    Write-Host "Nicht vorhanden : $target"
}

$patchPath = Join-Path $ProfileDir 'cordis.patch.yml'
if (Test-Path -LiteralPath $patchPath) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    Copy-Item -LiteralPath $patchPath -Destination "$patchPath.bak-untheme-$stamp" -Force

    $raw = Get-Content -LiteralPath $patchPath -Raw
    # Block vom Marker-Kommentar bis zum naechsten Block-Kommentar bzw. Dateiende.
    $pattern = '(?ms)^# --- dsh-theme-vivid.*?(?=^# ---|\z)'
    $cleaned = [regex]::Replace($raw, $pattern, '')
    if ($cleaned -ne $raw) {
        Set-Content -LiteralPath $patchPath -Value $cleaned.TrimEnd() -Encoding UTF8
        Write-Host "Patch    : Eintrag entfernt (Backup: $patchPath.bak-untheme-$stamp)"
    }
    else {
        Write-Host 'Patch    : kein Theme-Eintrag gefunden.'
    }
}

Write-Host ''
Write-Host 'Fertig. GUI neu laden (Strg+R) oder Harness neu starten.' -ForegroundColor Green
