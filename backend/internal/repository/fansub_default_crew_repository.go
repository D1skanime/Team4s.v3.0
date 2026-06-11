package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DefaultCrewEntry ist ein Eintrag in der Stamm-Crew einer Fansub-Gruppe (D-04).
// Mehrere Rollen pro Person sind möglich (D-05: many-to-many via mehrere Zeilen).
type DefaultCrewEntry struct {
	ID            int64   `json:"id"`
	FansubGroupID int64   `json:"fansub_group_id"`
	MemberID      int64   `json:"member_id"`
	RoleCode      string  `json:"role_code"`
	CreatedBy     *int64  `json:"created_by"`
	CreatedAt     string  `json:"created_at"`
}

// FansubDefaultCrewRepository verwaltet die Stamm-Crew-Einträge (fansub_group_default_crew).
type FansubDefaultCrewRepository struct {
	db *pgxpool.Pool
}

// NewFansubDefaultCrewRepository erstellt ein neues FansubDefaultCrewRepository.
func NewFansubDefaultCrewRepository(db *pgxpool.Pool) *FansubDefaultCrewRepository {
	return &FansubDefaultCrewRepository{db: db}
}

// ListDefaultCrew gibt alle Stamm-Crew-Einträge einer Fansub-Gruppe zurück.
func (r *FansubDefaultCrewRepository) ListDefaultCrew(ctx context.Context, fansubGroupID int64) ([]DefaultCrewEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, member_id, role_code, created_by, created_at
		FROM fansub_group_default_crew
		WHERE fansub_group_id = $1
		ORDER BY member_id, role_code
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list default crew: %w", err)
	}
	defer rows.Close()

	result := make([]DefaultCrewEntry, 0)
	for rows.Next() {
		var entry DefaultCrewEntry
		if err := rows.Scan(
			&entry.ID, &entry.FansubGroupID, &entry.MemberID,
			&entry.RoleCode, &entry.CreatedBy, &entry.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("list default crew: scan: %w", err)
		}
		result = append(result, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list default crew: iterate: %w", err)
	}
	return result, nil
}

// UpsertDefaultCrewEntry fügt einen Stamm-Crew-Eintrag ein oder ignoriert einen Konflikt (idempotent).
// UNIQUE (fansub_group_id, member_id, role_code) — DO NOTHING bei Duplikat.
func (r *FansubDefaultCrewRepository) UpsertDefaultCrewEntry(ctx context.Context, fansubGroupID, memberID int64, roleCode string, createdBy *int64) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO fansub_group_default_crew (fansub_group_id, member_id, role_code, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
		ON CONFLICT (fansub_group_id, member_id, role_code) DO NOTHING
	`, fansubGroupID, memberID, roleCode, createdBy)
	if err != nil {
		if isForeignKeyViolation(err) {
			return ErrNotFound
		}
		return fmt.Errorf("upsert default crew entry: %w", err)
	}
	return nil
}

// DeleteDefaultCrewEntry löscht einen einzelnen Stamm-Crew-Eintrag.
// Gibt ErrNotFound zurück, wenn keine passende Zeile existiert.
func (r *FansubDefaultCrewRepository) DeleteDefaultCrewEntry(ctx context.Context, fansubGroupID, memberID int64, roleCode string) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM fansub_group_default_crew
		WHERE fansub_group_id = $1 AND member_id = $2 AND role_code = $3
	`, fansubGroupID, memberID, roleCode)
	if err != nil {
		return fmt.Errorf("delete default crew entry: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ApplyDefaultCrewToEmptyProjects legt Contributions aus der Stamm-Crew für Anime-Projekte
// der Gruppe an, die noch keine Contributions haben (idempotent via ON CONFLICT DO NOTHING).
// Wenn animeIDs leer ist, werden alle Projekte der Gruppe ohne Contributions berücksichtigt.
// Gibt die Anzahl der neu angelegten Contribution-Zeilen zurück.
func (r *FansubDefaultCrewRepository) ApplyDefaultCrewToEmptyProjects(ctx context.Context, fansubGroupID int64, animeIDs []int64) (int, error) {
	crew, err := r.ListDefaultCrew(ctx, fansubGroupID)
	if err != nil {
		return 0, fmt.Errorf("apply default crew: lade crew: %w", err)
	}
	if len(crew) == 0 {
		return 0, nil
	}

	// Zielprojekte bestimmen: entweder explizit übergeben oder alle ohne Contributions.
	var targetAnimeIDs []int64
	if len(animeIDs) > 0 {
		targetAnimeIDs = animeIDs
	} else {
		rows, err := r.db.Query(ctx, `
			SELECT DISTINCT afg.anime_id
			FROM anime_fansub_groups afg
			WHERE afg.fansub_group_id = $1
			  AND NOT EXISTS (
				SELECT 1 FROM anime_contributions ac
				WHERE ac.fansub_group_id = $1 AND ac.anime_id = afg.anime_id
			  )
		`, fansubGroupID)
		if err != nil {
			return 0, fmt.Errorf("apply default crew: leere Projekte laden: %w", err)
		}
		defer rows.Close()
		for rows.Next() {
			var animeID int64
			if err := rows.Scan(&animeID); err != nil {
				return 0, fmt.Errorf("apply default crew: scan anime_id: %w", err)
			}
			targetAnimeIDs = append(targetAnimeIDs, animeID)
		}
		if err := rows.Err(); err != nil {
			return 0, fmt.Errorf("apply default crew: iterate anime ids: %w", err)
		}
	}

	applied := 0
	for _, animeID := range targetAnimeIDs {
		// Nur für Anime ohne bestehende Contributions anlegen.
		var count int
		if err := r.db.QueryRow(ctx, `
			SELECT COUNT(*) FROM anime_contributions
			WHERE fansub_group_id = $1 AND anime_id = $2
		`, fansubGroupID, animeID).Scan(&count); err != nil {
			return applied, fmt.Errorf("apply default crew: contributions zählen (anime_id=%d): %w", animeID, err)
		}
		if count > 0 {
			continue
		}
		for _, entry := range crew {
			tag, err := r.db.Exec(ctx, `
				INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, status, created_at, updated_at)
				VALUES ($1, $2, $3, 'draft', NOW(), NOW())
				ON CONFLICT (fansub_group_id, anime_id, member_id, release_version_id) DO NOTHING
			`, fansubGroupID, animeID, entry.MemberID)
			if err != nil {
				return applied, fmt.Errorf("apply default crew: contribution einfügen (anime_id=%d, member_id=%d): %w", animeID, entry.MemberID, err)
			}
			applied += int(tag.RowsAffected())
		}
	}

	return applied, nil
}
