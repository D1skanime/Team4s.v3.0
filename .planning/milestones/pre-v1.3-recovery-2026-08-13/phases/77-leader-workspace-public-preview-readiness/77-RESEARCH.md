# Phase 77: Leader Workspace – Public Preview & Readiness – Research

**Recherchiert:** 2026-06-05
**Domäne:** Next.js App Router – Workspace-Erweiterung, Capability-Gating, Read-only-Preview, Readiness-Checkliste
**Konfidenz:** HIGH (alle Kernbefunde direkt im Quellcode verifiziert)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions
- **D-01:** Inline-Rendering der Phase-73-Section-Komponenten (read-only) direkt im Workspace. KEIN `<iframe>`, KEIN reiner „Vorschau öffnen"-Link in neuen Browser-Tab.
- **D-02:** Preview zeigt exakte Besucher-Sicht — nur öffentlich + freigegebene Inhalte gemäß Phase-72-Achsen (Sichtbarkeit + Review).
- **D-03:** Eigener Tab im Workspace (z. B. „Veröffentlichung" / „Readiness"), der Preview UND Checkliste bündelt. Fügt sich in bestehende `MAIN_TABS`-Struktur ein.
- **D-04:** Checklisten-Punkte sind klickbare Sprungmarken auf den zuständigen Tab/Abschnitt (nutzt `MainTab`/`?tab=`-Routing).
- **D-05:** Readiness ist reiner Leitfaden, kein Gate. Kein neuer Publish-Toggle.
- **D-06:** Offene Claims/Contributions = nur informative Zähler mit Sprungmarke (read-only). Zählen NICHT gegen „bereit".
- **D-07:** Nur Reuse/Bündeln bestehender Kontext-Pflege. Keine neuen Editierfelder als Default. Falls echter Owner-Tabellen-Lücke vorhanden: minimal schließen.
- **D-08:** Capability-Gating aus bestehenden `FansubGroupCapabilities` ableiten. Kein neues Contract-Feld. Gruppenmitgliedschaft allein genügt nicht.

### Claude's Discretion
- Exakte Tab-Benennung/-Position in `MAIN_TABS`, konkrete Readiness-Kriterienliste und Schwellwerte, Empty-State-Texte, CSS-Modul-Struktur, ob Preview als Sub-Panel im selben Tab oder als eigener Sub-Reiter.
- Welche genaue Ableitung aus `FansubGroupCapabilities` die neuen Flächen gated (Composite vs. einzelne Capability) — Planner unter Lock K.
- Ob Phase-73-Sektionen direkt importiert oder über einen schlanken Preview-Wrapper konsumiert werden — Planner, solange read-only Besucher-Sicht gewahrt bleibt.

### Deferred Ideas (AUSSERHALB SCOPE)
- Hartes Readiness-Gate / Publish-Toggle (D-05).
- Besucher-Sicht + interne Marker in der Preview (D-02 wählt exakte Besucher-Sicht).
- Review-/Auflösungs-Aktionen für Claims/Contributions/Medien → Phase 78.
- Leader-Review-Logik in `/admin/my-groups/[id]`.
- Neue Medien-/Claim-/Contribution-Verwaltung.
- Reviewed Todos (Contribution-Dropdown, Credits-UI, Member-Profil UI, Contributor-Medien, Profile-Hub Redesign) — explizit ausgeschlossen.

</user_constraints>

<phase_requirements>
## Phase-Anforderungen

| ID | Beschreibung | Research-Unterstützung |
|----|--------------|------------------------|
| **F (Teil)** | Fansub Leader arbeitet in `/admin/fansubs/[id]/edit` — NICHT in `/admin/my-groups/[id]`; jede Aktion capability-gated | Workspace-Struktur vollständig verifiziert; Capability-Ableitung über `FansubGroupCapabilities` (12 Felder) dokumentiert |
| **I** | Rechte scoped denken; keine pauschale Mitgliedschaft als Adminfähigkeit | `hasFansubWorkspaceAccess` + `canUseMainTab` als Muster; neues Gating per Composite aus `can_edit_group`/`can_edit_notes` machbar ohne neues Contract-Feld |
| **K** | Contract/API-Disziplin: kein ad-hoc-Fetch, kein neuer Endpunkt ohne OpenAPI-/Frontend-/Backend-Abgleich | D-06/D-08 fordern keine neuen Endpunkte; Readiness-Zähler aus bestehenden List-Seams ableitbar |

</phase_requirements>

---

## Zusammenfassung

Phase 77 erweitert den bestehenden Workspace `/admin/fansubs/[id]/edit` um drei capability-gated Flächen, die **keine neuen Backend-Endpunkte und keine neuen OpenAPI-Contract-Felder erfordern**: (1) Public-Preview der Fansub-Seite als Inline-Read-only-Rendering, (2) Public-Readiness-Check mit klickbaren Sprungmarken und (3) Vergewisserung/Bündelung bestehender Kontext-Pflege-Sektionen.

**Kritische Abhängigkeit:** Phase 77 hängt logisch von Phase 73 ab — die Section-Komponenten der öffentlichen Fansub-Seite, die inline als Preview wiederverwendet werden sollen, müssen existieren. **Aktueller Stand (2026-06-05): Phase 73 ist geplant aber noch nicht ausgeführt.** Die öffentliche Fansub-Seite hat noch die alte Tab-Struktur (`FansubProfileTabs`), keine einzelnen Section-Komponenten. Dasselbe gilt für Phase 72 (kein `dispute_state`, kein `profile_status`, keine `review_statuses`-Tabelle in der aktuellen DB). Der Planner muss diese Abhängigkeitskette in der Wave-Struktur abbilden oder eine Fallback-Strategie (Preview als leichter Wrapper um `FansubProfileTabs` + `GroupLeaderTimeline`) definieren.

**Hauptempfehlung:** Neuer Tab „Veröffentlichung" in `MAIN_TABS`, gated durch Composite `can_edit_group || can_edit_notes`, als eigenständige Komponentendatei `ReadinessTab.tsx` (≤ 450 Zeilen). Preview als importierter Wrapper der bestehenden/Phase-73-Section-Komponenten. Readiness-Zähler aus bereits existierenden API-Seams: `listGroupMembers`, `listPendingMemberClaims`, `listClaimInvitations`, `listAnimeContributions`, `getAdminFansubAnime`. Keine neuen Backend-Aufrufe.

---

## Architektonische Verantwortungskarte

| Capability | Primäre Ebene | Sekundäre Ebene | Begründung |
|------------|--------------|-----------------|------------|
| Tab-Routing (`?tab=readiness`) | Browser / Client | — | `parseMainTab` / `resolveMainTabForAccess` sind Client-seitig in `page.tsx`; alle Tab-Wechsel über `useSearchParams`/`router.replace` |
| Capability-Gating des neuen Tabs | Browser / Client | — | `canUseMainTab` wertet `FansubGroupCapabilities` aus — bereits Client-seitig in `page.tsx` (kein neues Feld nötig) |
| Readiness-Zähler (Claims/Members/Contributions) | Browser / Client | API / Backend | Zähler aggregieren bestehende List-Seams im Client; Backend liefert rohe Listen ohne neue Endpunkte |
| Public-Preview (Section-Komponenten read-only) | Browser / Client | — | Preview-Wrapper importiert Fansub-Section-Komponenten (Phase 73 oder aktuelles FansubProfileTabs); Besucher-Sicht-Filterung durch Übergabe von `visibility='public'` / `review_status='approved'` als Props |
| Kontext-Pflege (Notes, Mitglieder, Release-Drawer) | Browser / Client | API / Backend | Bestehende Tab-Komponenten (`NotesTab`, `GroupMembersTab`, `ReleaseVersionMediaDrawerSummary`) bleiben in ihren Tabs; im Readiness-Tab nur Sprungmarken auf diese Tabs |
| Sprungmarken-Navigation (D-04) | Browser / Client | — | `router.replace(pathname + '?tab=claims')` — reine Client-Navigation über bestehendes URL-Muster |

---

## Standard-Stack

### Core
| Library | Version | Zweck | Warum Standard |
|---------|---------|-------|----------------|
| Next.js App Router | 16 | Client Components, Routing | Bestehend; gesamte Workspace-Logik ist bereits `'use client'` [VERIFIED: page.tsx Zeile 1] |
| React | 18.3.1 | State, Callbacks | Bestehend [VERIFIED: package.json] |
| TypeScript | bestehend | Typsicherheit | Ganzes Projekt |
| CSS Modules | Next.js eingebaut | Scoped Styles | Konvention; bestehend `FansubEdit.module.css` [VERIFIED: page.tsx Import] |
| `@/components/ui` | intern | Button, Card, Badge, Table, Tabs, … | PFLICHT per CLAUDE.md; bereits in allen Workspace-Komponenten verwendet [VERIFIED: GroupMembersTab.tsx, ClaimManagementPanel.tsx] |
| `lucide-react` | bestehend | Icons | Bereits importiert in page.tsx [VERIFIED: page.tsx Zeile 22–30] |

### Keine neuen externen Pakete
Phase 77 installiert keine neuen npm-Pakete.

---

## Package Legitimacy Audit

**Nicht anwendbar** — Phase 77 installiert keine externen Pakete.

---

## Architektur-Muster

### Systemarchitektur-Diagramm

```
Browser (Logged-in Leader / Admin)
│
│  GET /admin/fansubs/[id]/edit?tab=readiness
│
▼
FansubEditAccessGate
│  → getCurrentUser() → isPlatformAdmin?
│  → getFansubGroupCapabilities(fansubId)
│  → hasFansubWorkspaceAccess(capabilities)
│
▼
AdminFansubEditContent
│  → parseMainTab("readiness") → resolveMainTabForAccess(...)
│  → canUseMainTab("readiness", isPlatformAdmin, capabilities)
│     └── Gating: can_edit_group || can_edit_notes
│
▼  [Tab "Veröffentlichung" aktiv]
ReadinessTab (neue Datei, ≤ 450 Zeilen)
│
├── ReadinessChecklist
│   ├── Zähler aus listGroupMembers(fansubId)         → members.length > 0?
│   ├── Zähler aus listPendingMemberClaims(fansubId)  → offene Claims (D-06)
│   ├── Zähler aus listClaimInvitations(fansubId)     → offene Einladungen
│   ├── Zähler aus getAdminFansubAnime(fansubId)      → anime.length > 0?
│   ├── group.logo_url? / group.banner_url?           → bereits in Page-State
│   └── Sprungmarken → router.replace('?tab=media'), '?tab=claims', '?tab=mitglieder', …
│
└── PublicPreviewPanel (Inline-Rendering)
    ├── [Wenn Phase 73 ausgeführt]: importierte Section-Komponenten
    │   (FansubHeroSection, FansubStorySection, FansubHighlightsSection, …)
    └── [Fallback / Phase-73-nicht-ausgeführt]:
        FansubProfileTabs + GroupLeaderTimeline (bestehend)
        mit read-only-Props / Visibility-Filterung
```

### Empfohlene Projektstruktur (neue Dateien)

```
frontend/src/app/admin/fansubs/[id]/edit/
├── ReadinessTab.tsx          # Neuer Tab: Readiness-Checkliste + Preview (≤ 450 Zeilen)
├── ReadinessChecklist.tsx    # Optional: Checklisten-Komponente (falls ReadinessTab zu groß)
├── PublicPreviewPanel.tsx    # Optional: Preview-Wrapper (falls ReadinessTab zu groß)
└── FansubEdit.module.css     # Bestehend — neue CSS-Klassen hier ergänzen
```

`page.tsx` wird NICHT direkt modifiziert (außer dem Import von `ReadinessTab` und dem Einhängen in `MAIN_TABS`/`canUseMainTab`/Render-Zweig).

---

## Forschungsschwerpunkt 1: Phase-73-Section-Komponenten

### Aktueller Stand (VERIFIZIERT)

**Phase 73 ist geplant, aber noch nicht ausgeführt.** [VERIFIED: Dateisystem-Check 2026-06-05]

Der aktuelle Stand von `/fansubs/[slug]/page.tsx` (117 Zeilen) nutzt:
- `FansubProfileTabs` (241 Zeilen, `frontend/src/components/fansubs/FansubProfileTabs.tsx`) — tab-basierte Darstellung mit Tabs `overview / members / projects / archive / memories`
- `GroupLeaderTimeline` (47 Zeilen, `frontend/src/components/fansubs/GroupLeaderTimeline.tsx`) — Leader-Zeitleiste
- `ActiveFansubStory` (`frontend/src/components/fansubs/ActiveFansubStory.tsx`) — Story-Komponente
- `FansubVersionBrowser` (`frontend/src/components/fansubs/FansubVersionBrowser.tsx`)

Die in Phase 73 geplanten Section-Komponenten (Hero, Story, Highlights, Projekte, Team, Mitwirkende, Medien, Timeline, Deep-Dive) existieren noch **nicht** als eigenständige Dateien.

### Implikationen für Phase 77

D-01 fordert „Inline-Rendering der Phase-73-Section-Komponenten". Da Phase 73 noch nicht ausgeführt ist, gibt es zwei Optionen:

**Option A — Sequenzielle Abhängigkeit (empfohlen):** Phase 77 hängt explizit von Phase 73 ab. Im Plan stellt Wave 0 sicher, dass Phase 73 vollständig ausgeführt ist, bevor `ReadinessTab.tsx` die Section-Komponenten importiert. Der Preview-Wrapper importiert dann direkt die neuen Section-Komponenten aus `frontend/src/app/fansubs/[slug]/sections/` (oder wo Phase 73 sie ablegt).

**Option B — Defensiver Fallback:** Phase 77 baut einen `PublicPreviewPanel`-Wrapper, der `FansubProfileTabs` + `GroupLeaderTimeline` für den Fall verwendet, dass die Phase-73-Sektionen noch nicht existieren, und später auf die echten Sektionen migriert. Risiko: Technische Schuld.

**Props-Schnittstelle der bestehenden Komponenten (für Fallback-Option):**

`FansubProfileTabs` erwartet: `{ group: FansubGroup, members: FansubMember[], projects: AnimeListItem[] }` [VERIFIED: FansubProfileTabs.tsx Zeile 14–19]

`GroupLeaderTimeline` erwartet: `{ entries: PublicFansubLeaderEntry[] }` [VERIFIED: page.tsx Zeile 112]

Besucher-Sicht-Filterung (D-02): Die bestehenden Komponenten filtern **nicht** nach `visibility`/`review_status` (Phase-72-Felder), weil Phase 72 noch nicht ausgeführt ist. Für den Fallback gilt: Preview zeigt, was `getFansubBySlug` + `getFansubMembers` + `getFansubContributions` liefern — ohne Sichtbarkeitsfilterung. Die echte Phase-72-Filterung ist erst nach Phase-72-Ausführung möglich.

---

## Forschungsschwerpunkt 2: Workspace-Andockpunkte

### MAIN_TABS (VERIFIZIERT)

[VERIFIED: page.tsx Zeilen 199–210]

```typescript
const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: "basic",           label: "Grunddaten" },
  { key: "notes",           label: "Gruppengeschichte" },
  { key: "media",           label: "Medien" },
  { key: "collaboration",   label: "App-Mitglieder" },
  { key: "mitglieder",      label: "Hist. Mitglieder" },
  { key: "rollen",          label: "Historische Rollen" },
  { key: "claims",          label: "Claims" },
  { key: "vorschlaege",     label: "Vorschläge" },
  { key: "releases",        label: "Anime & Veröffentlichungen" },
  { key: "anime-projekte",  label: "Anime-Einblicke" },
];
```

**Neuer Tab:** `{ key: "readiness", label: "Veröffentlichung" }` — anzuhängen am Ende oder vor „Anime-Einblicke". [ASSUMED: genaue Position ist Claude's Discretion per CONTEXT.md]

Der `MainTab`-Typ muss um `"readiness"` erweitert werden: `type MainTab = SectionKey` und `type SectionKey = ... | "readiness"` [VERIFIED: page.tsx Zeilen 121–132].

### canUseMainTab (VERIFIZIERT)

[VERIFIED: page.tsx Zeilen 216–249]

Aktuelle Tab-Gating-Logik:
- `basic`/`media` → `can_edit_group`
- `links` → `can_manage_links`
- `collaboration`/`mitglieder`/`rollen` → `can_view_members || can_manage_members`
- `claims` → `can_view_invitations || can_create_invitation || can_cancel_invitation`
- `vorschlaege` → `can_manage_members`
- `releases` → `can_view_releases`
- `anime-projekte`/`notes` → `can_edit_notes`

**Für `readiness` (D-08):** Composite `can_edit_group || can_edit_notes`. Begründung: Ein Leader der seinen Workspace-Kern (Grunddaten/Medien ODER Notizen) bearbeiten darf, ist der richtige Adressat für Preview + Readiness. Reine Mitgliedschaft (ohne diese Capabilities) genügt nicht. [ASSUMED: exakte Wahl ist Claude's Discretion per CONTEXT.md]

### visibleMainTabs / resolveMainTabForAccess (VERIFIZIERT)

[VERIFIED: page.tsx Zeilen 252–268]

`visibleMainTabs` filtert `MAIN_TABS` über `canUseMainTab`. `resolveMainTabForAccess` fällt auf den ersten sichtbaren Tab zurück. Kein Änderungsbedarf an diesen Funktionen — nur `canUseMainTab` muss den neuen Case `"readiness"` behandeln.

### D-04-Sprungmarken (Tab-Wechsel)

[VERIFIED: page.tsx Zeilen 1190–1207 — `handleMainTabChange`-Pattern]

Tab-Wechsel erfolgt über:
```typescript
const nextSearchParams = new URLSearchParams(searchParams.toString());
nextSearchParams.set("tab", nextTab);
router.replace(pathname + "?" + nextSearchParams.toString(), { scroll: false });
```

Sprungmarken aus dem Readiness-Check rufen dieselbe Logik auf:
```typescript
// Beispiel: Logo fehlt → Medien-Tab
router.replace(pathname + "?tab=media", { scroll: false });
```

Das Muster existiert bereits — keine neue Routing-Infrastruktur nötig. [VERIFIED: page.tsx]

---

## Forschungsschwerpunkt 3: Capability-Ableitung (D-08)

### FansubGroupCapabilities (VERIFIZIERT)

[VERIFIED: frontend/src/types/fansub.ts Zeilen 163–176]

```typescript
interface FansubGroupCapabilities {
  can_edit_group: boolean;
  can_manage_links: boolean;
  can_view_members: boolean;
  can_manage_members: boolean;
  can_edit_notes: boolean;
  can_view_invitations: boolean;
  can_create_invitation: boolean;
  can_cancel_invitation: boolean;
  can_view_releases: boolean;
  can_view_release_media: boolean;
  can_upload_release_media: boolean;
  can_edit_release_notes: boolean;
}
```

**12 Felder, alle boolean.** Kein neues Contract-Feld nötig (D-08 / Lock K). [VERIFIED]

### Capability-Ableitung für neuen Tab

Die Frage ist: Wer soll Preview + Readiness sehen? Antwort aus Success Criterion 4: „Gruppenmitgliedschaft allein genügt nicht."

`hasFansubWorkspaceAccess` (Zeile 793) gibt `true` wenn **irgendeine** Capability `true` ist — das wäre zu permissiv für den Readiness-Tab.

**Empfohlene Composite-Capability für `readiness`:**
```typescript
case "readiness":
  return capabilities.can_edit_group || capabilities.can_edit_notes;
```

Begründung:
- `can_edit_group` = Grunddaten/Medien verwalten dürfen → braucht Preview und weiß was fehlt
- `can_edit_notes` = Gruppengeschichte/Anime-Einblicke pflegen dürfen → braucht Story-Vollständigkeit
- `can_view_members || can_manage_members` allein (was `collaboration/mitglieder/rollen` abdeckt) ohne Edit-Rechte = reine Leserechte auf Mitglieder → genügt NICHT für Preview/Readiness-Ownership
- Kein neues Feld, kein Backend-Änderung [VERIFIED: Lock K eingehalten]

---

## Forschungsschwerpunkt 4: Readiness-Zähler-Seams (D-06, read-only)

### Bestehende Seams (VERIFIZIERT)

| Kriterium | API-Seam | Endpunkt | Liefert genug? |
|-----------|----------|----------|---------------|
| Logo vorhanden | `group.logo_url` / `group.logo_id` in `FansubGroup` | Bereits in Page-State (`getFansubByID`) | JA — kein neuer Aufruf |
| Banner vorhanden | `group.banner_url` / `group.banner_id` | Bereits in Page-State | JA |
| Kurzbeschreibung | `buildFansubFactSummary(group)` > "" | Bereits in Page-State (derived) | JA |
| Story vorhanden | Notizen-Seam `NotesTab` lädt eigenständig | `GET /api/v1/admin/fansubs/:id/notes` | BEDINGT — Tab lädt bei Aktivierung; für Readiness-Zähler: entweder eigener Fetch oder Story-Präsenz aus Gruppenbasisdaten [ASSUMED: API liefert `has_notes: boolean` oder Zähler via separatem Notes-Fetch] |
| Mitglieder geprüft | `listGroupMembers(fansubId)` | `GET /api/v1/admin/fansubs/:id/group-members` | JA [VERIFIED: api.ts Zeile 6989] |
| Externe Mitwirkende | `getAdminFansubAnime(fansubId)` → dann `listAnimeContributions(fansubId, animeId)` | `GET /api/v1/admin/fansubs/:id/anime/:animeId/contributions` | JA, aber erfordert Loop über alle Anime; für Readiness-Zähler ausreichend [VERIFIED: api.ts Zeile 7266] |
| Medien kategorisiert | `getAdminFansubAnime` + `ReleaseVersionMediaDrawerSummary` intern | Kein direkter Gruppen-Media-Kategorisierungs-Endpunkt | BEDINGT — Release-Version-Medien haben `category`-Feld; Gruppenmedien (`fansub_group_media`) haben keinen dediziert abrufbaren Kategorisierungs-Status [ASSUMED] |
| Offene Claims (D-06) | `listPendingMemberClaims(fansubId)` | `GET /api/v1/admin/fansubs/:id/member-claims` | JA [VERIFIED: api.ts Zeile 3442] |
| Offene Einladungen (D-06) | `listClaimInvitations(fansubId)` | `GET /api/v1/admin/fansubs/:id/claim-invitations` | JA [VERIFIED: api.ts Zeile 3378] |
| Offene Contributions (D-06) | `listAnimeContributions` per Anime | Pro-Anime-Endpunkt, kein gruppen-weiter Gesamt-Zähler | BEDINGT — Zähler erfordert Loop [ASSUMED: kein einzelner `/admin/fansubs/:id/contributions`-Endpunkt ohne animeId] |
| Öffentliche Vorschau | In-Page-Rendering | Kein separater Endpunkt | N/A — Preview entsteht durch Inline-Rendering |

**Fazit zu D-06/Lock K:** Alle wesentlichen Readiness-Kriterien sind aus bestehenden Seams ableitbar, ohne neue Endpunkte zu schaffen. Die einzigen „BEDINGT"-Fälle (Story-Präsenz, Contributions-Gesamt-Zähler) erfordern entweder kleine Fetches bei Tab-Aktivierung oder eine akzeptierte Vereinfachung (z. B. „0 Anime = noch keine Contributions möglich").

---

## Forschungsschwerpunkt 5: Kontext-Pflege-Schreibpfade (D-07)

### AnimeProjectNotesSection.tsx (VERIFIZIERT)

[VERIFIED: AnimeProjectNotesSection.tsx Zeilen 1–18]

- **Schreibpfad:** `upsertAnimeFansubProjectNote(groupId, animeId, payload)` → `POST/PATCH /api/v1/admin/fansubs/:id/anime/:animeId/project-notes`
- **Owner-Tabelle:** `anime_fansub_project_notes` [VERIFIED: db-schema-fansub-domain.md]
- **Zweck:** Gruppenspezifische Projektstory pro Anime, TipTap Rich-Text
- **Phase 77:** Diese Sektion ist bereits im Tab `anime-projekte` erreichbar. Phase 77 bündelt sie im Readiness-Tab als Sprungmarke auf `?tab=anime-projekte`. Kein neuer Schreibpfad.

### GroupMembersTab.tsx (VERIFIZIERT)

[VERIFIED: GroupMembersTab.tsx Zeilen 1–30]

- **Schreibpfade:** `createGroupMember`, `updateGroupMember`, `deleteGroupMember`
- **Owner-Tabelle:** `hist_fansub_group_members`
- **Endpunkte:** `POST/PATCH/DELETE /api/v1/admin/fansubs/:id/group-members`
- **Phase 77:** Bereits in Tab `mitglieder`. Sprungmarke von Readiness-Tab auf `?tab=mitglieder`. Kein neuer Schreibpfad.

### ReleaseThemeAssetsSection.tsx (VERIFIZIERT)

[VERIFIED: ReleaseThemeAssetsSection.tsx existiert, import in page.tsx verifiziert]

- **Schreibpfad:** `uploadAdminReleaseThemeAssetForRelease` / `deleteAdminReleaseThemeAsset`
- **Owner-Tabelle:** `release_theme_assets` (Ownership-Matrix G)
- **Phase 77:** Bereits in Release-Drawer (Tab `releases`). Sprungmarke auf `?tab=releases`. Kein neuer Schreibpfad.

### ReleaseVersionMediaDrawerSummary.tsx (VERIFIZIERT)

[VERIFIED: ReleaseVersionMediaDrawerSummary.tsx Zeilen 1–30]

- **Schreibpfad:** Keine eigenen Schreiboperationen — reine Summary-Ansicht über `useReleaseVersionMedia(versionId)`
- **Eigentlicher Schreibpfad:** `uploadReleaseVersionMedia`, `deleteReleaseVersionMedia` in `/admin/episode-versions/[versionId]/edit`
- **Owner-Tabelle:** `release_version_media` (Ownership-Matrix G)
- **Phase 77:** Summary wird bereits im Release-Drawer angezeigt. Sprungmarke auf `?tab=releases`. Kein neuer Schreibpfad.

### NotesTab.tsx (VERIFIZIERT)

[VERIFIED: NotesTab.tsx existiert; import in page.tsx Zeile 99]

- **Schreibpfad:** Fansub-Gruppennotizen (`fansub_group_notes`)
- **Tab:** `notes` (Label: „Gruppengeschichte")
- **Phase 77:** Story-Vollständigkeit im Readiness-Check → Sprungmarke auf `?tab=notes`. Kein neuer Schreibpfad.

### Owner-Tabellen-Lücken-Analyse (D-07)

**Frage:** Gibt es eine echte, in einer Owner-Tabelle vorhandene-aber-nicht-editierbare Lücke?

Basierend auf der Bestandsaufnahme: **Keine kritische Lücke gefunden.** Alle relevanten Owner-Tabellen (`fansub_group_notes`, `anime_fansub_project_notes`, `hist_fansub_group_members`, `release_theme_assets`, `release_version_media`) sind bereits über bestehende Tab-Komponenten editierbar. Phase 77 muss diese Pfade nur im Readiness-Kontext erreichbar machen.

**Hinweis:** `fansub_group_media` (Logo, Banner, zusätzliche Gruppenbilder) ist über Tab `media` bearbeitbar (`uploadFansubMedia`/`deleteFansubMedia`). Die Readiness-Prüfung „Logo vorhanden?" liefert nur den Status, kein neues Editierfeld.

---

## Forschungsschwerpunkt 6: Phase-72-Projektionen für Preview-Filterung (D-02)

### Aktueller Stand

Phase 72 ist noch **nicht ausgeführt** [VERIFIED: keine `dispute_state`/`profile_status`/`review_statuses` in Migrations 0001–0096].

Die Phase-72-Projektionsfelder (`visibility`, `review_status`) für D-02-konforme Besucher-Sicht-Filterung existieren im Schema noch nicht.

### Implikation für Phase 77

**D-02 fordert:** Preview zeigt nur öffentlich + freigegebene Inhalte gemäß Phase-72-Achsen.

Zwei Szenarien:
1. **Phase 72 + 73 sind ausgeführt (Idealfall):** Preview-Wrapper übergibt `{ visibility: 'public', review_status: 'approved' }` als Filter-Props an Section-Komponenten. Filterung serverseitig oder in `getFansubGroupDomainProjection`.
2. **Phase 72 noch nicht ausgeführt (aktueller Stand):** Preview rendert was `getFansubBySlug` + `getFansubMembers` + `getFansubContributions` ohne Sichtbarkeitsfilterung liefern. Das ist eine temporäre Annäherung — nicht die exakte D-02-Besucher-Sicht, aber kein falsches Zeigen interner Daten (bestehende öffentliche Endpunkte geben ohnehin nur öffentliche Daten zurück). [ASSUMED: `getFansubBySlug` filtert intern auf öffentliche Daten]

Der Planner muss entscheiden: Setzt Phase 77 eine abgeschlossene Phase 72 voraus, oder wird Preview in Wave 1 ohne Phase-72-Felder gebaut und in einem späteren Wave verfeinert?

---

## Häufige Fallstricke

### Fallstrick 1: page.tsx weiter aufblähen

**Was schiefläuft:** Neue Readiness/Preview-Logik direkt in die ~3.800-Zeilen-`page.tsx` einfügen.
**Warum es passiert:** Andere Tabs sind direkt in `page.tsx` gerendert.
**Wie vermeiden:** Neuer Tab als eigenständige `ReadinessTab.tsx`-Datei. `page.tsx` importiert nur `<ReadinessTab>` und rendert es im `activeMainTab === "readiness"`-Zweig. Maximale Zeilenzahl 450 (CLAUDE.md).
**Warnsignal:** Wenn ReadinessTab-Logik im `AdminFansubEditContent`-Body landet.

### Fallstrick 2: Iframe oder externer Link statt Inline-Preview

**Was schiefläuft:** `<iframe src="/fansubs/[slug]">` oder Button „Vorschau öffnen" als Tab-Inhalt.
**Warum es passiert:** Einfachste Implementierung.
**Wie vermeiden:** D-01 ist locked — kein iframe, kein externer Tab-Link. Preview = direkter Import der Fansub-Section-Komponenten.

### Fallstrick 3: Neuer Backend-Endpunkt für Readiness-Zähler

**Was schiefläuft:** `GET /api/v1/admin/fansubs/:id/readiness-summary` neu erfinden.
**Warum es passiert:** Bequemlichkeit; alle Daten an einem Ort.
**Wie vermeiden:** Lock K + D-06: Zähler aus bestehenden List-Seams im Client aggregieren. Kein neuer Endpunkt, kein neues OpenAPI-Feld.

### Fallstrick 4: Gruppenmitgliedschaft als Gating-Bedingung

**Was schiefläuft:** `hasFansubWorkspaceAccess(capabilities)` (true wenn irgendeine Capability true) als Gating für Readiness-Tab.
**Warum es passiert:** Analogie zu anderem Workspace-Zugang.
**Wie vermeiden:** Success Criterion 4: Mitgliedschaft allein genügt nicht. Composite `can_edit_group || can_edit_notes` ist restriktiver.

### Fallstrick 5: Phase-73-Section-Komponenten vor ihrer Existenz importieren

**Was schiefläuft:** Preview-Wrapper importiert `FansubHeroSection` aus Pfad, den Phase 73 noch nicht angelegt hat.
**Warum es passiert:** Phase-77-Plan geht von abgeschlossener Phase 73 aus.
**Wie vermeiden:** Explizite Wave-Abhängigkeit im Plan: Phase 73 muss vollständig ausgeführt sein. Alternativ: Fallback auf bestehende `FansubProfileTabs` + Feature-Flag-Muster im Preview-Wrapper.

### Fallstrick 6: Natürliche `<input>`/`<select>`/`<button>` statt globale Primitive

**Was schiefläuft:** Readiness-Tab verwendet native `<button>` für Sprungmarken, native `<input>` für nichts, aber `<select>` in etwaigen Inline-Filtern.
**Warum es passiert:** „Kleines UI, kein Aufwand."
**Wie vermeiden:** CLAUDE.md-Durchsetzung: Alle Interaktionselemente aus `@/components/ui` (Button, Badge, Card, Table, …). [VERIFIED: alle bestehenden Tab-Komponenten folgen diesem Muster]

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen verwenden | Warum |
|---------|-------------------|----------------------|-------|
| Tab-Navigation + URL-State | Eigenes Routing-System | Bestehendes `parseMainTab`/`router.replace`-Pattern | Bereits vorhanden, konsistent mit restlichen Tabs [VERIFIED: page.tsx] |
| Claims-Liste für Zähler | Eigener API-Fetch | `listPendingMemberClaims(fansubId)` | API-Helper bereits implementiert [VERIFIED: api.ts Zeile 3442] |
| Mitglieder-Liste für Zähler | Eigener API-Fetch | `listGroupMembers(fansubId)` | API-Helper bereits implementiert [VERIFIED: api.ts Zeile 6989] |
| Anime-Liste für Zähler | Eigener API-Fetch | `getAdminFansubAnime(fansubId)` | API-Helper bereits implementiert [VERIFIED: api.ts Zeile 4148] |
| Capability-Prüfung | Eigene Rollen-/Membership-Prüfung | `canUseMainTab` + `FansubGroupCapabilities` | Bestehend, konsistent [VERIFIED: page.tsx] |
| Rich-Text-Rendering für Story-Preview | Eigener Renderer | `RichTextRenderer` aus `@/components/editor` | Bereits im Projekt vorhanden [VERIFIED: AnimeProjectNotesSection.tsx] |
| Gruppen-Basisdaten im Preview | Separater `getFansubBySlug`-Aufruf | Bestehender `group`-State aus `getFansubByID` | Bereits in `AdminFansubEditContent` geladen |

---

## Code-Beispiele

### Muster 1: Neuen Tab in MAIN_TABS einhängen

```typescript
// Source: page.tsx Zeilen 199–210 (VERIFIED) — Erweiterung
const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: "basic", label: "Grunddaten" },
  // ... bestehende Tabs ...
  { key: "releases", label: "Anime & Veröffentlichungen" },
  { key: "anime-projekte", label: "Anime-Einblicke" },
  { key: "readiness", label: "Veröffentlichung" },  // NEU
];

// canUseMainTab — neuer Case:
case "readiness":
  return capabilities.can_edit_group || capabilities.can_edit_notes;
```

### Muster 2: Sprungmarken-Navigation (D-04)

```typescript
// Source: page.tsx handleMainTabChange-Pattern (VERIFIED)
function navigateToTab(tab: MainTab) {
  const nextSearchParams = new URLSearchParams(searchParams.toString());
  nextSearchParams.set("tab", tab);
  router.replace(`${pathname}?${nextSearchParams.toString()}`, { scroll: false });
}

// Verwendung in ReadinessChecklist:
<Button
  variant="subtle"
  size="sm"
  onClick={() => navigateToTab("media")}
>
  Logo ergänzen →
</Button>
```

### Muster 3: Preview-Wrapper (Fallback, bis Phase 73 ausgeführt)

```typescript
// PublicPreviewPanel.tsx — Fallback auf bestehende Komponenten
'use client'
import { FansubProfileTabs } from '@/components/fansubs/FansubProfileTabs'
import { GroupLeaderTimeline } from '@/components/fansubs/GroupLeaderTimeline'

interface PublicPreviewPanelProps {
  group: FansubGroup
  members: FansubMember[]
  projects: AnimeListItem[]
  leaderTimeline: PublicFansubLeaderEntry[]
}

export function PublicPreviewPanel({ group, members, projects, leaderTimeline }: PublicPreviewPanelProps) {
  // read-only: keine onSave/onChange-Props; Wrapper zeigt exakt
  // was getFansubBySlug + getFansubMembers + getFansubContributions liefern
  return (
    <div aria-label="Öffentliche Vorschau (read-only)">
      <GroupLeaderTimeline entries={leaderTimeline} />
      <FansubProfileTabs group={group} members={members} projects={projects} />
    </div>
  )
}
```

### Muster 4: Readiness-Prüfung (schematisch)

```typescript
// ReadinessChecklist.tsx — schematisch
interface ReadinessItem {
  id: string
  label: string
  satisfied: boolean
  targetTab: MainTab
  hint: string
}

function buildReadinessItems(
  group: FansubGroup,
  memberCount: number,
  openClaimCount: number,
  animeCount: number,
): ReadinessItem[] {
  return [
    { id: 'logo',    label: 'Logo vorhanden',        satisfied: Boolean(group.logo_url),   targetTab: 'media',      hint: 'Logo im Medien-Tab hochladen' },
    { id: 'banner',  label: 'Banner vorhanden',       satisfied: Boolean(group.banner_url), targetTab: 'media',      hint: 'Banner im Medien-Tab hochladen' },
    { id: 'members', label: 'Mitglieder eingetragen', satisfied: memberCount > 0,           targetTab: 'mitglieder', hint: 'Historische Mitglieder eintragen' },
    { id: 'anime',   label: 'Projekte verknüpft',     satisfied: animeCount > 0,            targetTab: 'releases',   hint: 'Anime & Releases verknüpfen' },
    // Claims/Contributions: informativ, keine satisfied/unsatisfied-Wertung (D-06)
    { id: 'claims',  label: `Offene Claims: ${openClaimCount}`, satisfied: true, targetTab: 'claims', hint: 'Claims einsehen' },
  ]
}
```

---

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Seit wann | Auswirkung |
|-------------|------------------|-----------|------------|
| Tabs als parallele Workspaces | Ein kanonischer Workspace (`/admin/fansubs/[id]/edit`), Leader-spezifische Tabs capability-gated | Lock F (v1.2) | Kein zweiter Workspace; alles in einer Route |
| Readiness als hartes Gate | Readiness als Leitfaden ohne Gate (D-05) | Phase-77-Diskussion | Kein Publish-Toggle; Preview informiert ohne zu blockieren |

**Veraltet / nicht verwenden:**
- `/admin/my-groups/[id]` für Review-Logik (Lock F — bleibt auf Leader-Workspace beschränkt)
- Direkter Browser→Backend-Fetch ohne `apiClientFetch` (Lock K)

---

## Annahmen-Log

| # | Behauptung | Abschnitt | Risiko bei Falsch |
|---|-----------|-----------|-------------------|
| A1 | `getFansubBySlug` öffentliche Endpunkte geben intern keine nicht-öffentlichen Daten zurück | Forschungsschwerpunkt 6 | Preview würde interne Daten zeigen — dann explizite Filterung nötig |
| A2 | Kein einzelner `/admin/fansubs/:id/contributions`-Endpunkt ohne `animeId` existiert | Forschungsschwerpunkt 4 | Falls vorhanden: vereinfacht Gesamt-Contributions-Zähler erheblich |
| A3 | Story-Präsenz ist nicht direkt aus `FansubGroup`-DTO ablesbar (kein `has_notes: boolean`) | Forschungsschwerpunkt 4 | Falls vorhanden: Readiness-Kriterium „Story vorhanden" ohne Zusatz-Fetch |
| A4 | Genaue Tab-Position für `readiness` (Reihenfolge in MAIN_TABS) | Forschungsschwerpunkt 2 | Niedrig — ist Claude's Discretion per CONTEXT.md |
| A5 | Phase 73 wird vor Phase 77 ausgeführt (Voraussetzung für D-01 in Reinform) | Forschungsschwerpunkt 1 | Preview nutzt Fallback `FansubProfileTabs` statt Phase-73-Sektionen |

---

## Offene Fragen (RESOLVED)

1. **Abhängigkeitsreihenfolge Phase 72/73 → 77** — RESOLVED
   - Was wir wissen: Phase 72 und 73 sind noch nicht ausgeführt.
   - Was unklar ist: Ob der Planner Phase 77 als Folge-Phase nach 73 plant oder einen Fallback-Pfad einbaut.
   - Empfehlung: Preview-Wrapper mit Fallback-Option starten; nach Phase-73-Ausführung auf echte Section-Komponenten migrieren. Explizit im Plan vermerken.

2. **Story-Präsenz-Zähler ohne eigenen Fetch** — RESOLVED
   - Was wir wissen: `NotesTab` lädt Notizen eigenständig bei Tab-Aktivierung.
   - Was unklar ist: Ob `FansubGroup`-DTO ein `has_notes`-Feld oder `notes_count` trägt.
   - Empfehlung: Prüfen ob `getFansubByID` bereits ein Notizen-Feld zurückgibt; falls nicht, Readiness-Kriterium „Story" erst aktivieren wenn NotesTab geladen ist oder kleinen zusätzlichen Fetch im Readiness-Tab starten.

3. **Contributions-Gesamt-Zähler ohne pro-Anime-Loop** — RESOLVED
   - Was wir wissen: `listAnimeContributions(fansubId, animeId)` erfordert animeId.
   - Was unklar ist: Ob Phase 62/65 einen gruppen-weiten Contributions-Endpunkt hinzufügte.
   - Empfehlung: Backend `admin_routes.go` prüfen ob `/admin/fansubs/:id/contributions` (ohne animeId) existiert; falls nicht, Zähler aus `anime.length` ableiten oder Loop akzeptieren.

---

## Umgebungs-Verfügbarkeit

Phase 77 hat keine neuen externen Abhängigkeiten. Alle benötigten Laufzeit-Dienste (Go-Backend, PostgreSQL, Next.js) sind via Docker Compose verfügbar.

| Abhängigkeit | Benötigt von | Verfügbar | Version | Fallback |
|-------------|-------------|-----------|---------|---------|
| Go Backend | Alle API-Seams | ✓ | Go 1.25 | — |
| PostgreSQL | Datenbank | ✓ | 16 | — |
| Next.js Frontend | Client Components | ✓ | 16 | — |
| Phase 72 Migrations | D-02 Sichtbarkeits-Filterung | ✗ (noch nicht ausgeführt) | — | Fallback: ungefilterte öffentliche Endpunkte |
| Phase 73 Sektionen | D-01 Inline-Preview | ✗ (noch nicht ausgeführt) | — | Fallback: FansubProfileTabs + GroupLeaderTimeline |

---

## Validation Architecture

### Test-Framework

| Eigenschaft | Wert |
|-------------|------|
| Framework | Vitest 3 (jsdom) |
| Konfigdatei | `frontend/vitest.config.ts` |
| Schnell-Befehl | `cd frontend && npx vitest run src/app/admin/fansubs` |
| Vollständige Suite | `cd frontend && npx vitest run` |

### Phase-Anforderungen → Test-Map

| Req-ID | Verhalten | Test-Typ | Automatisierter Befehl | Datei vorhanden? |
|--------|----------|----------|----------------------|----------------|
| F | Neuer Tab sichtbar wenn `can_edit_group=true`, unsichtbar bei reiner Mitgliedschaft | unit | `npx vitest run src/app/admin/fansubs/\\[id\\]/edit/page.test.tsx` | ✅ vorhanden; neue Cases hinzufügen |
| F | `canUseMainTab("readiness")` gibt false zurück wenn nur `can_view_members=true` | unit | wie oben | ✅ vorhanden; neue Cases |
| I | Preview-Komponente rendert ohne Schreib-Interaktionen | unit | `npx vitest run src/app/admin/fansubs/\\[id\\]/edit/ReadinessTab.test.tsx` | ❌ Wave 0 anlegen |
| K | Readiness-Tab ruft keinen neuen Endpunkt auf (nur bestehende API-Funktionen) | unit (Mock-Check) | `npx vitest run src/app/admin/fansubs/\\[id\\]/edit/ReadinessTab.test.tsx` | ❌ Wave 0 anlegen |
| D-04 | Klick auf Sprungmarke löst `router.replace` mit korrektem `?tab=` aus | unit | `npx vitest run src/app/admin/fansubs/\\[id\\]/edit/ReadinessTab.test.tsx` | ❌ Wave 0 anlegen |
| D-06 | Claims-/Contributions-Zähler sind als informativ gerendert (kein „nicht bereit") | unit | wie oben | ❌ Wave 0 anlegen |

### Sampling Rate

- **Pro Task-Commit:** `cd frontend && npx vitest run src/app/admin/fansubs`
- **Pro Wave-Merge:** `cd frontend && npx vitest run`
- **Phase-Gate:** Vollständige Suite grün vor `/gsd:verify-work`

### Wave-0-Lücken

- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.test.tsx` — deckt Req F, I, K, D-04, D-06 ab
- [ ] Mocks: `listPendingMemberClaims`, `listGroupMembers`, `getAdminFansubAnime` als Vitest-Mocks analog zu `page.test.tsx`-Pattern

---

## Sicherheits-Domäne

### Anwendbare ASVS-Kategorien

| ASVS-Kategorie | Anwendbar | Standard-Kontrolle |
|----------------|----------|-------------------|
| V4 Zugriffskontrolle | ja | `canUseMainTab("readiness")` + `FansubEditAccessGate` — keine neue Auth-Logik, bestehende Capability-Prüfung [VERIFIED] |
| V5 Input-Validierung | nein | Phase 77 hat keine neuen Eingabefelder (nur read-only Preview + Checkliste) |
| V2 Authentifizierung | ja (bestehend) | `FansubEditAccessGate` prüft `hasAccessToken || hasRefreshToken` vor Capability-Fetch [VERIFIED: page.tsx Zeile 867] |

### Bekannte Bedrohungsmuster

| Muster | STRIDE | Standard-Mitigation |
|--------|--------|---------------------|
| Capability-Bypass durch URL-Manipulation (`?tab=readiness`) | Elevation of Privilege | `resolveMainTabForAccess` fällt auf ersten erlaubten Tab zurück wenn Capability fehlt [VERIFIED: page.tsx Zeilen 261–268] — kein neuer Schutzbedarf |
| Preview zeigt interne Daten | Information Disclosure | D-02: nur öffentliche Endpunkte im Preview-Wrapper; Phase-72-Felder bei Verfügbarkeit als zusätzlicher Filter |
| Sprungmarken-Navigation zum nicht-berechtigten Tab | Elevation of Privilege | `resolveMainTabForAccess` fängt jeden Tab-Zugriff ab; Sprungmarken sind reine URL-Änderungen, keine Capability-Eskalation |

---

## Quellen

### Primär (HIGH-Konfidenz)

- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — MAIN_TABS, canUseMainTab, visibleMainTabs, resolveMainTabForAccess, FansubEditAccessGate, Tab-Routing, Zeilen 1–3.860
- `frontend/src/types/fansub.ts` — FansubGroupCapabilities-Interface, Zeilen 163–176
- `frontend/src/lib/api.ts` — listGroupMembers (Z. 6989), listAnimeContributions (Z. 7266), listPendingMemberClaims (Z. 3442), listClaimInvitations (Z. 3378), getFansubGroupCapabilities (Z. 3123), getAdminFansubAnime (Z. 4148)
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` — Schreibpfad anime_fansub_project_notes
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` — Schreibpfad hist_fansub_group_members
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx` — Summary-Muster, release_version_media
- `frontend/src/components/fansubs/FansubProfileTabs.tsx` — Bestehende Preview-Fallback-Komponente
- `frontend/src/components/fansubs/GroupLeaderTimeline.tsx` — Bestehende Preview-Fallback-Komponente
- `frontend/src/app/fansubs/[slug]/page.tsx` — Aktueller Stand öffentliche Fansub-Seite (Phase 73 noch nicht ausgeführt)
- `.planning/phases/77-leader-workspace-public-preview-readiness/77-CONTEXT.md` — D-01..D-08, alle Locks
- `.planning/milestones/v1.2-DISCUSSION.md` — Entscheidungen A–K, Entscheidung 7, Ownership-Matrix G
- `docs/architecture/current-system-inventory.md` — Ownership-Karte, Seam-Beschreibungen
- `docs/architecture/db-schema-fansub-domain.md` — Domain-Mapping, Owner-Tabellen

### Sekundär (MEDIUM-Konfidenz)

- `.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-RESEARCH.md` — Phase-73-Abhängigkeitsanalyse (Projektionsendpunkte aus Phase 72)
- `database/migrations/0096_hist_group_members_confirmation_audit.up.sql` — Nachweis: Phase 72 noch nicht ausgeführt

---

## Metadaten

**Konfidenz-Aufschlüsselung:**
- Standard-Stack: HIGH — direkt aus package.json und bestehenden Importen verifiziert
- Architektur: HIGH — MAIN_TABS, canUseMainTab, FansubGroupCapabilities vollständig im Code verifiziert
- Fallstricke: HIGH — aus bekannten CLAUDE.md-Constraints und Code-Inspektion abgeleitet
- Phase-72/73-Abhängigkeiten: MEDIUM — Pläne existieren, Ausführungsstand gesichert durch Migrations-Check

**Research-Datum:** 2026-06-05
**Gültig bis:** 30 Tage (stabiler Stack), aber: **Phase-72- und Phase-73-Ausführungsstand täglich prüfen** — sobald diese Phasen ausgeführt sind, ändern sich Preview-Implementierungsdetails erheblich.

---

## RESEARCH COMPLETE

**Phase:** 77 – Leader Workspace: Public Preview & Readiness
**Konfidenz:** HIGH

### Wichtigste Erkenntnisse

1. **Kein neuer Backend-Endpunkt nötig:** Alle Readiness-Zähler (Claims, Mitglieder, Anime/Contributions) sind aus bestehenden `listPendingMemberClaims`, `listGroupMembers`, `getAdminFansubAnime` und `listAnimeContributions` aggregierbar. Lock K eingehalten.

2. **Capability-Gating ohne neues Contract-Feld:** Composite `can_edit_group || can_edit_notes` aus `FansubGroupCapabilities` (12 Felder, alle vorhanden) gated den neuen Tab sauber. D-08 vollständig erfüllbar.

3. **MAIN_TABS-Erweiterung ist chirurgisch:** Nur `SectionKey`-Typ um `"readiness"` erweitern, neuen `canUseMainTab`-Case und `MAIN_TABS`-Eintrag hinzufügen, Tab-Render-Zweig delegiert an `<ReadinessTab>`. `page.tsx` bleibt nicht weiter angewachsen.

4. **Phase-73-Abhängigkeit ist kritisch:** Phase 73 ist noch nicht ausgeführt. Preview-Wrapper braucht Fallback auf `FansubProfileTabs` + `GroupLeaderTimeline` (bestehend) bis Phase 73 geliefert hat. Planner muss Wave-Sequenz oder Fallback-Strategie explizit kodieren.

5. **Keine Owner-Tabellen-Lücke:** Alle relevanten Schreibpfade (Notes, Mitglieder, Theme Assets, Release-Version-Medien) sind bereits über bestehende Tabs erreichbar. Phase 77 bündelt nur Sprungmarken — kein neuer Schreibcode per D-07.

### Erstellte Datei
`.planning/phases/77-leader-workspace-public-preview-readiness/77-RESEARCH.md`

### Konfidenz-Assessment

| Bereich | Level | Begründung |
|---------|-------|-----------|
| Standard-Stack | HIGH | Direkt im Code verifiziert |
| Architektur (Tabs, Capabilities) | HIGH | Vollständige Inspektion page.tsx + types/fansub.ts |
| Readiness-Seams | HIGH | API-Funktionen in api.ts direkt gefunden |
| Phase-72/73-Abhängigkeit | MEDIUM | Ausführungsstand gesichert; Migrations-Prüfung durchgeführt |
| Preview-Filterung (D-02) | MEDIUM | Phase-72-Felder noch nicht vorhanden; Fallback dokumentiert |

### Offene Fragen (RESOLVED)

- RESOLVED: Abhängigkeitsreihenfolge Phase 73 → 77 — Phase 77 ist eigenständig auslieferbar; PublicPreviewPanel rendert Fallback (FansubProfileTabs + GroupLeaderTimeline); KEINE harte Wave-Blockade auf Phase 73; Upgrade-Pfad via TODO(Phase 73)-Kommentar dokumentiert (D-01).
- RESOLVED: Story-Präsenz-Zähler ohne Zusatz-Fetch — vereinfachtes Präsenz-Kriterium akzeptiert; Sprungmarke auf Notes-Tab; kein neues has_notes-DTO-Feld (Lock K gewahrt).
- RESOLVED: Gruppen-weiter Contributions-Endpunkt — Vereinfachung auf animeCount-Basis akzeptiert; kein neuer Endpunkt (Lock K).

### Bereit für Planung
Research vollständig. Planner kann PLAN.md-Dateien auf Basis dieses Dokuments erstellen.
