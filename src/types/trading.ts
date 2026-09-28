export interface Candle {
  time: string;       // "YYYY-MM-DD HH:mm" (UTC)
  timestamp: number;  // unix timestamp ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  hour: number;
  minute: number;
  dayOfMonth: number;
  ema20?: number;
}

export interface DayData {
  date: string;       // "YYYY-MM-DD"
  prevDayOpen: number;
  prevDayClose: number;
  prevDayTrend: 'BULLISH' | 'BEARISH';
  candles: Candle[];
}

export type StrategyType = 'LONDON_BREAKOUT' | 'NY_ORB';

export interface AsianRange {
  high: number;
  low: number;
  midpoint: number;
  rangePoints: number; // high - low in USD
  startBarIndex: number;
  endBarIndex: number;
  startTime: string;
  endTime: string;
  isComplete: boolean;
}

export interface NYOpeningRange {
  high: number;
  low: number;
  midpoint: number;
  rangePoints: number; // high - low in USD
  startBarIndex: number;
  endBarIndex: number;
  startTime: string;   // 13:30 UTC
  endTime: string;     // 13:45 UTC
  isComplete: boolean;
}

export type StopLossType = '50_PERCENT' | 'OPPOSITE_RANGE' | 'EMA_20';

export interface StrategyParameters {
  startHourAsia: number;    // 0 UTC
  endHourAsia: number;      // 7 UTC
  startLondon: number;      // 7 or 8 UTC
  endLondonTrade: number;   // 10 or 11 UTC
  rrRatio: number;          // 2.0 (1:2)
  slMethod: StopLossType;   // '50_PERCENT' | 'OPPOSITE_RANGE' | 'EMA_20'
  riskPercent: number;      // 0.5% por operación
  accountBalance: number;   // default 10,000 USD
  maxTradesPerDay: number;  // número total de trades
  
  // Nuevos parámetros de gestión de riesgo institucional
  maxSlPerDay: number;          // Límite de SL por día (por defecto: 2)
  maxTpPerDay: number;          // Límite de TP por día (por defecto: 2)
  dailyRiskLimitPercent: number;// Límite de riesgo diario total en % (por defecto: 1.0%)
  autoRiskPerTrade: boolean;    // Coherencia automática: riskPercent = dailyRiskLimitPercent / maxSlPerDay
  
  // Gestión dinámica de Breakeven en 1:1
  enableBreakEven: boolean;     // Mover SL a Breakeven cuando el trade alcance ratio 1:1
  beTriggerRatio: number;       // Ratio de activación (por defecto 1.0 = 1:1)
  beOffsetPips: number;         // Offset de pips al mover a BE (ej. 0.0 o 0.2 para comisiones)
  
  // Modo de filtro de dirección de ruptura
  trendMode?: 'ANY_BREAKOUT' | 'D1_STRICT'; // ANY_BREAKOUT permite operar rupturas hacia ambos lados confirmados
  
  // Filtro de Amplitud de Rango Asiático (Tokio)
  minAsiaRange?: number;        // Amplitud mínima en $ (por defecto: 6.0)
  maxAsiaRange?: number;        // Amplitud máxima en $ (por defecto: 32.0 - Filtro Anti-Sobreextensión)

  // Potenciador V2.0 Pro y V3.0 Pure
  version?: 'V1_ORIGINAL' | 'V2_PRO' | 'V3_PURE';
  enableRetestEntry?: boolean;      // Permite entrada por retesteo/pullback al nivel de Tokio
  retestTolerancePoints?: number;   // Tolerancia en puntos para pullback ($2.0)
  tightRetestSl?: boolean;          // SL ceñido en retesteo (mínimo swing / 5-7 pts) para mayor lotaje
  enableNYSession?: boolean;        // Habilitar 2da ventana operativa Apertura Nueva York (13:30 - 15:30 UTC)
  startNYHour?: number;             // 13 UTC
  startNYMinute?: number;           // 30
  endNYHour?: number;               // 15 UTC
  endNYMinute?: number;             // 30

  // Nueva Estrategia: NY ORB (Opening Range Breakout)
  strategyType?: StrategyType;      // 'LONDON_BREAKOUT' | 'NY_ORB'
  orbDurationMinutes?: number;      // 15 min (13:30 a 13:45 UTC)
  orbStartHour?: number;            // 13 UTC
  orbStartMinute?: number;          // 30
  orbTradeEndHour?: number;         // 16 UTC (fin de ventana operativa)
  orbTradeEndMinute?: number;       // 30
  maxOrbRange?: number;             // Rango maximo de apertura ($15.0 USD)
  minOrbRange?: number;             // Rango minimo de apertura ($3.0 USD)
}

export interface DailyRiskTracker {
  slCountToday: number;
  tpCountToday: number;
  maxSlPerDay: number;
  maxTpPerDay: number;
  dailyRiskLimitPercent: number;
  status: 'ACTIVE' | 'LOCKED_BY_SL' | 'LOCKED_BY_TP';
  statusMessage: string;
}

export interface TradeSignal {
  id: string;
  date: string;
  type: 'LONG' | 'SHORT';
  barIndex: number;
  time: string;
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  riskAmountUSD: number;
  projectedProfitUSD: number;
  lotSize: number;
  status: 'PENDING' | 'ACTIVE' | 'HIT_TP' | 'HIT_SL' | 'BREAKEVEN' | 'EXPIRED';
  exitPrice?: number;
  exitTime?: string;
  exitReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'BREAKEVEN' | 'SESSION_CLOSE';
  pnlUSD?: number;
  pnlPips?: number;
  
  // Seguimiento de Breakeven en 1:1
  isBreakevenTriggered?: boolean;
  bePrice?: number;
  originalSlPrice?: number;
  beTriggeredTime?: string;
  session?: 'LONDON' | 'NEW_YORK';
  triggerType?: 'INITIAL_BREAKOUT' | 'M15_RETEST';
}

export interface MarketSessionInfo {
  currentSession: 'ASIA' | 'PRE_LONDON' | 'LONDON_OPEN' | 'LONDON_NY' | 'CLOSED';
  sessionName: string;
  nextSessionName: string;
  secondsToNextSession: number;
  utcTimeFormatted: string;
  isTradingWindow: boolean;
}

export interface TradeAlert {
  id: string;
  timestamp: number;
  timeStr: string;
  type: 'ASIAN_RANGE_SET' | 'LONDON_OPEN' | 'BREAKOUT_TRIGGERED' | 'TP_HIT' | 'SL_HIT' | 'BREAKEVEN_TRIGGERED' | 'DAILY_LIMIT';
  title: string;
  message: string;
  level?: number;
  read: boolean;
}
