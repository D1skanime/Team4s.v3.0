# Phase 82: Mitwirkende projektweit zuordnen + Projekt-Cockpit — Research

**Researched:** 2026-06-11
**Domain:** Fansub Admin UI · Datenmodell-Migration · Beitragserfassung
**Confidence:** HIGH (alle Befunde via direkter Codebase-Inspektion verifiziert)

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions
- **D-01:** `anime_contributions` ankert künftig auf `members.id` (Person) + Gruppe statt auf `hist_fansub_group_members.id`. App- und historische Member sind gleichwertig buchbar.
- **D-02:** Jeder App-Member bekommt eine `members`-Zeile (Backfill bestehender `fansub_group_members` ohne verknüpften `member`; künftig Auto-Anlage + Self-Claim beim Gruppenbeitritt).
- **D-03:** Kein Merge-/Claim-UI in der Mitwirkenden-/Matrix-Oberfläche. Phase 82 konsumiert nur die vereinheitlichte Personenliste; Dedup bleibt im Members-Bereich.
- **D-04:** „Team übernehmen" speist sich aus einer festen Stamm-Crew pro Gruppe (Rolle→Person).
- **D-05:** Crew-/Zuordnungs-Modellierung MUSS mehrere Rollen pro Person zulassen (many-to-many). Kein 1:1 Rolle=Person.
- **D-06:** Rollen-Spalten der Matrix sind pro Gruppe konfigurierbar.
- **D-07:** Rollen sind katalog-getrieben (`role_definitions`, `contexts @> 'anime_contribution'`, `sort_order`).
- **D-08:** `fansub_group_member_roles.role` (heute hartkodierter CHECK, 0073/0074) → FK auf `role_definitions(code)` umstellen.
- **D-09:** Beim Hinzufügen nur operative Gruppen-Rollen als Default in Anime-Rollen übernehmen; Leadership-Rollen NICHT automatisch als Anime-Credit.
- **D-10:** Einblicke pro Anime-Projekt direkt im aufklappbaren Projektbereich.
- **D-11:** Status-Badges pro Projekt: `220 Folgen`, `Mitwirkende 6/6` / `Mitwirkende fehlen`, `Einblick vorhanden` / `Einblick fehlt`, `N offene Punkte`.
- **D-12:** Filterchips NUR wenn Datenlage zuverlässig; sonst nur UI-Struktur vorbereiten, kein Fake-Status.
- **D-13:** Separaten Main-Tab „Anime-Einblicke" entfernen (nach vollständiger Integration); Legacy `?tab=anime-projekte` → `tab=releases`; Sprungmarken umstellen.
- **D-14:** Bestehende API-Helper/DTOs wiederverwenden — keine zweite API-Logik.
- **D-15:** `project_lead` ist normale Katalog-Rolle, kein Sonderfeld/Max-1-Sperre.
- **D-16:** `project_lead` als normale Katalog-Rolle behandeln; keine dedizierte Spalte.

### Claude's Discretion
- Migrationsreihenfolge & Backfill-Sicherheit der bestehenden `anime_contributions` (hist→member_id), Reihenfolge ggü. members-Backfill.
- Konkrete Komponenten-/Scaffold-Struktur des Cockpits und exakte Badge-Texte.

### Deferred Ideas (OUT OF SCOPE)
- Person-zentrische Zweitsicht (eine Person → alle Projekte) — ggf. Folge-Slice.
- Gruppenübergreifendes/globales Leader-Dashboard.
</user_constraints>

---

## Zusammenfassung

Phase 82 verbindet zwei Stränge in einem einzigen Tab: Die Abdeckungs-Matrix für Mitwirkende (projektweit, über `members.id` verankert) und die Anime-Einblicke-Integration (heute separater Tab `anime-projekte`). Der Tab „Anime & Veröffentlichungen" (`tab=releases`) wird zum vollständigen Projekt-Cockpit.

**Der kritische Pfad ist die Daten-Migration:** `anime_contributions.fansub_group_member_id` zeigt heute ausschließlich auf `hist_fansub_group_members.id`. Der Umstieg auf `members.id` erfordert eine mehrstufige, rückwärtskompatible Migration (neue Spalte `member_id`, Backfill via JOIN, NOT-NULL-Constraint, alten FK ablösen). Parallel dazu müssen App-Member (`fansub_group_members` ohne verknüpften `members`-Eintrag) eine `members`-Zeile erhalten.

Die Frontend-Änderungen sind verhältnismäßig überschaubar: Der `anime-projekte`-Tab wird aus `MAIN_TABS` entfernt, `AnimeProjectNotesSection` wird inline in den aufgeklappten Projektbereich des Releases-Tabs integriert, Status-Badges werden additiv ergänzt. Das Modal `AnimeContributionModal` muss auf die neue `member_id`-Semantik umgestellt werden.

**Primäre Empfehlung:** Migration und Backfill zuerst vollständig abschließen, dann Backend-Handler anpassen, dann Frontend. Status-Badges nur für zuverlässig berechenbare Werte; Folgen-Zahl und Einblick-Präsenz sind direkt ableitbar, „offene Punkte" erfordert Prüfung.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Status-Badges (Mitwirkende n/m, Einblick, Folgen) | API / Backend | — | Aggregation vom Backend berechnen; kein n+1 im Frontend |
| Abdeckungs-Matrix (Projekt × Rollen) | Frontend | API / Backend | Pivot-Ansicht über bestehende Contribution-Daten; Backend liefert Rohdaten |
| Anime-Einblick (lesen/schreiben) | API / Backend (vorhanden) | Frontend (vorhanden) | `getAnimeFansubProjectNote` + `upsertAnimeFansubProjectNote` existieren |
| Tab-Routing / Legacy-Redirect | Frontend (page.tsx) | — | `parseMainTab` und `MAIN_TABS`-Array; keine Backend-Änderung |
| `anime_contributions`-Anker-Migration | Database | Backend | SQL-Migration + Backend-Repo-Anpassung |
| `members`-Backfill für App-Member | Database | Backend | SQL-Migration; Backend stellt neuen Endpoint bereit |
| Vereinheitlichte Personenliste (App+hist) | API / Backend | Frontend | Neuer oder erweiterter Endpoint für `listGroupMembers` |
| Standard-Team-Crew | Database (neue Tabelle) | Backend + Frontend | Stamm-Crew pro Gruppe; Neue Tabelle oder Erweiterung `fansub_group_member_roles` |
| Rollen-FK `fansub_group_member_roles` | Database | Backend | CHECK → FK-Umstellung |

---

## 1. Anime-Einblicke: Contract-Analyse

### Vorhandene API-Helper (VERIFIED: direkte Codebase-Inspektion)

| Helper | Signatur | Endpoint |
|--------|----------|---------|
| `getAnimeFansubProjectNote` | `(fansubId, animeId) → AnimeFansubProjectNote \| null` | `GET /api/v1/admin/fansubs/:id/anime/:animeId/notes` |
| `upsertAnimeFansubProjectNote` | `(fansubId, animeId, data) → AnimeFansubProjectNote` | `PUT /api/v1/admin/fansubs/:id/anime/:animeId/notes` |
| `deleteAnimeFansubProjectNote` | `(fansubId, animeId, noteId) → void` | `DELETE /api/v1/admin/fansubs/:id/anime/:animeId/notes/:noteId` |

**Alle drei Helper** existieren in `frontend/src/lib/api.ts` (Z. 6899–7006) und nutzen `authorizedFetch`. Kein manueller Bearer-Fetch nötig.

### DTO-Felder (`AnimeFansubProjectNote`, `frontend/src/types/fansubNotes.ts` Z. 59–78)

```typescript
// VERIFIED: frontend/src/types/fansubNotes.ts:59-78
export interface AnimeFansubProjectNote {
  id: number;
  animeId: number;
  fansubGroupId: number;
  title: string;
  bodyMarkdown?: string | null;
  bodyHtml: string;       // für RichTextRenderer gerendert
  bodyJson: unknown | null; // TipTap-Dokument
  bodyText: string;       // für previewText() Fallback
  editorType: string;
  contentSchemaVersion: number;
  visibility: 'public' | 'internal';
  status: 'draft' | 'published' | 'archived' | 'deleted';
  sortOrder: number;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}
```

**Für Badge „Einblick vorhanden/fehlt":** `getAnimeFansubProjectNote` gibt `null` zurück wenn kein Eintrag existiert (HTTP 404 → null). Kein neues Feld nötig. Status kann zuverlässig pro Anime abgeleitet werden, sobald der Note geladen wird.

**Achtung:** Das heutige `AnimeProjectNotesSectionRemote` lädt Einblicke **lazy** (erst beim Aufklappen). Für den Badge im zusammengeklappten Zustand braucht das Backend einen `has_note`-Flag in der Anime-Listenabfrage ODER der Badge wird erst nach Laden des Einblicks gesetzt. → Zuverlässiger Status erfordert entweder: (a) `getAdminFansubAnime`-Response um `has_project_note: bool` erweitern, ODER (b) Badge lazy (erst nach Aufklappen sichtbar). Option (b) ist D-12-konform ohne neue API-Felder.

### `AnimeProjectNotesSection` — Verwendete native Elemente (Pitfall!)

`AnimeProjectNotesSection.tsx` Z. 216–240 nutzt **native `<select>`** für Sichtbarkeit und Status. Das verletzt CLAUDE.md (globales UI-System Pflicht). Beim Integrieren in den Releases-Tab **muss** eine Migration auf `<Select>` aus `@/components/ui` erfolgen. Das ist ein bekanntes Altfall-Problem in der Datei.

Ebenfalls in `AnimeProjectNotePreview`: native `<button>` (Z. 115, 121) → muss auf `<Button>` aus `@/components/ui` migriert werden.

---

## 2. Releases-Tab-Struktur und vorhandene Komponenten

### Tab-Render-Logik (VERIFIED: `page.tsx`)

**`MAIN_TABS`** (page.tsx Z. 190–199):
```typescript
// VERIFIED: frontend/src/app/admin/fansubs/[id]/edit/page.tsx:190-199
const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: "basic",         label: "Grunddaten" },
  { key: "notes",         label: "Gruppengeschichte" },
  { key: "media",         label: "Medien" },
  { key: "collaboration", label: "Fansub Members" },
  { key: "vorschlaege",   label: "Vorschläge" },
  { key: "releases",      label: "Anime & Veröffentlichungen" },
  { key: "anime-projekte",label: "Anime-Einblicke" },    // ← ENTFERNEN
  { key: "readiness",     label: "Veröffentlichung" },
];
```

**`SectionKey`-Union** (Z. 122–133): `"anime-projekte"` ist darin als Typ deklariert. Bei Entfernung des Tabs muss der Union-Typ ebenfalls bereinigt werden.

**Render-Case** (Z. 3281–3286):
```typescript
// VERIFIED: page.tsx:3281-3286
{activeMainTab === "anime-projekte" ? (
  <AnimeProjectNotesSection
    fansubId={fansubID}
    hasAccessToken={hasAuthSession}
  />
) : null}
```
Dieser Block wird durch Integration in den `releases`-Tab ersetzt.

**Access-Guard** (Z. 238–240):
```typescript
// VERIFIED: page.tsx:238-240
case "anime-projekte":
case "notes":
  return capabilities.can_edit_notes;
```
Nach dem Tab-Merge: `anime-projekte`-Guard entfernen; der `releases`-Case hat bereits `can_view_releases`.

**`parseMainTab`** (Z. 201–204): Leitet Legacy-Werte um, z.B. `"rollen"` → `"collaboration"`. Für Legacy-Support `"anime-projekte"` → `"releases"` hier ergänzen.

**Formular-Ausblendung** (Z. 2266–2269): `activeMainTab !== "anime-projekte"` entfernen (releases wird schon ausgenommen).

### `openAnimeContributions`-Flow (VERIFIED: page.tsx Z. 1736–1752)

Lädt parallel:
1. `listGroupMembers(fansubID)` → gibt `HistFansubGroupMember[]` zurück (NUR historische Member!)
2. `listAnimeContributions(fansubID, animeId)` → gibt `AnimeContribution[]` zurück

**Kritischer Befund:** `listGroupMembers` ruft `GET /api/v1/admin/fansubs/:id/group-members` auf, der `hist_fansub_group_members` liefert — nicht App-Member! Nach der members.id-Migration muss dieser Endpoint eine **vereinheitlichte Liste** (hist + App-Member, beide über `members.id`) liefern.

**`contributionMembers`** (HistFansubGroupMember[]) wird direkt als Prop an `AnimeContributionModal` übergeben.

### Projektkarte im Releases-Tab (VERIFIED: page.tsx Z. 2706–3279)

Struktur:
```
<details> "Anime & Veröffentlichungen"
  <div> (Liste)
    {releaseGroups.map(releaseGroup => (
      <article key={releaseGroup.key} className={fansubEditAnimeReleaseCard}>
        <div className={fansubEditAnimeReleaseHeaderRow}>
          <button> (Klapptrigger, animeExpanded)
            <Image /> + <h3>{title}</h3> + <span>{releaseCountLabel}</span>
          </button>
          {canOpenReleaseContributors ? <Button>Mitwirkende</Button> : null}
        </div>
        {animeExpanded && (Releases-Liste)}
      </article>
    ))}
  </div>
</details>
```

**Für Status-Badges:** Diese werden im `fansubEditAnimeReleaseHeaderRow` neben dem `Mitwirkende`-Button ergänzt.

**Für Einblick im aufgeklappten Bereich:** `AnimeProjectNoteWorkspace` (aus `AnimeProjectNotesSection.tsx`) wird im expanded-Body vor der Releases-Liste eingefügt.

### Wiederverwendbare CSS-Klassen (`FansubEdit.module.css`, VERIFIED)

Relevant für Badges und Layout:
- `.chipRow` — flex-wrap für Chip-Reihen
- `.fansubEditAnimeReleaseHeaderRow` — Kopfzeile der Projektkarte (Header + Button)
- `.fansubEditAnimeReleaseCard` — Artikel-Container
- `.fansubEditSectionBody`, `.fansubEditSection` — `<details>`-Scaffolding

---

## 3. Datenmodell-Migration

### Ist-Zustand (VERIFIED: Migration 0086, 0091)

```sql
-- anime_contributions (0086):
fansub_group_member_id BIGINT NOT NULL REFERENCES hist_fansub_group_members(id) ON DELETE RESTRICT

-- Unique-Key (0091, 4-spaltig NULLS NOT DISTINCT):
UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)
```

Die Tabelle **kennt keinen `member_id`-FK** direkt — nur via JOIN:
`anime_contributions → hist_fansub_group_members.id → members.id`

### Verknüpfungs-Kette im Backfill

```sql
-- Backfill-Join (bereits in Repo-Code genutzt, z.B. anime_contributions_member_repository.go Z.14):
JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
-- hfgm.member_id ist der Ziel-Anker (members.id)
```

`hist_fansub_group_members.member_id` ist NOT NULL (Migration 0082: `member_id BIGINT NOT NULL REFERENCES members(id)`). Der Backfill ist also lückenlos möglich.

### Migrations-Reihenfolge (Claude's Discretion — Empfehlung)

**Schritt 1 (nächste freie Migrationsnummer, nach 0103):**
```sql
-- Schritt A: Neue Spalte member_id nullable
ALTER TABLE anime_contributions
  ADD COLUMN IF NOT EXISTS member_id BIGINT NULL REFERENCES members(id) ON DELETE RESTRICT;

-- Schritt B: Backfill via hfgm
UPDATE anime_contributions ac
SET member_id = hfgm.member_id
FROM hist_fansub_group_members hfgm
WHERE hfgm.id = ac.fansub_group_member_id;

-- Schritt C: NOT NULL setzen (nach Verifikation 0 NULLs)
ALTER TABLE anime_contributions ALTER COLUMN member_id SET NOT NULL;

-- Schritt D: Alten Unique-Key ablösen (neuer Constraint auf member_id statt fgsm_id)
ALTER TABLE anime_contributions DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;
ALTER TABLE anime_contributions
  ADD CONSTRAINT uq_anime_contribution_member
  UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, member_id, release_version_id);

-- Schritt E: fansub_group_member_id nullable machen (Übergangsphase)
ALTER TABLE anime_contributions ALTER COLUMN fansub_group_member_id DROP NOT NULL;
-- NICHT sofort droppen — öffentliche Projektion (Anime-Seite, Member-Profil) joinen noch darüber
```

**Schritt 2 (separater Plan, nach Frontend-Migration):**
- `fansub_group_member_id` deprecieren/droppen sobald alle Backend-Queries auf `member_id` umgestellt sind.

### `members`-Backfill für App-Member (D-02)

`fansub_group_members` (Migration 0073) hat **kein `member_id`-Feld**. App-Member sind mit `members` nur über `member_claims` (verified) oder `members.user_id` (Legacy) verknüpft. Der Backfill muss prüfen:

```sql
-- App-Member ohne members-Zeile identifizieren:
SELECT fgm.id, fgm.app_user_id
FROM fansub_group_members fgm
LEFT JOIN LATERAL (
  SELECT mc.member_id FROM member_claims mc
  WHERE mc.app_user_id = fgm.app_user_id AND mc.claim_status = 'verified'
  ORDER BY mc.verified_at DESC NULLS LAST LIMIT 1
) mc ON true
LEFT JOIN members m_legacy ON m_legacy.user_id = (
  SELECT au.legacy_user_id FROM app_users au WHERE au.id = fgm.app_user_id
)
WHERE mc.member_id IS NULL AND m_legacy.id IS NULL;
```

Für jede gefundene Zeile: neue `members`-Zeile anlegen (nickname aus `app_users.display_name`), dann `fansub_group_members` um eine `member_id`-Spalte erweitern (neue Migration). Dies entspricht D-02.

**Risiko:** `fansub_group_members` hat aktuell KEINE `member_id`-Spalte. Diese muss in einer eigenen Migration ergänzt werden, bevor der Backfill greift. Reihenfolge:
1. `members`-Backfill-Migration (neue Zeilen anlegen)
2. `fansub_group_members` um `member_id`-Spalte erweitern (FK auf `members(id)`)
3. Backfill `fansub_group_members.member_id`
4. Dann `anime_contributions.member_id`-Migration

### `fansub_group_member_roles.role` → FK (D-08)

Aktueller CHECK (Migration 0074):
```sql
-- VERIFIED: 0074
CHECK (role IN ('fansub_lead','project_lead','translator','timer','typesetter',
                'editor','encoder','raw_provider','quality_checker','designer'))
```

Alle diese Codes existieren in `role_definitions` (0085 + 0100 + 0103). Der Wechsel auf FK ist sicher:
```sql
ALTER TABLE fansub_group_member_roles DROP CONSTRAINT chk_fansub_group_member_roles_role;
ALTER TABLE fansub_group_member_roles
  ADD CONSTRAINT fk_fansub_group_member_roles_role_code
  FOREIGN KEY (role) REFERENCES role_definitions(code) ON DELETE RESTRICT;
```

**Prüfen:** Ob `role`-Spalte vom Typ `VARCHAR(40)` mit `role_definitions.code TEXT` kompatibel ist → in PostgreSQL 16 ja (implizite Typpromotion).

---

## 4. Coverage/Status-Daten — Zuverlässigkeit

### Badge „Einblick vorhanden/fehlt"
**Zuverlässig berechenbar.** `getAnimeFansubProjectNote(fansubId, animeId)` gibt `null` bei fehlendem Eintrag zurück. Kein Fake. Einzige Einschränkung: lazy load (erst beim Aufklappen), daher Badge erst nach Laden sichtbar oder Backend-Extension nötig.

### Badge „Mitwirkende N/M"
**Teilweise berechenbar.** N = `listAnimeContributions(fansubId, animeId).data.length`. M (Soll-Zahl) ist nicht in einem Feld gespeichert. „Mitwirkende fehlen" kann als `N === 0` definiert werden. „6/6" (Vollständigkeit) ist ohne erwartete Rollen-Zahl nicht zuverlässig.

**Empfehlung (D-12-konform):** Badge `Mitwirkende (N)` statt `Mitwirkende N/M` oder Binary-Badge `Mitwirkende vorhanden` / `Mitwirkende fehlen`.

### Badge „N Folgen"
**Zuverlässig berechenbar.** `getAdminFansubAnime` liefert `AdminFansubAnimeEntry[]`, deren `episode_count`-Feld (soweit im Backend gefüllt) oder über `releases.length` ableitbar. Prüfung nötig ob `episode_count` in `AdminFansubAnimeEntry` existiert.

### Badge „N offene Punkte"
**Nicht zuverlässig aus vorhandenen Daten ableitbar.** Das Konzept „offener Pflegepunkt" ist nicht in der DB modelliert. D-12: Nur UI-Struktur vorbereiten, Badge weglassen bis Datengrundlage klar ist.

---

## 5. Backend-Endpoints

### Bestehende Endpoints (alle VERIFIED)

| Route | Handler | Funktion |
|-------|---------|---------|
| `GET /admin/fansubs/:id/group-members` | `listGroupMembers` in api.ts | Nur `hist_fansub_group_members` |
| `GET /admin/fansubs/:id/anime/:animeId/contributions` | `FansubAnimeContributionsHandler.ListAnimeContributions` | Contributions mit member_display_name |
| `POST /admin/fansubs/:id/anime/:animeId/contributions` | `FansubAnimeContributionsHandler.CreateAnimeContribution` | Upsert; validiert `MemberBelongsToFansub` (hist-only!) |
| `GET /admin/fansubs/:id/anime/:animeId/notes` | Einblicke-Handler | AnimeFansubProjectNote oder null |
| `PUT /admin/fansubs/:id/anime/:animeId/notes` | Einblicke-Handler | Upsert AnimeFansubProjectNote |

### Notwendige Backend-Änderungen

**1. `MemberBelongsToFansub` erweitern (handler Z. 131–144):**
```go
// VERIFIED: fansub_anime_contributions_handler.go:131-144
// Heute: nur hist_fansub_group_members prüfen
// Neu: ODER fansub_group_members (App-Member) mit member_id-Anker prüfen
```
Nach D-01: Die Validierung muss beide Quellen prüfen (`hist_fansub_group_members` + `fansub_group_members` nach Backfill via `members.id`).

**2. Vereinheitlichter `listGroupMembers`-Endpoint:**
Heute liefert `/admin/fansubs/:id/group-members` nur `HistGroupMemberDisplayRow[]`. Für das Modal und die Matrix muss er auch App-Member liefern — beides über `members.id`. Neuer Payload:
```go
type UnifiedGroupMember struct {
    MemberID    int64  `json:"member_id"`    // members.id — Anker
    DisplayName string `json:"display_name"` // aus members.nickname
    Source      string `json:"source"`       // "hist" | "app"
    HasAppAccount bool `json:"has_app_account"` // für UI-Hinweis
    GroupRoles  []string `json:"group_roles"`   // aus hist_/fansub_group_member_roles
}
```
Alternativ: neuer Endpoint `/admin/fansubs/:id/unified-members`.

**3. Contribution-Upsert auf `member_id` umstellen:**
`animeContributionCreateRequest.FansubGroupMemberID` muss auf `member_id` (members.id) umgestellt werden. DTO-Feld umbenennen → Breaking Change für Frontend!

**4. `AnimeContributionDisplayRow.FansubGroupMemberID` → `MemberID`:**
Backend-DTO und Frontend-Typ `AnimeContribution.fansub_group_member_id` werden zu `member_id`.

### Vorhandene Repo-Patterns als Vorlage

- Split-Datei-Pattern: `anime_contributions_member_repository.go` (450-Zeilen-Limit, Phase 67-02)
- Upsert-Pattern: `anime_contributions_upsert_repository.go`
- Display-Row mit JOIN: `anime_contributions_repository.go` Z. 87–117

---

## 6. Frontend-Typen-Migration

### Betroffene Types (VERIFIED)

```typescript
// frontend/src/types/fansub.ts:618-654
export interface AnimeContribution {
  id: number;
  fansub_group_member_id: number;  // → member_id
  member_display_name: string;
  // ...
}

export interface UpsertAnimeContributionRequest {
  fansub_group_member_id: number;  // → member_id
  // ...
}
```

`AnimeContributionModal.tsx` Z. 76–84 liest `contribution.fansub_group_member_id` zum Initialisieren der Sets. Diese müssen auf `member_id` umgestellt werden.

### `FANSUB_GROUP_ROLE_OPTIONS` (VERIFIED: fansub.ts Z. 397)
Enthält alle operativen Rollen und `fansub_lead`. `ANIME_CONTRIBUTION_ROLES` in `AnimeContributionModal.tsx` Z. 21–23 filtert `fansub_lead` bereits heraus. Nach D-07 Umstellung auf Katalog-API (Serverside) ist möglich, aber nicht zwingend für V1 — statische Liste bleibt bis Katalog-Endpoint bereit ist.

---

## Architektur-Diagramm

```
Fansub-Leader öffnet Tab "Anime & Veröffentlichungen"
          │
          ▼
   page.tsx (releases-Tab)
   getAdminFansubAnime(fansubId)
          │
          ▼
   Projektliste (releaseGroups)
   ┌─────────────────────────────────────────┐
   │  [Anime-Titel]  [Status-Badges]  [Mitwirkende] [Einblick]  │
   │  ↕ aufklappen                                               │
   │  ┌──────────────────────────────────┐                       │
   │  │  Projektstatus-Kopf              │                       │
   │  │  ├ Mitwirkende-Badge             │                       │
   │  │  └ Einblick-Badge                │                       │
   │  │  AnimeProjectNoteWorkspace       │ ← AnimeProjectNotesSection
   │  │  ├ Einblick-Text / Empty-State   │   getAnimeFansubProjectNote()
   │  │  └ [Bearbeiten / Hinzufügen]     │   upsertAnimeFansubProjectNote()
   │  │  Releases/Episoden-Liste         │ ← bestehend
   │  └──────────────────────────────────┘
   └─────────────────────────────────────────┘
          │
          ▼ [Mitwirkende]-Button
   AnimeContributionModal
   listGroupMembers(fansubId)         → unified-members (neu: App+hist)
   listAnimeContributions(fansubId, animeId)
```

---

## Projektstruktur (relevante Dateien)

```
frontend/src/app/admin/fansubs/[id]/edit/
├── page.tsx                          # Tab-Logik, MAIN_TABS, openAnimeContributions
├── AnimeContributionModal.tsx        # Mitwirkende-Modal (member_id-Migration)
├── AnimeProjectNotesSection.tsx      # Einblicke (UI-Primitives-Fix, Integration)
├── FansubEdit.module.css             # Bestehende CSS-Klassen
└── [neu] ProjectCockpitBadges.tsx    # Status-Badges (< 450 Zeilen Limit)

backend/internal/handlers/
├── fansub_anime_contributions_handler.go   # MemberBelongsToFansub erweitern
└── fansub_contributions_validation.go      # Request-Struct: fgsm_id → member_id

backend/internal/repository/
├── anime_contributions_repository.go       # DisplayRow: fgsm_id → member_id
├── anime_contributions_upsert_repository.go  # Upsert auf member_id
└── hist_group_members_repository.go        # Unified-List ergänzen

database/migrations/
├── 0104_*.up.sql   # members-Backfill + fansub_group_members.member_id
├── 0105_*.up.sql   # anime_contributions.member_id + Backfill
└── 0106_*.up.sql   # fansub_group_member_roles: CHECK → FK
```

---

## Don't Hand-Roll

| Problem | Nicht bauen | Stattdessen |
|---------|-------------|-------------|
| Einblick laden/speichern | Neue Fetch-Logik | `getAnimeFansubProjectNote` + `upsertAnimeFansubProjectNote` (vorhanden) |
| Rollen-Auswahl | Eigene Rollen-Liste | `FANSUB_GROUP_ROLE_OPTIONS` aus `fansub.ts` (vorhanden) |
| Auth-Header | Manueller Bearer | `authorizedFetch` über `api.ts`-Seam |
| RichText rendern | Eigener Renderer | `RichTextRenderer` aus `@/components/editor` |
| Buttons/Badges/Selects | Native HTML | `@/components/ui`: `Button`, `Badge`, `Select`, `FormField`, `Modal` |
| Tab-Navigation | Eigene URL-Manipulation | `useRouter` + `searchParams`-Pattern (wie `ReadinessTab.useTabNavigation`) |

---

## Common Pitfalls

### Pitfall 1: Native `<select>` / `<button>` in `AnimeProjectNotesSection.tsx`
**Was passiert:** `AnimeProjectNoteForm` (Z. 216–240) nutzt native `<select>` für Sichtbarkeit und Status; `AnimeProjectNotePreview` nutzt native `<button>`. Das verletzt CLAUDE.md.
**Warum:** Historischer Altfall aus Phase 40.
**Vermeidung:** Beim Integrieren zwingend auf `<Select>` und `<Button>` aus `@/components/ui` migrieren. ESLint warnt bereits (`no-restricted-syntax`).

### Pitfall 2: `listGroupMembers` liefert nur historische Member
**Was passiert:** Nach der members.id-Migration würde `AnimeContributionModal` weiterhin nur hist-Member zeigen — App-Member bleiben unsichtbar.
**Warum:** `listGroupMembers` ruft `hist_fansub_group_members` ab; App-Member in `fansub_group_members` sind getrennt.
**Vermeidung:** Neuen oder erweiterten Endpoint implementieren der beide Quellen über `members.id` vereint.

### Pitfall 3: Unique-Key-Kollision beim Backfill
**Was passiert:** Nach Ergänzung des `member_id`-Felds und neuem Unique-Key `(fansub_group_id, anime_id, member_id, release_version_id)` können Doppeleinträge entstehen, wenn für dieselbe Person mehrere `hist_fansub_group_members`-Einträge (über verschiedene member_ids) existierten.
**Warum:** `NULLS NOT DISTINCT` hilft nur bei NULL — wenn zwei echte member_id-Werte gleich sind, kollidiert der Key.
**Vermeidung:** Vor Migration: `SELECT member_id, fansub_group_id, anime_id, COUNT(*) FROM ... GROUP BY ... HAVING COUNT(*) > 1` prüfen.

### Pitfall 4: SectionKey-Union-Typ in page.tsx nicht bereinigt
**Was passiert:** `"anime-projekte"` bleibt im Union-Typ `SectionKey` aber nicht mehr in `MAIN_TABS`, führt zu TypeScript-Warnings und totem Code.
**Vermeidung:** Union `SectionKey` und `sectionOpenState`-Initialisierung bereinigen.

### Pitfall 5: `ReadinessTab` verweist nicht auf `anime-projekte`
**Was passiert:** `ReadinessTab.tsx` nutzt `navigateToTab('releases')` (Z. 162–163) — kein Verweis auf `anime-projekte`. Nach Tab-Merge korrekt. Kein Handlungsbedarf, aber prüfen ob weitere Links auf `anime-projekte` existieren.
**Status:** Grep über gesamtes `frontend/`-Verzeichnis zeigt: `"anime-projekte"` nur in `page.tsx` — kein weiterer Verweis. Sauber.

### Pitfall 6: `fansub_group_member_roles.role` VARCHAR(40) vs role_definitions.code TEXT
**Was passiert:** FK-Constraint zwischen VARCHAR(40) und TEXT funktioniert in PostgreSQL — kein Fehler, aber explizit vermerken falls zukünftig ein neuer Code > 40 Zeichen eingeführt wird.
**Vermeidung:** Bei der FK-Migration den Typ auf `TEXT` angleichen.

---

## Validierungs-Architektur

### Test-Framework
| Property | Wert |
|----------|------|
| Framework | Vitest 3 |
| Config | `frontend/vitest.config.ts` |
| Schnell-Run | `npx vitest run src/app/admin/fansubs` |
| typecheck | `npm run typecheck` |

### Phase-Requirements → Test-Map

| Req | Verhalten | Test-Typ | Befehl |
|-----|-----------|----------|--------|
| D-13 | `anime-projekte` kein Main-Tab mehr | Unit (component) | Vitest: MAIN_TABS enthält kein `anime-projekte` |
| D-13 | Legacy `?tab=anime-projekte` → `tab=releases` | Unit (parseMainTab) | Vitest: `parseMainTab("anime-projekte") === "releases"` |
| D-11 | Projektkarte zeigt Status-Badges | Component test | Vitest: Badge-Render bei contributions.length > 0 |
| D-10 | Einblick im aufgeklappten Projektbereich | Component test | Vitest: `AnimeProjectNoteWorkspace` rendered nach expand |
| D-01 | Contributions per member_id gespeichert | Integration | Go-Test: AnimeContributionsRepository upsert |
| Allg. | Bestehende Fansub-Edit-Tests bleiben grün | Regression | `npx vitest run src/app/admin/fansubs` |

### Wave 0 Gaps
- [ ] `AnimeProjectNotesSection.test.tsx` — covers UI-Primitives-Migration (Select/Button)
- [ ] `parseMainTab`-Erweiterung für `"anime-projekte"` → `"releases"` im bestehenden page-Test

---

## Sicherheits-Domain

| ASVS-Kategorie | Relevant | Standard-Kontrolle |
|----------------|---------|-------------------|
| V4 Access Control | Ja | `CanForFansubGroup(MembersView/MembersManage)` bereits in Handler |
| V5 Input Validation | Ja | Role-Code-Validierung via `RoleCodeExistsForContext` bereits vorhanden |
| V2 Authentication | Nein (bereits in Middleware) | `authMiddleware` auf allen Admin-Routen |

---

## Offene Fragen

1. **`episode_count`-Feld in `AdminFansubAnimeEntry`**
   - Was wir wissen: `getAdminFansubAnime` liefert `AdminFansubAnimeEntry[]`
   - Unklar: Hat `AdminFansubAnimeEntry` ein `episode_count`-Feld? Grep-Prüfung in `frontend/src/types/admin.ts` vor Implementierung nötig.
   - Empfehlung: Wenn vorhanden → Badge „N Folgen" direkt aus `anime.episode_count`. Wenn nicht → aus `releases.length` ableiten oder weglassen.

2. **Standard-Team-Tabelle (D-04)**
   - Was wir wissen: Konzept „feste Stamm-Crew pro Gruppe" ist gelockt, aber kein Schema existiert.
   - Unklar: Eigene Tabelle `fansub_group_default_crew` oder Erweiterung via `fansub_group_member_roles`-Flag?
   - Empfehlung: Neue Tabelle `fansub_group_default_crew (id, fansub_group_id, member_id, role_code)` — einfach, klar, erweiterbar.

3. **Neue Migrationsnummern**
   - Letzte bekannte Migration: `0103`. Nächste freie Nummer prüfen vor Anlegen.

4. **`has_note`-Flag in `getAdminFansubAnime`-Response**
   - Für zuverlässige „Einblick vorhanden"-Badges im zusammengeklappten Zustand: Backend-Extension oder lazy load?
   - D-12-konform: Lazy load ist akzeptabel. Backend-Extension vermeidet N+1-Fetches.

---

## Annahmen-Log

| # | Behauptung | Abschnitt | Risiko bei Falschheit |
|---|-----------|---------|----------------------|
| A1 | `AdminFansubAnimeEntry` hat kein `episode_count`-Feld | Coverage/Status | Badge „N Folgen" müsste anders implementiert werden |
| A2 | Keine weiteren Verweise auf `"anime-projekte"` außer `page.tsx` | Routing | Legacy-Link auf anderem Pfad würde 404 produzieren |
| A3 | `fansub_group_members` hat keine `member_id`-Spalte (noch nicht migriert) | DB-Migration | Wenn bereits vorhanden: Backfill-Migration kann vereinfacht werden |

---

## Umgebungs-Verfügbarkeit

Skipped (reine Code-/DB-Migration, kein neuer externer Service).

---

## State of the Art

| Alter Ansatz | Aktueller Ansand | Geändert | Impact |
|---|---|---|---|
| `anime_contributions` ankert auf `hist_fansub_group_members.id` | Anker auf `members.id` (Phase 82) | Phase 82 | App-Member buchbar |
| Separate Main-Tabs für Releases und Einblicke | Einstieg Projekt-Cockpit (ein Tab) | Phase 82 | Weniger Tab-Switching |
| `fansub_group_member_roles.role` CHECK-Constraint | FK auf `role_definitions(code)` | Phase 82 | Katalog-getrieben |

**Veraltet/abzulösen:**
- `"anime-projekte"` als `SectionKey` in `page.tsx` — wird entfernt
- `animeContributionCreateRequest.FansubGroupMemberID` (hist-only) — wird auf `member_id` umgestellt

---

## Quellen

### Primary (HIGH confidence)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — Tab-Logik, MAIN_TABS, openAnimeContributions, Releases-Tab-Render
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` — Einblicke-Komponente, native-select-Altfall
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` — Modal-Struktur, member-keyed state
- `frontend/src/lib/api.ts` Z. 6899–7006, 7241–7266, 7518–7578 — API-Helper für Einblicke, Members, Contributions
- `frontend/src/types/fansub.ts` — AnimeContribution, HistFansubGroupMember, FANSUB_GROUP_ROLE_OPTIONS
- `frontend/src/types/fansubNotes.ts` — AnimeFansubProjectNote DTO
- `database/migrations/0082–0091.up.sql`, `0073`, `0074`, `0085`, `0100`, `0103` — Tabellen-Schema, Constraints
- `backend/internal/handlers/fansub_anime_contributions_handler.go`, `fansub_contributions_validation.go`
- `backend/internal/repository/anime_contributions_repository.go`, `_member_repository.go`
- `backend/internal/repository/fansub_group_app_members_repository.go` — members-Verknüpfung via Claims
- `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx` — Tab-Navigation-Pattern

### Secondary (MEDIUM confidence)
- `.planning/phases/82-*/82-CONTEXT.md` — gelockte Entscheidungen
- `.planning/phases/82-*/82-EINBLICKE-AUFTRAG.md` — verbindlicher UX-Auftrag
- `.planning/STATE.md` — Projektstand, Phase-Decisions-History

---

## Metadaten

**Confidence-Breakdown:**
- Standard-Stack: HIGH — alle Libraries direkt aus package.json/go.mod verifiziert
- Architektur: HIGH — direkter Code-Befund, kein Raten
- Pitfalls: HIGH — aus Code-Befunden abgeleitet, nicht aus Training
- Coverage-Status: MEDIUM — `episode_count`-Feld ungeprüft (A1)

**Research-Datum:** 2026-06-11
**Gültig bis:** 2026-07-11 (stabiler Stack)
