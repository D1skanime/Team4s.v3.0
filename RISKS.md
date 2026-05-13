# RISKS

## Top 3 Risks

### 1. Dokumentationsdrift zwischen Phase 40, 41 und 42 kann falsche Folgeentscheidungen auslösen
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Phase 41 ist praktisch UAT-grün, aber einzelne Folgeartefakte sprechen noch so, als sei der Editor-Baseline-Stand instabil. Das kann unnötige Retests oder falsche Priorisierung auslösen.
- **Mitigation:** `41-UAT.md`, `40-VERIFICATION.md`, `40-VALIDATION.md` und `42-CONTEXT.md` gegeneinander synchronisieren, bevor Phase 42 vertieft wird.

### 2. Wrong-domain release or fansub persistence would still be the teuerste Produktregression
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** anime and episodes must stay neutral; release media belongs on existing release-native seams, group media belongs on `fansub_group_media`, and `release_version_groups.fansub_group_id` remains the canonical group seam.
- **Mitigation:** read `docs/architecture/db-schema-fansub-domain.md` first, treat `fansub_group_id` as runtime truth.

### 3. Lokale Agenten-/Cache-/Temp-Dateien können versehentlich gestaged werden
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** `.claude/`, `.cache/`, root `node_modules/`, `test-results/`, `tmp-*` und Debug-Dateien gehören nicht in die Produkt-Historie.
- **Mitigation:** `.gitignore` wurde erweitert; trotzdem nur selektiv stagen und `git status --short` vor Commit/Push prüfen.

## Current Blockers
- No known runtime blockers.
- Die Doku-Synchronisierung für Phase 40/41/42 ist noch offen.
- Cross-AI review unavailable locally.
