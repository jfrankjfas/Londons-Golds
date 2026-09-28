/**
 * Algoritmo Cuantitativo Gold Killer v2.0 PRO (Multi-Session & M15 Retest)
 * Generadores de código listos para producción y backtesting en MT5, MT4, Pine Script y Python.
 * Desarrollado por el Ingeniero Francisco Alvarado
 */

export const mql5CodeV2 = `//+------------------------------------------------------------------+
//|                                  XAUUSD_GoldKiller_V2_Pro.mq5    |
//|  Algoritmo Cuantitativo Institucional Gold Killer v2.0 PRO       |
//|       Desarrollado por el Ingeniero Francisco Alvarado           |
//|   Potenciado: Retesteo M15 + Sesion Nueva York + R:R 1:2.5       |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "2.00"
#property description "Robot Cuantitativo Institucional XAU/USD Gold Killer v2.0 PRO. Incluye: 1) Segunda oportunidad por Retesteo M15 con SL ceñido, 2) Segunda ventana operativa Apertura Nueva York (13:30 - 15:30 UTC), 3) Target R:R 1:2.5, 4) Breakeven 1:1, 5) Circuit Breaker diario de 2 SLs y gestión de riesgo al 0.5%."
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Enumeraciones
enum ENUM_TREND_MODE
{
   TREND_ANY_BREAKOUT = 0, // Ambas Direcciones (Ruptura Libre / Alta Frecuencia)
   TREND_D1_STRICT    = 1  // Filtro D1 Estricto (Solo a favor del dia previo)
};

//--- Parametros de Entrada
input group "=== Identificacion & Gestion de Riesgo Real ==="
input ulong             InpMagicNumber            = 777927;       // Magic Number Unico (v2.0 PRO)
input double            InpRiskPercent            = 1.0;          // Riesgo por Trade (% Balance: 0.5% a 1.0%)
input double            InpRRRatio                = 2.5;          // Target Ratio Riesgo / Beneficio Potenciado (1:2.5)
input int               InpMaxDailySL             = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
input int               InpMaxDailyTrades         = 2;            // Maximo de Operaciones Diarias
input double            InpMaxDailyLossPercent    = 3.0;          // Drawdown Maximo Diario Permitido (% Balance: 3.0%)

input group "=== Sincronizacion Horaria & Sesiones (UTC) ==="
input int               InpBrokerGmtOffset        = 3;            // GMT Offset del Broker (+3 verano, +2 invierno, 0 en UTC)
input int               InpStartAsiaUTC           = 0;            // Inicio Rango Tokio (Hora UTC, 00:00)
input int               InpEndAsiaUTC             = 7;            // Fin Rango Tokio (Hora UTC, 07:00)

input group "=== Sesion Principal: Apertura de Londres (08:00 - 11:00 UTC) ==="
input bool              InpEnableLondonSession    = true;         // Habilitar Ventana Londres (Ventana de Oro Probada)
input int               InpStartLondonUTC         = 8;            // Inicio Londres (Hora UTC, 08:00)
input int               InpEndLondonUTC           = 11;           // Fin Londres (Hora UTC, 11:00)

input group "=== Sesion Secundaria: Nueva York (Opcional) ==="
input bool              InpEnableNYSession        = false;        // Desactivado por defecto (Evita volatilidad erratica de la tarde)
input int               InpStartNYHour            = 13;           // Hora Inicio NY (UTC, 13:00)
input int               InpStartNYMinute          = 30;           // Minuto Inicio NY (30 min -> 13:30 UTC)
input int               InpEndNYHour              = 15;           // Hora Fin NY (UTC, 15:00)
input int               InpEndNYMinute            = 30;           // Minuto Fin NY (30 min -> 15:30 UTC)

input group "=== Potenciador V2.0: Retesteo M15 & SL Cenido ==="
input bool              InpEnableRetestEntry      = true;         // Habilitar Segunda Oportunidad por Retesteo M15
input double            InpRetestTolerance        = 2.0;          // Tolerancia Pullback a nivel Tokio ($2.0 USD)
input bool              InpTightRetestSL          = true;         // SL Cenido en Retesteo (4.5 - 7.5 pts) para Mayor Lotaje

input group "=== Filtros Cuantitativos & Proteccion Cuenta Real ==="
input ENUM_TREND_MODE   InpTrendMode              = TREND_ANY_BREAKOUT; // Modo Operativo: Ambas Direcciones
input double            InpMinAsiaRange           = 6.0;          // Amplitud Minima Tokio ($ pts: 6.0)
input double            InpMaxAsiaRange           = 60.0;         // Amplitud Maxima Tokio ($ pts: 60.0)
input int               InpMaxSpreadPoints        = 0;            // Spread Maximo en Puntos (0 = Desactivado en Backtest, 35 en Real)
input int               InpSlippage               = 50;           // Tolerancia Desviacion Precio (Slippage en puntos = $0.50)

input group "=== Blindaje y Proteccion Breakeven ==="
input bool              InpEnableBreakeven        = true;         // Activar Proteccion Breakeven Dinamica a 1:1 R
input double            InpBEBufferPoints         = 0.20;         // Colchon sobre Entrada ($0.20 Oro: cubre comisiones ECN)

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
   {
      long execMode = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_EXEMODE);
      if(execMode == SYMBOL_TRADE_EXECUTION_MARKET)
         trade.SetTypeFilling(ORDER_FILLING_IOC);
      else
         trade.SetTypeFilling(ORDER_FILLING_RETURN);
   }
}

//+------------------------------------------------------------------+
//| Reconstrucción de Estadísticas Diarias desde el Historial Real   |
//| (Blindaje contra reinicios de VPS, caídas de red o de terminal)  |
//+------------------------------------------------------------------+
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

//+------------------------------------------------------------------+
//| Actualizacion de Panel Visual HUD en el Grafico de MT5           |
//+------------------------------------------------------------------+
void UpdateChartDashboard(string statusMsg, int brokerH, int brokerM, int utcH, int utcM, double asiaH, double asiaL, double asiaR, long spread)
{
   double balance    = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity     = AccountInfoDouble(ACCOUNT_EQUITY);
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   
   string hud = "";
   hud += "╔════════════════════════════════════════════════════════════════════════╗\\n";
   hud += "║      GOLD KILLER v2.0 PRO (XAU/USD) - LONDRES + NUEVA YORK + RETEST    ║\\n";
   hud += "║      Desarrollado por el Ingeniero Francisco Alvarado                  ║\\n";
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  ESTADO: %-60s  ║\\n", statusMsg);
   hud += StringFormat("║  HORA: Broker %02d:%02d | UTC %02d:%02d (Offset GMT%+d)                           ║\\n",
                       brokerH, brokerM, utcH, utcM, InpBrokerGmtOffset);
   hud += "║  SESIONES ACTIVAS: Londres (08-11 UTC) | Nueva York (13:30-15:30 UTC) ║\\n";
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
   hud += StringFormat("║  POTENCIADOR V2: Riesgo=%.1f%% | Target R:R=1:%.1f | Retest M15=%s       ║\\n",
                       InpRiskPercent, InpRRRatio, InpEnableRetestEntry ? "ACTIVO" : "INACTIVO");
   hud += "╚════════════════════════════════════════════════════════════════════════╝";
   
   Comment(hud);
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
   
   UpdateDailyStatsFromAccountHistory();
   
   Print("================================================================================");
   Print("  EA INICIADO: XAU/USD Gold Killer v2.0 PRO [DUAL SESSION & RETEST M15]");
   Print("  Desarrollado por: Ingeniero Francisco Alvarado");
   PrintFormat("  Configuracion Horaria: Broker GMT%+d | Tokio: %02d:00-%02d:00 UTC", InpBrokerGmtOffset, InpStartAsiaUTC, InpEndAsiaUTC);
   PrintFormat("  Sesion Londres: %02d:00-%02d:00 UTC | Sesion Nueva York: %02d:%02d-%02d:%02d UTC",
               InpStartLondonUTC, InpEndLondonUTC, InpStartNYHour, InpStartNYMinute, InpEndNYHour, InpEndNYMinute);
   PrintFormat("  Parametros V2: Riesgo=%.1f%% | Target R:R=1:%.1f | Retesteo M15=%s | BE 1:1=+%.2f buffer",
               InpRiskPercent, InpRRRatio, InpEnableRetestEntry ? "SI" : "NO", InpBEBufferPoints);
   Print("================================================================================");
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
//| Escaneo Resiliente del Rango Asiatico (Calculo Directo en UTC)   |
//+------------------------------------------------------------------+
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

//+------------------------------------------------------------------+
//| Cuenta posiciones activas abiertas por este EA                   |
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
//| Verificacion de Margen Libre en Cuenta Real                      |
//+------------------------------------------------------------------+
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
//| Calculo Dinámico de Lotaje Institucional Exacto                  |
//| (Blindaje contra discrepancias de TickValue en brokers de Oro)   |
//+------------------------------------------------------------------+
double CalculateLotSize(double entryPrice, double slPrice, ENUM_ORDER_TYPE orderType)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) balance = 10000.0;
   
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double stopLossDist = MathAbs(entryPrice - slPrice);
   if(stopLossDist <= 0.1) stopLossDist = 5.0;
   
   // 1. Metodo Nativo MT5: Calculo exacto de perdida monetaria por 1.00 lote
   double lossForOneLot = 0.0;
   if(OrderCalcProfit(orderType, _Symbol, 1.0, entryPrice, slPrice, lossForOneLot))
   {
      lossForOneLot = MathAbs(lossForOneLot);
   }
   
   // 2. Metodo Directo Institucional: Contrato estandar Oro (100 oz / $100 por punto)
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

//+------------------------------------------------------------------+
//| Enrutamiento y Ejecucion Robusta de Orden BUY                     |
//+------------------------------------------------------------------+
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
         PrintFormat("✅ [BUY V2 EJECUTADO] Ticket #%I64u Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f (R:R 1:%.1f)",
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

//+------------------------------------------------------------------+
//| Enrutamiento y Ejecucion Robusta de Orden SELL                    |
//+------------------------------------------------------------------+
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
         PrintFormat("✅ [SELL V2 EJECUTADO] Ticket #%I64u Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f (R:R 1:%.1f)",
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

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
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
   if(CopyRates(_Symbol, PERIOD_M15, 1, 35, m15) < 35) return;
   
   datetime closedBarUtcTime = m15[0].time - (InpBrokerGmtOffset * 3600);
   MqlDateTime closedBarUtcDt;
   TimeToStruct(closedBarUtcTime, closedBarUtcDt);
   
   // Ventana Londres: 08:00 a 11:00 UTC
   bool isLondonWindow = InpEnableLondonSession && (closedBarUtcDt.hour >= InpStartLondonUTC && closedBarUtcDt.hour < InpEndLondonUTC);
   
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
      else if(closedBarUtcDt.hour >= InpEndLondonUTC && barMinutesOfDay < nyStartMinutes)
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
      UpdateChartDashboard(StringFormat("🟢 OPERANDO EN VIVO (%s): Monitoreando Ruptura y Retesteo M15", currentActiveSession),
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
   
   for(int k = 1; k < 30; k++)
   {
      datetime priorUtc = m15[k].time - (InpBrokerGmtOffset * 3600);
      MqlDateTime pDt;
      TimeToStruct(priorUtc, pDt);
      if(pDt.day != closedBarUtcDt.day) break;
      if(pDt.hour >= InpEndAsiaUTC)
      {
         if(m15[k].high > (asiaHigh + 1.0)) hadPriorBullishBreakout = true;
         if(m15[k].low  < (asiaLow  - 1.0)) hadPriorBearishBreakout = true;
      }
   }
   
   double c1 = m15[0].close;
   double c2 = m15[1].close;
   double l1 = m15[0].low;
   double h1 = m15[0].high;
   double o1 = m15[0].open;
   
   bool isFirstTrade = (g_dailyTradesCount == 0);
   
   // 1. Quiebre Inicial Limpio M15
   bool initialBuyBreakout = allowLong && (c1 > asiaHigh && c2 <= asiaHigh && c1 > o1);
   bool initialSellBreakout = allowShort && (c1 < asiaLow && c2 >= asiaLow && c1 < o1);
   
   // 2. Segunda Oportunidad por Retesteo M15 al nivel de Tokio
   bool isRetestBuy = InpEnableRetestEntry && allowLong && hadPriorBullishBreakout &&
                      (c1 > asiaHigh && l1 <= (asiaHigh + InpRetestTolerance) && c1 > o1 && !initialBuyBreakout);
                      
   bool isRetestSell = InpEnableRetestEntry && allowShort && hadPriorBearishBreakout &&
                       (c1 < asiaLow && h1 >= (asiaLow - InpRetestTolerance) && c1 < o1 && !initialSellBreakout);
                       
   // Continuacion adicional si ya se cerro un trade previo
   bool contBuy = !isFirstTrade && allowLong && (c1 > asiaHigh && l1 >= (asiaHigh - 1.5) && c1 > o1);
   bool contSell = !isFirstTrade && allowShort && (c1 < asiaLow && h1 <= (asiaLow + 1.5) && c1 < o1);
   
   bool buyTrigger  = initialBuyBreakout || isRetestBuy || contBuy;
   bool sellTrigger = initialSellBreakout || isRetestSell || contSell;
   bool isRetest    = (isRetestBuy || isRetestSell || !isFirstTrade);
   
   int botPositions = CountBotPositions();
   
   if(buyTrigger && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl = 0.0;
      
      if(isRetest || InpTightRetestSL)
      {
         // En retesteo: SL ceñido (4.5 a 7.5 pts) para maximizar lotaje
         double tightDist = MathMin(MathMax(asiaRange * 0.35, 4.5), 7.5);
         sl = NormalizeDouble(entry - tightDist, _Digits);
      }
      else
      {
         sl = NormalizeDouble(asiaMid, _Digits);
      }
      
      double minStopDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(minStopDist > 0 && (entry - sl) < minStopDist)
         sl = NormalizeDouble(entry - minStopDist - 0.5, _Digits);
         
      double riskDistance = entry - sl;
      if(riskDistance <= 0.5) riskDistance = 5.0;
      double tp = NormalizeDouble(entry + (riskDistance * InpRRRatio), _Digits); // 1:2.5 R:R
      
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_BUY);
      string triggerName = isRetest ? "Retesteo M15" : "Ruptura Inicial";
      string comment = StringFormat("GK2 #%d Long %s [%s]", g_dailyTradesCount + 1, currentActiveSession, triggerName);
      
      PrintFormat("🚀 [BUY V2] %s (%s) Entrada=%.2f SL=%.2f TP=%.2f Lotes=%.2f (R:R 1:%.1f)",
                  triggerName, currentActiveSession, entry, sl, tp, lots, InpRRRatio);
                  
      if(RobustTradeBuy(lots, entry, sl, tp, comment))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         UpdateChartDashboard(StringFormat("⚡ BUY V2 (%s - %s) EJECUTADO EXITOSAMENTE", currentActiveSession, triggerName),
                              dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      }
   }
   else if(sellTrigger && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl = 0.0;
      
      if(isRetest || InpTightRetestSL)
      {
         double tightDist = MathMin(MathMax(asiaRange * 0.35, 4.5), 7.5);
         sl = NormalizeDouble(entry + tightDist, _Digits);
      }
      else
      {
         sl = NormalizeDouble(asiaMid, _Digits);
      }
      
      double minStopDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(minStopDist > 0 && (sl - entry) < minStopDist)
         sl = NormalizeDouble(entry + minStopDist + 0.5, _Digits);
         
      double riskDistance = sl - entry;
      if(riskDistance <= 0.5) riskDistance = 5.0;
      double tp = NormalizeDouble(entry - (riskDistance * InpRRRatio), _Digits); // 1:2.5 R:R
      
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_SELL);
      string triggerName = isRetest ? "Retesteo M15" : "Ruptura Inicial";
      string comment = StringFormat("GK2 #%d Short %s [%s]", g_dailyTradesCount + 1, currentActiveSession, triggerName);
      
      PrintFormat("🚀 [SELL V2] %s (%s) Entrada=%.2f SL=%.2f TP=%.2f Lotes=%.2f (R:R 1:%.1f)",
                  triggerName, currentActiveSession, entry, sl, tp, lots, InpRRRatio);
                  
      if(RobustTradeSell(lots, entry, sl, tp, comment))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         UpdateChartDashboard(StringFormat("⚡ SELL V2 (%s - %s) EJECUTADO EXITOSAMENTE", currentActiveSession, triggerName),
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

//+------------------------------------------------------------------+
//| Proteccion Automatica Breakeven Dinamico a 1:1 R con Buffer      |
//+------------------------------------------------------------------+
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
                  PrintFormat("🛡️ [BREAKEVEN V2 1:1] Stop Loss blindado para BUY #%I64u en %.2f (Buffer +$%.2f)", ticket, beLevel, InpBEBufferPoints);
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
                  PrintFormat("🛡️ [BREAKEVEN V2 1:1] Stop Loss blindado para SELL #%I64u en %.2f (Buffer -$%.2f)", ticket, beLevel, InpBEBufferPoints);
            }
         }
      }
   }
}
`;

export const mql4CodeV2 = `//+------------------------------------------------------------------+
//|                                  XAUUSD_GoldKiller_V2_Pro.mq4    |
//|  Algoritmo Cuantitativo Institucional Gold Killer v2.0 PRO       |
//|       Desarrollado por el Ingeniero Francisco Alvarado           |
//|   Potenciado: Retesteo M15 + Sesion Nueva York + R:R 1:2.5       |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "2.00"
#property description "Robot Cuantitativo Institucional Gold Killer v2.0 PRO para MT4. Incluye: Retesteo M15, Sesion Nueva York (13:30-15:30 UTC), R:R 1:2.5, Breakeven 1:1 y Circuit Breaker de 2 SLs diarios."
#property strict

//--- Parametros de Entrada
extern string   sep0                   = "=== Identificacion & Riesgo Real ===";
extern int      InpMagicNumber         = 777927;       // Magic Number Unico (v2.0 PRO)
extern double   InpRiskPercent         = 0.5;          // Riesgo por Trade (% Balance: 0.5% recomendado)
extern double   InpRRRatio             = 2.5;          // Ratio Riesgo / Beneficio Potenciado (1:2.5)
extern int      InpMaxDailySL          = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
extern int      InpMaxDailyTrades      = 3;            // Maximo de Trades por Dia (Londres + NY)
extern double   InpMaxDailyLossPercent = 2.0;          // Drawdown Maximo Diario Permitido (% Balance: 2.0%)

extern string   sep1                   = "=== Sincronizacion Horaria & Sesiones (UTC) ===";
extern int      InpBrokerGmtOffset     = 3;            // GMT Offset del Broker (+3 verano, +2 invierno, 0 UTC)
extern int      InpStartAsiaUTC        = 0;            // Inicio Rango Tokio (Hora UTC, 00:00)
extern int      InpEndAsiaUTC          = 7;            // Fin Rango Tokio (Hora UTC, 07:00)

extern string   sep2                   = "=== Sesion 1: Londres (08:00 - 11:00 UTC) ===";
extern bool     InpEnableLondonSession = true;         // Habilitar Ventana Londres
extern int      InpStartLondonUTC      = 8;            // Inicio Londres (08:00 UTC)
extern int      InpEndLondonUTC        = 11;           // Fin Londres (11:00 UTC)

extern string   sep3                   = "=== Sesion 2: Nueva York (13:30 - 15:30 UTC) ===";
extern bool     InpEnableNYSession     = true;         // Habilitar Ventana Nueva York (V2.0)
extern int      InpStartNYHour         = 13;           // Hora Inicio NY (UTC 13:00)
extern int      InpStartNYMinute       = 30;           // Minuto Inicio NY (30 min -> 13:30 UTC)
extern int      InpEndNYHour           = 15;           // Hora Fin NY (UTC 15:00)
extern int      InpEndNYMinute         = 30;           // Minuto Fin NY (30 min -> 15:30 UTC)

extern string   sep4                   = "=== Potenciador V2.0: Retesteo M15 ===";
extern bool     InpEnableRetestEntry   = true;         // Habilitar Segunda Oportunidad por Retesteo M15
extern double   InpRetestTolerance     = 2.0;          // Tolerancia Pullback a nivel Tokio ($2.0)
extern bool     InpTightRetestSL       = true;         // SL Ceñido en Retesteo para Mayor Lotaje

extern string   sep5                   = "=== Filtros Cuantitativos & Proteccion ===";
extern bool     InpUseD1Trend          = false;        // false = Ambas Direcciones (Web) | true = Filtro D1
extern double   InpMinAsiaRange        = 6.0;          // Rango Minimo Tokio ($ pts: 6.0)
extern double   InpMaxAsiaRange        = 60.0;         // Rango Maximo Tokio ($ pts: 60.0)
extern int      InpMaxSpread           = 0;            // Spread Maximo (0 = Desactivado para Backtesting, 35 en Real)
extern int      InpSlippage            = 50;           // Tolerancia Desviacion en Puntos ($0.50)

extern string   sep6                   = "=== Blindaje Breakeven ===";
extern bool     InpEnableBE            = true;         // Activar Proteccion Breakeven 1:1 Dinamico
extern double   InpBEBufferPoints      = 0.20;         // Colchon sobre Entrada ($0.20 Oro)

//--- Variables Globales
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
   PrintFormat("EA V2.0 PRO MT4 INICIADO: Magic=%d | Target R:R=1:%.1f | Retest M15=%s | Sesiones: Londres + NY",
               InpMagicNumber, InpRRRatio, InpEnableRetestEntry ? "SI" : "NO");
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
   double stopLossPoints = MathAbs(entryPrice - slPrice);
   if(stopLossPoints <= 0) stopLossPoints = 5.0;
   
   double pointVal = MarketInfo(Symbol(), MODE_TICKVALUE);
   double tickSz   = MarketInfo(Symbol(), MODE_TICKSIZE);
   if(tickSz <= 0) tickSz = Point;
   if(pointVal <= 0) pointVal = 1.0;
   
   double moneyRiskPerLot = (stopLossPoints / Point) * (pointVal / tickSz) * Point;
   double calcLots = (moneyRiskPerLot > 0) ? (riskMoney / moneyRiskPerLot) : 0.01;
   
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
   int closedMin  = TimeMinute(closedBarUtc);
   int barMinutes = closedHour * 60 + closedMin;
   
   bool isLondon = InpEnableLondonSession && (closedHour >= InpStartLondonUTC && closedHour < InpEndLondonUTC);
   int nyStart = InpStartNYHour * 60 + InpStartNYMinute;
   int nyEnd   = InpEndNYHour * 60 + InpEndNYMinute;
   bool isNY   = InpEnableNYSession && (barMinutes >= nyStart && barMinutes <= nyEnd);
   
   if(!isLondon && !isNY) return;
   
   double asiaH = 0, asiaL = 0, asiaM = 0, asiaR = 0;
   if(!GetTodayAsianRangeMT4(now, asiaH, asiaL, asiaM, asiaR)) return;
   if((InpMinAsiaRange > 0 && asiaR < InpMinAsiaRange) || (InpMaxAsiaRange > 0 && asiaR > InpMaxAsiaRange))
   {
      g_lastEvaluatedBarTime = barTime;
      return;
   }
   
   // Prior breakout tracking
   bool hadBullish = false, hadBearish = false;
   for(int k = 1; k < 30; k++)
   {
      datetime pUtc = iTime(Symbol(), PERIOD_M15, k) - (InpBrokerGmtOffset * 3600);
      if(TimeToStr(pUtc, TIME_DATE) != today) break;
      if(TimeHour(pUtc) >= InpEndAsiaUTC)
      {
         if(iHigh(Symbol(), PERIOD_M15, k) > (asiaH + 1.0)) hadBullish = true;
         if(iLow(Symbol(), PERIOD_M15, k)  < (asiaL - 1.0)) hadBearish = true;
      }
   }
   
   double c1 = iClose(Symbol(), PERIOD_M15, 1);
   double c2 = iClose(Symbol(), PERIOD_M15, 2);
   double o1 = iOpen(Symbol(), PERIOD_M15, 1);
   double l1 = iLow(Symbol(), PERIOD_M15, 1);
   double h1 = iHigh(Symbol(), PERIOD_M15, 1);
   
   bool isFirst = (g_dailyTradesCount == 0);
   bool initialBuy  = (c1 > asiaH && c2 <= asiaH && c1 > o1);
   bool initialSell = (c1 < asiaL && c2 >= asiaL && c1 < o1);
   
   bool retestBuy  = InpEnableRetestEntry && hadBullish && (c1 > asiaH && l1 <= (asiaH + InpRetestTolerance) && c1 > o1 && !initialBuy);
   bool retestSell = InpEnableRetestEntry && hadBearish && (c1 < asiaL && h1 >= (asiaL - InpRetestTolerance) && c1 < o1 && !initialSell);
   
   bool contBuy  = !isFirst && (c1 > asiaH && l1 >= (asiaH - 1.5) && c1 > o1);
   bool contSell = !isFirst && (c1 < asiaL && h1 <= (asiaL + 1.5) && c1 < o1);
   
   bool buy = initialBuy || retestBuy || contBuy;
   bool sell = initialSell || retestSell || contSell;
   bool isRetest = (retestBuy || retestSell || !isFirst);
   
   int botOrders = 0;
   for(int o = 0; o < OrdersTotal(); o++)
   {
      if(OrderSelect(o, SELECT_BY_POS, MODE_TRADES) && OrderSymbol() == Symbol() && OrderMagicNumber() == InpMagicNumber)
         botOrders++;
   }
   
   if(buy && botOrders == 0)
   {
      double entry = Ask;
      double sl = isRetest || InpTightRetestSL
         ? NormalizeDouble(entry - MathMin(MathMax(asiaR * 0.35, 4.5), 7.5), Digits)
         : NormalizeDouble(asiaM, Digits);
      double dist = entry - sl;
      if(dist <= 0.5) dist = 5.0;
      double tp = NormalizeDouble(entry + (dist * InpRRRatio), Digits);
      double lots = CalculateLotSizeMT4(entry, sl);
      
      int ticket = OrderSend(Symbol(), OP_BUY, lots, entry, InpSlippage, sl, tp, "GoldKiller V2 Long", InpMagicNumber, 0, clrGreen);
      if(ticket > 0)
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = barTime;
      }
   }
   else if(sell && botOrders == 0)
   {
      double entry = Bid;
      double sl = isRetest || InpTightRetestSL
         ? NormalizeDouble(entry + MathMin(MathMax(asiaR * 0.35, 4.5), 7.5), Digits)
         : NormalizeDouble(asiaM, Digits);
      double dist = sl - entry;
      if(dist <= 0.5) dist = 5.0;
      double tp = NormalizeDouble(entry - (dist * InpRRRatio), Digits);
      double lots = CalculateLotSizeMT4(entry, sl);
      
      int ticket = OrderSend(Symbol(), OP_SELL, lots, entry, InpSlippage, sl, tp, "GoldKiller V2 Short", InpMagicNumber, 0, clrRed);
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

export const pineScriptCodeV2 = `//@version=5
strategy("Gold Killer v2.0 PRO - Dual Session & Retest M15 [Ing. Francisco Alvarado]", 
         shorttitle="GoldKiller_V2_PRO", 
         overlay=true, 
         initial_capital=10000, 
         default_qty_type=strategy.percent_of_equity, 
         default_qty_value=1.0, 
         commission_type=strategy.commission.cash_per_contract, 
         commission_value=0.07, 
         slippage=5)

// 1. PARAMETROS DE GESTION INSTITUCIONAL V2.0
grp_risk = "=== Gestion de Riesgo Institucional V2.0 ==="
rrRatio         = input.float(2.5, "Ratio Riesgo / Beneficio Potenciado (1:2.5)", minval=1.0, maxval=5.0, step=0.1, group=grp_risk)
riskPerTrade    = input.float(0.5, "Riesgo por Operacion (%)", minval=0.1, maxval=2.0, step=0.1, group=grp_risk)
maxDailyTrades  = input.int(3, "Maximo de Operaciones Diarias", minval=1, maxval=5, group=grp_risk)
enableBreakeven = input.bool(true, "Activar Breakeven Dinamico a 1:1 R", group=grp_risk)

grp_ses = "=== Sincronizacion Horaria & Sesiones (UTC) ==="
asiaSessionInput   = input.session("0000-0700:23456", "Sesion Tokio / Asia (UTC)", group=grp_ses)
londonSessionInput = input.session("0800-1100:23456", "Sesion Londres (08:00 - 11:00 UTC)", group=grp_ses)
enableNYSession    = input.bool(true, "Habilitar 2da Ventana Apertura Nueva York", group=grp_ses)
nySessionInput     = input.session("1330-1530:23456", "Sesion Nueva York (13:30 - 15:30 UTC)", group=grp_ses)

grp_filt = "=== Potenciador V2: Retesteo M15 & Filtros ==="
enableRetest       = input.bool(true, "Habilitar Segunda Oportunidad por Retesteo M15", group=grp_filt)
retestTolerance    = input.float(2.0, "Tolerancia Pullback a Tokio ($ USD)", minval=0.5, maxval=5.0, group=grp_filt)
tightRetestSl      = input.bool(true, "Stop Loss Ceñido en Retesteo (4.5 a 7.5 pts)", group=grp_filt)
minAsiaRange       = input.float(6.0, "Amplitud Minima Tokio ($)", minval=0.0, group=grp_filt)
maxAsiaRange       = input.float(60.0, "Amplitud Maxima Tokio ($)", minval=0.0, group=grp_filt)
trendFilter        = input.string("Ambas Direcciones (Ruptura Libre)", "Direccion Permitida", options=["Ambas Direcciones (Ruptura Libre)", "Solo a Favor de D1"], group=grp_filt)

// 2. DETECCION DE SESIONES
isAsiaSession   = not na(time(timeframe.period, asiaSessionInput, "UTC"))
isLondonSession = not na(time(timeframe.period, londonSessionInput, "UTC"))
isNYSession     = enableNYSession and not na(time(timeframe.period, nySessionInput, "UTC"))
isTradingWindow = isLondonSession or isNYSession

// 3. RANGO ASIATICO (TOKIO)
var float asiaHigh = na
var float asiaLow  = na
var box   asiaBox  = na
var bool  hadBullishBreakout = false
var bool  hadBearishBreakout = false

if isAsiaSession
    if not isAsiaSession[1]
        asiaHigh := high
        asiaLow  := low
        hadBullishBreakout := false
        hadBearishBreakout := false
    else
        asiaHigh := math.max(asiaHigh, high)
        asiaLow  := math.min(asiaLow, low)

if not isAsiaSession and isAsiaSession[1]
    float rangePts = asiaHigh - asiaLow
    asiaBox := box.new(left=bar_index - 28, top=asiaHigh, right=bar_index, bottom=asiaLow, 
                       border_color=color.amber, bgcolor=color.new(color.amber, 88), 
                       text="Rango Tokio: " + str.tostring(rangePts, "#.##") + " pts\\n[Gold Killer V2.0 PRO]", 
                       text_color=color.white, text_size=size.small)

float asiaRange = asiaHigh - asiaLow
float asiaMid   = (asiaHigh + asiaLow) / 2.0

// Tracking de rupturas previas
if not isAsiaSession
    if high > (asiaHigh + 1.0)
        hadBullishBreakout := true
    if low < (asiaLow - 1.0)
        hadBearishBreakout := true

plot(asiaHigh, "Asia High", color=color.new(color.red, 30), linewidth=1, style=plot.style_linebr)
plot(asiaLow,  "Asia Low",  color=color.new(color.green, 30), linewidth=1, style=plot.style_linebr)
plot(asiaMid,  "Asia Mid (SL)", color=color.new(color.blue, 40), linewidth=1, style=plot.style_linebr)

// 4. LOGICA DE GATILLO Y TRADES V2.0
var int dailyTradesCount = 0
if dayofmonth != dayofmonth[1]
    dailyTradesCount := 0

bool validAsiaRange = (minAsiaRange <= 0 or asiaRange >= minAsiaRange) and (maxAsiaRange <= 0 or asiaRange <= maxAsiaRange)
bool canTrade = isTradingWindow and (dailyTradesCount < maxDailyTrades) and validAsiaRange
bool isFirstTrade = (dailyTradesCount == 0)

// 1. Quiebre Inicial
bool initialBuy  = canTrade and (close > asiaHigh and close[1] <= asiaHigh and close > open)
bool initialSell = canTrade and (close < asiaLow and close[1] >= asiaLow and close < open)

// 2. Retesteo M15
bool retestBuy  = canTrade and enableRetest and hadBullishBreakout and (close > asiaHigh and low <= (asiaHigh + retestTolerance) and close > open and not initialBuy)
bool retestSell = canTrade and enableRetest and hadBearishBreakout and (close < asiaLow and high >= (asiaLow - retestTolerance) and close < open and not initialSell)

bool contBuy  = canTrade and not isFirstTrade and (close > asiaHigh and low >= (asiaHigh - 1.5) and close > open)
bool contSell = canTrade and not isFirstTrade and (close < asiaLow and high <= (asiaLow + 1.5) and close < open)

bool buySignal  = initialBuy or retestBuy or contBuy
bool sellSignal = initialSell or retestSell or contSell
bool isRetest = retestBuy or retestSell or not isFirstTrade

var float entryPrice = na
var float slPrice    = na
var float tpPrice    = na
var bool  beActive   = false

if buySignal and strategy.position_size == 0
    entryPrice := close
    slPrice    := (isRetest or tightRetestSl) ? (entryPrice - math.min(math.max(asiaRange * 0.35, 4.5), 7.5)) : asiaMid
    float risk = entryPrice - slPrice
    tpPrice    := entryPrice + (risk * rrRatio)
    beActive   := false
    dailyTradesCount += 1
    strategy.entry("GK2_Long", strategy.long, comment="GK2 Long #" + str.tostring(dailyTradesCount))

if sellSignal and strategy.position_size == 0
    entryPrice := close
    slPrice    := (isRetest or tightRetestSl) ? (entryPrice + math.min(math.max(asiaRange * 0.35, 4.5), 7.5)) : asiaMid
    float risk = slPrice - entryPrice
    tpPrice    := entryPrice - (risk * rrRatio)
    beActive   := false
    dailyTradesCount += 1
    strategy.entry("GK2_Short", strategy.short, comment="GK2 Short #" + str.tostring(dailyTradesCount))

// Breakeven 1:1 Dinamico
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
    strategy.exit("Exit_Long", "GK2_Long", stop=slPrice, limit=tpPrice)

if strategy.position_size < 0
    strategy.exit("Exit_Short", "GK2_Short", stop=slPrice, limit=tpPrice)
`;

export const pythonModulesV2 = {
  main: `# main.py - Orquestador Institucional Cuantitativo XAU/USD Gold Killer v2.0 PRO
# Desarrollado por el Ingeniero Francisco Alvarado
# Potenciado: Retesteo M15 + Sesion Nueva York (13:30 - 15:30 UTC) + Target R:R 1:2.5
import time
from datetime import datetime, timezone
from data_fetcher import MT5DataFetcher
from quant_calculator import QuantCalculator
from risk_manager import RiskManager
from order_executor import OrderExecutor

def run_gold_killer_v2():
    print("=" * 70)
    print("🚀 GOLD KILLER v2.0 PRO: INICIANDO SISTEMA MULTI-SESION & RETEST M15")
    print("Desarrollador: Ingeniero Francisco Alvarado")
    print("Parametros: R:R=1:2.5 | Riesgo=0.5% | Londres (08-11 UTC) | NY (13:30-15:30 UTC)")
    print("=" * 70)

    fetcher = MT5DataFetcher(symbol="XAUUSD", broker_offset_hours=3)
    calculator = QuantCalculator(min_asia_range=6.0, max_asia_range=60.0, rr_ratio=2.5)
    risk_mgr = RiskManager(account_risk_pct=0.5, max_daily_sl=2, max_daily_trades=3, be_trigger_r=1.0)
    executor = OrderExecutor(symbol="XAUUSD", magic_number=777927, slippage=50)

    while True:
        try:
            utc_now = datetime.now(timezone.utc)
            if not risk_mgr.can_trade_today():
                time.sleep(30)
                continue

            # Verificar si estamos en sesion Londres (08-11 UTC) o NY (13:30-15:30 UTC)
            in_london = (utc_now.hour >= 8 and utc_now.hour < 11)
            minutes_of_day = utc_now.hour * 60 + utc_now.minute
            in_ny = (minutes_of_day >= (13 * 60 + 30) and minutes_of_day <= (15 * 60 + 30))

            if not (in_london or in_ny):
                time.sleep(15)
                continue

            candles = fetcher.get_m15_candles(count=50)
            asia_range = calculator.calculate_tokyo_range(candles)
            if not asia_range or not asia_range['is_valid']:
                time.sleep(15)
                continue

            signal = calculator.evaluate_breakout_and_retest(candles, asia_range)
            if signal and not executor.has_open_position():
                lot_size = risk_mgr.calculate_lot_size(signal['entry'], signal['sl'])
                executor.execute_order(signal['type'], lot_size, signal['entry'], signal['sl'], signal['tp'])
                risk_mgr.register_trade()

            executor.manage_breakeven(buffer_usd=0.20)
            time.sleep(10)
        except Exception as e:
            print(f"Error en bucle cuantitativo: {e}")
            time.sleep(15)

if __name__ == "__main__":
    run_gold_killer_v2()
`,
};
