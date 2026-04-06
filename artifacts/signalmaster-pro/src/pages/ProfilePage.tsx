import { useAppStore } from "@/lib/store";

export default function ProfilePage() {
  const currentUser = useAppStore(s => s.currentUser);
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
      <div className="glass-card p-6 flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--purple)] to-[var(--blue)] flex items-center justify-center text-4xl font-bold text-white">
          {currentUser?.user.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{currentUser?.name || currentUser?.user}</h2>
          <p className="text-gray-400">{currentUser?.email || `${currentUser?.user}@email.com`}</p>
          <div className="mt-2 inline-block px-3 py-1 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 rounded-full text-xs font-bold uppercase">
            Plano {currentUser?.plan}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">Estatísticas</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-gray-400">Total de Sinais</span> <span className="font-bold">142</span></li>
            <li className="flex justify-between"><span className="text-gray-400">Win Rate Geral</span> <span className="font-bold text-[var(--green)]">78.5%</span></li>
            <li className="flex justify-between"><span className="text-gray-400">Melhor Sequência</span> <span className="font-bold">12 WINS</span></li>
            <li className="flex justify-between"><span className="text-gray-400">Ativo Favorito</span> <span className="font-bold">EUR/USD</span></li>
          </ul>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">Assinatura</h3>
          <p className="text-sm text-gray-400 mb-4">Seu período de teste expira em 2 dias.</p>
          <button className="w-full py-2 bg-[var(--green)] text-black font-bold rounded-lg hover:bg-[var(--green-dark)] transition">
            Fazer Upgrade Agora
          </button>
        </div>
      </div>
    </div>
  );
}
