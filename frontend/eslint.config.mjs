import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

// Guard: user-facing UI muss die globalen Primitives aus @/components/ui nutzen
// (Button, Select, FormField, Modal, Input, Textarea, Tabs, Drawer ...).
// Handgebaute native <select>/<input>/<textarea> in .tsx sind verpoent.
// Vorerst als 'warn' (es gibt ~17 Altfaelle ausserhalb components/ui) — nach deren
// Migration in der UI-Phase auf 'error' anheben. Siehe Todo
// .planning/todos/pending/2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md
const uiPrimitiveGuard = [
  'warn',
  {
    selector: "JSXOpeningElement[name.name='select']",
    message: 'Natives <select> verboten — nutze <Select> aus @/components/ui (Referenz: /dev/ui-system).',
  },
  {
    selector: "JSXOpeningElement[name.name='input']",
    message: 'Natives <input> verboten — nutze <Input> aus @/components/ui (Referenz: /dev/ui-system).',
  },
  {
    selector: "JSXOpeningElement[name.name='textarea']",
    message: 'Natives <textarea> verboten — nutze <Textarea> aus @/components/ui (Referenz: /dev/ui-system).',
  },
]

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // App Router project: no /pages directory.
      '@next/next/no-html-link-for-pages': 'off',
      // Globales UI erzwingen (siehe oben).
      'no-restricted-syntax': uiPrimitiveGuard,
    },
  },
  {
    // Die Primitive-Definitionen selbst kapseln die nativen Elemente — hier erlaubt.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
]

export default config
