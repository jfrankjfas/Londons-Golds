import React from 'react';
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
  FileSpreadsheet,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { soundManager } from '../utils/audioAlerts.ts';

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
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#0E131F]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30">
            <span className="font-mono font-black text-slate-950 text-sm tracking-tighter">AU</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                XAU/USD <span className="text-amber-400 text-xs px-2 py-0.5 rounded font-mono bg-amber-500/10 border border-amber-500/20">LONDON BREAKOUT</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Estrategia Cuantitativa Mecánica M15 • Filtro D1 • R:R 1:2 • Riesgo 0.5%
            </p>
          </div>
        </div>

        {/* Live Price Ticker Display */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono text-slate-400 leading-tight">Gold Spot (USD)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-mono font-bold text-amber-300">
                ${currentPrice.toFixed(2)}
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {priceChange24h >= 0 ? '+' : ''}
                {priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Feed en vivo" />
        </div>

        {/* Action Controls & Modal Triggers */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Economic News Shield */}
          {onOpenNewsModal && (
            <button
              id="btn-open-news"
              onClick={onOpenNewsModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all shadow-sm"
              title="Escudo de Noticias y Calendario Económico XAU/USD"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden lg:inline">Escudo Noticias</span>
            </button>
          )}

          {/* Monte Carlo Simulator */}
          {onOpenMonteCarloModal && (
            <button
              id="btn-open-montecarlo"
              onClick={onOpenMonteCarloModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all shadow-sm"
              title="Simulador de Monte Carlo & Curva de Equidad"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Monte Carlo</span>
            </button>
          )}

          {/* Trading Journal & CSV */}
          {onOpenJournalModal && (
            <button
              id="btn-open-journal"
              onClick={onOpenJournalModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all shadow-sm"
              title="Diario Cuantitativo de Trading y Exportación CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Diario & CSV</span>
            </button>
          )}

          {/* AI Copilot Button */}
          <button
            id="btn-open-ai"
            onClick={onOpenAiCopilot}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-all shadow-sm"
            title="Auditor de Mercado con IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
            <span className="hidden xl:inline">Auditor IA</span>
          </button>

          {/* Calculator Button */}
          <button
            id="btn-open-calc"
            onClick={onOpenCalculator}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-medium transition-all"
            title="Calculadora de Riesgo 0.5%"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Lotes</span>
          </button>

          {/* Export Code Button */}
          <button
            id="btn-open-code"
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-medium transition-all"
            title="Ver Código Modular (Python/MT5/Pine Script)"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Bot MT5</span>
          </button>

          {/* 1-Click Auto Updater & Web Deployment Button */}
          {onOpenUpdaterModal && (
            <button
              id="btn-open-updater"
              onClick={onOpenUpdaterModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all shadow-sm"
              title="Despliegue Web, Enlace en la Nube y Actualizador Automático"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Web & Nube</span>
            </button>
          )}

          {/* User Manual / FAQ Button */}
          <button
            id="btn-open-manual"
            onClick={onOpenManualModal}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-amber-300 text-xs font-medium transition-all"
            title="Manual de Uso, Instalación y FAQ"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Strategy Documentation Button */}
          <button
            id="btn-open-docs"
            onClick={onOpenDocsModal}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition-all"
            title="Documentación Mecánica y Fundamento Lógico"
          >
            <BookOpen className="w-4 h-4 text-slate-300" />
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-toggle-sound"
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
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Push Notification Toggle */}
          <button
            id="btn-push-notification"
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
              <BellRing className="w-4 h-4 text-emerald-400" />
            ) : (
              <Bell className="w-4 h-4" />
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
