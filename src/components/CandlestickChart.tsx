import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AsianRange, Candle, TradeSignal } from '../types/trading.ts';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Crosshair, RefreshCw, BarChart2, LineChart } from 'lucide-react';
import { TradingViewWidget } from './TradingViewWidget.tsx';

interface CandlestickChartProps {
  candles: Candle[];
  asianRange: AsianRange | null;
  trade: TradeSignal | null;
  currentPrice: number;
  dataSource?: string;
  isRealTime?: boolean;
  lastUpdated?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  asianRange,
  trade,
  currentPrice,
  dataSource = 'Kraken Institutional (PAXG/USD) + GoldAPI',
  isRealTime = true,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 440 });
  const [viewMode, setViewMode] = useState<'QUANT' | 'TRADINGVIEW'>('QUANT');
  const [showEma, setShowEma] = useState(true);
  const [showAsianBox, setShowAsianBox] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 1.5 = zoom in, 0.7 = zoom out

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({
          width: Math.max(320, containerRef.current.clientWidth),
          height: Math.max(340, Math.min(500, window.innerHeight * 0.5)),
        });
      }
    };
    updateDims();
    const observer = new ResizeObserver(updateDims);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute slice of candles based on zoom
  const displayCandles = useMemo(() => {
    if (zoomLevel === 1) return candles;
    const count = Math.round(candles.length / zoomLevel);
    // keep right side in view (recent price action)
    const start = Math.max(0, candles.length - count);
    return candles.slice(start);
  }, [candles, zoomLevel]);

  // Chart margins
  const margin = { top: 25, right: 68, bottom: 35, left: 16 };
  const chartWidth = dimensions.width - margin.left - margin.right;
  const chartHeight = dimensions.height - margin.top - margin.bottom;

  // Calculate price bounds (min, max) including Asian Range and SL/TP
  const { minPrice, maxPrice } = useMemo(() => {
    if (displayCandles.length === 0) return { minPrice: 4300, maxPrice: 4400 };

    let min = Infinity;
    let max = -Infinity;

    displayCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.ema20 && c.ema20 < min) min = c.ema20;
      if (c.ema20 && c.ema20 > max) max = c.ema20;
    });

    if (asianRange && showAsianBox) {
      if (asianRange.low < min) min = asianRange.low;
      if (asianRange.high > max) max = asianRange.high;
    }

    if (trade && showLevels) {
      if (trade.slPrice < min) min = trade.slPrice;
      if (trade.slPrice > max) max = trade.slPrice;
      if (trade.tpPrice < min) min = trade.tpPrice;
      if (trade.tpPrice > max) max = trade.tpPrice;
    }

    // Add 8% padding top and bottom for spacious aesthetic
    const padding = (max - min) * 0.08 || 2;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
    };
  }, [displayCandles, asianRange, trade, showAsianBox, showLevels]);

  const priceToY = (price: number) => {
    if (maxPrice === minPrice) return chartHeight / 2;
    return chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
  };

  const candleSpacing = chartWidth / Math.max(1, displayCandles.length);
  const candleWidth = Math.max(2, Math.min(14, candleSpacing * 0.68));

  // Map candle index to X coordinate
  const getCandleX = (idx: number) => margin.left + idx * candleSpacing + candleSpacing / 2;

  // Asian Range Box Coordinates
  const asianBoxCoords = useMemo(() => {
    if (!asianRange || !showAsianBox) return null;

    // Find indices in displayCandles
    const startIndex = displayCandles.findIndex((c) => c.time === asianRange.startTime);
    const endIndex = displayCandles.findIndex((c) => c.time === asianRange.endTime);

    if (startIndex === -1 && endIndex === -1) return null;

    const x1 = startIndex !== -1 ? getCandleX(startIndex) - candleSpacing / 2 : margin.left;
    const x2 =
      endIndex !== -1
        ? getCandleX(endIndex) + candleSpacing / 2
        : margin.left + chartWidth;

    const yTop = priceToY(asianRange.high);
    const yBottom = priceToY(asianRange.low);
    const yMid = priceToY(asianRange.midpoint);

    return {
      x: x1,
      y: yTop,
      width: Math.max(10, x2 - x1),
      height: Math.max(2, yBottom - yTop),
      yHigh: yTop,
      yLow: yBottom,
      yMid,
    };
  }, [asianRange, showAsianBox, displayCandles, candleSpacing, chartWidth]);

  // Price axis ticks (5 ticks)
  const priceTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = (maxPrice - minPrice) / 6;
    for (let i = 0; i <= 6; i++) {
      ticks.push(parseFloat((minPrice + i * step).toFixed(2)));
    }
    return ticks;
  }, [minPrice, maxPrice]);

  // Time axis ticks
  const timeTicks = useMemo(() => {
    const step = Math.max(1, Math.floor(displayCandles.length / 6));
    const result: { time: string; x: number }[] = [];
    for (let i = 0; i < displayCandles.length; i += step) {
      const c = displayCandles[i];
      const parts = c.time.split(' ');
      result.push({
        time: parts[1] || c.time,
        x: getCandleX(i),
      });
    }
    return result;
  }, [displayCandles, candleSpacing]);

  // EMA Path calculation
  const emaPath = useMemo(() => {
    if (!showEma) return '';
    let d = '';
    displayCandles.forEach((c, idx) => {
      if (c.ema20 !== undefined) {
        const x = getCandleX(idx);
        const y = priceToY(c.ema20);
        d += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
    });
    return d;
  }, [displayCandles, showEma, candleSpacing]);

  // Active hover candle
  const hoveredCandle = hoverIndex !== null && displayCandles[hoverIndex] ? displayCandles[hoverIndex] : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - margin.left;
    const idx = Math.floor(x / candleSpacing);
    if (idx >= 0 && idx < displayCandles.length) {
      setHoverIndex(idx);
    } else {
      setHoverIndex(null);
    }
  };

  return (
    <div id="candlestick-chart-container" className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-md flex flex-col">
      {/* Top Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-slate-800/80">
        {/* Left Side: Symbol, Mode Tabs & Real-Time Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher: Quant vs TradingView */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('QUANT')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                viewMode === 'QUANT'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Motor Londres M15</span>
            </button>
            <button
              onClick={() => setViewMode('TRADINGVIEW')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                viewMode === 'TRADINGVIEW'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>TradingView Live</span>
            </button>
          </div>

          {/* Live Market Data Feed Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">MERCADO REAL</span>
            <span className="text-slate-400 hidden md:inline">| {dataSource}</span>
            {lastUpdated && (
              <span className="text-slate-400 text-[10px] hidden lg:inline">
                ({new Date(lastUpdated).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="ml-1 p-0.5 hover:bg-emerald-500/20 rounded text-emerald-300 transition"
                title="Actualizar datos del mercado ahora"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Chart View Toggles & Zoom (Only visible in QUANT mode) */}
        {viewMode === 'QUANT' ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setShowAsianBox(!showAsianBox)}
              className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border transition-all ${
                showAsianBox
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Mostrar/Ocultar Rango Asiático"
            >
              {showAsianBox ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>Asia Box</span>
            </button>

            <button
              onClick={() => setShowEma(!showEma)}
              className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border transition-all ${
                showEma
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Mostrar/Ocultar EMA 20"
            >
              {showEma ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>EMA 20</span>
            </button>

            <button
              onClick={() => setShowLevels(!showLevels)}
              className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 border transition-all ${
                showLevels
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Mostrar/Ocultar Niveles SL & TP"
            >
              {showLevels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>SL/TP</span>
            </button>

            <div className="h-4 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

            {/* Zoom controls */}
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.3))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <span className="text-xs font-mono text-slate-400">
            Feed Streaming Multibroker • Ticks al Segundo
          </span>
        )}
      </div>

      {/* Render TradingView Widget if in TRADINGVIEW mode */}
      {viewMode === 'TRADINGVIEW' ? (
        <TradingViewWidget symbol="OANDA:XAUUSD" interval="15" theme="dark" />
      ) : (
        <>
          {/* Floating HUD Bar on Hover */}
      <div className="h-6 flex items-center justify-between text-[11px] font-mono text-slate-300 px-1 mb-1 overflow-x-auto">
        {hoveredCandle ? (
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-slate-400">{hoveredCandle.time} UTC</span>
            <span>
              O: <strong className="text-white">${hoveredCandle.open.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong className="text-emerald-400">${hoveredCandle.high.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong className="text-rose-400">${hoveredCandle.low.toFixed(2)}</strong>
            </span>
            <span>
              C:{' '}
              <strong
                className={
                  hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'
                }
              >
                ${hoveredCandle.close.toFixed(2)}
              </strong>
            </span>
            <span className="text-slate-400">Vol: {hoveredCandle.volume}</span>
            {hoveredCandle.ema20 && (
              <span className="text-amber-400/90">EMA20: ${hoveredCandle.ema20.toFixed(2)}</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400">
            <Crosshair className="w-3.5 h-3.5 text-slate-400" />
            <span>Pasa el cursor o toca el gráfico para inspeccionar velas y niveles</span>
          </div>
        )}

        {asianRange && (
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            <span>Rango Asiático: ${asianRange.rangePoints.toFixed(2)}</span>
            <span>(H: ${asianRange.high.toFixed(2)} / L: ${asianRange.low.toFixed(2)})</span>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-crosshair block"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Asian Box Gradient */}
            <linearGradient id="asianRangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.08" />
            </linearGradient>
            {/* Take Profit Zone Gradient */}
            <linearGradient id="tpGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
            </linearGradient>
            {/* Stop Loss Zone Gradient */}
            <linearGradient id="slGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background Grid Horizontal Lines & Price Labels */}
          {priceTicks.map((price) => {
            const y = priceToY(price);
            return (
              <g key={`grid-y-${price}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + chartWidth}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={margin.left + chartWidth + 6}
                  y={y + 3.5}
                  fill="#64748B"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  ${price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Time Axis Grid Vertical Lines */}
          {timeTicks.map((t, idx) => (
            <g key={`grid-x-${idx}`}>
              <line
                x1={t.x}
                y1={margin.top}
                x2={t.x}
                y2={margin.top + chartHeight}
                stroke="#1E293B"
                strokeWidth="0.8"
                strokeDasharray="2 4"
              />
              <text
                x={t.x}
                y={margin.top + chartHeight + 16}
                fill="#64748B"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {t.time}
              </text>
            </g>
          ))}

          {/* ASIAN RANGE HIGHLIGHTED BOX */}
          {asianBoxCoords && (
            <g id="asian-range-box-group">
              {/* Shaded Box */}
              <rect
                x={asianBoxCoords.x}
                y={asianBoxCoords.y}
                width={asianBoxCoords.width}
                height={asianBoxCoords.height}
                fill="url(#asianRangeGradient)"
                stroke="#3B82F6"
                strokeWidth="1.5"
                strokeDasharray="4 2"
                rx="3"
              />

              {/* Asian High Horizontal Line extended to current chart width */}
              <line
                x1={asianBoxCoords.x}
                y1={asianBoxCoords.yHigh}
                x2={margin.left + chartWidth}
                y2={asianBoxCoords.yHigh}
                stroke="#60A5FA"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text
                x={asianBoxCoords.x + 8}
                y={asianBoxCoords.yHigh - 5}
                fill="#93C5FD"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                Asia High: ${asianRange?.high.toFixed(2)}
              </text>

              {/* Asian Low Horizontal Line */}
              <line
                x1={asianBoxCoords.x}
                y1={asianBoxCoords.yLow}
                x2={margin.left + chartWidth}
                y2={asianBoxCoords.yLow}
                stroke="#60A5FA"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text
                x={asianBoxCoords.x + 8}
                y={asianBoxCoords.yLow + 12}
                fill="#93C5FD"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                Asia Low: ${asianRange?.low.toFixed(2)}
              </text>

              {/* Asian 50% Midpoint Line (Stop Loss reference) */}
              <line
                x1={asianBoxCoords.x}
                y1={asianBoxCoords.yMid}
                x2={margin.left + chartWidth}
                y2={asianBoxCoords.yMid}
                stroke="#F59E0B"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.8"
              />
              <text
                x={asianBoxCoords.x + 8}
                y={asianBoxCoords.yMid - 4}
                fill="#FCD34D"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="500"
              >
                Asia 50% Mid: ${asianRange?.midpoint.toFixed(2)}
              </text>
            </g>
          )}

          {/* TRADE SIGNALS, ENTRY, SL, TP LINES */}
          {trade && showLevels && (
            <g id="trade-levels-group">
              {/* Entry Line */}
              <line
                x1={margin.left}
                y1={priceToY(trade.entryPrice)}
                x2={margin.left + chartWidth}
                y2={priceToY(trade.entryPrice)}
                stroke={trade.type === 'LONG' ? '#10B981' : '#EF4444'}
                strokeWidth="2"
              />
              <rect
                x={margin.left + chartWidth - 140}
                y={priceToY(trade.entryPrice) - 10}
                width="135"
                height="20"
                rx="4"
                fill={trade.type === 'LONG' ? '#064E3B' : '#7F1D1D'}
                stroke={trade.type === 'LONG' ? '#10B981' : '#EF4444'}
                strokeWidth="1"
              />
              <text
                x={margin.left + chartWidth - 72}
                y={priceToY(trade.entryPrice) + 4}
                fill="#FFFFFF"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                ENTRY: ${trade.entryPrice.toFixed(2)} ({trade.type})
              </text>

              {/* Stop Loss Line (Highlights in Cyan if moved to Breakeven) */}
              <line
                x1={margin.left}
                y1={priceToY(trade.slPrice)}
                x2={margin.left + chartWidth}
                y2={priceToY(trade.slPrice)}
                stroke={trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? '#06B6D4' : '#EF4444'}
                strokeWidth={trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? '2.2' : '1.8'}
                strokeDasharray={trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? '4 2' : '6 3'}
              />
              <rect
                x={margin.left + chartWidth - (trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? 165 : 130)}
                y={priceToY(trade.slPrice) - 9}
                width={trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? 160 : 125}
                height="18"
                rx="4"
                fill={trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? '#083344' : '#450A0A'}
                stroke={trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? '#06B6D4' : '#EF4444'}
                strokeWidth="1"
              />
              <text
                x={margin.left + chartWidth - (trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? 85 : 67)}
                y={priceToY(trade.slPrice) + 4}
                fill={trade.isBreakevenTriggered || trade.status === 'BREAKEVEN' ? '#67E8F9' : '#FCA5A5'}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {trade.isBreakevenTriggered || trade.status === 'BREAKEVEN'
                  ? `🛡️ BREAKEVEN: $${trade.slPrice.toFixed(2)} (0 RIESGO)`
                  : `SL: $${trade.slPrice.toFixed(2)} (-0.5%)`}
              </text>

              {/* 1:1 Breakeven Trigger Reference Line if not yet reached */}
              {!trade.isBreakevenTriggered && trade.status === 'ACTIVE' && (
                <g opacity="0.75">
                  <line
                    x1={margin.left}
                    y1={priceToY(
                      trade.type === 'LONG'
                        ? trade.entryPrice + Math.abs(trade.entryPrice - trade.slPrice)
                        : trade.entryPrice - Math.abs(trade.entryPrice - trade.slPrice)
                    )}
                    x2={margin.left + chartWidth}
                    y2={priceToY(
                      trade.type === 'LONG'
                        ? trade.entryPrice + Math.abs(trade.entryPrice - trade.slPrice)
                        : trade.entryPrice - Math.abs(trade.entryPrice - trade.slPrice)
                    )}
                    stroke="#06B6D4"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={margin.left + chartWidth - 10}
                    y={
                      priceToY(
                        trade.type === 'LONG'
                          ? trade.entryPrice + Math.abs(trade.entryPrice - trade.slPrice)
                          : trade.entryPrice - Math.abs(trade.entryPrice - trade.slPrice)
                      ) - 4
                    }
                    fill="#22D3EE"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="end"
                  >
                    Gatillo BE 1:1: $
                    {(trade.type === 'LONG'
                      ? trade.entryPrice + Math.abs(trade.entryPrice - trade.slPrice)
                      : trade.entryPrice - Math.abs(trade.entryPrice - trade.slPrice)
                    ).toFixed(2)}
                  </text>
                </g>
              )}

              {/* Take Profit Line */}
              <line
                x1={margin.left}
                y1={priceToY(trade.tpPrice)}
                x2={margin.left + chartWidth}
                y2={priceToY(trade.tpPrice)}
                stroke="#10B981"
                strokeWidth="1.8"
                strokeDasharray="6 3"
              />
              <rect
                x={margin.left + chartWidth - 145}
                y={priceToY(trade.tpPrice) - 9}
                width="140"
                height="18"
                rx="4"
                fill="#064E3B"
                stroke="#10B981"
                strokeWidth="1"
              />
              <text
                x={margin.left + chartWidth - 75}
                y={priceToY(trade.tpPrice) + 4}
                fill="#6EE7B7"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                TP: ${trade.tpPrice.toFixed(2)} (+1.0% | 1:2 R:R)
              </text>

              {/* Breakout Entry Arrow Marker */}
              {(() => {
                const targetIdx = displayCandles.findIndex((c) => c.time === trade.time);
                if (targetIdx === -1) return null;
                const arrowX = getCandleX(targetIdx);
                const isLong = trade.type === 'LONG';
                const arrowY = isLong
                  ? priceToY(displayCandles[targetIdx].low) + 16
                  : priceToY(displayCandles[targetIdx].high) - 16;

                return (
                  <g>
                    <circle
                      cx={arrowX}
                      cy={arrowY}
                      r="12"
                      fill={isLong ? '#059669' : '#DC2626'}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                    <path
                      d={
                        isLong
                          ? `M ${arrowX} ${arrowY - 5} L ${arrowX - 4} ${arrowY + 3} L ${arrowX + 4} ${arrowY + 3} Z`
                          : `M ${arrowX} ${arrowY + 5} L ${arrowX - 4} ${arrowY - 3} L ${arrowX + 4} ${arrowY - 3} Z`
                      }
                      fill="#FFFFFF"
                    />
                    <text
                      x={arrowX}
                      y={isLong ? arrowY + 22 : arrowY - 16}
                      fill={isLong ? '#34D399' : '#F87171'}
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {isLong ? 'BUY BREAKOUT' : 'SELL BREAKOUT'}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* EMA 20 CURVE */}
          {showEma && emaPath && (
            <path
              d={emaPath}
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.85"
            />
          )}

          {/* CANDLESTICKS (Wicks and Bodies) */}
          {displayCandles.map((candle, idx) => {
            const x = getCandleX(idx);
            const isBullish = candle.close >= candle.open;
            const candleColor = isBullish ? '#10B981' : '#EF4444';
            const yHigh = priceToY(candle.high);
            const yLow = priceToY(candle.low);
            const yOpen = priceToY(candle.open);
            const yClose = priceToY(candle.close);
            const yBodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

            return (
              <g key={`candle-${candle.time}-${idx}`} className="transition-opacity">
                {/* Upper and Lower Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />

                {/* Candle Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={yBodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isBullish ? '#10B981' : '#EF4444'}
                  stroke={candleColor}
                  strokeWidth="0.8"
                  rx="1"
                />
              </g>
            );
          })}

          {/* CURRENT PRICE LIVE TICK LINE */}
          <line
            x1={margin.left}
            y1={priceToY(currentPrice)}
            x2={margin.left + chartWidth}
            y2={priceToY(currentPrice)}
            stroke="#F59E0B"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <rect
            x={margin.left + chartWidth}
            y={priceToY(currentPrice) - 9}
            width={margin.right - 2}
            height="18"
            fill="#F59E0B"
            rx="2"
          />
          <text
            x={margin.left + chartWidth + 4}
            y={priceToY(currentPrice) + 3.5}
            fill="#0F172A"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
          >
            ${currentPrice.toFixed(2)}
          </text>

          {/* INTERACTIVE CROSSHAIR */}
          {hoverIndex !== null && (
            <g id="crosshair-overlay">
              <line
                x1={getCandleX(hoverIndex)}
                y1={margin.top}
                x2={getCandleX(hoverIndex)}
                y2={margin.top + chartHeight}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {displayCandles[hoverIndex] && (
                <line
                  x1={margin.left}
                  y1={priceToY(displayCandles[hoverIndex].close)}
                  x2={margin.left + chartWidth}
                  y2={priceToY(displayCandles[hoverIndex].close)}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Chart Legend Footer */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800/60 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/40 border border-blue-400" />
            Rango Asiático (00:00 - 07:00 UTC)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400" />
            EMA 20
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 border-dashed" />
            Take Profit (1:2 R:R)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-400 border-dashed" />
            Stop Loss (50% / Opuesto)
          </span>
        </div>
        <span className="text-slate-400">Escala de Precios: Oro al contado USD/oz</span>
      </div>
        </>
      )}
    </div>
  );
};
