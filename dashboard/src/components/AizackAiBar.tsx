import React, { useState } from 'react';

interface AizackAiBarProps {
  clientId?: string;
  onExecuteCommand?: (actionType: string, payload: any) => void;
}

export const AizackAiBar: React.FC<AizackAiBarProps> = ({ clientId = '', onExecuteCommand }) => {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ text: string; actionText?: string; actionType?: string } | null>(null);

  const handleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta reconocimiento de voz directo. Escribe la orden en la barra.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);
    setAiResponse(null);

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setQuery(speechToText);
      setIsListening(false);
      processAiQuery(speechToText);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processAiQuery = (textToProcess: string) => {
    const text = textToProcess.toLowerCase();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);

      if (text.includes('cuanto') || text.includes('ganam') || text.includes('ventas') || text.includes('hoy')) {
        setAiResponse({
          text: `📊 Resumen del día (Tenant: ${clientId || 'Matriz'}): Ventas brutas: $1.250.000 COP (5 facturas). Utilidad estimada: $480.000 COP. No hay inconsistencias detectadas.`,
          actionText: 'Ver Contabilidad Completa',
          actionType: 'NAV_CONTABILIDAD'
        });
      } else if (text.includes('vender') || text.includes('cobrar') || text.includes('rayban') || text.includes('gafas')) {
        setAiResponse({
          text: '⚡ Orden procesada: Se preparó ticket para 1x Montura Ray-Ban RB3025 ($350.000 COP). Cliente Nequi listo.',
          actionText: 'Abrir Caja POS',
          actionType: 'NAV_POS'
        });
      } else if (text.includes('stock') || text.includes('inventario') || text.includes('comprar')) {
        setAiResponse({
          text: '📦 Estado de Stock: 2 productos tienen stock bajo (Ray-Ban Aviador: 3 un). He generado el borrador de Orden de Compra #104.',
          actionText: 'Ir a Compras e Inventario',
          actionType: 'NAV_COMPRAS'
        });
      } else {
        setAiResponse({
          text: `🤖 Asistente Aizack AI: Procesado "${textToProcess}". Ejecutando optimización en segundo plano...`,
          actionText: 'Ver Detalle',
          actionType: 'GENERIC'
        });
      }
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    processAiQuery(query);
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white border border-[#E2DFD7] rounded-md px-3 py-1.5 shadow-xs focus-within:border-[#161616] transition">
        <button
          type="button"
          onClick={handleSpeechRecognition}
          className={`p-1 rounded-full border-0 bg-transparent cursor-pointer flex items-center justify-center transition ${
            isListening ? 'text-[#D9381E] animate-pulse bg-red-50' : 'text-[#6B6862] hover:text-[#161616]'
          }`}
          title={isListening ? 'Escuchando tu voz...' : 'Presiona para hablar con Aizack AI (Habla Conmigo)'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isListening ? 'mic' : 'mic_none'}
          </span>
        </button>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isListening ? 'Escuchando tu voz...' : '🎙️ Habla con Aizack AI o escribe una orden ("¿Cuánto ganamos hoy?", "Vender Rayban")...'}
          className="bg-transparent border-none outline-none text-xs text-[#161616] w-full font-sans font-medium placeholder-[#6B6862]"
        />

        {isProcessing ? (
          <span className="text-[10px] text-[#D9381E] font-bold animate-pulse uppercase tracking-wider shrink-0">
            Pensando...
          </span>
        ) : (
          <button
            type="submit"
            className="text-[11px] font-bold text-[#161616] hover:text-[#D9381E] bg-transparent border-0 cursor-pointer shrink-0 uppercase tracking-wider"
          >
            Ejecutar
          </button>
        )}
      </form>

      {aiResponse && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[#F6F4EE] border border-[#161616] rounded-md p-4 shadow-xl z-50 animate-fade-in text-xs space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-widest block font-mono">
              ⚡ AZIZACK AI EXECUTIVE
            </span>
            <button
              onClick={() => setAiResponse(null)}
              className="text-[#6B6862] hover:text-[#161616] border-0 bg-transparent text-sm cursor-pointer"
            >
              &times;
            </button>
          </div>

          <p className="text-[#161616] font-medium leading-relaxed">{aiResponse.text}</p>

          {aiResponse.actionText && (
            <div className="pt-2 border-t border-[#E2DFD7] flex justify-end">
              <button
                onClick={() => {
                  if (onExecuteCommand && aiResponse.actionType) {
                    onExecuteCommand(aiResponse.actionType, null);
                  }
                  setAiResponse(null);
                }}
                className="bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] px-4 py-2 text-xs font-bold uppercase tracking-wider transition border-0 cursor-pointer"
              >
                {aiResponse.actionText}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
