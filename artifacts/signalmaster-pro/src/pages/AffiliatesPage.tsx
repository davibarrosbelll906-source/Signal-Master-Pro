import { useState, useEffect } from "react";
import { Copy, Share2, Users, DollarSign, TrendingUp, Check, ExternalLink } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface AffData {
  code: string;
  clicks: number;
  signups: number;
  active: number;
  earned: number;
  paid: number;
  history: { date: string; event: string; amount?: number }[];
}

const COMMISSION_RATES: Record<string, number> = {
  basico: 4.70,
  pro: 9.70,
  premium: 19.70,
};

export default function AffiliatesPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [aff, setAff] = useState<AffData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('smpAff7') || 'null');
      if (stored) {
        setAff(stored);
      } else {
        // Initialize affiliate data for user
        const code = `SMP-${(currentUser?.user || 'USER').toUpperCase().slice(0, 4)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const initial: AffData = {
          code, clicks: 0, signups: 0, active: 0, earned: 0, paid: 0, history: [],
        };
        setAff(initial);
        localStorage.setItem('smpAff7', JSON.stringify(initial));
      }
    } catch {}
  }, []);

  if (!aff) return null;

  const refLink = `https://signalmaster.pro/ref/${aff.code}`;
  const pending = aff.earned - aff.paid;

  const copy = () => {
    navigator.clipboard.writeText(refLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    const text = `🚀 Estou usando o SignalMaster Pro v7 para operar opções binárias com até 84% de assertividade!\n\nAcesse com meu link e ganhe 7 dias grátis:\n${refLink}`;
    if (navigator.share) {
      navigator.share({ text, url: refLink });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const copyWhatsApp = () => {
    const text = `🚀 Estou usando o SignalMaster Pro v7 para operar opções binárias com até 84% de assertividade!\n\nAcesse com meu link e ganhe 7 dias grátis:\n${refLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Users className="text-[var(--blue)]" /> Programa de Afiliados
      </h1>

      {/* Hero Card */}
      <div className="glass-card p-8 text-center bg-gradient-to-b from-[var(--blue)]/5 to-transparent border-[var(--blue)]/20 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--blue)]/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="relative">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 text-[var(--green)] text-sm font-bold mb-4">
            💸 10% de comissão recorrente mensal
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Indique e Ganhe</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto text-sm">
            Para cada pessoa que se cadastrar e assinar o SignalMaster Pro usando seu link, você recebe 10% do valor mensalmente enquanto ela for assinante ativa.
          </p>

          {/* Ref Link */}
          <div className="max-w-md mx-auto bg-black/40 p-4 rounded-xl border border-white/10 mb-5">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Seu Link Exclusivo</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-[var(--green)] truncate text-left">
                {refLink}
              </div>
              <button
                onClick={copy}
                className="p-2.5 bg-[var(--green)]/20 text-[var(--green)] rounded-lg hover:bg-[var(--green)]/30 transition shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div className="text-[10px] text-gray-600 mt-2">Código: <strong className="text-gray-400">{aff.code}</strong></div>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={copyWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white font-bold rounded-full hover:opacity-90 transition text-sm"
            >
              <Share2 size={16} /> Compartilhar no WhatsApp
            </button>
            <button
              onClick={share}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/10 text-white font-bold rounded-full hover:bg-white/20 transition text-sm"
            >
              <ExternalLink size={16} /> Outras redes
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cliques no link', value: aff.clicks, color: 'text-white', icon: '🔗' },
          { label: 'Cadastros', value: aff.signups, color: 'text-[var(--blue)]', icon: '👤' },
          { label: 'Assinantes ativos', value: aff.active, color: 'text-[var(--green)]', icon: '✅' },
          { label: 'Comissão pendente', value: `R$ ${pending.toFixed(2)}`, color: 'text-[var(--gold)]', icon: '💰' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="glass-card p-5 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Commission table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <DollarSign size={14} className="text-[var(--green)]" /> Tabela de Comissões
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-gray-500 border-b border-white/5">
                <th className="pb-3 pr-4">Plano</th>
                <th className="pb-3 pr-4 text-center">Preço</th>
                <th className="pb-3 pr-4 text-center">Sua comissão</th>
                <th className="pb-3 text-center">Período</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { plan: '📦 Básico', price: 47, comm: COMMISSION_RATES.basico },
                { plan: '🔥 PRO', price: 97, comm: COMMISSION_RATES.pro },
                { plan: '💎 Premium', price: 197, comm: COMMISSION_RATES.premium },
              ].map(({ plan, price, comm }) => (
                <tr key={plan} className="border-b border-white/5 hover:bg-white/3 transition">
                  <td className="py-3 pr-4 font-medium text-white">{plan}</td>
                  <td className="py-3 pr-4 text-center text-gray-400">R$ {price}/mês</td>
                  <td className="py-3 pr-4 text-center font-bold text-[var(--green)]">R$ {comm.toFixed(2)}/mês</td>
                  <td className="py-3 text-center text-gray-500">Recorrente</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-600">💡 Com apenas 10 indicados Premium, você ganha +R$ 197/mês de renda passiva.</div>
      </div>

      {/* FAQ */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Perguntas frequentes</h3>
        <div className="space-y-3">
          {[
            { q: 'Quando recebo minha comissão?', a: 'As comissões são processadas mensalmente, no dia 10 de cada mês, por PIX.' },
            { q: 'Tem prazo para o indicado se cadastrar?', a: 'Não! Se a pessoa clicar no seu link, o cookie dura 90 dias.' },
            { q: 'Posso acompanhar em tempo real?', a: 'Sim. Esta página atualiza sempre que alguém usa seu link ou se torna assinante.' },
            { q: 'Existe um limite de indicações?', a: 'Não há limite! Quanto mais você indica, mais você ganha mensalmente.' },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <div className="text-sm font-medium text-white mb-1">{q}</div>
              <div className="text-xs text-gray-500">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
