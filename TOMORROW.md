# TOMORROW

## Top 3 Priorities
1. Define canonical anime/group asset folder schema (idempotent and migration-safe).
2. Implement minimal server-side folder provisioning action (script or backend endpoint).
3. Add a post-create refresh step (library scan/sync trigger) and clear admin feedback states.

## First 15-Minute Task
Write `docs/media-folder-schema.md` with exact path templates and validation rules:
- base root
- anime folder naming
- season/episode subfolder naming
- group-asset folder naming
- invalid character policy

## Dependencies to Unblock Early
- Confirm write permissions on target media root path.
- Confirm whether automation runs in backend process or separate service account.

## Nice-to-Have (If Ahead of Schedule)
- Add dry-run mode that reports which folders would be created without writing to disk.
