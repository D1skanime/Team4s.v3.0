import type { Meta, StoryObj } from '@storybook/nextjs'

import { EffectsShowcase } from './EffectsShowcase'

/**
 * Visuelle Referenz der fünf Effekt-Rezepturen aus `styles/tokens/effects.css` --
 * unter "Grundlagen" statt "Im Einsatz" einsortiert, analog zu "Grundlagen/Design-Tokens": zeigt
 * die Rohdaten des Effekt-Systems, keine domänenspezifische Seite. Anders als die
 * Design-Tokens-Seite ist dies KEIN automatischer Scan aller CSS-Custom-Properties, sondern ein
 * hand-kuratierter Katalog von fünf benannten Rezepturen (jeweils eine Komposition mehrerer
 * Eigenschaften mit einem einzigen visuellen Zweck), da Rezepturen nicht wie flache Tokens
 * automatisch enumerierbar sind.
 */
const meta = {
  title: 'Grundlagen/Effekte',
  component: EffectsShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof EffectsShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
