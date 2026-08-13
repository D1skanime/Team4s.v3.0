---
phase: 53
slug: rollenuebergreifendes-mein-profil-als-member-identity-hub
status: partial
nyquist_compliant: false
wave_0_complete: true
created: 2026-05-28T15:05:05+02:00
updated: 2026-05-28T15:05:05+02:00
---

# Phase 53 - Validation Strategy

Phase 53 has broad automated coverage for the role-neutral `/me/profile` hub, the authenticated shell, account/profile separation, avatar upload/source retention, crop primitives, activity-year validation, API contract alignment, and backend ownership. The remaining validation limits are true live/browser gates and are documented as manual-only.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest/jsdom for frontend, Go test for backend |
| **Config file** | `frontend/package.json`, Go package tests |
| **Quick run command** | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx src/components/layout/AppShell.test.tsx` |
| **Full suite command** | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx src/components/layout/AppShell.test.tsx src/components/media/crop/mediaCropMath.test.ts src/components/media/crop/mediaCropA11y.test.ts src/components/media/crop/AvatarCropDialog.test.tsx && cd ../backend && go test ./internal/handlers ./internal/repository` |
| **Estimated runtime** | ~70 seconds for the focused validation suite |

## Sampling Rate

- **After every task commit:** Run the quick profile/shell suite.
- **After every plan wave:** Run the focused validation suite plus `npm run typecheck`.
- **Before `$gsd-verify-work`:** Focused frontend/backend validation must be green; live browser checks remain manual-only.
- **Max feedback latency:** ~70 seconds for the focused suite.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 53-01-00 | 01 | 1 | MEMBER-PROFILE-HUB-01 | - | Reusable shell gives non-admin members `/me/profile`, hides admin nav, opens mobile nav from the header. | unit | `cd frontend && npm run test -- --run src/components/layout/AppShell.test.tsx` | yes | green |
| 53-01-01 | 01 | 1 | MEMBER-PROFILE-HUB-01 | - | `/admin/profile` remains only a transition wrapper around the neutral profile implementation. | unit | `cd frontend && npm run test -- --run src/app/admin/profile/page.test.tsx` | yes | green |
| 53-01-02 | 01 | 1 | MEMBER-PROFILE-HUB-01 | - | `/me/profile` loads real profile aggregate data and does not leak admin naming or fake routes. | unit | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |
| 53-01-03 | 01 | 1 | MEMBER-PROFILE-HUB-01 | - | Team4s-editable fields stay separate from read-only account display data; `display_name`, e-mail, and Keycloak subject are not sent by the profile save path. | unit | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |
| 53-01-04 | 01 | 1 | MEMBER-PROFILE-HUB-01 | - | German role/status/visibility labels are centralized for profile UI. | unit/static | `cd frontend && npx eslint src/lib/profileLabels.ts` | yes | green |
| 53-01-05 | 01 | 1 | MEMBER-PROFILE-HUB-01 | - | Own-profile API contract is documented for read/update/avatar endpoints. | contract review | `rg -n "/api/v1/me/profile|MemberProfileResponse|UpdateMemberProfileRequest" shared/contracts/openapi.yaml` | yes | green |
| 53-02-01 | 02 | 1 | MEMBER-PROFILE-HUB-01 | - | Avatar crop math keeps 1:1/circular geometry bounded and deterministic. | unit | `cd frontend && npm test -- --run src/components/media/crop/mediaCropMath.test.ts` | yes | green |
| 53-02-02 | 02 | 1 | MEMBER-PROFILE-HUB-01 | - | Avatar crop keyboard/focus helpers support focus trap and keyboard movement. | unit | `cd frontend && npm test -- --run src/components/media/crop/mediaCropA11y.test.ts` | yes | green |
| 53-02-03 | 02 | 1 | MEMBER-PROFILE-HUB-01 | - | Avatar crop dialog supports pointer/keyboard interaction and Escape close in jsdom. | component | `cd frontend && npm test -- --run src/components/media/crop/AvatarCropDialog.test.tsx` | yes | green |
| 53-02-04 | 02 | 1 | MEMBER-PROFILE-HUB-01 | T-53-02 | Avatar upload rejects unsafe types, accepts source/cropped payloads, and does not expose `source_original` as public avatar URL. | backend | `cd backend && go test ./internal/handlers ./internal/repository` | yes | green |
| 53-02-05 | 02 | 1 | MEMBER-PROFILE-HUB-01 | - | Activity-year validation blocks invalid years instead of coercing them to `null`; month-level contract remains deferred. | unit | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |
| 53-02-06 | 02 | 1 | MEMBER-PROFILE-HUB-01 | T-53-03 | Keycloak-return refresh uses central auth/profile seams and preserves dirty Team4s fields. | unit + live | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |
| 53-02-07 | 02 | 1 | MEMBER-PROFILE-HUB-01 | - | Profile story remains plain text; unsafe rich HTML rendering is not introduced. | unit/static | `cd frontend && npm test -- --run src/components/editor/RichTextEditor.test.tsx` | yes | green |
| 53-02-08 | 02 | 1 | MEMBER-PROFILE-HUB-01 | - | Contributions remain aggregate-only with honest disabled/detail-deferred state. | unit | `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx` | yes | green |

*Status: green = command was run or is covered by a green command recorded in `53-VERIFICATION.md`, `53-HUMAN-UAT.md`, or this validation audit.*

## Wave 0 Requirements

Existing infrastructure covers all Phase 53 validation needs:

- `frontend/src/app/me/profile/page.test.tsx`
- `frontend/src/components/layout/AppShell.test.tsx`
- `frontend/src/components/media/crop/mediaCropMath.test.ts`
- `frontend/src/components/media/crop/mediaCropA11y.test.ts`
- `frontend/src/components/media/crop/AvatarCropDialog.test.tsx`
- `backend/internal/handlers/app_auth_test.go`
- `backend/internal/repository/member_profile_repository_test.go`

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Live non-admin `/me/profile` route and shell smoke | MEMBER-PROFILE-HUB-01 | Requires real browser auth/session role context. | Sign in as normal member, open `/me/profile` and `/admin/profile`; verify neutral shell and no Verwaltung/admin framing. | passed in `53-HUMAN-UAT.md` |
| Live avatar crop/upload smoke | MEMBER-PROFILE-HUB-01 | Native file picker, image decoding, canvas export, touch/pointer behavior, and served media URLs cannot be fully proven in jsdom. | Upload JPG/PNG/WEBP, crop via pointer/keyboard, try SVG, verify public avatar is cropped and `source_original` is not public. | issue; routed to global cropper library follow-up |
| Mobile/accessibility visual pass | MEMBER-PROFILE-HUB-01 | Visual overlap, touch target feel, and focus feel require real viewport/device review. | Check desktop/tablet/mobile, tab through controls and crop dialog, verify focus, touch sizing, no overlap. | issue; immediate fixes applied, profile hub content redesign follow-up captured |
| Live Keycloak account-return flow | MEMBER-PROFILE-HUB-01 | Requires live Keycloak Account Console in a separate browser tab. | Change first/last name in Keycloak, return to Team4s, verify Account card refresh and dirty Team4s fields survive. | passed in `53-HUMAN-UAT.md` |

## Validation Audit 2026-05-28

| Metric | Count |
|--------|-------|
| Gaps found | 3 |
| Resolved with additional automated tests | 2 |
| Manual-only / live-browser gates | 3 |

Additional tests added during this audit:

- `frontend/src/app/me/profile/page.test.tsx` now asserts the account display name is not an editable profile field and that save stays disabled until Team4s-owned data changes.
- `frontend/src/components/layout/AppShell.test.tsx` now asserts the mobile navigation opens from the header button, not only that it starts collapsed.

Commands run during this audit:

- `cd frontend && npm run test -- --run src/app/me/profile/page.test.tsx src/components/layout/AppShell.test.tsx` - passed, 17 tests.
- `cd frontend && npm run typecheck` - passed.
- `cd frontend && npx eslint src/app/me/profile/page.test.tsx src/components/layout/AppShell.test.tsx` - passed.
- `cd frontend && npm test -- --run src/components/media/crop/mediaCropMath.test.ts src/components/media/crop/mediaCropA11y.test.ts src/components/media/crop/AvatarCropDialog.test.tsx` - passed, 19 tests.
- `cd backend && go test ./internal/handlers ./internal/repository` - passed.
- `git diff --check` - passed with only LF/CRLF working-copy warnings.

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual-only justification.
- [x] Sampling continuity: no 3 consecutive tasks without automated verification.
- [x] Wave 0 covers all missing automated references that can be reasonably automated.
- [x] No watch-mode flags are used.
- [x] Feedback latency is under 70 seconds for focused validation.
- [ ] `nyquist_compliant: true` set in frontmatter.

**Approval:** partial 2026-05-28. Phase 53 is validated with additional automated tests plus manual-only live gates; it is not fully Nyquist-compliant because avatar crop/file-picker/canvas/touch and visual mobile checks remain live-browser concerns and one cropper issue is intentionally routed to a follow-up phase.
