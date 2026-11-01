import { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { ResponsiveImage } from './ResponsiveImage'
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
        component: `Besteht aus: ${storybookDocsLink('Grundbausteine/Button', 'Button')}, ${storybookDocsLink('Grundbausteine/Input', 'Input')}, ${storybookDocsLink('Grundbausteine/StatusIcon', 'StatusIcon')}, ${storybookDocsLink('Grundbausteine/Heading', 'Heading')}, ${storybookDocsLink('Grundbausteine/Text', 'Text')}, ${storybookDocsLink('Grundbausteine/MediaFrame', 'MediaFrame')} (nur mit gesetztem aspectRatio).`,
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

export const Kompakt: Story = {
  name: 'Kompakt',
  args: { density: 'compact' },
  parameters: {
    docs: {
      description: {
        story: 'density="compact" reduziert nur den Innenabstand -- die Fläche bleibt inhaltsbestimmt hoch wie bei roomy.',
      },
    },
  },
}

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
  args: { shape: 'round', aspectRatio: 1 },
  parameters: {
    docs: {
      description: {
        story:
          'Offizielle Form-Option für runde Flächen (z. B. ein Avatar-Slot) -- der gestrichelte Leer-Zustand folgt der Rundung, ohne dass ein Aufrufer die Radius-Regel von außen überschreiben muss.',
      },
    },
  },
}

function ErsetzenMitVorschauDemo() {
  const [file, setFile] = useState<File | null>(null)
  const url = useMemo(() => (file ? URL.createObjectURL(file) : '/covers/placeholder.jpg'), [file])

  return (
    <div style={{ width: 220 }}>
      <UploadDropzone
        onFilesSelected={(files) => setFile(files[0] ?? null)}
        aspectRatio={1}
        promptLabel="Logo ersetzen"
        overlayHintLabel="Zum Ersetzen loslassen"
      >
        <ResponsiveImage src={url} alt="Logo Vorschau" fill sizes="220px" style={{ objectFit: 'cover' }} />
      </UploadDropzone>
    </div>
  )
}

export const ErsetzenMitVorschau: Story = {
  name: 'Ersetzen mit Vorschau',
  render: () => <ErsetzenMitVorschauDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Mit `children` wird eine bestehende Vorschau selbst zur Drop-Fläche (`aspectRatio`+`children` ist exakt das Muster, das MediaSlot intern nutzt) -- eine neue Datei auswählen oder darüber ziehen ersetzt die Vorschau sichtbar, keine zweite Dropzone daneben.',
      },
    },
  },
}

function SchmaleInlineFormDemo() {
  return (
    <div style={{ width: 320 }}>
      <UploadDropzone onFilesSelected={() => {}} aspectRatio={6} dropHintLabel="Oder klicken" />
    </div>
  )
}

export const SchmaleInlineForm: Story = {
  name: 'Schmale Inline-Form',
  render: () => <SchmaleInlineFormDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Unterhalb von 110px verfügbarer Höhe (hier durch ein sehr flaches aspectRatio erzwungen) wechselt die eigene @container-Regel unabhängig von der gewählten density auf eine einzelne, kompakte Zeile (nur Symbol + kurzer Hinweistext, kein separater Zusatzhinweis/Button) -- die ganze Fläche bleibt über ihre eigene role="button" klickbar.',
      },
    },
  },
}

export const MehrfachdateiWarnung: Story = {
  name: 'Mehrfachdatei-Warnung',
  args: { multiple: false },
  parameters: {
    docs: {
      description: {
        story:
          'Bei `multiple={false}` lässt die native Dateiauswahl nur eine Datei zu, ein Drop mit mehreren Dateien aber nicht -- im Canvas mehrere Dateien gleichzeitig auf die Fläche ziehen, um den Warnhinweis ("Nur die erste Datei wurde übernommen …") live zu sehen (per Prop nicht erzwingbar, da `showSingleSlotWarning` interner State ist, identisch zum Drag-Zustand oben).',
      },
    },
  },
}
