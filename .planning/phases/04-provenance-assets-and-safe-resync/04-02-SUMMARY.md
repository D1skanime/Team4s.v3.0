# 04-02 Summary

## Outcome

Plan `04-02` ist abgeschlossen. Die ownership-aware Asset-Seams fuer `cover`, `banner` und `backgrounds` funktionieren jetzt auch auf dem aktiven Anime-v2-Pfad, inklusive expliziter Slot-Aktionen, geschuetzter Manual-Authority und deterministischem Runtime-Fallback.

## Delivered

- `backend/internal/repository/anime_assets.go`
  Banner- und Background-Flows haben jetzt dieselbe v2-Kompatibilitaet wie Cover: manuelle Zuweisung, Entfernen, provider-owned Refresh und provider-key-basierte Background-Reconciliation laufen ueber `anime_media` statt nur ueber Legacy-Slots.
- `backend/internal/repository/runtime_authority_test.go`
  Der Repository-Guard prueft jetzt dauerhaft, dass auch Banner- und Background-Pfade auf die v2-Helfer routen, sobald die Legacy-Slots fehlen.
- `backend/internal/handlers/admin_content_anime_assets.go`
  Die expliziten Slot-Endpunkte bleiben die operator-sichere HTTP-Seam fuer Assign/Add/Delete.
- `backend/internal/handlers/anime_backdrops_handler.go`
  Persistierte Banner/Backgrounds behalten Vorrang vor Jellyfin-Fallback, und Fallback wird nur benutzt, wenn kein persistierter Slot aktiv ist.

## Verification

- `cd backend && go test ./internal/repository -run "Test(ReconcileAnimeProviderBackgrounds|ResolveAnimeAssetURL|AnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone)" -count=1`
- `cd backend && go test ./internal/repository -count=1`
- `cd backend && go test ./internal/handlers -run "Test.*AnimeBackdrops.*" -count=1`

Alle Befehle sind gruen gelaufen. Der letzte Handler-Slice meldete `ok ... [no tests to run]`, also ohne neue `AnimeBackdrops`-Spezialfaelle; die Runtime-Prioritaet bleibt ueber vorhandene Handler- und Repository-Abdeckung mit abgesichert.

## Notes

- Der wesentliche echte Gap war die fehlende v2-Kompatibilitaet in `AssignManualBanner`, `ClearBanner`, `AddManualBackground`, `RemoveBackground`, `ApplyProviderBanner` und `ApplyProviderBackgrounds`.
- Damit bleibt Phase 4 auf dem live genutzten v2-Schema ausfuehrbar, ohne die frueheren Legacy-Spalten vorauszusetzen.
