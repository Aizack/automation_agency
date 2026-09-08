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
    let icon = 'info';
    switch (moduleName) {
      case 'Seguridad':
      case 'Seguridad & Usuarios':
        icon = 'shield';
        break;
      case 'Facturación':
        icon = 'receipt_long';
        break;
      case 'Inventario':
        icon = 'inventory_2';
        break;
      case 'CRM':
      case 'CRM & Clientes':
        icon = 'contacts';
        break;
      case 'Cartera':
        icon = 'payments';
        break;
      case 'Domicilios':
      case 'Domicilios & Envíos':
        icon = 'local_shipping';
        break;
      case 'Optometría':
      case 'Fórmulas':
        icon = 'visibility';
        break;
      case 'Citas':
      case 'Agenda':
        icon = 'calendar_month';
        break;
      case 'IA & WhatsApp':
        icon = 'smart_toy';
        break;
      default:
        icon = 'folder';
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] whitespace-nowrap">
        <span className="material-symbols-outlined text-[12px]">{icon}</span>
        {moduleName}
      </span>
    );
  };

  const handleCopyLogDetails = (log: AuditLog) => {
    const textToCopy = `📌 REGISTRO DE AUDITORÍA ERP
• Fecha: ${new Date(log.created_at).toLocaleString('es-CO')}
• Usuario: ${log.user_name} (${log.user_role})
• Módulo: ${log.module}
• Acción: ${log.action}
• Descripción: ${log.description}
${log.ip_address ? `• IP: ${log.ip_address}` : ''}
${log.details ? `• Payload/Detalles: ${JSON.stringify(log.details, null, 2)}` : ''}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  const handlePrintLogDetails = (log: AuditLog) => {
    const printWin = window.open('', '_blank', 'width=680,height=750');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Auditoría #${log.id.substring(0, 8)}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Courier New', Courier, monospace; padding: 24px; color: #161616; background: #fff; line-height: 1.4; font-size: 12px; }
            .header { border-bottom: 2px solid #161616; padding-bottom: 12px; margin-bottom: 20px; }
            .eyebrow { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #D9381E; }
            h2 { margin: 4px 0 0 0; font-size: 18px; font-weight: bold; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border: 1px solid #E2DFD7; background: #FAF8F5; padding: 14px; margin-bottom: 18px; }
            .meta-item { font-size: 11px; }
            .meta-label { font-weight: bold; text-transform: uppercase; color: #76746E; display: block; font-size: 9px; }
            .section-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #161616; margin: 12px 0 4px 0; }
            .description { background: #FAF8F5; padding: 12px; border: 1px solid #E2DFD7; font-size: 12px; white-space: pre-wrap; margin-bottom: 14px; }
            pre { background: #FAF8F5; border: 1px solid #E2DFD7; padding: 10px; font-size: 10px; overflow-x: auto; margin-bottom: 20px; }
            .footer { margin-top: 30px; font-size: 10px; color: #76746E; text-align: center; border-top: 1px solid #E2DFD7; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="eyebrow">SISTEMA ERP &mdash; TRAZABILIDAD OFICIAL</div>
            <h2>Comprobante de Evento de Auditoría</h2>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><span class="meta-label">ID Evento:</span> #${log.id}</div>
            <div class="meta-item"><span class="meta-label">Fecha / Hora:</span> ${new Date(log.created_at).toLocaleString('es-CO')}</div>
            <div class="meta-item"><span class="meta-label">Usuario Responsable:</span> ${log.user_name} (${log.user_role})</div>
            <div class="meta-item"><span class="meta-label">Módulo ERP:</span> ${log.module}</div>
            <div class="meta-item"><span class="meta-label">Acción Registrada:</span> ${log.action}</div>
            <div class="meta-item"><span class="meta-label">Dirección IP:</span> ${log.ip_address || 'No registrada'}</div>
          </div>

          <div class="section-label">Descripción del Evento:</div>
          <div class="description">${log.description}</div>

          ${log.details ? `
            <div class="section-label">Detalles / Payload JSON:</div>
            <pre>${JSON.stringify(log.details, null, 2)}</pre>
          ` : ''}

          <div class="footer">
            Registro inalterable generado automáticamente por el motor de auditoría del ERP.
          </div>
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
    const body = encodeURIComponent(`Registro oficial de auditoría:

• Fecha: ${new Date(log.created_at).toLocaleString('es-CO')}
• Usuario: ${log.user_name} (${log.user_role})
• Módulo: ${log.module}
• Acción: ${log.action}
• Descripción: ${log.description}

Enviado desde el ERP.`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="space-y-6 text-[#161616]">
      {/* Cabecera Wabi-Sabi */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-4">
        <div>
          <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">
            SEGURIDAD & AUDITORÍA
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight">
            Trazabilidad & Bitácora de Auditoría
          </h2>
          <p className="text-xs text-[#76746E] font-sans mt-0.5">
            Registro cronológico inalterable de operaciones, inicios de sesión y acciones ejecutadas por usuarios y agentes IA.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAuditLogs}
          disabled={loading}
          className="px-4 py-2 border border-[#E2DFD7] bg-white hover:bg-[#FAF8F5] text-xs font-mono font-bold text-[#161616] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          Refrescar Bitácora
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white border border-[#E2DFD7] p-3 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <form onSubmit={handleSearchSubmit} className="md:col-span-8 flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76746E] text-[16px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por usuario, acción, descripción o IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] pl-9 pr-3 py-2 text-xs font-mono text-[#161616] focus:border-[#161616] focus:bg-white outline-none rounded-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] border border-[#161616] hover:border-[#D9381E] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Buscar
            </button>
          </form>

          <div className="md:col-span-4">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs font-mono text-[#161616] focus:border-[#161616] focus:bg-white outline-none rounded-none cursor-pointer transition-colors"
            >
              <option value="all">Todos los Módulos</option>
              <option value="Facturación">Facturación POS</option>
              <option value="Inventario">Inventario & Stock</option>
              <option value="Cartera">Cartera & Cobros</option>
              <option value="CRM">CRM & Clientes</option>
              <option value="Optometría">Optometría & RX</option>
              <option value="Citas">Agenda de Citas</option>
              <option value="Domicilios">Domicilios & Envíos</option>
              <option value="IA & WhatsApp">IA & WhatsApp</option>
              <option value="Seguridad">Seguridad & Usuarios</option>
              <option value="Configuración">Configuración Sede</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="bg-white border border-[#E2DFD7] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-[#76746E] space-y-2">
            <span className="material-symbols-outlined animate-spin text-3xl text-[#161616]">sync</span>
            <p className="text-xs font-mono uppercase tracking-wider">Consultando eventos de auditoría...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-[#76746E] space-y-2">
            <span className="material-symbols-outlined text-4xl text-[#76746E]">policy</span>
            <p className="text-sm font-serif text-[#161616]">No se encontraron eventos en la bitácora</p>
            <p className="text-xs font-mono text-[#76746E]">Prueba modificando los términos de búsqueda o el filtro de módulo.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">
                  <th className="py-2.5 px-3">FECHA / HORA</th>
                  <th className="py-2.5 px-3">USUARIO / ROL</th>
                  <th className="py-2.5 px-3">MÓDULO</th>
                  <th className="py-2.5 px-3">ACCIÓN</th>
                  <th className="py-2.5 px-3">DESCRIPCIÓN DE EVENTO</th>
                  <th className="py-2.5 px-3 text-right">DETALLE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD7] text-xs">
                {logs.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString('es-CO', {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-[#76746E]">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-[#76746E]">schedule</span>
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="truncate max-w-[160px]">
                          <p className="font-bold text-xs text-[#161616] truncate">{log.user_name}</p>
                          <span className="text-[9px] text-[#76746E] uppercase font-mono block truncate">{log.user_role}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getModuleBadge(log.module)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs font-bold text-[#161616]">
                        {log.action}
                      </td>

                      <td className="py-2.5 px-3 text-xs text-[#161616]">
                        <p className="truncate max-w-[320px] font-sans" title={log.description}>
                          {log.description}
                        </p>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 bg-white hover:bg-[#161616] text-[#161616] hover:text-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ml-auto"
                          title="Ver detalle completo"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          Ver
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

      {/* Modal de Detalle Wabi-Sabi */}
      {selectedLog && createPortal(
        <div 
          className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 text-left"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-xl w-full rounded-none overflow-hidden p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-5">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">
                  REGISTRO DE AUDITORÍA #{selectedLog.id.substring(0, 8)}
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#161616]">
                  Detalle del Evento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {/* Cuerpo del Modal */}
            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3 bg-white p-3.5 border border-[#E2DFD7]">
                <div>
                  <p className="text-[9px] text-[#76746E] font-bold uppercase font-mono tracking-wider">Fecha y Hora</p>
                  <p className="text-[#161616] font-mono font-bold text-xs mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString('es-CO')}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-[#76746E] font-bold uppercase font-mono tracking-wider">Módulo ERP</p>
                  <div className="mt-0.5">{getModuleBadge(selectedLog.module)}</div>
                </div>
                <div>
                  <p className="text-[9px] text-[#76746E] font-bold uppercase font-mono tracking-wider">Usuario Responsable</p>
                  <p className="text-[#161616] font-bold text-xs mt-0.5">{selectedLog.user_name} ({selectedLog.user_role})</p>
                </div>
                <div>
                  <p className="text-[9px] text-[#76746E] font-bold uppercase font-mono tracking-wider">Dirección IP</p>
                  <p className="text-[#161616] font-mono text-xs mt-0.5">{selectedLog.ip_address || 'No registrada'}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[#76746E] font-bold uppercase font-mono tracking-wider mb-1">Acción Realizada:</p>
                <div className="text-[#161616] font-mono font-bold bg-[#FAF8F5] p-2.5 border border-[#E2DFD7] text-xs">
                  {selectedLog.action}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-[#76746E] font-bold uppercase font-mono tracking-wider mb-1">Descripción Completa del Evento:</p>
                <div className="text-[#161616] bg-[#FAF8F5] p-3 border border-[#E2DFD7] text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedLog.description}
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-[10px] text-[#76746E] font-bold uppercase font-mono tracking-wider mb-1">Detalles Adicionales (Payload JSON):</p>
                  <pre className="bg-white p-3 border border-[#E2DFD7] text-[11px] text-[#161616] font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Acciones Inferiores del Modal */}
            <div className="pt-4 mt-5 border-t border-[#E2DFD7] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLogDetails(selectedLog)}
                  className={`px-3 py-1.5 text-xs font-mono font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    copiedSuccess
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white border-[#E2DFD7] text-[#161616] hover:bg-[#FAF8F5]'
                  }`}
                  title="Copiar resumen al portapapeles"
                >
                  <span className="material-symbols-outlined text-[15px]">{copiedSuccess ? 'check' : 'content_copy'}</span>
                  {copiedSuccess ? '¡Copiado!' : 'Copiar'}
                </button>

                <button
                  type="button"
                  onClick={() => handlePrintLogDetails(selectedLog)}
                  className="px-3 py-1.5 bg-white border border-[#E2DFD7] hover:bg-[#FAF8F5] text-[#161616] text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Imprimir comprobante oficial"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  Imprimir
                </button>

                <button
                  type="button"
                  onClick={() => handleShareEmailLog(selectedLog)}
                  className="px-3 py-1.5 bg-white border border-[#E2DFD7] hover:bg-[#FAF8F5] text-[#161616] text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Enviar por correo"
                >
                  <span className="material-symbols-outlined text-[15px]">mail</span>
                  Compartir Email
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer"
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
