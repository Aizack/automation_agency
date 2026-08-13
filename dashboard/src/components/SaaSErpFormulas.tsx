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
      const res = await fetch(`/api/clients/${clientId}/crm/customers`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.customers || []);
      }
    } catch (err) {
      console.error("Error cargando clientes del CRM:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
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
              <p className="text-[9px] uppercase tracking-wider text-primary font-bold">Paciente Seleccionado (Solo Lectura)</p>
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
                Cambiar paciente
              </button>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-on-surface-variant bg-surface-container/10 border border-dashed border-outline/20 rounded-xl">
              Busca y selecciona un paciente en el CRM para iniciar o ver su historial.
            </div>
          )}
        </div>

        {/* Formulario y Registro Histórico */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer && (
            <>
              {/* Formulario Nueva Fórmula */}
              <form onSubmit={handleSaveFormula} className="glass-card p-6 rounded-2xl border border-outline/10 space-y-4">
                <h4 className="font-bold text-sm text-on-surface border-b border-outline/10 pb-2">Nueva Prescripción Óptica</h4>
                
                {saveSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-xs font-semibold">
                    ¡Fórmula guardada con éxito!
                  </div>
                )}

                {/* Tabla de Refracción */}
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-on-surface-variant border-b border-outline/10">
                        <th className="py-2 text-left">Ojo</th>
                        <th className="py-2">Esfera (ESF)</th>
                        <th className="py-2">Cilindro (CIL)</th>
                        <th className="py-2">Eje (EJE)</th>
                        <th className="py-2">Adición (ADD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/5">
                      <tr>
                        <td className="py-3 text-left font-bold text-xs text-primary">O.D. (Derecho)</td>
                        <td className="py-2">
                          <input type="text" value={odSphere} onChange={e => setOdSphere(e.target.value)} placeholder="+0.25" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                        <td className="py-2">
                          <input type="text" value={odCylinder} onChange={e => setOdCylinder(e.target.value)} placeholder="-0.50" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                        <td className="py-2">
                          <input type="text" value={odAxis} onChange={e => setOdAxis(e.target.value)} placeholder="180°" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                        <td className="py-2">
                          <input type="text" value={odAddition} onChange={e => setOdAddition(e.target.value)} placeholder="+2.00" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 text-left font-bold text-xs text-secondary">O.I. (Izquierdo)</td>
                        <td className="py-2">
                          <input type="text" value={oiSphere} onChange={e => setOiSphere(e.target.value)} placeholder="Neutra" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                        <td className="py-2">
                          <input type="text" value={oiCylinder} onChange={e => setOiCylinder(e.target.value)} placeholder="-0.75" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                        <td className="py-2">
                          <input type="text" value={oiAxis} onChange={e => setOiAxis(e.target.value)} placeholder="90°" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                        <td className="py-2">
                          <input type="text" value={oiAddition} onChange={e => setOiAddition(e.target.value)} placeholder="+2.00" className="w-20 bg-surface-container text-center border border-outline/20 rounded-lg p-1.5 text-xs text-on-surface" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-label-md text-on-surface-variant ml-1">Distancia Pupilar (DP)</label>
                    <input type="text" value={dpDistance} onChange={e => setDpDistance(e.target.value)} placeholder="ej. 62 mm" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2 text-xs text-on-surface outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-label-md text-on-surface-variant ml-1">Altura de Montaje (ALT)</label>
                    <input type="text" value={height} onChange={e => setHeight(e.target.value)} placeholder="ej. 18 mm" className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2 text-xs text-on-surface outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-on-surface-variant ml-1">Diagnóstico y Observaciones Clínicas</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ej. Presbicia inicial. Paciente solicita lentes progresivos policarbonato con tratamiento filtro azul." rows={2} className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-2 text-xs text-on-surface outline-none font-sans resize-none" />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-primary text-on-primary font-bold text-xs px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar Fórmula'}
                  </button>
                </div>
              </form>

              {/* Historial Clínico */}
              <div className="glass-card p-6 rounded-2xl border border-outline/10 space-y-4">
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
      </div>
    </div>
  );
};
