import { useState, useEffect } from "react";
import { Target, Plus, X, Check, TrendingUp, Calendar, Zap } from "lucide-react";

interface Goal {
  id: number;
  title: string;
  type: 'winRate' | 'ops' | 'streak' | 'wins' | 'custom';
  target: number;
  period: 'daily' | 'weekly' | 'monthly' | 'total';
  emoji: string;
  createdAt: number;
}

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
}

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Hoje',
  weekly: '7 dias',
  monthly: '30 dias',
  total: 'Total',
};

const GOAL_TYPES = [
  { value: 'winRate', label: 'Win Rate (%)', emoji: '🎯' },
  { value: 'ops', label: 'Operações', emoji: '📊' },
  { value: 'streak', label: 'Sequência de WINs', emoji: '🔥' },
  { value: 'wins', label: 'Total de WINs', emoji: '✅' },
  { value: 'custom', label: 'Meta personalizada', emoji: '⭐' },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'winRate', target: 70, period: 'daily', emoji: '🎯' });

  useEffect(() => {
    try { setGoals(JSON.parse(localStorage.getItem('smpGoals7') || '[]')); } catch {}
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
  }, []);

  const saveGoals = (updated: Goal[]) => {
    setGoals(updated);
    localStorage.setItem('smpGoals7', JSON.stringify(updated));
  };

  const getProgress = (goal: Goal): { current: number; pct: number } => {
    const now = Date.now();
    const cutoffs = { daily: 86400000, weekly: 7 * 86400000, monthly: 30 * 86400000, total: Infinity };
    const cutoff = now - cutoffs[goal.period];
    const relevant = hist.filter(h => h.ts > cutoff);
    const wins = relevant.filter(h => h.result === 'win').length;
    const losses = relevant.filter(h => h.result === 'loss').length;
    const total = wins + losses;

    let current = 0;
    if (goal.type === 'winRate') current = total > 0 ? Math.round((wins / total) * 100) : 0;
    else if (goal.type === 'ops') current = total;
    else if (goal.type === 'wins') current = wins;
    else if (goal.type === 'streak') {
      let streak = 0, max = 0;
      hist.filter(h => h.ts > cutoff).sort((a, b) => a.ts - b.ts).forEach(h => {
        if (h.result === 'win') { max = Math.max(max, ++streak); } else streak = 0;
      });
      current = max;
    }

    return { current, pct: Math.min(100, (current / goal.target) * 100) };
  };

  const addGoal = () => {
    if (!form.title.trim()) return;
    const g: Goal = {
      id: Date.now(), title: form.title, type: form.type as any,
      target: form.target, period: form.period as any, emoji: form.emoji, createdAt: Date.now()
    };
    saveGoals([...goals, g]);
    setForm({ title: '', type: 'winRate', target: 70, period: 'daily', emoji: '🎯' });
    setShowForm(false);
  };

  // Quick goal presets
  const addPreset = (title: string, type: string, target: number, period: string, emoji: string) => {
    const g: Goal = {
      id: Date.now(), title, type: type as any, target, period: period as any, emoji, createdAt: Date.now()
    };
    saveGoals([...goals, g]);
  };

  const presets = [
    { title: '70% WR hoje', type: 'winRate', target: 70, period: 'daily', emoji: '🎯' },
    { title: '5 WINs esta semana', type: 'wins', target: 5, period: 'weekly', emoji: '✅' },
    { title: '20 operações no mês', type: 'ops', target: 20, period: 'monthly', emoji: '📊' },
    { title: 'Sequência de 3 WINs', type: 'streak', target: 3, period: 'total', emoji: '🔥' },
  ];

  // Overall progress from stats
  const totalOps = hist.length;
  const totalWins = hist.filter(h => h.result === 'win').length;
  const globalWR = totalOps > 0 ? Math.round((totalWins / totalOps) * 100) : 0;
  const todayHist = hist.filter(h => new Date(h.ts).toDateString() === new Date().toDateString());
  const todayW = todayHist.filter(h => h.result === 'win').length;
  const todayL = todayHist.filter(h => h.result === 'loss').length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Target className="text-[var(--green)]" /> Metas & Objetivos
        </h1>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg hover:opacity-90 transition text-sm"
        >
          {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nova Meta</>}
        </button>
      </div>

      {/* Today's snapshot */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Hoje</div>
          <div className="text-xl font-bold"><span className="text-[var(--green)]">{todayW}W</span><span className="text-gray-600 mx-1">/</span><span className="text-[var(--red)]">{todayL}L</span></div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">WR Global</div>
          <div className={`text-xl font-bold ${globalWR >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{globalWR}%</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Ops</div>
          <div className="text-xl font-bold text-white">{totalOps}</div>
        </div>
      </div>

      {/* Add Goal Form */}
      {showForm && (
        <div className="glass-card p-6 border border-[var(--green)]/20">
          <h3 className="text-sm font-bold text-white mb-4">Nova Meta</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1.5">Nome da meta *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Atingir 75% WR esta semana"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--green)]/50"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Tipo</label>
              <select
                value={form.type}
                onChange={e => {
                  const t = GOAL_TYPES.find(x => x.value === e.target.value);
                  setForm(p => ({ ...p, type: e.target.value, emoji: t?.emoji || '⭐' }));
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Período</label>
              <select
                value={form.period}
                onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="total">Total</option>
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Meta</span>
                <span className="text-[var(--green)] font-bold">{form.target}{form.type === 'winRate' ? '%' : ''}</span>
              </div>
              <input
                type="range"
                min={form.type === 'winRate' ? 50 : 1}
                max={form.type === 'winRate' ? 95 : form.type === 'ops' ? 100 : form.type === 'streak' ? 20 : 50}
                value={form.target}
                onChange={e => setForm(p => ({ ...p, target: parseInt(e.target.value) }))}
                className="w-full accent-[var(--green)]"
              />
            </div>
          </div>
          <button
            onClick={addGoal}
            disabled={!form.title.trim()}
            className="px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg text-sm hover:opacity-90 transition disabled:opacity-40 flex items-center gap-2"
          >
            <Check size={14} /> Criar Meta
          </button>
        </div>
      )}

      {/* Presets (only if no goals) */}
      {goals.length === 0 && !showForm && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-gray-400 mb-3">Metas rápidas sugeridas</h3>
          <div className="grid grid-cols-2 gap-3">
            {presets.map(p => (
              <button
                key={p.title}
                onClick={() => addPreset(p.title, p.type, p.target, p.period, p.emoji)}
                className="p-4 bg-white/5 border border-white/10 hover:border-[var(--green)]/30 rounded-xl text-left transition group"
              >
                <div className="text-2xl mb-2">{p.emoji}</div>
                <div className="text-sm font-medium text-white group-hover:text-[var(--green)] transition">{p.title}</div>
                <div className="text-xs text-gray-600 mt-1">{PERIOD_LABELS[p.period]}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goals List */}
      {goals.length > 0 && (
        <div className="space-y-3">
          {goals.map(goal => {
            const { current, pct } = getProgress(goal);
            const done = pct >= 100;
            return (
              <div
                key={goal.id}
                className={`glass-card p-5 border ${done ? 'border-[var(--green)]/30 bg-[var(--green)]/3' : 'border-white/5'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.emoji}</span>
                    <div>
                      <div className="font-bold text-white text-sm">{goal.title}</div>
                      <div className="text-xs text-gray-500">{PERIOD_LABELS[goal.period]} · {GOAL_TYPES.find(t => t.value === goal.type)?.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {done && <span className="text-[var(--green)] text-xs font-bold flex items-center gap-1"><Check size={12} /> Concluída!</span>}
                    <button
                      onClick={() => saveGoals(goals.filter(g => g.id !== goal.id))}
                      className="p-1 text-gray-600 hover:text-[var(--red)] transition"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">Progresso</span>
                  <span className={`font-bold ${done ? 'text-[var(--green)]' : 'text-white'}`}>
                    {current}{goal.type === 'winRate' ? '%' : ''} / {goal.target}{goal.type === 'winRate' ? '%' : ''}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: done ? 'var(--green)' : pct >= 75 ? 'var(--blue)' : pct >= 50 ? '#ffd700' : 'var(--red)'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {goals.length === 0 && showForm === false && (
        <div className="glass-card p-12 text-center">
          <Target size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Sem metas definidas</p>
          <p className="text-gray-600 text-sm mt-1">Clique em "Nova Meta" ou escolha uma das sugestões acima.</p>
        </div>
      )}
    </div>
  );
}
