import type { Meta, StoryObj } from '@storybook/nextjs'

import { MetricList } from './MetricList'

/** Liste von Kennzahlen (Bezeichnung + Wert) für Hero-Flächen und Statistik-Abschnitte. */
const meta = {
  title: 'Zusammengesetzte Bausteine/MetricList',
  component: MetricList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Text, Heading (Hero-Titel), Button (nur bei klickbaren Kennzahlen).',
      },
    },
  },
  args: {
    ariaLabel: 'Beispiel-Kennzahlen',
    valueHeadingLevel: 2,
    items: [
      { label: 'Anime-Projekte', value: 20 },
      { label: 'Release-Versionen', value: 59 },
      { label: 'Mitglieder', value: 4 },
    ],
  },
} satisfies Meta<typeof MetricList>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Inline: Story = {
  args: { variant: 'inline' },
}

export const KlickbareKennzahl: Story = {
  name: 'Klickbare Kennzahl',
  args: {
    items: [
      { label: 'Anime-Projekte', value: 20 },
      { label: 'Mitglieder', value: 4, onActivate: () => window.alert('Zu Mitglieder gesprungen'), activateLabel: 'Zu Mitglieder springen' },
    ],
  },
}

export const KlickbareKennzahlInline: Story = {
  name: 'Klickbare Kennzahl (Inline)',
  args: {
    variant: 'inline',
    items: [
      { label: 'Folgen', value: 13 },
      { label: 'Beiträge', value: 12, onActivate: () => window.alert('Zu Beiträge gesprungen'), activateLabel: 'Zu Beiträge springen' },
    ],
  },
}
