# F01 — RawQuery validation delta

Starting HEAD: 194649cba38115fa493de39262f55cb3ce77c209. Independent security report confirms malformed cursor/limit escapes are silently dropped by URL.Query(), turning an explicit request into a first/default page.

The existing parseReleaseStreamSelection named-pair decoder is the reuse seam. Extract its loop once in the same handler file; public episode option parsing and the existing grant/stream selector call it. Relevant malformed projection/limit/cursor and public flags must fail before repository access. Unrelated malformed pairs, full/default flags and the existing no-selector behavior remain compatible. No new route, DB, auth, DTO or cursor encoding.

RED: malformed relevant values and encoded names using nil repository + recovery show erroneous 500/repository reach rather than required 400. GREEN: these reject before repository; fresh isolated SQL verifies valid public cursor plus full/default/unrelated malformed compatibility. Root performs the finished backend source sync; no backend source copy into Air's watched tree by this executor.
