import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Calculator, TrendingDown, Info } from "lucide-react";

interface HistEntry {
  result: 'win' | 'loss';
  ts: number;
}

function calcRuinProbability(wr: number, riskPct: number, stopPct: number): number {
  const p = wr / 100;
  const q = 1 - p;
  if (p >= 0.5) {
    const rho = q / p;
    const n = 1 / (riskPct / 100);
    const stop = stopPct / riskPct;
    return Math.pow(rho, stop) * 100;
  }
  return 100;
}

function calcMaxConsecLosses(wr: number, ops: number): number {
  return Math.ceil(Math.log(ops) / Math.log(1 / (1 - wr / 100)));
}

export default function RiskPage() {
  const [bank, setBank] = useState(1000);
  const [riskPct, setRiskPct] = useState(2);
  const [payout, setPayout] = useState(85);
  const [wr, setWr] = useState(0);
  const [stopPct, setStopPct] = useState(20);

  useEffect(() => {
    try {
      const hist: HistEntry[] = JSON.parse(localStorage.getItem('smpH7') || '[]');
      if (hist.length > 0) {
        const wins = hist.filter(h => h.result === 'win').length;
        setWr(Math.round((wins / hist.length) * 100));
      }
    } catch {}
    try {
      const cfg = JSON.parse(localStorage.getItem('smpCfg7') || '{}');
      if (cfg.riskPerTrade) setRiskPct(cfg.riskPerTrade);
      if (cfg.initialBank) setBank(cfg.initialBank);
      if (cfg.maxDailyLoss) setStopPct(cfg.maxDailyLoss);
    } catch {}
  }, []);

  const effectiveWR = wr > 0 ? wr : 65;
  const entry = bank * (riskPct / 100);
  const potProfit = entry * (payout / 100);
  const ev = (effectiveWR / 100) * potProfit - (1 - effectiveWR / 100) * entry;
  const breakEvenWR = 100 / (1 + payout / 100);
  const ruinProb = calcRuinProbability(effectiveWR, riskPct, stopPct);
  const consecLosses = calcMaxConsecLosses(effectiveWR, 100);
  const martingaleRisk = entry * Math.pow(2, consecLosses);
  const kellyCriterion = Math.max(0, (2 * effectiveWR / 100 - 1) * 0.25 * 100);
  const stopAmount = bank * (stopPct / 100);

  const riskColor = ruinProb < 5 ? 'text-[var(--green)]' : ruinProb < 20 ? 'text-yellow-400' : 'text-[var(--red)]';
  const riskLabel = ruinProb < 5 ? 'Baixo' : ruinProb < 20 ? 'Moderado' : 'Alto';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Shield className="text-[var(--blue)]" /> Calculadora de Risco
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Inputs */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calculator size={14} className="text-[var(--green)]" /> Parâmetros
          </h3>
          <div className="space-y-4">

            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Banca Total (R$)</label>
              <input
                type="number" value={bank} min={100}
                onChange={e => setBank(parseFloat(e.target.value) || 1000)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--green)]/40"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Risco por operação</span>
                <span className={`font-bold ${riskPct > 5 ? 'text-[var(--red)]' : riskPct > 3 ? 'text-yellow-400' : 'text-[var(--green)]'}`}>{riskPct}%</span>
              </div>
              <input type="range" min={0.5} max={10} step={0.5} value={riskPct}
                onChange={e => setRiskPct(parseFloat(e.target.value))}
                className="w-full accent-[var(--green)]" />
              {riskPct > kellyCriterion + 1 && (
                <p className="text-xs text-yellow-400 mt-1">⚠️ Acima do Kelly ideal ({kellyCriterion.toFixed(1)}%)</p>
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

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Win Rate {wr > 0 ? '(seu histórico)' : '(estimado)'}</span>
                <span className={`font-bold ${effectiveWR >= 65 ? 'text-[var(--green)]' : effectiveWR >= 55 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{effectiveWR}%</span>
              </div>
              <input type="range" min={40} max={90} step={1} value={effectiveWR}
                onChange={e => setWr(parseInt(e.target.value))}
                className="w-full accent-[var(--green)]" />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Stop diário (% da banca)</span>
                <span className="font-bold text-[var(--red)]">{stopPct}%</span>
              </div>
              <input type="range" min={5} max={50} step={5} value={stopPct}
                onChange={e => setStopPct(parseInt(e.target.value))}
                className="w-full accent-[var(--red)]" />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">

          {/* Main recommendation */}
          <div className={`glass-card p-5 border ${ruinProb < 5 ? 'border-[var(--green)]/30' : ruinProb < 20 ? 'border-yellow-400/30' : 'border-[var(--red)]/30'}`}>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recomendação do Sistema</h3>
            <div className="text-3xl font-black text-white mb-1">R$ {entry.toFixed(2)}</div>
            <div className="text-xs text-gray-500">entrada ideal por operação</div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Lucro potencial</div>
                <div className="text-sm font-bold text-[var(--green)]">+R$ {potProfit.toFixed(2)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Risco real</div>
                <div className="text-sm font-bold text-[var(--red)]">-R$ {entry.toFixed(2)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">EV por op</div>
                <div className={`text-sm font-bold ${ev >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                  {ev >= 0 ? '+' : ''}R$ {ev.toFixed(2)}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Stop diário</div>
                <div className="text-sm font-bold text-yellow-400">-R$ {stopAmount.toFixed(0)}</div>
              </div>
            </div>
          </div>

          {/* Risk metrics */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Métricas de Risco</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'Probabilidade de Ruína',
                  value: `${ruinProb.toFixed(1)}%`,
                  color: riskColor,
                  badge: riskLabel,
                  badgeColor: riskColor,
                },
                {
                  label: 'WR Mínimo para Lucrar',
                  value: `${breakEvenWR.toFixed(1)}%`,
                  color: effectiveWR > breakEvenWR ? 'text-[var(--green)]' : 'text-[var(--red)]',
                  badge: effectiveWR > breakEvenWR ? 'OK ✓' : 'RISCO',
                  badgeColor: effectiveWR > breakEvenWR ? 'text-[var(--green)]' : 'text-[var(--red)]',
                },
                {
                  label: 'Kelly Criterion Ideal',
                  value: `${kellyCriterion.toFixed(1)}%`,
                  color: 'text-[var(--blue)]',
                  badge: riskPct <= kellyCriterion ? 'Seguro' : 'Acima',
                  badgeColor: riskPct <= kellyCriterion ? 'text-[var(--green)]' : 'text-yellow-400',
                },
                {
                  label: 'Losses consec. esperados (100 ops)',
                  value: consecLosses,
                  color: 'text-gray-300',
                  badge: '',
                  badgeColor: '',
                },
              ].map(({ label, value, color, badge, badgeColor }) => (
                <div key={label} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${color}`}>{value}</span>
                    {badge && <span className={`text-[10px] font-bold ${badgeColor}`}>{badge}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Martingale Warning */}
      {martingaleRisk > bank * 0.5 && (
        <div className="flex items-start gap-3 p-4 bg-[var(--red)]/10 border border-[var(--red)]/20 rounded-lg text-sm">
          <AlertTriangle className="shrink-0 mt-0.5 text-[var(--red)]" size={16} />
          <div>
            <p className="font-bold text-white mb-1">⚠️ Alerta: Martingale é perigoso com sua banca</p>
            <p className="text-gray-400 text-xs">Com {consecLosses} losses consecutivos esperados, uma sequência de martingale custaria <strong className="text-[var(--red)]">R$ {martingaleRisk.toFixed(0)}</strong> — {((martingaleRisk / bank) * 100).toFixed(0)}% da sua banca.</p>
          </div>
        </div>
      )}

      {/* EV tip */}
      <div className="flex items-start gap-3 p-4 bg-[var(--blue)]/10 border border-[var(--blue)]/20 rounded-lg text-sm">
        <Info className="shrink-0 mt-0.5 text-[var(--blue)]" size={16} />
        <div>
          <p className="font-bold text-white mb-1">Valor Esperado (EV) por operação: <span className={ev >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>R$ {ev.toFixed(2)}</span></p>
          <p className="text-gray-400 text-xs">
            {ev >= 0
              ? `Positivo! Com ${effectiveWR}% WR e ${payout}% payout, você tem edge matemático. Após 100 ops, o retorno esperado é R$ ${(ev * 100).toFixed(0)}.`
              : `Negativo. Você precisa de pelo menos ${breakEvenWR.toFixed(0)}% de WR com esse payout para ter edge. Melhore sua taxa de acerto primeiro.`}
          </p>
        </div>
      </div>
    </div>
  );
}
