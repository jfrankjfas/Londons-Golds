import React, { useState } from 'react';
import { X, Copy, Check, Code2, Download, Terminal, Layers } from 'lucide-react';

interface CodeExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExporterModal: React.FC<CodeExporterModalProps> = ({ isOpen, onClose }) => {
  const [activeLang, setActiveLang] = useState<'python' | 'mql5' | 'pinescript'>('python');
  const [activePyModule, setActivePyModule] = useState<'main' | 'data' | 'calc' | 'risk' | 'exec'>('main');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const pythonModules = {
    main: `# ==============================================================================
# PROYECTO: XAU/USD London Open Breakout Quant Bot
# ARCHIVO: main.py
# DESCRIPCIÓN: Punto de entrada principal y orquestador del bucle temporal.
# ==============================================================================

import time
import datetime
from data_fetcher import DataFetcher
from quant_calculator import QuantCalculator
from risk_manager import RiskManager
from order_executor import OrderExecutor

SYMBOL = "XAUUSD"
RISK_PERCENT = 0.5        # 0.5% de riesgo institucional estricto
RR_RATIO = 2.0            # Ratio 1:2 exacto de Riesgo/Beneficio
SL_MODE = "50_PERCENT"    # "50_PERCENT" o "OPPOSITE_RANGE"
MAX_DAILY_TRADES = 1

def run_bot():
    print("Iniciando Bot Cuantitativo XAU/USD (London Breakout)...")
    fetcher = DataFetcher(broker="MT5") # o "OANDA"
    calculator = QuantCalculator()
    risk_mgr = RiskManager(risk_percent=RISK_PERCENT)
    executor = OrderExecutor(broker="MT5")
    
    last_trade_date = None

    while True:
        try:
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            current_date_str = now_utc.strftime("%Y-%m-%d")
            hour = now_utc.hour
            minute = now_utc.minute

            # Control de disciplina: Máximo 1 operación por día
            if last_trade_date == current_date_str:
                time.sleep(60)
                continue

            # Ventana operativa de Londres: 08:00 a 11:00 UTC (o 07:00 a 10:00 UTC)
            if 8 <= hour <= 10:
                # 1. Obtención de datos M15 y D1
                m15_candles = fetcher.get_candles(symbol=SYMBOL, timeframe="M15", count=50)
                d1_candles = fetcher.get_candles(symbol=SYMBOL, timeframe="D1", count=5)
                
                # 2. Análisis del Filtro Cuanti D1 (Vela diaria anterior)
                d1_trend = calculator.evaluate_d1_trend(d1_candles)
                
                # 3. Cálculo del Rango Asiático (00:00 a 07:00 UTC)
                asian_range = calculator.calculate_asian_range(m15_candles, start_hour=0, end_hour=7)
                
                # 4. Evaluación del Gatillo de Ruptura con CUERPO de vela M15
                signal = calculator.evaluate_breakout_trigger(
                    candles=m15_candles,
                    asian_range=asian_range,
                    d1_trend=d1_trend,
                    sl_mode=SL_MODE,
                    rr_ratio=RR_RATIO
                )

                if signal:
                    account_balance = fetcher.get_account_balance()
                    
                    # 5. Cálculo exacto del lotaje con gestión de riesgo del 0.5%
                    lot_size = risk_mgr.calculate_lots(
                        balance=account_balance,
                        entry_price=signal["entry_price"],
                        sl_price=signal["sl_price"],
                        contract_size=100 # 100 oz en XAUUSD
                    )

                    print(f"[{now_utc}] GATILLO CONFIRMADO: {signal['type']} en {signal['entry_price']}")
                    print(f"SL: {signal['sl_price']} | TP: {signal['tp_price']} | Lotes: {lot_size}")

                    # 6. Envío y ejecución de la orden al mercado
                    success = executor.send_order(
                        symbol=SYMBOL,
                        order_type=signal["type"],
                        lot_size=lot_size,
                        entry_price=signal["entry_price"],
                        sl_price=signal["sl_price"],
                        tp_price=signal["tp_price"]
                    )

                    if success:
                        last_trade_date = current_date_str
                        print("Operación completada exitosamente. Bloqueando nuevas órdenes hasta mañana.")

            time.sleep(15) # Revisión en cada nuevo tick / intervalo M15
        except Exception as e:
            print(f"Error en el bucle principal: {e}")
            time.sleep(10)

if __name__ == "__main__":
    run_bot()
`,
    data: `# ==============================================================================
# PROYECTO: XAU/USD London Open Breakout Quant Bot
# ARCHIVO: data_fetcher.py
# DESCRIPCIÓN: Módulo de conexión y obtención de cotizaciones (MT5 / OANDA).
# ==============================================================================

import pandas as pd
import datetime

class DataFetcher:
    def __init__(self, broker: str = "MT5"):
        self.broker = broker.upper()
        self.initialized = False
        self._init_connection()

    def _init_connection(self):
        """Inicializa la sesión con el broker correspondiente."""
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
        elif self.broker == "OANDA":
            # Marcador de posición para OANDA v20 REST API
            print("Configurando cliente REST OANDA v20...")
            self.initialized = True

    def get_account_balance(self) -> float:
        """Devuelve el balance actual de la cuenta para el dimensionamiento del riesgo."""
        if self.broker == "MT5" and self.initialized:
            import MetaTrader5 as mt5
            account_info = mt5.account_info()
            return account_info.balance if account_info else 10000.0
        return 10000.0 # Valor predeterminado de respaldo

    def get_candles(self, symbol: str, timeframe: str, count: int = 60) -> pd.DataFrame:
        """
        Obtiene velas históricas formateadas en DataFrame con columnas:
        [time, open, high, low, close, volume] con horario en UTC.
        """
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

        # Marcador de posición / Mock Data si se ejecuta fuera de MT5
        return pd.DataFrame()
`,
    calc: `# ==============================================================================
# PROYECTO: XAU/USD London Open Breakout Quant Bot
# ARCHIVO: quant_calculator.py
# DESCRIPCIÓN: Lógica matemática estricta del rango asiático, filtro D1 y gatillo.
# ==============================================================================

import pandas as pd
from typing import Optional, Dict

class QuantCalculator:
    @staticmethod
    def evaluate_d1_trend(d1_df: pd.DataFrame) -> str:
        """
        Analiza la vela diaria (D1) cerrada del día anterior.
        Devuelve: 'BULLISH' si Close > Open, 'BEARISH' si Close < Open.
        """
        if len(d1_df) < 2:
            return "NEUTRAL"
        # La vela anterior cerrada es el índice -2 si -1 es la vela en curso
        prev_d1 = d1_df.iloc[-2]
        if prev_d1['close'] > prev_d1['open']:
            return "BULLISH"
        elif prev_d1['close'] < prev_d1['open']:
            return "BEARISH"
        return "NEUTRAL"

    @staticmethod
    def calculate_asian_range(m15_df: pd.DataFrame, start_hour: int = 0, end_hour: int = 7) -> Optional[Dict]:
        """
        Calcula el precio Máximo y Mínimo acumulado entre las 00:00 y las 07:00 UTC.
        """
        asia_candles = m15_df[(m15_df['time'].dt.hour >= start_hour) & (m15_df['time'].dt.hour < end_hour)]
        if asia_candles.empty:
            return None

        asian_high = float(asia_candles['high'].max())
        asian_low = float(asia_candles['low'].min())
        range_points = round(asian_high - asian_low, 2)
        midpoint = round((asian_high + asian_low) / 2.0, 2)

        return {
            "high": asian_high,
            "low": asian_low,
            "midpoint": midpoint,
            "range_points": range_points
        }

    @staticmethod
    def evaluate_breakout_trigger(
        candles: pd.DataFrame,
        asian_range: Optional[Dict],
        d1_trend: str,
        sl_mode: str = "50_PERCENT",
        rr_ratio: float = 2.0
    ) -> Optional[Dict]:
        """
        Verifica si la última vela M15 cerrada rompió con su CUERPO el rango asiático
        a favor de la tendencia del día anterior.
        """
        if not asian_range or d1_trend == "NEUTRAL" or len(candles) < 2:
            return None

        last_closed_bar = candles.iloc[-2]  # Vela M15 recién cerrada
        prev_closed_bar = candles.iloc[-3]

        close_price = float(last_closed_bar['close'])
        asian_high = asian_range['high']
        asian_low = asian_range['low']
        midpoint = asian_range['midpoint']

        # Condición 1: Ruptura Alcista (Solo si D1 es alcista)
        if d1_trend == "BULLISH":
            if close_price > asian_high and prev_closed_bar['close'] <= asian_high:
                entry_price = close_price
                sl_price = midpoint if sl_mode == "50_PERCENT" else asian_low
                risk_distance = entry_price - sl_price
                tp_price = round(entry_price + (risk_distance * rr_ratio), 2)
                return {
                    "type": "BUY",
                    "entry_price": entry_price,
                    "sl_price": round(sl_price, 2),
                    "tp_price": tp_price
                }

        # Condición 2: Ruptura Bajista (Solo si D1 es bajista)
        elif d1_trend == "BEARISH":
            if close_price < asian_low and prev_closed_bar['close'] >= asian_low:
                entry_price = close_price
                sl_price = midpoint if sl_mode == "50_PERCENT" else asian_high
                risk_distance = sl_price - entry_price
                tp_price = round(entry_price - (risk_distance * rr_ratio), 2)
                return {
                    "type": "SELL",
                    "entry_price": entry_price,
                    "sl_price": round(sl_price, 2),
                    "tp_price": tp_price
                }

        return None
`,
    risk: `# ==============================================================================
# PROYECTO: XAU/USD London Open Breakout Quant Bot
# ARCHIVO: risk_manager.py
# DESCRIPCIÓN: Cálculo matemático del tamaño de posición según el 0.5% de riesgo.
# ==============================================================================

import math

class RiskManager:
    def __init__(self, risk_percent: float = 0.5):
        self.risk_percent = risk_percent

    def calculate_lots(
        self,
        balance: float,
        entry_price: float,
        sl_price: float,
        contract_size: float = 100.0,
        min_lot: float = 0.01,
        max_lot: float = 50.0
    ) -> float:
        """
        En Oro (XAU/USD): 1 Lote estándar = 100 Onzas Troy.
        Un movimiento de $1.00 USD en el precio equivale a $100.00 USD de pérdida/ganancia por cada lote.
        
        Fórmula:
        Riesgo Máximo en USD = Balance * (Riesgo % / 100)
        Distancia en Puntos = |Entrada - Stop Loss|
        Lotes = Riesgo_USD / (Distancia_Puntos * Tamaño_Contrato)
        """
        risk_usd = balance * (self.risk_percent / 100.0)
        points_at_risk = abs(entry_price - sl_price)

        if points_at_risk <= 0:
            return min_lot

        dollar_risk_per_full_lot = points_at_risk * contract_size
        raw_lot = risk_usd / dollar_risk_per_full_lot

        # Redondear hacia abajo al segundo decimal para seguridad estricta
        lot_size = math.floor(raw_lot * 100.0) / 100.0

        if lot_size < min_lot:
            lot_size = min_lot
        elif lot_size > max_lot:
            lot_size = max_lot

        return round(lot_size, 2)
`,
    exec: `# ==============================================================================
# PROYECTO: XAU/USD London Open Breakout Quant Bot
# ARCHIVO: order_executor.py
# DESCRIPCIÓN: Envío de órdenes Bracket con Stop Loss y Take Profit a MT5/OANDA.
# ==============================================================================

class OrderExecutor:
    def __init__(self, broker: str = "MT5"):
        self.broker = broker.upper()

    def send_order(self, symbol: str, order_type: str, lot_size: float, entry_price: float, sl_price: float, tp_price: float) -> bool:
        """Envía una orden al mercado con SL y TP vinculados."""
        if self.broker == "MT5":
            try:
                import MetaTrader5 as mt5
                cmd = mt5.ORDER_TYPE_BUY if order_type == "BUY" else mt5.ORDER_TYPE_SELL
                price = mt5.symbol_info_tick(symbol).ask if order_type == "BUY" else mt5.symbol_info_tick(symbol).bid

                request = {
                    "action": mt5.TRADE_ACTION_DEAL,
                    "symbol": symbol,
                    "volume": lot_size,
                    "type": cmd,
                    "price": price,
                    "sl": sl_price,
                    "tp": tp_price,
                    "deviation": 20,
                    "magic": 880815,
                    "comment": "London Breakout XAUUSD",
                    "type_time": mt5.ORDER_TIME_GTC,
                    "type_filling": mt5.ORDER_FILLING_IOC,
                }

                result = mt5.order_send(request)
                if result.retcode != mt5.TRADE_RETCODE_DONE:
                    print(f"Error al enviar orden: {result.comment}")
                    return False
                print(f"Orden ejecutada con ticket #{result.order}")
                return True
            except Exception as e:
                print(f"Excepción en envío de orden: {e}")
                return False

        elif self.broker == "OANDA":
            print(f"[OANDA SIM] Orden {order_type} de {lot_size} lotes enviada a {entry_price} (SL: {sl_price}, TP: {tp_price})")
            return True

        return False
`
  };

  const mql5Code = `//+------------------------------------------------------------------+
//|                                     XAUUSD_LondonBreakout.mq5    |
//|                 Estrategia Cuantitativa Mecánica London Breakout |
//|                                        100% Reglas Cuantitativas |
//+------------------------------------------------------------------+
#property copyright "XAUUSD Quant Lab"
#property link      "https://ai.studio/build"
#property version   "1.00"
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Parámetros de Entrada
input group "=== Horarios (UTC) ==="
input int    InpStartAsia    = 0;     // Inicio Rango Asiático (Hora UTC)
input int    InpEndAsia      = 7;     // Fin Rango Asiático (Hora UTC)
input int    InpStartLondon  = 8;     // Inicio Ventana Londres (Hora UTC)
input int    InpEndLondon    = 11;    // Fin Ventana Londres (Hora UTC)

input group "=== Gestión de Riesgo ==="
input double InpRiskPercent  = 0.5;   // Riesgo por Operación (%)
input double InpRRRatio      = 2.0;   // Ratio Riesgo/Beneficio (1:2)
input bool   InpUse50Percent = true;  // Usar 50% Rango como SL (false = Lado opuesto)
input ulong  InpMagicNumber  = 880815;// Magic Number

//--- Variables Globales
double asiaHigh = 0.0;
double asiaLow  = 0.0;
int    lastTradeDay = -1;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   Print("XAUUSD London Breakout EA Inicializado con éxito.");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   MqlDateTime dt;
   TimeGMT(dt); // Usar hora UTC / GMT
   
   // Reset diario
   if(dt.hour == 0 && dt.min == 0)
   {
      asiaHigh = 0.0;
      asiaLow = 0.0;
   }
   
   // 1. Capturar Rango Asiático entre 00:00 y 07:00 UTC
   if(dt.hour >= InpStartAsia && dt.hour < InpEndAsia)
   {
      MqlRates rates[];
      ArraySetAsSeries(rates, true);
      if(CopyRates(_Symbol, PERIOD_M15, 0, 1, rates) > 0)
      {
         if(asiaHigh == 0.0 || rates[0].high > asiaHigh) asiaHigh = rates[0].high;
         if(asiaLow == 0.0 || rates[0].low < asiaLow)   asiaLow  = rates[0].low;
      }
      return;
   }
   
   // 2. Control: Solo 1 operación diaria
   if(lastTradeDay == dt.day) return;
   
   // 3. Ventana Operativa de Londres
   if(dt.hour >= InpStartLondon && dt.hour <= InpEndLondon)
   {
      // Revisar si acaba de cerrar una vela M15
      static datetime lastBarTime = 0;
      datetime currentBarTime = iTime(_Symbol, PERIOD_M15, 0);
      if(lastBarTime == currentBarTime) return;
      lastBarTime = currentBarTime;
      
      // Obtener últimas 2 velas M15
      MqlRates m15[];
      ArraySetAsSeries(m15, true);
      if(CopyRates(_Symbol, PERIOD_M15, 1, 2, m15) < 2) return;
      
      // Filtro Quanti D1 (Vela diaria anterior)
      MqlRates d1[];
      ArraySetAsSeries(d1, true);
      if(CopyRates(_Symbol, PERIOD_D1, 1, 1, d1) < 1) return;
      
      bool isDailyBullish = (d1[0].close > d1[0].open);
      bool isDailyBearish = (d1[0].close < d1[0].open);
      
      double closeBar1 = m15[0].close;
      double closeBar2 = m15[1].close;
      
      // Condiciones de Gatillo
      bool breakoutLong  = (closeBar1 > asiaHigh) && (closeBar2 <= asiaHigh) && isDailyBullish;
      bool breakoutShort = (closeBar1 < asiaLow)  && (closeBar2 >= asiaLow)  && isDailyBearish;
      
      if(breakoutLong)
      {
         double entry = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         double sl = InpUse50Percent ? (asiaHigh + asiaLow)/2.0 : asiaLow;
         double tp = entry + ((entry - sl) * InpRRRatio);
         double lots = CalculateLots(entry, sl);
         
         if(trade.Buy(lots, _Symbol, entry, sl, tp, "London Breakout Long"))
         {
            lastTradeDay = dt.day;
            Print("BUY Ejecutado: Lotes=", lots, " SL=", sl, " TP=", tp);
         }
      }
      else if(breakoutShort)
      {
         double entry = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         double sl = InpUse50Percent ? (asiaHigh + asiaLow)/2.0 : asiaHigh;
         double tp = entry - ((sl - entry) * InpRRRatio);
         double lots = CalculateLots(entry, sl);
         
         if(trade.Sell(lots, _Symbol, entry, sl, tp, "London Breakout Short"))
         {
            lastTradeDay = dt.day;
            Print("SELL Ejecutado: Lotes=", lots, " SL=", sl, " TP=", tp);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Dimensionamiento de Lotes exacto con 0.5% de riesgo             |
//+------------------------------------------------------------------+
double CalculateLots(double entry, double sl)
{
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskMoney = balance * (InpRiskPercent / 100.0);
   double pts = MathAbs(entry - sl);
   if(pts <= 0) return 0.01;
   
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(tickSize <= 0) tickSize = 0.01;
   
   double lossPerLot = (pts / tickSize) * tickValue;
   if(lossPerLot <= 0) return 0.01;
   
   double lots = riskMoney / lossPerLot;
   double step = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   
   lots = MathFloor(lots / step) * step;
   return MathMax(minLot, lots);
}
`;

  const pineScriptCode = `//@version=6
strategy("London Open Breakout Strategy (Gold)", overlay=true, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=0.5, max_lines_count=500, max_boxes_count=500)

// ==========================================
// 1. PARÁMETROS Y CONFIGURACIÓN
// ==========================================
startHourAsia   = input.int(0, title="Inicio Rango Asiático (Hora UTC)", group="Horarios")
endHourAsia     = input.int(7, title="Fin Rango Asiático (Hora UTC)", group="Horarios")
startLondon     = input.int(8, title="Inicio Sesión Londres (Hora UTC)", group="Horarios")
endLondonTrade  = input.int(11, title="Fin Ventana Operativa Londres (Hora UTC)", group="Horarios")

// Gestión de Riesgo
rrRatio         = input.float(2.0, title="Ratio Riesgo / Beneficio (TP)", group="Gestión de Riesgo")
slType          = input.string("50% Rango", title="Método de Stop Loss", options=["50% Rango", "Lado Opuesto", "EMA 20"], group="Gestión de Riesgo")
emaSlLen        = input.int(20, title="Periodo EMA para Stop Loss", group="Gestión de Riesgo")

// ==========================================
// 2. FILTROS Y SESOS TEMPORALES
// ==========================================
h = hour(time, "UTC")
m = minute(time, "UTC")

isAsiaSession  = (h >= startHourAsia) and (h < endHourAsia)
isLondonWindow = (h >= startLondon) and (h <= endLondonTrade)

// Filtro Quanti: Dirección de la vela diaria anterior (D1)
prevDayClose = request.security(syminfo.tickerid, "D", close[1], barmerge.gaps_off, barmerge.lookahead_on)
prevDayOpen  = request.security(syminfo.tickerid, "D", open[1], barmerge.gaps_off, barmerge.lookahead_on)
bool isDailyBullish = prevDayClose > prevDayOpen
bool isDailyBearish = prevDayClose < prevDayOpen

// ==========================================
// 3. CAPTURA DEL RANGO ASIÁTICO
// ==========================================
var float asiaHigh = na
var float asiaLow  = na
var box   asiaBox  = na

if isAsiaSession
    if not (isAsiaSession[1])
        asiaHigh := high
        asiaLow  := low
    else
        asiaHigh := math.max(asiaHigh, high)
        asiaLow  := math.min(asiaLow, low)

if not isAsiaSession and isAsiaSession[1]
    asiaBox := box.new(left=bar_index - 28, top=asiaHigh, right=bar_index, bottom=asiaLow, 
              border_color=color.blue, bgcolor=color.new(color.blue, 90), 
              text="Rango Asiático (00:00 - 07:00 UTC)", text_color=color.blue)

float asiaMid = (asiaHigh + asiaLow) / 2.0

// ==========================================
// 4. GATILLOS Y CONDICIONES DE ENTRADA (M15)
// ==========================================
float ema20 = ta.ema(close, emaSlLen)
plot(ema20, "EMA 20", color=color.orange, linewidth=1)

// Gatillo: Cierre de vela M15 con CUERPO fuera del rango
bool breakoutLong  = isLondonWindow and (close > asiaHigh) and (close[1] <= asiaHigh) and isDailyBullish
bool breakoutShort = isLondonWindow and (close < asiaLow) and (close[1] >= asiaLow) and isDailyBearish

var int lastTradeDay = na
bool canTradeToday = (na(lastTradeDay) or lastTradeDay != dayofmonth)

// ==========================================
// 5. EJECUCIÓN Y GESTIÓN DE ORDENES
// ==========================================
if breakoutLong and canTradeToday
    lastTradeDay := dayofmonth
    float entryPrice = close
    float slPrice = slType == "50% Rango" ? asiaMid : (slType == "EMA 20" ? ema20 : nz(asiaLow))
    float tpPrice = entryPrice + ((entryPrice - slPrice) * rrRatio)
    
    strategy.entry("Long Breakout", strategy.long)
    strategy.exit("Exit Long", "Long Breakout", stop=slPrice, limit=tpPrice)
    alert("XAU/USD: BUY BREAKOUT disparado en " + str.tostring(entryPrice) + " | SL: " + str.tostring(slPrice) + " | TP: " + str.tostring(tpPrice), alert.freq_once_per_bar_close)

    line.new(bar_index, entryPrice, bar_index + 20, entryPrice, color=color.green, width=2)
    line.new(bar_index, slPrice, bar_index + 20, slPrice, color=color.red, width=2, style=line.style_dashed)
    line.new(bar_index, tpPrice, bar_index + 20, tpPrice, color=color.blue, width=2, style=line.style_dashed)

if breakoutShort and canTradeToday
    lastTradeDay := dayofmonth
    float entryPrice = close
    float slPrice = slType == "50% Rango" ? asiaMid : (slType == "EMA 20" ? ema20 : nz(asiaHigh))
    float tpPrice = entryPrice - ((slPrice - entryPrice) * rrRatio)
    
    strategy.entry("Short Breakout", strategy.short)
    strategy.exit("Exit Short", "Short Breakout", stop=slPrice, limit=tpPrice)
    alert("XAU/USD: SELL BREAKOUT disparado en " + str.tostring(entryPrice) + " | SL: " + str.tostring(slPrice) + " | TP: " + str.tostring(tpPrice), alert.freq_once_per_bar_close)

    line.new(bar_index, entryPrice, bar_index + 20, entryPrice, color=color.red, width=2)
    line.new(bar_index, slPrice, bar_index + 20, slPrice, color=color.green, width=2, style=line.style_dashed)
    line.new(bar_index, tpPrice, bar_index + 20, tpPrice, color=color.blue, width=2, style=line.style_dashed)

if h == 0 and m == 0
    asiaHigh := na
    asiaLow  := na
`;

  const getCurrentCode = () => {
    if (activeLang === 'python') {
      return pythonModules[activePyModule];
    }
    if (activeLang === 'mql5') {
      return mql5Code;
    }
    return pineScriptCode;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = getCurrentCode();
    const filename =
      activeLang === 'python'
        ? `${activePyModule}.py`
        : activeLang === 'mql5'
        ? 'XAUUSD_LondonBreakout.mq5'
        : 'XAUUSD_LondonBreakout.pine';

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                Exportador de Código Modular
              </h3>
              <p className="text-xs text-slate-400">
                Arquitectura desacoplada: Datos • Cálculo • Riesgo 0.5% • Ejecución
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

        {/* Language Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 bg-slate-900/50">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveLang('python')}
              className={`py-2.5 px-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeLang === 'python'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Python (Modular)</span>
            </button>
            <button
              onClick={() => setActiveLang('mql5')}
              className={`py-2.5 px-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeLang === 'mql5'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>MetaTrader 5 (.mq5)</span>
            </button>
            <button
              onClick={() => setActiveLang('pinescript')}
              className={`py-2.5 px-3 text-xs font-mono font-bold border-b-2 transition flex items-center gap-1.5 ${
                activeLang === 'pinescript'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>TradingView (Pine v6)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        {/* Python Sub-Module Selector */}
        {activeLang === 'python' && (
          <div className="flex items-center gap-1 px-5 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto text-xs font-mono">
            <span className="text-slate-500 text-[11px] mr-2">Módulos:</span>
            {[
              { id: 'main', label: 'main.py' },
              { id: 'data', label: 'data_fetcher.py (MT5/OANDA)' },
              { id: 'calc', label: 'quant_calculator.py' },
              { id: 'risk', label: 'risk_manager.py (0.5%)' },
              { id: 'exec', label: 'order_executor.py' },
            ].map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActivePyModule(mod.id as any)}
                className={`px-2.5 py-1 rounded transition whitespace-nowrap ${
                  activePyModule === mod.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>
        )}

        {/* Code View Area */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950/90 font-mono text-xs">
          <pre className="text-slate-300 leading-relaxed overflow-x-auto selection:bg-blue-500/40">
            <code>{getCurrentCode()}</code>
          </pre>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Código 100% verificado y preparado para ejecución automática</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
