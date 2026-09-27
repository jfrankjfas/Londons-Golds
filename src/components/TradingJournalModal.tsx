import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Download,
  TrendingUp,
  CheckCircle,
  XCircle,
  Shield,
  Award,
  Calendar,
  FileText,
  Printer,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Check,
  Search,
  Filter,
} from 'lucide-react';
import { DayData, StrategyParameters } from '../types/trading.ts';
import { evaluateStrategyDay } from '../utils/quantEngine.ts';
import { generateExecutiveDossierPdf, JournalPdfEntry } from '../utils/pdfDossierGenerator.ts';

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
  const [activeTab, setActiveTab] = useState<'JOURNAL' | 'DOSSIER'>('JOURNAL');
  const [journalMonth, setJournalMonth] = useState<'ALL' | 'SEP' | 'AUG' | 'JUL'>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WIN' | 'LOSS' | 'BE'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMethodologyHelp, setShowMethodologyHelp] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

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
  const allProcessedEntries: JournalPdfEntry[] = targetDays.flatMap((day) => {
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
          outcomeClass: 'text-slate-400 bg-slate-800/60 border border-slate-700/50',
          pnlUSD: 0,
          pnlPct: 0,
          breakevenProtected: 'No',
        },
      ];
    }

    return trades.map((t, idx) => {
      let outcomeText = 'ACTIVO';
      let outcomeClass = 'text-blue-400 bg-blue-500/10 border border-blue-500/30';
      const pnlUSD = t.pnlUSD || 0;
      const pnlPct = (pnlUSD / params.accountBalance) * 100;

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

  // Calculate totals and statistics from all processed entries for this period
  const tradesWithSignal = allProcessedEntries.filter((j) => j.tradeType !== '-');
  const wins = allProcessedEntries.filter((j) => j.outcomeText.includes('WIN')).length;
  const losses = allProcessedEntries.filter((j) => j.outcomeText.includes('LOSS')).length;
  const breakevens = allProcessedEntries.filter((j) => j.outcomeText.includes('BREAKEVEN')).length;
  const totalPnLUSD = allProcessedEntries.reduce((acc, curr) => acc + curr.pnlUSD, 0);
  const totalPnLPct = (totalPnLUSD / params.accountBalance) * 100;
  const winRate = tradesWithSignal.length > 0 ? ((wins / tradesWithSignal.length) * 100).toFixed(1) : '0';

  const periodLabel =
    journalMonth === 'ALL'
      ? 'Todos los Registros (Jul - Sep 2026)'
      : journalMonth === 'SEP'
      ? 'Septiembre 2026'
      : journalMonth === 'AUG'
      ? 'Agosto 2026'
      : 'Julio 2026';

  // Filter for display in table based on outcome and search query
  const displayedEntries = allProcessedEntries.filter((e) => {
    // Outcome filter
    if (filterOutcome === 'WIN' && !e.outcomeText.includes('WIN')) return false;
    if (filterOutcome === 'LOSS' && !e.outcomeText.includes('LOSS')) return false;
    if (filterOutcome === 'BE' && !e.outcomeText.includes('BREAKEVEN')) return false;

    // Search query
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const match =
        e.date.toLowerCase().includes(q) ||
        e.tradeType.toLowerCase().includes(q) ||
        e.tradeNum.toLowerCase().includes(q) ||
        e.outcomeText.toLowerCase().includes(q) ||
        e.d1Trend.toLowerCase().includes(q) ||
        e.triggerTime.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Trigger high-resolution Vector PDF generation with jsPDF & AutoTable
  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      generateExecutiveDossierPdf(allProcessedEntries, params, {
        totalSessions: targetDays.length,
        tradesCount: tradesWithSignal.length,
        wins,
        losses,
        breakevens,
        winRate,
        totalPnLUSD,
        totalPnLPct,
        periodLabel,
        engineerName: 'Ingeniero Francisco Alvarado',
      });
      setPdfSuccessMessage('¡Dossier PDF generado y descargado exitosamente!');
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Browser print to PDF function
  const handlePrintDossier = () => {
    window.print();
  };

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

    const rows = allProcessedEntries.map((e) => [
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
    link.setAttribute(
      'download',
      `Diario_Trading_XAUUSD_Ing_Francisco_Alvarado_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0A0E17] border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Top Header Bar with Author Presentation */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#0E1526] via-[#10192F] to-[#0E1526]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-sans flex items-center gap-2">
                  Diario Cuantitativo & Auditoría de Rendimiento
                </h3>
                <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  XAU/USD
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                Herramienta desarrollada por el <strong className="text-amber-400 font-semibold">Ingeniero Francisco Alvarado</strong> • Modelo Algorítmico M15
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs font-mono">
              <button
                onClick={() => setActiveTab('JOURNAL')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'JOURNAL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Diario Operativo</span>
              </button>
              <button
                onClick={() => setActiveTab('DOSSIER')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'DOSSIER'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Dossier de Presentación</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/80 transition"
              title="Cerrar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Action Bar: PDF, Print & CSV Buttons */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* High-resolution PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-mono text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
              title="Generar y descargar documento PDF institucional oficial"
            >
              <FileText className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar Dossier Oficial en PDF'}</span>
            </button>

            {/* Print / Save as PDF Button */}
            <button
              onClick={handlePrintDossier}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono text-xs font-bold flex items-center gap-1.5 transition"
              title="Imprimir o guardar como PDF mediante el navegador"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 font-mono text-xs font-medium flex items-center gap-1.5 transition"
              title="Descargar archivo CSV compatible con Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV (Excel)</span>
            </button>
          </div>

          {/* Toggle Methodology Info Drawer */}
          <button
            onClick={() => setShowMethodologyHelp((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg transition"
          >
            <Info className="w-3.5 h-3.5" />
            <span>¿Qué es esta tabla y cómo se lee?</span>
            {showMethodologyHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Success toast notification */}
        {pdfSuccessMessage && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/30 px-6 py-2 flex items-center gap-2 text-xs font-mono text-emerald-300 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{pdfSuccessMessage}</span>
          </div>
        )}

        {/* Collapsible Methodology & Technical Specifications */}
        {showMethodologyHelp && (
          <div className="bg-slate-900/90 border-b border-slate-800 p-5 text-xs text-slate-300 space-y-3 font-sans animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Presentación Técnica de la Herramienta — Ing. Francisco Alvarado</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Esta herramienta cuantitativa fue desarrollada por el <strong>Ing. Francisco Alvarado</strong> con el propósito de validar y auditar matemáticamente la ventaja estadística en el par <strong>XAU/USD (Oro)</strong>. A diferencia del análisis técnico discrecional, este modelo opera bajo reglas mecánicas estrictas, permitiendo a los operadores e inversionistas evaluar métricas auditables requeridas por <em>Prop Trading Firms</em> y mesas de capital institucional.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 font-mono text-[11px]">
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                <span className="text-amber-400 font-bold block mb-1">1. Rango Asiático (00:00 - 06:00 UTC)</span>
                <p className="text-slate-400">
                  Delimita el soporte y resistencia de consolidación de Tokio. Exige una amplitud entre 6 y 22 puntos para asegurar volatilidad adecuada antes de Londres.
                </p>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                <span className="text-emerald-400 font-bold block mb-1">2. Gatillo de Londres (08:00 - 13:00 UTC)</span>
                <p className="text-slate-400">
                  Identifica rupturas con confirmación direccional (#1 Ruptura) y oportunidades secundarias en retroceso (#2 Retesteo), respetando el filtro de tendencia D1.
                </p>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                <span className="text-cyan-400 font-bold block mb-1">3. Blindaje y Protección Breakeven</span>
                <p className="text-slate-400">
                  Riesgo monetario exacto del 1.0% por orden. Al alcanzar una relación 1:1, el Stop Loss se traslada al precio de entrada, eliminando cualquier riesgo de pérdida.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Guía Didáctica de las Columnas:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 font-mono">
                <div>• <strong className="text-slate-200">Fecha / Op. #:</strong> Día y orden del trade</div>
                <div>• <strong className="text-slate-200">Tendencia D1:</strong> Filtro macro diario</div>
                <div>• <strong className="text-slate-200">Rango Asia:</strong> Amplitud en pips</div>
                <div>• <strong className="text-slate-200">Hora UTC:</strong> Momento del disparo</div>
                <div>• <strong className="text-slate-200">Entrada / SL / TP:</strong> Niveles 1:2 R:R</div>
                <div>• <strong className="text-slate-200">Breakeven:</strong> Blindaje a 1:1</div>
                <div>• <strong className="text-slate-200">Resultado:</strong> WIN / LOSS / BE</div>
                <div>• <strong className="text-slate-200">PnL USD / %:</strong> Ganancia neta</div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm">
              <span className="text-slate-400 text-[10px] uppercase block tracking-wider">Sesiones Auditadas</span>
              <span className="text-white font-bold text-xl block mt-1">
                {targetDays.length} Días
              </span>
              <span className="text-[10px] text-slate-400">
                {tradesWithSignal.length} operaciones ejecutadas
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm">
              <span className="text-slate-400 text-[10px] uppercase block tracking-wider">Win Rate Real Auditado</span>
              <span className="text-emerald-400 font-bold text-xl block mt-1">
                {winRate}%
              </span>
              <span className="text-[10px] text-slate-400">
                {wins}W / {losses}L / {breakevens}BE
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm">
              <span className="text-slate-400 text-[10px] uppercase block tracking-wider">Beneficio Neto Acumulado</span>
              <span
                className={`font-bold text-xl block mt-1 ${
                  totalPnLUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalPnLUSD >= 0 ? '+' : ''}${totalPnLUSD.toFixed(2)} USD
              </span>
              <span className="text-[10px] text-emerald-300/80">
                +{totalPnLPct.toFixed(2)}% sobre balance inicial
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow-sm">
              <span className="text-slate-400 text-[10px] uppercase block tracking-wider">Protección de Capital</span>
              <span className="text-cyan-400 font-bold text-xl block mt-1">
                100% Breakeven
              </span>
              <span className="text-[10px] text-cyan-300/80">Riesgo cero tras alcanzar 1:1</span>
            </div>
          </div>

          {/* TAB 1: INTERACTIVE AUDIT JOURNAL TABLE */}
          {activeTab === 'JOURNAL' && (
            <div className="space-y-4">
              {/* Filter controls row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                {/* Month Selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400 px-2 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" /> Período:
                  </span>
                  <button
                    onClick={() => setJournalMonth('ALL')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                      journalMonth === 'ALL'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                  >
                    Todos ({allDays.length})
                  </button>
                  <button
                    onClick={() => setJournalMonth('SEP')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                      journalMonth === 'SEP'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                  >
                    Sep 2026 ({allDays.filter((d) => d.date.startsWith('2026-09')).length})
                  </button>
                  <button
                    onClick={() => setJournalMonth('AUG')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                      journalMonth === 'AUG'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                  >
                    Ago 2026 ({allDays.filter((d) => d.date.startsWith('2026-08')).length})
                  </button>
                  <button
                    onClick={() => setJournalMonth('JUL')}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                      journalMonth === 'JUL'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                    }`}
                  >
                    Jul 2026 ({allDays.filter((d) => d.date.startsWith('2026-07')).length})
                  </button>
                </div>

                {/* Outcome quick filter & Search bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
                    <button
                      onClick={() => setFilterOutcome('ALL')}
                      className={`px-2 py-0.5 rounded ${
                        filterOutcome === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setFilterOutcome('WIN')}
                      className={`px-2 py-0.5 rounded ${
                        filterOutcome === 'WIN' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Wins ({wins})
                    </button>
                    <button
                      onClick={() => setFilterOutcome('LOSS')}
                      className={`px-2 py-0.5 rounded ${
                        filterOutcome === 'LOSS' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      Losses ({losses})
                    </button>
                    <button
                      onClick={() => setFilterOutcome('BE')}
                      className={`px-2 py-0.5 rounded ${
                        filterOutcome === 'BE' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      BE ({breakevens})
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por fecha, tipo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70 overflow-x-auto shadow-inner">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800 tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Fecha</th>
                      <th className="py-3 px-3">Op. #</th>
                      <th className="py-3 px-3">Tendencia D1</th>
                      <th className="py-3 px-3">Rango Asia</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Hora UTC</th>
                      <th className="py-3 px-3">Entrada</th>
                      <th className="py-3 px-3">Stop Loss</th>
                      <th className="py-3 px-3">Take Profit</th>
                      <th className="py-3 px-3">Breakeven</th>
                      <th className="py-3 px-3">Resultado</th>
                      <th className="py-3 px-3 text-right">PnL (USD)</th>
                      <th className="py-3 px-3 text-right">Retorno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {displayedEntries.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-8 text-center text-slate-500 font-mono">
                          No se encontraron operaciones con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      displayedEntries.map((j, idx) => (
                        <tr
                          key={`${j.date}-${j.tradeNum}-${idx}`}
                          className="hover:bg-slate-900/60 transition group"
                        >
                          <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">{j.date}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-amber-300 font-semibold">{j.tradeNum}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                j.d1Trend === 'BULLISH'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {j.d1Trend === 'BULLISH' ? 'Alcista' : 'Bajista'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-slate-200">{j.asianRangePoints} pts</span>
                            <span className="block text-[9px] text-slate-500">{j.volatilityStatus}</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {j.tradeType === 'LONG' ? (
                              <span className="text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">
                                BUY
                              </span>
                            ) : j.tradeType === 'SHORT' ? (
                              <span className="text-rose-400 font-bold bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded text-[10px]">
                                SELL
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{j.triggerTime}</td>
                          <td className="py-2.5 px-3 text-white font-semibold whitespace-nowrap">
                            {j.entry !== '-' ? `$${j.entry}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-rose-400 whitespace-nowrap">
                            {j.sl !== '-' ? `$${j.sl}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 whitespace-nowrap">
                            {j.tp !== '-' ? `$${j.tp}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {j.breakevenProtected.includes('Sí') ? (
                              <span className="text-cyan-400 text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                                🛡️ 1:1
                              </span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${j.outcomeClass}`}>
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
                          <td className="py-2.5 px-3 text-right font-mono text-[11px] whitespace-nowrap">
                            {j.pnlPct > 0 ? (
                              <span className="text-emerald-400 font-bold">+{j.pnlPct.toFixed(2)}%</span>
                            ) : j.pnlPct < 0 ? (
                              <span className="text-rose-400 font-bold">{j.pnlPct.toFixed(2)}%</span>
                            ) : (
                              <span className="text-slate-500">0.00%</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Totals Footer Row */}
                  <tfoot className="bg-slate-900 text-slate-300 font-bold border-t border-slate-800">
                    <tr>
                      <td className="py-3 px-3 text-amber-400" colSpan={2}>
                        TOTALES ({displayedEntries.length} Registros)
                      </td>
                      <td colSpan={8} className="py-3 px-3 text-slate-400 text-[11px]">
                        Estrategia Validada • Gestión de Riesgo 1:2 R:R
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400">{wins}W</span> /{' '}
                        <span className="text-rose-400">{losses}L</span> ({winRate}%)
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono text-sm ${
                          totalPnLUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {totalPnLUSD >= 0 ? '+' : ''}${totalPnLUSD.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-emerald-400">
                        +{totalPnLPct.toFixed(2)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: OFFICIAL DOSSIER PRESENTATION VIEW (PRINTABLE & PRESENTATION READY) */}
          {activeTab === 'DOSSIER' && (
            <div id="printable-dossier" className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-200">
              {/* Dossier Header Certificate Banner */}
              <div className="border-b border-slate-800 pb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                      Documento Oficial de Auditoría
                    </span>
                    <span className="text-slate-400 text-xs font-mono">
                      Ref: AUD-XAU-{new Date().getFullYear()}-01
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                    SISTEMA CUANTITATIVO DE TRADING & GESTIÓN DE CAPITAL
                  </h2>
                  <p className="text-amber-400 font-mono text-sm font-semibold">
                    Estrategia Algorítmica London Breakout & Retest en Oro Spot (XAU/USD)
                  </p>
                </div>

                <div className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">Desarrollado Por</span>
                    <span className="text-sm font-bold text-white font-sans block">
                      Ingeniero Francisco Alvarado
                    </span>
                    <span className="text-[10px] font-mono text-amber-300/80">Sistemas & Trading Algorítmico</span>
                  </div>
                </div>
              </div>

              {/* Technical Dossier Parameters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Instrumento Operado</span>
                  <span className="text-white font-bold">Oro Spot (XAU/USD)</span>
                  <span className="text-[10px] text-slate-400 block">Velas M15 de Alta Precisión</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Capital Auditado</span>
                  <span className="text-white font-bold">${params.accountBalance.toLocaleString()} USD</span>
                  <span className="text-[10px] text-slate-400 block">Riesgo: {params.riskPercent}% por orden</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Gestión Asimétrica</span>
                  <span className="text-amber-400 font-bold">Ratio R:R 1:{params.rrRatio}</span>
                  <span className="text-[10px] text-cyan-400 block">Breakeven Activo en 1:1</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase">Período Auditado</span>
                  <span className="text-white font-bold">{periodLabel}</span>
                  <span className="text-[10px] text-emerald-400 block">{targetDays.length} Sesiones Auditadas</span>
                </div>
              </div>

              {/* Executive Methodology Explanation */}
              <div className="space-y-3 bg-slate-900/40 p-5 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Resumen Técnico del Modelo & Ventaja Cuantitativa</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  El sistema desarrollado por el <strong>Ing. Francisco Alvarado</strong> resuelve uno de los mayores desafíos del trading en metales preciosos: eliminar el ruido del mercado y evitar la sobreoperación mediante reglas matemáticas objetivas. El algoritmo divide cada día de negociación en fases secuenciales:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs pt-1">
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
                    <span className="text-amber-400 font-bold block mb-1">Fase 1: Acumulación Tokio</span>
                    <p className="text-slate-400 text-[11px]">
                      De 00:00 a 06:00 UTC calcula la volatilidad del Rango Asiático. Si el rango es menor a 6 puntos o mayor a 22 puntos, el sistema bloquea operaciones por falta de liquidez o riesgo de exceso de ruido.
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
                    <span className="text-emerald-400 font-bold block mb-1">Fase 2: Expansión Londres</span>
                    <p className="text-slate-400 text-[11px]">
                      De 08:00 a 13:00 UTC gatilla rupturas con cierre de vela confirmado fuera del rango. Admite una segunda operación de retesteo o continuación para maximizar el factor de ganancia.
                    </p>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg">
                    <span className="text-cyan-400 font-bold block mb-1">Fase 3: Protección Dinámica</span>
                    <p className="text-slate-400 text-[11px]">
                      Tan pronto como el precio avanza 1.0R a favor (1:1), el algoritmo traslada el Stop Loss al precio de entrada (Breakeven). Esto reduce drásticamente el drawdown y garantiza la preservación del capital.
                    </p>
                  </div>
                </div>
              </div>

              {/* Complete Audit Table inside Presentation Dossier */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white font-sans flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    Registro Detallado de Operaciones Ejecutadas ({allProcessedEntries.length} Entradas)
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    Filtro Activo: {periodLabel}
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/90 overflow-x-auto shadow">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Op. #</th>
                        <th className="py-2.5 px-3">D1 Macro</th>
                        <th className="py-2.5 px-3">Rango Asia</th>
                        <th className="py-2.5 px-3">Dirección</th>
                        <th className="py-2.5 px-3">Hora UTC</th>
                        <th className="py-2.5 px-3">Entrada</th>
                        <th className="py-2.5 px-3">Stop Loss</th>
                        <th className="py-2.5 px-3">Take Profit</th>
                        <th className="py-2.5 px-3">Breakeven</th>
                        <th className="py-2.5 px-3">Resultado</th>
                        <th className="py-2.5 px-3 text-right">PnL USD</th>
                        <th className="py-2.5 px-3 text-right">Retorno %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {allProcessedEntries.map((j, idx) => (
                        <tr key={`dossier-${j.date}-${j.tradeNum}-${idx}`} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 font-bold text-white whitespace-nowrap">{j.date}</td>
                          <td className="py-2 px-3 text-amber-300 whitespace-nowrap">{j.tradeNum}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold ${
                                j.d1Trend === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {j.d1Trend === 'BULLISH' ? 'Alcista' : 'Bajista'}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-300">{j.asianRangePoints} pts</td>
                          <td className="py-2 px-3 whitespace-nowrap font-bold">
                            {j.tradeType === 'LONG' ? (
                              <span className="text-emerald-400">BUY</span>
                            ) : j.tradeType === 'SHORT' ? (
                              <span className="text-rose-400">SELL</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{j.triggerTime}</td>
                          <td className="py-2 px-3 text-white whitespace-nowrap">{j.entry !== '-' ? `$${j.entry}` : '-'}</td>
                          <td className="py-2 px-3 text-rose-400 whitespace-nowrap">{j.sl !== '-' ? `$${j.sl}` : '-'}</td>
                          <td className="py-2 px-3 text-emerald-400 whitespace-nowrap">{j.tp !== '-' ? `$${j.tp}` : '-'}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {j.breakevenProtected.includes('Sí') ? (
                              <span className="text-cyan-400 text-[10px] font-bold">Activo (1:1)</span>
                            ) : (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${j.outcomeClass}`}>
                              {j.outcomeText}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                            {j.pnlUSD > 0 ? (
                              <span className="text-emerald-400">+${j.pnlUSD.toFixed(2)}</span>
                            ) : j.pnlUSD < 0 ? (
                              <span className="text-rose-400">-${Math.abs(j.pnlUSD).toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">$0.00</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-bold whitespace-nowrap">
                            {j.pnlPct > 0 ? (
                              <span className="text-emerald-400">+{j.pnlPct.toFixed(2)}%</span>
                            ) : j.pnlPct < 0 ? (
                              <span className="text-rose-400">{j.pnlPct.toFixed(2)}%</span>
                            ) : (
                              <span className="text-slate-500">0.00%</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 text-slate-200 font-bold border-t border-slate-800">
                      <tr>
                        <td className="py-3 px-3 text-amber-400" colSpan={3}>
                          TOTALES DEL PERÍODO
                        </td>
                        <td colSpan={7} className="py-3 px-3 text-slate-400 text-[11px]">
                          {allProcessedEntries.length} Sesiones Auditadas • {tradesWithSignal.length} Operaciones
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-emerald-400">{wins}W</span> /{' '}
                          <span className="text-rose-400">{losses}L</span> ({winRate}%)
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono text-sm ${
                            totalPnLUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {totalPnLUSD >= 0 ? '+' : ''}${totalPnLUSD.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm text-emerald-400">
                          +{totalPnLPct.toFixed(2)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Engineering Certification Stamp */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Certificación de Auditoría Cuantitativa
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Documento oficial generado por el motor algorítmico diseñado por el <strong>Ing. Francisco Alvarado</strong>.
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  <span className="block text-slate-200 font-bold">Ingeniero Francisco Alvarado</span>
                  <span className="text-[10px] text-amber-400">Especialista en Algoritmos & Mercados Financieros</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Desarrollado por el Ing. Francisco Alvarado • XAU/USD Quant Engine</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs font-mono transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
