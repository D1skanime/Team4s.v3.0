// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const redirectMock = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ redirect: redirectMock }))

import RoleCapabilitiesRedirectPage from './page'

describe('RoleCapabilitiesRedirectPage (D-01/D-08 Nachtrag 2026-08-24)', () => {
  it('leitet ohne role-Parameter auf /admin/roles weiter', async () => {
    await RoleCapabilitiesRedirectPage({ searchParams: Promise.resolve({}) })
    expect(redirectMock).toHaveBeenCalledWith('/admin/roles')
  })

  it('erhaelt den role-Parameter beim Weiterleiten', async () => {
    await RoleCapabilitiesRedirectPage({ searchParams: Promise.resolve({ role: 'co_leader' }) })
    expect(redirectMock).toHaveBeenCalledWith('/admin/roles?role=co_leader')
  })

  it('kodiert Sonderzeichen im role-Parameter', async () => {
    await RoleCapabilitiesRedirectPage({ searchParams: Promise.resolve({ role: 'a b' }) })
    expect(redirectMock).toHaveBeenCalledWith('/admin/roles?role=a%20b')
  })

  it('reicht einen vorhandenen tab-Parameter zusammen mit role unverändert an /admin/roles weiter (260824-ike Task 3)', async () => {
    await RoleCapabilitiesRedirectPage({
      searchParams: Promise.resolve({ role: 'co_leader', tab: 'caps' }),
    })
    expect(redirectMock).toHaveBeenCalledWith('/admin/roles?role=co_leader&tab=caps')
  })

  it('haengt ausschließlich ?tab= an, wenn role fehlt', async () => {
    await RoleCapabilitiesRedirectPage({ searchParams: Promise.resolve({ tab: 'caps' }) })
    expect(redirectMock).toHaveBeenCalledWith('/admin/roles?tab=caps')
  })
})
