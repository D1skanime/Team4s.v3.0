// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createFansubGroupNote,
  getAnimeFansubProjectNote,
  listFansubGroupNotes,
  upsertAnimeFansubProjectNote,
  updateFansubGroupNote,
} from './api'

function encodeBase64Utf8(value: string): string {
  return Buffer.from(value, 'utf-8').toString('base64')
}

describe('fansub notes api mapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps fansub group notes from PascalCase and decodes body_json', async () => {
    const tiptapDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'möchte ältere Grüße' }] }],
    }
    const tiptapDocBase64 = encodeBase64Utf8(JSON.stringify(tiptapDoc))
    const rawNote = {
      ID: 7,
      FansubGroupID: 88,
      Title: 'Unser Stil',
      BodyMarkdown: null,
      BodyHTML: '<p>möchte ältere Grüße</p>',
      BodyJSON: tiptapDocBase64,
      BodyText: 'möchte ältere Grüße',
      EditorType: 'tiptap',
      ContentSchemaVersion: 1,
      Visibility: 'public',
      Status: 'draft',
      SortOrder: 0,
      CreatedByUserID: null,
      UpdatedByUserID: null,
      CreatedAt: '2026-05-12T00:00:00Z',
      UpdatedAt: null,
      DeletedAt: null,
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [rawNote] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: rawNote }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: rawNote }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listFansubGroupNotes(88)).resolves.toMatchObject([
      {
        id: 7,
        fansubGroupId: 88,
        title: 'Unser Stil',
        bodyJson: tiptapDoc,
        bodyText: 'möchte ältere Grüße',
      },
    ])

    await expect(createFansubGroupNote(88, {
      title: 'Unser Stil',
      bodyJson: tiptapDoc,
      visibility: 'public',
      status: 'draft',
      sortOrder: 0,
    })).resolves.toMatchObject({
      id: 7,
      fansubGroupId: 88,
      bodyJson: tiptapDoc,
      bodyText: 'möchte ältere Grüße',
    })

    await expect(updateFansubGroupNote(88, 7, {
      title: 'Unser Stil',
      bodyJson: tiptapDoc,
      visibility: 'public',
      status: 'draft',
      sortOrder: 0,
    })).resolves.toMatchObject({
      id: 7,
      fansubGroupId: 88,
      bodyJson: tiptapDoc,
      bodyText: 'möchte ältere Grüße',
    })
  })

  it('maps anime project notes from PascalCase and decodes body_json', async () => {
    const tiptapDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'möchte Ältere Grüße' }] }],
    }
    const tiptapDocBase64 = encodeBase64Utf8(JSON.stringify(tiptapDoc))
    const rawNote = {
      ID: 12,
      AnimeID: 22,
      FansubGroupID: 88,
      Title: 'Projekttext',
      BodyMarkdown: null,
      BodyHTML: '<p>möchte Ältere Grüße</p>',
      BodyJSON: tiptapDocBase64,
      BodyText: 'möchte Ältere Grüße',
      EditorType: 'tiptap',
      ContentSchemaVersion: 1,
      Visibility: 'public',
      Status: 'published',
      SortOrder: 0,
      CreatedByUserID: 1,
      UpdatedByUserID: 1,
      CreatedAt: '2026-05-13T00:00:00Z',
      UpdatedAt: '2026-05-13T00:01:00Z',
      DeletedAt: null,
    }

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: rawNote }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: rawNote }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAnimeFansubProjectNote(88, 22)).resolves.toMatchObject({
      id: 12,
      animeId: 22,
      fansubGroupId: 88,
      bodyJson: tiptapDoc,
      bodyText: 'möchte Ältere Grüße',
    })

    await expect(upsertAnimeFansubProjectNote(88, 22, {
      title: 'Projekttext',
      bodyJson: tiptapDoc,
      visibility: 'public',
      status: 'published',
      sortOrder: 0,
    })).resolves.toMatchObject({
      id: 12,
      animeId: 22,
      fansubGroupId: 88,
      bodyJson: tiptapDoc,
      bodyText: 'möchte Ältere Grüße',
    })
  })
})
