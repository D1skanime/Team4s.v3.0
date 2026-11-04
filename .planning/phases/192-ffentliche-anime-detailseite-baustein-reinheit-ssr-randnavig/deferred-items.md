# Phase 192 — Deferred Items (out of scope, not fixed)

## 192-02

- `src/components/ui/ResponsiveImage.config.test.ts` ("allows only the configured Team4s API
  media namespace for responsive group logos") fails both in isolation and as part of the full
  suite, unrelated to any file this plan touches (`next.config.mjs`/env-derived remote-pattern
  matching). Confirmed pre-existing and out of this plan's scope (no file in
  `files_modified`/`<files>` for 192-02 overlaps `ResponsiveImage`/`next.config.mjs`). Not fixed
  per the scope-boundary rule — logged here instead of re-running builds to chase it.
