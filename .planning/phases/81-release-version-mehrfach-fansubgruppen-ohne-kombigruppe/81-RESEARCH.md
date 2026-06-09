# Phase 81: Release-Version Mehrfach-Fansubgruppen ohne Kombigruppe — Research

**Researched:** 2026-06-09
**Domain:** Go backend (Repository/Handler), PostgreSQL migrations, Next.js frontend (types, components)
**Confidence:** HIGH (alle Befunde durch direkten Code-Lesezugriff verifiziert)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Kooperation = mehrere Zeilen in `release_version_groups`, eine Zeile je echter Gruppe. Kein neues Kombigruppen-Modell.
- **D-02:** `group_type='collaboration'` und `fansub_collaboration_members` werden vollständig abgeschafft. `upsertImportCollaborationGroup` und `buildImportCollaborationName` entfallen.
- **D-03:** Kein `is_primary`, keine Reihenfolge — alle beteiligten Gruppen sind gleichwertig.
- **D-04:** Sortierung neutral und stabil: alphabetisch nach Anzeigename; Tiebreaker: `fansub_group_id`.
- **D-05:** Schreibpfad schreibt für jede echte Gruppe genau eine Junction-Zeile (Upsert), nicht mehr übergebene werden entfernt. Gilt für Editor-PATCH und Jellyfin-Import.
- **D-06:** Alle übergebenen IDs werden gegen `fansub_groups` validiert; nicht existierende IDs = Fehler. Freitext-Gruppen dürfen einzelne echte Gruppen anlegen, keine zusammengesetzten.
- **D-07:** `anime_fansub_groups` wird nur mit echten Mitglieds-IDs befüllt. Kein EffectiveGroup/Combo-ID.
- **D-08:** `LIMIT 1` entfällt; pro Version alle Gruppen aggregiert (sortiert nach D-04). DTO `FansubGroup *FansubGroupSummary` → `FansubGroups []FansubGroupSummary`. Kein Singular-Alias.
- **D-09:** Release-Version-Ansicht zeigt mehrere gleichwertige Chips. Globale `@/components/ui`-Primitives (Pflicht). Kein „A & B" als eigene Gruppe.
- **D-10:** Gruppen-Profilseite: Release-Version erscheint bei jeder beteiligten Gruppe. „Kooperation mit …" / aktuelle Gruppe hervorgehoben, keine Hierarchie.
- **D-11:** Forward-only Migration: Kombigruppen über `fansub_collaboration_members` auf Member-IDs auflösen; in `release_version_groups` + `anime_fansub_groups` materialisieren (ON CONFLICT DO NOTHING); danach Kombigruppen-Zeilen löschen.
- **D-12:** Kombigruppen bevorzugt deaktivieren (`status = 'inactive'` oder `'dissolved'`), nur löschen wenn keine Fremdreferenzen mehr bestehen.

### Claude's Discretion

- Konkrete SQL-Aggregationsform (`json_agg` vs. Array vs. zweiter Query)
- Aufteilung in Migrationsdateien
- Exakte DTO-Benennung
- Test-Struktur
- Visuelle Ausgestaltung der Chips/Kooperations-Hinweise (innerhalb D-09/D-10, kann `/gsd:ui-phase` finalisieren)

### Deferred Ideas (OUT OF SCOPE)

- `role` / `contribution_type` pro Gruppe (eigene spätere Phase)
- Freitext-`note` pro Zuordnung
- `is_primary` / Hauptgruppen-Markierung — bewusst verworfen (D-03)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P81-SC1 | Backend-Schreibpfad (Editor-PATCH + Jellyfin-Import) schreibt direkte N-fach-Junction-Upserts, keine Kombigruppe | Q3: `resolveImportFansubSelectionFromInputs` + `syncEpisodeVersionSelectedGroups` umbauen; `upsertImportCollaborationGroup` entfernen |
| P81-SC2 | `LIMIT 1` entfernt; alle Gruppen pro Version aggregiert; DTO `FansubGroups []FansubGroupSummary` in allen Repos/Models/Contracts/TS-Typen | Q2/Q4: vollständige Inventarliste der 8 betroffenen Lese-Funktionen + alle DTO-Stellen |
| P81-SC3 | Kollaborations-Entität entfernt: `group_type='collaboration'`, `fansub_collaboration_members`, erzeugende Code-Pfade | Q1: FK-Inventar; Q6: Migrations-Sequenz; alle Code-Pfade in Q3/Q5 |
| P81-SC4 | Frontend-Anzeige: Release-Version-Chips (D-09) + Gruppen-Profilseite „Kooperation mit …" (D-10) | Q5: Display-Stellen + Chip-Primitiv `<Badge>` |
| P81-SC5 | Bestandsdaten-Migration: Kombigruppen auf Mitglieds-IDs mappen, in Junction-Tabellen materialisieren, Kombigruppen deaktivieren | Q6: Migrations-Sequenz mit nächster freier Nr. 0101 |
| P81-SC6 | Nicht-existierende IDs führen zu Fehler (kein stilles Anlegen) | Q3: `lookupImportFansubGroupByID` gibt `ErrNotFound` zurück → Validator |
| P81-SC7 | Datenmigration muss alle FK-Quellen auf `fansub_groups` berücksichtigen | Q1: vollständiges FK-Inventar (13 Tabellen) |
| P81-SC8 | Tests Backend + Frontend | Q7: betroffene Tests + Muster |

</phase_requirements>

---

## Summary

Phase 81 kehrt das in Phase 21 (P21-SC3) absichtlich eingebaute Kombigruppen-Verhalten um. Das Datenbankschema (`release_version_groups` mit Composite-PK) kann N Gruppen pro Release-Version bereits halten — der Umbau betrifft ausschließlich die Code-Schichten darüber: Schreibpfad, Lesepfad, DTOs, Contracts, TS-Typen und Frontend-Anzeige.

Die strukturellen Eingriffe verteilen sich auf drei Cluster: **(1) Schreibpfad** — `resolveImportFansubSelectionFromInputs` und `syncEpisodeVersionSelectedGroups` schreiben statt einer EffectiveGroup-Zeile N Member-Zeilen direkt; `upsertImportCollaborationGroup` und `buildImportCollaborationName` entfallen vollständig. **(2) Lesepfad** — mindestens 8 Repository-Funktionen in 5 Dateien ersetzen den LIMIT-1-JOIN durch eine Aggregation und geben `FansubGroups []FansubGroupSummary` statt `FansubGroup *FansubGroupSummary` zurück. **(3) Datenmigration** — zwei SQL-Dateien (Nummern 0101/0102) lösen Kombigruppen auf ihre Mitglieds-IDs auf, materialisieren diese in `release_version_groups` und `anime_fansub_groups`, und deaktivieren anschließend die nun orphaned Kombigruppen.

**Primary recommendation:** Wave-Reihenfolge: Schema-Migration zuerst (idempotent, rückwärtskompatibel), dann Backend-Schreibpfad, dann Backend-Lesepfad + DTO-Kaskade, dann Frontend-Display, dann Tests und Cleanup der Kollaborations-API-Endpunkte.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Junction-Zeilen schreiben (N Gruppen) | API / Backend (Repository) | — | Transaktionaler Upsert, atomares Löschen-und-Neu-Schreiben |
| Gruppen-Aggregation beim Lesen | API / Backend (Repository) | — | SQL `json_agg` / Array-Aggregation ersetzt LIMIT 1 |
| DTO-Definition (Go models) | API / Backend (Models) | Shared Contracts (YAML) | Quelle der Wahrheit für alle Downstream-Typen |
| TS-Typen | Frontend | — | Abgeleitet von Go-Models/OpenAPI, muss synchron gehalten werden |
| Chip-Anzeige (Mehrfachgruppen) | Browser / Client | — | Rein visuelle Transformation, keine Server-Logik |
| Gruppen-Profil „Kooperation mit …" | Browser / Client | Frontend Server (SSR) | Öffentliche Route ist serverseitig gerendert (`/fansubs/[slug]`) |
| Datenmigration | Database / Storage | — | Forward-only SQL, einmalig, append-only Konvention |

---

## Forschungsfrage 1: Vollständiges FK/Referenz-Inventar für `fansub_groups`

[VERIFIED: direkter Migrations-Scan]

Alle Tabellen mit `REFERENCES fansub_groups(id)`:

| Tabelle | Spalte | ON DELETE | Migration | Relevanz für Phase 81 |
|---------|--------|-----------|-----------|----------------------|
| `fansub_members` | `fansub_group_id` | CASCADE | 0010 | Kollaborationsgruppen können Mitglieder haben — bei Deaktivierung kein Problem |
| `anime_fansub_groups` | `fansub_group_id` | CASCADE | 0011 | **Direkt betroffen**: Kombigruppen-Zeilen müssen durch Mitglieds-IDs ersetzt werden (D-07/D-11) |
| `fansub_collaboration_members` | `collaboration_id` | CASCADE | 0015 | **Zu entfernen** in D-02/D-11 |
| `fansub_collaboration_members` | `member_group_id` | CASCADE | 0015 | Geht mit der Tabelle weg |
| `fansub_group_aliases` | `fansub_group_id` | CASCADE | 0014 | Harmlos; Kombigruppen können Aliases haben — wegfallen bei Deaktivierung |
| `fansub_group_media` | `group_id` | CASCADE | 0026 | Harmlos |
| `release_version_groups` | `fansub_group_id` | CASCADE | 0035 | **Direkt betroffen**: Kombigruppen-Zeilen ersetzen durch Member-Zeilen (D-11) |
| `fansub_group_links` | `group_id` | CASCADE | 0044 | Harmlos |
| `group_members` | `group_id` | CASCADE | 0044 | Harmlos |
| `theme_segments` | `fansub_group_id` | CASCADE | 0049 | Achtung: `theme_segments` verknüpft ggf. auf Kombigruppen-ID — prüfen vor Löschen |
| `segment_library` | `fansub_group_id` | CASCADE | 0053 | Analog `theme_segments` |
| `fansub_group_notes` | `fansub_group_id` | CASCADE | 0061 | Harmlos |
| `anime_fansub_project_notes` | `fansub_group_id` | CASCADE | 0063 | Harmlos |
| `member_group_stories` | `fansub_group_id` | CASCADE | 0062 | Harmlos |
| `fansub_group_history` | `fansub_group_id` | CASCADE | 0084 | Harmlos |
| `hist_fansub_group_members` | `fansub_group_id` | RESTRICT | 0082 | **Kritisch**: RESTRICT blockiert DELETE — muss geprüft werden |
| `anime_contributions` | `fansub_group_id` | RESTRICT | 0086 | **Kritisch**: RESTRICT blockiert DELETE — muss geprüft werden |
| `fansub_group_members` | `fansub_group_id` | CASCADE | 0073 | Harmlos |
| `fansub_group_invitations` | `fansub_group_id` | CASCADE | 0076 | Harmlos |
| `member_claim_invitations` | `fansub_group_id` | CASCADE | 0092 | Harmlos |

**`status`-Spalte auf `fansub_groups`:** Ja, vorhanden. Constraint aus `0009_fansub_groups.up.sql`:
```sql
CHECK (status IN ('active', 'inactive', 'dissolved'))
```
D-12 kann Kombigruppen auf `'dissolved'` setzen (semantisch korrekt: existiert nicht mehr als Konzept). Hard-Delete ist nur sicher, wenn `hist_fansub_group_members` und `anime_contributions` keine Zeilen mit der Kombigruppen-ID enthalten (beide haben ON DELETE RESTRICT).

**Guard-Bedingung vor Hard-Delete:**
```sql
NOT EXISTS (SELECT 1 FROM hist_fansub_group_members WHERE fansub_group_id = collab_id)
AND NOT EXISTS (SELECT 1 FROM anime_contributions WHERE fansub_group_id = collab_id)
AND NOT EXISTS (SELECT 1 FROM theme_segments WHERE fansub_group_id = collab_id)
AND NOT EXISTS (SELECT 1 FROM segment_library WHERE fansub_group_id = collab_id)
```
Wenn eine dieser Bedingungen nicht erfüllt ist → nur `status = 'dissolved'`, kein DELETE.

---

## Forschungsfrage 2: Vollständiges Lesepfad-Inventar

[VERIFIED: direkte Code-Lektüre aller 5 betroffenen Repository-Dateien]

### 2a. `episode_version_repository.go` (1246 Zeilen)

| Funktion | Zeilen | Aktuelles Problem | Erforderliche Änderung |
|----------|--------|-------------------|----------------------|
| `GetByID` | ~L293–366 | LEFT JOIN rvg→fg; GROUP BY fg.id/slug/name/logo_url; **LIMIT 1** am Ende der Query; `scanReleaseVariantAsEpisodeVersion` scannt nur einen optionalen Gruppen-Block | Query muss `json_agg(...)` oder separaten Array-Query liefern; GROUP BY fg.* entfällt |
| `listReleaseVariantsByAnimeID` | ~L141–289 | LEFT JOIN rvg→fg; GROUP BY fg.id/slug/name/logo_url; `scanReleaseVariantAsEpisodeVersion` für jede Zeile | Analog: Aggregation oder zweiter Query; Scan-Funktion liest Array statt Einzelgruppe |
| `scanReleaseVariantAsEpisodeVersion` | L902–945 | Scannt `&groupID, &groupSlug, &groupName, &groupLogoURL` als optionale Einzelwerte; setzt `item.FansubGroup = &models.FansubGroupSummary{...}` | Muss auf `item.FansubGroups = []models.FansubGroupSummary{...}` umgestellt werden; alternativ: Funktion entfernen und durch Aggregations-Scan ersetzen |

**DTO-Feld in `models.EpisodeVersion`:**
```go
// Aktuell (episode_version.go L17):
FansubGroup *FansubGroupSummary `json:"fansub_group,omitempty"`
// Neu (D-08):
FansubGroups []FansubGroupSummary `json:"fansub_groups,omitempty"`
```

### 2b. `admin_content_fansub_releases.go` (283 Zeilen)

Betroffen: **kein Lesepfad für `FansubGroup` im DTO** — Queries scopen über `rvg.fansub_group_id = $1`, d.h. sie filtern bereits nach einer Gruppe. DTO `AdminFansubReleaseSummary` enthält `FansubGroupID int64` und `FansubName string` (keine `*FansubGroupSummary`). Diese Datei braucht **keine DTO-Änderung**, funktioniert weiterhin korrekt (scoped per Group-ID).

### 2c. `fansub_repository.go` (2323 Zeilen)

| Funktion | Problem | Änderung |
|----------|---------|----------|
| `GetPublicProfileBySlug` → Zweig `group.GroupType == FansubGroupTypeCollaboration` | Gibt frühzeitig mit `CollaborationMembers` zurück | **Zweig entfällt komplett** (D-02). Der Code-Pfad ist toter Code nach der Migration. |
| `ListCollaborationMembers` (L1497–1547) | Liest `fansub_collaboration_members` | Funktion kann nach Migration entfernt werden (oder als no-op erhalten, bis alle Callsites weg sind) |

### 2d. `group_release_media_repository.go`

`GetPublicReleaseMedia` filtert per `rvg.fansub_group_id = $2` — kein Singular-Group-DTO, kein `LIMIT 1` auf Gruppen-Ebene. **Keine DTO-Änderung nötig.** Funktioniert nach Migration korrekt, da reale Gruppen-IDs in `release_version_groups` stehen.

### 2e. `contributor_dashboard_repository.go` (533 Zeilen)

| Funktion | Problem | Änderung |
|----------|---------|----------|
| `listContributorGroupReleaseVersions` | Berechnet `is_coop` bereits korrekt als `COUNT(DISTINCT rvg_all.fansub_group_id) > 1` | Funktioniert nach Migration out-of-the-box |
| `listContributorGroupAnime` | Analog, `is_coop` bereits korrekt berechnet | Keine Änderung nötig |

`ContributorReleaseVersionSummary.is_coop bool` in `frontend/src/types/contributor.ts` L49 ist bereits vorhanden und korrekt.

### 2f. `anime_contributions_public_versions_repository.go` / `anime_contributions_public_repository.go`

Joinst über `ac.fansub_group_id` auf `fansub_groups`, nicht auf `release_version_groups.fansub_group_id` direkt. **Nicht betroffen** — die Gruppen-Aggregation für Contributions erfolgt schon korrekt per `fansub_group_id`.

### Zusammenfassung der zwingend zu ändernden Lesepfade

| Datei | Funktion | DTO-Feld wird zu |
|-------|----------|-----------------|
| `episode_version_repository.go` | `GetByID` | `FansubGroups []FansubGroupSummary` |
| `episode_version_repository.go` | `listReleaseVariantsByAnimeID` | `FansubGroups []FansubGroupSummary` |
| `episode_version_repository.go` | `scanReleaseVariantAsEpisodeVersion` | Scan-Logik für Array/JSON |
| `models/episode_version.go` | `EpisodeVersion.FansubGroup` | Feld umbenennen/ersetzen |
| `models/episode_version.go` | `EpisodeVersionEditorContext.CollaborationGroupID` | Feld entfernen (entfällt mit D-02) |

---

## Forschungsfrage 3: Schreibpfad-Konsolidierung

[VERIFIED: direkter Code-Lesezugriff auf beide Schreibpfad-Dateien]

### Aktueller Schreibpfad (vereinfacht)

```
resolveImportFansubSelectionFromInputs(inputs)
  → für jede Input: resolveImportSelectedFansubGroup (lookup by ID oder upsert by Name)
  → if len(memberGroups) == 1: EffectiveGroup = memberGroups[0]
  → if len(memberGroups) > 1: EffectiveGroup = upsertImportCollaborationGroup(members)  ← ENTFÄLLT

upsertReleaseVersionGroup / syncEpisodeVersionSelectedGroups:
  DELETE ... WHERE fansub_group_id <> EffectiveGroup.ID  ← falsch für N Gruppen
  INSERT ... (releaseVersionID, EffectiveGroup.ID)

buildAnimeFansubLinkGroupIDs(selection):
  appends EffectiveGroup.ID  ← würde Combo-ID eintragen, falsch
  appends MemberGroup IDs
```

### Neuer Schreibpfad

```go
// Neue Signatur — kein EffectiveGroup mehr nötig
func resolveImportFansubMemberGroups(
    ctx context.Context,
    tx pgx.Tx,
    inputs []models.SelectedFansubGroupInput,
) ([]resolvedImportFansubGroup, error)

// Aus resolveImportFansubSelectionFromInputs wird direkt:
func upsertReleaseVersionGroups(
    ctx context.Context,
    tx pgx.Tx,
    releaseVersionID int64,
    memberGroups []resolvedImportFansubGroup,
) error {
    // 1. Aktuelle Group-IDs holen
    // 2. DELETE WHERE fansub_group_id NOT IN (new IDs)
    // 3. INSERT ... ON CONFLICT DO NOTHING für jede neue Gruppe
}
```

**D-06 Validierung:** `lookupImportFansubGroupByID` (bereits vorhanden, L372–385) gibt `ErrNotFound` zurück, wenn die ID nicht existiert. Dieses Verhalten bleibt erhalten und wird zum einzigen Validierungspfad für ID-basierte Eingaben.

**Freitext bleibt:** `upsertImportFansubGroup(ctx, tx, name, preferredSlug, models.FansubGroupTypeGroup)` bleibt für den Name-Pfad erhalten, erzeugt aber niemals mehr `FansubGroupTypeCollaboration`.

**`buildAnimeFansubLinkGroupIDs` → Vereinfachung:**
```go
// Alt: union von EffectiveGroup + MemberGroups
// Neu: nur MemberGroups (= die echten Gruppen)
func buildAnimeFansubLinkGroupIDs(memberGroups []resolvedImportFansubGroup) []int64 {
    // dedupliziert, sortiert nach ID
}
```

**`ensureAnimeFansubGroupLinks` bleibt** in seiner Signatur kompatibel, akzeptiert nur noch `[]int64` statt `resolvedImportFansubSelection`.

### `syncEpisodeVersionSelectedGroups` (episode_version_repository.go L1178)

Aktuell (L1207–1228): löscht alle außer EffectiveGroup.ID, upsert EffectiveGroup.ID einmal.

Neu:
```go
func syncEpisodeVersionSelectedGroups(
    ctx context.Context,
    tx pgx.Tx,
    releaseVersionID int64,
    animeID int64,
    fansubGroups []models.SelectedFansubGroupInput,
    fansubGroupID *int64,
    reset bool,
) error {
    if !reset { return nil }
    memberGroups, err := resolveMemberGroupsForSync(ctx, tx, fansubGroups, fansubGroupID)
    if err != nil { return err }
    return upsertReleaseVersionGroupsForSync(ctx, tx, releaseVersionID, animeID, memberGroups)
}
```

Der gemeinsam genutzte Resolver heißt künftig `resolveMemberGroupsForSync` (oder ähnlich) und gibt direkt `[]resolvedImportFansubGroup` zurück, ohne den `resolvedImportFansubSelection`-Wrapper.

---

## Forschungsfrage 4: DTO/Contract-Kaskade

[VERIFIED: alle Dateien direkt gelesen]

### Go-Models

| Datei | Feld | Änderung |
|-------|------|----------|
| `models/episode_version.go` L17 | `FansubGroup *FansubGroupSummary` | → `FansubGroups []FansubGroupSummary` |
| `models/episode_version.go` L119 | `EpisodeVersionEditorContext.CollaborationGroupID *int64` | Feld entfernen |
| `models/fansub.go` | `FansubGroupTypeCollaboration` Konstante | Entfernen (oder als deprecated belassen bis alle Callsites bereinigt) |
| `models/fansub.go` | `CollaborationMember` struct | Entfernen (nach Entfernung der Tabelle) |
| `models/fansub.go` | `FansubGroup.CollaborationMembers []FansubGroupSummary` | Entfernen |
| `models/fansub.go` | `PublicFansubProfileResponse.CollaborationMembers` | Entfernen |

### OpenAPI-Contracts (`shared/contracts/`)

Zu prüfende Dateien: `episode-versions.yaml`, `fansubs.yaml`, `admin-content.yaml`.
- `EpisodeVersion.fansub_group` → `EpisodeVersion.fansub_groups` (Array)
- `EpisodeVersionEditorContext.collaboration_group_id` → entfernen
- Kollaborations-bezogene Endpoint-Definitionen in `fansubs.yaml` → entfernen oder deprecation-Note

### TypeScript-Typen (`frontend/src/types/`)

| Datei | Feld | Änderung |
|-------|------|----------|
| `episodeVersion.ts` L12 | `fansub_group?: FansubGroupSummary \| null` | → `fansub_groups?: FansubGroupSummary[]` |
| `episodeVersion.ts` L51 | `collaboration_group_id?: number \| null` | Entfernen |
| `fansub.ts` L5 | `FansubGroupType = "group" \| "collaboration"` | `= "group"` (collaboration entfernen) |
| `fansub.ts` L45 | `collaboration_members?: FansubGroupSummary[]` | Entfernen (aus `FansubGroup`) |
| `fansub.ts` L177 | `PublicFansubProfile.collaboration_members` | Entfernen |
| `fansub.ts` L460–478 | `CollaborationMember`, `CollaborationMemberListResponse`, etc. | Entfernen |
| `fansub.ts` L475–477 | `AddCollaborationMemberRequest` | Entfernen |

**Sauberer Schnitt (D-08):** Clean Break, kein deprecated Alias. Alle Consumer sind intern (kein externes API-Versioning nötig). Das Singular-Feld verschwindet ohne Übergangsperiode.

---

## Forschungsfrage 5: Frontend-Anzeige

[VERIFIED: relevante Frontend-Dateien direkt gelesen]

### Wo wird die Gruppe(n) angezeigt?

| Datei | Aktueller Stand | Änderung |
|-------|----------------|----------|
| `EpisodeVersionEditorPage.tsx` L707–711 | Prüft `group.group_type === "collaboration"`, zeigt "Kollaboration" oder "Gruppe" als Label | Nach Umbau: `group_type` ist immer `"group"`; Label-Zweig kann vereinfacht werden |
| `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx` L285–287 | Prüft `expandedFansub.group_type === 'collaboration'` und zeigt `collaboration_members` | Zweig entfernen; stattdessen `fansub_groups` als Array iterieren |
| `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` L190/220 | Zeigt `group_type === 'collaboration'` und `collaboration_members` | Zweig entfernen |
| `frontend/src/app/admin/fansubs/page.tsx` L153 | Filtert `group_type === "collaboration"` aus der Liste | Entfernen (kein collaboration-Typ mehr) |
| `frontend/src/app/admin/fansubs/merge/page.tsx` L890 | Zeigt "Kollaboration" als typeLabel | Vereinfachen |
| `frontend/src/app/admin/fansubs/create/page.tsx` L526/648/677 | `group_type === "collaboration"` Zweige für Mitglieder-Management | Entfernen |
| `frontend/src/app/fansubs/[slug]/page.tsx` L79–91 | Wenn `group_type === 'collaboration'`: rendert nur `FansubHeroSection` mit `isCollaboration`-Prop und `collaborationMembers` | **Zweig entfernen**; Kooperations-Hinweis erfolgt nun anders (D-10) |
| `frontend/src/app/admin/my-groups/[id]/page.tsx` L347 | Zeigt `release.is_coop ? <span>Coop-Release</span>` | `is_coop` bleibt funktional (wird aus DB korrekt berechnet), kann zu `<Badge>` umgestellt werden |

### D-09: Chip-Primitiv

`@/components/ui/Badge.tsx` ist das richtige Primitiv:
```tsx
// Varianten: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
<Badge variant="neutral">{group.name}</Badge>
```
Mehrere `<Badge>`-Elemente nebeneinander für jede Gruppe in `fansub_groups[]`.

### D-10: Gruppen-Profilseite „Kooperation mit …"

- `frontend/src/app/admin/my-groups/[id]/page.tsx`: `release.is_coop` ist bereits vorhanden und korrekt. Ausbau zu „Kooperation mit: Gruppe X" erfordert, dass das `ContributorReleaseVersionSummary` die Partner-Gruppen-Namen mitliefert — aktuell liefert `is_coop` nur ein Boolean. Entweder: (a) neues Feld `coop_group_names []string` im DTO, (b) lazy-fetch beim Click. D-10 erlaubt minimale Umsetzung für V1; finale Ausgestaltung kann `/gsd:ui-phase` übernehmen.
- `frontend/src/app/fansubs/[slug]/page.tsx`: Der `group_type === 'collaboration'`-Zweig entfällt. Für D-10 braucht die Seite Zugriff auf Partner-Gruppen einer Release-Version — d.h. ein neues API-Shape oder erweitertes Fansub-Domain-Projection. Minimale V1-Lösung: `FansubHighlightsSection` zeigt `release_versions_count` inkl. `is_coop`-Anteil.

### Bestehende Kollaborations-Anzeige-Komponenten (zu entfernen)

- `FansubHeroSection.isCollaboration` Prop + `collaborationMembers` Prop → beide entfernen
- `frontend/src/lib/api.ts` Funktionen `addCollaborationMember` (L5669), `removeCollaborationMember` (L5700) und `getCollaborationMembers` → entfernen nach API-Endpunkt-Deaktivierung
- `frontend/src/app/admin/fansubs/create/page.tsx` Collaboration-Member-Management-Block → entfernen

---

## Forschungsfrage 6: Migrations-Sequenz

[VERIFIED: Migrations-Verzeichnis gescannt; höchste Nummer = 0100]

**Nächste freie Nummer:** `0101` (aktuell höchste: `0100_role_definitions_fansub_lead`)

### Empfohlene Aufteilung

**Migration `0101_expand_release_version_groups_from_collaborations`**

Zweck: Kombigruppen auf Mitglieds-IDs auflösen und in beiden Junction-Tabellen materialisieren. Rückwärtskompatibel (keine Drops).

```sql
-- 0101_expand_release_version_groups_from_collaborations.up.sql

-- Schritt 1: release_version_groups — für jede Kombigruppe deren Member-IDs eintragen
INSERT INTO release_version_groups (release_version_id, fansub_group_id)
SELECT rvg.release_version_id, fcm.member_group_id
FROM release_version_groups rvg
JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id AND fg.group_type = 'collaboration'
JOIN fansub_collaboration_members fcm ON fcm.collaboration_id = fg.id
ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING;

-- Schritt 2: anime_fansub_groups — analog
INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes)
SELECT afg.anime_id, fcm.member_group_id, false, NULL
FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id AND fg.group_type = 'collaboration'
JOIN fansub_collaboration_members fcm ON fcm.collaboration_id = fg.id
ON CONFLICT (anime_id, fansub_group_id) DO NOTHING;

-- Schritt 3: Kombigruppen-Zeilen aus release_version_groups entfernen
DELETE FROM release_version_groups
WHERE fansub_group_id IN (
    SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
);

-- Schritt 4: Kombigruppen-Zeilen aus anime_fansub_groups entfernen
DELETE FROM anime_fansub_groups
WHERE fansub_group_id IN (
    SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
);

-- Schritt 5: Kombigruppen deaktivieren (defensiv, D-12)
-- Hard-Delete nur wenn keine RESTRICT-referenzierten Zeilen
DO $$
DECLARE
    collab_id BIGINT;
    has_restrict_refs BOOLEAN;
BEGIN
    FOR collab_id IN
        SELECT id FROM fansub_groups WHERE group_type = 'collaboration'
    LOOP
        SELECT (
            EXISTS (SELECT 1 FROM hist_fansub_group_members WHERE fansub_group_id = collab_id)
            OR EXISTS (SELECT 1 FROM anime_contributions WHERE fansub_group_id = collab_id)
            OR EXISTS (SELECT 1 FROM theme_segments WHERE fansub_group_id = collab_id)
            OR EXISTS (SELECT 1 FROM segment_library WHERE fansub_group_id = collab_id)
        ) INTO has_restrict_refs;

        IF has_restrict_refs THEN
            UPDATE fansub_groups SET status = 'dissolved', updated_at = NOW()
            WHERE id = collab_id;
        ELSE
            DELETE FROM fansub_groups WHERE id = collab_id;
        END IF;
    END LOOP;
END $$;
```

**`0101.down.sql`**: Kann `release_version_groups` und `anime_fansub_groups` nicht sinnvoll wiederherstellen (wir wissen nicht mehr, welche Zeilen aus Kombigruppen stammten). Daher: `SELECT 'rollback not supported for data migration 0101';` plus RAISE WARNING. Das ist gängige Praxis für irreversible Datenmigration in diesem Projekt.

**Migration `0102_drop_collaboration_schema`**

Zweck: `fansub_collaboration_members`-Tabelle und `group_type`-Spalte entfernen. Erst nach Schritt 5 von 0101.

```sql
-- 0102_drop_collaboration_schema.up.sql

-- Guard: keine Kombigruppen mehr aktiv (sollte durch 0101 sichergestellt sein)
DO $$
DECLARE active_collabs BIGINT;
BEGIN
    SELECT COUNT(*) INTO active_collabs
    FROM fansub_groups WHERE group_type = 'collaboration' AND status = 'active';
    IF active_collabs > 0 THEN
        RAISE EXCEPTION 'Cannot drop collaboration schema: % active collaboration groups remain', active_collabs;
    END IF;
END $$;

DROP TABLE IF EXISTS fansub_collaboration_members;

-- group_type-Spalte: constraint ändern (nur 'group' erlaubt), dann später droppen
-- Oder: sofort droppen, da Laufzeit-Code group_type nicht mehr schreibt
ALTER TABLE fansub_groups DROP COLUMN IF EXISTS group_type;
```

**`0102.down.sql`**:
```sql
ALTER TABLE fansub_groups ADD COLUMN IF NOT EXISTS group_type VARCHAR(20) NOT NULL DEFAULT 'group'
    CHECK (group_type IN ('group', 'collaboration'));

CREATE TABLE IF NOT EXISTS fansub_collaboration_members (
    collaboration_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    member_group_id  BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collaboration_id, member_group_id),
    CONSTRAINT no_self_reference CHECK (collaboration_id != member_group_id)
);
```

### Transaktionale Risiken

- Migration 0101 Schritt 3 (DELETE) muss **nach** Schritt 1 (INSERT) laufen — korrekt in obiger Reihenfolge
- Migration 0102 (DROP TABLE) muss **nach** Deployment des neuen Go-Codes laufen (kein Schreibzugriff auf `fansub_collaboration_members` mehr) — oder: 0102 als eigenständige Migration in einer separaten Deployment-Sequenz
- Empfehlung: beide Migrationen in einem Deployment deployen, aber 0102 mit dem Guard-DO-Block absichern

---

## Forschungsfrage 7: Test-Landschaft

[VERIFIED: direkter Code-Lesezugriff auf Test-Dateien]

### Zu rewritende/entfernende Backend-Tests

| Datei | Test | Status | Aktion |
|-------|------|--------|--------|
| `episode_import_repository_test.go` L145 | `TestBuildImportCollaborationName_IsStableAcrossSelectionOrder` | **Entfernen** — `buildImportCollaborationName` existiert nach Umbau nicht mehr |
| `episode_import_repository_test.go` L164 | `TestEpisodeImportReleaseHelpers_SourceCreatesMembersBeforeCollaborationLink` | **Entfernen** — prüft Quellcode-Reihenfolge von `upsertImportCollaborationGroup` + `fansub_collaboration_members` |
| `episode_import_repository_test.go` L183 | `TestBuildAnimeFansubLinkGroupIDs_IsIdempotentAcrossRepeatedApply` | **Rewrite** — `selection.EffectiveGroup` entfällt; Test prüft nur noch Member-IDs |
| `episode_import_repository_test.go` L227–266 | `TestEpisodeImportApply_UsesReleaseNativeTablesOnly` | **Rewrite** — entfernt `"insert into fansub_collaboration_members"` aus required-Liste; `"models.fansubgrouptypecollaboration"` entfernen |
| `fansub_repository_test.go` L68 | `TestFansubRepository_PublicProfileSourceInvariants` prüft `"ListCollaborationMembers(ctx, group.ID)"` | **Rewrite** — Fragment nach Entfernung des collaboration-Zweigs entfernen |
| `handlers/fansub_test.go` L34/71/82 | Tests prüfen `FansubGroupTypeCollaboration` und `group_type: "collaboration"` | **Entfernen** |

### Neue Backend-Tests erforderlich

```go
// Schreibpfad: N Gruppen → N Junction-Zeilen
TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRowsForNGroups
TestResolveImportFansubMemberGroups_RejectsUnknownGroupID  // D-06
TestResolveImportFansubMemberGroups_AllowsFreeTextSingleGroup  // D-06
TestUpsertReleaseVersionGroups_DeletesRemovedGroups  // D-05

// Lesepfad (wenn DB-Integration-Test vorhanden, sonst Struct-Tests)
TestScanEpisodeVersion_ReturnsGroupsList
```

### Frontend-Tests (Vitest)

Bestehende Frontend-Tests:
- `frontend/src/app/admin/my-groups/[id]/page.test.tsx` L101: Nutzt `is_coop: true` — **kein Rewrite nötig** (is_coop bleibt)

Neue Tests:
- Test für neue Chip-Darstellung mehrerer Gruppen in Release-Version-Anzeige
- Test für `EpisodeVersionEditorPage` ohne `collaboration_group_id`

### Migrations-Tests

Das Projekt hat keine dedizierten `backend/internal/migrations/*_test.go`-Dateien. Der Verifikationspfad für Migrationen ist der GO-migrate-Runner beim App-Start. Kein spezielles Test-Muster vorhanden; Migrations-Korrektheit wird durch Smoke-Tests nach Deployment geprüft.

---

## Forschungsfrage 8: File-Size-Risiko

[VERIFIED: Zeilenzählung per Bash]

| Datei | Aktuelle Zeilen | 450-Limit | Risiko | Empfehlung |
|-------|----------------|-----------|--------|------------|
| `episode_version_repository.go` | **1246** | 450 | Hoch | Datei ist bereits **2,8× über dem Limit**. Die für Phase 81 nötigen Änderungen (Aggregations-Queries, neuer Scan) werden sie weiter vergrößern. **Pflicht-Split vor/mit dieser Phase.** |
| `fansub_repository.go` | **2323** | 450 | Sehr hoch | Bereits massiv überschritten. Collaboration-Code-Entfernung verkleinert sie leicht. Split ist eine separate Aufgabe (Out-of-Scope für Phase 81, außer dem Entfernen der Kollaborations-Funktionen). |
| `episode_import_repository_release_helpers.go` | 551 | 450 | Mittel | Nach Entfernung von `upsertImportCollaborationGroup` + `buildImportCollaborationName` (~80 Zeilen) → ~470 Zeilen. **Knapp** über Limit. Empfehlung: gemeinsamen Member-Resolver in eigene Datei `episode_import_repository_fansub_helpers.go` extrahieren. |
| `contributor_dashboard_repository.go` | 533 | 450 | Mittel | Keine Änderungen nötig → **bleibt 533**. Liegt über Limit, aber dieser Phase nicht zugeordnet. |
| `admin_content_episode_version_editor_helpers.go` | 224 | 450 | Kein | Wird kleiner durch Entfernung von `resolveEpisodeVersionSelectedGroups`-Kollaborations-Zweig. |

### Pflicht-Split für `episode_version_repository.go`

Das Muster im Projekt: `*_helpers.go` und `*_repository_*.go`-Splits (z.B. `episode_import_repository_release_helpers.go`, `episode_import_repository_apply.go`).

Empfohlene Aufteilung:
- `episode_version_repository.go` (~300 Z): EpisodeVersionRepository struct, `NewEpisodeVersionRepository`, `GetByID`, `Create`, `Update`, `ListGroupedByAnimeID`
- `episode_version_repository_read_helpers.go` (~250 Z): `listReleaseVariantsByAnimeID`, `scanReleaseVariantAsEpisodeVersion` (nach Umbau), `buildGroupedEpisodeCounts`, `countReleaseVariantsByEpisodeNumber`
- `episode_version_repository_write_helpers.go` (~250 Z): `syncEpisodeVersionSelectedGroups`, `upsertReleaseVersionGroupsForSync`, `applyEpisodeVersionReleaseMetadata`, `applyEpisodeVersionVariantMetadata`, `loadEpisodeVersionStateForUpdate`, `ensureEpisodeVersionStream`

---

## Vollständige Dateien-Übersicht: Create/Modify

| Aktion | Datei | Art der Änderung |
|--------|-------|-----------------|
| MODIFY | `database/migrations/0101_expand_release_version_groups_from_collaborations.up.sql` | **NEU** — Datenmigration |
| CREATE | `database/migrations/0101_expand_release_version_groups_from_collaborations.down.sql` | **NEU** — No-op / RAISE WARNING |
| CREATE | `database/migrations/0102_drop_collaboration_schema.up.sql` | **NEU** — Schema-Bereinigung |
| CREATE | `database/migrations/0102_drop_collaboration_schema.down.sql` | **NEU** — Restore collaboration tables |
| MODIFY | `backend/internal/models/episode_version.go` | `FansubGroup` → `FansubGroups`; `CollaborationGroupID` entfernen |
| MODIFY | `backend/internal/models/fansub.go` | `FansubGroupTypeCollaboration`, `CollaborationMember`, `FansubGroup.CollaborationMembers`, `PublicFansubProfileResponse.CollaborationMembers` entfernen |
| SPLIT+MODIFY | `backend/internal/repository/episode_version_repository.go` | Split in 3 Dateien (Pflicht); Lesepfad auf Aggregation umbauen |
| CREATE | `backend/internal/repository/episode_version_repository_read_helpers.go` | Ausgelagerter Lesepfad |
| CREATE | `backend/internal/repository/episode_version_repository_write_helpers.go` | Ausgelagerter Schreibpfad |
| MODIFY | `backend/internal/repository/episode_import_repository_release_helpers.go` | `upsertImportCollaborationGroup` + `buildImportCollaborationName` entfernen; `resolveImportFansubSelectionFromInputs` → `resolveMemberGroups`; `buildAnimeFansubLinkGroupIDs` vereinfachen |
| MODIFY | `backend/internal/repository/fansub_repository.go` | Kollaborations-Zweig in `GetPublicProfileBySlug` entfernen; `ListCollaborationMembers` + `AddCollaborationMember` + `RemoveCollaborationMember` entfernen |
| MODIFY | `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` | `resolveEpisodeVersionSelectedGroups` kollaborations-frei umbauen (liest `release_version_groups` direkt); `episodeVersionEditorResolved.collaborationID` entfernen |
| MODIFY | `backend/internal/handlers/fansub_collaborations.go` | Datei entfernen oder leeren (Endpunkte deaktivieren) |
| MODIFY | `backend/cmd/server/main.go` | Route `GET /fansubs/:id/collaboration-members` etc. entfernen |
| MODIFY | `shared/contracts/episode-versions.yaml` | `fansub_group` → `fansub_groups` (Array), `collaboration_group_id` entfernen |
| MODIFY | `shared/contracts/fansubs.yaml` | Kollaborations-Endpoints entfernen/deprecation |
| MODIFY | `frontend/src/types/episodeVersion.ts` | `fansub_group` → `fansub_groups[]`; `collaboration_group_id` entfernen |
| MODIFY | `frontend/src/types/fansub.ts` | `FansubGroupType`; `collaboration_members`; `CollaborationMember*` etc. entfernen |
| MODIFY | `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` | Kollaborations-Label-Zweig vereinfachen |
| MODIFY | `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` | `collaboration_group_id` entfernen (L248) |
| MODIFY | `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` | Filter `group_type === 'collaboration'` entfernen (L92) |
| MODIFY | `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx` | Collaboration-Members-Zweig entfernen |
| MODIFY | `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` | Collaboration-Typ-Anzeige bereinigen |
| MODIFY | `frontend/src/app/admin/fansubs/page.tsx` | Collaboration-Filter entfernen (L153) |
| MODIFY | `frontend/src/app/admin/fansubs/merge/page.tsx` | typeLabel vereinfachen |
| MODIFY | `frontend/src/app/admin/fansubs/create/page.tsx` | Collaboration-Member-Management-Block entfernen |
| MODIFY | `frontend/src/app/fansubs/[slug]/page.tsx` | Kollaborations-Profil-Zweig entfernen; D-10 Kooperations-Hinweis hinzufügen |
| MODIFY | `frontend/src/app/admin/my-groups/[id]/page.tsx` | `is_coop`-Anzeige zu `<Badge>` upgraden |
| MODIFY | `frontend/src/lib/api.ts` | `addCollaborationMember`, `removeCollaborationMember`, `getCollaborationMembers` entfernen |
| MODIFY | `backend/internal/repository/episode_import_repository_test.go` | 4 Tests entfernen/rewriten |
| MODIFY | `backend/internal/repository/fansub_repository_test.go` | Invarianten-Test anpassen |
| MODIFY | `backend/internal/handlers/fansub_test.go` | Kollaborations-Typ-Tests entfernen |

---

## Empfohlener Wave-Plan

### Wave 0 — Setup + Tests-Baseline
- Fehlende Tests für neuen Schreibpfad (Skeleton) anlegen
- `episode_version_repository.go` in 3 Dateien splitten (Pflicht wegen 450-Limit)

### Wave 1 — Datenmigration (Schema-First)
- Migration `0101` (Daten-Expansion und Deaktivierung von Kombigruppen)
- Migration `0102` (Schema-Drop) — nach manuellem Verify von 0101

### Wave 2 — Backend-Schreibpfad
- `episode_import_repository_release_helpers.go` umbauen (kein `upsertImportCollaborationGroup` mehr)
- `episode_version_repository_write_helpers.go` umbauen (N-fach-Upsert)
- Go-Models anpassen (`FansubGroups`, Entfernung von Kollaborations-Typen)

### Wave 3 — Backend-Lesepfad + DTO-Kaskade
- `episode_version_repository_read_helpers.go` auf Aggregation umstellen
- `admin_content_episode_version_editor_helpers.go` bereinigen
- `fansub_repository.go` Kollaborations-Zweige entfernen
- OpenAPI-Contracts aktualisieren

### Wave 4 — Frontend
- TS-Typen (`episodeVersion.ts`, `fansub.ts`)
- API-Funktionen (`api.ts`)
- Display-Komponenten (`EpisodeVersionEditorPage`, `EpisodeImportMappingRow`, etc.)
- Chip-Anzeige für `fansub_groups[]` mit `<Badge>`
- Gruppen-Profilseite (`fansubs/[slug]/page.tsx`) Kooperations-Hinweis

### Wave 5 — Cleanup + Tests
- Backend-Tests rewriten/entfernen
- Frontend-Tests (Vitest)
- Handler-Route für Kollaborations-Endpunkte deaktivieren

---

## Architekturmuster: Aggregation im Lesepfad

Die empfohlene SQL-Aggregationsform für `GetByID` und `listReleaseVariantsByAnimeID`:

**Option A: `json_agg` (empfohlen)**
```sql
-- Statt GROUP BY fg.id, fg.slug, fg.name, fg.logo_url:
COALESCE(
    json_agg(
        json_build_object('id', fg.id, 'slug', fg.slug, 'name', fg.name, 'logo_url', fg.logo_url)
        ORDER BY fg.name ASC, fg.id ASC
    ) FILTER (WHERE fg.id IS NOT NULL),
    '[]'::json
) AS fansub_groups
```
Vorteil: Ein einziger Query-Durchlauf; JSON wird als `[]byte` gescannt und in `[]FansubGroupSummary` unmarshallt.

**Option B: Zweiter Query nach der Haupt-Query**
Pro Version einen extra `SELECT ... FROM release_version_groups rvg JOIN fansub_groups fg ON ... WHERE rvg.release_version_id = $1 ORDER BY fg.name, fg.id`. Aufwändiger bei Listen (N+1-Risiko), aber für `GetByID` klarer.

**Empfehlung:** Option A für beide Funktionen — passt zum bestehenden Muster (`COALESCE(ARRAY_AGG(...) FILTER (...), ARRAY[...])` wird bereits für `covered_episode_numbers` verwendet). Scanner-Anpassung:

```go
// Im Scan:
var fansubGroupsJSON []byte
// ...scan fansubGroupsJSON...
if err := json.Unmarshal(fansubGroupsJSON, &item.FansubGroups); err != nil {
    return nil, 0, fmt.Errorf("unmarshal fansub_groups: %w", err)
}
```

---

## Common Pitfalls

### Pitfall 1: theme_segments-FK auf Kombigruppen-ID
**Was schiefgeht:** `theme_segments.fansub_group_id` kann auf eine Kombigruppen-ID zeigen. Das Listingquery in `listReleaseVariantsByAnimeID` nutzt `COALESCE(ts.fansub_group_id, 0) = COALESCE(rvg.fansub_group_id, 0)` — nach Migration zeigen `rvg` auf echte Gruppen-IDs, `ts.fansub_group_id` könnte noch auf die alte Kombigruppe zeigen.
**Warum:** Der lateral JOIN matcht Theme-Segments über `fansub_group_id`. Nach Migration gibt es keine Kombigruppen-IDs mehr in `rvg`, aber ggf. noch in `theme_segments`.
**Wie vermeiden:** 0101-Migration muss `theme_segments.fansub_group_id` prüfen (Teil des RESTRICT-Guards), und ein separater Update-Schritt sollte `theme_segments.fansub_group_id` von Kombigruppen-IDs bereinigen (auf `NULL` setzen oder auf den ersten Member mappen). Im Guard explizit abfragen.

### Pitfall 2: `resolvedImportFansubSelection`-Struct wird von mehreren Callers erwartet
**Was schiefgeht:** `syncEpisodeVersionSelectedGroups` (editor) ruft `resolveImportFansubSelectionFromInputs` auf, das bisher eine `resolvedImportFansubSelection` zurückgibt. Nach Umbau gibt es keinen `EffectiveGroup` mehr, aber die Signatur des Struct könnte noch in anderen Tests oder Hilfsfunktionen verwendet werden.
**Wie vermeiden:** `resolvedImportFansubSelection`-Struct komplett entfernen; alle Callsites auf `[]resolvedImportFansubGroup` umstellen; dann kompilieren.

### Pitfall 3: `GROUP BY fg.*` im alten Query verhindert mehrere Gruppen
**Was schiefgeht:** Der `listReleaseVariantsByAnimeID`-Query hat `fg.id, fg.slug, fg.name, fg.logo_url` im GROUP BY. Das bedeutet: bei zwei echten Gruppen pro Version entstehen zwei Zeilen für dieselbe Release-Version (rv.id). `scanReleaseVariantAsEpisodeVersion` würde dann jede Zeile als separate `EpisodeVersion` eintragen.
**Wie vermeiden:** `fg.*`-Spalten aus GROUP BY und SELECT entfernen; `json_agg` einsetzen; dann eine Zeile pro rv.id.

### Pitfall 4: `LIMIT 1` am Ende von `GetByID` (L365)
**Was schiefgeht:** Bei zwei echten Gruppen entstehen nach der Migration zwei Zeilen — LIMIT 1 gibt nur eine zurück.
**Wie vermeiden:** Nach Aggregation auf `json_agg` entfällt LIMIT 1 automatisch (eine Zeile pro rv.id).

### Pitfall 5: `EpisodeVersionEditorContext.CollaborationGroupID` im Frontend
**Was schiefgeht:** `useEpisodeVersionEditor.ts` L248 setzt `collaboration_group_id` auf die `fansub_group?.id` wenn `selectedGroups.length > 1`. Nach Umbau liefert die API kein `collaboration_group_id` mehr.
**Wie vermeiden:** `collaboration_group_id` aus Type und useHook entfernen; Frontend nutzt nur noch `selected_groups: FansubGroupSummary[]`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 (Frontend), Go test (Backend) |
| Config file | `frontend/vitest.config.ts` (Frontend), `go test ./...` (Backend) |
| Quick run command | `cd frontend && npm test -- --run` / `cd backend && go test ./internal/repository/...` |
| Full suite command | `cd frontend && npm test -- --run` / `cd backend && go test ./...` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | Datei existiert? |
|--------|----------|-----------|-------------------|----------------|
| P81-SC1 | N-fach-Upsert schreibt N Zeilen | unit (source-level) | `go test ./internal/repository/ -run TestSyncEpisodeVersion` | ❌ Wave 0 |
| P81-SC2 | Lesepfad aggregiert alle Gruppen | unit | `go test ./internal/repository/ -run TestScanEpisodeVersion` | ❌ Wave 0 |
| P81-SC6 | Unbekannte ID → ErrNotFound | unit | `go test ./internal/repository/ -run TestResolveImportFansub` | ❌ Wave 0 |
| P81-SC3 | Kollaborations-Code-Pfade entfernt | source-level | `go test ./internal/repository/ -run TestEpisodeImportReleaseHelpers` | ✅ (rewrite) |
| P81-SC4 | Chip-Anzeige mehrerer Gruppen | unit (jsdom) | `cd frontend && npm test -- --run` | ❌ Wave 0 |
| P81-SC5 | Migration läuft fehlerfrei | smoke | App-Start nach Migration | — |
| P81-SC7 | FK-Guard vor Kombigruppen-Delete | migration-guard | DO $$ ... RAISE EXCEPTION | ✅ (in SQL) |
| P81-SC8 | Alle alten Kollaborations-Tests entfernt | source-level | `go test ./...` grün | ✅ (rewrite) |

### Wave 0 Gaps
- [ ] `backend/internal/repository/episode_version_repository_write_helpers_test.go` — P81-SC1
- [ ] `backend/internal/repository/episode_version_repository_read_helpers_test.go` — P81-SC2
- [ ] `frontend/src/components/anime/ReleaseVersionFansubChips.test.tsx` — P81-SC4

---

## Security Domain

Keine neuen Auth-Flächen. ASVS V5 (Input Validation): Alle übergebenen `fansub_group_id`-Werte werden durch `lookupImportFansubGroupByID` gegen die DB validiert (D-06) — keine Injection-Fläche. Kein ASVS V2/V3/V6 betroffen.

---

## Assumptions Log

| # | Claim | Section | Risiko bei Fehler |
|---|-------|---------|-------------------|
| A1 | `theme_segments.fansub_group_id` und `segment_library.fansub_group_id` haben in der aktuellen DB keine Zeilen mit Kombigruppen-IDs | Q1/Q6 | Migration-Guard blockiert DELETE; Deaktivierung (nicht Delete) wäre trotzdem sicher |
| A2 | `hist_fansub_group_members` und `anime_contributions` haben aktuell keine Zeilen mit Kombigruppen-IDs (Kombigruppen wurden durch Phase 21 nie manuell als Mitglieder eingetragen) | Q1 | Nur Auswirkung: Hard-Delete schlägt fehl; Status='dissolved' greift als Fallback |
| A3 | Die `FansubHeroSection.isCollaboration`-Prop ist nur in `fansubs/[slug]/page.tsx` aufgerufen | Q5 | Weiterer Consumer müsste ebenfalls migriert werden |

---

## Open Questions

1. **`theme_segments`-Migration**: Falls echte Daten-Zeilen in `theme_segments` auf Kombigruppen-IDs zeigen — soll der Planner einen expliziten UPDATE-Schritt einplanen (setze `fansub_group_id = NULL` oder auf den ersten Member), oder reicht der RESTRICT-Guard + Deaktivierung?
   - Was wir wissen: Das lateral-JOIN-Pattern in `listReleaseVariantsByAnimeID` matcht Theme-Segments über `fansub_group_id`; nach Migration passen die Felder nicht mehr zusammen, wenn `theme_segments.fansub_group_id` noch Kombigruppen-IDs enthält.
   - Empfehlung: Expliziten UPDATE in 0101 einplanen (`theme_segments` auf `NULL` für Kombigruppen-IDs setzen) als defensiver Schritt.

2. **`handlersRoute DELETE für /fansubs/:id/collaboration-members`**: In `main.go` L457 ist `POST /fansubs/:id/collaboration-members` als separater POST mit `authMiddleware` registriert. Exakter Scope der zu entfernenden Routen noch nicht vollständig gelesen.
   - Empfehlung: Planner liest `main.go` L450–470 vollständig und listet alle Kollaborations-Routen.

---

## Sources

### Primary (HIGH confidence)
- Direkter Code-Lesezugriff: `backend/internal/repository/episode_import_repository_release_helpers.go` (vollständig)
- Direkter Code-Lesezugriff: `backend/internal/repository/episode_version_repository.go` (vollständig)
- Direkter Code-Lesezugriff: `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` (vollständig)
- Direkter Code-Lesezugriff: `backend/internal/models/fansub.go`, `episode_version.go`
- Direkter Code-Lesezugriff: `database/migrations/0009`, `0015`, `0035`, `0057` (vollständig)
- Direkter Code-Lesezugriff: `frontend/src/types/episodeVersion.ts`, `fansub.ts`, `contributor.ts`
- Direkter Code-Lesezugriff: `backend/internal/repository/episode_import_repository_test.go`, `fansub_repository_test.go`
- Migrations-Scan: höchste Nummer = 0100 verifiziert per `ls` Output

### Secondary (MEDIUM confidence)
- `admin_content_fansub_releases.go`, `fansub_repository.go`, `group_release_media_repository.go`, `contributor_dashboard_repository.go`, `anime_contributions_public_versions_repository.go` — partiell gelesen (ausreichend für Inventar)
- Frontend-Komponenten `ReleaseVersionBreakdown.tsx`, `GroupContributionBlock.tsx`, `fansubs/[slug]/page.tsx`, `my-groups/[id]/page.tsx` — vollständig gelesen

---

## Metadata

**Confidence breakdown:**
- Standard Stack / Migration: HIGH — Migrations-Nummern und Schema direkt verifiziert
- Write-Path Refactoring: HIGH — beide Schreibpfad-Dateien vollständig gelesen
- Read-Path Inventory: HIGH — alle 5 Repo-Dateien gelesen, Scan-Funktion exakt lokalisiert
- DTO/Contract Kaskade: HIGH — alle TS-Typen und Go-Models gelesen
- Frontend Display: HIGH — relevante Komponenten und Seiten gelesen
- File-Size Risk: HIGH — exakte Zeilenzahlen per wc -l verifiziert

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (stabile Codebasis; kein npm-Package-Update involviert)
