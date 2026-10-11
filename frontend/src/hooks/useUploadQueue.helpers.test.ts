import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api'
import { fileKey, isTerminalUploadStatus, mergeFileSelection, readUploadError } from './useUploadQueue.helpers'

function makeFile(name: string, lastModified = 1): File {
  return new File(['content'], name, { type: 'image/png', lastModified })
}

describe('fileKey', () => {
  it('returns `${name}:${size}:${lastModified}`', () => {
    const file = makeFile('a.png', 123)
    expect(fileKey(file)).toBe(`${file.name}:${file.size}:${file.lastModified}`)
  })
})

describe('mergeFileSelection', () => {
  it('appends new files while preserving existing entry object references', () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    const existing = { file: fileA }
    const result = mergeFileSelection([existing], [fileA, fileB], (f) => ({ file: f }))

    expect(result).toHaveLength(2)
    expect(result[0]).toBe(existing)
    expect(result[1].file).toBe(fileB)
  })

  it('returns a single-entry array when merging into an empty queue', () => {
    const fileA = makeFile('a.png')
    expect(mergeFileSelection([], [fileA], (f) => ({ file: f }))).toEqual([{ file: fileA }])
  })

  it('never drops or reorders existing entries', () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    const fileC = makeFile('c.png')
    const current = [{ file: fileA }, { file: fileB }]
    const result = mergeFileSelection(current, [fileC], (f) => ({ file: f }))
    expect(result.map((entry) => entry.file.name)).toEqual(['a.png', 'b.png', 'c.png'])
  })

  it('does not mutate the current array', () => {
    const fileA = makeFile('a.png')
    const fileB = makeFile('b.png')
    const current = [{ file: fileA }]
    mergeFileSelection(current, [fileB], (f) => ({ file: f }))
    expect(current).toHaveLength(1)
  })

  it('skips files whose key already exists in current', () => {
    const fileA = makeFile('a.png', 5)
    const duplicateOfA = makeFile('a.png', 5)
    const current = [{ file: fileA }]
    const result = mergeFileSelection(current, [duplicateOfA], (f) => ({ file: f }))
    expect(result).toHaveLength(1)
  })
})

describe('isTerminalUploadStatus', () => {
  it('returns true for ready and failed', () => {
    expect(isTerminalUploadStatus('ready')).toBe(true)
    expect(isTerminalUploadStatus('failed')).toBe(true)
  })

  it('returns false for idle, uploading, processing', () => {
    expect(isTerminalUploadStatus('idle')).toBe(false)
    expect(isTerminalUploadStatus('uploading')).toBe(false)
    expect(isTerminalUploadStatus('processing')).toBe(false)
  })
})

describe('readUploadError', () => {
  it('forwards ApiError.message', () => {
    expect(readUploadError(new ApiError(500, 'boom'), 'fallback')).toBe('boom')
  })

  it('forwards plain Error.message', () => {
    expect(readUploadError(new Error('oops'), 'fallback')).toBe('oops')
  })

  it('returns the fallback for a plain string throw', () => {
    expect(readUploadError('not an error', 'fallback')).toBe('fallback')
  })

  it('returns the fallback for undefined/null', () => {
    expect(readUploadError(undefined, 'fallback')).toBe('fallback')
    expect(readUploadError(null, 'fallback')).toBe('fallback')
  })
})
