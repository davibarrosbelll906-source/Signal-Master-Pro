import { useState } from "react";
import { BookOpen, Plus, Save } from "lucide-react";

export default function DiaryPage() {
  const [entries, setEntries] = useState([
    { date: "Hoje", mood: "Confiante", notes: "Segui o gerenciamento à risca.", pnl: "+ R$ 145,00" },
    { date: "Ontem", mood: "Ansioso", notes: "Operei fora do horário ideal.", pnl: "- R$ 45,00" }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Diário de Trading</h1>
        <button className="bg-[var(--green)] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[var(--green-dark)] transition">
          <Plus size={18} /> Nova Entrada
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {entries.map((e, i) => (
            <div key={i} className="glass-card p-5 border-l-4 border-l-[var(--green)]">
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-white">{e.date}</div>
                <div className={`font-mono font-bold ${e.pnl.startsWith('+') ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{e.pnl}</div>
              </div>
              <div className="text-sm text-gray-400 mb-3">Estado emocional: <span className="text-white font-medium">{e.mood}</span></div>
              <p className="text-gray-300 bg-white/5 p-3 rounded">{e.notes}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-6 h-fit">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
            <BookOpen size={18} className="text-[var(--blue)]" /> Nova Entrada Rápida
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-gray-400 mb-1">Estado Emocional</label>
              <select className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white">
                <option>Focado</option>
                <option>Ansioso</option>
                <option>Confiante</option>
                <option>Frustrado</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 mb-1">Anotações / Lições</label>
              <textarea className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white h-24 resize-none"></textarea>
            </div>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded transition flex items-center justify-center gap-2">
              <Save size={16} /> Salvar no Diário
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
