export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Configurações</h1>
      <div className="glass-card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">Filtro de Sinais</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Score Mínimo (65%)</div>
                <div className="text-xs text-gray-400">Apenas sinais acima desta confiança serão exibidos.</div>
              </div>
              <input type="range" min="40" max="90" defaultValue="65" className="w-32 accent-[var(--green)]" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-white">Som Apenas em FORTE/PREMIUM</div>
                <div className="text-xs text-gray-400">Silencia alertas de sinais médios e fracos.</div>
              </div>
              <input type="checkbox" defaultChecked className="toggle-checkbox" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">Aparência</h3>
          <div className="flex gap-4">
             <button className="w-12 h-12 rounded-full bg-[#07070d] border-2 border-[var(--green)]"></button>
             <button className="w-12 h-12 rounded-full bg-[#0d0705] border border-white/10 hover:border-white/30"></button>
             <button className="w-12 h-12 rounded-full bg-[#050d12] border border-white/10 hover:border-white/30"></button>
          </div>
        </div>
      </div>
    </div>
  );
}
