import { describe, it, expect } from 'vitest'
import { STATUS_LABEL_MAPPING, STATUS_LABELS_ORDERED } from './mediaStatusMapping'

describe('STATUS_LABEL_MAPPING', () => {
  it('hat exakt 6 Einträge', () => {
    const labels = Object.keys(STATUS_LABEL_MAPPING)
    expect(labels).toHaveLength(6)
  })

  it('öffentlich mappt auf public + approved', () => {
    expect(STATUS_LABEL_MAPPING['öffentlich']).toEqual({
      visibilityCode: 'public',
      reviewStatusCode: 'approved',
    })
  })

  it('intern mappt auf private + approved', () => {
    expect(STATUS_LABEL_MAPPING['intern']).toEqual({
      visibilityCode: 'private',
      reviewStatusCode: 'approved',
    })
  })

  it('in Prüfung mappt auf private + in_review', () => {
    expect(STATUS_LABEL_MAPPING['in Prüfung']).toEqual({
      visibilityCode: 'private',
      reviewStatusCode: 'in_review',
    })
  })

  it('abgelehnt mappt auf private + rejected', () => {
    expect(STATUS_LABEL_MAPPING['abgelehnt']).toEqual({
      visibilityCode: 'private',
      reviewStatusCode: 'rejected',
    })
  })

  it('archiviert mappt auf private + archived', () => {
    expect(STATUS_LABEL_MAPPING['archiviert']).toEqual({
      visibilityCode: 'private',
      reviewStatusCode: 'archived',
    })
  })

  it('entfernt mappt auf private + removed', () => {
    expect(STATUS_LABEL_MAPPING['entfernt']).toEqual({
      visibilityCode: 'private',
      reviewStatusCode: 'removed',
    })
  })
})

describe('STATUS_LABELS_ORDERED', () => {
  it('enthält alle 6 Labels', () => {
    expect(STATUS_LABELS_ORDERED).toHaveLength(6)
    expect(STATUS_LABELS_ORDERED).toContain('öffentlich')
    expect(STATUS_LABELS_ORDERED).toContain('intern')
    expect(STATUS_LABELS_ORDERED).toContain('in Prüfung')
    expect(STATUS_LABELS_ORDERED).toContain('abgelehnt')
    expect(STATUS_LABELS_ORDERED).toContain('archiviert')
    expect(STATUS_LABELS_ORDERED).toContain('entfernt')
  })
})
