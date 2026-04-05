package services

type AssetLifecycleError struct {
	Code    string
	Message string
	Details map[string]any
	Err     error
}

func (e *AssetLifecycleError) Error() string {
	return e.Message
}

func (e *AssetLifecycleError) Unwrap() error {
	return e.Err
}

const (
	AssetLifecycleCodeInvalidEntityType = "asset_lifecycle.invalid_entity_type"
	AssetLifecycleCodeInvalidEntityID   = "asset_lifecycle.invalid_entity_id"
	AssetLifecycleCodeInvalidAssetType  = "asset_lifecycle.invalid_asset_type"
	AssetLifecycleCodeUnsafePath        = "asset_lifecycle.unsafe_path"
	AssetLifecycleCodeInvalidStructure  = "asset_lifecycle.invalid_structure"
	AssetLifecycleCodeAuditFailed       = "asset_lifecycle.audit_failed"
)
