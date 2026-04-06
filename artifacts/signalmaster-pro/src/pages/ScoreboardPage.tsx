import { useState } from "react";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

export default function ScoreboardPage() {
  const [tab, setTab] = useState("all");

  const data = [
    { asset: "EUR/USD", cat: "Forex", total: 145, wins: 112, losses: 33, rate: 77.2, trend: "up", vol: "low" },
    { asset: "BTC/USD", cat: "Cripto", total: 89, wins: 64, losses: 25, rate: 71.9, trend: "up", vol: "high" },
    { asset: "GBP/JPY", cat: "Forex", total: 112, wins: 76, losses: 36, rate: 67.8, trend: "down", vol: "medium" },
    { asset: "XAU/USD", cat: "Commodity", total: 56, wins: 45, losses: 11, rate: 80.3, trend: "up", vol: "high" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Placar por Ativo</h1>
      
      <div className="flex gap-2 mb-4">
        {["all", "forex", "cripto", "commodity"].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition uppercase ${tab === t ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
              <th className="p-4 font-medium">Ativo</th>
              <th className="p-4 font-medium">Categoria</th>
              <th className="p-4 font-medium text-center">W/L</th>
              <th className="p-4 font-medium text-center">Win Rate</th>
              <th className="p-4 font-medium text-center">Tendência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition">
                <td className="p-4 font-bold text-white flex items-center gap-2">
                  {row.asset}
                  {row.vol === 'high' && <Activity size={14} className="text-orange-500" title="Alta Volatilidade" />}
                </td>
                <td className="p-4 text-sm text-gray-400">{row.cat}</td>
                <td className="p-4 text-center">
                  <span className="text-[var(--green)] font-bold">{row.wins}</span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-[var(--red)] font-bold">{row.losses}</span>
                </td>
                <td className="p-4 text-center">
                  <span className={`font-bold px-2 py-1 rounded ${row.rate >= 75 ? 'bg-[var(--green)]/20 text-[var(--green)]' : row.rate >= 65 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[var(--red)]/20 text-[var(--red)]'}`}>
                    {row.rate}%
                  </span>
                </td>
                <td className="p-4 text-center">
                  {row.trend === 'up' ? <TrendingUp className="text-[var(--green)] mx-auto" size={18} /> : <TrendingDown className="text-[var(--red)] mx-auto" size={18} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
