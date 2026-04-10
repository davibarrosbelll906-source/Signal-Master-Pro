//+------------------------------------------------------------------+
//|          SMP Gold Scalper AI — v2.0                              |
//|          SignalMaster Pro — XAU/USD Expert Advisor               |
//|          8 confirmadores + H1 filter + break-even + daily DD     |
//+------------------------------------------------------------------+
#property copyright "SignalMaster Pro"
#property version   "2.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

CTrade        g_trade;
CPositionInfo g_pos;

//--- Parâmetros de entrada
input group "=== GESTÃO DE RISCO ==="
input double  RiskPercent        = 1.5;    // % da banca por operação
input double  MaxRiskPercent     = 3.0;    // % máxima simultânea
input int     MaxPositions       = 2;      // Máximo de posições abertas
input double  MinLot             = 0.01;   // Lote mínimo
input double  MaxLot             = 5.0;    // Lote máximo
input double  MaxDailyLossPct    = 5.0;    // % máxima de perda diária (0 = desativado)
input int     MaxDailyTrades     = 15;     // Máximo de trades por dia (0 = desativado)

input group "=== STOP & TARGET ==="
input int     SL_ATR_Multi       = 15;     // Multiplicador ATR para Stop Loss (x0.1)
input int     TP1_ATR_Multi      = 20;     // Multiplicador ATR para TP1 parcial (x0.1)
input int     TP2_ATR_Multi      = 35;     // Multiplicador ATR para TP2 final (x0.1)
input double  TP1_ClosePercent   = 50.0;   // % do lote fechado no TP1
input int     Trail_ATR_Multi    = 10;     // Multiplicador ATR para trailing stop (x0.1)
input bool    UseTrailingStop    = true;   // Usar trailing stop adaptativo
input int     BreakEven_ATR      = 12;     // ATR para mover SL ao break-even (x0.1), 0=off

input group "=== IA — FILTROS DE QUALIDADE ==="
input int     MinScore           = 75;     // Score mínimo de IA para entrada (0-100)
input int     EliteScore         = 88;     // Score ELITE — lote aumentado em 50%
input double  MaxSpreadPoints    = 35.0;   // Spread máximo permitido (pontos)
input int     ATR_ChaosLimit     = 400;    // ATR máximo — mercado caótico (pontos)
input int     ATR_DeadLimit      = 3;      // ATR mínimo — mercado morto (pontos)

input group "=== FILTRO H1 (TENDÊNCIA MAIOR) ==="
input bool    UseH1Filter        = true;   // Ativar filtro de tendência H1
input int     H1_EMA_Fast        = 8;      // EMA rápida H1
input int     H1_EMA_Slow        = 21;     // EMA lenta H1
input bool    UseH4Filter        = false;  // Ativar filtro adicional H4
input int     H4_EMA             = 50;     // EMA H4 para tendência macro

input group "=== INDICADORES M1/M5 ==="
input int     EMA_Fast           = 8;      // EMA rápida
input int     EMA_Mid            = 21;     // EMA média
input int     EMA_Slow           = 55;     // EMA lenta
input int     RSI_Period         = 14;     // Período RSI
input int     ATR_Period         = 14;     // Período ATR
input int     BB_Period          = 20;     // Período Bollinger Bands
input double  BB_Dev             = 2.0;    // Desvio Bollinger Bands
input int     Stoch_K            = 5;      // Stochastic %K
input int     Stoch_D            = 3;      // Stochastic %D
input int     Stoch_Slowing      = 3;      // Stochastic Slowing
input int     MACD_Fast          = 12;     // MACD rápida
input int     MACD_Slow          = 26;     // MACD lenta
input int     MACD_Signal        = 9;      // MACD signal

input group "=== SESSÕES DE MERCADO ==="
input bool    UseSessionFilter   = true;   // Filtrar por sessão
input bool    TradeLondon        = true;   // Operar sessão Londres (08-17 GMT)
input bool    TradeNewYork       = true;   // Operar sessão Nova York (13-22 GMT)
input bool    TradeAsia          = false;  // Operar sessão Ásia (00-08 GMT)
input int     GmtOffset          = 0;      // Diferença horária do servidor para GMT

input group "=== CONFIGURAÇÕES ==="
input int     EaMagic            = 20250410;
input string  TradeComment       = "SMP_Gold_AI_v2";
input bool    ShowDashboard      = true;

//--- Handles dos indicadores
int hEMA_Fast, hEMA_Mid, hEMA_Slow;
int hRSI, hATR, hBB, hStoch, hMACD;
int hEMA_Fast_M5, hEMA_Mid_M5, hEMA_Slow_M5;
int hRSI_M5, hATR_M15;
int hH1_EMA_Fast, hH1_EMA_Slow;
int hH4_EMA;

//--- Variáveis globais
datetime lastBarTime    = 0;
double   lastScore      = 0;
string   lastReason     = "";
string   lastDir        = "";
int      totalWins      = 0;
int      totalLosses    = 0;
double   totalProfit    = 0;
int      dailyTrades    = 0;
double   dailyStartBal  = 0;
datetime lastDayReset   = 0;
string   statusMsg      = "";

//+------------------------------------------------------------------+
//| Inicialização                                                     |
//+------------------------------------------------------------------+
int OnInit()
{
   g_trade.SetExpertMagicNumber(EaMagic);
   g_trade.SetDeviationInPoints(30);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   string sym = _Symbol;

   hEMA_Fast    = iMA(sym, PERIOD_M1, EMA_Fast,  0, MODE_EMA, PRICE_CLOSE);
   hEMA_Mid     = iMA(sym, PERIOD_M1, EMA_Mid,   0, MODE_EMA, PRICE_CLOSE);
   hEMA_Slow    = iMA(sym, PERIOD_M1, EMA_Slow,  0, MODE_EMA, PRICE_CLOSE);
   hRSI         = iRSI(sym, PERIOD_M1, RSI_Period, PRICE_CLOSE);
   hATR         = iATR(sym, PERIOD_M1, ATR_Period);
   hBB          = iBands(sym, PERIOD_M1, BB_Period, 0, BB_Dev, PRICE_CLOSE);
   hStoch       = iStochastic(sym, PERIOD_M1, Stoch_K, Stoch_D, Stoch_Slowing, MODE_SMA, STO_LOWHIGH);
   hMACD        = iMACD(sym, PERIOD_M1, MACD_Fast, MACD_Slow, MACD_Signal, PRICE_CLOSE);

   hEMA_Fast_M5 = iMA(sym, PERIOD_M5, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   hEMA_Mid_M5  = iMA(sym, PERIOD_M5, EMA_Mid,  0, MODE_EMA, PRICE_CLOSE);
   hEMA_Slow_M5 = iMA(sym, PERIOD_M5, EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   hRSI_M5      = iRSI(sym, PERIOD_M5, RSI_Period, PRICE_CLOSE);
   hATR_M15     = iATR(sym, PERIOD_M15, ATR_Period);

   hH1_EMA_Fast = iMA(sym, PERIOD_H1, H1_EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   hH1_EMA_Slow = iMA(sym, PERIOD_H1, H1_EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   hH4_EMA      = iMA(sym, PERIOD_H4, H4_EMA,      0, MODE_EMA, PRICE_CLOSE);

   if(hEMA_Fast == INVALID_HANDLE || hRSI == INVALID_HANDLE ||
      hATR == INVALID_HANDLE || hH1_EMA_Fast == INVALID_HANDLE)
   {
      Alert("SMP Gold AI: Erro ao criar indicadores!");
      return INIT_FAILED;
   }

   dailyStartBal = AccountInfoDouble(ACCOUNT_BALANCE);
   Print("SMP Gold Scalper AI v2.0 iniciado — XAU/USD — Magic: ", EaMagic);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Desinicialização                                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   IndicatorRelease(hEMA_Fast);    IndicatorRelease(hEMA_Mid);     IndicatorRelease(hEMA_Slow);
   IndicatorRelease(hRSI);         IndicatorRelease(hATR);         IndicatorRelease(hBB);
   IndicatorRelease(hStoch);       IndicatorRelease(hMACD);
   IndicatorRelease(hEMA_Fast_M5); IndicatorRelease(hEMA_Mid_M5);  IndicatorRelease(hEMA_Slow_M5);
   IndicatorRelease(hRSI_M5);      IndicatorRelease(hATR_M15);
   IndicatorRelease(hH1_EMA_Fast); IndicatorRelease(hH1_EMA_Slow); IndicatorRelease(hH4_EMA);
   Comment("");
}

//+------------------------------------------------------------------+
//| Tick principal                                                    |
//+------------------------------------------------------------------+
void OnTick()
{
   ResetDailyCounters();
   ManageOpenPositions();
   if(ShowDashboard) DrawDashboard();

   datetime curBar = iTime(_Symbol, PERIOD_M1, 0);
   if(curBar == lastBarTime) return;
   lastBarTime = curBar;

   //--- Verificações de bloqueio
   if(!IsSessionAllowed())        { statusMsg = "Fora de sessão"; return; }
   if(IsDailyLossHit())           { statusMsg = "Limite de perda diária atingido!"; return; }
   if(IsDailyTradesHit())         { statusMsg = "Limite de trades diários atingido!"; return; }
   if(CountPositions() >= MaxPositions) { statusMsg = "Posições máximas abertas"; return; }

   double spread = GetSpreadPoints();
   if(spread > MaxSpreadPoints)   { statusMsg = "Spread alto: " + DoubleToString(spread,0); return; }

   double atr    = GetBuf(hATR, 0, 1);
   double atrPts = atr / _Point;
   if(atrPts > ATR_ChaosLimit)   { statusMsg = "Mercado caótico — aguardando"; return; }
   if(atrPts < ATR_DeadLimit)    { statusMsg = "Mercado parado — aguardando"; return; }

   //--- Filtro H1
   string h1Bias = GetH1Bias();
   if(UseH1Filter && h1Bias == "NEUTRO") { statusMsg = "H1 neutro — sem tendência clara"; return; }

   int    score     = 0;
   string direction = "";
   string reasons   = "";
   CalculateAIScore(score, direction, reasons, atr, h1Bias);

   lastScore  = score;
   lastReason = reasons;
   lastDir    = direction;
   statusMsg  = "";

   if(score < MinScore || direction == "") return;

   double lot = CalculateLot(atr, score);
   if(lot < MinLot) return;

   double slDist  = atr * (SL_ATR_Multi  / 10.0);
   double tp2Dist = atr * (TP2_ATR_Multi / 10.0);

   if(direction == "BUY")
   {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl  = NormalizeDouble(ask - slDist,  _Digits);
      double tp2 = NormalizeDouble(ask + tp2Dist, _Digits);
      if(g_trade.Buy(lot, _Symbol, ask, sl, tp2, TradeComment))
      {
         dailyTrades++;
         Print("BUY v2 | Score:", score, " | H1:", h1Bias, " | Lot:", lot, " | ", reasons);
      }
   }
   else if(direction == "SELL")
   {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl  = NormalizeDouble(bid + slDist,  _Digits);
      double tp2 = NormalizeDouble(bid - tp2Dist, _Digits);
      if(g_trade.Sell(lot, _Symbol, bid, sl, tp2, TradeComment))
      {
         dailyTrades++;
         Print("SELL v2 | Score:", score, " | H1:", h1Bias, " | Lot:", lot, " | ", reasons);
      }
   }
}

//+------------------------------------------------------------------+
//| Determina viés da tendência no H1                                |
//+------------------------------------------------------------------+
string GetH1Bias()
{
   double h1Fast  = GetBuf(hH1_EMA_Fast, 0, 1);
   double h1Slow  = GetBuf(hH1_EMA_Slow, 0, 1);
   double close   = iClose(_Symbol, PERIOD_H1, 1);

   if(UseH4Filter)
   {
      double h4Ema = GetBuf(hH4_EMA, 0, 1);
      double h4Close = iClose(_Symbol, PERIOD_H4, 1);
      if(h1Fast > h1Slow && h4Close > h4Ema) return "BUY";
      if(h1Fast < h1Slow && h4Close < h4Ema) return "SELL";
      return "NEUTRO";
   }

   if(h1Fast > h1Slow && close > h1Fast) return "BUY";
   if(h1Fast < h1Slow && close < h1Fast) return "SELL";
   return "NEUTRO";
}

//+------------------------------------------------------------------+
//| Motor de IA — 8 confirmadores                                    |
//+------------------------------------------------------------------+
void CalculateAIScore(int &score, string &direction, string &reasons,
                      double atr, string h1Bias)
{
   score     = 0;
   direction = "";
   reasons   = "";

   double emaF1   = GetBuf(hEMA_Fast, 0, 1);
   double emaM1   = GetBuf(hEMA_Mid,  0, 1);
   double emaS1   = GetBuf(hEMA_Slow, 0, 1);
   double emaF2   = GetBuf(hEMA_Fast, 0, 2);
   double emaM2   = GetBuf(hEMA_Mid,  0, 2);
   double close1  = iClose(_Symbol, PERIOD_M1, 1);
   double close2  = iClose(_Symbol, PERIOD_M1, 2);

   double emaF_M5 = GetBuf(hEMA_Fast_M5, 0, 1);
   double emaM_M5 = GetBuf(hEMA_Mid_M5,  0, 1);
   double emaS_M5 = GetBuf(hEMA_Slow_M5, 0, 1);

   double rsi1    = GetBuf(hRSI,    0, 1);
   double rsi2    = GetBuf(hRSI,    0, 2);
   double rsiM5   = GetBuf(hRSI_M5, 0, 1);

   double bbUpp   = GetBuf(hBB, 1, 1);
   double bbLow   = GetBuf(hBB, 2, 1);
   double bbMid   = GetBuf(hBB, 0, 1);

   double stochK  = GetBuf(hStoch, 0, 1);
   double stochD  = GetBuf(hStoch, 1, 1);

   double macdMain = GetBuf(hMACD, 0, 1);
   double macdSig  = GetBuf(hMACD, 1, 1);
   double macdPrev = GetBuf(hMACD, 0, 2);

   int    buyV = 0, sellV = 0;
   string buyR = "", sellR = "";

   //--- [1] EMA Stack M1
   bool emaBullM1 = (emaF1 > emaM1 && emaM1 > emaS1);
   bool emaBearM1 = (emaF1 < emaM1 && emaM1 < emaS1);
   if(emaBullM1) { buyV++;  buyR  += "EMA_M1 "; }
   if(emaBearM1) { sellV++; sellR += "EMA_M1 "; }

   //--- [2] EMA Stack M5
   bool emaBullM5 = (emaF_M5 > emaM_M5 && emaM_M5 > emaS_M5);
   bool emaBearM5 = (emaF_M5 < emaM_M5 && emaM_M5 < emaS_M5);
   if(emaBullM5) { buyV++;  buyR  += "EMA_M5 "; }
   if(emaBearM5) { sellV++; sellR += "EMA_M5 "; }

   //--- [3] Crossover EMA M1
   bool crossUp   = (emaF1 > emaM1 && emaF2 <= emaM2);
   bool crossDown = (emaF1 < emaM1 && emaF2 >= emaM2);
   if(crossUp)   { buyV++;  buyR  += "CROSS_UP "; }
   if(crossDown) { sellV++; sellR += "CROSS_DN "; }

   //--- [4] RSI M1
   bool rsiBuy   = (rsi1 > 50 && rsi1 < 75 && rsi1 > rsi2);
   bool rsiSell  = (rsi1 < 50 && rsi1 > 25 && rsi1 < rsi2);
   bool rsiOS    = (rsi1 < 35);
   bool rsiOB    = (rsi1 > 65);
   if(rsiBuy || rsiOS) { buyV++;  buyR  += "RSI "; }
   if(rsiSell || rsiOB){ sellV++; sellR += "RSI "; }

   //--- [5] RSI M5
   bool rsiM5Buy  = (rsiM5 > 48 && rsiM5 < 80);
   bool rsiM5Sell = (rsiM5 < 52 && rsiM5 > 20);
   if(rsiM5Buy)  { buyV++;  buyR  += "RSI_M5 "; }
   if(rsiM5Sell) { sellV++; sellR += "RSI_M5 "; }

   //--- [6] Bollinger Bands
   bool bbBuy     = (close1 < bbLow  && close1 > bbLow  - atr * 0.5);
   bool bbSell    = (close1 > bbUpp  && close1 < bbUpp  + atr * 0.5);
   bool bbMBuy    = (close1 > bbMid  && close2 < bbMid);
   bool bbMSell   = (close1 < bbMid  && close2 > bbMid);
   if(bbBuy  || bbMBuy)  { buyV++;  buyR  += "BB "; }
   if(bbSell || bbMSell) { sellV++; sellR += "BB "; }

   //--- [7] Stochastic
   bool stBuy     = (stochK < 30 && stochK > stochD);
   bool stSell    = (stochK > 70 && stochK < stochD);
   bool stMBuy    = (stochK > 50 && stochD < 50 && stochK > stochD);
   bool stMSell   = (stochK < 50 && stochD > 50 && stochK < stochD);
   if(stBuy  || stMBuy)  { buyV++;  buyR  += "STOCH "; }
   if(stSell || stMSell) { sellV++; sellR += "STOCH "; }

   //--- [8] MACD
   bool macdBuy   = (macdMain > macdSig && macdPrev <= macdSig && macdMain < 0);
   bool macdSell  = (macdMain < macdSig && macdPrev >= macdSig && macdMain > 0);
   bool macdTB    = (macdMain > macdSig && macdMain > 0);
   bool macdTS    = (macdMain < macdSig && macdMain < 0);
   if(macdBuy  || macdTB) { buyV++;  buyR  += "MACD "; }
   if(macdSell || macdTS) { sellV++; sellR += "MACD "; }

   //--- Alinhamento M1 + M5 obrigatório
   bool alignBuy  = (emaBullM1 && emaBullM5);
   bool alignSell = (emaBearM1 && emaBearM5);

   //--- Filtro H1 — reforça ou bloqueia
   bool h1OkBuy  = (!UseH1Filter || h1Bias == "BUY");
   bool h1OkSell = (!UseH1Filter || h1Bias == "SELL");

   if(buyV > sellV && buyV >= 4 && alignBuy && h1OkBuy)
   {
      direction = "BUY";
      score     = (int)MathRound((double)buyV / 8.0 * 70.0);
      score    += (int)MathRound(MathMin(rsi1, 70.0) / 70.0 * 15.0);
      score    += (macdMain > macdSig) ? 8 : 0;
      score    += (stochK < 45)        ? 7 : 0;
      if(h1Bias == "BUY") score += 5; // bônus tendência maior
      score     = (int)MathMin(score, 99);
      reasons   = buyR + "[H1:" + h1Bias + "]";
   }
   else if(sellV > buyV && sellV >= 4 && alignSell && h1OkSell)
   {
      direction = "SELL";
      score     = (int)MathRound((double)sellV / 8.0 * 70.0);
      score    += (int)MathRound((100.0 - MathMax(rsi1, 30.0)) / 70.0 * 15.0);
      score    += (macdMain < macdSig) ? 8 : 0;
      score    += (stochK > 55)        ? 7 : 0;
      if(h1Bias == "SELL") score += 5;
      score     = (int)MathMin(score, 99);
      reasons   = sellR + "[H1:" + h1Bias + "]";
   }
}

//+------------------------------------------------------------------+
//| Calcula lote adaptativo                                          |
//+------------------------------------------------------------------+
double CalculateLot(double atr, int score)
{
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmt  = balance * (RiskPercent / 100.0);
   double slDist   = atr * (SL_ATR_Multi / 10.0);
   double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double lotStep  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(tickVal <= 0 || slDist <= 0 || tickSize <= 0) return MinLot;

   double lot = riskAmt / ((slDist / tickSize) * tickVal);
   if(score >= EliteScore) lot *= 1.5;

   lot = MathFloor(lot / lotStep) * lotStep;
   lot = MathMax(MinLot, MathMin(MaxLot, lot));

   double usedRisk = GetUsedRiskPercent();
   if(usedRisk + RiskPercent > MaxRiskPercent)
   {
      double allowed = MaxRiskPercent - usedRisk;
      if(allowed <= 0) return 0;
      lot = MathFloor((lot * allowed / RiskPercent) / lotStep) * lotStep;
   }

   return NormalizeDouble(MathMax(lot, MinLot), 2);
}

//+------------------------------------------------------------------+
//| Gestão de posições — break-even + trailing + TP parcial          |
//+------------------------------------------------------------------+
void ManageOpenPositions()
{
   double atr       = GetBuf(hATR, 0, 1);
   double trailDist = atr * (Trail_ATR_Multi / 10.0);
   double beDist    = (BreakEven_ATR > 0) ? atr * (BreakEven_ATR / 10.0) : 0;
   double tp1Dist   = atr * (TP1_ATR_Multi / 10.0);

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!g_pos.SelectByIndex(i)) continue;
      if(g_pos.Magic() != EaMagic || g_pos.Symbol() != _Symbol) continue;

      double sl        = g_pos.StopLoss();
      double lot       = g_pos.Volume();
      double openPrice = g_pos.PriceOpen();
      double tp        = g_pos.TakeProfit();
      ulong  ticket    = g_pos.Ticket();

      if(g_pos.PositionType() == POSITION_TYPE_BUY)
      {
         double bid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double profit = bid - openPrice;

         // Break-even
         if(beDist > 0 && profit >= beDist && sl < openPrice - _Point)
         {
            double newSL = NormalizeDouble(openPrice + _Point * 2, _Digits);
            if(newSL > sl) g_trade.PositionModify(ticket, newSL, tp);
         }

         // TP1 parcial
         if(profit >= tp1Dist && lot > MinLot * 2.0)
         {
            double closeLot = NormalizeDouble(lot * (TP1_ClosePercent / 100.0), 2);
            closeLot = MathMax(MinLot, MathMin(closeLot, lot - MinLot));
            if(closeLot > 0) g_trade.PositionClosePartial(ticket, closeLot);
         }

         // Trailing stop
         if(UseTrailingStop)
         {
            double newSL = NormalizeDouble(bid - trailDist, _Digits);
            if(newSL > sl + _Point * 5 && newSL > openPrice)
               g_trade.PositionModify(ticket, newSL, tp);
         }
      }
      else if(g_pos.PositionType() == POSITION_TYPE_SELL)
      {
         double ask    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double profit = openPrice - ask;

         // Break-even
         if(beDist > 0 && profit >= beDist && (sl > openPrice + _Point || sl == 0))
         {
            double newSL = NormalizeDouble(openPrice - _Point * 2, _Digits);
            if(sl == 0 || newSL < sl) g_trade.PositionModify(ticket, newSL, tp);
         }

         // TP1 parcial
         if(profit >= tp1Dist && lot > MinLot * 2.0)
         {
            double closeLot = NormalizeDouble(lot * (TP1_ClosePercent / 100.0), 2);
            closeLot = MathMax(MinLot, MathMin(closeLot, lot - MinLot));
            if(closeLot > 0) g_trade.PositionClosePartial(ticket, closeLot);
         }

         // Trailing stop
         if(UseTrailingStop)
         {
            double newSL = NormalizeDouble(ask + trailDist, _Digits);
            if((sl == 0 || newSL < sl - _Point * 5) && newSL < openPrice)
               g_trade.PositionModify(ticket, newSL, tp);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Verifica sessão permitida                                        |
//+------------------------------------------------------------------+
bool IsSessionAllowed()
{
   if(!UseSessionFilter) return true;

   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int gmtHour = (dt.hour - GmtOffset + 24) % 24;

   bool london  = TradeLondon  && (gmtHour >= 8  && gmtHour < 17);
   bool newYork = TradeNewYork && (gmtHour >= 13 && gmtHour < 22);
   bool asia    = TradeAsia    && (gmtHour >= 0  && gmtHour < 8);

   return (london || newYork || asia);
}

//+------------------------------------------------------------------+
//| Reset contadores diários                                         |
//+------------------------------------------------------------------+
void ResetDailyCounters()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   datetime today = StringToTime(StringFormat("%04d.%02d.%02d 00:00", dt.year, dt.mon, dt.day));

   if(today != lastDayReset)
   {
      lastDayReset  = today;
      dailyTrades   = 0;
      dailyStartBal = AccountInfoDouble(ACCOUNT_BALANCE);
   }
}

bool IsDailyLossHit()
{
   if(MaxDailyLossPct <= 0) return false;
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double loss    = (dailyStartBal - balance) / dailyStartBal * 100.0;
   return (loss >= MaxDailyLossPct);
}

bool IsDailyTradesHit()
{
   if(MaxDailyTrades <= 0) return false;
   return (dailyTrades >= MaxDailyTrades);
}

//+------------------------------------------------------------------+
//| Painel na tela                                                   |
//+------------------------------------------------------------------+
void DrawDashboard()
{
   string dirStr  = (lastDir == "BUY")  ? "▲ COMPRA" :
                    (lastDir == "SELL") ? "▼ VENDA"  : "— AGUARDANDO";
   string qualStr = (lastScore >= EliteScore)    ? "ELITE ★★★" :
                    (lastScore >= 84)            ? "PREMIUM ★★" :
                    (lastScore >= MinScore)       ? "FORTE ★"   : "FRACO";

   string h1Bias  = GetH1Bias();
   string h1Icon  = (h1Bias == "BUY")  ? "▲" : (h1Bias == "SELL") ? "▼" : "—";

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double spread  = GetSpreadPoints();
   double atrPts  = GetBuf(hATR, 0, 1) / _Point;
   double dd      = (balance > 0) ? (balance - equity) / balance * 100.0 : 0;
   double dayLoss = (dailyStartBal > 0) ? (dailyStartBal - balance) / dailyStartBal * 100.0 : 0;

   string sessao  = IsSessionAllowed() ? "ATIVA" : "INATIVA";

   string dash = "";
   dash += "\n  ╔══════════════════════════════════════╗\n";
   dash += "  ║     SMP GOLD SCALPER AI  v2.0       ║\n";
   dash += "  ╠══════════════════════════════════════╣\n";
   dash += StringFormat("  ║  Score IA  : %3.0f%%  [%s]\n", lastScore, qualStr);
   dash += StringFormat("  ║  Direção   : %s\n", dirStr);
   dash += StringFormat("  ║  Tendência H1: %s %s\n", h1Icon, h1Bias);
   dash += StringFormat("  ║  Status    : %s\n", statusMsg == "" ? "Operando" : statusMsg);
   dash += "  ╠══════════════════════════════════════╣\n";
   dash += StringFormat("  ║  ATR: %.0f pts  |  Spread: %.0f pts\n", atrPts, spread);
   dash += StringFormat("  ║  Sessão    : %s\n", sessao);
   dash += StringFormat("  ║  Posições  : %d / %d\n", CountPositions(), MaxPositions);
   dash += StringFormat("  ║  Trades/dia: %d / %d\n", dailyTrades, MaxDailyTrades > 0 ? MaxDailyTrades : 999);
   dash += "  ╠══════════════════════════════════════╣\n";
   dash += StringFormat("  ║  Banca     : $%.2f\n", balance);
   dash += StringFormat("  ║  Equity    : $%.2f  (DD: %.1f%%)\n", equity, dd);
   dash += StringFormat("  ║  Perda dia : %.1f%% / %.1f%%\n", MathMax(dayLoss, 0), MaxDailyLossPct);
   dash += "  ╠══════════════════════════════════════╣\n";
   dash += StringFormat("  ║  Wins: %d  |  Losses: %d\n", totalWins, totalLosses);
   dash += StringFormat("  ║  Lucro total : $%.2f\n", totalProfit);
   dash += "  ╚══════════════════════════════════════╝";

   Comment(dash);
}

//+------------------------------------------------------------------+
//| Funções auxiliares                                               |
//+------------------------------------------------------------------+
double GetBuf(int handle, int buffer, int shift)
{
   double arr[];
   ArraySetAsSeries(arr, true);
   if(CopyBuffer(handle, buffer, shift, 1, arr) != 1) return 0.0;
   return arr[0];
}

double GetSpreadPoints()
{
   return (SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID)) / _Point;
}

int CountPositions()
{
   int cnt = 0;
   for(int i = 0; i < PositionsTotal(); i++)
      if(g_pos.SelectByIndex(i) && g_pos.Magic() == EaMagic && g_pos.Symbol() == _Symbol)
         cnt++;
   return cnt;
}

double GetUsedRiskPercent()
{
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double usedRisk = 0.0;
   double atr      = GetBuf(hATR, 0, 1);
   double slDist   = atr * (SL_ATR_Multi / 10.0);
   double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);

   if(balance <= 0 || tickVal <= 0 || slDist <= 0 || tickSize <= 0) return 0.0;

   for(int i = 0; i < PositionsTotal(); i++)
   {
      if(!g_pos.SelectByIndex(i)) continue;
      if(g_pos.Magic() != EaMagic || g_pos.Symbol() != _Symbol) continue;
      usedRisk += (g_pos.Volume() * (slDist / tickSize) * tickVal) / balance * 100.0;
   }
   return usedRisk;
}

//+------------------------------------------------------------------+
//| Rastreia resultados                                              |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   ulong ticket = trans.deal;
   if(!HistoryDealSelect(ticket)) return;
   if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != EaMagic) return;

   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   if(profit == 0) return;

   totalProfit += profit;
   if(profit > 0) totalWins++;
   else           totalLosses++;

   Print("Trade fechado | $", DoubleToString(profit, 2),
         " | Total: $", DoubleToString(totalProfit, 2),
         " | W:", totalWins, " L:", totalLosses);
}
