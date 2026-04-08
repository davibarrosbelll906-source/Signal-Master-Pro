import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, ReferenceLine
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
  green: '#00ff88', blue: '#4488ff', red: '#ff4466',
  gold: '#ffd700', purple: '#a855f7', orange: '#f97316',
};

const TS: React.CSSProperties = {
  backgroundColor: '#12121f', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#fff', fontSize: 12,
};

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{label}</div>
      <div className={`text-2xl font-black tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [hist, setHist] = useState<HistoryEntry[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch { setHist([]); }
  }, []);

  const now = Date.now();
  const cutoff = range === '7d' ? now - 7 * 86400000 : range === '30d' ? now - 30 * 86400000 : 0;
  const data = useMemo(() => hist.filter(h => h.ts > cutoff), [hist, range, cutoff]);

  const totalOps = data.length;
  const wins = data.filter(h => h.result === 'win').length;
  const losses = totalOps - wins;
  const globalWR = totalOps > 0 ? (wins / totalOps) * 100 : 0;
  const avgScore = totalOps > 0 ? data.reduce((a, h) => a + (h.score || 0), 0) / totalOps : 0;

  // ── Professional metrics ──────────────────────────────────────────────────
  const profitFactor = useMemo(() => {
    if (losses === 0) return wins > 0 ? Infinity : 0;
    return wins / losses;
  }, [wins, losses]);

  const expectancy = useMemo(() => {
    // Simplified: E = WR - (1 - WR) = 2*WR - 1 per unit bet
    return totalOps > 0 ? (globalWR / 100) * 1 - ((1 - globalWR / 100) * 1) : 0;
  }, [globalWR, totalOps]);

  const maxDrawdown = useMemo(() => {
    let balance = 0;
    let peak = 0;
    let maxDD = 0;
    for (const h of data.sort((a, b) => a.ts - b.ts)) {
      balance += h.result === 'win' ? 1 : -1;
      if (balance > peak) peak = balance;
      const dd = peak - balance;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }, [data]);

  const sharpeRatio = useMemo(() => {
    const dayMap: Record<string, { w: number; l: number }> = {};
    data.forEach(h => {
      const day = new Date(h.ts).toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { w: 0, l: 0 };
      h.result === 'win' ? dayMap[day].w++ : dayMap[day].l++;
    });
    const returns = Object.values(dayMap).map(({ w, l }) => {
      const t = w + l;
      return t > 0 ? w / t - 0.5 : 0;
    });
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    return std > 0 ? mean / std : 0;
  }, [data]);

  // ── Equity curve (cumulative W/L balance) ────────────────────────────────
  const equityCurve = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.ts - b.ts);
    let balance = 0;
    return sorted.map(h => {
      balance += h.result === 'win' ? 1 : -1;
      return {
        time: new Date(h.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        balance,
        color: balance >= 0 ? COLORS.green : COLORS.red,
      };
    }).slice(-50);
  }, [data]);

  // ── Existing charts ───────────────────────────────────────────────────────
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

  const catData = ['forex', 'crypto', 'commodity'].map(c => {
    const items = data.filter(h => h.category === c);
    const w = items.filter(h => h.result === 'win').length;
    return {
      name: c.charAt(0).toUpperCase() + c.slice(1),
      value: items.length ? Math.round((w / items.length) * 100) : 0,
      ops: items.length,
    };
  });

  const assetMap: Record<string, { w: number; total: number }> = {};
  data.forEach(h => {
    if (!assetMap[h.asset]) assetMap[h.asset] = { w: 0, total: 0 };
    assetMap[h.asset].total++;
    if (h.result === 'win') assetMap[h.asset].w++;
  });
  const assetData = Object.entries(assetMap)
    .map(([asset, { w, total }]) => ({ asset, winRate: Math.round((w / total) * 100), ops: total }))
    .sort((a, b) => b.winRate - a.winRate).slice(0, 8);

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
    .map(([ind, { correct, total }]) => ({ ind: ind.toUpperCase(), accuracy: total > 0 ? Math.round((correct / total) * 100) : 50, total }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const qualMap: Record<string, number> = {};
  data.forEach(h => { if (h.quality) qualMap[h.quality] = (qualMap[h.quality] || 0) + 1; });
  const qualData = Object.entries(qualMap).map(([name, value]) => ({ name, value }));

  const hourMap: Record<number, { w: number; total: number }> = {};
  data.forEach(h => {
    const hr = new Date(h.ts).getHours();
    if (!hourMap[hr]) hourMap[hr] = { w: 0, total: 0 };
    hourMap[hr].total++;
    if (h.result === 'win') hourMap[hr].w++;
  });
  const hourData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}h`,
    winRate: hourMap[i] ? Math.round((hourMap[i].w / hourMap[i].total) * 100) : null,
    ops: hourMap[i]?.total ?? 0,
  })).filter(d => d.ops > 0);
  const bestHour = hourData.reduce((best, d) => (!best || (d.winRate ?? 0) > (best.winRate ?? 0) ? d : best), null as typeof hourData[0] | null);

  const pieColors = [COLORS.blue, COLORS.gold, COLORS.purple, COLORS.orange, COLORS.green];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <div className="flex gap-1">
          {(['7d', '30d', 'all'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${range === r ? 'bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/30' : 'text-gray-500 hover:text-white border border-transparent'}`}>
              {r === '7d' ? '7 dias' : r === '30d' ? '30 dias' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs básicos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Operações" value={totalOps} />
        <StatCard label="Win Rate Global" value={`${globalWR.toFixed(1)}%`}
          color={globalWR >= 65 ? 'text-[var(--green)]' : globalWR >= 50 ? 'text-yellow-400' : 'text-[var(--red)]'}
          sub={`${wins}W / ${losses}L`} />
        <StatCard label="Score Médio" value={`${avgScore.toFixed(0)}%`} color="text-[var(--blue)]" />
        <StatCard label="Max Drawdown" value={maxDrawdown}
          color={maxDrawdown === 0 ? 'text-[var(--green)]' : maxDrawdown <= 3 ? 'text-yellow-400' : 'text-[var(--red)]'}
          sub="operações consecutivas perdidas" />
      </div>

      {/* KPIs profissionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Profit Factor"
          value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
          color={profitFactor >= 1.5 ? 'text-[var(--green)]' : profitFactor >= 1 ? 'text-yellow-400' : 'text-[var(--red)]'}
          sub="wins ÷ losses (>1.5 = bom)" />
        <StatCard label="Expectativa"
          value={`${(expectancy * 100).toFixed(1)}%`}
          color={expectancy > 0 ? 'text-[var(--green)]' : expectancy === 0 ? 'text-yellow-400' : 'text-[var(--red)]'}
          sub="retorno médio por operação" />
        <StatCard label="Índice de Sharpe"
          value={sharpeRatio.toFixed(2)}
          color={sharpeRatio >= 1 ? 'text-[var(--green)]' : sharpeRatio >= 0 ? 'text-yellow-400' : 'text-[var(--red)]'}
          sub="retorno ajustado ao risco" />
        <StatCard label="Consistência"
          value={`${wins > 0 && losses > 0 ? Math.min(100, Math.round((Math.min(wins, losses) / Math.max(wins, losses)) * 100 * (globalWR / 50))) : 0}%`}
          color="text-purple-400"
          sub="regularidade dos resultados" />
      </div>

      {totalOps === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-gray-400 font-medium">Nenhum dado disponível</p>
          <p className="text-gray-600 text-sm mt-2">Registre WIN/LOSS na página de Sinais para ver seus analytics aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Curva de Banca (Equity Curve) */}
          {equityCurve.length > 1 && (
            <div className="glass-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Curva de Banca (Equity Curve)</h3>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  equityCurve[equityCurve.length-1].balance >= 0
                    ? 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20'
                    : 'text-[var(--red)] bg-[var(--red)]/10 border-[var(--red)]/20'
                }`}>
                  Saldo: {equityCurve[equityCurve.length-1].balance >= 0 ? '+' : ''}{equityCurve[equityCurve.length-1].balance} units
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#555" tick={{ fontSize: 10, fill: '#aaa' }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} />
                  <Tooltip contentStyle={TS} formatter={(v: any) => [`${Number(v) >= 0 ? '+' : ''}${v} units`, 'Banca']} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="balance" stroke={COLORS.green} fill="url(#equityGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-600 mt-2">Evolução acumulada de W/L ao longo do tempo. Cada unidade = 1 operação.</p>
            </div>
          )}

          {/* Win Rate por Sessão */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Win Rate por Sessão</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sesData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} />
                <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={TS} formatter={(v: any, _n: any, p: any) => [`${v}% (${p.payload.ops} ops)`, 'Win Rate']} />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {sesData.map((d, i) => <Cell key={i} fill={d.winRate >= 65 ? COLORS.green : d.winRate >= 50 ? COLORS.blue : COLORS.red} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                  <Tooltip contentStyle={TS} formatter={(v: any, _n: any, p: any) => [`${v}% (${p.payload.ops} ops)`, 'Win Rate']} />
                  <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                    {assetData.map((d, i) => <Cell key={i} fill={d.winRate >= 65 ? COLORS.green : d.winRate >= 50 ? COLORS.gold : COLORS.red} />)}
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
                    {catData.map((_, i) => <Cell key={i} fill={[COLORS.blue, COLORS.gold, COLORS.purple][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={TS} formatter={(v: any) => [v, 'Operações']} />
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

          {/* Distribuição de Qualidade */}
          {qualData.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Distribuição de Qualidade</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={qualData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {qualData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TS} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Precisão por Indicador */}
          {indData.length > 0 && (
            <div className="glass-card p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Precisão por Indicador</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={indData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="ind" stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TS} formatter={(v: any, _n: any, p: any) => [`${v}% (${p.payload.total} ops)`, 'Acurácia']} />
                  <ReferenceLine y={50} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                    {indData.map((d, i) => <Cell key={i} fill={d.accuracy >= 70 ? COLORS.green : d.accuracy >= 55 ? COLORS.blue : COLORS.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Win Rate por Hora */}
          {hourData.length > 0 && (
            <div className="glass-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Win Rate por Hora do Dia</h3>
                {bestHour && (
                  <div className="text-xs text-[var(--green)] font-bold bg-[var(--green)]/10 px-3 py-1 rounded-full border border-[var(--green)]/20">
                    🏆 Melhor hora: {bestHour.hour} ({bestHour.winRate}% WR)
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" stroke="#555" tick={{ fontSize: 10, fill: '#aaa' }} />
                  <YAxis stroke="#555" tick={{ fontSize: 11, fill: '#aaa' }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TS} formatter={(v: any, _n: any, p: any) => [`${v}% (${p.payload.ops} ops)`, 'Win Rate']} />
                  <ReferenceLine y={65} stroke={COLORS.green} strokeOpacity={0.3} strokeDasharray="4 4" />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {hourData.map((d, i) => <Cell key={i} fill={(d.winRate ?? 0) >= 70 ? COLORS.green : (d.winRate ?? 0) >= 55 ? COLORS.blue : COLORS.red} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-600 mt-2">Linha verde = meta de 65%. Concentre suas operações nos horários acima da linha.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
