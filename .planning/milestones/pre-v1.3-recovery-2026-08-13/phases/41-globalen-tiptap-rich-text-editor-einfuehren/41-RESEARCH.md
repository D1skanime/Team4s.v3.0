# Phase 41: Globalen TipTap-Rich-Text-Editor einführen - Research

**Researched:** 2026-05-12
**Domain:** TipTap Rich Text Editor, Go JSON-to-HTML Rendering, Database Migration
**Confidence:** HIGH (TipTap npm packages direkt verifiziert; Go-Patterns aus Codebase; DB-Schema aus Migrations)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Primärformat: body_json JSONB** — TipTap JSON ist die fachliche Quelle
- **body_html TEXT** — serverseitig aus body_json erzeugt und sanitisiert; Public-Ausgabe
- **body_text TEXT** — serverseitig extrahierter Plaintext für Suche, Teaser, Admin-Listen
- **editor_type TEXT NOT NULL DEFAULT 'tiptap'** — für spätere Migrationen
- **content_schema_version INT NOT NULL DEFAULT 1** — versioniert das erlaubte Schema
- body_markdown aus Phase 40 bleibt als Legacy-Feld (nicht löschen)
- Betroffene Tabellen: fansub_group_notes, member_group_stories, anime_fansub_project_notes, release_version_notes
- TipTap MVP-Allowlist: doc, paragraph, text, heading(1-3), bulletList, orderedList, listItem, blockquote, horizontalRule, table, tableRow, tableCell, tableHeader; Marks: bold, italic, textStyle (colorToken), color
- Keine freien Hex-Farben — nur Token-Palette: default, gray, red, orange, yellow, green, blue, purple
- Tabellen: max. 6 Spalten, max. 30 Zeilen, keine verschachtelten Tabellen
- Editor-Modi: "longform" (3 Textbereiche) und "shortnote" (release_version_notes)
- RichTextEditor-Props und RichTextRenderer-Props wie in CONTEXT.md definiert
- HTML-Sanitizing-Allowlist: p, h1, h2, h3, strong, em, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, hr, span; Attribute: class, colspan, rowspan
- Admin-GET liefert body_json; Public-GET liefert body_html; Admin-Save akzeptiert body_json (nie body_html vom Client)
- Toolbar: Paragraph/H1/H2/H3 Dropdown, Bold, Italic, Bullet List, Numbered List, Quote, Table einfügen, Textfarbe Dropdown (nur Palette), HR, Undo, Redo
- Kein Autosave; kein Link im MVP; kein Image im MVP; keine freien HTML-Inputs
- Hilfetexte aus Phase 40 beibehalten (Schreibimpulse, Rollenmodell)

### Claude's Discretion
- Konkrete Go-Library für TipTap JSON → HTML Rendering (eigene Implementierung oder Bibliothek)
- Konkrete Go-Library für HTML Sanitizing (z.B. bluemonday)
- Exakte TipTap Extension-Versionen (je nach Kompatibilität)
- Dateistruktur globaler Frontend-Komponenten (z.B. frontend/src/components/editor/)
- Interne Implementation der ColorToken-Extension
- Konkrete CSS-Klassen für Farb-Tokens
- Ob Links im MVP sicher aktivierbar sind (Entscheid nach Research)

### Deferred Ideas (OUT OF SCOPE)
- Bilder/Uploads: Über das Media-/Asset-System — spätere Phase
- Links: URL-Sanitizing und Target/Rel-Regeln nötig; nur wenn ohne Mehraufwand sicher aktivierbar
- Versionierung: Spätere Phase
- Kommentare: Spätere Phase
- Collaboration (Realtime): Spätere Phase
- Freie Hex-Farben: Bewusst ausgeschlossen (nur Token-Palette)
- Autosave: Nur wenn bereits vorhanden
- Embeds (YouTube etc.): Spätere Phase
- CodeBlock: Nicht Teil des MVP
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TIPTAP-EDITOR-01 | TipTap als globale Rich-Text-Editor-Basis für alle vier Textbereiche mit JSONB-Speicherung, serverseitigem HTML/Sanitizing/Plaintext, globalen Frontend-Komponenten, Backend-Validierung und Migration von body_markdown | Vollständig abgedeckt durch npm-Packages (verifiziert), bluemonday (bereits in go.mod), custom JSON-to-HTML Renderer Pattern, DB-Migrationsstrategie |
</phase_requirements>

---

## Summary

Phase 41 migriert das Markdown-Textarea-System aus Phase 40 auf TipTap als Rich-Text-Editor für alle vier Note-Typen. Die zentrale technische Herausforderung ist das Go-Backend: TipTap serialisiert Dokumente als JSON-AST, aber es gibt keine fertige Go-Bibliothek für TipTap-JSON-zu-HTML-Rendering. Die empfohlene Lösung ist ein schlanker eigener Recursive-Walker in Go, der den kontrollierten TipTap-AST (nur Allowlist-Nodes) in HTML umwandelt — dies ist realistisch, da der Allowlist-Scope klein ist (13 Node-Typen, 4 Marks). bluemonday ist bereits in `go.mod` (v1.0.27) als indirect dependency und muss lediglich auf direct hochgestuft werden. Die Frontend-Seite ist straightforward: TipTap 3.23.1 ist kompatibel mit React 18.3.1 und Next.js 16, erfordert aber `"use client"` und ggf. dynamic import mit `ssr: false`.

Die bestehende Codebase ist sehr sauber aufgestellt für diese Migration: Alle vier Repository-Structs und Handler sind homogen strukturiert mit identischen `body_markdown`/`body_html`-Patterns. Die Migrations-Nummering beginnt bei 0066. Der release_version_notes-Editor sitzt in `ReleaseVersionNotesTab.tsx` im episode-versions-Bereich, nicht im fansub-Bereich.

**Primary recommendation:** TipTap 3.23.1 installieren; custom Go JSON-to-HTML Walker implementieren; bluemonday auf direct dependency hochstufen; globale Komponenten unter `frontend/src/components/editor/` ablegen.

---

## Standard Stack

### Core (Frontend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tiptap/react | 3.23.1 | React-Integration, `useEditor` Hook | Offizieller React-Wrapper |
| @tiptap/pm | 3.23.1 | ProseMirror-Kern (transitive dep) | Pflichtpaket für TipTap |
| @tiptap/starter-kit | 3.23.1 | Basis-Extensions gebündelt (Paragraph, Heading, Lists, Blockquote, HorizontalRule, Bold, Italic, History) | Reduziert Einzelinstallationen |
| @tiptap/extension-table | 3.23.1 | Tabellen-Node | Offiziell |
| @tiptap/extension-table-row | 3.23.1 | Table Row | Offiziell |
| @tiptap/extension-table-cell | 3.23.1 | Table Cell | Offiziell |
| @tiptap/extension-table-header | 3.23.1 | Table Header | Offiziell |
| @tiptap/extension-text-style | 3.23.1 | TextStyle Mark (Basis für ColorToken) | Offiziell |
| @tiptap/extension-color | 3.23.1 | Color Mark (via TextStyle) | Offiziell |
| @tiptap/extension-placeholder | 3.23.1 | Placeholder-Text im leeren Editor | Offiziell |
| @tiptap/extension-character-count | 3.23.1 | Zeichenzähler (optional, für Shortnote-Hint) | Offiziell |

**Version verification:** Alle Packages via `npm view @tiptap/* version` am 2026-05-12 bestätigt: 3.23.1 ist aktuell.

### Core (Backend)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| github.com/microcosm-cc/bluemonday | v1.0.27 | HTML Sanitizing | Bereits in go.mod (indirect); bekannteste Go HTML Sanitizer-Library |
| encoding/json (stdlib) | — | JSON-Parsing, JSONB-Validation | Kein externer Import nötig |
| html/template (stdlib) | — | HTML-Escaping im Custom Renderer | Kein externer Import nötig |

**Installation (Frontend):**
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-table @tiptap/extension-table-row \
  @tiptap/extension-table-cell @tiptap/extension-table-header \
  @tiptap/extension-text-style @tiptap/extension-color \
  @tiptap/extension-placeholder @tiptap/extension-character-count
```

**Backend (go.mod):** bluemonday von indirect auf direct verschieben:
```bash
go get github.com/microcosm-cc/bluemonday@v1.0.27
```

---

## Architecture Patterns

### Empfohlene Dateistruktur

```
frontend/src/components/editor/
├── RichTextEditor.tsx          # Globale Editor-Komponente ("use client")
├── RichTextEditor.module.css   # Editor-Styles + Toolbar
├── RichTextRenderer.tsx        # Globale Renderer-Komponente (SSR-safe)
├── RichTextRenderer.module.css # Output-Styles (Prose)
├── ColorTokenExtension.ts      # Custom TipTap Extension für Token-Palette
└── index.ts                    # Re-Export

backend/internal/services/
├── markdown_service.go         # Bestehend (Phase 40)
├── tiptap_service.go           # NEU: JSON-Validierung, HTML-Rendering, Plaintext
└── tiptap_service_test.go      # NEU: Tests

database/migrations/
├── 0066_fansub_group_notes_tiptap.up.sql   # ALTER TABLE ADD COLUMN
├── 0066_fansub_group_notes_tiptap.down.sql
├── 0067_member_group_stories_tiptap.up.sql
├── 0067_member_group_stories_tiptap.down.sql
├── 0068_anime_fansub_project_notes_tiptap.up.sql
├── 0068_anime_fansub_project_notes_tiptap.down.sql
├── 0069_release_version_notes_tiptap.up.sql
├── 0069_release_version_notes_tiptap.down.sql
```

### Pattern 1: TipTap useEditor in Next.js App Router

TipTap verwendet DOM-APIs (ProseMirror) und ist nicht SSR-kompatibel. Da im Projekt noch kein `dynamic(..., { ssr: false })` verwendet wird, muss das Muster neu eingeführt werden.

```typescript
// frontend/src/components/editor/RichTextEditor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
// ... weitere Extensions

type RichTextEditorProps = {
  value: unknown | null
  onChange: (value: unknown) => void
  placeholder?: string
  helperText?: string
  mode?: 'longform' | 'shortnote'
  disabled?: boolean
  minHeight?: number
}

export function RichTextEditor({ value, onChange, placeholder, mode = 'longform', disabled }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Explizit nur erlaubte Nodes aktivieren
        codeBlock: false,
        code: false,
        strike: false,
        hardBreak: false,
      }),
      Table.configure({ resizable: false }),
      // TableRow, TableCell, TableHeader ...
      // ColorTokenExtension (custom) ...
      // Placeholder ...
    ],
    content: value as object ?? { type: 'doc', content: [] },
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })
  // ...
}
```

**Wichtig:** Die Komponente MUSS `'use client'` als erste Zeile haben. Falls die übergeordnete Page eine Server Component ist, muss die Komponente via dynamic import geladen werden:

```typescript
// In einer Server Component (falls nötig):
import dynamic from 'next/dynamic'
const RichTextEditor = dynamic(
  () => import('@/components/editor/RichTextEditor').then(m => m.RichTextEditor),
  { ssr: false }
)
```

Da die bestehenden Fansub-Edit-Pages und Episode-Version-Edit-Pages alle `'use client'` sind, ist `ssr: false` nur als Absicherung nötig, nicht zwingend.

### Pattern 2: Custom TipTap ColorToken Extension

TipTap's `Color`-Extension setzt freie Inline-Styles. Für Token-only-Farben wird eine Custom Extension benötigt:

```typescript
// frontend/src/components/editor/ColorTokenExtension.ts
import { Extension } from '@tiptap/core'
import TextStyle from '@tiptap/extension-text-style'

export const COLOR_TOKENS = ['default', 'gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const
export type ColorToken = typeof COLOR_TOKENS[number]

// TextStyle erweitern statt Color-Extension verwenden
// Attribut colorToken statt color im textStyle Mark
export const ColorTokenExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colorToken: {
        default: null,
        parseHTML: element => element.getAttribute('data-color-token'),
        renderHTML: attributes => {
          if (!attributes.colorToken || attributes.colorToken === 'default') return {}
          return { 'data-color-token': attributes.colorToken, class: `color-token-${attributes.colorToken as string}` }
        },
      },
    }
  },
})
```

### Pattern 3: Go TipTap JSON → HTML Renderer (Custom)

Es gibt keine fertige Go-Library für TipTap JSON Rendering. Der kontrollierte Allowlist-Scope macht einen Custom Walker realistisch (~200-300 Zeilen):

```go
// backend/internal/services/tiptap_service.go

type TipTapService struct {
    sanitizer *bluemonday.Policy
}

// TipTapNode ist der generische JSON-Knotentyp
type TipTapNode struct {
    Type    string            `json:"type"`
    Attrs   map[string]any    `json:"attrs,omitempty"`
    Marks   []TipTapMark      `json:"marks,omitempty"`
    Content []TipTapNode      `json:"content,omitempty"`
    Text    string            `json:"text,omitempty"`
}

type TipTapMark struct {
    Type  string         `json:"type"`
    Attrs map[string]any `json:"attrs,omitempty"`
}

// allowedNodes definiert erlaubte Node-Types
var allowedNodes = map[string]bool{
    "doc": true, "paragraph": true, "text": true,
    "heading": true, "bulletList": true, "orderedList": true,
    "listItem": true, "blockquote": true, "horizontalRule": true,
    "table": true, "tableRow": true, "tableCell": true, "tableHeader": true,
}

// allowedMarks definiert erlaubte Mark-Types
var allowedMarks = map[string]bool{
    "bold": true, "italic": true, "textStyle": true,
}

func (s *TipTapService) ValidateJSON(jsonBytes []byte) error {
    var node TipTapNode
    if err := json.Unmarshal(jsonBytes, &node); err != nil {
        return fmt.Errorf("ungültiges JSON: %w", err)
    }
    return s.validateNode(node)
}

func (s *TipTapService) RenderHTML(jsonBytes []byte) (string, error) {
    var node TipTapNode
    if err := json.Unmarshal(jsonBytes, &node); err != nil {
        return "", err
    }
    var buf strings.Builder
    s.renderNode(&buf, node)
    raw := buf.String()
    return string(s.sanitizer.SanitizeBytes([]byte(raw))), nil
}

func (s *TipTapService) ExtractText(jsonBytes []byte) (string, error) {
    var node TipTapNode
    if err := json.Unmarshal(jsonBytes, &node); err != nil {
        return "", err
    }
    var buf strings.Builder
    s.extractText(&buf, node)
    return strings.TrimSpace(buf.String()), nil
}

func (s *TipTapService) IsEmpty(jsonBytes []byte) bool {
    text, err := s.ExtractText(jsonBytes)
    if err != nil || strings.TrimSpace(text) == "" {
        return true
    }
    return false
}
```

**Heading-Level-Mapping im Renderer:**
```go
case "heading":
    level := 1
    if l, ok := node.Attrs["level"].(float64); ok {
        level = int(l)
    }
    if level < 1 || level > 3 { level = 1 } // Allowlist-Enforcement
    tag := fmt.Sprintf("h%d", level)
```

### Pattern 4: bluemonday Allowlist-Konfiguration

bluemonday ist bereits in go.mod. Statt `UGCPolicy()` (zu permissiv) eine enge Policy für TipTap-Output:

```go
func newTipTapSanitizerPolicy() *bluemonday.Policy {
    p := bluemonday.NewPolicy()
    p.AllowElements("p", "h1", "h2", "h3", "strong", "em",
        "ul", "ol", "li", "blockquote", "table", "thead", "tbody",
        "tr", "th", "td", "hr", "span")
    p.AllowAttrs("class").OnElements("span", "td", "th")
    p.AllowAttrs("colspan", "rowspan").OnElements("td", "th")
    p.AllowAttrs("data-color-token").OnElements("span")
    return p
}
```

### Pattern 5: DB Migration Pattern (aus bestehenden Migrations)

Letztes Migrations-Präfix: `0065`. Nächste: `0066`–`0069`.

```sql
-- 0066_fansub_group_notes_tiptap.up.sql
ALTER TABLE fansub_group_notes
  ADD COLUMN IF NOT EXISTS body_json              JSONB      NULL,
  ADD COLUMN IF NOT EXISTS body_text              TEXT       NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS editor_type            TEXT       NOT NULL DEFAULT 'tiptap',
  ADD COLUMN IF NOT EXISTS content_schema_version INT        NOT NULL DEFAULT 1;

-- body_html existiert bereits — kein ADD nötig
-- body_markdown bleibt (kein DROP)
```

**Wichtig:** `body_html` existiert in allen vier Tabellen bereits aus Phase 40. Es ist kein `ADD COLUMN body_html` nötig — nur body_json, body_text, editor_type, content_schema_version hinzufügen.

### Pattern 6: RichTextRenderer (SSR-safe)

Der Renderer zeigt body_html an und ist eine Server Component-kompatible Komponente:

```typescript
// frontend/src/components/editor/RichTextRenderer.tsx
// KEIN 'use client' nötig — nur dangerouslySetInnerHTML

type RichTextRendererProps = {
  bodyHtml?: string | null
  bodyJson?: unknown | null
  editorType?: string | null
  contentSchemaVersion?: number | null
}

export function RichTextRenderer({ bodyHtml }: RichTextRendererProps) {
  if (!bodyHtml?.trim()) return null
  return (
    <div
      className="rich-text-output"
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  )
}
```

**Sicherheitsinvariante:** `dangerouslySetInnerHTML` NUR mit serverseitig sanitisiertem body_html. Nie body_json direkt rendern ohne serverseitiges Sanitizing.

### Anti-Patterns to Avoid

- **Color-Extension ohne Token-Enforcement:** Standard `@tiptap/extension-color` setzt beliebige Hex-Werte im inline style — stattdessen Custom Extension mit Allowlist.
- **Client-seitiges body_html:** body_html NIEMALS vom Client-JSON generieren und zurücksenden — immer serverseitig erzeugen.
- **UGCPolicy für TipTap-Output:** `bluemonday.UGCPolicy()` erlaubt Links und mehr als nötig — für TipTap eine enge Custom Policy nutzen.
- **StarterKit ohne Disable-Konfiguration:** StarterKit aktiviert standardmäßig CodeBlock, Code, Strike, HardBreak — explizit auf `false` setzen.
- **Editor-Komponente in Server Component importieren:** TipTap bricht SSR — entweder `'use client'`-Page oder dynamic import mit `ssr: false`.
- **content-Prop aus dem leeren Editor als null senden:** TipTap liefert bei leerem Dokument `{ type: "doc", content: [{ type: "paragraph" }] }` — IsEmpty muss das korrekt erkennen.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML Sanitizing | Eigener Regex-Sanitizer | bluemonday (bereits in go.mod) | XSS-Edge-Cases bei manuellen Sanitizern; bluemonday hat Jahre an Security-Fixes |
| Editor-Undo/Redo | Eigener History-Stack | StarterKit History (ProseMirror built-in) | ProseMirror History ist battle-tested |
| Tabellen-Editing | Eigene Tabellen-UI | @tiptap/extension-table | Zell-Selektion, Merge, Keyboard-Navigation extrem komplex |
| Character Count | `text.length` | @tiptap/extension-character-count | Korrekte Unicode-/Emoji-Counting; optional aber vorhanden |
| ProseMirror direkt | Eigene ProseMirror-Konfiguration | TipTap Extensions | TipTap-Abstraktion spart 80% Boilerplate |

---

## Existing Phase 40 Codebase — Was migriert wird

### Backend-Dateien mit body_markdown-Patterns

| Datei | Was ändert sich |
|-------|-----------------|
| `backend/internal/handlers/admin_content_fansub_notes.go` | Request-DTOs: `body_markdown` → `body_json`; Handler-Logik: `markdownSvc.RenderMarkdown` → `tiptapSvc.ValidateJSON + RenderHTML + ExtractText`; Datei ist 451 Zeilen — muss ggf. gesplittet werden |
| `backend/internal/repository/fansub_group_notes_repository.go` | Struct: `BodyMarkdown`/`BodyHTML` → `BodyJSON`, `BodyHTML`, `BodyText`; SQL-Queries anpassen |
| `backend/internal/repository/member_group_stories_repository.go` | Identisch wie oben |
| `backend/internal/repository/anime_project_notes_repository.go` | Identisch wie oben |
| `backend/internal/repository/release_version_notes_repository.go` | Identisch wie oben (BulkUpsert-Pattern) |

**Hinweis:** `admin_content_fansub_notes.go` ist bereits 451 Zeilen und überschreitet das 450-Zeilen-Limit aus CLAUDE.md nach der Erweiterung. Der Handler muss in zwei Dateien aufgeteilt werden (z.B. fansub_group_notes + member_group_stories in einer, project_notes in einer anderen).

### Frontend-Dateien die ersetzt werden

| Datei | Was ändert sich |
|-------|-----------------|
| `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx` | `GroupNoteDraft.bodyMarkdown` → `bodyJson: unknown`; `MarkdownToolbarInline` + `MarkdownPreview` → `RichTextEditor`; `GroupNoteEditor` und `StoryEditor` verwenden neuen Editor |
| `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` | API-Calls senden `body_json` statt `body_markdown`; `groupNoteFromApi`/`storyFromApi` lesen `bodyJson` |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` | `NoteFormState.bodyMarkdown` → `bodyJson`; Textarea → `RichTextEditor` |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx` | `NoteFormState.bodyMarkdown` → `bodyJson`; Textarea in `RoleNoteField` → `RichTextEditor` (mode="shortnote") |
| `frontend/src/types/fansubNotes.ts` | Typen um `bodyJson`, `bodyText`, `editorType`, `contentSchemaVersion` erweitern; `bodyMarkdown` behalten |
| `frontend/src/types/releaseVersionNotes.ts` | Analog |
| `frontend/src/lib/api.ts` | API-Funktionen: Request-Typen anpassen |

### Typ-Übersicht Frontend (bestehend)

Der Handler gibt aktuell `body_markdown` zurück. Die API-Funktionen in `api.ts` verwenden camelCase-Mapping. Nach Phase 41 kommen `body_json`, `body_text`, `editor_type`, `content_schema_version` dazu.

---

## Common Pitfalls

### Pitfall 1: TipTap SSR-Crash in Next.js App Router
**What goes wrong:** `useEditor` oder ProseMirror-Imports crashen beim Server-seitigen Rendering mit "window is not defined" oder ähnlichen Fehlern.
**Why it happens:** TipTap verwendet DOM-APIs beim Initialisieren.
**How to avoid:** `'use client'` als erste Zeile in `RichTextEditor.tsx`. Falls die Page selbst eine Server Component ist: dynamic import mit `ssr: false`. Im bestehenden Projekt sind alle Edit-Pages bereits `'use client'`, daher ist das Risiko gering.
**Warning signs:** Build-Fehler "ReferenceError: window is not defined" oder `document is not defined`.

### Pitfall 2: StarterKit aktiviert unerwünschte Extensions
**What goes wrong:** `StarterKit` aktiviert standardmäßig CodeBlock, Code, Strike, HardBreak — diese sind in der Allowlist nicht erlaubt.
**Why it happens:** StarterKit ist ein Bundle; ohne explizite `false`-Konfiguration sind alle Standard-Extensions aktiv.
**How to avoid:** Explizit deaktivieren: `StarterKit.configure({ codeBlock: false, code: false, strike: false, hardBreak: false })`.
**Warning signs:** Nutzer kann Code-Blocks oder Strikethrough eingeben; JSON enthält `"type": "codeBlock"`.

### Pitfall 3: Color-Extension setzt Inline-Style statt CSS-Klasse
**What goes wrong:** Standard `@tiptap/extension-color` setzt `style="color: #ff0000"` — beliebige Hex-Werte möglich, bluemonday blockt style-Attribute.
**Why it happens:** Die offizielle Color-Extension ist nicht für Token-Systeme designed.
**How to avoid:** Custom ColorToken-Extension die `data-color-token` Attribut und CSS-Klasse setzt statt inline style. CSS-Datei mit `.color-token-red { color: var(--token-red) }` etc.
**Warning signs:** Farben erscheinen nicht nach dem Sanitizing; body_html hat keine Farb-Styles.

### Pitfall 4: body_html bereits in Phase-40-Tabellen vorhanden
**What goes wrong:** Migration versucht `ADD COLUMN body_html` — scheitert mit "column already exists".
**Why it happens:** Phase 40 hat `body_html` bereits zu allen vier Tabellen hinzugefügt (aus Migration 0061-0064).
**How to avoid:** Nur die neuen Felder hinzufügen: `body_json`, `body_text`, `editor_type`, `content_schema_version`. `IF NOT EXISTS` nutzen als Absicherung.
**Warning signs:** Migration schlägt fehl; Docker-Backend startet nicht.

### Pitfall 5: Leerer TipTap-Inhalt wird fälschlich als nicht-leer behandelt
**What goes wrong:** TipTap liefert auch bei einem "leeren" Editor das JSON `{"type":"doc","content":[{"type":"paragraph"}]}`. `body_json IS NOT NULL` allein reicht nicht.
**Why it happens:** TipTap hält immer mindestens einen leeren Paragraph.
**How to avoid:** `IsEmpty()`-Funktion im Go-Service, die body_text nach Trim prüft; leere Paragraphs, leere Headings, Tabellen ohne Text als leer klassifiziert.
**Warning signs:** Public-Ausgabe zeigt leere Entries.

### Pitfall 6: admin_content_fansub_notes.go überschreitet 450-Zeilen-Limit
**What goes wrong:** Die Datei ist bereits 451 Zeilen und wird durch TipTap-Erweiterungen weiter wachsen.
**How to avoid:** Vor oder während der TipTap-Migration splitten: z.B. `admin_content_fansub_group_notes.go` und `admin_content_member_stories.go` + `admin_content_anime_project_notes.go`.
**Warning signs:** CLAUDE.md Konventionsverletzung.

### Pitfall 7: release_version_notes BulkUpsert-Pattern
**What goes wrong:** `release_version_notes` verwendet einen anderen Save-Pfad als die drei anderen Note-Typen: `BulkUpsertReleaseVersionNotes` statt einzelner Create/Update.
**Why it happens:** Release-Notes sind member+role-gebunden und werden als Batch gespeichert.
**How to avoid:** ReleaseVersionNotesTab und zugehöriges Repository separat behandeln; `BulkNoteInput` braucht `body_json` statt `body_markdown`.

---

## Code Examples

### TipTap JSON Struktur (verifiziert aus TipTap-Dokumentation)

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Überschrift" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Normaler Text und " },
        {
          "type": "text",
          "text": "farbiger Text",
          "marks": [
            { "type": "textStyle", "attrs": { "colorToken": "red" } }
          ]
        }
      ]
    },
    {
      "type": "table",
      "content": [
        {
          "type": "tableRow",
          "content": [
            { "type": "tableHeader", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Kopf" }] }] }
          ]
        }
      ]
    }
  ]
}
```

### Go TipTap Validator (Allowlist-Kern)

```go
func (s *TipTapService) validateNode(node TipTapNode) error {
    if !allowedNodes[node.Type] {
        return fmt.Errorf("nicht erlaubter Node-Typ: %q", node.Type)
    }
    for _, mark := range node.Marks {
        if !allowedMarks[mark.Type] {
            return fmt.Errorf("nicht erlaubter Mark-Typ: %q", mark.Type)
        }
        if mark.Type == "textStyle" {
            if ct, ok := mark.Attrs["colorToken"].(string); ok && ct != "" {
                if !allowedColorTokens[ct] {
                    return fmt.Errorf("nicht erlaubtes Farb-Token: %q", ct)
                }
            }
        }
    }
    for _, child := range node.Content {
        if err := s.validateNode(child); err != nil {
            return err
        }
    }
    return nil
}
```

### Handler-Muster (nach Migration)

```go
// In CreateFansubGroupNote:
var req createFansubGroupNoteRequest
// req.BodyJSON ist json.RawMessage

bodyJSON, err := json.Marshal(req.BodyJSON)
if err := h.tiptapSvc.ValidateJSON(bodyJSON); err != nil {
    badRequest(c, "ungültiger Editor-Inhalt: "+err.Error())
    return
}
bodyHTML, _ := h.tiptapSvc.RenderHTML(bodyJSON)
bodyText, _ := h.tiptapSvc.ExtractText(bodyJSON)

// An Repository übergeben:
repository.CreateFansubGroupNoteRequest{
    BodyJSON: bodyJSON,
    BodyHTML: bodyHTML,
    BodyText: bodyText,
    EditorType: "tiptap",
    ContentSchemaVersion: 1,
}
```

### DB Migration Pattern (ein Beispiel)

```sql
-- 0066_fansub_group_notes_tiptap.up.sql
ALTER TABLE fansub_group_notes
  ADD COLUMN IF NOT EXISTS body_json              JSONB  NULL,
  ADD COLUMN IF NOT EXISTS body_text              TEXT   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS editor_type            TEXT   NOT NULL DEFAULT 'tiptap',
  ADD COLUMN IF NOT EXISTS content_schema_version INT    NOT NULL DEFAULT 1;

-- 0066_fansub_group_notes_tiptap.down.sql
ALTER TABLE fansub_group_notes
  DROP COLUMN IF EXISTS body_json,
  DROP COLUMN IF EXISTS body_text,
  DROP COLUMN IF EXISTS editor_type,
  DROP COLUMN IF EXISTS content_schema_version;
```

---

## State of the Art

| Old Approach (Phase 40) | Current Approach (Phase 41) | When Changed | Impact |
|-------------------------|-----------------------------|--------------|--------|
| body_markdown als Primärformat | body_json JSONB als Primärformat | Phase 41 | WYSIWYG statt Textarea; strukturierte Daten |
| goldmark Markdown → HTML | Custom TipTap JSON → HTML Walker | Phase 41 | Kein Markdown mehr nötig |
| bluemonday UGCPolicy | bluemonday Custom TipTap-Policy (enger) | Phase 41 | Weniger erlaubte Tags; nur was TipTap produziert |
| Markdown-Toolbar + Split-View | TipTap WYSIWYG | Phase 41 | Echter Rich-Text-Editor |
| Kein Plaintext-Feld | body_text für Suche/Teaser | Phase 41 | Listenansichten werden schneller |

**Deprecated nach Phase 41:**
- `goldmark` und `bluemonday.UGCPolicy()` im Markdown-Rendering-Pfad für die vier Note-Tabellen (bleibt noch im Projekt da `markdown_service.go` weiter existiert, aber neuer Code nutzt `tiptap_service.go`)
- `body_markdown` als aktiv beschriebenes Feld (bleibt in DB, wird aber nicht mehr befüllt)

---

## Environment Availability

Step 2.6: Keine neuen externen Abhängigkeiten außer npm packages und Go-Pakete. Alle benötigten Laufzeitdienste (PostgreSQL, Redis, Docker) sind bereits vorhanden. npm und Go sind beide verfügbar (Projekt läuft aktiv). TipTap-Packages werden frisch installiert.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm | Frontend package install | ✓ | — | — |
| @tiptap/* packages | Frontend Editor | Nach Install ✓ | 3.23.1 | — |
| bluemonday | Go HTML Sanitizing | ✓ (indirect in go.mod) | v1.0.27 | — |
| PostgreSQL JSONB | body_json Speicherung | ✓ | PG 16 | — |

**Missing dependencies with no fallback:** Keine.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 (Frontend), Go testing + testify 1.9.0 (Backend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run command (Frontend) | `cd frontend && npm test` |
| Full suite command (Frontend) | `cd frontend && npm test` |
| Backend test command | `cd backend && go test ./internal/services/... ./internal/handlers/...` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TIPTAP-EDITOR-01 | Gültiges TipTap JSON wird gespeichert | unit (Go) | `go test ./internal/services/... -run TestTipTapService` | ❌ Wave 0 |
| TIPTAP-EDITOR-01 | Ungültiges JSON / unbekannte Nodes werden abgelehnt | unit (Go) | `go test ./internal/services/... -run TestTipTapValidation` | ❌ Wave 0 |
| TIPTAP-EDITOR-01 | body_html und body_text werden korrekt erzeugt | unit (Go) | `go test ./internal/services/... -run TestTipTapRender` | ❌ Wave 0 |
| TIPTAP-EDITOR-01 | Leerer Editor-Inhalt als leer erkannt | unit (Go) | `go test ./internal/services/... -run TestTipTapIsEmpty` | ❌ Wave 0 |
| TIPTAP-EDITOR-01 | RichTextEditor rendert ohne Crash | unit (Frontend) | `npm test -- --run RichTextEditor` | ❌ Wave 0 |
| TIPTAP-EDITOR-01 | Freie Farben werden nicht angeboten | unit (Frontend) | `npm test -- --run ColorToken` | ❌ Wave 0 |
| TIPTAP-EDITOR-01 | Speichern sendet body_json | unit (Frontend) | bestehende Tab-Tests erweitern | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd backend && go test ./internal/services/... -run TestTipTap`
- **Per wave merge:** `cd frontend && npm test && cd ../backend && go test ./...`
- **Phase gate:** Full suite green vor `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/internal/services/tiptap_service_test.go` — covers alle TipTap-Service-Tests
- [ ] `frontend/src/components/editor/RichTextEditor.test.tsx` — Render-Test
- [ ] `frontend/src/components/editor/ColorTokenExtension.test.ts` — Token-Allowlist-Test

---

## Open Questions

1. **Release_version_notes BulkUpsert: Wie body_json pro Rolle speichern?**
   - Was wir wissen: BulkUpsertReleaseVersionNotes arbeitet mit `BulkNoteInput`-Array, jedes Element hat `bodyMarkdown`
   - Was unklar: `body_json` ist pro Member+Role ein eigenes JSON-Dokument im shortnote-Modus — sollte auch ein kurzes Dokument sein
   - Recommendation: `BulkNoteInput` um `body_json json.RawMessage` erweitern; shortnote-Modus schränkt Länge per CharacterCount ein, nicht per DB-Constraint

2. **Links im MVP — sicher aktivierbar?**
   - Was wir wissen: Link-Extension existiert (@tiptap/extension-link, nicht in Allowlist), erfordert URL-Sanitizing (javascript:-Protokoll-Block), rel="noopener noreferrer" für target="_blank"
   - Was unklar: Soll Link-Extension doch aktiviert werden für interne URLs?
   - Recommendation: Links im MVP NICHT aktivieren. bluemonday müsste `href` mit `AllowURLSchemes("https", "http")` konfiguriert werden — ein weiterer Angriffspunkt. Deferred wie entschieden.

3. **ColorToken CSS-Klassen: Wo definieren?**
   - Was wir wissen: CSS-Klassen wie `.color-token-red` müssen global verfügbar sein (body_html wird in öffentlichen Seiten gerendert)
   - Recommendation: Global CSS-Datei in `frontend/src/app/globals.css` erweitern oder separates `rich-text-output.css` anlegen, das in den globalen Styles importiert wird.

---

## Project Constraints (from CLAUDE.md)

- **450-Zeilen-Limit:** Produktionsdateien dürfen 450 Zeilen nicht überschreiten — `admin_content_fansub_notes.go` (451 Zeilen) muss im Rahmen dieser Phase gesplittet werden
- **Umlaute:** Alle deutschen User-facing Strings verwenden korrekte Umlaute (ä, ö, ü, ß) — gilt für TipTap Placeholder, Toolbar-Tooltips, Fehlermeldungen
- **Brownfield:** Bestehende Handler/Repository-Patterns nicht ersetzen, sondern erweitern
- **Modularity:** `tiptap_service.go` als eigene Service-Datei; Handler-Splits respektieren Paket-Grenze
- **`"use client"`:** RichTextEditor muss client-seitig sein; keine Server-Component-Imports für TipTap
- **Shared contracts:** OpenAPI in `shared/contracts/` muss body_json als nullable object, body_text als string in Request/Response DTOs widerspiegeln

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view @tiptap/* version`) — alle Package-Versionen am 2026-05-12 verifiziert: 3.23.1
- Codebase-Analyse: `go.mod`, `database/migrations/0061-0065`, alle vier Repository-Dateien, Handler-Datei, Frontend-Tabs — direkt gelesen
- `npm view @tiptap/react@3 peerDependencies` — React 18 Kompatibilität bestätigt

### Secondary (MEDIUM confidence)
- TipTap-Dokumentation (aus Trainingsdaten, verifiziert via npm metadata): TipTap 3.x API-Struktur (useEditor, getJSON, setContent, Extension-Configure-API)
- bluemonday README/API: Policy-Konfiguration mit AllowElements/AllowAttrs (aus Codebase — bestehende UGCPolicy-Nutzung in markdown_service.go bestätigt)

### Tertiary (LOW confidence)
- Go TipTap JSON rendering: Kein bekanntes Drittbibliothek-Äquivalent gefunden — Custom Walker ist der Community-Konsens (aus Trainingsdaten; nicht aktiv web-verifiziert)

---

## Metadata

**Confidence breakdown:**
- Standard Stack (npm packages): HIGH — via npm registry verifiziert
- Standard Stack (Go): HIGH — bluemonday in go.mod, stdlib-Patterns aus Codebase
- Architecture Patterns: HIGH — direkt aus bestehendem Code abgeleitet
- DB Migration: HIGH — Tabellen-Schemas direkt gelesen, Migration-Pattern bekannt
- Pitfalls: MEDIUM-HIGH — TipTap SSR und StarterKit-Verhalten aus Trainingsdaten (weit verbreitet dokumentiert)
- Go JSON-to-HTML Renderer: MEDIUM — Custom Implementation, kein Präzedenzfall im Projekt

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (TipTap bewegt sich schnell, aber 3.x API ist stabil; react/next.js Kompatibilität sollte 30 Tage halten)
