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

Plan 53A ist strukturell solide: es trennt Route-Ownership, GDS-Recompose, Datenmapping, Rollenlabel und Contract-Dokumentation in fünf voneinander abhängige Tasks mit klaren Done-Kriterien. Die Wahl, in 53A keine Avatar-/RichText-/Visibility-Contracts anzufassen, ist richtig — sie schützt den Scope. Ein kritischer Schwachpunkt ist die fehlende Klarheit über den Übergang `/admin/profile → /me/profile`: ob Redirect oder Re-Export ist eine Entscheidung mit Testauswirkungen, die im Plan offengelassen wird. Das OpenAPI-Dokument-Ziel in Task 5 ist für sich allein zu schwach formuliert — es fehlt ein expliziter Definition-of-Done für den Mindestinhalt des Contracts.

---

### Strengths

- **Wave-Isolation korrekt:** 53A berührt keine Avatar-, RichText- oder Visibility-Contracts; das verhindert, dass 53B-Risiken den stabilen 53A-Scope kontaminieren.
- **No-fake-data-Invariante konsequent durchgezogen:** Jeder Task enthält die Anforderung, bei fehlendem DTO-Feld einen konservativen Empty State zu zeigen statt Platzhalter zu erfinden.
- **GDS-Reuse explizit benannt:** Task 2 nennt konkrete Komponenten (`Card`, `Badge`, `EmptyState` etc.) und verweist auf ein bestehendes GDS-Muster (`my-groups/page.tsx`). Das gibt dem Executor eine echte Referenz statt nur "verwende existierende Komponenten".
- **Dirty-State-Schutz explizit als Akzeptanzkriterium:** Phase-52-Regressions-Risiko wird in den Acceptance Criteria benannt.
- **AccountSecurityCard-Isolation als explizite Sicherheitsregel:** Das Verbot, Account-Daten in public-profile-fähige Komponenten zu übergeben, steht sowohl in Task 4 als auch in den `must_haves.truths`.

---

### Concerns

- **[HIGH] Redirect vs. Re-Export: keine Entscheidung getroffen.** Task 1 lässt offen, ob `/admin/profile` einen `redirect('/me/profile')` macht oder die Seite intern re-exportiert. Das hat direkte Auswirkungen auf die bestehenden Tests (`page.test.tsx`), die vermutlich gegen `AdminProfilePage` schreiben. Ein Executor der diese Entscheidung falsch trifft kann entweder existierende Tests brechen (redirect → Tests rennen gegen 302) oder eine versteckte doppelte Implementierung erzeugen. Die Entscheidung muss im Plan stehen, nicht dem Executor überlassen werden.

- **[HIGH] Fehlende Testabdeckung für die neue Route `/me/profile`.** Die `verify`-Schritte laufen alle gegen `src/app/admin/profile/page.test.tsx`. Es gibt keinen Task und kein Akzeptanzkriterium, das Tests für `src/app/me/profile/page.tsx` selbst fordert. Wenn die Transition-Wrapper-Lösung gewählt wird, testet das bestehende Testfile die neue Implementierung evtl. gar nicht mehr.

- **[MEDIUM] Task 5 (OpenAPI) hat keinen Mindest-Content-Standard.** Das Ziel ist „dokumentiere die existierenden Endpunkte" — aber es wird nicht spezifiziert, ob das `request body schema`, `response schema`, `error codes` und `required fields` umfasst. Ein Executor könnte einen Stub-Eintrag mit nur `summary` und `operationId` anlegen und Task 5 als erfüllt markieren.

- **[MEDIUM] Rollenlabel-Mapping hat keine zentrale Fundstelle.** Task 4 erwähnt, `FANSUB_GROUP_ROLE_OPTIONS` zu nutzen und „ggf. eine kleine shared formatter" hinzuzufügen. Es ist unklar wo diese Formatter leben soll (`types/`? `lib/`? `utils/`?). Ohne Fundstelle riskiert der Executor entweder Duplikation oder eine schlechte Platzierung.

- **[MEDIUM] Keine Auth-Guard-Prüfung für `/me/profile`.** Der Plan geht davon aus, dass die neue Route automatisch die bestehende Auth-Middleware erbt. Es gibt keinen expliziten Task-Schritt, der prüft ob `/me/profile` tatsächlich hinter dem gleichen Auth-Guard liegt wie `/admin/profile` — insbesondere wenn die Route durch Next.js App Router neu angelegt wird, ohne einen bestehenden Middleware-Pfad zu erben.

- **[LOW] Capability-Check für Memberships und Credits im Plan nicht explizit.** Die Discovery erwähnt `can_view_memberships` und `can_view_historical_credits`, aber Task 4 formuliert das als „if capabilities are false or missing, render a conservative scoped state" — es fehlt ein explizites Prüfschritt, ob diese Capabilities tatsächlich im DTO vorhanden sind, bevor der Executor sie nutzen kann.

---

### Suggestions

- **Entscheide Redirect vs. Re-Export im Plan selbst.** Empfehlung: Re-Export mit `export { default } from '../me/profile/page'` (analog zu `manage/groups`), da er mit dem bestehenden Testfile kompatibel ist und keine HTTP-Redirect-Fehler in Tests erzeugt. Dokumentiere die Entscheidung explizit in Task 1.

- **Füge einen separaten Test-Task hinzu** (oder erweitere Task 1 `verify`) der Tests für `me/profile/page.tsx` fordert — mindestens: Render ohne Crash, Load-State, Error-State, keine admin-Naming-Leaks.

- **Schreibe Task 5 mit einem Mindest-Schema-Standard:** z.B. „Jeder Endpunkt braucht `requestBody` mit Schema, `responses` für 200 und 400/401, und alle Felder aus `MemberProfileData` als dokumentierte Properties."

- **Fixiere die Formatter-Platzierung:** Schlage `frontend/src/lib/roleLabels.ts` oder `frontend/src/lib/profileLabels.ts` als kanonische Heimat für deutsche Rollenlabel-Mappings vor, damit kein Executor sie lokal dupliziert.

- **Füge einen `verify`-Schritt für Auth hinzu:** `curl -v http://localhost:3002/me/profile` ohne Session → erwartet 302 zu Login, nicht 200.

---

### Risk Assessment

**MEDIUM** — Die Wave-Aufteilung und No-fake-data-Disziplin sind stark. Das ungelöste Redirect/Re-Export-Problem und die fehlenden Tests für die neue Route sind die zwei konkreten Risiken, die bei falscher Umsetzung Zeit kosten oder Regression erzeugen. Beide sind vor Execution lösbar.

---

---

## Review: Plan 53-02 (Phase 53B)

### Summary

Plan 53B hat die richtige Schutzphilosophie: jede potentiell gefährliche Feature-Entscheidung (Avatar-Crop-Contract, Visibility-Erweiterung, RichText-Persistenz, Month/Year-Migration) ist explizit als Entscheidungspunkt formuliert, nicht als vorausgesetzte Umsetzung. Das Risikoprofil des Plans ist jedoch strukturell hoch — sechs Tasks mit starken gegenseitigen Contract-Abhängigkeiten, und die meisten öffnen gleichzeitig Backend und Frontend. Task 4 (TipTap) ist besonders riskant: eine falsche Umsetzung ist nicht nur ein UX-Bug, sondern ein XSS-Risiko.

---

### Strengths

- **Explizite Fallback-/Defer-Paths für jede risikobehaftete Entscheidung:** Kein Task setzt voraus, dass eine neue Feature-Entscheidung immer getroffen wird. Jeder Task benennt explizit den Conservative-Path (z.B. „plain text bleibt ehrlich sichtbar wenn TipTap nicht fertig wird").
- **Crop-Primitive-Reuse klar gefordert:** Task 1 verbietet das Einführen von `react-easy-crop` ohne dokumentierten Blocker und verlangt Extraktion aus bestehenden Primitives — schützt vor einer der häufigsten Scope-Creep-Quellen.
- **Avatar-Varianten dürfen nicht in parallele Tabellen:** Task 2 expliziert das Verbot paralleler Media-Logik; das schützt die bestehende `media_files.variant`-Architektur.
- **TipTap-XSS-Risiko benannt:** Security-Invarianten im Discovery-Abschnitt nennen `dangerouslySetInnerHTML` explizit als verboten, und Task 4 wiederholt das Verbot.
- **Dirty-State-Regressions-Schutz aus Phase 52 explizit als must_have.truth:** Verhindert, dass ein Executor den Keycloak-Return-Refresh-Schutz beim Recompose versehentlich wegräumt.
- **Contribution-Task 6 als ehrlicher „nicht erfunden"-Wächter:** Der Default ist explizit Aggregate-Only, und der paginierte Endpunkt ist nur als opt-in scope erlaubt.

---

### Concerns

- **[HIGH] Task 4 (TipTap) enthält keine DB-Migrations-Spezifikation.** Rich Text braucht ein neues Datenbankfeld (TipTap JSON), wahrscheinlich eine weitere Spalte für sanitized HTML/Text, und eine Migration. Der Plan erwähnt „if schema changes are required, add a new migration" — aber es gibt keinen expliziten Schritt, der prüft ob `member_story` aktuell als `text` (plain) gespeichert wird und was genau migriert werden muss. Ein Executor könnte die Migration auslassen und dennoch meinen, Task 4 erfüllt zu haben.

- **[HIGH] Task 1 und Task 2 sind serialisiert, aber ihre Outputs haben keine explizite Abnahme-Schnittstelle.** Task 1 entscheidet den Crop-Contract; Task 2 setzt Avatar-Validierung um. Aber wenn Task 1 den client-side-crop-Weg wählt, muss der Backend-Handler in Task 2 andere Validierungen haben als bei server-side-crop. Dieser Coupling fehlt als expliziter Hinweis zwischen den Tasks.

- **[HIGH] Keine explizite Sicherheitsprüfung für den `RichTextRenderer`.** Task 4 verbietet `dangerouslySetInnerHTML` für unkontrollierte Quellen — aber der Plan spezifiziert nicht, ob `RichTextRenderer.tsx` derzeit bereits `dangerouslySetInnerHTML` verwendet und ob dieser Pfad für das Profil-Avatar-/Story-Rendering genutzt wird. Wenn der Executor das nicht liest, könnte er den Renderer ungeprüft weiterverwenden.

- **[MEDIUM] Task 3 (Visibility + Month/Year) enthält zwei orthogonale Entscheidungen in einem Task.** Visibility-Contract und Month/Year-Migration sind unabhängig voneinander, aber in einem Task gebündelt. Das erhöht das Risiko, dass ein Executor eine Entscheidung trifft und die andere implizit mitentscheidet oder ignoriert.

- **[MEDIUM] Task 5 (Dirty State + Mobile + A11y) ist zu breit.** Drei unterschiedliche Qualitätsdimensionen (Dirty-State-Logik, Mobile-Layout, Keyboard-A11y) in einem Task bedeutet, dass jede einzeln kürzer kommt als sie sollte. Besonders A11y (focus trap, ESC in Crop-Dialog, Radio-Keyboard-Navigation) ist non-trivial und verliert sich in der Breite.

- **[MEDIUM] Kein expliziter Rollback-Plan für die Migration.** Task 3 erwähnt „reversible migration" — aber es gibt kein Kriterium dafür, was „reversible" bedeutet (down-migration vorhanden? Nullable Spalten? Soft default?). Das ist für Postgres-Migrationen wichtig, besonders wenn `is_currently_active` und `active_until_year` betroffen sind.

- **[LOW] Avatar-Varianten-Defer-Bedingung ist zu weich.** Task 2 sagt „decide now or defer with documented reason" — aber es gibt kein Kriterium für wann man defert. Ein Executor der gerne implementiert wird immer „jetzt umsetzen" wählen, auch wenn Varianten-Generierung den Scope sprengt.

---

### Suggestions

- **Task 4: Füge einen expliziten Schema-Check-Schritt hinzu.** Bevor TipTap verdrahtet wird: lies `database/migrations/` und `member_profile.go` und prüfe den aktuellen Spaltentyp von `member_story`. Entscheide dann ob eine neue `member_story_json TEXT` + `member_story_html TEXT` Spalte nötig ist, und schreibe die Migration bevor der Backend-Code angepasst wird.

- **Trenne Task 3 in zwei Tasks:** „T3a: Visibility-Contract finalisieren" und „T3b: Activity-Period-Contract finalisieren". Beide können in Wave 2 parallel laufen, da sie unabhängige Backend-Felder betreffen.

- **Füge Task 4 einen expliziten Sicherheits-Smoke-Test hinzu:** `<script>alert(1)</script>` als member_story speichern → rendered output darf kein `<script>`-Tag enthalten. Dieser Test fehlt in den `verify`-Blöcken.

- **Spalte Task 5 auf:** „T5a: Dirty-State + Keycloak-Refresh-Schutz + Tests" (logik-fokussiert, automatisch testbar) und „T5b: Mobile-Layout + A11y QA" (manuell, heuristisch). Das gibt jedem Thema die nötige Aufmerksamkeit.

- **Konkretisiere Task 2 Avatar-Defer-Kriterium:** Varianten werden deferred, wenn das Derivat-Rendering mehr als ~50 Backend-Zeilen Neuroimplementierung erfordert, oder wenn kein bestehender `media_files.variant`-Erzeugungspfad für Avatare existiert. Dokumentiere den Defer als TODO in `app_profile.go` mit einem Verweis auf die spätere Phase.

- **Task 1+2 Coupling explizit machen:** „Die Crop-Contract-Entscheidung aus Task 1 bestimmt den erwarteten Content-Type und Payload in Task 2's Backend-Handler. Wer Task 2 implementiert muss Task 1's Entscheidung kennen."

---

### Risk Assessment

**HIGH** — 53B enthält vier Entscheidungspunkte, die alle Backend + Frontend + Contract gleichzeitig berühren, und eine potentiell sicherheitsrelevante Implementierung (TipTap). Der Defer-Path für TipTap schützt gut — aber wenn ein Executor TipTap vollständig umsetzt ohne den DB-Migrations-Schritt explizit zu lesen, entsteht ein inkonsistenter State. Empfehlung: 53B vor Execution um die oben genannten Task-Splits und den DB-Migrations-Check ergänzen.

---

---

## Consensus Summary

### Agreed Strengths

- **Wave-Isolation (53A vor 53B) ist die richtige Architektur** — kein anderer Reviewer würde das anders sehen. Die Entscheidung, Avatar/RichText/Visibility erst in 53B anzufassen, schützt die 53A-Lieferung.
- **No-fake-data-Invariante durchgehend konsequent** — in beiden Plänen konsistent als must_have.truth und als Acceptance Criterion formuliert.
- **Dirty-State-Regressions-Schutz explizit benannt** — Phase-52-Schutz ist in beiden Plänen ein benanntes Risiko.
- **GDS-Reuse hat echte Referenzpunkte** — bestehende Komponenten und Muster werden namentlich benannt statt abstrakt gefordert.

### Agreed Concerns

1. **Redirect vs. Re-Export für `/admin/profile` muss vor Execution entschieden werden** — dieser offene Punkt ist das größte Ausführungsrisiko in 53A.
2. **Fehlende Tests für `/me/profile`** — das bestehende Testfile deckt die neue Route nicht ab, solange kein expliziter Test-Task existiert.
3. **TipTap-Task braucht einen DB-Migrations-Check als expliziten Schritt** — 53B-Task 4 ist ohne diesen Schritt inkomplett.
4. **Task 3 in 53B ist zu breit** — Visibility und Month/Year sind unabhängige Contracts und sollten getrennte Tasks sein.

### Divergent Views

*Kein zweiter externer Reviewer verfügbar. Nachfolgende Fragen wären sinnvoll für ein zweites Modell:*
- Ist die Entscheidung, OpenAPI-Dokumentation bereits in 53A zu fordern (nicht erst in 53B), die richtige Priorisierung?
- Ist Task 6 (Contributions Detail Expansion) in 53B überhaupt nötig, oder wäre ein reines „document as deferred" in 53A ausreichend?

---

## Empfehlung

Vor Execution folgende Änderungen in den Plänen vornehmen:

**53-01:**
1. Task 1: Entscheide Re-Export vs. Redirect und dokumentiere die Entscheidung explizit.
2. Task 1 verify: Füge einen Test-Schritt für `me/profile/page.tsx` hinzu.
3. Task 5: Spezifiziere Mindest-Schema-Content für OpenAPI.
4. Task 4: Lege kanonische Fundstelle für Rollenlabel-Formatter fest.

**53-02:**
1. Task 4: Füge DB-Migrations-Check als expliziten Schritt vor Backend-Änderungen hinzu.
2. Task 3: Trenne in T3a (Visibility) und T3b (Activity Period).
3. Task 5: Trenne in T5a (Dirty State/Tests) und T5b (Mobile/A11y QA).
4. Task 4 verify: Füge XSS-Smoke-Test hinzu.
5. Task 2: Konkretisiere Avatar-Varianten-Defer-Kriterium.

---

*Review durchgeführt am: 2026-05-27*
*Reviewer: Claude (im Auftrag des GSD cross-AI review workflows)*
*Pläne: 53-01-PLAN.md, 53-02-PLAN.md*
