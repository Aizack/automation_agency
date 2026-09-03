import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface DomiciliosProps {
  clientId: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total_amount: string;
  delivery_method: string;
  delivery_fee: string;
  delivery_address: string;
  delivery_date: string | null;
  delivery_status: string;
  delivery_guy_id?: string | null;
  delivery_guy_name?: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  last_name?: string;
  role?: string;
}

// Coordenadas simuladas de la tienda para cálculo de Haversine local
const STORE_LAT = 4.60971; 
const STORE_LNG = -74.08175;

export const SaaSErpDomicilios: React.FC<DomiciliosProps> = ({ clientId: rawClientId }) => {
  const clientId = (rawClientId && rawClientId !== 'undefined')
    ? rawClientId
    : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');

  const [deliveries, setDeliveries] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'distance' | 'date'>('distance');
  const [selectedGuyFilter, setSelectedGuyFilter] = useState<string>('all');
  const [batchPage, setBatchPage] = useState<number>(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchTargetGuyId, setBatchTargetGuyId] = useState<string>('');
  const [batchUpdating, setBatchUpdating] = useState<boolean>(false);

  // Modal Reagendar
  const [reagendaInvoice, setReagendaInvoice] = useState<Invoice | null>(null);
  const [reagendaDate, setReagendaDate] = useState<string>('');

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/deliveries`);
      const json = await res.json();
      if (json.success) {
        const list = (json.deliveries || []).map((inv: any) => ({
          ...inv,
          delivery_fee: inv.delivery_fee ?? '0',
          delivery_status: inv.delivery_status ?? 'pending',
          delivery_address: inv.delivery_address || inv.customer_address || ''
        }));
        setDeliveries(list);
      } else {
        const fallback = await fetch(`/api/clients/${clientId}/invoices`);
        const fallbackJson = await fallback.json();
        if (fallbackJson.success) {
          const list = (fallbackJson.invoices || []).filter((inv: any) => inv.delivery_method === 'domicilio');
          setDeliveries(list);
        }
      }
    } catch (err) {
      console.error("Error cargando domicilios:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/employees`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.employees || json.data || []);
      }
    } catch (err) {
      console.error("Error cargando empleados para asignación:", err);
    }
  };

  useEffect(() => {
    fetchDeliveries();
    fetchEmployees();
  }, [clientId]);

  // Generador determinista de coordenadas basado en la dirección / cédula
  const getCoordinates = (invoice: Invoice) => {
    let hash = 0;
    const str = invoice.delivery_address || invoice.customer_address || '';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = ((hash & 0xFF) / 255) * 0.1 - 0.05;
    const lngOffset = (((hash >> 8) & 0xFF) / 255) * 0.1 - 0.05;

    return {
      lat: STORE_LAT + latOffset,
      lng: STORE_LNG + lngOffset
    };
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDistanceKm = (invoice: Invoice) => {
    const coords = getCoordinates(invoice);
    return calculateDistance(STORE_LAT, STORE_LNG, coords.lat, coords.lng);
  };

  // Filtrado por Repartidor
  const filteredDeliveries = deliveries.filter((dev) => {
    if (selectedGuyFilter === 'all') return true;
    if (selectedGuyFilter === 'unassigned') return !dev.delivery_guy_id;
    return dev.delivery_guy_id === selectedGuyFilter;
  });

  // Ordenamiento
  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    if (sortBy === 'distance') {
      return getDistanceKm(a) - getDistanceKm(b);
    } else {
      const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
      const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
      return dateA - dateB;
    }
  });

  // Paginación por Lotes de 10 en 10 Direcciones
  const BATCH_SIZE = 10;
  const totalBatches = Math.max(1, Math.ceil(sortedDeliveries.length / BATCH_SIZE));
  const currentBatchPage = Math.min(batchPage, totalBatches);
  
  const currentBatchDeliveries = sortedDeliveries.slice(
    (currentBatchPage - 1) * BATCH_SIZE,
    currentBatchPage * BATCH_SIZE
  );

  const handleUpdateStatus = async (invoiceId: string, status: string, newDate?: string) => {
    setUpdatingId(invoiceId);
    try {
      const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deliveryStatus: status,
          deliveryDate: newDate || null
        })
      });
      const json = await res.json();
      if (json.success) {
        fetchDeliveries();
      } else {
        alert(json.error || 'Error al actualizar despacho.');
      }
    } catch (err) {
      alert('Error de conexión al actualizar.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssignDeliveryGuy = async (invoiceId: string, guyId: string) => {
    setUpdatingId(invoiceId);
    try {
      const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryGuyId: guyId || null })
      });
      const json = await res.json();
      if (json.success) {
        fetchDeliveries();
      } else {
        alert(json.error || 'Error asignando repartidor.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBatchAssignDeliveryGuy = async () => {
    if (!batchTargetGuyId) {
      alert('Por favor selecciona un repartidor para asignar al lote completo.');
      return;
    }

    if (currentBatchDeliveries.length === 0) return;

    const guyObj = employees.find(e => e.id === batchTargetGuyId);
    const guyName = guyObj ? `${guyObj.name} ${guyObj.last_name || ''}`.trim() : 'el repartidor seleccionado';

    if (!window.confirm(`¿Deseas asignar los ${currentBatchDeliveries.length} envíos del Lote #${currentBatchPage} a ${guyName}?`)) {
      return;
    }

    setBatchUpdating(true);
    try {
      await Promise.all(currentBatchDeliveries.map(dev => 
        fetch(`/api/clients/${clientId}/invoices/${dev.id}/delivery`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryGuyId: batchTargetGuyId })
        })
      ));
      fetchDeliveries();
    } catch (err) {
      alert('Error al asignar envíos en lote.');
    } finally {
      setBatchUpdating(false);
    }
  };

  const handleCopyAddress = async (address: string, invoiceId: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedId(invoiceId);
      setTimeout(() => setCopiedId(null), 1200);
    } catch (err) {
      console.error('Error copiando dirección:', err);
    }
  };

  const handleOpenReagendaModal = (dev: Invoice) => {
    setReagendaInvoice(dev);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReagendaDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleSaveReagenda = async () => {
    if (!reagendaInvoice || !reagendaDate) return;
    await handleUpdateStatus(reagendaInvoice.id, 'reagendado', reagendaDate);
    setReagendaInvoice(null);
  };

  return (
    <div className="space-y-6 text-white">
      {/* Cabecera Principal de Gestión */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#222428] pb-4 gap-4">
        <div>
          <h3 className="font-extrabold text-xl text-[#eab308]" style={{ color: '#eab308' }}>LOGÍSTICA DE DESPACHOS Y RUTAS DE ENTREGA</h3>
          <p className="text-xs text-gray-400">
            Asigna repartidores, organiza lotes de 10 direcciones por cercanía Haversine y gestiona o reagenda entregas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={fetchDeliveries}
            className="h-8 px-3 bg-[#181a1c] hover:bg-[#222528] text-white rounded-md flex items-center justify-center border border-[#2d3036] cursor-pointer transition text-xs font-semibold shrink-0"
            title="Refrescar Lista de Despachos"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">refresh</span>
            Refrescar
          </button>

          {/* Filtro por Repartidor */}
          <div className="flex items-center gap-2 bg-[#141517] px-3 py-1.5 rounded-md border border-[#222428]">
            <span className="material-symbols-outlined text-primary text-[16px]">two_wheeler</span>
            <select
              value={selectedGuyFilter}
              onChange={(e) => {
                setSelectedGuyFilter(e.target.value);
                setBatchPage(1);
              }}
              className="bg-transparent text-xs font-bold text-on-surface outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface-container text-on-surface">Todos los Repartidores</option>
              <option value="unassigned" className="bg-surface-container text-on-surface">Sin Asignar</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id} className="bg-surface-container text-on-surface">
                  {emp.name} {emp.last_name || ''}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento de Rutas */}
          <div className="bg-surface-container/60 p-1 rounded-xl border border-outline/20 flex gap-1">
            <button
              onClick={() => setSortBy('distance')}
              className={`px-3 py-1.5 rounded-lg border-0 cursor-pointer font-bold text-xs transition-all ${
                sortBy === 'distance' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface bg-transparent'
              }`}
            >
              Ruta Más Corta (Km)
            </button>
            <button
              onClick={() => setSortBy('date')}
              className={`px-3 py-1.5 rounded-lg border-0 cursor-pointer font-bold text-xs transition-all ${
                sortBy === 'date' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface bg-transparent'
              }`}
            >
              Fecha Programada
            </button>
          </div>
        </div>
      </div>

      {/* Control de Lotes / Tandas de 10 Direcciones */}
      {sortedDeliveries.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-surface-container-low/40 border border-outline/10 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">format_list_bulleted</span>
            <span className="text-xs font-bold text-on-surface">
              Mostrando {sortedDeliveries.length} direcciones {selectedGuyFilter !== 'all' ? '(Filtradas)' : ''}
            </span>
          </div>

          {/* Selector de Lote (Tandas de 10 en 10) */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
            <span className="text-[11px] font-bold text-on-surface-variant mr-1 uppercase">Lotes (10 en 10):</span>
            {Array.from({ length: totalBatches }).map((_, idx) => {
              const pNum = idx + 1;
              const isSelected = pNum === currentBatchPage;
              const startIdx = idx * BATCH_SIZE + 1;
              const endIdx = Math.min((idx + 1) * BATCH_SIZE, sortedDeliveries.length);

              return (
                <button
                  key={pNum}
                  onClick={() => setBatchPage(pNum)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    isSelected
                      ? 'bg-primary text-on-primary border-primary shadow-sm'
                      : 'bg-surface-container/60 text-on-surface-variant hover:bg-surface-container border-outline/20'
                  }`}
                >
                  Lote #{pNum} ({startIdx}-{endIdx})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Asignación Masiva por Lote */}
      {currentBatchDeliveries.length > 0 && (
        <div className="bg-[#141517] border border-[#eab308]/30 p-3.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[22px]" style={{ color: '#eab308' }}>two_wheeler</span>
            <div>
              <p className="text-xs font-extrabold text-white flex items-center gap-2">
                ASIGNACIÓN MASIVA DEL LOTE #{currentBatchPage}
                <span className="bg-[#eab308]/20 text-[#eab308] text-[10px] px-2 py-0.5 rounded-full border border-[#eab308]/30 font-mono">
                  {currentBatchDeliveries.length} pedidos
                </span>
              </p>
              <p className="text-[11px] text-gray-400">
                Asigna los {currentBatchDeliveries.length} domicilios de este lote a un mismo repartidor con 1 solo clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={batchTargetGuyId}
              onChange={(e) => setBatchTargetGuyId(e.target.value)}
              className="bg-[#181a1c] border border-[#2d3036] rounded-lg p-2 text-xs font-bold text-white outline-none cursor-pointer flex-grow md:flex-grow-0"
            >
              <option value="">-- Seleccionar Repartidor para el Lote --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  🛵 {emp.name} {emp.last_name || ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={batchUpdating || !batchTargetGuyId}
              onClick={handleBatchAssignDeliveryGuy}
              className="px-4 py-2 bg-[#eab308] hover:bg-amber-300 disabled:opacity-50 text-black font-extrabold text-xs rounded-lg cursor-pointer shadow flex items-center gap-1.5 transition whitespace-nowrap border-0"
            >
              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
              {batchUpdating ? 'Asignando Lote...' : `Asignar Lote #${currentBatchPage} (${currentBatchDeliveries.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Grid de Direcciones / Cards de Despacho */}
      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant">Cargando logística de despachos...</div>
      ) : currentBatchDeliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-on-surface-variant/40 space-y-3">
          <span className="material-symbols-outlined text-6xl">local_shipping</span>
          <p className="text-sm font-semibold">No hay entregas pendientes para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentBatchDeliveries.map((dev, index) => {
            const distance = getDistanceKm(dev);
            const isCompleted = dev.delivery_status === 'entregado';
            const isRescheduled = dev.delivery_status === 'reagendado';
            const stopNumber = (currentBatchPage - 1) * BATCH_SIZE + index + 1;

            return (
              <div 
                key={dev.id}
                className={`glass-card p-5 rounded-2xl border transition-all duration-200 relative flex flex-col justify-between ${
                  isCompleted 
                    ? 'border-outline/10 bg-surface-container-low/20 opacity-70' 
                    : isRescheduled
                      ? 'border-amber-500/30 bg-surface-container/40'
                      : 'border-outline/20 hover:border-primary/40 bg-surface-container/40'
                }`}
              >
                <div>
                  {/* Top Header Card: Parada # & Badge Status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-black text-xs flex items-center justify-center border border-primary/30 shrink-0">
                        #{stopNumber}
                      </span>
                      <div>
                        <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">Factura #{dev.invoice_number}</span>
                        <h4 className="font-extrabold text-sm text-on-surface mt-0.5 truncate max-w-[140px]" title={dev.customer_name}>
                          {dev.customer_name}
                        </h4>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      isCompleted
                        ? 'bg-surface-container-high text-primary border-primary/30'
                        : isRescheduled
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-primary/10 text-primary border-primary/30'
                    }`}>
                      {dev.delivery_status}
                    </span>
                  </div>

                  {/* Detalle de Dirección & Haversine */}
                  <div className="space-y-2 text-xs border-t border-b border-outline/10 py-3 my-3">
                    <div className="flex gap-2 items-start justify-between">
                      <div className="flex gap-2 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">pin_drop</span>
                        <span className="text-on-surface font-medium leading-tight break-words">{dev.delivery_address || dev.customer_address}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(dev.delivery_address || dev.customer_address, dev.id)}
                        className="ml-2 shrink-0 px-2 py-1 rounded-lg border border-outline/20 bg-surface-container-high/60 text-[9px] font-bold text-on-surface-variant hover:text-on-surface cursor-pointer transition"
                        title="Copiar dirección"
                      >
                        {copiedId === dev.id ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-on-surface-variant">Distancia de Tienda:</span>
                      <span className="font-mono font-bold text-on-surface">{distance.toFixed(2)} km</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-on-surface-variant">Costo Domicilio:</span>
                      <span className="font-mono text-primary font-bold">
                        {parseFloat(dev.delivery_fee) > 0 ? `$${parseFloat(dev.delivery_fee).toLocaleString('es-CO')}` : 'Gratis'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-on-surface-variant">Fecha Programada:</span>
                      <span className="font-bold text-on-surface">
                        {dev.delivery_date 
                          ? new Date(dev.delivery_date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'No programada'}
                      </span>
                    </div>

                    {/* Asignación de Repartidor */}
                    <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-outline/5">
                      <span className="text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-primary">person</span>
                        Repartidor:
                      </span>
                      <select
                        value={dev.delivery_guy_id || ''}
                        disabled={updatingId === dev.id}
                        onChange={(e) => handleAssignDeliveryGuy(dev.id, e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-lg text-[10px] font-bold text-primary p-1 outline-none cursor-pointer max-w-[130px]"
                      >
                        <option value="">Sin Asignar</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.last_name || ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Acciones del Domicilio */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {!isCompleted ? (
                    <>
                      {/* Botón Reagendar */}
                      <button
                        type="button"
                        disabled={updatingId === dev.id}
                        onClick={() => handleOpenReagendaModal(dev)}
                        className="px-3 py-1.5 bg-[#181a1c] hover:bg-[#222528] border border-[#2d3036] text-white font-bold rounded-md text-[11px] cursor-pointer flex items-center gap-1 transition-all"
                        title="Cambiar fecha de entrega"
                      >
                        <span className="material-symbols-outlined text-[15px] text-amber-400" style={{ color: '#eab308' }}>calendar_month</span>
                        Reagendar
                      </button>

                      {/* Botón Entregado */}
                      <button
                        type="button"
                        disabled={updatingId === dev.id}
                        onClick={() => handleUpdateStatus(dev.id, 'entregado')}
                        className="px-3 py-1.5 bg-[#eab308] hover:bg-amber-300 text-black font-extrabold rounded-md text-[11px] cursor-pointer flex items-center gap-1 transition-all shadow"
                      >
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        ENTREGADO
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-bold py-1">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Entrega Completada
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Reagendar Entrega */}
      {reagendaInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-container-highest border border-outline/30 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
              <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                Reagendar Entrega
              </h4>
              <button
                onClick={() => setReagendaInvoice(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg cursor-pointer bg-transparent border-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-on-surface-variant">
                Selecciona la nueva fecha de entrega para la factura <strong className="text-on-surface">#{reagendaInvoice.invoice_number}</strong> ({reagendaInvoice.customer_name}):
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">Nueva Fecha de Entrega</label>
                <input
                  type="date"
                  value={reagendaDate}
                  onChange={(e) => setReagendaDate(e.target.value)}
                  className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                />
              </div>

              {/* Botones rápidos */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setReagendaDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 bg-surface-container border border-outline/20 rounded-lg text-[10px] font-bold text-on-surface cursor-pointer hover:bg-surface-container-high"
                >
                  Mañana
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 2);
                    setReagendaDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 bg-surface-container border border-outline/20 rounded-lg text-[10px] font-bold text-on-surface cursor-pointer hover:bg-surface-container-high"
                >
                  En 2 días
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-outline/10">
              <button
                type="button"
                onClick={() => setReagendaInvoice(null)}
                className="px-4 py-2 border border-outline/20 text-on-surface font-bold text-xs rounded-xl cursor-pointer hover:bg-surface-container-high"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReagenda}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl cursor-pointer shadow hover:opacity-90"
              >
                Guardar Reagenda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
