import type { Meta, StoryObj } from '@storybook/nextjs'

import { MediaSlot } from './MediaSlot'

/** Einzel-Bild/-Video-Upload-Slot: zeigt nie eine zweite, große Dropzone neben einer
 * vorhandenen Vorschau (replace-overlay statt empty-dropzone, siehe resolveUploadSlotPresentation). */
const meta = {
  title: 'Zusammengesetzte Bausteine/MediaSlot',
  component: MediaSlot,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: MediaFrame, UploadDropzone.',
      },
    },
  },
  args: {
    aspectRatio: 1,
    label: 'Logo',
  },
} satisfies Meta<typeof MediaSlot>

export default meta
type Story = StoryObj<typeof meta>

export const LeerDropzone: Story = {
  name: 'Leer (Dropzone)',
  args: {
    hasValue: false,
    onFilesSelected: () => {},
  },
}

export const ReplaceOverlay: Story = {
  name: 'Ersetzen-Overlay',
  args: {
    hasValue: true,
    onFilesSelected: () => {},
    previewContent: (
      // Lokales Platzhalterbild statt externer Bildquelle — keine Netzwerkabhängigkeit.
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/covers/placeholder.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ),
  },
}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: {
    hasValue: false,
    disabled: true,
    onFilesSelected: () => {},
  },
}
