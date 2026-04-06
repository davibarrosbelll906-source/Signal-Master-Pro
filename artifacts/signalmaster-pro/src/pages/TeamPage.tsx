import { useAppStore } from "@/lib/store";
import { Redirect } from "wouter";

export default function TeamPage() {
  const currentUser = useAppStore(s => s.currentUser);
  
  if (currentUser?.role === 'user' || currentUser?.role === 'basico') {
    return <Redirect to="/dashboard/signals" />;
  }

  const team = [
    { name: "Admin Silva", role: "admin", color: "bg-white text-black" },
    { name: "Gerente Marcos", role: "gerente", color: "bg-[var(--blue)] text-white" },
    { name: "Suporte Ana", role: "suporte", color: "bg-[var(--green)] text-black" },
    { name: "Analista Pedro", role: "analista", color: "bg-yellow-500 text-black" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Equipe</h1>
        {(currentUser?.role === 'admin' || currentUser?.role === 'gerente') && (
          <button className="bg-[var(--green)] text-black px-4 py-2 rounded-lg font-bold hover:bg-[var(--green-dark)] transition">
            + Adicionar Membro
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {team.map((m, i) => (
          <div key={i} className="glass-card p-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-2xl font-bold text-white mb-4 border-2 border-white/10">
              {m.name.charAt(0)}
            </div>
            <h3 className="font-bold text-white text-lg">{m.name}</h3>
            <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${m.color}`}>
              {m.role}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
