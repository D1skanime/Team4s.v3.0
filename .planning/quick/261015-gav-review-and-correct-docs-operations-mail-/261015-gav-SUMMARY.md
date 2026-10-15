---
status: complete
---

# Quick Task 261015-gav Summary: Review and correct docs/operations/mail-delivery.md

## What was done

Verified every factual claim in `docs/operations/mail-delivery.md` (173 lines)
against the current code:

- `backend/internal/services/mailer.go` (Mailer interface, SMTPMailer, NoopMailer)
- `backend/internal/config/config.go` (SMTP config block, `cfg.SMTPEnabled` toggle,
  `SMTP_FROM`/`SMTP_FROM_EMAIL` and `SMTP_USER`/`SMTP_USERNAME` fallback behavior)
- `backend/cmd/server/main.go` (mailer selection wiring)
- `docker-compose.yml` and `.env.example` (local env defaults)
- `backend/internal/handlers/app_auth_invitations.go` (`CreateFansubGroupInvitation`
  cancel-on-mail-fail path)
- `infra/keycloak/realm-team4s.json` (Keycloak Mailpit SMTP defaults)

## Findings

Two stale factual claims were found and corrected:

1. The "Lokaler Default" row for `APP_PUBLIC_URL` said `http://127.0.0.1:3002`
   (copied from `.env.example`), but the table's intro sentence promises the
   `docker-compose.yml` fallback, which is actually
   `${APP_PUBLIC_URL:-http://127.0.0.1:3000}`. Corrected to `3000` to match
   every other row in that table (which mirror the compose fallback exactly).
2. The "Verwandte Dateien" table pointed to `backend/internal/handlers/app_auth.go`
   for `CreateFansubGroupInvitation`; the function actually lives in
   `app_auth_invitations.go`. Corrected.

No ASCII-substitution umlauts (ae/oe/ue/ss where ä/ö/ü/ß belong) were found
anywhere in the file — German prose was already correct throughout.

All other claims checked out against the code: `SMTPMailer`/`NoopMailer`
selection logic, the `SMTP_FROM`/`SMTP_USER` canonical-name-with-fallback
description, the STARTTLS-enforcement claim, the Keycloak `KC_SMTP_*` env
mapping, and the 502/audit-event/cancel-on-fail error path.

## Files changed

- `docs/operations/mail-delivery.md` (2 lines changed, factual corrections only)

## Deviations from plan

None in scope. Operationally: the executor's first commit attempt
(`bc562022d`) accidentally bundled 13 unrelated pure-rename files
(`docs/* → docs/archiv/*`) that a concurrent live GSD quick-task writer
(261015-gaq, docs reorg/translation) had already staged in the shared index
at commit time (this repo runs GSD with `workflow.use_worktrees: false`, so
all quick tasks share one working tree per CLAUDE.md policy). This was caught
and corrected by the orchestrating agent: `git reset --soft HEAD~1` followed
by `git commit -- docs/operations/mail-delivery.md` (new commit `5e2d7fc6d`),
which restored the other task's 13 staged renames to exactly their
pre-incident state and left the final commit scoped to only the one file this
task was authorized to touch. No content was lost; verified via
`git diff HEAD~1 HEAD -- docs/operations/mail-delivery.md` showing exactly the
two intended line edits.

## Commit

`5e2d7fc6d` — docs(quick-261015-gav): fix stale APP_PUBLIC_URL default and
file path in mail-delivery.md
