import path from 'node:path'

export function resolveCoverFilePath(file: string): string | null {
  if (!file || file.length > 200 || file.includes('..') || !/^[a-zA-Z0-9._-]+$/.test(file)) return null
  return path.join(process.cwd(), 'public', 'covers', file)
}
