---
status: pending
phase: 183-status-label-konsolidierung-fachaufgabe-11-eine-kanonische-i
source: [183-03-PLAN.md Task 2]
started: 2026-10-15T09:22:00Z
updated: 2026-10-15T09:22:00Z
approved_by: null
---

## Current Test

### 1. D-04 — Vorher/Nachher-Vergleich der 6 Referenz-URLs

expected: Punkte 1, 3, 6 unveraendert zu vorher. Punkt 2 zeigt „Genehmigt" statt „Verifiziert"
fuer Claim id=1 (claim_status='verified') auf `/admin/users/2`. Punkt 4 zeigt weiterhin
„Genehmigt" fuer denselben Claim auf `/admin/claims`, zusaetzlich deutsches Label fuer
eventuell vorhandene 'active'/'open'/'denied'-Claims. Punkt 5 zeigt „Alte Website" statt
„Alte Webseite" fuer Medium id=21 (Kategorie `old_website`) auf
`/admin/fansubs/1/edit`. Keine Browser-Konsolenfehler auf allen sechs Seiten.

result: **noch offen — wartet auf explizite Nutzerfreigabe ("approved") oder
Abweichungsbeschreibung.**

Ueber den SSH-Tunnel unter `http://127.0.0.1:3300` folgende sechs URLs pruefen:

1. `http://127.0.0.1:3300/admin/users` — Gruppe 4, Liste. Erwartung: unveraendert.
2. `http://127.0.0.1:3300/admin/users/2` — App-User „D1sk" (id=2). Kopfbereich +
   Tab „Uebersicht": unveraendert. Tab „Mitgliedsanfragen", Claim id=1
   (claim_status='verified'): MUSS „Genehmigt" statt „Verifiziert" zeigen.
3. `http://127.0.0.1:3300/admin/roles` — Gruppe 4, Rolleninhaber-Tabelle. Erwartung:
   unveraendert.
4. `http://127.0.0.1:3300/admin/claims` — Gruppe 3, Claim id=1 (app_user_id=2).
   Erwartung: weiterhin „Genehmigt". Zusaetzlich pruefen: existiert ein Claim mit
   claim_status 'active', 'open' oder 'denied' — falls ja, MUSS er jetzt ein
   deutsches Label zeigen statt des rohen englischen Werts.
5. `http://127.0.0.1:3300/admin/fansubs/1/edit` — Fansub-Gruppe „new-subs" (id=1),
   Medien-Tab, Medium id=21 mit Kategorie `old_website`. MUSS „Alte Website" statt
   „Alte Webseite" zeigen.
6. `http://127.0.0.1:3300/fansubs/new-subs` — oeffentliche Galerie, Referenzwert fuer
   dasselbe `old_website`-Medium. Erwartung: weiterhin „Alte Website"
   (Regressionsschutz, nutzte bereits vorher `fansub-labels.ts`).

Zusaetzlich: keine Browser-Konsolenfehler auf den sechs Seiten. Hinweis aus
183-CONTEXT.md: aktuell existiert kein `irc_chat`-Datensatz in
`fansub_group_media` und kein App-User mit Status `pending`/`disabled` — fuer
diese Werte wird die Mapping-Tabelle im Code verglichen, nicht ein echter
Datensatz.

## Tests

_(keine abgeschlossen — Checkpoint ist offen)_

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

Keine bekannt — der Checkpoint wurde noch nicht durchlaufen.

## Resume-Signal

**Ausstehend.** Der Nutzer tippt "approved", wenn alle 6 Punkte wie oben beschrieben
bestehen, oder beschreibt exakt, welche URL/welches Verhalten abweicht. Bis dahin
gelten Plan 183-03 und Phase 183 als NICHT abgeschlossen.
