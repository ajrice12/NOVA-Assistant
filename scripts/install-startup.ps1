$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InstallDirectory = Join-Path $env:LOCALAPPDATA "NOVA"
$StartupDirectory = [Environment]::GetFolderPath("Startup")
$SourceRunner = Join-Path $PSScriptRoot "start-nova.ps1"
$SourceLauncher = Join-Path $PSScriptRoot "nova-startup.vbs"

New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
Copy-Item -LiteralPath $SourceRunner -Destination (Join-Path $InstallDirectory "start-nova.ps1") -Force
Copy-Item -LiteralPath $SourceLauncher -Destination (Join-Path $StartupDirectory "NOVA Work Intelligence.vbs") -Force

Write-Host "NOVA will now open after sign-in as soon as this PC has internet access."
