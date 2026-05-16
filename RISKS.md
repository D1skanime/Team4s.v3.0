# RISKS

## Top 5 Risks

### 1. Testdaten bleiben versehentlich als reale Produktdaten stehen
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Heute wurde ein echter Upload auf Release-Version 62 gespeichert. Wenn der nur als Verifikationsartefakt gedacht war, sollte er bewusst wieder gelöscht werden.
- **Mitigation:** Morgen als erste kleine Aufgabe prüfen, ob `release_version_media.id = 20` entfernt werden soll.

### 2. `3000` und `3002` können unterschiedliche Wahrheiten zeigen
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Im heutigen Verlauf war `3002` mehrfach veraltet oder instabil. UI-Entscheidungen können sonst auf dem falschen Stand bewertet werden.
- **Mitigation:** Für harte UAT zuerst `3000` plus belegten Backend-Stand verwenden; `3002` nur nach frischem Build und Sichtprüfung.

### 3. Ein neuer Vor-43-Slice könnte die Roadmap wieder verwässern
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Vor Phase 43 gibt es immer noch verlockende UI- oder Editor-Ideen. Zu viele Zusatzslices könnten den Einstieg in Auth/Rollen erneut verschieben.
- **Mitigation:** Nur noch sehr kleine Cleanup-Arbeit vor 43 zulassen; keine neue größere Architekturphase davor starten.

### 4. TipTap-Bildintegration könnte später versehentlich einen Parallel-Upload-Flow bekommen
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Das wurde heute bewusst mehrfach abgegrenzt. Ein Schnellschuss im Editor würde Media-Logik und Ownership wieder aufweichen.
- **Mitigation:** Den bestehenden Media-Uploader als verpflichtende Grundlage festhalten und erst bei klarer Phasenentscheidung umsetzen.

### 5. Der breite Worktree erhöht weiterhin Commit-/Push-Risiko
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Neben den Produktänderungen liegen viele Planungsartefakte und untracked Dateien im Baum. Ein unbewusster Sammel-Commit kann unnötig laut werden.
- **Mitigation:** Vor Commit noch einmal bewusst `git status --short` prüfen und nur sinnvolle Session-Artefakte mitnehmen.

## Current Blockers
- Kein harter Runtime-Blocker auf dem verifizierten Release-Media-Flow.
- Cross-AI review unavailable locally.
- Phase 42 bleibt absichtlich blockiert, bis Phase 43 bis 48 die notwendige Rollen-/User-Basis liefern.
