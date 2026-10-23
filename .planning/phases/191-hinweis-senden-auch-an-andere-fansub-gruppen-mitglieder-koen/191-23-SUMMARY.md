---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 23
subsystem: ui
tags: [react, nextjs, typescript, fansub-group-hints, vitest]

# Dependency graph
requires:
  - phase: 191-22
    provides: "GET /api/v1/me/fansub-group-hints -- Absender-Sicht auf eigene gesendete Hinweise, IDOR-sicher"
  - phase: 191-17
    provides: "Extraktions-Praezedenzfall contributionsEligibility.ts (einzige Quelle statt Duplikat)"
provides:
  - "src/lib/fansubGroupHintStatus.ts -- einzige Quelle von hintStatusLabel/hintStatusVariant, von Admin-Liste UND Member-Ansicht geteilt"
  - "listMyFansubGroupHints() API-Client-Funktion"
  - "MyProposalsSection.tsx zeigt eigene gesendete fansub_group_hints (eigene + fremde Zielgruppe) unter 'Eingereichte Hinweise', Kopfzeile summiert beide Quellen"
affects: [191-24]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Status-zu-Copy/Badge-Variante-Zuordnung als geteiltes Modul statt Re-Implementierung pro Konsument (dieselbe Linie wie contributionsEligibility.ts, Plan 191-17)"

key-files:
  created:
    - frontend/src/lib/fansubGroupHintStatus.ts
    - frontend/src/lib/fansubGroupHintStatus.test.ts
  modified:
    - frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx
    - frontend/src/lib/api/fansub-group-hints.ts
    - frontend/src/lib/api/fansub-group-hints.test.ts
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/MyProposalsSection.test.tsx
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/app/me/contributions/page.test.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "hintStatusLabel/hintStatusVariant aus FansubGroupHintsAdminClient.tsx extrahiert in src/lib/fansubGroupHintStatus.ts, Admin-Client re-exportiert statt zu duplizieren -- dessen bestehender Test importiert beide Namen weiterhin direkt von dort und blieb unveraendert gruen"
  - "listMyFansubGroupHints() spiegelt listGroupHints 1:1 (gleicher ApiError/authorizedFetch-Vertrag), nur andere URL ohne Pfad-Parameter"
  - "Leertext-Neuformulierung entfernt die Mitgliedschafts-Implikation vollstaendig statt sie nur abzuschwaechen: 'Reiche den ersten Hinweis fuer ein Projekt ein — auch bei einer Gruppe, der du nicht angehoerst.'"
  - "Neue Hint-Card wiederverwendet Card variant=nestedFlat + die bestehenden contributionCard/reviewNote-CSS-Klassen statt neuer eigener Klassen -- visuelle Konsistenz mit den drei bestehenden Status-Gruppen ohne neues CSS"

patterns-established:
  - "Bei einer zweiten, unabhaengigen Datenquelle fuer dieselbe Section: Kopfzeilen-Zaehler summiert explizit beide .length-Werte, Leerzustand prueft total===0 (nicht nur eine Quelle)"

requirements-completed: [D-18, D-08, D-15]

# Metrics
duration: ~12min
completed: 2026-10-23
---

# Phase 191 Plan 23: Fremd-Hinweise unter "Eingereichte Hinweise" sichtbar (D-18) Summary

**`/me/contributions` zeigt jetzt zusaetzlich zu den bestehenden anime_contributions-Vorschlaegen die eigenen gesendeten `fansub_group_hints` (eigene UND fremde Zielgruppe) mit Zielgruppe, Projekt, Status und Ablehnungsgrund -- Status-Darstellung aus einem neu extrahierten, mit der Plattform-Admin-Liste geteilten Modul, live gegen die drei echten Testdaten-Hinweise (ID 1/2/3) verifiziert.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-10-23T22:46:47Z
- **Completed:** 2026-10-23T22:52:44Z
- **Tasks:** 2
- **Files modified:** 8 (2 davon neu angelegt)

## Accomplishments
- `src/lib/fansubGroupHintStatus.ts` ist jetzt die einzige Quelle von `hintStatusLabel`/`hintStatusVariant` -- aus `FansubGroupHintsAdminClient.tsx` extrahiert (byte-identische Switch-Logik), dort re-exportiert statt dupliziert; der bestehende Admin-Client-Test blieb unveraendert gruen (Public-Surface-Beweis).
- Neuer API-Client `listMyFansubGroupHints()` liest `GET /api/v1/me/fansub-group-hints` (Plan 191-22), identischer `ApiError`/`authorizedFetch`-Vertrag wie jede andere Funktion in dieser Datei.
- `MyProposalsSection.tsx` bekommt die neue Pflicht-Prop `sentGroupHints`; die Kopfzeile `"Eingereichte Hinweise (n)"` summiert `proposals.length + sentGroupHints.length`; eine neue "An andere Gruppen"-Liste rendert Zielgruppe, Projekt, Status-Badge und (nur bei `status==='rejected' && decision_note`) den Ablehnungsgrund -- wiederverwendet `Card variant="nestedFlat"` und die bestehenden `contributionCard`/`reviewNote`-CSS-Klassen, kein neues Markup fuer einen bereits vorhandenen Primitiv-Typ.
- Der veraltete Leertext ("...fuer ein Projekt einer Gruppe ein, in der du Mitglied bist.") wurde ersetzt, impliziert keine Mitgliedschaftspflicht mehr; Leerzustand bleibt nur sichtbar, wenn BEIDE Quellen leer sind.
- `page.tsx`s `reload()` laedt `listMyFansubGroupHints()` als dritten parallelen Call in `Promise.all` mit demselben `.catch()`-Fallback-Muster wie `getMyMemberships()`.
- Frontend-Container (`team4sv30-frontend`) neu gestartet, `GET /me/contributions` liefert 200.
- **Live-Verifikation gegen echte Testdaten (Resource-Owner-Password-Grant gegen Keycloak, dieselbe Methode wie Plan 191-19/191-21):**
  - Login als `jeahn45` (app_user_id=5) → `GET /api/v1/me/fansub-group-hints` liefert exakt Hinweis ID 1 (Strawhat Subs, Anime 11eyes, status=open).
  - Login als `timer` (app_user_id=3) → liefert exakt die Hinweise ID 2 (Strawhat Subs) UND ID 3 (Bloody-Shadow), beide Anime 11eyes, status=open -- IDOR-sicher getrennt von jeahn45s Ergebnis.
  - `fansub_group_hints`-Zeilen ID 1/2/3 per `SELECT` gegen `team4sv30-db` nach dem Test gegengeprueft: unveraendert (Status weiterhin `open`, keine Modifikation).

## Task Commits

1. **Task 1a (RED): failing tests fuer Shared-Status-Helfer + listMyFansubGroupHints** - `934eecdcc` (test)
2. **Task 1b (GREEN): Extraktion + neue API-Funktion** - `6f1cf5240` (feat)
3. **Task 2a (RED): failing tests fuer gesendete Fremd-Gruppen-Hinweise** - `e4939b090` (test)
4. **Task 2b (GREEN): Rendering + page.tsx-Verdrahtung + Doku** - `a31f549ff` (feat)

**Plan metadata:** siehe Self-Check unten.

## Files Created/Modified
- `frontend/src/lib/fansubGroupHintStatus.ts` (neu) - einzige Quelle von `hintStatusLabel`/`hintStatusVariant`
- `frontend/src/lib/fansubGroupHintStatus.test.ts` (neu) - Wahrheitstabelle, 6 Assertions
- `frontend/src/app/admin/fansub-group-hints/FansubGroupHintsAdminClient.tsx` - lokale Definitionen entfernt, re-exportiert aus dem neuen Modul
- `frontend/src/lib/api/fansub-group-hints.ts` - neue Funktion `listMyFansubGroupHints`
- `frontend/src/lib/api/fansub-group-hints.test.ts` - zwei neue Faelle (500-Fehler, 200-Erfolg)
- `frontend/src/components/contributions/MyProposalsSection.tsx` - neue `sentGroupHints`-Prop, summierte Kopfzeile, neue Hint-Card-Liste, neuer Leertext
- `frontend/src/components/contributions/MyProposalsSection.test.tsx` - 7 neue Faelle (Summierung, Rendering, Ablehnungsgrund mit/ohne Note, Leerzustand-Suppression/-Beibehaltung, Leertext-Wortlaut)
- `frontend/src/app/me/contributions/page.tsx` - `listMyFansubGroupHints()` als dritter paralleler Call, neuer `sentGroupHints`-State
- `frontend/src/app/me/contributions/page.test.tsx` - `listMyFansubGroupHintsMock`-Eintrag ergaenzt
- `docs/FRONTEND_ARCHITEKTUR.md` - `fansubGroupHintStatus.ts` als geteilten Baustein nachgezogen

## Decisions Made
- Siehe `key-decisions` im Frontmatter.
- Keine neue CSS-Datei/Klasse: die neue Hint-Card nutzt ausschliesslich bereits vorhandene `contributions.module.css`-Klassen (`contributionCard`, `contributionCardHeader`, `contributionTitleRow`, `contributionTitle`, `metaText`, `reviewNote`), visuell konsistent mit den drei bestehenden Status-Gruppen.

## Deviations from Plan

None - plan executed exactly as written (inklusive TDD RED/GREEN-Commit-Paaren pro Task).

## Issues Encountered
- Der urspruengliche Test-Entwurf fuer `listMyFansubGroupHints` nutzte `status=401`, was in `authorizedFetch` einen speziellen 401-Retry-Pfad (`response.clone()`) triggert, den ein einfaches Mock-Objekt ohne `.clone()`-Methode nicht erfuellt. Auf `status=500` umgestellt (konsistent mit der sibling-Test-Konvention in dieser Datei, die 401 nirgends sonst mockt) -- kein Produktcode-Workaround, reine Testdaten-Korrektur.

## User Setup Required

None - keine neue externe Konfiguration erforderlich.

## Next Phase Readiness
- D-18 ist nach dieser Runde vollstaendig geschlossen: Backend (Plan 191-22) und Frontend (dieser Plan) sind beide live gegen echte Konten verifiziert.
- Verbleibende offene Punkte aus der vierten UAT-Runde (D-19, D-20, D-21, D-22) liegen in anderen Plaenen dieser Phase; dieser Plan beruehrt sie nicht.
- Live-Testdaten `fansub_group_hints` ID 1/2/3 bleiben unveraendert fuer die naechste Abnahme verfuegbar.

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*

## Self-Check: PASSED

Alle 10 referenzierten Dateien auf dem Dateisystem gefunden; alle 4 Task-Commit-Hashes (`934eecdcc`, `6f1cf5240`, `e4939b090`, `a31f549ff`) im Git-Log gefunden.
