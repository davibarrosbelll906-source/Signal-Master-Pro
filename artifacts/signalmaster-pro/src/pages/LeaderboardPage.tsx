import { Award } from "lucide-react";

export default function LeaderboardPage() {
  const users = [
    { pos: 1, name: "Carlos M.", wr: 84.5, ops: 145, plan: "PREMIUM" },
    { pos: 2, name: "Ana T.", wr: 82.1, ops: 98, plan: "PRO" },
    { pos: 3, name: "Trader_BR", wr: 81.0, ops: 210, plan: "PREMIUM" },
    { pos: 4, name: "Lucas F.", wr: 79.5, ops: 56, plan: "BÁSICO" },
    { pos: 5, name: "Você", wr: 78.5, ops: 142, plan: "BÁSICO", isMe: true },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <Award className="text-[var(--gold)]" /> Hall da Fama
      </h1>

      <div className="flex gap-2 mb-6">
        <button className="px-4 py-2 bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30 rounded-lg text-sm font-bold">Geral</button>
        <button className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 hover:text-white rounded-lg text-sm font-bold">Cripto</button>
        <button className="px-4 py-2 bg-white/5 text-gray-400 border border-white/10 hover:text-white rounded-lg text-sm font-bold">Forex</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/5 text-xs uppercase text-gray-500 font-bold">
              <th className="p-4 w-16 text-center">Pos</th>
              <th className="p-4">Trader</th>
              <th className="p-4 text-center">Win Rate</th>
              <th className="p-4 text-center">Ops</th>
              <th className="p-4 text-right">Plano</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.pos} className={`${u.isMe ? 'bg-[var(--blue)]/10 border-l-4 border-l-[var(--blue)]' : 'hover:bg-white/5'} transition`}>
                <td className="p-4 text-center font-black">
                  {u.pos === 1 ? <span className="text-[var(--gold)] text-xl">1</span> :
                   u.pos === 2 ? <span className="text-gray-300 text-lg">2</span> :
                   u.pos === 3 ? <span className="text-orange-400 text-lg">3</span> :
                   <span className="text-gray-600">{u.pos}</span>}
                </td>
                <td className="p-4 font-bold text-white flex items-center gap-2">
                  {u.name} {u.isMe && <span className="text-[10px] bg-[var(--blue)] px-2 py-0.5 rounded text-white ml-2">VOCÊ</span>}
                </td>
                <td className="p-4 text-center font-bold text-[var(--green)]">{u.wr}%</td>
                <td className="p-4 text-center text-gray-400">{u.ops}</td>
                <td className="p-4 text-right">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded bg-white/10 ${u.plan === 'PREMIUM' ? 'text-[var(--gold)]' : u.plan === 'PRO' ? 'text-[var(--blue)]' : 'text-gray-400'}`}>
                    {u.plan}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
