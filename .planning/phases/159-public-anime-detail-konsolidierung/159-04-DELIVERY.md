# 159-04 delivery amendment and consumer matrix

Written before new product changes on 2026-09-14. The user authorized completing local variants through existing media paths; root authorized this narrow Plan159-04 extension. Phase remains159, no new registry, backend transform, DB operation or original-file rewrite.

## Confirmed causes

1. API-file originals were previously directly loaded. ServeMediaFile resolves a filename to opaque media_assets.StoragePath and sends the original bytes. Next-wrapped URLs to a private configured API origin fail its production local-IP policy.
2. Next image optimization deliberately returns animated GIF/APNG/WebP inputs unchanged. A generated w=512 URL does not prove512px delivered bytes.
3. A real public/covers file takes precedence over app/covers/[file]/route.ts. A query alone cannot select a dynamic transform there.

## Existing and amended contracts

| Source / consumer | Existing owner and behavior | Additive bounded delivery |
| --- | --- | --- |
| Four anime cover uses, info logo/banner, backdrop | animeBackdrops resolver; source from existing DTO | Same-origin finished display URL; cover512, other slots760/1280/1920; no Image reoptimization |
| /covers/{file} | Existing safe basename helper in route, public/covers file; static precedence | /covers/{file}/display?display_width=512; shared safe resolution, shared server transform |
| /media/anime/** | Existing path/containment checks in /media/[...path]; read MEDIA_BASE_PATH; Range support | Same route plus display_width; local bounded reads, no HTTP source fetch |
| /api/v1/media/files/{filename} | Existing generic frontend proxy to fixed internal API; backend filename lookup owns StoragePath | Exact GET/HEAD opt-in branch; existing proxy fetches original with display_width removed, then shared transform |
| Provider /api/v1/media/image | Existing provider maxWidth/quality transport | Existing effective width/quality remains |
| Other namespaces, SVG/video, no display opt-in | Existing original serving, headers, errors and media206/416 | Unchanged; no generic new URL proxy or expansion of localPatterns |

The new display contract belongs to the frontend origin. The direct backend API still returns original files and ignores display_width; shared OpenAPI must describe this as frontend-only vendor metadata, not a backend query capability.

## Fixed display policy

Only display_width=512,760,1280,1920, exactly once. WebP quality75, first static frame0, alpha preserved, no enlargement. No raw-original fallback. Maximum input16MiB, decoded input20MP, encoded output4MiB; output width at most requested and height at most min(3*width,4096). At most two active source/decode operations per server process with at most eight abortable FIFO waiters and no per-image cache map. Input/request timeout and Sharp processing timeout are finite. Request cancellation stops source consumption; any native operation retains its slot until settlement.

Local stat precedes a bounded read and the byte bound is checked while reading to handle file growth. API source bodies are incrementally limited even when content-length is absent or false. SVG/video cannot enter the raster transform; original no-opt-in delivery remains available.

## HTTP preservation and response truth

Display requests deliberately ignore client Range and conditional If-* headers when obtaining full source bytes. Original ETag, content-encoding, content-range, accept-ranges and content-length are not forwarded as transformed truth. Successful output uses actual image/webp bytes and recomputed length, conservative cache policy and nosniff. GET returns the transformed body; HEAD uses the same transformation and headers with no body.

Invalid/duplicate width400; missing local file404; abort/timeout408; input/pixel/output limits413; unsupported/corrupt raster415; capacity429; unavailable or unexpected partial-success upstream502. Upstream redirects/auth/missing/server statuses remain non200 without following redirects or pretending to be an image success. Display errors use plain text with no-store; HEAD/304 have no body. This frontend-only error contract is documented separately from the unchanged backend ErrorResponse. No error path serves an unbounded original.

## Reuse and exclusions

One shared server-side Sharp helper is necessary because three existing serving surfaces have distinct source authority but identical decoding/resource policy. A tiny shared display-width contract avoids divergent client/server options. Shared safe cover-file resolution removes actual duplication between original and display child. Generic API forwarding retains its existing target/header/auth seam; only optional cancellation and the exact media-file display branch are added.

Sharp0.34.5 already exists under Next16.1.6; direct use declares that same version. Installed typings and official constructor/resize/output documentation were read. No framework upgrade is intended.

Existing media/cover originals, backend services, env files and volumes are never rewritten. Fixtures live only in disposable test directories or isolated production source copies. Existing /media video206/416 and proxy tests remain regression gates. Real animated fixtures are verified in this plan; productive Next HTTP through a pre-existing static cover, private API files and animations is the explicit 15905 production gate before these findings are globally closed.

Admission correction from cold-start review: four distinct parallel images must complete with 200 through two active transforms. At most eight waiters share the five-second request deadline; queued abort removes the waiter before source IO. Saturation beyond this finite bound returns 429.
