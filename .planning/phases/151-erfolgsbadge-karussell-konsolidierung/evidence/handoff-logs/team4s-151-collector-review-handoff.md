# Phase 151 collector review handoff

## Scope changed

- `frontend/scripts/capture-phase151-badge-evidence.mjs`
- `frontend/scripts/phase151-badge-evidence-private.mjs`
- `frontend/scripts/phase151-badge-evidence-browser-private.mjs` (new focused helper; all three collector files remain below 450 lines)
- No production UI, CSS, resolver, artwork, docs, Git/index, runtime configuration, environment, media, or database changes.

## Collector modifications

- Replaced synthetic `dispatchEvent` click/wheel evidence with Playwright `mouse.click` on the visible native inactive-neighbor track area and real horizontal/vertical `mouse.wheel` input.
- Nonadjacent proof now uses keyboard `End`/`Home`. Animation interruption uses a real horizontal wheel while `data-navigation-state=moving`, then asserts physical nearest-item index equals logical `aria-current` index.
- Preserved keyboard focus-visible, inactive `inert`, drag, rapid input, expand/collapse, motion, and fetch/XHR gates.
- Every production artwork slot now resolves its nearest named `achievement-card` query container and enforces the exact square contract: `<562 => 192/64`, `562..657 => 216/80`, `>=658 => 240/80`.
- Production image bounds enforce the 8px slot inset. Marker clipping is checked for slots fully visible in their marker lane; intentional marker overflow, carousel-offscreen items, stress fixtures, and independent geometry references do not create false clipping/size failures. Diagnostics use `locator >> nth=N` notation.
- Computed styles are enforced across eligible role, contribution, membership, points, and anime-project roots: transparent background, no background image, no shadow, zero radius. Independent historical/founding/reference panels are excluded.
- Each present Karaoke additive is read-only decoded with Sharp and must be exactly 1254x1254, have alpha min 0/max 255, transparent corner samples (alpha <=1), and for rank frames an entirely open central 10% alpha area. Original 107 hash/byte/dimension comparison remains unchanged.
- Lazy readiness scrolls every pending composition image into horizontal and vertical view, awaits `decode()`, and restores nested scroll positions. This removes the six false point-milestone failures without suppressing genuine image failures.
- Contact sheets use 2 columns/520px for compositions and explicit `width/height:100%`, `min-width/min-height:0`, `object-fit:contain`. The matrix records Chromium-computed rendered-object bounds and natural dimensions for every card.
- Requested output paths are never reused: an existing path receives a timestamped unique run directory. Existing evidence is not deleted.
- Signoff behavior remains 113 source rows (including missing-source placeholders) plus all 84 composition rows; broken Karaoke compositions remain capturable and not passed.

## Exact validation commands executed

```bash
node --check frontend/scripts/capture-phase151-badge-evidence.mjs
node --check frontend/scripts/phase151-badge-evidence-private.mjs
node --check frontend/scripts/phase151-badge-evidence-browser-private.mjs
docker compose exec -T team4sv30-frontend sh -lc 'npm exec eslint -- scripts/capture-phase151-badge-evidence.mjs scripts/phase151-badge-evidence-private.mjs scripts/phase151-badge-evidence-browser-private.mjs'
awk 'length($0)>0 && $0 ~ /[[:space:]]$/ { print FNR ":" $0 }' frontend/scripts/capture-phase151-badge-evidence.mjs frontend/scripts/phase151-badge-evidence-private.mjs frontend/scripts/phase151-badge-evidence-browser-private.mjs
wc -l frontend/scripts/capture-phase151-badge-evidence.mjs frontend/scripts/phase151-badge-evidence-private.mjs frontend/scripts/phase151-badge-evidence-browser-private.mjs
```

Targeted Playwright probes were executed in the existing frontend container with:

```bash
docker compose exec -T team4sv30-frontend node --input-type=module -
```

The exact stdin modules imported the owned collector helpers and exercised:

- `collectInteractions()` at 1440x900: zero findings; native click selected index 1; interrupted wheel settled logical=physical=2; horizontal wheel changed `scrollLeft` without page movement; vertical wheel changed page `scrollY` without carousel movement; no fetch/XHR growth.
- `settleCompositionImages()` + `measureGallery()` + `validateMeasurement()` at 390x844, DPR 2: `unsettled=[]`; zero point-milestone, slot geometry, marker clipping, or transparent-root findings; 611 production slots measured; 300 stress and 4 independent-reference slots explicitly classified outside the named-card contract.
- Boundary DOM probe at named-container widths 561/562/657/658: respectively 192/64, 216/80, 216/80, 240/80 for every hero/stage slot in the probe. All five computed-style parity families returned true.
- `makeContactSheets()` against existing tall crop `076-point_milestone_active.png` in fresh `/tmp/team4s-151-contact-probe-pR2zgL`: zero findings; natural 413x705 image rendered wholly inside a 551x520 contain viewport. Fresh-output probe resolved existing `/tmp/team4s-phase151-evidence` to `/tmp/team4s-phase151-evidence-2026-09-07T15-30-04-654Z`.

No full 16-row collector matrix was run, per coordinator instruction.

## Remaining actual gaps

- Required files still missing (intentional hard red gate):
  - `rank-frame-karaoke_fx-bronze.png`
  - `role-karaoke_fx-motif.png`
  - `role_entry_karaoke_fx.png`
- Their dependent browser HTTP/image-load/candidate/crop gates will remain red until those sources exist.
- The three present Karaoke rank frames passed the new read-only dimension/alpha/corner/center checks. The original 107 inventory produced no preservation finding in the targeted inventory probe.
- Current targeted runtime probe found no sub-44px gallery targets; root may still rerun the full matrix after its production carousel-button work is finalized.
