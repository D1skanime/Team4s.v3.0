# DECISIONS

## 2026-03-14 - Correct Package 2 to Canonical Phase A

### Decision
Correct Package 2 back to the canonical Phase A metadata scope from `docs/architecture/db-schema-v2.md`.

### Context
The existing Package 2 plan and migrations had drifted into studios/persons/contributor entities that do not belong to Phase A.

### Options Considered
- Continue with the drifted scope
- Stop and correct Package 2 before further implementation

### Why This Won
The schema draft is the architectural source of truth for the migration lane. Continuing on the wrong entity set would only create invalid follow-up work.

### Consequences
- `0019` now covers `genres`
- `0020` keeps lookup tables
- `0021` keeps `anime_titles` and `anime_relations`
- `0022` now covers `anime_genres`
- contributor/studio/person structures are out of this phase

### Follow-ups Required
- Execute corrected migrations locally
- Inspect the resulting tables in the DB
- Recover the old relation source before designing relation backfill

---

## 2026-03-15 - Bidirectional Relation Storage

### Decision
Store anime relations bidirectionally during migration (both A->B and B->A).

### Context
Legacy `verwandt` table stored only one direction per relation. Modern graph queries benefit from bidirectional access without UNION complexity.

### Options Considered
1. Store one direction, query with UNION (SELECT ... UNION SELECT ...)
2. Store both directions, query single table (SELECT with simple WHERE)
3. Use recursive CTE for bidirectional traversal

### Why This Won
- Simplifies repository query logic (no UNION needed)
- Better query performance (single table scan with index)
- Aligns with modern graph database patterns
- Makes relation semantics explicit in both directions

### Consequences
- Migration creates 2x records (2,278 -> 4,556)
- Slightly higher storage cost (negligible for this dataset)
- Repository code is simpler and more maintainable
- Future relation queries are faster and more readable

### Follow-ups Required
- Document relation query patterns for future developers
- Consider adding relation traversal depth limiting
- Add relation count verification to backfill script

---

## 2026-03-15 - Legacy Relation Source Discovery

### Decision
Import anime relations from legacy `verwandt` table instead of external API.

### Context
Investigation on 2026-03-14 concluded no legacy relation source existed. Further inspection revealed `verwandt` table with 2,278 records was overlooked due to non-standard naming.

### Options Considered
1. Continue with external API integration plan (AniSearch, AniDB, MAL)
2. Import legacy `verwandt` data and defer API enrichment
3. Hybrid approach (legacy baseline + API enrichment)

### Why This Won
- Legacy data already exists in the database (zero external dependency)
- 2,278 relations provide solid baseline for feature launch
- External API integration can be deferred to enrichment phase
- Faster time-to-market (no API evaluation delay)

### Consequences
- `anime_relations` table is now populated with production-ready data
- External API evaluation is no longer blocking for baseline feature
- Future enrichment can supplement (not replace) legacy data
- Relation quality depends on legacy source accuracy

### Follow-ups Required
- Verify relation quality with manual spot checks
- Document relation data lineage (legacy `verwandt` source)
- Plan optional API enrichment for future phase

---

## 2026-03-15 - Glassmorphism Design Pattern for AnimeDetail

### Decision
Implement glassmorphism design pattern for AnimeDetail page with blurred background, semi-transparent panels, and backdrop-filter effects.

### Context
Modern streaming platforms (AniList, Netflix, Plex) use glassmorphism for visual hierarchy and depth. The original design was flat with single-column layout. User expectations align with modern streaming UX patterns.

### Options Considered
1. Keep flat design with simple cards
2. Implement glassmorphism with backdrop-filter
3. Use gradient overlays without blur (fallback-only)

### Why This Won
- Aligns with user expectations from modern streaming platforms
- Improves visual hierarchy and content separation
- Creates depth and professional appearance
- Feature detection with `@supports` ensures graceful degradation

### Consequences
- Requires backdrop-filter support (falls back to solid background)
- Slightly higher CSS complexity (feature detection needed)
- Better visual appeal and modern UX
- Responsive design requires three breakpoints (mobile, tablet, desktop)

### Follow-ups Required
- Monitor browser support for backdrop-filter
- Ensure fallback design is acceptable for older browsers
- Consider performance impact on lower-end devices

---

## 2026-03-15 - Genre Chips Prepared for Backend Array Field

### Decision
Implement genre chips UI with type-unsafe cast to `genres: string[]`, acknowledging backend contract mismatch.

### Context
Backend currently provides `genre: string` (CSV format). Frontend wants to display genre chips with navigation links. Proper implementation requires backend to provide `genres: string[]` array.

### Options Considered
1. Wait for backend contract update before implementing UI
2. Implement UI now with type-unsafe cast (ready for backend change)
3. Parse CSV string in frontend (temporary workaround)

### Why This Won
- Frontend ready for when backend provides proper array field
- Critical Review acknowledged and approved with condition
- No runtime errors (just returns empty array until backend updated)
- Demonstrates proper UI pattern for future backend work

### Consequences
- Genre chips won't display until backend contract updated
- Type safety bypassed with `as unknown as` cast
- Creates clear backlog item for backend team
- Frontend code ready and tested

### Follow-ups Required
- Update backend AnimeDetail contract to include `genres: string[]`
- Update API handler to split CSV into array
- Update frontend type definitions to remove unsafe cast
- Verify genre chips display correctly after backend update

---

## 2026-03-15 - Reduced Motion Support for Accessibility

### Decision
Add `@media (prefers-reduced-motion: reduce)` to disable animations for users with motion sensitivity.

### Context
WCAG 2.1 guideline 2.3.3 recommends respecting user preferences for reduced motion. Glassmorphism design includes subtle transitions and animations.

### Options Considered
1. No motion support (ignore accessibility guideline)
2. Add reduced motion support (disable animations)
3. Make animations opt-in only

### Why This Won
- WCAG 2.1 compliance improves accessibility
- Zero cost for users who don't need reduced motion
- Modern browsers support prefers-reduced-motion
- Demonstrates accessibility best practices

### Consequences
- Animations disabled for users who prefer reduced motion
- Slightly more CSS complexity (media query variations)
- Better accessibility for motion-sensitive users
- Aligns with modern web standards

### Follow-ups Required
- Document reduced motion support in accessibility guide
- Test with browser DevTools (emulate prefers-reduced-motion)
- Consider adding to other animated components

---

## 2026-03-15 - UX Freeze for Anime Detail Related Section

### Decision
Freeze the `Related` area on `/anime/[id]` as a post-hero, horizontally scrollable related-anime rail with stateful arrow visibility, whole-card click priority, and deterministic mobile/desktop behavior.

### Context
The current redesign places `Related` inside the hero info card and uses always-visible scroll buttons with full-card links. The open UX questions were when arrows should be visible, how rail scrolling/navigation should behave, how card clickability should be prioritized, and how `Related` should sit directly under the hero.

### Options Considered
1. Keep `Related` embedded inside the hero info card
2. Move `Related` into its own first content block directly below the hero
3. Replace the rail with a static wrapped grid

### Why This Won
- Separates hero summary from browseable cross-navigation content
- Makes relation discovery feel like a deliberate next step after hero comprehension
- Reduces interaction conflicts between hero CTAs and related navigation controls
- Preserves compact browsing on mobile without turning the section into a tall grid

### Consequences
- UX ownership is now frozen for arrow visibility, rail behavior, card priority, and placement
- Frontend should treat arrow controls as progressive enhancement on top of native horizontal scroll
- `Related` should not compete with hero CTAs inside the same card region
- Any implementation that keeps `Related` inside the hero should be considered temporary and not UX-final

### Follow-ups Required
- Frontend lane should relocate `Related` to the first content block immediately below the hero
- Frontend lane should align arrow visibility and scroll-step behavior to the frozen UX rules
- Frontend lane should keep the whole card as the primary interactive target and avoid nested competing links/buttons
- Critical review should verify the resulting layout and keyboard behavior against the UX handoff

---

## 2026-03-14 - Fix Legacy Title Mapping

### Decision
Use explicit title mappings for legacy anime columns:
- `anime.title` -> `ja/main`
- `anime.title_de` -> `de/main`
- `anime.title_en` -> `en/official`

### Context
The old DB stores the Japanese AniSearch title in `anime.title`, while German titles are important for actual user search behavior.

### Options Considered
- Delay title mapping until later crawler enrichment
- Treat all old titles as generic aliases
- Define a pragmatic search-friendly mapping now

### Why This Won
It preserves source meaning, supports likely search behavior, and makes the backfill deterministic now.

### Consequences
- The backfill service can populate `anime_titles` directly
- German titles stay language-primary for future search work
- English titles are preserved without being treated as the main user-facing title

### Follow-ups Required
- Run the backfill locally
- Inspect representative anime rows after the backfill
- Revisit richer title typing later if AniSearch/AniDB enrichment adds better metadata
