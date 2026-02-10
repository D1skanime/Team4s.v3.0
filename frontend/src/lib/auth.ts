import type {
  User,
  AuthResponse,
  TokenResponse,
  RegisterData,
  LoginData,
  MeResponse,
  UserProfile,
  UpdateProfileData,
  UpdateProfileResponse,
  ChangePasswordData,
  UserRating,
  SubmitRatingResponse,
  WatchlistStatus,
  WatchlistEntry,
  WatchlistResponse,
  SyncWatchlistItem,
  SyncWatchlistResponse,
  CheckWatchlistResponse,
  CommentsResponse,
  CommentResponse,
  Comment,
  SendVerificationResponse,
  VerifyEmailResponse,
  DashboardStats,
  RecentActivityResponse,
  Anime,
  CreateAnimeRequest,
  UpdateAnimeRequest,
  AnimeResponse,
  Episode,
  EpisodeAdminListItem,
  EpisodeAdminListParams,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  EpisodeResponse,
  PaginatedResponse,
  UserAdminListItem,
  UserAdminDetail,
  UserAdminFilter,
  UpdateUserAdminRequest,
  UserAdminResponse,
  UsersAdminListResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090';

// Token storage keys
const ACCESS_TOKEN_KEY = 'team4s_access_token';
const REFRESH_TOKEN_KEY = 'team4s_refresh_token';

class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Token management
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

// API helper with auth
async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      message = errorData.error || message;
    } catch {
      // Ignore JSON parse errors
    }
    throw new AuthError(res.status, message);
  }

  return res.json();
}

// Auth API functions
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await fetchWithAuth<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  setTokens(response.access_token, response.refresh_token);
  return response;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetchWithAuth<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  setTokens(response.access_token, response.refresh_token);
  return response;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  try {
    await fetchWithAuth('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    // Ignore errors during logout
  } finally {
    clearTokens();
  }
}

export async function refreshTokens(): Promise<TokenResponse | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data: TokenResponse = await response.json();
    setTokens(data.access_token, data.refresh_token);
    return data;
  } catch {
    clearTokens();
    return null;
  }
}

export async function getMe(): Promise<User | null> {
  try {
    const response = await fetchWithAuth<MeResponse>('/api/v1/auth/me');
    return response.user;
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      // Try to refresh token
      const refreshed = await refreshTokens();
      if (refreshed) {
        try {
          const response = await fetchWithAuth<MeResponse>('/api/v1/auth/me');
          return response.user;
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

// Get user profile by username (public)
export async function getUserProfile(username: string): Promise<UserProfile> {
  return fetchWithAuth<UserProfile>(`/api/v1/users/${encodeURIComponent(username)}`);
}

// Update own profile
export async function updateProfile(data: UpdateProfileData): Promise<User> {
  const response = await fetchWithAuth<UpdateProfileResponse>('/api/v1/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.user;
}

// Change password
export async function changePassword(data: ChangePasswordData): Promise<void> {
  await fetchWithAuth('/api/v1/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Delete account
export async function deleteAccount(password: string): Promise<void> {
  await fetchWithAuth('/api/v1/users/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
  clearTokens();
}

// Email Verification API functions

// Send verification email to current user
// Returns remaining attempts in rate limit window
export async function sendVerificationEmail(): Promise<SendVerificationResponse> {
  return fetchWithAuth<SendVerificationResponse>('/api/v1/auth/send-verification', {
    method: 'POST',
  });
}

// Verify email with token from URL
// Token is one-time use
export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  const res = await fetch(`${API_BASE}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`);

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const errorData = await res.json();
      message = errorData.error || message;
    } catch {
      // Ignore JSON parse errors
    }
    throw new AuthError(res.status, message);
  }

  return res.json();
}

// Rating API functions

// Get current user's rating for an anime
export async function getUserRating(animeId: number): Promise<UserRating | null> {
  try {
    return await fetchWithAuth<UserRating>(`/api/v1/anime/${animeId}/rating/me`);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) {
      return null; // No rating exists
    }
    throw error;
  }
}

// Submit or update a rating
export async function submitRating(animeId: number, rating: number): Promise<SubmitRatingResponse> {
  return fetchWithAuth<SubmitRatingResponse>(`/api/v1/anime/${animeId}/rating`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  });
}

// Delete user's rating
export async function deleteRating(animeId: number): Promise<void> {
  await fetchWithAuth(`/api/v1/anime/${animeId}/rating`, {
    method: 'DELETE',
  });
}

// Watchlist API functions

// Get user's complete watchlist
export async function getWatchlist(): Promise<WatchlistResponse> {
  return fetchWithAuth<WatchlistResponse>('/api/v1/watchlist');
}

// Get watchlist status for a specific anime
export async function getWatchlistStatus(animeId: number): Promise<WatchlistEntry | null> {
  try {
    return await fetchWithAuth<WatchlistEntry>(`/api/v1/watchlist/${animeId}`);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) {
      return null; // Not in watchlist
    }
    throw error;
  }
}

// Add anime to watchlist (or update if already exists)
export async function addToWatchlist(animeId: number, status: WatchlistStatus): Promise<WatchlistEntry> {
  return fetchWithAuth<WatchlistEntry>(`/api/v1/watchlist/${animeId}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

// Update watchlist status
export async function updateWatchlistStatus(animeId: number, status: WatchlistStatus): Promise<WatchlistEntry> {
  return fetchWithAuth<WatchlistEntry>(`/api/v1/watchlist/${animeId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

// Remove from watchlist
export async function removeFromWatchlist(animeId: number): Promise<void> {
  await fetchWithAuth(`/api/v1/watchlist/${animeId}`, {
    method: 'DELETE',
  });
}

// Sync localStorage watchlist to backend
export async function syncWatchlist(items: SyncWatchlistItem[]): Promise<SyncWatchlistResponse> {
  return fetchWithAuth<SyncWatchlistResponse>('/api/v1/watchlist/sync', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

// Check watchlist status for multiple anime IDs
export async function checkWatchlist(animeIds: number[]): Promise<CheckWatchlistResponse> {
  return fetchWithAuth<CheckWatchlistResponse>('/api/v1/watchlist/check', {
    method: 'POST',
    body: JSON.stringify({ anime_ids: animeIds }),
  });
}

// Comment API functions

// Get comments for an anime (paginated)
export async function getComments(
  animeId: number,
  page: number = 1,
  perPage: number = 20
): Promise<CommentsResponse> {
  return fetchWithAuth<CommentsResponse>(
    `/api/v1/anime/${animeId}/comments?page=${page}&per_page=${perPage}`
  );
}

// Create a new comment
export async function createComment(
  animeId: number,
  message: string,
  replyToId?: number
): Promise<Comment> {
  const body: { message: string; reply_to_id?: number } = { message };
  if (replyToId) {
    body.reply_to_id = replyToId;
  }
  const response = await fetchWithAuth<CommentResponse>(
    `/api/v1/anime/${animeId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
  return response.data;
}

// Update an existing comment
export async function updateComment(
  animeId: number,
  commentId: number,
  message: string
): Promise<Comment> {
  const response = await fetchWithAuth<CommentResponse>(
    `/api/v1/anime/${animeId}/comments/${commentId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ message }),
    }
  );
  return response.data;
}

// Delete a comment
export async function deleteComment(
  animeId: number,
  commentId: number
): Promise<void> {
  await fetchWithAuth(`/api/v1/anime/${animeId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}

// Admin API functions

// Check if current user has admin access
export async function checkAdminAccess(): Promise<boolean> {
  try {
    await fetchWithAuth<{ message: string }>('/api/v1/admin/ping');
    return true;
  } catch (error) {
    if (error instanceof AuthError && (error.status === 403 || error.status === 401)) {
      return false;
    }
    throw error;
  }
}

// Get dashboard statistics (admin only)
export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchWithAuth<DashboardStats>('/api/v1/admin/dashboard/stats');
}

// Get recent activity (admin only)
export async function getRecentActivity(limit: number = 10): Promise<RecentActivityResponse> {
  return fetchWithAuth<RecentActivityResponse>(`/api/v1/admin/dashboard/activity?limit=${limit}`);
}

// Anime Management (admin only)

// Create a new anime
export async function createAnime(data: CreateAnimeRequest): Promise<Anime> {
  const response = await fetchWithAuth<AnimeResponse>('/api/v1/admin/anime', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

// Update an anime
export async function updateAnime(id: number, data: UpdateAnimeRequest): Promise<Anime> {
  const response = await fetchWithAuth<AnimeResponse>(`/api/v1/admin/anime/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

// Delete an anime
export async function deleteAnime(id: number): Promise<void> {
  await fetchWithAuth(`/api/v1/admin/anime/${id}`, {
    method: 'DELETE',
  });
}

// Episode Management (admin only)

// Get paginated list of episodes for admin
export async function getAdminEpisodes(
  params: EpisodeAdminListParams = {}
): Promise<PaginatedResponse<EpisodeAdminListItem>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.per_page) searchParams.set('per_page', params.per_page.toString());
  if (params.anime_id) searchParams.set('anime_id', params.anime_id.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchWithAuth<PaginatedResponse<EpisodeAdminListItem>>(
    `/api/v1/admin/episodes${query ? `?${query}` : ''}`
  );
}

// Create a new episode
export async function createEpisode(data: CreateEpisodeRequest): Promise<Episode> {
  const response = await fetchWithAuth<EpisodeResponse>('/api/v1/admin/episodes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data;
}

// Update an episode
export async function updateEpisode(id: number, data: UpdateEpisodeRequest): Promise<Episode> {
  const response = await fetchWithAuth<EpisodeResponse>(`/api/v1/admin/episodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

// Delete an episode
export async function deleteEpisode(id: number): Promise<void> {
  await fetchWithAuth(`/api/v1/admin/episodes/${id}`, {
    method: 'DELETE',
  });
}

// Upload API functions

// Upload cover image
export async function uploadCover(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ filename: string; url: string; size: number }> {
  const accessToken = getAccessToken();

  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.data);
        } catch {
          reject(new AuthError(xhr.status, 'Invalid response'));
        }
      } else {
        let message = `HTTP ${xhr.status}`;
        try {
          const errorData = JSON.parse(xhr.responseText);
          message = errorData.error || message;
        } catch {
          // Ignore parse errors
        }
        reject(new AuthError(xhr.status, message));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new AuthError(0, 'Network error'));
    });

    xhr.open('POST', `${API_BASE}/api/v1/admin/upload/cover`);
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }
    xhr.send(formData);
  });
}

// Delete cover image
export async function deleteCover(filename: string): Promise<void> {
  await fetchWithAuth(`/api/v1/admin/upload/cover/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
}

// ========== Admin User Management Functions ==========

// Get paginated list of users for admin
export async function getAdminUsers(
  params: UserAdminFilter = {}
): Promise<UsersAdminListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.per_page) searchParams.set('per_page', params.per_page.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.role) searchParams.set('role', params.role);
  if (params.status) searchParams.set('status', params.status);
  if (params.verified) searchParams.set('verified', params.verified);
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params.sort_dir) searchParams.set('sort_dir', params.sort_dir);

  const query = searchParams.toString();
  return fetchWithAuth<UsersAdminListResponse>(
    `/api/v1/admin/users${query ? `?${query}` : ''}`
  );
}

// Get single user details for admin
export async function getAdminUser(id: number): Promise<UserAdminDetail> {
  const response = await fetchWithAuth<UserAdminResponse>(`/api/v1/admin/users/${id}`);
  return response.data;
}

// Update user as admin
export async function updateAdminUser(
  id: number,
  data: UpdateUserAdminRequest
): Promise<UserAdminDetail> {
  const response = await fetchWithAuth<UserAdminResponse>(`/api/v1/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data;
}

// Delete user as admin (soft delete by default)
export async function deleteAdminUser(id: number, hardDelete: boolean = false): Promise<void> {
  await fetchWithAuth(`/api/v1/admin/users/${id}${hardDelete ? '?hard=true' : ''}`, {
    method: 'DELETE',
  });
}

// Ban user
export async function banUser(id: number): Promise<void> {
  await fetchWithAuth(`/api/v1/admin/users/${id}/ban`, {
    method: 'POST',
  });
}

// Unban user
export async function unbanUser(id: number): Promise<void> {
  await fetchWithAuth(`/api/v1/admin/users/${id}/unban`, {
    method: 'POST',
  });
}

// Auth client object for convenience
export const authClient = {
  register,
  login,
  logout,
  refreshTokens,
  getMe,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isAuthenticated,
  getUserProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  // Rating functions
  getUserRating,
  submitRating,
  deleteRating,
  // Watchlist functions
  getWatchlist,
  getWatchlistStatus,
  addToWatchlist,
  updateWatchlistStatus,
  removeFromWatchlist,
  syncWatchlist,
  checkWatchlist,
  // Comment functions
  getComments,
  createComment,
  updateComment,
  deleteComment,
  // Email verification functions
  sendVerificationEmail,
  verifyEmail,
  // Admin functions
  checkAdminAccess,
  getDashboardStats,
  getRecentActivity,
  // Admin anime management
  createAnime,
  updateAnime,
  deleteAnime,
  // Admin episode management
  getAdminEpisodes,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  // Upload functions
  uploadCover,
  deleteCover,
  // Admin user management
  getAdminUsers,
  getAdminUser,
  updateAdminUser,
  deleteAdminUser,
  banUser,
  unbanUser,
};

export { AuthError };
