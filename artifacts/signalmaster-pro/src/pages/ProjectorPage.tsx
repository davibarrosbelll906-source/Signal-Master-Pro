import { Maximize2, Zap } from "lucide-react";
import { Link } from "wouter";

export default function ProjectorPage() {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8">
      <Link href="/dashboard/signals" className="absolute top-8 right-8 text-white/50 hover:text-white transition">
        Sair do Modo Projetor <Maximize2 className="inline ml-2" size={18} />
      </Link>
      
      <div className="text-[var(--green)] text-2xl font-bold tracking-widest uppercase mb-12 flex items-center gap-3 animate-pulse">
        <Zap /> Sinal Ativo <Zap />
      </div>

      <div className="text-[120px] font-black text-white leading-none tracking-tighter mb-4 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
        EUR/USD
      </div>
      
      <div className="text-[180px] font-black text-[var(--green)] leading-none tracking-tighter mb-12 drop-shadow-[0_0_50px_rgba(0,255,136,0.5)]">
        CALL
      </div>

      <div className="flex gap-16 text-3xl font-bold text-gray-400">
        <div>M1</div>
        <div>•</div>
        <div className="text-white">Score: <span className="text-[var(--green)]">82%</span></div>
      </div>

      <div className="absolute bottom-16 text-center">
        <div className="text-sm text-gray-500 uppercase tracking-widest mb-4">Próximo sinal em</div>
        <div className="text-8xl font-mono font-bold text-white tabular-nums opacity-50">
          00:45
        </div>
      </div>
    </div>
  );
}
