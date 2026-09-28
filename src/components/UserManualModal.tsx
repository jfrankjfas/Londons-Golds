import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Terminal,
  Sliders,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Target,
  Flame,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCodeModal: () => void;
  onOpenCalculator: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({
  isOpen,
  onClose,
  onOpenCodeModal,
  onOpenCalculator,
}) => {
  const [activeTopic, setActiveTopic] = useState<
    'beginner' | 'strategies' | 'installation' | 'parameters' | 'risk'
  >('beginner');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Manual de Uso e Instructivo para Principiantes
              </h3>
              <p className="text-xs text-slate-400">
                Aprende de qué trata cada estrategia, cómo funcionan y cómo ejecutarlas en tu broker
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-900/40 overflow-x-auto text-xs font-mono">
          {[
            { id: 'beginner', label: '1. Guía Rápida Principiantes' },
            { id: 'strategies', label: '2. Estrategia 1 vs Estrategia 2' },
            { id: 'installation', label: '3. Instalación en MetaTrader 5/4' },
            { id: 'parameters', label: '4. Parámetros y Horarios' },
            { id: 'risk', label: '5. Gestión de Riesgo 1:2' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTopic(tab.id as any)}
              className={`py-3 px-3.5 border-b-2 font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTopic === tab.id
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Topic Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-200 font-sans text-xs sm:text-sm leading-relaxed flex-1">
          {/* TAB 1: GUÍA RÁPIDA PRINCIPIANTES */}
          {activeTopic === 'beginner' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-amber-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" /> ¿Qué es este sistema y para qué sirve?
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Es una plataforma de <strong>trading algorítmico profesional para Oro (XAU/USD)</strong>. En lugar de estar mirando la pantalla todo el día intentando adivinar hacia dónde irá el precio, el sistema se basa en <strong>ineficiencias horarias reales y matemáticas</strong>.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  El oro tiene horarios donde entra la mayor cantidad de dinero institucional en el mundo:
                  la <strong>apertura de Londres (08:00 UTC)</strong> y la <strong>apertura de Nueva York / Wall Street (13:30 UTC)</strong>. Nuestros algoritmos esperan a que el mercado cree un rango inicial y, cuando los grandes bancos empujan el precio con volumen, el robot entra automáticamente a favor de ese movimiento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-amber-300 font-mono font-bold text-xs block">1. 100% Mecánico</span>
                  <p className="text-xs text-slate-400">
                    No hay opiniones ni emociones. Si la vela M15 cierra fuera de la caja, el bot ejecuta. Si no rompe, preserva tu dinero intacto.
                  </p>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-emerald-400 font-mono font-bold text-xs block">2. Riesgo Asimétrico 1:2</span>
                  <p className="text-xs text-slate-400">
                    Por cada $100 que arriesgas, buscas ganar $200. Con esta asimetría, solo necesitas acertar el 40% de los trades para ser rentable.
                  </p>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-cyan-400 font-mono font-bold text-xs block">3. Protección Breakeven</span>
                  <p className="text-xs text-slate-400">
                    Cuando el trade avanza al 1:1, el Stop Loss se traslada al precio de entrada (+ colchón de comisión), convirtiéndose en un trade gratis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ESTRATEGIA 1 VS ESTRATEGIA 2 */}
          {activeTopic === 'strategies' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Estrategia 1 */}
                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-amber-400 font-mono font-bold text-sm flex items-center gap-1.5">
                      👑 Estrategia 1: Gold Killer V1 Oficial
                    </span>
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      Londres (08:00 UTC)
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <p>
                      <strong>¿Qué analiza?</strong> La sesión asiática previa (00:00 a 07:00 UTC). El oro acumula liquidez en un canal lateral estrecho.
                    </p>
                    <p>
                      <strong>¿Cuándo opera?</strong> Entre las 08:00 y las 11:00 UTC (las 3 horas de mayor volumen de los bancos británicos).
                    </p>
                    <p>
                      <strong>Entrada:</strong> Cierre de vela M15 por encima del máximo asiático (BUY) o por debajo del mínimo asiático (SELL).
                    </p>
                    <p>
                      <strong>Stop Loss:</strong> Al 50% de la caja de Tokio.
                    </p>
                  </div>
                </div>

                {/* Estrategia 2 */}
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-cyan-300 font-mono font-bold text-sm flex items-center gap-1.5">
                      🗽 Estrategia 2: NY ORB Oficial
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                      Nueva York (13:30 UTC)
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <p>
                      <strong>¿Qué analiza?</strong> La primera vela de 15 minutos (13:30 a 13:45 UTC) tras la campana de Wall Street y los futuros COMEX.
                    </p>
                    <p>
                      <strong>¿Cuándo opera?</strong> Entre las 13:45 y las 16:30 UTC.
                    </p>
                    <p>
                      <strong>Entrada:</strong> Cierre de vela M15 por encima del máximo del ORB (BUY) o por debajo del mínimo (SELL).
                    </p>
                    <p>
                      <strong>Stop Loss:</strong> En la mitad (50%) de la vela inicial de apertura.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="text-white font-bold block mb-1">💡 ¿Cuál de las dos deberías usar?</span>
                <p>
                  Si operas durante la mañana europea o en la madrugada de América Latina, <strong>Estrategia 1 (Londres)</strong> es ideal. Si tienes disponibilidad durante la mañana de América (09:30 AM EST en adelante), <strong>Estrategia 2 (NY ORB)</strong> es ideal para aprovechar la volatilidad de Wall Street.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: INSTALACIÓN PASO A PASO */}
          {activeTopic === 'installation' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-amber-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Cómo instalar el robot en MetaTrader 5 en 3 minutos
                </h4>
                <ol className="list-decimal pl-5 space-y-2.5 text-xs text-slate-300">
                  <li>
                    <strong>Descarga el archivo del robot:</strong> Haz clic en el botón <strong className="text-amber-400">"Descargar Bot EA"</strong> en la esquina superior de la web y descarga <code className="text-emerald-400 font-mono">XAUUSD_GoldKiller_V1_Oficial.mq5</code> o <code className="text-cyan-400 font-mono">XAUUSD_NY_ORB_Oficial.mq5</code>.
                  </li>
                  <li>
                    <strong>Abre tu carpeta de MetaTrader 5:</strong> En el menú superior de MetaTrader ve a <code className="text-slate-200">Archivo &gt; Abrir Carpeta de Datos</code>. Luego entra a <code className="text-amber-300">MQL5 &gt; Experts</code> y pega el archivo descargado.
                  </li>
                  <li>
                    <strong>Compila el archivo:</strong> Abre el MetaEditor presionando <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">F4</kbd>, busca el archivo en la lista izquierda y presiona <kbd className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded">F7</kbd> para compilar (debe decir 0 errores).
                  </li>
                  <li>
                    <strong>Arrastra al gráfico:</strong> En MetaTrader 5 abre un gráfico de <strong>XAU/USD</strong> en temporalidad <strong>M15 (15 minutos)</strong>, arrastra el robot al gráfico y asegúrate de marcar la casilla <strong>"Permitir Trading Algorítmico"</strong>.
                  </li>
                </ol>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300">¿Listo para descargar el código del robot?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCodeModal();
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Abrir Descargador de Bots</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: PARÁMETROS Y HORARIOS */}
          {activeTopic === 'parameters' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-amber-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Parámetros Clave Explicados en Lenguaje Sencillo
                </h4>
                <div className="divide-y divide-slate-800/80 text-xs">
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-mono text-emerald-400 font-bold">InpRiskPercent = 1.0</span>
                    <span className="text-slate-300">Porcentaje de tu cuenta que arriesgas en cada trade (ej. $100 en cuenta de $10,000).</span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-mono text-emerald-400 font-bold">InpRRRatio = 2.0</span>
                    <span className="text-slate-300">Ratio Riesgo/Beneficio: busca ganar el doble de lo arriesgado (1:2).</span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-mono text-emerald-400 font-bold">InpMaxDailySL = 2</span>
                    <span className="text-slate-300">Circuit Breaker: si ocurren 2 pérdidas consecutivas en el día, el bot frena para proteger tu balance.</span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-mono text-emerald-400 font-bold">InpBrokerGmtOffset = 3</span>
                    <span className="text-slate-300">Desfase horario del servidor de tu broker respecto a UTC (habitualmente +3 en verano).</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GESTIÓN DE RIESGO */}
          {activeTopic === 'risk' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-amber-400 font-mono font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Las 3 Reglas de Oro para Preservar tu Capital
                </h4>
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400 block mb-0.5">1. Nunca arriesgues más del 1% por operación:</strong>
                    Si tienes una cuenta de $10,000 USD, tu Stop Loss no debe superar los $100 USD. El algoritmo calcula automáticamente el lotaje exacto para ti.
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">2. No toques la operación abierta manualmente:</strong>
                    La mayor causa de pérdidas en traders principiantes es cerrar operaciones antes de tiempo por miedo. Deja que el algoritmo alcance el Take Profit 1:2 o el Breakeven.
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <strong className="text-rose-400 block mb-0.5">3. Evita operar en noticias de alto impacto (CPI / NFP):</strong>
                    Usa el "Escudo de Noticias" de la plataforma para verificar si hay anuncios de la Reserva Federal o tasas de interés hoy.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition"
          >
            Entendido, Cerrar Manual
          </button>
        </div>
      </div>
    </div>
  );
};
