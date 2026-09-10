# Deferred Items — Phase 154

Out-of-scope discoveries found during plan execution, logged (not fixed) per the executor's
scope-boundary rule.

## From 154-03 (Task 2: animated-avatar byte budget, P154-07)

**Finding:** `frontend/src/app/media/[...path]/route.ts` does not honor HTTP `Range` request
headers — it always calls `readFile(filePath)` for the entire file and returns the complete
buffer with `status: 200`, regardless of any `Range` header on the incoming request.

**Why it surfaced here:** 154-03's `isAnimatedWebpSource` probe (`MemberProfileHero.tsx`) sends
`fetch(avatarURL, { headers: { Range: 'bytes=0-63' } })`, intending to read only the first 64
bytes of a same-origin `/media/profile/**` avatar to check for the WebP RIFF container's `ANIM`
chunk signature, keeping the probe's own transfer bounded. Verified live against `timer`'s real
411,828-byte animated-WebP avatar (`members/timer`, Playwright network trace): the probe request
returned `content-length: 411828` with `status: 200` (not `206 Partial Content`) — i.e., the Range
header was silently ignored server-side, and the probe downloaded the full file instead of a
64-byte slice.

**Impact:** Functionally harmless — detection is still correct, the single animated-avatar code
path is preserved, and there is no retry loop or behavior regression. But it means the probe is
not bandwidth-neutral: in the worst case it adds one full extra network transfer of the avatar
file (on top of the eventual `<img>` display fetch), though `Cache-Control: public, max-age=
31536000, immutable` on this route means a same-session repeat fetch of the identical URL should
be served from the browser's HTTP cache rather than the network.

**Why not fixed in 154-03:** `frontend/src/app/media/[...path]/route.ts` is not in Task 2's
`<files>` list (`MemberProfileHero.tsx`, `MemberProfileHero.test.tsx` only) and is unrelated,
pre-existing infrastructure that predates this phase — out of this task's scope per the
scope-boundary rule.

**Suggested follow-up:** Add standard HTTP Range support to `route.ts` (parse the `Range` header,
slice the buffer or use a read stream with `start`/`end`, return `206 Partial Content` with
`Content-Range`/`Accept-Ranges` headers) — a general improvement that would also benefit video
scrubbing (`.mp4`/`.webm` are served through the same route) and not just this probe. Not filed as
a numbered `P154-*` requirement; flagged here for a future maintenance pass.

## From 154-03 (surfaced during 154-04's full-suite run): api.no-token-boundary.test.ts failure

**Finding:** The unscoped `npx vitest run` during 154-04's Task 3 shows exactly one failing test
file, `src/lib/api.no-token-boundary.test.ts` ("keeps direct fetch outside the central client
limited to auth entrypoint, Keycloak, server routes, and public no-auth fetches"). It fails because
`MemberProfileHero.tsx:122` calls raw `fetch(url, { headers: { Range: 'bytes=0-63' } })` directly
(the same 154-03/P154-07 animated-WebP probe documented above) instead of going through the
central `apiClientFetch`/`authorizedFetch` boundary this Phase-49 regression lock enforces, and
that file is not yet in the test's explicit allow-list.

**Why not fixed in 154-04:** `MemberProfileHero.tsx` and `api.no-token-boundary.test.ts` are not
in 154-04's `<files>` list for any task (`app_public_profile.go`, `main.go`, `api.ts`,
`useMemberViewer.ts`, `useMemberViewer.test.ts`, `OwnProfileEditLink.tsx`,
`OwnProfileEditLink.test.tsx`) — the raw `fetch` call was introduced by 154-03, not by this plan.
Confirmed via `git diff --name-only` (154-04's working tree touches none of these two files) and
`git log` (`MemberProfileHero.tsx` was last modified by commit `9e0b4da9`, `fix(154-03): give
animated avatars a single, budgeted code path (P154-07)`, before this plan started). Out of scope
per the scope-boundary rule; not fixed here.

**Suggested follow-up:** Either route the animated-WebP probe's `fetch` call through
`apiClientFetch` (if it supports forwarding a `Range` header transparently) or add
`src/components/profile/MemberProfileHero.tsx` to the test's documented allow-list with a comment
explaining the same-origin, no-auth, byte-range probe rationale. A future phase/quick fix should
close this so the full suite is green again.

## From 154-07 (Task 1: live owner-view checkpoint, P154-15/E6): no permanent private-visibility test fixture exists

**Finding:** While completing the live human checkpoint for owner-only rendering of a hidden
member profile, the operator found that the live dataset (12 members) contained **zero**
`profile_visibility = 'private'` rows -- every member stood at `public`. The checkpoint as
originally planned (navigate to an *existing* hidden profile as its owner) was therefore not
executable in its planned form.

**Why it surfaced here:** The operator worked around this by temporarily setting one member
(`d1sk`, user_id 2) to `private`, performing the owner/anonymous comparison, and then reverting
it back to `public` immediately afterward (rollback independently verified: all 12 members
`public`, anonymous GET on both the API and the frontend page returns 200, viewer endpoint
anonymous `is_owner: false`, no test data left behind). This proved the path works, but it also
means the `private`-visibility branch of the public-member-access resolver (`ResolvePublicMemberAccess`
and the members/[slug] owner-preview path) had never been exercised against real data in normal
operation before this ad-hoc, manually-reverted test.

**Impact:** Functionally harmless -- the checkpoint's goal was met and the path is confirmed
correct. But the absence of any standing `private` profile means any future regression on this
path (e.g. a change that accidentally makes hidden profiles publicly readable, or breaks the
owner-preview branch) would currently go undetected by browsing the live dataset; it would require
another manual toggle-and-revert to notice.

**Why not fixed in 154-07:** Creating or seeding a permanent test fixture is data/infrastructure
work outside this plan's scope (`files_modified: []`, a `checkpoint:human-verify` task whose
`<action>` explicitly forbids altering application code or data during the checkpoint itself).

**Suggested follow-up:** Add a permanent, clearly-labeled test/fixture member profile with
`profile_visibility = 'private'` to the reset/reseed fixture set (see the existing
`sheppert`/`csubs-leader` fixture pattern from Phase 134), so the hidden-profile owner-preview and
anonymous-denial paths are continuously exercisable against real data rather than requiring a
manual temporary toggle each time. Not filed as a numbered `P154-*` requirement; flagged here for
a future maintenance pass.
