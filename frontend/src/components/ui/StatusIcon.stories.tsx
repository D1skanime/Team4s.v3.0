import type { Meta, StoryObj } from '@storybook/nextjs'
import { Ban, CircleCheck, Info, TriangleAlert } from 'lucide-react'

import { StatusIcon } from './StatusIcon'

/**
 * Grundbaustein für tonale Icon-Kreise (neutral/info/success/warning/danger). Promotion der
 * vormals nur in `EmptyState`/`ErrorState`/`LoadingState` verfügbaren `.stateIcon`-Tönungen aus
 * `ui.module.css` zu einem eigenständigen Baustein.
 */
const meta = {
  title: 'Grundbausteine/StatusIcon',
  component: StatusIcon,
  tags: ['autodocs'],
} satisfies Meta<typeof StatusIcon>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {
  args: { tone: 'neutral', icon: <Info size={18} strokeWidth={2} /> },
}

export const InfoTon: Story = {
  name: 'Info',
  args: { tone: 'info', icon: <Info size={18} strokeWidth={2} /> },
}

export const Success: Story = {
  args: { tone: 'success', icon: <CircleCheck size={18} strokeWidth={2} /> },
}

export const Warning: Story = {
  args: { tone: 'warning', icon: <TriangleAlert size={18} strokeWidth={2} /> },
}

export const Danger: Story = {
  args: { tone: 'danger', icon: <Ban size={18} strokeWidth={2} /> },
}

const TONE_ICONS = [
  { tone: 'neutral' as const, icon: <Info size={18} strokeWidth={2} /> },
  { tone: 'info' as const, icon: <Info size={18} strokeWidth={2} /> },
  { tone: 'success' as const, icon: <CircleCheck size={18} strokeWidth={2} /> },
  { tone: 'warning' as const, icon: <TriangleAlert size={18} strokeWidth={2} /> },
  { tone: 'danger' as const, icon: <Ban size={18} strokeWidth={2} /> },
]

export const GroessenUndVarianten: Story = {
  name: 'Größen und Varianten',
  args: { icon: <Info size={18} strokeWidth={2} /> },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
      {TONE_ICONS.map(({ tone, icon }) => (
        <div key={tone} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <StatusIcon tone={tone} icon={icon} />
          <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{tone}</span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alle Tonalitäten auf einen Blick vergleichen.' },
    },
  },
}
