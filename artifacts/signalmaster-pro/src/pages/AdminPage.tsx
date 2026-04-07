import { useState, useEffect } from "react";
import { useAppStore, type User } from "@/lib/store";
import { Redirect } from "wouter";
import { Users, Shield, Trash2, Edit2, Plus, Save, X, BarChart2, Crown, TrendingUp } from "lucide-react";

interface UserWithStats extends User {
  wins?: number;
  losses?: number;
  wr?: number;
}

const PLAN_COLORS: Record<string, string> = {
  premium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  pro: 'text-[var(--blue)] bg-[var(--blue)]/10 border-[var(--blue)]/30',
  basico: 'text-gray-400 bg-white/5 border-white/10',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-[var(--red)] bg-[var(--red)]/10',
  gerente: 'text-orange-400 bg-orange-400/10',
  suporte: 'text-[var(--blue)] bg-[var(--blue)]/10',
  analista: 'text-purple-400 bg-purple-400/10',
  financeiro: 'text-yellow-400 bg-yellow-400/10',
  moderador: 'text-teal-400 bg-teal-400/10',
  user: 'text-gray-400 bg-white/5',
};

export default function AdminPage() {
  const currentUser = useAppStore(s => s.currentUser);
  if (currentUser?.role !== 'admin') return <Redirect to="/dashboard/signals" />;

  const [users, setUsers] = useState<User[]>([]);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'user', plan: 'basico' });
  const [histStats, setHistStats] = useState<Record<string, { wins: number; losses: number }>>({});
  const [links, setLinks] = useState({ pro: '', premium: '', basico: '' });
  const [linksSaved, setLinksSaved] = useState(false);

  useEffect(() => {
    try { setUsers(JSON.parse(localStorage.getItem('smpU7') || '[]')); } catch {}
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const stats: Record<string, { wins: number; losses: number }> = {};
      // Currently only tracks the logged-in user's history, but show aggregate per-session
      stats['_global'] = {
        wins: hist.filter((h: any) => h.result === 'win').length,
        losses: hist.filter((h: any) => h.result === 'loss').length,
      };
      setHistStats(stats);
    } catch {}
    try { setLinks(JSON.parse(localStorage.getItem('smpLinks7') || '{"pro":"","premium":"","basico":""}')) } catch {}
  }, []);

  const saveUsers = (updated: User[]) => {
    setUsers(updated);
    localStorage.setItem('smpU7', JSON.stringify(updated));
  };

  const deleteUser = (username: string) => {
    if (username === currentUser?.user) return alert('Não é possível deletar o usuário atual.');
    if (!confirm(`Deletar usuário "${username}"?`)) return;
    saveUsers(users.filter(u => u.user !== username));
  };

  const saveEdit = () => {
    if (!editUser) return;
    saveUsers(users.map(u => u.user === editUser.user ? editUser : u));
    setEditUser(null);
  };

  const addUser = () => {
    if (!newUser.user || !newUser.pass) return alert('Usuário e senha são obrigatórios.');
    if (users.some(u => u.user === newUser.user)) return alert('Usuário já existe.');
    const u: User = {
      user: newUser.user!, pass: newUser.pass!, role: newUser.role as any || 'user',
      plan: newUser.plan as any || 'basico', name: newUser.name, email: newUser.email
    };
    saveUsers([...users, u]);
    setShowAdd(false);
    setNewUser({ role: 'user', plan: 'basico' });
  };

  const saveLinks = () => {
    localStorage.setItem('smpLinks7', JSON.stringify(links));
    setLinksSaved(true);
    setTimeout(() => setLinksSaved(false), 2000);
  };

  const globalStats = histStats['_global'] || { wins: 0, losses: 0 };
  const globalTotal = globalStats.wins + globalStats.losses;
  const globalWR = globalTotal > 0 ? Math.round((globalStats.wins / globalTotal) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Crown className="text-[var(--gold)]" /> Painel Admin
        </h1>
        <span className="px-2 py-0.5 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30 rounded text-xs font-bold">RESTRITO</span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Usuários</div>
          <div className="text-3xl font-black text-white">{users.length}</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Premium</div>
          <div className="text-3xl font-black text-yellow-400">{users.filter(u => u.plan === 'premium').length}</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Sinais Totais</div>
          <div className="text-3xl font-black text-[var(--blue)]">{globalTotal}</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-xs text-gray-500 mb-1">Win Rate Global</div>
          <div className={`text-3xl font-black ${globalWR >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{globalWR}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Users Table */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <h3 className="font-bold text-white flex items-center gap-2"><Users size={16} className="text-[var(--green)]" /> Usuários ({users.length})</h3>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30 rounded-lg text-xs font-bold hover:bg-[var(--green)]/20 transition"
            >
              <Plus size={13} /> Novo Usuário
            </button>
          </div>

          {/* Add User Form */}
          {showAdd && (
            <div className="p-5 bg-black/20 border-b border-white/5">
              <h4 className="text-sm font-bold text-white mb-3">Novo Usuário</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'user', placeholder: 'Username', type: 'text' },
                  { key: 'pass', placeholder: 'Senha', type: 'password' },
                  { key: 'name', placeholder: 'Nome completo', type: 'text' },
                  { key: 'email', placeholder: 'Email', type: 'email' },
                ].map(({ key, placeholder, type }) => (
                  <input
                    key={key} type={type} placeholder={placeholder}
                    value={(newUser as any)[key] || ''}
                    onChange={e => setNewUser(p => ({ ...p, [key]: e.target.value }))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[var(--green)]/50"
                  />
                ))}
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as any }))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  {['user', 'analista', 'moderador', 'suporte', 'financeiro', 'gerente', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={newUser.plan} onChange={e => setNewUser(p => ({ ...p, plan: e.target.value as any }))}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  {['basico', 'pro', 'premium'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addUser} className="px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg text-xs hover:bg-[var(--green-dark)] transition">Criar</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-xs hover:bg-white/10 transition">Cancelar</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-black/20 border-b border-white/5 text-xs uppercase text-gray-500">
                  <th className="p-4">Usuário</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.user} className="hover:bg-white/3 transition">
                    {editUser?.user === u.user ? (
                      <td colSpan={4} className="p-4">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={editUser.name || ''} onChange={e => setEditUser(p => p ? { ...p, name: e.target.value } : p)} placeholder="Nome" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                          <input value={editUser.email || ''} onChange={e => setEditUser(p => p ? { ...p, email: e.target.value } : p)} placeholder="Email" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                          <input value={editUser.pass} onChange={e => setEditUser(p => p ? { ...p, pass: e.target.value } : p)} placeholder="Nova senha" type="password" className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                          <select value={editUser.plan} onChange={e => setEditUser(p => p ? { ...p, plan: e.target.value as any } : p)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white">
                            {['basico', 'pro', 'premium'].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <select value={editUser.role} onChange={e => setEditUser(p => p ? { ...p, role: e.target.value as any } : p)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white">
                            {['user', 'analista', 'moderador', 'suporte', 'financeiro', 'gerente', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={saveEdit} className="px-3 py-1 bg-[var(--green)] text-black rounded text-xs font-bold flex items-center gap-1"><Save size={11} /> Salvar</button>
                          <button onClick={() => setEditUser(null)} className="px-3 py-1 bg-white/5 text-gray-400 rounded text-xs flex items-center gap-1"><X size={11} /> Cancelar</button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="p-4">
                          <div className="font-medium text-white text-sm">{u.user}</div>
                          {u.name && <div className="text-xs text-gray-500">{u.name}</div>}
                          {u.email && <div className="text-xs text-gray-600">{u.email}</div>}
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${ROLE_COLORS[u.role] || ''}`}>{u.role}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded border font-bold uppercase ${PLAN_COLORS[u.plan] || ''}`}>{u.plan}</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditUser({ ...u })} className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"><Edit2 size={13} /></button>
                            {u.user !== currentUser?.user && (
                              <button onClick={() => deleteUser(u.user)} className="p-1.5 bg-[var(--red)]/10 hover:bg-[var(--red)]/20 rounded text-[var(--red)] transition"><Trash2 size={13} /></button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">

          {/* Plans Breakdown */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><BarChart2 size={14} className="text-[var(--blue)]" /> Distribuição de Planos</h3>
            {['premium', 'pro', 'basico'].map(plan => {
              const count = users.filter(u => u.plan === plan).length;
              const pct = users.length > 0 ? (count / users.length) * 100 : 0;
              return (
                <div key={plan} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-bold uppercase ${plan === 'premium' ? 'text-yellow-400' : plan === 'pro' ? 'text-[var(--blue)]' : 'text-gray-400'}`}>{plan}</span>
                    <span className="text-gray-500">{count} usuários</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{
                      width: `${pct}%`,
                      background: plan === 'premium' ? '#ffd700' : plan === 'pro' ? 'var(--blue)' : 'rgba(255,255,255,0.2)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Signal Stats */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><TrendingUp size={14} className="text-[var(--green)]" /> Performance Global</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total de sinais</span><span className="font-bold text-white">{globalTotal}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">WINs</span><span className="font-bold text-[var(--green)]">{globalStats.wins}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">LOSSes</span><span className="font-bold text-[var(--red)]">{globalStats.losses}</span></div>
              <div className="flex justify-between border-t border-white/5 pt-2 mt-2"><span className="text-gray-500">Win Rate</span><span className={`font-bold ${globalWR >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{globalWR}%</span></div>
            </div>
          </div>

          {/* Kiwify/Payment Links */}
          <div className="glass-card p-5">
            <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><Shield size={14} className="text-purple-400" /> Links de Pagamento</h3>
            <div className="space-y-2">
              {(['basico', 'pro', 'premium'] as const).map(plan => (
                <div key={plan}>
                  <label className="text-xs text-gray-500 mb-1 block capitalize">Link {plan}</label>
                  <input
                    type="url" value={links[plan]} placeholder={`https://kiwify.com.br/...`}
                    onChange={e => setLinks(p => ({ ...p, [plan]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-[var(--blue)]/50"
                  />
                </div>
              ))}
              <button
                onClick={saveLinks}
                className="w-full mt-2 bg-[var(--blue)]/20 text-[var(--blue)] border border-[var(--blue)]/30 rounded-lg py-2 text-xs font-bold hover:bg-[var(--blue)]/30 transition"
              >
                {linksSaved ? '✓ Salvo!' : 'Salvar Links'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
