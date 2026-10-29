import type { Meta, StoryObj } from '@storybook/nextjs'
import { X } from 'lucide-react'

import { IconButton } from './IconButton'

/**
 * Grundbaustein für Icon-only-Buttons mit erzwungenem `aria-label`. Konsolidiert die vormals
 * zufällig identischen `.closeButton`/`.closeButtonFloating`-Rezepte aus Modal/`ui.module.css`
 * in ein einziges, wiederverwendbares Rezept.
 */
const meta = {
  title: 'Grundbausteine/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    icon: <X size={18} />,
    'aria-label': 'Schließen',
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Floating: Story = {
  args: { variant: 'floating' },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: 160, height: 120, border: '1px dashed var(--border-subtle)' }}>
        <Story />
      </div>
    ),
  ],
}

export const Klein: Story = {
  name: 'Klein',
  args: { size: 'sm' },
}

export const Gross: Story = {
  name: 'Gross',
  args: { size: 'lg' },
}

export const Deaktiviert: Story = {
  name: 'Deaktiviert',
  args: { disabled: true },
}
