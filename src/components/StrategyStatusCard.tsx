import React, { useState, useMemo } from 'react';
import { AsianRange, DayData, StopLossType, StrategyParameters, TradeSignal, DailyRiskTracker } from '../types/trading.ts';
import { evaluateStrategyDay, evaluateNYOrbDay } from '../utils/quantEngine.ts';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Clock,
  Play,
  Pause,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Award,
  Zap,
  Sliders,
  RotateCcw,
  Send,
  Calendar,
  BarChart3,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
  Sparkles,
} from 'lucide-react';

interface StrategyStatusCardProps {
  selectedDay: DayData;
  asianRange: AsianRange | null;
  nyOrbRange?: any;
  trade: TradeSignal | null;
  trades?: TradeSignal[];
  params: StrategyParameters;
  onUpdateParams: (newParams: Partial<StrategyParameters>) => void;
  isLiveTickerActive: boolean;
  onToggleLiveTicker: () => void;
  onTriggerBreakoutSimulation: () => void;
  allDays: DayData[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  dailyTracker?: DailyRiskTracker;
  onOpenRiskModal?: () => void;
  onResetDailyTracker?: () => void;
  onStartReplaySimulation?: () => void;
  isReplayActive?: boolean;
  replayStep?: number;
  onOpenOrderTicket?: () => void;
  onOpenJournalModal?: () => void;
  activeStrategy?: 'LONDON_BREAKOUT' | 'NY_ORB';
}

export const StrategyStatusCard: React.FC<StrategyStatusCardProps> = ({
  selectedDay,
  asianRange,
  nyOrbRange,
  trade,
  trades = [],
  params,
  onUpdateParams,
  isLiveTickerActive,
  onToggleLiveTicker,
  onTriggerBreakoutSimulation,
  allDays,
  selectedDate,
  onSelectDate,
  dailyTracker,
  onOpenRiskModal,
  onResetDailyTracker,
  onStartReplaySimulation,
  isReplayActive = false,
  replayStep = 0,
  onOpenOrderTicket,
  onOpenJournalModal,
  activeStrategy = 'LONDON_BREAKOUT',
}) => {
  const isBullishD1 = selectedDay.prevDayTrend === 'BULLISH';
  const effectiveRisk = params.autoRiskPerTrade
    ? parseFloat(((params.dailyRiskLimitPercent ?? 1.0) / (params.maxSlPerDay ?? 2)).toFixed(2))
    : (params.riskPercent ?? 0.5);

  const isLockedBySl = dailyTracker?.status === 'LOCKED_BY_SL';
  const isLockedByTp = dailyTracker?.status === 'LOCKED_BY_TP';
  const isDayLocked = isLockedBySl || isLockedByTp;

  // Month & Period Filtering
  const [selectedMonth, setSelectedMonth] = useState<'ALL' | 'SEP' | 'AUG' | 'JUL' | 'RECENT'>('ALL');
  const [isSimulatingBacktest, setIsSimulatingBacktest] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Filter days based on selectedMonth
  const filteredDays = useMemo(() => {
    if (selectedMonth === 'ALL') return allDays;
    if (selectedMonth === 'SEP') return allDays.filter((d) => d.date.startsWith('2026-09'));
    if (selectedMonth === 'AUG') return allDays.filter((d) => d.date.startsWith('2026-08'));
    if (selectedMonth === 'JUL') return allDays.filter((d) => d.date.startsWith('2026-07'));
    if (selectedMonth === 'RECENT') return allDays.slice(-14);
    return allDays;
  }, [allDays, selectedMonth]);

  // Pre-calculate evaluation for each day for instant badges & statistics (supports multiple trades per day)
  const dayEvaluations = useMemo(() => {
    const map = new Map<
      string,
      {
        status: 'WIN' | 'LOSS' | 'BE' | 'MIXED' | 'NO_TRADE' | 'ACTIVE';
        trades: TradeSignal[];
        pnlUSD: number;
        pnlR: number;
        wins: number;
        losses: number;
        breakevens: number;
      }
    >();

    allDays.forEach((d) => {
      const { trades: evaluatedTrades } = activeStrategy === 'NY_ORB'
        ? evaluateNYOrbDay(d.candles, d.prevDayTrend, params)
        : evaluateStrategyDay(d.candles, d.prevDayTrend, params);
      if (!evaluatedTrades || evaluatedTrades.length === 0) {
        map.set(d.date, {
          status: 'NO_TRADE',
          trades: [],
          pnlUSD: 0,
          pnlR: 0,
          wins: 0,
          losses: 0,
          breakevens: 0,
        });
        return;
      }

      let pnlUSD = 0;
      let pnlR = 0;
      let wins = 0;
      let losses = 0;
      let breakevens = 0;

      evaluatedTrades.forEach((t) => {
        if (t.status === 'HIT_TP') {
          wins++;
          pnlUSD += t.pnlUSD || 100;
          pnlR += params.rrRatio;
        } else if (t.status === 'HIT_SL') {
          losses++;
          pnlUSD += t.pnlUSD || -50;
          pnlR -= 1;
        } else if (t.status === 'BREAKEVEN' || t.isBreakevenTriggered) {
          breakevens++;
        }
      });

      let status: 'WIN' | 'LOSS' | 'BE' | 'MIXED' | 'ACTIVE' = 'ACTIVE';
      if (wins > 0 && losses === 0) status = 'WIN';
      else if (losses > 0 && wins === 0) status = 'LOSS';
      else if (breakevens > 0 && wins === 0 && losses === 0) status = 'BE';
      else if (wins > 0 && losses > 0) status = 'MIXED';

      map.set(d.date, {
        status,
        trades: evaluatedTrades,
        pnlUSD: parseFloat(pnlUSD.toFixed(2)),
        pnlR: parseFloat(pnlR.toFixed(1)),
        wins,
        losses,
        breakevens,
      });
    });
    return map;
  }, [allDays, params, activeStrategy]);

  // Aggregate metrics for filteredDays (aggregates all individual trades)
  const backtestMetrics = useMemo(() => {
    let totalTrades = 0;
    let daysWithTrade = 0;
    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let totalPnLUSD = 0;
    let totalR = 0;
    let peakEquity = 0;
    let currentEquity = 0;
    let maxDrawdownUSD = 0;
    let grossWinsUSD = 0;
    let grossLossesUSD = 0;

    filteredDays.forEach((d) => {
      const ev = dayEvaluations.get(d.date);
      if (!ev) return;
      if (ev.trades.length > 0) daysWithTrade++;
      totalTrades += ev.trades.length;
      wins += ev.wins;
      losses += ev.losses;
      breakevens += ev.breakevens;
      totalPnLUSD += ev.pnlUSD;
      totalR += ev.pnlR;

      ev.trades.forEach((t) => {
        if (t.status === 'HIT_TP') {
          grossWinsUSD += t.pnlUSD || 100;
        } else if (t.status === 'HIT_SL') {
          grossLossesUSD += Math.abs(t.pnlUSD || 50);
        }
      });

      currentEquity += ev.pnlUSD;
      if (currentEquity > peakEquity) peakEquity = currentEquity;
      const dd = peakEquity - currentEquity;
      if (dd > maxDrawdownUSD) maxDrawdownUSD = dd;
    });

    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';
    const profitFactor =
      grossLossesUSD > 0
        ? (grossWinsUSD / grossLossesUSD).toFixed(2)
        : grossWinsUSD > 0
        ? '99.9'
        : '0.0';
    const maxDrawdownPct =
      params.accountBalance > 0 ? ((maxDrawdownUSD / params.accountBalance) * 100).toFixed(1) : '0';
    const totalReturnPct =
      params.accountBalance > 0 ? ((totalPnLUSD / params.accountBalance) * 100).toFixed(1) : '0';

    return {
      totalDays: filteredDays.length,
      daysWithTrade,
      totalTrades,
      wins,
      losses,
      breakevens,
      winRate,
      profitFactor,
      totalPnLUSD: parseFloat(totalPnLUSD.toFixed(2)),
      totalR: parseFloat(totalR.toFixed(1)),
      maxDrawdownUSD: parseFloat(maxDrawdownUSD.toFixed(2)),
      maxDrawdownPct,
      totalReturnPct,
    };
  }, [filteredDays, dayEvaluations, params]);

  // Automated batch backtesting runner simulation
  const handleRunFullBacktest = () => {
    if (isSimulatingBacktest) return;
    setIsSimulatingBacktest(true);
    setSimulationProgress(0);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < filteredDays.length) {
        onSelectDate(filteredDays[idx].date);
        setSimulationProgress(Math.round(((idx + 1) / filteredDays.length) * 100));
        idx++;
      } else {
        clearInterval(interval);
        setIsSimulatingBacktest(false);
        // Land on today
        onSelectDate(allDays[allDays.length - 1].date);
      }
    }, 40);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Historical Days Selector Tabs & Multi-Month Backtesting Engine */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3.5 shadow-sm">
        {/* Header with Title, Month Filters and Live Day Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Motor de Backtesting Multi-Mes & Auditoría Cuantitativa
            </span>
            <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
              {allDays.length} Sesiones Reales ({activeStrategy === 'LONDON_BREAKOUT' ? 'Londres' : 'NY ORB'})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Month Filter Tabs */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setSelectedMonth('ALL')}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all ${
                  selectedMonth === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({allDays.length})
              </button>
              <button
                onClick={() => setSelectedMonth('SEP')}
                className={`px-2 py-1 text-[11px] font-mono rounded-md transition-all ${
                  selectedMonth === 'SEP'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sep 2026 ({allDays.filter((d) => d.date.startsWith('2026-09')).length})
              </button>
              <button
                onClick={() => setSelectedMonth('AUG')}
                className={`px-2 py-1 text-[11px] font-mono rounded-md transition-all ${
                  selectedMonth === 'AUG'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ago 2026 ({allDays.filter((d) => d.date.startsWith('2026-08')).length})
              </button>
              <button
                onClick={() => setSelectedMonth('JUL')}
                className={`px-2 py-1 text-[11px] font-mono rounded-md transition-all ${
                  selectedMonth === 'JUL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Jul 2026 ({allDays.filter((d) => d.date.startsWith('2026-07')).length})
              </button>
              <button
                onClick={() => setSelectedMonth('RECENT')}
                className={`px-2 py-1 text-[11px] font-mono rounded-md transition-all ${
                  selectedMonth === 'RECENT'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Últimos 14D
              </button>
            </div>

            {/* Run Full Backtest Simulation Button */}
            <button
              onClick={handleRunFullBacktest}
              disabled={isSimulatingBacktest}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all ${
                isSimulatingBacktest
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              <Play className="w-3 h-3" />
              {isSimulatingBacktest ? `Simulando ${simulationProgress}%` : 'Ejecutar Backtest'}
            </button>

            {/* Dynamic Jump to Today Button */}
            {(() => {
              const latestDate = allDays[allDays.length - 1]?.date;
              const latestDateObj = new Date((latestDate || '2026-09-28') + 'T12:00:00Z');
              const formattedToday = latestDateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

              return (
                <button
                  type="button"
                  onClick={() => onSelectDate(latestDate)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-all ${
                    selectedDate === latestDate
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  }`}
                  title="Ir directamente a la sesión en vivo de hoy"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Hoy {formattedToday} (En Vivo)</span>
                </button>
              );
            })()}

            {/* Open Quantitative Journal & Official PDF Dossier */}
            {onOpenJournalModal && (
              <button
                onClick={onOpenJournalModal}
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 rounded-lg transition-all font-bold shadow-sm"
                title="Ver Diario Completo de Operaciones y Descargar Dossier Oficial en PDF"
              >
                <FileText className="w-3 h-3 text-amber-400" />
                Dossier PDF
              </button>
            )}
          </div>
        </div>

        {/* Panel Interactivo de Calibración de Parámetros del Tester */}
        <div className="mb-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Calibración de Parámetros del Tester ({activeStrategy === 'LONDON_BREAKOUT' ? 'Londres V1' : 'NY ORB'})
              </span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Recálculo Dinámico en Tiempo Real
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdateParams({
                  rrRatio: 2.0,
                  enableBreakEven: true,
                  beTriggerRatio: 1.0,
                  slMethod: '50_PERCENT',
                  riskPercent: 1.0,
                  minAsiaRange: 6.0,
                  maxAsiaRange: 32.0,
                  minOrbRange: 3.0,
                  maxOrbRange: 15.0,
                  trendMode: 'ANY_BREAKOUT',
                });
              }}
              className="text-[10px] font-mono text-slate-400 hover:text-amber-300 transition flex items-center gap-1"
              title="Restablecer configuración oficial 1:2"
            >
              <RotateCcw className="w-3 h-3" /> Restablecer V1 Oficial (1:2)
            </button>
          </div>

          {/* Quick interactive controls grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
            {/* Control 1: Ratio R:R (Target de Beneficio) */}
            <div className="bg-[#0E131F] border border-slate-800/80 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold">1. Ratio R:R (Take Profit)</span>
                <span className="text-amber-400 font-bold">1:{params.rrRatio}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[1.5, 2.0, 2.5, 3.0].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => onUpdateParams({ rrRatio: ratio })}
                    className={`py-1 text-[11px] rounded transition font-bold ${
                      params.rrRatio === ratio
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    1:{ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Protección Breakeven en 1:1 */}
            <div className="bg-[#0E131F] border border-slate-800/80 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold">2. Breakeven 1:1</span>
                <span className={`text-[10px] font-bold ${params.enableBreakEven ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {params.enableBreakEven ? 'Activado (Protege)' : 'Desactivado (Full TP)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateParams({ enableBreakEven: true })}
                  className={`py-1 text-[10px] rounded transition font-bold ${
                    params.enableBreakEven
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                  title="Mueve el SL a entrada al alcanzar 1:1 de beneficio"
                >
                  🛡️ BE Activo (1:1)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateParams({ enableBreakEven: false })}
                  className={`py-1 text-[10px] rounded transition font-bold ${
                    !params.enableBreakEven
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                  title="No hace Breakeven. La operación busca exclusivamente el 1:2 o el SL."
                >
                  ⚡ Sin Breakeven
                </button>
              </div>
            </div>

            {/* Control 3: Método Stop Loss */}
            <div className="bg-[#0E131F] border border-slate-800/80 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold">3. Método Stop Loss</span>
                <span className="text-slate-200 font-bold">
                  {params.slMethod === '50_PERCENT' ? '50% Mid' : params.slMethod === 'OPPOSITE_RANGE' ? 'Extremo' : 'EMA 20'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['50_PERCENT', 'OPPOSITE_RANGE', 'EMA_20'] as StopLossType[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onUpdateParams({ slMethod: method })}
                    className={`py-1 text-[10px] rounded transition font-bold ${
                      params.slMethod === method
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {method === '50_PERCENT' ? '50% Mid' : method === 'OPPOSITE_RANGE' ? 'Extremo' : 'EMA20'}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 4: Riesgo por Operación */}
            <div className="bg-[#0E131F] border border-slate-800/80 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold">4. Riesgo por Trade</span>
                <span className="text-rose-400 font-bold">{params.riskPercent}%</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0.5, 1.0, 2.0].map((risk) => (
                  <button
                    key={risk}
                    type="button"
                    onClick={() => onUpdateParams({ riskPercent: risk })}
                    className={`py-1 text-[11px] rounded transition font-bold ${
                      params.riskPercent === risk
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {risk}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Backtesting Aggregate Performance Ribbon for Filtered Period */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-3 bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Sesiones / Operadas</span>
            <span className="text-xs font-bold font-mono text-white">
              {backtestMetrics.totalDays} días <span className="text-amber-400 font-normal">({backtestMetrics.totalTrades} trades)</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Win Rate (Efectividad)</span>
            <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" /> {backtestMetrics.winRate}% ({backtestMetrics.wins}W / {backtestMetrics.losses}L)
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Beneficio Neto</span>
            <span className={`text-xs font-bold font-mono ${backtestMetrics.totalPnLUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {backtestMetrics.totalPnLUSD >= 0 ? `+${backtestMetrics.totalPnLUSD}` : backtestMetrics.totalPnLUSD} USD
              <span className="text-[10px] ml-1 text-slate-400">(+{backtestMetrics.totalR}R)</span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Profit Factor</span>
            <span className="text-xs font-bold font-mono text-amber-300">
              {backtestMetrics.profitFactor}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Protegidos Breakeven</span>
            <span className="text-xs font-bold font-mono text-slate-300">
              {backtestMetrics.breakevens} trades (1:1)
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Máx Drawdown</span>
            <span className="text-xs font-bold font-mono text-rose-400">
              -{backtestMetrics.maxDrawdownPct}%
            </span>
          </div>
        </div>

        {/* Scrollable / Grid Session Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {filteredDays.map((d) => {
            const isSelected = d.date === selectedDate;
            const isToday = d.date === allDays[allDays.length - 1].date;
            const dObj = new Date(d.date + 'T12:00:00Z');
            const dayFormatted = isToday
              ? `Hoy ${dObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
              : dObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

            const ev = dayEvaluations.get(d.date);

            return (
              <button
                key={d.date}
                onClick={() => onSelectDate(d.date)}
                className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-sm ring-1 ring-amber-500/40'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold font-sans capitalize truncate">{dayFormatted}</span>
                  {isToday ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" title="Sesión activa de hoy" />
                  ) : ev?.status === 'WIN' ? (
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1 py-0.2 rounded shrink-0">
                      +{params.rrRatio}R
                    </span>
                  ) : ev?.status === 'LOSS' ? (
                    <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-500/15 px-1 py-0.2 rounded shrink-0">
                      -1R
                    </span>
                  ) : ev?.status === 'BE' ? (
                    <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-800 px-1 py-0.2 rounded border border-slate-700 shrink-0">
                      BE
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                  {d.prevDayTrend === 'BULLISH' ? (
                    <span className="text-emerald-400 flex items-center">
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> D1 Alc
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center">
                      <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> D1 Baj
                    </span>
                  )}
                  {isToday && (
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                      En Vivo
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner de Estrategia Activa y Parámetros */}
      <div className="bg-[#0B101D] border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Estrategia Activa:
          </span>
          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-md border ${
            activeStrategy === 'LONDON_BREAKOUT'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-200 border-slate-700'
          }`}>
            {activeStrategy === 'LONDON_BREAKOUT'
              ? '👑 Estrategia 1: London Breakout (Gold Killer V1 Oficial)'
              : '🗽 Estrategia 2: NY Session ORB (Opening Range Breakout Oficial)'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-300 flex-wrap">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>R:R <strong>1:{params.rrRatio}</strong></span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Breakeven <strong>1:1</strong></span>
          </span>
          <span>•</span>
          <span>Riesgo: <strong className="text-rose-400">{params.riskPercent}%</strong></span>
          <span>•</span>
          <span>Circuit Breaker: <strong className="text-amber-400">2 SLs / Día</strong></span>
        </div>
      </div>

      {/* 5 Reglas Mecánicas Cuantitativas */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/70 pb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">
              {activeStrategy === 'LONDON_BREAKOUT'
                ? 'Reglas Mecánicas: London Breakout (Gold Killer V1 Oficial)'
                : 'Reglas Mecánicas: New York Opening Range Breakout (ORB Oficial)'}
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            100% Cuantitativa • Sin Emociones
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Regla 1: Rango de Referencia */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-blue-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {activeStrategy === 'LONDON_BREAKOUT' ? '1. Rango Asiático (Tokio)' : '1. Rango ORB (Wall Street)'}
              </span>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                {activeStrategy === 'LONDON_BREAKOUT' ? '00:00 - 07:00 UTC' : '13:30 - 13:45 UTC'}
              </span>
            </div>
            {activeStrategy === 'LONDON_BREAKOUT' ? (
              asianRange ? (
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Asian High:</span>
                    <span className="font-bold text-blue-300">${asianRange.high.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Asian Low:</span>
                    <span className="font-bold text-blue-300">${asianRange.low.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Amplitud Tokio:</span>
                    <span className="font-bold text-amber-300">${asianRange.rangePoints.toFixed(2)} USD</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Calculando cotizaciones asiáticas...</p>
              )
            ) : (
              nyOrbRange ? (
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">ORB High:</span>
                    <span className="font-bold text-cyan-300">${nyOrbRange.high.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">ORB Low:</span>
                    <span className="font-bold text-cyan-300">${nyOrbRange.low.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Amplitud Vela M15:</span>
                    <span className="font-bold text-amber-300">${nyOrbRange.rangePoints.toFixed(2)} USD</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-xs font-mono">
                  <p className="text-xs text-slate-400">Vela M15 de 13:30 UTC en cálculo...</p>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                    <span>Filtro de Apertura:</span>
                    <span className="text-amber-300 font-bold">$3.0 - $15.0 USD</span>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Regla 2: Filtro de Dirección / Filtro de Rango */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-purple-400 flex items-center gap-1.5">
                {isBullishD1 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {activeStrategy === 'LONDON_BREAKOUT' ? '2. Modo de Ruptura' : '2. Filtro Anti-Sobreextensión'}
              </span>
              <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">
                {activeStrategy === 'LONDON_BREAKOUT' ? 'Filtro Cuanti' : 'Calibrado Oro'}
              </span>
            </div>
            {activeStrategy === 'LONDON_BREAKOUT' ? (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Sesgo D1:</span>
                  <span className={isBullishD1 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {params.trendMode === 'D1_STRICT'
                      ? isBullishD1 ? 'Solo Longs (D1 Alcista)' : 'Solo Shorts (D1 Bajista)'
                      : 'Ambas Direcciones (M15 Confirmada)'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Vela D1 Anterior:</span>
                  <span className="text-white">${selectedDay.prevDayOpen.toFixed(1)} → ${selectedDay.prevDayClose.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Rango Tokio Válido:</span>
                  <span className="text-cyan-300 font-semibold">$6.0 a $32.0 USD</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Rango Mínimo:</span>
                  <span className="text-white font-bold">$3.00 USD (Evita mercado muerto)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Rango Máximo:</span>
                  <span className="text-amber-300 font-bold">$15.00 USD (Evita sobreextensión)</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Estado Filtro:</span>
                  <span className="text-emerald-400 font-bold">✓ Válido para Operar</span>
                </div>
              </div>
            )}
          </div>

          {/* Regla 3: Gatillo M15 y Ventana Operativa */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> 3. Gatillo & Horarios
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {activeStrategy === 'LONDON_BREAKOUT' ? '08:00 - 11:00 UTC' : '13:45 - 16:30 UTC'}
              </span>
            </div>
            
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Gatillo Técnico:</span>
                <span className="text-emerald-400 font-bold">Cierre Vela M15</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Confirmación:</span>
                <span className="text-white font-semibold">Cuerpo sólido fuera de caja</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Límite Trades:</span>
                <span className="text-amber-300 font-bold">Máx. 2 Operaciones / Sesión</span>
              </div>
            </div>
          </div>

          {/* Regla 4: Stop Loss Matemático & R:R 1:2 */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> 4. Stop Loss al 50%
              </span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                R:R 1:2 Oficial
              </span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Nivel Stop Loss:</span>
                <span className="text-cyan-300 font-bold">
                  {activeStrategy === 'LONDON_BREAKOUT' ? '50% Punto Medio Tokio' : '50% Punto Medio ORB'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-0.5">
                <span className="text-slate-400">Take Profit:</span>
                <span className="text-emerald-400 font-bold">El doble del riesgo (1:2)</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Expectativa Matemática:</span>
                <span className="text-amber-300 font-bold">Rentable desde 35% WR</span>
              </div>
            </div>
          </div>

          {/* Regla 5: Gestión de Riesgo (Límite 1% Diario & Coherencia SL) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-rose-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> 5. Gestión de Riesgo (Coherente)
              </span>
              <button
                type="button"
                onClick={onOpenRiskModal}
                className="text-[10px] font-mono bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded px-1.5 py-0.5 cursor-pointer font-bold flex items-center gap-1 transition"
                title="Abrir Gestor de Riesgo y Parámetros"
              >
                <Sliders className="w-2.5 h-2.5" /> Configurar
              </button>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Riesgo por SL:</span>
                <span className="text-amber-300 font-bold">
                  {effectiveRisk}% (${((params.accountBalance * effectiveRisk) / 100).toFixed(2)} USD)
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Riesgo Diario Máx:</span>
                <span className="text-rose-400 font-bold">
                  {params.dailyRiskLimitPercent ?? 1.0}% (${((params.accountBalance * (params.dailyRiskLimitPercent ?? 1.0)) / 100).toFixed(2)} USD)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Protección Breakeven:</span>
                <button
                  type="button"
                  onClick={() => onUpdateParams({ enableBreakEven: !params.enableBreakEven })}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                    params.enableBreakEven
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                  title="Haz clic para alternar: Activar o Desactivar Breakeven (1:2 Puro)"
                >
                  {params.enableBreakEven ? '🛡️ BE 1:1 Activo' : '💎 Sin BE (1:2 Puro)'}
                </button>
              </div>
            </div>
          </div>

          {/* Regla 6: Control Diario Estricto (2 SL / 2 TP Kill Switch) */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> 6. Límites 2 SL / 2 TP
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Kill Switch
              </span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Límites fijados:</span>
                <span className="text-white font-bold">
                  <span className="text-rose-400">{params.maxSlPerDay ?? 2} SL</span> o{' '}
                  <span className="text-emerald-400">{params.maxTpPerDay ?? 2} TP</span>
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Contador Hoy:</span>
                <span className="font-bold">
                  <span className="text-rose-400">{dailyTracker?.slCountToday ?? 0}/{params.maxSlPerDay ?? 2} SL</span> •{' '}
                  <span className="text-emerald-400">{dailyTracker?.tpCountToday ?? 0}/{params.maxTpPerDay ?? 2} TP</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Estado:</span>
                <span
                  className={`text-[11px] font-bold ${
                    isLockedBySl
                      ? 'text-rose-400'
                      : isLockedByTp
                      ? 'text-emerald-400'
                      : 'text-emerald-300'
                  }`}
                >
                  {isLockedBySl
                    ? '🛑 Bloqueado (2 SL)'
                    : isLockedByTp
                    ? '🏆 Meta Cumplida'
                    : '🟢 Habilitado'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KILL SWITCH ALERT BANNER (If daily limit reached) */}
        {isDayLocked && (
          <div
            className={`mt-3 p-3 rounded-lg border flex items-center justify-between gap-3 text-xs font-mono animate-fadeIn ${
              isLockedBySl
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                : 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isLockedBySl ? (
                <Lock className="w-4 h-4 text-rose-400 flex-shrink-0" />
              ) : (
                <Award className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
              <span>
                {isLockedBySl
                  ? `🛑 LÍMITE DE STOP LOSS ALCANZADO (${dailyTracker?.slCountToday}/${params.maxSlPerDay ?? 2} SL). Disciplina institucional: NO SE PERMITEN MÁS OPERACIONES HOY.`
                  : `🏆 META DE TAKE PROFIT ALCANZADA (${dailyTracker?.tpCountToday}/${params.maxTpPerDay ?? 2} TP). Ganancia asegurada: SESIÓN CERRADA SIN SOBREOPERAR.`}
              </span>
            </div>
            {onResetDailyTracker && (
              <button
                type="button"
                onClick={onResetDailyTracker}
                className="px-2 py-1 rounded bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-slate-300 text-[10px] flex items-center gap-1 whitespace-nowrap transition"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reiniciar
              </button>
            )}
          </div>
        )}

        {/* Live Interactive Action Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Replay Simulation Button */}
            {onStartReplaySimulation && (
              <button
                id="btn-replay-simulation"
                type="button"
                onClick={onStartReplaySimulation}
                disabled={isReplayActive}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                  isReplayActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isReplayActive ? `Replay en Curso (Paso ${replayStep}/5)...` : '▶ Simular Sesión Londres (Paso a Paso)'}</span>
              </button>
            )}

            <button
              id="btn-toggle-ticker"
              onClick={onToggleLiveTicker}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
                isLiveTickerActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isLiveTickerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLiveTickerActive ? 'Pausar Ticker en Vivo' : 'Activar Ticker en Vivo'}</span>
            </button>

            <button
              id="btn-simulate-breakout"
              onClick={onTriggerBreakoutSimulation}
              disabled={isDayLocked}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                isDayLocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>{isDayLocked ? 'Operativa Bloqueada (Límite Diario)' : 'Disparar Ruptura de Prueba & Alerta'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>Regla: 2 SL / 2 TP</span>
            <span>•</span>
            <span className="text-slate-300 font-bold">BE en 1:1</span>
          </div>
        </div>

        {/* REPLAY PROGRESS BAR (Visible when Replay active) */}
        {isReplayActive && (
          <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Simulación Cuantitativa Paso a Paso: Sesión Londres XAU/USD
              </span>
              <span className="text-amber-400 font-bold">Paso {replayStep} de 5</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-[10px] font-mono">
              <div className={`p-1.5 rounded text-center border ${replayStep >= 1 ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                1. 07:00 Rango Asia
              </div>
              <div className={`p-1.5 rounded text-center border ${replayStep >= 2 ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                2. 08:00 Apertura Londres
              </div>
              <div className={`p-1.5 rounded text-center border ${replayStep >= 3 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                3. 08:15 Ruptura M15
              </div>
              <div className={`p-1.5 rounded text-center border ${replayStep >= 4 ? 'bg-slate-800 border-slate-700 text-slate-200 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                4. 09:30 1:1 Breakeven
              </div>
              <div className={`p-1.5 rounded text-center border ${replayStep >= 5 ? 'bg-emerald-500/30 border-emerald-500/60 text-emerald-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                5. 10:45 Take Profit (1:2)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AUDITORÍA DE CONFIRMACIONES CUANTITATIVAS */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/70 pb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Auditoría de Confirmaciones Cuantitativas ({selectedDay.date})
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {trade ? '✓ Operación Validada' : 'Filtro de Disciplina Activo'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
          {/* Conf 1: Filtro D1 */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase mb-1">
              <span>1. Filtro Tendencial D1</span>
              <span className="text-emerald-400 font-bold">✓ CUMPLIDO</span>
            </div>
            <div className="font-bold text-white flex items-center gap-1 text-xs">
              {isBullishD1 ? (
                <span className="text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> D1 Alcista (Solo BUY)
                </span>
              ) : (
                <span className="text-rose-400 flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" /> D1 Bajista (Solo SELL)
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {isBullishD1 ? 'Prohibido vender contra la tendencia macro' : 'Prohibido comprar contra la tendencia macro'}
            </div>
          </div>

          {/* Conf 2: Rango Asiático */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase mb-1">
              <span>2. Rango Asiático (00-07 UTC)</span>
              <span className="text-emerald-400 font-bold">✓ DELIMITADO</span>
            </div>
            <div className="font-bold text-white text-xs">
              ${asianRange?.low.toFixed(2)} - ${asianRange?.high.toFixed(2)}
            </div>
            <div className="text-[10px] text-amber-300 mt-1">
              Amplitud: {asianRange?.rangePoints.toFixed(2)} pts | 50%: ${asianRange?.midpoint.toFixed(2)}
            </div>
            {asianRange && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[9px]">
                <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                  asianRange.rangePoints < 6.0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : asianRange.rangePoints > 22.0
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {asianRange.rangePoints < 6.0
                    ? 'Comprimido (<6 pts)'
                    : asianRange.rangePoints > 22.0
                    ? 'Expandido (>22 pts)'
                    : 'Volatilidad Óptima'}
                </span>
                <span className="text-slate-400">
                  {asianRange.rangePoints < 6.0
                    ? 'Precaución falso rompimiento'
                    : asianRange.rangePoints > 22.0
                    ? 'Agotamiento ADR'
                    : 'Alta probabilidad'}
                </span>
              </div>
            )}
          </div>

          {/* Conf 3: Ruptura con Cuerpo M15 */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase mb-1">
              <span>3. Cierre M15 en Londres</span>
              <span className={trade ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {trade ? '✓ CONFIRMADO' : '○ EN RANGO'}
              </span>
            </div>
            <div className="font-bold text-white text-xs">
              {trade ? (
                <span className="text-emerald-400">
                  Ruptura a las {trade.time} UTC (${trade.entryPrice.toFixed(2)})
                </span>
              ) : (
                <span className="text-slate-400">Sin cierre con cuerpo fuera de Asia</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {trade ? 'Vela cerró fuera con cuerpo (Anti-Wick)' : 'Ventana 08:00 - 11:00 UTC'}
            </div>
          </div>

          {/* Conf 4: Gestión 1:1 Breakeven & R:R */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase mb-1">
              <span>4. Breakeven 1:1 & R:R</span>
              <span className="text-cyan-400 font-bold">
                {trade?.isBreakevenTriggered ? '🛡️ BE ACTIVADO' : '✓ 1:2 R:R'}
              </span>
            </div>
            <div className="font-bold text-white text-xs">
              Riesgo: {effectiveRisk}% (${((params.accountBalance * effectiveRisk) / 100).toFixed(2)} USD)
            </div>
            <div className="text-[10px] text-cyan-300 mt-1">
              {trade?.isBreakevenTriggered ? `SL movido a $${trade.entryPrice.toFixed(2)}` : 'Protección automática de capital'}
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE TRADE CARDS (Renders all executed trades for the day) */}
      {(() => {
        const activeTradesList = trades && trades.length > 0 ? trades : trade ? [trade] : [];
        if (activeTradesList.length === 0) {
          return (
            /* FILTRO DE DISCIPLINA (Cuando el día no presenta ruptura válida) */
            <div className="border border-slate-800 bg-slate-900/50 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white font-sans">
                      Filtro de Disciplina Activo: Preservación de Capital
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Sin Operación (0% Pérdida)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    En esta sesión ({selectedDay.date}), el precio osciló dentro del rango asiático (${asianRange?.low.toFixed(2)} - ${asianRange?.high.toFixed(2)}) y <strong>no generó ningún cierre con CUERPO de vela M15</strong> fuera del rango durante la ventana de Londres (08:00 - 11:00 UTC).
                  </p>
                  <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-emerald-400">
                    <span>✓ Regla Anti-Overtrading: Protege de días laterales</span>
                    <span>•</span>
                    <span>✓ Cero Comisiones Innecesarias</span>
                    <span>•</span>
                    <span>✓ Capital Intacto: 100%</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            {activeTradesList.map((t, tIdx) => {
              const sessionLabel = t.session === 'NEW_YORK' ? 'Nueva York' : 'Londres';
              const triggerName = t.triggerType === 'M15_RETEST' ? 'Retesteo M15' : 'Ruptura Inicial';
              const tradeLabel = `Op. #${tIdx + 1}: ${triggerName} (${sessionLabel})`;

              return (
                <div
                  key={t.id || `trade-${t.time}-${tIdx}`}
                  id={`active-trade-card-${tIdx}`}
                  className={`border rounded-xl p-4 shadow-md transition-all ${
                    t.status === 'HIT_TP'
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : t.status === 'HIT_SL'
                      ? 'bg-rose-950/30 border-rose-500/40'
                      : t.status === 'BREAKEVEN' || t.isBreakevenTriggered
                      ? 'bg-slate-900/80 border-slate-700'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                        {tradeLabel}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 ${
                          t.type === 'LONG'
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-rose-500 text-white shadow-sm'
                        }`}
                      >
                        {t.type === 'LONG' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {t.type === 'LONG' ? 'COMPRA (BUY BREAKOUT)' : 'VENTA (SELL BREAKOUT)'}
                      </span>

                      <span className="text-xs font-mono text-slate-300">
                        Ejecutado a las <strong className="text-white">{t.time} UTC</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenOrderTicket && (
                        <button
                          type="button"
                          onClick={onOpenOrderTicket}
                          className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
                          title="Abrir Ticket de Orden Formateado para MT4/MT5/cTrader"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Ticket MT4/MT5</span>
                        </button>
                      )}

                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded border uppercase ${
                          t.status === 'HIT_TP'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : t.status === 'HIT_SL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : t.status === 'BREAKEVEN'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : t.isBreakevenTriggered
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        }`}
                      >
                        {t.status === 'HIT_TP'
                          ? `✓ TAKE PROFIT ALCANZADO (+${params.rrRatio}.0R)`
                          : t.status === 'HIT_SL'
                          ? '✗ STOP LOSS EJECUTADO (-1.0R)'
                          : t.status === 'BREAKEVEN'
                          ? '🛡️ CERRADO EN BREAKEVEN ($0 PÉRDIDA)'
                          : t.isBreakevenTriggered
                          ? '🛡️ BREAKEVEN ACTIVADO (SL EN ENTRADA)'
                          : '● POSICIÓN ACTIVA EN MERCADO'}
                      </span>
                    </div>
                  </div>

                  {t.isBreakevenTriggered && (
                    <div className="mb-3 p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span>
                        <strong>Protección 1:1 Ejecutada:</strong> El precio alcanzó el ratio 1:1 y el Stop Loss fue movido al punto de entrada (${t.entryPrice.toFixed(2)}). Riesgo de pérdida reducido al 0%.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase block">Precio Entrada</span>
                      <span className="text-white font-bold text-sm">${t.entryPrice.toFixed(2)}</span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase block">
                        {t.isBreakevenTriggered ? 'Stop en Breakeven' : 'Stop Loss (SL)'}
                      </span>
                      <span
                        className={`font-bold text-sm ${
                          t.isBreakevenTriggered ? 'text-cyan-400' : 'text-rose-400'
                        }`}
                      >
                        ${t.slPrice.toFixed(2)}
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase block">Take Profit (1:{params.rrRatio})</span>
                      <span className="text-emerald-400 font-bold text-sm">${t.tpPrice.toFixed(2)}</span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase block">Lotes XAUUSD</span>
                      <span className="text-amber-300 font-bold text-sm">{t.lotSize} Lotes</span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase block">Riesgo Inicial</span>
                      <span className="text-rose-400 font-bold text-sm">-${t.riskAmountUSD.toFixed(2)} USD</span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400 text-[10px] uppercase block">Resultado PnL</span>
                      <span
                        className={`font-bold text-sm ${
                          (t.pnlUSD || 0) > 0
                            ? 'text-emerald-400'
                            : (t.pnlUSD || 0) === 0
                            ? 'text-cyan-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {t.pnlUSD !== undefined
                          ? `${t.pnlUSD >= 0 ? '+' : ''}$${t.pnlUSD.toFixed(2)} USD`
                          : 'En curso...'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};
