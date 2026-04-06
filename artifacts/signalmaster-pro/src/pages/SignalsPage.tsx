import { useState, useEffect } from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import { Play, TrendingUp, Activity, Check, X, Share2, Download, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentSession } from "@/lib/signalEngine";

export default function SignalsPage() {
  const [asset, setAsset] = useState("EURUSD");
  const [category, setCategory] = useState<"crypto" | "forex" | "commodity">("forex");
  const session = getCurrentSession();
  
  // Fake signal data for visual mock
  const [signal, setSignal] = useState({
    direction: "CALL" as "CALL" | "PUT",
    score: 82,
    quality: "PREMIUM",
    timeRem: 45,
    adx: 24,
    dnaMatch: 78,
    entropy: 42
  });

  return (
    <div className="space-y-6">
      {/* Header Context Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-400">Sessão Atual: </span>
            <span className="font-bold text-[var(--green)] uppercase">{session}</span>
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Mercado: </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
              <Activity size={12} /> MORNO
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {["crypto", "forex", "commodity"].map(c => (
            <button 
              key={c}
              onClick={() => setCategory(c as any)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${category === c ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats & Gauges */}
        <div className="space-y-6">
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--green)]/10 blur-[50px] rounded-full"></div>
            <h3 className="text-sm font-medium text-gray-400 mb-4">Placar Hoje</h3>
            <div className="flex items-end gap-4 mb-6">
              <div className="text-5xl font-black text-[var(--green)]">14</div>
              <div className="text-2xl font-bold text-gray-500 pb-1">W</div>
              <div className="text-2xl font-bold text-gray-600 pb-1 mx-2">/</div>
              <div className="text-4xl font-bold text-[var(--red)]">3</div>
              <div className="text-xl font-bold text-gray-500 pb-1">L</div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Assertividade</span>
                  <span className="font-bold text-white">82.3%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--green)]" style={{ width: '82.3%' }}></div>
                </div>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-gray-400">Sequência Atual:</span>
                <span className="font-bold text-white flex items-center gap-1">🔥 4 WINS</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
             <h3 className="text-sm font-medium text-gray-400 mb-4">Índice de Confiança Global</h3>
             <div className="flex justify-center mb-4">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                    <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-[var(--blue)]" strokeDasharray="351.8" strokeDashoffset={351.8 * (1 - 0.74)} strokeLinecap="round" />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-2xl font-bold text-white">74%</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">FORTE</div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Center Column: Active Signal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border-[var(--green)]/30 shadow-[0_0_30px_rgba(0,255,136,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30 animate-pulse">
                SINAL ATIVO
              </span>
            </div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-2xl border border-white/10">
                🇪🇺
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">{asset}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                  <span>M1</span> • <span>Sessão {session}</span> • <span className="text-[var(--blue)] font-medium"><Zap size={12} className="inline mr-1"/> PREMIUM</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mb-8">
              <div className="text-center md:text-left">
                <div className={`text-6xl font-black mb-2 tracking-tighter ${signal.direction === 'CALL' ? 'text-[var(--green)] drop-shadow-[0_0_15px_rgba(0,255,136,0.4)]' : 'text-[var(--red)] drop-shadow-[0_0_15px_rgba(255,68,102,0.4)]'}`}>
                  {signal.direction}
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="text-sm">
                    <span className="text-gray-400 block text-xs">Score Engine</span>
                    <span className="font-bold text-white text-lg">{signal.score}%</span>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-sm">
                    <span className="text-gray-400 block text-xs">DNA Match</span>
                    <span className="font-bold text-white text-lg">{signal.dnaMatch}%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl p-6 border border-white/5">
                <div className="text-sm text-gray-400 mb-2">Próximo sinal em</div>
                <div className="text-4xl font-mono font-bold text-white tabular-nums">
                  00:{signal.timeRem.toString().padStart(2, '0')}
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-white/40 transition-all duration-1000" style={{ width: `${(signal.timeRem/60)*100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20 border border-[var(--green)]/20 transition group">
                <Check className="group-hover:scale-110 transition-transform" /> DEU WIN
              </button>
              <button className="py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 border border-[var(--red)]/20 transition group">
                <X className="group-hover:scale-110 transition-transform" /> DEU LOSS
              </button>
            </div>
          </div>

          {/* Chart Widget placeholder */}
          <div className="glass-card p-1">
            <TradingViewWidget symbol={`FX:${asset}`} height={350} />
          </div>
        </div>
      </div>
    </div>
  );
}
