// Anime Types
export interface Anime {
  id: number;
  anisearch_id?: string;
  title: string;
  title_de?: string;
  title_en?: string;
  type: AnimeType;
  content_type: ContentType;
  status: AnimeStatus;
  year?: number;
  max_episodes: number;
  genre?: string;
  source?: string;
  description?: string;
  cover_image?: string;
  folder_name?: string;
  sub_comment?: string;
  stream_comment?: string;
  is_self_subbed: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnimeListItem {
  id: number;
  title: string;
  type: AnimeType;
  status: AnimeStatus;
  year?: number;
  cover_image?: string;
  max_episodes: number;
}

export type AnimeType = 'tv' | 'film' | 'ova' | 'ona' | 'special' | 'bonus';
export type AnimeStatus = 'ongoing' | 'done' | 'aborted' | 'licensed' | 'disabled';
export type ContentType = 'anime' | 'hentai';

// Pagination
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// API Response
export interface ApiResponse<T> {
  data: T;
}

// Filter Types
export interface AnimeListParams {
  page?: number;
  per_page?: number;
  letter?: string;
  content_type?: ContentType;
  status?: AnimeStatus;
  type?: AnimeType;
}

// Episode Types
export interface Episode {
  id: number;
  anime_id: number;
  episode_number: string;
  title?: string;
  filename?: string;
  stream_links: string[];
  status: EpisodeStatus;
  view_count: number;
  download_count: number;
  progress: FansubProgress;
  created_at: string;
  updated_at: string;
}

export interface FansubProgress {
  raw: number;
  translate: number;
  time: number;
  typeset: number;
  logo: number;
  edit: number;
  karatime: number;
  karafx: number;
  qc: number;
  encode: number;
}

export type EpisodeStatus = 'disabled' | 'private' | 'public';

export interface EpisodesResponse {
  data: Episode[];
  meta: { total: number };
}

// Search Types
export interface SearchMeta {
  total: number;
  query: string;
}

export interface SearchResponse<T> {
  data: T[];
  meta: SearchMeta;
}

export interface SearchParams {
  q: string;
  limit?: number;
}

// Related Anime Types
export interface RelatedAnime {
  id: number;
  title: string;
  type: string;
  status: string;
  year: number | null;
  cover_image: string | null;
  relation_type: string;
}

// Episode Detail Types
export interface AnimeMinimal {
  id: number;
  title: string;
  cover_image?: string;
}

export interface EpisodeDetail {
  id: number;
  anime_id: number;
  episode_number: string;
  title?: string;
  filename?: string;
  status: EpisodeStatus;
  view_count: number;
  download_count: number;
  stream_links: string[];
  stream_links_legacy?: string;
  fansub_progress: FansubProgress;
  anime: AnimeMinimal;
  created_at: string;
  updated_at: string;
}

export interface EpisodeDetailResponse {
  data: EpisodeDetail;
}

// Watchlist Types
export type WatchlistStatus = 'watching' | 'done' | 'break' | 'planned' | 'dropped';

// LocalStorage watchlist item (legacy format)
export interface WatchlistItem {
  animeId: number;
  status: WatchlistStatus;
  addedAt: string;
  updatedAt: string;
}

// Backend watchlist entry
export interface WatchlistEntry {
  id: number;
  anime_id: number;
  user_id: number;
  status: WatchlistStatus;
  created_at: string;
  updated_at: string;
}

// Backend watchlist item with anime info
export interface BackendWatchlistItem {
  id: number;
  anime_id: number;
  status: WatchlistStatus;
  created_at: string;
  updated_at: string;
  anime?: {
    id: number;
    title: string;
    type: string;
    status: string;
    year: number | null;
    cover_image: string | null;
    max_episodes: number;
  };
}

// Backend watchlist response
export interface WatchlistResponse {
  data: BackendWatchlistItem[];
  meta: {
    total: number;
    by_status: Record<WatchlistStatus, number>;
  };
}

// Sync request/response
export interface SyncWatchlistItem {
  anime_id: number;
  status: WatchlistStatus;
  added_at: string;
  updated_at: string;
}

export interface SyncWatchlistResponse {
  synced: number;
  skipped: number;
  invalid: number;
}

// Check watchlist status for multiple anime
export interface CheckWatchlistResponse {
  statuses: Record<number, WatchlistStatus>;
}

export const WATCHLIST_STATUS_LABELS: Record<WatchlistStatus, string> = {
  watching: 'Schaue ich',
  done: 'Gesehen',
  break: 'Pausiert',
  planned: 'Geplant',
  dropped: 'Abgebrochen',
};

export const WATCHLIST_STATUS_COLORS: Record<WatchlistStatus, string> = {
  watching: '#3b82f6',
  done: '#22c55e',
  break: '#eab308',
  planned: '#6b7280',
  dropped: '#ef4444',
};

// Rating Types
export interface AnimeRating {
  anime_id: number;
  average: number;      // 0.0 - 10.0
  count: number;        // Number of ratings
  distribution: Record<number, number>;  // Rating value (1-10) -> count
}

// User's individual rating for an anime
export interface UserRating {
  anime_id: number;
  user_id: number;
  rating: number;       // 1-10
  created_at: string;
  updated_at: string;
}

// Request to submit a rating
export interface SubmitRatingRequest {
  rating: number;       // 1-10
}

// Response after submitting a rating
export interface SubmitRatingResponse {
  rating: UserRating;
  anime_rating: AnimeRating;
}

// Auth Types
export interface User {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  email_verified: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

export interface LoginData {
  login: string;  // Username or email
  password: string;
}

export interface MeResponse {
  user: User;
}

// User Profile Types
export interface UserStats {
  anime_watched: number;
  anime_watching: number;
  ratings_count: number;
  comments_count: number;
}

export interface UserProfile {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  stats: UserStats;
}

export interface UpdateProfileData {
  display_name?: string;
  avatar_url?: string;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileResponse {
  user: User;
}

// Comment Types
export interface CommentAuthor {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

export interface Comment {
  id: number;
  anime_id: number;
  message: string;
  reply_to_id?: number;
  author: CommentAuthor;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentsMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CommentsResponse {
  data: Comment[];
  meta: CommentsMeta;
}

export interface CommentResponse {
  data: Comment;
}

export interface CreateCommentRequest {
  message: string;
  reply_to_id?: number;
}

export interface UpdateCommentRequest {
  message: string;
}

// Comment validation constants
export const MAX_COMMENT_LENGTH = 2000;
export const MIN_COMMENT_LENGTH = 1;

// Email Verification Types
export interface SendVerificationResponse {
  message: string;
  remaining: number; // Remaining attempts in rate limit window
}

export interface VerifyEmailResponse {
  message: string;
  verified: boolean;
}

export interface VerificationErrorResponse {
  error: string;
  retry_after?: number; // Seconds until rate limit resets
}

// Admin Types
export interface DashboardStats {
  total_users: number;
  total_anime: number;
  total_episodes: number;
  total_comments: number;
  total_ratings: number;
  new_users: number;
  new_comments: number;
  new_ratings: number;
  active_users: number;
  anime_by_status: {
    airing: number;
    completed: number;
    upcoming: number;
    unknown: number;
  };
}

export interface RecentActivity {
  type: 'comment' | 'rating' | 'user';
  user_id: number;
  username: string;
  anime_id?: number;
  anime_title?: string;
  created_at: string;
}

export interface RecentActivityResponse {
  activities: RecentActivity[];
}

// Anime Admin Types
export interface CreateAnimeRequest {
  title: string;
  title_de?: string;
  title_en?: string;
  type: AnimeType;
  content_type: ContentType;
  status: AnimeStatus;
  year?: number;
  max_episodes: number;
  genre?: string;
  source?: string;
  description?: string;
  cover_image?: string;
  folder_name?: string;
  sub_comment?: string;
  stream_comment?: string;
  is_self_subbed: boolean;
  anisearch_id?: string;
}

export interface UpdateAnimeRequest {
  title?: string;
  title_de?: string;
  title_en?: string;
  type?: AnimeType;
  content_type?: ContentType;
  status?: AnimeStatus;
  year?: number;
  max_episodes?: number;
  genre?: string;
  source?: string;
  description?: string;
  cover_image?: string;
  folder_name?: string;
  sub_comment?: string;
  stream_comment?: string;
  is_self_subbed?: boolean;
  anisearch_id?: string;
}

export interface AnimeResponse {
  data: Anime;
}
