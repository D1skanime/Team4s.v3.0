# Runtime-Aktivierung

2026-09-14: kanonischer HEAD vor Änderung6cd178d0c5d48895af6a2edeaa9782dc9a24545a. SHA256 der geänderten Handler-/Repositorydateien in backend/ und Container/app stimmten überein. Compose Watch synchronisiert, Air lädt Code neu.

Vor Apply: etablierter `go run ./cmd/migrate status -dir /app/database/migrations` listet162 applied, genau163 release_version_media_title pending. Frische Git-Migrationsprüfung: ausschließlich eigene neue0163up/down-Dateien. Nach erfolgreichem isoliertem PostgreSQL-Up/Down/Up und finalem19-Pass-Testgate wurde über denselben CLI `up` angewendet: migrations applied:1. Danach163 applied,0 pending. Nur additive nullable Titelspalte+Längenconstraint; keine Zeilendaten-Backfills/Resets/Reconciliation, keine Medienverschiebung oder neue Tabelle.

Read-only Live-Smoke: /health200; /api/v1/anime/1/group/1/releases/28 und49 jeweils200; geschützter /api/v1/admin/release-versions/28/media ohneSession401. Antwortschlüssel und Status in runtime-smoke.json. Nach Code-Sync und vorSchemaaktivierung waren temporäre500 in title-lesenden Endpoints sichtbar; nachApply beide geprüftenReleaseendpoints200. Backendneustart war nicht erforderlich.

Keine realenUpload-/PATCH-/DELETE-Aktionen. In-App-Browser ohneSession zeigtLoginhinweis. Angemeldete echteUpload-/Review-/öffentlicheFreigabe-UAT bleibt offen und ersetzt keine offenenPhasen156–159-Punkte. Ein vorbestehender Jellyfin401/Asset502 trat imRuntimeLog auf; imTitel-/Uploadfix nicht verändert.
