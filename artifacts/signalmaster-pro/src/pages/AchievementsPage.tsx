import { Trophy, Star, Shield, Zap } from "lucide-react";

export default function AchievementsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Trophy className="text-yellow-400" /> Conquistas
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 text-center border-[var(--green)]/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[var(--green)]/5"></div>
          <Zap className="text-[var(--green)] w-12 h-12 mx-auto mb-3 relative z-10" />
          <div className="font-bold text-white mb-1 relative z-10">Primeiro WIN</div>
          <div className="text-xs text-[var(--green)] font-bold relative z-10">DESBLOQUEADO</div>
        </div>

        <div className="glass-card p-6 text-center opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition cursor-help">
          <Star className="text-yellow-400 w-12 h-12 mx-auto mb-3" />
          <div className="font-bold text-white mb-1">Em Chamas</div>
          <div className="text-xs text-gray-500">Faça 5 WINS seguidos</div>
        </div>

        <div className="glass-card p-6 text-center opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition cursor-help">
          <Shield className="text-[var(--blue)] w-12 h-12 mx-auto mb-3" />
          <div className="font-bold text-white mb-1">Consistente</div>
          <div className="text-xs text-gray-500">7 dias sem fechar negativo</div>
        </div>
        
        <div className="glass-card p-6 text-center opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition cursor-help">
          <Trophy className="text-purple-400 w-12 h-12 mx-auto mb-3" />
          <div className="font-bold text-white mb-1">Diamante</div>
          <div className="text-xs text-gray-500">50 WINS totais</div>
        </div>
      </div>
    </div>
  );
}
