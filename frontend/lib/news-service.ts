import { apiRequest } from "./api-client";

export interface NewsHeadlineItem {
  id: string;
  headline: string;
  publisher: string;
  published_at: string;
  original_url: string;
  related_symbols?: string[];
}

export interface NewsFeedResponse {
  items: NewsHeadlineItem[];
  total: number;
  page: number;
  limit: number;
  cached: boolean;
  provider: string;
  status: "ok" | "no_token" | "rate_limited" | "invalid_token" | "provider_error" | "empty";
  message?: string;
  retrieved_at: string;
}

export async function fetchMarketNews(
  symbol?: string,
  limit: number = 10,
  page: number = 1
): Promise<NewsFeedResponse> {
  const params = new URLSearchParams();
  if (symbol && symbol.trim()) {
    params.set("symbol", symbol.trim().toUpperCase());
  }
  params.set("limit", limit.toString());
  if (page > 1) {
    params.set("page", page.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/v1/news${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await apiRequest<NewsFeedResponse>(endpoint);
    if (res && res.status) {
      return res;
    }
    return {
      items: [],
      total: 0,
      page,
      limit,
      cached: false,
      provider: "Marketaux",
      status: "provider_error",
      message: "Unexpected response format from news service.",
      retrieved_at: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      items: [],
      total: 0,
      page,
      limit,
      cached: false,
      provider: "Marketaux",
      status: "provider_error",
      message: err.message || "Failed to communicate with news service.",
      retrieved_at: new Date().toISOString(),
    };
  }
}
