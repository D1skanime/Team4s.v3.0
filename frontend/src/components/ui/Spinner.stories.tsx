import type { Meta, StoryObj } from '@storybook/nextjs'

import { Spinner } from './Spinner'

/**
 * Grundbaustein für einen rotierenden Lade-Kreisel (sm/md/lg). Promotion der vormals doppelt
 * vorhandenen `ui-spin`-Logik aus `Button`s Lade-Zustand und `LoadingState`. Die Farbe folgt
 * `currentColor`, daher setzen die folgenden Stories jeweils eine eigene Textfarbe auf dem
 * Wrapper, sonst fällt der Ring auf das normale, kaum sichtbare Textschwarz.
 */
const meta = {
  title: 'Grundbausteine/Spinner',
  component: Spinner,
  tags: ['autodocs'],
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  render: () => (
    <span style={{ color: 'var(--accent-primary)' }}>
      <Spinner />
    </span>
  ),
}

export const Klein: Story = {
  name: 'Klein',
  render: () => (
    <span style={{ color: 'var(--accent-primary)' }}>
      <Spinner size="sm" />
    </span>
  ),
}

export const Gross: Story = {
  name: 'Gross',
  render: () => (
    <span style={{ color: 'var(--accent-primary)' }}>
      <Spinner size="lg" />
    </span>
  ),
}
