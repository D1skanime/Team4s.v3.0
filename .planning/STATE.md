---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: milestone
status: executing
stopped_at: "Completed Phase 135 (Plan 10: case-preserved Fansubname D-15 + self-claim approval UX D-16 -- phase complete, all 10 plans done)"
last_updated: "2026-08-19T12:58:32.011Z"
last_activity: 2026-08-19
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 80
  completed_plans: 53
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-13)

**Core value:** Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.
**Current focus:** Phase 135 — einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl

## Current Position

Phase: 135 (einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl) — COMPLETE
Plan: 10 of 10 complete
Status: Phase complete, ready to plan next phase
Last activity: 2026-08-19

## Accumulated Context

### Roadmap Evolution

- Phase 135 added (2026-08-17): Einladungs- und Onboarding-Flow fuer eingeladene Fansub-Mitglieder haerten. Scope = Live-UAT-Findings #6-#10 (.planning/notes/live-uat-ux-findings.md). Additiv an v1.3 angehaengt; Requirements TBD (kein REQUIREMENTS.md-Mapping -- Decision-Coverage-Gate beim Planen beachten).

### Decisions

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
- [Phase 135]: Plan 135-01 executed (D-01, D-04) -- keycloakAuth.ts gained a validated one-shot consumeStoredReturnPath() (mirrors registrationCompletion.ts's marker pattern) plus BeginKeycloakLoginOptions.loginHint/.returnPath; login/page.tsx's completeCallback() destination priority is now persistedReturnPath ?? (registration-completion default) ?? next-param. This is the shared foundation Plans 135-05/06 must persist a returnPath through via beginKeycloakLogin({ returnPath }) rather than inventing a second mechanism. 12/12 login/page.test.tsx cases pass; tsc --noEmit clean for both touched files (pre-existing unrelated Next.js route-type errors elsewhere ignored).
- [Phase 135]: Plan 135-02 executed (D-06) -- ListFansubGroupRoleDefinitions's SQL predicate simplified to WHERE assignable = true only, closing Finding #7 / Pitfall 2 (admin/other anime_contribution roles leaking into the group-role picker). New testsupport.OpenPhase135Postgres harness (SKIP-not-FAIL convention) plus TestListFansubGroupRoleDefinitionsAssignableOnly prove the exact 6-code assignable set against a real 0085/0100/0103/0112 migration chain. — Closes the one-line SQL defect identified in 135-RESEARCH.md Pitfall 2 with a live-DB regression proof rather than source inspection alone.
- [Phase 135]: Plan 135-03 executed (D-03, D-01, D-08) -- CreateFansubGroupInvitation's mail now names the real fansub group (via a new fansubGroupNameStore threading of FansubRepository.GetGroupByID, fail-open to a generic phrase) and the inviting admin (identity.DisplayName), replacing the old blind "Du wurdest zu einer Fansub-Gruppe eingeladen" text with the phase's locked Content-Spec Addendum copy. The mail CTA link now carries &email=<url-escaped invitee email> for D-08's mediated Keycloak login_hint prefill fallback (server-side match enforcement in Accept() unchanged). Two new tests prove the enriched context and the nil-fansubRepo fallback; go build/vet/test all clean.
- [Phase 135]: Plan 135-04 executed (D-05, D-07) -- HistoricalMemberCard now destructures the 8 already-declared claim-invite props (generatedInvites, memberInvitations, copyStates, canCreateClaimInvitation, onGenerateInvitation, onCancelInvitation, onCopyLink, normalizeInviteLink) and renders the generate/copy/cancel block gated on canCreateClaimInvitation && !member.app_username, using the hist-claim-invite-link- id prefix required by useGroupMembersClaimActions.ts's markVisibleInviteLink DOM fallback (not ClaimManagementPanel's claim-invite-link- prefix). ClaimManagementPanel.tsx is documented in-code as an intentionally unmounted future-admin-view reference rather than deleted, resolving 135-RESEARCH.md Open Question 2. 4/4 new component tests pass; tsc --noEmit clean for both touched files. — Closes the "generate + display" gap for the claim flow that unlocks historical members -- pure JSX wiring against an existing, tested, audit-logged backend/hook; no backend change and no new authorization surface.
- [Phase 135]: Plan 135-05 executed (D-01, D-04, D-07, D-08, D-09) -- new frontend/src/components/auth/InviteAcceptFlow.tsx is the one shared dual Anmelden/Registrieren + returnPath + auto-accept + friendly-error onboarding component (Button-only, zero raw <button>), and frontend/src/app/invitations/accept/page.tsx is rewritten on top of it, closing Finding #10's BLOCKER cold-invite dead end. A useRef guard fires the auto-accept effect at most once per mount; handleLogin/handleRegister persist returnPath via 135-01's beginKeycloakLogin({returnPath}) and forward loginHintEmail as login_hint. 9/9 new frontend tests pass (5+4), re-run alongside login/page.test.tsx's 12 cases with zero regressions (21/21). — DEVIATION FLAGGED: the plan file's own appended "Content-Spec Addendum" (D-11/D-12, dynamic group/inviter copy + a fourth "wrong email logged in" state + "Konto erstellen und beitreten"-style button labels) was NOT implemented; the plan's literal <tasks> section (simpler generic copy, matching 135-06-PLAN.md's already-written expectations) was followed instead. See 135-05-SUMMARY.md's "Deviations from Plan" for full rationale -- this addendum content is an open gap that needs a follow-up plan/task or an explicit CONTEXT.md rescoping before 135-07's live UAT (which requires "correct German copy... throughout").
- [Phase 135]: Plan 135-06 executed (D-09, D-07) -- claim-invitations/accept/page.tsx rewritten as a thin InviteAcceptFlow composition, closing D-09 (both invite types now share one shared onboarding flow) and Pitfall 1/5's return_to dead end for this page. No loginHintEmail prop (claim invitations are generic shareable links with no target email); afterAcceptRedirect=/me/profile preserves the page's prior immediate-redirect-on-success behavior. 3/3 new page tests pass, re-run alongside login/page.test.tsx (12), invitations/accept/page.test.tsx (4), and InviteAcceptFlow.test.tsx (5) with zero regressions (24/24 green); tsc --noEmit clean for touched files (pre-existing unrelated Next.js route-type errors elsewhere ignored). — Followed 135-06-PLAN.md's <tasks> section literally against 135-05's locked InviteAcceptFlowProps contract, per the user-confirmed scope ruling (STATE.md 2026-08-17 entry) that the Content-Spec Addendum's dynamic group/inviter/role copy stays deferred and out of scope.
- [Phase 135]: Plan 135-08 executed (D-12, D-13, D-07) -- infra/keycloak/themes/team4s/login/register.ftl is now a real theme override (previously the theme shipped zero .ftl overrides and inherited register.ftl byte-for-byte from keycloak.v2). Empirically confirmed against the live Keycloak 26.0.8 realm (curling /realms/team4s/protocol/openid-connect/registrations with login_hint set) that login_hint prefills only the "username" registration attribute, never "email" -- register.ftl reuses that prefilled username value as `invitedEmail` whenever it looks like an email address, and renders the "email" attribute with custom inlined markup carrying a real HTML `readonly` attribute (value still submitted, unlike Keycloak's own attribute.readOnly path which emits `disabled` and drops the value) plus a generic invite-context line (team4sInviteContext message key; Keycloak does not forward group/inviter/role to the registration template, matching 135-05-SUMMARY.md's prior Content-Spec Addendum scope ruling). Full live proof: registered a real test account through the locked path via curl (PKCE authorization_code flow), exchanged the code, and confirmed via /userinfo that the created account's email claim exactly matched the invited address; test account deleted via the Keycloak admin API afterward. Open (non-invite) registration verified unaffected. — This is a scope evolution of D-08 (135-CONTEXT.md's original text says "kein KC-Theme-Umbau"/no KC theme rework): D-12/D-13 were added later, during live-UAT review, specifically because D-08's mediated query-param-only approach (135-03) could prefill but not lock the email or show invite context; 135-08 layers a theme change on top of, not instead of, that mediated fallback.
- [Phase 135]: [Phase 135, 2026-08-19]: Plan 135-07 executed (D-01..D-04, D-08, D-09) -- scripts/phase135-green-gate.sh (already built/committed 7afd2774) re-run after 3 intervening commits confirmed zero new regressions; the 4 non-green steps (backend-test DB-integration fixtures, frontend-lint capture-responsive.cjs, frontend-test 12 stale files, frontend-build Next.js /_global-error Turbopack prerender) are all pre-existing and untouched by any Phase 135 file, per git-log cross-check. — Live UAT confirmed (user, 2026-08-19): registrationAllowed=true on the running Keycloak team4s realm (no drift); cold-invite round trip (mail context/Umlaute, Anmelden/Registrieren no jargon, auto-return, auto-accept) and claim-invite round trip (lands on /me/profile) both confirmed end-to-end with zero deviations. Closes Finding #10 BLOCKER.
- [Phase 135]: [Phase 135, 2026-08-19]: Plan 135-10 executed (D-15, D-16) -- case-preserved fansubName KC attribute (register.ftl hidden-username derivation + token claim + backend display-identity priority) closes D-15; Task 4's self-claim approval render pre-existed this plan (ca189d99, prior non-GSD session) and was sanity-checked, not re-implemented. Live UAT surfaced 5 deviations, all fixed same-session: 2 backend list queries preferring lowercase preferred_username over case-preserved display_name; missing success feedback + cross-list refresh on claim-verify/member-activate; 5 window.confirm() calls replaced with the app's own Modal (design-system violation); missing claim-note render; a direct-user-requested mobile-first claim-card redesign. — Phase 135 is now complete (both previously outstanding plans, 135-07 and 135-10, done; all 10 plans have summaries). D-01 through D-16 implemented and live-verified. Commits 069b2f6b/514ec1fd/88e0d62f/1403ccd0 (Finding #28: hide active members from historical list, surface active membership + verified historical roles on public profile, linked-account card redesign) landed in the same session immediately after but are explicitly out of 135-10's D-15/D-16 scope -- recorded as an adjacent follow-up, not phase-135 work.

### Pending Todos

- Ten existing pending todo files remain unchanged because none maps completely and unambiguously to exactly one v1.3 phase.
- The public-member params/UI todo spans contract and visual work and must be reconsidered during Phase 130 and Phase 133 planning rather than tagged misleadingly to one phase.

### Blockers/Concerns

- No blocker prevents discussion or planning of Phase 128.
- Existing staged/unstaged frontend work and untracked recovery evidence belong to the user and must remain untouched.
- Health warnings for repository-local `DECISIONS.md` and `RETROSPECTIVE.md` conflict with local Team4s documentation policy and are not deletion candidates.
- Before any migration, inspect the current migration chain and stop if multiple untracked migrations exist.
- Plan 134-06 Task 1 BLOCKED: /members/{slug} hangs (confirmed beyond 180s, reproduced in both dev and production builds, both sheppert and csubs-leader) at narrow viewport widths <=~760px, including the required 390x844 mobile viewport. Bisected to the member-badge-carousel container-query CSS region (Phase 133 badge-chain CSS-module split). 768x1024 and 1440x900 render fine (~200-450ms). Blocks PMQA-05's required mobile-viewport screenshot capture. Rule 4 architectural decision needed before Plan 134-06 Task 1 can complete.

### Verification Baseline

- Requirements: 65 defined, 65 uniquely mapped, 0 orphaned, 0 duplicated.
- Roadmap: seven sequential phases numbered 128-134 with five observable success criteria each.
- Recovery archive: 123 historical phase directories preserved.
- Runtime: canonical Linux Docker Compose services were running when v1.3 was initialized.
- Application validation is deferred to phase execution; milestone initialization changed planning artifacts only.

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
| Phase 135 P01 | 4min | 2 tasks | 3 files |
| Phase 135 P02 | 12min | 2 tasks | 3 files |
| Phase 135 P03 | 25min | 2 tasks | 3 files |
| Phase 135 P04 | 18min | 2 tasks | 4 files |
| Phase 135 P05 | ~25min | 2 tasks | 5 files |
| Phase 135 P06 | ~10min | 2 tasks | 2 files |
| Phase 135 P08 | ~50min | 3 tasks | 4 files |
| Phase 135 P07 | multi-session | 3 tasks | 1 files |
| Phase 135 P10 | ~2h45m | 5 tasks | 13 files |

## Session Continuity

Last session: 2026-08-19T12:58:31.996Z
Stopped at: Completed Phase 135 (Plan 10: case-preserved Fansubname D-15 + self-claim approval UX D-16 -- phase complete, all 10 plans done)
Last activity: 2026-08-17 - Completed Phase 135 Plan 08
Resume file: None
