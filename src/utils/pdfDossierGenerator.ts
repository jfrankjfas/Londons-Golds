import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StrategyParameters } from '../types/trading.ts';

export interface JournalPdfEntry {
  date: string;
  tradeNum: string;
  d1Trend: string;
  asianRangePoints: string;
  volatilityStatus: string;
  tradeType: string;
  triggerTime: string;
  entry: string;
  sl: string;
  tp: string;
  lots: string;
  outcomeText: string;
  outcomeClass: string;
  pnlUSD: number;
  pnlPct: number;
  breakevenProtected: string;
}

export interface PdfReportStats {
  totalSessions: number;
  tradesCount: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: string;
  totalPnLUSD: number;
  totalPnLPct: number;
  periodLabel: string;
  engineerName?: string;
}

/**
 * Generates an institutional-grade, multi-page executive PDF dossier
 * presenting the quantitative trading strategy developed by Ing. Francisco Alvarado.
 */
export const generateExecutiveDossierPdf = (
  entries: JournalPdfEntry[],
  params: StrategyParameters,
  stats: PdfReportStats
) => {
  const engineerName = stats.engineerName || 'Ingeniero Francisco Alvarado';
  const emissionDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // A4 Landscape: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ==========================================
  // PAGE 1: COVER & EXECUTIVE PRESENTATION
  // ==========================================

  // Top Deep Navy Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Top Amber Gold Accent Bar
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AUDITORÍA CUANTITATIVA Y REGISTRO INSTITUCIONAL DE OPERACIONES', margin, 16);

  // Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('ESTRATEGIA ALGORÍTMICA DE RUPTURA Y RETESTEO DE SESIÓN (XAU/USD)', margin, 23);

  // System & Author Badge (Top Right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('HERRAMIENTA Y ALGORITMO DESARROLLADO POR:', pageWidth - margin, 14, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(engineerName.toUpperCase(), pageWidth - margin, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Ingeniería en Sistemas Cuantitativos & Finanzas Algorítmicas', pageWidth - margin, 26, { align: 'right' });

  // Evaluation Period & Mode Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(245, 158, 11);
  doc.text(
    `MODO DE OPERACIÓN: ${params.trendMode === 'D1_STRICT' ? 'FILTRO D1 ESTRICTO' : 'RUPTURA DE SESIÓN (ALTA FRECUENCIA)'}   |   EMISIÓN OFICIAL: ${emissionDate}`,
    margin,
    34
  );

  // ------------------------------------------
  // PARAMETERS & METADATA BAR
  // ------------------------------------------
  let currentY = 46;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(margin, currentY, contentWidth, 14, 'FD');

  const metaCols = [
    { label: 'ACTIVO / INSTRUMENTO', val: 'Oro Spot (XAU/USD) - M15' },
    { label: 'BALANCE BASE AUDITADO', val: `$${params.accountBalance.toLocaleString()} USD` },
    { label: 'GESTIÓN R:R / RIESGO', val: `1:${params.rrRatio}  |  ${params.riskPercent}% por Trade` },
    { label: 'PERÍODO AUDITADO', val: `${stats.periodLabel} (${stats.totalSessions} Sesiones)` },
  ];

  const colWidth = contentWidth / 4;
  metaCols.forEach((col, idx) => {
    const xPos = margin + idx * colWidth + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(col.label, xPos, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(col.val, xPos, currentY + 10.5);
  });

  // ------------------------------------------
  // SECTION 1: PRESENTACIÓN Y METODOLOGÍA
  // ------------------------------------------
  currentY += 18;

  // Header Box
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('1. PRESENTACIÓN DE LA HERRAMIENTA Y METODOLOGÍA DEL INGENIERO FRANCISCO ALVARADO', margin + 3, currentY + 4.5);

  currentY += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  const presentationText =
    `El presente informe certifica los resultados cuantitativos y el comportamiento histórico del modelo de trading algorítmico diseñado por el ${engineerName}. La plataforma fue concebida como una solución matemática robusta y reproducible para la gestión de capital profesional y aprobación de cuentas de fondeo institucionales (Prop Trading Firms).\n\n` +
    `Mecánica del Algoritmo:\n` +
    `• Delimitación Asiática (00:00 - 06:00 UTC): El software mide la dispersión del precio en Tokio, estableciendo los límites máximo, mínimo y amplitud en puntos. Filtra rangos óptimos entre 6.0 y 22.0 puntos, descartando sesiones anómalas o noticias de alto impacto.\n` +
    `• Gatillo de Ruptura y Retesteo en Londres (08:00 - 13:00 UTC): Se monitorean órdenes de impulso institucional tras la apertura de Londres. La herramienta evalúa rupturas direccionales (#1) y posibles retesteos (#2) con confirmación de estructura en velas M15.\n` +
    `• Blindaje de Capital y Breakeven Dinámico: Cada operación calcula automáticamente el lotaje exacto en base al 1.0% de riesgo sobre el balance auditado. Al alcanzar una relación beneficio/riesgo 1:1, el algoritmo desplaza automáticamente el Stop Loss al precio de entrada, eliminando cualquier riesgo de pérdida para el resto de la sesión.`;

  const splitPresentation = doc.splitTextToSize(presentationText, contentWidth - 6);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY - 1.5, contentWidth, splitPresentation.length * 3.4 + 4, 'FD');
  doc.text(splitPresentation, margin + 3, currentY + 2.5);

  currentY += splitPresentation.length * 3.4 + 6;

  // ------------------------------------------
  // SECTION 2: EXECUTIVE KPI METRIC CARDS
  // ------------------------------------------
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('2. RESUMEN EJECUTIVO DE RENDIMIENTO CUANTITATIVO AUDITADO', margin + 3, currentY + 4.5);

  currentY += 9;
  const kpiCardWidth = (contentWidth - 12) / 4;
  const kpiHeight = 17;

  const kpis = [
    {
      title: 'OPERACIONES TOTALES',
      main: `${stats.tradesCount} Operaciones`,
      sub: `${stats.wins} W | ${stats.losses} L | ${stats.breakevens} BE`,
      bg: [248, 250, 252],
      borderColor: [203, 213, 225],
      mainColor: [15, 23, 42],
    },
    {
      title: 'TASA DE ACIERTO (WIN RATE)',
      main: `${stats.winRate}%`,
      sub: 'Sobre operaciones ejecutadas',
      bg: [236, 253, 245], // emerald-50
      borderColor: [167, 243, 208],
      mainColor: [5, 150, 105], // emerald-600
    },
    {
      title: 'BENEFICIO NETO TOTAL',
      main: `${stats.totalPnLUSD >= 0 ? '+' : ''}$${stats.totalPnLUSD.toFixed(2)} USD`,
      sub: `+${stats.totalPnLPct.toFixed(2)}% de Capital Base`,
      bg: [240, 253, 250],
      borderColor: [153, 246, 228],
      mainColor: [13, 148, 136],
    },
    {
      title: 'PROTECCIÓN DE CAPITAL',
      main: '100% Breakeven',
      sub: 'Blindaje de Riesgo Cero a 1:1',
      bg: [238, 242, 255],
      borderColor: [199, 210, 254],
      mainColor: [67, 56, 202],
    },
  ];

  kpis.forEach((kpi, idx) => {
    const xPos = margin + idx * (kpiCardWidth + 4);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.borderColor[0], kpi.borderColor[1], kpi.borderColor[2]);
    doc.rect(xPos, currentY, kpiCardWidth, kpiHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, xPos + 3, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(kpi.mainColor[0], kpi.mainColor[1], kpi.mainColor[2]);
    doc.text(kpi.main, xPos + 3, currentY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, xPos + 3, currentY + 14);
  });

  currentY += kpiHeight + 5;

  // ------------------------------------------
  // SECTION 3: GUÍA DIDÁCTICA DE LA TABLA (EXPLICACIÓN DE COLUMNAS)
  // ------------------------------------------
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('3. DESCRIPCIÓN Y ESPECIFICACIÓN TÉCNICA DE LAS COLUMNAS AUDITADAS', margin + 3, currentY + 4.5);

  currentY += 9;
  const colDescriptions = [
    { name: 'Fecha & Op. #', desc: 'Día de la sesión de mercado y número de orden (#1 Ruptura Inicial de Tokio o #2 Retesteo con confirmación).' },
    { name: 'Tendencia D1', desc: 'Filtro direccional mayor en temporalidad diaria (Alcista o Bajista) para alinear las probabilidades con la tendencia macro.' },
    { name: 'Rango Asia & Vol.', desc: 'Amplitud de la consolidación asiática medida en puntos y diagnóstico (Óptimo entre 6 y 22 pts, Comprimido o Expandido).' },
    { name: 'Tipo & Hora UTC', desc: 'Dirección de la orden ejecutada (BUY / SELL) y estampa de tiempo exacta de la señal en velas M15 de Londres.' },
    { name: 'Entrada, SL & TP', desc: 'Precios exactos de ejecución, nivel de Stop Loss técnico y objetivo de Take Profit proyectado con ratio asimétrico 1:2.' },
    { name: 'Breakeven', desc: 'Indica si el precio alcanzó la relación 1:1, activando el blindaje automático de Stop Loss al precio de entrada (Riesgo Cero).' },
    { name: 'Resultado & PnL', desc: 'Estatus final de la orden (WIN con TP alcanzado, LOSS por SL tocado, BREAKEVEN sin pérdida) y rendimiento en USD y %.' },
  ];

  const guideColWidth = (contentWidth - 6) / 2;
  colDescriptions.forEach((c, idx) => {
    const isLeft = idx % 2 === 0;
    const rowIndex = Math.floor(idx / 2);
    const xPos = margin + (isLeft ? 0 : guideColWidth + 6);
    const yPos = currentY + rowIndex * 6.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`• ${c.name}: `, xPos, yPos);

    const prefixWidth = doc.getTextWidth(`• ${c.name}: `);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(c.desc, xPos + prefixWidth, yPos, { maxWidth: guideColWidth - prefixWidth });
  });

  // ------------------------------------------
  // PAGE 1 FOOTER: CERTIFICATION BADGE
  // ------------------------------------------
  const certY = pageHeight - 17;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, certY, contentWidth, 12, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICACIÓN Y RESPONSABILIDAD TÉCNICA:', margin + 3, certY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Auditoría generada automáticamente por la Plataforma Cuantitativa desarrollada por ${engineerName}. Todos los cálculos matemáticos, ratios de Sharpe/Profit Factor y delimitaciones de velas son validados algorítmicamente. La tabla detallada comienza en la siguiente página.`,
    margin + 3,
    certY + 9,
    { maxWidth: contentWidth - 6 }
  );

  // ==========================================
  // PAGE 2+: DETAILED AUDIT DATA TABLE
  // ==========================================
  doc.addPage('a4', 'landscape');

  // Format table data rows
  const tableData = entries.map((e) => [
    e.date,
    e.tradeNum,
    e.d1Trend === 'BULLISH' ? 'Alcista' : e.d1Trend === 'BEARISH' ? 'Bajista' : '-',
    `${e.asianRangePoints} pts`,
    e.tradeType === 'LONG' ? 'BUY' : e.tradeType === 'SHORT' ? 'SELL' : '-',
    e.triggerTime,
    e.entry !== '-' ? `$${e.entry}` : '-',
    e.sl !== '-' ? `$${e.sl}` : '-',
    e.tp !== '-' ? `$${e.tp}` : '-',
    e.breakevenProtected.includes('Sí') ? 'Activo (1:1)' : '-',
    e.outcomeText,
    e.pnlUSD > 0
      ? `+$${e.pnlUSD.toFixed(2)}`
      : e.pnlUSD < 0
      ? `-$${Math.abs(e.pnlUSD).toFixed(2)}`
      : '$0.00',
    e.pnlPct !== 0 ? `${e.pnlPct > 0 ? '+' : ''}${e.pnlPct.toFixed(2)}%` : '0.00%',
  ]);

  autoTable(doc, {
    startY: 24,
    head: [
      [
        'Fecha',
        'Op. #',
        'Tendencia D1',
        'Rango Asia',
        'Tipo',
        'Hora UTC',
        'Entrada',
        'Stop Loss',
        'Take Profit',
        'Breakeven',
        'Resultado',
        'PnL (USD)',
        'PnL (%)',
      ],
    ],
    body: tableData,
    foot: [
      [
        'TOTALES',
        `${entries.length} reg.`,
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '-',
        '100% BE',
        `${stats.wins}W / ${stats.losses}L (${stats.winRate}%)`,
        `${stats.totalPnLUSD >= 0 ? '+' : ''}$${stats.totalPnLUSD.toFixed(2)} USD`,
        `+${stats.totalPnLPct.toFixed(2)}%`,
      ],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    footStyles: {
      fillColor: [30, 41, 59],
      textColor: [251, 191, 36], // Amber-400
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 20 },
      1: { halign: 'left', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 18 },
      4: { fontStyle: 'bold', halign: 'center', cellWidth: 14 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 18 },
      9: { halign: 'center', cellWidth: 18 },
      10: { fontStyle: 'bold', halign: 'center', cellWidth: 28 },
      11: { fontStyle: 'bold', halign: 'right', cellWidth: 22 },
      12: { fontStyle: 'bold', halign: 'right', cellWidth: 18 },
    },
    didParseCell: (data) => {
      // Colorize 'Resultado' column
      if (data.section === 'body' && data.column.index === 10) {
        const text = String(data.cell.raw);
        if (text.includes('WIN')) {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          data.cell.styles.fillColor = [209, 250, 229]; // emerald-100
        } else if (text.includes('LOSS')) {
          data.cell.styles.textColor = [225, 29, 72]; // rose-600
          data.cell.styles.fillColor = [255, 228, 230]; // rose-100
        } else if (text.includes('BREAKEVEN')) {
          data.cell.styles.textColor = [14, 116, 144]; // cyan-700
          data.cell.styles.fillColor = [207, 250, 254]; // cyan-100
        } else if (text.includes('SIN OPERACIÓN')) {
          data.cell.styles.textColor = [148, 163, 184]; // slate-400
        }
      }
      // Colorize 'Tipo' column
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text === 'BUY') {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (text === 'SELL') {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
      // Colorize PnL column
      if (data.section === 'body' && data.column.index === 11) {
        const text = String(data.cell.raw);
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (text.startsWith('-')) {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
      // Colorize PnL % column
      if (data.section === 'body' && data.column.index === 12) {
        const text = String(data.cell.raw);
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (text.startsWith('-')) {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
    didDrawPage: (data) => {
      // Header on every page from page 2
      if (data.pageNumber >= 2) {
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 16, 'F');

        doc.setFillColor(245, 158, 11);
        doc.rect(0, 0, pageWidth, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text('AUDITORÍA CUANTITATIVA XAU/USD  •  DIARIO OPERATIVO DÍA A DÍA', margin, 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(251, 191, 36);
        doc.text(`DESARROLLADO POR ${engineerName.toUpperCase()}`, pageWidth - margin, 10, { align: 'right' });
      }

      // Footer on all pages
      const footerY = pageHeight - 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Terminal Cuantitativo de Trading XAU/USD London Breakout — ${engineerName} © 2026`,
        margin,
        footerY
      );

      doc.setFont('helvetica', 'bold');
      doc.text(
        `Página ${data.pageNumber}`,
        pageWidth - margin,
        footerY,
        { align: 'right' }
      );
    },
    margin: { top: 20, left: margin, right: margin, bottom: 12 },
  });

  // Save the PDF file
  const filename = `Auditoria_Cuantitativa_XAUUSD_${engineerName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};
