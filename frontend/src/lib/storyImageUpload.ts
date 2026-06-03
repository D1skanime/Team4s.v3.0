// storyImageUpload.ts — deferred Batch-Upload-Utility fuer Story-Bild-Nodes.
// Traversiert TipTap-JSON, laedt pending Bilder hoch, tauscht Marker.
// Anforderungen: D-06 (kein Partial-Save), D-07 (Fehler → Exception),
//                D-14 (nur Nodes im Dokument — keine Orphan-Uploads).
//
// Kein React-Import — reines TypeScript-Utility.

export interface StoryImageUploadResponse {
  media_asset_id: number
  public_url: string
}

// Lokaler Typ fuer einen TipTap image-Node im JSON-Baum.
type TipTapImageNode = {
  type: 'image'
  attrs: {
    media_asset_id?: number | null
    pending_key?: string | null
    preview_url?: string | null
    width_percent?: number
    alignment?: string
  }
}

/**
 * Traversiert den TipTap-JSON-Baum (`doc`) und laedt alle image-Nodes mit
 * `pending_key != null` sequentiell hoch (kein Promise.all — single-failure-stop,
 * D-06/D-07). Gibt einen neuen JSON-Baum zurueck mit bereinigten Markern.
 *
 * D-14: Iteration laeuft ueber Nodes im Dokument — pendingFiles-Eintraege ohne
 * passenden Node im JSON werden still ignoriert (kein Orphan-Upload).
 *
 * @param doc        TipTap-JSON-Dokument (unbekannter Typ, wird als object behandelt)
 * @param pendingFiles Map von pending_key → File (aus Editor-State)
 * @param uploadFn   Upload-Funktion (z.B. uploadOwnProfileStoryImage aus api.ts)
 * @param onProgress Optionaler Progress-Callback (pendingKey, 0-100)
 * @returns          Bereinigter JSON-Baum (alle pending_key/preview_url auf null)
 */
export async function uploadPendingStoryImages(
  doc: unknown,
  pendingFiles: Map<string, File>,
  uploadFn: (file: File, onProgress?: (pct: number) => void) => Promise<StoryImageUploadResponse>,
  onProgress?: (pendingKey: string, pct: number) => void,
): Promise<unknown> {
  return traverseAndResolve(doc, pendingFiles, uploadFn, onProgress)
}

async function traverseAndResolve(
  node: unknown,
  pendingFiles: Map<string, File>,
  uploadFn: (file: File, onProgress?: (pct: number) => void) => Promise<StoryImageUploadResponse>,
  onProgress?: (pendingKey: string, pct: number) => void,
): Promise<unknown> {
  if (!node || typeof node !== 'object') return node
  const n = node as Record<string, unknown>

  // image-Node verarbeiten
  if (n['type'] === 'image') {
    const imageNode = n as unknown as TipTapImageNode
    const pendingKey = imageNode.attrs?.pending_key

    if (pendingKey && typeof pendingKey === 'string') {
      // D-14: Datei aus pendingFiles holen — nur wenn Node noch im Dokument
      const file = pendingFiles.get(pendingKey)
      if (!file) {
        throw new Error(`Bild-Datei für Marker "${pendingKey}" nicht gefunden.`)
      }
      // Sequentieller Upload — D-06/D-07: Exception bei Fehler, kein Partial-Save
      const result = await uploadFn(file, (pct) => onProgress?.(pendingKey, pct))
      return {
        ...n,
        attrs: {
          ...(imageNode.attrs as object),
          media_asset_id: result.media_asset_id,
          pending_key: null,   // Marker bereinigen — darf nicht im body_json landen
          preview_url: null,   // Object-URL bereinigen (Pitfall 2)
        },
      }
    }

    // Bereits aufgeloester Node — preview_url dennoch bereinigen (Pitfall 2)
    return {
      ...n,
      attrs: {
        ...(imageNode.attrs as object),
        pending_key: null,
        preview_url: null,
      },
    }
  }

  // Rekursiv in content-Array abtauchen (sequentiell per await — D-06)
  if (Array.isArray(n['content'])) {
    const resolvedContent: unknown[] = []
    for (const child of n['content'] as unknown[]) {
      resolvedContent.push(
        await traverseAndResolve(child, pendingFiles, uploadFn, onProgress),
      )
    }
    return { ...n, content: resolvedContent }
  }

  return node
}
