---
phase: 181-release-bearbeitung-zusammenfuehren-f-13-eine-rechtebasierte-
reviewed: 2026-10-14T00:00:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
  - frontend/src/app/me/dashboard/components/attentionHelpers.ts
  - frontend/src/app/me/dashboard/components/attentionHelpers.test.ts
  - frontend/src/app/me/dashboard/components/AttentionSection.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/contributions/ContributionCard.test.tsx
  - frontend/src/components/contributions/AnimeGroupCard.tsx
  - frontend/src/components/contributions/AnimeGroupCard.test.tsx
  - frontend/next.config.mjs
  - frontend/src/lib/releaseEditorRedirects.mjs
  - frontend/src/lib/releaseEditorRedirects.d.ts
  - frontend/src/lib/releaseEditorRedirects.d.mts
  - frontend/src/lib/releaseEditorRedirects.test.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 181: Code Review Report

**Reviewed:** 2026-10-14T00:00:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

Phase 181 retargets five frontend entry points from the now-deleted
`/me/releases/[versionId]/workspace` route to
`/admin/episode-versions/[versionId]/edit`, extends `getSafeReturnPath`'s
allowlist with two new exact-match paths, and adds a permanent 308 redirect
for the retired route. I verified the deletion is complete (no remaining
references to `workspaceHelpers`/the old route anywhere in `frontend/src`
except an explanatory comment and a rejection-test literal), re-derived and
fuzz-tested `getSafeReturnPath` by hand (tab/newline-injection, protocol-
relative smuggling, trailing-slash, prefix tricks) and found the
origin-check-after-parse design holds even against WHATWG URL
tab-stripping tricks — it is sound exact-match-only logic. The new
`tab=` values (`segmente`, `notizen`) correctly use the German vocabulary
already recognized by `EpisodeVersionEditorPage`'s `ACTIVE_TABS`, and the
`redirects()` entry in `next.config.mjs` uses a single dynamic path segment
with no wildcard widening. All 78 relevant unit tests pass.

Two real-but-narrow issues remain: a pre-existing tab-fallback gap in the
shared editor becomes reachable now that non-admin dashboard links point at
it with a hardcoded `tab=` value, and the security-critical exact-match
allowlist has no regression test guarding against a future accidental
`startsWith`/prefix refactor. Two minor pre-existing quality nits are also
noted for completeness.

## Warnings

### WR-01: Dashboard attention link can leave the shared editor blank for metadata-only contributors

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx:249-257`
**Issue:**
`visibleActiveTab`'s fallback chain only tries `segmente → media → notizen`
when the requested tab isn't allowed; it never falls back to
`informationen`:

```ts
const visibleActiveTab: ActiveTab = allowedTabs.has(activeTab)
  ? activeTab
  : allowedTabs.has("segmente")
    ? "segmente"
    : allowedTabs.has("media")
    ? "media"
    : allowedTabs.has("notizen")
      ? "notizen"
      : activeTab;
```

`frontend/src/app/me/dashboard/components/attentionHelpers.ts`'s
`resolveWorkspaceHref` (used by the "Braucht deine Aufmerksamkeit" dashboard
card — one of the five retargeted entry points added in this phase) always
builds the href with a hardcoded `tab=segmente`, regardless of the actual
release-level capability the contributor holds for that specific release
version:

```ts
? `/admin/episode-versions/${contribution.release_version_id}/edit?tab=segmente&return_to=${encodeURIComponent("/me/dashboard")}`
```

`ReleaseVersionCapabilities` (`backend/internal/handlers/admin_content_release_version_media_capabilities.go`)
derives `can_edit_metadata`, `can_manage_segments`, `can_view_media`, and
`can_edit_notes` as four *independent* permission checks. A contributor
whose release-level grant resolves to `can_edit_metadata: true` only (no
segments/media/notes) will have `allowedTabs = {"informationen"}`. Clicking
the dashboard card sets `activeTab` to `"segmente"` (from the query string),
which is not in `allowedTabs`; the fallback chain checks `segmente` (no),
`media` (no), `notizen` (no), and gives up, returning the literal
`"segmente"` — which is *also* not in `allowedTabs`. Every
`allowedTabs.has(X) && visibleActiveTab === X` content block
(`informationen`, `segmente`, `media`, `notizen`) then evaluates false
simultaneously, so the form renders with a tab bar showing an inactive
"Informationen" button and a completely empty content area below it — no
error message, no indication of what happened (`hasNoVersionEditorAccess`
is false here because `isContributorScopedEditor` is true).

Before this phase, this exact scenario was impossible: the retired
`/me/releases/[id]/workspace` page used
`defaultTabId={canEditMetadata ? 'metadata' : canUseMedia ? 'media' : canUseSegments ? 'segments' : 'notes'}`
(metadata/informationen first) as the fallback when the requested tab
wasn't available. Retargeting the dashboard link onto the admin editor
exposes contributors to this editor's narrower, pre-existing fallback gap.

**Fix:** Add `informationen` to the fallback chain (matching the retired
page's priority order):

```ts
const visibleActiveTab: ActiveTab = allowedTabs.has(activeTab)
  ? activeTab
  : allowedTabs.has("informationen")
    ? "informationen"
    : allowedTabs.has("segmente")
      ? "segmente"
      : allowedTabs.has("media")
        ? "media"
        : allowedTabs.has("notizen")
          ? "notizen"
          : activeTab;
```

### WR-02: No regression test locks in the exact-match (non-prefix) property of the new allowlist entries

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx:87-88`
**Issue:** The two newly added allowlist checks are implemented correctly
as exact matches:

```ts
const isMemberDashboard = parsed.pathname === "/me/dashboard";
const isMemberContributions = parsed.pathname === "/me/contributions";
```

`page.test.tsx` only has positive tests ("akzeptiert /me/dashboard...",
"akzeptiert /me/contributions...") confirming these two paths are accepted.
There is no negative test asserting that a close-prefix variant
(`/me/dashboard-evil`, `/me/dashboard/anything`, `/me/contributionsX`) is
*rejected*. Given this function is explicitly a security boundary (the
review brief for this phase calls out exact-match-only as the top
priority), a future refactor that changes `===` to `.startsWith(...)` for
either check (e.g. while adding a sub-route) would silently reopen an
open-redirect vector with no test failing to catch it.
**Fix:** Add a negative test case, e.g.:

```ts
it("lehnt einen /me/dashboard-Prefix-Angriff ab", async () => {
  useSearchParamsMock.mockReturnValue({
    get: (key: string) =>
      key === "return_to" ? "/me/dashboard-evil" : null,
  });
  // ...render + assert backLink falls back to the existing default, not "/me/dashboard-evil"
});
```

## Info

### IN-01: Pre-existing ASCII-umlaut substitute in a user-facing string

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx:706`
**Issue:** "Nach der Synchronisierung erscheinen hier auswaehlbare Dateien."
uses the ASCII substitute `auswaehlbare` instead of `auswählbare`, which
CLAUDE.md's Sprachqualität rule explicitly forbids for user-facing German
strings. This line predates phase 181 (confirmed via `git blame`/`git log
-p`) and is not part of this phase's diff, but it sits inside a file this
phase's diff modifies and is worth cleaning up opportunistically.
**Fix:**
```diff
-                        Nach der Synchronisierung erscheinen hier auswaehlbare
+                        Nach der Synchronisierung erscheinen hier auswählbare
                         Dateien.
```

### IN-02: Hand-duplicated type declaration files for the same module

**File:** `frontend/src/lib/releaseEditorRedirects.d.ts`, `frontend/src/lib/releaseEditorRedirects.d.mts`
**Issue:** Both files declare byte-identical content for
`buildReleaseEditorRedirects`/`ReleaseEditorRedirect` to satisfy different
module-resolution consumers (`.ts` importer vs. `.mjs`/ESM importer in
`next.config.mjs`). This is a reasonable pattern given the project's
constraint that `releaseEditorRedirects.mjs` stay framework/runtime-neutral,
but it is a manually-synced duplicate: a future signature change to
`buildReleaseEditorRedirects` that only updates one of the two `.d` files
would silently desync type-checking for one consumer.
**Fix:** Consider having one of the two declaration files re-export from
the other (`export * from './releaseEditorRedirects.d.ts'`) if the toolchain
supports it, or add a one-line comment in each file cross-referencing its
sibling so a future editor knows to update both.

---

_Reviewed: 2026-10-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
