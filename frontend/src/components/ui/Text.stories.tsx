import type { Meta, StoryObj } from '@storybook/nextjs'

import { Text } from './Text'

/** Typografie-Grundbaustein für Fließ-/Metatext mit vier Tonalitätsstufen. */
const meta = {
  title: 'Grundbausteine/Text',
  component: Text,
  tags: ['autodocs'],
} satisfies Meta<typeof Text>

export default meta
type Story = StoryObj<typeof meta>

export const Body: Story = {
  name: 'Fließtext',
  args: { variant: 'body', children: 'Normaler Fließtext für Beschreibungen und Inhalte.' },
}

export const Soft: Story = {
  name: 'Gedämpft',
  args: { variant: 'soft', children: 'Leiser getönter Text, etwa für Sektions-Unterzeilen.' },
}

export const MetaVariant: Story = {
  name: 'Meta-Text',
  args: { variant: 'meta', children: 'Kompakter Metatext, etwa für Seiten-Unterzeilen.' },
}

export const Small: Story = {
  name: 'Klein',
  args: { variant: 'small', children: 'Kleiner, zurückhaltender Hinweistext.' },
}

export const Eyebrow: Story = {
  name: 'Überzeile',
  args: { variant: 'eyebrow', children: 'Fansub-Gruppe' },
}

export const InlineAusgabe: Story = {
  name: 'Inline-Ausgabe (as="span")',
  render: () => (
    <dl style={{ display: 'flex', gap: 16, margin: 0 }}>
      <div>
        <dt><Text as="span" variant="small">Folgen</Text></dt>
        <dd style={{ margin: 0 }}><Text as="span" variant="body">13</Text></dd>
      </div>
    </dl>
  ),
  parameters: {
    docs: {
      description: {
        story: 'as="span" rendert ein echtes <span> statt eines <p> -- für Kontexte wie <dt>/<dd> (siehe MetricList), die keinen eigenständigen Absatz-Außenabstand vertragen.',
      },
    },
  },
}

export const AufDunklemHintergrund: Story = {
  name: 'Auf dunklem Hintergrund',
  args: { variant: 'small', tone: 'onScrim', children: '15 von 24 angezeigt' },
  decorators: [
    (Story) => (
      <div style={{ padding: 16, background: '#1c1c1e', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'tone="onScrim" hält den Text unabhängig von der gewählten Variante auf einem dunklen Hintergrund lesbar (z. B. ein Foto-Banner mit Scrim).',
      },
    },
  },
}
