package repository

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// resolvedImportFansubGroup enthält die aufgelösten Daten einer importierten Fansub-Gruppe.
type resolvedImportFansubGroup struct {
	ID   int64
	Name string
	Slug string
}

// lookupImportFansubGroupByID sucht eine Fansub-Gruppe per ID und gibt ErrNotFound
// zurück wenn die ID nicht in fansub_groups existiert (D-06, T-81-VAL-01).
func lookupImportFansubGroupByID(ctx context.Context, tx pgx.Tx, groupID int64) (*resolvedImportFansubGroup, error) {
	group := resolvedImportFansubGroup{}
	if err := tx.QueryRow(ctx, `
		SELECT id, slug, name
		FROM fansub_groups
		WHERE id = $1
	`, groupID).Scan(&group.ID, &group.Slug, &group.Name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("selected fansub group %d not found: %w", groupID, ErrNotFound)
		}
		return nil, fmt.Errorf("lookup selected fansub group %d: %w", groupID, err)
	}
	return &group, nil
}

// resolveImportFansubMemberGroups löst eine Liste von SelectedFansubGroupInput in
// echte resolvedImportFansubGroup-Einträge auf. ID-Eingaben werden per lookupImportFansubGroupByID
// gegen die DB validiert (ErrNotFound bei unbekannter ID, D-06). Freitext-Eingaben erzeugen
// via upsertImportFansubGroup neue Gruppen vom Typ FansubGroupTypeGroup (niemals Collaboration).
func resolveImportFansubMemberGroups(
	ctx context.Context,
	tx pgx.Tx,
	inputs []models.SelectedFansubGroupInput,
) ([]resolvedImportFansubGroup, error) {
	memberGroups := make([]resolvedImportFansubGroup, 0, len(inputs))
	for _, input := range inputs {
		group, err := resolveImportSelectedFansubGroup(ctx, tx, input)
		if err != nil {
			return nil, err
		}
		if group != nil {
			memberGroups = append(memberGroups, *group)
		}
	}
	return canonicalizeResolvedImportFansubGroups(memberGroups), nil
}

func resolveImportSelectedFansubGroup(
	ctx context.Context,
	tx pgx.Tx,
	input models.SelectedFansubGroupInput,
) (*resolvedImportFansubGroup, error) {
	if input.ID != nil && *input.ID > 0 {
		group, err := lookupImportFansubGroupByID(ctx, tx, *input.ID)
		if err != nil {
			return nil, err
		}
		return group, nil
	}
	return upsertImportFansubGroup(ctx, tx, derefString(input.Name), input.Slug, models.FansubGroupTypeGroup)
}

// upsertImportFansubGroup legt eine Fansub-Gruppe an oder aktualisiert sie.
// groupType wird intern immer als FansubGroupTypeGroup behandelt — keine externe
// Kontrolle über den Typ (T-81-VAL-02, D-06).
func upsertImportFansubGroup(
	ctx context.Context,
	tx pgx.Tx,
	name string,
	preferredSlug *string,
	_ models.FansubGroupType,
) (*resolvedImportFansubGroup, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, nil
	}
	slug := strings.TrimSpace(derefString(preferredSlug))
	if slug == "" {
		slug = slugifyAnimeTitle(name)
	}
	if slug == "" {
		return nil, nil
	}

	group := resolvedImportFansubGroup{}
	if err := tx.QueryRow(ctx, `
		INSERT INTO fansub_groups (slug, name, status)
		VALUES ($1, $2, 'active')
		ON CONFLICT (slug) DO UPDATE
		SET name = COALESCE(NULLIF(BTRIM(fansub_groups.name), ''), EXCLUDED.name),
		    updated_at = NOW()
		RETURNING id, slug, COALESCE(NULLIF(BTRIM(name), ''), $2)
	`, slug, name).Scan(&group.ID, &group.Slug, &group.Name); err != nil {
		return nil, fmt.Errorf("upsert import fansub group %q: %w", name, err)
	}
	return &group, nil
}

func canonicalizeResolvedImportFansubGroups(groups []resolvedImportFansubGroup) []resolvedImportFansubGroup {
	unique := make(map[string]resolvedImportFansubGroup, len(groups))
	for _, group := range groups {
		if group.ID <= 0 && strings.TrimSpace(group.Name) == "" && strings.TrimSpace(group.Slug) == "" {
			continue
		}
		unique[normalizedImportFansubIdentity(group)] = group
	}
	items := make([]resolvedImportFansubGroup, 0, len(unique))
	for _, group := range unique {
		items = append(items, group)
	}
	sort.Slice(items, func(i, j int) bool {
		return normalizedImportFansubIdentity(items[i]) < normalizedImportFansubIdentity(items[j])
	})
	return items
}

func normalizedImportFansubIdentity(group resolvedImportFansubGroup) string {
	if slug := strings.TrimSpace(group.Slug); slug != "" {
		return strings.ToLower(slug)
	}
	if name := strings.TrimSpace(group.Name); name != "" {
		return strings.ToLower(name)
	}
	return fmt.Sprintf("id:%d", group.ID)
}
