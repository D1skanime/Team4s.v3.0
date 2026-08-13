# Phase 04 Verification

## Status

Phase `04-provenance-assets-and-safe-resync` ist abgeschlossen. Bestehende Anime koennen jetzt mit sichtbarer Jellyfin-Provenance, fill-only Metadata-Resync und ownership-aware Slot-Steuerung gepflegt werden, ohne manuelle Authority stillschweigend zu verlieren.

## Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `JFIN-03` | Complete | Edit-Route zeigt persistierte Jellyfin-Identitaet, Serienpfad und Slot-Kontext ueber den Provenance-Block aus `04-01` und `04-03`. |
| `OWNR-01` | Complete | Ownership-Hinweise und Provenance-Diffs machen sichtbar, welche Werte/Assets provider-backed oder manuell gepflegt sind. |
| `OWNR-02` | Complete | Fill-only-Metadata-Apply und provider-aware Asset-Refresh behalten manuelle Werte und manuelle Slots geschuetzt. |
| `OWNR-03` | Complete | Fill-only-Resync bleibt refill-faehig fuer spaeter bewusst geleerte Felder. |
| `OWNR-04` | Complete | Preview/Apply arbeiten auf dem bestehenden Anime und erzeugen keinen neuen Datensatz. |
| `OWNR-05` | Complete | Preview-Diffs zeigen vor Apply, welche Werte gefuellt, geschuetzt oder unveraendert bleiben. |
| `ASST-01` | Complete | Persistierte `cover`-, `banner`- und `backgrounds`-Slots zeigen Ownership im Provenance-Abschnitt. |
| `ASST-02` | Complete | Cover, Banner und Backgrounds koennen explizit entfernt werden, ohne den Anime zu loeschen. |
| `ASST-03` | Complete | Cover, Banner und Backgrounds koennen explizit durch manuelle Assets ersetzt bzw. ergaenzt werden. |
| `ASST-05` | Complete | Spaetere Provider-Refreshes respektieren manuelle Ersatz-Assets und aktualisieren nur provider-owned Slots. |
| `RLY-02` | Complete | Frontend- und Backend-Seams behalten operator-usable Fehler mit `message`, `code` und `details`. |

## Success Criteria Check

1. Admin can see linked Jellyfin item identity, path, field provenance, and asset provenance while editing a Jellyfin-linked anime.  
   Result: Passed.
2. Admin can preview which Jellyfin-backed values would change before a resync is applied, then run that resync without creating a new anime record.  
   Result: Passed.
3. Admin can keep non-empty manual field values and manual replacement assets from being overwritten, while intentionally cleared fields remain refillable on a later resync.  
   Result: Passed.
4. Admin can remove or replace a Jellyfin-derived asset in an individual slot and understand Jellyfin fetch or sync failures quickly from the UI.  
   Result: Passed.

## Verification Evidence

### Automated

- `cd backend && go test ./internal/repository -run "Test(ReconcileAnimeProviderBackgrounds|ResolveAnimeAssetURL|AnimeAssetCompatibilityUsesV2CoverHelpersWhenLegacySlotsAreGone)" -count=1`
- `cd backend && go test ./internal/repository -count=1`
- `cd backend && go test ./internal/handlers -run "Test(BuildMetadataFieldPreview|MapPersistedAnimeAssets)" -count=1`
- `cd backend && go test ./internal/handlers -run "Test.*AnimeBackdrops.*" -count=1`
- `cd frontend && npm test -- src/app/admin/anime/utils/anime-editor-ownership.test.ts src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.test.ts src/app/admin/anime/[id]/edit/page.test.tsx`
- `cd frontend && npm test -- src/lib/api.admin-anime.test.ts src/app/admin/anime/[id]/edit/page.test.tsx src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.helpers.test.ts src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts`
- `cd frontend && npm run build`

### Review

- Angefragter `$gsd-review --phase 4 --all` konnte nicht als unabhaengiger Cross-AI-Review laufen, weil lokal nur `codex` verfuegbar ist; `gemini` und `claude` CLI fehlen in dieser Workspace-Umgebung.
- Statt eines Fake-Reviews wurde diese Einschraenkung explizit dokumentiert.

## Plan Outputs

- `04-01-SUMMARY.md`
- `04-02-SUMMARY.md`
- `04-03-SUMMARY.md`

## Conclusion

Phase 4 kann als abgeschlossen markiert werden. Phase 5 bleibt der naechste produktive Block und baut jetzt auf einer stabilen Provenance-/Asset-/Resync-Basis auf.
