---
status: complete
phase: 65-member-vorschlaege-review-queue
source: [65-VERIFICATION.md]
started: 2026-06-02T17:18:00Z
updated: 2026-06-02T18:12:59+02:00
---

## Current Test

[testing complete]

## Tests

### 1. Anime-Typeahead im ProposalForm im Browser testen
expected: Eingabe ab 2 Zeichen liefert Ergebnisse für reale Anime aus der Datenbank; kein leerer Dropdown bei vorhandenen Titeln. `searchAnimeForProposal` nutzt den öffentlichen `/api/v1/anime`-Endpunkt.
result: pass
observed: Live-Browser-UAT auf `/me/contributions`: Modal geöffnet, Gruppe `AnimeOwnage` geladen, Eingabe `Na` zeigte `Naruto`, Auswahl war möglich.

### 2. SelfPublish-Sichtbarkeit auf Anime-Seite prüfen
expected: Nach 90-Tage-Selbstschaltung erscheint der Beitrag auf der öffentlichen Anime-Seite als unverifizierter historischer Beitrag und nicht identisch wie ein Leader-bestätigter Beitrag.
result: pass
observed: Testvorschlag wurde auf 91 Tage zurückdatiert, `Historisch öffentlich schalten` wurde sichtbar, zweistufig bestätigt und danach auf `/anime/3` als `(historisch)` mit Rolle `Übersetzung` angezeigt. Status blieb `proposed`; öffentliche Sichtbarkeit wurde gesetzt.

### 3. Review-Queue-UX als Leader testen
expected: Der echte Leader-Flow startet in `/admin/fansubs/[id]/edit`; dort zeigt der Gruppen-Edit-Bereich einen Tab `Vorschläge` mit der Sektion `Offene Vorschläge` und Bestätigen/Ablehnen-Aktionen. Aktionen aktualisieren die Liste optimistisch; bestätigte/abgelehnte Einträge verschwinden ohne Seitenwechsel; Inline-Ablehnen-Expansion funktioniert.
result: pass
observed: Live-UAT fand zunächst den falschen Produktpfad `/admin/my-groups/[id]`. Entscheidung dokumentiert: Phase-65-Review gehört in `/admin/fansubs/[id]/edit`. Nach Fix zeigte `/admin/fansubs/88/edit` den Tab `Vorschläge` mit `Offene Vorschläge`. `Bleach` wurde bestätigt und verschwand aus der Queue; `Death Parade` wurde über Inline-Ablehnung mit Notiz abgelehnt und verschwand ebenfalls. API lieferte danach nur noch den weiterhin offenen Naruto-Vorschlag.

### 4. me/contributions Modal-Flow als Member testen
expected: Sektion sichtbar; `+ Beitrag vorschlagen` öffnet Modal ohne Seitenwechsel; Gruppen-Dropdown befüllt; 90-Tage-Hinweis sichtbar; Duplikat ergibt 409 mit deutschem Fehlertext; Status-Gruppierung sichtbar; neuer Vorschlag erscheint in `In Prüfung`.
result: pass
observed: `/me/contributions` zeigte den Vorschlagsbereich. Das Modal öffnete ohne Seitenwechsel, `AnimeOwnage` war im Gruppendropdown, der 90-Tage-Hinweis war sichtbar, Naruto-Vorschlag erschien in `In Prüfung`, und ein zweiter identischer Submit zeigte den deutschen 409-Fehlertext.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Live Findings Closed

- `ReviewQueue` war technisch erreichbar, aber zunächst nicht im echten Leader-Flow. Behoben durch Integration als Tab `Vorschläge` in `/admin/fansubs/[id]/edit`.
- `ListProposedByGroup` verwendete nicht existierende Live-Schema-Spalten (`hist_fansub_group_members.display_name`, `anime.title_romaji`). Behoben durch vorhandene Schemafelder `members.display_name`/`members.nickname` und `anime.title_de`/`anime.title_en`/`anime.title`.
- Der gemeinsame Codex-in-app-Browser-Flow ist als Arbeitsregel in `AGENTS.md` dokumentiert; der Route-Ownership-Entscheid steht in `DECISIONS.md`.

## Regression Smoke

- `/admin/fansubs/88/edit`: Tabs `Grunddaten`, `Medien`, `App-Mitglieder`, `Hist. Mitglieder`, `Rollen/Timeline`, `Vorschläge`, `Anime-Beiträge`, `Anime & Veröffentlichungen` geladen.
- Ergebnis: keine sichtbaren Fehlerzustände und keine 5xx-Netzwerkantworten im Smoke.

## Gaps

[none]
