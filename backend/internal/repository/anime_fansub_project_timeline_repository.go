package repository

import (
    "context"
    "errors"
    "fmt"
    "time"
)

var ErrInvalidProjectTimeline = errors.New("invalid anime fansub project timeline")

// AnimeFansubProjectTimeline belongs to the concrete anime/fansub assignment,
// never to the neutral anime.
type AnimeFansubProjectTimeline struct {
    AnimeID               int64   `json:"anime_id"`
    FansubGroupID         int64   `json:"fansub_group_id"`
    ProductionStartedOn   *string `json:"production_started_on"`
    ProductionCompletedOn *string `json:"production_completed_on"`
}

func dateText(value *time.Time) *string {
    if value == nil {
        return nil
    }
    formatted := value.Format("2006-01-02")
    return &formatted
}

func (r *FansubNotesRepository) GetAnimeFansubProjectTimeline(
    ctx context.Context,
    animeID int64,
    fansubGroupID int64,
) (*AnimeFansubProjectTimeline, error) {
    if err := r.ensureAnimeFansubProjectContextExists(ctx, animeID, fansubGroupID); err != nil {
        return nil, err
    }

    var startedOn, completedOn *time.Time
    err := r.db.QueryRow(ctx, `
        SELECT production_started_on, production_completed_on
        FROM anime_fansub_groups
        WHERE anime_id = $1 AND fansub_group_id = $2
    `, animeID, fansubGroupID).Scan(&startedOn, &completedOn)
    if err != nil {
        return nil, fmt.Errorf("get anime fansub project timeline (anime %d, group %d): %w", animeID, fansubGroupID, err)
    }

    return &AnimeFansubProjectTimeline{
        AnimeID: animeID,
        FansubGroupID: fansubGroupID,
        ProductionStartedOn: dateText(startedOn),
        ProductionCompletedOn: dateText(completedOn),
    }, nil
}

func (r *FansubNotesRepository) UpdateAnimeFansubProjectTimeline(
    ctx context.Context,
    animeID int64,
    fansubGroupID int64,
    startedOn *time.Time,
    completedOn *time.Time,
) (*AnimeFansubProjectTimeline, error) {
    if err := r.ensureAnimeFansubProjectContextExists(ctx, animeID, fansubGroupID); err != nil {
        return nil, err
    }
    if startedOn != nil && completedOn != nil && completedOn.Before(*startedOn) {
        return nil, ErrInvalidProjectTimeline
    }

    var latestReleaseCompletion *time.Time
    err := r.db.QueryRow(ctx, `
        SELECT MAX(COALESCE(rev.release_date, fr.release_date))
        FROM release_version_groups rvg
        JOIN release_versions rev ON rev.id = rvg.release_version_id
        JOIN fansub_releases fr ON fr.id = rev.release_id
        JOIN episodes e ON e.id = fr.episode_id
        WHERE rvg.fansub_group_id = $1
          AND e.anime_id = $2
    `, fansubGroupID, animeID).Scan(&latestReleaseCompletion)
    if err != nil {
        return nil, fmt.Errorf("get latest release completion for project timeline: %w", err)
    }
    if completedOn != nil && latestReleaseCompletion != nil && completedOn.Before(*latestReleaseCompletion) {
        return nil, ErrInvalidProjectTimeline
    }

    var storedStartedOn, storedCompletedOn *time.Time
    err = r.db.QueryRow(ctx, `
        UPDATE anime_fansub_groups
        SET production_started_on = $3,
            production_completed_on = $4
        WHERE anime_id = $1 AND fansub_group_id = $2
        RETURNING production_started_on, production_completed_on
    `, animeID, fansubGroupID, startedOn, completedOn).Scan(&storedStartedOn, &storedCompletedOn)
    if err != nil {
        return nil, fmt.Errorf("update anime fansub project timeline (anime %d, group %d): %w", animeID, fansubGroupID, err)
    }

    return &AnimeFansubProjectTimeline{
        AnimeID: animeID,
        FansubGroupID: fansubGroupID,
        ProductionStartedOn: dateText(storedStartedOn),
        ProductionCompletedOn: dateText(storedCompletedOn),
    }, nil
}
