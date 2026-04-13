/**
 * SignalMaster Pro — Content Script (ISOLATED world)
 * Faz a ponte entre o script MAIN (que acessa o DOM/WS) e o service worker da extensão.
 */
(function () {
  'use strict';

  // Escuta eventos do mundo MAIN
  window.addEventListener('smp:signal', (e) => {
    const signal = e.detail;
    if (!signal) return;

    // Salva no storage da extensão para o popup acessar
    try {
      chrome.storage.local.set({ lastSignal: signal });
    } catch {}

    // Alerta sonoro quando sinal forte
    if (signal.dir && signal.score >= 72) {
      playBeep(signal.dir);
    }
  });

  // Responde mensagens do popup
  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg.type === 'GET_SIGNAL') {
      // Lê do storage
      chrome.storage.local.get(['lastSignal'], (res) => {
        respond({ signal: res.lastSignal || null });
      });
      return true; // async
    }

    if (msg.type === 'PING') {
      respond({ alive: true, url: window.location.href });
      return true;
    }
  });

  // Beep simples usando Web Audio API
  function playBeep(dir) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // CALL = tom agudo, PUT = tom grave
      osc.frequency.value = dir === 'CALL' ? 880 : 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  console.log('[SMP] Bridge (isolated) iniciado ✓');
})();
