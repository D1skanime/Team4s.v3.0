export type DomainProjectionProfileStatus =
  | "active"
  | "historical"
  | "memorial";

export type DomainProjectionDisputeState = "none" | "open" | "resolved";

export type DomainProjectionReviewStatus =
  | "in_review"
  | "approved"
  | "rejected"
  | "archived"
  | "removed";

export interface DomainProjectionMemberRow {
  id: number;
  member_id: number | null;
  member_display_name: string;
  member_slug: string | null;
  roles: string[];
  role_labels: string[];
  status: string;
  profile_status: DomainProjectionProfileStatus;
  claimed: boolean;
}

export interface DomainProjectionHistoricalRow {
  id: number;
  member_id: number;
  member_display_name: string;
  member_slug: string | null;
  roles: string[];
  role_labels: string[];
  joined_year: number | null;
  left_year: number | null;
  status: string;
  profile_status: DomainProjectionProfileStatus;
  claimed: boolean;
}

export interface DomainProjectionContributorRow {
  id: number;
  anime_id: number;
  anime_title: string;
  member_id: number;
  member_display_name: string;
  member_slug: string | null;
  roles: string[];
  role_labels: string[];
  started_year: number | null;
  ended_year: number | null;
  status: string;
  dispute_state: DomainProjectionDisputeState;
  visibility: string;
  review_status: DomainProjectionReviewStatus;
}

export interface DomainProjectionResponse {
  members: DomainProjectionMemberRow[];
  historical: DomainProjectionHistoricalRow[];
  contributors: DomainProjectionContributorRow[];
}
