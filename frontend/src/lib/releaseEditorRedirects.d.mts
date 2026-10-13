export interface RedirectRule {
  source: string
  destination: string
  permanent: boolean
}

export function buildReleaseEditorRedirects(): RedirectRule[]
