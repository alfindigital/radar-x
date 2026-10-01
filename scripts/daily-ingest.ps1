# RADAR-X daily ingest runner — scheduled until 2026-10-11 (submission deadline +3).
# Runs the cheap daily layer: boards --lite (3 calls) + filings + ownership rolling chunk.
$ErrorActionPreference = "Continue"
$repo = "C:\Users\GEEKOM A8\Documents\Apps\radar-x-hackaton"
$logDir = Join-Path $repo "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("daily-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

Set-Location $repo
"=== $(Get-Date -Format o) daily ingest start ===" | Out-File $log -Append utf8
npx tsx scripts/ingest.ts boards --lite *>> $log
npx tsx scripts/ingest.ts filings *>> $log
npx tsx scripts/ingest.ts ownership --limit 100 *>> $log
"=== $(Get-Date -Format o) daily ingest done ===" | Out-File $log -Append utf8
