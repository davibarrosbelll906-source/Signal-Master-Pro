import { useState, useEffect } from "react";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, Shield, Calculator } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";

interface HistoryEntry {
  ts: number;
  result: 'win' | 'loss';
  asset?: string;
  score?: number;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#12121f',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
};

const STRATEGIES = [
  {
    id: 'fixed',
    name: 'Mão Fixa',
    desc: 'Risco constante por operação. Ideal para consistência e longo prazo.',
    risk: 'BAIXO',
    tag: 'RECOMENDADO',
    color: 'border-[var(--green)]',
    calc: (bank: number, pct: number) => bank * (pct / 100),
  },
  {
    id: 'soros',
    name: 'Soros',
    desc: 'Reinveste o lucro da operação anterior. Alto potencial de alavancagem.',
    risk: 'MÉDIO',
    tag: '',
    color: 'border-[var(--blue)]/50',
    calc: (bank: number, pct: number, lastProfit?: number) => bank * (pct / 100) + (lastProfit ?? 0),
  },
  {
    id: 'kelly',
    name: 'Kelly Criterion',
    desc: 'Usa o win rate real para calcular o tamanho ótimo da entrada.',
    risk: 'MÉDIO',
    tag: '',
    color: 'border-purple-500/50',
    calc: (bank: number, _: number, __?: number, wr?: number) => {
      const p = (wr ?? 65) / 100;
      const kelly = (2 * p - 1);
      return Math.max(0, bank * kelly * 0.25);
    },
  },
  {
    id: 'martingale',
    name: 'Martingale',
    desc: 'Dobra a entrada após um loss. Perigoso sem banca adequada.',
    risk: 'ALTO',
    tag: 'ALTO RISCO',
    color: 'border-[var(--red)]/50',
    calc: (bank: number, pct: number, _?: number, __?: number, losses?: number) => bank * (pct / 100) * Math.pow(2, losses ?? 0),
  },
];

export default function BankPage() {
  const [hist, setHist] = useState<HistoryEntry[]>([]);
  const [bank, setBank] = useState(1000);
  const [pct, setPct] = useState(2);
  const [payout, setPayout] = useState(85);
  const [strategy, setStrategy] = useState('fixed');

  const [equityData, setEquityData] = useState<{ day: string; equity: number }[]>([]);

  useEffect(() => {
    try {
      const raw: HistoryEntry[] = JSON.parse(localStorage.getItem('smpH7') || '[]').sort((a: HistoryEntry, b: HistoryEntry) => a.ts - b.ts);
      setHist(raw);

      // Build equity curve
      let equity = bank;
      const dayMap: Record<string, number> = {};
      raw.forEach(e => {
        const entry = equity * (pct / 100);
        if (e.result === 'win') equity += entry * (payout / 100);
        else equity -= entry;
        equity = Math.max(0, equity);
        const day = new Date(e.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dayMap[day] = Math.round(equity);
      });
      setEquityData(Object.entries(dayMap).map(([day, equity]) => ({ day, equity })));
    } catch {}
  }, [bank, pct, payout]);

  const wins = hist.filter(h => h.result === 'win').length;
  const losses = hist.filter(h => h.result === 'loss').length;
  const total = wins + losses;
  const wr = total > 0 ? (wins / total) * 100 : 0;

  // Simulate final equity
  let simEquity = bank;
  let maxDrawdown = 0;
  let peak = bank;
  let consecutiveLosses = 0;
  let maxConsecLosses = 0;
  hist.forEach(e => {
    const entry = simEquity * (pct / 100);
    if (e.result === 'win') { simEquity += entry * (payout / 100); consecutiveLosses = 0; }
    else { simEquity -= entry; consecutiveLosses++; maxConsecLosses = Math.max(maxConsecLosses, consecutiveLosses); }
    simEquity = Math.max(0, simEquity);
    peak = Math.max(peak, simEquity);
    const dd = ((peak - simEquity) / peak) * 100;
    maxDrawdown = Math.max(maxDrawdown, dd);
  });

  const pnl = simEquity - bank;
  const pnlPct = ((simEquity - bank) / bank) * 100;
  const expectedEntry = bank * (pct / 100);
  const selectedStrategy = STRATEGIES.find(s => s.id === strategy)!;
  const kellySuggested = Math.max(0, (2 * (wr / 100) - 1)) * 0.25 * 100;

  const todayHist = hist.filter(h => new Date(h.ts).toDateString() === new Date().toDateString());
  const todayWins = todayHist.filter(h => h.result === 'win').length;
  const todayLosses = todayHist.filter(h => h.result === 'loss').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Gestão de Banca</h1>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 bg-gradient-to-br from-white/5 to-[var(--green)]/10 border-[var(--green)]/20 border">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2"><Wallet size={14} /> Banca Simulada</div>
          <div className="text-3xl font-black text-white">R$ {simEquity.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className={`text-sm font-medium mt-1 flex items-center gap-1 ${pnl >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {pnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {pnl >= 0 ? '+' : ''}R$ {Math.abs(pnl).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({pnlPct.toFixed(1)}%)
          </div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className={`text-2xl font-black ${wr >= 65 ? 'text-[var(--green)]' : wr >= 50 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{wr.toFixed(1)}%</div>
          <div className="text-xs text-gray-600 mt-1">{total} operações</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Max Drawdown</div>
          <div className="text-2xl font-black text-[var(--red)]">{maxDrawdown.toFixed(1)}%</div>
          <div className="text-xs text-gray-600 mt-1">{maxConsecLosses} losses consec.</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Hoje</div>
          <div className="text-xl font-black"><span className="text-[var(--green)]">{todayWins}W</span><span className="text-gray-600 mx-1">/</span><span className="text-[var(--red)]">{todayLosses}L</span></div>
          <div className="text-xs text-gray-600 mt-1">{todayHist.length} ops hoje</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Calculator */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calculator size={14} className="text-[var(--green)]" /> Parâmetros
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Banca inicial (R$)</label>
                <input type="number" value={bank} min={100} max={1000000}
                  onChange={e => setBank(parseFloat(e.target.value) || 1000)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--green)]/50" />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Risco por entrada</span>
                  <span className="font-bold text-[var(--red)]">{pct}%</span>
                </div>
                <input type="range" min={0.5} max={10} step={0.5} value={pct}
                  onChange={e => setPct(parseFloat(e.target.value))}
                  className="w-full accent-[var(--red)]" />
                {wr > 0 && pct > kellySuggested && (
                  <p className="text-xs text-yellow-400 mt-1">⚠️ Kelly sugere máx {kellySuggested.toFixed(1)}% para seu WR</p>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Payout médio</span>
                  <span className="font-bold text-[var(--blue)]">{payout}%</span>
                </div>
                <input type="range" min={70} max={95} step={1} value={payout}
                  onChange={e => setPayout(parseInt(e.target.value))}
                  className="w-full accent-[var(--blue)]" />
              </div>
            </div>

            <div className="mt-5 p-4 bg-black/20 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Entrada sugerida</span>
                <span className="font-bold text-white">R$ {expectedEntry.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Lucro potencial</span>
                <span className="font-bold text-[var(--green)]">+R$ {(expectedEntry * payout / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Risco real</span>
                <span className="font-bold text-[var(--red)]">-R$ {expectedEntry.toFixed(2)}</span>
              </div>
              {wr > 0 && (
                <div className="flex justify-between text-sm border-t border-white/5 pt-2 mt-2">
                  <span className="text-gray-500">EV por op.</span>
                  <span className={`font-bold ${(wr / 100) * (expectedEntry * payout / 100) - (1 - wr / 100) * expectedEntry > 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    R$ {((wr / 100) * (expectedEntry * payout / 100) - (1 - wr / 100) * expectedEntry).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center - Chart + Strategies */}
        <div className="lg:col-span-2 space-y-4">

          {/* Equity Curve */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Curva de Capital Simulada</h3>
            {equityData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" stroke="#555" tick={{ fontSize: 10, fill: '#777' }} />
                  <YAxis stroke="#555" tick={{ fontSize: 10, fill: '#777' }} tickFormatter={v => `R$${v}`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Banca']} />
                  <ReferenceLine y={bank} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="equity" stroke={simEquity >= bank ? 'var(--green)' : 'var(--red)'} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-gray-600">
                <DollarSign size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Registre operações na página de Sinais para ver a curva de capital</p>
              </div>
            )}
          </div>

          {/* Strategies */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield size={14} /> Estratégia de Gestão
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {STRATEGIES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStrategy(s.id)}
                  className={`p-4 border rounded-xl text-left transition-all ${
                    strategy === s.id ? s.color + ' bg-white/5' : 'border-white/10 hover:border-white/20 bg-white/3'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-bold text-white text-sm">{s.name}</div>
                    {s.tag && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        s.risk === 'ALTO' ? 'bg-[var(--red)]/20 text-[var(--red)]' : 'bg-[var(--green)]/20 text-[var(--green)]'
                      }`}>{s.tag}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                  <div className={`mt-2 text-xs font-bold ${s.risk === 'ALTO' ? 'text-[var(--red)]' : s.risk === 'MÉDIO' ? 'text-yellow-400' : 'text-[var(--green)]'}`}>
                    Risco: {s.risk}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
        <AlertTriangle className="shrink-0 mt-0.5 text-yellow-400" size={16} />
        <div>
          <p className="font-bold mb-1">Aviso de Risco</p>
          <p className="text-xs text-yellow-200/80">Os valores exibidos são simulações baseadas no seu histórico de sinais. Resultados passados não garantem resultados futuros. Opere com disciplina e nunca arrisque mais do que pode perder.</p>
        </div>
      </div>
    </div>
  );
}
