export interface ReleaseEditorRedirect {
  source: string
  destination: string
  permanent: boolean
}

export function buildReleaseEditorRedirects(): ReleaseEditorRedirect[]
