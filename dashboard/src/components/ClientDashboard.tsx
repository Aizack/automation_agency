import React, { useState, useEffect } from 'react';

interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  systemPrompt: string;
  activeTools: string[];
  status: string;
  agentPhone?: string;
}

interface Interaction {
  sender_phone: string;
  message_text: string;
  response_text: string;
  api_cost: string;
  timestamp: string;
}

interface WhatsappStatus {
  status: string; // 'DISCONNECTED', 'QR', 'CONNECTED'
  qr: string;
  phone: string;
}

interface ClientDashboardProps {
  clientId: string;
  onBack: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ clientId, onBack }) => {
  const [clientData, setClientData] = useState<Client | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado de WhatsApp en tiempo real
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappStatus>({
    status: 'DISCONNECTED',
    qr: '',
    phone: '',
  });

  // Estados del Formulario de Configuración
  const [systemPrompt, setSystemPrompt] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Friendly');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar datos estáticos del Cliente (Solo al iniciar o cambiar de ID)
  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const clientRes = await fetch(`/api/clients/${clientId}`);
        const clientJson = await clientRes.json();
        if (clientJson.success) {
          setClientData(clientJson.data);
          setSystemPrompt(clientJson.data.systemPrompt);
          setAgentPhone(clientJson.data.agentPhone || '');
        }
      } catch (error) {
        console.error("[ClientDashboard] Error cargando cliente:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClientInfo();
  }, [clientId]);

  // Polling dinámico (Cada 3 segundos) para Logs y Estado de Vinculación QR
  useEffect(() => {
    const fetchLiveUpdates = async () => {
      try {
        // 1. Obtener logs reales de la base de datos
        const logsRes = await fetch(`/api/clients/${clientId}/logs`);
        const logsJson = await logsRes.json();
        if (logsJson.success) {
          setInteractions(logsJson.data);
        }

        // 2. Obtener estado en tiempo real de WhatsApp
        const waRes = await fetch('/api/whatsapp/status');
        const waJson = await waRes.json();
        if (waJson.success) {
          setWhatsappStatus(waJson.data);
        }
      } catch (error) {
        console.error("[ClientDashboard] Error en polling:", error);
      }
    };

    fetchLiveUpdates(); // Carga inicial
    const interval = setInterval(fetchLiveUpdates, 3000); // Polling de 3 segundos
    return () => clearInterval(interval);
  }, [clientId]);

  // Guardar configuración del Bot
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData) return;

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          agent_phone: agentPhone || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Recargar datos
        const clientRes = await fetch(`/api/clients/${clientId}`);
        const clientJson = await clientRes.json();
        if (clientJson.success) {
          setClientData(clientJson.data);
        }
      }
    } catch (error) {
      console.error("[ClientDashboard] Error guardando config:", error);
    }
  };

  if (loading && !clientData) {
    return (
      <div className="flex justify-center items-center min-h-screen text-on-surface-variant font-body-lg">
        Cargando Panel del Inquilino...
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="p-8 text-center text-error min-h-screen">
        <h3 className="font-headline-md">Error: Cliente no encontrado</h3>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-xl cursor-pointer">Volver</button>
      </div>
    );
  }

  // Métricas reales calculadas de las interacciones
  const totalChats = interactions.length;
  const apiCostSum = interactions.reduce((acc, curr) => acc + parseFloat(curr.api_cost || "0"), 0);
  const hoursSaved = (totalChats * 3 / 60).toFixed(1);

  // Determinar el estatus del canal de WhatsApp
  const isWaConnected = whatsappStatus.status === 'CONNECTED' && whatsappStatus.phone === clientData.phoneNumber;

  return (
    <div className="min-h-screen pb-10">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-surface/85 backdrop-blur-xl border-b border-outline/20 shadow-sm">
        <div className="flex justify-between items-center h-16 px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-primary hover:text-white flex items-center gap-1 font-bold mr-4 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Volver a Clientes
            </button>
            <span className="font-headline-md text-headline-md font-bold text-primary">Frant</span>
            <div className="h-6 w-px bg-outline/20 mx-2"></div>
            
            {/* Estado dinámico del canal */}
            {isWaConnected ? (
              <div className="flex items-center gap-2 px-3 py-0.5 bg-secondary/10 rounded-full border border-secondary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                </span>
                <span className="font-label-md text-label-md text-secondary">Viculado (En Línea)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-0.5 bg-error/15 rounded-full border border-error/20">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-error"></span>
                </span>
                <span className="font-label-md text-label-md text-error">Desconectado</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">notifications</span>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-label-md text-label-md font-bold">{clientData.name}</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">Panel de Control</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {clientData.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="font-display-lg text-display-lg text-on-surface mb-1">Panel de Control</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">{clientData.name} — Configuración y Monitoreo del Bot</p>
        </header>

        {/* Bento Grid: Metrics & QR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* ROI Metrics Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Metric 1 */}
            <div className="glass-card p-6 rounded-xl flex flex-col justify-between">
              <div>
                <span className="material-symbols-outlined text-primary mb-3">forum</span>
                <p className="font-label-md text-label-md text-on-surface-variant">Chats Atendidos</p>
              </div>
              <div className="mt-4">
                <h2 className="font-headline-lg text-headline-lg font-bold">{totalChats}</h2>
                <p className="text-secondary font-label-sm text-label-sm">Acumulado: ${apiCostSum.toFixed(6)} USD</p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-center text-center">
              <div className="relative w-24 h-24 mb-3">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-surface-container-highest stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="8"></circle>
                  <circle className="text-secondary stroke-current progress-ring-circle" cx="50" cy="50" fill="transparent" r="40" strokeDasharray="251.2" strokeDashoffset="45.2" strokeLinecap="round" strokeWidth="8"></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-headline-md text-headline-md font-bold">100%</span>
                </div>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant">Tasa de Respuesta IA</p>
            </div>

            {/* Metric 3 */}
            <div className="glass-card p-6 rounded-xl flex flex-col justify-between ambient-glow-primary border-primary-container/20">
              <div>
                <span className="material-symbols-outlined text-primary mb-3">timer</span>
                <p className="font-label-md text-label-md text-on-surface-variant">Tiempo Ahorrado</p>
              </div>
              <div className="mt-4">
                <h2 className="font-headline-lg text-headline-lg font-bold">{hoursSaved} Horas</h2>
                <p className="text-primary font-label-sm text-label-sm">Eficiencia de automatización</p>
              </div>
            </div>

            {/* Wide Config Summary */}
            <div className="md:col-span-3 glass-card p-6 rounded-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
              <div className="flex-1 z-10">
                <h3 className="font-headline-md text-headline-md mb-2">Optimizador Inteligente Activo</h3>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                  Tu asistente de IA está gestionando actualmente consultas en tiempo real. Configura su comportamiento para mejorar la experiencia de tus usuarios.
                </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-container/10 rounded-full blur-3xl"></div>
            </div>
          </div>

          {/* WhatsApp QR Card */}
          <div className="lg:col-span-4 glass-card p-6 rounded-xl flex flex-col items-center justify-between">
            <h3 className="font-headline-md text-headline-md mb-4 self-start">Vinculación de WhatsApp</h3>
            
            {/* Renderizado dinámico del QR o Estado */}
            <div className="relative p-3 bg-white rounded-xl mb-4 w-44 h-44 overflow-hidden flex items-center justify-center">
              {isWaConnected ? (
                <div className="text-surface font-bold text-center text-xs p-2 flex flex-col items-center">
                  <span className="material-symbols-outlined text-5xl text-secondary mb-2 animate-bounce">check_circle</span>
                  <span className="text-on-secondary-fixed-variant">DISPOSITIVO VINCULADO</span>
                  <span className="text-[10px] text-gray-500 font-normal mt-1">Listo para operar</span>
                </div>
              ) : whatsappStatus.status === 'QR' ? (
                <img 
                  alt="Código QR de WhatsApp" 
                  className="w-full h-full object-cover" 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappStatus.qr)}`}
                />
              ) : (
                <div className="text-surface font-bold text-center text-xs p-2 flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl text-gray-400 mb-2 animate-spin">refresh</span>
                  <span className="text-gray-600">INICIALIZANDO CANAL</span>
                  <span className="text-[9px] text-gray-400 font-normal mt-1">Espera un momento...</span>
                </div>
              )}
              {!isWaConnected && whatsappStatus.status === 'QR' && <div className="scan-line"></div>}
            </div>

            <div className="w-full space-y-2 mb-2">
              <div className="flex justify-between items-center px-1">
                <span className="font-label-md text-label-md text-on-surface-variant">Estado del Canal</span>
                <span className={`font-bold text-label-md ${isWaConnected ? 'text-secondary' : 'text-error'}`}>
                  {isWaConnected ? 'Conectado' : whatsappStatus.status === 'QR' ? 'Esperando Escaneo' : 'Fuera de Línea'}
                </span>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="font-label-md text-label-md text-on-surface-variant">Línea Asignada</span>
                <span className="text-on-surface font-label-md font-mono">+{clientData.phoneNumber}</span>
              </div>
            </div>
            {!isWaConnected && whatsappStatus.status === 'QR' && (
              <p className="text-[10.5px] text-center text-primary/80 font-medium px-2">
                Escanea el código QR desde la opción "Dispositivos vinculados" en tu aplicación móvil de WhatsApp.
              </p>
            )}
          </div>
        </div>

        {/* Config Panel */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 glass-card p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary-container">smart_toy</span>
              <h3 className="font-headline-md text-headline-md">Configuración del Agente IA</h3>
            </div>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-label-md text-label-md text-on-surface-variant">Comportamiento &amp; Instrucciones (System Prompt)</label>
                  <span className="text-[11px] text-primary font-medium">Define el rol y reglas del bot</span>
                </div>
                <textarea 
                  className="w-full bg-surface-container border border-outline/30 rounded-lg p-3 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all min-h-[140px] text-on-surface"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Define cómo debe responder la IA... Ej: Eres un recepcionista amable de la Clínica Dental. Tu objetivo es agendar citas."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant">Tono de Voz del Bot</label>
                  <select 
                    className="w-full bg-surface-container border border-outline/30 rounded-lg p-3 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container text-on-surface"
                    value={toneOfVoice}
                    onChange={(e) => setToneOfVoice(e.target.value)}
                  >
                    <option value="Friendly">Amistoso (Recomendado)</option>
                    <option value="Formal">Formal y Corporativo</option>
                    <option value="Casual">Casual e Informal</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant">Línea del Asesor Humano (Traspaso)</label>
                  <input 
                    className="w-full bg-surface-container border border-outline/30 rounded-lg p-3 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container text-on-surface font-mono"
                    type="text"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="Ej: 573009998888"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2 items-center gap-4">
                {saveSuccess && (
                  <span className="text-secondary font-bold text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    ¡Configuración guardada!
                  </span>
                )}
                <button 
                  className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-lg font-bold font-label-md text-label-md flex items-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 cursor-pointer"
                  type="submit"
                >
                  <span className="material-symbols-outlined">save</span>
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-xl ambient-glow-secondary border-secondary/20">
              <h4 className="font-label-md text-label-md font-bold text-secondary mb-4 uppercase">Atención Requerida</h4>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center text-error shrink-0">
                    <span className="material-symbols-outlined text-sm">priority_high</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md">Consulta de Urgencia</p>
                    <p className="text-[12px] text-on-surface-variant">El usuario solicita hablar con un asesor por dolor severo.</p>
                  </div>
                </div>
                <button className="w-full py-2 bg-surface-container-high/50 border border-outline/20 rounded-lg text-sm font-medium hover:bg-surface-container-high transition-all cursor-pointer">
                  Atender Ahora
                </button>
              </div>
            </div>
            <div className="glass-card p-6 rounded-xl overflow-hidden relative">
              <div className="relative z-10">
                <h4 className="font-label-md text-label-md font-bold mb-4">Estado del Agente IA</h4>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container w-[92%]"></div>
                  </div>
                  <span className="text-xs font-bold">92%</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">El modelo de lenguaje está optimizado y listo para responder.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Chat History Table */}
        <section className="glass-card rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="font-headline-md text-headline-md">Historial de Conversaciones</h3>
              <p className="font-label-md text-label-md text-on-surface-variant">Registro en tiempo real de interacciones</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-md">search</span>
                <input className="bg-surface-container border border-outline/30 rounded-lg py-1.5 pl-10 pr-4 text-sm focus:border-primary-container focus:ring-0 text-on-surface w-64" placeholder="Buscar mensaje..." type="text"/>
              </div>
              <button className="material-symbols-outlined p-2 border border-outline/30 rounded-lg hover:bg-surface-container/30">filter_list</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50 text-on-surface-variant">
                  <th className="px-6 py-3 font-label-md text-label-md uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 font-label-md text-label-md uppercase tracking-wider">Último Mensaje</th>
                  <th className="px-6 py-3 font-label-md text-label-md uppercase tracking-wider">Respuesta de Frant (Bot)</th>
                  <th className="px-6 py-3 font-label-md text-label-md uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 font-label-md text-label-md uppercase tracking-wider">Costo / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/10">
                {interactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-on-surface-variant italic">No hay interacciones registradas aún. Envía un mensaje de WhatsApp para verlos aquí.</td>
                  </tr>
                ) : interactions.map((log, index) => (
                  <tr key={index} className="hover:bg-primary-container/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-xs">
                          {log.sender_phone.substring(0, 2)}
                        </div>
                        <div>
                          <p className="font-label-md text-label-md font-bold">Usuario</p>
                          <p className="text-[10px] text-on-surface-variant font-mono">+{log.sender_phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm truncate">{log.message_text}</p>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm truncate italic text-primary-container/80">{log.response_text}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold border ${
                        parseFloat(log.api_cost) > 0 
                          ? 'bg-secondary/10 text-secondary border-secondary/20' 
                          : 'bg-tertiary/10 text-tertiary border-tertiary/20'
                      }`}>
                        {parseFloat(log.api_cost) > 0 ? 'RESPUESTA IA' : 'HUMANO'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-bold">${parseFloat(log.api_cost).toFixed(6)}</p>
                        <p className="text-[10px] text-on-surface-variant">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};
