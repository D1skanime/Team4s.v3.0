import type { Meta, StoryObj } from '@storybook/nextjs'
import { MoreHorizontal } from 'lucide-react'

import { Button } from './Button'

/**
 * Referenz-Story fuer das Button-Primitive: deckt alle Varianten ab, die vormals in der
 * In-App-Showcase-Route sichtbar waren (Primary/Secondary/Ghost/Subtle/Danger/
 * Success/IconOnly/Loading/Disabled/Small/Large), ergaenzt um einen Lang-Text- und einen
 * Fokus-Pruefhinweis. Dient zugleich als frueher empirischer Beleg dafuer, dass CSS-Module
 * unter dem `@storybook/nextjs`-Webpack-Adapter ohne Zusatzkonfiguration greifen.
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Primary',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { children: 'Primary' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost' },
}

export const Subtle: Story = {
  args: { variant: 'subtle', children: 'Subtle' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Danger' },
}

export const Success: Story = {
  args: { variant: 'success', children: 'Save' },
}

export const IconOnly: Story = {
  args: {
    iconOnly: true,
    'aria-label': 'Mehr Optionen',
    children: <MoreHorizontal size={16} />,
  },
}

export const Loading: Story = {
  args: { loading: true, children: 'Lädt' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
}

export const Small: Story = {
  args: { size: 'sm', children: 'Small' },
}

export const Large: Story = {
  args: { size: 'lg', children: 'Large' },
}

export const LangerLabelText: Story = {
  name: 'LangerLabelText',
  args: {
    children: 'Dieser Button-Text ist absichtlich sehr lang, um Umbruch- und Overflow-Verhalten innerhalb der Button-Fläche zu prüfen',
  },
}

export const FokusSichtbar: Story = {
  name: 'FokusSichtbar',
  args: { children: 'Primary' },
  parameters: {
    docs: {
      description: {
        story:
          'Standard-Button zur Fokus-Prüfung: Tab-Taste drücken, um den sichtbaren Fokusring zu sehen. Das `addon-a11y`-Panel dieser Story zeigt zusätzlich automatisierte Kontrast-/Fokus-Hinweise.',
      },
    },
  },
}
