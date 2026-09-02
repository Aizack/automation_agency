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
      <div className="bg-surface-container/15 border border-outline/5 rounded-2xl p-4 flex flex-col space-y-3 min-h-[450px]">
        <div className="flex justify-between items-center pb-2 border-b border-outline/5">
          <h4 className="font-bold text-xs text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
            {title}
            <span className="text-[10px] bg-surface-container-highest px-2 py-0.5 rounded-full text-on-surface-variant font-mono">{list.length}</span>
          </h4>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
          {list.length === 0 ? (
            <p className="text-[10px] text-on-surface-variant/40 italic py-6 text-center">Sin trabajos en este estado</p>
          ) : (
            list.map(job => (
              <div key={job.id} className="glass-card p-3.5 rounded-xl border border-outline/5 hover:border-primary/10 transition-all space-y-2 text-xs">
                <div>
                  <h5 className="font-bold text-on-surface leading-tight text-xs">{job.customer_name} {job.customer_last_name || ''}</h5>
                  <p className="text-[9px] text-on-surface-variant opacity-75">{job.customer_phone}</p>
                </div>

                <div className="p-2 bg-surface-container/30 rounded-lg space-y-1 font-mono text-[9px] text-on-surface-variant leading-tight">
                  <p>Lente: <strong>{job.product_name}</strong></p>
                  {job.lens_design && <p>Diseño: <strong>{job.lens_design}</strong></p>}
                  {job.lens_material && <p>Mat: <strong>{job.lens_material}</strong></p>}
                  {job.lens_treatment && <p>Trat: <strong>{job.lens_treatment}</strong></p>}
                </div>

                {job.od_sphere && (
                  <div className="text-[9px] text-on-surface-variant border-t border-outline/5 pt-1.5 grid grid-cols-2 gap-1 font-mono leading-tight">
                    <div>OD: {job.od_sphere}|{job.od_cylinder}|{job.od_axis}</div>
                    <div>OI: {job.oi_sphere}|{job.oi_cylinder}|{job.oi_axis}</div>
                  </div>
                )}

                {job.supplier_name && (
                  <div className="text-[9px] text-on-surface-variant border-t border-outline/5 pt-1.5 space-y-0.5">
                    <p>Lab: <strong>{job.supplier_name}</strong></p>
                    <p>Costo: <strong>${Number(job.job_value || 0).toLocaleString('es-CO')}</strong></p>
                  </div>
                )}

                {job.notes && (
                  <p className="text-[9px] text-on-surface-variant/70 italic bg-surface-container/20 p-1.5 rounded">
                    "{job.notes}"
                  </p>
                )}

                <div className="flex flex-col gap-1.5 pt-1">
                  {colStatus === 'pending' && (
                    <button 
                      onClick={() => {
                        setAssigningJob(job);
                        setSelectedLabId('');
                        setAssignJobValue('');
                        setAssignJobNotes('');
                      }}
                      className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[9px] uppercase tracking-wider rounded-lg border-0 transition cursor-pointer"
                    >
                      Asignar Taller
                    </button>
                  )}

                  {colStatus === 'assigned' && (
                    <button 
                      onClick={() => handleUpdateLabJob(job.id, { status: 'sent' })}
                      className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold text-[9px] uppercase tracking-wider rounded-lg border-0 transition cursor-pointer"
                    >
                      Enviar a Laboratorio
                    </button>
                  )}

                  {colStatus === 'sent' && (
                    <button 
                      onClick={() => handleUpdateLabJob(job.id, { status: 'received' })}
                      className="w-full py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-bold text-[9px] uppercase tracking-wider rounded-lg border-0 transition cursor-pointer"
                    >
                      ✓ Recibido en Óptica
                    </button>
                  )}

                  {colStatus === 'received' && (
                    <button 
                      onClick={() => handleUpdateLabJob(job.id, { status: 'delivered' })}
                      className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 font-bold text-[9px] uppercase tracking-wider rounded-lg border-0 transition cursor-pointer"
                    >
                      ✓ Entregado a Paciente
                    </button>
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pending = labJobs.filter(j => j.status === 'pending');
  const assigned = labJobs.filter(j => j.status === 'assigned');
  const sent = labJobs.filter(j => j.status === 'sent');
  const received = labJobs.filter(j => j.status === 'received');
  const delivered = labJobs.filter(j => j.status === 'delivered');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline/10 pb-3">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Trabajos de laboratorio & Taller</h3>
          <p className="text-on-surface-variant text-body-md opacity-70">Seguimiento logístico de órdenes enviadas a laboratorios y biselado.</p>
        </div>
        <button
          onClick={fetchLabJobs}
          className="px-3 py-1.5 rounded-xl border border-outline/20 bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Actualizar Estado
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {renderLabJobColumn("Por Asignar", pending, "pending")}
        {renderLabJobColumn("Laboratorio Asignado", assigned, "assigned")}
        {renderLabJobColumn("En Laboratorio", sent, "sent")}
        {renderLabJobColumn("Recibidos en Tienda", received, "received")}
        {renderLabJobColumn("Entregados", delivered, "delivered")}
      </div>

      {assigningJob && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 text-left">
          <div className="bg-[#141517] border border-[#2d3036] p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
            <h3 className="font-bold text-sm text-on-surface">Asignar Laboratorio a Orden</h3>
            <p className="text-xs text-on-surface-variant font-mono">Lente: {assigningJob.product_name}</p>
            
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Laboratorio / Taller *</label>
                <select 
                  value={selectedLabId} 
                  onChange={(e) => setSelectedLabId(e.target.value)}
                  className="w-full bg-[#181a1c] border border-[#2d3036] rounded-xl p-2.5 text-xs text-on-surface outline-none cursor-pointer"
                >
                  <option value="">Selecciona un Laboratorio...</option>
                  {laboratories.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Costo Interno ($ COP) *</label>
                <input 
                  type="number" 
                  value={assignJobValue} 
                  onChange={(e) => setAssignJobValue(e.target.value)}
                  placeholder="Ej: 45000"
                  className="w-full bg-[#181a1c] border border-[#2d3036] rounded-xl p-2.5 text-xs text-on-surface outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-on-surface-variant font-medium">Indicaciones / Observaciones</label>
                <textarea 
                  value={assignJobNotes} 
                  onChange={(e) => setAssignJobNotes(e.target.value)}
                  placeholder="Biselado especial, filtros..."
                  className="w-full bg-[#181a1c] border border-[#2d3036] rounded-xl p-2.5 text-xs text-on-surface outline-none h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setAssigningJob(null)}
                className="px-4 py-2 border border-outline/20 text-on-surface rounded-xl hover:bg-surface-container text-xs cursor-pointer bg-transparent"
              >
                Cancelar
              </button>
              <button 
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
                className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold cursor-pointer border-0 hover:opacity-90 transition"
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

