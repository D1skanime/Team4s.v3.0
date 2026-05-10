---
quick_id: 260510-umt
description: Beschreibungs-Textarea Fix fuer Release-Version-Media Caption-Feld
date: 2026-05-10
status: ready
---

# Quick Task 260510-umt: Beschreibungs-Textarea Fix

## Goal

Das `<input type="text">` fuer die Beschreibung/Caption im ReleaseVersionMediaDetailPanel
durch ein `<textarea>` ersetzen, sodass lange Beschreibungen mehrzeilig dargestellt werden.

## Tasks

### Task 1: input → textarea in ReleaseVersionMediaDetailPanel.tsx

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx`

**Action:** Zeile 113–117: `<input className={styles.input} .../>` ersetzen durch
`<textarea className={styles.input} ...></textarea>` — `value` und `onChange` bleiben identisch.

**Done:** Element ist `<textarea>`, kein `type`-Attribut, korrekt geschlossen.

### Task 2: CSS-Override fuer textarea in ReleaseVersionMediaSection.module.css

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css`

**Action:** Nach dem `.input, .select { ... }` Block einen neuen Rule hinzufuegen:
```css
textarea.input {
  min-height: 80px;
  resize: vertical;
}
```

**Done:** textarea zeigt min. 80px Hoehe und ist vertikal resizbar.
