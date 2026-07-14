import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StorySection } from './StorySection'

describe('StorySection', () => {
  it('renders the locked Fansub project story title and sanitized rich text', () => {
    const html = renderToStaticMarkup(
      <StorySection
        story="Fallback wird nicht genutzt"
        projectNotesHtml="<p><strong>Projektstart</strong> mit eigener Fansub-Geschichte.</p>"
      />,
    )

    expect(html).toContain('Geschichte des Fansub-Projekts')
    expect(html).toContain('<strong>Projektstart</strong>')
    expect(html).not.toContain('Projektgeschichte')
    expect(html).not.toContain('Anime-Ausblicke')
  })

  it('renders exactly one story block and keeps a scoped empty state when no public story exists', () => {
    const html = renderToStaticMarkup(
      <StorySection
        story="Kurzer Projekttext"
        projectNotesHtml={null}
      />,
    )

    expect(html.match(/<article/g)).toHaveLength(1)
    const emptyHtml = renderToStaticMarkup(<StorySection story="" projectNotesHtml="" />)
    expect(emptyHtml).toContain('Geschichte des Fansub-Projekts')
    expect(emptyHtml).toContain('Noch kein öffentlicher Projekttext hinterlegt.')
    expect(emptyHtml).not.toContain('Weitere Bereiche sind noch nicht')
  })

  it('uses the locked collapse labels for long project text', () => {
    const longText = 'Projektabschnitt '.repeat(80)
    const html = renderToStaticMarkup(<StorySection story={longText} projectNotesHtml={null} />)

    expect(html).toContain('Alles anzeigen')
    expect(html).not.toContain('Mehr anzeigen')
  })
})
