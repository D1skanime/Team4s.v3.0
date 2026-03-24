package main

import (
	"context"
	"errors"
	"log"
	"os/exec"
	"strings"

	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/repository"

	"github.com/jackc/pgx/v5/pgconn"
)

func validateRuntimeConfig(cfg config.Config) {
	runtimeProfile := strings.TrimSpace(cfg.RuntimeProfile)
	if runtimeProfile == "" {
		runtimeProfile = "local"
	}
	if strings.TrimSpace(cfg.AuthTokenSecret) == "" {
		log.Fatal("AUTH_TOKEN_SECRET is required")
	}
	if cfg.AuthAccessTokenTTLSeconds <= 0 {
		log.Fatal("AUTH_ACCESS_TOKEN_TTL_SECONDS must be greater than 0")
	}
	if cfg.AuthRefreshTokenTTLSeconds <= 0 {
		log.Fatal("AUTH_REFRESH_TOKEN_TTL_SECONDS must be greater than 0")
	}
	if cfg.ReleaseStreamGrantTTLSeconds <= 0 {
		log.Fatal("RELEASE_STREAM_GRANT_TTL_SECONDS must be greater than 0")
	}
	if cfg.EpisodePlaybackRateLimit <= 0 {
		log.Fatal("EPISODE_PLAYBACK_RATE_LIMIT must be greater than 0")
	}
	if cfg.EpisodePlaybackRateWindowSec <= 0 {
		log.Fatal("EPISODE_PLAYBACK_RATE_WINDOW_SECONDS must be greater than 0")
	}
	if cfg.EpisodePlaybackMaxConcurrent <= 0 {
		log.Fatal("EPISODE_PLAYBACK_MAX_CONCURRENT_STREAMS must be greater than 0")
	}
	if !cfg.AuthIssueDevMode {
		return
	}
	if !isLocalDevProfile(runtimeProfile) {
		log.Fatalf("AUTH_ISSUE_DEV_MODE must be false when RUNTIME_PROFILE=%s", runtimeProfile)
	}
	if cfg.AuthIssueDevUserID <= 0 {
		log.Fatal("AUTH_ISSUE_DEV_USER_ID must be greater than 0 when AUTH_ISSUE_DEV_MODE=true")
	}

	displayName := strings.TrimSpace(cfg.AuthIssueDevDisplayName)
	if displayName == "" {
		log.Fatal("AUTH_ISSUE_DEV_DISPLAY_NAME is required when AUTH_ISSUE_DEV_MODE=true")
	}
	if len([]rune(displayName)) > 80 {
		log.Fatal("AUTH_ISSUE_DEV_DISPLAY_NAME must be at most 80 characters")
	}
	log.Printf("warning: AUTH_ISSUE_DEV_MODE=true (RUNTIME_PROFILE=%s)", runtimeProfile)
}

func resolveReleaseGrantSecret(cfg config.Config) string {
	secret := strings.TrimSpace(cfg.ReleaseStreamGrantSecret)
	if secret != "" {
		return secret
	}
	return strings.TrimSpace(cfg.AuthTokenSecret)
}

func resolveAdminBootstrapUserIDs(cfg config.Config) []int64 {
	return cfg.AuthAdminBootstrapUserIDs
}

func bootstrapAdminRoleAssignments(
	ctx context.Context,
	authzRepo *repository.AuthzRepository,
	roleName string,
	userIDs []int64,
) error {
	if authzRepo == nil {
		return nil
	}

	trimmedRoleName := strings.TrimSpace(roleName)
	if trimmedRoleName == "" {
		trimmedRoleName = "admin"
	}
	if len(userIDs) == 0 {
		return nil
	}
	if _, err := authzRepo.EnsureRole(ctx, trimmedRoleName); err != nil {
		return err
	}

	for _, userID := range userIDs {
		if userID <= 0 {
			continue
		}
		if err := authzRepo.AssignRole(ctx, userID, trimmedRoleName); err != nil {
			return err
		}
	}
	return nil
}

func isUndefinedTableError(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "42P01"
}

func isLocalDevProfile(profile string) bool {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "", "local", "dev", "development", "test":
		return true
	default:
		return false
	}
}

func checkFFmpegAvailability(ffmpegPath string) error {
	return exec.Command(ffmpegPath, "-version").Run()
}
