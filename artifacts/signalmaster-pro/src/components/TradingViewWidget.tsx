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

export default function TradingViewWidget({ symbol, theme = "dark", height = 400 }: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.getElementById("tv-script");

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "tv-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    if (window.TradingView) {
      new window.TradingView.widget({
        autosize: true,
        symbol: symbol,
        interval: "1",
        timezone: "Etc/UTC",
        theme: theme,
        style: "1",
        locale: "br",
        enable_publishing: false,
        backgroundColor: "transparent",
        gridColor: "rgba(255, 255, 255, 0.05)",
        hide_top_toolbar: true,
        hide_legend: false,
        save_image: false,
        container_id: containerRef.current.id,
      });
    }
  }, [symbol, theme, scriptLoaded]);

  return (
    <div 
      id={`tv-widget-${Math.random().toString(36).substring(7)}`} 
      ref={containerRef} 
      style={{ height, width: "100%" }} 
      className="rounded-lg overflow-hidden border border-white/10"
    />
  );
}
