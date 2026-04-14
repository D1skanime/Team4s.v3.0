package services

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// AssetLifecycleStore definiert den Datenbankzugriffsvertrag, den der AssetLifecycleService
// benötigt, um Subjects nachzuschlagen und Audit-Ereignisse zu speichern.
type AssetLifecycleStore interface {
	LookupAssetLifecycleSubject(ctx context.Context, entityType string, entityID int64) (*models.AssetLifecycleSubject, error)
	RecordAssetLifecycleEvent(ctx context.Context, entry models.AssetLifecycleAuditEntry) error
}

// AssetLifecycleService verwaltet das kanonische Ordnerlayout für Asset-Uploads und
// protokolliert alle Provisionierungsoperationen im Audit-Log.
type AssetLifecycleService struct {
	store      AssetLifecycleStore
	storageDir string
}

// NewAssetLifecycleService erstellt einen neuen AssetLifecycleService mit dem angegebenen
// Datenbankzugriff und Speicherverzeichnis. Leere Speicherverzeichnisse werden durch
// "./storage/media" ersetzt.
func NewAssetLifecycleService(store AssetLifecycleStore, storageDir string) *AssetLifecycleService {
	dir := strings.TrimSpace(storageDir)
	if dir == "" {
		dir = "./storage/media"
	}

	return &AssetLifecycleService{
		store:      store,
		storageDir: dir,
	}
}

// Phase6AnimeAssetLifecyclePolicy gibt die Asset-Lebenszyklus-Policy für Anime-Entities zurück.
// Sie definiert erlaubte Asset-Typen und die erforderlichen Unterordner im kanonischen Layout.
func Phase6AnimeAssetLifecyclePolicy() models.AssetLifecyclePolicy {
	return models.AssetLifecyclePolicy{
		EntityType:  "anime",
		RootSegment: "anime",
		AllowedAssetTypes: map[string]string{
			"cover":            "poster",
			"banner":           "banner",
			"logo":             "logo",
			"background":       "background",
			"background_video": "video",
		},
		RequiredFolders: []string{"cover", "banner", "logo", "background", "background_video"},
	}
}

// EnsureCanonicalLayout stellt sicher, dass das kanonische Ordnerlayout für eine Entity
// auf dem Dateisystem vorhanden ist. Fehlende Ordner werden angelegt. Der Vorgang wird
// im Audit-Log protokolliert.
func (s *AssetLifecycleService) EnsureCanonicalLayout(
	ctx context.Context,
	actorUserID int64,
	entityType string,
	entityID int64,
	assetType string,
) (*models.ProvisioningResult, error) {
	policy, err := s.resolvePolicy(entityType)
	if err != nil {
		return nil, err
	}
	if _, ok := policy.AllowedAssetTypes[strings.TrimSpace(assetType)]; !ok {
		return nil, &AssetLifecycleError{
			Code:    AssetLifecycleCodeInvalidAssetType,
			Message: "ungueltiger asset_type",
			Details: map[string]any{"asset_type": assetType, "entity_type": entityType},
		}
	}

	subject, err := s.store.LookupAssetLifecycleSubject(ctx, policy.EntityType, entityID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, &AssetLifecycleError{
			Code:    AssetLifecycleCodeInvalidEntityID,
			Message: "ungueltige anime id",
			Details: map[string]any{"entity_id": entityID},
		}
	}
	if err != nil {
		return nil, err
	}

	rootPath, err := s.resolveCanonicalRoot(policy, subject.EntityID)
	if err != nil {
		return nil, err
	}

	statuses, err := s.ensureFolders(rootPath, policy.RequiredFolders)
	if err != nil {
		auditErr := s.recordAudit(ctx, actorUserID, subject, assetType, "provision", "failed", map[string]any{
			"error": err.Error(),
		})
		if auditErr != nil {
			return nil, auditErr
		}
		return nil, err
	}

	result := &models.ProvisioningResult{
		EntityType:         subject.EntityType,
		EntityID:           subject.EntityID,
		RequestedAssetType: strings.TrimSpace(assetType),
		RootPath:           rootPath,
		Statuses:           statuses,
	}
	if err := s.recordAudit(ctx, actorUserID, subject, assetType, "provision", "success", map[string]any{
		"statuses": statuses,
		"root_path": rootPath,
	}); err != nil {
		return nil, err
	}

	return result, nil
}

// resolvePolicy gibt die Asset-Lifecycle-Policy für den angegebenen Entity-Typ zurück.
// Derzeit wird nur "anime" unterstützt.
func (s *AssetLifecycleService) resolvePolicy(entityType string) (models.AssetLifecyclePolicy, error) {
	if strings.TrimSpace(strings.ToLower(entityType)) != "anime" {
		return models.AssetLifecyclePolicy{}, &AssetLifecycleError{
			Code:    AssetLifecycleCodeInvalidEntityType,
			Message: "ungueltiger entity_type",
			Details: map[string]any{"entity_type": entityType},
		}
	}
	return Phase6AnimeAssetLifecyclePolicy(), nil
}

// resolveCanonicalRoot berechnet und validiert den kanonischen Wurzelpfad für eine Entity.
// Pfade außerhalb des Speicherverzeichnisses werden mit einem UnsafePath-Fehler abgelehnt.
func (s *AssetLifecycleService) resolveCanonicalRoot(policy models.AssetLifecyclePolicy, entityID int64) (string, error) {
	base := filepath.Clean(s.storageDir)
	target := filepath.Join(base, policy.RootSegment, fmt.Sprintf("%d", entityID))
	ok, err := isPathWithinBase(base, target)
	if err != nil {
		return "", &AssetLifecycleError{
			Code:    AssetLifecycleCodeUnsafePath,
			Message: "ungueltige pfadangabe",
			Details: map[string]any{"storage_dir": s.storageDir},
			Err:     err,
		}
	}
	if !ok {
		return "", &AssetLifecycleError{
			Code:    AssetLifecycleCodeUnsafePath,
			Message: "ungueltige pfadangabe",
			Details: map[string]any{"storage_dir": s.storageDir},
		}
	}
	return target, nil
}

func isPathWithinBase(base string, target string) (bool, error) {
	rel, err := filepath.Rel(filepath.Clean(base), filepath.Clean(target))
	if err != nil {
		return false, err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
		return false, nil
	}
	return true, nil
}

func (s *AssetLifecycleService) ensureFolders(rootPath string, folders []string) ([]models.ProvisioningFolderStatus, error) {
	rootInfo, err := os.Stat(rootPath)
	if err == nil && !rootInfo.IsDir() {
		return nil, &AssetLifecycleError{
			Code:    AssetLifecycleCodeInvalidStructure,
			Message: "reservierter ordnerstamm ist keine directory",
			Details: map[string]any{"root_path": rootPath},
		}
	}
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	if errors.Is(err, os.ErrNotExist) {
		if err := os.MkdirAll(rootPath, 0o755); err != nil {
			return nil, err
		}
	}

	statuses := make([]models.ProvisioningFolderStatus, 0, len(folders))
	for _, folder := range folders {
		target := filepath.Join(rootPath, folder)
		info, err := os.Stat(target)
		if err == nil {
			if !info.IsDir() {
				return nil, &AssetLifecycleError{
					Code:    AssetLifecycleCodeInvalidStructure,
					Message: fmt.Sprintf("reservierter ordner %q ist keine directory", folder),
					Details: map[string]any{"folder": folder, "path": target},
				}
			}
			statuses = append(statuses, models.ProvisioningFolderStatus{Folder: folder, State: "already_exists"})
			continue
		}
		if !errors.Is(err, os.ErrNotExist) {
			return nil, err
		}
		if err := os.MkdirAll(target, 0o755); err != nil {
			return nil, err
		}
		statuses = append(statuses, models.ProvisioningFolderStatus{Folder: folder, State: "created"})
	}

	sort.Slice(statuses, func(i, j int) bool {
		return statuses[i].Folder < statuses[j].Folder
	})
	return statuses, nil
}

func (s *AssetLifecycleService) recordAudit(
	ctx context.Context,
	actorUserID int64,
	subject *models.AssetLifecycleSubject,
	assetType string,
	action string,
	outcome string,
	details map[string]any,
) error {
	entry := models.AssetLifecycleAuditEntry{
		ActorUserID: actorUserID,
		EntityType:  subject.EntityType,
		EntityID:    subject.EntityID,
		AssetType:   strings.TrimSpace(assetType),
		Action:      action,
		Outcome:     outcome,
		Details:     details,
	}
	if err := s.store.RecordAssetLifecycleEvent(ctx, entry); err != nil {
		return &AssetLifecycleError{
			Code:    AssetLifecycleCodeAuditFailed,
			Message: "asset lifecycle audit fehlgeschlagen",
			Details: map[string]any{"entity_id": subject.EntityID, "entity_type": subject.EntityType},
			Err:     err,
		}
	}
	return nil
}
