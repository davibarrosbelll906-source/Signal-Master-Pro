import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, AlertTriangle, TrendingUp, Globe2 } from "lucide-react";

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
  asset?: string;
}

type DayData = { wins: number; losses: number; ops: HistEntry[] };

// ── Simulated economic events ────────────────────────────────────────────────
interface EconEvent {
  time: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  title: string;
  previous?: string;
  forecast?: string;
  actual?: string;
}

function getTodayEvents(): EconEvent[] {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun, 1=Mon,...

  // Events rotated by day of week to simulate a live calendar
  const pools: Record<number, EconEvent[]> = {
    1: [
      { time: '09:00', currency: 'EUR', impact: 'high', title: 'PMI Manufatura (Flash)', previous: '47.3', forecast: '47.8' },
      { time: '10:00', currency: 'GBP', impact: 'medium', title: 'PMI Composto UK', previous: '52.1', forecast: '52.5' },
      { time: '15:00', currency: 'USD', impact: 'high', title: 'ISM Manufatura', previous: '49.2', forecast: '49.8' },
      { time: '17:00', currency: 'USD', impact: 'low', title: 'Discurso Fed (Williams)', previous: '-', forecast: '-' },
    ],
    2: [
      { time: '08:00', currency: 'EUR', impact: 'medium', title: 'Confiança do Consumidor Alemão', previous: '-20.4', forecast: '-20.0' },
      { time: '10:00', currency: 'USD', impact: 'medium', title: 'Índice de Preços Casas (CaseShiller)', previous: '7.2%', forecast: '7.0%' },
      { time: '15:00', currency: 'USD', impact: 'high', title: 'Confiança do Consumidor CB', previous: '92.9', forecast: '93.5' },
      { time: '21:00', currency: 'USD', impact: 'medium', title: 'Estoques API Petróleo', previous: '-1.7M', forecast: '-0.8M' },
    ],
    3: [
      { time: '12:30', currency: 'USD', impact: 'high', title: 'ADP Emprego Privado', previous: '143K', forecast: '148K' },
      { time: '14:00', currency: 'USD', impact: 'high', title: 'PIB EUA (Final)', previous: '2.3%', forecast: '2.4%' },
      { time: '15:30', currency: 'USD', impact: 'high', title: 'Estoques EIA Petróleo', previous: '-2.1M', forecast: '-1.5M' },
      { time: '20:00', currency: 'USD', impact: 'high', title: 'Ata FOMC', previous: '-', forecast: '-' },
    ],
    4: [
      { time: '08:30', currency: 'EUR', impact: 'medium', title: 'PMI Serviços Alemanha', previous: '50.6', forecast: '51.0' },
      { time: '12:30', currency: 'USD', impact: 'high', title: 'Pedidos Seguro-Desemprego', previous: '212K', forecast: '215K' },
      { time: '12:30', currency: 'USD', impact: 'high', title: 'PCE (Inflação Core)', previous: '2.7%', forecast: '2.6%' },
      { time: '15:00', currency: 'USD', impact: 'medium', title: 'ISM Serviços', previous: '53.5', forecast: '54.0' },
    ],
    5: [
      { time: '12:30', currency: 'USD', impact: 'high', title: 'NFP (Payroll)', previous: '151K', forecast: '140K' },
      { time: '12:30', currency: 'USD', impact: 'high', title: 'Taxa de Desemprego', previous: '4.1%', forecast: '4.1%' },
      { time: '12:30', currency: 'CAD', impact: 'high', title: 'Emprego Canadense', previous: '+1.1K', forecast: '+20K' },
      { time: '15:00', currency: 'USD', impact: 'medium', title: 'Confiança Consumidor U.Mich', previous: '57.0', forecast: '54.5' },
    ],
  };

  return pools[dow] || [];
}

function getUpcomingEvents(): { date: string; events: EconEvent[] }[] {
  const today = new Date();
  const result: { date: string; events: EconEvent[] }[] = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const pool = getTodayEvents();
    if (pool.length === 0) continue;
    result.push({
      date: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      events: pool.slice(0, 2)
    });
  }
  return result;
}

const IMPACT_COLOR: Record<string, string> = {
  high: 'text-[var(--red)] bg-[var(--red)]/10 border-[var(--red)]/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-[var(--blue)] bg-[var(--blue)]/10 border-[var(--blue)]/20',
};

const CURRENCY_FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CAD: '🇨🇦', AUD: '🇦🇺', CHF: '🇨🇭', NZD: '🇳🇿'
};

export default function CalendarPage() {
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [tab, setTab] = useState<'trading' | 'economic'>('trading');
  const todayEvents = getTodayEvents();
  const upcomingEvents = getUpcomingEvents();

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const todayStr = today.toDateString();

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

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  const selectedData = selectedDay ? dayMap[selectedDay] : null;
  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const totalWins = Object.values(dayMap).reduce((a, d) => a + d.wins, 0);
  const totalLosses = Object.values(dayMap).reduce((a, d) => a + d.losses, 0);
  const greenDays = Object.values(dayMap).filter(d => d.wins > d.losses).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Calendário</h1>
          <p className="text-sm text-gray-500 mt-0.5">Histórico de operações e eventos econômicos</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl gap-1 border border-white/10">
          {(['trading', 'economic'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === t ? 'bg-[var(--green)] text-black' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'trading' ? '📊 Operações' : '📰 Econômico'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'trading' ? (
          <motion.div key="trading" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
            {/* Month stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Dias Operados', val: Object.keys(dayMap).length, color: 'text-white' },
                { label: 'Dias Verdes', val: greenDays, color: 'text-[var(--green)]' },
                { label: 'Wins no Mês', val: totalWins, color: 'text-[var(--green)]' },
                { label: 'Losses no Mês', val: totalLosses, color: 'text-[var(--red)]' },
              ].map(s => (
                <div key={s.label} className="glass-card p-3 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition"><ChevronLeft size={16} /></button>
                <h3 className="text-sm font-bold text-white capitalize">{monthName}</h3>
                <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition"><ChevronRight size={16} /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                  <div key={d} className="text-[10px] text-gray-600 text-center font-bold py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const d = dayMap[day.toString()];
                  const isToday = new Date(year, month, day).toDateString() === todayStr;
                  const isSelected = selectedDay === day.toString();
                  const isGreen = d && d.wins > d.losses;
                  const isRed = d && d.losses > d.wins;
                  const isTie = d && d.wins === d.losses && d.wins > 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(isSelected ? null : day.toString())}
                      className={`rounded-lg py-1.5 text-xs font-bold transition-all relative ${
                        isSelected ? 'ring-1 ring-white/40' :
                        isToday ? 'ring-1 ring-[var(--green)]/50' : ''
                      } ${
                        isGreen ? 'bg-[var(--green)]/15 text-[var(--green)]' :
                        isRed ? 'bg-[var(--red)]/15 text-[var(--red)]' :
                        isTie ? 'bg-yellow-400/15 text-yellow-400' :
                        isToday ? 'bg-white/8 text-white' :
                        'bg-white/3 text-gray-600 hover:bg-white/6'
                      }`}
                    >
                      {day}
                      {d && (
                        <div className="text-[7px] leading-none mt-0.5 opacity-80">
                          {d.wins}W/{d.losses}L
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day detail */}
            <AnimatePresence>
              {selectedDay && selectedData && (
                <motion.div key={selectedDay} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="glass-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">Dia {selectedDay} — {selectedData.wins}W / {selectedData.losses}L</h3>
                    <button onClick={() => setSelectedDay(null)} className="text-gray-500 hover:text-white"><ChevronRight size={16} /></button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedData.ops.map((op, i) => (
                      <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${op.result === 'win' ? 'bg-[var(--green)]/8 text-[var(--green)]' : 'bg-[var(--red)]/8 text-[var(--red)]'}`}>
                        <span className="font-bold">{op.result === 'win' ? '✅ WIN' : '❌ LOSS'}</span>
                        <span className="text-gray-400">{op.asset || '—'}</span>
                        <span className="tabular-nums text-gray-500">{new Date(op.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="economic" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">

            {/* Today's events */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Globe2 size={16} className="text-[var(--blue)]" />
                <h3 className="font-bold text-white">Eventos de Hoje</h3>
                <span className="text-[10px] text-gray-500 ml-auto">{today.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
              </div>

              {todayEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-sm">Nenhum evento hoje (fim de semana)</div>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map((ev, i) => {
                    const now = new Date();
                    const [h, m] = ev.time.split(':').map(Number);
                    const evTime = new Date(); evTime.setHours(h, m, 0);
                    const isPast = evTime < now;
                    const isSoon = !isPast && evTime.getTime() - now.getTime() < 30 * 60 * 1000;

                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isSoon ? 'border-yellow-400/30 bg-yellow-400/5 animate-pulse' :
                          isPast ? 'border-white/5 bg-white/3 opacity-60' :
                          'border-white/8 bg-white/3'
                        }`}
                      >
                        <div className="text-center shrink-0 w-14">
                          <div className="text-xs font-mono font-bold text-white">{ev.time}</div>
                          {isSoon && <div className="text-[9px] text-yellow-400 font-bold">EM BREVE</div>}
                          {isPast && <div className="text-[9px] text-gray-600">PASSOU</div>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm">{CURRENCY_FLAG[ev.currency] || '🌐'}</span>
                            <span className="text-xs font-black text-white truncate">{ev.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500">
                            {ev.previous && <span>Ant: <span className="text-white">{ev.previous}</span></span>}
                            {ev.forecast && <span>Prev: <span className="text-white">{ev.forecast}</span></span>}
                            {ev.actual && <span>Real: <span className={parseFloat(ev.actual) > parseFloat(ev.forecast || '0') ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{ev.actual}</span></span>}
                          </div>
                        </div>

                        <span className={`text-[9px] font-black px-2 py-1 rounded-full border shrink-0 ${IMPACT_COLOR[ev.impact]}`}>
                          {ev.impact === 'high' ? '🔴 ALTO' : ev.impact === 'medium' ? '🟡 MED' : '🔵 BAIXO'}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
              <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-400">
                <span className="text-yellow-400 font-bold">Atenção nos eventos de alto impacto:</span> O motor de sinais bloqueia automaticamente entradas nos 5 minutos antes e após eventos de alto impacto para proteger sua banca.
              </div>
            </div>

            {/* Upcoming events */}
            {upcomingEvents.length > 0 && (
              <div className="glass-card p-5 space-y-3">
                <h3 className="font-bold text-white text-sm">Próximos Eventos</h3>
                <div className="space-y-2">
                  {upcomingEvents.map((day, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="text-[10px] font-bold text-gray-500 w-20 shrink-0">{day.date}</div>
                      <div className="flex-1 space-y-1">
                        {day.events.map((ev, j) => (
                          <div key={j} className="flex items-center gap-2 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${ev.impact === 'high' ? 'bg-[var(--red)]' : ev.impact === 'medium' ? 'bg-yellow-400' : 'bg-[var(--blue)]'}`} />
                            <span className="text-gray-400">{CURRENCY_FLAG[ev.currency] || ''} {ev.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
