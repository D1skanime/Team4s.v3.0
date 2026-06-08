'use client'

import { FormField, Input, Select } from '@/components/ui'

import { optionsForTargetType, type ReportTargetOption, type ReportTargetType } from './reportTargets'

interface ReportTargetFieldProps {
  id: string
  label: string
  hint: string
  targetType: ReportTargetType
  targetId: string
  targetOptions: ReportTargetOption[]
  onTargetIdChange: (targetId: string) => void
  fallbackLabel?: string
  extraOptions?: ReportTargetOption[]
}

export function ReportTargetField({
  id,
  label,
  hint,
  targetType,
  targetId,
  targetOptions,
  onTargetIdChange,
  fallbackLabel = 'Ziel-ID manuell eingeben',
  extraOptions = [],
}: ReportTargetFieldProps) {
  const optionMap = new Map<number, ReportTargetOption>()
  for (const option of [...optionsForTargetType(targetOptions, targetType), ...extraOptions]) {
    if (option.type === targetType) optionMap.set(option.id, option)
  }
  const options = Array.from(optionMap.values())
  const selectedOptionExists = targetId ? options.some((option) => String(option.id) === targetId) : false

  if (options.length === 0 || (targetId && !selectedOptionExists)) {
    return (
      <FormField label={label} htmlFor={id} required hint={hint}>
        <Input
          id={id}
          type="number"
          min={1}
          inputMode="numeric"
          value={targetId}
          onChange={(event) => onTargetIdChange(event.target.value)}
          placeholder={fallbackLabel}
          required
        />
      </FormField>
    )
  }

  return (
    <FormField label={label} htmlFor={id} required hint={hint}>
      <Select
        id={id}
        value={targetId}
        onChange={(event) => onTargetIdChange(event.target.value)}
        required
      >
        <option value="">Ziel auswählen</option>
        {options.map((option) => (
          <option key={`${option.type}-${option.id}`} value={String(option.id)}>
            {option.description ? `${option.label} (${option.description})` : option.label}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
