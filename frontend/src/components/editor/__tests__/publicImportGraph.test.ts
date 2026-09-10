import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Static, fast, browser-independent regression guard for the two structural regressions this
// phase (153) fixed. Per CLAUDE.md's Teststil "absence" carve-out, this file asserts ONLY that
// specific identifiers/strings never appear in specific source files -- it never asserts what a
// component renders (that remains each component's own .test.tsx suite's job). This file exists
// solely as a fast structural tripwire, not a substitute for behavior assertions.

// The four renderer-only consumer files named in Plan 02 (RCA-02). Each must import
// `RichTextRenderer` directly from its own module, never through the shared `@/components/editor`
// barrel -- the barrel also exports `RichTextEditor` (Tiptap/ProseMirror-dependent), so a barrel
// import here would silently drag the entire editor bundle back into the public import graph.
const RENDERER_ONLY_CONSUMER_FILES = [
  'src/components/profile/MemberStorySection.tsx',
  'src/components/profile/MemberGroupsHistorySection.tsx',
  'src/components/public/PublicNoteCard.tsx',
  'src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx',
]

const ACHIEVEMENT_ARTWORK_FILE = 'src/components/profile/AchievementArtwork.tsx'

const FRONTEND_ROOT = path.resolve(process.cwd())

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), 'utf8')
}

describe('public import graph regression guard (Phase 153 D2)', () => {
  it.each(RENDERER_ONLY_CONSUMER_FILES)(
    "%s does not import from the '@/components/editor' barrel (RCA-02 regression tripwire)",
    (relativePath) => {
      const source = readSource(relativePath)

      expect(source).not.toContain("from '@/components/editor'")
    },
  )

  it("AchievementArtwork.tsx's sizes attribute does not reintroduce the literal 'auto, ' prefix (RCA-01 regression tripwire)", () => {
    const source = readSource(ACHIEVEMENT_ARTWORK_FILE)

    expect(source).not.toContain('auto, ')
  })
})
