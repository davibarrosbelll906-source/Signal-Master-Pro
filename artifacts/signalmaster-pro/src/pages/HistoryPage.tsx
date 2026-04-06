import { useState } from "react";
import { Calendar, Filter, Download } from "lucide-react";

export default function HistoryPage() {
  const [data] = useState([
    { id: 1, time: "10:48", asset: "EURUSD", dir: "CALL", score: "82%", res: "WIN", category: "forex" },
    { id: 2, time: "10:45", asset: "BTCUSD", dir: "PUT", score: "76%", res: "WIN", category: "crypto" },
    { id: 3, time: "10:32", asset: "GBPUSD", dir: "CALL", score: "68%", res: "LOSS", category: "forex" },
    { id: 4, time: "10:15", asset: "EURJPY", dir: "PUT", score: "88%", res: "WIN", category: "forex" },
    { id: 5, time: "09:50", asset: "XAUUSD", dir: "CALL", score: "72%", res: "WIN", category: "commodity" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Histórico de Sinais</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-sm text-gray-300">
            <Filter size={14} /> Filtros
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-sm text-gray-300">
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                <th className="p-4 font-medium">Horário</th>
                <th className="p-4 font-medium">Ativo</th>
                <th className="p-4 font-medium">Direção</th>
                <th className="p-4 font-medium">Score</th>
                <th className="p-4 font-medium text-right">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition">
                  <td className="p-4 text-gray-300 flex items-center gap-2">
                    <Calendar size={14} className="text-gray-500" /> {row.time}
                  </td>
                  <td className="p-4 font-bold text-white">{row.asset}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${row.dir === 'CALL' ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-[var(--red)]/10 text-[var(--red)]'}`}>
                      {row.dir}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 font-mono">{row.score}</td>
                  <td className="p-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${row.res === 'WIN' ? 'bg-[var(--green)] text-black' : 'bg-white/10 text-gray-400'}`}>
                      {row.res}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
