package handlers

import (
	"context"
	"fmt"
	"image"
	"image/jpeg"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
)

// displayMaxEdge begrenzt die lange Kante der statischen "display"-Variante (JPEG-Re-Encode,
// nie hochskaliert). displayJPEGQuality ist die JPEG-Qualitaet der statischen Variante
// (D-01: "hohe Qualitaet (WebP oder JPEG >= 88)").
const (
	displayMaxEdge     = 1920
	displayJPEGQuality = 88
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
	img, format, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("bild konnte nicht dekodiert werden: %w", err)
	}

	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	ext := imageExtFromMime(mimeType)
	originalFilename := "original." + ext
	// imaging.Save kann WebP nicht encodieren (nur decodieren) -- der Thumb wird fuer
	// WebP-Quellen daher als JPEG re-encodiert statt mit einer .webp-Endung zu scheitern.
	// Das Original bleibt davon unberuehrt (siehe webp-Zweig unten: rohe Bytes).
	thumbExt := ext
	if mimeType == "image/webp" {
		thumbExt = "jpg"
	}
	thumbFilename := "thumb." + thumbExt

	originalPath := filepath.Join(storagePath, originalFilename)
	originalRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, originalFilename)
	isAnimatedGIF := format == "gif" && h.isAnimatedGIF(file)
	switch {
	case isAnimatedGIF:
		originalPath = filepath.Join(storagePath, "original.gif")
		originalRelPath = h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, "original.gif")
		file.Seek(0, 0)
		if err := h.saveFile(file, originalPath); err != nil {
			return nil, fmt.Errorf("original gif speichern: %w", err)
		}
	case mimeType == "image/webp":
		// WebP ist mit imaging.Save nicht encodierbar (nur decodierbar) -- die rohen
		// hochgeladenen Bytes bleiben daher unveraendert erhalten statt silently als JPEG
		// re-encodiert und mit .jpg umbenannt zu werden.
		file.Seek(0, 0)
		if err := h.saveFile(file, originalPath); err != nil {
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
	thumb := imaging.Resize(img, thumbWidth, 0, imaging.Lanczos)
	if err := imaging.Save(thumb, thumbPath); err != nil {
		return nil, fmt.Errorf("thumbnail speichern: %w", err)
	}

	thumbBounds := thumb.Bounds()
	thumbSize, _ := h.getFileSize(thumbPath)
	files = append(files, models.UploadFileInfo{
		Variant: "thumb",
		Path:    thumbRelPath,
		Width:   thumbBounds.Dx(),
		Height:  thumbBounds.Dy(),
	})

	// "display"-Variante: fuer statische Bilder (inkl. WebP-Original, s.o.) immer als JPEG
	// re-encodiert. Animierte GIFs erhalten ihre eigene display-Erzeugung (animiertes WebP)
	// in einem Folge-Task -- hier bleibt es bewusst bei original+thumb fuer den GIF-Zweig.
	var displaySize int64
	if !isAnimatedGIF {
		displayRelPath, displayWidth, displayHeight, err := h.generateStaticDisplayVariant(
			req, mediaID, storagePath, img, originalWidth, originalHeight,
		)
		if err != nil {
			return nil, err
		}
		displayPath := filepath.Join(storagePath, "display.jpg")
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

// generateStaticDisplayVariant erzeugt die "display"-Variante fuer statische Bilder (JPEG,
// lange Kante <= displayMaxEdge, nie hochskaliert) -- unabhaengig vom Quell-Mimetyp immer als
// JPEG re-encodiert (D-01, keine neue Encoder-Abhaengigkeit).
func (h *MediaUploadHandler) generateStaticDisplayVariant(
	req models.UploadRequest,
	mediaID string,
	storagePath string,
	img image.Image,
	originalWidth, originalHeight int,
) (relPath string, width int, height int, err error) {
	display := img
	longEdge := originalWidth
	if originalHeight > longEdge {
		longEdge = originalHeight
	}
	if longEdge > displayMaxEdge {
		if originalWidth >= originalHeight {
			display = imaging.Resize(img, displayMaxEdge, 0, imaging.Lanczos)
		} else {
			display = imaging.Resize(img, 0, displayMaxEdge, imaging.Lanczos)
		}
	}

	displayFilename := "display.jpg"
	displayPath := filepath.Join(storagePath, displayFilename)
	displayRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, displayFilename)

	out, createErr := os.Create(displayPath)
	if createErr != nil {
		return "", 0, 0, fmt.Errorf("display datei anlegen: %w", createErr)
	}
	defer out.Close()
	if encErr := jpeg.Encode(out, display, &jpeg.Options{Quality: displayJPEGQuality}); encErr != nil {
		return "", 0, 0, fmt.Errorf("display speichern: %w", encErr)
	}

	displayBounds := display.Bounds()
	return displayRelPath, displayBounds.Dx(), displayBounds.Dy(), nil
}

func (h *MediaUploadHandler) isAnimatedGIF(file multipart.File) bool {
	return true
}

func (h *MediaUploadHandler) saveAsWebP(img image.Image, path string) error {
	return imaging.Save(img, path)
}
