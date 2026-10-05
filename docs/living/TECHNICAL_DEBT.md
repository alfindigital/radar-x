# TECHNICAL_DEBT — RADAR-X

| Debt | Alasan disengaja | Kapan dilunasi |
|---|---|---|
| `SupabaseStore` belum wired (fallback JsonStore) | JSON snapshot cukup untuk demo zero-friction; Postgres dipertahankan sebagai opsi env | pasca-hackathon bila perlu live cadence |
| `broker-activity` detail tidak di-ingest (hanya `/top/`) | payload >1MB/req → credit & size tidak sebanding untuk v3 | v3.1 bila juri minta drill-down |
| `free_float` per-subsector = ~60 calls | satu-satunya cara API expose (filter wajib) | TASK-12 budget |
| Board lama tetap hidup di `?v=radar` | rollback murah + pembanding | hapus setelah v3 stabil |
