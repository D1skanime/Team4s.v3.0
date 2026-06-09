# WORKING_NOTES

## Current Workflow Phase
- Phases 60-69 are the current MVP baseline for fansub contributions and historical member identity.
- Phase 70 is complete and verified: member profile story images are persisted through Team4s media-backed TipTap image references.
- Phase 71 is the active post-MVP polish/design context, but confirm the latest UAT artifact before treating it as locally closed.

## Useful Facts To Keep
- `/admin/fansubs/[id]/edit` owns internal edit workflows for proposals, claims, milestones, historical members, roles, and anime contributions.
- `/admin/my-groups/[id]` is not the canonical edit route. Treat it as display/contributor-scope unless a later decision changes that.
- Codex Desktop in-app browser screenshots: if normal `System.Drawing.Graphics.CopyFromScreen(...)` fails with `Handle is invalid` or produces a black image, capture the Codex window via Win32 `PrintWindow` instead. Enumerate visible windows for process `Codex`, pick the large main window, call `PrintWindow(hwnd, hdc, 2)`, save PNG, then crop the web preview region. This successfully captured `/admin/fansubs/1/edit` as `tmp-codex-window-printwindow.png` and the banner crop as `tmp-codex-window-banner-crop.png` on 2026-06-09.
- Normal app-member invitations and claim invitations are separate products, even if both use links.
- App users are current Team4s accounts. `members` are historical/archive identities. Claims connect the two.
- Claiming is more important for historical import/correction workflows than for a fresh database where data is entered correctly from day one.
- Credits are attribution. Permissions are operational access. Do not merge them implicitly.
- `anime_contributions.release_version_id` is optional and allows version-specific credits without replacing anime-wide credits.
- Archive search is public discovery and must keep visibility filters server-side.
- Phase 70 story images must not be saved as base64 or external URLs.
- The local MVP summary lives at `.planning/MVP-PHASES-60-69-SUMMARY.md` and is not meant for GitHub unless user reverses that decision.

## Verification Memory
- Phase 60: SMTP/Mailpit and Keycloak mail UAT passed.
- Phase 63: Leader frontend UAT passed after live browser/API fixes.
- Phase 65: Proposal review belongs in `/admin/fansubs/[id]/edit`; live UAT passed there.
- Phase 66: Claiming UAT passed 6/6; verified claim removes the open Member-Claim action card on `/me/profile`.
- Phase 67: Release-version credits passed live browser/API/DB verification.
- Phase 68: Badge engine, milestones, and `/archiv` were live-UAT verified; milestone CRUD was moved out of `my-groups` into fansub edit.
- Phase 69: Contracts/permissions were hardened and committed in `16429983`.
- Phase 70: final UAT committed in `39517af0`.

## Commit Hygiene Notes
- Current closeout did not commit.
- Dirty local files at closeout: `frontend/tsconfig.tsbuildinfo` and untracked `.planning/MVP-PHASES-60-69-SUMMARY.md`.
- Do not run `git add .` while these are present unless the user explicitly wants them included.
- `main` is ahead of `origin/main` by many commits; push should be deliberate.

## Mental Unload
- The next agent should not rebuild the 60-69 summary from scratch; use the local summary file if discussion context is needed.
- If continuing Phase 71, first locate the claimed UAT evidence from the other agent/thread.
- If starting product discussion, use the MVP summary's roles/questions as the opening frame.
