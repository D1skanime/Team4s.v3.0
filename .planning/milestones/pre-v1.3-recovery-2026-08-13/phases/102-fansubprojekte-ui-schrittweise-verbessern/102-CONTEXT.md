# Phase 102: Fansubprojekte UI schrittweise verbessern - Context

**Gathered:** 2026-07-13
**Status:** Ready for step-by-step discussion
**Source:** User request after Phase 101 milestone UI work.

<domain>
## Phase Boundary

This phase improves the public Fansub project presentation in small, testable UI slices. User-facing German copy should consistently use `Fansub-Projekt` instead of the generic `Projekt` when this page means a Fansub group's specific project for an Anime.

Primary route:
- `/anime/[id]/group/[groupId]` - public Fansub project detail page reached from the public Fansub group profile.

Entry route for navigation checks only:
- `/fansubs/[slug]` - public Fansub group profile where users jump into a Fansub project.

The phase is UI-focused. It must not introduce a new project data model, new media ownership logic, new upload flow, or new public API unless a later step proves that the current contract cannot represent the desired display.
</domain>

<decisions>
## Locked Product Decisions

### D-01 Work step by step
- Discuss one UI area.
- Implement only that area.
- Test it on `http://127.0.0.1:3000`.
- Continue only after user acceptance.

### D-02 The Fansub project detail page is the primary surface
- The phase starts on `/anime/[id]/group/[groupId]`.
- `/fansubs/[slug]` is only the navigation entry point unless a later defect blocks that jump.
- The first implementation slice is the project detail hero, not the project cards on the Fansub profile.

### D-03 Fansub project detail hero should visually relate to the Fansub profile hero
- `/anime/[id]/group/[groupId]` should feel like part of the same public site language as `/fansubs/[slug]`.
- It may still expose Anime-specific information and project-specific stats.

### D-04 Desktop, tablet, and mobile are separate design checks
- Desktop can use wider/larger media.
- Tablet portrait must not inherit a desktop layout that becomes cramped.
- Mobile must prioritize readable cards and touch-friendly controls.

### D-05 Sections are improved individually
- Do not redesign `Geschichte`, `Beteiligte`, `Releases`, `OP/ED/Middle`, and `Medien` all at once.
- Each section gets its own discussion, implementation, and UAT pass.

### D-06 Public wording can be corrected in UI copy
- Public labels may clarify the Fansub context, such as `Fansub-Projekte` or `Fansub-Releases`.
- This does not imply backend field renames.

### D-07 Reuse first
- Existing files and components are the implementation anchors.
- Avoid parallel components unless the existing seam is truly too narrow.

### D-08 Public project URLs should be Fansub-owned, not technical ID URLs
- The primary public URL for a Fansub project should be `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`.
- Example: `/fansubs/c-subs/fansubprojekt/vipers-creed`.
- The current technical route `/anime/[id]/group/[groupId]` may stay as compatibility/internal route, but should not be the user-facing target from public surfaces.

### D-09 "Weitere Projekte" must mean more projects of the current Fansub group
- The current edge navigation uses other Fansub groups for the same Anime. With the label `Weitere Projekte von [group]`, this is misleading.
- If the user is on C-Subs / Viper's Creed, "Weiter" must lead to another C-Subs Fansub project, not to Honto's Viper's Creed cooperation page.
- Cross-group/cooperation variants of the same Anime may be shown as collaboration context, but they are not "weitere Projekte von C-Subs".
- If there is no next/previous project for the current Fansub group, this navigation should be hidden or replaced with a link back to the Fansub's project overview.

### D-10 Fansub project navigation controls belong to the glass hero card
- The current previous/next buttons are positioned at the far left and far right of the whole hero shell.
- They should visually belong to the glass project hero card that contains the Anime banner and project name.
- On desktop/tablet, place previous/next controls directly at the left and right edges of that glass card, not at the browser/page edges.
- The button UI should be redesigned to feel like part of the hero card, not generic floating page-edge buttons.
- Mobile placement can collapse below or inside the card, but must stay close to the project hero.

### D-11 The project text is one Fansub project outlook/story block
- The current "Anime-Ausblicke" wording is wrong for the public project page.
- The section should mirror the public Fansub story presentation style, but for exactly one project text block.
- It should support the same kind of collapsed/expanded reading behavior (`alles anzeigen` / `weniger anzeigen`) when the text is long.
- It must not use the multi-story archive/modal pattern from the Fansub profile, because a Fansub project has only one outlook/story text.
- The final public title for this section is locked: `Geschichte des Fansub-Projekts`.
- User-facing copy should call the page/entity `Fansub-Projekt`, not just `Projekt`.

### D-12 Fansub project members should mirror the public Fansub member presentation
- After the project text, show the members involved in this specific Fansub project in the same visual language as the public Fansub page's member section.
- The member display should represent project involvement, not generic group membership.
- Member links are not locked yet: the intended future target is not necessarily the normal member profile, but likely a project/member contribution view showing that member's texts and images.
- Do not force those member links in this phase until the target page is defined.

### D-13 Release versions remain a separate discussion block
- The release-version presentation comes after project text and project members.
- Its structure should be discussed separately; do not redesign it as part of the story/member slice.

### D-14 Remove the project detail tab/jump list
- The current section navigation list (`Geschichte`, `Beteiligte`, `Releases`, `OP/ED/Middle`, `Medien`) is not needed on the Fansub project page.
- The page should follow the public Fansub page's flowing section structure instead of a separate tab/jump-list surface.
- Remove this list during implementation unless a later concrete usability problem requires a different navigation pattern.

### D-15 Remove the standalone newest release block
- The separate `Neuestes Release` / newest-release highlight block is not needed in the new Fansub project page structure.
- Release versions should still be discussed later as their own normal content section.
- Do not keep a special embedded latest-release preview above or inside the release-version discussion unless a later decision explicitly reintroduces it.

### D-16 Release section title is "Releases zum Fansub"
- The current `Weitere Releases` wording is wrong because the `Neuestes Release` highlight is removed.
- This section represents all releases for the current Fansub project.
- Public section title is locked: `Releases zum Fansub`.

### D-17 Remove the global empty-area summary
- The project page should not show a global message like `Weitere Bereiche sind noch nicht öffentlich befüllt: ...`.
- Missing sections should simply be absent in the new flowing public page structure.
- If a future section needs its own empty state, decide it locally for that section, not as a global bottom summary.

### D-18 Public release labels must never expose Jellyfin/file/import names
- Public release cards/lists may use a release title only when a curated release name was explicitly entered.
- Raw imported names such as `Vipers Creed. S01E02-CSubs.mkv` are technical/physical source names and must not be shown publicly.
- If no curated release name exists, the public UI must use a neutral fallback label instead of the imported file name.
- The neutral public fallback label is built from episode title, Fansub group name, and the real mapper/version field, e.g. `Kanonenschuss (Honto) Version 1` and `Kanonenschuss (Honto) Version 2` when Honto has multiple releases for the same episode.
- Admin UI may show the physical/import name to help with verification and mapping, but it must be read-only and visually separate from the editable public release name.
- The editable `Release-Name` field should normally be empty until an admin intentionally sets the public/curated release name.
- The admin edit screen also needs the episode title as a separate field/info row so admins can distinguish: episode title, curated release name, and physical/import release name.

### D-19 Fansub members get a reduced Basisdaten editor
- Fansub group members currently have release editor access to `Segmente`, `Media / Assets`, and `Notizen / Beiträge`.
- They should additionally get access to a reduced `Basisdaten` area.
- In this reduced member view, they may edit only:
  - `Release-Name`
  - `Version`
  - `Release-Datum`
  - `Untertitel-Typ`
  - `CRC32`
- Other full admin fields such as media provider, media item ID, resolution, stream URL, duration, physical/import release name, and technical scan controls must not be shown to normal Fansub members in this reduced view.
- The episode title should be visible for orientation, but read-only/disabled.
- Full admins keep the full Basisdaten/editor view.
- This must use the existing global rights/permission system. Do not hardcode role names, group IDs, or local ad-hoc permission checks in the UI or handler.

### D-20 Release version numbers are unique per episode and Fansub group
- The `Version` field must be constrained by episode and Fansub group.
- The same Fansub group cannot have the same version number twice for the same episode.
- Example: if episode 1 by group X already has `Version 1`, another release for episode 1 by group X cannot also be `Version 1`.
- On creation/import/mapping, the system should suggest or calculate the next available version number far enough to avoid duplicates.
- On save, the backend must validate this rule; UI-only validation is not enough.
- For cooperation releases, the uniqueness check applies to each participating Fansub group. A coop release with C-Subs and Honto blocks that version number for both groups on that episode.

### D-21 Pretty Fansub project route is additive, not a hard replacement
- The public-facing route for new links is `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`, e.g. `/fansubs/c-subs/fansubprojekt/vipers-creed`.
- The existing technical route `/anime/[id]/group/[groupId]` remains available as a compatibility/internal route.
- New public navigation should prefer the pretty route once it exists.
- The technical route should expose a canonical reference to the pretty route so the pretty URL is the public identity.

### D-22 Pretty route keys are Fansub slug plus Anime slug
- The pretty route must use the Fansub slug and Anime slug, not IDs in the visible URL.
- Slug history, old-slug redirects, and durable slug aliases are not part of this phase.
- If old slug support becomes necessary, capture it as its own routing/history phase instead of adding hidden history logic here.

### D-23 Further-project navigation is same-Fansub only
- `Weitere Projekte` means more projects by the current Fansub group.
- If the current page is C-Subs / Viper's Creed, next/previous project navigation may only point to other C-Subs projects.
- It must not point to Honto or another group for the same Anime under the label `Weitere Projekte`.
- If there are no further projects for the current Fansub group, hide that navigation.

### D-24 Cooperation context belongs in the hero, not in further-project navigation
- Cooperation or alternative group context for the same Anime may appear as a small hero text line.
- The label is `Coop mit [Gruppenname]`.
- With multiple other groups, render `Coop mit Gruppe X, Gruppe C, Gruppe D`.
- Each group name in that line is clickable and leads to the public Fansub group profile.
- On a cooperation page, list only the other participating groups; do not repeat the current group.

### D-25 Project members reuse the public Fansub member UI pattern
- The project member section should use the same visual language and reusable/global UI pattern as the public Fansub page's member presentation.
- Do not keep the current local project cards as the target UI.
- The section title is `Mitwirkende am Fansub-Projekt`.
- Do not copy profile-specific title/helper text from the public Fansub member profile; only the member list/presentation pattern is relevant.
- For each person, show only the roles they have in this specific Fansub project.

### D-26 Project members are clickable, but the final project-member target is deferred
- Member entries should be clickable.
- The intended future target is a project-scoped member contribution page showing that member's posts/media for this Fansub project.
- That target page is not part of Phase 102.
- Implementation must not invent a new project-member contribution route in this phase; it may use an existing safe member link or prepare the UI pattern without forcing the future route.

### D-27 Release section stays structurally conservative for now
- Release display details are not redesigned in this phase.
- For Phase 102, change the public section title to `Releases zum Fansub` and remove obsolete surrounding structure as already decided.
- Keep the existing release list/presentation as much as possible until a separate release-display phase discusses it properly.

### D-28 OP/ED/Middle and Medien leave the project page for now
- OP/ED/Middle and Medien should not remain standalone sections on the Fansub project page during this cleanup.
- They should later be integrated more deliberately into the release experience.
- That integration is a later discussion/phase, not part of the current project-page cleanup.

### Folded Todos
- `Kollaboration public handling neu loesen` is folded into this phase only as public cooperation/navigation context: same-Fansub project navigation must stay distinct from cooperation/other-group context, and cooperation is represented by the hero `Coop mit ...` line.
</decisions>

<canonical_refs>
## Canonical References

- `AGENTS.md` - Team4s UI, German text, reuse, and media ownership rules.
- `docs/engineering/implementation-contract.md` - reuse-first implementation contract.
- `docs/frontend/ui-system.md` - local UI primitives and control guidance.
- `docs/agent-guidelines-ui.md` - local UI implementation guidance.
- `frontend/src/components/fansubs/FansubProjectsSection.tsx` - public Fansub profile projects section.
- `frontend/src/components/fansubs/FansubProjectsGrid.tsx` - current project carousel behavior.
- `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` - current project banner card and image fallback rule.
- `frontend/src/components/fansubs/FansubProjectsSection.module.css` - project card/grid/carousel styling.
- `frontend/src/app/fansubs/[slug]/page.tsx` - public Fansub profile page composition.
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` - public Fansub project detail page composition.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - project detail hero.
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` - project detail layout and responsive CSS.
- `frontend/src/components/groups/GroupEdgeNavigation.tsx` - current edge navigation that still navigates across groups for the same Anime and labels it as further projects of the current group.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/TeamSection.tsx` - current local member cards to replace/align with public Fansub member UI.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.tsx` - current standalone newest-release block to remove.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx` - current `Weitere Releases` list/title to retitle and keep structurally conservative for now.
- `.planning/phases/99-ffentliches-fansub-member-profil-redesign/99-ADDON7-CONTEXT.md` - visual baseline for public Fansub page density, member rows, and token-based UI language.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/fansubs/*Team*` and the public Fansub profile sections provide the preferred member presentation style for project members.
- `frontend/src/components/ui` primitives should be used for interactive controls and repeated UI surfaces.
- `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` is the public Fansub profile entry point that should eventually link to the pretty project URL.

### Established Patterns
- Public Fansub profile work uses token-based, compact, section-flow UI rather than isolated heavy cards.
- Existing project page sections already degrade by omitting empty data; Phase 102 should remove the global empty summary and continue section-local omission.
- Public route work should prefer additive compatibility over breaking old routes.

### Integration Points
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` owns current server-side data composition and section ordering.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` is the place for pretty-route canonical metadata handoff, same-Fansub navigation placement, and the `Coop mit ...` hero hint.
- `frontend/src/components/groups/GroupEdgeNavigation.tsx` cannot stay as a cross-group same-Anime navigator under the `Weitere Projekte` label.
</code_context>

<initial_sequence>
## Proposed Step Sequence

1. **Fansub project detail hero** - discuss whether it should mirror the public Fansub hero more strongly, including banner placement, glass panel, stats, and mobile stacking.
2. **Public Fansub project URL and navigation** - add `/fansubs/[slug]/fansubprojekt/[animeSlug]` for new public links, keep `/anime/[id]/group/[groupId]` as compatibility/internal route with canonical to the pretty URL, and replace misleading cross-group edge navigation with same-Fansub-only project navigation.
3. **Fansub project story title and reading behavior** - implement `Geschichte des Fansub-Projekts` as a single collapsible project text block.
4. **Fansub project members** - mirror the public Fansub page member presentation for members involved in this Fansub project, show only project roles, and keep the future project-member contribution target deferred.
5. **Release versions section** - remove the standalone newest-release block, title the section `Releases zum Fansub`, and otherwise keep the current release presentation conservative until a later release-display phase.
6. **Remove OP/ED/Middle and Medien standalone sections** - do not redesign them here; later integrate them into the release experience.
7. **Entry link check** - verify that the jump from `/fansubs/[slug]` opens the pretty project URL once available and still reaches the same project content.
</initial_sequence>

<deferred>
## Deferred

- New project data fields are out of scope until the UI proves an actual data gap.
- Admin project editing is out of scope unless it blocks public display verification.
- Release permission/eligibility logic is out of scope.
- Existing test data does not need cleanup unless it blocks UAT for the current step.
- Slug history/old-slug redirect support is out of scope.
- A dedicated project-member contribution page showing one member's posts/media for a Fansub project is out of scope.
- Release card/version/cooperation display redesign is out of scope and should be its own later phase.
- OP/ED/Middle and Medien should later be integrated into release detail/presentation work instead of being standalone project-page sections.

### Reviewed Todos (not folded)
- `Contribution-UI auf globale components/ui-Primitives umstellen` - reviewed; too broad/general for this phase beyond the existing reuse-first UI rule.
- `Credits-UI in "Anime & Veröffentlichungen" konsolidieren + Permission-Brücke` - reviewed; related to credits, but broader than the public project-page member presentation cleanup.
- `Member-Profil-Seite - UI-Politur + params.id-Korrektheitsbug` - reviewed; belongs to member-profile work, not the Fansub project detail page.
</deferred>
