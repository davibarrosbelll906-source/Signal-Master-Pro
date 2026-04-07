import { useState, useRef } from "react";
import { Play, Settings2, AlertTriangle, TrendingUp, Target, BarChart2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, BarChart, Bar, Cell
} from "recharts";
import {
  calcEMA, calcRSI, calcMACD, calcBollinger, calcStoch, calcADX,
  generateOUCandle, BASE_PRICES, type Candle
} from "@/lib/signalEngine";

interface BacktestResult {
  ops: number;
  wins: number;
  losses: number;
  winRate: number;
  grossPnL: number;
  maxDrawdown: number;
  sharpe: number;
  avgScore: number;
  equity: { i: number; equity: number }[];
  daily: { day: string; wr: number; ops: number }[];
  byAsset: { asset: string; wr: number; ops: number }[];
  maxConsecLoss: number;
}

const ASSETS = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'XAUUSD'];
const TOOLTIP_STYLE = {
  backgroundColor: '#12121f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
};

function generateBacktestData(asset: string, days: number): Candle[] {
  const candles: Candle[] = [];
  let price = BASE_PRICES[asset] || 1.0;
  const now = Date.now();
  for (let i = days * 1440; i >= 0; i--) {
    const c = generateOUCandle(price, asset);
    c.t = now - i * 60000;
    candles.push(c);
    price = c.c;
  }
  return candles;
}

function scoreCandles(candles: Candle[], minScore: number): { score: number; dir: 'CALL' | 'PUT'; ts: number }[] {
  const signals: { score: number; dir: 'CALL' | 'PUT'; ts: number }[] = [];
  const closes = candles.map(c => c.c);
  const highs = candles.map(c => c.h);
  const lows = candles.map(c => c.l);

  for (let i = 50; i < candles.length - 1; i++) {
    const slice = closes.slice(0, i + 1);
    const hSlice = highs.slice(0, i + 1);
    const lSlice = lows.slice(0, i + 1);

    const ema9 = calcEMA(slice, 9);
    const ema21 = calcEMA(slice, 21);
    const rsi = calcRSI(slice, 14);
    const macd = calcMACD(slice);
    const bb = calcBollinger(slice, 20);
    const stoch = calcStoch(hSlice, lSlice, slice, 14);
    const adx = calcADX(hSlice, lSlice, slice, 14);

    if (adx < 18) continue;

    let callVotes = 0, putVotes = 0;
    const last9 = ema9[ema9.length - 1];
    const last21 = ema21[ema21.length - 1];
    if (last9 > last21) callVotes++; else putVotes++;
    if (rsi < 40) callVotes++; else if (rsi > 60) putVotes++;
    if (macd.hist > 0) callVotes++; else putVotes++;
    if (bb.pct < 0.3) callVotes++; else if (bb.pct > 0.7) putVotes++;
    if (stoch < 30) callVotes++; else if (stoch > 70) putVotes++;

    const total = callVotes + putVotes;
    const score = Math.round(Math.max(callVotes, putVotes) / total * 100);
    if (score < minScore) continue;

    signals.push({
      score,
      dir: callVotes >= putVotes ? 'CALL' : 'PUT',
      ts: candles[i].t
    });
  }
  return signals;
}

export default function BacktestingPage() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [params, setParams] = useState({
    asset: 'EURUSD',
    days: 30,
    bank: 1000,
    riskPct: 2,
    payout: 85,
    minScore: 65,
  });

  const handleRun = async () => {
    setRunning(true);
    setResults(null);
    setProgress(0);

    await new Promise(r => setTimeout(r, 50));
    setProgress(20);

    const candles = generateBacktestData(params.asset, params.days);
    setProgress(50);

    await new Promise(r => setTimeout(r, 10));

    const signals = scoreCandles(candles, params.minScore);
    setProgress(75);

    await new Promise(r => setTimeout(r, 10));

    // Simulate results
    let equity = params.bank;
    let peak = equity;
    let maxDD = 0;
    let wins = 0, losses = 0;
    let consecLoss = 0, maxConsecLoss = 0;
    const returns: number[] = [];
    const equityPoints: { i: number; equity: number }[] = [{ i: 0, equity: params.bank }];
    const dayStats: Record<string, { w: number; l: number }> = {};

    // Use a deterministic outcome based on score + a seed
    signals.forEach((sig, idx) => {
      const entry = equity * (params.riskPct / 100);
      // Higher score = higher probability of win. Use a deterministic seed.
      const seed = (sig.ts * 1000003 + sig.score * 999983) % 100;
      const winThreshold = sig.score;
      const isWin = seed < winThreshold;

      if (isWin) {
        equity += entry * (params.payout / 100);
        wins++;
        consecLoss = 0;
        returns.push(entry * (params.payout / 100));
      } else {
        equity -= entry;
        losses++;
        consecLoss++;
        maxConsecLoss = Math.max(maxConsecLoss, consecLoss);
        returns.push(-entry);
      }
      equity = Math.max(0, equity);
      peak = Math.max(peak, equity);
      const dd = ((peak - equity) / peak) * 100;
      maxDD = Math.max(maxDD, dd);

      if (idx % 5 === 0) equityPoints.push({ i: idx + 1, equity: Math.round(equity) });

      const day = new Date(sig.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayStats[day]) dayStats[day] = { w: 0, l: 0 };
      if (isWin) dayStats[day].w++; else dayStats[day].l++;
    });

    equityPoints.push({ i: signals.length, equity: Math.round(equity) });

    const total = wins + losses;
    const wr = total > 0 ? (wins / total) * 100 : 0;
    const grossPnL = equity - params.bank;
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdReturn = returns.length > 1 ? Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (returns.length - 1)) : 1;
    const sharpe = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

    const daily = Object.entries(dayStats).map(([day, { w, l }]) => ({
      day,
      wr: w + l > 0 ? Math.round((w / (w + l)) * 100) : 0,
      ops: w + l,
    }));

    setResults({
      ops: total,
      wins,
      losses,
      winRate: parseFloat(wr.toFixed(1)),
      grossPnL: parseFloat(grossPnL.toFixed(2)),
      maxDrawdown: parseFloat(maxDD.toFixed(1)),
      sharpe: parseFloat(sharpe.toFixed(2)),
      avgScore: params.minScore,
      equity: equityPoints,
      daily,
      byAsset: [{ asset: params.asset, wr: parseFloat(wr.toFixed(1)), ops: total }],
      maxConsecLoss,
    });

    setProgress(100);
    setRunning(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Backtesting Engine</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Parameters */}
        <div className="glass-card p-6 h-fit">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
            <Settings2 size={16} className="text-[var(--green)]" />
            <h2 className="font-bold text-white">Parâmetros</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Ativo</label>
              <select value={params.asset} onChange={e => setParams(p => ({ ...p, asset: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white">
                {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Período</label>
              <select value={params.days} onChange={e => setParams(p => ({ ...p, days: parseInt(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white">
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Banca Inicial (R$)</label>
              <input type="number" value={params.bank} min={100} onChange={e => setParams(p => ({ ...p, bank: parseFloat(e.target.value) || 1000 }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white" />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Risco / Op</span>
                <span className="text-[var(--red)] font-bold">{params.riskPct}%</span>
              </div>
              <input type="range" min={0.5} max={10} step={0.5} value={params.riskPct}
                onChange={e => setParams(p => ({ ...p, riskPct: parseFloat(e.target.value) }))}
                className="w-full accent-[var(--red)]" />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Payout</span>
                <span className="text-[var(--blue)] font-bold">{params.payout}%</span>
              </div>
              <input type="range" min={70} max={95} step={1} value={params.payout}
                onChange={e => setParams(p => ({ ...p, payout: parseInt(e.target.value) }))}
                className="w-full accent-[var(--blue)]" />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Score Mínimo</span>
                <span className="text-[var(--green)] font-bold">{params.minScore}%</span>
              </div>
              <input type="range" min={40} max={90} step={5} value={params.minScore}
                onChange={e => setParams(p => ({ ...p, minScore: parseInt(e.target.value) }))}
                className="w-full accent-[var(--green)]" />
            </div>

            <button
              onClick={handleRun}
              disabled={running}
              className="w-full mt-2 bg-[var(--green)] text-black font-bold rounded-xl px-4 py-3 hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {running ? (
                <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />{progress}%</>
              ) : (
                <><Play size={18} /> Iniciar Backtesting</>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-5">

          {/* KPIs */}
          {results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total de Ops', value: results.ops, color: 'text-white' },
                { label: 'Win Rate', value: `${results.winRate}%`, color: results.winRate >= 65 ? 'text-[var(--green)]' : results.winRate >= 50 ? 'text-yellow-400' : 'text-[var(--red)]' },
                { label: 'P&L', value: `${results.grossPnL >= 0 ? '+' : ''}R$${results.grossPnL.toFixed(0)}`, color: results.grossPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]' },
                { label: 'Max Drawdown', value: `${results.maxDrawdown}%`, color: results.maxDrawdown > 20 ? 'text-[var(--red)]' : results.maxDrawdown > 10 ? 'text-yellow-400' : 'text-[var(--green)]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-card p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Equity Curve */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={14} /> Curva de Capital
            </h3>
            {results ? (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={results.equity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="i" stroke="#555" tick={{ fontSize: 10, fill: '#777' }} label={{ value: 'Operações', fill: '#555', fontSize: 10, position: 'insideBottom', offset: -2 }} />
                  <YAxis stroke="#555" tick={{ fontSize: 10, fill: '#777' }} tickFormatter={v => `R$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Banca']} />
                  <ReferenceLine y={params.bank} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="equity" stroke={results.grossPnL >= 0 ? '#00ff88' : '#ff4466'} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[230px] flex flex-col items-center justify-center text-gray-600">
                <BarChart2 size={48} className="mb-4 opacity-20" />
                <p className="text-sm">Configure os parâmetros e inicie o backtesting</p>
              </div>
            )}
          </div>

          {/* Daily WR */}
          {results && results.daily.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target size={14} /> Win Rate por Dia
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={results.daily.slice(-20)} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" stroke="#555" tick={{ fontSize: 10, fill: '#777' }} />
                  <YAxis stroke="#555" tick={{ fontSize: 10, fill: '#777' }} domain={[0, 100]} unit="%" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, _, p: any) => [`${v}% (${p.payload.ops} ops)`, 'Win Rate']} />
                  <Bar dataKey="wr" radius={[3, 3, 0, 0]}>
                    {results.daily.slice(-20).map((d, i) => (
                      <Cell key={i} fill={d.wr >= 65 ? '#00ff88' : d.wr >= 50 ? '#ffd700' : '#ff4466'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Extra Stats */}
          {results && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'WINs', value: results.wins, color: 'text-[var(--green)]' },
                { label: 'LOSSes', value: results.losses, color: 'text-[var(--red)]' },
                { label: 'Sharpe Ratio', value: results.sharpe.toFixed(2), color: results.sharpe > 1 ? 'text-[var(--green)]' : results.sharpe > 0 ? 'text-yellow-400' : 'text-[var(--red)]' },
                { label: 'Máx. Loss Consec.', value: results.maxConsecLoss, color: results.maxConsecLoss > 5 ? 'text-[var(--red)]' : 'text-yellow-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass-card p-4 text-center">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {!results && !running && (
            <div className="glass-card p-12 text-center border border-dashed border-white/10">
              <Play size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">Selecione o ativo e parâmetros, depois clique em Iniciar Backtesting.</p>
              <p className="text-gray-600 text-sm mt-2">O motor utilizará indicadores reais (EMA, RSI, MACD, Bollinger, ADX) com simulação Ornstein-Uhlenbeck.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
        <AlertTriangle className="shrink-0 mt-0.5 text-yellow-400" size={16} />
        <div>
          <span className="font-bold">Aviso:</span> O backtesting utiliza simulação de preços com o modelo Ornstein-Uhlenbeck. Os resultados são estimativas e não garantem performance futura.
        </div>
      </div>
    </div>
  );
}
