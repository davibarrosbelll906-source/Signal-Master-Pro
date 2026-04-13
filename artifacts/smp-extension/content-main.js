/**
 * SignalMaster Pro — Content Script (MAIN world)
 * Suporte completo ao protocolo TradingView (~m~) + fallback DOM Ebinex.
 * app.ebinex.com/traderoom
 */
(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // ESTADO GLOBAL
  // ─────────────────────────────────────────────
  const STATE = {
    ticks: {},
    candles: {},
    currentAsset: null,
    lastSignal: null,
    wsConnected: false,
    wsMessageCount: 0,
    dataSource: 'aguardando...',
    tickCount: 0,
    lastPrice: {},
    tvSymbolMap: {},   // { 'BINANCE:BTCUSDT' → 'BTCUSD' }
  };

  const MAX_CANDLES = 120;
  const CANDLE_MS   = 60_000;
  const MIN_CANDLES = 15;

  // ─────────────────────────────────────────────
  // 1. INTERCEPTAÇÃO WEBSOCKET
  // ─────────────────────────────────────────────
  const OriginalWS = window.WebSocket;

  window.WebSocket = function (...args) {
    const ws = new OriginalWS(...args);
    STATE.wsConnected = true;
    console.log('[SMP] WS interceptado:', args[0]);

    ws.addEventListener('message', (event) => {
      try {
        STATE.wsMessageCount++;
        handleWSMessage(event.data);
      } catch (e) {
        console.warn('[SMP] WS parse error:', e.message);
      }
    });

    return ws;
  };
  Object.assign(window.WebSocket, OriginalWS);
  window.WebSocket.prototype = OriginalWS.prototype;

  // ─────────────────────────────────────────────
  // 2. HANDLER PRINCIPAL DE MENSAGENS WS
  // ─────────────────────────────────────────────
  function handleWSMessage(raw) {
    if (!raw || typeof raw !== 'string') return;

    // ── PROTOCOLO TRADINGVIEW: ~m~LENGTH~m~PAYLOAD
    if (raw.startsWith('~m~')) {
      parseTradingViewMessage(raw);
      return;
    }

    // ── JSON simples
    let obj;
    try { obj = JSON.parse(raw); } catch { return; }

    const result = parseGenericJSON(obj);
    if (result) {
      feedTick(result.asset, result.price, result.ts);
      STATE.dataSource = 'WebSocket ✓';
    }

    // ── Pode ter múltiplos objetos numa mensagem (array)
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const r = parseGenericJSON(item);
        if (r) { feedTick(r.asset, r.price, r.ts); STATE.dataSource = 'WebSocket ✓'; }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 3. PARSER TRADINGVIEW  ~m~LEN~m~PAYLOAD
  // ─────────────────────────────────────────────
  function parseTradingViewMessage(raw) {
    // Uma mensagem pode ter múltiplos pacotes: ~m~5~m~hello~m~10~m~{"m":"..."}
    const packets = raw.split('~m~').filter((s, i) => i % 2 === 0 && s !== '');
    // Pega os payloads (índices ímpares após o split pelo delimitador)
    const parts = raw.split(/~m~\d+~m~/g).filter(Boolean);

    for (const part of parts) {
      if (!part || !part.startsWith('{')) continue;
      let obj;
      try { obj = JSON.parse(part); } catch { continue; }

      const m  = obj.m;
      const p  = obj.p;

      if (!m || !Array.isArray(p)) continue;

      // ── qsd: quote symbol data (preço em tempo real)
      // {"m":"qsd","p":["qs_xxx",{"n":"BINANCE:BTCUSDT","s":"ok","v":{"lp":72471,"ch":100,...}}]}
      if (m === 'qsd' && p[1]) {
        const data = p[1];
        const sym  = data.n || data.name;
        const v    = data.v || data;
        const lp   = v.lp || v.last_price || v.close;
        if (sym && lp) {
          const asset = tvSymToAsset(sym);
          if (asset) { feedTick(asset, lp, Date.now()); STATE.dataSource = 'TradingView WS ✓'; }
        }
      }

      // ── du: data update (tick em tempo real)
      // {"m":"du","p":["qs_xxx",{"BINANCE:BTCUSDT":{"lp":72471,...}}]}
      if (m === 'du' && p[1] && typeof p[1] === 'object') {
        for (const [sym, v] of Object.entries(p[1])) {
          if (typeof v !== 'object') continue;
          const lp = v.lp || v.last_price || v.close || v.price;
          if (lp) {
            const asset = tvSymToAsset(sym);
            if (asset) { feedTick(asset, lp, Date.now()); STATE.dataSource = 'TradingView WS ✓'; }
          }
        }
      }

      // ── timescale_update: dados históricos de velas OHLCV
      // {"m":"timescale_update","p":["cs_xxx",{"s1":{"s":[{"i":[ts,o,h,l,c,v]},...],"ns":...}}]}
      if ((m === 'timescale_update' || m === 'series_loading') && p[1]) {
        parseTVBars(p[1]);
      }

      // ── cr (series complete): velas completas
      if (m === 'series_data' && p[1]) {
        parseTVBars(p[1]);
      }

      // ── quote_add_symbols: registra mapeamento de símbolo
      // {"m":"quote_add_symbols","p":["qs_xxx","BINANCE:BTCUSDT",...]}
      if (m === 'quote_add_symbols') {
        for (const item of p) {
          if (typeof item === 'string' && item.includes(':')) {
            const asset = tvSymToAsset(item);
            if (asset) {
              STATE.tvSymbolMap[item] = asset;
              if (!STATE.currentAsset) STATE.currentAsset = asset;
              updateHUD();
            }
          }
        }
      }

      // ── resolve_symbol: confirma símbolo ativo
      if (m === 'resolve_symbol' && p[1] && typeof p[1] === 'string') {
        const info = JSON.parse(p[1]);
        const sym  = info?.pro_name || info?.name;
        if (sym) {
          const asset = tvSymToAsset(sym);
          if (asset && !STATE.currentAsset) { STATE.currentAsset = asset; updateHUD(); }
        }
      }
    }
  }

  // Extrai velas de mensagens timescale_update
  function parseTVBars(data) {
    if (!data || typeof data !== 'object') return;

    for (const [seriesKey, series] of Object.entries(data)) {
      const bars = series?.s || series?.bars || series?.data;
      if (!Array.isArray(bars) || bars.length === 0) continue;

      // Detecta símbolo pela chave ou campo
      const sym   = series?.symbol || series?.ticker || series?.name;
      let asset   = sym ? tvSymToAsset(sym) : STATE.currentAsset;
      if (!asset) asset = STATE.currentAsset;
      if (!asset) continue;

      const candles = [];
      for (const bar of bars) {
        // Formato array: { i: [ts, o, h, l, c, v] }
        const i = bar?.i || bar;
        if (Array.isArray(i) && i.length >= 5) {
          const [t, o, h, l, c, v = 0] = i;
          candles.push({ o, h, l, c, v, t: t * 1000 });
        }
        // Formato objeto
        else if (typeof bar === 'object') {
          const o  = bar.open  || bar.o;
          const h  = bar.high  || bar.h;
          const l  = bar.low   || bar.l;
          const c  = bar.close || bar.c || bar.last;
          const v  = bar.volume || bar.v || 0;
          const t  = (bar.time || bar.timestamp || bar.t || 0);
          if (o && h && l && c) candles.push({ o, h, l, c, v, t: t > 1e10 ? t : t * 1000 });
        }
      }

      if (candles.length > 0) {
        STATE.candles[asset] = candles.slice(-MAX_CANDLES);
        STATE.dataSource = 'TradingView Bars ✓';
        console.log(`[SMP] ${candles.length} velas TradingView → ${asset}`);
        recalcSignal(asset);
      }
    }
  }

  // Converte símbolo TradingView → par Ebinex
  function tvSymToAsset(sym) {
    if (!sym) return null;
    const s = sym.toUpperCase().replace(/^[\w]+:/, ''); // remove exchange prefix

    const MAP = {
      'BTCUSDT': 'BTCUSD', 'BTCUSD': 'BTCUSD', 'XBTUSD': 'BTCUSD',
      'ETHUSDT': 'ETHUSD', 'ETHUSD': 'ETHUSD',
      'SOLUSDT': 'SOLUSD', 'SOLUSD': 'SOLUSD',
      'BNBUSDT': 'BNBUSD', 'BNBUSD': 'BNBUSD',
      'XRPUSDT': 'XRPUSD', 'XRPUSD': 'XRPUSD',
      'ADAUSDT': 'ADAUSD', 'ADAUSD': 'ADAUSD',
      'DOGEUSDT':'DOGEUSD','DOGEUSD':'DOGEUSD',
      'LTCUSDT': 'LTCUSD', 'LTCUSD': 'LTCUSD',
      'AVAXUSDT':'AVAXUSD','AVAXUSD':'AVAXUSD',
      'DOTUSDT': 'DOTUSD', 'DOTUSD': 'DOTUSD',
      'LINKUSDT':'LINKUSD','LINKUSD':'LINKUSD',
      'MATICUSDT':'MATICUSD','MATICUSD':'MATICUSD','POLUSDT':'MATICUSD',
    };
    return MAP[s] || null;
  }

  // ─────────────────────────────────────────────
  // 4. PARSER JSON GENÉRICO (outros formatos)
  // ─────────────────────────────────────────────
  function parseGenericJSON(obj) {
    if (!obj || typeof obj !== 'object') return null;

    const price = extractNum(obj, ['price','rate','close','c','last','bid','ask','lp','last_price','p','value']);
    const asset = extractStr(obj, ['symbol','asset','pair','instrument','ticker','s','n','name','market']);
    const ts    = extractNum(obj, ['timestamp','time','ts','t','date']) || Date.now();

    if (price && price > 0 && asset) {
      const norm = tvSymToAsset(asset) || normalizeAsset(asset);
      if (norm) return { asset: norm, price, ts };
    }

    // Recursão em campos aninhados
    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const r = parseGenericJSON(val);
        if (r) return r;
      }
    }
    return null;
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
    return s.toUpperCase().replace(/[_\-\/]/g, '').replace('USDT','USD').replace('XBT','BTC');
  }

  // ─────────────────────────────────────────────
  // 5. CONSTRUÇÃO DE VELAS A PARTIR DE TICKS
  // ─────────────────────────────────────────────
  function feedTick(asset, price, ts) {
    if (!asset || !price || price <= 0) return;

    STATE.lastPrice[asset] = price;
    STATE.tickCount++;
    if (!STATE.currentAsset) { STATE.currentAsset = asset; }

    if (!STATE.ticks[asset]) STATE.ticks[asset] = [];

    STATE.ticks[asset].push({ price, ts: ts || Date.now() });

    // Mantém só os últimos 5 minutos de ticks
    const cutoff = Date.now() - 5 * CANDLE_MS;
    STATE.ticks[asset] = STATE.ticks[asset].filter(t => t.ts > cutoff);

    buildCandlesFromTicks(asset);

    if (STATE.currentAsset === asset) recalcSignal(asset);
  }

  function buildCandlesFromTicks(asset) {
    const ticks = STATE.ticks[asset] || [];
    if (ticks.length === 0) return;

    if (!STATE.candles[asset]) STATE.candles[asset] = [];

    const groups = {};
    for (const tick of ticks) {
      const min = Math.floor(tick.ts / CANDLE_MS) * CANDLE_MS;
      if (!groups[min]) groups[min] = [];
      groups[min].push(tick.price);
    }

    for (const [minStr, prices] of Object.entries(groups)) {
      const t = parseInt(minStr);
      const candle = {
        o: prices[0],
        c: prices[prices.length - 1],
        h: Math.max(...prices),
        l: Math.min(...prices),
        v: prices.length,
        t,
      };
      const idx = STATE.candles[asset].findIndex(cd => cd.t === t);
      if (idx >= 0) STATE.candles[asset][idx] = candle;
      else STATE.candles[asset].push(candle);
    }

    STATE.candles[asset].sort((a, b) => a.t - b.t);
    if (STATE.candles[asset].length > MAX_CANDLES) {
      STATE.candles[asset] = STATE.candles[asset].slice(-MAX_CANDLES);
    }
  }

  // ─────────────────────────────────────────────
  // 6. DETECÇÃO DE ATIVO NA TELA (Ebinex)
  // ─────────────────────────────────────────────
  function detectCurrentAsset() {
    // Ebinex: cabeçalho mostra "BTC/USDT" ou "ETH/USDT" etc.
    const ebinexSelectors = [
      // Header do traderoom
      '.trading-header .asset-name',
      '.header-symbol',
      '.instrument-selector span',
      '.asset-info .name',
      '[class*="HeaderSymbol"]',
      '[class*="assetName"]',
      '[class*="symbol-name"]',
      '[class*="pair-name"]',
      '[class*="instrument-name"]',
      // Seletor genérico para o texto BTC/USDT no topo
      '.tv-chart-toolbar__symbol',
      '[data-symbol]',
      // TradingView toolbar
      '.chart-toolbar .symbol',
      '.js-symbol-full',
      '.chart-header-symbol-name',
    ];

    for (const sel of ebinexSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const text = el.textContent.trim().toUpperCase();
        const asset = tvSymToAsset(text.replace('/','')) || tvSymToAsset(text) ;
        if (asset) { STATE.currentAsset = asset; return; }
      } catch {}
    }

    // Lê texto de todos elementos com "BTC", "ETH" etc. em texto visível
    const SYMBOLS = ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','LTC','AVAX','DOT','LINK','MATIC','POL'];
    for (const sym of SYMBOLS) {
      const els = document.querySelectorAll(`*`);
      for (const el of els) {
        if (el.children.length > 0) continue; // só leaf nodes
        const text = el.textContent.trim().toUpperCase();
        if ((text === sym + '/USDT' || text === sym + 'USDT' || text === sym + '/USD') && el.offsetParent) {
          const asset = tvSymToAsset(sym + 'USDT') || tvSymToAsset(sym + 'USD');
          if (asset) { STATE.currentAsset = asset; return; }
        }
      }
    }

    // Fallback: ativo com mais ticks recentes
    const entries = Object.entries(STATE.ticks).filter(([,v]) => v.length > 0);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1].length - a[1].length);
      STATE.currentAsset = entries[0][0];
    }
  }

  // ─────────────────────────────────────────────
  // 7. POLLING DOM — lê preço direto da tela Ebinex
  // ─────────────────────────────────────────────
  let lastDomPrice = 0;
  let lastDomAsset = null;

  function pollDOM() {
    detectCurrentAsset();

    // Selectors específicos para Ebinex / TradingView
    const priceSelectors = [
      // TradingView last price na escala de preço (barra amarela/vermelha)
      '.price-axis-last-value',
      '.js-last-value',
      '[class*="lastPrice"]',
      '[class*="last-price"]',
      '[class*="currentPrice"]',
      '[class*="current-price"]',
      // Ebinex UI
      '.bid-price', '.ask-price', '.spot-price',
      '.chart-status-row .value',
      '[class*="price-value"]',
      '[class*="priceValue"]',
      // TradingView tooltip / crosshair (quando mouse sobre gráfico)
      '.chart-tooltip-price',
      // Ebinex traderoom rate
      '[class*="Rate"]',
      '[class*="rate"]',
    ];

    for (const sel of priceSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el || !el.offsetParent) continue;
        const raw = el.textContent.replace(/[^0-9.,]/g, '').replace(',', '');
        const val = parseFloat(raw);
        if (val > 0.001 && Math.abs(val - lastDomPrice) / (lastDomPrice || 1) < 0.2) {
          if (val !== lastDomPrice) {
            lastDomPrice = val;
            const asset = STATE.currentAsset;
            if (asset) {
              feedTick(asset, val, Date.now());
              STATE.dataSource = 'DOM Ebinex ✓';
            }
          }
          return;
        }
      } catch {}
    }

    // Busca mais agressiva: encontra todos os números na tela que parecem preço do ativo atual
    if (STATE.currentAsset) {
      const price = STATE.lastPrice[STATE.currentAsset];
      if (price) {
        // Procura elemento com número próximo ao último preço conhecido (±1%)
        const all = document.querySelectorAll('span, div, p');
        for (const el of all) {
          if (el.children.length > 0 || !el.offsetParent) continue;
          const raw = el.textContent.replace(/[^0-9.]/g, '');
          const val = parseFloat(raw);
          if (val > 0 && Math.abs(val - price) / price < 0.01 && val !== lastDomPrice) {
            lastDomPrice = val;
            feedTick(STATE.currentAsset, val, Date.now());
            STATE.dataSource = 'DOM scan ✓';
            return;
          }
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 8. MOTOR DE SINAIS
  // ─────────────────────────────────────────────
  function ema(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) val = closes[i] * k + val * (1 - k);
    return val;
  }

  function rsi(closes, period = 7) {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const d = closes[i] - closes[i - 1];
      if (d > 0) gains += d; else losses += -d;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    return 100 - 100 / (1 + rs);
  }

  function macdLine(closes) {
    const e12 = ema(closes, 12);
    const e26 = ema(closes, 26);
    if (!e12 || !e26) return null;
    return { value: e12 - e26, bullish: e12 > e26 };
  }

  function bollingerBands(closes, period = 20) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const mean  = slice.reduce((a, b) => a + b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    if (std === 0) return null;
    const upper = mean + 2 * std;
    const lower = mean - 2 * std;
    const cur   = closes[closes.length - 1];
    return { pct: Math.max(0, Math.min(100, ((cur - lower) / (upper - lower)) * 100)), upper, lower, mean };
  }

  function recalcSignal(asset) {
    const candles = STATE.candles[asset] || [];

    if (candles.length < MIN_CANDLES) {
      STATE.lastSignal = {
        asset, dir: null, score: 0, quality: 'AGUARDANDO',
        reason: `Coletando velas... (${candles.length}/${MIN_CANDLES})`,
        indicators: { candles: candles.length },
        ts: Date.now(),
      };
      updateHUD();
      window.dispatchEvent(new CustomEvent('smp:signal', { detail: STATE.lastSignal }));
      return;
    }

    const closes = candles.map(c => c.c);
    const last   = closes[closes.length - 1];

    const e9   = ema(closes, 9);
    const e21  = ema(closes, 21);
    const e50  = ema(closes, Math.min(50, closes.length));
    const rsiV = rsi(closes, 7);
    const macd = macdLine(closes);
    const bb   = bollingerBands(closes, Math.min(20, closes.length));

    const c0 = candles[candles.length - 1];
    const c1 = candles[candles.length - 2] || c0;

    let callV = 0, putV = 0;
    const reasons = [];

    // EMA trend
    if (e9 && e21) {
      if (e9 > e21) { callV += 2; reasons.push('EMA9>21▲'); }
      else           { putV  += 2; reasons.push('EMA9<21▼'); }
    }
    if (e21 && e50) {
      if (e21 > e50) { callV++; reasons.push('EMA21>50▲'); }
      else            { putV++;  reasons.push('EMA21<50▼'); }
    }
    if (e9 && last > e9)  callV++;
    if (e9 && last < e9)  putV++;

    // RSI
    if (rsiV !== null) {
      if (rsiV < 25)       { callV += 3; reasons.push(`RSI ${rsiV.toFixed(0)}↓ sobrevendido`); }
      else if (rsiV < 40)  { callV++;    reasons.push(`RSI ${rsiV.toFixed(0)} baixo`); }
      else if (rsiV > 75)  { putV  += 3; reasons.push(`RSI ${rsiV.toFixed(0)}↑ sobrecomprado`); }
      else if (rsiV > 60)  { putV++;     reasons.push(`RSI ${rsiV.toFixed(0)} alto`); }
    }

    // MACD
    if (macd) {
      if (macd.bullish) { callV++; reasons.push('MACD▲'); }
      else               { putV++;  reasons.push('MACD▼'); }
    }

    // Bollinger Bands
    if (bb) {
      if (bb.pct < 15)      { callV += 2; reasons.push(`BB ${bb.pct.toFixed(0)}% fundo`); }
      else if (bb.pct > 85) { putV  += 2; reasons.push(`BB ${bb.pct.toFixed(0)}% topo`); }
    }

    // Padrão de vela
    const bullCandle = c0.c > c0.o;
    const prevBull   = c1.c > c1.o;
    if (bullCandle && prevBull)   { callV++; reasons.push('Velas verdes'); }
    if (!bullCandle && !prevBull) { putV++;  reasons.push('Velas vermelhas'); }

    const total = callV + putV || 1;
    const dir   = callV > putV ? 'CALL' : putV > callV ? 'PUT' : null;

    let score;
    if (dir === 'CALL')      score = 50 + Math.round((callV / total) * 50);
    else if (dir === 'PUT')  score = 50 + Math.round((putV  / total) * 50);
    else                     score = 50;
    score = Math.max(30, Math.min(99, score));

    const quality = score >= 80 ? 'ELITE' : score >= 72 ? 'PREMIUM' : score >= 66 ? 'FORTE' : 'FRACO';

    STATE.lastSignal = {
      asset, dir, score, quality,
      reason: reasons.join(' · '),
      indicators: {
        ema9:  e9  ? e9.toFixed(2)  : '—',
        ema21: e21 ? e21.toFixed(2) : '—',
        ema50: e50 ? e50.toFixed(2) : '—',
        rsi:   rsiV !== null ? rsiV.toFixed(1) : '—',
        macd:  macd ? (macd.bullish ? '▲' : '▼') : '—',
        bb:    bb ? bb.pct.toFixed(0) + '%' : '—',
        price: last.toFixed(last > 100 ? 2 : 5),
        candles: candles.length,
      },
      ts: Date.now(),
    };

    updateHUD();
    window.dispatchEvent(new CustomEvent('smp:signal', { detail: STATE.lastSignal }));
  }

  // ─────────────────────────────────────────────
  // 9. HUD — OVERLAY FLUTUANTE
  // ─────────────────────────────────────────────
  let hudEl = null;

  function injectStyles() {
    if (document.getElementById('smp-styles')) return;
    const s = document.createElement('style');
    s.id = 'smp-styles';
    s.textContent = `
      #smp-hud {
        position:fixed;top:20px;right:20px;z-index:2147483647;
        width:270px;font-family:'Inter','Segoe UI',sans-serif;font-size:13px;
        user-select:none;border-radius:14px;overflow:hidden;
        box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.08);
        background:rgba(7,7,18,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
      }
      #smp-hud.mini #smp-body{display:none}
      #smp-hud.mini{width:160px}
      #smp-head{
        display:flex;align-items:center;justify-content:space-between;
        padding:9px 12px;background:rgba(255,255,255,0.04);
        border-bottom:1px solid rgba(255,255,255,0.06);cursor:move;
      }
      #smp-title{font-weight:700;font-size:11px;color:#00ff88;letter-spacing:.5px;text-transform:uppercase}
      #smp-ctrl{display:flex;gap:5px}
      #smp-ctrl button{
        background:rgba(255,255,255,0.07);border:none;border-radius:4px;
        color:#666;font-size:11px;cursor:pointer;padding:1px 6px;
      }
      #smp-ctrl button:hover{background:rgba(255,255,255,0.15);color:#fff}
      #smp-body{padding:12px}
      #smp-assetrow{
        display:flex;justify-content:space-between;align-items:center;
        margin-bottom:8px;font-size:11px;
      }
      #smp-asset{color:#fff;font-weight:700;font-size:13px}
      #smp-tf{color:#444;font-size:10px}
      #smp-sigblock{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
      #smp-dir{font-size:30px;font-weight:900;line-height:1;letter-spacing:-1px}
      #smp-dir.call{color:#00ff88;text-shadow:0 0 20px rgba(0,255,136,.4)}
      #smp-dir.put {color:#ff4466;text-shadow:0 0 20px rgba(255,68,102,.4)}
      #smp-dir.wait{color:#444;font-size:14px;font-weight:600}
      #smp-scoreblk{text-align:right}
      #smp-score{font-size:22px;font-weight:800;color:#fff}
      #smp-qual{
        font-size:9px;font-weight:700;letter-spacing:.8px;padding:2px 7px;
        border-radius:4px;display:inline-block;margin-top:2px;
      }
      .qe{background:rgba(255,215,0,.18);color:#ffd700;border:1px solid rgba(255,215,0,.3)}
      .qp{background:rgba(180,100,255,.18);color:#c084fc;border:1px solid rgba(180,100,255,.3)}
      .qf{background:rgba(0,255,136,.12);color:#00ff88;border:1px solid rgba(0,255,136,.25)}
      .qw{background:rgba(255,165,0,.12);color:#ffa500;border:1px solid rgba(255,165,0,.25)}
      .qa{background:rgba(100,100,100,.15);color:#555;border:1px solid rgba(100,100,100,.2)}
      #smp-inds{
        background:rgba(255,255,255,0.03);border-radius:8px;
        padding:9px;margin-bottom:8px;display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;
      }
      .si{font-size:10px;display:flex;justify-content:space-between}
      .sl{color:#444}.sv{color:#aaa;font-weight:600}
      .sv.bull{color:#00ff88}.sv.bear{color:#ff4466}
      #smp-reason{font-size:10px;color:#444;line-height:1.4;margin-bottom:8px;border-top:1px solid rgba(255,255,255,.04);padding-top:7px}
      #smp-status{display:flex;align-items:center;justify-content:space-between;font-size:9px;color:#333}
      #smp-dot{
        display:inline-block;width:6px;height:6px;border-radius:50%;
        background:#333;margin-right:4px;vertical-align:middle;
      }
      #smp-dot.ok{background:#00ff88;box-shadow:0 0 5px #00ff88;animation:smpPulse 2s infinite}
      #smp-dot.wait{background:#ffa500;animation:smpPulse 1s infinite}
      @keyframes smpPulse{0%,100%{opacity:1}50%{opacity:.3}}
      #smp-reopen{
        position:fixed;right:16px;top:16px;z-index:2147483646;
        background:#00ff88;color:#000;border:none;border-radius:8px;
        padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;
        box-shadow:0 4px 12px rgba(0,255,136,.4);display:none;
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
        <div id="smp-ctrl">
          <button id="smp-min">—</button>
          <button id="smp-close">✕</button>
        </div>
      </div>
      <div id="smp-body">
        <div id="smp-assetrow">
          <span id="smp-asset">—</span>
          <span id="smp-tf">M1 · Ebinex</span>
        </div>
        <div id="smp-sigblock">
          <div id="smp-dir" class="wait">AGUARD.</div>
          <div id="smp-scoreblk">
            <div id="smp-score">—</div>
            <div id="smp-qual" class="qa">—</div>
          </div>
        </div>
        <div id="smp-inds">
          <div class="si"><span class="sl">EMA 9/21</span><span class="sv" id="si-ema">—</span></div>
          <div class="si"><span class="sl">RSI(7)</span><span class="sv" id="si-rsi">—</span></div>
          <div class="si"><span class="sl">MACD</span><span class="sv" id="si-macd">—</span></div>
          <div class="si"><span class="sl">BB%</span><span class="sv" id="si-bb">—</span></div>
          <div class="si"><span class="sl">Preço</span><span class="sv" id="si-price">—</span></div>
          <div class="si"><span class="sl">Velas</span><span class="sv" id="si-can">0</span></div>
        </div>
        <div id="smp-reason">Aguardando dados...</div>
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
      const btn = document.getElementById('smp-reopen');
      if (btn) btn.style.display = 'block';
    };

    const reopen = document.createElement('button');
    reopen.id = 'smp-reopen';
    reopen.textContent = '⚡ SMP';
    reopen.onclick = () => { hudEl.style.display = 'block'; reopen.style.display = 'none'; };
    document.body.appendChild(reopen);
  }

  function updateHUD() {
    if (!hudEl) return;
    const sig = STATE.lastSignal;
    const asset = STATE.currentAsset;

    const el = (id) => document.getElementById(id);

    if (el('smp-asset')) el('smp-asset').textContent = asset || '—';

    if (!sig) return;

    // Direction
    const dirEl = el('smp-dir');
    if (dirEl) {
      dirEl.textContent = sig.dir || 'AGUARD.';
      dirEl.className = sig.dir === 'CALL' ? 'call' : sig.dir === 'PUT' ? 'put' : 'wait';
    }

    if (el('smp-score')) el('smp-score').textContent = sig.dir ? sig.score + '%' : '—';

    const qEl = el('smp-qual');
    if (qEl) {
      qEl.textContent = sig.quality || '—';
      const qm = { ELITE:'qe', PREMIUM:'qp', FORTE:'qf', FRACO:'qw', AGUARDANDO:'qa' };
      qEl.className = qm[sig.quality] || 'qa';
    }

    const ind = sig.indicators || {};

    const emaEl = el('si-ema');
    if (emaEl) {
      const e9 = parseFloat(ind.ema9), e21 = parseFloat(ind.ema21);
      if (e9 && e21) {
        emaEl.textContent = e9 > e21 ? '▲ bull' : '▼ bear';
        emaEl.className = 'sv ' + (e9 > e21 ? 'bull' : 'bear');
      }
    }

    const rsiEl = el('si-rsi');
    if (rsiEl) {
      const r = parseFloat(ind.rsi);
      rsiEl.textContent = ind.rsi || '—';
      rsiEl.className = 'sv' + (!isNaN(r) ? (r < 40 ? ' bull' : r > 60 ? ' bear' : '') : '');
    }

    const macdEl = el('si-macd');
    if (macdEl) {
      macdEl.textContent = ind.macd || '—';
      macdEl.className = 'sv' + (ind.macd === '▲' ? ' bull' : ind.macd === '▼' ? ' bear' : '');
    }

    const bbEl = el('si-bb');
    if (bbEl) {
      const b = parseFloat(ind.bb);
      bbEl.textContent = ind.bb || '—';
      bbEl.className = 'sv' + (!isNaN(b) ? (b < 20 ? ' bull' : b > 80 ? ' bear' : '') : '');
    }

    if (el('si-price'))  el('si-price').textContent  = ind.price || '—';
    if (el('si-can'))    el('si-can').textContent     = ind.candles || 0;
    if (el('smp-reason')) el('smp-reason').textContent = sig.reason || '—';

    // Status
    const dot = el('smp-dot');
    const src = el('smp-src');
    if (dot && src) {
      const hasData = STATE.tickCount > 0 || (STATE.candles[asset || '']?.length || 0) > 0;
      dot.className = hasData ? 'ok' : 'wait';
      src.textContent = STATE.dataSource;
    }

    if (el('smp-time') && sig.ts) {
      el('smp-time').textContent = new Date(sig.ts).toLocaleTimeString('pt-BR');
    }
  }

  // ─────────────────────────────────────────────
  // 10. DRAG & DROP
  // ─────────────────────────────────────────────
  function makeDraggable(el, handle) {
    let ox = 0, oy = 0;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      ox = e.clientX - el.offsetLeft;
      oy = e.clientY - el.offsetTop;
      const onMove = (e) => {
        el.style.left  = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  e.clientX - ox)) + 'px';
        el.style.top   = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - oy)) + 'px';
        el.style.right = 'auto';
      };
      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',  onUp);
    });
  }

  // ─────────────────────────────────────────────
  // 11. INIT
  // ─────────────────────────────────────────────
  function init() {
    const waitForBody = () => {
      if (document.body) {
        createHUD();
      } else {
        setTimeout(waitForBody, 100);
      }
    };
    waitForBody();

    // Polling DOM a cada 500ms
    setInterval(pollDOM, 500);

    // Recalcula sinal a cada 10s
    setInterval(() => {
      detectCurrentAsset();
      const a = STATE.currentAsset;
      if (a && (STATE.candles[a]?.length || 0) >= MIN_CANDLES) recalcSignal(a);
      else updateHUD();
    }, 10_000);

    // Log de diagnóstico a cada 5s (apenas no início)
    let diagnosticCount = 0;
    const diagInterval = setInterval(() => {
      diagnosticCount++;
      console.log(`[SMP] Diagnóstico #${diagnosticCount}:`, {
        currentAsset: STATE.currentAsset,
        tickCount: STATE.tickCount,
        wsMessages: STATE.wsMessageCount,
        candles: Object.fromEntries(Object.entries(STATE.candles).map(([k,v]) => [k, v.length])),
        ticks: Object.fromEntries(Object.entries(STATE.ticks).map(([k,v]) => [k, v.length])),
        dataSource: STATE.dataSource,
      });
      if (diagnosticCount >= 6) clearInterval(diagInterval);
    }, 5000);

    console.log('[SMP] SignalMaster Pro v1.1 iniciado ✓ (TradingView + Ebinex)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Debug global
  window.__SMP__ = STATE;

})();
