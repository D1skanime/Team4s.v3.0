/**
 * D-01/D-04: beide alten Release-Editor-Adressen leiten dauerhaft (HTTP 308) auf die neue,
 * rechtebasierte Zielroute weiter. Diese Regeln werden von `next.config.mjs`'s `redirects()`
 * konsumiert (Verdrahtung erfolgt erst in Plan 09, Wave 5, siehe 181-RESEARCH.md Pitfall 3 --
 * die Redirects duerfen erst live gehen, wenn die Zielseite existiert).
 *
 * Bewusst ohne Import aus `next`, damit dieses Modul ohne Next.js-Config-Ladevorgang per Vitest
 * testbar bleibt.
 */
export interface RedirectRule {
  source: string
  destination: string
  permanent: boolean
}

export function buildReleaseEditorRedirects(): RedirectRule[] {
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
