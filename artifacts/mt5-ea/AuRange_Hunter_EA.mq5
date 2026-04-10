//+------------------------------------------------------------------+
//|                                        AuRange_Hunter_EA.mq5     |
//|           AuRange Hunter — 3-Session Range Scalper for Gold      |
//|                               v1.0  (MQL5)                       |
//+------------------------------------------------------------------+
#property copyright "AuRange Hunter EA v1.0"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\OrderInfo.mqh>
#include <Trade\PositionInfo.mqh>

CTrade trade;

//──────────────────────────────────────────────────────────────────────
// INPUTS
//──────────────────────────────────────────────────────────────────────

input group "=== Strategy Control ==="
input bool   EnableStrategy1 = true;
input bool   EnableStrategy2 = true;
input bool   EnableStrategy3 = true;
input int    MagicNumber     = 38102;

input group "=== Advanced Settings ==="
input bool   TradeMon = true;
input bool   TradeTue = true;
input bool   TradeWed = true;
input bool   TradeThu = true;
input bool   TradeFri = true;

//── Strategy 1 ── (23:30 New York ≈ 06:30 Server UTC+3) ────────────
input group "*** Strategy 1 Settings ***"
input int    S1_Hour         = 6;
input int    S1_Minute       = 30;
input group "*** Strategy 1 Risk Management ***"
input double S1_SpreadLimit  = 400;
input double S1_FixedLot     = 0.1;
input double S1_RiskPct      = 3.0;
input bool   S1_AllowBuy     = true;
input bool   S1_AllowSell    = true;
input bool   S1_RemoveOpp    = true;
input group "*** Strategy 1 Buy Order Settings ***"
input int    S1_BuyTimeEnd   = 180;
input int    S1_BuyOffset    = 75;      // > 0 = BUY_STOP above Ask
input int    S1_BuyTP        = 1500;
input int    S1_BuySL        = 1500;
input group "*** Strategy 1 Sell Order Settings ***"
input int    S1_SellTimeEnd  = 180;
input int    S1_SellOffset   = -50;     // < 0 = SELL_STOP below Bid
input int    S1_SellTP       = 1500;
input int    S1_SellSL       = 1500;
input group "*** Strategy 1 Scalper Machine Parameters ***"
input bool   S1_ScalperActive  = true;
input double S1_RoomPts        = 200.0;
input double S1_BuyLevel       = 170.0;
input double S1_BuyTrailPct    = 30.0;
input double S1_SellLevel      = 170.0;
input double S1_SellTrailPct   = 30.0;
input int    S1_BuyBE          = 0;     // profit pts to trigger BE (0 = disabled)
input int    S1_BuyBEDist      = 0;     // SL distance from open after BE
input int    S1_SellBE         = 0;
input int    S1_SellBEDist     = 0;

//── Strategy 2 ── (9:30 New York ≈ 16:30 Server UTC+3) ─────────────
input group "*** Strategy 2 Settings ***"
input int    S2_Hour         = 16;
input int    S2_Minute       = 30;
input group "*** Strategy 2 Risk Management ***"
input double S2_SpreadLimit  = 400;
input double S2_FixedLot     = 0.1;
input double S2_RiskPct      = 1.5;
input bool   S2_AllowBuy     = true;
input bool   S2_AllowSell    = true;
input bool   S2_RemoveOpp    = true;
input group "*** Strategy 2 Buy Order Settings ***"
input int    S2_BuyTimeEnd   = 90;
input int    S2_BuyOffset    = -10;     // < 0 = BUY_LIMIT below Ask (dip buy)
input int    S2_BuyTP        = 1000;
input int    S2_BuySL        = 500;
input group "*** Strategy 2 Sell Order Settings ***"
input int    S2_SellTimeEnd  = 90;
input int    S2_SellOffset   = 25;      // > 0 = SELL_LIMIT above Bid (rally sell)
input int    S2_SellTP       = 1000;
input int    S2_SellSL       = 500;
input group "*** Strategy 2 Scalper Machine Parameters ***"
input bool   S2_ScalperActive  = true;
input double S2_RoomPts        = 200.0;
input double S2_BuyLevel       = 90.0;
input double S2_BuyTrailPct    = 35.0;
input double S2_SellLevel      = 90.0;
input double S2_SellTrailPct   = 35.0;
input int    S2_BuyBE          = 0;
input int    S2_BuyBEDist      = 0;
input int    S2_SellBE         = 0;
input int    S2_SellBEDist     = 0;

//── Strategy 3 ── (18:00 New York ≈ 01:00 Server UTC+3) ────────────
input group "*** Strategy 3 Settings ***"
input int    S3_Hour         = 1;
input int    S3_Minute       = 0;
input group "*** Strategy 3 Risk Management ***"
input double S3_SpreadLimit  = 400;
input double S3_FixedLot     = 0.1;
input double S3_RiskPct      = 3.0;
input bool   S3_AllowBuy     = true;
input bool   S3_AllowSell    = true;
input bool   S3_RemoveOpp    = true;
input group "*** Strategy 3 Buy Order Settings ***"
input int    S3_BuyTimeEnd   = 1300;
input int    S3_BuyOffset    = 1;       // barely above Ask = breakout trigger
input int    S3_BuyTP        = 1000;
input int    S3_BuySL        = 1000;
input group "*** Strategy 3 Sell Order Settings ***"
input int    S3_SellTimeEnd  = 1300;
input int    S3_SellOffset   = -1;      // barely below Bid = breakout trigger
input int    S3_SellTP       = 1000;
input int    S3_SellSL       = 1000;
input group "*** Strategy 3 Scalper Machine Parameters ***"
input bool   S3_ScalperActive  = true;
input double S3_RoomPts        = 200.0;
input double S3_BuyLevel       = 100.0;
input double S3_BuyTrailPct    = 25.0;
input double S3_SellLevel      = 100.0;
input double S3_SellTrailPct   = 25.0;
input int    S3_BuyBE          = 0;
input int    S3_BuyBEDist      = 0;
input int    S3_SellBE         = 0;
input int    S3_SellBEDist     = 0;

//──────────────────────────────────────────────────────────────────────
// STRUCTS
//──────────────────────────────────────────────────────────────────────

struct StrategyParams {
   bool   enabled;
   int    entryHour;
   int    entryMinute;
   double spreadLimit;
   double fixedLot;
   double riskPct;
   bool   allowBuy;
   bool   allowSell;
   bool   removeOpp;
   int    buyTimeEnd;
   int    buyOffset;
   int    buyTP;
   int    buySL;
   int    sellTimeEnd;
   int    sellOffset;
   int    sellTP;
   int    sellSL;
   bool   scalperActive;
   double roomPts;
   double buyLevel;
   double buyTrailPct;
   double sellLevel;
   double sellTrailPct;
   int    buyBE;
   int    buyBEDist;
   int    sellBE;
   int    sellBEDist;
};

struct StrategyState {
   bool     ordersPlaced;
   datetime entryTime;
   double   buyBasePx;    // Ask when buy order was last placed (for scalper)
   double   sellBasePx;   // Bid when sell order was last placed
};

//──────────────────────────────────────────────────────────────────────
// GLOBALS
//──────────────────────────────────────────────────────────────────────

StrategyParams g_params[3];
StrategyState  g_state[3];
double         g_point;
int            g_lastDay = -1;

//──────────────────────────────────────────────────────────────────────
// HELPERS
//──────────────────────────────────────────────────────────────────────

// Magic number encoding: base + stratId*10 + (sell?1:0)
int BuildMagic(int stratId, bool isSell)
{
   return MagicNumber + stratId * 10 + (isSell ? 1 : 0);
}

double GetSpreadPts()
{
   return (SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID)) / g_point;
}

bool IsTradingDay()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   switch (dt.day_of_week) {
      case 1: return TradeMon;
      case 2: return TradeTue;
      case 3: return TradeWed;
      case 4: return TradeThu;
      case 5: return TradeFri;
      default: return false;
   }
}

bool IsEntryMinute(int tgtHour, int tgtMin)
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   return (dt.hour == tgtHour && dt.min == tgtMin);
}

int CountPendingByMagic(int magic)
{
   int cnt = 0;
   int total = OrdersTotal();
   for (int i = total - 1; i >= 0; i--) {
      ulong ticket = OrderGetTicket(i);
      if (ticket == 0) continue;
      if ((int)OrderGetInteger(ORDER_MAGIC) == magic)
         cnt++;
   }
   return cnt;
}

void DeleteOrdersByMagic(int magic)
{
   int total = OrdersTotal();
   for (int i = total - 1; i >= 0; i--) {
      ulong ticket = OrderGetTicket(i);
      if (ticket == 0) continue;
      if ((int)OrderGetInteger(ORDER_MAGIC) == magic)
         trade.OrderDelete(ticket);
   }
}

double GetPendingPrice(int magic)
{
   int total = OrdersTotal();
   for (int i = total - 1; i >= 0; i--) {
      ulong ticket = OrderGetTicket(i);
      if (ticket == 0) continue;
      if ((int)OrderGetInteger(ORDER_MAGIC) == magic)
         return OrderGetDouble(ORDER_PRICE_OPEN);
   }
   return 0.0;
}

datetime GetPendingExpiry(int magic)
{
   int total = OrdersTotal();
   for (int i = total - 1; i >= 0; i--) {
      ulong ticket = OrderGetTicket(i);
      if (ticket == 0) continue;
      if ((int)OrderGetInteger(ORDER_MAGIC) == magic)
         return (datetime)OrderGetInteger(ORDER_TIME_EXPIRATION);
   }
   return 0;
}

bool HasPosition(int magic)
{
   int total = PositionsTotal();
   for (int i = total - 1; i >= 0; i--) {
      ulong ticket = PositionGetTicket(i);
      if (ticket == 0) continue;
      if ((int)PositionGetInteger(POSITION_MAGIC) == magic)
         return true;
   }
   return false;
}

// Determine order type from offset sign
// Buy: offset>=0 → BUY_STOP; offset<0 → BUY_LIMIT
// Sell: offset<=0 → SELL_STOP; offset>0 → SELL_LIMIT
ENUM_ORDER_TYPE GetBuyOrderType(int offset)
{
   return (offset >= 0) ? ORDER_TYPE_BUY_STOP : ORDER_TYPE_BUY_LIMIT;
}

ENUM_ORDER_TYPE GetSellOrderType(int offset)
{
   return (offset <= 0) ? ORDER_TYPE_SELL_STOP : ORDER_TYPE_SELL_LIMIT;
}

// Validate price distance from broker minimum
bool ValidateStopDistance(double price, double sl, double tp, bool isBuy)
{
   double minDist = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * g_point;
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   if (isBuy) {
      if (price <= ask && price > ask - minDist) return false; // too close for stop
      if (sl > 0 && price - sl < minDist) return false;
      if (tp > 0 && tp - price < minDist) return false;
   } else {
      if (price >= bid && price < bid + minDist) return false;
      if (sl > 0 && sl - price < minDist) return false;
      if (tp > 0 && price - tp < minDist) return false;
   }
   return true;
}

//──────────────────────────────────────────────────────────────────────
// ORDER PLACEMENT
//──────────────────────────────────────────────────────────────────────

void PlaceBuyOrder(int stratId, StrategyParams &p)
{
   int    magic   = BuildMagic(stratId, false);
   double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double entryPx = NormalizeDouble(ask + p.buyOffset * g_point, _Digits);
   double tp      = NormalizeDouble(entryPx + p.buyTP * g_point, _Digits);
   double sl      = NormalizeDouble(entryPx - p.buySL * g_point, _Digits);
   datetime expiry = (datetime)(TimeCurrent() + (long)p.buyTimeEnd * 60);
   ENUM_ORDER_TYPE otype = GetBuyOrderType(p.buyOffset);
   string comment = "ARH_S" + IntegerToString(stratId + 1) + "_Buy";

   trade.SetExpertMagicNumber(magic);
   if (trade.OrderOpen(_Symbol, otype, p.fixedLot, 0, entryPx, sl, tp, ORDER_TIME_SPECIFIED, expiry, comment)) {
      g_state[stratId].buyBasePx = ask;
      PrintFormat("[S%d] BUY %s @ %.2f  SL=%.2f  TP=%.2f  exp=%s",
                  stratId + 1, EnumToString(otype), entryPx, sl, tp, TimeToString(expiry));
   } else {
      PrintFormat("[S%d] BUY FAILED: %s", stratId + 1, trade.ResultRetcodeDescription());
   }
}

void PlaceSellOrder(int stratId, StrategyParams &p)
{
   int    magic   = BuildMagic(stratId, true);
   double bid     = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double entryPx = NormalizeDouble(bid + p.sellOffset * g_point, _Digits);
   double tp      = NormalizeDouble(entryPx - p.sellTP * g_point, _Digits);
   double sl      = NormalizeDouble(entryPx + p.sellSL * g_point, _Digits);
   datetime expiry = (datetime)(TimeCurrent() + (long)p.sellTimeEnd * 60);
   ENUM_ORDER_TYPE otype = GetSellOrderType(p.sellOffset);
   string comment = "ARH_S" + IntegerToString(stratId + 1) + "_Sell";

   trade.SetExpertMagicNumber(magic);
   if (trade.OrderOpen(_Symbol, otype, p.fixedLot, 0, entryPx, sl, tp, ORDER_TIME_SPECIFIED, expiry, comment)) {
      g_state[stratId].sellBasePx = bid;
      PrintFormat("[S%d] SELL %s @ %.2f  SL=%.2f  TP=%.2f  exp=%s",
                  stratId + 1, EnumToString(otype), entryPx, sl, tp, TimeToString(expiry));
   } else {
      PrintFormat("[S%d] SELL FAILED: %s", stratId + 1, trade.ResultRetcodeDescription());
   }
}

//──────────────────────────────────────────────────────────────────────
// SCALPER MACHINE — maintain pending orders near current price
//──────────────────────────────────────────────────────────────────────
// Logic: re-place pending order when price has moved Level%*Room pts
// from the Ask/Bid at the time the order was last placed.
// This keeps the pending order always at Offset pts from current price.
//──────────────────────────────────────────────────────────────────────

void RunScalperMachine(int stratId, StrategyParams &p)
{
   if (!p.scalperActive) return;

   int    magicBuy  = BuildMagic(stratId, false);
   int    magicSell = BuildMagic(stratId, true);
   double ask       = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid       = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   // ── BUY pending ──────────────────────────────────────────────
   if (CountPendingByMagic(magicBuy) > 0 && !HasPosition(magicBuy)) {
      double threshold = p.roomPts * p.buyLevel / 100.0 * g_point;
      double priceMoved = MathAbs(ask - g_state[stratId].buyBasePx);

      if (priceMoved >= threshold) {
         datetime exp = GetPendingExpiry(magicBuy);
         if (exp == 0 || exp <= TimeCurrent()) return; // expired or invalid

         DeleteOrdersByMagic(magicBuy);

         double newEntry = NormalizeDouble(ask + p.buyOffset * g_point, _Digits);
         double newTP    = NormalizeDouble(newEntry + p.buyTP * g_point, _Digits);
         double newSL    = NormalizeDouble(newEntry - p.buySL * g_point, _Digits);
         ENUM_ORDER_TYPE otype = GetBuyOrderType(p.buyOffset);
         string comment = "ARH_S" + IntegerToString(stratId + 1) + "_Buy_Adj";

         trade.SetExpertMagicNumber(magicBuy);
         if (trade.OrderOpen(_Symbol, otype, p.fixedLot, 0, newEntry, newSL, newTP,
                             ORDER_TIME_SPECIFIED, exp, comment)) {
            g_state[stratId].buyBasePx = ask;
            PrintFormat("[S%d] Scalper adj BUY → %.2f (moved %.1f pts)", stratId + 1, newEntry, priceMoved / g_point);
         }
      }
   }

   // ── SELL pending ─────────────────────────────────────────────
   if (CountPendingByMagic(magicSell) > 0 && !HasPosition(magicSell)) {
      double threshold  = p.roomPts * p.sellLevel / 100.0 * g_point;
      double priceMoved = MathAbs(bid - g_state[stratId].sellBasePx);

      if (priceMoved >= threshold) {
         datetime exp = GetPendingExpiry(magicSell);
         if (exp == 0 || exp <= TimeCurrent()) return;

         DeleteOrdersByMagic(magicSell);

         double newEntry = NormalizeDouble(bid + p.sellOffset * g_point, _Digits);
         double newTP    = NormalizeDouble(newEntry - p.sellTP * g_point, _Digits);
         double newSL    = NormalizeDouble(newEntry + p.sellSL * g_point, _Digits);
         ENUM_ORDER_TYPE otype = GetSellOrderType(p.sellOffset);
         string comment = "ARH_S" + IntegerToString(stratId + 1) + "_Sell_Adj";

         trade.SetExpertMagicNumber(magicSell);
         if (trade.OrderOpen(_Symbol, otype, p.fixedLot, 0, newEntry, newSL, newTP,
                             ORDER_TIME_SPECIFIED, exp, comment)) {
            g_state[stratId].sellBasePx = bid;
            PrintFormat("[S%d] Scalper adj SELL → %.2f (moved %.1f pts)", stratId + 1, newEntry, priceMoved / g_point);
         }
      }
   }
}

//──────────────────────────────────────────────────────────────────────
// POSITION MANAGEMENT — trailing stop & break-even
//──────────────────────────────────────────────────────────────────────

void ManagePositions(int stratId, StrategyParams &p)
{
   int magicBuy  = BuildMagic(stratId, false);
   int magicSell = BuildMagic(stratId, true);

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   int total = PositionsTotal();
   for (int i = total - 1; i >= 0; i--) {
      ulong ticket = PositionGetTicket(i);
      if (ticket == 0) continue;
      int posMagic = (int)PositionGetInteger(POSITION_MAGIC);
      if (posMagic != magicBuy && posMagic != magicSell) continue;

      bool   isBuy    = (posMagic == magicBuy);
      double openPx   = PositionGetDouble(POSITION_PRICE_OPEN);
      double curSL    = PositionGetDouble(POSITION_SL);
      double curTP    = PositionGetDouble(POSITION_TP);

      // Profit in points from open
      double profitPts = isBuy
         ? (bid - openPx) / g_point
         : (openPx - ask) / g_point;

      // ── Remove opposite pending on position open ──────────────
      if (p.removeOpp) {
         if (isBuy)  DeleteOrdersByMagic(magicSell);
         else        DeleteOrdersByMagic(magicBuy);
      }

      // ── Trailing Stop ─────────────────────────────────────────
      double trailPts = (isBuy ? p.buyTrailPct : p.sellTrailPct) / 100.0 * p.roomPts;
      if (trailPts > 0.0 && profitPts >= trailPts) {
         double newSL;
         if (isBuy) {
            newSL = NormalizeDouble(bid - trailPts * g_point, _Digits);
            if (newSL > curSL + g_point)
               trade.PositionModify(ticket, newSL, curTP);
         } else {
            newSL = NormalizeDouble(ask + trailPts * g_point, _Digits);
            if (curSL == 0.0 || newSL < curSL - g_point)
               trade.PositionModify(ticket, newSL, curTP);
         }
      }

      // ── Break-Even ────────────────────────────────────────────
      int beTrigger = isBuy ? p.buyBE  : p.sellBE;
      int beDist    = isBuy ? p.buyBEDist : p.sellBEDist;
      if (beTrigger > 0 && profitPts >= beTrigger) {
         double beSL;
         if (isBuy) {
            beSL = NormalizeDouble(openPx + beDist * g_point, _Digits);
            if (beSL > curSL + g_point)
               trade.PositionModify(ticket, beSL, curTP);
         } else {
            beSL = NormalizeDouble(openPx - beDist * g_point, _Digits);
            if (curSL == 0.0 || beSL < curSL - g_point)
               trade.PositionModify(ticket, beSL, curTP);
         }
      }
   }
}

//──────────────────────────────────────────────────────────────────────
// DAILY RESET
//──────────────────────────────────────────────────────────────────────

void CheckDailyReset()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if (dt.day == g_lastDay) return;

   g_lastDay = dt.day;
   for (int i = 0; i < 3; i++) {
      g_state[i].ordersPlaced = false;
      g_state[i].entryTime    = 0;
      g_state[i].buyBasePx    = 0.0;
      g_state[i].sellBasePx   = 0.0;
   }
   Print("AuRange Hunter: daily state reset for ", TimeToString(TimeCurrent(), TIME_DATE));
}

//──────────────────────────────────────────────────────────────────────
// STRATEGY RUNNER
//──────────────────────────────────────────────────────────────────────

void RunStrategy(int stratId)
{
   if (!g_params[stratId].enabled) return;
   if (!IsTradingDay())             return;

   int magicBuy  = BuildMagic(stratId, false);
   int magicSell = BuildMagic(stratId, true);

   bool hasBuyPending  = (CountPendingByMagic(magicBuy)  > 0);
   bool hasSellPending = (CountPendingByMagic(magicSell) > 0);
   bool hasBuyPos      = HasPosition(magicBuy);
   bool hasSellPos     = HasPosition(magicSell);

   // ── Entry: place orders at session open ──────────────────────
   if (!g_state[stratId].ordersPlaced &&
       IsEntryMinute(g_params[stratId].entryHour, g_params[stratId].entryMinute)) {

      double spread = GetSpreadPts();
      if (spread > g_params[stratId].spreadLimit) {
         PrintFormat("[S%d] Spread too high: %.0f pts (limit %.0f) — skip",
                     stratId + 1, spread, g_params[stratId].spreadLimit);
         return;
      }

      if (g_params[stratId].allowBuy  && !hasBuyPending  && !hasBuyPos)
         PlaceBuyOrder(stratId, g_params[stratId]);
      if (g_params[stratId].allowSell && !hasSellPending && !hasSellPos)
         PlaceSellOrder(stratId, g_params[stratId]);

      g_state[stratId].ordersPlaced = true;
      g_state[stratId].entryTime    = TimeCurrent();
      return; // let tick settle before scalper runs
   }

   // ── Scalper Machine: maintain pending orders ──────────────────
   if (g_state[stratId].ordersPlaced && (hasBuyPending || hasSellPending))
      RunScalperMachine(stratId, g_params[stratId]);

   // ── Position management: trail & BE ──────────────────────────
   if (hasBuyPos || hasSellPos)
      ManagePositions(stratId, g_params[stratId]);
}

//──────────────────────────────────────────────────────────────────────
// LOAD PARAMS helper
//──────────────────────────────────────────────────────────────────────

void LoadParams(int id, bool en, int hr, int mn,
                double spread, double lot, double risk,
                bool aB, bool aS, bool ro,
                int bTEnd, int bOff, int bTP, int bSL,
                int sTEnd, int sOff, int sTP, int sSL,
                bool scAct, double room,
                double bLvl, double bTrl, double sLvl, double sTrl,
                int bBE, int bBEd, int sBE, int sBEd)
{
   g_params[id].enabled      = en;
   g_params[id].entryHour    = hr;
   g_params[id].entryMinute  = mn;
   g_params[id].spreadLimit  = spread;
   g_params[id].fixedLot     = lot;
   g_params[id].riskPct      = risk;
   g_params[id].allowBuy     = aB;
   g_params[id].allowSell    = aS;
   g_params[id].removeOpp    = ro;
   g_params[id].buyTimeEnd   = bTEnd;
   g_params[id].buyOffset    = bOff;
   g_params[id].buyTP        = bTP;
   g_params[id].buySL        = bSL;
   g_params[id].sellTimeEnd  = sTEnd;
   g_params[id].sellOffset   = sOff;
   g_params[id].sellTP       = sTP;
   g_params[id].sellSL       = sSL;
   g_params[id].scalperActive = scAct;
   g_params[id].roomPts      = room;
   g_params[id].buyLevel     = bLvl;
   g_params[id].buyTrailPct  = bTrl;
   g_params[id].sellLevel    = sLvl;
   g_params[id].sellTrailPct = sTrl;
   g_params[id].buyBE        = bBE;
   g_params[id].buyBEDist    = bBEd;
   g_params[id].sellBE       = sBE;
   g_params[id].sellBEDist   = sBEd;
}

//──────────────────────────────────────────────────────────────────────
// OnInit / OnTick / OnDeinit
//──────────────────────────────────────────────────────────────────────

int OnInit()
{
   // Point size (XAUUSD: 1 pt = 0.01 on most brokers)
   g_point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if (g_point <= 0.0) { Alert("Invalid symbol point. Check symbol."); return INIT_FAILED; }

   trade.SetDeviationInPoints(30);
   trade.SetTypeFilling(ORDER_FILLING_RETURN);
   trade.SetAsyncMode(false);

   // ── Strategy 1 ──────────────────────────────────────────────
   LoadParams(0,
      EnableStrategy1, S1_Hour, S1_Minute,
      S1_SpreadLimit, S1_FixedLot, S1_RiskPct, S1_AllowBuy, S1_AllowSell, S1_RemoveOpp,
      S1_BuyTimeEnd,  S1_BuyOffset,  S1_BuyTP,  S1_BuySL,
      S1_SellTimeEnd, S1_SellOffset, S1_SellTP, S1_SellSL,
      S1_ScalperActive, S1_RoomPts,
      S1_BuyLevel, S1_BuyTrailPct, S1_SellLevel, S1_SellTrailPct,
      S1_BuyBE, S1_BuyBEDist, S1_SellBE, S1_SellBEDist);

   // ── Strategy 2 ──────────────────────────────────────────────
   LoadParams(1,
      EnableStrategy2, S2_Hour, S2_Minute,
      S2_SpreadLimit, S2_FixedLot, S2_RiskPct, S2_AllowBuy, S2_AllowSell, S2_RemoveOpp,
      S2_BuyTimeEnd,  S2_BuyOffset,  S2_BuyTP,  S2_BuySL,
      S2_SellTimeEnd, S2_SellOffset, S2_SellTP, S2_SellSL,
      S2_ScalperActive, S2_RoomPts,
      S2_BuyLevel, S2_BuyTrailPct, S2_SellLevel, S2_SellTrailPct,
      S2_BuyBE, S2_BuyBEDist, S2_SellBE, S2_SellBEDist);

   // ── Strategy 3 ──────────────────────────────────────────────
   LoadParams(2,
      EnableStrategy3, S3_Hour, S3_Minute,
      S3_SpreadLimit, S3_FixedLot, S3_RiskPct, S3_AllowBuy, S3_AllowSell, S3_RemoveOpp,
      S3_BuyTimeEnd,  S3_BuyOffset,  S3_BuyTP,  S3_BuySL,
      S3_SellTimeEnd, S3_SellOffset, S3_SellTP, S3_SellSL,
      S3_ScalperActive, S3_RoomPts,
      S3_BuyLevel, S3_BuyTrailPct, S3_SellLevel, S3_SellTrailPct,
      S3_BuyBE, S3_BuyBEDist, S3_SellBE, S3_SellBEDist);

   // Reset state
   for (int i = 0; i < 3; i++) {
      g_state[i].ordersPlaced = false;
      g_state[i].entryTime    = 0;
      g_state[i].buyBasePx    = 0.0;
      g_state[i].sellBasePx   = 0.0;
   }

   PrintFormat("AuRange Hunter EA v1.0 | Magic=%d | Point=%.5f | Symbol=%s",
               MagicNumber, g_point, _Symbol);
   PrintFormat("Strategy 1: %s @ %02d:%02d | Strategy 2: %s @ %02d:%02d | Strategy 3: %s @ %02d:%02d",
               EnableStrategy1 ? "ON" : "OFF", S1_Hour, S1_Minute,
               EnableStrategy2 ? "ON" : "OFF", S2_Hour, S2_Minute,
               EnableStrategy3 ? "ON" : "OFF", S3_Hour, S3_Minute);

   return INIT_SUCCEEDED;
}

void OnTick()
{
   CheckDailyReset();
   RunStrategy(0);
   RunStrategy(1);
   RunStrategy(2);
}

void OnDeinit(const int reason)
{
   PrintFormat("AuRange Hunter EA deinitialized. Reason=%d", reason);
}

//+------------------------------------------------------------------+
