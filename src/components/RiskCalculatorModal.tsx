import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  ShieldCheck,
  DollarSign,
  ArrowRight,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Zap,
  TrendingUp,
  Award,
} from 'lucide-react';
import { calculatePositionSize } from '../utils/quantEngine.ts';
import { DailyRiskTracker, StrategyParameters } from '../types/trading.ts';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBalance: number;
  defaultEntry: number;
  defaultSl: number;
  params: StrategyParameters;
  onUpdateParams: (newParams: Partial<StrategyParameters>) => void;
  dailyTracker: DailyRiskTracker;
  onUpdateDailyTracker: (newTracker: Partial<DailyRiskTracker>) => void;
}

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultBalance,
  defaultEntry,
  defaultSl,
  params,
  onUpdateParams,
  dailyTracker,
  onUpdateDailyTracker,
}) => {
  // Local states for inputs (synced with params)
  const [balance, setBalance] = useState<number>(defaultBalance || params.accountBalance || 10000);
  const [dailyRiskLimit, setDailyRiskLimit] = useState<number>(params.dailyRiskLimitPercent ?? 1.0);
  const [maxSl, setMaxSl] = useState<number>(params.maxSlPerDay ?? 2);
  const [maxTp, setMaxTp] = useState<number>(params.maxTpPerDay ?? 2);
  const [autoCoherence, setAutoCoherence] = useState<boolean>(params.autoRiskPerTrade ?? true);
  const [manualRiskPerTrade, setManualRiskPerTrade] = useState<number>(params.riskPercent ?? 0.5);

  const [entryPrice, setEntryPrice] = useState<number>(defaultEntry || 2660.0);
  const [slPrice, setSlPrice] = useState<number>(defaultSl || 2652.0);
  const [rrRatio, setRrRatio] = useState<number>(params.rrRatio || 2.0);

  // Breakeven states
  const [enableBE, setEnableBE] = useState<boolean>(params.enableBreakEven ?? true);
  const [beRatio, setBeRatio] = useState<number>(params.beTriggerRatio ?? 1.0);
  const [beOffsetPips, setBeOffsetPips] = useState<number>(params.beOffsetPips ?? 0.0);

  // Sync when modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      setBalance(params.accountBalance || defaultBalance || 10000);
      setDailyRiskLimit(params.dailyRiskLimitPercent ?? 1.0);
      setMaxSl(params.maxSlPerDay ?? 2);
      setMaxTp(params.maxTpPerDay ?? 2);
      setAutoCoherence(params.autoRiskPerTrade ?? true);
      setManualRiskPerTrade(params.riskPercent ?? 0.5);
      setEntryPrice(defaultEntry || 2660.0);
      setSlPrice(defaultSl || 2652.0);
      setRrRatio(params.rrRatio || 2.0);
      setEnableBE(params.enableBreakEven ?? true);
      setBeRatio(params.beTriggerRatio ?? 1.0);
      setBeOffsetPips(params.beOffsetPips ?? 0.0);
    }
  }, [isOpen, defaultBalance, defaultEntry, defaultSl, params]);

  if (!isOpen) return null;

  // Calculate effective risk percent per trade
  const effectiveRiskPercent = autoCoherence
    ? maxSl > 0
      ? parseFloat((dailyRiskLimit / maxSl).toFixed(2))
      : 0.5
    : manualRiskPerTrade;

  const sizing = calculatePositionSize(balance, effectiveRiskPercent, entryPrice, slPrice);
  const targetProfitUSD = sizing.riskAmountUSD * rrRatio;
  const isLong = entryPrice >= slPrice;

  const pointsAtRisk = sizing.pointsAtRisk;
  const targetPrice = isLong
    ? entryPrice + pointsAtRisk * rrRatio
    : entryPrice - pointsAtRisk * rrRatio;

  // Breakeven 1:1 prices
  const beTriggerPrice = isLong
    ? entryPrice + pointsAtRisk * beRatio
    : entryPrice - pointsAtRisk * beRatio;

  const beLevelPrice = isLong
    ? entryPrice + beOffsetPips * 0.1
    : entryPrice - beOffsetPips * 0.1;

  // Daily Totals
  const maxDailyLossUSD = (balance * dailyRiskLimit) / 100;
  const singleSlLossUSD = (balance * effectiveRiskPercent) / 100;
  const potentialDailyGainUSD = singleSlLossUSD * rrRatio * maxTp;

  // Handle Save & Apply
  const handleSaveAndApply = () => {
    onUpdateParams({
      accountBalance: balance,
      dailyRiskLimitPercent: dailyRiskLimit,
      maxSlPerDay: maxSl,
      maxTpPerDay: maxTp,
      autoRiskPerTrade: autoCoherence,
      riskPercent: effectiveRiskPercent,
      rrRatio: rrRatio,
      enableBreakEven: enableBE,
      beTriggerRatio: beRatio,
      beOffsetPips: beOffsetPips,
    });

    onUpdateDailyTracker({
      maxSlPerDay: maxSl,
      maxTpPerDay: maxTp,
      dailyRiskLimitPercent: dailyRiskLimit,
    });

    onClose();
  };

  // Quick Tracker Increment / Reset
  const handleIncrementSl = () => {
    const nextCount = dailyTracker.slCountToday + 1;
    let newStatus: 'ACTIVE' | 'LOCKED_BY_SL' | 'LOCKED_BY_TP' = 'ACTIVE';
    let msg = 'Operativa activa';

    if (nextCount >= maxSl) {
      newStatus = 'LOCKED_BY_SL';
      msg = `🛑 LÍMITE ALCANZADO: ${nextCount}/${maxSl} SL. No operar más hoy. Capital protegido.`;
    }

    onUpdateDailyTracker({
      slCountToday: nextCount,
      status: newStatus,
      statusMessage: msg,
    });
  };

  const handleIncrementTp = () => {
    const nextCount = dailyTracker.tpCountToday + 1;
    let newStatus: 'ACTIVE' | 'LOCKED_BY_SL' | 'LOCKED_BY_TP' = 'ACTIVE';
    let msg = 'Operativa activa';

    if (nextCount >= maxTp) {
      newStatus = 'LOCKED_BY_TP';
      msg = `🏆 META ALCANZADA: ${nextCount}/${maxTp} TP. Ganancia asegurada. No operar más hoy.`;
    }

    onUpdateDailyTracker({
      tpCountToday: nextCount,
      status: newStatus,
      statusMessage: msg,
    });
  };

  const handleResetTracker = () => {
    onUpdateDailyTracker({
      slCountToday: 0,
      tpCountToday: 0,
      status: 'ACTIVE',
      statusMessage: 'Jornada reiniciada: 0 SL / 0 TP registrados',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Gestión de Riesgo & Disciplina Operativa
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Límites 2 SL / 2 TP
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Regla institucional: Máx 1% diario • Kill switch diario • Breakeven en 1:1
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

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto font-sans text-slate-200">
          {/* SECCIÓN 1: LÍMITES DIARIOS & REGLA DEL KILL SWITCH */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> 1. Parámetros de Disciplina Diaria (Kill Switch)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                "Cualquiera de los 2 que se cumpla primero, no opera más"
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Max SL per Day */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-rose-950/40">
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-bold flex items-center justify-between">
                  <span>Límite Stop Loss (SL)</span>
                  <span className="text-rose-400 font-mono text-[11px]">Máx permitido</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={maxSl}
                    onChange={(e) => setMaxSl(parseInt(e.target.value) || 2)}
                    className="w-full bg-slate-900 border border-slate-700 text-rose-300 font-mono font-bold rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-rose-500"
                  >
                    <option value={1}>1 SL / Día (Ultra Conservador)</option>
                    <option value={2}>2 SL / Día (Regla Estándar)</option>
                    <option value={3}>3 SL / Día</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Si se tocan {maxSl} SL, se apaga la operativa del día.
                </p>
              </div>

              {/* Max TP per Day */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-emerald-950/40">
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-bold flex items-center justify-between">
                  <span>Límite Take Profit (TP)</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Meta del día</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={maxTp}
                    onChange={(e) => setMaxTp(parseInt(e.target.value) || 2)}
                    className="w-full bg-slate-900 border border-slate-700 text-emerald-300 font-mono font-bold rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 TP / Día (Meta 1 trade)</option>
                    <option value={2}>2 TP / Día (Regla Estándar)</option>
                    <option value={3}>3 TP / Día</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Al alcanzar {maxTp} TP, se consolida la ganancia sin overtrading.
                </p>
              </div>

              {/* Daily Risk Limit % */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-amber-950/40">
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-bold flex items-center justify-between">
                  <span>Riesgo Diario Máximo</span>
                  <span className="text-amber-400 font-mono text-[11px]">% del Capital</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="5.0"
                    value={dailyRiskLimit}
                    onChange={(e) => setDailyRiskLimit(parseFloat(e.target.value) || 1.0)}
                    className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-2.5 top-2 text-xs font-mono text-slate-400">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Pérdida máxima: ${( (balance * dailyRiskLimit) / 100 ).toFixed(2)} USD
                </p>
              </div>
            </div>

            {/* Coherence Switch */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 bg-slate-950/40 p-3 rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoCoherence"
                    checked={autoCoherence}
                    onChange={(e) => setAutoCoherence(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="autoCoherence" className="text-xs font-mono font-semibold text-white cursor-pointer">
                    Sincronizar Coherencia de Riesgo Automática (Recomendado)
                  </label>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Riesgo por SL = Riesgo Diario ({dailyRiskLimit}%) ÷ Límite SL ({maxSl}) = <strong className="text-amber-300">{effectiveRiskPercent}%</strong>
                </span>
              </div>

              {!autoCoherence && (
                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between gap-3 animate-fadeIn">
                  <span className="text-xs font-mono text-slate-400">
                    Definir Riesgo por Operación Manualmente:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="3.0"
                      value={manualRiskPerTrade}
                      onChange={(e) => setManualRiskPerTrade(parseFloat(e.target.value) || 0.5)}
                      className="w-24 bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-lg px-2 py-1 text-xs text-right"
                    />
                    <span className="text-xs font-mono text-slate-400">% por SL</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: GESTIÓN DE BREAKEVEN EN 1:1 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> 2. Protección Dinámica Breakeven (1:1)
              </span>
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono text-slate-300 cursor-pointer">
                  {enableBE ? 'Activado (Mover a Entrada)' : 'Desactivado'}
                </label>
                <button
                  type="button"
                  onClick={() => setEnableBE(!enableBE)}
                  className={`w-9 h-5 flex items-center rounded-full p-1 transition duration-300 ${
                    enableBE ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition duration-300 ${
                      enableBE ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {enableBE ? (
              <div className="space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">
                      Ratio Objetivo para Mover a Breakeven
                    </label>
                    <select
                      value={beRatio}
                      onChange={(e) => setBeRatio(parseFloat(e.target.value) || 1.0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    >
                      <option value={1.0}>1:1 Ratio (Exactamente la distancia de riesgo)</option>
                      <option value={1.2}>1:1.2 Ratio</option>
                      <option value={1.5}>1:1.5 Ratio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">
                      Buffer / Offset de Entrada (Pips para Comisiones)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={beOffsetPips}
                        onChange={(e) => setBeOffsetPips(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs font-mono text-slate-500">pips</span>
                    </div>
                  </div>
                </div>

                {/* Breakeven Roadmap */}
                <div className="bg-slate-950/70 border border-cyan-950/40 p-3 rounded-lg text-xs font-mono space-y-2">
                  <div className="text-[11px] text-cyan-300/90 font-semibold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Mecánica de Protección para la Posición Actual:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Entrada</span>
                      <span className="text-white font-bold">${entryPrice.toFixed(2)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Stop Inicial</span>
                      <span className="text-rose-400 font-bold">${slPrice.toFixed(2)}</span>
                    </div>
                    <div className="p-2 rounded bg-cyan-950/30 border border-cyan-500/30">
                      <span className="text-cyan-300 block text-[10px]">Disparador 1:1</span>
                      <span className="text-cyan-300 font-bold">${beTriggerPrice.toFixed(2)}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Nuevo SL (BE)</span>
                      <span className="text-emerald-300 font-bold">${beLevelPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                    Cuando el oro alcance los <strong>${beTriggerPrice.toFixed(2)}</strong> (+1:1), la orden Stop Loss se desplaza automáticamente a <strong>${beLevelPrice.toFixed(2)}</strong>, garantizando que el trade sea 100% libre de riesgo sin pérdida de capital.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400">
                Gestión de Breakeven desactivada. Las órdenes mantendrán su Stop Loss original hasta tocar TP o SL.
              </p>
            )}
          </div>

          {/* SECCIÓN 3: MONITOR DE JORNADA EN VIVO (CONTADORES 2 SL / 2 TP) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> 3. Registro y Estado de la Jornada de Hoy
              </span>
              <button
                type="button"
                onClick={handleResetTracker}
                className="text-[11px] font-mono text-slate-400 hover:text-white flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" /> Reiniciar Contadores
              </button>
            </div>

            {/* Status Alert Banner */}
            <div
              className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                dailyTracker.status === 'LOCKED_BY_SL'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  : dailyTracker.status === 'LOCKED_BY_TP'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300'
              }`}
            >
              {dailyTracker.status === 'LOCKED_BY_SL' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              ) : dailyTracker.status === 'LOCKED_BY_TP' ? (
                <Award className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                <div className="font-bold">
                  {dailyTracker.status === 'LOCKED_BY_SL'
                    ? 'BLOQUEO OPERATIVO: LÍMITE DE STOP LOSS ALCANZADO'
                    : dailyTracker.status === 'LOCKED_BY_TP'
                    ? 'SESIÓN CONCLUIDA: META DE TAKE PROFIT ALCANZADA'
                    : 'ESTADO DE OPERATORIA: DISPONIBLE'}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {dailyTracker.statusMessage ||
                    `Tienes margen disponible para operar respetando el límite de ${maxSl} SL o ${maxTp} TP.`}
                </div>
              </div>
            </div>

            {/* Counter Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* SL Tracker Box */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 block">
                    Stop Loss Hoy:
                  </span>
                  <div className="text-base font-mono font-bold text-rose-400">
                    {dailyTracker.slCountToday} / {maxSl} SL
                    <span className="text-xs text-slate-400 font-normal ml-2">
                      (-${(dailyTracker.slCountToday * singleSlLossUSD).toFixed(2)} USD)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDailyTracker({
                        slCountToday: Math.max(0, dailyTracker.slCountToday - 1),
                        status:
                          dailyTracker.slCountToday - 1 >= maxSl
                            ? 'LOCKED_BY_SL'
                            : 'ACTIVE',
                      })
                    }
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold flex items-center justify-center text-xs"
                    title="Restar 1 SL"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={handleIncrementSl}
                    className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono font-bold text-xs"
                    title="Registrar 1 SL alcanzado"
                  >
                    + 1 SL
                  </button>
                </div>
              </div>

              {/* TP Tracker Box */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 block">
                    Take Profits Hoy:
                  </span>
                  <div className="text-base font-mono font-bold text-emerald-400">
                    {dailyTracker.tpCountToday} / {maxTp} TP
                    <span className="text-xs text-slate-400 font-normal ml-2">
                      (+${(dailyTracker.tpCountToday * singleSlLossUSD * rrRatio).toFixed(2)} USD)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDailyTracker({
                        tpCountToday: Math.max(0, dailyTracker.tpCountToday - 1),
                        status:
                          dailyTracker.tpCountToday - 1 >= maxTp
                            ? 'LOCKED_BY_TP'
                            : 'ACTIVE',
                      })
                    }
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold flex items-center justify-center text-xs"
                    title="Restar 1 TP"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={handleIncrementTp}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-xs"
                    title="Registrar 1 TP alcanzado"
                  >
                    + 1 TP
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: CALCULADORA DE LOTES XAU/USD */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
              4. Dimensionamiento de Posición en XAU/USD
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Balance de Cuenta ($)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-slate-500 text-xs font-mono">$</span>
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Precio Entrada ($)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Precio Stop Loss ($)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={slPrice}
                  onChange={(e) => setSlPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 font-mono focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Position output */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Lotes XAU/USD:</span>
                <span className="text-amber-300 font-bold text-sm">{sizing.lotSize} Lotes</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Riesgo por Operación:</span>
                <span className="text-rose-400 font-bold text-sm">
                  -${sizing.riskAmountUSD.toFixed(2)} ({effectiveRiskPercent}%)
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Take Profit (1:{rrRatio}):</span>
                <span className="text-emerald-400 font-bold text-sm">
                  +${targetProfitUSD.toFixed(2)} (${targetPrice.toFixed(2)})
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Distancia SL:</span>
                <span className="text-slate-300 font-bold text-sm">
                  {pointsAtRisk.toFixed(2)} pts ({sizing.pipsAtRisk} pips)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            Límites parametrizados: <strong className="text-rose-400">{maxSl} SL</strong> •{' '}
            <strong className="text-emerald-400">{maxTp} TP</strong> •{' '}
            <strong className="text-cyan-400">{enableBE ? 'Breakeven 1:1 ON' : 'BE OFF'}</strong>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition shadow-lg shadow-amber-500/20"
            >
              Guardar Parámetros y Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

