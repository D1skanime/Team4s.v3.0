package services

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"team4s.v3/backend/internal/repository"
)

// RVMCleanupStaleAge is the duration after which a processing asset is
// considered stale. Hardcoded per D-05 (no env variable needed for V1).
const RVMCleanupStaleAge = 30 * time.Minute

// RVMCleanupInterval is how often the periodic runner fires.
// Hardcoded per D-04 (10 minutes, no env variable needed for V1).
const RVMCleanupInterval = 10 * time.Minute

// RVMCleanupStore is the database interface required by RVMCleanupService.
// Using an interface here decouples the service from *repository.MediaRepository
// so it can be tested with a mock (D-08).
type RVMCleanupStore interface {
	SelectStaleProcessingRVMAssets(ctx context.Context, staleAge time.Duration) ([]repository.StaleProcessingCleanupCandidate, error)
	SelectMissingFileRVMCandidates(ctx context.Context) ([]repository.MissingFileCleanupCandidate, error)
	SelectSoftDeleteRVMCleanupCandidates(ctx context.Context) ([]repository.SoftDeleteCleanupCandidate, error)
	IsMediaAssetReferencedByOtherRVM(ctx context.Context, mediaAssetID, excludeRelationID int64) (bool, error)
	MarkMediaAssetStatusByID(ctx context.Context, mediaAssetID int64, status string) error
	MarkMediaFileMissing(ctx context.Context, mediaFileID int64) error
	HasReadyMediaFileForAsset(ctx context.Context, mediaAssetID int64) (bool, error)
	HardDeleteRVMAndAsset(ctx context.Context, relationID, mediaAssetID int64) error
}

// RVMCleanupService performs periodic cleanup of release-version media assets:
//  1. Stale processing: mark stuck-processing assets as failed and remove staging files
//  2. Missing files: detect absent physical files and escalate the asset when no ready variant remains
//  3. Soft-delete: physically delete files and hard-delete DB rows for exclusively-owned deleted media
//
// All passes are best-effort — errors are logged but do not abort the run or stop the server (D-07).
type RVMCleanupService struct {
	store      RVMCleanupStore
	storageDir string
}

// NewRVMCleanupService creates a new RVMCleanupService.
func NewRVMCleanupService(store RVMCleanupStore, storageDir string) *RVMCleanupService {
	dir := strings.TrimSpace(storageDir)
	if dir == "" {
		dir = "./storage/media"
	}
	return &RVMCleanupService{store: store, storageDir: dir}
}

// RunOnce executes one full cleanup cycle (all three passes).
// Designed to be called periodically from a ticker goroutine in main.go.
func (s *RVMCleanupService) RunOnce(ctx context.Context) {
	s.passStaleProcessing(ctx)
	s.passMissingFiles(ctx)
	s.passSoftDelete(ctx)
}

// passStaleProcessing marks assets stuck in 'processing' as 'failed' and
// removes their staging files from disk.
func (s *RVMCleanupService) passStaleProcessing(ctx context.Context) {
	candidates, err := s.store.SelectStaleProcessingRVMAssets(ctx, RVMCleanupStaleAge)
	if err != nil {
		log.Printf("rvm cleanup: select stale processing assets: %v", err)
		return
	}
	for _, c := range candidates {
		if err := s.store.MarkMediaAssetStatusByID(ctx, c.MediaAssetID, "failed"); err != nil {
			log.Printf("rvm cleanup: mark asset %d failed: %v", c.MediaAssetID, err)
			continue
		}
		removeFileQuietly(c.FilePath)
	}
}

// passMissingFiles checks whether physical files exist and marks absent files
// as 'missing'. If no ready variant remains for the asset, escalates to 'failed'.
func (s *RVMCleanupService) passMissingFiles(ctx context.Context) {
	candidates, err := s.store.SelectMissingFileRVMCandidates(ctx)
	if err != nil {
		log.Printf("rvm cleanup: select missing file candidates: %v", err)
		return
	}
	for _, c := range candidates {
		if c.FilePath == "" {
			continue
		}
		if _, statErr := os.Stat(c.FilePath); statErr == nil {
			// file exists — nothing to do
			continue
		}
		// file is absent
		if err := s.store.MarkMediaFileMissing(ctx, c.MediaFileID); err != nil {
			log.Printf("rvm cleanup: mark file %d missing: %v", c.MediaFileID, err)
			continue
		}
		hasReady, err := s.store.HasReadyMediaFileForAsset(ctx, c.MediaAssetID)
		if err != nil {
			log.Printf("rvm cleanup: check ready files for asset %d: %v", c.MediaAssetID, err)
			continue
		}
		if !hasReady {
			if err := s.store.MarkMediaAssetStatusByID(ctx, c.MediaAssetID, "failed"); err != nil {
				log.Printf("rvm cleanup: escalate asset %d to failed: %v", c.MediaAssetID, err)
			}
		}
	}
}

// passSoftDelete physically removes asset files and hard-deletes DB rows for
// soft-deleted relations that hold exclusively-owned assets.
// A runtime reference check guards against concurrent uploads re-using the asset.
func (s *RVMCleanupService) passSoftDelete(ctx context.Context) {
	candidates, err := s.store.SelectSoftDeleteRVMCleanupCandidates(ctx)
	if err != nil {
		log.Printf("rvm cleanup: select soft delete candidates: %v", err)
		return
	}
	for _, c := range candidates {
		// Runtime safety check: confirm the asset is still exclusively owned.
		referenced, err := s.store.IsMediaAssetReferencedByOtherRVM(ctx, c.MediaAssetID, c.RelationID)
		if err != nil {
			log.Printf("rvm cleanup: reference check for asset %d: %v", c.MediaAssetID, err)
			continue
		}
		if referenced {
			// Another active relation appeared after our SELECT — skip to preserve data.
			log.Printf("rvm cleanup: skipping asset %d — referenced by another active relation", c.MediaAssetID)
			continue
		}

		// Remove physical files first so the DB rows are only deleted on success.
		removeFileQuietly(c.OriginalFilePath)
		removeFileQuietly(c.ThumbFilePath)

		if err := s.store.HardDeleteRVMAndAsset(ctx, c.RelationID, c.MediaAssetID); err != nil {
			log.Printf("rvm cleanup: hard delete relation %d asset %d: %v",
				c.RelationID, c.MediaAssetID, err)
		}
	}
}

// removeFileQuietly deletes a single file, logging but not propagating errors.
// Empty or whitespace-only paths are silently ignored.
func removeFileQuietly(path string) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return
	}
	if err := os.Remove(trimmed); err != nil && !os.IsNotExist(err) {
		log.Printf("rvm cleanup: remove file %s: %v", trimmed, err)
	}
}
