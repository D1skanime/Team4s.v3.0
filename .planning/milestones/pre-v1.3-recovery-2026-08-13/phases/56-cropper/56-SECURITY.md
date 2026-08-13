---
phase: 56
slug: cropper
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-29
updated: 2026-05-29
---

# Phase 56 Security Review: Cropper

## Result

Security review passed. No open threats remain for Phase 56.

Phase 56 did not add upload endpoints, backend handlers, database tables, media ownership mappings, or auth/session primitives. The shared cropper is client-side image export infrastructure only; profile avatar and fansub group logo flows still use their existing domain-specific upload helpers and ownership seams.

## Scope

- Shared cropper component: `frontend/src/components/media/crop/Team4sCropper.tsx`
- Profile avatar wrapper: `frontend/src/components/media/crop/AvatarCropDialog.tsx`
- Fansub group media upload integration: `frontend/src/components/admin/MediaUpload.tsx`
- Upload/auth seams: `uploadOwnProfileAvatar`, `uploadFansubMedia`, `authorizedUploadXhr`
- Regression evidence in `56-UAT.md` and Phase 56 summary files

No explicit `threat_model` block was present in the Phase 56 plan files, so this review derived the threat register from the actual plan artifacts, UAT evidence, and touched implementation.

## Trust Boundaries

1. User-selected local image file enters the browser cropper as untrusted image bytes and file metadata.
2. `Team4sCropper` converts the selected image into a browser object URL, decodes it, and exports a bounded canvas result as a new `File`.
3. Domain-specific callers receive the cropped `File` and pass it to existing upload helpers.
4. Profile avatar upload remains on `uploadOwnProfileAvatar` with source-original plus cropped-display semantics.
5. Fansub group logo upload remains on `uploadFansubMedia` and group media ownership.
6. Existing group logo recrop loads a backend-provided public media URL through an unauthenticated browser fetch.
7. SVG group logos bypass raster cropper/canvas conversion and stay on the existing upload path.

## Threat Register

| ID | Category | Threat | Status | Evidence |
|---|---|---|---|---|
| T-56-01 | Spoofing / Authorization | Cropper migration could bypass central auth/API seams or construct local bearer headers. | Closed | `Team4sCropper` and `MediaUpload` do not read tokens or accept token-shaped props. Uploads still call `uploadOwnProfileAvatar` or `uploadFansubMedia`; `uploadFansubMedia` delegates to `authorizedUploadXhr`, which owns refresh and bearer attachment centrally. |
| T-56-02 | Tampering / Ownership | Cropped files could be attached to the wrong domain entity by merging profile, fansub group, release, or anime media flows. | Closed | `AvatarCropDialog` returns `{ sourceFile, croppedFile }` for the profile avatar contract. `MediaUpload` still sends `fansubID`, `type`, and the cropped file through `uploadFansubMedia`. No backend, endpoint, DB table, release, release-version, anime, or episode media path changed. |
| T-56-03 | Information Disclosure | The retained avatar source original could become the public/displayed avatar instead of the cropped display derivative. | Closed | Phase 56 preserved the existing profile avatar upload contract. UAT verified existing-avatar recrop uses `source_original_url`, while saved display refreshes from the upload response public URL. |
| T-56-04 | XSS / Content Handling | SVG logos could be decoded or rasterized through canvas, changing the security/fidelity contract for active SVG content. | Closed | Raster logos open the cropper; SVG logos upload directly through the existing group media path. Existing SVG edit shows a scoped error instead of opening the cropper. Regression tests cover direct SVG upload without cropper conversion. |
| T-56-05 | Denial of Service | Large or malformed images could cause excessive client-side decode/canvas work. | Closed | Fansub logo/banner pre-validation keeps existing 2 MB / 5 MB limits. Avatar backend validation remains authoritative. Cropper output is bounded by configured export dimensions such as 512x512. No server-side decoder limits were weakened. |
| T-56-06 | Information Disclosure / Token Leakage | Existing logo recrop could leak auth headers to a public media URL. | Closed | The existing-logo recrop fetch uses `fetch(sourceURL, { cache: 'no-store' })` without auth headers. Tests assert no token-shaped arguments or headers are passed through this path. |
| T-56-07 | Repudiation / Audit | Client-side cropper could obscure upload attribution or bypass existing backend audit ownership. | Closed | The cropper performs no persistence. Upload attribution remains in existing backend/profile/fansub upload handlers and central authorized upload transport. |

## Verification Evidence

- `56-UAT.md` reports authenticated live UAT passed on 2026-05-29.
- Frontend cropper, avatar, media upload, and profile tests passed during Phase 56 verification.
- `npm run typecheck` passed during Phase 56 verification.
- Focused ESLint and `npm run build` passed during Phase 56 verification.
- Security review source inspection confirmed no new auth, upload endpoint, database, or media ownership seam was introduced.

## Accepted Risks

None.

## Follow-Up

No Phase 56 security follow-up is required. Broader image upload hardening remains owned by the existing backend upload validation and media security baseline, not this UI cropper slice.

## Sign-Off

- [x] Threat register reviewed
- [x] Auth/API boundary preserved
- [x] Media ownership boundary preserved
- [x] No open security threats
- [x] Phase can advance from the security gate
