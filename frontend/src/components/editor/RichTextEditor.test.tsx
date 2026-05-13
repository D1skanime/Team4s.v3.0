// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RichTextRenderer } from './RichTextRenderer'

const useEditorMock = vi.fn((config?: unknown) => null)

// TipTap nutzt ProseMirror-DOM-APIs, die in jsdom nicht vollständig verfügbar sind.
// Wir mocken @tiptap/react minimal, sodass RichTextEditor rendert ohne Crash.
vi.mock('@tiptap/react', () => ({
  useEditor: (config: unknown) => useEditorMock(config),
  EditorContent: ({ editor }: { editor: null }) => (
    <div data-testid="editor-content">{editor === null ? '' : String(editor)}</div>
  ),
}))

// Weitere TipTap-Extensions die 'use client' oder DOM brauchen
vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-table', () => ({ Table: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-table-row', () => ({ default: {} }))
vi.mock('@tiptap/extension-table-cell', () => ({ default: {} }))
vi.mock('@tiptap/extension-table-header', () => ({ default: {} }))
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-character-count', () => ({ default: {} }))
vi.mock('./ColorTokenExtension', () => ({
  ColorTokenExtension: {},
  COLOR_TOKENS: ['default', 'gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'],
}))

// RichTextEditor ist 'use client' — wir importieren nach den Mocks
import { RichTextEditor } from './RichTextEditor'

describe('RichTextEditor', () => {
  it('rendert ohne Crash (Smoke Test)', () => {
    const html = renderToStaticMarkup(
      <RichTextEditor value={null} onChange={() => {}} />,
    )
    expect(html).toBeTruthy()
  })

  it('zeigt den Shortnote-Hinweis bei mode="shortnote"', () => {
    const html = renderToStaticMarkup(
      <RichTextEditor value={null} onChange={() => {}} mode="shortnote" />,
    )
    expect(html).toContain('2–5 Sätze reichen')
  })

  it('zeigt den Shortnote-Hinweis NICHT bei mode="longform"', () => {
    const html = renderToStaticMarkup(
      <RichTextEditor value={null} onChange={() => {}} mode="longform" />,
    )
    expect(html).not.toContain('2–5 Sätze reichen')
  })

  it('zeigt helperText wenn übergeben', () => {
    const html = renderToStaticMarkup(
      <RichTextEditor value={null} onChange={() => {}} helperText="Testhinweis" />,
    )
    expect(html).toContain('Testhinweis')
  })
  it('gibt mehreren leeren Instanzen getrennte Initialwerte', () => {
    useEditorMock.mockClear()

    renderToStaticMarkup(
      <>
        <RichTextEditor value={null} onChange={() => {}} />
        <RichTextEditor value={null} onChange={() => {}} />
      </>,
    )

    const firstConfig = useEditorMock.mock.calls[0]?.[0] as { content: object } | undefined
    const secondConfig = useEditorMock.mock.calls[1]?.[0] as { content: object } | undefined

    expect(firstConfig?.content).toEqual(secondConfig?.content)
    expect(firstConfig?.content).not.toBe(secondConfig?.content)
  })
})

describe('RichTextRenderer', () => {
  it('rendert null wenn bodyHtml null ist', () => {
    const html = renderToStaticMarkup(<RichTextRenderer bodyHtml={null} />)
    expect(html).toBe('')
  })

  it('rendert null wenn bodyHtml ein leerer String ist', () => {
    const html = renderToStaticMarkup(<RichTextRenderer bodyHtml="" />)
    expect(html).toBe('')
  })

  it('rendert ein div mit dem HTML wenn bodyHtml gesetzt ist', () => {
    const html = renderToStaticMarkup(<RichTextRenderer bodyHtml="<p>Test</p>" />)
    expect(html).toContain('<p>Test</p>')
    expect(html).toMatch(/^<div/)
  })
})
