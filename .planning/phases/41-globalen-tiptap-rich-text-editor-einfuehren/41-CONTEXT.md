# Phase 41: Globalen TipTap-Rich-Text-Editor einführen - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Source:** PRD Express Path (inline PRD in /gsd:plan-phase 41 invocation)

<domain>
## Phase Boundary

Diese Phase ersetzt das Markdown-Textarea-System aus Phase 40 durch einen globalen TipTap-Rich-Text-Editor für alle vier Textbereiche: fansub_group_notes, member_group_stories, anime_fansub_project_notes, release_version_notes.

**Was diese Phase liefert:**
- TipTap als globale Editor-Basis (installiert, konfiguriert, getestet)
- DB-Migrations: Neue Felder body_json, body_html, body_text, editor_type, content_schema_version für alle vier Texttabellen
- Go-Backend: JSON-Validierung gegen TipTap-Schema-Allowlist, HTML-Rendering, HTML-Sanitizing, Plaintext-Extraktion
- Frontend: Globale RichTextEditor-Komponente (Admin-Eingabe), globale RichTextRenderer-Komponente (Public-/Preview-Ausgabe)
- Migration bestehender body_markdown-Daten (Legacy-Strategie, kein Datenverlust)
- Admin-UI: Alle vier Textbereiche auf RichTextEditor umgestellt
- Public-Ausgabe: Nur sanitisiertes body_html bei published+public+not-empty

**Was diese Phase NICHT liefert:**
- Bilder/Uploads über Media-System (spätere Phase)
- Links (spätere Erweiterung, nur wenn sicher aktivierbar ohne Mehraufwand)
- Kommentare/Versionierung/Collaboration
- Autosave (nur wenn bereits vorhanden)
- Freie Hex-Farben (nur Token-Palette)
- Base64-Bilder, externe Bild-URLs
- Freie HTML-Eingabe

</domain>

<decisions>
## Implementation Decisions

### Primärformat und Datenbankfelder
- **Primärformat: body_json JSONB** — TipTap JSON ist die fachliche Quelle
- **body_html TEXT** — serverseitig aus body_json erzeugt und sanitisiert; Public-Ausgabe
- **body_text TEXT** — serverseitig extrahierter Plaintext für Suche, Teaser, Admin-Listen
- **editor_type TEXT NOT NULL DEFAULT 'tiptap'** — für spätere Migrationen
- **content_schema_version INT NOT NULL DEFAULT 1** — versioniert das erlaubte Schema
- Markdown ist kein Primärformat; body_markdown aus Phase 40 bleibt als Legacy-Feld (nicht löschen)

### Betroffene Tabellen (alle vier)
- fansub_group_notes
- member_group_stories
- anime_fansub_project_notes
- release_version_notes

### TipTap MVP-Funktionen (Allowlist)
**Erlaubte Nodes:**
- doc, paragraph, text
- heading (level 1, 2, 3)
- bulletList, orderedList, listItem
- blockquote
- horizontalRule
- table, tableRow, tableCell, tableHeader

**Erlaubte Marks:**
- bold, italic
- textStyle (für colorToken)
- color (custom ColorToken, nur Token-Namen, keine Hex-Werte)

**NICHT erlaubt im MVP:**
- image, link, codeBlock, code, iframe, html
- hardBreak (nur falls bewusst aktiviert)
- mention, taskList, youtube/embed
- custom HTML nodes

### TipTap Extensions (MVP)
Installieren/aktivieren:
- StarterKit (nur mit erlaubten Nodes/Marks konfiguriert)
- Table, TableRow, TableCell, TableHeader
- TextStyle
- Custom ColorToken-Extension (KEINE freien Hex-Werte, nur Token-Namen)
- Placeholder
- CharacterCount (optional)
- History/UndoRedo (via StarterKit)

NICHT installieren: Image, Link, CodeBlock, TaskList, Mention, Youtube/Embed

### Farbmodell (Token-Palette)
Erlaubte Tokens: default, gray, red, orange, yellow, green, blue, purple
- Keine freien CSS-/Hex-Werte
- Im TipTap JSON: `{ "type": "textStyle", "attrs": { "colorToken": "red" } }`
- CSS-Klassen oder kontrollierte Inline-Styles, keine beliebigen style-Attribute

### Tabellen-Regeln
- Max. 6 Spalten
- Max. 30 Zeilen
- Keine verschachtelten Tabellen
- Keine Zell-Hintergrundfarben im MVP
- Keine eingebetteten Bilder
- Public-Darstellung mobil scrollbar oder responsiv

### Editor-Modi
- **longform**: Für fansub_group_notes, member_group_stories, anime_fansub_project_notes — volle MVP-Toolbar, Tabellen, Farben, Überschriften, längere Texte
- **shortnote**: Für release_version_notes — gleiche technische Toolbar, aber UI-Hinweis: "Diese Notizen beschreiben die konkrete Release-Version. Schreibe kurz, was du in deiner Rolle gemacht hast oder was an dieser Ausgabe besonders war. 2–5 Sätze reichen."

### Globale Frontend-Komponenten
**RichTextEditor:**
```typescript
type RichTextEditorProps = {
  value: unknown | null;
  onChange: (value: unknown) => void;
  placeholder?: string;
  helperText?: string;
  mode?: "longform" | "shortnote";
  disabled?: boolean;
  minHeight?: number;
};
```
- Muss `"use client"` enthalten
- In Next.js App Router ggf. dynamic import mit `ssr: false`
- Toolbar muss bei disabled/readOnly deaktiviert sein

**RichTextRenderer:**
```typescript
type RichTextRendererProps = {
  bodyHtml?: string | null;
  bodyJson?: unknown | null;
  editorType?: string | null;
  contentSchemaVersion?: number | null;
};
```
- Bevorzugt body_html (serverseitig erzeugt + sanitisiert)
- Niemals unsanitisiertes HTML anzeigen
- Optional Fallback auf gerendertes JSON

### Toolbar UX
Mindestens: Paragraph/H1/H2/H3 Dropdown, Bold, Italic, Bullet List, Numbered List, Quote, Table einfügen, Textfarbe Dropdown (nur Palette), Horizontal Rule, Undo, Redo.
Mobile: Toolbar darf umbrechen oder horizontal scrollbar sein.

### Backend-Verarbeitung beim Speichern
1. body_json vom Frontend empfangen
2. JSON gegen erlaubtes TipTap-Schema validieren (Allowlist Nodes + Marks)
3. HTML aus body_json erzeugen
4. HTML sanitizen (Allowlist Tags/Attributes)
5. Plaintext extrahieren
6. Speichern: body_json, body_html, body_text, editor_type='tiptap', content_schema_version=1

### HTML-Sanitizing-Allowlist
Erlaubte Tags: p, h1, h2, h3, strong, em, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, hr, span
Erlaubte Attribute: class (nur kontrollierte Klassen), colspan/rowspan (Tabellen)
NICHT erlaubt: script, iframe, object, embed, form, input, button, on*-Handler, style mit beliebigen Werten, javascript:-URLs, base64-Media, data-* (außer bewusst definiert)

### Backend-Validierung
- body_json ist gültiges JSON
- Nur erlaubte Nodes und Marks
- Keine Script-/Event-Handler, keine freien HTML-Blöcke, keine Base64-Bilder
- Keine externen Bilder, keine beliebigen Style-Attribute
- Textlänge je Bereich prüfen
- Leere Inhalte korrekt erkennen

### Empty Content Detection
Gilt als leer wenn:
- body_json null ist
- body_json nur leere Paragraphs enthält
- body_text nach Trim leer ist
- body_json nur leere Formatierungsblöcke ohne Text enthält
- Tabellen ohne Text gelten als leer
- Whitespace, leere Headings und leere Listen gelten als leer

### API-Anpassung
- Admin-GET: liefert body_json für Bearbeitung
- Public-GET: liefert body_html (bevorzugt) und optional body_text
- Admin-Save: akzeptiert body_json; body_html wird NICHT blind vom Client übernommen
- body_text wird serverseitig erzeugt

### Migrationsstrategie (Legacy body_markdown)
- body_markdown NICHT löschen
- Neue Felder ergänzen: body_json, body_html, body_text, editor_type, content_schema_version
- Da nur Testdaten existieren (Phase 40 frisch umgesetzt): Migration auf neue Felder durchführen
- body_markdown als Legacy-Feld behalten (optional NULL setzen oder leer lassen)
- Beim nächsten Speichern wird TipTap JSON als primäres Format verwendet
- Kein Datenverlust

### Public-Ausgabe
Nur anzeigen bei:
- status = 'published'
- visibility = 'public'
- deleted_at IS NULL
- body_text nicht leer (nach Trim) ODER body_json enthält echten Textinhalt

### Performance
- Editor-Komponente clientseitig laden (dynamic import mit ssr: false falls nötig)
- body_html für Public cachen
- Listenansichten verwenden body_text/excerpt, nicht body_json/body_html

### Save-Verhalten
- Kein Autosave (außer bereits vorhanden)
- Speichern über bestehenden Save-Button
- Validierungsfehler anzeigen
- Keine stillen Datenverluste beim Tabwechsel

### Bestehende Hilfetexte (Phase 40 beibehalten)
- Schreibimpulse für anime_fansub_project_notes
- Rollenbezogene Hilfetexte für release_version_notes
- Rollenmodell: translator, editor, timer, typesetter, encoder, raw_provider, quality_checker, project_lead, designer, admin, other
- Diese Phase ändert nur die Editor-Technik, nicht die fachliche Bedeutung

### Tests Mindestanforderungen
Backend:
- Speichern gültigen TipTap JSON
- Ablehnen ungültigen JSON / unbekannter Nodes / nicht erlaubter HTML-/Script-Inhalte
- Erzeugen body_html und body_text
- Leerer Editor-Inhalt als leer erkannt
- Public zeigt nur published + nicht leer
- Migration ergänzt Felder korrekt, bestehende Inhalte gehen nicht verloren

Frontend:
- RichTextEditor rendert
- H1/H2/H3, Fett, Kursiv, Listen, Tabelle, Farbe funktionieren
- Freie Farben nicht angeboten
- Shortnote-Modus zeigt Hinweis
- Hilfetexte aus Phase 40 sichtbar
- Speichern sendet body_json
- Laden setzt Editor-Inhalt korrekt

### Claude's Discretion
- Konkrete Go-Library für TipTap JSON → HTML Rendering (eigene Implementierung oder Bibliothek)
- Konkrete Go-Library für HTML Sanitizing (z.B. bluemonday)
- Exakte TipTap Extension-Versionen (je nach Kompatibilität)
- Dateistruktur globaler Frontend-Komponenten (z.B. frontend/src/components/editor/)
- Interne Implementation der ColorToken-Extension
- Konkrete CSS-Klassen für Farb-Tokens
- Ob Links im MVP sicher aktivierbar sind (Entscheid nach Research)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 40 Artifacts (Existing System to Migrate)
- `backend/internal/handlers/admin_content_fansub_notes.go` — Bestehende Handler für alle vier Note-Typen; DTOs mit body_markdown
- `backend/internal/repository/fansub_group_notes_repository.go` — Repository fansub_group_notes
- `backend/internal/repository/member_group_stories_repository.go` — Repository member_group_stories
- `backend/internal/repository/anime_project_notes_repository.go` — Repository anime_fansub_project_notes
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx` — Aktuelle Markdown-Textarea-Komponenten (zu ersetzen durch RichTextEditor)
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` — Notes-Tab für Fansub-Edit
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` — Anime-Projekt-Notizen-Bereich

### Database Migrations
- `database/migrations/` — Bestehende Migrations; neue Migration für Phase 41 hier anlegen

### Project Conventions
- `CLAUDE.md` — 450-Zeilen-Limit pro Datei, Umlaute-Regel, Stack-Details
- `.planning/STATE.md` — Aktueller Projektstatus

### Go Backend Patterns
- `backend/internal/handlers/` — Handler-Muster für Request/Response-DTOs
- `backend/internal/repository/` — Repository-Muster mit pgxpool

### Frontend Patterns
- `frontend/src/components/` — Globale Komponenten-Ablage
- `frontend/src/lib/api.ts` — Zentraler API-Client
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` — Bestehende Styles für Editor-Bereich

</canonical_refs>

<specifics>
## Specific Ideas

### TipTap JSON Beispiel (ColorToken)
```json
{
  "type": "text",
  "text": "wichtiger Text",
  "marks": [
    {
      "type": "textStyle",
      "attrs": {
        "colorToken": "red"
      }
    }
  ]
}
```

### Bild-Architektur (für spätere Phase vorbereiten)
Zukünftige Image Node soll referenzieren:
```json
{
  "type": "image",
  "attrs": {
    "media_asset_id": 123,
    "caption": "Altes Gruppenbanner"
  }
}
```
→ Architektur so anlegen, dass custom image node später einfügbar ist.

### Shortnote Hilfetext
"Diese Notizen beschreiben die konkrete Release-Version. Schreibe kurz, was du in deiner Rolle gemacht hast oder was an dieser Ausgabe besonders war. 2–5 Sätze reichen."

</specifics>

<deferred>
## Deferred Ideas

- **Bilder/Uploads**: Über das Media-/Asset-System — spätere Phase
- **Links**: URL-Sanitizing und Target/Rel-Regeln nötig; nur wenn ohne Mehraufwand sicher aktivierbar
- **Versionierung**: Spätere Phase
- **Kommentare**: Spätere Phase
- **Collaboration (Realtime)**: Spätere Phase
- **Freie Hex-Farben**: Bewusst ausgeschlossen (nur Token-Palette)
- **Autosave**: Nur wenn bereits vorhanden
- **Embeds (YouTube etc.)**: Spätere Phase
- **CodeBlock**: Nicht Teil des MVP

</deferred>

---

*Phase: 41-globalen-tiptap-rich-text-editor-einfuehren*
*Context gathered: 2026-05-12 via PRD Express Path (inline)*
