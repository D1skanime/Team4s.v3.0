---
status: passed
phase: 63-fansub-contributions-leader-frontend
source: [63-01-SUMMARY.md, 63-02-SUMMARY.md, 63-03-SUMMARY.md, 63-VERIFICATION.md]
started: 2026-06-02T00:00:00Z
updated: 2026-06-02T16:54:00+02:00
---

# Phase 63 UAT

## Current Test

complete: all planned UAT cases passed in live browser/API verification.

## Tests

### 1. Tab-Navigation
expected: Fansub-Edit-Seite öffnen, alle drei neuen Tabs anklicken (Hist. Mitglieder, Rollen/Timeline, Anime-Beiträge). Jeder Tab zeigt eigenen Inhaltsbereich ohne Formular-Wrapper; deutsche Leerzustand-Texte bei leerer Gruppe sichtbar.
result: passed
evidence: Live Playwright flow reached `Hist. Mitglieder`, `Rollen/Timeline`, and `Anime-Beiträge` on `http://127.0.0.1:3000/admin/fansubs/88/edit`.

### 2. Mitglied anlegen ohne App-User
expected: Im Mitglieder-Tab "Mitglied hinzufügen" öffnen, Anzeigename eintragen, App-Nutzer-ID leer lassen, speichern. Mitglied wird gespeichert und erscheint in der Liste ohne App-Konto-Anzeige.
result: passed
evidence: Live flow created a temporary member (`status=historical`, `app_user_id=null`), verified it in UI/API, then deleted it during cleanup.

### 3. Rolleneintrag anlegen
expected: Im Rollen/Timeline-Tab Mitglied aus Dropdown wählen, Rollenkürzel eingeben, Jahr eintragen, speichern. Rolleneintrag erscheint in der chronologischen Liste (neueste zuerst).
result: passed
evidence: Live flow created a `leader` role for the temporary member with `started_year=2026`, verified it in UI/API, then deleted it during cleanup.

### 4. Anime-Beiträge-Modal
expected: Bearbeiten-Button bei einem Anime klicken, Mitglieder per Checkbox auswählen, Rollen-Chips hinzufügen, Sichtbarkeit und Status setzen, speichern. Anzahl Mitwirkende aktualisiert sich in der Tabelle; Defaults is_public=false und status=draft sind vorausgewählt.
result: passed
evidence: Live flow opened Naruto contribution modal, verified defaults `is_public_on_anime_page=false`, `is_public_on_member_profile=false`, `status=draft`, saved a confirmed public contribution, verified the count, then deleted it during cleanup.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Fixes Applied During UAT

- Aligned historical group member status/visibility fields with backend contract (`draft | historical | confirmed | disputed`, `internal | public`).
- Aligned member-role request payload with backend contract (`hist_fansub_group_member_id`, `source_note`, `visibility`).
- Filtered Rollen/Timeline choices to valid `group_history` role codes (`founder`, `leader`, `co_leader`, `project_lead`, `project_manager`).
- Normalized backend member-role PascalCase response rows in the frontend API client.
- Updated the page test to click the renamed `App-Mitglieder` tab.

## Live Verification

- URL: `http://127.0.0.1:3000/admin/fansubs/88/edit`
- Fansub: `88` (`AnimeOwnage`)
- Auth: real Keycloak token for `phase43-member`
- Screenshot: `C:/Users/admin/Documents/Team4s/tmp-phase63-uat.png`
- Cleanup: passed; no temporary UAT member, role, or contribution left behind.

## Gaps

- Browser console still reports unrelated missing/blocked media resources for an existing banner image; this did not affect Phase 63 UAT.
