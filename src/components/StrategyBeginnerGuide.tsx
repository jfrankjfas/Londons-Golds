import React, { useState } from 'react';
import { StrategyType } from '../types/trading.ts';
import {
  HelpCircle,
  Clock,
  Target,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  Terminal,
  Zap,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface StrategyBeginnerGuideProps {
  activeStrategy: StrategyType;
  onOpenCodeModal: () => void;
  onOpenManualModal: () => void;
}

export const StrategyBeginnerGuide: React.FC<StrategyBeginnerGuideProps> = ({
  activeStrategy,
  onOpenCodeModal,
  onOpenManualModal,
}) => {
  const [showInstallSteps, setShowInstallSteps] = useState(false);

  const isLondon = activeStrategy === 'LONDON_BREAKOUT';

  return (
    <div className="bg-[#0E1322] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-md ${
            isLondon 
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/10' 
              : 'bg-slate-800 text-slate-200 border border-slate-700'
          }`}>
            {isLondon ? '01' : '02'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                {isLondon
                  ? 'Estrategia 1: Ruptura de Londres (Gold Killer V1 Oficial)'
                  : 'Estrategia 2: NY Opening Range Breakout (NY ORB Oficial)'}
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isLondon
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}>
                {isLondon ? 'Sesión Europea (08:00 UTC)' : 'Sesión Wall Street (13:30 UTC)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isLondon
                ? 'Diseñada para capturar la inyección de volumen del London Gold Fix tras la acumulación asiática.'
                : 'Diseñada para operar la apertura de la bolsa de Nueva York y los futuros COMEX con el rango de 15 minutos.'}
            </p>
          </div>
        </div>

        {/* Action Quick Links */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInstallSteps(!showInstallSteps)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 transition"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>{showInstallSteps ? 'Ocultar Instalación' : '¿Cómo instalar en 3 min?'}</span>
            {showInstallSteps ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Robot EA</span>
          </button>
        </div>
      </div>

      {/* 3 Step Visual Explanations for Beginners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Step 1 */}
        <div className="bg-[#121829] border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono font-bold text-amber-400">
                Paso 1: La Caja de Rango
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              {isLondon ? 'Rango Asiático (00:00 - 07:00 UTC)' : 'Vela ORB M15 (13:30 - 13:45 UTC)'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isLondon
                ? 'Durante la noche, el oro se acumula en un canal lateral. El algoritmo delimita con precisión el techo y suelo de Tokio sin que tengas que dibujar nada manual.'
                : 'La campana de Wall Street suena a las 13:30 UTC. La primera vela de 15 minutos crea los niveles de soporte y resistencia institucionales clave del día.'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Filtro de Amplitud:</span>
            <span className="text-amber-300 font-bold">
              {isLondon ? '$6.0 - $32.0 USD' : '$3.0 - $15.0 USD'}
            </span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#121829] border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono font-bold text-emerald-400">
                Paso 2: Entrada Confirmada
              </span>
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              {isLondon ? 'Ruptura Campana Londres (08:00 UTC)' : 'Ruptura de Nueva York (13:45 UTC)'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isLondon
                ? 'Si una vela M15 cierra con cuerpo por encima del techo asiático, compra inmediatamente. Si cierra por debajo del suelo, entra en venta. Cero adivinanzas.'
                : 'El robot espera que una vela cierre fuera del rango de los primeros 15 minutos. Si rompe arriba entra en BUY; si rompe abajo entra en SELL.'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Gatillo Matemático:</span>
            <span className="text-emerald-400 font-bold">Cierre de Vela M15</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#121829] border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono font-bold text-amber-400">
                Paso 3: Blindaje de Capital
              </span>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              Target 1:2 + Breakeven Automático
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Stop Loss ubicado al 50% de la caja. El Take Profit busca el doble de lo arriesgado (1:2). Cuando el precio alcanza 1:1, el bot corre el SL a tu precio de entrada para riesgo $0.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Ratio Riesgo/Beneficio:</span>
            <span className="text-amber-300 font-bold">1:2 R:R (Asimétrico)</span>
          </div>
        </div>
      </div>

      {/* Expandable 3-Minute Installation Guide */}
      {showInstallSteps && (
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 sm:p-5 space-y-3.5 animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm font-sans">
            <Terminal className="w-4 h-4" />
            <span>Guía de Instalación Rápida en MetaTrader 5 (3 Pasos)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="bg-[#0E1322] border border-slate-800 p-3 rounded-lg space-y-1">
              <span className="text-amber-400 font-mono font-bold block">1. Descargar Archivo</span>
              <p>
                Haz clic en <strong>"Descargar Robot EA"</strong> arriba y descarga el archivo{' '}
                <code className="text-emerald-400 font-mono">
                  {isLondon ? 'XAUUSD_GoldKiller_V1_Oficial.mq5' : 'XAUUSD_NY_ORB_Oficial.mq5'}
                </code>.
              </p>
            </div>

            <div className="bg-[#0E1322] border border-slate-800 p-3 rounded-lg space-y-1">
              <span className="text-amber-400 font-mono font-bold block">2. Pegar en MetaTrader 5</span>
              <p>
                En tu MetaTrader 5 ve al menú superior: <code className="text-slate-200">Archivo &gt; Abrir Carpeta de Datos &gt; MQL5 &gt; Experts</code> y pega el archivo allí.
              </p>
            </div>

            <div className="bg-[#0E1322] border border-slate-800 p-3 rounded-lg space-y-1">
              <span className="text-amber-400 font-mono font-bold block">3. Compilar y Ejecutar</span>
              <p>
                Abre el MetaEditor con <code className="text-slate-200">F4</code>, presiona <code className="text-slate-200">F7</code> para compilar. Arrastra el bot al gráfico de <code className="text-amber-300">XAU/USD M15</code> y activa <strong>Algo Trading</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <span>¿Necesitas ayuda con los parámetros o quieres ejecutar en TradingView o Python?</span>
            <button
              type="button"
              onClick={onOpenManualModal}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition"
            >
              Abrir Manual Completo & Preguntas Frecuentes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
