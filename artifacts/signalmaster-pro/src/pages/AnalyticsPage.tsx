import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";

interface HistoryEntry {
  ts: number;
  asset: string;
  direction: 'CALL' | 'PUT';
  score: number;
  quality: string;
  result: 'win' | 'loss';
  category: string;
  sess: string;
  votes?: Record<string, string>;
}

const COLORS = {
  green: '#00ff88',
  blue: '#4488ff',
  red: '#ff4466',
  gold: '#ffd700',
  purple: '#a855f7',
  orange: '#f97316',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#12121f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
};

export default function AnalyticsPage() {
  const [hist, setHist] = useState<HistoryEntry[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    try {
      setHist(JSON.parse(localStorage.getItem('smpH7') || '[]'));
    } catch { setHist([]); }
  }, []);

  const now = Date.now();
  const cutoff = range === '7d' ? now - 7 * 86400000 : range === '30d' ? now - 30 * 86400000 : 0;
  const data = hist.filter(h => h.ts > cutoff);

  // Win Rate by Session
  const sessions = ['london', 'overlap', 'ny', 'asia'];
  const sesData = sessions.map(s => {
    const items = data.filter(h => h.sess === s);
    const w = items.filter(h => h.result === 'win').length;
    return {
      name: s === 'london' ? 'Londres' : s === 'overlap' ? 'Overlap' : s === 'ny' ? 'NY' : 'Ásia',
      winRate: items.length ? Math.round((w / items.length) * 100) : 0,
      ops: items.length,
    };
  });

  // Win Rate by Category
  const catData = ['forex', 'crypto', 'commodity'].map(c => {
    const items = data.filter(h => h.category === c);
    const w = items.filter(h => h.result === 'win').length;
    return {
      name: c.charAt(0).toUpperCase() + c.slice(1),
      value: items.length ? Math.round((w / items.length) * 100) : 0,
      ops: items.length,
    };
  });

  // Win Rate by Asset (top 8)
  const assetMap: Record<string, { w: number; total: number }> = {};
  data.forEach(h => {
    if (!assetMap[h.asset]) assetMap[h.asset] = { w: 0, total: 0 };
    assetMap[h.asset].total++;
    if (h.result === 'win') assetMap[h.asset].w++;
  });
  const assetData = Object.entries(assetMap)
    .map(([asset, { w, total }]) => ({ asset, winRate: Math.round((w / total) * 100), ops: total }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 8);

  // Equity curve (daily)
  const dayMap: Record<string, { w: number; l: number }> = {};
  data.forEach(h => {
    const day = new Date(h.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!dayMap[day]) dayMap[day] = { w: 0, l: 0 };
    h.result === 'win' ? dayMap[day].w++ : dayMap[day].l++;
  });
  let cumWr = 0, cumTotal = 0;
  const equityData = Object.entries(dayMap).slice(-14).map(([day, { w, l }]) => {
    cumWr += w; cumTotal += w + l;
    return { day, ops: w + l, wr: cumTotal > 0 ? Math.round((cumWr / cumTotal) * 100) : 50 };
  });

  // Indicator performance
  const indMap: Record<string, { correct: number; total: number }> = {};
  data.forEach(h => {
    if (!h.votes) return;
    Object.entries(h.votes).forEach(([ind, vote]) => {
      if (!indMap[ind]) indMap[ind] = { correct: 0, total: 0 };
      if (vote !== 'NEUTRAL') {
        indMap[ind].total++;
        if (vote === h.direction && h.result === 'win') indMap[ind].correct++;
      }
    });
  });
  const indData = Object.entries(indMap)
    .map(([ind, { correct, total }]) => ({
      ind: ind.toUpperCase(),
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 50,
      total,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  // Quality distribution
  const qualMap: Record<string, number> = {};
  data.forEach(h => { if (h.quality) qualMap[h.quality] = (qualMap[h.quality] || 0) + 1; });
  const qualData = Object.entries(qualMap).map(([name, value]) => ({ name, value }));

  const totalOps = data.length;
  const wins = data.filter(h => h.result === 'win').length;
  const globalWR = totalOps > 0 ? Math.round((wins / totalOps) * 100) : 0;
  const avgScore = totalOps > 0 ? Math.round(data.reduce((a, h) => a + (h.score || 0), 0) / totalOps) : 0;

  const pieColors = [COLORS.green, COLORS.blue, COLORS.gold, COLORS.purple, COLORS.orange];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Operações', value: totalOps, color: 'text-white' },
          { label: 'Win Rate Global', value: `${globalWR}%`, color: globalWR >= 65 ? 'text-[var(--green)]' : globalWR >= 50 ? 'text-yellow-400' : 'text-[var(--red)]' },
          { label: 'Score Médio', value: `${avgScore}%`, color: 'text-[var(--blue)]' },
          { label: 'WINS / LOSSES', value: `${wins} / ${totalOps - wins}`, color: 'text-white' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-5 text-center">
            <div className="text-xs text-gray-500 mb-2">{label}</div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {totalOps === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-gray-400 font-medium">Nenhum dado disponível</p>
          <p className="text-gray-600 text-sm mt-2">Registre WIN/LOSS na página de Sinais para ver seus analytics aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Win Rate por Sessão */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Win Rate por Sessão</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sesData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} />
                <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Win Rate']} />
                <Bar dataKey="winRate" fill={COLORS.green} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Evolução do Win Rate */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Evolução do Win Rate</h3>
            {equityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="#555" tick={{ fontSize: 10, fill: '#aaa' }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Win Rate Acum.']} />
                  <Line type="monotone" dataKey="wr" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">Dados insuficientes para o período</div>
            )}
          </div>

          {/* Win Rate por Ativo */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Melhores Ativos (Win Rate)</h3>
            {assetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={assetData} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} unit="%" />
                  <YAxis type="category" dataKey="asset" stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} width={60} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Win Rate']} />
                  <Bar dataKey="winRate" fill={COLORS.gold} radius={[0, 4, 4, 0]}>
                    {assetData.map((_, i) => (
                      <Cell key={i} fill={assetData[i].winRate >= 65 ? COLORS.green : assetData[i].winRate >= 50 ? COLORS.gold : COLORS.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">Sem dados de ativos</div>
            )}
          </div>

          {/* Distribuição por Categoria */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Win Rate por Categoria</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={catData} dataKey="ops" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={4}>
                    {catData.map((_, i) => (
                      <Cell key={i} fill={[COLORS.blue, COLORS.gold, COLORS.purple][i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, n: any) => [v, 'Operações']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {catData.map(({ name, value, ops }, i) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: [COLORS.blue, COLORS.gold, COLORS.purple][i] }} />
                    <div>
                      <div className="text-sm font-bold text-white">{name}</div>
                      <div className="text-xs text-gray-500">{value}% WR · {ops} ops</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Indicadores mais precisos */}
          {indData.length > 0 && (
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Precisão por Indicador (Contribuição para WINs)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={indData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="ind" stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, n: any, p: any) => [`${v}% (${p.payload.total} ops)`, 'Acurácia']} />
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                    {indData.map((d, i) => (
                      <Cell key={i} fill={d.accuracy >= 70 ? COLORS.green : d.accuracy >= 55 ? COLORS.blue : COLORS.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Qualidade dos sinais */}
          {qualData.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Distribuição de Qualidade</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={qualData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {qualData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
