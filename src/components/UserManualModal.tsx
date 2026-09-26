import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Terminal,
  Cpu,
  Sliders,
  PlayCircle,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Laptop,
  Layers,
  Clock,
  ShieldCheck,
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
    'overview' | 'installation' | 'parameters' | 'automation' | 'backtesting' | 'downloads'
  >('overview');

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
                Manual de Uso y Preguntas Frecuentes (FAQ)
              </h3>
              <p className="text-xs text-slate-400">
                Guía completa paso a paso: instalación, operativa automática, parámetros y backtesting
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
            { id: 'overview', label: '1. ¿Qué es y Lenguajes?' },
            { id: 'parameters', label: '2. Cambiar Parámetros' },
            { id: 'automation', label: '3. Operar Automático en Broker' },
            { id: 'backtesting', label: '4. Backtesting Meses Pasados' },
            { id: 'downloads', label: '5. Descargas MQ5 y Pine' },
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
          {/* TAB 1: OVERVIEW & TECH STACK */}
          {activeTopic === 'overview' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-amber-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Laptop className="w-4 h-4" /> ¿Es una aplicación web y en qué lenguaje fue desarrollada?
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  <strong>Sí, esto que estás viendo es una Aplicación Web Full-Stack interactiva.</strong> No requiere que instales ningún programa en tu computadora o teléfono móvil para usarla: funciona directamente en tu navegador web.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-xs">
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                    <span className="text-amber-300 font-bold block mb-1">Frontend & Gráficos:</span>
                    <span className="text-slate-300">
                      React 18 + TypeScript + Tailwind CSS + Lucide Icons. Gráfico de velas de 15 minutos en lienzo SVG interactivo de alta resolución.
                    </span>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                    <span className="text-indigo-300 font-bold block mb-1">Backend & Auditoría IA:</span>
                    <span className="text-slate-300">
                      Node.js / Express con integración de <strong>Google Gemini 3.8</strong> para evaluación de liquidez institucional y cálculo cuantitativo en tiempo real.
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-blue-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> ¿Cómo instalo el bot si quiero ejecutarlo en mi máquina?
                </h4>
                <p className="text-slate-300">
                  El sistema incluye <strong>3 implementaciones completas</strong> listas para usar según tu preferencia:
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li>
                    <strong>MetaTrader 5 (MQL5)</strong>: Es la opción más fácil y recomendada para operar automáticamente en Forex/CFDs. Solo descargas el archivo <code className="text-emerald-400 font-mono">XAUUSD_LondonBreakout.mq5</code>, lo pegas en la carpeta de Asesores Expertos de MT5 y listo.
                  </li>
                  <li>
                    <strong>TradingView (Pine Script v6)</strong>: Para analizar, probar y recibir alertas visuales directamente en tu cuenta de TradingView. No requiere instalar nada en la PC, se ejecuta en la nube de TradingView.
                  </li>
                  <li>
                    <strong>Python 3 Modular</strong>: Para desarrolladores cuantitativos que desean correr el bot en un servidor VPS con <code className="text-amber-400 font-mono">python main.py</code> conectándose a la API de MetaTrader 5 o de brokers como OANDA.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETERS */}
          {activeTopic === 'parameters' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-amber-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4" /> ¿Cómo cambio parámetros como el límite de operaciones diarias y el riesgo?
                </h4>
                <p className="text-slate-300">
                  Puedes cambiar todos los parámetros clave tanto <strong>directamente en esta web</strong> como en los códigos descargables:
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                    <span className="text-amber-300 font-bold font-mono block mb-1">
                      1. En esta Web (En tiempo real):
                    </span>
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      <li>
                        <strong>Regla 6 (Disciplina Diaria):</strong> En la tarjeta de Reglas Mecánicas abajo en el panel principal, usa el selector para cambiar entre <em>"Máx 1 Trade / Día"</em>, <em>"Máx 2 Trades / Día"</em> o <em>"Sin Límite"</em>.
                      </li>
                      <li>
                        <strong>Regla 4 (Stop Loss y R:R):</strong> Cambia el método de SL entre el <em>50% del rango asiático</em> (recomendado), <em>lado opuesto</em> o <em>EMA 20</em>. También puedes seleccionar el ratio Take Profit (1:1.5, 1:2 o 1:3).
                      </li>
                      <li>
                        <strong>Regla 5 (Riesgo y Capital):</strong> Ajusta el porcentaje de riesgo por operación (0.25%, 0.5%, 1.0%) y el balance de tu cuenta para ver el lotaje exacto en onzas.
                      </li>
                    </ul>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                    <span className="text-blue-300 font-bold font-mono block mb-1">
                      2. En MetaTrader 5 (.mq5):
                    </span>
                    <p className="text-slate-300">
                      Al arrastrar el Asesor Experto al gráfico de XAUUSD M15, ve a la pestaña <strong>"Parámetros de Entrada"</strong> (Inputs). Allí puedes editar:
                    </p>
                    <div className="mt-1 bg-slate-900 p-2 rounded text-slate-300 font-mono text-xs">
                      <code>InpRiskPercent = 0.5; // Riesgo por trade en %</code><br/>
                      <code>InpRRRatio = 2.0; // Ratio Take Profit (1:2)</code><br/>
                      <code>InpUse50Percent = true; // SL al 50% de Asia</code><br/>
                      <code>InpStartLondon = 8; // Hora UTC inicio Londres</code>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                    <span className="text-emerald-300 font-bold font-mono block mb-1">
                      3. En Python (main.py):
                    </span>
                    <p className="text-slate-300">
                      En las primeras líneas de <code className="text-amber-300 font-mono">main.py</code> simplemente modificas las constantes:
                    </p>
                    <div className="mt-1 bg-slate-900 p-2 rounded text-slate-300 font-mono text-xs">
                      <code>MAX_DAILY_TRADES = 1 # Cambia a 2 o None</code><br/>
                      <code>RISK_PERCENT = 0.5 # Porcentaje de riesgo</code><br/>
                      <code>RR_RATIO = 2.0 # Ratio beneficio</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOMATION */}
          {activeTopic === 'automation' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-emerald-400 font-mono font-bold text-sm flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> ¿Puedo conectarlo a una cuenta para que opere automáticamente o solo analiza y tira alertas?
                </h4>
                <p className="text-slate-300">
                  <strong>¡Ambas cosas!</strong> Tienes las dos modalidades disponibles según cómo quieras usarlo:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-mono font-bold">
                      <Clock className="w-4 h-4 text-amber-400" /> Modalidad 1: Asistente & Alertas
                    </div>
                    <p className="text-slate-300 text-xs">
                      Esta <strong>plataforma web</strong> analiza el mercado en vivo, calcula las líneas del rango de Asia, audita con IA Gemini y te envía:
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                      <li><strong>Alertas sonoras</strong> en tu navegador.</li>
                      <li><strong>Notificaciones push</strong> en tu pantalla de inicio o escritorio al activarlas con la campana.</li>
                      <li>Calcula los lotes exactos para que tú abras la orden manualmente en tu broker con 1 clic.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-300 font-mono font-bold">
                      <Cpu className="w-4 h-4 text-emerald-400" /> Modalidad 2: 100% Automático en Broker
                    </div>
                    <p className="text-slate-300 text-xs">
                      Si quieres que <strong>abra y cierre compras y ventas solo en tu cuenta real o demo</strong> (mientras duermes o trabajas):
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                      <li>
                        <strong>Con MetaTrader 5:</strong> Usas el archivo descargable <code className="text-emerald-400 font-mono">.mq5</code>. Activas el botón <em>"Algo Trading"</em> en MT5 y el robot abre la orden al mercado con Stop Loss y Take Profit exactos.
                      </li>
                      <li>
                        <strong>Con Python:</strong> El script <code className="text-amber-400 font-mono">main.py</code> orquesta la orden a través del módulo <code className="text-blue-400 font-mono">order_executor.py</code> conectándose a MT5 u OANDA.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 text-amber-200/90 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block text-amber-300 font-mono">Recomendación Institucional:</strong>
                  <span>
                    Prueba siempre el robot primero en una <strong>cuenta DEMO</strong> durante al menos 2 semanas para familiarizarte con las aperturas de Londres (08:00 UTC) y verificar los spreads del oro en tu broker antes de arriesgar dinero real.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BACKTESTING */}
          {activeTopic === 'backtesting' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-indigo-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" /> ¿Cómo puedo testearlo con datos de meses pasados y en varias temporalidades?
                </h4>
                <p className="text-slate-300">
                  Para auditar y validar la expectativa matemática de la estrategia en el pasado dispones de 3 métodos muy sencillos:
                </p>

                <div className="space-y-3 pt-1">
                  {/* Option 1 */}
                  <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="text-amber-300 font-bold font-mono text-xs flex items-center justify-between">
                      <span>Método A: En TradingView con Pine Script v6 (El más rápido y visual)</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Recomendado</span>
                    </h5>
                    <ol className="list-decimal pl-5 mt-2 space-y-1 text-slate-300 text-xs">
                      <li>Abre TradingView y selecciona el gráfico de <strong>XAUUSD en M15 (15 minutos)</strong>.</li>
                      <li>En la parte inferior de TradingView, haz clic en la pestaña <strong>"Pine Editor" (Editor de Pine)</strong>.</li>
                      <li>Pega el código de TradingView que descargas de esta web y haz clic en <strong>"Añadir al gráfico"</strong>.</li>
                      <li>
                        Inmediatamente, la pestaña inferior <strong>"Strategy Tester" (Probador de Estrategias)</strong> calculará automáticamente las ganancias, porcentaje de aciertos, drawdown y todas las operaciones históricas de meses y años pasados.
                      </li>
                      <li>
                        ¿Quieres probar otras temporalidades? Solo cambia a <strong>5m o 30m</strong> en TradingView y verás cómo reacciona la estrategia.
                      </li>
                    </ol>
                  </div>

                  {/* Option 2 */}
                  <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="text-emerald-300 font-bold font-mono text-xs">
                      Método B: En MetaTrader 5 con el Probador de Estrategias (Ticks Reales)
                    </h5>
                    <ol className="list-decimal pl-5 mt-2 space-y-1 text-slate-300 text-xs">
                      <li>En MetaTrader 5, presiona las teclas <code className="text-white bg-slate-800 px-1 rounded">Ctrl + R</code> para abrir la ventana del <strong>Strategy Tester</strong>.</li>
                      <li>Selecciona el Asesor Experto <code className="text-emerald-400 font-mono">XAUUSD_LondonBreakout</code>.</li>
                      <li>Símbolo: <strong>XAUUSD</strong> | Temporalidad: <strong>M15</strong>.</li>
                      <li>Rango de fechas: Elige por ejemplo <em>"Último año"</em> o fechas personalizadas.</li>
                      <li>Modelo de ejecución: <em>"Cada tick basado en ticks reales"</em> para máxima precisión institucional.</li>
                      <li>Haz clic en <strong>Iniciar</strong>. Obtendrás el gráfico de crecimiento de la cuenta (Equity Curve), Profit Factor y reporte completo.</li>
                    </ol>
                  </div>

                  {/* Option 3 */}
                  <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                    <h5 className="text-blue-300 font-bold font-mono text-xs">
                      Método C: En esta misma Web (Auditoría Día a Día)
                    </h5>
                    <p className="text-slate-300 text-xs mt-1">
                      En la barra superior de <strong>"Sesiones Históricas"</strong> de esta web, puedes hacer clic en cualquiera de los días (Lunes a Viernes) para auditar cómo se formó la caja asiática, dónde rompió la vela M15 y si se alcanzó el Take Profit (+2R) o Stop Loss (-1R).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DOWNLOADS & INSTRUCTIONS */}
          {activeTopic === 'downloads' && (
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-amber-400 font-mono font-bold text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> ¿Dónde descargo los módulos para .mq5, TradingView y Python?
                </h4>
                <p className="text-slate-300">
                  Todos los archivos están generados, validados y listos para descargar con un solo clic dentro de esta plataforma:
                </p>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white block">Abre el Exportador de Código</span>
                    <span className="text-xs text-slate-400">
                      Haz clic en el botón de abajo o en el icono <code className="text-blue-400 font-mono">Bot Modular (&lt;/&gt;)</code> en la barra superior.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCodeModal();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-2 shadow-md transition"
                  >
                    <Download className="w-4 h-4" /> Abrir Ventana de Descargas
                  </button>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                    <strong className="text-emerald-400 font-mono block mb-1">
                      Instalación de MetaTrader 5 (.mq5):
                    </strong>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                      <li>En la ventana de descargas, selecciona la pestaña <strong>MetaTrader 5 (.mq5)</strong> y presiona <strong>Descargar</strong>.</li>
                      <li>Abre MetaTrader 5, ve al menú: <code className="text-white">Archivo &gt; Abrir carpeta de datos</code>.</li>
                      <li>Entra en la carpeta <code className="text-white">MQL5 &gt; Experts</code> y pega el archivo descargado.</li>
                      <li>En MT5, ve a la ventana "Navegador" lateral, haz clic derecho en "Asesores Expertos" y selecciona <strong>"Actualizar"</strong>.</li>
                      <li>Arrastra el robot a tu gráfico de <strong>XAUUSD M15</strong> y ¡listo!</li>
                    </ol>
                  </div>

                  <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                    <strong className="text-amber-400 font-mono block mb-1">
                      Instalación en TradingView (Pine Script v6):
                    </strong>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                      <li>Selecciona la pestaña <strong>TradingView (Pine v6)</strong> y haz clic en <strong>Copiar</strong>.</li>
                      <li>En TradingView, abre el <strong>Editor de Pine</strong> (abajo), borra lo que haya y pega el código.</li>
                      <li>Haz clic en <strong>Guardar</strong> y luego en <strong>Añadir al gráfico</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Reglas 100% mecánicas auditadas • Oro Spot (XAU/USD)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCodeModal();
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-mono font-bold transition"
            >
              Descargar Archivos
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono transition"
            >
              Cerrar Manual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
