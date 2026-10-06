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
    clientId,
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
    isEditingPhone,
    setIsEditingPhone,
    tempPhone,
    setTempPhone,
    handleSavePhoneNumber,
    interactions,
    metrics,
    saveSuccess,
    handleSaveConfig,
  } = props;

  // Panel Principal: 'configuracion' vs 'resultados'
  const [mainView, setMainView] = useState<'configuracion' | 'resultados'>('resultados');
  
  // Paso dentro de la Configuración Wizard (1 a 5)
  const [configStep, setConfigStep] = useState<number>(1);

  // Modo de Canal de WhatsApp: 'meta' (Oficial Cloud API Tech Provider) vs 'qr' (Puppeteer / QR)
  const [channelMode] = useState<'meta' | 'qr'>('meta');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState<string>(clientData?.metaPhoneNumberId || clientData?.meta_phone_number_id || '1325606987308762');
  const [metaWabaId, setMetaWabaId] = useState<string>(clientData?.metaWabaId || clientData?.meta_waba_id || '1415552803364935');
  const [metaToken, setMetaToken] = useState<string>(clientData?.metaWaToken || clientData?.meta_wa_token || '');

  // Directorio de Clientes Registrados en el CRM
  const [crmCustomers, setCrmCustomers] = useState<Array<{ id?: string; name: string; last_name?: string; phone?: string; email?: string }>>([]);

  React.useEffect(() => {
    if (!clientId) return;
    fetch(`/api/clients/${clientId}/crm-customers`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.customers)) {
          setCrmCustomers(data.customers);
        } else if (Array.isArray(data)) {
          setCrmCustomers(data);
        }
      })
      .catch(err => console.error('[CRM Directory] Error cargando directorio de clientes:', err));
  }, [clientId]);

  // Función para obtener el Nombre del Cliente si el número está registrado en el CRM
  const getCustomerDisplayName = React.useCallback((phoneStr: string) => {
    if (!phoneStr) return { isRegistered: false, name: 'Cliente' };
    const cleanPhone = phoneStr.replace(/\D/g, '');
    if (!cleanPhone) return { isRegistered: false, name: 'Cliente' };

    const match = crmCustomers.find(c => {
      if (!c.phone) return false;
      const cleanC = c.phone.replace(/\D/g, '');
      if (!cleanC) return false;
      return cleanC.slice(-10) === cleanPhone.slice(-10);
    });

    if (match) {
      const fullName = `${match.name || ''} ${match.last_name || ''}`.trim();
      return { isRegistered: true, name: fullName || match.name || `Cliente (+${cleanPhone})` };
    }

    return { isRegistered: false, name: `Cliente (+${cleanPhone})` };
  }, [crmCustomers]);

  // Filtros e Hilos de Conversaciones agrupadas por teléfono
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [selectedThreadPhone, setSelectedThreadPhone] = useState<string | null>(null);

  // Filtros internos dentro del Modal de Conversación individual
  const [modalDateFilter, setModalDateFilter] = useState<string>('');
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');

  const groupedThreads = React.useMemo(() => {
    const map = new Map<string, Interaction[]>();
    
    (interactions || []).forEach(item => {
      const phone = item.sender_phone || 'Desconocido';
      if (!map.has(phone)) {
        map.set(phone, []);
      }
      map.get(phone)!.push(item);
    });

    const threads: Array<{
      phone: string;
      messages: Interaction[];
      lastTimestamp: string;
      totalCost: number;
      lastMessageText: string;
      lastResponseText: string;
    }> = [];

    map.forEach((items, phone) => {
      const sorted = [...items].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const lastItem = sorted[sorted.length - 1];
      const totalCost = sorted.reduce((sum, i) => sum + (parseFloat(i.api_cost) || 0), 0);

      threads.push({
        phone,
        messages: sorted,
        lastTimestamp: lastItem.timestamp,
        totalCost,
        lastMessageText: lastItem.message_text,
        lastResponseText: lastItem.response_text
      });
    });

    return threads;
  }, [interactions]);

  const filteredThreads = React.useMemo(() => {
    const now = Date.now();

    return groupedThreads.filter(thread => {
      const clientInfo = getCustomerDisplayName(thread.phone);
      const matchesSearch = !searchTerm || 
        thread.phone.includes(searchTerm) ||
        clientInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.messages.some(m => 
          m.message_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
          m.response_text.toLowerCase().includes(searchTerm.toLowerCase())
        );

      if (!matchesSearch) return false;

      // Filtro por fecha específica del calendario (YYYY-MM-DD)
      if (specificDate) {
        const hasDateMatch = thread.messages.some(m => {
          const mDate = new Date(m.timestamp);
          if (isNaN(mDate.getTime())) return false;
          const yyyymmdd = mDate.toISOString().split('T')[0];
          return yyyymmdd === specificDate;
        });
        if (!hasDateMatch) return false;
      }

      if (dateFilter === 'all') return true;

      const threadTime = new Date(thread.lastTimestamp).getTime();
      if (isNaN(threadTime)) return true;
      const diffHours = (now - threadTime) / (1000 * 60 * 60);

      if (dateFilter === 'today') return diffHours <= 24;
      if (dateFilter === '7days') return diffHours <= 24 * 7;
      if (dateFilter === '30days') return diffHours <= 24 * 30;

      return true;
    }).sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }, [groupedThreads, searchTerm, dateFilter, specificDate]);

  const activeThread = React.useMemo(() => {
    if (!selectedThreadPhone) return null;
    return groupedThreads.find(t => t.phone === selectedThreadPhone) || null;
  }, [groupedThreads, selectedThreadPhone]);

  const wizardSteps = [
    { num: 1, title: 'Identidad & Prompt', desc: 'Rol y tono del bot' },
    { num: 2, title: 'Entrenamiento RAG', desc: 'Documentos y Drive' },
    { num: 3, title: 'Asesores Humanos', desc: 'Traspaso y cascada' },
    { num: 4, title: 'Notas de Voz', desc: 'Audios pregrabados' },
    { num: 5, title: 'Canal WhatsApp', desc: 'Meta Cloud API' },
  ];

  return (
    <div className="space-y-8 text-[#161616] font-sans max-w-[1400px] mx-auto pb-12">
      <div className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E2DFD7]/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#D9381E]/10 text-[#D9381E] border border-[#D9381E]/20">
                Agente IA Frant
              </span>
              <span className="text-xs text-[#6B6862] font-mono">• {clientData?.name}</span>
            </div>
            <h2 className="text-3xl font-serif font-normal text-[#161616] mt-1 flex items-center gap-3">
              Módulo de Inteligencia Artificial
            </h2>
            <p className="text-xs text-[#6B6862] mt-1 max-w-2xl">
              Gestiona el comportamiento del bot en el panel de configuración o consulta el historial de conversaciones y métricas de rendimiento en tiempo real.
            </p>
          </div>

          <div className="flex gap-2 p-1.5 bg-[#FAF8F3] rounded-[4px] border border-[#E2DFD7] shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setMainView('resultados')}
              className={`px-5 py-2.5 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainView === 'resultados' 
                  ? 'bg-[#D9381E] text-white shadow-sm' 
                  : 'text-[#6B6862] hover:text-[#161616]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">query_stats</span>
              📊 Resultados & Conversaciones
            </button>

            <button
              type="button"
              onClick={() => setMainView('configuracion')}
              className={`px-5 py-2.5 rounded-[4px] text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                mainView === 'configuracion' 
                  ? 'bg-[#D9381E] text-white shadow-sm' 
                  : 'text-[#6B6862] hover:text-[#161616]'
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
            <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                ROI DE AUTOMATIZACIÓN
              </span>
              <div className="text-3xl font-serif text-[#D9381E] mt-2 font-normal">
                +{metrics.roi > 0 ? metrics.roi.toFixed(1) : '250.0'}%
              </div>
              <span className="text-[11px] text-[#6B6862] mt-1 block">Eficiencia estimada del negocio</span>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                CHATS ATENDIDOS
              </span>
              <div className="text-3xl font-serif text-[#161616] mt-2 font-normal">
                {metrics.totalChats}
              </div>
              <span className="text-[11px] text-[#6B6862] mt-1 block">
                Costo acumulado: ${metrics.totalCost.toFixed(4)} USD
              </span>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                TIEMPO AHORRADO
              </span>
              <div className="text-3xl font-serif text-[#161616] mt-2 font-normal">
                {metrics.hoursSaved.toFixed(1)} <span className="text-sm text-[#6B6862] font-sans">Horas</span>
              </div>
              <span className="text-[11px] text-[#6B6862] mt-1 block">Trabajo humano delegado al Bot</span>
            </div>

            <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                CANAL WHATSAPP
              </span>
              <div className="text-xl font-bold mt-2 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isWaConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className={isWaConnected ? 'text-emerald-700 font-mono font-bold uppercase' : 'text-amber-700 font-mono font-bold uppercase'}>
                  {isWaConnected ? 'CONECTADO' : 'PENDIENTE'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#6E6B65] mt-1 block">+{clientData?.phoneNumber}</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E2DFD7]/60 pb-4">
              <div>
                <h3 className="text-2xl font-display text-[#1C1B1A] font-normal">Historial de Conversaciones por Cliente</h3>
                <p className="text-xs text-[#6E6B65]">Agrupado por número telefónico. Haz clic en un cliente para abrir su hilo de chat completo.</p>
              </div>

              {/* Filtros de Búsqueda y Fecha */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-56">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#6E6B65]">search</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar teléfono o mensaje..."
                    className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] transition-all"
                  />
                </div>

                {/* Filtro por Fecha Calendario */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl px-3 py-2 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] font-mono cursor-pointer"
                    title="Filtrar por fecha exacta"
                  />
                  {specificDate && (
                    <button
                      type="button"
                      onClick={() => setSpecificDate('')}
                      className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Limpiar fecha"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={dateFilter}
                  onChange={(e: any) => setDateFilter(e.target.value)}
                  className="w-full sm:w-auto bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl px-3 py-2 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] font-medium cursor-pointer"
                >
                  <option value="all">📅 Todas las fechas</option>
                  <option value="today">⚡ Últimas 24 horas</option>
                  <option value="7days">🗓️ Últimos 7 días</option>
                  <option value="30days">📆 Últimos 30 días</option>
                </select>
              </div>
            </div>

            {/* Tabla Agrupada por Número Telefónico */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2DFD7] text-[#6E6B65] font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Cliente / Teléfono</th>
                    <th className="py-3 px-3">Último Mensaje Recibido</th>
                    <th className="py-3 px-3">Última Respuesta IA</th>
                    <th className="py-3 px-3 text-center">Interacciones</th>
                    <th className="py-3 px-3 text-right">Costo Acumulado / Hora</th>
                    <th className="py-3 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7]">
                  {filteredThreads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-[#6E6B65] italic">
                        {searchTerm || dateFilter !== 'all' 
                          ? 'No se encontraron conversaciones que coincidan con los filtros.' 
                          : 'No hay interacciones registradas aún en el sistema.'}
                      </td>
                    </tr>
                  ) : (
                    filteredThreads.map((thread) => {
                      const clientInfo = getCustomerDisplayName(thread.phone);
                      return (
                        <tr 
                          key={thread.phone} 
                          onClick={() => setSelectedThreadPhone(thread.phone)}
                          className="hover:bg-[#FAF8F3] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 bg-[#1C1B1A] text-white rounded-xl flex items-center justify-center font-mono font-bold text-[11px] group-hover:bg-[#C84B31] transition-colors">
                                {clientInfo.isRegistered ? clientInfo.name.substring(0, 2).toUpperCase() : thread.phone.substring(0, 2)}
                              </span>
                              <div>
                                <p className="font-bold text-[#1C1B1A] flex items-center gap-1.5">
                                  {clientInfo.name}
                                  {clientInfo.isRegistered ? (
                                    <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md border border-emerald-300">
                                      ✓ CRM
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono font-normal text-[#0866FF] bg-[#0866FF]/10 px-1.5 py-0.2 rounded-md">
                                      +{thread.phone}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-[#6E6B65] font-mono">
                                  {clientInfo.isRegistered ? `+${thread.phone} • ` : ''}
                                  {new Date(thread.lastTimestamp).toLocaleDateString()} • {new Date(thread.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </td>

                        <td className="py-3.5 px-3 max-w-xs text-[#1C1B1A]">
                          <p className="line-clamp-2">{thread.lastMessageText}</p>
                        </td>

                        <td className="py-3.5 px-3 max-w-xs text-[#6E6B65]">
                          <p className="line-clamp-2 italic">{thread.lastResponseText}</p>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#FAF8F3] border border-[#E2DFD7] text-[#1C1B1A]">
                            💬 {thread.messages.length} {thread.messages.length === 1 ? 'mensaje' : 'mensajes'}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono">
                          <p className="font-bold text-[#1C1B1A]">${thread.totalCost.toFixed(6)} USD</p>
                          <p className="text-[10px] text-[#6E6B65]">Acumulado</p>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedThreadPhone(thread.phone);
                            }}
                            className="px-3 py-1.5 bg-[#1C1B1A] group-hover:bg-[#C84B31] text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[14px]">chat</span>
                            <span>Ver Hilo</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal / Drawer de Hilo de Conversación Completo por Cliente */}
          {activeThread && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#E2DFD7] overflow-hidden">
                
                {/* Header del Chat con Filtros Internos */}
                <div className="p-5 border-b border-[#E2DFD7] bg-[#FAF8F3] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const activeClientInfo = getCustomerDisplayName(activeThread.phone);
                        return (
                          <>
                            <span className="w-10 h-10 bg-[#C84B31] text-white rounded-2xl flex items-center justify-center font-mono font-bold text-sm shadow-sm">
                              {activeClientInfo.isRegistered ? activeClientInfo.name.substring(0, 2).toUpperCase() : activeThread.phone.substring(0, 2)}
                            </span>
                            <div>
                              <h4 className="font-bold text-base text-[#1C1B1A] flex items-center gap-2">
                                <span>Historial de Conversación:</span>
                                <span className="text-[#C84B31]">{activeClientInfo.name}</span>
                                {activeClientInfo.isRegistered && (
                                  <span className="text-[11px] font-mono text-[#6E6B65] font-normal">
                                    (+{activeThread.phone})
                                  </span>
                                )}
                              </h4>
                              <p className="text-xs text-[#6E6B65] font-mono flex items-center gap-2">
                                <span>💬 {activeThread.messages.length} mensajes en total</span>
                                <span>•</span>
                                <span className="text-[#0866FF] font-bold">Costo total: ${activeThread.totalCost.toFixed(6)} USD</span>
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedThreadPhone(null);
                        setModalDateFilter('');
                        setModalSearchTerm('');
                      }}
                      className="w-8 h-8 rounded-full bg-white border border-[#E2DFD7] hover:bg-[#C84B31] hover:text-white transition flex items-center justify-center text-[#1C1B1A] font-bold text-sm cursor-pointer shadow-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Barra de Filtros Internos por Fecha y Texto en la Ventana Modal */}
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-[#E2DFD7]/60">
                    <div className="relative flex-1 w-full">
                      <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-[#6E6B65]">search</span>
                      <input
                        type="text"
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        placeholder="Buscar palabra clave en esta conversación..."
                        className="w-full bg-white border border-[#E2DFD7] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <span className="text-[11px] font-bold text-[#6E6B65] whitespace-nowrap">Filtrar Fecha:</span>
                      <input
                        type="date"
                        value={modalDateFilter}
                        onChange={(e) => setModalDateFilter(e.target.value)}
                        className="bg-white border border-[#E2DFD7] rounded-xl px-2.5 py-1.5 text-xs text-[#1C1B1A] outline-none focus:border-[#C84B31] font-mono cursor-pointer"
                        title="Filtrar mensajes por fecha"
                      />
                      {(modalDateFilter || modalSearchTerm) && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalDateFilter('');
                            setModalSearchTerm('');
                          }}
                          className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cuerpo de la Conversación (Bubbles Estilo Chat Filtrados por Fecha) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAF8F3]/50 custom-scrollbar">
                  {(() => {
                    const filteredModalMessages = activeThread.messages.filter(msg => {
                      const matchesSearch = !modalSearchTerm || 
                        msg.message_text.toLowerCase().includes(modalSearchTerm.toLowerCase()) || 
                        msg.response_text.toLowerCase().includes(modalSearchTerm.toLowerCase());

                      if (!matchesSearch) return false;

                      if (modalDateFilter) {
                        const mDate = new Date(msg.timestamp);
                        if (isNaN(mDate.getTime())) return false;
                        const yyyymmdd = mDate.toISOString().split('T')[0];
                        return yyyymmdd === modalDateFilter;
                      }

                      return true;
                    });

                    if (filteredModalMessages.length === 0) {
                      return (
                        <div className="text-center py-12 space-y-3">
                          <span className="material-symbols-outlined text-[42px] text-[#6E6B65]">event_busy</span>
                          <p className="text-xs text-[#6E6B65] font-medium">
                            No se encontraron mensajes para la fecha o palabra seleccionada en este hilo.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setModalDateFilter(''); setModalSearchTerm(''); }}
                            className="px-3 py-1.5 bg-[#1C1B1A] text-white text-xs font-bold rounded-xl cursor-pointer"
                          >
                            Mostrar Todos los Mensajes
                          </button>
                        </div>
                      );
                    }

                    return filteredModalMessages.map((msg, idx) => (
                      <div key={idx} className="space-y-3">
                        
                        {/* Burbuja del Cliente (Mensaje Entrante) */}
                        <div className="flex items-start gap-2.5 max-w-[85%]">
                          <div className="w-7 h-7 bg-[#1C1B1A] text-white rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-1">
                            {activeThread.phone.substring(0, 2)}
                          </div>
                          <div className="bg-white border border-[#E2DFD7] rounded-2xl rounded-tl-none p-4 shadow-sm text-xs space-y-1">
                            <div className="flex items-center justify-between gap-4 text-[10px] text-[#6E6B65] border-b border-[#E2DFD7]/40 pb-1 mb-1 font-mono">
                              <span className="font-bold text-[#1C1B1A]">
                                {getCustomerDisplayName(activeThread.phone).name} {getCustomerDisplayName(activeThread.phone).isRegistered ? `(+${activeThread.phone})` : ''}
                              </span>
                              <span>{new Date(msg.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-[#1C1B1A] leading-relaxed whitespace-pre-wrap">{msg.message_text}</p>
                          </div>
                        </div>

                        {/* Burbuja de la IA (Respuesta Generada) */}
                        <div className="flex items-start gap-2.5 max-w-[85%] ml-auto flex-row-reverse">
                          <div className="w-7 h-7 bg-[#0866FF] text-white rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-1 shadow-sm">
                            IA
                          </div>
                          <div className="bg-[#0866FF]/5 border border-[#0866FF]/20 rounded-2xl rounded-tr-none p-4 shadow-sm text-xs space-y-1">
                            <div className="flex items-center justify-between gap-4 text-[10px] text-[#0866FF] border-b border-[#0866FF]/20 pb-1 mb-1 font-mono">
                              <span className="font-bold flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-[#0866FF]"></span>
                                Agente IA Frant
                              </span>
                              <span>Costo: ${parseFloat(msg.api_cost || '0').toFixed(6)} USD</span>
                            </div>
                            <p className="text-[#1C1B1A] leading-relaxed whitespace-pre-wrap font-sans">{msg.response_text}</p>
                          </div>
                        </div>

                      </div>
                    ));
                  })()}
                </div>

                {/* Footer del Modal */}
                <div className="p-4 border-t border-[#E2DFD7] bg-white flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedThreadPhone(null);
                      setModalDateFilter('');
                      setModalSearchTerm('');
                    }}
                    className="px-5 py-2 bg-[#1C1B1A] hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cerrar Conversación
                  </button>
                </div>

              </div>
            </div>
          )}
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
                      placeholder="Ej: Eres el asistente virtual de la empresa. Saluda cordialmente, ofrece información de productos, consulta disponibilidad de citas y transfiere a un asesor humano si lo solicitan."
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
                
                {/* Cabecera del Paso 5 */}
                <div className="border-b border-[#E2DFD7]/60 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#C84B31] font-bold">Paso 05 / 05</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#0866FF]/10 text-[#0866FF] border border-[#0866FF]/30 flex items-center gap-1">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      API Oficial de Meta
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-display font-normal text-[#1C1B1A]">Vinculación de Canal WhatsApp</h3>
                </div>

                {/* VISTA 1: META CLOUD API (TECH PROVIDER / EMBEDDED SIGNUP) */}
                {channelMode === 'meta' && (
                  <div className="space-y-5">
                    <div className="p-5 bg-[#0866FF]/5 border border-[#0866FF]/20 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-[#0866FF]">
                        <span className="material-symbols-outlined text-[22px]">verified_user</span>
                        <h4 className="font-bold text-sm">Conexión Oficial Meta Cloud API (Embedded Signup)</h4>
                      </div>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        Conecta tu número corporativo de WhatsApp Business directamente mediante la plataforma oficial de Meta. No requiere tener teléfono celular encendido ni escanear códigos QR.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          const metaAppId = '1534078441779001';
                          const redirectUri = encodeURIComponent('https://frant.app/api/v1/meta/oauth/callback');
                          const metaUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirectUri}&scope=whatsapp_business_messaging,whatsapp_business_management&response_type=code`;
                          window.open(metaUrl, '_blank', 'width=600,height=700');
                        }}
                        className="w-full py-3.5 bg-[#0866FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2.5 transition cursor-pointer shadow-md"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span>Conectar con Facebook (Inicio de Sesión Meta)</span>
                      </button>
                    </div>

                    {/* Formulario de Configuración Manual de Credenciales de Meta */}
                    <div className="p-5 bg-[#FAF8F3] border border-[#E2DFD7] rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#1C1B1A]">Credenciales Directas de Meta Cloud API</span>
                        <span className="text-[10px] font-mono text-[#6E6B65]">Graph API v20.0</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-[#475569] block mb-1">Phone Number ID de Meta</label>
                          <input
                            type="text"
                            value={metaPhoneNumberId}
                            onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                            placeholder="Ej. 102938475612345"
                            className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-[#1C1B1A] font-mono outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-[#475569] block mb-1">WABA ID (WhatsApp Business Account)</label>
                          <input
                            type="text"
                            value={metaWabaId}
                            onChange={(e) => setMetaWabaId(e.target.value)}
                            placeholder="Ej. 109876543210987"
                            className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-[#1C1B1A] font-mono outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#475569] block mb-1">Token de Acceso Permanente (EAAG...)</label>
                        <input
                          type="password"
                          value={metaToken}
                          onChange={(e) => setMetaToken(e.target.value)}
                          placeholder="EAAG..."
                          className="w-full bg-white border border-[#E2DFD7] rounded-xl px-3 py-2 text-[#1C1B1A] font-mono outline-none"
                        />
                      </div>

                      {/* Botones de Guardar & Activar Registro */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#E2DFD7]/60">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/clients/${clientId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  meta_phone_number_id: metaPhoneNumberId,
                                  meta_waba_id: metaWabaId,
                                  meta_wa_token: metaToken
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert('✅ Credenciales de Meta Cloud API guardadas y vinculadas exitosamente.');
                              } else {
                                alert(`❌ Error: ${data.message || data.error}`);
                              }
                            } catch (err: any) {
                              alert(`❌ Error: ${err.message}`);
                            }
                          }}
                          className="flex-1 py-2.5 bg-[#1C1B1A] hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">save</span>
                          <span>Guardar Credenciales de Meta</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/v1/meta/register-number', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  phoneNumberId: metaPhoneNumberId,
                                  token: metaToken,
                                  pin: '123456'
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                alert('🟢 ¡Número de teléfono registrado y ACTIVADO exitosamente en Meta Cloud API!');
                              } else {
                                alert(`❌ Error: ${data.error}`);
                              }
                            } catch (err: any) {
                              alert(`❌ Error: ${err.message}`);
                            }
                          }}
                          className="flex-1 py-2.5 bg-[#0866FF] hover:bg-[#0052cc] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Registrar Número en Meta API</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* VISTA 2: MODO CÓDIGO QR (PUPPETEER / LOCALAUTH) */}
                {channelMode === 'qr' && (
                  <div className="space-y-5">
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

                      <div className="space-y-3.5 text-xs flex-1">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2">
                          <span className="text-[#6E6B65]">Estado del Canal:</span>
                          <span className={`font-bold font-mono ${isWaConnected ? 'text-[#15803d]' : 'text-[#C84B31]'}`}>
                            {isWaConnected ? '● CONECTADO' : whatsappStatus.status === 'QR' ? '○ ESPERANDO ESCANEO (QR)' : whatsappStatus.status === 'INITIALIZING' ? '⏳ INICIALIZANDO...' : '○ DESCONECTADO'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2">
                          <span className="text-[#6E6B65]">Línea Asignada:</span>
                          {!isEditingPhone ? (
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-[#1C1B1A]">
                                {clientData?.phoneNumber ? `+${clientData.phoneNumber}` : 'Sin asignar'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempPhone(clientData?.phoneNumber || '');
                                  setIsEditingPhone(true);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold text-[#C84B31] border border-[#C84B31]/30 hover:bg-[#C84B31] hover:text-white rounded transition cursor-pointer"
                              >
                                ✏️ Editar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={tempPhone}
                                onChange={(e) => setTempPhone(e.target.value)}
                                placeholder="Ej. 573046247664"
                                className="w-32 bg-white border border-[#E2DFD7] rounded px-2 py-1 text-xs font-mono text-[#1C1B1A] outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleSavePhoneNumber}
                                className="px-2.5 py-1 bg-[#15803d] text-white text-[10px] font-bold rounded cursor-pointer"
                              >
                                Guardar
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="pt-1">
                          {isWaConnected ? (
                            <button
                              type="button"
                              onClick={handleDisconnectWhatsApp}
                              className="w-full py-2.5 border border-[#C84B31] text-[#C84B31] hover:bg-[#C84B31] hover:text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">link_off</span>
                              <span>Desvincular WhatsApp</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleConnectWhatsApp}
                              className="w-full py-2.5 bg-[#C84B31] hover:bg-[#A83B25] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                              <span>Generar Código QR</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botones de Navegación del Wizard */}
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

              {/* Panel Lateral de Estado & Webhook de Meta */}
              <div className="lg:col-span-5 bg-white border border-[#E2DFD7] rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 text-[#0866FF]">
                  <span className="material-symbols-outlined text-[20px]">hub</span>
                  <h4 className="font-display text-lg text-[#1C1B1A]">Estado del Webhook de Meta</h4>
                </div>
                
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold font-mono text-[#0866FF] uppercase block">Callback URL (Pública VPS)</span>
                    <code className="text-[#1C1B1A] font-mono text-[11px] block break-all">
                      https://frant.app/api/v1/meta/webhook
                    </code>
                  </div>

                  <div className="p-3 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold font-mono text-[#15803d] uppercase block">Verify Token (Seguridad)</span>
                    <code className="text-[#1C1B1A] font-mono text-[11px] block">
                      frant_verify_token_2026
                    </code>
                  </div>

                  <div className="p-3 bg-[#FAF8F3] border border-[#E2DFD7] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold font-mono text-[#6E6B65] uppercase block">Respuesta de IA</span>
                    <p className="text-[#1C1B1A]">
                      Agente <strong>Gemini 3.7 Flash</strong> activo respondiendo automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
