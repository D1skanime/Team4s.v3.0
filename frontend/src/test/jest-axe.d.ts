declare module 'jest-axe' {
  import type { AxeResults, RunOptions } from 'axe-core'

  export function axe(html: Element | string, options?: RunOptions): Promise<AxeResults>

  export const toHaveNoViolations: {
    toHaveNoViolations(this: unknown, results: AxeResults): { pass: boolean; message: () => string }
  }

  export function configureAxe(options?: RunOptions & { globalOptions?: Record<string, unknown> }): typeof axe
}

declare namespace jest {
  interface Matchers<R> {
    toHaveNoViolations(): R
  }
}
