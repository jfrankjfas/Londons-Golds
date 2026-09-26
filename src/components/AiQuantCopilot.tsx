import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send, Bot, ShieldAlert, CheckCircle, RefreshCw, Compass } from 'lucide-react';
import { AsianRange, DayData } from '../types/trading.ts';

interface AiQuantCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDay: DayData;
  asianRange: AsianRange | null;
  currentPrice: number;
}

interface AiAnalysisResult {
  analysis: string;
  confluenceScore: number;
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  volatilityRating: 'BAJA' | 'MEDIA' | 'ALTA' | 'EXTREMA';
  actionPlan: string;
  keyInsights: string[];
}

export const AiQuantCopilot: React.FC<AiQuantCopilotProps> = ({
  isOpen,
  onClose,
  selectedDay,
  asianRange,
  currentPrice,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'audit' | 'chat'>('audit');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  const fetchAnalysis = async (userQuery?: string) => {
    if (!asianRange) return;
    setLoading(true);

    try {
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asianHigh: asianRange.high,
          asianLow: asianRange.low,
          asianRangePoints: asianRange.rangePoints,
          d1Trend: selectedDay.prevDayTrend,
          prevDayOpen: selectedDay.prevDayOpen,
          prevDayClose: selectedDay.prevDayClose,
          currentPrice,
          currentSession: 'London Open Window (08:00 UTC)',
          utcTime: new Date().toISOString().substring(11, 19) + ' UTC',
          userQuery,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze');
      }

      const data = await response.json();
      setResult(data);

      if (userQuery) {
        setChatHistory((prev) => [
          ...prev,
          { role: 'user', text: userQuery },
          { role: 'assistant', text: data.analysis || data.actionPlan },
        ]);
        setCustomPrompt('');
      }
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result && asianRange) {
      fetchAnalysis();
    }
  }, [isOpen, selectedDay, asianRange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Auditor Cuantitativo IA (Gemini 3.8)
              </h3>
              <p className="text-xs text-slate-400">
                Optimización de Mercado en Tiempo Real • XAU/USD
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalysis()}
              disabled={loading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
              title="Recalcular con datos en vivo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Auditoría de Mercado
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2.5 px-4 text-xs font-mono font-bold border-b-2 transition ${
              activeTab === 'chat'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Consultas al Copiloto ({chatHistory.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 font-sans flex-1">
          {loading && !result ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Analizando estructura institucional de Londres y flujo de órdenes del oro...
              </p>
            </div>
          ) : activeTab === 'audit' ? (
            <>
              {/* Score & Key Metrics Banner */}
              {result && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Confluence Score */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Confluencia Estadística
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-mono font-black text-indigo-400">
                        {result.confluenceScore}%
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded mt-1 ${
                        result.confluenceScore >= 75
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {result.confluenceScore >= 75 ? 'ALTA PROBABILIDAD' : 'CONDICIÓN MODERADA'}
                    </span>
                  </div>

                  {/* Directional Bias */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Sesgo Cuantitativo
                    </span>
                    <span
                      className={`text-2xl font-mono font-black ${
                        result.bias === 'LONG'
                          ? 'text-emerald-400'
                          : result.bias === 'SHORT'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {result.bias === 'LONG' ? 'COMPRA (LONG)' : result.bias === 'SHORT' ? 'VENTA (SHORT)' : 'NEUTRAL'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">
                      Filtro D1 {selectedDay.prevDayTrend}
                    </span>
                  </div>

                  {/* Volatility */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Volatilidad de Expansión
                    </span>
                    <span className="text-2xl font-mono font-black text-amber-300">
                      {result.volatilityRating}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">
                      Rango Asia: ${asianRange?.rangePoints.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              )}

              {/* Institutional Analysis Text */}
              {result && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    Evaluación Institucional de Liquidez
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
                    {result.analysis}
                  </p>
                </div>
              )}

              {/* Tactical Action Plan */}
              {result && (
                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    Plan de Acción Mecánico
                  </div>
                  <p className="text-xs text-indigo-100 font-sans leading-relaxed">
                    {result.actionPlan}
                  </p>
                </div>
              )}

              {/* Key Quantitative Insights */}
              {result && result.keyInsights && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Confluencias y Puntos Críticos
                  </span>
                  <ul className="space-y-1.5">
                    {result.keyInsights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 font-sans">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            /* Interactive Chat Mode */
            <div className="space-y-3">
              {chatHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <Bot className="w-8 h-8 mx-auto text-indigo-400 opacity-60" />
                  <p className="text-xs">
                    Pregúntale a Gemini sobre optimizaciones del bot, correlaciones con el DXY, noticias macroeconómicas o gestión de drawdowns.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {[
                      '¿Cómo afecta el London Gold Fix a la ruptura?',
                      '¿Qué hacer si el rango asiático supera los $30 USD?',
                      '¿Es mejor Stop Loss al 50% o en el lado opuesto?',
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => fetchAnalysis(prompt)}
                        className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 rounded-full transition"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatHistory.map((item, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl text-xs leading-relaxed font-sans ${
                      item.role === 'user'
                        ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 ml-6'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 mr-6'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold block mb-1 text-slate-400">
                      {item.role === 'user' ? 'OPERADOR' : 'GEMINI QUANT ASSISTANT'}
                    </span>
                    {item.text}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Chat / Query Input Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center gap-2">
          <input
            type="text"
            placeholder="Pregunta a la IA sobre la estrategia (ej. ¿cuál es el drawdown típico en oro?)..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customPrompt.trim()) {
                fetchAnalysis(customPrompt);
              }
            }}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            onClick={() => customPrompt.trim() && fetchAnalysis(customPrompt)}
            disabled={loading || !customPrompt.trim()}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
