import { useState } from "react";
import { Info } from "lucide-react";

export default function HeatmapPage() {
  const [modoCripto, setModoCripto] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Heatmap de Assertividade</h1>
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-sm text-gray-400">Modo Cripto (24h)</span>
          <input 
            type="checkbox" 
            checked={modoCripto}
            onChange={(e) => setModoCripto(e.target.checked)}
            className="toggle-checkbox"
          />
        </div>
      </div>

      <div className="glass-card p-6 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="flex mb-2">
            <div className="w-16"></div>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="flex-1 text-center text-sm font-bold text-gray-400">{day}</div>
            ))}
          </div>
          
          {Array.from({ length: 24 }).map((_, hour) => (
            <div key={hour} className="flex mb-1">
              <div className="w-16 text-xs text-gray-500 flex items-center justify-end pr-2">
                {hour.toString().padStart(2, '0')}:00
              </div>
              {Array.from({ length: 7 }).map((_, day) => {
                // Fake data generation for the mockup
                const value = Math.random() * 100;
                let colorClass = "bg-white/5";
                if (value > 80) colorClass = "bg-[var(--green)]";
                else if (value > 65) colorClass = "bg-[var(--green)]/50";
                else if (value > 50) colorClass = "bg-yellow-500/50";
                else colorClass = "bg-[var(--red)]/50";

                return (
                  <div key={day} className="flex-1 p-0.5">
                    <div 
                      className={`w-full h-8 rounded ${colorClass} hover:ring-2 ring-white/50 transition cursor-help`}
                      title={`${hour}h - ${value.toFixed(1)}%`}
                    ></div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-sm">
        <Info className="shrink-0 mt-0.5" size={16} />
        <p>Células vermelhas são bloqueadas automaticamente pelo sistema para proteger seu capital (Blacklist automática).</p>
      </div>
    </div>
  );
}
