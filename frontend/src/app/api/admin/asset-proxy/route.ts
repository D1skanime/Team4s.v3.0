const ALLOWED_HOSTS = [
  "s3.zerochan.net",
  "image.tmdb.org",
  "konachan.com",
  "assets.fanart.tv",
  "s4.anilist.co",
  "safebooru.org",
];

// Some CDNs (e.g. AniList via Cloudflare) reject requests without a Referer.
// Map each allowed host to the referer the CDN expects.
const HOST_REFERER: Record<string, string> = {
  "s4.anilist.co": "https://anilist.co/",
};

function isAllowedURL(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") {
    return false;
  }
  return ALLOWED_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith("." + host),
  );
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const remoteURL = (searchParams.get("url") ?? "").trim();

  if (!remoteURL) {
    return new Response(JSON.stringify({ error: "url parameter erforderlich" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAllowedURL(remoteURL)) {
    let blockedHost = "(unbekannt)";
    try { blockedHost = new URL(remoteURL).hostname; } catch { /* ignore */ }
    return new Response(JSON.stringify({ error: `url nicht erlaubt: ${blockedHost}` }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsedRemote = new URL(remoteURL);
  const fetchHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; Team4sAssetProxy/1.0)",
  };
  const referer = HOST_REFERER[parsedRemote.hostname];
  if (referer) {
    fetchHeaders["Referer"] = referer;
  }

  let upstream: Response;
  try {
    upstream = await fetch(remoteURL, {
      headers: fetchHeaders,
      cache: "no-store",
    });
  } catch {
    return new Response(JSON.stringify({ error: "remote fetch fehlgeschlagen" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    return new Response(JSON.stringify({ error: `upstream status ${upstream.status}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return new Response(JSON.stringify({ error: "upstream ist kein bild" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
