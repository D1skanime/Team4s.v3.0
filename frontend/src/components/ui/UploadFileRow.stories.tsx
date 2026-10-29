import type { Meta, StoryObj } from '@storybook/nextjs'

import { UploadFileRow } from './UploadFileRow'

const demoFile = new File(['Team4s Storybook Demo-Inhalt'], 'release-screenshot.png', { type: 'image/png' })

/** Einzelne Datei-Zeile innerhalb einer Upload-Warteschlange, je Status ein eigener Zustand. */
const meta = {
  title: 'UI/UploadFileRow',
  component: UploadFileRow,
  tags: ['autodocs'],
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
  args: { status: 'idle' },
}

export const Uploading: Story = {
  args: { status: 'uploading', progress: 42 },
}

export const Processing: Story = {
  args: { status: 'processing' },
}

export const Ready: Story = {
  args: { status: 'ready' },
}

export const Failed: Story = {
  args: { status: 'failed', errorMessage: 'Die Datei konnte nicht hochgeladen werden.', onRetry: () => {} },
}
