# TODO

## Completed (2026-03-15)
- [x] Move `Related` on `/anime/[id]` out of the hero card and into the first standalone post-hero section
- [x] Make related-rail arrows overflow-aware instead of always visible
- [x] Keep native horizontal scroll usable without buttons
- [x] Preserve whole-card click behavior for related anime cards
- [x] Capture the UX handoff in `docs/ux-related-section-handoff-2026-03-15.md`
- [x] Re-run critical review and reach `approve`
- [x] Rebuild and redeploy `team4sv30-frontend`
- [x] Verify runtime via `/health` and `/anime/25`

## Next Up
- [ ] Add `genres: string[]` to the backend anime detail response
- [ ] Remove any remaining frontend type workaround once the backend field exists
- [ ] Re-run `frontend npm run build` and a page smoke-check after the contract change
- [ ] Inventory repo-wide frontend lint failures outside this slice

## Parking Lot
- [ ] Separate accessibility wording cleanup if needed after the data-contract follow-up
- [ ] Review whether any further related-rail polish is needed once the contract work lands
