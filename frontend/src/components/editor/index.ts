// B3 decision (RCA-02, Phase 153 Plan 02): the barrel is split — RichTextRenderer is
// removed from this file's exports entirely. This barrel keeps only RichTextEditor,
// ColorTokenExtension, and COLOR_TOKENS — symbols that genuinely require the
// Tiptap/ProseMirror editor bundle. Rationale: RCA-02 showed that a shared barrel
// exporting both a heavy (Tiptap-dependent) and a light (dependency-free) symbol lets
// any future renderer-only import silently reintroduce the entire editor bundle with a
// single `import { RichTextRenderer } from '@/components/editor'` line; removing the
// light symbol from the barrel converts that mistake from a runtime bundle-size
// regression (invisible until measured) into a compile-time TypeScript error, which is
// a stronger and more durable regression guard than a lint rule or a periodic
// audit-script run. RichTextRenderer.tsx itself is not moved, renamed, or duplicated —
// only its barrel re-export is removed; direct imports from
// '@/components/editor/RichTextRenderer' are unaffected and remain the one and only
// public entry point to this component.
export { RichTextEditor } from './RichTextEditor'
export { ColorTokenExtension, COLOR_TOKENS } from './ColorTokenExtension'
export type { ColorToken } from './ColorTokenExtension'
