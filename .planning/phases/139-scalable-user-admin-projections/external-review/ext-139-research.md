---
phase: 139-scalable-user-admin-projections
type: research
status: complete
---

# Phase 139 Research

## 1. Roadmap/requirements

Roadmap explicitly requires UADM-02…UADM-08 and QUAL-06.

Current contribution/media endpoints are unbounded:
- `GET /api/v1/admin/users/:userId/contributions`
- `GET /api/v1/admin/users/:userId/media`

Current contribution DTO returns four raw arrays:
- `project_defaults`
- `release_overrides`
- `open_disputes`
- `legacy_historical`

Current media DTO returns one raw array:
- `media_items`

These contracts are not suitable for server-side grouped stable pagination.

## 2. Current contribution repository behavior

`AdminUsersRepository.ListUserContributions`:
- resolves the member via verified claim,
- loads all contribution rows for that member,
- joins group/anime/roles and release/version/episode,
- groups only for role aggregation,
- sorts,
- then classifies rows in Go into four arrays.

It does not:
- paginate,
- filter,
- project project blocks,
- use `release_crew_snapshots`,
- compare independent release crew to project standard,
- build standard ranges,
- return filtered count metadata.

The Phase-138 fix added:
- `release_version_label`
- `episode_number`

This removed one display bug but intentionally did not implement Phase 139.

## 3. Contribution data supports real deviation detection

`release_crew_snapshots` already records:
- `inherited`
- `independent`

Confirmed project standard comes from project-level contributions (`release_version_id IS NULL`).

Therefore the projection can distinguish:
- inherited → follows project standard,
- independent + equal effective member/role set → independent storage but no semantic deviation,
- independent + different effective member/role set → real deviation.

For the user-specific admin projection, the comparison must answer whether THIS member's effective role assignment differs from the project standard, while retaining enough project context to explain the project default once.

## 4. Range ordering

`episodes.sort_index` is the canonical ordering signal available for range construction.
Never collapse by contribution id or release_version_id.

Real deviations remain individual exceptions per discussion.
Only consecutive standard-equivalent release contexts are collapsed into ranges.

## 5. Current media repository behavior

`GetUserMedia` currently:
- queries all `release_version_media` rows uploaded by user,
- returns media asset id/type/path-like `original_filename`,
- hardcodes `public_url=''`,
- hardcodes `file_size_bytes=0`,
- constructs `owner_context='release_version:<id>'`.

Frontend then:
- parses the id from `owner_context`,
- groups client-side by that string,
- renders nested cards,
- labels raw ids as Release-Version context,
- derives a fake `Berechtigung aktiv/fehlt` from string format,
- links each item to a workspace.

Phase 139 must replace this with a domain projection.

## 6. Media data supports fachliche grouping

Release-version media can be joined to:
- release version,
- release,
- episode,
- anime,
- fansub group/project context,
- media asset/type,
- uploader/time.

This is sufficient for:
`Anime → Project → Release/Episode → media summaries`.

Deep media-file/storage diagnostics are not needed in this phase.

## 7. Current rights scale issue

`UserGroupRightsTab` currently:
1. loads all group memberships,
2. loads role-capability matrix,
3. performs `Promise.all(memberships.map(getEffectiveRights))`,
4. renders every group and every capability.

This creates request fan-out proportional to number of memberships.
UADM-06 requires large rights inventories to be server-side bounded/filterable and stably navigable.

Phase 139 should make group context selection lazy/bounded rather than reimplement rights semantics.

## 8. UI direction

Contribution UI today is four technical tables; media UI is nested Cards.
Both conflict with Phase-139 success criteria.

Agreed replacement:
- contribution: anime heading → project block → always-visible project standard → compact standard ranges → individual real deviations,
- media: anime/project context → paginated release/episode block → small lazy preview grid/list → one canonical workspace action,
- informational purpose copy at top of each affected section,
- responsive cards/rows with no page overflow.

## 9. Contract strategy

Prefer replacing the admin user contribution/media response contracts with dedicated projection response types while keeping endpoint URLs stable unless compatibility requires a v2 path.

Each response should contain:
- `items`
- `meta.total`
- `meta.limit`
- `meta.offset` or cursor metadata
- active filter echo where useful

Count and page query must share the same filter predicate/projection key.

## 10. Performance strategy

Contribution:
- project-key page selection first,
- then batch-load details for only page project keys,
- no per-project/per-release queries.

Media:
- release-context page selection first,
- then batch-load media summaries for only selected context keys,
- no per-block query.

Rights:
- bounded membership page/filter,
- fetch effective rights only for selected group,
- never fan out one request per membership.

Query-count tests should assert bounded query counts independent of item volume.
