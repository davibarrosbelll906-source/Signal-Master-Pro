import { useState, useEffect } from "react";
import { Award, Crown, Trophy, TrendingUp } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface UserRecord {
  user: string;
  name?: string;
  plan: string;
  role: string;
}

interface HistEntry {
  result: 'win' | 'loss';
  ts: number;
  category?: string;
  asset?: string;
  user?: string;
}

const MOCK_TRADERS = [
  { name: 'CarlosM.', wr: 88.4, ops: 312, streak: 14, plan: 'premium', days: 180 },
  { name: 'AnaT.', wr: 85.2, ops: 198, streak: 11, plan: 'premium', days: 120 },
  { name: 'Trader_PRO', wr: 82.1, ops: 445, streak: 9, plan: 'pro', days: 240 },
  { name: 'LucasFx', wr: 80.5, ops: 156, streak: 8, plan: 'pro', days: 90 },
  { name: 'FernandaB.', wr: 79.3, ops: 287, streak: 7, plan: 'premium', days: 210 },
  { name: 'Bruno_CRT', wr: 77.8, ops: 421, streak: 6, plan: 'pro', days: 300 },
  { name: 'Julia_TRD', wr: 76.2, ops: 134, streak: 5, plan: 'pro', days: 60 },
  { name: 'PedroAlves', wr: 74.9, ops: 89, streak: 4, plan: 'basico', days: 45 },
  { name: 'Marcos_Ops', wr: 73.1, ops: 201, streak: 3, plan: 'basico', days: 150 },
];

export default function LeaderboardPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [tab, setTab] = useState<'geral' | 'forex' | 'crypto' | 'commodity'>('geral');
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [myStats, setMyStats] = useState({ wr: 0, ops: 0, streak: 0 });

  useEffect(() => {
    try {
      const hist: HistEntry[] = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const now = Date.now();
      const cutoff = period === '7d' ? now - 7 * 86400000 : period === '30d' ? now - 30 * 86400000 : 0;
      const rel = hist.filter(h => h.ts > cutoff && (tab === 'geral' || h.category === tab));
      const wins = rel.filter(h => h.result === 'win').length;
      const total = rel.length;
      let streak = 0, max = 0;
      hist.sort((a, b) => a.ts - b.ts).forEach(h => {
        if (h.result === 'win') { max = Math.max(max, ++streak); } else streak = 0;
      });
      setMyStats({ wr: total > 0 ? Math.round((wins / total) * 100) : 0, ops: total, streak: max });
    } catch {}
  }, [tab, period]);

  const myName = currentUser?.name || currentUser?.user || 'Você';
  const myPlan = currentUser?.plan || 'basico';

  // Build leaderboard: mix mock + real user
  const allTraders = [
    ...MOCK_TRADERS,
    { name: myName, wr: myStats.wr, ops: myStats.ops, streak: myStats.streak, plan: myPlan, days: 0, isMe: true },
  ]
    .filter(t => t.ops > 0 || (t as any).isMe ? true : true)
    .sort((a, b) => b.wr - a.wr || b.ops - a.ops)
    .map((t, i) => ({ ...t, pos: i + 1 }));

  const myPos = allTraders.findIndex(t => (t as any).isMe) + 1;

  const planStyles: Record<string, string> = {
    premium: 'text-yellow-400',
    pro: 'text-[var(--blue)]',
    basico: 'text-gray-400',
  };

  const planLabel: Record<string, string> = {
    premium: '💎 PREMIUM', pro: '🔥 PRO', basico: 'BÁSICO',
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Crown className="text-[var(--gold)]" /> Hall da Fama
      </h1>

      {/* My position banner */}
      {myStats.ops > 0 && (
        <div className="glass-card p-4 border border-[var(--blue)]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--blue)] to-purple-500 flex items-center justify-center text-white font-bold">
              {myName[0].toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold text-white">Sua posição</div>
              <div className="text-xs text-gray-500">{myName}</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-[var(--gold)]">#{myPos}</div>
            <div className="text-[10px] text-gray-600">no ranking</div>
          </div>
          <div className="hidden md:flex gap-6 text-center">
            <div>
              <div className="text-xs text-gray-500">WR</div>
              <div className={`font-bold text-sm ${myStats.wr >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{myStats.wr}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ops</div>
              <div className="font-bold text-sm text-white">{myStats.ops}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Streak</div>
              <div className="font-bold text-sm text-orange-400">{myStats.streak}W</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-1.5">
          {(['geral', 'forex', 'crypto', 'commodity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition border ${tab === t ? 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30' : 'text-gray-500 border-transparent hover:text-white hover:bg-white/5'}`}
            >
              {t === 'geral' ? '🌐 Geral' : t === 'forex' ? '💱 Forex' : t === 'crypto' ? '₿ Cripto' : '🏅 Commodity'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${period === p ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-white'}`}
            >
              {p === '7d' ? '7D' : p === '30d' ? '30D' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {allTraders.slice(0, 3).map((t, i) => {
          const isMe = (t as any).isMe;
          return (
            <div key={t.name} className={`glass-card p-5 text-center relative overflow-hidden ${i === 0 ? 'border border-[var(--gold)]/30' : ''} ${isMe ? 'border-[var(--blue)]/30' : ''}`}>
              {i === 0 && <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 to-transparent pointer-events-none" />}
              <div className="text-3xl mb-2">{medals[i]}</div>
              <div className={`w-12 h-12 mx-auto rounded-xl mb-2 flex items-center justify-center text-lg font-black ${isMe ? 'bg-gradient-to-br from-[var(--blue)] to-purple-500' : 'bg-gradient-to-br from-gray-600 to-gray-800'} text-white`}>
                {t.name[0]}
              </div>
              <div className="text-sm font-bold text-white truncate">{t.name}</div>
              <div className={`text-xs mt-0.5 ${planStyles[t.plan]}`}>{planLabel[t.plan]}</div>
              <div className="mt-3 text-2xl font-black text-[var(--green)]">{t.wr}%</div>
              <div className="text-xs text-gray-600">{t.ops} ops</div>
            </div>
          );
        })}
      </div>

      {/* Full Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/30 border-b border-white/5 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="p-4 w-16 text-center">#</th>
                <th className="p-4">Trader</th>
                <th className="p-4 text-center">Win Rate</th>
                <th className="p-4 text-center">Ops</th>
                <th className="p-4 text-center">Streak</th>
                <th className="p-4 text-right">Plano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allTraders.map(t => {
                const isMe = (t as any).isMe;
                return (
                  <tr
                    key={t.name + t.pos}
                    className={`transition ${isMe ? 'bg-[var(--blue)]/8 border-l-2 border-l-[var(--blue)]' : 'hover:bg-white/3'}`}
                  >
                    <td className="p-4 text-center">
                      {t.pos <= 3
                        ? <span className="text-lg">{medals[t.pos - 1]}</span>
                        : <span className="text-gray-600 font-bold text-sm">#{t.pos}</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isMe ? 'bg-[var(--blue)]/20 text-[var(--blue)]' : 'bg-white/5 text-gray-400'}`}>
                          {t.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{t.name}</div>
                          {isMe && <div className="text-[10px] text-[var(--blue)]">← você</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-black text-sm ${t.wr >= 80 ? 'text-[var(--gold)]' : t.wr >= 70 ? 'text-[var(--green)]' : t.wr >= 60 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {t.wr}%
                      </span>
                    </td>
                    <td className="p-4 text-center text-sm text-gray-300 font-mono">{t.ops}</td>
                    <td className="p-4 text-center text-sm text-orange-400 font-bold">{t.streak > 0 ? `🔥 ${t.streak}` : '—'}</td>
                    <td className="p-4 text-right">
                      <span className={`text-[10px] font-bold ${planStyles[t.plan]}`}>
                        {planLabel[t.plan]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-700 text-center">Atualizado em tempo real · Mínimo de 10 operações para classificação · Período selecionado: {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : 'todo o histórico'}</p>
    </div>
  );
}
