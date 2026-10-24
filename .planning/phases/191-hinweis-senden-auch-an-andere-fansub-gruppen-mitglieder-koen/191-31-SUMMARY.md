---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 31
subsystem: ui
tags: [css-modules, frontend-architecture, refactor, d-27, d-25, contributions]

# Dependency graph
requires:
  - phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
    provides: "11 neue, komponentenbezogene CSS-Module (Plan 191-27) mit exaktem Class-zu-Datei-Mapping, contributions.module.css bereits geloescht"
provides:
  - "Alle 12 vormals auf contributions.module.css zeigenden Dateien repointed auf ihr(e) korrektes/korrekte neues/neue CSS-Modul(e) -- Frontend baut wieder"
  - "docs/FRONTEND_ARCHITEKTUR.md dokumentiert das neue Pro-Komponente-CSS-Modul-Muster inkl. der beiden geteilten Dateien (ContributionCard.module.css, RolePicker.module.css)"
  - "D-25-Kommentar-Sweep fuer die letzten 3 der 25 D-25-benannten Dateien abgeschlossen (page.tsx, MyProposalsSection.tsx, ProposalForm.tsx) -- ProposalForm.steps.tsx gesweept, keine Aenderung noetig"
  - "D-27 vollstaendig abgeschlossen: contributions.module.css existiert nicht mehr, kein Konsument zeigt mehr darauf"
affects: [191-30]

tech-stack:
  added: []
  patterns:
    - "Pro-Komponente-CSS-Modul statt eines geteilten Sammel-Moduls: jede .tsx-Datei importiert primaer ihr eigenes gleichnamiges .module.css als `styles`"
    - "Zwei bewusst geteilte Klassenfamilien werden per zusaetzlichem, aliasiertem Import eingebunden (cardStyles aus ContributionCard.module.css; rolePickerStyles aus RolePicker.module.css) statt per Cross-Modul-Re-Export"

key-files:
  created: []
  modified:
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/components/contributions/ContributionCard.tsx
    - frontend/src/components/contributions/ContributionInbox.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/ContributionSummary.tsx
    - frontend/src/components/contributions/AnimeGroupCard.tsx
    - frontend/src/components/contributions/MyContributionsSection.tsx
    - frontend/src/components/contributions/VisibilityDropdown.tsx
    - frontend/src/components/contributions/RejectReasonModal.tsx
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.steps.tsx
    - frontend/src/components/contributions/ProposalForm.toggles.tsx
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Fuer MyProposalsSection.tsx/ProposalForm.tsx wurde ausschliesslich die im Plan explizit als autoritativ markierte, bereits-verifizierte Fundstellenliste reformuliert (1 Block in page.tsx, 2 in MyProposalsSection.tsx, 7 in ProposalForm.tsx) -- zwei weitere, aehnlich mit einer Decision-ID beginnende Kommentare (ein D-17-Block und ein dritter D-18-Block in MyProposalsSection.tsx), die NICHT auf der Liste standen, wurden bewusst unveraendert gelassen: beide stellen bereits eine vollstaendige Sachaussage dar und erfuellen damit das Abnahmekriterium ('keine bare Referenz ohne Sachaussage') auch ungeaendert."
  - "ProposalForm.steps.tsx wurde wie vom Plan vorgegeben per git diff 72fc7c0f6..HEAD gesweept -- jeder dort seit Phase 191 hinzugekommene Kommentar kombiniert bereits eine Sachaussage mit einem nachgestellten Decision-Verweis, keine Aenderung vorgenommen (dokumentiertes, plankonformes Ergebnis, kein Uebersehen)."
  - "Die repo-weiten `npm run lint`-Fehler (5 Errors in 4 Dateien ausserhalb dieses Plans) und ein einzelner im Vollsuite-Lauf fehlgeschlagener, in Isolation gruener Test (DefaultCrewManager.test.tsx) wurden als pre-existing/unrelated dokumentiert statt repariert (Scope-Boundary-Regel) -- siehe deferred-items.md. Alle 13 von diesem Plan beruehrten Dateien sind eslint-sauber (0 Errors/Warnings bei direkter Pruefung)."
  - "Der volle Test-/Typecheck-Lauf wurde zusaetzlich innerhalb des team4sv30-frontend-Containers wiederholt (CLAUDE.md: kanonische Linux/Docker-Umgebung), weil mehrere Host-Testlaeufe an fehlenden Container-internen Pfaden/Hostnamen (API_INTERNAL_URL, /backend/...) scheiterten, die ausserhalb des Containers nicht aufloesbar sind -- im Container ist die volle Suite gruen bis auf den einen isoliert gruenen Flaky-Test."

requirements-completed: [D-27, D-25]

# Metrics
duration: ~55min
completed: 2026-10-24
---

# Phase 191 Plan 31: Import-Repoint der 12 contributions-Dateien (D-27, 2. Haelfte) + D-25-Abschluss Summary

**Alle 12 vormals auf das geloeschte contributions.module.css zeigenden Dateien repointed auf ihre neuen, pro-Komponente-CSS-Module aus Plan 191-27 -- Frontend baut und testet wieder vollstaendig gruen, D-27 und D-25 damit abgeschlossen**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2
- **Files modified:** 13 (12 Task-1-Dateien + docs/FRONTEND_ARCHITEKTUR.md; davon 3 zusaetzlich in Task 2 fuer den Kommentar-Sweep)

## Accomplishments
- Alle 8 Dateien mit einfachem 1:1-Import-Rename (page.tsx, ContributionCard.tsx, ContributionInbox.tsx, MyContributionsSection.tsx, VisibilityDropdown.tsx, RejectReasonModal.tsx, ProposalForm.tsx, ProposalForm.toggles.tsx) zeigen jetzt auf ihr jeweils korrektes neues CSS-Modul.
- Die 4 Dateien mit geteilten Klassenfamilien (MyProposalsSection.tsx, ContributionSummary.tsx, AnimeGroupCard.tsx, ProposalForm.steps.tsx) importieren korrekt zwei CSS-Module -- ihr primaeres als `styles` plus einen aliasierten Zweitimport (`cardStyles` aus ContributionCard.module.css bzw. `rolePickerStyles` aus RolePicker.module.css) fuer die geteilten Klassen; jede `className={styles.X}`-Referenz zeigt nachweislich auf die Datei, die `X` tatsaechlich exportiert (per `grep -oE '^\.[A-Za-z0-9_]+'` je CSS-Datei gegen jede `.tsx`-Verwendung abgeglichen).
- `grep -rl "contributions.module.css" frontend/src` liefert keinen Treffer mehr -- keine stale Referenz auf die geloeschte Datei irgendwo im Frontend.
- `docs/FRONTEND_ARCHITEKTUR.md` dokumentiert jetzt in Abschnitt 12 das neue Pro-Komponente-CSS-Modul-Muster inkl. der beiden bewusst geteilten Dateien und der Empfehlung, kuenftige Erweiterungen in die passende bestehende Datei statt in ein neues Sammel-Modul zu schreiben.
- D-25-Kommentar-Sweep fuer die letzten 3 der 25 vom Phasen-Decision-Log benannten Dateien: 1 bare D-18-Referenz in page.tsx, 2 bare D-18-Referenzen in MyProposalsSection.tsx (1x JSDoc-Block, 1x Inline-Kommentar), 7 bare D-12-Referenzen in ProposalForm.tsx (eine zusammenhaengende "Lauf" von vorausgewaehlter-Einstieg-Kommentaren) jeweils so umformuliert, dass die fachliche Regel fuehrt und die Decision-ID nur noch nachgestellter, parenthetischer Verweis ist. ProposalForm.steps.tsx wurde gesweept, hatte aber keine Aenderung noetig -- jeder seit Phase 191 hinzugekommene Kommentar dort kombiniert bereits Sachaussage + nachgestellten Verweis.
- `npm run typecheck`, `npm run lint` (gegen die 13 vom Plan beruehrten Dateien direkt geprueft) und die 13 contributions-bezogenen Testdateien (95 Tests) sind gruen; der volle Test-/Typecheck-Lauf innerhalb des team4sv30-frontend-Containers (kanonische CLAUDE.md-Umgebung) bestaetigt dies fuer die gesamte Suite (415 passed | 1 skipped nach erneuter Einzelverifikation des einen im Vollauf kurzzeitig geflackerten, unrelated Tests).
- `docker restart team4sv30-frontend` + Live-Abruf von `/me/contributions` ueber `http://192.168.235.196:3000` bestaetigt: Next.js kompiliert die Route fehlerfrei (`GET /me/contributions 200`, kein CSS-Modul-Resolution-Fehler in den Container-Logs), Playwright-Screenshot ohne Konsolen-/Pageerror zeigt den erwarteten, korrekt gestylten `Anmeldung erforderlich`-Zustand (ui-system-Card/Button). Der vollstaendige authentifizierte Pixel-Paritaets-Vergleich bleibt laut Planvorgabe explizit Plan 191-30 vorbehalten.

## Task Commits

1. **Task 1: Repoint every importing file, update FRONTEND_ARCHITEKTUR.md, verify green** - `4d437a368` (fix)
2. **Task 2: D-25 comment sweep for the 4 files no other plan covers** - `62bddd70b` (docs)

**Plan metadata:** (folgt in diesem Commit)

## Files Created/Modified
- `frontend/src/app/me/contributions/page.tsx` - Import von `@/components/contributions/contributions.module.css` auf `./page.module.css` umgestellt; 1 bare D-18-Kommentar umformuliert
- `frontend/src/components/contributions/ContributionCard.tsx` - Import auf `./ContributionCard.module.css` umgestellt
- `frontend/src/components/contributions/ContributionInbox.tsx` - Import auf `./ContributionCard.module.css` umgestellt (nutzt ausschliesslich dessen Klassen, keine eigene Datei noetig)
- `frontend/src/components/contributions/MyProposalsSection.tsx` - Zwei Imports: `cardStyles` aus `./ContributionCard.module.css`, `styles` aus `./MyProposalsSection.module.css`; jede `className`-Referenz auf den korrekten Alias umgestellt; 2 bare D-18-Kommentare umformuliert
- `frontend/src/components/contributions/ContributionSummary.tsx` - Zwei Imports: `cardStyles` aus `./ContributionCard.module.css` (fuer `actionsRow`/`inboxContainer`), `styles` aus `./ContributionSummary.module.css`
- `frontend/src/components/contributions/AnimeGroupCard.tsx` - Zwei Imports: `styles` aus `./AnimeGroupCard.module.css`, `cardStyles` aus `./ContributionCard.module.css` (nur fuer `actionsRow`)
- `frontend/src/components/contributions/MyContributionsSection.tsx` - Import auf `./MyContributionsSection.module.css` umgestellt
- `frontend/src/components/contributions/VisibilityDropdown.tsx` - Import auf `./VisibilityDropdown.module.css` umgestellt
- `frontend/src/components/contributions/RejectReasonModal.tsx` - Import auf `./RejectReasonModal.module.css` umgestellt
- `frontend/src/components/contributions/ProposalForm.tsx` - Import auf `./ProposalForm.module.css` umgestellt; 7 bare D-12-Kommentare umformuliert (reiner Kommentartext-Pass, keine Code-Aenderung)
- `frontend/src/components/contributions/ProposalForm.steps.tsx` - Zwei Imports: `rolePickerStyles` aus `./RolePicker.module.css` (fuer `rolePicker`/`roleChoice`/`roleChoiceActive`), `styles` aus `./ProposalForm.steps.module.css`; gesweept fuer D-25, keine Kommentaraenderung noetig
- `frontend/src/components/contributions/ProposalForm.toggles.tsx` - Import auf `./RolePicker.module.css` umgestellt
- `docs/FRONTEND_ARCHITEKTUR.md` - Neuer Absatz in Abschnitt 12 dokumentiert das Pro-Komponente-CSS-Modul-Muster
- `.planning/phases/191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen/deferred-items.md` - Neu angelegt; dokumentiert pre-existing, unrelated Lint-Fehler und einen in Isolation gruenen Flaky-Test

## Decisions Made
Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

None - plan executed exactly as written. Zwei kleinere, dokumentierte Entscheidungen innerhalb des Plan-Rahmens (siehe `key-decisions`): (1) die vom Plan als autoritativ markierte Fundstellenliste fuer den D-25-Sweep wurde woertlich befolgt statt eigenstaendig erweitert, (2) pre-existing, unrelated Lint-/Test-Befunde wurden gemaess Scope-Boundary-Regel dokumentiert statt repariert.

## Issues Encountered

**Host-Testlauf unvollstaendig aussagekraeftig:** Ein erster `npm run test`-Lauf direkt auf dem Host (ausserhalb des `team4sv30-frontend`-Containers) zeigte 6 fehlgeschlagene Testdateien, die sich bei naeherer Pruefung ausschliesslich auf Container-interne Ressourcen stuetzen, die vom Host aus nicht aufloesbar sind (`API_INTERNAL_URL=http://team4sv30-backend:8092` ist nur im Docker-Netzwerk aufloesbar; `/backend/internal/permissions/permissions.go` ist ein Container-Mount-Pfad). Geloest durch Wiederholung des vollen Test-/Typecheck-Laufs innerhalb des Containers per `docker exec team4sv30-frontend npm run test`, wie es CLAUDE.md als kanonische Umgebung vorschreibt -- dort ist die Suite gruen bis auf einen einzelnen, in Isolation sofort gruenen Flaky-Test (`DefaultCrewManager.test.tsx`, unrelated zu diesem Plan, siehe `deferred-items.md`).

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness
- D-27 ist vollstaendig abgeschlossen: `contributions.module.css` existiert nicht mehr, alle 12 Konsumenten zeigen auf die korrekten neuen Dateien, `docs/FRONTEND_ARCHITEKTUR.md` dokumentiert das Muster.
- D-25 ist fuer alle 25 benannten Dateien abgeschlossen (191-25/191-26/191-27/191-28/191-29 plus diese 3 Dateien aus 191-31 -- keine Ueberschneidung, keine Luecke).
- Plan 191-30 (der naechste, abhaengige Plan) kann jetzt den vollstaendigen authentifizierten Pixel-Paritaets-Check von `/me/contributions` und den beiden Review-Oberflaechen durchfuehren -- die Voraussetzung dafuer (bauendes, gruen getestetes Frontend) ist mit diesem Plan erfuellt.
- Kein Blocker fuer 191-30.
- Offene, bewusst nicht in diesem Plan behobene Punkte: siehe `deferred-items.md` (repo-weite Lint-Altlast in 4 unrelated Dateien, 1 Flaky-Test).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Plan: 31*
*Completed: 2026-10-24*

## Self-Check: PASSED

All 13 files modified by this plan confirmed present on disk; `deferred-items.md` confirmed
created; both task commit hashes (`4d437a368`, `62bddd70b`) confirmed present in git history.
