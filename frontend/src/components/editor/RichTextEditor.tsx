'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useId, useRef, useState } from 'react'
import { ColorTokenExtension } from './ColorTokenExtension'
import type { ColorToken } from './ColorTokenExtension'
import { StoryImageExtension } from './StoryImageExtension'
import { StoryImageToolbarButton } from './StoryImageToolbarButton'
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
  /** Opt-in Bild-Feature: nur bei true wird StoryImageExtension geladen + Toolbar-Button gerendert (D-11) */
  enableImages?: boolean
  /** Callback wenn Nutzer ein Bild auswaehlt — liefert pending_key und File fuer deferred Upload */
  onPendingImageAdded?: (pendingKey: string, file: File) => void
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
  enableImages?: boolean
  onPendingImageAdded?: (pendingKey: string, file: File) => void
}

const COLOR_TOKEN_META: Array<{ token: ColorToken; label: string }> = [
  { token: 'gray', label: 'Grau' },
  { token: 'red', label: 'Rot' },
  { token: 'orange', label: 'Orange' },
  { token: 'yellow', label: 'Gelb' },
  { token: 'green', label: 'Grün' },
  { token: 'blue', label: 'Blau' },
  { token: 'purple', label: 'Lila' },
]

function EditorToolbar({ editor, enableImages, onPendingImageAdded }: ToolbarProps) {
  const [colorMenuOpen, setColorMenuOpen] = useState(false)
  const colorMenuId = useId()
  const colorMenuRef = useRef<HTMLDivElement | null>(null)

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

  const activeColorToken = (editor.getAttributes('textStyle').colorToken as ColorToken | null) ?? 'default'
  const activeColorLabel =
    activeColorToken === 'default'
      ? 'Standard'
      : COLOR_TOKEN_META.find((entry) => entry.token === activeColorToken)?.label ?? 'Farbe'
  const isTableActive = editor.isActive('table')

  useEffect(() => {
    if (!colorMenuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!colorMenuRef.current?.contains(event.target as Node)) {
        setColorMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setColorMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [colorMenuOpen])

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
      {isTableActive ? (
        <>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            title="Spalte rechts hinzufügen"
          >
            Spalte +
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            title="Spalte löschen"
          >
            Spalte -
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Zeile unten hinzufügen"
          >
            Zeile +
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => editor.chain().focus().deleteRow().run()}
            title="Zeile löschen"
          >
            Zeile -
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Tabelle löschen"
          >
            Tabelle löschen
          </button>
        </>
      ) : null}

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

      {/* Farbpalette */}
      <div className={styles.toolbarMenuWrap} ref={colorMenuRef}>
        <button
          type="button"
          className={`${styles.toolbarBtn} ${styles.toolbarMenuBtn} ${activeColorToken !== 'default' ? styles.toolbarBtnActive : ''}`}
          onClick={() => setColorMenuOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={colorMenuOpen}
          aria-controls={colorMenuId}
          title="Textfarbe"
        >
          <span className={styles.toolbarColorPreview} data-color-token={activeColorToken}>
            A
          </span>
          <span className={styles.toolbarMenuLabel}>{activeColorLabel}</span>
        </button>
        {colorMenuOpen ? (
          <div className={styles.colorMenu} id={colorMenuId} role="dialog" aria-label="Textfarbe auswählen">
            <div className={styles.colorMenuHeader}>
              <span className={styles.colorMenuTitle}>Textfarbe</span>
              {activeColorToken !== 'default' ? (
                <button
                  type="button"
                  className={styles.colorMenuReset}
                  onClick={() => {
                    setColorToken('default')
                    setColorMenuOpen(false)
                  }}
                >
                  Farbe entfernen
                </button>
              ) : null}
            </div>
            <div className={styles.colorSwatchGrid}>
              {COLOR_TOKEN_META.map(({ token, label }) => (
                <button
                  key={token}
                  type="button"
                  className={`${styles.colorSwatch} ${activeColorToken === token ? styles.colorSwatchActive : ''}`}
                  onClick={() => {
                    setColorToken(token)
                    setColorMenuOpen(false)
                  }}
                  title={label}
                  aria-label={label}
                  aria-pressed={activeColorToken === token}
                >
                  <span className={styles.colorSwatchDot} data-color-token={token} />
                  <span className={styles.colorSwatchLabel}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

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

      {/* Bild einfuegen — nur bei enableImages={true} (D-11, T-70-05-03) */}
      {enableImages && (
        <>
          <span className={styles.toolbarSep} />
          <StoryImageToolbarButton
            btnClassName={styles.toolbarBtn}
            onFileSelected={(file) => {
              const pendingKey = crypto.randomUUID()
              editor.chain().focus().insertContent({
                type: 'image',
                attrs: {
                  pending_key: pendingKey,
                  preview_url: URL.createObjectURL(file),
                  width_percent: 60,
                  alignment: 'center',
                },
              }).run()
              onPendingImageAdded?.(pendingKey, file)
            }}
          />
        </>
      )}
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
  enableImages,
  onPendingImageAdded,
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
      // Bild-Extension nur bei opt-in (D-11, T-70-05-03)
      ...(enableImages ? [StoryImageExtension] : []),
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
      {editor && !disabled && (
        <EditorToolbar
          editor={editor}
          enableImages={enableImages}
          onPendingImageAdded={onPendingImageAdded}
        />
      )}
      <div className={styles.editorContent} style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
      {mode === 'shortnote' && (
        <p className={styles.shortnoteHint}>{SHORTNOTE_HINT}</p>
      )}
    </div>
  )
}
