---
phase: quick-260916-ejp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/app/admin/groups/AdminGroupsClient.tsx
  - frontend/src/app/admin/groups/AdminGroupsClient.test.tsx
  - frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx
  - frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.test.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts
  - .planning/quick/260916-ejp-set-state-in-effect-an-8-stellen-fachlic/260916-ejp-SUMMARY.md
  - .planning/STATE.md
autonomous: true
requirements: [QUICK-260916-EJP-01, QUICK-260916-EJP-02, QUICK-260916-EJP-03, QUICK-260916-EJP-04, QUICK-260916-EJP-05, QUICK-260916-EJP-06, QUICK-260916-EJP-07, QUICK-260916-EJP-08]

must_haves:
  truths:
    - "None of the 8 call sites uses void (async () => { ... })() (or any other syntactic dodge -- queueMicrotask/setTimeout/Promise.resolve().then/eslint-disable/ref-mutation-as-state) to route synchronous effect-body setState calls around react-hooks/set-state-in-effect. Each site is now structurally compliant: setState happens either inside useCancellableSlugState's own .then/.catch (outside the caller's effect entirely) or via the render-time-adjustment pattern (setState called conditionally during render, guarded by an inequality check, exactly like the existing GroupMemberFormModals.tsx precedent)."
    - "grep -n 'void (async' across the 5 changed production files returns zero matches."
    - "npx eslint on all 5 changed production files reports 0 errors and 0 react-hooks/* warnings."
    - "Every pre-existing test in AdminGroupsClient.test.tsx (4), CapabilityHistoryPanel.test.tsx (3), GroupRolesTab.test.tsx (2), useEpisodeNeighborNavigation.test.ts (6), and useReleaseVersionMedia.test.ts (15, across 9 it + 2 it.each blocks) still passes, plus the two pre-existing useCancellableSlugState consumers (useMemberViewer.test.ts, MemberCurrentProjectsSection.test.tsx) are unaffected."
    - "Stale/superseded fetch responses never corrupt visible state at any of the 8 sites -- each site gained a dedicated regression test proving a response for an old key arriving after a key change does not apply."
    - "Class D (useReleaseVersionMedia) local user state -- optimistic reorder with rollback, patched/replaced/deleted items, in-flight upload queue -- survives a concurrent or subsequent reload() exactly as before; the load effect's replacement never triggers just because items/uploadItems changed."
    - "The only observed behavioral difference anywhere is the elimination of the one cascading commit where, on a key change, the OLD key's data briefly rendered without a loading state -- this is captured as an explicit new test per site, not left undocumented."
  artifacts:
    - path: "frontend/src/app/admin/groups/AdminGroupsClient.tsx"
      provides: "Class A: GroupMembersSummary/GroupRolesSummary/GroupClaimsSummary/GroupChangesSummary all consume useCancellableSlugState directly; file stays at or below its current 557 lines (extraction into per-component files allowed if needed, not required)."
    - path: "frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx"
      provides: "Class A: useCancellableSlugState with fansubGroupId+appUserId+actionCode in the request key, actionCode filtering applied when deriving the rendered list."
    - path: "frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx"
      provides: "Class B: explicit 3-state mapping (client not initialized / no-access-or-invalid-id / fetching) built on useCancellableSlugState's enabled gate, preserving the sticky loadError-not-cleared edge case."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts"
      provides: "Class C: useCancellableSlugState plus a render-time-adjustment layer that keeps the previous neighbor targets visible while a new key is loading."
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts"
      provides: "Class D: only the trailing load effect is replaced (useCancellableSlugState plus render-time adjustment for items/capabilities/error/capabilitiesError); every mutation/upload useCallback (patchItem, replaceItem, deleteItem, reorderItems, runUpload, retryUpload, clearUploadQueue) is untouched."
  key_links:
    - from: "frontend/src/app/admin/groups/AdminGroupsClient.tsx"
      to: "frontend/src/hooks/useCancellableSlugState.ts"
      via: "useCancellableSlugState(...) call in each of the 4 inner summary components"
      pattern: "useCancellableSlugState<"
    - from: "frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx"
      to: "frontend/src/hooks/useCancellableSlugState.ts"
      via: "useCancellableSlugState call keyed by fansubGroupId:appUserId:actionCode"
      pattern: "useCancellableSlugState<"
    - from: "frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx"
      to: "frontend/src/hooks/useCancellableSlugState.ts"
      via: "useCancellableSlugState call gated by enabled = isClientInitialized && hasAccessToken && fansubId > 0"
      pattern: "useCancellableSlugState<"
    - from: "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts"
      to: "frontend/src/hooks/useCancellableSlugState.ts"
      via: "useCancellableSlugState call plus local appliedKey-tracked render-time adjustment"
      pattern: "useCancellableSlugState<"
    - from: "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts"
      to: "frontend/src/hooks/useCancellableSlugState.ts"
      via: "useCancellableSlugState call plus local appliedKey-tracked render-time adjustment; existing mutation callbacks keep writing to the same items/error state directly"
      pattern: "useCancellableSlugState<"
---

<objective>
Replace the 8 `void (async () => { ... })()` workarounds introduced by quick 260915-rv3 with real, structural
fixes for `react-hooks/set-state-in-effect`, reusing the existing `useCancellableSlugState` hook
(`frontend/src/hooks/useCancellableSlugState.ts`) wherever its terminal-outcome-only-setState model fits, and
the already-established "adjust state during render" pattern (`GroupMemberFormModals.tsx` precedent) wherever a
site needs to retain a previous successful result while a new key loads (Classes C and D). No `eslint-disable`,
no new syntactic dodge, no behavior change beyond the one documented cascading-render elimination per site.

Purpose: the async-IIFE only hid the lint finding; `setIsLoading(true)`/`setError(null)` etc. still ran
synchronously in the effect body before the first `await`. This plan removes that gap for real.

Output: 5 production files plus their test files fixed, `useCancellableSlugState`'s own file and its two
existing consumers (`useMemberViewer.ts`, `MemberCurrentProjectsSection.tsx`) left untouched, before/after
global ESLint count documented in SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

<interfaces>
SHARED BUILDING BLOCK -- do not modify, do not duplicate.

frontend/src/hooks/useCancellableSlugState.ts exports:
  export type CancellableSlugStateStatus = 'idle' | 'loading' | 'success' | 'error'
  export interface CancellableSlugState<T> { key: string; status: CancellableSlugStateStatus; data: T | null; error: unknown }
  export interface UseCancellableSlugStateOptions<T> { requestKey: string; enabled: boolean; fetcher: (signal: AbortSignal) => Promise<T> }
  export function useCancellableSlugState<T>(options): { state: CancellableSlugState<T> }

Contract: `settled` (hence `state` when `state.key === requestKey`) is written ONLY inside the fetch promise's
`.then`/`.catch` -- never synchronously in the effect body -- so `react-hooks/set-state-in-effect` never fires
on this hook itself. `enabled: false` yields the constant IDLE_STATE (`{key:'', status:'idle', data:null,
error:null}`). `fetcher` MUST be stabilized with `useCallback` (its identity is an effect dependency inside the
hook); its dependency array must be exactly the reactive values the request depends on. `requestKey` must
encode every value the request depends on, or a stale response for a changed-but-unkeyed input could apply.

IMPORTANT -- signal-forwarding gap (verified against the current frontend/src/lib/api.ts signatures): the
hook's own doc comment says the fetcher "MUSS das uebergebene AbortSignal an fetch/apiClientFetch
weiterreichen", but `listFansubAppMembers`, `listClaims`, `listChanges`, `listOverrideHistory`,
`getReleaseVersionMedia`, and `getReleaseVersionCapabilities` accept NO AbortSignal parameter at all today, and
the admin (no-`options`) overload of `getGroupedEpisodes(animeID: number)` used by
useEpisodeNeighborNavigation also has no signal parameter (only the `options`-based public-projection overload
does, and passing `options` there would change the projection, which is out of scope). For all 8 sites in this
plan, accept the `signal` parameter in the fetcher's signature (to satisfy the hook's type) but do not forward
it into these particular API calls -- this is not a regression: TODAY's code does not cancel the underlying
network request either (it only uses a local `cancelled` boolean to gate `setState` after the fact).
`useCancellableSlugState`'s own `controller.signal.aborted` check inside `.then`/`.catch` is what actually
guarantees a superseded response can never apply, independent of whether the network call itself was
cancelled -- that guarantee is unaffected by this gap. Do not attempt to add signal support to these `api.ts`
functions in this plan (out of scope; note it as a candidate follow-up in SUMMARY only if it comes up
naturally).

Two existing consumers (frontend/src/lib/useMemberViewer.ts, frontend/src/components/profile/
MemberCurrentProjectsSection.tsx) and their tests (useMemberViewer.test.ts -- 14 tests,
MemberCurrentProjectsSection.test.tsx -- 11 tests) must remain byte-identical; re-run their test files as
regression proof, never edit them.

============================================================================================
PATTERN A -- direct useCancellableSlugState adoption. Applies to sites 1-5 (read-only, no local mutation, no
need to retain a previous key's data while a new key loads -- render order is always Loading -> Error -> Empty
-> Data, so isLoading/error/rendered-data can all be DERIVED straight from state, with no extra local useState
needed at all).

General shape for a component/hook that today has useState for isLoading/error/data plus one useEffect with a
try { setIsLoading(true); setError(null); const x = await call(...); setX(x) } catch { setError(...) } finally
{ setIsLoading(false) } body (or, after rv3, the async-IIFE-wrapped version of the same thing):

  1. Remove the isLoading/error/data useState declarations and the whole effect.
  2. Add `const fetcher = useCallback((signal: AbortSignal) => call(...args), [...exact reactive args...])`
     -- signal is accepted but not forwarded (see the signal-forwarding gap note above).
  3. `const { state } = useCancellableSlugState<ResponseType>({ requestKey: <string built from the same args
     as the fetcher's deps>, enabled: true, fetcher })`.
  4. Derive at render time (no extra state):
       `const isLoading = state.key !== requestKey || state.status === 'loading' || state.status === 'idle'`
       `const error = state.status === 'error' ? readErrorMessage(state.error, '<same fallback text as today>') : null`
       `const data = state.status === 'success' ? state.data : <today's initial empty value>`
  5. Everything downstream (useMemo derivations, JSX) reads the derived values instead of the old useState
     values -- behavior identical, just recomputed each render instead of stored.

Site-by-site specifics (frontend/src/app/admin/groups/AdminGroupsClient.tsx, all four inner components, deps
[fansubGroupId] -> requestKey = String(fansubGroupId)):
  - GroupMembersSummary: fetcher returns Promise.all([listFansubAppMembers(fansubGroupId),
    listClaims({ fansub_group_id: fansubGroupId, limit: 100, offset: 0 })]) typed as
    useCancellableSlugState<[FansubAppMemberListResponse, AdminClaimsListResponse]>; on success destructure
    [membersResponse, claimsResponse] = state.data, members = membersResponse.data,
    claims = claimsResponse.data; on non-success both default to []. openClaimsByUserId's useMemo keeps
    depending on the derived claims. Error fallback text stays "Gruppenmitglieder konnten nicht geladen
    werden."
  - GroupRolesSummary: fetcher listFansubAppMembers(fansubGroupId),
    useCancellableSlugState<FansubAppMemberListResponse>, members = state.data?.data ?? []. Error fallback
    "Rollen konnten nicht geladen werden."
  - GroupClaimsSummary: fetcher listClaims({ fansub_group_id: fansubGroupId, limit: 100, offset: 0 }),
    useCancellableSlugState<AdminClaimsListResponse>, claims = state.data?.data ?? []. Error fallback
    "Claims konnten nicht geladen werden."
  - GroupChangesSummary: fetcher listChanges({ gruppe: fansubGroupId, limit: 25, offset: 0 }),
    useCancellableSlugState<AdminChangesListResponse>, entries = state.data?.data ?? []. Error fallback
    "Aenderungen konnten nicht geladen werden." (keep the real "Änderungen" umlaut in the actual code -- this
    plan text is ASCII-only for transport, production strings must use real umlauts per CLAUDE.md).
  Every other line (JSX, router, useRoleCatalog, table markup) is untouched.

  Line budget: AdminGroupsClient.tsx is at 557 lines today and must not grow. Replacing 4 effects (~107 lines
  total) plus their state declarations (~10 lines) with 4 fetcher+hook+derive blocks (~15-18 lines each) is
  expected to net-REDUCE the file. If, after the refactor, the file would exceed 557 lines, extract the four
  summary components into their own sibling files (e.g. GroupMembersSummary.tsx, GroupRolesSummary.tsx,
  GroupClaimsSummary.tsx, GroupChangesSummary.tsx, each importing the shared readErrorMessage/
  displayNameForMember/formatRelativeDate/formatChange helpers or re-declaring the ones they individually
  need) and import them back into AdminGroupsClient.tsx. Only do this if the line count actually requires it --
  measure first.

  frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx (props fansubGroupId, appUserId, actionCode):
  today's effect deps are [fansubGroupId, appUserId, actionCode] even though the underlying
  fetchOverrideHistory(fansubGroupId, appUserId, 10, 0) call does not take actionCode -- i.e. TODAY, changing
  only actionCode (same group/user) already triggers a brand-new request (write a request-count test against
  the CURRENT code first to confirm this before assuming it). Preserve that exact parity:
  requestKey = `${fansubGroupId}:${appUserId}:${actionCode}` (actionCode IS part of the key, even though the
  fetcher function itself doesn't use it) so a same-group/user actionCode change still triggers one new
  request, matching today. fetcher = useCallback((signal) => fetchOverrideHistory(fansubGroupId, appUserId, 10,
  0), [fansubGroupId, appUserId]). useCancellableSlugState<CapabilityOverrideAuditItem[]>. Derive
  entries = state.status === 'success' ? state.data.filter((entry) => entry.action_code === actionCode) : null
  (keep the null vs [] distinction the current code already makes, so the three render branches -- loading /
  error / !entries || entries.length === 0 empty / table -- stay exactly as they are). Error fallback:
  error instanceof ApiError ? error.message : 'Historie konnte nicht geladen werden.' reading from state.error
  via state.error instanceof ApiError.

============================================================================================
PATTERN B -- useCancellableSlugState plus an explicit enabled-gated 3-state mapping, WITHOUT deriving loadError
straight from state.error (because one of the three states must NOT clear a previously-set error). Applies to
site 6, frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx.

Today's three states (deps [fansubId, hasAccessToken, isClientInitialized]):
  1. !isClientInitialized: nothing happens at all -- component stays at its initial isLoading=true,
     members=[], loadError=null until the client initializes.
  2. isClientInitialized && (!hasAccessToken || fansubId <= 0): members=[], isLoading=false, and loadError is
     explicitly NOT touched (a previously-set error stays displayed even though the table is now empty) --
     this is the edge case the task brief calls out by name; write a dedicated regression test for it (render
     with a resolved error first, then flip to hasAccessToken=false, assert the error text is still present).
  3. isClientInitialized && hasAccessToken && fansubId > 0: real fetch; success sets members + clears
     loadError; failure sets loadError (message text unchanged: error instanceof ApiError ? error.message :
     'Rollen konnten nicht geladen werden.').

Implementation: `const canFetch = isClientInitialized && hasAccessToken && fansubId > 0`;
`requestKey = \`${fansubId}:${hasAccessToken}\`` (isClientInitialized does not need to be in the key -- it
only ever flips false->true once per mount, and while false the hook stays disabled regardless of key);
`fetcher = useCallback((signal) => listFansubAppMembers(fansubId), [fansubId])`;
`const { state } = useCancellableSlugState<FansubAppMemberListResponse>({ requestKey, enabled: canFetch,
fetcher })`.

Keep members and loadError as real local useState (unlike Pattern A, they are NOT fully derivable -- state 2
must leave loadError untouched). Track which terminal state.key has already been applied with a small
`const [appliedKey, setAppliedKey] = useState<string | null>(null)`. During render (NOT inside an effect,
exactly like GroupMemberFormModals.tsx's render-time adjustment):
  - if !isClientInitialized: do nothing (matches state 1 -- initial defaults persist).
  - else if !canFetch: if members.length > 0 || appliedKey !== null, call setMembers([]) and
    setAppliedKey(null) (guarded so this only fires once per transition into state 2, never loops) --
    loadError is deliberately left alone.
  - else if state.key === requestKey && state.key !== appliedKey: this is a genuinely new terminal outcome
    for the current key -- on state.status === 'success', setAppliedKey(state.key), setMembers(state.data.data),
    setLoadError(null); on state.status === 'error', setAppliedKey(state.key), setLoadError(state.error
    instanceof ApiError ? state.error.message : 'Rollen konnten nicht geladen werden.'). While state.status is
    'loading', do nothing here (let isLoading reflect it instead).

`const isLoading = !isClientInitialized || (canFetch && (state.key !== requestKey || state.status === 'loading'))`.

`holderRows = useMemo(() => groupMembersByRole(members), [members])` stays exactly as-is.

============================================================================================
PATTERN C -- useCancellableSlugState plus a render-time-adjustment layer that retains the PREVIOUS successful
result while a new key is in flight (unlike Pattern A, this class must NOT flash back to empty/default targets
during a reload -- only isLoading may flip). Applies to site 7,
frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts.

`const canFetch = animeId != null && currentVersionId != null`;
`const requestKey = canFetch ? \`${animeId}:${currentVersionId}:${groupId ?? ''}:${releaseVersion}\` : ''`;
`fetcher = useCallback((signal) => getGroupedEpisodes(animeId as number), [animeId])` (admin overload, no
options -- see the signal-forwarding gap note above; `animeId as number` is safe because the fetcher is only
ever invoked by the hook while enabled is true, i.e. while canFetch is true);
`const { state } = useCancellableSlugState<GroupedEpisodesResponse>({ requestKey, enabled: canFetch, fetcher })`.

Keep navigation (typed NeighborNavigationResult, initial EMPTY_TARGETS) and error as real local useState, plus
`const [appliedKey, setAppliedKey] = useState<string | null>(null)`. During render:
  - if !canFetch: if appliedKey !== null (i.e. we're transitioning FROM a fetchable state TO a non-fetchable
    one), setAppliedKey(null), setNavigation(EMPTY_TARGETS), setError(null) -- matches today's
    animeId == null || currentVersionId == null branch. On the very first render with canFetch already false,
    appliedKey is already null, so nothing fires (no wasted render).
  - else if state.key === requestKey && state.key !== appliedKey: on 'success', setAppliedKey(state.key),
    compute computeNeighborNavigation({ episodes: state.data.data.episodes, currentVersionId: currentVersionId
    as number, groupId, releaseVersion }) and setNavigation(result), setError(null); on 'error',
    setAppliedKey(state.key), setError(caughtError instanceof Error ? caughtError.message : "Nachbar-Folgen
    konnten nicht geladen werden.") reading the message off state.error, and setNavigation(EMPTY_TARGETS)
    (today's error path DOES clear navigation -- this is the one place Class C clears on error, not on
    loading; preserve exactly). While 'loading', do nothing -- navigation/error keep showing the PREVIOUS
    key's settled result, which is the Class C requirement.

`const isLoading = canFetch && (state.key !== requestKey || state.status === 'loading')`.

Return `{ isLoading, error, ...navigation }` exactly as today.

============================================================================================
PATTERN D -- useCancellableSlugState plus render-time adjustment for the LOAD-derived fields only
(items/capabilities/error/capabilitiesError); every mutation/upload useCallback in this file (patchItem,
replaceItem, deleteItem, reorderItems, runUpload, retryUpload, clearUploadQueue, startUpload) is
callback-triggered, not effect-body code, and was never flagged by react-hooks/set-state-in-effect -- leave
every one of them byte-identical. Applies to site 8,
frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts.

Only the trailing useEffect(..., [versionId, reloadKey]) is replaced. `const canFetch = versionId !== null`;
`const requestKey = canFetch ? \`${versionId}:${reloadKey}\` : ''`;
`fetcher = useCallback((signal) => Promise.all([getReleaseVersionMedia(versionId as number),
getReleaseVersionCapabilities(versionId as number)]), [versionId])`;
`const { state } = useCancellableSlugState<[ReleaseVersionMediaListResponse, ReleaseVersionCapabilitiesResponse]>({
requestKey, enabled: canFetch, fetcher })`.

Keep items, capabilities, error, capabilitiesError as the SAME useState declarations already in the file (do
not rename, do not change their exported shape) plus a new
`const [appliedKey, setAppliedKey] = useState<string | null>(null)`. itemsRef sync effect, all useCallback
mutation functions, and every other useState in the file (uploadItems, patchError, replaceError, deleteError,
reorderError, reloadKey, lastUploadConfigRef) are UNCHANGED. During render:
  - if !canFetch: if appliedKey !== null || items.length > 0 || capabilities !== null || error !== null ||
    capabilitiesError !== null, reset all five (setAppliedKey(null), setItems([]), setError(null),
    setCapabilities(null), setCapabilitiesError(null)) -- matches today's versionId === null branch exactly
    (all four state setters there, plus the new appliedKey tracker).
  - else if state.key === requestKey && state.key !== appliedKey: on 'success', setAppliedKey(state.key),
    destructure [mediaResponse, capabilitiesResponse] = state.data, setItems(sortMediaItems(Array.isArray(
    mediaResponse.data) ? mediaResponse.data : [])), setCapabilities(capabilitiesResponse.data),
    setError(null), setCapabilitiesError(null); on 'error', setAppliedKey(state.key), compute
    message = state.error instanceof Error ? state.error.message : String(state.error), setError(message),
    setCapabilitiesError(message) (today's catch sets BOTH to the same message -- preserve). While 'loading',
    do nothing -- this is exactly how local mutations (patchItem/reorderItems/etc.) and the in-flight upload
    queue survive a reload() until the NEW result actually settles.

`const isLoading = canFetch && (state.key !== requestKey || state.status === 'loading')`.

Critical non-interference proof to write a test for: once appliedKey === state.key (i.e. the render-time
adjustment block has already run for the current key), calling patchItem/replaceItem/reorderItems/deleteItem
-- all of which call setItems(...) directly from their own callback -- must NOT be undone on the next render,
because the adjustment block's state.key !== appliedKey guard is now false. Likewise, runUpload/retryUpload
calling setError(...) directly from their own callback must not be silently overwritten by the adjustment
block on the next render, for the same reason. The return object (items, isLoading, error, reload, uploadItems,
startUpload, retryUpload, clearUploadQueue, patchItem, replaceItem, deleteItem, reorderItems, patchError,
replaceError, deleteError, reorderError, capabilities, capabilitiesError) is unchanged.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Class A -- AdminGroupsClient.tsx's four summary components</name>
  <files>frontend/src/app/admin/groups/AdminGroupsClient.tsx, frontend/src/app/admin/groups/AdminGroupsClient.test.tsx</files>
  <action>
    Test-first: before touching production code, add the mandatory new regression assertions to
    AdminGroupsClient.test.tsx -- request-count parity per component on a re-render with the same
    fansubGroupId vs. a changed one (the file already mocks next/navigation's useSearchParams to control
    which group/tab is active; force a group switch by re-mocking it and re-rendering), a stale-response test
    per component using a deferred promise on the existing @/lib/api mock (resolve the OLD group's response
    after switching to a new group, assert it never applies), and one StrictMode-wrapped render proving no
    extra request beyond React's own dev double-invoke. Confirm all of them -- new AND the 4 existing tests --
    pass against TODAY's async-IIFE implementation first, proving the new tests describe real, currently-true
    behavior. Then apply PATTERN A to all four inner components (GroupMembersSummary, GroupRolesSummary,
    GroupClaimsSummary, GroupChangesSummary) exactly as specified in the interfaces block's per-component
    list, removing their useState-based isLoading/error/data and their effects entirely in favor of direct
    useCancellableSlugState derivation, using real umlauts in every German string exactly as today. Measure
    the resulting file's line count; only extract the four components into sibling files if it now exceeds
    557 lines (see the interfaces block's line-budget note). Re-run the full test file and confirm everything
    passes unchanged in outcome (only the documented single-cascading-render difference is allowed, and it
    must be covered by one of the new tests, not silently absorbed).
  </action>
  <verify>
    <automated>docker exec -w /app team4sv30-frontend sh -c "grep -n 'void (async' src/app/admin/groups/AdminGroupsClient.tsx; npx eslint src/app/admin/groups/AdminGroupsClient.tsx && npx vitest run src/app/admin/groups/AdminGroupsClient.test.tsx"</automated>
  </verify>
  <done>grep finds zero matches; eslint reports 0 errors/0 react-hooks warnings; all tests (4 pre-existing plus the new request-count/stale-response/StrictMode assertions) pass; file at or below 557 lines (or split into sibling files if that was required).</done>
</task>

<task type="auto">
  <name>Task 2: Class A remainder (CapabilityHistoryPanel.tsx) plus Class B (GroupRolesTab.tsx)</name>
  <files>frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx, frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.test.tsx, frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx, frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.test.tsx</files>
  <action>
    Test-first for both files, confirmed green against today's async-IIFE code before any production change:
    for CapabilityHistoryPanel.test.tsx add a test proving an actionCode-only change (same fansubGroupId/
    appUserId) triggers exactly one additional call to listOverrideHistory (confirms the parity requirement
    described in PATTERN A before relying on it), a stale-response test (old fansubGroupId's response arrives
    after switching appUserId, must not apply), and a StrictMode-wrapped render. For GroupRolesTab.test.tsx add
    the sticky-loadError regression test described in PATTERN B (render with hasAccessToken=true and a
    rejected fetch to produce a visible error, then re-render with hasAccessToken=false and assert the error
    text is STILL present while the table is gone), a request-count-parity test on a fansubId change, a
    stale-response test, and a StrictMode-wrapped render. Then apply PATTERN A to CapabilityHistoryPanel.tsx
    and PATTERN B to GroupRolesTab.tsx exactly as specified in the interfaces block, keeping every German
    string (including the real umlauts) identical to today. Re-run both test files and confirm all pre-existing
    and new tests pass.
  </action>
  <verify>
    <automated>docker exec -w /app team4sv30-frontend sh -c "grep -n 'void (async' src/app/admin/users/tabs/CapabilityHistoryPanel.tsx 'src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx'; npx eslint src/app/admin/users/tabs/CapabilityHistoryPanel.tsx 'src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx' && npx vitest run src/app/admin/users/tabs/CapabilityHistoryPanel.test.tsx 'src/app/admin/fansubs/[id]/edit/GroupRolesTab.test.tsx'"</automated>
  </verify>
  <done>grep finds zero matches in both files; eslint reports 0 errors/0 react-hooks warnings on both; all tests pass, including the new sticky-loadError regression and the actionCode request-count-parity assertion.</done>
</task>

<task type="auto">
  <name>Task 3: Class C -- useEpisodeNeighborNavigation.ts</name>
  <files>frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts, frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.test.ts</files>
  <action>
    Test-first, confirmed green against today's async-IIFE implementation before any production change: add a
    test proving that on a currentVersionId change while the previous request is still pending, the PREVIOUS
    key's already-resolved navigation targets remain in `result.current` (not reset to EMPTY_TARGETS) while
    `isLoading` flips to true -- this is the one behavior the current rv3 implementation does NOT explicitly
    test for (the existing "refetcht bei Aenderung" test only checks the eventual value, not the interim one).
    Add a stale-response test (old currentVersionId's response resolves after a key change, must not apply,
    verified via a deferred promise per key like the file's existing `deferred()` helper) and a StrictMode
    -wrapped render proving no extra `getGroupedEpisodes` call beyond React's dev double-invoke. Then apply
    PATTERN C exactly as specified in the interfaces block. Re-run the full test file and confirm all 6
    pre-existing tests plus the new ones pass, with the "stale targets persist during reload" test being the
    one genuinely NEW piece of coverage this refactor adds (today's implementation happens to already behave
    this way since navigation is only reset in the disabled/success/error branches, never on loading -- confirm
    this by running the new test against the CURRENT code first, then keep it green through the refactor).
  </action>
  <verify>
    <automated>docker exec -w /app team4sv30-frontend sh -c "grep -n 'void (async' 'src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts'; npx eslint 'src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts' && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.test.ts'"</automated>
  </verify>
  <done>grep finds zero matches; eslint reports 0 errors/0 react-hooks warnings; all 6 pre-existing tests plus the new stale-targets-persist/stale-response/StrictMode tests pass.</done>
</task>

<task type="auto">
  <name>Task 4: Class D -- useReleaseVersionMedia.ts</name>
  <files>frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts, frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts</files>
  <action>
    Test-first, confirmed green against today's async-IIFE implementation before any production change: add a
    test proving that calling `reorderItems` (optimistic update) then triggering `reload()` before the reload's
    response resolves leaves the optimistic order visible until the reload settles, then the server's order
    (via the new response) takes over; a test proving `patchItem`/`deleteItem` results survive a `reload()`
    call made afterward but before its response resolves; a request-count-parity test proving `reload()`
    triggers exactly one additional Promise.all pair (getReleaseVersionMedia + getReleaseVersionCapabilities),
    and that calling a mutation function (patchItem/replaceItem/reorderItems/deleteItem) does NOT trigger any
    additional load request; a stale-response test (an old versionId's load response resolving after
    `versionId` prop changes must not apply to items/capabilities); a test locking in today's exact
    error-ordering behavior between the load effect and the upload path (e.g. a load failure followed by a
    successful upload must leave `error` cleared by the upload path's own logic if that is what happens today
    -- verify precisely against the CURRENT code first, do not assume); and one StrictMode-wrapped render
    proving no extra request pair beyond React's dev double-invoke. Then apply PATTERN D exactly as specified
    in the interfaces block -- replace ONLY the trailing load effect; do not touch any mutation/upload
    useCallback. Re-run the full test file and confirm all 15 pre-existing tests (9 `it` + 2 `it.each` blocks)
    plus the new ones pass.
  </action>
  <verify>
    <automated>docker exec -w /app team4sv30-frontend sh -c "grep -n 'void (async' 'src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts'; npx eslint 'src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts' && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts'"</automated>
  </verify>
  <done>grep finds zero matches; eslint reports 0 errors/0 react-hooks warnings; all 15 pre-existing tests plus the new reload/mutation-survival/request-count/stale-response/error-ordering/StrictMode tests pass.</done>
</task>

<task type="auto">
  <name>Task 5: Full verification, global lint recount, container restart, SUMMARY</name>
  <files>.planning/quick/260916-ejp-set-state-in-effect-an-8-stellen-fachlic/260916-ejp-SUMMARY.md, .planning/STATE.md</files>
  <action>
    Before any git add, run `git status --short` and confirm only this plan's files_modified paths are
    touched -- a parallel run may be active in the same working tree; stage only this plan's files by explicit
    path, never `git add -A`/`git add .`. If `.git/index.lock` exists at commit time, wait briefly and retry --
    never delete the lock file. Never use `git stash`, never push. Inside the team4sv30-frontend container
    (working dir /app): confirm `grep -n "void (async" ` returns zero matches across all 5 changed production
    files in one combined command; run the full global `npx eslint` (no path arguments) and record the
    before/after error/warning counts in SUMMARY -- errors must stay at 3, warnings must not exceed 319, and
    zero new finding of any rule beyond what this plan intentionally removed; run `npx tsc --noEmit` and
    confirm 0 errors; run `npx vitest run` for every test file this plan touched plus the two pre-existing
    useCancellableSlugState consumers (frontend/src/lib/useMemberViewer.test.ts,
    frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx) and confirm all pass -- run these
    per-file or per-folder, not the full global suite in parallel with anything else, this VM has limited RAM.
    Then run `docker restart team4sv30-frontend` and wait for it to become healthy. Write SUMMARY.md
    documenting: the before/after global lint counts; the per-site class assignment (confirm or correct
    against the Lifecycle-Klassen A/B/C/D descriptions in the task brief, noting any reclassification found
    during implementation); the one documented cascading-render behavioral difference per site and its
    covering test; and a manual-sighting checklist (listed as OPEN, not claimed as passed) covering: Gruppen
    verwaltung (all four tabs plus switching between two different groups), Capability-Historie (row
    expansion in the user editor), Rollen-Tab im Fansub-Editor (including the sticky-error edge case),
    Episoden-Navigation vor/zurueck (arrow buttons across episode boundaries), and the Medien-Tab (upload,
    reorder via drag, delete, and a reload after a local edit). Explicitly note in SUMMARY, as an out-of-scope
    follow-up, that NotesTab.tsx still uses the same async-IIFE workaround pattern and was NOT touched by this
    plan (per the task brief's explicit exclusion), alongside the legitimate (non-workaround)
    useReleaseReviewLane.ts/FansubEditSecondaryTabs.tsx/ReleaseContributionDrawer.tsx IIFEs that set state only
    after a real await and were correctly left alone. Update .planning/STATE.md additively (new Quick-table
    entry only, do not rewrite existing sections).
  </action>
  <verify>
    <automated>docker exec -w /app team4sv30-frontend npx tsc --noEmit</automated>
  </verify>
  <done>Zero "void (async" matches across all 5 files; global eslint errors=3, warnings<=319, 0 new findings of any rule; tsc reports 0 errors; every listed test file (5 changed + 2 pre-existing consumers) passes; container restarted; SUMMARY documents before/after counts, per-site class confirmation, the one allowed behavioral difference per site with its covering test, an explicit OPEN manual-sighting checklist, and the NotesTab.tsx follow-up note; STATE.md updated additively; git status confirms no foreign-run files were touched.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| None crossed | Pure client-side React hook/effect refactor across 8 already-authenticated admin routes/hooks. No new external input, no new dependency, no new endpoint, no change to what data is fetched or how it is authorized -- only WHEN/HOW existing setState calls execute relative to React's render cycle, reusing an already-reviewed shared hook. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-260916-EJP-01 | Denial of Service | requestKey composition (all 8 sites) | mitigate | Each requestKey was verified during planning to encode exactly the reactive values the request depends on (including the actionCode parity case for CapabilityHistoryPanel and the hasAccessToken-inclusive key for GroupRolesTab); request-count-parity tests per site prove no extra requests versus today and no infinite loop |
| T-260916-EJP-02 | Tampering | Local user state (Class D upload queue, optimistic reorder, patched/replaced/deleted items) | mitigate | Render-time-adjustment guard (`state.key !== appliedKey`) is proven, per a dedicated test, to never re-apply a stale load result over a more recent local mutation; mutation/upload callbacks are left byte-identical, not touched by this refactor |
| T-260916-EJP-03 | Information Disclosure | GroupRolesTab sticky-error edge case | accept | The pre-existing behavior (an error message persists on screen after access is revoked mid-session) is preserved exactly as today, not introduced by this plan; changing it is out of scope |
</threat_model>

<verification>
- Tasks 1-4: each task's scoped `grep`/`npx eslint`/`npx vitest run` command in its own `<verify>` block
  passes as specified.
- Task 5: global `npx eslint` recount matches the documented before/after (errors=3, warnings<=319, 0 new
  findings); `npx tsc --noEmit` reports 0 errors; every listed test file (5 changed plus 2 pre-existing
  useCancellableSlugState consumers) passes; container restarted; SUMMARY documents the manual-sighting
  checklist as explicitly OPEN.
</verification>

<success_criteria>
- All 8 call sites are free of `void (async` (and any other syntactic dodge) -- verified by grep across the 5
  changed production files.
- `npx eslint` on the 5 changed production files reports 0 errors and 0 `react-hooks/*` warnings.
- Global `npx eslint`: errors remain at 3, warnings do not exceed 319, zero new finding of any rule.
- `npx tsc --noEmit` introduces no new error.
- Zero new test failures; every pre-existing test (4 + 3 + 2 + 6 + 15 = 30 across the 5 changed files, plus 14
  + 11 = 25 across the two pre-existing useCancellableSlugState consumers) passes, plus each site's new
  request-count-parity, stale-response, and StrictMode regression tests pass.
- Zero new network requests, zero new render loops, zero lost local user state (Class D) -- each verified
  individually per site during planning and re-confirmed by the new tests, not assumed.
- The only allowed behavioral difference anywhere -- elimination of the single cascading commit where an old
  key's data briefly rendered without a loading state on a key change -- is captured by an explicit new test
  per site and named in SUMMARY, never silently absorbed.
- Container restarted; the Gruppenverwaltung/Capability-Historie/Rollen-Tab/Episoden-Navigation/Medien-Tab
  manual-sighting items are listed as OPEN in SUMMARY, not claimed as passed.
- NotesTab.tsx's still-present async-IIFE workaround is explicitly named as an out-of-scope follow-up in
  SUMMARY, not silently fixed and not silently ignored.
</success_criteria>

<output>
Create `.planning/quick/260916-ejp-set-state-in-effect-an-8-stellen-fachlic/260916-ejp-SUMMARY.md` when done
</output>
