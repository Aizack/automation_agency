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
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Cabecera Principal de Gestión */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            LOGÍSTICA & DESPACHOS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#161616] tracking-tight leading-none">
            Rutas de Entrega y Asignación
          </h2>
          <p className="text-xs text-[#76746E] mt-2">
            Asigna repartidores, organiza lotes de 10 direcciones por cercanía Haversine y gestiona o reagenda entregas en tiempo real.
          </p>
        </div>

        <button 
          type="button"
          onClick={fetchDeliveries}
          className="bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] text-[11px] font-mono font-bold py-2 px-3.5 flex items-center gap-1.5 transition cursor-pointer uppercase tracking-wider rounded-none shrink-0 shadow-xs h-9"
          title="Refrescar Lista de Despachos"
        >
          <span className="material-symbols-outlined text-[16px] text-[#D9381E]">refresh</span>
          Refrescar
        </button>
      </div>

      {/* Barra de Filtros, Ordenamiento y Lotes Unificada */}
      <div className="bg-white border border-[#E2DFD7] p-3 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        {/* Izquierda: Repartidor y Orden */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Selector de Repartidor */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[#D9381E] text-[16px]">two_wheeler</span>
              Repartidor:
            </span>
            <div className="relative">
              <select
                value={selectedGuyFilter}
                onChange={(e) => {
                  setSelectedGuyFilter(e.target.value);
                  setBatchPage(1);
                }}
                className="bg-[#FAF8F5] border border-[#E2DFD7] text-xs font-mono font-bold text-[#161616] pl-3 pr-7 py-1.5 outline-none cursor-pointer hover:border-[#161616] transition-colors appearance-none"
              >
                <option value="all">Todos los Repartidores</option>
                <option value="unassigned">Sin Asignar</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.last_name || ''}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[16px] text-[#76746E] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="hidden md:block h-5 w-px bg-[#E2DFD7]"></div>

          {/* Criterio de Orden */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider">
              Ordenar por:
            </span>
            <div className="inline-flex border border-[#E2DFD7] bg-[#FAF8F5] p-0.5">
              <button
                type="button"
                onClick={() => setSortBy('distance')}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border-0 ${
                  sortBy === 'distance' 
                    ? 'bg-[#161616] text-[#F6F4EE]' 
                    : 'text-[#76746E] hover:text-[#161616] bg-transparent'
                }`}
              >
                Distancia (Km)
              </button>
              <button
                type="button"
                onClick={() => setSortBy('date')}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border-0 ${
                  sortBy === 'date' 
                    ? 'bg-[#161616] text-[#F6F4EE]' 
                    : 'text-[#76746E] hover:text-[#161616] bg-transparent'
                }`}
              >
                Fecha Programada
              </button>
            </div>
          </div>
        </div>

        {/* Derecha: Selector de Lotes (Tandas de 10 en 10) */}
        {sortedDeliveries.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">
              Lotes ({sortedDeliveries.length} envíos):
            </span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {Array.from({ length: totalBatches }).map((_, idx) => {
                const pNum = idx + 1;
                const isSelected = pNum === currentBatchPage;
                const startIdx = idx * BATCH_SIZE + 1;
                const endIdx = Math.min((idx + 1) * BATCH_SIZE, sortedDeliveries.length);

                return (
                  <button
                    key={pNum}
                    onClick={() => setBatchPage(pNum)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                        : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] hover:bg-white border-[#E2DFD7]'
                    }`}
                  >
                    #{pNum} ({startIdx}-{endIdx})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Asignación Masiva por Lote */}
      {currentBatchDeliveries.length > 0 && (
        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 rounded-none flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white border border-[#E2DFD7] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#D9381E] text-[20px]">two_wheeler</span>
            </div>
            <div>
              <p className="text-xs font-mono font-bold text-[#161616] flex items-center gap-2 uppercase tracking-wide">
                ASIGNACIÓN MASIVA DEL LOTE #{currentBatchPage}
                <span className="bg-[#F6F4EE] text-[#D9381E] text-[10px] px-2 py-0.5 border border-[#E2DFD7] font-mono font-bold">
                  {currentBatchDeliveries.length} pedidos
                </span>
              </p>
              <p className="text-[11px] text-[#76746E] mt-0.5">
                Asigna los {currentBatchDeliveries.length} domicilios de este lote a un mismo repartidor con 1 solo clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={batchTargetGuyId}
              onChange={(e) => setBatchTargetGuyId(e.target.value)}
              className="bg-white border border-[#E2DFD7] rounded-none px-3 py-2 text-xs font-mono font-medium text-[#161616] outline-none cursor-pointer flex-grow md:flex-grow-0 focus:border-[#161616]"
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
              className="px-4 py-2 bg-[#D9381E] hover:bg-[#b82e18] disabled:opacity-40 text-white font-mono font-bold text-xs rounded-none cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap border-0 uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
              {batchUpdating ? 'Asignando...' : `Asignar Lote #${currentBatchPage} (${currentBatchDeliveries.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Grid de Direcciones / Cards de Despacho */}
      {loading ? (
        <div className="p-16 text-center text-xs font-mono uppercase tracking-widest text-[#76746E]">
          Cargando logística de despachos...
        </div>
      ) : currentBatchDeliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white border border-[#E2DFD7] rounded-none space-y-3">
          <span className="material-symbols-outlined text-5xl text-[#76746E]/40">local_shipping</span>
          <p className="text-xs font-mono uppercase tracking-wider text-[#76746E]">No hay entregas pendientes para este filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentBatchDeliveries.map((dev, index) => {
            const distance = getDistanceKm(dev);
            const isCompleted = dev.delivery_status === 'entregado';
            const isRescheduled = dev.delivery_status === 'reagendado';
            const stopNumber = (currentBatchPage - 1) * BATCH_SIZE + index + 1;

            return (
              <div 
                key={dev.id}
                className={`bg-white border rounded-none p-5 transition-all duration-200 relative flex flex-col justify-between shadow-xs ${
                  isCompleted 
                    ? 'border-[#E2DFD7] bg-[#FAF8F5]/60 opacity-75' 
                    : isRescheduled
                      ? 'border-[#D9381E]/40 hover:border-[#D9381E]'
                      : 'border-[#E2DFD7] hover:border-[#161616]'
                }`}
              >
                <div>
                  {/* Top Header Card: Parada # & Badge Status */}
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-[#E2DFD7]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 bg-[#161616] text-[#F6F4EE] font-mono font-bold text-[11px] flex items-center justify-center rounded-none shrink-0">
                        #{stopNumber}
                      </span>
                      <div>
                        <span className="text-[10px] text-[#76746E] font-mono uppercase tracking-wider block">
                          FACTURA #{dev.invoice_number}
                        </span>
                        <h4 className="font-serif font-bold text-sm text-[#161616] mt-0.5 truncate max-w-[150px]" title={dev.customer_name}>
                          {dev.customer_name}
                        </h4>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase border tracking-wider ${
                      isCompleted
                        ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                        : isRescheduled
                          ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]'
                          : 'bg-[#FEF7E0] text-[#B45309] border-[#FDE68A]'
                    }`}>
                      {dev.delivery_status}
                    </span>
                  </div>

                  {/* Detalle de Dirección & Haversine */}
                  <div className="space-y-2 text-xs py-1 my-2">
                    <div className="flex gap-2 items-start justify-between bg-[#FAF8F5] p-2.5 border border-[#E2DFD7]">
                      <div className="flex gap-2 min-w-0 flex-1">
                        <span className="material-symbols-outlined text-[#D9381E] text-[16px] shrink-0 mt-0.5">pin_drop</span>
                        <span className="text-[#161616] font-medium leading-snug break-words text-xs">
                          {dev.delivery_address || dev.customer_address}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(dev.delivery_address || dev.customer_address, dev.id)}
                        className="ml-2 shrink-0 px-2 py-0.5 bg-white border border-[#E2DFD7] text-[9px] font-mono font-bold text-[#161616] hover:bg-[#EAE6DF] cursor-pointer transition-colors rounded-none uppercase tracking-wider"
                        title="Copiar dirección"
                      >
                        {copiedId === dev.id ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-[#76746E]">Distancia de Tienda:</span>
                      <span className="font-mono font-bold text-[#161616]">{distance.toFixed(2)} km</span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#76746E]">Costo Domicilio:</span>
                      <span className="font-mono font-bold text-[#D9381E]">
                        {parseFloat(dev.delivery_fee) > 0 ? `$${parseFloat(dev.delivery_fee).toLocaleString('es-CO')}` : 'Gratis'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#76746E]">Fecha Programada:</span>
                      <span className="font-mono font-bold text-[#161616]">
                        {dev.delivery_date 
                          ? new Date(dev.delivery_date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })
                          : 'No programada'}
                      </span>
                    </div>

                    {/* Asignación de Repartidor */}
                    <div className="flex justify-between items-center text-[11px] pt-2 border-t border-[#E2DFD7]">
                      <span className="text-[#76746E] flex items-center gap-1 font-mono uppercase text-[10px]">
                        <span className="material-symbols-outlined text-[13px] text-[#D9381E]">person</span>
                        Repartidor:
                      </span>
                      <select
                        value={dev.delivery_guy_id || ''}
                        disabled={updatingId === dev.id}
                        onChange={(e) => handleAssignDeliveryGuy(dev.id, e.target.value)}
                        className="bg-[#FAF8F5] border border-[#E2DFD7] rounded-none text-[10px] font-mono font-bold text-[#161616] p-1 outline-none cursor-pointer max-w-[140px] focus:border-[#161616]"
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
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2DFD7] mt-2">
                  {!isCompleted ? (
                    <>
                      {/* Botón Reagendar */}
                      <button
                        type="button"
                        disabled={updatingId === dev.id}
                        onClick={() => handleOpenReagendaModal(dev)}
                        className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] font-mono font-bold rounded-none text-[11px] cursor-pointer flex items-center gap-1 transition-colors uppercase tracking-wider"
                        title="Cambiar fecha de entrega"
                      >
                        <span className="material-symbols-outlined text-[15px] text-[#76746E]">calendar_month</span>
                        Reagendar
                      </button>

                      {/* Botón Entregado */}
                      <button
                        type="button"
                        disabled={updatingId === dev.id}
                        onClick={() => handleUpdateStatus(dev.id, 'entregado')}
                        className="px-3 py-1.5 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold rounded-none text-[11px] cursor-pointer flex items-center gap-1 transition-colors shadow-xs uppercase tracking-wider border-0"
                      >
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        ENTREGADO
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[#137333] font-mono font-bold py-1">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      ENTREGA COMPLETADA
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#F6F4EE] border border-[#161616] rounded-none p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">LOGÍSTICA</span>
                <h4 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9381E] text-[18px]">calendar_month</span>
                  Reagendar Entrega
                </h4>
              </div>
              <button
                onClick={() => setReagendaInvoice(null)}
                className="text-[#76746E] hover:text-[#161616] p-1 cursor-pointer bg-transparent border-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#76746E]">
                Selecciona la nueva fecha de entrega para la factura <strong className="text-[#161616] font-mono">#{reagendaInvoice.invoice_number}</strong> ({reagendaInvoice.customer_name}):
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase text-[#76746E] tracking-wider block">Nueva Fecha de Entrega</label>
                <input
                  type="date"
                  value={reagendaDate}
                  onChange={(e) => setReagendaDate(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs font-mono text-[#161616] outline-none focus:border-[#161616]"
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
                  className="px-2.5 py-1 bg-white border border-[#E2DFD7] rounded-none text-[10px] font-mono font-bold text-[#161616] cursor-pointer hover:bg-[#FAF8F5] uppercase tracking-wider"
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
                  className="px-2.5 py-1 bg-white border border-[#E2DFD7] rounded-none text-[10px] font-mono font-bold text-[#161616] cursor-pointer hover:bg-[#FAF8F5] uppercase tracking-wider"
                >
                  En 2 días
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#E2DFD7]">
              <button
                type="button"
                onClick={() => setReagendaInvoice(null)}
                className="px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold text-xs rounded-none cursor-pointer hover:bg-[#FAF8F5] uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReagenda}
                className="px-4 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none cursor-pointer shadow-xs uppercase tracking-wider border-0"
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
