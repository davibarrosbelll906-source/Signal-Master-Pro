/**
 * SignalMaster Pro — Content Script (MAIN world)
 * Intercepta WebSocket/Fetch da Ebinex, calcula indicadores e exibe HUD com sinal CALL/PUT.
 * Roda no contexto da página (MAIN world) para ter acesso direto ao WebSocket da corretora.
 */
(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // ESTADO GLOBAL
  // ─────────────────────────────────────────────
  const STATE = {
    ticks: {},          // { 'BTCUSD': [{ price, ts }] }
    candles: {},        // { 'BTCUSD': [{ o,h,l,c,v,t }] }
    currentAsset: null,
    lastSignal: null,
    wsConnected: false,
    dataSource: 'aguardando...',
    errors: [],
    tickCount: 0,
    lastPrice: {},
  };

  const MAX_CANDLES = 100;
  const CANDLE_MS   = 60_000; // 1 minuto
  const MIN_CANDLES = 15;     // mínimo para calcular indicadores

  // ─────────────────────────────────────────────
  // 1. INTERCEPTAÇÃO WEBSOCKET
  // ─────────────────────────────────────────────
  const OriginalWS = window.WebSocket;

  window.WebSocket = function (...args) {
    const ws = new OriginalWS(...args);
    STATE.wsConnected = true;
    updateHUD();

    console.log('[SMP] WebSocket interceptado:', args[0]);

    ws.addEventListener('message', (event) => {
      try {
        const raw = event.data;

        // dados binários — ignora
        if (raw instanceof ArrayBuffer || raw instanceof Blob) return;

        let parsed;
        try { parsed = JSON.parse(raw); } catch { return; }

        const result = parseAnyFormat(parsed);
        if (result) {
          feedTick(result.asset, result.price, result.ts);
          STATE.dataSource = 'WebSocket (real-time)';
        }
      } catch (e) {
        STATE.errors.push(e.message);
      }
    });

    return ws;
  };

  // Copia propriedades estáticas do WebSocket original
  Object.assign(window.WebSocket, OriginalWS);
  window.WebSocket.prototype = OriginalWS.prototype;

  // ─────────────────────────────────────────────
  // 2. INTERCEPTAÇÃO FETCH (dados históricos de velas)
  // ─────────────────────────────────────────────
  const OriginalFetch = window.fetch;

  window.fetch = function (...args) {
    return OriginalFetch.apply(this, args).then(async (response) => {
      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        const ct  = response.headers.get('content-type') || '';

        if (!ct.includes('json')) return response;

        // Clona para não consumir o body original
        const clone = response.clone();
        clone.json().then((data) => {
          const candles = extractCandlesFromResponse(data, url);
          if (candles.length > 0) {
            const asset = guessAssetFromURL(url) || STATE.currentAsset;
            if (asset) {
              STATE.candles[asset] = candles.slice(-MAX_CANDLES);
              STATE.dataSource = 'HTTP (histórico)';
              recalcSignal(asset);
            }
          }
        }).catch(() => {});
      } catch (e) {}
      return response;
    });
  };

  // ─────────────────────────────────────────────
  // 3. PARSERS MULTI-FORMATO
  // ─────────────────────────────────────────────
  function parseAnyFormat(obj) {
    if (!obj || typeof obj !== 'object') return null;

    // Flatten arrays
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const r = parseAnyFormat(item);
        if (r) return r;
      }
      return null;
    }

    // Extrai campos comuns
    const price  = extractNum(obj, ['price','rate','close','c','last','bid','ask','value','p']);
    const asset  = extractStr(obj, ['symbol','asset','pair','instrument','name','s','ticker','market','currency_pair']);
    const ts     = extractNum(obj, ['timestamp','time','ts','t','date','created_at']);

    if (price && price > 0 && asset) {
      return { asset: normalizeAsset(asset), price, ts: ts || Date.now() };
    }

    // Tenta buscar em campos aninhados
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val && typeof val === 'object') {
        const r = parseAnyFormat(val);
        if (r) return r;
      }
    }
    return null;
  }

  function extractCandlesFromResponse(data, url) {
    const candles = [];
    const candidates = Array.isArray(data) ? data : (data?.data || data?.candles || data?.bars || data?.ohlc || data?.result || []);

    if (!Array.isArray(candidates)) return candles;

    for (const c of candidates) {
      if (!c || typeof c !== 'object') continue;
      const o = extractNum(c, ['open','o']);
      const h = extractNum(c, ['high','h']);
      const l = extractNum(c, ['low','l']);
      const cl = extractNum(c, ['close','c','last']);
      const v = extractNum(c, ['volume','v','vol']) || 0;
      const t = extractNum(c, ['time','timestamp','ts','t','date','open_time']) || 0;
      if (o && h && l && cl) {
        candles.push({ o, h, l, c: cl, v, t: t > 1e12 ? t : t * 1000 });
      }
    }
    return candles;
  }

  function extractNum(obj, keys) {
    for (const k of keys) {
      const v = parseFloat(obj[k]);
      if (!isNaN(v) && v > 0) return v;
    }
    return null;
  }

  function extractStr(obj, keys) {
    for (const k of keys) {
      if (typeof obj[k] === 'string' && obj[k].length >= 3) return obj[k];
    }
    return null;
  }

  function normalizeAsset(s) {
    return s.toUpperCase()
      .replace(/[_\-\/]/g, '')
      .replace('MATICUSD','MATICUSD')
      .replace('XBT','BTC');
  }

  function guessAssetFromURL(url) {
    const knownPairs = ['BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD','ADAUSD',
                        'DOGEUSD','LTCUSD','AVAXUSD','DOTUSD','LINKUSD','MATICUSD'];
    const u = url.toUpperCase();
    for (const p of knownPairs) {
      if (u.includes(p) || u.includes(p.replace('USD','/USD')) || u.includes(p.replace('USD','-USD'))) return p;
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // 4. CONSTRUÇÃO DE VELAS A PARTIR DE TICKS
  // ─────────────────────────────────────────────
  function feedTick(asset, price, ts) {
    if (!asset || !price) return;

    STATE.lastPrice[asset] = price;
    STATE.tickCount++;

    if (!STATE.ticks[asset]) STATE.ticks[asset] = [];

    // Detecta ativo atual pela URL
    detectCurrentAsset();

    const tick = { price, ts };
    STATE.ticks[asset].push(tick);

    // Remove ticks mais antigos que 3 minutos
    const cutoff = Date.now() - 3 * CANDLE_MS;
    STATE.ticks[asset] = STATE.ticks[asset].filter(t => t.ts > cutoff);

    // Constrói velas de 1 minuto a partir dos ticks
    buildCandlesFromTicks(asset);

    // Se é o ativo atual, recalcula sinal
    if (!STATE.currentAsset || STATE.currentAsset === asset) {
      if (!STATE.currentAsset) STATE.currentAsset = asset;
      recalcSignal(asset);
    }
  }

  function buildCandlesFromTicks(asset) {
    const ticks = STATE.ticks[asset] || [];
    if (ticks.length === 0) return;

    if (!STATE.candles[asset]) STATE.candles[asset] = [];

    // Agrupa ticks em velas de 1 minuto
    const groups = {};
    for (const tick of ticks) {
      const min = Math.floor(tick.ts / CANDLE_MS) * CANDLE_MS;
      if (!groups[min]) groups[min] = [];
      groups[min].push(tick.price);
    }

    for (const [minStr, prices] of Object.entries(groups)) {
      const t = parseInt(minStr);
      const o = prices[0];
      const c = prices[prices.length - 1];
      const h = Math.max(...prices);
      const l = Math.min(...prices);
      const v = prices.length;

      const existing = STATE.candles[asset].findIndex(cd => cd.t === t);
      if (existing >= 0) {
        STATE.candles[asset][existing] = { o, h, l, c, v, t };
      } else {
        STATE.candles[asset].push({ o, h, l, c, v, t });
      }
    }

    // Ordena por tempo e limita
    STATE.candles[asset].sort((a, b) => a.t - b.t);
    if (STATE.candles[asset].length > MAX_CANDLES) {
      STATE.candles[asset] = STATE.candles[asset].slice(-MAX_CANDLES);
    }
  }

  // ─────────────────────────────────────────────
  // 5. MOTOR DE SINAIS (EMA, MACD, RSI, BB)
  // ─────────────────────────────────────────────
  function ema(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
      val = closes[i] * k + val * (1 - k);
    }
    return val;
  }

  function rsi(closes, period = 7) {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const rs = losses === 0 ? 100 : gains / losses;
    return 100 - 100 / (1 + rs);
  }

  function macd(closes) {
    const e12 = ema(closes, 12);
    const e26 = ema(closes, 26);
    if (!e12 || !e26) return null;
    const line = e12 - e26;
    // Signal line (9 EMA of MACD would need more data, simplified)
    return { line, bullish: line > 0 };
  }

  function bollingerBands(closes, period = 20, mult = 2) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std  = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    const upper = mean + mult * std;
    const lower = mean - mult * std;
    const current = closes[closes.length - 1];
    const pct = std === 0 ? 50 : ((current - lower) / (upper - lower)) * 100;
    return { upper, lower, mean, pct: Math.max(0, Math.min(100, pct)) };
  }

  function recalcSignal(asset) {
    const candles = STATE.candles[asset] || [];
    if (candles.length < MIN_CANDLES) {
      STATE.lastSignal = {
        asset,
        dir: null,
        score: 0,
        quality: 'AGUARDANDO',
        reason: `Coletando dados... (${candles.length}/${MIN_CANDLES} velas)`,
        indicators: {},
        ts: Date.now(),
      };
      updateHUD();
      return;
    }

    const closes = candles.map(c => c.c);
    const highs  = candles.map(c => c.h);
    const lows   = candles.map(c => c.l);
    const last   = closes[closes.length - 1];

    const ema9  = ema(closes, 9);
    const ema21 = ema(closes, 21);
    const ema50 = ema(closes, 50) || ema(closes, Math.min(50, closes.length));
    const rsiVal = rsi(closes, 7);
    const macdVal = macd(closes);
    const bbVal  = bollingerBands(closes, 20);

    // Padrão de vela atual
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2] || lastCandle;
    const isBullCandle = lastCandle.c > lastCandle.o;
    const isPrevBull   = prevCandle.c > prevCandle.o;

    // ── Pontuação
    let score = 50;
    let votes = { call: 0, put: 0, neutral: 0 };
    const reasons = [];

    // EMA trend
    if (ema9 && ema21) {
      if (ema9 > ema21) { votes.call++; reasons.push('EMA9>EMA21'); }
      else              { votes.put++;  reasons.push('EMA9<EMA21'); }
    }
    if (ema21 && ema50) {
      if (ema21 > ema50) { votes.call++; reasons.push('EMA21>EMA50'); }
      else               { votes.put++;  reasons.push('EMA21<EMA50'); }
    }
    if (ema9 && last) {
      if (last > ema9) { votes.call++; }
      else             { votes.put++;  }
    }

    // RSI
    if (rsiVal !== null) {
      if (rsiVal < 30)      { votes.call += 2; reasons.push(`RSI ${rsiVal.toFixed(0)} (sobrevend)`); }
      else if (rsiVal > 70) { votes.put  += 2; reasons.push(`RSI ${rsiVal.toFixed(0)} (sobrecomp)`); }
      else if (rsiVal > 55) { votes.call++; }
      else if (rsiVal < 45) { votes.put++;  }
    }

    // MACD
    if (macdVal) {
      if (macdVal.bullish) { votes.call++; reasons.push('MACD ▲'); }
      else                 { votes.put++;  reasons.push('MACD ▼'); }
    }

    // Bollinger Bands
    if (bbVal) {
      if (bbVal.pct < 20)  { votes.call++; reasons.push(`BB ${bbVal.pct.toFixed(0)}% (baixo)`); }
      else if (bbVal.pct > 80) { votes.put++; reasons.push(`BB ${bbVal.pct.toFixed(0)}% (alto)`); }
    }

    // Padrão de vela
    if (isBullCandle && isPrevBull) { votes.call++; reasons.push('Velas bullish'); }
    else if (!isBullCandle && !isPrevBull) { votes.put++; reasons.push('Velas bearish'); }

    const totalVotes = votes.call + votes.put + votes.neutral;
    const dir = votes.call > votes.put ? 'CALL' : votes.put > votes.call ? 'PUT' : null;

    if (dir === 'CALL') {
      score = 50 + Math.round((votes.call / totalVotes) * 50);
    } else if (dir === 'PUT') {
      score = 50 + Math.round((votes.put / totalVotes) * 50);
    } else {
      score = 50;
    }

    score = Math.min(99, Math.max(30, score));

    let quality;
    if (score >= 80)      quality = 'ELITE';
    else if (score >= 72) quality = 'PREMIUM';
    else if (score >= 66) quality = 'FORTE';
    else                  quality = 'FRACO';

    STATE.lastSignal = {
      asset,
      dir,
      score,
      quality,
      reason: reasons.join(' | '),
      indicators: {
        ema9:  ema9  ? ema9.toFixed(4)  : '—',
        ema21: ema21 ? ema21.toFixed(4) : '—',
        ema50: ema50 ? ema50.toFixed(4) : '—',
        rsi:   rsiVal !== null ? rsiVal.toFixed(1) : '—',
        macd:  macdVal ? (macdVal.line > 0 ? '▲' : '▼') : '—',
        bb:    bbVal ? bbVal.pct.toFixed(0) + '%' : '—',
        price: last.toFixed(last > 100 ? 2 : 5),
        candles: candles.length,
      },
      ts: Date.now(),
    };

    updateHUD();

    // Emite evento para o mundo isolado
    window.dispatchEvent(new CustomEvent('smp:signal', {
      detail: STATE.lastSignal,
    }));
  }

  // ─────────────────────────────────────────────
  // 6. DETECÇÃO DO ATIVO ATUAL NA TELA
  // ─────────────────────────────────────────────
  const KNOWN_PAIRS = ['BTCUSD','ETHUSD','SOLUSD','BNBUSD','XRPUSD','ADAUSD',
                       'DOGEUSD','LTCUSD','AVAXUSD','DOTUSD','LINKUSD','MATICUSD',
                       'BTC/USD','ETH/USD','SOL/USD','BNB/USD','XRP/USD',
                       'ADA/USD','DOGE/USD','LTC/USD','AVAX/USD','DOT/USD',
                       'LINK/USD','MATIC/USD','POL/USD'];

  function detectCurrentAsset() {
    // 1. URL
    const url = window.location.href.toUpperCase();
    for (const p of KNOWN_PAIRS) {
      if (url.includes(p.replace('/','')) || url.includes(p)) {
        const norm = normalizeAsset(p);
        if (norm !== STATE.currentAsset) {
          STATE.currentAsset = norm;
        }
        return;
      }
    }

    // 2. DOM — título ou breadcrumb
    const domSelectors = [
      '.asset-name', '.instrument-name', '.currency-pair',
      '.active-asset', '.pair-name', '[class*="asset"]',
      '[class*="instrument"]', '[class*="market"]',
      'h1', 'h2', '.title', '.header-title',
    ];
    for (const sel of domSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const text = el.textContent.toUpperCase();
        for (const p of KNOWN_PAIRS) {
          if (text.includes(p) || text.includes(p.replace('/USD','')) ) {
            const norm = normalizeAsset(p);
            STATE.currentAsset = norm;
            return;
          }
        }
      } catch {}
    }

    // 3. Usa o ativo com mais ticks recentes
    if (Object.keys(STATE.ticks).length > 0) {
      const best = Object.entries(STATE.ticks)
        .sort((a, b) => b[1].length - a[1].length)[0];
      if (best) STATE.currentAsset = best[0];
    }
  }

  // ─────────────────────────────────────────────
  // 7. HUD — OVERLAY FLUTUANTE
  // ─────────────────────────────────────────────
  let hudEl = null;
  let hudVisible = true;

  function injectStyles() {
    if (document.getElementById('smp-styles')) return;
    const s = document.createElement('style');
    s.id = 'smp-styles';
    s.textContent = `
      #smp-hud {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        width: 280px;
        font-family: 'Inter', 'Segoe UI', sans-serif;
        font-size: 13px;
        user-select: none;
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
        background: rgba(10,10,20,0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        transition: all 0.3s ease;
      }
      #smp-hud.minimized { width: 180px; }
      #smp-hud-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(255,255,255,0.04);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        cursor: move;
      }
      #smp-hud-title {
        font-weight: 700;
        font-size: 12px;
        color: #00ff88;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      #smp-hud-controls { display: flex; gap: 6px; }
      #smp-hud-controls button {
        background: rgba(255,255,255,0.08);
        border: none;
        border-radius: 4px;
        color: #888;
        font-size: 11px;
        cursor: pointer;
        padding: 2px 6px;
        transition: all 0.2s;
      }
      #smp-hud-controls button:hover { background: rgba(255,255,255,0.15); color: #fff; }
      #smp-hud-body { padding: 14px; }
      #smp-hud.minimized #smp-hud-body { display: none; }
      #smp-signal-block {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      #smp-direction {
        font-size: 28px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -1px;
      }
      #smp-direction.call { color: #00ff88; text-shadow: 0 0 20px rgba(0,255,136,0.5); }
      #smp-direction.put  { color: #ff4466; text-shadow: 0 0 20px rgba(255,68,102,0.5); }
      #smp-direction.wait { color: #888; font-size: 16px; }
      #smp-score-block { text-align: right; }
      #smp-score {
        font-size: 22px;
        font-weight: 800;
        color: #fff;
      }
      #smp-quality {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        padding: 2px 8px;
        border-radius: 4px;
        display: inline-block;
        margin-top: 2px;
      }
      .q-elite   { background: rgba(255,215,0,0.2);  color: #ffd700; border: 1px solid rgba(255,215,0,0.4); }
      .q-premium { background: rgba(180,100,255,0.2); color: #c084fc; border: 1px solid rgba(180,100,255,0.4); }
      .q-forte   { background: rgba(0,255,136,0.15); color: #00ff88; border: 1px solid rgba(0,255,136,0.3); }
      .q-fraco   { background: rgba(255,165,0,0.15); color: #ffa500; border: 1px solid rgba(255,165,0,0.3); }
      .q-wait    { background: rgba(100,100,100,0.2); color: #888; border: 1px solid rgba(100,100,100,0.3); }
      #smp-asset-row {
        font-size: 11px;
        color: #aaa;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
      }
      #smp-asset-name { color: #fff; font-weight: 600; font-size: 13px; }
      #smp-indicators {
        background: rgba(255,255,255,0.04);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .smp-ind-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 11px;
      }
      .smp-ind-row:last-child { margin-bottom: 0; }
      .smp-ind-label { color: #666; }
      .smp-ind-value { color: #ccc; font-weight: 600; }
      .smp-ind-value.bull { color: #00ff88; }
      .smp-ind-value.bear { color: #ff4466; }
      #smp-reason {
        font-size: 10px;
        color: #555;
        line-height: 1.4;
        margin-bottom: 10px;
        border-top: 1px solid rgba(255,255,255,0.04);
        padding-top: 8px;
      }
      #smp-status-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10px;
        color: #444;
      }
      #smp-ws-dot {
        display: inline-block;
        width: 6px; height: 6px;
        border-radius: 50%;
        background: #333;
        margin-right: 4px;
        vertical-align: middle;
      }
      #smp-ws-dot.connected { background: #00ff88; box-shadow: 0 0 6px #00ff88; animation: pulse 2s infinite; }
      #smp-ws-dot.waiting   { background: #ffa500; animation: pulse 1s infinite; }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      #smp-ticker {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .smp-pair-chip {
        font-size: 9px;
        padding: 2px 5px;
        border-radius: 3px;
        background: rgba(255,255,255,0.06);
        color: #555;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s;
      }
      .smp-pair-chip.active {
        background: rgba(0,255,136,0.12);
        color: #00ff88;
        border-color: rgba(0,255,136,0.3);
      }
      #smp-hud-toggle {
        position: fixed;
        right: 20px;
        top: 20px;
        z-index: 2147483646;
        background: rgba(0,255,136,0.9);
        color: #000;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: none;
        box-shadow: 0 4px 12px rgba(0,255,136,0.3);
      }
    `;
    document.head.appendChild(s);
  }

  function createHUD() {
    if (document.getElementById('smp-hud')) return;

    injectStyles();

    hudEl = document.createElement('div');
    hudEl.id = 'smp-hud';
    hudEl.innerHTML = `
      <div id="smp-hud-header">
        <span id="smp-hud-title">⚡ SignalMaster Pro</span>
        <div id="smp-hud-controls">
          <button id="smp-btn-min" title="Minimizar">_</button>
          <button id="smp-btn-close" title="Fechar">✕</button>
        </div>
      </div>
      <div id="smp-hud-body">
        <div id="smp-asset-row">
          <span id="smp-asset-name">—</span>
          <span id="smp-timeframe">M1 · Ebinex</span>
        </div>
        <div id="smp-signal-block">
          <div id="smp-direction" class="wait">AGUARD.</div>
          <div id="smp-score-block">
            <div id="smp-score">—</div>
            <div id="smp-quality" class="q-wait">—</div>
          </div>
        </div>
        <div id="smp-indicators">
          <div class="smp-ind-row">
            <span class="smp-ind-label">EMA 9/21/50</span>
            <span class="smp-ind-value" id="smp-ema">—</span>
          </div>
          <div class="smp-ind-row">
            <span class="smp-ind-label">RSI (7)</span>
            <span class="smp-ind-value" id="smp-rsi">—</span>
          </div>
          <div class="smp-ind-row">
            <span class="smp-ind-label">MACD</span>
            <span class="smp-ind-value" id="smp-macd">—</span>
          </div>
          <div class="smp-ind-row">
            <span class="smp-ind-label">Bollinger %B</span>
            <span class="smp-ind-value" id="smp-bb">—</span>
          </div>
          <div class="smp-ind-row">
            <span class="smp-ind-label">Preço atual</span>
            <span class="smp-ind-value" id="smp-price">—</span>
          </div>
          <div class="smp-ind-row">
            <span class="smp-ind-label">Velas coletadas</span>
            <span class="smp-ind-value" id="smp-candles">0</span>
          </div>
        </div>
        <div id="smp-reason">Aguardando dados do mercado...</div>
        <div id="smp-status-row">
          <span><span id="smp-ws-dot" class="waiting"></span><span id="smp-ws-label">conectando...</span></span>
          <span id="smp-ts">—</span>
        </div>
      </div>
    `;

    document.body.appendChild(hudEl);
    makeDraggable(hudEl, document.getElementById('smp-hud-header'));

    document.getElementById('smp-btn-min').addEventListener('click', () => {
      hudEl.classList.toggle('minimized');
    });

    document.getElementById('smp-btn-close').addEventListener('click', () => {
      hudEl.style.display = 'none';
      const btn = document.getElementById('smp-hud-toggle');
      if (btn) btn.style.display = 'block';
    });

    // Botão para reabrir HUD quando fechado
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'smp-hud-toggle';
    toggleBtn.textContent = '⚡ SMP';
    toggleBtn.addEventListener('click', () => {
      hudEl.style.display = 'block';
      toggleBtn.style.display = 'none';
    });
    document.body.appendChild(toggleBtn);
  }

  function updateHUD() {
    if (!hudEl) {
      if (document.body) createHUD();
      else { setTimeout(updateHUD, 500); return; }
    }

    const sig = STATE.lastSignal;
    const asset = STATE.currentAsset;

    // Asset name
    const assetEl = document.getElementById('smp-asset-name');
    if (assetEl) assetEl.textContent = asset || '—';

    if (!sig) return;

    // Direction
    const dirEl = document.getElementById('smp-direction');
    if (dirEl) {
      dirEl.textContent = sig.dir || 'AGUARD.';
      dirEl.className = sig.dir === 'CALL' ? 'call' : sig.dir === 'PUT' ? 'put' : 'wait';
    }

    // Score
    const scoreEl = document.getElementById('smp-score');
    if (scoreEl) scoreEl.textContent = sig.dir ? sig.score + '%' : '—';

    // Quality badge
    const qualEl = document.getElementById('smp-quality');
    if (qualEl) {
      qualEl.textContent = sig.quality || '—';
      const qc = sig.quality?.toLowerCase();
      qualEl.className = `q-${qc || 'wait'}`;
    }

    // Indicators
    const ind = sig.indicators || {};
    const emaEl = document.getElementById('smp-ema');
    if (emaEl) {
      const e9  = parseFloat(ind.ema9)  || 0;
      const e21 = parseFloat(ind.ema21) || 0;
      const e50 = parseFloat(ind.ema50) || 0;
      if (e9 && e21) {
        emaEl.textContent = e9 > e21 ? '▲ bullish' : '▼ bearish';
        emaEl.className = 'smp-ind-value ' + (e9 > e21 ? 'bull' : 'bear');
      } else {
        emaEl.textContent = '—';
        emaEl.className = 'smp-ind-value';
      }
    }

    const rsiEl = document.getElementById('smp-rsi');
    if (rsiEl) {
      const r = parseFloat(ind.rsi);
      rsiEl.textContent = ind.rsi || '—';
      rsiEl.className = 'smp-ind-value ' + (!isNaN(r) ? (r < 40 ? 'bull' : r > 60 ? 'bear' : '') : '');
    }

    const macdEl = document.getElementById('smp-macd');
    if (macdEl) {
      macdEl.textContent = ind.macd || '—';
      macdEl.className = 'smp-ind-value ' + (ind.macd === '▲' ? 'bull' : ind.macd === '▼' ? 'bear' : '');
    }

    const bbEl = document.getElementById('smp-bb');
    if (bbEl) {
      const b = parseFloat(ind.bb);
      bbEl.textContent = ind.bb || '—';
      bbEl.className = 'smp-ind-value ' + (!isNaN(b) ? (b < 20 ? 'bull' : b > 80 ? 'bear' : '') : '');
    }

    const priceEl = document.getElementById('smp-price');
    if (priceEl) priceEl.textContent = ind.price || '—';

    const candlesEl = document.getElementById('smp-candles');
    if (candlesEl) candlesEl.textContent = ind.candles || 0;

    // Reason
    const reasonEl = document.getElementById('smp-reason');
    if (reasonEl) reasonEl.textContent = sig.reason || '—';

    // WS status
    const dot = document.getElementById('smp-ws-dot');
    const label = document.getElementById('smp-ws-label');
    if (dot && label) {
      if (STATE.wsConnected && STATE.tickCount > 0) {
        dot.className = 'connected';
        label.textContent = STATE.dataSource;
      } else {
        dot.className = 'waiting';
        label.textContent = 'aguardando dados...';
      }
    }

    // Timestamp
    const tsEl = document.getElementById('smp-ts');
    if (tsEl) {
      const d = new Date(sig.ts);
      tsEl.textContent = d.toLocaleTimeString('pt-BR');
    }
  }

  // ─────────────────────────────────────────────
  // 8. DRAG & DROP DO HUD
  // ─────────────────────────────────────────────
  function makeDraggable(el, handle) {
    let ox = 0, oy = 0, x = 0, y = 0;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      ox = e.clientX - el.offsetLeft;
      oy = e.clientY - el.offsetTop;

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
      x = e.clientX - ox;
      y = e.clientY - oy;
      x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, x));
      y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, y));
      el.style.left  = x + 'px';
      el.style.top   = y + 'px';
      el.style.right = 'auto';
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
  }

  // ─────────────────────────────────────────────
  // 9. POLLING DOM — fallback quando sem WebSocket
  // ─────────────────────────────────────────────
  let lastDomPrice = null;
  let domPollCount = 0;

  function pollDOM() {
    detectCurrentAsset();

    // Tenta ler preço do DOM da Ebinex
    const priceSelectors = [
      '.chart-price', '.current-price', '.price-value', '[class*="price"]',
      '[class*="rate"]', '[class*="quote"]', '[data-price]',
      '.asset-rate', '.bid-price', '.ask-price',
    ];

    let found = null;
    for (const sel of priceSelectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const text = el.textContent.replace(/[^0-9.]/g, '');
          const val  = parseFloat(text);
          if (val > 0.0001) { found = val; break; }
        }
      } catch {}
      if (found) break;
    }

    if (found && found !== lastDomPrice) {
      lastDomPrice = found;
      const asset   = STATE.currentAsset || 'UNKNOWN';
      feedTick(asset, found, Date.now());
      STATE.dataSource = 'DOM (fallback)';
      domPollCount++;
    }
  }

  // ─────────────────────────────────────────────
  // 10. INIT
  // ─────────────────────────────────────────────
  function init() {
    // Cria HUD assim que o body existir
    if (document.body) {
      createHUD();
    } else {
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          createHUD();
        }
      });
      observer.observe(document.documentElement, { childList: true });
    }

    // Polling DOM a cada 500ms como fallback
    setInterval(pollDOM, 500);

    // Recalcula sinal a cada 5s mesmo sem novos ticks
    setInterval(() => {
      detectCurrentAsset();
      const asset = STATE.currentAsset;
      if (asset && STATE.candles[asset]?.length >= MIN_CANDLES) {
        recalcSignal(asset);
      } else {
        updateHUD();
      }
    }, 5000);

    console.log('[SMP] SignalMaster Pro Extension iniciado ✓');
  }

  // Aguarda document_start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expõe estado para debug (remover em produção)
  window.__SMP__ = STATE;

})();
