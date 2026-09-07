# Member achievement artwork

Phase 151 consolidates the presentation layer. Role eligibility remains in the canonical role
catalog; badge generation, deduplication and thresholds remain in the Phase-150 backend badge
and repository code. This document does not define business thresholds.

## Add an achievement role

1. Use the role code from the existing `anime_contribution` role catalog. Do not add another
   frontend list of valid business roles or copy server thresholds.
2. Add high-resolution PNGs under `frontend/public/member-achievement-badges/`:
   - `role_entry_<code>.png`
   - `role-<code>-motif.png`
   - `rank-frame-<code>-bronze.png`, `rank-frame-<code>-silver.png`,
     `rank-frame-<code>-gold.png`, `rank-frame-<code>-platinum.png`
   Preserve the source resolution and genuine alpha transparency. Frame exteriors and hollow
   centers must be transparent; a depicted checkerboard is not transparency.
3. Add `<code>: 'layered'` to `ROLE_ARTWORK_STRATEGIES` in
   `frontend/src/components/profile/badgeArtwork.ts`. This manifest contains presentation
   strategies only. It contains no labels, eligibility rules or thresholds. `timer` is the
   existing `direct-volume` exception, using its four complete `role_volume_timer_<tier>.png`
   sprites. New exceptions require an explicit reason and review.
4. Run the live-catalog/file coverage gate below and add visual fixture coverage in the linked
   dev gallery. Review entry and all four composed tiers, including the compact stage marker.
   Do not enable a new role with only a plausible filename or a fallback icon as proof of coverage.

## Coverage gate

Run from `/home/d1sk/team4s` on `team4s-linux` with the existing Compose stack:

```sh
docker compose exec -T team4sv30-frontend npx --no-install vitest run src/components/profile/badgeArtwork.test.ts --reporter=dot
```

The test calls the existing `listRoleDefinitions('anime_contribution')` helper and reads the
actual public artwork directory. It fails on an unsupported canonical role or a missing required
file. Synthetic future-role and removed-file cases prove both failure paths. Deliberate absence
belongs in `ROLE_ARTWORK_EXCEPTIONS` with a reason; this currently has no entries. Updating an
exception requires updating the expected coverage result consciously, not skipping the gate.
The test requires the backend available through the frontend container's existing internal API
configuration. A disconnected backend is a failed prerequisite, not a passing coverage result.

## Rendering contract

`AchievementArtwork` owns direct/layered rendering through the existing `ResponsiveImage` seam.
Consumers pass a descriptor, badge code, alternative text, and `hero` or `stage`; they do not pass
ad hoc dimensions. Role cards and family stages establish an unpadded `achievement-card` query
container, so the query width equals the rendered card's outer width.

| Outer card width | Hero | Stage marker |
|---|---|---|
| Below 562 px | 192 × 192 px | 64 × 64 px |
| 562–657 px | 216 × 216 px | 80 × 80 px |
| At least 658 px | 240 × 240 px | 80 × 80 px |

Every slot has an 8 px inset, centered `object-fit: contain` images and zero grid/image minima.
Portraits keep their source aspect ratio. Narrow card wrappers and marker lanes must make room
for the slot; fix wrapping or outer spacing instead of overriding individual badge sizes.
Locked, active, inactive and expanded cards use the same geometry. Active emphasis must not
scale artwork, hide copy, change padding or create height jumps.

The static presentation resolver rejects unknown/prototype-like codes. It never tries a
speculative public filename. Existing versioned non-role mappings remain explicit; superseded
source files remain available for source review without returning to the active resolver.

## Browser review

Open `/dev/ui-system/achievements` from `/dev/ui-system`. It uses production components and
explicit server-shaped visual fixtures; the fixture is not role-catalog or threshold authority.
The Phase-151 Playwright collector records all sources and composed badge cases, responsive
geometry, carousel interaction/performance and blank manual signoff rows. Review the actual
screenshots before filling subjective verdicts. Exact commands, matrix and gaps are in
`.planning/phases/151-erfolgsbadge-karussell-konsolidierung/`.

Karaoke FX ships six 1254 × 1254 RGBA sources: Entry, motif and the four rank frames.
The motif and frames compose through the same layered strategy as the other layered roles.
Generation and the explicitly authorized alpha extraction for three new drafts are documented
in `151-ARTWORK-GENERATION.md`; all 107 earlier source files remain byte-identical.

## Container-aware image candidates

Lazy artwork uses native `sizes="auto, ..."` with the existing bounded viewport hint as fallback. The browser measures the actual image box inside the shared slot (for example176px within a192px hero, or48px within a64px marker), so narrow embedded cards do not advertise a wide desktop size. Priority/eager images keep the conservative fallback because auto sizes is only valid for lazy images. This follows the [HTML image sizing standard](https://html.spec.whatwg.org/dev/images.html); no ResizeObserver, per-badge fetch or second image component is introduced.

The existing Next candidate ladder is unchanged. At DPR2 the176px hero requires352 source pixels and still selects512w because the project has no384w candidate; this is the smallest adequate shipped candidate, not an auto-sizing failure. The48px marker selects96w instead of the former160w. Source PNGs remain untouched. Older browsers may use the conservative fallback hint.
