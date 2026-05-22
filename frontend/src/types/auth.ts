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
  app_user_id?: number
  display_name: string
  session_id?: string | null
}

export interface AuthTokenResponse {
  data: AuthTokenData
}

export interface CurrentUserData {
  app_user_id: number
  legacy_user_id: number
  display_name: string
  email: string
  keycloak_subject: string
  status: 'pending' | 'active' | 'disabled'
  global_roles: string[]
  is_platform_admin: boolean
  session_id?: string | null
}

export interface CurrentUserResponse {
  data: CurrentUserData
}
