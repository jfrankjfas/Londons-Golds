import React, { useEffect, useState, useMemo, memo } from 'react';
import { Maximize2, Minimize2, Activity } from 'lucide-react';

interface TradingViewWidgetProps {
  initialSymbol?: string;
  symbol?: string;
  theme?: 'dark' | 'light';
  initialInterval?: string;
  interval?: string;
}

type ChartHeight = 'normal' | 'large' | 'cinema';

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  initialSymbol,
  symbol: propSymbol = 'OANDA:XAUUSD',
  theme = 'dark',
  initialInterval,
  interval: propInterval = '15',
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [chartHeight, setChartHeight] = useState<ChartHeight>('large');
  const [symbol, setSymbol] = useState<string>(initialSymbol || propSymbol);
  const [interval, setInterval] = useState<string>(initialInterval || propInterval);

  // Keyboard shortcut: ESC to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Construct direct, isolated TradingView iframe URL without brittle external DOM script injection
  const iframeSrc = useMemo(() => {
    const config = {
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'es',
      enable_publishing: false,
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      details: false,
      hotlist: false,
      calendar: false,
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      backgroundColor: '#0B0E14',
      gridColor: 'rgba(30, 41, 59, 0.4)',
      studies: ['STD;EMA'],
      support_host: 'https://www.tradingview.com',
      utm_source: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      utm_medium: 'widget',
      utm_campaign: 'advanced-chart',
    };
    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=es#${encodeURIComponent(JSON.stringify(config))}`;
  }, [symbol, interval, theme]);

  const heightClasses: Record<ChartHeight, string> = {
    normal: 'h-[580px]',
    large: 'h-[750px]',
    cinema: 'h-[920px]',
  };

  return (
    <div
      id="tradingview-gold-wrapper"
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-[9999] bg-[#0B0E14] p-3 sm:p-5 flex flex-col w-screen h-screen'
          : `w-full ${heightClasses[chartHeight]} rounded-xl border border-slate-800 bg-[#0B0E14] flex flex-col shadow-2xl transition-all duration-300`
      }`}
    >
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 select-none">
        {/* Left Side: Status and Feed Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-md text-emerald-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">TRADINGVIEW PRO LIVE</span>
          </div>

          {/* Broker Feed Selection */}
          <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700/60 font-mono text-[11px]">
            <button
              onClick={() => setSymbol('OANDA:XAUUSD')}
              className={`px-2 py-0.5 rounded transition ${
                symbol === 'OANDA:XAUUSD'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Feed OANDA (Alta liquidez institucional)"
            >
              OANDA
            </button>
            <button
              onClick={() => setSymbol('FX:XAUUSD')}
              className={`px-2 py-0.5 rounded transition ${
                symbol === 'FX:XAUUSD'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Feed Forex Global"
            >
              FX IDC
            </button>
            <button
              onClick={() => setSymbol('TVC:GOLD')}
              className={`px-2 py-0.5 rounded transition ${
                symbol === 'TVC:GOLD'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Gold Commodities Spot"
            >
              TVC SPOT
            </button>
          </div>

          {/* Timeframe Quick Selection */}
          <div className="hidden sm:flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700/60 font-mono text-[11px]">
            {[
              { label: '5m', val: '5' },
              { label: '15m', val: '15' },
              { label: '1H', val: '60' },
              { label: '4H', val: '240' },
              { label: '1D', val: 'D' },
            ].map((tf) => (
              <button
                key={tf.val}
                onClick={() => setInterval(tf.val)}
                className={`px-2 py-0.5 rounded transition ${
                  interval === tf.val
                    ? 'bg-blue-500/20 text-blue-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Size Controls & Fullscreen Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isFullscreen && (
            <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700/60 font-mono text-[11px]">
              <button
                onClick={() => setChartHeight('normal')}
                className={`px-2 py-0.5 rounded transition ${
                  chartHeight === 'normal'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Altura Normal (580px)"
              >
                Normal
              </button>
              <button
                onClick={() => setChartHeight('large')}
                className={`px-2 py-0.5 rounded transition ${
                  chartHeight === 'large'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Altura Ampliada (750px)"
              >
                Grande
              </button>
              <button
                onClick={() => setChartHeight('cinema')}
                className={`px-2 py-0.5 rounded transition ${
                  chartHeight === 'cinema'
                    ? 'bg-amber-500/20 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Altura Cine (920px)"
              >
                XL (920px)
              </button>
            </div>
          )}

          {/* Fullscreen Toggle Button */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-xs font-semibold border transition shadow-sm ${
              isFullscreen
                ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
            }`}
            title={isFullscreen ? 'Salir de Pantalla Completa (ESC)' : 'Expandir a Pantalla Completa'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Salir (ESC)</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pantalla Completa</span>
                <span className="sm:hidden">Ampliar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* TradingView Advanced Chart Isolated Native Iframe Container */}
      <div
        id="tradingview-gold-embed"
        className="flex-1 w-full h-full relative overflow-hidden bg-[#0B0E14]"
      >
        <iframe
          key={`${symbol}-${interval}-${theme}`}
          title={`TradingView ${symbol}`}
          src={iframeSrc}
          className="w-full h-full border-0"
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
});
