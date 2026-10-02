package handlers

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"io"
	"mime/multipart"
	"path/filepath"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/disintegration/imaging"
)

// imageExtFromMime gibt die Dateiendung (ohne Punkt) für einen Bild-MIME-Typ zurück.
// Unbekannte Typen werden als JPEG behandelt.
func imageExtFromMime(mimeType string) string {
	switch mimeType {
	case "image/png":
		return "png"
	case "image/gif":
		return "gif"
	case "image/webp":
		return "webp"
	default:
		return "jpg"
	}
}

func (h *MediaUploadHandler) processImage(
	ctx context.Context,
	file multipart.File,
	mimeType string,
	mediaID string,
	req models.UploadRequest,
	storagePath string,
	actorUserID int64,
	provisioning *models.ProvisioningResult,
) (*models.UploadResponse, error) {
	// Rohe Bytes werden EINMAL gelesen und fuer Dekodierung, EXIF/XMP-Entfernung (WebP) und
	// echte Animations-Erkennung (GIF/WebP) wiederverwendet (Phase 173 Review-Korrektur -- vorher
	// wurde direkt vom multipart.File dekodiert und isAnimatedGIF gab unconditional true zurueck).
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("datei lesen: %w", err)
	}

	// D-20/D-21: animiertes WebP wird NICHT mehr ueber image.Decode behandelt --
	// golang.org/x/image/webp kann ANMF-Animationsframes nicht dekodieren (nur VP8/VP8L auf
	// oberster RIFF-Ebene) und wuerde hier fehlschlagen. Breite/Hoehe kommen stattdessen aus dem
	// VP8X-Chunk per image.DecodeConfig (funktioniert unabhaengig vom Animations-Flag); Thumb und
	// Display werden weiter unten ueber vipsthumbnail erzeugt (services.ExtractFirstFrameViaVips /
	// services.GenerateAnimatedDisplayViaVips).
	isAnimatedWebPUpload := mimeType == "image/webp" && services.IsAnimatedWebPData(data)

	var img image.Image
	var format string
	var originalWidth, originalHeight int
	if isAnimatedWebPUpload {
		cfg, _, cfgErr := image.DecodeConfig(bytes.NewReader(data))
		if cfgErr != nil {
			return nil, fmt.Errorf("animiertes webp dimensionen ermitteln: %w", cfgErr)
		}
		format = "webp"
		originalWidth, originalHeight = cfg.Width, cfg.Height
	} else {
		decoded, decFormat, decErr := image.Decode(bytes.NewReader(data))
		if decErr != nil {
			return nil, fmt.Errorf("bild konnte nicht dekodiert werden: %w", decErr)
		}
		img = decoded
		format = decFormat
		bounds := img.Bounds()
		originalWidth = bounds.Dx()
		originalHeight = bounds.Dy()
	}

	ext := imageExtFromMime(mimeType)
	originalFilename := "original." + ext
	// imaging.Save kann WebP nicht encodieren (nur decodieren) -- der Thumb wird fuer
	// WebP-Quellen daher als JPEG re-encodiert statt mit einer .webp-Endung zu scheitern.
	// Das Original bleibt davon unberuehrt (siehe webp-Zweig unten: rohe, EXIF/XMP-bereinigte Bytes).
	thumbExt := ext
	if mimeType == "image/webp" {
		thumbExt = "jpg"
	}
	thumbFilename := "thumb." + thumbExt

	originalPath := filepath.Join(storagePath, originalFilename)
	originalRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, originalFilename)
	isAnimatedGIF := format == "gif" && services.IsAnimatedGIFData(data)
	switch {
	case isAnimatedGIF:
		originalPath = filepath.Join(storagePath, "original.gif")
		originalRelPath = h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "original.gif")
		if err := h.writeBytes(data, originalPath); err != nil {
			return nil, fmt.Errorf("original gif speichern: %w", err)
		}
	case mimeType == "image/webp":
		// WebP ist mit imaging.Save nicht encodierbar (nur dekodierbar) -- die rohen
		// hochgeladenen Bytes bleiben daher (minus EXIF/XMP, D-06/D-15) unveraendert erhalten
		// statt silently als JPEG re-encodiert und mit .jpg umbenannt zu werden.
		stripped, stripErr := services.StripWebPMetadata(data)
		if stripErr != nil {
			return nil, fmt.Errorf("webp exif/xmp entfernen: %w", stripErr)
		}
		if err := h.writeBytes(stripped, originalPath); err != nil {
			return nil, fmt.Errorf("original webp speichern: %w", err)
		}
	default:
		if err := imaging.Save(img, originalPath); err != nil {
			return nil, fmt.Errorf("original speichern: %w", err)
		}
	}

	originalSize, _ := h.getFileSize(originalPath)
	files := []models.UploadFileInfo{{
		Variant: "original",
		Path:    originalRelPath,
		Width:   originalWidth,
		Height:  originalHeight,
	}}

	thumbPath := filepath.Join(storagePath, thumbFilename)
	thumbRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, thumbFilename)
	var thumbFinalWidth, thumbFinalHeight int
	if isAnimatedWebPUpload {
		// golang.org/x/image/webp kann Frame 0 einer Animation nicht extrahieren (s.o.) --
		// vipsthumbnail ohne "[n=-1]" laedt standardmaessig nur den ersten Frame.
		jpegData, w, hgt, thumbErr := services.ExtractFirstFrameViaVips(h.vipsThumbnailPath, data, ".webp", thumbWidth)
		if thumbErr != nil {
			return nil, fmt.Errorf("thumbnail speichern: %w", thumbErr)
		}
		if writeErr := h.writeBytes(jpegData, thumbPath); writeErr != nil {
			return nil, fmt.Errorf("thumbnail speichern: %w", writeErr)
		}
		thumbFinalWidth, thumbFinalHeight = w, hgt
	} else {
		thumb := imaging.Resize(img, thumbWidth, 0, imaging.Lanczos)
		if err := imaging.Save(thumb, thumbPath); err != nil {
			return nil, fmt.Errorf("thumbnail speichern: %w", err)
		}
		thumbBounds := thumb.Bounds()
		thumbFinalWidth, thumbFinalHeight = thumbBounds.Dx(), thumbBounds.Dy()
	}

	thumbSize, _ := h.getFileSize(thumbPath)
	files = append(files, models.UploadFileInfo{
		Variant: "thumb",
		Path:    thumbRelPath,
		Width:   thumbFinalWidth,
		Height:  thumbFinalHeight,
	})

	// "display"-Variante: fuer animierte GIFs als animiertes WebP via ffmpeg (Rueckfall bei
	// fehlendem/fehlschlagendem ffmpeg: Original-GIF unveraendert, NIE ein statisches Bild fuer
	// eine Animation, D-19); fuer alle anderen statischen Bilder (inkl. WebP-Original, s.o.)
	// ueber die gemeinsame EncodeStaticDisplayVariant-Funktion (PNG bei Transparenz, sonst JPEG,
	// D-18) -- dieselbe Funktion, die Release-Version-Media/Fansub-Media nutzen.
	var displaySize int64
	switch {
	case isAnimatedGIF:
		displayRelPath, displayWidth, displayHeight, ok := h.generateAnimatedDisplayVariant(
			req, mediaID, storagePath, data,
		)
		if ok {
			displayPath := filepath.Join(storagePath, "display.webp")
			displaySize, _ = h.getFileSize(displayPath)
			files = append(files, models.UploadFileInfo{
				Variant: "display",
				Path:    displayRelPath,
				Width:   displayWidth,
				Height:  displayHeight,
			})
		}
	case isAnimatedWebPUpload:
		displayRelPath, displayWidth, displayHeight, ok := h.generateAnimatedWebPDisplayVariant(
			req, mediaID, storagePath, data,
		)
		if ok {
			displayPath := filepath.Join(storagePath, "display.webp")
			displaySize, _ = h.getFileSize(displayPath)
			files = append(files, models.UploadFileInfo{
				Variant: "display",
				Path:    displayRelPath,
				Width:   displayWidth,
				Height:  displayHeight,
			})
		}
	default:
		displayRelPath, displayExt, displayWidth, displayHeight, err := h.generateStaticDisplayVariant(
			req, mediaID, storagePath, img, originalWidth, originalHeight,
		)
		if err != nil {
			return nil, err
		}
		displayPath := filepath.Join(storagePath, "display."+displayExt)
		displaySize, _ = h.getFileSize(displayPath)
		files = append(files, models.UploadFileInfo{
			Variant: "display",
			Path:    displayRelPath,
			Width:   displayWidth,
			Height:  displayHeight,
		})
	}

	usePathFallback, err := h.shouldUseAnimePosterPathFallback(ctx, req)
	if err != nil {
		h.cleanupStoragePath(storagePath)
		return nil, err
	}
	if usePathFallback {
		return &models.UploadResponse{
			ID:           originalRelPath,
			Status:       "completed",
			Files:        files,
			URL:          h.buildPublicURL(originalRelPath),
			Provisioning: provisioning,
		}, nil
	}

	txErr := h.repo.WithTx(ctx, func(txRepo repository.MediaUploadRepo) error {
		asset := &models.UploadMediaAsset{
			ID:         mediaID,
			EntityType: req.EntityType,
			EntityID:   req.EntityID,
			AssetType:  req.AssetType,
			Format:     "image",
			MimeType:   mimeType,
			UploadedBy: &actorUserID,
			CreatedAt:  time.Now(),
			FilePath:   originalRelPath,
			MediaType:  mediaTypeForUploadAsset(req.AssetType),
		}
		if err := txRepo.CreateMediaAsset(ctx, asset); err != nil {
			return fmt.Errorf("datenbank: media asset: %w", err)
		}
		for _, fileInfo := range files {
			size := thumbSize
			switch fileInfo.Variant {
			case "original":
				size = originalSize
			case "display":
				size = displaySize
			}
			if err := txRepo.CreateMediaFile(ctx, &models.UploadMediaFile{
				MediaID: asset.ID,
				Variant: fileInfo.Variant,
				Path:    fileInfo.Path,
				Width:   fileInfo.Width,
				Height:  fileInfo.Height,
				Size:    size,
			}); err != nil {
				return fmt.Errorf("datenbank: media file: %w", err)
			}
		}
		if err := h.createJoinTableEntryWithRepo(ctx, txRepo, req.EntityType, req.EntityID, asset.ID); err != nil {
			return fmt.Errorf("datenbank: join table: %w", err)
		}
		mediaID = asset.ID
		return nil
	})
	if txErr != nil {
		h.cleanupStoragePath(storagePath)
		return nil, txErr
	}

	return &models.UploadResponse{
		ID:           mediaID,
		Status:       "completed",
		Files:        files,
		URL:          h.buildPublicURL(originalRelPath),
		Provisioning: provisioning,
	}, nil
}

// writeBytes speichert data unveraendert unter path ab (kein Re-Encode).
func (h *MediaUploadHandler) writeBytes(data []byte, path string) error {
	return h.saveFile(bytes.NewReader(data), path)
}

// generateStaticDisplayVariant erzeugt die "display"-Variante fuer statische Bilder ueber die
// gemeinsame services.EncodeStaticDisplayVariant-Funktion (lange Kante <= DisplayMaxLongEdge,
// nie hochskaliert; PNG bei Transparenz, sonst JPEG >= DisplayJPEGQuality) -- Phase 173
// Review-Korrektur: vorher eine eigene, immer-JPEG-Implementierung hier dupliziert.
func (h *MediaUploadHandler) generateStaticDisplayVariant(
	req models.UploadRequest,
	mediaID string,
	storagePath string,
	img image.Image,
	originalWidth, originalHeight int,
) (relPath string, ext string, width int, height int, err error) {
	data, encExt, _, w, hgt, encErr := services.EncodeStaticDisplayVariant(img, originalWidth, originalHeight)
	if encErr != nil {
		return "", "", 0, 0, fmt.Errorf("display speichern: %w", encErr)
	}

	displayFilename := "display." + encExt
	displayPath := filepath.Join(storagePath, displayFilename)
	displayRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, displayFilename)

	if writeErr := h.writeBytes(data, displayPath); writeErr != nil {
		return "", "", 0, 0, fmt.Errorf("display datei anlegen: %w", writeErr)
	}

	return displayRelPath, encExt, w, hgt, nil
}

// generateAnimatedDisplayVariant erzeugt die "display"-Variante fuer animierte GIFs (animiertes
// WebP, lange Kante <= services.DisplayAnimatedMaxEdge). Schlaegt die Erzeugung fehl (kein
// ffmpeg konfiguriert, Konvertierung schlaegt fehl), wird das nicht-fatal behandelt -- der
// Upload liefert weiterhin original + thumb, nur ohne zusaetzliche "display"-Zeile (ok=false).
func (h *MediaUploadHandler) generateAnimatedDisplayVariant(
	req models.UploadRequest,
	mediaID string,
	storagePath string,
	originalGIFData []byte,
) (relPath string, width int, height int, ok bool) {
	displayFilename := "display.webp"
	displayPath := filepath.Join(storagePath, displayFilename)
	displayRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, displayFilename)

	webpData, w, hgt, err := services.GenerateAnimatedWebPDisplayFromBytes(h.ffmpegPath, originalGIFData)
	if err != nil {
		return "", 0, 0, false
	}
	if err := h.writeBytes(webpData, displayPath); err != nil {
		return "", 0, 0, false
	}

	return displayRelPath, w, hgt, true
}

// generateAnimatedWebPDisplayVariant erzeugt die "display"-Variante fuer animierte WebP-Uploads
// (D-20/D-21, lange Kante <= services.DisplayAnimatedMaxEdge) via vipsthumbnail statt ffmpeg
// (ffmpeg kann animiertes WebP laut 173-RESEARCH.md nicht dekodieren). Schlaegt die Erzeugung
// fehl (vipsthumbnail nicht konfiguriert/fehlgeschlagen), wird das nicht-fatal behandelt -- der
// Upload liefert weiterhin original + thumb, nur ohne zusaetzliche "display"-Zeile (ok=false),
// identisch zum Nicht-Fatal-Muster von generateAnimatedDisplayVariant.
func (h *MediaUploadHandler) generateAnimatedWebPDisplayVariant(
	req models.UploadRequest,
	mediaID string,
	storagePath string,
	originalWebPData []byte,
) (relPath string, width int, height int, ok bool) {
	displayFilename := "display.webp"
	displayPath := filepath.Join(storagePath, displayFilename)
	displayRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, displayFilename)

	webpData, w, hgt, err := services.GenerateAnimatedDisplayViaVips(h.vipsThumbnailPath, originalWebPData, ".webp", services.DisplayAnimatedMaxEdge)
	if err != nil {
		return "", 0, 0, false
	}
	if err := h.writeBytes(webpData, displayPath); err != nil {
		return "", 0, 0, false
	}

	return displayRelPath, w, hgt, true
}
