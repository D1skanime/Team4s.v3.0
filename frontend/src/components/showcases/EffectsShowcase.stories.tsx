import type { Meta, StoryObj } from '@storybook/nextjs'

import { EffectsShowcase } from './EffectsShowcase'

/**
 * Visuelle Referenz der fünf Effekt-Beispiele aus `styles/tokens/effects.css` --
 * unter "Grundlagen" statt "Im Einsatz" einsortiert, analog zu "Grundlagen/Design-Tokens": zeigt
 * die Grundlagen des Effekt-Systems, keine fachspezifische Seite. Anders als die
 * Design-Tokens-Seite ist dies KEIN automatischer Scan aller CSS-Custom-Properties, sondern ein
 * hand-kuratierter Katalog von fünf benannten Effekten (jeweils eine Kombination mehrerer
 * CSS-Eigenschaften mit einem einzigen visuellen Zweck), da sie nicht wie flache Tokens
 * automatisch enumerierbar sind. Jedes Beispiel zeigt zusätzlich ein Vorher/Nachher-Paar über
 * einem echten, farbigen Anime-Cover.
 */
const meta = {
  title: 'Grundlagen/Effekte',
  component: EffectsShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof EffectsShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
