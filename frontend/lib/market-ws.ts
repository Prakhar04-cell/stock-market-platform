import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "./api-client";
import { normalizeStockSymbol } from "./utils";

export interface WsPriceUpdate {
  type: string;
  instrument_key: string;
  symbol: string;
  ltp: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  timestamp: string;
  source: string;
}

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR";

function getWsUrl(): string {
  const protocol = API_BASE_URL.startsWith("https://") ? "wss://" : "ws://";
  const host = API_BASE_URL.replace(/^https?:\/\//, "");
  return `${protocol}${host}/api/v1/ws/market`;
}

class MarketWsManager {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<(update: WsPriceUpdate) => void>> = new Map();
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private subscribedKeys: Set<string> = new Set();
  private connectionState: ConnectionState = "DISCONNECTED";
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 10000;
  private verifiedConnection = false;

  public getState(): ConnectionState {
    return this.connectionState;
  }

  public addStateListener(listener: (state: ConnectionState) => void) {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(state: ConnectionState) {
    this.connectionState = state;
    this.stateListeners.forEach((l) => l(state));
  }

  public connect() {
    if (typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setState("CONNECTING");
    try {
      const url = getWsUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setState("CONNECTED");
        this.reconnectAttempts = 0;
        // Resubscribe to all active keys
        if (this.subscribedKeys.size > 0) {
          this.sendSubscription("subscribe", Array.from(this.subscribedKeys));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);

          // Handle subscription confirmation or ping/pong
          if (raw.type === "subscribed" || raw.type === "pong") {
            this.setState("CONNECTED");
            return;
          }

          // Backend quote messages arrive as { type: "quote", data: { ... } }
          // or fallback top-level fields: { type: "price_update", instrument_key, ... }
          const payload = (raw.type === "quote" && raw.data) ? raw.data : raw;

          if (payload && (payload.instrument_key || payload.symbol)) {
            const rawLtp = payload.ltp;
            const numLtp = typeof rawLtp === "string" ? parseFloat(rawLtp) : Number(rawLtp || 0);

            const update: WsPriceUpdate = {
              type: "price_update",
              instrument_key: payload.instrument_key || "",
              symbol: normalizeStockSymbol(payload.symbol || ""),
              ltp: numLtp,
              open: payload.open !== undefined ? Number(payload.open) : undefined,
              high: payload.high !== undefined ? Number(payload.high) : undefined,
              low: payload.low !== undefined ? Number(payload.low) : undefined,
              close: payload.close !== undefined ? Number(payload.close) : undefined,
              change: payload.change !== undefined ? Number(payload.change) : undefined,
              change_percent: payload.change_percent !== undefined ? Number(payload.change_percent) : undefined,
              volume: payload.volume !== undefined ? Number(payload.volume) : undefined,
              timestamp: payload.timestamp || new Date().toISOString(),
              source: payload.source || "upstox",
            };

            // Notify subscribers for both symbol variants and instrument key
            const targetKeys = new Set<string>();
            if (update.instrument_key) {
              targetKeys.add(update.instrument_key);
              targetKeys.add(update.instrument_key.toUpperCase());
            }
            if (update.symbol) {
              targetKeys.add(update.symbol);
              targetKeys.add(update.symbol.toUpperCase());
            }

            targetKeys.forEach((key) => {
              const listeners = this.subscribers.get(key);
              if (listeners) {
                listeners.forEach((fn) => fn(update));
              }
            });

          }
        } catch {
          // Non-json or binary heartbeat
        }
      };

      this.ws.onclose = () => {
        this.setState("DISCONNECTED");
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setState("ERROR");
        this.ws?.close();
      };
    } catch {
      this.setState("ERROR");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private sendSubscription(action: "subscribe" | "unsubscribe", keys: string[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && keys.length > 0) {
      const normalizedKeys = keys.map(normalizeStockSymbol).filter(Boolean);
      // Send both 'symbols' (expected by backend) and 'keys' for full compatibility
      this.ws.send(
        JSON.stringify({
          action,
          symbols: normalizedKeys,
          keys: normalizedKeys,
        })
      );
    }
  }

  public subscribe(keyOrSymbol: string, callback: (update: WsPriceUpdate) => void) {
    const key = normalizeStockSymbol(keyOrSymbol);
    if (!key) return () => {};

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    if (!this.subscribedKeys.has(key)) {
      this.subscribedKeys.add(key);
      this.sendSubscription("subscribe", [key]);
    }

    // Ensure websocket is connected
    this.connect();

    return () => {
      const set = this.subscribers.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscribers.delete(key);
          this.subscribedKeys.delete(key);
          this.sendSubscription("unsubscribe", [key]);
        }
      }
    };
  }
}

export const marketWs = new MarketWsManager();

export function useMarketWebSocket(keyOrSymbol?: string, onUpdate?: (update: WsPriceUpdate) => void) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(marketWs.getState());
  const [lastUpdate, setLastUpdate] = useState<WsPriceUpdate | null>(null);

  // Store onUpdate in ref to prevent hook re-triggering and subscription thrashing
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const normalizedKey = keyOrSymbol ? normalizeStockSymbol(keyOrSymbol) : undefined;

  useEffect(() => {
    const unsubState = marketWs.addStateListener(setConnectionState);
    return unsubState;
  }, []);

  useEffect(() => {
    if (!normalizedKey) return;

    const handlePrice = (update: WsPriceUpdate) => {
      setLastUpdate(update);
      onUpdateRef.current?.(update);
    };

    const unsubscribe = marketWs.subscribe(normalizedKey, handlePrice);
    return unsubscribe;
  }, [normalizedKey]);

  return { connectionState, lastUpdate };
}

