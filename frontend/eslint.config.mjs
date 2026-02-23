import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // App Router project: no /pages directory.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
]

export default config
