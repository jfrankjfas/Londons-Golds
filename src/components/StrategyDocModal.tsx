import React from 'react';
import { X, BookOpen, CheckCircle, ShieldAlert, TrendingUp, Clock, Scale } from 'lucide-react';

interface StrategyDocModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategyDocModal: React.FC<StrategyDocModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Fundamento Cuantitativo: XAU/USD London Open Breakout
              </h3>
              <p className="text-xs text-slate-400">
                Ineficiencia Horaria • London Gold Fix • Gestión Mecánica
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-200 font-sans text-xs sm:text-sm leading-relaxed">
          {/* Section 1 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 font-mono text-xs uppercase">
              <Clock className="w-4 h-4" />
              1. Ineficiencia Horaria y London Gold Fix
            </div>
            <p className="text-slate-300">
              El oro (XAU/USD) es el activo financiero más concentrado en horarios institucionales específicos. Históricamente, la <strong>London Bullion Market Association (LBMA)</strong> fija dos veces al día el precio de referencia mundial del oro (London Gold Fix a las 10:30 UTC y 15:00 UTC).
            </p>
            <p className="text-slate-300">
              Entre las <strong>08:00 UTC (apertura oficial de los bancos de la City de Londres)</strong> y las 11:00 UTC ingresa más del 40% del volumen diario global de divisas y metales preciosos. La sesión asiática previa (00:00 - 07:00 UTC) opera con bajo volumen relativo, generando una acumulación lateral de liquidez institucional.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-400 font-mono text-xs uppercase">
              <Scale className="w-4 h-4" />
              2. Acumulación y Captura de Liquidez Asiática
            </div>
            <p className="text-slate-300">
              Durante las 7 horas de la sesión asiática (00:00 a 07:00 UTC):
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Los operadores minoristas colocan órdenes Buy Stop por encima del <strong>Asian High</strong>.</li>
              <li>Colocan órdenes Sell Stop por debajo del <strong>Asian Low</strong>.</li>
              <li>
                Al abrir Londres a las 08:00 UTC, los bancos institucionales inyectan liquidez. Cuando el precio rompe y <strong>cierra con cuerpo en M15</strong> por fuera del rango, se desencadena una cascada de órdenes de momentum y cobertura interbancaria.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-400 font-mono text-xs uppercase">
              <TrendingUp className="w-4 h-4" />
              3. El Filtro Cuanti de la Vela Diaria Previa (D1)
            </div>
            <p className="text-slate-300">
              Uno de los mayores errores en las estrategias de ruptura minoristas es operar en ambas direcciones sin filtro direccional. En XAU/USD, la tendencia del día anterior ofrece una inercia estadística determinante:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs pt-1">
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold block mb-1">D1 Previo Alcista (Close &gt; Open)</span>
                <span className="text-slate-300">Solo se permiten órdenes <strong>BUY</strong>. Si el precio rompe a la baja, se descarta por riesgo de falso rompimiento ("Turtle Soup").</span>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/30 p-2.5 rounded-lg">
                <span className="text-rose-400 font-bold block mb-1">D1 Previo Bajista (Close &lt; Open)</span>
                <span className="text-slate-300">Solo se permiten órdenes <strong>SELL</strong>. Si rompe al alza, se ignora la señal para no operar contra el flujo de orden diario.</span>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400 font-mono text-xs uppercase">
              <CheckCircle className="w-4 h-4" />
              4. Regla de Confirmación: Cierre con Cuerpo M15
            </div>
            <p className="text-slate-300">
              No se entra con órdenes pendientes en el límite exacto del rango ni con mechas de absorción. Se exige que la vela de 15 minutos (M15) termine con su <strong>precio de cierre (Close)</strong> superando el máximo o mínimo asiático. Esto confirma la aceptación de valor por parte del flujo institucional.
            </p>
          </div>

          {/* Section 5 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-400 font-mono text-xs uppercase">
              <ShieldAlert className="w-4 h-4" />
              5. Gestión de Riesgo (0.5%) y Expectativa Matemática
            </div>
            <p className="text-slate-300">
              El ratio mínimo exigido es <strong>1:2 Riesgo/Beneficio</strong>. Con un ratio 1:2:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>Con un <strong>40% de aciertos</strong>, la estrategia ya es rentable.</li>
              <li>Con un <strong>50% de aciertos</strong>, la curva de balance genera retornos exponenciales constantes.</li>
              <li>
                Arriesgar exactamente el <strong>0.5%</strong> por operación permite tolerar rachas adversas sin comprometer la psicología del operador.
              </li>
              <li>
                <strong>Máximo 1 operación por día</strong>: Protege de la sobre-operación (overtrading) y de la consolidación típica de la tarde europea.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
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
