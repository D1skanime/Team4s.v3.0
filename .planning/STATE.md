---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Coverage
status: executing
stopped_at: Completed 137-06-PLAN.md
last_updated: "2026-08-21T19:04:32.089Z"
last_activity: 2026-08-21
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 39
  completed_plans: 37
  percent: 14
---

# Project State

## Milestone v1.3: COMPLETE (2026-08-20, tag `v1.3`)

All 8 phases (128 through 135) complete, all 65 v1.3 requirements verified complete. Non-destructive
close — see `.planning/v1.3-MILESTONE-AUDIT.md` for the scorecard and tracked debt, and
`.planning/archive/v1.3/` for a copied snapshot of the milestone's tracking docs at close time.
This section, `ROADMAP.md`, and `REQUIREMENTS.md` all remain live in place (not archived/removed) —
Phase 135 and any future roadmap entries continue from here.

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-13)

**Core value:** Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.
**Current focus:** Phase 137 — central-effective-rights-resolver-overrides

## Current Position

Phase: 137 (central-effective-rights-resolver-overrides) — EXECUTING
Plan: 7 of 8
Status: Ready to execute
Last activity: 2026-08-21

## Accumulated Context

### Roadmap Evolution

- Milestone v1.4 roadmap created (2026-08-20): seven sequential phases 136-142 cover Findings #29-#32 and all 41 approved requirements exactly once. Finding #33 (platform documents) and #34 (badge UI) remain deferred.
- Phase 135 added (2026-08-17): Einladungs- und Onboarding-Flow fuer eingeladene Fansub-Mitglieder haerten. Scope = Live-UAT-Findings #6-#10 (.planning/notes/live-uat-ux-findings.md). Additiv an v1.3 angehaengt; Requirements TBD (kein REQUIREMENTS.md-Mapping -- Decision-Coverage-Gate beim Planen beachten).

### Decisions

- [Milestone v1.4, 2026-08-20]: Sequence policy/schema -> central resolver -> effective-rights UX and independent user projections -> specialized review delegation -> actor-decidable queue -> integrated security/live gate. This preserves `permissions.Service`, Keycloak global-role ownership, specialized delegation, canonical media/contribution ownership, and central browser refresh.
- [Milestone v1.4, 2026-08-20]: Findings #33 and #34 are explicitly excluded from every v1.4 phase and remain future requirements.
- [Phase 135, 2026-08-17]: 135-05's shipped `InviteAcceptFlow` (generic Anmelden/Registrieren copy) stays as the locked contract for 135-06/135-08; the Content-Spec Addendum's dynamic group/inviter/role context line and "wrong email logged in" state (D-11) are deferred — they require a new invite-preview-by-token backend endpoint out of Phase 135's scope. Tracked at `.planning/todos/pending/2026-08-17-invite-accept-dynamic-context-preview-endpoint.md`. Not a blocker for 135-07's live UAT.
- Milestone v1.3 hardens the existing public member profile; it does not introduce parallel member, contribution, membership, badge, media, release, auth, or UI systems.
- Anonymous hidden profiles and missing profiles are non-distinguishable.
- Public member slugs are stored, unique, and immutable after creation.
- Exact public badge progress is derived only from publicly permissible facts.
- Visibility and verified owner access are resolved before any profile-detail projection.
- Existing test rows are disposable; schema changes use new reversible migrations followed by reset/reseed, without row-preservation, backfill, alias, or compatibility code.
- The approved roadmap contains 65 requirements mapped exactly once across sequential Phases 128-134.
- The drifted historical planning tree is preserved at `.planning/milestones/pre-v1.3-recovery-2026-08-13/` and is not represented as one falsely completed milestone.
- [Phase 128]: Phase-128 PostgreSQL tests require TEAM4S_PHASE128_TEST_DSN and never fall back to DATABASE_URL.
- [Phase 128]: Wave-0 identity gates use compilable source-inspection RED contracts until Plans 128-04 and 128-05 provide production symbols.
- [Phase 128]: Public member access exposes only member ID, stored slug, and server-computed owner/private-preview facts before detail loading.
- [Phase 128]: One eight-case access matrix governs profile, projects, contributions, summary, notes, media, and releases with neutral 404 denials.
- [Phase 128]: Canonical redirects are tested as syntax-only 308 behavior independent of member existence. — Prevents existence-sensitive redirect behavior from becoming a privacy oracle.
- [Phase 128]: Refresh-only owner coverage exercises retained member reads through the central browser client. — Keeps UI token-free while proving fresh bearer attachment and no-store inside api.ts.
- [Phase 128]: Owner preview RED coverage rejects duplicate identity, auth, fetch, slugification, and numeric fallback seams. — The authoritative public DTO and pathname-owned canonical slug remain the only preview authority.
- [Phase 128]: Member-path redirects normalize only safe stored-slug syntax and never consult identity, visibility, auth, API, or database state.
- [Phase 128]: Numeric, malformed, separator-bearing, control, double-encoded, and non-ASCII member segments pass through without redirect.
- [Phase 128]: Migration 0145 refuses non-empty members before ALTER and never mutates rows; disposable data must be reset and reseeded. — Fail-closed schema transition prevents accidental live-row rewriting or compatibility behavior.
- [Phase 128]: Canonical public slugs are unique, constrained, and immutable in PostgreSQL. — Database invariants protect public identity across every future writer.
- [Phase 128]: Public member DTOs expose no app-user ownership identifier; owner and private-preview facts remain server-computed. — Avoids BOLA-prone client ownership inference.
- [Phase 128]: The entire members.public_slug namespace uses one transaction advisory lock, including literal suffix collisions. - Per-base locks cannot serialize name against literal name-2 creation.
- [Phase 128]: All production member creation paths allocate exactly once inside their existing caller-owned transaction. - Identity is persisted atomically with creation without nested transactions or parallel allocators.
- [Phase 128]: Outbound contribution links use stored public_slug only for public profiles; private member links remain NULL. — Stable identity survives nickname edits without disclosing private slugs.
- [Phase 128]: The shared nickname-derived memberSlugExpr declaration remains only until Plan 128-10 removes inbound resolution and remaining consumers. — Plan 128-06 removes owned outbound consumers without crossing later cleanup ownership.
- [Phase 128]: Group and domain projection links use stored public_slug only for public profiles; private identities remain unlinked.
- [Phase 128]: Grouped historical and contributor projections include the joined member primary key so canonical slug selection preserves row ownership and grouping.
- [Phase 128]: Archive and ranking projections select members.public_slug directly because their queries already enforce public visibility. — Stable public identity survives nickname changes without numeric or generated fallback.
- [Phase 128]: Verified member_claims equality is the only private-profile grant; missing and denied identities share ErrNotFound. — Prevents legacy identity, admin role, or guessed slug from becoming an authorization oracle.
- [Phase 128]: Public profile and project detail projections load only by a previously resolved member ID. — Keeps canonical identity and visibility decisions ahead of all detail fan-out.
- [Phase 128]: Temporary handler-compatibility methods delegate to the shared resolver and ID loaders until Plan 128-11. — Preserves whole-backend compilation without retaining duplicate slug or access logic.
- [Phase 128]: Contribution and project-member repositories accept only a stable member ID resolved by the shared access boundary.
- [Phase 128]: Project summaries expose members.public_slug directly; nickname-derived aliases and numeric fallbacks are not detail-loader concerns.
- [Phase 128]: Public profile handlers resolve canonical access before member-ID detail loading and return server-computed owner/private-preview facts.
- [Phase 128]: Verified AppUserID is the only viewer input to public-member authorization; platform-admin and token roles grant no access.
- [Phase 128]: Optional-auth member responses vary on Authorization, and viewer-dependent results use private, no-store.
- [Phase 128]: All seven member-specific GET routes share one MemberProfileRepository access resolver and existing optional-auth middleware.
- [Phase 128]: The seven public-member operations retain their backend runtime envelopes while sharing optional bearer, neutral 404, and private no-store semantics. — Preserves runtime parity while closing hidden-response and cache drift.
- [Phase 128]: Public profile ownership is represented only by server-computed viewer facts; the public DTO exposes no app-user identifier. — Prevents client-side ownership inference and public identity leakage.
- [Phase 128]: Member profile SSR remains anonymous and token-free; refresh-only owner recovery stays in the Plan-128-16 client seam.
- [Phase 128]: Invalid, numeric, missing, and privacy-denied member routes converge on neutral Next notFound output.
- [Phase 128]: The complete established profile composition remains authoritative for public and future owner-preview rendering.
- [Phase 128]: Own-profile public actions require the stored canonical slug and disappear when it is absent. — Prevents numeric or nickname-derived fallback identity while keeping display-name edits URL-neutral.
- [Phase 128]: Shared MemberProfileHero links use only the stored DTO slug and disappear when runtime slug data is absent. — Prevents numeric or nickname-derived public identity fallback across own and public DTO consumers.
- [Phase 128]: Hidden-profile resolution derives the canonical slug from usePathname and keeps initialization neutral.
- [Phase 128]: The preview passes authoritative viewer access into the shared composition and toolbar.
- [Phase 128]: Toolbar ownership uses getMemberProfile with the stored slug and never current-user or numeric-ID authority.
- [Phase 128]: Visibility remains in the established radio-card editor with exactly public and private values; no members-only alias or fallback label remains. — Keeps the canonical visibility contract and avoids a parallel persisted-data control.
- [Phase 128]: The owner deep link allow-lists existing profile tabs and focuses and scrolls the visibility panel without creating a second route, form, or auth seam. — Keeps owner editing on the established refresh-capable protected surface.
- [Phase 132]: known_for is one object (active_years, top_roles, known_groups) computed server-side over the complete approved current-project set, mirroring deriveKnownFor.ts's shape in snake_case.
- [Phase 132]: loadKnownFor is a dedicated new query (not an extension of countCurrentProjects), reusing its exact WHERE-clause filter set; raised the locked query budget 19 -> 20.
- [Phase 132]: getMemberProjects gained a 4th optional signal parameter mirroring getSearch/getSearchSuggestions.
- [Phase 132]: useCancellableSlugState never mutates a ref inside a setState updater; state transitions are pure functions of previous state plus resolved value, avoiding the StrictMode double-invoke dedup bug precedent in useProjectMemberCollection.ts.
- [Phase 132]: Progressive-disclosure components must never conditionally unmount content behind a visual toggle; only a CSS class changes -- locked as a tested contract (PMFE-06/D-09) across MemberStorySection, FocalCarousel, and MemberBadgeChain.
- [Phase 132]: useMemberViewer's fetcher must be useCallback-memoized on slug alone; an inline arrow function fed into useCancellableSlugState's effect dependency array causes an infinite self-abort/refetch loop.
- [Phase 132]: CorrectionReportModal no longer performs its own owner-resolution fetch; OwnProfileEditLink via useMemberViewer is the sole owner-gating authority for the members/[slug] surface (PMFE-02/D-02).
- [Phase 132]: MemberProfileHero/MemberProfileMemorialHero read known_for from the DTO with zero client-side re-aggregation; deriveKnownFor.ts trimmed to the still-used KnownForResult type only.
- [Phase 132]: Visible profile generateMetadata composes title/description/OpenGraph only from already-public fansub_name and known_for facts; hidden/missing metadata stays byte-identical.
- [Phase 132]: relativeTimeLabel is a pure function of (occurredAt, referenceNow); one server- or client-useState-captured referenceNow is threaded through MemberProfileContent to eliminate the Date.now() SSR hydration-mismatch.
- [Phase 133]: MemberBadgeChain.tsx (928 lines, ~2x CLAUDE.md's 450-line cap) is accepted pre-existing debt deferred outside Phase 133's scope — CONTEXT.md's D-04 scoped only the CSS-module split (MemberBadgeChain.module.css); the .tsx file keeps its existing per-component function boundaries and gains only import-wiring changes across Plans 133-04/07/08/09. Formally resolves RESEARCH.md's Open Question 1, mirroring the codebase's existing oversized-file deferral precedent.
- [Phase 133]: dangerouslyAllowLocalIP is gated to process.env.NODE_ENV !== 'production' and images.qualities is an explicit [75] allow-list; localPatterns (/media/**, /member-achievement-badges/**, /covers/**) remain byte-for-byte unchanged and regression-tested.
- [Phase 133]: The full pre-existing @media (max-width: 760px) hero block (which bundles .heroPanel/.heroAvatar with .heroCopy/.heroTitleRow/.heroBio/.heroMetaLine/.knownForBlock/.heroSpecialAwardsList overflow-safety rules) was converted as one unit to @container member-profile-hero, keeping hero-internal overflow-safety rules in sync with the panel/avatar's container-driven layout switch. — Prevents overflow-safety rules from falling out of sync with the panel layout at wide-viewport/narrow-container states, e.g. inside a future two-column .profilePair layout
- [Phase 133]: MemberBadgeChain.tsx's shared roleArtwork classes moved to LayeredBadgeArtwork.module.css keep two role-code/anime-project override rule blocks behind in MemberBadgeChain.module.css since CSS Modules scopes selectors per file; the affected JSX sites apply both the moved and the still-local class name to preserve pixel-identical rendering (Plan 133-04, precedent for 133-07/08/09).
- [Phase 133]: react-dom@18.3.1 does not forward a declarative boolean inert JSX prop to the DOM — FocalCarousel sets/removes the inert attribute imperatively via a ref callback instead; jsdom's inert focus-blocking is unimplemented so tab reachability is asserted via attribute presence, not userEvent.tab().
- [Phase 133]: MemberProfileMemorialHero.tsx now mirrors MemberProfileHero.tsx's public-view heading structure exactly: p.heroEyebrow -> div.heroTitleRow > (h1.heroTitle + MemberStatusPill), no PageHeader title usage.
- [Phase 133]: Compound CSS selectors mixing a class moving to a new stage module with a class staying in MemberBadgeChain.module.css (either direction) stay behind in the shell file with dual-class JSX application (Plan 133-04 precedent); the .group[data-badge-group]-scoped 'no card surface' twin stays listing all five stage selectors unnarrowed for the same CSS-Modules per-file scoping reason.
- [Phase 133]: MemberBadgeChain.tsx's .familyStageButton:has(.currentChip)/.familyStageButton .currentChip stay in MemberBadgeChain.module.css since .currentChip is a chainStyles-local shared utility class used at multiple other sites (roles progression, anime-project milestones); the rendered family stage button carries both badgeFamilyCardStyles.familyStageButton and chainStyles.familyStageButton so both rule sets keep matching (Plan 133-08, extends the Plan 133-04/07 compound-selector-crosses-file-boundary pattern).
- [Phase 133]: MemberBadgeChain.tsx's four badge-chip compound groups (.badgeWindowActive .badgeArtwork, six .group[data-badge-group=...] .badgeRow/.badgeArtwork/.badgeRowCompact rules, .badgeWindowActive .badgeStep) stay in MemberBadgeChain.module.css since .badgeWindowActive/.group are chainStyles-local while .badgeRow/.badgeArtwork/.badgeRowCompact/.badgeStep moved to BadgeChip.module.css; the generic badge-row render site applies dual classes at 4 JSX sites so the kept-behind rules keep matching (Plan 133-08).
- [Phase 133]: FAMILY_CARD_COMPACT_QUERY is the single named JS constant reconciling FamilyCollectionCard's window.matchMedia scroll-centering breakpoint with BadgeFamilyCard.module.css's @container (max-width: 820px) layout breakpoint at exactly 820px, closing RESEARCH.md's magic-number duplication (Plan 133-08).
- [Phase 133]: RoleBadgeCard's selector family was split by SELECTOR OWNERSHIP into three files (RoleBadgeCard.module.css/.status.module.css/.stages.module.css) rather than by breakpoint tier, since CSS Modules hashes class names per source file -- splitting one selector's base+breakpoint rules across multiple files would require the DOM element to carry a hash from every file simultaneously; grouping by which selectors a file owns guarantees each selector's complete rule set lives in exactly one file (Plan 133-09).
- [Phase 133]: RoleBadgeCard.module.css/.status.module.css/.stages.module.css complete the MemberBadgeChain.module.css split (Plans 133-04/07/08/09): shell shrunk to exactly 450 lines, all 12 extracted CSS modules under the cap, 4 previously-duplicated selectors (.roleLabel/.roleBadgeRow/.roleHeroArtwork/.roleProgressTrack) each resolved to exactly one canonical declaration per UI-SPEC.md's locked table.
- [Phase 133]: LOCKED_BUDGETS page-level metrics (imageWaterfall) must be excluded from evaluateBudget()'s generic api[endpoint] budget loop; checked separately alongside the Web-Vitals pageCheck (rendered pages only).
- [Phase 133]: A CSS comment's embedded */ (used as informal glob/wildcard shorthand, e.g. .roleBadgeRow*/.roleLabel) prematurely closes the enclosing /* ... */ comment block and crashes the entire page with a dev-server syntax error; avoid asterisk-immediately-followed-by-slash sequences inside open CSS comments (found/fixed in Plan 133-10, MemberBadgeChain.module.css and RoleBadgeCard.module.css).
- [Phase 133]: capturePageMetrics() now captures pageOverflow/bodyOverflow (previously only existed in the separate phase120-mode snapshotDOM()); evaluateBudget() hard-gates on both deltas being <=0 (PMUI-01/06), completing the phase's automated overflow gate.
- [Phase 133]: Plan 133-11's full unscoped npm test sweep (first in this phase) confirmed 11 pre-existing failures across files never touched by any Phase 133 plan are out of scope; only the MemberBadgeChain.test.tsx containe typo and missing type cast (a file already owned by earlier Phase 133 plans) were fixed. See deferred-items.md for full triage.
- [Phase 134]: seed-member-profile-fixtures.mjs's story-image assertion and manifest field use /media/profile/ as the expected member_story_html src substring, not /media/story-images/ (the sanitizer-allowed pattern is /media/profile/{memberID}/story/{uuid}/original.ext; /media/story-images/:id is a separate resolve-by-ID endpoint used only for editor-side preview).
- [Phase 134]: TestPhase134MigrationFreshUpDownProof registers maintPool.Close() via t.Cleanup (not a bare defer), ordered before the final teardown-drop cleanup, since t.Cleanup callbacks run after the test function's own defers return.
- [Phase 134]: Migration 0037_add_release_decomposition_tables.down.sql was rewritten from an intentional no-op into a full reverse of its up.sql; its release_streams FK to release_variants(id) blocked migration 0035's DROP TABLE release_variants the first time the full Down chain ever ran end-to-end (PMQA-03 fresh/up/down proof).
- [Phase 134]: A genuinely fresh migration-only database has no member to self-claim and no platform_admin to grant the first platform_admin -- scripts/provision-phase134-matrix-db.sh bootstraps both via scoped direct SQL before invoking the real seed script, which retains 100% ownership of scenario/business fixture data.
- [Phase 134]: The verification matrix mounts ./scripts:/scripts:ro into team4sv30-backend (docker-compose.override.yml), mirroring the existing ./database/migrations mount, since the container's /app root corresponds to backend/ only, not the repo root.
- [Phase 134]: parseBoundedProjectPageValue never returns an error status for invalid limit/offset query params -- it silently clamps to the documented safe default/bound and returns 200; this IS its fail-closed contract, not a bug.
- [Phase 129]: Canonical public projections and data correctness are executed and automated-gate GREEN (11/11 plans) -- every year-only precision, current-vs-historical, role code/label, dedupe, public-facts-progress, media-filter, and dead-legacy-removal defect found in 129-RESEARCH.md is corrected and locked by a passing PostgreSQL contract test, per .planning/phases/129-canonical-public-projections-data-correctness/129-VERIFICATION.md.
- [Phase 130]: The public DTO/OpenAPI/TypeScript/api.ts contract alignment is executed (7/7 plans) -- shared/contracts/openapi.yaml carries dedicated allow-listed public-member schemas (PublicMemberBadge, etc.); no separate 130-VERIFICATION.md/SUMMARY.md file exists, a real doc-completeness gap noted by 134-RESEARCH.md's Ground Truth findings, not a code gap.
- [Phase 131]: Set-based delivery, pagination, and performance budgets are executed and locked (8/8 plans) -- profile-load SQL query count is capped at 19, and API payload/latency/Web-Vitals budgets for both sheppert and csubs-leader are captured in .planning/phases/131-set-based-delivery-pagination-performance-budgets/evidence/BUDGETS.md.
- [Phase 134]: reset-member-profile-fixture.sh clears members.member_story_json/html/text (UPDATE, not DELETE) for the two reference members before deleting their story-image media_assets rows — that JSONB reference is invisible to Postgres FK enforcement; a stale reference would trip applyStoryImageLifecycle's IDOR check on the reseed's next PUT /me/profile
- [Phase 134]: The three tracked badge asset directories are sha256-verified byte-identical before and after the shared team4s_v2 database reset+reseed cycle (PMQA-06), and the seed re-run prints RESULT: PASS (15/15) twice in a row afterward, proving PMQA-01's idempotent-from-clean-state claim genuinely holds
- [Phase 134]: Plan 134-06 resumed 2026-08-20: the shared team4s_v2/Keycloak stack had been fully reset out-of-band (both `team4s_postgres_data` and `team4s_keycloak_db_data` volumes recreated 2026-08-17), so sheppert/csubs-leader existed nowhere (no Keycloak accounts, no members rows) -- bootstrapped both via the exact identity/authz pattern already established in provision-phase134-matrix-db.sh Step 4.5 (kcadm user create + platform_admin realm role + member/member_claims/app_user_global_roles bootstrap SQL), then re-ran the Plan-134-01 seed script (15/15 checks pass). Task 1's automated capture then found a real, pre-existing bug: `--focus-ring` (a box-shadow token) was misused as an outline color in profile.module.css/FocalCarousel.module.css/AnimeProjectStage.module.css, silently collapsing keyboard focus rings to invisible on the live member-profile page; fixed all three to use the dedicated `--focus-outline` color token (GroupMediaReviewSection.module.css has the same bug but is admin-only, out of this plan's blast radius -- logged to deferred-items.md). Both evidence harnesses now pass 0-breach/exit-0, and all 6 profile x viewport keyboard-focus captures report keyboardPass: true.
- [Phase 134]: Plan 134-06 Task 3 (PMQA-05 live sign-off) closed 2026-08-20 after two live-UAT gap-closure rounds, each fixed and re-evidenced before the next round: (1) a mobile hero container-query self-query bug (dead cqi units in LockedStageArtwork.module.css) freezing the 390x844 layout, plus badge-chain connector-line misalignment (roles progression + anime-project milestones, AnimeProjectStage.module.css/RoleBadgeCard.stages.module.css) and badge-label mid-word wrapping -- all fixed and evidence refreshed (commit 96b8bbeb); (2) a tablet/desktop hero-avatar top-alignment fix, evidence refreshed a second time (commit c285414d). User then performed the full live browser walkthrough over the canonical SSH-tunnel path across all 3 required viewports (390x844/768x1024/1440x900) plus real 400% browser zoom, confirmed the seeded story image renders and keyboard Tab focus is visible, and explicitly typed "approved" for both sheppert and csubs-leader -- both Sign-off checkboxes in uat-checklist.md checked (commit 9c8ac464). PMQA-05 complete; all 6 Phase 134 plans now done. Phase 134's own phase-level closure (code review/regression gates, ROADMAP/STATE phase-complete marking) and milestone v1.3 completion remain the orchestrator's next step.
- [Phase 135]: Plan 135-01 executed (D-01, D-04) -- keycloakAuth.ts gained a validated one-shot consumeStoredReturnPath() (mirrors registrationCompletion.ts's marker pattern) plus BeginKeycloakLoginOptions.loginHint/.returnPath; login/page.tsx's completeCallback() destination priority is now persistedReturnPath ?? (registration-completion default) ?? next-param. This is the shared foundation Plans 135-05/06 must persist a returnPath through via beginKeycloakLogin({ returnPath }) rather than inventing a second mechanism. 12/12 login/page.test.tsx cases pass; tsc --noEmit clean for both touched files (pre-existing unrelated Next.js route-type errors elsewhere ignored).
- [Phase 135]: Plan 135-02 executed (D-06) -- ListFansubGroupRoleDefinitions's SQL predicate simplified to WHERE assignable = true only, closing Finding #7 / Pitfall 2 (admin/other anime_contribution roles leaking into the group-role picker). New testsupport.OpenPhase135Postgres harness (SKIP-not-FAIL convention) plus TestListFansubGroupRoleDefinitionsAssignableOnly prove the exact 6-code assignable set against a real 0085/0100/0103/0112 migration chain. — Closes the one-line SQL defect identified in 135-RESEARCH.md Pitfall 2 with a live-DB regression proof rather than source inspection alone.
- [Phase 135]: Plan 135-03 executed (D-03, D-01, D-08) -- CreateFansubGroupInvitation's mail now names the real fansub group (via a new fansubGroupNameStore threading of FansubRepository.GetGroupByID, fail-open to a generic phrase) and the inviting admin (identity.DisplayName), replacing the old blind "Du wurdest zu einer Fansub-Gruppe eingeladen" text with the phase's locked Content-Spec Addendum copy. The mail CTA link now carries &email=<url-escaped invitee email> for D-08's mediated Keycloak login_hint prefill fallback (server-side match enforcement in Accept() unchanged). Two new tests prove the enriched context and the nil-fansubRepo fallback; go build/vet/test all clean.
- [Phase 135]: Plan 135-04 executed (D-05, D-07) -- HistoricalMemberCard now destructures the 8 already-declared claim-invite props (generatedInvites, memberInvitations, copyStates, canCreateClaimInvitation, onGenerateInvitation, onCancelInvitation, onCopyLink, normalizeInviteLink) and renders the generate/copy/cancel block gated on canCreateClaimInvitation && !member.app_username, using the hist-claim-invite-link- id prefix required by useGroupMembersClaimActions.ts's markVisibleInviteLink DOM fallback (not ClaimManagementPanel's claim-invite-link- prefix). ClaimManagementPanel.tsx is documented in-code as an intentionally unmounted future-admin-view reference rather than deleted, resolving 135-RESEARCH.md Open Question 2. 4/4 new component tests pass; tsc --noEmit clean for both touched files. — Closes the "generate + display" gap for the claim flow that unlocks historical members -- pure JSX wiring against an existing, tested, audit-logged backend/hook; no backend change and no new authorization surface.
- [Phase 135]: Plan 135-05 executed (D-01, D-04, D-07, D-08, D-09) -- new frontend/src/components/auth/InviteAcceptFlow.tsx is the one shared dual Anmelden/Registrieren + returnPath + auto-accept + friendly-error onboarding component (Button-only, zero raw <button>), and frontend/src/app/invitations/accept/page.tsx is rewritten on top of it, closing Finding #10's BLOCKER cold-invite dead end. A useRef guard fires the auto-accept effect at most once per mount; handleLogin/handleRegister persist returnPath via 135-01's beginKeycloakLogin({returnPath}) and forward loginHintEmail as login_hint. 9/9 new frontend tests pass (5+4), re-run alongside login/page.test.tsx's 12 cases with zero regressions (21/21). — DEVIATION FLAGGED: the plan file's own appended "Content-Spec Addendum" (D-11/D-12, dynamic group/inviter copy + a fourth "wrong email logged in" state + "Konto erstellen und beitreten"-style button labels) was NOT implemented; the plan's literal <tasks> section (simpler generic copy, matching 135-06-PLAN.md's already-written expectations) was followed instead. See 135-05-SUMMARY.md's "Deviations from Plan" for full rationale -- this addendum content is an open gap that needs a follow-up plan/task or an explicit CONTEXT.md rescoping before 135-07's live UAT (which requires "correct German copy... throughout").
- [Phase 135]: Plan 135-06 executed (D-09, D-07) -- claim-invitations/accept/page.tsx rewritten as a thin InviteAcceptFlow composition, closing D-09 (both invite types now share one shared onboarding flow) and Pitfall 1/5's return_to dead end for this page. No loginHintEmail prop (claim invitations are generic shareable links with no target email); afterAcceptRedirect=/me/profile preserves the page's prior immediate-redirect-on-success behavior. 3/3 new page tests pass, re-run alongside login/page.test.tsx (12), invitations/accept/page.test.tsx (4), and InviteAcceptFlow.test.tsx (5) with zero regressions (24/24 green); tsc --noEmit clean for touched files (pre-existing unrelated Next.js route-type errors elsewhere ignored). — Followed 135-06-PLAN.md's <tasks> section literally against 135-05's locked InviteAcceptFlowProps contract, per the user-confirmed scope ruling (STATE.md 2026-08-17 entry) that the Content-Spec Addendum's dynamic group/inviter/role copy stays deferred and out of scope.
- [Phase 135]: Plan 135-08 executed (D-12, D-13, D-07) -- infra/keycloak/themes/team4s/login/register.ftl is now a real theme override (previously the theme shipped zero .ftl overrides and inherited register.ftl byte-for-byte from keycloak.v2). Empirically confirmed against the live Keycloak 26.0.8 realm (curling /realms/team4s/protocol/openid-connect/registrations with login_hint set) that login_hint prefills only the "username" registration attribute, never "email" -- register.ftl reuses that prefilled username value as `invitedEmail` whenever it looks like an email address, and renders the "email" attribute with custom inlined markup carrying a real HTML `readonly` attribute (value still submitted, unlike Keycloak's own attribute.readOnly path which emits `disabled` and drops the value) plus a generic invite-context line (team4sInviteContext message key; Keycloak does not forward group/inviter/role to the registration template, matching 135-05-SUMMARY.md's prior Content-Spec Addendum scope ruling). Full live proof: registered a real test account through the locked path via curl (PKCE authorization_code flow), exchanged the code, and confirmed via /userinfo that the created account's email claim exactly matched the invited address; test account deleted via the Keycloak admin API afterward. Open (non-invite) registration verified unaffected. — This is a scope evolution of D-08 (135-CONTEXT.md's original text says "kein KC-Theme-Umbau"/no KC theme rework): D-12/D-13 were added later, during live-UAT review, specifically because D-08's mediated query-param-only approach (135-03) could prefill but not lock the email or show invite context; 135-08 layers a theme change on top of, not instead of, that mediated fallback.
- [Phase 135]: [Phase 135, 2026-08-19]: Plan 135-07 executed (D-01..D-04, D-08, D-09) -- scripts/phase135-green-gate.sh (already built/committed 7afd2774) re-run after 3 intervening commits confirmed zero new regressions; the 4 non-green steps (backend-test DB-integration fixtures, frontend-lint capture-responsive.cjs, frontend-test 12 stale files, frontend-build Next.js /_global-error Turbopack prerender) are all pre-existing and untouched by any Phase 135 file, per git-log cross-check. — Live UAT confirmed (user, 2026-08-19): registrationAllowed=true on the running Keycloak team4s realm (no drift); cold-invite round trip (mail context/Umlaute, Anmelden/Registrieren no jargon, auto-return, auto-accept) and claim-invite round trip (lands on /me/profile) both confirmed end-to-end with zero deviations. Closes Finding #10 BLOCKER.
- [Phase 135]: [Phase 135, 2026-08-19]: Plan 135-10 executed (D-15, D-16) -- case-preserved fansubName KC attribute (register.ftl hidden-username derivation + token claim + backend display-identity priority) closes D-15; Task 4's self-claim approval render pre-existed this plan (ca189d99, prior non-GSD session) and was sanity-checked, not re-implemented. Live UAT surfaced 5 deviations, all fixed same-session: 2 backend list queries preferring lowercase preferred_username over case-preserved display_name; missing success feedback + cross-list refresh on claim-verify/member-activate; 5 window.confirm() calls replaced with the app's own Modal (design-system violation); missing claim-note render; a direct-user-requested mobile-first claim-card redesign. — Phase 135 is now complete (both previously outstanding plans, 135-07 and 135-10, done; all 10 plans have summaries). D-01 through D-16 implemented and live-verified. Commits 069b2f6b/514ec1fd/88e0d62f/1403ccd0 (Finding #28: hide active members from historical list, surface active membership + verified historical roles on public profile, linked-account card redesign) landed in the same session immediately after but are explicitly out of 135-10's D-15/D-16 scope -- recorded as an adjacent follow-up, not phase-135 work.
- [Phase 136]: Catalog color_key values are normalized to the exact migration-0149 hex allowlist; unknown values resolve to neutral.
- [Phase 136]: Active role chips use one data-color-key CSS seam and never derive colors from role codes.
- [Phase 137]: Migration 0150 seeds the override-management capability only to fansub_lead (not founder/co_leader) and flips exactly seven Phase-136 group actions plus all three review.*.decide actions to user_overridable=true, giving later Phase-137 plans a real Review-Delegation-vs-User-Deny action to test against.
- [Phase 137]: 137-02: EffectiveRightState additively extended (D04) with granting_roles[]/user_allow/user_deny/specialized_grants[]/decisive_source/reason_code; EffectiveRightProvenance gained platform_admin/specialized_grant/no_grant; CapabilityActivationStatus documented active-only for Phase 137. No competing inspector DTO introduced; Go DTO in capability_policy_contract.go deliberately deferred to a later Phase-137 plan. — Closes the Phase-136 DTO provenance gap identified in 137-RESEARCH.md Pitfall 4/Open Question 1 before any backend resolver route consumes the contract.
- [Phase 137]: 137-03: AuthzUserOverridesRepository (backend/internal/repository/authz_user_overrides.go) gives the resolver/mutation-service layer batch-load (LoadCurrentOverrides), FOR-UPDATE membership lock (LockTargetMembership distinguishes ErrNotFound non-member from a returned inactive Status), catalog-policy read (LoadOverridePolicy), lock-then-mutate before/after state (UpsertOverride/DeleteOverride), and append-only history (AppendHistory/ListHistoryForSubject) primitives -- zero resolver precedence logic, zero N+1, one authzUserOverridesDBTX interface (embeds repository.DBTX + Query, mirrors releaseCrewDBTX) works on pool and tx alike. New backend/internal/testsupport/phase137_postgres.go harness applies the real 0085/0100/0108/0112/0146/0150 migration chain.
- [Phase 137]: 137-04: ResolveGroupRights is the single group-wide D01 precedence engine (platform_admin > disabled > no-membership > user_deny > user_allow > role_grant > specialized_grant > no_grant), batch-loading membership/roles/overrides/specialized grants with no per-capability SQL; two new optional Resolver interfaces (GroupRightsMembershipResolver, GroupRightsOverridesResolver) exist but AuthzRepository does not implement them yet -- production falls back to inferring active membership from non-empty roles (zero regression), and real per-user override enforcement is not yet live end-to-end. Review Delegation is fully wired today via the existing ReviewContextResolver as the first SpecializedGrantProvider (review_grant_provider.go). Flagged for Plan 137-05 to close.
- [Phase 137]: 137-05: Every production group-scoped Can* entry point (CanForFansubGroup, CanForRelease, CanForReleaseVersion, CanForReleaseVersionMedia, CanReviewForFansubGroup) now derives its decision from ResolveGroupRights, closing 137-04's Known Gap by wiring AuthzRepository into GroupRightsMembershipResolver/GroupRightsOverridesResolver against real Postgres. — 137-04 flagged that ResolveGroupRights was logically correct but unreachable from production traffic and had zero repository wiring; 137-05 is the plan that first routes legacy enforcement through it, so closing the gap here (rather than deferring) was required for the plan's own must_haves to be true in production, not just in Go fixtures.
- [Phase 137]: 137-06: EffectiveRightsService.MutateOverride requires a reason for every real change uniformly (including platform admins), and validates active target membership in the exact target group for every mutation kind including REMOVE -- stricter than migration 0146's own DB CHECK constraint, matching the plan's must_haves literally. Fixed a real gap: permissions.allKnownActions was missing ActionUserGroupCapabilityOverrideManage entirely, so ResolveGroupRights could never grant D07's management capability at all until this plan added it (mirrors 137-05's identical allKnownActions-completeness precedent).

### Pending Todos

- Ten existing pending todo files remain unchanged because none maps completely and unambiguously to exactly one v1.3 phase.
- The public-member params/UI todo spans contract and visual work and must be reconsidered during Phase 130 and Phase 133 planning rather than tagged misleadingly to one phase.

### Blockers/Concerns

- No blocker prevents discussion or planning of Phase 128.
- Existing staged/unstaged frontend work and untracked recovery evidence belong to the user and must remain untouched.
- Health warnings for repository-local `DECISIONS.md` and `RETROSPECTIVE.md` conflict with local Team4s documentation policy and are not deletion candidates.
- Before any migration, inspect the current migration chain and stop if multiple untracked migrations exist.
- internal/handlers package tests: ~20 tests across ~10 files (admin_content_anime_project_notes_test.go and siblings) depend on permissions.roleAllows/RoleAllowsAction but never call permissions.Service.LoadCache, so they always observe a nil cache and deny/return false regardless of real role_capabilities data. Pre-existing, verified not caused by Phase 137; see .planning/phases/137-central-effective-rights-resolver-overrides/deferred-items.md.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260819-ipu | Duplikat-Guard beim historischen Mitglied hinzufuegen (Phase-135-Nachtrag, Findings #27/#28) | 2026-08-19 | df1033bf | [260819-ipu-duplikat-guard-beim-historischen-mitglie](./quick/260819-ipu-duplikat-guard-beim-historischen-mitglie/) |
| 260819-lm5 | Phase-117-Nachtrag: geteilte Karaoke-Segmente ueber Folgen zuweisen + Per-Folge-Startzeit-Verschiebung im UI erreichbar machen, inkl. Bereich-Auto-Zuweisung + Korrektheits-Fix am Pro-Folge-"verschoben"-Marker (5 Live-UAT-Runden, siehe 117-10-POST-HOC-CLOSURE.md) | 2026-08-19 | 4c30cb7c | [260819-lm5-phase-117-geteilte-karaoke-segmente-uebe](./quick/260819-lm5-phase-117-geteilte-karaoke-segmente-uebe/) |
| 260820-600 | Phase-117-Nachtrag: Folgen-Navigation im Contributor-Editor (Segment-Pillen-Pager Vorherige/Naechste Folge, aktiver Tab bleibt per ?tab= erhalten), inkl. Redesign Variante A -> Variante B nach Live-UAT-Feedback vor Freigabe | 2026-08-20 | 7f5815b4 | [260820-600-folgen-navigation-im-contributor-editor-](./quick/260820-600-folgen-navigation-im-contributor-editor-/) |

### Verification Baseline

- Requirements: 65 defined, 65 uniquely mapped, 0 orphaned, 0 duplicated.
- Roadmap: seven sequential phases numbered 128-134 with five observable success criteria each.
- Recovery archive: 123 historical phase directories preserved.
- Runtime: canonical Linux Docker Compose services were running when v1.3 was initialized.
- Application validation is deferred to phase execution; milestone initialization changed planning artifacts only.

## Deferred Items

Items acknowledged and deferred at v1.3 milestone close on 2026-08-20 (per `gsd-sdk query audit-open`,
102 total; 1 verification gap — Phase 132's PMFE-11 live-Postgres check — was resolved for real this
session, not deferred, see 132-VERIFICATION.md; the remaining 101 below are pre-existing, unrelated
backlog: Phase 103 debug sessions, historical quick-tasks spanning 2026-04 through today, and
contributor-workspace/UI TODOs). None block v1.3. `audit-open`'s own JSON preview truncates the
pending-todos list (5 filenames shown of an internally-flagged larger remainder) — the full,
untruncated list lives in `.planning/todos/pending/`.

| Category | Item | Status |
|----------|------|--------|
| debug_session | 103-full-episode-admin-action | diagnosed |
| debug_session | 103-karaoke-auth-visibility | root_cause_found |
| debug_session | 103-pretty-release-route | root_cause_found |
| debug_session | 103-public-image-description-edit | root_cause_found |
| debug_session | 103-release-anime-logo-fallback | root_cause_found |
| debug_session | 103-release-image-gallery | diagnosed |
| debug_session | 103-release-preview-selection | diagnosed |
| debug_session | 103-release-text-grid | root_cause_found |
| debug_session | 103-release-visual-language | root_cause_found |
| debug_session | knowledge-base | unknown |
| debug_session | memberprofil-client-exception | awaiting_human_verify |
| debug_session | system-wieder-langsam | awaiting_human_verify |
| quick_task | 260405-kce-sync-phase-07-completion-across-roadmap- | missing |
| quick_task | 260417-qtu-asset-upload-ux-leere-slots-klickbar-und | missing |
| quick_task | 260423dxc-filter-already-imported-episode-candidates | missing |
| quick_task | 260423mnv-per-row-apply-button | missing |
| quick_task | 260423qpn-jellyfin-library-filter | missing |
| quick_task | 260428-ddb-episoden-laufzeit-crawlen-und-in-timelin | missing |
| quick_task | 260429-fnm-smart-parser-fuer-segment-zeitfelder-mm- | missing |
| quick_task | 260507-de2-rename-theme-types-op-to-op-kara-ed-to-e | missing |
| quick_task | 260510-t7j-upload-security-hardening-security-heade | missing |
| quick_task | 260510-umt-beschreibungs-textarea-fix-fuer-release- | missing |
| quick_task | 260511-hfd-releaseversionmediagallery-3-test-bugs-f | missing |
| quick_task | 260511-jjq-umlaut-regel-in-agents-md-ergaenzen | missing |
| quick_task | 260526-mhk-next-image-test-mock-fixen-und-den-einze | missing |
| quick_task | 260602-k94-phase-61-bug-triage-after-live-uat-no-ph | missing |
| quick_task | 260602-o68-phase-65-befunde-fixen | missing |
| quick_task | 260603-l77-inventory-doc-gaps | missing |
| quick_task | 260604-d12-ui-verbessern-auf-global-ziehen | missing |
| quick_task | 260608-jb9-startseite-ui-regelverstoss-beheben-nati | missing |
| quick_task | 260609-wev-releaseversionnotestab-auf-globales-ui-s | missing |
| quick_task | 260609-x3q-episode-version-editor-navigation-zuruec | missing |
| quick_task | 260610-f7n-fansubappmemberssection-collaboration-ta | missing |
| quick_task | 260610-fhn-fansub-members-ux-schnitt-dokumentieren- | missing |
| quick_task | 260610-hw1-banner-buttons-in-fansub-edit-auf-36px-h | missing |
| quick_task | 260610-i2j-fansub-mitglieder-und-historische-mitgli | missing |
| quick_task | 260610-iqh-alias-verwaltung-in-fansub-edit-ins-grun | missing |
| quick_task | 260618-cjy-release-buttons-in-meine-gruppen-auf-me- | unknown |
| quick_task | 260619-w1n-drawer-link-zur-meine-gruppen-uebersicht | missing |
| quick_task | 260620-eaj-member-contribution-ui-auf-globales-desi | missing |
| quick_task | 260620-lq7-manage-groups-ui-uebersicht-detail-claim | missing |
| quick_task | 260620-qog-bestaetigte-projektrollen-pro-anime-grup | missing |
| quick_task | 260620-uez-workspace-ui-primitives | missing |
| quick_task | 260621-p80p88-review-bugfixes | unknown |
| quick_task | 260629-phase91-profile-projects | unknown |
| quick_task | 260629-phase91-project-detail-addon | unknown |
| quick_task | 260629-phase92-profile-tabs | unknown |
| quick_task | 260703-8s3-fix-anisearch-and-jellyfin-anime-source- | unknown |
| quick_task | 260703-a3r-ui-first-e2e-viper-s-creed-jellyfin-fres | missing |
| quick_task | 260703-bc9-fix-sticky-admin-auth-logout-state-block | missing |
| quick_task | 260703-bmp-fix-datepicker-react-hooks-set-state-in- | missing |
| quick_task | 260703-br4-fresh-ui-first-viper-s-creed-e2e-retest- | missing |
| quick_task | 260703-crb-fix-admin-anime-jellyfin-link-status-and | missing |
| quick_task | 260704-neutral-role-labels | unknown |
| quick_task | 260706-x0v-fix-400-release-variant-id-fehler-beim-l | missing |
| quick_task | 260707-16l-fansub-cockpit-header-badge-zeigt-gruen- | missing |
| quick_task | 260707-ehc-profil-letzte-projekte-auch-aus-anime-co | missing |
| quick_task | 260707-f3t-profil-letzte-projekte-fortschrittsbalke | missing |
| quick_task | 260707-g70-meine-projekte-detailseite-banner-backgr | missing |
| quick_task | 260707-hx0-meine-projekt-detailseite-als-to-do-work | missing |
| quick_task | 260707-jya-meine-projekte-seite-umbauen-projektlist | missing |
| quick_task | 260707-kut-hinweis-senden-fuer-app-mitglieder-propo | missing |
| quick_task | 260713-history-timeline-pair-alignment | missing |
| quick_task | 260717-d7i-public-fansub-projektseite-mobile-redesi | missing |
| quick_task | 260717-erh-public-fansub-projektseite-mobile-redesi | missing |
| quick_task | 260717-lqt-desktop-maximalbreite-von-fansub-projekt | missing |
| quick_task | 260718-2w4-fansub-projektseite-releases-liste-fixen | missing |
| quick_task | 260718-e6z-anime-detailseite-request-fanout-reduzie | missing |
| quick_task | 260718-vei-responsive-releasebereich-der-ffentliche | missing |
| quick_task | 260721-dbz-fund-1-2-n-1-fix-release-version-media-h | missing |
| quick_task | 260721-eo4-ssr-fetch-parallelisierung-projectpageda | missing |
| quick_task | 260730-jre-fokussiertes-material-3-inspiriertes-kar | missing |
| quick_task | 260731-wh7-beitrags-badges-im-ffentlichen-memberpro | missing |
| quick_task | 260802-c5f-rollen-auszeichnungen-aus-dem-gesamtfort | missing |
| quick_task | 260803-be5-rollenbadges-visuell-vereinheitlichen-ka | missing |
| quick_task | 260803-jo0-ffentliche-member-profilseite-gruppenzug | missing |
| quick_task | 260803-ozq-profilseite-responsiv-optimieren-neulade | missing |
| quick_task | 260805-7lu-make-focalcarousel-arrow-and-keyboard-na | missing |
| quick_task | 260811-lck-hide-locked-achievement-art | missing |
| quick_task | 260811-obg-public-member-profile-outer-bands-transparent | missing |
| quick_task | 260811-pqe-phase-127-public-member-profile-visuelle | missing |
| quick_task | 260811-rms-phase-127-public-member-profile-widescre | missing |
| quick_task | 260811-rwd-binding-responsive-ui-standard | missing |
| quick_task | 260811-tbg-phase-127-profile-band-transparent | missing |
| quick_task | 260812-acs-count-only-achievement-summary | missing |
| quick_task | 260812-bqs-gesperrte-auszeichnungs-heroes-als-gross | missing |
| quick_task | 260812-jtp-public-member-profile-vertical-spacing-r | missing |
| quick_task | 260812-kr1-ffentliche-profilseite-gro-e-wei-e-innen | missing |
| quick_task | 260812-lql-ffentliches-memberprofil-letzte-beitr-ge | missing |
| quick_task | 260812-pmu-public-member-profile-duplicate-achievem | missing |
| quick_task | 260812-ras-remove-aggregate-achievement-summary | missing |
| quick_task | 260812-rps-public-member-profile-responsive-stabilisieren | missing |
| quick_task | 260817-7fv-implementiere-den-idp-rollen-getriebenen | missing |
| quick_task | 260819-ipu-duplikat-guard-beim-historischen-mitglie | missing |
| quick_task | 260819-lm5-phase-117-geteilte-karaoke-segmente-uebe | missing |
| quick_task | 260820-600-folgen-navigation-im-contributor-editor- | missing |
| todo | 2026-05-28-contributor-owned-media-note-edit-delete.md | pending (contributor-workspace) |
| todo | 2026-05-28-profile-hub-content-activity-redesign.md | pending (ui) |
| todo | 2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md | pending (ui) |
| todo | 2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md | pending (ui) |
| todo | 2026-06-03-member-profil-ui-und-params-bug.md | pending (ui) |

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 128 P01 | 29m | 3 tasks | 4 files |
| Phase 128 P02 | 15m | 2 tasks | 4 files |
| Phase 128 P03 | 16m | 2 tasks | 5 files |
| Phase 128 P14 | 13m | 1 task | 2 files |
| Phase 128 P04 | 14m | 2 tasks | 6 files |
| Phase 128 P05 | 16m | 2 tasks | 6 files |
| Phase 128 P06 | 16m | 2 tasks | 4 files |
| Phase 128 P07 | 9m | 2 tasks | 4 files |
| Phase 128 P08 | 12m | 2 tasks | 4 files |
| Phase 128 P09 | 20m | 2 tasks | 4 files |
| Phase 128 P10 | 15min | 2 tasks | 6 files |
| Phase 128 P11 | 13min | 2 tasks | 4 files |
| Phase 128 P12 | 14min | 2 tasks | 6 files |
| Phase 128 P13 | 15min | 2 tasks | 6 files |
| Phase 128 P15 | 24m | 2 tasks | 4 files |
| Phase 128 P17 | 9min | 1 tasks | 3 files |
| Phase 128 P18 | 6min | 1 tasks | 2 files |
| Phase 128 P16 | 22min | 2 tasks | 7 files |
| Phase 128 P19 | 13min | 2 tasks | 4 files |
| Phase 132 P01 | 25min | 2 tasks | 11 files |
| Phase 132 P02 | 19min | 3 tasks | 9 files |
| Phase 132 P03 | 8min | 2 tasks | 7 files |
| Phase 132 P04 | 11min | 3 tasks | 9 files |
| Phase 133 P02 | 4min | 2 tasks | 2 files |
| Phase 133 P03 | 5min | 2 tasks | 2 files |
| Phase 133 P04 | 20min | 2 tasks | 5 files |
| Phase 133 P05 | 35min | 2 tasks | 2 files |
| Phase 133 P06 | 15min | 2 tasks | 2 files |
| Phase 133 P07 | 35min | 2 tasks | 7 files |
| Phase 133 P08 | 25min | 2 tasks | 6 files |
| Phase 133 P09 | 75min | 2 tasks | 6 files |
| Phase 133 P10 | 20min | 2 tasks | 3 files |
| Phase 133 P11 | ~50min | 2 tasks | 3 files |
| Phase 133 P12 | n/a | 2 tasks DEFERRED | 0 files |
| Phase 134 P01 | 35min | 2 tasks | 5 files |
| Phase 134 P02 | 30min | 2 tasks | 3 files |
| Phase 134 P03 | 20min | 3 tasks | 5 files |
| Phase 134 P04 | 20min | 3 tasks | 4 files |
| Phase 134 P05 | ~25min | 3 tasks | 4 files |
| Phase 134 P06 | multi-session | 3 tasks | 8 source files + 14 evidence files |
| Phase 135 P01 | 4min | 2 tasks | 3 files |
| Phase 135 P02 | 12min | 2 tasks | 3 files |
| Phase 135 P03 | 25min | 2 tasks | 3 files |
| Phase 135 P04 | 18min | 2 tasks | 4 files |
| Phase 135 P05 | ~25min | 2 tasks | 5 files |
| Phase 135 P06 | ~10min | 2 tasks | 2 files |
| Phase 135 P08 | ~50min | 3 tasks | 4 files |
| Phase 135 P07 | multi-session | 3 tasks | 1 files |
| Phase 135 P10 | ~2h45m | 5 tasks | 13 files |
| Phase 136 P30 | 14min | 3 tasks | 12 files |
| Phase 136 P31 | 22 min | 1 tasks | 2 files |
| Phase 136 P28 | 3h39m | 1 tasks | 3 files |
| Phase 137 P01 | 25min | 2 tasks | 3 files |
| Phase 137 P02 | ~15min | 1 tasks | 5 files |
| Phase 137 P03 | ~30min | 2 tasks | 3 files |
| Phase 137 P04 | ~35min | 3 tasks | 3 files |
| Phase 137 P05 | ~25min | 2 tasks | 7 files |
| Phase 137 P06 | ~35min | 2 tasks | 7 files |

## Session Continuity

Last session: 2026-08-21T19:04:32.076Z
Stopped at: Completed 137-06-PLAN.md
Last activity: 2026-08-20 - Completed Phase 134 Plan 06: live UAT evidence capture, two gap-closure fix rounds, and the user's explicit live-browser sign-off for both reference profiles (PMQA-05)
Resume file: None
