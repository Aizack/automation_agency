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

  const renderLabJobColumn = (title: string, list: any[], colStatus: string) => {
    return (
      <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 flex flex-col space-y-3 min-h-[520px] rounded-none">
        <div className="flex justify-between items-center pb-2 border-b border-[#E2DFD7]">
          <h4 className="font-serif text-xs text-[#161616] flex items-center gap-1.5 uppercase font-bold tracking-wider">
            {title}
          </h4>
          <span className="text-[10px] bg-white border border-[#E2DFD7] px-2 py-0.5 text-[#161616] font-mono font-bold">
            {list.length}
          </span>
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
                className="bg-white p-4 border border-[#E2DFD7] hover:border-[#161616] transition-all space-y-3 text-xs rounded-none shadow-xs"
              >
                <div>
                  <h5 className="font-bold text-[#161616] leading-tight text-xs">
                    {job.customer_name} {job.customer_last_name || ''}
                  </h5>
                  <p className="text-[10px] text-[#6B6862] font-mono mt-0.5">
                    {job.customer_phone ? `+${job.customer_phone}` : 'Sin teléfono'}
                  </p>
                </div>

                <div className="p-2.5 bg-[#FAF8F5] border border-[#E2DFD7] space-y-1 font-mono text-[10px] text-[#161616] leading-tight">
                  <p>Lente: <strong className="text-[#161616] font-sans font-bold">{job.product_name}</strong></p>
                  {job.lens_design && <p className="text-[#6B6862]">Diseño: <span className="text-[#161616] font-bold">{job.lens_design}</span></p>}
                  {job.lens_material && <p className="text-[#6B6862]">Mat: <span className="text-[#161616] font-bold">{job.lens_material}</span></p>}
                  {job.lens_treatment && <p className="text-[#6B6862]">Trat: <span className="text-[#161616] font-bold">{job.lens_treatment}</span></p>}
                </div>

                {(job.od_sphere || job.oi_sphere) && (
                  <div className="text-[10px] text-[#161616] border-t border-[#E2DFD7] pt-2 grid grid-cols-2 gap-2 font-mono leading-tight bg-white">
                    <div className="bg-[#FAF8F5] p-1.5 border border-[#E2DFD7]">
                      <span className="text-[9px] font-bold text-[#D9381E] block">OD:</span>
                      {job.od_sphere || '0.00'} | {job.od_cylinder || '0.00'} | {job.od_axis || '0'}°
                    </div>
                    <div className="bg-[#FAF8F5] p-1.5 border border-[#E2DFD7]">
                      <span className="text-[9px] font-bold text-[#D9381E] block">OI:</span>
                      {job.oi_sphere || '0.00'} | {job.oi_cylinder || '0.00'} | {job.oi_axis || '0'}°
                    </div>
                  </div>
                )}

                {job.supplier_name && (
                  <div className="text-[10px] text-[#6B6862] border-t border-[#E2DFD7] pt-2 space-y-0.5">
                    <p>Lab: <strong className="text-[#161616]">{job.supplier_name}</strong></p>
                    <p>Costo: <strong className="text-[#D9381E] font-mono">${Number(job.job_value || 0).toLocaleString('es-CO')} COP</strong></p>
                  </div>
                )}

                {job.notes && (
                  <p className="text-[10px] text-[#6B6862] italic bg-[#FAF8F5] border border-[#E2DFD7] p-2">
                    "{job.notes}"
                  </p>
                )}

                <div className="pt-1">
                  {colStatus === 'pending' && (
                    <button 
                      type="button"
                      onClick={() => {
                        setAssigningJob(job);
                        setSelectedLabId('');
                        setAssignJobValue('');
                        setAssignJobNotes('');
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
            Seguimiento logístico y control de estados de lentes, biselado y montajes enviados a talleres externos.
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
          <div className="bg-[#F6F4EE] border border-[#161616] p-6 sm:p-8 rounded-none w-full max-w-md shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto animate-fade-in">
            
            <div className="flex justify-between items-start border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-widest block">
                  ASIGNACIÓN DE LABORATORIO
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#161616] mt-0.5">
                  Asignar Taller a Orden
                </h3>
                <p className="text-xs text-[#6B6862] font-mono mt-1">
                  Lente: {assigningJob.product_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningJob(null)}
                className="text-[#161616] hover:text-[#D9381E] text-2xl font-light cursor-pointer border-0 bg-transparent leading-none"
              >
                &times;
              </button>
            </div>
            
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
                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Costo Interno ($ COP) *</label>
                <input 
                  type="number" 
                  value={assignJobValue} 
                  onChange={(e) => setAssignJobValue(e.target.value)}
                  placeholder="Ej: 45000"
                  className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-mono font-bold outline-none focus:border-[#161616] rounded-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Indicaciones / Observaciones</label>
                <textarea 
                  value={assignJobNotes} 
                  onChange={(e) => setAssignJobNotes(e.target.value)}
                  placeholder="Biselado especial, tratamientos, especificaciones..."
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
    </div>
  );
};
