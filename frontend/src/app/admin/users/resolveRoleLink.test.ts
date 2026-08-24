// @vitest-environment node
/**
 * Tests für resolveRoleLink.ts (260824-ike Task 3, Defekt 3).
 *
 * Test 1: ohne dritten tab-Parameter bleibt der Rückgabewert byte-identisch zum bisherigen
 *         Verhalten (Rückwärtskompatibilität); mit gesetztem tab wird &tab=... angehängt;
 *         eine nicht auflösbare Rolle liefert weiterhin null, unabhängig vom tab-Argument.
 */
import { describe, it, expect } from 'vitest'
import { resolveRoleLink } from './resolveRoleLink'
import type { RoleCapabilityMatrix } from '@/types/admin-capability'

const matrixMitCoLeader: RoleCapabilityMatrix = {
  roles: [
    {
      role_code: 'co_leader',
      label_de: 'Co-Leader',
      assignable: true,
      capability_editable: true,
      contexts: ['fansub_group'],
      actions: [],
    },
  ],
  all_actions: [],
}

describe('resolveRoleLink', () => {
  it('liefert ohne tab-Argument weiterhin exakt /admin/roles?role=co_leader', () => {
    expect(resolveRoleLink('co_leader', matrixMitCoLeader)).toBe('/admin/roles?role=co_leader')
  })

  it('haengt bei gesetztem tab-Argument &tab=caps an', () => {
    expect(resolveRoleLink('co_leader', matrixMitCoLeader, 'caps')).toBe(
      '/admin/roles?role=co_leader&tab=caps',
    )
  })

  it('liefert fuer eine nicht in der Matrix aufloesbare Rolle weiterhin null, auch mit tab-Argument', () => {
    expect(resolveRoleLink('unbekannt', matrixMitCoLeader, 'caps')).toBeNull()
  })
})
