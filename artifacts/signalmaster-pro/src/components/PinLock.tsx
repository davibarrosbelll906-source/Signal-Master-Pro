import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Eye, EyeOff, Shield } from "lucide-react";

const PIN_KEY = 'smpPin7';
const PIN_ENABLED_KEY = 'smpPinEnabled7';
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes inactivity

function getPinEnabled(): boolean {
  return localStorage.getItem(PIN_ENABLED_KEY) === '1';
}

function getStoredPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function usePinLock() {
  const [locked, setLocked] = useState(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!getPinEnabled() || !getStoredPin()) return;

    const onActivity = () => { lastActivity.current = Date.now(); };
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('touchstart', onActivity);

    const checker = setInterval(() => {
      if (Date.now() - lastActivity.current > LOCK_TIMEOUT) {
        setLocked(true);
        lastActivity.current = Date.now();
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('touchstart', onActivity);
      clearInterval(checker);
    };
  }, []);

  return { locked, setLocked };
}

interface PinSetupProps {
  onClose: () => void;
}

export function PinSetup({ onClose }: PinSetupProps) {
  const [step, setStep] = useState<'set' | 'confirm'>('set');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const pinEnabled = getPinEnabled();

  const handleDisable = () => {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    onClose();
  };

  const handleInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    if (step === 'set') setPin(digits);
    else setConfirmPin(digits);
    setError('');
  };

  const handleNext = () => {
    if (pin.length < 4) { setError('PIN deve ter pelo menos 4 dígitos'); return; }
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (confirmPin !== pin) { setError('PINs não coincidem. Tente novamente.'); setConfirmPin(''); return; }
    localStorage.setItem(PIN_KEY, pin);
    localStorage.setItem(PIN_ENABLED_KEY, '1');
    onClose();
  };

  return (
    <div className="glass-card p-6 space-y-4 max-w-sm w-full mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--blue)]" />
          <h3 className="font-bold text-white text-sm">PIN de Segurança</h3>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X size={16} /></button>
      </div>

      {pinEnabled ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">PIN ativo. O app trava automaticamente após 5 minutos de inatividade.</p>
          <div className="flex gap-2">
            <button onClick={handleDisable} className="flex-1 py-2 rounded-xl text-sm font-bold text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/20 hover:bg-[var(--red)]/20 transition">
              Desativar PIN
            </button>
            <button onClick={() => { localStorage.removeItem(PIN_ENABLED_KEY); setStep('set'); setPin(''); setConfirmPin(''); }}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-[var(--blue)] bg-[var(--blue)]/10 border border-[var(--blue)]/20 hover:bg-[var(--blue)]/20 transition">
              Trocar PIN
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {step === 'set' ? 'Defina um PIN de 4 a 6 dígitos para proteger o app:' : 'Confirme o PIN digitado:'}
          </p>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              value={step === 'set' ? pin : confirmPin}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (step === 'set' ? handleNext() : handleConfirm())}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-[var(--blue)]/50 text-center"
              placeholder="••••"
              autoFocus
            />
            <button onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-xs text-[var(--red)]">{error}</p>}
          {step === 'set' ? (
            <button onClick={handleNext} disabled={pin.length < 4} className="w-full py-2.5 bg-[var(--blue)]/20 text-[var(--blue)] font-bold text-sm rounded-xl border border-[var(--blue)]/30 hover:bg-[var(--blue)]/30 disabled:opacity-40 transition">
              Próximo →
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setStep('set')} className="flex-1 py-2.5 bg-white/5 text-gray-400 font-bold text-sm rounded-xl border border-white/10 hover:bg-white/10 transition">
                ← Voltar
              </button>
              <button onClick={handleConfirm} disabled={confirmPin.length < 4} className="flex-1 py-2.5 bg-[var(--green)] text-black font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-40 transition">
                Confirmar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PinLockScreenProps {
  onUnlock: () => void;
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const tryUnlock = (pin: string) => {
    const stored = getStoredPin();
    if (pin === stored) { onUnlock(); }
    else {
      const next = attempts + 1;
      setAttempts(next);
      setError(next >= 5 ? 'Muitas tentativas incorretas. Aguarde 30s.' : `PIN incorreto. Tentativa ${next}/5.`);
      setInput('');
      if (next >= 5) {
        setBlocked(true);
        setTimeout(() => { setBlocked(false); setAttempts(0); setError(''); }, 30000);
      }
    }
  };

  const handleKey = (digit: string) => {
    if (blocked) return;
    const next = (input + digit).slice(0, 6);
    setInput(next);
    setError('');
    if (next.length >= 4) setTimeout(() => tryUnlock(next), 100);
  };

  const handleDel = () => setInput(v => v.slice(0, -1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#07070d] p-4"
    >
      <div className="text-center max-w-xs w-full">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="w-16 h-16 rounded-2xl bg-[var(--blue)]/15 border border-[var(--blue)]/25 flex items-center justify-center mx-auto mb-6"
        >
          <Lock size={28} className="text-[var(--blue)]" />
        </motion.div>

        <h2 className="text-xl font-black text-white mb-1">App Bloqueado</h2>
        <p className="text-sm text-gray-500 mb-8">Digite seu PIN para continuar</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: Math.max(4, input.length) }).map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < input.length ? 'bg-[var(--blue)] scale-125' : 'bg-white/10'}`} />
          ))}
        </div>

        {error && (
          <motion.p initial={{ x: -5 }} animate={{ x: [0, -8, 8, -8, 8, 0] }} className="text-xs text-[var(--red)] mb-4">
            {error}
          </motion.p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
            k === '' ? <div key={i} /> :
            <button
              key={i}
              onClick={() => k === '⌫' ? handleDel() : handleKey(k)}
              disabled={blocked && k !== '⌫'}
              className="w-full aspect-square rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-lg transition-all active:scale-90 border border-white/5 disabled:opacity-30"
            >
              {k}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
