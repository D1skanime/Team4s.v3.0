'use client'

import { ReleaseVersionMediaCategory } from '@/types/releaseVersionMedia'

import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { CATEGORY_OPTIONS } from './ReleaseVersionMediaSection.helpers'

export interface ReleaseVersionMediaReplaceControlsProps {
  editCategory: ReleaseVersionMediaCategory
  onCategoryChange: (category: ReleaseVersionMediaCategory) => void
}

export function ReleaseVersionMediaReplaceControls({
  editCategory,
  onCategoryChange,
}: ReleaseVersionMediaReplaceControlsProps) {
  return (
    <FormField
      label="Kategorie"
      htmlFor="edit-media-category"
      hint="Falsche Kategorie war der Ablehnungsgrund? Hier direkt korrigieren."
    >
      <Select
        id="edit-media-category"
        value={editCategory}
        onChange={(event) => onCategoryChange(event.target.value as ReleaseVersionMediaCategory)}
      >
        {CATEGORY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
