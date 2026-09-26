import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, Zap, Globe2 } from 'lucide-react';

interface SessionClockProps {
  currentSimulatedTime?: string; // Optional if simulating historical/fast-forward
  isLiveMode: boolean;
}

export const SessionClock: React.FC<SessionClockProps> = ({ currentSimulatedTime, isLiveMode }) => {
  const [utcTime, setUtcTime] = useState<Date>(new Date());

  useEffect(() => {
    if (!isLiveMode && currentSimulatedTime) {
      setUtcTime(new Date(currentSimulatedTime.replace(' ', 'T') + ':00Z'));
      return;
    }

    const timer = setInterval(() => {
      setUtcTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [isLiveMode, currentSimulatedTime]);

  const h = utcTime.getUTCHours();
  const m = utcTime.getUTCMinutes();
  const s = utcTime.getUTCSeconds();

  const formattedUTC = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} UTC`;

  // Session detection
  let sessionName = 'FUERA DE VENTANA';
  let sessionBadgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
  let sessionDetail = 'Esperando apertura de rango asiático';
  let nextMilestone = 'Apertura Rango Asiático (00:00 UTC)';
  let secondsToNext = 0;
  const currentTotalSeconds = h * 3600 + m * 60 + s;

  if (h >= 0 && h < 7) {
    sessionName = 'SESIÓN ASIÁTICA';
    sessionBadgeColor = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    sessionDetail = 'Fijando High y Low del Rango Asiático (00:00 - 07:00 UTC)';
    nextMilestone = 'Cierre Rango Asiático (07:00 UTC)';
    secondsToNext = 7 * 3600 - currentTotalSeconds;
  } else if (h === 7) {
    sessionName = 'PRE-APERTURA LONDRES';
    sessionBadgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    sessionDetail = 'Rango Asiático Confirmado • Monitoreando primeras órdenes';
    nextMilestone = 'Apertura de Londres (08:00 UTC)';
    secondsToNext = 8 * 3600 - currentTotalSeconds;
  } else if (h >= 8 && h <= 10) {
    sessionName = 'VENTANA OPERATIVA LONDRES';
    sessionBadgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-1 ring-emerald-500/40';
    sessionDetail = 'GATILLO ACTIVO: Cierre de vela M15 con cuerpo fuera del rango';
    nextMilestone = 'Fin de Ventana Operativa (11:00 UTC)';
    secondsToNext = 11 * 3600 - currentTotalSeconds;
  } else if (h >= 11 && h < 13) {
    sessionName = 'MEDIODÍA LONDRES';
    sessionBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
    sessionDetail = 'Gestión de posición abierta o sesión cerrada por el día';
    nextMilestone = 'Apertura Nueva York (13:00 UTC)';
    secondsToNext = 13 * 3600 - currentTotalSeconds;
  } else if (h >= 13 && h <= 16) {
    sessionName = 'SOLAPAMIENTO LONDRES / NY';
    sessionBadgeColor = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    sessionDetail = 'Pico de liquidez institucional • London Gold Fix (15:00 UTC)';
    nextMilestone = 'Cierre de Londres (16:30 UTC)';
    secondsToNext = 16.5 * 3600 - currentTotalSeconds;
  } else {
    secondsToNext = 24 * 3600 - currentTotalSeconds;
  }

  if (secondsToNext < 0) secondsToNext += 24 * 3600;

  const countdownHours = Math.floor(secondsToNext / 3600);
  const countdownMins = Math.floor((secondsToNext % 3600) / 60);
  const countdownSecs = secondsToNext % 60;
  const countdownStr = `${countdownHours}h ${countdownMins}m ${countdownSecs}s`;

  return (
    <div id="session-clock-card" className="bg-[#0E131F] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* UTC Clock & Session status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shadow-inner">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-white">
                {formattedUTC}
              </span>
              <span
                className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${sessionBadgeColor}`}
              >
                {sessionName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-slate-500" />
              {sessionDetail}
            </p>
          </div>
        </div>

        {/* Countdown & Next Event */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800/80 rounded-lg px-3 py-2">
          <div className="flex flex-col text-right sm:text-left">
            <span className="text-[10px] uppercase font-mono text-slate-400">Próximo Hito</span>
            <span className="text-xs font-semibold text-slate-200">{nextMilestone}</span>
          </div>
          <div className="h-7 w-[1px] bg-slate-800 hidden sm:block" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono text-amber-400/80">Cuenta Regresiva</span>
            <span className="text-xs font-mono font-bold text-amber-300">{countdownStr}</span>
          </div>
        </div>
      </div>

      {/* Visual Timeline Bar (00:00 to 24:00 UTC) */}
      <div className="mt-3 pt-3 border-t border-slate-800/60">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
          <span className="text-blue-400">00:00 Asia (7h)</span>
          <span className="text-amber-400">08:00 Londres Open</span>
          <span className="text-purple-400">13:00 NY Overlap</span>
          <span className="text-slate-500">22:00 Cierre</span>
        </div>
        <div className="relative h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          {/* Asia Range zone (0 - 7/24 = 29.1%) */}
          <div className="absolute top-0 bottom-0 left-0 w-[29.1%] bg-blue-500/30 border-r border-blue-500/50" title="Rango Asiático" />
          {/* Pre-London (7 - 8/24 = 4.1%) */}
          <div className="absolute top-0 bottom-0 left-[29.1%] w-[4.1%] bg-amber-500/20 border-r border-amber-500/40" title="Pre-Londres" />
          {/* London Breakout Window (8 - 11/24 = 12.5%) */}
          <div className="absolute top-0 bottom-0 left-[33.3%] w-[12.5%] bg-emerald-500/40 border-r border-emerald-500/60 animate-pulse" title="Ventana de Breakout Londres" />
          {/* London / NY Overlap (13 - 17/24 = 16.6%) */}
          <div className="absolute top-0 bottom-0 left-[54.1%] w-[16.6%] bg-purple-500/30" title="Sesión NY Overlap" />

          {/* Current Time Indicator needle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-md shadow-amber-400/50 z-10 -ml-0.5"
            style={{ left: `${(currentTotalSeconds / (24 * 3600)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
