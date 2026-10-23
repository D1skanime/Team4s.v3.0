'use client'

// Eigene Datei statt in ProposalForm.steps.tsx: letztere lag mit den beiden neuen Schritten
// knapp über dem CLAUDE.md-450-Zeilen-Limit — reiner, behavior-neutraler Verschiebe-Schritt
// vor der inhaltlichen Verdrahtung (CLAUDE.md "Übergroße Dateien beim Anfassen aufteilen").
import { FormField, Select } from '@/components/ui'

import type { RoleDefinition } from './ProposalForm.steps'
import type { HintType } from './ProposalForm.toggles'
import { HintTypeToggle } from './ProposalForm.toggles'
import styles from './contributions.module.css'

// ---- Step 0: Hinweisart (D-06) ----

interface Step0Props {
  hintType: HintType | ''
  hintTypeError: string | null
  onSelect: (value: HintType) => void
}

export function Step0HintType({ hintType, hintTypeError, onSelect }: Step0Props) {
  return (
    <div className={styles.wizardStepPanel}>
      <FormField label="Worum geht es?" error={hintTypeError ?? undefined} required>
        <HintTypeToggle value={hintType} onSelect={onSelect} />
      </FormField>
    </div>
  )
}

// ---- Step Rolle (optional): Mitgliedschaftsanfrage, D-07 ----
//
// Eigenstaendig von Step2Role, weil die Rollenquelle eine ANDERE ist: Step2Role zeigt
// anime_contribution-Kontext-Rollen (ueber die vom Aufrufer uebergebene roleDefinitions-Prop),
// dieser Schritt zeigt ausschliesslich fansub_group-Kontext-Rollen (ueber
// useRoleCatalog('fansub_group') beim Aufrufer aufgeloest) — fansub_lead darf niemals in
// Step2Role auftauchen (datenmodellbedingt unmoeglich, siehe 191-CONTEXT.md Ist-Zustand 7),
// und project_lead/encoder/... duerfen niemals versehentlich in diesem optionalen Feld landen,
// wenn beide Listen verwechselt wuerden.
interface StepRoleOptionalProps {
  roles: RoleDefinition[]
  requestedRoleCode: string
  onSelectRequestedRole: (code: string) => void
}

export function StepRoleOptional({ roles, requestedRoleCode, onSelectRequestedRole }: StepRoleOptionalProps) {
  return (
    <div className={styles.wizardStepPanel}>
      <FormField
        label="Gewünschte Rolle (optional)"
        htmlFor="hint-requested-role"
        hint="Nur eine Angabe für die Gruppe — keine automatische Zuweisung."
      >
        <Select
          id="hint-requested-role"
          value={requestedRoleCode}
          onChange={(event) => onSelectRequestedRole(event.target.value)}
        >
          <option value="">Keine bestimmte Rolle</option>
          {roles.map((role) => (
            <option key={role.code} value={role.code}>
              {role.label_de}
            </option>
          ))}
        </Select>
      </FormField>
    </div>
  )
}
