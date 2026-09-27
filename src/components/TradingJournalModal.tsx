import React, { useState, useMemo } from 'react';
import { BookOpen, Download, TrendingUp, CheckCircle, XCircle, Shield, Award, Calendar } from 'lucide-react';
import { DayData, StrategyParameters } from '../types/trading.ts';
import { evaluateStrategyDay } from '../utils/quantEngine.ts';

interface TradingJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  allDays: DayData[];
  params: StrategyParameters;
}

export const TradingJournalModal: React.FC<TradingJournalModalProps> = ({
  isOpen,
  onClose,
  allDays,
  params,
}) => {
  const [journalMonth, setJournalMonth] = useState<'ALL' | 'SEP' | 'AUG' | 'JUL'>('ALL');

  if (!isOpen) return null;

  // Filtered days according to selected month
  const targetDays = journalMonth === 'ALL'
    ? allDays
    : journalMonth === 'SEP'
    ? allDays.filter((d) => d.date.startsWith('2026-09'))
    : journalMonth === 'AUG'
    ? allDays.filter((d) => d.date.startsWith('2026-08'))
    : allDays.filter((d) => d.date.startsWith('2026-07'));

  // Process days into structured journal entries (supports multiple trades per day)
  const journalEntries = targetDays.flatMap((day) => {
    const { asianRange, trades } = evaluateStrategyDay(day.candles, day.prevDayTrend, params);

    // Asian Range Volatility Evaluation
    const pts = asianRange?.rangePoints || 0;
    let volatilityStatus = 'Óptimo';
    if (pts < 6.0) volatilityStatus = 'Comprimido (<6 pts)';
    else if (pts > 22.0) volatilityStatus = 'Expandido (>22 pts)';

    if (trades.length === 0) {
      return [
        {
          date: day.date,
          tradeNum: '-',
          d1Trend: day.prevDayTrend,
          asianRangePoints: pts.toFixed(2),
          volatilityStatus,
          tradeType: '-',
          triggerTime: '-',
          entry: '-',
          sl: '-',
          tp: '-',
          lots: '-',
          outcomeText: 'SIN OPERACIÓN',
          outcomeClass: 'text-slate-400 bg-slate-800',
          pnlUSD: 0,
          pnlPct: 0,
          breakevenProtected: 'No',
        },
      ];
    }

    return trades.map((t, idx) => {
      let outcomeText = 'ACTIVO';
      let outcomeClass = 'text-blue-400 bg-blue-500/10 border border-blue-500/30';
      let pnlUSD = t.pnlUSD || 0;
      let pnlPct = (pnlUSD / params.accountBalance) * 100;

      if (t.status === 'HIT_TP') {
        outcomeText = `WIN (TP 1:${params.rrRatio})`;
        outcomeClass = 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30';
      } else if (t.status === 'HIT_SL') {
        outcomeText = 'LOSS (SL 1.0R)';
        outcomeClass = 'text-rose-400 bg-rose-500/10 border border-rose-500/30';
      } else if (t.status === 'BREAKEVEN' || t.isBreakevenTriggered) {
        outcomeText = 'BREAKEVEN ($0)';
        outcomeClass = 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30';
      }

      return {
        date: day.date,
        tradeNum: trades.length > 1 ? `#${idx + 1} (${idx === 0 ? 'Ruptura' : 'Retesteo'})` : '#1',
        d1Trend: day.prevDayTrend,
        asianRangePoints: pts.toFixed(2),
        volatilityStatus,
        tradeType: t.type,
        triggerTime: t.time,
        entry: t.entryPrice.toFixed(2),
        sl: t.slPrice.toFixed(2),
        tp: t.tpPrice.toFixed(2),
        lots: t.lotSize.toString(),
        outcomeText,
        outcomeClass,
        pnlUSD,
        pnlPct,
        breakevenProtected: t.isBreakevenTriggered ? 'Sí (1:1)' : 'No',
      };
    });
  });

  // Calculate totals
  const tradesWithSignal = journalEntries.filter((j) => j.tradeType !== '-');
  const wins = journalEntries.filter((j) => j.outcomeText.includes('WIN')).length;
  const losses = journalEntries.filter((j) => j.outcomeText.includes('LOSS')).length;
  const totalPnLUSD = journalEntries.reduce((acc, curr) => acc + curr.pnlUSD, 0);
  const totalPnLPct = (totalPnLUSD / params.accountBalance) * 100;
  const winRate = tradesWithSignal.length > 0 ? ((wins / tradesWithSignal.length) * 100).toFixed(1) : '0';

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Operacion',
      'Tendencia_D1',
      'Rango_Asia_Pts',
      'Estado_Volatilidad_Asia',
      'Direccion',
      'Hora_Gatillo_UTC',
      'Precio_Entrada',
      'Stop_Loss',
      'Take_Profit',
      'Lotes',
      'Proteccion_Breakeven',
      'Resultado',
      'PnL_USD',
      'PnL_Porcentaje',
    ];

    const rows = journalEntries.map((e) => [
      e.date,
      `"${e.tradeNum}"`,
      e.d1Trend,
      e.asianRangePoints,
      `"${e.volatilityStatus}"`,
      e.tradeType,
      e.triggerTime,
      e.entry,
      e.sl,
      e.tp,
      e.lots,
      e.breakevenProtected,
      `"${e.outcomeText}"`,
      e.pnlUSD.toFixed(2),
      `${e.pnlPct.toFixed(2)}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Diario_Trading_XAUUSD_LondonBreakout_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Diario Cuantitativo de Trading & Auditoría de Rendimiento
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Historial auditado de sesiones de Londres con métricas para cuentas de fondeo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase block">Sesiones Auditadas</span>
              <span className="text-white font-bold text-lg block mt-0.5">
                {journalEntries.length} Días
              </span>
              <span className="text-[10px] text-slate-400">{tradesWithSignal.length} con gatillo confirmado</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase block">Win Rate Real</span>
              <span className="text-emerald-400 font-bold text-lg block mt-0.5">
                {winRate}%
              </span>
              <span className="text-[10px] text-slate-400">{wins}W / {losses}L</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase block">Beneficio Neto Total</span>
              <span className={`font-bold text-lg block mt-0.5 ${totalPnLUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnLUSD >= 0 ? '+' : ''}${totalPnLUSD.toFixed(2)} USD
              </span>
              <span className="text-[10px] text-emerald-300/80">+{totalPnLPct.toFixed(2)}% de Capital</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
              <span className="text-slate-400 text-[10px] uppercase block">Protección Breakeven</span>
              <span className="text-cyan-400 font-bold text-lg block mt-0.5">
                100% Activa
              </span>
              <span className="text-[10px] text-cyan-300/80">Riesgo 0 en 1:1</span>
            </div>
          </div>

          {/* Action Row & Month Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <span className="text-[10px] font-mono text-slate-400 px-2 uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" /> Período:
              </span>
              <button
                onClick={() => setJournalMonth('ALL')}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                  journalMonth === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({allDays.length})
              </button>
              <button
                onClick={() => setJournalMonth('SEP')}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                  journalMonth === 'SEP'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sep 2026 ({allDays.filter((d) => d.date.startsWith('2026-09')).length})
              </button>
              <button
                onClick={() => setJournalMonth('AUG')}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                  journalMonth === 'AUG'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ago 2026 ({allDays.filter((d) => d.date.startsWith('2026-08')).length})
              </button>
              <button
                onClick={() => setJournalMonth('JUL')}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                  journalMonth === 'JUL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Jul 2026 ({allDays.filter((d) => d.date.startsWith('2026-07')).length})
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar ({journalEntries.length} Sesiones) a CSV</span>
            </button>
          </div>

          {/* Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Op. #</th>
                  <th className="py-2.5 px-3">Filtro D1</th>
                  <th className="py-2.5 px-3">Rango Asia</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Hora UTC</th>
                  <th className="py-2.5 px-3">Entrada</th>
                  <th className="py-2.5 px-3">SL</th>
                  <th className="py-2.5 px-3">TP</th>
                  <th className="py-2.5 px-3">Breakeven</th>
                  <th className="py-2.5 px-3">Resultado</th>
                  <th className="py-2.5 px-3 text-right">PnL (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {journalEntries.map((j, idx) => (
                  <tr key={`${j.date}-${j.tradeNum}-${idx}`} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">{j.date}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-amber-300 font-semibold">{j.tradeNum}</td>
                    <td className="py-2.5 px-3">
                      <span className={j.d1Trend === 'BULLISH' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {j.d1Trend === 'BULLISH' ? 'Alcista' : 'Bajista'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {j.asianRangePoints} pts
                      <span className="block text-[9px] text-slate-500">{j.volatilityStatus}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {j.tradeType === 'LONG' ? (
                        <span className="text-emerald-400 font-bold">BUY</span>
                      ) : j.tradeType === 'SHORT' ? (
                        <span className="text-rose-400 font-bold">SELL</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{j.triggerTime}</td>
                    <td className="py-2.5 px-3 text-white">{j.entry !== '-' ? `$${j.entry}` : '-'}</td>
                    <td className="py-2.5 px-3 text-rose-400">{j.sl !== '-' ? `$${j.sl}` : '-'}</td>
                    <td className="py-2.5 px-3 text-emerald-400">{j.tp !== '-' ? `$${j.tp}` : '-'}</td>
                    <td className="py-2.5 px-3">
                      {j.breakevenProtected.includes('Sí') ? (
                        <span className="text-cyan-400 text-[10px] font-bold">🛡️ Activo</span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${j.outcomeClass}`}>
                        {j.outcomeText}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                      {j.pnlUSD > 0 ? (
                        <span className="text-emerald-400">+${j.pnlUSD.toFixed(2)}</span>
                      ) : j.pnlUSD < 0 ? (
                        <span className="text-rose-400">-${Math.abs(j.pnlUSD).toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">$0.00</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs font-mono transition"
          >
            Cerrar Diario
          </button>
        </div>
      </div>
    </div>
  );
};
