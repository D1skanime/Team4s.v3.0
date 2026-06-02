---
phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/config/config.go
  - backend/internal/handlers/app_auth.go
  - backend/internal/handlers/app_auth_test.go
  - backend/internal/services/mailer.go
  - backend/internal/services/mailer_test.go
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
  - shared/contracts/openapi.yaml
  - shared/contracts/fansubs.yaml
  - infra/keycloak/realm-team4s.json
  - docker-compose.yml
  - .env.example
findings:
  critical: 2
  warning: 7
  info: 3
  total: 12
status: issues_found
---

# Phase 60: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This phase adds a `net/smtp` mailer service, config wiring for SMTP, and a cancel-on-fail
flow in `CreateFansubGroupInvitation` (SMTP failure -> cancel invitation, audit without raw
token, return 502). The handler-level cancel-on-fail logic is well-tested and the audit/raw-token
separation (D-11/D-12) is sound — tests prove the token never reaches the audit payload and that
the invitation is cancelled on send failure. No real secrets are committed; placeholders only.

However, two BLOCKER-class defects undermine the feature in production:

1. **SMTP env var names do not match between config code and the deployment surface**
   (`docker-compose.yml` / `.env.example`). Production credentials and the sender address as
   documented will be silently ignored, leaving SMTP auth disabled and the wrong From address.
2. **The `StartTLS` flag does not do STARTTLS** — when set it opens an *implicit* TLS connection,
   and STARTTLS is otherwise only attempted opportunistically. The transport security behavior
   does not match the configuration contract, which is a confidentiality risk for invite links
   and credentials over the wire.

Several WARNING-level robustness issues in the mailer (ignored DATA-close error, header
injection, MIME encoding, no `Quit()`) should be fixed before this ships to a real SMTP provider.

## Critical Issues

### CR-01: SMTP env var names mismatch between config and deployment — credentials/From silently ignored

**File:** `backend/internal/config/config.go:112-115`, `docker-compose.yml:97-99`, `.env.example:56-72`

**Issue:**
`config.go` reads the sender from `SMTP_FROM_EMAIL` and auth from `SMTP_USERNAME` / `SMTP_PASSWORD`:

```go
SMTPUsername:  strings.TrimSpace(os.Getenv("SMTP_USERNAME")),
SMTPPassword:  os.Getenv("SMTP_PASSWORD"),
SMTPFromEmail: getEnv("SMTP_FROM_EMAIL", "noreply@team4s.local"),
```

But every deployment surface uses *different* names:

- `docker-compose.yml:99` sets `SMTP_FROM` (not `SMTP_FROM_EMAIL`) for the backend.
- `.env.example:58` documents `SMTP_FROM`, and `.env.example:71` documents `SMTP_USER` (not `SMTP_USERNAME`).

Consequences:
- The documented production Mailjet flow (`SMTP_USER=<api-key>`, `SMTP_PASSWORD=<secret>`) never
  authenticates: `SMTPUsername` stays empty, so `mailer.go:106` skips `client.Auth` entirely.
  The send will be rejected (or, worse, relayed unauthenticated) — not the intended behavior.
- The configured `SMTP_FROM` is ignored; the hard-coded default `noreply@team4s.local` is always
  used, which will fail SPF/DKIM at a real provider.

This is a wiring defect that makes the production path non-functional while passing all unit tests
(tests construct `MailerConfig` directly and never exercise env parsing).

**Fix:** Pick one canonical name set and align all three files. Recommended — make config accept the
documented names:

```go
// config.go
SMTPUsername:  strings.TrimSpace(getEnv("SMTP_USER", os.Getenv("SMTP_USERNAME"))),
SMTPFromEmail: getEnv("SMTP_FROM", getEnv("SMTP_FROM_EMAIL", "noreply@team4s.local")),
```

and add the missing vars to the backend service in `docker-compose.yml`
(`SMTP_ENABLED`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_STARTTLS`, `SMTP_FROM_NAME`, `APP_PUBLIC_URL`).
Note `docker-compose.yml` also never sets `SMTP_ENABLED`, so the backend mailer defaults to Noop
even though Mailpit is running — see WR-06.

### CR-02: `StartTLS` flag performs implicit TLS, not STARTTLS — transport security does not match config

**File:** `backend/internal/services/mailer.go:81-104`

**Issue:**
The field is named `StartTLS`, the env is `SMTP_STARTTLS`, and the comment claims STARTTLS, but the
code does the opposite:

```go
if m.cfg.StartTLS {
    conn, dialErr = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: m.cfg.Host})
} else {
    conn, dialErr = dialer.DialContext(ctx, "tcp", addr)
    ...
    // STARTTLS only attempted in the !StartTLS branch, opportunistically
}
```

- When `SMTP_STARTTLS=true`, it opens an **implicit TLS** socket (SMTPS, typically port 465). For a
  provider like Mailjet on port 587 (the documented `.env.example` value), this handshake will fail
  or hang — `StartTLS=true` + `port 587` is misconfigured by construction.
- When `SMTP_STARTTLS=false`, STARTTLS is attempted only *if the server advertises it*
  (`mailer.go:99`). Against a server that does not advertise STARTTLS, the credentials and message —
  including the one-time invite token in the body — are sent in **plaintext** with no error. There is
  no "require TLS" mode, so a downgrade/MITM cannot be detected.

The net effect: the only way to reach a real provider on 587 (STARTTLS) is to set
`SMTP_STARTTLS=false` and *hope* STARTTLS is advertised and succeeds — the flag's name and the config
contract are inverted/misleading, and confidentiality is not guaranteed for any setting.

**Fix:** Make the flag mean what it says and add an explicit transport mode. Minimal correction —
treat `StartTLS` as "require STARTTLS after plaintext connect", and add a separate implicit-TLS path
only if needed:

```go
conn, dialErr = dialer.DialContext(ctx, "tcp", addr) // always start plaintext
// ...
client, err := smtp.NewClient(conn, m.cfg.Host)
// ...
if m.cfg.StartTLS {
    if ok, _ := client.Extension("STARTTLS"); !ok {
        return fmt.Errorf("mailer: Server bietet kein STARTTLS an, Verbindung abgebrochen")
    }
    if err := client.StartTLS(&tls.Config{ServerName: m.cfg.Host}); err != nil {
        return fmt.Errorf("mailer: STARTTLS-Upgrade fehlgeschlagen: %w", err)
    }
}
```

If implicit TLS (SMTPS/465) must be supported, introduce a distinct `ImplicitTLS bool` rather than
overloading `StartTLS`. Either way, the documented 587/Mailjet path must be reachable with the
flag values shown in `.env.example`.

## Warnings

### WR-01: DATA finalization error is swallowed — a server-rejected mail is reported as sent

**File:** `backend/internal/services/mailer.go:121-132`

**Issue:** The DATA writer is closed via `defer wc.Close()` and `Send` returns `nil` immediately
after `wc.Write(...)` succeeds. For SMTP, the server's accept/reject of the message body is reported
on the **final `wc.Close()`** (the `.\r\n` terminator response), not on `Write`. By deferring the
close and ignoring its error, a message the server rejects at DATA-end (over quota, content
rejected, greylisted) is treated as a successful send. This breaks the cancel-on-fail guarantee
(D-12): the invitation stays `pending` even though no mail was delivered.

**Fix:** Close explicitly and check the error before returning success:

```go
if _, err := wc.Write([]byte(rawMsg)); err != nil {
    _ = wc.Close()
    return fmt.Errorf("mailer: Nachricht konnte nicht gesendet werden: %w", err)
}
if err := wc.Close(); err != nil {
    return fmt.Errorf("mailer: Nachricht wurde vom Server abgelehnt: %w", err)
}
```

Remove the `defer wc.Close()` so the error is not double-handled.

### WR-02: No CRLF sanitization on To/From — SMTP header injection via attacker-controlled email

**File:** `backend/internal/services/mailer.go:113-119`, `137-141`

**Issue:** Only the Subject strips `\r\n` (`mailer.go:141`). The recipient (`msg.To`), the From
address/name, and the body are written into raw headers without sanitization. The invitation email
is `created.Invitation.Email`, which originates from admin request input
(`app_auth.go:360-364` -> `created.Invitation.Email`). A value containing `\r\n` (e.g.
`a@b.com\r\nBcc: victim@x.com`) would inject extra headers into the outgoing message. `client.Rcpt`
will reject a malformed envelope address, but the injected value still lands in the `To:` *header*
built by `buildRawMessage`, enabling header smuggling independent of the envelope.

**Fix:** Reject or strip CR/LF in all address/name/header fields before building the message, e.g. a
shared `stripCRLF(s)` applied to To, From email, From name; and validate the recipient with
`net/mail.ParseAddress` up front, returning an error on failure.

### WR-03: Subject/body MIME encoding — non-ASCII subjects emitted as raw UTF-8 bytes

**File:** `backend/internal/services/mailer.go:141`

**Issue:** The `Subject:` header is written as raw bytes. The current subject
("Einladung zur Fansub-Gruppe") is ASCII so it works today, but any subject containing umlauts (which
the project's German-language rule actively encourages) violates RFC 5322/2047 — header values must
be ASCII, with non-ASCII encoded as RFC 2047 encoded-words. Some MTAs will mangle or reject such
headers. This is a latent correctness bug given the German UI requirement.

**Fix:** Encode non-ASCII headers, e.g. `mime.QEncoding.Encode("utf-8", subject)` and similarly for a
display name in the From header. Bodies are fine (declared `charset=UTF-8` in the MIME parts).

### WR-04: `client.Quit()` is never called — connection torn down without graceful QUIT

**File:** `backend/internal/services/mailer.go:91-95, 132`

**Issue:** On the success path the function returns after writing DATA; the SMTP session is closed via
`defer conn.Close()` / `defer client.Close()` (hard TCP close) without sending `QUIT`. Some strict
servers log this as an aborted session and a few may not commit the message reliably. Combined with
WR-01, the absence of a clean `Quit()` means the final server acknowledgement is never observed.

**Fix:** After a successful `wc.Close()`, call `client.Quit()` and surface its error:

```go
if err := client.Quit(); err != nil {
    return fmt.Errorf("mailer: QUIT fehlgeschlagen: %w", err)
}
```

### WR-05: STARTTLS upgrade reuses no minimum TLS version; opportunistic path has no failure mode

**File:** `backend/internal/services/mailer.go:99-104`

**Issue:** When the server advertises STARTTLS in the `!StartTLS` branch and the upgrade *fails*, the
code returns an error (good). But when the server simply does not advertise STARTTLS, the code
proceeds in plaintext silently (the root of CR-02). Additionally, the `tls.Config` sets only
`ServerName` and no `MinVersion`, so the connection can negotiate down to TLS 1.0/1.1 depending on
the Go default at build time. For a service handling auth credentials this should pin
`MinVersion: tls.VersionTLS12`.

**Fix:** Add `MinVersion: tls.VersionTLS12` to both `tls.Config` literals, and make the
"no STARTTLS advertised" case an error when transport security is required (see CR-02).

### WR-06: docker-compose never sets `SMTP_ENABLED` — Mailpit is wired but the mailer stays Noop

**File:** `docker-compose.yml:94-131`

**Issue:** The backend service block sets `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, but never
`SMTP_ENABLED`. In `config.go:109` the default is `false`, so `main.go:130` selects the
`NoopMailer` and logs "kein Mailversand". The `team4sv30-mailpit` service exists and the realm/KC
SMTP is wired, yet the *application* invitation mail path is silently disabled in the default compose
environment. A developer following the compose setup will see invitations succeed with no mail and
no error, which directly contradicts the phase intent.

**Fix:** Add `SMTP_ENABLED: ${SMTP_ENABLED:-true}` (and the other missing SMTP vars from CR-01) to
the backend service environment so the local flow actually exercises Mailpit.

### WR-07: `APP_PUBLIC_URL` not provided to backend in compose — invite links fall back to localhost:3002

**File:** `docker-compose.yml:94-131`, `backend/internal/config/config.go:117`

**Issue:** The invite URL is built as `h.appPublicURL + created.InviteLink`
(`app_auth.go:383`). `AppPublicURL` defaults to `http://localhost:3002` (`config.go:117`) and is
never set in the backend compose environment. In any environment where the public frontend URL
differs (the compose frontend is published on host `3002` but a real deployment will differ), the
emailed accept link will point at the wrong origin, making invitations unusable. Because the value
is only consumed for the mailed link, this fails silently.

**Fix:** Add `APP_PUBLIC_URL: ${APP_PUBLIC_URL:-http://127.0.0.1:3002}` to the backend service
environment and document it in `.env.example`.

## Info

### IN-01: Success audit `Outcome: "allowed"` for a create event is semantically odd

**File:** `backend/internal/handlers/app_auth.go:428`

**Issue:** The created-invitation audit entry uses `Outcome: "allowed"`. Other create flows in the
same file do the same (e.g. member create, `app_auth.go:657`), so this is consistent, but "allowed"
reads as an authorization-decision outcome rather than a mutation result. Consider `"success"` for
mutation outcomes in a future cleanup. Not blocking.

### IN-02: Test helper field-name comments use ASCII umlaut substitutions

**File:** `backend/internal/services/mailer_test.go:17, 29, 45, 48` and others

**Issue:** Test failure strings use `zurueckgeben`, `Empfaenger`, etc. Per CLAUDE.md the umlaut rule
explicitly exempts comments and non-user-facing strings, and `t.Fatalf` messages are not user-facing
product strings, so this is within the documented exception. Flagged only for awareness — no change
required. (The production string at `mailer.go:54` correctly uses `Empfänger-Adresse`.)

### IN-03: `MailMessage.FromEmail`/`FromName` overrides are dead in the current flow

**File:** `backend/internal/services/mailer.go:18-20, 57-64`; `backend/internal/handlers/app_auth.go:387-392`

**Issue:** `Send` supports per-message `FromEmail`/`FromName` overrides, but the only caller never
sets them, so the branch is currently untested dead surface. Either add a test that exercises the
override or drop the fields until a caller needs them. Low priority.

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
