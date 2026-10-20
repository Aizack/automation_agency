import React, { useState } from 'react';

interface TestWhatsappBusinessMessagingProps {
  onBack?: () => void;
}

export const TestWhatsappBusinessMessaging: React.FC<TestWhatsappBusinessMessagingProps> = ({ onBack }) => {
  // Comando cURL pegado por el usuario (por defecto vacío para que él lo pegue)
  const [rawCurlInput, setRawCurlInput] = useState('');

  // Estados de ejecución
  const [loading, setLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<{
    status?: number;
    statusText?: string;
    durationMs?: number;
    data?: any;
    error?: string;
    timestamp?: string;
  } | null>(null);

  // Ejecutar el comando cURL pegado a través del backend de Frant
  const handleExecuteCurl = async () => {
    if (!rawCurlInput.trim()) {
      alert('⚠️ Por favor pega el comando cURL del Paso 2 de Meta antes de enviar.');
      return;
    }

    setLoading(true);
    setResponseLog(null);

    try {
      const res = await fetch('/api/v1/meta/execute-curl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curlCommand: rawCurlInput.trim() })
      });

      const resData = await res.json();
      setResponseLog({
        status: res.status,
        statusText: res.statusText,
        durationMs: resData.durationMs,
        data: resData.data,
        error: !res.ok ? (resData.data?.error?.message || resData.error || 'Error en Graph API de Meta') : undefined,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      setResponseLog({
        error: err.message,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setRawCurlInput('');
    setResponseLog(null);
  };

  return (
    <div className="min-h-screen bg-[#F6F4EE] text-[#161616] font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Barra Superior */}
        <div className="bg-white border border-[#E2DFD7] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#161616] text-[#FAF8F3] flex items-center justify-center font-bold font-serif text-lg">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#161616] m-0">
                  Test_whatsapp_business_messaging
                </h1>
                <span className="bg-[#eff6ff] text-[#0866ff] border border-[#bfdbfe] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  Meta Review Step 2
                </span>
              </div>
              <p className="text-xs text-[#6B6862] m-0 mt-0.5">
                Inserta el comando cURL del paso 2 en tu sitio web y graba cómo envías un mensaje a través de WhatsApp Cloud API.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3.5 py-1.5 border border-[#E2DFD7] hover:bg-[#FAF8F3] text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span>Regresar al ERP</span>
              </button>
            )}
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-[#0866FF] hover:bg-[#0052cc] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span>Consola Meta</span>
            </a>
          </div>
        </div>

        {/* Tarjeta de Ejecución del cURL de Meta */}
        <div className="bg-white border border-[#E2DFD7] rounded-xl shadow-sm overflow-hidden">
          
          <div className="p-5 border-b border-[#E2DFD7] bg-[#FAF8F3]/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#0866FF] text-[24px]">terminal</span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#161616] m-0">
                  Comando cURL del Paso 2 de Meta
                </h2>
                <span className="text-[11px] text-[#6B6862]">
                  Pega aquí el comando cURL generado en la herramienta "Probar" de Meta for Developers
                </span>
              </div>
            </div>

            {rawCurlInput && (
              <button
                onClick={handleClear}
                className="text-xs text-[#6B6862] hover:text-[#D9381E] transition cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
                <span>Limpiar</span>
              </button>
            )}
          </div>

          <div className="p-6 space-y-4">
            
            {/* Área para pegar el cURL */}
            <div>
              <label className="text-xs font-bold text-[#475569] block mb-2">
                Pega aquí tu comando cURL:
              </label>
              <textarea
                rows={10}
                value={rawCurlInput}
                onChange={(e) => setRawCurlInput(e.target.value)}
                placeholder={`Pega aquí el comando cURL completo copiado del Paso 2 de Meta, por ejemplo:

curl -i -X POST \\
  https://graph.facebook.com/v21.0/1174599429073355/messages \\
  -H 'Authorization: Bearer EAAVzPHiUbzk...' \\
  -H 'Content-Type: application/json' \\
  -d '{ "messaging_product": "whatsapp", "to": "57300...", "type": "template", ... }'`}
                className="w-full bg-[#161616] text-[#FAF8F3] font-mono text-xs p-4 rounded-xl border border-[#333333] focus:border-[#0866FF] outline-none leading-relaxed transition shadow-inner"
              />
            </div>

            {/* Botón de Enviar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-[#6B6862] m-0">
                Al hacer clic, Frant ejecutará la llamada oficial contra la Graph API de Meta y disparará el mensaje a tu WhatsApp.
              </p>

              <button
                type="button"
                onClick={handleExecuteCurl}
                disabled={loading || !rawCurlInput.trim()}
                className="w-full sm:w-auto min-w-[220px] bg-[#0866FF] hover:bg-[#0052cc] disabled:bg-[#0866FF]/40 text-white font-bold py-3 px-6 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    <span>Enviando mensaje...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                    <span>Enviar mensaje (Ejecutar cURL)</span>
                  </>
                )}
              </button>
            </div>

            {/* Consola de Respuesta en Vivo */}
            <div className="pt-4 border-t border-[#E2DFD7]">
              <div className="bg-[#161616] text-[#FAF8F3] rounded-xl p-4 border border-[#333333] shadow-md space-y-3">
                <div className="flex justify-between items-center border-b border-[#333333] pb-2 text-[11px]">
                  <span className="font-mono font-bold text-[#A8A29E] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">terminal</span>
                    Respuesta en Tiempo Real de Meta Graph API
                  </span>
                  {responseLog && (
                    <span className="text-[10px] text-[#A8A29E]">
                      {responseLog.timestamp} {responseLog.durationMs ? `• ${responseLog.durationMs}ms` : ''}
                    </span>
                  )}
                </div>

                {!responseLog ? (
                  <div className="py-6 text-center text-xs text-[#A8A29E] font-mono">
                    <span>Pega tu comando cURL arriba y presiona "Enviar mensaje (Ejecutar cURL)" para ver la respuesta oficial de Meta en vivo.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-[#A8A29E]">Estado HTTP:</span>
                      {responseLog.status && responseLog.status < 300 ? (
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          {responseLog.status} {responseLog.statusText || 'OK'} — ¡Mensaje entregado!
                        </span>
                      ) : (
                        <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">error</span>
                          {responseLog.status || 500} {responseLog.statusText || 'Error'}
                        </span>
                      )}
                    </div>

                    {responseLog.error && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-lg font-mono">
                        <strong>Error de Meta:</strong> {responseLog.error}
                      </div>
                    )}

                    {responseLog.data && (
                      <pre className="bg-black/60 p-3 rounded-lg border border-white/10 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56 leading-relaxed m-0">
                        {JSON.stringify(responseLog.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
