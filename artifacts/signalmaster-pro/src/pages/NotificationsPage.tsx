import { useState, useEffect } from "react";
import { Bell, CheckCircle, AlertTriangle, Info, X, Trash2, BellOff } from "lucide-react";

interface Notif {
  id: number;
  ts: number;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  desc: string;
  read: boolean;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (mins > 0) return `${mins}min atrás`;
  return 'agora';
}

function generateAutoNotifs(hist: any[]): Notif[] {
  const notifs: Notif[] = [];
  const now = Date.now();

  if (hist.length === 0) return notifs;

  const wins = hist.filter(h => h.result === 'win').length;
  const total = hist.length;
  const wr = Math.round((wins / total) * 100);

  // WR milestone
  if (wr >= 75) notifs.push({
    id: 1001, ts: now - 300000, type: 'success',
    title: '🎉 Win Rate acima de 75%!',
    desc: `Parabéns! Seu win rate está em ${wr}%. Continue operando com disciplina.`,
    read: false,
  });

  // Ops milestone
  if (total >= 50) notifs.push({
    id: 1002, ts: now - 3600000, type: 'info',
    title: `📊 Marco: ${total >= 100 ? '100' : '50'} operações!`,
    desc: `Você atingiu ${total} operações registradas. Analise seus padrões na aba Analytics.`,
    read: false,
  });

  // Today's recap
  const todayHist = hist.filter(h => new Date(h.ts).toDateString() === new Date().toDateString());
  if (todayHist.length > 0) {
    const tw = todayHist.filter(h => h.result === 'win').length;
    const tl = todayHist.length - tw;
    const sessionWR = Math.round((tw / todayHist.length) * 100);
    notifs.push({
      id: 1003, ts: now - 60000, type: sessionWR >= 65 ? 'success' : 'warning',
      title: `📅 Sessão de hoje: ${tw}W / ${tl}L`,
      desc: `Win rate de hoje: ${sessionWR}%. ${sessionWR >= 65 ? 'Boa sessão!' : 'Abaixo do esperado. Considere parar por hoje.'}`,
      read: false,
    });
  }

  // Loss streak warning
  const sorted = [...hist].sort((a, b) => b.ts - a.ts).slice(0, 5);
  const consecutiveLosses = sorted.findIndex(h => h.result === 'win');
  if (consecutiveLosses >= 3) notifs.push({
    id: 1004, ts: now - 120000, type: 'error',
    title: '⚠️ Stop recomendado',
    desc: `Você teve ${consecutiveLosses} losses consecutivos. Recomendamos parar a sessão e voltar depois.`,
    read: false,
  });

  return notifs;
}

const SYSTEM_NOTIFS: Notif[] = [
  {
    id: 2001, ts: Date.now() - 7200000, type: 'info',
    title: '🇬🇧 Sessão de Londres aberta',
    desc: 'Alta liquidez em EUR/USD, GBP/USD. Melhor janela para operar Forex.',
    read: false,
  },
  {
    id: 2002, ts: Date.now() - 86400000, type: 'info',
    title: '🤖 ML adaptativo atualizado',
    desc: 'Os pesos dos indicadores foram recalibrados com base no seu histórico de 30 dias.',
    read: false,
  },
  {
    id: 2003, ts: Date.now() - 2 * 86400000, type: 'warning',
    title: '📢 Alta volatilidade detectada',
    desc: 'BTC/USDT apresentou variação de 4.2% na última hora. Reduza o risco por operação.',
    read: false,
  },
];

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    try {
      const stored: Notif[] = JSON.parse(localStorage.getItem('smpNotif7') || '[]');
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const auto = generateAutoNotifs(hist);

      // Merge stored + auto + system, deduplicating by id
      const existingIds = new Set(stored.map(n => n.id));
      const merged = [...stored, ...auto.filter(n => !existingIds.has(n.id)), ...SYSTEM_NOTIFS.filter(n => !existingIds.has(n.id))];
      merged.sort((a, b) => b.ts - a.ts);

      setNotifs(merged);
      localStorage.setItem('smpNotif7', JSON.stringify(merged));
    } catch {}
  }, []);

  const save = (updated: Notif[]) => {
    setNotifs(updated);
    localStorage.setItem('smpNotif7', JSON.stringify(updated));
  };

  const markAll = () => save(notifs.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => save(notifs.map(n => n.id === id ? { ...n, read: true } : n));
  const remove = (id: number) => save(notifs.filter(n => n.id !== id));
  const clearAll = () => { save([]); };

  const unread = notifs.filter(n => !n.read).length;

  const icons = {
    success: <CheckCircle className="text-[var(--green)] shrink-0" size={18} />,
    warning: <AlertTriangle className="text-yellow-400 shrink-0" size={18} />,
    info: <Info className="text-[var(--blue)] shrink-0" size={18} />,
    error: <AlertTriangle className="text-[var(--red)] shrink-0" size={18} />,
  };

  const borderColors = {
    success: 'border-l-[var(--green)]',
    warning: 'border-l-yellow-400',
    info: 'border-l-[var(--blue)]',
    error: 'border-l-[var(--red)]',
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="text-white" />
          Notificações
          {unread > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-[var(--red)] text-white rounded-full">{unread}</span>
          )}
        </h1>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-[var(--blue)] hover:text-white transition px-3 py-1.5 rounded bg-white/5">
              Marcar tudo como lido
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll} className="text-xs text-gray-600 hover:text-[var(--red)] transition px-3 py-1.5 rounded bg-white/5 flex items-center gap-1">
              <Trash2 size={12} /> Limpar tudo
            </button>
          )}
        </div>
      </div>

      {notifs.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <BellOff size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Sem notificações</p>
          <p className="text-gray-600 text-sm mt-1">Registre operações para receber alertas automáticos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div
              key={n.id}
              className={`glass-card p-4 border-l-4 flex gap-3 cursor-pointer transition ${borderColors[n.type]} ${!n.read ? 'bg-white/3' : 'opacity-60'}`}
              onClick={() => markRead(n.id)}
            >
              <div className="mt-0.5">{icons[n.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-3 mb-0.5">
                  <h4 className={`font-bold text-sm ${!n.read ? 'text-white' : 'text-gray-400'}`}>{n.title}</h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-600 whitespace-nowrap">{timeAgo(n.ts)}</span>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--blue)]" />}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{n.desc}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(n.id); }}
                className="shrink-0 p-1 text-gray-700 hover:text-[var(--red)] transition mt-0.5"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-700 text-center">Clique em uma notificação para marcá-la como lida</p>
    </div>
  );
}
