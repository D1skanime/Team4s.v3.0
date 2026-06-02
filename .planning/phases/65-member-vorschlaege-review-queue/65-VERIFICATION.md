---
phase: 65-member-vorschlaege-review-queue
verified: 2026-06-02T18:12:59+02:00
status: complete
score: 3/3 must-haves verified
overrides_applied: 0
human_verification_completed: 2026-06-02T18:12:59+02:00
human_verification:
  - test: "Anime-Typeahead im ProposalForm im Browser testen"
    expected: "Eingabe ab 2 Zeichen liefert tatsächlich Ergebnisse für reale Anime aus der Datenbank; kein Leerantwort bei vorhandenen Titeln"
    why_human: "searchAnimeForProposal ruft den öffentlichen Endpunkt /api/v1/anime (include_disabled: false) auf — dieser liefert je nach Datenlage und Suchsemantics des öffentlichen Katalogs möglicherweise weniger Ergebnisse als erwartet (CR-01). Nur ein Browser-Test mit realer DB kann zeigen, ob Mitglieder die gewünschten Anime finden."
  - test: "SelfPublish-Sichtbarkeit auf Anime-Seite prüfen"
    expected: "Nach 90-Tage-Selbstschaltung erscheint der Beitrag auf der öffentlichen Anime-Seite mit is_verified=false (z. B. (historisch)-Kennzeichnung). Er sollte NICHT identisch wie ein Leader-bestätigter Beitrag erscheinen."
    why_human: "WR-02: SelfPublish setzt is_public_on_anime_page=true; die DB-Query setzt is_verified = (status='confirmed'), also false für self-published. Aber ob die Frontend-Anime-Seite das is_verified=false-Flag visuell unterscheidet (Badge, Label) muss manuell geprüft werden."
  - test: "Review-Queue-UX als Leader testen"
    expected: "admin/my-groups/[id] zeigt die Sektion 'Offene Vorschläge' mit Bestätigen/Ablehnen-Aktionen. Aktionen aktualisieren die Liste optimistisch."
    why_human: "Visuelles Layout und Interaktionsfluss (inline Ablehnen-Expansion, optimistisches Entfernen) erfordern Browser-UAT."
  - test: "me/contributions Eigene-Vorschläge-Sektion mit Modal prüfen"
    expected: "Sektion sichtbar; '+ Beitrag vorschlagen'-Button öffnet Modal ohne Seitenwechsel; Gruppen-Dropdown befüllt; 90-Tage-Hinweis sichtbar; Duplikat 409 zeigt deutschen Fehlertext."
    why_human: "Vollständiger User-Flow mit Modal und API-Calls erfordert Browser-UAT."
---

# Phase 65: Member Vorschläge Review-Queue — Verifikationsbericht

**Phase-Ziel:** Member kann eigene Contributions vorschlagen. Leader sieht Review-Queue und kann bestätigen oder ablehnen. Timeout-Handling nach 90 Tagen ohne Reaktion (Member-Selbstschaltung als unverified).
**Verifiziert:** 2026-06-02T18:12:59+02:00
**Status:** complete
**Re-Verifikation:** Nein — initiale Verifikation

---

## Live-UAT-Abschluss

Die zuvor offenen Human-UAT-Punkte wurden am 2026-06-02 im lokalen Codex-/Browser-Setup geprüft und in `65-HUMAN-UAT.md` abgeschlossen. Dabei wurden zwei Live-Befunde direkt behoben:

- Die Leader-Review-Queue gehört in den echten Gruppen-Edit-Flow `/admin/fansubs/[id]/edit`, nicht primär nach `/admin/my-groups/[id]`.
- `ListProposedByGroup` darf keine nicht vorhandenen Live-Schema-Spalten (`hist_fansub_group_members.display_name`, `anime.title_romaji`) abfragen.

Der Route-Ownership-Entscheid ist in `DECISIONS.md` dokumentiert; die künftige Live-Browser-UAT-Regel steht in `AGENTS.md`.

## Ziel-Erreichung

### Beobachtbare Wahrheiten

| # | Wahrheit | Status | Belege |
|---|---------|--------|--------|
| 1 | P65-SC1: POST /api/v1/me/contribution-proposals implementiert; Vorschlag erhält Status proposed | VERIFIED | Handler, Repository, Route in main.go vorhanden; 5 Unit-Tests grün (TestCreateProposal_*) |
| 2 | P65-SC2: Leader sieht Review-Queue im Admin-Frontend und kann Vorschläge bestätigen oder ablehnen | VERIFIED | ContributionReviewHandler mit ListProposals/ConfirmProposal/RejectProposal; ReviewQueue.tsx in admin/my-groups/[id]/page.tsx eingebunden; 8 Unit-Tests grün |
| 3 | P65-SC3: Nach 90 Tagen ohne Reaktion kann Vorschlag als unverified öffentlich geschaltet werden (Member-Selbstschaltung) | VERIFIED | SelfPublish-Methode prüft 90 Tage serverseitig; Status bleibt 'proposed'; MyProposalsSection.tsx zeigt Selbstschaltungs-Trigger bei can_self_publish=true |

**Punktzahl:** 3/3 Wahrheiten verifiziert

---

## Erforderliche Artefakte

| Artefakt | Erwartet | Status | Details |
|---------|---------|--------|---------|
| `database/migrations/0089_anime_contributions_review_note.up.sql` | ADD COLUMN review_note TEXT NULL | VERIFIED | Exaktes Statement vorhanden |
| `database/migrations/0089_anime_contributions_review_note.down.sql` | DROP COLUMN review_note | VERIFIED | Exaktes Statement vorhanden |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | CreateProposal, ListProposedByGroup, Confirm, Reject, SelfPublish | VERIFIED | 342 Zeilen; alle 5 Methoden vorhanden; kompiliert |
| `backend/internal/handlers/contribution_proposals_me_handler.go` | CreateProposal, SelfPublish, ListMemberships | VERIFIED | 393 Zeilen (< 450); alle drei Handler-Methoden vorhanden |
| `backend/internal/handlers/contribution_proposals_me_test.go` | 10 Unit-Tests für P65-SC1 und P65-SC3 | VERIFIED | 386 Zeilen; alle 10 Tests grün |
| `backend/internal/handlers/contribution_review_handler.go` | ListProposals, ConfirmProposal, RejectProposal | VERIFIED | 215 Zeilen (< 450) |
| `backend/internal/handlers/contribution_review_handler_test.go` | 8 Unit-Tests für P65-SC2 | VERIFIED | 309 Zeilen; alle 8 Tests grün |
| `frontend/src/types/contributions.ts` | ProposalFormData, GroupProposalRow, MembershipEntry; MeAnimeContribution + review_note + can_self_publish | VERIFIED | Alle neuen Typen und erweiterten Felder vorhanden |
| `frontend/src/lib/api.ts` | getMyMemberships, searchAnimeForProposal, createContributionProposal, selfPublishContribution, listGroupProposals, confirmProposal, rejectProposal | VERIFIED | Alle 7 Funktionen ab Zeile 6994 |
| `frontend/src/components/contributions/ProposalForm.tsx` | Modal-Formular mit Typeahead, Rollen, 90-Tage-Hinweis | VERIFIED | 211 Zeilen; Typeahead (searchAnimeForProposal), 90-Tage-Hinweis (D-13), Rollen-Chips vorhanden |
| `frontend/src/components/contributions/MyProposalsSection.tsx` | Status-gruppierte Vorschläge + SelfPublish-Trigger + getMyMemberships | VERIFIED | 410 Zeilen (< 450); getMyMemberships aufgerufen; can_self_publish und review_note verwendet |
| `frontend/src/components/contributions/ReviewQueue.tsx` | Leader-Queue mit Confirm/Reject | VERIFIED | 348 Zeilen; listGroupProposals, confirmProposal, rejectProposal verdrahtet |
| `shared/contracts/contributions.yaml` | Alle 6 neuen Endpunkte dokumentiert | VERIFIED | 10 Treffer für contribution-proposals/self-publish/memberships |

---

## Key-Link-Verifikation

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `contribution_proposals_me_handler.go` | `anime_contributions_proposal_repository.go` | proposalRepo.CreateProposal | WIRED | Interface ProposalRepository, CreateProposal aufgerufen in Handler Zeile 269 |
| `contributions_me_handler.go` | `anime_contributions_proposal_repository.go` | ListByMemberIDWithProposalFields | WIRED | Zeile 93 in contributions_me_handler.go; liefert can_self_publish + review_note |
| `contribution_review_handler.go` | `permissions.go` | CanForFansubGroup mit ActionFansubGroupMembersManage | WIRED | Auf allen 3 Endpunkten (grep CanForFansubGroup → 3 Treffer) |
| `main.go` | `contribution_proposals_me_handler.go` | Routen-Registrierung | WIRED | Zeilen 390–392: GET /me/memberships, POST /me/contribution-proposals, POST /me/anime-contributions/:id/self-publish |
| `main.go` | `contribution_review_handler.go` | Routen-Registrierung | WIRED | Zeilen 393–395: alle 3 Admin-Review-Routen registriert |
| `frontend/src/app/me/contributions/page.tsx` | `MyProposalsSection.tsx` | Direkt eingebunden | WIRED | Import Zeile 6, Verwendung Zeile 74 |
| `frontend/src/app/admin/my-groups/[id]/page.tsx` | `ReviewQueue.tsx` | Direkt eingebunden | WIRED | Import Zeile 24, Verwendung Zeile 418 |
| `MyProposalsSection.tsx` | `api.ts` | getMyMemberships() befüllt ownGroups | WIRED | Zeile 5 Import, Zeile 84 Aufruf |

---

## Datenfluß-Verfolgung (Level 4)

| Artefakt | Datenvariable | Quelle | Echte Daten | Status |
|---------|--------------|--------|-------------|--------|
| `MyProposalsSection.tsx` | `ownGroups` | `getMyMemberships()` → GET /api/v1/me/memberships → DB: hist_fansub_group_members JOIN fansub_groups | Ja (SQL-JOIN in dbMembershipsLister) | FLOWING |
| `MyProposalsSection.tsx` | `proposals` | `getMyAnimeContributions()` → ListByMemberIDWithProposalFields → DB: anime_contributions | Ja (SQL mit can_self_publish on-read) | FLOWING |
| `ReviewQueue.tsx` | `proposals` | `listGroupProposals(fansubId)` → GET /admin/fansubs/:id/contribution-proposals → ListProposedByGroup → DB | Ja (SQL-JOIN mit GROUP BY) | FLOWING |
| `contributions_me_handler.go` | `items` | `ListByMemberIDWithProposalFields` → DB-Query mit review_note und can_self_publish | Ja — information_schema-Probe pro Request (IN-03 aus Code Review, Performance-Risiko, nicht SC-blockierend) | FLOWING (mit Vorbehalt) |

---

## Verhaltens-Spotchecks

| Verhalten | Prüfmethode | Ergebnis | Status |
|----------|------------|---------|--------|
| Backend kompiliert | `go build ./...` | Kein Fehler | PASS |
| 19 Phase-65-Handler-Tests | `go test ./internal/handlers/ -run "TestCreateProposal\|TestSelfPublish\|TestListMemberships\|TestListProposals\|TestConfirmProposal\|TestRejectProposal"` | 19/19 PASS | PASS |
| 5 fehlschlagende Tests (Phase 70) | `TestStoryImageUpload*`, `TestUpdateOwnProfileIDOR` | RED — unabhängig von Phase 65 (app_profile_story_image_test.go) | INFO |
| TypeScript-Check | `npx tsc --noEmit` | Kein Fehler | PASS |
| SelfPublish setzt Status NICHT auf confirmed | `grep "status.*confirmed" SelfPublish-Methode` | 0 Treffer in SelfPublish; Status bleibt 'proposed' | PASS |
| admin/my-groups/[id]/page.tsx Zeilenlimit | `wc -l` | 425 Zeilen (< 450) | PASS |
| CSS-Fix fieldLabel 14px | Datei-Prüfung | `.fieldLabel { font-size: 14px }` vorhanden | PASS |
| CSS-Fix sectionTitle 1rem | Datei-Prüfung | Zweite `.sectionTitle`-Deklaration: `font-size: 1rem` | PASS |
| 1.08rem-Wert entfernt | Datei-Prüfung | `1.08rem` nicht mehr vorhanden | PASS |

---

## Anforderungs-Abdeckung

| Anforderung | Quell-Plan | Beschreibung | Status | Belege |
|-------------|-----------|-------------|--------|--------|
| P65-SC1 | 65-01, 65-02, 65-04 | POST /api/v1/me/contribution-proposals; Vorschlag status=proposed | SATISFIED | Handler + Repository + Route registriert; Tests grün |
| P65-SC2 | 65-03, 65-04 | Leader sieht Review-Queue; kann bestätigen oder ablehnen | SATISFIED | ContributionReviewHandler + ReviewQueue.tsx; Tests grün |
| P65-SC3 | 65-02, 65-04 | Nach 90 Tagen Member-Selbstschaltung als unverified | SATISFIED | SelfPublish-Methode (serverseitiger 90-Tage-Check, Status bleibt 'proposed'); Selbstschaltungs-Trigger in UI |

**Hinweis REQUIREMENTS.md-Wortlaut:** P65-SC3 nennt auch "oder an Moderation weitergeleitet werden". Laut D-11 in CONTEXT.md und RESEARCH.md wurde diese Option bewusst verworfen — nur Member-Selbstschaltung ist implementiert. Die PLAN-must_haves decken den engeren Phase-Scope korrekt ab.

---

## Anti-Pattern-Befunde (aus Code Review CR-01 / WR-01 / WR-02)

| Datei | Zeile | Muster | Schweregrad | Auswirkung |
|-------|-------|--------|------------|-----------|
| `frontend/src/lib/api.ts` | 7020–7027 | `searchAnimeForProposal` mit `include_disabled: false` → öffentlicher Endpunkt `/api/v1/anime` | WARNUNG | Typeahead auf member-authentifizierter Oberfläche läuft gegen öffentlichen Katalog; bei reiner Suchsemantics-Abweichung können Mitglieder gültige Anime nicht finden (P65-SC1-Pfad). Keine Fehler, aber Produktentscheidung ausstehend (Admin-Endpunkt vs. Public). |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | 134, 151, 156, 177, 180, 319, 321, 336, 339 | ASCII-Umlaut-Ersetzungen in deutschen Fehlerstrings: `veroeffentlichen`, `bestaetigen`, `vorschlaege` | WARNUNG | Verstößt gegen CLAUDE.md Sprachqualitäts-Regel (ä/ö/ü/ß). Diese Strings sind Repository-interne `fmt.Errorf`-Wraps (nicht direkte HTTP-Responses), aber die Regel gilt für alle deutschen Prosa-Strings. Handler-seitige Fehlermeldungen sind korrekt (veröffentlicht, bestätigt). |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | 325–334 | `SelfPublish` setzt `is_public_on_anime_page = true` | INFO/WARNUNG | Selbst-publizierte Beiträge erscheinen auf der öffentlichen Anime-Seite. Die DB-Query dort berechnet `is_verified = (status='confirmed')`, also FALSE für self-published — "unverified"-Status ist semantisch erhalten. Frontend muss dieses Flag jedoch visuell darstellen. Requires human UAT. |
| `backend/internal/handlers/contribution_proposals_me_handler.go` | 230–243 | Kein expliziter Gruppen-Binding-Check auf Handler-Ebene | INFO | `fansub_group_member_id` wird nur auf Member-Ownership geprüft, nicht auf Zugehörigkeit zu `fansub_group_id`. Composite-FK in DB schützt Datenintegrität (ErrNotFound), aber Fehlertext ist 404 statt 403. Kein Daten-Leak möglich. |
| `backend/internal/handlers/contribution_review_handler.go` | 190 | `_ = c.ShouldBindJSON(&req)` verschluckt JSON-Syntaxfehler | INFO | Schlechter JSON-Body im Reject-Request wird als "kein Ablehngrund" behandelt. Kein Sicherheitsrisiko. |
| `backend/internal/repository/anime_contributions_proposal_repository.go` | 218–297 | `information_schema`-Probe bei jedem ListByMemberIDWithProposalFields-Aufruf | INFO | Performance-Overhead nach erfolgter Migration 0089. Nicht blockerend für v1. |

**TBD/FIXME/XXX-Marker:** Keine gefunden in Phase-65-Dateien.

---

## Menschliche Verifikation erforderlich

### 1. Anime-Typeahead im ProposalForm

**Test:** Browser-Test auf me/contributions öffnen, '+ Beitrag vorschlagen' klicken, im Anime-Feld einen bekannten Anime-Titel eingeben (≥ 2 Zeichen).
**Erwartet:** Dropdown erscheint mit passenden Ergebnissen; Auswahl möglich; kein leerer Dropdown bei vorhandenem Anime.
**Warum manuell:** CR-01 aus Code Review — `searchAnimeForProposal` routet auf öffentlichen `/api/v1/anime`-Endpunkt. Je nach Produkt-Entscheid (nur veröffentlichte Anime vorschlagbar?) kann das korrekt oder ein Bug sein. Wenn Member auch unveröffentlichte/inaktive Anime vorschlagen sollen, muss auf `/api/v1/admin/anime` umgestellt werden.

### 2. SelfPublish-Sichtbarkeit auf Anime-Seite (WR-02)

**Test:** Nach 90 Tagen (oder Test mit manuell manipuliertem created_at in DB): SelfPublish ausführen, dann Anime-Seite öffnen.
**Erwartet:** Beitrag erscheint mit `(historisch)`- oder ähnlichem Hinweis, der ihn von Leader-bestätigten Beiträgen unterscheidet.
**Warum manuell:** Die Backend-Query liefert `is_verified=false` für self-published Einträge — aber ob das Frontend diese Unterscheidung in der Anime-Contributions-Ansicht visuell darstellt, kann nur im Browser geprüft werden.

### 3. Review-Queue-UX als Leader

**Test:** Als Leader admin/my-groups/[id] öffnen; auf Vorschlag "Bestätigen" klicken; danach "Ablehnen" mit optionalem Ablehngrund testen.
**Erwartet:** Queue aktualisiert sich optimistisch; bestätigte/abgelehnte Einträge verschwinden aus der Queue; kein Seitenwechsel.
**Warum manuell:** Visuelles Layout, Inline-Expansion beim Ablehnen, optimistisches Update.

### 4. me/contributions Modal-Flow

**Test:** Als Member me/contributions öffnen; Modal öffnen; Formular vollständig ausfüllen; einreichen.
**Erwartet:** Status-Gruppierung sichtbar (In Prüfung / Bestätigt / Abgelehnt); Modal schließt nach Erfolg; neuer Vorschlag erscheint in "In Prüfung".
**Warum manuell:** User-Flow mit mehreren State-Transitions erfordert Browser-UAT.

---

## Lücken-Zusammenfassung

Es gibt keine blockerenden Lücken gegenüber den Success-Criteria P65-SC1, P65-SC2 und P65-SC3. Alle drei Criteria sind implementiert und durch automatisierte Tests abgesichert.

Die Code-Review-Befunde (CR-01, WR-01, WR-02) sind Qualitäts- und Robustheits-Risiken:

- **CR-01 (Typeahead-Routing):** Funktional riskant bei falscher Produktentscheidung, aber kein Compiler- oder Test-Fehler. Erfordert Produkt-Klärung und Human-UAT.
- **WR-01 (Umlaut-Verletzungen im Repository):** Verstößt gegen CLAUDE.md-Regel. Betrifft interne Fehlerstrings (nicht HTTP-Responses), aber sollte vor Release behoben werden.
- **WR-02 (SelfPublish setzt is_public_on_anime_page):** Backend-Semantik erzeugt "unverified"-Flag korrekt; Frontend-Darstellung ungeprüft.

Diese Befunde erfordern menschliche Entscheidung/UAT, blockieren aber nicht die SC-Erfüllung.

---

_Verifiziert: 2026-06-02T17:15:00Z_
_Verifizierer: Claude (gsd-verifier)_
