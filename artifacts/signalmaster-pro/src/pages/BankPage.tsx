import { Wallet, TrendingUp, AlertTriangle } from "lucide-react";

export default function BankPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Gestão de Banca</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-gradient-to-br from-white/5 to-[var(--green)]/10 border-[var(--green)]/20">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Wallet size={18} /> Banca Atual
          </div>
          <div className="text-4xl font-bold text-white mb-1">R$ 1.245,50</div>
          <div className="text-sm text-[var(--green)] font-medium flex items-center gap-1">
            <TrendingUp size={14} /> +R$ 245,50 hoje
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-6">Estratégias de Gerenciamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-[var(--green)] bg-[var(--green)]/5 rounded-xl cursor-pointer">
            <div className="font-bold text-white mb-2 text-lg">Mão Fixa</div>
            <p className="text-sm text-gray-400">Risco constante por operação. Ideal para consistência e longo prazo.</p>
            <div className="mt-4 text-xs font-mono text-[var(--green)]">RECOMENDADO</div>
          </div>
          <div className="p-4 border border-white/10 bg-white/5 hover:border-white/30 rounded-xl transition cursor-pointer">
            <div className="font-bold text-white mb-2 text-lg">Soros</div>
            <p className="text-sm text-gray-400">Reinveste o lucro da operação anterior. Alto potencial de alavancagem.</p>
          </div>
          <div className="p-4 border border-[var(--red)]/50 bg-[var(--red)]/5 rounded-xl cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[var(--red)] text-xs text-white px-2 py-1 font-bold rounded-bl-lg">ALTO RISCO</div>
            <div className="font-bold text-white mb-2 text-lg">Martingale</div>
            <p className="text-sm text-gray-400">Dobra a entrada após um loss. Perigoso sem banca adequada.</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm">
        <AlertTriangle className="shrink-0 mt-0.5" size={16} />
        <div>
          <p className="font-bold mb-1">Aviso sobre Criptoativos</p>
          <p>O mercado de criptoativos em OTC possui alta volatilidade. Recomendamos utilizar no máximo 1% da sua banca por operação neste mercado.</p>
        </div>
      </div>
    </div>
  );
}
