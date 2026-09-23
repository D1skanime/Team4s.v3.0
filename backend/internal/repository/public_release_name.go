package repository

import "fmt"

// public_release_name.go is the single backend location for the GAP-02 default
// release name rule (164-UAT.md), reused by episode_version_public_query.go (the
// public anime page) and release_detail_public_repository.go (the release detail
// page). Both call sites must interpolate the identical function output so the
// two pages can never disagree on what a release's display name is.
//
// Auftraggeber-Entscheidung 2026-09-18 (GAP-02): a group-entered title is never
// synthesized or backfilled -- if a group did not enter a real title, the display
// name is computed on read, every time, from episode title + group name(s) +
// version. Nothing is ever written back into release_versions.title for this.
//
// Auftraggeber-Entscheidung 2026-09-23 (GAP-23, 165-UAT.md): for films
// (anime.type='film' or episode.episode_type_id -> episode_types.name='movie')
// the first name component is always the anime/film title, never the episode
// title or the "Folge N" fallback -- example: ".hack//G.U. Trilogy ·
// (AnimeOwnage) · v1". titleEnteredByGroupSQL keeps unconditional priority,
// unchanged. Series are unaffected.

// titleEnteredByGroupSQL returns a boolean SQL expression that is true only when
// releaseVersionAlias.title looks like something a group actually typed in: it is
// non-empty after trimming, it does not end in a known video container extension
// (the raw-filename bug shape this rule exists to catch), and no release_variants
// row under the same release_version_id has an identical (trimmed) filename --
// catching filenames that made it into the title field without a recognized
// extension. episodeAlias is accepted for signature symmetry with
// publicReleaseNameSQL (both take the same two identity aliases), even though this
// particular predicate does not need to read the episode row itself.
func titleEnteredByGroupSQL(releaseVersionAlias, episodeAlias string) string {
	titleExpr := fmt.Sprintf("BTRIM(%s.title)", releaseVersionAlias)
	_ = episodeAlias
	return fmt.Sprintf(`(NULLIF(%[1]s, '') IS NOT NULL
   AND %[1]s !~* '\.(mkv|avi|mp4|m4v|webm|ts|wmv|mov)$'
   AND NOT EXISTS (
    SELECT 1 FROM release_variants rvx
    WHERE rvx.release_version_id = %[2]s.id
     AND BTRIM(rvx.filename) = %[1]s
   ))`, titleExpr, releaseVersionAlias)
}

// filmEpisodeSQL returns a boolean SQL expression that is true when the episode
// identified by episodeAlias belongs to a film (GAP-23, 165-UAT.md): either the
// owning anime row has type='film', or the episode's own episode_type_id resolves
// to episode_types.name='movie'. Both signals are independently sufficient --
// episode_import_repository_apply.go makes them coincide for new imports going
// forward, but older/manually-curated rows may carry only one of the two. Both
// are self-contained scalar subqueries: episodeAlias already exposes anime_id and
// episode_type_id as its own columns, so no new JOIN is needed in the caller's
// FROM clause.
func filmEpisodeSQL(episodeAlias string) string {
	return fmt.Sprintf(`(EXISTS (
    SELECT 1 FROM anime fa WHERE fa.id = %[1]s.anime_id AND fa.type = 'film'
   ) OR EXISTS (
    SELECT 1 FROM episode_types fet WHERE fet.id = %[1]s.episode_type_id AND fet.name = 'movie'
   ))`, episodeAlias)
}

// filmTitleSQL returns a scalar SQL expression for the anime/film title of the
// episode identified by episodeAlias (GAP-23, 165-UAT.md).
func filmTitleSQL(episodeAlias string) string {
	return fmt.Sprintf(`(SELECT fa2.title FROM anime fa2 WHERE fa2.id = %[1]s.anime_id)`, episodeAlias)
}

// publicReleaseNameSQL returns the final GAP-02/GAP-23 display-name SQL
// expression: the group-entered title verbatim when titleEnteredByGroupSQL
// holds, otherwise the computed default "<erster Bestandteil> · (<Gruppe(n)>) ·
// <Version>" (coop-capable via groupNamesExpr, D-11: no primary-group concept,
// groups already ' × '-joined and ORDER BY fg.name, fg.id-sorted by the caller).
// The first component is the anime/film title for films (GAP-23) or the
// existing episode-title-then-"Folge N" fallback for series (GAP-02,
// unchanged). groupNamesExpr is a scalar SQL expression supplied by the caller
// so this function stays agnostic of the exact fansub_groups/release_version_groups
// join shape at each call site.
func publicReleaseNameSQL(releaseVersionAlias, episodeAlias, groupNamesExpr string) string {
	condition := titleEnteredByGroupSQL(releaseVersionAlias, episodeAlias)
	titleExpr := fmt.Sprintf("BTRIM(%s.title)", releaseVersionAlias)
	episodeTitleExpr := fmt.Sprintf("NULLIF(BTRIM(%s.title), '')", episodeAlias)
	fallbackEpisodeTitleExpr := fmt.Sprintf("CONCAT('Folge ', %s.episode_number)", episodeAlias)
	seriesFirstComponentExpr := fmt.Sprintf("COALESCE(%s, %s)", episodeTitleExpr, fallbackEpisodeTitleExpr)
	firstComponentExpr := fmt.Sprintf("CASE WHEN %s THEN %s ELSE %s END", filmEpisodeSQL(episodeAlias), filmTitleSQL(episodeAlias), seriesFirstComponentExpr)
	versionExpr := fmt.Sprintf("COALESCE(NULLIF(BTRIM(%s.version), ''), 'v1')", releaseVersionAlias)

	return fmt.Sprintf(`CASE
    WHEN %[1]s THEN %[2]s
    ELSE CONCAT(%[3]s, ' · (', %[4]s, ') · ', %[5]s)
   END`, condition, titleExpr, firstComponentExpr, groupNamesExpr, versionExpr)
}
