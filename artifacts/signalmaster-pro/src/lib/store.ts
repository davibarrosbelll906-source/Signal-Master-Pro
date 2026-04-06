import { create } from 'zustand';

export interface User {
  user: string;
  pass: string;
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
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  logout: () => set({ currentUser: null }),
}));

export const initStore = () => {
  const defaultUsers: User[] = [
    { user: 'admin', pass: 'admin123', role: 'admin', plan: 'premium' },
    { user: 'gerente', pass: 'ger123', role: 'gerente', plan: 'premium' },
    { user: 'suporte', pass: 'sup123', role: 'suporte', plan: 'pro' },
    { user: 'analista', pass: 'ana123', role: 'analista', plan: 'pro' },
    { user: 'financeiro', pass: 'fin123', role: 'financeiro', plan: 'premium' },
    { user: 'moderador', pass: 'mod123', role: 'moderador', plan: 'basico' }
  ];

  if (!localStorage.getItem('smpU7')) {
    localStorage.setItem('smpU7', JSON.stringify(defaultUsers));
  }
};
