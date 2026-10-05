package repository

import (
	"context"
	"errors"
	"fmt"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *FansubRepository) ListAliases(ctx context.Context, fansubID int64) ([]models.FansubAlias, error) {
	exists, err := r.fansubGroupExists(ctx, fansubID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, fansub_group_id, alias, created_at, updated_at
		FROM fansub_group_aliases
		WHERE fansub_group_id = $1
		ORDER BY alias ASC, id ASC
	`, fansubID)
	if err != nil {
		return nil, fmt.Errorf("query fansub aliases for group %d: %w", fansubID, err)
	}
	defer rows.Close()

	items := make([]models.FansubAlias, 0, 16)
	for rows.Next() {
		var item models.FansubAlias
		if err := rows.Scan(
			&item.ID,
			&item.FansubGroupID,
			&item.Alias,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan fansub alias row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub alias rows: %w", err)
	}

	return items, nil
}

// findFansubKuerzelOwner looks up the fansub group (if any, other than excludeGroupID)
// that already owns normalizedValue as its Kürzel. Returns (nil, nil) when no other
// group owns it.
func (r *FansubRepository) findFansubKuerzelOwner(
	ctx context.Context,
	normalizedValue string,
	excludeGroupID int64,
) (*models.FansubGroupConflictOwner, error) {
	var owner models.FansubGroupConflictOwner
	err := r.db.QueryRow(ctx, `
		SELECT id, name FROM fansub_groups WHERE normalized_kuerzel = $1 AND id <> $2 LIMIT 1
	`, normalizedValue, excludeGroupID).Scan(&owner.ID, &owner.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find fansub kuerzel owner: %w", err)
	}
	return &owner, nil
}

// findFansubKuerzelOrAliasOwner looks up the fansub group (if any, other than
// excludeGroupID) that already owns normalizedValue as either its Kürzel or one of
// its aliases. Returns (nil, nil) when no other group owns it in either form.
func (r *FansubRepository) findFansubKuerzelOrAliasOwner(
	ctx context.Context,
	normalizedValue string,
	excludeGroupID int64,
) (*models.FansubGroupConflictOwner, error) {
	var owner models.FansubGroupConflictOwner
	err := r.db.QueryRow(ctx, `
		SELECT id, name FROM fansub_groups WHERE normalized_kuerzel = $1 AND id <> $2
		UNION
		SELECT g.id, g.name FROM fansub_group_aliases a
		JOIN fansub_groups g ON g.id = a.fansub_group_id
		WHERE a.normalized_alias = $1 AND a.fansub_group_id <> $2
		LIMIT 1
	`, normalizedValue, excludeGroupID).Scan(&owner.ID, &owner.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("find fansub kuerzel or alias owner: %w", err)
	}
	return &owner, nil
}

func (r *FansubRepository) CreateAlias(
	ctx context.Context,
	fansubID int64,
	input models.FansubAliasCreateInput,
) (*models.FansubAlias, error) {
	owner, err := r.findFansubKuerzelOwner(ctx, input.NormalizedAlias, fansubID)
	if err != nil {
		return nil, err
	}
	if owner != nil {
		return nil, &ConflictOwnerError{OwnerGroupID: owner.ID, OwnerGroupName: owner.Name}
	}

	query := `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias)
		VALUES ($1, $2, $3)
		RETURNING id, fansub_group_id, alias, created_at, updated_at
	`

	var item models.FansubAlias
	if err := r.db.QueryRow(
		ctx,
		query,
		fansubID,
		input.Alias,
		input.NormalizedAlias,
	).Scan(
		&item.ID,
		&item.FansubGroupID,
		&item.Alias,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("create fansub alias for group %d: %w", fansubID, err)
	}

	return &item, nil
}

func (r *FansubRepository) DeleteAlias(ctx context.Context, fansubID, aliasID int64) error {
	commandTag, err := r.db.Exec(
		ctx,
		`DELETE FROM fansub_group_aliases WHERE id = $1 AND fansub_group_id = $2`,
		aliasID,
		fansubID,
	)
	if err != nil {
		return fmt.Errorf("delete fansub alias %d: %w", aliasID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// ReassignAlias hängt einen bestehenden Alias per einzelnem atomarem UPDATE von seiner
// aktuellen (Quell-)Gruppe auf eine neue (Ziel-)Gruppe um (D-02/D-09). fansubID ist die
// Quellgruppe, gegen die der Alias-Datensatz gescoped wird -- analog zu DeleteAlias's
// Parameterreihenfolge (fansubID zuerst = die Gruppe, für die der Aufrufer berechtigt sein
// muss). Es gibt keinen DELETE+INSERT-Zwischenzustand, in dem der Alias nicht existiert.
func (r *FansubRepository) ReassignAlias(
	ctx context.Context,
	fansubID, aliasID, targetGroupID int64,
) (*models.FansubAlias, error) {
	var item models.FansubAlias
	err := r.db.QueryRow(
		ctx,
		`UPDATE fansub_group_aliases
		 SET fansub_group_id = $1, updated_at = NOW()
		 WHERE id = $2 AND fansub_group_id = $3
		 RETURNING id, fansub_group_id, alias, created_at, updated_at`,
		targetGroupID,
		aliasID,
		fansubID,
	).Scan(
		&item.ID,
		&item.FansubGroupID,
		&item.Alias,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		return nil, fmt.Errorf("reassign fansub alias %d: %w", aliasID, err)
	}

	return &item, nil
}

func (r *FansubRepository) ListAnimeAliasCandidates(
	ctx context.Context,
	animeID int64,
) ([]models.AnimeFansubAliasCandidate, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT fansub_group_id, alias
		FROM (
			SELECT afg.fansub_group_id, fg.slug AS alias, 1 AS priority
			FROM anime_fansub_groups afg
			JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
			WHERE afg.anime_id = $1
			UNION ALL
			SELECT afg.fansub_group_id, fg.name AS alias, 2 AS priority
			FROM anime_fansub_groups afg
			JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
			WHERE afg.anime_id = $1
			UNION ALL
			SELECT afg.fansub_group_id, fga.alias AS alias, 3 AS priority
			FROM anime_fansub_groups afg
			JOIN fansub_group_aliases fga ON fga.fansub_group_id = afg.fansub_group_id
			WHERE afg.anime_id = $1
		) candidates
		WHERE btrim(alias) <> ''
		ORDER BY priority ASC, fansub_group_id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime alias candidates for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	items := make([]models.AnimeFansubAliasCandidate, 0, 32)
	for rows.Next() {
		var item models.AnimeFansubAliasCandidate
		if err := rows.Scan(&item.FansubGroupID, &item.Alias); err != nil {
			return nil, fmt.Errorf("scan anime alias candidate row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime alias candidate rows: %w", err)
	}

	return items, nil
}
