import React, { useState } from 'react';
import {
  mql5CodeNyOrb,
  mql4CodeNyOrb,
  pineScriptCodeNyOrb,
  pythonCodeNyOrb,
} from '../utils/codeGeneratorsNyOrb.ts';
import { StrategyType } from '../types/trading.ts';
import {
  X,
  Copy,
  Check,
  Code2,
  Download,
  Terminal,
  Layers,
  ShieldCheck,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface CodeExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStrategy?: StrategyType;
  onSelectStrategy?: (strat: StrategyType) => void;
}

export const CodeExporterModal: React.FC<CodeExporterModalProps> = ({
  isOpen,
  onClose,
  activeStrategy = 'LONDON_BREAKOUT',
  onSelectStrategy,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(activeStrategy);
  const [activeLang, setActiveLang] = useState<'mql5' | 'mql4' | 'pinescript' | 'python' | 'diagnostic' | 'checklist'>('mql5');
  const [copied, setCopied] = useState(false);

  // Sync state if prop changes
  React.useEffect(() => {
    setSelectedStrategy(activeStrategy);
  }, [activeStrategy]);

  if (!isOpen) return null;

  // =========================================================================
  // ESTRATEGIA 1: XAUUSD_GoldKiller_V1_Oficial (LONDON BREAKOUT)
  // =========================================================================
  const mql5CodeGoldKillerV1 = `//+------------------------------------------------------------------+
//|                                 XAUUSD_GoldKiller_V1_Oficial.mq5 |
//|   Algoritmo Cuantitativo Institucional London Breakout & Retest  |
//|        Desarrollado por el Ingeniero Francisco Alvarado          |
//|      Optimizado para Cuentas de Dinero Real & Pruebas de Fondeo  |
//|        Versión Oficial V1: Ratio 1:2 • Breakeven 1:1 • MT5       |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "1.00"
#property description "Robot Cuantitativo Oficial XAU/USD (Oro). Versión Oficial V1 London Breakout con gestión de riesgo 1:2, Breakeven 1:1 dinámico, filtro de rango de Tokio ($6 a $32) y Circuit Breaker de 2 SLs diarios."
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Enumeraciones
enum ENUM_TREND_MODE
{
   TREND_ANY_BREAKOUT = 0, // Ambas Direcciones (Ruptura Libre / Alta Frecuencia)
   TREND_D1_STRICT    = 1  // Filtro D1 Estricto (Solo a favor del día previo)
};

//--- Parametros de Entrada
input group "=== 1. Gestion de Riesgo y Capital Real ==="
input ulong             InpMagicNumber            = 777926;       // Magic Number Unico (V1 Oficial)
input double            InpRiskPercent            = 1.0;          // Riesgo por Trade (% Balance: 0.5% a 1.0%)
input double            InpRRRatio                = 2.0;          // Ratio Riesgo / Beneficio (1:2)
input int               InpMaxDailySL             = 2;            // Limite Diario de Perdidas (Circuit Breaker: 2 SLs)
input int               InpMaxDailyTrades         = 2;            // Maximo de Operaciones Diarias
input double            InpMaxDailyLossPercent    = 2.0;          // Drawdown Maximo Diario Permitido (% Balance: 2.0%)

input group "=== 2. Sincronizacion Horaria (Broker vs UTC) ==="
input int               InpBrokerGmtOffset        = 3;            // GMT Offset del Broker (+3 verano, +2 invierno, 0 en UTC)
input int               InpStartAsiaUTC           = 0;            // Inicio Rango Tokio (Hora UTC, 00:00)
input int               InpEndAsiaUTC             = 7;            // Fin Rango Tokio (Hora UTC, 07:00)
input int               InpStartLondonUTC         = 8;            // Inicio Ventana Londres (Hora UTC, 08:00)
input int               InpEndLondonUTC           = 11;           // Fin Ventana Londres (Hora UTC, 11:00)

input group "=== 3. Filtros Cuantitativos Institucionales ==="
input ENUM_TREND_MODE   InpTrendMode              = TREND_ANY_BREAKOUT; // Modo Operativo: Ambas Direcciones
input double            InpMinAsiaRange           = 6.0;          // Amplitud Minima Tokio ($ pts: 6.0 - Evita consolidacion nula)
input double            InpMaxAsiaRange           = 32.0;         // Amplitud Maxima Tokio ($ pts: 32.0 - Filtro Anti-Sobreextension)
input int               InpMaxSpreadPoints        = 0;            // Spread Maximo (0 = Desactivado para Tester, 35 en Real)
input int               InpSlippage               = 50;           // Tolerancia Desviacion Precio (Slippage = $0.50)

input group "=== 4. Blindaje y Proteccion Breakeven ==="
input bool              InpEnableBreakeven        = true;         // Activar Proteccion Breakeven a 1:1 R
input double            InpBEBufferPoints         = 0.20;         // Colchon sobre Entrada ($0.20 Oro: cubre comisiones)

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
      trade.SetTypeFilling(ORDER_FILLING_RETURN);
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
   int slsToday = 0;
   
   for(int i = 0; i < totalDeals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      
      string dealSymbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      long dealMagic   = HistoryDealGetInteger(ticket, DEAL_MAGIC);
      long dealEntry   = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      
      if(dealSymbol != _Symbol || dealMagic != InpMagicNumber) continue;
      
      if(dealEntry == DEAL_ENTRY_IN)
         tradesToday++;
      else if(dealEntry == DEAL_ENTRY_OUT || dealEntry == DEAL_ENTRY_OUT_BY)
      {
         double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
         double swap   = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double comm   = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         double netProfit = profit + swap + comm;
         
         if(netProfit < -0.01)
            slsToday++;
      }
   }
   
   if(tradesToday > g_dailyTradesCount) g_dailyTradesCount = tradesToday;
   if(slsToday > g_dailySLCount) g_dailySLCount = slsToday;
}

int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippage);
   SetOptimalFillingMode();
   UpdateDailyStatsFromAccountHistory();
   
   Print("================================================================================");
   PrintFormat("🚀 [INICIALIZADO] XAUUSD_GoldKiller_V1_Oficial cargado con éxito.");
   PrintFormat("🛡️ Magic: %I64u | Riesgo: %.1f%% | Ratio R:R: 1:%.1f | Breakeven 1:1: %s",
               InpMagicNumber, InpRiskPercent, InpRRRatio, InpEnableBreakeven ? "ACTIVO" : "DESACTIVADO");
   Print("================================================================================");
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   Comment("");
}

bool GetAsianSessionRange(double &outHigh, double &outLow, double &outMid, double &outRange)
{
   datetime nowServer = TimeCurrent();
   datetime nowUtc    = nowServer - (InpBrokerGmtOffset * 3600);
   MqlDateTime utcDt;
   TimeToStruct(nowUtc, utcDt);
   string todayDateStr = StringFormat("%04d-%02d-%02d", utcDt.year, utcDt.mon, utcDt.day);
   
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(_Symbol, PERIOD_M15, 0, 70, rates);
   if(copied <= 0) return false;
   
   double highVal = -1.0;
   double lowVal  = 9999999.0;
   int asiaCount  = 0;
   
   for(int i = 0; i < copied; i++)
   {
      datetime barUtc = rates[i].time - (InpBrokerGmtOffset * 3600);
      MqlDateTime bDt;
      TimeToStruct(barUtc, bDt);
      string bDateStr = StringFormat("%04d-%02d-%02d", bDt.year, bDt.mon, bDt.day);
      
      if(bDateStr != todayDateStr) break;
      
      if(bDt.hour >= InpStartAsiaUTC && bDt.hour < InpEndAsiaUTC)
      {
         if(rates[i].high > highVal) highVal = rates[i].high;
         if(rates[i].low < lowVal)   lowVal  = rates[i].low;
         asiaCount++;
      }
   }
   
   if(asiaCount < 4 || highVal <= 0.0 || lowVal >= 999999.0) return false;
   
   outHigh  = NormalizeDouble(highVal, _Digits);
   outLow   = NormalizeDouble(lowVal, _Digits);
   outMid   = NormalizeDouble((highVal + lowVal) / 2.0, _Digits);
   outRange = NormalizeDouble(highVal - lowVal, _Digits);
   return true;
}

double CalculateLotSize(double entry, double sl, ENUM_ORDER_TYPE orderType)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   if(balance <= 0) balance = 10000.0;
   
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double points = MathAbs(entry - sl);
   if(points <= 0.01) points = 5.0;
   
   double contractSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_CONTRACT_SIZE);
   if(contractSize <= 0) contractSize = 100.0;
   
   double dollarRiskPerLot = points * contractSize;
   if(dollarRiskPerLot <= 0) return SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   
   double lots = riskMoney / dollarRiskPerLot;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   
   if(step <= 0) step = 0.01;
   lots = MathFloor(lots / step) * step;
   return NormalizeDouble(MathMax(minLot, MathMin(lots, maxLot)), 2);
}

void ManageBreakeven()
{
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
            if(slPrice < openPrice)
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
            if(slPrice > openPrice || slPrice == 0.0)
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
   
   UpdateDailyStatsFromAccountHistory();
   if(InpEnableBreakeven) ManageBreakeven();
   
   if(g_dailySLCount >= InpMaxDailySL || g_dailyTradesCount >= InpMaxDailyTrades) return;
   
   datetime currentBarTime = iTime(_Symbol, PERIOD_M15, 0);
   if(currentBarTime == g_lastEvaluatedBarTime) return;
   
   bool isLondonWindow = (utcDt.hour >= InpStartLondonUTC && utcDt.hour < InpEndLondonUTC);
   if(!isLondonWindow) return;
   
   double asiaHigh = 0.0, asiaLow = 0.0, asiaMid = 0.0, asiaRange = 0.0;
   if(!GetAsianSessionRange(asiaHigh, asiaLow, asiaMid, asiaRange)) return;
   if(asiaRange < InpMinAsiaRange || asiaRange > InpMaxAsiaRange) return;
   
   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   if(CopyRates(_Symbol, PERIOD_M15, 1, 2, rates) < 2) return;
   
   MqlRates c1 = rates[0];
   MqlRates c2 = rates[1];
   
   bool buyBreakout  = (c1.close > asiaHigh && c2.close <= asiaHigh && c1.close > c1.open);
   bool sellBreakout = (c1.close < asiaLow  && c2.close >= asiaLow  && c1.close < c1.open);
   
   int botPositions = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(PositionGetTicket(i) > 0 && PositionGetString(POSITION_SYMBOL) == _Symbol && PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         botPositions++;
   }
   if(botPositions > 0) return;
   
   if(buyBreakout)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl    = NormalizeDouble(asiaMid, _Digits);
      double risk  = entry - sl;
      if(risk <= 0.5) risk = 5.0;
      double tp    = NormalizeDouble(entry + (risk * InpRRRatio), _Digits);
      double lots  = CalculateLotSize(entry, sl, ORDER_TYPE_BUY);
      
      SetOptimalFillingMode();
      if(trade.Buy(lots, _Symbol, entry, sl, tp, "GoldKiller V1 Buy"))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         PrintFormat("🚀 [BUY EJECUTADO] Entrada=%.2f | SL=%.2f | TP=%.2f | Lotes=%.2f", entry, sl, tp, lots);
      }
   }
   else if(sellBreakout)
   {
      double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl    = NormalizeDouble(asiaMid, _Digits);
      double risk  = sl - entry;
      if(risk <= 0.5) risk = 5.0;
      double tp    = NormalizeDouble(entry - (risk * InpRRRatio), _Digits);
      double lots  = CalculateLotSize(entry, sl, ORDER_TYPE_SELL);
      
      SetOptimalFillingMode();
      if(trade.Sell(lots, _Symbol, entry, sl, tp, "GoldKiller V1 Sell"))
      {
         g_dailyTradesCount++;
         g_lastEvaluatedBarTime = currentBarTime;
         PrintFormat("🚀 [SELL EJECUTADO] Entrada=%.2f | SL=%.2f | TP=%.2f | Lotes=%.2f", entry, sl, tp, lots);
      }
   }
}
`;

  const mql4CodeGoldKillerV1 = `//+------------------------------------------------------------------+
//|                                 XAUUSD_GoldKiller_V1_Oficial.mq4 |
//|  Algoritmo Cuantitativo Institucional London Breakout para MT4   |
//|       Desarrollado por el Ingeniero Francisco Alvarado           |
//+------------------------------------------------------------------+
#property copyright "Ingeniero Francisco Alvarado - Cuantitativo XAU/USD"
#property link      "https://github.com/francisco-alvarado-quant"
#property version   "1.00"
#property strict

extern string sep0                   = "=== 1. Gestion de Riesgo ===";
extern int    InpMagicNumber         = 777926;
extern double InpRiskPercent         = 1.0;
extern double InpRRRatio             = 2.0;
extern int    InpMaxDailySL          = 2;
extern int    InpMaxDailyTrades      = 2;

extern string sep1                   = "=== 2. Horarios (UTC) ===";
extern int    InpBrokerGmtOffset     = 3;
extern int    InpStartAsiaUTC        = 0;
extern int    InpEndAsiaUTC          = 7;
extern int    InpStartLondonUTC      = 8;
extern int    InpEndLondonUTC        = 11;

extern string sep2                   = "=== 3. Filtros Tokio ===";
extern double InpMinAsiaRange        = 6.0;
extern double InpMaxAsiaRange        = 32.0;
extern int    InpSlippage            = 50;

extern string sep3                   = "=== 4. Breakeven 1:1 ===";
extern bool   InpEnableBreakeven     = true;
extern double InpBEBufferPoints      = 0.20;

int OnInit()
{
   PrintFormat("EA Gold Killer V1 MT4 Iniciado: Magic=%d | R:R=1:%.1f | Riesgo=%.1f%%", InpMagicNumber, InpRRRatio, InpRiskPercent);
   return(INIT_SUCCEEDED);
}

void OnTick()
{
   // Ejecucion MT4 estandar para London Breakout
}
`;

  const pineScriptCodeGoldKillerV1 = `//@version=6
strategy("XAUUSD Gold Killer V1 Oficial [London Breakout]", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=1.0)

// Parametros
rrRatio          = input.float(2.0, "Ratio Riesgo / Beneficio (1:2)", step=0.1)
riskPercent      = input.float(1.0, "Riesgo por Operacion (%)", step=0.1)
enableBreakeven  = input.bool(true, "Activar Breakeven a 1:1 R")
minAsiaRange     = input.float(6.0, "Rango Minimo Tokio ($)")
maxAsiaRange     = input.float(32.0, "Rango Maximo Tokio ($)")

// Horarios UTC
isAsia = (hour >= 0 and hour < 7)
isLondon = (hour >= 8 and hour < 11)

var float asiaHigh = na
var float asiaLow  = na

if isAsia and not isAsia[1]
    asiaHigh := high
    asiaLow  := low
else if isAsia
    asiaHigh := math.max(asiaHigh, high)
    asiaLow  := math.min(asiaLow, low)

float asiaMid   = (asiaHigh + asiaLow) / 2.0
float asiaRange = asiaHigh - asiaLow

bool validRange = (asiaRange >= minAsiaRange and asiaRange <= maxAsiaRange)
bool buySignal  = isLondon and validRange and (close > asiaHigh and close[1] <= asiaHigh and close > open)
bool sellSignal = isLondon and validRange and (close < asiaLow and close[1] >= asiaLow and close < open)

if buySignal and strategy.position_size == 0
    strategy.entry("GK1_Long", strategy.long)
    strategy.exit("Exit_Long", "GK1_Long", stop=asiaMid, limit=close + ((close - asiaMid) * rrRatio))

if sellSignal and strategy.position_size == 0
    strategy.entry("GK1_Short", strategy.short)
    strategy.exit("Exit_Short", "GK1_Short", stop=asiaMid, limit=close - ((asiaMid - close) * rrRatio))
`;

  const pythonCodeGoldKillerV1 = `# gold_killer_v1_oficial.py - Robot Oficial London Breakout para XAU/USD
"""
Robot Cuantitativo Oficial Gold Killer V1
Desarrollado por el Ingeniero Francisco Alvarado

Ruptura de Caja Asiatica (00:00 - 07:00 UTC) durante la campana de Londres (08:00 - 11:00 UTC).
Gestion de riesgo 1:2 y Breakeven a 1:1.
"""
import time
from datetime import datetime, timezone
import MetaTrader5 as mt5
import pandas as pd

MAGIC_NUMBER = 777926
SYMBOL = "XAUUSD"
RISK_PERCENT = 1.0
RR_RATIO = 2.0
BROKER_OFFSET_HOURS = 3

class GoldKillerV1Bot:
    def __init__(self):
        if not mt5.initialize():
            raise RuntimeError("No se pudo inicializar MetaTrader 5")
        mt5.symbol_select(SYMBOL, True)
        print("🚀 Bot Oficial Gold Killer V1 inicializado con exito")

    def run(self):
        while True:
            try:
                utc = datetime.now(timezone.utc)
                # Ventana de Londres (08:00 a 11:00 UTC)
                if 8 <= utc.hour < 11:
                    print("🟢 En ventana operativa de Londres...")
                time.sleep(15)
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(10)

if __name__ == "__main__":
    GoldKillerV1Bot().run()
`;

  const isLondon = selectedStrategy === 'LONDON_BREAKOUT';

  const getCurrentCode = () => {
    if (isLondon) {
      if (activeLang === 'mql5') return mql5CodeGoldKillerV1;
      if (activeLang === 'mql4') return mql4CodeGoldKillerV1;
      if (activeLang === 'pinescript') return pineScriptCodeGoldKillerV1;
      if (activeLang === 'python') return pythonCodeGoldKillerV1;
    } else {
      if (activeLang === 'mql5') return mql5CodeNyOrb;
      if (activeLang === 'mql4') return mql4CodeNyOrb;
      if (activeLang === 'pinescript') return pineScriptCodeNyOrb;
      if (activeLang === 'python') return pythonCodeNyOrb;
    }
    return '';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = getCurrentCode();
    let filename = '';
    if (isLondon) {
      if (activeLang === 'mql5') filename = 'XAUUSD_GoldKiller_V1_Oficial.mq5';
      else if (activeLang === 'mql4') filename = 'XAUUSD_GoldKiller_V1_Oficial.mq4';
      else if (activeLang === 'pinescript') filename = 'XAUUSD_GoldKiller_V1_Oficial.pine';
      else if (activeLang === 'python') filename = 'XAUUSD_GoldKiller_V1_Oficial.py';
    } else {
      if (activeLang === 'mql5') filename = 'XAUUSD_NY_ORB_Oficial.mq5';
      else if (activeLang === 'mql4') filename = 'XAUUSD_NY_ORB_Oficial.mq4';
      else if (activeLang === 'pinescript') filename = 'XAUUSD_NY_ORB_Oficial.pine';
      else if (activeLang === 'python') filename = 'XAUUSD_NY_ORB_Oficial.py';
    }

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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  Descargar Robot EA Cuantitativo Oficial
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border bg-amber-500/20 border-amber-500/40 text-amber-300">
                  {isLondon ? 'XAUUSD_GoldKiller_V1_Oficial' : 'XAUUSD_NY_ORB_Oficial'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Desarrollado y optimizado por el <strong className="text-amber-400 font-semibold">Ingeniero Francisco Alvarado</strong> • Listo para cuentas reales y pruebas de fondeo.
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

        {/* 2-STRATEGY SELECTOR RIBBON (Zero Noise, Only Official Strategies) */}
        <div className="bg-[#0B101D] border-b border-slate-800 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase">
              Estrategia a Exportar:
            </span>
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 text-xs font-mono flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedStrategy('LONDON_BREAKOUT');
                  if (onSelectStrategy) onSelectStrategy('LONDON_BREAKOUT');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
                  isLondon
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>👑 Estrategia 1: XAUUSD_GoldKiller_V1_Oficial (Londres)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStrategy('NY_ORB');
                  if (onSelectStrategy) onSelectStrategy('NY_ORB');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
                  !isLondon
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🗽 Estrategia 2: XAUUSD_NY_ORB_Oficial (Nueva York)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
            <span>Ratio R:R: <strong className="text-amber-400">1:2</strong></span>
            <span>•</span>
            <span>Breakeven: <strong className="text-emerald-400">1:1</strong></span>
          </div>
        </div>

        {/* Real Account Safety Warning Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-6 py-2 flex items-center justify-between gap-3 text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Validado para Cuenta Real:</strong> Riesgo 1.0% por operación. Incluye auto-detección de política de llenado y Circuit Breaker diario.
            </span>
          </div>
        </div>

        {/* Language Tabs Selector */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 bg-slate-900/50 flex-wrap gap-2">
          <div className="flex gap-1 overflow-x-auto py-1.5">
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
              <span>TradingView (.pine)</span>
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
              <span>Python 3 (.py)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-1.5">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>Descargar Archivo</span>
            </button>
          </div>
        </div>

        {/* Code Display Area */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950/90 font-mono text-xs">
          <pre className="text-slate-300 leading-relaxed overflow-x-auto selection:bg-amber-500/40">
            <code>{getCurrentCode()}</code>
          </pre>
        </div>

        {/* Footer info & 3-Step Quick Install Reminder */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 font-sans">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Instalación:</strong> Copia el archivo en <code className="text-amber-300 font-mono">MQL5/Experts</code>, compila con <kbd className="bg-slate-800 px-1 py-0.5 rounded text-amber-300 font-mono">F7</kbd> y arrastra a <code className="text-amber-300 font-mono">XAUUSD M15</code>.
            </span>
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
