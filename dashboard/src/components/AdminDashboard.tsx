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

interface Metrics {
  totalInteractions: number;
  totalApiCost: number;
  totalTokensConsumed: number;
  totalUniqueUsers: number;
}

export const AdminDashboard: React.FC = () => {
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

  // Formulario nuevo cliente (Simplificado sin ID ni Prompt)
  const [formData, setFormData] = useState({
    name: '',
  });
  const [selectedCountry, setSelectedCountry] = useState('57');
  const [botPhoneInput, setBotPhoneInput] = useState('');
  const [agentPhoneInput, setAgentPhoneInput] = useState('');

  const [loading, setLoading] = useState(true);

  // Cargar datos del backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const clientsRes = await fetch('/api/clients');
      const clientsData = await clientsRes.json();
      if (clientsData.success) {
        setClients(clientsData.data);
      }

      const metricsRes = await fetch('/api/metrics');
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

  useEffect(() => {
    fetchData();
  }, []);

  // Activar / Suspender cliente
  const handleToggleStatus = async (clientId: string, currentStatus: string) => {
    const endpoint = currentStatus === 'active' 
      ? `/api/clients/${clientId}/suspend` 
      : `/api/clients/${clientId}/activate`;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
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
    if (!formData.name || !botPhoneInput) {
      alert("Por favor completa los campos obligatorios: Nombre de la Empresa y Número del Bot.");
      return;
    }

    let cleanBot = botPhoneInput.replace(/\D/g, '');
    if (!cleanBot.startsWith(selectedCountry)) {
      cleanBot = selectedCountry + cleanBot;
    }

    let cleanAgent = agentPhoneInput.replace(/\D/g, '');
    if (cleanAgent && !cleanAgent.startsWith(selectedCountry)) {
      cleanAgent = selectedCountry + cleanAgent;
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone_number: cleanBot,
          agent_phone: cleanAgent || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setFormData({ name: '' });
        setBotPhoneInput('');
        setAgentPhoneInput('');
        fetchData(); // Recargar lista
      } else {
        alert(`Error: ${data.error || data.message || 'Error desconocido del servidor'}`);
      }
    } catch (error: any) {
      console.error("[AdminDashboard] Error creando cliente:", error);
      alert(`Error de red o conexión: ${error.message || 'No se pudo conectar al servidor'}`);
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-outline/20 flex flex-col py-6 px-6 z-50">
        <div className="px-2 py-4 mb-8">
          <h1 className="font-headline-md text-headline-md font-black text-primary flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>smart_toy</span>
            Frant
          </h1>
          <p className="text-on-surface-variant text-label-sm mt-1 opacity-70">por Diaz Lab</p>
        </div>
        <nav className="flex-grow space-y-2 overflow-y-auto custom-scrollbar">
          <a className="sidebar-item-active flex items-center gap-4 p-3 rounded-lg transition-all duration-200" href="#">
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-label-md">Visión General</span>
          </a>
          <a className="text-on-surface-variant hover:bg-surface-variant/50 flex items-center gap-4 p-3 transition-all duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined">group</span>
            <span className="font-label-md">Clientes</span>
          </a>
          <a className="text-on-surface-variant hover:bg-surface-variant/50 flex items-center gap-4 p-3 transition-all duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined">settings_suggest</span>
            <span className="font-label-md">Estado de Red</span>
          </a>
          <a className="text-on-surface-variant hover:bg-surface-variant/50 flex items-center gap-4 p-3 transition-all duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined">payments</span>
            <span className="font-label-md">Facturación</span>
          </a>
        </nav>
        <div className="mt-auto space-y-2 pt-4 border-t border-outline/20">
          <a className="text-on-surface-variant hover:bg-surface-variant/50 flex items-center gap-4 p-3 transition-all duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md">Configuración</span>
          </a>
          <a className="text-on-surface-variant hover:bg-surface-variant/50 flex items-center gap-4 p-3 transition-all duration-200 rounded-lg" href="#">
            <span className="material-symbols-outlined">logout</span>
            <span className="font-label-md">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8 w-full max-w-7xl min-h-screen">
        {/* Header Section */}
        <header className="flex justify-between items-end mb-10">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Visión General</h2>
            <p className="text-on-surface-variant font-body-md opacity-80">Monitoreo en tiempo real y orquestación de clientes.</p>
          </div>
          <button 
            className="bg-primary-container text-on-primary-container font-label-md px-4 py-2.5 rounded-xl flex items-center gap-2 primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <span className="material-symbols-outlined">person_add</span>
            Crear Nuevo Cliente
          </button>
        </header>

        {/* Global Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Metric 1 */}
          <div className="glass-card rounded-xl p-6 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <p className="text-on-surface-variant font-label-md">Mensajes Procesados</p>
              <span className="material-symbols-outlined text-primary/50">chat_bubble</span>
            </div>
            <div className="flex items-end gap-2">
              <h3 className="font-headline-lg text-headline-lg text-primary">{metrics.totalInteractions}</h3>
              <span className="text-secondary text-label-sm flex items-center gap-1 mb-1.5 font-bold">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> En Vivo
              </span>
            </div>
            <div className="mt-4 flex items-end gap-[2px] h-12">
              <div className="bg-primary/20 w-full h-[40%] rounded-t-sm group-hover:h-[60%] transition-all duration-500"></div>
              <div className="bg-primary/30 w-full h-[60%] rounded-t-sm group-hover:h-[40%] transition-all duration-500"></div>
              <div className="bg-primary/40 w-full h-[80%] rounded-t-sm group-hover:h-[100%] transition-all duration-500"></div>
              <div className="bg-primary/20 w-full h-[50%] rounded-t-sm group-hover:h-[30%] transition-all duration-500"></div>
              <div className="bg-primary/60 w-full h-[90%] rounded-t-sm group-hover:h-[70%] transition-all duration-500"></div>
              <div className="bg-primary/40 w-full h-[70%] rounded-t-sm group-hover:h-[90%] transition-all duration-500"></div>
              <div className="bg-primary w-full h-[100%] rounded-t-sm group-hover:h-[80%] transition-all duration-500"></div>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-on-surface-variant font-label-md">Costo Estimado de API</p>
                <span className="material-symbols-outlined text-tertiary/50 font-bold">$</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-tertiary">${metrics.totalApiCost.toFixed(6)}</h3>
            </div>
            <p className="text-on-surface-variant text-label-sm mt-2 opacity-60">Promedio de ${(metrics.totalApiCost / (metrics.totalInteractions || 1)).toFixed(6)} por interacción</p>
          </div>

          {/* Metric 3 */}
          <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-on-surface-variant font-label-md">Tiempo Ahorrado</p>
                <span className="material-symbols-outlined text-secondary/50">timer</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-secondary">{totalHoursSaved} hrs</h3>
            </div>
            <div className="mt-2 bg-secondary/10 h-1 rounded-full overflow-hidden">
              <div className="bg-secondary h-full w-[75%]"></div>
            </div>
            <p className="text-on-surface-variant text-label-sm mt-1 opacity-60">Basado en 3 min por chat humano</p>
          </div>

          {/* Metric 4 */}
          <div className="glass-card rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <p className="text-on-surface-variant font-label-md">Líneas de WhatsApp</p>
                <span className="material-symbols-outlined text-primary/50">nest_remote_comfort_sensor</span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">
                {clients.filter(c => c.status === 'active').length} / {clients.length}
              </h3>
            </div>
            <div className="flex gap-2 mt-2 items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></div>
              <span className="text-secondary text-label-sm">Red Estable</span>
            </div>
          </div>
        </div>

        {/* Client Management Section */}
        <section className="glass-card rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline/20 flex justify-between items-center bg-surface-container-low/50">
            <h3 className="font-headline-md text-headline-md">Gestión de Clientes</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-md">search</span>
                <input 
                  className="bg-surface-container border-outline/20 border rounded-lg pl-10 pr-4 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md outline-none w-64 text-on-surface" 
                  placeholder="Buscar cliente..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-md">
                <span className="material-symbols-outlined">filter_list</span>
                Filtrar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-on-surface-variant border-b border-outline/20 bg-surface-container-low/30">
                  <th className="px-6 py-3 font-label-md">Cliente</th>
                  <th className="px-6 py-3 font-label-md">Línea del Bot</th>
                  <th className="px-6 py-3 font-label-md">Asesor Humano</th>
                  <th className="px-6 py-3 font-label-md">Estado</th>
                  <th className="px-6 py-3 font-label-md">Acceso al Panel</th>
                  <th className="px-6 py-3 font-label-md text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-on-surface-variant">Cargando clientes...</td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-on-surface-variant">No se encontraron clientes registrados.</td>
                  </tr>
                ) : filteredClients.map(client => (
                  <tr 
                    key={client.id} 
                    className="hover:bg-surface-variant/20 transition-colors"
                    style={{ opacity: client.status === 'active' ? 1 : 0.6 }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-on-surface font-label-md">{client.name}</p>
                          <p className="text-on-surface-variant text-label-sm opacity-60">{client.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant font-body-md">+{client.phoneNumber}</td>
                    <td className="px-6 py-4 text-on-surface-variant font-body-md">
                      {client.agentPhone ? `+${client.agentPhone}` : <span className="opacity-50 italic">Ninguno</span>}
                    </td>
                    <td className="px-6 py-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={client.status === 'active'}
                          onChange={() => handleToggleStatus(client.id, client.status)}
                        />
                        <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        className="text-secondary hover:text-primary transition-colors underline font-label-md" 
                        href={`/?view=client&id=${client.id}`}
                      >
                        Abrir Panel de Control
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-primary/10 rounded-lg text-on-surface-variant hover:text-primary transition-all">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-outline/20 flex justify-between items-center text-on-surface-variant text-label-sm">
            <p>Mostrando {filteredClients.length} de {clients.length} clientes</p>
            <div className="flex gap-2">
              <button className="p-2 border border-outline/20 rounded hover:bg-surface-variant/30 transition-all"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
              <button className="p-2 border border-outline/20 rounded bg-primary-container/20 text-primary font-bold text-xs w-8 h-8 flex items-center justify-center">1</button>
              <button className="p-2 border border-outline/20 rounded hover:bg-surface-variant/30 transition-all"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal: Create New Client */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-300">
          <div className="glass-card w-full max-w-lg rounded-2xl p-8 shadow-2xl transition-transform duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Registrar Empresa</h3>
                <p className="text-on-surface-variant text-body-md opacity-70">Inicializa una nueva instancia de bot en el sistema.</p>
              </div>
              <button 
                className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant transition-all cursor-pointer"
                onClick={() => setShowModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1">
                <label className="font-label-md text-on-surface-variant ml-1">Nombre de la Empresa</label>
                <input 
                  className="w-full bg-surface-container border-outline/30 border rounded-xl px-4 py-2.5 text-on-surface focus:border-primary outline-none transition-all" 
                  placeholder="ej. Clínica Odontológica de Colombia" 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-on-surface-variant ml-1">País de Operación</label>
                <select 
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-surface-container border border-outline/30 rounded-xl px-4 py-2.5 text-on-surface focus:border-primary outline-none"
                >
                  <option value="57">🇨🇴 Colombia (+57)</option>
                  <option value="52">🇲🇽 México (+52)</option>
                  <option value="34">🇪🇸 España (+34)</option>
                  <option value="1">🇺🇸 Estados Unidos (+1)</option>
                  <option value="54">🇦🇷 Argentina (+54)</option>
                  <option value="56">🇨🇱 Chile (+56)</option>
                  <option value="51">🇵🇪 Perú (+51)</option>
                  <option value="593">🇪🇨 Ecuador (+593)</option>
                  <option value="58">🇻🇪 Venezuela (+58)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-on-surface-variant ml-1">Línea del Bot</label>
                <div className="flex border border-outline/30 rounded-xl bg-surface-container overflow-hidden focus-within:border-primary transition-all">
                  <span className="bg-surface-container-high px-4 py-2.5 text-on-surface-variant font-label-md border-r border-outline/20 flex items-center select-none">
                    +{selectedCountry}
                  </span>
                  <input 
                    className="flex-grow bg-transparent px-4 py-2.5 text-on-surface outline-none" 
                    placeholder="ej. 3116718652" 
                    type="text"
                    value={botPhoneInput}
                    onChange={(e) => setBotPhoneInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-label-md text-on-surface-variant ml-1">Teléfono Asesor Humano (Traspaso)</label>
                <div className="flex border border-outline/30 rounded-xl bg-surface-container overflow-hidden focus-within:border-primary transition-all">
                  <span className="bg-surface-container-high px-4 py-2.5 text-on-surface-variant font-label-md border-r border-outline/20 flex items-center select-none">
                    +{selectedCountry}
                  </span>
                  <input 
                    className="flex-grow bg-transparent px-4 py-2.5 text-on-surface outline-none" 
                    placeholder="ej. 3332792837" 
                    type="text"
                    value={agentPhoneInput}
                    onChange={(e) => setAgentPhoneInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button 
                  className="flex-1 px-4 py-2.5 border border-outline/30 text-on-surface font-label-md rounded-xl hover:bg-surface-variant/30 transition-all cursor-pointer" 
                  onClick={() => setShowModal(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button 
                  className="flex-1 px-4 py-2.5 bg-primary-container text-on-primary-container font-label-md rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer" 
                  type="submit"
                >
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
