import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

export interface AuditLogItem {
  id: string;
  client_id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  user_role: string;
  action: string;
  module: string;
  entity_type?: string | null;
  entity_id?: string | null;
  description: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  title: string;
  subtitle?: string;
  entityType?: string;
  entityId?: string;
  module?: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  clientId,
  title,
  subtitle,
  entityType,
  entityId,
  module
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      let url = `/api/clients/${clientId}/audit-logs?limit=50`;
      if (module) url += `&module=${encodeURIComponent(module)}`;
      if (entityType) url += `&entity_type=${encodeURIComponent(entityType)}`;
      if (entityId) url += `&entity_id=${encodeURIComponent(entityId)}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error cargando historial de auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    } else {
      setSelectedLog(null);
      setSearch('');
    }
  }, [isOpen, clientId, entityType, entityId, module]);

  if (!isOpen) return null;

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('CREAR') || act.includes('EMISION')) {
      return { label: 'Creación / Emisión', color: 'bg-[#161616] text-white border-[#161616]' };
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
      return { label: 'Modificación', color: 'bg-[#FAF8F5] text-[#161616] border-[#E2DFD7]' };
    }
    if (act.includes('PAGO') || act.includes('PAYMENT')) {
      return { label: 'Pago Registrado', color: 'bg-[#E6F4EA] text-[#1E4620] border-[#A8DADC]' };
    }
    if (act.includes('DELETE') || act.includes('CANCEL') || act.includes('ELIMINAR')) {
      return { label: 'Eliminación', color: 'bg-[#D9381E] text-white border-[#D9381E]' };
    }
    return { label: action, color: 'bg-[#FAF8F5] text-[#6B6862] border-[#E2DFD7]' };
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#161616]/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#F6F4EE] border border-[#161616] rounded-none shadow-2xl flex flex-col overflow-hidden text-[#161616]">
        
        {/* Header Wabi-Sabi */}
        <div className="px-6 py-5 border-b border-[#E2DFD7] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#D9381E]">
              <span className="material-symbols-outlined">history</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-widest block">HISTORIAL DE ACCIONES Y EVENTOS</span>
              <h3 className="font-serif text-2xl font-normal text-[#161616] tracking-tight">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-[#6B6862] font-mono mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#161616] hover:text-[#D9381E] text-2xl font-light cursor-pointer border-0 bg-transparent leading-none"
          >
            &times;
          </button>
        </div>

        {/* Bar de Búsqueda Wabi-Sabi */}
        <div className="px-6 py-3 border-b border-[#E2DFD7] bg-[#FAF8F5] flex items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6862] text-sm">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento o acción..."
              className="w-full bg-white border border-[#E2DFD7] text-xs text-[#161616] pl-9 pr-4 py-2 rounded-none focus:outline-none focus:border-[#161616] font-sans"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="px-3.5 py-2 bg-white hover:bg-[#161616] hover:text-white text-[#161616] border border-[#E2DFD7] text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 rounded-none shadow-xs"
          >
            <span className="material-symbols-outlined text-xs">refresh</span>
            Actualizar
          </button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#6B6862] space-y-3">
              <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-mono">Cargando bitácora de auditoría...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#6B6862] space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#6B6862]">history_toggle_off</span>
              <p className="text-sm font-serif font-bold text-[#161616]">No se encontraron eventos registrados</p>
              <p className="text-xs text-[#6B6862]">Las acciones de creación, actualización y cobro sobre este registro quedarán registradas aquí.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2DFD7]">
              {logs.map((log) => {
                const badge = getActionBadge(log.action);
                return (
                  <div key={log.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-6 top-2 w-3 h-3 rounded-none bg-[#F6F4EE] border-2 border-[#161616]" />

                    <div className="bg-white border border-[#E2DFD7] hover:border-[#161616] p-4 space-y-2 transition-colors rounded-none shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#E2DFD7] pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-bold text-[#161616]">
                            👤 {log.user_name || 'Usuario ERP'}
                          </span>
                          <span className="text-[10px] bg-[#FAF8F5] text-[#6B6862] border border-[#E2DFD7] px-1.5 py-0.5 font-mono">
                            {log.user_role || 'admin'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#6B6862] font-mono">
                          📅 {formatDate(log.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[#161616] leading-relaxed font-sans font-medium">
                        {log.description}
                      </p>

                      {log.details && (
                        <div className="pt-1">
                          <button
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                            className="text-[10px] text-[#D9381E] hover:underline flex items-center gap-1 font-bold uppercase tracking-wider transition-colors border-0 bg-transparent cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {selectedLog?.id === log.id ? 'unfold_less' : 'unfold_more'}
                            </span>
                            {selectedLog?.id === log.id ? 'Ocultar detalles técnicos' : 'Ver valores registrados'}
                          </button>

                          {selectedLog?.id === log.id && (
                            <pre className="mt-2 p-3 bg-[#FAF8F5] border border-[#E2DFD7] text-[10px] font-mono text-[#161616] overflow-x-auto max-h-40">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Wabi-Sabi */}
        <div className="px-6 py-4 border-t border-[#E2DFD7] bg-white flex items-center justify-between text-xs text-[#6B6862]">
          <span className="font-mono text-[11px]">Total de eventos: <strong className="text-[#161616]">{logs.length}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#161616] hover:bg-[#D9381E] text-white text-xs font-bold uppercase tracking-wider rounded-none transition cursor-pointer border-0 shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

