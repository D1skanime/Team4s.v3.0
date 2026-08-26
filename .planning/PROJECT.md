# Team4s

## What This Is

Team4s is an anime and fansub history platform with a Go backend, Next.js frontend, and public, member, leader, and admin surfaces. It combines release-native project data, public member identities, contributions, historical memberships, media ownership, and moderated community workflows.

## Core Value

Team4s presents fansub history and collaboration credibly while keeping identity, visibility, ownership, and permissions correct.

## Requirements

### Validated

- [x] Admin can start anime creation through the shipped v1 intake flow and work from a shared draft surface before persistence - v1.0
- [x] Manual create remains explicit-save-only and can succeed with `title + cover` - v1.0
- [x] Jellyfin-assisted create remains preview-only until explicit save or discard - v1.0
- [x] Jellyfin candidates expose enough evidence to pick the correct source and hydrate an editable draft - v1.0
- [x] Existing anime can be edited through the same ownership-aware surface used by intake - v1.0
- [x] Linked Jellyfin provenance, fill-only resync, and per-slot asset maintenance are available on the edit route - v1.0
- [x] Manual values and manual replacement assets remain authoritative over Jellyfin refresh behavior - v1.0
- [x] Relation CRUD is available in the admin edit route with the four approved V1 labels - v1.0
- [x] Admin actions remain attributable to the acting user and operator-facing failures are surfaced clearly - v1.0
- [x] Production workflow code touched by the milestone remains modularized rather than collapsing into oversized files - v1.0
- [x] Phase 72 provides the v1.2 backend/contract foundation for status axes, domain projections, and media ownership read DTOs - validated 2026-06-05
- [x] Phase 106 provides the auditierbare, idempotente Gamification-Grundlage mit stabilem Member-Bezug, versioniertem Punktekatalog und append-only Punktebuch - validated 2026-07-22
- [x] Verify the complete public experience with reproducible `sheppert` and `csubs-leader` test profiles - Phase 134, validated 2026-08-20
- [x] Make each user's effective capabilities transparent, including which roles or overrides grant or deny them. - Phase 138, validated 2026-08-23
- [x] Let authorized admins apply targeted per-user capability allow/deny overrides without changing unrelated users or broad role assignments. - Phase 138, validated 2026-08-23
- [x] Turn the existing user-detail rights view into the canonical guided surface for inspecting and safely revoking effective capabilities. - Phase 138, validated 2026-08-23
- [x] Make user-detail contribution, media, and rights data compact and actionable by grouping related release-version rows and showing real deviations. - Phase 139, validated 2026-08-24
- [x] Expose the existing per-member review-delegation model through documented APIs and the established group-member editor. - Phase 140, validated 2026-08-26
- [x] Show reviewers only queue entries they can actually decide, while keeping self-submissions clearly separated from actionable work. - Phase 141, validated 2026-08-26

### Active

_(none — v1.4's remaining phases are not yet planned/executed)_

### Out Of Scope

- Replacing the existing member, contribution, badge, membership, or media ownership models with parallel structures
- Redesigning unrelated admin, fansub, anime, or release pages
- Adding production-data backfills, compatibility layers, or preservation logic for disposable test rows
- Changing the canonical release-native fansub domain or attaching media to a different owner seam
- Creating a second badge engine or recalculating canonical badge state ad hoc in the browser
- Replacing the central browser authentication and API client boundary
- Treating public profile hardening as a general platform rewrite
- Platform-wide document and initiative library (Finding #33) — deferred to a dedicated later milestone because it is a separate platform-level product track
- Unified badge-progress UI (Finding #34) — deferred until representative badge data is available for all affected progress families

## Context

## Current State

v1.0 shipped on 2026-04-01 with 6 completed phases and 23 completed plans. The shipped surface now covers:

- shared create/edit editor shell for anime admin flows
- manual create with explicit draft readiness and existing cover upload
- Jellyfin-assisted preview-only intake with candidate review, title seeding, and explicit save-only linkage
- persisted Jellyfin provenance, fill-only resync, and ownership-aware asset handling on edit
- anime v2 runtime stabilization for create/edit/read behavior
- relation CRUD with the narrow V1 taxonomy and operator-safe validation

Subsequent work expanded Team4s through public fansub/member experiences, contributions, scoped permissions, release-native media, gamification, and achievement presentation. The active planning metadata drifted across those cycles and was preserved in a pre-v1.3 recovery archive rather than being mislabeled as one completed milestone.

Phase 54 completed on 2026-05-28: the global AppShell now provides the release-independent nav drawer through the root layout, with `/me/profile` no longer nesting its own shell.

Phase 72 completed on 2026-06-05: migration 0097, GET-only domain/media ownership projections, OpenAPI schemas, TypeScript DTOs, and central `api.ts` helpers now provide the status/projection foundation for Phases 73-80.

Phase 106 completed on 2026-07-22: migration 0131, exakte versionierte Punktregeln, ein append-only/idempotentes Member-Punktebuch sowie transaktionsgebundene Repository- und Service-Pfade bilden das verifizierte Gamification-Fundament.

Phase 107 completed on 2026-07-23: typisierte Review-Delegationen, atomare First-Decision-Wins-Entscheidungen, unveränderliches Audit mit separat bereinigbaren Begründungen, Self-Review-Schutz und quellenweit begrenzte Review-Credits bilden das verifizierte domänenneutrale Prüffundament. Konkrete Release-Texte, Release-Version-Medien und die Prüfoberfläche folgen in Phase 107.1.

Phase 110 completed on 2026-07-28: die read-seitige Gamification-Oberfläche steht — öffentliche Ranglisten-Seite (`/members/ranking`) über die Phase-109-Projektion (kein Pro-Zeile-API-Fächer), eine prominente Gesamtpunktzahl im Profil-Hero, 8 live-berechnete Rollen-Einstiegs-Badges (Projektion aus `release_role_credit_lifecycles`, nie in `member_badges` persistiert) und eine erweiterbare, kategorie-gruppierte „Auszeichnungen"-Sektion (D-04, Phase-112-vorbereitet). Automatisiert verifiziert; Live-Docker-UAT und die Postgres-Lifecycle-Tests bleiben als Human-UAT offen.

Phase 112 completed on 2026-07-28: zwei weitere rein abgeleitete Badge-Familien hängen in der „Auszeichnungen"-Sektion — Typ 2 (Punkt-Meilensteine 1/50/200/500/1000/2500, nur höchster Rang) und Typ 3 (Rollen-Volumen Bronze/Silber/Gold/Platin bei 12/108/320/510 Netto-Credits pro Rolle, neben dem Typ-1-Einstieg in der „Rollen"-Gruppe). Live-Projektion mit Rückstufung bei Storno, kein neuer Buchungspfad; Backend-Zählung dynamisch über `release_role_credit_lifecycles`, Ableitung/Resolver in `memberBadgeLabels.ts`, SSR-Verdrahtung in `members/[slug]/page.tsx`. 9/9 Verifikations-Must-haves, 29/29 Frontend-Tests grün. Offen: optionaler Live-UAT der Gold/Platin-Sichtbarkeit sowie ein Code-Review-Critical (Typ-1-Rollen-Katalog hardcodet nur 8 statt 12 gültiger `anime_contribution`-Rollen).

Phase 134 completed on 2026-08-20: the v1.3 milestone's closing fixture-backed verification and rollout gate. A versioned, idempotent `sheppert`/`csubs-leader` reset/seed contract, migration fresh/up/down proof, a 9-case Postgres-backed verification matrix, a real exit-code-checked automated green gate (`scripts/phase134-green-gate.sh`), protected-asset hash guarding, and live browser UAT (mobile/intermediate/widescreen, both profiles, 400% zoom, keyboard focus) with explicit user sign-off all passed. 7/7 verification must-haves, `GATE: GREEN (0)`.

Phase 137 completed on 2026-08-21: `ResolveGroupRights`, the central provenance-capable effective-rights resolver (migration 0150, `backend/internal/permissions/effective_rights.go`), now backs every group-scoped runtime `Can*` entry point and a new transactional `EffectiveRightsService` for idempotent, audited per-user allow/deny/remove overrides, exposed at a group-scoped inspection/mutation/history HTTP boundary with BOLA/IDOR coverage. This is the backend/API foundation only — no admin UI ships yet, so the Active requirements below (effective-capability transparency, guided per-user override UX) remain open pending Phase 138. 5/5 verification must-haves, 0 critical code-review findings.

Phase 138 completed on 2026-08-23: the user-detail group-rights tab is now the canonical, resolver-backed surface for inspecting and changing effective group rights (UADM-01) — provenance-complete, category-grouped, and the sole host for guided grant/revoke flows. A guided revoke flow lists every granting source and recommends a scoped deny before broader changes (CAP-08). Role-capability matrix changes are always preceded by a real batch impact preview across every actual role holder (CAP-09). Role-matrix and per-user override mutations render an honest, non-fabricated activation-status vocabulary distinguishing persisted/cache-active/pending/failed (CAP-10). New central `/admin/claims`, `/admin/changes`, and `/admin/roles` workspaces plus a persistent admin nav round out the IA. 4/4 verification must-haves; 1 critical + 4 warning code-review findings found and fixed. One item awaits live human click-through (dormant deny-override removal on a non-deniable actor — `138-HUMAN-UAT.md`).

Phase 139 completed on 2026-08-24: user-detail Contributions and Media are now server-side grouped, filtered, and paginated projections instead of unbounded flat fetches — Contributions group by Anime+Project with an always-visible project standard and semantically-diffed (not `snapshot_mode`-trusted) override detection over collapsed episode ranges (UADM-02/03/04); Media groups by Release/Episode with real `PublicURL`/`FileSizeBytes` derivation, replacing the previously broken empty values and a fake "Berechtigung aktiv/fehlt" signal (UADM-05). A new batched rights-summary endpoint closes the Overview tab's per-group fan-out, and the Rights tab now fetches lazily on selection instead of eagerly for every membership (UADM-06). Both new tabs carry informational/actionable posture banners (UADM-07) and container-query responsive layouts (UADM-08). QUAL-06's constant-query-budget and pagination-drift gates are proven for all three endpoints; a live seed script produced real independent-and-different override data for UAT. 8/8 verification must-haves; 1 critical + 4 warning code-review findings (a silently no-op "Von"/"Bis" date filter caused by a `DatePicker`-vs-backend RFC3339 format mismatch, plus a DB-error-masking bug) found and fixed before close. Live human UAT of all six checkpoint items passed, with one documented residual scope note (single-group test account could not visually distinguish lazy-fetch from eager-fetch-of-one-group — proven instead by the automated regression suite).

Phase 141 completed on 2026-08-26: the release-review queue is now actor-decidable end to end (RDEL-05, RQUE-01–06). The real N+1 in `authorizedKinds` is closed by resolving group rights exactly once per handler call (`permissions.Service.ResolveReviewGroupAuthorization`); List/Counts now exclude an actor's own submissions via the same two-signal identity check `review_service.go` already uses at decision time, sort newest-first (D15), and carry a real `allowed_types` signal instead of a fake zero "Mitwirkungen" badge; Detail/Next share one existence-then-authorize lookup returning a genuine 403 (not 404, not a silent 200) for an own-or-forbidden review. A new "Wartet auf Fremdprüfung" Tabs lane (`view=own`, capability-bypassed, read-only) gives an actor's own pending submissions a real home, and the review-detail page's "Next" control is now honest in all three states (available/exhausted/error) instead of silently disappearing. 12/12 verification must-haves passed; code review found 0 critical, 5 warning, 1 info findings (filter-context loss on Next, a silently-swallowed post-decision fetch error, a misleading 403 for platform-admin override edge case, a frontend own-submission check missing the member-claim signal, and independent URL-sync clobbering between the two Tabs lanes) — tracked for a future hardening pass, not blocking.

## Current Milestone: v1.4 Capability-, Review- und Benutzerverwaltung

**Goal:** Make permissions understandable and safely controllable per user, complete the existing review-delegation seam, and reduce admin/review views to relevant, actionable work.

**Target features:**
- effective-rights inspector in the existing user-detail rights view, including role/override provenance
- targeted per-user capability allow/deny overrides with deny precedence and a guided revocation flow
- impact previews, explicit platform-admin bypass explanation, and robust capability-cache feedback
- grouped, filterable, paginated user-detail contribution/media/rights views that distinguish real overrides from inherited defaults
- documented grant/revoke endpoints and group-member-editor controls for existing per-member review delegations
- server-side review-queue filtering to entries the current reviewer can actually decide, with self-submissions separated
- focused automated and live UAT for Findings #29-#32

## Constraints

- **Brownfield:** Extend the existing public member route, API, projections, and global UI components instead of creating parallel seams
- **Privacy:** Resolve public visibility and viewer access before loading or returning protected profile detail
- **Contracts:** Keep database projections, backend DTOs, OpenAPI, frontend types, and `api.ts` helpers synchronized
- **Domain ownership:** Preserve canonical member, contribution, membership, badge, release, and media ownership boundaries
- **Test data:** Existing rows are disposable; reset and reseed instead of adding data compatibility or backfill code
- **Experience:** Design mobile-first while keeping compact, deliberate widescreen layouts
- **Modularity:** Production code files should stay at or below the 450-line project limit
- **Scope:** Avoid unrelated redesigns and preserve established Team4s visual/component patterns

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep one shared editor surface across create and edit | Avoid diverging admin workflows as intake features grow | ✓ Good |
| Keep Jellyfin intake preview-only until explicit save | Preserve operator control and avoid hidden persistence | ✓ Good |
| Require only `title + cover` for initial manual create | Keep intake usable even when metadata is incomplete | ✓ Good |
| Treat Jellyfin-derived type as advisory only | Suggestions should guide, not silently decide | ✓ Good |
| Keep manual values and manual replacement assets authoritative over resync | Protect curated data from later provider refreshes | ✓ Good |
| Limit relation editing to the four approved V1 labels | Keep the first relation surface understandable and auditable | ✓ Good |
| Split workflow code before it exceeds the file-size ceiling | Preserve maintainability while the admin surface grows | ✓ Good |
| Keep the next milestone focused on generic upload/provisioning rather than reopening settled intake behavior | The broadest remaining risk is media lifecycle semantics, not core intake correctness | Pending |
| Make asset lifecycle behavior generic before adding more upload surfaces | Prevents banner/logo/background/video work from becoming a pile of slot-specific exceptions | Pending |
| Preserve the drifted pre-v1.3 planning tree as a recovery archive | Historical phases span multiple cycles and must not be falsely marked as one completed milestone | Good |
| Use v1.3 for Public Member Profile Hardening | v1.2 was already used by the Phases 72-80 public experience cycle | Good |
| Treat `sheppert` and `csubs-leader` as reproducible UAT fixtures | Both expose different data volume, role, badge, membership, and layout cases | Pending |
| Reset and reseed disposable test data when schema truth changes | Compatibility code for synthetic rows would add complexity without product value | Pending |
| Keep public profile projections minimal and visibility-aware | Public reads must not expose or compute private and unused detail | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Move invalidated requirements to Out of Scope with a reason.
2. Move validated requirements to Validated with a phase reference.
3. Add newly discovered requirements to Active.
4. Record durable decisions and update current-state context.

**After each milestone:**
1. Review all sections against the shipped product.
2. Confirm that Core Value is still the right priority.
3. Reassess Out of Scope reasons.
4. Update Context with the current system state.

---
*Last updated: 2026-08-26 for milestone v1.4 Capability-, Review- und Benutzerverwaltung*
