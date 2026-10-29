import type { Meta, StoryObj } from '@storybook/nextjs'

import { ActivationStatusIndicator } from './ActivationStatusIndicator'

/**
 * Discriminated-Union-Primitive für die ehrliche Aktivierungsstatus-Vokabular bei
 * Rechte-Mutationen: Pfad `role_matrix` (Rollenmatrix-Grant/Revoke, kein Pending-Zustand)
 * und Pfad `override` (persönliche Rechte-Override-Mutation, mit `active`/`pending`).
 */
const meta = {
  title: 'Zusammengesetzte Bausteine/ActivationStatusIndicator',
  component: ActivationStatusIndicator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Besteht aus: Badge, Button.',
      },
    },
  },
} satisfies Meta<typeof ActivationStatusIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const RoleMatrixErfolg: Story = {
  name: 'RoleMatrixErfolg',
  args: { path: 'role_matrix', cacheReloadSucceeded: true },
}

export const RoleMatrixFehlerMitRetry: Story = {
  name: 'RoleMatrixFehlerMitRetry',
  args: { path: 'role_matrix', cacheReloadSucceeded: false, onRetry: () => {} },
}

export const OverrideAktiv: Story = {
  name: 'OverrideAktiv',
  args: { path: 'override', activationStatus: 'active' },
}

export const OverridePending: Story = {
  name: 'OverridePending',
  args: { path: 'override', activationStatus: 'pending' },
}

export const OverridePersisted: Story = {
  name: 'OverridePersisted',
  args: { path: 'override', activationStatus: 'persisted' },
  parameters: {
    docs: {
      description: {
        story:
          'Rendert bewusst nichts: "persisted" ist laut CapabilityActivationStatus-Dokumentation für ein zukünftiges Cache-Aktivierungsmodell reserviert, das MutateOverride heute nie produziert — defensiver Fallback für einen unerreichbaren Zustand.',
      },
    },
  },
}

export const OverrideFailed: Story = {
  name: 'OverrideFailed',
  args: { path: 'override', activationStatus: 'failed' },
  parameters: {
    docs: {
      description: {
        story:
          'Rendert bewusst nichts: ein echter Fehler auf dem Override-Pfad wird als 4xx/5xx VOR jeder Aktivierungsstatus-Konstruktion zurückgegeben — eine 200-Antwort kann "failed" laut Vertrag nie tragen.',
      },
    },
  },
}
