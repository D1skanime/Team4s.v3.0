import type { Meta, StoryObj } from '@storybook/nextjs'

import { Tabs } from './Tabs'

/** Tab-Primitive mit Reitern, optionalen Badges und ARIA-Tablist-Semantik. */
const meta = {
  title: 'Grundbausteine/Tabs',
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    items: [
      { id: 'summary', label: 'Übersicht', badge: 3, content: <p>Mock-Zusammenfassung ohne API-Seam.</p> },
      { id: 'assets', label: 'Assets', badge: 12, content: <p>Spätere Domain-Komponenten dürfen diese Tab-Hülle konsumieren.</p> },
      { id: 'history', label: 'Historie', content: <p>Read-only Kontext kann generische Tabs wiederverwenden.</p> },
    ],
  },
}

export const LangerTabLabel: Story = {
  name: 'Langes Tab-Label',
  args: {
    items: [
      { id: 'summary', label: 'Übersicht', content: <p>Standard-Tab.</p> },
      {
        id: 'assets',
        label: 'Ein außergewöhnlich langes Tab-Label, das Umbruch und Overflow in der Tableiste prüft',
        content: <p>Prüft Umbruch/Overflow eines sehr langen Tab-Labels.</p>,
      },
    ],
  },
}

export const FokusWechsel: Story = {
  name: 'Fokus-Wechsel',
  args: {
    items: [
      { id: 'summary', label: 'Übersicht', content: <p>Mit Tab/Pfeiltasten zwischen den Reitern wechseln.</p> },
      { id: 'assets', label: 'Assets', content: <p>Der Fokusring folgt dem aktiven Tab-Button.</p> },
      { id: 'history', label: 'Historie', content: <p>Das addon-a11y-Panel dieser Story prüft Fokus-/Kontrast-Hinweise.</p> },
    ],
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tastatur-Fokuswechsel zwischen den Tabs per Tab-Taste; das addon-a11y-Panel dieser Story zeigt automatisierte Fokus-/Kontrast-Hinweise.',
      },
    },
  },
}
