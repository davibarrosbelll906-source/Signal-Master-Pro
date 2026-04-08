import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, Target, ShieldAlert, ChevronDown, ChevronUp, Percent, RotateCcw, AlertTriangle } from "lucide-react";
import { useAccountMode } from "@/lib/useAccountMode";

interface MgmtConfig {
  banca: number;
  entrada: number;
  entradaPct: boolean;
  payout: number;
  metaWins: number;
  stopLosses: number;
}

const DEFAULT_CFG: MgmtConfig = { banca: 500, entrada: 25, entradaPct: false, payout: 95, metaWins: 5, stopLosses: 3 };

interface NotifOverlayProps {
  type: 'goal' | 'stop';
  onClose: () => void;
}

function NotifOverlay({ type, onClose }: NotifOverlayProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 15000);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(10px)', background: type === 'goal' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,102,0.08)' }}
    >
      <motion.div
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 18 }}
        className={`glass-card max-w-sm w-full p-8 text-center relative overflow-hidden border ${
          type === 'goal' ? 'border-[var(--green)]/40 shadow-[0_0_80px_rgba(0,255,136,0.2)]' : 'border-[var(--red)]/40 shadow-[0_0_80px_rgba(255,68,102,0.2)]'
        }`}
      >
        {/* Animated glow ring */}
        <div className={`absolute inset-0 rounded-2xl pointer-events-none ${type === 'goal' ? 'bg-[var(--green)]/5' : 'bg-[var(--red)]/5'}`} />

        {type === 'goal' ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: 4, duration: 0.5 }}
              className="text-7xl mb-4"
            >🏆</motion.div>
            <h2 className="text-2xl font-black text-[var(--green)] mb-2">Parabéns!</h2>
            <h3 className="text-lg font-bold text-white mb-3">Você bateu sua Meta Diária!</h3>
            <p className="text-gray-400 text-sm mb-6">
              Excelente disciplina! Você atingiu seu objetivo de operações do dia.<br />
              <span className="text-[var(--green)] font-semibold">Proteja seus lucros — pare por hoje! 🎉</span>
            </p>
            <div className="grid grid-cols-3 gap-2 mb-6 text-center">
              {['🌟', '🌟', '🌟'].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>
                  <div className="text-2xl mb-1">{s}</div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-7xl mb-4"
            >🛑</motion.div>
            <h2 className="text-2xl font-black text-[var(--red)] mb-2">Stop Loss Atingido</h2>
            <h3 className="text-lg font-bold text-white mb-3">Você atingiu seu Stop Diário!</h3>
            <p className="text-gray-400 text-sm mb-6">
              A gestão de risco é a base do sucesso.<br />
              <span className="text-[var(--red)] font-semibold">Encerre as operações e volte amanhã! 💪</span>
            </p>
            <div className="p-3 rounded-xl bg-[var(--red)]/10 border border-[var(--red)]/20 text-sm text-[var(--red)] mb-6">
              Operar além do stop pode comprometer toda a banca. Seja disciplinado.
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
            type === 'goal'
              ? 'bg-[var(--green)] text-black hover:opacity-90'
              : 'bg-[var(--red)]/20 text-[var(--red)] border border-[var(--red)]/30 hover:bg-[var(--red)]/30'
          }`}
        >
          {type === 'goal' ? '✅ Fechar e Encerrar o Dia' : '🛑 Entendido, Vou Parar'}
        </button>

        <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 transition-all">
          <X size={14} />
        </button>
      </motion.div>
    </motion.div>
  );
}

interface Props {
  wins: number;
  losses: number;
  onResult?: (type: 'win' | 'loss') => void;
}

export default function ManagementPanel({ wins, losses, onResult }: Props) {
  const { isReal, mode, broker } = useAccountMode();
  const [cfg, setCfg] = useState<MgmtConfig>(() => {
    try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem('smpMgmt7') || '{}') }; } catch { return DEFAULT_CFG; }
  });
  const [editing, setEditing] = useState(false);
  const [notif, setNotif] = useState<'goal' | 'stop' | null>(null);
  const [goalFired, setGoalFired] = useState(false);
  const [stopFired, setStopFired] = useState(false);
  const prevWins = useRef(wins);
  const prevLosses = useRef(losses);

  const saveCfg = (next: MgmtConfig) => {
    setCfg(next);
    localStorage.setItem('smpMgmt7', JSON.stringify(next));
  };

  // Fire notifications when thresholds are crossed
  useEffect(() => {
    if (wins !== prevWins.current) {
      prevWins.current = wins;
      if (!goalFired && wins >= cfg.metaWins) {
        setNotif('goal');
        setGoalFired(true);
      }
    }
  }, [wins, cfg.metaWins]);

  useEffect(() => {
    if (losses !== prevLosses.current) {
      prevLosses.current = losses;
      if (!stopFired && losses >= cfg.stopLosses) {
        setNotif('stop');
        setStopFired(true);
      }
    }
  }, [losses, cfg.stopLosses]);

  // Reset fired flags at midnight
  useEffect(() => {
    const check = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        setGoalFired(false);
        setStopFired(false);
      }
    };
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const [btnFlash, setBtnFlash] = useState<'win' | 'loss' | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleManualResult = useCallback((type: 'win' | 'loss') => {
    // Save a simplified entry to history
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const entR = cfg.entradaPct ? (cfg.banca * cfg.entrada) / 100 : cfg.entrada;
      hist.push({
        id: Date.now(),
        ts: Date.now(),
        asset: 'MANUAL',
        direction: type === 'win' ? 'CALL' : 'PUT',
        score: 0,
        quality: '—',
        result: type,
        category: 'forex',
        sess: (() => {
          const h = new Date().getUTCHours();
          if (h >= 6 && h < 12) return 'londres';
          if (h >= 12 && h < 17) return 'ny';
          return 'asia';
        })(),
        entrada: entR,
        manual: true,
      });
      localStorage.setItem('smpH7', JSON.stringify(hist));
    } catch {}
    setBtnFlash(type);
    setTimeout(() => setBtnFlash(null), 800);
    onResult?.(type);
  }, [cfg, onResult]);

  const handleResetDay = useCallback(() => {
    try {
      const hist = JSON.parse(localStorage.getItem('smpH7') || '[]');
      const today = new Date().toDateString();
      const filtered = hist.filter((h: any) => new Date(h.ts).toDateString() !== today);
      localStorage.setItem('smpH7', JSON.stringify(filtered));
    } catch {}
    setShowResetConfirm(false);
    onResult?.('win'); // trigger refresh
  }, [onResult]);

  const entradaR = cfg.entradaPct ? (cfg.banca * cfg.entrada) / 100 : cfg.entrada;
  const payoutR = entradaR * (cfg.payout / 100);
  const metaPnL = wins * payoutR - losses * entradaR;
  const potentialMeta = (cfg.metaWins - wins) * payoutR - losses * entradaR;
  const riskLeft = (cfg.stopLosses - losses) * entradaR;

  const goalPct = Math.min(100, (wins / cfg.metaWins) * 100);
  const stopPct = Math.min(100, (losses / cfg.stopLosses) * 100);
  const goalReached = wins >= cfg.metaWins;
  const stopReached = losses >= cfg.stopLosses;

  const inp = (key: keyof MgmtConfig, val: string | boolean) => {
    const next = { ...cfg };
    if (typeof val === 'boolean') {
      (next as any)[key] = val;
    } else {
      (next as any)[key] = parseFloat(val) || 0;
    }
    saveCfg(next);
  };

  return (
    <>
      <AnimatePresence>
        {notif && <NotifOverlay type={notif} onClose={() => setNotif(null)} />}
      </AnimatePresence>

      <div className="glass-card overflow-hidden">
        {/* Mode badge strip */}
        <div className={`px-4 py-1.5 flex items-center justify-between text-[10px] font-black border-b ${
          isReal
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-blue-500/8 border-blue-500/15 text-blue-400'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full bg-current ${isReal ? 'animate-pulse' : ''}`} />
            CONTA {mode.toUpperCase()}
          </div>
          <span className="text-gray-600 font-normal">{broker}</span>
        </div>

        {/* Header */}
        <button
          onClick={() => setEditing(v => !v)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/3 transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[var(--blue)]/15 flex items-center justify-center">
              <DollarSign size={12} className="text-[var(--blue)]" />
            </div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gestão de Banca</h3>
          </div>
          <div className="flex items-center gap-2">
            {(goalReached || stopReached) && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${goalReached ? 'text-[var(--green)] bg-[var(--green)]/10' : 'text-[var(--red)] bg-[var(--red)]/10'}`}>
                {goalReached ? 'META ✓' : 'STOP ✗'}
              </span>
            )}
            {editing ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
          </div>
        </button>

        {/* Low balance warning */}
        {cfg.banca > 0 && cfg.banca < entradaR * 3 && (
          <div className="mx-4 mb-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-orange-500/8 border border-orange-500/20 text-[10px] text-orange-400">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            <span>
              {cfg.banca < entradaR
                ? 'Banca insuficiente para operar! Adicione saldo.'
                : `Banca baixa — apenas ${Math.floor(cfg.banca / entradaR)} entrada${Math.floor(cfg.banca / entradaR) !== 1 ? 's' : ''} disponível${Math.floor(cfg.banca / entradaR) !== 1 ? 'is' : ''}.`
              }
            </span>
          </div>
        )}

        {/* Config fields (collapsible) */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5"
            >
              <div className="p-4 space-y-3">
                <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2">Configurar Parâmetros</div>
                {/* Banca */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Banca (R$)</label>
                    <input type="number" min={0} value={cfg.banca} onChange={e => inp('banca', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--green)]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Payout (%)</label>
                    <input type="number" min={50} max={100} value={cfg.payout} onChange={e => inp('payout', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--green)]/50" />
                  </div>
                </div>

                {/* Entrada */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-gray-500">Valor de Entrada</label>
                    <button
                      onClick={() => saveCfg({ ...cfg, entradaPct: !cfg.entradaPct })}
                      className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border transition ${cfg.entradaPct ? 'text-[var(--green)] border-[var(--green)]/30 bg-[var(--green)]/10' : 'text-gray-500 border-white/10 bg-white/5'}`}
                    >
                      <Percent size={9} /> {cfg.entradaPct ? '% Banca' : 'R$ Fixo'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} value={cfg.entrada} onChange={e => inp('entrada', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[var(--green)]/50" />
                    <span className="text-xs text-gray-500 shrink-0">
                      {cfg.entradaPct ? `= R$${entradaR.toFixed(2)}` : `${cfg.banca > 0 ? ((cfg.entrada / cfg.banca) * 100).toFixed(1) : 0}%`}
                    </span>
                  </div>
                </div>

                {/* Meta e Stop */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--green)]/70 mb-1 block flex items-center gap-1"><Target size={9} /> Meta (wins)</label>
                    <input type="number" min={1} max={50} value={cfg.metaWins} onChange={e => inp('metaWins', e.target.value)}
                      className="w-full bg-[var(--green)]/5 border border-[var(--green)]/20 rounded-lg px-2 py-1.5 text-xs text-[var(--green)] focus:outline-none focus:border-[var(--green)]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--red)]/70 mb-1 block flex items-center gap-1"><ShieldAlert size={9} /> Stop (losses)</label>
                    <input type="number" min={1} max={50} value={cfg.stopLosses} onChange={e => inp('stopLosses', e.target.value)}
                      className="w-full bg-[var(--red)]/5 border border-[var(--red)]/20 rounded-lg px-2 py-1.5 text-xs text-[var(--red)] focus:outline-none focus:border-[var(--red)]/50" />
                  </div>
                </div>

                <button
                  onClick={() => setEditing(false)}
                  className="w-full py-2 bg-[var(--green)]/10 text-[var(--green)] font-bold text-xs rounded-lg border border-[var(--green)]/20 hover:bg-[var(--green)]/20 transition"
                >
                  ✓ Salvar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bars */}
        <div className="px-4 pb-4 space-y-3">
          {/* Entry info */}
          <div className="grid grid-cols-3 gap-2 text-center py-2 border border-white/5 rounded-xl bg-white/3">
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">Entrada</div>
              <div className="text-xs font-black text-white">R${entradaR.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">Payout</div>
              <div className="text-xs font-black text-[var(--green)]">R${payoutR.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-0.5">P&L Hoje</div>
              <div className={`text-xs font-black ${metaPnL >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                {metaPnL >= 0 ? '+' : ''}R${metaPnL.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Meta progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Target size={11} className="text-[var(--green)]" />
                <span className="text-[10px] font-bold text-[var(--green)]">META DIÁRIA</span>
              </div>
              <span className={`text-[10px] font-black ${goalReached ? 'text-[var(--green)]' : 'text-gray-400'}`}>
                {wins}/{cfg.metaWins} {goalReached ? '✅' : 'wins'}
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: goalReached ? 'var(--green)' : 'linear-gradient(90deg, var(--green), #00ccff)' }}
                initial={{ width: 0 }}
                animate={{ width: `${goalPct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            {!goalReached && (
              <div className="text-[9px] text-gray-700 mt-1">
                Faltam {cfg.metaWins - wins} wins · Potencial: +R${((cfg.metaWins - wins) * payoutR).toFixed(2)}
              </div>
            )}
          </div>

          {/* Stop Loss progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ShieldAlert size={11} className="text-[var(--red)]" />
                <span className="text-[10px] font-bold text-[var(--red)]">STOP LOSS</span>
              </div>
              <span className={`text-[10px] font-black ${stopReached ? 'text-[var(--red)]' : 'text-gray-400'}`}>
                {losses}/{cfg.stopLosses} {stopReached ? '🛑' : 'losses'}
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: stopPct > 66 ? 'var(--red)' : stopPct > 33 ? '#f59e0b' : '#4488ff' }}
                initial={{ width: 0 }}
                animate={{ width: `${stopPct}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            {!stopReached && (
              <div className="text-[9px] text-gray-700 mt-1">
                Margem: {cfg.stopLosses - losses} loss(es) restante(s) · Risco: -R${riskLeft.toFixed(2)}
              </div>
            )}
          </div>

          {/* Status messages */}
          {(goalReached || stopReached) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-3 rounded-xl border text-center text-xs font-bold ${
                goalReached
                  ? 'bg-[var(--green)]/8 border-[var(--green)]/25 text-[var(--green)]'
                  : 'bg-[var(--red)]/8 border-[var(--red)]/25 text-[var(--red)]'
              }`}
            >
              {goalReached ? '🏆 Meta atingida! Encerre o dia e proteja os lucros.' : '🛑 Stop atingido! Pare de operar por hoje.'}
            </motion.div>
          )}

          {/* ── WIN / LOSS quick register ── */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold text-center">Registrar Resultado</div>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => handleManualResult('win')}
                className={`relative py-3 rounded-xl font-black text-sm flex flex-col items-center gap-0.5 border transition-all overflow-hidden ${
                  btnFlash === 'win'
                    ? 'bg-[var(--green)] text-black border-[var(--green)] shadow-[0_0_20px_rgba(0,255,136,0.4)]'
                    : 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/25 hover:bg-[var(--green)]/20 hover:shadow-[0_0_12px_rgba(0,255,136,0.15)]'
                }`}
              >
                <span className="text-lg leading-none">{btnFlash === 'win' ? '✅' : '▲'}</span>
                <span className="text-xs">WIN</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => handleManualResult('loss')}
                className={`relative py-3 rounded-xl font-black text-sm flex flex-col items-center gap-0.5 border transition-all overflow-hidden ${
                  btnFlash === 'loss'
                    ? 'bg-[var(--red)] text-white border-[var(--red)] shadow-[0_0_20px_rgba(255,68,102,0.4)]'
                    : 'bg-[var(--red)]/10 text-[var(--red)] border-[var(--red)]/25 hover:bg-[var(--red)]/20 hover:shadow-[0_0_12px_rgba(255,68,102,0.15)]'
                }`}
              >
                <span className="text-lg leading-none">{btnFlash === 'loss' ? '❌' : '▼'}</span>
                <span className="text-xs">LOSS</span>
              </motion.button>
            </div>

            {/* Reset day */}
            <AnimatePresence>
              {showResetConfirm ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-3 space-y-2">
                    <div className="text-[10px] text-orange-400 font-bold text-center">⚠ Zerar resultados de hoje?</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleResetDay}
                        className="py-1.5 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/25 text-xs font-bold hover:bg-orange-500/25 transition"
                      >
                        Sim, zerar
                      </button>
                      <button
                        onClick={() => setShowResetConfirm(false)}
                        className="py-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 text-xs font-bold hover:bg-white/10 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] text-gray-600 hover:text-gray-400 border border-white/5 bg-white/3 hover:bg-white/5 transition"
                >
                  <RotateCcw size={9} /> Zerar resultados de hoje
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
