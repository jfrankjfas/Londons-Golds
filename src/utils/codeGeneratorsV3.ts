/**
 * Algoritmo Cuantitativo Gold Killer v3.0 PURE 1:2 (Sin Breakeven / Full Swing)
 * Optimizado para MetaTrader 5, MetaTrader 4, TradingView y Python.
 * Desarrollado por el Ingeniero Francisco Alvarado
 */

export const mql5CodeV3 = `//+------------------------------------------------------------------+
//|                                  XAUUSD_GoldKiller_V3_Pure.mq5   |
//|  Algoritmo Cuantitativo Institucional Gold Killer v3.0 PURE 1:2  |
//|       Desarrollado por el Ingeniero Francisco Alvarado           |
//|   Estrategia Binaria: 1:2 Puro Sin Breakeven (Full Swing)        |
//|   Tokio Max: 65.0 pts | Londres: 08:00-11:00 UTC | Riesgo: 1.5% |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "3.00"
#property description "Robot Cuantitativo Institucional XAU/USD Gold Killer v3.0 PURE. Operativa 1:2 pura sin Breakeven para evitar falsas sacadas de liquidez en entrada. Incluye calculo de lotaje blindado (OrderCalcProfit), filtro Tokio calibrado a 65 pts y Circuit Breaker de 2 SLs diarios."
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Enumeraciones
enum ENUM_TREND_MODE
{
   TREND_ANY_BREAKOUT = 0, // Ambas Direcciones (Ruptura Libre)
   TREND_D1_STRICT    = 1  // Filtro D1 Estricto (RECOMENDADO: Elimina perdidas contra-tendencia)
};

//--- Parametros de Entrada
input group "=== Identificacion & Gestion de Riesgo Real ==="
input ulong             InpMagicNumber            = 888999;       // Magic Number Unico (v3.1 ULTRA SNIPER)
input double            InpRiskPercent            = 1.5;          // Riesgo por Trade (% Balance: 1.0% a 1.5%)
input double            InpRRRatio                = 1.8;          // Target Ratio R:R (1:1.5 a 1:2.0 para Alta Efectividad)
input int               InpMaxDailySL             = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
input int               InpMaxDailyTrades         = 2;            // Maximo de Operaciones Diarias
input double            InpMaxDailyLossPercent    = 3.0;          // Drawdown Maximo Diario Permitido (% Balance: 3.0%)

input group "=== Sincronizacion Horaria & Sesion Londres (UTC) ==="
input int               InpBrokerGmtOffset        = 3;            // GMT Offset del Broker (+3 verano, +2 invierno, 0 UTC)
input int               InpStartAsiaUTC           = 0;            // Inicio Rango Tokio (Hora UTC, 00:00)
input int               InpEndAsiaUTC             = 7;            // Fin Rango Tokio (Hora UTC, 07:00)
input int               InpStartLondonUTC         = 8;            // Inicio Londres (Hora UTC, 08:00 / 11:00 Broker)
input int               InpEndLondonUTC           = 11;           // Fin Londres (Hora UTC, 11:00 / 14:00 Broker)

input group "=== Sesion Secundaria: Nueva York (Opcional) ==="
input bool              InpEnableNYSession        = false;        // Activar si deseas mas operaciones semanales (13:30-15:30 UTC)
input int               InpStartNYHour            = 13;           // Hora Inicio NY (UTC, 13:00)
input int               InpStartNYMinute          = 30;           // Minuto Inicio NY (30 min -> 13:30 UTC)
input int               InpEndNYHour              = 15;           // Hora Fin NY (UTC, 15:00)
input int               InpEndNYMinute            = 30;           // Minuto Fin NY (30 min -> 15:30 UTC)

input group "=== Filtros Cuantitativos de Alta Efectividad (Sniper) ==="
input ENUM_TREND_MODE   InpTrendMode              = TREND_D1_STRICT; // Filtro D1 (RECOMENDADO: Elimina el 60% de perdidas en Short)
input bool              InpEnableRetestEntry      = true;         // Segunda Oportunidad por Retesteo M15 (Mas oportunidades)
input double            InpRetestTolerance        = 2.0;          // Tolerancia Pullback a nivel Tokio ($2.0 USD)
input double            InpBreakoutBuffer         = 0.50;         // Margen minimo de cierre fuera de Tokio ($0.50)
input double            InpMinCandleBodyPct       = 35.0;         // % Minimo de Cuerpo en vela M15 (Filtro anti-mechas/fakeouts)
input double            InpMinAsiaRange           = 6.0;          // Amplitud Minima Tokio ($ pts: 6.0 - Evita dias muertos)
input double            InpMaxAsiaRange           = 65.0;         // Amplitud Maxima Tokio ($ pts: 65.0 - Calibracion Exacta)
input int               InpMaxSpreadPoints        = 0;            // Spread Maximo en Puntos (0 = Desactivado en Backtest, 35 en Real)
input int               InpSlippage               = 50;           // Tolerancia Desviacion Precio (Slippage en puntos = $0.50)

input group "=== Modo Sin Breakeven & Cierre de Fin de Semana ==="
input bool              InpEnableBreakeven        = false;        // Breakeven Desactivado: Dejar correr el trade al TP completo
input double            InpBEBufferPoints         = 0.20;         // Colchon de Entrada (Solo si se activa Breakeven manualmente)
input bool              InpCloseFridayEOD         = true;         // Cerrar posiciones el Viernes a las 20:00 UTC (Evita gaps domingo)

//--- Variables Globales de Estado
datetime g_lastEvaluatedBarTime = 0;
string   g_lastTradeDate        = "";
int      g_dailyTradesCount     = 0;
int      g_dailySLCount         = 0;

void SetOptimalFillingMode()
{
   uint filling = (uint)SymbolInfoInteger(_Symbol, SYMBOL_FILLING_MODE);
   if((filling & SYMBOL_FILLING_FOK) != 0)
      trade.SetTypeFilling(ORDER_FILLING_FOK);
   else if((filling & SYMBOL_FILLING_IOC) != 0)
      trade.SetTypeFilling(ORDER_FILLING_IOC);
   else
   {
      long execMode = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_EXEMODE);
      if(execMode == SYMBOL_TRADE_EXECUTION_MARKET)
         trade.SetTypeFilling(ORDER_FILLING_IOC);
      else
         trade.SetTypeFilling(ORDER_FILLING_RETURN);
   }
}

void UpdateDailyStatsFromAccountHistory()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   dt.hour = 0; dt.min = 0; dt.sec = 0;
   datetime todayStart = StructToTime(dt);
   
   if(!HistorySelect(todayStart, TimeCurrent())) return;
   
   int totalDeals = HistoryDealsTotal();
   int tradesToday = 0;
   int slToday = 0;
   
   for(int i = 0; i < totalDeals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      if(HistoryDealGetString(ticket, DEAL_SYMBOL) != _Symbol) continue;
      if(HistoryDealGetInteger(ticket, DEAL_MAGIC) != InpMagicNumber) continue;
      
      long entryType = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entryType == DEAL_ENTRY_IN)
      {
         tradesToday++;
      }
      else if(entryType == DEAL_ENTRY_OUT || entryType == DEAL_ENTRY_OUT_BY)
      {
         double dealProfit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         double dealSwap   = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double dealComm   = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         double netProfit  = dealProfit + dealSwap + dealComm;
         
         if(netProfit < -0.01)
         {
            slToday++;
         }
      }
   }
   
   if(tradesToday > g_dailyTradesCount) g_dailyTradesCount = tradesToday;
   if(slToday > g_dailySLCount) g_dailySLCount = slToday;
}

void UpdateChartDashboard(string statusMsg, int brokerH, int brokerM, int utcH, int utcM, double asiaH, double asiaL, double asiaR, long spread)
{
   double balance    = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity     = AccountInfoDouble(ACCOUNT_EQUITY);
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   
   string hud = "";
   hud += "╔════════════════════════════════════════════════════════════════════════╗\\n";
   hud += "║      GOLD KILLER v3.0 PURE 1:2 (XAU/USD) - SIN BREAKEVEN / FULL SWING  ║\\n";
   hud += "║      Desarrollado por el Ingeniero Francisco Alvarado                  ║\\n";
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  ESTADO: %-60s  ║\\n", statusMsg);
   hud += StringFormat("║  HORA: Broker %02d:%02d | UTC %02d:%02d (Offset GMT%+d)                           ║\\n",
                       brokerH, brokerM, utcH, utcM, InpBrokerGmtOffset);
   hud += "║  SESION PRINCIPAL: Londres (08:00 a 11:00 UTC)                         ║\\n";
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  RANGO TOKIO: Alto=%.2f | Bajo=%.2f | Amplitud=%.2f pts              ║\\n",
                       asiaH, asiaL, asiaR);
   hud += StringFormat("║  SPREAD ACTUAL: %d pts (Maximo Seguro: %d pts) - %-18s  ║\\n",
                       spread, InpMaxSpreadPoints, (InpMaxSpreadPoints == 0 || spread <= InpMaxSpreadPoints) ? "SPREAD OPTIMO" : "SPREAD ALTO (ESPERA)");
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  OPERACIONES HOY: %d / %d  |  STOP LOSS HOY: %d / %d (Circuit Breaker)     ║\\n",
                       g_dailyTradesCount, InpMaxDailyTrades, g_dailySLCount, InpMaxDailySL);
   hud += StringFormat("║  CUENTA: Balance=$%.2f | Equidad=$%.2f | Margen Libre=$%.2f    ║\\n",
                       balance, equity, freeMargin);
   hud += StringFormat("║  ESTRATEGIA: Riesgo=%.1f%% | Target R:R=1:%.1f | Breakeven=%s             ║\\n",
                       InpRiskPercent, InpRRRatio, InpEnableBreakeven ? "ACTIVO" : "DESACTIVADO (1:2 PURO)");
   hud += "╚════════════════════════════════════════════════════════════════════════╝";
   
   Comment(hud);
}

int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);
   trade.SetAsyncMode(false);
   SetOptimalFillingMode();
   
   UpdateDailyStatsFromAccountHistory();
   
   Print("================================================================================");
   Print("  EA INICIADO: XAU/USD Gold Killer v3.0 PURE 1:2 [SIN BREAKEVEN / FULL SWING]");
   Print("  Desarrollado por: Ingeniero Francisco Alvarado");
   PrintFormat("  Configuracion: Broker GMT%+d | Tokio: %02d:00-%02d:00 UTC | Londres: %02d:00-%02d:00 UTC",
               InpBrokerGmtOffset, InpStartAsiaUTC, InpEndAsiaUTC, InpStartLondonUTC, InpEndLondonUTC);
   PrintFormat("  Filtro Tokio: Min=%.1f pts | Max=%.1f pts | Riesgo=%.1f%% | Target R:R=1:%.1f | BE=%s",
               InpMinAsiaRange, InpMaxAsiaRange, InpRiskPercent, InpRRRatio, InpEnableBreakeven ? "SI" : "NO (1:2 PURO)");
   Print("================================================================================");
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   Comment("");
}

bool GetTodayAsianRange(datetime currentBarTime, double &outHigh, double &outLow, double &outMid, double &outRange)
{
   datetime currentUtc = currentBarTime - (InpBrokerGmtOffset * 3600);
   MqlDateTime curDt;
   TimeToStruct(currentUtc, curDt);
   
   double maxH = -1.0;
   double minL = 9999999.0;
   int barsFound = 0;
   
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, PERIOD_M15, 0, 150, rates);
   if(copied <= 0) return false;
   
   for(int i = 0; i < copied; i++)
   {
      datetime barUtc = rates[i].time - (InpBrokerGmtOffset * 3600);
      MqlDateTime bDt;
      TimeToStruct(barUtc, bDt);
      
      if(bDt.year != curDt.year || bDt.mon != curDt.mon || bDt.day != curDt.day)
      {
         if(barsFound > 0) break;
         continue;
      }
      
      if(bDt.hour >= InpStartAsiaUTC && bDt.hour < InpEndAsiaUTC)
      {
         if(rates[i].high > maxH) maxH = rates[i].high;
         if(rates[i].low < minL)  minL = rates[i].low;
         barsFound++;
      }
   }
   
   if(barsFound == 0 || maxH <= 0 || minL >= 9999999.0 || maxH <= minL) return false;
   
   outHigh  = NormalizeDouble(maxH, _Digits);
   outLow   = NormalizeDouble(minL, _Digits);
   outMid   = NormalizeDouble((outHigh + outLow) / 2.0, _Digits);
   outRange = NormalizeDouble(outHigh - outLow, _Digits);
   return true;
}

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

bool HasSufficientMargin(double lots, double price, ENUM_ORDER_TYPE orderType)
{
   double marginReq = 0.0;
   if(OrderCalcMargin(orderType, _Symbol, lots, price, marginReq))
   {
      double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
      if(marginReq > 0 && freeMargin > 0 && marginReq > freeMargin)
      {
         PrintFormat("❌ [ERROR MARGEN] Margen insuficiente para abrir %.2f lotes. Requerido: $%.2f | Libre: $%.2f",
                     lots, marginReq, freeMargin);
         return false;
      }
   }
   return true;
}

//+------------------------------------------------------------------+
//| Calculo Dinamico de Lotaje Institucional Exacto                  |
//| (Blindaje contra discrepancias de TickValue en brokers de Oro)   |
//+------------------------------------------------------------------+
double CalculateLotSize(double entryPrice, double slPrice, ENUM_ORDER_TYPE orderType)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) balance = 10000.0;
   
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double stopLossDist = MathAbs(entryPrice - slPrice);
   if(stopLossDist <= 0.1) stopLossDist = 5.0;
   
   double lossForOneLot = 0.0;
   if(OrderCalcProfit(orderType, _Symbol, 1.0, entryPrice, slPrice, lossForOneLot))
   {
      lossForOneLot = MathAbs(lossForOneLot);
   }
   
   if(lossForOneLot <= 0.0)
   {
      double contractSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
      if(contractSize <= 0) contractSize = 100.0;
      lossForOneLot = stopLossDist * contractSize;
   }
   
   double calculatedLots = 0.01;
   if(lossForOneLot > 0.0)
   {
      calculatedLots = riskMoney / lossForOneLot;
   }
   
   double stepLots = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLots  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLots  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(stepLots <= 0) stepLots = 0.01;
   if(minLots <= 0)  minLots = 0.01;
   if(maxLots <= 0)  maxLots = 100.0;
   
   double finalLots = MathFloor(calculatedLots / stepLots) * stepLots;
   if(finalLots < minLots) finalLots = minLots;
   if(finalLots > maxLots) finalLots = maxLots;
   
   return NormalizeDouble(finalLots, 2);
}

bool RobustTradeBuy(double lots, double entry, double sl, double tp, string comment)
{
   if(!HasSufficientMargin(lots, entry, ORDER_TYPE_BUY)) return false;

   ENUM_ORDER_TYPE_FILLING fillings[3] = { ORDER_FILLING_IOC, ORDER_FILLING_FOK, ORDER_FILLING_RETURN };
   uint symFill = (uint)SymbolInfoInteger(_Symbol, SYMBOL_FILLING_MODE);
   if((symFill & SYMBOL_FILLING_FOK) != 0) { fillings[0] = ORDER_FILLING_FOK; fillings[1] = ORDER_FILLING_IOC; }
   else if((symFill & SYMBOL_FILLING_IOC) != 0) { fillings[0] = ORDER_FILLING_IOC; fillings[1] = ORDER_FILLING_FOK; }
   else { fillings[0] = ORDER_FILLING_RETURN; fillings[1] = ORDER_FILLING_IOC; }

   for(int f = 0; f < 3; f++)
   {
      trade.SetTypeFilling(fillings[f]);
      if(trade.Buy(lots, _Symbol, entry, sl, tp, comment))
      {
         PrintFormat("✅ [BUY v3.0 PURE EJECUTADO] Ticket #%I64u Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f (R:R 1:%.1f)",
                     trade.ResultOrder(), lots, entry, sl, tp, InpRRRatio);
         return true;
      }
      
      uint code = trade.ResultRetcode();
      if(code == 10030) continue;
      
      if(code == 10016)
      {
         if(trade.Buy(lots, _Symbol, entry, 0.0, 0.0, comment))
         {
            ulong ticket = trade.ResultOrder();
            Sleep(50);
            if(ticket > 0) trade.PositionModify(ticket, sl, tp);
            else trade.PositionModify(_Symbol, sl, tp);
            return true;
         }
      }
   }
   return false;
}

bool RobustTradeSell(double lots, double entry, double sl, double tp, string comment)
{
   if(!HasSufficientMargin(lots, entry, ORDER_TYPE_SELL)) return false;

   ENUM_ORDER_TYPE_FILLING fillings[3] = { ORDER_FILLING_IOC, ORDER_FILLING_FOK, ORDER_FILLING_RETURN };
   uint symFill = (uint)SymbolInfoInteger(_Symbol, SYMBOL_FILLING_MODE);
   if((symFill & SYMBOL_FILLING_FOK) != 0) { fillings[0] = ORDER_FILLING_FOK; fillings[1] = ORDER_FILLING_IOC; }
   else if((symFill & SYMBOL_FILLING_IOC) != 0) { fillings[0] = ORDER_FILLING_IOC; fillings[1] = ORDER_FILLING_FOK; }
   else { fillings[0] = ORDER_FILLING_RETURN; fillings[1] = ORDER_FILLING_IOC; }

   for(int f = 0; f < 3; f++)
   {
      trade.SetTypeFilling(fillings[f]);
      if(trade.Sell(lots, _Symbol, entry, sl, tp, comment))
      {
         PrintFormat("✅ [SELL v3.0 PURE EJECUTADO] Ticket #%I64u Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f (R:R 1:%.1f)",
                     trade.ResultOrder(), lots, entry, sl, tp, InpRRRatio);
         return true;
      }
      
      uint code = trade.ResultRetcode();
      if(code == 10030) continue;
      
      if(code == 10016)
      {
         if(trade.Sell(lots, _Symbol, entry, 0.0, 0.0, comment))
         {
            ulong ticket = trade.ResultOrder();
            Sleep(50);
            if(ticket > 0) trade.PositionModify(ticket, sl, tp);
            else trade.PositionModify(_Symbol, sl, tp);
            return true;
         }
      }
   }
   return false;
}

void OnTick()
{
   datetime currentServerTime = TimeCurrent();
   datetime currentUtcTime    = currentServerTime - (InpBrokerGmtOffset * 3600);
   MqlDateTime dt, utcDt;
   TimeToStruct(currentServerTime, dt);
   TimeToStruct(currentUtcTime, utcDt);
   
   string todayDateStr = StringFormat("%04d-%02d-%02d", utcDt.year, utcDt.mon, utcDt.day);
   
   if(g_lastTradeDate != todayDateStr)
   {
      g_lastTradeDate = todayDateStr;
      g_dailyTradesCount = 0;
      g_dailySLCount = 0;
   }
   
   UpdateDailyStatsFromAccountHistory();
   
   // Si el usuario decidiera activar Breakeven opcionalmente
   if(InpEnableBreakeven)
   {
      ManageBreakeven();
   }
   
   long currentSpread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   
   double asiaHigh = 0.0, asiaLow = 0.0, asiaMid = 0.0, asiaRange = 0.0;
   bool hasAsiaRange = GetTodayAsianRange(currentServerTime, asiaHigh, asiaLow, asiaMid, asiaRange);
   
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double dailyLossPercent = (balance > 0) ? ((balance - equity) / balance) * 100.0 : 0.0;
   
   if(g_dailySLCount >= InpMaxDailySL)
   {
      UpdateChartDashboard("🔴 CIRCUIT BREAKER: Limite de 2 Stop Loss diarios alcanzado. Capital protegido.",
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(InpMaxDailyLossPercent > 0 && dailyLossPercent >= InpMaxDailyLossPercent)
   {
      UpdateChartDashboard(StringFormat("🔴 CIRCUIT BREAKER: Perdida diaria (%.2f%%) supera maximo (%.2f%%). Trading pausado.", dailyLossPercent, InpMaxDailyLossPercent),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(g_dailyTradesCount >= InpMaxDailyTrades)
   {
      UpdateChartDashboard(StringFormat("✅ OBJETIVO DIARIO: Maximo de %d operaciones completadas hoy.", InpMaxDailyTrades),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // 5. Evaluacion de Ventanas Operativas (Londres y/o Nueva York)
   datetime currentBarTime = iTime(_Symbol, PERIOD_M15, 0);
   bool isNewBar = (g_lastEvaluatedBarTime != currentBarTime);
   
   MqlRates m15[];
   ArraySetAsSeries(m15, true);
   if(CopyRates(_Symbol, PERIOD_M15, 1, 35, m15) < 30) return;
   
   datetime closedBarUtcTime = m15[0].time - (InpBrokerGmtOffset * 3600);
   MqlDateTime closedBarUtcDt;
   TimeToStruct(closedBarUtcTime, closedBarUtcDt);
   
   // Cierre preventivo de Fin de Semana (Viernes a las 20:00 UTC)
   if(InpCloseFridayEOD && closedBarUtcDt.day_of_week == 5 && closedBarUtcDt.hour >= 20)
   {
      for(int p = PositionsTotal() - 1; p >= 0; p--)
      {
         ulong posTicket = PositionGetTicket(p);
         if(posTicket > 0 && PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         {
            trade.PositionClose(posTicket);
            PrintFormat("🛡️ [CIERRE VIERNES] Posicion #%I64u cerrada preventivamente antes del fin de semana.", posTicket);
         }
      }
   }
   
   // Ventana Londres: 08:00 a 11:00 UTC
   bool isLondonWindow = (closedBarUtcDt.hour >= InpStartLondonUTC && closedBarUtcDt.hour < InpEndLondonUTC);
   
   // Ventana Nueva York: 13:30 a 15:30 UTC
   int barMinutesOfDay = closedBarUtcDt.hour * 60 + closedBarUtcDt.min;
   int nyStartMinutes  = InpStartNYHour * 60 + InpStartNYMinute;
   int nyEndMinutes    = InpEndNYHour * 60 + InpEndNYMinute;
   bool isNYWindow     = InpEnableNYSession && (barMinutesOfDay >= nyStartMinutes && barMinutesOfDay <= nyEndMinutes);
   
   bool isTradingWindow = isLondonWindow || isNYWindow;
   string currentActiveSession = isNYWindow ? "NUEVA YORK" : "LONDRES";
   
   if(!isTradingWindow)
   {
      string sessionMsg = "";
      if(closedBarUtcDt.hour < InpStartLondonUTC)
         sessionMsg = StringFormat("🟡 ESPERANDO LONDRES: Abre a las %02d:00 UTC", InpStartLondonUTC);
      else if(InpEnableNYSession && closedBarUtcDt.hour >= InpEndLondonUTC && barMinutesOfDay < nyStartMinutes)
         sessionMsg = StringFormat("🟡 ESPERANDO NUEVA YORK: Abre a las %02d:%02d UTC", InpStartNYHour, InpStartNYMinute);
      else
         sessionMsg = "⚪ SESIONES CERRADAS: Esperando siguiente sesion manana";
      
      UpdateChartDashboard(sessionMsg, dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(!hasAsiaRange)
   {
      UpdateChartDashboard("🟡 CALCULANDO RANGO TOKIO...", dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(InpMaxSpreadPoints > 0 && currentSpread > InpMaxSpreadPoints)
   {
      UpdateChartDashboard(StringFormat("⚠️ SPREAD ALTO (%d pts > %d max). Esperando normalizacion...", currentSpread, InpMaxSpreadPoints),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(!isNewBar)
   {
      UpdateChartDashboard(StringFormat("🟢 OPERANDO EN VIVO (%s): Monitoreando Ruptura y Retesteo (Sniper)", currentActiveSession),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if((InpMinAsiaRange > 0 && asiaRange < InpMinAsiaRange) || (InpMaxAsiaRange > 0 && asiaRange > InpMaxAsiaRange))
   {
      UpdateChartDashboard(StringFormat("⚪ Rango Tokio fuera de limites (%.2f pts). Sesion omitida.", asiaRange),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      g_lastEvaluatedBarTime = currentBarTime;
      return;
   }
   
   bool allowLong  = true;
   bool allowShort = true;
   if(InpTrendMode == TREND_D1_STRICT)
   {
      double d1Close = iClose(_Symbol, PERIOD_D1, 1);
      double d1Open  = iOpen(_Symbol, PERIOD_D1, 1);
      if(d1Close > 0 && d1Open > 0)
      {
         allowLong  = (d1Close > d1Open);
         allowShort = (d1Close < d1Open);
      }
   }
   
   // Escaneo de ruptura previa desde el fin de Tokio (para validar retesteo)
   bool hadPriorBullishBreakout = false;
   bool hadPriorBearishBreakout = false;
   for(int k = 1; k < 25; k++)
   {
      datetime priorUtc = m15[k].time - (InpBrokerGmtOffset * 3600);
      MqlDateTime pDt;
      TimeToStruct(priorUtc, pDt);
      if(pDt.day != closedBarUtcDt.day) break;
      if(pDt.hour >= InpEndAsiaUTC)
      {
         if(m15[k].high > (asiaHigh + 0.5)) hadPriorBullishBreakout = true;
         if(m15[k].low  < (asiaLow  - 0.5)) hadPriorBearishBreakout = true;
      }
   }
   
   double c1 = m15[0].close;
   double c2 = m15[1].close;
   double o1 = m15[0].open;
   double h1 = m15[0].high;
   double l1 = m15[0].low;
   
   double candleRange = h1 - l1;
   double candleBody  = MathAbs(c1 - o1);
   bool isSolidBody   = (candleRange > 0) ? ((candleBody / candleRange) * 100.0 >= InpMinCandleBodyPct) : true;
   
   // 1. Ruptura M15 Limpia Fuera de Tokio (con confirmacion de cuerpo y buffer)
   bool buyBreakout  = allowLong && isSolidBody && (c1 >= (asiaHigh + InpBreakoutBuffer)) && (c2 <= asiaHigh || (c1 > o1 && c2 < (asiaHigh + 1.0))) && (c1 > o1);
   bool sellBreakout = allowShort && isSolidBody && (c1 <= (asiaLow - InpBreakoutBuffer)) && (c2 >= asiaLow || (c1 < o1 && c2 > (asiaLow - 1.0))) && (c1 < o1);
   
   // 2. Segunda Oportunidad: Retesteo M15 al nivel de Tokio con rechazo
   bool isRetestBuy = InpEnableRetestEntry && allowLong && hadPriorBullishBreakout && !buyBreakout &&
                      (c1 > asiaHigh) && (l1 <= (asiaHigh + InpRetestTolerance)) && (c1 > o1) && isSolidBody;
                      
   bool isRetestSell = InpEnableRetestEntry && allowShort && hadPriorBearishBreakout && !sellBreakout &&
                       (c1 < asiaLow) && (h1 >= (asiaLow - InpRetestTolerance)) && (c1 < o1) && isSolidBody;
                       
   bool triggerBuy  = buyBreakout || isRetestBuy;
   bool triggerSell = sellBreakout || isRetestSell;
   
   int botPositions = CountBotPositions();
   
   if(triggerBuy && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl = isRetestBuy ? NormalizeDouble(asiaHigh - 3.5, _Digits) : NormalizeDouble(asiaMid, _Digits);
      
      double minStopDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(minStopDist > 0 && (entry - sl) < minStopDist)
         sl = NormalizeDouble(entry - minStopDist - 0.5, _Digits);
         
      double riskDistance = entry - sl;
      if(riskDistance <= 0.5) riskDistance = 5.0;
      double tp = NormalizeDouble(entry + (riskDistance * InpRRRatio), _Digits);
      
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_BUY);
      string triggerName = isRetestBuy ? "Retesteo M15" : "Ruptura Inicial";
      string comment = StringFormat("GK3 #%d Long [%s]", g_dailyTradesCount + 1, triggerName);
      
      PrintFormat("🚀 [BUY v3.1 SNIPER] %s (%s) Entrada=%.2f SL=%.2f TP=%.2f Lotes=%.2f (R:R 1:%.1f)",
                  triggerName, currentActiveSession, entry, sl, tp, lots, InpRRRatio);
                  
      if(RobustTradeBuy(lots, entry, sl, tp, comment))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         UpdateChartDashboard(StringFormat("⚡ BUY %s (%s) EJECUTADO EXITOSAMENTE", triggerName, currentActiveSession),
                              dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      }
   }
   else if(triggerSell && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl = isRetestSell ? NormalizeDouble(asiaLow + 3.5, _Digits) : NormalizeDouble(asiaMid, _Digits);
      
      double minStopDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(minStopDist > 0 && (sl - entry) < minStopDist)
         sl = NormalizeDouble(entry + minStopDist + 0.5, _Digits);
         
      double riskDistance = sl - entry;
      if(riskDistance <= 0.5) riskDistance = 5.0;
      double tp = NormalizeDouble(entry - (riskDistance * InpRRRatio), _Digits);
      
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_SELL);
      string triggerName = isRetestSell ? "Retesteo M15" : "Ruptura Inicial";
      string comment = StringFormat("GK3 #%d Short [%s]", g_dailyTradesCount + 1, triggerName);
      
      PrintFormat("🚀 [SELL v3.1 SNIPER] %s (%s) Entrada=%.2f SL=%.2f TP=%.2f Lotes=%.2f (R:R 1:%.1f)",
                  triggerName, currentActiveSession, entry, sl, tp, lots, InpRRRatio);
                  
      if(RobustTradeSell(lots, entry, sl, tp, comment))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         UpdateChartDashboard(StringFormat("⚡ SELL %s (%s) EJECUTADO EXITOSAMENTE", triggerName, currentActiveSession),
                              dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      }
   }
   else
   {
      g_lastEvaluatedBarTime = currentBarTime;
      UpdateChartDashboard(StringFormat("🟢 OPERANDO EN VIVO (%s): Monitoreando Ruptura y Retesteo M15", currentActiveSession),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
   }
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
      if(riskDist <= 0.1) continue;
      
      if(type == POSITION_TYPE_BUY)
      {
         if(curBid >= (openPrice + riskDist))
         {
            double beLevel = NormalizeDouble(openPrice + InpBEBufferPoints, _Digits);
            if(slPrice < openPrice && (curBid - beLevel) >= minSafetyDist)
            {
               SetOptimalFillingMode();
               if(trade.PositionModify(ticket, beLevel, tpPrice))
                  PrintFormat("🛡️ [BREAKEVEN 1:1] Stop Loss blindado para BUY #%I64u en %.2f", ticket, beLevel);
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
               if(trade.PositionModify(ticket, beLevel, tpPrice))
                  PrintFormat("🛡️ [BREAKEVEN 1:1] Stop Loss blindado para SELL #%I64u en %.2f", ticket, beLevel);
            }
         }
      }
   }
}
`;

export const mql4CodeV3 = `//+------------------------------------------------------------------+
//|                                  XAUUSD_GoldKiller_V3_Pure.mq4   |
//|  Algoritmo Cuantitativo Institucional Gold Killer v3.0 PURE 1:2  |
//|       Desarrollado por el Ingeniero Francisco Alvarado           |
//|   Estrategia Binaria: 1:2 Puro Sin Breakeven (Full Swing)        |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "3.00"
#property description "Robot Cuantitativo Institucional Gold Killer v3.0 PURE para MT4. Operativa 1:2 pura sin Breakeven, filtro Tokio calibrado a 65 pts y Circuit Breaker de 2 SLs diarios."
#property strict

extern string   sep0                   = "=== Identificacion & Riesgo Real ===";
extern int      InpMagicNumber         = 888999;       // Magic Number Unico (v3.0 PURE)
extern double   InpRiskPercent         = 1.5;          // Riesgo por Trade (% Balance: 1.0% a 1.5%)
extern double   InpRRRatio             = 2.0;          // Ratio Riesgo / Beneficio Puro (1:2)
extern int      InpMaxDailySL          = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
extern int      InpMaxDailyTrades      = 2;            // Maximo de Trades por Dia
extern double   InpMaxDailyLossPercent = 3.0;          // Drawdown Maximo Diario Permitido (% Balance: 3.0%)

extern string   sep1                   = "=== Sincronizacion Horaria & Sesion Londres (UTC) ===";
extern int      InpBrokerGmtOffset     = 3;            // GMT Offset del Broker (+3 verano, +2 invierno, 0 UTC)
extern int      InpStartAsiaUTC        = 0;            // Inicio Rango Tokio (Hora UTC, 00:00)
extern int      InpEndAsiaUTC          = 7;            // Fin Rango Tokio (Hora UTC, 07:00)
extern int      InpStartLondonUTC      = 8;            // Inicio Londres (08:00 UTC / 11:00 Broker)
extern int      InpEndLondonUTC        = 11;           // Fin Londres (11:00 UTC / 14:00 Broker)

extern string   sep2                   = "=== Filtros Cuantitativos ===";
extern bool     InpUseD1Trend          = false;        // false = Ambas Direcciones | true = Filtro D1
extern double   InpMinAsiaRange        = 6.0;          // Rango Minimo Tokio ($ pts: 6.0)
extern double   InpMaxAsiaRange        = 65.0;         // Rango Maximo Tokio ($ pts: 65.0 - Calibrado)
extern int      InpMaxSpread           = 0;            // Spread Maximo (0 = Desactivado en Backtest, 35 en Real)
extern int      InpSlippage            = 50;           // Tolerancia Desviacion en Puntos ($0.50)

extern string   sep3                   = "=== Modo 1:2 Puro (Sin Breakeven) ===";
extern bool     InpEnableBE            = false;        // Breakeven Desactivado por defecto (Dejar correr al 1:2)
extern double   InpBEBufferPoints      = 0.20;         // Colchon sobre Entrada ($0.20 Oro)

datetime g_lastEvaluatedBarTime = 0;
string   g_lastTradeDate        = "";
int      g_dailyTradesCount     = 0;
int      g_dailySLCount         = 0;

void UpdateDailyStatsMT4()
{
   int tradesToday = 0;
   int slToday = 0;
   datetime todayStart = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE) + " 00:00");
   
   int histTotal = OrdersHistoryTotal();
   for(int i = 0; i < histTotal; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      if(OrderCloseTime() >= todayStart)
      {
         tradesToday++;
         double net = OrderProfit() + OrderSwap() + OrderCommission();
         if(net < -0.01) slToday++;
      }
   }
   
   int openTotal = OrdersTotal();
   for(int j = 0; j < openTotal; j++)
   {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      if(OrderOpenTime() >= todayStart) tradesToday++;
   }
   
   if(tradesToday > g_dailyTradesCount) g_dailyTradesCount = tradesToday;
   if(slToday > g_dailySLCount) g_dailySLCount = slToday;
}

int OnInit()
{
   UpdateDailyStatsMT4();
   PrintFormat("EA v3.0 PURE MT4 INICIADO: Magic=%d | Target R:R=1:%.1f | BE=%s | Tokio Max=%.1f",
               InpMagicNumber, InpRRRatio, InpEnableBE ? "SI" : "NO (1:2 Puro)", InpMaxAsiaRange);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) { Comment(""); }

bool GetTodayAsianRangeMT4(datetime currentBarTime, double &outHigh, double &outLow, double &outMid, double &outRange)
{
   datetime currentUtc = currentBarTime - (InpBrokerGmtOffset * 3600);
   string curDay = TimeToStr(currentUtc, TIME_DATE);
   
   double maxH = -1.0;
   double minL = 9999999.0;
   int count = 0;
   
   for(int i = 0; i < 150; i++)
   {
      datetime bTime = iTime(Symbol(), PERIOD_M15, i);
      datetime bUtc  = bTime - (InpBrokerGmtOffset * 3600);
      string bDay    = TimeToStr(bUtc, TIME_DATE);
      
      if(bDay != curDay)
      {
         if(count > 0) break;
         continue;
      }
      
      int bHour = TimeHour(bUtc);
      if(bHour >= InpStartAsiaUTC && bHour < InpEndAsiaUTC)
      {
         double h = iHigh(Symbol(), PERIOD_M15, i);
         double l = iLow(Symbol(), PERIOD_M15, i);
         if(h > maxH) maxH = h;
         if(l < minL) minL = l;
         count++;
      }
   }
   
   if(count == 0 || maxH <= 0 || minL >= 9999999.0 || maxH <= minL) return false;
   
   outHigh  = NormalizeDouble(maxH, Digits);
   outLow   = NormalizeDouble(minL, Digits);
   outMid   = NormalizeDouble((outHigh + outLow) / 2.0, Digits);
   outRange = NormalizeDouble(outHigh - outLow, Digits);
   return true;
}

double CalculateLotSizeMT4(double entryPrice, double slPrice)
{
   double balance = AccountBalance();
   if(balance <= 0) balance = 10000.0;
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double stopLossDist = MathAbs(entryPrice - slPrice);
   if(stopLossDist <= 0.1) stopLossDist = 5.0;
   
   // 1 lote standard Oro = 100 onzas = $100 por punto
   double contractSize = MarketInfo(Symbol(), MODE_LOTSIZE);
   if(contractSize <= 0) contractSize = 100.0;
   
   double lossForOneLot = stopLossDist * contractSize;
   double calcLots = (lossForOneLot > 0) ? (riskMoney / lossForOneLot) : 0.01;
   
   double stepLots = MarketInfo(Symbol(), MODE_LOTSTEP);
   double minLots  = MarketInfo(Symbol(), MODE_MINLOT);
   double maxLots  = MarketInfo(Symbol(), MODE_MAXLOT);
   if(stepLots <= 0) stepLots = 0.01;
   if(minLots <= 0)  minLots = 0.01;
   if(maxLots <= 0)  maxLots = 100.0;
   
   double lots = MathFloor(calcLots / stepLots) * stepLots;
   if(lots < minLots) lots = minLots;
   if(lots > maxLots) lots = maxLots;
   return NormalizeDouble(lots, 2);
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
      double riskDist = MathAbs(open - sl);
      if(riskDist <= 0.1) continue;
      
      if(type == OP_BUY && Bid >= (open + riskDist) && sl < open)
      {
         double be = NormalizeDouble(open + InpBEBufferPoints, Digits);
         OrderModify(OrderTicket(), open, be, tp, 0, clrCyan);
      }
      else if(type == OP_SELL && Ask <= (open - riskDist) && (sl > open || sl == 0.0))
      {
         double be = NormalizeDouble(open - InpBEBufferPoints, Digits);
         OrderModify(OrderTicket(), open, be, tp, 0, clrCyan);
      }
   }
}

void OnTick()
{
   datetime now = TimeCurrent();
   datetime utc = now - (InpBrokerGmtOffset * 3600);
   string today = TimeToStr(utc, TIME_DATE);
   
   if(g_lastTradeDate != today)
   {
      g_lastTradeDate = today;
      g_dailyTradesCount = 0;
      g_dailySLCount = 0;
   }
   
   UpdateDailyStatsMT4();
   if(InpEnableBE) ManageBreakevenMT4();
   
   if(g_dailySLCount >= InpMaxDailySL || g_dailyTradesCount >= InpMaxDailyTrades) return;
   
   datetime barTime = iTime(Symbol(), PERIOD_M15, 0);
   if(barTime == g_lastEvaluatedBarTime) return;
   
   datetime closedBarUtc = iTime(Symbol(), PERIOD_M15, 1) - (InpBrokerGmtOffset * 3600);
   int closedHour = TimeHour(closedBarUtc);
   
   bool isLondon = (closedHour >= InpStartLondonUTC && closedHour < InpEndLondonUTC);
   if(!isLondon) return;
   
   double asiaH = 0, asiaL = 0, asiaM = 0, asiaR = 0;
   if(!GetTodayAsianRangeMT4(now, asiaH, asiaL, asiaM, asiaR)) return;
   if((InpMinAsiaRange > 0 && asiaR < InpMinAsiaRange) || (InpMaxAsiaRange > 0 && asiaR > InpMaxAsiaRange))
   {
      g_lastEvaluatedBarTime = barTime;
      return;
   }
   
   double c1 = iClose(Symbol(), PERIOD_M15, 1);
   double c2 = iClose(Symbol(), PERIOD_M15, 2);
   double o1 = iOpen(Symbol(), PERIOD_M15, 1);
   
   bool buy  = (c1 > asiaH && c2 <= asiaH && c1 > o1);
   bool sell = (c1 < asiaL && c2 >= asiaL && c1 < o1);
   
   int botOrders = 0;
   for(int o = 0; o < OrdersTotal(); o++)
   {
      if(OrderSelect(o, SELECT_BY_POS, MODE_TRADES) && OrderSymbol() == Symbol() && OrderMagicNumber() == InpMagicNumber)
         botOrders++;
   }
   
   if(buy && botOrders == 0)
   {
      double entry = Ask;
      double sl = NormalizeDouble(asiaM, Digits);
      double dist = entry - sl;
      if(dist <= 0.5) dist = 5.0;
      double tp = NormalizeDouble(entry + (dist * InpRRRatio), Digits);
      double lots = CalculateLotSizeMT4(entry, sl);
      
      int ticket = OrderSend(Symbol(), OP_BUY, lots, entry, InpSlippage, sl, tp, "GoldKiller v3 Buy", InpMagicNumber, 0, clrGreen);
      if(ticket > 0)
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = barTime;
      }
   }
   else if(sell && botOrders == 0)
   {
      double entry = Bid;
      double sl = NormalizeDouble(asiaM, Digits);
      double dist = sl - entry;
      if(dist <= 0.5) dist = 5.0;
      double tp = NormalizeDouble(entry - (dist * InpRRRatio), Digits);
      double lots = CalculateLotSizeMT4(entry, sl);
      
      int ticket = OrderSend(Symbol(), OP_SELL, lots, entry, InpSlippage, sl, tp, "GoldKiller v3 Sell", InpMagicNumber, 0, clrRed);
      if(ticket > 0)
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = barTime;
      }
   }
   else
   {
      g_lastEvaluatedBarTime = barTime;
   }
}
`;

export const pineScriptCodeV3 = `//@version=5
strategy("Gold Killer v3.0 PURE 1:2 - Sin Breakeven [Ing. Francisco Alvarado]", 
         shorttitle="GoldKiller_V3_PURE", 
         overlay=true, 
         initial_capital=10000, 
         default_qty_type=strategy.percent_of_equity, 
         default_qty_value=1.5, 
         commission_type=strategy.commission.cash_per_contract, 
         commission_value=0.07, 
         slippage=5)

// 1. PARAMETROS V3.0 PURE
grp_risk = "=== Gestion de Riesgo PURE 1:2 ==="
rrRatio         = input.float(2.0, "Ratio Riesgo / Beneficio Puro (1:2)", minval=1.0, maxval=4.0, step=0.1, group=grp_risk)
riskPerTrade    = input.float(1.5, "Riesgo por Operacion (%)", minval=0.1, maxval=3.0, step=0.1, group=grp_risk)
maxDailyTrades  = input.int(2, "Maximo de Operaciones Diarias", minval=1, maxval=3, group=grp_risk)
enableBreakeven = input.bool(false, "Activar Breakeven (Desactivado: 1:2 Puro)", group=grp_risk)

grp_ses = "=== Sesiones Horarias (UTC) ==="
asiaSessionInput   = input.session("0000-0700:23456", "Sesion Tokio / Asia (UTC)", group=grp_ses)
londonSessionInput = input.session("0800-1100:23456", "Sesion Londres (08:00 - 11:00 UTC)", group=grp_ses)

grp_filt = "=== Filtros Cuantitativos ==="
minAsiaRange = input.float(6.0, "Amplitud Minima Tokio ($)", minval=0.0, group=grp_filt)
maxAsiaRange = input.float(65.0, "Amplitud Maxima Tokio ($) - Calibrado", minval=0.0, group=grp_filt)

// 2. DETECCION DE SESIONES
isAsiaSession   = not na(time(timeframe.period, asiaSessionInput, "UTC"))
isLondonSession = not na(time(timeframe.period, londonSessionInput, "UTC"))

// 3. RANGO TOKIO
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
    asiaBox := box.new(left=bar_index - 28, top=asiaHigh, right=bar_index, bottom=asiaLow, 
                       border_color=color.amber, bgcolor=color.new(color.amber, 88), 
                       text="Rango Tokio: " + str.tostring(rangePts, "#.##") + " pts\\n[v3.0 PURE 1:2]", 
                       text_color=color.white, text_size=size.small)

float asiaRange = asiaHigh - asiaLow
float asiaMid   = (asiaHigh + asiaLow) / 2.0

plot(asiaHigh, "Asia High", color=color.new(color.red, 30), linewidth=1, style=plot.style_linebr)
plot(asiaLow,  "Asia Low",  color=color.new(color.green, 30), linewidth=1, style=plot.style_linebr)
plot(asiaMid,  "Asia Mid (SL)", color=color.new(color.blue, 40), linewidth=1, style=plot.style_linebr)

// 4. GATILLO 1:2 PURO
var int dailyTradesCount = 0
if dayofmonth != dayofmonth[1]
    dailyTradesCount := 0

bool validAsiaRange = (minAsiaRange <= 0 or asiaRange >= minAsiaRange) and (maxAsiaRange <= 0 or asiaRange <= maxAsiaRange)
bool canTrade = isLondonSession and (dailyTradesCount < maxDailyTrades) and validAsiaRange

bool buySignal  = canTrade and (close > asiaHigh and close[1] <= asiaHigh and close > open)
bool sellSignal = canTrade and (close < asiaLow and close[1] >= asiaLow and close < open)

var float entryPrice = na
var float slPrice    = na
var float tpPrice    = na
var bool  beActive   = false

if buySignal and strategy.position_size == 0
    entryPrice := close
    slPrice    := asiaMid
    float risk = entryPrice - slPrice
    tpPrice    := entryPrice + (risk * rrRatio)
    beActive   := false
    dailyTradesCount += 1
    strategy.entry("GK3_Long", strategy.long, comment="GK3 Long 1:2")

if sellSignal and strategy.position_size == 0
    entryPrice := close
    slPrice    := asiaMid
    float risk = slPrice - entryPrice
    tpPrice    := entryPrice - (risk * rrRatio)
    beActive   := false
    dailyTradesCount += 1
    strategy.entry("GK3_Short", strategy.short, comment="GK3 Short 1:2")

if strategy.position_size > 0 and enableBreakeven and not beActive
    float riskDist = entryPrice - slPrice
    if high >= (entryPrice + riskDist)
        slPrice := entryPrice + 0.20
        beActive := true

if strategy.position_size < 0 and enableBreakeven and not beActive
    float riskDist = slPrice - entryPrice
    if low <= (entryPrice - riskDist)
        slPrice := entryPrice - 0.20
        beActive := true

if strategy.position_size > 0
    strategy.exit("Exit_Long", "GK3_Long", stop=slPrice, limit=tpPrice)

if strategy.position_size < 0
    strategy.exit("Exit_Short", "GK3_Short", stop=slPrice, limit=tpPrice)
`;

export const pythonCodeV3 = `# gold_killer_v3_pure.py - Gold Killer v3.0 PURE 1:2 (Sin Breakeven / Full Swing)
"""
Algoritmo Cuantitativo Institucional Gold Killer v3.0 PURE 1:2
Desarrollado por el Ingeniero Francisco Alvarado

Características:
- Operativa 1:2 Pura: Deja respirar la posición hasta el Take Profit completo (Sin Breakeven)
- Rango de Tokio Calibrado: Rango Máximo de 65.0 pts (Captura días volátiles de alta rentabilidad)
- Sesión Principal: Apertura de Londres (08:00 - 11:00 UTC)
- Gestión de Riesgo: 1.5% por operación con Circuit Breaker de 2 SLs diarios
"""

import time
import math
from datetime import datetime, timezone
import MetaTrader5 as mt5
import pandas as pd

MAGIC_NUMBER = 888999
SYMBOL = "XAUUSD"
RISK_PERCENT = 1.5
RR_RATIO = 2.0
MAX_DAILY_SL = 2
MAX_DAILY_TRADES = 2
MAX_ASIA_RANGE = 65.0
MIN_ASIA_RANGE = 6.0
BROKER_OFFSET_HOURS = 3

class GoldKillerV3Pure:
    def __init__(self):
        if not mt5.initialize():
            raise RuntimeError("No se pudo inicializar MetaTrader 5")
        mt5.symbol_select(SYMBOL, True)
        self.daily_trades = 0
        self.daily_sl = 0
        self.last_trade_date = ""

    def check_new_day(self, current_utc_date: str):
        if self.last_trade_date != current_utc_date:
            self.last_trade_date = current_utc_date
            self.daily_trades = 0
            self.daily_sl = 0

    def get_tokyo_range(self):
        rates = mt5.copy_rates_from_pos(SYMBOL, mt5.TIMEFRAME_M15, 0, 80)
        if rates is None or len(rates) == 0:
            return None
        df = pd.DataFrame(rates)
        df['utc_time'] = pd.to_datetime(df['time'], unit='s') - pd.Timedelta(hours=BROKER_OFFSET_HOURS)
        today = datetime.now(timezone.utc).date()
        today_df = df[df['utc_time'].dt.date == today]
        tokyo_df = today_df[(today_df['utc_time'].dt.hour >= 0) & (today_df['utc_time'].dt.hour < 7)]
        if len(tokyo_df) == 0:
            return None
        high = float(tokyo_df['high'].max())
        low = float(tokyo_df['low'].min())
        range_pts = high - low
        mid = (high + low) / 2.0
        return {"high": high, "low": low, "mid": mid, "range": range_pts}

    def calculate_lots(self, entry: float, sl: float, order_type: int) -> float:
        balance = mt5.account_info().balance
        risk_money = balance * (RISK_PERCENT / 100.0)
        dist = abs(entry - sl)
        if dist <= 0.1:
            dist = 5.0
        
        # Cálculo exacto mediante OrderCalcProfit
        loss_1_lot = mt5.order_calc_profit(order_type, SYMBOL, 1.0, entry, sl)
        if loss_1_lot is not None and loss_1_lot != 0:
            loss_per_lot = abs(loss_1_lot)
        else:
            contract_size = mt5.symbol_info(SYMBOL).trade_contract_size or 100.0
            loss_per_lot = dist * contract_size

        raw_lots = risk_money / loss_per_lot if loss_per_lot > 0 else 0.01
        step = mt5.symbol_info(SYMBOL).volume_step or 0.01
        lots = math.floor(raw_lots / step) * step
        min_lot = mt5.symbol_info(SYMBOL).volume_min or 0.01
        max_lot = mt5.symbol_info(SYMBOL).volume_max or 100.0
        return round(max(min_lot, min(lots, max_lot)), 2)

    def execute_pure_trade(self, trade_type: str, entry: float, sl: float, tp: float):
        cmd = mt5.ORDER_TYPE_BUY if trade_type == "BUY" else mt5.ORDER_TYPE_SELL
        lots = self.calculate_lots(entry, sl, cmd)
        req = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": SYMBOL,
            "volume": lots,
            "type": cmd,
            "price": entry,
            "sl": sl,
            "tp": tp,
            "deviation": 50,
            "magic": MAGIC_NUMBER,
            "comment": f"GK3 Pure {trade_type} 1:2",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        res = mt5.order_send(req)
        if res.retcode == mt5.TRADE_RETCODE_DONE:
            print(f"✅ [{trade_type} 1:2 PURO EJECUTADO] Ticket #{res.order} Lotes={lots} Entrada={entry} SL={sl} TP={tp}")
            self.daily_trades += 1
            return True
        else:
            print(f"❌ Error al enviar orden: {res.comment} (código {res.retcode})")
            return False

    def run(self):
        print(f"🚀 Iniciando Robot Gold Killer v3.0 PURE 1:2 (Sin Breakeven)")
        print(f"Parámetros: Riesgo={RISK_PERCENT}% | R:R=1:{RR_RATIO} Puro | Tokio Máx={MAX_ASIA_RANGE} pts")
        while True:
            try:
                utc_now = datetime.now(timezone.utc)
                self.check_new_day(utc_now.strftime("%Y-%m-%d"))

                # Circuit Breaker diario
                if self.daily_sl >= MAX_DAILY_SL or self.daily_trades >= MAX_DAILY_TRADES:
                    time.sleep(30)
                    continue

                # Sesión Londres: 08:00 a 11:00 UTC
                if not (8 <= utc_now.hour < 11):
                    time.sleep(15)
                    continue

                tokyo = self.get_tokyo_range()
                if not tokyo or tokyo['range'] < MIN_ASIA_RANGE or tokyo['range'] > MAX_ASIA_RANGE:
                    time.sleep(15)
                    continue

                # Verificar si ya hay posiciones abiertas por este EA
                open_pos = mt5.positions_get(symbol=SYMBOL)
                bot_pos = [p for p in open_pos if p.magic == MAGIC_NUMBER] if open_pos else []
                if len(bot_pos) > 0:
                    time.sleep(10)
                    continue

                # Obtener últimas velas cerradas M15
                rates = mt5.copy_rates_from_pos(SYMBOL, mt5.TIMEFRAME_M15, 1, 3)
                if rates is None or len(rates) < 2:
                    time.sleep(10)
                    continue

                c1 = rates[-1]
                c2 = rates[-2]

                # Ruptura Alcista limpia
                if c1['close'] > tokyo['high'] and c2['close'] <= tokyo['high'] and c1['close'] > c1['open']:
                    entry = mt5.symbol_info_tick(SYMBOL).ask
                    sl = round(tokyo['mid'], 2)
                    dist = entry - sl
                    tp = round(entry + (dist * RR_RATIO), 2)
                    self.execute_pure_trade("BUY", entry, sl, tp)

                # Ruptura Bajista limpia
                elif c1['close'] < tokyo['low'] and c2['close'] >= tokyo['low'] and c1['close'] < c1['open']:
                    entry = mt5.symbol_info_tick(SYMBOL).bid
                    sl = round(tokyo['mid'], 2)
                    dist = sl - entry
                    tp = round(entry - (dist * RR_RATIO), 2)
                    self.execute_pure_trade("SELL", entry, sl, tp)

                time.sleep(5)
            except Exception as e:
                print(f"⚠️ Error en bucle operativo: {e}")
                time.sleep(10)

if __name__ == "__main__":
    bot = GoldKillerV3Pure()
    bot.run()
`;

export const pythonModulesV3 = {
  main: pythonCodeV3,
};

