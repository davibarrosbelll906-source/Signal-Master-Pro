import { create } from 'zustand';

export interface BackendSignal {
  direction: 'CALL' | 'PUT';
  score: number;
  quality: 'EVITAR' | 'FRACO' | 'MÉDIO' | 'FORTE' | 'PREMIUM' | 'ELITE';
  marketRegime: 'TRENDING' | 'RANGING' | 'CHOPPY';
  adx: number;
  rsi: number;
  entropy: number;
  consensus: number;
  confirmed: number;
  mmTrap: boolean;
  mmTrapType: string;
  sess: string;
  votes: Record<string, string>;
  blockedBy: string | null;
  asset: string;
  category: string;
  ts: number;
  passed: boolean;
}

export interface PriceUpdate {
  asset: string;
  price: number;
  connected: boolean;
  bufSize: number;
}

interface SignalState {
  signals: Record<string, BackendSignal>;
  prices: Record<string, PriceUpdate>;
  socketConnected: boolean;
  setSignal: (signal: BackendSignal) => void;
  setPrice: (update: PriceUpdate) => void;
  setConnected: (connected: boolean) => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  signals: {},
  prices: {},
  socketConnected: false,
  setSignal: (signal) =>
    set((s) => ({ signals: { ...s.signals, [signal.asset]: signal } })),
  setPrice: (update) =>
    set((s) => ({ prices: { ...s.prices, [update.asset]: update } })),
  setConnected: (socketConnected) => set({ socketConnected }),
}));
