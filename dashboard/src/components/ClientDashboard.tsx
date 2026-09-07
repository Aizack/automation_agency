import React, { useState, useEffect } from 'react';
import { authFetch as fetch, clearAllSessionData } from '../utils/api';
import { SaaSErpInventory } from './SaaSErpInventory';
import { SaaSErpInvoices } from './SaaSErpInvoices';
import { SaaSErpInvoices2 } from './SaaSErpInvoices2';
import { SaaSErpCartera } from './SaaSErpCartera';
import { SaaSErpDomicilios } from './SaaSErpDomicilios';
import { SaaSErpSuppliers } from './SaaSErpSuppliers';
import { SaaSErpPurchaseOrders } from './SaaSErpPurchaseOrders';
import { SaaSErpFormulas } from './SaaSErpFormulas';
import { SaaSErpLabJobs } from './SaaSErpLabJobs';
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
import { EnterprisePlanningModule } from './EnterprisePlanningModule';
import { RawMaterialsInventory } from './RawMaterialsInventory';
import { SaaSErpSupportDocuments } from './SaaSErpSupportDocuments';
import { SaaSErpCashShifts } from './SaaSErpCashShifts';
import { SaaSErpSupportTickets } from './SaaSErpSupportTickets';
import { SaaSErpSalesTargets } from './SaaSErpSalesTargets';
import { SaaSErpQuotes } from './SaaSErpQuotes';
import { SaaSErpHabilitacionDian } from './SaaSErpHabilitacionDian';
import { SaaSErpAiAgentModule } from './SaaSErpAiAgentModule';

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

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ clientId: rawClientId, onBack }) => {
  const clientId = (rawClientId && rawClientId !== 'undefined')
    ? rawClientId
    : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
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

  const [activeTab, setActiveTab] = useState<'resumen' | 'inventario' | 'facturacion' | 'dian_habilitacion' | 'cotizaciones' | 'facturacion2' | 'contabilidad' | 'cartera' | 'documentos_soporte' | 'arqueo_caja' | 'domicilios' | 'formulas' | 'lab_jobs' | 'agenda' | 'empleados' | 'usuarios' | 'clientes' | 'campanias' | 'marketing' | 'metas_ventas' | 'logs' | 'configuracion' | 'trazabilidad' | 'restaurante_mesas' | 'restaurante_kds' | 'restaurante_menu' | 'planeacion_empresarial' | 'inventario_insumos'>(() => {
    const saved = localStorage.getItem('client_active_tab');
    if (saved) return saved as any;
    return getDefaultTab();
  });
  const [inventorySubTab, setInventorySubTab] = useState<'catalog' | 'purchase-orders' | 'suppliers'>('catalog');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Sistema de Diseño Wabi-Sabi Paper (Exclusivo KOI ERP)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('app_theme', 'wabi-sabi-koi');
    localStorage.setItem('theme', 'wabi-sabi-koi');
    document.documentElement.setAttribute('data-theme', 'wabi-sabi-koi');
  }, []);

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('client_active_tab', activeTab);
    }
  }, [activeTab]);

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
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

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

  // Estados para Módulo Multi-Sede & Selector de Sucursales
  const [branches, setBranches] = useState<any[]>([]);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [branchNameInput, setBranchNameInput] = useState('');
  const [branchCompanyInput, setBranchCompanyInput] = useState('');
  const [branchPhoneInput, setBranchPhoneInput] = useState('');
  const [branchAddressInput, setBranchAddressInput] = useState('');
  const [savingBranch, setSavingBranch] = useState(false);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`/api/clients/${clientId}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setBranches(json.branches || []);
      }
    } catch (err) {
      console.error("Error cargando sucursales:", err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [clientId]);

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
      await fetch(`/api/whatsapp/logout?clientId=${clientId}`, { method: 'POST' });
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
        const waRes = await fetch(`/api/whatsapp/status?clientId=${clientId}`);
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
    cleanPhone(whatsappStatus.phone) === cleanPhone(clientData?.phoneNumber || '');

  const activeUserName = localStorage.getItem('session_name') || localStorage.getItem('emp_name') || localStorage.getItem('user_name') || clientData?.name || 'Usuario Activo';
  const rawRole = localStorage.getItem('session_role') || localStorage.getItem('emp_role') || 'client';
  const activeUserRole = rawRole === 'admin' ? 'Super Admin' : rawRole === 'employee' ? (localStorage.getItem('employee_role') || 'Colaborador') : 'Administrador de Tienda';

  return (
    <div className="flex min-h-screen bg-[#F6F4EE] text-[#161616] font-sans">
      {/* Sidebar Expandable Wabi-Sabi (64px cerrado -> 290px hover) */}
      <aside className="sidebar-expandable" id="sidebarExpandable">
        <div className="sidebar-brand cursor-pointer" onClick={triggerSidebarLogoUpload} title="Haz clic para cambiar el logotipo">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleLogoUpload} 
            className="hidden" 
            id="sidebar-logo-upload-input" 
          />
          {clientData?.logo_url ? (
            <img 
              src={`${clientData.logo_url}?t=${logoBuster}`} 
              alt="Logo" 
              className="w-[40px] h-[40px] min-w-[40px] rounded-md object-contain bg-white border border-[#E2DFD7] p-0.5" 
            />
          ) : (
            <div className="brand-avatar">
              {clientData?.name ? clientData.name.substring(0, 2).toUpperCase() : 'KOI'}
            </div>
          )}
          <div className="brand-info">
            <div className="brand-name truncate max-w-[200px]">{clientData?.name || 'KOI ERP'}</div>
            <div className="brand-sub">SaaS Multi-Tenant</div>
          </div>
        </div>

        {/* Navigation Menu List */}
        <div className="nav-menu-list flex-grow overflow-y-auto custom-scrollbar">
          {hasPermission('settings') && (
            <div className="space-y-1">
              <button 
                onClick={() => setActiveTab('resumen')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'configuracion' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span className="font-bold text-xs">Información Empresa</span>
              </button>
              <button 
                onClick={() => setActiveTab('planeacion_empresarial')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'planeacion_empresarial' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
                <span className="font-bold text-xs">Planeación Empresarial</span>
              </button>
            </div>
          )}

          {clientData?.category === 'restaurante' && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Gastronomía & Mesas</div>
              <button 
                onClick={() => setActiveTab('restaurante_menu')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'restaurante_menu' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                <span className="font-bold text-xs">Crear Menú & Recetario</span>
              </button>
              <button 
                onClick={() => setActiveTab('inventario_insumos')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'inventario_insumos' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">inventory</span>
                <span className="font-bold text-xs">Inventario de Insumos</span>
              </button>
              <button 
                onClick={() => setActiveTab('restaurante_mesas')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'restaurante_mesas' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                <span className="font-bold text-xs">Comandero & Mesas</span>
              </button>
              <button 
                onClick={() => setActiveTab('restaurante_kds')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
              {hasPermission('inventory') && clientData?.enabledModules?.inventory !== false && clientData?.category !== 'restaurante' && (
                <button 
                  onClick={() => setActiveTab('inventario')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'domicilios' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  <span className="font-bold text-xs">Despachos y Domicilios</span>
                </button>
              )}
            </div>
          )}

          {(hasPermission('billing') || hasPermission('contabilidad') || hasPermission('cartera') || hasPermission('cotizaciones') || hasPermission('documentos_soporte') || hasPermission('arqueo_caja')) && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Facturación y Contabilidad</div>
              {hasPermission('billing') && clientData?.enabledModules?.billing !== false && (
                <button 
                  onClick={() => setActiveTab('facturacion')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'facturacion' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span className="font-bold text-xs">Facturación</span>
                </button>
              )}

              {hasPermission('billing') && (
                <button 
                  onClick={() => setActiveTab('dian_habilitacion')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'dian_habilitacion' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">verified</span>
                  <span className="font-bold text-xs flex items-center justify-between w-full">
                    <span>Habilitación DIAN</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono uppercase font-bold">⚡ Factus</span>
                  </span>
                </button>
              )}

              {rawRole === 'admin' && (
                <button 
                  onClick={() => setActiveTab('facturacion2')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'facturacion2' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">receipt</span>
                  <span className="font-bold text-xs flex items-center justify-between w-full">
                    <span>Facturación v2</span>
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono uppercase">Admin Respaldo</span>
                  </span>
                </button>
              )}

              {hasPermission('cotizaciones') && (
                <button 
                  onClick={() => setActiveTab('cotizaciones')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'cotizaciones' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">request_quote</span>
                  <span className="font-bold text-xs">Cotizaciones</span>
                </button>
              )}

              {hasPermission('documentos_soporte') && (
                <button 
                  onClick={() => setActiveTab('documentos_soporte')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'documentos_soporte' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span className="font-bold text-xs">Documentos Soporte</span>
                </button>
              )}

              {hasPermission('arqueo_caja') && (
                <button 
                  onClick={() => setActiveTab('arqueo_caja')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'arqueo_caja' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                  <span className="font-bold text-xs">Arqueo de Caja</span>
                </button>
              )}

              {hasPermission('contabilidad') && (
                <button 
                  onClick={() => setActiveTab('contabilidad')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'cartera' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span className="font-bold text-xs">Cartera</span>
                </button>
              )}
            </div>
          )}

          {(hasPermission('crm') || hasPermission('campaigns') || hasPermission('marketing') || hasPermission('metas_ventas')) && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Marketing y Ventas</div>
              {hasPermission('crm') && clientData?.enabledModules?.crm !== false && (
                <button 
                  onClick={() => setActiveTab('clientes')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'marketing' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">campaign</span>
                  <span className="font-bold text-xs">Difusión Promocional</span>
                </button>
              )}

              {hasPermission('metas_ventas') && (
                <button 
                  onClick={() => setActiveTab('metas_ventas')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'metas_ventas' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  <span className="font-bold text-xs">Metas & Ventas Personal</span>
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
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
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
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'formulas' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                  <span className="font-bold text-xs">Optometría</span>
                </button>
              )}
            </div>
          )}

          {(hasPermission('employees') || hasPermission('trazabilidad')) && (
            <div className="space-y-1 pt-1">
              <div className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">Administración de Personal</div>
              {hasPermission('employees') && clientData?.enabledModules?.employees !== false && (
                <button 
                  onClick={() => setActiveTab('empleados')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'empleados' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  <span className="font-bold text-xs">Administración de Personal</span>
                </button>
              )}
              {hasPermission('employees') && (
                <button 
                  onClick={() => setActiveTab('usuarios')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'usuarios' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                  <span className="font-bold text-xs">Accesos y Permisos</span>
                </button>
              )}
              {hasPermission('trazabilidad') && (
                <button 
                  onClick={() => setActiveTab('trazabilidad')}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                    activeTab === 'trazabilidad' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">shield</span>
                  <span className="font-bold text-xs">Trazabilidad & Auditoría</span>
                </button>
              )}
            </div>
          )}

          {hasPermission('system_status') && (
            <div className="space-y-1 pt-1">
              <button 
                onClick={() => setActiveTab('logs')}
                className={`w-full text-left flex items-center gap-3 p-3 rounded-md border-0 cursor-pointer font-sans transition-all duration-200 ${
                  activeTab === 'logs' ? 'bg-primary/10 text-primary sidebar-item-active' : 'text-on-surface-variant hover:bg-surface-variant/40 bg-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">build</span>
                <span className="font-bold text-xs">Estado del Sistema</span>
              </button>
            </div>
          )}
        </div>
        
        {/* User Session Info & Back / Logout footer */}
        <div className="border-t border-[#E2DFD7] p-3 mt-auto flex items-center justify-between text-xs text-[#6B6862]">
          <span className="text-[10px] font-mono opacity-50">KOI ERP v1.0</span>
          {rawRole === 'admin' && (
            <button 
              onClick={onBack}
              className="text-[10px] text-[#D9381E] hover:underline font-bold bg-transparent border-0 cursor-pointer flex items-center gap-1"
              title="Volver a la consola admin"
            >
              <span className="material-symbols-outlined text-[12px]">arrow_back</span>
              Admin
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area Wabi-Sabi (64px margin-left) */}
      <div className="content-area ml-[64px] flex-1 flex flex-col min-h-screen bg-[#F6F4EE]">
        {/* Top Header Zen (Propuesta Principal KOI ERP) */}
        <header className="top-header-zen sticky top-0 z-40 bg-[#F6F4EE] border-b border-[#E2DFD7] px-8 py-4 flex items-center justify-between">
          <div className="top-header-left-zen flex items-center gap-8">
            <div className="top-header-brand-zen font-serif text-3xl font-normal text-[#161616]" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>
              KOI ERP
            </div>
            
            <div className="search-bar-zen hidden md:flex items-center gap-3 border-b border-[#161616] pb-1 w-80">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#161616] stroke-[1.8]">
                <circle cx="11" cy="11" r="7"/>
                <line x1="16.5" y1="16.5" x2="21" y2="21"/>
              </svg>
              <input type="text" placeholder="Buscar en inventario, facturas, citas..." className="bg-transparent border-none outline-none text-xs text-[#161616] w-full font-sans" />
            </div>
          </div>

          <div className="top-header-right-zen flex items-center gap-6">
            <div className="tenant-indicator-zen text-right hidden sm:flex flex-col">
              <span className="tenant-label-zen text-[10px] text-[#D9381E] font-bold uppercase tracking-widest">Negocio Activo</span>
              <span className="tenant-name-zen font-serif text-lg text-[#161616]" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>{clientData?.name || 'Óptica Nuevo Horizonte'}</span>
            </div>

            <div className="h-7 w-[1px] bg-[#E2DFD7] hidden sm:block"></div>

            {/* Store Switcher Dropdown (Módulo Multi-Sede) */}
            {branches.length > 0 && (
              <div className="relative">
                <select
                  value={clientId}
                  onChange={(e) => {
                    const newClientId = e.target.value;
                    localStorage.setItem('current_client_id', newClientId);
                    window.location.reload();
                  }}
                  className="bg-white border border-[#E2DFD7] rounded-[4px] px-3 py-1.5 text-xs font-bold text-[#161616] outline-none cursor-pointer"
                  title="Cambiar de Sede / Puntos de Venta"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id} className="bg-white text-[#161616] font-semibold">
                      {b.is_main_branch ? '🏢' : '📍'} {b.branch_name || b.name} {b.is_main_branch ? '(Matriz)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Botón Volver al Panel Admin / SuperAdmin (si aplica) */}
            {rawRole === 'admin' && (
              <button 
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white hover:bg-[#FAF8F3] text-[#161616] border border-[#E2DFD7] transition cursor-pointer text-xs font-bold"
                title="Regresar a la Consola General de Administrador"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                <span className="hidden md:inline">Volver a Admin</span>
              </button>
            )}

            {/* User Profile Badge & Dropdown Menu */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 bg-transparent border-0 cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#161616] text-[#F6F4EE] font-bold text-xs flex items-center justify-center shrink-0">
                  {activeUserName.substring(0, 1).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#161616] truncate leading-tight">{activeUserName}</span>
                  <span className="text-[10px] text-[#6B6862] font-mono truncate uppercase tracking-wider">
                    {activeUserRole} ▾
                  </span>
                </div>
              </button>

              {/* Menú Desplegable de Usuario */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-[#E2DFD7] rounded-[4px] shadow-lg p-2 z-50 divide-y divide-[#E2DFD7] animate-fade-in">
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-bold text-[#161616] leading-tight">{activeUserName}</p>
                    <p className="text-[10px] text-[#D9381E] font-mono uppercase font-bold">{activeUserRole}</p>
                    <p className="text-[10px] text-[#6B6862] truncate">{clientData?.name}</p>
                  </div>

                  <div className="py-1 space-y-1">
                    {(rawRole === 'admin' || rawRole === 'superadmin' || localStorage.getItem('session_role') === 'superadmin') && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onBack();
                        }}
                        className="w-full text-left p-2.5 rounded-[4px] flex items-center gap-2 text-xs font-bold text-[#161616] hover:bg-[#FAF8F3] transition cursor-pointer border-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Volver al Panel General Admin
                      </button>
                    )}
                    <button
                      onClick={() => {
                        clearAllSessionData();
                        onBack();
                      }}
                      className="w-full text-left p-2.5 rounded-[4px] flex items-center gap-2 text-xs font-bold text-[#D9381E] hover:bg-[#FAF8F3] transition cursor-pointer border-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-8">

        {activeTab === 'resumen' && (
          <SaaSErpAiAgentModule
            clientId={clientId}
            clientData={clientData}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            toneOfVoice={toneOfVoice}
            setToneOfVoice={setToneOfVoice}
            driveFolderId={driveFolderId}
            syncingDrive={syncingDrive}
            syncResult={syncResult}
            handleSyncDrive={handleSyncDrive}
            uploadedFiles={uploadedFiles}
            loadingFiles={loadingFiles}
            uploadingFile={uploadingFile}
            handleFileUpload={handleFileUpload}
            agents={agents}
            loadingAgents={loadingAgents}
            handleAddAgent={handleAddAgent}
            handleDeleteAgent={handleDeleteAgent}
            handleToggleAgentStatus={handleToggleAgentStatus}
            newAgentName={newAgentName}
            setNewAgentName={setNewAgentName}
            newAgentPhone={newAgentPhone}
            setNewAgentPhone={setNewAgentPhone}
            newAgentPriority={newAgentPriority}
            setNewAgentPriority={setNewAgentPriority}
            employeeSearchQuery={employeeSearchQuery}
            setEmployeeSearchQuery={setEmployeeSearchQuery}
            isEmployeeSearchOpen={isEmployeeSearchOpen}
            setIsEmployeeSearchOpen={setIsEmployeeSearchOpen}
            employeeList={employeeList}
            audios={audios}
            loadingAudios={loadingAudios}
            newAudioTag={newAudioTag}
            setNewAudioTag={setNewAudioTag}
            audioFile={audioFile}
            setAudioFile={setAudioFile}
            uploadingAudio={uploadingAudio}
            handleUploadAudio={handleUploadAudio}
            handleDeleteAudio={handleDeleteAudio}
            whatsappStatus={whatsappStatus}
            handleConnectWhatsApp={handleConnectWhatsApp}
            handleDisconnectWhatsApp={handleDisconnectWhatsApp}
            isWaConnected={isWaConnected}
            isEditingPhone={isEditingPhone}
            setIsEditingPhone={setIsEditingPhone}
            tempPhone={tempPhone}
            setTempPhone={setTempPhone}
            handleSavePhoneNumber={handleSavePhoneNumber}
            logos={logos}
            logoBuster={logoBuster}
            handleLogoUpload={handleLogoUpload}
            handleLogoSelect={handleLogoSelect}
            handleLogoDelete={handleLogoDelete}
            interactions={interactions}
            metrics={metrics}
            saveSuccess={saveSuccess}
            handleSaveConfig={handleSaveConfig}
          />
        )}

        {activeTab === 'planeacion_empresarial' && (
          <div className="animate-fade-in">
            <EnterprisePlanningModule clientId={clientId} />
          </div>
        )}

        {activeTab === 'inventario_insumos' && (
          <div className="animate-fade-in">
            <RawMaterialsInventory clientId={clientId} />
          </div>
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

        {activeTab === 'dian_habilitacion' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpHabilitacionDian clientId={clientId} />
          </div>
        )}

        {activeTab === 'facturacion2' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpInvoices2 clientId={clientId} />
          </div>
        )}

        {activeTab === 'cotizaciones' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpQuotes clientId={clientId} />
          </div>
        )}

        {activeTab === 'documentos_soporte' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpSupportDocuments clientId={clientId} />
          </div>
        )}

        {activeTab === 'arqueo_caja' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpCashShifts clientId={clientId} />
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
            <SaaSErpFormulas clientId={clientId} />
          </div>
        )}

        {activeTab === 'lab_jobs' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpLabJobs clientId={clientId} />
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

        {activeTab === 'metas_ventas' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpSalesTargets clientId={clientId} />
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

        {/* Modal / Drawer de Soporte Técnico & Tickets AutoFix IA */}
        {isSupportModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-surface-container-highest border border-outline/30 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4">
              <SaaSErpSupportTickets clientId={clientId} onClose={() => setIsSupportModalOpen(false)} />
            </div>
          </div>
        )}

        {/* Modal de Creación de Nueva Sede / Sucursal (Add-on) */}
        {isAddBranchModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-surface-container-highest border border-outline/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">add_business</span>
                  Agregar Nueva Sede / Sucursal (Add-on)
                </h3>
                <button
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="p-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!branchNameInput || !branchCompanyInput) return;
                  try {
                    setSavingBranch(true);
                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                    const res = await fetch(`/api/clients/${clientId}/branches`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({
                        name: branchCompanyInput,
                        branch_name: branchNameInput,
                        phone: branchPhoneInput,
                        address: branchAddressInput
                      })
                    });
                    const json = await res.json();
                    if (json.success) {
                      alert(json.message);
                      setIsAddBranchModalOpen(false);
                      setBranchNameInput('');
                      setBranchCompanyInput('');
                      setBranchPhoneInput('');
                      setBranchAddressInput('');
                      fetchBranches();
                    } else {
                      alert(`Error: ${json.error}`);
                    }
                  } catch (err: any) {
                    alert(`Error de conexión: ${err.message}`);
                  } finally {
                    setSavingBranch(false);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase">Nombre de la Sede / Punto de Venta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sede Ciudadela / Sucursal Norte"
                    value={branchNameInput}
                    onChange={(e) => setBranchNameInput(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase">Razón Social / Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Óptica La 8 S.A.S"
                    value={branchCompanyInput}
                    onChange={(e) => setBranchCompanyInput(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ej. 3001234567"
                      value={branchPhoneInput}
                      onChange={(e) => setBranchPhoneInput(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase">Dirección</label>
                    <input
                      type="text"
                      placeholder="Ej. Calle 45 # 12-34"
                      value={branchAddressInput}
                      onChange={(e) => setBranchAddressInput(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddBranchModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline/20 font-bold text-on-surface cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingBranch}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    {savingBranch ? 'Guardando...' : 'Crear Sede'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
