import type { Meta, StoryObj } from '@storybook/nextjs'

import { UploadFileRow } from './UploadFileRow'

const demoFile = new File(['Team4s Storybook Demo-Inhalt'], 'release-screenshot.png', { type: 'image/png' })

/** Einzelne Datei-Zeile innerhalb einer Upload-Warteschlange, je Status ein eigener Zustand. */
const meta = {
  title: 'Zusammengesetzte Bausteine/UploadFileRow',
  component: UploadFileRow,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Badge, Button, FormField, Input, Textarea.',
      },
    },
  },
  args: {
    file: demoFile,
    title: '',
    caption: '',
    onChange: () => {},
  },
} satisfies Meta<typeof UploadFileRow>

export default meta
type Story = StoryObj<typeof meta>

export const Idle: Story = {
  name: 'Wartet',
  args: { status: 'idle' },
}

export const Uploading: Story = {
  name: 'Lädt hoch',
  args: { status: 'uploading', progress: 42 },
}

export const Processing: Story = {
  name: 'Wird verarbeitet',
  args: { status: 'processing' },
}

export const Ready: Story = {
  name: 'Hochgeladen',
  args: { status: 'ready' },
}

export const Failed: Story = {
  name: 'Fehlgeschlagen',
  args: { status: 'failed', errorMessage: 'Die Datei konnte nicht hochgeladen werden.', onRetry: () => {} },
}
