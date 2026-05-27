---
phase: 53
reviewer: claude
reviewed_at: 2026-05-27
review_rounds: 2
plans_reviewed:
  - 53-01-PLAN.md (Round 1 + Round 2)
  - 53-02-PLAN.md (Round 1 + Round 2)
---

# Cross-AI Plan Review — Phase 53: Member Identity Hub

---

## Round 2 — Was der Plan-Update gelöst hat

Alle 10 HIGH-Concerns aus Round 1 wurden adressiert. Zur Dokumentation:

| # | Round-1-Concern | Gelöst durch |
|---|----------------|--------------|
| 1 | Dateigröße / kein Komponentensplit | `components/`-Verzeichnis + 450-Zeilen-Grenze in Discovery + Task 2 |
| 2 | Navigation nicht adressiert | `files_modified` + Discovery-Evidenz + Task 1 action + manual verify |
| 3 | Redirect vs. Re-Export offen | `must_haves.truths` fixiert Re-Export als Execution-Default |
| 4 | `member_story` verschwunden | Task 3: `ProfileStoryCard` mit Plain-Text-Pfad explizit |
| 5 | CSS-Modul-Ownership unklar | Discovery + `files_modified` + Acceptance Criteria |
| 6 | Server/Client-Boundary nicht adressiert | Discovery + Acceptance Criteria + Task 1 action |
| 7 | Keine Tests für `/me/profile` | Task 1 verify + Acceptance Criteria |
| 8 | OpenAPI ohne Mindest-Content | Task 5 action: "Minimum contract content: operation IDs, request/response schemas, 200/400/401" |
| 9 | profileLabels.ts ohne kanonische Heimat | `files_modified` + Task 4 action |
| 10 | `member_story`-Bestandsdaten-Falle (53B) | Discovery + Task 4: "treat as production data", explicit fallback-renderer decision |
| 11 | Client-Side-Crop sperrt Varianten-Architektur | Task 1: "Decide explicitly whether original source must be retained" |
| 12 | Touch-Events fehlen | Discovery + Task 1 action + Acceptance Criteria |
| 13 | `RichTextRenderer` XSS-Pfad ungepüft | Task 4: "Inspect RichTextRenderer.tsx before using it" |
| 14 | Wave-2-Konflikte | `<execution_order>` + Acceptance Criteria |
| 15 | XSS-Smoke-Test fehlt | Task 4 verify: `<script>alert(1)</script>` + iframe + inline events |
| 16 | Avatar-Varianten-Defer-Kriterium zu weich | Task 2: "Defer if derivative rendering would require a new custom backend path" |
| 17 | Migration-Reversibilität unklar | Task 3a: "safe down path, nullable/backfilled fields, no destructive conversion" |
| 18 | Task 3 + 5 zu breit | Task 3a/3b + Task 5a/5b getrennt |
| 19 | Task 1+2-Coupling fehlte | Task 2: "using the crop/upload contract decided in Task 1" |

**Bewertung der Überarbeitung:** Gründlich. Der überarbeitete Plan ist erheblich solider.

---

## Round 2 — Verbleibende und neue Concerns

---

### Plan 53-01 (53A) — Round 2

#### Was noch offen ist

- **[MEDIUM] Test-Datei muss explizit erstellt werden, nicht nur ausgeführt.**
  Task 1 verify führt `npm run test -- --run "src/app/me/profile/page.test.tsx"` aus — aber die Datei existiert noch nicht. Vitest läuft bei einer nicht existierenden Testdatei entweder mit 0 Tests durch (und gilt als „bestanden") oder bricht ab, je nach Konfiguration. Das Task 1 `<action>`-Block sagt nicht explizit: „Schreibe neue Tests für `/me/profile/page.tsx`." Ein Executor könnte eine leere Testdatei anlegen, 0 Tests bekommen und das als erfüllt werten. Die Acceptance Criteria fordern „direct route tests for render/load/error behavior and no admin naming leaks" — aber kein Task-Schritt beschreibt den Mindestinhalt dieser Tests.

- **[MEDIUM] `'use client'` hat keinen automatisierten Verify-Schritt.**
  Acceptance Criteria und Discovery fordern `'use client'` explizit — aber kein Verify-Block überprüft das. Ein Executor der versehentlich einen Server Component anlegt bekommt keinen Fehler bis zur Laufzeit, weil TypeScript und ESLint das nicht flaggen. Empfehlung: einen `grep`-Schritt hinzufügen: `grep -n "'use client'" frontend/src/app/me/profile/page.tsx`.

- **[MEDIUM] Bestehende `admin/profile/page.test.tsx`-Tests wurden nicht auf Admin-spezifische Assertions geprüft.**
  Die aktuellen Tests testen `AdminProfilePage`. Nach 53A ist `admin/profile/page.tsx` ein Re-Export-Wrapper um `MyProfilePage`. Tests die Admin-spezifischen Text, Heading-Level, Routen oder Component-Namen prüfen (`AdminProfilePage`, `„Admin-Einstellungen"`, Links zu `/admin/...`) werden nach dem Recompose entweder falsch-positiv bestehen oder falsch-negativ brechen. Kein Task-Schritt auditiert die bestehenden Tests vor dem Umbau.

- **[MEDIUM] Navigation-Suche ist offen formuliert.**
  Task 1 sagt „run a targeted link/navigation search" — aber nicht WAS gesucht wird. Das betrifft vor allem nicht-admin-User: Ein normaler Member öffnet die App und sieht keinen `/admin/*`-Link. Gibt es ein globales Header/User-Menü? Wo ist es? Die bekannten Stellen (`admin/page.tsx`, `my-groups`, `FansubAppMembersSection`) sind Admin-Kontext. Für einen normalen Member ohne Admin-Rechte gibt es möglicherweise gar keinen Einstiegspunkt zu `/me/profile` — das wäre ein Acceptance-Criterion-Bruch. Das Acceptance Criterion „Existing own-profile navigation entry points are updated" deckt diesen Fall nicht ab, wenn der nicht-admin-Einstiegspunkt nie existiert hat.

- **[LOW] `ProfileStoryCard` — welcher Editor?**
  Task 3 sagt „keep `member_story` visible/editable in a separate `ProfileStoryCard` using the current plain-text persistence behavior." Die aktuelle Seite verwendet `RichTextEditor` mit einer Konvertierung auf Plain Text vor dem Speichern. Soll `ProfileStoryCard` den `RichTextEditor` weiterhin nutzen (mit JSON-Konvertierung, vorhandenem UX) oder einen einfachen `<textarea>` (einfacher, aber anderes UX)? Der Plan ist ambivalent. Wenn ein Executor `<textarea>` wählt, gehen Formatierungseingaben verloren die der User vielleicht schon gemacht hatte.

- **[LOW] OpenAPI-Korrektheit hat keinen Schema-Validator im CI.**
  Task 5 verify: `git diff --check` prüft nur Whitespace-Konflikte — keine YAML-Syntax, kein Schema-Validator. Ein Executor kann syntaktisch ungültiges OpenAPI schreiben und den Verify bestehen. Wäre ein `npx @apidevtools/swagger-cli validate shared/contracts/openapi.yaml` sinnvoll.

---

#### Gesamt-Risiko 53A (Round 2): **LOW–MEDIUM**

Der Plan ist strukturell bereit für Execution. Das einzige substanzielle offene Risiko ist der fehlende Nicht-Admin-Navigationspfad zu `/me/profile`. Alle anderen Punkte sind Qualitäts-Checks, keine Blocker.

---

### Plan 53-02 (53B) — Round 2

#### Was noch offen ist

- **[HIGH] Circular-Crop vs. Rectangular-Crop-Primitives — geometrische Inkompatibilität.**
  Die bestehenden `mediaUploadCropMath.ts`-Funktionen (`computeCropMetrics`, `computeCropDrawRect`, `clampCropOffset`) wurden für Gruppen-Logo-Uploads gebaut — wahrscheinlich rechteckig mit Seitenverhältniskonstraint. Avatar-Crop muss quadratisch (1:1) und im Preview kreisförmig gerendert werden. Das ist geometrisch ein Sonderfall: die Crop-Region muss erzwungen quadratisch sein, und der Canvas-Export muss das Ergebnis ggf. auf einen Kreis masken. Der Plan sagt „reuse existing crop primitives" — aber wenn die Primitives keine 1:1-Constraint und keine Circular-Mask-Ausgabe unterstützen, ist der Reuse nicht trivial. Es könnte Erweiterungsarbeit sein, keine einfache Wiederverwendung.

- **[HIGH] `AvatarCropDialog` koppelt `me/profile` an `admin/` — kein Plan für Auflösung.**
  Die Crop-Primitives liegen in `frontend/src/components/admin/mediaUploadCropMath.ts` und `mediaUploadA11y.ts`. Der `AvatarCropDialog` wird in `frontend/src/app/me/profile/` oder `components/` leben. Das erzeugt eine direkte Abhängigkeit vom Profil-Feature-Verzeichnis auf Admin-Komponenten. Das verstößt gegen das Prinzip, dass `/me/profile` nicht admin-abhängig sein soll. Entweder müssen die Primitives in ein gemeinsames Verzeichnis (`frontend/src/components/shared/` o.ä.) verschoben werden, oder die Kopplung muss explizit als akzeptierter Kompromiss dokumentiert werden. Der Plan tut beides nicht.

- **[MEDIUM] Task 2 neue Validierungstests werden nicht explizit gefordert.**
  Task 2 action sagt „add focused tests for profile avatar oversize, SVG rejection, invalid image data, and allowed MIME types." Der Verify-Block ist `go test ./internal/handlers ./internal/repository` — er prüft ob Tests BESTEHEN, nicht ob die geforderten Tests EXISTIEREN. Ein Executor, der die neuen Tests nicht schreibt, besteht den Verify trotzdem, wenn die vorhandenen Tests grün sind.

- **[MEDIUM] Avatar-Entfernen-Endpunkt fehlt vollständig.**
  Ein User der sein Avatar löschen möchte hat keinen API-Pfad. Weder `app_profile.go` noch die Plan-Tasks adressieren `DELETE /api/v1/me/profile/avatar`. Das könnte bewusst deferred sein — aber der Plan sagt das nirgends. Wenn ein Executor `AvatarCard` mit einem „Bild entfernen"-Button baut (was aus UX-Sicht naheliegend ist), wird der Button ins Leere zeigen.

- **[MEDIUM] Task 6 — wer entscheidet „in scope"?**
  Task 6 sagt: „Default to keeping Phase 53 on aggregate... If detailed contributions are explicitly pulled into scope, add a paginated endpoint." Bei `autonomous: true` entscheidet der Executor selbst. „Explicitly in scope" ist kein klares Signal für einen autonomen Executor. Er könnte die vollständige Pagination implementieren, weil er meint es ist „besser." Die Acceptance Criteria sagen „Contributions remain aggregate-only unless a paginated, contract-backed detail endpoint is deliberately added" — aber das stoppt keinen autonomen Executor aktiv. Empfehlung: Task 6 als „DEFER — aggregate-only in Phase 53, contributions detail is Phase 54+" umschreiben.

- **[MEDIUM] Migrations-Nummerierung nicht adressiert.**
  Tasks 3a und 4 könnten beide neue Migrations-Dateien anlegen. `database/migrations` steht in `files_modified` ohne konkreten Dateinamen. Wenn beide Tasks eine Migrationsdatei mit der gleichen Nummer anlegen (weil der Executor die aktuelle höchste Nummer nicht kennt), gibt es einen Konflikt. Kein Task hat einen Schritt: „Prüfe die aktuelle höchste Migrationsnummer in `database/migrations/`."

- **[LOW] TipTap-Deferral-Kriterium fehlt.**
  Wann ist Defer ok? Wenn die DB-Inspektion zeigt, dass `member_story` eine `text`-Spalte mit Plain-Text-Inhalt ist: Defer ist ok. Wenn `tiptap_service.go` bereits JSON-Validierung und HTML-Sanitizing kann, aber kein neues DB-Feld existiert: Defer ist ok (aber muss dokumentiert werden). Wenn alles ready wäre: kein Defer. Der Plan gibt dem Executor keine Entscheidungshilfe, was „bereit" bedeutet.

- **[LOW] Avatar-Größen-Check im Backend-Handler — Position undefiniert.**
  Task 2 fordert einen 5-MB-Größencheck. Wenn der Check nach `io.ReadAll(r.Body)` oder nach dem Schreiben des Files ins Filesystem läuft, hat der Server bereits den kompletten Upload verarbeitet. Der Check sollte über `http.MaxBytesReader` oder einen Header-Precondition-Check passieren, bevor der Body gelesen wird. Der Plan spezifiziert das nicht.

---

#### Gesamt-Risiko 53B (Round 2): **MEDIUM**

Deutlich besser als Round 1. Die beiden verbleibenden HIGH-Concerns (Circular-Crop-Geometrie und Admin-Kopplung) sind vor Execution lösbar: entweder durch einen expliziten Reuse-Check der Primitives auf 1:1-Constraint-Fähigkeit, oder durch eine Entscheidung über das Ziel-Verzeichnis der Primitives. Die MEDIUM-Concerns sind alle behebbar ohne Planumbau.

---

## Gesamtbewertung Round 2

| Plan | Round 1 | Round 2 | Verbesserung |
|------|---------|---------|--------------|
| 53-01 | HIGH | LOW–MEDIUM | ✅ Substanziell |
| 53-02 | HIGH | MEDIUM | ✅ Substanziell |

### Top-Priorität vor Execution

**53A:**
1. Nicht-Admin-Navigationspfad prüfen: Gibt es ein globales Header/User-Menü und hat es einen Einstiegspunkt für normale Member zu `/me/profile`?
2. Task 1: „Schreibe neue Tests für `/me/profile/page.tsx`" explizit in die `<action>` aufnehmen, Mindestinhalt benennen.
3. Task 1: `grep 'use client' frontend/src/app/me/profile/page.tsx` als automated verify.

**53B:**
1. Prüfe ob `mediaUploadCropMath.ts` 1:1-Constraint und Circular-Export unterstützt — wenn nicht, ist das Erweiterungsarbeit, keine reine Wiederverwendung. Das in Task 1 discovery aufnehmen.
2. Entscheide: Crop-Primitives in `components/shared/` verschieben oder Admin-Kopplung dokumentieren.
3. Task 6: „DEFER" als festes Ergebnis schreiben — Pagination ist Phase 54+.
4. Task 2: Schreibe-neue-Tests als expliziten Schritt in die `<action>`, nicht nur im Verify.
5. Avatar-Remove-Endpunkt: explizit als deferred dokumentieren, damit kein Executor einen funktionslosen Button einbaut.

---

*Review Round 2 durchgeführt am: 2026-05-27*
*Reviewer: Claude (im Auftrag des GSD cross-AI review workflows)*
*Basis: vollständig überarbeitete 53-01-PLAN.md und 53-02-PLAN.md*
