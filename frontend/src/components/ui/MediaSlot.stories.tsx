import { useEffect, useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { Badge } from './Badge'
import { Button } from './Button'
import { MediaSlot } from './MediaSlot'
import type { MediaSlotMedia } from './MediaSlot'

/** Erzeugt und räumt eine Objekt-URL für eine lokal ausgewählte Datei auf -- echte Browser-API
 *  statt eines Mocks, damit "Datei auswählen" in den Storys tatsächlich eine neue Vorschau zeigt.
 *  `useMemo` berechnet die URL direkt beim Rendern (identisches Muster wie UploadFileRow.tsx'
 *  `FilePreview`), der Effekt dient ausschließlich dem Aufräumen der vorherigen URL. */
function useObjectUrl(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

/** Einzel-Bild/-Video-Upload-Slot: zeigt nie eine zweite, große Dropzone neben einer
 * vorhandenen Vorschau (replace-overlay statt empty-dropzone, siehe resolveUploadSlotPresentation). */
const meta = {
  title: 'Zusammengesetzte Bausteine/MediaSlot',
  component: MediaSlot,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Besteht aus: ${storybookDocsLink('Grundbausteine/MediaFrame', 'MediaFrame')}, ${storybookDocsLink('Zusammengesetzte Bausteine/UploadDropzone', 'UploadDropzone')}, ${storybookDocsLink('Grundbausteine/ResponsiveImage', 'ResponsiveImage')}.`,
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

function LeerDropzoneDemo() {
  const [file, setFile] = useState<File | null>(null)
  const url = useObjectUrl(file)
  const media: MediaSlotMedia | null = url ? { kind: 'image', src: url, alt: 'Ausgewähltes Logo' } : null

  return (
    <MediaSlot
      aspectRatio={1}
      label="Logo"
      hasValue={Boolean(url)}
      onFilesSelected={(files) => setFile(files[0] ?? null)}
      media={media}
    />
  )
}

export const LeerDropzone: Story = {
  name: 'Leer (Dropzone)',
  // render() ignoriert args und baut seinen eigenen Datei-Auswahl-Zustand -- Platzhalter-args nur,
  // weil Storybooks Typen ein vollständiges args-Objekt verlangen.
  args: { hasValue: false },
  render: () => <LeerDropzoneDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Eine echte Bilddatei auswählen (Klick oder Drop) -- die Fläche zeigt danach sofort die ausgewählte Datei als Vorschau.',
      },
    },
  },
}

function ReplaceOverlayDemo() {
  const [file, setFile] = useState<File | null>(null)
  const url = useObjectUrl(file)

  return (
    <MediaSlot
      aspectRatio={1}
      label="Logo"
      hasValue
      onFilesSelected={(files) => setFile(files[0] ?? null)}
      media={{ kind: 'image', src: url ?? '/covers/placeholder.jpg', alt: 'Logo Vorschau' }}
    />
  )
}

export const ReplaceOverlay: Story = {
  name: 'Ersetzen-Überlagerung',
  args: { hasValue: true },
  render: () => <ReplaceOverlayDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Startet mit einer vorhandenen Vorschau. Eine neue Datei auswählen oder darüber ziehen ersetzt sie sichtbar -- die bestehende Vorschau selbst ist die Drop-Fläche, keine zweite Dropzone daneben.',
      },
    },
  },
}

function RundDemo() {
  const [file, setFile] = useState<File | null>(null)
  const url = useObjectUrl(file)
  const media: MediaSlotMedia | null = url ? { kind: 'image', src: url, alt: 'Ausgewählter Avatar' } : null

  return (
    <div style={{ width: 160 }}>
      <MediaSlot
        aspectRatio={1}
        shape="round"
        label="Avatar"
        hasValue={Boolean(url)}
        onFilesSelected={(files) => setFile(files[0] ?? null)}
        media={media}
      />
    </div>
  )
}

export const Rund: Story = {
  name: 'Rund',
  args: { hasValue: false },
  render: () => <RundDemo />,
  parameters: {
    docs: {
      description: {
        story: 'shape="round" -- Form kommt von UploadDropzones aspectRatio-Option (MediaFrame), nicht von einem eigenen Radius-Override.',
      },
    },
  },
}

function AktionszeileDemo() {
  const [url, setUrl] = useState<string | null>('/covers/placeholder.jpg')

  return (
    <MediaSlot
      aspectRatio={1}
      label="Logo"
      hasValue={Boolean(url)}
      onFilesSelected={(files) => {
        const file = files[0]
        if (file) setUrl(URL.createObjectURL(file))
      }}
      media={url ? { kind: 'image', src: url, alt: 'Logo Vorschau' } : null}
      actions={(
        <Button type="button" variant="danger" size="sm" onClick={() => setUrl(null)} disabled={!url}>
          Entfernen
        </Button>
      )}
    />
  )
}

export const Aktionszeile: Story = {
  name: 'Aktionszeile',
  args: { hasValue: true },
  render: () => <AktionszeileDemo />,
  parameters: {
    docs: {
      description: {
        story: '"Entfernen" klicken leert den Slot wirklich (echter lokaler Zustand) -- die Aktionszeile steht als eigene Zeile unter der Fläche, nie von einer runden/eckigen Vorschau überlagert.',
      },
    },
  },
}

export const Eckmarke: Story = {
  name: 'Eckmarke',
  args: {
    hasValue: true,
    media: { kind: 'image', src: '/covers/placeholder.jpg', alt: 'Cover Vorschau' },
    cornerBadge: <Badge variant="info">Jellyfin</Badge>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Kleine Markenüberlagerung in der Ecke der Fläche (z. B. eine Herkunfts-Kennzeichnung) -- kommt von UploadDropzones/MediaFrames offizieller cornerBadge-Option.',
      },
    },
  },
}

export const StatischOhneUpload: Story = {
  name: 'Statische Vorschau ohne Upload',
  args: {
    aspectRatio: 16 / 9,
    label: 'Hintergrund',
    hasValue: true,
    media: { kind: 'image', src: '/covers/placeholder.jpg', alt: 'Hintergrund Vorschau', objectFit: 'contain' },
    actions: <Button type="button" variant="secondary" size="sm">Entfernen</Button>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Ohne onFilesSelected: eine reine, nicht-interaktive Vorschaufläche -- keine UploadDropzone, kein Klick-/Drop-zum-Ersetzen (z. B. ein bestehender Eintrag einer Hintergrund-Liste, der nur gelöscht werden kann).',
      },
    },
  },
}

export const Video: Story = {
  name: 'Video',
  args: {
    aspectRatio: 16 / 9,
    label: 'Hintergrundvideo',
    hasValue: true,
    // Kein abspielbares lokales Beispielvideo verfügbar (keine Video-Encoding-Werkzeuge in dieser
    // Umgebung) -- demonstriert media.kind="video" strukturell (eigenes <video>-Element statt
    // eines vom Aufrufer gebauten), nicht die tatsächliche Wiedergabe.
    media: { kind: 'video', src: '/covers/placeholder-video.mp4' },
  },
  parameters: {
    docs: {
      description: {
        story: 'media.kind="video" rendert ein eigenes <video>-Element (stumm, playsInline) statt eines vom Aufrufer gebauten -- kein lokales Beispielvideo vorhanden, daher ohne tatsächlich abspielbare Quelle.',
      },
    },
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

export const MitHinweis: Story = {
  name: 'Mit Hinweis',
  args: {
    hasValue: false,
    onFilesSelected: () => {},
    hint: 'JPG oder PNG, max. 4 MB.',
  },
}

export const MitFehler: Story = {
  name: 'Mit Fehler',
  args: {
    hasValue: false,
    onFilesSelected: () => {},
    error: 'Die Datei ist zu groß (max. 4 MB).',
  },
}
