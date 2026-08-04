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
  MemberStorySection: ComponentType<{ storyHtml?: string | null; headingLevel?: 2 | 3; showEmptyState?: boolean }>
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

  it('keeps the paired story card visible with a scoped empty state', async () => {
    const { MemberStorySection } = await loadMemberStorySection()

    render(<MemberStorySection storyHtml="" headingLevel={3} showEmptyState />)

    expect(screen.getByRole('heading', { level: 3, name: 'Fansub-Geschichte' })).not.toBeNull()
    expect(screen.getByText('Noch keine Geschichte hinterlegt.')).not.toBeNull()
  })

  it('keeps h2 as the standalone default and exposes h3 for the profile pair', async () => {
    const { MemberStorySection } = await loadMemberStorySection()
    const { rerender } = render(<MemberStorySection storyHtml="<p>Geschichte.</p>" />)

    expect(screen.getByRole('heading', { level: 2, name: 'Fansub-Geschichte' })).toBeTruthy()
    rerender(<MemberStorySection storyHtml="<p>Geschichte.</p>" headingLevel={3} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Fansub-Geschichte' })).toBeTruthy()
  })

  it('renders short story HTML through RichTextRenderer without a read-more toggle', async () => {
    const { MemberStorySection } = await loadMemberStorySection()

    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(48)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(72)

    render(<MemberStorySection storyHtml="<p>Kurze Fansub-Geschichte.</p>" />)

    expect(screen.getByTestId('rich-text-renderer').textContent).toBe('<p>Kurze Fansub-Geschichte.</p>')
    expect(screen.queryByRole('button', { name: 'Mehr lesen' })).toBeNull()
  })

  it('demotes persisted story headings below the profile section hierarchy', async () => {
    const { MemberStorySection } = await loadMemberStorySection()

    render(<MemberStorySection storyHtml="<h1>Meine Geschichte</h1><h2>Früher</h2><h3>Heute</h3>" headingLevel={3} />)

    expect(screen.getByTestId('rich-text-renderer').textContent).toBe(
      '<h4>Meine Geschichte</h4><h4>Früher</h4><h4>Heute</h4>',
    )
  })

  it('shows Mehr lesen only after measured overflow and toggles both ways', async () => {
    const { MemberStorySection } = await loadMemberStorySection()

    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(160)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(72)

    render(<MemberStorySection storyHtml="<p>Eine lange Fansub-Geschichte mit vielen Details.</p>" />)

    const expandButton = await screen.findByRole('button', { name: 'Mehr lesen' })
    fireEvent.click(expandButton)

    const collapseButton = screen.getByRole('button', { name: 'Weniger anzeigen' })
    expect(collapseButton).not.toBeNull()
    expect(screen.getByTestId('rich-text-renderer').textContent).toContain('Eine lange Fansub-Geschichte')

    fireEvent.click(collapseButton)

    expect(screen.getByRole('button', { name: 'Mehr lesen' })).not.toBeNull()
  })
})
