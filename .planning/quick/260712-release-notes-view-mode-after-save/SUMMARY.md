---
status: complete
date: 2026-07-12
---

# Summary

Quick-Fix abgeschlossen:

- `ReleaseVersionNotesTab` fuehrt `editingRoleKeys` pro Member/Rolle.
- Gespeicherte Notizen rendern als Preview mit Text, Sichtbarkeit, Status und Bearbeiten-Aktion.
- Leere eigene Rollen bleiben direkt editierbar, damit der erste Eintrag schnell bleibt.
- Speichern und Abbrechen verlassen den Edit-Modus wieder.
- Tests wurden auf das neue View/Edit-Verhalten angepasst und um eine Regression fuer gespeicherte eigene Notizen erweitert.

Checks:

- `npm test -- --run ReleaseVersionNotesTab`
- `npm run typecheck`
- `npm run lint -- --quiet`
- `git diff --check`
