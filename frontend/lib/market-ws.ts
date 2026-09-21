import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE_URL } from "./api-client";

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

export type ConnectionState = "CONNECTING" | "CONNECTED" | "DISCONNECTED";

function getWsUrl(): string {
  const base = API_BASE_URL.replace(/^http/, "ws");
  return `${base}/api/v1/ws/market`;
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
          const data = JSON.parse(event.data);
          if (data.type === "price_update" && data.instrument_key) {
            const listeners = this.subscribers.get(data.instrument_key);
            if (listeners) {
              listeners.forEach((fn) => fn(data));
            }
            // Also notify by symbol if available
            if (data.symbol) {
              const symListeners = this.subscribers.get(data.symbol.toUpperCase());
              if (symListeners) {
                symListeners.forEach((fn) => fn(data));
              }
            }
          }
        } catch {
          // Non-json or heartbeat message
        }
      };

      this.ws.onclose = () => {
        this.setState("DISCONNECTED");
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.setState("DISCONNECTED");
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
      this.ws.send(JSON.stringify({ action, keys }));
    }
  }

  public subscribe(keyOrSymbol: string, callback: (update: WsPriceUpdate) => void) {
    const key = keyOrSymbol.trim();
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

  useEffect(() => {
    const unsubState = marketWs.addStateListener(setConnectionState);
    return unsubState;
  }, []);

  useEffect(() => {
    if (!keyOrSymbol) return;

    const handlePrice = (update: WsPriceUpdate) => {
      setLastUpdate(update);
      if (onUpdate) {
        onUpdate(update);
      }
    };

    const unsubscribe = marketWs.subscribe(keyOrSymbol, handlePrice);
    return unsubscribe;
  }, [keyOrSymbol, onUpdate]);

  return { connectionState, lastUpdate };
}
