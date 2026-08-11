# Phase 127 Plan 01 Ownership Manifest

BASE_INDEX_TREE=bc90a4b53a3b0736c58b23fa4df4bbeab493269f

- Baseline cached binary patch: `127-01-incoming/baseline-cached.patch`
- Indexed blob manifest: `127-01-incoming/indexed-blobs.txt`
- Incoming status and binary worktree diff: `127-01-incoming/status.txt`, `127-01-incoming/unstaged.patch`
- SHA-256 and byte manifest: `127-01-incoming/sha256.txt`, `127-01-incoming/bytes.txt`
- Exact incoming copies: `127-01-incoming/files/`
- Allowed Phase-127 delta: `MemberProfileHero.test.tsx`, `members/[slug]/page.test.tsx`, `MemberBadgeChain.test.tsx`, `badgeArtwork.test.ts`, `phase127-red-gate.sh`.
- Protected from Phase-127 staging: production source, `FocalCarousel*`, assets, predecessor artifacts, and `.planning/STATE.md`.

Any cached-delta mismatch restores the index only with `git read-tree "$BASE_INDEX_TREE"`; worktree and untracked files remain untouched.
