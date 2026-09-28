import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Calculator,
  Code2,
  Sparkles,
  BookOpen,
  HelpCircle,
  ShieldAlert,
  BarChart3,
  FileText,
  ChevronDown,
  Globe,
  Flame,
  Zap,
} from 'lucide-react';
import { soundManager } from '../utils/audioAlerts.ts';
import { StrategyType } from '../types/trading.ts';

interface NavbarProps {
  currentPrice: number;
  priceChange24h: number;
  isSimulating: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notificationPermission: NotificationPermission | 'default';
  onRequestNotification: () => void;
  onOpenCalculator: () => void;
  onOpenAiCopilot: () => void;
  onOpenCodeModal: () => void;
  onOpenDocsModal: () => void;
  onOpenManualModal: () => void;
  onOpenNewsModal?: () => void;
  onOpenMonteCarloModal?: () => void;
  onOpenJournalModal?: () => void;
  onOpenUpdaterModal?: () => void;
  activeStrategy: StrategyType;
  onSelectStrategy: (strat: StrategyType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPrice,
  priceChange24h,
  soundEnabled,
  onToggleSound,
  notificationPermission,
  onRequestNotification,
  onOpenCalculator,
  onOpenAiCopilot,
  onOpenCodeModal,
  onOpenDocsModal,
  onOpenManualModal,
  onOpenNewsModal,
  onOpenMonteCarloModal,
  onOpenJournalModal,
  onOpenUpdaterModal,
  activeStrategy,
  onSelectStrategy,
}) => {
  const [isManualMenuOpen, setIsManualMenuOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

  const manualMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (manualMenuRef.current && !manualMenuRef.current.contains(event.target as Node)) {
        setIsManualMenuOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#0A0E17]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Zone 1: Brand & Strategy Indicator */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30 shrink-0">
            <span className="font-mono font-black text-slate-950 text-sm tracking-tighter">AU</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                XAU/USD <span className="text-amber-400">Quant</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
                {activeStrategy === 'LONDON_BREAKOUT' ? 'GOLD KILLER V1' : 'NY ORB OFICIAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {activeStrategy === 'LONDON_BREAKOUT'
                ? 'Estrategia 1: Ruptura Asiática (08:00 UTC) • R:R 1:2'
                : 'Estrategia 2: NY Opening Range Breakout (13:30 UTC) • R:R 1:2'}
            </p>
          </div>
        </div>

        {/* Live Spot Price Ticker */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800/90 rounded-lg px-3 py-1.5 shadow-inner">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-mono text-slate-400 leading-tight">Oro Spot (XAU/USD)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-mono font-bold text-amber-300">
                ${currentPrice.toFixed(2)}
              </span>
              <span
                className={`text-[11px] font-mono font-semibold ${
                  priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {priceChange24h >= 0 ? '+' : ''}
                {priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Cotización en tiempo real" />
        </div>

        {/* Center / Strategy Switcher (Clean Segmented Control) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              onSelectStrategy('LONDON_BREAKOUT');
              soundManager.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeStrategy === 'LONDON_BREAKOUT'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Estrategia 1: London Breakout - Gold Killer V1 Oficial"
          >
            <span>🇬🇧 Londres (V1 Oficial)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectStrategy('NY_ORB');
              soundManager.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeStrategy === 'NY_ORB'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Estrategia 2: NY Session ORB (Opening Range Breakout Oficial)"
          >
            <span>🇺🇸 NY ORB (Oficial)</span>
          </button>
        </div>

        {/* Zone 3: Grouped Dropdowns & Primary Action */}
        <div className="flex items-center gap-2">
          {/* Group 1: Manual & Ayuda (Dropdown) */}
          <div className="relative" ref={manualMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsManualMenuOpen(!isManualMenuOpen);
                setIsToolsMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isManualMenuOpen
                  ? 'bg-slate-800 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Manual & Ayuda</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isManualMenuOpen ? 'rotate-180 text-amber-400' : ''}`} />
            </button>

            {isManualMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0F1424] border border-slate-800 shadow-2xl py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-slate-800/80">
                  Guías e Instructivos
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualMenuOpen(false);
                    onOpenManualModal();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 flex items-center gap-2.5 transition"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Manual de Uso (Principiantes)</span>
                    <span className="text-[10px] text-slate-400">Instalación paso a paso en MT5 / MT4</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualMenuOpen(false);
                    onOpenDocsModal();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 flex items-center gap-2.5 transition"
                >
                  <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Reglas de la Estrategia</span>
                    <span className="text-[10px] text-slate-400">Fundamento cuantitativo y horarios</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualMenuOpen(false);
                    onOpenAiCopilot();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-300 flex items-center gap-2.5 transition border-t border-slate-800/80"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Auditor Cuántico IA</span>
                    <span className="text-[10px] text-slate-400">Análisis con Gemini en tiempo real</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Group 2: Herramientas Cuánticas (Dropdown) */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsToolsMenuOpen(!isToolsMenuOpen);
                setIsManualMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isToolsMenuOpen
                  ? 'bg-slate-800 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Herramientas</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isToolsMenuOpen ? 'rotate-180 text-amber-400' : ''}`} />
            </button>

            {isToolsMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0F1424] border border-slate-800 shadow-2xl py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1.5 text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-slate-800/80">
                  Herramientas y Auditoría
                </div>
                {onOpenNewsModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onOpenNewsModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-rose-500/10 hover:text-rose-300 flex items-center gap-2.5 transition"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-semibold block">Escudo de Noticias</span>
                      <span className="text-[10px] text-slate-400">Protección contra CPI, NFP y tasas</span>
                    </div>
                  </button>
                )}
                {onOpenMonteCarloModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onOpenMonteCarloModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 flex items-center gap-2.5 transition"
                  >
                    <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-semibold block">Tester Monte Carlo</span>
                      <span className="text-[10px] text-slate-400">Curva de equidad y riesgo de quiebra</span>
                    </div>
                  </button>
                )}
                {onOpenJournalModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onOpenJournalModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-300 flex items-center gap-2.5 transition"
                  >
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold block">Diario & Dossier PDF</span>
                      <span className="text-[10px] text-slate-400">Descarga el informe oficial en PDF</span>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    onOpenCalculator();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 flex items-center gap-2.5 transition border-t border-slate-800/80"
                >
                  <Calculator className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Calculadora de Lotes</span>
                    <span className="text-[10px] text-slate-400">Gestión exacta de riesgo por operación</span>
                  </div>
                </button>
                {onOpenUpdaterModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onOpenUpdaterModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 flex items-center gap-2.5 transition"
                  >
                    <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div>
                      <span className="font-semibold block">Despliegue & Nube</span>
                      <span className="text-[10px] text-slate-400">Enlace en línea y actualizaciones</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Primary Action CTA: Descargar Bot EA */}
          <button
            type="button"
            id="btn-open-code"
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            title="Descargar el Robot Oficial en MT5, MT4, PineScript o Python"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeStrategy === 'LONDON_BREAKOUT' ? 'Bot Gold Killer V1' : 'Bot NY ORB Oficial'}
            </span>
            <span className="sm:hidden">Bot EA</span>
          </button>

          {/* Quick Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              onToggleSound();
              soundManager.playClick();
            }}
            className={`p-2 rounded-lg border transition-all ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-500'
            }`}
            title={soundEnabled ? 'Sonidos activados' : 'Sonidos desactivados'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Push Notification Toggle */}
          <button
            type="button"
            onClick={onRequestNotification}
            className={`p-2 rounded-lg border transition-all relative ${
              notificationPermission === 'granted'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={
              notificationPermission === 'granted'
                ? 'Alertas Push activas'
                : 'Activar alertas push en el navegador'
            }
          >
            {notificationPermission === 'granted' ? (
              <BellRing className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            {notificationPermission === 'granted' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
