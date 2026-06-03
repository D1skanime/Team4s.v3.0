---
type: quick
slug: phase68-meilenstein-platzierung-render-fix
created: 2026-06-03
---

# Quick: Phase-68 Remediation — Meilenstein-Platzierung + Render-Bug

## Ziel
Zwei beim Phase-68-Live-UAT gefundene Defekte beheben: (1) Meilenstein-CRUD von der
künftig-öffentlichen `/admin/my-groups/[id]`-Seite in den Edit-Bereich
`/admin/fansubs/[id]/edit` verschieben, my-groups nur read-only; (2) Render-Bug „—" statt
Titel/Jahr (json-Tag-Mismatch backend↔frontend).

## Tasks
1. Backend: snake_case `json`-Tags am `GroupHistoryRow`-Struct.
2. `GroupHistorySection`: `readOnly`-Prop (blendet Edit-Steuerelemente aus).
3. my-groups/[id]: `readOnly` setzen.
4. fansubs/[id]/edit: editierbare `GroupHistorySection` in „Gruppengeschichte"-Tab.
5. Live verifizieren (CRUD + Read-only), nur eigene Dateien stagen.
