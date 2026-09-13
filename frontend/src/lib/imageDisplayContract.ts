// Frontend delivery policy; this query is not a backend media parameter.
export const IMAGE_DISPLAY_QUERY = 'display_width'
export const IMAGE_DISPLAY_WIDTHS = [512, 760, 1280, 1920] as const

export function parseImageDisplayWidth(url: URL): number | null {
  const values = url.searchParams.getAll(IMAGE_DISPLAY_QUERY)
  if (values.length !== 1 || !/^[1-9][0-9]*$/.test(values[0])) return null
  const width = Number(values[0])
  return IMAGE_DISPLAY_WIDTHS.some((allowed) => allowed === width) ? width : null
}
