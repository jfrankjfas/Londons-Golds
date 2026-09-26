import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Shield, Send } from 'lucide-react';
import { TradeSignal, StrategyParameters } from '../types/trading.ts';

interface ExecutionOrderTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: TradeSignal | null;
  params: StrategyParameters;
}

export const ExecutionOrderTicketModal: React.FC<ExecutionOrderTicketModalProps> = ({
  isOpen,
  onClose,
  trade,
  params,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLong = trade ? trade.type === 'LONG' : true;
  const entry = trade ? trade.entryPrice : 4353.90;
  const sl = trade ? trade.slPrice : 4348.05;
  const tp = trade ? trade.tpPrice : 4365.60;
  const lots = trade ? trade.lotSize : 0.23;
  const riskUSD = trade ? trade.riskAmountUSD : 50.00;
  const rewardUSD = trade ? trade.projectedProfitUSD : 100.00;

  const beTrigger = isLong
    ? entry + Math.abs(entry - sl)
    : entry - Math.abs(entry - sl);

  // Formats for different platforms
  const mtQuickText = `XAUUSD ${isLong ? 'BUY' : 'SELL'} ${lots} @ ${entry.toFixed(2)} | SL: ${sl.toFixed(2)} | TP: ${tp.toFixed(2)} | BE_Trigger: ${beTrigger.toFixed(2)}`;

  const jsonWebhookPayload = JSON.stringify(
    {
      ticker: 'XAUUSD',
      strategy: 'London_Open_Breakout_M15',
      action: isLong ? 'BUY' : 'SELL',
      order_type: 'STOP_OR_MARKET',
      lots: lots,
      entry_price: entry,
      stop_loss: sl,
      take_profit: tp,
      breakeven_level: beTrigger,
      max_risk_usd: riskUSD,
      risk_percent: params.riskPercent,
      account_balance: params.accountBalance,
    },
    null,
    2
  );

  const mql5ScriptSnippet = `// MQL5 Execution Script for MetaTrader 5
void OnStart() {
    MqlTradeRequest request = {};
    MqlTradeResult  result  = {};
    
    request.action       = TRADE_ACTION_DEAL;
    request.symbol       = "XAUUSD";
    request.volume       = ${lots};
    request.type         = ${isLong ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL'};
    request.price        = ${entry.toFixed(2)};
    request.sl           = ${sl.toFixed(2)};
    request.tp           = ${tp.toFixed(2)};
    request.deviation    = 15;
    request.magic        = 88402;
    request.comment      = "LDN_BRK_M15";
    
    if(!OrderSend(request, result)) {
        Print("Error enviando orden: ", GetLastError());
    } else {
        Print("Orden institucional ejecutada con exito! Ticket: ", result.order);
    }
}`;

  const copyToClipboard = (text: string, formatName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatName);
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isLong ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Ticket de Ejecución Broker (MT4 / MT5 / cTrader)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Parámetros listos para copiar y ejecutar en tu cuenta real o prueba de fondeo
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
          {/* Institutional Order Card Display */}
          <div className={`p-4 rounded-xl border ${isLong ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-rose-950/20 border-rose-500/40'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`px-3 py-1 rounded-lg font-mono font-bold text-xs ${isLong ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                {isLong ? 'ORDEN DE COMPRA (BUY BREAKOUT)' : 'ORDEN DE VENTA (SELL BREAKOUT)'}
              </span>
              <span className="text-xs font-mono text-slate-300">
                Símbolo: <strong className="text-amber-300">XAU/USD (Gold)</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Precio de Entrada</span>
                <span className="text-white font-bold text-base">${entry.toFixed(2)}</span>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Volumen (Lotes)</span>
                <span className="text-amber-300 font-bold text-base">{lots} Lotes</span>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Stop Loss (SL)</span>
                <span className="text-rose-400 font-bold text-base">${sl.toFixed(2)}</span>
                <span className="text-[10px] text-rose-300/70 block">-${riskUSD.toFixed(2)} USD (-{params.riskPercent}%)</span>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Take Profit (TP 1:2)</span>
                <span className="text-emerald-400 font-bold text-base">${tp.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-300/70 block">+${rewardUSD.toFixed(2)} USD (+{((rewardUSD / params.accountBalance) * 100).toFixed(1)}%)</span>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Disparador Breakeven 1:1</span>
                <span className="text-cyan-400 font-bold text-base">${beTrigger.toFixed(2)}</span>
                <span className="text-[10px] text-cyan-300/70 block">Mover SL a ${entry.toFixed(2)}</span>
              </div>

              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Ratio R:R</span>
                <span className="text-slate-200 font-bold text-base">1:{params.rrRatio}</span>
                <span className="text-[10px] text-slate-400 block">Expectativa Positiva</span>
              </div>
            </div>
          </div>

          {/* 1-Click Fast Copy Format */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">1. Formato Rápido para Terminal MT4 / MT5 / Móvil</span>
              <button
                onClick={() => copyToClipboard(mtQuickText, 'quick')}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition"
              >
                {copiedFormat === 'quick' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFormat === 'quick' ? '¡Copiado!' : 'Copiar Orden'}
              </button>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 select-all overflow-x-auto">
              {mtQuickText}
            </div>
          </div>

          {/* Webhook JSON Format */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">2. Payload JSON (TradingView Webhook / Bot Python)</span>
              <button
                onClick={() => copyToClipboard(jsonWebhookPayload, 'json')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition border border-slate-700"
              >
                {copiedFormat === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFormat === 'json' ? '¡Copiado JSON!' : 'Copiar JSON'}
              </button>
            </div>
            <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-32">
              {jsonWebhookPayload}
            </pre>
          </div>

          {/* MQL5 Script */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">3. Script MQL5 (Ejecución Automática en MT5)</span>
              <button
                onClick={() => copyToClipboard(mql5ScriptSnippet, 'mql5')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition border border-slate-700"
              >
                {copiedFormat === 'mql5' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5" />}
                {copiedFormat === 'mql5' ? '¡Copiado MQL5!' : 'Copiar Script'}
              </button>
            </div>
            <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-indigo-300 overflow-x-auto max-h-28">
              {mql5ScriptSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs font-mono transition"
          >
            Cerrar Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
