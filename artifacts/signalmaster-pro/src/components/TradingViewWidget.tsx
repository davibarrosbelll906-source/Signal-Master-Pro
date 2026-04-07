/**
 * Lightweight Charts widget — renders directly to canvas (no iframe, no external domain needed).
 * Uses the shared assetDataManager for real data (Binance WebSocket for crypto, OU for forex).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { subscribeAsset } from "@/lib/assetDataManager";
import { ASSET_CATEGORIES } from "@/lib/signalEngine";

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "dark" | "light";
  height?: number | string;
}

const CATEGORY_COLOR: Record<string, string> = {
  crypto: "#facc15",
  forex: "#60a5fa",
  commodity: "#fb923c",
};

export default function TradingViewWidget({ symbol, theme = "dark", height = 400 }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [priceDir, setPriceDir] = useState<"up" | "down" | null>(null);

  const category = ASSET_CATEGORIES[symbol] as string || "forex";
  const accentColor = CATEGORY_COLOR[category] || "#00ff88";
  const h = typeof height === "number" ? height : parseInt(height as string, 10) || 400;

  // Build and resize chart
  const initChart = useCallback(() => {
    if (!containerRef.current) return;
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const isDark = theme === "dark";
    const bg = isDark ? "#07070d" : "#ffffff";
    const textColor = isDark ? "#9ca3af" : "#374151";
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: h,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor,
        fontFamily: "'Inter', 'DM Sans', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const upColor = "#00ff88";
    const downColor = "#ff4466";

    const cs = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const vol = chart.addHistogramSeries({
      color: accentColor,
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current = cs;
    volumeRef.current = vol;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, [theme, h, accentColor]);

  useEffect(() => {
    const cleanup = initChart();
    return () => { cleanup?.(); };
  }, [initChart]);

  // Subscribe to asset data manager
  useEffect(() => {
    setIsConnected(false);
    setPrice(null);

    const id = `tv-widget-${symbol}-${Math.random().toString(36).slice(2)}`;

    const unsub = subscribeAsset(symbol, id, (buf, p, dir, connected) => {
      setIsConnected(connected);
      if (p) setPrice(p);
      if (dir) setPriceDir(dir);

      if (!seriesRef.current || !volumeRef.current) return;
      if (buf.m1.length === 0) return;

      // Convert buffer to lightweight-charts format
      const candles: CandlestickData[] = buf.m1.map(c => ({
        time: Math.floor(c.t / 1000) as UTCTimestamp,
        open: c.o, high: c.h, low: c.l, close: c.c,
      }));
      const vols = buf.m1.map(c => ({
        time: Math.floor(c.t / 1000) as UTCTimestamp,
        value: c.v,
        color: c.c >= c.o ? "rgba(0,255,136,0.25)" : "rgba(255,68,102,0.25)",
      }));

      try {
        seriesRef.current.setData(candles);
        volumeRef.current.setData(vols);
        chartRef.current?.timeScale().fitContent();
      } catch {}
    });

    return () => unsub();
  }, [symbol]);

  const fmtPrice = (p: number) =>
    p < 10 ? p.toFixed(5) : p < 1000 ? p.toFixed(4) : p.toFixed(2);

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/8" style={{ height: h, width: "100%" }}>
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-3 py-2 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(7,7,13,0.9) 0%, transparent 100%)" }}>
        <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-[var(--green)] animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
        <span className="text-xs font-black text-white">{symbol.replace("USD", "/USD")}</span>
        <span className="text-[10px]" style={{ color: accentColor }}>
          {category === "crypto" ? "₿" : category === "forex" ? "💱" : "🏅"} {category}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto">M1</span>
        {price !== null && (
          <span className={`text-xs font-bold tabular-nums font-mono ${priceDir === "up" ? "text-[var(--green)]" : priceDir === "down" ? "text-[var(--red)]" : "text-white"}`}>
            {priceDir === "up" ? "▲ " : priceDir === "down" ? "▼ " : ""}{fmtPrice(price)}
          </span>
        )}
      </div>

      {/* Connecting overlay */}
      {!isConnected && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#07070d]/80">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--green)]/20 border-t-[var(--green)] animate-spin" />
          <span className="text-[10px] text-gray-600">Conectando dados de {symbol}...</span>
        </div>
      )}

      {/* Chart canvas */}
      <div ref={containerRef} style={{ height: h, width: "100%" }} />
    </div>
  );
}
