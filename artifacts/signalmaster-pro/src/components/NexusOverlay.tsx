/**
 * NexusOverlay — notificação cósmica quando Luna Nexus aprova um sinal.
 * Aparece como toast flutuante com animação de estrelas e mensagem poética.
 */

import { useEffect, useRef, useState } from 'react';
import { useSignalStore, type CosmicEvent } from '../lib/signalStore';

const TIER_STYLES = {
  DIVINE: {
    bg:      'from-yellow-900/95 via-amber-900/95 to-yellow-800/95',
    border:  'border-yellow-400/60',
    glow:    'shadow-[0_0_40px_rgba(251,191,36,0.5)]',
    badge:   'bg-yellow-500/30 text-yellow-200 border-yellow-400/40',
    icon:    '👑',
    label:   'DIVINE',
    star:    'text-yellow-300',
  },
  CELESTIAL: {
    bg:      'from-indigo-900/95 via-purple-900/95 to-indigo-800/95',
    border:  'border-indigo-400/60',
    glow:    'shadow-[0_0_40px_rgba(129,140,248,0.5)]',
    badge:   'bg-indigo-500/30 text-indigo-200 border-indigo-400/40',
    icon:    '🌌',
    label:   'CELESTIAL',
    star:    'text-indigo-300',
  },
  ETHEREAL: {
    bg:      'from-cyan-900/95 via-teal-900/95 to-cyan-800/95',
    border:  'border-cyan-400/60',
    glow:    'shadow-[0_0_40px_rgba(34,211,238,0.4)]',
    badge:   'bg-cyan-500/30 text-cyan-200 border-cyan-400/40',
    icon:    '✨',
    label:   'ETHEREAL',
    star:    'text-cyan-300',
  },
  ASTRAL: {
    bg:      'from-violet-900/95 via-fuchsia-900/95 to-violet-800/95',
    border:  'border-violet-400/60',
    glow:    'shadow-[0_0_40px_rgba(167,139,250,0.4)]',
    badge:   'bg-violet-500/30 text-violet-200 border-violet-400/40',
    icon:    '✧',
    label:   'ASTRAL',
    star:    'text-violet-300',
  },
};

interface NexusToastProps {
  event: CosmicEvent;
  onDismiss: () => void;
}

function NexusToast({ event, onDismiss }: NexusToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const style = TIER_STYLES[event.tier] ?? TIER_STYLES.ASTRAL;

  useEffect(() => {
    // mount animation
    const t1 = setTimeout(() => setVisible(true), 50);
    // auto-dismiss after 12 s
    timerRef.current = setTimeout(() => dismiss(), 12_000);
    return () => { clearTimeout(t1); clearTimeout(timerRef.current); };
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(() => onDismiss(), 500);
  }

  return (
    <div
      onClick={dismiss}
      className={`
        cursor-pointer w-[360px] rounded-2xl border backdrop-blur-xl
        bg-gradient-to-br ${style.bg} ${style.border} ${style.glow}
        transition-all duration-500 ease-out
        ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        overflow-hidden relative select-none
      `}
    >
      {/* Animated star particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className={`absolute text-[10px] ${style.star} animate-ping`}
            style={{
              top:              `${10 + (i * 11) % 80}%`,
              left:             `${5 + (i * 13) % 90}%`,
              animationDelay:   `${i * 0.3}s`,
              animationDuration:`${1.5 + (i % 3) * 0.5}s`,
              opacity:          0.4,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Header */}
      <div className={`flex items-center justify-between px-4 pt-3 pb-2 border-b ${style.border}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{style.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm tracking-wider">LUNA NEXUS</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge}`}>
                {style.label}
              </span>
            </div>
            <p className="text-white/50 text-[10px] tracking-widest uppercase">The Eternal Oracle</p>
          </div>
        </div>

        {/* Alignment ring */}
        <div className="flex flex-col items-center">
          <div className={`text-xs font-bold ${style.star}`}>{event.alignment}%</div>
          <div className="text-[9px] text-white/40">alinhamento</div>
        </div>
      </div>

      {/* Signal info */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base">{event.pair}</span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
              event.direction === 'CALL'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-red-500/30 text-red-300 border border-red-500/40'
            }`}>
              {event.direction === 'CALL' ? '▲ CALL' : '▼ PUT'}
            </span>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${style.star}`}>{event.score}%</div>
            <div className="text-[9px] text-white/40">score nexus</div>
          </div>
        </div>

        {/* Poetic message */}
        <p className="text-white/80 text-[11px] italic leading-relaxed border-l-2 border-white/20 pl-3">
          "{event.nexusMessage}"
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-white/30 text-[9px] tracking-widest">CLIQUE PARA FECHAR</span>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full ${style.star.replace('text-', 'bg-')} opacity-60`}
            />
          ))}
        </div>
      </div>

      {/* Progress bar (auto-dismiss timer) */}
      <div className="h-0.5 w-full bg-white/10">
        <div
          className={`h-full ${style.star.replace('text-', 'bg-')} opacity-70`}
          style={{ animation: 'nexus-drain 12s linear forwards' }}
        />
      </div>
    </div>
  );
}

export function NexusOverlay() {
  const latestCosmicEvent = useSignalStore((s) => s.latestCosmicEvent);
  const [activeEvent, setActiveEvent] = useState<CosmicEvent | null>(null);
  const lastIdRef = useRef<string>('');

  useEffect(() => {
    if (!latestCosmicEvent) return;
    // Deduplicate: only show if different from last
    const id = `${latestCosmicEvent.pair}-${latestCosmicEvent.score}-${latestCosmicEvent.tier}`;
    if (id === lastIdRef.current) return;
    lastIdRef.current = id;
    setActiveEvent(latestCosmicEvent);
  }, [latestCosmicEvent]);

  if (!activeEvent) return null;

  return (
    <>
      <style>{`
        @keyframes nexus-drain {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-auto">
        <NexusToast
          event={activeEvent}
          onDismiss={() => setActiveEvent(null)}
        />
      </div>
    </>
  );
}
