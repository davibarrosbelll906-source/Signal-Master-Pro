import { create } from 'zustand';
import { clearTokens } from './apiClient';

export interface User {
  id?: number;
  user: string;
  role: 'admin' | 'gerente' | 'suporte' | 'analista' | 'financeiro' | 'moderador' | 'user';
  plan: 'basico' | 'pro' | 'premium';
  name?: string;
  email?: string;
  trialEndsAt?: number;
}

export interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: (() => {
    try {
      const saved = localStorage.getItem('smpCurrentUser7');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })(),
  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem('smpCurrentUser7', JSON.stringify(user));
    } else {
      localStorage.removeItem('smpCurrentUser7');
    }
    set({ currentUser: user });
  },
  logout: () => {
    clearTokens();
    localStorage.removeItem('smpCurrentUser7');
    set({ currentUser: null });
  },
}));

/** Mantido para compatibilidade — não armazena mais senhas em texto claro */
export const initStore = () => {};
