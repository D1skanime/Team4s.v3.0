package services

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

type mockAssetLifecycleStore struct {
	subject *models.AssetLifecycleSubject
	lookupErr error
	events  []models.AssetLifecycleAuditEntry
}

func (m *mockAssetLifecycleStore) LookupAssetLifecycleSubject(ctx context.Context, entityType string, entityID int64) (*models.AssetLifecycleSubject, error) {
	if m.lookupErr != nil {
		return nil, m.lookupErr
	}
	if m.subject != nil {
		return m.subject, nil
	}
	return &models.AssetLifecycleSubject{EntityType: entityType, EntityID: entityID}, nil
}

func (m *mockAssetLifecycleStore) RecordAssetLifecycleEvent(ctx context.Context, entry models.AssetLifecycleAuditEntry) error {
	m.events = append(m.events, entry)
	return nil
}

func TestPhase6AnimeAssetLifecyclePolicy_AnimeOnly(t *testing.T) {
	policy := Phase6AnimeAssetLifecyclePolicy()
	if policy.EntityType != "anime" {
		t.Fatalf("expected anime entity type, got %q", policy.EntityType)
	}
	if _, ok := policy.AllowedAssetTypes["cover"]; !ok {
		t.Fatal("expected cover asset type to be allowed")
	}
	if _, ok := policy.AllowedAssetTypes["background_video"]; !ok {
		t.Fatal("expected background_video asset type to be allowed")
	}
}

func TestAssetLifecycleService_RejectsUnsupportedEntityType(t *testing.T) {
	service := NewAssetLifecycleService(&mockAssetLifecycleStore{}, t.TempDir())
	_, err := service.EnsureCanonicalLayout(context.Background(), 22, "group", 14, "cover")
	var lifecycleErr *AssetLifecycleError
	if err == nil || !errors.As(err, &lifecycleErr) {
		t.Fatalf("expected asset lifecycle error, got %v", err)
	}
	if lifecycleErr.Code != AssetLifecycleCodeInvalidEntityType {
		t.Fatalf("expected invalid entity type code, got %q", lifecycleErr.Code)
	}
}

func TestAssetLifecycleService_RejectsMissingAnimeSubject(t *testing.T) {
	service := NewAssetLifecycleService(&mockAssetLifecycleStore{lookupErr: repository.ErrNotFound}, t.TempDir())
	_, err := service.EnsureCanonicalLayout(context.Background(), 22, "anime", 404, "cover")
	var lifecycleErr *AssetLifecycleError
	if !errors.As(err, &lifecycleErr) {
		t.Fatalf("expected asset lifecycle error, got %v", err)
	}
	if lifecycleErr.Code != AssetLifecycleCodeInvalidEntityID {
		t.Fatalf("expected invalid entity id code, got %q", lifecycleErr.Code)
	}
}

func TestAssetLifecycleService_EnsuresCanonicalFoldersAndAuditsActor(t *testing.T) {
	store := &mockAssetLifecycleStore{}
	service := NewAssetLifecycleService(store, t.TempDir())

	result, err := service.EnsureCanonicalLayout(context.Background(), 44, "anime", 123, "cover")
	if err != nil {
		t.Fatalf("ensure canonical layout: %v", err)
	}
	if result.EntityType != "anime" {
		t.Fatalf("expected anime entity type, got %q", result.EntityType)
	}
	if len(result.Statuses) != len(Phase6AnimeAssetLifecyclePolicy().RequiredFolders) {
		t.Fatalf("expected %d folder statuses, got %d", len(Phase6AnimeAssetLifecyclePolicy().RequiredFolders), len(result.Statuses))
	}
	for _, folder := range Phase6AnimeAssetLifecyclePolicy().RequiredFolders {
		if _, err := os.Stat(filepath.Join(result.RootPath, folder)); err != nil {
			t.Fatalf("expected folder %q to exist: %v", folder, err)
		}
	}
	if len(store.events) != 1 {
		t.Fatalf("expected one audit event, got %d", len(store.events))
	}
	if store.events[0].ActorUserID != 44 {
		t.Fatalf("expected actor 44, got %d", store.events[0].ActorUserID)
	}
}

func TestAssetLifecycleService_ReusesExistingFoldersIdempotently(t *testing.T) {
	service := NewAssetLifecycleService(&mockAssetLifecycleStore{}, t.TempDir())

	first, err := service.EnsureCanonicalLayout(context.Background(), 44, "anime", 123, "cover")
	if err != nil {
		t.Fatalf("first ensure canonical layout: %v", err)
	}
	second, err := service.EnsureCanonicalLayout(context.Background(), 44, "anime", 123, "banner")
	if err != nil {
		t.Fatalf("second ensure canonical layout: %v", err)
	}

	if first.RootPath != second.RootPath {
		t.Fatalf("expected same root path, got %q and %q", first.RootPath, second.RootPath)
	}
	for _, status := range second.Statuses {
		if status.State != "already_exists" {
			t.Fatalf("expected already_exists on second run, got %q for %s", status.State, status.Folder)
		}
	}
}

func TestAssetLifecycleService_RejectsReservedFolderCollision(t *testing.T) {
	root := t.TempDir()
	base := filepath.Join(root, "anime", "123")
	if err := os.MkdirAll(base, 0o755); err != nil {
		t.Fatalf("mkdir base: %v", err)
	}
	if err := os.WriteFile(filepath.Join(base, "cover"), []byte("not a dir"), 0o644); err != nil {
		t.Fatalf("write colliding file: %v", err)
	}

	service := NewAssetLifecycleService(&mockAssetLifecycleStore{}, root)
	_, err := service.EnsureCanonicalLayout(context.Background(), 44, "anime", 123, "cover")
	var lifecycleErr *AssetLifecycleError
	if !errors.As(err, &lifecycleErr) {
		t.Fatalf("expected asset lifecycle error, got %v", err)
	}
	if lifecycleErr.Code != AssetLifecycleCodeInvalidStructure {
		t.Fatalf("expected invalid structure code, got %q", lifecycleErr.Code)
	}
}

func TestAssetLifecycleService_RejectsUnsupportedAssetType(t *testing.T) {
	service := NewAssetLifecycleService(&mockAssetLifecycleStore{}, t.TempDir())
	_, err := service.EnsureCanonicalLayout(context.Background(), 44, "anime", 123, "poster")
	var lifecycleErr *AssetLifecycleError
	if !errors.As(err, &lifecycleErr) {
		t.Fatalf("expected asset lifecycle error, got %v", err)
	}
	if lifecycleErr.Code != AssetLifecycleCodeInvalidAssetType {
		t.Fatalf("expected invalid asset type code, got %q", lifecycleErr.Code)
	}
}

func TestAssetLifecycleService_ResolveCanonicalRootRejectsEscapes(t *testing.T) {
	ok, err := isPathWithinBase(filepath.Join("C:\\tmp", "media"), filepath.Join("C:\\tmp", "escape", "123"))
	if err != nil {
		t.Fatalf("isPathWithinBase returned error: %v", err)
	}
	if ok {
		t.Fatal("expected path to escape the base directory")
	}
}
