---
phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
verified: pending
status: ready-for-uat
---

# Phase 21 Verification

## Goal

Prove that both write surfaces now use the same backend-authoritative fansub-group contract:

1. import applies existing groups as chips without frontend-owned collaboration identity
2. import applies a new multi-group collaboration such as `FlameHazeSubs + TestGruppe`
3. manual episode-version editing persists the same selected groups through save

Every check below should confirm matching truth in:

- `release_version_groups`
- `fansub_collaboration_members`
- `anime_fansub_groups`

## Environment

Start or refresh the local stack:

```powershell
docker compose up -d team4sv30-db team4sv30-redis
docker compose up -d --build team4sv30-backend team4sv30-frontend
```

Optional automated confidence before manual checks:

```powershell
cd backend; go test ./internal/repository ./internal/handlers -count=1
```

App URLs:

- Frontend: `http://127.0.0.1:3002`
- Backend health: `http://127.0.0.1:8092/health`

SQL shell pattern used below:

```powershell
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "<SQL>"
```

## Test Data

Use an anime that already has:

- an importable Jellyfin series
- at least one existing local fansub group such as `FlameHazeSubs`
- permission to create a disposable extra group named `TestGruppe` if it does not exist yet

Record the working `anime_id` once chosen:

```sql
SELECT id, title
FROM anime
ORDER BY id ASC;
```

## Case 1: Import Existing Groups As Chips

### Manual Steps

1. Open `/admin/anime/{anime_id}/episodes/import`.
2. Load a preview with a Jellyfin-linked source.
3. In one mapping row, search the fansub chip field and select exactly one existing group, for example `FlameHazeSubs`.
4. Apply the mapping.
5. Confirm the UI reports a successful apply.

### Expected UI Result

- The row uses the selected chip, not free-text-only fallback.
- Apply succeeds without creating a frontend-authored collaboration.
- Re-opening the import page or manual editor shows the same selected group persisted.

### SQL Checks

Replace `{anime_id}` and optionally narrow by episode number if needed.

```sql
SELECT
  e.anime_id,
  e.episode_number,
  rev.id AS release_version_id,
  fg.id AS fansub_group_id,
  fg.name,
  fg.group_type
FROM episodes e
JOIN fansub_releases fr ON fr.episode_id = e.id
JOIN release_versions rev ON rev.release_id = fr.id
JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
JOIN fansub_groups fg ON fg.id = COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id)
WHERE e.anime_id = {anime_id}
ORDER BY e.episode_number::int, rev.id;
```

Expected:

- the affected `release_version_groups` row points directly to the selected existing group
- `group_type = 'group'`

```sql
SELECT
  afg.anime_id,
  fg.id AS fansub_group_id,
  fg.name,
  fg.group_type
FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
WHERE afg.anime_id = {anime_id}
ORDER BY fg.name ASC;
```

Expected:

- the selected existing group is present in `anime_fansub_groups`

```sql
SELECT
  collaboration_id,
  member_group_id
FROM fansub_collaboration_members
WHERE collaboration_id IN (
  SELECT fg.id
  FROM fansub_groups fg
  WHERE fg.name = 'FlameHazeSubs'
);
```

Expected:

- no new collaboration requirement is introduced for the single-group case

## Case 2: Import A New Multi-Group Collaboration

### Manual Steps

1. Stay on `/admin/anime/{anime_id}/episodes/import`.
2. Choose one mapping row.
3. Add two chips: existing `FlameHazeSubs` and new free-text `TestGruppe`.
4. Apply the mapping.
5. Confirm the UI reports success.

### Expected UI Result

- The operator selects member groups as chips.
- No explicit collaboration chip is required in the UI.
- After apply, reopening the row/editor reflects the two member groups.

### SQL Checks

```sql
SELECT id, slug, name, group_type
FROM fansub_groups
WHERE name IN ('FlameHazeSubs', 'TestGruppe', 'FlameHazeSubs & TestGruppe')
ORDER BY name ASC;
```

Expected:

- `FlameHazeSubs` exists as `group`
- `TestGruppe` exists as `group`
- `FlameHazeSubs & TestGruppe` exists as `collaboration`

```sql
SELECT
  collab.id AS collaboration_id,
  collab.name AS collaboration_name,
  member.id AS member_group_id,
  member.name AS member_group_name
FROM fansub_groups collab
JOIN fansub_collaboration_members fcm ON fcm.collaboration_id = collab.id
JOIN fansub_groups member ON member.id = fcm.member_group_id
WHERE collab.name = 'FlameHazeSubs & TestGruppe'
ORDER BY member.name ASC;
```

Expected:

- `fansub_collaboration_members` contains exactly `FlameHazeSubs` and `TestGruppe`

```sql
SELECT
  e.anime_id,
  e.episode_number,
  rev.id AS release_version_id,
  fg.name AS effective_group_name,
  fg.group_type
FROM episodes e
JOIN fansub_releases fr ON fr.episode_id = e.id
JOIN release_versions rev ON rev.release_id = fr.id
JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
JOIN fansub_groups fg ON fg.id = COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id)
WHERE e.anime_id = {anime_id}
  AND fg.name = 'FlameHazeSubs & TestGruppe'
ORDER BY e.episode_number::int, rev.id;
```

Expected:

- `release_version_groups` stores the effective collaboration group

```sql
SELECT
  afg.anime_id,
  fg.name,
  fg.group_type
FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
WHERE afg.anime_id = {anime_id}
  AND fg.name IN ('FlameHazeSubs', 'TestGruppe', 'FlameHazeSubs & TestGruppe')
ORDER BY fg.name ASC;
```

Expected:

- `anime_fansub_groups` contains all three links:
  - `FlameHazeSubs`
  - `TestGruppe`
  - `FlameHazeSubs & TestGruppe`

## Case 3: Save The Same Selection Through The Manual Episode-Version Editor

### Manual Steps

1. Open an existing release version from `/admin/anime/{anime_id}/versions` or the grouped episode list.
2. Open `/admin/episode-versions/{version_id}/edit`.
3. In the fansub chip field, select the same two member groups: `FlameHazeSubs` and `TestGruppe`.
4. Save the version.
5. Reload the page.

### Expected UI Result

- Save succeeds without the frontend calling standalone collaboration create/member mutation flows.
- Reload shows the same two selected member chips.
- The effective persisted group on the returned version is still the collaboration chosen by the backend.

### SQL Checks

```sql
SELECT
  rv.id AS variant_id,
  rev.id AS release_version_id,
  e.anime_id,
  e.episode_number,
  fg.id AS effective_group_id,
  fg.name AS effective_group_name,
  fg.group_type
FROM release_variants rv
JOIN release_versions rev ON rev.id = rv.release_version_id
JOIN fansub_releases fr ON fr.id = rev.release_id
JOIN episodes e ON e.id = fr.episode_id
JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
JOIN fansub_groups fg ON fg.id = COALESCE(rvg.fansubgroup_id, rvg.fansub_group_id)
WHERE rv.id = {version_id};
```

Expected:

- the saved manual edit points at `FlameHazeSubs & TestGruppe`
- `release_version_groups` matches the import path for the same member-set

```sql
SELECT
  collab.name AS collaboration_name,
  member.name AS member_group_name
FROM fansub_groups collab
JOIN fansub_collaboration_members fcm ON fcm.collaboration_id = collab.id
JOIN fansub_groups member ON member.id = fcm.member_group_id
WHERE collab.name = 'FlameHazeSubs & TestGruppe'
ORDER BY member.name ASC;
```

Expected:

- `fansub_collaboration_members` is unchanged and still authoritative

```sql
SELECT
  afg.anime_id,
  fg.name,
  fg.group_type
FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
WHERE afg.anime_id = {anime_id}
  AND fg.name IN ('FlameHazeSubs', 'TestGruppe', 'FlameHazeSubs & TestGruppe')
ORDER BY fg.name ASC;
```

Expected:

- manual save preserves the same `anime_fansub_groups` follow-through as import apply

## Pass Criteria

Phase 21 is verified when all three cases are true:

- import and manual editor both submit member-group selections, not frontend-authored collaboration identities
- `release_version_groups` stores the backend-resolved effective group
- `fansub_collaboration_members` stores the collaboration membership exactly once
- `anime_fansub_groups` includes the effective collaboration and member groups for the anime

## Failure Notes To Capture If Anything Breaks

- exact route used
- `anime_id`
- `version_id` if the manual editor case fails
- chip selections used
- SQL output from all three tables
- whether the bad state came from import apply, manual save, or only UI reload
