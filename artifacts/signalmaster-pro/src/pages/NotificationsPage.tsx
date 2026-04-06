import { Bell, Info, AlertTriangle, CheckCircle } from "lucide-react";

export default function NotificationsPage() {
  const notifs = [
    { id: 1, type: 'success', title: 'Meta Diária Atingida!', desc: 'Você atingiu R$ 150,00 de lucro hoje. Descanse e volte amanhã.', time: '10 min atrás' },
    { id: 2, type: 'warning', title: 'Alerta de Volatilidade', desc: 'O par BTC/USD apresentou variação > 5% nos últimos 15 min. Risco elevado.', time: '1 hora atrás' },
    { id: 3, type: 'info', title: 'Sessão de NY Aberta', desc: 'A sobreposição com Londres começou. Maior liquidez em EUR/USD.', time: '2 horas atrás' }
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Bell size={24} className="text-white" />
        <h1 className="text-2xl font-bold text-white">Notificações</h1>
      </div>

      <div className="space-y-4">
        {notifs.map(n => (
          <div key={n.id} className={`glass-card p-4 border-l-4 flex gap-4 ${n.type === 'success' ? 'border-l-[var(--green)]' : n.type === 'warning' ? 'border-l-yellow-500' : 'border-l-[var(--blue)]'}`}>
            <div className="mt-1">
              {n.type === 'success' && <CheckCircle className="text-[var(--green)]" size={20} />}
              {n.type === 'warning' && <AlertTriangle className="text-yellow-500" size={20} />}
              {n.type === 'info' && <Info className="text-[var(--blue)]" size={20} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-white">{n.title}</h4>
                <span className="text-xs text-gray-500">{n.time}</span>
              </div>
              <p className="text-sm text-gray-400">{n.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
