// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, listRoleDefinitions } from './api'

const validRole = {
  code: 'karaoke_fx',
  label_de: 'Karaoke FX',
  contexts: ['fansub_group'],
  sort_order: 120,
  assignable: true,
  color_key: 'karaoke_fx',
  icon_key: 'karaoke_fx',
  operative_capability_count: 0,
  has_operative_capabilities: false,
}

function respond(payload: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })))
}

afterEach(() => vi.unstubAllGlobals())

describe('listRoleDefinitions runtime contract', () => {
  it('accepts a valid empty catalog and returns complete rows unchanged', async () => {
    respond([])
    await expect(listRoleDefinitions('fansub_group')).resolves.toEqual([])

    respond([validRole])
    await expect(listRoleDefinitions('fansub_group')).resolves.toEqual([validRole])
  })

  it.each([{}, { data: [] }, null])('rejects a non-array successful payload: %j', async (payload) => {
    respond(payload)
    await expect(listRoleDefinitions('fansub_group')).rejects.toBeInstanceOf(ApiError)
  })

  it.each([
    ['code', undefined], ['code', 1], ['label_de', undefined], ['label_de', false],
    ['contexts', undefined], ['contexts', 'fansub_group'], ['contexts', ['invalid_context']],
    ['sort_order', undefined], ['sort_order', '120'], ['assignable', undefined], ['assignable', 1],
    ['color_key', undefined], ['color_key', null], ['icon_key', undefined], ['icon_key', false],
    ['operative_capability_count', undefined], ['operative_capability_count', '0'],
    ['has_operative_capabilities', undefined], ['has_operative_capabilities', 0],
  ])('rejects an incomplete or mistyped %s field', async (field, value) => {
    respond([{ ...validRole, [field]: value }])
    await expect(listRoleDefinitions('fansub_group')).rejects.toMatchObject({
      status: 502,
      message: 'Rollenkatalog konnte nicht geladen werden.',
      code: 'ROLE_CATALOG_CONTRACT_ERROR',
    })
  })

  it('rejects a row that does not belong to the requested context', async () => {
    respond([{ ...validRole, contexts: ['anime_contribution'] }])
    await expect(listRoleDefinitions('fansub_group')).rejects.toMatchObject({ code: 'ROLE_CATALOG_CONTRACT_ERROR' })
  })
})
