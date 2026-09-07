import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch } from '../utils/api';
import { SystemAlertsPanel } from './SystemAlertsPanel';

interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  systemPrompt: string;
  activeTools: string[];
  status: string;
  agentPhone?: string;
}

interface Metrics {
  totalInteractions: number;
  totalApiCost: number;
  totalTokensConsumed: number;
  totalUniqueUsers: number;
}

interface AdminDashboardProps {
  onLogout?: () => void;
  onViewClient?: (clientId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onViewClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalInteractions: 0,
    totalApiCost: 0,
    totalTokensConsumed: 0,
    totalUniqueUsers: 0,
  });

  // Buscador y Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'alerts'>(() => {
    const saved = localStorage.getItem('admin_active_tab');
    return (saved as any) || 'overview';
  });
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Formulario nuevo cliente (Con credenciales de acceso para el dueño)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    ownerPhone: '',
    email: '',
    contactName: '',
  });
  const [categoryInput, setCategoryInput] = useState<'optica' | 'clinica' | 'restaurante' | 'general' | 'automatizacion'>('optica');

  const [loading, setLoading] = useState(true);

  // Cargar datos del backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const clientsRes = await authFetch('/api/clients');
      const clientsData = await clientsRes.json();
      if (clientsData.success) {
        setClients(clientsData.data);
      }

      const metricsRes = await authFetch('/api/metrics');
      const metricsData = await metricsRes.json();
      if (metricsData.success && metricsData.data.summary) {
        setMetrics(metricsData.data.summary);
      }
    } catch (error) {
      console.error("[AdminDashboard] Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const res = await authFetch('/api/admin/alerts/active');
      const data = await res.json();
      if (data.success) {
        setActiveAlerts(data.alerts || []);
        setActiveAlertsCount((data.alerts || []).length);
      }
    } catch (err) {
      console.error("Error loading active alerts:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab]);

  // Activar / Suspender cliente
  const handleToggleStatus = async (clientId: string, currentStatus: string) => {
    const endpoint = currentStatus === 'active' 
      ? `/api/clients/${clientId}/suspend` 
      : `/api/clients/${clientId}/activate`;

    try {
      const res = await authFetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchData(); // Recargar datos
      }
    } catch (error) {
      console.error("[AdminDashboard] Error cambiando estado:", error);
    }
  };

  // Crear nuevo cliente
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password || !formData.contactName) {
      alert("Por favor completa los campos obligatorios: Nombre, Administrador, Usuario y Contraseña.");
      return;
    }

    try {
      const res = await authFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          category: categoryInput,
          username: formData.username,
          password: formData.password,
          owner_phone: formData.ownerPhone,
          email: formData.email,
          contact_name: formData.contactName
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFormData({
          name: '',
          username: '',
          password: '',
          ownerPhone: '',
          email: '',
          contactName: '',
        });
        setCategoryInput('optica');
        fetchData(); // Recargar lista
      } else {
        alert(`Error: ${data.error || data.message || 'Error desconocido del servidor'}`);
      }
    } catch (error: any) {
      console.error("[AdminDashboard] Error creando cliente:", error);
      alert(`Error de red o conexión: ${error.message || 'No se pudo conectar al servidor'}`);
    }
  };

  // Eliminar cliente físicamente
  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al cliente "${clientName}"? Esta acción borrará permanentemente sus datos y liberará su número de teléfono.`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData(); // Recargar lista
      } else {
        alert(`Error al eliminar: ${data.message || data.error}`);
      }
    } catch (error: any) {
      console.error("[AdminDashboard] Error eliminando cliente:", error);
      alert(`Error de red o conexión: ${error.message}`);
    }
  };

  // Filtrar clientes
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber.includes(searchQuery)
  );

  // ROI: 3 minutos ahorrados por interacción
  const totalHoursSaved = (metrics.totalInteractions * 3 / 60).toFixed(1);

  return (
    <div className="flex min-h-screen bg-[#F6F4EE] text-[#161616] font-sans">
      {/* Sidebar Wabi-Sabi */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-[#FAF8F3] border-r border-[#E2DFD7] flex flex-col py-6 px-6 z-50">
        <div className="px-2 py-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-[#D9381E]/10 text-[#D9381E] border border-[#D9381E]/20 font-mono">
              Consola Admin
            </span>
          </div>
          <h1 className="font-serif text-3xl font-normal text-[#161616] mt-1 flex items-center gap-2">
            KOI ERP
          </h1>
          <p className="text-xs text-[#6B6862] mt-0.5">Orquestación Multi-Tenant</p>
        </div>

        <nav className="flex-grow space-y-2 overflow-y-auto custom-scrollbar">
          <button 
            className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-[4px] cursor-pointer text-xs font-bold border-0 ${
              activeTab === 'overview' 
                ? 'bg-[#D9381E] text-white shadow-sm' 
                : 'text-[#6B6862] hover:text-[#161616] hover:bg-white bg-transparent'
            }`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            <span>Visión General</span>
          </button>

          <button 
            className="w-full text-left text-[#6B6862] hover:text-[#161616] hover:bg-white flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-[4px] bg-transparent border-0 cursor-pointer text-xs font-bold"
            onClick={(e) => {
              e.preventDefault();
              onViewClient?.('admin');
            }}
          >
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            <span>Configurar Bot Global</span>
          </button>

          <button 
            className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-[4px] cursor-pointer text-xs font-bold border-0 ${
              activeTab === 'alerts' 
                ? 'bg-[#D9381E] text-white shadow-sm' 
                : 'text-[#6B6862] hover:text-[#161616] hover:bg-white bg-transparent'
            }`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('alerts');
            }}
          >
            <span className="material-symbols-outlined text-[18px]">settings_suggest</span>
            <span>Estado de Red</span>
          </button>
        </nav>

        <div className="mt-auto space-y-2 pt-4 border-t border-[#E2DFD7]">
          <button 
            type="button"
            className="w-full text-left text-[#D9381E] hover:bg-[#D9381E]/10 flex items-center gap-3 px-4 py-3 transition-all duration-200 rounded-[4px] cursor-pointer text-xs font-bold bg-transparent border-0" 
            onClick={(e) => {
              e.preventDefault();
              if (onLogout) onLogout();
            }}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8 w-full max-w-[1400px] min-h-screen space-y-8">
        {/* Header Section */}
        <header className="bg-white border border-[#E2DFD7] rounded-[4px] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#D9381E] font-bold">Panel Super Admin</span>
            <h2 className="text-3xl font-serif font-normal text-[#161616] mt-1">
              {activeTab === 'overview' ? 'Visión General de Tiendas' : 'Estado de Red & Incidencias'}
            </h2>
            <p className="text-xs text-[#6B6862] mt-1">
              {activeTab === 'overview' 
                ? 'Monitoreo en tiempo real y orquestación multi-inquilino de KOI ERP.' 
                : 'Historial y diagnóstico de salud del servidor.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeAlertsCount > 0 && (
              <button 
                onClick={() => setShowAlertsModal(true)}
                className="bg-[#D9381E]/10 border border-[#D9381E]/30 text-[#D9381E] text-xs font-bold px-4 py-2.5 rounded-[4px] flex items-center gap-2 animate-pulse hover:bg-[#D9381E]/20 transition-all cursor-pointer font-mono"
              >
                <span className="material-symbols-outlined text-[18px]">warning</span>
                {activeAlertsCount} Alertas Activas
              </button>
            )}
            {activeTab === 'overview' && (
              <button 
                className="bg-[#D9381E] hover:bg-[#b82b14] text-white text-xs font-bold px-5 py-2.5 rounded-[4px] flex items-center gap-2 shadow-sm transition-all cursor-pointer border-0"
                onClick={() => setShowModal(true)}
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                + Crear Nuevo Cliente
              </button>
            )}
          </div>
        </header>

        {activeTab === 'overview' && (
          <>
            {/* Global Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
                <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                  MENSAJES PROCESADOS
                </span>
                <div className="text-3xl font-serif text-[#161616] mt-2 font-normal">
                  {metrics.totalInteractions}
                </div>
                <span className="text-[11px] text-[#15803d] mt-1 block font-bold font-mono">● En Vivo</span>
              </div>

              <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
                <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                  COSTO ESTIMADO API
                </span>
                <div className="text-3xl font-serif text-[#D9381E] mt-2 font-normal">
                  ${metrics.totalApiCost.toFixed(6)}
                </div>
                <span className="text-[11px] text-[#6B6862] mt-1 block font-mono">
                  Prom: ${(metrics.totalApiCost / (metrics.totalInteractions || 1)).toFixed(6)} / msj
                </span>
              </div>

              <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
                <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                  TIEMPO AHORRADO
                </span>
                <div className="text-3xl font-serif text-[#161616] mt-2 font-normal">
                  {totalHoursSaved} <span className="text-sm text-[#6B6862] font-sans">hrs</span>
                </div>
                <span className="text-[11px] text-[#6B6862] mt-1 block font-mono">3 min / chat delegado</span>
              </div>

              <div className="bg-white border border-[#E2DFD7] p-6 rounded-[4px] shadow-sm relative overflow-hidden">
                <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider block font-mono">
                  LÍNEAS DE WHATSAPP
                </span>
                <div className="text-3xl font-serif text-[#161616] mt-2 font-normal">
                  {clients.filter(c => c.status === 'active').length} / {clients.length}
                </div>
                <span className="text-[11px] text-[#15803d] mt-1 block font-bold font-mono">● Red Estable</span>
              </div>
            </div>

            {/* Client Management Section */}
            <section className="bg-white border border-[#E2DFD7] rounded-[4px] shadow-sm overflow-hidden space-y-4">
              <div className="p-6 border-b border-[#E2DFD7] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-serif font-normal text-[#161616]">Gestión de Tiendas & Inquilinos</h3>
                  <p className="text-xs text-[#6B6862]">Directorio multi-tenant con acceso directo a paneles de control.</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <input 
                    className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-4 py-2 text-xs text-[#161616] outline-none focus:border-[#D9381E] transition-all" 
                    placeholder="Buscar por cliente o teléfono..." 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar px-6 pb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E2DFD7] text-[#6B6862] font-mono text-[11px] uppercase tracking-wider bg-[#FAF8F3]">
                      <th className="py-3 px-3">Cliente / Negocio</th>
                      <th className="py-3 px-3">Línea del Bot</th>
                      <th className="py-3 px-3">Asesor Humano</th>
                      <th className="py-3 px-3">Estado</th>
                      <th className="py-3 px-3">Acceso al Panel</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DFD7]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-[#6B6862] italic font-mono">Cargando empresas...</td>
                      </tr>
                    ) : filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-[#6B6862] italic font-mono">No se encontraron clientes registrados.</td>
                      </tr>
                    ) : filteredClients.map(client => (
                      <tr 
                        key={client.id} 
                        className="hover:bg-[#FAF8F3] transition-colors"
                        style={{ opacity: client.status === 'active' ? 1 : 0.6 }}
                      >
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[4px] bg-[#161616] text-white flex items-center justify-center font-mono font-bold text-xs shrink-0">
                              {client.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[#161616]">{client.name}</p>
                              <p className="text-[10px] text-[#6B6862] font-mono">{client.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#161616]">+{client.phoneNumber}</td>
                        <td className="py-3.5 px-3 font-mono text-[#6B6862]">
                          {client.agentPhone ? `+${client.agentPhone}` : <span className="opacity-50 italic font-sans">Ninguno</span>}
                        </td>
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(client.id, client.status)}
                            className={`px-3 py-1 rounded-[4px] text-[10px] font-bold cursor-pointer transition ${
                              client.status === 'active'
                                ? 'bg-[#15803d]/10 text-[#15803d] border border-[#15803d]/30'
                                : 'bg-stone-500/10 text-stone-600 border border-stone-500/30'
                            }`}
                          >
                            {client.status === 'active' ? '● Activo' : '○ Suspendido'}
                          </button>
                        </td>
                        <td className="py-3.5 px-3">
                          <button 
                            className="text-[#D9381E] font-bold hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs" 
                            onClick={() => onViewClient?.(client.id)}
                          >
                            Abrir Panel de Control →
                          </button>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button 
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            className="px-2.5 py-1 text-[#D9381E] border border-[#D9381E]/30 hover:bg-[#D9381E] hover:text-white rounded-[4px] text-[10px] font-bold transition cursor-pointer"
                            title="Eliminar Cliente"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white border border-[#E2DFD7] p-6 sm:p-8 rounded-[4px] shadow-sm">
            <SystemAlertsPanel />
          </div>
        )}
      </main>

      {/* Modal: Active Alerts */}
      {showAlertsModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="bg-white border border-[#E2DFD7] w-full max-w-xl rounded-[4px] p-8 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto space-y-4">
            <div className="flex justify-between items-start border-b border-[#E2DFD7] pb-4">
              <div>
                <h3 className="text-xl font-serif font-normal text-[#D9381E] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px]">warning</span>
                  Alertas Activas del Sistema
                </h3>
                <p className="text-xs text-[#6B6862]">Incidencias actualmente no resueltas en el servidor.</p>
              </div>
              <button 
                className="p-1 rounded-[4px] text-[#6B6862] hover:text-[#161616] hover:bg-[#FAF8F3] transition-all cursor-pointer border-0 bg-transparent"
                onClick={() => setShowAlertsModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              {activeAlerts.length === 0 ? (
                <p className="text-[#6B6862] italic text-center py-4">No hay alertas activas en este momento. ¡Todo opera con normalidad!</p>
              ) : (
                activeAlerts.map((alert: any) => (
                  <div key={alert.id} className="bg-[#FAF8F3] border border-[#E2DFD7] p-4 rounded-[4px] space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold font-mono text-[#D9381E] uppercase">{alert.alert_key}</span>
                      <span className="text-[#6B6862] font-mono">{new Date(alert.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[#161616]">{alert.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-[#E2DFD7] flex justify-end">
              <button 
                className="px-5 py-2 border border-[#E2DFD7] text-[#161616] text-xs font-bold rounded-[4px] hover:bg-[#FAF8F3] transition-all cursor-pointer" 
                onClick={() => setShowAlertsModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Create New Client */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <div className="bg-white border border-[#E2DFD7] w-full max-w-lg rounded-[4px] p-8 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto space-y-4">
            <div className="flex justify-between items-start border-b border-[#E2DFD7] pb-4">
              <div>
                <h3 className="text-xl font-serif font-normal text-[#161616]">Registrar Empresa</h3>
                <p className="text-xs text-[#6E6B65]">Inicializa una nueva instancia de bot en el sistema.</p>
              </div>
              <button 
                className="p-1 rounded-[4px] text-[#6B6862] hover:text-[#161616] hover:bg-[#FAF8F3] transition-all cursor-pointer border-0 bg-transparent"
                onClick={() => setShowModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#161616] block">Nombre de la Empresa *</label>
                <input 
                  className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-3.5 py-2.5 text-[#161616] focus:border-[#D9381E] outline-none transition-all" 
                  placeholder="ej. Clínica Odontológica de Colombia" 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-1">
                <label className="font-bold text-[#161616] block">Nombre del Administrador / Contacto *</label>
                <input 
                  className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-3.5 py-2.5 text-[#161616] focus:border-[#D9381E] outline-none transition-all" 
                  placeholder="ej. Juan Pérez" 
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#161616] block">Usuario Admin *</label>
                  <input 
                    className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-3.5 py-2.5 text-[#161616] focus:border-[#D9381E] outline-none font-mono" 
                    placeholder="ej. juanperez" 
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#161616] block">Contraseña *</label>
                  <input 
                    className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-3.5 py-2.5 text-[#161616] focus:border-[#D9381E] outline-none font-mono" 
                    placeholder="Contraseña" 
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-[#161616] block">Teléfono Propietario</label>
                  <input 
                    className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-3.5 py-2.5 text-[#161616] focus:border-[#D9381E] outline-none font-mono" 
                    placeholder="ej. 573001234567" 
                    type="text"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#161616] block">Correo Electrónico</label>
                  <input 
                    className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-3.5 py-2.5 text-[#161616] focus:border-[#D9381E] outline-none" 
                    placeholder="ej. juan@empresa.com" 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#161616] block">Tipo de Negocio</label>
                <select 
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as any)}
                  className="w-full bg-[#FAF8F3] border border-[#E2DFD7] rounded-[4px] px-3.5 py-2.5 text-[#161616] focus:border-[#D9381E] outline-none cursor-pointer font-bold"
                >
                  <option value="optica">👓 Óptica / Oftalmología</option>
                  <option value="clinica">🩺 Clínica / Consultorio Médico</option>
                  <option value="restaurante">🍔 Restaurante / Bar / Cafetería</option>
                  <option value="general">💼 Comercio General / ERP Genérico</option>
                  <option value="automatizacion">🤖 Agencia de Automatizaciones / Servicios</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#E2DFD7] flex gap-3">
                <button 
                  className="flex-1 px-4 py-2.5 border border-[#E2DFD7] text-[#161616] font-bold rounded-[4px] hover:bg-[#FAF8F3] transition-all cursor-pointer" 
                  onClick={() => setShowModal(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button 
                  className="flex-1 px-4 py-2.5 bg-[#D9381E] hover:bg-[#b82b14] text-white font-bold rounded-[4px] shadow-sm transition-all cursor-pointer border-0" 
                  type="submit"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
