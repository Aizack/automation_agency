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
  created_at: string;
}

// Coordenadas simuladas de la tienda para cálculo de Haversine local
const STORE_LAT = 4.60971; 
const STORE_LNG = -74.08175;

export const SaaSErpDomicilios: React.FC<DomiciliosProps> = ({ clientId }) => {
  const [deliveries, setDeliveries] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'distance'>('distance');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/invoices`);
      const json = await res.json();
      if (json.success) {
        // Filtrar facturas con despacho a domicilio
        const list = (json.invoices || []).filter((inv: any) => inv.delivery_method === 'domicilio');
        setDeliveries(list);
      }
    } catch (err) {
      console.error("Error cargando domicilios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [clientId]);

  // Generador determinista de coordenadas basado en la dirección / cédula para simular distancias reales
  const getCoordinates = (invoice: Invoice) => {
    // Generar un desplazamiento determinista de hasta 0.15 grados (~15 km)
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

  // Fórmula de Haversine para calcular distancia en Km entre dos coordenadas
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
  };

  const getDistanceKm = (invoice: Invoice) => {
    const coords = getCoordinates(invoice);
    return calculateDistance(STORE_LAT, STORE_LNG, coords.lat, coords.lng);
  };

  const sortedDeliveries = [...deliveries].sort((a, b) => {
    if (sortBy === 'distance') {
      return getDistanceKm(a) - getDistanceKm(b);
    } else {
      const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
      const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
      return dateA - dateB;
    }
  });

  const handleUpdateStatus = async (invoiceId: string, status: string) => {
    setUpdatingId(invoiceId);
    try {
      const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryStatus: status })
      });
      const json = await res.json();
      if (json.success) {
        fetchDeliveries();
      } else {
        alert(json.error || 'Error al cambiar estado.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyAddress = async (address: string, invoiceId: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedId(invoiceId);
      setTimeout(() => setCopiedId(null), 1200);
    } catch (err) {
      console.error('Error copying address:', err);
      alert('No se pudo copiar la dirección.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-outline/10 pb-4 gap-4">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Logística de Despachos y Domicilios</h3>
          <p className="text-on-surface-variant text-body-md opacity-70">
            Gestiona la entrega a domicilio, calcula distancias de entrega por Haversine y organiza rutas óptimas de despacho.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={fetchDeliveries}
            className="w-9 h-9 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-xl flex items-center justify-center border border-outline/10 cursor-pointer transition shadow shrink-0"
            title="Refrescar Domicilios"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
          <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Organizar por:</label>
          <div className="bg-surface-container/50 p-1.5 rounded-xl border border-outline/10 flex gap-2">
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

      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant">Cargando despachos...</div>
      ) : sortedDeliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-on-surface-variant/40 space-y-3">
          <span className="material-symbols-outlined text-6xl">local_shipping</span>
          <p className="text-sm font-semibold">No hay despachos a domicilio pendientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDeliveries.map((dev) => {
            const distance = getDistanceKm(dev);
            const isCompleted = dev.delivery_status === 'entregado';

            return (
              <div 
                key={dev.id}
                className={`glass-card p-5 rounded-2xl border transition-all duration-200 ${
                  isCompleted 
                    ? 'border-green-500/20 bg-green-500/[0.02] opacity-75' 
                    : 'border-outline/10 hover:border-primary/20 bg-surface-container/10'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">Factura #{dev.invoice_number}</span>
                    <h4 className="font-extrabold text-sm text-on-surface mt-0.5 truncate max-w-[150px]" title={dev.customer_name}>
                      {dev.customer_name}
                    </h4>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                    dev.delivery_status === 'entregado'
                      ? 'bg-green-500/10 text-green-500 border-green-500/20'
                      : dev.delivery_status === 'en_camino'
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse'
                        : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                  }`}>
                    {dev.delivery_status === 'en_camino' ? 'En Camino' : dev.delivery_status}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs border-t border-b border-outline/5 py-3 my-3">
                  <div className="flex gap-2 items-start justify-between">
                    <div className="flex gap-2 min-w-0 flex-1">
                      <span className="material-symbols-outlined text-primary text-[16px] shrink-0">pin_drop</span>
                      <span className="text-on-surface-variant leading-tight break-words">{dev.delivery_address || dev.customer_address}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(dev.delivery_address || dev.customer_address, dev.id)}
                      className="ml-2 shrink-0 px-2 py-1 rounded-lg border border-outline/10 bg-surface-container-high/30 text-[9px] font-bold text-on-surface-variant hover:text-on-surface cursor-pointer transition"
                      title="Copiar dirección"
                    >
                      {copiedId === dev.id ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Distancia de Tienda:</span>
                    <span className="font-mono font-bold text-on-surface">{distance.toFixed(2)} km</span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Costo Domicilio:</span>
                    <span className="font-mono text-green-500 font-bold">
                      {parseFloat(dev.delivery_fee) > 0 ? `$${parseFloat(dev.delivery_fee).toLocaleString('es-CO')}` : 'Gratis'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-on-surface-variant">Fecha Entrega:</span>
                    <span className="font-bold text-on-surface">
                      {dev.delivery_date 
                        ? new Date(dev.delivery_date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })
                        : 'No programada'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {dev.delivery_status !== 'entregado' && (
                    <>
                      {dev.delivery_status === 'pending' && (
                        <button
                          disabled={updatingId === dev.id}
                          onClick={() => handleUpdateStatus(dev.id, 'en_camino')}
                          className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold rounded-lg border border-blue-500/20 text-[10px] cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">directions_bike</span>
                          Despachar
                        </button>
                      )}
                      
                      <button
                        disabled={updatingId === dev.id}
                        onClick={() => handleUpdateStatus(dev.id, 'entregado')}
                        className="px-3 py-1.5 bg-green-500 text-on-primary font-bold rounded-lg hover:opacity-90 active:scale-95 text-[10px] cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">check</span>
                        Entregado
                      </button>
                    </>
                  )}
                  {isCompleted && (
                    <div className="flex items-center gap-1 text-[11px] text-green-500 font-bold py-1">
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                      Completado
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
