import { useEffect, useState } from 'react'
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
        component: 'Besteht aus: Card, MediaFrame, ResponsiveImage, Heading, Text, ProgressBar, Badge, Button, FormField, Input, Textarea.',
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

export const Kompakt: Story = {
  name: 'Kompakt',
  args: { status: 'ready', density: 'compact' },
}

export const OhneTitelUndBeschreibung: Story = {
  name: 'Ohne Titel/Beschreibung',
  args: { status: 'ready', showMetadataFields: false },
}

function WechselnderFortschritt() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 100 ? 0 : current + 10))
    }, 400)
    return () => window.clearInterval(timer)
  }, [])

  return <UploadFileRow file={demoFile} status="uploading" progress={progress} showMetadataFields={false} />
}

export const WechselnderFortschrittStory: Story = {
  name: 'Wechselnder Fortschritt',
  args: { status: 'uploading' },
  render: () => <WechselnderFortschritt />,
}
