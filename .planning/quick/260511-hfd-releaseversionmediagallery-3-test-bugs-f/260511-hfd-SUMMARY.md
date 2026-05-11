---
quick_task: 260511-hfd
date: 2026-05-11
commit: 4eab759c
files_modified:
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx
---

# Quick Task 260511-hfd: ReleaseVersionMediaGallery 3 Test-Bugs fixen

## Was gemacht wurde

Drei failing Tests in `ReleaseVersionMediaSection.test.tsx` durch Korrekturen in `ReleaseVersionMediaGallery.tsx` behoben.

### Bug 1 — draggable-Attribut auf button fehlte

Der `<button type="button">` hatte kein `draggable={true}`. Der Test sucht via `screen.getByRole('button')` und erwartet `draggable="true"` direkt auf dem Element. Das Attribut war nur auf dem aeusseren `<div className={styles.cardWrapper}>` gesetzt.

**Fix:** `draggable={true}` auf den `<button>` hinzugefuegt.

### Bug 2+3 — GIF src-swap funktionierte nicht auf Kompaktkarte

Der `onMouseEnter`- und `onMouseLeave`-Handler war nur auf dem aeusseren `<div>` (cardWrapper), nicht auf dem `<button>`. Die Tests feuern `fireEvent.mouseEnter(card)` direkt auf dem Button-Element, wodurch die Handler nie ausgeloest wurden und `isGifHovered` immer `false` blieb.

Ausserdem zeigte das `<img>` immer `item.thumbnail_url` statt beim Hover auf `item.original_url` zu wechseln.

**Fix:**
- `onMouseEnter` und `onMouseLeave` auch auf den `<button>` hinzugefuegt
- `<img src>` auf `isGifHovered && item.original_url ? item.original_url : (item.thumbnail_url ?? '')` geaendert
- Render-Bedingung auf `(item.thumbnail_url || (isGifHovered && item.original_url))` erweitert, damit das Bild auch ohne thumbnail_url erscheint wenn ein GIF gehovert wird

## Ergebnis

- 41/41 Tests bestehen (vorher 38/41)
- Kein vorher bestehender Test gebrochen

## Commit

`4eab759c` — fix: GIF src-swap und draggable-Attribut in ReleaseVersionMediaGallery korrigiert
