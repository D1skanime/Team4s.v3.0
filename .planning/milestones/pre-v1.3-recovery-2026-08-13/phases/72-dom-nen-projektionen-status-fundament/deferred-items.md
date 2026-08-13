# Deferred Items

## 72-04 Out-of-Scope Verification Findings

- `npx @redocly/cli lint shared/contracts/openapi.yaml` still fails on pre-existing contract issues outside the 72-04 additions: nullable `$ref` siblings in profile/admin/fansub schemas and an existing `BearerAuth` security-scheme mismatch. The 72-04-added schemas no longer trigger Redocly-specific errors after switching nullable `review_status` to an inline enum.
- `npm run lint` still fails on pre-existing frontend files outside the 72-04 scope, notably `frontend/src/app/dev/ui-system/page.tsx` (`react-hooks/set-state-in-effect`) and `frontend/src/app/me/profile/components/ClaimStatusCard.tsx` (`react/no-unescaped-entities`), plus existing UI-system warnings for native controls.
