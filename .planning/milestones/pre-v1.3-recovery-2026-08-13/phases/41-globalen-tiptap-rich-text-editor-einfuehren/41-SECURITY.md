---
phase: 41
slug: 41-globalen-tiptap-rich-text-editor-einfuehren
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-14
---

# Phase 41 - Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser -> Admin content handlers | Untrusted TipTap JSON from admin clients is posted to note/story endpoints and must be validated before persistence. | Rich-text document JSON, role-scoped note metadata |
| Admin content handlers -> TipTap service | Shared backend conversion path transforms request JSON into sanitized HTML and extracted plaintext. | Parsed document tree, rendered HTML, plaintext summary |
| Release-version note handler -> repository | Release-version note writes must stay bound to the valid release/member/role context for the addressed version. | release_version_id, member_id, role_id, persisted note rows |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-41-01 | Tampering | TipTap JSON validation | mitigate | `TipTapService.ValidateJSON` enforces node/mark allowlists, rejects free color values, and is called before persistence in fansub-group, member-story, anime-project, and release-version note handlers. Evidence: [tiptap_service.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service.go:53), [admin_content_fansub_group_notes.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_fansub_group_notes.go:78), [admin_content_member_stories.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_member_stories.go:94), [admin_content_anime_project_notes.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_anime_project_notes.go:79), [admin_content_release_version_notes.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_release_version_notes.go:93) | closed |
| T-41-02 | Denial of Service | TipTap table payloads | mitigate | Backend validation caps tables at 30 rows, 6 columns per row, and rejects nested tables before recursive descent. Evidence: [tiptap_service.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service.go:69), [tiptap_service_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service_test.go:57) | closed |
| T-41-03 | Elevation of Privilege | Stored HTML rendering path | mitigate | Text is escaped during render and the final HTML is passed through a tight bluemonday policy, preventing stored script execution even if a crafted payload reaches render. Evidence: [tiptap_service.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service.go:126), [tiptap_service.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service.go:153), [tiptap_service.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service.go:360), [tiptap_service_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/services/tiptap_service_test.go:227) | closed |
| T-41-04 | Spoofing | Release-version note contributor context | mitigate | Release-version note writes remain admin-gated and repository-side validation only allows member/role pairs that belong to the addressed release version; updates cannot switch contributor identity. Evidence: [admin_content_release_version_notes.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_release_version_notes.go:15), [release_version_notes_repository.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/release_version_notes_repository.go:157), [release_version_notes_repository.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/release_version_notes_repository.go:187), [admin_content_release_version_notes_test.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_release_version_notes_test.go:12) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-14 | 4 | 4 | 0 | Codex (`$gsd-secure-phase`) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-14
