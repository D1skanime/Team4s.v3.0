# Deferred Items — Phase 177

Out-of-scope discoveries found during execution, not fixed per the executor's scope boundary
(only auto-fix issues directly caused by the current task's changes).

## Plan 177-11 (Task 3 verification sweep)

- **`src/components/ui/ResponsiveImage.config.test.ts`** — `allows only the configured Team4s API
  media namespace for responsive group logos` fails (`hasRemoteMatch([], remotePatterns,
  allowedFile)` expected `true`, got `false`). Pre-existing, unrelated to any file this plan
  touches (`FansubMediaLightbox.tsx`, `MediaViewerHeader.tsx`, `MediaViewerCaption.tsx`,
  `MediaViewerStage.tsx` and their `.module.css` companions). Last modified in commit `d8124822`
  (Phase 173), long before this phase's work. Not fixed — out of scope.
