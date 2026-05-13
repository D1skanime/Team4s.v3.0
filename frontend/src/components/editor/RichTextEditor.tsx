'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useRef } from 'react'
import { ColorTokenExtension, COLOR_TOKENS } from './ColorTokenExtension'
import type { ColorToken } from './ColorTokenExtension'
import type { Editor } from '@tiptap/react'
import styles from './RichTextEditor.module.css'

type RichTextEditorProps = {
  value: unknown | null
  onChange: (value: unknown) => void
  placeholder?: string
  helperText?: string
  mode?: 'longform' | 'shortnote'
  disabled?: boolean
  minHeight?: number
}

const SHORTNOTE_HINT =
  'Diese Notizen beschreiben die konkrete Release-Version. Schreibe kurz, was du in deiner Rolle gemacht hast oder was an dieser Ausgabe besonders war. 2–5 Sätze reichen.'

function createEmptyRichTextDoc() {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }
}

function cloneRichTextValue(value: unknown | null): object {
  if (value == null) return createEmptyRichTextDoc()
  return JSON.parse(JSON.stringify(value)) as object
}

// ---------- Toolbar ----------

type ToolbarProps = {
  editor: Editor
}

function EditorToolbar({ editor }: ToolbarProps) {
  function setHeading(level: 1 | 2 | 3) {
    editor.chain().focus().toggleHeading({ level }).run()
  }

  function setColorToken(token: ColorToken) {
    if (token === 'default') {
      editor.chain().focus().unsetMark('textStyle').run()
    } else {
      editor.chain().focus().setMark('textStyle', { colorToken: token }).run()
    }
  }

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Textformatierung">
      {/* Absatzformat */}
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('paragraph') ? styles.toolbarBtnActive : ''}`}
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Absatz"
      >
        ¶
      </button>
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 1 }) ? styles.toolbarBtnActive : ''}`}
        onClick={() => setHeading(1)}
        title="Überschrift 1"
      >
        H1
      </button>
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 2 }) ? styles.toolbarBtnActive : ''}`}
        onClick={() => setHeading(2)}
        title="Überschrift 2"
      >
        H2
      </button>
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('heading', { level: 3 }) ? styles.toolbarBtnActive : ''}`}
        onClick={() => setHeading(3)}
        title="Überschrift 3"
      >
        H3
      </button>

      <span className={styles.toolbarSep} />

      {/* Inline-Format */}
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('bold') ? styles.toolbarBtnActive : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Fett"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('italic') ? styles.toolbarBtnActive : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Kursiv"
      >
        <em>I</em>
      </button>

      <span className={styles.toolbarSep} />

      {/* Listen */}
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('bulletList') ? styles.toolbarBtnActive : ''}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Aufzählung"
      >
        ≡
      </button>
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('orderedList') ? styles.toolbarBtnActive : ''}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Nummerierte Liste"
      >
        1.
      </button>

      {/* Zitat */}
      <button
        type="button"
        className={`${styles.toolbarBtn} ${editor.isActive('blockquote') ? styles.toolbarBtnActive : ''}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockzitat"
      >
        &ldquo;
      </button>

      <span className={styles.toolbarSep} />

      {/* Tabelle */}
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        title="Tabelle einfügen"
      >
        ⊞
      </button>

      {/* Trennlinie */}
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontale Linie"
      >
        —
      </button>

      <span className={styles.toolbarSep} />

      {/* Farb-Dropdown */}
      <select
        className={styles.toolbarSelect}
        title="Textfarbe"
        defaultValue=""
        onChange={(e) => {
          const token = e.target.value as ColorToken | ''
          if (token === '') return
          setColorToken(token as ColorToken)
          e.target.value = ''
        }}
      >
        <option value="" disabled>
          Farbe
        </option>
        <option value="default">Farbe entfernen</option>
        {COLOR_TOKENS.filter((t) => t !== 'default').map((token) => (
          <option key={token} value={token}>
            {token.charAt(0).toUpperCase() + token.slice(1)}
          </option>
        ))}
      </select>

      <span className={styles.toolbarSep} />

      {/* Undo / Redo */}
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Rückgängig"
      >
        ↩
      </button>
      <button
        type="button"
        className={styles.toolbarBtn}
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Wiederholen"
      >
        ↪
      </button>
    </div>
  )
}

// ---------- RichTextEditor ----------

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  helperText,
  mode = 'longform',
  disabled = false,
  minHeight = 160,
}: RichTextEditorProps) {
  const prevValue = useRef(value)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        code: false,
        strike: false,
        hardBreak: false,
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      ColorTokenExtension,
      Placeholder.configure({ placeholder: placeholder ?? 'Hier schreiben…' }),
      CharacterCount,
    ],
    content: cloneRichTextValue(value),
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON()
      prevValue.current = json
      onChange(json)
    },
  })

  // Sync external value changes (e.g. loading saved data)
  useEffect(() => {
    if (!editor) return
    if (value === prevValue.current) return
    prevValue.current = value
    editor.commands.setContent(cloneRichTextValue(value))
  }, [editor, value])

  // Sync editable state
  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  return (
    <div className={`${styles.editorShell} ${disabled ? styles.editorShellDisabled : ''}`}>
      {helperText && <p className={styles.helperText}>{helperText}</p>}
      {editor && !disabled && <EditorToolbar editor={editor} />}
      <div className={styles.editorContent} style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
      {mode === 'shortnote' && (
        <p className={styles.shortnoteHint}>{SHORTNOTE_HINT}</p>
      )}
    </div>
  )
}
