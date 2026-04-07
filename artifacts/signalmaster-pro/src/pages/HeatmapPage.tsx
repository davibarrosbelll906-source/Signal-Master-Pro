import { useState, useEffect } from "react";
import { Info, Grid } from "lucide-react";

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
  category?: string;
}

type CellData = { wins: number; total: number };

const DAYS_BR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getCellColor(data: CellData | undefined): string {
  if (!data || data.total === 0) return 'bg-white/5';
  const wr = data.wins / data.total;
  if (wr >= 0.80) return 'bg-[var(--green)]';
  if (wr >= 0.70) return 'bg-[var(--green)]/60';
  if (wr >= 0.60) return 'bg-yellow-400/60';
  if (wr >= 0.50) return 'bg-orange-400/60';
  return 'bg-[var(--red)]/60';
}

function buildHeatmapGrid(hist: HistEntry[]): Record<string, CellData> {
  const map: Record<string, CellData> = {};
  hist.forEach(h => {
    const d = new Date(h.ts);
    const key = `${d.getDay()}-${d.getHours()}`;
    if (!map[key]) map[key] = { wins: 0, total: 0 };
    map[key].total++;
    if (h.result === 'win') map[key].wins++;
  });
  return map;
}

export default function HeatmapPage() {
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [category, setCategory] = useState<'all' | 'forex' | 'crypto' | 'commodity'>('all');
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [showHours, setShowHours] = useState<'business' | 'all'>('business');

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
  }, []);

  const filtered = hist.filter(h => category === 'all' || h.category === category);
  const grid = buildHeatmapGrid(filtered);

  const hours = showHours === 'business'
    ? Array.from({ length: 16 }, (_, i) => i + 7) // 7h-22h
    : Array.from({ length: 24 }, (_, i) => i);

  const total = filtered.length;
  const wins = filtered.filter(h => h.result === 'win').length;

  // Find best hour
  let bestHour = { hour: -1, day: -1, wr: 0 };
  Object.entries(grid).forEach(([key, d]) => {
    if (d.total >= 3) {
      const wr = d.wins / d.total;
      if (wr > bestHour.wr) {
        const [day, hour] = key.split('-').map(Number);
        bestHour = { hour, day, wr };
      }
    }
  });

  // Find worst hour
  let worstHour = { hour: -1, day: -1, wr: 1 };
  Object.entries(grid).forEach(([key, d]) => {
    if (d.total >= 3) {
      const wr = d.wins / d.total;
      if (wr < worstHour.wr) {
        const [day, hour] = key.split('-').map(Number);
        worstHour = { hour, day, wr };
      }
    }
  });

  const hovered = hoveredCell ? grid[`${hoveredCell.day}-${hoveredCell.hour}`] : null;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Grid className="text-purple-400" /> Heatmap de Assertividade
        </h1>
        <div className="flex flex-wrap gap-2">
          {(['all', 'forex', 'crypto', 'commodity'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition ${category === c ? 'bg-purple-400/10 text-purple-400 border-purple-400/30' : 'text-gray-500 border-transparent hover:text-white hover:bg-white/5'}`}
            >
              {c === 'all' ? 'Todos' : c}
            </button>
          ))}
          <button
            onClick={() => setShowHours(h => h === 'business' ? 'all' : 'business')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold border text-gray-500 border-transparent hover:text-white hover:bg-white/5 transition"
          >
            {showHours === 'business' ? '7h-22h ↕' : '24h ↕'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Ops mapeadas</div>
          <div className="text-xl font-black text-white">{total}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">WR geral</div>
          <div className={`text-xl font-black ${total > 0 && wins / total >= 0.65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>
            {total > 0 ? Math.round((wins / total) * 100) : 0}%
          </div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Melhor horário</div>
          <div className="text-xl font-black text-[var(--green)]">
            {bestHour.hour >= 0 ? `${DAYS_BR[bestHour.day]} ${bestHour.hour}h` : '—'}
          </div>
          {bestHour.wr > 0 && <div className="text-[10px] text-gray-600">{Math.round(bestHour.wr * 100)}% WR</div>}
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Pior horário</div>
          <div className="text-xl font-black text-[var(--red)]">
            {worstHour.hour >= 0 ? `${DAYS_BR[worstHour.day]} ${worstHour.hour}h` : '—'}
          </div>
          {worstHour.wr < 1 && <div className="text-[10px] text-gray-600">{Math.round(worstHour.wr * 100)}% WR</div>}
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-card p-5 overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Header row: days */}
          <div className="flex mb-2">
            <div className="w-12 shrink-0" />
            {DAYS_BR.map(d => (
              <div key={d} className="flex-1 text-center text-xs font-bold text-gray-500">{d}</div>
            ))}
          </div>

          {/* Grid */}
          {hours.map(hour => (
            <div key={hour} className="flex mb-1 items-center">
              <div className="w-12 text-[10px] text-gray-600 shrink-0 text-right pr-2">
                {hour.toString().padStart(2, '0')}h
              </div>
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const key = `${day}-${hour}`;
                const cell = grid[key];
                const wr = cell ? Math.round((cell.wins / cell.total) * 100) : 0;
                const isHov = hoveredCell?.day === day && hoveredCell?.hour === hour;
                return (
                  <div key={day} className="flex-1 p-0.5">
                    <div
                      className={`w-full h-7 rounded transition cursor-help ${getCellColor(cell)} ${isHov ? 'ring-2 ring-white/60 scale-105' : ''} relative`}
                      onMouseEnter={() => setHoveredCell({ day, hour })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {cell && cell.total >= 3 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-black/70">
                          {wr}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Hover tooltip */}
        {hoveredCell && hovered && (
          <div className="mt-3 text-xs text-center text-gray-400">
            <strong className="text-white">{DAYS_BR[hoveredCell.day]} {hoveredCell.hour}h</strong>
            {' — '}
            {hovered.wins}W / {hovered.total - hovered.wins}L
            {' — '}
            <strong className={hovered.wins / hovered.total >= 0.65 ? 'text-[var(--green)]' : 'text-[var(--red)]'}>
              {Math.round((hovered.wins / hovered.total) * 100)}% WR
            </strong>
          </div>
        )}
        {hoveredCell && !hovered && (
          <div className="mt-3 text-xs text-center text-gray-600">
            {DAYS_BR[hoveredCell.day]} {hoveredCell.hour}h — sem operações registradas
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span>Legenda:</span>
        {[
          { color: 'bg-[var(--green)]', label: '≥80% WR' },
          { color: 'bg-[var(--green)]/60', label: '70-80%' },
          { color: 'bg-yellow-400/60', label: '60-70%' },
          { color: 'bg-orange-400/60', label: '50-60%' },
          { color: 'bg-[var(--red)]/60', label: '<50%' },
          { color: 'bg-white/5', label: 'Sem dados' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded ${color}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {total === 0 && (
        <div className="flex items-start gap-3 p-4 bg-[var(--blue)]/10 border border-[var(--blue)]/20 rounded-lg text-sm">
          <Info className="shrink-0 mt-0.5 text-[var(--blue)]" size={16} />
          <p className="text-gray-400">Registre WIN/LOSS na página de Sinais para construir o heatmap real de performance por hora e dia da semana.</p>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-[var(--green)]/5 border border-[var(--green)]/15 rounded-lg text-sm">
        <Info className="shrink-0 mt-0.5 text-[var(--green)]" size={16} />
        <p className="text-gray-400">Células com menor WR são automaticamente priorizadas negativamente pelo filtro temporal do motor de sinais. O sistema protege seu capital evitando horários historicamente ruins para o seu perfil.</p>
      </div>
    </div>
  );
}
