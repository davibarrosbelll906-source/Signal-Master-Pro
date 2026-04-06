import { Link, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import { Activity, History, BarChart2, Map, Beaker, Trophy, BookOpen, Goal, ShieldAlert, Wallet, PieChart, Video, Calendar, DollarSign, Users, Link as LinkIcon, Award, Send, Bell, User, Settings, LogOut } from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const currentUser = useAppStore(s => s.currentUser);
  const logout = useAppStore(s => s.logout);

  const groups = [
    {
      title: "Operações",
      links: [
        { href: "/dashboard/signals", label: "Sinais M1", icon: Activity },
        { href: "/dashboard/history", label: "Histórico", icon: History },
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
        { href: "/dashboard/heatmap", label: "Heatmap", icon: Map },
        { href: "/dashboard/backtesting", label: "Backtesting", icon: Beaker },
        { href: "/dashboard/scoreboard", label: "Placar", icon: Trophy },
      ]
    },
    {
      title: "Gestão",
      links: [
        { href: "/dashboard/diary", label: "Diário", icon: BookOpen },
        { href: "/dashboard/bank", label: "Banca", icon: Wallet },
        { href: "/dashboard/goals", label: "Metas", icon: Goal },
        { href: "/dashboard/risk", label: "Calculadora Risco", icon: ShieldAlert },
      ]
    },
    {
      title: "Relatórios",
      links: [
        { href: "/dashboard/reports", label: "Exportação", icon: PieChart },
        { href: "/dashboard/projector", label: "Projetor", icon: Video },
        { href: "/dashboard/calendar", label: "Calendário", icon: Calendar },
      ]
    },
    {
      title: "Sistema",
      links: [
        { href: "/dashboard/leaderboard", label: "Ranking", icon: Award },
        { href: "/dashboard/strategies", label: "Estratégias", icon: BookOpen },
        { href: "/dashboard/achievements", label: "Conquistas", icon: Trophy },
        { href: "/dashboard/telegram", label: "Telegram", icon: Send },
        { href: "/dashboard/notifications", label: "Notificações", icon: Bell },
        { href: "/dashboard/profile", label: "Perfil", icon: User },
        { href: "/dashboard/settings", label: "Configurações", icon: Settings },
      ]
    }
  ];

  if (currentUser?.role === 'admin' || currentUser?.role === 'financeiro' || currentUser?.role === 'gerente') {
    groups.push({
      title: "Administração",
      links: [
        { href: "/dashboard/revenue", label: "Receita & Planos", icon: DollarSign },
        { href: "/dashboard/team", label: "Equipe", icon: Users },
        { href: "/dashboard/affiliates", label: "Afiliados", icon: LinkIcon },
        { href: "/dashboard/admin", label: "Painel Admin", icon: Settings },
      ].filter(l => {
        if (currentUser.role === 'financeiro' && l.label !== 'Receita & Planos') return false;
        if (currentUser.role === 'gerente' && l.label === 'Painel Admin') return false;
        return true;
      })
    });
  }

  return (
    <aside className="w-64 border-r border-white/10 bg-[var(--bg-1)] hidden md:flex flex-col h-full">
      <div className="p-4 flex items-center gap-2 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded bg-[var(--green)] text-black font-bold flex items-center justify-center animate-signal-pulse">S</div>
        <span className="font-bold text-lg truncate">SignalMaster Pro</span>
      </div>

      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--purple)] to-[var(--blue)] flex items-center justify-center font-bold">
            {currentUser?.user.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="font-medium truncate">{currentUser?.user}</div>
            <div className="text-xs text-[var(--green)] uppercase font-bold tracking-wider">{currentUser?.plan}</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
        {groups.map((g, i) => (
          <div key={i}>
            <div className="text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest">{g.title}</div>
            <div className="space-y-1">
              {g.links.map(link => {
                const Icon = link.icon;
                const active = location === link.href;
                return (
                  <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${active ? "bg-[var(--green)]/10 text-[var(--green)] font-bold border border-[var(--green)]/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                    <Icon size={16} className={active ? "text-[var(--green)]" : "text-gray-500"} />
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2 w-full text-left text-[var(--red)] hover:bg-[var(--red)]/10 rounded-lg transition-colors text-sm font-medium">
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
