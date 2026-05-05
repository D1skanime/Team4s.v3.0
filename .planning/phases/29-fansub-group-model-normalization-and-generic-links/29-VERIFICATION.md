# Phase 29 Verification

Status: PARTIAL - automated build/test checks passed on 2026-04-29; live browser/UAT for generic links and collaboration-member admin is still pending.

## Scope

- Fansub group profile contract is canonicalized around `fansub_groups` plus generic `fansub_group_links`.
- Fansub admin create/edit uses generic community-link rows for `website`, `discord`, `twitter`, `github`, and `irc`.
- Collaboration-member management is explicit on the fansub edit page.
- Legacy duplicate fields are documented as compatibility-only rather than equal product truth.

## Automated Checks

### Backend Tests

Command:
```bash
cd backend && go test ./internal/repository ./internal/handlers -count=1
```

Result:
```text
ok   team4s.v3/backend/internal/repository
ok   team4s.v3/backend/internal/handlers
```

Status: PASSED

### Frontend Build

Command:
```bash
cd frontend && npm.cmd run build
```

Result:
```text
Next.js production build completed successfully.
```

Status: PASSED

## Manual Verification Still Needed

- [ ] Create one fansub on `/admin/fansubs/create` using at least `twitter` and `github` link rows, save, then reload in edit and confirm they round-trip.
- [ ] Open one persisted collaboration group on `/admin/fansubs/:id/edit`, add one member group, reload, then remove it again.
- [ ] Confirm fixed legacy fields are no longer the only editable link surface.

## Notes

- `website_url`, `discord_url`, and `irc_url` are now compatibility projections sourced from canonical `fansub_group_links`.
- `closed_year` and `history_description` remain transitional read fields and were intentionally not hard-dropped in Phase 29.
