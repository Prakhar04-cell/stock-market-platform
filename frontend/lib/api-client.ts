// Centralized API Client for BullRun Frontend
// NEVER expose secrets, database credentials, or broker private keys here.

const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://tradex-backend-k2tw.onrender.com"
    : typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:8000");

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "").replace(/\/api\/v1\/?$/, "");

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any> | any[];
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  success?: boolean;
}

interface CustomRequestInit extends Omit<RequestInit, "body"> {
  body?: any;
  _isRetry?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bullrun_token") || localStorage.getItem("tradex_token");
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bullrun_refresh_token") || localStorage.getItem("tradex_refresh_token");
}

export function setAuthTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bullrun_token", accessToken);
  localStorage.setItem("tradex_token", accessToken); // compatibility
  if (refreshToken) {
    localStorage.setItem("bullrun_refresh_token", refreshToken);
    localStorage.setItem("tradex_refresh_token", refreshToken); // compatibility
  }
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("bullrun_token");
  localStorage.removeItem("tradex_token");
  localStorage.removeItem("bullrun_refresh_token");
  localStorage.removeItem("tradex_refresh_token");
  try {
    sessionStorage.removeItem("bullrun_positions_cache");
  } catch {}
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearAuthTokens();
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      setAuthTokens(data.access_token, data.refresh_token);
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: CustomRequestInit = {}
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  let token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let serializedBody = options.body;
  if (
    options.body !== undefined &&
    typeof options.body === "object" &&
    !(typeof FormData !== "undefined" && options.body instanceof FormData) &&
    !(typeof Blob !== "undefined" && options.body instanceof Blob) &&
    !(typeof ArrayBuffer !== "undefined" && options.body instanceof ArrayBuffer)
  ) {
    serializedBody = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    body: serializedBody,
    headers,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  // Handle 401 Unauthorized / Token Expiration: Attempt seamless refresh
  if (response.status === 401 && !options._isRetry && typeof window !== "undefined" && !endpoint.includes("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      return apiRequest<T>(endpoint, {
        ...options,
        _isRetry: true,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMessage = "Request failed";
    if (typeof data?.detail === "string") {
      errorMessage = data.detail;
      // Convert raw JWT expired message to clean user-facing guidance
      if (errorMessage.toLowerCase().includes("signature has expired") || errorMessage.toLowerCase().includes("could not validate credentials")) {
        errorMessage = "Your trading session has expired. Please sign in again to continue.";
      }
    } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
      errorMessage = data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
    } else if (data?.message) {
      errorMessage = data.message;
    } else if (response.statusText) {
      errorMessage = response.statusText;
    }

    const error: ApiError = data?.error || {
      code: `HTTP_${response.status}`,
      message: errorMessage,
      details: data?.detail || data,
    };
    throw error;
  }

  return data as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

export default apiRequest;
