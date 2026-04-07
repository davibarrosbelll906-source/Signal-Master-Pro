import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Redirect } from "wouter";
import { Users, Shield, Mail, Activity } from "lucide-react";

interface TeamUser {
  user: string;
  name?: string;
  email?: string;
  role: string;
  plan: string;
  active?: boolean;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin', color: 'text-white', bg: 'bg-white/20' },
  gerente: { label: 'Gerente', color: 'text-[var(--blue)]', bg: 'bg-[var(--blue)]/20' },
  suporte: { label: 'Suporte', color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/20' },
  analista: { label: 'Analista', color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
  moderador: { label: 'Moderador', color: 'text-purple-400', bg: 'bg-purple-400/20' },
  financeiro: { label: 'Financeiro', color: 'text-orange-400', bg: 'bg-orange-400/20' },
  user: { label: 'Usuário', color: 'text-gray-400', bg: 'bg-gray-400/20' },
};

const STAFF_ROLES = ['admin', 'gerente', 'suporte', 'analista', 'moderador', 'financeiro'];

export default function TeamPage() {
  const currentUser = useAppStore(s => s.currentUser);
  const [team, setTeam] = useState<TeamUser[]>([]);

  useEffect(() => {
    try {
      const users: TeamUser[] = JSON.parse(localStorage.getItem('smpU7') || '[]');
      setTeam(users.filter(u => STAFF_ROLES.includes(u.role)));
    } catch {}
  }, []);

  if (currentUser?.role === 'user') {
    return <Redirect to="/dashboard/signals" />;
  }

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'gerente';
  const roleGroups = STAFF_ROLES.filter(r => team.some(t => t.role === r));

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-[var(--blue)]" /> Equipe
        </h1>
        {canManage && (
          <button
            onClick={() => window.location.href = '/dashboard/admin'}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-black font-bold rounded-lg hover:opacity-90 transition text-sm"
          >
            Gerenciar no Admin
          </button>
        )}
      </div>

      {/* Team stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Total Equipe</div>
          <div className="text-2xl font-black text-white">{team.length}</div>
        </div>
        {STAFF_ROLES.slice(0, 3).map(role => (
          <div key={role} className="glass-card p-4 text-center">
            <div className="text-xs text-gray-500 mb-1 capitalize">{ROLE_CONFIG[role]?.label}</div>
            <div className={`text-2xl font-black ${ROLE_CONFIG[role]?.color}`}>{team.filter(t => t.role === role).length}</div>
          </div>
        ))}
      </div>

      {/* Team grid */}
      {team.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Users size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum membro da equipe encontrado</p>
          <p className="text-gray-600 text-sm mt-1">Adicione membros no painel de Admin.</p>
        </div>
      ) : (
        roleGroups.map(role => (
          <div key={role}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border border-white/10 ${ROLE_CONFIG[role]?.bg} ${ROLE_CONFIG[role]?.color}`}>
                {ROLE_CONFIG[role]?.label}
              </div>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {team.filter(t => t.role === role).map((m, i) => (
                <div key={i} className="glass-card p-5 text-center group hover:border-white/20 transition">
                  <div className={`w-16 h-16 mx-auto rounded-2xl ${ROLE_CONFIG[role]?.bg} flex items-center justify-center text-2xl font-black ${ROLE_CONFIG[role]?.color} mb-3`}>
                    {(m.name || m.user)[0].toUpperCase()}
                  </div>
                  <div className="font-bold text-white text-sm mb-0.5 truncate">{m.name || m.user}</div>
                  <div className="text-xs text-gray-500 mb-3 truncate">@{m.user}</div>

                  {m.email && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-600 mb-2">
                      <Mail size={10} /> <span className="truncate">{m.email}</span>
                    </div>
                  )}

                  <div className="flex justify-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 ${ROLE_CONFIG[role]?.bg} ${ROLE_CONFIG[role]?.color}`}>
                      {ROLE_CONFIG[role]?.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 bg-white/5 ${m.plan === 'premium' ? 'text-yellow-400' : m.plan === 'pro' ? 'text-[var(--blue)]' : 'text-gray-500'}`}>
                      {m.plan?.toUpperCase()}
                    </span>
                  </div>

                  {m.user === currentUser?.user && (
                    <div className="mt-2 text-[9px] text-[var(--blue)] font-bold">← você</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="glass-card p-4 flex items-start gap-3 border border-[var(--blue)]/15">
        <Shield size={14} className="text-[var(--blue)] mt-0.5 shrink-0" />
        <p className="text-xs text-gray-500">Esta página mostra apenas membros da equipe (staff). Usuários comuns são gerenciados pelo painel de Admin. Acesso baseado em função: apenas Admin e Gerente podem ver todos os usuários.</p>
      </div>
    </div>
  );
}
