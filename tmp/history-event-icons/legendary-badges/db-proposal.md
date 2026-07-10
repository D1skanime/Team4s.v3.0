# Legendary Count Achievement Proposal

Draft proposal only. Not implemented in DB yet.

These achievements are intended as rare/locked count-based badges. Later, the UI should only expose/select/show them when backend-derived counts confirm the condition.

## Proposed Event / Badge Codes

| code | German label | category | future condition |
| --- | --- | --- | --- |
| `projects_10` | 10 Projekte | `project_count` | fansub group has at least 10 confirmed/public projects |
| `projects_50` | 50 Projekte | `project_count` | fansub group has at least 50 confirmed/public projects |
| `releases_100` | 100 Releases | `release_count` | fansub group has at least 100 confirmed/public release versions or releases |
| `releases_500` | 500 Releases | `release_count` | fansub group has at least 500 confirmed/public release versions or releases |
| `projects_100` | 100 Projekte | `project_count` | fansub group has at least 100 confirmed/public projects |
| `releases_1000` | 1000 Releases | `release_count` | fansub group has at least 1000 confirmed/public release versions or releases |
| `releases_5000` | 5000 Releases | `release_count` | fansub group has at least 5000 confirmed/public release versions or releases |
| `releases_10000` | 10000 Releases | `release_count` | fansub group has at least 10000 confirmed/public release versions or releases |
| `projects_500` | 500 Projekte | `project_count` | fansub group has at least 500 confirmed/public projects |

## Approved Project Count Sheet

The file `legendary-project-count-v2-approved.png` is approved for project-count achievements.

Ordering, left-to-right and top-to-bottom:

1. `projects_10` - 10 Projekte
2. `projects_50` - 50 Projekte
3. `projects_100` - 100 Projekte
4. `projects_500` - 500 Projekte

Design decision: project-count achievements should show team work, project boards, anime frame tiles, and growing production scale. Avoid books, DVDs, discs, and physical cases.

## Release Count Sheet Candidate

The file `legendary-release-count-v4-violet-1000.png` is the current candidate for release-count achievements. It replaces `legendary-release-count-v2.png` because the previous release badges were too similar in color and rarity language, and updates the 1000-release badge from gold/white to violet.

Ordering, left-to-right on the top row, then left-to-right on the bottom row:

1. `releases_100` - 100 Releases
2. `releases_500` - 500 Releases
3. `releases_1000` - 1000 Releases
4. `releases_5000` - 5000 Releases
5. `releases_10000` - 10000 Releases

Design decision: release-count achievements should show digital fansub release flow: subtitle timelines, upload streams, server nodes, release lanes, anime frame tiles, and team scale. Avoid books, DVDs, discs, and physical cases. The rarity levels should be strongly color-coded: 100 blue/cyan, 500 green/turquoise, 1000 violet/amethyst, 5000 red/magenta, and 10000 as an ultra-legendary black/gold/rainbow cosmic badge.

## Legacy Mixed Concept Sheet

The file `legendary-count-achievements-v1.png` is superseded for project-count achievements because books/DVD-like motifs did not fit the desired anime/team language. It used this exact order, left-to-right and top-to-bottom:

1. `projects_10`
2. `projects_50`
3. `releases_100`
4. `releases_500`
5. `projects_100`
6. `releases_1000`
7. `releases_5000`
8. `releases_10000`
9. `projects_500`

## Implementation Notes For Later

- These should probably not be normal manually selectable `fansub_group_history.event_type` values.
- Safer model: derived achievements from backend counts, with optional public visibility.
- If stored, use a separate achievement table or a separate category field, not the same semantics as historical events.
- Count source needs one final decision:
  - projects: likely distinct anime/fansub projects, not arbitrary notes.
  - releases: decide whether this means `fansub_releases`, `release_versions`, or public release-version count.
- UI should display locked/unearned states only if product wants a catalog view; public profile should show earned only.
