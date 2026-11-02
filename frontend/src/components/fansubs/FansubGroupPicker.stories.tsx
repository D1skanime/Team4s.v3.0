import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'

import { FansubGroupPicker, type FansubGroupPickerProps } from './FansubGroupPicker'

function FansubGroupPickerDemo(props: Omit<FansubGroupPickerProps, 'activeGroupId' | 'onSelect'>) {
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null)
  return <FansubGroupPicker {...props} activeGroupId={activeGroupId} onSelect={setActiveGroupId} />
}

const meta = {
  title: 'Zusammengesetzte Bausteine/Fansubgruppen-Auswahl',
  component: FansubGroupPickerDemo,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Interaktive Auswahl für die beteiligten Fansub-Gruppen. Die Story zeigt Gruppen mit und ohne Logo und hält den gewählten Zustand sichtbar.' } } },
  args: {
    showAllChip: true,
    options: [
      { id: 101, slug: 'bloody-shadow', name: 'Bloody-Shadow', logo_url: '/covers/placeholder.jpg' },
      { id: 102, slug: 'lazy-subs', name: 'LazySubs', logo_url: null },
      { id: 103, slug: 'melon-subs', name: 'MelonSubs', logo_url: '/covers/placeholder.jpg' },
    ],
  },
} satisfies Meta<typeof FansubGroupPickerDemo>

export default meta
type Story = StoryObj<typeof meta>

export const MehrereGruppen: Story = { name: 'Mehrere Gruppen' }
