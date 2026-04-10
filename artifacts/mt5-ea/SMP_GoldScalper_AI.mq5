//+------------------------------------------------------------------+
//|          SMP Gold Scalper AI — v1.1                              |
//|          SignalMaster Pro — XAU/USD Expert Advisor               |
//|          Sistema de IA com 8 confirmadores + gestão adaptativa   |
//+------------------------------------------------------------------+
#property copyright "SignalMaster Pro"
#property version   "1.01"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

CTrade        g_trade;
CPositionInfo g_pos;

//--- Parâmetros de entrada
input group "=== GESTÃO DE RISCO ==="
input double  RiskPercent      = 1.5;    // % da banca por operação
input double  MaxRiskPercent   = 3.0;    // % máxima simultânea
input int     MaxPositions     = 2;      // Máximo de posições abertas
input double  MinLot           = 0.01;   // Lote mínimo
input double  MaxLot           = 5.0;    // Lote máximo

input group "=== STOP & TARGET ==="
input int     SL_ATR_Multi     = 15;     // Multiplicador ATR para Stop Loss (x0.1)
input int     TP1_ATR_Multi    = 20;     // Multiplicador ATR para TP1 parcial (x0.1)
input int     TP2_ATR_Multi    = 35;     // Multiplicador ATR para TP2 final (x0.1)
input double  TP1_ClosePercent = 50.0;   // % do lote fechado no TP1
input int     Trail_ATR_Multi  = 10;     // Multiplicador ATR para trailing stop (x0.1)
input bool    UseTrailingStop  = true;   // Usar trailing stop adaptativo

input group "=== IA — FILTROS DE QUALIDADE ==="
input int     MinScore         = 75;     // Score mínimo de IA para entrada (0-100)
input int     EliteScore       = 88;     // Score ELITE — lote aumentado em 50%
input double  MaxSpreadPoints  = 35.0;   // Spread máximo permitido (pontos)
input int     ATR_ChaosLimit   = 400;    // ATR máximo — mercado caótico (pontos)
input int     ATR_DeadLimit    = 3;      // ATR mínimo — mercado morto (pontos)

input group "=== INDICADORES ==="
input int     EMA_Fast         = 8;      // EMA rápida
input int     EMA_Mid          = 21;     // EMA média
input int     EMA_Slow         = 55;     // EMA lenta
input int     RSI_Period       = 14;     // Período RSI
input int     ATR_Period       = 14;     // Período ATR
input int     BB_Period        = 20;     // Período Bollinger Bands
input double  BB_Dev           = 2.0;    // Desvio Bollinger Bands
input int     Stoch_K          = 5;      // Stochastic %K
input int     Stoch_D          = 3;      // Stochastic %D
input int     Stoch_Slowing    = 3;      // Stochastic Slowing
input int     MACD_Fast        = 12;     // MACD rápida
input int     MACD_Slow        = 26;     // MACD lenta
input int     MACD_Signal      = 9;      // MACD signal

input group "=== HORÁRIOS ==="
input bool    FilterHours      = false;  // Filtrar horários (false = 24h)
input int     StartHour        = 8;      // Hora início (se filtro ativo)
input int     EndHour          = 22;     // Hora fim (se filtro ativo)

input group "=== CONFIGURAÇÕES ==="
input int     EaMagic          = 20250410; // Magic number
input string  TradeComment     = "SMP_Gold_AI";
input bool    ShowDashboard    = true;   // Mostrar painel na tela

//--- Handles dos indicadores
int hEMA_Fast, hEMA_Mid, hEMA_Slow;
int hRSI, hATR, hBB, hStoch, hMACD;
int hEMA_Fast_M5, hEMA_Mid_M5, hEMA_Slow_M5;
int hRSI_M5, hATR_M15;

//--- Variáveis globais
datetime lastBarTime  = 0;
double   lastScore    = 0;
string   lastReason   = "";
string   lastDir      = "";
int      totalWins    = 0;
int      totalLosses  = 0;
double   totalProfit  = 0;

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

   hEMA_Fast_M5 = iMA(sym, PERIOD_M5, EMA_Fast,  0, MODE_EMA, PRICE_CLOSE);
   hEMA_Mid_M5  = iMA(sym, PERIOD_M5, EMA_Mid,   0, MODE_EMA, PRICE_CLOSE);
   hEMA_Slow_M5 = iMA(sym, PERIOD_M5, EMA_Slow,  0, MODE_EMA, PRICE_CLOSE);
   hRSI_M5      = iRSI(sym, PERIOD_M5, RSI_Period, PRICE_CLOSE);
   hATR_M15     = iATR(sym, PERIOD_M15, ATR_Period);

   if(hEMA_Fast == INVALID_HANDLE || hRSI == INVALID_HANDLE || hATR == INVALID_HANDLE)
   {
      Alert("SMP Gold AI: Erro ao criar indicadores!");
      return INIT_FAILED;
   }

   Print("SMP Gold Scalper AI v1.1 iniciado — XAU/USD — Magic: ", EaMagic);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Desinicialização                                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   IndicatorRelease(hEMA_Fast);  IndicatorRelease(hEMA_Mid);     IndicatorRelease(hEMA_Slow);
   IndicatorRelease(hRSI);       IndicatorRelease(hATR);         IndicatorRelease(hBB);
   IndicatorRelease(hStoch);     IndicatorRelease(hMACD);
   IndicatorRelease(hEMA_Fast_M5); IndicatorRelease(hEMA_Mid_M5); IndicatorRelease(hEMA_Slow_M5);
   IndicatorRelease(hRSI_M5);    IndicatorRelease(hATR_M15);
   Comment("");
}

//+------------------------------------------------------------------+
//| Tick principal                                                    |
//+------------------------------------------------------------------+
void OnTick()
{
   ManageOpenPositions();
   if(ShowDashboard) DrawDashboard();

   datetime curBar = iTime(_Symbol, PERIOD_M1, 0);
   if(curBar == lastBarTime) return;
   lastBarTime = curBar;

   if(!IsAllowedHour()) return;
   if(CountPositions() >= MaxPositions) return;

   double spread = GetSpreadPoints();
   if(spread > MaxSpreadPoints) return;

   double atr    = GetBufferValue(hATR, 0, 1);
   double atrPts = atr / _Point;
   if(atrPts > ATR_ChaosLimit || atrPts < ATR_DeadLimit) return;

   int    score     = 0;
   string direction = "";
   string reasons   = "";
   CalculateAIScore(score, direction, reasons, atr);

   lastScore  = score;
   lastReason = reasons;
   lastDir    = direction;

   if(score < MinScore) return;
   if(direction == "")  return;

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
         Print("BUY | Score:", score, " | Lot:", lot, " | SL:", sl, " | TP:", tp2, " | ", reasons);
   }
   else if(direction == "SELL")
   {
      double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl  = NormalizeDouble(bid + slDist,  _Digits);
      double tp2 = NormalizeDouble(bid - tp2Dist, _Digits);
      if(g_trade.Sell(lot, _Symbol, bid, sl, tp2, TradeComment))
         Print("SELL | Score:", score, " | Lot:", lot, " | SL:", sl, " | TP:", tp2, " | ", reasons);
   }
}

//+------------------------------------------------------------------+
//| Motor de IA — calcula score 0-100 com 8 confirmadores            |
//+------------------------------------------------------------------+
void CalculateAIScore(int &score, string &direction, string &reasons, double atr)
{
   score     = 0;
   direction = "";
   reasons   = "";

   double emaF1   = GetBufferValue(hEMA_Fast, 0, 1);
   double emaM1   = GetBufferValue(hEMA_Mid,  0, 1);
   double emaS1   = GetBufferValue(hEMA_Slow, 0, 1);
   double emaF2   = GetBufferValue(hEMA_Fast, 0, 2);
   double emaM2   = GetBufferValue(hEMA_Mid,  0, 2);
   double close1  = iClose(_Symbol, PERIOD_M1, 1);
   double close2  = iClose(_Symbol, PERIOD_M1, 2);

   double emaF_M5 = GetBufferValue(hEMA_Fast_M5, 0, 1);
   double emaM_M5 = GetBufferValue(hEMA_Mid_M5,  0, 1);
   double emaS_M5 = GetBufferValue(hEMA_Slow_M5, 0, 1);

   double rsi1    = GetBufferValue(hRSI,    0, 1);
   double rsi2    = GetBufferValue(hRSI,    0, 2);
   double rsiM5   = GetBufferValue(hRSI_M5, 0, 1);

   double bbUpp   = GetBufferValue(hBB, 1, 1);
   double bbLow   = GetBufferValue(hBB, 2, 1);
   double bbMid   = GetBufferValue(hBB, 0, 1);

   double stochK  = GetBufferValue(hStoch, 0, 1);
   double stochD  = GetBufferValue(hStoch, 1, 1);

   double macdMain = GetBufferValue(hMACD, 0, 1);
   double macdSig  = GetBufferValue(hMACD, 1, 1);
   double macdPrev = GetBufferValue(hMACD, 0, 2);

   int    buyVotes  = 0, sellVotes = 0;
   string buyRsn    = "",  sellRsn  = "";

   //--- [1] EMA Stack M1 — alinhamento de tendência
   bool emaBullM1 = (emaF1 > emaM1 && emaM1 > emaS1);
   bool emaBearM1 = (emaF1 < emaM1 && emaM1 < emaS1);
   if(emaBullM1) { buyVotes++;  buyRsn  += "EMA_M1 "; }
   if(emaBearM1) { sellVotes++; sellRsn += "EMA_M1 "; }

   //--- [2] EMA Stack M5 — tendência de fundo
   bool emaBullM5 = (emaF_M5 > emaM_M5 && emaM_M5 > emaS_M5);
   bool emaBearM5 = (emaF_M5 < emaM_M5 && emaM_M5 < emaS_M5);
   if(emaBullM5) { buyVotes++;  buyRsn  += "EMA_M5 "; }
   if(emaBearM5) { sellVotes++; sellRsn += "EMA_M5 "; }

   //--- [3] Cruzamento EMA M1 — crossover recente
   bool crossUp   = (emaF1 > emaM1 && emaF2 <= emaM2);
   bool crossDown = (emaF1 < emaM1 && emaF2 >= emaM2);
   if(crossUp)   { buyVotes++;  buyRsn  += "CROSS_UP "; }
   if(crossDown) { sellVotes++; sellRsn += "CROSS_DN "; }

   //--- [4] RSI M1 — momentum
   bool rsiBuy   = (rsi1 > 50 && rsi1 < 75 && rsi1 > rsi2);
   bool rsiSell  = (rsi1 < 50 && rsi1 > 25 && rsi1 < rsi2);
   bool rsiOSold = (rsi1 < 35);
   bool rsiOBght = (rsi1 > 65);
   if(rsiBuy || rsiOSold) { buyVotes++;  buyRsn  += "RSI "; }
   if(rsiSell || rsiOBght){ sellVotes++; sellRsn += "RSI "; }

   //--- [5] RSI M5 — força de fundo
   bool rsiM5Buy  = (rsiM5 > 48 && rsiM5 < 80);
   bool rsiM5Sell = (rsiM5 < 52 && rsiM5 > 20);
   if(rsiM5Buy)  { buyVotes++;  buyRsn  += "RSI_M5 "; }
   if(rsiM5Sell) { sellVotes++; sellRsn += "RSI_M5 "; }

   //--- [6] Bollinger Bands — zonas extremas e cruzamento da média
   bool bbBuy      = (close1 < bbLow  && close1 > bbLow  - atr * 0.5);
   bool bbSell     = (close1 > bbUpp  && close1 < bbUpp  + atr * 0.5);
   bool bbMidBuy   = (close1 > bbMid  && close2 < bbMid);
   bool bbMidSell  = (close1 < bbMid  && close2 > bbMid);
   if(bbBuy  || bbMidBuy)  { buyVotes++;  buyRsn  += "BB "; }
   if(bbSell || bbMidSell) { sellVotes++; sellRsn += "BB "; }

   //--- [7] Stochastic — timing de entrada
   bool stochBuy     = (stochK < 30 && stochK > stochD);
   bool stochSell    = (stochK > 70 && stochK < stochD);
   bool stochMidBuy  = (stochK > 50 && stochD < 50 && stochK > stochD);
   bool stochMidSell = (stochK < 50 && stochD > 50 && stochK < stochD);
   if(stochBuy  || stochMidBuy)  { buyVotes++;  buyRsn  += "STOCH "; }
   if(stochSell || stochMidSell) { sellVotes++; sellRsn += "STOCH "; }

   //--- [8] MACD — momentum e cruzamento
   bool macdBuy       = (macdMain > macdSig && macdPrev <= macdSig && macdMain < 0);
   bool macdSell      = (macdMain < macdSig && macdPrev >= macdSig && macdMain > 0);
   bool macdTrendBuy  = (macdMain > macdSig && macdMain > 0);
   bool macdTrendSell = (macdMain < macdSig && macdMain < 0);
   if(macdBuy  || macdTrendBuy)  { buyVotes++;  buyRsn  += "MACD "; }
   if(macdSell || macdTrendSell) { sellVotes++; sellRsn += "MACD "; }

   //--- Alinhamento M1 + M5 obrigatório
   bool alignedBuy  = (emaBullM1 && emaBullM5);
   bool alignedSell = (emaBearM1 && emaBearM5);

   if(buyVotes > sellVotes && buyVotes >= 4 && alignedBuy)
   {
      direction = "BUY";
      score     = (int)MathRound((double)buyVotes / 8.0 * 70.0);
      score    += (int)MathRound(MathMin(rsi1, 70) / 70.0 * 15.0);
      score    += (macdMain > macdSig) ? 8 : 0;
      score    += (stochK < 45)        ? 7 : 0;
      score     = (int)MathMin(score, 99);
      reasons   = buyRsn;
   }
   else if(sellVotes > buyVotes && sellVotes >= 4 && alignedSell)
   {
      direction = "SELL";
      score     = (int)MathRound((double)sellVotes / 8.0 * 70.0);
      score    += (int)MathRound((100.0 - MathMax(rsi1, 30.0)) / 70.0 * 15.0);
      score    += (macdMain < macdSig) ? 8 : 0;
      score    += (stochK > 55)        ? 7 : 0;
      score     = (int)MathMin(score, 99);
      reasons   = sellRsn;
   }
}

//+------------------------------------------------------------------+
//| Calcula lote — % da banca + volatilidade ATR + score             |
//+------------------------------------------------------------------+
double CalculateLot(double atr, int score)
{
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmt  = balance * (RiskPercent / 100.0);
   double slDist   = atr * (SL_ATR_Multi / 10.0);
   double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double lotStep  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(tickVal == 0 || slDist == 0 || tickSize == 0) return MinLot;

   double lot = riskAmt / ((slDist / tickSize) * tickVal);

   if(score >= EliteScore) lot *= 1.5;

   lot = MathFloor(lot / lotStep) * lotStep;
   lot = MathMax(MinLot, MathMin(MaxLot, lot));

   double usedRisk = GetUsedRiskPercent();
   if(usedRisk + RiskPercent > MaxRiskPercent)
   {
      double allowed = MaxRiskPercent - usedRisk;
      if(allowed <= 0) return 0;
      lot *= allowed / RiskPercent;
      lot  = MathFloor(lot / lotStep) * lotStep;
   }

   return NormalizeDouble(lot, 2);
}

//+------------------------------------------------------------------+
//| Gestão de posições — trailing stop + TP parcial                  |
//+------------------------------------------------------------------+
void ManageOpenPositions()
{
   double atr       = GetBufferValue(hATR, 0, 1);
   double trailDist = atr * (Trail_ATR_Multi / 10.0);

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(!g_pos.SelectByIndex(i)) continue;
      if(g_pos.Magic() != EaMagic || g_pos.Symbol() != _Symbol) continue;

      double slCur     = g_pos.StopLoss();
      double lot       = g_pos.Volume();
      double openPrice = g_pos.PriceOpen();
      double tp        = g_pos.TakeProfit();
      ulong  ticket    = g_pos.Ticket();
      double tp1Dist   = atr * (TP1_ATR_Multi / 10.0);

      if(g_pos.PositionType() == POSITION_TYPE_BUY)
      {
         double bid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double profit = bid - openPrice;

         if(profit >= tp1Dist && lot > MinLot * 2.0)
         {
            double closeLot = NormalizeDouble(lot * (TP1_ClosePercent / 100.0), 2);
            closeLot = MathMax(MinLot, MathMin(closeLot, lot - MinLot));
            if(closeLot > 0)
               g_trade.PositionClosePartial(ticket, closeLot);
         }

         if(UseTrailingStop)
         {
            double newSL = NormalizeDouble(bid - trailDist, _Digits);
            if(newSL > slCur + _Point * 5 && newSL > openPrice)
               g_trade.PositionModify(ticket, newSL, tp);
         }
      }
      else if(g_pos.PositionType() == POSITION_TYPE_SELL)
      {
         double ask    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double profit = openPrice - ask;

         if(profit >= tp1Dist && lot > MinLot * 2.0)
         {
            double closeLot = NormalizeDouble(lot * (TP1_ClosePercent / 100.0), 2);
            closeLot = MathMax(MinLot, MathMin(closeLot, lot - MinLot));
            if(closeLot > 0)
               g_trade.PositionClosePartial(ticket, closeLot);
         }

         if(UseTrailingStop)
         {
            double newSL = NormalizeDouble(ask + trailDist, _Digits);
            if((slCur == 0 || newSL < slCur - _Point * 5) && newSL < openPrice)
               g_trade.PositionModify(ticket, newSL, tp);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Painel de informações na tela                                    |
//+------------------------------------------------------------------+
void DrawDashboard()
{
   string dirStr  = (lastDir == "BUY")  ? "▲ COMPRA (BUY)"  :
                    (lastDir == "SELL") ? "▼ VENDA (SELL)"  : "— AGUARDANDO";
   string qualStr = "";
   if(lastScore >= EliteScore)    qualStr = "ELITE ★★★";
   else if(lastScore >= 84)       qualStr = "PREMIUM ★★";
   else if(lastScore >= MinScore) qualStr = "FORTE ★";
   else                           qualStr = "FRACO";

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double spread  = GetSpreadPoints();
   double atrPts  = GetBufferValue(hATR, 0, 1) / _Point;

   double dd = 0;
   if(balance > 0) dd = (balance - equity) / balance * 100.0;

   string dash = "";
   dash += "\n  ╔══════════════════════════════════╗\n";
   dash += "  ║   SMP GOLD SCALPER AI  v1.1     ║\n";
   dash += "  ╠══════════════════════════════════╣\n";
   dash += StringFormat("  ║  Score IA : %3.0f%%  [%s]\n", lastScore, qualStr);
   dash += StringFormat("  ║  Direção  : %s\n", dirStr);
   dash += StringFormat("  ║  Razões   : %s\n", lastReason);
   dash += "  ╠══════════════════════════════════╣\n";
   dash += StringFormat("  ║  ATR      : %.0f pts  |  Spread: %.0f\n", atrPts, spread);
   dash += StringFormat("  ║  Posições : %d / %d\n",   CountPositions(), MaxPositions);
   dash += StringFormat("  ║  Banca    : $%.2f\n",     balance);
   dash += StringFormat("  ║  Equity   : $%.2f  (DD: %.1f%%)\n", equity, dd);
   dash += "  ╠══════════════════════════════════╣\n";
   dash += StringFormat("  ║  Wins: %d  |  Losses: %d\n", totalWins, totalLosses);
   dash += StringFormat("  ║  Lucro total : $%.2f\n",     totalProfit);
   dash += "  ╚══════════════════════════════════╝";

   Comment(dash);
}

//+------------------------------------------------------------------+
//| Funções auxiliares                                               |
//+------------------------------------------------------------------+
double GetBufferValue(int handle, int buffer, int shift)
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
   double atr      = GetBufferValue(hATR, 0, 1);
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

bool IsAllowedHour()
{
   if(!FilterHours) return true;
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   return (dt.hour >= StartHour && dt.hour < EndHour);
}

//+------------------------------------------------------------------+
//| Rastreia resultados de trades fechados                           |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;

   ulong ticket = trans.deal;
   if(!HistoryDealSelect(ticket)) return;

   long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);
   if(magic != EaMagic) return;

   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   if(profit == 0) return;

   totalProfit += profit;
   if(profit > 0) totalWins++;
   else           totalLosses++;

   Print("Trade fechado | Lucro: $", DoubleToString(profit, 2),
         " | Total: $", DoubleToString(totalProfit, 2),
         " | W:", totalWins, " L:", totalLosses);
}
