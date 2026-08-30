import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface AuditLog {
  id: string;
  client_id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  user_role: string;
  action: string;
  module: string;
  description: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SaaSErpAuditLogsProps {
  clientId: string;
}

export const SaaSErpAuditLogs: React.FC<SaaSErpAuditLogsProps> = ({ clientId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let url = `/api/clients/${clientId}/audit-logs?limit=100`;
      if (selectedModule !== 'all') {
        url += `&module=${encodeURIComponent(selectedModule)}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error cargando trazabilidad de auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [clientId, selectedModule]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditLogs();
  };

  const getModuleBadge = (moduleName: string) => {
    switch (moduleName) {
      case 'Seguridad':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><span className="material-symbols-outlined text-xs">key</span> Seguridad</span>;
      case 'Facturación':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span className="material-symbols-outlined text-xs">receipt_long</span> Facturación</span>;
      case 'Inventario':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"><span className="material-symbols-outlined text-xs">inventory_2</span> Inventario</span>;
      case 'CRM':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"><span className="material-symbols-outlined text-xs">group</span> CRM</span>;
      case 'Domicilios':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20"><span className="material-symbols-outlined text-xs">local_shipping</span> Domicilios</span>;
      case 'IA & WhatsApp':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"><span className="material-symbols-outlined text-xs">smart_toy</span> IA & WhatsApp</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20"><span className="material-symbols-outlined text-xs">info</span> {moduleName}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-indigo-400 text-3xl">verified_user</span>
            Trazabilidad & Bitácora de Auditoría
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Registro cronológico inalterable de acciones, inicios de sesión y operaciones realizadas por usuarios y el Bot de IA para confirmación de hechos.
          </p>
        </div>
        <button
          onClick={fetchAuditLogs}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-medium transition-all"
        >
          <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Actualizar Bitácora
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <form onSubmit={handleSearchSubmit} className="md:col-span-8 flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Buscar por usuario, acción o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors"
          >
            Buscar
          </button>
        </form>

        <div className="md:col-span-4">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos los Módulos</option>
            <option value="Facturación">Facturación</option>
            <option value="Inventario">Inventario</option>
            <option value="CRM">CRM & Clientes</option>
            <option value="Domicilios">Domicilios & Envíos</option>
            <option value="IA & WhatsApp">IA & WhatsApp</option>
            <option value="Seguridad">Seguridad & Usuarios</option>
            <option value="Configuración">Configuración</option>
          </select>
        </div>
      </div>

      {/* Tabla de Registros de Auditoría */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <span className="material-symbols-outlined animate-spin text-3xl text-indigo-400">refresh</span>
            <p className="text-sm">Cargando registros de auditoría en tiempo real...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-600">policy</span>
            <p className="text-lg font-medium text-slate-300">No se encontraron eventos de auditoría</p>
            <p className="text-sm text-slate-500">Prueba ajustando los filtros de búsqueda o el módulo seleccionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Fecha / Hora</th>
                  <th className="py-3.5 px-4">Usuario / Rol</th>
                  <th className="py-3.5 px-4">Módulo</th>
                  <th className="py-3.5 px-4">Acción</th>
                  <th className="py-3.5 px-4">Descripción de Evento</th>
                  <th className="py-3.5 px-4 text-center">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {logs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-xs flex items-center gap-1.5 mt-1">
                        <span className="material-symbols-outlined text-xs text-slate-500">schedule</span>
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="text-slate-200 font-medium text-xs">{log.user_name}</p>
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">{log.user_role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-indigo-300">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs max-w-md truncate">
                        {log.description}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors"
                          title="Ver detalle completo"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Auditoría */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400">shield</span>
                Detalle de Evento de Auditoría
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Fecha y Hora</p>
                  <p className="text-slate-200 font-semibold text-xs mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Módulo</p>
                  <div className="mt-0.5">{getModuleBadge(selectedLog.module)}</div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Usuario</p>
                  <p className="text-slate-200 font-semibold text-xs mt-0.5">{selectedLog.user_name} ({selectedLog.user_role})</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Dirección IP</p>
                  <p className="text-slate-400 font-mono text-xs mt-0.5">{selectedLog.ip_address || 'No registrada'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-medium mb-1">Descripción del Evento:</p>
                <p className="text-slate-200 bg-slate-800/60 p-3 rounded-xl border border-slate-800 text-xs leading-relaxed">
                  {selectedLog.description}
                </p>
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-1">Datos payload/JSON modificados:</p>
                  <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
