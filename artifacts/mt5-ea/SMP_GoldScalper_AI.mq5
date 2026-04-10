//+------------------------------------------------------------------+
//|          SMP Gold Scalper AI — v5.1                              |
//|          SignalMaster Pro — XAU/USD Expert Advisor               |
//|          Trend-First + Range Detection + Gold S3 Exit Method     |
//|          Segredo Gold S3: TP grande + BE ativo + Trail %         |
//+------------------------------------------------------------------+
#property copyright "SignalMaster Pro"
#property version   "5.10"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

CTrade        g_trade;
CPositionInfo g_pos;

//+------------------------------------------------------------------+
input group "=== GESTÃO DE RISCO ==="
input double  RiskPercent      = 1.5;    // % da banca por operação
input double  MaxRiskPercent   = 4.0;    // % máxima simultânea
input int     MaxPositions     = 2;      // Máximo de posições abertas
input double  MinLot           = 0.01;   // Lote mínimo
input double  MaxLot           = 5.0;    // Lote máximo
input double  MaxDailyLossPct  = 5.0;    // % perda diária máxima (0=off)
input int     MaxDailyTrades   = 20;     // Max trades por dia (0=off)

input group "=== STOP & TARGET (Gold S3 Style) ==="
input int     SL_Points        = 500;    // Stop Loss fixo em pontos (safety net)
input int     TP_Points        = 5000;   // Take Profit fixo em pontos (safety net — trailing fecha antes)
input int     BE_TriggerPts    = 300;    // Pontos de lucro para ativar break-even
input int     BE_SLDistPts     = 600;    // Distância do SL ao ponto de trigger no break-even
input double  TrailPctThresh   = 2.5;    // Trailing percentual (%) — principal mecanismo de saída
input double  TrailPctStep     = 0.5;    // Step mínimo para mover trailing (%)
input bool    UseTrailing      = true;   // Usar trailing stop percentual
input bool    UseATRTrail      = true;   // Usar trailing ATR como fallback
input int     Trail_ATR_Multi  = 12;     // ATR × trailing fallback (x0.1)

input group "=== IA — SCORE ==="
input int     MinScore         = 62;     // Score mínimo entrada (0-100)
input int     EliteScore       = 82;     // Score ELITE — lote +50%
input int     MinVotes         = 3;      // Mínimo de votos (3-10)
input double  MaxSpread        = 45.0;   // Spread máximo (pontos)
input int     ATR_Max          = 600;    // ATR máximo — caótico
input int     ATR_Min          = 2;      // ATR mínimo — parado

input group "=== FILTRO DE TENDÊNCIA ==="
input int     H1_EMA_Fast      = 8;      // EMA rápida H1
input int     H1_EMA_Slow      = 21;     // EMA lenta H1
input int     H4_EMA_Trend     = 50;     // EMA H4 tendência macro
input bool    UseH4Confirm     = true;   // Exigir confirmação H4
input int     ADX_Period       = 14;     // Período ADX
input int     ADX_Trend        = 22;     // ADX mínimo — tendência clara
input bool    CounterTrendHigh = true;   // Contra-tendência só com score>90

input group "=== DETECÇÃO DE CONSOLIDAÇÃO (AuRange style) ==="
input bool    UseRangeFilter   = true;   // Filtrar entrada por faixa de consolidação
input int     Range_Bars       = 12;     // Barras M5 para calcular faixa (padrão 12=1h)
input double  Range_MaxATR_Pct = 80.0;   // Faixa máxima como % do ATR M5 (0=off)
input double  Range_Level_Pct  = 20.0;   // % dentro da faixa para BUY (AuRange: 10%)
input bool    RangeBounce      = true;   // Entrar no bounce das bordas da faixa

input group "=== FILTRO DIAS E HORAS ==="
input bool    TradeMon         = true;   // Segunda-feira
input bool    TradeTue         = true;   // Terça-feira
input bool    TradeWed         = true;   // Quarta-feira
input bool    TradeThu         = true;   // Quinta-feira
input bool    TradeFri         = true;   // Sexta-feira
input bool    AvoidNFPMon      = true;   // Evitar 2ª após NFP (1ª sexta do mês)
input bool    UseSession       = true;   // Filtrar sessões
input bool    London           = true;   // Londres 08-17 GMT
input bool    NewYork          = true;   // Nova York 13-22 GMT
input bool    Asia             = false;  // Ásia 00-08 GMT
input int     GmtOffset        = 0;      // Diferença servidor → GMT
input int     MinutesAfterOpen = 30;     // Minutos mínimos após abertura da sessão

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

input group "=== CONFIGURAÇÕES ==="
input int     EaMagic          = 20250410;
input string  TradeTag         = "SMP_v5";
input bool    Dashboard        = true;

//--- Handles
int hEMA_F1, hEMA_M1, hEMA_S1;
int hEMA_F5, hEMA_M5, hEMA_S5;
int hRSI1, hRSI5, hATR1, hATR5;
int hBB1, hStoch1, hMACD1;
int hH1_F, hH1_S, hH4_T;
int hADX5;

//--- Estado
datetime lastBar      = 0;
double   lastScore    = 0;
string   lastReason   = "";
string   lastDir      = "";
string   statusMsg    = "";
string   rangeInfo    = "";
int      wins         = 0;
int      losses       = 0;
double   totalPnL     = 0;
int      dayTrades    = 0;
double   dayBal       = 0;
datetime dayReset     = 0;
datetime sessionStart = 0;

//--- Range detection state
double   rangeHigh    = 0;
double   rangeLow     = 0;
double   rangeSize    = 0;
datetime rangeTime    = 0;

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

   if(hEMA_F1==INVALID_HANDLE||hATR1==INVALID_HANDLE||
      hH1_F==INVALID_HANDLE||hADX5==INVALID_HANDLE)
   { Alert("SMP v5: Erro indicadores!"); return INIT_FAILED; }

   dayBal = AccountInfoDouble(ACCOUNT_BALANCE);
   Print("SMP Gold Scalper AI v5.0 iniciado — Magic:",EaMagic);
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

   // Atualiza faixa de consolidação a cada barra M5
   UpdateRange();

   //--- Verificações de bloqueio
   if(!DayAllowed())        { statusMsg="Dia bloqueado"; return; }
   if(!SessionOk())         { statusMsg="Fora de sessão"; return; }
   if(!SessionWarmupOk())   { statusMsg="Aguardando "+IntegerToString(MinutesAfterOpen)+"min abertura"; return; }
   if(DayLossHit())         { statusMsg="Limite perda diária!"; return; }
   if(DayTradesHit())       { statusMsg="Max trades/dia atingido"; return; }
   if(CountPos()>=MaxPositions){ statusMsg="Posições cheias"; return; }

   double sp=GetSpread();
   if(sp>MaxSpread)         { statusMsg="Spread alto: "+DoubleToString(sp,0); return; }

   double atr=B(hATR1,0,1), atrPts=atr/_Point;
   if(atrPts>ATR_Max)       { statusMsg="Mercado caótico"; return; }
   if(atrPts<ATR_Min)       { statusMsg="Mercado parado"; return; }

   //--- Regime de tendência
   int trendDir = GetTrendRegime();
   double adx   = B(hADX5,0,1);

   int    score=0;
   string dir="", rsn="";
   CalcScore(score,dir,rsn,atr,trendDir,adx);

   lastScore=score; lastReason=rsn; lastDir=dir;
   statusMsg=(score>0)?"":"Score baixo ("+IntegerToString(score)+"%)";

   if(score<MinScore||dir=="") return;

   double lot=CalcLot(score);
   if(lot<MinLot) return;

   // Gold S3 style: SL e TP são safety nets — trailing percentual fecha as posições
   double slD = SL_Points * _Point;
   double tpD = TP_Points * _Point;

   if(dir=="BUY")
   {
      double ask=SymbolInfoDouble(_Symbol,SYMBOL_ASK);
      if(g_trade.Buy(lot,_Symbol,ask,
                     NormalizeDouble(ask-slD,_Digits),
                     NormalizeDouble(ask+tpD,_Digits),TradeTag))
      { dayTrades++; Print("BUY v5.1|Sc:",score,"|Lot:",lot,"|SL:",SL_Points,"pts|TR:",trendDir,"|",rsn); }
   }
   else
   {
      double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
      if(g_trade.Sell(lot,_Symbol,bid,
                      NormalizeDouble(bid+slD,_Digits),
                      NormalizeDouble(bid-tpD,_Digits),TradeTag))
      { dayTrades++; Print("SELL v5.1|Sc:",score,"|Lot:",lot,"|SL:",SL_Points,"pts|TR:",trendDir,"|",rsn); }
   }
}

//+------------------------------------------------------------------+
//| Atualiza detecção de faixa de consolidação — AuRange style       |
//+------------------------------------------------------------------+
void UpdateRange()
{
   if(!UseRangeFilter) return;

   double hi[], lo[];
   ArraySetAsSeries(hi,true); ArraySetAsSeries(lo,true);
   if(CopyHigh(_Symbol,PERIOD_M5,1,Range_Bars,hi)!=Range_Bars) return;
   if(CopyLow (_Symbol,PERIOD_M5,1,Range_Bars,lo)!=Range_Bars) return;

   double rH=hi[ArrayMaximum(hi)];
   double rL=lo[ArrayMinimum(lo)];
   double rS=(rH-rL)/_Point;

   rangeHigh=rH; rangeLow=rL; rangeSize=rS;

   // Calcula posição do preço dentro da faixa (0%=fundo, 100%=topo)
   double mid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double pct=(rangeSize>0)?((mid-rL)/(rH-rL)*100.0):50.0;
   rangeInfo=StringFormat("Faixa:%.0f pts | Pos:%.0f%%",rS,pct);
}

//--- Verifica se preço está na zona de entrada dentro da faixa
bool IsInRangeBuyZone()
{
   if(!UseRangeFilter) return true;
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(rangeSize<=0) return true;
   double pct=(bid-rangeLow)/(rangeHigh-rangeLow)*100.0;
   return (pct<=Range_Level_Pct+(Range_Level_Pct*0.5));
}

bool IsInRangeSellZone()
{
   if(!UseRangeFilter) return true;
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   if(rangeSize<=0) return true;
   double pct=(bid-rangeLow)/(rangeHigh-rangeLow)*100.0;
   return (pct>=(100.0-Range_Level_Pct-(Range_Level_Pct*0.5)));
}

bool IsRangeValid()
{
   if(!UseRangeFilter) return true;
   if(rangeSize<=0) return true;
   if(Range_MaxATR_Pct<=0) return true;
   double atr5=B(hATR5,0,1)/_Point;
   return (rangeSize<=atr5*(Range_MaxATR_Pct/100.0)*Range_Bars);
}

//+------------------------------------------------------------------+
//| Regime de tendência                                              |
//+------------------------------------------------------------------+
int GetTrendRegime()
{
   double h1F=B(hH1_F,0,1), h1S=B(hH1_S,0,1);
   double h4=B(hH4_T,0,1);
   double cH1=iClose(_Symbol,PERIOD_H1,1);
   double cH4=iClose(_Symbol,PERIOD_H4,1);
   double diP=B(hADX5,1,1), diM=B(hADX5,2,1);
   double adx=B(hADX5,0,1);
   bool h1Bull=(h1F>h1S&&cH1>h1F), h1Bear=(h1F<h1S&&cH1<h1F);
   bool h4Bull=(cH4>h4),           h4Bear=(cH4<h4);
   bool diPBull=(diP>diM),         diMBear=(diM>diP);

   if(UseH4Confirm)
   {
      if(h1Bull&&h4Bull&&diPBull) return 1;
      if(h1Bear&&h4Bear&&diMBear) return -1;
      if(h1Bull&&diPBull&&adx>ADX_Trend+5) return 1;
      if(h1Bear&&diMBear&&adx>ADX_Trend+5) return -1;
      return 0;
   }
   if(h1Bull&&diPBull) return 1;
   if(h1Bear&&diMBear) return -1;
   return 0;
}

//+------------------------------------------------------------------+
//| Motor de IA v5 — Trend-first + Range zones                      |
//+------------------------------------------------------------------+
void CalcScore(int &score,string &dir,string &rsn,double atr,int trendDir,double adx)
{
   score=0; dir=""; rsn="";

   double ef1=B(hEMA_F1,0,1), em1=B(hEMA_M1,0,1), es1=B(hEMA_S1,0,1);
   double ef2=B(hEMA_F1,0,2), em2=B(hEMA_M1,0,2);
   double cl1=iClose(_Symbol,PERIOD_M1,1), cl2=iClose(_Symbol,PERIOD_M1,2);
   double rsi1=B(hRSI1,0,1), rsi2=B(hRSI1,0,2);
   double ef5=B(hEMA_F5,0,1), em5=B(hEMA_M5,0,1), es5=B(hEMA_S5,0,1);
   double rsi5=B(hRSI5,0,1);
   double bbU=B(hBB1,1,1), bbL=B(hBB1,2,1), bbM=B(hBB1,0,1);
   double stK=B(hStoch1,0,1), stD_=B(hStoch1,1,1);
   double maL=B(hMACD1,0,1), maS=B(hMACD1,1,1), maL2=B(hMACD1,0,2);
   double diP=B(hADX5,1,1), diM_=B(hADX5,2,1);

   bool buyAllowed  = (trendDir >= 0);
   bool sellAllowed = (trendDir <= 0);
   if(CounterTrendHigh && trendDir==1) sellAllowed=true;
   if(CounterTrendHigh && trendDir==-1) buyAllowed=true;

   int buyV=0,sellV=0;
   string buyR="",sellR="";

   //--- [1] EMA Stack M1
   if(ef1>em1&&em1>es1){buyV++;buyR+="EMA1 ";}
   if(ef1<em1&&em1<es1){sellV++;sellR+="EMA1 ";}

   //--- [2] EMA Stack M5
   if(ef5>em5&&em5>es5){buyV++;buyR+="EMA5 ";}
   if(ef5<em5&&em5<es5){sellV++;sellR+="EMA5 ";}

   //--- [3] Crossover M1
   if(ef1>em1&&ef2<=em2){buyV++;buyR+="X+ ";}
   if(ef1<em1&&ef2>=em2){sellV++;sellR+="X- ";}

   //--- [4] Pullback para EMA M5 — AuRange style: espera o pullback e entra
   bool pbBuy =(trendDir==1 &&cl2<=em5&&cl1>em5&&ef5>es5);
   bool pbSell=(trendDir==-1&&cl2>=em5&&cl1<em5&&ef5<es5);
   if(pbBuy) {buyV++;buyV++;buyR+="PULLBK ";}  // peso duplo
   if(pbSell){sellV++;sellV++;sellR+="PULLBK ";}

   //--- [5] RSI filtrado por tendência
   if((rsi1>50&&rsi1<72&&rsi1>rsi2)&&trendDir>=0){buyV++;buyR+="RSI ";}
   if((rsi1<50&&rsi1>28&&rsi1<rsi2)&&trendDir<=0){sellV++;sellR+="RSI ";}
   if(rsi1<38&&trendDir>=0){buyV++;buyR+="RSI_OS ";}
   if(rsi1>62&&trendDir<=0){sellV++;sellR+="RSI_OB ";}

   //--- [6] RSI M5
   if(rsi5>52&&trendDir>=0){buyV++;buyR+="RSI5 ";}
   if(rsi5<48&&trendDir<=0){sellV++;sellR+="RSI5 ";}

   //--- [7] Bollinger Bands — respeitando tendência
   if(cl1>bbM&&cl2<bbM&&trendDir>=0){buyV++;buyR+="BB_M ";}
   if(cl1<bbM&&cl2>bbM&&trendDir<=0){sellV++;sellR+="BB_M ";}
   if(cl1<bbL+atr*0.15&&trendDir>0){buyV++;buyR+="BB_L ";}
   if(cl1>bbU-atr*0.15&&trendDir<0){sellV++;sellR+="BB_U ";}

   //--- [8] Range bounce — AuRange style
   if(UseRangeFilter&&RangeBounce&&IsRangeValid())
   {
      bool rngBuy =IsInRangeBuyZone();
      bool rngSell=IsInRangeSellZone();
      if(rngBuy &&trendDir>=0){buyV++;buyV++;buyR+="RANGE_BOT ";}  // peso duplo
      if(rngSell&&trendDir<=0){sellV++;sellV++;sellR+="RANGE_TOP ";}
   }

   //--- [9] Stochastic
   if(stK>stD_&&stK<75&&trendDir>=0){buyV++;buyR+="STOCH ";}
   if(stK<stD_&&stK>25&&trendDir<=0){sellV++;sellR+="STOCH ";}

   //--- [10] MACD
   if(maL>maS&&trendDir>=0){buyV++;buyR+="MACD ";}
   if(maL<maS&&trendDir<=0){sellV++;sellR+="MACD ";}

   //--- [11] DI direcional
   if(diP>diM_&&diP>25&&trendDir>=0){buyV++;buyR+="DI+ ";}
   if(diM_>diP&&diM_>25&&trendDir<=0){sellV++;sellR+="DI- ";}

   bool goLong  =(buyV >=MinVotes&&buyV >sellV&&buyAllowed);
   bool goShort =(sellV>=MinVotes&&sellV>buyV &&sellAllowed);
   bool contra  =(goLong&&trendDir==-1)||(goShort&&trendDir==1);
   if(!goLong&&!goShort) return;

   int tot=(goLong?buyV:sellV);
   int sc =(int)MathRound((double)tot/11.0*55.0); // base 55 (max 11 votos)

   // Bônus tendência alinhada
   if((goLong&&trendDir==1)||(goShort&&trendDir==-1)) sc+=22;
   if((goLong&&trendDir==0)||(goShort&&trendDir==0))  sc+=5;

   // Bônus ADX forte
   if(adx>=ADX_Trend) sc+=(int)MathMin(MathRound((adx-ADX_Trend)/2.0),12);

   // Bônus range zone
   if(UseRangeFilter&&((goLong&&IsInRangeBuyZone())||(goShort&&IsInRangeSellZone())))
      sc+=8;

   // RSI bônus
   if(goLong)  sc+=(int)MathRound(MathMax(rsi1-50,0)/50.0*6.0);
   if(goShort) sc+=(int)MathRound(MathMax(50-rsi1,0)/50.0*6.0);

   // Penalidade contra-tendência
   if(contra) sc-=22;

   sc=(int)MathMax(0,MathMin(sc,99));
   if(contra&&sc<90) return;

   if(goLong)
   {
      dir="BUY"; score=sc;
      rsn=buyR+(trendDir==1?" [TREND▲]":trendDir==0?" [NEUTRO]":" [CONTRA!]");
   }
   else
   {
      dir="SELL"; score=sc;
      rsn=sellR+(trendDir==-1?" [TREND▼]":trendDir==0?" [NEUTRO]":" [CONTRA!]");
   }
}

//+------------------------------------------------------------------+
//| Gestão de posições — Gold S3 Style                              |
//| 1) Break-even fixo (BE_TriggerPts → SL a BE_SLDistPts antes)   |
//| 2) Trailing percentual PRIMÁRIO (TrailPctThresh%)               |
//| 3) Trailing ATR como FALLBACK                                   |
//| SEM fechamento parcial — deixa o trailing trabalhar!            |
//+------------------------------------------------------------------+
void ManagePositions()
{
   double atr   = B(hATR1,0,1);
   double trAtr = atr * (Trail_ATR_Multi/10.0);  // trailing ATR fallback
   double beTrig= BE_TriggerPts * _Point;         // distância para ativar BE
   double beSlD = BE_SLDistPts  * _Point;         // SL fica BE_SLDistPts antes do trigger

   for(int i=PositionsTotal()-1;i>=0;i--)
   {
      if(!g_pos.SelectByIndex(i)) continue;
      if(g_pos.Magic()!=EaMagic||g_pos.Symbol()!=_Symbol) continue;

      ulong  tk = g_pos.Ticket();
      double sl = g_pos.StopLoss();
      double op = g_pos.PriceOpen();
      double tp = g_pos.TakeProfit();

      if(g_pos.PositionType()==POSITION_TYPE_BUY)
      {
         double bid = SymbolInfoDouble(_Symbol,SYMBOL_BID);
         double prf = bid - op;  // lucro em preço

         //--- 1. Break-even Gold S3 style
         // Quando lucro >= BE_TriggerPts, move SL para (trigger - BE_SLDistPts)
         if(beTrig>0 && prf>=beTrig)
         {
            double beSL = NormalizeDouble(bid - beSlD, _Digits);
            if(beSL > sl + _Point*3 && beSL > op - _Point*10)
               g_trade.PositionModify(tk, beSL, tp);
         }

         //--- 2. Trailing percentual PRIMÁRIO (Gold S3 / Aurum Ra style)
         if(UseTrailing && TrailPctThresh>0)
         {
            double pctPrf = (bid - op) / op * 100.0;
            if(pctPrf >= TrailPctThresh)
            {
               // SL fica a TrailPctStep% abaixo do preço atual
               double nsl = NormalizeDouble(bid * (1.0 - (TrailPctStep/100.0)), _Digits);
               if(nsl > sl + _Point*3 && (sl==0 || nsl > sl))
                  g_trade.PositionModify(tk, nsl, tp);
            }
         }

         //--- 3. Trailing ATR fallback (quando trailing % ainda não ativou)
         if(UseATRTrail && TrailPctThresh==0)
         {
            double nsl = NormalizeDouble(bid - trAtr, _Digits);
            if(nsl > sl + _Point*3 && nsl > op)
               g_trade.PositionModify(tk, nsl, tp);
         }
      }
      else // SELL
      {
         double ask = SymbolInfoDouble(_Symbol,SYMBOL_ASK);
         double prf = op - ask;

         //--- 1. Break-even
         if(beTrig>0 && prf>=beTrig)
         {
            double beSL = NormalizeDouble(ask + beSlD, _Digits);
            if((sl==0 || beSL < sl - _Point*3) && beSL < op + _Point*10)
               g_trade.PositionModify(tk, beSL, tp);
         }

         //--- 2. Trailing percentual PRIMÁRIO
         if(UseTrailing && TrailPctThresh>0)
         {
            double pctPrf = (op - ask) / op * 100.0;
            if(pctPrf >= TrailPctThresh)
            {
               double nsl = NormalizeDouble(ask * (1.0 + (TrailPctStep/100.0)), _Digits);
               if(sl==0 || nsl < sl - _Point*3)
                  g_trade.PositionModify(tk, nsl, tp);
            }
         }

         //--- 3. Trailing ATR fallback
         if(UseATRTrail && TrailPctThresh==0)
         {
            double nsl = NormalizeDouble(ask + trAtr, _Digits);
            if((sl==0 || nsl < sl - _Point*3) && nsl < op)
               g_trade.PositionModify(tk, nsl, tp);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Painel                                                           |
//+------------------------------------------------------------------+
void DrawPanel()
{
   int    td =GetTrendRegime();
   string tds=(td==1)?"▲ ALTA":(td==-1)?"▼ BAIXA":"— NEUTRO";
   double adx=B(hADX5,0,1);
   string adxS=(adx>35)?"FORTE":(adx>22)?"MÉDIO":"FRACO";
   string dirs=(lastDir=="BUY")?"▲ COMPRA":(lastDir=="SELL")?"▼ VENDA":"— AGUARDANDO";
   string qstr=(lastScore>=EliteScore)?"ELITE★★":(lastScore>=75)?"PREMIUM★":(lastScore>=MinScore)?"FORTE":"FRACO";
   double bal=AccountInfoDouble(ACCOUNT_BALANCE);
   double eq =AccountInfoDouble(ACCOUNT_EQUITY);
   double dd =(bal>0)?(bal-eq)/bal*100.0:0;
   double dl =(dayBal>0)?MathMax((dayBal-bal)/dayBal*100.0,0):0;

   // Posição na faixa
   double bid=SymbolInfoDouble(_Symbol,SYMBOL_BID);
   double rpct=(rangeSize>0)?((bid-rangeLow)/(rangeHigh-rangeLow)*100.0):50;

   string dash="";
   dash+="\n  ╔══════════════════════════════════════════════╗\n";
   dash+="  ║      SMP GOLD SCALPER AI  v5.0 FINAL        ║\n";
   dash+="  ║      ★ TREND-FIRST + RANGE DETECTION ★      ║\n";
   dash+="  ╠══════════════════════════════════════════════╣\n";
   dash+=StringFormat("  ║  Regime  : %s  |  ADX: %.0f [%s]\n",tds,adx,adxS);
   dash+=StringFormat("  ║  Score   : %3.0f%%  [%s]\n",lastScore,qstr);
   dash+=StringFormat("  ║  Direção : %s\n",dirs);
   dash+=StringFormat("  ║  Razões  : %s\n",lastReason);
   dash+=StringFormat("  ║  Status  : %s\n",statusMsg==""?"✓ Operando":statusMsg);
   dash+="  ╠══════════════════════════════════════════════╣\n";
   dash+=StringFormat("  ║  Faixa   : %.0f pts  |  Pos: %.0f%%\n",rangeSize,rpct);
   if(rpct<=Range_Level_Pct+10)       dash+="  ║  Zona    : ▼ FUNDO (buy zone)\n";
   else if(rpct>=(90-Range_Level_Pct))dash+="  ║  Zona    : ▲ TOPO (sell zone)\n";
   else                                dash+="  ║  Zona    : — MEIO (aguardando)\n";
   dash+="  ╠══════════════════════════════════════════════╣\n";
   dash+=StringFormat("  ║  Sessão  : %s  |  Dia: %s\n",SessionOk()?"ATIVA":"OFF",DayAllowed()?"OK":"BLOQ");
   dash+=StringFormat("  ║  Spread  : %.0f  |  ATR: %.0f pts\n",GetSpread(),B(hATR1,0,1)/_Point);
   dash+=StringFormat("  ║  SL: %d pts  |  TP: %d pts (safety)\n",SL_Points,TP_Points);
   dash+=StringFormat("  ║  BE: %d pts  |  Trail: %.1f%%\n",BE_TriggerPts,TrailPctThresh);
   dash+=StringFormat("  ║  Pos: %d/%d  |  Trades: %d/%d\n",CountPos(),MaxPositions,dayTrades,MaxDailyTrades>0?MaxDailyTrades:99);
   dash+="  ╠══════════════════════════════════════════════╣\n";
   dash+=StringFormat("  ║  Banca : $%.2f  |  DD: %.1f%%\n",bal,dd);
   dash+=StringFormat("  ║  Equity: $%.2f  |  Dia: -%.1f%%\n",eq,dl);
   dash+=StringFormat("  ║  W:%d  L:%d  |  PnL: $%.2f\n",wins,losses,totalPnL);
   dash+="  ╚══════════════════════════════════════════════╝";
   Comment(dash);
}

//+------------------------------------------------------------------+
//| Funções auxiliares                                               |
//+------------------------------------------------------------------+
// Gold S3 style: lote calculado com SL fixo em pontos
double CalcLot(int score)
{
   double bal = AccountInfoDouble(ACCOUNT_BALANCE);
   double slD = SL_Points * _Point;               // SL em preço
   double tv  = SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE);
   double ts  = SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   double ls  = SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP);
   if(tv<=0||slD<=0||ts<=0) return MinLot;
   double lot = bal*(RiskPercent/100.0)/((slD/ts)*tv);
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
   double slD=SL_Points*_Point;
   double tv=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE);
   double ts=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE);
   if(tv<=0||slD<=0||ts<=0) return 0;
   double r=0;
   for(int i=0;i<PositionsTotal();i++)
      if(g_pos.SelectByIndex(i)&&g_pos.Magic()==EaMagic&&g_pos.Symbol()==_Symbol)
         r+=(g_pos.Volume()*(slD/ts)*tv)/bal*100.0;
   return r;
}

bool DayAllowed()
{
   MqlDateTime dt; TimeToStruct(TimeCurrent(),dt);
   if(dt.day_of_week==0||dt.day_of_week==6) return false;
   if(dt.day_of_week==1&&!TradeMon) return false;
   if(dt.day_of_week==2&&!TradeTue) return false;
   if(dt.day_of_week==3&&!TradeWed) return false;
   if(dt.day_of_week==4&&!TradeThu) return false;
   if(dt.day_of_week==5&&!TradeFri) return false;
   // Evita segunda após NFP (1ª sexta do mês = dias 1-7)
   if(AvoidNFPMon&&dt.day_of_week==1&&dt.day<=7) return false;
   return true;
}

bool SessionOk()
{
   if(!UseSession) return true;
   MqlDateTime dt; TimeToStruct(TimeCurrent(),dt);
   int h=(dt.hour-GmtOffset+24)%24;
   bool lon=London&&h>=8&&h<17;
   bool ny =NewYork&&h>=13&&h<22;
   bool asia=Asia&&h>=0&&h<8;
   if(lon||ny||asia)
   {
      if(sessionStart==0) sessionStart=TimeCurrent();
      return true;
   }
   sessionStart=0;
   return false;
}

bool SessionWarmupOk()
{
   if(MinutesAfterOpen<=0) return true;
   if(sessionStart==0) return false;
   return ((TimeCurrent()-sessionStart)/60>=MinutesAfterOpen);
}

void ResetDay()
{
   MqlDateTime dt; TimeToStruct(TimeCurrent(),dt);
   datetime d=StringToTime(StringFormat("%04d.%02d.%02d 00:00",dt.year,dt.mon,dt.day));
   if(d!=dayReset){dayReset=d;dayTrades=0;dayBal=AccountInfoDouble(ACCOUNT_BALANCE);sessionStart=0;}
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
