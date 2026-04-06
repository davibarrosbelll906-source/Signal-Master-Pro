import { BookOpen } from "lucide-react";

export default function StrategiesPage() {
  const strats = [
    { title: "DNA de Candle", desc: "IA analisa o formato dos últimos 7 candles e compara com milhares de padrões históricos para prever a direção.", tag: "IA / Quant" },
    { title: "Market Maker Trap", desc: "Detecta falsos rompimentos criados por grandes players para capturar liquidez antes de reverter o mercado.", tag: "Avançado" },
    { title: "Confluência de Tendência", desc: "Alinhamento de EMA 200 (tendência macro) com RSI sobrevendido e padrão de reversão.", tag: "Price Action" },
    { title: "Entropia de Shannon", desc: "Mede o grau de caos do mercado. Sinais só são emitidos quando a entropia está baixa (mercado previsível).", tag: "Quantitativo" }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <BookOpen className="text-[var(--blue)]" size={28} />
        <h1 className="text-2xl font-bold text-white">Estratégias & Educação</h1>
      </div>
      
      <p className="text-gray-400 max-w-2xl">
        O SignalMaster Pro não é uma caixa preta. Entenda a matemática e a lógica por trás de cada sinal emitido pela nossa inteligência.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {strats.map((s, i) => (
          <div key={i} className="glass-card p-6 border-white/5 hover:border-[var(--blue)]/30 transition cursor-pointer group">
            <div className="text-xs font-bold text-[var(--blue)] mb-2 uppercase tracking-widest">{s.tag}</div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[var(--blue)] transition">{s.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
