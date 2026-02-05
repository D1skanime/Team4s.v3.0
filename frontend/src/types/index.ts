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
