// Live-UAT-Korrektur 2026-10-12 (Hauptsession, Anime-Cover-Zuschnitt): persistierte Cover/Banner-
// URLs sind IMMER backend-relative Pfade -- sowohl ein echter Upload (/media/...) als auch der
// Jellyfin-Bild-Proxy (/api/v1/media/image?item_id=...&kind=...&provider=jellyfin), den die
// "Jellyfin-Metadaten anwenden"-Funktion verlinkt OHNE das Bild je herunterzuladen. Beide Faelle
// muessen gleich-origin ueber die bestehende Next.js-Proxy-Infrastruktur (/api/v1/[...path],
// /media/[...path]) geladen werden -- ein direkter Fetch gegen die absolute Backend-Origin
// scheitert am CORS (Failed to fetch), waehrend ein <img src> auf dieselbe absolute URL
// funktioniert (Browser pruefen CORS nicht bei passivem Bild-Laden). Eine absolute URL gilt als
// nicht sicher gleich-origin ladbar -- der Zuschnitt-Button wird dafuer ausgeblendet statt einen
// kaputten Fetch zu zeigen.

export type AnimeAssetCropSourceResolution =
  | { fetchable: true; url: string }
  | { fetchable: false };

export function resolveAnimeAssetCropSource(rawUrl: string | null | undefined): AnimeAssetCropSourceResolution {
  const value = (rawUrl ?? "").trim();
  if (!value) return { fetchable: false };
  if (value.startsWith("/")) return { fetchable: true, url: value };
  return { fetchable: false };
}
