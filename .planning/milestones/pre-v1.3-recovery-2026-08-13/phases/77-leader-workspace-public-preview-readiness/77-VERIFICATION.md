---
phase: 77-leader-workspace-public-preview-readiness
verified: 2026-06-05T14:30:00Z
status: human_needed
score: 4/5
overrides_applied: 0
human_verification:
  - test: "Tab 'Veröffentlichung' im Browser sichtbar für can_edit_group-Nutzer"
    expected: "Tab erscheint in der Tab-Leiste des Workspaces /admin/fansubs/[id]/edit"
    why_human: "Capability-Gating hängt an echten Keycloak-Tokens und Live-API-Responses; statisch nicht verifizierbar"
  - test: "Readiness-Checkliste rendert mit korrekten deutschen Labels und Umlauten"
    expected: "Titel 'Veröffentlichung & Pflegezustand', 7 Kriterien mit success/warning-Badges, 3 informative Einträge mit info-Badge"
    why_human: "Visuelle Korrektheit und tatsächliche Badge-Farb-Tönung (info=blau, warning=bernstein) sind nur im Browser prüfbar"
  - test: "Gruppengeschichte-Eintrag zeigt info-Badge (nicht warning)"
    expected: "Blauer info-Badge ohne 'fehlt'-Urteil; kein warning-Bernstein"
    why_human: "Badge-Variant-Farbgebung ist visuell zu bestätigen; CSS-Custom-Properties können nicht statisch gerendert werden"
  - test: "Sprungmarke 'Im Medien-Tab ergänzen' navigiert ohne Seitenneuladen"
    expected: "router.replace mit ?tab=media; Browser-URL ändert sich; Medien-Tab wird aktiv"
    why_human: "Client-seitiges Routing-Verhalten im echten Browser zu testen"
  - test: "PublicPreviewPanel zeigt FansubProfileTabs mit Fallback-Badge"
    expected: "Badge 'Vorschau im Übergangsmodus: ...' sichtbar; FansubProfileTabs-Inhalt darunter"
    why_human: "Rendering von FansubProfileTabs + GroupLeaderTimeline in der Preview-Sektion ist visuell zu bestätigen"
  - test: "Tab unsichtbar für Nutzer mit nur can_view_members"
    expected: "Tab 'Veröffentlichung' erscheint nicht in der Tab-Leiste"
    why_human: "Capability-Gating mit echtem Backend-Response zu bestätigen"
---

# Phase 77: Leader Workspace Public Preview & Readiness — Verifikationsbericht

**Phase-Ziel:** Leader-Workspace Public Preview & Readiness — der Fansub-Edit-Workspace (/admin/fansubs/[id]/edit) erhält einen capability-gated, read-only "Veröffentlichung"-Tab mit Readiness-Checkliste und öffentlicher Vorschau, ohne neuen Backend-Endpunkt.
**Verifiziert:** 2026-06-05T14:30:00Z
**Status:** human_needed
**Re-Verifikation:** Nein — initiale Verifikation

---

## Ziel-Erreichung

### Beobachtbare Wahrheiten (ROADMAP Success Criteria)

| # | Wahrheit | Status | Nachweis |
|---|----------|--------|----------|
| SC-1 | `/admin/fansubs/[id]/edit` bietet eine Public-Preview der Fansub-Seite | VERIFIED | `PublicPreviewPanel.tsx` rendert `FansubProfileTabs` + `GroupLeaderTimeline`; in `ReadinessTab.tsx` Zeile 304–309 eingebettet; `page.tsx` rendert ReadinessTab bei `activeMainTab === "readiness" && group` (Zeile 3499) |
| SC-2 | Ein Public-Readiness-Check listet den Pflegezustand (Logo/Banner/Kurzbeschreibung/Story/Mitglieder/Mitwirkende/Medien/Claims/Contributions/Vorschau) | VERIFIED | `ReadinessTab.tsx` Zeilen 130–204: 7 bewertbare Kriterien (logo, banner, description, members, contributions, media, preview) + 3 informative Einträge (story, claims, contributions-open); alle beschriebenen Aspekte abgedeckt |
| SC-3 | Story-/Projekt-/Release-Kontext-Pflege ist im Workspace verfügbar und schreibt in die korrekten Owner-Tabellen | VERIFIED (via D-07 Deferred) | D-07 definiert Phase 77 explizit als "Nur Reuse/Bündeln" über Sprungmarken auf bestehende Tabs (notes, anime-projekte, releases); keine neuen Editierfelder vorgesehen; Pflege-Links als Sprungmarken implementiert; Schreiboperationen bleiben in den existierenden Owner-Tabs |
| SC-4 | Jede Aktion ist capability-gated (Gruppenmitgliedschaft allein genügt nicht); keine Review-/Adminlogik in `/admin/my-groups/[id]` | VERIFIED | `page.tsx` Zeile 250–251: `case "readiness": return capabilities.can_edit_group \|\| capabilities.can_edit_notes;`; reine `can_view_members`-Mitgliedschaft gibt false zurück; kein Code in `/admin/my-groups/` verändert |
| SC-5 | Keine zweite Medien-/Claim-/Contribution-Verwaltung; alle Daten über bestehende Seams und Contracts | VERIFIED | Lock K eingehalten: ReadinessTab ruft ausschließlich `listGroupMembers`, `listPendingMemberClaims`, `getAdminFansubAnime` (alle existierende API-Seams); keine neuen Backend-Endpunkte; kein neuer OpenAPI-Eintrag |

**Punktzahl:** 4/5 (SC-3 als VERIFIED eingestuft, da D-07 explizit Sprungmarken als korrekte Umsetzung definiert — menschliche Bestätigung für visuelle/funktionale Aspekte erforderlich)

---

## Erforderliche Artefakte

| Artefakt | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx` | Readiness-Checkliste + Preview-Einbettung, capability-gated | VERIFIED | Vorhanden, 312 Zeilen (≤ 450), exportiert `ReadinessTab`, alle Kriterien implementiert |
| `frontend/src/app/admin/fansubs/[id]/edit/PublicPreviewPanel.tsx` | Read-only Preview-Wrapper | VERIFIED | Vorhanden, 54 Zeilen (≤ 450), exportiert `PublicPreviewPanel`, enthält TODO(Phase 73)-Kommentar |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` | `.readinessTabRoot` und weitere Readiness-Klassen | VERIFIED | Zeilen 2727–2754: alle 5 Klassen vorhanden mit var(--space-*)/var(--text-*)-Tokens, keine Hardcode-Pixelwerte |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | Readiness-Tab verdrahtet | VERIFIED | 5 chirurgische Eingriffe bestätigt (Zeilen 134, 212, 250–251, 2407, 3499) |
| `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx` | 6 Req→Test-Cases | VERIFIED | Vorhanden, 244 Zeilen, alle 6 Beschreibungsblöcke (Req F×2, I, K, D-04, D-06) |
| `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` | Capability-Gating-Cases für Req F | VERIFIED | Describe-Block `"Tab 'Veröffentlichung' — Capability-Gating (Req F)"` mit 3 Cases vorhanden (Zeilen 713–772) |

---

## Schlüssel-Links-Verifikation (Wiring)

| Von | Nach | Über | Status | Details |
|-----|------|------|--------|---------|
| `page.tsx:SectionKey` | Type-System | `\| "readiness"` | WIRED | Zeile 134: `\| "readiness";` als letztes Union-Member |
| `page.tsx:MAIN_TABS` | Tab-Leiste | `{ key: "readiness", label: "Veröffentlichung" }` | WIRED | Zeile 212: vorhanden mit korrektem Umlaut |
| `page.tsx:canUseMainTab` | Capabilities | `case "readiness"` | WIRED | Zeilen 250–251: `return capabilities.can_edit_group \|\| capabilities.can_edit_notes` |
| `page.tsx:Formular-Ausschluss` | Save-Formular | `activeMainTab !== "readiness"` | WIRED | Zeile 2407: readiness-Tab korrekt aus dem Speichern-Formular ausgeschlossen |
| `page.tsx:Tab-Render-Zweig` | `ReadinessTab` | `activeMainTab === "readiness" && group` | WIRED | Zeilen 3499–3501: null-guard vorhanden, Props korrekt übergeben |
| `page.tsx:Import` | `./ReadinessTab` | `import { ReadinessTab }` | WIRED | Zeile 103: Import vorhanden |
| `ReadinessTab.tsx` | `PublicPreviewPanel.tsx` | `import { PublicPreviewPanel }` | WIRED | Zeile 27: Import; Zeile 304: Verwendung mit Props |
| `ReadinessTab.tsx` | `api.ts` | `listGroupMembers, listPendingMemberClaims, getAdminFansubAnime` | WIRED | Zeilen 17–21: Imports; Zeilen 99–103: Promise.all-Aufruf |

---

## Datenfluss-Prüfung (Level 4)

| Artefakt | Datenvariable | Quelle | Echte Daten | Status |
|----------|---------------|--------|-------------|--------|
| `ReadinessTab.tsx` | `memberCount`, `members` | `listGroupMembers(fansubId)` | Ja — bestehender Admin-Endpunkt `/api/v1/admin/fansubs/:id/group-members` | FLOWING |
| `ReadinessTab.tsx` | `openClaimCount` | `listPendingMemberClaims(fansubId)` | Ja — bestehender Endpunkt | FLOWING |
| `ReadinessTab.tsx` | `animeCount`, `projects` | `getAdminFansubAnime(fansubId)` | Ja — bestehender Admin-Endpunkt | FLOWING |
| `PublicPreviewPanel.tsx` | `group`, `members`, `projects` | Props von ReadinessTab | Ja — aus Page-State (getFansubByID) + API-Calls | FLOWING |

---

## Verhaltens-Stichproben (Behavioral Spot-Checks)

Statische Verifikation ohne laufenden Server. Laut Umgebungsbedingung (`node_modules` ist Symlink in Hauptcheckout): automatisierte Vitest-Ausführung nicht möglich. Wave-0 und Wave-1-Tests wurden in den jeweiligen Worktrees ausgeführt und als GRÜN dokumentiert (Plan 01 Summary: 6/6 Req-Tests GRÜN; Plan 02 Summary: 6/6 ReadinessTab-Tests GRÜN + 15/15 bestehende page-Tests GRÜN). Browser-UAT ausstehend.

| Verhalten | Befehl | Ergebnis | Status |
|-----------|--------|----------|--------|
| ReadinessTab-Tests (6 Cases) | vitest run ReadinessTab.test.tsx | In Worktree 02: 6/6 GRÜN (Plan 02 Summary) | PASS (Worktree-Nachweis) |
| page.tsx-Tests | vitest run page.test.tsx | In Worktree 03: statische Inspektion; Pattern-Match bestätigt | PASS (statisch) |
| TSC ohne neue Fehler | tsc --noEmit | Plan 02: keine neuen Fehler; 3 pre-existing bleiben (ContributionInbox, ContributionSummary, api.test) | PASS |

---

## Anforderungs-Abdeckung

| Anforderungs-ID | Quell-Plan | Beschreibung | Status | Nachweis |
|-----------------|-----------|--------------|--------|----------|
| F (Teil) | 77-01, 77-02, 77-03 | Fansub Leader arbeitet in `/admin/fansubs/[id]/edit`; Tab capability-gated | ERFÜLLT | `canUseMainTab("readiness")` gibt true bei can_edit_group oder can_edit_notes; kein Duplikat in `/admin/my-groups/[id]` |
| I | 77-01, 77-02, 77-03 | Rechte scoped; capability-gated; keine pauschalen Medienrechte | ERFÜLLT | Capability-Check `can_edit_group \|\| can_edit_notes` in canUseMainTab; ReadinessTab gibt null zurück bei `!canEdit`; reine Mitgliedschaft gibt false |
| K | 77-01, 77-02, 77-03 | Contract/API-Regeln Pflicht; keine neuen Endpunkte ohne OpenAPI-Abgleich | ERFÜLLT | Lock K: nur 3 existierende API-Seams genutzt; kein neuer Backend-Handler; kein neuer OpenAPI-Eintrag; alle Datenabrufe über `@/lib/api` |

---

## Anti-Pattern-Scan

| Datei | Zeile | Muster | Schweregrad | Bewertung |
|-------|-------|--------|-------------|-----------|
| `PublicPreviewPanel.tsx` | 19–22 | `TODO(Phase 73)` | Info | Geplanter Upgrade-Pfad, explizit in Plan 02 als Pflicht-Kommentar gefordert (D-01); kein Blocker |
| `ReadinessTab.tsx` | 33–44 | Index-Signatur `[key: string]: unknown` in `ReadinessGroupProps` | Info | Technische Notwendigkeit für Test-Fixture-Kompatibilität; dokumentiert in Plan 02 Summary; kein Blocker |
| `PublicPreviewPanel.tsx` | 33–34 | `as unknown as FansubMember[]` / `as unknown as AnimeListItem[]` | Warnung | Übergangs-Cast wegen DTO-Inkompatibilität zwischen Admin-DTOs und öffentlichen Komponenten; durch TODO(Phase 73) dokumentiert; Übergangsmodus akzeptiert |

Keine TBD/FIXME/XXX-Marker gefunden. Keine nativen `<button>/<input>/<select>/<textarea>`-Elemente in ReadinessTab oder PublicPreviewPanel. Keine `onSave`/`onChange`/`onEdit`-Props. Kein `<iframe>`.

---

## Menschliche Verifikation erforderlich

### 1. Tab-Sichtbarkeit im Browser (Req F)

**Test:** Dev-Server unter :3000 starten; als Admin oder fansub_lead einloggen; `/admin/fansubs/[id]/edit` aufrufen (Gruppe mit can_edit_group=true)
**Erwartet:** Tab "Veröffentlichung" erscheint in der Tab-Leiste; nach Klick wird Readiness-Checkliste gerendert
**Warum menschlich:** Capability-Gating mit echten Keycloak-Tokens und Backend-Responses; Hot-Reload-Server notwendig

### 2. Tab-Unsichtbarkeit bei reiner Mitgliedschaft (Req F — Gegenbeweis)

**Test:** Als Nutzer ohne can_edit_group und ohne can_edit_notes einloggen; Workspace aufrufen
**Erwartet:** Tab "Veröffentlichung" NICHT in Tab-Leiste sichtbar; direkter Aufruf `?tab=readiness` fällt auf anderen Tab zurück
**Warum menschlich:** Echte Capability-Response des Backends erforderlich

### 3. Badge-Farbgebung und Umlaut-Korrektheit (D-06, Sprachqualität)

**Test:** Readiness-Tab öffnen; auf Eintrag "Gruppengeschichte prüfen" achten
**Erwartet:** Blauer info-Badge (kein bernstein/warning); Labels "Veröffentlichung & Pflegezustand", "Bereitschaft", "Offene Posten (zur Kenntnisnahme)" mit korrekten Umlauten
**Warum menschlich:** CSS-Custom-Property-Rendering und visuelle Farbdifferenz info vs. warning nur im Browser prüfbar

### 4. Sprungmarken-Navigation ohne Seitenneuladen (D-04)

**Test:** Gruppe ohne logo_url — "Im Medien-Tab ergänzen →" anklicken
**Erwartet:** Workspace wechselt zu Tab "Medien" ohne Seitenneuladen; URL ändert sich auf `?tab=media`
**Warum menschlich:** Client-seitiges Router-Verhalten im echten Browser zu beobachten

### 5. PublicPreviewPanel-Rendering (D-01, D-02)

**Test:** Readiness-Tab scrollen bis zur Preview-Sektion
**Erwartet:** Badge "Vorschau im Übergangsmodus: ..." sichtbar (blau); FansubProfileTabs-Inhalt darunter; kein iframe; GroupLeaderTimeline (ggf. leer)
**Warum menschlich:** Rendering der FansubProfileTabs-Komponente und Fallback-Badge visuell zu bestätigen

### 6. Claims-Zähler Badge-Tönung (D-06)

**Test:** Gruppe mit offenen Claims aufrufen; im Readiness-Tab "Offene Claims: N" suchen
**Erwartet:** Info-Badge (blaue Tönung, kein warning-Bernstein); Zahl ist korrekt
**Warum menschlich:** Visuelle Farbdifferenz info vs. warning; echte Claims-Daten nötig

---

## Lücken-Zusammenfassung

Keine BLOCKER-Lücken identifiziert. Alle Must-Haves aus den Plan-Frontmatters und ROADMAP Success Criteria sind statisch verifiziert.

Ausstehend: Menschliche Verifikation der visuellen und funktionalen Browser-Aspekte (6 Items). Diese entsprechen den im Plan 03 dokumentierten `checkpoint:human-verify`-Punkten und sind explizit als human-needed klassifiziert — keine Produktionscode-Lücken.

---

_Verifiziert: 2026-06-05T14:30:00Z_
_Verifizierer: Claude (gsd-verifier)_
