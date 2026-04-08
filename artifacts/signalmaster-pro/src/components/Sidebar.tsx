import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAppStore } from "@/lib/store";
import {
  Activity, History, BarChart2, Map, Beaker, Trophy, BookOpen, Goal,
  ShieldAlert, Wallet, PieChart, Video, Calendar, DollarSign, Users,
  Link as LinkIcon, Award, Send, Bell, User, Settings, LogOut, Home,
  Menu, X, ChevronDown, ChevronRight, Brain, RadioTower, ChevronDown as ChevDown, Crown, Sparkles, LibraryBig
} from "lucide-react";
import { getCurrentSession } from "@/lib/signalEngine";
import { useAccountMode, KNOWN_BROKERS } from "@/lib/useAccountMode";

const SESSION_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  london: { label: 'Londres', emoji: '🇬🇧', color: 'text-blue-400' },
  overlap: { label: 'Overlap', emoji: '🌍', color: 'text-[var(--green)]' },
  ny: { label: 'Nova York', emoji: '🇺🇸', color: 'text-purple-400' },
  asia: { label: 'Ásia', emoji: '🌏', color: 'text-yellow-400' },
};

const AVATAR_COLORS = [
  'from-[var(--green)] to-[var(--blue)]',
  'from-purple-500 to-pink-500',
  'from-orange-500 to-red-500',
  'from-cyan-500 to-blue-500',
  'from-yellow-500 to-orange-500',
];

export function Sidebar() {
  const [location] = useLocation();
  const currentUser = useAppStore(s => s.currentUser);
  const logout = useAppStore(s => s.logout);
  const [time, setTime] = useState(new Date());
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    try {
      const notifs = JSON.parse(localStorage.getItem('smpNotif7') || '[]');
      setUnreadNotifs(notifs.filter((n: any) => !n.read).length);
    } catch {}
  }, [location]);

  useEffect(() => { setMobileOpen(false); }, [location]);

  const sess = getCurrentSession();
  const sessInfo = SESSION_INFO[sess] || { label: 'Off', emoji: '🌙', color: 'text-gray-500' };

  const todayStats = (() => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const today = new Date().toDateString();
      const todayH = hist.filter((h: any) => new Date(h.ts).toDateString() === today);
      const w = todayH.filter((h: any) => h.result === 'win').length;
      const l = todayH.filter((h: any) => h.result === 'loss').length;
      const wr = w + l > 0 ? Math.round((w / (w + l)) * 100) : null;
      return { w, l, wr };
    } catch { return { w: 0, l: 0, wr: null }; }
  })();

  const streak = (() => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      if (!hist.length) return 0;
      let s = hist[hist.length - 1].result === 'win' ? 1 : -1;
      for (let i = hist.length - 2; i >= 0; i--) {
        if (hist[i].result === 'win' && s > 0) s++;
        else if (hist[i].result === 'loss' && s < 0) s--;
        else break;
      }
      return s;
    } catch { return 0; }
  })();

  const initial = (currentUser?.name || currentUser?.user || 'U')[0].toUpperCase();
  const avatarColor = parseInt(localStorage.getItem('smpAvatarColor') || '0');

  const toggleGroup = (title: string) => {
    setCollapsed(p => ({ ...p, [title]: !p[title] }));
  };

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'financeiro' || currentUser?.role === 'gerente';
  const { mode, isReal, broker, setMode, setBroker } = useAccountMode();
  const [brokerOpen, setBrokerOpen] = useState(false);

  const groups = [
    {
      title: "Operações",
      links: [
        { href: "/dashboard", label: "Overview", icon: Home },
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
        { href: "/dashboard/risk", label: "Risco", icon: ShieldAlert },
        { href: "/dashboard/calendar", label: "Calendário", icon: Calendar },
      ]
    },
    {
      title: "Ferramentas",
      links: [
        { href: "/dashboard/reports", label: "Relatórios", icon: PieChart },
        { href: "/dashboard/strategies", label: "Estratégias", icon: Brain },
        { href: "/dashboard/leaderboard", label: "Ranking", icon: Award },
        { href: "/dashboard/achievements", label: "Conquistas", icon: Trophy },
        { href: "/dashboard/projector", label: "Projetor", icon: Video },
      ]
    },
    {
      title: "Aprendizado",
      links: [
        { href: "/dashboard/luna-analyses", label: "Análises com Luna", icon: LibraryBig },
      ]
    },
    {
      title: "Conta",
      links: [
        {
          href: "/dashboard/notifications",
          label: "Notificações",
          icon: Bell,
          badge: unreadNotifs > 0 ? unreadNotifs : undefined
        },
        { href: "/dashboard/profile", label: "Perfil", icon: User },
        { href: "/dashboard/settings", label: "Configurações", icon: Settings },
      ]
    }
  ];

  if (isStaff) {
    const adminLinks = [
      { href: "/dashboard/telegram", label: "Telegram Bot", icon: Send },
      { href: "/dashboard/revenue", label: "Receita", icon: DollarSign },
      { href: "/dashboard/team", label: "Equipe", icon: Users },
      { href: "/dashboard/affiliates", label: "Afiliados", icon: LinkIcon },
      { href: "/dashboard/admin", label: "Painel Admin", icon: Settings },
      { href: "/dashboard/plans", label: "Planos & Assinatura", icon: Crown },
    ].filter(l => {
      if (currentUser?.role === 'financeiro') return l.label === 'Receita';
      if (currentUser?.role === 'gerente') return l.label !== 'Painel Admin';
      return true;
    });
    groups.push({ title: "Admin", links: adminLinks as any });
  }

  // Build nav JSX as a plain variable (not a child component) to prevent scroll reset on re-render
  const navJsx = (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
      {groups.map((g) => {
        const isCollapsed = collapsed[g.title];
        return (
          <div key={g.title} className="mb-1">
            <button
              onClick={() => toggleGroup(g.title)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-gray-400 transition"
            >
              {g.title}
              {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5">
                {g.links.map((link: any) => {
                  const Icon = link.icon;
                  const active = location === link.href || (link.href === '/dashboard' && location === '/dashboard/home');
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition text-sm group relative ${
                        active
                          ? 'bg-[var(--green)]/10 text-[var(--green)] font-bold border border-[var(--green)]/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={15} className={active ? 'text-[var(--green)]' : 'text-gray-500 group-hover:text-gray-300 transition'} />
                      <span className="truncate flex-1">{link.label}</span>
                      {link.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[var(--red)] text-white rounded-full min-w-[18px] text-center">
                          {link.badge > 9 ? '9+' : link.badge}
                        </span>
                      )}
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[var(--green)] rounded-r-full" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const headerJsx = (showClose = false) => (
    <>
      <div className="p-4 flex items-center gap-2.5 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--green)] text-black font-black flex items-center justify-center animate-signal-pulse text-sm">S</div>
        <div>
          <div className="font-bold text-sm leading-tight">SignalMaster Pro</div>
          <div className="text-[10px] text-[var(--green)] font-bold tracking-wider">v7 ULTIMATE</div>
        </div>
        {showClose && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 text-gray-500 hover:text-white transition">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[avatarColor]} flex items-center justify-center font-black text-white shrink-0`}>
            {initial}
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-sm truncate">{currentUser?.name || currentUser?.user}</div>
            <div className={`text-[10px] font-bold tracking-wider uppercase ${
              currentUser?.plan === 'premium' ? 'text-[var(--gold)]' :
              currentUser?.plan === 'pro' ? 'text-[var(--blue)]' : 'text-[var(--green)]'
            }`}>
              {currentUser?.plan === 'premium' ? '💎' : currentUser?.plan === 'pro' ? '🔥' : '📦'} {currentUser?.plan}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-white/5 rounded-lg p-1.5">
            <div className="text-[10px] text-gray-600">Hoje</div>
            <div className="text-xs font-bold">
              <span className="text-[var(--green)]">{todayStats.w}W</span>
              <span className="text-gray-600 mx-0.5">/</span>
              <span className="text-[var(--red)]">{todayStats.l}L</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-1.5">
            <div className="text-[10px] text-gray-600">WR</div>
            <div className={`text-xs font-bold ${todayStats.wr !== null && todayStats.wr >= 65 ? 'text-[var(--green)]' : 'text-gray-400'}`}>
              {todayStats.wr !== null ? `${todayStats.wr}%` : '—'}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-1.5">
            <div className="text-[10px] text-gray-600">Streak</div>
            <div className={`text-xs font-bold ${streak > 0 ? 'text-orange-400' : streak < 0 ? 'text-[var(--red)]' : 'text-gray-500'}`}>
              {streak !== 0 ? `${Math.abs(streak)}${streak > 0 ? '🔥' : '❄️'}` : '—'}
            </div>
          </div>
        </div>

        {/* ── Real / Demo toggle ── */}
        <div className="mt-3 space-y-2">
          {/* Mode toggle pill */}
          <div className="flex rounded-xl overflow-hidden border border-white/8 text-[11px] font-black">
            <button
              onClick={() => setMode('demo')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-all ${
                !isReal
                  ? 'bg-blue-500/20 text-blue-300 border-r border-blue-500/20'
                  : 'text-gray-600 hover:text-gray-400 border-r border-white/8'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              DEMO
            </button>
            <button
              onClick={() => setMode('real')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-all ${
                isReal
                  ? 'bg-red-500/20 text-red-300'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-current ${isReal ? 'animate-pulse' : ''}`} />
              REAL
            </button>
          </div>

          {/* Broker selector */}
          <div className="relative">
            <button
              onClick={() => setBrokerOpen(p => !p)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/8 transition text-[10px] text-gray-400"
            >
              <RadioTower size={10} className="text-gray-600 shrink-0" />
              <span className="flex-1 text-left truncate font-semibold">{broker}</span>
              <ChevDown size={9} className={`text-gray-600 transition-transform ${brokerOpen ? 'rotate-180' : ''}`} />
            </button>
            {brokerOpen && (
              <div className="absolute bottom-full mb-1 left-0 right-0 z-50 rounded-xl border border-white/10 overflow-hidden shadow-2xl"
                style={{ background: 'rgba(10,10,20,0.98)', backdropFilter: 'blur(20px)' }}>
                {KNOWN_BROKERS.map(b => (
                  <button
                    key={b}
                    onClick={() => { setBroker(b); setBrokerOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition hover:bg-white/5 ${
                      broker === b ? 'text-[var(--green)] font-bold' : 'text-gray-400'
                    }`}
                  >
                    {broker === b && <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />}
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const footerJsx = (
    <div className="p-3 border-t border-white/10 space-y-2 shrink-0">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm ${sessInfo.color}`}>
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span className="text-xs font-bold">{sessInfo.emoji} {sessInfo.label}</span>
        <span className="ml-auto text-xs text-gray-500 font-mono tabular-nums">
          {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2 w-full text-left text-gray-500 hover:text-[var(--red)] hover:bg-[var(--red)]/5 rounded-lg transition text-sm"
      >
        <LogOut size={15} />
        Sair da conta
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-60 border-r border-white/10 bg-[var(--bg-1)] hidden md:flex flex-col h-full shrink-0">
        {headerJsx(false)}
        {navJsx}
        {footerJsx}
      </aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[var(--bg-1)] border border-white/10 rounded-lg text-white shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-72 z-50 bg-[var(--bg-1)] border-r border-white/10 flex flex-col overflow-hidden shadow-2xl">
            {headerJsx(true)}
            {navJsx}
            {footerJsx}
          </aside>
        </>
      )}
    </>
  );
}
