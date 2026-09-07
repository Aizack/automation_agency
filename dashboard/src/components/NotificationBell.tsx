import React, { useState, useEffect, useRef } from 'react';

export interface AlertItem {
  id: string;
  alert_key: string;
  severity: string;
  message: string;
  details?: string;
  status: string;
  created_at: string;
  client_id?: string;
}

interface NotificationBellProps {
  clientId: string;
  onConnectWhatsApp: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  clientId,
  onConnectWhatsApp,
  onNavigateTab
}) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`/api/clients/${clientId}/alerts/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("[NotificationBell] Error cargando alertas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000); // Polling moderado cada 20 segundos
    return () => clearInterval(interval);
  }, [clientId]);

  // Manejar clic fuera del cuadro flotante para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleResolve = async (alertId: string) => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      const res = await fetch(`/api/clients/${clientId}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
      }
    } catch (err) {
      console.error("[NotificationBell] Error resolviendo alerta:", err);
    }
  };

  const handleResolveAll = async () => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      await Promise.all(
        alerts.map(alert =>
          fetch(`/api/clients/${clientId}/alerts/${alert.id}/resolve`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        )
      );
      setAlerts([]);
    } catch (err) {
      console.error("[NotificationBell] Error desestimando todas las alertas:", err);
    }
  };

  const handleActionClick = (alert: AlertItem) => {
    handleResolve(alert.id);
    if (
      alert.alert_key.includes('whatsapp') || 
      alert.message.toLowerCase().includes('whatsapp') || 
      alert.message.toLowerCase().includes('qr')
    ) {
      onConnectWhatsApp();
      if (onNavigateTab) onNavigateTab('resumen');
      setIsOpen(false);
    }
  };

  const activeCount = alerts.length;

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Botón Campanita */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchAlerts();
        }}
        className="relative p-2 rounded-[4px] hover:bg-[#E2DFD7]/40 transition-colors flex items-center justify-center text-[#161616] cursor-pointer outline-none border border-transparent hover:border-[#E2DFD7]"
        title="Notificaciones del Sistema"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>
        
        {activeCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D9381E] text-[10px] font-bold text-white shadow-sm animate-pulse">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </button>

      {/* Popover / Panel de Notificaciones Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[6px] bg-[#F6F4EE] border border-[#E2DFD7] shadow-xl z-50 overflow-hidden font-sans text-[#161616]">
          {/* Header del Popover */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#FAF8F3] border-b border-[#E2DFD7]">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-normal text-[#161616]" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>
                Notificaciones
              </span>
              {activeCount > 0 && (
                <span className="bg-[#D9381E]/10 text-[#D9381E] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D9381E]/20">
                  {activeCount} pendientes
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeCount > 0 && (
                <button
                  onClick={handleResolveAll}
                  className="text-[#D9381E] hover:underline text-[11px] font-bold cursor-pointer"
                  title="Marcar todas las notificaciones como leídas"
                >
                  Limpiar todas
                </button>
              )}
              <button
                onClick={() => fetchAlerts()}
                className="text-[#161616]/60 hover:text-[#161616] transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Actualizar"
              >
                <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
              </button>
            </div>
          </div>

          {/* Lista de Alertas */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[#E2DFD7]">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#161616]/60">
                <span className="material-symbols-outlined text-3xl mb-1 text-[#161616]/30 block">check_circle</span>
                No tienes notificaciones pendientes. Todo funciona correctamente.
              </div>
            ) : (
              alerts.map((alert) => {
                const isWa = alert.alert_key.includes('whatsapp') || alert.message.toLowerCase().includes('whatsapp');
                return (
                  <div key={alert.id} className="p-4 hover:bg-[#FAF8F3] transition-colors flex flex-col gap-2 relative group">
                    <div className="flex items-start gap-2.5 pr-6">
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 ${isWa ? 'text-[#D9381E]' : 'text-amber-600'}`}>
                        {isWa ? 'phonelink_erase' : 'warning'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-[#161616] truncate">
                            {isWa ? 'Conexión de WhatsApp' : 'Alerta de Sistema'}
                          </h4>
                          <span className="text-[10px] text-[#161616]/50">
                            {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-[#161616]/80 mt-0.5 leading-relaxed">
                          {alert.message}
                        </p>
                        {alert.details && (
                          <p className="text-[11px] text-[#161616]/60 mt-1 italic">
                            {alert.details}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botón de cierre rápido 'X' en la esquina superior derecha */}
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="absolute top-3 right-3 text-[#161616]/40 hover:text-[#D9381E] p-1 rounded transition cursor-pointer"
                      title="Descartar notificación"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>

                    {/* Acciones de Alerta en la parte inferior */}
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-2.5 py-1 bg-[#E2DFD7] hover:bg-[#d5d2ca] text-[#161616] text-[11px] font-bold rounded-[4px] transition cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        <span>Marcar leída</span>
                      </button>
                      {isWa && (
                        <button
                          onClick={() => handleActionClick(alert)}
                          className="px-3 py-1 bg-[#D9381E] hover:bg-[#b82d16] text-white text-[11px] font-bold rounded-[4px] transition flex items-center gap-1 shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                          <span>Generar Código QR</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
