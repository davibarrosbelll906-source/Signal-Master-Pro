//+------------------------------------------------------------------+
//|          SMP Gold Scalper AI — v4.0  TREND-FIRST                |
//|          SignalMaster Pro — XAU/USD Expert Advisor               |
//|          Filosofia: tendência primeiro, scalp na direção certa   |
//+------------------------------------------------------------------+
#property copyright "SignalMaster Pro"
#property version   "4.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

CTrade        g_trade;
CPositionInfo g_pos;

//+------------------------------------------------------------------+
input group "=== GESTÃO DE RISCO ==="
input double  RiskPercent      = 1.5;   // % da banca por operação
input double  MaxRiskPercent   = 4.0;   // % máxima simultânea
input int     MaxPositions     = 2;     // Máximo de posições abertas
input double  MinLot           = 0.01;  // Lote mínimo
input double  MaxLot           = 5.0;   // Lote máximo
input double  MaxDailyLossPct  = 5.0;   // % perda diária máxima (0=off)
input int     MaxDailyTrades   = 25;    // Max trades por dia (0=off)

input group "=== STOP & TARGET ==="
input int     SL_ATR_Multi     = 15;    // ATR multiplicador SL (x0.1)
input int     TP1_ATR_Multi    = 15;    // ATR multiplicador TP1 parcial (x0.1)
input int     TP2_ATR_Multi    = 28;    // ATR multiplicador TP2 final (x0.1)
input double  TP1_ClosePct     = 60.0;  // % lote fechado no TP1
input int     Trail_ATR_Multi  = 10;    // ATR multiplicador trailing (x0.1)
input bool    UseTrailing      = true;  // Usar trailing stop
input int     BE_ATR           = 8;     // Break-even em X ATR (x0.1), 0=off

input group "=== IA — SCORE ==="
input int     MinScore         = 62;    // Score mínimo entrada (0-100)
input int     EliteScore       = 82;    // Score ELITE — lote +50%
input int     MinVotes         = 3;     // Mínimo de votos (3-7)
input double  MaxSpread        = 45.0;  // Spread máximo (pontos)
input int     ATR_Max          = 600;   // ATR máximo — caótico
input int     ATR_Min          = 2;     // ATR mínimo — parado

input group "=== FILTRO DE TENDÊNCIA (OBRIGATÓRIO) ==="
input int     H1_EMA_Fast      = 8;     // EMA rápida H1
input int     H1_EMA_Slow      = 21;    // EMA lenta H1
input int     H4_EMA_Trend     = 50;    // EMA H4 tendência macro
input bool    UseH4Confirm     = true;  // Exigir confirmação H4
input int     ADX_Period       = 14;    // Período ADX
input int     ADX_Trend        = 22;    // ADX mínimo = tendência clara
input bool    CounterTrendHigh = true;  // Permitir contra-tendência com score>90

input group "=== INDICADORES M1/M5 ==="
input int     EMA_Fast         = 8;
input int     EMA_Mid          = 21;
input int     EMA_Slow         = 55;
input int     RSI_Period       = 14;
input int     ATR_Period       = 14;
input int     BB_Period        = 20;
input double  BB_Dev           = 2.0;
input int     Stoch_K          = 5;
input int     Stoch_D          = 3;
input int     Stoch_Slow       = 3;
input int     MACD_Fast        = 12;
input int     MACD_Slow        = 26;
input int     MACD_Sig         = 9;

input group "=== SESSÕES ==="
input bool    UseSession       = true;  // Filtrar sessões
input bool    London           = true;  // Londres 08-17 GMT
input bool    NewYork          = true;  // Nova York 13-22 GMT
input bool    Asia             = false; // Ásia 00-08 GMT
input int     GmtOffset        = 0;    // Diferença servidor GMT

input group "=== CONFIGURAÇÕES ==="
input int     EaMagic          = 20250410;
input string  Comment_         = "SMP_v4";
input bool    Dashboard        = true;

//--- Handles
int hEMA_F1, hEMA_M1, hEMA_S1;
int hEMA_F5, hEMA_M5, hEMA_S5;
int hRSI1, hRSI5, hATR1, hATR5;
int hBB1, hStoch1, hMACD1;
int hH1_F, hH1_S;
int hH4_T;
int hADX5;

//--- Estado
datetime lastBar    = 0;
double   lastScore  = 0;
string   lastReason = "";
string   lastDir    = "";
string   statusMsg  = "";
int      wins       = 0;
int      losses     = 0;
double   totalPnL   = 0;
int      dayTrades  = 0;
double   dayBal     = 0;
datetime dayReset   = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   g_trade.SetExpertMagicNumber(EaMagic);
   g_trade.SetDeviationInPoints(30);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   string s = _Symbol;
   hEMA_F1 = iMA(s,PERIOD_M1,EMA_Fast,0,MODE_EMA,PRICE_CLOSE);
   hEMA_M1 = iMA(s,PERIOD_M1,EMA_Mid, 0,MODE_EMA,PRICE_CLOSE);
   hEMA_S1 = iMA(s,PERIOD_M1,EMA_Slow,0,MODE_EMA,PRICE_CLOSE);
   hEMA_F5 = iMA(s,PERIOD_M5,EMA_Fast,0,MODE_EMA,PRICE_CLOSE);
   hEMA_M5 = iMA(s,PERIOD_M5,EMA_Mid, 0,MODE_EMA,PRICE_CLOSE);
   hEMA_S5 = iMA(s,PERIOD_M5,EMA_Slow,0,MODE_EMA,PRICE_CLOSE);
   hRSI1   = iRSI(s,PERIOD_M1,RSI_Period,PRICE_CLOSE);
   hRSI5   = iRSI(s,PERIOD_M5,RSI_Period,PRICE_CLOSE);
   hATR1   = iATR(s,PERIOD_M1,ATR_Period);
   hATR5   = iATR(s,PERIOD_M5,ATR_Period);
   hBB1    = iBands(s,PERIOD_M1,BB_Period,0,BB_Dev,PRICE_CLOSE);
   hStoch1 = iStochastic(s,PERIOD_M1,Stoch_K,Stoch_D,Stoch_Slow,MODE_SMA,STO_LOWHIGH);
   hMACD1  = iMACD(s,PERIOD_M1,MACD_Fast,MACD_Slow,MACD_Sig,PRICE_CLOSE);
   hH1_F   = iMA(s,PERIOD_H1,H1_EMA_Fast,0,MODE_EMA,PRICE_CLOSE);
   hH1_S   = iMA(s,PERIOD_H1,H1_EMA_Slow,0,MODE_EMA,PRICE_CLOSE);
   hH4_T   = iMA(s,PERIOD_H4,H4_EMA_Trend,0,MODE_EMA,PRICE_CLOSE);
   hADX5   = iADX(s,PERIOD_M5,ADX_Period);

   if(hEMA_F1==INVALID_HANDLE||hATR1==INVALID_HANDLE||hH1_F==INVALID_HANDLE||hADX5==INVALID_HANDLE)
   { Alert("SMP v4: Erro indicadores!"); return INIT_FAILED; }

   dayBal = AccountInfoDouble(ACCOUNT_BALANCE);
   Print("SMP Gold Scalper AI v4.0 TREND-FIRST iniciado — Magic:",EaMagic);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   int h[]={hEMA_F1,hEMA_M1,hEMA_S1,hEMA_F5,hEMA_M5,hEMA_S5,
             hRSI1,hRSI5,hATR1,hATR5,hBB1,hStoch1,hMACD1,
             hH1_F,hH1_S,hH4_T,hADX5};
   for(int i=0;i<ArraySize(h);i++) IndicatorRelease(h[i]);
   Comment("");
}

//+------------------------------------------------------------------+
void OnTick()
{
   ResetDay();
   ManagePositions();
   if(Dashboard) DrawPanel();

   datetime bar = iTime(_Symbol,PERIOD_M1,0);
   if(bar==lastBar) return;
   lastBar=bar;

   if(!SessionOk())         { statusMsg="Fora de sessão"; return; }
   if(DayLossHit())         { statusMsg="Limite perda diária!"; return; }
   if(DayTradesHit())       { statusMsg="Max trades/dia"; return; }
   if(CountPos()>=MaxPositions){ statusMsg="Posições cheias"; return; }

   double sp=GetSpread();
   if(sp>MaxSpread)         { statusMsg="Spread: "+DoubleToString(sp,0); return; }

   double atr=B(hATR1,0,1), atrPts=atr/_Point;
   if(atrPts>ATR_Max)       { statusMsg="Mercado caótico"; return; }
   if(atrPts<ATR_Min)       { statusMsg="Mercado parado"; return; }

   //--- STEP 1: Determina regime de tendência (OBRIGATÓRIO)
   int trendDir = GetTrendRegime(); // +1=alta, -1=baixa, 0=neutro
   double adx   = B(hADX5,0,1);
   bool trendStrong = (adx >= ADX_Trend);

   int    score=0;
   string dir="", rsn="";
   CalcScore(score, dir, rsn, atr, trendDir, trendStrong);

   lastScore=score; lastReason=rsn; lastDir=dir;
   statusMsg=(score>0)?"":"Score baixo("+IntegerToString(score)+"%)";

   if(score<MinScore||dir=="") return;

   double lot=CalcLot(atr,score);
   if(lot<MinLot) return;

   double slD=atr*(SL_ATR_Multi/10.0), tp2D=atr*(TP2_ATR_Multi/10.0);

   if(dir=="BUY")
   {
      double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
      if(g_trade.Buy(lot,_Symbol,ask,
                     NormalizeDouble(ask-slD,_Digits),
                     NormalizeDouble(ask+tp2D,_Digits),Comment_))
         { dayTrades++; Print("BUY v4|Sc:",score,"|Lot:",lot,"|TR:",trendDir,"|",rsn); }
   }
   else
   {
      double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
      if(g_trade.Sell(lot,_Symbol,bid,
                      NormalizeDouble(bid+slD,_Digits),
                      NormalizeDouble(bid-tp2D,_Digits),Comment_))
         { dayTrades++; Print("SELL v4|Sc:",score,"|Lot:",lot,"|TR:",trendDir,"|",rsn); }
   }
}

//+------------------------------------------------------------------+
//| REGIME DE TENDÊNCIA — Gate principal de direção                 |
//| Retorna: +1=tendência de alta, -1=tendência de baixa, 0=neutro  |
//+------------------------------------------------------------------+
int GetTrendRegime()
{
   double h1F   = B(hH1_F,0,1),  h1S  = B(hH1_S,0,1);
   double h4    = B(hH4_T,0,1);
   double closeH1 = iClose(_Symbol,PERIOD_H1,1);
   double closeH4 = iClose(_Symbol,PERIOD_H4,1);
   double adx     = B(hADX5,0,1);
   double diP     = B(hADX5,1,1), diM = B(hADX5,2,1);

   bool h1Bull = (h1F > h1S && closeH1 > h1F);
   bool h1Bear = (h1F < h1S && closeH1 < h1F);
   bool h4Bull = (closeH4 > h4);
   bool h4Bear = (closeH4 < h4);
   bool diPBull = (diP > diM);
   bool diMBear = (diM > diP);

   // Com confirmação H4
   if(UseH4Confirm)
   {
      if(h1Bull && h4Bull && diPBull) return 1;
      if(h1Bear && h4Bear && diMBear) return -1;
      // H1 forte sem H4 confirmar
      if(h1Bull && diPBull && adx>ADX_Trend+5) return 1;
      if(h1Bear && diMBear && adx>ADX_Trend+5) return -1;
      return 0;
   }
   else
   {
      if(h1Bull && diPBull) return 1;
      if(h1Bear && diMBear) return -1;
      return 0;
   }
}

//+------------------------------------------------------------------+
//| MOTOR IA v4 — Trend-first: sinais filtrados pelo regime         |
//+------------------------------------------------------------------+
void CalcScore(int &score, string &dir, string &rsn,
               double atr, int trendDir, bool trendStrong)
{
   score=0; dir=""; rsn="";

   //--- Leituras M1
   double ef1=B(hEMA_F1,0,1), em1=B(hEMA_M1,0,1), es1=B(hEMA_S1,0,1);
   double ef2=B(hEMA_F1,0,2), em2=B(hEMA_M1,0,2);
   double cl1=iClose(_Symbol,PERIOD_M1,1), cl2=iClose(_Symbol,PERIOD_M1,2);
   double rsi1=B(hRSI1,0,1), rsi2=B(hRSI1,0,2);

   //--- Leituras M5
   double ef5=B(hEMA_F5,0,1), em5=B(hEMA_M5,0,1), es5=B(hEMA_S5,0,1);
   double rsi5=B(hRSI5,0,1);

   //--- BB, Stoch, MACD
   double bbU=B(hBB1,1,1), bbL=B(hBB1,2,1), bbM=B(hBB1,0,1);
   double stK=B(hStoch1,0,1), stD=B(hStoch1,1,1);
   double maL=B(hMACD1,0,1), maS=B(hMACD1,1,1), maL2=B(hMACD1,0,2);
   double diP=B(hADX5,1,1),  diM_=B(hADX5,2,1);
   double adx=B(hADX5,0,1);

   //--- Determine allowed directions based on trend regime
   bool buyAllowed  = (trendDir >= 0); // +1 ou neutro
   bool sellAllowed = (trendDir <= 0); // -1 ou neutro

   // Score de override: sinais muito fortes podem ir contra tendência fraca
   if(CounterTrendHigh && trendDir == 1) sellAllowed = true;
   if(CounterTrendHigh && trendDir == -1) buyAllowed = true;

   int buyV=0, sellV=0;
   string buyR="", sellR="";

   //--- [1] EMA Stack M1 — alinhamento imediato
   if(ef1>em1 && em1>es1) { buyV++;  buyR  +="EMA1 "; }
   if(ef1<em1 && em1<es1) { sellV++; sellR +="EMA1 "; }

   //--- [2] EMA Stack M5 — tendência de fundo
   if(ef5>em5 && em5>es5) { buyV++;  buyR  +="EMA5 "; }
   if(ef5<em5 && em5<es5) { sellV++; sellR +="EMA5 "; }

   //--- [3] Crossover EMA M1 — sinal de entrada
   if(ef1>em1 && ef2<=em2) { buyV++;  buyR  +="CROSS+ "; }
   if(ef1<em1 && ef2>=em2) { sellV++; sellR +="CROSS- "; }

   //--- [4] Pullback para EMA — entrada dentro da tendência
   // Preço voltou para a EMA média e retomou direção
   double ema5_prev = B(hEMA_M5,0,2);
   bool pullBuy  = (trendDir==1  && cl2<=em5 && cl1>em5 && ef5>es5);
   bool pullSell = (trendDir==-1 && cl2>=em5 && cl1<em5 && ef5<es5);
   if(pullBuy)  { buyV++;  buyV++;  buyR  +="PULLBACK "; } // peso duplo
   if(pullSell) { sellV++; sellV++; sellR +="PULLBACK "; }

   //--- [5] RSI — momentum na DIREÇÃO DA TENDÊNCIA
   // Em tendência de alta: RSI retornando de 45-55 é sinal de compra
   // Em tendência de baixa: RSI caindo de 55-45 é sinal de venda
   // NÃO usa oversold/overbought como sinal contra tendência
   bool rsiBuy  = (rsi1>50 && rsi1<75 && rsi1>rsi2);
   bool rsiSell = (rsi1<50 && rsi1>25 && rsi1<rsi2);
   // Oversold como compra apenas se tendência for de alta ou neutra
   if(rsi1<38 && trendDir>=0) { buyV++;  buyR  +="OS_BUY "; }
   // Overbought como venda apenas se tendência for de baixa ou neutra
   if(rsi1>62 && trendDir<=0) { sellV++; sellR +="OB_SELL "; }
   if(rsiBuy  && trendDir>=0) { buyV++;  buyR  +="RSI "; }
   if(rsiSell && trendDir<=0) { sellV++; sellR +="RSI "; }

   //--- [6] RSI M5 alinhado
   if(rsi5>52 && trendDir>=0) { buyV++;  buyR  +="RSI5 "; }
   if(rsi5<48 && trendDir<=0) { sellV++; sellR +="RSI5 "; }

   //--- [7] Bollinger Bands — SOMENTE na direção da tendência
   // Em alta: compra na média BB (não no lower band se tendência for baixa)
   // Em baixa: venda na média BB (não no upper band se tendência for alta)
   bool bbMidBuy  = (cl1>bbM && cl2<bbM && trendDir>=0);
   bool bbMidSell = (cl1<bbM && cl2>bbM && trendDir<=0);
   bool bbExtBuy  = (cl1<bbL+atr*0.2 && trendDir>0);   // suporte em tendência alta
   bool bbExtSell = (cl1>bbU-atr*0.2 && trendDir<0);   // resistência em tendência baixa
   if(bbMidBuy  || bbExtBuy)  { buyV++;  buyR  +="BB "; }
   if(bbMidSell || bbExtSell) { sellV++; sellR +="BB "; }

   //--- [8] Stochastic — timing
   bool stBuy  = (stK>stD && stK<75) && (trendDir>=0 || stK<25);
   bool stSell = (stK<stD && stK>25) && (trendDir<=0 || stK>75);
   if(stBuy)  { buyV++;  buyR  +="STOCH "; }
   if(stSell) { sellV++; sellR +="STOCH "; }

   //--- [9] MACD — momentum
   bool macdBuy  = (maL>maS) && ((maL2<=maS) || (maL>0 && trendDir>=0));
   bool macdSell = (maL<maS) && ((maL2>=maS) || (maL<0 && trendDir<=0));
   if(macdBuy  && trendDir>=0) { buyV++;  buyR  +="MACD "; }
   if(macdSell && trendDir<=0) { sellV++; sellR +="MACD "; }

   //--- [10] ADX DI confirmação direcional
   if(diP>diM_ && diP>25 && trendDir>=0) { buyV++;  buyR  +="DI+ "; }
   if(diM_>diP && diM_>25 && trendDir<=0){ sellV++; sellR +="DI- "; }

   //--- Decisão
   bool goLong  = (buyV  >= MinVotes && buyV  > sellV && buyAllowed);
   bool goShort = (sellV >= MinVotes && sellV > buyV  && sellAllowed);

   // Se contra-tendência, exige score muito alto
   bool contra = (goLong && trendDir==-1) || (goShort && trendDir==1);

   if(!goLong && !goShort) return;

   //--- Calcula score base
   int tot = (goLong ? buyV : sellV);
   int sc  = (int)MathRound((double)tot / 10.0 * 60.0); // max 10 votos

   // Bônus por tendência alinhada
   if(goLong  && trendDir==1)  sc += 20;
   if(goShort && trendDir==-1) sc += 20;
   if(goLong  && trendDir==0)  sc += 5;
   if(goShort && trendDir==0)  sc += 5;

   // Bônus ADX forte
   if(trendStrong) sc += (int)MathMin(MathRound((adx-ADX_Trend)/2.0), 10);

   // Penalidade contra-tendência
   if(contra) sc -= 20;

   // RSI momentum bônus
   if(goLong)  sc += (int)MathRound((rsi1-50)/50.0*8.0);
   if(goShort) sc += (int)MathRound((50-rsi1)/50.0*8.0);

   sc = (int)MathMax(0, MathMin(sc, 99));

   // Contra-tendência só entra com score altíssimo
   if(contra && sc < 90) return;

   if(goLong)  { dir="BUY";  score=sc; rsn=buyR+(trendDir==1?" [TREND▲]":trendDir==0?" [NEUTRO]":" [CONTRA!]"); }
   if(goShort) { dir="SELL"; score=sc; rsn=sellR+(trendDir==-1?" [TREND▼]":trendDir==0?" [NEUTRO]":" [CONTRA!]"); }
}

//+------------------------------------------------------------------+
//| Gestão de posições                                               |
//+------------------------------------------------------------------+
void ManagePositions()
{
   double atr=B(hATR1,0,1);
   double trD=atr*(Trail_ATR_Multi/10.0);
   double beD=(BE_ATR>0)?atr*(BE_ATR/10.0):0;
   double t1D=atr*(TP1_ATR_Multi/10.0);

   for(int i=PositionsTotal()-1;i>=0;i--)
   {
      if(!g_pos.SelectByIndex(i)) continue;
      if(g_pos.Magic()!=EaMagic||g_pos.Symbol()!=_Symbol) continue;

      ulong  tk=g_pos.Ticket();
      double sl=g_pos.StopLoss(), lot=g_pos.Volume();
      double op=g_pos.PriceOpen(), tp=g_pos.TakeProfit();

      if(g_pos.PositionType()==POSITION_TYPE_BUY)
      {
         double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
         double prf=bid-op;
         if(beD>0 && prf>=beD && sl<op)
            g_trade.PositionModify(tk,NormalizeDouble(op+_Point*2,_Digits),tp);
         if(prf>=t1D && lot>MinLot*2.0)
         {
            double cl=MathMax(MinLot,MathMin(NormalizeDouble(lot*(TP1_ClosePct/100.0),2),lot-MinLot));
            g_trade.PositionClosePartial(tk,cl);
         }
         if(UseTrailing)
         {
            double nsl=NormalizeDouble(bid-trD,_Digits);
            if(nsl>sl+_Point*5 && nsl>op) g_trade.PositionModify(tk,nsl,tp);
         }
      }
      else
      {
         double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
         double prf=op-ask;
         if(beD>0 && prf>=beD && (sl==0||sl>op))
            g_trade.PositionModify(tk,NormalizeDouble(op-_Point*2,_Digits),tp);
         if(prf>=t1D && lot>MinLot*2.0)
         {
            double cl=MathMax(MinLot,MathMin(NormalizeDouble(lot*(TP1_ClosePct/100.0),2),lot-MinLot));
            g_trade.PositionClosePartial(tk,cl);
         }
         if(UseTrailing)
         {
            double nsl=NormalizeDouble(ask+trD,_Digits);
            if((sl==0||nsl<sl-_Point*5)&&nsl<op) g_trade.PositionModify(tk,nsl,tp);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Painel                                                           |
//+------------------------------------------------------------------+
void DrawPanel()
{
   int    td  = GetTrendRegime();
   string tds = (td==1)?"▲ ALTA":(td==-1)?"▼ BAIXA":"— NEUTRO";
   double adx = B(hADX5,0,1);
   string adxStr=(adx>35)?"FORTE":(adx>22)?"MÉDIO":"FRACO";
   string dirs = (lastDir=="BUY")?"▲ COMPRA":(lastDir=="SELL")?"▼ VENDA":"— AGUARDANDO";
   string qstr = (lastScore>=EliteScore)?"ELITE★★":(lastScore>=75)?"PREMIUM★":(lastScore>=MinScore)?"FORTE":"FRACO";
   double bal  = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq   = AccountInfoDouble(ACCOUNT_EQUITY);
   double dd   = (bal>0)?(bal-eq)/bal*100.0:0;
   double dloss= (dayBal>0)?MathMax((dayBal-bal)/dayBal*100.0,0):0;
   string dash="";
   dash+="\n  ╔══════════════════════════════════════════╗\n";
   dash+="  ║      SMP GOLD SCALPER AI  v4.0          ║\n";
   dash+="  ║         ★ TREND-FIRST MODE ★            ║\n";
   dash+="  ╠══════════════════════════════════════════╣\n";
   dash+=StringFormat("  ║  Regime    : %s  |  ADX: %.0f [%s]\n",tds,adx,adxStr);
   dash+=StringFormat("  ║  Score IA  : %3.0f%%  [%s]\n",lastScore,qstr);
   dash+=StringFormat("  ║  Direção   : %s\n",dirs);
   dash+=StringFormat("  ║  Razões    : %s\n",lastReason);
   dash+=StringFormat("  ║  Status    : %s\n",statusMsg==""?"✓ Operando":statusMsg);
   dash+="  ╠══════════════════════════════════════════╣\n";
   dash+=StringFormat("  ║  Sessão    : %s  |  Spread: %.0f\n",SessionOk()?"ATIVA":"OFF",GetSpread());
   dash+=StringFormat("  ║  ATR: %.0f pts  |  Pos: %d/%d\n",B(hATR1,0,1)/_Point,CountPos(),MaxPositions);
   dash+=StringFormat("  ║  Trades/dia: %d/%d\n",dayTrades,MaxDailyTrades>0?MaxDailyTrades:99);
   dash+="  ╠══════════════════════════════════════════╣\n";
   dash+=StringFormat("  ║  Banca : $%.2f  |  DD: %.1f%%\n",bal,dd);
   dash+=StringFormat("  ║  Equity: $%.2f  |  Dia: -%.1f%%\n",eq,dloss);
   dash+=StringFormat("  ║  W:%d  L:%d  |  PnL: $%.2f\n",wins,losses,totalPnL);
   dash+="  ╚══════════════════════════════════════════╝";
   Comment(dash);
}

//+------------------------------------------------------------------+
//| Funções auxiliares                                               |
//+------------------------------------------------------------------+
double CalcLot(double atr,int score)
{
   double bal=AccountInfoDouble(ACCOUNT_BALANCE);
   double slD=atr*(SL_ATR_Multi/10.0);
   double tv=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE);
   double ts=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   double ls=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(tv<=0||slD<=0||ts<=0) return MinLot;
   double lot=bal*(RiskPercent/100.0)/((slD/ts)*tv);
   if(score>=EliteScore) lot*=1.5;
   lot=MathFloor(lot/ls)*ls;
   lot=MathMax(MinLot,MathMin(MaxLot,lot));
   double used=GetUsedRisk();
   if(used+RiskPercent>MaxRiskPercent)
   {
      double allow=MaxRiskPercent-used;
      if(allow<=0) return 0;
      lot=MathFloor((lot*allow/RiskPercent)/ls)*ls;
   }
   return NormalizeDouble(MathMax(lot,MinLot),2);
}

double GetUsedRisk()
{
   double bal=AccountInfoDouble(ACCOUNT_BALANCE);
   if(bal<=0) return 0;
   double atr=B(hATR1,0,1),slD=atr*(SL_ATR_Multi/10.0);
   double tv=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE);
   double ts=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(tv<=0||slD<=0||ts<=0) return 0;
   double r=0;
   for(int i=0;i<PositionsTotal();i++)
      if(g_pos.SelectByIndex(i)&&g_pos.Magic()==EaMagic&&g_pos.Symbol()==_Symbol)
         r+=(g_pos.Volume()*(slD/ts)*tv)/bal*100.0;
   return r;
}

bool SessionOk()
{
   if(!UseSession) return true;
   MqlDateTime dt; TimeToStruct(TimeCurrent(),dt);
   int h=(dt.hour-GmtOffset+24)%24;
   return (London&&h>=8&&h<17)||(NewYork&&h>=13&&h<22)||(Asia&&h>=0&&h<8);
}

void ResetDay()
{
   MqlDateTime dt; TimeToStruct(TimeCurrent(),dt);
   datetime d=StringToTime(StringFormat("%04d.%02d.%02d 00:00",dt.year,dt.mon,dt.day));
   if(d!=dayReset){dayReset=d;dayTrades=0;dayBal=AccountInfoDouble(ACCOUNT_BALANCE);}
}

bool DayLossHit(){return MaxDailyLossPct>0&&(dayBal-AccountInfoDouble(ACCOUNT_BALANCE))/dayBal*100.0>=MaxDailyLossPct;}
bool DayTradesHit(){return MaxDailyTrades>0&&dayTrades>=MaxDailyTrades;}

int CountPos()
{
   int c=0;
   for(int i=0;i<PositionsTotal();i++)
      if(g_pos.SelectByIndex(i)&&g_pos.Magic()==EaMagic&&g_pos.Symbol()==_Symbol) c++;
   return c;
}

double B(int h,int buf,int shift)
{ double a[]; ArraySetAsSeries(a,true); if(CopyBuffer(h,buf,shift,1,a)!=1)return 0; return a[0]; }

double GetSpread()
{ return(SymbolInfoDouble(_Symbol,SYMBOL_ASK)-SymbolInfoDouble(_Symbol,SYMBOL_BID))/_Point; }

//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &req,const MqlTradeResult &res)
{
   if(trans.type!=TRADE_TRANSACTION_DEAL_ADD) return;
   if(!HistoryDealSelect(trans.deal)) return;
   if(HistoryDealGetInteger(trans.deal,DEAL_MAGIC)!=EaMagic) return;
   double p=HistoryDealGetDouble(trans.deal,DEAL_PROFIT);
   if(p==0) return;
   totalPnL+=p;
   if(p>0)wins++; else losses++;
   Print("Closed|$",DoubleToString(p,2),"|Total:$",DoubleToString(totalPnL,2)," W:",wins," L:",losses);
}
