import React, { useState } from 'react';
import { X, BookOpen, CheckCircle, ShieldAlert, TrendingUp, Clock, Scale, Zap } from 'lucide-react';
import { StrategyType } from '../types/trading.ts';

interface StrategyDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStrategy?: StrategyType;
}

export const StrategyDocModal: React.FC<StrategyDocModalProps> = ({
  isOpen,
  onClose,
  activeStrategy = 'LONDON_BREAKOUT',
}) => {
  const [selectedTab, setSelectedTab] = useState<StrategyType>(activeStrategy);

  React.useEffect(() => {
    setSelectedTab(activeStrategy);
  }, [activeStrategy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Fundamento Cuantitativo e Institucional (XAU/USD)
              </h3>
              <p className="text-xs text-slate-400">
                Ineficiencias Horarias • Flujo Interbancario • Ratio Asimétrico 1:2
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

        {/* Strategy Selector Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/60 text-xs font-mono">
          <button
            type="button"
            onClick={() => setSelectedTab('LONDON_BREAKOUT')}
            className={`py-3 px-4 border-b-2 font-bold transition flex items-center gap-1.5 ${
              selectedTab === 'LONDON_BREAKOUT'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>👑 Estrategia 1: London Breakout (Gold Killer V1)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTab('NY_ORB')}
            className={`py-3 px-4 border-b-2 font-bold transition flex items-center gap-1.5 ${
              selectedTab === 'NY_ORB'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🗽 Estrategia 2: NY Opening Range Breakout (ORB)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-200 font-sans text-xs sm:text-sm leading-relaxed">
          {selectedTab === 'LONDON_BREAKOUT' ? (
            <>
              {/* London Section 1 */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-400 font-mono text-xs uppercase">
                  <Clock className="w-4 h-4" />
                  1. Ineficiencia Horaria y London Gold Fix
                </div>
                <p className="text-slate-300">
                  El oro (XAU/USD) es el activo financiero más concentrado en horarios institucionales específicos. Históricamente, la <strong>London Bullion Market Association (LBMA)</strong> fija dos veces al día el precio de referencia mundial del oro (London Gold Fix a las 10:30 UTC y 15:00 UTC).
                </p>
                <p className="text-slate-300">
                  Entre las <strong>08:00 UTC (apertura de los bancos de la City de Londres)</strong> y las 11:00 UTC ingresa más del 40% del volumen diario global de divisas y metales preciosos. La sesión asiática previa (00:00 - 07:00 UTC) opera con bajo volumen relativo, generando una acumulación lateral de liquidez institucional.
                </p>
              </div>

              {/* London Section 2 */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-400 font-mono text-xs uppercase">
                  <Scale className="w-4 h-4" />
                  2. Acumulación y Captura de Liquidez Asiática
                </div>
                <p className="text-slate-300">
                  Durante las 7 horas de la sesión asiática (00:00 a 07:00 UTC):
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>Los operadores minoristas colocan órdenes pendientes fuera del rango de Tokio.</li>
                  <li>Al abrir Londres a las 08:00 UTC, los bancos inyectan liquidez institucional.</li>
                  <li>Cuando una vela M15 confirma el cierre fuera del rango, se produce una expansión direccional limpia.</li>
                </ul>
              </div>

              {/* London Section 3 */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-400 font-mono text-xs uppercase">
                  <CheckCircle className="w-4 h-4" />
                  3. Parámetros Oficiales Gold Killer V1
                </div>
                <p className="text-slate-300">
                  Stop Loss al 50% de la caja de Tokio, Target 1:2 y Breakeven a 1:1. Amplitud de Tokio filtrada estrictamente entre $6.0 y $32.0 USD para descartar días muertos o sobreextendidos.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* NY ORB Section 1 */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-cyan-400 font-mono text-xs uppercase">
                  <Clock className="w-4 h-4" />
                  1. Campana de Wall Street y Futuros COMEX (13:30 UTC)
                </div>
                <p className="text-slate-300">
                  A las <strong>13:30 UTC (09:30 AM EST)</strong> abre la Bolsa de Nueva York (NYSE) y coincide con el momento de mayor volumen en los contratos de futuros de Oro de COMEX (CME Group).
                </p>
                <p className="text-slate-300">
                  La primera vela de 15 minutos (13:30 a 13:45 UTC) representa la subasta inicial institucional. Durante estos 15 minutos se establecen el <strong>ORB High</strong> y el <strong>ORB Low</strong> que definen los niveles clave de absorción del día.
                </p>
              </div>

              {/* NY ORB Section 2 */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-purple-400 font-mono text-xs uppercase">
                  <Zap className="w-4 h-4" />
                  2. La Ruptura Cuantitativa del Rango de Apertura
                </div>
                <p className="text-slate-300">
                  Una vez fijado el rango de 13:30 a 13:45 UTC:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li><strong>Filtro de Amplitud:</strong> El rango debe medir entre $3.0 y $15.0 USD. Menos de $3 indica apatía; más de $15 indica un mercado ya agotado.</li>
                  <li><strong>Gatillo de Entrada:</strong> Cierre de vela M15 por encima del ORB High para compras o por debajo del ORB Low para ventas.</li>
                  <li><strong>Ventana Operativa:</strong> De 13:45 a 16:30 UTC. Después de las 16:30 UTC no se toman nuevos trades.</li>
                </ul>
              </div>

              {/* NY ORB Section 3 */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-400 font-mono text-xs uppercase">
                  <ShieldAlert className="w-4 h-4" />
                  3. Gestión de Riesgo 1:2 y Breakeven Dinámico
                </div>
                <p className="text-slate-300">
                  El Stop Loss se sitúa en el punto medio (50%) de la vela ORB. El Take Profit se fija en el doble del riesgo (1:2). Al avanzar a 1:1, el algoritmo traslada el Stop Loss al precio de entrada (+0.20$ de colchón para cubrir las comisiones del broker).
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
