# RADAR-X daily ingest runner — scheduled until 2026-10-11 (submission deadline +3).
#
# Contract: this task refreshes LOCAL data only. Stages: raw ingest (boards,
# filings with a bounded 1-month overlap, ownership rolling chunk) → compute a
# dated derived generation → audit:data gate. Publishing is a separate manual
# step (git commit + push → Vercel); this script never deploys.
# Each stage's exit code is checked — a failed stage is logged and fails the run.
# SECTORS_CALL_BUDGET caps billed API calls per run so no stage can drain quota.
$ErrorActionPreference = "Continue"
$repo = "C:\Users\GEEKOM A8\Documents\Apps\radar-x-hackaton"
$logDir = Join-Path $repo "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("daily-" + (Get-Date -Format "yyyy-MM-dd") + ".log")

Set-Location $repo

# Self-expiry: the task's OS EndBoundary can drift from the mandate, so the
# script also refuses to run after 2026-10-11.
if ((Get-Date).Date -gt [datetime]"2026-10-11") {
  "=== $(Get-Date -Format o) daily ingest expired (mandate ended 2026-10-11) ===" | Out-File $log -Append utf8
  exit 0
}

$env:SECTORS_CALL_BUDGET = "170" # ~155 expected; hard ceiling with headroom

$failed = @()
"=== $(Get-Date -Format o) daily ingest start ===" | Out-File $log -Append utf8
npx tsx scripts/ingest.ts boards --lite *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "boards" }
npx tsx scripts/ingest.ts filings --months 1 *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "filings" }
npx tsx scripts/ingest.ts ownership --limit 100 *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "ownership" }
npx tsx scripts/compute.ts --as-of today *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "compute" }
npm run audit:data *>> $log
if ($LASTEXITCODE -ne 0) { $failed += "audit" }
if ($failed.Count) {
  "=== $(Get-Date -Format o) daily ingest FAILED: $($failed -join ', ') ===" | Out-File $log -Append utf8
  exit 1
}
"=== $(Get-Date -Format o) daily ingest done ===" | Out-File $log -Append utf8
