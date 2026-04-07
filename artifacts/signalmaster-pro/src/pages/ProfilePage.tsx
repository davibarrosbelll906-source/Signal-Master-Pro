import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { User, Mail, Shield, Trophy, TrendingUp, Target, Edit2, Save, Camera } from "lucide-react";

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
  asset?: string;
  category?: string;
  quality?: string;
}

const AVATAR_COLORS = [
  'from-[var(--green)] to-[var(--blue)]',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-red-500',
  'from-cyan-500 to-blue-500',
  'from-yellow-500 to-orange-500',
];

export default function ProfilePage() {
  const currentUser = useAppStore(s => s.currentUser);
  const setCurrentUser = useAppStore(s => s.setCurrentUser);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '' });
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [avatarColor, setAvatarColor] = useState(0);

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
    try { setAvatarColor(parseInt(localStorage.getItem('smpAvatarColor') || '0')); } catch {}
  }, []);

  const saveProfile = () => {
    if (!currentUser) return;
    const updated = { ...currentUser, name: form.name, email: form.email };
    setCurrentUser(updated);
    try {
      const users = JSON.parse(localStorage.getItem('smpU7') || '[]');
      const idx = users.findIndex((u: any) => u.user === currentUser.user);
      if (idx >= 0) { users[idx] = updated; localStorage.setItem('smpU7', JSON.stringify(users)); }
    } catch {}
    setEditing(false);
  };

  const saveAvatarColor = (i: number) => {
    setAvatarColor(i);
    localStorage.setItem('smpAvatarColor', String(i));
  };

  // Stats from history
  const wins = hist.filter(h => h.result === 'win').length;
  const losses = hist.filter(h => h.result === 'loss').length;
  const total = wins + losses;
  const wr = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Max streak
  let streak = 0, maxStreak = 0;
  hist.sort((a, b) => a.ts - b.ts).forEach(h => {
    if (h.result === 'win') { maxStreak = Math.max(maxStreak, ++streak); } else streak = 0;
  });

  // Fav asset
  const assetCount: Record<string, number> = {};
  hist.forEach(h => { if (h.asset) assetCount[h.asset] = (assetCount[h.asset] || 0) + 1; });
  const favAsset = Object.entries(assetCount).sort(([, a], [, b]) => b - a)[0]?.[0] || '—';

  // Fav category
  const catCount: Record<string, number> = {};
  hist.forEach(h => { if (h.category) catCount[h.category] = (catCount[h.category] || 0) + 1; });
  const favCat = Object.entries(catCount).sort(([, a], [, b]) => b - a)[0]?.[0] || '—';

  // Member since (estimated from first signal)
  const firstTs = hist.length > 0 ? Math.min(...hist.map(h => h.ts)) : Date.now();
  const memberSince = new Date(firstTs).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const planInfo: Record<string, { label: string; color: string; features: string[] }> = {
    premium: {
      label: 'PREMIUM 💎',
      color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
      features: ['Todos os ativos', 'Motor completo', 'ML adaptativo', 'Suporte VIP', 'Backtesting avançado'],
    },
    pro: {
      label: 'PRO 🔥',
      color: 'text-[var(--blue)] border-[var(--blue)]/30 bg-[var(--blue)]/10',
      features: ['Crypto + Forex + Commodities', 'Motor completo', 'ML adaptativo', 'Suporte prioritário'],
    },
    basico: {
      label: 'BÁSICO',
      color: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
      features: ['Apenas Forex (top 4)', 'Motor padrão', 'Suporte básico'],
    },
  };

  const plan = planInfo[currentUser?.plan || 'basico'];
  const initial = (currentUser?.name || currentUser?.user || 'U')[0].toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>

      {/* Profile Header */}
      <div className="glass-card p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl bg-[var(--green)]/5 pointer-events-none" />

        <div className="relative group">
          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[avatarColor]} flex items-center justify-center text-4xl font-black text-white shadow-lg select-none`}>
            {initial}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition cursor-pointer" onClick={() => saveAvatarColor((avatarColor + 1) % AVATAR_COLORS.length)}>
            <Camera size={18} className="text-white" />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          {editing ? (
            <div className="space-y-2">
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Seu nome completo"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--green)]/50"
              />
              <input
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="seu@email.com"
                type="email"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--green)]/50"
              />
              <div className="flex gap-2 justify-center md:justify-start">
                <button onClick={saveProfile} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--green)] text-black font-bold rounded-lg text-xs"><Save size={12} /> Salvar</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-white/5 text-gray-400 rounded-lg text-xs hover:bg-white/10">Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white">{currentUser?.name || currentUser?.user}</h2>
              <p className="text-gray-400 flex items-center gap-1.5 justify-center md:justify-start mt-1">
                <Mail size={13} /> {currentUser?.email || `${currentUser?.user}@signalmaster.pro`}
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${plan.color}`}>{plan.label}</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold border border-white/10 text-gray-400 capitalize flex items-center gap-1"><Shield size={10} />{currentUser?.role}</span>
                {total > 0 && <span className="px-3 py-1 rounded-full text-xs font-bold border border-[var(--green)]/20 text-[var(--green)]">Membro desde {memberSince}</span>}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition shrink-0">
            <Edit2 size={13} /> Editar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Stats */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-[var(--green)]" /> Estatísticas
          </h3>
          <ul className="space-y-3">
            {[
              { label: 'Total de Sinais', value: total, color: 'text-white' },
              { label: 'Win Rate Geral', value: total > 0 ? `${wr}%` : '—', color: wr >= 65 ? 'text-[var(--green)]' : wr >= 50 ? 'text-yellow-400' : 'text-[var(--red)]' },
              { label: 'Total de WINs', value: wins, color: 'text-[var(--green)]' },
              { label: 'Total de LOSSes', value: losses, color: 'text-[var(--red)]' },
              { label: 'Melhor Sequência', value: maxStreak > 0 ? `${maxStreak} WINs` : '—', color: 'text-[var(--gold)]' },
              { label: 'Ativo Favorito', value: favAsset, color: 'text-[var(--blue)]' },
              { label: 'Categoria Favorita', value: favCat, color: 'text-purple-400' },
            ].map(({ label, value, color }) => (
              <li key={label} className="flex justify-between items-center text-sm">
                <span className="text-gray-400">{label}</span>
                <span className={`font-bold ${color}`}>{value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Plan Info */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy size={14} className="text-[var(--gold)]" /> Plano Atual
            </h3>
            <div className={`px-4 py-2 rounded-lg border text-center font-bold mb-4 ${plan.color}`}>
              {plan.label}
            </div>
            <ul className="space-y-2">
              {plan.features.map(f => (
                <li key={f} className="text-sm text-gray-300 flex items-center gap-2">
                  <span className="text-[var(--green)] text-xs">✓</span> {f}
                </li>
              ))}
            </ul>
            {currentUser?.plan !== 'premium' && (
              <button className="w-full mt-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-lg text-sm hover:opacity-90 transition">
                Fazer Upgrade 💎
              </button>
            )}
          </div>

          {/* Avatar Picker */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Cor do Avatar</h3>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => saveAvatarColor(i)}
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} transition border-2 ${avatarColor === i ? 'border-white scale-110' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
