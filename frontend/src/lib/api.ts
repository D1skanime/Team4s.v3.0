import type {
  AnimeListItem,
  Anime,
  Episode,
  PaginatedResponse,
  ApiResponse,
  AnimeListParams,
  EpisodesResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new ApiError(res.status, errorText || `HTTP ${res.status}`);
  }

  return res.json();
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const api = {
  // Anime List
  getAnimeList: (params: AnimeListParams = {}): Promise<PaginatedResponse<AnimeListItem>> => {
    const query = buildQueryString({
      page: params.page || 1,
      per_page: params.per_page || 24,
      letter: params.letter,
      content_type: params.content_type || 'anime',
      status: params.status,
      type: params.type,
    });
    return fetchApi(`/api/v1/anime${query}`);
  },

  // Anime Detail
  getAnime: (id: number): Promise<ApiResponse<Anime>> => {
    return fetchApi(`/api/v1/anime/${id}`);
  },

  // Episodes by Anime
  getEpisodes: (animeId: number): Promise<EpisodesResponse> => {
    return fetchApi(`/api/v1/anime/${animeId}/episodes`);
  },
};

export { ApiError };
