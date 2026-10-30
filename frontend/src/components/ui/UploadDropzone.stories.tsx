import type { Meta, StoryObj } from '@storybook/nextjs'

import { UploadDropzone } from './UploadDropzone'

/**
 * Datei-Auswahl-/Drop-Fläche. Der tatsächliche `isDragActive`-Zustand entsteht nur über
 * echte Drag&Drop-Events im Browser (kein Prop zum statischen Erzwingen) — die Story zeigt
 * daher den Standard- statt eines künstlich erzwungenen Drag-Zustands; live im Canvas eine
 * Datei über die Fläche ziehen, um den Drag-Zustand zu sehen.
 */
const meta = {
  title: 'Zusammengesetzte Bausteine/UploadDropzone',
  component: UploadDropzone,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Button, Input.',
      },
    },
  },
  args: {
    onFilesSelected: () => {},
  },
} satisfies Meta<typeof UploadDropzone>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}

export const Disabled: Story = {
  name: 'Deaktiviert',
  args: { disabled: true },
}

export const DragAktiv: Story = {
  name: 'Drag aktiv',
  args: { dropHintLabel: 'Datei hier loslassen' },
  parameters: {
    docs: {
      description: {
        story:
          'Der Drag-Zustand (`isDragActive`) ist interner State der Komponente und lässt sich nicht per Prop statisch erzwingen — im Canvas eine Datei über die Fläche ziehen, um den optischen Drag-Zustand live zu sehen.',
      },
    },
  },
}

export const Rund: Story = {
  name: 'Rund',
  args: { shape: 'round' },
  parameters: {
    docs: {
      description: {
        story:
          'Offizielle Form-Option für runde Flächen (z. B. ein Avatar-Slot) -- der gestrichelte Leer-Zustand folgt der Rundung, ohne dass ein Aufrufer die Radius-Regel von außen überschreiben muss.',
      },
    },
  },
}
