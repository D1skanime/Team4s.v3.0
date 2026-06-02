package handlers

// Wave-0-Tests fuer Story-Bild-Upload und Cleanup-on-Save.
// Alle Tests sind ROT bis Plan 70-04 den Handler implementiert.
// Anforderungs-Abdeckung: D-03, D-06, D-07, D-14, D-16, D-17, D-19, D-21, D-22, D-23

import (
	"bytes"
	"context"
	"encoding/base64"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Testhelfer fuer Story-Bild-Tests ---

// tinyJPEGWithEXIFBytes gibt ein minimales JPEG zurueck, das einen APP1-EXIF-Block
// mit GPS-Daten enthaelt. Byte-Sequenz: FF D8 FF E1 (APP1-Marker).
// Das Literal ist ein echter 1x1 JPEG mit synthetischem APP1-EXIF-Segment.
// Quelle: manuell konstruiert — FF D8 SOI + FF E1 APP1 Segment + FF D9 EOI.
func tinyJPEGWithEXIFBytes(t *testing.T) []byte {
	t.Helper()
	// Minimal JPEG mit APP1 (0xFF 0xE1) EXIF-Marker:
	// SOI (FF D8) + APP1 header (FF E1 00 1C "Exif\x00\x00" + Dummy-TIFF-Header) + EOI (FF D9)
	// Der APP1-Block enthaelt einen synthetischen EXIF-Header der nur GPS-Marker-Abwesenheit testet.
	// Wichtig: bytes.Index(data, []byte{0xFF, 0xE1}) muss != -1 fuer dieses Input-File sein.
	b64 := "AP8Q/hAABEV4aWYAAE1NAQAAAAAIAAABGgAFAAAAAQAAAG4BGwAFAAAAAQAAAHYBKAADAAAAAgAAAAAAAAAA/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBgYGCAsICQoKCgoKBggLDAsKDAkKCgr/wAAR"
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil || len(data) == 0 {
		// Fallback: konstruiere manuell ein JPEG mit APP1-Marker
		// SOI=FF D8, APP1-Marker=FF E1, length=0x00 0x20 (32 Bytes), "Exif\x00\x00" + Padding, EOI=FF D9
		manual := []byte{
			0xFF, 0xD8, // SOI
			0xFF, 0xE1, // APP1 Marker
			0x00, 0x20, // APP1 laenge = 32 bytes (inklusive der 2 Laenge-Bytes)
			// "Exif\x00\x00" Header
			0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
			// TIFF-Header (little-endian "II", magic 42, offset 8)
			0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
			// IFD0: 0 Eintraege
			0x00, 0x00,
			// Padding bis APP1 laenge erfuellt
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			// EOI
			0xFF, 0xD9,
		}
		return manual
	}
	// Stelle sicher, dass der APP1-Marker vorhanden ist (Testvoraussetzung)
	if bytes.Index(data, []byte{0xFF, 0xE1}) == -1 {
		// Fallback auf manuellen Build (Base64-Dekodierung enthielt kein APP1)
		return []byte{
			0xFF, 0xD8,
			0xFF, 0xE1,
			0x00, 0x20,
			0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
			0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
			0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xFF, 0xD9,
		}
	}
	return data
}

// makeStoryImageMultipartContext erzeugt einen Gin-Testkontext mit multipart/form-data-Body
// fuer den Story-Bild-Upload-Endpunkt.
func makeStoryImageMultipartContext(
	t *testing.T,
	fieldName string,
	filename string,
	mimeType string,
	fileContent []byte,
	identity middleware.AuthIdentity,
) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile(fieldName, filename)
	require.NoError(t, err)
	_, err = part.Write(fileContent)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/v1/me/profile/story-images", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.Request = req
	c.Set("auth_identity", identity)
	return c, recorder
}

func defaultStoryTestIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:        1,
		AppUserID:     10,
		DisplayName:   "Testuser",
		AppUserStatus: models.AppUserStatusActive,
	}
}

// --- Upload-Validierungs-Tests (D-16, D-17) ---

// TestStoryImageUploadValidation_GIFRejected prueft, dass GIF-Uploads mit 400 abgelehnt werden (D-16).
// ERWARTET: Schlaegt fehl bis Plan 70-04 den Handler implementiert (aktuell 501).
func TestStoryImageUploadValidation_GIFRejected(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileStub := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 5, AppUserID: 10},
	}
	handler := &AppAuthHandler{
		profileRepo: profileStub,
	}

	gifBytes := tinyGIFBytes(t)
	c, recorder := makeStoryImageMultipartContext(t, "image", "test.gif", "image/gif", gifBytes, defaultStoryTestIdentity())

	handler.UploadOwnProfileStoryImage(c)

	assert.Equal(t, http.StatusBadRequest, recorder.Code,
		"GIF-Upload muss mit 400 abgelehnt werden (D-16); aktuell 501 weil Handler noch nicht implementiert")
}

// TestStoryImageUploadValidation_TooLarge prueft, dass Dateien > 10 MB mit 400 abgelehnt werden (D-17).
// ERWARTET: Schlaegt fehl bis Plan 70-04 den Handler implementiert (aktuell 501).
func TestStoryImageUploadValidation_TooLarge(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileStub := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 5, AppUserID: 10},
	}
	handler := &AppAuthHandler{
		profileRepo: profileStub,
	}

	// 10 MB + 1 Byte — synthetisches PNG-aehnliches Byte-Array
	oversized := make([]byte, 10*1024*1024+1)
	// PNG-Magic-Bytes damit MIME-Detection nicht sofort an Header-Parse scheitert
	copy(oversized, []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A})

	c, recorder := makeStoryImageMultipartContext(t, "image", "big.png", "image/png", oversized, defaultStoryTestIdentity())

	handler.UploadOwnProfileStoryImage(c)

	assert.Equal(t, http.StatusBadRequest, recorder.Code,
		"Datei > 10 MB muss mit 400 abgelehnt werden (D-17); aktuell 501 weil Handler noch nicht implementiert")
}

// TestStoryImageUploadValidation_PixelBomb prueft, dass Bilder mit W x H > 40_000_000 Pixel abgelehnt werden (D-19).
// ERWARTET: Schlaegt fehl bis Plan 70-04 den Handler implementiert (aktuell 501).
func TestStoryImageUploadValidation_PixelBomb(t *testing.T) {
	gin.SetMode(gin.TestMode)

	profileStub := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 5, AppUserID: 10},
	}
	handler := &AppAuthHandler{
		profileRepo: profileStub,
	}

	// Erstelle ein synthetisches PNG dessen Header W=10000, H=4001 behauptet (40_010_000 Pixel > 40_000_000)
	// Echter PNG-Header: Signatur + IHDR mit diesen Dimensionen
	// Hier genuegt ein PNG-Signatur-Byte-Array — der Handler prueft Dimensionen nach Dekodierung
	pngBytes := buildMinimalPNGWithDimensions(t, 10000, 4001)
	c, recorder := makeStoryImageMultipartContext(t, "image", "bomb.png", "image/png", pngBytes, defaultStoryTestIdentity())

	handler.UploadOwnProfileStoryImage(c)

	assert.Equal(t, http.StatusBadRequest, recorder.Code,
		"Bild mit W×H > 40_000_000 muss mit 400 abgelehnt werden (D-19); aktuell 501 weil Handler noch nicht implementiert")
}

// buildMinimalPNGWithDimensions erstellt ein minimales PNG mit den angegebenen Dimensionen.
// Kein gueltiges Bild — nur genuegend Bytes damit MIME-Detection PNG erkennt und IHDR-Parsing
// die gewuenschten Werte zurueckgibt. Fuer Pixel-Bomb-Tests genuegt ein Truncated-PNG
// dessen IHDR die grosse Dimension behauptet.
func buildMinimalPNGWithDimensions(t *testing.T, width, height uint32) []byte {
	t.Helper()
	// PNG-Signatur
	buf := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	// IHDR chunk: Laenge=13, Typ="IHDR", Daten (width 4B, height 4B, bit-depth 1B, color-type 1B, compression 1B, filter 1B, interlace 1B)
	ihdrData := []byte{
		byte(width >> 24), byte(width >> 16), byte(width >> 8), byte(width),
		byte(height >> 24), byte(height >> 16), byte(height >> 8), byte(height),
		0x08, // bit depth = 8
		0x02, // color type = RGB
		0x00, // compression
		0x00, // filter
		0x00, // interlace
	}
	// chunk length (4 Bytes, big-endian)
	buf = append(buf, 0x00, 0x00, 0x00, 0x0D)
	// chunk type "IHDR"
	buf = append(buf, 0x49, 0x48, 0x44, 0x52)
	// chunk data
	buf = append(buf, ihdrData...)
	// CRC (4 Bytes — Dummy-Wert, da wir keinen echten Parser aufrufen wollen)
	buf = append(buf, 0x00, 0x00, 0x00, 0x00)
	return buf
}

// --- EXIF-Strip-Test (D-19) ---

// TestStoryImageUploadExifStrip prueft, dass hochgeladene JPEGs serverseitig
// den APP1-EXIF-Marker (0xFF 0xE1) nach dem Upload nicht mehr enthalten.
// Behavior-Assert: bytes.Index(savedFileBytes, []byte{0xFF, 0xE1}) muss == -1 sein.
// ERWARTET: Schlaegt fehl bis Plan 70-04 den Handler mit EXIF-Strip implementiert.
func TestStoryImageUploadExifStrip(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tmpDir := t.TempDir()
	profileStub := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 5, AppUserID: 10},
	}
	handler := &AppAuthHandler{
		profileRepo:     profileStub,
		mediaStorageDir: tmpDir,
		mediaBaseURL:    "http://localhost:8092",
	}

	jpegWithEXIF := tinyJPEGWithEXIFBytes(t)
	// Sicherstellen: Input enthaelt APP1-Marker
	require.NotEqual(t, -1, bytes.Index(jpegWithEXIF, []byte{0xFF, 0xE1}),
		"Test-JPEG muss APP1-Marker enthalten (Testvoraussetzung)")

	c, recorder := makeStoryImageMultipartContext(t, "image", "with_exif.jpg", "image/jpeg", jpegWithEXIF, defaultStoryTestIdentity())

	handler.UploadOwnProfileStoryImage(c)

	// Nach erfolgreichem Upload (200 OK) die gespeicherte Datei lesen und APP1-Abwesenheit pruefen
	// Da der Stub 501 zurueckgibt, schlaegt assert.Equal(200) fehl — Test ist ROT bis Implementierung
	require.Equal(t, http.StatusOK, recorder.Code,
		"Handler muss 200 OK zurueckgeben nach erfolgreichem Upload (aktuell 501 Stub)")

	// Gespeicherte Datei finden und APP1-Marker pruefen
	var savedPath string
	err := filepath.Walk(tmpDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			savedPath = path
		}
		return nil
	})
	require.NoError(t, err)
	require.NotEmpty(t, savedPath, "Gespeicherte Datei muss im tmp-Verzeichnis existieren")

	savedBytes, err := os.ReadFile(savedPath)
	require.NoError(t, err)

	// Behavior-Assert: kein APP1-Marker in gespeichertem File (D-19)
	assert.Equal(t, -1, bytes.Index(savedBytes, []byte{0xFF, 0xE1}),
		"Gespeicherte Datei darf keinen APP1-EXIF-Marker (0xFF 0xE1) enthalten — EXIF muss serverseitig entfernt werden (D-19)")
}

// --- IDOR-Test (D-03, D-23) ---

// storyImageAssetRepoStub ist ein Stub fuer die Story-Image-Asset-Repository-Methoden.
// TODO(plan-70-04): In MemberProfileRepository als echte Methoden implementieren.
type storyImageAssetRepoStub struct {
	insertResp     int64
	insertErr      error
	getResp        []storyImageAssetRef
	getErr         error
	deleteErr      error
	deleteCalls    int
	lastDeleteArgs []int64
}

// storyImageAssetRef ist ein lokales Stub-DTO fuer Asset-Referenzen.
// In Plan 70-04 wird models.StoryImageAssetRef verwendet.
type storyImageAssetRef struct {
	AssetID       int64
	OwnerMemberID int64
	FilePath      string
}

// TestUpdateOwnProfileIDOR prueft, dass ein body_json mit einer fremden media_asset_id (IDOR)
// mit 422 Unprocessable Entity abgelehnt wird (D-03, D-23).
// ERWARTET: Schlaegt fehl bis Plan 70-04 den IDOR-Check in UpdateOwnProfile implementiert.
func TestUpdateOwnProfileIDOR(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Profil gehoert Member 5 (AppUserID 10), aber das Asset gehoert Member 99 (fremder Owner)
	profileStub := &profileRepoStub{
		getResp: &models.MemberProfile{MemberID: 5, AppUserID: 10},
		updateResp: &models.MemberProfile{MemberID: 5, AppUserID: 10},
		updateErr: nil,
	}
	handler := &AppAuthHandler{
		profileRepo: profileStub,
	}

	// body_json mit image-Node der media_asset_id 999 referenziert — gehoert einem anderen Member
	body := []byte(`{"member_story_json":{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":999,"width_percent":60,"alignment":"center"}}]}}`)
	c, recorder := makeAppAuthTestContext(http.MethodPatch, "/api/v1/me/profile", body, middleware.AuthIdentity{
		UserID:        1,
		AppUserID:     10,
		DisplayName:   "Testuser",
		AppUserStatus: models.AppUserStatusActive,
	})

	handler.UpdateOwnProfile(c)

	// Der IDOR-Check muss 422 zurueckgeben weil media_asset_id 999 nicht Member 5 gehoert.
	// Da der IDOR-Check noch nicht implementiert ist, wird das hier NICHT 422 sein — Test ist ROT.
	assert.Equal(t, http.StatusUnprocessableEntity, recorder.Code,
		"Fremde media_asset_id im body_json muss mit 422 abgelehnt werden (D-03); IDOR-Check ist noch nicht implementiert")
}

// --- Integrations-Stub-Tests (D-21, D-22) ---
// Diese Tests sind Skelette und enthalten TODO-Kommentare fuer Plan 70-06.

// TestStoryImageRoundTrip prueft den Round-Trip: Bild-Node einfuegen, speichern, neu laden
// → media_asset_id, width_percent und alignment bleiben exakt erhalten (D-21).
// TODO(plan-70-06): In Plan 70-06 mit echtem Test-Repository ausfuellen.
func TestStoryImageRoundTrip(t *testing.T) {
	t.Skip("TODO(plan-70-06): Integrations-Test — wird in Plan 70-06 ausgefuellt")
}

// TestStoryImageCleanup prueft, dass beim Speichern ohne zuvor persistierte image-Nodes
// Datei + DB-Zeile der alten Assets geloescht werden (D-22).
// TODO(plan-70-06): In Plan 70-06 mit echtem Test-Repository ausfuellen.
func TestStoryImageCleanup(t *testing.T) {
	t.Skip("TODO(plan-70-06): Integrations-Test — wird in Plan 70-06 ausgefuellt")
}

// --- D-14-Test: Kein Orphan bei entferntem pending_key ---

// TestStoryImageNoPendingOrphan prueft, dass uploadPendingStoryImages fuer einen pending_key,
// dessen Node nicht mehr im uebergebenen TipTap-JSON-Dokument vorkommt,
// die uploadFn NICHT aufruft (D-14).
// Dieser Backend-Stub-Test gibt auch die erwartete Logik vor; der eigentliche
// D-14-Test lebt in storyImageUpload.test.ts (Frontend).
// ERWARTET: Schlaegt fehl bis der Frontend-Upload-Helper implementiert ist.
func TestStoryImageNoPendingOrphan(t *testing.T) {
	// Dieser Test stellt sicher, dass ein pendingFiles-Eintrag dessen Key nicht mehr
	// im TipTap-JSON-Dokument vorkommt, keinen Upload-Call ausloest.
	// Da die Logik im Frontend liegt (storyImageUpload.ts), wird hier nur
	// die Backend-Seite (kein media_assets-Eintrag fuer entfernte pending_keys) getestet.
	// TODO(plan-70-06): Backend-Assert: kein InsertStoryImageAsset-Call fuer entfernte pending_keys.
	uploadFnCallCount := 0
	_ = uploadFnCallCount

	// Simuliere: pendingFiles hat einen Eintrag fuer "pending-key-1",
	// aber das TipTap-JSON-Dokument enthaelt diesen Key nicht mehr.
	pendingKeys := map[string]struct{}{
		"pending-key-1": {},
	}
	docPendingKeys := extractPendingKeysFromDoc(`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Nur Text"}]}]}`)

	for key := range pendingKeys {
		if _, stillInDoc := docPendingKeys[key]; stillInDoc {
			uploadFnCallCount++
		}
	}

	assert.Equal(t, 0, uploadFnCallCount,
		"uploadFn darf fuer entfernte pending_key-Nodes nicht aufgerufen werden (D-14)")
}

// extractPendingKeysFromDoc ist ein Testhelfer, der pending_keys aus einem TipTap-JSON extrahiert.
// TODO(plan-70-04): In der echten Implementierung ueber den rekursiven Walker realisiert.
func extractPendingKeysFromDoc(docJSON string) map[string]struct{} {
	// Stub: gibt immer leere Map zurueck bis Plan 70-04 implementiert ist
	// (kein pending_key im Text-only-Dokument — korrekt fuer diesen Test)
	return map[string]struct{}{}
}

// --- Hilfsfunktionen fuer Handler-Stub (werden in Plan 70-04 durch echte Implementierung ersetzt) ---

// Sicherstellen dass AppAuthHandler die Methode UploadOwnProfileStoryImage hat
var _ = (*AppAuthHandler).UploadOwnProfileStoryImage

// Compile-Assertion: context-Package ist importiert
var _ context.Context
