package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type groupLinkTx interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	QueryRow(context.Context, string, ...any) pgx.Row
	Commit(context.Context) error
	Rollback(context.Context) error
}

type FansubRepository struct {
	db               *pgxpool.Pool
	mediaStorageDir  string
	beginGroupLinkTx func(context.Context) (groupLinkTx, error)
}

func NewFansubRepository(db *pgxpool.Pool, mediaStorageDir ...string) *FansubRepository {
	storageDir := ""
	if len(mediaStorageDir) > 0 {
		storageDir = mediaStorageDir[0]
	}
	return &FansubRepository{
		db:              db,
		mediaStorageDir: storageDir,
		beginGroupLinkTx: func(ctx context.Context) (groupLinkTx, error) {
			return db.BeginTx(ctx, pgx.TxOptions{})
		},
	}
}

func (r *FansubRepository) ListMembers(ctx context.Context, fansubID int64) ([]models.FansubMember, error) {
	exists, err := r.fansubGroupExists(ctx, fansubID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			id, fansub_group_id, handle, role, since_year, until_year, notes, created_at, updated_at
		FROM fansub_members
		WHERE fansub_group_id = $1
		ORDER BY handle ASC, id ASC
	`, fansubID)
	if err != nil {
		return nil, fmt.Errorf("query fansub members for group %d: %w", fansubID, err)
	}
	defer rows.Close()

	items := make([]models.FansubMember, 0, 16)
	for rows.Next() {
		var item models.FansubMember
		if err := rows.Scan(
			&item.ID,
			&item.FansubGroupID,
			&item.Handle,
			&item.Role,
			&item.SinceYear,
			&item.UntilYear,
			&item.Notes,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan fansub member row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fansub member rows: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) CreateMember(
	ctx context.Context,
	fansubID int64,
	input models.FansubMemberCreateInput,
) (*models.FansubMember, error) {
	query := `
		INSERT INTO fansub_members (fansub_group_id, handle, role, since_year, until_year, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, fansub_group_id, handle, role, since_year, until_year, notes, created_at, updated_at
	`

	var item models.FansubMember
	if err := r.db.QueryRow(
		ctx,
		query,
		fansubID,
		input.Handle,
		input.Role,
		input.SinceYear,
		input.UntilYear,
		input.Notes,
	).Scan(
		&item.ID,
		&item.FansubGroupID,
		&item.Handle,
		&item.Role,
		&item.SinceYear,
		&item.UntilYear,
		&item.Notes,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("create fansub member for group %d: %w", fansubID, err)
	}

	return &item, nil
}

func (r *FansubRepository) UpdateMember(
	ctx context.Context,
	fansubID int64,
	memberID int64,
	input models.FansubMemberPatchInput,
) (*models.FansubMember, error) {
	assignments := make([]string, 0, 6)
	args := make([]any, 0, 6)
	argPos := 1

	assignments = append(assignments, "updated_at = NOW()")

	if input.Handle.Set {
		assignments = append(assignments, fmt.Sprintf("handle = $%d", argPos))
		args = append(args, input.Handle.Value)
		argPos++
	}
	if input.Role.Set {
		assignments = append(assignments, fmt.Sprintf("role = $%d", argPos))
		args = append(args, input.Role.Value)
		argPos++
	}
	if input.SinceYear.Set {
		assignments = append(assignments, fmt.Sprintf("since_year = $%d", argPos))
		args = append(args, input.SinceYear.Value)
		argPos++
	}
	if input.UntilYear.Set {
		assignments = append(assignments, fmt.Sprintf("until_year = $%d", argPos))
		args = append(args, input.UntilYear.Value)
		argPos++
	}
	if input.Notes.Set {
		assignments = append(assignments, fmt.Sprintf("notes = $%d", argPos))
		args = append(args, input.Notes.Value)
		argPos++
	}

	if len(assignments) == 1 {
		return nil, fmt.Errorf("update fansub member %d: no patch fields provided", memberID)
	}

	query := fmt.Sprintf(`
		UPDATE fansub_members
		SET %s
		WHERE id = $%d AND fansub_group_id = $%d
		RETURNING id, fansub_group_id, handle, role, since_year, until_year, notes, created_at, updated_at
	`, strings.Join(assignments, ", "), argPos, argPos+1)
	args = append(args, memberID, fansubID)

	var item models.FansubMember
	if err := r.db.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.FansubGroupID,
		&item.Handle,
		&item.Role,
		&item.SinceYear,
		&item.UntilYear,
		&item.Notes,
		&item.CreatedAt,
		&item.UpdatedAt,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("update fansub member %d: %w", memberID, err)
	}

	return &item, nil
}

func (r *FansubRepository) DeleteMember(ctx context.Context, fansubID, memberID int64) error {
	commandTag, err := r.db.Exec(
		ctx,
		`DELETE FROM fansub_members WHERE id = $1 AND fansub_group_id = $2`,
		memberID,
		fansubID,
	)
	if err != nil {
		return fmt.Errorf("delete fansub member %d: %w", memberID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

// fansubStoryPreviewRuneLimit ist die maximale Anzahl Runes (nicht Bytes),
// die story_preview in ListAnimeFansubs tragen darf. Rune-basiert statt
// byte-basiert, damit mehrbyte-kodierte Zeichen (Umlaute ä/ö/ü/ß, „…") nicht
// mitten im Byte zerschnitten werden.
const fansubStoryPreviewRuneLimit = 500

// truncateStoryPreviewRunes kürzt raw rune-sicher auf höchstens limit Runes.
// Gibt nil zurück, wenn raw nil ist oder nach dem Trimmen leer bleibt (nur
// Whitespace zählt als leer).
func truncateStoryPreviewRunes(raw *string, limit int) *string {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}
	runes := []rune(trimmed)
	if len(runes) <= limit {
		return &trimmed
	}
	truncated := string(runes[:limit])
	return &truncated
}

func (r *FansubRepository) ListAnimeFansubs(
	ctx context.Context,
	animeID int64,
) ([]models.AnimeFansubRelation, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
			fg.id, fg.slug, fg.name, fg.logo_url, fg.founded_year, fg.dissolved_year, fg.country, fg.status,
			story.body_text
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		LEFT JOIN LATERAL (
			SELECT n.body_text
			FROM fansub_group_notes n
			WHERE n.fansub_group_id = fg.id
			  AND n.visibility = 'public'
			  AND n.status = 'published'
			  AND n.deleted_at IS NULL
			ORDER BY n.sort_order ASC, n.id ASC
			LIMIT 1
		) story ON true
		WHERE afg.anime_id = $1
		ORDER BY afg.is_primary DESC, fg.name ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime fansubs for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	items := make([]models.AnimeFansubRelation, 0, 8)
	for rows.Next() {
		var item models.AnimeFansubRelation
		var group models.FansubGroupSummary
		var storyBodyText *string
		if err := rows.Scan(
			&item.AnimeID,
			&item.FansubGroupID,
			&item.IsPrimary,
			&item.Notes,
			&item.CreatedAt,
			&group.ID,
			&group.Slug,
			&group.Name,
			&group.LogoURL,
			&group.FoundedYear,
			&group.DissolvedYear,
			&group.Country,
			&group.Status,
			&storyBodyText,
		); err != nil {
			return nil, fmt.Errorf("scan anime fansub row: %w", err)
		}
		group.StoryPreview = truncateStoryPreviewRunes(storyBodyText, fansubStoryPreviewRuneLimit)
		item.FansubGroup = &group
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime fansub rows: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) AttachAnimeFansub(
	ctx context.Context,
	animeID int64,
	fansubID int64,
	input models.AnimeFansubAttachInput,
) (*models.AnimeFansubRelation, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin attach anime fansub tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if input.IsPrimary {
		if _, err := tx.Exec(ctx, `
			UPDATE anime_fansub_groups
			SET is_primary = false
			WHERE anime_id = $1
		`, animeID); err != nil {
			return nil, fmt.Errorf("reset anime primary fansub %d: %w", animeID, err)
		}
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes) VALUES ($1, $2, $3, $4)`,
		animeID,
		fansubID,
		input.IsPrimary,
		input.Notes,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("insert anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}

	var item models.AnimeFansubRelation
	var group models.FansubGroupSummary
	if err := tx.QueryRow(ctx, `
		SELECT
			afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1 AND afg.fansub_group_id = $2
	`, animeID, fansubID).Scan(
		&item.AnimeID,
		&item.FansubGroupID,
		&item.IsPrimary,
		&item.Notes,
		&item.CreatedAt,
		&group.ID,
		&group.Slug,
		&group.Name,
		&group.LogoURL,
	); err != nil {
		return nil, fmt.Errorf("load anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}
	item.FansubGroup = &group

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit attach anime fansub tx: %w", err)
	}

	return &item, nil
}

func (r *FansubRepository) DetachAnimeFansub(ctx context.Context, animeID, fansubID int64) error {
	commandTag, err := r.db.Exec(
		ctx,
		`DELETE FROM anime_fansub_groups WHERE anime_id = $1 AND fansub_group_id = $2`,
		animeID,
		fansubID,
	)
	if err != nil {
		return fmt.Errorf("detach anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *FansubRepository) fansubGroupExists(ctx context.Context, fansubID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`,
		fansubID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check fansub group existence %d: %w", fansubID, err)
	}

	return exists, nil
}

func (r *FansubRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`,
		animeID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
}

// ResolveFansubGroupIDForAnime resolves a fansub group slug to its group id,
// scoped to the groups actually linked to this specific anime via
// anime_fansub_groups. This anime-scoped lookup (never a bare global
// fansub_groups slug lookup) is the IDOR mitigation for the public episodes
// group filter (D-05/T-163-03): a slug belonging to a different anime's group
// never resolves here. Returns ErrNotFound when the slug is unknown or
// foreign to this anime; callers must fail closed (400), never fall back to
// unfiltered data.
func (r *FansubRepository) ResolveFansubGroupIDForAnime(ctx context.Context, animeID int64, slug string) (int64, error) {
	var groupID int64
	err := r.db.QueryRow(ctx, `
		SELECT fg.id
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1 AND fg.slug = $2
	`, animeID, slug).Scan(&groupID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("resolve fansub group slug %q for anime %d: %w", slug, animeID, err)
	}
	return groupID, nil
}

// MergeGroups merges multiple source fansub groups into a target group.
// All release group links, anime_fansub_groups, and members are migrated.
// Source group slugs become aliases on the target.
// Source groups are then deleted.
func (r *FansubRepository) MergeGroups(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (*models.MergeGroupsResult, error) {
	if len(sourceIDs) == 0 {
		return nil, fmt.Errorf("no source groups specified for merge")
	}

	// Check target exists
	targetExists, err := r.fansubGroupExists(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if !targetExists {
		return nil, ErrNotFound
	}
	existingSources, err := r.countExistingFansubGroups(ctx, sourceIDs)
	if err != nil {
		return nil, err
	}
	if existingSources != len(sourceIDs) {
		return nil, ErrNotFound
	}
	conflicts, err := r.countMergeVersionConflicts(ctx, targetID, sourceIDs)
	if err != nil {
		return nil, err
	}
	if conflicts > 0 {
		return nil, ErrConflict
	}

	// Start transaction
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin merge tx: %w", err)
	}
	defer tx.Rollback(ctx)

	result := &models.MergeGroupsResult{
		AliasesAdded: make([]string, 0, len(sourceIDs)),
	}

	// 1. Migrate release group links
	tag, err := tx.Exec(ctx, `
		UPDATE release_version_groups
		SET fansub_group_id = $1
		WHERE fansub_group_id = ANY($2)
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate release version groups: %w", err)
	}
	result.VersionsMigrated = int(tag.RowsAffected())

	// 2. Migrate anime_fansub_groups (ignore duplicates)
	tag, err = tx.Exec(ctx, `
		INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes, created_at)
		SELECT anime_id, $1, false, notes, created_at
		FROM anime_fansub_groups WHERE fansub_group_id = ANY($2)
		ON CONFLICT (anime_id, fansub_group_id) DO NOTHING
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate anime fansub relations: %w", err)
	}
	result.RelationsMigrated = int(tag.RowsAffected())

	// 3. Migrate members (basic handling - no unique constraint)
	tag, err = tx.Exec(ctx, `
		UPDATE fansub_members SET fansub_group_id = $1
		WHERE fansub_group_id = ANY($2)
	`, targetID, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("migrate fansub members: %w", err)
	}
	result.MembersMigrated = int(tag.RowsAffected())

	// 4. Add source slugs as aliases on target
	rows, err := tx.Query(ctx, `
		SELECT slug FROM fansub_groups WHERE id = ANY($1) ORDER BY id ASC
	`, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("fetch source slugs: %w", err)
	}
	var slugs []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			rows.Close()
			return nil, fmt.Errorf("scan source slug: %w", err)
		}
		slugs = append(slugs, slug)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate source slugs: %w", err)
	}

	for _, slug := range slugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			continue
		}
		tag, err := tx.Exec(ctx, `
			INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias)
			VALUES ($1, $2, $3)
			ON CONFLICT (normalized_alias) DO NOTHING
		`, targetID, slug, normalized)
		if err != nil {
			return nil, fmt.Errorf("add alias %q: %w", slug, err)
		}
		if tag.RowsAffected() > 0 {
			result.AliasesAdded = append(result.AliasesAdded, slug)
		}
	}

	// 5. Delete source groups (CASCADE handles members and anime_fansub_groups)
	tag, err = tx.Exec(ctx, `DELETE FROM fansub_groups WHERE id = ANY($1)`, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("delete source groups: %w", err)
	}
	result.MergedCount = int(tag.RowsAffected())

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit merge tx: %w", err)
	}

	return result, nil
}

// normalizeAliasKey returns a lowercase alphanumeric-only version of the alias
func normalizeAliasKey(raw string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(raw) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// GetMergePreview returns statistics about what would happen if groups were merged
func (r *FansubRepository) GetMergePreview(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (*models.MergeGroupsPreview, error) {
	if len(sourceIDs) == 0 {
		return nil, fmt.Errorf("no source groups specified")
	}
	targetExists, err := r.fansubGroupExists(ctx, targetID)
	if err != nil {
		return nil, err
	}
	if !targetExists {
		return nil, ErrNotFound
	}
	existingSources, err := r.countExistingFansubGroups(ctx, sourceIDs)
	if err != nil {
		return nil, err
	}
	if existingSources != len(sourceIDs) {
		return nil, ErrNotFound
	}
	versionConflicts, err := r.countMergeVersionConflicts(ctx, targetID, sourceIDs)
	if err != nil {
		return nil, err
	}

	result := &models.MergeGroupsPreview{
		MergedCount:    len(sourceIDs),
		AliasesAdded:   make([]string, 0, len(sourceIDs)),
		AliasesSkipped: make([]string, 0, len(sourceIDs)),
		CanMerge:       versionConflicts == 0,
		Conflicts: models.MergePreviewConflicts{
			VersionConflicts:          versionConflicts,
			DuplicateAliases:          make([]string, 0, 8),
			DuplicateMembers:          make([]string, 0, 8),
			DuplicateRelationAnimeIDs: make([]int64, 0, 16),
			DuplicateSlugs:            make([]string, 0, 4),
			DuplicateNames:            make([]string, 0, 4),
		},
	}

	// Count release version group links
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM release_version_groups
		WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.VersionsMigrated); err != nil {
		return nil, fmt.Errorf("count release version groups: %w", err)
	}

	// Count members
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM fansub_members WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.MembersMigrated); err != nil {
		return nil, fmt.Errorf("count members: %w", err)
	}

	// Count anime relations
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM anime_fansub_groups WHERE fansub_group_id = ANY($1)
	`, sourceIDs).Scan(&result.RelationsMigrated); err != nil {
		return nil, fmt.Errorf("count relations: %w", err)
	}

	if err := r.populateAliasMergePreview(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeMemberDuplicates(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeRelationDuplicates(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}
	if err := r.populateMergeNameSlugCollisions(ctx, targetID, sourceIDs, result); err != nil {
		return nil, err
	}

	return result, nil
}

func (r *FansubRepository) populateAliasMergePreview(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	rows, err := r.db.Query(ctx, `
		SELECT slug
		FROM fansub_groups
		WHERE id = ANY($1)
		ORDER BY id ASC
	`, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview source groups: %w", err)
	}
	defer rows.Close()

	sourceSlugs := make([]string, 0, len(sourceIDs))
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			return fmt.Errorf("scan merge preview source group: %w", err)
		}
		sourceSlugs = append(sourceSlugs, slug)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview source groups: %w", err)
	}

	normalizedInputs := make([]string, 0, len(sourceSlugs))
	for _, slug := range sourceSlugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			continue
		}
		normalizedInputs = append(normalizedInputs, normalized)
	}

	existingNormalized := make(map[string]struct{}, len(normalizedInputs)+2)
	if len(normalizedInputs) > 0 {
		aliasRows, err := r.db.Query(ctx, `
			SELECT normalized_alias
			FROM fansub_group_aliases
			WHERE normalized_alias = ANY($1)
		`, normalizedInputs)
		if err != nil {
			return fmt.Errorf("query merge preview alias collisions: %w", err)
		}
		for aliasRows.Next() {
			var normalized string
			if err := aliasRows.Scan(&normalized); err != nil {
				aliasRows.Close()
				return fmt.Errorf("scan merge preview alias collision: %w", err)
			}
			existingNormalized[normalized] = struct{}{}
		}
		aliasRows.Close()
		if err := aliasRows.Err(); err != nil {
			return fmt.Errorf("iterate merge preview alias collisions: %w", err)
		}
	}

	acceptedNormalized := make(map[string]struct{}, len(normalizedInputs))
	for _, slug := range sourceSlugs {
		normalized := normalizeAliasKey(slug)
		if normalized == "" {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		if _, exists := existingNormalized[normalized]; exists {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		if _, exists := acceptedNormalized[normalized]; exists {
			result.AliasesSkipped = append(result.AliasesSkipped, slug)
			continue
		}
		acceptedNormalized[normalized] = struct{}{}
		result.AliasesAdded = append(result.AliasesAdded, slug)
	}

	duplicateAliases := make([]string, 0, len(result.AliasesSkipped))
	seenDuplicateAlias := make(map[string]struct{}, len(result.AliasesSkipped))
	for _, slug := range result.AliasesSkipped {
		if _, exists := seenDuplicateAlias[slug]; exists {
			continue
		}
		seenDuplicateAlias[slug] = struct{}{}
		duplicateAliases = append(duplicateAliases, slug)
	}
	result.Conflicts.DuplicateAliases = duplicateAliases
	result.Conflicts.DuplicateAliasesCount = len(duplicateAliases)

	return nil
}

func (r *FansubRepository) populateMergeMemberDuplicates(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH duplicate_members AS (
			SELECT
				lower(btrim(handle)) AS handle_key,
				lower(btrim(role)) AS role_key,
				MIN(handle) AS display_handle,
				MIN(role) AS display_role,
				COUNT(*) AS duplicate_count
			FROM fansub_members
			WHERE fansub_group_id = $1 OR fansub_group_id = ANY($2)
			GROUP BY lower(btrim(handle)), lower(btrim(role))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_members
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateMembersCount); err != nil {
		return fmt.Errorf("count merge preview duplicate members: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		WITH duplicate_members AS (
			SELECT
				MIN(handle) AS display_handle,
				MIN(role) AS display_role,
				COUNT(*) AS duplicate_count
			FROM fansub_members
			WHERE fansub_group_id = $1 OR fansub_group_id = ANY($2)
			GROUP BY lower(btrim(handle)), lower(btrim(role))
			HAVING COUNT(*) > 1
		)
		SELECT display_handle, display_role, duplicate_count
		FROM duplicate_members
		ORDER BY duplicate_count DESC, display_handle ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate members: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var handle string
		var role string
		var count int
		if err := rows.Scan(&handle, &role, &count); err != nil {
			return fmt.Errorf("scan merge preview duplicate member: %w", err)
		}
		result.Conflicts.DuplicateMembers = append(result.Conflicts.DuplicateMembers, fmt.Sprintf("%s (%s) x%d", handle, role, count))
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate members: %w", err)
	}

	return nil
}

func (r *FansubRepository) populateMergeRelationDuplicates(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH source_rel AS (
			SELECT anime_id, COUNT(*) AS source_count
			FROM anime_fansub_groups
			WHERE fansub_group_id = ANY($1)
			GROUP BY anime_id
		),
		target_rel AS (
			SELECT anime_id
			FROM anime_fansub_groups
			WHERE fansub_group_id = $2
		),
		duplicate_rel AS (
			SELECT sr.anime_id
			FROM source_rel sr
			LEFT JOIN target_rel tr ON tr.anime_id = sr.anime_id
			WHERE sr.source_count > 1 OR tr.anime_id IS NOT NULL
		)
		SELECT COUNT(*) FROM duplicate_rel
	`, sourceIDs, targetID).Scan(&result.Conflicts.DuplicateRelationsCount); err != nil {
		return fmt.Errorf("count merge preview duplicate relations: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		WITH source_rel AS (
			SELECT anime_id, COUNT(*) AS source_count
			FROM anime_fansub_groups
			WHERE fansub_group_id = ANY($1)
			GROUP BY anime_id
		),
		target_rel AS (
			SELECT anime_id
			FROM anime_fansub_groups
			WHERE fansub_group_id = $2
		),
		duplicate_rel AS (
			SELECT sr.anime_id
			FROM source_rel sr
			LEFT JOIN target_rel tr ON tr.anime_id = sr.anime_id
			WHERE sr.source_count > 1 OR tr.anime_id IS NOT NULL
		)
		SELECT anime_id
		FROM duplicate_rel
		ORDER BY anime_id ASC
		LIMIT 25
	`, sourceIDs, targetID)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate relations: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var animeID int64
		if err := rows.Scan(&animeID); err != nil {
			return fmt.Errorf("scan merge preview duplicate relation: %w", err)
		}
		result.Conflicts.DuplicateRelationAnimeIDs = append(result.Conflicts.DuplicateRelationAnimeIDs, animeID)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate relations: %w", err)
	}

	return nil
}

func (r *FansubRepository) populateMergeNameSlugCollisions(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
	result *models.MergeGroupsPreview,
) error {
	if err := r.db.QueryRow(ctx, `
		WITH selected_groups AS (
			SELECT slug
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_slugs AS (
			SELECT lower(btrim(slug))
			FROM selected_groups
			GROUP BY lower(btrim(slug))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_slugs
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateSlugsCount); err != nil {
		return fmt.Errorf("count merge preview duplicate slugs: %w", err)
	}

	slugRows, err := r.db.Query(ctx, `
		WITH selected_groups AS (
			SELECT slug
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_slugs AS (
			SELECT lower(btrim(slug)) AS slug_key, MIN(slug) AS slug_label
			FROM selected_groups
			GROUP BY lower(btrim(slug))
			HAVING COUNT(*) > 1
		)
		SELECT slug_label
		FROM duplicate_slugs
		ORDER BY slug_label ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate slugs: %w", err)
	}
	for slugRows.Next() {
		var slug string
		if err := slugRows.Scan(&slug); err != nil {
			slugRows.Close()
			return fmt.Errorf("scan merge preview duplicate slug: %w", err)
		}
		result.Conflicts.DuplicateSlugs = append(result.Conflicts.DuplicateSlugs, slug)
	}
	slugRows.Close()
	if err := slugRows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate slugs: %w", err)
	}

	if err := r.db.QueryRow(ctx, `
		WITH selected_groups AS (
			SELECT name
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_names AS (
			SELECT lower(btrim(name))
			FROM selected_groups
			GROUP BY lower(btrim(name))
			HAVING COUNT(*) > 1
		)
		SELECT COUNT(*) FROM duplicate_names
	`, targetID, sourceIDs).Scan(&result.Conflicts.DuplicateNamesCount); err != nil {
		return fmt.Errorf("count merge preview duplicate names: %w", err)
	}

	nameRows, err := r.db.Query(ctx, `
		WITH selected_groups AS (
			SELECT name
			FROM fansub_groups
			WHERE id = $1 OR id = ANY($2)
		),
		duplicate_names AS (
			SELECT lower(btrim(name)) AS name_key, MIN(name) AS name_label
			FROM selected_groups
			GROUP BY lower(btrim(name))
			HAVING COUNT(*) > 1
		)
		SELECT name_label
		FROM duplicate_names
		ORDER BY name_label ASC
		LIMIT 20
	`, targetID, sourceIDs)
	if err != nil {
		return fmt.Errorf("query merge preview duplicate names: %w", err)
	}
	for nameRows.Next() {
		var name string
		if err := nameRows.Scan(&name); err != nil {
			nameRows.Close()
			return fmt.Errorf("scan merge preview duplicate name: %w", err)
		}
		result.Conflicts.DuplicateNames = append(result.Conflicts.DuplicateNames, name)
	}
	nameRows.Close()
	if err := nameRows.Err(); err != nil {
		return fmt.Errorf("iterate merge preview duplicate names: %w", err)
	}

	return nil
}

func (r *FansubRepository) countExistingFansubGroups(ctx context.Context, ids []int64) (int, error) {
	var count int
	if err := r.db.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM fansub_groups WHERE id = ANY($1)`,
		ids,
	).Scan(&count); err != nil {
		return 0, fmt.Errorf("count existing fansub groups: %w", err)
	}

	return count, nil
}

func (r *FansubRepository) countMergeVersionConflicts(
	ctx context.Context,
	targetID int64,
	sourceIDs []int64,
) (int, error) {
	var conflicts int
	if err := r.db.QueryRow(ctx, `
		WITH candidate_versions AS (
			SELECT
				fr.episode_id,
				rev.id AS release_version_id,
				COALESCE(rv.video_quality, rv.resolution, '') AS video_quality_key,
				COALESCE(rv.subtitle_type, '') AS subtitle_type_key,
				CASE
					WHEN rvg.fansub_group_id = ANY($1) THEN $2
					ELSE rvg.fansub_group_id
				END AS target_group_id
			FROM release_version_groups rvg
			JOIN release_versions rev ON rev.id = rvg.release_version_id
			JOIN fansub_releases fr ON fr.id = rev.release_id
			LEFT JOIN release_variants rv ON rv.release_version_id = rev.id
			WHERE rvg.fansub_group_id = $2
			   OR rvg.fansub_group_id = ANY($1)
		)
		SELECT COUNT(*)
		FROM (
			SELECT 1
			FROM candidate_versions
			GROUP BY episode_id, release_version_id, target_group_id, video_quality_key, subtitle_type_key
			HAVING COUNT(*) > 1
		) conflicts
	`, sourceIDs, targetID).Scan(&conflicts); err != nil {
		return 0, fmt.Errorf("count merge conflicts: %w", err)
	}

	return conflicts, nil
}
