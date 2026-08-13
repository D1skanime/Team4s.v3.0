# Phase 81: Release-Version Mehrfach-Fansubgruppen ohne Kombigruppe - Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 35 (new/modified per RESEARCH.md file table)
**Analogs found:** 33 / 35

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0101_expand_release_version_groups_from_collaborations.up.sql` | migration | batch/transform | `database/migrations/0036_backfill_releases_from_episode_versions.up.sql` | exact (data backfill + INSERT … ON CONFLICT DO NOTHING) |
| `database/migrations/0101_…down.sql` | migration | — | `database/migrations/0036_backfill_releases_from_episode_versions.down.sql` | role-match (no-op down) |
| `database/migrations/0102_drop_collaboration_schema.up.sql` | migration | batch | `database/migrations/0057_drop_release_version_groups_fansubgroup_id.up.sql` | exact (DO $$ guard + DROP TABLE/COLUMN) |
| `database/migrations/0102_…down.sql` | migration | — | `database/migrations/0057_drop_release_version_groups_fansubgroup_id.down.sql` | role-match |
| `backend/internal/models/episode_version.go` | model | CRUD | self (modify) | — |
| `backend/internal/models/fansub.go` | model | CRUD | self (modify) | — |
| `backend/internal/repository/episode_version_repository.go` | repository | CRUD | self (split+modify) | — |
| `backend/internal/repository/episode_version_repository_read_helpers.go` | repository helper | request-response | `backend/internal/repository/episode_import_repository_release_helpers.go` | role-match (helper split, same package) |
| `backend/internal/repository/episode_version_repository_write_helpers.go` | repository helper | CRUD | `backend/internal/repository/episode_import_repository_release_helpers.go` | exact (upsert/delete junction rows, same package + tx pattern) |
| `backend/internal/repository/episode_import_repository_release_helpers.go` | repository helper | CRUD | self (modify) | — |
| `backend/internal/repository/fansub_repository.go` | repository | CRUD | self (modify) | — |
| `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` | handler helper | request-response | self (modify) | — |
| `backend/internal/handlers/fansub_collaborations.go` | handler | request-response | `backend/internal/handlers/` other handlers | role-match (deactivate/delete) |
| `backend/cmd/server/main.go` | config/wiring | — | self (modify, remove routes) | — |
| `shared/contracts/episode-versions.yaml` | contract | — | `shared/contracts/fansubs.yaml` | role-match |
| `shared/contracts/fansubs.yaml` | contract | — | self (modify) | — |
| `frontend/src/types/episodeVersion.ts` | type | — | self (modify) | — |
| `frontend/src/types/fansub.ts` | type | — | self (modify) | — |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` | component | request-response | self (modify) | — |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` | hook | request-response | self (modify) | — |
| `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` | component | request-response | self (modify) | — |
| `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx` | component | request-response | self (modify) | — |
| `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` | component | request-response | self (modify) | — |
| `frontend/src/app/admin/fansubs/page.tsx` | component | request-response | self (modify) | — |
| `frontend/src/app/admin/fansubs/merge/page.tsx` | component | request-response | self (modify) | — |
| `frontend/src/app/admin/fansubs/create/page.tsx` | component | request-response | self (modify) | — |
| `frontend/src/app/fansubs/[slug]/page.tsx` | component (SSR) | request-response | self (modify) | — |
| `frontend/src/app/admin/my-groups/[id]/page.tsx` | component | request-response | self (modify); `<Badge>` pattern from same file L354-366 | role-match |
| `frontend/src/lib/api.ts` | service/utility | request-response | self (modify) | — |
| `backend/internal/repository/episode_import_repository_test.go` | test | — | self (modify) | — |
| `backend/internal/repository/fansub_repository_test.go` | test | — | self (modify) | — |
| `backend/internal/handlers/fansub_test.go` | test | — | self (modify) | — |
| `backend/internal/repository/episode_version_repository_write_helpers_test.go` | test | — | `backend/internal/repository/episode_import_repository_test.go` | exact (source-scan test pattern) |
| `backend/internal/repository/episode_version_repository_read_helpers_test.go` | test | — | `backend/internal/repository/episode_import_repository_test.go` | exact |
| `frontend/src/components/anime/ReleaseVersionFansubChips.test.tsx` | test | — | existing Vitest tests in `frontend/src/` | role-match |

---

## Pattern Assignments

### `database/migrations/0101_expand_release_version_groups_from_collaborations.up.sql` (migration, data backfill)

**Analog:** `database/migrations/0036_backfill_releases_from_episode_versions.up.sql`

**Core backfill pattern** (0036 lines 6-68):
```sql
INSERT INTO release_version_groups (release_version_id, fansub_group_id, created_at)
SELECT DISTINCT ON (rv.id, ev.fansub_group_id)
    rv.id,
    ev.fansub_group_id,
    ev.created_at
FROM release_versions rv
JOIN fansub_releases fr ON rv.release_id = fr.id
...
ON CONFLICT DO NOTHING is implicit via DISTINCT ON;
```
Wichtig: Die 0036-Migration nutzt `INSERT … SELECT … ORDER BY` zum deterministischen Backfill. Phase 81 braucht zusätzlich explizite `ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING`-Klauseln, weil die Junction-Tabelle einen Composite-PK hat.

**DO $$ Guard-Pattern** (0057 lines 4-26) — verwende für DELETE-Schritte:
```sql
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
Quelle: RESEARCH.md Q6 — vollständig ausgearbeitet, direkt kopierbar.

**Down-Pattern** — irreversible Datenmigration:
```sql
-- 0101_expand_release_version_groups_from_collaborations.down.sql
-- Rollback is not supported for this data migration.
-- The expand-and-delete of collaboration junction rows cannot be reversed.
DO $$ BEGIN
    RAISE WARNING 'Migration 0101 down: rollback not supported for data migration';
END $$;
```
Analog: Das Projekt akzeptiert No-op-Downs für irreversible Datenmigration (dokumentiert in RESEARCH.md Q6).

---

### `database/migrations/0102_drop_collaboration_schema.up.sql` (migration, schema drop)

**Analog:** `database/migrations/0057_drop_release_version_groups_fansubgroup_id.up.sql`

**Präzise Guard-Pattern** (0057 lines 4-26):
```sql
DO $$
DECLARE
    mismatched_rows BIGINT := 0;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'release_version_groups'
          AND column_name = 'fansubgroup_id'
    ) THEN
        SELECT COUNT(*) INTO mismatched_rows
        FROM public.release_version_groups
        WHERE fansubgroup_id IS NOT NULL
          AND fansubgroup_id <> fansub_group_id;

        IF mismatched_rows > 0 THEN
            RAISE EXCEPTION
                'Cannot drop …: % mismatched rows …',
                mismatched_rows;
        END IF;
    END IF;
END $$;
```

Für 0102 wird derselbe Guard-Aufbau verwendet, aber mit:
```sql
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
ALTER TABLE fansub_groups DROP COLUMN IF EXISTS group_type;
```

**Down-Pattern** (0057 pattern: `ADD COLUMN IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS`):
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

---

### `backend/internal/repository/episode_version_repository_read_helpers.go` (repository helper, request-response)

**Analog:** `backend/internal/repository/episode_import_repository_release_helpers.go`

**Package declaration + imports pattern** (release_helpers lines 1-17):
```go
package repository

import (
    "context"
    "errors"
    "fmt"

    "team4s.v3/backend/internal/models"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
)
```

**Core scan-function pattern** (episode_version_repository.go lines 902-945) — dies ist die Funktion, die ersetzt werden muss:
```go
// AKTUELL (zu ersetzen):
func scanReleaseVariantAsEpisodeVersion(scanner rowScanner, includeFansub bool) (*models.EpisodeVersion, int32, error) {
    var groupID *int64
    var groupSlug *string
    var groupName *string
    var groupLogoURL *string
    // ...
    if includeFansub {
        dest = append(dest, &groupID, &groupSlug, &groupName, &groupLogoURL)
    }
    if includeFansub && groupID != nil && groupSlug != nil && groupName != nil {
        item.FansubGroup = &models.FansubGroupSummary{...}  // ← Singular
    }
}
```

**NEU — json_agg Scan-Pattern** (aus RESEARCH.md Q8, Architekturmuster):
```go
// In read_helpers.go — Scanner liest []byte für JSON-Array
func scanReleaseVariantAsEpisodeVersion(scanner rowScanner, includeFansubs bool) (*models.EpisodeVersion, int32, error) {
    var item models.EpisodeVersion
    var groupEpisodeNumber int32
    var fansubGroupsJSON []byte  // json_agg liefert JSON

    dest := []any{
        &groupEpisodeNumber,
        &item.ID,
        // ... alle anderen Felder ...
    }
    if includeFansubs {
        dest = append(dest, &fansubGroupsJSON)
    }

    if err := scanner.Scan(dest...); err != nil {
        return nil, 0, fmt.Errorf("scan release variant row: %w", err)
    }
    if includeFansubs && len(fansubGroupsJSON) > 0 {
        if err := json.Unmarshal(fansubGroupsJSON, &item.FansubGroups); err != nil {
            return nil, 0, fmt.Errorf("unmarshal fansub_groups: %w", err)
        }
    }
    return &item, groupEpisodeNumber, nil
}
```

**SQL-Aggregationsmuster** für `listReleaseVariantsByAnimeID` und `GetByID` (aus RESEARCH.md Q8):
```sql
-- Statt: fg.id, fg.slug, fg.name, fg.logo_url im SELECT + GROUP BY:
COALESCE(
    json_agg(
        json_build_object('id', fg.id, 'slug', fg.slug, 'name', fg.name, 'logo_url', fg.logo_url)
        ORDER BY fg.name ASC, fg.id ASC
    ) FILTER (WHERE fg.id IS NOT NULL),
    '[]'::json
) AS fansub_groups
-- Kein GROUP BY auf fg.*-Spalten mehr; rv.id als einziger Aggregationsanker
-- LIMIT 1 entfällt (json_agg liefert eine Zeile pro rv.id)
```

**Analoges Array-Aggregationsmuster** aus bestehendem Code (episode_version_repository.go lines 156-161):
```go
COALESCE(
    ARRAY_AGG(CAST(covered_episode.episode_number AS INTEGER) ORDER BY rve_all.position, ...)
        FILTER (WHERE covered_episode.episode_number ~ '^[0-9]+$'),
    ARRAY[CAST(primary_episode.episode_number AS INTEGER)]
) AS covered_episode_numbers
```
Das `COALESCE + json_agg … FILTER (WHERE … IS NOT NULL)` ist die direkte Erweiterung dieses vorhandenen Musters.

**rowScanner interface** (episode_version_repository.go lines 948-950):
```go
type rowScanner interface {
    Scan(dest ...any) error
}
```
Diese Interface-Definition bleibt in `episode_version_repository.go` oder wird nach `read_helpers.go` verschoben — konsistent halten.

---

### `backend/internal/repository/episode_version_repository_write_helpers.go` (repository helper, CRUD)

**Analog:** `backend/internal/repository/episode_import_repository_release_helpers.go` (exaktes Match — gleiche Paket-Zugehörigkeit, gleicher pgx.Tx-Aufrufstil)

**Imports pattern** (release_helpers lines 1-17): identisch wie read_helpers (s. o.)

**N-fach-Junction-Upsert-Muster** — Vorlage: bestehende `syncEpisodeVersionSelectedGroups` (episode_version_repository.go lines 1178-1229):
```go
// AKTUELL (Muster für DELETE + INSERT, zu erweitern auf N Gruppen):
if _, err := tx.Exec(ctx, `
    DELETE FROM release_version_groups
    WHERE release_version_id = $1
      AND fansub_group_id <> $2
`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
    return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
}
if _, err := tx.Exec(ctx, `
    INSERT INTO release_version_groups (release_version_id, fansub_group_id)
    VALUES ($1, $2)
    ON CONFLICT (release_version_id, fansub_group_id) DO UPDATE
    SET fansub_group_id = EXCLUDED.fansub_group_id
`, releaseVersionID, selection.EffectiveGroup.ID); err != nil {
    return fmt.Errorf("upsert release version group version=%d group=%d: %w",
        releaseVersionID, selection.EffectiveGroup.ID, err)
}
```

**NEU — N-fach-Pattern** (aus RESEARCH.md Q3):
```go
// Schritt 1: Überzählige Gruppen löschen (NOT IN neue IDs)
// Schritt 2: Für jede neue Gruppe: INSERT … ON CONFLICT DO NOTHING
func upsertReleaseVersionGroupsForSync(
    ctx context.Context,
    tx pgx.Tx,
    releaseVersionID int64,
    memberGroups []resolvedImportFansubGroup,
) error {
    newIDs := make([]int64, len(memberGroups))
    for i, g := range memberGroups {
        newIDs[i] = g.ID
    }
    if _, err := tx.Exec(ctx, `
        DELETE FROM release_version_groups
        WHERE release_version_id = $1
          AND fansub_group_id <> ALL($2::bigint[])
    `, releaseVersionID, newIDs); err != nil {
        return fmt.Errorf("reset release version groups version=%d: %w", releaseVersionID, err)
    }
    for _, group := range memberGroups {
        if _, err := tx.Exec(ctx, `
            INSERT INTO release_version_groups (release_version_id, fansub_group_id)
            VALUES ($1, $2)
            ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
        `, releaseVersionID, group.ID); err != nil {
            return fmt.Errorf("upsert release version group version=%d group=%d: %w",
                releaseVersionID, group.ID, err)
        }
    }
    return nil
}
```

**Collaboration-Member-Upsert als Vorlage** (release_helpers lines 308-317):
```go
for _, memberGroup := range memberGroups {
    if _, err := tx.Exec(ctx, `
        INSERT INTO fansub_collaboration_members (collaboration_id, member_group_id)
        VALUES ($1, $2)
        ON CONFLICT (collaboration_id, member_group_id) DO NOTHING
    `, collaboration.ID, memberGroup.ID); err != nil {
        return nil, fmt.Errorf("upsert import collaboration member …: %w", ...)
    }
}
```
Dieses Muster (range + INSERT ON CONFLICT DO NOTHING) ist die direkte Vorlage für den neuen N-fach-Schreibpfad — nur Tabellenname und Spalten ändern sich.

**Error-Wrapping-Pattern** (überall in release_helpers und episode_version_repository):
```go
return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, group.ID, err)
```

---

### `backend/internal/repository/episode_import_repository_release_helpers.go` (repository helper, CRUD — modify)

**Analog:** self (direkte Änderung)

Zu entfernende Funktionen (Zeilen aus CONTEXT.md/RESEARCH.md):
- `upsertImportCollaborationGroup` (lines ~290-318)
- `buildImportCollaborationName` (lines ~488-501)
- `resolvedImportFansubSelection.EffectiveGroup` Struct-Feld und Wrapping

Zu vereinfachende Funktion `buildAnimeFansubLinkGroupIDs` (lines 504-528):
```go
// AKTUELL:
func buildAnimeFansubLinkGroupIDs(selection resolvedImportFansubSelection) []int64 {
    // union von EffectiveGroup + MemberGroups
    if selection.EffectiveGroup != nil {
        appendGroupID(selection.EffectiveGroup.ID)
    }
    for _, group := range selection.MemberGroups {
        appendGroupID(group.ID)
    }
    // ...
}

// NEU (nur MemberGroups, kein EffectiveGroup):
func buildAnimeFansubLinkGroupIDs(memberGroups []resolvedImportFansubGroup) []int64 {
    seen := make(map[int64]struct{}, len(memberGroups))
    result := make([]int64, 0, len(memberGroups))
    for _, group := range memberGroups {
        if group.ID <= 0 { continue }
        if _, exists := seen[group.ID]; exists { continue }
        seen[group.ID] = struct{}{}
        result = append(result, group.ID)
    }
    sort.Slice(result, func(i, j int) bool { return result[i] < result[j] })
    return result
}
```

**Validierungsmuster D-06** — `lookupImportFansubGroupByID` (lines ~372-385) gibt bereits `ErrNotFound` zurück; dieses Verhalten bleibt. Kein neues Muster nötig.

---

### `backend/internal/models/episode_version.go` (model — modify)

**Analog:** self

**Aktuelles Feld** (line 17):
```go
FansubGroup *FansubGroupSummary `json:"fansub_group,omitempty"`
```

**Neues Feld** (D-08):
```go
FansubGroups []FansubGroupSummary `json:"fansub_groups,omitempty"`
```

**Zu entfernendes Feld** (line 119):
```go
CollaborationGroupID *int64 `json:"collaboration_group_id,omitempty"`
```

Verbleibende `SelectedGroups []FansubGroupSummary` in `EpisodeVersionEditorContext` (line 120) bleibt unverändert.

---

### `backend/internal/models/fansub.go` (model — modify)

**Analog:** self

Zu entfernen:
- `FansubGroupTypeCollaboration FansubGroupType = "collaboration"` (line 15)
- `CollaborationMembers []FansubGroupSummary` aus `FansubGroup` (line 62)
- `CollaborationMembers []FansubGroupSummary` aus `PublicFansubProfileResponse` (line 72)
- `CollaborationMember` struct und verwandte Typen (falls vorhanden)

`FansubGroupType`-Typ wird zu:
```go
// FansubGroupType unterscheidet regulaere Fansub-Gruppen (einziger erlaubter Wert nach Phase 81).
type FansubGroupType string

const (
    FansubGroupTypeGroup FansubGroupType = "group"
)
```

---

### `backend/internal/migrations/phase81_collaboration_removal_test.go` (test — neu)

**Analog:** `backend/internal/migrations/fansub_integrity_test.go` + `phase67_release_version_credits_test.go`

**Package + imports pattern** (fansub_integrity_test.go lines 1-8):
```go
package migrations

import (
    "os"
    "path/filepath"
    "strings"
    "testing"
)
```

**readMigrationFile helper** ist bereits in `fansub_integrity_test.go` (lines 69-79) definiert — dieselbe Hilfsfunktion verwenden:
```go
func readMigrationFile(t *testing.T, filename string) string {
    t.Helper()
    path := filepath.Join("..", "..", "..", "database", "migrations", filename)
    content, err := os.ReadFile(path)
    if err != nil {
        t.Fatalf("read migration file %s failed: %v", filename, err)
    }
    return string(content)
}
```
Achtung: `readMigrationFile` ist bereits im Package deklariert — neue Testfunktionen direkt dazuschreiben, keine Duplikate.

**assertContainsAll helper** (phase67_release_version_credits_test.go L16-24):
```go
assertContainsAll(t, up, []string{
    "insert into release_version_groups",
    "on conflict (release_version_id, fansub_group_id) do nothing",
    "group_type = 'collaboration'",
    "status = 'dissolved'",
})
```
`assertContainsAll` muss vorhanden sein — prüfen ob sie im Package schon existiert (sie wird in phase67 genutzt); falls ja, direkt verwenden.

**Test-Struktur für Phase 81**:
```go
func TestPhase81CollaborationExpansionMigrationContract(t *testing.T) {
    up := strings.ToLower(readMigrationFile(t, "0101_expand_release_version_groups_from_collaborations.up.sql"))
    assertContainsAll(t, up, []string{
        "insert into release_version_groups",
        "on conflict (release_version_id, fansub_group_id) do nothing",
        "insert into anime_fansub_groups",
        "delete from release_version_groups",
        "status = 'dissolved'",
        "has_restrict_refs",
    })
}

func TestPhase81CollaborationSchemaDropMigrationContract(t *testing.T) {
    up := strings.ToLower(readMigrationFile(t, "0102_drop_collaboration_schema.up.sql"))
    assertContainsAll(t, up, []string{
        "active_collabs",
        "raise exception",
        "drop table if exists fansub_collaboration_members",
        "drop column if exists group_type",
    })
    down := strings.ToLower(readMigrationFile(t, "0102_drop_collaboration_schema.down.sql"))
    assertContainsAll(t, down, []string{
        "add column if not exists group_type",
        "create table if not exists fansub_collaboration_members",
    })
}
```

---

### `backend/internal/repository/episode_version_repository_write_helpers_test.go` (test — neu)

**Analog:** `backend/internal/repository/episode_import_repository_test.go` (source-scan pattern)

**Package + imports** (episode_import_repository_test.go lines 1-9):
```go
package repository

import (
    "os"
    "strings"
    "testing"

    "team4s.v3/backend/internal/models"
)
```

**Source-Scan-Testmuster** (episode_import_repository_test.go lines 164-181):
```go
func TestEpisodeImportReleaseHelpers_SourceCreatesMembersBeforeCollaborationLink(t *testing.T) {
    t.Parallel()

    content, err := os.ReadFile("episode_import_repository_release_helpers.go")
    if err != nil {
        t.Fatalf("read release helper source: %v", err)
    }
    source := string(content)

    memberUpsert := strings.Index(source, "collaboration, err := upsertImportFansubGroup(")
    collaborationLink := strings.Index(source, "INSERT INTO fansub_collaboration_members")
    if memberUpsert < 0 || collaborationLink < 0 {
        t.Fatalf("expected source to create member groups before writing collaboration links")
    }
}
```

Neue Tests für P81-SC1/SC6 verwenden dasselbe Muster:
```go
func TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRows(t *testing.T) {
    t.Parallel()
    content, err := os.ReadFile("episode_version_repository_write_helpers.go")
    // ... strings.Index Checks für N-fach INSERT ON CONFLICT DO NOTHING ...
}

func TestResolveImportFansubMemberGroups_RejectsUnknownGroupID(t *testing.T) {
    t.Parallel()
    content, err := os.ReadFile("episode_import_repository_release_helpers.go")
    // ... prüft dass lookupImportFansubGroupByID vor upsertImportFansubGroup aufgerufen wird ...
}

func TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup(t *testing.T) {
    t.Parallel()
    // Struct-level Test — EffectiveGroup existiert nicht mehr
    groups := []resolvedImportFansubGroup{
        {ID: 3, Name: "FlameHazeSubs"},
        {ID: 4, Name: "TestGruppe"},
        {ID: 3, Name: "FlameHazeSubs"}, // Duplikat
    }
    result := buildAnimeFansubLinkGroupIDs(groups)
    if len(result) != 2 {
        t.Fatalf("expected 2 deduplicated group IDs, got %v", result)
    }
}
```

---

### `backend/internal/repository/episode_import_repository_test.go` (test — rewrite)

**Analog:** self

Zu entfernen (RESEARCH.md Q7):
- `TestBuildImportCollaborationName_IsStableAcrossSelectionOrder` (line 145)
- `TestEpisodeImportReleaseHelpers_SourceCreatesMembersBeforeCollaborationLink` (line 164)

Zu rewriten:
- `TestBuildAnimeFansubLinkGroupIDs_IsIdempotentAcrossRepeatedApply` (line 183):
  `selection.EffectiveGroup` entfernen; Test prüft nur noch `[]resolvedImportFansubGroup`-Deduplizierung.
- `TestEpisodeImportApply_UsesReleaseNativeTablesOnly` (line 227):
  `"insert into fansub_collaboration_members"` und `"models.fansubgrouptypecollaboration"` aus `required`-Liste entfernen.

**Beizubehaltendes Muster** — `t.Parallel()` und `os.ReadFile`-basierte Source-Scan-Tests (lines 207-225 bleiben unverändert).

---

### Frontend — Chip-Anzeige (`frontend/src/app/admin/my-groups/[id]/page.tsx` und neue Komponente)

**Analog:** `frontend/src/app/admin/my-groups/[id]/page.tsx` (Badge-Pattern)

**Imports pattern** (my-groups/[id]/page.tsx lines 1-31):
```tsx
"use client";

import { Badge, Button, Card, Table, ... } from "@/components/ui";
import type { ContributorReleaseVersionSummary } from "@/types/contributor";
```

**Badge-Verwendungsmuster** (my-groups/[id]/page.tsx lines 354-366):
```tsx
<Badge variant={release.media_count > 0 ? "success" : "muted"}>
    {release.media_count} Medien
</Badge>
```

**Neue Chip-Reihe für `fansub_groups[]`** (D-09) — analog zu `<div className={styles.badgeRow}>`:
```tsx
<div className={styles.fansubChips}>
    {version.fansub_groups?.map((group) => (
        <Badge key={group.id} variant="neutral">
            {group.name}
        </Badge>
    ))}
</div>
```
Varianten: `'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'muted'` — `neutral` ist korrekt für gleichwertige Gruppen ohne Status-Bedeutung.

**VERBOTEN** (CLAUDE.md global UI): Kein handgebautes `<span className="chip">` oder ähnliches. Ausschließlich `<Badge>` aus `@/components/ui`.

---

### `frontend/src/app/fansubs/[slug]/page.tsx` (component SSR — modify)

**Analog:** self (direkte Änderung)

**Zu entfernender Zweig** (lines 79-91):
```tsx
// ENTFERNEN:
if (group.group_type === 'collaboration') {
    return (
        <main className={styles.page}>
            <div className={styles.readingColumn}>
                <FansubHeroSection
                    group={group}
                    isCollaboration
                    collaborationMembers={profile.collaboration_members ?? []}
                />
            </div>
        </main>
    )
}
```

**Error-Handling-Pattern** (page.tsx lines 56-73) — beibehalten:
```tsx
try {
    profileResponse = await getPublicFansubProfileBySlug(slug)
} catch (error) {
    message =
        error instanceof ApiError && error.status === 404
            ? 'Fansubgruppe nicht gefunden.'
            : 'Fansub-Profil konnte nicht geladen werden.'
}
```

**D-10 Kooperations-Hinweis** — minimale V1-Ergänzung (innerhalb bestehender Seitenstruktur):
- `release_versions_count` ist bereits über `FansubHighlightsSection` zugänglich
- Neues Feld `coop_release_count` oder `is_coop`-Anteil kann in `FansubHighlightsSection` eingebettet werden
- Exakte visuelle Ausgestaltung bleibt `/gsd:ui-phase` überlassen (D-10 Constraint)

---

### `frontend/src/types/episodeVersion.ts` (type — modify)

**Analog:** self

**Aktuell** (line 12):
```typescript
fansub_group?: FansubGroupSummary | null
```

**Neu** (D-08):
```typescript
fansub_groups?: FansubGroupSummary[]
```

**Zu entfernen** (line 51):
```typescript
collaboration_group_id?: number | null
```

---

### `frontend/src/types/fansub.ts` (type — modify)

**Analog:** self

**Aktuell** (line 4):
```typescript
export type FansubGroupType = "group" | "collaboration";
```

**Neu**:
```typescript
export type FansubGroupType = "group";
```

**Zu entfernen** aus `FansubGroup` interface (line 45):
```typescript
collaboration_members?: FansubGroupSummary[];
```

---

### Gemeinsamer Aufruf-/Wiring-Kontext `backend/cmd/server/main.go` (config/wiring — modify)

**Analog:** self

Zu entfernende Routen laut RESEARCH.md Q8 Open Question 2 (L457 Bereich) — Planner liest `main.go` L450-470 vollständig. Pattern für Route-Entfernung: einfaches Löschen der `router.POST("/fansubs/:id/collaboration-members", ...)` und analoger DELETE-Route.

---

## Shared Patterns

### ON CONFLICT DO NOTHING — Idempotente Junction-Writes
**Source:** `backend/internal/repository/episode_import_repository_release_helpers.go` lines 193-206 und 308-317
**Apply to:** `episode_version_repository_write_helpers.go`, Migration 0101

```go
INSERT INTO release_version_groups (release_version_id, fansub_group_id)
VALUES ($1, $2)
ON CONFLICT (release_version_id, fansub_group_id) DO NOTHING
```

### Error-Wrapping in Repository-Funktionen
**Source:** `backend/internal/repository/episode_import_repository_release_helpers.go` (durchgehend)
**Apply to:** alle neuen `_write_helpers.go` und `_read_helpers.go` Funktionen

```go
return fmt.Errorf("upsert release version group version=%d group=%d: %w", releaseVersionID, group.ID, err)
```

### DO $$ Guard vor destruktiven Migrationen
**Source:** `database/migrations/0057_drop_release_version_groups_fansubgroup_id.up.sql` lines 4-26
**Apply to:** `0102_drop_collaboration_schema.up.sql` (Guard vor DROP TABLE); `0101` (Guard vor DELETE-Loop)

### Aggregation via COALESCE + ARRAY_AGG/json_agg … FILTER
**Source:** `backend/internal/repository/episode_version_repository.go` lines 156-161
**Apply to:** `episode_version_repository_read_helpers.go` — json_agg Erweiterung desselben Musters für Gruppen-Array

### Badge-Primitiv für Status-Labels und Chips
**Source:** `frontend/src/app/admin/my-groups/[id]/page.tsx` lines 354-366
**Apply to:** alle neuen Chip-Darstellungen für `fansub_groups[]`; `is_coop`-Anzeige-Upgrade

```tsx
import { Badge } from "@/components/ui";
// ...
<Badge variant="neutral">{group.name}</Badge>
```
Pflicht per CLAUDE.md: kein natives `<span>` oder Eigen-Markup für Chip-Darstellung.

### Source-Scan-Tests (kein DB nötig)
**Source:** `backend/internal/repository/episode_import_repository_test.go` lines 164-181, 207-266
**Apply to:** neue Tests in `episode_version_repository_write_helpers_test.go`, `episode_version_repository_read_helpers_test.go`

Muster: `os.ReadFile(filename)` + `strings.Index` / `strings.Contains` auf Quell-Strings.

### Migration-Contract-Tests
**Source:** `backend/internal/migrations/fansub_integrity_test.go` lines 19-33, `phase67_release_version_credits_test.go` lines 12-28
**Apply to:** neue Testdatei `backend/internal/migrations/phase81_collaboration_removal_test.go`

Muster: `readMigrationFile(t, "NNNN_name.up.sql")` + `strings.ToLower` + `assertContainsAll`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/components/anime/ReleaseVersionFansubChips.test.tsx` | test (Vitest) | — | Keine bestehenden Chip-spezifischen Komponententests für Fansub-Anzeige; nächster Analog ist `frontend/src/app/admin/my-groups/[id]/page.test.tsx` (nutzt `is_coop`-Boolean, kein Chip-Array-Test) |
| `backend/internal/repository/episode_version_repository_read_helpers_test.go` | test | — | Kein bestehender Scan-Test für Aggregations-Lesepfad; Source-Scan-Muster aus `episode_import_repository_test.go` anwenden |

---

## File-Size-Hinweise (CLAUDE.md 450-Zeilen-Limit)

| Datei | Aktion | Ziel-Größe |
|---|---|---|
| `episode_version_repository.go` (1246 Z) | Split in 3 Dateien (Pflicht) | ~300 Z (Kern) |
| `episode_version_repository_read_helpers.go` (neu) | `listReleaseVariantsByAnimeID`, `scanReleaseVariantAsEpisodeVersion`, `buildGroupedEpisodeCounts`, `countReleaseVariantsByEpisodeNumber` | ~250 Z |
| `episode_version_repository_write_helpers.go` (neu) | `syncEpisodeVersionSelectedGroups`, `upsertReleaseVersionGroupsForSync`, `applyEpisodeVersionReleaseMetadata`, `applyEpisodeVersionVariantMetadata`, `loadEpisodeVersionStateForUpdate`, `ensureEpisodeVersionStream` | ~250 Z |
| `episode_import_repository_release_helpers.go` (551 Z → ~470 Z nach Entfernung) | Bleibt knapp über Limit; Extraktion von `resolveImportFansubMemberGroups` in `episode_import_repository_fansub_helpers.go` falls > 450 Z | ≤ 450 Z |

---

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/models/`, `backend/internal/migrations/`, `database/migrations/`, `frontend/src/app/admin/`, `frontend/src/components/anime/`, `frontend/src/types/`
**Files scanned:** ~25 Quelldateien direkt gelesen
**Pattern extraction date:** 2026-06-09
