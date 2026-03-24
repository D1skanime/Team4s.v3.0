import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { AnimeEditorControllerInput, AnimeEditorContext } from '@/app/admin/anime/types/admin-anime-editor'
import { useAnimeEditor } from '@/app/admin/anime/hooks/useAnimeEditor'

import { AnimeEditorShell } from './AnimeEditorShell'

function createControllerInput(overrides: Partial<AnimeEditorControllerInput> = {}): AnimeEditorControllerInput {
  return {
    isDirty: false,
    isSubmitting: false,
    submitLabel: 'Aenderungen speichern',
    savedStateTitle: 'Alle Aenderungen gespeichert',
    savedStateMessage: 'Kein offener Patch im Formular.',
    dirtyStateTitle: 'Ungespeicherte Aenderungen',
    dirtyStateMessage: 'Pruefe die Sektionen und speichere den allgemeinen Anime-Kontext.',
    onSubmit: vi.fn(),
    ...overrides,
  }
}

function Harness({ context }: { context: AnimeEditorContext }) {
  const editor = useAnimeEditor(context, createControllerInput({ isDirty: context === 'edit' }))

  return (
    <AnimeEditorShell editor={editor} title={context === 'edit' ? 'Edit' : 'Create'}>
      <section data-context={context}>context</section>
    </AnimeEditorShell>
  )
}

describe('AnimeEditorShell', () => {
  it('renders edit and create contexts through the same shell and save-bar contract', () => {
    const editMarkup = renderToStaticMarkup(<Harness context="edit" />)
    const createMarkup = renderToStaticMarkup(<Harness context="create" />)

    expect(editMarkup).toContain('Ungespeicherte Aenderungen')
    expect(editMarkup).toContain('Aenderungen speichern')
    expect(editMarkup).toContain('data-context="edit"')

    expect(createMarkup).toContain('Alle Aenderungen gespeichert')
    expect(createMarkup).toContain('Aenderungen speichern')
    expect(createMarkup).toContain('data-context="create"')
  })
})
