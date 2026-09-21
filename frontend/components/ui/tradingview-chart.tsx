"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
} from "lightweight-charts";
import { apiRequest } from "@/lib/api-client";
import { marketWs, WsPriceUpdate } from "@/lib/market-ws";
import { AlertCircle, RefreshCw } from "lucide-react";

export interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  className?: string;
}

interface RawCandle {
  timestamp: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number;
}

export function TradingViewChart({
  symbol,
  interval = "1D",
  height = 360,
  className = "",
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const lastBarRef = useRef<{ time: Time; open: number; high: number; low: number; close: number; volume: number } | null>(null);

  const fetchAndSetCandles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<RawCandle[]>(
        `/api/v1/market/candles/${encodeURIComponent(symbol)}?interval=${interval}`
      );

      if (!data || data.length === 0) {
        setHasData(false);
        setIsLoading(false);
        return;
      }

      // Format and sort candles ascending by timestamp
      const formattedCandles: CandlestickData<Time>[] = [];
      const formattedVolumes: HistogramData<Time>[] = [];
      const seenTimes = new Set<number>();

      const isIntraday = interval.includes("m") || interval.includes("h");

      for (const item of data) {
        const dateObj = new Date(item.timestamp);
        const unixSec = Math.floor(dateObj.getTime() / 1000);
        if (isNaN(unixSec) || seenTimes.has(unixSec)) continue;
        seenTimes.add(unixSec);

        const timeVal = (isIntraday
          ? unixSec
          : item.timestamp.split("T")[0]) as Time;

        const open = typeof item.open === "string" ? parseFloat(item.open) : item.open;
        const high = typeof item.high === "string" ? parseFloat(item.high) : item.high;
        const low = typeof item.low === "string" ? parseFloat(item.low) : item.low;
        const close = typeof item.close === "string" ? parseFloat(item.close) : item.close;

        formattedCandles.push({
          time: timeVal,
          open,
          high,
          low,
          close,
        });

        formattedVolumes.push({
          time: timeVal,
          value: item.volume || 0,
          color: close >= open ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)",
        });
      }

      if (formattedCandles.length > 0 && candleSeriesRef.current && volumeSeriesRef.current) {
        candleSeriesRef.current.setData(formattedCandles);
        volumeSeriesRef.current.setData(formattedVolumes);
        chartRef.current?.timeScale().fitContent();

        const last = formattedCandles[formattedCandles.length - 1];
        const lastVol = formattedVolumes[formattedVolumes.length - 1];
        lastBarRef.current = {
          time: last.time,
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
          volume: lastVol.value,
        };
        setHasData(true);
      } else {
        setHasData(false);
      }
    } catch (err: any) {
      setError(err?.message || "Market data stream disconnected or historical candles unavailable.");
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, interval]);

  // Initialize Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#64748b",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: interval.includes("m") || interval.includes("h"),
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "#94a3b8",
          width: 1,
          style: 3,
          labelBackgroundColor: "#334155",
        },
        horzLine: {
          color: "#94a3b8",
          width: 1,
          style: 3,
          labelBackgroundColor: "#334155",
        },
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle container resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: height,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);
    handleResize();

    // Fetch initial candles
    fetchAndSetCandles();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [fetchAndSetCandles, height, interval]);

  // Live WebSocket Tick Subscription
  useEffect(() => {
    if (!symbol) return;

    const handleTick = (update: WsPriceUpdate) => {
      if (!candleSeriesRef.current || !lastBarRef.current) return;

      const price = typeof update.ltp === "string" ? parseFloat(update.ltp) : update.ltp;
      if (!price || isNaN(price)) return;

      const last = lastBarRef.current;
      const updatedBar: CandlestickData<Time> = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      };

      lastBarRef.current = {
        ...last,
        high: updatedBar.high,
        low: updatedBar.low,
        close: price,
      };

      try {
        candleSeriesRef.current.update(updatedBar);
      } catch {
        // Silently skip if time alignment differs
      }
    };

    const unsub = marketWs.subscribe(symbol, handleTick);
    return unsub;
  }, [symbol]);

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
          <span className="text-xs font-semibold text-slate-600">Loading live chart data...</span>
        </div>
      )}

      {/* Empty / Disconnected State */}
      {!isLoading && !hasData && (
        <div className="absolute inset-0 bg-slate-50/90 flex flex-col items-center justify-center p-6 text-center z-10 rounded-xl">
          <div className="p-3 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mb-2">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">
            {error || "Market Data Disconnected"}
          </h4>
          <p className="text-[11px] text-slate-500 max-w-sm mt-1 mb-3">
            Real market candles stream from Upstox. When the provider session is disconnected or after trading hours, historical bars will display once authenticated.
          </p>
          <button
            onClick={fetchAndSetCandles}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Feed</span>
          </button>
        </div>
      )}
    </div>
  );
}
