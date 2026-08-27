// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EpisodeBulkBar } from './EpisodeBulkBar'

describe('EpisodeBulkBar', () => {
  it('offers an additive fansub-group action for the selected episodes', () => {
    const onBulkFansubGroupChange = vi.fn()
    const onApplyBulkFansubGroup = vi.fn()

    render(
      <EpisodeBulkBar
        statuses={['disabled', 'private', 'public']}
        fansubs={[
          { id: 7, name: 'Bestehende Gruppe' },
          { id: 9, name: 'Neue Gruppe' },
        ]}
        selectedCount={2}
        bulkStatus=""
        bulkFansubGroupID={9}
        isApplyingBulk={false}
        isUpdating={false}
        bulkProgress={null}
        onClearSelection={vi.fn()}
        onBulkStatusChange={vi.fn()}
        onApplyBulkStatus={vi.fn()}
        onBulkFansubGroupChange={onBulkFansubGroupChange}
        onApplyBulkFansubGroup={onApplyBulkFansubGroup}
        onRemoveSelected={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Fansub-Gruppe für Auswahl'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gruppe ergänzen' }))

    expect(onBulkFansubGroupChange).toHaveBeenCalledWith(9)
    expect(onApplyBulkFansubGroup).toHaveBeenCalledOnce()
  })
})
