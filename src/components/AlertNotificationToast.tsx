import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, X, Flame } from 'lucide-react';
import { TradeAlert } from '../types/trading.ts';

interface AlertNotificationToastProps {
  alerts: TradeAlert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export const AlertNotificationToast: React.FC<AlertNotificationToastProps> = ({
  alerts,
  onDismiss,
  onClearAll,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {alerts.slice(-3).map((alert) => (
        <div
          key={alert.id}
          className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md animate-slideUp transition-all ${
            alert.type === 'BREAKOUT_TRIGGERED'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 ring-1 ring-emerald-500/30'
              : alert.type === 'TP_HIT'
              ? 'bg-amber-950/90 border-amber-500/50 text-amber-100 ring-1 ring-amber-500/30'
              : alert.type === 'SL_HIT'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-100'
              : 'bg-slate-900/95 border-slate-700 text-slate-100'
          }`}
        >
          <div className="mt-0.5 flex-shrink-0">
            {alert.type === 'BREAKOUT_TRIGGERED' ? (
              <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
            ) : alert.type === 'TP_HIT' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : alert.type === 'SL_HIT' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <Bell className="w-5 h-5 text-blue-400" />
            )}
          </div>

          <div className="flex-1 font-sans">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono tracking-tight text-white">
                {alert.title}
              </h4>
              <span className="text-[10px] font-mono text-slate-400">{alert.timeStr}</span>
            </div>
            <p className="text-xs mt-1 text-slate-200 leading-snug">{alert.message}</p>
          </div>

          <button
            onClick={() => onDismiss(alert.id)}
            className="text-slate-400 hover:text-white p-1 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
