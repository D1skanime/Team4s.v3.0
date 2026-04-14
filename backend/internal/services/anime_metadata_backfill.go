package services

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/repository"
)

// AnimeMetadataBackfillReport fasst die Ergebnisse eines Metadaten-Backfill-Laufs zusammen
// und enthält Zähler für verarbeitete Anime, aktualisierte Titel, Genre-Links sowie aufgetretene Fehler.
type AnimeMetadataBackfillReport struct {
	AnimeProcessed    int
	TitlesUpserted    int
	TitlesUnchanged   int
	GenresCreated     int
	GenreLinksCreated int
	GenreLinksSkipped int
	Errors            []string
}

// AnimeMetadataBackfillService führt den einmaligen Metadaten-Backfill vom Legacy-Schema
// in die normalisierten Titels- und Genre-Tabellen durch.
type AnimeMetadataBackfillService struct {
	repo *repository.AnimeMetadataRepository
}

// NewAnimeMetadataBackfillService erstellt einen neuen AnimeMetadataBackfillService mit dem angegebenen Repository.
func NewAnimeMetadataBackfillService(repo *repository.AnimeMetadataRepository) *AnimeMetadataBackfillService {
	return &AnimeMetadataBackfillService{repo: repo}
}

// Backfill führt den Metadaten-Backfill für alle Legacy-Anime-Quellen durch und gibt
// einen Bericht über verarbeitete Anime, Titelupserts und Genrelinks zurück.
func (s *AnimeMetadataBackfillService) Backfill(ctx context.Context) (*AnimeMetadataBackfillReport, error) {
	sources, err := s.repo.ListLegacyAnimeMetadataSources(ctx)
	if err != nil {
		return nil, err
	}

	jaLanguageID, err := s.repo.GetLanguageID(ctx, "ja")
	if err != nil {
		return nil, fmt.Errorf("resolve ja language: %w", err)
	}
	deLanguageID, err := s.repo.GetLanguageID(ctx, "de")
	if err != nil {
		return nil, fmt.Errorf("resolve de language: %w", err)
	}
	enLanguageID, err := s.repo.GetLanguageID(ctx, "en")
	if err != nil {
		return nil, fmt.Errorf("resolve en language: %w", err)
	}

	mainTitleTypeID, err := s.repo.GetTitleTypeID(ctx, "main")
	if err != nil {
		return nil, fmt.Errorf("resolve main title type: %w", err)
	}
	officialTitleTypeID, err := s.repo.GetTitleTypeID(ctx, "official")
	if err != nil {
		return nil, fmt.Errorf("resolve official title type: %w", err)
	}

	report := &AnimeMetadataBackfillReport{
		Errors: make([]string, 0),
	}

	for _, source := range sources {
		report.AnimeProcessed++

		titleCandidates := buildLegacyTitleCandidates(
			source.Title,
			source.TitleDE,
			source.TitleEN,
			jaLanguageID,
			deLanguageID,
			enLanguageID,
			mainTitleTypeID,
			officialTitleTypeID,
		)
		for _, candidate := range titleCandidates {
			changed, titleErr := s.repo.UpsertAnimeTitle(
				ctx,
				source.AnimeID,
				candidate.languageID,
				candidate.titleTypeID,
				candidate.title,
			)
			if titleErr != nil {
				report.Errors = append(report.Errors, fmt.Sprintf("anime %d title backfill: %v", source.AnimeID, titleErr))
				continue
			}
			if changed {
				report.TitlesUpserted++
			} else {
				report.TitlesUnchanged++
			}
		}

		for _, genre := range tokenizeLegacyGenres(source.GenreRaw) {
			genreID, created, genreErr := s.repo.EnsureGenre(ctx, genre)
			if genreErr != nil {
				report.Errors = append(report.Errors, fmt.Sprintf("anime %d genre %q: %v", source.AnimeID, genre, genreErr))
				continue
			}
			if created {
				report.GenresCreated++
			}

			linked, linkErr := s.repo.EnsureAnimeGenreLink(ctx, source.AnimeID, genreID)
			if linkErr != nil {
				report.Errors = append(report.Errors, fmt.Sprintf("anime %d genre link %q: %v", source.AnimeID, genre, linkErr))
				continue
			}
			if linked {
				report.GenreLinksCreated++
			} else {
				report.GenreLinksSkipped++
			}
		}
	}

	return report, nil
}

type legacyTitleCandidate struct {
	title       string
	languageID  int64
	titleTypeID int64
}

func buildLegacyTitleCandidates(
	title string,
	titleDE *string,
	titleEN *string,
	jaLanguageID int64,
	deLanguageID int64,
	enLanguageID int64,
	mainTitleTypeID int64,
	officialTitleTypeID int64,
) []legacyTitleCandidate {
	candidates := make([]legacyTitleCandidate, 0, 3)
	seen := make(map[string]struct{}, 3)

	appendCandidate := func(raw string, languageID, titleTypeID int64) {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return
		}
		key := fmt.Sprintf("%d:%d:%s", languageID, titleTypeID, strings.ToLower(trimmed))
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		candidates = append(candidates, legacyTitleCandidate{
			title:       trimmed,
			languageID:  languageID,
			titleTypeID: titleTypeID,
		})
	}

	appendCandidate(title, jaLanguageID, mainTitleTypeID)
	if titleDE != nil {
		appendCandidate(*titleDE, deLanguageID, mainTitleTypeID)
	}
	if titleEN != nil {
		appendCandidate(*titleEN, enLanguageID, officialTitleTypeID)
	}

	return candidates
}

func tokenizeLegacyGenres(raw *string) []string {
	if raw == nil {
		return nil
	}

	parts := strings.Split(*raw, ",")
	if len(parts) == 0 {
		return nil
	}

	tokens := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, part := range parts {
		token := strings.TrimSpace(part)
		if token == "" {
			continue
		}
		key := strings.ToLower(token)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		tokens = append(tokens, token)
	}

	return tokens
}
