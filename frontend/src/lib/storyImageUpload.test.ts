// Wave-0-Tests fuer uploadPendingStoryImages (deferred Batch-Upload beim Profil-Save).
// Alle Tests sind ROT bis Plan 70-05 die Funktion implementiert.
// Anforderungs-Abdeckung: D-06, D-07, D-14

import { describe, it, expect, vi } from 'vitest'

// TODO(plan-70-05): uploadPendingStoryImages aus dem richtigen Pfad importieren.
// Bis zur Implementierung schlaegt der Import fehl und Tests sind ROT.
// Kommentierter Import fuer spaetere Aktivierung:
// import { uploadPendingStoryImages } from './storyImageUpload'

// Stub-Funktion damit die Tests kompilieren und als FAIL ausfuehren koennen.
// In Plan 70-05 wird der echte Import aktiviert und dieser Stub entfernt.
const uploadPendingStoryImages = null as unknown as (
  doc: unknown,
  pendingFiles: Map<string, File>,
  uploadFn: (file: File) => Promise<{ media_asset_id: number; public_url: string }>,
  onProgress?: (done: number, total: number) => void,
) => Promise<unknown>

// Hilfsfunktion: erzeugt ein TipTap-JSON-Dokument mit einem image-Node und pending_key
function makeTipTapDocWithPendingImage(pendingKey: string): unknown {
  return {
    type: 'doc',
    content: [
      {
        type: 'image',
        attrs: {
          media_asset_id: null,
          pending_key: pendingKey,
          preview_url: 'blob:http://localhost/abc',
          width_percent: 60,
          alignment: 'center',
        },
      },
    ],
  }
}

// Hilfsfunktion: TipTap-JSON ohne image-Node (Bild wurde vor Save entfernt)
function makeTipTapDocWithoutImage(): unknown {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Nur Text, kein Bild.' }],
      },
    ],
  }
}

// Hilfsfunktion: erstellt eine Dummy-File-Instanz
function makeDummyFile(name: string): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' })
}

describe('uploadPendingStoryImages — Marker-Swap (D-06, D-07)', () => {
  it('ersetzt pending_key-Node durch media_asset_id nach erfolgreichem Upload', async () => {
    // ERWARTET: schlaegt fehl weil uploadPendingStoryImages noch nicht implementiert (null-Stub)
    expect(uploadPendingStoryImages).not.toBeNull()

    const pendingKey = 'pending-key-abc'
    const doc = makeTipTapDocWithPendingImage(pendingKey)
    const pendingFile = makeDummyFile('test.png')
    const pendingFiles = new Map<string, File>([[pendingKey, pendingFile]])

    const uploadFn = vi.fn().mockResolvedValue({ media_asset_id: 42, public_url: '/media/profile/1/story/abc/original.png' })

    const resultDoc = await uploadPendingStoryImages(doc, pendingFiles, uploadFn)

    // Nach Upload muss der image-Node media_asset_id=42 haben und pending_key=null
    const imageNode = (resultDoc as { content: Array<{ type: string; attrs: Record<string, unknown> }> })
      .content.find((n: { type: string }) => n.type === 'image')
    expect(imageNode?.attrs.media_asset_id).toBe(42)
    expect(imageNode?.attrs.pending_key).toBeNull()
    expect(imageNode?.attrs.preview_url).toBeNull()
    expect(uploadFn).toHaveBeenCalledOnce()
  })

  it('setzt preview_url=null auch bei Nodes ohne pending_key (Pitfall 2)', async () => {
    expect(uploadPendingStoryImages).not.toBeNull()

    // Bild hat bereits media_asset_id (schon hochgeladen), aber noch eine preview_url
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            media_asset_id: 77,
            pending_key: null,
            preview_url: 'blob:http://localhost/xyz',
            width_percent: 60,
            alignment: 'center',
          },
        },
      ],
    }
    const pendingFiles = new Map<string, File>()
    const uploadFn = vi.fn()

    const resultDoc = await uploadPendingStoryImages(doc, pendingFiles, uploadFn)

    const imageNode = (resultDoc as { content: Array<{ type: string; attrs: Record<string, unknown> }> })
      .content.find((n: { type: string }) => n.type === 'image')
    // preview_url muss auch ohne pending_key auf null gesetzt werden
    expect(imageNode?.attrs.preview_url).toBeNull()
    expect(uploadFn).not.toHaveBeenCalled()
  })
})

describe('uploadPendingStoryImages — Fehler-Atomizitaet (D-06, D-07)', () => {
  it('wirft Exception wenn ein Upload fehlschlaegt — kein Partial-Success', async () => {
    expect(uploadPendingStoryImages).not.toBeNull()

    const pendingKey = 'pending-key-fail'
    const doc = makeTipTapDocWithPendingImage(pendingKey)
    const pendingFiles = new Map<string, File>([[pendingKey, makeDummyFile('fail.png')]])

    const uploadFn = vi.fn().mockRejectedValue(new Error('Upload fehlgeschlagen'))

    // Funktion muss Exception werfen (kein partieller Erfolg, D-06/D-07)
    await expect(uploadPendingStoryImages(doc, pendingFiles, uploadFn)).rejects.toThrow()
  })
})

describe('uploadPendingStoryImages — D-14: Kein Upload fuer entfernte Bilder', () => {
  it('ruft uploadFn NICHT auf fuer pending_key-Eintraege die nicht im TipTap-Dokument vorkommen', async () => {
    // D-14: Bild wurde vor handleSubmit aus dem Editor entfernt
    // → pendingFiles hat noch den Eintrag, aber das TipTap-JSON-Doc enthaelt den pending_key nicht mehr
    expect(uploadPendingStoryImages).not.toBeNull()

    // Dokument ohne image-Node (Bild wurde entfernt)
    const doc = makeTipTapDocWithoutImage()

    // Aber pendingFiles hat noch einen Eintrag fuer das entfernte Bild
    const removedKey = 'pending-key-removed'
    const pendingFiles = new Map<string, File>([[removedKey, makeDummyFile('removed.png')]])

    const uploadFn = vi.fn()

    await uploadPendingStoryImages(doc, pendingFiles, uploadFn)

    // uploadFn darf kein einziges Mal aufgerufen worden sein
    expect(uploadFn).not.toHaveBeenCalled()
  })

  it('uploadFn-CallCount ist 0 fuer entfernte pending_key-Nodes (noPendingOrphan-Assert)', async () => {
    expect(uploadPendingStoryImages).not.toBeNull()

    let uploadFnCallCount = 0
    const uploadFn = vi.fn().mockImplementation(async () => {
      uploadFnCallCount++
      return { media_asset_id: 1, public_url: '/media/x' }
    })

    const doc = makeTipTapDocWithoutImage()
    const pendingFiles = new Map<string, File>([
      ['pending-key-1', makeDummyFile('img1.png')],
      ['pending-key-2', makeDummyFile('img2.png')],
    ])

    await uploadPendingStoryImages(doc, pendingFiles, uploadFn)

    // D-14: keiner der pending_keys kommt im doc vor → uploadFn muss 0 Mal aufgerufen worden sein
    expect(uploadFnCallCount).toBe(0)
  })
})
