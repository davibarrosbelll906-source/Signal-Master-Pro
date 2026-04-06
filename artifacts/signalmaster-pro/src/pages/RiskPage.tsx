export default function RiskPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Calculadora de Risco</h1>
      <div className="glass-card p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Banca Inicial (R$)</label>
            <input type="number" defaultValue="1000" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Risco por Op (%)</label>
            <input type="number" defaultValue="2" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Win Rate Estimado (%)</label>
            <input type="number" defaultValue="76" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Payout Médio (%)</label>
            <input type="number" defaultValue="85" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white" />
          </div>
        </div>
        <div className="p-4 bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-lg">
          <div className="text-sm text-[var(--green)] mb-1">Recomendação do Sistema</div>
          <div className="font-bold text-lg text-white">Entrada ideal: R$ 20.00</div>
          <p className="text-sm text-gray-400 mt-2">Com esse gerenciamento, o risco de ruína é menor que 0.1%.</p>
        </div>
      </div>
    </div>
  );
}
