/**
 * SignalMaster Pro — Content Script (MAIN world)
 * v2.0 — Sinais rápidos (recálculo instantâneo por tick) + assertividade alta.
 * Protocolo TradingView (~m~) + fallback DOM Ebinex.
 */
(function () {
  'use strict';

  const MAX_CANDLES = 120;
  const CANDLE_MS   = 60_000;
  const MIN_CANDLES = 7;       // mínimo para RSI(5)+EMA(9)

  // ─────────────────────────────────────────────
  // ESTADO
  // ─────────────────────────────────────────────
  const STATE = {
    ticks: {},
    candles: {},
    currentAsset: null,
    lastSignal: null,
    wsConnected: false,
    wsMessages: 0,
    tickCount: 0,
    lastPrice: {},
    dataSource: 'aguardando...',
    tvSymbolMap: {},
  };

  // Debounce: recalcula no máximo 1x a cada 600ms por ativo
  const recalcTimers = {};
  function scheduleRecalc(asset) {
    clearTimeout(recalcTimers[asset]);
    recalcTimers[asset] = setTimeout(() => recalcSignal(asset), 600);
  }

  // ─────────────────────────────────────────────
  // 1. INTERCEPTAÇÃO WEBSOCKET
  // ─────────────────────────────────────────────
  const OriginalWS = window.WebSocket;
  window.WebSocket = function (...args) {
    const ws = new OriginalWS(...args);
    STATE.wsConnected = true;
    console.log('[SMP] WS interceptado:', args[0]);
    ws.addEventListener('message', (e) => {
      try { STATE.wsMessages++; handleWSMessage(e.data); } catch {}
    });
    return ws;
  };
  Object.assign(window.WebSocket, OriginalWS);
  window.WebSocket.prototype = OriginalWS.prototype;

  // ─────────────────────────────────────────────
  // 2. HANDLER WS
  // ─────────────────────────────────────────────
  function handleWSMessage(raw) {
    if (!raw || typeof raw !== 'string') return;
    if (raw.startsWith('~m~')) { parseTVMessage(raw); return; }
    let obj; try { obj = JSON.parse(raw); } catch { return; }
    tryGeneric(obj);
  }

  // ─────────────────────────────────────────────
  // 3. PROTOCOLO TRADINGVIEW ~m~LEN~m~PAYLOAD
  // ─────────────────────────────────────────────
  function parseTVMessage(raw) {
    const parts = raw.split(/~m~\d+~m~/g).filter(Boolean);
    for (const part of parts) {
      if (!part.startsWith('{')) continue;
      let obj; try { obj = JSON.parse(part); } catch { continue; }
      const { m, p } = obj;
      if (!m || !Array.isArray(p)) continue;

      // Preço em tempo real — qsd (tick único)
      if (m === 'qsd' && p[1]) {
        const d = p[1]; const v = d.v || d;
        const lp = v.lp || v.close || v.last_price;
        const sym = d.n || d.name;
        if (sym && lp) {
          const a = tv2asset(sym);
          if (a) { feedTick(a, lp, Date.now()); STATE.dataSource = 'TradingView ✓'; }
        }
      }

      // Preço em tempo real — du (múltiplos símbolos)
      if (m === 'du' && p[1] && typeof p[1] === 'object') {
        for (const [sym, v] of Object.entries(p[1])) {
          if (typeof v !== 'object') continue;
          const lp = v.lp || v.close || v.price;
          if (lp) {
            const a = tv2asset(sym);
            if (a) { feedTick(a, lp, Date.now()); STATE.dataSource = 'TradingView ✓'; }
          }
        }
      }

      // Velas históricas — timescale_update
      if ((m === 'timescale_update' || m === 'series_data' || m === 'series_loading') && p[1]) {
        parseTVBars(p[1]);
      }

      // Mapeamento de símbolo ativo
      if (m === 'quote_add_symbols') {
        for (const item of p) {
          if (typeof item === 'string' && item.includes(':')) {
            const a = tv2asset(item);
            if (a) {
              STATE.tvSymbolMap[item] = a;
              if (!STATE.currentAsset) { STATE.currentAsset = a; updateHUD(); }
            }
          }
        }
      }

      if (m === 'resolve_symbol' && typeof p[1] === 'string') {
        try {
          const info = JSON.parse(p[1]);
          const sym = info?.pro_name || info?.name;
          if (sym) { const a = tv2asset(sym); if (a && !STATE.currentAsset) STATE.currentAsset = a; }
        } catch {}
      }
    }
  }

  function parseTVBars(data) {
    if (!data || typeof data !== 'object') return;
    for (const series of Object.values(data)) {
      const bars = series?.s || series?.bars || series?.data;
      if (!Array.isArray(bars) || bars.length === 0) continue;
      const sym   = series?.symbol || series?.ticker;
      let asset   = sym ? tv2asset(sym) : STATE.currentAsset;
      if (!asset) asset = STATE.currentAsset;
      if (!asset) continue;

      const candles = [];
      for (const bar of bars) {
        const i = bar?.i;
        if (Array.isArray(i) && i.length >= 5) {
          const [t, o, h, l, c, v = 0] = i;
          candles.push({ o, h, l, c, v, t: t * 1000 });
        } else if (typeof bar === 'object' && bar.open) {
          const t = bar.time || bar.timestamp || 0;
          candles.push({ o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume || 0, t: t > 1e10 ? t : t * 1000 });
        }
      }

      if (candles.length > 0) {
        STATE.candles[asset] = candles.slice(-MAX_CANDLES);
        STATE.dataSource = 'TradingView Bars ✓';
        console.log(`[SMP] ${candles.length} velas → ${asset}`);
        scheduleRecalc(asset);
      }
    }
  }

  function tv2asset(sym) {
    const s = (sym || '').toUpperCase().replace(/^[^:]+:/, '');
    const MAP = {
      'BTCUSDT':'BTCUSD','BTCUSD':'BTCUSD','XBTUSD':'BTCUSD',
      'ETHUSDT':'ETHUSD','ETHUSD':'ETHUSD',
      'SOLUSDT':'SOLUSD','SOLUSD':'SOLUSD',
      'BNBUSDT':'BNBUSD','BNBUSD':'BNBUSD',
      'XRPUSDT':'XRPUSD','XRPUSD':'XRPUSD',
      'ADAUSDT':'ADAUSD','ADAUSD':'ADAUSD',
      'DOGEUSDT':'DOGEUSD','DOGEUSD':'DOGEUSD',
      'LTCUSDT':'LTCUSD','LTCUSD':'LTCUSD',
      'AVAXUSDT':'AVAXUSD','AVAXUSD':'AVAXUSD',
      'DOTUSDT':'DOTUSD','DOTUSD':'DOTUSD',
      'LINKUSDT':'LINKUSD','LINKUSD':'LINKUSD',
      'MATICUSDT':'MATICUSD','MATICUSD':'MATICUSD','POLUSDT':'MATICUSD','POLUSD':'MATICUSD',
    };
    return MAP[s] || null;
  }

  function tryGeneric(obj) {
    if (!obj || typeof obj !== 'object') return;
    const arr = Array.isArray(obj) ? obj : [obj];
    for (const item of arr) {
      const price = numField(item, ['price','rate','close','c','last','bid','lp','p','value']);
      const asset = strField(item, ['symbol','asset','pair','ticker','s','n','name']);
      if (price && asset) {
        const norm = tv2asset(asset) || normAsset(asset);
        if (norm) { feedTick(norm, price, Date.now()); STATE.dataSource = 'WebSocket ✓'; return; }
      }
      for (const v of Object.values(item)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) tryGeneric(v);
      }
    }
  }

  function numField(o, keys) {
    for (const k of keys) { const v = parseFloat(o[k]); if (!isNaN(v) && v > 0) return v; }
    return null;
  }
  function strField(o, keys) {
    for (const k of keys) { if (typeof o[k] === 'string' && o[k].length >= 3) return o[k]; }
    return null;
  }
  function normAsset(s) { return s.toUpperCase().replace(/[_\-\/]/g,'').replace('USDT','USD').replace('XBT','BTC'); }

  // ─────────────────────────────────────────────
  // 4. FEED DE TICKS → VELAS
  // ─────────────────────────────────────────────
  function feedTick(asset, price, ts) {
    if (!asset || !price || price <= 0) return;
    STATE.lastPrice[asset] = price;
    STATE.tickCount++;
    if (!STATE.currentAsset) STATE.currentAsset = asset;

    if (!STATE.ticks[asset]) STATE.ticks[asset] = [];
    STATE.ticks[asset].push({ price, ts: ts || Date.now() });

    const cutoff = Date.now() - 10 * CANDLE_MS;
    STATE.ticks[asset] = STATE.ticks[asset].filter(t => t.ts > cutoff);

    buildCandles(asset);

    if (STATE.currentAsset === asset) scheduleRecalc(asset);
  }

  function buildCandles(asset) {
    const ticks = STATE.ticks[asset] || [];
    if (!STATE.candles[asset]) STATE.candles[asset] = [];
    const groups = {};
    for (const t of ticks) {
      const min = Math.floor(t.ts / CANDLE_MS) * CANDLE_MS;
      if (!groups[min]) groups[min] = [];
      groups[min].push(t.price);
    }
    for (const [ms, prices] of Object.entries(groups)) {
      const t = parseInt(ms);
      const c = { o: prices[0], c: prices[prices.length-1], h: Math.max(...prices), l: Math.min(...prices), v: prices.length, t };
      const idx = STATE.candles[asset].findIndex(cd => cd.t === t);
      if (idx >= 0) STATE.candles[asset][idx] = c; else STATE.candles[asset].push(c);
    }
    STATE.candles[asset].sort((a,b) => a.t - b.t);
    if (STATE.candles[asset].length > MAX_CANDLES) STATE.candles[asset] = STATE.candles[asset].slice(-MAX_CANDLES);
  }

  // ─────────────────────────────────────────────
  // 5. MOTOR DE SINAIS — RÁPIDO E ASSERTIVO
  // ─────────────────────────────────────────────
  function ema(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let val = closes.slice(0, period).reduce((a,b) => a+b, 0) / period;
    for (let i = period; i < closes.length; i++) val = closes[i]*k + val*(1-k);
    return val;
  }

  function emaArr(closes, period) {
    if (closes.length < period) return [];
    const k = 2 / (period + 1);
    const out = [];
    let val = closes.slice(0, period).reduce((a,b) => a+b, 0) / period;
    out.push(val);
    for (let i = period; i < closes.length; i++) { val = closes[i]*k + val*(1-k); out.push(val); }
    return out;
  }

  function rsiValue(closes, period = 5) {
    if (closes.length < period + 1) return null;
    let g = 0, l = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const d = closes[i] - closes[i-1];
      if (d > 0) g += d; else l += -d;
    }
    const rs = l === 0 ? 100 : g / l;
    return 100 - 100 / (1 + rs);
  }

  function stoch(candles, kPeriod = 5) {
    if (candles.length < kPeriod) return null;
    const slice = candles.slice(-kPeriod);
    const hH = Math.max(...slice.map(c => c.h));
    const lL = Math.min(...slice.map(c => c.l));
    const cur = slice[slice.length - 1].c;
    if (hH === lL) return 50;
    return ((cur - lL) / (hH - lL)) * 100;
  }

  function roc(closes, period = 3) {
    if (closes.length < period + 1) return null;
    const prev = closes[closes.length - 1 - period];
    const cur  = closes[closes.length - 1];
    return prev !== 0 ? ((cur - prev) / prev) * 100 : null;
  }

  function bollingerPct(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const mean  = slice.reduce((a,b) => a+b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a,b) => a + (b-mean)**2, 0) / period);
    if (std === 0) return null;
    const cur = closes[closes.length - 1];
    return ((cur - (mean - 2*std)) / (4*std)) * 100;
  }

  function detectPatterns(candles) {
    const c = candles;
    const n = c.length;
    if (n < 3) return { call: 0, put: 0, labels: [] };
    const c0 = c[n-1], c1 = c[n-2], c2 = c[n-3];
    const body0 = Math.abs(c0.c - c0.o);
    const body1 = Math.abs(c1.c - c1.o);
    const range0 = c0.h - c0.l || 0.0001;
    const range1 = c1.h - c1.l || 0.0001;
    const bull0  = c0.c > c0.o;
    const bull1  = c1.c > c1.o;
    const bull2  = c2.c > c2.o;

    let call = 0, put = 0;
    const labels = [];

    // Engulfing altista
    if (!bull1 && bull0 && c0.o <= c1.c && c0.c >= c1.o && body0 > body1) {
      call += 3; labels.push('Engulfing▲');
    }
    // Engulfing baixista
    if (bull1 && !bull0 && c0.o >= c1.c && c0.c <= c1.o && body0 > body1) {
      put += 3; labels.push('Engulfing▼');
    }
    // Hammer (vela de inversão de fundo)
    const lShadow0 = bull0 ? (c0.o - c0.l) : (c0.c - c0.l);
    const uShadow0 = bull0 ? (c0.h - c0.c) : (c0.h - c0.o);
    if (!bull1 && lShadow0 > body0 * 2 && uShadow0 < body0 * 0.5) {
      call += 2; labels.push('Hammer▲');
    }
    // Shooting star (inversão de topo)
    if (bull1 && uShadow0 > body0 * 2 && lShadow0 < body0 * 0.5) {
      put += 2; labels.push('ShootingStar▼');
    }
    // Doji (indecisão — favorece quem tem mais força)
    if (body0 / range0 < 0.1) {
      labels.push('Doji');
      if (bull1) put++; else call++;
    }
    // 3 velas consecutivas
    if (bull0 && bull1 && bull2) { call += 2; labels.push('3Verdes▲'); }
    if (!bull0 && !bull1 && !bull2) { put += 2; labels.push('3Vermelhas▼'); }

    // Pin bar no suporte/resistência
    const pinCall = lShadow0 > range0 * 0.6 && !bull1;
    const pinPut  = uShadow0 > range0 * 0.6 && bull1;
    if (pinCall) { call += 2; labels.push('PinBar▲'); }
    if (pinPut)  { put  += 2; labels.push('PinBar▼'); }

    return { call, put, labels };
  }

  function emaSlope(emaSeries, lookback = 3) {
    if (emaSeries.length < lookback + 1) return 0;
    const prev = emaSeries[emaSeries.length - 1 - lookback];
    const curr = emaSeries[emaSeries.length - 1];
    return (curr - prev) / (prev || 1) * 100;
  }

  function recalcSignal(asset) {
    const candles = STATE.candles[asset] || [];

    if (candles.length < MIN_CANDLES) {
      STATE.lastSignal = {
        asset, dir: null, score: 0, quality: 'AGUARDANDO',
        reason: `Coletando velas... (${candles.length}/${MIN_CANDLES})`,
        indicators: { candles: candles.length }, ts: Date.now(),
      };
      updateHUD();
      broadcast();
      return;
    }

    const closes = candles.map(c => c.c);

    // ── Indicadores
    const e9    = ema(closes, 9);
    const e21   = ema(closes, Math.min(21, closes.length));
    const e50   = ema(closes, Math.min(50, closes.length));
    const rsiV  = rsiValue(closes, 5);
    const rsi14 = rsiValue(closes, Math.min(14, closes.length - 1));
    const stochV = stoch(candles, 5);
    const rocV  = roc(closes, 3);
    const bbPct = bollingerPct(closes, Math.min(14, closes.length));
    const pats  = detectPatterns(candles);

    const e9arr  = emaArr(closes, 9);
    const e21arr = emaArr(closes, Math.min(21, closes.length));

    const slope9  = emaSlope(e9arr, 3);
    const slope21 = emaSlope(e21arr, 3);

    // Último preço vs EMA
    const last = closes[closes.length - 1];
    const priceAbove9  = e9  && last > e9;
    const priceAbove21 = e21 && last > e21;

    // ── Pontuação
    let callPts = 0, putPts = 0;
    const reasons = [];

    // A) Tendência EMA (peso 3)
    if (e9 && e21) {
      if (e9 > e21)  { callPts += 3; reasons.push('EMA9>21▲'); }
      else            { putPts  += 3; reasons.push('EMA9<21▼'); }
    }

    // B) Inclinação EMA (qualidade da tendência, peso 2)
    if (slope9 > 0.02)  { callPts += 2; reasons.push('Slope▲'); }
    if (slope9 < -0.02) { putPts  += 2; reasons.push('Slope▼'); }

    // C) Preço vs EMAs (peso 2)
    if (priceAbove9 && priceAbove21) { callPts += 2; reasons.push('Preço>EMAs▲'); }
    if (!priceAbove9 && !priceAbove21) { putPts += 2; reasons.push('Preço<EMAs▼'); }

    // D) EMA50 (confirmação de tendência maior, peso 1)
    if (e50) {
      if (e21 && e21 > e50) { callPts++; reasons.push('Tendência▲'); }
      if (e21 && e21 < e50) { putPts++;  reasons.push('Tendência▼'); }
    }

    // E) RSI(5) — sinais rápidos (peso 3)
    if (rsiV !== null) {
      if (rsiV < 20)       { callPts += 4; reasons.push(`RSI ${rsiV.toFixed(0)} extremo↓`); }
      else if (rsiV < 35)  { callPts += 2; reasons.push(`RSI ${rsiV.toFixed(0)} sobrevend`); }
      else if (rsiV < 45)  { callPts += 1; }
      else if (rsiV > 80)  { putPts  += 4; reasons.push(`RSI ${rsiV.toFixed(0)} extremo↑`); }
      else if (rsiV > 65)  { putPts  += 2; reasons.push(`RSI ${rsiV.toFixed(0)} sobrecomp`); }
      else if (rsiV > 55)  { putPts  += 1; }
    }

    // F) RSI(14) — confirmação extra (peso 1)
    if (rsi14 !== null) {
      if (rsi14 < 40) callPts++;
      if (rsi14 > 60) putPts++;
    }

    // G) Estocástico (peso 2)
    if (stochV !== null) {
      if (stochV < 20)       { callPts += 2; reasons.push(`Stoch ${stochV.toFixed(0)}↓`); }
      else if (stochV < 35)  { callPts += 1; }
      else if (stochV > 80)  { putPts  += 2; reasons.push(`Stoch ${stochV.toFixed(0)}↑`); }
      else if (stochV > 65)  { putPts  += 1; }
    }

    // H) Bollinger Bands% (peso 2)
    if (bbPct !== null) {
      if (bbPct < 10)       { callPts += 3; reasons.push(`BB ${bbPct.toFixed(0)}% fundo`); }
      else if (bbPct < 25)  { callPts += 1; }
      else if (bbPct > 90)  { putPts  += 3; reasons.push(`BB ${bbPct.toFixed(0)}% topo`); }
      else if (bbPct > 75)  { putPts  += 1; }
    }

    // I) Rate of Change — momentum (peso 2)
    if (rocV !== null) {
      if (rocV > 0.15)       { callPts += 2; reasons.push(`Momentum▲ ${rocV.toFixed(2)}%`); }
      else if (rocV > 0.05)  { callPts += 1; }
      else if (rocV < -0.15) { putPts  += 2; reasons.push(`Momentum▼ ${Math.abs(rocV).toFixed(2)}%`); }
      else if (rocV < -0.05) { putPts  += 1; }
    }

    // J) Padrões de velas (peso 2-4 por padrão)
    callPts += pats.call;
    putPts  += pats.put;
    if (pats.labels.length > 0) reasons.push(...pats.labels);

    // ── Resultado
    const total = callPts + putPts || 1;
    const dir   = callPts > putPts ? 'CALL' : putPts > callPts ? 'PUT' : null;

    // Score ponderado: força relativa + base 50
    let score;
    if (dir === 'CALL')     score = 50 + Math.round((callPts / total) * 50);
    else if (dir === 'PUT') score = 50 + Math.round((putPts  / total) * 50);
    else                    score = 50;
    score = Math.max(30, Math.min(99, score));

    // Qualidade baseada na convergência de critérios
    const majority = Math.max(callPts, putPts);
    const conflict  = Math.min(callPts, putPts);
    const confluence = majority - conflict;   // diferença: quanto maior, mais consenso

    let quality;
    if (!dir)                         quality = 'INDECISÃO';
    else if (confluence >= 10 && score >= 78) quality = 'ELITE';
    else if (confluence >= 7  && score >= 70) quality = 'PREMIUM';
    else if (confluence >= 4  && score >= 62) quality = 'FORTE';
    else                                      quality = 'FRACO';

    STATE.lastSignal = {
      asset, dir, score, quality,
      reason: reasons.slice(0, 6).join(' · '),
      indicators: {
        ema9:   e9   ? e9.toFixed(2)   : '—',
        ema21:  e21  ? e21.toFixed(2)  : '—',
        rsi:    rsiV !== null ? rsiV.toFixed(1)   : '—',
        stoch:  stochV !== null ? stochV.toFixed(0) : '—',
        bb:     bbPct !== null ? bbPct.toFixed(0)+'%' : '—',
        mom:    rocV !== null ? (rocV > 0 ? '+' : '') + rocV.toFixed(2)+'%' : '—',
        price:  last.toFixed(last > 100 ? 2 : 5),
        candles: candles.length,
        pts: `${callPts}C/${putPts}P`,
      },
      ts: Date.now(),
    };

    updateHUD();
    broadcast();
  }

  function broadcast() {
    window.dispatchEvent(new CustomEvent('smp:signal', { detail: STATE.lastSignal }));
  }

  // ─────────────────────────────────────────────
  // 6. DETECÇÃO DE ATIVO + POLLING DOM
  // ─────────────────────────────────────────────
  function detectCurrentAsset() {
    const selectors = [
      '[class*="HeaderSymbol"]','[class*="assetName"]','[class*="symbol-name"]',
      '[class*="pair-name"]','[class*="instrument-name"]','.js-symbol-full',
      '.chart-header-symbol-name', '.tv-chart-toolbar__symbol',
    ];
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const t = el.textContent.trim().toUpperCase();
        const a = tv2asset(t.replace('/','')) || tv2asset(t);
        if (a) { STATE.currentAsset = a; return; }
      } catch {}
    }

    // Scan de texto: procura "BTC/USDT" em elementos leaf visíveis
    const SYMS = ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','LTC','AVAX','DOT','LINK','MATIC'];
    for (const sym of SYMS) {
      const candidates = document.querySelectorAll('span,div,h1,h2,h3,b,strong');
      for (const el of candidates) {
        if (el.children.length > 0 || !el.offsetParent) continue;
        const t = el.textContent.trim().toUpperCase();
        if (t === sym+'/USDT' || t === sym+'USDT' || t === sym+'/USD') {
          const a = tv2asset(sym+'USDT');
          if (a) { STATE.currentAsset = a; return; }
        }
      }
    }

    // Fallback: ativo com mais ticks
    const entries = Object.entries(STATE.ticks).filter(([,v]) => v.length > 0);
    if (entries.length > 0) {
      entries.sort((a,b) => b[1].length - a[1].length);
      STATE.currentAsset = entries[0][0];
    }
  }

  let _lastDomPrice = 0;
  function pollDOM() {
    detectCurrentAsset();
    const priceSelectors = [
      '.price-axis-last-value','.js-last-value',
      '[class*="lastPrice"]','[class*="last-price"]',
      '[class*="currentPrice"]','[class*="current-price"]',
      '.bid-price','.ask-price','.spot-price',
      '[class*="Rate"]','[class*="rate"]',
      '[class*="price-value"]','[class*="priceValue"]',
    ];
    for (const sel of priceSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el || !el.offsetParent) continue;
        const val = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
        if (val > 0 && val !== _lastDomPrice && Math.abs(val - (_lastDomPrice||val)) / val < 0.05) {
          _lastDomPrice = val;
          const asset = STATE.currentAsset;
          if (asset) { feedTick(asset, val, Date.now()); STATE.dataSource = 'DOM ✓'; }
          return;
        }
      } catch {}
    }

    // Busca de preço agressiva por valor próximo ao último preço
    if (STATE.currentAsset) {
      const lastP = STATE.lastPrice[STATE.currentAsset];
      if (lastP) {
        const els = document.querySelectorAll('span,div');
        for (const el of els) {
          if (el.children.length > 0 || !el.offsetParent) continue;
          const val = parseFloat(el.textContent.replace(/[^0-9.]/g, ''));
          if (val > 0 && Math.abs(val - lastP) / lastP < 0.005 && val !== _lastDomPrice) {
            _lastDomPrice = val;
            feedTick(STATE.currentAsset, val, Date.now());
            STATE.dataSource = 'DOM scan ✓';
            return;
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 7. HUD
  // ─────────────────────────────────────────────
  let hudEl = null;

  function injectStyles() {
    if (document.getElementById('smp-styles')) return;
    const s = document.createElement('style');
    s.id = 'smp-styles';
    s.textContent = `
      #smp-hud{
        position:fixed;top:20px;right:20px;z-index:2147483647;
        width:280px;font-family:'Inter','Segoe UI',sans-serif;font-size:13px;
        user-select:none;border-radius:16px;overflow:hidden;
        box-shadow:0 8px 40px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.07);
        background:rgba(6,6,16,.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
      }
      #smp-hud.mini #smp-body{display:none}
      #smp-hud.mini{width:170px}
      #smp-head{
        display:flex;align-items:center;justify-content:space-between;
        padding:10px 14px;background:rgba(255,255,255,.04);
        border-bottom:1px solid rgba(255,255,255,.06);cursor:move;
      }
      #smp-title{font-weight:800;font-size:10px;color:#00ff88;letter-spacing:.8px;text-transform:uppercase}
      #smp-ctrl{display:flex;gap:5px}
      #smp-ctrl button{background:rgba(255,255,255,.07);border:none;border-radius:4px;color:#555;font-size:11px;cursor:pointer;padding:1px 6px}
      #smp-ctrl button:hover{background:rgba(255,255,255,.15);color:#fff}
      #smp-body{padding:14px}
      #smp-assetrow{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      #smp-asset{color:#fff;font-weight:800;font-size:14px}
      #smp-tf{color:#333;font-size:10px}
      /* Sinal principal */
      #smp-sigblock{
        display:flex;align-items:center;justify-content:space-between;
        margin-bottom:12px;padding:12px;border-radius:12px;
        background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
      }
      #smp-dir{font-size:34px;font-weight:900;line-height:1;letter-spacing:-1px;min-width:90px}
      #smp-dir.call{color:#00ff88;text-shadow:0 0 24px rgba(0,255,136,.5)}
      #smp-dir.put {color:#ff3355;text-shadow:0 0 24px rgba(255,51,85,.5)}
      #smp-dir.wait{color:#444;font-size:15px;font-weight:600}
      #smp-scoreblk{text-align:right}
      #smp-score{font-size:28px;font-weight:900;color:#fff;line-height:1}
      #smp-qual{
        font-size:9px;font-weight:800;letter-spacing:1px;padding:3px 8px;
        border-radius:5px;display:inline-block;margin-top:4px;
      }
      .qe{background:rgba(255,215,0,.18);color:#ffd700;border:1px solid rgba(255,215,0,.35)}
      .qp{background:rgba(168,85,247,.2);color:#c084fc;border:1px solid rgba(168,85,247,.35)}
      .qf{background:rgba(0,255,136,.12);color:#00ff88;border:1px solid rgba(0,255,136,.3)}
      .qw{background:rgba(255,165,0,.12);color:#ffa500;border:1px solid rgba(255,165,0,.3)}
      .qi{background:rgba(100,100,255,.1);color:#6699ff;border:1px solid rgba(100,100,255,.2)}
      .qa{background:rgba(80,80,80,.15);color:#444;border:1px solid rgba(80,80,80,.2)}
      /* Indicadores em grid */
      #smp-inds{
        background:rgba(255,255,255,.025);border-radius:9px;
        padding:10px;margin-bottom:10px;
        display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;
      }
      .si{font-size:10px;display:flex;justify-content:space-between;align-items:center}
      .sl{color:#333;font-size:9px}.sv{color:#888;font-weight:700}
      .sv.bull{color:#00ff88}.sv.bear{color:#ff3355}
      /* Padrões + razão */
      #smp-reason{
        font-size:10px;color:#444;line-height:1.5;margin-bottom:10px;
        border-top:1px solid rgba(255,255,255,.04);padding-top:9px;
      }
      /* Barra de confiança */
      #smp-confbar{
        height:4px;border-radius:2px;background:rgba(255,255,255,.05);
        margin-bottom:10px;overflow:hidden;
      }
      #smp-confill{height:100%;border-radius:2px;transition:width .4s,background .4s}
      /* Status */
      #smp-status{display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#333}
      #smp-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#222;margin-right:4px;vertical-align:middle}
      #smp-dot.ok{background:#00ff88;box-shadow:0 0 5px #00ff88;animation:smpP 2s infinite}
      #smp-dot.wait{background:#ffa500;animation:smpP 1s infinite}
      @keyframes smpP{0%,100%{opacity:1}50%{opacity:.3}}
      #smp-reopen{
        position:fixed;right:16px;top:16px;z-index:2147483646;
        background:#00ff88;color:#000;border:none;border-radius:8px;
        padding:8px 14px;font-size:11px;font-weight:800;cursor:pointer;
        box-shadow:0 4px 12px rgba(0,255,136,.45);display:none;letter-spacing:.5px;
      }
    `;
    document.head.appendChild(s);
  }

  function createHUD() {
    if (document.getElementById('smp-hud')) { hudEl = document.getElementById('smp-hud'); return; }
    injectStyles();
    hudEl = document.createElement('div');
    hudEl.id = 'smp-hud';
    hudEl.innerHTML = `
      <div id="smp-head">
        <span id="smp-title">⚡ SignalMaster Pro</span>
        <div id="smp-ctrl"><button id="smp-min">—</button><button id="smp-close">✕</button></div>
      </div>
      <div id="smp-body">
        <div id="smp-assetrow">
          <span id="smp-asset">—</span><span id="smp-tf">M1 · Ebinex</span>
        </div>
        <div id="smp-sigblock">
          <div id="smp-dir" class="wait">AGUARD.</div>
          <div id="smp-scoreblk">
            <div id="smp-score">—</div>
            <div id="smp-qual" class="qa">—</div>
          </div>
        </div>
        <div id="smp-confbar"><div id="smp-confill"></div></div>
        <div id="smp-inds">
          <div class="si"><span class="sl">EMA 9/21</span><span class="sv" id="si-ema">—</span></div>
          <div class="si"><span class="sl">RSI(5)</span><span class="sv" id="si-rsi">—</span></div>
          <div class="si"><span class="sl">Stoch(5)</span><span class="sv" id="si-stoch">—</span></div>
          <div class="si"><span class="sl">BB%</span><span class="sv" id="si-bb">—</span></div>
          <div class="si"><span class="sl">Momentum</span><span class="sv" id="si-mom">—</span></div>
          <div class="si"><span class="sl">Pts C/P</span><span class="sv" id="si-pts">—</span></div>
        </div>
        <div id="smp-reason">Aguardando dados do mercado...</div>
        <div id="smp-status">
          <span><span id="smp-dot" class="wait"></span><span id="smp-src">conectando...</span></span>
          <span id="smp-time">—</span>
        </div>
      </div>
    `;
    document.body.appendChild(hudEl);
    makeDraggable(hudEl, document.getElementById('smp-head'));

    document.getElementById('smp-min').onclick   = () => hudEl.classList.toggle('mini');
    document.getElementById('smp-close').onclick = () => {
      hudEl.style.display = 'none';
      document.getElementById('smp-reopen').style.display = 'block';
    };

    const reopen = document.createElement('button');
    reopen.id = 'smp-reopen'; reopen.textContent = '⚡ SMP';
    reopen.onclick = () => { hudEl.style.display = 'block'; reopen.style.display = 'none'; };
    document.body.appendChild(reopen);
  }

  const G = (id) => document.getElementById(id);

  function updateHUD() {
    if (!hudEl) return;
    const sig   = STATE.lastSignal;
    const asset = STATE.currentAsset;

    if (G('smp-asset')) G('smp-asset').textContent = asset || '—';
    if (!sig) return;

    // Direção
    const dirEl = G('smp-dir');
    if (dirEl) {
      dirEl.textContent = sig.dir || (sig.quality === 'AGUARDANDO' ? 'AGUARD.' : 'INDEC.');
      dirEl.className   = sig.dir === 'CALL' ? 'call' : sig.dir === 'PUT' ? 'put' : 'wait';
    }
    if (G('smp-score')) G('smp-score').textContent = sig.dir ? sig.score + '%' : '—';

    // Qualidade
    const qEl = G('smp-qual');
    if (qEl) {
      qEl.textContent = sig.quality || '—';
      const qm = { ELITE:'qe', PREMIUM:'qp', FORTE:'qf', FRACO:'qw', INDECISÃO:'qi', AGUARDANDO:'qa' };
      qEl.className = qm[sig.quality] || 'qa';
    }

    // Barra de confiança
    const fill = G('smp-confill');
    if (fill && sig.score) {
      fill.style.width = sig.score + '%';
      fill.style.background = sig.score >= 78 ? '#ffd700' : sig.score >= 70 ? '#c084fc' : sig.score >= 62 ? '#00ff88' : '#ffa500';
    }

    // Indicadores
    const ind = sig.indicators || {};
    if (G('si-ema')) {
      const e9 = parseFloat(ind.ema9), e21 = parseFloat(ind.ema21);
      const up = !isNaN(e9) && !isNaN(e21) && e9 > e21;
      G('si-ema').textContent = (!isNaN(e9) && !isNaN(e21)) ? (up ? '▲ alta' : '▼ baixa') : '—';
      G('si-ema').className   = 'sv ' + (!isNaN(e9) ? (up ? 'bull' : 'bear') : '');
    }
    setInd('si-rsi',   ind.rsi,   v => { const r=parseFloat(v); return !isNaN(r) ? (r<40?'bull':r>60?'bear':'') : ''; });
    setInd('si-stoch', ind.stoch, v => { const r=parseFloat(v); return !isNaN(r) ? (r<35?'bull':r>65?'bear':'') : ''; });
    setInd('si-bb',    ind.bb,    v => { const r=parseFloat(v); return !isNaN(r) ? (r<25?'bull':r>75?'bear':'') : ''; });
    setInd('si-mom',   ind.mom,   v => v && v.startsWith('+') ? 'bull' : v && v.startsWith('-') ? 'bear' : '');
    if (G('si-pts'))  G('si-pts').textContent = ind.pts || '—';

    if (G('smp-reason')) G('smp-reason').textContent = sig.reason || '—';

    // Status
    const hasData = STATE.tickCount > 0 || Object.values(STATE.candles).some(v => v.length > 0);
    const dot = G('smp-dot'); const src = G('smp-src');
    if (dot) dot.className = hasData ? 'ok' : 'wait';
    if (src) src.textContent = STATE.dataSource;
    if (G('smp-time') && sig.ts) G('smp-time').textContent = new Date(sig.ts).toLocaleTimeString('pt-BR');
  }

  function setInd(id, val, classFn) {
    const el = G(id);
    if (!el) return;
    el.textContent = val || '—';
    el.className   = 'sv ' + (val && val !== '—' ? (classFn(val) || '') : '');
  }

  // ─────────────────────────────────────────────
  // 8. DRAG & DROP
  // ─────────────────────────────────────────────
  function makeDraggable(el, handle) {
    let ox=0, oy=0;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      ox = e.clientX - el.offsetLeft; oy = e.clientY - el.offsetTop;
      const onMove = (e) => {
        el.style.left  = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  e.clientX-ox)) + 'px';
        el.style.top   = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY-oy)) + 'px';
        el.style.right = 'auto';
      };
      const onUp = () => { document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  // ─────────────────────────────────────────────
  // 9. INIT
  // ─────────────────────────────────────────────
  function init() {
    const ready = () => {
      if (!document.body) { setTimeout(ready, 100); return; }
      createHUD();
    };
    ready();

    // Polling DOM — 250ms
    setInterval(pollDOM, 250);

    // Sinal de fallback: recalcula a cada 8s mesmo sem novo tick
    setInterval(() => {
      detectCurrentAsset();
      const a = STATE.currentAsset;
      if (a) recalcSignal(a);
    }, 8000);

    // Diagnóstico — 5s por 30s
    let n = 0;
    const diag = setInterval(() => {
      console.log(`[SMP] #${++n}`, {
        asset: STATE.currentAsset, ticks: STATE.tickCount,
        ws: STATE.wsMessages, dataSource: STATE.dataSource,
        candles: Object.fromEntries(Object.entries(STATE.candles).map(([k,v])=>[k,v.length])),
      });
      if (n >= 6) clearInterval(diag);
    }, 5000);

    console.log('[SMP] v2.0 iniciado ✓ (rápido + assertivo)');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.__SMP__ = STATE;
})();
