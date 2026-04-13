//+------------------------------------------------------------------+
//|                                       StrongSR_Signals_v2.mq4   |
//|                    Strong Support & Resistance Signals v2        |
//|                     Day Trade — M5/M15 — WIN/WDO/BR Stocks      |
//|                                   v2.0 — MQL4 puro              |
//+------------------------------------------------------------------+
#property strict
#property copyright "SignalMaster Pro"
#property description "Detecta zonas fortes de S/R por swing highs/lows e gera sinais anti-repaint"
#property version   "2.00"
#property indicator_chart_window
#property indicator_buffers 2
#property indicator_color1  clrDodgerBlue
#property indicator_color2  clrRed
#property indicator_width1  2
#property indicator_width2  2

//+------------------------------------------------------------------+
//| Parâmetros externos                                              |
//+------------------------------------------------------------------+
extern int    SwingPeriod    = 8;           // Período para detecção de swing highs/lows
extern int    MinTouches     = 3;           // Mínimo de toques para zona ser considerada forte
extern double ZoneWidthPips  = 15.0;        // Tolerância de agrupamento em pips
extern bool   ShowSignals    = true;        // Mostrar setas de compra/venda
extern bool   UseAlerts      = true;        // Alertas sonoros e popup
extern bool   ShowZones      = true;        // Mostrar retângulos das zonas
extern color  ColorSupporte  = clrLimeGreen;// Cor da zona de suporte
extern color  ColorResist    = clrRed;      // Cor da zona de resistência
extern int    SignalDistance  = 15;         // Distância da seta à zona (pips)
extern int    MaxZones       = 50;          // Máximo de zonas detectadas
extern int    LookbackBars   = 300;         // Barras para análise retroativa

//+------------------------------------------------------------------+
//| Buffers de indicador                                             |
//+------------------------------------------------------------------+
double BufCompra[];    // Buffer de setas de compra (código 233 ▲)
double BufVenda[];     // Buffer de setas de venda  (código 234 ▼)

//+------------------------------------------------------------------+
//| Struct de zona S/R                                               |
//+------------------------------------------------------------------+
struct SRZone
{
   double   priceLevel;    // Preço central da zona
   double   zoneTop;       // Limite superior da zona
   double   zoneBottom;    // Limite inferior da zona
   int      touches;       // Número de toques/rejeições confirmados
   bool     isResistance;  // true = resistência, false = suporte
   datetime firstTouch;    // Data/hora do primeiro toque
   datetime lastTouch;     // Data/hora do último toque
};

//+------------------------------------------------------------------+
//| Variáveis globais                                                |
//+------------------------------------------------------------------+
SRZone Zonas[];         // Array dinâmico de zonas — redimensionado em init() com MaxZones
int    TotalZonas = 0;  // Contador de zonas ativas

datetime UltimoAlerta = 0;  // Hora da última barra que gerou alerta (anti-repaint)

//+------------------------------------------------------------------+
//| Funções auxiliares                                               |
//+------------------------------------------------------------------+

double PipSize()
{
   if(Digits == 5 || Digits == 3)
      return Point * 10.0;
   return Point;
}

string PeriodoStr()
{
   switch(Period())
   {
      case 1:     return "M1";
      case 5:     return "M5";
      case 15:    return "M15";
      case 30:    return "M30";
      case 60:    return "H1";
      case 240:   return "H4";
      case 1440:  return "D1";
      default:    return "TF" + IntegerToStr(Period());
   }
}

bool EhCandleBullish(int idx)
{
   if(idx < 0 || idx >= Bars) return false;
   double abertura = iOpen(NULL, 0, idx);
   double fechamento = iClose(NULL, 0, idx);
   return (fechamento > abertura);
}

bool EhCandleBearish(int idx)
{
   if(idx < 0 || idx >= Bars) return false;
   double abertura = iOpen(NULL, 0, idx);
   double fechamento = iClose(NULL, 0, idx);
   return (fechamento < abertura);
}

bool EhSwingHigh(int idx)
{
   if(idx < SwingPeriod || idx >= Bars - SwingPeriod) return false;
   double maxima = iHigh(NULL, 0, idx);
   for(int k = 1; k <= SwingPeriod; k++)
   {
      if(iHigh(NULL, 0, idx - k) >= maxima) return false;
      if(iHigh(NULL, 0, idx + k) >= maxima) return false;
   }
   return true;
}

bool EhSwingLow(int idx)
{
   if(idx < SwingPeriod || idx >= Bars - SwingPeriod) return false;
   double minima = iLow(NULL, 0, idx);
   for(int k = 1; k <= SwingPeriod; k++)
   {
      if(iLow(NULL, 0, idx - k) <= minima) return false;
      if(iLow(NULL, 0, idx + k) <= minima) return false;
   }
   return true;
}

int EncontrarZona(double preco, bool isResistance)
{
   double tolerancia = ZoneWidthPips * PipSize();
   for(int z = 0; z < TotalZonas; z++)
   {
      if(Zonas[z].isResistance != isResistance) continue;
      if(MathAbs(Zonas[z].priceLevel - preco) <= tolerancia)
         return z;
   }
   return -1;
}

void LimparObjetos()
{
   int total = ObjectsTotal();
   for(int i = total - 1; i >= 0; i--)
   {
      string nome = ObjectName(i);
      if(StringFind(nome, "SSRV2_") == 0)
         ObjectDelete(nome);
   }
}

//+------------------------------------------------------------------+
//| Detecção de zonas S/R                                           |
//+------------------------------------------------------------------+
void DetectarZonas()
{
   TotalZonas = 0;
   int limZonas = MaxZones;

   int barraInicio = MathMin(LookbackBars, Bars - SwingPeriod - 1);

   for(int i = barraInicio; i >= SwingPeriod; i--)
   {
      if(TotalZonas >= limZonas) break;

      // Swing High → zona de Resistência
      if(EhSwingHigh(i))
      {
         double nivel = iHigh(NULL, 0, i);
         int zIdx = EncontrarZona(nivel, true);

         if(zIdx >= 0)
         {
            Zonas[zIdx].touches++;
            Zonas[zIdx].lastTouch = iTime(NULL, 0, i);
            double novoTopo = MathMax(Zonas[zIdx].zoneTop, nivel + ZoneWidthPips * PipSize() * 0.5);
            double novoFundo = MathMin(Zonas[zIdx].zoneBottom, nivel - ZoneWidthPips * PipSize() * 0.5);
            Zonas[zIdx].zoneTop    = novoTopo;
            Zonas[zIdx].zoneBottom = novoFundo;
         }
         else if(TotalZonas < limZonas)
         {
            Zonas[TotalZonas].priceLevel  = nivel;
            Zonas[TotalZonas].zoneTop     = nivel + ZoneWidthPips * PipSize() * 0.5;
            Zonas[TotalZonas].zoneBottom  = nivel - ZoneWidthPips * PipSize() * 0.5;
            Zonas[TotalZonas].touches     = 1;
            Zonas[TotalZonas].isResistance = true;
            Zonas[TotalZonas].firstTouch  = iTime(NULL, 0, i);
            Zonas[TotalZonas].lastTouch   = iTime(NULL, 0, i);
            TotalZonas++;
         }
      }

      // Swing Low → zona de Suporte
      if(EhSwingLow(i))
      {
         double nivel = iLow(NULL, 0, i);
         int zIdx = EncontrarZona(nivel, false);

         if(zIdx >= 0)
         {
            Zonas[zIdx].touches++;
            Zonas[zIdx].lastTouch = iTime(NULL, 0, i);
            double novoTopo = MathMax(Zonas[zIdx].zoneTop, nivel + ZoneWidthPips * PipSize() * 0.5);
            double novoFundo = MathMin(Zonas[zIdx].zoneBottom, nivel - ZoneWidthPips * PipSize() * 0.5);
            Zonas[zIdx].zoneTop    = novoTopo;
            Zonas[zIdx].zoneBottom = novoFundo;
         }
         else if(TotalZonas < limZonas)
         {
            Zonas[TotalZonas].priceLevel  = nivel;
            Zonas[TotalZonas].zoneTop     = nivel + ZoneWidthPips * PipSize() * 0.5;
            Zonas[TotalZonas].zoneBottom  = nivel - ZoneWidthPips * PipSize() * 0.5;
            Zonas[TotalZonas].touches     = 1;
            Zonas[TotalZonas].isResistance = false;
            Zonas[TotalZonas].firstTouch  = iTime(NULL, 0, i);
            Zonas[TotalZonas].lastTouch   = iTime(NULL, 0, i);
            TotalZonas++;
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Desenho das zonas no gráfico                                     |
//+------------------------------------------------------------------+
void DesenharZonas()
{
   datetime t1 = iTime(NULL, 0, MathMin(LookbackBars, Bars - 1));
   datetime t2 = iTime(NULL, 0, 0);

   for(int z = 0; z < TotalZonas; z++)
   {
      if(Zonas[z].touches < MinTouches) continue;

      string nomeRect  = "SSRV2_ZONE_" + IntegerToStr(z);
      string nomeLabel = "SSRV2_LBL_"  + IntegerToStr(z);
      color  corZona   = Zonas[z].isResistance ? ColorResist : ColorSupporte;

      // Criar retângulo semi-transparente
      if(ObjectFind(nomeRect) < 0)
         ObjectCreate(nomeRect, OBJ_RECTANGLE, 0, t1, Zonas[z].zoneTop, t2, Zonas[z].zoneBottom);

      ObjectSet(nomeRect, OBJPROP_TIME1,  t1);
      ObjectSet(nomeRect, OBJPROP_PRICE1, Zonas[z].zoneTop);
      ObjectSet(nomeRect, OBJPROP_TIME2,  t2);
      ObjectSet(nomeRect, OBJPROP_PRICE2, Zonas[z].zoneBottom);
      ObjectSet(nomeRect, OBJPROP_COLOR,  corZona);
      ObjectSet(nomeRect, OBJPROP_STYLE,  STYLE_SOLID);
      ObjectSet(nomeRect, OBJPROP_WIDTH,  1);
      ObjectSet(nomeRect, OBJPROP_BACK,   true);
      ObjectSet(nomeRect, OBJPROP_FILL,   true);
      ObjectSet(nomeRect, OBJPROP_RAY,    false);

      // Rótulo com contagem de toques
      string textoLabel = IntegerToStr(Zonas[z].touches) + "T";
      if(ObjectFind(nomeLabel) < 0)
         ObjectCreate(nomeLabel, OBJ_TEXT, 0, t2, Zonas[z].priceLevel);

      ObjectSet(nomeLabel, OBJPROP_TIME1,  t2);
      ObjectSet(nomeLabel, OBJPROP_PRICE1, Zonas[z].priceLevel);
      ObjectSet(nomeLabel, OBJPROP_COLOR,  corZona);
      ObjectSetText(nomeLabel, textoLabel, 9, "Arial", corZona);
   }
}

//+------------------------------------------------------------------+
//| Geração de sinais anti-repaint                                   |
//+------------------------------------------------------------------+
void GerarSinais(int rates_total, int prev_calculated)
{
   double distancia = SignalDistance * PipSize();

   int barraAlvo = rates_total - 2;
   if(barraAlvo < 0) return;

   // Garante EMPTY_VALUE na barra 0 (aberta)
   BufCompra[0] = EMPTY_VALUE;
   BufVenda[0]  = EMPTY_VALUE;

   double lowAlvo  = iLow(NULL, 0, barraAlvo);
   double highAlvo = iHigh(NULL, 0, barraAlvo);
   double closeAlvo = iClose(NULL, 0, barraAlvo);

   bool sinalCompra = false;
   bool sinalVenda  = false;

   for(int z = 0; z < TotalZonas; z++)
   {
      if(Zonas[z].touches < MinTouches) continue;

      if(!Zonas[z].isResistance)
      {
         // Suporte: preço tocou a zona e candle bullish
         bool tocouSuporte = (lowAlvo <= Zonas[z].zoneTop && lowAlvo >= Zonas[z].zoneBottom - ZoneWidthPips * PipSize())
                           || (closeAlvo >= Zonas[z].zoneBottom && closeAlvo <= Zonas[z].zoneTop);
         if(tocouSuporte && EhCandleBullish(barraAlvo))
         {
            sinalCompra = true;
            BufCompra[barraAlvo] = Zonas[z].zoneBottom - distancia;
         }
      }
      else
      {
         // Resistência: preço tocou a zona e candle bearish
         bool tocouResistencia = (highAlvo >= Zonas[z].zoneBottom && highAlvo <= Zonas[z].zoneTop + ZoneWidthPips * PipSize())
                               || (closeAlvo >= Zonas[z].zoneBottom && closeAlvo <= Zonas[z].zoneTop);
         if(tocouResistencia && EhCandleBearish(barraAlvo))
         {
            sinalVenda = true;
            BufVenda[barraAlvo] = Zonas[z].zoneTop + distancia;
         }
      }
   }

   // Alerta único por barra recém-fechada
   if(UseAlerts && (sinalCompra || sinalVenda))
   {
      datetime tempoBarraAlvo = iTime(NULL, 0, barraAlvo);
      if(tempoBarraAlvo != UltimoAlerta)
      {
         UltimoAlerta = tempoBarraAlvo;
         if(sinalCompra)
            Alert("COMPRA — " + Symbol() + " " + PeriodoStr() + " @ " + DoubleToStr(closeAlvo, Digits) + " | Zona Suporte");
         if(sinalVenda)
            Alert("VENDA — " + Symbol() + " " + PeriodoStr() + " @ " + DoubleToStr(closeAlvo, Digits) + " | Zona Resistência");
      }
   }
}

//+------------------------------------------------------------------+
//| Inicialização do indicador                                       |
//+------------------------------------------------------------------+
int init()
{
   SetIndexBuffer(0, BufCompra);
   SetIndexStyle(0, DRAW_ARROW, EMPTY, 2, clrDodgerBlue);
   SetIndexArrow(0, 233);
   SetIndexLabel(0, "Compra (S/R)");
   SetIndexEmptyValue(0, EMPTY_VALUE);

   SetIndexBuffer(1, BufVenda);
   SetIndexStyle(1, DRAW_ARROW, EMPTY, 2, clrRed);
   SetIndexArrow(1, 234);
   SetIndexLabel(1, "Venda (S/R)");
   SetIndexEmptyValue(1, EMPTY_VALUE);

   // Redimensiona o array de zonas conforme o parâmetro MaxZones
   ArrayResize(Zonas, MaxZones);

   IndicatorShortName("StrongSR v2 [" + IntegerToStr(MinTouches) + "T / Sw" + IntegerToStr(SwingPeriod) + "]");
   IndicatorDigits(Digits);

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Limpeza ao remover indicador                                     |
//+------------------------------------------------------------------+
int deinit()
{
   LimparObjetos();
   return(0);
}

//+------------------------------------------------------------------+
//| Função principal de cálculo (MQL4: start)                        |
//+------------------------------------------------------------------+
int start()
{
   int rates_total      = Bars;
   int prev_calculated  = IndicatorCounted();

   // Recalculo completo: zera buffers inteiros
   if(prev_calculated == 0)
   {
      ArrayInitialize(BufCompra, EMPTY_VALUE);
      ArrayInitialize(BufVenda,  EMPTY_VALUE);
      LimparObjetos();
   }

   // Barra 0 sempre EMPTY_VALUE
   BufCompra[0] = EMPTY_VALUE;
   BufVenda[0]  = EMPTY_VALUE;

   // 1. Detectar zonas S/R
   DetectarZonas();

   // 2. Desenhar zonas (se habilitado)
   if(ShowZones)
      DesenharZonas();

   // 3. Gerar sinais anti-repaint (se habilitado)
   if(ShowSignals)
      GerarSinais(rates_total, prev_calculated);

   return(0);
}
//+------------------------------------------------------------------+
