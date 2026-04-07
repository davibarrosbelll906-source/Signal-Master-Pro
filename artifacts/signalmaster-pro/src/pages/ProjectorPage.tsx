import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Maximize2, Minimize2, Zap, TrendingUp, TrendingDown, Clock, Activity } from "lucide-react";

export default function ProjectorPage() {
  const [seconds, setSeconds] = useState(new Date().getSeconds());
  const [lastSignal, setLastSignal] = useState<any>(null);
  const [pendingResult, setPendingResult] = useState<boolean>(false);

  // Read last signal from localStorage
  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      if (hist.length > 0) {
        const last = hist[hist.length - 1];
        setLastSignal(last);
        // If last entry has no result registered (result undefined), it's pending
        setPendingResult(!last.result || last.result === '');
      }
    } catch {}
  }, []);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => {
      setSeconds(new Date().getSeconds());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const timeToNext = seconds <= 48 ? 48 - seconds : 60 - seconds + 48;
  const isSignalTime = seconds >= 45 && seconds <= 52;
  const progressPct = ((60 - timeToNext) / 60) * 100;

  const direction = lastSignal?.direction || 'CALL';
  const asset = lastSignal?.asset || 'EUR/USD';
  const score = lastSignal?.score || 82;
  const quality = lastSignal?.quality || 'FORTE';

  const isCall = direction === 'CALL';
  const qualityColor =
    quality === 'PREMIUM' ? '#ffd700' :
    quality === 'FORTE' ? '#00ff88' :
    quality === 'MÉDIO' ? '#4488ff' : '#888';

  const QUALITY_LABELS: Record<string, string> = {
    PREMIUM: '💎 PREMIUM',
    FORTE: '🔥 FORTE',
    MÉDIO: '📊 MÉDIO',
    FRACO: '⚠️ FRACO',
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#020206] flex flex-col items-center justify-center select-none overflow-hidden">

      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: isCall
            ? 'radial-gradient(ellipse at center, rgba(0,255,136,0.06) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at center, rgba(255,68,68,0.06) 0%, transparent 60%)',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--green)] text-black font-black flex items-center justify-center text-sm animate-signal-pulse">S</div>
          <div>
            <div className="text-white font-bold text-sm">SignalMaster Pro</div>
            <div className="text-[10px] text-[var(--green)] font-bold tracking-widest">MODO PROJETOR</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={14} />
            <span className="font-mono tabular-nums text-white">
              {new Date().toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <Link
            href="/dashboard/signals"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition text-sm"
          >
            <Minimize2 size={14} /> Sair do Projetor
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center w-full px-8">

        {/* Asset name */}
        <div className="text-gray-500 text-2xl font-bold tracking-widest uppercase mb-2">
          {lastSignal ? 'ÚLTIMO SINAL' : 'AGUARDANDO SINAL'}
        </div>
        <div className="text-white font-black leading-none tracking-tighter mb-6"
          style={{ fontSize: 'clamp(60px, 10vw, 120px)' }}>
          {asset.replace('USD', '/USD').replace('EUR/', 'EUR/')}
        </div>

        {/* Direction — huge */}
        <div
          className="font-black leading-none tracking-tighter mb-6 transition-all duration-500"
          style={{
            fontSize: 'clamp(80px, 18vw, 200px)',
            color: isCall ? '#00ff88' : '#ff4444',
            textShadow: isCall
              ? '0 0 80px rgba(0,255,136,0.4)'
              : '0 0 80px rgba(255,68,68,0.4)',
          }}
        >
          {isCall ? '▲ CALL' : '▼ PUT'}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-10 text-2xl font-bold text-gray-400 mb-10">
          <div className="text-center">
            <div className="text-xs text-gray-600 uppercase tracking-widest mb-1">Expiração</div>
            <div className="text-white">M1</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-xs text-gray-600 uppercase tracking-widest mb-1">Score</div>
            <div style={{ color: qualityColor }}>{score}%</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-xs text-gray-600 uppercase tracking-widest mb-1">Qualidade</div>
            <div style={{ color: qualityColor }}>{QUALITY_LABELS[quality] || quality}</div>
          </div>
          {lastSignal?.sess && (
            <>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-xs text-gray-600 uppercase tracking-widest mb-1">Sessão</div>
                <div className="text-white capitalize">{lastSignal.sess}</div>
              </div>
            </>
          )}
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-gray-600 uppercase tracking-widest mb-3">
            {isSignalTime ? '🎯 MOMENTO DO SINAL' : 'Próximo sinal em'}
          </div>

          {/* Progress ring */}
          <div className="relative">
            <svg width="160" height="160" className="-rotate-90">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle
                cx="80" cy="80" r="70" fill="none"
                stroke={isSignalTime ? '#00ff88' : 'rgba(255,255,255,0.3)'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - progressPct / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div
                className={`font-mono font-black tabular-nums transition-colors ${isSignalTime ? 'text-[var(--green)]' : 'text-white'}`}
                style={{ fontSize: '48px' }}
              >
                {String(Math.floor(timeToNext / 60)).padStart(2, '0')}:{String(timeToNext % 60).padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: signal history mini */}
      {lastSignal && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 px-8 py-4 flex items-center justify-center gap-6">
          <div className="text-xs text-gray-600 uppercase tracking-wider">Registro:</div>
          <div className={`flex items-center gap-2 text-sm font-bold ${lastSignal.result === 'win' ? 'text-[var(--green)]' : lastSignal.result === 'loss' ? 'text-[var(--red)]' : 'text-gray-500'}`}>
            {lastSignal.result === 'win' ? '✓ WIN' : lastSignal.result === 'loss' ? '✗ LOSS' : '— Aguardando resultado'}
          </div>
          <div className="text-xs text-gray-600">
            {lastSignal.ts ? new Date(lastSignal.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
      )}

      {/* Pulse indicator when signal time */}
      {isSignalTime && (
        <div className="absolute top-6 right-48 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--green)]/20 border border-[var(--green)]/40">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--green)] animate-ping absolute" />
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />
          <span className="text-[var(--green)] text-sm font-bold ml-3">AO VIVO</span>
        </div>
      )}
    </div>
  );
}
