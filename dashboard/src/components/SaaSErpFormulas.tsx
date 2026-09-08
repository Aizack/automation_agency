import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';
import { SaaSErpLabJobs } from './SaaSErpLabJobs';

interface FormulasProps {
  clientId: string;
  defaultSubTab?: 'formulas' | 'lab_jobs' | 'historia_clinica';
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
  od_prism?: string | null;
  od_av?: string | null;
  oi_sphere: string | null;
  oi_cylinder: string | null;
  oi_axis: string | null;
  oi_addition: string | null;
  oi_prism?: string | null;
  oi_av?: string | null;
  dp_distance: string | null;
  height: string | null;
  notes: string | null;
  created_at: string;
}

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
  const [clinFamAntecedents, setClinFamAntecedents] = useState('');

  // Área 1: Exámenes Anteriores (Último examen previo)
  const [prevExamDate, setPrevExamDate] = useState('Sin registro previo');
  const [prevOdEsf, setPrevOdEsf] = useState('');
  const [prevOdCil, setPrevOdCil] = useState('');
  const [prevOdEje, setPrevOdEje] = useState('');
  const [prevOdAdd, setPrevOdAdd] = useState('');
  const [prevOdAv, setPrevOdAv] = useState('20/20');
  const [prevOiEsf, setPrevOiEsf] = useState('');
  const [prevOiCil, setPrevOiCil] = useState('');
  const [prevOiEje, setPrevOiEje] = useState('');
  const [prevOiAdd, setPrevOiAdd] = useState('');
  const [prevOiAv, setPrevOiAv] = useState('20/20');

  // Área 2: Exámenes Recientes (Consulta Actual)
  const [recentOdEsf, setRecentOdEsf] = useState('');
  const [recentOdCil, setRecentOdCil] = useState('');
  const [recentOdEje, setRecentOdEje] = useState('');
  const [recentOdAdd, setRecentOdAdd] = useState('');
  const [recentOdAv, setRecentOdAv] = useState('20/20');
  const [recentOiEsf, setRecentOiEsf] = useState('');
  const [recentOiCil, setRecentOiCil] = useState('');
  const [recentOiEje, setRecentOiEje] = useState('');
  const [recentOiAdd, setRecentOiAdd] = useState('');
  const [recentOiAv, setRecentOiAv] = useState('20/20');

  // Pruebas Complementarias
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
    alergias: false,
    familiares: false
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
  
  // Ophthalmic inputs (Matriz de Prescripción)
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

  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    nit: string;
    address: string;
    phone: string;
    logo_url?: string | null;
  }>({
    name: 'ÓPTICA Y CENTRO VISUAL',
    nit: 'NIT 900.123.456-7',
    address: 'Dirección Principal # 12 - 34',
    phone: '+57 300 123 4567',
    logo_url: null
  });

  const fetchBusinessInfo = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && (json.data || json.client)) {
        const c = json.data || json.client;
        setBusinessInfo({
          name: c.company_name || c.name || 'ÓPTICA Y CENTRO VISUAL',
          nit: c.nit || c.tax_id || (c.document_number ? `NIT ${c.document_number}` : 'NIT 900.123.456-7'),
          address: c.address || 'Dirección Principal',
          phone: c.phone || '+57 300 123 4567',
          logo_url: c.logo_url || null
        });
      }
    } catch (err) {
      console.error("Error fetching business info:", err);
    }
  };

  const handlePrintFormula = (formulaData: any, customerData?: any) => {
    const printWin = window.open('', '_blank', 'width=750,height=850');
    if (!printWin) return;

    const custName = customerData ? `${customerData.name} ${customerData.last_name || ''}`.trim() : formulaData.customer_name || selectedCustomer?.name || 'Paciente';
    const custDoc = customerData?.document_number || formulaData.customer_document_number || selectedCustomer?.document_number || 'N/A';
    const custPhone = customerData?.phone || formulaData.customer_phone || selectedCustomer?.phone || 'N/A';
    const dateStr = formulaData.created_at ? new Date(formulaData.created_at).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO');

    const odSph = formulaData.od_sphere || odSphere || '---';
    const odCyl = formulaData.od_cylinder || odCylinder || '---';
    const odAx = formulaData.od_axis || odAxis || '---';
    const odAdd = formulaData.od_addition || odAddition || '---';
    const odPrs = formulaData.od_prism || odPrism || '---';
    const odVisualAcuity = formulaData.od_av || odAv || '20/20';

    const oiSph = formulaData.oi_sphere || oiSphere || '---';
    const oiCyl = formulaData.oi_cylinder || oiCylinder || '---';
    const oiAx = formulaData.oi_axis || oiAxis || '---';
    const oiAdd = formulaData.oi_addition || oiAddition || '---';
    const oiPrs = formulaData.oi_prism || oiPrism || '---';
    const oiVisualAcuity = formulaData.oi_av || oiAv || '20/20';

    const dp = formulaData.dp_distance || dpDistance || '---';
    const alt = formulaData.height || height || '---';
    const obs = formulaData.notes || notes || 'Ninguna';

    printWin.document.write(`
      <html>
        <head>
          <title>Fórmula Óptica - ${custName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #161616; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; border-bottom: 2px solid #161616; padding-bottom: 12px; margin-bottom: 15px; }
            .logo-container { text-align: center; margin-bottom: 8px; }
            .logo-container img { max-height: 60px; max-width: 180px; object-fit: contain; }
            .biz-name { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #161616; }
            .biz-details { font-size: 11px; color: #555; margin-top: 3px; font-family: monospace; }
            .title { font-size: 13px; font-weight: bold; text-align: center; margin-top: 10px; text-transform: uppercase; background: #FAF8F5; padding: 6px; border: 1px solid #E2DFD7; font-family: monospace; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; margin-bottom: 10px; font-family: monospace; font-size: 11px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; font-family: monospace; font-size: 11px; }
            .table th, .table td { border: 1px solid #161616; padding: 6px; text-align: center; }
            .table th { background: #FAF8F5; font-size: 10px; text-transform: uppercase; }
            .footer { margin-top: 40px; text-align: center; }
            .signature { margin-top: 40px; display: inline-block; border-top: 1px solid #161616; width: 220px; padding-top: 5px; font-weight: bold; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            ${businessInfo.logo_url ? `<div class="logo-container"><img src="${businessInfo.logo_url}" alt="Logo" /></div>` : ''}
            <div class="biz-name">${businessInfo.name}</div>
            <div class="biz-details">${businessInfo.nit} | Dir: ${businessInfo.address} | Tel: ${businessInfo.phone}</div>
          </div>

          <div class="title">PRESCRIPCIÓN ÓPTICA / FÓRMULA DE GAFAS</div>

          <div class="grid">
            <div><strong>Paciente:</strong> ${custName}</div>
            <div><strong>Fecha:</strong> ${dateStr}</div>
            <div><strong>Cédula:</strong> ${custDoc}</div>
            <div><strong>Teléfono:</strong> ${custPhone}</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>OJO</th>
                <th>ESFERA (ESF)</th>
                <th>CILINDRO (CIL)</th>
                <th>EJE</th>
                <th>ADICIÓN (ADD)</th>
                <th>PRISMA</th>
                <th>AV</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>O.D. (Derecho)</strong></td>
                <td>${odSph}</td>
                <td>${odCyl}</td>
                <td>${odAx ? `${odAx}°` : '---'}</td>
                <td>${odAdd}</td>
                <td>${odPrs}</td>
                <td>${odVisualAcuity}</td>
              </tr>
              <tr>
                <td><strong>O.I. (Izquierdo)</strong></td>
                <td>${oiSph}</td>
                <td>${oiCyl}</td>
                <td>${oiAx ? `${oiAx}°` : '---'}</td>
                <td>${oiAdd}</td>
                <td>${oiPrs}</td>
                <td>${oiVisualAcuity}</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top:12px; font-family:monospace; display:flex; justify-content:space-between; background:#FAF8F5; padding:8px; border:1px solid #E2DFD7; font-size:11px;">
            <span><strong>DP (Distancia Pupilar):</strong> ${dp} mm</span>
            <span><strong>ALT (Altura de Montaje):</strong> ${alt} mm</span>
          </div>

          <div style="margin-top:12px; font-family:monospace; font-size:11px;">
            <strong>Indicaciones & Observaciones:</strong> ${obs}
          </div>

          <div class="footer">
            <div class="signature">
              Dr. Optómetra Especialista<br>
              <span style="font-size:10px; font-weight:normal; color:#666;">Firma y Registro Profesional</span>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  useEffect(() => {
    fetchCustomers();
    fetchBusinessInfo();
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

  const handleOpenNewClinicalRecordModal = (cust?: Customer | null) => {
    const targetCust = cust || selectedCustomer;
    setEditingClinicalRecordId(null);
    setClinPatientName(targetCust ? `${targetCust.name} ${targetCust.last_name || ''}`.trim() : '');
    setClinPatientDoc(targetCust?.document_number || '');
    setClinPatientPhone(targetCust?.phone || '');
    setClinReason('');
    setClinMedAntecedents('');
    setClinOcuAntecedents('');
    setClinFamAntecedents('');

    // Pre-poblar Examen Reciente con la fórmula que el doctor acaba de digitar
    setRecentOdEsf(odSphere || '');
    setRecentOdCil(odCylinder || '');
    setRecentOdEje(odAxis || '');
    setRecentOdAdd(odAddition || '');
    setRecentOdAv(odAv || '20/20');

    setRecentOiEsf(oiSphere || '');
    setRecentOiCil(oiCylinder || '');
    setRecentOiEje(oiAxis || '');
    setRecentOiAdd(oiAddition || '');
    setRecentOiAv(oiAv || '20/20');

    // Cargar Examen Anterior desde el historial de fórmulas si existe
    if (formulasHistory && formulasHistory.length > 0) {
      const prev = formulasHistory[0];
      setPrevExamDate(new Date(prev.created_at).toLocaleDateString('es-CO'));
      setPrevOdEsf(prev.od_sphere || '---');
      setPrevOdCil(prev.od_cylinder || '---');
      setPrevOdEje(prev.od_axis ? `${prev.od_axis}°` : '---');
      setPrevOdAdd(prev.od_addition || '---');
      setPrevOdAv(prev.od_av || '20/20');

      setPrevOiEsf(prev.oi_sphere || '---');
      setPrevOiCil(prev.oi_cylinder || '---');
      setPrevOiEje(prev.oi_axis ? `${prev.oi_axis}°` : '---');
      setPrevOiAdd(prev.oi_addition || '---');
      setPrevOiAv(prev.oi_av || '20/20');
    } else {
      setPrevExamDate('Sin antecedentes registrados');
      setPrevOdEsf('---'); setPrevOdCil('---'); setPrevOdEje('---'); setPrevOdAdd('---'); setPrevOdAv('20/20');
      setPrevOiEsf('---'); setPrevOiCil('---'); setPrevOiEje('---'); setPrevOiAdd('---'); setPrevOiAv('20/20');
    }

    setClinTonoOd('14 mmHg');
    setClinTonoOi('14 mmHg');
    setClinOphthalNotes('');
    setClinDiagnosis('');
    setClinTreatmentPlan('');
    setClinOptometrist('Dr. Optómetra Especialista');

    setDiseaseCheckboxes({
      estrabismo: false,
      carnosidad: false,
      cataratas: false,
      hipertension: false,
      diabetes: false,
      cirugia: false,
      alergias: false,
      familiares: false
    });

    setIsClinicalFormOpen(true);
  };

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

    const finalMedAntecedents = [
      prevExamDate !== 'Sin antecedentes registrados' ? `[Examen Previo (${prevExamDate}): OD ${prevOdEsf}/${prevOdCil}/${prevOdEje} | OI ${prevOiEsf}/${prevOiCil}/${prevOiEje}]` : null,
      checkedDiseases,
      clinMedAntecedents,
      clinFamAntecedents ? `Familiares: ${clinFamAntecedents}` : null
    ].filter(Boolean).join(' | ');

    const refractionOdStr = `Esf: ${recentOdEsf || 'Plano'} | Cil: ${recentOdCil || '---'} | Eje: ${recentOdEje ? `${recentOdEje}°` : '---'} | Add: ${recentOdAdd || '---'}`;
    const refractionOiStr = `Esf: ${recentOiEsf || 'Plano'} | Cil: ${recentOiCil || '---'} | Eje: ${recentOiEje ? `${recentOiEje}°` : '---'} | Add: ${recentOiAdd || '---'}`;

    try {
      setLoadingClinical(true);
      const endpoint = editingClinicalRecordId
        ? `/api/clients/${clientId}/clinical-records/${editingClinicalRecordId}`
        : `/api/clients/${clientId}/clinical-records`;
      const method = editingClinicalRecordId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
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
          visualAcuityOd: recentOdAv,
          visualAcuityOi: recentOiAv,
          refractionOd: refractionOdStr,
          refractionOi: refractionOiStr,
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
        setEditingClinicalRecordId(null);
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
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #161616; font-size: 12px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #161616; padding-bottom: 12px; margin-bottom: 15px; }
            .logo-container { text-align: center; margin-bottom: 8px; }
            .logo-container img { max-height: 60px; max-width: 180px; object-fit: contain; }
            .biz-name { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #161616; }
            .biz-details { font-size: 11px; color: #555; margin-top: 3px; font-family: monospace; }
            .title { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; background: #FAF8F5; padding: 6px; border: 1px solid #E2DFD7; margin-top: 10px; font-family: monospace; }
            .date-subtitle { font-size: 11px; color: #666; margin-top: 4px; font-family: monospace; }
            .section-title { font-size: 11px; font-weight: bold; background: #FAF8F5; padding: 5px 10px; border-left: 3px solid #161616; margin-top: 15px; margin-bottom: 8px; text-transform: uppercase; font-family: monospace; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-family: monospace; font-size: 11px; }
            .field { margin-bottom: 6px; font-family: monospace; }
            .label { font-weight: bold; color: #444; }
            .table { width: 100%; border-collapse: collapse; margin-top: 8px; font-family: monospace; font-size: 11px; }
            .table th, .table td { border: 1px solid #161616; padding: 6px; text-align: center; }
            .table th { background: #FAF8F5; font-size: 10px; text-transform: uppercase; }
            .footer { margin-top: 40px; text-align: center; }
            .signature { margin-top: 40px; display: inline-block; border-top: 1px solid #161616; width: 250px; padding-top: 5px; font-weight: bold; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            ${businessInfo.logo_url ? `<div class="logo-container"><img src="${businessInfo.logo_url}" alt="Logo" /></div>` : ''}
            <div class="biz-name">${businessInfo.name}</div>
            <div class="biz-details">${businessInfo.nit} | Dir: ${businessInfo.address} | Tel: ${businessInfo.phone}</div>
            <div class="title">HISTORIA CLÍNICA OPTOMÉTRICA</div>
            <div class="date-subtitle">Fecha de Examen: ${new Date(record.created_at).toLocaleDateString('es-CO')} ${new Date(record.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
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
          <div class="grid" style="margin-top:6px;">
            <div class="field"><span class="label">Antecedentes Médicos / RX Previa:</span> ${record.medical_antecedents || 'Ninguno reportado'}</div>
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
            <div style="margin-top:8px;" class="field">
              <span class="label">Oftalmoscopía / Biomicroscopía:</span> ${record.ophthalmoscopy_notes}
            </div>
          ` : ''}

          <div class="section-title">4. Diagnóstico y Plan de Manejo</div>
          <div class="field"><span class="label">Diagnóstico Clínico:</span> ${record.diagnosis || 'Vicio de refracción general'}</div>
          <div class="field" style="margin-top:6px;"><span class="label">Plan de Tratamiento / Conducta:</span> ${record.treatment_plan || 'Uso permanente de corrección óptica con filtro azul anti-reflejo.'}</div>

          <div class="footer">
            <div class="signature">
              ${record.optometrist_name || 'Optómetra Tratante'}<br>
              <span style="font-size:10px; font-weight:normal; color:#666;">Firma y Registro Profesional</span>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
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

  return (
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header Principal Wabi-Sabi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            OPTOMETRÍA & SALUD OCULAR
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
            Optometría & Fórmulas de Gafas
          </h2>
          <p className="text-xs text-[#76746E] mt-1.5">
            Prescripción óptica, refracción computarizada, agudeza visual e historias clínicas completas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {formulasSubTab === 'formulas' && selectedCustomer && (
            <>
              <button
                type="button"
                onClick={() => handleOpenNewClinicalRecordModal(selectedCustomer)}
                className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-1.5 shadow-2xs rounded-none"
              >
                <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                + Nueva Historia Clínica
              </button>
              <button
                type="button"
                onClick={() => handlePrintFormula({
                  od_sphere: odSphere, od_cylinder: odCylinder, od_axis: odAxis, od_addition: odAddition, od_prism: odPrism, od_av: odAv,
                  oi_sphere: oiSphere, oi_cylinder: oiCylinder, oi_axis: oiAxis, oi_addition: oiAddition, oi_prism: oiPrism, oi_av: oiAv,
                  dp_distance: dpDistance, height, notes
                })}
                className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-white border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-1.5 shadow-xs rounded-none"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Imprimir Prescripción
              </button>
            </>
          )}

          {formulasSubTab === 'historia_clinica' && (
            <button
              type="button"
              onClick={() => handleOpenNewClinicalRecordModal(null)}
              className="px-4 py-2 bg-[#161616] text-[#F6F4EE] hover:bg-[#2b2b2b] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-xs rounded-none"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Nueva Historia Clínica
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navegación / Barra Zen de Pestañas */}
      {showSubTabs && (
        <div className="bg-white border border-[#E2DFD7] p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs rounded-none">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setFormulasSubTab('formulas')}
              className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border rounded-none ${
                formulasSubTab === 'formulas'
                  ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                  : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              Prescripción & Fórmulas
            </button>

            <button
              type="button"
              onClick={() => setFormulasSubTab('historia_clinica')}
              className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border rounded-none ${
                formulasSubTab === 'historia_clinica'
                  ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                  : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
              Historias Clínicas
            </button>

            <button
              type="button"
              onClick={() => setFormulasSubTab('lab_jobs')}
              className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border rounded-none ${
                formulasSubTab === 'lab_jobs'
                  ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                  : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">precision_manufacturing</span>
              Órdenes de Laboratorio
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 1: FÓRMULAS & PRESCRIPCIÓN */}
      {formulasSubTab === 'formulas' && (
        <div className="space-y-6">
          {/* Citas del Día para Atención Rápida */}
          <div className="bg-white border border-[#E2DFD7] p-4 shadow-xs rounded-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DFD7] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#D9381E] text-[18px]">calendar_today</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#161616]">
                  Pacientes Citados para Hoy / Fecha:
                </span>
                <input
                  type="date"
                  value={agendaDate}
                  onChange={(e) => setAgendaDate(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#E2DFD7] px-2.5 py-1 text-xs font-mono text-[#161616] outline-none rounded-none cursor-pointer"
                />
              </div>
              <span className="text-[11px] font-mono text-[#76746E]">
                {agendaAppointments.length} Cita(s) en agenda
              </span>
            </div>

            {loadingAgendaAppointments ? (
              <p className="text-xs font-mono text-[#76746E] py-2">Consultando agenda...</p>
            ) : agendaAppointments.length === 0 ? (
              <p className="text-xs font-mono text-[#76746E] italic py-1">
                No hay citas agendadas para esta fecha. Puedes buscar al paciente directamente en el buscador inferior.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {agendaAppointments.map((appt) => (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => handleAgendaPatientSelect(appt)}
                    className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] text-xs font-mono text-[#161616] transition cursor-pointer flex items-center gap-2 rounded-none shadow-2xs"
                  >
                    <span className="w-2 h-2 bg-[#D9381E]"></span>
                    <strong>{appt.appointment_date ? appt.appointment_date.split('T')[1]?.slice(0, 5) : '00:00'}</strong>
                    <span>{appt.customer_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buscador de Paciente */}
          <div className="bg-white border border-[#E2DFD7] p-5 shadow-xs rounded-none">
            <div className="space-y-1 relative" ref={dropdownRef}>
              <label className="block text-[10px] font-bold text-[#D9381E] uppercase tracking-wider font-mono">
                Buscar Paciente en el Directorio CRM
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76746E] text-[18px]">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] pl-10 pr-4 py-2.5 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  placeholder="Escribe nombre, número de cédula o teléfono del paciente..."
                />
              </div>

              {showSuggestions && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#161616] rounded-none shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-[#E2DFD7]">
                  {filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        handleSelectCustomer(c);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left p-3 hover:bg-[#FAF8F5] text-xs text-[#161616] flex justify-between items-center transition-colors cursor-pointer border-0 bg-transparent font-mono"
                    >
                      <div>
                        <p className="font-bold text-[#161616]">{c.name} {c.last_name || ''}</p>
                        <p className="text-[10px] text-[#76746E]">{c.phone} | {c.email || 'Sin correo'}</p>
                      </div>
                      <span className="text-[9px] bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] px-2 py-0.5 font-bold uppercase shrink-0">
                        Doc: {c.document_number}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Paciente Seleccionado Info Card */}
            {selectedCustomer && (
              <div className="mt-4 pt-4 border-t border-[#E2DFD7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF8F5] p-3 border">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] block">Paciente en Consulta Activa</span>
                  <p className="text-base font-bold text-[#161616] font-mono">{selectedCustomer.name} {selectedCustomer.last_name || ''}</p>
                  <p className="text-xs text-[#76746E] font-mono">
                    Doc: {selectedCustomer.document_number} • WhatsApp: {selectedCustomer.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewPatientClinicalRecord(selectedCustomer)}
                    className="px-3 py-1.5 bg-white border border-[#E2DFD7] hover:border-[#161616] text-xs font-mono font-bold text-[#161616] uppercase transition cursor-pointer shadow-2xs rounded-none"
                  >
                    Ver Historia
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewClinicalRecordModal(selectedCustomer)}
                    className="px-3 py-1.5 bg-[#161616] text-[#F6F4EE] hover:bg-[#2b2b2b] text-xs font-mono font-bold uppercase transition cursor-pointer shadow-2xs rounded-none flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">clinical_notes</span>
                    + Nueva Historia
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Formulario de Prescripción Oftálmica Matriz OD / OI */}
          <form onSubmit={handleSaveFormula} className="bg-white border border-[#E2DFD7] p-6 shadow-xs rounded-none space-y-6">
            <div className="border-b border-[#E2DFD7] pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-wider font-mono block">MATRIZ DE REFRACCIÓN</span>
                <h3 className="font-serif text-xl font-normal text-[#161616]">Prescripción Óptica</h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => handleOpenNewClinicalRecordModal(selectedCustomer)}
                    className="px-3.5 py-1.5 bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 shadow-2xs rounded-none"
                  >
                    <span className="material-symbols-outlined text-[15px]">clinical_notes</span>
                    Nueva Historia Médica
                  </button>
                )}
                {saveSuccess && (
                  <span className="text-xs font-mono font-bold text-[#2E7D32] bg-[#E6F4EA] border border-[#CEEAD6] px-3 py-1">
                    ✓ Fórmula Guardada Exitosamente
                  </span>
                )}
              </div>
            </div>

            {/* TABLA MATRIZ OD / OI */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Ojo</th>
                    <th className="py-2.5 px-3">Esfera (ESF)</th>
                    <th className="py-2.5 px-3">Cilindro (CIL)</th>
                    <th className="py-2.5 px-3">Eje (°)</th>
                    <th className="py-2.5 px-3">Adición (ADD)</th>
                    <th className="py-2.5 px-3">Prisma</th>
                    <th className="py-2.5 px-3">Agudeza (AV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2DFD7]">
                  {/* OJO DERECHO (OD) */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#161616] bg-[#FAF8F5] border-r border-[#E2DFD7] whitespace-nowrap">
                      O.D. (Derecho)
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: -1.50"
                        value={odSphere}
                        onChange={(e) => setOdSphere(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: -0.75"
                        value={odCylinder}
                        onChange={(e) => setOdCylinder(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: 90"
                        value={odAxis}
                        onChange={(e) => setOdAxis(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: +1.75"
                        value={odAddition}
                        onChange={(e) => setOdAddition(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: 1Δ Base Up"
                        value={odPrism}
                        onChange={(e) => setOdPrism(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="20/20"
                        value={odAv}
                        onChange={(e) => setOdAv(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                  </tr>

                  {/* OJO IZQUIERDO (OI) */}
                  <tr>
                    <td className="py-3 px-3 font-bold text-[#161616] bg-[#FAF8F5] border-r border-[#E2DFD7] whitespace-nowrap">
                      O.I. (Izquierdo)
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: -1.25"
                        value={oiSphere}
                        onChange={(e) => setOiSphere(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: -0.50"
                        value={oiCylinder}
                        onChange={(e) => setOiCylinder(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: 85"
                        value={oiAxis}
                        onChange={(e) => setOiAxis(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: +1.75"
                        value={oiAddition}
                        onChange={(e) => setOiAddition(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Ej: ---"
                        value={oiPrism}
                        onChange={(e) => setOiPrism(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="20/20"
                        value={oiAv}
                        onChange={(e) => setOiAv(e.target.value)}
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Parámetros de Montaje y Observaciones */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">
                  Distancia Pupilar (DP mm)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 62"
                  value={dpDistance}
                  onChange={(e) => setDpDistance(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">
                  Altura de Montaje (ALT mm)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 18"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">
                  Observaciones & Tratamientos
                </label>
                <input
                  type="text"
                  placeholder="Ej: Antirreflejo Blue Protect, Policarbonato..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-[#E2DFD7]">
              {selectedCustomer ? (
                <button
                  type="button"
                  onClick={() => handleOpenNewClinicalRecordModal(selectedCustomer)}
                  className="px-4 py-2 bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] font-mono font-bold text-xs uppercase cursor-pointer transition flex items-center gap-1.5 shadow-2xs rounded-none"
                >
                  <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
                  Abrir Historia Clínica Completa
                </button>
              ) : <div></div>}

              <button
                type="submit"
                disabled={saving || !selectedCustomer}
                className="px-6 py-2.5 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold uppercase text-xs cursor-pointer transition flex items-center gap-2 disabled:opacity-40 rounded-none shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                {saving ? 'Guardando...' : 'Guardar Prescripción en CRM'}
              </button>
            </div>
          </form>

          {/* Historial de Fórmulas Anteriores del Paciente */}
          {selectedCustomer && (
            <div className="bg-white border border-[#E2DFD7] p-6 shadow-xs rounded-none space-y-4">
              <div className="border-b border-[#E2DFD7] pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-wider font-mono block">HISTORIAL CRONOLÓGICO</span>
                  <h3 className="font-serif text-lg font-normal text-[#161616]">Prescripciones Anteriores</h3>
                </div>
                <span className="text-xs font-mono text-[#76746E]">
                  {formulasHistory.length} Fórmulas Registradas
                </span>
              </div>

              {loadingHistory ? (
                <p className="text-xs font-mono text-[#76746E] py-4 text-center">Cargando historial...</p>
              ) : formulasHistory.length === 0 ? (
                <p className="text-xs font-mono text-[#76746E] py-4 text-center italic">
                  Este paciente no tiene fórmulas anteriores guardadas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">O.D. (Derecho)</th>
                        <th className="py-2.5 px-3">O.I. (Izquierdo)</th>
                        <th className="py-2.5 px-3">DP / Alt</th>
                        <th className="py-2.5 px-3">Notas</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD7]">
                      {formulasHistory.map((f) => (
                        <tr key={f.id} className="hover:bg-[#FAF8F5] transition-colors">
                          <td className="py-3 px-3 font-bold text-[#161616] whitespace-nowrap">
                            {new Date(f.created_at).toLocaleDateString('es-CO')}
                          </td>
                          <td className="py-3 px-3 text-[#161616]">
                            Esf: {f.od_sphere || '---'} | Cil: {f.od_cylinder || '---'} | Eje: {f.od_axis ? `${f.od_axis}°` : '---'} | Add: {f.od_addition || '---'}
                          </td>
                          <td className="py-3 px-3 text-[#161616]">
                            Esf: {f.oi_sphere || '---'} | Cil: {f.oi_cylinder || '---'} | Eje: {f.oi_axis ? `${f.oi_axis}°` : '---'} | Add: {f.oi_addition || '---'}
                          </td>
                          <td className="py-3 px-3 text-[#76746E]">
                            DP: {f.dp_distance || '---'} mm | Alt: {f.height || '---'} mm
                          </td>
                          <td className="py-3 px-3 text-[#76746E] truncate max-w-xs">
                            {f.notes || '---'}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handlePrintFormula(f, selectedCustomer)}
                              className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] transition cursor-pointer shadow-2xs mr-1"
                              title="Imprimir esta fórmula"
                            >
                              Imprimir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFormula(f.id)}
                              className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] hover:bg-[#C5221F] hover:text-white transition cursor-pointer shadow-2xs"
                              title="Eliminar fórmula"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: HISTORIAS CLÍNICAS OPTOMÉTRICAS */}
      {formulasSubTab === 'historia_clinica' && (
        <div className="space-y-6">
          {/* Buscador de Historias Clínicas */}
          <div className="flex items-center gap-3 bg-white border border-[#E2DFD7] px-4 py-3 rounded-none shadow-xs">
            <span className="material-symbols-outlined text-[20px] text-[#76746E]">search</span>
            <input 
              type="text"
              value={clinicalSearch}
              onChange={(e) => setClinicalSearch(e.target.value)}
              placeholder="Buscar historia clínica por nombre de paciente o cédula..."
              className="flex-grow bg-transparent border-0 outline-none text-xs text-[#161616] focus:ring-0 placeholder:text-[#76746E]/60 font-mono"
            />
            {clinicalSearch && (
              <button 
                type="button" 
                onClick={() => setClinicalSearch('')}
                className="text-[11px] font-mono text-[#76746E] hover:text-[#161616] cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          {loadingClinical ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2DFD7] rounded-none">
              <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando historias clínicas...</p>
            </div>
          ) : clinicalRecords.length === 0 ? (
            <div className="bg-white border border-[#E2DFD7] p-12 text-center rounded-none shadow-xs space-y-2">
              <span className="material-symbols-outlined text-[#76746E] text-[36px]">clinical_notes</span>
              <p className="text-sm font-mono text-[#76746E] uppercase">No hay historias clínicas registradas.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E2DFD7] shadow-xs rounded-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Paciente</th>
                      <th className="py-3 px-4">Documento</th>
                      <th className="py-3 px-4">Fecha Examen</th>
                      <th className="py-3 px-4">Motivo / Anamnesis</th>
                      <th className="py-3 px-4">Diagnóstico</th>
                      <th className="py-3 px-4">Optómetra</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DFD7] bg-white">
                    {clinicalRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#161616]">
                          {rec.customer_name}
                        </td>
                        <td className="py-3 px-4 text-[#76746E]">
                          {rec.customer_document || '---'}
                        </td>
                        <td className="py-3 px-4 text-[#161616]">
                          {new Date(rec.created_at).toLocaleDateString('es-CO')}
                        </td>
                        <td className="py-3 px-4 text-[#161616] truncate max-w-xs">
                          {rec.consultation_reason || 'Control visual'}
                        </td>
                        <td className="py-3 px-4 text-[#161616] font-bold">
                          {rec.diagnosis || 'Refracción'}
                        </td>
                        <td className="py-3 px-4 text-[#76746E]">
                          {rec.optometrist_name || 'Dr. Optómetra'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingClinicalRecord(rec)}
                            className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] transition cursor-pointer shadow-2xs mr-1"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintClinicalRecord(rec)}
                            className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] transition cursor-pointer shadow-2xs mr-1"
                          >
                            Imprimir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClinicalRecord(rec.id)}
                            className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-[#FCE8E6] border border-[#FAD2CF] text-[#C5221F] hover:bg-[#C5221F] hover:text-white transition cursor-pointer shadow-2xs"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: ÓRDENES DE LABORATORIO */}
      {formulasSubTab === 'lab_jobs' && (
        <SaaSErpLabJobs clientId={clientId} />
      )}

      {/* MODAL CREAR / EDITAR HISTORIA CLÍNICA WABI-SABI (CON ÁREA 1 Y ÁREA 2 COMPARATIVAS) */}
      {isClinicalFormOpen && createPortal(
        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
          <div className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-4xl w-full rounded-none overflow-hidden p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">
                  HISTORIA CLÍNICA OPTOMÉTRICA
                </span>
                <h3 className="font-serif text-2xl font-normal text-[#161616]">
                  {editingClinicalRecordId ? 'Editar Historia Clínica' : 'Ficha Médica & Examen Comparativo'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsClinicalFormOpen(false);
                  setEditingClinicalRecordId(null);
                }}
                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateClinicalRecord} className="space-y-5 text-xs font-sans">
              {/* 1. Datos Básicos del Paciente */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Nombre del Paciente *</label>
                  <input
                    type="text"
                    required
                    value={clinPatientName}
                    onChange={(e) => setClinPatientName(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Cédula / Documento</label>
                  <input
                    type="text"
                    value={clinPatientDoc}
                    onChange={(e) => setClinPatientDoc(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Teléfono WhatsApp</label>
                  <input
                    type="text"
                    value={clinPatientPhone}
                    onChange={(e) => setClinPatientPhone(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>
              </div>

              {/* 2. Anamnesis */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Motivo de Consulta</label>
                <input
                  type="text"
                  placeholder="Ej: Visión borrosa lejana, cefalea frontal o control visual anual..."
                  value={clinReason}
                  onChange={(e) => setClinReason(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                />
              </div>

              {/* 3. Antecedentes con Checkboxes */}
              <div className="space-y-2 border border-[#E2DFD7] p-3 bg-white">
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Antecedentes Médicos / Oculares</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'estrabismo', label: 'Estrabismo' },
                    { key: 'carnosidad', label: 'Carnosidad / Pterigión' },
                    { key: 'cataratas', label: 'Cataratas' },
                    { key: 'hipertension', label: 'Hipertensión' },
                    { key: 'diabetes', label: 'Diabetes' },
                    { key: 'cirugia', label: 'Cirugía Ocular' },
                  ].map(d => (
                    <label key={d.key} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={(diseaseCheckboxes as any)[d.key]}
                        onChange={(e) => setDiseaseCheckboxes({ ...diseaseCheckboxes, [d.key]: e.target.checked })}
                        className="rounded-none border-[#E2DFD7] text-[#161616] focus:ring-0"
                      />
                      <span className="text-[11px] font-mono text-[#161616]">{d.label}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Otros antecedentes personales o cirugías..."
                    value={clinMedAntecedents}
                    onChange={(e) => setClinMedAntecedents(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Antecedentes familiares (glaucoma, ceguera, diabetes...)..."
                    value={clinFamAntecedents}
                    onChange={(e) => setClinFamAntecedents(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                  />
                </div>
              </div>

              {/* 4. DOS ÁREAS DE EXÁMENES COMPARATIVOS: ANTERIOR vs RECIENTE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* ÁREA A: EXÁMENES ANTERIORES */}
                <div className="bg-white border border-[#E2DFD7] p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-2">
                    <span className="text-[10px] font-bold text-[#76746E] uppercase tracking-wider font-mono">
                      1. EXÁMENES ANTERIORES (PREVIO)
                    </span>
                    <span className="text-[10px] font-mono text-[#76746E] bg-[#FAF8F5] px-2 py-0.5 border border-[#E2DFD7]">
                      {prevExamDate}
                    </span>
                  </div>

                  {/* Tabla OD / OI Anterior */}
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="text-[#76746E] text-[9px] uppercase border-b border-[#E2DFD7]">
                        <th className="pb-1">Ojo</th>
                        <th className="pb-1">Esf</th>
                        <th className="pb-1">Cil</th>
                        <th className="pb-1">Eje</th>
                        <th className="pb-1">Add</th>
                        <th className="pb-1">AV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD7]">
                      <tr>
                        <td className="py-1.5 font-bold">OD</td>
                        <td>
                          <input type="text" value={prevOdEsf} onChange={(e) => setPrevOdEsf(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOdCil} onChange={(e) => setPrevOdCil(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOdEje} onChange={(e) => setPrevOdEje(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOdAdd} onChange={(e) => setPrevOdAdd(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOdAv} onChange={(e) => setPrevOdAv(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="20/20" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold">OI</td>
                        <td>
                          <input type="text" value={prevOiEsf} onChange={(e) => setPrevOiEsf(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOiCil} onChange={(e) => setPrevOiCil(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOiEje} onChange={(e) => setPrevOiEje(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOiAdd} onChange={(e) => setPrevOiAdd(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="---" />
                        </td>
                        <td>
                          <input type="text" value={prevOiAv} onChange={(e) => setPrevOiAv(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] outline-none" placeholder="20/20" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ÁREA B: EXÁMENES RECIENTES (ACTUAL) */}
                <div className="bg-white border-2 border-[#161616] p-3.5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-2">
                    <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-wider font-mono">
                      2. EXÁMENES RECIENTES (CONSULTA ACTUAL) *
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#161616] bg-[#FAF8F5] px-2 py-0.5 border border-[#161616]">
                      Hoy / Reciente
                    </span>
                  </div>

                  {/* Tabla OD / OI Reciente */}
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="text-[#161616] text-[9px] uppercase border-b border-[#E2DFD7]">
                        <th className="pb-1">Ojo</th>
                        <th className="pb-1">Esf</th>
                        <th className="pb-1">Cil</th>
                        <th className="pb-1">Eje</th>
                        <th className="pb-1">Add</th>
                        <th className="pb-1">AV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD7]">
                      <tr>
                        <td className="py-1.5 font-bold text-[#161616]">OD</td>
                        <td>
                          <input type="text" value={recentOdEsf} onChange={(e) => setRecentOdEsf(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none font-bold" placeholder="-1.50" />
                        </td>
                        <td>
                          <input type="text" value={recentOdCil} onChange={(e) => setRecentOdCil(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none" placeholder="-0.75" />
                        </td>
                        <td>
                          <input type="text" value={recentOdEje} onChange={(e) => setRecentOdEje(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none" placeholder="90" />
                        </td>
                        <td>
                          <input type="text" value={recentOdAdd} onChange={(e) => setRecentOdAdd(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none" placeholder="+1.75" />
                        </td>
                        <td>
                          <input type="text" value={recentOdAv} onChange={(e) => setRecentOdAv(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none font-bold" placeholder="20/20" />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-[#161616]">OI</td>
                        <td>
                          <input type="text" value={recentOiEsf} onChange={(e) => setRecentOiEsf(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none font-bold" placeholder="-1.25" />
                        </td>
                        <td>
                          <input type="text" value={recentOiCil} onChange={(e) => setRecentOiCil(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none" placeholder="-0.50" />
                        </td>
                        <td>
                          <input type="text" value={recentOiEje} onChange={(e) => setRecentOiEje(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none" placeholder="85" />
                        </td>
                        <td>
                          <input type="text" value={recentOiAdd} onChange={(e) => setRecentOiAdd(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none" placeholder="+1.75" />
                        </td>
                        <td>
                          <input type="text" value={recentOiAv} onChange={(e) => setRecentOiAv(e.target.value)} className="w-full bg-[#FAF8F5] p-1 text-[11px] font-mono border border-[#E2DFD7] focus:border-[#161616] focus:bg-white outline-none font-bold" placeholder="20/20" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tonometría & Oftalmoscopía */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Tonometría OD</label>
                  <input
                    type="text"
                    value={clinTonoOd}
                    onChange={(e) => setClinTonoOd(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Tonometría OI</label>
                  <input
                    type="text"
                    value={clinTonoOi}
                    onChange={(e) => setClinTonoOi(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-mono rounded-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Optómetra Tratante</label>
                  <input
                    type="text"
                    value={clinOptometrist}
                    onChange={(e) => setClinOptometrist(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Oftalmoscopía / Fondo de Ojo</label>
                <input
                  type="text"
                  placeholder="Ej: Medios transparentes, papila de bordes nítidos, mácula y vasos normoconfigurados..."
                  value={clinOphthalNotes}
                  onChange={(e) => setClinOphthalNotes(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                />
              </div>

              {/* 5. Diagnóstico & Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Diagnóstico Clínico</label>
                  <input
                    type="text"
                    placeholder="Ej: H52.1 Miopía + H52.2 Astigmatismo Miopico"
                    value={clinDiagnosis}
                    onChange={(e) => setClinDiagnosis(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold font-mono">Plan de Manejo / Conducta</label>
                  <input
                    type="text"
                    placeholder="Ej: Prescripción óptica con lentes fotosensibles antirreflejo y control anual..."
                    value={clinTreatmentPlan}
                    onChange={(e) => setClinTreatmentPlan(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => {
                    setIsClinicalFormOpen(false);
                    setEditingClinicalRecordId(null);
                  }}
                  className="px-4 py-2 border border-[#E2DFD7] text-[#161616] hover:bg-white bg-[#FAF8F5] font-mono font-bold text-xs uppercase cursor-pointer transition rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingClinical}
                  className="px-5 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold uppercase text-xs cursor-pointer transition disabled:opacity-50 rounded-none shadow-xs"
                >
                  {loadingClinical ? 'Guardando...' : 'Guardar Historia'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL VER HISTORIA CLÍNICA WABI-SABI */}
      {viewingClinicalRecord && createPortal(
        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
          <div className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-2xl w-full rounded-none overflow-hidden p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-widest block">FICHA MÉDICA</span>
                <h3 className="font-serif text-xl font-normal text-[#161616]">{viewingClinicalRecord.customer_name}</h3>
              </div>
              <button 
                type="button"
                onClick={() => setViewingClinicalRecord(null)}
                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-[#FAF8F5] p-3 border border-[#E2DFD7]">
              <div><strong>Doc:</strong> {viewingClinicalRecord.customer_document || 'N/A'}</div>
              <div><strong>Tel:</strong> {viewingClinicalRecord.customer_phone || 'N/A'}</div>
              <div><strong>Fecha:</strong> {new Date(viewingClinicalRecord.created_at).toLocaleDateString('es-CO')}</div>
              <div><strong>Optómetra:</strong> {viewingClinicalRecord.optometrist_name || 'Especialista'}</div>
            </div>

            <div className="bg-[#FAF8F5] p-3 border border-[#E2DFD7] space-y-1">
              <strong className="text-[#D9381E] block uppercase text-[10px]">Motivo de Consulta</strong>
              <p>{viewingClinicalRecord.consultation_reason || 'Control visual de rutina'}</p>
            </div>

            <div className="bg-[#FAF8F5] p-3 border border-[#E2DFD7] space-y-1">
              <strong className="text-[#D9381E] block uppercase text-[10px]">Antecedentes</strong>
              <p>{viewingClinicalRecord.medical_antecedents || 'Ninguno reportado'}</p>
            </div>

            <div className="bg-[#FAF8F5] p-3 border border-[#E2DFD7] space-y-2">
              <strong className="text-[#D9381E] block uppercase text-[10px]">Examen Ocular</strong>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>OD:</strong> {viewingClinicalRecord.refraction_od || 'Plano'} (AV: {viewingClinicalRecord.visual_acuity_od || '20/20'})</div>
                <div><strong>OI:</strong> {viewingClinicalRecord.refraction_oi || 'Plano'} (AV: {viewingClinicalRecord.visual_acuity_oi || '20/20'})</div>
                <div><strong>Tonometría OD:</strong> {viewingClinicalRecord.tonometry_od || '14 mmHg'}</div>
                <div><strong>Tonometría OI:</strong> {viewingClinicalRecord.tonometry_oi || '14 mmHg'}</div>
              </div>
            </div>

            <div className="bg-[#FAF8F5] p-3 border border-[#E2DFD7] space-y-1">
              <strong className="text-[#D9381E] block uppercase text-[10px]">Diagnóstico & Conducta</strong>
              <p><strong>Diagnóstico:</strong> {viewingClinicalRecord.diagnosis || 'Refracción'}</p>
              <p><strong>Plan:</strong> {viewingClinicalRecord.treatment_plan || 'Control anual'}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2DFD7]">
              <button
                type="button"
                onClick={() => handlePrintClinicalRecord(viewingClinicalRecord)}
                className="px-4 py-2 bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] font-mono font-bold text-xs uppercase cursor-pointer transition rounded-none shadow-2xs"
              >
                Imprimir
              </button>
              <button
                type="button"
                onClick={() => setViewingClinicalRecord(null)}
                className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold uppercase text-xs cursor-pointer transition rounded-none shadow-xs"
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
