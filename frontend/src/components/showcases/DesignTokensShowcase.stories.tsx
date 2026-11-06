import type { Meta, StoryObj } from '@storybook/nextjs'

import { DesignTokensShowcase } from './DesignTokensShowcase'

/**
 * Automatisch aus globals.css ausgelesener, vollständiger Katalog aller Design-Werte -- keine von
 * Hand gepflegte Teilliste. Unter "Grundlagen" statt "Im Einsatz" einsortiert: zeigt die Rohdaten
 * des Design-Systems selbst. Dreistufig gegliedert: Grundskala (Farbe/Abstand/Rundung/Schatten/
 * Schrift, mit echter Vorschau je Wert), Zweck-Werte (mit Rückverweis auf ihren Grundwert) und
 * Bausteinwerte (nach Baustein gruppiert, eingeklappt, mit Markierung noch fest codierter Werte).
 */
const meta = {
  title: 'Grundlagen/Design-Tokens',
  component: DesignTokensShowcase,
  tags: ['autodocs'],
} satisfies Meta<typeof DesignTokensShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Standard: Story = {}
