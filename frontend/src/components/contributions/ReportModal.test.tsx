import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ReportModal, type SuggestionType } from './ReportModal'
import type { ReportTargetOption } from './reportTargets'

const TARGET_OPTIONS: ReportTargetOption[] = [
  { type: 'anime', id: 3, label: 'Naruto' },
  { type: 'fansub_group', id: 88, label: 'AnimeOwnage' },
  {
    type: 'contribution',
    id: 41,
    label: 'Naruto · AnimeOwnage · Übersetzung',
    description: 'Hinweis #41',
  },
]

function renderModal(prefillType: SuggestionType, targetOptions = TARGET_OPTIONS) {
  return renderToStaticMarkup(
    <ReportModal
      open
      onClose={vi.fn()}
      onSuccess={vi.fn()}
      prefillType={prefillType}
      targetOptions={targetOptions}
    />,
  )
}

describe('ReportModal target context', () => {
  it('does not expose Claim as a peer option in the contributions modal', () => {
    const markup = renderToStaticMarkup(
      <ReportModal
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        targetOptions={TARGET_OPTIONS}
      />,
    )

    expect(markup).toContain('Ich war in einem Projekt dabei')
    expect(markup).not.toContain('Profil beanspruchen')
    expect(markup).not.toContain('/me/claim')
  })

  it('shows loaded anime targets in the story form', () => {
    const markup = renderModal('story')

    expect(markup).toContain('report-form-story')
    expect(markup).toContain('Naruto')
    expect(markup).toContain('value="3"')
  })

  it('shows loaded anime targets in the media form', () => {
    const markup = renderModal('medien')

    expect(markup).toContain('report-form-media')
    expect(markup).toContain('Naruto')
    expect(markup).toContain('value="3"')
  })

  it('keeps a prefilled contribution target selectable in the error form', () => {
    const markup = renderToStaticMarkup(
      <ReportModal
        open
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        prefillType="fehler"
        prefillContributionId={77}
        targetOptions={[]}
      />,
    )

    expect(markup).toContain('Hinweis #77')
    expect(markup).toContain('value="77"')
  })

  it('falls back to a numeric target input when no known targets exist', () => {
    const markup = renderModal('story', [])

    expect(markup).toContain('type="number"')
    expect(markup).toContain('Ziel-ID manuell eingeben')
  })
})
