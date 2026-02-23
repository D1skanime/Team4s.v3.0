export interface AuthIssueRequest {
  issue_key?: string
}

export interface AuthRefreshRequest {
  refresh_token: string
}

export interface AuthRevokeRequest {
  refresh_token?: string
}

export interface AuthTokenData {
  token_type: 'Bearer'
  access_token: string
  access_token_expires_at: number
  access_token_expires_in: number
  refresh_token: string
  refresh_token_expires_at: number
  refresh_token_expires_in: number
  user_id: number
  display_name: string
}

export interface AuthTokenResponse {
  data: AuthTokenData
}
