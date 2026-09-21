package handlers

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
)

// fakeJellyfinFolderManagementRepo is an in-memory jellyfinFolderManagementRepository fake,
// letting Task 1's tests assert exact call-argument shapes (Pitfall-3 regression guard) without a
// live Postgres instance.
type fakeJellyfinFolderManagementRepo struct {
	syncSource    *models.AdminAnimeSyncSource
	syncSourceErr error

	applyCalls             int
	applySourceTag         string
	applyForceSourceUpdate bool

	linkCalls     int
	linkedSources []string

	removeCalls    int
	removedSources []string
	removeErr      error
}

func (f *fakeJellyfinFolderManagementRepo) GetAnimeSyncSource(_ context.Context, _ int64) (*models.AdminAnimeSyncSource, error) {
	if f.syncSourceErr != nil {
		return nil, f.syncSourceErr
	}
	return f.syncSource, nil
}

func (f *fakeJellyfinFolderManagementRepo) ApplyJellyfinSyncMetadata(
	_ context.Context,
	_ int64,
	sourceTag string,
	_ *string,
	_ *int16,
	_ *string,
	_ *int16,
	forceSourceUpdate bool,
) error {
	f.applyCalls++
	f.applySourceTag = sourceTag
	f.applyForceSourceUpdate = forceSourceUpdate
	return nil
}

func (f *fakeJellyfinFolderManagementRepo) LinkAdditionalJellyfinSource(_ context.Context, _ int64, source string) error {
	f.linkCalls++
	f.linkedSources = append(f.linkedSources, source)
	return nil
}

func (f *fakeJellyfinFolderManagementRepo) RemoveAnimeSourceLink(_ context.Context, _ int64, source string) error {
	f.removeCalls++
	if f.removeErr != nil {
		return f.removeErr
	}
	f.removedSources = append(f.removedSources, source)
	return nil
}

var testAdminIdentity = middleware.AuthIdentity{AppUserID: 7, UserID: 7}

// --- Test 1: Pitfall-3 regression guard ------------------------------------------------------

func TestConnectJellyfinFolderAdditively_ProtectsExistingAniSearchSource(t *testing.T) {
	repo := &fakeJellyfinFolderManagementRepo{}
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}

	source := "anisearch:5170"
	animeSource := &models.AdminAnimeSyncSource{ID: 42, Source: &source}
	preview := models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "abc123"}

	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 42, animeSource, preview, "abc123"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.applyCalls != 0 {
		t.Fatalf("expected ApplyJellyfinSyncMetadata NOT to be called, got %d calls", repo.applyCalls)
	}
	if repo.linkCalls != 1 {
		t.Fatalf("expected exactly 1 LinkAdditionalJellyfinSource call, got %d", repo.linkCalls)
	}
	if repo.linkedSources[0] != "jellyfin:abc123" {
		t.Fatalf("unexpected linked source %q", repo.linkedSources[0])
	}
	if animeSource.Source == nil || *animeSource.Source != "anisearch:5170" {
		t.Fatalf("expected anime.source to remain unchanged, got %+v", animeSource.Source)
	}
}

// --- Test 2: pre-existing (non-anisearch) cases keep the old force-write behavior ------------

func TestConnectJellyfinFolderAdditively_UsesForceWritePathWhenNoAniSearchSource(t *testing.T) {
	cases := []struct {
		name             string
		source           *string
		explicitSeriesID string
		wantForce        bool
	}{
		{name: "empty source, no explicit id (regular auto-resolve)", source: nil, explicitSeriesID: "", wantForce: false},
		{name: "jellyfin source, explicit id (re-link same provider)", source: stringPtrFromValue("jellyfin:old"), explicitSeriesID: "new123", wantForce: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeJellyfinFolderManagementRepo{}
			audit := &fakeAuditLogWriter{}
			h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}
			animeSource := &models.AdminAnimeSyncSource{ID: 1, Source: tc.source}
			preview := models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "new123"}

			if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 1, animeSource, preview, tc.explicitSeriesID); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if repo.applyCalls != 1 {
				t.Fatalf("expected 1 ApplyJellyfinSyncMetadata call, got %d", repo.applyCalls)
			}
			if repo.applyForceSourceUpdate != tc.wantForce {
				t.Fatalf("expected forceSourceUpdate=%v, got %v", tc.wantForce, repo.applyForceSourceUpdate)
			}
			if repo.applySourceTag != "jellyfin:new123" {
				t.Fatalf("unexpected source tag %q", repo.applySourceTag)
			}
			if repo.linkCalls != 0 {
				t.Fatalf("expected LinkAdditionalJellyfinSource not called, got %d", repo.linkCalls)
			}
		})
	}
}

// --- Test 3: D-16 folder rename is a plain second additive insert, no special-case branch -----

func TestConnectJellyfinFolderAdditively_HandlesFolderRenameAsPlainSecondInsert(t *testing.T) {
	repo := &fakeJellyfinFolderManagementRepo{}
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}
	source := "anisearch:5170"
	animeSource := &models.AdminAnimeSyncSource{ID: 7, Source: &source}

	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 7, animeSource, models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "old-item"}, "old-item"); err != nil {
		t.Fatalf("unexpected error on first connect: %v", err)
	}
	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 7, animeSource, models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "new-item"}, "new-item"); err != nil {
		t.Fatalf("unexpected error on second (renamed) connect: %v", err)
	}
	if repo.linkCalls != 2 {
		t.Fatalf("expected 2 additive link calls (no special-case rename branch), got %d", repo.linkCalls)
	}
	want := []string{"jellyfin:old-item", "jellyfin:new-item"}
	for i, w := range want {
		if repo.linkedSources[i] != w {
			t.Fatalf("expected linked source[%d]=%q, got %q", i, w, repo.linkedSources[i])
		}
	}
}

// --- Test 4: successful additive connect writes exactly one audit entry -----------------------

func TestConnectJellyfinFolderAdditively_WritesAuditEntry(t *testing.T) {
	repo := &fakeJellyfinFolderManagementRepo{}
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}
	animeSource := &models.AdminAnimeSyncSource{ID: 99}

	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 99, animeSource, models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "abc"}, ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if audit.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", audit.calls)
	}
	entry := audit.entries[0]
	if entry.EventType != "jellyfin_discovery.connected" {
		t.Fatalf("unexpected event_type %q", entry.EventType)
	}
	if entry.TargetType != "anime" {
		t.Fatalf("unexpected target_type %q", entry.TargetType)
	}
	if entry.TargetID == nil || *entry.TargetID != 99 {
		t.Fatalf("unexpected target_id %+v", entry.TargetID)
	}
}
