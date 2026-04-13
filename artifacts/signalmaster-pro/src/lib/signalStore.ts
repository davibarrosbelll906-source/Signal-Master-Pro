import { create } from 'zustand';

export interface SignalIndicators {
  ema9: number;
  ema21: number;
  ema50: number;
  lastClose: number;
  macdHist: number;
  macdSignal: number;
  bbPct: number;
  obvTrend: string;
  candlePattern: string;
  zoneStrength: number;
  m5Bull: boolean;
  m15Bull: boolean;
  atrPct: number;
}

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
  indicators?: SignalIndicators;
  oracleApproved?: boolean;
  oracleConfidence?: number;
  oracleReason?: string;
  claudeVote?: 'CONFIRM' | 'REJECT' | 'NEUTRAL';
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
  at: number;
}

export interface NexusSignal {
  id: string;
  pair: string;
  direction: 'CALL' | 'PUT';
  score: number;
  tier: 'DIVINE' | 'CELESTIAL' | 'ETHEREAL' | 'ASTRAL';
  timeframe: string;
  expiry: number;
  reason: string;
  oracleReason: string;
  nexusMessage: string;
  confidence: number;
  cosmicAlignment: number;
  isNexusApproved: boolean;
  timestamp: string;
  symbol: string;
  quantumScore: number;
}

export interface CosmicEvent {
  message: string;
  nexusMessage: string;
  tier: 'DIVINE' | 'CELESTIAL' | 'ETHEREAL' | 'ASTRAL';
  alignment: number;
  pair: string;
  direction: 'CALL' | 'PUT';
  score: number;
}

interface SignalState {
  signals: Record<string, BackendSignal>;
  prices: Record<string, PriceUpdate>;
  lunaExplanations: Record<string, LunaExplanation>;
  newsBlackouts: Record<string, NewsBlackout>;
  nexusSignals: NexusSignal[];
  latestCosmicEvent: CosmicEvent | null;
  socketConnected: boolean;
  setSignal: (signal: BackendSignal) => void;
  setPrice: (update: PriceUpdate) => void;
  setConnected: (connected: boolean) => void;
  setLunaExplanation: (explanation: LunaExplanation) => void;
  setNewsBlackout: (blackout: NewsBlackout) => void;
  addNexusSignal: (signal: NexusSignal) => void;
  setCosmicEvent: (event: CosmicEvent) => void;
}

export const useSignalStore = create<SignalState>((set) => ({
  signals: {},
  prices: {},
  lunaExplanations: {},
  newsBlackouts: {},
  nexusSignals: [],
  latestCosmicEvent: null,
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
  addNexusSignal: (signal) =>
    set((s) => ({
      nexusSignals: [signal, ...s.nexusSignals].slice(0, 50), // keep last 50
    })),
  setCosmicEvent: (event) => set({ latestCosmicEvent: event }),
}));
