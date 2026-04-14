package models

import "time"

// AnimeAssetOwnership kennzeichnet die Herkunft eines Anime-Assets:
// "manual" steht für manuell hochgeladene Assets, "provider" für extern bezogene Assets.
type AnimeAssetOwnership string

const (
	// AnimeAssetOwnershipManual bezeichnet ein vom Admin manuell hochgeladenes Asset.
	AnimeAssetOwnershipManual AnimeAssetOwnership = "manual"
	// AnimeAssetOwnershipProvider bezeichnet ein von einem externen Provider (z.B. Jellyfin) stammendes Asset.
	AnimeAssetOwnershipProvider AnimeAssetOwnership = "provider"
)

// AnimeResolvedAsset repräsentiert ein einzelnes aufgelöstes Asset eines Anime (z.B. Cover, Banner, Logo),
// inklusive Herkunftsinformation und optionalem Provider-Schlüssel.
type AnimeResolvedAsset struct {
	MediaID     *string             `json:"media_id,omitempty"`
	URL         string              `json:"url"`
	Ownership   AnimeAssetOwnership `json:"ownership"`
	ProviderKey *string             `json:"provider_key,omitempty"`
}

// AnimeBackgroundAsset repräsentiert ein Hintergrundbild eines Anime mit Sortierreihenfolge
// und Zeitstempeln, wird in der Asset-Verwaltung der Admin-Oberfläche verwendet.
type AnimeBackgroundAsset struct {
	ID          int64               `json:"id"`
	MediaID     *string             `json:"media_id,omitempty"`
	URL         string              `json:"url"`
	Ownership   AnimeAssetOwnership `json:"ownership"`
	ProviderKey *string             `json:"provider_key,omitempty"`
	SortOrder   int32               `json:"sort_order"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

// AnimeResolvedAssets fasst alle aufgelösten Assets eines Anime zusammen
// und wird als vollständige Asset-Antwort der Asset-API zurückgegeben.
type AnimeResolvedAssets struct {
	Cover           *AnimeResolvedAsset    `json:"cover,omitempty"`
	Banner          *AnimeResolvedAsset    `json:"banner,omitempty"`
	Logo            *AnimeResolvedAsset    `json:"logo,omitempty"`
	BackgroundVideo *AnimeResolvedAsset    `json:"background_video,omitempty"`
	Backgrounds     []AnimeBackgroundAsset `json:"backgrounds"`
}

// AnimeProviderAssetInput enthält die Eingabedaten zum Zuweisen eines Provider-Assets
// (z.B. eines Jellyfin-Bildes) zu einem Anime-Asset-Slot.
type AnimeProviderAssetInput struct {
	URL         string
	ProviderKey string
}

// AnimeAssetRemovalResult enthält die Liste der beim Löschen entfernten Dateipfade.
type AnimeAssetRemovalResult struct {
	RemovedPaths []string `json:"removed_paths,omitempty"`
}
