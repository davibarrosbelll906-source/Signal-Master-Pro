/**
 * Socket.io client singleton — connects to the API server
 * and populates the signalStore with real-time signals and prices.
 */

import { io } from 'socket.io-client';
import { useSignalStore, type LunaExplanation, type NewsBlackout } from './signalStore';

const BASE_URL = import.meta.env.BASE_URL || '/';

// Connect through the Vite proxy (/socket.io → localhost:8080)
export const socket = io(BASE_URL, {
  path: `${BASE_URL}socket.io`.replace('//', '/'),
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: Infinity,
});

socket.on('connect', () => {
  useSignalStore.getState().setConnected(true);
});

socket.on('disconnect', () => {
  useSignalStore.getState().setConnected(false);
});

socket.on('new_signal', (signal) => {
  useSignalStore.getState().setSignal(signal);
});

socket.on('price_update', (update) => {
  useSignalStore.getState().setPrice(update);
});

socket.on('luna_signal_explanation', (explanation: LunaExplanation) => {
  useSignalStore.getState().setLunaExplanation(explanation);
});

socket.on('news_blackout', (blackout: Omit<NewsBlackout, 'at'>) => {
  useSignalStore.getState().setNewsBlackout({ ...blackout, at: Date.now() });
});

export default socket;
