# RADAR-X daily ingest runner — scheduled until 2026-10-11 (submission deadline +3).
# Runs the cheap daily layer: boards --lite (3 calls) + filings + ownership rolling chunk.
# Each stage's exit code is checked — a failed stage is logged and fails the run.
$ErrorActionPreference = "Continue"
$repo = "C:\Users\GEEKOM A8\Documents\Apps\radar-x-hackaton"
$logDir = Join-Path $repo "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("daily-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

Set-Location $repo
$failed = @()
"=== $(Get-Date -Format o) daily ingest start ===" | Out-File $log -Append utf8
npx tsx scripts/ingest.ts boards --lite *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "boards" }
npx tsx scripts/ingest.ts filings *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "filings" }
npx tsx scripts/ingest.ts ownership --limit 100 *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "ownership" }
if ($failed.Count) {
  "=== $(Get-Date -Format o) daily ingest FAILED: $($failed -join ', ') ===" | Out-File $log -Append utf8
  exit 1
}
"=== $(Get-Date -Format o) daily ingest done ===" | Out-File $log -Append utf8
