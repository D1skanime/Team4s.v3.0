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

## 2026-03-18 - Genre Array Contract Implementation

### Decision
Implement dual-field strategy for genre data: keep legacy `genre` string field and add new `genres: string[]` array field to maintain backward compatibility while enabling type-safe frontend handling.

### Context
Backend originally provided genre data as CSV string (`genre: "Action, Adventure, Fantasy"`). Frontend wanted to display genre chips with proper type safety and navigation. Previous implementation used unsafe type casts to work around the mismatch.

### Options Considered
1. Replace `genre` string with `genres` array (breaking change)
2. Add `genres` array alongside `genre` string (backward compatible)
3. Keep CSV string and parse in frontend (type-unsafe workaround)

### Why This Won
- Maintains backward compatibility for existing API consumers
- Enables type-safe frontend handling without workarounds
- Backend parsing is cleaner than frontend CSV splitting
- Single source of truth for array generation (repository layer)
- Aligns with OpenAPI contract evolution patterns

### Consequences
- Backend model includes both `Genre string` and `Genres []string` fields
- Minimal performance overhead (CSV split during serialization)
- OpenAPI contract now documents array field explicitly
- Frontend can remove all type-unsafe casts
- Future consumers can migrate gradually from string to array

### Follow-ups Required
- Monitor API usage to see when legacy `genre` string can be deprecated
- Consider similar pattern for other CSV-encoded fields
- Document this pattern as reference for future contract migrations

---

## 2026-03-18 - Related Section Placement Correction

### Decision
Correct Related section placement to **inside infoCard**, reversing previous decision that placed it as standalone post-hero block.

### Context
Previous UX documentation (2026-03-15) described Related section as standalone block below hero. Implementation revealed this created visual disconnection and overflow issues. Actual best placement is inside hero infoCard with proper overflow handling.

### Options Considered
1. Keep Related as standalone post-hero block (per old docs)
2. Move Related inside infoCard with overflow handling
3. Remove Related section entirely and reconsider design

### Why This Won
- Creates better visual hierarchy within hero card
- Overflow handling prevents cards from breaking layout boundaries
- Edge navigation buttons can remain at heroContainer level
- Maintains compact mobile experience
- Better aligns with glassmorphism design pattern

### Consequences
- Previous UX handoff documentation is now incorrect
- Implementation differs from documented design decision
- Requires documentation cleanup to prevent future confusion
- Demonstrates importance of validating UX decisions during implementation

### Follow-ups Required
- Archive or correct `docs/ux-related-section-handoff-2026-03-15.md`
- Update any references to Related section placement in other docs
- Document actual component hierarchy with visual diagram
- Review other UX decisions for similar implementation mismatches

---

## 2026-03-22 - Generic Upload Endpoint Architecture

### Decision
Implement a single `/api/v1/admin/upload` endpoint that handles all media types (images and videos) for all entities (anime, episode, fansub, release, user, member) instead of creating specialized endpoints per entity or asset type.

### Context
The Media Upload Service spec required a unified upload mechanism to replace ad-hoc cover upload logic. Options were either specialized endpoints per entity type or a generic endpoint with request parameters for entity/asset types.

### Options Considered
1. Specialized endpoints per entity (e.g., `/api/v1/admin/anime/:id/cover`, `/api/v1/admin/episode/:id/thumbnail`)
2. Generic upload endpoint with entity_type and asset_type parameters
3. Hybrid approach (generic for common types, specialized for complex cases)

### Why This Won
- Eliminates code duplication across handlers (DRY principle)
- Simplifies frontend integration (single mutation hook for all uploads)
- Easier to maintain validation, processing, and storage logic in one place
- Aligns with GSD spec requirement for "ein zentraler Endpoint"
- Reduces API surface area (fewer routes to document and test)

### Consequences
- Entity type and asset type must be validated via whitelists (security requirement)
- Path construction requires careful traversal protection (`filepath.Clean()` + prefix check)
- Join table routing adds complexity to handler logic (switch on entity_type)
- Request model includes more parameters than specialized endpoints would need

### Follow-ups Required
- Monitor performance as upload volume increases
- Consider splitting if validation/processing logic diverges significantly per media type
- Document entity_type and asset_type whitelists in API contract

---

## 2026-03-22 - Go-Native Image Processing vs. Libvips

### Decision
Use pure Go `github.com/disintegration/imaging` library for image processing instead of libvips bindings (`github.com/h2non/bimg`).

### Context
Image processing for uploads requires WebP conversion and thumbnail generation. Libvips is faster but requires C dependencies. Pure Go is slower but simpler to deploy.

### Options Considered
1. Pure Go `imaging` library (no C dependencies)
2. Libvips bindings via `bimg` (faster, C dependencies)
3. Image manipulation service (out of scope - YAGNI)

### Why This Won
- **Simplicity:** No C dependencies means simpler Docker image (no libvips installation)
- **Portability:** Pure Go compiles to static binary (easier cross-platform development)
- **Performance sufficient:** 2000+ covers process in seconds with pure Go
- **Maintainability:** Easier to debug and maintain without cgo complexity
- **Docker image size:** Alpine Go image stays small without libvips libraries

### Consequences
- Slightly slower processing than libvips (acceptable tradeoff for current scale)
- Limited to common image formats (JPEG, PNG, WebP, GIF - sufficient for spec)
- May need to revisit if upload volume increases 100x

### Follow-ups Required
- Benchmark actual processing times for 50MB images
- Monitor performance as dataset grows beyond 10k covers
- Document performance characteristics in spec

---

## 2026-03-22 - FFmpeg CLI for Video Processing

### Decision
Execute FFmpeg via `os/exec` CLI calls for video thumbnail extraction instead of using Go bindings.

### Context
Video uploads require thumbnail extraction at 5-second mark. FFmpeg is the industry standard, but Go bindings exist via cgo. CLI approach is simpler.

### Options Considered
1. FFmpeg CLI via `os/exec` (subprocess overhead, simple integration)
2. FFmpeg Go bindings via cgo (faster, complex integration)
3. Pure Go video decoding (limited format support, YAGNI)

### Why This Won
- FFmpeg CLI is stable, well-documented, and battle-tested
- No cgo complexity (keeps build process simple)
- Startup check ensures FFmpeg availability (warns if missing)
- Black placeholder fallback for failed extractions (graceful degradation)
- Subprocess overhead negligible for async processing

### Consequences
- Requires FFmpeg in Docker image (added to Dockerfile)
- Subprocess overhead (minimal, acceptable for video processing time)
- Depends on external binary availability (mitigated by startup check)
- Must handle FFmpeg output parsing for error detection

### Follow-ups Required
- Add timeout for FFmpeg subprocess (prevent hang on corrupt video)
- Test with various video codecs (H.264, VP9, etc.)
- Document FFmpeg version requirements

---

## 2026-03-22 - Transaction Boundary for Media Upload

### Decision
Wrap all database writes (MediaAsset + MediaFile + join table) in a single transaction boundary with rollback on failure.

### Context
Critical Review blocker C2 identified data integrity risk: if any DB write fails, previous inserts succeed, leaving orphaned records. Upload process involves 4+ separate DB writes.

### Options Considered
1. No transaction (original implementation - data integrity risk)
2. Single transaction for all writes (atomic operation)
3. Nested transactions per entity type (complex, unnecessary)

### Why This Won
- Ensures all-or-nothing semantics (data integrity)
- Prevents orphaned records in `media_assets` and `media_files` tables
- Aligns with ACID principles for multi-table operations
- Critical Review blocker (C2) - required for merge approval

### Consequences
- Requires transaction handling in repository layer (added `tx *sql.Tx` parameter)
- Rollback logic needed for filesystem cleanup (if DB commit fails, delete uploaded files)
- Slightly more complex error handling (must distinguish DB errors from processing errors)

### Follow-ups Required
- Add unit tests for transaction rollback scenarios
- Document rollback behavior in API contract
- Consider adding distributed transaction support if external services added later

---

## 2026-03-22 - Path Traversal Protection

### Decision
Validate constructed storage paths using `filepath.Clean()` and prefix check to prevent directory traversal attacks.

### Context
Critical Review blocker C4 identified security vulnerability: malicious `entity_type` or `entity_id` values (e.g., `../../etc`) could escape the media directory structure.

### Options Considered
1. No validation (original implementation - security vulnerability)
2. Whitelist validation for entity_type + filepath.Clean + prefix check (defense in depth)
3. Regex validation only (insufficient - bypassed by URL encoding)

### Why This Won
- Defense in depth: whitelist + path cleaning + prefix validation
- Prevents directory traversal attacks (OWASP Top 10 mitigation)
- `filepath.Clean()` normalizes paths and removes `..` segments
- Prefix check ensures resolved path stays within `MEDIA_BASE_PATH`
- Critical Review blocker (C4) - required for merge approval

### Consequences
- Additional validation overhead (negligible, ~1ms per request)
- Clearer error messages for invalid paths (security + UX improvement)
- Must maintain whitelist for entity_type and asset_type values

### Follow-ups Required
- Add security tests for path traversal attempts
- Document security validations in API contract
- Review other handlers for similar vulnerabilities

---

## 2026-03-22 - Backward-Compatible Cover URL Resolution

### Decision
Frontend `getCoverUrl()` function supports both legacy `/covers/` paths and new `/media/` paths during migration window.

### Context
Migrating 2231 anime covers from `/covers/` to `/media/anime/{id}/poster/{uuid}/` requires gradual rollout without breaking existing data or deployments.

### Options Considered
1. Hard cutover (update all DB records, deploy, remove legacy path - risky)
2. Backward-compatible dual-path support (safer, gradual rollout)
3. Redirect legacy paths to new paths (requires nginx config changes)

### Why This Won
- Allows gradual migration without breaking existing data
- Old covers remain accessible during migration window
- Simplifies rollback if migration fails (just revert DB updates)
- No nginx configuration changes required
- Can verify new paths work before removing legacy support

### Consequences
- Temporary dual-path logic in frontend (technical debt)
- Cleanup needed after migration verification (remove legacy path handling)
- Slightly more complex URL resolution logic (acceptable tradeoff)

### Follow-ups Required
- Set migration verification deadline (1 week after migration)
- Document removal plan for legacy path support
- Add metrics to track legacy path usage (know when safe to remove)

---

## 2026-03-22 - Schema Deviation: Inline Entity Fields vs. MediaType FK

### Decision
Use inline `entity_type`, `entity_id`, and `asset_type` fields in `media_assets` table instead of `media_type_id` FK to `MediaType` reference table as specified in `db-schema-v2.md`.

### Context
Critical Review blocker C7 identified schema mismatch between implementation and `db-schema-v2.md`. The spec expected `media_type_id` FK, but implementation used inline fields for simplicity.

### Options Considered
1. Follow spec exactly (add `MediaType` table, use FK)
2. Use inline fields and document deviation (pragmatic)
3. Hybrid approach (inline for entity, FK for asset type)

### Why This Won
- **Simpler queries:** No JOIN needed to determine entity/asset type
- **Easier validation:** Whitelist check on inline fields vs. FK lookup
- **Clearer intent:** Inline fields make relationship explicit in code
- **Sufficient normalization:** entity_type values are low-cardinality (6 values)
- **Migration complexity:** Changing schema now would require re-running migration

### Consequences
- Schema drift from `db-schema-v2.md` (must be documented)
- May cause confusion in future phases if spec is assumed source of truth
- Slightly less normalized (acceptable tradeoff for query simplicity)

### Follow-ups Required
- Update `db-schema-v2.md` to reflect actual implementation
- Add migration note explaining deviation rationale
- Review other schema sections for similar mismatches

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
