---
phase: 65-member-vorschlaege-review-queue
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/contribution_proposals_me_handler.go
  - backend/internal/handlers/contribution_proposals_me_test.go
  - backend/internal/handlers/contribution_review_handler.go
  - backend/internal/handlers/contribution_review_handler_test.go
  - backend/internal/handlers/contributions_me_handler.go
  - backend/internal/repository/anime_contributions_proposal_repository.go
  - database/migrations/0089_anime_contributions_review_note.down.sql
  - database/migrations/0089_anime_contributions_review_note.up.sql
  - frontend/src/app/admin/my-groups/[id]/page.tsx
  - frontend/src/app/me/contributions/page.tsx
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/contributions/MyProposalsSection.tsx
  - frontend/src/components/contributions/ProposalForm.test.tsx
  - frontend/src/components/contributions/ProposalForm.tsx
  - frontend/src/components/contributions/ReviewQueue.test.tsx
  - frontend/src/components/contributions/ReviewQueue.tsx
  - frontend/src/components/ui/ui.module.css
  - frontend/src/lib/api.ts
  - frontend/src/types/contributions.ts
  - shared/contracts/contributions.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 1
  warning: 6
  info: 5
  total: 12
status: issues_found
---

# Phase 65: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Phase 65 adds the member contribution-proposal flow plus a leader/admin review queue. The
authorization design is mostly sound: the review endpoints gate every action through
`CanForFansubGroup(ActionFansubGroupMembersManage)` before touching data, ownership checks
on the member side compare `member_claims`-resolved `member_id` against the contribution's
owning member, the SQL is fully parameterized, the 90-day self-publish gate is enforced
server-side in the repository, and cross-group binding is backstopped by a composite FK
(migration 0088). The duplicate constraint and role-context validation also line up with the
seed data (migration 0085).

The most serious issue is a functional break in the anime typeahead caused by an inverted
`include_disabled` routing assumption in `searchAnimeForProposal`. Beyond that the findings are
quality and robustness concerns: a German-Umlaut violation (BLOCKER-class per CLAUDE.md
because it is a hard project rule, classified as WARNING here since it does not affect
correctness), inconsistent role-label maps, a self-publish flag that publishes to the anime
page despite "unverified historical" framing, and several smaller robustness gaps.

## Critical Issues

### CR-01: `searchAnimeForProposal` will silently return empty results due to inverted endpoint routing

**File:** `frontend/src/lib/api.ts:7016-7024` (new `searchAnimeForProposal`), interacting with `getAnimeList` at `api.ts:1294-1316`

**Issue:** `searchAnimeForProposal` calls `getAnimeList({ q: query, include_disabled: false, per_page: 10 })`.
Inside `getAnimeList`, the endpoint is chosen with `params.include_disabled === true ? "/api/v1/admin/anime" : "/api/v1/anime"`. Passing `include_disabled: false` routes the query to the **public** `/api/v1/anime` endpoint. That is the intended public catalog, but the ProposalForm typeahead is an admin/member-authenticated surface and the request is fired without the admin auth path; depending on how the public endpoint scopes/filters results (published-only, different search semantics) the typeahead can return zero or inconsistent matches for anime that members legitimately want to propose against. Worse, the request body slices results to 8 (`result.data.slice(0, 8)`) while requesting `per_page: 10`, so the pagination intent and the render cap disagree.

The functional risk: a member opens "Beitrag vorschlagen", types an anime title, and gets no/incomplete matches even though the anime exists, blocking the core P65-SC1 flow. This is the primary user-facing path of the phase.

**Fix:**
```ts
// Decide deliberately which catalog the proposal typeahead must search.
// If members may propose against disabled/unpublished anime, route to the admin list:
export async function searchAnimeForProposal(
  query: string,
): Promise<PaginatedAnimeResponse> {
  return getAnimeList(
    { q: query, per_page: 8 }, // omit include_disabled (defaults to public) OR set true intentionally
    { cache: "no-store" },
  );
}
// And align the render cap with per_page (drop the redundant .slice(0, 8) in ProposalForm,
// or set per_page: 8 here and keep the slice as a defensive guard).
```
Confirm against the product intent whether disabled anime are proposable; the current code makes that decision implicitly and inconsistently.

## Warnings

### WR-01: German Umlaut rule violated throughout new backend response/error strings

**File:** `backend/internal/repository/anime_contributions_proposal_repository.go:45,81,84,95,98,100,105,177,180,198,201,319,321,336,339` and code comments across `contribution_proposals_me_handler.go`

**Issue:** CLAUDE.md mandates correct Umlaute (ä/ö/ü/ß) in all user-facing strings and explicitly forbids ASCII substitutions (ae/oe/ue/ss). The repository wraps errors with ASCII substitutions in strings that surface to operators and, via `%w`, can reach logs/UI: `"vorschlag erstellen"`, `"selbst veroeffentlichen"`, `"90-Tage-Frist nicht abgelaufen"`, `"vorschlaege nach gruppe"`, `"bestaetigen"`. While many of these are internal error wraps (comments/identifiers are exempt), strings like `"selbst veroeffentlichen: 90-Tage-Frist nicht abgelaufen oder Eintrag nicht gefunden"` are German prose, not code identifiers, and `veroeffentlichen`/`bestaetigen` are exactly the forbidden ASCII forms. The handler-facing messages were done correctly (`veröffentlicht`, `bestätigt`), so the gap is isolated to the repository layer.

**Fix:** Replace ASCII substitutions in German prose strings: `veroeffentlichen` → `veröffentlichen`, `bestaetigen` → `bestätigen`, `vorschlaege` → `vorschläge`, `90-Tage-Frist` is acceptable (no umlaut). Leave Go identifiers and comments as-is. Per CLAUDE.md this is a hard rule; treat as release-blocking for the project even though it does not break runtime behavior.

### WR-02: Self-publish sets `is_public_on_anime_page = true`, contradicting the "unverified historical, profile-only" framing

**File:** `backend/internal/repository/anime_contributions_proposal_repository.go:325-334`

**Issue:** The UI banner (ProposalForm.tsx:194-197 and MyProposalsSection.tsx:255-257) tells the member the entry becomes an "unverifizierter historischer Beitrag" / "öffentlich sichtbar". `SelfPublish` sets **both** `is_public_on_anime_page = true` and `is_public_on_member_profile = true`, and also writes `confirmed_by = appUserID, confirmed_at = NOW()`. Setting `is_public_on_anime_page = true` means the self-published, unreviewed entry appears on the public anime page identically to a leader-confirmed contribution, with no remaining signal that it was self-published rather than reviewed (status stays `proposed`, but visibility flags are now indistinguishable from `confirmed`). Writing `confirmed_by`/`confirmed_at` for a self-publish further muddies the audit trail — it looks confirmed by the member themselves. This risks publishing unverified data to a public surface, which conflicts with the data-ownership/trust constraint in CLAUDE.md.

**Fix:** Confirm the intended visibility scope with the phase decision record (D-11/D-15). If self-publish is meant to be profile-only/unverified, set only `is_public_on_member_profile = true` and leave `is_public_on_anime_page = false`, and do **not** populate `confirmed_by`/`confirmed_at` (those imply leader review). If anime-page visibility is intended, ensure the public anime-page query distinguishes self-published (`status='proposed'`) from leader-confirmed entries so the "unverified" badge is preserved.

### WR-03: `CreateProposal` does not validate that `fansub_group_member_id` belongs to `fansub_group_id` at the handler layer

**File:** `backend/internal/handlers/contribution_proposals_me_handler.go:230-243`

**Issue:** The handler verifies that `fansub_group_member_id` resolves to the logged-in member (`MemberIDForFansubGroupMember`), but never verifies that this membership row actually belongs to the submitted `fansub_group_id`. A member who belongs to group A can submit `{fansub_group_id: B, fansub_group_member_id: <their A membership>}`. The composite FK from migration 0088 (`anime_contributions(fansub_group_id, fansub_group_member_id) → hist_fansub_group_members(fansub_group_id, id)`) catches this at the DB and returns a FK violation → `ErrNotFound` → the handler responds 404 "Gruppe, Anime oder Mitglied nicht gefunden". So data integrity is protected, but the failure is a confusing 404 rather than a 403, and the handler trusts a defense it does not own. If the composite FK were ever dropped, this becomes an IDOR.

**Fix:** Either add an explicit handler-level check (resolve the membership's `fansub_group_id` and compare to `req.FansubGroupID`, returning 403 on mismatch) or document that the composite FK is the authoritative guard and map FK violation to a clearer error. Do not rely silently on the FK for an authorization invariant.

### WR-04: `selfPublishContribution` confirmation dialog shows up but the eligibility flag is computed client-trustingly

**File:** `frontend/src/components/contributions/MyProposalsSection.tsx:251,113-124` and `backend/internal/repository/anime_contributions_proposal_repository.go:228-241`

**Issue:** The "Historisch öffentlich schalten" button only renders when `c.can_self_publish` is true, which is computed on-read in `ListByMemberIDWithProposalFields` (`status='proposed' AND created_at + 90d < NOW()`). The server-side gate in `SelfPublish` is the real enforcement (good). However, the on-read `can_self_publish` expression and the `SelfPublish` gate are duplicated SQL conditions in two places; if one is edited (e.g. the interval changes to 60 days) the other will drift, producing a button that 409s on click or, worse, a hidden button for eligible entries. This is a maintainability/correctness coupling.

**Fix:** Extract the 90-day eligibility into a single shared SQL fragment or a documented constant, and add a comment in both locations cross-referencing each other so the interval cannot silently diverge.

### WR-05: `UpdateMyAnimeContributionVisibility` and status mutations have no status guard

**File:** `backend/internal/handlers/contributions_me_handler.go:192-200,248-252`

**Issue:** `updateMyAnimeContributionStatus` and `UpdateMyAnimeContributionVisibility` run unconditional `UPDATE ... WHERE id = $N` after the ownership check, with no `status` predicate. A member can `confirm` or `reject` (set `disputed`) a contribution regardless of its current state — including flipping a leader-`confirmed` entry back to `disputed`, or re-confirming a `disputed` one. There is no state-machine guard, so a member can override a leader review decision on their own record. Whether that is intended is a product question, but combined with WR-02 (self-publish also writing `confirmed_by`) the status lifecycle is under-defended.

**Fix:** Add explicit `status`-aware predicates or a state-transition guard (e.g. only allow member confirm/reject when `status IN ('proposed','draft')`), and decide whether members may overturn a leader decision.

### WR-06: `RejectProposal` swallows malformed JSON bodies silently

**File:** `backend/internal/handlers/contribution_review_handler.go:188-190`

**Issue:** `_ = c.ShouldBindJSON(&req)` deliberately ignores binding errors so an empty body is allowed (review_note optional). But this also silently accepts a malformed/garbage JSON body and proceeds as if no note was sent, masking client bugs. Confirm vs Reject thus behave inconsistently — a malformed reject body is treated as "no note" rather than 400.

**Fix:** Distinguish "empty body" from "malformed body". For example, only ignore `io.EOF`/empty-body errors and return 400 for actual JSON syntax errors, or read the body once and branch on length before binding.

## Info

### IN-01: ContributionCard role-label map uses codes that do not exist in role_definitions

**File:** `frontend/src/components/contributions/ContributionCard.tsx:16-27`

**Issue:** `ROLE_LABELS` keys include `translation`, `editing`, `timing`, `quality_check` — but the seeded `role_definitions` (migration 0085) use `translator`, `editor`, `timer`, `quality_checker`. The mismatched keys never match real `role_codes`, so `roleLabel()` falls through to the raw code for those roles. MyProposalsSection.tsx renders raw `code` strings directly (no label map at all), so the two surfaces label the same roles differently.

**Fix:** Align the label map to the canonical seed codes (`translator`/`editor`/`timer`/`quality_checker`) and share a single role-label source between ContributionCard, MyProposalsSection, and ProposalForm to avoid drift.

### IN-02: `searchAnimeForProposal` requests `per_page: 10` but UI caps at 8

**File:** `frontend/src/components/contributions/ProposalForm.tsx:56` and `frontend/src/lib/api.ts:7016-7024`

**Issue:** The fetch requests 10 results, then `result.data.slice(0, 8)` discards two. Harmless but indicates the two values were not reconciled; pick one (see CR-01 fix).

### IN-03: Runtime `information_schema` column probe on every member-contributions list call

**File:** `backend/internal/repository/anime_contributions_proposal_repository.go:218-297`

**Issue:** `ListByMemberIDWithProposalFields` calls `hasAnimeContributionReviewNoteColumn` (an `information_schema` query) on every request to decide whether to select `review_note`. Since migration 0089 unconditionally adds the column, this defensive probe is dead weight after the migration runs and adds a round-trip per list. (Performance is out of v1 scope, flagged as quality.)

**Fix:** Once 0089 is guaranteed applied, drop the probe and select `ac.review_note` directly; or gate the probe behind a one-time cached boolean rather than per-call.

### IN-04: `TestSelfPublish_StatusBleibtProposed` is a no-op assertion

**File:** `backend/internal/handlers/contribution_proposals_me_test.go:375-382`

**Issue:** The test claims to guard the invariant that SelfPublish never writes `status='confirmed'`, but it asserts nothing — it assigns a filename string to `_` and logs a note. It will never fail if the invariant is violated. This is a false-confidence test.

**Fix:** Either remove it or make it real (e.g. inspect the SQL the repository issues via a fake pool, or assert the handler response/status contract). At minimum rename it so it is not mistaken for a guard.

### IN-05: OpenAPI contract examples do not match implemented error strings

**File:** `shared/contracts/contributions.yaml:89,164`

**Issue:** The contract examples show `"kein zugriff auf diese gruppe"` (403 on create) and `"90 Tage noch nicht verstrichen"` (409 self-publish), but the handler returns `"keine Berechtigung"` and `"Vorschlag kann noch nicht selbst veröffentlicht werden. 90 Tage müssen seit Einreichung vergangen sein."` respectively. Contract/implementation drift for the documented error payloads.

**Fix:** Update the contract examples to match the actual response strings (or vice versa) so consumers relying on the contract see accurate messages.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
