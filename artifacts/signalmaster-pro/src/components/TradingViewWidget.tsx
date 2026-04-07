import { useEffect, useRef, useState } from "react";

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "dark" | "light";
  height?: number | string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

let _widgetCounter = 0;

export default function TradingViewWidget({ symbol, theme = "dark", height = 400 }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Stable ID — generated once per component instance
  const stableId = useRef(`tv-widget-${++_widgetCounter}`);

  // Load TradingView script once
  useEffect(() => {
    const existingScript = document.getElementById("tv-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "tv-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      script.onerror = () => setLoadError(true);
      document.head.appendChild(script);
    } else if ((existingScript as HTMLScriptElement).src && window.TradingView) {
      setScriptLoaded(true);
    } else {
      // Script tag exists but may still be loading
      existingScript.addEventListener("load", () => setScriptLoaded(true));
      existingScript.addEventListener("error", () => setLoadError(true));
    }
  }, []);

  // Create / re-create widget when symbol or theme changes
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.TradingView) return;

    // Clear previous widget content
    containerRef.current.innerHTML = "";
    widgetRef.current = null;

    try {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: symbol,
        interval: "1",
        timezone: "Etc/UTC",
        theme: theme,
        style: "1",
        locale: "br",
        enable_publishing: false,
        backgroundColor: "rgba(7,7,13,1)",
        gridColor: "rgba(255,255,255,0.04)",
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        container_id: stableId.current,
      });
    } catch (e) {
      setLoadError(true);
    }

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
      widgetRef.current = null;
    };
  }, [symbol, theme, scriptLoaded]);

  if (loadError) {
    return (
      <div
        style={{ height, width: "100%" }}
        className="rounded-lg overflow-hidden border border-white/10 bg-white/3 flex flex-col items-center justify-center gap-3"
      >
        <div className="text-3xl">📊</div>
        <div className="text-xs text-gray-500 text-center px-4">
          Gráfico TradingView indisponível neste ambiente.
          <br />
          <a
            href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--green)] hover:underline mt-1 block"
          >
            Abrir no TradingView ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-white/10" style={{ height, width: "100%" }}>
      {!scriptLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#07070d]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--green)]/30 border-t-[var(--green)] animate-spin" />
          <span className="text-[10px] text-gray-600">Carregando gráfico...</span>
        </div>
      )}
      <div
        id={stableId.current}
        ref={containerRef}
        style={{ height, width: "100%" }}
      />
    </div>
  );
}
