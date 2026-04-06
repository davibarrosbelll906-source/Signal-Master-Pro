export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Metas e Conquistas</h1>
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4">Meta Diária</h3>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progresso (R$ 150 / R$ 500)</span>
          <span className="font-bold text-[var(--green)]">30%</span>
        </div>
        <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--green)]" style={{ width: '30%' }}></div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card p-4 text-center opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition cursor-pointer">
            <div className="w-12 h-12 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-2 border border-yellow-500/30 text-2xl">
              🏆
            </div>
            <div className="text-xs font-bold text-white">Conquista {i}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
