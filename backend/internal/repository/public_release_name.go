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
//
// Auftraggeber-Entscheidung 2026-09-23 (GAP-24, 165-UAT.md): broadens the
// above GAP-23 film rule to every "einteiler" (film always; ova/ona/special/
// bonus only when the anime's canonical episode count is exactly 1) AND
// refines it -- a stored placeholder episode title like "Episode 1"
// (episodeTitlePlaceholderSQL) does NOT count as a real title for an
// einteiler, so the anime title wins; a GENUINE episode title (e.g. "Parody
// Mode") is kept, even for an einteiler -- correcting GAP-23's earlier
// "films always show the anime title" description, which only held because
// no real-film-segment-title case had been tested yet. Works read-only, on
// already-stored placeholder legacy data too (e.g. anime #6/#7/#9), without
// migrating it. titleEnteredByGroupSQL keeps unconditional priority.

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

// einteilerEpisodeSQL returns a boolean SQL expression that is true when the
// episode identified by episodeAlias belongs to an "einteiler" (GAP-23/GAP-24,
// 165-UAT.md): either the owning anime row has type='film' (always an
// einteiler), or the episode's own episode_type_id resolves to
// episode_types.name='movie' (both film signals from GAP-23, independently
// sufficient -- episode_import_repository_apply.go makes them coincide for new
// imports going forward, but older/manually-curated rows may carry only one of
// the two), or (GAP-24) the owning anime row has type IN
// ('ova','ona','special','bonus') AND its canonical episode count is exactly
// 1 -- the COUNT(*) branch is intentionally independent of the episode_type
// signal, since older OVA rows may never carry episode_type_id='movie'. All
// three are self-contained scalar subqueries: episodeAlias already exposes
// anime_id and episode_type_id as its own columns, so no new JOIN is needed
// in the caller's FROM clause.
func einteilerEpisodeSQL(episodeAlias string) string {
	return fmt.Sprintf(`(EXISTS (
    SELECT 1 FROM anime fa WHERE fa.id = %[1]s.anime_id AND fa.type = 'film'
   ) OR EXISTS (
    SELECT 1 FROM episode_types fet WHERE fet.id = %[1]s.episode_type_id AND fet.name = 'movie'
   ) OR (
    EXISTS (SELECT 1 FROM anime fa2 WHERE fa2.id = %[1]s.anime_id AND fa2.type IN ('ova','ona','special','bonus'))
    AND (SELECT COUNT(*) FROM episodes fe WHERE fe.anime_id = %[1]s.anime_id) = 1
   ))`, episodeAlias)
}

// einteilerAnimeTitleSQL returns a scalar SQL expression for the anime/film
// title of the episode identified by episodeAlias (GAP-23/GAP-24, 165-UAT.md).
// Uses alias fa3 to avoid collisions with the fa/fa2/fet/fe aliases used by
// einteilerEpisodeSQL, even though SQL subquery scoping does not strictly
// require it.
func einteilerAnimeTitleSQL(episodeAlias string) string {
	return fmt.Sprintf(`(SELECT fa3.title FROM anime fa3 WHERE fa3.id = %[1]s.anime_id)`, episodeAlias)
}

// episodeTitlePlaceholderSQL returns a boolean SQL expression that mirrors
// GAP-24's placeholder-title detection (165-UAT.md) in Postgres regex syntax:
// true when episodeAlias.title (trimmed) is an AniSearch placeholder like
// "Episode 1"/"Folge 01"/"Ep. 1", or the bare form "Episode"/"Folge"/"Ep."
// without a number. This intentionally DUPLICATES isPlaceholderEpisodeTitle
// (episode_placeholder_title.go) -- Go's `regexp` and Postgres' `~*` are two
// different regex engines and cannot share one implementation.
// TestIsPlaceholderEpisodeTitle and this file's Postgres integration test
// cover the identical case list to avoid drift between the two.
func episodeTitlePlaceholderSQL(episodeAlias string) string {
	return fmt.Sprintf(`(BTRIM(%[1]s.title) ~* ('^(episode|folge|ep\.?)\s*0*' || %[1]s.episode_number || '$')
   OR BTRIM(%[1]s.title) ~* '^(episode|folge|ep\.?)\s*$')`, episodeAlias)
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
	firstComponentExpr := fmt.Sprintf(
		"CASE WHEN %[1]s AND (%[2]s IS NULL OR %[3]s) THEN %[4]s WHEN %[1]s THEN %[2]s ELSE %[5]s END",
		einteilerEpisodeSQL(episodeAlias), episodeTitleExpr, episodeTitlePlaceholderSQL(episodeAlias), einteilerAnimeTitleSQL(episodeAlias), seriesFirstComponentExpr,
	)
	versionExpr := fmt.Sprintf("COALESCE(NULLIF(BTRIM(%s.version), ''), 'v1')", releaseVersionAlias)

	return fmt.Sprintf(`CASE
    WHEN %[1]s THEN %[2]s
    ELSE CONCAT(%[3]s, ' · (', %[4]s, ') · ', %[5]s)
   END`, condition, titleExpr, firstComponentExpr, groupNamesExpr, versionExpr)
}
