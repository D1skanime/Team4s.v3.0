# Deferred Items — Phase 133

## Pre-existing failing assertion in ResponsiveImage.config.test.ts (found during 133-02)

- **File:** `frontend/src/components/ui/ResponsiveImage.config.test.ts`
- **Test:** `ResponsiveImage profile-media configuration > allows public release-version contribution media without opening all media paths`
- **Assertion:** `expect(hasLocalMatch(localPatterns, '/media/admin/private/original.jpg')).toBe(false)` — currently receives `true`.
- **Root cause:** `next.config.mjs`'s `images.localPatterns` includes `{ pathname: '/media/**', search: '' }`, an unrestricted wildcard under `/media/`, so `hasLocalMatch` correctly (per the current pattern) also matches `/media/admin/private/original.jpg`. The test's intent (excluding an `/media/admin/` namespace) was never backed by a narrower pattern.
- **Confirmed pre-existing:** Verified via `git show 5640624f:frontend/src/components/ui/ResponsiveImage.config.test.ts` that this exact assertion existed unchanged before Plan 133-02, and Plan 133-02 does not modify `localPatterns` (only `dangerouslyAllowLocalIP` and `qualities`) — the failure is unrelated to 133-02's own edits.
- **Scope decision:** Out of scope for 133-02 (which is scoped to `dangerouslyAllowLocalIP` env-gating and `images.qualities`). Not auto-fixed per SCOPE BOUNDARY — fixing would require either narrowing `localPatterns` (an architectural change to an allow-list Task 1 was explicitly told not to touch) or removing the assertion, both out of this plan's authority.
- **Suggested follow-up:** A future plan touching `next.config.mjs`'s `localPatterns` should either narrow the `/media/**` pattern to exclude `/media/admin/**` or update/remove this stale assertion, whichever matches actual admin-media access requirements.
