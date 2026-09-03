import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap"><span className="material-symbols-outlined text-[13px]">key</span> Seguridad</span>;
      case 'Facturación':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap"><span className="material-symbols-outlined text-[13px]">receipt_long</span> Facturación</span>;
      case 'Inventario':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap"><span className="material-symbols-outlined text-[13px]">inventory_2</span> Inventario</span>;
      case 'CRM':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap"><span className="material-symbols-outlined text-[13px]">group</span> CRM</span>;
      case 'Domicilios':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap"><span className="material-symbols-outlined text-[13px]">local_shipping</span> Domicilios</span>;
      case 'IA & WhatsApp':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 whitespace-nowrap"><span className="material-symbols-outlined text-[13px]">smart_toy</span> IA & WhatsApp</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 whitespace-nowrap"><span className="material-symbols-outlined text-[13px]">info</span> {moduleName}</span>;
    }
  };

  const handleCopyLogDetails = (log: AuditLog) => {
    const textToCopy = `📌 REGISTRO DE AUDITORÍA ERP
• Fecha: ${new Date(log.created_at).toLocaleString('es-CO')}
• Usuario: ${log.user_name} (${log.user_role})
• Módulo: ${log.module}
• Acción: ${log.action}
• Descripción: ${log.description}
${log.details ? `• Payload/Detalles: ${JSON.stringify(log.details)}` : ''}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handlePrintLogDetails = (log: AuditLog) => {
    const printWin = window.open('', '_blank', 'width=650,height=700');
    if (!printWin) return;

    printWin.document.write(`
      <html>
        <head>
          <title>Bitácora de Auditoría #${log.id.substring(0, 8)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; line-height: 1.5; }
            h2 { color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; }
            .meta { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 15px; font-size: 13px; }
            .meta-item { margin-bottom: 6px; }
            .meta-label { font-weight: bold; color: #64748b; }
            .description { background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 14px; margin-bottom: 15px; }
            pre { background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto; }
            .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>🛡️ Registro de Auditoría y Trazabilidad ERP</h2>
          <div class="meta">
            <div class="meta-item"><span class="meta-label">Fecha / Hora:</span> ${new Date(log.created_at).toLocaleString('es-CO')}</div>
            <div class="meta-item"><span class="meta-label">Usuario / Rol:</span> ${log.user_name} (${log.user_role})</div>
            <div class="meta-item"><span class="meta-label">Módulo:</span> ${log.module}</div>
            <div class="meta-item"><span class="meta-label">Acción:</span> ${log.action}</div>
            <div class="meta-item"><span class="meta-label">Dirección IP:</span> ${log.ip_address || 'No registrada'}</div>
          </div>
          <div class="meta-label" style="margin-bottom: 5px;">Descripción Completa del Evento:</div>
          <div class="description">${log.description}</div>
          ${log.details ? `<div class="meta-label" style="margin-bottom: 5px;">Detalles Adicionales (JSON):</div><pre>${JSON.stringify(log.details, null, 2)}</pre>` : ''}
          <div class="footer">Documento Oficial de Registro de Bitácora Generado por el Sistema ERP.</div>
          <script>
            window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleShareEmailLog = (log: AuditLog) => {
    const subject = encodeURIComponent(`Bitácora de Auditoría ERP - ${log.action} (${log.module})`);
    const body = encodeURIComponent(`Hola,\n\nTe comparto el registro oficial de auditoría:\n\n• Fecha: ${new Date(log.created_at).toLocaleString('es-CO')}\n• Usuario: ${log.user_name} (${log.user_role})\n• Módulo: ${log.module}\n• Acción: ${log.action}\n• Descripción: ${log.description}\n\nEnviado desde la plataforma ERP.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
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
          type="button"
          onClick={fetchAuditLogs}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-medium transition-all cursor-pointer"
        >
          <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Actualizar Bitácora
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <form onSubmit={handleSearchSubmit} className="md:col-span-8 flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">search</span>
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
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors cursor-pointer border-0"
          >
            Buscar
          </button>
        </form>

        <div className="md:col-span-4">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full py-2.5 px-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
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

      {/* Tabla de Registros de Auditoría (Fija, Centrada y Anti-Desplazamiento) */}
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
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[160px]">Fecha / Hora</th>
                  <th className="py-3.5 px-4 w-[170px]">Usuario / Rol</th>
                  <th className="py-3.5 px-4 w-[130px]">Módulo</th>
                  <th className="py-3.5 px-4 w-[140px]">Acción</th>
                  <th className="py-3.5 px-4">Descripción de Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {logs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors items-center">
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs text-slate-500">schedule</span>
                          {dateStr}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-7 h-7 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
                            {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="truncate">
                            <p className="text-slate-200 font-medium text-xs truncate">{log.user_name}</p>
                            <span className="text-[9px] text-slate-500 uppercase font-semibold block truncate">{log.user_role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-indigo-300 font-semibold truncate">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs">
                        <div className="flex items-center justify-between gap-2 bg-slate-950/40 p-1.5 px-2.5 rounded-xl border border-slate-800/50">
                          <span className="truncate text-slate-300 flex-1" title={log.description}>
                            {log.description}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="p-1 hover:bg-amber-500/20 text-[#eab308] hover:text-amber-300 rounded-lg transition-colors border-0 bg-transparent flex items-center justify-center cursor-pointer shrink-0"
                            title="👁️ Ver detalle completo del evento"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Portal Teleportado para Detalle de Auditoría */}
      {selectedLog && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-[#141517] border border-[#2a2c32] rounded-2xl max-w-xl w-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150 relative z-[100000]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="p-5 border-b border-[#222428] flex items-center justify-between bg-[#1a1c20]">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-[#eab308]">shield</span>
                Detalle Completo del Evento de Auditoría
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer border-0 bg-transparent transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {/* Cuerpo del Modal */}
            <div className="p-6 space-y-4 text-xs text-white max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3 bg-[#0a0b0c] p-4 rounded-xl border border-[#26282d]">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fecha y Hora</p>
                  <p className="text-white font-mono font-bold text-xs mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Módulo ERP</p>
                  <div className="mt-0.5">{getModuleBadge(selectedLog.module)}</div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Usuario Responsable</p>
                  <p className="text-white font-bold text-xs mt-0.5">{selectedLog.user_name} ({selectedLog.user_role})</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Dirección IP</p>
                  <p className="text-amber-400 font-mono text-xs mt-0.5">{selectedLog.ip_address || 'No registrada'}</p>
                </div>
              </div>

              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Acción Realizada:</p>
                <p className="text-indigo-300 font-mono font-bold bg-[#0a0b0c] p-2.5 rounded-xl border border-[#26282d] text-xs">
                  {selectedLog.action}
                </p>
              </div>

              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Descripción Completa del Evento:</p>
                <div className="text-gray-200 bg-[#0a0b0c] p-3.5 rounded-xl border border-[#26282d] text-xs leading-relaxed whitespace-pre-wrap">
                  {selectedLog.description}
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Detalles Adicionales (Payload JSON):</p>
                  <pre className="bg-[#050506] p-3.5 rounded-xl border border-[#26282d] text-xs text-emerald-400 font-mono overflow-x-auto max-h-44">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Acciones Inferiores del Modal: Copiar, Imprimir, Compartir Email */}
            <div className="p-4 border-t border-[#222428] bg-[#1a1c20] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLogDetails(selectedLog)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                    copiedSuccess
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-surface-container border-outline/20 text-on-surface hover:bg-surface-container-high'
                  }`}
                  title="Copiar resumen al portapapeles"
                >
                  <span className="material-symbols-outlined text-[16px]">{copiedSuccess ? 'check' : 'content_copy'}</span>
                  {copiedSuccess ? '¡Copiado!' : 'Copiar'}
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintLogDetails(selectedLog)}
                  className="px-3 py-2 bg-surface-container border border-outline/20 hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir comprobante de bitácora"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Imprimir
                </button>

                <button
                  type="button"
                  onClick={() => handleShareEmailLog(selectedLog)}
                  className="px-3 py-2 bg-surface-container border border-outline/20 hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Enviar por correo electrónico"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  Compartir Email
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-primary hover:opacity-90 text-on-primary text-xs font-bold rounded-xl transition cursor-pointer border-0"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

