import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
  asset?: string;
}

type DayData = { wins: number; losses: number; ops: HistEntry[] };

export default function CalendarPage() {
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();

  // Build day map
  const dayMap: Record<string, DayData> = {};
  hist.forEach(h => {
    const d = new Date(h.ts);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate().toString();
      if (!dayMap[key]) dayMap[key] = { wins: 0, losses: 0, ops: [] };
      dayMap[key].ops.push(h);
      if (h.result === 'win') dayMap[key].wins++; else dayMap[key].losses++;
    }
  });

  // Calendar layout
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Monthly summary
  const monthOps = Object.values(dayMap).reduce((acc, d) => acc + d.wins + d.losses, 0);
  const monthWins = Object.values(dayMap).reduce((acc, d) => acc + d.wins, 0);
  const monthLosses = Object.values(dayMap).reduce((acc, d) => acc + d.losses, 0);
  const monthWR = monthOps > 0 ? Math.round((monthWins / monthOps) * 100) : 0;
  const profitDays = Object.values(dayMap).filter(d => d.wins > d.losses).length;
  const lossDays = Object.values(dayMap).filter(d => d.losses > d.wins).length;

  const selectedData = selectedDay ? dayMap[selectedDay] : null;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <CalendarIcon className="text-[var(--green)]" size={24} />
        <h1 className="text-2xl font-bold text-white">Calendário de Resultados</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Operações</div>
          <div className="text-2xl font-black text-white">{monthOps}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Win Rate</div>
          <div className={`text-2xl font-black ${monthWR >= 65 ? 'text-[var(--green)]' : monthWR >= 50 ? 'text-yellow-400' : 'text-[var(--red)]'}`}>{monthWR}%</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Dias positivos</div>
          <div className="text-2xl font-black text-[var(--green)]">{profitDays}</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Dias negativos</div>
          <div className="text-2xl font-black text-[var(--red)]">{lossDays}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Calendar */}
        <div className="md:col-span-2 glass-card p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
            <h3 className="font-bold text-white capitalize">{monthName}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-600">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const data = dayMap[day.toString()];
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              const isFuture = new Date(year, month, day) > today;
              const isSelected = selectedDay === day.toString();
              const wr = data ? data.wins / (data.wins + data.losses) : 0;

              let bg = 'bg-white/5 border-white/5';
              if (!isFuture && data) {
                if (wr >= 0.75) bg = 'bg-[var(--green)]/15 border-[var(--green)]/25 text-[var(--green)]';
                else if (wr >= 0.5) bg = 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400';
                else bg = 'bg-[var(--red)]/10 border-[var(--red)]/20 text-[var(--red)]';
              }

              return (
                <div
                  key={day}
                  onClick={() => !isFuture && data && setSelectedDay(isSelected ? null : day.toString())}
                  className={`aspect-square rounded-xl border p-1.5 flex flex-col items-center justify-center transition
                    ${bg}
                    ${isToday ? 'ring-2 ring-white/30' : ''}
                    ${isSelected ? 'ring-2 ring-[var(--blue)]' : ''}
                    ${data && !isFuture ? 'cursor-pointer hover:scale-105' : ''}
                    ${isFuture ? 'opacity-25' : ''}
                  `}
                >
                  <span className={`text-xs font-bold ${isToday ? 'text-white' : ''}`}>{day}</span>
                  {data && !isFuture && (
                    <span className="text-[8px] font-mono mt-0.5 opacity-80">
                      {data.wins}W/{data.losses}L
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-[10px] text-gray-600">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[var(--green)]/20 border border-[var(--green)]/30" />&ge;75% WR</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400/15 border border-yellow-400/25" />50-74%</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[var(--red)]/10 border border-[var(--red)]/20" />&lt;50%</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-white/5 border border-white/5" />Sem dados</div>
          </div>
        </div>

        {/* Day Detail */}
        <div className="glass-card p-5 h-fit">
          {selectedData ? (
            <>
              <h3 className="text-sm font-bold text-white mb-3 border-b border-white/10 pb-2">
                Dia {selectedDay}/{month + 1}
              </h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">WINs</span>
                  <span className="font-bold text-[var(--green)]">{selectedData.wins}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">LOSSes</span>
                  <span className="font-bold text-[var(--red)]">{selectedData.losses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Win Rate</span>
                  <span className={`font-bold ${(selectedData.wins / (selectedData.wins + selectedData.losses)) >= 0.65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>
                    {Math.round((selectedData.wins / (selectedData.wins + selectedData.losses)) * 100)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Operações</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedData.ops.map((op, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg text-xs ${op.result === 'win' ? 'bg-[var(--green)]/10' : 'bg-[var(--red)]/10'}`}>
                      <span className="text-gray-400">{op.asset || '—'}</span>
                      <span className={`font-bold ${op.result === 'win' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                        {op.result === 'win' ? 'WIN' : 'LOSS'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CalendarIcon size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Clique em um dia</p>
              <p className="text-gray-600 text-xs mt-1">para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
