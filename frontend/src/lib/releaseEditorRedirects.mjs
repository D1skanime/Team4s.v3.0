/**
 * D-01/D-04: beide alten Release-Editor-Adressen leiten dauerhaft (HTTP 308) auf die neue,
 * rechtebasierte Zielroute weiter. Diese Regeln werden von `next.config.mjs`'s `redirects()`
 * konsumiert.
 *
 * Bewusst ohne Import aus `next`, damit dieses Modul ohne Next.js-Config-Ladevorgang per Vitest
 * testbar bleibt.
 *
 * `.mjs` statt `.ts` (181-09 Deviation, Rule 1): `next.config.mjs` wird direkt von Node geladen,
 * ohne TS-/Bundler-Schritt (Node 20 im `frontend`-Container kennt die `.ts`-Dateiendung nicht --
 * `ERR_UNKNOWN_FILE_EXTENSION`). Gleiches Muster wie `src/lib/images/publicImagePatterns.mjs`,
 * das aus genau diesem Grund bereits als framework/runtime-neutrales `.mjs` gefuehrt wird.
 *
 * @typedef {{ source: string, destination: string, permanent: boolean }} RedirectRule
 */

/** @returns {RedirectRule[]} */
export function buildReleaseEditorRedirects() {
  return [
    {
      source: '/admin/episode-versions/:versionId/edit',
      destination: '/releases/:versionId/edit',
      permanent: true,
    },
    {
      source: '/me/releases/:versionId/workspace',
      destination: '/releases/:versionId/edit',
      permanent: true,
    },
  ]
}
