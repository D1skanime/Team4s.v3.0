# Phase 88 Research: Fansubber-Workspace & Contribution-Copy bereinigen

**Date:** 2026-06-18
**Source:** Inline codebase research after `88-CONTEXT.md`

## RESEARCH COMPLETE

## Scope Confirmation

Phase 88 should stay on member-facing surfaces:

- `/me/contributions`
- `/me/profile`
- `/me/releases/[versionId]/workspace`
- `/manage/groups` and `/admin/my-groups`

Public member pages, public Anime/group credit blocks, and `/admin/fansubs/[id]/edit` remain deferred.

## Key Findings

### 1. `/me/contributions` Is Mostly Phase-85 Cleaned

Phase 85 already implemented the biggest contribution cleanup:

- Claim is no longer a peer option in `ReportModal`.
- `ProposalForm` uses `YearPicker`.
- Release-version contribution proposals are unavailable instead of submit-capable.
- Global `Modal` has a11y improvements.
- Focused contribution tests exist and passed during Phase 85.

Phase 88 should not redo this. It should only adjust copy that is now too bureaucratic (`Beitragsprüfung`, `Prüffall`) and keep global UI primitives intact.

### 2. `/me/releases/[versionId]/workspace` Still Uses Old Copy

`frontend/src/app/me/releases/[versionId]/workspace/page.tsx` still contains:

- breadcrumb/link text `Meine Beiträge`;
- error actions `Zu meinen Beiträgen`;
- `Release-Arbeitsfläche` / `Arbeitsfläche`;
- route error copy tied to `hasAccessToken || hasRefreshToken` correctly.

This page already has a refresh-session gate and focused tests proving it loads with `hasAccessToken=false`, `hasRefreshToken=true`.

Main planning implication: copy and UI composition can be improved without backend changes. Consider `Projekt-Arbeitsbereich`, `Meine Projekte`, or `Zur Projektübersicht` language, but avoid making the page sound like a direct Anime-credit claim.

### 3. `Meine Gruppen` Has Good Workspace Link But Needs Auth Refresh Gate

The quick task already changed release buttons in `frontend/src/app/admin/my-groups/[id]/page.tsx` to `/me/releases/[versionId]/workspace`.

Remaining findings:

- both `frontend/src/app/admin/my-groups/page.tsx` and `[id]/page.tsx` gate on `hasAccessToken` only;
- per `docs/frontend/auth-api-client.md`, protected member UI must gate on `hasAccessToken || hasRefreshToken`;
- copy still includes technical/admin-ish terms like `Capabilities`, `Scope`, `Release-Media`, and `Historische Credits`.

Planning implication: Phase 88 should fix the refresh gate and humanize the text, preserving the existing API helpers and route aliases.

### 4. `/me/profile` Has the Largest Phase-88 Surface

`frontend/src/app/me/profile/page.tsx` and components include:

- `authToken` still read from `useAuthSession()` and passed into UI/API helper calls;
- `MemberClaimSection` accepts `authToken?: string` and passes it to `searchHistoricalMembers`, `submitMemberClaim`, `submitMemberRequest`;
- `patchNoindex` can already be called without the optional token, but the page passes one;
- `patchMyBadgeVisibility` currently has an auth-token-first signature, which forces UI code to pass token-shaped values;
- user-facing copy includes `Member-Claim`, `Claim einreichen`, `beanspruchen`, `Meine letzten Beiträge`, and `Noch keine Beiträge`;
- `ClaimStatusCard` has inline hard-coded badge colors/styles instead of global `Badge`.

Planning implication: profile cleanup should include both copy and browser auth/API boundary cleanup. Avoid backend changes unless the existing helper signatures force a tiny `api.ts` compatibility migration.

### 5. Contributor-Owned Media/Note Edit/Delete Is Partly Already Covered

Relevant existing structures:

- release-version media: `ReleaseVersionMediaSection` reused inside `/me/releases/[versionId]/workspace`;
- release-version notes: `ReleaseVersionNotesTab` reused inside `/me/releases/[versionId]/workspace`;
- release media delete/update backend exists under admin release-version media routes;
- release-version notes CRUD exists in `frontend/src/lib/api.ts` and backend handlers/repositories.

No separate member-owned media/note API should be invented in Phase 88. The plan should surface existing edit/delete affordances through the member workspace only when existing capabilities allow it. If a required member-facing action is missing from the reused admin component, document the exact gap rather than building a parallel endpoint.

## Existing Patterns To Reuse

- `frontend/src/components/ui`: `PageHeader`, `SectionHeader`, `Card`, `Badge`, `Button`, `Tabs`, `Table`, `EmptyState`, `LoadingState`, `ErrorState`, `FormField`, `Input`, `Textarea`, `Select`, `YearPicker`.
- `useAuthSession()`: gate protected UI on `hasAccessToken || hasRefreshToken`.
- `frontend/src/lib/api.ts`: central helper layer; no raw protected `fetch`.
- CSS modules with global tokens for route-local layout.
- Existing tests:
  - `frontend/src/app/me/profile/page.test.tsx`
  - `frontend/src/app/me/profile/components/RecentContributionsSection.test.tsx`
  - `frontend/src/app/me/profile/components/RecentMediaSection.test.tsx`
  - `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx`
  - `frontend/src/app/admin/my-groups/page.test.tsx`
  - `frontend/src/app/admin/my-groups/[id]/page.test.tsx`
  - contribution tests from Phase 85.

## Planning Pitfalls

- Do not reintroduce Claim as a contribution option.
- Do not make public member/Anime/group credit UI part of Phase 88.
- Do not build new media or note endpoints for member workspace unless an existing endpoint cannot be reused and the plan updates contracts.
- Do not pass token-shaped values through normal UI components.
- Do not make `Prüffall` or `Beitragsprüfung` the dominant runtime language if simpler user language works.
- Do not collapse current app membership, historical member identity, and Anime/project participation into one concept.

