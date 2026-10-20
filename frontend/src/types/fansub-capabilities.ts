export interface FansubGroupCapabilities {
  can_edit_group: boolean;
  can_edit_group_general: boolean;
  can_edit_technical_links: boolean;
  can_edit_founding_history: boolean;
  can_update_group_links: boolean;
  can_manage_links: boolean;
  can_view_members: boolean;
  can_manage_members: boolean;
  can_manage_historical_members: boolean;
  can_manage_historical_roles: boolean;
  can_link_historical_members: boolean;
  can_edit_notes: boolean;
  can_edit_project_timeline: boolean;
  can_view_invitations: boolean;
  can_create_invitation: boolean;
  can_cancel_invitation: boolean;
  can_view_releases: boolean;
  can_view_release_media: boolean;
  can_upload_release_media: boolean;
  can_review_group_media?: boolean;
  can_review_text?: boolean;
  can_edit_release_notes: boolean;
  can_view_group_media: boolean;
  can_upload_group_media: boolean;
  can_update_group_media: boolean;
  can_update_own_group_media: boolean;
  can_delete_own_group_media: boolean;
  can_delete_group_media: boolean;
  can_reorder_group_media: boolean;
}

export interface FansubGroupCapabilitiesResponse {
  data: FansubGroupCapabilities;
}
