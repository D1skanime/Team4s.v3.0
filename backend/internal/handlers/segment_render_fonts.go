package handlers

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"team4s.v3/backend/internal/jellyfin"
	"team4s.v3/backend/internal/services"
)

const (
	segmentFontDirPrefix      = "fonts-"
	segmentFontMaxAttachments = 64
	segmentFontMaxBytes       = 64 << 20
)

// jellyfinMediaAttachment beschreibt einen eingebetteten Container-Anhang (z. B. MKV-Fonts).
type jellyfinMediaAttachment struct {
	Index    int32  `json:"Index"`
	Codec    string `json:"Codec"`
	FileName string `json:"FileName"`
	MimeType string `json:"MimeType"`
}

// isSegmentFontAttachment erkennt Font-Anhaenge, die Fansub-ASS-Spuren (Karaoke) benoetigen.
func isSegmentFontAttachment(attachment jellyfinMediaAttachment) bool {
	codec := strings.ToLower(strings.TrimSpace(attachment.Codec))
	switch codec {
	case "ttf", "otf", "ttc":
		return true
	}
	mime := strings.ToLower(strings.TrimSpace(attachment.MimeType))
	if strings.Contains(mime, "font") || strings.Contains(mime, "opentype") || strings.Contains(mime, "truetype") {
		return true
	}
	ext := strings.ToLower(filepath.Ext(strings.TrimSpace(attachment.FileName)))
	return ext == ".ttf" || ext == ".otf" || ext == ".ttc"
}

// downloadSegmentSubtitleFonts laedt die eingebetteten Fonts der Quelle in ein kontrolliertes
// Temp-Verzeichnis, damit libass die Fansub-Schriften findet. Ohne diese Fonts rendert ffmpeg
// ASS-Zeilen mit unbekannter Schrift unsichtbar. Rueckgabe "" = keine Fonts (kein Fehler).
func (h *AdminContentHandler) downloadSegmentSubtitleFonts(
	ctx context.Context,
	itemID string,
	mediaSourceID string,
	attachments []jellyfinMediaAttachment,
	tempDir string,
) string {
	trimmedItemID := strings.TrimSpace(itemID)
	trimmedSourceID := strings.TrimSpace(mediaSourceID)
	trimmedTempDir := strings.TrimSpace(tempDir)
	if trimmedItemID == "" || trimmedSourceID == "" || trimmedTempDir == "" || len(attachments) == 0 {
		return ""
	}
	baseDir, err := filepath.Abs(trimmedTempDir)
	if err != nil {
		return ""
	}
	fontDir, ok := resolveControlledFilePath(baseDir, segmentFontDirPrefix+uuid.NewString())
	if !ok {
		return ""
	}
	if err := os.MkdirAll(fontDir, 0o755); err != nil {
		log.Printf("segment_render_fonts: font-verzeichnis konnte nicht erstellt werden: %v", err)
		return ""
	}

	downloaded := 0
	for _, attachment := range attachments {
		if downloaded >= segmentFontMaxAttachments {
			break
		}
		if attachment.Index < 0 || !isSegmentFontAttachment(attachment) {
			continue
		}
		if err := h.downloadJellyfinFontAttachment(ctx, trimmedItemID, trimmedSourceID, attachment, fontDir); err != nil {
			log.Printf(
				"segment_render_fonts: font-download fehlgeschlagen (item=%s, index=%d): %s",
				trimmedItemID,
				attachment.Index,
				services.SanitizeSegmentRenderLog(err.Error(), h.jellyfinAPIKey),
			)
			continue
		}
		downloaded++
	}
	if downloaded == 0 {
		_ = os.RemoveAll(fontDir)
		return ""
	}
	return fontDir
}

func (h *AdminContentHandler) downloadJellyfinFontAttachment(
	ctx context.Context,
	itemID string,
	mediaSourceID string,
	attachment jellyfinMediaAttachment,
	fontDir string,
) error {
	baseURL := strings.TrimSpace(h.jellyfinBaseURL)
	if baseURL == "" || strings.TrimSpace(h.jellyfinAPIKey) == "" {
		return fmt.Errorf("jellyfin configuration missing")
	}
	attachmentPath := fmt.Sprintf(
		"/Videos/%s/%s/Attachments/%s",
		url.PathEscape(itemID),
		url.PathEscape(mediaSourceID),
		strconv.FormatInt(int64(attachment.Index), 10),
	)
	target, err := jellyfin.BuildURL(baseURL, attachmentPath, nil)
	if err != nil {
		return err
	}
	req, err := jellyfin.NewRequest(ctx, http.MethodGet, target.String(), baseURL, h.jellyfinAPIKey)
	if err != nil {
		return fmt.Errorf("create jellyfin attachment request: %w", err)
	}
	resp, err := jellyfin.Do(h.httpClient, req, baseURL)
	if err != nil {
		return fmt.Errorf("call jellyfin attachment endpoint: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("jellyfin attachment endpoint returned status %d", resp.StatusCode)
	}

	ext := strings.ToLower(filepath.Ext(strings.TrimSpace(attachment.FileName)))
	if ext != ".ttf" && ext != ".otf" && ext != ".ttc" {
		ext = ".ttf"
		if codec := strings.ToLower(strings.TrimSpace(attachment.Codec)); codec == "otf" || codec == "ttc" {
			ext = "." + codec
		}
	}
	// Eigener Dateiname statt Anhangsname: verhindert Pfad-Tricks, libass liest den Fontnamen aus der Datei.
	destPath, ok := resolveControlledFilePath(fontDir, "font-"+strconv.FormatInt(int64(attachment.Index), 10)+ext)
	if !ok {
		return fmt.Errorf("font temp path is invalid")
	}
	out, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return fmt.Errorf("create font temp file: %w", err)
	}
	defer out.Close()
	written, err := io.Copy(out, io.LimitReader(resp.Body, segmentFontMaxBytes+1))
	if err != nil || written > segmentFontMaxBytes {
		_ = os.Remove(destPath)
		if err == nil {
			err = fmt.Errorf("font attachment exceeds size limit")
		}
		return err
	}
	return nil
}
