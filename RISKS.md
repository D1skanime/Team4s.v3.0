# RISKS

## Top 3 Risks

### 1. Dokumentationsdrift zwischen Phase 40, 41 und 42 kann falsche Folgeentscheidungen auslösen
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Die heutige Arbeit ist stärker im Code und Live-UI gelandet als in neuen Planungsartefakten. Wenn die Story morgen nicht sauber weitergeführt wird, könnte die nächste Session zu früh zurück in ältere Phase-40/41-Doku-Themen kippen.
- **Mitigation:** `STATUS.md`, `CONTEXT.md`, `DAYLOG.md` und `TOMORROW.md` jetzt auf den echten Editor-Polish-Stand halten und morgen von dort starten.

### 2. Ein zu früher globaler Rollout könnte einen noch nicht fertig polierten Editor überall verbreiten
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Der gemeinsame Editor kommt an vielen Stellen vor. Wenn wir den Wrapper sofort überall umlegen, verteilen wir nicht nur die Verbesserungen, sondern auch jede verbleibende Schwäche bei Weißflächen, Kontrast oder Toolbar-Ruhe.
- **Mitigation:** noch eine gezielte lokale Politur auf der Fansub-Seite, dann Call-Site-Inventar und erst danach der breite Rollout.

### 3. Wrong-domain release or fansub persistence would still be the teuerste Produktregression
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** anime and episodes must stay neutral; release media belongs on existing release-native seams, group media belongs on `fansub_group_media`, and `release_version_groups.fansub_group_id` remains the canonical group seam.
- **Mitigation:** read `docs/architecture/db-schema-fansub-domain.md` first, treat `fansub_group_id` as runtime truth.

### 4. Bildunterstützung im Editor könnte versehentlich einen parallelen Upload-Flow erzeugen
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Wenn TipTap-Bilder später einen Sonderweg bekommen, drohen doppelte Asset-Logik, unklare Speicherorte und wieder falsche Domain-Anbindung.
- **Mitigation:** Bildunterstützung erst beginnen, wenn klar ist, welche bestehende Media-/Upload-Strecke und welcher Speicherort wiederverwendet werden.

### 5. Lokale Agenten-/Cache-/Temp-Dateien können versehentlich gestaged werden
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** `.claude/`, `.cache/`, root `node_modules/`, `test-results/`, `tmp-*` und Debug-Dateien gehören nicht in die Produkt-Historie.
- **Mitigation:** `.gitignore` wurde erweitert; trotzdem nur selektiv stagen und `git status --short` vor Commit/Push prüfen.

## Current Blockers
- No known runtime blockers.
- Die letzte visuelle Politur vor dem globalen Rollout ist noch offen.
- Cross-AI review unavailable locally.
