/**
 * useAccountMode — Global Real/Demo account mode toggle.
 * Persisted to localStorage under 'smpMode7'.
 * Inspired by the Ebinex Ultra extension's real-account enforcement.
 */
import { useState, useEffect, useCallback } from "react";

export type AccountMode = 'real' | 'demo';
export type Broker = string;

const KEY_MODE = 'smpMode7';
const KEY_BROKER = 'smpBroker7';

const DEFAULT_BROKER = 'Ebinex';

export const KNOWN_BROKERS = [
  'Ebinex', 'Deriv', 'Quotex', 'IQ Option', 'Olymp Trade',
  'Binomo', 'Pocket Option', 'ExpertOption', 'Outra'
];

function readMode(): AccountMode {
  try { return (localStorage.getItem(KEY_MODE) as AccountMode) || 'demo'; } catch { return 'demo'; }
}
function readBroker(): Broker {
  try { return localStorage.getItem(KEY_BROKER) || DEFAULT_BROKER; } catch { return DEFAULT_BROKER; }
}

// Singleton emitter so all hook instances stay in sync
type Listener = () => void;
const listeners = new Set<Listener>();
function notifyAll() { listeners.forEach(fn => fn()); }

export function useAccountMode() {
  const [mode, setModeState] = useState<AccountMode>(readMode);
  const [broker, setBrokerState] = useState<Broker>(readBroker);

  useEffect(() => {
    const sync = () => {
      setModeState(readMode());
      setBrokerState(readBroker());
    };
    listeners.add(sync);
    return () => { listeners.delete(sync); };
  }, []);

  const setMode = useCallback((m: AccountMode) => {
    try { localStorage.setItem(KEY_MODE, m); } catch {}
    notifyAll();
  }, []);

  const setBroker = useCallback((b: Broker) => {
    try { localStorage.setItem(KEY_BROKER, b); } catch {}
    notifyAll();
  }, []);

  const isReal = mode === 'real';
  const isDemo = mode === 'demo';

  return { mode, isReal, isDemo, broker, setMode, setBroker };
}
