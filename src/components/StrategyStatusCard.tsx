import React from 'react';
import { AsianRange, DayData, StopLossType, StrategyParameters, TradeSignal, DailyRiskTracker } from '../types/trading.ts';
import {
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
} from 'lucide-react';

interface StrategyStatusCardProps {
  selectedDay: DayData;
  asianRange: AsianRange | null;
  trade: TradeSignal | null;
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
}

export const StrategyStatusCard: React.FC<StrategyStatusCardProps> = ({
  selectedDay,
  asianRange,
  trade,
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
}) => {
  const isBullishD1 = selectedDay.prevDayTrend === 'BULLISH';
  const effectiveRisk = params.autoRiskPerTrade
    ? parseFloat(((params.dailyRiskLimitPercent ?? 1.0) / (params.maxSlPerDay ?? 2)).toFixed(2))
    : (params.riskPercent ?? 0.5);

  const isLockedBySl = dailyTracker?.status === 'LOCKED_BY_SL';
  const isLockedByTp = dailyTracker?.status === 'LOCKED_BY_TP';
  const isDayLocked = isLockedBySl || isLockedByTp;


  return (
    <div className="flex flex-col gap-4">
      {/* Historical Days Selector Tabs */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Sesiones Históricas & Backtesting
          </span>
          <span className="text-[11px] text-slate-400">Selecciona un día para auditar</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-1.5">
          {allDays.map((d, index) => {
            const isSelected = d.date === selectedDate;
            const isToday = index === allDays.length - 1;
            const dObj = new Date(d.date + 'T12:00:00Z');
            const dayFormatted = isToday
              ? `Hoy ${dObj.getUTCDate()} (En Vivo)`
              : dObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

            return (
              <button
                key={d.date}
                onClick={() => onSelectDate(d.date)}
                className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-sm ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold font-sans capitalize">{dayFormatted}</span>
                  {isToday && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] font-mono">
                  {d.prevDayTrend === 'BULLISH' ? (
                    <span className="text-emerald-400 flex items-center">
                      <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> D1 Alcista
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center">
                      <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> D1 Bajista
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 Reglas Mecánicas Cuantitativas */}
      <div className="bg-[#0E131F] border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/70 pb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">
              Reglas Mecánicas XAU/USD (London Breakout)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            100% Cuantitativa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Regla 1: Rango Asiático */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-blue-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 1. Rango Asiático
              </span>
              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                00:00 - 07:00 UTC
              </span>
            </div>
            {asianRange ? (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">High:</span>
                  <span className="font-bold text-blue-300">${asianRange.high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Low:</span>
                  <span className="font-bold text-blue-300">${asianRange.low.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Amplitud:</span>
                  <span className="font-bold text-amber-300">${asianRange.rangePoints.toFixed(2)} USD</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Calculando cotizaciones asiáticas...</p>
            )}
          </div>

          {/* Regla 2: Filtro Quanti D1 */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-purple-400 flex items-center gap-1.5">
                {isBullishD1 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                2. Filtro Tendencia D1
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  isBullishD1
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {isBullishD1 ? 'SOLO COMPRAS (LONG)' : 'SOLO VENTAS (SHORT)'}
              </span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Cierre D1 Anterior:</span>
                <span className="font-bold text-white">${selectedDay.prevDayClose.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Apertura D1 Anterior:</span>
                <span className="text-slate-400">${selectedDay.prevDayOpen.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Sesgo Estadístico:</span>
                <span className={isBullishD1 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {isBullishD1 ? 'Continuación Alcista' : 'Continuación Bajista'}
                </span>
              </div>
            </div>
          </div>

          {/* Regla 3: Gatillo M15 Londres */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> 3. Gatillo Londres
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/20">
                08:00 - 11:00 UTC
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Espera el cierre con <strong className="text-white font-semibold">CUERPO</strong> en M15 por fuera del rango a favor del filtro D1.
            </p>
            <div className="mt-2 text-xs font-mono flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Nivel de disparo:</span>
              <span className="text-amber-300 font-bold">
                {isBullishD1 ? `> $${asianRange?.high.toFixed(2)}` : `< $${asianRange?.low.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Regla 4: Stop Loss Matemático */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> 4. Stop Loss (SL)
              </span>
              <select
                value={params.slMethod}
                onChange={(e) => onUpdateParams({ slMethod: e.target.value as StopLossType })}
                className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-amber-300 rounded px-1.5 py-0.5"
              >
                <option value="50_PERCENT">50% Rango Asiático</option>
                <option value="OPPOSITE_RANGE">Lado Opuesto Rango</option>
                <option value="EMA_20">EMA 20 Periodos</option>
              </select>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Modo SL:</span>
                <span className="text-slate-200">
                  {params.slMethod === '50_PERCENT'
                    ? '50% del Rango (Matemático)'
                    : params.slMethod === 'OPPOSITE_RANGE'
                    ? 'Lado Opuesto'
                    : 'Media Móvil EMA 20'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Ratio R:R:</span>
                <select
                  value={params.rrRatio}
                  onChange={(e) => onUpdateParams({ rrRatio: parseFloat(e.target.value) })}
                  className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-emerald-400 rounded px-1.5 py-0.5 cursor-pointer"
                >
                  <option value={1.5}>1:1.5 R:R</option>
                  <option value={2.0}>1:2.0 R:R (Objetivo)</option>
                  <option value={2.5}>1:2.5 R:R</option>
                  <option value={3.0}>1:3.0 R:R (Swing)</option>
                </select>
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
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Protección Breakeven:</span>
                <span className={params.enableBreakEven ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                  {params.enableBreakEven ? 'Activo en 1:1' : 'Desactivado'}
                </span>
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
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
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
            <span className="text-cyan-400">BE en 1:1</span>
          </div>
        </div>

        {/* REPLAY PROGRESS BAR (Visible when Replay active) */}
        {isReplayActive && (
          <div className="mt-3 p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Simulación Cuantitativa Paso a Paso: Sesión Londres XAU/USD
              </span>
              <span className="text-amber-400 font-bold">Paso {replayStep} de 5</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-[10px] font-mono">
              <div className={`p-1.5 rounded text-center border ${replayStep >= 1 ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                1. 07:00 Rango Asia
              </div>
              <div className={`p-1.5 rounded text-center border ${replayStep >= 2 ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                2. 08:00 Apertura Londres
              </div>
              <div className={`p-1.5 rounded text-center border ${replayStep >= 3 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
                3. 08:15 Ruptura M15
              </div>
              <div className={`p-1.5 rounded text-center border ${replayStep >= 4 ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-500'}`}>
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

      {/* ACTIVE TRADE CARD (If Trade exists for this day) */}
      {trade ? (
        <div
          id="active-trade-card"
          className={`border rounded-xl p-4 shadow-md transition-all ${
            trade.status === 'HIT_TP'
              ? 'bg-emerald-950/30 border-emerald-500/40'
              : trade.status === 'HIT_SL'
              ? 'bg-rose-950/30 border-rose-500/40'
              : trade.status === 'BREAKEVEN' || trade.isBreakevenTriggered
              ? 'bg-cyan-950/30 border-cyan-500/40'
              : 'bg-blue-950/30 border-blue-500/40'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 ${
                  trade.type === 'LONG'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-rose-500 text-white shadow-sm'
                }`}
              >
                {trade.type === 'LONG' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {trade.type === 'LONG' ? 'COMPRA (BUY BREAKOUT)' : 'VENTA (SELL BREAKOUT)'}
              </span>

              <span className="text-xs font-mono text-slate-300">
                Ejecutado a las <strong className="text-white">{trade.time} UTC</strong>
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
                  trade.status === 'HIT_TP'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : trade.status === 'HIT_SL'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : trade.status === 'BREAKEVEN'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : trade.isBreakevenTriggered
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                }`}
              >
                {trade.status === 'HIT_TP'
                  ? '✓ TAKE PROFIT ALCANZADO (+2.0R)'
                  : trade.status === 'HIT_SL'
                  ? '✗ STOP LOSS EJECUTADO (-1.0R)'
                  : trade.status === 'BREAKEVEN'
                  ? '🛡️ CERRADO EN BREAKEVEN ($0 PÉRDIDA)'
                  : trade.isBreakevenTriggered
                  ? '🛡️ BREAKEVEN ACTIVADO (SL EN ENTRADA)'
                  : '● POSICIÓN ACTIVA EN MERCADO'}
              </span>
            </div>
          </div>

          {trade.isBreakevenTriggered && (
            <div className="mb-3 p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>
                <strong>Protección 1:1 Ejecutada:</strong> El precio alcanzó el ratio 1:1 y el Stop Loss fue movido al punto de entrada (${trade.entryPrice.toFixed(2)}). Riesgo de pérdida reducido al 0%.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Precio Entrada</span>
              <span className="text-white font-bold text-sm">${trade.entryPrice.toFixed(2)}</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">
                {trade.isBreakevenTriggered ? 'Stop en Breakeven' : 'Stop Loss (SL)'}
              </span>
              <span
                className={`font-bold text-sm ${
                  trade.isBreakevenTriggered ? 'text-cyan-400' : 'text-rose-400'
                }`}
              >
                ${trade.slPrice.toFixed(2)}
              </span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Take Profit (1:2)</span>
              <span className="text-emerald-400 font-bold text-sm">${trade.tpPrice.toFixed(2)}</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Lotes XAUUSD</span>
              <span className="text-amber-300 font-bold text-sm">{trade.lotSize} Lotes</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Riesgo Inicial</span>
              <span className="text-rose-400 font-bold text-sm">-${trade.riskAmountUSD.toFixed(2)} USD</span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Resultado PnL</span>
              <span
                className={`font-bold text-sm ${
                  (trade.pnlUSD || 0) > 0
                    ? 'text-emerald-400'
                    : (trade.pnlUSD || 0) === 0
                    ? 'text-cyan-400'
                    : 'text-rose-400'
                }`}
              >
                {trade.pnlUSD !== undefined
                  ? `${trade.pnlUSD >= 0 ? '+' : ''}$${trade.pnlUSD.toFixed(2)} USD`
                  : 'En curso...'}
              </span>
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};
