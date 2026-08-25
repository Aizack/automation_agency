import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface FormulasProps {
  clientId: string;
  defaultSubTab?: 'formulas' | 'lab_jobs';
  showSubTabs?: boolean;
}

interface Customer {
  id: string;
  name: string;
  last_name: string;
  document_number: string;
  phone: string;
  email: string | null;
  document_type?: string;
  address?: string | null;
  customer_type?: 'persona' | 'empresa';
  lens_prescription: string | null;
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

export const SaaSErpFormulas: React.FC<FormulasProps> = ({ clientId, defaultSubTab = 'formulas', showSubTabs = true }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Subpestañas
  const [formulasSubTab, setFormulasSubTab] = useState<'formulas' | 'lab_jobs'>(defaultSubTab);
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
  const [odPrism, setOdPrism] = useState('');
  const [odAv, setOdAv] = useState('');
  
  const [oiSphere, setOiSphere] = useState('');
  const [oiCylinder, setOiCylinder] = useState('');
  const [oiAxis, setOiAxis] = useState('');
  const [oiAddition, setOiAddition] = useState('');
  const [oiPrism, setOiPrism] = useState('');
  const [oiAv, setOiAv] = useState('');
  
  const [dpDistance, setDpDistance] = useState('');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');

  const [formulasHistory, setFormulasHistory] = useState<Formula[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toLocalDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [agendaDate, setAgendaDate] = useState<string>(toLocalDateInputValue(new Date()));
  const [agendaAppointments, setAgendaAppointments] = useState<any[]>([]);
  const [loadingAgendaAppointments, setLoadingAgendaAppointments] = useState(false);

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
    fetchAgendaAppointments(agendaDate);
  }, [clientId]);

  useEffect(() => {
    fetchAgendaAppointments(agendaDate);
  }, [agendaDate]);

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

  const fetchAgendaAppointments = async (selectedDate = agendaDate) => {
    setLoadingAgendaAppointments(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/appointments?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setAgendaAppointments(json.appointments || []);
      }
    } catch (err) {
      console.error('Error fetching agenda appointments:', err);
    } finally {
      setLoadingAgendaAppointments(false);
    }
  };

  const updateAgendaAppointmentStatus = async (appointmentId: string, status: 'completed' | 'cancelled' | 'no_show') => {
    try {
      const res = await fetch(`/api/clients/${clientId}/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const json = await res.json();
      if (json.success) {
        fetchAgendaAppointments();
        return;
      }

      alert(json.error || 'No se pudo actualizar el estado de la cita.');
    } catch (err: any) {
      console.error('Error updating appointment status:', err);
      alert(err.message || 'Error al actualizar el estado de la cita.');
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    loadCurrentPrescription(customer.lens_prescription);
    fetchCustomerFormulas(customer.id);
    setSearchQuery('');
  };

  const handleAgendaPatientSelect = (appointment: any) => {
    const candidate = customers.find((customer) => {
      if (appointment.crm_customer_id && customer.id === appointment.crm_customer_id) return true;
      if (customer.phone && appointment.customer_phone && customer.phone === appointment.customer_phone) return true;
      if (customer.document_number && appointment.customer_document_number && customer.document_number === appointment.customer_document_number) return true;
      return false;
    });

    if (candidate) {
      handleSelectCustomer(candidate);
      return;
    }

    const fallbackCustomer: Customer = {
      id: appointment.crm_customer_id || appointment.id,
      name: appointment.customer_name.split(' ')[0] || 'Paciente',
      last_name: appointment.customer_name.split(' ').slice(1).join(' ') || '',
      document_number: appointment.customer_document_number || '',
      phone: appointment.customer_phone || '',
      email: null,
      lens_prescription: null
    };

    setSelectedCustomer(fallbackCustomer);
    setSearchQuery(appointment.customer_name);
    setFormulasHistory([]);
  };

  const loadCurrentPrescription = (prescription: string | null) => {
    try {
      const parsed = prescription ? JSON.parse(prescription) : {};
      setOdSphere(parsed.od?.esf || '');
      setOdCylinder(parsed.od?.cil || '');
      setOdAxis(parsed.od?.eje || '');
      setOdAddition(parsed.od?.adi || '');
      setOdPrism(parsed.od?.prism || '');
      setOdAv(parsed.od?.av || '');
      setOiSphere(parsed.oi?.esf || '');
      setOiCylinder(parsed.oi?.cil || '');
      setOiAxis(parsed.oi?.eje || '');
      setOiAddition(parsed.oi?.adi || '');
      setOiPrism(parsed.oi?.prism || '');
      setOiAv(parsed.oi?.av || '');
      setDpDistance(parsed.dp || '');
    } catch {
      setOdSphere(''); setOdCylinder(''); setOdAxis(''); setOdAddition('');
      setOdPrism(''); setOdAv('');
      setOiSphere(''); setOiCylinder(''); setOiAxis(''); setOiAddition('');
      setOiPrism(''); setOiAv('');
      setDpDistance('');
    }
  };

  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert("Por favor selecciona un cliente.");
      return;
    }
    setSaving(true);
    try {
      const currentPrescription = JSON.stringify({
        od: {
          esf: odSphere, cil: odCylinder, eje: odAxis, adi: odAddition,
          prism: odPrism, av: odAv
        },
        oi: {
          esf: oiSphere, cil: oiCylinder, eje: oiAxis, adi: oiAddition,
          prism: oiPrism, av: oiAv
        },
        dp: dpDistance
      });

      const historyRes = await fetch(`/api/clients/${clientId}/formulas`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          odSphere, odCylinder, odAxis, odAddition,
          oiSphere, oiCylinder, oiAxis, oiAddition,
          dpDistance, height, notes
        })
      });
      
      if (!historyRes.ok) {
        const errorText = await historyRes.text();
        console.error(`[Formula History Save] HTTP ${historyRes.status}:`, errorText);
        alert(`Error del servidor (${historyRes.status}). Verifica la consola.`);
        return;
      }

      const historyJson = await historyRes.json();
      if (historyJson.success) {
        const profileRes = await fetch(`/api/clients/${clientId}/crm-customers/${selectedCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            name: selectedCustomer.name,
            last_name: selectedCustomer.last_name || '',
            document_type: selectedCustomer.document_type || 'CC',
            document_number: selectedCustomer.document_number,
            phone: selectedCustomer.phone,
            email: selectedCustomer.email,
            address: selectedCustomer.address || null,
            customer_type: selectedCustomer.customer_type || 'persona',
            lens_prescription: currentPrescription
          })
        });
        const profileJson = await profileRes.json();
        if (!profileRes.ok || !profileJson.success) {
          throw new Error(profileJson.error || 'No se pudo actualizar la fórmula vigente del perfil.');
        }

        setSelectedCustomer(profileJson.customer);
        setSaveSuccess(true);
        setTimeout(() => {
          fetchCustomerFormulas(selectedCustomer.id);
          setSaveSuccess(false);
        }, 500);
      } else {
        alert(historyJson.error || 'Error al guardar la fórmula.');
      }
    } catch (err: any) {
      console.error('[Formula Save Error]:', err);
      alert('Error de conexión: ' + err.message);
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

  const renderLabJobsTab = () => {
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {renderLabJobColumn("Por Asignar", pending, "pending")}
          {renderLabJobColumn("Laboratorio Asignado", assigned, "assigned")}
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
                      status: 'assigned'
                    });
                  }}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold cursor-pointer border-0 hover:opacity-90 transition"
                >
                  Confirmar Asignación
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFormulaForm = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <div className="space-y-3">
              <div className="rounded-xl border border-outline/10 bg-surface-container/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Paciente seleccionado</p>
                <p className="text-sm font-bold text-on-surface mt-1">{selectedCustomer.name} {selectedCustomer.last_name}</p>
                <p className="text-[11px] text-on-surface-variant">{selectedCustomer.phone}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSearchQuery('');
                  setFormulasHistory([]);
                }}
                className="w-full border border-outline/20 bg-transparent text-on-surface hover:bg-surface-container text-xs font-semibold rounded-xl py-2 cursor-pointer"
              >
                Limpiar paciente
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-on-surface-variant p-3 rounded-xl border border-dashed border-outline/20 bg-surface-container/30">
              Selecciona un paciente para cargar su historial clínico.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <>
              <form onSubmit={handleSaveFormula} className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
                <h4 className="font-bold text-sm text-on-surface border-b border-outline/10 pb-2 flex justify-between items-center">
                  <span>Nueva Fórmula Óptica</span>
                  {saveSuccess && <span className="text-xs text-green-500 font-normal">¡Guardado con éxito!</span>}
                </h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Ojo Derecho (O.D.)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <input type="text" placeholder="Esfera (ESF)" value={odSphere} onChange={(e) => setOdSphere(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Cilindro (CIL)" value={odCylinder} onChange={(e) => setOdCylinder(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Eje (EJE)" value={odAxis} onChange={(e) => setOdAxis(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Adición (ADD)" value={odAddition} onChange={(e) => setOdAddition(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Prisma" value={odPrism} onChange={(e) => setOdPrism(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="AV (Agudeza)" value={odAv} onChange={(e) => setOdAv(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Ojo Izquierdo (O.I.)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <input type="text" placeholder="Esfera (ESF)" value={oiSphere} onChange={(e) => setOiSphere(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Cilindro (CIL)" value={oiCylinder} onChange={(e) => setOiCylinder(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Eje (EJE)" value={oiAxis} onChange={(e) => setOiAxis(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Adición (ADD)" value={oiAddition} onChange={(e) => setOiAddition(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="Prisma" value={oiPrism} onChange={(e) => setOiPrism(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                      <input type="text" placeholder="AV (Agudeza)" value={oiAv} onChange={(e) => setOiAv(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-outline/5 pt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant">DP (mm)</label>
                      <input type="text" placeholder="Distancia Pupilar" value={dpDistance} onChange={(e) => setDpDistance(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-on-surface-variant">ALT (mm)</label>
                      <input type="text" placeholder="Altura de lente" value={height} onChange={(e) => setHeight(e.target.value)} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold">Diagnóstico & Indicaciones</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones de lentes, filtros, astigmatismo..." className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none h-20 resize-none" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer border-0 mt-2">
                  {saving ? 'Guardando...' : 'Guardar Examen'}
                </button>
              </form>

              <div className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
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
                          <span className="text-[10px] text-primary font-bold">Fórmula del {new Date(form.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          <button onClick={() => handleDeleteFormula(form.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 bg-transparent border-none cursor-pointer outline-none transition-opacity duration-150"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
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
          ) : (
            <div className="p-8 text-center text-xs text-on-surface-variant italic">Selecciona un paciente del buscador para ver su historial clínico o agregar un nuevo examen.</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {formulasSubTab === 'formulas' && (
        <>
          <div className="flex justify-between items-center border-b border-outline/10 pb-4">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Creación de gafas formuladas</h3>
              <p className="text-on-surface-variant text-body-md opacity-70">Prescripción y registro de lentes formulados.</p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Agenda de Citas</p>
                <h4 className="font-bold text-base text-on-surface">Citas del día</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setAgendaDate((prev) => { const next = new Date(`${prev}T12:00:00`); next.setDate(next.getDate() - 1); return toLocalDateInputValue(next); })} className="px-2.5 py-1.5 rounded-lg border border-outline/20 bg-transparent text-xs text-on-surface hover:bg-surface-container cursor-pointer">Anterior</button>
                <button type="button" onClick={() => setAgendaDate(toLocalDateInputValue(new Date()))} className="px-2.5 py-1.5 rounded-lg border border-outline/20 bg-transparent text-xs text-on-surface hover:bg-surface-container cursor-pointer">Hoy</button>
                <button type="button" onClick={() => setAgendaDate((prev) => { const next = new Date(`${prev}T12:00:00`); next.setDate(next.getDate() + 1); return toLocalDateInputValue(next); })} className="px-2.5 py-1.5 rounded-lg border border-outline/20 bg-transparent text-xs text-on-surface hover:bg-surface-container cursor-pointer">Siguiente</button>
                <input type="date" value={agendaDate} onChange={(e) => setAgendaDate(e.target.value)} className="rounded-lg border border-outline/20 bg-surface-container text-xs text-on-surface px-2 py-1.5 outline-none" />
              </div>
            </div>

            {loadingAgendaAppointments ? (
              <div className="py-6 text-center text-xs text-on-surface-variant">Cargando agenda...</div>
            ) : agendaAppointments.length === 0 ? (
              <div className="py-6 text-center text-xs text-on-surface-variant border border-dashed border-outline/20 rounded-xl">No hay citas programadas para este día.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {agendaAppointments.map((appointment) => {
                  const appointmentTime = appointment.appointment_date ? appointment.appointment_date.split('T')[1]?.slice(0, 5) : '00:00';
                  const isCompleted = appointment.status === 'completed';
                  const isCancelled = appointment.status === 'cancelled';
                  const isNoShow = appointment.status === 'no_show';
                  return (
                    <div key={appointment.id} className="rounded-2xl border border-outline/10 bg-surface-container/50 p-4 space-y-3 hover:border-primary/30 transition cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => handleAgendaPatientSelect(appointment)} className="text-left flex-1 cursor-pointer bg-transparent border-0 p-0">
                          <div className="font-bold text-sm text-on-surface">{appointment.customer_name || 'Paciente'}</div>
                          <div className="text-[11px] text-on-surface-variant mt-1">{appointmentTime} · {appointment.customer_phone || 'Sin teléfono'}</div>
                        </button>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isCompleted ? 'bg-green-500/10 text-green-500' : isCancelled ? 'bg-red-500/10 text-red-500' : isNoShow ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                          {appointment.status === 'scheduled' ? 'Programada' : appointment.status === 'completed' ? 'Completada' : appointment.status === 'cancelled' ? 'Cancelada' : appointment.status === 'no_show' ? 'No asistió' : appointment.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-on-surface-variant">
                        <div><strong>Motivo:</strong> {appointment.visit_reason || 'Consulta'}</div>
                        {appointment.visit_reason_details && <div className="italic text-on-surface-variant/80">{appointment.visit_reason_details}</div>}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-outline/10">
                        <button type="button" onClick={() => updateAgendaAppointmentStatus(appointment.id, 'completed')} className="px-2 py-1 text-[10px] rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 cursor-pointer border-0">Completa</button>
                        <button type="button" onClick={() => updateAgendaAppointmentStatus(appointment.id, 'cancelled')} className="px-2 py-1 text-[10px] rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer border-0">Cancelar</button>
                        <button type="button" onClick={() => updateAgendaAppointmentStatus(appointment.id, 'no_show')} className="px-2 py-1 text-[10px] rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 cursor-pointer border-0">No asistió</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {showSubTabs && (
        <div className="flex border-b border-outline/10 gap-6">
          <button onClick={() => setFormulasSubTab('formulas')} className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${formulasSubTab === 'formulas' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'}`}>
            Optometría y Diagnósticos
            {formulasSubTab === 'formulas' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />}
          </button>
          <button onClick={() => { setFormulasSubTab('lab_jobs'); fetchLabJobs(); }} className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${formulasSubTab === 'lab_jobs' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'}`}>
            Trabajos de laboratorio
            {formulasSubTab === 'lab_jobs' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />}
          </button>
        </div>
      )}

      {formulasSubTab === 'lab_jobs' ? renderLabJobsTab() : renderFormulaForm()}
    </div>
  );
};
