---
phase: 175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-
plan: 06
subsystem: docs
tags: [inventory, status-labels, dead-code, toast, dashboard-attention, mail, permissions, d-05]

# Dependency graph
requires:
  - phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
    provides: "174-HOTSPOTS.md D-07 Status-Mapping-Verdikt (getTypeBadgeLabel-OUTRO-Bug, F-02), 174-BUGS.md BUG-174-02 (Dashboard-Attention-Rechte-Fehlabgleich)"
provides:
  - "data/11-status-label-darstellung.md: 6 untersuchte Label-Funktionsgruppen, 3 bestätigte Verhaltensabweichungen (F-02 + 2 neue Funde), 2 tote Produktionscode-Duplikate identifiziert"
  - "data/12-benachrichtigung-hinweise.md: 4 Dashboard-Attention-Funktionen gegen aktuellen Code re-verifiziert (0 neue Rechte-Abweichungen), kein zentrales Toast-System gefunden (48 Ad-hoc-Implementierungen), genau 1 Mail-Typ bestätigt bereits gehärtet"
  - "scripts/count-11-status-label-darstellung.sh, scripts/count-12-benachrichtigung-hinweise.sh: reproduzierbare Grep-Zählungen"
affects: [175-07-INVENTORY, 175-08-PERMISSION-MATRIX, 175-ROADMAP-PROPOSAL]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-03/D-04 Inventur-Schema (a-f plus Duplikat/Variante/legitim-getrennt-Klassifikation) auf Status-/Label-Darstellung und Benachrichtigung/Hinweise angewendet"
    - "Zusätzliches Prüfkriterium eingeführt: für jede gefundene Duplikat-Komponente/-Datei wurde geprüft, ob sie überhaupt von Produktionscode importiert wird (nicht nur von ihrer eigenen Testdatei) — deckte 3 tote Parallel-Implementierungen auf (segmenteTabUtils.ts, ReleaseVersionMediaGallery.tsx, MessageToast.tsx)"
    - "Grep-reproduzierbare count-*.sh-Skripte pro Fachaufgabe als Analyse-Nachweis (kein Live-Stack-Zugriff)"

key-files:
  created:
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/11-status-label-darstellung.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-11-status-label-darstellung.sh
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/12-benachrichtigung-hinweise.md
    - .planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-12-benachrichtigung-hinweise.sh
  modified: []

key-decisions:
  - "F-02 (getTypeBadgeLabel-OUTRO-Bug) durch eigenen Code-Vergleich erneut bestätigt (SegmenteTab.helpers.tsx:20 'OUT' vs. segmenteTabUtils.ts:8 'PV'); zusätzlich festgestellt, dass segmenteTabUtils.ts komplett totes Produktionscode ist — nur von der eigenen Testdatei importiert, kein Produktions-Importeur"
  - "2 neue same-input-different-output-Funde im selben Muster wie F-02: Fansub-Medien-Kategorie-Label (old_website/irc_chat-Textabweichung zwischen Admin-Grid und öffentlichem Block) und Claim-Status-Label ('verified' -> 'Verifiziert' vs. 'Genehmigt' zwischen UserClaimsTab.tsx und ClaimsClient.tsx) — beide NICHT gemergt, als unentschiedene Befunde dokumentiert"
  - "App-User-Konten-Status-Label (statusLabel/statusVariant) existiert byte-identisch in 4 Dateien — RoleHoldersTable.tsx dokumentiert die Duplikation bereits selbst im Code-Kommentar als bewusst, aber nicht konsolidiert"
  - "Dashboard-Attention: alle 4 attachPending*-Funktionen gegen den aktuellen Code (nicht nur gegen 174-BUGS.md) re-verifiziert — 0 neue Anzeige/Durchsetzung-Rechte-Abweichungen, BUG-174-02-Fix hält; die aus data/04 bekannte fehlende Beiträge-Attention-Lane ist unverändert (Vollständigkeits-Lücke, kein Rechte-Fehler)"
  - "Kein zentrales Toast-System im Frontend vorhanden (0 Treffer für useToast/ToastProvider/pushToast/addToast); 48 Dateien implementieren Erfolgs-/Fehlermeldungen ad-hoc über ein errorBox/successBox-CSS-Klassen-Muster, mit 2 widersprüchlichen Auto-Dismiss-Timern (4000ms vs. 1800ms) und mehrheitlich gar keinem Auto-Dismiss"
  - "MessageToast.tsx ist eine dritte tote Parallel-Implementierung (nach segmenteTabUtils.ts und ReleaseVersionMediaGallery.tsx) — eine vollständig ausgearbeitete Toast-Komponente, die nie in eine Seite eingebunden wurde"
  - "Genau 1 Mail-Typ im gesamten Backend (Fansub-Gruppen-Einladung), bereits Phase-135-gehärtet (HTML-Escaping, CRLF-Schutz, Fail-closed-Stornierung bei Versandfehler) — kein zweiter, ungehärteter Mail-Typ gefunden (expliziter Negativbefund)"

requirements-completed: []

# Metrics
duration: ~50min
completed: 2026-10-07
---

# Phase 175 Plan 06: Inventur Fachaufgabe 11+12 (Status-/Label-Darstellung, Benachrichtigung/Hinweise) Summary

**Bestätigt den F-02-OUTRO-Bug durch eigenen Code-Vergleich und findet zwei weitere same-input-different-output-Label-Abweichungen (Fansub-Medien-Kategorie, Claim-Status) sowie drei tote Parallel-Implementierungen (segmenteTabUtils.ts, ReleaseVersionMediaGallery.tsx, MessageToast.tsx); re-verifiziert alle vier Dashboard-Attention-Funktionen gegen den aktuellen Code (0 neue Rechte-Abweichungen, BUG-174-02-Fix hält) und deckt auf, dass kein zentrales Toast-System existiert — 48 Dateien duplizieren ein Ad-hoc-Erfolgs-/Fehlermeldungsmuster mit inkonsistentem Auto-Dismiss-Verhalten.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-10-07
- **Tasks:** 2/2 completed
- **Files created:** 4

## Accomplishments

- **Fachaufgabe 11 (Status-/Label-Darstellung):** 6 Label-Funktionsgruppen vollständig mit Datei:Zeile erfasst und wertweise verglichen:
  1. Segment-Typ-Badge (`getTypeBadgeLabel`) — F-02-Bug durch eigenen Code-Vergleich bestätigt (`SegmenteTab.helpers.tsx:20` liefert `'OUT'`, `segmenteTabUtils.ts:8` liefert `'PV'` für denselben OUTRO-Eingabewert); zusätzlich festgestellt, dass `segmenteTabUtils.ts` komplett totes Produktionscode ist.
  2. Fansub-Gruppenmedien-Kategorie-Label — neuer Fund: 2 von 8 Kategoriewerten (`old_website`, `irc_chat`) unterscheiden sich textlich zwischen Admin-Review-Grid und öffentlichem Block.
  3. Claim-Status-Label — neuer Fund: `claim.claim_status === 'verified'` liefert `'Verifiziert'` auf der Nutzerdetailseite, aber `'Genehmigt'` auf der zentralen Claims-Seite, für denselben Datensatz.
  4. App-User-Konten-Status-Label — 4 byte-identische Implementierungen (echtes Merge-Kandidat, kein Verhaltensrisiko).
  5. Release-Version-Medien-Review-State-Label — 2 byte-identische Implementierungen, wobei die zweite (`ReleaseVersionMediaGallery.tsx`) totes Produktionscode ist.
  6. Rollenlabel — korrekt zentralisiert über `roleCatalog.ts`, kein Duplikat (false positive, bestätigt bereits in `data/10-*.md` dokumentiertes Muster).
- **Fachaufgabe 12 (Benachrichtigung/Hinweise):** Alle 4 `attachPending*`-Dashboard-Attention-Funktionen (`attachPendingClaimAttention`, `attachPendingGroupMediaReviewAttention`, `attachPendingReleaseReviewAttention`, `attachPendingOwnNoteRevisionAttention`) gegen den aktuellen Code re-verifiziert — 0 neue Anzeige/Durchsetzung-Rechte-Abweichungen (BUG-174-02-Fix hält, die aus `data/04-*.md` bekannte Lücke bei Beiträgen ist unverändert kein Rechte-Fehler). Toast-Infrastruktur-Recherche ergab: kein zentraler Toast-Hook/-Provider existiert, 48 Dateien duplizieren ein `errorBox`/`successBox`-Ad-hoc-Muster mit 2 widersprüchlichen Auto-Dismiss-Timern (4000ms vs. 1800ms). Mail-Recherche ergab: genau 1 Mail-Typ im Backend (Fansub-Einladung), bereits Phase-135-gehärtet, kein zweiter ungehärteter Typ existiert.
- Beide reproduzierbaren Zähl-Skripte (`count-11-*.sh`, `count-12-*.sh`) laufen fehlerfrei und liefern exakt dieselben Zahlen wie in den Fragment-Dateien dokumentiert.

## Task Commits

| Task | Commit | Files |
|---|---|---|
| 1: Fachaufgabe 11 Inventur | `909bb6d4` | `data/11-status-label-darstellung.md`, `scripts/count-11-status-label-darstellung.sh` |
| 2: Fachaufgabe 12 Inventur | `a6fcd2eb` | `data/12-benachrichtigung-hinweise.md`, `scripts/count-12-benachrichtigung-hinweise.sh` |

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria were met: Task 1 documents the F-02 OUTRO bug via independent code comparison plus 3 additional label-function groups (Review-Status via Claim/Release-Media, Rollenlabels, Kategorie-Labels) all with Datei:Zeile; every found behavioral deviation is documented as a standalone, undecided finding rather than a blind merge proposal. Task 2 documents the group-media, contribution, and member-request (claim) attention functions with separately-named display vs. enforcement rights actions and Datei:Zeile; every found deviation (in this case: 0 new rights deviations, but 1 confirmed pre-existing completeness gap) is documented as a named, unresolved finding per D-01/D-05.

## Known Stubs

None — this is a pure analysis/inventory plan producing markdown documentation and grep-based shell scripts; no application code, UI, or stub data paths were touched.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes were introduced. The one STRIDE register entry (T-175-06, Elevation-of-Privilege-documented-not-fixed) in the plan's threat model was satisfied by documenting the dashboard-attention rights re-verification in `data/12-benachrichtigung-hinweise.md` (0 new deviations found, consistent with the register's "mitigate via documentation" disposition — no code fix performed, per D-01).

## Self-Check: PASSED

- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/11-status-label-darstellung.md`
- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-11-status-label-darstellung.sh` (executable, runs clean, numbers match)
- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/data/12-benachrichtigung-hinweise.md`
- FOUND: `.planning/phases/175-inventur-doppelungen-nach-fachaufgaben-pro-fachaufgabe-alle-/scripts/count-12-benachrichtigung-hinweise.sh` (executable, runs clean, numbers match)
- FOUND: commit `909bb6d4` in `git log --oneline`
- FOUND: commit `a6fcd2eb` in `git log --oneline`
- Verified `git status --short` shows no modifications under `frontend/`, `backend/`, `database/`, `shared/`, or `.planning/sketches/` — only the four new files under `data/`/`scripts/` of this phase directory (now committed) plus the pre-existing, untouched `sketches/MANIFEST.md`/`010-galerie-detailansicht/` changes that predate this session.
