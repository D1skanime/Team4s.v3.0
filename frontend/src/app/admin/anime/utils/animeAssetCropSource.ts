// Live-UAT-Korrektur 2026-10-12 (Hauptsession, Anime-Cover-Zuschnitt): persistierte Cover/Banner-
// URLs sind entweder bereits backend-relativ (/media/..., /api/v1/media/image?...) oder -- je
// nachdem, ob NEXT_PUBLIC_API_URL als Loopback-Host gilt -- vom Frontend selbst zu einer
// ABSOLUTEN Backend-Origin-URL aufgeloest (resolveJellyfinIntakeAssetUrl/resolvePublicApiUrl,
// fuer die normale <img src>-Anzeige voellig unproblematisch, da Browser bei passivem Bild-Laden
// keine CORS-Pruefung durchfuehren). Ein direkter Netzwerk-Abruf gegen genau diese absolute
// Backend-Origin-URL scheitert dagegen am CORS ("Failed to fetch") -- der same-origin-Weg ueber die
// Next.js-Proxy-Infrastruktur (/api/v1/[...path], /media/[...path]) funktioniert fuer BEIDE
// Faelle (echter Upload und Jellyfin-Bild-Proxy), sobald die URL wieder relativ ist. Eine
// absolute URL mit einer FREMDEN Origin (nicht der bekannten API-Basis) bleibt nicht sicher
// ladbar -- dafuer wird der Zuschnitt-Button ausgeblendet statt einen kaputten Fetch zu zeigen.

export type AnimeAssetCropSourceResolution =
  | { fetchable: true; url: string }
  | { fetchable: false };

/**
 * `apiBaseUrl` ist dieselbe Basis, die resolveJellyfinIntakeAssetUrl/resolvePublicApiUrl zum
 * Aufloesen einer relativen Backend-URL in eine absolute verwendet haben (getBrowserApiBaseUrl
 * aus lib/publicApiUrl.ts) -- als Parameter statt eines internen Reads, damit diese Funktion
 * eine reine, direkt testbare Funktion bleibt.
 */
export function resolveAnimeAssetCropSource(
  rawUrl: string | null | undefined,
  apiBaseUrl: string,
): AnimeAssetCropSourceResolution {
  const value = (rawUrl ?? "").trim();
  if (!value) return { fetchable: false };

  // Reject protocol-relative ("//host/path") and backslash-variant ("/\host/path") forms BEFORE
  // the relative-path fast path below -- both resolve to an ATTACKER-CONTROLLED host per the
  // WHATWG URL spec, not a same-origin relative path, even though a naive `startsWith("/")` check
  // would otherwise accept them. Code-review finding 2026-10-13: this bypassed the exact
  // "foreign origin -> hide the crop button" invariant this function exists to enforce (no live
  // occurrence observed, but persisted asset URLs are provider/import-influenced data, not
  // admin-typed, so this must be rejected defensively).
  if (/^[/\\]{2}/.test(value)) return { fetchable: false };

  if (value.startsWith("/")) return { fetchable: true, url: value };
  if (!/^https?:\/\//i.test(value)) return { fetchable: false };

  const base = apiBaseUrl.trim();
  if (!base) return { fetchable: false };

  try {
    const parsedValue = new URL(value);
    const parsedBase = new URL(base);
    if (parsedValue.origin !== parsedBase.origin) return { fetchable: false };
    return { fetchable: true, url: `${parsedValue.pathname}${parsedValue.search}` };
  } catch {
    return { fetchable: false };
  }
}

const ORIGINAL_VARIANT_EXTENSIONS = ["jpg", "png", "webp", "gif"];

/**
 * Fuer einen echten, rehosteten Anime-Asset-Pfad (/media/anime/{id}/{kind}/{mediaID}/display.ext)
 * legt das Backend "original.ext" immer als Geschwisterdatei im selben Verzeichnis ab (siehe
 * media_upload_image.go) -- die Erweiterung stimmt dabei NICHT zwingend mit der von "display"
 * ueberein (PNG/WebP/GIF-Originale bekommen oft einen JPEG/WebP-Display-Export). Zum Zuschneiden
 * ist das Original vorzuziehen (keine doppelte Kompression durch die Display-Variante) -- diese
 * Funktion liefert die zu probierenden Kandidaten-URLs (gleiche Erweiterung zuerst, dann die
 * uebrigen bekannten), OHNE Netzwerkzugriff. Liefert eine leere Liste fuer alles, was nicht exakt
 * auf ".../display.<ext>" endet -- insbesondere fuer den Jellyfin-Bild-Proxy
 * (/api/v1/media/image?...), der keine Original-/Display-Unterscheidung kennt.
 */
export function deriveOriginalCropCandidates(fetchableUrl: string): string[] {
  const match = fetchableUrl.match(/^(.*\/)display\.([a-zA-Z0-9]+)$/);
  if (!match) return [];
  const [, directoryPrefix, displayExtension] = match;
  const orderedExtensions = [
    displayExtension,
    ...ORIGINAL_VARIANT_EXTENSIONS.filter((ext) => ext !== displayExtension),
  ];
  return orderedExtensions.map((ext) => `${directoryPrefix}original.${ext}`);
}
