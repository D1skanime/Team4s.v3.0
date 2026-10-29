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
