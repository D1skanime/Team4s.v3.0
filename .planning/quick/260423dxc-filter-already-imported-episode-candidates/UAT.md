---
status: pending
task: 260423dxc-filter-already-imported-episode-candidates
---

## UAT: Filter bereits importierter Episoden im Preview

### Test 1 — Zweiter Import zeigt nur neue Kandidaten

**Vorbereitung:**
1. Anime mit Jellyfin verknüpft (z.B. Naruto)
2. Ersten Batch (z.B. Episoden 1–50) importieren und Apply ausführen

**Test:**
3. Weitere Jellyfin-Dateien hinzufügen (z.B. Episoden 51–100)
4. Import-Preview erneut öffnen

**Erwartet:** Nur die neuen Dateien (51–100) erscheinen als Kandidaten — die bereits importierten (1–50) sind nicht mehr sichtbar.

**Ergebnis:** [ ] pass  [ ] fail

---

### Test 2 — Erster Import bleibt unverändert

**Test:** Ersten Import-Durchlauf wie bisher durchführen (noch keine vorherigen Imports)

**Erwartet:** Alle Jellyfin-Kandidaten erscheinen wie gewohnt, nichts wird gefiltert.

**Ergebnis:** [ ] pass  [ ] fail

---

## Zusammenfassung

total: 2  
passed:  
issues:  
