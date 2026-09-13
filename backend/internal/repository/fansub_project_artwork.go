package repository

// Shared by public project listings and the slim resolver. The anime alias is a.
// Keep the canonical anime_media selection and existing fallback precedence identical.
const publicProjectBannerSelectSQL = `COALESCE(
				anime_banner.path,
				NULLIF(BTRIM(a.banner_resolved_url), ''),
				(
					SELECT bmf.path
					FROM media_files bmf
					WHERE bmf.media_id = a.banner_asset_id
					  AND (bmf.variant = 'original' OR bmf.variant IS NULL)
					  AND bmf.status = 'ready'
					ORDER BY bmf.id ASC
					LIMIT 1
				)
			)`

const publicProjectBannerJoinSQL = `LEFT JOIN LATERAL (
			SELECT COALESCE(anime_banner_file.path, ma.file_path) AS path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			LEFT JOIN LATERAL (
				SELECT mf.path
				FROM media_files mf
				WHERE mf.media_id = ma.id
				  AND (mf.variant = 'original' OR mf.variant IS NULL)
				  AND (mf.status = 'ready' OR mf.status IS NULL)
				ORDER BY CASE WHEN mf.variant = 'original' THEN 0 ELSE 1 END, mf.id ASC
				LIMIT 1
			) anime_banner_file ON true
			WHERE am.anime_id = a.id
			  AND mt.name = 'banner'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) anime_banner ON true`
