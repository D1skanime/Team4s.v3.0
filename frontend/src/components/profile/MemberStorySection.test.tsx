// @vitest-environment jsdom

import type { ComponentType } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/editor', () => ({
  RichTextRenderer: ({ bodyHtml }: { bodyHtml?: string | null }) => (
    <div data-testid="rich-text-renderer">{bodyHtml}</div>
  ),
}))

async function loadMemberStorySection(): Promise<{
  MemberStorySection: ComponentType<{ storyHtml?: string | null }>
}> {
  try {
    const modulePath = './MemberStorySection'
    return await import(/* @vite-ignore */ modulePath)
  } catch (error) {
    throw new Error(`MemberStorySection must exist for the Phase 99 story clamp behavior: ${String(error)}`)
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('MemberStorySection', () => {
  it('renders no section for empty or blank story HTML', async () => {
    const { MemberStorySection } = await loadMemberStorySection()

    const { container } = render(<MemberStorySection storyHtml="   " />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('Noch keine Geschichte hinterlegt.')).toBeNull()
  })

  it('renders short story HTML through RichTextRenderer without a read-more toggle', async () => {
    const { MemberStorySection } = await loadMemberStorySection()

    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(48)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(72)

    render(<MemberStorySection storyHtml="<p>Kurze Fansub-Geschichte.</p>" />)

    expect(screen.getByTestId('rich-text-renderer').textContent).toBe('<p>Kurze Fansub-Geschichte.</p>')
    expect(screen.queryByRole('button', { name: 'Mehr lesen' })).toBeNull()
  })

  it('shows Mehr lesen only after measured overflow and toggles to Weniger anzeigen', async () => {
    const { MemberStorySection } = await loadMemberStorySection()

    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(160)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(72)

    render(<MemberStorySection storyHtml="<p>Eine lange Fansub-Geschichte mit vielen Details.</p>" />)

    const expandButton = await screen.findByRole('button', { name: 'Mehr lesen' })
    fireEvent.click(expandButton)

    expect(screen.getByRole('button', { name: 'Weniger anzeigen' })).not.toBeNull()
    expect(screen.getByTestId('rich-text-renderer').textContent).toContain('Eine lange Fansub-Geschichte')
  })
})
