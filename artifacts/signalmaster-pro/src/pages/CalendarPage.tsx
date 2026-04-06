import { Calendar as CalendarIcon } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Calendário Econômico & Resultados</h1>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CalendarIcon size={16} /> Mês Atual
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-bold text-gray-500">
          <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 31 }).map((_, i) => {
            // Fake profit/loss coloring
            const isProfit = Math.random() > 0.3;
            const isFuture = i > 15;
            
            let bgClass = "bg-white/5 border-white/5";
            if (!isFuture) {
              bgClass = isProfit 
                ? "bg-[var(--green)]/10 border-[var(--green)]/20 text-[var(--green)]" 
                : "bg-[var(--red)]/10 border-[var(--red)]/20 text-[var(--red)]";
            }

            return (
              <div key={i} className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-2 transition ${!isFuture ? 'cursor-pointer hover:border-white/40' : 'opacity-30'}`}>
                <span className="text-lg font-bold">{i + 1}</span>
                {!isFuture && (
                  <span className="text-xs font-mono mt-1 opacity-80">
                    {isProfit ? '+' : '-'} {Math.floor(Math.random() * 100)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
