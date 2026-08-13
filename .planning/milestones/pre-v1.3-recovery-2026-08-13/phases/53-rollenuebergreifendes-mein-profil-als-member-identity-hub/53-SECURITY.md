---
phase: 53
slug: rollenuebergreifendes-mein-profil-als-member-identity-hub
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-28
updated: 2026-05-28
---

# Phase 53 - Security

Per-phase security verification for the role-neutral `/me/profile` Member Identity Hub.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser -> profile API | Authenticated member profile read/update/avatar requests | Bearer-authenticated profile payloads, avatar multipart files |
| Profile API -> Keycloak-owned identity | Team4s reads account identity but must not mutate Keycloak-owned fields | E-mail, Keycloak subject, account display/status/roles |
| Profile API -> media storage | Avatar display and retained source files are written to controlled media storage | JPG/PNG/WEBP raster files, media metadata |
| Profile API -> member/media database | Profile fields and avatar ownership are persisted | `members`, `media_assets`, `media_files` rows |
| Profile UI -> public-ready profile sections | UI separates public/profile data from account/security data | Visibility, avatar URL, profile story, memberships, credits |

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-53-01 | Spoofing | `/api/v1/me/profile` read/update/avatar handlers | mitigate | Handlers require `CommentAuthIdentityFromContext`; missing auth returns 401. Evidence: `backend/internal/handlers/app_profile.go:50`, `:75`, `:130`. | closed |
| T-53-02 | Elevation of privilege | Disabled app user profile mutation | mitigate | Update and avatar upload reject disabled app users with 403; capabilities mark edit/upload unavailable. Evidence: `app_profile.go:85`, `:140`, `:290`. | closed |
| T-53-03 | Tampering | Keycloak-owned identity fields | mitigate | `email` and `keycloak_subject` are rejected on Team4s profile update; account data remains read-only in UI. Evidence: `app_profile.go:95`, `frontend/src/app/me/profile/page.tsx:331`. | closed |
| T-53-04 | Information disclosure | Profile visibility | mitigate | Runtime contract only allows `public` and `members_only`; invalid values fail validation and missing values default conservatively to `members_only`. Evidence: `member_profile_repository.go:61`, `:344`, `shared/contracts/openapi.yaml:6468`. | closed |
| T-53-05 | Tampering | Avatar upload file type | mitigate | Avatar validation uses detected MIME, allows only JPG/PNG/WEBP, rejects SVG/other types, enforces existing image size limit. Evidence: `app_profile.go:44`, `:405`, `:418`, OpenAPI `:362`. | closed |
| T-53-06 | Information disclosure | Retained uncropped avatar source | mitigate | Backend stores cropped display as `original` and uncropped source as `source_original`; profile reads join only `media_files.variant = 'original'`. Evidence: `member_profile_repository.go:152`, `:161`, `:297`; OpenAPI `:6676`. | closed |
| T-53-07 | Tampering / repudiation | Avatar replacement cleanup | mitigate | New avatar files are removed on save/link failure; old avatar DB rows and physical directory are removed only after new avatar attach succeeds; avatar update writes audit log. Evidence: `app_profile.go:249`, `:255`, `:262`; `member_profile_repository.go:178`. | closed |
| T-53-08 | XSS | Profile story rich text | mitigate | Profile story persists as plain text; TipTap rich persistence and sanitized HTML rendering are explicitly deferred, so no unchecked HTML render path is introduced. Evidence: `frontend/src/app/me/profile/page.tsx:30`, `:243`; `ProfileStoryCard.tsx:16`; OpenAPI `:6591`. | closed |
| T-53-09 | Authorization / CSRF boundary | Frontend profile API calls | mitigate | Profile page uses central API helpers and auth session; no page-local bearer construction or ad hoc protected fetch was introduced. Evidence: `frontend/src/app/me/profile/page.tsx:7`; `frontend/src/lib/api.ts:2696`, `:2730`; `src/lib/api.no-token-boundary.test.ts`. | closed |
| T-53-10 | Information disclosure | Admin navigation in non-admin profile shell | mitigate | AppShell filters admin navigation by `canAccessAdmin`; verifier confirmed non-admin users do not get `Verwaltung` group in the shell. Evidence: `frontend/src/components/layout/AppShell.tsx:82`; `53-VERIFICATION.md`. | closed |
| T-53-11 | Data ownership | Avatar media domain attachment | mitigate | Avatar media stays on `members.avatar_media_id` plus `media_assets`/`media_files` with media type `avatar`; no release/group/anime media tables are used. Evidence: `member_profile_repository.go:133`, `:145`, `:170`; `53-VERIFICATION.md`. | closed |

## Accepted Risks Log

No accepted risks.

## Human / Live Security Checks Remaining

These are already persisted as human UAT rather than open implementation threats:

| Check | Status | Source |
|-------|--------|--------|
| Live non-admin `/me/profile` route and shell smoke | pending UAT | `53-HUMAN-UAT.md` |
| Live avatar crop/upload smoke, including SVG rejection and cropped public URL | pending UAT | `53-HUMAN-UAT.md` |
| Mobile/accessibility visual pass for focus, touch, and dialog behavior | pending UAT | `53-HUMAN-UAT.md` |
| Live Keycloak account-return flow with dirty Team4s fields | pending UAT | `53-HUMAN-UAT.md` |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-28 | 11 | 11 | 0 | Codex secure-phase inline audit |

## Verification Commands

| Command | Result |
|---------|--------|
| `cd backend && go test ./internal/handlers ./internal/repository` | passed |
| `cd frontend && npm run test -- --run "src/app/me/profile/page.test.tsx" "src/components/layout/AppShell.test.tsx" "src/components/media/crop/AvatarCropDialog.test.tsx"` | passed |
| `cd frontend && npm test -- --run src/lib/api.no-token-boundary.test.ts src/components/editor/RichTextEditor.test.tsx` | passed |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-28
