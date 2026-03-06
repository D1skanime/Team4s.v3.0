export type GroupAssetMediaType = "opening" | "ending" | "karaoke" | "insert";

export interface GroupAssetHero {
  backdrop_url?: string | null;
  primary_url?: string | null;
  poster_url?: string | null;
}

export interface GroupAssetImage {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url: string;
  width?: number | null;
  height?: number | null;
  order: number;
}

export interface GroupAssetMedia {
  id: string;
  type: GroupAssetMediaType;
  title: string;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  order: number;
  stream_path: string;
}

export interface GroupEpisodeAssets {
  release_id?: number | null;
  episode_id?: number | null;
  episode_number: number;
  title?: string | null;
  folder_name: string;
  folder_path: string;
  images: GroupAssetImage[];
  media_assets: GroupAssetMedia[];
}

export interface GroupAssetsData {
  anime_id: number;
  group_id: number;
  folder_name: string;
  hero: GroupAssetHero;
  episodes: GroupEpisodeAssets[];
}

export interface GroupAssetsResponse {
  data: GroupAssetsData;
}
