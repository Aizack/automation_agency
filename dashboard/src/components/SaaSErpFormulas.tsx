import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface FormulasProps {
  clientId: string;
}

interface Customer {
  id: string;
  name: string;
  last_name: string;
  document_number: string;
  phone: string;
  email: string | null;
}

interface Formula {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_last_name: string;
  customer_document_number: string;
  customer_phone: string;
  od_sphere: string | null;
  od_cylinder: string | null;
  od_axis: string | null;
  od_addition: string | null;
  oi_sphere: string | null;
  oi_cylinder: string | null;
  oi_axis: string | null;
  oi_addition: string | null;
  dp_distance: string | null;
  height: string | null;
  notes: string | null;
  created_at: string;
}

export const SaaSErpFormulas: React.FC<FormulasProps> = ({ clientId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Subpestañas
  const [formulasSubTab, setFormulasSubTab] = useState<'formulas' | 'lab_jobs'>('formulas');
  const [labJobs, setLabJobs] = useState<any[]>([]);
  const [loadingLabJobs, setLoadingLabJobs] = useState(false);
  const [laboratories, setLaboratories] = useState<any[]>([]);
  
  // Asignación de laboratorios
  const [assigningJob, setAssigningJob] = useState<any | null>(null);
  const [selectedLabId, setSelectedLabId] = useState('');
  const [assignJobValue, setAssignJobValue] = useState('');
  const [assignJobNotes, setAssignJobNotes] = useState('');

  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Ophthalmic inputs
  const [odSphere, setOdSphere] = useState('');
  const [odCylinder, setOdCylinder] = useState('');
  const [odAxis, setOdAxis] = useState('');
  const [odAddition, setOdAddition] = useState('');
  
  const [oiSphere, setOiSphere] = useState('');
  const [oiCylinder, setOiCylinder] = useState('');
  const [oiAxis, setOiAxis] = useState('');
  const [oiAddition, setOiAddition] = useState('');
  
  const [dpDistance, setDpDistance] = useState('');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');

  const [formulasHistory, setFormulasHistory] = useState<Formula[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cargar lista de clientes para el buscador
  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/crm-customers`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.customers || []);
      }
    } catch (err) {
      console.error("Error cargando clientes del CRM:", err);
    }
  };

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
    fetchCustomers();
    fetchLaboratories();
    fetchLabJobs();
  }, [clientId]);

  // Cargar historial de fórmulas de un cliente seleccionado
  const fetchCustomerFormulas = async (custId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/formulas?customerId=${custId}`);
      const json = await res.json();
      if (json.success) {
        setFormulasHistory(json.formulas || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchCustomerFormulas(customer.id);
    setSearchQuery('');
  };

  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/formulas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          odSphere, odCylinder, odAxis, odAddition,
          oiSphere, oiCylinder, oiAxis, oiAddition,
          dpDistance, height, notes
        })
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        // Limpiar inputs
        setOdSphere(''); setOdCylinder(''); setOdAxis(''); setOdAddition('');
        setOiSphere(''); setOiCylinder(''); setOiAxis(''); setOiAddition('');
        setDpDistance(''); setHeight(''); setNotes('');
        // Recargar historial
        fetchCustomerFormulas(selectedCustomer.id);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        alert(json.error || 'Error al guardar la fórmula.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFormula = async (formulaId: string) => {
    if (!confirm('¿Deseas eliminar este registro de fórmula?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/formulas/${formulaId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        if (selectedCustomer) fetchCustomerFormulas(selectedCustomer.id);
      }
    } catch (err) {
      alert('Error al eliminar.');
    }
  };

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

  const getFilteredCustomers = () => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    return customers.filter(c => {
      const fullName = `${c.name} ${c.last_name || ''}`.toLowerCase();
      return fullName.includes(query) || 
             (c.document_number && c.document_number.includes(query)) ||
             (c.phone && c.phone.includes(query));
    });
  };

  const filtered = getFilteredCustomers();

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
                  <h5 className="font-bold text-on-surface leading-tight text-xs">{job.customer_name} {job.customer_last_name}</h5>
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

  const renderLabJobsTab = () => {
    if (loadingLabJobs) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    const pending = labJobs.filter(j => j.status === 'pending');
    const sent = labJobs.filter(j => j.status === 'sent');
    const received = labJobs.filter(j => j.status === 'received');
    const delivered = labJobs.filter(j => j.status === 'delivered');

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {renderLabJobColumn("Por Asignar", pending, "pending")}
          {renderLabJobColumn("En Laboratorio", sent, "sent")}
          {renderLabJobColumn("Recibidos en Tienda", received, "received")}
          {renderLabJobColumn("Entregados", delivered, "delivered")}
        </div>

        {assigningJob && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface border border-outline/10 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
              <h3 className="font-bold text-sm text-on-surface">Asignar Laboratorio a Orden</h3>
              <p className="text-xs text-on-surface-variant font-mono">Lente: {assigningJob.product_name}</p>
              
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-medium">Laboratorio / Taller *</label>
                  <select 
                    value={selectedLabId} 
                    onChange={(e) => setSelectedLabId(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none"
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
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-on-surface-variant font-medium">Indicaciones / Observaciones</label>
                  <textarea 
                    value={assignJobNotes} 
                    onChange={(e) => setAssignJobNotes(e.target.value)}
                    placeholder="Biselado especial, filtros..."
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none h-20 resize-none"
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
                      status: 'sent'
                    });
                  }}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold cursor-pointer border-0 hover:opacity-90 transition"
                >
                  Confirmar y Enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline/10 pb-4">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Historial de Fórmulas y Diagnóstico</h3>
          <p className="text-on-surface-variant text-body-md opacity-70">
            Registro clínico de refracción óptica y prescripción de lentes.
          </p>
        </div>
      </div>

      <div className="flex border-b border-outline/10 gap-6">
        <button
          onClick={() => setFormulasSubTab('formulas')}
          className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${
            formulasSubTab === 'formulas' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          Fórmulas y Diagnósticos
          {formulasSubTab === 'formulas' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => {
            setFormulasSubTab('lab_jobs');
            fetchLabJobs();
          }}
          className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${
            formulasSubTab === 'lab_jobs' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          Trabajos de Laboratorio
          {formulasSubTab === 'lab_jobs' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
          )}
        </button>
      </div>

      {formulasSubTab === 'lab_jobs' ? (
        renderLabJobsTab()
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Selector de Cliente */}
          <div className="lg:col-span-1 glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
            <div className="space-y-1.5 relative" ref={dropdownRef}>
              <label className="font-bold text-xs uppercase tracking-wider text-on-surface-variant ml-1">Buscar Paciente en CRM</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Nombre, cédula o celular..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>
              
              {showSuggestions && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container border border-outline/30 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-outline/5">
                  {filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        handleSelectCustomer(c);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left p-3 hover:bg-primary/10 text-xs text-on-surface font-medium flex justify-between items-center transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <div className="truncate pr-2 text-left">
                        <p className="font-semibold text-on-surface truncate">{c.name} {c.last_name || ''}</p>
                        <p className="text-[10px] text-on-surface-variant opacity-75 truncate">{c.phone}</p>
                      </div>
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold font-mono uppercase shrink-0">
                        C.C.: {c.document_number}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer ? (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                <p className="text-[9px] uppercase tracking-wider text-primary font-bold">Paciente Seleccionado</p>
                <div>
                  <p className="font-bold text-sm text-on-surface">{selectedCustomer.name} {selectedCustomer.last_name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Cédula: <strong>{selectedCustomer.document_number}</strong></p>
                  <p className="text-xs text-on-surface-variant">Teléfono: {selectedCustomer.phone}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setFormulasHistory([]);
                  }}
                  className="text-[10px] text-red-400 hover:underline bg-transparent border-none cursor-pointer outline-none"
                >
                  Limpiar Selección
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-on-surface-variant italic">
                Selecciona un paciente del buscador para ver su historial clínico o agregar un nuevo examen.
              </div>
            )}
          </div>

          {/* Formulario y Fórmulas */}
          {selectedCustomer && (
            <>
              <form onSubmit={handleSaveFormula} className="lg:col-span-1 glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
                <h4 className="font-bold text-sm text-on-surface border-b border-outline/10 pb-2 flex justify-between items-center">
                  <span>Nueva Fórmula Óptica</span>
                  {saveSuccess && <span className="text-xs text-green-500 font-normal">¡Guardado con éxito!</span>}
                </h4>
                
                <div className="space-y-4">
                  {/* Ojo Derecho */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Ojo Derecho (O.D.)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" placeholder="Esfera (ESF)" value={odSphere} onChange={(e) => setOdSphere(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                      <input 
                        type="text" placeholder="Cilindro (CIL)" value={odCylinder} onChange={(e) => setOdCylinder(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                      <input 
                        type="text" placeholder="Eje (EJE)" value={odAxis} onChange={(e) => setOdAxis(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                      <input 
                        type="text" placeholder="Adición (ADD)" value={odAddition} onChange={(e) => setOdAddition(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                    </div>
                  </div>

                  {/* Ojo Izquierdo */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Ojo Izquierdo (O.I.)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" placeholder="Esfera (ESF)" value={oiSphere} onChange={(e) => setOiSphere(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                      <input 
                        type="text" placeholder="Cilindro (CIL)" value={oiCylinder} onChange={(e) => setOiCylinder(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                      <input 
                        type="text" placeholder="Eje (EJE)" value={oiAxis} onChange={(e) => setOiAxis(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                      <input 
                        type="text" placeholder="Adición (ADD)" value={oiAddition} onChange={(e) => setOiAddition(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                    </div>
                  </div>

                  {/* Distancia y Altura */}
                  <div className="grid grid-cols-2 gap-2 border-t border-outline/5 pt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant">DP (mm)</label>
                      <input 
                        type="text" placeholder="Distancia Pupilar" value={dpDistance} onChange={(e) => setDpDistance(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant">ALT (mm)</label>
                      <input 
                        type="text" placeholder="Altura de lente" value={height} onChange={(e) => setHeight(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                      />
                    </div>
                  </div>

                  {/* Diagnóstico / Notas */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold">Diagnóstico & Indicaciones</label>
                    <textarea 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observaciones de lentes, filtros, astigmatismo..."
                      className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none h-20 resize-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer border-0 mt-2"
                >
                  {saving ? 'Guardando...' : 'Guardar Examen'}
                </button>
              </form>

              {/* Historial de Fórmulas */}
              <div className="lg:col-span-1 glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
                <h4 className="font-bold text-sm text-on-surface border-b border-outline/10 pb-2">Historial de Recetas</h4>
                
                {loadingHistory ? (
                  <div className="p-8 text-center text-xs text-on-surface-variant">Cargando recetas clínicas...</div>
                ) : formulasHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-on-surface-variant">El paciente no registra fórmulas oftálmicas previas.</div>
                ) : (
                  <div className="space-y-3">
                    {formulasHistory.map(form => (
                      <div key={form.id} className="p-4 bg-surface-container/20 border border-outline/10 rounded-xl space-y-3 relative group">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-primary font-bold">
                            Fórmula del {new Date(form.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          <button 
                            onClick={() => handleDeleteFormula(form.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 bg-transparent border-none cursor-pointer outline-none transition-opacity duration-150"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>

                        {/* Cuadro Clínico */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-surface-container/50 p-2.5 rounded-lg space-y-0.5">
                            <p className="font-bold text-primary text-[10px]">OJO DERECHO (O.D.)</p>
                            <p>ESF: <strong>{form.od_sphere || '---'}</strong></p>
                            <p>CIL: <strong>{form.od_cylinder || '---'}</strong></p>
                            <p>EJE: <strong>{form.od_axis ? `${form.od_axis}` : '---'}</strong></p>
                            <p>ADD: <strong>{form.od_addition || '---'}</strong></p>
                          </div>
                          
                          <div className="bg-surface-container/50 p-2.5 rounded-lg space-y-0.5">
                            <p className="font-bold text-secondary text-[10px]">OJO IZQUIERDO (O.I.)</p>
                            <p>ESF: <strong>{form.oi_sphere || '---'}</strong></p>
                            <p>CIL: <strong>{form.oi_cylinder || '---'}</strong></p>
                            <p>EJE: <strong>{form.oi_axis ? `${form.oi_axis}` : '---'}</strong></p>
                            <p>ADD: <strong>{form.oi_addition || '---'}</strong></p>
                          </div>
                        </div>

                        <div className="flex justify-between text-[11px] text-on-surface-variant font-mono bg-surface-container/30 px-3 py-1.5 rounded-lg">
                          <span>DP: <strong>{form.dp_distance || '---'}</strong></span>
                          <span>ALT: <strong>{form.height || '---'}</strong></span>
                        </div>

                        {form.notes && (
                          <div className="text-[11px] text-on-surface-variant leading-relaxed p-2.5 bg-surface-container/40 rounded-lg">
                            <strong>Indicaciones:</strong> {form.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
