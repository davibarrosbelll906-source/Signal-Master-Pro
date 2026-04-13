/**
 * SignalMaster Pro — Service Worker (background)
 * Gerencia badge e estado global da extensão.
 */

// Atualiza badge quando sinal chega no storage
chrome.storage.onChanged.addListener((changes) => {
  if (!changes.lastSignal) return;
  const sig = changes.lastSignal.newValue;
  if (!sig) return;

  // Badge com direção
  const text = sig.dir === 'CALL' ? '▲' : sig.dir === 'PUT' ? '▼' : '?';
  const color = sig.dir === 'CALL' ? '#00ff88' : sig.dir === 'PUT' ? '#ff4466' : '#888888';

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
});

// Limpa badge quando extensão inicia
chrome.runtime.onStartup.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
  console.log('[SMP] Extensão instalada ✓');
});
