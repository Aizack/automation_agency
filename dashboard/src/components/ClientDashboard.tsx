import React, { useState, useEffect } from 'react';

interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  systemPrompt: string;
  activeTools: string[];
  status: string;
  agentPhone?: string;
  driveFolderId?: string;
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

interface AgentContact {
  id: string;
  name: string;
  phone: string;
  priority: number;
  status: 'online' | 'offline';
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
  const [driveFolderId, setDriveFolderId] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('Friendly');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Estados para edición en caliente del teléfono del Bot
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  
  // Estados para sincronización de Drive
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Estados para visor y carga de archivos del cliente
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, mimeType: string}>>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Estados para gestión de asesores humanos (escalamiento)
  const [agents, setAgents] = useState<AgentContact[]>([]);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentPriority, setNewAgentPriority] = useState<number>(1);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Cargar asesores del cliente
  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await fetch(`/api/clients/${clientId}/agents`);
      const json = await res.json();
      if (json.success) {
        setAgents(json.data || []);
        setNewAgentPriority(json.data ? json.data.length + 1 : 1);
      }
    } catch (err) {
      console.error("Error cargando asesores:", err);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Agregar asesor
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || !newAgentPhone) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName,
          phone: newAgentPhone.trim(),
          priority: newAgentPriority
        })
      });
      const json = await res.json();
      if (json.success) {
        setNewAgentName('');
        setNewAgentPhone('');
        fetchAgents();
      }
    } catch (err) {
      console.error("Error agregando asesor:", err);
    }
  };

  // Eliminar asesor
  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este asesor de la lista de escalamiento?")) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/agents/${agentId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchAgents();
      }
    } catch (err) {
      console.error("Error eliminando asesor:", err);
    }
  };

  // Cambiar estado de disponibilidad del asesor
  const handleToggleAgentStatus = async (agentId: string, currentStatus: 'online' | 'offline') => {
    const nextStatus = currentStatus === 'online' ? 'offline' : 'online';
    try {
      const res = await fetch(`/api/clients/${clientId}/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.success) {
        fetchAgents();
      }
    } catch (err) {
      console.error("Error actualizando estado del asesor:", err);
    }
  };

  // Solicitar arranque de conexión de WhatsApp
  const handleConnectWhatsApp = async () => {
    try {
      await fetch('/api/whatsapp/connect', { method: 'POST' });
    } catch (error) {
      console.error("[ClientDashboard] Error solicitando conexión:", error);
    }
  };

  // Solicitar desvinculación y cierre de sesión de WhatsApp
  const handleDisconnectWhatsApp = async () => {
    if (!confirm("¿Estás seguro de que deseas desvincular este dispositivo de WhatsApp? Se cerrará la sesión actual en el servidor y tendrás que escanear un nuevo código QR para volver a conectar.")) {
      return;
    }

    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
    } catch (error) {
      console.error("[ClientDashboard] Error solicitando desvinculación:", error);
    }
  };

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
          setDriveFolderId(clientJson.data.driveFolderId || '');

          if (clientJson.data.driveFolderId) {
            setLoadingFiles(true);
            fetch(`/api/clients/${clientId}/files`)
              .then(res => res.json())
              .then(json => {
                if (json.success) setUploadedFiles(json.data || []);
              })
              .catch(err => console.error("Error cargando archivos:", err))
              .finally(() => setLoadingFiles(false));
          }
        }
      } catch (error) {
        console.error("[ClientDashboard] Error cargando cliente:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClientInfo();
    fetchAgents();
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
          drive_folder_id: driveFolderId || null,
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
          setSystemPrompt(clientJson.data.systemPrompt);
          setAgentPhone(clientJson.data.agentPhone || '');
          setDriveFolderId(clientJson.data.driveFolderId || '');
        }
      }
    } catch (error) {
      console.error("[ClientDashboard] Error guardando config:", error);
    }
  };

  // Función para guardar el número de teléfono del bot de forma directa
  const handleSavePhoneNumber = async () => {
    if (!tempPhone) return;
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: tempPhone.replace(/\D/g, ''), // Limpiar no numéricos
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingPhone(false);
        // Recargar datos
        const clientRes = await fetch(`/api/clients/${clientId}`);
        const clientJson = await clientRes.json();
        if (clientJson.success) {
          setClientData(clientJson.data);
        }
      } else {
        alert(`Error: ${data.message || data.error || 'No se pudo guardar el número'}`);
      }
    } catch (error: any) {
      console.error("[ClientDashboard] Error guardando teléfono del bot:", error);
      alert("Error de conexión al guardar el número de teléfono.");
    }
  };

  // Cargar listado de archivos cargados desde el servidor
  const fetchUploadedFiles = async () => {
    if (!driveFolderId) return;
    try {
      setLoadingFiles(true);
      const res = await fetch(`/api/clients/${clientId}/files`);
      const json = await res.json();
      if (json.success) {
        setUploadedFiles(json.data || []);
      }
    } catch (error) {
      console.error("[ClientDashboard] Error cargando lista de archivos:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Cargar archivo a Google Drive y auto-vectorizar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      setSyncResult(null);
      
      const res = await fetch(`/api/clients/${clientId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setSyncResult(`¡Archivo '${file.name}' cargado a Google Drive y vectorizado en pgvector con éxito!`);
        fetchUploadedFiles(); // Recargar listado en UI
      } else {
        setSyncResult(`Error subiendo archivo: ${json.error || json.message}`);
      }
    } catch (error) {
      console.error("[ClientDashboard] Error cargando archivo:", error);
      setSyncResult("Error de conexión al subir el archivo.");
    } finally {
      setUploadingFile(false);
    }
  };

  // Función para sincronizar la carpeta de Google Drive
  const handleSyncDrive = async () => {
    if (!driveFolderId) {
      alert("Por favor ingresa un ID de carpeta de Google Drive primero.");
      return;
    }

    try {
      setSyncingDrive(true);
      setSyncResult(null);
      const res = await fetch(`/api/clients/${clientId}/sync-drive`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncResult(data.message || "Sincronización completada con éxito.");
      } else {
        setSyncResult(`Error: ${data.message || data.error || 'Fallo desconocido'}`);
      }
    } catch (error: any) {
      console.error("[ClientDashboard] Error en sincronización de Drive:", error);
      setSyncResult(`Error de conexión: ${error.message || 'No se pudo conectar al servidor'}`);
    } finally {
      setSyncingDrive(false);
      setTimeout(() => setSyncResult(null), 6000);
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

  // Determinar el estatus del canal de WhatsApp (normalizando a últimos 10 dígitos)
  const cleanPhone = (phone: string) => phone.replace(/\D/g, '').slice(-10);
  const isWaConnected = whatsappStatus.status === 'CONNECTED' && 
    cleanPhone(whatsappStatus.phone) === cleanPhone(clientData.phoneNumber);

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
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <defs>
                <linearGradient id="frant-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0066ff" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <path d="M20,10 L20,5" stroke="url(#frant-grad)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="20" cy="4" r="2" fill="url(#frant-grad)" />
              <path d="M20,10 C11.7,10 5,16.2 5,23.8 C5,27.9 7,31.5 10.2,33.9 L9,38 L14,36.2 C15.8,37.1 17.8,37.6 20,37.6 C28.3,37.6 35,31.4 35,23.8 C35,16.2 28.3,10 20,10 Z" stroke="url(#frant-grad)" strokeWidth="2.5" strokeLinejoin="round" />
              <rect x="11" y="18" width="18" height="11" rx="5.5" fill="#090d16" stroke="url(#frant-grad)" strokeWidth="0.5" />
              <circle cx="16" cy="23.5" r="1.5" fill="#ffffff" />
              <circle cx="24" cy="23.5" r="1.5" fill="#ffffff" />
              <path d="M18.5,25.5 C19.2,26.5 20.8,26.5 21.5,25.5" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span className="font-headline-md text-headline-md font-bold bg-gradient-to-r from-[#0066ff] to-[#8b5cf6] bg-clip-text text-transparent">Frant</span>
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
              ) : whatsappStatus.status === 'INITIALIZING' ? (
                <div className="text-surface font-bold text-center text-xs p-2 flex flex-col items-center">
                  <span className="material-symbols-outlined text-4xl text-gray-400 mb-2 animate-spin">refresh</span>
                  <span className="text-gray-600">INICIALIZANDO CANAL</span>
                  <span className="text-[9px] text-gray-400 font-normal mt-1">Espera un momento...</span>
                </div>
              ) : (
                <div className="text-surface font-bold text-center text-xs p-2 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-gray-400 mb-1">sync_disabled</span>
                  <span className="text-gray-600 uppercase mb-3 text-[10px] tracking-wider">Sin Vinculación Activa</span>
                  <button 
                    onClick={handleConnectWhatsApp}
                    className="bg-primary-container text-on-primary-container px-3 py-1.5 rounded-lg text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    Generar Código QR
                  </button>
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
                {isEditingPhone ? (
                  <div className="flex items-center gap-1 bg-surface-container/60 p-1 rounded border border-outline/10">
                    <span className="text-on-surface-variant font-bold text-xs select-none">+</span>
                    <input
                      type="text"
                      className="bg-transparent text-xs font-mono w-24 text-on-surface outline-none border-b border-primary/30 focus:border-primary"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                    />
                    <button 
                      onClick={handleSavePhoneNumber}
                      className="p-0.5 hover:bg-secondary/20 text-secondary rounded transition-colors flex items-center justify-center cursor-pointer"
                      title="Guardar Número"
                    >
                      <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                    </button>
                    <button 
                      onClick={() => setIsEditingPhone(false)}
                      className="p-0.5 hover:bg-error/20 text-error rounded transition-colors flex items-center justify-center cursor-pointer"
                      title="Cancelar"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 group/phone">
                    <span className="text-on-surface font-label-md font-mono">+{clientData.phoneNumber}</span>
                    <button
                      onClick={() => {
                        setTempPhone(clientData.phoneNumber);
                        setIsEditingPhone(true);
                      }}
                      className="p-1 text-on-surface-variant/40 hover:text-primary hover:bg-surface-variant/50 rounded transition-all flex items-center justify-center opacity-0 group-hover/phone:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Editar Línea"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isWaConnected && (
              <button 
                onClick={handleDisconnectWhatsApp}
                className="mt-2 w-full bg-error/15 text-error border border-error/20 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-error/25 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Desvincular WhatsApp
              </button>
            )}
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
                  <label className="font-label-md text-label-md text-on-surface-variant">Línea del Asesor Humano (Traspaso)</label>
                  <input 
                    className="w-full bg-surface-container border border-outline/30 rounded-lg p-3 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container text-on-surface font-mono"
                    type="text"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="Ej: 573009998888"
                  />
                </div>
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
              </div>

              {/* Sección RAG de Google Drive */}
              <div className="border-t border-outline/10 pt-4 mt-6 space-y-3">
                <h4 className="font-label-md text-label-md font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                  Base de Conocimientos (RAG de Google Drive)
                </h4>
                <p className="text-xs text-on-surface-variant opacity-75">
                  El bot utilizará la información contenida en los archivos TXT y Google Docs de esta carpeta para responder.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  <div className="space-y-1 md:col-span-2">
                    <label className="font-label-md text-label-md text-on-surface-variant">ID de Carpeta de Google Drive</label>
                    <input 
                      className="w-full bg-surface-container border border-outline/30 rounded-lg p-3 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container text-on-surface font-mono"
                      type="text"
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="Ej: 11DhgnPTOZu8ySaaiZA4Lni9FmqB58SFr"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleSyncDrive}
                      disabled={syncingDrive || !driveFolderId}
                      className="w-full bg-secondary-container text-on-secondary-container px-4 py-3 rounded-lg font-bold text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:scale-100 cursor-pointer active:scale-95"
                    >
                      <span className={`material-symbols-outlined text-[16px] ${syncingDrive ? 'animate-spin' : ''}`}>
                        {syncingDrive ? 'sync' : 'cloud_download'}
                      </span>
                      {syncingDrive ? 'Sincronizando...' : 'Sincronizar Drive'}
                    </button>
                  </div>
                </div>
                {syncResult && (
                  <div className={`p-3 rounded-lg text-xs font-semibold transition-all border ${
                    syncResult.includes('Error') 
                      ? 'bg-error/15 text-error border-error/20' 
                      : 'bg-secondary/15 text-secondary border-secondary/20'
                  }`}>
                    {syncResult}
                  </div>
                )}

                {/* Visualizador y Carga de Archivos RAG */}
                {driveFolderId && (
                  <div className="bg-surface-container/30 border border-outline/10 rounded-lg p-4 space-y-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
                        Documentos de Entrenamiento (RAG)
                      </span>
                      {loadingFiles && <span className="text-[10px] text-primary animate-pulse">Cargando archivos...</span>}
                    </div>
                    
                    {uploadedFiles.length === 0 ? (
                      <p className="text-xs text-on-surface-variant opacity-60 italic text-center py-4 bg-surface-container/10 rounded-lg">
                        Aún no has subido documentos. ¡Sube un archivo de texto o PDF para entrenar a tu bot!
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto divide-y divide-outline/5 pr-1 space-y-1 bg-surface-container/20 p-2 rounded-lg">
                        {uploadedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between text-xs py-1.5 first:pt-0">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span className="material-symbols-outlined text-[16px] text-primary/70 shrink-0">
                                {file.mimeType.includes('folder') ? 'folder' : 'description'}
                              </span>
                              <span className="text-on-surface truncate font-medium" title={file.name}>{file.name}</span>
                            </div>
                            <span className="text-[10px] text-on-surface-variant opacity-60 shrink-0 font-mono bg-surface-container-highest px-1.5 py-0.5 rounded">
                              {file.mimeType.includes('text/plain') 
                                ? 'TXT' 
                                : file.mimeType.includes('google-apps.document') 
                                  ? 'Doc' 
                                  : file.mimeType.includes('pdf') 
                                    ? 'PDF' 
                                    : 'Doc'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Zona de Carga de Archivos */}
                    <div className="pt-1">
                      <label className="relative flex items-center justify-center border border-dashed border-outline/30 rounded-lg p-3 hover:bg-surface-container-high/40 hover:border-primary/50 transition-all cursor-pointer text-center text-xs font-semibold text-on-surface-variant gap-2 active:scale-[0.99]">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          {uploadingFile ? 'sync' : 'upload_file'}
                        </span>
                        <span>
                          {uploadingFile ? 'Subiendo y vectorizando...' : 'Subir archivo de entrenamiento (PDF, TXT, DOCX)'}
                        </span>
                        <input 
                          type="file" 
                          accept=".txt,.pdf,.docx" 
                          className="hidden" 
                          disabled={uploadingFile || syncingDrive} 
                          onChange={handleFileUpload} 
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 items-center gap-4">
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

            {/* Gestión de Asesores Humanos */}
            <div className="glass-card p-6 rounded-xl mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">groups</span>
                <h3 className="font-headline-md text-headline-md">Gestión de Asesores Humanos (Cascada)</h3>
              </div>
              
              <p className="text-xs text-on-surface-variant opacity-75 mb-6">
                Registra los teléfonos y nombres de tus asesores en orden de prioridad. 
                Si un asesor no responde en 1 minuto, Frant escalará la llamada al siguiente asesor activo de la lista.
              </p>

              {/* List of current agents */}
              <div className="space-y-3 mb-6">
                {loadingAgents ? (
                  <div className="text-center text-xs text-primary animate-pulse py-4">Cargando asesores...</div>
                ) : agents.length === 0 ? (
                  <p className="text-xs text-on-surface-variant opacity-60 italic text-center py-4 bg-surface-container/10 rounded-lg">
                    Aún no has agregado asesores humanos. ¡Agrega uno abajo para habilitar el traspaso!
                  </p>
                ) : (
                  <div className="bg-surface-container/30 border border-outline/10 rounded-lg overflow-hidden divide-y divide-outline/5">
                    {agents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between p-3.5 text-xs hover:bg-surface-container/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {agent.priority}
                          </span>
                          <div>
                            <p className="font-bold text-on-surface">{agent.name}</p>
                            <p className="text-[11px] text-on-surface-variant font-mono">+{agent.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Toggle Status Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleAgentStatus(agent.id, agent.status)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                              agent.status === 'online'
                                ? 'bg-secondary/15 text-secondary border-secondary/20 hover:bg-secondary/25'
                                : 'bg-outline/15 text-on-surface-variant border-outline/20 hover:bg-outline/25'
                            }`}
                          >
                            {agent.status === 'online' ? '● En Línea' : '○ Ausente'}
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="p-1.5 hover:bg-error/20 text-error/80 hover:text-error rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                            title="Eliminar asesor"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new agent form */}
              <form onSubmit={handleAddAgent} className="bg-surface-container/20 border border-outline/5 rounded-lg p-4 space-y-4">
                <span className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  Agregar Nuevo Asesor
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant">Nombre del Asesor</label>
                    <input
                      type="text"
                      required
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="Ej: Carlos"
                      className="w-full bg-surface-container border border-outline/30 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant">Teléfono (WhatsApp)</label>
                    <input
                      type="text"
                      required
                      value={newAgentPhone}
                      onChange={(e) => setNewAgentPhone(e.target.value)}
                      placeholder="Ej: 573009998888"
                      className="w-full bg-surface-container border border-outline/30 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant">Prioridad (Orden)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newAgentPriority}
                      onChange={(e) => setNewAgentPriority(parseInt(e.target.value) || 1)}
                      className="w-full bg-surface-container border border-outline/30 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!newAgentName || !newAgentPhone}
                    className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg font-bold text-xs hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    Agregar a la Lista
                  </button>
                </div>
              </form>
            </div>
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
