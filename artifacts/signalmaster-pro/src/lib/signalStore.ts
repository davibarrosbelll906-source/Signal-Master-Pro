import { create } from 'zustand';

export interface BackendSignal {
  direction: 'CALL' | 'PUT';
  score: number;
  quality: 'EVITAR' | 'FRACO' | 'MÉDIO' | 'FORTE' | 'PREMIUM' | 'ELITE' | 'ULTRA';
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

export interface LunaExplanation {
  signalId: string;
  asset: string;
  explanation: string;
  keyPoints: string[];
  riskNote: string;
}

export interface NewsBlackout {
  asset: string;
  event: string;
  minutesUntil: number;
  at: number; // timestamp when received
}

interface SignalState {
  signals: Record<string, BackendSignal>;
  prices: Record<string, PriceUpdate>;
  lunaExplanations: Record<string, LunaExplanation>;
  newsBlackouts: Record<string, NewsBlackout>;
  socketConnected: boolean;
  setSignal: (signal: BackendSignal) => void;
  setPrice: (update: PriceUpdate) => void;
  setConnected: (connected: boolean) => void;
  setLunaExplanation: (explanation: LunaExplanation) => void;
  setNewsBlackout: (blackout: NewsBlackout) => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  signals: {},
  prices: {},
  lunaExplanations: {},
  newsBlackouts: {},
  socketConnected: false,
  setSignal: (signal) =>
    set((s) => ({ signals: { ...s.signals, [signal.asset]: signal } })),
  setPrice: (update) =>
    set((s) => ({ prices: { ...s.prices, [update.asset]: update } })),
  setConnected: (socketConnected) => set({ socketConnected }),
  setLunaExplanation: (explanation) =>
    set((s) => ({
      lunaExplanations: {
        ...s.lunaExplanations,
        [explanation.asset]: explanation,
      },
    })),
  setNewsBlackout: (blackout) =>
    set((s) => ({
      newsBlackouts: {
        ...s.newsBlackouts,
        [blackout.asset]: blackout,
      },
    })),
}));
