# Phase 99: Öffentliches Fansub-Member-Profil (Redesign) - Context

**Gathered:** 2026-07-07
**Status:** Ready for planning
**Source:** PRD Express Path (user-provided GSD-Auftrag; reference prototype `public_profile_prototype.html`)

<domain>
## Phase Boundary

This phase redesigns the public Fansub member profile, reachable for logged-in and anonymous visitors, from a four-tab profile into one scrollable public page. The page must show real existing data in descending relevance: Hero, Gruppenzugehörigkeit, aktuelle Projekte, Auszeichnungen, letzte Beiträge, Fansub-Geschichte, and collapsed frühere Mitwirkungen.

The phase is display-only. It must not add a contribution authoring flow, badge gamification beyond the requested presentation, new design tokens, or parallel media/contribution tables. Backend/API changes are allowed only where the existing public profile contract cannot already project the required existing data.

</domain>

<decisions>
## Implementation Decisions

### D-01 Page structure is locked
- Replace the public profile tab navigation (`Identität`, `Badges`, `Geschichte`, `Mitwirkende`) with a single scrollable page.
- Section order is locked: Hero -> Gruppenzugehörigkeit -> Aktuelle Projekte -> Auszeichnungen -> Letzte Beiträge -> Fansub-Geschichte -> Frühere Mitwirkungen.

### D-02 Hero content is retained and rearranged
- Avatar, name, verified status, and Schwerpunkt fields remain semantically unchanged.
- The verified status pill is rendered inline next to the name.
- The visual direction follows the approved prototype: navy gradient header, no separate status block.

### D-03 Group membership cards are public navigation
- Each current group membership renders as a clickable card with group logo/short code, group name, member role in the group, and member-since date if present.
- Cards link to the public group page.
- Multiple group memberships render as multiple cards if the data model supports them.

### D-04 Current projects replace the old role timeline
- The old skill/card-based Rollen-Timeline is removed from the public profile.
- Current projects render one card per Anime/project where the member is actively involved.
- Each card includes cover, project title, release version, and all roles the member has in that project.
- Cards link to the public Anime/project detail page.
- Data source must be the existing member -> role -> release-version mapping already used by the former Mitwirkende view; no new persistence structure is introduced.

### D-05 Current/previous project status must be evidence-based
- Planning and implementation must determine from the existing schema how "active" differs from "completed": release-version status, contribution date range, both, or another existing field.
- Do not hard-code active/completed status from UI assumptions.

### D-06 Badges are horizontally scrollable
- Badges render as a horizontal chain instead of a grid.
- Earned badges render normally; unearned badges render locked/disabled with a lock icon.
- The section shows progress as `x von y`.

### D-07 Badge tiers are conditional
- Render a small tier marker only if the existing badge system has a real tier/level field.
- If no tier/level field exists, omit the marker instead of inventing a placeholder.

### D-08 Last contributions are a new public section
- The public profile shows exactly the three most recent contribution items across notes/text contributions and media/assets uploads.
- The section is a pure sliding window derived at request time from sort order and `LIMIT 3`; no persisted "latest three" status is added.

### D-09 Last contributions are public and published only
- Last contributions include only items with Sichtbarkeit = "öffentlich" and Status = "veröffentlicht".
- Values and field names must be mapped from the existing tables/contracts; do not assume both sources use identical enum names without checking.

### D-10 Empty contributions are excluded
- Public contribution items with visibility/status set but no usable text and no image/media content are excluded.

### D-11 Contribution card layouts are type-specific
- Text contributions use a compact card with a left icon field and right text, clamped to two lines.
- Image contributions use a wide card with a 16:9 preview across full card width using `object-fit: cover`, then description below.
- Do not use square thumbnails for screenshots.

### D-12 Image crop intelligence is deferred
- Do not add configurable `object-position` or smart cropping for non-16:9 images in this phase.
- Revisit only after checking real example uploads if the centered crop produces unusable previews.

### D-13 Fansub story uses real truncation detection
- Fansub-Geschichte renders only when non-empty.
- Long text is clamped to about three lines with a lower fade-out and a `Mehr lesen` / `Weniger anzeigen` toggle.
- The toggle appears only when scroll height exceeds visible height.
- Short text has no toggle; empty text renders no section.

### D-14 Previous contributions are collapsed by default
- Frühere Mitwirkungen render behind a button `Frühere Mitwirkungen anzeigen (n)`.
- Entries are loaded or revealed only after user action.
- The section requires a real period/date field so entries do not repeat the prior `ohne Jahr` problem.

### D-15 No placeholder production data
- Productive code must not ship example, hard-coded, or placeholder content for projects, contributions, badges, group memberships, or profile text.
- Every displayed item comes from the existing database/API projections.

### D-16 Existing design system only
- Use existing Team4s CSS classes, variables, and components.
- Do not introduce new design tokens, colors, UI frameworks, or large unrelated redesigns.
- German user-facing text must use correct umlauts.

### D-17 Existing media/domain ownership remains canonical
- Do not invent parallel media logic.
- Release-version-scoped process media remains `release_version_media` + `media_assets` + `media_files`.
- Public/release-level `release_media` must not be used as a substitute for version-scoped admin/fansub media.
- Group media remains under existing group media structures.

### D-18 Public profile is display-only
- This phase does not add or change contribution writing, approval, notes, media editing, or admin/member management views.
- Existing notes/contributions and media edit flows remain the authoring surfaces.

### D-19 No full contribution archive
- The public profile has no `Alle Beiträge anzeigen` link and no complete archive in this phase.
- Only the latest three public/published items are displayed.

### D-20 Responsive verification is mandatory
- The redesigned page must be tested on at least one mobile viewport <= 390px and one desktop viewport.
- Verification must check for clipped, overlapping, or horizontally broken UI.

### A-01 Data source for current projects
- Before implementation, identify the exact DB/API source for member -> role -> release-version and how active/completed status is represented.

### A-02 Unified contribution query fields
- Before implementation, identify the notes/text and media/assets tables/projections, their visibility fields, status fields, timestamp fields, and enum value mapping for public/published filtering.

### A-03 Badge tier support
- Before implementation, confirm whether badges are binary or tiered.

### A-04 Period field for previous contributions
- Before implementation, identify the real date/period field for historical/previous contributions and decide whether the collapsed section can ship with real entries in this phase.

### A-05 Multiple group memberships
- Before implementation, confirm whether current data permits zero, one, or multiple group memberships per public member.

### the agent's Discretion
- Exact component split, endpoint naming, query implementation details, loading skeleton style, and whether current/previous projects share one query internally are implementation discretion after A-01/A-02/A-04 are researched.
- If an existing endpoint already provides all required fields safely, prefer adapting frontend projections over adding backend endpoints.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project workflow and contracts
- `AGENTS.md` - current workflow, domain rules, UI rules, validation expectations.
- `docs/engineering/implementation-contract.md` - reuse-first implementation workflow and duplicate-prevention rules.
- `docs/api/api-contracts.md` - API/OpenAPI contract update rules.

### Fansub and media domain
- `docs/architecture/db-schema-fansub-domain.md` - canonical fansub release/media ownership schema.
- `shared/contracts/openapi.yaml` - canonical cross-surface OpenAPI contract.
- `shared/contracts/admin-content.yaml` - focused admin-content contract where relevant.

### Auth and public/protected UI boundaries
- `docs/frontend/auth-api-client.md` - browser auth/API boundary; protected actions must use central API refresh seam.

### UI system and local UX rules
- `docs/frontend/ui-system.md` - semantic controls and project UI system.
- `docs/agent-guidelines-ui.md` - local UI implementation guidance.
- `public_profile_prototype.html` - approved visual/interaction reference if present in the repo or provided artifact set.

### Prior related phases
- `.planning/phases/74-public-member-profile-members-slug-memorial/74-CONTEXT.md` if present - prior public member profile context.
- `.planning/phases/82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri/82-CONTEXT.md` if present - projectwide contributor assignment model.
- `.planning/phases/97-revoke-rollen-lifecycle-uebergang/97-CONTEXT.md` if present - role lifecycle and date semantics.
</canonical_refs>

<specifics>
## Specific Ideas

- Reference route examples from the assignment include `/anime/members/:id`; existing implementation may use `/members/[slug]`. Planning must inspect the actual route before changing links.
- The old "Mitwirkende" view currently renders a role timeline by skill such as Administration, Encoding, Timing and shows repeated "ohne Jahr"; this is the target behavior to remove.
- Image cards in `Letzte Beiträge` should preserve wide screenshot readability with 16:9 previews.
- Empty visitor-facing containers such as `Noch keine Geschichte hinterlegt` should not render on the public page.
</specifics>

<deferred>
## Deferred Ideas

- Smart crop or user-configurable `object-position` for image contributions.
- Full contribution archive or `Alle Beiträge anzeigen` navigation.
- New contribution writing/release approval/media editing flows.
- Badge points, levels, rarity percentages, or broader gamification beyond conditional tier marker and progress indicator.
- Any new persistence model for contribution/profile/media data unless a researched gap makes a documented follow-up necessary.
</deferred>

---

*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Context gathered: 2026-07-07 via PRD Express Path*
