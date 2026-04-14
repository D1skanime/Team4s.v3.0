package services

// AssetLifecycleError repräsentiert einen strukturierten Fehler im Asset-Lebenszyklus-Service.
// Er enthält einen maschinenlesbaren Code, eine lesbare Nachricht, optionale Details und
// einen optionalen Ursachen-Fehler.
type AssetLifecycleError struct {
	Code    string
	Message string
	Details map[string]any
	Err     error
}

// Error gibt die lesbare Fehlermeldung zurück.
func (e *AssetLifecycleError) Error() string {
	return e.Message
}

// Unwrap gibt den zugrundeliegenden Fehler zurück, damit errors.Is/As durchgreifen können.
func (e *AssetLifecycleError) Unwrap() error {
	return e.Err
}

// Fehlercodes für den AssetLifecycleService.
const (
	// AssetLifecycleCodeInvalidEntityType wird verwendet, wenn der Entity-Typ nicht unterstützt wird.
	AssetLifecycleCodeInvalidEntityType = "asset_lifecycle.invalid_entity_type"
	// AssetLifecycleCodeInvalidEntityID wird verwendet, wenn die Entity-ID nicht gefunden wurde.
	AssetLifecycleCodeInvalidEntityID   = "asset_lifecycle.invalid_entity_id"
	// AssetLifecycleCodeInvalidAssetType wird verwendet, wenn der Asset-Typ nicht erlaubt ist.
	AssetLifecycleCodeInvalidAssetType  = "asset_lifecycle.invalid_asset_type"
	// AssetLifecycleCodeUnsafePath wird verwendet, wenn ein Pfad außerhalb des Basisverzeichnisses liegt.
	AssetLifecycleCodeUnsafePath        = "asset_lifecycle.unsafe_path"
	// AssetLifecycleCodeInvalidStructure wird verwendet, wenn eine Datei anstelle eines Ordners vorliegt.
	AssetLifecycleCodeInvalidStructure  = "asset_lifecycle.invalid_structure"
	// AssetLifecycleCodeAuditFailed wird verwendet, wenn der Audit-Eintrag nicht geschrieben werden konnte.
	AssetLifecycleCodeAuditFailed       = "asset_lifecycle.audit_failed"
)
