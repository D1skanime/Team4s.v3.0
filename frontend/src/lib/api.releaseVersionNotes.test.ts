// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  bulkUpsertReleaseVersionNotes,
  getMemberRolesForVersion,
  listReleaseVersionNotes,
} from './api'

describe('release version notes api mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps member-role responses from PascalCase to camelCase', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: [
        {
          MemberID: 1,
          MemberName: 'LocalAdmin',
          RoleID: 8,
          RoleCode: 'editor',
          RoleName: 'editor',
          RoleLabel: 'Editing',
        },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    await expect(getMemberRolesForVersion(62)).resolves.toEqual([
      {
        memberId: 1,
        memberName: 'LocalAdmin',
        roleId: 8,
        roleCode: 'editor',
        roleName: 'editor',
        roleLabel: 'Editing',
      },
    ])
  })

  it('maps list and save note responses from PascalCase to camelCase', async () => {
    const tiptapDoc = { type: 'doc', content: [{ type: 'paragraph' }] }
    const tiptapDocBase64 = btoa(JSON.stringify(tiptapDoc))
    const payload = {
      data: [
        {
          ID: 91,
          ReleaseVersionID: 62,
          MemberID: 1,
          RoleID: 8,
          Title: 'Bestehende Notiz',
          BodyMarkdown: null,
          BodyHTML: '<p>Hallo</p>',
          BodyJSON: tiptapDocBase64,
          BodyText: 'Hallo',
          EditorType: 'tiptap',
          ContentSchemaVersion: 1,
          Visibility: 'internal',
          Status: 'draft',
          SortOrder: 0,
          CreatedByUserID: 1,
          UpdatedByUserID: 1,
          CreatedAt: '2026-05-12T00:00:00Z',
          UpdatedAt: null,
          DeletedAt: null,
        },
      ],
    }

    const fetchMock = vi.fn(async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listReleaseVersionNotes(62)).resolves.toMatchObject([
      {
        id: 91,
        releaseVersionId: 62,
        memberId: 1,
        roleId: 8,
        bodyJson: tiptapDoc,
        bodyHtml: '<p>Hallo</p>',
        bodyText: 'Hallo',
      },
    ])

    await expect(bulkUpsertReleaseVersionNotes(62, {
      notes: [{
        id: 0,
        memberId: 1,
        roleId: 8,
        roleCode: 'editor',
        title: null,
        bodyJson: { type: 'doc', content: [{ type: 'paragraph' }] },
        visibility: 'internal',
        status: 'draft',
        sortOrder: 0,
      }],
    })).resolves.toMatchObject([
      {
        id: 91,
        releaseVersionId: 62,
        memberId: 1,
        roleId: 8,
        bodyJson: tiptapDoc,
      },
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
