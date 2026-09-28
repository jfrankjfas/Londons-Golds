/**
 * Algoritmo Cuantitativo Institucional: New York ORB (Opening Range Breakout) para XAU/USD
 * Desarrollado por el Ingeniero Francisco Alvarado
 * 
 * Basado en la apertura de Wall Street y futuros COMEX (13:30 UTC / 09:30 AM EST).
 * Captura la expansión direccional institucional post-campana de Nueva York.
 */

export const mql5CodeNyOrb = `//+------------------------------------------------------------------+
//|                                     XAUUSD_NY_ORB_Oficial.mq5    |
//|  Algoritmo Cuantitativo Institucional NY ORB (Opening Range Breakout)
//|       Desarrollado por el Ingeniero Francisco Alvarado           |
//|    Estrategia de Apertura de Nueva York (13:30 - 16:30 UTC)      |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "1.00"
#property description "Robot Institucional New York Opening Range Breakout (ORB) para XAU/USD. Define el rango de apertura inicial de 15 min (13:30 - 13:45 UTC) tras la campana de Wall Street y opera la ruptura institucional con Stop Loss al 50% del ORB, Target R:R 1:2 y Breakeven a 1:1."
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Parametros de Entrada
input group "=== 1. Gestion de Riesgo y Capital ==="
input ulong             InpMagicNumber            = 999333;       // Magic Number Unico (NY ORB)
input double            InpRiskPercent            = 1.5;          // Riesgo por Trade (% Balance: 1.0% a 1.5%)
input double            InpRRRatio                = 2.0;          // Target Ratio Riesgo / Beneficio (1:2)
input int               InpMaxDailySL             = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
input int               InpMaxDailyTrades         = 2;            // Maximo de Operaciones Diarias

input group "=== 2. Horarios Sesion Nueva York (UTC) ==="
input int               InpBrokerGmtOffset        = 3;            // GMT Offset del Broker (+3 verano, +2 invierno, 0 UTC)
input int               InpStartNYHour            = 13;           // Hora Apertura NY (UTC, 13:00)
input int               InpStartNYMinute          = 30;           // Minuto Apertura NY (30 -> 13:30 UTC / 09:30 EST)
input int               InpEndOrbMinute           = 45;           // Minuto Fin Rango ORB (45 -> 13:45 UTC, vela de 15m)
input int               InpEndTradeHour           = 16;           // Hora Fin Ventana Operativa (UTC, 16:00)
input int               InpEndTradeMinute         = 30;           // Minuto Fin Ventana Operativa (30 -> 16:30 UTC)
input bool              InpCloseEndOfDay          = true;         // Cerrar posiciones al final de NY (20:30 UTC)

input group "=== 3. Filtros del Rango de Apertura (ORB) ==="
input double            InpMinOrbRange            = 3.0;          // Rango Minimo ORB en USD ($3.0 - Evita consolidacion nula)
input double            InpMaxOrbRange            = 15.0;         // Rango Maximo ORB en USD ($15.0 - Filtro Anti-Sobreextension)
input int               InpMaxSpreadPoints        = 0;            // Spread Maximo (0 = Desactivado en Tester, 35 en Real)
input int               InpSlippage               = 50;           // Desviacion Maxima en Puntos ($0.50)

input group "=== 4. Blindaje y Proteccion Breakeven ==="
input bool              InpEnableBreakeven        = true;         // Activar Proteccion Breakeven a 1:1 R
input double            InpBEBufferPoints         = 0.20;         // Colchon de Entrada ($0.20 Oro: cubre comisiones)

//--- Variables Globales de Estado
datetime g_lastEvaluatedBarTime = 0;
string   g_lastTradeDate        = "";
int      g_dailyTradesCount     = 0;
int      g_dailySLCount         = 0;

void SetOptimalFillingMode()
{
   uint filling = (uint)SymbolInfoInteger(_Symbol, SYMBOL_FILLING_MODE);
   if((filling & SYMBOL_FILLING_FOK) != 0) trade.SetTypeFilling(ORDER_FILLING_FOK);
   else if((filling & SYMBOL_FILLING_IOC) != 0) trade.SetTypeFilling(ORDER_FILLING_IOC);
   else trade.SetTypeFilling(ORDER_FILLING_RETURN);
}

void UpdateDailyStats()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   dt.hour = 0; dt.min = 0; dt.sec = 0;
   datetime todayStart = StructToTime(dt);
   
   if(!HistorySelect(todayStart, TimeCurrent())) return;
   int deals = HistoryDealsTotal();
   int trades = 0, sls = 0;
   
   for(int i = 0; i < deals; i++)
   {
      ulong t = HistoryDealGetTicket(i);
      if(t == 0 || HistoryDealGetString(t, DEAL_SYMBOL) != _Symbol || HistoryDealGetInteger(t, DEAL_MAGIC) != InpMagicNumber) continue;
      long entry = HistoryDealGetInteger(t, DEAL_ENTRY);
      if(entry == DEAL_ENTRY_IN) trades++;
      else if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      {
         double profit = HistoryDealGetDouble(t, DEAL_PROFIT);
         double swap   = HistoryDealGetDouble(t, DEAL_SWAP);
         double comm   = HistoryDealGetDouble(t, DEAL_COMMISSION);
         if((profit + swap + comm) < -0.01) sls++;
      }
   }
   if(trades > g_dailyTradesCount) g_dailyTradesCount = trades;
   if(sls > g_dailySLCount) g_dailySLCount = sls;
}

int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);
   SetOptimalFillingMode();
   UpdateDailyStats();
   Print("================================================================================");
   Print("  EA INICIADO: XAU/USD New York ORB (Opening Range Breakout Oficial)");
   PrintFormat("  Configuracion: Apertura NY %02d:%02d UTC | Rango ORB: 15 min | Target R:R=1:%.1f | BE=%s",
               InpStartNYHour, InpStartNYMinute, InpRRRatio, InpEnableBreakeven ? "ACTIVO 1:1" : "DESACTIVADO");
   Print("================================================================================");
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) { Comment(""); }

//+------------------------------------------------------------------+
//| Obtener Rango de Apertura de Nueva York (Vela 13:30 a 13:45 UTC) |
//+------------------------------------------------------------------+
bool GetNYOpeningRange(double &outHigh, double &outLow, double &outMid, double &outRange)
{
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, PERIOD_M15, 0, 50, rates);
   if(copied < 10) return false;
   
   datetime curUtc = TimeCurrent() - (InpBrokerGmtOffset * 3600);
   MqlDateTime curDt;
   TimeToStruct(curUtc, curDt);
   
   bool found = false;
   for(int i = 0; i < copied; i++)
   {
      datetime bUtc = rates[i].time - (InpBrokerGmtOffset * 3600);
      MqlDateTime bDt;
      TimeToStruct(bUtc, bDt);
      if(bDt.day != curDt.day) break;
      
      // La vela de apertura de NY es exactamente a las 13:30 UTC
      if(bDt.hour == InpStartNYHour && bDt.min == InpStartNYMinute)
      {
         outHigh  = NormalizeDouble(rates[i].high, _Digits);
         outLow   = NormalizeDouble(rates[i].low, _Digits);
         outMid   = NormalizeDouble((outHigh + outLow) / 2.0, _Digits);
         outRange = NormalizeDouble(outHigh - outLow, _Digits);
         found = true;
         break;
      }
   }
   return found;
}

double CalculateLotSize(double entryPrice, double slPrice, ENUM_ORDER_TYPE orderType)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) balance = 10000.0;
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double stopLossDist = MathAbs(entryPrice - slPrice);
   if(stopLossDist <= 0.1) stopLossDist = 5.0;
   
   double lossForOneLot = 0.0;
   if(OrderCalcProfit(orderType, _Symbol, 1.0, entryPrice, slPrice, lossForOneLot))
      lossForOneLot = MathAbs(lossForOneLot);
   if(lossForOneLot <= 0.0)
   {
      double cs = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
      if(cs <= 0) cs = 100.0;
      lossForOneLot = stopLossDist * cs;
   }
   double calcLots = (lossForOneLot > 0) ? (riskMoney / lossForOneLot) : 0.01;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minL = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxL = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(step <= 0) step = 0.01;
   calcLots = MathFloor(calcLots / step) * step;
   return NormalizeDouble(MathMax(minL, MathMin(calcLots, maxL)), 2);
}

void ManageBreakeven()
{
   long freezeLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_FREEZE_LEVEL);
   long stopLevel   = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minSafetyDist = MathMax(freezeLevel, stopLevel) * _Point;
   if(minSafetyDist < (5 * _Point)) minSafetyDist = 5 * _Point;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || PositionGetString(POSITION_SYMBOL) != _Symbol || PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
      
      long type = PositionGetInteger(POSITION_TYPE);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double slPrice   = PositionGetDouble(POSITION_SL);
      double tpPrice   = PositionGetDouble(POSITION_TP);
      double curBid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double curAsk    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double riskDist  = MathAbs(openPrice - slPrice);
      if(riskDist <= 0.1) continue;
      
      if(type == POSITION_TYPE_BUY)
      {
         if(curBid >= (openPrice + riskDist))
         {
            double beLevel = NormalizeDouble(openPrice + InpBEBufferPoints, _Digits);
            if(slPrice < openPrice && (curBid - beLevel) >= minSafetyDist)
            {
               SetOptimalFillingMode();
               trade.PositionModify(ticket, beLevel, tpPrice);
            }
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         if(curAsk <= (openPrice - riskDist))
         {
            double beLevel = NormalizeDouble(openPrice - InpBEBufferPoints, _Digits);
            if((slPrice > openPrice || slPrice == 0.0) && (beLevel - curAsk) >= minSafetyDist)
            {
               SetOptimalFillingMode();
               trade.PositionModify(ticket, beLevel, tpPrice);
            }
         }
      }
   }
}

void OnTick()
{
   datetime nowServer = TimeCurrent();
   datetime nowUtc    = nowServer - (InpBrokerGmtOffset * 3600);
   MqlDateTime utcDt;
   TimeToStruct(nowUtc, utcDt);
   string todayDateStr = StringFormat("%04d-%02d-%02d", utcDt.year, utcDt.mon, utcDt.day);
   
   if(g_lastTradeDate != todayDateStr)
   {
      g_lastTradeDate = todayDateStr;
      g_dailyTradesCount = 0;
      g_dailySLCount = 0;
   }
   
   UpdateDailyStats();
   if(InpEnableBreakeven) ManageBreakeven();
   
   if(g_dailySLCount >= InpMaxDailySL || g_dailyTradesCount >= InpMaxDailyTrades) return;
   
   // Cierre intradia a las 20:30 UTC
   if(InpCloseEndOfDay && utcDt.hour >= 20 && utcDt.min >= 30)
   {
      for(int p = PositionsTotal() - 1; p >= 0; p--)
      {
         ulong ticket = PositionGetTicket(p);
         if(ticket > 0 && PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
            trade.PositionClose(ticket);
      }
      return;
   }
   
   int minsOfDay = utcDt.hour * 60 + utcDt.min;
   int startOrbMins = InpStartNYHour * 60 + InpStartNYMinute;       // 13:30 UTC (810 min)
   int endOrbMins   = InpStartNYHour * 60 + InpEndOrbMinute;         // 13:45 UTC (825 min)
   int endTradeMins = InpEndTradeHour * 60 + InpEndTradeMinute;     // 16:30 UTC (990 min)
   
   // La ventana operativa inicia justo despues de que cierra la vela de apertura ORB (13:45)
   bool isTradingWindow = (minsOfDay >= endOrbMins && minsOfDay <= endTradeMins);
   if(!isTradingWindow) return;
   
   datetime currentBarTime = iTime(_Symbol, PERIOD_M15, 0);
   if(currentBarTime == g_lastEvaluatedBarTime) return;
   
   double orbHigh = 0, orbLow = 0, orbMid = 0, orbRange = 0;
   if(!GetNYOpeningRange(orbHigh, orbLow, orbMid, orbRange)) return;
   
   // Filtro de sobreextension del rango de apertura
   if((InpMinOrbRange > 0 && orbRange < InpMinOrbRange) || (InpMaxOrbRange > 0 && orbRange > InpMaxOrbRange))
   {
      g_lastEvaluatedBarTime = currentBarTime;
      return;
   }
   
   // Verificar si ya hay posiciones abiertas por este bot
   int botPositions = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetTicket(i) > 0 && PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         botPositions++;
   }
   if(botPositions > 0) return;
   
   MqlRates m15[];
   ArraySetAsSeries(m15, true);
   if(CopyRates(_Symbol, PERIOD_M15, 1, 3, m15) < 2) return;
   
   double c1 = m15[0].close;
   double c2 = m15[1].close;
   double o1 = m15[0].open;
   
   // Ruptura alcista del rango de apertura de NY
   bool buyBreakout = (c1 > orbHigh && c2 <= orbHigh && c1 > o1);
   // Ruptura bajista del rango de apertura de NY
   bool sellBreakout = (c1 < orbLow && c2 >= orbLow && c1 < o1);
   
   if(buyBreakout)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl = NormalizeDouble(orbMid, _Digits);
      double riskDist = entry - sl;
      if(riskDist <= 0.5) riskDist = 5.0;
      double tp = NormalizeDouble(entry + (riskDist * InpRRRatio), _Digits);
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_BUY);
      
      SetOptimalFillingMode();
      if(trade.Buy(lots, _Symbol, entry, sl, tp, "NY ORB Buy XAU"))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         PrintFormat("🚀 [NY ORB BUY EJECUTADO] Entrada=%.2f | SL=%.2f | TP=%.2f | Lotes=%.2f (R:R 1:%.1f)",
                     entry, sl, tp, lots, InpRRRatio);
      }
   }
   else if(sellBreakout)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl = NormalizeDouble(orbMid, _Digits);
      double riskDist = sl - entry;
      if(riskDist <= 0.5) riskDist = 5.0;
      double tp = NormalizeDouble(entry - (riskDist * InpRRRatio), _Digits);
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_SELL);
      
      SetOptimalFillingMode();
      if(trade.Sell(lots, _Symbol, entry, sl, tp, "NY ORB Sell XAU"))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         PrintFormat("🚀 [NY ORB SELL EJECUTADO] Entrada=%.2f | SL=%.2f | TP=%.2f | Lotes=%.2f (R:R 1:%.1f)",
                     entry, sl, tp, lots, InpRRRatio);
      }
   }
   else
   {
      g_lastEvaluatedBarTime = currentBarTime;
   }
}
`;

export const mql4CodeNyOrb = `//+------------------------------------------------------------------+
//|                                     XAUUSD_NY_ORB_Oficial.mq4    |
//|  Algoritmo Cuantitativo Institucional NY ORB para MetaTrader 4   |
//|       Desarrollado por el Ingeniero Francisco Alvarado           |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "1.00"
#property strict

extern string sep0                   = "=== 1. Gestion de Riesgo ===";
extern int    InpMagicNumber         = 999333;
extern double InpRiskPercent         = 1.5;
extern double InpRRRatio             = 2.0;
extern int    InpMaxDailySL          = 2;
extern int    InpMaxDailyTrades      = 2;

extern string sep1                   = "=== 2. Horarios NY (UTC) ===";
extern int    InpBrokerGmtOffset     = 3;
extern int    InpStartNYHour         = 13;
extern int    InpStartNYMinute       = 30;
extern int    InpEndTradeHour        = 16;
extern int    InpEndTradeMinute      = 30;

extern string sep2                   = "=== 3. Filtros ORB ===";
extern double InpMinOrbRange         = 3.0;
extern double InpMaxOrbRange         = 15.0;
extern int    InpSlippage            = 50;

extern string sep3                   = "=== 4. Breakeven 1:1 ===";
extern bool   InpEnableBreakeven     = true;
extern double InpBEBufferPoints      = 0.20;

datetime g_lastBarTime = 0;
string   g_lastDate    = "";
int      g_dailyTrades = 0;
int      g_dailySL     = 0;

void UpdateDailyStatsMT4()
{
   int trades = 0, sls = 0;
   datetime todayStart = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE) + " 00:00");
   int hist = OrdersHistoryTotal();
   for(int i = 0; i < hist; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      if(OrderCloseTime() >= todayStart)
      {
         trades++;
         double net = OrderProfit() + OrderSwap() + OrderCommission();
         if(net < -0.01) sls++;
      }
   }
   if(trades > g_dailyTrades) g_dailyTrades = trades;
   if(sls > g_dailySL) g_dailySL = sls;
}

int OnInit()
{
   UpdateDailyStatsMT4();
   PrintFormat("EA NY ORB MT4 Iniciado: Magic=%d | R:R=1:%.1f | Riesgo=%.1f%%", InpMagicNumber, InpRRRatio, InpRiskPercent);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) { Comment(""); }

bool GetNYOpeningRangeMT4(double &outHigh, double &outLow, double &outMid, double &outRange)
{
   datetime nowUtc = TimeCurrent() - (InpBrokerGmtOffset * 3600);
   string curDay = TimeToStr(nowUtc, TIME_DATE);
   for(int i = 0; i < 50; i++)
   {
      datetime bTime = iTime(Symbol(), PERIOD_M15, i);
      datetime bUtc  = bTime - (InpBrokerGmtOffset * 3600);
      if(TimeToStr(bUtc, TIME_DATE) != curDay) break;
      if(TimeHour(bUtc) == InpStartNYHour && TimeMinute(bUtc) == InpStartNYMinute)
      {
         outHigh  = NormalizeDouble(iHigh(Symbol(), PERIOD_M15, i), Digits);
         outLow   = NormalizeDouble(iLow(Symbol(), PERIOD_M15, i), Digits);
         outMid   = NormalizeDouble((outHigh + outLow) / 2.0, Digits);
         outRange = NormalizeDouble(outHigh - outLow, Digits);
         return true;
      }
   }
   return false;
}

double CalculateLotsMT4(double entryPrice, double slPrice)
{
   double balance = AccountBalance();
   if(balance <= 0) balance = 10000.0;
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double dist = MathAbs(entryPrice - slPrice);
   if(dist <= 0.1) dist = 5.0;
   double cs = MarketInfo(Symbol(), MODE_LOTSIZE);
   if(cs <= 0) cs = 100.0;
   double lossFor1Lot = dist * cs;
   double calcLots = (lossFor1Lot > 0) ? (riskMoney / lossFor1Lot) : 0.01;
   double step = MarketInfo(Symbol(), MODE_LOTSTEP);
   double minL = MarketInfo(Symbol(), MODE_MINLOT);
   double maxL = MarketInfo(Symbol(), MODE_MAXLOT);
   if(step <= 0) step = 0.01;
   calcLots = MathFloor(calcLots / step) * step;
   return NormalizeDouble(MathMax(minL, MathMin(calcLots, maxL)), 2);
}

void ManageBreakevenMT4()
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      int type = OrderType();
      double open = OrderOpenPrice();
      double sl   = OrderStopLoss();
      double tp   = OrderTakeProfit();
      double risk = MathAbs(open - sl);
      if(risk <= 0.1) continue;
      if(type == OP_BUY && Bid >= (open + risk) && sl < open)
      {
         OrderModify(OrderTicket(), open, NormalizeDouble(open + InpBEBufferPoints, Digits), tp, 0, clrCyan);
      }
      else if(type == OP_SELL && Ask <= (open - risk) && (sl > open || sl == 0.0))
      {
         OrderModify(OrderTicket(), open, NormalizeDouble(open - InpBEBufferPoints, Digits), tp, 0, clrCyan);
      }
   }
}

void OnTick()
{
   datetime now = TimeCurrent();
   datetime utc = now - (InpBrokerGmtOffset * 3600);
   string today = TimeToStr(utc, TIME_DATE);
   if(g_lastDate != today)
   {
      g_lastDate = today;
      g_dailyTrades = 0;
      g_dailySL = 0;
   }
   UpdateDailyStatsMT4();
   if(InpEnableBreakeven) ManageBreakevenMT4();
   if(g_dailySL >= InpMaxDailySL || g_dailyTrades >= InpMaxDailyTrades) return;
   
   int mins = TimeHour(utc) * 60 + TimeMinute(utc);
   int endOrb = InpStartNYHour * 60 + 45;
   int endTrade = InpEndTradeHour * 60 + InpEndTradeMinute;
   if(mins < endOrb || mins > endTrade) return;
   
   datetime barTime = iTime(Symbol(), PERIOD_M15, 0);
   if(barTime == g_lastBarTime) return;
   
   double orbH = 0, orbL = 0, orbM = 0, orbR = 0;
   if(!GetNYOpeningRangeMT4(orbH, orbL, orbM, orbR)) return;
   if((InpMinOrbRange > 0 && orbR < InpMinOrbRange) || (InpMaxOrbRange > 0 && orbR > InpMaxOrbRange))
   {
      g_lastBarTime = barTime;
      return;
   }
   
   int botOrders = 0;
   for(int o = 0; o < OrdersTotal(); o++)
   {
      if(OrderSelect(o, SELECT_BY_POS, MODE_TRADES) && OrderSymbol() == Symbol() && OrderMagicNumber() == InpMagicNumber)
         botOrders++;
   }
   if(botOrders > 0) return;
   
   double c1 = iClose(Symbol(), PERIOD_M15, 1);
   double c2 = iClose(Symbol(), PERIOD_M15, 2);
   double o1 = iOpen(Symbol(), PERIOD_M15, 1);
   
   bool buy  = (c1 > orbH && c2 <= orbH && c1 > o1);
   bool sell = (c1 < orbL && c2 >= orbL && c1 < o1);
   
   if(buy)
   {
      double entry = Ask;
      double sl = NormalizeDouble(orbM, Digits);
      double dist = entry - sl;
      if(dist <= 0.5) dist = 5.0;
      double tp = NormalizeDouble(entry + (dist * InpRRRatio), Digits);
      double lots = CalculateLotsMT4(entry, sl);
      int ticket = OrderSend(Symbol(), OP_BUY, lots, entry, InpSlippage, sl, tp, "NY ORB Buy", InpMagicNumber, 0, clrGreen);
      if(ticket > 0) { g_dailyTrades++; g_lastBarTime = barTime; }
   }
   else if(sell)
   {
      double entry = Bid;
      double sl = NormalizeDouble(orbM, Digits);
      double dist = sl - entry;
      if(dist <= 0.5) dist = 5.0;
      double tp = NormalizeDouble(entry - (dist * InpRRRatio), Digits);
      double lots = CalculateLotsMT4(entry, sl);
      int ticket = OrderSend(Symbol(), OP_SELL, lots, entry, InpSlippage, sl, tp, "NY ORB Sell", InpMagicNumber, 0, clrRed);
      if(ticket > 0) { g_dailyTrades++; g_lastBarTime = barTime; }
   }
   else
   {
      g_lastBarTime = barTime;
   }
}
`;

export const pineScriptCodeNyOrb = `//@version=5
strategy("XAU/USD New York ORB Strategy [Ing. Francisco Alvarado]", 
         shorttitle="NY_ORB_Gold", 
         overlay=true, 
         initial_capital=10000, 
         default_qty_type=strategy.percent_of_equity, 
         default_qty_value=1.5, 
         commission_type=strategy.commission.cash_per_contract, 
         commission_value=0.07, 
         slippage=5)

// 1. PARAMETROS DE GESTION
grp_risk = "=== Gestion de Riesgo NY ORB ==="
rrRatio         = input.float(2.0, "Target Ratio R:R (1:2)", minval=1.0, maxval=4.0, step=0.1, group=grp_risk)
riskPerTrade    = input.float(1.5, "Riesgo por Operacion (%)", minval=0.1, maxval=3.0, step=0.1, group=grp_risk)
enableBreakeven = input.bool(true, "Activar Breakeven en 1:1", group=grp_risk)

grp_ses = "=== Sesion de Apertura Nueva York (UTC) ==="
orbSessionInput   = input.session("1330-1345:23456", "Vela ORB de Apertura (13:30 - 13:45 UTC)", group=grp_ses)
tradeSessionInput = input.session("1345-1630:23456", "Ventana Operativa NY (13:45 - 16:30 UTC)", group=grp_ses)

grp_filt = "=== Filtros ORB ==="
minOrbRange = input.float(3.0, "Rango Minimo ORB ($)", minval=0.0, group=grp_filt)
maxOrbRange = input.float(15.0, "Rango Maximo ORB ($)", minval=0.0, group=grp_filt)

// 2. DETECCION DE APERTURA ORB
isOrbCandle    = not na(time(timeframe.period, orbSessionInput, "UTC"))
isTradeSession = not na(time(timeframe.period, tradeSessionInput, "UTC"))

var float orbHigh = na
var float orbLow  = na
var box   orbBox  = na

if isOrbCandle
    if not isOrbCandle[1]
        orbHigh := high
        orbLow  := low
    else
        orbHigh := math.max(orbHigh, high)
        orbLow  := math.min(orbLow, low)

if not isOrbCandle and isOrbCandle[1]
    float rangePts = orbHigh - orbLow
    orbBox := box.new(left=bar_index - 1, top=orbHigh, right=bar_index + 12, bottom=orbLow, 
                       border_color=color.blue, bgcolor=color.new(color.blue, 88), 
                       text="NY ORB (15m): " + str.tostring(rangePts, "#.##") + " USD", 
                       text_color=color.white, text_size=size.small)

float orbMid = (orbHigh + orbLow) / 2.0
float orbRange = orbHigh - orbLow

plot(orbHigh, "ORB High", color=color.new(color.blue, 30), linewidth=1, style=plot.style_linebr)
plot(orbLow,  "ORB Low",  color=color.new(color.blue, 30), linewidth=1, style=plot.style_linebr)
plot(orbMid,  "ORB Mid (SL)", color=color.new(color.orange, 40), linewidth=1, style=plot.style_linebr)

// 3. SENALES DE RUPTURA
var int dailyTrades = 0
if dayofmonth != dayofmonth[1]
    dailyTrades := 0

bool validOrb = (minOrbRange <= 0 or orbRange >= minOrbRange) and (maxOrbRange <= 0 or orbRange <= maxOrbRange)
bool canTrade = isTradeSession and (dailyTrades < 2) and validOrb

bool buySignal  = canTrade and (close > orbHigh and close[1] <= orbHigh and close > open)
bool sellSignal = canTrade and (close < orbLow and close[1] >= orbLow and close < open)

var float entryPrice = na
var float slPrice    = na
var float tpPrice    = na
var bool  beActive   = false

if buySignal and strategy.position_size == 0
    entryPrice := close
    slPrice    := orbMid
    float risk = entryPrice - slPrice
    tpPrice    := entryPrice + (risk * rrRatio)
    beActive   := false
    dailyTrades += 1
    strategy.entry("NY_ORB_Long", strategy.long, comment="ORB Long")

if sellSignal and strategy.position_size == 0
    entryPrice := close
    slPrice    := orbMid
    float risk = slPrice - entryPrice
    tpPrice    := entryPrice - (risk * rrRatio)
    beActive   := false
    dailyTrades += 1
    strategy.entry("NY_ORB_Short", strategy.short, comment="ORB Short")

// Breakeven en 1:1
if strategy.position_size > 0 and enableBreakeven and not beActive
    if high >= (entryPrice + (entryPrice - slPrice))
        slPrice := entryPrice + 0.20
        beActive := true

if strategy.position_size < 0 and enableBreakeven and not beActive
    if low <= (entryPrice - (slPrice - entryPrice))
        slPrice := entryPrice - 0.20
        beActive := true

if strategy.position_size > 0
    strategy.exit("Exit_Long", "NY_ORB_Long", stop=slPrice, limit=tpPrice)

if strategy.position_size < 0
    strategy.exit("Exit_Short", "NY_ORB_Short", stop=slPrice, limit=tpPrice)
`;

export const pythonCodeNyOrb = `# ny_orb_gold.py - New York Opening Range Breakout (ORB) para XAU/USD
"""
Robot Cuantitativo Institucional NY ORB
Desarrollado por el Ingeniero Francisco Alvarado

Apertura de Wall Street / COMEX (13:30 - 13:45 UTC).
"""
import time
import math
from datetime import datetime, timezone
import MetaTrader5 as mt5
import pandas as pd

MAGIC_NUMBER = 999333
SYMBOL = "XAUUSD"
RISK_PERCENT = 1.5
RR_RATIO = 2.0
BROKER_OFFSET_HOURS = 3

class NyOrbBot:
    def __init__(self):
        if not mt5.initialize():
            raise RuntimeError("No se pudo inicializar MetaTrader 5")
        mt5.symbol_select(SYMBOL, True)
        self.daily_trades = 0
        self.last_trade_date = ""

    def get_ny_orb_range(self):
        rates = mt5.copy_rates_from_pos(SYMBOL, mt5.TIMEFRAME_M15, 0, 40)
        if rates is None or len(rates) == 0:
            return None
        df = pd.DataFrame(rates)
        df['utc_time'] = pd.to_datetime(df['time'], unit='s') - pd.Timedelta(hours=BROKER_OFFSET_HOURS)
        today = datetime.now(timezone.utc).date()
        today_df = df[df['utc_time'].dt.date == today]
        # Vela M15 de 13:30 UTC
        orb_candle = today_df[(today_df['utc_time'].dt.hour == 13) & (today_df['utc_time'].dt.minute == 30)]
        if len(orb_candle) == 0:
            return None
        row = orb_candle.iloc[0]
        h = float(row['high'])
        l = float(row['low'])
        return {"high": h, "low": l, "mid": (h + l) / 2.0, "range": h - l}

    def run(self):
        print("🚀 Iniciando Bot Cuantitativo NY ORB (13:30 UTC)")
        while True:
            try:
                utc = datetime.now(timezone.utc)
                mins = utc.hour * 60 + utc.minute
                # Ventana 13:45 a 16:30 UTC
                if not ((13 * 60 + 45) <= mins <= (16 * 60 + 30)):
                    time.sleep(15)
                    continue

                orb = self.get_ny_orb_range()
                if not orb or orb['range'] < 3.0 or orb['range'] > 15.0:
                    time.sleep(15)
                    continue

                open_pos = mt5.positions_get(symbol=SYMBOL)
                bot_pos = [p for p in open_pos if p.magic == MAGIC_NUMBER] if open_pos else []
                if len(bot_pos) > 0:
                    time.sleep(10)
                    continue

                rates = mt5.copy_rates_from_pos(SYMBOL, mt5.TIMEFRAME_M15, 1, 2)
                if rates is None or len(rates) < 1:
                    time.sleep(5)
                    continue

                c1 = rates[-1]
                if c1['close'] > orb['high'] and c1['close'] > c1['open']:
                    print(f"🔥 RUPTURA NY ORB ALCISTA (BUY) por encima de {orb['high']}")
                elif c1['close'] < orb['low'] and c1['close'] < c1['open']:
                    print(f"🔥 RUPTURA NY ORB BAJISTA (SELL) por debajo de {orb['low']}")

                time.sleep(10)
            except Exception as e:
                print(f"Error en ejecucion: {e}")
                time.sleep(15)

if __name__ == "__main__":
    NyOrbBot().run()
`;
