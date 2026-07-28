package repository

// Phase 113: Wiederholbare Leistungs-Badges (Bronze/Silber/Gold) -- drei read-time
// abgeleitete Contribution-Familien nach dem Phase-112-loadRoleVolumeBadges-Muster
// (member_profile_role_volume_repository.go). Kein neuer Buchungspfad, keine
// Persistenz -- Aggregation + Schwellenmapping laufen bei jedem Profil-Read frisch
// (GAM-04/D-01). Tier-Tokens sind intern-englisch (bronze/silver/gold), Familien
// enden bewusst bei Gold -- KEIN platinum-Tier (113-CONTEXT D-02/D-03/D-04).

// highestContribProjectsTier liefert die hoechste erreichte Stufe fuer Familie 1
// ("vollstaendig mitgetragene Projekte", D-02). Zaehlbasis ist die Anzahl Projekte
// (anime_id, fansub_group_id), die der Member ueber JEDE ledger-erfasste
// release_version hinweg mit mindestens einem eigenen netto-awarded
// release_role_credit_lifecycles-Credit abgedeckt hat. Schwellen: 1/5/15.
func highestContribProjectsTier(count int) string {
	switch {
	case count >= 15:
		return "gold"
	case count >= 5:
		return "silver"
	case count >= 1:
		return "bronze"
	default:
		return ""
	}
}

// highestContribChronicleTier liefert die hoechste erreichte Stufe fuer Familie 2
// ("Chronist", D-03). Zaehlbasis ist die Netto-Anzahl veroeffentlichter, nicht
// geloeschter Notiz-/Text-Beitraege des Members ueber release_version_notes
// (Pflicht-Kern, member_id direkt) plus anime_fansub_project_notes und
// fansub_group_notes ueber den created_by_user_id-Autor-Seam. Schwellen: 10/50/150.
func highestContribChronicleTier(count int) string {
	switch {
	case count >= 150:
		return "gold"
	case count >= 50:
		return "silver"
	case count >= 10:
		return "bronze"
	default:
		return ""
	}
}

// highestContribArchivistTier liefert die hoechste erreichte Stufe fuer Familie 3
// ("Bildarchivar", D-04). Zaehlbasis ist COUNT(*) ueber release_version_media
// Zeilen des Members ueber den Autor-Seam, ausschliesslich net soft-delete
// (deleted_at IS NULL), OHNE review_status-/visibility-Join. Schwellen: 10/50/150.
func highestContribArchivistTier(count int) string {
	switch {
	case count >= 150:
		return "gold"
	case count >= 50:
		return "silver"
	case count >= 10:
		return "bronze"
	default:
		return ""
	}
}
