# Phase 130: Public DTO & Cross-Layer Contract Alignment - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 130 gives every public member consumer ONE minimal, explicitly typed response
whose Go runtime DTO, OpenAPI schema, TypeScript types, and central api.ts helper all
agree. It carves a dedicated public allow-list DTO out of the internal/edit structs it
currently shares, formalizes the visible/hidden/missing/error response paths, completes
and single-sources the public enums, removes the superseded Recent* fields/endpoints,
and locks the contract with forbidden-field + schema-parity tests.

This phase does NOT: bound payloads, add pagination or performance budgets (Phase 131);
consolidate shared SSR composition or race-safe frontend state (Phase 132); do
responsive/accessible/image-budget visual work (Phase 133); or run the final clean-state
reproduction and bundled live UAT (Phase 134). It does NOT re-derive the Phase-129 data
projections - it re-shapes and re-types their OUTPUT into a clean public contract.

</domain>

<decisions>
## Implementation Decisions

### DTO shape & field allow-list (PMCT-01, PMCT-02, PMCT-07)
- **D-01 (Dedicated public structs, decoupled from edit structs):** The public profile gets
  its OWN minimal allow-list structs, decoupled from the internal/edit structs it shares
  today. Concretely, the public membership is a dedicated shape (e.g. PublicMemberMembership)
  carrying ONLY allow-listed fields (fansub group id/name/slug/logo, public roles, joined/left
  year, current-vs-historical flag) and DROPS the internal app_member_status, app_member_roles,
  and historical_member_status fields that leak in today via the shared MemberProfileMembership.
  The internal edit surface (MemberProfile) keeps its rich struct unchanged. The same allow-list
  discipline applies to public media sub-shapes: no source_original_url, storage_path, or
  internal ids in public media.
- **D-02 (Finish Recent* removal - mostly landed in 129):** Phase 129 ALREADY removed
  recent_media/recent_contributions from the PUBLIC Go DTO (PublicMemberProfile) and the PUBLIC
  TS type (PublicMemberProfileData) and dropped the dead member-contributions endpoint (commits
  129-06 "drop dead recent projections from public profile DTO" / 129-07 "remove dead
  member-contributions endpoint and components"). Phase 130 FINISHES the job: (a) verify the
  removal has OpenAPI parity (no recent_* left in the PublicMember* schemas), (b) remove the
  now-orphaned MemberProfileRecentMedia / MemberProfileRecentContribution model+TS types if no
  surface still uses them, and (c) sweep any remaining unused recent fields/endpoints (PMCT-07).
  NOTE: the internal edit-surface MemberProfile / MemberProfileData still carry recent_* - that
  is the internal surface, not the public contract; touch it only if it is genuinely dead.

### Typed outcome paths (PMCT-04)
- **D-03 (HTTP-status-driven contract, no body discriminator):** The four outcomes are carried
  by HTTP status, NOT by a body state field:
  - visible -> 200 with { data, viewer }
  - hidden AND missing -> IDENTICAL neutral 404 { error: { message } }
    (the two MUST stay byte-identical to preserve the Phase-128 non-distinguishability lock)
  - failure -> 500 { error: { message } }
  No discriminated state field is introduced; it would risk making hidden distinguishable from
  missing and is a larger cross-layer rebuild.
- **D-04 (One standardized error envelope):** Both 404 and 500 already emit
  { error: { message: string } } (writePublicMemberUnavailable / writeInternalErrorResponse).
  This ONE envelope shape is documented once in OpenAPI and typed once in TS, and every layer
  (handler, OpenAPI, profile.ts, api.ts, page.tsx) parses these three status branches
  identically.

### Enum completeness & canonical source (PMCT-05)
- **D-05 (OpenAPI is the canonical enum source):** shared/contracts/openapi.yaml is the single
  source of truth for every CLOSED public enum; Go constants and TS unions are mirrored FROM
  it, per the contract-first workflow in docs/api/api-contracts.md.
- **D-06 (Complete the enums, incl. platinum):** Close the known gap - next_tier MUST include
  platinum (today it is only bronze|silver|gold in TS/OpenAPI while current_tier already carries
  platinum). Verify and complete current_tier/next_tier, profile_status
  (active|historical|memorial), latest-contribution type (text|media), and contribution_status
  consistently across all three layers.
- **D-07 (Roles stay open strings):** Role codes remain open string[], NOT a closed enum - the
  role-model / capability-registry rework stays PAUSED (milestone decision; 129-D-04). Role
  LABEL authority remains server-side via role_definitions.label_de (129-D-06); this decision
  covers enums only.

### Contract-test enforcement (PMCT-02 / PMCT-03 assurance)
- **D-08 (Forbidden-field asserts + OpenAPI schema validation):** A Go handler-level contract
  test serializes a real public response and (a) asserts BY NAME that forbidden fields are
  ABSENT (negative list: email, keycloak_subject, app_user_id, legacy_user_id,
  app_member_status, app_member_roles, historical_member_status, source_original_url,
  storage_path, and any internal status/capabilities fields), and (b) validates the response
  against the OpenAPI PublicMemberProfileData schema. This proves absence (PMCT-02) AND
  cross-layer parity (PMCT-03) automatically, and names the leaking field on failure. The
  negative list lives with the handler contract test.

### Claude's Discretion
- Exact Go struct names, file-split boundaries, and mapping-function placement, provided the
  public structs are decoupled from the edit structs and every production file stays <=450
  lines (CLAUDE.md limit).
- Exact OpenAPI schema names and where the shared error-envelope schema is defined, provided
  Go/OpenAPI/TS stay in full parity.
- Test file organization and the concrete OpenAPI-schema-validation helper, provided both the
  forbidden-field negative list and schema validation run in CI.
- The precise final allow-list of public membership/media fields, provided no internal,
  permission, storage, or source-original field is exposed (verified by D-08).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope, requirements, and prior decisions
- .planning/PROJECT.md - v1.3 goal, brownfield/privacy/test-data constraints, out-of-scope boundaries.
- .planning/ROADMAP.md - Phase 130 goal, deliverables, success criteria, downstream phase separation.
- .planning/REQUIREMENTS.md - locked Phase 130 requirements PMCT-01..05, PMCT-07, PMCT-08.
- .planning/DECISIONS.md - v1.3 verification-strategy entry (2026-08-14).
- .planning/phases/128-canonical-public-identity-visibility-foundation/128-CONTEXT.md - identity/visibility + non-distinguishability lock (do not re-litigate).
- .planning/phases/129-canonical-public-projections-data-correctness/129-CONTEXT.md - the data projections whose OUTPUT this phase re-types; 129-D-11 (Recent* removal delegated here), 129-D-06 (server role-label authority).

### Contract & engineering rules
- docs/api/api-contracts.md - cross-layer contract-first workflow (OpenAPI as source; the master rule behind D-05).
- docs/engineering/implementation-contract.md - reuse-first; no parallel projections.
- docs/architecture/db-schema-fansub-domain.md - canonical member/fansub/release ownership rules.

### The four contract layers (Plan-time read first, from ROADMAP)
- backend/internal/models/member_profile.go - PublicMemberProfile DTO + shared MemberProfileMembership (the struct to fork per D-01).
- backend/internal/handlers/app_public_profile.go - public profile/projects handlers; envelope + status branches (D-03/D-04).
- backend/internal/handlers/public_member_access.go - writePublicMemberUnavailable (neutral 404) + access resolution.
- backend/internal/handlers/contributions_public_handler.go - public contributions handler.
- shared/contracts/openapi.yaml - PublicMemberProfileEnvelope/Data/Badge/BadgeProgress/CurrentProject/... schemas (canonical enum source per D-05).
- frontend/src/types/profile.ts - PublicMemberProfileData + enum unions (next_tier platinum gap per D-06).
- frontend/src/lib/api.ts - getMemberProfile / PublicMemberProfileResponse helper.
- frontend/src/app/members/[slug]/page.tsx - Next.js route, generateMetadata, PageProps (async params), error/notFound branches (PMCT-08).
- Existing handler/helper/page contract tests, incl. backend/internal/handlers/public_member_access_matrix_test.go.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The public DTO already exists (PublicMemberProfile + PublicMember* sub-structs) and is
  largely correct post-129 (latest_contributions, current_projects, previous_contributions,
  public_badges, badge_progress, total_points) - this phase RE-SHAPES/RE-TYPES, not rebuilds.
- The standardized error envelope { error: { message } } already exists on both the 404 and
  500 paths (writePublicMemberUnavailable, writeInternalErrorResponse) - D-04 documents and
  types the existing shape rather than inventing one.
- PublicMemberProfile.MarshalJSON already normalizes a nil slice to [] - the same guard pattern
  can cover other must-be-present arrays.

### Established Patterns
- Cross-surface changes stay synchronized across Go, shared/contracts/openapi.yaml,
  frontend/src/types/*, and frontend/src/lib/api.ts (contract-first; OpenAPI as source).
- PostgreSQL-backed handler/contract tests with a dedicated test DSN (Phase-128 pattern).
- Next.js 16 App Router async params: Promise<{ slug }> already handled in page.tsx.

### Integration Points / Known Gaps to Fix
- MemberProfileMembership is SHARED by the internal MemberProfile (edit) and the public
  PublicMemberProfile; its app_member_status / app_member_roles / historical_member_status
  fields leak into the public contract -> fork per D-01.
- recent_media / recent_contributions were REMOVED from the PUBLIC DTO by Phase 129 (129-06/07);
  Phase 130 verifies OpenAPI parity + removes orphaned types per D-02. They remain only on the
  INTERNAL MemberProfile / MemberProfileData edit surface.
- next_tier union is bronze|silver|gold (no platinum) while current_tier has platinum -> close
  per D-06.
- Enum definitions are duplicated three times (Go/OpenAPI/TS) with no declared master -> D-05.

</code_context>

<specifics>
## Specific Ideas

- Post-129 state: recent_media / recent_contributions have ALREADY been removed from the public
  Go DTO and public TS type by Phase 129 (129-06/07); they remain only on the INTERNAL
  MemberProfile / MemberProfileData edit surface. The remaining PUBLIC leak is the shared
  MemberProfileMembership (app_member_status / app_member_roles / historical_member_status) still
  embedded by PublicMemberProfile (D-01).
- Concrete enum gap: frontend/src/types/profile.ts PublicMemberBadge.next_tier omits platinum.
- The 404 body for hidden AND missing is literally { error: { message: "Profil nicht
  verfuegbar" } } via writePublicMemberUnavailable - both branches MUST remain byte-identical
  (128 lock).

</specifics>

<deferred>
## Deferred Ideas

- Bounded payloads, constant query budget, projection-specific page loaders, and honest
  pagination remain Phase 131 (PMCT-06 is a Phase-131 requirement, not 130).
- Shared SSR composition and race-safe frontend state remain Phase 132.
- Responsive/accessible/image-budget visual delivery (incl. memorial and partial-date visual
  formatting) remain Phase 133.
- The role-model / capability-registry rework (data-driven is_public roles) stays PAUSED and
  out of scope - roles remain open strings here (D-07).
- Full clean-state reproduction of both reference profiles and the bundled cross-phase live UAT
  remain Phase 134.

</deferred>

---

*Phase: 130-public-dto-cross-layer-contract-alignment*
*Context gathered: 2026-08-14*
