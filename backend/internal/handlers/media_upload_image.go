package handlers

import (
	"context"
	"fmt"
	"image"
	"image/jpeg"
	"log"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/disintegration/imaging"
)

// displayMaxEdge begrenzt die lange Kante der statischen "display"-Variante (JPEG-Re-Encode,
// nie hochskaliert). displayAnimatedMaxEdge begrenzt dieselbe Kante fuer die animierte
// WebP-"display"-Variante, die aus animierten GIFs erzeugt wird. displayJPEGQuality ist die
// JPEG-Qualitaet der statischen Variante (D-01: "hohe Qualitaet (WebP oder JPEG >= 88)").
const (
	displayMaxEdge         = 1920
	displayAnimatedMaxEdge = 960
	displayJPEGQuality     = 88
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
	// re-encodiert; fuer animierte GIFs als animiertes WebP via ffmpeg (nicht-fatal bei
	// fehlendem/fehlschlagendem ffmpeg -- original+thumb bleiben in jedem Fall erhalten).
	var displaySize int64
	if isAnimatedGIF {
		displayRelPath, displayWidth, displayHeight, ok := h.generateAnimatedDisplayVariant(
			req, mediaID, storagePath, originalPath,
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
	} else {
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

// generateAnimatedDisplayVariant erzeugt die "display"-Variante fuer animierte GIFs (animiertes
// WebP, lange Kante <= displayAnimatedMaxEdge). Schlaegt die Erzeugung fehl (kein ffmpeg
// konfiguriert, Konvertierung schlaegt fehl), wird das nicht-fatal behandelt -- der Upload
// liefert weiterhin original + thumb, nur ohne zusaetzliche "display"-Zeile (ok=false).
func (h *MediaUploadHandler) generateAnimatedDisplayVariant(
	req models.UploadRequest,
	mediaID string,
	storagePath string,
	originalGIFPath string,
) (relPath string, width int, height int, ok bool) {
	displayFilename := "display.webp"
	displayPath := filepath.Join(storagePath, displayFilename)
	displayRelPath := h.buildRelativePath(req.EntityType, req.EntityID, req.AssetType, mediaID, displayFilename)

	if err := GenerateAnimatedWebPDisplay(h.ffmpegPath, originalGIFPath, displayPath); err != nil {
		log.Printf("media_upload: animierte display-variante konnte nicht erzeugt werden (nicht-fatal): %v", err)
		return "", 0, 0, false
	}

	cfg, probeErr := decodeImageConfigFile(displayPath)
	if probeErr != nil {
		log.Printf("media_upload: display-webp-dimensionen konnten nicht ermittelt werden (nicht-fatal): %v", probeErr)
		return "", 0, 0, false
	}

	return displayRelPath, cfg.Width, cfg.Height, true
}

// decodeImageConfigFile oeffnet path und liest nur die Bild-Dimensionen (kein Vollbild-Decode) --
// genutzt, um die Breite/Hoehe einer gerade von ffmpeg erzeugten animierten WebP-Datei zu
// ermitteln (golang.org/x/image/webp kann Frame 0 fuer die Dimensions-Ermittlung lesen, auch
// wenn es die Animation selbst nicht abspielen kann).
func decodeImageConfigFile(path string) (image.Config, error) {
	f, err := os.Open(path)
	if err != nil {
		return image.Config{}, err
	}
	defer f.Close()
	cfg, _, err := image.DecodeConfig(f)
	return cfg, err
}

// GenerateAnimatedWebPDisplay erzeugt aus einer animierten GIF-Quelle (srcGIFPath) eine
// animierte WebP-"display"-Variante (destWebPPath): Endlosschleife, lange Kante begrenzt auf
// displayAnimatedMaxEdge, nie hochskaliert. Exportiert, damit der Phase-173-Backfill-CLI
// (173-07) denselben Pfad fuer bereits auf Platte liegende Dateien wiederverwenden kann.
//
// Sicherheitsmuster: fester Argument-Vektor (exec.Command), keine Shell, keine String-
// Interpolation von Dateinamen in einen einzelnen Kommandostring -- identisch zum bereits
// geprueften Muster in media_service_segment.go (ExtractImageFrame).
func GenerateAnimatedWebPDisplay(ffmpegPath, srcGIFPath, destWebPPath string) error {
	if strings.TrimSpace(ffmpegPath) == "" {
		return fmt.Errorf("ffmpeg ist nicht konfiguriert")
	}
	scaleFilter := fmt.Sprintf(
		"scale='min(%d,iw)':'min(%d,ih)':force_original_aspect_ratio=decrease:flags=lanczos",
		displayAnimatedMaxEdge, displayAnimatedMaxEdge,
	)
	cmd := exec.Command(
		ffmpegPath, "-y",
		"-i", srcGIFPath,
		"-loop", "0",
		"-vf", scaleFilter,
		"-vcodec", "libwebp_anim",
		destWebPPath,
	)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("ffmpeg animierte webp-erzeugung fehlgeschlagen: %w (%s)", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func (h *MediaUploadHandler) isAnimatedGIF(file multipart.File) bool {
	return true
}

func (h *MediaUploadHandler) saveAsWebP(img image.Image, path string) error {
	return imaging.Save(img, path)
}
