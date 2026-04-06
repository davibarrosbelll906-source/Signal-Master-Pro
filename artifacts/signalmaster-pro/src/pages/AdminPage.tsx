import { useAppStore } from "@/lib/store";
import { Redirect } from "wouter";

export default function AdminPage() {
  const currentUser = useAppStore(s => s.currentUser);
  
  if (currentUser?.role !== 'admin') {
    return <Redirect to="/dashboard/signals" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white text-[var(--red)]">Painel Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 col-span-2">
          <h3 className="text-lg font-bold mb-4 border-b border-white/10 pb-2">Usuários Registrados</h3>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-white/5">
                <th className="pb-2">Usuário</th>
                <th className="pb-2">Plano</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-3">joao.silva</td>
                <td><span className="text-[var(--blue)] font-bold">PRO</span></td>
                <td><span className="text-[var(--green)]">Ativo</span></td>
                <td><button className="text-gray-400 hover:text-white">Editar</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold mb-4">Métricas do Sistema</h3>
            <div className="text-3xl font-bold text-white mb-1">R$ 14.590</div>
            <div className="text-sm text-gray-400">MRR Estimado</div>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold mb-4">Config Kiwify</h3>
            <input type="text" placeholder="Link Plano PRO" className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm mb-2" />
            <button className="w-full bg-[var(--blue)] text-white py-2 rounded font-medium text-sm">Salvar Links</button>
          </div>
        </div>
      </div>
    </div>
  );
}
