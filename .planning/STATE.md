---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: milestone
status: executing
stopped_at: Phase 130 executed (130-01/02/03/04/07 committed; 130-05/06 verify-only, removal already complete in 129); automated contract gate green; live UAT deferred to Phase 134 bundle; Phases 131-134 contexts gathered
last_updated: "2026-08-14T00:00:00.000Z"
last_activity: 2026-08-14
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 22
  completed_plans: 22
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-13)

**Core value:** Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.
**Current focus:** Phase 128 - Canonical Public Identity & Visibility Foundation

## Current Position

Phase: 128 of 134 (Canonical Public Identity & Visibility Foundation)
Plan: 22 of 22
Status: Phase 128 COMPLETE - all 22 plans + live UAT passed (2 regressions found and fixed)
Last activity: 2026-08-14

## Accumulated Context

### Decisions

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

### Pending Todos

- Ten existing pending todo files remain unchanged because none maps completely and unambiguously to exactly one v1.3 phase.
- The public-member params/UI todo spans contract and visual work and must be reconsidered during Phase 130 and Phase 133 planning rather than tagged misleadingly to one phase.

### Blockers/Concerns

- No blocker prevents discussion or planning of Phase 128.
- Existing staged/unstaged frontend work and untracked recovery evidence belong to the user and must remain untouched.
- Health warnings for repository-local `DECISIONS.md` and `RETROSPECTIVE.md` conflict with local Team4s documentation policy and are not deletion candidates.
- Before any migration, inspect the current migration chain and stop if multiple untracked migrations exist.

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

## Session Continuity

Last session: 2026-08-13T18:16:38.004Z
Stopped at: Completed 128-19-PLAN.md
Last activity: 2026-08-13 - Completed Phase 128 Plan 19
Resume file: None
