# Deferred Items (Quick 261020-cmi)

- Pre-existing, unrelated TS error in generated Next.js type artifact
  `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts`
  ("Type 'Props' does not satisfy the constraint 'PageProps'"). Not caused by this
  plan's changes (no files touched by this plan reference that route); out of scope
  per CLAUDE.md scope boundary. Likely a stale generated-types cache issue unrelated
  to `release_versions` removal.
