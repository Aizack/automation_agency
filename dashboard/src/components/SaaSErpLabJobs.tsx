import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface LabJobsProps {
  clientId: string;
}

export const SaaSErpLabJobs: React.FC<LabJobsProps> = ({ clientId: rawClientId }) => {
  const clientId = (rawClientId && rawClientId !== 'undefined')
    ? rawClientId
    : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');

  const [labJobs, setLabJobs] = useState<any[]>([]);
  const [loadingLabJobs, setLoadingLabJobs] = useState(false);
  const [laboratories, setLaboratories] = useState<any[]>([]);

  // Asignación de laboratorio
  const [assigningJob, setAssigningJob] = useState<any | null>(null);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [assignJobValue, setAssignJobValue] = useState('');
  const [assignJobNotes, setAssignJobNotes] = useState('');

  // Estado para modal de impresión (individual o en bloque)
  const [printJobs, setPrintJobs] = useState<{ title: string; jobs: any[] } | null>(null);

  const token = localStorage.getItem('auth_token');

  const fetchLabJobs = async () => {
    setLoadingLabJobs(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/lab-jobs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setLabJobs(json.labJobs || []);
      }
    } catch (err) {
      console.error("Error fetching lab jobs:", err);
    } finally {
      setLoadingLabJobs(false);
    }
  };

  const fetchLaboratories = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setLaboratories((json.suppliers || []).filter((s: any) => s.is_laboratory));
      }
    } catch (err) {
      console.error("Error fetching laboratories:", err);
    }
  };

  useEffect(() => {
    fetchLabJobs();
    fetchLaboratories();
  }, [clientId]);

  const handleUpdateLabJob = async (jobId: string, payload: any) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/lab-jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        fetchLabJobs();
        setAssigningJob(null);
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (err) {
      alert('Error de conexión al actualizar el trabajo de laboratorio.');
    }
  };

  const triggerPrintWindow = () => {
    window.print();
  };

  const renderLabJobColumn = (title: string, list: any[], colStatus: string) => {
    return (
      <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-3.5 flex flex-col space-y-3 min-h-[520px] rounded-none">
        <div className="flex justify-between items-center pb-2 border-b border-[#E2DFD7]">
          <div className="flex items-center gap-1.5">
            <h4 className="font-serif text-xs text-[#161616] uppercase font-bold tracking-wider">
              {title}
            </h4>
            <span className="text-[10px] bg-white border border-[#E2DFD7] px-1.5 py-0.5 text-[#161616] font-mono font-bold">
              {list.length}
            </span>
          </div>

          {list.length > 0 && (
            <button
              type="button"
              onClick={() => setPrintJobs({ title: `Impresión en Bloque - ${title}`, jobs: list })}
              title="Imprimir todas las órdenes de esta columna"
              className="px-2 py-1 bg-white hover:bg-[#161616] text-[#161616] hover:text-white border border-[#E2DFD7] text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 rounded-none shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">print</span>
              <span>Imprimir</span>
            </button>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[540px] pr-1 custom-scrollbar">
          {list.length === 0 ? (
            <p className="text-[10px] text-[#6B6862] italic py-8 text-center font-sans">
              Sin trabajos en este estado
            </p>
          ) : (
            list.map(job => (
              <div 
                key={job.id} 
                className="bg-white p-3.5 border border-[#E2DFD7] hover:border-[#161616] transition-all space-y-2.5 text-xs rounded-none shadow-xs relative group"
              >
                {/* Header de la tarjeta */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h5 className="font-bold text-[#161616] leading-tight text-xs">
                      {job.customer_name} {job.customer_last_name || ''}
                    </h5>
                    <p className="text-[10px] text-[#6B6862] font-mono mt-0.5">
                      {job.customer_phone ? `📞 +${job.customer_phone}` : 'Sin teléfono'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintJobs({ title: `Orden #${job.invoice_id || 'SN'} - ${job.customer_name}`, jobs: [job] })}
                    title="Imprimir ticket para laboratorio"
                    className="p-1 bg-[#FAF8F5] hover:bg-[#161616] text-[#6B6862] hover:text-white border border-[#E2DFD7] transition cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">print</span>
                  </button>
                </div>

                {/* Detalles de Montura y Lente */}
                <div className="p-2 bg-[#FAF8F5] border border-[#E2DFD7] space-y-1 font-mono text-[10px] text-[#161616] leading-tight">
                  {job.frame_name && (
                    <p className="text-[#D9381E] font-bold border-b border-[#E2DFD7] pb-1 mb-1 font-sans">
                      👓 Montura: <span className="text-[#161616]">{job.frame_name}</span>
                    </p>
                  )}
                  <p>Lente: <strong className="text-[#161616] font-sans font-bold">{job.product_name}</strong></p>
                  {job.lens_design && <p className="text-[#6B6862]">Uso: <span className="text-[#161616] font-bold">{job.lens_design}</span></p>}
                  {job.lens_material && <p className="text-[#6B6862]">Mat: <span className="text-[#161616] font-bold">{job.lens_material}</span></p>}
                  {job.lens_treatment && <p className="text-[#6B6862]">Trat: <span className="text-[#161616] font-bold">{job.lens_treatment}</span></p>}
                </div>

                {/* Fórmula Óptica del Paciente */}
                {(job.od_sphere || job.oi_sphere || job.od_cylinder || job.oi_cylinder) ? (
                  <div className="border border-[#E2DFD7] bg-[#FAF8F5] p-2 space-y-1">
                    <div className="text-[9px] font-bold text-[#D9381E] uppercase tracking-wider border-b border-[#E2DFD7] pb-0.5">
                      Fórmula Óptica
                    </div>
                    <table className="w-full text-[9px] font-mono text-center border-collapse">
                      <thead>
                        <tr className="text-[#6B6862] border-b border-[#E2DFD7]">
                          <th className="py-0.5 text-left font-normal">OJO</th>
                          <th className="py-0.5 font-normal">ESF</th>
                          <th className="py-0.5 font-normal">CIL</th>
                          <th className="py-0.5 font-normal">EJE</th>
                          <th className="py-0.5 font-normal">ADD</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#E2DFD7]/50">
                          <td className="py-0.5 font-bold text-[#D9381E] text-left">OD</td>
                          <td className="py-0.5">{job.od_sphere || '0.00'}</td>
                          <td className="py-0.5">{job.od_cylinder || '0.00'}</td>
                          <td className="py-0.5">{job.od_axis ? `${job.od_axis}°` : '-'}</td>
                          <td className="py-0.5">{job.od_addition || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-0.5 font-bold text-[#D9381E] text-left">OI</td>
                          <td className="py-0.5">{job.oi_sphere || '0.00'}</td>
                          <td className="py-0.5">{job.oi_cylinder || '0.00'}</td>
                          <td className="py-0.5">{job.oi_axis ? `${job.oi_axis}°` : '-'}</td>
                          <td className="py-0.5">{job.oi_addition || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                    {(job.dp_distance || job.height) && (
                      <div className="flex justify-between text-[9px] font-mono text-[#6B6862] border-t border-[#E2DFD7] pt-1 mt-1">
                        <span>DP: <strong className="text-[#161616]">{job.dp_distance || '-'} mm</strong></span>
                        <span>ALT: <strong className="text-[#161616]">{job.height || '-'} mm</strong></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-1.5 bg-[#FAF8F5] border border-dashed border-[#E2DFD7] text-[9px] text-[#6B6862] italic text-center">
                    Sin fórmula guardada en sistema
                  </div>
                )}

                {/* Proveedor y Valor */}
                {job.supplier_name && (
                  <div className="text-[10px] text-[#6B6862] border-t border-[#E2DFD7] pt-1.5 space-y-0.5">
                    <p>Lab: <strong className="text-[#161616]">{job.supplier_name}</strong></p>
                    <p>Costo: <strong className="text-[#D9381E] font-mono">${Number(job.job_value || 0).toLocaleString('es-CO')} COP</strong></p>
                  </div>
                )}

                {/* Observaciones / Indicaciones */}
                {job.notes && (
                  <p className="text-[10px] text-[#6B6862] italic bg-[#FAF8F5] border border-[#E2DFD7] p-2 leading-tight">
                    "Indicaciones: {job.notes}"
                  </p>
                )}

                {/* Acciones de Flujo */}
                <div className="pt-1">
                  {colStatus === 'pending' && (
                    <button 
                      type="button"
                      onClick={() => {
                        setAssigningJob(job);
                        setSelectedLabId('');
                        setAssignJobValue('');
                        setAssignJobNotes(job.notes || '');
                      }}
                      className="w-full py-2 bg-[#161616] hover:bg-[#D9381E] text-white font-bold text-[10px] uppercase tracking-wider rounded-none border-0 transition cursor-pointer shadow-xs"
                    >
                      Asignar Taller
                    </button>
                  )}

                  {colStatus === 'assigned' && (
                    <button 
                      type="button"
                      onClick={() => handleUpdateLabJob(job.id, { status: 'sent' })}
                      className="w-full py-2 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] hover:border-[#161616] font-bold text-[10px] uppercase tracking-wider rounded-none transition cursor-pointer"
                    >
                      Enviar a Laboratorio →
                    </button>
                  )}

                  {colStatus === 'sent' && (
                    <button 
                      type="button"
                      onClick={() => handleUpdateLabJob(job.id, { status: 'received' })}
                      className="w-full py-2 bg-[#E6F4EA] hover:bg-[#c9ebd0] text-[#1E4620] border border-[#A8DADC] font-bold text-[10px] uppercase tracking-wider rounded-none transition cursor-pointer"
                    >
                      ✓ Recibido en Tienda
                    </button>
                  )}

                  {colStatus === 'received' && (
                    <button 
                      type="button"
                      onClick={() => handleUpdateLabJob(job.id, { status: 'delivered' })}
                      className="w-full py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-[10px] uppercase tracking-wider rounded-none border-0 transition cursor-pointer shadow-xs"
                    >
                      ✓ Entregar a Paciente
                    </button>
                  )}

                  {colStatus === 'delivered' && (
                    <div className="w-full py-1.5 bg-[#E6F4EA] text-[#1E4620] border border-[#A8DADC] font-bold text-[10px] uppercase tracking-wider text-center select-none">
                      ✓ Entregado al Cliente
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loadingLabJobs) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pending = labJobs.filter(j => j.status === 'pending');
  const assigned = labJobs.filter(j => j.status === 'assigned');
  const sent = labJobs.filter(j => j.status === 'sent');
  const received = labJobs.filter(j => j.status === 'received');
  const delivered = labJobs.filter(j => j.status === 'delivered');

  return (
    <div className="space-y-6 text-[#161616] font-sans">
      {/* Header Editorial Wabi-Sabi */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5 mb-8">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-sans block mb-1">
            TALLER ÓPTICO & LABORATORIO
          </span>
          <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#161616] tracking-tight leading-none">
            Trabajos de Laboratorio & Taller
          </h2>
          <p className="text-xs text-[#6B6862] mt-2 font-sans">
            Seguimiento logístico, asignación de laboratorios e impresión de fichas técnicas para corte y biselado.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLabJobs}
          className="bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] text-[11px] font-bold py-2.5 px-3.5 flex items-center gap-1.5 transition cursor-pointer uppercase tracking-wider rounded-none shrink-0 shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px] text-[#D9381E]">refresh</span>
          Actualizar Estado
        </button>
      </div>

      {/* Tablero Kanban Wabi-Sabi */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {renderLabJobColumn("Por Asignar", pending, "pending")}
        {renderLabJobColumn("Laboratorio Asignado", assigned, "assigned")}
        {renderLabJobColumn("En Laboratorio", sent, "sent")}
        {renderLabJobColumn("Recibidos en Tienda", received, "received")}
        {renderLabJobColumn("Entregados", delivered, "delivered")}
      </div>

      {/* Modal Wabi-Sabi de Asignación de Taller */}
      {assigningJob && createPortal(
        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4 text-left">
          <div className="bg-[#F6F4EE] border border-[#161616] p-6 sm:p-8 rounded-none w-full max-w-lg shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar my-auto animate-fade-in">
            
            <div className="flex justify-between items-start border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-widest block">
                  ASIGNACIÓN DE LABORATORIO / TALLER
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#161616] mt-0.5">
                  {assigningJob.customer_name} {assigningJob.customer_last_name || ''}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssigningJob(null)}
                className="text-[#161616] hover:text-[#D9381E] text-2xl font-light cursor-pointer border-0 bg-transparent leading-none"
              >
                &times;
              </button>
            </div>

            {/* Resumen Ficha de Laboratorio en la asignación */}
            <div className="bg-white border border-[#E2DFD7] p-3 space-y-3">
              <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2">
                <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-wider">Detalles de la Orden</span>
                {assigningJob.frame_name && (
                  <span className="text-[10px] font-mono text-[#161616] bg-[#FAF8F5] px-2 py-0.5 border border-[#E2DFD7]">
                    👓 Montura: <strong>{assigningJob.frame_name}</strong>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#161616]">
                <p><span className="text-[#6B6862]">Lente:</span> <strong>{assigningJob.product_name}</strong></p>
                <p><span className="text-[#6B6862]">Uso:</span> <strong>{assigningJob.lens_design || 'N/A'}</strong></p>
                <p><span className="text-[#6B6862]">Material:</span> <strong>{assigningJob.lens_material || 'N/A'}</strong></p>
                <p><span className="text-[#6B6862]">Tratamiento:</span> <strong>{assigningJob.lens_treatment || 'N/A'}</strong></p>
              </div>

              {/* Fórmula en Modal de Asignación */}
              {(assigningJob.od_sphere || assigningJob.oi_sphere || assigningJob.od_cylinder || assigningJob.oi_cylinder) ? (
                <div className="border border-[#E2DFD7] bg-[#FAF8F5] p-2 space-y-1">
                  <div className="text-[9px] font-bold text-[#161616] uppercase tracking-wider">
                    Fórmula Óptica Registrada
                  </div>
                  <table className="w-full text-[10px] font-mono text-center border-collapse">
                    <thead>
                      <tr className="text-[#6B6862] border-b border-[#E2DFD7]">
                        <th className="py-1 text-left">OJO</th>
                        <th className="py-1">ESFERA</th>
                        <th className="py-1">CILINDRO</th>
                        <th className="py-1">EJE</th>
                        <th className="py-1">ADICIÓN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#E2DFD7]/50">
                        <td className="py-1 font-bold text-[#D9381E] text-left">OD</td>
                        <td className="py-1">{assigningJob.od_sphere || '0.00'}</td>
                        <td className="py-1">{assigningJob.od_cylinder || '0.00'}</td>
                        <td className="py-1">{assigningJob.od_axis ? `${assigningJob.od_axis}°` : '-'}</td>
                        <td className="py-1">{assigningJob.od_addition || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-1 font-bold text-[#D9381E] text-left">OI</td>
                        <td className="py-1">{assigningJob.oi_sphere || '0.00'}</td>
                        <td className="py-1">{assigningJob.oi_cylinder || '0.00'}</td>
                        <td className="py-1">{assigningJob.oi_axis ? `${assigningJob.oi_axis}°` : '-'}</td>
                        <td className="py-1">{assigningJob.oi_addition || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                  {(assigningJob.dp_distance || assigningJob.height) && (
                    <div className="flex justify-between text-[9px] font-mono text-[#6B6862] border-t border-[#E2DFD7] pt-1">
                      <span>Distancia Pupilar (DP): <strong className="text-[#161616]">{assigningJob.dp_distance || '-'} mm</strong></span>
                      <span>Altura (ALT): <strong className="text-[#161616]">{assigningJob.height || '-'} mm</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[10px] text-[#6B6862] italic bg-[#FAF8F5] p-2 border border-dashed border-[#E2DFD7] text-center">
                  Sin fórmula médica registrada previamente para este cliente.
                </p>
              )}
            </div>
            
            {/* Formulario de Asignación */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Laboratorio / Taller *</label>
                <select 
                  value={selectedLabId} 
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-semibold outline-none focus:border-[#161616] cursor-pointer rounded-none font-sans"
                >
                  <option value="">Selecciona un Laboratorio...</option>
                  {laboratories.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Costo Interno Laboratorio ($ COP) *</label>
                <input 
                  type="number" 
                  value={assignJobValue} 
                  onChange={(e) => setAssignJobValue(e.target.value)}
                  placeholder="Ej: 45000"
                  className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-mono font-bold outline-none focus:border-[#161616] rounded-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Indicaciones Especiales para el Laboratorio</label>
                <textarea 
                  value={assignJobNotes} 
                  onChange={(e) => setAssignJobNotes(e.target.value)}
                  placeholder="Especificaciones de biselado, tratamientos especiales, tipo de ranurado o perforado..."
                  className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none h-24 resize-none font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
              <button 
                type="button"
                onClick={() => setAssigningJob(null)}
                className="px-4 py-2.5 bg-transparent border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-semibold uppercase tracking-wider rounded-none cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (!selectedLabId) {
                    alert('Selecciona un laboratorio.');
                    return;
                  }
                  handleUpdateLabJob(assigningJob.id, {
                    supplierId: selectedLabId,
                    jobValue: assignJobValue,
                    notes: assignJobNotes,
                    status: 'assigned'
                  });
                }}
                className="px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer border-0 shadow-sm transition"
              >
                Confirmar Asignación
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal / Vista de Impresión de Tickets de Laboratorio */}
      {printJobs && createPortal(
        <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-md z-[999999] flex items-center justify-center p-4">
          <div className="bg-white border border-[#161616] p-6 sm:p-8 rounded-none w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            
            {/* Header Modal (No imprimible) */}
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-4 print:hidden">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-widest">VISTA PREVIA DE IMPRESIÓN</span>
                <h3 className="font-serif text-2xl font-normal text-[#161616]">{printJobs.title}</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerPrintWindow}
                  className="px-4 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider rounded-none transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  Imprimir Ahora
                </button>
                <button
                  type="button"
                  onClick={() => setPrintJobs(null)}
                  className="px-3 py-2 bg-white border border-[#E2DFD7] text-[#161616] hover:border-[#161616] text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>

            {/* Documento Imprimible */}
            <div className="space-y-8 font-sans print:m-0 print:p-0">
              {printJobs.jobs.map((job, idx) => (
                <div 
                  key={job.id || idx}
                  className="border-2 border-[#161616] p-6 bg-white space-y-4 text-xs page-break-after-always"
                >
                  {/* Encabezado Ficha */}
                  <div className="flex justify-between items-start border-b-2 border-[#161616] pb-3">
                    <div>
                      <h4 className="font-serif text-xl font-bold uppercase tracking-wide text-[#161616]">ORDEN DE TRABAJO DE LABORATORIO</h4>
                      <p className="text-[11px] font-mono text-[#6B6862]">Documento oficial de laboratorio y biselado</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold bg-[#161616] text-white px-2 py-1 block">
                        ORDEN #{job.invoice_id || 'SIN NÚMERO'}
                      </span>
                      <span className="text-[10px] text-[#6B6862] block mt-1">
                        Fecha: {new Date(job.created_at || Date.now()).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  </div>

                  {/* Datos Paciente & Montura */}
                  <div className="grid grid-cols-2 gap-4 bg-[#FAF8F5] p-3 border border-[#E2DFD7]">
                    <div>
                      <span className="text-[9px] font-bold text-[#6B6862] uppercase tracking-wider block">DATOS DEL PACIENTE</span>
                      <p className="font-bold text-sm text-[#161616] mt-0.5">{job.customer_name} {job.customer_last_name || ''}</p>
                      <p className="text-[11px] text-[#6B6862] font-mono">Doc: {job.customer_doc || 'N/A'} | Tel: {job.customer_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-[#D9381E] uppercase tracking-wider block">MONTURA DE DESTINO</span>
                      <p className="font-bold text-sm text-[#161616] mt-0.5">{job.frame_name || 'MONTURA PROPIA DEL PACIENTE / POR ASIGNAR'}</p>
                      <p className="text-[11px] text-[#6B6862] font-mono">Taller: {job.supplier_name || 'Taller Pendiente'}</p>
                    </div>
                  </div>

                  {/* ESPECIFICACIONES DE LENTE */}
                  <div>
                    <span className="text-[10px] font-bold text-[#161616] uppercase tracking-wider block mb-1">ESPECIFICACIONES DEL LENTE</span>
                    <table className="w-full text-xs font-mono border border-[#161616] border-collapse">
                      <tbody>
                        <tr className="border-b border-[#161616]">
                          <td className="bg-[#FAF8F5] p-2 font-bold w-1/4 border-r border-[#161616]">Lente Solicitado:</td>
                          <td className="p-2 font-bold text-[#161616]">{job.product_name}</td>
                        </tr>
                        <tr className="border-b border-[#161616]">
                          <td className="bg-[#FAF8F5] p-2 font-bold border-r border-[#161616]">Tipo / Uso:</td>
                          <td className="p-2">{job.lens_design || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-[#161616]">
                          <td className="bg-[#FAF8F5] p-2 font-bold border-r border-[#161616]">Material:</td>
                          <td className="p-2">{job.lens_material || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="bg-[#FAF8F5] p-2 font-bold border-r border-[#161616]">Tratamiento / Filtro:</td>
                          <td className="p-2">{job.lens_treatment || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* FÓRMULA ÓPTICA */}
                  <div>
                    <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-wider block mb-1">FÓRMULA ÓPTICA DEL PACIENTE</span>
                    <table className="w-full text-xs font-mono text-center border-2 border-[#161616] border-collapse">
                      <thead>
                        <tr className="bg-[#161616] text-white">
                          <th className="py-1.5 px-2 text-left">OJO</th>
                          <th className="py-1.5 px-2">ESFERA</th>
                          <th className="py-1.5 px-2">CILINDRO</th>
                          <th className="py-1.5 px-2">EJE</th>
                          <th className="py-1.5 px-2">ADICIÓN</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#161616]">
                          <td className="py-2 px-2 font-bold text-[#D9381E] text-left bg-[#FAF8F5]">OJO DERECHO (OD)</td>
                          <td className="py-2 px-2 font-bold">{job.od_sphere || '0.00'}</td>
                          <td className="py-2 px-2 font-bold">{job.od_cylinder || '0.00'}</td>
                          <td className="py-2 px-2 font-bold">{job.od_axis ? `${job.od_axis}°` : '-'}</td>
                          <td className="py-2 px-2 font-bold">{job.od_addition || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-bold text-[#D9381E] text-left bg-[#FAF8F5]">OJO IZQUIERDO (OI)</td>
                          <td className="py-2 px-2 font-bold">{job.oi_sphere || '0.00'}</td>
                          <td className="py-2 px-2 font-bold">{job.oi_cylinder || '0.00'}</td>
                          <td className="py-2 px-2 font-bold">{job.oi_axis ? `${job.oi_axis}°` : '-'}</td>
                          <td className="py-2 px-2 font-bold">{job.oi_addition || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="grid grid-cols-2 gap-4 border border-t-0 border-[#161616] bg-[#FAF8F5] p-2 text-xs font-mono">
                      <div>Distancia Pupilar (DP): <strong>{job.dp_distance ? `${job.dp_distance} mm` : 'No especificada'}</strong></div>
                      <div>Altura de Montaje (ALT): <strong>{job.height ? `${job.height} mm` : 'No especificada'}</strong></div>
                    </div>
                  </div>

                  {/* INDICACIONES */}
                  <div className="border border-[#161616] p-3 space-y-1">
                    <span className="text-[10px] font-bold text-[#161616] uppercase tracking-wider block">INDICACIONES Y OBSERVACIONES DE BISELADO</span>
                    <p className="text-xs font-mono text-[#161616]">
                      {job.notes || 'Sin especificaciones técnicas adicionales.'}
                    </p>
                  </div>

                  {/* PIE DE FICHA / REGISTRO */}
                  <div className="flex justify-between items-end border-t border-dashed border-[#161616] pt-4 font-mono text-[10px] text-[#6B6862]">
                    <div>
                      <p>Firma / Control Calidad Tienda: ___________________________</p>
                    </div>
                    <div>
                      <p>Recibido Taller Laboratorio: ___________________________</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

