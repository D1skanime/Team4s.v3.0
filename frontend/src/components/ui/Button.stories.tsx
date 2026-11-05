import type { Meta, StoryObj } from '@storybook/nextjs'
import { Download, ExternalLink, Save, Users } from 'lucide-react'

import { Button } from './Button'

/**
 * Klickbarer Knopf für Aktionen in Formularen, Dialogen und Listen, mit mehreren Farbtönen,
 * drei Größen und einem Lade-/Deaktiviert-Zustand. Bricht seinen Text nie um.
 */
const meta = {
  title: 'Grundbausteine/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Primär',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primaer: Story = {
  name: 'Primär',
  args: { children: 'Primär' },
}

export const Sekundaer: Story = {
  name: 'Sekundär',
  args: { variant: 'secondary', children: 'Sekundär' },
}

export const Dezent: Story = {
  name: 'Dezent',
  args: { variant: 'ghost', children: 'Dezent' },
}

export const Zurueckhaltend: Story = {
  name: 'Zurückhaltend',
  args: { variant: 'subtle', children: 'Zurückhaltend' },
}

export const Gefahr: Story = {
  name: 'Gefahr',
  args: { variant: 'danger', children: 'Gefahr' },
}

export const Erfolg: Story = {
  name: 'Erfolg',
  args: { variant: 'success', children: 'Speichern' },
}

export const Merkliste: Story = {
  name: 'Merkliste',
  args: { variant: 'watchlist', children: 'Zur Merkliste' },
}

export const InMerkliste: Story = {
  name: 'In Merkliste',
  args: { variant: 'watchlistActive', children: 'In Merkliste' },
}

export const GlasChip: Story = {
  name: 'Glas-Umschalt-Chip',
  render: () => (
    <div style={{ display: 'flex', gap: 12, padding: 20, background: 'var(--surface-stage)' }}>
      <Button variant="chipGlass" size="sm">Alle</Button>
      <Button variant="chipGlass" size="sm" aria-pressed="true">LazySubs</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Durchscheinender Umschalt-Chip für dunkle Glasflächen (z. B. ein Fansub-Gruppen-Filter über der Episodenliste) -- reagiert wie jeder Button auf aria-pressed, hier mit einer eigenen, hellen Formel statt der Standard-Aktiv-Farbe.',
      },
    },
  },
}

export const GlasChipMitIcon: Story = {
  name: 'Glas-Umschalt-Chip mit Icon',
  render: () => (
    <div style={{ display: 'flex', gap: 12, padding: 20, background: 'var(--surface-stage)' }}>
      <Button variant="chipGlass" size="sm" leftIcon={<Users size={14} aria-hidden="true" />}>LazySubs</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Zeigt den engeren Icon-/Beschriftungsabstand, den chipGlass gegenüber der 10px-Standardlücke braucht, wenn ein kleines Logo/Icon über leftIcon statt als manuelles Kind-Element übergeben wird.',
      },
    },
  },
}

export const Warnung: Story = {
  name: 'Warnung',
  args: { variant: 'warning', children: 'Warnung' },
}

export const Hinweis: Story = {
  name: 'Hinweis',
  args: { variant: 'info', children: 'Hinweis' },
}

export const MitLinkemIcon: Story = {
  name: 'Mit linkem Icon',
  args: { leftIcon: <Save size={16} aria-hidden="true" />, children: 'Speichern' },
  parameters: {
    docs: {
      description: { story: 'Icon-only-Fälle (kein sichtbarer Text) laufen ausschließlich über IconButton -- leftIcon/rightIcon sind für Button-Aufrufe mit sichtbarem Text gedacht.' },
    },
  },
}

export const MitRechtemIcon: Story = {
  name: 'Mit rechtem Icon',
  args: { rightIcon: <Download size={16} aria-hidden="true" />, children: 'Herunterladen' },
}

export const AlsLink: Story = {
  name: 'Als Link',
  args: { href: '/anime', variant: 'secondary', rightIcon: <ExternalLink size={14} aria-hidden="true" /> },
  render: (args) => <Button {...args}>Zum Katalog</Button>,
  parameters: {
    docs: {
      description: { story: 'Rendert ein `<a>` statt eines `<button>`, wenn `href` gesetzt ist -- gleiche Optik/Props wie der native Button, inklusive deaktiviertem Zustand über aria-disabled statt dem href-Entfernen.' },
    },
  },
}

export const AlsText: Story = {
  name: 'Als Text',
  args: { variant: 'text', children: 'Mehr erfahren' },
  parameters: {
    docs: {
      description: { story: 'Fließtext-artiger Link innerhalb von Absätzen/Listen -- erbt Größe/Gewicht vom umgebenden Kontext, zeigt aber dauerhaft eine Unterstreichung als Klickbarkeits-Hinweis.' },
    },
  },
}

export const Schwebend: Story = {
  name: 'Schwebend',
  args: { variant: 'floating', children: 'Schließen' },
  parameters: {
    docs: {
      description: { story: 'Dezente, kartenfarbene Fläche für einen Button direkt über einem Bild/Viewer-Hintergrund.' },
    },
  },
}

export const Laedt: Story = {
  name: 'Lädt',
  args: { loading: true, children: 'Lädt' },
}

export const Deaktiviert: Story = {
  name: 'Deaktiviert',
  args: { disabled: true, children: 'Deaktiviert' },
}

export const Klein: Story = {
  name: 'Klein',
  args: { size: 'sm', children: 'Klein' },
}

export const Gross: Story = {
  name: 'Groß',
  args: { size: 'lg', children: 'Groß' },
}

export const HeroZahl: Story = {
  name: 'Hero-Zahl',
  args: { variant: 'text', size: 'hero', tone: 'accent', children: '1.284' },
  parameters: {
    docs: {
      description: {
        story: 'Größe/Gewicht wie Heading size="hero", Farbe wie Heading tone="accent" -- für eine klickbare, hervorgehobene Kennzahl (siehe MetricList), da ein Heading nicht gültig in einen Button verschachtelt werden darf.',
      },
    },
  },
}

export const FliesstextWert: Story = {
  name: 'Fließtext-Wert',
  args: { variant: 'text', size: 'prose', tone: 'strong', children: '13 Folgen' },
  parameters: {
    docs: {
      description: {
        story: 'Größe wie Text variant="body" (1rem), Farbe/Gewicht wie kräftiger Fließtext -- für eine klickbare Kennzahl innerhalb einer kompakten, inline-Liste.',
      },
    },
  },
}

export const LangerText: Story = {
  name: 'Langer Text',
  args: {
    children: 'Dieser Button-Text ist absichtlich sehr lang und bricht trotzdem nicht um',
  },
}

export const FokusSichtbar: Story = {
  name: 'Fokus sichtbar',
  args: { children: 'Primär' },
  parameters: {
    docs: {
      description: {
        story: 'Tab-Taste drücken, um den sichtbaren Fokusring zu sehen.',
      },
    },
  },
}

export const AktuellAusgewaehlt: Story = {
  name: 'Aktuell/ausgewählt',
  args: { variant: 'secondary', 'aria-current': 'page', children: 'Seite 2' },
  parameters: {
    docs: {
      description: {
        story: 'Markiert einen Button als aktuell aktive Auswahl (z. B. die aktuelle Seite einer Seitennavigation oder einen aktiven Filter) — über die Standard-Attribute aria-current oder aria-pressed, ohne eigene Prop.',
      },
    },
  },
}

const VARIANTS = ['primary', 'secondary', 'ghost', 'subtle', 'danger', 'success', 'warning', 'info', 'text', 'floating', 'watchlist', 'watchlistActive', 'chipGlass'] as const
const VARIANT_LABELS: Record<(typeof VARIANTS)[number], string> = {
  primary: 'Primär',
  secondary: 'Sekundär',
  ghost: 'Dezent',
  subtle: 'Zurückhaltend',
  danger: 'Gefahr',
  success: 'Erfolg',
  warning: 'Warnung',
  info: 'Hinweis',
  text: 'Text',
  floating: 'Schwebend',
  watchlist: 'Merkliste',
  watchlistActive: 'In Merkliste',
  chipGlass: 'Glas-Chip',
}
const SIZES = ['sm', 'md', 'lg'] as const

export const GroessenUndVarianten: Story = {
  name: 'Größen und Varianten',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {VARIANTS.flatMap((variant) =>
        SIZES.map((size) => (
          <Button key={`${variant}-${size}`} variant={variant} size={size}>
            {VARIANT_LABELS[variant]} / {size}
          </Button>
        )),
      )}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Alle Varianten-/Größen-Kombinationen auf einen Blick vergleichen.' },
    },
  },
}
