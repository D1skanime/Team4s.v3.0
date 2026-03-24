export type ManualAnimeDraftStateKey = 'empty' | 'incomplete' | 'ready'

export interface ManualAnimeDraftInput {
  title?: string | null
  cover_image?: string | null
}

export interface ManualAnimeDraftState {
  key: ManualAnimeDraftStateKey
  canSubmit: boolean
}

export function resolveManualCreateState(_input: ManualAnimeDraftInput): ManualAnimeDraftState {
  return {
    key: 'empty',
    canSubmit: false,
  }
}
