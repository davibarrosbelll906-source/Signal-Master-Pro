import { Copy, Link as LinkIcon, Share2 } from "lucide-react";

export default function AffiliatesPage() {
  const affiliateCode = "SMP-8A2F9B";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Programa de Afiliados</h1>
      
      <div className="glass-card p-8 text-center bg-gradient-to-b from-white/5 to-[var(--blue)]/5 border-[var(--blue)]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--blue)]/10 blur-[80px] rounded-full pointer-events-none"></div>
        
        <h2 className="text-3xl font-black text-white mb-2">Ganhe 10% Mensal</h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Convide amigos para o SignalMaster Pro e ganhe comissão recorrente enquanto eles forem assinantes ativos.
        </p>

        <div className="max-w-md mx-auto bg-black/50 p-4 rounded-xl border border-white/10 mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-bold">Seu Link de Convite</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-[var(--green)] truncate">
              https://signalmaster.pro/ref/{affiliateCode}
            </div>
            <button className="p-2 bg-[var(--green)]/20 text-[var(--green)] rounded hover:bg-[var(--green)]/30 transition">
              <Copy size={18} />
            </button>
          </div>
        </div>

        <button className="bg-[var(--blue)] text-white font-bold px-6 py-3 rounded-full hover:bg-blue-500 transition flex items-center justify-center gap-2 mx-auto">
          <Share2 size={18} /> Compartilhar no WhatsApp
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="text-sm text-gray-400 mb-1">Cadastros</div>
          <div className="text-3xl font-bold text-white">12</div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-gray-400 mb-1">Assinantes Ativos</div>
          <div className="text-3xl font-bold text-[var(--blue)]">4</div>
        </div>
        <div className="glass-card p-6 border-[var(--green)]/30 bg-[var(--green)]/5">
          <div className="text-sm text-[var(--green)] mb-1">Comissão Disponível</div>
          <div className="text-3xl font-bold text-white">R$ 58,80</div>
        </div>
      </div>
    </div>
  );
}
