package handlers

// Wave-0 RED-Test: fansub_media_review_handler.go existiert noch nicht.
// Compile-Fehler auf NewFansubMediaReviewHandler / PatchFansubMediaReview ist das erwartete RED-Signal.
// Diese Tests werden grün, wenn 78-03 den Handler implementiert.

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Stubs für FansubMediaReviewHandler-Tests ---

// fansubMediaRepoStub implementiert das (noch nicht existierende) FansubMediaReviewRepository-Interface.
type fansubMediaRepoStub struct {
	updateErr      error
	updatedMediaID *int64
	ownerID        *int64 // simuliert Besitzer-Prüfung (Cross-Group-Schutz)
	listRows       []repository.FansubGroupMediaReviewRow
	listErr        error
}

func (s *fansubMediaRepoStub) UpdateFansubMediaReview(
	ctx context.Context,
	fansubGroupID, mediaID int64,
	patch repository.FansubMediaReviewPatch,
) error {
	if s.updatedMediaID != nil {
		*s.updatedMediaID = mediaID
	}
	return s.updateErr
}

func (s *fansubMediaRepoStub) UpdateFansubGroupMediaMetadata(
	ctx context.Context,
	fansubGroupID, mediaID int64,
	patch repository.FansubGroupMediaMetadataPatch,
) error {
	if s.updatedMediaID != nil {
		*s.updatedMediaID = mediaID
	}
	return s.updateErr
}

// GetFansubMediaOwner gibt zurück, welcher Gruppe das Medium gehört.
// Wird für Cross-Group-Tamper-Prüfung verwendet (SC3 / T-78-03).
func (s *fansubMediaRepoStub) GetFansubMediaOwner(ctx context.Context, mediaID int64) (int64, error) {
	if s.ownerID != nil {
		return *s.ownerID, nil
	}
	return 0, repository.ErrNotFound
}

func (s *fansubMediaRepoStub) ListFansubGroupMediaForReview(ctx context.Context, fansubGroupID int64) ([]repository.FansubGroupMediaReviewRow, error) {
	return s.listRows, s.listErr
}

// mediaReviewPermissionSvcStub steuert das Ergebnis von CanForFansubGroup.
type mediaReviewPermissionSvcStub struct {
	allowed bool
}

func (s *mediaReviewPermissionSvcStub) CanForFansubGroup(
	ctx context.Context,
	actor permissions.Actor,
	action permissions.Action,
	fansubID int64,
) (permissions.Result, error) {
	if s.allowed {
		return permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed}, nil
	}
	return permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole}, nil
}

// auditMediaReviewStub fängt Write-Aufrufe für Audit-Assertions ab.
type auditMediaReviewStub struct {
	entries []repository.AuditLogEntry
}

func (s *auditMediaReviewStub) Write(ctx context.Context, entry repository.AuditLogEntry) error {
	s.entries = append(s.entries, entry)
	return nil
}

func (s *auditMediaReviewStub) lastEventType() string {
	if len(s.entries) == 0 {
		return ""
	}
	return s.entries[len(s.entries)-1].EventType
}

func (s *auditMediaReviewStub) count() int {
	return len(s.entries)
}

// setMediaReviewTestAuth setzt eine gültige AuthIdentity im Gin-Kontext.
func setMediaReviewTestAuth(c *gin.Context, appUserID int64) {
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:      appUserID,
		AppUserID:   appUserID,
		DisplayName: "Testleader",
	})
}

// buildMediaReviewHandler baut einen FansubMediaReviewHandler mit Stubs.
// RED: NewFansubMediaReviewHandler existiert noch nicht → Compile-Fehler erwartet.
func buildMediaReviewHandler(
	perm *mediaReviewPermissionSvcStub,
	repo *fansubMediaRepoStub,
	audit *auditMediaReviewStub,
) *FansubMediaReviewHandler {
	return NewFansubMediaReviewHandler(repo, perm, audit)
}

func TestFansubMediaReviewList_ReturnsThumbnailAndOriginalURLs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fansubMediaRepoStub{
		listRows: []repository.FansubGroupMediaReviewRow{{
			MediaAssetID:    101,
			PreviewURL:      "/media/group/thumb.jpg",
			ThumbnailURL:    "/media/group/thumb.jpg",
			OriginalURL:     "/media/group/original.jpg",
			Category:        "gallery",
			SortOrder:       10,
			CreatedAt:       time.Date(2026, 6, 25, 12, 0, 0, 0, time.UTC),
			OwnerType:       "fansub_group",
			OwnerID:         1,
			OwnerConsistent: true,
		}},
	}
	handler := buildMediaReviewHandler(
		&mediaReviewPermissionSvcStub{allowed: true},
		repo,
		&auditMediaReviewStub{},
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/fansubs/1/media", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	setMediaReviewTestAuth(c, 42)

	handler.ListFansubGroupMedia(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d - body: %s", rec.Code, rec.Body.String())
	}
	body := rec.Body.String()
	if !strings.Contains(body, `"thumbnail_url":"/media/group/thumb.jpg"`) {
		t.Fatalf("thumbnail_url fehlt in Response: %s", body)
	}
	if !strings.Contains(body, `"original_url":"/media/group/original.jpg"`) {
		t.Fatalf("original_url fehlt in Response: %s", body)
	}
}

// --- TestFansubMediaReview_PermissionDeny (D-09 + T-78-01) ---

func TestFansubMediaReview_PermissionDeny(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditMediaReviewStub{}
	handler := buildMediaReviewHandler(
		&mediaReviewPermissionSvcStub{allowed: false},
		&fansubMediaRepoStub{},
		audit,
	)

	body := `{"visibility":"oeffentlich","review_status":"freigegeben"}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/fansubs/1/media/101", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "mediaId", Value: "101"}}
	setMediaReviewTestAuth(c, 42)

	handler.PatchFansubMediaReview(c)

	// HTTP 403 erwartet
	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403 bei Deny, erhalten %d", rec.Code)
	}

	// D-09: Deny-Audit MUSS geschrieben werden (EventType endet auf ".denied")
	if audit.count() < 1 {
		t.Fatal("Deny-Audit fehlt: auditLogRepo.Write wurde nicht aufgerufen")
	}
	eventType := audit.lastEventType()
	if !strings.HasSuffix(eventType, ".denied") {
		t.Fatalf("Deny-Audit-EventType muss auf '.denied' enden, erhalten: %q", eventType)
	}
}

// --- TestFansubMediaReview_Success_AuditRequired (D-09 + T-78-02) ---

func TestFansubMediaReview_Success_AuditRequired(t *testing.T) {
	gin.SetMode(gin.TestMode)

	ownerID := int64(1)
	audit := &auditMediaReviewStub{}
	repo := &fansubMediaRepoStub{ownerID: &ownerID}
	handler := buildMediaReviewHandler(
		&mediaReviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	body := `{"visibility":"oeffentlich","review_status":"freigegeben"}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/fansubs/1/media/101", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "mediaId", Value: "101"}}
	setMediaReviewTestAuth(c, 42)

	handler.PatchFansubMediaReview(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200 bei erfolgreicher Mutation, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}

	// D-09 Pflicht: Audit-Eintrag mit korrekt besetzten Feldern
	if audit.count() < 1 {
		t.Fatal("Erfolgs-Audit fehlt: auditLogRepo.Write wurde nach Mutation nicht aufgerufen")
	}

	entry := audit.entries[len(audit.entries)-1]

	// EventType muss exakt "fansub_group_media.visibility_updated" sein (D-09, PATTERNS.md)
	if entry.EventType != "fansub_group_media.visibility_updated" {
		t.Fatalf("falsches Audit-EventType: erwartet 'fansub_group_media.visibility_updated', erhalten %q", entry.EventType)
	}

	// ActorAppUserID muss gesetzt sein (D-09 Akteur-Attribution)
	if entry.ActorAppUserID == nil || *entry.ActorAppUserID != 42 {
		t.Fatalf("Audit-ActorAppUserID nicht korrekt gesetzt: %v", entry.ActorAppUserID)
	}

	// ScopeType = "group" (permissions.ScopeTypeGroup)
	if entry.ScopeType != permissions.ScopeTypeGroup {
		t.Fatalf("Audit-ScopeType falsch: erwartet %q, erhalten %q", permissions.ScopeTypeGroup, entry.ScopeType)
	}

	// TargetType = "fansub_group_media"
	if entry.TargetType != "fansub_group_media" {
		t.Fatalf("Audit-TargetType falsch: erwartet 'fansub_group_media', erhalten %q", entry.TargetType)
	}
}

// --- TestFansubMediaReview_InvalidEnum_Returns400 (V5 Input Validation / SC3) ---

func TestFansubMediaReview_InvalidEnum_Returns400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditMediaReviewStub{}
	repo := &fansubMediaRepoStub{}
	handler := buildMediaReviewHandler(
		&mediaReviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	// Ungültiger visibility-Wert
	body := `{"visibility":"geheim","review_status":"freigegeben"}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/fansubs/1/media/101", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "mediaId", Value: "101"}}
	setMediaReviewTestAuth(c, 42)

	handler.PatchFansubMediaReview(c)

	// HTTP 400 erwartet — kein Update darf stattfinden
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("erwartet 400 bei ungültigem Enum, erhalten %d", rec.Code)
	}

	// Keine Mutation durchgeführt
	if repo.updatedMediaID != nil {
		t.Fatal("UpdateFansubMediaReview darf bei ungültigem Enum nicht aufgerufen werden")
	}
}

func TestFansubMediaReview_InvalidReviewStatusEnum_Returns400(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditMediaReviewStub{}
	repo := &fansubMediaRepoStub{}
	handler := buildMediaReviewHandler(
		&mediaReviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	// Ungültiger review_status-Wert
	body := `{"visibility":"intern","review_status":"invalid_status_xyz"}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/fansubs/1/media/101", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "mediaId", Value: "101"}}
	setMediaReviewTestAuth(c, 42)

	handler.PatchFansubMediaReview(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("erwartet 400 bei ungültigem review_status, erhalten %d", rec.Code)
	}
}

// --- TestFansubMediaReview_OwnerMismatch_NoUpdate (Tampering T-78-03 / SC3) ---

func TestFansubMediaReview_OwnerMismatch_NoUpdate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Medium gehört einer anderen Gruppe (owner_id=99, aber Request für fansubId=1)
	differentOwnerID := int64(99)
	audit := &auditMediaReviewStub{}
	repo := &fansubMediaRepoStub{ownerID: &differentOwnerID}
	handler := buildMediaReviewHandler(
		&mediaReviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	body := `{"visibility":"oeffentlich","review_status":"freigegeben"}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/fansubs/1/media/101", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "mediaId", Value: "101"}}
	setMediaReviewTestAuth(c, 42)

	handler.PatchFansubMediaReview(c)

	// Owner-Mismatch → kein Update; 403 oder 404 (beides akzeptabel für Tamper-Mitigation)
	if rec.Code == http.StatusOK {
		t.Fatalf("Update darf bei Owner-Mismatch (Medium gehört fremder Gruppe) nicht durchgeführt werden — erhalten %d", rec.Code)
	}

	// Sicherstellen dass der Body nicht "success" signalisiert
	var respBody map[string]interface{}
	_ = json.NewDecoder(rec.Body).Decode(&respBody)
	if _, hasData := respBody["data"]; hasData {
		t.Fatal("Response darf kein 'data'-Feld bei Owner-Mismatch enthalten")
	}
}

// --- TestFansubMediaReview_ValidEnumValues_Accepted (SC3 positiver Pfad) ---

func TestFansubMediaReview_ValidEnumValues_Accepted(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Kanonischer Enum-Satz (78-CONTEXT "Offene Fragen RESOLVED"):
	// visibility: intern | oeffentlich
	// review_status: in_pruefung | freigegeben | abgelehnt | archiviert | entfernt
	validCases := []struct {
		visibility   string
		reviewStatus string
	}{
		{"intern", "in_pruefung"},
		{"oeffentlich", "freigegeben"},
		{"intern", "abgelehnt"},
		{"intern", "archiviert"},
		{"intern", "entfernt"},
	}

	ownerID := int64(1) // gleiche Gruppe wie fansubId=1

	for _, tc := range validCases {
		t.Run(tc.visibility+"_"+tc.reviewStatus, func(t *testing.T) {
			audit := &auditMediaReviewStub{}
			repo := &fansubMediaRepoStub{ownerID: &ownerID}
			handler := buildMediaReviewHandler(
				&mediaReviewPermissionSvcStub{allowed: true},
				repo,
				audit,
			)

			body, _ := json.Marshal(map[string]string{
				"visibility":    tc.visibility,
				"review_status": tc.reviewStatus,
			})
			rec := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(rec)
			c.Request = httptest.NewRequest(http.MethodPatch, "/api/v1/admin/fansubs/1/media/101", strings.NewReader(string(body)))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "mediaId", Value: "101"}}
			setMediaReviewTestAuth(c, 42)

			handler.PatchFansubMediaReview(c)

			if rec.Code != http.StatusOK {
				t.Fatalf("gültige Enum-Kombi %s/%s sollte 200 liefern, erhalten %d — body: %s",
					tc.visibility, tc.reviewStatus, rec.Code, rec.Body.String())
			}
		})
	}
}
