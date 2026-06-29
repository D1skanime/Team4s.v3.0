---
status: complete
phase: 90
kind: add-on-hotfix
completed_at: 2026-06-28
---

# Summary

Release-Version-Media wurde serverseitig auf den korrekten Contributor-Scope begrenzt. Normale Rollen bekommen nur eigene Uploads aus der Liste zurück und können fremde Relation-IDs nicht mehr über Patch, Delete oder Reorder mutieren. Vollzugriff bleibt bei Platform Admin, Fansub Lead und Project Lead.

## Geändert

- Backend Handler: Liste filtern, Owner-Guard für Patch/Delete/Reorder, `can_delete_own_media` Capability.
- Backend Repository: `uploaded_by_user_id` in Relation-Meta und Owner-Validierung für Reorder.
- Frontend: Delete-Button akzeptiert `can_delete_own_media` für die sichtbaren eigenen Uploads.
- Contract: `ReleaseVersionCapabilities` enthält `can_delete_own_media`.
- Tests: Backend-Filter/Capability und Frontend-Own-Delete-Verhalten ergänzt.
