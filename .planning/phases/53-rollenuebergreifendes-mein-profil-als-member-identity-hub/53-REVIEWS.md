---
phase: 53
reviewer: claude
reviewed_at: 2026-05-27
plans_reviewed:
  - 53-01-PLAN.md
  - 53-02-PLAN.md
---

# Cross-AI Plan Review — Phase 53: Member Identity Hub

---

## Review: Plan 53-01 (Phase 53A)

### Summary

Plan 53A hat die richtige Scope-Grenze: Avatar, RichText und Visibility bleiben in 53B. Die Entscheidungen sind konzeptionell korrekt. Auf Implementierungsebene hat der Plan jedoch fünf konkrete Lücken, die beim ersten Commit aufschlagen: fehlende Komponentenaufteilung, ungeklärte Navigation, offene Behandlung von `member_story`, unklare CSS-Ownership und fehlende Next.js-Client/Server-Grenzregelung.

---

### Strengths

- **Wave-Isolation korrekt:** 53A berührt keine Avatar-, RichText- oder Visibility-Contracts; das verhindert, dass 53B-Risiken den stabilen 53A-Scope kontaminieren.
- **No-fake-data-Invariante konsequent durchgezogen:** Jeder Task enthält die Anforderung, bei fehlendem DTO-Feld einen konservativen Empty State zu zeigen statt Platzhalter zu erfinden.
- **GDS-Reuse mit echter Referenz:** Task 2 nennt konkrete Komponenten und verweist auf `my-groups/page.tsx` als Analogie. Das gibt dem Executor eine echte Referenz.
- **Dirty-State-Schutz als Akzeptanzkriterium:** Phase-52-Regressions-Risiko ist explizit benannt.
- **AccountSecurityCard-Isolation als Sicherheitsregel:** Das Verbot, Accountdaten in public-profile-fähige Komponenten zu übergeben, steht in `must_haves.truths`.

---

### Concerns

- **[HIGH] Dateigröße wird sofort die 450-Zeilen-Grenze sprengen.**
  `me/profile/page.tsx` muss Hero, ProfileBasicsForm, MembershipList, AccountSecurityCard, ContributionSummaryCard, RoleChips, LoadingState und ErrorState unterbringen. Das sind realistisch 600–800 Zeilen. Der Plan enthält kein Komponentensplit-Schema und keine Dateiliste für Teilkomponenten. Ein Executor schreibt alles in eine Datei; der darauffolgende Review muss aufräumen.

- **[HIGH] Navigation wird im Plan komplett ignoriert.**
  Die Acceptance Criteria fordern „Mein Profil muss für alle eingeloggten User erreichbar sein" — aber kein Task benennt, welche Datei die globale Navigation enthält, wo `Mein Profil` eingehängt werden soll, und ob der bestehende Admin-Menüpunkt dabei kaputt geht. Ohne diese Angabe ist das Acceptance Criterion nach Execution nicht prüfbar.

- **[HIGH] Redirect vs. Re-Export: keine Entscheidung getroffen.**
  Task 1 lässt offen, ob `/admin/profile` einen `redirect('/me/profile')` macht oder die Seite intern re-exportiert. Das hat direkte Auswirkungen auf die bestehenden Tests (`page.test.tsx`). Ein Redirect macht HTTP 302 — Tests, die gegen `AdminProfilePage` rendern, schlagen dann stumm fehl. Ein Executor der falsch wählt bricht Tests oder erzeugt eine doppelte Implementierung.

- **[HIGH] `member_story` (lange Bio) ist im Plan unsichtbar.**
  Task 3 baut `ProfileBasicsForm` mit `bio` (Kurzbeschreibung). Die lange Fansub-Geschichte (`member_story`) ist aktuell ebenfalls auf der Seite. 53A hat keinen Task dafür — sie bleibt entweder weg (Regression), oder der Executor erfindet eine Lösung außerhalb des Plans. Beides ist unkontrolliert.

- **[HIGH] CSS-Modul-Ownership nach Route-Split unklar.**
  `admin/profile/page.module.css` steht in `files_modified`. Die neue Route ist aber `me/profile/page.tsx`. Importiert die neue Seite CSS aus `../admin/`? Bekommt sie ein eigenes Modul in `me/profile/`? Wird das alte Modul gelöscht oder behalten? Ohne Entscheidung entstehen kaputte Import-Pfade oder tote CSS-Dateien.

- **[HIGH] Server Component vs. Client Component — nicht adressiert.**
  Next.js App Router unterscheidet Server und Client Components strikt. Die bestehende Profilseite braucht `'use client'` wegen Dirty-State, Auth-Session und interaktiven Formularen. Beim Recompose in neue Komponentendateien muss diese Grenze explizit erhalten bleiben. Kein Task prüft oder dokumentiert das. Eine falsch klassifizierte Server Component bricht zur Laufzeit.

- **[MEDIUM] Fehlende Testabdeckung für die neue Route `/me/profile`.**
  Die `verify`-Schritte laufen alle gegen `src/app/admin/profile/page.test.tsx`. Es gibt keinen Task, der Tests für `me/profile/page.tsx` selbst fordert. Wenn die Transition-Wrapper-Lösung gewählt wird, testet das bestehende Testfile die neue Route evtl. überhaupt nicht.

- **[MEDIUM] Task 5 (OpenAPI) hat keinen Mindest-Content-Standard.**
  Das Ziel ist „dokumentiere die existierenden Endpunkte" — es wird nicht spezifiziert, ob `requestBody` mit Schema, `responses` für 200/400/401 und alle Felder aus `MemberProfileData` als dokumentierte Properties Pflicht sind. Ein Executor könnte einen Stub-Eintrag mit nur `summary` und `operationId` anlegen und Task 5 als erfüllt markieren.

- **[MEDIUM] Rollenlabel-Formatter hat keine kanonische Fundstelle.**
  Task 4 erwähnt, `FANSUB_GROUP_ROLE_OPTIONS` zu nutzen und „ggf. einen shared formatter" hinzuzufügen. Es ist unklar wo dieser Formatter leben soll (`types/`? `lib/`? `utils/`?). Ohne Fundstelle entsteht Duplikation über mehrere Dateien.

- **[MEDIUM] Kein Auth-Guard-Check für die neue Route.**
  Der Plan geht davon aus, dass `/me/profile` automatisch die bestehende Auth-Middleware erbt. Bei einer neu angelegten Next.js-Route ist das keine Garantie — insbesondere wenn Middleware-Matching auf `/admin/**` konfiguriert ist und `/me/**` nicht abdeckt. Kein Task prüft das explizit.

---

### Suggestions

- **Füge ein Komponentensplit-Schema in den Plan ein.** Mindestens: `MyProfilePage` (max. 100 Zeilen, Komposition), `MemberProfileHero`, `ProfileBasicsForm`, `MembershipSection`, `ContributionSummarySection`, `AccountSecurityCard` als separate Dateien unter `me/profile/`. Dateigrenzen im Plan benennen, nicht dem Executor überlassen.
- **Adressiere Navigation explizit in Task 1.** Benenne die Datei(en) für das User-Menü und schreibe das Einhängen von `Mein Profil` als eigenen Schritt.
- **Entscheide Re-Export vs. Redirect im Plan.** Empfehlung: Re-Export analog zu `manage/groups/page.tsx` — kompatibel mit bestehendem Testfile, keine HTTP-Redirect-Fehler.
- **Füge `member_story`-Behandlung in Task 3 ein.** In 53A: behalte den bestehenden Plain-Text-Editor als optisches Element, aber dokumentiere explizit, dass echte Persistenz in 53B kommt. Kein Verschwinden, kein Erfinden.
- **Kläre CSS-Ownership in Task 2.** Entscheid: neues `me/profile/page.module.css` für layout-spezifisches CSS, altes Admin-Modul wird auf Admin-spezifisches reduziert oder gelöscht.
- **Ergänze `'use client'`-Prüfung in Task 1 verify:** Stelle sicher, dass `me/profile/page.tsx` dieselbe Client-Boundary hat wie die aktuelle `admin/profile/page.tsx`.

---

### Risk Assessment

**HIGH** — Konzeptionell solide, aber auf Implementierungsebene fehlen fünf strukturelle Entscheidungen (Dateisplit, Navigation, CSS-Ownership, `member_story`-Behandlung, Client-Boundary), die alle beim ersten Commit aufschlagen. Keines dieser Probleme ist schwer zu lösen — aber keines löst sich von selbst.

---

---

## Review: Plan 53-02 (Phase 53B)

### Summary

Plan 53B hat die richtige Schutzphilosophie — jede gefährliche Feature-Entscheidung hat einen expliziten Fallback. Das ist die Stärke. Auf Implementierungsebene hat der Plan jedoch fünf ernste Probleme: eine verdeckte Datenmigrations-Falle bei `member_story`, eine architektonische Langzeit-Falle beim Client-Side-Crop, fehlende Touch-Events im AvatarCropDialog, interne Wave-2-Konflikte und einen ungepatchten XSS-Vektor im bestehenden `RichTextRenderer`.

---

### Strengths

- **Explizite Fallback-/Defer-Paths für jede risikobehaftete Entscheidung:** Kein Task setzt voraus, dass eine neue Feature-Entscheidung immer getroffen wird. Jeder Task benennt explizit den Conservative-Path.
- **Crop-Primitive-Reuse klar gefordert:** Task 1 verbietet das Einführen von `react-easy-crop` ohne dokumentierten Blocker.
- **Avatar-Varianten dürfen nicht in parallele Tabellen:** Task 2 expliziert das Verbot paralleler Media-Logik.
- **TipTap-XSS-Risiko benannt:** Security-Invarianten nennen `dangerouslySetInnerHTML` explizit als verboten.
- **Dirty-State-Regressions-Schutz aus Phase 52 explizit als must_have.truth.**
- **Contribution-Task 6 als „nicht erfunden"-Wächter:** Default ist Aggregate-Only, paginierter Endpunkt nur als opt-in.

---

### Concerns

- **[HIGH] `member_story` ist ein Datenmigrations-Problem, kein Schemaproblem.**
  Aktuell liegt `member_story` als **Plain Text** in der DB — weil die bestehende Profilseite TipTap-JSON vor dem Speichern zu Plain Text konvertiert. Wenn 53B TipTap verdrahtet und den Konvertierungsschritt entfernt, werden alle vorhandenen Plain-Text-Einträge im TipTap-JSON-Renderer als kaputt angezeigt (der Parser erwartet JSON-Struktur, bekommt Freitext). Der Plan sagt „add a new migration if required" — aber das löst nicht das Bestandsdaten-Problem. Nötig ist eine Datenmigration die existierende Texte in valides TipTap-JSON konvertiert, oder ein Fallback-Renderer für Legacy-Plain-Text. Keines von beidem steht im Plan.

- **[HIGH] Client-Side-Crop ist eine architektonische Langzeit-Falle.**
  Task 1 empfiehlt als „preferred" den Client-Side-Crop-Weg: das Frontend schneidet das Bild vor und sendet ein fertiges Raster-JPEG. Das Backend bekommt das Original nie. Wenn in einer späteren Phase `avatar_256`, `avatar_96` und `avatar_48` als Varianten generiert werden sollen (Task 2, currently deferred), hat das Backend nichts, woraus es die Varianten regenerieren kann — das Original ist weg. Die Entscheidung für Client-Side-Crop schließt serverseitige Variantengenerierung dauerhaft aus, solange kein separater Original-Upload existiert. Das muss explizit im Plan stehen.

- **[HIGH] Touch-Events im AvatarCropDialog fehlen komplett.**
  Die bestehenden `mediaUploadCropMath.ts`-Primitives wurden für Mouse-Events gebaut. Der AvatarCropDialog soll „drag-to-position" unterstützen — auf Mobile braucht das `touchstart`, `touchmove`, `touchend`. Das ist keine Trivialität, sondern Portierungsarbeit. Der Plan behandelt den Mobile-Crop als erfüllt durch Reuse der bestehenden Primitives. Das stimmt nicht.

- **[HIGH] `RichTextRenderer.tsx` nutzt möglicherweise bereits `dangerouslySetInnerHTML` — ungepüft.**
  Task 4 verbietet unsicheres HTML-Rendering. Aber der Plan enthält keinen Schritt, der prüft ob der bestehende `RichTextRenderer.tsx` aktuell `dangerouslySetInnerHTML` verwendet. Wenn ja, und wenn 53B diesen Renderer für die Profil-Story einsetzt, ist Security-Invariante D-28 bereits beim Verdrahten gebrochen — ohne dass ein Executor das bemerkt.

- **[HIGH] Wave 2 hat 6 Tasks, die in dieselben Dateien greifen.**
  Tasks 1 und 2 greifen beide auf `backend/internal/handlers/app_profile.go`. Tasks 3 und 4 greifen beide auf `backend/internal/models/member_profile.go` und `shared/contracts/openapi.yaml`. Tasks 4 und Task 3 könnten beide DB-Migrations-Dateien anlegen. Bei paralleler Wave-Ausführung entstehen Merge-Konflikte oder inkonsistente Migrationsnummern. Der Plan benennt keine serielle Abhängigkeit innerhalb Wave 2.

- **[MEDIUM] Task 3 enthält zwei orthogonale Contract-Entscheidungen in einem Task.**
  Visibility-Contract und Month/Year-Migration sind vollständig unabhängig voneinander (verschiedene DB-Felder, verschiedene Backend-Models, verschiedene Frontend-Controls), aber in einem Task gebündelt. Das erhöht die Wahrscheinlichkeit, dass eine Entscheidung implizit mitgezogen wird, ohne eigene Analyse.

- **[MEDIUM] Task 5 (Dirty State + Mobile + A11y) ist zu breit.**
  Dirty-State-Logik ist automatisch testbar und logikintensiv. Mobile-Layout und Keyboard-A11y sind manuell und heuristisch. Beides in einem Task bedeutet, dass Dirty-State-Tests kürzer kommen und A11y-Checks — die für AvatarCropDialog focus trap, Radio-Keyboard-Navigation und ESC-Schließen nicht trivial sind — am Ende des Tasks stehen und unter Zeitdruck wegfallen.

- **[MEDIUM] Kein expliziter Rollback-Plan für Migrationen.**
  Task 3 erwähnt „reversible migration" — aber es gibt kein Kriterium für was „reversible" bedeutet (down-migration vorhanden? Nullable Spalten? Soft default?). Für Postgres-Produktionsmigrationen ist das relevant.

- **[LOW] Avatar-Varianten-Defer-Kriterium ist zu weich.**
  „Decide now or defer with documented reason" — aber kein Kriterium für wann man defert. Ein Executor der gerne implementiert wird immer „jetzt umsetzen" wählen, auch wenn das den Scope sprengt.

---

### Suggestions

- **Task 4: Füge einen expliziten Bestandsdaten-Check als ersten Schritt hinzu.**
  Vor jeder Backend-Änderung: lies den aktuellen `member_story`-Spaltentyp und prüfe ob vorhandene Werte Plain Text oder TipTap-JSON sind. Entscheide dann zwischen: (a) neue Spalten `member_story_json` + `member_story_html` mit Migration, wobei alter Plain-Text-Wert als Fallback erhalten bleibt, oder (b) Defer von TipTap-Persistenz mit ehrlichem Plain-Text-Editor.

- **Task 1: Mach die Client-Side-Crop-Konsequenz explizit.**
  Wenn Client-Side-Crop gewählt wird: dokumentiere im Plan und in einem Code-Kommentar in `app_profile.go`, dass das Backend das Original nicht besitzt und serverseitige Variantengenerierung eine spätere Architekturänderung erfordert. Diese Entscheidung darf nicht stillschweigend getroffen werden.

- **Task 1 verify: Touch-Events testen.**
  Ergänze einen manuellen Verify-Schritt: „AvatarCropDialog auf einem Touch-Gerät oder Chrome DevTools Mobile emulation: drag-to-position und Zoom funktionieren mit Touch." Wenn die Primitives Touch nicht unterstützen, ist das ein expliziter Blocker.

- **Task 4 verify: XSS-Smoke-Test hinzufügen.**
  `<script>alert(1)</script>` als `member_story` speichern → gerenderter Output darf kein ausführbares `<script>`-Tag enthalten. Vor diesem Test: überprüfe ob `RichTextRenderer.tsx` `dangerouslySetInnerHTML` verwendet und wenn ja, welche Sanitizing-Middleware davor liegt.

- **Serialisiere Wave-2-Tasks explizit:**
  Tasks 1→2 (Avatar) müssen seriell laufen. Tasks 3a und 3b (Visibility + Month/Year, getrennt) können parallel. Task 4 (TipTap) erst nach Task 3 (wegen möglicher gemeinsamer Migration). Task 5 erst nach Task 4. Task 6 ist unabhängig.

- **Trenne Task 3 in T3a und T3b:** Visibility-Contract und Activity-Period-Contract als unabhängige Tasks mit je eigenem `verify`-Block.

- **Trenne Task 5 in T5a und T5b:** T5a = Dirty-State-Logik + Tests (automatisch); T5b = Mobile-Layout + A11y QA (manuell). Das gibt A11y die nötige Tiefe.

---

### Risk Assessment

**HIGH** — Die Bestandsdaten-Falle bei `member_story`, die Langzeit-Falle des Client-Side-Crops und die fehlenden Touch-Events im Crop-Dialog sind drei Probleme, die bei falscher Umsetzung entweder Produktionsdaten beschädigen, die spätere Varianten-Architektur sperren oder Mobile komplett non-functional lassen. Alle drei sind lösbar — aber keines löst sich durch gute Absichten allein. Der Plan muss diese Punkte vor Execution adressieren.

---

---

## Consensus Summary

### Agreed Strengths

- **Wave-Isolation (53A vor 53B) ist die richtige Architektur.** Die Entscheidung, Avatar/RichText/Visibility erst in 53B anzufassen, ist konsequent.
- **No-fake-data-Invariante durchgehend konsistent.** In beiden Plänen als must_have.truth und Acceptance Criterion formuliert.
- **Dirty-State-Regressions-Schutz explizit benannt.** Phase-52-Schutz ist in beiden Plänen ein benanntes Risiko.
- **GDS-Reuse hat echte Referenzpunkte.** Komponenten und Muster werden namentlich benannt.

### Agreed Concerns (priorisiert)

| # | Concern | Plan | Schwere |
|---|---------|------|---------|
| 1 | Dateigröße / kein Komponentensplit-Schema | 53A | HIGH |
| 2 | Navigation nicht adressiert | 53A | HIGH |
| 3 | `member_story` Bestandsdaten-Migration | 53B | HIGH |
| 4 | Client-Side-Crop sperrt Varianten-Architektur | 53B | HIGH |
| 5 | Touch-Events AvatarCropDialog fehlen | 53B | HIGH |
| 6 | `RichTextRenderer` XSS-Pfad ungepüft | 53B | HIGH |
| 7 | Wave-2-Konflikte bei paralleler Execution | 53B | HIGH |
| 8 | Redirect vs. Re-Export nicht entschieden | 53A | HIGH |
| 9 | Fehlende Tests für `/me/profile` | 53A | MEDIUM |
| 10 | Task 3+5 in 53B zu breit | 53B | MEDIUM |

### Divergent Views

*Kein zweiter externer Reviewer verfügbar. Offene Fragen für ein zweites Modell:*
- Ist die Entscheidung, OpenAPI bereits in 53A zu fordern, die richtige Priorisierung?
- Wäre eine Server-Side-Crop-only-Strategie (kein Client-Crop) die sicherere Langzeitwahl trotz höherer Backend-Komplexität?

---

## Empfehlung vor Execution

**53-01 vor Execution:**
1. Füge ein Komponentensplit-Schema mit Dateinamen und Zeilengrenzen ein.
2. Benenne die Navigation-Datei(en) und schreibe das Einhängen als eigenen Task-Schritt.
3. Entscheide Re-Export vs. Redirect explizit (Empfehlung: Re-Export).
4. Adressiere `member_story` in Task 3 — mindestens als „bleibt Plain Text, Persistenz in 53B".
5. Kläre CSS-Modul-Ownership nach Route-Split.
6. Ergänze `'use client'`-Boundary-Check in Task 1 verify.

**53-02 vor Execution:**
1. Task 4: Bestandsdaten-Check als ersten Schritt — Plain Text vs. TipTap-JSON im DB prüfen.
2. Task 1: Client-Side-Crop-Konsequenz für Varianten dokumentieren.
3. Task 1 verify: Touch-Events explizit testen.
4. Task 4 verify: XSS-Smoke-Test + `RichTextRenderer` auf `dangerouslySetInnerHTML` prüfen.
5. Wave-2-Serialisierung explizit machen (1→2 seriell, Task 4 nach Task 3).
6. Task 3 trennen in T3a (Visibility) + T3b (Activity Period).
7. Task 5 trennen in T5a (Dirty State/Tests) + T5b (Mobile/A11y QA).

---

*Review durchgeführt am: 2026-05-27*
*Reviewer: Claude (im Auftrag des GSD cross-AI review workflows)*
*Pläne: 53-01-PLAN.md, 53-02-PLAN.md*
