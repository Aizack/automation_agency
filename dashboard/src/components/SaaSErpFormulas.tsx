import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  od_av?: string | null;
  oi_sphere: string | null;
  oi_cylinder: string | null;
  oi_axis: string | null;
  oi_addition: string | null;
  oi_av?: string | null;
  dp_distance: string | null;
  height: string | null;
  notes: string | null;
  created_at: string;
}

const PhoneInput: React.FC<{ value: string; onChange: (val: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = "3189998877" }) => {
  const cleanNum = value.replace(/^\+57\s*/, '').replace(/\D/g, '');
  return (
    <div className="flex items-center bg-[#181a1c] border border-[#2d3036] rounded-md overflow-hidden text-xs">
      <span className="bg-[#22252a] text-gray-400 font-bold px-2.5 py-2 border-r border-[#2d3036] select-none text-[11px] font-mono">
        +57
      </span>
      <input
        type="tel"
        value={cleanNum}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          onChange(raw ? `+57 ${raw}` : '');
        }}
        placeholder={placeholder}
        className="w-full bg-transparent p-2 text-on-surface outline-none font-mono"
      />
    </div>
  );
};

export const SaaSErpFormulas: React.FC<FormulasProps> = ({ clientId: rawClientId, defaultSubTab = 'formulas', showSubTabs = true }) => {
  const clientId = (rawClientId && rawClientId !== 'undefined')
    ? rawClientId
    : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Subpestañas
  const [formulasSubTab, setFormulasSubTab] = useState<'formulas' | 'lab_jobs' | 'historia_clinica'>(defaultSubTab);
  
  // Historia Clínica
  const [clinicalRecords, setClinicalRecords] = useState<any[]>([]);
  const [loadingClinical, setLoadingClinical] = useState(false);
  const [isClinicalFormOpen, setIsClinicalFormOpen] = useState(false);
  const [editingClinicalRecordId, setEditingClinicalRecordId] = useState<string | null>(null);
  const [viewingClinicalRecord, setViewingClinicalRecord] = useState<any | null>(null);
  const [clinicalSearch, setClinicalSearch] = useState('');

  // Campos de Ficha Médica
  const [clinPatientName, setClinPatientName] = useState('');
  const [clinPatientDoc, setClinPatientDoc] = useState('');
  const [clinPatientPhone, setClinPatientPhone] = useState('');
  const [clinReason, setClinReason] = useState('');
  const [clinMedAntecedents, setClinMedAntecedents] = useState('');
  const [clinOcuAntecedents, setClinOcuAntecedents] = useState('');
  const [clinAvOd, setClinAvOd] = useState('20/20');
  const [clinAvOi, setClinAvOi] = useState('20/20');
  const [clinRefrOd, setClinRefrOd] = useState('');
  const [clinRefrOi, setClinRefrOi] = useState('');
  const [clinTonoOd, setClinTonoOd] = useState('14 mmHg');
  const [clinTonoOi, setClinTonoOi] = useState('14 mmHg');
  const [clinOphthalNotes, setClinOphthalNotes] = useState('');
  const [clinDiagnosis, setClinDiagnosis] = useState('');
  const [clinTreatmentPlan, setClinTreatmentPlan] = useState('');
  const [clinOptometrist, setClinOptometrist] = useState('Dr. Optómetra Especialista');
  // Checkboxes de Posibles Enfermedades / Antecedentes
  const [diseaseCheckboxes, setDiseaseCheckboxes] = useState({
    estrabismo: false,
    carnosidad: false,
    cataratas: false,
    hipertension: false,
    diabetes: false,
    cirugia: false,
  });

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

  useEffect(() => {
    fetchCustomers();
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

  // Cargar Historias Clínicas
  const fetchClinicalRecords = async () => {
    try {
      setLoadingClinical(true);
      const res = await fetch(`/api/clients/${clientId}/clinical-records${clinicalSearch ? `?search=${encodeURIComponent(clinicalSearch)}` : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setClinicalRecords(data.records || []);
      }
    } catch (err) {
      console.error("Error al cargar historias clínicas:", err);
    } finally {
      setLoadingClinical(false);
    }
  };

  useEffect(() => {
    if (formulasSubTab === 'historia_clinica') {
      fetchClinicalRecords();
    }
  }, [formulasSubTab, clinicalSearch]);

  const handleCreateClinicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinPatientName) {
      alert("Por favor ingresa el nombre del paciente.");
      return;
    }

    const checkedDiseases = [
      diseaseCheckboxes.estrabismo && 'Estrabismo',
      diseaseCheckboxes.carnosidad && 'Carnosidad/Pterigión',
      diseaseCheckboxes.cataratas && 'Cataratas',
      diseaseCheckboxes.hipertension && 'Hipertensión',
      diseaseCheckboxes.diabetes && 'Diabetes',
      diseaseCheckboxes.cirugia && 'Cirugía Ocular',
    ].filter(Boolean).join(', ');

    const finalMedAntecedents = [checkedDiseases, clinMedAntecedents].filter(Boolean).join(' | ');

    try {
      setLoadingClinical(true);
      const res = await fetch(`/api/clients/${clientId}/clinical-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: selectedCustomer?.id || null,
          customerName: clinPatientName,
          customerDocument: clinPatientDoc,
          customerPhone: clinPatientPhone,
          consultationReason: clinReason,
          medicalAntecedents: finalMedAntecedents,
          ocularAntecedents: clinOcuAntecedents,
          visualAcuityOd: clinAvOd,
          visualAcuityOi: clinAvOi,
          refractionOd: clinRefrOd,
          refractionOi: clinRefrOi,
          tonometryOd: clinTonoOd,
          tonometryOi: clinTonoOi,
          ophthalmoscopyNotes: clinOphthalNotes,
          diagnosis: clinDiagnosis,
          treatmentPlan: clinTreatmentPlan,
          optometristName: clinOptometrist
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Historia clínica guardada con éxito.");
        setIsClinicalFormOpen(false);
        setClinReason('');
        setClinMedAntecedents('');
        setClinOcuAntecedents('');
        setClinRefrOd('');
        setClinRefrOi('');
        setClinDiagnosis('');
        setClinTreatmentPlan('');
        fetchClinicalRecords();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error al guardar la historia clínica.");
    } finally {
      setLoadingClinical(false);
    }
  };

  const handleDeleteClinicalRecord = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta historia clínica?")) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/clinical-records/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchClinicalRecords();
      }
    } catch (err) {
      alert("Error al eliminar la historia clínica.");
    }
  };

  const handlePrintClinicalRecord = (record: any) => {
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;

    printWin.document.write(`
      <html>
        <head>
          <title>Historia Clínica Optométrica - ${record.customer_name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #111; font-size: 13px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .section-title { font-size: 13px; font-weight: bold; background: #eee; padding: 6px 10px; border-left: 4px solid #333; margin-top: 15px; margin-bottom: 10px; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .field { margin-bottom: 8px; }
            .label { font-weight: bold; color: #555; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: center; }
            .table th { background: #f5f5f5; }
            .footer { margin-top: 50px; text-align: center; border-t: 1px solid #ccc; pt: 20px; }
            .signature { margin-top: 60px; display: inline-block; border-top: 1px solid #000; width: 250px; padding-top: 5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Historia Clínica Optométrica</div>
            <div>Fecha de Examen: ${new Date(record.created_at).toLocaleDateString('es-CO')} ${new Date(record.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>

          <div class="section-title">1. Datos del Paciente</div>
          <div class="grid">
            <div class="field"><span class="label">Paciente:</span> ${record.customer_name}</div>
            <div class="field"><span class="label">Cédula:</span> ${record.customer_document || 'N/A'}</div>
            <div class="field"><span class="label">Teléfono:</span> ${record.customer_phone || 'N/A'}</div>
            <div class="field"><span class="label">Optómetra:</span> ${record.optometrist_name || 'Atención General'}</div>
          </div>

          <div class="section-title">2. Anamnesis y Antecedentes</div>
          <div class="field"><span class="label">Motivo de Consulta:</span> ${record.consultation_reason || 'Control visual de rutina'}</div>
          <div class="grid" style="margin-top:8px;">
            <div class="field"><span class="label">Antecedentes Médicos:</span> ${record.medical_antecedents || 'Ninguno reportado'}</div>
            <div class="field"><span class="label">Antecedentes Oculares:</span> ${record.ocular_antecedents || 'Ninguno reportado'}</div>
          </div>

          <div class="section-title">3. Examen Clínico Ocular</div>
          <table class="table">
            <thead>
              <tr>
                <th>Ojo</th>
                <th>Agudeza Visual (AV)</th>
                <th>Refracción Prescrita</th>
                <th>Tonometría (PIO)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OD (Ojo Derecho)</strong></td>
                <td>${record.visual_acuity_od || '20/20'}</td>
                <td>${record.refraction_od || 'Plano'}</td>
                <td>${record.tonometry_od || '14 mmHg'}</td>
              </tr>
              <tr>
                <td><strong>OI (Ojo Izquierdo)</strong></td>
                <td>${record.visual_acuity_oi || '20/20'}</td>
                <td>${record.refraction_oi || 'Plano'}</td>
                <td>${record.tonometry_oi || '14 mmHg'}</td>
              </tr>
            </tbody>
          </table>

          ${record.ophthalmoscopy_notes ? `
            <div style="margin-top:10px;" class="field">
              <span class="label">Oftalmoscopía / Biomicroscopía:</span> ${record.ophthalmoscopy_notes}
            </div>
          ` : ''}

          <div class="section-title">4. Diagnóstico y Plan de Manejo</div>
          <div class="field"><span class="label">Diagnóstico Clínico:</span> ${record.diagnosis || 'Vicio de refracción general'}</div>
          <div class="field" style="margin-top:8px;"><span class="label">Plan de Tratamiento / Conducta:</span> ${record.treatment_plan || 'Uso permanente de corrección óptica con filtro azul anti-reflejo.'}</div>

          <div class="footer">
            <div class="signature">
              ${record.optometrist_name || 'Optómetra Tratante'}<br>
              <span style="font-size:10px; font-weight:normal; color:#666;">Firma y Registro Profesional</span>
            </div>
          </div>
          <script>window.print();</script>
    `);
    printWin.document.close();
  };

  const handleViewPatientClinicalRecord = async (cust: Customer) => {
    try {
      const searchParam = cust.document_number || cust.name;
      const res = await fetch(`/api/clients/${clientId}/clinical-records?search=${encodeURIComponent(searchParam)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.records && json.records.length > 0) {
        setViewingClinicalRecord(json.records[0]);
      } else {
        alert(`El paciente ${cust.name} no registra una historia clínica guardada aún. Haz clic en '+ Nueva Historia Clínica' para registrarla.`);
      }
    } catch (err) {
      alert("Error al intentar consultar la historia clínica.");
    }
  };

  const handleNewClinicalRecordForCustomer = (cust: Customer) => {
    setEditingClinicalRecordId(null);
    setClinPatientName(`${cust.name} ${cust.last_name || ''}`.trim());
    setClinPatientDoc(cust.document_number || '');
    setClinPatientPhone(cust.phone || '');

    // Cargar automáticamente los valores de fórmula previa si existen
    if (formulasHistory && formulasHistory.length > 0) {
      const latestForm = formulasHistory[0];
      const odStr = `Esf: ${latestForm.od_sphere || '---'} | Cil: ${latestForm.od_cylinder || '---'} | Eje: ${latestForm.od_axis ? `${latestForm.od_axis}°` : '---'} | Add: ${latestForm.od_addition || '---'}`;
      const oiStr = `Esf: ${latestForm.oi_sphere || '---'} | Cil: ${latestForm.oi_cylinder || '---'} | Eje: ${latestForm.oi_axis ? `${latestForm.oi_axis}°` : '---'} | Add: ${latestForm.oi_addition || '---'}`;
      setClinRefrOd(odStr);
      setClinRefrOi(oiStr);
      if (latestForm.od_av) setClinAvOd(latestForm.od_av);
      if (latestForm.oi_av) setClinAvOi(latestForm.oi_av);
    } else {
      setClinRefrOd('');
      setClinRefrOi('');
      setClinAvOd('20/20');
      setClinAvOi('20/20');
    }

    setDiseaseCheckboxes({
      estrabismo: false,
      carnosidad: false,
      cataratas: false,
      hipertension: false,
      diabetes: false,
      cirugia: false,
    });

    setIsClinicalFormOpen(true);
  };

  const handleEditClinicalRecord = (rec: any) => {
    setEditingClinicalRecordId(rec.id);
    setClinPatientName(rec.customer_name || '');
    setClinPatientDoc(rec.customer_document || '');
    setClinPatientPhone(rec.customer_phone || '');
    setClinReason(rec.consultation_reason || '');
    setClinMedAntecedents(rec.medical_antecedents || '');
    setClinOcuAntecedents(rec.ocular_antecedents || '');
    setClinAvOd(rec.visual_acuity_od || '20/20');
    setClinAvOi(rec.visual_acuity_oi || '20/20');
    setClinRefrOd(rec.refraction_od || '');
    setClinRefrOi(rec.refraction_oi || '');
    setClinTonoOd(rec.tonometry_od || '14 mmHg');
    setClinTonoOi(rec.tonometry_oi || '14 mmHg');
    setClinOphthalNotes(rec.ophthalmoscopy_notes || '');
    setClinDiagnosis(rec.diagnosis || '');
    setClinTreatmentPlan(rec.treatment_plan || '');
    setClinOptometrist(rec.optometrist_name || 'Dr. Optómetra Especialista');
    setIsClinicalFormOpen(true);
  };

  const renderClinicalHistoryTab = () => {
    return (
      <div className="space-y-6 text-left">
        {/* Subheader */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline/10 pb-4">
          <div>
            <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">clinical_notes</span>
              Historias Clínicas & Expediente del Paciente
            </h3>
            <p className="text-xs text-on-surface-variant opacity-75">
              Consulta y registra el expediente médico optométrico completo (Anamnesis, Antecedentes, Tonometría y Plan de Manejo).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input
                type="text"
                placeholder="Buscar paciente por cédula o nombre..."
                value={clinicalSearch}
                onChange={(e) => setClinicalSearch(e.target.value)}
                className="w-full bg-surface-container border border-outline/20 rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={() => {
                if (selectedCustomer) {
                  setClinPatientName(`${selectedCustomer.name} ${selectedCustomer.last_name || ''}`.trim());
                  setClinPatientDoc(selectedCustomer.document_number || '');
                  setClinPatientPhone(selectedCustomer.phone || '');
                }
                setIsClinicalFormOpen(true);
              }}
              className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl shadow hover:opacity-90 transition flex items-center gap-1.5 shrink-0 border-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nueva Historia Clínica
            </button>
          </div>
        </div>

        {/* Tabla de Historias Clínicas */}
        {loadingClinical ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : clinicalRecords.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-on-surface-variant text-[48px] opacity-40">medical_services</span>
            <p className="text-sm text-on-surface-variant">No hay historias clínicas registradas aún.</p>
            <p className="text-xs text-on-surface-variant opacity-60 max-w-md mx-auto">
              Registra los datos de consulta, tonometría, agudeza visual y diagnósticos para construir el expediente médico digital del paciente.
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-semibold">
                  <th className="p-4">Fecha Examen</th>
                  <th className="p-4">Paciente / Documento</th>
                  <th className="p-4">Motivo Consulta</th>
                  <th className="p-4">Agudeza Visual (OD/OI)</th>
                  <th className="p-4">Diagnóstico</th>
                  <th className="p-4">Optómetra</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/10 text-sm">
                {clinicalRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface-container/40 transition">
                    <td className="p-4 font-mono text-xs text-on-surface-variant">
                      {new Date(rec.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-on-surface text-xs">{rec.customer_name}</p>
                      <p className="text-[10px] text-on-surface-variant font-mono">C.C. {rec.customer_document || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-xs text-on-surface-variant truncate max-w-xs">{rec.consultation_reason || 'Control visual'}</td>
                    <td className="p-4 font-mono text-xs">OD: {rec.visual_acuity_od || '20/20'} | OI: {rec.visual_acuity_oi || '20/20'}</td>
                    <td className="p-4 text-xs font-bold text-primary truncate max-w-xs">{rec.diagnosis || 'Refracción'}</td>
                    <td className="p-4 text-xs text-on-surface-variant">{rec.optometrist_name || 'Optómetra'}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingClinicalRecord(rec)}
                        className="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 font-bold text-xs rounded-lg hover:bg-blue-500/30 transition border border-blue-500/30 cursor-pointer flex items-center gap-1"
                        title="Ver Historia Clínica"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        Ver
                      </button>
                      <button
                        onClick={() => handleEditClinicalRecord(rec)}
                        className="px-2.5 py-1.5 bg-amber-500/20 text-amber-400 font-bold text-xs rounded-lg hover:bg-amber-500/30 transition border border-amber-500/30 cursor-pointer flex items-center gap-1"
                        title="Editar Historia Clínica"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        Editar
                      </button>
                      <button
                        onClick={() => handlePrintClinicalRecord(rec)}
                        className="px-2.5 py-1.5 bg-primary/20 text-primary font-bold text-xs rounded-lg hover:bg-primary/30 transition border border-primary/30 cursor-pointer flex items-center gap-1"
                        title="Imprimir Historia Clínica"
                      >
                        <span className="material-symbols-outlined text-[16px]">print</span>
                        Imprimir
                      </button>
                      <button
                        onClick={() => handleDeleteClinicalRecord(rec.id)}
                        className="px-1.5 py-1.5 bg-red-500/10 text-red-400 font-bold text-xs rounded-lg hover:bg-red-500/20 transition border border-red-500/20 cursor-pointer"
                        title="Eliminar registro"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderFormulaForm = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        <div className="lg:col-span-1 bg-[#141517] p-5 rounded-2xl border border-[#2d3036] space-y-4">
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
                className="w-full bg-[#181a1c] border border-[#2d3036] rounded-md pl-10 pr-4 py-2.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
              />
            </div>

            {showSuggestions && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#181a1c] border border-[#2d3036] rounded-md shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[#2d3036]">
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
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-md font-bold font-mono uppercase shrink-0">
                      C.C.: {c.document_number}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer ? (
            <div className="space-y-3">
              <div className="rounded-md border border-[#2d3036] bg-[#181a1c] p-3">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Paciente seleccionado</p>
                <p className="text-sm font-bold text-on-surface mt-1">{selectedCustomer.name} {selectedCustomer.last_name}</p>
                <p className="text-[11px] text-on-surface-variant font-mono">{selectedCustomer.phone}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSearchQuery('');
                  setFormulasHistory([]);
                }}
                className="w-full border border-[#2d3036] bg-transparent text-on-surface hover:bg-[#181a1c] text-xs font-semibold rounded-md py-2 cursor-pointer transition"
              >
                Limpiar paciente
              </button>

              <div className="space-y-2 pt-2 border-t border-[#2d3036]">
                <button
                  type="button"
                  onClick={() => handleNewClinicalRecordForCustomer(selectedCustomer)}
                  className="w-full py-2 px-3 bg-primary text-on-primary font-bold text-xs rounded-md shadow hover:opacity-90 transition flex items-center justify-center gap-1.5 cursor-pointer border-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  + Nueva Historia Clínica
                </button>
                <button
                  type="button"
                  onClick={() => handleViewPatientClinicalRecord(selectedCustomer)}
                  className="w-full py-2 px-3 bg-blue-500/20 text-blue-400 font-bold text-xs rounded-md border border-blue-500/30 hover:bg-blue-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  Ver Historia Clínica
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-on-surface-variant p-3 rounded-md border border-dashed border-[#2d3036] bg-[#181a1c]">
              Selecciona un paciente para cargar su historial clínico.
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <>
              {/* EXAMEN ANTERIOR (FECHA PREVIA) */}
              <div className="bg-[#141517] p-5 rounded-2xl border border-[#2d3036] space-y-3">
                <div className="flex justify-between items-center border-b border-[#2d3036] pb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    <span>Examen Anterior {formulasHistory.length > 0 ? `(${new Date(formulasHistory[0].created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })})` : ''}</span>
                  </h4>
                  {formulasHistory.length > 0 && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-mono font-bold">
                      Fórmula Anterior
                    </span>
                  )}
                </div>

                {formulasHistory.length > 0 ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* O.D. Anterior */}
                      <div className="bg-[#181a1c] p-3 rounded-md border border-[#2d3036] space-y-1.5">
                        <p className="font-bold text-primary text-[10px] uppercase">OJO DERECHO (O.D.)</p>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold text-on-surface-variant uppercase border-b border-[#2d3036] pb-1">
                          <span>Esf</span>
                          <span>Cil</span>
                          <span>Eje</span>
                          <span>AV</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center font-bold text-on-surface pt-1">
                          <span>{formulasHistory[0].od_sphere || '---'}</span>
                          <span>{formulasHistory[0].od_cylinder || '---'}</span>
                          <span>{formulasHistory[0].od_axis ? `${formulasHistory[0].od_axis}°` : '---'}</span>
                          <span>{formulasHistory[0].od_av || '---'}</span>
                        </div>
                      </div>

                      {/* O.I. Anterior */}
                      <div className="bg-[#181a1c] p-3 rounded-md border border-[#2d3036] space-y-1.5">
                        <p className="font-bold text-secondary text-[10px] uppercase">OJO IZQUIERDO (O.I.)</p>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold text-on-surface-variant uppercase border-b border-[#2d3036] pb-1">
                          <span>Esf</span>
                          <span>Cil</span>
                          <span>Eje</span>
                          <span>AV</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center font-bold text-on-surface pt-1">
                          <span>{formulasHistory[0].oi_sphere || '---'}</span>
                          <span>{formulasHistory[0].oi_cylinder || '---'}</span>
                          <span>{formulasHistory[0].oi_axis ? `${formulasHistory[0].oi_axis}°` : '---'}</span>
                          <span>{formulasHistory[0].oi_av || '---'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-on-surface-variant italic border border-dashed border-[#2d3036] rounded-md bg-[#181a1c]">
                    No registra exámenes anteriores en el historial de este paciente.
                  </div>
                )}
              </div>

              {/* EXAMEN RECIENTE / NUEVO (FECHA ACTUAL) */}
              <form onSubmit={handleSaveFormula} className="bg-[#141517] p-5 rounded-2xl border border-[#2d3036] space-y-4">
                <div className="flex justify-between items-center border-b border-[#2d3036] pb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span>Examen Reciente / Actual ({new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })})</span>
                  </h4>
                  {saveSuccess && <span className="text-xs text-green-500 font-bold">¡Guardado con éxito!</span>}
                </div>

                {/* Encabezados estructurados */}
                <div className="space-y-4">
                  {/* Ojo Derecho */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wider">OJO DERECHO (O.D.)</p>
                    <div className="grid grid-cols-6 gap-2 text-center text-[10px] font-bold text-on-surface-variant uppercase font-mono">
                      <div>Esf</div>
                      <div>Cil</div>
                      <div>Eje</div>
                      <div>Add</div>
                      <div>Prisma</div>
                      <div>AV</div>
                    </div>
                    <div className="grid grid-cols-6 gap-2 font-mono">
                      <input type="text" placeholder="-1.50" value={odSphere} onChange={(e) => setOdSphere(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="-0.75" value={odCylinder} onChange={(e) => setOdCylinder(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="90°" value={odAxis} onChange={(e) => setOdAxis(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="+1.50" value={odAddition} onChange={(e) => setOdAddition(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="Prisma" value={odPrism} onChange={(e) => setOdPrism(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="20/20" value={odAv} onChange={(e) => setOdAv(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                    </div>
                  </div>

                  {/* Ojo Izquierdo */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-secondary uppercase tracking-wider">OJO IZQUIERDO (O.I.)</p>
                    <div className="grid grid-cols-6 gap-2 text-center text-[10px] font-bold text-on-surface-variant uppercase font-mono">
                      <div>Esf</div>
                      <div>Cil</div>
                      <div>Eje</div>
                      <div>Add</div>
                      <div>Prisma</div>
                      <div>AV</div>
                    </div>
                    <div className="grid grid-cols-6 gap-2 font-mono">
                      <input type="text" placeholder="-1.75" value={oiSphere} onChange={(e) => setOiSphere(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="-0.50" value={oiCylinder} onChange={(e) => setOiCylinder(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="85°" value={oiAxis} onChange={(e) => setOiAxis(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="+1.50" value={oiAddition} onChange={(e) => setOiAddition(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="Prisma" value={oiPrism} onChange={(e) => setOiPrism(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                      <input type="text" placeholder="20/20" value={oiAv} onChange={(e) => setOiAv(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2 text-xs focus:border-primary text-on-surface outline-none text-center" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-[#2d3036] pt-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">DP (mm)</label>
                      <input type="text" placeholder="Distancia Pupilar (Ej: 63)" value={dpDistance} onChange={(e) => setDpDistance(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2.5 text-xs focus:border-primary text-on-surface outline-none font-mono" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">ALT (mm)</label>
                      <input type="text" placeholder="Altura de lente" value={height} onChange={(e) => setHeight(e.target.value)} className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2.5 text-xs focus:border-primary text-on-surface outline-none font-mono" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-on-surface-variant font-bold uppercase">Diagnóstico & Indicaciones</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones de lentes, filtros, astigmatismo..." className="bg-[#181a1c] border border-[#2d3036] rounded-md p-2.5 text-xs focus:border-primary text-on-surface outline-none h-20 resize-none" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-md hover:opacity-90 active:scale-95 transition-all cursor-pointer border-0 mt-2">
                  {saving ? 'Guardando...' : 'Guardar Examen'}
                </button>
              </form>

              <div className="bg-[#141517] p-5 rounded-2xl border border-[#2d3036] space-y-4">
                <h4 className="font-bold text-sm text-on-surface border-b border-[#2d3036] pb-2">Historial de Recetas</h4>
                {loadingHistory ? (
                  <div className="p-8 text-center text-xs text-on-surface-variant">Cargando recetas clínicas...</div>
                ) : formulasHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-on-surface-variant">El paciente no registra fórmulas oftálmicas previas.</div>
                ) : (
                  <div className="space-y-3">
                    {formulasHistory.map(form => (
                      <div key={form.id} className="p-4 bg-[#181a1c] border border-[#2d3036] rounded-md space-y-3 relative group">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] text-primary font-bold">Fórmula del {new Date(form.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          <button onClick={() => handleDeleteFormula(form.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 bg-transparent border-none cursor-pointer outline-none transition-opacity duration-150"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                          <div className="bg-[#141517] p-2.5 rounded-md space-y-0.5">
                            <p className="font-bold text-primary text-[10px]">OJO DERECHO (O.D.)</p>
                            <p>ESF: <strong>{form.od_sphere || '---'}</strong></p>
                            <p>CIL: <strong>{form.od_cylinder || '---'}</strong></p>
                            <p>EJE: <strong>{form.od_axis ? `${form.od_axis}` : '---'}</strong></p>
                            <p>ADD: <strong>{form.od_addition || '---'}</strong></p>
                          </div>
                          <div className="bg-[#141517] p-2.5 rounded-md space-y-0.5">
                            <p className="font-bold text-secondary text-[10px]">OJO IZQUIERDO (O.I.)</p>
                            <p>ESF: <strong>{form.oi_sphere || '---'}</strong></p>
                            <p>CIL: <strong>{form.oi_cylinder || '---'}</strong></p>
                            <p>EJE: <strong>{form.oi_axis ? `${form.oi_axis}` : '---'}</strong></p>
                            <p>ADD: <strong>{form.oi_addition || '---'}</strong></p>
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px] text-on-surface-variant font-mono bg-[#141517] px-3 py-1.5 rounded-md">
                          <span>DP: <strong>{form.dp_distance || '---'}</strong></span>
                          <span>ALT: <strong>{form.height || '---'}</strong></span>
                        </div>
                        {form.notes && (
                          <div className="text-[11px] text-on-surface-variant leading-relaxed p-2.5 bg-[#141517] rounded-md">
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

          <div className="bg-[#141517] p-5 rounded-2xl border border-[#2d3036] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Agenda de Citas</p>
                <h4 className="font-bold text-base text-on-surface">Citas del día</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setAgendaDate((prev) => { const next = new Date(`${prev}T12:00:00`); next.setDate(next.getDate() - 1); return toLocalDateInputValue(next); })} className="px-2.5 py-1.5 rounded-md border border-[#2d3036] bg-transparent text-xs text-on-surface hover:bg-[#181a1c] cursor-pointer">Anterior</button>
                <button type="button" onClick={() => setAgendaDate(toLocalDateInputValue(new Date()))} className="px-2.5 py-1.5 rounded-md border border-[#2d3036] bg-transparent text-xs text-on-surface hover:bg-[#181a1c] cursor-pointer">Hoy</button>
                <button type="button" onClick={() => setAgendaDate((prev) => { const next = new Date(`${prev}T12:00:00`); next.setDate(next.getDate() + 1); return toLocalDateInputValue(next); })} className="px-2.5 py-1.5 rounded-md border border-[#2d3036] bg-transparent text-xs text-on-surface hover:bg-[#181a1c] cursor-pointer">Siguiente</button>
                <input type="date" value={agendaDate} onChange={(e) => setAgendaDate(e.target.value)} className="rounded-md border border-[#2d3036] bg-[#181a1c] text-xs text-on-surface px-2 py-1.5 outline-none font-mono" />
              </div>
            </div>

            {loadingAgendaAppointments ? (
              <div className="py-6 text-center text-xs text-on-surface-variant">Cargando agenda...</div>
            ) : agendaAppointments.length === 0 ? (
              <div className="py-6 text-center text-xs text-on-surface-variant border border-dashed border-[#2d3036] rounded-md">No hay citas programadas para este día.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {agendaAppointments.map((appointment) => {
                  const appointmentTime = appointment.appointment_date ? appointment.appointment_date.split('T')[1]?.slice(0, 5) : '00:00';
                  const isCompleted = appointment.status === 'completed';
                  const isCancelled = appointment.status === 'cancelled';
                  const isNoShow = appointment.status === 'no_show';
                  return (
                    <div key={appointment.id} className="rounded-md border border-[#2d3036] bg-[#181a1c] p-4 space-y-3 hover:border-primary/30 transition cursor-pointer">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => handleAgendaPatientSelect(appointment)} className="text-left flex-1 cursor-pointer bg-transparent border-0 p-0">
                          <div className="font-bold text-sm text-on-surface">{appointment.customer_name || 'Paciente'}</div>
                          <div className="text-[11px] text-on-surface-variant mt-1 font-mono">{appointmentTime} · {appointment.customer_phone || 'Sin teléfono'}</div>
                        </button>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${isCompleted ? 'bg-green-500/10 text-green-500' : isCancelled ? 'bg-red-500/10 text-red-500' : isNoShow ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                          {appointment.status === 'scheduled' ? 'Programada' : appointment.status === 'completed' ? 'Completada' : appointment.status === 'cancelled' ? 'Cancelada' : appointment.status === 'no_show' ? 'No asistió' : appointment.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-[11px] text-on-surface-variant">
                        <div><strong>Motivo:</strong> {appointment.visit_reason || 'Consulta'}</div>
                        {appointment.visit_reason_details && <div className="italic text-on-surface-variant/80">{appointment.visit_reason_details}</div>}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2d3036]">
                        <button type="button" onClick={() => updateAgendaAppointmentStatus(appointment.id, 'completed')} className="px-2 py-1 text-[10px] rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 cursor-pointer border-0 font-bold">Completa</button>
                        <button type="button" onClick={() => updateAgendaAppointmentStatus(appointment.id, 'cancelled')} className="px-2 py-1 text-[10px] rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer border-0 font-bold">Cancelar</button>
                        <button type="button" onClick={() => updateAgendaAppointmentStatus(appointment.id, 'no_show')} className="px-2 py-1 text-[10px] rounded-md bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 cursor-pointer border-0 font-bold">No asistió</button>
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
            {formulasSubTab === 'formulas' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
          </button>
          <button onClick={() => { setFormulasSubTab('historia_clinica'); fetchClinicalRecords(); }} className={`pb-3 font-bold text-xs uppercase tracking-wider transition relative cursor-pointer border-0 bg-transparent ${formulasSubTab === 'historia_clinica' ? 'text-primary font-bold' : 'text-on-surface-variant/60 hover:text-on-surface'}`}>
            Historia Clínica
            {formulasSubTab === 'historia_clinica' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />}
          </button>
        </div>
      )}

      {formulasSubTab === 'historia_clinica' ? renderClinicalHistoryTab() : renderFormulaForm()}

      {/* Modal Nueva Historia Clínica (Global para todas las pestañas) */}
      {isClinicalFormOpen && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-surface border border-outline/20 p-6 rounded-3xl w-full max-w-2xl shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto custom-scrollbar my-auto text-left">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">post_add</span>
                {editingClinicalRecordId ? 'Editar Historia Clínica Optométrica' : 'Nueva Historia Clínica Optométrica'}
              </h3>
              <button onClick={() => setIsClinicalFormOpen(false)} className="text-on-surface-variant hover:text-on-surface bg-transparent border-0 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClinicalRecord} className="space-y-4 text-xs">
              {/* 1. Datos del Paciente */}
              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-3">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">1. Información del Paciente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Nombre del Paciente *</label>
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={clinPatientName}
                      onChange={(e) => setClinPatientName(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Cédula / Documento</label>
                    <input
                      type="text"
                      placeholder="Ej: 1098234567"
                      value={clinPatientDoc}
                      onChange={(e) => setClinPatientDoc(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Celular</label>
                    <PhoneInput
                      value={clinPatientPhone}
                      onChange={(val) => setClinPatientPhone(val)}
                      placeholder="3189998877"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Anamnesis y Antecedentes */}
              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-3">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">2. Anamnesis & Antecedentes</h4>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Motivo de Consulta</label>
                  <input
                    type="text"
                    placeholder="Ej: Visión borrosa de lejos / Cansancio ocular..."
                    value={clinReason}
                    onChange={(e) => setClinReason(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-on-surface-variant block text-xs">Posibles Enfermedades / Antecedentes (Marcar las que apliquen)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#181a1c] p-3 rounded-md border border-[#2d3036]">
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input type="checkbox" checked={diseaseCheckboxes.estrabismo} onChange={(e) => setDiseaseCheckboxes(prev => ({ ...prev, estrabismo: e.target.checked }))} className="accent-primary w-4 h-4 rounded cursor-pointer" />
                      <span>Estrabismo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input type="checkbox" checked={diseaseCheckboxes.carnosidad} onChange={(e) => setDiseaseCheckboxes(prev => ({ ...prev, carnosidad: e.target.checked }))} className="accent-primary w-4 h-4 rounded cursor-pointer" />
                      <span>Carnosidad / Pterigión</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input type="checkbox" checked={diseaseCheckboxes.cataratas} onChange={(e) => setDiseaseCheckboxes(prev => ({ ...prev, cataratas: e.target.checked }))} className="accent-primary w-4 h-4 rounded cursor-pointer" />
                      <span>Cataratas</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input type="checkbox" checked={diseaseCheckboxes.hipertension} onChange={(e) => setDiseaseCheckboxes(prev => ({ ...prev, hipertension: e.target.checked }))} className="accent-primary w-4 h-4 rounded cursor-pointer" />
                      <span>Hipertensión</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input type="checkbox" checked={diseaseCheckboxes.diabetes} onChange={(e) => setDiseaseCheckboxes(prev => ({ ...prev, diabetes: e.target.checked }))} className="accent-primary w-4 h-4 rounded cursor-pointer" />
                      <span>Diabetes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input type="checkbox" checked={diseaseCheckboxes.cirugia} onChange={(e) => setDiseaseCheckboxes(prev => ({ ...prev, cirugia: e.target.checked }))} className="accent-primary w-4 h-4 rounded cursor-pointer" />
                      <span>Cirugía Ocular</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Notas Antecedentes Médicos</label>
                    <input
                      type="text"
                      placeholder="Ej: Hipertensión en tratamiento..."
                      value={clinMedAntecedents}
                      onChange={(e) => setClinMedAntecedents(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Notas Antecedentes Oculares</label>
                    <input
                      type="text"
                      placeholder="Ej: Cirugía Láser en 2020..."
                      value={clinOcuAntecedents}
                      onChange={(e) => setClinOcuAntecedents(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Examen Físico Ocular */}
              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-3">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">3. Examen Clínico (Agudeza Visual & Tonometría)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant text-[10px]">AV OD</label>
                    <input
                      type="text"
                      placeholder="20/20"
                      value={clinAvOd}
                      onChange={(e) => setClinAvOd(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant text-[10px]">AV OI</label>
                    <input
                      type="text"
                      placeholder="20/20"
                      value={clinAvOi}
                      onChange={(e) => setClinAvOi(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant text-[10px]">Tonometría OD (PIO)</label>
                    <input
                      type="text"
                      placeholder="14 mmHg"
                      value={clinTonoOd}
                      onChange={(e) => setClinTonoOd(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant text-[10px]">Tonometría OI (PIO)</label>
                    <input
                      type="text"
                      placeholder="14 mmHg"
                      value={clinTonoOi}
                      onChange={(e) => setClinTonoOi(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Refracción Prescrita OD</label>
                    <input
                      type="text"
                      placeholder="Ej: -1.50 -0.50 x 180°"
                      value={clinRefrOd}
                      onChange={(e) => setClinRefrOd(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Refracción Prescrita OI</label>
                    <input
                      type="text"
                      placeholder="Ej: -1.25 -0.75 x 175°"
                      value={clinRefrOi}
                      onChange={(e) => setClinRefrOi(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Oftalmoscopía / Biomicroscopía (Fondo de ojo, cristalino)</label>
                  <input
                    type="text"
                    placeholder="Ej: Medios transparentes, papila de bordes nítidos..."
                    value={clinOphthalNotes}
                    onChange={(e) => setClinOphthalNotes(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* 4. Diagnóstico y Conducta */}
              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-3">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">4. Diagnóstico & Conducta</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Diagnóstico Clínico *</label>
                    <input
                      type="text"
                      placeholder="Ej: Astigmatismo Miópico Compuesto"
                      value={clinDiagnosis}
                      onChange={(e) => setClinDiagnosis(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-on-surface-variant">Optómetra Tratante</label>
                    <input
                      type="text"
                      placeholder="Ej: Dr. Fernando Gómez"
                      value={clinOptometrist}
                      onChange={(e) => setClinOptometrist(e.target.value)}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Plan de Manejo / Recomendaciones</label>
                  <textarea
                    placeholder="Ej: Lentes progresivos digital con filtro luz azul y antirreflejo verde. Control en 1 año..."
                    value={clinTreatmentPlan}
                    onChange={(e) => setClinTreatmentPlan(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary h-16 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-outline/10">
                <button
                  type="button"
                  onClick={() => setIsClinicalFormOpen(false)}
                  className="px-4 py-2 border border-outline/20 rounded-xl text-on-surface text-xs hover:bg-surface-container cursor-pointer bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl text-xs hover:opacity-90 transition cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Guardar Historia Clínica
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Ver Historia Clínica (Detalle Lectura) */}
      {viewingClinicalRecord && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#141517] border border-[#2d3036] p-6 rounded-3xl w-full max-w-2xl shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto custom-scrollbar my-auto text-left">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">clinical_notes</span>
                Historia Clínica Optométrica
              </h3>
              <button onClick={() => setViewingClinicalRecord(null)} className="text-on-surface-variant hover:text-on-surface bg-transparent border-0 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-2">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">1. Información del Paciente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div><strong>Nombre:</strong> {viewingClinicalRecord.customer_name}</div>
                  <div><strong>Cédula:</strong> {viewingClinicalRecord.customer_document || 'N/A'}</div>
                  <div><strong>Teléfono:</strong> {viewingClinicalRecord.customer_phone || 'N/A'}</div>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-2">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">2. Anamnesis & Antecedentes</h4>
                <div><strong>Motivo de Consulta:</strong> {viewingClinicalRecord.consultation_reason || 'Control visual'}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <div><strong>Antecedentes Médicos:</strong> {viewingClinicalRecord.medical_antecedents || 'Sin reporte'}</div>
                  <div><strong>Antecedentes Oculares:</strong> {viewingClinicalRecord.ocular_antecedents || 'Sin reporte'}</div>
                </div>
              </div>

              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-2">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">3. Examen Físico Ocular</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div><strong>AV OD:</strong> {viewingClinicalRecord.visual_acuity_od || '20/20'}</div>
                  <div><strong>AV OI:</strong> {viewingClinicalRecord.visual_acuity_oi || '20/20'}</div>
                  <div><strong>PIO OD:</strong> {viewingClinicalRecord.tonometry_od || '14 mmHg'}</div>
                  <div><strong>PIO OI:</strong> {viewingClinicalRecord.tonometry_oi || '14 mmHg'}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono">
                  <div><strong>Refracción OD:</strong> {viewingClinicalRecord.refraction_od || 'Plano'}</div>
                  <div><strong>Refracción OI:</strong> {viewingClinicalRecord.refraction_oi || 'Plano'}</div>
                </div>
                {viewingClinicalRecord.ophthalmoscopy_notes && (
                  <div className="mt-1"><strong>Oftalmoscopía:</strong> {viewingClinicalRecord.ophthalmoscopy_notes}</div>
                )}
              </div>

              <div className="p-3.5 bg-surface-container/30 border border-outline/10 rounded-2xl space-y-2">
                <h4 className="font-bold text-xs text-primary uppercase tracking-wider">4. Diagnóstico & Conducta</h4>
                <div><strong>Diagnóstico:</strong> {viewingClinicalRecord.diagnosis || 'Refracción'}</div>
                <div><strong>Plan de Manejo:</strong> {viewingClinicalRecord.treatment_plan || 'Prescripción de lentes y control en 1 año.'}</div>
                <div className="pt-2 border-t border-outline/10"><strong>Optómetra:</strong> {viewingClinicalRecord.optometrist_name || 'Especialista'}</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline/10">
              <button
                type="button"
                onClick={() => {
                  const rec = viewingClinicalRecord;
                  setViewingClinicalRecord(null);
                  handleEditClinicalRecord(rec);
                }}
                className="px-4 py-2 bg-amber-500/20 text-amber-400 font-bold rounded-xl text-xs hover:bg-amber-500/30 transition cursor-pointer border border-amber-500/30 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Editar
              </button>
              <button
                type="button"
                onClick={() => handlePrintClinicalRecord(viewingClinicalRecord)}
                className="px-4 py-2 bg-primary text-on-primary font-bold rounded-xl text-xs hover:opacity-90 transition cursor-pointer border-0 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => setViewingClinicalRecord(null)}
                className="px-4 py-2 border border-outline/20 rounded-xl text-on-surface text-xs hover:bg-surface-container cursor-pointer bg-transparent"
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
