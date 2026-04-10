//+------------------------------------------------------------------+
//|          SMP Gold Scalper AI — v3.0                              |
//|          SignalMaster Pro — XAU/USD Expert Advisor               |
//|          Mais entradas + ADX + M15 + H1 adaptativo              |
//+------------------------------------------------------------------+
#property copyright "SignalMaster Pro"
#property version   "3.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

CTrade        g_trade;
CPositionInfo g_pos;

//--- Parâmetros de entrada
input group "=== GESTÃO DE RISCO ==="
input double  RiskPercent        = 1.5;   // % da banca por operação
input double  MaxRiskPercent     = 4.0;   // % máxima simultânea
input int     MaxPositions       = 3;     // Máximo de posições abertas
input double  MinLot             = 0.01;  // Lote mínimo
input double  MaxLot             = 5.0;   // Lote máximo
input double  MaxDailyLossPct    = 6.0;   // % máxima de perda diária (0=off)
input int     MaxDailyTrades     = 20;    // Máximo de trades por dia (0=off)

input group "=== STOP & TARGET ==="
input int     SL_ATR_Multi       = 18;    // Multiplicador ATR para Stop Loss (x0.1)
input int     TP1_ATR_Multi      = 16;    // Multiplicador ATR para TP1 parcial (x0.1)
input int     TP2_ATR_Multi      = 32;    // Multiplicador ATR para TP2 final (x0.1)
input double  TP1_ClosePercent   = 50.0;  // % do lote fechado no TP1
input int     Trail_ATR_Multi    = 12;    // Multiplicador ATR trailing stop (x0.1)
input bool    UseTrailingStop    = true;  // Usar trailing stop
input int     BreakEven_ATR      = 10;    // ATR para break-even (x0.1), 0=off

input group "=== IA — SCORE E FILTROS ==="
input int     MinScore           = 68;    // Score mínimo para entrada (0-100)
input int     EliteScore         = 85;    // Score ELITE — lote +50%
input int     MinVotes           = 3;     // Mínimo de votos IA (3-8)
input double  MaxSpreadPoints    = 40.0;  // Spread máximo (pontos)
input int     ATR_ChaosLimit     = 500;   // ATR máximo — caótico (pontos)
input int     ATR_DeadLimit      = 2;     // ATR mínimo — morto (pontos)

input group "=== FILTRO H1 (ADAPTATIVO) ==="
input bool    UseH1Filter        = true;  // Ativar filtro H1
input bool    H1_HardBlock       = false; // true=bloqueia contra H1 | false=só reduz score
input int     H1_PenaltyScore    = 15;    // Pontos removidos do score se contra H1
input int     H1_BonusScore      = 8;     // Pontos adicionados se alinhado com H1
input int     H1_OverrideScore   = 90;    // Score mínimo para ignorar filtro H1
input int     H1_EMA_Fast        = 8;     // EMA rápida H1
input int     H1_EMA_Slow        = 21;    // EMA lenta H1

input group "=== FILTRO ADX ==="
input bool    UseADX             = true;  // Ativar filtro ADX
input int     ADX_Period         = 14;    // Período ADX
input int     ADX_MinTrend       = 20;    // ADX mínimo para mercado com tendência
input int     ADX_MaxScore       = 10;    // Bônus máximo de score pelo ADX

input group "=== INDICADORES M1/M5/M15 ==="
input int     EMA_Fast           = 8;     // EMA rápida M1
input int     EMA_Mid            = 21;    // EMA média M1
input int     EMA_Slow           = 55;    // EMA lenta M1
input int     RSI_Period         = 14;    // RSI
input int     ATR_Period         = 14;    // ATR
input int     BB_Period          = 20;    // Bollinger Bands
input double  BB_Dev             = 2.0;   // Desvio BB
input int     Stoch_K            = 5;     // Stoch %K
input int     Stoch_D            = 3;     // Stoch %D
input int     Stoch_Slow         = 3;     // Stoch Slowing
input int     MACD_Fast          = 12;    // MACD rápido
input int     MACD_Slow          = 26;    // MACD lento
input int     MACD_Sig           = 9;     // MACD signal

input group "=== SESSÕES ==="
input bool    UseSessionFilter   = true;  // Filtrar sessões
input bool    TradeLondon        = true;  // Sessão Londres 08-17 GMT
input bool    TradeNewYork       = true;  // Sessão Nova York 13-22 GMT
input bool    TradeAsia          = false; // Sessão Ásia 00-08 GMT
input int     GmtOffset          = 0;     // Diferença servidor → GMT

input group "=== CONFIGURAÇÕES ==="
input int     EaMagic            = 20250410;
input string  TradeComment       = "SMP_v3";
input bool    ShowDashboard      = true;

//--- Handles
int hEMA_Fast, hEMA_Mid, hEMA_Slow;
int hRSI, hATR, hBB, hStoch, hMACD;
int hEMA_Fast_M5, hEMA_Mid_M5, hEMA_Slow_M5;
int hEMA_Fast_M15, hEMA_Mid_M15;
int hRSI_M5, hRSI_M15;
int hH1_EMA_Fast, hH1_EMA_Slow;
int hADX_M15;

//--- Estado global
datetime lastBarTime  = 0;
double   lastScore    = 0;
string   lastReason   = "";
string   lastDir      = "";
string   statusMsg    = "";
int      totalWins    = 0;
int      totalLosses  = 0;
double   totalProfit  = 0;
int      dailyTrades  = 0;
double   dailyStartBal = 0;
datetime lastDayReset  = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   g_trade.SetExpertMagicNumber(EaMagic);
   g_trade.SetDeviationInPoints(30);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   string s = _Symbol;
   hEMA_Fast     = iMA(s, PERIOD_M1,  EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   hEMA_Mid      = iMA(s, PERIOD_M1,  EMA_Mid,  0, MODE_EMA, PRICE_CLOSE);
   hEMA_Slow     = iMA(s, PERIOD_M1,  EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   hRSI          = iRSI(s, PERIOD_M1, RSI_Period, PRICE_CLOSE);
   hATR          = iATR(s, PERIOD_M1, ATR_Period);
   hBB           = iBands(s, PERIOD_M1, BB_Period, 0, BB_Dev, PRICE_CLOSE);
   hStoch        = iStochastic(s, PERIOD_M1, Stoch_K, Stoch_D, Stoch_Slow, MODE_SMA, STO_LOWHIGH);
   hMACD         = iMACD(s, PERIOD_M1, MACD_Fast, MACD_Slow, MACD_Sig, PRICE_CLOSE);

   hEMA_Fast_M5  = iMA(s, PERIOD_M5,  EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   hEMA_Mid_M5   = iMA(s, PERIOD_M5,  EMA_Mid,  0, MODE_EMA, PRICE_CLOSE);
   hEMA_Slow_M5  = iMA(s, PERIOD_M5,  EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);
   hRSI_M5       = iRSI(s, PERIOD_M5, RSI_Period, PRICE_CLOSE);

   hEMA_Fast_M15 = iMA(s, PERIOD_M15, EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   hEMA_Mid_M15  = iMA(s, PERIOD_M15, EMA_Mid,  0, MODE_EMA, PRICE_CLOSE);
   hRSI_M15      = iRSI(s, PERIOD_M15, RSI_Period, PRICE_CLOSE);
   hADX_M15      = iADX(s, PERIOD_M15, ADX_Period);

   hH1_EMA_Fast  = iMA(s, PERIOD_H1, H1_EMA_Fast, 0, MODE_EMA, PRICE_CLOSE);
   hH1_EMA_Slow  = iMA(s, PERIOD_H1, H1_EMA_Slow, 0, MODE_EMA, PRICE_CLOSE);

   if(hEMA_Fast == INVALID_HANDLE || hRSI == INVALID_HANDLE ||
      hATR == INVALID_HANDLE || hADX_M15 == INVALID_HANDLE)
   {
      Alert("SMP v3: Erro ao criar indicadores!");
      return INIT_FAILED;
   }

   dailyStartBal = AccountInfoDouble(ACCOUNT_BALANCE);
   Print("SMP Gold Scalper AI v3.0 iniciado — Magic:", EaMagic);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   int handles[] = {hEMA_Fast, hEMA_Mid, hEMA_Slow, hRSI, hATR, hBB, hStoch, hMACD,
                    hEMA_Fast_M5, hEMA_Mid_M5, hEMA_Slow_M5, hRSI_M5,
                    hEMA_Fast_M15, hEMA_Mid_M15, hRSI_M15, hADX_M15,
                    hH1_EMA_Fast, hH1_EMA_Slow};
   for(int i = 0; i < ArraySize(handles); i++) IndicatorRelease(handles[i]);
   Comment("");
}

//+------------------------------------------------------------------+
void OnTick()
{
   ResetDailyCounters();
   ManageOpenPositions();
   if(ShowDashboard) DrawDashboard();

   datetime curBar = iTime(_Symbol, PERIOD_M1, 0);
   if(curBar == lastBarTime) return;
   lastBarTime = curBar;

   if(!IsSessionAllowed())          { statusMsg = "Fora de sessão"; return; }
   if(IsDailyLossHit())             { statusMsg = "Limite de perda diária!"; return; }
   if(IsDailyTradesHit())           { statusMsg = "Max trades/dia atingido"; return; }
   if(CountPositions() >= MaxPositions) { statusMsg = "Posições cheias"; return; }

   double spread = GetSpreadPoints();
   if(spread > MaxSpreadPoints)     { statusMsg = "Spread alto: " + DoubleToString(spread,0); return; }

   double atr    = GetBuf(hATR, 0, 1);
   double atrPts = atr / _Point;
   if(atrPts > ATR_ChaosLimit)     { statusMsg = "Mercado caótico"; return; }
   if(atrPts < ATR_DeadLimit)      { statusMsg = "Mercado parado"; return; }

   int    score     = 0;
   string direction = "";
   string reasons   = "";
   CalculateAIScore(score, direction, reasons, atr);

   lastScore  = score;
   lastReason = reasons;
   lastDir    = direction;
   statusMsg  = (score > 0) ? "" : "Score insuficiente (" + (string)score + "%)";

   if(score < MinScore || direction == "") return;

   double lot = CalculateLot(atr, score);
   if(lot < MinLot) return;

   double slDist  = atr * (SL_ATR_Multi  / 10.0);
   double tp2Dist = atr * (TP2_ATR_Multi / 10.0);

   if(direction == "BUY")
   {
      double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      if(g_trade.Buy(lot, _Symbol, ask,
                     NormalizeDouble(ask - slDist,  _Digits),
                     NormalizeDouble(ask + tp2Dist, _Digits), TradeComment))
      {
         dailyTrades++;
         Print("BUY v3 | Score:", score, " | Lot:", lot, " | ", reasons);
      }
   }
   else if(direction == "SELL")
   {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      if(g_trade.Sell(lot, _Symbol, bid,
                      NormalizeDouble(bid + slDist,  _Digits),
                      NormalizeDouble(bid - tp2Dist, _Digits), TradeComment))
      {
         dailyTrades++;
         Print("SELL v3 | Score:", score, " | Lot:", lot, " | ", reasons);
      }
   }
}

//+------------------------------------------------------------------+
//| Motor de IA v3 — 9 confirmadores + ADX + M15 + H1 adaptativo    |
//+------------------------------------------------------------------+
void CalculateAIScore(int &score, string &direction, string &reasons, double atr)
{
   score     = 0;
   direction = "";
   reasons   = "";

   //--- Leituras M1
   double emaF1   = GetBuf(hEMA_Fast, 0, 1),  emaM1  = GetBuf(hEMA_Mid,  0, 1);
   double emaS1   = GetBuf(hEMA_Slow, 0, 1),  emaF2  = GetBuf(hEMA_Fast, 0, 2);
   double emaM2   = GetBuf(hEMA_Mid,  0, 2);
   double close1  = iClose(_Symbol, PERIOD_M1, 1);
   double close2  = iClose(_Symbol, PERIOD_M1, 2);

   //--- Leituras M5
   double emaF_M5 = GetBuf(hEMA_Fast_M5, 0, 1);
   double emaM_M5 = GetBuf(hEMA_Mid_M5,  0, 1);
   double emaS_M5 = GetBuf(hEMA_Slow_M5, 0, 1);
   double rsiM5   = GetBuf(hRSI_M5, 0, 1);

   //--- Leituras M15
   double emaF_M15  = GetBuf(hEMA_Fast_M15, 0, 1);
   double emaM_M15  = GetBuf(hEMA_Mid_M15,  0, 1);
   double rsiM15    = GetBuf(hRSI_M15, 0, 1);
   double adx       = GetBuf(hADX_M15, 0, 1);
   double diPlus    = GetBuf(hADX_M15, 1, 1);
   double diMinus   = GetBuf(hADX_M15, 2, 1);

   //--- Outros M1
   double rsi1    = GetBuf(hRSI,    0, 1),  rsi2   = GetBuf(hRSI,    0, 2);
   double bbUpp   = GetBuf(hBB, 1, 1),      bbLow  = GetBuf(hBB, 2, 1);
   double bbMid   = GetBuf(hBB, 0, 1);
   double stochK  = GetBuf(hStoch, 0, 1),   stochD = GetBuf(hStoch, 1, 1);
   double macdL   = GetBuf(hMACD, 0, 1),    macdS  = GetBuf(hMACD, 1, 1);
   double macdL2  = GetBuf(hMACD, 0, 2);

   //--- H1
   double h1F     = GetBuf(hH1_EMA_Fast, 0, 1);
   double h1S     = GetBuf(hH1_EMA_Slow, 0, 1);
   bool   h1Bull  = (h1F > h1S);
   bool   h1Bear  = (h1F < h1S);

   //--- Votos
   int    buyV = 0, sellV = 0;
   string buyR = "", sellR = "";

   //--- [1] EMA Stack M1 (tendência imediata)
   bool emaBullM1 = (emaF1 > emaM1 && emaM1 > emaS1);
   bool emaBearM1 = (emaF1 < emaM1 && emaM1 < emaS1);
   if(emaBullM1) { buyV++;  buyR  += "EMA1 "; }
   if(emaBearM1) { sellV++; sellR += "EMA1 "; }

   //--- [2] EMA Stack M5 (tendência de fundo)
   bool emaBullM5 = (emaF_M5 > emaM_M5);
   bool emaBearM5 = (emaF_M5 < emaM_M5);
   if(emaBullM5) { buyV++;  buyR  += "EMA5 "; }
   if(emaBearM5) { sellV++; sellR += "EMA5 "; }

   //--- [3] EMA M15 — tendência média (NOVO)
   bool emaBullM15 = (emaF_M15 > emaM_M15);
   bool emaBearM15 = (emaF_M15 < emaM_M15);
   if(emaBullM15) { buyV++;  buyR  += "EMA15 "; }
   if(emaBearM15) { sellV++; sellR += "EMA15 "; }

   //--- [4] Crossover EMA M1
   bool crossUp   = (emaF1 > emaM1 && emaF2 <= emaM2);
   bool crossDown = (emaF1 < emaM1 && emaF2 >= emaM2);
   if(crossUp)   { buyV++;  buyR  += "CROSS+ "; }
   if(crossDown) { sellV++; sellR += "CROSS- "; }

   //--- [5] RSI M1
   bool rsiBuy  = (rsi1 > 50 && rsi1 < 72 && rsi1 > rsi2) || (rsi1 < 33);
   bool rsiSell = (rsi1 < 50 && rsi1 > 28 && rsi1 < rsi2) || (rsi1 > 67);
   if(rsiBuy)  { buyV++;  buyR  += "RSI1 "; }
   if(rsiSell) { sellV++; sellR += "RSI1 "; }

   //--- [6] RSI M5 + M15 combinados
   bool rsiM5M15Buy  = (rsiM5 > 48 && rsiM15 > 45);
   bool rsiM5M15Sell = (rsiM5 < 52 && rsiM15 < 55);
   if(rsiM5M15Buy)  { buyV++;  buyR  += "RSI_TF "; }
   if(rsiM5M15Sell) { sellV++; sellR += "RSI_TF "; }

   //--- [7] Bollinger Bands
   bool bbBuy  = (close1 <= bbLow  + atr * 0.3) || (close1 > bbMid && close2 <= bbMid);
   bool bbSell = (close1 >= bbUpp  - atr * 0.3) || (close1 < bbMid && close2 >= bbMid);
   if(bbBuy)  { buyV++;  buyR  += "BB "; }
   if(bbSell) { sellV++; sellR += "BB "; }

   //--- [8] Stochastic
   bool stBuy  = (stochK < 35 && stochK > stochD) || (stochK > 50 && stochD < 50 && stochK > stochD);
   bool stSell = (stochK > 65 && stochK < stochD) || (stochK < 50 && stochD > 50 && stochK < stochD);
   if(stBuy)  { buyV++;  buyR  += "STOCH "; }
   if(stSell) { sellV++; sellR += "STOCH "; }

   //--- [9] MACD
   bool macdBuy  = (macdL > macdS && macdL2 <= macdS) || (macdL > macdS && macdL > 0);
   bool macdSell = (macdL < macdS && macdL2 >= macdS) || (macdL < macdS && macdL < 0);
   if(macdBuy)  { buyV++;  buyR  += "MACD "; }
   if(macdSell) { sellV++; sellR += "MACD "; }

   //--- Decisão base (min MinVotes votos)
   bool isBuy  = (buyV  > sellV && buyV  >= MinVotes);
   bool isSell = (sellV > buyV  && sellV >= MinVotes);

   if(!isBuy && !isSell) return;

   //--- Score base: votos (máx 9 confirmadores)
   int rawScore;
   if(isBuy)
   {
      rawScore  = (int)MathRound((double)buyV / 9.0 * 65.0);
      rawScore += (int)MathRound(MathMin(rsi1, 70.0) / 70.0 * 12.0);
      rawScore += (macdL > macdS) ? 6 : 0;
      rawScore += (stochK < 50)   ? 5 : 0;
      rawScore += (emaBullM15)    ? 4 : 0;
   }
   else
   {
      rawScore  = (int)MathRound((double)sellV / 9.0 * 65.0);
      rawScore += (int)MathRound((100.0 - MathMax(rsi1, 30.0)) / 70.0 * 12.0);
      rawScore += (macdL < macdS) ? 6 : 0;
      rawScore += (stochK > 50)   ? 5 : 0;
      rawScore += (emaBearM15)    ? 4 : 0;
   }

   //--- Bônus ADX — mercado com tendência forte
   if(UseADX && adx > ADX_MinTrend)
   {
      int adxBonus = (int)MathMin(MathRound((adx - ADX_MinTrend) / 30.0 * ADX_MaxScore), ADX_MaxScore);
      bool adxBuy  = (diPlus > diMinus && isBuy);
      bool adxSell = (diMinus > diPlus && isSell);
      if(adxBuy || adxSell)
      {
         rawScore += adxBonus;
         if(adxBuy)  buyR  += "ADX";
         if(adxSell) sellR += "ADX";
      }
   }

   rawScore = (int)MathMin(rawScore, 99);

   //--- Modificador H1
   if(UseH1Filter)
   {
      bool h1Aligned = (isBuy && h1Bull) || (isSell && h1Bear);
      bool h1Against = (isBuy && h1Bear) || (isSell && h1Bull);

      if(h1Aligned)
      {
         rawScore += H1_BonusScore;
         if(isBuy)  buyR  += " [H1▲OK]";
         if(isSell) sellR += " [H1▼OK]";
      }
      else if(h1Against)
      {
         if(H1_HardBlock && rawScore < H1_OverrideScore)
            return; // bloqueia se modo duro e score não é elite
         rawScore -= H1_PenaltyScore;
         if(isBuy)  buyR  += " [H1▼!!]";
         if(isSell) sellR += " [H1▲!!]";
      }
      else
      {
         if(isBuy)  buyR  += " [H1-]";
         if(isSell) sellR += " [H1-]";
      }
   }

   rawScore = (int)MathMax(0, MathMin(rawScore, 99));

   if(isBuy)  { direction = "BUY";  score = rawScore; reasons = buyR;  }
   if(isSell) { direction = "SELL"; score = rawScore; reasons = sellR; }
}

//+------------------------------------------------------------------+
//| Calcula lote                                                     |
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
//| Gestão de posições                                               |
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

      ulong  ticket    = g_pos.Ticket();
      double sl        = g_pos.StopLoss();
      double lot       = g_pos.Volume();
      double openPrice = g_pos.PriceOpen();
      double tp        = g_pos.TakeProfit();

      if(g_pos.PositionType() == POSITION_TYPE_BUY)
      {
         double bid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double profit = bid - openPrice;

         if(beDist > 0 && profit >= beDist && sl < openPrice)
            g_trade.PositionModify(ticket, NormalizeDouble(openPrice + _Point * 2, _Digits), tp);

         if(profit >= tp1Dist && lot > MinLot * 2.0)
         {
            double cl = MathMax(MinLot, MathMin(NormalizeDouble(lot * (TP1_ClosePercent/100.0), 2), lot - MinLot));
            if(cl > 0) g_trade.PositionClosePartial(ticket, cl);
         }

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

         if(beDist > 0 && profit >= beDist && (sl == 0 || sl > openPrice))
            g_trade.PositionModify(ticket, NormalizeDouble(openPrice - _Point * 2, _Digits), tp);

         if(profit >= tp1Dist && lot > MinLot * 2.0)
         {
            double cl = MathMax(MinLot, MathMin(NormalizeDouble(lot * (TP1_ClosePercent/100.0), 2), lot - MinLot));
            if(cl > 0) g_trade.PositionClosePartial(ticket, cl);
         }

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
//| Sessões                                                          |
//+------------------------------------------------------------------+
bool IsSessionAllowed()
{
   if(!UseSessionFilter) return true;
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int h = (dt.hour - GmtOffset + 24) % 24;
   bool lon = TradeLondon  && h >= 8  && h < 17;
   bool ny  = TradeNewYork && h >= 13 && h < 22;
   bool asia= TradeAsia    && h >= 0  && h < 8;
   return (lon || ny || asia);
}

void ResetDailyCounters()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   datetime today = StringToTime(StringFormat("%04d.%02d.%02d 00:00", dt.year, dt.mon, dt.day));
   if(today != lastDayReset)
   {
      lastDayReset   = today;
      dailyTrades    = 0;
      dailyStartBal  = AccountInfoDouble(ACCOUNT_BALANCE);
   }
}

bool IsDailyLossHit()
{
   if(MaxDailyLossPct <= 0) return false;
   double bal  = AccountInfoDouble(ACCOUNT_BALANCE);
   double loss = (dailyStartBal - bal) / dailyStartBal * 100.0;
   return (loss >= MaxDailyLossPct);
}

bool IsDailyTradesHit()
{
   return (MaxDailyTrades > 0 && dailyTrades >= MaxDailyTrades);
}

//+------------------------------------------------------------------+
//| Painel                                                           |
//+------------------------------------------------------------------+
void DrawDashboard()
{
   string dirStr  = (lastDir == "BUY")  ? "▲ COMPRA" :
                    (lastDir == "SELL") ? "▼ VENDA"  : "— AGUARDANDO";
   string qualStr = (lastScore >= EliteScore)    ? "ELITE ★★★" :
                    (lastScore >= 78)            ? "PREMIUM ★★" :
                    (lastScore >= MinScore)       ? "FORTE ★"   : "FRACO";

   double h1F    = GetBuf(hH1_EMA_Fast, 0, 1);
   double h1S    = GetBuf(hH1_EMA_Slow, 0, 1);
   string h1Str  = (h1F > h1S) ? "▲ ALTA" : (h1F < h1S) ? "▼ BAIXA" : "— NEUTRO";
   double adx    = GetBuf(hADX_M15, 0, 1);
   string adxStr = (adx > 30) ? "FORTE" : (adx > 20) ? "MÉDIO" : "FRACO";

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd      = (balance > 0) ? (balance - equity) / balance * 100.0 : 0;
   double dayLoss = (dailyStartBal > 0) ? MathMax((dailyStartBal - balance) / dailyStartBal * 100.0, 0) : 0;

   string dash = "";
   dash += "\n  ╔════════════════════════════════════════╗\n";
   dash += "  ║      SMP GOLD SCALPER AI  v3.0        ║\n";
   dash += "  ╠════════════════════════════════════════╣\n";
   dash += StringFormat("  ║  Score IA : %3.0f%%  [%s]\n", lastScore, qualStr);
   dash += StringFormat("  ║  Direção  : %s\n", dirStr);
   dash += StringFormat("  ║  Razões   : %s\n", lastReason);
   dash += "  ╠════════════════════════════════════════╣\n";
   dash += StringFormat("  ║  H1 Bias  : %s\n", h1Str);
   dash += StringFormat("  ║  ADX M15  : %.1f [%s]\n", adx, adxStr);
   dash += StringFormat("  ║  Status   : %s\n", statusMsg == "" ? "Operando" : statusMsg);
   dash += StringFormat("  ║  Sessão   : %s\n", IsSessionAllowed() ? "ATIVA" : "INATIVA");
   dash += "  ╠════════════════════════════════════════╣\n";
   dash += StringFormat("  ║  ATR: %.0f pts  |  Spread: %.0f pts\n", GetBuf(hATR,0,1)/_Point, GetSpreadPoints());
   dash += StringFormat("  ║  Posições : %d/%d  |  Trades: %d/%d\n", CountPositions(), MaxPositions,
                        dailyTrades, MaxDailyTrades > 0 ? MaxDailyTrades : 99);
   dash += "  ╠════════════════════════════════════════╣\n";
   dash += StringFormat("  ║  Banca  : $%.2f  |  DD: %.1f%%\n", balance, dd);
   dash += StringFormat("  ║  Equity : $%.2f  |  Dia: -%.1f%%\n", equity, dayLoss);
   dash += StringFormat("  ║  W: %d  |  L: %d  |  $%.2f\n", totalWins, totalLosses, totalProfit);
   dash += "  ╚════════════════════════════════════════╝";
   Comment(dash);
}

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
   if(balance <= 0) return 0;
   double atr      = GetBuf(hATR, 0, 1);
   double slDist   = atr * (SL_ATR_Multi / 10.0);
   double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double usedRisk = 0;
   if(tickVal <= 0 || slDist <= 0 || tickSize <= 0) return 0;
   for(int i = 0; i < PositionsTotal(); i++)
   {
      if(!g_pos.SelectByIndex(i)) continue;
      if(g_pos.Magic() != EaMagic || g_pos.Symbol() != _Symbol) continue;
      usedRisk += (g_pos.Volume() * (slDist / tickSize) * tickVal) / balance * 100.0;
   }
   return usedRisk;
}

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
   Print("Trade | $", DoubleToString(profit,2), " | Total:$", DoubleToString(totalProfit,2),
         " W:", totalWins, " L:", totalLosses);
}
