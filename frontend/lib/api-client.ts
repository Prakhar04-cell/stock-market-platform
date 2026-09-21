// Centralized API Client for TradeX Frontend
// NEVER expose secrets, database credentials, or broker private keys here.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

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

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const token = typeof window !== "undefined" ? localStorage.getItem("tradex_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMessage = "Request failed";
    if (typeof data?.detail === "string") {
      errorMessage = data.detail;
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
