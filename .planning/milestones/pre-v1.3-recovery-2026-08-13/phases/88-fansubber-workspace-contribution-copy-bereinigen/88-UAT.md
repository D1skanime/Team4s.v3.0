---
status: complete
phase: 88-fansubber-workspace-contribution-copy-bereinigen
source: [88-01-SUMMARY.md, 88-02-SUMMARY.md, 88-03-SUMMARY.md]
started: 2026-06-19
updated: 2026-06-21
---

## Current Test

[testing complete]

## Tests

### 1. Layout (Mobile 375px + Desktop)
expected: Auf allen 5 Routen brechen Header, Tabs, Badges, Release-Buttons, Modals und Form-Actions bei 375px und Desktop ohne horizontalen Overflow um; Release-Workspace zeigt globalen Page-Header + Tab-Muster sauber.
result: pass
note: Layout ok. Beobachtung (out-of-scope, Folge-Thema): /me/releases/[versionId]/workspace nutzt noch nicht durchgängig das globale Design-System (@/components/ui).

### 2. Keine Claim/Credit-Sprache (Live-Read)
expected: Sichtbare Runtime-UI vermeidet Eigentums-Wording wie "mein Beitrag", "ich habe bei dem Anime mitgemacht", "Claim", "Credit-Claim", "Beitragsprüfung", "Prüffall". Erlaubt sind nur Aussagen wie "Ich war in diesem Projekt dabei", Gruppen-Teilnahme, Identitäts-Verknüpfung oder Projekt-Hinweise, die Team4s prüft. (Statischer Copy-Grep bereits bestanden.)
result: pass
note: Live-Read ok. Während Test 2 zusätzlich aufgeräumt — doppelter "Hinweis senden"-Button (PageHeader-ReportModal entfernt, 6f590f19) und "Überblick & Filter"-Card (nur bei genug Daten, kompakt eingeklappt, nach unten, 64a1e369).

### 3. Routing-Korrektheit
expected: Release-Aktionen aus "Meine Gruppen" (/admin/my-groups/[id]) führen zu /me/releases/[versionId]/workspace. Breadcrumb/Action im Workspace führt zurück zu /me/contributions mit sichtbarem Label "Meine Projekte".
result: pass

### 4. Auth-Refresh-Session
expected: Ohne Access-Token aber mit gültiger Refresh-Session zeigen geschützte Seiten keine ausgeloggte UI; der zentrale API-Client führt den Refresh-Pfad aus. UI-Code übergibt keine authToken-Props. (Statischer authToken-Grep bereits bestanden.)
result: pass

### 5. Modal / Tastatur / Touch
expected: Auf /me/contributions und /me/profile sind Hinweis-Modal und Identity-Link-Form per Tastatur und Touch bedienbar. Fokus bleibt im Modal, Escape schließt (wo vom Shared-Modal unterstützt), Submit-Buttons zeigen neutrale Copy wie "Hinweis senden" oder "Das bin ich".
result: pass

### 6. Leer- und Disabled-States
expected: Bei "keine Gruppe", "keine Mitgliedschaft", "keine Media-Rechte", "keine Notes-Rechte" und "fehlendes Member-Profil" erklären die Zustände die genaue Einschränkung, ohne Credits oder sofortigen Beweis zu suggerieren. Frühere Gruppen sind nur Kontext und gewähren keine Gruppenrechte.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Release-Workspace nutzt globales Design-System"
  status: observed
  reason: "UAT Test 1: /me/releases/[versionId]/workspace ist noch nicht durchgängig auf @/components/ui migriert (vom Nutzer beim Approven angemerkt)."
  severity: minor
  test: 1
  scope: out-of-phase-88 (Folge-Quick-Task)
