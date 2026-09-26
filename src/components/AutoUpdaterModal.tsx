import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Download,
  Terminal,
  CheckCircle,
  AlertCircle,
  Laptop,
  FolderGit2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface AutoUpdaterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VersionInfo {
  version: string;
  codename: string;
  buildDate: string;
  releaseNotes: string[];
}

export const AutoUpdaterModal: React.FC<AutoUpdaterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [versionData, setVersionData] = useState<VersionInfo>({
    version: '2.5.0',
    codename: 'Quant-Pro Institutional',
    buildDate: '2026-09-23',
    releaseNotes: [
      'Escudo de Noticias & Calendario Económico XAU/USD con filtro de noticias rojas.',
      'Simulador de Monte Carlo con 1,000 iteraciones y proyección de curva de equidad.',
      'Generador de Ticket de Orden para MetaTrader 4/5, cTrader y Webhooks con 1-clic copy.',
      'Auditoría cuantitativa de las 7 confirmaciones y gauge de volatilidad del rango asiático.',
      'Diario de Trading auditado con exportación instantánea a CSV / Excel.',
      'Sistema de actualización automática en 1-clic (actualizar.bat y actualizar.sh).',
    ],
  });

  const [activeTab, setActiveTab] = useState<'SCRIPTS' | 'DESKTOP' | 'CHANGELOG'>('SCRIPTS');
  const [isChecking, setIsChecking] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/version')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.version) {
            setVersionData(data);
          }
        })
        .catch(() => {
          // Fallback to local default
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckUpdate = () => {
    setIsChecking(true);
    fetch('/api/version')
      .then((res) => res.json())
      .then((data) => {
        setVersionData(data);
        setTimeout(() => setIsChecking(false), 600);
      })
      .catch(() => {
        setTimeout(() => setIsChecking(false), 600);
      });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Download Bat / Sh directly
  const downloadScript = (filename: 'actualizar.bat' | 'actualizar.sh' | 'iniciar.bat') => {
    const isUnix = filename.endsWith('.sh');
    const url = `/api/download-updater?os=${isUnix ? 'unix' : 'windows'}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-sans">
                  Centro de Actualización Automática
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v{versionData.version} {versionData.codename}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Actualiza cambios al instante sin volver a descargar ZIPs ni reinstalar node_modules
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('SCRIPTS')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'SCRIPTS'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Actualizador 1-Clic (.bat / .sh)
          </button>
          <button
            onClick={() => setActiveTab('DESKTOP')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'DESKTOP'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-emerald-400" />
            Modo App de Escritorio (Sin descargas)
          </button>
          <button
            onClick={() => setActiveTab('CHANGELOG')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'CHANGELOG'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Notas de la Versión
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'SCRIPTS' && (
            <div className="space-y-4 text-xs font-mono">
              {/* Problem Solved Banner */}
              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-slate-300 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-1">
                    ¿Cansado de descargar el ZIP, descomprimir y volver a correr npm install?
                  </strong>
                  <p className="text-slate-300 font-sans leading-relaxed text-[13px]">
                    Con estos scripts de 1-clic, tu carpeta existente se sincroniza automáticamente. <strong>No descarga los 300MB de node_modules de nuevo</strong>: solo descarga los archivos modificados e inicia el servidor en 3 segundos con un solo doble clic.
                  </p>
                </div>
              </div>

              {/* Download Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Windows 1-Click */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      Windows (Doble Clic)
                    </span>
                    <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded">
                      .BAT
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] font-sans">
                    Solo dale doble clic a <code className="text-amber-300 font-mono">actualizar.bat</code> en tu carpeta. Sincroniza cambios, actualiza paquetes y abre Chrome automáticamente.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadScript('actualizar.bat')}
                      className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar actualizar.bat
                    </button>
                    <button
                      onClick={() => downloadScript('iniciar.bat')}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition"
                      title="Lanzador rápido para iniciar sin actualizar"
                    >
                      iniciar.bat
                    </button>
                  </div>
                </div>

                {/* Mac / Linux 1-Click */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Mac & Linux
                    </span>
                    <span className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded">
                      .SH
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] font-sans">
                    Ejecuta <code className="text-emerald-300 font-mono">./actualizar.sh</code> en la terminal para sincronizar en un instante sin re-descargar la carpeta completa.
                  </p>
                  <button
                    onClick={() => downloadScript('actualizar.sh')}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar actualizar.sh
                  </button>
                </div>
              </div>

              {/* Step-by-Step Guide */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <FolderGit2 className="w-4 h-4 text-amber-400" />
                  Cómo configurar tu carpeta en 2 minutos (Una sola vez):
                </div>

                <div className="space-y-2 text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      1
                    </span>
                    <div className="flex-1">
                      <p>
                        Coloca el archivo <code className="text-cyan-300">actualizar.bat</code> (o <code className="text-emerald-300">actualizar.sh</code>) dentro de la carpeta raíz de tu proyecto donde está tu <code className="text-amber-300">package.json</code>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      2
                    </span>
                    <div className="flex-1">
                      <p>
                        Si usas Git (Recomendado): solo ejecuta una vez este comando en tu carpeta para enlazarlo:
                      </p>
                      <div className="mt-1 flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[11px]">
                        <span>npm run update</span>
                        <button
                          onClick={() => copyToClipboard('npm run update', 'cmd1')}
                          className="text-slate-400 hover:text-white p-1"
                        >
                          {copiedCode === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      3
                    </span>
                    <div className="flex-1">
                      <p>
                        <strong>¡Listo!</strong> De ahora en adelante, cada vez que haya una actualización, solo das <strong>doble clic en actualizar.bat</strong>. Ya no tienes que descomprimir nada ni crear carpetas nuevas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DESKTOP' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-slate-300 space-y-2">
                <div className="text-emerald-300 font-bold text-sm flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-400" />
                  La Opción Más Fácil: Instalar como App de Escritorio (PWA)
                </div>
                <p className="font-sans leading-relaxed text-[13px]">
                  ¿Sabías que no necesitas ejecutar Node.js en tu computadora para usar la plataforma? Puedes instalar esta misma aplicación web directamente en tu escritorio de Windows o Mac como si fuera un programa nativo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <span className="font-bold text-white block text-sm">En Google Chrome / Edge:</span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 font-sans text-[12px]">
                    <li>Haz clic en el ícono de <strong>Instalar</strong> en la barra de direcciones (a la derecha de la URL).</li>
                    <li>O ve al menú <strong>(⋮) → Transmitir, guardar e instalar → Instalar XAU/USD Quant</strong>.</li>
                    <li>Aparecerá un ícono directo en tu Escritorio y barra de tareas.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <span className="font-bold text-white block text-sm">Ventajas del Modo App:</span>
                  <ul className="space-y-1.5 text-slate-300 font-sans text-[12px]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <strong>Cero descargas de ZIPs:</strong> Siempre tienes la última versión.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <strong>Cero consumo de memoria:</strong> No necesitas tener Node.js corriendo.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <strong>Alertas Push del sistema:</strong> Suenan directo en Windows/Mac.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CHANGELOG' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-white font-bold">
                  Historial de Cambios — Versión {versionData.version} ({versionData.buildDate})
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Compilación Oficial Estable
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 p-4 space-y-2.5">
                {versionData.releaseNotes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                    <span className="font-sans text-[12px] leading-relaxed">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={handleCheckUpdate}
            disabled={isChecking}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Verificando...' : 'Comprobar Actualizaciones'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
