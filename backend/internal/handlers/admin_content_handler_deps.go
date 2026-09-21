package handlers

// Phase-165-Erweiterungen von AdminContentHandler (Library Discovery und additive
// Jellyfin-Mehrfach-Ordner-Verwaltung): schmale Repo-Interfaces plus die zugehoerigen
// nachtraeglichen With*-Verdrahtungs-Methoden. Ausgelagert aus admin_content_handler.go,
// weil dieses zusammen mit den vorher schon dort deklarierten Interfaces/Methoden die
// CLAUDE.md-Obergrenze von 450 Zeilen pro Produktionsdatei ueberschritten hat
// (459 Zeilen, siehe 165-VERIFICATION.md). Reine mechanische Verschiebung, kein
// Verhaltensunterschied -- Struct-Felder (discoveryCache/discoveryExistingMatchRepo/
// libraryDiscoveryIgnoreRepo/folderManagementRepo) bleiben im AdminContentHandler-Typ in
// admin_content_handler.go, da Go Struct-Felder nicht ueber Dateien hinweg deklarieren kann.

import (
	"context"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// jellyfinDiscoveryExistingMatchRepository ist der Existenz-Lookup der Discovery-Liste
// (165-06); zeigt in Produktion auf dieselbe repo-Instanz wie `repo` (Muster: animeCreateRepo).
type jellyfinDiscoveryExistingMatchRepository interface {
	FindExistingAnimeByJellyfinIntakeRefs(ctx context.Context, seriesIDs []string, paths []string) ([]repository.ExistingJellyfinAnimeMatch, error)
}

// libraryDiscoveryIgnoreRepository ist der Ignore-Zugriff (165-02/165-06) der Discovery-Liste
// und der Ignore/Unignore-Endpunkte.
type libraryDiscoveryIgnoreRepository interface {
	InsertLibraryDiscoveryIgnore(ctx context.Context, itemID string, actorAppUserID *int64) error
	RemoveLibraryDiscoveryIgnore(ctx context.Context, itemID string) error
	FindIgnoredLibraryDiscoveryItems(ctx context.Context, itemIDs []string) (map[string]bool, error)
}

// jellyfinFolderManagementRepository (165-07): schmale Repo-Oberflaeche fuer
// connectJellyfinFolderAdditively und RemoveAnimeJellyfinFolder (jellyfin_source_folder_management.go),
// analog zum 165-06-Muster (jellyfinDiscoveryExistingMatchRepository) -- ermoeglicht Handler-Tests mit
// Fakes statt einer echten Postgres-Instanz. Zeigt in Produktion auf dieselbe repo-Instanz wie `repo`.
type jellyfinFolderManagementRepository interface {
	GetAnimeSyncSource(ctx context.Context, animeID int64) (*models.AdminAnimeSyncSource, error)
	ApplyJellyfinSyncMetadata(ctx context.Context, animeID int64, sourceTag string, folderName *string, year *int16, description *string, maxEpisodes *int16, forceSourceUpdate bool) error
	LinkAdditionalJellyfinSource(ctx context.Context, animeID int64, source string) error
	RemoveAnimeSourceLink(ctx context.Context, animeID int64, source string) error
}

// WithDiscoveryCacheDeps verdrahtet den Discovery-Snapshot-Cache nachtraeglich (165-01).
// Ungenutzt, solange kein Aufrufer (main.go, 165-06+) sie verdrahtet — nil discoveryCache
// bedeutet lediglich "kein Cache", buildJellyfinDiscoverySnapshot bleibt dann funktional,
// nur ohne TTL-Wiederverwendung.
func (h *AdminContentHandler) WithDiscoveryCacheDeps(cache discoveryCacheStore) *AdminContentHandler {
	h.discoveryCache = cache
	return h
}

// WithLibraryDiscoveryIgnoreDeps verdrahtet das LibraryDiscoveryIgnoreRepository
// (165-02/165-06) nachtraeglich, analog zu WithDiscoveryCacheDeps. nil bleibt ein gueltiger
// Zustand fuer Tests, die den Ignore-Zustand nicht brauchen — ListJellyfinDiscovery
// behandelt ein nil libraryDiscoveryIgnoreRepo als "keine ignorierten Items".
func (h *AdminContentHandler) WithLibraryDiscoveryIgnoreDeps(repo libraryDiscoveryIgnoreRepository) *AdminContentHandler {
	h.libraryDiscoveryIgnoreRepo = repo
	return h
}
