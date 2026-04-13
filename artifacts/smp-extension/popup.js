'use strict';

const EBINEX_URL = 'https://ebinex.com';

document.getElementById('btn-ebinex').addEventListener('click', () => {
  chrome.tabs.create({ url: EBINEX_URL });
});

// Verifica se há uma aba da Ebinex ativa
function checkEbinexTab(callback) {
  chrome.tabs.query({ url: '*://*.ebinex.com/*' }, (tabs) => {
    callback(tabs.length > 0 ? tabs[0] : null);
  });
}

// Atualiza status de conexão
function setStatus(connected, label) {
  const dot   = document.getElementById('conn-dot');
  const lbl   = document.getElementById('conn-label');
  dot.className = 'dot ' + (connected ? 'on' : 'off');
  lbl.textContent = label;
}

// Renderiza card de sinal
function renderSignal(sig) {
  const area = document.getElementById('signal-area');
  if (!sig || !sig.dir) {
    area.innerHTML = `
      <div class="no-signal">
        <div class="icon">⏳</div>
        <div>Coletando dados... (${sig?.indicators?.candles || 0} velas de 15 mínimo)</div>
      </div>`;
    return;
  }

  const ind   = sig.indicators || {};
  const qc    = (sig.quality || 'wait').toLowerCase();
  const dirCl = sig.dir === 'CALL' ? 'call' : 'put';

  const emaDir = (() => {
    const e9 = parseFloat(ind.ema9), e21 = parseFloat(ind.ema21);
    if (e9 && e21) return e9 > e21 ? '<span class="ind-value bull">▲ bull</span>' : '<span class="ind-value bear">▼ bear</span>';
    return '<span class="ind-value">—</span>';
  })();

  const rsiCl = (() => {
    const r = parseFloat(ind.rsi);
    return isNaN(r) ? '' : r < 40 ? 'bull' : r > 60 ? 'bear' : '';
  })();

  const macdCl = ind.macd === '▲' ? 'bull' : ind.macd === '▼' ? 'bear' : '';

  const ts = sig.ts ? new Date(sig.ts).toLocaleTimeString('pt-BR') : '—';

  area.innerHTML = `
    <div class="signal-card">
      <div class="asset">${sig.asset || '—'} · M1</div>
      <div class="signal-top">
        <div class="direction ${dirCl}">${sig.dir}</div>
        <div class="score-block">
          <div class="score">${sig.score}%</div>
          <div class="quality q-${qc}">${sig.quality}</div>
        </div>
      </div>
      <div class="indicators">
        <div class="ind"><span class="ind-label">EMA </span>${emaDir}</div>
        <div class="ind"><span class="ind-label">RSI  </span><span class="ind-value ${rsiCl}">${ind.rsi || '—'}</span></div>
        <div class="ind"><span class="ind-label">MACD </span><span class="ind-value ${macdCl}">${ind.macd || '—'}</span></div>
        <div class="ind"><span class="ind-label">BB   </span><span class="ind-value">${ind.bb || '—'}</span></div>
        <div class="ind"><span class="ind-label">Preço</span><span class="ind-value">${ind.price || '—'}</span></div>
        <div class="ind"><span class="ind-label">Velas</span><span class="ind-value">${ind.candles || 0}</span></div>
      </div>
      <div class="reason">${sig.reason || ''}</div>
    </div>
    <div id="ts">${ts}</div>
  `;
}

// Busca sinal do storage
function fetchAndRender() {
  chrome.storage.local.get(['lastSignal'], (res) => {
    if (res.lastSignal) renderSignal(res.lastSignal);
  });
}

// Tenta pingar o content script para ver se está ativo
function pingContentScript(tab) {
  if (!tab) {
    setStatus(false, 'Nenhuma aba da Ebinex aberta');
    return;
  }
  try {
    chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        setStatus(false, 'Extensão não carregada nesta aba');
        return;
      }
      setStatus(true, 'Ativo — ' + (res.url || 'ebinex.com'));
      fetchAndRender();
    });
  } catch {
    setStatus(false, 'Erro de comunicação');
  }
}

// Init
checkEbinexTab((tab) => {
  pingContentScript(tab);
});

// Atualiza a cada 2s
setInterval(() => {
  checkEbinexTab((tab) => {
    if (tab) fetchAndRender();
  });
}, 2000);

// Escuta mudanças no storage
chrome.storage.onChanged.addListener((changes) => {
  if (changes.lastSignal) {
    renderSignal(changes.lastSignal.newValue);
  }
});
