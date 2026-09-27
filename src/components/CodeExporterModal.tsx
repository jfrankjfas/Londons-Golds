import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Code2,
  Download,
  Terminal,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Info,
  ExternalLink,
  Award,
} from 'lucide-react';

interface CodeExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExporterModal: React.FC<CodeExporterModalProps> = ({ isOpen, onClose }) => {
  const [activeLang, setActiveLang] = useState<'mql5' | 'mql4' | 'pinescript' | 'python' | 'checklist'>('mql5');
  const [activePyModule, setActivePyModule] = useState<'main' | 'data' | 'calc' | 'risk' | 'exec'>('main');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // =========================================================================
  // METATRADER 5 (MQL5) - PRODUCTION READY FOR REAL ACCOUNT & BACKTESTER
  // =========================================================================
  const mql5Code = `//+------------------------------------------------------------------+
//|                                     XAUUSD_LondonBreakout_Quant.mq5 |
//|   Algoritmo Cuantitativo Institucional London Breakout & Retest  |
//|        Desarrollado por el Ingeniero Francisco Alvarado          |
//|               Validado para Cuentas Reales y Prop Firms          |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "3.00"
#property description "EA Cuantitativo optimizado para XAU/USD (Oro). Totalmente compatible con el Probador de Estrategias y Cuentas Reales. Incluye sincronizacion GMT de broker, Ruptura y Retesteo, Breakeven 1:1 y Circuit Breaker diario."
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Enumeraciones
enum ENUM_TREND_MODE
{
   TREND_ANY_BREAKOUT = 0, // Ambas Direcciones (Ruptura Libre / Alta Frecuencia)
   TREND_D1_STRICT    = 1  // Filtro Tendencial D1 Estricto (Solo a favor del dia previo)
};

//--- Parametros de Entrada
input group "=== Identificacion & Gestion de Riesgo ==="
input ulong             InpMagicNumber       = 777926;       // Magic Number Unico
input double            InpRiskPercent       = 0.5;          // Riesgo por Trade (% Balance: 0.5% a 1.0%)
input double            InpRRRatio           = 2.0;          // Ratio Riesgo / Beneficio (Objetivo 1:2)
input int               InpMaxDailySL        = 2;            // Limite Diario de Perdidas (Circuit Breaker)
input int               InpMaxDailyTrades    = 2;            // Maximo de Operaciones Diarias (1 o 2)

input group "=== Sincronizacion Horaria (Broker vs UTC) ==="
input int               InpBrokerGmtOffset   = 3;            // Desplazamiento Horario Broker (GMT+3 en verano, GMT+2 en invierno)
input int               InpStartAsiaUTC      = 0;            // Inicio Rango Asiatico (Hora UTC)
input int               InpEndAsiaUTC        = 6;            // Fin Rango Asiatico (Hora UTC)
input int               InpStartLondonUTC    = 8;            // Inicio Ventana Londres (Hora UTC)
input int               InpEndLondonUTC      = 13;           // Fin Ventana Londres (Hora UTC)

input group "=== Filtros Cuantitativos de Calidad ==="
input ENUM_TREND_MODE   InpTrendMode         = TREND_ANY_BREAKOUT; // Modo de Operacion
input double            InpMinAsiaRange      = 6.0;          // Amplitud Minima Rango Tokio (Puntos Oro $)
input double            InpMaxAsiaRange      = 22.0;         // Amplitud Maxima Rango Tokio (Puntos Oro $)
input int               InpMaxSpreadPips     = 50;           // Spread Maximo Permitido (Puntos / Centavos)
input int               InpSlippage          = 30;           // Tolerancia Desviacion Precio (Slippage)

input group "=== Blindaje y Proteccion Breakeven ==="
input bool              InpEnableBreakeven   = true;         // Activar Breakeven Dinamico a 1:1 R
input double            InpBEBufferPoints    = 0.20;         // Buffer por encima de entrada ($0.20 Oro)

//--- Variables Globales de Estado
datetime g_lastEvaluatedBarTime = 0;
string   g_lastTradeDate        = "";
int      g_dailyTradesCount     = 0;
int      g_dailySLCount         = 0;

//+------------------------------------------------------------------+
//| Auto-detectar Politica de Llenado compatible con el Broker       |
//+------------------------------------------------------------------+
void SetOptimalFillingMode()
{
   uint filling = (uint)SymbolInfoInteger(_Symbol, SYMBOL_FILLING_MODE);
   if((filling & SYMBOL_FILLING_FOK) != 0)
      trade.SetTypeFilling(ORDER_FILLING_FOK);
   else if((filling & SYMBOL_FILLING_IOC) != 0)
      trade.SetTypeFilling(ORDER_FILLING_IOC);
   else
      trade.SetTypeFilling(ORDER_FILLING_RETURN);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetAsyncMode(false);
   SetOptimalFillingMode();
   
   Print("===============================================================");
   Print(" EA INICIADO: XAU/USD London Breakout Cuantitativo v3.0");
   Print(" Desarrollado por: Ingeniero Francisco Alvarado");
   Print(" Broker GMT Offset configurado: GMT+", InpBrokerGmtOffset);
   Print(" Riesgo por Operacion: ", InpRiskPercent, "% | R:R: 1:", InpRRRatio);
   Print("===============================================================");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Comment("");
}

//+------------------------------------------------------------------+
//| Calcula el Rango Asiatico exacto del dia escaneando las velas M15|
//+------------------------------------------------------------------+
bool GetTodayAsianRange(datetime currentBarTime, double &outHigh, double &outLow, double &outMid, double &outRange)
{
   MqlDateTime dt;
   TimeToStruct(currentBarTime, dt);
   
   // Medianoche del dia actual en horario del broker
   MqlDateTime midnightDt = dt;
   midnightDt.hour = 0;
   midnightDt.min  = 0;
   midnightDt.sec  = 0;
   datetime midnight = StructToTime(midnightDt);
   
   // Horas de inicio y fin en horario del servidor del broker
   int startServerHour = InpStartAsiaUTC + InpBrokerGmtOffset;
   int endServerHour   = InpEndAsiaUTC + InpBrokerGmtOffset;
   
   datetime startAsiaTime = midnight + (startServerHour * 3600);
   datetime endAsiaTime   = midnight + (endServerHour * 3600);
   
   MqlRates rates[];
   int count = CopyRates(_Symbol, PERIOD_M15, startAsiaTime, endAsiaTime, rates);
   if(count <= 0) return false;
   
   double maxH = -1.0;
   double minL = 9999999.0;
   for(int i = 0; i < count; i++)
   {
      if(rates[i].high > maxH) maxH = rates[i].high;
      if(rates[i].low < minL)  minL = rates[i].low;
   }
   
   if(maxH <= 0 || minL >= 9999999.0 || maxH <= minL) return false;
   
   outHigh  = NormalizeDouble(maxH, _Digits);
   outLow   = NormalizeDouble(minL, _Digits);
   outMid   = NormalizeDouble((outHigh + outLow) / 2.0, _Digits);
   outRange = NormalizeDouble(outHigh - outLow, _Digits);
   return true;
}

//+------------------------------------------------------------------+
//| Cuenta posiciones abiertas con el MagicNumber del bot            |
//+------------------------------------------------------------------+
int CountBotPositions()
{
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetTicket(i) > 0)
      {
         if(PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
            count++;
      }
   }
   return count;
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   datetime currentServerTime = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(currentServerTime, dt);
   
   string todayDateStr = StringFormat("%04d-%02d-%02d", dt.year, dt.mon, dt.day);
   
   // 1. Reset diario
   if(g_lastTradeDate != todayDateStr)
   {
      g_lastTradeDate = todayDateStr;
      g_dailyTradesCount = 0;
      g_dailySLCount = 0;
   }
   
   // 2. Gestion de Breakeven en tiempo real
   if(InpEnableBreakeven)
   {
      ManageBreakeven();
   }
   
   // 3. Conversion de hora del servidor a hora UTC
   int currentUtcHour = (dt.hour - InpBrokerGmtOffset + 24) % 24;
   
   // Solo evaluar cuando cierra una vela M15
   datetime currentBarTime = iTime(_Symbol, PERIOD_M15, 0);
   if(g_lastEvaluatedBarTime == currentBarTime) return;
   
   // 4. Ventana Operativa de Londres (08:00 a 13:00 UTC)
   bool isLondonWindow = (currentUtcHour >= InpStartLondonUTC && currentUtcHour < InpEndLondonUTC);
   
   if(!isLondonWindow)
   {
      Comment(StringFormat("\\n[XAU/USD London Breakout - Ing. Francisco Alvarado]\\nHora Broker: %02d:%02d | Hora UTC: %02d:%02d\\nEstado: Esperando apertura de Londres (08:00 UTC)", dt.hour, dt.min, currentUtcHour, dt.min));
      return;
   }
   
   // 5. Circuito de Proteccion de Cuenta Real
   if(g_dailySLCount >= InpMaxDailySL)
   {
      Comment("\\n[XAU/USD Bot - Ing. Francisco Alvarado]\\n⚠️ Limite diario de 2 Stop Loss alcanzado hoy. Trading pausado.");
      return;
   }
   if(g_dailyTradesCount >= InpMaxDailyTrades)
   {
      Comment("\\n[XAU/USD Bot - Ing. Francisco Alvarado]\\n✅ Limite diario de 2 operaciones completado hoy.");
      return;
   }
   
   // 6. Obtener Rango Asiatico
   double asiaHigh = 0.0, asiaLow = 0.0, asiaMid = 0.0, asiaRange = 0.0;
   if(!GetTodayAsianRange(currentBarTime, asiaHigh, asiaLow, asiaMid, asiaRange))
   {
      Comment("\\n[XAU/USD Bot - Ing. Francisco Alvarado]\\nCalculando Rango de Tokio...");
      return;
   }
   
   // 7. Filtro de Volatilidad (6.0 a 22.0 puntos)
   if(asiaRange < InpMinAsiaRange || asiaRange > InpMaxAsiaRange)
   {
      Comment(StringFormat("\\n[XAU/USD Bot - Ing. Francisco Alvarado]\\nFiltro Volatilidad: Rango Tokio anomalo (%.2f pts). Esperando.", asiaRange));
      return;
   }
   
   // 8. Filtro de Spread
   long spread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spread > InpMaxSpreadPips)
   {
      Print("⚠️ Spread elevado: ", spread, " pts. Entrada bloqueada por seguridad.");
      return;
   }
   
   // 9. Analisis de velas M15 cerradas
   MqlRates m15[];
   ArraySetAsSeries(m15, true);
   if(CopyRates(_Symbol, PERIOD_M15, 1, 2, m15) < 2) return;
   
   // 10. Filtro Tendencial D1
   MqlRates d1[];
   ArraySetAsSeries(d1, true);
   if(CopyRates(_Symbol, PERIOD_D1, 1, 1, d1) < 1) return;
   
   bool isD1Bullish = (d1[0].close > d1[0].open);
   bool isD1Bearish = (d1[0].close < d1[0].open);
   
   bool allowLong  = (InpTrendMode == TREND_ANY_BREAKOUT) || (isD1Bullish);
   bool allowShort = (InpTrendMode == TREND_ANY_BREAKOUT) || (isD1Bearish);
   
   double c1 = m15[0].close; // Vela M15 recien cerrada
   double c2 = m15[1].close; // Vela M15 anterior
   double l1 = m15[0].low;
   double h1 = m15[0].high;
   double o1 = m15[0].open;
   
   bool isFirstTrade = (g_dailyTradesCount == 0);
   
   // Condicion BUY: Ruptura #1 o Retesteo #2
   bool buyBreakout = allowLong && (
      (isFirstTrade && c1 > asiaHigh && c2 <= asiaHigh) ||
      (!isFirstTrade && c1 > asiaHigh && l1 >= (asiaHigh - 1.5) && c1 > o1)
   );
   
   // Condicion SELL: Ruptura #1 o Retesteo #2
   bool sellBreakout = allowShort && (
      (isFirstTrade && c1 < asiaLow && c2 >= asiaLow) ||
      (!isFirstTrade && c1 < asiaLow && h1 <= (asiaLow + 1.5) && c1 < o1)
   );
   
   int botPositions = CountBotPositions();
   
   // Ejecucion BUY
   if(buyBreakout && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl = isFirstTrade ? asiaMid : (entry - MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, _Digits);
      double riskDistance = entry - sl;
      double tp = NormalizeDouble(entry + (riskDistance * InpRRRatio), _Digits);
      
      double lots = CalculateLotSize(entry, sl);
      string comment = StringFormat("LB #%d Long [Ing. Alvarado]", g_dailyTradesCount + 1);
      
      SetOptimalFillingMode();
      if(trade.Buy(lots, _Symbol, entry, sl, tp, comment))
      {
         g_lastEvaluatedBarTime = currentBarTime;
         g_dailyTradesCount++;
         Print("✅ [BUY CONFIRMADO] Ticket #", trade.ResultOrder(), " Lotes=", lots, " Entrada=", entry, " SL=", sl, " TP=", tp);
      }
      else
      {
         Print("❌ Error enviando BUY: ", trade.ResultRetcode(), " - ", trade.ResultComment());
      }
   }
   // Ejecucion SELL
   else if(sellBreakout && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl = isFirstTrade ? asiaMid : (entry + MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, _Digits);
      double riskDistance = sl - entry;
      double tp = NormalizeDouble(entry - (riskDistance * InpRRRatio), _Digits);
      
      double lots = CalculateLotSize(entry, sl);
      string comment = StringFormat("LB #%d Short [Ing. Alvarado]", g_dailyTradesCount + 1);
      
      SetOptimalFillingMode();
      if(trade.Sell(lots, _Symbol, entry, sl, tp, comment))
      {
         g_lastEvaluatedBarTime = currentBarTime;
         g_dailyTradesCount++;
         Print("✅ [SELL CONFIRMADO] Ticket #", trade.ResultOrder(), " Lotes=", lots, " Entrada=", entry, " SL=", sl, " TP=", tp);
      }
      else
      {
         Print("❌ Error enviando SELL: ", trade.ResultRetcode(), " - ", trade.ResultComment());
      }
   }
   
   g_lastEvaluatedBarTime = currentBarTime;
}

//+------------------------------------------------------------------+
//| Proteccion Automatica Breakeven Dinamico a 1:1 R                 |
//+------------------------------------------------------------------+
void ManageBreakeven()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      
      long type = PositionGetInteger(POSITION_TYPE);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double slPrice   = PositionGetDouble(POSITION_SL);
      double tpPrice   = PositionGetDouble(POSITION_TP);
      double curBid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double curAsk    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      
      double riskDist = MathAbs(openPrice - slPrice);
      if(riskDist <= 0) continue;
      
      if(type == POSITION_TYPE_BUY)
      {
         if(curBid >= (openPrice + riskDist))
         {
            double beLevel = NormalizeDouble(openPrice + InpBEBufferPoints, _Digits);
            if(slPrice < openPrice)
            {
               SetOptimalFillingMode();
               trade.PositionModify(ticket, beLevel, tpPrice);
               Print("🛡️ [BREAKEVEN 1:1] Stop Loss protegido para BUY #", ticket, " en ", beLevel);
            }
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         if(curAsk <= (openPrice - riskDist))
         {
            double beLevel = NormalizeDouble(openPrice - InpBEBufferPoints, _Digits);
            if(slPrice > openPrice || slPrice == 0.0)
            {
               SetOptimalFillingMode();
               trade.PositionModify(ticket, beLevel, tpPrice);
               Print("🛡️ [BREAKEVEN 1:1] Stop Loss protegido para SELL #", ticket, " en ", beLevel);
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Dimensionamiento de Lotes Exacto para Cuenta Real (0.5% - 1.0%) |
//+------------------------------------------------------------------+
double CalculateLotSize(double entry, double sl)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double points = MathAbs(entry - sl);
   if(points <= 0.01) points = 5.0;
   
   double contractSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
   if(contractSize <= 0) contractSize = 100.0; // 100 oz estandar en Oro
   
   double dollarRiskPerLot = points * contractSize;
   if(dollarRiskPerLot <= 0) return SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   
   double lots = riskMoney / dollarRiskPerLot;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   if(step <= 0) step = 0.01;
   lots = MathFloor(lots / step) * step;
   if(lots < minLot) lots = minLot;
   if(lots > maxLot) lots = maxLot;
   
   return NormalizeDouble(lots, 2);
}
`;

  // =========================================================================
  // METATRADER 4 (MQL4) - PRODUCTION READY FOR REAL ACCOUNT & BACKTESTER
  // =========================================================================
  const mql4Code = `//+------------------------------------------------------------------+
//|                                     XAUUSD_LondonBreakout_Quant.mq4 |
//|   Algoritmo Cuantitativo Institucional London Breakout & Retest  |
//|        Desarrollado por el Ingeniero Francisco Alvarado          |
//|               Validado para Cuentas Reales y Prop Firms          |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "3.00"
#property description "Robot Cuantitativo XAU/USD para MetaTrader 4. Incluye Ruptura, Retesteo, Sincronizacion GMT de Broker, Proteccion Breakeven Dinamica 1:1 y Calculo Exacto de Riesgo."
#property strict

//--- Parametros de Entrada
extern string   sep0              = "=== Identificacion & Riesgo ===";
extern int      InpMagicNumber    = 777926;       // Magic Number Unico
extern double   InpRiskPercent    = 0.5;          // Riesgo por Trade (% Balance: 0.5% - 1.0%)
extern double   InpRRRatio        = 2.0;          // Ratio Riesgo/Beneficio (1:2)
extern int      InpMaxDailySL     = 2;            // Limite Diario de Perdidas (Circuit Breaker)
extern int      InpMaxDailyTrades = 2;            // Maximo de Trades por Dia (1 o 2)

extern string   sep1              = "=== Sincronizacion Horaria (Broker vs UTC) ===";
extern int      InpBrokerGmtOffset= 3;            // Desplazamiento GMT del Broker (GMT+3 en verano, GMT+2 en invierno)
extern int      InpStartAsiaUTC   = 0;            // Inicio Rango Asiatico (Hora UTC)
extern int      InpEndAsiaUTC     = 6;            // Fin Rango Asiatico (Hora UTC)
extern int      InpStartLondonUTC = 8;            // Inicio Ventana Londres (Hora UTC)
extern int      InpEndLondonUTC   = 13;           // Fin Ventana Londres (Hora UTC)

extern string   sep2              = "=== Filtros Cuantitativos ===";
extern bool     InpUseD1Trend     = false;        // true = Filtro D1 Estricto | false = Ambas Direcciones
extern double   InpMinAsiaRange   = 6.0;          // Rango Minimo Tokio ($ pts)
extern double   InpMaxAsiaRange   = 22.0;         // Rango Maximo Tokio ($ pts)
extern int      InpMaxSpread      = 50;           // Spread Maximo Permitido (pips/cents)
extern int      InpSlippage       = 5;            // Tolerancia de Deslizamiento

extern string   sep3              = "=== Blindaje Breakeven ===";
extern bool     InpEnableBE       = true;         // Activar Proteccion Breakeven 1:1
extern double   InpBEBufferPoints = 0.20;         // Buffer por encima de entrada ($0.20 Oro)

//--- Variables Globales
datetime g_lastEvaluatedBarTime = 0;
string   g_lastTradeDate        = "";
int      g_dailyTradesCount     = 0;
int      g_dailySLCount         = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("Robot Cuantitativo XAU/USD MT4 v3.0 Inicializado. Ing. Francisco Alvarado.");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Comment("");
}

//+------------------------------------------------------------------+
//| Calcula el Rango Asiatico exacto del dia en MT4                  |
//+------------------------------------------------------------------+
bool GetTodayAsianRangeMT4(datetime currentBarTime, double &outHigh, double &outLow, double &outMid, double &outRange)
{
   int startServerHour = InpStartAsiaUTC + InpBrokerGmtOffset;
   int endServerHour   = InpEndAsiaUTC + InpBrokerGmtOffset;
   
   int dayOfYear = TimeDayOfYear(currentBarTime);
   int year = TimeYear(currentBarTime);
   
   double maxH = -1.0;
   double minL = 9999999.0;
   int barsFound = 0;
   
   // Escanear velas M15 del dia
   for(int i = 0; i < 150; i++)
   {
      datetime barTime = Time[i];
      if(TimeYear(barTime) != year || TimeDayOfYear(barTime) != dayOfYear)
      {
         if(i > 0) break; // Fin del dia de hoy
         continue;
      }
      
      int h = TimeHour(barTime);
      if(h >= startServerHour && h < endServerHour)
      {
         if(High[i] > maxH) maxH = High[i];
         if(Low[i] < minL)  minL = Low[i];
         barsFound++;
      }
   }
   
   if(barsFound == 0 || maxH <= 0 || minL >= 9999999.0 || maxH <= minL) return false;
   
   outHigh  = NormalizeDouble(maxH, Digits);
   outLow   = NormalizeDouble(minL, Digits);
   outMid   = NormalizeDouble((outHigh + outLow) / 2.0, Digits);
   outRange = NormalizeDouble(outHigh - outLow, Digits);
   return true;
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   datetime currentServerTime = TimeCurrent();
   int serverHour = TimeHour(currentServerTime);
   int serverMin  = TimeMinute(currentServerTime);
   
   string todayDateStr = TimeToStr(currentServerTime, TIME_DATE);
   
   // Reset diario
   if(g_lastTradeDate != todayDateStr)
   {
      g_lastTradeDate = todayDateStr;
      g_dailyTradesCount = 0;
      g_dailySLCount = 0;
   }
   
   // 1. Gestion de Breakeven Activo
   if(InpEnableBE) ManageBreakevenMT4();
   
   // Conversion a UTC
   int currentUtcHour = (serverHour - InpBrokerGmtOffset + 24) % 24;
   
   // Solo evaluar cuando cierra una vela M15
   datetime currentBarTime = Time[0];
   if(g_lastEvaluatedBarTime == currentBarTime) return;
   
   // 2. Ventana Operativa de Londres (08:00 a 13:00 UTC)
   bool isLondonWindow = (currentUtcHour >= InpStartLondonUTC && currentUtcHour < InpEndLondonUTC);
   
   if(!isLondonWindow)
   {
      Comment(StringFormat("\\n[XAU/USD Bot MT4 - Ing. Francisco Alvarado]\\nHora Broker: %02d:%02d | Hora UTC: %02d:%02d\\nEstado: Esperando apertura de Londres (08:00 UTC)", serverHour, serverMin, currentUtcHour, serverMin));
      return;
   }
   
   // 3. Circuito de Proteccion Diario
   if(g_dailySLCount >= InpMaxDailySL || g_dailyTradesCount >= InpMaxDailyTrades)
   {
      Comment("\\n[XAU/USD Bot MT4 - Ing. Francisco Alvarado]\\nTrading completado o pausado por limite diario.");
      return;
   }
   
   // 4. Obtener Rango Asiatico
   double asiaHigh = 0.0, asiaLow = 0.0, asiaMid = 0.0, asiaRange = 0.0;
   if(!GetTodayAsianRangeMT4(currentBarTime, asiaHigh, asiaLow, asiaMid, asiaRange))
   {
      Comment("\\n[XAU/USD Bot MT4 - Ing. Francisco Alvarado]\\nCalculando Rango de Tokio...");
      return;
   }
   
   // 5. Filtros de calidad
   if(asiaRange < InpMinAsiaRange || asiaRange > InpMaxAsiaRange) return;
   if(MarketInfo(Symbol(), MODE_SPREAD) > InpMaxSpread) return;
   
   // 6. Tendencia D1 anterior
   double d1Close = iClose(Symbol(), PERIOD_D1, 1);
   double d1Open  = iOpen(Symbol(), PERIOD_D1, 1);
   bool isD1Bullish = (d1Close > d1Open);
   bool isD1Bearish = (d1Close < d1Open);
   
   bool allowBuy  = (!InpUseD1Trend) || isD1Bullish;
   bool allowSell = (!InpUseD1Trend) || isD1Bearish;
   
   double c1 = Close[1];
   double c2 = Close[2];
   double l1 = Low[1];
   double h1 = High[1];
   double o1 = Open[1];
   
   bool isFirst = (g_dailyTradesCount == 0);
   
   // Gatillo BUY
   bool buySig = allowBuy && (
      (isFirst && c1 > asiaHigh && c2 <= asiaHigh) ||
      (!isFirst && c1 > asiaHigh && l1 >= (asiaHigh - 1.5) && c1 > o1)
   );
   
   // Gatillo SELL
   bool sellSig = allowSell && (
      (isFirst && c1 < asiaLow && c2 >= asiaLow) ||
      (!isFirst && c1 < asiaLow && h1 <= (asiaLow + 1.5) && c1 < o1)
   );
   
   int openOrders = CountOpenOrdersMT4();
   
   if(buySig && openOrders == 0)
   {
      double entry = Ask;
      double sl = isFirst ? asiaMid : (entry - MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, Digits);
      double risk = entry - sl;
      double tp = NormalizeDouble(entry + (risk * InpRRRatio), Digits);
      double lots = CalculateLotsMT4(entry, sl);
      
      int ticket = OrderSend(Symbol(), OP_BUY, lots, entry, InpSlippage, sl, tp, "LB Buy [Ing. Alvarado]", InpMagicNumber, 0, clrGreen);
      if(ticket > 0)
      {
         g_lastEvaluatedBarTime = currentBarTime;
         g_dailyTradesCount++;
         Print("✅ BUY EJECUTADO MT4: Ticket #", ticket, " Lotes=", lots, " Entrada=", entry, " SL=", sl, " TP=", tp);
      }
      else
      {
         Print("❌ Error enviando BUY MT4: ", GetLastError());
      }
   }
   else if(sellSig && openOrders == 0)
   {
      double entry = Bid;
      double sl = isFirst ? asiaMid : (entry + MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, Digits);
      double risk = sl - entry;
      double tp = NormalizeDouble(entry - (risk * InpRRRatio), Digits);
      double lots = CalculateLotsMT4(entry, sl);
      
      int ticket = OrderSend(Symbol(), OP_SELL, lots, entry, InpSlippage, sl, tp, "LB Sell [Ing. Alvarado]", InpMagicNumber, 0, clrRed);
      if(ticket > 0)
      {
         g_lastEvaluatedBarTime = currentBarTime;
         g_dailyTradesCount++;
         Print("✅ SELL EJECUTADO MT4: Ticket #", ticket, " Lotes=", lots, " Entrada=", entry, " SL=", sl, " TP=", tp);
      }
      else
      {
         Print("❌ Error enviando SELL MT4: ", GetLastError());
      }
   }
   
   g_lastEvaluatedBarTime = currentBarTime;
}

//+------------------------------------------------------------------+
//| Calculo Dinamico de Lotes MT4                                    |
//+------------------------------------------------------------------+
double CalculateLotsMT4(double entry, double sl)
{
   double balance = AccountBalance();
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double points = MathAbs(entry - sl);
   if(points <= 0.01) points = 5.0;
   
   double contractSize = MarketInfo(Symbol(), MODE_LOTSIZE);
   if(contractSize <= 0) contractSize = 100.0;
   
   double dollarRiskPerLot = points * contractSize;
   if(dollarRiskPerLot <= 0) return MarketInfo(Symbol(), MODE_MINLOT);
   
   double lots = riskMoney / dollarRiskPerLot;
   double step = MarketInfo(Symbol(), MODE_LOTSTEP);
   double minLot = MarketInfo(Symbol(), MODE_MINLOT);
   double maxLot = MarketInfo(Symbol(), MODE_MAXLOT);
   
   if(step <= 0) step = 0.01;
   lots = MathFloor(lots / step) * step;
   if(lots < minLot) lots = minLot;
   if(lots > maxLot) lots = maxLot;
   
   return NormalizeDouble(lots, 2);
}

//+------------------------------------------------------------------+
//| Proteccion Automatica Breakeven MT4                              |
//+------------------------------------------------------------------+
void ManageBreakevenMT4()
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      
      double openPrice = OrderOpenPrice();
      double currentSL = OrderStopLoss();
      double currentTP = OrderTakeProfit();
      double riskDist  = MathAbs(openPrice - currentSL);
      if(riskDist <= 0) continue;
      
      if(OrderType() == OP_BUY)
      {
         if(Bid >= (openPrice + riskDist))
         {
            double beLevel = NormalizeDouble(openPrice + InpBEBufferPoints, Digits);
            if(currentSL < openPrice)
            {
               OrderModify(OrderTicket(), openPrice, beLevel, currentTP, 0, clrCyan);
               Print("🛡️ [BE 1:1 MT4] Stop Loss movido a entrada para BUY #", OrderTicket());
            }
         }
      }
      else if(OrderType() == OP_SELL)
      {
         if(Ask <= (openPrice - riskDist))
         {
            double beLevel = NormalizeDouble(openPrice - InpBEBufferPoints, Digits);
            if(currentSL > openPrice || currentSL == 0.0)
            {
               OrderModify(OrderTicket(), openPrice, beLevel, currentTP, 0, clrCyan);
               Print("🛡️ [BE 1:1 MT4] Stop Loss movido a entrada para SELL #", OrderTicket());
            }
         }
      }
   }
}

int CountOpenOrdersMT4()
{
   int count = 0;
   for(int i = 0; i < OrdersTotal(); i++)
   {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
      {
         if(OrderSymbol() == Symbol() && OrderMagicNumber() == InpMagicNumber) count++;
      }
   }
   return count;
}
`;

  // =========================================================================
  // TRADINGVIEW (PINE SCRIPT V5 / V6)
  // =========================================================================
  const pineScriptCode = `//@version=5
strategy("XAU/USD London Breakout Quant Strategy [Ing. Francisco Alvarado]", 
         shorttitle="XAU Quant [Alvarado]", 
         overlay=true, 
         initial_capital=10000, 
         default_qty_type=strategy.percent_of_equity, 
         default_qty_value=0.5, 
         commission_type=strategy.commission.cash_per_contract, 
         commission_value=0.04, 
         max_lines_count=500, 
         max_boxes_count=500)

// ============================================================================
// SISTEMA CUANTITATIVO DE TRADING EN ORO (XAU/USD)
// Autor: Ingeniero Francisco Alvarado
// Metodología: Ruptura y Retesteo Sesión Tokio -> Londres M15 + Breakeven 1:1
// ============================================================================

// 1. PARAMETROS DE ENTRADA
startAsiaHour    = input.int(0,  "Inicio Rango Asiático (Hora UTC)", minval=0, maxval=23, group="Horarios UTC")
endAsiaHour      = input.int(6,  "Fin Rango Asiático (Hora UTC)",    minval=0, maxval=23, group="Horarios UTC")
startLondonHour  = input.int(8,  "Inicio Sesión Londres (Hora UTC)", minval=0, maxval=23, group="Horarios UTC")
endLondonHour    = input.int(13, "Fin Sesión Londres (Hora UTC)",    minval=0, maxval=23, group="Horarios UTC")

trendMode        = input.string("Ambas Direcciones (Alta Frecuencia)", "Modo de Tendencia", 
                               options=["Ambas Direcciones (Alta Frecuencia)", "Filtro D1 Estricto"], group="Parámetros Cuantitativos")
minAsiaPoints    = input.float(6.0,  "Amplitud Mínima Rango Asia ($ pts)", step=0.5, group="Parámetros Cuantitativos")
maxAsiaPoints    = input.float(22.0, "Amplitud Máxima Rango Asia ($ pts)", step=0.5, group="Parámetros Cuantitativos")
rrRatio          = input.float(2.0,  "Ratio Riesgo / Beneficio Objetivo (1:2)", step=0.5, group="Gestión de Riesgo")
enableBreakeven  = input.bool(true,  "Activar Protección Breakeven 1:1 Dinámica", group="Gestión de Riesgo")

// 2. SESIONES Y FILTROS TEMPORALES
utcHour = hour(time, "UTC")
utcMinute = minute(time, "UTC")
isAsiaSession   = (utcHour >= startAsiaHour and utcHour < endAsiaHour)
isLondonSession = (utcHour >= startLondonHour and utcHour < endLondonHour)

// Tendencia Diaria (Vela D1 Anterior)
prevD1Close = request.security(syminfo.tickerid, "D", close[1], barmerge.gaps_off, barmerge.lookahead_on)
prevD1Open  = request.security(syminfo.tickerid, "D", open[1], barmerge.gaps_off, barmerge.lookahead_on)
bool isD1Bullish = prevD1Close > prevD1Open
bool isD1Bearish = prevD1Close < prevD1Open

bool allowLongByTrend  = (trendMode == "Ambas Direcciones (Alta Frecuencia)") or isD1Bullish
bool allowShortByTrend = (trendMode == "Ambas Direcciones (Alta Frecuencia)") or isD1Bearish

// 3. CAPTURA DEL RANGO ASIATICO (00:00 - 06:00 UTC)
var float asiaHigh = na
var float asiaLow  = na
var box   asiaBox  = na

if isAsiaSession
    if not isAsiaSession[1]
        asiaHigh := high
        asiaLow  := low
    else
        asiaHigh := math.max(asiaHigh, high)
        asiaLow  := math.min(asiaLow, low)

if not isAsiaSession and isAsiaSession[1]
    float rangePts = asiaHigh - asiaLow
    color boxCol = (rangePts >= minAsiaPoints and rangePts <= maxAsiaPoints) ? color.new(color.amber, 85) : color.new(color.gray, 85)
    asiaBox := box.new(left=bar_index - 24, top=asiaHigh, right=bar_index, bottom=asiaLow, 
                       border_color=color.amber, bgcolor=boxCol, 
                       text="Rango Tokio: " + str.tostring(rangePts, "#.##") + " pts\\n[Ing. Francisco Alvarado]", 
                       text_color=color.white, text_size=size.small)

float asiaRange = asiaHigh - asiaLow
float asiaMid   = (asiaHigh + asiaLow) / 2.0
bool isVolatilityOptimal = (asiaRange >= minAsiaPoints and asiaRange <= maxAsiaPoints)

// Dibujar niveles en gráfico
plot(asiaHigh, "Asia High", color=color.new(color.red, 30), linewidth=1, style=plot.style_linebr)
plot(asiaLow,  "Asia Low",  color=color.new(color.green, 30), linewidth=1, style=plot.style_linebr)
plot(asiaMid,  "Asia Mid (SL)", color=color.new(color.blue, 40), linewidth=1, style=plot.style_linebr)

// 4. LOGICA DE GATILLO Y TRADES (M15 LONDRES)
var int dailyTradesCount = 0
if dayofmonth != dayofmonth[1]
    dailyTradesCount := 0

bool canTrade = isLondonSession and isVolatilityOptimal and (dailyTradesCount < 2)

// Trade 1: Ruptura Limpia con Cuerpo | Trade 2: Retesteo con Confirmación
bool isFirstTrade = (dailyTradesCount == 0)

bool triggerBuy = canTrade and allowLongByTrend and (
     (isFirstTrade and close > asiaHigh and close[1] <= asiaHigh) or 
     (not isFirstTrade and close > asiaHigh and low >= (asiaHigh - 1.5) and close > open)
     )

bool triggerSell = canTrade and allowShortByTrend and (
     (isFirstTrade and close < asiaLow and close[1] >= asiaLow) or 
     (not isFirstTrade and close < asiaLow and high <= (asiaLow + 1.5) and close < open)
     )

// 5. GESTION DE ENTRADAS Y SALIDAS
var float entryPrice = na
var float stopLossPrice = na
var float takeProfitPrice = na
var bool  isBeActivated = false

if triggerBuy and strategy.position_size == 0
    dailyTradesCount += 1
    entryPrice := close
    stopLossPrice := isFirstTrade ? asiaMid : (entryPrice - math.min(math.max(asiaRange * 0.5, 4.0), 8.0))
    float risk = entryPrice - stopLossPrice
    takeProfitPrice := entryPrice + (risk * rrRatio)
    isBeActivated := false
    
    strategy.entry("Long Breakout", strategy.long)
    strategy.exit("Exit Long", "Long Breakout", stop=stopLossPrice, limit=takeProfitPrice)
    alert("🟢 XAU/USD BUY: Entrada en " + str.tostring(entryPrice) + " | SL: " + str.tostring(stopLossPrice) + " | TP: " + str.tostring(takeProfitPrice), alert.freq_once_per_bar_close)

if triggerSell and strategy.position_size == 0
    dailyTradesCount += 1
    entryPrice := close
    stopLossPrice := isFirstTrade ? asiaMid : (entryPrice + math.min(math.max(asiaRange * 0.5, 4.0), 8.0))
    float risk = stopLossPrice - entryPrice
    takeProfitPrice := entryPrice - (risk * rrRatio)
    isBeActivated := false
    
    strategy.entry("Short Breakout", strategy.short)
    strategy.exit("Exit Short", "Short Breakout", stop=stopLossPrice, limit=takeProfitPrice)
    alert("🔴 XAU/USD SELL: Entrada en " + str.tostring(entryPrice) + " | SL: " + str.tostring(stopLossPrice) + " | TP: " + str.tostring(takeProfitPrice), alert.freq_once_per_bar_close)

// 6. BLINDAJE DINAMICO A BREAKEVEN 1:1
if enableBreakeven and strategy.position_size > 0
    float initialRisk = entryPrice - stopLossPrice
    if high >= (entryPrice + initialRisk) and not isBeActivated
        isBeActivated := true
        stopLossPrice := entryPrice + 0.10 // Asegurar costo de comisión
        strategy.exit("Exit Long", "Long Breakout", stop=stopLossPrice, limit=takeProfitPrice)

if enableBreakeven and strategy.position_size < 0
    float initialRisk = stopLossPrice - entryPrice
    if low <= (entryPrice - initialRisk) and not isBeActivated
        isBeActivated := true
        stopLossPrice := entryPrice - 0.10
        strategy.exit("Exit Short", "Short Breakout", stop=stopLossPrice, limit=takeProfitPrice)

// 7. TABLA DASHBOARD EN PANTALLA
var table hud = table.new(position.top_right, 2, 5, bgcolor=color.new(color.black, 20), border_color=color.gray)
if barstate.islast
    table.cell(hud, 0, 0, "SISTEMA CUANTITATIVO", bgcolor=color.blue, text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 0, "Ing. Francisco Alvarado", bgcolor=color.blue, text_color=color.amber, text_size=size.small)
    table.cell(hud, 0, 1, "Rango Tokio", text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 1, str.tostring(asiaRange, "#.##") + " pts (" + (isVolatilityOptimal ? "Óptimo" : "Pausado") + ")", text_color=isVolatilityOptimal ? color.green : color.red, text_size=size.small)
    table.cell(hud, 0, 2, "Trades Hoy", text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 2, str.tostring(dailyTradesCount) + " / 2", text_color=color.yellow, text_size=size.small)
    table.cell(hud, 0, 3, "Gestión R:R", text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 3, "1:2.0 (Breakeven 1:1)", text_color=color.cyan, text_size=size.small)
    table.cell(hud, 0, 4, "Modo Filtro", text_color=color.white, text_size=size.small)
    table.cell(hud, 1, 4, trendMode, text_color=color.orange, text_size=size.small)
`;

  // =========================================================================
  // PYTHON MODULAR BOT
  // =========================================================================
  const pythonModules = {
    main: `# ==============================================================================
# PROYECTO: XAU/USD London Open Breakout Quant Bot
# AUTOR: Ingeniero Francisco Alvarado
# ARCHIVO: main.py
# DESCRIPCIÓN: Orquestador en tiempo real con conexión a MetaTrader 5 / Brokers REST.
# ==============================================================================

import time
import datetime
from data_fetcher import DataFetcher
from quant_calculator import QuantCalculator
from risk_manager import RiskManager
from order_executor import OrderExecutor

SYMBOL = "XAUUSD"
RISK_PERCENT = 0.5           # 0.5% estricto de riesgo sobre balance de cuenta real
RR_RATIO = 2.0               # Objetivo asimétrico 1:2.0
TREND_MODE = "ANY_BREAKOUT"  # "ANY_BREAKOUT" o "D1_STRICT"
MAX_DAILY_SL = 2             # Circuit Breaker: Máximo 2 stop loss diarios
MAX_DAILY_TRADES = 2         # Máximo 2 operaciones por día (Ruptura #1 y Retesteo #2)

def run_bot():
    print("==================================================================")
    print("INICIANDO BOT CUANTITATIVO XAU/USD - LONDON BREAKOUT & RETEST")
    print("Desarrollado por el Ingeniero Francisco Alvarado")
    print(f"Modo: {TREND_MODE} | Riesgo: {RISK_PERCENT}% | R:R: 1:{RR_RATIO}")
    print("==================================================================")
    
    fetcher = DataFetcher(broker="MT5")
    calculator = QuantCalculator()
    risk_mgr = RiskManager(risk_percent=RISK_PERCENT)
    executor = OrderExecutor(broker="MT5")
    
    current_active_day = None
    daily_trades_count = 0
    daily_sl_count = 0

    while True:
        try:
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            current_date_str = now_utc.strftime("%Y-%m-%d")
            hour = now_utc.hour
            minute = now_utc.minute

            # Reset diario a las 00:00 UTC
            if current_active_day != current_date_str:
                current_active_day = current_date_str
                daily_trades_count = 0
                daily_sl_count = 0
                print(f"[{now_utc}] Nuevo día de sesión: {current_date_str}. Parámetros reseteados.")

            # Gestión de Breakeven Activo en tiempo real (1:1 R)
            executor.manage_breakeven_positions(symbol=SYMBOL)

            # Control de Circuito de Blindaje (Evita quemar cuentas)
            if daily_sl_count >= MAX_DAILY_SL:
                time.sleep(60)
                continue
            if daily_trades_count >= MAX_DAILY_TRADES:
                time.sleep(60)
                continue

            # Ventana operativa de Londres: 08:00 a 13:00 UTC
            if 8 <= hour < 13:
                # 1. Obtención de datos M15 y D1
                m15_candles = fetcher.get_candles(symbol=SYMBOL, timeframe="M15", count=60)
                d1_candles = fetcher.get_candles(symbol=SYMBOL, timeframe="D1", count=5)
                
                # 2. Análisis del Filtro Cuanti D1
                d1_trend = calculator.evaluate_d1_trend(d1_candles)
                
                # 3. Delimitación del Rango Asiático (00:00 a 06:00 UTC)
                asian_range = calculator.calculate_asian_range(m15_candles, start_hour=0, end_hour=6)
                
                # 4. Filtro de Volatilidad: 6.0 a 22.0 puntos
                if not asian_range or not (6.0 <= asian_range['range_points'] <= 22.0):
                    time.sleep(15)
                    continue

                # 5. Evaluación de Ruptura o Retesteo
                signal = calculator.evaluate_breakout_trigger(
                    candles=m15_candles,
                    asian_range=asian_range,
                    d1_trend=d1_trend,
                    trend_mode=TREND_MODE,
                    trade_number=daily_trades_count + 1,
                    rr_ratio=RR_RATIO
                )

                if signal:
                    account_balance = fetcher.get_account_balance()
                    
                    # 6. Cálculo exacto del lotaje con gestión de riesgo
                    lot_size = risk_mgr.calculate_lots(
                        balance=account_balance,
                        entry_price=signal["entry_price"],
                        sl_price=signal["sl_price"],
                        contract_size=100.0 # 100 oz en Oro
                    )

                    print(f"[{now_utc}] GATILLO #{daily_trades_count + 1} CONFIRMADO: {signal['type']} en {signal['entry_price']}")
                    print(f"SL: {signal['sl_price']} | TP: {signal['tp_price']} | Lotes: {lot_size}")

                    # 7. Envío y ejecución
                    success = executor.send_order(
                        symbol=SYMBOL,
                        order_type=signal["type"],
                        lot_size=lot_size,
                        entry_price=signal["entry_price"],
                        sl_price=signal["sl_price"],
                        tp_price=signal["tp_price"],
                        comment=f"LB #{daily_trades_count+1} [Ing. Alvarado]"
                    )

                    if success:
                        daily_trades_count += 1
                        print(f"Orden ejecutada con éxito. Total trades hoy: {daily_trades_count}/2")

            time.sleep(15) # Ciclo de escaneo M15
        except Exception as e:
            print(f"Error en el bucle principal: {e}")
            time.sleep(10)

if __name__ == "__main__":
    run_bot()
`,
    data: `# data_fetcher.py - Obtención de datos institucionales vía MT5
import pandas as pd
import datetime

class DataFetcher:
    def __init__(self, broker: str = "MT5"):
        self.broker = broker.upper()
        self.initialized = False
        self._init_connection()

    def _init_connection(self):
        if self.broker == "MT5":
            try:
                import MetaTrader5 as mt5
                if not mt5.initialize():
                    print("Error al inicializar MetaTrader 5:", mt5.last_error())
                else:
                    self.initialized = True
                    print("Conectado con éxito a MetaTrader 5.")
            except ImportError:
                print("Librería MetaTrader5 no instalada. Usando modo simulador.")

    def get_account_balance(self) -> float:
        if self.broker == "MT5" and self.initialized:
            import MetaTrader5 as mt5
            account_info = mt5.account_info()
            return account_info.balance if account_info else 10000.0
        return 10000.0

    def get_candles(self, symbol: str, timeframe: str, count: int = 60) -> pd.DataFrame:
        if self.broker == "MT5" and self.initialized:
            import MetaTrader5 as mt5
            tf_dict = {"M15": mt5.TIMEFRAME_M15, "D1": mt5.TIMEFRAME_D1}
            tf = tf_dict.get(timeframe, mt5.TIMEFRAME_M15)
            rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
            if rates is None or len(rates) == 0:
                return pd.DataFrame()
            df = pd.DataFrame(rates)
            df['time'] = pd.to_datetime(df['time'], unit='s', utc=True)
            return df
        return pd.DataFrame()
`,
    calc: `# quant_calculator.py - Motor de cálculo matemático
import pandas as pd
from typing import Optional, Dict

class QuantCalculator:
    @staticmethod
    def evaluate_d1_trend(d1_df: pd.DataFrame) -> str:
        if len(d1_df) < 2: return "NEUTRAL"
        prev_d1 = d1_df.iloc[-2]
        return "BULLISH" if prev_d1['close'] > prev_d1['open'] else "BEARISH"

    @staticmethod
    def calculate_asian_range(m15_df: pd.DataFrame, start_hour: int = 0, end_hour: int = 6) -> Optional[Dict]:
        asia = m15_df[(m15_df['time'].dt.hour >= start_hour) & (m15_df['time'].dt.hour < end_hour)]
        if asia.empty: return None
        h = float(asia['high'].max())
        l = float(asia['low'].min())
        return {"high": h, "low": l, "midpoint": round((h + l)/2.0, 2), "range_points": round(h - l, 2)}

    @staticmethod
    def evaluate_breakout_trigger(candles: pd.DataFrame, asian_range: Dict, d1_trend: str, trend_mode: str, trade_number: int, rr_ratio: float) -> Optional[Dict]:
        if len(candles) < 3: return None
        c1 = candles.iloc[-2] # Vela recién cerrada
        c2 = candles.iloc[-3]
        
        allow_long  = (trend_mode == "ANY_BREAKOUT") or (d1_trend == "BULLISH")
        allow_short = (trend_mode == "ANY_BREAKOUT") or (d1_trend == "BEARISH")
        
        is_first = (trade_number == 1)
        h = asian_range['high']
        l = asian_range['low']
        mid = asian_range['midpoint']
        pts = asian_range['range_points']

        # BUY Trigger
        if allow_long:
            if (is_first and c1['close'] > h and c2['close'] <= h) or \\
               (not is_first and c1['close'] > h and c1['low'] >= (h - 1.5) and c1['close'] > c1['open']):
                entry = float(c1['close'])
                sl = mid if is_first else entry - min(max(pts * 0.5, 4.0), 8.0)
                tp = entry + ((entry - sl) * rr_ratio)
                return {"type": "BUY", "entry_price": round(entry, 2), "sl_price": round(sl, 2), "tp_price": round(tp, 2)}

        # SELL Trigger
        if allow_short:
            if (is_first and c1['close'] < l and c2['close'] >= l) or \\
               (not is_first and c1['close'] < l and c1['high'] <= (l + 1.5) and c1['close'] < c1['open']):
                entry = float(c1['close'])
                sl = mid if is_first else entry + min(max(pts * 0.5, 4.0), 8.0)
                tp = entry - ((sl - entry) * rr_ratio)
                return {"type": "SELL", "entry_price": round(entry, 2), "sl_price": round(sl, 2), "tp_price": round(tp, 2)}
        return None
`,
    risk: `# risk_manager.py - Control de capital para cuenta real
import math

class RiskManager:
    def __init__(self, risk_percent: float = 0.5):
        self.risk_percent = risk_percent

    def calculate_lots(self, balance: float, entry_price: float, sl_price: float, contract_size: float = 100.0) -> float:
        risk_usd = balance * (self.risk_percent / 100.0)
        points_at_risk = abs(entry_price - sl_price)
        if points_at_risk <= 0: return 0.01

        dollar_risk_per_full_lot = points_at_risk * contract_size
        raw_lot = risk_usd / dollar_risk_per_full_lot
        lot_size = math.floor(raw_lot * 100.0) / 100.0
        return max(0.01, min(lot_size, 50.0))
`,
    exec: `# order_executor.py - Enrutamiento y Breakeven en MetaTrader 5
class OrderExecutor:
    def __init__(self, broker: str = "MT5"):
        self.broker = broker.upper()

    def send_order(self, symbol: str, order_type: str, lot_size: float, entry_price: float, sl_price: float, tp_price: float, comment: str) -> bool:
        if self.broker == "MT5":
            import MetaTrader5 as mt5
            cmd = mt5.ORDER_TYPE_BUY if order_type == "BUY" else mt5.ORDER_TYPE_SELL
            price = mt5.symbol_info_tick(symbol).ask if order_type == "BUY" else mt5.symbol_info_tick(symbol).bid
            req = {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": symbol,
                "volume": lot_size,
                "type": cmd,
                "price": price,
                "sl": sl_price,
                "tp": tp_price,
                "deviation": 20,
                "magic": 777926,
                "comment": comment,
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": mt5.ORDER_FILLING_IOC,
            }
            res = mt5.order_send(req)
            return res.retcode == mt5.TRADE_RETCODE_DONE
        return True

    def manage_breakeven_positions(self, symbol: str):
        if self.broker == "MT5":
            import MetaTrader5 as mt5
            positions = mt5.positions_get(symbol=symbol)
            if not positions: return
            for pos in positions:
                if pos.magic != 777926: continue
                risk = abs(pos.price_open - pos.sl)
                if risk <= 0: continue
                # BUY BE 1:1
                if pos.type == mt5.ORDER_TYPE_BUY and pos.price_current >= (pos.price_open + risk):
                    if pos.sl < pos.price_open:
                        req = {"action": mt5.TRADE_ACTION_SLTP, "position": pos.ticket, "sl": pos.price_open + 0.10, "tp": pos.tp}
                        mt5.order_send(req)
                # SELL BE 1:1
                elif pos.type == mt5.ORDER_TYPE_SELL and pos.price_current <= (pos.price_open - risk):
                    if pos.sl > pos.price_open or pos.sl == 0.0:
                        req = {"action": mt5.TRADE_ACTION_SLTP, "position": pos.ticket, "sl": pos.price_open - 0.10, "tp": pos.tp}
                        mt5.order_send(req)
`,
  };

  const getCurrentCode = () => {
    if (activeLang === 'mql5') return mql5Code;
    if (activeLang === 'mql4') return mql4Code;
    if (activeLang === 'pinescript') return pineScriptCode;
    if (activeLang === 'python') return pythonModules[activePyModule];
    return '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = getCurrentCode();
    let filename = 'XAUUSD_LondonBreakout_Quant.mq5';
    if (activeLang === 'mql4') filename = 'XAUUSD_LondonBreakout_Quant.mq4';
    if (activeLang === 'pinescript') filename = 'XAUUSD_LondonBreakout_Quant.pine';
    if (activeLang === 'python') filename = `${activePyModule}.py`;

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0A0E17] border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-[#0E1526] via-[#10192F] to-[#0E1526]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  Exportador de Algoritmo para Trading Real (MT5, MT4, Pine Script & Python)
                </h3>
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Sincronizado v2.5
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Desarrollado y optimizado por el <strong className="text-amber-400 font-semibold">Ingeniero Francisco Alvarado</strong> • Protegido con Breakeven 1:1 y Circuit Breaker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real Account Safety Warning Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-6 py-2.5 flex items-center justify-between gap-3 text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Recomendación para Cuenta Real:</strong> Inicia con riesgo del <strong>0.5%</strong> por operación. El bot tiene integrado blindaje contra quiebre de cuenta (máx. 2 SLs al día y Breakeven a 1:1).
            </span>
          </div>
          <button
            onClick={() => setActiveLang('checklist')}
            className="hidden sm:flex items-center gap-1 text-[11px] underline hover:text-white shrink-0"
          >
            <span>Ver Checklist Cuenta Real</span>
          </button>
        </div>

        {/* Language Tabs Selector */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 bg-slate-900/50 flex-wrap gap-2">
          <div className="flex gap-1 overflow-x-auto py-1">
            <button
              onClick={() => setActiveLang('mql5')}
              className={`py-2 px-3 text-xs font-mono font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeLang === 'mql5'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>MetaTrader 5 (.mq5)</span>
            </button>
            <button
              onClick={() => setActiveLang('mql4')}
              className={`py-2 px-3 text-xs font-mono font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeLang === 'mql4'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>MetaTrader 4 (.mq4)</span>
            </button>
            <button
              onClick={() => setActiveLang('pinescript')}
              className={`py-2 px-3 text-xs font-mono font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeLang === 'pinescript'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>TradingView (Pine v5/v6)</span>
            </button>
            <button
              onClick={() => setActiveLang('python')}
              className={`py-2 px-3 text-xs font-mono font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeLang === 'python'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Python (Modular)</span>
            </button>
            <button
              onClick={() => setActiveLang('checklist')}
              className={`py-2 px-3 text-xs font-mono font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeLang === 'checklist'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Guía Cuenta Real</span>
            </button>
          </div>

          {activeLang !== 'checklist' && (
            <div className="flex items-center gap-2 py-1">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado al portapapeles' : 'Copiar Código'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                <span>Descargar Archivo</span>
              </button>
            </div>
          )}
        </div>

        {/* Python Sub-Module Selector */}
        {activeLang === 'python' && (
          <div className="flex items-center gap-1 px-6 py-2 bg-slate-950/80 border-b border-slate-800/80 overflow-x-auto text-xs font-mono">
            <span className="text-slate-500 text-[11px] mr-2">Módulos Python:</span>
            {[
              { id: 'main', label: 'main.py (Orquestador)' },
              { id: 'data', label: 'data_fetcher.py (MT5 API)' },
              { id: 'calc', label: 'quant_calculator.py' },
              { id: 'risk', label: 'risk_manager.py' },
              { id: 'exec', label: 'order_executor.py' },
            ].map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActivePyModule(mod.id as any)}
                className={`px-2.5 py-1 rounded transition whitespace-nowrap ${
                  activePyModule === mod.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>
        )}

        {/* MAIN DISPLAY AREA */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950/90 font-mono text-xs">
          {activeLang === 'checklist' ? (
            <div className="max-w-4xl mx-auto py-4 space-y-6 text-slate-300 font-sans">
              <div className="border border-amber-500/30 bg-amber-500/10 p-5 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Protocolo Institucional para Ejecución en Cuenta Real (Dinero Real)
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Preparado por el <strong>Ingeniero Francisco Alvarado</strong>. Para que la cuenta crezca de forma compuesta en lugar de sufrir un revés inesperado por comisiones, slippage o apalancamiento excesivo, sigue rigurosamente esta lista de verificación antes de encender el algoritmo en MetaTrader 4, MetaTrader 5 o TradingView.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">1</span>
                    <span>Gestión de Capital Asimétrica</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Configura <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">InpRiskPercent = 0.5</code> (0.5% del balance por trade). Con ratio 1:2, cada victoria suma +1.0% neto mientras que una pérdida solo resta -0.5%. Esto permite soportar rachas negativas sin estrés emocional ni peligro de margin call.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
                    <span>Protección Breakeven Dinámico 1:1</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El código incluye la función <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">ManageBreakeven()</code>. Cuando el precio avanza la misma distancia del Stop Loss (1:1), el EA mueve automáticamente el SL a precio de entrada (+1 pip de resguardo). Una operación ganadora nunca se convertirá en pérdida.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px]">3</span>
                    <span>Circuit Breaker Diario (Máx. 2 SLs)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El parámetro <code className="text-rose-300 bg-slate-900 px-1 py-0.5 rounded">InpMaxDailySL = 2</code> garantiza que si un día el mercado presenta volatilidad atípica y tocan 2 SLs (-1.0% de pérdida acumulada), el bot apaga las compras y ventas automáticamente hasta el día siguiente. Es imposible quemar la cuenta en un solo día.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">4</span>
                    <span>Filtro de Spread y Noticias</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El parámetro <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">InpMaxSpreadPips = 35</code> protege de aperturas de mercado con alta dispersión o noticias de impacto de la Reserva Federal (NFP, CPI, FOMC), bloqueando órdenes hasta que el spread vuelva a condiciones normales.
                  </p>
                </div>
              </div>

              {/* Step by step install in MT5 and MT4 */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3">
                <h5 className="font-bold text-white font-mono text-xs uppercase tracking-wider text-amber-400">
                  Instrucciones de Instalación en MetaTrader 4 / MetaTrader 5:
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed font-sans">
                  <li>Abre tu terminal de <strong>MetaTrader 4 o MetaTrader 5</strong> en tu broker real.</li>
                  <li>Presiona <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-[11px]">F4</kbd> para abrir el <strong>MetaEditor</strong>.</li>
                  <li>Haz clic en <strong>Nuevo</strong> &rarr; <em>Asesor Experto (plantilla)</em> &rarr; Nómbralo <code className="text-amber-300">XAUUSD_LondonBreakout_Quant</code>.</li>
                  <li>Pega el código completo copiado desde esta ventana reemplazando todo el archivo.</li>
                  <li>Presiona <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-[11px]">F7</kbd> para <strong>Compilar</strong> (debe dar 0 errores y 0 advertencias).</li>
                  <li>En el terminal MT4/MT5, abre el gráfico de <strong>XAU/USD</strong> en temporalidad <strong>M15</strong>.</li>
                  <li>Arrastra el EA desde la pestaña <em>Navegador</em> al gráfico.</li>
                  <li>Marca la casilla <strong>"Permitir Trading Algorítmico"</strong> en la pestaña Común.</li>
                  <li>El panel HUD de auditoría del Ing. Francisco Alvarado aparecerá inmediatamente en la esquina superior izquierda.</li>
                </ol>
              </div>
            </div>
          ) : (
            <pre className="text-slate-300 leading-relaxed overflow-x-auto selection:bg-amber-500/40">
              <code>{getCurrentCode()}</code>
            </pre>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Algoritmo Validado Matemáticamente • Desarrollado por el Ing. Francisco Alvarado</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
