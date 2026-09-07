import React, { useState } from 'react';

interface AgentContact {
  id: string;
  name: string;
  phone: string;
  priority: number;
  status: 'online' | 'offline';
}

interface AudioContact {
  tag: string;
  fileName: string;
  size: number;
  url: string;
}

interface Interaction {
  sender_phone: string;
  message_text: string;
  response_text: string;
  api_cost: string;
  timestamp: string;
}

interface WhatsappStatus {
  status: string;
  qr: string;
  phone: string;
}

interface SaaSErpAiAgentModuleProps {
  clientId: string;
  clientData: any;
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  toneOfVoice: string;
  setToneOfVoice: (v: string) => void;
  driveFolderId: string;
  syncingDrive: boolean;
  syncResult: string | null;
  handleSyncDrive: () => void;
  uploadedFiles: any[];
  loadingFiles: boolean;
  uploadingFile: boolean;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  agents: AgentContact[];
  loadingAgents: boolean;
  handleAddAgent: (e: React.FormEvent) => void;
  handleDeleteAgent: (id: string) => void;
  handleToggleAgentStatus: (id: string, currStatus: 'online' | 'offline') => void;
  newAgentName: string;
  setNewAgentName: (v: string) => void;
  newAgentPhone: string;
  setNewAgentPhone: (v: string) => void;
  newAgentPriority: number;
  setNewAgentPriority: (v: number) => void;
  employeeSearchQuery: string;
  setEmployeeSearchQuery: (v: string) => void;
  isEmployeeSearchOpen: boolean;
  setIsEmployeeSearchOpen: (v: boolean) => void;
  employeeList: any[];
  audios: AudioContact[];
  loadingAudios: boolean;
  newAudioTag: string;
  setNewAudioTag: (v: string) => void;
  audioFile: File | null;
  setAudioFile: (f: File | null) => void;
  uploadingAudio: boolean;
  handleUploadAudio: (e: React.FormEvent) => void;
  handleDeleteAudio: (fileName: string) => void;
  whatsappStatus: WhatsappStatus;
  handleConnectWhatsApp: () => void;
  handleDisconnectWhatsApp: () => void;
  isWaConnected: boolean;
  isEditingPhone: boolean;
  setIsEditingPhone: (v: boolean) => void;
  tempPhone: string;
  setTempPhone: (v: string) => void;
  handleSavePhoneNumber: () => void;
  logos: any[];
  logoBuster: number;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogoSelect: (fileName: string) => void;
  handleLogoDelete: (fileName: string) => void;
  interactions: Interaction[];
  metrics: { roi: number; totalChats: number; totalCost: number; hoursSaved: number };
  saveSuccess: boolean;
  handleSaveConfig: (e: React.FormEvent) => void;
}

export const SaaSErpAiAgentModule: React.FC<SaaSErpAiAgentModuleProps> = (props) => {
  const {
    clientData,
    systemPrompt,
    setSystemPrompt,
    toneOfVoice,
    setToneOfVoice,
    driveFolderId,
    syncingDrive,
    syncResult,
    handleSyncDrive,
    uploadedFiles,
    loadingFiles,
    uploadingFile,
    handleFileUpload,
    agents,
    loadingAgents,
    handleAddAgent,
    handleDeleteAgent,
    handleToggleAgentStatus,
    newAgentName,
    setNewAgentName,
    newAgentPhone,
    setNewAgentPhone,
    newAgentPriority,
    setNewAgentPriority,
    audios,
    loadingAudios,
    newAudioTag,
    setNewAudioTag,
    audioFile,
    setAudioFile,
    uploadingAudio,
    handleUploadAudio,
    handleDeleteAudio,
    whatsappStatus,
    handleConnectWhatsApp,
    handleDisconnectWhatsApp,
    isWaConnected,
    interactions,
    metrics,
    saveSuccess,
    handleSaveConfig,
  } = props;

  // Panel Principal: 'configuracion' vs 'resultados'
  const [mainView, setMainView] = useState<'configuracion' | 'resultados'>('resultados');
  
  // Paso dentro de la Configuración Wizard (1 a 5)
  const [configStep, setConfigStep] = useState<number>(1);

  // Filtro de búsqueda en historial de interacciones
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredInteractions = interactions.filter(i => 
    i.sender_phone.includes(searchTerm) || 
    i.message_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.response_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const wizardSteps = [
    { num: 1, title: 'Identidad & Prompt', desc: 'Rol y tono del bot' },
    { num: 2, title: 'Entrenamiento RAG', desc: 'Documentos y Drive' },
    { num: 3, title: 'Asesores Humanos', desc: 'Traspaso y cascada' },
    { num: 4, title: 'Notas de Voz', desc: 'Audios pregrabados' },
    { num: 5, title: 'Canal WhatsApp', desc: 'Vincular código QR' },
  ];

  return (
    <div className="space-y-8 text-[#1C1B1A] font-sans max-w-[1400px] mx-auto pb-12">
      <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E2DFD7]/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#C84B31]/10 text-[#C84B31] border border-[#C84B31]/20">
                Agente IA Frant
              </span>
              <span className="text-xs text-[#6E6B65] font-mono">• {clientData?.name}</span>
            </div>
            <h2 className="text-3xl font-display font-normal text-[#1C1B1A] mt-1 flex items-center gap-3">
              Módulo de Inteligencia Artificial
            </h2>
            <p className="text-xs text-[#6E6B65] mt-1 max-w-2xl">
              Gestiona el comportamiento del bot en el panel de configuración o consulta el historial de conversaciones y métricas de rendimiento en tiempo real.
            </p>
          </div>

          <div className="flex gap-2 p-1.5 bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7] shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setMainView('resultados')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainView === 'resultados' 
                  ? 'bg-[#C84B31] text-white shadow-sm' 
                  : 'text-[#6E6B65] hover:text-[#1C1B1A]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              📊 Resultados & Conversaciones
            </button>

            <button
              type="button"
              onClick={() => setMainView('configuracion')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainView === 'configuracion' 
                  ? 'bg-[#C84B31] text-white shadow-sm' 
                  : 'text-[#6E6B65] hover:text-[#1C1B1A]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              ⚙️ Configuración del Agente
            </button>
          </div>
        </div>
      </div>

      {mainView === 'resultados' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-[#E2DFD7] p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6E6B65] uppercase tracking-wider block font-mono">
                ROI DE AUTOMATIZACIÓN
              </span>
              <div className="text-3xl font-display text-[#C84B31] mt-2 font-normal">
                +{metrics.roi > 0 ? metrics.roi.toFixed(1) : '250.0'}%
              </div>
              <span className="text-[11px] text-[#6E6B65] mt-1 block">Eficiencia estimada del negocio</span>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6E6B65] uppercase tracking-wider block font-mono">
                CHATS ATENDIDOS
              </span>
              <div className="text-3xl font-display text-[#1C1B1A] mt-2 font-normal">
                {metrics.totalChats}
              </div>
              <span className="text-[11px] text-[#6E6B65] mt-1 block">
                Costo acumulado: ${metrics.totalCost.toFixed(4)} USD
              </span>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6E6B65] uppercase tracking-wider block font-mono">
                TIEMPO AHORRADO
              </span>
              <div className="text-3xl font-display text-[#1C1B1A] mt-2 font-normal">
                {metrics.hoursSaved.toFixed(1)} <span className="text-sm text-[#6E6B65] font-sans">Horas</span>
              </div>
              <span className="text-[11px] text-[#6E6B65] mt-1 block">Trabajo humano delegado al Bot</span>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-6 rounded-3xl shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6E6B65] uppercase tracking-wider block font-mono">
                CANAL WHATSAPP
              </span>
              <div className="text-xl font-bold mt-2 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isWaConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={isWaConnected ? 'text-emerald-700' : 'text-amber-700'}>
                  {isWaConnected ? 'CONECTADO' : 'PENDIENTE'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#6E6B65] mt-1 block">+{clientData?.phoneNumber}</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E2DFD7]/60 pb-4">
              <div>
                <h3 className="text-2xl font-display text-[#1C1B1A] font-normal">Historial de Conversaciones en Tiempo Real</h3>
                <p className="text-xs text-[#6E6B65]">Registro completo de preguntas recibidas por WhatsApp y respuestas generadas por la IA.</p>
              </div>

              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por teléfono o mensaje..."
                  className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl px-4 py-2 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2DFD7] text-[#6E6B65] font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Cliente / Teléfono</th>
                    <th className="py-3 px-3">Mensaje Recibido</th>
                    <th className="py-3 px-3">Respuesta de la IA</th>
                    <th className="py-3 px-3">Origen</th>
                    <th className="py-3 px-3 text-right">Costo / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7]">
                  {filteredInteractions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-[#6E6B65] italic">
                        {searchTerm ? 'No se encontraron conversaciones que coincidan con la búsqueda.' : 'No hay interacciones registradas aún en el sistema.'}
                      </td>
                    </tr>
                  ) : (
                    filteredInteractions.map((log, index) => (
                      <tr key={index} className="hover:bg-[#FAF8F3] transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 bg-[#1C1B1A] text-white rounded-lg flex items-center justify-center font-mono font-bold text-[11px]">
                              {log.sender_phone.substring(0, 2)}
                            </span>
                            <div>
                              <p className="font-bold text-[#1C1B1A]">Cliente</p>
                              <p className="text-[10px] text-[#6E6B65] font-mono">+{log.sender_phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 max-w-xs text-[#1C1B1A]">
                          <p className="line-clamp-2">{log.message_text}</p>
                        </td>
                        <td className="py-3.5 px-3 max-w-sm text-[#6E6B65]">
                          <p className="line-clamp-2 italic">{log.response_text}</p>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                            parseFloat(log.api_cost) > 0 
                              ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30' 
                              : 'bg-stone-500/10 text-stone-700 border-stone-500/30'
                          }`}>
                            {parseFloat(log.api_cost) > 0 ? 'RESPUESTA IA' : 'HUMANO'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <p className="font-bold font-mono text-[#1C1B1A]">${parseFloat(log.api_cost).toFixed(6)}</p>
                          <p className="text-[10px] text-[#6E6B65] font-mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {mainView === 'configuracion' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 shadow-sm overflow-x-auto custom-scrollbar">
            <div className="flex items-center justify-between min-w-[750px] px-2 relative">
              {wizardSteps.map((step, idx) => {
                const isActive = configStep === step.num;
                const isCompleted = configStep > step.num;
                const hasNext = idx < wizardSteps.length - 1;

                return (
                  <React.Fragment key={step.num}>
                    <div 
                      onClick={() => setConfigStep(step.num)}
                      className="flex flex-col items-center gap-2 cursor-pointer z-10 group"
                    >
                      <div className="relative pt-1">
                        <div className={`w-4 h-1 mx-auto rounded-t-sm ${
                          isActive || isCompleted ? 'bg-[#C84B31]' : 'bg-[#E2DFD7]'
                        }`} />
                        <div className={`w-10 h-12 rounded-b-xl rounded-t-sm border-2 transition-all duration-300 relative overflow-hidden flex items-center justify-center ${
                          isActive 
                            ? 'border-[#C84B31] bg-[#FDF4F2] ring-4 ring-[#C84B31]/15 scale-105 shadow-sm' 
                            : isCompleted 
                            ? 'border-[#C84B31] bg-[#C84B31] text-white' 
                            : 'border-[#E2DFD7] bg-white hover:border-[#C84B31]/40'
                        }`}>
                          {isCompleted ? (
                            <span className="material-symbols-outlined text-[18px]">check</span>
                          ) : (
                            <span className={`font-mono text-xs font-bold ${isActive ? 'text-[#C84B31]' : 'text-[#1C1B1A]'}`}>
                              0{step.num}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <span className={`block text-xs font-bold ${isActive ? 'text-[#C84B31]' : 'text-[#1C1B1A]'}`}>
                          {step.title}
                        </span>
                        <span className="text-[10px] text-[#6E6B65] hidden sm:block font-mono">{step.desc}</span>
                      </div>
                    </div>

                    {hasNext && (
                      <div className="flex-1 mx-2 h-[2px] bg-[#E2DFD7] relative overflow-hidden -mt-6">
                        <div 
                          className="h-full bg-[#C84B31] transition-all duration-500" 
                          style={{ width: isCompleted ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {saveSuccess && (
            <div className="p-4 bg-[#15803d]/10 border border-[#15803d]/30 text-[#15803d] rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in font-mono">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              ¡Configuración del Agente IA guardada exitosamente en el sistema!
            </div>
          )}

          {configStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-[#E2DFD7]/60 pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C84B31] font-bold">Paso 01 / 05</span>
                  <h3 className="text-2xl font-display font-normal text-[#1C1B1A] mt-1">Identidad & Instrucciones (System Prompt)</h3>
                  <p className="text-xs text-[#6E6B65] mt-1">Define el rol, reglas de atención y tono de voz que la IA adoptará ante tus clientes.</p>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1B1A] flex items-center justify-between">
                      <span>System Prompt / Instrucciones Principales *</span>
                      <span className="text-[10px] text-[#C84B31] font-mono">Reglas Base</span>
                    </label>
                    <textarea
                      rows={7}
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Ej: Eres el asistente virtual de la Óptica Nuevo Horizonte. Saluda cordialmente, ofrece información de productos, consulta disponibilidad de citas y transfiere a un asesor humano si lo solicitan."
                      className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-2xl p-4 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] transition-all font-sans leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1B1A]">Tono de Voz del Bot</label>
                    <select
                      value={toneOfVoice}
                      onChange={(e) => setToneOfVoice(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl p-3 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] transition-all cursor-pointer font-bold"
                    >
                      <option value="Friendly">😊 Amistoso y Cercano (Recomendado)</option>
                      <option value="Professional">👔 Profesional / Ejecutivo</option>
                      <option value="Urgent">⚡ Directo e Informativo</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-[#E2DFD7]/60">
                    <span className="text-xs text-[#6E6B65] font-mono">Paso 1 de 5</span>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#1C1B1A] hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer border border-[#1C1B1A]"
                      >
                        Guardar Cambios
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfigStep(2)}
                        className="px-6 py-2.5 bg-[#C84B31] hover:bg-[#A83B25] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        Siguiente: Entrenamiento RAG
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#C84B31]">
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  <h4 className="font-display text-lg text-[#1C1B1A]">Guía de Identidad Wabi-Sabi</h4>
                </div>
                <p className="text-xs text-[#6E6B65] leading-relaxed">
                  Un prompt claro y conciso garantiza respuestas precisas. Evita sobrecargar con reglas contradictorias y utiliza un lenguaje natural.
                </p>
                <div className="space-y-3 pt-2 border-t border-[#E2DFD7]">
                  <div className="p-3.5 bg-[#FAF8F3] border border-[#E2DFD7] rounded-2xl text-xs space-y-1">
                    <span className="text-[10px] font-bold font-mono text-[#C84B31] uppercase block">💡 Consejo de Redacción</span>
                    <p className="text-[#1C1B1A]">Incluye el nombre comercial exacto, horarios de atención y el procedimiento de escalado cuando el cliente requiera un humano.</p>
                  </div>
                  <div className="p-3.5 bg-[#FAF8F3] border border-[#E2DFD7] rounded-2xl text-xs space-y-1">
                    <span className="text-[10px] font-bold font-mono text-[#6E6B65] uppercase block">🎯 Vista Previa del Tono</span>
                    <p className="text-[#1C1B1A] italic">"¡Hola! Bienvenido a {clientData?.name || 'nuestra empresa'}. ¿En qué podemos asesorarte el día de hoy?"</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {configStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-[#E2DFD7]/60 pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C84B31] font-bold">Paso 02 / 05</span>
                  <h3 className="text-2xl font-display font-normal text-[#1C1B1A] mt-1">Base de Conocimientos (Entrenamiento RAG)</h3>
                  <p className="text-xs text-[#6E6B65] mt-1">Sube documentos o sincroniza la carpeta de Google Drive para que la IA responda con datos exactos de tu negocio.</p>
                </div>

                <div className="p-5 bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1B1A] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-[#C84B31]">cloud_sync</span>
                      Sincronización Semántica de Google Drive
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncDrive}
                      disabled={syncingDrive || !driveFolderId}
                      className="px-4 py-2 bg-[#1C1B1A] text-white text-xs font-bold rounded-xl hover:bg-black transition cursor-pointer disabled:opacity-50"
                    >
                      {syncingDrive ? 'Sincronizando...' : 'Sincronizar BD'}
                    </button>
                  </div>
                  {syncResult && (
                    <div className="p-3 bg-[#15803d]/10 border border-[#15803d]/30 text-[#15803d] text-xs font-bold font-mono rounded-xl">
                      {syncResult}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-[#1C1B1A] block">Archivos de Entrenamiento Activos</label>
                  {loadingFiles ? (
                    <div className="p-4 text-center text-xs font-mono text-[#6E6B65] animate-pulse">Cargando documentos...</div>
                  ) : uploadedFiles.length === 0 ? (
                    <p className="p-4 text-xs text-[#6E6B65] italic text-center bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7]">
                      Aún no has subido documentos. ¡Sube un archivo de texto o PDF para entrenar a tu bot!
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-[#FAF8F3] rounded-xl border border-[#E2DFD7] text-xs">
                          <span className="font-medium text-[#1C1B1A] truncate pr-2">📄 {file.name}</span>
                          <span className="px-2 py-0.5 text-[10px] font-mono bg-white border border-[#E2DFD7] rounded-md shrink-0">
                            {file.mimeType.includes('pdf') ? 'PDF' : 'DOC'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center justify-center p-4 border-2 border-dashed border-[#C84B31]/40 hover:border-[#C84B31] bg-[#FAF8F3] rounded-2xl cursor-pointer text-xs font-bold text-[#C84B31] transition-all gap-2">
                    <span className="material-symbols-outlined text-[20px]">upload_file</span>
                    <span>{uploadingFile ? 'Subiendo y vectorizando...' : 'Subir nuevo archivo de entrenamiento (PDF, TXT, DOCX)'}</span>
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx"
                      className="hidden"
                      disabled={uploadingFile || syncingDrive}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#E2DFD7]/60">
                  <button
                    type="button"
                    onClick={() => setConfigStep(1)}
                    className="px-5 py-2.5 border border-[#E2DFD7] text-[#1C1B1A] text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigStep(3)}
                    className="px-6 py-2.5 bg-[#C84B31] hover:bg-[#A83B25] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    Siguiente: Asesores Humanos
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#C84B31]">
                  <span className="material-symbols-outlined text-[20px]">menu_book</span>
                  <h4 className="font-display text-lg text-[#1C1B1A]">Base RAG & Conocimiento</h4>
                </div>
                <p className="text-xs text-[#6E6B65] leading-relaxed">
                  El motor RAG procesa tus catálogos, listas de precios y FAQs para que la IA responda preguntas complejas sobre tus productos o servicios.
                </p>
                <div className="space-y-3 pt-2 border-t border-[#E2DFD7]">
                  <div className="p-3.5 bg-[#FAF8F3] border border-[#E2DFD7] rounded-2xl text-xs space-y-1">
                    <span className="text-[10px] font-bold font-mono text-[#C84B31] uppercase block">📑 Formatos Admitidos</span>
                    <p className="text-[#1C1B1A]">Archivos PDF con texto seleccionable, documentos TXT plano y manuales comerciales DOCX.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {configStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-[#E2DFD7]/60 pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C84B31] font-bold">Paso 03 / 05</span>
                  <h3 className="text-2xl font-display font-normal text-[#1C1B1A] mt-1">Gestión de Asesores Humanos (Cascada)</h3>
                  <p className="text-xs text-[#6E6B65] mt-1">Registra a los colaboradores que recibirán los chats cuando el cliente solicite atención humana.</p>
                </div>

                <div className="space-y-3">
                  {loadingAgents ? (
                    <div className="p-4 text-center text-xs font-mono text-[#6E6B65] animate-pulse">Cargando asesores...</div>
                  ) : agents.length === 0 ? (
                    <p className="p-4 text-xs text-[#6E6B65] italic text-center bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7]">
                      No has registrado asesores para el traspaso de llamadas. ¡Agrega uno abajo!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {agents.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between p-3.5 bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7] text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 bg-[#1C1B1A] text-white rounded-lg flex items-center justify-center font-mono font-bold text-xs">
                              {agent.priority}
                            </span>
                            <div>
                              <p className="font-bold text-[#1C1B1A]">{agent.name}</p>
                              <p className="text-[10px] text-[#6E6B65] font-mono">+{agent.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAgentStatus(agent.id, agent.status)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition ${
                                agent.status === 'online'
                                  ? 'bg-[#15803d]/10 text-[#15803d] border border-[#15803d]/30'
                                  : 'bg-stone-500/10 text-stone-600 border border-stone-500/30'
                              }`}
                            >
                              {agent.status === 'online' ? '● En Línea' : '○ Ausente'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="px-2.5 py-1 text-[#C84B31] border border-[#C84B31]/30 hover:bg-[#C84B31] hover:text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddAgent} className="p-5 bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7] space-y-4">
                  <span className="text-xs font-bold text-[#1C1B1A] block">Agregar Asesor de WhatsApp</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <input
                      type="text"
                      required
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="Nombre (ej. Carlos Cantos)"
                      className="bg-white border border-[#E2DFD7] rounded-xl px-3 py-2.5 text-[#1C1B1A] outline-none"
                    />
                    <input
                      type="text"
                      required
                      value={newAgentPhone}
                      onChange={(e) => setNewAgentPhone(e.target.value)}
                      placeholder="Teléfono (ej. 573009998888)"
                      className="bg-white border border-[#E2DFD7] rounded-xl px-3 py-2.5 text-[#1C1B1A] outline-none font-mono"
                    />
                    <input
                      type="number"
                      min="1"
                      required
                      value={newAgentPriority}
                      onChange={(e) => setNewAgentPriority(parseInt(e.target.value) || 1)}
                      className="bg-white border border-[#E2DFD7] rounded-xl px-3 py-2.5 text-[#1C1B1A] outline-none font-mono"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newAgentName || !newAgentPhone}
                      className="px-5 py-2 bg-[#1C1B1A] text-white text-xs font-bold rounded-xl hover:bg-black transition cursor-pointer disabled:opacity-50"
                    >
                      + Agregar Asesor
                    </button>
                  </div>
                </form>

                <div className="flex justify-between items-center pt-4 border-t border-[#E2DFD7]/60">
                  <button
                    type="button"
                    onClick={() => setConfigStep(2)}
                    className="px-5 py-2.5 border border-[#E2DFD7] text-[#1C1B1A] text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigStep(4)}
                    className="px-6 py-2.5 bg-[#C84B31] hover:bg-[#A83B25] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    Siguiente: Notas de Voz
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#C84B31]">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                  <h4 className="font-display text-lg text-[#1C1B1A]">Escalamiento en Cascada</h4>
                </div>
                <p className="text-xs text-[#6E6B65] leading-relaxed">
                  Cuando la IA detecte que un cliente solicita un humano, derivará el contacto al primer asesor disponible respetando el número de prioridad.
                </p>
              </div>
            </div>
          )}

          {configStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-[#E2DFD7]/60 pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C84B31] font-bold">Paso 04 / 05</span>
                  <h3 className="text-2xl font-display font-normal text-[#1C1B1A] mt-1">Notas de Voz Pregrabadas (Audios)</h3>
                  <p className="text-xs text-[#6E6B65] mt-1">Sube archivos de audio (MP3, WAV, OGG). Frant los enviará como notas de voz nativas en WhatsApp.</p>
                </div>

                <div className="space-y-3">
                  {loadingAudios ? (
                    <div className="p-4 text-center text-xs font-mono text-[#6E6B65] animate-pulse">Cargando notas de voz...</div>
                  ) : audios.length === 0 ? (
                    <p className="p-4 text-xs text-[#6E6B65] italic text-center bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7]">
                      Aún no has subido notas de voz pregrabadas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {audios.map((audio) => (
                        <div key={audio.fileName} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7] gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1C1B1A]">🎙️ '{audio.tag}'</span>
                            <span className="text-[10px] text-[#6E6B65] font-mono">({(audio.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
                            <audio src={audio.url} controls className="h-7 w-48" />
                            <button
                              type="button"
                              onClick={() => handleDeleteAudio(audio.fileName)}
                              className="px-2.5 py-1 text-[#C84B31] border border-[#C84B31]/30 hover:bg-[#C84B31] hover:text-white rounded-xl text-[10px] font-bold transition cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleUploadAudio} className="p-5 bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7] space-y-4">
                  <span className="text-xs font-bold text-[#1C1B1A] block">Subir Nueva Nota de Voz</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <input
                      type="text"
                      required
                      value={newAudioTag}
                      onChange={(e) => setNewAudioTag(e.target.value)}
                      placeholder="Etiqueta (ej. bienvenida, horarios)"
                      className="bg-white border border-[#E2DFD7] rounded-xl px-3 py-2.5 text-[#1C1B1A] outline-none"
                    />
                    <input
                      type="file"
                      required
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      className="bg-white border border-[#E2DFD7] rounded-xl px-3 py-2.5 text-[#1C1B1A] outline-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={uploadingAudio || !newAudioTag || !audioFile}
                      className="px-5 py-2 bg-[#1C1B1A] text-white text-xs font-bold rounded-xl hover:bg-black transition cursor-pointer disabled:opacity-50"
                    >
                      {uploadingAudio ? 'Subiendo...' : 'Subir Audio'}
                    </button>
                  </div>
                </form>

                <div className="flex justify-between items-center pt-4 border-t border-[#E2DFD7]/60">
                  <button
                    type="button"
                    onClick={() => setConfigStep(3)}
                    className="px-5 py-2.5 border border-[#E2DFD7] text-[#1C1B1A] text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfigStep(5)}
                    className="px-6 py-2.5 bg-[#C84B31] hover:bg-[#A83B25] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    Siguiente: Canal WhatsApp
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#C84B31]">
                  <span className="material-symbols-outlined text-[20px]">mic</span>
                  <h4 className="font-display text-lg text-[#1C1B1A]">Respuestas por Audio</h4>
                </div>
                <p className="text-xs text-[#6E6B65] leading-relaxed">
                  Las notas de voz generan mayor cercanía con tus clientes. Puedes subir respuestas previamente grabadas con tono profesional.
                </p>
              </div>
            </div>
          )}

          {configStep === 5 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-[#E2DFD7]/60 pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C84B31] font-bold">Paso 05 / 05</span>
                  <h3 className="text-2xl font-display font-normal text-[#1C1B1A] mt-1">Vinculación de Canal WhatsApp</h3>
                  <p className="text-xs text-[#6E6B65] mt-1">Escanea el código QR desde tu aplicación móvil de WhatsApp para conectar la Inteligencia Artificial.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center p-6 bg-[#FAF8F3] rounded-2xl border border-[#E2DFD7]">
                  <div className="w-48 h-48 bg-white border border-[#E2DFD7] rounded-2xl flex items-center justify-center p-3 overflow-hidden shadow-sm shrink-0">
                    {isWaConnected ? (
                      <div className="text-center text-xs text-[#15803d]">
                        <span className="material-symbols-outlined text-[48px] text-[#15803d]">verified</span>
                        <p className="font-bold mt-1">DISPOSITIVO VINCULADO</p>
                      </div>
                    ) : whatsappStatus.status === 'QR' ? (
                      <img
                        alt="Código QR de WhatsApp"
                        className="w-full h-full object-cover"
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappStatus.qr)}`}
                      />
                    ) : (
                      <div className="text-center text-xs text-[#6E6B65]">
                        <button
                          type="button"
                          onClick={handleConnectWhatsApp}
                          className="px-4 py-2 bg-[#C84B31] text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Generar Código QR
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 text-xs flex-1">
                    <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2">
                      <span className="text-[#6E6B65]">Estado del Canal:</span>
                      <span className={`font-bold font-mono ${isWaConnected ? 'text-[#15803d]' : 'text-[#C84B31]'}`}>
                        {isWaConnected ? '● CONECTADO' : '○ PENDIENTE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#6E6B65]">Línea Asignada:</span>
                      <span className="font-bold font-mono text-[#1C1B1A]">+{clientData?.phoneNumber}</span>
                    </div>

                    {isWaConnected && (
                      <button
                        type="button"
                        onClick={handleDisconnectWhatsApp}
                        className="w-full mt-2 py-2.5 border border-[#C84B31] text-[#C84B31] hover:bg-[#C84B31] hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Desvincular WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#E2DFD7]/60">
                  <button
                    type="button"
                    onClick={() => setConfigStep(4)}
                    className="px-5 py-2.5 border border-[#E2DFD7] text-[#1C1B1A] text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainView('resultados')}
                    className="px-7 py-3 bg-[#C84B31] hover:bg-[#A83B25] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    Ver Resultados & Conversaciones
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#C84B31]">
                  <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  <h4 className="font-display text-lg text-[#1C1B1A]">Instrucciones de Vinculación</h4>
                </div>
                <div className="space-y-3 text-xs text-[#6E6B65]">
                  <p>1. Abre WhatsApp en tu dispositivo móvil.</p>
                  <p>2. Ve a <strong>Ajustes &gt; Dispositivos vinculados</strong>.</p>
                  <p>3. Presiona <strong>Vincular un dispositivo</strong> y apunta la cámara al código QR.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
