import { useState, useEffect, useCallback } from "react";
import { Crown } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/apiClient";

interface LeaderRow {
  rank: number;
  userId: string;
  username: string;
  name: string;
  plan: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  isCurrentUser: boolean;
}

const planStyles: Record<string, string> = {
  premium: 'text-yellow-400', pro: 'text-[var(--blue)]', basico: 'text-gray-400',
};
const planLabel: Record<string, string> = {
  premium: '💎 PREMIUM', pro: '🔥 PRO', basico: 'BÁSICO',
};
const medals = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLocalStats, setMyLocalStats] = useState({ wr: 0, ops: 0, wins: 0, losses: 0 });

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<LeaderRow[]>(`/api/leaderboard?period=${period}`);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const now = Date.now();
      const cutoff = period === '7d' ? now - 7 * 86400000 : period === '30d' ? now - 30 * 86400000 : 0;
      const rel = hist.filter((h: any) => h.ts > cutoff);
      const w = rel.filter((h: any) => h.result === 'win').length;
      const total = rel.length;
      setMyLocalStats({ wins: w, losses: total - w, ops: total, wr: total > 0 ? Math.round((w / total) * 100) : 0 });
    } catch {}
  }, [period]);

  const me = rows.find(r => r.isCurrentUser);
  const myName = me?.name || currentUser?.name || currentUser?.user || 'Você';
  const myPlan = me?.plan || currentUser?.plan || 'basico';

  const top3 = rows.slice(0, 3);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Crown className="text-[var(--gold)]" /> Hall da Fama
      </h1>

      {/* My position banner */}
      {(me || myLocalStats.ops > 0) && (
        <div className="glass-card p-4 border border-[var(--blue)]/30 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--blue)] to-purple-500 flex items-center justify-center text-white font-bold text-sm">
              {myName[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold text-white">Sua posição</div>
              <div className="text-xs text-gray-500">{myName} · <span className={planStyles[myPlan]}>{planLabel[myPlan]}</span></div>
            </div>
          </div>
          {me && (
            <div className="text-center">
              <div className="text-2xl font-black text-[var(--gold)]">#{me.rank}</div>
              <div className="text-[10px] text-gray-600">ranking global</div>
            </div>
          )}
          <div className="flex gap-5 text-center">
            <div>
              <div className="text-xs text-gray-500">WR</div>
              <div className={`font-black text-sm ${(me?.winRate ?? myLocalStats.wr) >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>
                {me?.winRate ?? myLocalStats.wr}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ops</div>
              <div className="font-bold text-sm text-white">{me?.total ?? myLocalStats.ops}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">W/L</div>
              <div className="font-bold text-sm text-white">
                <span className="text-[var(--green)]">{me?.wins ?? myLocalStats.wins}</span>
                <span className="text-gray-600">/</span>
                <span className="text-[var(--red)]">{me?.losses ?? myLocalStats.losses}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period filter */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-600">
          {loading ? '⏳ Carregando...' : `${rows.length} trader${rows.length !== 1 ? 's' : ''} classificado${rows.length !== 1 ? 's' : ''}`}
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${period === p ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-white'}`}>
              {p === '7d' ? '7D' : p === '30d' ? '30D' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="w-8 h-8 border-2 border-[var(--green)]/30 border-t-[var(--green)] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando ranking global...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-gray-400 text-sm font-medium">Nenhum trader classificado ainda</p>
          <p className="text-gray-600 text-xs mt-1">Registre suas operações para aparecer no ranking!</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {top3.length >= 2 && (
            <div className="grid grid-cols-3 gap-3">
              {top3.map((t, i) => (
                <div key={t.userId} className={`glass-card p-5 text-center relative overflow-hidden transition-all ${i === 0 ? 'border border-[var(--gold)]/30' : ''} ${t.isCurrentUser ? 'border-[var(--blue)]/40' : ''}`}>
                  {i === 0 && <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 to-transparent pointer-events-none" />}
                  <div className="text-3xl mb-2">{medals[i]}</div>
                  <div className={`w-12 h-12 mx-auto rounded-xl mb-2 flex items-center justify-center text-lg font-black ${t.isCurrentUser ? 'bg-gradient-to-br from-[var(--blue)] to-purple-500' : 'bg-gradient-to-br from-gray-600 to-gray-800'} text-white`}>
                    {(t.name || t.username)[0].toUpperCase()}
                  </div>
                  <div className="text-sm font-bold text-white truncate">{t.name || t.username}</div>
                  <div className={`text-xs mt-0.5 ${planStyles[t.plan] || 'text-gray-400'}`}>{planLabel[t.plan] || t.plan}</div>
                  {t.isCurrentUser && <div className="text-[9px] text-[var(--blue)] font-bold mt-0.5">← você</div>}
                  <div className="mt-3 text-2xl font-black text-[var(--green)]">{t.winRate}%</div>
                  <div className="text-xs text-gray-600">{t.total} ops</div>
                </div>
              ))}
            </div>
          )}

          {/* Full table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black/30 border-b border-white/5 text-[10px] uppercase tracking-widest text-gray-500">
                    <th className="p-4 w-16 text-center">#</th>
                    <th className="p-4">Trader</th>
                    <th className="p-4 text-center">Win Rate</th>
                    <th className="p-4 text-center">W/L</th>
                    <th className="p-4 text-center">Total Ops</th>
                    <th className="p-4 text-right">Plano</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map(t => (
                    <tr key={t.userId}
                      className={`transition ${t.isCurrentUser ? 'bg-[var(--blue)]/8 border-l-2 border-l-[var(--blue)]' : 'hover:bg-white/3'}`}>
                      <td className="p-4 text-center">
                        {t.rank <= 3
                          ? <span className="text-lg">{medals[t.rank - 1]}</span>
                          : <span className="text-gray-600 font-bold text-sm">#{t.rank}</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${t.isCurrentUser ? 'bg-[var(--blue)]/20 text-[var(--blue)]' : 'bg-white/5 text-gray-400'}`}>
                            {(t.name || t.username)[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{t.name || t.username}</div>
                            {t.isCurrentUser && <div className="text-[10px] text-[var(--blue)]">← você</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-black text-sm ${t.winRate >= 80 ? 'text-[var(--gold)]' : t.winRate >= 70 ? 'text-[var(--green)]' : t.winRate >= 60 ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {t.winRate}%
                        </span>
                      </td>
                      <td className="p-4 text-center text-sm font-mono">
                        <span className="text-[var(--green)]">{t.wins}</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-[var(--red)]">{t.losses}</span>
                      </td>
                      <td className="p-4 text-center text-sm text-gray-300 font-mono">{t.total}</td>
                      <td className="p-4 text-right">
                        <span className={`text-[10px] font-bold ${planStyles[t.plan] || 'text-gray-400'}`}>
                          {planLabel[t.plan] || t.plan}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-gray-700 text-center">
        Ranking baseado em dados reais do banco de dados · Período: {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : 'todo o histórico'}
      </p>
    </div>
  );
}
