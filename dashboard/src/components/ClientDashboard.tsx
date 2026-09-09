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
import { NotificationBell } from './NotificationBell';
import { AizackAiBar } from './AizackAiBar';

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
  branchName?: string;
  branch_name?: string;
  isMainBranch?: boolean;
  is_main_branch?: boolean;
  parentClientId?: string;
  parent_client_id?: string;
  hasCustomTaxId?: boolean;
  legalName?: string;
  customTaxId?: string;
  phone?: string;
  address?: string;
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
    if (!isEmployeeSession) return 'configuracion';
    if (employeePermissions.includes('settings')) return 'configuracion';
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
    return 'configuracion';
  };

  const [activeTab, setActiveTab] = useState<'resumen' | 'inventario' | 'facturacion' | 'dian_habilitacion' | 'nueva_sede' | 'cotizaciones' | 'facturacion2' | 'contabilidad' | 'cartera' | 'documentos_soporte' | 'arqueo_caja' | 'domicilios' | 'formulas' | 'lab_jobs' | 'agenda' | 'empleados' | 'usuarios' | 'clientes' | 'campanias' | 'marketing' | 'metas_ventas' | 'logs' | 'configuracion' | 'trazabilidad' | 'restaurante_mesas' | 'restaurante_kds' | 'restaurante_menu' | 'planeacion_empresarial' | 'inventario_insumos'>(() => {
    const saved = localStorage.getItem('client_active_tab');
    if (saved) return saved as any;
    return getDefaultTab();
  });

  // Submenús desplegables del menú lateral Wabi-Sabi
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    empresa: true,
    agente_ia: false,
    facturacion: false,
    finanzas: false,
    logistica: false,
    marketing: false,
    citas: false,
    personal: false,
    gastronomia: false
  });

  const toggleSubMenu = (menuId: string) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  useEffect(() => {
    if (['configuracion', 'dian_habilitacion', 'nueva_sede'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, empresa: true }));
    } else if (activeTab === 'resumen') {
      setOpenSubMenus(prev => ({ ...prev, agente_ia: true }));
    } else if (['facturacion', 'facturacion2', 'cotizaciones', 'documentos_soporte', 'arqueo_caja', 'cartera'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, facturacion: true }));
    } else if (['contabilidad', 'planeacion_empresarial'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, finanzas: true }));
    } else if (['inventario', 'lab_jobs', 'domicilios'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, logistica: true }));
    } else if (['clientes', 'campanias', 'marketing', 'metas_ventas'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, marketing: true }));
    } else if (['agenda', 'formulas'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, citas: true }));
    } else if (['empleados', 'usuarios', 'trazabilidad', 'logs'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, personal: true }));
    } else if (['restaurante_menu', 'inventario_insumos', 'restaurante_mesas', 'restaurante_kds'].includes(activeTab)) {
      setOpenSubMenus(prev => ({ ...prev, gastronomia: true }));
    }
  }, [activeTab]);

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
  const [branchNameInput, setBranchNameInput] = useState('');
  const [branchLegalNameInput, setBranchLegalNameInput] = useState('');
  const [branchPhoneInput, setBranchPhoneInput] = useState('');
  const [branchAddressInput, setBranchAddressInput] = useState('');
  const [branchEmailInput, setBranchEmailInput] = useState('');
  const [branchCategoryInput, setBranchCategoryInput] = useState('optica');
  const [branchPersonTypeInput, setBranchPersonTypeInput] = useState('persona_juridica');
  const [branchInvoiceFooterInput, setBranchInvoiceFooterInput] = useState('');
  const [hasCustomTaxIdInput, setHasCustomTaxIdInput] = useState(false);
  const [legalNameInput, setLegalNameInput] = useState('');
  const [customTaxIdInput, setCustomTaxIdInput] = useState('');
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

  // Carga inicial y suscripción a eventos en tiempo real (SSE) para WhatsApp, Logs y Métricas
  useEffect(() => {
    const fetchWaStatus = async () => {
      try {
        const waRes = await fetch(`/api/whatsapp/status?clientId=${clientId}`);
        const waJson = await waRes.json();
        if (waJson.success) {
          setWhatsappStatus(waJson.data);
        }
      } catch (error) {
        console.error("[ClientDashboard] Error consultando estado WhatsApp:", error);
      }
    };

    const fetchLogsAndMetrics = async () => {
      try {
        const logsRes = await fetch(`/api/clients/${clientId}/logs`);
        const logsJson = await logsRes.json();
        if (logsJson.success) {
          setInteractions(logsJson.data);
        }
        fetchDashboardMetrics();
      } catch (error) {
        console.error("[ClientDashboard] Error consultando logs y métricas:", error);
      }
    };

    // Carga inicial estática al montar
    fetchWaStatus();
    fetchLogsAndMetrics();

    // Escucha de eventos push en tiempo real (EventSource SSE)
    const es = new EventSource(`/api/events/stream?clientId=${clientId}`);

    // Disparador de estado de WhatsApp en tiempo real
    es.addEventListener('whatsapp_status', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setWhatsappStatus(data);
      } catch {
        fetchWaStatus();
      }
    });

    // Disparador de logs e interacciones
    es.addEventListener('logs_update', () => {
      fetchLogsAndMetrics();
    });

    return () => {
      es.close();
    };
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
                placeholder="Ej. Mi Empresa Demo S.A.S."
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
            <div className="brand-name truncate max-w-[200px]" title={clientData?.branchName || (clientData as any)?.branch_name ? `${clientData.name} (${clientData.branchName || (clientData as any).branch_name})` : clientData?.name}>
              {clientData?.branchName || (clientData as any)?.branch_name
                ? `${clientData.name} - ${clientData.branchName || (clientData as any).branch_name}`
                : (clientData?.name || 'KOI ERP')}
            </div>
            <div className="brand-sub font-semibold text-primary">
              {(clientData as any)?.is_main_branch || (clientData as any)?.isMainBranch ? '🏢 Empresa Matriz' : '📍 Sede Sucursal'}
            </div>
          </div>
        </div>

        {/* Navigation Menu List (Orden del Sistema ERP Wabi-Sabi) */}
        <div className="nav-menu-list flex-grow overflow-y-auto custom-scrollbar">
          
          {/* 1. Datos de la Empresa (Pantalla Principal) */}
          {hasPermission('settings') && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['configuracion', 'dian_habilitacion', 'nueva_sede'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('empresa')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24"><polygon points="12,2 19,7 19,17 12,22 5,17 5,7"/></svg>
                <span className="nav-text">
                  <span>Datos de la Empresa</span> 
                  <span className={`caret-arrow ${openSubMenus.empresa ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.empresa ? 'open' : ''}`}>
                <li>
                  <button 
                    onClick={() => setActiveTab('configuracion')} 
                    className={activeTab === 'configuracion' ? 'active-link' : ''}
                  >
                    Datos de la Empresa
                  </button>
                </li>
                {hasPermission('billing') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('dian_habilitacion')} 
                      className={activeTab === 'dian_habilitacion' ? 'active-link' : ''}
                    >
                      Habilitación DIAN
                    </button>
                  </li>
                )}
                <li>
                  <button 
                    onClick={() => setActiveTab('nueva_sede')} 
                    className={activeTab === 'nueva_sede' ? 'active-link font-bold text-[#D9381E]' : 'text-[#D9381E] font-bold'}
                  >
                    + Nueva Sede
                  </button>
                </li>
              </ul>
            </div>
          )}

          {/* 2. Configuración Agente IA */}
          {hasPermission('settings') && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${activeTab === 'resumen' ? 'active' : ''}`}
                onClick={() => setActiveTab('resumen')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                  <path d="M9 15h6"/>
                </svg>
                <span className="nav-text">
                  <span>Configuración Agente IA</span>
                </span>
              </button>
            </div>
          )}

          {/* 3. Logística & Stock */}
          {(hasPermission('inventory') || hasPermission('lab') || hasPermission('domicilios')) && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['inventario', 'lab_jobs', 'domicilios'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('logistica')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span className="nav-text">
                  <span>Logística & Stock</span> 
                  <span className={`caret-arrow ${openSubMenus.logistica ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.logistica ? 'open' : ''}`}>
                {hasPermission('inventory') && clientData?.enabledModules?.inventory !== false && clientData?.category !== 'restaurante' && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('inventario')} 
                      className={activeTab === 'inventario' ? 'active-link' : ''}
                    >
                      Inventario de Productos
                    </button>
                  </li>
                )}
                {hasPermission('lab') && clientData?.category === 'optica' && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('lab_jobs')} 
                      className={activeTab === 'lab_jobs' ? 'active-link' : ''}
                    >
                      Trabajos de Laboratorio
                    </button>
                  </li>
                )}
                {hasPermission('domicilios') && clientData?.enabledModules?.billing !== false && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('domicilios')} 
                      className={activeTab === 'domicilios' ? 'active-link' : ''}
                    >
                      Despachos y Domicilios
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 4. Facturación */}
          {(hasPermission('billing') || hasPermission('cartera') || hasPermission('cotizaciones') || hasPermission('documentos_soporte') || hasPermission('arqueo_caja')) && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['facturacion', 'facturacion2', 'cotizaciones', 'documentos_soporte', 'arqueo_caja', 'cartera'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('facturacion')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
                <span className="nav-text">
                  <span>Facturación</span> 
                  <span className={`caret-arrow ${openSubMenus.facturacion ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.facturacion ? 'open' : ''}`}>
                {hasPermission('billing') && clientData?.enabledModules?.billing !== false && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('facturacion')} 
                      className={activeTab === 'facturacion' ? 'active-link' : ''}
                    >
                      Facturación POS & DIAN
                    </button>
                  </li>
                )}
                {rawRole === 'admin' && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('facturacion2')} 
                      className={activeTab === 'facturacion2' ? 'active-link' : ''}
                    >
                      Facturación v2 (Admin)
                    </button>
                  </li>
                )}
                {hasPermission('cotizaciones') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('cotizaciones')} 
                      className={activeTab === 'cotizaciones' ? 'active-link' : ''}
                    >
                      Cotizaciones
                    </button>
                  </li>
                )}
                {hasPermission('documentos_soporte') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('documentos_soporte')} 
                      className={activeTab === 'documentos_soporte' ? 'active-link' : ''}
                    >
                      Documentos Soporte
                    </button>
                  </li>
                )}
                {hasPermission('arqueo_caja') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('arqueo_caja')} 
                      className={activeTab === 'arqueo_caja' ? 'active-link' : ''}
                    >
                      Arqueo de Caja
                    </button>
                  </li>
                )}
                {hasPermission('cartera') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('cartera')} 
                      className={activeTab === 'cartera' ? 'active-link' : ''}
                    >
                      Cartera de Cobros
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 5. Finanzas */}
          {(hasPermission('contabilidad') || hasPermission('settings')) && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['contabilidad', 'planeacion_empresarial'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('finanzas')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <line x1="12" y1="20" x2="12" y2="10"/>
                  <line x1="18" y1="20" x2="18" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span className="nav-text">
                  <span>Finanzas</span> 
                  <span className={`caret-arrow ${openSubMenus.finanzas ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.finanzas ? 'open' : ''}`}>
                {hasPermission('contabilidad') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('contabilidad')} 
                      className={activeTab === 'contabilidad' ? 'active-link' : ''}
                    >
                      Contabilidad
                    </button>
                  </li>
                )}
                <li>
                  <button className="opacity-70 cursor-not-allowed">
                    Nómina Electrónica <span className="text-[#D9381E] font-bold">⚡</span>
                  </button>
                </li>
                <li>
                  <button className="opacity-70 cursor-not-allowed">
                    Exógena & Form 350
                  </button>
                </li>
                <li>
                  <button className="opacity-70 cursor-not-allowed">
                    Conciliación Bancaria
                  </button>
                </li>
                {hasPermission('settings') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('planeacion_empresarial')} 
                      className={activeTab === 'planeacion_empresarial' ? 'active-link' : ''}
                    >
                      Planeación Empresarial
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 6. Clientes & Difusión */}
          {(hasPermission('crm') || hasPermission('campaigns') || hasPermission('marketing') || hasPermission('metas_ventas')) && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['clientes', 'campanias', 'marketing', 'metas_ventas'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('marketing')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                <span className="nav-text">
                  <span>Clientes & Difusión</span> 
                  <span className={`caret-arrow ${openSubMenus.marketing ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.marketing ? 'open' : ''}`}>
                {hasPermission('crm') && clientData?.enabledModules?.crm !== false && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('clientes')} 
                      className={activeTab === 'clientes' ? 'active-link' : ''}
                    >
                      CRM Clientes
                    </button>
                  </li>
                )}
                {hasPermission('campaigns') && clientData?.enabledModules?.field_visits !== false && clientData?.category === 'optica' && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('campanias')} 
                      className={activeTab === 'campanias' ? 'active-link' : ''}
                    >
                      Campañas de Campo
                    </button>
                  </li>
                )}
                {hasPermission('marketing') && clientData?.enabledModules?.marketing !== false && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('marketing')} 
                      className={activeTab === 'marketing' ? 'active-link' : ''}
                    >
                      Difusión Promocional
                    </button>
                  </li>
                )}
                {hasPermission('metas_ventas') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('metas_ventas')} 
                      className={activeTab === 'metas_ventas' ? 'active-link' : ''}
                    >
                      Metas & Ventas Personal
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 7. Citas & Salud Visual */}
          {(hasPermission('appointments') || hasPermission('formulas')) && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['agenda', 'formulas'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('citas')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24"><path d="M12 4a8 8 0 100 16 8 8 0 000-16zM12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                <span className="nav-text">
                  <span>
                    {clientData?.category === 'restaurante' ? 'Reservas' :
                     clientData?.category === 'optica' ? 'Citas & Salud Visual' : 'Agenda'}
                  </span> 
                  <span className={`caret-arrow ${openSubMenus.citas ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.citas ? 'open' : ''}`}>
                {hasPermission('appointments') && clientData?.enabledModules?.appointments !== false && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('agenda')} 
                      className={activeTab === 'agenda' ? 'active-link' : ''}
                    >
                      {clientData?.category === 'restaurante' ? 'Reservas de Mesa' :
                       clientData?.category === 'optica' ? 'Programación de Citas' : 'Agenda Citas'}
                    </button>
                  </li>
                )}
                {hasPermission('formulas') && clientData?.category === 'optica' && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('formulas')} 
                      className={activeTab === 'formulas' ? 'active-link' : ''}
                    >
                      Optometría (Fórmulas)
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 8. Personal & Seguridad */}
          {(hasPermission('employees') || hasPermission('trazabilidad') || hasPermission('system_status')) && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['empleados', 'usuarios', 'trazabilidad', 'logs'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('personal')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20"/></svg>
                <span className="nav-text">
                  <span>Personal & Seguridad</span> 
                  <span className={`caret-arrow ${openSubMenus.personal ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.personal ? 'open' : ''}`}>
                {hasPermission('employees') && clientData?.enabledModules?.employees !== false && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('empleados')} 
                      className={activeTab === 'empleados' ? 'active-link' : ''}
                    >
                      Administración de Personal
                    </button>
                  </li>
                )}
                {hasPermission('employees') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('usuarios')} 
                      className={activeTab === 'usuarios' ? 'active-link' : ''}
                    >
                      Accesos y Permisos
                    </button>
                  </li>
                )}
                {hasPermission('trazabilidad') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('trazabilidad')} 
                      className={activeTab === 'trazabilidad' ? 'active-link' : ''}
                    >
                      Trazabilidad & Auditoría
                    </button>
                  </li>
                )}
                {hasPermission('system_status') && (
                  <li>
                    <button 
                      onClick={() => setActiveTab('logs')} 
                      className={activeTab === 'logs' ? 'active-link' : ''}
                    >
                      Estado del Sistema
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Gastronomía & Mesas (si es categoría restaurante) */}
          {clientData?.category === 'restaurante' && (
            <div className="nav-item">
              <button 
                className={`nav-item-btn ${['restaurante_menu', 'inventario_insumos', 'restaurante_mesas', 'restaurante_kds'].includes(activeTab) ? 'active' : ''}`} 
                onClick={() => toggleSubMenu('gastronomia')}
              >
                <svg className="nav-icon" viewBox="0 0 24 24">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
                <span className="nav-text">
                  <span>Gastronomía & Mesas</span> 
                  <span className={`caret-arrow ${openSubMenus.gastronomia ? 'open' : ''}`}>▾</span>
                </span>
              </button>
              <ul className={`sub-menu ${openSubMenus.gastronomia ? 'open' : ''}`}>
                <li>
                  <button 
                    onClick={() => setActiveTab('restaurante_menu')} 
                    className={activeTab === 'restaurante_menu' ? 'active-link' : ''}
                  >
                    Crear Menú & Recetario
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('inventario_insumos')} 
                    className={activeTab === 'inventario_insumos' ? 'active-link' : ''}
                  >
                    Inventario de Insumos
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('restaurante_mesas')} 
                    className={activeTab === 'restaurante_mesas' ? 'active-link' : ''}
                  >
                    Comandero & Mesas
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('restaurante_kds')} 
                    className={activeTab === 'restaurante_kds' ? 'active-link' : ''}
                  >
                    Pantalla KDS (Cocina/Barra)
                  </button>
                </li>
              </ul>
            </div>
          )}

        </div>
        
        {/* User Session Info & Back / Logout footer */}
        <div className="sidebar-footer">
          <span className="text-[10px] font-mono opacity-50">KOI ERP v1.0</span>
          {rawRole === 'admin' && (
            <button 
              onClick={onBack}
              className="text-[10px] text-[#D9381E] hover:underline font-bold bg-transparent border-0 cursor-pointer flex items-center gap-1"
              title="Volver a la consola admin"
            >
              <span className="material-symbols-outlined text-[12px]">arrow_back</span>
              <span>Admin</span>
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
            
            {/* Barra de Inteligencia Artificial ("Habla Conmigo - Aizack AI") */}
            <div className="hidden md:flex flex-1 max-w-lg">
              <AizackAiBar 
                clientId={clientId}
                onExecuteCommand={(actionType) => {
                  if (actionType === 'NAV_CONTABILIDAD') setActiveTab('contabilidad' as any);
                  else if (actionType === 'NAV_POS') setActiveTab('facturacion' as any);
                  else if (actionType === 'NAV_COMPRAS') setActiveTab('ordenes_compra' as any);
                }}
              />
            </div>
          </div>

          <div className="top-header-right-zen flex items-center gap-4">
            {/* Campanita de Notificaciones del Sistema */}
            <NotificationBell 
              clientId={clientId} 
              onConnectWhatsApp={handleConnectWhatsApp}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />

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
          <div className="animate-fade-in space-y-6">
            {/* Pestañas de Navegación de Inventario - Wabi-Sabi */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#E2DFD7]">
              <button 
                type="button"
                onClick={() => setInventorySubTab('catalog')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 rounded-none border ${
                  inventorySubTab === 'catalog' 
                    ? 'bg-[#D9381E] text-white border-[#D9381E] shadow-xs' 
                    : 'bg-white text-[#6B6862] border-[#E2DFD7] hover:text-[#161616] hover:border-[#161616]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                Catálogo de Inventario
              </button>
              <button 
                type="button"
                onClick={() => setInventorySubTab('purchase-orders')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 rounded-none border ${
                  inventorySubTab === 'purchase-orders' 
                    ? 'bg-[#D9381E] text-white border-[#D9381E] shadow-xs' 
                    : 'bg-white text-[#6B6862] border-[#E2DFD7] hover:text-[#161616] hover:border-[#161616]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Órdenes de Compra
              </button>
              <button 
                type="button"
                onClick={() => setInventorySubTab('suppliers')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 rounded-none border ${
                  inventorySubTab === 'suppliers' 
                    ? 'bg-[#D9381E] text-white border-[#D9381E] shadow-xs' 
                    : 'bg-white text-[#6B6862] border-[#E2DFD7] hover:text-[#161616] hover:border-[#161616]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">contact_page</span>
                Proveedores y Categorías
              </button>
            </div>

            {inventorySubTab === 'catalog' && (
              <SaaSErpInventory clientId={clientId} category={category} />
            )}
            {inventorySubTab === 'purchase-orders' && (
              <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-6 rounded-none shadow-xs">
                <SaaSErpPurchaseOrders clientId={clientId} />
              </div>
            )}
            {inventorySubTab === 'suppliers' && (
              <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-6 rounded-none shadow-xs">
                <SaaSErpSuppliers clientId={clientId} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'facturacion' && (
          <div className="animate-fade-in">
            <SaaSErpInvoices clientId={clientId} />
          </div>
        )}

        {activeTab === 'dian_habilitacion' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpHabilitacionDian clientId={clientId} />
          </div>
        )}

        {activeTab === 'nueva_sede' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10 space-y-6">
            <div className="flex items-center justify-between border-b border-outline/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">add_business</span>
                  Agregar Nueva Sede / Sucursal (Add-on)
                </h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Registra un nuevo punto de venta o sucursal independiente vinculada a tu cuenta multi-tenant.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario de Creación */}
              <div className="lg:col-span-2 bg-surface-container-low border border-outline/15 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline/10 pb-3">
                  <span className="material-symbols-outlined text-primary text-base">edit_note</span>
                  Datos de la Nueva Sede
                </h3>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!branchNameInput) return;
                    try {
                      setSavingBranch(true);
                      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                      const resolvedCompanyName = branchLegalNameInput || clientData?.name || branchNameInput;
                      const res = await fetch(`/api/clients/${clientId}/branches`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          name: resolvedCompanyName,
                          branch_name: branchNameInput,
                          phone: branchPhoneInput,
                          address: branchAddressInput,
                          email: branchEmailInput,
                          person_type: branchPersonTypeInput,
                          category: branchCategoryInput,
                          invoice_footer: branchInvoiceFooterInput,
                          has_custom_tax_id: hasCustomTaxIdInput,
                          legal_name: hasCustomTaxIdInput ? legalNameInput : resolvedCompanyName,
                          custom_tax_id: hasCustomTaxIdInput ? customTaxIdInput : null
                        })
                      });
                      const json = await res.json();
                      if (json.success) {
                        alert(json.message);
                        setBranchNameInput('');
                        setBranchLegalNameInput('');
                        setBranchPhoneInput('');
                        setBranchAddressInput('');
                        setBranchEmailInput('');
                        setBranchInvoiceFooterInput('');
                        setHasCustomTaxIdInput(false);
                        setLegalNameInput('');
                        setCustomTaxIdInput('');
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
                  className="space-y-4 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase">Nombre de la Sede / Punto de Venta *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Sucursal Norte / Sede Ciudadela"
                        value={branchNameInput}
                        onChange={(e) => setBranchNameInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase">Nombre / Razón Social Legal del Negocio *</label>
                      <input
                        type="text"
                        required
                        placeholder={clientData?.name || "Ej. Óptica Nuevo Horizonte S.A.S."}
                        value={branchLegalNameInput}
                        onChange={(e) => setBranchLegalNameInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase">Categoría del Negocio *</label>
                      <select
                        value={branchCategoryInput}
                        onChange={(e) => setBranchCategoryInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary font-semibold"
                      >
                        <option value="optica">👓 Óptica / Centro Clínico</option>
                        <option value="restaurante">🍽️ Restaurante / Gastronomía</option>
                        <option value="retail">🛍️ Comercio / Tienda Retail</option>
                        <option value="servicios">💼 Servicios Prof. / Salud</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase">Tipo de Persona (Tributaria DIAN) *</label>
                      <select
                        value={branchPersonTypeInput}
                        onChange={(e) => setBranchPersonTypeInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary font-semibold"
                      >
                        <option value="persona_juridica">🏢 Persona Jurídica (Empresa S.A.S. / S.A.)</option>
                        <option value="persona_natural">👤 Persona Natural (Régimen Simplificado / PN)</option>
                      </select>
                    </div>
                  </div>

                  {/* Switch / Toggle Fiscal (NIT Propio vs Heredado) - Wabi-Sabi Paper Design */}
                  <div className={`p-4 rounded-xl border transition-all ${
                    hasCustomTaxIdInput 
                      ? 'bg-white border-primary/50 shadow-xs' 
                      : 'bg-white border-[#E2DFD7]'
                  }`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">badge</span>
                          <span className="text-xs font-bold text-[#161616]">
                            ¿Esta sede maneja NIT / Razón Social independiente?
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B6862] mt-0.5">
                          Actívalo si la sucursal factura con su propio NIT y representante legal distinto a la matriz.
                        </p>
                      </div>

                      {/* Wabi-Sabi Rectangular Toggle Control */}
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={hasCustomTaxIdInput}
                          onChange={(e) => setHasCustomTaxIdInput(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className={`w-13 h-7 rounded-md border-2 p-0.5 transition-colors flex items-center ${
                          hasCustomTaxIdInput 
                            ? 'bg-primary border-primary' 
                            : 'bg-[#FAF8F3] border-[#161616]'
                        }`}>
                          <div className={`w-5 h-5 rounded-sm transition-transform duration-200 ${
                            hasCustomTaxIdInput 
                              ? 'translate-x-5.5 bg-white shadow-xs' 
                              : 'translate-x-0 bg-[#161616]'
                          }`} />
                        </div>
                      </label>
                    </div>

                    {hasCustomTaxIdInput ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-[#E2DFD7]">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#6B6862] uppercase">NIT / Identificación Fiscal Propia *</label>
                          <input
                            type="text"
                            required={hasCustomTaxIdInput}
                            placeholder="Ej. 900.123.456-7"
                            value={customTaxIdInput}
                            onChange={(e) => setCustomTaxIdInput(e.target.value)}
                            className="w-full bg-white border border-[#E2DFD7] rounded-md p-2.5 text-[#161616] outline-none focus:border-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#6B6862] uppercase">Razón Social Legal de Facturación *</label>
                          <input
                            type="text"
                            required={hasCustomTaxIdInput}
                            placeholder="Ej. Comercializadora Alfa S.A.S."
                            value={legalNameInput}
                            onChange={(e) => setLegalNameInput(e.target.value)}
                            className="w-full bg-white border border-[#E2DFD7] rounded-md p-2.5 text-[#161616] outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#D9381E] font-medium italic flex items-center gap-1.5 bg-[#FAF8F3] p-2.5 rounded-md border border-[#E2DFD7] mt-3">
                        <span className="material-symbols-outlined text-base text-[#D9381E]">info</span>
                        Esta sede heredará automáticamente el NIT y Razón Social de la Casa Matriz.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        placeholder="Ej. 3001234567"
                        value={branchPhoneInput}
                        onChange={(e) => setBranchPhoneInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase">Email Comercial</label>
                      <input
                        type="email"
                        placeholder="Ej. contacto@minegocio.com"
                        value={branchEmailInput}
                        onChange={(e) => setBranchEmailInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase">Dirección Comercial</label>
                      <input
                        type="text"
                        placeholder="Ej. Carrera 10 # 20-30 Local 1"
                        value={branchAddressInput}
                        onChange={(e) => setBranchAddressInput(e.target.value)}
                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface-variant uppercase">Términos de Garantía y Pie de Factura / POS</label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Garantía de 1 año por defectos de fabricación. No se aceptan devoluciones de lentes formulados personalizados una vez cortados."
                      value={branchInvoiceFooterInput}
                      onChange={(e) => setBranchInvoiceFooterInput(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-on-surface outline-none focus:border-primary resize-none text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingBranch}
                      className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold transition cursor-pointer flex items-center gap-2 text-sm shadow-md"
                    >
                      <span className="material-symbols-outlined text-base">store</span>
                      {savingBranch ? 'Guardando...' : 'Crear Sede'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Panel Lateral: Sedes Registradas */}
              <div className="bg-surface-container-low border border-outline/15 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-on-surface flex items-center justify-between border-b border-outline/10 pb-3">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">domain</span>
                    Sedes Activas
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {branches.length}
                  </span>
                </h3>

                {branches.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic py-4 text-center">
                    No hay sedes adicionales registradas.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {branches.map((b: any, idx: number) => (
                      <div key={b.id || idx} className="p-3.5 bg-surface-container border border-outline/10 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-primary text-sm">
                              {b.is_main_branch ? 'domain' : 'storefront'}
                            </span>
                            {b.branch_name || b.name}
                          </p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${b.has_custom_tax_id ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-primary/10 text-primary'}`}>
                            {b.has_custom_tax_id ? 'NIT Propio' : 'NIT Matriz'}
                          </span>
                        </div>

                        {b.has_custom_tax_id && b.custom_tax_id && (
                          <p className="text-[11px] font-semibold text-on-surface flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-primary">badge</span>
                            NIT: {b.custom_tax_id} ({b.legal_name || b.name})
                          </p>
                        )}
                        {b.phone && (
                          <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">call</span>
                            {b.phone}
                          </p>
                        )}
                        {b.address && (
                          <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">location_on</span>
                            {b.address}
                          </p>
                        )}

                        {/* Botón de Navegación / Cambio Directo de Sede */}
                        <div className="pt-2 border-t border-outline/10 flex items-center justify-between">
                          {b.id === clientId ? (
                            <span className="px-2.5 py-1 rounded-md bg-green-500/10 text-green-700 border border-green-500/20 text-[10px] font-bold flex items-center gap-1.5 w-full justify-center">
                              <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span>
                              Sede Actual (Activa)
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.setItem('current_client_id', b.id);
                                window.location.reload();
                              }}
                              className="w-full py-1.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-xs"
                              title={`Cambiar la vista activa a la sede ${b.branch_name || b.name}`}
                            >
                              <span className="material-symbols-outlined text-sm">login</span>
                              Entrar / Cambiar a esta Sede
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'facturacion2' && (
          <div className="glass-card p-6 rounded-2xl border border-outline/10">
            <SaaSErpInvoices2 clientId={clientId} />
          </div>
        )}

        {activeTab === 'cotizaciones' && (
          <div className="animate-fade-in">
            <SaaSErpQuotes clientId={clientId} />
          </div>
        )}

        {activeTab === 'documentos_soporte' && (
          <div className="animate-fade-in">
            <SaaSErpSupportDocuments clientId={clientId} />
          </div>
        )}

        {activeTab === 'arqueo_caja' && (
          <div className="animate-fade-in">
            <SaaSErpCashShifts clientId={clientId} />
          </div>
        )}

        {activeTab === 'contabilidad' && (
          <div className="animate-fade-in">
            <SaaSErpAccounting clientId={clientId} />
          </div>
        )}

        {activeTab === 'cartera' && (
          <div className="animate-fade-in">
            <SaaSErpCartera clientId={clientId} />
          </div>
        )}

        {activeTab === 'domicilios' && (
          <div className="animate-fade-in">
            <SaaSErpDomicilios clientId={clientId} />
          </div>
        )}

        {activeTab === 'formulas' && (
          <div className="animate-fade-in">
            <SaaSErpFormulas clientId={clientId} />
          </div>
        )}

        {activeTab === 'lab_jobs' && (
          <div className="animate-fade-in">
            <SaaSErpLabJobs clientId={clientId} />
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="animate-fade-in">
            <SaaSErpAppointments clientId={clientId} />
          </div>
        )}

        {activeTab === 'empleados' && (
          <div className="animate-fade-in">
            <SaaSErpEmployees clientId={clientId} />
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div className="animate-fade-in">
            <SaaSErpUsers clientId={clientId} />
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="animate-fade-in">
            <SaaSErpCRM clientId={clientId} />
          </div>
        )}

        {activeTab === 'campanias' && (
          <div className="animate-fade-in">
            <SaaSErpCampaigns clientId={clientId} />
          </div>
        )}

        {activeTab === 'marketing' && (
          <div className="animate-fade-in">
            <SaaSErpMarketing clientId={clientId} />
          </div>
        )}

        {activeTab === 'metas_ventas' && (
          <div className="animate-fade-in">
            <SaaSErpSalesTargets clientId={clientId} />
          </div>
        )}

        {activeTab === 'configuracion' && (
          <div className="animate-fade-in">
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
          <div className="animate-fade-in">
            <SaaSErpAuditLogs clientId={clientId} />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="animate-fade-in">
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
      </div>
    </div>
  );
};
