import { useAppStore } from "@/lib/store";
import { Redirect } from "wouter";
import { DollarSign, Users, TrendingUp } from "lucide-react";

export default function RevenuePage() {
  const currentUser = useAppStore(s => s.currentUser);
  
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'financeiro') {
    return <Redirect to="/dashboard/signals" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Receita & Planos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="text-gray-400 mb-2 flex items-center gap-2"><DollarSign size={16}/> MRR (Receita Mensal)</div>
          <div className="text-3xl font-bold text-[var(--green)]">R$ 24.850</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-gray-400 mb-2 flex items-center gap-2"><Users size={16}/> Assinantes Ativos</div>
          <div className="text-3xl font-bold text-white">312</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-gray-400 mb-2 flex items-center gap-2"><TrendingUp size={16}/> Plano Mais Popular</div>
          <div className="text-3xl font-bold text-[var(--blue)]">PRO</div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mt-8 mb-4">Gerenciamento de Planos</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basico */}
        <div className="glass-card p-6 border-white/10 flex flex-col">
          <div className="text-lg font-bold text-white mb-2">Básico</div>
          <div className="text-2xl font-bold text-gray-300 mb-6">R$ 47<span className="text-sm font-normal text-gray-500">/mês</span></div>
          <div className="mt-auto space-y-3 text-sm">
            <input type="text" placeholder="Link Checkout Kiwify" className="w-full bg-black/30 border border-white/10 rounded px-3 py-2" />
            <button className="w-full bg-white/10 hover:bg-white/20 py-2 rounded transition">Salvar Link</button>
          </div>
        </div>

        {/* PRO */}
        <div className="glass-card p-6 border-[var(--blue)]/50 relative flex flex-col">
          <div className="absolute top-0 right-0 bg-[var(--blue)] text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">MAIS POPULAR</div>
          <div className="text-lg font-bold text-[var(--blue)] mb-2">PRO</div>
          <div className="text-2xl font-bold text-white mb-6">R$ 97<span className="text-sm font-normal text-gray-500">/mês</span></div>
          <div className="mt-auto space-y-3 text-sm">
            <input type="text" placeholder="Link Checkout Kiwify" className="w-full bg-black/30 border border-white/10 rounded px-3 py-2" />
            <button className="w-full bg-[var(--blue)]/20 hover:bg-[var(--blue)]/40 text-[var(--blue)] py-2 rounded transition">Salvar Link</button>
          </div>
        </div>

        {/* Premium */}
        <div className="glass-card p-6 border-[var(--green)]/50 flex flex-col">
          <div className="text-lg font-bold text-[var(--green)] mb-2">Premium</div>
          <div className="text-2xl font-bold text-white mb-6">R$ 197<span className="text-sm font-normal text-gray-500">/mês</span></div>
          <div className="mt-auto space-y-3 text-sm">
            <input type="text" placeholder="Link Checkout Kiwify" className="w-full bg-black/30 border border-white/10 rounded px-3 py-2" />
            <button className="w-full bg-[var(--green)]/20 hover:bg-[var(--green)]/40 text-[var(--green)] py-2 rounded transition">Salvar Link</button>
          </div>
        </div>
      </div>
    </div>
  );
}
