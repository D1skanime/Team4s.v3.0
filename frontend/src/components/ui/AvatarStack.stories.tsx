import type { Meta, StoryObj } from '@storybook/nextjs'

import { AvatarStack } from './AvatarStack'

/** Überlappende Identitäten mit `+N`-Overflow, optional als zugänglicher Button. */
const meta = {
  title: 'Zusammengesetzte Bausteine/AvatarStack',
  component: AvatarStack,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: IconButton (Überlauf-Auslöser, wenn onOverflowClick gesetzt ist).',
      },
    },
  },
} satisfies Meta<typeof AvatarStack>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {
  args: {
    items: [
      { id: 1, label: 'Cookie' },
      { id: 2, label: 'Mira' },
      { id: 3, label: 'Oldtimer' },
    ],
  },
}

export const MitOverflow: Story = {
  name: 'Mit Überlauf',
  args: {
    items: [
      { id: 1, label: 'C-Subs' },
      { id: 2, label: 'Honto' },
      { id: 3, label: 'Anime no Fansub' },
      { id: 4, label: 'Fansub 4' },
      { id: 5, label: 'Fansub 5' },
      { id: 6, label: 'Fansub 6' },
    ],
    maxVisible: 3,
  },
}

export const AlsButton: Story = {
  name: 'Als interaktiver Button',
  args: {
    items: [
      { id: 1, label: 'C-Subs' },
      { id: 2, label: 'Honto' },
      { id: 3, label: 'Anime no Fansub' },
      { id: 4, label: 'Fansub 4' },
      { id: 5, label: 'Fansub 5' },
    ],
    maxVisible: 3,
    onOverflowClick: () => {},
    overflowAriaLabel: '2 weitere Gruppen anzeigen',
  },
}
