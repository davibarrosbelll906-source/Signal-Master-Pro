import { useState, useEffect } from "react";
import { Trophy, Star, Shield, Zap, Flame, Target, Brain, Diamond, Award, TrendingUp, Calendar, Lock } from "lucide-react";

interface HistoryEntry {
  ts: number;
  result: 'win' | 'loss';
  score?: number;
  quality?: string;
  asset?: string;
  category?: string;
}

interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  check: (hist: HistoryEntry[]) => boolean;
  progress?: (hist: HistoryEntry[]) => { current: number; target: number };
  rarity: 'comum' | 'raro' | 'épico' | 'lendário';
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win', title: 'Primeira Vitória', desc: 'Registre seu primeiro WIN',
    icon: <Zap />, color: 'text-[var(--green)]',
    check: h => h.some(e => e.result === 'win'),
    rarity: 'comum',
  },
  {
    id: 'fire5', title: 'Em Chamas', desc: 'Faça 5 WINs consecutivos',
    icon: <Flame />, color: 'text-orange-400',
    check: h => {
      let streak = 0, max = 0;
      for (const e of h) { e.result === 'win' ? (max = Math.max(max, ++streak)) : (streak = 0); }
      return max >= 5;
    },
    progress: h => {
      let streak = 0, max = 0;
      for (const e of h) { e.result === 'win' ? (max = Math.max(max, ++streak)) : (streak = 0); }
      return { current: Math.min(max, 5), target: 5 };
    },
    rarity: 'raro',
  },
  {
    id: 'sharp', title: 'Franco Atirador', desc: 'Alcance 70% de win rate com 20+ operações',
    icon: <Target />, color: 'text-[var(--blue)]',
    check: h => h.length >= 20 && h.filter(e => e.result === 'win').length / h.length >= 0.7,
    progress: h => ({ current: h.length, target: 20 }),
    rarity: 'raro',
  },
  {
    id: 'century', title: 'Centurião', desc: 'Complete 100 operações registradas',
    icon: <Shield />, color: 'text-[var(--blue)]',
    check: h => h.length >= 100,
    progress: h => ({ current: Math.min(h.length, 100), target: 100 }),
    rarity: 'épico',
  },
  {
    id: 'consistent', title: 'Consistência Total', desc: 'WR acima de 65% por 30+ operações',
    icon: <Star />, color: 'text-yellow-400',
    check: h => h.length >= 30 && h.filter(e => e.result === 'win').length / h.length >= 0.65,
    progress: h => ({ current: Math.min(h.length, 30), target: 30 }),
    rarity: 'épico',
  },
  {
    id: 'diamond', title: 'Diamante', desc: 'Complete 50 WINs totais',
    icon: <Diamond />, color: 'text-cyan-400',
    check: h => h.filter(e => e.result === 'win').length >= 50,
    progress: h => ({ current: Math.min(h.filter(e => e.result === 'win').length, 50), target: 50 }),
    rarity: 'épico',
  },
  {
    id: 'premium_hunter', title: 'Caçador Premium', desc: 'Registre 10 sinais de qualidade PREMIUM',
    icon: <Award />, color: 'text-yellow-300',
    check: h => h.filter(e => e.quality === 'PREMIUM').length >= 10,
    progress: h => ({ current: Math.min(h.filter(e => e.quality === 'PREMIUM').length, 10), target: 10 }),
    rarity: 'raro',
  },
  {
    id: 'diversified', title: 'Diversificado', desc: 'Opere em todas as 3 categorias (Forex, Crypto, Commodity)',
    icon: <TrendingUp />, color: 'text-purple-400',
    check: h => {
      const cats = new Set(h.map(e => e.category));
      return cats.has('forex') && cats.has('crypto') && cats.has('commodity');
    },
    rarity: 'raro',
  },
  {
    id: 'machine', title: 'Máquina', desc: 'Complete 50 operações em um único dia',
    icon: <Brain />, color: 'text-[var(--green)]',
    check: h => {
      const dayMap: Record<string, number> = {};
      h.forEach(e => {
        const day = new Date(e.ts).toDateString();
        dayMap[day] = (dayMap[day] || 0) + 1;
      });
      return Object.values(dayMap).some(v => v >= 50);
    },
    rarity: 'lendário',
  },
  {
    id: 'legend', title: 'Lendário', desc: 'Alcance 80% de WR com 50+ operações',
    icon: <Trophy />, color: 'text-[var(--gold)]',
    check: h => h.length >= 50 && h.filter(e => e.result === 'win').length / h.length >= 0.8,
    progress: h => ({ current: Math.min(h.length, 50), target: 50 }),
    rarity: 'lendário',
  },
  {
    id: 'weekly_king', title: 'Rei da Semana', desc: 'Termine a semana com 70%+ de WR',
    icon: <Calendar />, color: 'text-orange-300',
    check: h => {
      const weekAgo = Date.now() - 7 * 86400000;
      const w = h.filter(e => e.ts > weekAgo);
      return w.length >= 10 && w.filter(e => e.result === 'win').length / w.length >= 0.7;
    },
    rarity: 'épico',
  },
  {
    id: 'fire10', title: 'Imparável', desc: 'Faça 10 WINs consecutivos',
    icon: <Flame />, color: 'text-[var(--red)]',
    check: h => {
      let streak = 0, max = 0;
      for (const e of h) { e.result === 'win' ? (max = Math.max(max, ++streak)) : (streak = 0); }
      return max >= 10;
    },
    progress: h => {
      let streak = 0, max = 0;
      for (const e of h) { e.result === 'win' ? (max = Math.max(max, ++streak)) : (streak = 0); }
      return { current: Math.min(max, 10), target: 10 };
    },
    rarity: 'lendário',
  },
  // ── New achievements ────────────────────────────────────────────────────
  {
    id: 'first_week', title: 'Primeira Semana', desc: 'Opere por 5 dias diferentes',
    icon: <Calendar />, color: 'text-blue-400',
    check: h => new Set(h.map(e => new Date(e.ts).toDateString())).size >= 5,
    progress: h => ({ current: Math.min(new Set(h.map(e => new Date(e.ts).toDateString())).size, 5), target: 5 }),
    rarity: 'comum',
  },
  {
    id: 'elite_signal', title: 'Sinal de Elite', desc: 'Registre 5 sinais de qualidade ELITE',
    icon: <Diamond />, color: 'text-white',
    check: h => h.filter(e => e.quality === 'ELITE').length >= 5,
    progress: h => ({ current: Math.min(h.filter(e => e.quality === 'ELITE').length, 5), target: 5 }),
    rarity: 'épico',
  },
  {
    id: 'morning_trader', title: 'Trader Madrugador', desc: 'Faça 10 WINs na sessão de Londres',
    icon: <TrendingUp />, color: 'text-blue-300',
    check: h => h.filter(e => e.sess === 'london' && e.result === 'win').length >= 10,
    progress: h => ({ current: Math.min(h.filter(e => e.sess === 'london' && e.result === 'win').length, 10), target: 10 }),
    rarity: 'raro',
  },
  {
    id: 'night_owl', title: 'Coruja Noturna', desc: 'Faça 10 WINs na sessão da Ásia',
    icon: <Star />, color: 'text-purple-300',
    check: h => h.filter(e => e.sess === 'asia' && e.result === 'win').length >= 10,
    progress: h => ({ current: Math.min(h.filter(e => e.sess === 'asia' && e.result === 'win').length, 10), target: 10 }),
    rarity: 'raro',
  },
  {
    id: 'crypto_king', title: 'Rei das Criptos', desc: '20 WINs em ativos Crypto',
    icon: <Brain />, color: 'text-yellow-300',
    check: h => h.filter(e => e.category === 'crypto' && e.result === 'win').length >= 20,
    progress: h => ({ current: Math.min(h.filter(e => e.category === 'crypto' && e.result === 'win').length, 20), target: 20 }),
    rarity: 'épico',
  },
  {
    id: 'forex_master', title: 'Mestre do Forex', desc: '20 WINs em pares Forex',
    icon: <TrendingUp />, color: 'text-[var(--blue)]',
    check: h => h.filter(e => e.category === 'forex' && e.result === 'win').length >= 20,
    progress: h => ({ current: Math.min(h.filter(e => e.category === 'forex' && e.result === 'win').length, 20), target: 20 }),
    rarity: 'épico',
  },
  {
    id: 'green_month', title: 'Mês Verde', desc: 'Termine o mês com mais wins que losses',
    icon: <Award />, color: 'text-[var(--green)]',
    check: h => {
      const month = new Date().getMonth();
      const year = new Date().getFullYear();
      const m = h.filter(e => { const d = new Date(e.ts); return d.getMonth() === month && d.getFullYear() === year; });
      return m.filter(e => e.result === 'win').length > m.filter(e => e.result === 'loss').length && m.length >= 10;
    },
    rarity: 'épico',
  },
  {
    id: 'iron_discipline', title: 'Disciplina de Ferro', desc: 'Nunca ultrapasse 3 losses seguidos em 30 ops',
    icon: <Shield />, color: 'text-cyan-300',
    check: h => {
      if (h.length < 30) return false;
      const last30 = h.slice(-30);
      let streak = 0;
      for (const e of last30) { e.result === 'loss' ? streak++ : (streak = 0); if (streak >= 3) return false; }
      return true;
    },
    rarity: 'lendário',
  },
  {
    id: 'grand_master', title: 'Grande Mestre', desc: 'Complete 500 operações registradas',
    icon: <Trophy />, color: 'text-yellow-300',
    check: h => h.length >= 500,
    progress: h => ({ current: Math.min(h.length, 500), target: 500 }),
    rarity: 'lendário',
  },
];

const RARITY_COLORS: Record<string, string> = {
  comum: 'text-gray-400 border-gray-600',
  raro: 'text-[var(--blue)] border-[var(--blue)]/40',
  épico: 'text-purple-400 border-purple-400/40',
  lendário: 'text-yellow-400 border-yellow-400/40',
};

const RARITY_BG: Record<string, string> = {
  comum: 'bg-white/5',
  raro: 'bg-[var(--blue)]/5',
  épico: 'bg-purple-500/5',
  lendário: 'bg-yellow-500/5',
};

export default function AchievementsPage() {
  const [hist, setHist] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
  }, []);

  const unlocked = ACHIEVEMENTS.filter(a => a.check(hist));
  const locked = ACHIEVEMENTS.filter(a => !a.check(hist));
  const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);

  const visible = ACHIEVEMENTS.filter(a => {
    if (filter === 'unlocked') return a.check(hist);
    if (filter === 'locked') return !a.check(hist);
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Trophy className="text-yellow-400" /> Conquistas
        </h1>
        <div className="flex gap-2">
          {(['all', 'unlocked', 'locked'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filter === f ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30' : 'text-gray-500 hover:text-white border border-transparent'}`}
            >
              {f === 'all' ? 'Todas' : f === 'unlocked' ? `Desbloqueadas (${unlocked.length})` : `Bloqueadas (${locked.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-white font-bold">{unlocked.length}</span>
            <span className="text-gray-500"> / {ACHIEVEMENTS.length} conquistas</span>
          </div>
          <span className="text-[var(--gold)] font-bold text-lg">{pct}%</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--green), var(--gold))' }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-2">
          <span>Iniciante</span>
          <span>Profissional</span>
          <span>Lendário</span>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(a => {
          const done = a.check(hist);
          const prog = a.progress ? a.progress(hist) : null;
          return (
            <div
              key={a.id}
              className={`glass-card p-5 relative overflow-hidden border transition-all duration-300 ${
                done
                  ? `${RARITY_BG[a.rarity]} ${RARITY_COLORS[a.rarity].split(' ')[1]} border shadow-[0_0_15px_rgba(255,215,0,0.04)]`
                  : 'border-white/5 opacity-50 grayscale'
              }`}
            >
              {done && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[var(--green)] flex items-center justify-center text-black text-xs font-bold">✓</div>
              )}
              {!done && (
                <div className="absolute top-3 right-3 text-gray-600"><Lock size={14} /></div>
              )}

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${done ? `${RARITY_BG[a.rarity]} border ${RARITY_COLORS[a.rarity].split(' ')[1]}` : 'bg-white/5 border border-white/5'}`}>
                <div className={`[&>svg]:w-6 [&>svg]:h-6 ${done ? a.color : 'text-gray-600'}`}>{a.icon}</div>
              </div>

              <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${done ? RARITY_COLORS[a.rarity].split(' ')[0] : 'text-gray-600'}`}>{a.rarity}</div>
              <div className="font-bold text-white text-sm mb-1">{a.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed mb-3">{a.desc}</div>

              {prog && !done && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">Progresso</span>
                    <span className="text-gray-400">{prog.current}/{prog.target}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--blue)] rounded-full" style={{ width: `${(prog.current / prog.target) * 100}%` }} />
                  </div>
                </div>
              )}

              {done && (
                <div className={`text-xs font-bold ${a.color} flex items-center gap-1`}>
                  <span>✨</span> DESBLOQUEADO
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
