import { TextStyle } from '@tiptap/extension-text-style'

export const COLOR_TOKENS = [
  'default', 'gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple',
] as const

export type ColorToken = (typeof COLOR_TOKENS)[number]

// ColorTokenExtension erweitert TextStyle um ein colorToken-Attribut.
// Verwendet data-color-token-Attribut und CSS-Klasse statt inline-style,
// damit bluemonday im Backend das HTML durchlässt (class + data-* erlaubt, style nicht).
export const ColorTokenExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colorToken: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-color-token') ?? null,
        renderHTML: (attributes: Record<string, unknown>) => {
          const token = attributes.colorToken as string | null
          if (!token || token === 'default') return {}
          return {
            'data-color-token': token,
            class: `color-token-${token}`,
          }
        },
      },
    }
  },
})
