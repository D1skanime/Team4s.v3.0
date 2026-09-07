---
phase: 151-erfolgsbadge-karussell-konsolidierung
plan: 01
status: complete
subsystem: ui-artwork
tags: [artwork, role-catalog, resolver, karaoke-fx]
requires: []
provides:
  - Presentation-only role artwork manifest without business or threshold truth
  - Karaoke-FX Entry/Bronze/Silber/Gold/Platin through the ordinary layered role path
  - Catalog- and filesystem-checked coverage gate with negative proofs
---

# Phase 151 Plan 01: Artwork- und Resolver-Kontrakt

## Completed

- `ROLE_ARTWORK_BY_ICON_KEY` ist durch ein reines Praesentationsmanifest ueber Rollencodes ersetzt
  (`ROLE_ARTWORK_STRATEGIES`). Es speichert ausschliesslich `layered` oder `direct-volume`; Labels,
  Kontexte, Sortierung, Rechte, Schwellen und Stufenzahlen bleiben bei Phase 150 bzw. beim Backend.
- `icon_key` waehlt kein Artwork mehr aus. Beide oeffentlichen Resolver-Signaturen
  (`resolveBadgeArtwork`, `resolveLayeredRoleArtwork`) bleiben quellkompatibel, das zweite Argument
  wird bewusst ignoriert.
- Timer ist die einzige deklarierte `direct-volume`-Ausnahme; alle uebrigen elf Katalogrollen —
  einschliesslich Karaoke-FX — nutzen Motiv plus Rangrahmen.
- Neu: `roleArtworkStrategyFor(roleCode)` und die reine Abdeckungspruefung
  `validateRoleArtworkCoverage(catalogRows, availablePublicPaths)` mit `missingRoles`,
  `missingFiles` und deklarierten Ausnahmen (Ausnahmenliste ist leer).
- Sechs neue transparente Karaoke-FX-PNGs (1254x1254, RGBA) liegen unter
  `frontend/public/member-achievement-badges/`. Alle 107 vorbestehenden PNGs sind bytegleich;
  `git diff` unter dem Artwork-Verzeichnis nennt ausschliesslich die sechs additiven Dateien.

## Artwork-Provenienz

- Silber/Gold/Platin stammen als native RGBA-Frames direkt aus dem eingebauten Linux-Bildgenerator.
- Entry, Motiv und Bronze wurden nach ausdruecklicher Nutzerfreigabe mechanisch freigestellt:
  `checks/extract-new-karaoke-alpha.cjs` mit fixierten Input-SHA256; Nachweis in
  `checks/karaoke-alpha-extraction.json` (`changedRgbSamples: 0` je Datei, also unveraenderte
  RGB-Werte, nur ersetzter Hintergrund-Alpha). Details in `151-ARTWORK-GENERATION.md`.

## Files Changed

- `frontend/src/components/profile/badgeArtwork.ts`
- `frontend/src/components/profile/badgeArtwork.test.ts`
- `frontend/public/member-achievement-badges/role_entry_karaoke_fx.png`
- `frontend/public/member-achievement-badges/role-karaoke_fx-motif.png`
- `frontend/public/member-achievement-badges/rank-frame-karaoke_fx-{bronze,silver,gold,platinum}.png`
- `docs/frontend/member-achievement-artwork.md`
- `DECISIONS.md`

## Verification

- Resolver-/Katalog-/Dateisystemsuite: **7/7 PASS** (im vollen Lauf enthalten). Positive
  Rollengrenze kommt aus dem laufenden Public-Endpunkt
  `GET /api/v1/role-definitions?context=anime_contribution`, die positive Pfadmenge aus dem echten
  Linux-Public-Verzeichnis via `node:fs`. Negativbeweise: eine synthetische Katalogzeile meldet
  `missingRoles`, ein entfernter Pfad meldet exakt diese `missingFiles`.
- Asset-Gate: 113 PNGs im Verzeichnis, die sechs Karaoke-Dateien sind RGBA,
  `checks/check-artwork-sources.py` bestaetigt alle 107 Original-Hashes.
- Finale Sichtabnahme der fuenf Karaoke-Stufen (Einstieg/Bronze/Silber/Gold/Platin): **PASS**,
  siehe `evidence/final-review/contact-sheets/compositions-07.png`,
  `sources-04.png`, `sources-06.png`, `sources-07.png` und die signierten Zeilen in
  `evidence/final-review/ARTWORK-SIGNOFF.md`. Karaoke rendert mit gleicher Slot-Geometrie
  (192/216/240 Hero, 64/80 Marker), gleicher Kartenhoehe und ohne jede Sonder-UI.
