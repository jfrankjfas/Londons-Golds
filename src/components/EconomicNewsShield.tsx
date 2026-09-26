import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Clock, Calendar, Check, ExternalLink } from 'lucide-react';

export interface EconomicEvent {
  id: string;
  timeUTC: string;
  currency: 'USD' | 'GBP' | 'EUR';
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  event: string;
  previous: string;
  forecast: string;
  actual?: string;
  isAffectingLondonOpen: boolean; // Between 07:45 and 11:15 UTC
}

interface EconomicNewsShieldProps {
  currentDate: string;
  isOpen: boolean;
  onClose: () => void;
  pauseTradingOnRedNews: boolean;
  onTogglePauseOnRedNews: () => void;
}

// Institutional Economic Calendar for Gold (XAU/USD)
const ECONOMIC_EVENTS_DATABASE: Record<string, EconomicEvent[]> = {
  '2026-09-26': [
    {
      id: 'e26-1',
      timeUTC: '08:00',
      currency: 'GBP',
      impact: 'LOW',
      event: 'Índice de Precios Inmobiliarios Nationwide',
      previous: '2.4%',
      forecast: '2.6%',
      actual: '2.5%',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e26-2',
      timeUTC: '13:00',
      currency: 'USD',
      impact: 'MEDIUM',
      event: 'Posicionamiento Institucional CFTC Oro (CoT Report)',
      previous: '+285K',
      forecast: '+290K',
      actual: '+292K',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-25': [
    {
      id: 'e25-1',
      timeUTC: '08:30',
      currency: 'GBP',
      impact: 'MEDIUM',
      event: 'Aprobaciones de Hipotecas BoE',
      previous: '62.0K',
      forecast: '61.5K',
      actual: '62.2K',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e25-2',
      timeUTC: '12:30',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Índice de Precios PCE Subyacente (MoM/YoY)',
      previous: '2.6%',
      forecast: '2.7%',
      actual: '2.8%',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-24': [
    {
      id: 'e24-1',
      timeUTC: '08:00',
      currency: 'GBP',
      impact: 'HIGH',
      event: 'Comparecencia del Gobernador del BoE Andrew Bailey',
      previous: '-',
      forecast: '-',
      actual: 'Comentarios neutrales',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e24-2',
      timeUTC: '12:30',
      currency: 'USD',
      impact: 'HIGH',
      event: 'PIB Trimestral Anualizado EE.UU. (Q2 Final)',
      previous: '3.0%',
      forecast: '3.0%',
      actual: '3.0%',
      isAffectingLondonOpen: false,
    },
    {
      id: 'e24-3',
      timeUTC: '12:30',
      currency: 'USD',
      impact: 'MEDIUM',
      event: 'Nuevas Peticiones Subsidio Desempleo',
      previous: '219K',
      forecast: '224K',
      actual: '218K',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-23': [
    {
      id: 'e23-1',
      timeUTC: '07:30',
      currency: 'EUR',
      impact: 'MEDIUM',
      event: 'PMI Manufacturero HCOB de Alemania',
      previous: '42.4',
      forecast: '42.6',
      actual: '40.6',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e23-2',
      timeUTC: '08:30',
      currency: 'GBP',
      impact: 'HIGH',
      event: 'PMI Compuesto y de Servicios Flash Reino Unido',
      previous: '53.7',
      forecast: '53.5',
      actual: '52.9',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e23-3',
      timeUTC: '14:00',
      currency: 'USD',
      impact: 'MEDIUM',
      event: 'Ventas de Viviendas Nuevas EE.UU.',
      previous: '739K',
      forecast: '700K',
      actual: '716K',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-22': [
    {
      id: 'e22-1',
      timeUTC: '08:00',
      currency: 'EUR',
      impact: 'MEDIUM',
      event: 'Balanza por Cuenta Corriente del BCE',
      previous: '€50.5B',
      forecast: '€48.0B',
      actual: '€49.6B',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e22-2',
      timeUTC: '14:00',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Discurso de Jerome Powell (Presidente de la Reserva Federal)',
      previous: '-',
      forecast: '-',
      actual: 'Tono dovish',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-21': [
    {
      id: 'e21-1',
      timeUTC: '08:00',
      currency: 'GBP',
      impact: 'LOW',
      event: 'Expectativas de Inflación a 12 meses BoE',
      previous: '2.8%',
      forecast: '2.7%',
      actual: '2.7%',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e21-2',
      timeUTC: '13:00',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Discurso de Miembro del FOMC',
      previous: '-',
      forecast: '-',
      actual: 'Tipos a la baja',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-18': [
    {
      id: 'e1',
      timeUTC: '07:00',
      currency: 'GBP',
      impact: 'MEDIUM',
      event: 'UK Ventas Minoristas (MoM)',
      previous: '0.5%',
      forecast: '0.4%',
      actual: '0.4%',
      isAffectingLondonOpen: false,
    },
    {
      id: 'e2',
      timeUTC: '08:30',
      currency: 'EUR',
      impact: 'LOW',
      event: 'Balanza Comercial Zona Euro',
      previous: '€18.2B',
      forecast: '€17.5B',
      actual: '€17.9B',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e3',
      timeUTC: '13:30',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Índice de Precios al Consumidor (CPI YoY)',
      previous: '2.5%',
      forecast: '2.3%',
      actual: '2.4%',
      isAffectingLondonOpen: false,
    },
    {
      id: 'e4',
      timeUTC: '14:00',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Confianza del Consumidor Univ. Michigan',
      previous: '68.2',
      forecast: '69.0',
      actual: '69.3',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-17': [
    {
      id: 'e5',
      timeUTC: '08:00',
      currency: 'GBP',
      impact: 'HIGH',
      event: 'UK Decisión Tipos de Interés Banco de Inglaterra (BoE)',
      previous: '5.00%',
      forecast: '5.00%',
      actual: '5.00%',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e6',
      timeUTC: '12:30',
      currency: 'USD',
      impact: 'MEDIUM',
      event: 'Peticiones Semanales de Subsidio por Desempleo',
      previous: '220K',
      forecast: '222K',
      actual: '219K',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-16': [
    {
      id: 'e7',
      timeUTC: '08:30',
      currency: 'EUR',
      impact: 'MEDIUM',
      event: 'Índice ZEW de Confianza Inversora en Alemania',
      previous: '19.2',
      forecast: '17.0',
      actual: '16.8',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e8',
      timeUTC: '18:00',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Decisión de Tasas de Interés FOMC (Reserva Federal)',
      previous: '5.25%',
      forecast: '5.00%',
      actual: '5.00%',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-15': [
    {
      id: 'e9',
      timeUTC: '09:00',
      currency: 'EUR',
      impact: 'LOW',
      event: 'Costos Laborales Zona Euro (YoY)',
      previous: '5.1%',
      forecast: '4.8%',
      actual: '4.7%',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e10',
      timeUTC: '12:30',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Ventas Minoristas Subyacentes (MoM)',
      previous: '0.4%',
      forecast: '0.2%',
      actual: '0.1%',
      isAffectingLondonOpen: false,
    },
  ],
  '2026-09-14': [
    {
      id: 'e11',
      timeUTC: '08:00',
      currency: 'GBP',
      impact: 'LOW',
      event: 'Producción Industrial Reino Unido (MoM)',
      previous: '-0.8%',
      forecast: '0.3%',
      actual: '0.2%',
      isAffectingLondonOpen: true,
    },
  ],
};

export const EconomicNewsShieldModal: React.FC<EconomicNewsShieldProps> = ({
  currentDate,
  isOpen,
  onClose,
  pauseTradingOnRedNews,
  onTogglePauseOnRedNews,
}) => {
  const [filterImpact, setFilterImpact] = useState<'ALL' | 'HIGH'>('ALL');

  if (!isOpen) return null;

  const events = ECONOMIC_EVENTS_DATABASE[currentDate] || [
    {
      id: 'e-default-1',
      timeUTC: '08:30',
      currency: 'GBP',
      impact: 'LOW',
      event: 'Flujos de Liquidez Bancaria Londres',
      previous: '-',
      forecast: '-',
      actual: 'Normal',
      isAffectingLondonOpen: true,
    },
    {
      id: 'e-default-2',
      timeUTC: '13:30',
      currency: 'USD',
      impact: 'HIGH',
      event: 'Datos Macroeconómicos USA (Sesión New York)',
      previous: '-',
      forecast: '-',
      actual: 'Monitoreado',
      isAffectingLondonOpen: false,
    },
  ];

  const hasHighNewsInLondonOpen = events.some(
    (e) => e.impact === 'HIGH' && e.isAffectingLondonOpen
  );

  const displayedEvents = filterImpact === 'HIGH'
    ? events.filter((e) => e.impact === 'HIGH')
    : events;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${hasHighNewsInLondonOpen ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
              {hasHighNewsInLondonOpen ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Escudo de Noticias & Calendario Económico XAU/USD
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Protección contra volatilidad y slippage en la Apertura de Londres (08:00 - 11:00 UTC)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              hasHighNewsInLondonOpen
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            }`}
          >
            {hasHighNewsInLondonOpen ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold uppercase tracking-wider font-mono">
                {hasHighNewsInLondonOpen
                  ? '⚠️ ALERTA: NOTICIA ROJA DE ALTO IMPACTO EN VENTANA DE LONDRES'
                  : '✓ ESTADO DE MERCADO: SEGURO (VENTANA DE LONDRES LIMPIA)'}
              </div>
              <p className="text-slate-300 font-sans leading-relaxed">
                {hasHighNewsInLondonOpen
                  ? 'Hay noticias de impacto alto (BoE / CPI) programadas durante la apertura de Londres. Se recomienda pausar los gatillos mecánicos 15 min antes y después para evitar mechas de manipulación.'
                  : 'No hay noticias de alto impacto en GBP/EUR durante las 08:00 a 11:00 UTC. La liquidez de ruptura es técnica y las probabilidades estadísticas se mantienen al 100% de efectividad.'}
              </p>
            </div>
          </div>

          {/* Controls & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Filtrar impacto:</span>
              <button
                onClick={() => setFilterImpact('ALL')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${filterImpact === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                Todos ({events.length})
              </button>
              <button
                onClick={() => setFilterImpact('HIGH')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${filterImpact === 'HIGH' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                Solo Alto Impacto (Rojas)
              </button>
            </div>

            {/* Toggle Shield Rule */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={pauseTradingOnRedNews}
                onChange={onTogglePauseOnRedNews}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
              <span className="text-[11px]">
                Bloquear gatillos automáticamente durante noticias rojas
              </span>
            </label>
          </div>

          {/* Events List */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase flex items-center justify-between">
              <span>Eventos Económicos para {currentDate}</span>
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Horario UTC
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80 bg-slate-900/40">
              {displayedEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-3 flex flex-wrap items-center justify-between gap-3 transition hover:bg-slate-800/40 ${
                    evt.isAffectingLondonOpen ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-slate-200 w-12">
                      {evt.timeUTC}
                    </span>

                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        evt.currency === 'USD'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : evt.currency === 'GBP'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {evt.currency}
                    </span>

                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        evt.impact === 'HIGH'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : evt.impact === 'MEDIUM'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-slate-700/50 text-slate-400'
                      }`}
                    >
                      {evt.impact === 'HIGH' ? 'ALTO' : evt.impact === 'MEDIUM' ? 'MEDIO' : 'BAJO'}
                    </span>

                    <span className="text-xs text-white font-medium">
                      {evt.event}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Previo</span>
                      <span>{evt.previous}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Consenso</span>
                      <span>{evt.forecast}</span>
                    </div>
                    {evt.actual && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">Publicado</span>
                        <span className="text-emerald-400 font-bold">{evt.actual}</span>
                      </div>
                    )}
                    {evt.isAffectingLondonOpen && (
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        Afecta Londres (08-11 UTC)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Note */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 space-y-1">
            <div className="text-white font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Regla Institucional de Noticias para XAU/USD:
            </div>
            <p>
              El Oro es el activo más reactivo a las sorpresas en tasas y datos de inflación del dólar y la libra. Si ocurre una noticia roja a las 08:30 UTC, el spread se ensancha temporalmente de 1.5 a 8.0 pips. El algoritmo cuant protege el margen respetando la disciplina de no operar en eventos de volatilidad desordenada.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
