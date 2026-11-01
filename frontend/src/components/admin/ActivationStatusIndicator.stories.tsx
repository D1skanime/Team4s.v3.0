import type { Meta, StoryObj } from '@storybook/nextjs'

import { storybookDocsLink } from '@/lib/storybookLinks'

import { ActivationStatusIndicator } from './ActivationStatusIndicator'

/**
 * Zeigt ehrlich an, ob eine Rechte-Änderung bereits wirksam ist: entweder nach einer
 * Rollenmatrix-Änderung oder nach einer persönlichen Ausnahme für ein einzelnes Mitglied.
 */
const meta = {
  title: 'Admin/ActivationStatusIndicator',
  component: ActivationStatusIndicator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Besteht aus: ${storybookDocsLink('Grundbausteine/Badge', 'Badge')}, ${storybookDocsLink('Grundbausteine/Button', 'Button')}.`,
      },
    },
  },
} satisfies Meta<typeof ActivationStatusIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const RoleMatrixErfolg: Story = {
  name: 'Rollenmatrix: Erfolg',
  args: { path: 'role_matrix', cacheReloadSucceeded: true },
}

export const RoleMatrixFehlerMitRetry: Story = {
  name: 'Rollenmatrix: Fehler mit Wiederholung',
  args: { path: 'role_matrix', cacheReloadSucceeded: false, onRetry: () => {} },
}

export const PersoenlicheAusnahmeAktiv: Story = {
  name: 'Persönliche Ausnahme: Aktiv',
  args: { path: 'override', activationStatus: 'active' },
}

export const PersoenlicheAusnahmePending: Story = {
  name: 'Persönliche Ausnahme: Ausstehend',
  args: { path: 'override', activationStatus: 'pending' },
}

export const PersoenlicheAusnahmePersisted: Story = {
  name: 'Persönliche Ausnahme: Dauerhaft gespeichert',
  args: { path: 'override', activationStatus: 'persisted' },
  render: () => (
    <p style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>
      Rendert bewusst nichts: Dieser Zustand tritt beim heutigen Speicherpfad nie tatsächlich auf.
    </p>
  ),
}

export const PersoenlicheAusnahmeFailed: Story = {
  name: 'Persönliche Ausnahme: Fehlgeschlagen',
  args: { path: 'override', activationStatus: 'failed' },
  render: () => (
    <p style={{ color: 'var(--text-soft)', fontStyle: 'italic' }}>
      Rendert bewusst nichts: Ein echter Fehler wird als Fehlerantwort zurückgegeben, bevor dieser Status überhaupt entsteht.
    </p>
  ),
}
