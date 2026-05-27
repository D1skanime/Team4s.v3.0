---
phase: 53
reviewer: claude
reviewed_at: 2026-05-27
review_rounds: 3
plans_reviewed:
  - 53-01-PLAN.md (Round 1 + 2 + 3)
  - 53-02-PLAN.md (Round 1 + 2 + 3)
---

# Cross-AI Plan Review — Phase 53: Member Identity Hub

---

## Plankorrektur — Avatar-Upload-Architektur (nach Round 3)

**Problem:** Der Plan behandelt den Avatar-Upload als offene Architekturentscheidung. Das ist falsch — das Upload-System ist bereits vollständig gebaut und muss nur genutzt werden.

### Was bereits fertig ist (nicht neu bauen)

- `uploadOwnProfileAvatar(file: File)` in `frontend/src/lib/api.ts` — sendet `FormData` an `POST /api/v1/me/profile/avatar`
- `UploadOwnProfileAvatar` Handler in `backend/internal/handlers/app_profile.go` — validiert, speichert `original.{ext}` unter `media/profile/{memberID}/avatar/{mediaID}/`, tracked in DB
- `detectAvatarImage()` — validiert MIME-Typ und Größe, prüft Bilddimensionen
- Das Backend speichert aktuell das **hochgeladene** Bild als `original.{ext}`. Wenn der Client nur ein gecropptes Bild sendet, ist das nicht das ungecroppte Pre-Crop-Original.

### Was wirklich fehlt (und nur das)

1. **AvatarCropDialog** — Client-seitiger Crop VOR dem Upload:
   - Nutzer wählt Bild → Dialog öffnet → Crop/Zoom → `canvas.toBlob()` für das zugeschnittene Ergebnis
   - Nachträgliche Korrektur durch D-44/D-59: Quelle und Crop-Ergebnis müssen gemeinsam über den bestehenden Profil-Avatar-Endpoint transportiert werden; der Helper darf dafür contract-konform erweitert werden.
   - Geometrie: Crop-Primitives aus `mediaUploadCropMath.ts` wiederverwenden, 1:1-Constraint + Circular-Preview ergänzen
   - Touch-Events: `pointerdown/move/up` zusätzlich zu Mouse-Events

2. **Backend-Size-Limit** — bewusst prüfen, aber nicht zwingend ändern:
   - `detectAvatarImage` nutzt aktuell `maxImageSize` (50 MB aus `media_upload.go`)
   - 5 MB ist keine harte Phase-53-Vorgabe; 50 MB ist akzeptabel, wenn das bewusst dokumentiert und getestet bleibt
   - Backend-Änderung ist nur nötig, wenn später produktseitig ein kleineres Avatar-Limit entschieden wird

3. **SVG bereits geblockt** — `allowedImageMimeTypes` in `media_upload.go` filtert schon. Prüfen ob SVG/`image/svg+xml` darin fehlt — wenn ja, eintragen. Wenn nicht, kein Handlungsbedarf.

### Konsequenzen für den Plan

- **Task 1 (53B) vereinfachen:** Kein neues Upload-System bauen. Nachträgliche Korrektur durch D-44/D-59: Der bestehende Helper/Endpoint muss aber Source-Retention unterstützen, damit das ungecroppte Pre-Crop-Original erhalten bleibt.
- **Task 2 (53B) vereinfachen:** Nicht neue Validierungslogik bauen — vorhandene Typ-/Bildvalidierung prüfen, SVG-Ausschluss testen und das akzeptierte 50-MB-Verhalten dokumentieren.
- **Blocker 2 aus Round 3 wieder verschärft durch D-55:** Shared Crop-Primitives werden in `components/media/crop` verschoben; `MediaUpload.tsx`, Avatar-Crop und Tests müssen im selben Change auf den neuen Pfad wechseln.
- **Source-Retention:** Nachträgliche Korrektur durch D-44/D-59: Pre-Crop-Source-Retention ist Phase-53-Pflicht. Das ungecroppte Original wird intern gespeichert, das gecroppte Bild bleibt die aktive Anzeigevariante, und alte Avatar-Dateien werden erst nach erfolgreichem Replace bereinigt.

---

## Round 3 — Was der zweite Plan-Update gelöst hat

Alle Round-2-Concerns wurden adressiert:

| Round-2-Concern | Gelöst durch |
|----------------|--------------|
| Nicht-Admin-Navigationspfad fehlte | Task 0 (AppShell) + D-45–D-52 + `AppShell.tsx` in files_modified |
| Test-Datei nur ausgeführt, nicht geschrieben | D-53 + Task 1 action: „Actively create ... with assertions for ..." |
| `'use client'` kein automatisierter Check | Task 1 verify: `Select-String ... 'use client'` |
| Admin-Tests nicht auditiert | Task 1 action: „Audit admin/profile/page.test.tsx ... remove admin-specific assertions" |
| Circular-Crop-Geometrie nicht adressiert | D-54 + Task 1: „forced 1:1 avatar output, round preview, round canvas/mask" mit Tests |
| Admin-Kopplung von Crop-Primitives | D-55 + `frontend/src/components/media/crop` in files_modified + Task 1 action |
| Avatar-Remove undokumentiert | D-56 + Task 2: „Do not add a production Entfernen-Button unless DELETE contract" |
| Task 6 optionaler Implementierungspfad | D-57 + Task 6 umgeschrieben zu fixem Defer |
| Migrations-Nummerierung | D-58 + Task 3a + Task 4: „inspect highest migration number + git status" |
| TipTap-Stack-Duplikation | D-42 + Task 4: „reuse Phase 41 stack, no second TipTap service" |
| Avatar-Size-Check-Position | D-58 + Task 2: „before decode/save, use MaxBytesReader" |
| Quellbild-Verlust | D-44 + Task 1: „Decide explicitly whether original source must be retained" |

**Bewertung der zweiten Überarbeitung:** Sehr gründlich. Alle kritischen Punkte aus Round 2 sind eingebaut.

---

## Round 3 — Neue und verbleibende Concerns

---

### Plan 53-01 (53A) — Round 3

#### Summary

Der größte Eingriff dieser Überarbeitung ist Task 0: die App-Shell. Das ist richtig — der Nicht-Admin-Einstieg ist ein echter Mangel. Aber Task 0 bringt das potenziell größte Scope-Risiko der gesamten Phase mit sich. Drei neue Concerns betreffen direkt den AppShell-Task.

---

#### Concerns

- **[HIGH] Task 0 (AppShell) prüft keine bestehenden Next.js `layout.tsx`-Dateien.**
  Next.js App Router hat ein natives Layout-System: `frontend/src/app/layout.tsx` (Root), `frontend/src/app/me/layout.tsx` (Segment). Wenn bereits ein Root-Layout oder ein `/me`-Segment-Layout existiert, ist `AppShell.tsx` als Component möglicherweise die falsche Architektur — die richtige Lösung wäre ein `layout.tsx` im `/me`-Verzeichnis. Task 0 `<read_first>` enthält `frontend/src/app/auth/page.tsx` und `frontend/src/app/admin/page.tsx`, aber kein `layout.tsx`. Ein Executor der eine redundante `AppShell`-Component baut, während das App-Router-Layout-System ungenutzt liegt, erzeugt technische Schulden und eine inkonsistente Shell-Architektur.

- **[HIGH] Crop-Primitives-Verschiebung bricht bestehende Admin-Consumer.**
  Task 1 (53B) verschiebt `mediaUploadCropMath.ts` und `mediaUploadA11y.ts` nach `frontend/src/components/media/crop`. Aber `frontend/src/components/admin/MediaUpload.tsx` importiert diese Dateien direkt. Wenn die Primitives verschoben werden, bricht `MediaUpload.tsx` sofort — alle Admin-Anime/Gruppen-Cover-Upload-Flächen fallen aus. Die Pläne enthalten keinen Schritt, der die bestehenden Imports in `MediaUpload.tsx` auf den neuen Pfad aktualisiert. Das ist ein Cross-Plan-Risiko: 53B-Task 1 erzeugt eine Regression in der bestehenden Admin-UI, wenn nicht gleichzeitig `MediaUpload.tsx` angepasst wird.

- **[MEDIUM] AppShell-Scope-Risiko: D-47 beschreibt eine vollständige App-Navigation.**
  D-47 definiert: „Public-Bereich, Dashboard, capability-gated Verwaltung, Mein Bereich mit Mein Profil/Meine Gruppen/Meine Beiträge, Einstellungen und User-Footer." Das ist keine minimal reusable Shell — das ist die komplette Navigation der Anwendung. Task 0 sagt „create the smallest reusable `AppShell`-style component" — aber die Entscheidungen D-45–D-49 ziehen eine vollständige Navigationsstruktur nach. Ein Executor wird versuchen, alle genannten Bereiche zu bauen. D-48 begrenzt die Produktion auf `/me/profile`, aber die Shell-Komponente selbst bleibt groß. Das Risiko: Task 0 wird zur größten Aufgabe in 53A und verdrängt die eigentliche Profil-Arbeit.

- **[MEDIUM] `AppShell.test.tsx` ohne Mindest-Test-Spezifikation.**
  Task 0 verify führt `AppShell.test.tsx` aus — aber die `<action>` beschreibt keine konkreten Tests. Dasselbe Muster wie beim ursprünglichen `me/profile/page.test.tsx`-Problem: ohne explizite Assertions im Action-Block kann ein Executor eine Datei mit einem trivialen Render-Test anlegen und den Verify bestehen.

- **[MEDIUM] D-40: „Alle Zielbereiche sichtbar" erhöht die Dateigrößenproblematik erheblich.**
  Hero, Basisdaten, Story, Avatar-Card, Sichtbarkeits-Card, Account-Sicherheit, Mitgliedschaften und Beitrags-Summary müssen alle in 53A sichtbar angelegt werden. Das ist 8 Bereiche × je ein eigenes Component-File. Der 450-Zeilen-Grenze wird besonders schwer einzuhalten sein, da das `components/`-Verzeichnis nun sicherstellen muss, dass JEDER dieser Bereiche als eigene Datei lebt — bevor `page.tsx` über 450 Zeilen geht. Kein Task spezifiziert die maximale Dateigröße einzelner Component-Files.

- **[MEDIUM] `Select-String` verify ist PowerShell — portabilität fragil.**
  Task 1 verify: `Select-String -Path "src/app/me/profile/page.tsx" -Pattern "'use client'|\"use client\""` ist PowerShell-Syntax. Auf WSL oder bash schlägt das fehl. Gleichzeitig: wenn `page.tsx` ein dünner Server Component Wrapper ist und `'use client'` im Client-Leaf-Component liegt (z.B. `components/MyProfileClient.tsx`), schlägt dieser Check auch fehl — obwohl die Architektur korrekt ist. Der Check ist sowohl portabilitäts- als auch architekturempfindlich.

- **[LOW] OpenAPI-Korrektheit ohne Validator.**
  Task 5 verify bleibt `git diff --check` — kein OpenAPI-Schema-Validator. Ein Executor kann YAML mit korrektem Diff erzeugen, das syntaktisch invalid oder semantisch unvollständig ist, ohne einen Fehler zu bekommen.

---

#### Gesamt-Risiko 53A (Round 3): **MEDIUM**

Zwei echte Blocker: Next.js Layout-Architektur nicht geprüft (Task 0 könnte falsch bauen) und Crop-Primitives-Move bricht Admin-Consumers (Cross-Plan-Regression). Der AppShell-Scope ist ein Warnsignal, aber kein Blocker, wenn D-48 konsequent durchgesetzt wird.

---

### Plan 53-02 (53B) — Round 3

#### Summary

Der Plan ist substanziell gereift. Die meisten kritischen Lücken aus Round 2 sind geschlossen. Drei neue Concerns sind entstanden, die alle mit der Einführung von `components/media/crop` und dem Phase-41-TipTap-Pattern zusammenhängen.

---

#### Concerns

- **[HIGH] Crop-Primitives-Move ohne Konsistenzpflege für bestehende Imports.**
  (Identisch mit dem 53A-Concern.) Task 1 plant den Move nach `frontend/src/components/media/crop` — aber `MediaUpload.tsx` importiert die Primitives aus `components/admin`. Der Plan listet `frontend/src/components/admin/MediaUpload.tsx` in `files_modified`, aber die `<action>` erwähnt nicht explizit, dass der Import-Pfad in `MediaUpload.tsx` auf den neuen Ort aktualisiert werden muss. Wenn der Executor die Primitives verschiebt ohne `MediaUpload.tsx` zu aktualisieren, bricht die Admin-Cover-Upload-UX.

- **[MEDIUM] Phase-41-TipTap-Pattern: `body_json`/`body_html`/`body_text` bedeutet 3 neue Spalten.**
  Task 4 referenziert die „Phase 41 stack" mit dem `body_json`/`body_html`/`body_text`-Pattern. Aber `member_story` ist aktuell eine einzelne `text`-Spalte in der `members`-Tabelle. Das Phase-41-Pattern zu übernehmen bedeutet: Migration mit drei neuen Spalten (`member_story_json`, `member_story_html`, `member_story_text`) plus mögliche Datenmigration von altem Plain-Text-Wert. Der Plan sagt „If schema changes are required, add a new reversible migration" — aber ein Executor der nicht weiß was Phase 41 gebaut hat, wird das „body-triple" vielleicht nicht auf Anhieb richtig bauen. Phase-41-Artifacts fehlen im `@context`-Block von 53-02.

- **[MEDIUM] Task 5b hängt an Task 0 aus 53A — ohne Fallback-Definition.**
  Task 5b hardens the AppShell for mobile (Drawer/Burger). Aber was passiert, wenn 53A's AppShell nach Task 0 noch kein klares Mobile-Grundgerüst hat? Task 5b in 53B baut auf einer Implementierung auf, die in 53A entsteht — aber die Verbindung zwischen beiden ist nur durch `depends_on: 53-01` definiert, nicht durch eine konkrete Interface-Spezifikation. Wenn 53A's AppShell keine mobile Prop-/Slot-API hat, muss Task 5b die Shell strukturell ändern statt nur zu konfigurieren.

- **[LOW] TipTap-Toolbar-Links: „only if safe link handling is implemented."**
  Task 4 sagt Links im Toolbar nur wenn sicheres Link-Handling implementiert ist. Was bedeutet „sicher" konkret? Allowlisted `href`-Protokolle (`https://`, keine `javascript:`, kein `data:`)? Backend-seitige Link-Validierung in `tiptap_service.go`? Ein Executor könnte Links mit clientseitiger Validierung implementieren und das als „sicher" werten. Die Definition fehlt.

- **[LOW] Keine explizite Rollback-Simulation für TipTap-Migration.**
  Task 4 fordert reversible Migration. Aber keine Acceptance Criteria und kein Verify-Schritt fordert, dass die Down-Migration tatsächlich ausgeführt und getestet wurde. „Reversible" bleibt eine papierbasierte Zusicherung ohne verifizierte Prüfung.

---

#### Gesamt-Risiko 53B (Round 3): **LOW–MEDIUM**

Der Crop-Primitives-Move ist der einzige echte HIGH — und er kann durch einen einzigen Satz in Task 1 action gelöst werden: „Update all existing import references to the old path in `MediaUpload.tsx` when primitives are moved." Alle anderen Punkte sind klärungswürdig aber kein Blocker.

---

## Gesamtbewertung aller drei Runden

| Plan | Round 1 | Round 2 | Round 3 |
|------|---------|---------|---------|
| 53-01 | HIGH | MEDIUM | MEDIUM |
| 53-02 | HIGH | MEDIUM | LOW–MEDIUM |

Die Pläne sind nach drei Runden Execution-ready — mit zwei konkreten Fixes vor dem Start:

### Verbleibende Blocker (2 Stück, beide lösbar in 5 Minuten)

**Blocker 1: Next.js-Layout-Architektur in Task 0 prüfen**
→ `frontend/src/app/layout.tsx` und `frontend/src/app/me/layout.tsx` in `<read_first>` von Task 0 aufnehmen. Wenn Segment-Layouts existieren, ist `layout.tsx` die native Next.js-Lösung; `AppShell` als Component ist dann nur für nicht-layout-basierte Seiten sinnvoll.

**Blocker 2: Crop-Primitives-Move + Import-Update in MediaUpload.tsx**
→ Task 1 (53B) action ergänzen: „When primitives are moved to `components/media/crop`, update all existing import references in `frontend/src/components/admin/MediaUpload.tsx` to the new path in the same commit."

### Verbleibende Empfehlungen (kein Blocker)

- Task 0 `<action>`: AppShell-Scope begrenzen: „Build only the navigation slots and the Mein Bereich / Mein Profil entry; defer full public-area and settings structure unless it's a trivial placeholder."
- Task 0 verify: Mindest-Test-Spezifikation für `AppShell.test.tsx` (Render, capability-gated Admin-Eintrag, non-admin visible Mein Profil).
- Task 4 (53B): Phase-41-Artifacts (`body_json`/`body_html`/`body_text`) als `@context`-Referenz aufnehmen.
- Task 4 (53B): „Safe links" konkretisieren: erlaubte Protokolle (`https://`, kein `javascript:`, kein `data:`), Backend-Validation in `tiptap_service.go`.

---

*Review Round 3 durchgeführt am: 2026-05-27*
*Reviewer: Claude (im Auftrag des GSD cross-AI review workflows)*
*Basis: vollständig überarbeitete 53-01-PLAN.md (Round 3) und 53-02-PLAN.md (Round 3)*
