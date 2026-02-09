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
};

export { AuthError };
