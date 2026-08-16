# Member-profile fixture manifest (`member-profile-fixture.manifest.json`)

The **single, versioned, machine-readable source of truth** for what "correct"
means for the two reference public member profiles — `csubs-leader` (member 1)
and `sheppert` (member 2) — after `scripts/seed-member-profile-fixtures.mjs`
has run.

Per CONTEXT.md D-02 (Phase 134): the seed script itself, Plan 134-03's
verification matrix, and Plan 134-05's reset script all read **this exact
file**. Nothing else independently re-declares these facts. A mismatch
between what the seed asserts and what actually landed in the database is
therefore a red test (`RESULT: FAIL`), never a silent drift.

## How to read it

Top level:

- `manifest_version` (integer) — bump whenever the shape or expected values
  change in a way downstream consumers must react to.
- `profiles` — an object keyed by the two **stable public slugs**
  (`sheppert`, `csubs-leader`) — never by numeric member ID, because IDs are
  not guaranteed stable across a reset/reseed.

## Field reference (per `profiles.<slug>`)

| Field | Meaning |
| --- | --- |
| `identity.slug` | The stable public slug this profile block describes. |
| `visibility.profile_visibility` | Expected `profile_visibility` value on the profile (`"public"` for both reference profiles). |
| `profile_status` | Expected `profile_status` on the public projection (`"memorial"` for sheppert, `"active"` for csubs-leader). |
| `roles` | Object keyed by fansub-group slug, each value the distinct role codes the member holds in that group's current or historical membership. |
| `memberships.current` / `memberships.historical` | Expected count of current (no `left_date`) vs. historical (`left_date` set) group memberships. |
| `projects.confirmed_distinct_anime_min` | (csubs-leader only) Minimum number of confirmed, public, distinct-anime current projects — the dense case. |
| `projects.sparse` | `true` if this profile is the intentionally sparse/low-volume case (sheppert), `false` if it is the dense case (csubs-leader). |
| `projects.current_projects_count` | (sheppert only) The concrete, single-source expected `current_projects_count` for the sparse case — no fallback/hedge needed since it is explicit here. |
| `badges.total_points_greater_than_zero` | Whether this profile is expected to have `total_points > 0` from awarded release credits. |
| `media.has_story_image` | Whether this profile is expected to have at least one member-owned story image referenced in `member_story_json`/`member_story_html`. |
| `media.story_html_contains` | The literal substring the seed and matrix assert is present in the public `member_story_html` field once the story image is referenced. **Note:** this is `/media/profile/` (the actual `src` pattern the backend's TipTap sanitizer allows — see "Story-image URL shape" below), not `/media/story-images/` (that is a separate, distinct resolve-by-ID endpoint used only for editor-side image preview, never embedded in saved/rendered story HTML). |
| `content_lengths.member_story_min_chars` | A loose floor proving the seeded story text (extracted plain text from the TipTap doc) is non-trivial, not empty/whitespace. |

## Story-image URL shape

`backend/internal/services/tiptap_service.go`'s `newTipTapSanitizerPolicy()`
only allows an `<img>` `src` attribute matching:

```
^/media/profile/\d+/story/[a-z0-9-]+/original\.(jpg|jpeg|png|webp)$
```

This is the actual, real path a saved story image's `src` will have inside
`member_story_html` — proven by the `media.story_html_contains` field above.
`POST /api/v1/me/profile/story-images` is used to **upload** the image (Task
1's media step); `GET /api/v1/media/story-images/:id` is a **separate**,
resolve-by-ID convenience endpoint the editor UI uses for round-tripping a
loaded image before save — it is never the `src` value that ends up
persisted in `member_story_html`.

## How to regenerate / validate it

This manifest is hand-authored, not generated. To validate it is well-formed
and complete:

```bash
docker exec team4sv30-frontend node -e "
const m = JSON.parse(require('fs').readFileSync('/tmp/manifest-check.json', 'utf8'));
if (!m.manifest_version || !m.profiles.sheppert || !m.profiles['csubs-leader']) process.exit(1);
console.log('manifest OK');
"
```

(after `docker cp scripts/member-profile-fixture.manifest.json
team4sv30-frontend:/tmp/manifest-check.json`).

To confirm the seed script's own assertions are actually driven from this
file (not a second, independently-authored copy of these numbers), run the
seed twice in a row and confirm both runs print `RESULT: PASS`:

```bash
docker cp scripts/seed-member-profile-fixtures.mjs team4sv30-frontend:/tmp/seed134.mjs
docker exec team4sv30-frontend node /tmp/seed134.mjs
docker exec team4sv30-frontend node /tmp/seed134.mjs
```

## Notes

- Editing this file is the **only** way to change what "correct" means for
  the fixture. If you find yourself editing a hardcoded number inside
  `seed-member-profile-fixtures.mjs` instead, that is a regression back into
  the drift Pitfall 1 (RESEARCH.md) that this manifest exists to prevent.
- `GROUP_A` / `GROUP_B` mechanics (slug, display name, dissolved-vs-active
  status) stay as seed-internal constants in the script — they are not part
  of PMQA-02's documented field list, only the group **slugs** are
  referenced here (as `roles` keys) to describe which membership each role
  set belongs to.
