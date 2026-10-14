/**
 * Single source of truth for the permanent redirect that retires the old
 * `/me/releases/[versionId]/workspace` route in favor of the surviving
 * `/admin/episode-versions/[versionId]/edit` editor (Phase 181 Neustart,
 * D-03).
 *
 * `next.config.mjs` imports this module to build `redirects()`. Deliberately
 * framework/runtime-neutral: no Node builtins (`path`/`url`/`fs`), no `next`
 * import, mirroring the sibling `publicImagePatterns.mjs` pattern so this
 * file stays trivially unit-testable from a plain `.test.ts` file.
 *
 * Next.js automatically forwards any query string present on the incoming
 * request to the redirect destination -- no manual `tab`/`return_to`
 * forwarding code is needed here.
 */

export function buildReleaseEditorRedirects() {
  return [
    {
      source: '/me/releases/:versionId/workspace',
      destination: '/admin/episode-versions/:versionId/edit',
      permanent: true,
    },
  ]
}
