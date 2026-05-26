---
status: ready
quick_id: 260526-mhk
date: 2026-05-26
---

# Quick Task 260526-mhk: next/image Test-Mock fixen und den einzelnen Test laufen lassen

## Scope
- Fix the noisy `next/image` mock warning in `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`.
- Reuse the existing nearby pattern from `frontend/src/components/admin/MediaUpload.test.tsx`.
- Run the focused fansub edit page test and relevant lightweight checks.
- Commit the code and GSD quick-task artifacts explicitly.

## Steps
1. Update the local `next/image` mock so `unoptimized` is consumed and not forwarded to the native `img` element.
2. Run the targeted fansub edit page test.
3. Run focused lint/type/diff checks that fit the changed surface.
4. Record the summary, update `.planning/STATE.md`, and commit with explicit paths.

## Acceptance Criteria
- The targeted fansub edit page test passes without the `unoptimized` React DOM warning.
- No unrelated source files are modified.
- `git diff --check` passes or only reports known CRLF warnings.
