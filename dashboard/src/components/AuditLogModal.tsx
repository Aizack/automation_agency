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
    if (act.includes('CREATE') || act.includes('CREAR')) {
      return { label: 'Creación', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
      return { label: 'Modificación', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    }
    if (act.includes('TRANSFER') || act.includes('TRASLADO')) {
      return { label: 'Traslado', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
    if (act.includes('DELETE') || act.includes('CANCEL') || act.includes('ELIMINAR')) {
      return { label: 'Eliminación', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
    if (act.includes('LOGIN')) {
      return { label: 'Inicio Sesión', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    }
    if (act.includes('LOGOUT')) {
      return { label: 'Cierre Sesión', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
    return { label: action, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined">history</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el historial de este registro..."
              className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <button
            onClick={fetchLogs}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-xs">refresh</span>
            Actualizar
          </button>
        </div>

        {/* Content / Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <span className="material-symbols-outlined text-3xl animate-spin text-amber-400">sync</span>
              <p className="text-xs">Cargando registros de auditoría...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-600">history_toggle_off</span>
              <p className="text-sm font-medium text-slate-400">No se encontraron eventos registrados</p>
              <p className="text-xs">Las acciones futuras realizadas sobre este elemento quedarán registradas aquí.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {logs.map((log) => {
                const badge = getActionBadge(log.action);
                return (
                  <div key={log.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-amber-400 group-hover:scale-125 transition-transform" />

                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            {log.user_name}
                          </span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                            {log.user_role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(log.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {log.description}
                      </p>

                      {log.details && (
                        <div className="pt-1">
                          <button
                            onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                            className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {selectedLog?.id === log.id ? 'unfold_less' : 'unfold_more'}
                            </span>
                            {selectedLog?.id === log.id ? 'Ocultar detalles técnicos' : 'Ver valores modificados'}
                          </button>

                          {selectedLog?.id === log.id && (
                            <pre className="mt-2 p-3 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-40">
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Total de eventos: {logs.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
