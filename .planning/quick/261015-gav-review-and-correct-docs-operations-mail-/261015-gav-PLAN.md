# Quick Task 261015-gav: Review and correct docs/operations/mail-delivery.md

**Mode:** quick
**Status:** Executed

## Task Boundary

Review `docs/operations/mail-delivery.md` (173-line German operational runbook)
and verify its factual claims about local Mailpit usage and the production
Mailjet SMTP switch against the current code: `backend/internal/services/mailer.go`
(Mailer interface, SMTPMailer, NoopMailer) and `backend/internal/config/config.go`
(SMTP config block, `cfg.SMTPEnabled` toggle). Spot-check env var names and any
config fallback behavior described in the doc against `config.go`, and correct
anything stale. If any ASCII-substitution umlauts (ae/oe/ue/ss where ä/ö/ü/ß
belong) exist, fix them to real umlauts. Do not change scope or structure of
the runbook. Only `docs/operations/mail-delivery.md` may be modified, and only
if changes are actually needed.

## Tasks

### Task 1 — Verify claims against code

Read the doc fully. Read `mailer.go`, `config.go`, `main.go`,
`docker-compose.yml`, `.env.example` fully. Diff every doc claim (env var
names, fallback behavior, Mailpit/Mailjet switch description, "Verwandte
Dateien" file references) against the code. List every discrepancy found
plus every ASCII-umlaut substitution found.

**Done when:** a concrete list of discrepancies (or an explicit "none found")
exists.

### Task 2 — Apply corrections (conditional)

If Task 1 found discrepancies or ASCII-umlaut substitutions, apply targeted
corrections to `docs/operations/mail-delivery.md` only, preserving existing
scope/structure. If Task 1 found nothing wrong, make no edit and state that
explicitly.

**Done when:** the file's factual claims match the code, or the file was
confirmed already accurate and left untouched.

## Outcome

Two real discrepancies were found and corrected (see
`261015-gav-SUMMARY.md`). No ASCII-umlaut substitutions were found.
