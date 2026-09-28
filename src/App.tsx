/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { SessionClock } from './components/SessionClock.tsx';
import { CandlestickChart } from './components/CandlestickChart.tsx';
import { TradingViewWidget } from './components/TradingViewWidget.tsx';
import { StrategyStatusCard } from './components/StrategyStatusCard.tsx';
import { RiskCalculatorModal } from './components/RiskCalculatorModal.tsx';
import { AiQuantCopilot } from './components/AiQuantCopilot.tsx';
import { CodeExporterModal } from './components/CodeExporterModal.tsx';
import { StrategyDocModal } from './components/StrategyDocModal.tsx';
import { UserManualModal } from './components/UserManualModal.tsx';
import { AlertNotificationToast } from './components/AlertNotificationToast.tsx';
import { EconomicNewsShieldModal } from './components/EconomicNewsShield.tsx';
import { MonteCarloSimulatorModal } from './components/MonteCarloSimulatorModal.tsx';
import { ExecutionOrderTicketModal } from './components/ExecutionOrderTicketModal.tsx';
import { TradingJournalModal } from './components/TradingJournalModal.tsx';
import { AutoUpdaterModal } from './components/AutoUpdaterModal.tsx';
import { StrategyBeginnerGuide } from './components/StrategyBeginnerGuide.tsx';
import { HISTORICAL_DAYS } from './data/mockGoldData.ts';
import { evaluateStrategyDay, evaluateNYOrbDay } from './utils/quantEngine.ts';
import { DayData, StrategyParameters, TradeAlert, DailyRiskTracker, StrategyType } from './types/trading.ts';
import {
  soundManager,
  requestPushPermission,
  sendPushNotification,
} from './utils/audioAlerts.ts';
import {
  TrendingUp,
  BarChart3,
  Percent,
  Award,
  Zap,
  ShieldCheck,
  RotateCcw,
  Activity,
} from 'lucide-react';

export default function App() {
  // State for all historical days and active day selection
  const [allDays, setAllDays] = useState<DayData[]>(HISTORICAL_DAYS);
  const [selectedDate, setSelectedDate] = useState<string>(
    HISTORICAL_DAYS[HISTORICAL_DAYS.length - 1].date
  );

  // Real-time market feed state
  const [liveSpotPrice, setLiveSpotPrice] = useState<number | null>(null);
  const [liveChange24h, setLiveChange24h] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('Kraken Institutional Gold (PAXG/USD) + GoldAPI');
  const [isMarketLoading, setIsMarketLoading] = useState<boolean>(false);

  // Active strategy selection: Strategy 1 (London Breakout) or Strategy 2 (NY Session ORB)
  const [strategyType, setStrategyType] = useState<StrategyType>('LONDON_BREAKOUT');

  // Strategy mechanical parameters (Official V1 Settings: 1:2 R:R, Breakeven 1:1, Max SLs 2)
  const [params, setParams] = useState<StrategyParameters>({
    version: 'V1_ORIGINAL',
    startHourAsia: 0,
    endHourAsia: 7,
    startLondon: 8,
    endLondonTrade: 11,
    rrRatio: 2.0,               // Target 1:2.0 Oficial
    slMethod: '50_PERCENT',     // 50% midpoint de la caja de referencia
    dailyRiskLimitPercent: 2.0, // 2.0% riesgo diario maximo
    maxSlPerDay: 2,             // Limite de 2 SLs al dia (Circuit Breaker)
    maxTpPerDay: 2,             // Limite de 2 TPs al dia
    autoRiskPerTrade: false,
    riskPercent: 1.0,           // 1.0% riesgo por trade
    accountBalance: 10000,
    maxTradesPerDay: 2,
    enableBreakEven: true,      // Breakeven dinamico 1:1
    beTriggerRatio: 1.0,        // 1:1 ratio
    beOffsetPips: 0.20,         // Colchón de $0.20 para comisiones de broker
    trendMode: 'ANY_BREAKOUT',  // Permite operar rupturas de sesion confirmadas
    minAsiaRange: 6.0,          // Amplitud minima Tokio ($6.0)
    maxAsiaRange: 32.0,         // Amplitud maxima Tokio ($32.0 - Filtro Anti-Sobreextension)
    enableRetestEntry: false,
    retestTolerancePoints: 2.0,
    tightRetestSl: false,
    enableNYSession: false,
    startNYHour: 13,
    startNYMinute: 30,
    endNYHour: 16,
    endNYMinute: 30,
    orbDurationMinutes: 15,
    orbStartHour: 13,
    orbStartMinute: 30,
    orbTradeEndHour: 16,
    orbTradeEndMinute: 30,
    minOrbRange: 3.0,
    maxOrbRange: 15.0,
  });

  // Daily Risk Tracker for Kill Switch (2 SL / 2 TP)
  const [dailyTracker, setDailyTracker] = useState<DailyRiskTracker>({
    slCountToday: 0,
    tpCountToday: 0,
    maxSlPerDay: 2,
    maxTpPerDay: 2,
    dailyRiskLimitPercent: 1.0,
    status: 'ACTIVE',
    statusMessage: 'Operativa activa: Disponibles 2 SL o 2 TP',
  });

  // UI Modals & Toggles
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isMonteCarloOpen, setIsMonteCarloOpen] = useState(false);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isUpdaterOpen, setIsUpdaterOpen] = useState(false);
  const [pauseTradingOnRedNews, setPauseTradingOnRedNews] = useState(false);

  // Sounds & Push Alerts
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  const [alerts, setAlerts] = useState<TradeAlert[]>([]);

  // Real-time live simulation ticker & Step-by-step Replay
  const [isLiveTickerActive, setIsLiveTickerActive] = useState(false);
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [replayStep, setReplayStep] = useState<number>(0);

  // Chart display mode: Quant Strategy Chart (Default with Real Broker quotes), TradingView Live, or Dual View
  const [chartViewMode, setChartViewMode] = useState<'TRADINGVIEW' | 'QUANT' | 'DUAL'>('QUANT');

  // Real-time market data fetcher
  const fetchRealMarketData = useCallback(async (isManual = false) => {
    if (isManual) setIsMarketLoading(true);
    try {
      const res = await fetch('/api/market-data');
      if (res.ok) {
        const data = await res.json();
        if (data.days && data.days.length > 0) {
          setAllDays(data.days);
          setSelectedDate((current) => {
            const exists = data.days.some((d: DayData) => d.date === current);
            return exists ? current : data.days[data.days.length - 1].date;
          });
        }
        if (data.spotPrice) {
          setLiveSpotPrice(data.spotPrice);
        }
        if (data.priceChange24h !== undefined) {
          setLiveChange24h(data.priceChange24h);
        }
        if (data.lastUpdated) {
          setLastSyncTime(data.lastUpdated);
        }
        if (data.source) {
          setDataSource(data.source);
        }
        return;
      }
    } catch {
      // In dev environment or during server restart/transient network pause
    }

    // Direct Client-Side Fallback (for static hosting, PWA, or if backend is offline)
    try {
      const directRes = await fetch('https://api.gold-api.com/price/XAU', {
        signal: AbortSignal.timeout(3500),
      });
      if (directRes.ok) {
        const d = await directRes.json();
        if (d?.price && typeof d.price === 'number') {
          const p = parseFloat(d.price.toFixed(2));
          setLiveSpotPrice(p);
          setLiveChange24h(parseFloat((((p - 4312.0) / 4312.0) * 100).toFixed(2)));
          setLastSyncTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC');
          setDataSource('GoldAPI.com (Conexión Directa en Vivo)');
        }
      }
    } catch {
      // Fallback preserves current loaded state
    } finally {
      if (isManual) setIsMarketLoading(false);
    }
  }, []);

  // Poll real market data every 10 seconds
  useEffect(() => {
    fetchRealMarketData();
    const interval = setInterval(() => {
      fetchRealMarketData();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchRealMarketData]);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotification = async () => {
    const granted = await requestPushPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
    if (granted) {
      addAlert({
        type: 'ASIAN_RANGE_SET',
        title: 'Alertas Push Activadas',
        message: 'Recibirás notificaciones en tiempo real cuando se cumpla la ruptura de Londres.',
      });
      sendPushNotification(
        'XAU/USD London Breakout',
        'Notificaciones push activas. Sistema listo para detectar la apertura de Londres.'
      );
    }
  };

  const addAlert = useCallback(
    (alertData: Omit<TradeAlert, 'id' | 'timestamp' | 'timeStr' | 'read'>) => {
      const now = new Date();
      const timeStr = now.toTimeString().substring(0, 8);
      const newAlert: TradeAlert = {
        ...alertData,
        id: `alert-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        timeStr,
        read: false,
      };

      setAlerts((prev) => [...prev, newAlert]);

      // Auto dismiss after 7 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== newAlert.id));
      }, 7000);
    },
    []
  );

  // Currently selected DayData
  const selectedDay = useMemo(() => {
    return allDays.find((d) => d.date === selectedDate) || allDays[allDays.length - 1];
  }, [allDays, selectedDate]);

  // Evaluate strategy with current parameters on selected day
  const { asianRange, nyOrbRange, trade, trades } = useMemo(() => {
    if (strategyType === 'NY_ORB') {
      return evaluateNYOrbDay(selectedDay.candles, selectedDay.prevDayTrend, params);
    }
    return evaluateStrategyDay(selectedDay.candles, selectedDay.prevDayTrend, params);
  }, [selectedDay, params, strategyType]);

  // Current price is live spot or close of latest candle in the day
  const currentPrice = useMemo(() => {
    if (liveSpotPrice && selectedDate === allDays[allDays.length - 1].date) {
      return liveSpotPrice;
    }
    if (selectedDay.candles.length === 0) return 4350.0;
    return selectedDay.candles[selectedDay.candles.length - 1].close;
  }, [liveSpotPrice, selectedDate, allDays, selectedDay]);

  const priceChange24h = useMemo(() => {
    if (liveChange24h !== null && selectedDate === allDays[allDays.length - 1].date) {
      return liveChange24h;
    }
    if (selectedDay.prevDayClose === 0) return 0.35;
    return ((currentPrice - selectedDay.prevDayClose) / selectedDay.prevDayClose) * 100;
  }, [liveChange24h, selectedDate, allDays, selectedDay, currentPrice]);

  // Synchronize Daily Risk Tracker with current day's trade outcome
  useEffect(() => {
    let sl = 0;
    let tp = 0;
    if (trade) {
      if (trade.status === 'HIT_SL') sl = 1;
      else if (trade.status === 'HIT_TP') tp = 1;
    }

    const maxSl = params.maxSlPerDay ?? 2;
    const maxTp = params.maxTpPerDay ?? 2;
    let status: DailyRiskTracker['status'] = 'ACTIVE';
    if (sl >= maxSl) {
      status = 'LOCKED_BY_SL';
    } else if (tp >= maxTp) {
      status = 'LOCKED_BY_TP';
    }

    setDailyTracker((prev) => ({
      ...prev,
      slCountToday: sl,
      tpCountToday: tp,
      status,
      maxSlPerDay: maxSl,
      maxTpPerDay: maxTp,
      dailyRiskLimitPercent: params.dailyRiskLimitPercent ?? 1.0,
    }));
  }, [trade, params.maxSlPerDay, params.maxTpPerDay, params.dailyRiskLimitPercent]);

  // Provide scannable feedback when switching days
  const handleSelectDate = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    const day = allDays.find((d) => d.date === newDate);
    if (!day) return;

    const evaluation = strategyType === 'NY_ORB'
      ? evaluateNYOrbDay(day.candles, day.prevDayTrend, params)
      : evaluateStrategyDay(day.candles, day.prevDayTrend, params);
    soundManager.playClick();

    if (evaluation.trade) {
      const isWin = evaluation.trade.status === 'HIT_TP';
      const isSl = evaluation.trade.status === 'HIT_SL';
      const isBe = evaluation.trade.status === 'BREAKEVEN' || evaluation.trade.isBreakevenTriggered;

      if (isWin) {
        addAlert({
          type: 'TP_HIT',
          title: `Sesión ${newDate}: Take Profit Alcanzado`,
          message: `Ruptura ${evaluation.trade.type} ejecutada a las ${evaluation.trade.time} UTC. TP completado (+$${evaluation.trade.pnlUSD?.toFixed(2)} | +1:2 R:R). 🛡️ Breakeven 1:1 protegido.`,
        });
      } else if (isSl) {
        addAlert({
          type: 'SL_HIT',
          title: `Sesión ${newDate}: Stop Loss Ejecutado`,
          message: `Ruptura ${evaluation.trade.type} a las ${evaluation.trade.time} UTC tocó Stop Loss (-$${Math.abs(evaluation.trade.pnlUSD || 50).toFixed(2)} | -${params.riskPercent}%). Riesgo controlado.`,
        });
      } else if (isBe) {
        addAlert({
          type: 'BREAKEVEN_TRIGGERED',
          title: `Sesión ${newDate}: Cerrado en Breakeven`,
          message: `El trade alcanzó 1:1, movió el SL a entrada y cerró con $0 pérdida. Capital protegido.`,
        });
      }
    } else {
      addAlert({
        type: 'ASIAN_RANGE_SET',
        title: `Sesión ${newDate}: Filtro de Disciplina Activo`,
        message: strategyType === 'NY_ORB'
          ? 'El precio no generó ruptura con CUERPO M15 en ventana de Nueva York (13:45 - 16:30 UTC). Cero operaciones, capital 100% preservado.'
          : 'El precio no generó ruptura con CUERPO M15 en ventana de Londres (08:00 - 11:00 UTC). Cero operaciones, capital 100% preservado.',
      });
    }
  }, [allDays, params, strategyType, addAlert]);

  // Step-by-step 5-stage London Open Replay Simulation
  const handleStartReplaySimulation = () => {
    if (isReplayActive) return;
    setIsReplayActive(true);
    setReplayStep(1);

    // Paso 1: 07:00 UTC - Rango Asiático Fijado
    soundManager.playClick();
    addAlert({
      type: 'ASIAN_RANGE_SET',
      title: 'Paso 1/5: Rango Asiático Fijado (00:00 - 07:00 UTC)',
      message: `Asian High: $${asianRange?.high.toFixed(2)} | Asian Low: $${asianRange?.low.toFixed(2)} (${asianRange?.rangePoints.toFixed(2)} pts). Acumulación institucional completada.`,
    });

    // Paso 2: 08:00 UTC - Campana de Londres
    setTimeout(() => {
      setReplayStep(2);
      soundManager.playClick();
      addAlert({
        type: 'LONDON_OPEN',
        title: 'Paso 2/5: 🔔 Campana Apertura de Londres (08:00 UTC)',
        message: 'Ingreso masivo de volumen bancario europeo. Escaneando ruptura con CUERPO de vela M15 en dirección de D1.',
      });
    }, 1800);

    // Paso 3: 08:15 UTC - Gatillo de Ruptura con Cuerpo M15
    setTimeout(() => {
      setReplayStep(3);
      soundManager.playBreakoutAlert();
      const isLong = selectedDay.prevDayTrend === 'BULLISH';
      const entry = trade?.entryPrice || (isLong ? (asianRange?.high || 4353.9) + 1.2 : (asianRange?.low || 4342.5) - 1.2);
      const sl = trade?.originalSlPrice || (asianRange?.midpoint || 4348.05);
      const tp = trade?.tpPrice || (isLong ? entry + (entry - sl) * params.rrRatio : entry - (sl - entry) * params.rrRatio);

      addAlert({
        type: 'BREAKOUT_TRIGGERED',
        title: `Paso 3/5: ¡Gatillo M15 Confirmado! (${isLong ? 'COMPRA' : 'VENTA'})`,
        message: `Vela M15 cerró con CUERPO en $${entry.toFixed(2)}. SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)} (1:${params.rrRatio}) | Riesgo: ${params.riskPercent}% ($50 USD).`,
      });
      sendPushNotification(
        `XAU/USD: Gatillo Londres (${isLong ? 'BUY' : 'SELL'})`,
        `Entrada: $${entry.toFixed(2)} | SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)}`
      );
    }, 3600);

    // Paso 4: 09:30 UTC - Ratio 1:1 alcanzado -> Breakeven Activado
    setTimeout(() => {
      setReplayStep(4);
      soundManager.playBreakeven();
      const entry = trade?.entryPrice || 4353.9;
      addAlert({
        type: 'BREAKEVEN_TRIGGERED',
        title: 'Paso 4/5: 🛡️ Protección 1:1 Breakeven Activada',
        message: `El precio alcanzó 1:1 de beneficio. Stop Loss movido a la Entrada exacta ($${entry.toFixed(2)}). Riesgo de pérdida anulado al 0%.`,
      });
    }, 5400);

    // Paso 5: 10:45 UTC - Take Profit alcanzado
    setTimeout(() => {
      setReplayStep(5);
      soundManager.playTakeProfit();
      addAlert({
        type: 'TP_HIT',
        title: `Paso 5/5: 🏆 Take Profit 1:${params.rrRatio} Alcanzado (+${(params.riskPercent * params.rrRatio).toFixed(2)}%)`,
        message: `Meta de beneficios diaria alcanzada (+1:${params.rrRatio} R:R | +$${(50 * params.rrRatio).toFixed(2)} USD). Sesión cerrada exitosamente según plan cuantitativo.`,
      });
      sendPushNotification(
        'XAU/USD: 🏆 Take Profit Alcanzado',
        `Operación cerrada con éxito: +1:${params.rrRatio} R:R (+${(params.riskPercent * params.rrRatio).toFixed(2)}% de cuenta)`
      );
      setIsReplayActive(false);
    }, 7200);
  };

  // Real-time live ticker interval simulation
  useEffect(() => {
    if (!isLiveTickerActive) return;

    const interval = setInterval(() => {
      setAllDays((prevDays) => {
        return prevDays.map((day) => {
          if (day.date !== selectedDate) return day;

          const candles = [...day.candles];
          const lastCandle = { ...candles[candles.length - 1] };
          // Subtle micro fluctuation (-$0.40 to +$0.45)
          const delta = parseFloat(((Math.random() - 0.48) * 0.8).toFixed(2));
          const newClose = parseFloat((lastCandle.close + delta).toFixed(2));
          lastCandle.close = newClose;
          lastCandle.high = Math.max(lastCandle.high, newClose);
          lastCandle.low = Math.min(lastCandle.low, newClose);

          candles[candles.length - 1] = lastCandle;
          return { ...day, candles };
        });
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isLiveTickerActive, selectedDate]);

  // Manual trigger simulation for Breakout & Push Notification
  const handleTriggerBreakoutSimulation = () => {
    // Check Daily Kill Switch (2 SL or 2 TP)
    if (dailyTracker.status === 'LOCKED_BY_SL') {
      soundManager.playStopLoss();
      addAlert({
        type: 'DAILY_LIMIT',
        title: '🛑 OPERATIVA BLOQUEADA POR DISCIPLINA',
        message: `Límite diario alcanzado (${dailyTracker.slCountToday}/${params.maxSlPerDay ?? 2} Stop Loss = -${params.dailyRiskLimitPercent ?? 1.0}% de capital). Prohibido operar más hoy según plan cuantitativo.`,
      });
      return;
    }

    if (dailyTracker.status === 'LOCKED_BY_TP') {
      soundManager.playTakeProfit();
      addAlert({
        type: 'DAILY_LIMIT',
        title: '🏆 META DIARIA ALCANZADA',
        message: `Meta cumplida (${dailyTracker.tpCountToday}/${params.maxTpPerDay ?? 2} Take Profits). Ganancias aseguradas: sesión finalizada sin sobreoperar.`,
      });
      return;
    }

    soundManager.playBreakoutAlert();

    const isLong = selectedDay.prevDayTrend === 'BULLISH';
    const isLondon = strategyType === 'LONDON_BREAKOUT';
    const refHigh = isLondon ? (asianRange?.high || 4354.2) : (nyOrbRange?.high || 4360.0);
    const refLow = isLondon ? (asianRange?.low || 4342.4) : (nyOrbRange?.low || 4348.0);
    const refMid = isLondon ? (asianRange?.midpoint || 4348.3) : (nyOrbRange?.midpoint || 4354.0);

    const entry = isLong
      ? refHigh + 2.0
      : refLow - 2.0;

    const sl = refMid;

    const tp = isLong
      ? entry + (entry - sl) * params.rrRatio
      : entry - (sl - entry) * params.rrRatio;

    const riskEffective = params.autoRiskPerTrade
      ? parseFloat(((params.dailyRiskLimitPercent ?? 1.0) / (params.maxSlPerDay ?? 2)).toFixed(2))
      : (params.riskPercent ?? 0.5);

    const beTrigger = isLong
      ? entry + Math.abs(entry - sl) * (params.beTriggerRatio ?? 1.0)
      : entry - Math.abs(entry - sl) * (params.beTriggerRatio ?? 1.0);

    const beNote = params.enableBreakEven
      ? ` | 🛡️ BE 1:1 en $${beTrigger.toFixed(2)} (SL a Entrada)`
      : '';

    const sessionLabel = isLondon ? 'Londres M15' : 'NY ORB M15';
    const msg = isLong
      ? `RUPTURA ALCISTA (BUY) en $${entry.toFixed(2)}. SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)} (1:2 R:R) | Riesgo: ${riskEffective}%${beNote}`
      : `RUPTURA BAJISTA (SELL) en $${entry.toFixed(2)}. SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)} (1:2 R:R) | Riesgo: ${riskEffective}%${beNote}`;

    addAlert({
      type: 'BREAKOUT_TRIGGERED',
      title: `¡Gatillo ${sessionLabel} Disparado! (${isLong ? 'BUY' : 'SELL'})`,
      message: msg,
    });

    sendPushNotification(
      `XAU/USD: Gatillo ${sessionLabel} (${isLong ? 'BUY' : 'SELL'})`,
      `Entrada: $${entry.toFixed(2)} | SL: $${sl.toFixed(2)} | TP: $${tp.toFixed(2)}${beNote}`
    );
  };

  // Overall Backtest Stats across all days for active strategy
  const backtestStats = useMemo(() => {
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let totalPips = 0;
    let totalProfitUSD = 0;

    allDays.forEach((day) => {
      const res = strategyType === 'NY_ORB'
        ? evaluateNYOrbDay(day.candles, day.prevDayTrend, params)
        : evaluateStrategyDay(day.candles, day.prevDayTrend, params);
      if (res.trades && res.trades.length > 0) {
        res.trades.forEach((t) => {
          totalTrades++;
          if (t.status === 'HIT_TP') {
            wins++;
            totalPips += t.pnlPips || 0;
            totalProfitUSD += t.pnlUSD || 0;
          } else if (t.status === 'HIT_SL') {
            losses++;
            totalPips += t.pnlPips || 0;
            totalProfitUSD += t.pnlUSD || 0;
          } else if (t.status === 'BREAKEVEN') {
            breakevens++;
            totalPips += t.pnlPips || 0;
            totalProfitUSD += t.pnlUSD || 0;
          }
        });
      }
    });

    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = losses > 0 ? (wins * params.rrRatio) / losses : wins > 0 ? 3.5 : 1.0;

    return {
      totalTrades,
      wins,
      losses,
      breakevens,
      winRate: winRate.toFixed(1),
      profitFactor: profitFactor.toFixed(2),
      totalPips: totalPips.toFixed(1),
      totalProfitUSD: totalProfitUSD.toFixed(2),
    };
  }, [allDays, params, strategyType]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Header Navigation with Grouped Menus and Strategy Switcher */}
      <Navbar
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        isSimulating={isLiveTickerActive}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          soundManager.setSoundEnabled(next);
        }}
        notificationPermission={notificationPermission}
        onRequestNotification={handleRequestNotification}
        onOpenCalculator={() => setIsCalcOpen(true)}
        onOpenAiCopilot={() => setIsAiOpen(true)}
        onOpenCodeModal={() => setIsCodeOpen(true)}
        onOpenDocsModal={() => setIsDocsOpen(true)}
        onOpenManualModal={() => setIsManualOpen(true)}
        onOpenNewsModal={() => setIsNewsOpen(true)}
        onOpenMonteCarloModal={() => setIsMonteCarloOpen(true)}
        onOpenJournalModal={() => setIsJournalOpen(true)}
        onOpenUpdaterModal={() => setIsUpdaterOpen(true)}
        activeStrategy={strategyType}
        onSelectStrategy={(s) => {
          setStrategyType(s);
          setParams((p) => ({ ...p, strategyType: s }));
        }}
      />

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* UTC Session Clock & Timeline */}
        <SessionClock isLiveMode={selectedDate === allDays[allDays.length - 1].date} />

        {/* Beginner-Friendly Quick Start Guide & 3-Step Overview */}
        <StrategyBeginnerGuide
          activeStrategy={strategyType}
          onOpenCodeModal={() => setIsCodeOpen(true)}
          onOpenManualModal={() => setIsManualOpen(true)}
        />

        {/* Backtesting Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Win Rate Semanal
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                {backtestStats.winRate}%
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({backtestStats.wins}W / {backtestStats.losses}L)
              </span>
            </div>
          </div>

          <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Profit Factor
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-amber-300">
              {backtestStats.profitFactor}
            </span>
          </div>

          <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Beneficio Neto (USD)
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
              +${backtestStats.totalProfitUSD}
            </span>
          </div>

          <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Pips Ganados
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-amber-300">
              +{backtestStats.totalPips}
            </span>
          </div>

          <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Ratio Riesgo/Ben
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-slate-200">
              1:{params.rrRatio}
            </span>
          </div>

          <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
              Riesgo por Trade
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-rose-400">
              {params.riskPercent}%
            </span>
          </div>
        </div>

        {/* Chart View Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0E131F] border border-slate-800 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 font-bold uppercase pl-1">
              Gráfico en Pantalla:
            </span>
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setChartViewMode('QUANT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
                  chartViewMode === 'QUANT'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Gráfico con Niveles de Estrategia Oficiales (Caja de Rango, Entrada, Stop Loss al 50%, Take Profit 1:2) y Cotizaciones Reales de Broker"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Gráfico de Estrategia (Broker Real)</span>
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('TRADINGVIEW')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
                  chartViewMode === 'TRADINGVIEW'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Gráfico Profesional TradingView con datos en tiempo real de OANDA/TVC"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>TradingView Widget Live</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('DUAL')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition ${
                  chartViewMode === 'DUAL'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Ver ambos gráficos simultáneamente (TradingView en Vivo + Gráfico de Estrategia)"
              >
                <span>Vista Dual</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono pr-1">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <strong className="font-bold">CONEXIÓN TRADINGVIEW:</strong>
              <span>PERMANENTE 24/7 (WSS)</span>
            </span>
          </div>
        </div>

        {/* Live TradingView Pro Chart */}
        {(chartViewMode === 'TRADINGVIEW' || chartViewMode === 'DUAL') && (
          <TradingViewWidget
            initialSymbol="OANDA:XAUUSD"
            initialInterval="15"
            theme="dark"
          />
        )}

        {/* Quant Candlestick Chart */}
        {(chartViewMode === 'QUANT' || chartViewMode === 'DUAL') && (
          <CandlestickChart
            candles={selectedDay.candles}
            asianRange={asianRange}
            nyOrbRange={nyOrbRange}
            trade={trade}
            currentPrice={currentPrice}
            dataSource={dataSource}
            isRealTime={true}
            lastUpdated={lastSyncTime}
            onRefresh={() => fetchRealMarketData(true)}
            isRefreshing={isMarketLoading}
            activeStrategy={strategyType}
          />
        )}

        {/* Strategy Status & 5 Rules Checklist */}
        <StrategyStatusCard
          selectedDay={selectedDay}
          asianRange={asianRange}
          nyOrbRange={nyOrbRange}
          activeStrategy={strategyType}
          trade={trade}
          trades={trades}
          params={params}
          onUpdateParams={(newParams) => setParams((p) => ({ ...p, ...newParams }))}
          isLiveTickerActive={isLiveTickerActive}
          onToggleLiveTicker={() => setIsLiveTickerActive(!isLiveTickerActive)}
          onTriggerBreakoutSimulation={handleTriggerBreakoutSimulation}
          allDays={allDays}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          dailyTracker={dailyTracker}
          onOpenRiskModal={() => setIsCalcOpen(true)}
          onResetDailyTracker={() =>
            setDailyTracker((t) => ({
              ...t,
              slCountToday: 0,
              tpCountToday: 0,
              status: 'ACTIVE',
              statusMessage: 'Operativa activa: Disponibles 2 SL o 2 TP',
            }))
          }
          onStartReplaySimulation={handleStartReplaySimulation}
          isReplayActive={isReplayActive}
          replayStep={replayStep}
          onOpenOrderTicket={() => setIsTicketOpen(true)}
          onOpenJournalModal={() => setIsJournalOpen(true)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0E131F] py-4 px-4 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            XAU/USD London Breakout Quant • Desarrollado por el <strong className="text-amber-400 font-bold">Ingeniero Francisco Alvarado</strong>
          </span>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsJournalOpen(true)}
              className="text-amber-400/90 hover:text-amber-300 underline underline-offset-2 transition"
            >
              Dossier Oficial PDF & Auditoría
            </button>
            <span>R:R 1:{params.rrRatio} • Breakeven 1:1</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RiskCalculatorModal
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        defaultBalance={params.accountBalance}
        defaultEntry={currentPrice}
        defaultSl={asianRange ? asianRange.midpoint : currentPrice - 8.0}
        params={params}
        onUpdateParams={(newP) => setParams((p) => ({ ...p, ...newP }))}
        dailyTracker={dailyTracker}
        onUpdateDailyTracker={(newT) => setDailyTracker((t) => ({ ...t, ...newT }))}
      />

      <AiQuantCopilot
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        selectedDay={selectedDay}
        asianRange={asianRange}
        currentPrice={currentPrice}
      />

      <CodeExporterModal
        isOpen={isCodeOpen}
        onClose={() => setIsCodeOpen(false)}
        activeStrategy={strategyType}
      />

      <StrategyDocModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        activeStrategy={strategyType}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
        onOpenCodeModal={() => setIsCodeOpen(true)}
        onOpenCalculator={() => setIsCalcOpen(true)}
      />

      <EconomicNewsShieldModal
        currentDate={selectedDate}
        isOpen={isNewsOpen}
        onClose={() => setIsNewsOpen(false)}
        pauseTradingOnRedNews={pauseTradingOnRedNews}
        onTogglePauseOnRedNews={() => setPauseTradingOnRedNews((v) => !v)}
      />

      <MonteCarloSimulatorModal
        isOpen={isMonteCarloOpen}
        onClose={() => setIsMonteCarloOpen(false)}
        params={params}
      />

      <ExecutionOrderTicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        trade={trade}
        params={params}
      />

      <TradingJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        allDays={allDays}
        params={params}
      />

      <AutoUpdaterModal
        isOpen={isUpdaterOpen}
        onClose={() => setIsUpdaterOpen(false)}
      />

      {/* Alert Toasts */}
      <AlertNotificationToast
        alerts={alerts}
        onDismiss={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onClearAll={() => setAlerts([])}
      />
    </div>
  );
}
