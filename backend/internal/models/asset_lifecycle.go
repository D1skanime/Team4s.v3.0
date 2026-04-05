package models

type AssetLifecyclePolicy struct {
	EntityType        string
	RootSegment       string
	AllowedAssetTypes map[string]string
	RequiredFolders   []string
}

type AssetLifecycleSubject struct {
	EntityType string
	EntityID   int64
}

type ProvisioningFolderStatus struct {
	Folder string `json:"folder"`
	State  string `json:"state"`
}

type ProvisioningResult struct {
	EntityType         string                   `json:"entity_type"`
	EntityID           int64                    `json:"entity_id"`
	RequestedAssetType string                   `json:"requested_asset_type"`
	RootPath           string                   `json:"root_path"`
	Statuses           []ProvisioningFolderStatus `json:"statuses"`
}

type AssetLifecycleAuditEntry struct {
	ActorUserID int64          `json:"actor_user_id"`
	EntityType  string         `json:"entity_type"`
	EntityID    int64          `json:"entity_id"`
	AssetType   string         `json:"asset_type"`
	Action      string         `json:"action"`
	Outcome     string         `json:"outcome"`
	Details     map[string]any `json:"details,omitempty"`
}
