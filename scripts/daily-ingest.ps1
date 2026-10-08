# RADAR-X daily ingest runner — scheduled until 2026-10-11 (submission deadline +3).
#
# Contract: this task refreshes LOCAL data only. Stages: raw ingest (market
# boards, full-universe close+flow, insider filings, broker summary rotation,
# extras, cohort overlay, ownership, per-symbol flow/price depth) → compute a
# dated derived generation → audit:data gate. Publishing is a separate manual
# step (git commit + push → Vercel); this script never deploys.
# Each stage's exit code is checked — a failed stage is logged and fails the run.
# SECTORS_CALL_BUDGET caps billed API calls per stage so no stage can drain quota.
# Rotating stages take the stalest/thinnest symbols first, so a daily --limit
# cycles the full universe instead of re-reading the same symbols every run.
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

# Shared daily ceiling, not per-stage: the ledger file counts billed calls
# across every stage process so the whole run cannot exceed 600/day.
$env:SECTORS_CALL_BUDGET = "600"
$env:SECTORS_CALL_LEDGER = Join-Path $logDir ".sectors-call-ledger.json"

$failed = @()
function Run([string]$name, [scriptblock]$block) {
  & $block *>> $log
  if ($LASTEXITCODE -ne 0) { $script:failed += $name }
}

"=== $(Get-Date -Format o) daily ingest start ===" | Out-File $log -Append utf8

Run "boards"        { npx tsx scripts/ingest.ts boards --lite }
Run "universe"      { npx tsx scripts/ingest.ts universe --days 2 }
Run "filings"       { npx tsx scripts/ingest.ts filings --months 1 }
Run "broker"        { npx tsx scripts/ingest.ts broker --universe --limit 200 }
Run "extras"        { npx tsx scripts/ingest.ts extras }
Run "cohorttop"     { npx tsx scripts/ingest.ts cohorttop --limit 15 }
Run "ownership"     { npx tsx scripts/ingest.ts ownership --limit 150 }
Run "flows"         { npx tsx scripts/ingest.ts flows --universe --limit 100 }
Run "prices"        { npx tsx scripts/ingest.ts prices --universe --limit 100 }

# Weekly block (Saturdays): slow-moving feeds and full-depth refreshers that
# are too heavy for the daily quota.
if ((Get-Date).DayOfWeek -eq "Saturday") {
  Run "tickers"       { npx tsx scripts/ingest.ts tickers }
  Run "rotation"      { npx tsx scripts/ingest.ts rotation }
  Run "brokertop"     { npx tsx scripts/ingest.ts brokertop }
  Run "index"         { npx tsx scripts/ingest.ts index --all }
  Run "holders"       { npx tsx scripts/ingest.ts holders --universe --limit 300 }
}

Run "compute"       { npx tsx scripts/compute.ts --as-of today }
Run "audit"         { npm run audit:data }

if ($failed.Count) {
  "=== $(Get-Date -Format o) daily ingest FAILED: $($failed -join ', ') ===" | Out-File $log -Append utf8
  exit 1
}
"=== $(Get-Date -Format o) daily ingest done ===" | Out-File $log -Append utf8
