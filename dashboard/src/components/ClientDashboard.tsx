import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';
import { SaaSErpInventory } from './SaaSErpInventory';
import { SaaSErpInvoices } from './SaaSErpInvoices';
import { SaaSErpCartera } from './SaaSErpCartera';
import { SaaSErpDomicilios } from './SaaSErpDomicilios';
import { SaaSErpSuppliers } from './SaaSErpSuppliers';
import { SaaSErpPurchaseOrders } from './SaaSErpPurchaseOrders';
import { SaaSErpFormulas } from './SaaSErpFormulas';
import { SaaSErpStoreSettings } from './SaaSErpStoreSettings';
import { SaaSErpAppointments } from './SaaSErpAppointments';
import { SaaSErpEmployees } from './SaaSErpEmployees';
import { SaaSErpCRM } from './SaaSErpCRM';
import { SaaSErpCampaigns } from './SaaSErpCampaigns';
import { SaaSErpMarketing } from './SaaSErpMarketing';
import { SystemAlertsPanel } from './SystemAlertsPanel';
import { SaaSErpUsers } from './SaaSErpUsers';
import { SaaSErpAccounting } from './SaaSErpAccounting';
import { SaaSErpAuditLogs } from './SaaSErpAuditLogs';
import { RestaurantKdsDisplay } from './RestaurantKdsDisplay';
import { RestaurantWaiterPortal } from './RestaurantWaiterPortal';
import { RestaurantMenuBuilder } from './RestaurantMenuBuilder';

interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  systemPrompt: string;
  activeTools: string[];
  status: string;
  agentPhone?: string;
  driveFolderId?: string;
  logo_url?: string;
  category?: string;
  enabledModules?: any;
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

interface AudioContact {
  tag: string;
  fileName: string;
  size: number;
  url: string;
}

interface ClientDashboardProps {
  clientId: string;
  onBack: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ clientId, onBack }) => {
  const [clientData, setClientData] = useState<Client | null>(null);

  // Permisos de sesión de empleado
  const sessionRole = localStorage.getItem('session_role');
  const isEmployeeSession = sessionRole === 'employee';
  const employeePermissions: string[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('employee_permissions') || '[]');
    } catch {
      return [];
    }
  })();

  const hasPermission = (moduleKey: string) => {
    if (!isEmployeeSession) return true; // Admins y dueños del negocio ven todo
    return employeePermissions.includes(moduleKey);
  };

  // Calcular la pestaña por defecto si es colaborador
  const getDefaultTab = () => {
    if (!isEmployeeSession) return 'resumen';
    if (employeePermissions.includes('billing')) return 'facturacion';
    if (employeePermissions.includes('contabilidad')) return 'contabilidad';
    if (employeePermissions.includes('cartera')) return 'cartera';
    if (employeePermissions.includes('inventory')) return 'inventario';
    if (employeePermissions.includes('crm')) return 'clientes';
    if (employeePermissions.includes('appointments')) return 'agenda';
    if (employeePermissions.includes('formulas')) return 'formulas';
    if (employeePermissions.includes('lab')) return 'lab_jobs';
    if (employeePermissions.includes('domicilios')) return 'domicilios';
    if (employeePermissions.includes('employees')) return 'empleados';
    return 'cartera';
  };

  const [activeTab, setActiveTab] = useState<'resumen' | 'inventario' | 'facturacion' | 'contabilidad' | 'cartera' | 'domicilios' | 'formulas' | 'lab_jobs' | 'agenda' | 'empleados' | 'usuarios' | 'clientes' | 'campanias' | 'marketing' | 'logs' | 'configuracion' | 'trazabilidad' | 'restaurante_mesas' | 'restaurante_kds' | 'restaurante_menu'>(getDefaultTab());
  const [inventorySubTab, setInventorySubTab] = useState<'catalog' | 'purchase-orders' | 'suppliers'>('catalog');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Temas Dinámicos Open-Design (W3C Tokens)
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('app_theme') || localStorage.getItem('theme') || 'obsidian-gold';
  });
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

  const openDesignThemes = [
    { id: 'obsidian-gold', name: 'Obsidian Gold', icon: 'brightness_7', color: '#d8a24e', desc: 'Oscuro Lujo & Oro' },
    { id: 'emerald-lux', name: 'Emerald Lux', icon: 'eco', color: '#10b981', desc: 'Esmeralda & Menta' },
    { id: 'cyberpunk-neon', name: 'Cyberpunk Neon', icon: 'bolt', color: '#a855f7', desc: 'Neón Morado & Cian' },
    { id: 'royal-light', name: 'Royal Light', icon: 'light_mode', color: '#2563eb', desc: 'Modo Claro Pulcro' },
    { id: 'sunset-violet', name: 'Sunset Violet', icon: 'auto_awesome', color: '#ec4899', desc: 'Violeta & Rosa Neón' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('app_theme') || localStorage.getItem('theme') || 'obsidian-gold';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const changeOpenDesignTheme = (themeId: string) => {
    setTheme(themeId);
    localStorage.setItem('app_theme', themeId);
    localStorage.setItem('theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    setIsThemeDropdownOpen(false);
  };

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
  const [category, setCategory] = useState('optica');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Estados para edición en caliente del teléfono del Bot
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  
  // Estados para sincronización de Drive
  const [syncingDrive, setSyncingDrive] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Lista de colaboradores para selección rápida con buscador tipo autocomplete
  const [employeeList, setEmployeeList] = useState<Array<{id: string, name: string, last_name?: string, phone: string}>>([]);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isEmployeeSearchOpen, setIsEmployeeSearchOpen] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/employees`);
      const json = await res.json();
      if (json.success) {
        setEmployeeList(json.employees || []);
      }
    } catch (err) {
      console.error("Error cargando lista de colaboradores:", err);
    }
  };

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

  // Estados para gestión de audios pregrabados
  const [audios, setAudios] = useState<AudioContact[]>([]);
  const [newAudioTag, setNewAudioTag] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [loadingAudios, setLoadingAudios] = useState(false);

  // Estados para gestión de logotipos y cache-busting
  const [logoBuster, setLogoBuster] = useState(Date.now());
  const [logos, setLogos] = useState<Array<{ fileName: string, url: string }>>([]);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalChats: 0,
    totalCost: 0,
    hoursSaved: 0,
    roi: 0
  });

  // Cargar historial de logotipos
  const fetchLogos = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/logos`);
      const json = await res.json();
      if (json.success) {
        setLogos(json.data || []);
      }
    } catch (err) {
      console.error("Error cargando logotipos:", err);
    }
  };

  // Subir logotipo nuevo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch(`/api/clients/${clientId}/logos`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setLogoBuster(Date.now());
        fetchClientInfo();
        fetchLogos();
      } else {
        alert(json.error || 'Error al subir el logotipo.');
      }
    } catch (err) {
      console.error("Error uploading logo:", err);
    }
  };

  // Seleccionar logotipo del historial
  const handleLogoSelect = async (fileName: string) => {
    if (!fileName) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/logos/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      const json = await res.json();
      if (json.success) {
        setLogoBuster(Date.now());
        fetchClientInfo();
      } else {
        alert(json.error || 'Error al seleccionar logotipo.');
      }
    } catch (err) {
      console.error("Error selecting logo:", err);
    }
  };

  // Eliminar logotipo del historial
  const handleLogoDelete = async (fileName: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este logotipo del historial?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/logos/${fileName}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setLogoBuster(Date.now());
        fetchClientInfo();
        fetchLogos();
      } else {
        alert(json.error || 'Error al eliminar logotipo.');
      }
    } catch (err) {
      console.error("Error deleting logo:", err);
    }
  };

  // Cargar métricas ejecutivas
  const fetchDashboardMetrics = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/dashboard-metrics`);
      const json = await res.json();
      if (json.success) {
        setMetrics({
          totalSales: json.totalSales,
          totalProducts: json.totalProducts,
          totalChats: json.totalChats,
          totalCost: json.totalCost,
          hoursSaved: json.hoursSaved,
          roi: json.roi
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard metrics:", err);
    }
  };

  const triggerSidebarLogoUpload = () => {
    document.getElementById('sidebar-logo-upload-input')?.click();
  };

  // Cargar audios
  const fetchAudios = async () => {
    try {
      setLoadingAudios(true);
      const res = await fetch(`/api/clients/${clientId}/audios`);
      const json = await res.json();
      if (json.success) {
        setAudios(json.data || []);
      }
    } catch (err) {
      console.error("Error cargando audios:", err);
    } finally {
      setLoadingAudios(false);
    }
  };

  // Subir audio
  const handleUploadAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAudioTag || !audioFile) return;

    const formData = new FormData();
    formData.append('etiqueta', newAudioTag.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
    formData.append('audio', audioFile);

    setUploadingAudio(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/audios`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        setNewAudioTag('');
        setAudioFile(null);
        const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchAudios();
      }
    } catch (err) {
      console.error("Error subiendo audio:", err);
    } finally {
      setUploadingAudio(false);
    }
  };

  // Eliminar audio
  const handleDeleteAudio = async (fileName: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este audio?")) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/audios/${fileName}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        fetchAudios();
      }
    } catch (err) {
      console.error("Error eliminando audio:", err);
    }
  };

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
      await fetch(`/api/whatsapp/connect?clientId=${clientId}`, { method: 'POST' });
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


  const fetchClientInfo = async () => {
    try {
      const clientRes = await fetch(`/api/clients/${clientId}`);
      const clientJson = await clientRes.json();
      if (clientJson.success) {
        setClientData(clientJson.data);
        setSystemPrompt(clientJson.data.systemPrompt);
        setAgentPhone(clientJson.data.agentPhone || '');
        setDriveFolderId(clientJson.data.driveFolderId || '');
        setCategory(clientJson.data.category || 'optica');
        
        // Cargar archivos de entrenamiento (Google Drive + Local)
        setLoadingFiles(true);
        const filesRes = await fetch(`/api/clients/${clientId}/files`);
        const filesJson = await filesRes.json();
        if (filesJson.success) {
          setUploadedFiles(filesJson.data || []);
        }
      }
    } catch (error) {
      console.error("[ClientDashboard] Error cargando cliente:", error);
    } finally {
      setLoading(false);
      setLoadingFiles(false);
    }
  };

  // Cargar datos estáticos del Cliente (Solo al iniciar o cambiar de ID)
  useEffect(() => {
    fetchClientInfo();
    fetchAgents();
    fetchEmployees();
    fetchAudios();
    fetchLogos();
    fetchDashboardMetrics();
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

        // 3. Obtener métricas
        fetchDashboardMetrics();
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
          category: category,
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
          setCategory(clientJson.data.category || 'optica');
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

  if (clientData.name === 'pending') {
    return (
      <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#0a5cff]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00ff88]/5 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-md bg-[#0e1726]/70 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0a5cff]/10 rounded-2xl text-[#0a5cff] mb-2 border border-[#0a5cff]/20">
              <span className="material-symbols-outlined text-3xl animate-pulse">rocket_launch</span>
            </div>
            <h2 className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-[#0a5cff] bg-clip-text text-transparent">
              Onboarding del Negocio
            </h2>
            <p className="text-xs text-gray-400">Configura los detalles iniciales de tu negocio para activar el ERP y el Agente de IA.</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = (form.elements.namedItem('bizName') as HTMLInputElement).value;
            const category = (form.elements.namedItem('bizCategory') as HTMLSelectElement).value;

            if (!name || !category) {
              alert('Faltan campos obligatorios.');
              return;
            }

            try {
              setLoading(true);
              const res = await fetch(`/api/clients/${clientId}/register-business`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, category })
              });
              const json = await res.json();
              if (json.success) {
                // Recargar configuración del cliente
                const clientRes = await fetch(`/api/clients/${clientId}`);
                const clientJson = await clientRes.json();
                if (clientJson.success) {
                  setClientData(clientJson.data);
                }
              } else {
                alert(json.error || 'Error al guardar.');
              }
            } catch (err: any) {
              console.error(err);
              alert('Error de conexión.');
            } finally {
              setLoading(false);
            }
          }} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre del Negocio *</label>
              <input
                name="bizName"
                type="text"
                className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#0a5cff]/50 text-white outline-none"
                placeholder="Ej. Óptica Bella Vista"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Categoría / Tipo *</label>
              <select
                name="bizCategory"
                className="w-full bg-[#1b2535]/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#0a5cff]/50 text-white outline-none cursor-pointer"
                required
              >
                <option value="optica">👓 Óptica / Oftalmología</option>
                <option value="clinica">🩺 Clínica / Consultorio Médico</option>
                <option value="restaurante">🍔 Restaurante / Bar / Cafetería</option>
                <option value="general">💼 Comercio General / ERP Genérico</option>
                <option value="automatizacion">🤖 Agencia de Automatizaciones / Servicios</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0a5cff] to-[#0a5cff]/80 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:scale-[1.01] hover:brightness-110 transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Comenzar a Usar Sistema
            </button>
            
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-transparent text-gray-400 hover:text-white py-2 rounded-xl text-xs"
            >
              Regresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Determinar el estatus del canal de WhatsApp (normalizando a últimos 10 dígitos)
  const cleanPhone = (phone: string) => phone.replace(/\D/g, '').slice(-10);
  const isWaConnected = whatsappStatus.status === 'CONNECTED' && 
    cleanPhone(whatsappStatus.phone) === cleanPhone(clientData.phoneNumber);

  return (
    <div className="flex min-h-screen bg-background text-on-surface transition-colors duration-200">
      {/* Sidebar Navigation */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-outline/20 flex flex-col py-6 px-6 z-[100]">
        {/* Header/Logo Empresa */}
        <div className="flex flex-col items-center text-center py-4 mb-8">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleLogoUpload} 
            className="hidden" 
            id="sidebar-logo-upload-input" 
          />
          <div 
            onClick={triggerSidebarLogoUpload}
            className="group relative cursor-pointer flex justify-center items-center w-24 h-24 mb-3"
            title="Haz clic para cambiar el logotipo"
          >
            {clientData?.logo_url ? (
              <img 
                src={`${clientData.logo_url}?t=${logoBuster}`} 
                alt="Logo" 
                className="w-24 h-24 rounded-2xl object-contain bg-white/5 border border-outline/10 p-1 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-200" 
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-3xl group-hover:bg-primary/30 transition-all duration-200">
                {clientData?.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
              <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
            </div>
          </div>
          <div className="w-full truncate px-2">
            <h1 className="font-extrabold text-sm text-on-surface truncate leading-snug">{clientData?.name}</h1>
            <p className="text-[9px] text-on-surface-variant font-mono uppercase tracking-widest mt-0.5">SaaS ERP</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-grow space-y-2.5 overflow-y-auto custom-scrollbar px-1.5 py-1">
          {hasPermission('settings') && (
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('resumen')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'resumen' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                <span className="font-bold text-xs">Configuración Agente IA</span>
              </button>
            </div>
          )}

          {hasPermission('settings') && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Información Empresa</div>
              <button 
                onClick={() => setActiveTab('configuracion')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'configuracion' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
              </button>
            </div>
          )}

          {clientData?.category === 'restaurante' && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Gastronomía & Mesas</div>
              <button 
                onClick={() => setActiveTab('restaurante_menu')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'restaurante_menu' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                <span className="font-bold text-xs">Crear Menú & Recetario</span>
              </button>
              <button 
                onClick={() => setActiveTab('restaurante_mesas')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'restaurante_mesas' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                <span className="font-bold text-xs">Comandero & Mesas</span>
              </button>
              <button 
                onClick={() => setActiveTab('restaurante_kds')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'restaurante_kds' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">soup_kitchen</span>
                <span className="font-bold text-xs">Pantalla KDS (Cocina/Barra)</span>
              </button>
            </div>
          )}

          {(hasPermission('inventory') || hasPermission('lab') || hasPermission('domicilios')) && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Logística</div>
              {hasPermission('inventory') && clientData?.enabledModules?.inventory !== false && (
                <button 
                  onClick={() => setActiveTab('inventario')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'inventario' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  <span className="font-bold text-xs">Inventario</span>
                </button>
              )}

              {hasPermission('lab') && clientData?.category === 'optica' && (
                <button 
                  onClick={() => setActiveTab('lab_jobs')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'lab_jobs' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
                  <span className="font-bold text-xs">Trabajos de laboratorio</span>
                </button>
              )}

              {hasPermission('domicilios') && clientData?.enabledModules?.billing !== false && (
                <button 
                  onClick={() => setActiveTab('domicilios')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'domicilios' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  <span className="font-bold text-xs">Despachos y Domicilios</span>
                </button>
              )}
            </div>
          )}

          {(hasPermission('billing') || hasPermission('contabilidad') || hasPermission('cartera')) && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Facturación y Contabilidad</div>
              {hasPermission('billing') && clientData?.enabledModules?.billing !== false && (
                <button 
                  onClick={() => setActiveTab('facturacion')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'facturacion' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span className="font-bold text-xs">Facturación</span>
                </button>
              )}

              {hasPermission('contabilidad') && (
                <button 
                  onClick={() => setActiveTab('contabilidad')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'contabilidad' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                  <span className="font-bold text-xs">Contabilidad</span>
                </button>
              )}

              {hasPermission('cartera') && (
                <button 
                  onClick={() => setActiveTab('cartera')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'cartera' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span className="font-bold text-xs">Cartera</span>
                </button>
              )}
            </div>
          )}

          {(hasPermission('crm') || hasPermission('campaigns') || hasPermission('marketing')) && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Marketing y Ventas</div>
              {hasPermission('crm') && clientData?.enabledModules?.crm !== false && (
                <button 
                  onClick={() => setActiveTab('clientes')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'clientes' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">contacts</span>
                  <span className="font-bold text-xs">Clientes</span>
                </button>
              )}

              {hasPermission('campaigns') && clientData?.enabledModules?.field_visits !== false && clientData?.category === 'optica' && (
                <button 
                  onClick={() => setActiveTab('campanias')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'campanias' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">explore</span>
                  <span className="font-bold text-xs">Campañas de Campo</span>
                </button>
              )}

              {hasPermission('marketing') && clientData?.enabledModules?.marketing !== false && (
                <button 
                  onClick={() => setActiveTab('marketing')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'marketing' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  <span className="font-bold text-xs">Difusión Promocional</span>
                </button>
              )}
            </div>
          )}

          {(hasPermission('appointments') || hasPermission('formulas')) && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Citas y Exámenes</div>
              {hasPermission('appointments') && clientData?.enabledModules?.appointments !== false && (
                <button 
                  onClick={() => setActiveTab('agenda')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'agenda' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span className="font-bold text-xs">
                    {clientData?.category === 'restaurante' ? 'Reservas de Mesa' :
                     clientData?.category === 'optica' ? 'Programación Citas' : 'Agenda Citas'}
                  </span>
                </button>
              )}

              {hasPermission('formulas') && clientData?.category === 'optica' && (
                <button 
                  onClick={() => setActiveTab('formulas')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'formulas' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  <span className="font-bold text-xs">Optometría</span>
                </button>
              )}
            </div>
          )}

          {hasPermission('employees') && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Administración de Personal</div>
              {clientData?.enabledModules?.employees !== false && (
                <button 
                  onClick={() => setActiveTab('empleados')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'empleados' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  <span className="font-bold text-xs">Administración de Personal</span>
                </button>
              )}
              <button 
                onClick={() => setActiveTab('usuarios')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'usuarios' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                <span className="font-bold text-xs">Accesos y Permisos</span>
              </button>
              <button 
                onClick={() => setActiveTab('trazabilidad')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'trazabilidad' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">shield</span>
                <span className="font-bold text-xs">Trazabilidad & Auditoría</span>
              </button>
            </div>
          )}

          <div className="space-y-1 pt-1">
            <button 
              onClick={() => setActiveTab('logs')}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans transition-all duration-200 ${
                activeTab === 'logs' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">build</span>
              <span className="font-bold text-xs">Estado del Sistema</span>
            </button>
          </div>
        </nav>

        {/* Back / Logout footer */}
        <div className="border-t border-outline/10 pt-4 mt-auto">
          <button 
            onClick={onBack}
            className="w-full text-left flex items-center gap-3 p-3 rounded-xl border-0 cursor-pointer font-sans text-on-surface-variant hover:bg-surface-variant/40 bg-transparent transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span className="font-bold text-xs">Regresar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-grow pl-64 min-h-screen flex flex-col">
        {/* Header Bar */}
        <header className="h-16 border-b border-outline/10 flex items-center justify-between px-8 bg-surface-container/20 backdrop-blur sticky top-0 z-40">
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-on-surface flex items-center gap-2">
              <span className="font-sans">
                {activeTab === 'resumen' ? 'Automatización y Agente IA' :
                 activeTab === 'inventario' ? 'Inventario' :
                 activeTab === 'facturacion' ? 'Facturación' :
                 activeTab === 'contabilidad' ? 'Contabilidad y Análisis Financiero' :
                 activeTab === 'cartera' ? 'Cartera' :
                 activeTab === 'domicilios' ? 'Despachos y Domicilios' :
                 activeTab === 'lab_jobs' ? 'Trabajos de laboratorio' :
                 activeTab === 'formulas' ? 'Optometría' :
                 activeTab === 'agenda' ? (
                   clientData?.category === 'restaurante' ? 'Reservación de Mesas' :
                   clientData?.category === 'optica' ? 'Programación de Citas' : 'Calendario de Citas'
                 ) :
                 activeTab === 'empleados' ? 'Administración de Personal' :
                 activeTab === 'usuarios' ? 'Accesos y Permisos ERP' :
                 activeTab === 'clientes' ? 'Clientes' :
                 activeTab === 'configuracion' ? 'Información Empresa' :
                 'Estado del Sistema'}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Open-Design Theme Switcher Popover */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                className="px-3 py-1.5 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-outline/20 flex items-center gap-2 cursor-pointer transition text-on-surface text-xs font-semibold shadow-sm"
                title="Cambiar Paleta de Tema (Open-Design Tokens)"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">palette</span>
                <span className="hidden md:inline font-mono text-[11px]">
                  {openDesignThemes.find(t => t.id === theme)?.name || 'Temas'}
                </span>
                <span className="material-symbols-outlined text-[14px] opacity-70">arrow_drop_down</span>
              </button>

              {/* Menú Desplegable de 5 Temas Open-Design */}
              {isThemeDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-highest border border-outline/20 rounded-2xl shadow-2xl p-2 z-50 divide-y divide-outline/5 backdrop-blur-xl animate-fade-in">
                  <div className="p-2 border-b border-outline/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                      Paletas Open-Design Tokens
                    </p>
                  </div>
                  <div className="py-1 space-y-1">
                    {openDesignThemes.map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => changeOpenDesignTheme(t.id)}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition cursor-pointer border-0 ${
                            isSelected 
                              ? 'bg-primary/15 text-primary font-bold border-l-2 border-primary' 
                              : 'text-on-surface hover:bg-surface-container-high/60 font-normal'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm" 
                              style={{ backgroundColor: t.color }} 
                            />
                            <div>
                              <p className="font-semibold leading-tight">{t.name}</p>
                              <p className="text-[9.5px] text-on-surface-variant opacity-80">{t.desc}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Business Logo/Profile badge */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="font-label-md text-xs font-bold text-on-surface">{clientData.name}</p>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-tighter">Panel de Gestión</p>
              </div>
              {clientData?.logo_url ? (
                <img 
                  src={`${clientData.logo_url}?t=${logoBuster}`} 
                  alt="Perfil" 
                  className="w-8 h-8 rounded-full object-contain bg-white/5 border border-outline/20 p-0.5" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  {clientData?.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-8">

        {activeTab === 'resumen' && (
          <>
            {/* Cabecera Principal del Negocio */}
            <div className="glass-card p-8 rounded-2xl mb-8 flex flex-col items-center text-center relative overflow-hidden border border-outline/10 bg-gradient-to-b from-primary/5 to-transparent">
              {/* Fondo de decoración premium */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
              
              {/* Logotipo Central Grande */}
              <div 
                onClick={triggerSidebarLogoUpload}
                className="group relative cursor-pointer flex justify-center items-center w-36 h-36 mb-5"
                title="Haz clic para cambiar el logotipo"
              >
                {clientData?.logo_url ? (
                  <img 
                    src={`${clientData.logo_url}?t=${logoBuster}`} 
                    alt="Logo Empresa" 
                    className="w-36 h-36 rounded-3xl object-contain bg-white/5 border border-outline/20 p-2 shadow-lg shadow-black/30 group-hover:border-primary/50 group-hover:scale-[1.03] transition-all duration-200" 
                  />
                ) : (
                  <div className="w-36 h-36 rounded-3xl bg-primary/20 flex items-center justify-center text-primary font-bold text-5xl shadow-lg shadow-black/30 group-hover:bg-primary/30 transition-all duration-200">
                    {clientData?.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                {/* Overlay de cámara hover */}
                <div className="absolute inset-0 rounded-3xl bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 shadow-inner">
                  <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                </div>
              </div>

              {/* Información del Cliente */}
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-1 font-sans">{clientData?.name}</h2>
              <div className="flex items-center gap-2 mb-4 justify-center">
                <span className="px-2.5 py-0.5 bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/25">
                  {clientData?.category === 'optica' ? 'Óptica / Centro Clínico' : clientData?.category === 'restaurante' ? 'Restaurante / Alimentos' : clientData?.category === 'automatizacion' ? 'Agencia de Automatizaciones' : 'Comercio General'}
                </span>
                <span className={`w-2 h-2 rounded-full ${clientData?.status === 'active' ? 'bg-success animate-pulse' : 'bg-outline'}`} />
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">{clientData?.status === 'active' ? 'En Línea' : 'Inactivo'}</span>
              </div>
            </div>

            {/* Metricas de Negocio Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 mb-8">
              {/* Ventas en Dinero */}
              <div className="glass-card p-5 rounded-xl flex flex-col justify-between border-primary/10">
                <div>
                  <p className="font-medium text-xs text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">payments</span>
                    Ventas Totales
                  </p>
                </div>
                <div className="mt-4">
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    ${metrics.totalSales.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <p className="text-on-surface-variant text-[10px] opacity-75 mt-0.5">Suma de facturación</p>
                </div>
              </div>

              {/* Productos en Existencia */}
              <div className="glass-card p-5 rounded-xl flex flex-col justify-between border-secondary/10">
                <div>
                  <p className="font-medium text-xs text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">inventory_2</span>
                    Productos en Catálogo
                  </p>
                </div>
                <div className="mt-4">
                  <h2 className="text-xl font-bold tracking-tight text-secondary">
                    {metrics.totalProducts} Ítems
                  </h2>
                  <p className="text-on-surface-variant text-[10px] opacity-75 mt-0.5">Existencias activas</p>
                </div>
              </div>

              {/* ROI de Automatización */}
              <div className="glass-card p-5 rounded-xl flex flex-col justify-between border-success/10">
                <div>
                  <p className="font-medium text-xs text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-success">trending_up</span>
                    ROI de Automatización
                  </p>
                </div>
                <div className="mt-4">
                  <h2 className="text-xl font-bold tracking-tight text-success">
                    +{metrics.roi > 0 ? metrics.roi.toFixed(1) : '250.0'}%
                  </h2>
                  <p className="text-on-surface-variant text-[10px] opacity-75 mt-0.5">Eficiencia estimada</p>
                </div>
              </div>

              {/* Chats Atendidos */}
              <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <p className="font-medium text-xs text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-tertiary">forum</span>
                    Chats Atendidos
                  </p>
                </div>
                <div className="mt-4">
                  <h2 className="text-xl font-bold tracking-tight">
                    {metrics.totalChats}
                  </h2>
                  <p className="text-on-surface-variant text-[10px] opacity-75 mt-0.5">Costo acumulado: ${metrics.totalCost.toFixed(4)}</p>
                </div>
              </div>

              {/* Tiempo Ahorrado */}
              <div className="glass-card p-5 rounded-xl flex flex-col justify-between">
                <div>
                  <p className="font-medium text-xs text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">timer</span>
                    Tiempo Ahorrado
                  </p>
                </div>
                <div className="mt-4">
                  <h2 className="text-xl font-bold tracking-tight">
                    {metrics.hoursSaved.toFixed(1)} Horas
                  </h2>
                  <p className="text-on-surface-variant text-[10px] opacity-75 mt-0.5">Atención humana delegada</p>
                </div>
              </div>
            </div>

            {/* Bento Grid: Config & QR */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              {/* Config Panel Left (col-span-8) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Config Panel */}
                <div className="glass-card p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
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
                          className="w-full bg-surface-container border border-outline/30 rounded-lg p-3 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container text-on-surface outline-none cursor-pointer"
                          value={toneOfVoice}
                          onChange={(e) => setToneOfVoice(e.target.value)}
                        >
                          <option value="Friendly">Amistoso (Recomendado)</option>
                          <option value="Professional">Profesional / Formal</option>
                          <option value="Urgent">Directo / Informativo</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface-variant">Categoría del Negocio</label>
                        <select 
                          className="w-full bg-surface-container border border-outline/30 rounded-lg p-3 text-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container text-on-surface outline-none cursor-pointer"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          <option value="optica">👓 Óptica / Centro Clínico</option>
                          <option value="restaurante">🍕 Restaurante / Gastronomía</option>
                          <option value="comercio">🛍️ Comercio General</option>
                          <option value="automatizacion">🤖 Agencia de Automatizaciones / Servicios</option>
                        </select>
                      </div>
                    </div>

                    {/* Sección RAG de Google Drive */}
                    <div className="border-t border-outline/10 pt-4 mt-6 space-y-3">
                      <h4 className="font-label-md text-label-md font-bold text-primary">
                        Base de Conocimientos (Entrenamiento del Bot)
                      </h4>
                      <p className="text-xs text-on-surface-variant opacity-75">
                        El bot utiliza la información contenida en los documentos cargados para responder a tus clientes de forma precisa y contextual.
                      </p>

                      <input 
                        type="hidden"
                        value={driveFolderId}
                      />

                      <div className="flex justify-between items-center gap-4 bg-surface-container/20 p-3 rounded-lg border border-outline/5">
                        <span className="text-xs text-on-surface-variant">
                          Sincroniza los archivos de tu carpeta de entrenamiento en la nube.
                        </span>
                        <button
                          type="button"
                          onClick={handleSyncDrive}
                          disabled={syncingDrive || !driveFolderId}
                          className="bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-lg font-bold text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:scale-100 cursor-pointer active:scale-95 shrink-0"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${syncingDrive ? 'animate-spin' : ''}`}>
                            {syncingDrive ? 'sync' : 'cloud_download'}
                          </span>
                          {syncingDrive ? 'Sincronizando...' : 'Sincronizar Base de Datos'}
                        </button>
                      </div>
                      {syncResult && (
                        <div className="p-3 rounded-lg text-xs font-semibold transition-all border bg-secondary/15 text-secondary border-secondary/20">
                          {syncResult}
                        </div>
                      )}

                      {/* Visualizador y Carga de Archivos RAG */}
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
                </div>

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
                      Agregar Asesor de WhatsApp
                    </span>

                    {/* Buscador inteligente tipo Autocomplete / Combobox */}
                    <div className="space-y-1 relative">
                      <label className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">search</span>
                        Buscar Colaborador de la Empresa (escribe nombre, teléfono o cargo):
                      </label>
                      <input
                        type="text"
                        value={employeeSearchQuery}
                        onChange={(e) => {
                          setEmployeeSearchQuery(e.target.value);
                          setIsEmployeeSearchOpen(true);
                        }}
                        onFocus={() => setIsEmployeeSearchOpen(true)}
                        placeholder="Escribe para buscar (Ej: Carla, Cantos, 301...)"
                        className="w-full bg-surface-container border border-outline/30 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />

                      {/* Menu desplegable de sugerencias filtradas */}
                      {isEmployeeSearchOpen && employeeSearchQuery.trim().length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface-container-high border border-outline/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-outline/5 custom-scrollbar">
                          {(() => {
                            const q = employeeSearchQuery.toLowerCase().trim();
                            const filtered = employeeList.filter(emp => 
                              emp.name.toLowerCase().includes(q) || 
                              (emp.last_name && emp.last_name.toLowerCase().includes(q)) ||
                              emp.phone.includes(q)
                            );

                            if (filtered.length === 0) {
                              return (
                                <div className="p-3 text-xs text-on-surface-variant italic text-center">
                                  No se encontraron colaboradores con "{employeeSearchQuery}"
                                </div>
                              );
                            }

                            return filtered.map((emp) => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => {
                                  setNewAgentName(`${emp.name} ${emp.last_name || ''}`.trim());
                                  setNewAgentPhone(emp.phone.replace(/\D/g, ''));
                                  setEmployeeSearchQuery(`${emp.name} ${emp.last_name || ''}`.trim());
                                  setIsEmployeeSearchOpen(false);
                                }}
                                className="w-full text-left p-2.5 text-xs hover:bg-primary/10 transition-colors flex justify-between items-center cursor-pointer border-0 text-on-surface"
                              >
                                <div>
                                  <p className="font-bold text-on-surface">{emp.name} {emp.last_name || ''}</p>
                                  <p className="text-[10px] text-on-surface-variant font-mono">+{emp.phone}</p>
                                </div>
                                <span className="material-symbols-outlined text-[16px] text-primary">add_circle_outline</span>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface-variant">Nombre del Asesor</label>
                        <input
                          type="text"
                          required
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                          placeholder="Ej: Carlos Cantos"
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
                        <label className="font-label-md text-label-md text-on-surface-variant">Prioridad (Orden de atención)</label>
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
                        Agregar a la Lista de WhatsApp
                      </button>
                    </div>
                  </form>
                </div>

                {/* Gestión de Audios Pregrabados */}
                <div className="glass-card p-6 rounded-xl mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-secondary">mic</span>
                    <h3 className="font-headline-md text-headline-md">Notas de Voz Pregrabadas (Audios)</h3>
                  </div>
                  
                  <p className="text-xs text-on-surface-variant opacity-75 mb-6">
                    Sube las notas de voz de tu negocio (ej. bienvenida, horarios, despedida) en formato MP3, WAV u OGG.
                    Frant enviará estos archivos directamente como notas de voz nativas en WhatsApp.
                  </p>

                  {/* Lista de audios existentes */}
                  <div className="space-y-3 mb-6">
                    {loadingAudios ? (
                      <div className="text-center text-xs text-primary animate-pulse py-4">Cargando audios...</div>
                    ) : audios.length === 0 ? (
                      <p className="text-xs text-on-surface-variant opacity-60 italic text-center py-4 bg-surface-container/10 rounded-lg">
                        Aún no has subido notas de voz pregrabadas. ¡Sube una abajo!
                      </p>
                    ) : (
                      <div className="bg-surface-container/30 border border-outline/10 rounded-lg overflow-hidden divide-y divide-outline/5">
                        {audios.map((audio) => (
                          <div key={audio.fileName} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 gap-3 text-xs hover:bg-surface-container/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[20px] text-primary">audiotrack</span>
                              <div>
                                <p className="font-bold text-on-surface">Etiqueta: <span className="text-secondary">'{audio.tag}'</span></p>
                                <p className="text-[10px] text-on-surface-variant opacity-70 truncate font-mono" title={audio.fileName}>
                                  {audio.fileName} ({(audio.size / 1024).toFixed(1)} KB)
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 justify-end shrink-0">
                              <audio 
                                src={audio.url} 
                                controls 
                                className="h-7 w-44 md:w-52 filter dark:invert"
                              />
                              
                              <button
                                type="button"
                                onClick={() => handleDeleteAudio(audio.fileName)}
                                className="p-1.5 hover:bg-error/20 text-error/80 hover:text-error rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                                title="Eliminar audio"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Formulario de carga de audio */}
                  <form onSubmit={handleUploadAudio} className="bg-surface-container/20 border border-outline/5 rounded-lg p-4 space-y-4">
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      Subir Nueva Nota de Voz
                    </span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface-variant">Etiqueta / Nombre del Audio</label>
                        <input
                          type="text"
                          required
                          value={newAudioTag}
                          onChange={(e) => setNewAudioTag(e.target.value)}
                          placeholder="Ej: bienvenida, horarios, traspaso"
                          className="w-full bg-surface-container border border-outline/30 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md text-on-surface-variant">Archivo de Audio (MP3, WAV, OGG)</label>
                        <input
                          type="file"
                          id="audio-file-input"
                          required
                          accept="audio/*"
                          onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                          className="w-full bg-surface-container border border-outline/30 rounded-lg p-2.5 text-xs text-on-surface focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={uploadingAudio || !newAudioTag || !audioFile}
                        className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg font-bold text-xs hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {uploadingAudio ? 'sync' : 'cloud_upload'}
                        </span>
                        {uploadingAudio ? 'Subiendo...' : 'Subir Audio'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Sidebar Info Right (col-span-4) */}
              <div className="lg:col-span-4 space-y-6">
                {/* WhatsApp QR Card */}
                <div className="glass-card p-6 rounded-xl flex flex-col items-center justify-between">
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
                  {!isWaConnected && (whatsappStatus.status === 'QR' || whatsappStatus.status === 'INITIALIZING') && (
                    <div className="w-full space-y-2 mt-2">
                      <button 
                        onClick={async () => {
                          if (confirm("¿Deseas cancelar la conexión actual y generar un nuevo código QR?")) {
                            try {
                              await fetch('/api/whatsapp/logout', { method: 'POST' });
                              await new Promise(resolve => setTimeout(resolve, 1500));
                              await fetch(`/api/whatsapp/connect?clientId=${clientId}`, { method: 'POST' });
                            } catch (err) {
                              console.error("Error al reiniciar conexión:", err);
                            }
                          }
                        }}
                        className="w-full bg-surface-container border border-outline/30 hover:border-primary/50 text-on-surface-variant hover:text-primary px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Generar Nuevo QR
                      </button>
                    </div>
                  )}
                </div>

                {/* Logo Upload Card */}
                <div className="glass-card p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-secondary">image</span>
                    <h3 className="font-bold text-sm text-on-surface">Logotipo Comercial</h3>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4 font-sans leading-relaxed">
                    Sube el logotipo de tu empresa. Se mostrará en el menú lateral y en tus facturas.
                  </p>
                  
                  {/* Active Logo Render Box */}
                  <div className="flex items-center gap-4 mb-4">
                    {clientData?.logo_url ? (
                      <div className="w-16 h-16 rounded-xl border border-outline/20 bg-white/5 p-1 flex items-center justify-center relative overflow-hidden">
                        <img 
                          src={`${clientData.logo_url}?t=${logoBuster}`} 
                          alt="Logo Empresa" 
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-primary/10 border border-dashed border-primary/30 flex items-center justify-center text-primary font-bold text-lg font-sans">
                        {clientData?.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload}
                        className="hidden" 
                        id="logo-upload-input" 
                      />
                      <label 
                        htmlFor="logo-upload-input"
                        className="px-3 py-2 bg-surface-container border border-outline/20 hover:border-primary/50 text-on-surface text-xs font-bold rounded-xl cursor-pointer transition inline-flex items-center gap-1.5 font-sans"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload</span>
                        Subir Logotipo
                      </label>
                    </div>
                  </div>

                  {/* Logotipos Historial Dropdown */}
                  {logos.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-outline/10 pt-4">
                      <label className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Historial de Logotipos</label>
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 bg-surface-container border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary transition"
                          value={clientData?.logo_url ? clientData.logo_url.split('/').pop() : ''}
                          onChange={(e) => handleLogoSelect(e.target.value)}
                        >
                          <option value="">-- Selecciona un Logotipo --</option>
                          {logos.map((logo) => (
                            <option key={logo.fileName} value={logo.fileName}>
                              {logo.fileName}
                            </option>
                          ))}
                        </select>
                        {clientData?.logo_url && (
                          <button
                            type="button"
                            onClick={() => {
                              const activeFile = clientData.logo_url?.split('/').pop();
                              if (activeFile) handleLogoDelete(activeFile);
                            }}
                            className="p-2 bg-error/10 hover:bg-error/20 border border-error/20 hover:border-error/45 text-error rounded-xl transition cursor-pointer flex items-center justify-center"
                            title="Eliminar este logotipo del historial"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attention Required / System Alerts */}
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

                {/* IA Agent status */}
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
            </div>

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
          </>
        )}

        {activeTab === 'restaurante_menu' && (
          <div className="animate-fade-in">
            <RestaurantMenuBuilder clientId={clientId} />
          </div>
        )}

        {activeTab === 'restaurante_mesas' && (
          <div className="animate-fade-in">
            <RestaurantWaiterPortal clientId={clientId} />
          </div>
        )}

        {activeTab === 'restaurante_kds' && (
          <div className="animate-fade-in">
            <RestaurantKdsDisplay clientId={clientId} />
          </div>
        )}

        {activeTab === 'inventario' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap gap-2 p-1 bg-surface-container-high rounded-xl border border-outline/10 self-start inline-flex">
              <button 
                onClick={() => setInventorySubTab('catalog')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border-0 ${
                  inventorySubTab === 'catalog' 
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                Catálogo de Inventario
              </button>
              <button 
                onClick={() => setInventorySubTab('purchase-orders')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border-0 ${
                  inventorySubTab === 'purchase-orders' 
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Órdenes de Compra
              </button>
              <button 
                onClick={() => setInventorySubTab('suppliers')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border-0 ${
                  inventorySubTab === 'suppliers' 
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">contact_page</span>
                Proveedores y Categorías
              </button>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-outline/10">
              {inventorySubTab === 'catalog' && (
                <SaaSErpInventory clientId={clientId} category={category} />
              )}
              {inventorySubTab === 'purchase-orders' && (
                <SaaSErpPurchaseOrders clientId={clientId} />
              )}
              {inventorySubTab === 'suppliers' && (
                <SaaSErpSuppliers clientId={clientId} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'facturacion' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpInvoices clientId={clientId} />
          </div>
        )}

        {activeTab === 'contabilidad' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpAccounting clientId={clientId} />
          </div>
        )}

        {activeTab === 'cartera' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpCartera clientId={clientId} />
          </div>
        )}

        {activeTab === 'domicilios' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpDomicilios clientId={clientId} />
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpFormulas clientId={clientId} defaultSubTab="formulas" showSubTabs={false} />
          </div>
        )}

        {activeTab === 'lab_jobs' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpFormulas clientId={clientId} defaultSubTab="lab_jobs" showSubTabs={false} />
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpAppointments clientId={clientId} />
          </div>
        )}

        {activeTab === 'empleados' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpEmployees clientId={clientId} />
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpUsers clientId={clientId} />
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpCRM clientId={clientId} />
          </div>
        )}

        {activeTab === 'campanias' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpCampaigns clientId={clientId} />
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpMarketing clientId={clientId} />
          </div>
        )}

        {activeTab === 'configuracion' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpStoreSettings clientId={clientId} onProfileUpdated={() => {
              // Recargar datos
              fetch(`/api/clients/${clientId}`)
                .then(res => res.json())
                .then(json => {
                  if (json.success && json.data) {
                    setClientData(json.data);
                  }
                })
                .catch(err => console.error("Error recargando logo/datos:", err));
            }} />
          </div>
        )}

        {activeTab === 'trazabilidad' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpAuditLogs clientId={clientId} />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SystemAlertsPanel clientId={clientId} />
          </div>
        )}
      </main>
    </div>
  </div>
);
};
