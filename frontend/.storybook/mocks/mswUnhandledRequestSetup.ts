import { isCommonAssetRequest, type UnhandledRequestCallback } from 'msw'
import type { SetupWorker } from 'msw/browser'

/**
 * `msw-storybook-addon`s `isCommonStorybookRequest`-Filter (Storybook-/Vite-/HMR-Rauschen:
 * `.eot`/`.mdx`-Dateien, `sb-common-assets`, Webpack-HMR, `iframe.html`, Vite-interne Pfade,
 * React-Refresh, `.stories.`-Module) ist NICHT öffentlich exportiert (nur intern in
 * `msw-storybook-addon/build/addon-*.mjs` definiert) -- hier bewusst 1:1 dupliziert, nicht
 * umgehbar ohne den Default-Loader komplett nachzubauen. Jede Änderung am Original muss hier
 * manuell nachgezogen werden.
 */
export function isCommonStorybookRequest(request: Request): boolean {
  return /\.eot$|\.mdx$|sb-common-assets|__webpack_hmr|iframe\.html|sb-vite|@vite|@react-refresh|\/virtual:|\.stories\./.test(request.url)
}

/**
 * Als eigene, benannte Funktion exportiert (statt inline in `setupMswWithUnhandledRequestError`),
 * damit ihre Filterlogik per Vitest direkt gegen Fake-Request-/print-Objekte geprüft werden kann,
 * ohne einen echten Browser/Service-Worker zu brauchen (siehe mswUnhandledRequestSetup.test.ts).
 * Jeder echte, nicht gemockte Client-Request lässt `test-storybook` dadurch zuverlässig
 * fehlschlagen (`--failOnConsole`, package.json) statt grün zu bleiben (Review-Befund: die
 * bisherige Warnung-statt-Fehler-Konfiguration erfüllte den Auftrag der Render-Prüfung nicht).
 * Storybooks eigenes Asset-/HMR-Rauschen bleibt wie im Default-Setup ausgenommen.
 */
export const onUnhandledRequestStrict: UnhandledRequestCallback = (request, print) => {
  if (isCommonAssetRequest(request) || isCommonStorybookRequest(request)) return
  print.error()
}

/** Eigener `mswLoader`-Setup (ersetzt den Default-Setup aus `msw-storybook-addon/csf3`), der den
 *  Worker mit `onUnhandledRequestStrict` statt der Standard-Warnung startet. */
export async function setupMswWithUnhandledRequestError(): Promise<SetupWorker> {
  const { setupWorker } = await import('msw/browser')
  const worker = setupWorker()
  await worker.start({
    quiet: true,
    onUnhandledRequest: onUnhandledRequestStrict,
  })
  return worker
}
