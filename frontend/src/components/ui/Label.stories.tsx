import type { Meta, StoryObj } from '@storybook/nextjs'

import { Label } from './Label'

/** Grundbaustein für Feldbeschriftungen mit optionaler Pflicht-Markierung. */
const meta = {
  title: 'Grundbausteine/Label',
  component: Label,
  tags: ['autodocs'],
  args: {
    htmlFor: 'demo-feld',
    children: 'Anzeigename',
  },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Pflichtfeld: Story = {
  name: 'Pflichtfeld',
  args: { required: true },
  parameters: {
    docs: {
      description: {
        story: 'Zeigt ein sichtbares, dekoratives Sternchen (aria-hidden) UND einen zusätzlichen, nur für Screenreader vorhandenen Text "(Pflichtfeld)" -- ein Screenreader hört dadurch den vollen Hinweis statt nur eines stummen Sternchens.',
      },
    },
  },
}

export const LangerText: Story = {
  name: 'Langer Beschriftungstext',
  args: {
    children: 'Dieser Beschriftungstext ist absichtlich lang, um das Umbruchverhalten innerhalb einer schmalen Formular-Spalte zu zeigen',
  },
}
