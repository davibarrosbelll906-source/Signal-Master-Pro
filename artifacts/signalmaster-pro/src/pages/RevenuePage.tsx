import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Redirect } from "wouter";
import { DollarSign, Users, TrendingUp, Link, Save, Check } from "lucide-react";

interface UserRecord {
  user: string;
  plan: string;
  role: string;
  active?: boolean;
}

const PLAN_PRICES: Record<string, number> = { basico: 47, pro: 97, premium: 197 };

export default function RevenuePage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [links, setLinks] = useState({ basico: '', pro: '', premium: '' });
  const [pix, setPix] = useState({ key: '', name: '', bank: '' });
  const [savedLinks, setSavedLinks] = useState(false);
  const [savedPix, setSavedPix] = useState(false);

  useEffect(() => {
    try { setUsers(JSON.parse(localStorage.getItem('smpU7') || '[]')); } catch {}
    try {
      const stored = JSON.parse(localStorage.getItem('smpLinks7') || 'null');
      if (stored) setLinks(stored);
    } catch {}
    try {
      const stored = JSON.parse(localStorage.getItem('smpPix7') || 'null');
      if (stored) setPix(stored);
    } catch {}
  }, []);

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'financeiro') {
    return <Redirect to="/dashboard/signals" />;
  }

  const saveLinks = () => {
    localStorage.setItem('smpLinks7', JSON.stringify(links));
    setSavedLinks(true);
    setTimeout(() => setSavedLinks(false), 2000);
  };

  const savePix = () => {
    localStorage.setItem('smpPix7', JSON.stringify(pix));
    setSavedPix(true);
    setTimeout(() => setSavedPix(false), 2000);
  };

  // Calculate revenue
  const planCounts = { basico: 0, pro: 0, premium: 0 };
  users.filter(u => u.role === 'user').forEach(u => {
    if (u.plan in planCounts) planCounts[u.plan as keyof typeof planCounts]++;
  });
  const totalUsers = users.filter(u => u.role === 'user').length;
  const mrr = Object.entries(planCounts).reduce((acc, [plan, count]) => acc + (PLAN_PRICES[plan] || 0) * count, 0);
  const topPlan = Object.entries(planCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '—';

  const PLAN_LABELS: Record<string, string> = { basico: 'Básico', pro: 'PRO', premium: 'Premium' };
  const PLAN_COLORS: Record<string, string> = { basico: 'text-gray-400', pro: 'text-[var(--blue)]', premium: 'text-[var(--gold)]' };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <DollarSign className="text-[var(--green)]" /> Receita & Planos
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <div className="text-gray-400 mb-2 flex items-center gap-2 text-sm"><DollarSign size={14} /> MRR (Receita Mensal)</div>
          <div className={`text-3xl font-black ${mrr > 0 ? 'text-[var(--green)]' : 'text-gray-600'}`}>
            {mrr > 0 ? `R$ ${mrr.toLocaleString('pt-BR')}` : 'R$ 0'}
          </div>
          <div className="text-xs text-gray-600 mt-1">{totalUsers} assinantes ativos</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-gray-400 mb-2 flex items-center gap-2 text-sm"><Users size={14} /> Total de Usuários</div>
          <div className="text-3xl font-black text-white">{users.length}</div>
          <div className="text-xs text-gray-600 mt-1">{totalUsers} traders + {users.length - totalUsers} staff</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-gray-400 mb-2 flex items-center gap-2 text-sm"><TrendingUp size={14} /> Plano Mais Popular</div>
          <div className={`text-3xl font-black uppercase ${PLAN_COLORS[topPlan]}`}>{PLAN_LABELS[topPlan] || '—'}</div>
          <div className="text-xs text-gray-600 mt-1">{planCounts[topPlan as keyof typeof planCounts] || 0} assinantes</div>
        </div>
      </div>

      {/* Plan breakdown */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Distribuição por Plano</h3>
        <div className="grid grid-cols-3 gap-4">
          {(['basico', 'pro', 'premium'] as const).map(plan => {
            const count = planCounts[plan];
            const rev = PLAN_PRICES[plan] * count;
            const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
            return (
              <div key={plan} className="bg-white/3 rounded-xl p-4">
                <div className={`text-xs font-bold uppercase mb-3 ${PLAN_COLORS[plan]}`}>
                  {plan === 'premium' ? '💎' : plan === 'pro' ? '🔥' : '📦'} {PLAN_LABELS[plan]}
                </div>
                <div className="text-2xl font-black text-white mb-1">{count}</div>
                <div className="text-xs text-gray-500 mb-2">assinantes · {pct}%</div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: plan === 'premium' ? 'var(--gold)' : plan === 'pro' ? 'var(--blue)' : 'var(--green)',
                    }}
                  />
                </div>
                <div className={`text-xs font-bold mt-2 ${PLAN_COLORS[plan]}`}>R$ {rev.toLocaleString('pt-BR')}/mês</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Links de checkout */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Link size={16} className="text-[var(--blue)]" /> Links de Checkout</h3>
        <p className="text-xs text-gray-500 mb-4">Configure os links de pagamento (Kiwify, Hotmart, etc.) para cada plano.</p>
        <div className="space-y-3">
          {(['basico', 'pro', 'premium'] as const).map(plan => (
            <div key={plan} className="flex gap-3 items-center">
              <div className={`text-xs font-bold w-16 shrink-0 ${PLAN_COLORS[plan]}`}>{PLAN_LABELS[plan]}</div>
              <input
                type="url"
                value={links[plan]}
                onChange={e => setLinks(p => ({ ...p, [plan]: e.target.value }))}
                placeholder={`https://kiwify.app/checkout-${plan}`}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--blue)]/50 placeholder:text-gray-700"
              />
            </div>
          ))}
          <button
            onClick={saveLinks}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)]/20 border border-[var(--blue)]/30 text-[var(--blue)] font-bold rounded-lg text-sm hover:bg-[var(--blue)]/30 transition"
          >
            {savedLinks ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar Links</>}
          </button>
        </div>
      </div>

      {/* PIX config */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <DollarSign size={16} className="text-[var(--green)]" /> Chave PIX para Afiliados
        </h3>
        <p className="text-xs text-gray-500 mb-4">Utilizada para pagamento de comissões de afiliados.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Chave PIX</label>
            <input
              value={pix.key}
              onChange={e => setPix(p => ({ ...p, key: e.target.value }))}
              placeholder="CPF, CNPJ, email ou telefone"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--green)]/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Nome do Titular</label>
            <input
              value={pix.name}
              onChange={e => setPix(p => ({ ...p, name: e.target.value }))}
              placeholder="Nome completo"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--green)]/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">Banco</label>
            <input
              value={pix.bank}
              onChange={e => setPix(p => ({ ...p, bank: e.target.value }))}
              placeholder="Nubank, Itaú, etc."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--green)]/50"
            />
          </div>
        </div>
        <button
          onClick={savePix}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--green)]/20 border border-[var(--green)]/30 text-[var(--green)] font-bold rounded-lg text-sm hover:bg-[var(--green)]/30 transition"
        >
          {savedPix ? <><Check size={14} /> Salvo!</> : <><Save size={14} /> Salvar PIX</>}
        </button>
      </div>
    </div>
  );
}
