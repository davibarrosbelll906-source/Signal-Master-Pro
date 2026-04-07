import { useState, useEffect } from "react";
import { BookOpen, Plus, Save, Trash2, X, Smile, Meh, Frown, AlertCircle } from "lucide-react";

interface DiaryEntry {
  id: number;
  date: string;
  ts: number;
  mood: string;
  moodIcon: string;
  notes: string;
  lessons: string;
  errors: string;
  pnl: number;
  ops: number;
}

const MOODS = [
  { value: 'Focado', icon: '🎯', color: 'text-[var(--green)]' },
  { value: 'Confiante', icon: '💪', color: 'text-[var(--blue)]' },
  { value: 'Calmo', icon: '😌', color: 'text-teal-400' },
  { value: 'Ansioso', icon: '😰', color: 'text-yellow-400' },
  { value: 'Frustrado', icon: '😤', color: 'text-orange-400' },
  { value: 'Impulsivo', icon: '⚡', color: 'text-[var(--red)]' },
  { value: 'Exausto', icon: '😴', color: 'text-gray-400' },
];

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ mood: 'Focado', moodIcon: '🎯', notes: '', lessons: '', errors: '' });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    try { setEntries(JSON.parse(localStorage.getItem('smpDiary7') || '[]').sort((a: DiaryEntry, b: DiaryEntry) => b.ts - a.ts)); } catch {}
  }, []);

  const saveEntries = (updated: DiaryEntry[]) => {
    setEntries(updated.sort((a, b) => b.ts - a.ts));
    localStorage.setItem('smpDiary7', JSON.stringify(updated));
  };

  const todayHist = (() => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const today = new Date().toDateString();
      return hist.filter((h: any) => new Date(h.ts).toDateString() === today);
    } catch { return []; }
  })();

  const submit = () => {
    if (!form.notes.trim()) return;
    const wins = todayHist.filter((h: any) => h.result === 'win').length;
    const losses = todayHist.filter((h: any) => h.result === 'loss').length;
    const entry: DiaryEntry = {
      id: Date.now(),
      ts: Date.now(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      mood: form.mood,
      moodIcon: form.moodIcon,
      notes: form.notes,
      lessons: form.lessons,
      errors: form.errors,
      pnl: wins - losses,
      ops: wins + losses,
    };
    saveEntries([...entries.filter(e => new Date(e.ts).toDateString() !== new Date().toDateString()), entry]);
    setForm({ mood: 'Focado', moodIcon: '🎯', notes: '', lessons: '', errors: '' });
    setShowForm(false);
  };

  const deleteEntry = (id: number) => {
    if (!confirm('Deletar esta entrada do diário?')) return;
    saveEntries(entries.filter(e => e.id !== id));
  };

  const wins = todayHist.filter((h: any) => h.result === 'win').length;
  const losses = todayHist.filter((h: any) => h.result === 'loss').length;
  const todayWR = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BookOpen className="text-[var(--blue)]" /> Diário de Trading
        </h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg hover:opacity-90 transition text-sm"
        >
          {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> Nova Entrada</>}
        </button>
      </div>

      {/* Today's summary */}
      {(wins + losses > 0) && (
        <div className="glass-card p-4 flex items-center gap-6 border-l-4 border-l-[var(--blue)]">
          <div>
            <div className="text-xs text-gray-500 mb-0.5">Sessão de Hoje</div>
            <div className="text-sm font-bold text-white">{wins}W / {losses}L — {todayWR}% WR</div>
          </div>
          <div className="text-gray-600">|</div>
          <div className="text-xs text-gray-500">
            {wins > losses ? '✅ Dia positivo' : wins === losses ? '⚖️ Empate' : '❌ Dia negativo'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Entries List */}
        <div className="lg:col-span-2 space-y-4">

          {showForm && (
            <div className="glass-card p-6 border border-[var(--green)]/20">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Plus size={14} className="text-[var(--green)]" /> Entrada do Dia
                <span className="text-xs text-gray-600 ml-2">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
              </h3>

              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-2">Estado Emocional</label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setForm(p => ({ ...p, mood: m.value, moodIcon: m.icon }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition border ${form.mood === m.value ? 'bg-white/10 border-white/30 text-white' : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                      <span>{m.icon}</span> {m.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">📝 Notas do dia *</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Como foi a sessão? Quais as suas principais observações?"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-[var(--green)]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">💡 Lições aprendidas</label>
                  <textarea
                    value={form.lessons}
                    onChange={e => setForm(p => ({ ...p, lessons: e.target.value }))}
                    placeholder="O que você aprendeu hoje?"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-[var(--blue)]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">⚠️ Erros cometidos</label>
                  <textarea
                    value={form.errors}
                    onChange={e => setForm(p => ({ ...p, errors: e.target.value }))}
                    placeholder="Quais erros aconteceram? O que evitar?"
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none focus:border-[var(--red)]/40"
                  />
                </div>
              </div>

              <button
                onClick={submit}
                disabled={!form.notes.trim()}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg hover:opacity-90 transition text-sm disabled:opacity-40"
              >
                <Save size={14} /> Salvar no Diário
              </button>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <BookOpen size={48} className="text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma entrada no diário ainda</p>
              <p className="text-gray-600 text-sm mt-2">Clique em "Nova Entrada" para registrar sua primeira sessão.</p>
            </div>
          ) : (
            entries.map(e => (
              <div
                key={e.id}
                className={`glass-card p-5 border-l-4 cursor-pointer transition ${e.pnl > 0 ? 'border-l-[var(--green)]' : e.pnl < 0 ? 'border-l-[var(--red)]' : 'border-l-gray-600'}`}
                onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{e.moodIcon}</div>
                    <div>
                      <div className="font-bold text-white text-sm">{e.date}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{e.mood} · {e.ops} ops{todayWR !== null && e.ops > 0 ? ` · ${Math.round((e.pnl > 0 ? (e.pnl + e.ops / 2) / e.ops : (e.ops / 2 + e.pnl) / e.ops) * 100)}% WR` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`font-bold text-sm ${e.pnl > 0 ? 'text-[var(--green)]' : e.pnl < 0 ? 'text-[var(--red)]' : 'text-gray-500'}`}>
                      {e.pnl > 0 ? `+${e.pnl}W` : e.pnl < 0 ? `${e.pnl}L` : '—'}
                    </div>
                    <button
                      onClick={ev => { ev.stopPropagation(); deleteEntry(e.id); }}
                      className="p-1 text-gray-600 hover:text-[var(--red)] transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {expandedId === e.id && (
                  <div className="mt-4 space-y-3 text-sm">
                    {e.notes && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">📝 Notas</div>
                        <p className="text-gray-300 bg-white/5 p-3 rounded-lg leading-relaxed">{e.notes}</p>
                      </div>
                    )}
                    {e.lessons && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">💡 Lições</div>
                        <p className="text-[var(--blue)] bg-[var(--blue)]/5 p-3 rounded-lg leading-relaxed border border-[var(--blue)]/10">{e.lessons}</p>
                      </div>
                    )}
                    {e.errors && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">⚠️ Erros</div>
                        <p className="text-yellow-400 bg-yellow-400/5 p-3 rounded-lg leading-relaxed border border-yellow-400/10">{e.errors}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Resumo do Diário</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Entradas</span><span className="font-bold text-white">{entries.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Dias positivos</span><span className="font-bold text-[var(--green)]">{entries.filter(e => e.pnl > 0).length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Dias negativos</span><span className="font-bold text-[var(--red)]">{entries.filter(e => e.pnl < 0).length}</span></div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Humor mais frequente</h3>
            {entries.length === 0 ? (
              <p className="text-xs text-gray-600">Sem dados ainda</p>
            ) : (
              (() => {
                const moodCount: Record<string, number> = {};
                entries.forEach(e => { moodCount[e.mood] = (moodCount[e.mood] || 0) + 1; });
                return Object.entries(moodCount).sort(([, a], [, b]) => b - a).slice(0, 4).map(([mood, count]) => {
                  const m = MOODS.find(x => x.value === mood);
                  return (
                    <div key={mood} className="flex items-center justify-between text-sm py-1.5">
                      <span className="flex items-center gap-2 text-gray-400"><span>{m?.icon}</span>{mood}</span>
                      <span className="text-xs text-gray-600">{count}x</span>
                    </div>
                  );
                });
              })()
            )}
          </div>

          <div className="glass-card p-5 border border-[var(--blue)]/20">
            <h3 className="text-xs font-bold text-[var(--blue)] uppercase tracking-wider mb-3">💡 Dica do Coach</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Registre seu estado emocional <strong className="text-white">antes</strong> de operar. 
              Traders que documentam suas sessões melhoram até <strong className="text-[var(--green)]">23% mais rápido</strong> em consistência.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
