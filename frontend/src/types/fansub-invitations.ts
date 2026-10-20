import type { FansubGroupMemberIdentity, FansubGroupRoleCode } from "./fansub";

export interface FansubGroupInvitation {
  id: number;
  fansub_group_id: number;
  email: string;
  invited_role_codes: FansubGroupRoleCode[];
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  expires_at: string;
  created_by_app_user_id?: number | null;
  accepted_by_app_user_id?: number | null;
  cancelled_by_app_user_id?: number | null;
  accepted_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  member?: FansubGroupMemberIdentity | null;
}

export interface FansubGroupInvitationListResponse {
  data: FansubGroupInvitation[];
}

export interface FansubGroupInvitationCreateRequest {
  email: string;
  invited_role_codes: FansubGroupRoleCode[];
}

export interface FansubGroupInvitationCreateResponse {
  data: {
    id: number;
    email: string;
    invited_role_codes: FansubGroupRoleCode[];
    status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    expires_at: string;
    invite_link: string;
  };
}

export interface FansubGroupInvitationResponse {
  data: FansubGroupInvitation;
}

export interface AcceptFansubInvitationRequest {
  token: string;
}

export interface AcceptFansubInvitationResponse {
  data: {
    accepted: boolean;
    fansub_group_id: number;
  };
}
