import { useState } from "react";
import { Play, Settings2 } from "lucide-react";

export default function BacktestingPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setResults({
        ops: 342,
        winRate: 78.4,
        profit: 2450.50,
        drawdown: 4.2,
        sharpe: 1.8
      });
      setRunning(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Backtesting Engine</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 h-fit">
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
            <Settings2 className="text-[var(--green)]" />
            <h2 className="text-lg font-bold text-white">Parâmetros</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Período (Dias)</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
                <option>Últimos 90 dias</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Banca Inicial</label>
              <input type="number" defaultValue="1000" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Risco por Operação (%)</label>
              <input type="number" defaultValue="2" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Score Mínimo (%)</label>
              <input type="range" min="40" max="90" defaultValue="70" className="w-full accent-[var(--green)]" />
            </div>

            <button 
              onClick={handleRun}
              disabled={running}
              className="w-full mt-4 bg-[var(--green)] text-black font-bold rounded-lg px-4 py-3 hover:bg-[var(--green-dark)] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {running ? "Processando..." : <><Play size={18} /> Iniciar Simulação</>}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {results ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-card-enter">
              <div className="glass-card p-4 text-center">
                <div className="text-sm text-gray-400 mb-1">Total de Ops</div>
                <div className="text-2xl font-bold text-white">{results.ops}</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                <div className="text-2xl font-bold text-[var(--green)]">{results.winRate}%</div>
              </div>
              <div className="glass-card p-4 text-center border border-[var(--green)]/30 bg-[var(--green)]/5">
                <div className="text-sm text-[var(--green)] mb-1">Lucro Estimado</div>
                <div className="text-2xl font-bold text-white">R$ {results.profit.toFixed(2)}</div>
              </div>
              <div className="glass-card p-4 text-center">
                <div className="text-sm text-gray-400 mb-1">Max Drawdown</div>
                <div className="text-2xl font-bold text-[var(--red)]">{results.drawdown}%</div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center text-gray-500 border-dashed">
              Configure os parâmetros e inicie a simulação para ver os resultados.
            </div>
          )}
          
          <div className="glass-card p-6 h-64 flex items-center justify-center text-gray-500">
            Gráfico: Curva de Capital (Equity Curve)
          </div>
        </div>
      </div>
    </div>
  );
}
