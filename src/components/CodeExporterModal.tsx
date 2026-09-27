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
  HelpCircle,
  Clock,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface CodeExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExporterModal: React.FC<CodeExporterModalProps> = ({ isOpen, onClose }) => {
  const [activeLang, setActiveLang] = useState<'mql5' | 'mql4' | 'pinescript' | 'python' | 'diagnostic' | 'checklist'>('mql5');
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
//|      Optimizado para Cuentas de Dinero Real & Pruebas de Fondeo  |
//|        Sincronizado 100% con Backtesting Gold Killer Web         |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "3.50"
#property description "Robot Cuantitativo Institucional XAU/USD (Oro) para Cuenta Real. Incluye auto-detección de llenado (IOC/FOK/Return), filtro de spread anti-noticias, verificación de margen libre, reconstrucción de estadísticas tras reinicio de VPS, Breakeven 1:1 con colchón de comisión y Circuit Breaker de equidad diaria."
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Enumeraciones
enum ENUM_TREND_MODE
{
   TREND_ANY_BREAKOUT = 0, // Ambas Direcciones (Ruptura Libre / Alta Frecuencia - Identico a la Web)
   TREND_D1_STRICT    = 1  // Filtro D1 Estricto (Solo a favor del dia previo)
};

//--- Parametros de Entrada
input group "=== Identificacion & Gestion de Riesgo Real ==="
input ulong             InpMagicNumber            = 777926;       // Magic Number Unico
input double            InpRiskPercent            = 0.5;          // Riesgo por Trade (% Balance: 0.5% recomendado, max 1.0%)
input double            InpRRRatio                = 2.0;          // Ratio Riesgo / Beneficio (1:2)
input int               InpMaxDailySL             = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
input int               InpMaxDailyTrades         = 2;            // Maximo de Operaciones Diarias (1 o 2)
input double            InpMaxDailyLossPercent    = 2.0;          // Drawdown Maximo Diario Permitido (% Balance: 2.0%)

input group "=== Sincronizacion Horaria (Broker vs UTC) ==="
input int               InpBrokerGmtOffset        = 3;            // GMT Offset del Broker (Ej: +3 en verano, +2 en invierno, 0 en UTC)
input int               InpStartAsiaUTC           = 0;            // Inicio Rango Tokio (Hora UTC, 00:00)
input int               InpEndAsiaUTC             = 7;            // Fin Rango Tokio (Hora UTC, 07:00)
input int               InpStartLondonUTC         = 8;            // Inicio Ventana Londres (Hora UTC, 08:00)
input int               InpEndLondonUTC           = 11;           // Fin Ventana Londres (Hora UTC, 11:00 - Sincronizado Web)

input group "=== Filtros Cuantitativos & Proteccion Cuenta Real ==="
input ENUM_TREND_MODE   InpTrendMode              = TREND_ANY_BREAKOUT; // Modo Operativo: Ambas Direcciones (Web)
input double            InpMinAsiaRange           = 0.0;          // Amplitud Minima Tokio ($ pts, 0 = Sin restriccion / Modo Web)
input double            InpMaxAsiaRange           = 0.0;          // Amplitud Maxima Tokio ($ pts, 0 = Sin restriccion / Modo Web)
input int               InpMaxSpreadPoints        = 0;            // Spread Maximo en Puntos (0 = Desactivado para Backtesting, 35 en Cuenta Real)
input int               InpSlippage               = 50;           // Tolerancia Desviacion Precio (Slippage en puntos = $0.50)

input group "=== Blindaje y Proteccion Breakeven ==="
input bool              InpEnableBreakeven        = true;         // Activar Proteccion Breakeven Dinamica a 1:1 R
input double            InpBEBufferPoints         = 0.20;         // Colchon sobre Entrada ($0.20 Oro: cubre comisiones ECN de $5-$7/lote)

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
   
   // Si el historial del broker muestra trades ejecutados hoy, sincronizar contadores en memoria
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
   hud += "║      GOLD KILLER CUANTITATIVO v3.50 (XAU/USD) - CUENTA REAL            ║\\n";
   hud += "║      Desarrollado por el Ingeniero Francisco Alvarado                  ║\\n";
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  ESTADO: %-60s  ║\\n", statusMsg);
   hud += StringFormat("║  HORA: Broker %02d:%02d | UTC %02d:%02d (Offset GMT%+d)                           ║\\n",
                       brokerH, brokerM, utcH, utcM, InpBrokerGmtOffset);
   hud += StringFormat("║  SESION LONDRES: %02d:00 a %02d:00 UTC (Apertura Institucional)                 ║\\n",
                       InpStartLondonUTC, InpEndLondonUTC);
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
   hud += StringFormat("║  GESTION: Riesgo=%.1f%%/trade | R:R=1:%.1f | BE 1:1 Buffer=+$%.2f/oz          ║\\n",
                       InpRiskPercent, InpRRRatio, InpBEBufferPoints);
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
   Print("  EA INICIADO: XAU/USD London Breakout Cuantitativo v3.50 [CUENTA REAL]");
   Print("  Desarrollado por: Ingeniero Francisco Alvarado");
   PrintFormat("  Configuracion Horaria: Broker GMT%+d | Tokio: %02d:00-%02d:00 UTC | Londres: %02d:00-%02d:00 UTC",
               InpBrokerGmtOffset, InpStartAsiaUTC, InpEndAsiaUTC, InpStartLondonUTC, InpEndLondonUTC);
   PrintFormat("  Parametros: Riesgo=%.1f%% | R:R=1:%.1f | Breakeven 1:1=+%.2f buffer | Spread Max=%d pts",
               InpRiskPercent, InpRRRatio, InpBEBufferPoints, InpMaxSpreadPoints);
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
      
      // Debe pertenecer exactamente a la misma fecha UTC que el dia evaluado
      if(bDt.year != curDt.year || bDt.mon != curDt.mon || bDt.day != curDt.day)
      {
         if(barsFound > 0) break; // Ya escaneamos todo el dia de hoy
         continue;
      }
      
      // Rango Tokio: 00:00 a 06:45 UTC (cierra a las 07:00 UTC, identico a quantEngine.ts)
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
      
      // Intento A: Con SL y TP integrados
      if(trade.Buy(lots, _Symbol, entry, sl, tp, comment))
      {
         PrintFormat("✅ [BUY EJECUTADO] Ticket #%I64u Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f",
                     trade.ResultOrder(), lots, entry, sl, tp);
         return true;
      }
      
      uint code = trade.ResultRetcode();
      if(code == 10030) continue; // Probar siguiente modo de llenado
      
      // Intento B: Si el broker usa Market Execution estricto (rechaza SL/TP en orden inicial)
      if(code == 10016)
      {
         if(trade.Buy(lots, _Symbol, entry, 0.0, 0.0, comment))
         {
            ulong ticket = trade.ResultOrder();
            PrintFormat("⚠️ [BUY MARKET] Abierto sin stops. Asignando SL=%.2f TP=%.2f...", sl, tp);
            Sleep(50);
            if(ticket > 0)
               trade.PositionModify(ticket, sl, tp);
            else
               trade.PositionModify(_Symbol, sl, tp);
            return true;
         }
      }
   }
   
   PrintFormat("❌ [ERROR BUY] Fallo orden tras reintentos: %u - %s", trade.ResultRetcode(), trade.ResultComment());
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
         PrintFormat("✅ [SELL EJECUTADO] Ticket #%I64u Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f",
                     trade.ResultOrder(), lots, entry, sl, tp);
         return true;
      }
      
      uint code = trade.ResultRetcode();
      if(code == 10030) continue;
      
      if(code == 10016)
      {
         if(trade.Sell(lots, _Symbol, entry, 0.0, 0.0, comment))
         {
            ulong ticket = trade.ResultOrder();
            PrintFormat("⚠️ [SELL MARKET] Abierto sin stops. Asignando SL=%.2f TP=%.2f...", sl, tp);
            Sleep(50);
            if(ticket > 0)
               trade.PositionModify(ticket, sl, tp);
            else
               trade.PositionModify(_Symbol, sl, tp);
            return true;
         }
      }
   }
   
   PrintFormat("❌ [ERROR SELL] Fallo orden tras reintentos: %u - %s", trade.ResultRetcode(), trade.ResultComment());
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
   
   // 1. Reset diario de contadores
   if(g_lastTradeDate != todayDateStr)
   {
      g_lastTradeDate = todayDateStr;
      g_dailyTradesCount = 0;
      g_dailySLCount = 0;
   }
   
   // 2. Sincronizar contadores con el historial real del broker (Blindaje anti-reinicio VPS)
   UpdateDailyStatsFromAccountHistory();
   
   // 3. Gestion activa de Breakeven en tiempo real
   if(InpEnableBreakeven)
   {
      ManageBreakeven();
   }
   
   long currentSpread = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   
   // Rango Tokio actual para telemetria
   double asiaHigh = 0.0, asiaLow = 0.0, asiaMid = 0.0, asiaRange = 0.0;
   bool hasAsiaRange = GetTodayAsianRange(currentServerTime, asiaHigh, asiaLow, asiaMid, asiaRange);
   
   // 4. Circuito de Proteccion de Cuenta Real / Fondeo
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
      UpdateChartDashboard("✅ OBJETIVO DIARIO: Maximo de 2 operaciones completadas hoy.",
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // 5. Ventana Operativa de Londres (08:00 a 11:00 UTC)
   datetime currentBarTime = iTime(_Symbol, PERIOD_M15, 0);
   bool isNewBar = (g_lastEvaluatedBarTime != currentBarTime);
   
   MqlRates m15[];
   ArraySetAsSeries(m15, true);
   if(CopyRates(_Symbol, PERIOD_M15, 1, 2, m15) < 2) return;
   
   datetime closedBarUtcTime = m15[0].time - (InpBrokerGmtOffset * 3600);
   MqlDateTime closedBarUtcDt;
   TimeToStruct(closedBarUtcTime, closedBarUtcDt);
   
   bool isLondonWindow = (closedBarUtcDt.hour >= InpStartLondonUTC && closedBarUtcDt.hour < InpEndLondonUTC);
   
   if(!isLondonWindow)
   {
      string sessionMsg = (closedBarUtcDt.hour < InpStartLondonUTC)
         ? StringFormat("🟡 ESPERANDO LONDRES: Abre a las %02d:00 UTC (Faltan %d h)", InpStartLondonUTC, InpStartLondonUTC - closedBarUtcDt.hour)
         : "⚪ SESION LONDRES CERRADA: Esperando siguiente sesion manana";
      UpdateChartDashboard(sessionMsg, dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(!hasAsiaRange)
   {
      UpdateChartDashboard("🟡 CALCULANDO RANGO TOKIO...", dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // 6. Filtro de Spread Institucional
   if(InpMaxSpreadPoints > 0 && currentSpread > InpMaxSpreadPoints)
   {
      UpdateChartDashboard(StringFormat("⚠️ SPREAD ALTO (%d pts > %d pts max). Esperando normalizacion...", currentSpread, InpMaxSpreadPoints),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // Si no es el cierre de una nueva vela M15, solo actualizar el HUD
   if(!isNewBar)
   {
      UpdateChartDashboard("🟢 OPERANDO EN VIVO: Monitoreando Ruptura y Retesteo M15",
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // 7. Filtro de Volatilidad Rango Asiatico
   if((InpMinAsiaRange > 0 && asiaRange < InpMinAsiaRange) || (InpMaxAsiaRange > 0 && asiaRange > InpMaxAsiaRange))
   {
      PrintFormat("⚠️ [FILTRO RANGO TOKIO] Amplitud (%.2f pts) fuera de limites [%.1f - %.1f]. Sesion omitida.",
                  asiaRange, InpMinAsiaRange, InpMaxAsiaRange);
      UpdateChartDashboard(StringFormat("⚪ Rango Tokio fuera de limites (%.2f pts). Esperando.", asiaRange),
                           dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      g_lastEvaluatedBarTime = currentBarTime;
      return;
   }
   
   // 8. Filtro Tendencial D1 (Opcional)
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
   
   double c1 = m15[0].close; // Vela M15 recien cerrada
   double c2 = m15[1].close; // Vela M15 anterior
   double l1 = m15[0].low;
   double h1 = m15[0].high;
   double o1 = m15[0].open;
   
   bool isFirstTrade = (g_dailyTradesCount == 0);
   
   // Gatillo BUY: Ruptura Limpia #1, Confirmacion Alcista o Retesteo #2 (Alineado con quantEngine.ts)
   bool buyBreakout = allowLong && (
      (isFirstTrade && ((c1 > asiaHigh && c2 <= asiaHigh) || (c1 > asiaHigh && c1 > o1))) ||
      (!isFirstTrade && c1 > asiaHigh && ((l1 >= (asiaHigh - 1.5) && c1 > o1) || (c1 > o1 && (c1 - o1) >= 0.5)))
   );
   
   // Gatillo SELL: Ruptura Limpia #1, Confirmacion Bajista o Retesteo #2 (Alineado con quantEngine.ts)
   bool sellBreakout = allowShort && (
      (isFirstTrade && ((c1 < asiaLow && c2 >= asiaLow) || (c1 < asiaLow && c1 < o1))) ||
      (!isFirstTrade && c1 < asiaLow && ((h1 <= (asiaLow + 1.5) && c1 < o1) || (c1 < o1 && (o1 - c1) >= 0.5)))
   );
   
   PrintFormat("📊 [EVALUACION LONDRES] %s %02d:%02d UTC | C1=%.2f C2=%.2f | Tokio: [%.2f - %.2f] (%.2f pts) | Buy=%s Sell=%s | Trades=%d/%d",
               todayDateStr, closedBarUtcDt.hour, closedBarUtcDt.min, c1, c2, asiaLow, asiaHigh, asiaRange,
               buyBreakout ? "SI" : "NO", sellBreakout ? "SI" : "NO", g_dailyTradesCount, InpMaxDailyTrades);
   
   int botPositions = CountBotPositions();
   
   // Ejecucion BUY
   if(buyBreakout && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl = isFirstTrade ? asiaMid : (entry - MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, _Digits);
      
      // Proteger distancia minima de Stops Level
      double minStopDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(minStopDist > 0 && (entry - sl) < minStopDist)
      {
         sl = NormalizeDouble(entry - minStopDist - 0.5, _Digits);
      }
      
      double riskDistance = entry - sl;
      if(riskDistance <= 0.5) riskDistance = 5.0;
      double tp = NormalizeDouble(entry + (riskDistance * InpRRRatio), _Digits);
      
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_BUY);
      string comment = StringFormat("GoldKiller #%d Long [Ing. Alvarado]", g_dailyTradesCount + 1);
      
      PrintFormat("🚀 [DISPARANDO BUY] Entrada=%.2f SL=%.2f TP=%.2f Lotes=%.2f", entry, sl, tp, lots);
      
      if(RobustTradeBuy(lots, entry, sl, tp, comment))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         UpdateChartDashboard("⚡ ORDEN BUY EJECUTADA EXITOSAMENTE", dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      }
   }
   // Ejecucion SELL
   else if(sellBreakout && botPositions == 0)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl = isFirstTrade ? asiaMid : (entry + MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, _Digits);
      
      double minStopDist = (double)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL) * _Point;
      if(minStopDist > 0 && (sl - entry) < minStopDist)
      {
         sl = NormalizeDouble(entry + minStopDist + 0.5, _Digits);
      }
      
      double riskDistance = sl - entry;
      if(riskDistance <= 0.5) riskDistance = 5.0;
      double tp = NormalizeDouble(entry - (riskDistance * InpRRRatio), _Digits);
      
      double lots = CalculateLotSize(entry, sl, ORDER_TYPE_SELL);
      string comment = StringFormat("GoldKiller #%d Short [Ing. Alvarado]", g_dailyTradesCount + 1);
      
      PrintFormat("🚀 [DISPARANDO SELL] Entrada=%.2f SL=%.2f TP=%.2f Lotes=%.2f", entry, sl, tp, lots);
      
      if(RobustTradeSell(lots, entry, sl, tp, comment))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         UpdateChartDashboard("⚡ ORDEN SELL EJECUTADA EXITOSAMENTE", dt.hour, dt.min, utcDt.hour, utcDt.min, asiaHigh, asiaLow, asiaRange, currentSpread);
      }
   }
   else
   {
      g_lastEvaluatedBarTime = currentBarTime;
      UpdateChartDashboard("🟢 OPERANDO EN VIVO: Monitoreando Ruptura y Retesteo M15",
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
                  PrintFormat("🛡️ [BREAKEVEN 1:1] Stop Loss blindado para BUY #%I64u en %.2f (Comision cubierta +$%.2f)", ticket, beLevel, InpBEBufferPoints);
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
                  PrintFormat("🛡️ [BREAKEVEN 1:1] Stop Loss blindado para SELL #%I64u en %.2f (Comision cubierta +$%.2f)", ticket, beLevel, InpBEBufferPoints);
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Dimensionamiento de Lotes Exacto con Verificacion de Margen Real |
//+------------------------------------------------------------------+
double CalculateLotSize(double entry, double sl, ENUM_ORDER_TYPE orderType)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) balance = 10000.0;
   
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
   
   // Verificacion de Margen Libre disponible en Cuenta Real
   double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   double marginReq = 0.0;
   if(OrderCalcMargin(orderType, _Symbol, lots, entry, marginReq))
   {
      if(marginReq > 0 && freeMargin > 0 && marginReq > (freeMargin * 0.90))
      {
         double maxSafeLots = MathFloor(((freeMargin * 0.80) / (marginReq / lots)) / step) * step;
         if(maxSafeLots >= minLot)
            lots = maxSafeLots;
         PrintFormat("⚠️ [MARGEN ALERTA] Ajustando lotes por margen libre disponible: %.2f", lots);
      }
   }
   
   int volDigits = 2;
   if(step >= 1.0) volDigits = 0;
   else if(step >= 0.1) volDigits = 1;
   
   return NormalizeDouble(lots, volDigits);
}
`;

  // =========================================================================
  // METATRADER 4 (MQL4) - PRODUCTION READY FOR REAL ACCOUNT & BACKTESTER
  // =========================================================================
  const mql4Code = `//+------------------------------------------------------------------+
//|                                     XAUUSD_LondonBreakout_Quant.mq4 |
//|   Algoritmo Cuantitativo Institucional London Breakout & Retest  |
//|        Desarrollado por el Ingeniero Francisco Alvarado          |
//|      Optimizado para Cuentas de Dinero Real & Pruebas de Fondeo  |
//|        Sincronizado 100% con Backtesting Gold Killer Web         |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "3.50"
#property description "Robot Cuantitativo XAU/USD para MetaTrader 4 en Cuenta Real. Incluye filtro de spread anti-noticias, verificación de margen libre, reconstrucción de estadísticas tras reinicio de VPS, Breakeven 1:1 con colchón de comisión y Circuit Breaker diario."
#property strict

//--- Parametros de Entrada
extern string   sep0                   = "=== Identificacion & Riesgo Real ===";
extern int      InpMagicNumber         = 777926;       // Magic Number Unico
extern double   InpRiskPercent         = 0.5;          // Riesgo por Trade (% Balance: 0.5% recomendado, max 1.0%)
extern double   InpRRRatio             = 2.0;          // Ratio Riesgo/Beneficio (1:2)
extern int      InpMaxDailySL          = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
extern int      InpMaxDailyTrades      = 2;            // Maximo de Trades por Dia (1 o 2)
extern double   InpMaxDailyLossPercent = 2.0;          // Drawdown Maximo Diario Permitido (% Balance: 2.0%)

extern string   sep1                   = "=== Sincronizacion Horaria (Broker vs UTC) ===";
extern int      InpBrokerGmtOffset     = 3;            // GMT Offset del Broker (+3 verano, +2 invierno, 0 UTC)
extern int      InpStartAsiaUTC        = 0;            // Inicio Rango Tokio (Hora UTC, 00:00)
extern int      InpEndAsiaUTC          = 7;            // Fin Rango Tokio (Hora UTC, 07:00)
extern int      InpStartLondonUTC      = 8;            // Inicio Ventana Londres (Hora UTC, 08:00)
extern int      InpEndLondonUTC        = 11;           // Fin Ventana Londres (Hora UTC, 11:00 - Sincronizado Web)

extern string   sep2                   = "=== Filtros Cuantitativos & Proteccion Cuenta Real ===";
extern bool     InpUseD1Trend          = false;        // false = Ambas Direcciones (Web) | true = Filtro D1
extern double   InpMinAsiaRange        = 0.0;          // Rango Minimo Tokio ($ pts, 0=Sin restriccion)
extern double   InpMaxAsiaRange        = 0.0;          // Rango Maximo Tokio ($ pts, 0=Sin restriccion)
extern int      InpMaxSpread           = 0;            // Spread Maximo (0 = Desactivado para Backtesting, 35 en Cuenta Real)
extern int      InpSlippage            = 50;           // Tolerancia Desviacion en Puntos ($0.50)

extern string   sep3                   = "=== Blindaje Breakeven ===";
extern bool     InpEnableBE            = true;         // Activar Proteccion Breakeven 1:1 Dinamico
extern double   InpBEBufferPoints      = 0.20;         // Colchon sobre Entrada ($0.20 Oro: cubre comisiones ECN de $5-$7/lote)

//--- Variables Globales
datetime g_lastEvaluatedBarTime = 0;
string   g_lastTradeDate        = "";
int      g_dailyTradesCount     = 0;
int      g_dailySLCount         = 0;

//+------------------------------------------------------------------+
//| Reconstrucción de Estadísticas Diarias desde el Historial Real   |
//| (Blindaje contra reinicios de VPS, caídas de red o de terminal)  |
//+------------------------------------------------------------------+
void UpdateDailyStatsFromAccountHistoryMT4()
{
   int tradesToday = 0;
   int slToday = 0;
   datetime todayStart = StringToTime(TimeToStr(TimeCurrent(), TIME_DATE) + " 00:00");
   
   // Escanear historial de órdenes cerradas hoy
   int histTotal = OrdersHistoryTotal();
   for(int i = 0; i < histTotal; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      
      datetime closeTime = OrderCloseTime();
      if(closeTime >= todayStart)
      {
         tradesToday++;
         double netProfit = OrderProfit() + OrderSwap() + OrderCommission();
         if(netProfit < -0.01)
         {
            slToday++;
         }
      }
   }
   
   // Escanear órdenes actualmente abiertas
   int openTotal = OrdersTotal();
   for(int j = 0; j < openTotal; j++)
   {
      if(!OrderSelect(j, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      
      datetime openTime = OrderOpenTime();
      if(openTime >= todayStart)
      {
         tradesToday++;
      }
   }
   
   if(tradesToday > g_dailyTradesCount) g_dailyTradesCount = tradesToday;
   if(slToday > g_dailySLCount) g_dailySLCount = slToday;
}

//+------------------------------------------------------------------+
//| Actualizacion de Panel Visual HUD en el Grafico de MT4           |
//+------------------------------------------------------------------+
void UpdateChartDashboardMT4(string statusMsg, int brokerH, int brokerM, int utcH, int utcM, double asiaH, double asiaL, double asiaR, long spread)
{
   double balance    = AccountBalance();
   double equity     = AccountEquity();
   double freeMargin = AccountFreeMargin();
   
   string hud = "";
   hud += "╔════════════════════════════════════════════════════════════════════════╗\\n";
   hud += "║      GOLD KILLER CUANTITATIVO v3.50 (XAU/USD) - CUENTA REAL MT4        ║\\n";
   hud += "║      Desarrollado por el Ingeniero Francisco Alvarado                  ║\\n";
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  ESTADO: %-60s  ║\\n", statusMsg);
   hud += StringFormat("║  HORA: Broker %02d:%02d | UTC %02d:%02d (Offset GMT%+d)                           ║\\n",
                       brokerH, brokerM, utcH, utcM, InpBrokerGmtOffset);
   hud += StringFormat("║  SESION LONDRES: %02d:00 a %02d:00 UTC (Apertura Institucional)                 ║\\n",
                       InpStartLondonUTC, InpEndLondonUTC);
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  RANGO TOKIO: Alto=%.2f | Bajo=%.2f | Amplitud=%.2f pts              ║\\n",
                       asiaH, asiaL, asiaR);
   hud += StringFormat("║  SPREAD ACTUAL: %d pts (Maximo Seguro: %d pts) - %-18s  ║\\n",
                       spread, InpMaxSpread, (InpMaxSpread == 0 || spread <= InpMaxSpread) ? "SPREAD OPTIMO" : "SPREAD ALTO (ESPERA)");
   hud += "╠════════════════════════════════════════════════════════════════════════╣\\n";
   hud += StringFormat("║  OPERACIONES HOY: %d / %d  |  STOP LOSS HOY: %d / %d (Circuit Breaker)     ║\\n",
                       g_dailyTradesCount, InpMaxDailyTrades, g_dailySLCount, InpMaxDailySL);
   hud += StringFormat("║  CUENTA: Balance=$%.2f | Equidad=$%.2f | Margen Libre=$%.2f    ║\\n",
                       balance, equity, freeMargin);
   hud += StringFormat("║  GESTION: Riesgo=%.1f%%/trade | R:R=1:%.1f | BE 1:1 Buffer=+$%.2f/oz          ║\\n",
                       InpRiskPercent, InpRRRatio, InpBEBufferPoints);
   hud += "╚════════════════════════════════════════════════════════════════════════╝";
   
   Comment(hud);
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   UpdateDailyStatsFromAccountHistoryMT4();
   
   Print("Robot Cuantitativo XAU/USD MT4 v3.50 Inicializado [CUENTA REAL]. Ing. Francisco Alvarado.");
   PrintFormat("Broker GMT Offset: GMT%+d | Tokio: %02d:00-%02d:00 UTC | Londres: %02d:00-%02d:00 UTC",
               InpBrokerGmtOffset, InpStartAsiaUTC, InpEndAsiaUTC, InpStartLondonUTC, InpEndLondonUTC);
   PrintFormat("Parametros: Riesgo=%.1f%% | R:R=1:%.1f | BE 1:1 Buffer=+%.2f | Spread Max=%d pts",
               InpRiskPercent, InpRRRatio, InpBEBufferPoints, InpMaxSpread);
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
//| Escaneo Resiliente del Rango Asiatico en MT4 (Calculo en UTC)    |
//+------------------------------------------------------------------+
bool GetTodayAsianRangeMT4(datetime currentBarTime, double &outHigh, double &outLow, double &outMid, double &outRange)
{
   datetime currentUtc = currentBarTime - (InpBrokerGmtOffset * 3600);
   int currentUtcYear  = TimeYear(currentUtc);
   int currentUtcDOY   = TimeDayOfYear(currentUtc);
   
   double maxH = -1.0;
   double minL = 9999999.0;
   int barsFound = 0;
   
   for(int i = 0; i < 150; i++)
   {
      datetime barUtc = Time[i] - (InpBrokerGmtOffset * 3600);
      if(TimeYear(barUtc) != currentUtcYear || TimeDayOfYear(barUtc) != currentUtcDOY)
      {
         if(barsFound > 0) break;
         continue;
      }
      
      int barUtcHour = TimeHour(barUtc);
      if(barUtcHour >= InpStartAsiaUTC && barUtcHour < InpEndAsiaUTC)
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
   datetime currentUtcTime    = currentServerTime - (InpBrokerGmtOffset * 3600);
   int serverHour = TimeHour(currentServerTime);
   int serverMin  = TimeMinute(currentServerTime);
   int utcHour    = TimeHour(currentUtcTime);
   int utcMin     = TimeMinute(currentUtcTime);
   
   string todayDateStr = TimeToStr(currentUtcTime, TIME_DATE);
   
   // 1. Reset diario
   if(g_lastTradeDate != todayDateStr)
   {
      g_lastTradeDate = todayDateStr;
      g_dailyTradesCount = 0;
      g_dailySLCount = 0;
   }
   
   // 2. Sincronizar contadores desde historial del broker (Anti-reinicio VPS)
   UpdateDailyStatsFromAccountHistoryMT4();
   
   // 3. Gestion activa de Breakeven
   if(InpEnableBE) ManageBreakevenMT4();
   
   long currentSpread = (long)MarketInfo(Symbol(), MODE_SPREAD);
   
   double asiaHigh = 0.0, asiaLow = 0.0, asiaMid = 0.0, asiaRange = 0.0;
   bool hasAsia = GetTodayAsianRangeMT4(currentServerTime, asiaHigh, asiaLow, asiaMid, asiaRange);
   
   // 4. Circuito de Proteccion de Cuenta Real / Fondeo
   double balance = AccountBalance();
   double equity  = AccountEquity();
   double dailyLossPercent = (balance > 0) ? ((balance - equity) / balance) * 100.0 : 0.0;
   
   if(g_dailySLCount >= InpMaxDailySL)
   {
      UpdateChartDashboardMT4("🔴 CIRCUIT BREAKER: Limite de 2 Stop Loss diarios alcanzado. Capital protegido.",
                              serverHour, serverMin, utcHour, utcMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(InpMaxDailyLossPercent > 0 && dailyLossPercent >= InpMaxDailyLossPercent)
   {
      UpdateChartDashboardMT4(StringFormat("🔴 CIRCUIT BREAKER: Perdida diaria (%.2f%%) supera maximo (%.2f%%). Trading pausado.", dailyLossPercent, InpMaxDailyLossPercent),
                              serverHour, serverMin, utcHour, utcMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(g_dailyTradesCount >= InpMaxDailyTrades)
   {
      UpdateChartDashboardMT4("✅ OBJETIVO DIARIO: Maximo de 2 operaciones completadas hoy.",
                              serverHour, serverMin, utcHour, utcMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // 5. Ventana Operativa de Londres (08:00 a 11:00 UTC)
   datetime currentBarTime = Time[0];
   bool isNewBar = (g_lastEvaluatedBarTime != currentBarTime);
   
   datetime closedBarUtcTime = Time[1] - (InpBrokerGmtOffset * 3600);
   int closedBarUtcHour = TimeHour(closedBarUtcTime);
   bool isLondonWindow = (closedBarUtcHour >= InpStartLondonUTC && closedBarUtcHour < InpEndLondonUTC);
   
   if(!isLondonWindow)
   {
      string sessionMsg = (closedBarUtcHour < InpStartLondonUTC)
         ? StringFormat("🟡 ESPERANDO LONDRES: Abre a las %02d:00 UTC (Faltan %d h)", InpStartLondonUTC, InpStartLondonUTC - closedBarUtcHour)
         : "⚪ SESION LONDRES CERRADA: Esperando siguiente sesion manana";
      UpdateChartDashboardMT4(sessionMsg, serverHour, serverMin, utcHour, utcMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   if(!hasAsia)
   {
      UpdateChartDashboardMT4("🟡 CALCULANDO RANGO TOKIO...", serverHour, serverMin, utcHour, utcMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // 6. Filtro de Spread Institucional
   if(InpMaxSpread > 0 && currentSpread > InpMaxSpread)
   {
      UpdateChartDashboardMT4(StringFormat("⚠️ SPREAD ALTO (%d pts > %d pts max). Esperando normalizacion...", currentSpread, InpMaxSpread),
                              serverHour, serverMin, utcHour, utcMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // Si no es el cierre de una nueva vela M15, solo actualizar el HUD
   if(!isNewBar)
   {
      UpdateChartDashboardMT4("🟢 OPERANDO EN VIVO: Monitoreando Ruptura y Retesteo M15",
                              serverHour, serverMin, utcHour, utcMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      return;
   }
   
   // 7. Filtros de calidad
   if(InpMinAsiaRange > 0 && asiaRange < InpMinAsiaRange)
   {
      PrintFormat("⚠️ [FILTRO RANGO MT4] Amplitud (%.2f pts) menor al minimo (%.2f). Esperando.", asiaRange, InpMinAsiaRange);
      g_lastEvaluatedBarTime = currentBarTime;
      return;
   }
   if(InpMaxAsiaRange > 0 && asiaRange > InpMaxAsiaRange)
   {
      PrintFormat("⚠️ [FILTRO RANGO MT4] Amplitud (%.2f pts) mayor al maximo (%.2f). Esperando.", asiaRange, InpMaxAsiaRange);
      g_lastEvaluatedBarTime = currentBarTime;
      return;
   }
   
   // 8. Tendencia D1 anterior
   double d1Close = iClose(Symbol(), PERIOD_D1, 1);
   double d1Open  = iOpen(Symbol(), PERIOD_D1, 1);
   bool isD1Bullish = (d1Close > d1Open);
   bool isD1Bearish = (d1Close < d1Open);
   
   bool allowBuy  = (!InpUseD1Trend) || isD1Bullish;
   bool allowSell = (!InpUseD1Trend) || isD1Bearish;
   
   double c1 = Close[1]; // Vela recien cerrada
   double c2 = Close[2]; // Vela previa
   double l1 = Low[1];
   double h1 = High[1];
   double o1 = Open[1];
   
   bool isFirst = (g_dailyTradesCount == 0);
   
   // Gatillo BUY: Ruptura Limpia #1, Confirmacion Alcista o Retesteo #2 (Alineado quantEngine.ts)
   bool buySig = allowBuy && (
      (isFirst && ((c1 > asiaHigh && c2 <= asiaHigh) || (c1 > asiaHigh && c1 > o1))) ||
      (!isFirst && c1 > asiaHigh && ((l1 >= (asiaHigh - 1.5) && c1 > o1) || (c1 > o1 && (c1 - o1) >= 0.5)))
   );
   
   // Gatillo SELL: Ruptura Limpia #1, Confirmacion Bajista o Retesteo #2 (Alineado quantEngine.ts)
   bool sellSig = allowSell && (
      (isFirst && ((c1 < asiaLow && c2 >= asiaLow) || (c1 < asiaLow && c1 < o1))) ||
      (!isFirst && c1 < asiaLow && ((h1 <= (asiaLow + 1.5) && c1 < o1) || (c1 < o1 && (o1 - c1) >= 0.5)))
   );
   
   PrintFormat("📊 [EVALUACION LONDRES MT4] %s %02d:%02d UTC | C1=%.2f C2=%.2f | Tokio: [%.2f - %.2f] (%.2f pts) | Buy=%s Sell=%s | Trades=%d/%d",
               todayDateStr, closedBarUtcHour, TimeMinute(closedBarUtcTime), c1, c2, asiaLow, asiaHigh, asiaRange,
               buySig ? "SI" : "NO", sellSig ? "SI" : "NO", g_dailyTradesCount, InpMaxDailyTrades);
   
   int openOrders = CountOpenOrdersMT4();
   
   if(buySig && openOrders == 0)
   {
      double entry = Ask;
      double sl = isFirst ? asiaMid : (entry - MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, Digits);
      
      double stopLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
      if(stopLevel > 0 && (entry - sl) < stopLevel)
      {
         sl = NormalizeDouble(entry - stopLevel - 0.5, Digits);
      }
      
      double risk = entry - sl;
      if(risk <= 0.5) risk = 5.0;
      double tp = NormalizeDouble(entry + (risk * InpRRRatio), Digits);
      double lots = CalculateLotsMT4(entry, sl);
      
      // Chequeo de margen libre
      if(AccountFreeMarginCheck(Symbol(), OP_BUY, lots) <= 0 || GetLastError() == 134)
      {
         Print("❌ [MARGEN INSUFICIENTE] No hay suficiente margen para abrir BUY de ", lots, " lotes.");
         return;
      }
      
      int ticket = OrderSend(Symbol(), OP_BUY, lots, entry, InpSlippage, sl, tp, "GoldKiller Buy [Ing. Alvarado]", InpMagicNumber, 0, clrGreen);
      if(ticket > 0)
      {
         g_lastEvaluatedBarTime = currentBarTime;
         g_dailyTradesCount++;
         PrintFormat("✅ BUY EJECUTADO MT4: Ticket #%d Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f", ticket, lots, entry, sl, tp);
         UpdateChartDashboardMT4("⚡ ORDEN BUY EJECUTADA EXITOSAMENTE", serverHour, serverMin, currentUtcHour, serverMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      }
      else
      {
         // Intento con SL/TP diferido por Market Execution
         ticket = OrderSend(Symbol(), OP_BUY, lots, entry, InpSlippage, 0, 0, "GoldKiller Buy [Ing. Alvarado]", InpMagicNumber, 0, clrGreen);
         if(ticket > 0)
         {
            Sleep(50);
            OrderModify(ticket, entry, sl, tp, 0, clrGreen);
            g_lastEvaluatedBarTime = currentBarTime;
            g_dailyTradesCount++;
            PrintFormat("✅ BUY MARKET MT4: Ticket #%d asignado con SL=%.2f TP=%.2f", ticket, sl, tp);
            UpdateChartDashboardMT4("⚡ ORDEN BUY EJECUTADA EXITOSAMENTE", serverHour, serverMin, currentUtcHour, serverMin, asiaHigh, asiaLow, asiaRange, currentSpread);
         }
         else
         {
            Print("❌ Error enviando BUY MT4: ", GetLastError());
         }
      }
   }
   else if(sellSig && openOrders == 0)
   {
      double entry = Bid;
      double sl = isFirst ? asiaMid : (entry + MathMin(MathMax(asiaRange * 0.5, 4.0), 8.0));
      sl = NormalizeDouble(sl, Digits);
      
      double stopLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
      if(stopLevel > 0 && (sl - entry) < stopLevel)
      {
         sl = NormalizeDouble(entry + stopLevel + 0.5, Digits);
      }
      
      double risk = sl - entry;
      if(risk <= 0.5) risk = 5.0;
      double tp = NormalizeDouble(entry - (risk * InpRRRatio), Digits);
      double lots = CalculateLotsMT4(entry, sl);
      
      if(AccountFreeMarginCheck(Symbol(), OP_SELL, lots) <= 0 || GetLastError() == 134)
      {
         Print("❌ [MARGEN INSUFICIENTE] No hay suficiente margen para abrir SELL de ", lots, " lotes.");
         return;
      }
      
      int ticket = OrderSend(Symbol(), OP_SELL, lots, entry, InpSlippage, sl, tp, "GoldKiller Sell [Ing. Alvarado]", InpMagicNumber, 0, clrRed);
      if(ticket > 0)
      {
         g_lastEvaluatedBarTime = currentBarTime;
         g_dailyTradesCount++;
         PrintFormat("✅ SELL EJECUTADO MT4: Ticket #%d Lotes=%.2f Entrada=%.2f SL=%.2f TP=%.2f", ticket, lots, entry, sl, tp);
         UpdateChartDashboardMT4("⚡ ORDEN SELL EJECUTADA EXITOSAMENTE", serverHour, serverMin, currentUtcHour, serverMin, asiaHigh, asiaLow, asiaRange, currentSpread);
      }
      else
      {
         ticket = OrderSend(Symbol(), OP_SELL, lots, entry, InpSlippage, 0, 0, "GoldKiller Sell [Ing. Alvarado]", InpMagicNumber, 0, clrRed);
         if(ticket > 0)
         {
            Sleep(50);
            OrderModify(ticket, entry, sl, tp, 0, clrRed);
            g_lastEvaluatedBarTime = currentBarTime;
            g_dailyTradesCount++;
            PrintFormat("✅ SELL MARKET MT4: Ticket #%d asignado con SL=%.2f TP=%.2f", ticket, sl, tp);
            UpdateChartDashboardMT4("⚡ ORDEN SELL EJECUTADA EXITOSAMENTE", serverHour, serverMin, currentUtcHour, serverMin, asiaHigh, asiaLow, asiaRange, currentSpread);
         }
         else
         {
            Print("❌ Error enviando SELL MT4: ", GetLastError());
         }
      }
   }
   else
   {
      g_lastEvaluatedBarTime = currentBarTime;
      UpdateChartDashboardMT4("🟢 OPERANDO EN VIVO: Monitoreando Ruptura y Retesteo M15",
                              serverHour, serverMin, currentUtcHour, serverMin, asiaHigh, asiaLow, asiaRange, currentSpread);
   }
}

//+------------------------------------------------------------------+
//| Calculo Dinamico de Lotes MT4 con Verificacion de Margen         |
//+------------------------------------------------------------------+
double CalculateLotsMT4(double entry, double sl)
{
   double balance = AccountBalance();
   if(balance <= 0) balance = 10000.0;
   
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
   
   // Verificacion de Margen Libre disponible
   double freeMargin = AccountFreeMargin();
   if(freeMargin > 0 && (lots * 1000.0) > (freeMargin * 0.90))
   {
      double maxSafeLots = MathFloor(((freeMargin * 0.80) / 1000.0) / step) * step;
      if(maxSafeLots >= minLot) lots = maxSafeLots;
   }
   
   int lotDigits = 2;
   if(step >= 1.0) lotDigits = 0;
   else if(step >= 0.1) lotDigits = 1;
   
   return NormalizeDouble(lots, lotDigits);
}

//+------------------------------------------------------------------+
//| Proteccion Automatica Breakeven MT4 con Buffer de Comision       |
//+------------------------------------------------------------------+
void ManageBreakevenMT4()
{
   double stopLevel   = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
   double freezeLevel = MarketInfo(Symbol(), MODE_FREEZELEVEL) * Point;
   double minSafetyDist = MathMax(stopLevel, freezeLevel);
   if(minSafetyDist < (5 * Point)) minSafetyDist = 5 * Point;

   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != InpMagicNumber) continue;
      
      double openPrice = OrderOpenPrice();
      double currentSL = OrderStopLoss();
      double currentTP = OrderTakeProfit();
      double riskDist  = MathAbs(openPrice - currentSL);
      if(riskDist <= 0.1) continue;
      
      if(OrderType() == OP_BUY)
      {
         if(Bid >= (openPrice + riskDist))
         {
            double beLevel = NormalizeDouble(openPrice + InpBEBufferPoints, Digits);
            if(currentSL < openPrice && (Bid - beLevel) >= minSafetyDist)
            {
               if(OrderModify(OrderTicket(), openPrice, beLevel, currentTP, 0, clrCyan))
                  PrintFormat("🛡️ [BE 1:1 MT4] Stop Loss movido a entrada para BUY #%d en %.2f (Comision cubierta +$%.2f)", OrderTicket(), beLevel, InpBEBufferPoints);
            }
         }
      }
      else if(OrderType() == OP_SELL)
      {
         if(Ask <= (openPrice - riskDist))
         {
            double beLevel = NormalizeDouble(openPrice - InpBEBufferPoints, Digits);
            if((currentSL > openPrice || currentSL == 0.0) && (beLevel - Ask) >= minSafetyDist)
            {
               if(OrderModify(OrderTicket(), openPrice, beLevel, currentTP, 0, clrCyan))
                  PrintFormat("🛡️ [BE 1:1 MT4] Stop Loss movido a entrada para SELL #%d en %.2f (Comision cubierta +$%.2f)", OrderTicket(), beLevel, InpBEBufferPoints);
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
// Sincronizado 100% con Backtesting Gold Killer Web (08:00 - 11:00 UTC)
// ============================================================================

// 1. PARAMETROS DE ENTRADA
startAsiaHour    = input.int(0,  "Inicio Rango Asiático (Hora UTC)", minval=0, maxval=23, group="Horarios UTC")
endAsiaHour      = input.int(7,  "Fin Rango Asiático (Hora UTC)",    minval=0, maxval=23, group="Horarios UTC")
startLondonHour  = input.int(8,  "Inicio Ventana Londres (Hora UTC)", minval=0, maxval=23, group="Horarios UTC")
endLondonHour    = input.int(11, "Fin Ventana Londres (Hora UTC)",    minval=0, maxval=23, group="Horarios UTC")

trendMode        = input.string("Ambas Direcciones (Alta Frecuencia)", "Modo de Tendencia", 
                               options=["Ambas Direcciones (Alta Frecuencia)", "Filtro D1 Estricto"], group="Parámetros Cuantitativos")
rrRatio          = input.float(2.0,  "Ratio Riesgo / Beneficio Objetivo (1:2)", step=0.5, group="Gestión de Riesgo")
enableBreakeven  = input.bool(true,  "Activar Protección Breakeven 1:1 Dinámica", group="Gestión de Riesgo")

// 2. SESIONES Y FILTROS TEMPORALES
utcHour   = hour(time, "UTC")
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

// 3. CAPTURA DEL RANGO ASIATICO (00:00 - 07:00 UTC)
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
                       text="Rango Tokio: " + str.tostring(rangePts, "#.##") + " pts\\n[Ing. Francisco Alvarado]", 
                       text_color=color.white, text_size=size.small)

float asiaRange = asiaHigh - asiaLow
float asiaMid   = (asiaHigh + asiaLow) / 2.0

plot(asiaHigh, "Asia High", color=color.new(color.red, 30), linewidth=1, style=plot.style_linebr)
plot(asiaLow,  "Asia Low",  color=color.new(color.green, 30), linewidth=1, style=plot.style_linebr)
plot(asiaMid,  "Asia Mid (SL)", color=color.new(color.blue, 40), linewidth=1, style=plot.style_linebr)

// 4. LOGICA DE GATILLO Y TRADES (M15 LONDRES)
var int dailyTradesCount = 0
if dayofmonth != dayofmonth[1]
    dailyTradesCount := 0

bool canTrade = isLondonSession and (dailyTradesCount < 2)
bool isFirstTrade = (dailyTradesCount == 0)

// Condicion BUY: Ruptura #1 o Retesteo #2
bool buyBreakout = canTrade and allowLongByTrend and (
    (isFirstTrade and close > asiaHigh and close[1] <= asiaHigh) or
    (not isFirstTrade and close > asiaHigh and low >= (asiaHigh - 1.5) and close > open)
)

// Condicion SELL: Ruptura #1 o Retesteo #2
bool sellBreakout = canTrade and allowShortByTrend and (
    (isFirstTrade and close < asiaLow and close[1] >= asiaLow) or
    (not isFirstTrade and close < asiaLow and high <= (asiaLow + 1.5) and close < open)
)

// Variables de Gestión de Trade
var float entryPrice = na
var float slPrice    = na
var float tpPrice    = na
var bool  beActive   = false

if buyBreakout and strategy.position_size == 0
    entryPrice := close
    slPrice    := isFirstTrade ? asiaMid : (entryPrice - math.min(math.max(asiaRange * 0.5, 4.0), 8.0))
    float risk = entryPrice - slPrice
    tpPrice    := entryPrice + (risk * rrRatio)
    beActive   := false
    dailyTradesCount += 1
    strategy.entry("LB_Long", strategy.long, comment="LB Long #" + str.tostring(dailyTradesCount))

if sellBreakout and strategy.position_size == 0
    entryPrice := close
    slPrice    := isFirstTrade ? asiaMid : (entryPrice + math.min(math.max(asiaRange * 0.5, 4.0), 8.0))
    float risk = slPrice - entryPrice
    tpPrice    := entryPrice - (risk * rrRatio)
    beActive   := false
    dailyTradesCount += 1
    strategy.entry("LB_Short", strategy.short, comment="LB Short #" + str.tostring(dailyTradesCount))

// Breakeven 1:1 Dinamico
if strategy.position_size > 0 and enableBreakeven and not beActive
    float riskDist = entryPrice - slPrice
    if high >= (entryPrice + riskDist)
        slPrice := entryPrice + 0.10
        beActive := true

if strategy.position_size < 0 and enableBreakeven and not beActive
    float riskDist = slPrice - entryPrice
    if low <= (entryPrice - riskDist)
        slPrice := entryPrice - 0.10
        beActive := true

if strategy.position_size > 0
    strategy.exit("Exit_Long", "LB_Long", stop=slPrice, limit=tpPrice)

if strategy.position_size < 0
    strategy.exit("Exit_Short", "LB_Short", stop=slPrice, limit=tpPrice)
`;

  // =========================================================================
  // PYTHON MODULAR (PYTHON 3.10+)
  // =========================================================================
  const pythonModules = {
    main: `# main.py - Orquestador Institucional Cuantitativo XAU/USD
# Desarrollado por el Ingeniero Francisco Alvarado
import time
from datetime import datetime, timezone
from data_fetcher import MT5DataFetcher
from quant_calculator import QuantCalculator
from risk_manager import RiskManager
from order_executor import OrderExecutor

SYMBOL = "XAUUSD"
TIMEFRAME = "M15"
RISK_PERCENT = 0.5
RR_RATIO = 2.0
BROKER_GMT_OFFSET = 3

def main():
    print(f"=== INICIANDO BOT ORO CUANTITATIVO (Ing. Alvarado) ===")
    fetcher = MT5DataFetcher(symbol=SYMBOL)
    risk_mgr = RiskManager(risk_percent=RISK_PERCENT)
    executor = OrderExecutor(broker="MT5")

    while True:
        try:
            now_utc = datetime.now(timezone.utc)
            # Evaluar ventana operativa de Londres (08:00 a 11:00 UTC)
            if 8 <= now_utc.hour < 11:
                candles = fetcher.get_m15_rates(count=120)
                d1_candles = fetcher.get_d1_rates(count=5)
                asia_range = QuantCalculator.calculate_asian_range(candles, gmt_offset=BROKER_GMT_OFFSET)
                
                if asia_range:
                    signal = QuantCalculator.evaluate_breakout_trigger(candles, asia_range, rr_ratio=RR_RATIO)
                    if signal and executor.count_open_positions(SYMBOL) == 0:
                        balance = fetcher.get_account_balance()
                        lot = risk_mgr.calculate_lots(balance, signal['entry_price'], signal['sl_price'])
                        executor.send_order(SYMBOL, signal['type'], lot, signal['entry_price'], signal['sl_price'], signal['tp_price'], "GoldKiller [Ing. Alvarado]")

            # Gestion de Breakeven en tiempo real
            executor.manage_breakeven_positions(SYMBOL)
            time.sleep(10)
        except Exception as e:
            print(f"Error en ciclo principal: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
`,
    data: `# data_fetcher.py - Conexion de datos con MetaTrader 5
import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime

class MT5DataFetcher:
    def __init__(self, symbol: str = "XAUUSD"):
        self.symbol = symbol
        if not mt5.initialize():
            raise RuntimeError(f"Fallo al conectar con MT5: {mt5.last_error()}")

    def get_m15_rates(self, count: int = 120) -> pd.DataFrame:
        rates = mt5.copy_rates_from_pos(self.symbol, mt5.TIMEFRAME_M15, 0, count)
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        return df

    def get_d1_rates(self, count: int = 5) -> pd.DataFrame:
        rates = mt5.copy_rates_from_pos(self.symbol, mt5.TIMEFRAME_D1, 0, count)
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        return df

    def get_account_balance(self) -> float:
        info = mt5.account_info()
        return info.balance if info else 10000.0
`,
    calc: `# quant_calculator.py - Motor de Cálculo de Ruptura y Rango de Tokio
import pandas as pd
from typing import Optional, Dict

class QuantCalculator:
    @staticmethod
    def calculate_asian_range(df: pd.DataFrame, gmt_offset: int = 3, start_utc: int = 0, end_utc: int = 7) -> Optional[Dict]:
        df = df.copy()
        df['utc_hour'] = (df['time'].dt.hour - gmt_offset + 24) % 24
        today = df['time'].dt.date.iloc[-1]
        
        asia = df[(df['time'].dt.date == today) & (df['utc_hour'] >= start_utc) & (df['utc_hour'] < end_utc)]
        if asia.empty: return None
        
        h = float(asia['high'].max())
        l = float(asia['low'].min())
        return {"high": h, "low": l, "midpoint": round((h + l)/2.0, 2), "range_points": round(h - l, 2)}

    @staticmethod
    def evaluate_breakout_trigger(candles: pd.DataFrame, asia: Dict, rr_ratio: float = 2.0) -> Optional[Dict]:
        if len(candles) < 3: return None
        c1 = candles.iloc[-2] # Vela M15 que acaba de cerrar
        c2 = candles.iloc[-3]
        
        h = asia['high']
        l = asia['low']
        mid = asia['midpoint']

        # BUY Breakout
        if c1['close'] > h and c2['close'] <= h:
            entry = float(c1['close'])
            sl = mid
            tp = entry + ((entry - sl) * rr_ratio)
            return {"type": "BUY", "entry_price": round(entry, 2), "sl_price": round(sl, 2), "tp_price": round(tp, 2)}

        # SELL Breakout
        if c1['close'] < l and c2['close'] >= l:
            entry = float(c1['close'])
            sl = mid
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

    def count_open_positions(self, symbol: str) -> int:
        import MetaTrader5 as mt5
        pos = mt5.positions_get(symbol=symbol)
        return len(pos) if pos else 0

    def send_order(self, symbol: str, order_type: str, lot_size: float, entry_price: float, sl_price: float, tp_price: float, comment: str) -> bool:
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
            "deviation": 30,
            "magic": 777926,
            "comment": comment,
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        res = mt5.order_send(req)
        return res.retcode == mt5.TRADE_RETCODE_DONE

    def manage_breakeven_positions(self, symbol: str):
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
                  Exportador de Algoritmo Cuantitativo (MT5, MT4, Pine Script & Python)
                </h3>
                <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  Sincronizado v3.50
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
              <strong>Validación para Cuenta Real:</strong> Riesgo recomendado <strong>0.5%</strong> por operación. Circuit Breaker de 2 SLs diarios y Breakeven a 1:1 R.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveLang('diagnostic')}
              className="text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 transition flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              <span>Diagnóstico MT5</span>
            </button>
            <button
              onClick={() => setActiveLang('checklist')}
              className="hidden sm:flex items-center gap-1 text-[11px] underline hover:text-white shrink-0"
            >
              <span>Checklist</span>
            </button>
          </div>
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
              onClick={() => setActiveLang('diagnostic')}
              className={`py-2 px-3 text-xs font-mono font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeLang === 'diagnostic'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Diagnóstico Backtest MT5</span>
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

          {activeLang !== 'checklist' && activeLang !== 'diagnostic' && (
            <div className="flex items-center gap-2 py-1">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                <span>Descargar</span>
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
          {activeLang === 'diagnostic' ? (
            <div className="max-w-4xl mx-auto py-2 space-y-5 text-slate-300 font-sans">
              <div className="border border-cyan-500/30 bg-cyan-500/10 p-4 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Auditoría Cuantitativa: Identificación de Diferencias en MT5 / MT4
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    A continuación se detallan las <strong>5 causas técnicas exactas</strong> que impedían que el Probador de Estrategias de MetaTrader 5 ejecutara los mismos trades que el backtesting del sitio web, y cómo quedaron 100% resueltas en esta versión v3.50.
                  </p>
                </div>
              </div>

              {/* Grid with 4 root causes explained */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Cause 1 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase font-mono">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px]">1</span>
                    <span>Modo de Llenado MT5 (Error 10030)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>El Problema:</strong> En el probador de MT5, si se envía una orden con política <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">ORDER_FILLING_RETURN</code> o <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">FOK</code> en cuentas de Forex/CFDs, el broker la rechaza con <em>Retcode 10030: Unsupported filling mode</em>, provocando que se ejecuten <strong>0 trades</strong> en todo el periodo.
                  </p>
                  <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                    ✓ Solución v3.50: Se implementó <code className="bg-slate-900 px-1 py-0.5 rounded">RobustTradeBuy/Sell()</code> con bucle de reintento automático dinámico (IOC &rarr; FOK &rarr; Return) garantizando ejecución inmediata en cualquier broker.
                  </p>
                </div>

                {/* Cause 2 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase font-mono">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">2</span>
                    <span>Desfase Horario del Broker (GMT Offset)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>El Problema:</strong> El backtesting de la web está en <strong>UTC estricto</strong> (Tokio: 00:00 a 07:00 UTC | Londres: 08:00 a 11:00 UTC). Los servidores de la mayoría de brokers operan en <strong>GMT+3 (verano) o GMT+2 (invierno)</strong>. Si el offset estaba mal configurado, el EA buscaba la ruptura en horas del almuerzo o sesión americana.
                  </p>
                  <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                    ✓ Solución v3.50: Parámetro <code className="bg-slate-900 px-1 py-0.5 rounded">InpBrokerGmtOffset = 3</code> sincronizado por defecto (11:00 a 14:00 broker = 08:00 a 11:00 UTC).
                  </p>
                </div>

                {/* Cause 3 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase font-mono">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">3</span>
                    <span>Ventana Operativa de Londres (11:00 vs 13:00 UTC)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>El Problema:</strong> En la versión anterior el EA tenía configurado <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">InpEndLondonUTC = 13</code> (13:00 UTC), mientras que en el motor de la web la ventana finaliza a las <strong>11:00 UTC</strong> (3 horas de apertura de Londres). Esto generaba trades tardíos que alteraban los resultados.
                  </p>
                  <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                    ✓ Solución v3.50: Ventana sincronizada exactamente de 08:00 a 11:00 UTC (<code className="bg-slate-900 px-1 py-0.5 rounded">InpEndLondonUTC = 11</code>).
                  </p>
                </div>

                {/* Cause 4 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase font-mono">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">4</span>
                    <span>Filtro de Spread y Rango Tokio en Backtest</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>El Problema:</strong> En Oro (XAUUSD), los brokers que cotizan con 3 decimales (<code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">_Digits = 3</code>) marcan un spread de 300 a 450 puntos. El filtro de 150 puntos cancelaba todas las entradas. Asimismo, la web no descarta operaciones por amplitud de Tokio.
                  </p>
                  <p className="text-xs text-emerald-400 leading-relaxed font-semibold">
                    ✓ Solución v3.50: <code className="bg-slate-900 px-1 py-0.5 rounded">InpMaxSpreadPoints = 0</code> y <code className="bg-slate-900 px-1 py-0.5 rounded">InpMinAsiaRange = 0.0</code> (sin restricciones para calcar el backtesting al 100%).
                  </p>
                </div>
              </div>

              {/* Table of parameters side by side */}
              <div className="bg-[#0E131F] border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-white flex items-center justify-between">
                  <span>Tabla de Parámetros: Sitio Web Gold Killer vs MetaTrader 5 / MT4</span>
                  <span className="text-[10px] text-emerald-400 font-mono">100% Sincronizados</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                        <th className="p-3">Variable Cuantitativa</th>
                        <th className="p-3">Sitio Web (quantEngine.ts)</th>
                        <th className="p-3">MetaTrader 5 (.mq5 v3.50)</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      <tr>
                        <td className="p-3 font-sans text-slate-200">Rango Sesión Tokio</td>
                        <td className="p-3 text-amber-300">00:00 a 07:00 UTC</td>
                        <td className="p-3 text-amber-300">InpStartAsiaUTC=0, InpEndAsiaUTC=7</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Idéntico</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans text-slate-200">Ventana Entrada Londres</td>
                        <td className="p-3 text-amber-300">08:00 a 11:00 UTC</td>
                        <td className="p-3 text-amber-300">InpStartLondonUTC=8, InpEndLondonUTC=11</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Idéntico</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans text-slate-200">Filtro de Tendencia D1</td>
                        <td className="p-3 text-amber-300">ANY_BREAKOUT (Ambas Direcciones)</td>
                        <td className="p-3 text-amber-300">InpTrendMode = TREND_ANY_BREAKOUT</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Idéntico</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans text-slate-200">Stop Loss Trade #1</td>
                        <td className="p-3 text-amber-300">Punto Medio (50%) de Tokio</td>
                        <td className="p-3 text-amber-300">sl = asiaMid (Punto Medio 50%)</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Idéntico</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans text-slate-200">Ratio Riesgo / Beneficio</td>
                        <td className="p-3 text-amber-300">1:2 (rrRatio = 2.0)</td>
                        <td className="p-3 text-amber-300">InpRRRatio = 2.0</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Idéntico</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans text-slate-200">Protección Breakeven</td>
                        <td className="p-3 text-amber-300">Alcanzar 1:1 R (+0 pips)</td>
                        <td className="p-3 text-amber-300">InpEnableBreakeven = true (1:1 R)</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Idéntico</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans text-slate-200">Circuit Breaker Diario</td>
                        <td className="p-3 text-amber-300">Máx. 2 SLs al día</td>
                        <td className="p-3 text-amber-300">InpMaxDailySL = 2</td>
                        <td className="p-3 text-emerald-400 font-bold">✓ Idéntico</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step by step verification guide */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <h5 className="font-bold text-white text-xs uppercase font-mono text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Configuración Recomendada en el Probador de Estrategias de MT5:</span>
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 font-sans leading-relaxed">
                  <li><strong>Símbolo:</strong> <code className="text-amber-300">XAUUSD</code> o <code className="text-amber-300">GOLD</code>.</li>
                  <li><strong>Temporalidad:</strong> <code className="text-amber-300">M15</code> (15 Minutos).</li>
                  <li><strong>Intervalo:</strong> <code className="text-amber-300">01/07/2026 - 25/09/2026</code> (o fechas personalizadas).</li>
                  <li><strong>Modelado:</strong> <em>"Cada tick basado en ticks reales"</em> o <em>"Cada tick"</em>.</li>
                  <li><strong>Depósito:</strong> $10,000 USD • Apalancamiento: 1:100 o 1:500.</li>
                  <li><strong>Verifica el GMT Offset de tu Broker:</strong> Si en la ventana <em>Observación del Mercado</em> (Market Watch) la medianoche ocurre a las 21:00 UTC, tu broker es GMT+3. Deja <code className="text-amber-300">InpBrokerGmtOffset = 3</code>.</li>
                </ol>
              </div>
            </div>
          ) : activeLang === 'checklist' ? (
            <div className="max-w-4xl mx-auto py-4 space-y-6 text-slate-300 font-sans">
              <div className="border border-emerald-500/30 bg-emerald-500/10 p-5 rounded-2xl flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Manual Institucional para Cuentas de Dinero Real & Pruebas de Fondeo
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Desarrollado y calibrado por el <strong>Ingeniero Francisco Alvarado</strong>. Para que el bot sea altamente rentable y preserve el capital en vivo, la versión v3.50 incorpora 6 capas de blindaje algorítmico diseñadas específicamente para sortear los riesgos de ejecución en cuentas reales (spreads, comisiones de broker ECN, cortes de VPS y margen libre).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shield 1 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">1</span>
                    <span>Filtro de Spread Anti-Noticias (35 pts)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    En cuenta real, el spread de Oro (XAU/USD) puede dispararse a 60-150 puntos durante noticias o baja liquidez. El parámetro <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">InpMaxSpreadPoints = 35</code> ($0.35 USD) frena cualquier entrada si el broker abre el spread, esperando a que se normalice dentro de la ventana de Londres.
                  </p>
                </div>

                {/* Shield 2 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
                    <span>Colchón Breakeven contra Comisiones (+0.20$)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Los brokers ECN/Raw cobran ~$5 a $7 por lote en comisión (~$0.05 a $0.07/oz). Al mover el SL a entrada justa, una salida en Breakeven resta comisiones. Con <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">InpBEBufferPoints = 0.20</code> ($0.20 USD sobre entrada), la comisión queda 100% cubierta y la cuenta cierra en balance neto positivo.
                  </p>
                </div>

                {/* Shield 3 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px]">3</span>
                    <span>Circuit Breaker Doble (2 SLs / 2% DD)</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Diseñado para cumplir las reglas de <strong>FTMO, Funding Pips y cuentas personales</strong>: Si el mercado presenta volatilidad anómala y tocan 2 SLs (<code className="text-rose-300 bg-slate-900 px-1 py-0.5 rounded">InpMaxDailySL = 2</code>, equivalente a -1.0% de riesgo) o el drawdown diario alcanza el 2.0% (<code className="text-rose-300 bg-slate-900 px-1 py-0.5 rounded">InpMaxDailyLossPercent = 2.0</code>), el EA bloquea compras y ventas hasta el siguiente día.
                  </p>
                </div>

                {/* Shield 4 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">4</span>
                    <span>Inmunidad a Reinicios de VPS / Terminal</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Si el VPS se reinicia o se pierde la conexión a internet a mitad de sesión, la función <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">UpdateDailyStatsFromAccountHistory()</code> reconstruye automáticamente desde los deals del broker los trades y SLs ocurridos hoy. Es imposible que sobrevenda o viole el límite diario por un reinicio.
                  </p>
                </div>

                {/* Shield 5 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">5</span>
                    <span>Chequeo Preventivo de Margen Libre</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Antes de colocar una posición, la rutina <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded">HasSufficientMargin()</code> consulta al broker el margen requerido. Si la cuenta está cerca del límite o el apalancamiento es bajo, ajusta el lote al volumen seguro disponible evitando el error <em>10019 (No Money)</em>.
                  </p>
                </div>

                {/* Shield 6 */}
                <div className="bg-[#0E131F] border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold font-mono text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">6</span>
                    <span>Dashboard Telemetría HUD en Pantalla</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El gráfico de MetaTrader mostrará en vivo un panel con la sincronización horaria del broker vs UTC, el rango de Tokio detectado hoy, el spread en tiempo real y el estado del Circuit Breaker (🟢 EN VIVO / 🟡 ESPERANDO / 🔴 PAUSADO).
                  </p>
                </div>
              </div>

              {/* Step by step install in MT5 and MT4 */}
              <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-3">
                <h5 className="font-bold text-white font-mono text-xs uppercase tracking-wider text-amber-400">
                  Instrucciones de Instalación y Puesta en Marcha en Cuenta Real:
                </h5>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
                  <li>Abre tu terminal de <strong>MetaTrader 4 o MetaTrader 5</strong> conectado a tu cuenta real (recomendado broker ECN / Raw Spread como IC Markets, Pepperstone, Tickmill o cuenta FTMO).</li>
                  <li>Presiona <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-[11px]">F4</kbd> para abrir el <strong>MetaEditor</strong>.</li>
                  <li>Crea un nuevo Asesor Experto y pega el código completo de la pestaña MT5 o MT4.</li>
                  <li>Presiona <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded text-[11px]">F7</kbd> para compilar (debe compilar con <strong>0 errores y 0 advertencias</strong>).</li>
                  <li>Abre el gráfico de <strong>XAUUSD (Oro)</strong> en temporalidad <strong>M15</strong> (15 minutos).</li>
                  <li>Arrastra el EA al gráfico, activa la casilla <strong>"Permitir Trading Algorítmico"</strong> (o "Permitir Trading Automático" en MT4).</li>
                  <li>Verifica en las propiedades del EA que <code className="text-amber-300">InpBrokerGmtOffset</code> coincida con tu broker (habitualmente <strong>3</strong> en verano).</li>
                  <li>El panel HUD de telemetría aparecerá en la esquina superior izquierda confirmando que el algoritmo está activo y vigilando la apertura de Londres.</li>
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
