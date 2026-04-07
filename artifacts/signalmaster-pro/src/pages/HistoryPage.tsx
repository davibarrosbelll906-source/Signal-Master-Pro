import { useState, useEffect } from "react";
import { Calendar, Filter, Download, X, TrendingUp, TrendingDown, Search } from "lucide-react";

interface HistoryEntry {
  id: number;
  ts: number;
  asset: string;
  direction: 'CALL' | 'PUT';
  score: number;
  quality: string;
  result: 'win' | 'loss';
  category: string;
  sess: string;
  adx?: number;
  rsi?: number;
  consensus?: number;
}

const QUALITY_COLORS: Record<string, string> = {
  PREMIUM: 'text-yellow-400 bg-yellow-400/10',
  FORTE: 'text-[var(--green)] bg-[var(--green)]/10',
  MÉDIO: 'text-blue-400 bg-blue-400/10',
  FRACO: 'text-gray-400 bg-gray-400/10',
};

export default function HistoryPage() {
  const [all, setAll] = useState<HistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterRes, setFilterRes] = useState<'all' | 'win' | 'loss'>('all');
  const [filterCat, setFilterCat] = useState<'all' | 'crypto' | 'forex' | 'commodity'>('all');
  const [filterDate, setFilterDate] = useState<'today' | '7d' | '30d' | 'all'>('today');

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('smpH7') || '[]');
      setAll(raw.sort((a: HistoryEntry, b: HistoryEntry) => b.ts - a.ts));
    } catch {
      setAll([]);
    }
  }, []);

  const filtered = all.filter(entry => {
    if (filterRes !== 'all' && entry.result !== filterRes) return false;
    if (filterCat !== 'all' && entry.category !== filterCat) return false;
    if (search && !entry.asset.toLowerCase().includes(search.toLowerCase())) return false;
    const now = Date.now();
    if (filterDate === 'today') {
      const today = new Date().toDateString();
      if (new Date(entry.ts).toDateString() !== today) return false;
    } else if (filterDate === '7d') {
      if (now - entry.ts > 7 * 86400000) return false;
    } else if (filterDate === '30d') {
      if (now - entry.ts > 30 * 86400000) return false;
    }
    return true;
  });

  const wins = filtered.filter(e => e.result === 'win').length;
  const losses = filtered.filter(e => e.result === 'loss').length;
  const total = wins + losses;
  const wr = total > 0 ? ((wins / total) * 100).toFixed(1) : '—';
  const avgScore = total > 0 ? (filtered.reduce((a, e) => a + (e.score || 0), 0) / total).toFixed(1) : '—';

  const exportCSV = () => {
    const header = 'Data,Horário,Ativo,Direção,Score,Qualidade,Resultado,Categoria,Sessão\n';
    const rows = filtered.map(e => {
      const d = new Date(e.ts);
      return `${d.toLocaleDateString('pt-BR')},${d.toLocaleTimeString('pt-BR')},${e.asset},${e.direction},${e.score}%,${e.quality || '—'},${e.result.toUpperCase()},${e.category},${e.sess}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `historico_sinais_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Histórico de Sinais</h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-sm text-gray-300 transition disabled:opacity-40"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{total}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className={`text-2xl font-bold ${parseFloat(wr) >= 65 ? 'text-[var(--green)]' : parseFloat(wr) >= 50 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{wr}{total > 0 ? '%' : ''}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">WINS / LOSSES</div>
          <div className="text-xl font-bold"><span className="text-[var(--green)]">{wins}</span><span className="text-gray-600 mx-1">/</span><span className="text-[var(--red)]">{losses}</span></div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Score Médio</div>
          <div className="text-2xl font-bold text-[var(--blue)]">{avgScore}{total > 0 ? '%' : ''}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search size={14} className="text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ativo..."
            className="bg-transparent text-sm text-white outline-none flex-1 placeholder:text-gray-600"
          />
          {search && <button onClick={() => setSearch('')}><X size={12} className="text-gray-500 hover:text-white" /></button>}
        </div>

        <div className="flex gap-1">
          {(['today', '7d', '30d', 'all'] as const).map(d => (
            <button
              key={d}
              onClick={() => setFilterDate(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterDate === d ? 'bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/30' : 'text-gray-500 hover:text-white border border-transparent'}`}
            >
              {d === 'today' ? 'Hoje' : d === '7d' ? '7 dias' : d === '30d' ? '30 dias' : 'Tudo'}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(['all', 'win', 'loss'] as const).map(r => (
            <button
              key={r}
              onClick={() => setFilterRes(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterRes === r
                  ? r === 'win' ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30'
                  : r === 'loss' ? 'bg-[var(--red)]/20 text-[var(--red)] border border-[var(--red)]/30'
                  : 'bg-white/10 text-white border border-white/20'
                  : 'text-gray-500 hover:text-white border border-transparent'
              }`}
            >
              {r === 'all' ? 'Todos' : r.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          {(['all', 'crypto', 'forex', 'commodity'] as const).map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterCat === c ? 'bg-white/15 text-white border border-white/20' : 'text-gray-500 hover:text-white border border-transparent'}`}
            >
              {c === 'all' ? 'Todos' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar size={48} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhum sinal encontrado</p>
            <p className="text-gray-600 text-sm mt-1">
              {all.length === 0
                ? 'Use a página de Sinais para registrar WIN/LOSS e eles aparecerão aqui.'
                : 'Tente ajustar os filtros para ver mais resultados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/30 border-b border-white/5 text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-bold">Data/Hora</th>
                  <th className="p-4 font-bold">Ativo</th>
                  <th className="p-4 font-bold">Direção</th>
                  <th className="p-4 font-bold">Score</th>
                  <th className="p-4 font-bold">Qualidade</th>
                  <th className="p-4 font-bold">ADX</th>
                  <th className="p-4 font-bold">Sessão</th>
                  <th className="p-4 font-bold text-right">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((row, i) => {
                  const d = new Date(row.ts);
                  return (
                    <tr key={row.id || i} className="hover:bg-white/3 transition">
                      <td className="p-4 text-xs text-gray-500 font-mono whitespace-nowrap">
                        <div>{d.toLocaleDateString('pt-BR')}</div>
                        <div className="text-gray-600">{d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{row.asset}</div>
                        <div className="text-xs text-gray-600 capitalize">{row.category}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${row.direction === 'CALL' ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-[var(--red)]/10 text-[var(--red)]'}`}>
                          {row.direction === 'CALL' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {row.direction}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--blue)] rounded-full" style={{ width: `${row.score || 0}%` }} />
                          </div>
                          <span className="text-sm font-mono text-white">{row.score}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${QUALITY_COLORS[row.quality] || 'text-gray-500 bg-white/5'}`}>
                          {row.quality || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-400 font-mono">{row.adx ?? '—'}</td>
                      <td className="p-4 text-xs text-gray-500 capitalize">{row.sess || '—'}</td>
                      <td className="p-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          row.result === 'win'
                            ? 'bg-[var(--green)] text-black'
                            : 'bg-[var(--red)]/20 text-[var(--red)] border border-[var(--red)]/30'
                        }`}>
                          {row.result === 'win' ? '✓ WIN' : '✕ LOSS'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {filtered.length > 0 && (
        <p className="text-xs text-gray-600 text-right">{filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
