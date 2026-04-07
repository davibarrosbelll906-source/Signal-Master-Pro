import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Activity, BarChart2, Award } from "lucide-react";

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
  asset: string;
  category: string;
  sess: string;
  score?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  forex: '💱', crypto: '₿', commodity: '🏅'
};

export default function ScoreboardPage() {
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [tab, setTab] = useState<'all' | 'forex' | 'crypto' | 'commodity'>('all');
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
  }, []);

  const now = Date.now();
  const cutoff = range === '7d' ? now - 7 * 86400000 : range === '30d' ? now - 30 * 86400000 : 0;
  const filtered = hist.filter(h => h.ts > cutoff && (tab === 'all' || h.category === tab));

  // Group by asset
  const assetMap: Record<string, { w: number; total: number; category: string; scores: number[] }> = {};
  filtered.forEach(h => {
    if (!assetMap[h.asset]) assetMap[h.asset] = { w: 0, total: 0, category: h.category, scores: [] };
    assetMap[h.asset].total++;
    if (h.result === 'win') assetMap[h.asset].w++;
    if (h.score) assetMap[h.asset].scores.push(h.score);
  });

  const rows = Object.entries(assetMap)
    .map(([asset, { w, total, category, scores }]) => ({
      asset,
      category,
      wins: w,
      losses: total - w,
      total,
      wr: Math.round((w / total) * 100),
      avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    }))
    .sort((a, b) => b.wr - a.wr);

  const total = filtered.length;
  const wins = filtered.filter(h => h.result === 'win').length;
  const globalWR = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Session stats
  const sessions = ['london', 'overlap', 'ny', 'asia'];
  const sesStats = sessions.map(s => {
    const items = filtered.filter(h => h.sess === s);
    const w = items.filter(h => h.result === 'win').length;
    return { sess: s, wr: items.length > 0 ? Math.round((w / items.length) * 100) : 0, ops: items.length };
  }).filter(s => s.ops > 0).sort((a, b) => b.wr - a.wr);

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Award className="text-[var(--gold)]" /> Placar por Ativo
        </h1>
        <div className="flex gap-1">
          {(['7d', '30d', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${range === r ? 'bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/30' : 'text-gray-500 hover:text-white border border-transparent'}`}
            >
              {r === '7d' ? '7 dias' : r === '30d' ? '30 dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Ops</div>
          <div className="text-2xl font-black text-white">{total}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className={`text-2xl font-black ${globalWR >= 65 ? 'text-[var(--green)]' : globalWR >= 50 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{globalWR}%</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Ativos Operados</div>
          <div className="text-2xl font-black text-[var(--blue)]">{rows.length}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Melhor Ativo</div>
          <div className="text-lg font-black text-[var(--gold)]">{rows[0]?.asset || '—'}</div>
        </div>
      </div>

      {/* Session Performance */}
      {sesStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Performance por Sessão</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sessions.map(s => {
              const stat = sesStats.find(x => x.sess === s) || { wr: 0, ops: 0, sess: s };
              const labels: Record<string, string> = { london: '🇬🇧 Londres', overlap: '🌍 Overlap', ny: '🇺🇸 Nova York', asia: '🌏 Ásia' };
              return (
                <div key={s} className={`p-3 rounded-xl border text-center ${stat.ops > 0 ? (stat.wr >= 65 ? 'bg-[var(--green)]/5 border-[var(--green)]/20' : 'bg-white/5 border-white/5') : 'bg-white/3 border-white/3 opacity-40'}`}>
                  <div className="text-xs text-gray-500 mb-1">{labels[s]}</div>
                  <div className={`text-xl font-black ${stat.wr >= 65 ? 'text-[var(--green)]' : stat.wr >= 50 ? 'text-yellow-400' : stat.ops > 0 ? 'text-[var(--red)]' : 'text-gray-600'}`}>
                    {stat.ops > 0 ? `${stat.wr}%` : '—'}
                  </div>
                  {stat.ops > 0 && <div className="text-xs text-gray-600 mt-0.5">{stat.ops} ops</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'forex', 'crypto', 'commodity'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition ${tab === t ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}
          >
            {t === 'all' ? 'Todos' : `${CATEGORY_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-16 text-center">
            <BarChart2 size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhum dado disponível</p>
            <p className="text-gray-600 text-sm mt-1">Registre WIN/LOSS na página de Sinais para ver o placar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/30 border-b border-white/5 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 w-8">#</th>
                  <th className="p-4">Ativo</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4 text-center">W / L</th>
                  <th className="p-4 text-center">Win Rate</th>
                  <th className="p-4 text-center">Score Médio</th>
                  <th className="p-4 text-center">Tendência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, i) => (
                  <tr key={row.asset} className={`hover:bg-white/3 transition ${i === 0 ? 'bg-yellow-400/3' : ''}`}>
                    <td className="p-4">
                      <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{row.asset}</div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm capitalize">
                      {CATEGORY_ICONS[row.category]} {row.category}
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[var(--green)] font-bold">{row.wins}</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span className="text-[var(--red)] font-bold">{row.losses}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold px-3 py-1 rounded-lg text-sm ${
                        row.wr >= 75 ? 'bg-[var(--green)]/20 text-[var(--green)]' :
                        row.wr >= 65 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-[var(--red)]/20 text-[var(--red)]'
                      }`}>
                        {row.wr}%
                      </span>
                    </td>
                    <td className="p-4 text-center text-sm text-gray-400 font-mono">
                      {row.avgScore > 0 ? `${row.avgScore}%` : '—'}
                    </td>
                    <td className="p-4 text-center">
                      {row.wr >= 60 ? <TrendingUp className="text-[var(--green)] mx-auto" size={18} /> : <TrendingDown className="text-[var(--red)] mx-auto" size={18} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
