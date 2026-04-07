import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  Activity, BarChart2, TrendingUp, TrendingDown, Zap, Target, Trophy, Clock,
  BookOpen, ShieldCheck, Calendar, Award, ChevronRight, Flame, Brain, Star
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

interface HistEntry {
  ts: number;
  result: 'win' | 'loss';
  asset?: string;
  category?: string;
  score?: number;
}

function StatCard({ label, value, sub, color = 'text-white', icon: Icon, href }: {
  label: string; value: string | number; sub?: string; color?: string;
  icon: React.ComponentType<any>; href?: string;
}) {
  const content = (
    <div className="glass-card p-5 hover:border-white/20 transition group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <Icon size={14} className="text-gray-600 group-hover:text-gray-400 transition" />
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        <Tooltip
          contentStyle={{ background: '#13131a', border: 'none', borderRadius: '8px', fontSize: '11px', padding: '4px 8px' }}
          formatter={(v: any) => [`${v}%`, 'WR']}
          labelFormatter={() => ''}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function DashboardHomePage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [hist, setHist] = useState<HistEntry[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    try { setHist(JSON.parse(localStorage.getItem('smpH7') || '[]')); } catch {}
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Stats
  const today = new Date().toDateString();
  const todayHist = hist.filter(h => new Date(h.ts).toDateString() === today);
  const todayW = todayHist.filter(h => h.result === 'win').length;
  const todayL = todayHist.filter(h => h.result === 'loss').length;
  const todayTotal = todayW + todayL;
  const todayWR = todayTotal > 0 ? Math.round((todayW / todayTotal) * 100) : 0;

  const totalOps = hist.length;
  const totalWins = hist.filter(h => h.result === 'win').length;
  const globalWR = totalOps > 0 ? Math.round((totalWins / totalOps) * 100) : 0;

  // Current streak
  let streak = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (i === hist.length - 1) { streak = hist[i].result === 'win' ? 1 : -1; }
    else if (hist[i].result === 'win' && streak > 0) streak++;
    else if (hist[i].result === 'loss' && streak < 0) streak--;
    else break;
  }

  // Max streak
  let curStr = 0, maxStreak = 0;
  hist.sort((a, b) => a.ts - b.ts).forEach(h => {
    if (h.result === 'win') { maxStreak = Math.max(maxStreak, ++curStr); } else curStr = 0;
  });

  // Weekly WR sparkline (last 7 days)
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const dayHist = hist.filter(h => new Date(h.ts).toDateString() === dayStr);
    const w = dayHist.filter(h => h.result === 'win').length;
    return dayHist.length > 0 ? Math.round((w / dayHist.length) * 100) : 0;
  });

  // Best asset
  const assetCount: Record<string, { w: number; t: number }> = {};
  hist.forEach(h => {
    if (h.asset) {
      if (!assetCount[h.asset]) assetCount[h.asset] = { w: 0, t: 0 };
      assetCount[h.asset].t++;
      if (h.result === 'win') assetCount[h.asset].w++;
    }
  });
  const bestAsset = Object.entries(assetCount)
    .filter(([, d]) => d.t >= 5)
    .sort(([, a], [, b]) => (b.w / b.t) - (a.w / a.t))[0];

  // Recent history (last 10)
  const recent = [...hist].sort((a, b) => b.ts - a.ts).slice(0, 8);

  // Goals progress
  const goals: any[] = [];
  try { goals.push(...JSON.parse(localStorage.getItem('smpGoals7') || '[]').slice(0, 3)); } catch {}

  // Achievements
  const ach: any[] = [];
  try { ach.push(...JSON.parse(localStorage.getItem('smpAchievements7') || '[]').filter((a: any) => a.done).slice(0, 3)); } catch {}

  const hour = time.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const name = currentUser?.name || currentUser?.user || 'Trader';

  const sessionHour = time.getUTCHours() + time.getTimezoneOffset() / 60;
  const sessName =
    (time.getUTCHours() >= 8 && time.getUTCHours() < 9) ? '🌍 Abertura Overlap' :
    (time.getUTCHours() >= 9 && time.getUTCHours() < 13) ? '🇬🇧 Londres + Nova York' :
    (time.getUTCHours() >= 13 && time.getUTCHours() < 17) ? '🇺🇸 Nova York' :
    (time.getUTCHours() >= 0 && time.getUTCHours() < 4) ? '🌏 Ásia' : '🌙 Off-market';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-white">
            {greeting}, <span className="text-[var(--green)]">{name.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · {time.toLocaleTimeString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="glass-card px-4 py-2 text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="text-gray-400">{sessName}</span>
          </div>
          <Link href="/dashboard/signals">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg hover:opacity-90 transition text-sm">
              <Zap size={14} /> Ver Sinais Ao Vivo
            </div>
          </Link>
        </div>
      </motion.div>

      {/* Key stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard
            label="Hoje" icon={Activity}
            value={todayTotal > 0 ? `${todayW}W / ${todayL}L` : '— sem ops'}
            sub={todayTotal > 0 ? `${todayWR}% win rate` : 'Abra os sinais e comece!'}
            color={todayWR >= 65 ? 'text-[var(--green)]' : todayWR > 0 ? 'text-yellow-400' : 'text-gray-400'}
            href="/dashboard/signals"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard
            label="Win Rate Global" icon={TrendingUp}
            value={totalOps > 0 ? `${globalWR}%` : '—'}
            sub={`${totalOps} operações total`}
            color={globalWR >= 65 ? 'text-[var(--green)]' : globalWR >= 50 ? 'text-yellow-400' : 'text-gray-500'}
            href="/dashboard/analytics"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard
            label="Sequência Atual" icon={Flame}
            value={streak !== 0 ? `${Math.abs(streak)}${streak > 0 ? ' 🔥' : ' ❄️'}` : '—'}
            sub={streak > 0 ? 'wins consecutivos' : streak < 0 ? 'losses consecutivos' : 'sem histórico'}
            color={streak > 0 ? 'text-orange-400' : streak < 0 ? 'text-[var(--red)]' : 'text-gray-400'}
            href="/dashboard/history"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard
            label="Melhor Ativo" icon={Star}
            value={bestAsset ? bestAsset[0] : '—'}
            sub={bestAsset ? `${Math.round((bestAsset[1].w / bestAsset[1].t) * 100)}% WR · ${bestAsset[1].t} ops` : 'mínimo 5 ops'}
            color="text-[var(--gold)]"
            href="/dashboard/scoreboard"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Weekly sparkline */}
        <div className="lg:col-span-2 space-y-4">

          {/* 7-day WR trend */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <BarChart2 size={16} className="text-[var(--blue)]" /> Win Rate — 7 Dias
              </h3>
              <Link href="/dashboard/analytics" className="text-xs text-[var(--blue)] hover:text-white transition flex items-center gap-1">
                Ver mais <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex items-end gap-3 mb-2">
              <div className={`text-3xl font-black ${globalWR >= 65 ? 'text-[var(--green)]' : 'text-yellow-400'}`}>{globalWR}%</div>
              <div className="text-xs text-gray-500 mb-1">win rate histórico</div>
            </div>
            <MiniSparkline data={weekData} color={globalWR >= 65 ? '#00ff88' : '#ffd700'} />
            <div className="flex justify-between mt-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => {
                const dt = new Date(); dt.setDate(dt.getDate() - (6 - i));
                const isToday = dt.toDateString() === today;
                return (
                  <span key={d} className={`text-[9px] ${isToday ? 'text-white font-bold' : 'text-gray-600'}`}>{d}</span>
                );
              })}
            </div>
          </div>

          {/* Recent history */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-[var(--green)]" /> Últimas Operações
              </h3>
              <Link href="/dashboard/history" className="text-xs text-[var(--green)] hover:text-white transition flex items-center gap-1">
                Ver histórico <ChevronRight size={12} />
              </Link>
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">
                Nenhuma operação ainda. <Link href="/dashboard/signals" className="text-[var(--green)] hover:underline">Comece agora →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition ${
                      h.result === 'win'
                        ? 'bg-[var(--green)]/5 border-[var(--green)]/15'
                        : 'bg-[var(--red)]/5 border-[var(--red)]/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${h.result === 'win' ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--red)]/20 text-[var(--red)]'}`}>
                        {h.result === 'win' ? 'W' : 'L'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{h.asset || '—'}</div>
                        <div className="text-xs text-gray-600">{new Date(h.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {h.score && <div className="text-xs text-gray-500">{h.score}% score</div>}
                      <div className="text-xs text-gray-600 capitalize">{h.category}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick links */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Acesso Rápido</h3>
            <div className="space-y-1">
              {[
                { href: '/dashboard/signals', label: 'Sinais M1', icon: Activity, color: 'text-[var(--green)]' },
                { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2, color: 'text-[var(--blue)]' },
                { href: '/dashboard/backtesting', label: 'Backtesting', icon: Brain, color: 'text-purple-400' },
                { href: '/dashboard/risk', label: 'Calculadora de Risco', icon: ShieldCheck, color: 'text-yellow-400' },
                { href: '/dashboard/leaderboard', label: 'Ranking Global', icon: Award, color: 'text-[var(--gold)]' },
                { href: '/dashboard/strategies', label: 'Estratégias', icon: BookOpen, color: 'text-teal-400' },
                { href: '/dashboard/calendar', label: 'Calendário', icon: Calendar, color: 'text-pink-400' },
              ].map(({ href, label, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition group"
                >
                  <Icon size={14} className={`${color} group-hover:scale-110 transition-transform`} />
                  <span className="text-sm text-gray-400 group-hover:text-white transition">{label}</span>
                  <ChevronRight size={12} className="text-gray-700 group-hover:text-gray-400 ml-auto transition" />
                </Link>
              ))}
            </div>
          </div>

          {/* Goals quick view */}
          {goals.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={11} /> Metas
                </h3>
                <Link href="/dashboard/goals" className="text-[10px] text-[var(--green)] hover:text-white transition">ver todas →</Link>
              </div>
              <div className="space-y-2.5">
                {goals.map((g, i) => {
                  const now2 = Date.now();
                  const cutoffs: Record<string, number> = { daily: 86400000, weekly: 7 * 86400000, monthly: 30 * 86400000, total: Infinity };
                  const cut = now2 - (cutoffs[g.period] || Infinity);
                  const rel = hist.filter(h => h.ts > cut);
                  const w = rel.filter(h => h.result === 'win').length;
                  const current = g.type === 'winRate' ? (rel.length > 0 ? Math.round((w / rel.length) * 100) : 0) : g.type === 'wins' ? w : rel.length;
                  const pct = Math.min(100, (current / g.target) * 100);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{g.emoji} {g.title}</span>
                        <span className={`font-bold ${pct >= 100 ? 'text-[var(--green)]' : 'text-gray-400'}`}>{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : pct >= 75 ? 'var(--blue)' : '#ffd700' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tip card */}
          <div className="glass-card p-5 border border-[var(--blue)]/20 bg-[var(--blue)]/3">
            <div className="text-xs font-bold text-[var(--blue)] mb-2 flex items-center gap-1.5">
              <Brain size={12} /> Dica do Sistema
            </div>
            {totalOps === 0 ? (
              <p className="text-xs text-gray-400 leading-relaxed">
                Bem-vindo! 🎯 Comece abrindo a página de <strong className="text-white">Sinais</strong> e aguarde o sinal no segundo 48 de cada minuto. Registre WIN ou LOSS para o sistema aprender seu perfil.
              </p>
            ) : globalWR >= 70 ? (
              <p className="text-xs text-gray-400 leading-relaxed">
                ✅ Excelente! Com <strong className="text-[var(--green)]">{globalWR}%</strong> de win rate, você está acima da média dos traders. Mantenha a disciplina e o gerenciamento de risco.
              </p>
            ) : globalWR >= 55 ? (
              <p className="text-xs text-gray-400 leading-relaxed">
                📊 WR de <strong className="text-yellow-400">{globalWR}%</strong>. Analise o <strong className="text-white">Heatmap</strong> para descobrir os melhores horários e evite operar fora deles.
              </p>
            ) : (
              <p className="text-xs text-gray-400 leading-relaxed">
                ⚠️ WR abaixo de 55%. Considere usar apenas sinais <strong className="text-white">FORTE</strong> e <strong className="text-[var(--gold)]">PREMIUM</strong> (≥74%) e revise sua Calculadora de Risco.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
