# WORKING_NOTES

## 2026-05-21 - Phase 49 Notes
- Phase 49 is verified `PASS_WITH_NOTES`; the important part is that the notes are bounded, not blockers.
- Central client ownership includes token reads, token persistence, refresh coordination, bearer headers, 401 retry, upload/XHR auth, and auth-state resync.
- Normal app pages/components should not receive, store, pass, or read raw token strings. Use token-free session booleans/display name/current-user/capabilities instead.
- Static no-token gates are now part of the protection surface; keep allowlists explicit and separate for auth entrypoint, SSR, streaming, tests/docs, and public/no-auth fetches.
- SSR pages such as `/watchlist` and `/anime/[id]` are server-side auth boundaries for this phase.
- Jellyfin/streaming routes are documented server-side relay boundaries; future per-user stream grants should be a separate phase, not casual cleanup inside normal API auth.
- Full lint failure is unrelated to Phase 49 and currently points at `ReleaseVersionMediaSection.test.tsx`, `app/dev/ui-system/page.tsx`, and `tmp-live-full-flow*.js`.
- Final Phase 49 planning artifacts are committed in `b9b078c6`.
