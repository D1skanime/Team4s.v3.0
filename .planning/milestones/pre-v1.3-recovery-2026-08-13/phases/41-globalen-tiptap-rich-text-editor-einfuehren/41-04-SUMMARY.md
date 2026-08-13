---
phase: 41-globalen-tiptap-rich-text-editor-einfuehren
plan: "04"
subsystem: frontend-editor
tags: [tiptap, rich-text, components, css]
dependency_graph:
  requires:
    - 41-01 (TipTap npm-Packages, Spezifikation)
    - 41-02 (DB-Migrations und Backend-TipTap-Service)
  provides:
    - frontend/src/components/editor/RichTextEditor.tsx
    - frontend/src/components/editor/RichTextRenderer.tsx
    - frontend/src/components/editor/ColorTokenExtension.ts
    - frontend/src/components/editor/index.ts
  affects:
    - 41-05 (Admin-UI-Integration — verwendet diese Komponenten)
tech_stack:
  added:
    - "@tiptap/react@^3.23.1"
    - "@tiptap/pm@^3.23.1"
    - "@tiptap/starter-kit@^3.23.1"
    - "@tiptap/extension-table@^3.23.1"
    - "@tiptap/extension-table-row@^3.23.1"
    - "@tiptap/extension-table-cell@^3.23.1"
    - "@tiptap/extension-table-header@^3.23.1"
    - "@tiptap/extension-text-style@^3.23.1"
    - "@tiptap/extension-color@^3.23.1"
    - "@tiptap/extension-placeholder@^3.23.1"
    - "@tiptap/extension-character-count@^3.23.1"
  patterns:
    - "'use client' Komponente mit TipTap useEditor"
    - "ColorTokenExtension: TextStyle.extend() mit data-color-token statt inline style"
    - "RichTextRenderer: SSR-safe mit dangerouslySetInnerHTML auf sanitisiertem body_html"
    - "StarterKit.configure mit codeBlock/code/strike/hardBreak: false"
key_files:
  created:
    - frontend/src/components/editor/RichTextEditor.tsx
    - frontend/src/components/editor/RichTextEditor.module.css
    - frontend/src/components/editor/RichTextRenderer.tsx
    - frontend/src/components/editor/RichTextRenderer.module.css
    - frontend/src/components/editor/ColorTokenExtension.ts
    - frontend/src/components/editor/index.ts
  modified:
    - frontend/src/styles/globals.css (color-token-* CSS-Klassen hinzugefügt)
    - frontend/package.json (TipTap-Packages + typecheck-Script)
    - frontend/package-lock.json (442 neue Packages)
decisions:
  - "TextStyle als named export importieren (nicht default) — TipTap 3.x API"
  - "setContent() ohne emitUpdate boolean — TipTap 3.x entfernte den Positional-Parameter"
  - "globals.css liegt unter frontend/src/styles/globals.css (nicht frontend/src/app/globals.css)"
  - "typecheck-Script (tsc --noEmit) zu package.json hinzugefügt — war vorher nicht vorhanden"
metrics:
  duration: "~9 Minuten"
  completed_date: "2026-05-12"
  tasks: 2
  files_created: 6
  files_modified: 3
---

# Phase 41 Plan 04: Globale TipTap-Komponenten — Summary

**One-liner:** Globale TipTap-Editor-Komponenten mit ColorToken-Extension (data-color-token/class statt inline-style), SSR-safe Renderer und Farb-Token-CSS für body_html-Ausgabe.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TipTap npm-Packages + ColorTokenExtension + index.ts | 016eb73b | ColorTokenExtension.ts, index.ts, package.json, package-lock.json |
| 2 | RichTextEditor + RichTextRenderer + CSS | 79eef7b6 | RichTextEditor.tsx, RichTextEditor.module.css, RichTextRenderer.tsx, RichTextRenderer.module.css, globals.css, package.json |

## Decisions Made

1. **TextStyle als named Export:** TipTap 3.x exportiert `TextStyle` als named export, nicht als default. `import { TextStyle } from '@tiptap/extension-text-style'` war notwendig.

2. **setContent ohne Boolean-Argument:** TipTap 3.x API entfernte den `emitUpdate`-Boolean als zweiten Positional-Parameter von `setContent`. Aufruf ohne zweites Argument behebt den TypeScript-Fehler.

3. **globals.css unter frontend/src/styles/:** Die globale CSS-Datei liegt unter `frontend/src/styles/globals.css`, nicht wie im Plan angenommen unter `frontend/src/app/globals.css`. Tokens wurden korrekt dort eingefügt.

4. **typecheck-Script hinzugefügt:** `package.json` hatte kein `typecheck`-Script. `tsc --noEmit` wurde als `"typecheck"` hinzugefügt, um den Plan-Acceptance-Criteria zu erfüllen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TextStyle Default-Import-Fehler**
- **Found during:** Task 2 — npm run typecheck
- **Issue:** `import TextStyle from '@tiptap/extension-text-style'` schlug fehl: kein Default-Export in TipTap 3.x
- **Fix:** Zu Named Import `import { TextStyle } from '@tiptap/extension-text-style'` gewechselt
- **Files modified:** frontend/src/components/editor/ColorTokenExtension.ts
- **Commit:** Teil von 79eef7b6 (Fix inline, keine eigene Commit-Zeile)

**2. [Rule 1 - Bug] setContent() Typen-Fehler**
- **Found during:** Task 2 — npm run typecheck
- **Issue:** `editor.commands.setContent(content, false)` — TipTap 3.x `setContent` akzeptiert keinen Boolean als zweiten Positional-Parameter mehr
- **Fix:** `false` entfernt; `setContent(content)` ohne zweites Argument
- **Files modified:** frontend/src/components/editor/RichTextEditor.tsx
- **Commit:** Teil von 79eef7b6

**3. [Rule 2 - Missing Critical] typecheck-Script fehlte in package.json**
- **Found during:** Task 2 — `npm run typecheck` schlug mit "missing script" fehl
- **Issue:** Plan-Verification erfordert `npm run typecheck`; Script existierte nicht
- **Fix:** `"typecheck": "tsc --noEmit"` zu package.json hinzugefügt
- **Files modified:** frontend/package.json
- **Commit:** 79eef7b6

## Known Stubs

Keine. Alle exportierten Komponenten sind vollständig implementiert:
- `RichTextEditor`: 'use client', Toolbar, StarterKit-Konfiguration, shortnote-Modus
- `RichTextRenderer`: SSR-safe, dangerouslySetInnerHTML mit bodyHtml
- `ColorTokenExtension`: data-color-token/class statt inline style

## Self-Check: PASSED

- `frontend/src/components/editor/RichTextEditor.tsx` — FOUND
- `frontend/src/components/editor/RichTextRenderer.tsx` — FOUND
- `frontend/src/components/editor/ColorTokenExtension.ts` — FOUND
- `frontend/src/components/editor/index.ts` — FOUND
- Commit 016eb73b — FOUND
- Commit 79eef7b6 — FOUND
- `npm run typecheck` — PASSED (kein Fehler)
- RichTextEditor.tsx Zeilen: 273 (unter 450-Limit)
