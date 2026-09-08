import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Customer {
    id: string;
    name: string;
    last_name?: string;
    document_type: string;
    document_number: string;
    phone: string;
    email: string | null;
    address: string | null;
    lens_prescription: string | null;
    last_interaction_at: string | null;
    created_at: string;
    customer_type?: 'persona' | 'empresa';
}

interface Invoice {
    id: string;
    invoice_number: string;
    customer_document_number: string;
    total_amount: number;
    status: string;
    due_date: string;
}

interface SaaSErpCRMProps {
    clientId: string;
    category?: string;
}

export const SaaSErpCRM: React.FC<SaaSErpCRMProps> = ({ clientId: rawClientId, category = 'optica' }) => {
    const clientId = (rawClientId && rawClientId !== 'undefined')
        ? rawClientId
        : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [crmTab, setCrmTab] = useState<'personas' | 'empresas'>('personas');

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
    const [custAppointments, setCustAppointments] = useState<any[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [custLabJobs, setCustLabJobs] = useState<any[]>([]);
    const [loadingLabJobs, setLoadingLabJobs] = useState(false);

    // Accordion visibility and search/filter states for patient profile
    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        info: true,
        formula: true,
        citas: true,
        laboratorio: true,
        facturacion: true
    });
    const [visitReasonFilter, setVisitReasonFilter] = useState<'all' | 'examen_vista' | 'venta_lentes' | 'otros'>('all');

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Form inputs
    const [custType, setCustType] = useState<'persona' | 'empresa'>('persona');
    const [custName, setCustName] = useState('');
    const [custLastName, setCustLastName] = useState('');
    const [custDocType, setCustDocType] = useState('CC');
    const [custDocNum, setCustDocNum] = useState('');
    const [custPhone, setCustPhone] = useState('');
    const [custEmail, setCustEmail] = useState('');
    const [custAddress, setCustAddress] = useState('');
    const [custPrescription, setCustPrescription] = useState('');

    // Campos estructurados de Fórmula Oftálmica
    const [odEsf, setOdEsf] = useState('');
    const [odCil, setOdCil] = useState('');
    const [odEje, setOdEje] = useState('');
    const [odAdi, setOdAdi] = useState('');
    const [odPrism, setOdPrism] = useState('');
    const [odAv, setOdAv] = useState('');

    const [oiEsf, setOiEsf] = useState('');
    const [oiCil, setOiCil] = useState('');
    const [oiEje, setOiEje] = useState('');
    const [oiAdi, setOiAdi] = useState('');
    const [oiPrism, setOiPrism] = useState('');
    const [oiAv, setOiAv] = useState('');

    const [dp, setDp] = useState('');

    const [errorMsg, setErrorMsg] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const getPrescriptionSummary = (prescriptionStr: string | null) => {
        if (!prescriptionStr) return '';
        if (category === 'optica') {
            try {
                if (prescriptionStr.trim().startsWith('{')) {
                    const parsed = JSON.parse(prescriptionStr);
                    const odSummary = parsed.od?.esf || parsed.od?.cil ? `OD(Esf:${parsed.od.esf || '0'}, Cil:${parsed.od.cil || '0'})` : '';
                    const oiSummary = parsed.oi?.esf || parsed.oi?.cil ? `OI(Esf:${parsed.oi.esf || '0'}, Cil:${parsed.oi.cil || '0'})` : '';
                    return [odSummary, oiSummary].filter(Boolean).join(' | ');
                }
            } catch (e) {
                // fall back
            }
        }
        return prescriptionStr;
    };

    const [businessInfo, setBusinessInfo] = useState<any>(null);

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
                const res = await fetch(`/api/clients/${clientId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success && json.data) {
                    setBusinessInfo(json.data);
                }
            } catch (err) {
                console.error("Error al cargar info de la empresa en CRM:", err);
            }
        };
        fetchBusiness();
    }, [clientId]);

    const handlePrintFormulaFromCrm = (parsed: any, cust: Customer | null) => {
        const printWin = window.open('', '_blank', 'width=850,height=800');
        if (!printWin) return;

        const patientName = cust ? `${cust.name} ${cust.last_name || ''}`.trim() : 'Paciente';
        const docNum = cust?.document_number || 'N/A';
        const phone = cust?.phone || 'N/A';

        const companyName = businessInfo?.name || localStorage.getItem('company_name') || 'ÓPTICA & CENTRO OPTOMÉTRICO';
        const companyNit = businessInfo?.nit || localStorage.getItem('company_nit') || 'N/A';
        const companyAddress = businessInfo?.address || localStorage.getItem('company_address') || '';
        const companyPhone = businessInfo?.phone_number || businessInfo?.agent_phone || localStorage.getItem('company_phone') || phone;
        const companyLogo = businessInfo?.logo_url || localStorage.getItem('company_logo') || '';

        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Fórmula Óptica - ${patientName}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #161616; font-size: 13px; line-height: 1.5; background: #fff; }
                .header { text-align: center; border-bottom: 2px solid #161616; padding-bottom: 14px; margin-bottom: 20px; }
                .logo { max-height: 70px; margin-bottom: 6px; object-fit: contain; }
                .brand { font-size: 22px; font-weight: 900; text-transform: uppercase; color: #161616; letter-spacing: 1px; font-family: Georgia, serif; }
                .subbrand { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #76746E; font-weight: 600; margin-top: 3px; font-family: monospace; }
                .title { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 10px; background: #161616; color: #F6F4EE; padding: 4px 14px; display: inline-block; font-family: monospace; letter-spacing: 1px; }
                .patient-box { background: #FAF8F5; border: 1px solid #E2DFD7; padding: 12px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
                .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .table th, .table td { border: 1px solid #E2DFD7; padding: 10px; text-align: center; font-size: 12px; }
                .table th { background: #FAF8F5; font-weight: 800; text-transform: uppercase; font-size: 10px; font-family: monospace; color: #76746E; }
                .table td.od { font-weight: bold; color: #161616; font-family: monospace; }
                .table td.oi { font-weight: bold; color: #D9381E; font-family: monospace; }
                .dp-box { margin-top: 15px; padding: 10px; background: #FAF8F5; border: 1px solid #E2DFD7; font-weight: bold; display: flex; justify-content: space-between; font-size: 12px; font-family: monospace; }
                .footer { margin-top: 50px; text-align: center; }
                .sig-line { display: inline-block; border-top: 1px solid #161616; width: 280px; padding-top: 6px; font-weight: bold; text-align: center; font-size: 11px; }
              </style>
            </head>
            <body>
              <div class="header">
                ${companyLogo ? `<img src="${companyLogo}" class="logo" />` : ''}
                <div class="brand">${companyName}</div>
                <div class="subbrand">
                  ${companyNit !== 'N/A' ? `NIT: ${companyNit} &nbsp;|&nbsp; ` : ''}
                  ${companyAddress ? `Dirección: ${companyAddress} &nbsp;|&nbsp; ` : ''}
                  Tel: ${companyPhone}
                </div>
                <div class="title">FÓRMULA MÉDICA DE LENTES FORMULADOS</div>
              </div>

              <div class="patient-box">
                <div><strong>Paciente:</strong> ${patientName}</div>
                <div><strong>Cédula / Doc:</strong> ${docNum}</div>
                <div><strong>Teléfono (WhatsApp):</strong> ${phone}</div>
                <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-CO')}</div>
              </div>

              <table class="table">
                <thead>
                  <tr>
                    <th>OJO</th>
                    <th>ESFERA (ESF)</th>
                    <th>CILINDRO (CIL)</th>
                    <th>EJE (°)</th>
                    <th>ADICIÓN (ADD)</th>
                    <th>PRISMA</th>
                    <th>AGUDEZA VISUAL (AV)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="od">OD (Ojo Derecho)</td>
                    <td>${parsed.od?.esf || '0.00'}</td>
                    <td>${parsed.od?.cil || '0.00'}</td>
                    <td>${parsed.od?.eje || '0°'}</td>
                    <td>${parsed.od?.adi || '0.00'}</td>
                    <td>${parsed.od?.prism || '--'}</td>
                    <td>${parsed.od?.av || '20/20'}</td>
                  </tr>
                  <tr>
                    <td class="oi">OI (Ojo Izquierdo)</td>
                    <td>${parsed.oi?.esf || '0.00'}</td>
                    <td>${parsed.oi?.cil || '0.00'}</td>
                    <td>${parsed.oi?.eje || '0°'}</td>
                    <td>${parsed.oi?.adi || '0.00'}</td>
                    <td>${parsed.oi?.prism || '--'}</td>
                    <td>${parsed.oi?.av || '20/20'}</td>
                  </tr>
                </tbody>
              </table>

              <div class="dp-box">
                <span>Distancia Pupilar (DP): <strong>${parsed.dp || 'N/A'} mm</strong></span>
              </div>

              <div class="footer">
                <div class="sig-line">
                  Optómetra Especialista Tratante<br>
                  <span style="font-size:10px; font-weight:normal; color:#76746E;">Firma y Registro Profesional (T.P.)</span>
                </div>
              </div>

              <script>window.print();</script>
            </body>
          </html>
        `);
        printWin.document.close();
    };

    const renderPrescriptionDetail = (prescriptionStr: string | null) => {
        if (!prescriptionStr) {
            return (
                <p className="text-[#76746E] italic text-xs">
                    {category === 'optica' ? 'No se han registrado fórmulas ópticas en la ficha del paciente.' :
                     category === 'restaurante' ? 'No hay preferencias alimenticias registradas.' : 'Sin observaciones registradas.'}
                </p>
            );
        }

        if (category === 'optica') {
            try {
                if (prescriptionStr.trim().startsWith('{')) {
                    const parsed = JSON.parse(prescriptionStr);
                    return (
                        <div className="space-y-3 font-sans">
                            <div className="overflow-x-auto border border-[#E2DFD7] rounded-none bg-white">
                                <table className="w-full text-center text-xs border-collapse min-w-[350px]">
                                    <thead>
                                        <tr className="bg-[#FAF8F5] text-[#76746E] font-mono uppercase text-[10px] font-bold border-b border-[#E2DFD7]">
                                            <th className="py-2.5 px-3 text-left">Ojo</th>
                                            <th className="py-2.5 px-2">Esf</th>
                                            <th className="py-2.5 px-2">Cil</th>
                                            <th className="py-2.5 px-2">Eje</th>
                                            <th className="py-2.5 px-2">Adi</th>
                                            <th className="py-2.5 px-2">Prism</th>
                                            <th className="py-2.5 px-3 text-right">AV</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-[#E2DFD7]">
                                            <td className="py-2 px-3 font-mono font-bold text-left text-[#161616]">OD</td>
                                            <td className="py-2 px-2 font-mono">{parsed.od?.esf || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.od?.cil || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.od?.eje || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.od?.adi || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.od?.prism || '--'}</td>
                                            <td className="py-2 px-3 font-mono text-right">{parsed.od?.av || '--'}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-3 font-mono font-bold text-left text-[#D9381E]">OI</td>
                                            <td className="py-2 px-2 font-mono">{parsed.oi?.esf || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.oi?.cil || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.oi?.eje || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.oi?.adi || '--'}</td>
                                            <td className="py-2 px-2 font-mono">{parsed.oi?.prism || '--'}</td>
                                            <td className="py-2 px-3 font-mono text-right">{parsed.oi?.av || '--'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-1">
                                {parsed.dp && (
                                    <div className="text-xs bg-[#FAF8F5] px-3 py-1.5 border border-[#E2DFD7] font-mono text-[#161616]">
                                        Distancia Pupilar: <strong>{parsed.dp} mm</strong>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handlePrintFormulaFromCrm(parsed, selectedCust)}
                                    className="px-3.5 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] hover:border-[#161616] font-mono font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                    <span className="material-symbols-outlined text-[15px]">print</span>
                                    Imprimir Fórmula
                                </button>
                            </div>
                        </div>
                    );
                }
            } catch (e) {
                // fallback
            }
        }

        return (
            <div className="p-3 bg-white border border-[#E2DFD7] text-xs whitespace-pre-wrap leading-relaxed text-[#161616] font-mono">
                {prescriptionStr}
            </div>
        );
    };

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [custRes, invRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/crm-customers`, { headers }),
                fetch(`/api/clients/${clientId}/invoices`, { headers })
            ]);

            const custJson = await custRes.json();
            const invJson = await invRes.json();

            if (custJson.success) setCustomers(custJson.customers || []);
            if (invJson.success) setInvoices(invJson.invoices || []);
        } catch (err) {
            console.error("Error loading CRM data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId]);

    const handleSaveCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!custName || !custDocNum || !custPhone) {
            setErrorMsg('Nombre, documento y teléfono son requeridos.');
            return;
        }

        try {
            setActionLoading(true);
            setErrorMsg('');
            
            const url = selectedCust 
                ? `/api/clients/${clientId}/crm-customers/${selectedCust.id}`
                : `/api/clients/${clientId}/crm-customers`;
            
            const method = selectedCust ? 'PUT' : 'POST';

            const lensPrescriptionValue = category === 'optica'
                ? JSON.stringify({
                    od: { esf: odEsf, cil: odCil, eje: odEje, adi: odAdi, prism: odPrism, av: odAv },
                    oi: { esf: oiEsf, cil: oiCil, eje: oiEje, adi: oiAdi, prism: oiPrism, av: oiAv },
                    dp: dp
                })
                : custPrescription;

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: custName,
                    last_name: custType === 'empresa' ? '' : custLastName,
                    document_type: custType === 'empresa' ? 'NIT' : custDocType,
                    document_number: custDocNum,
                    phone: custPhone,
                    email: custEmail || null,
                    address: custAddress || null,
                    lens_prescription: lensPrescriptionValue || null,
                    customer_type: custType
                })
            });
            const json = await res.json();
            if (json.success) {
                setIsCreateOpen(false);
                fetchData();
            } else {
                setErrorMsg(json.error || 'Error al guardar cliente.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteCustomer = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de eliminar el cliente "${name}" y todos sus historiales?`)) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/crm-customers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setIsProfileOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error("Error deleting customer:", err);
        }
    };

    const openCreateModal = () => {
        setSelectedCust(null);
        const initialType = crmTab === 'empresas' ? 'empresa' : 'persona';
        setCustType(initialType);
        setCustName('');
        setCustLastName('');
        setCustDocType(initialType === 'empresa' ? 'NIT' : 'CC');
        setCustDocNum('');
        setCustPhone('');
        setCustEmail('');
        setCustAddress('');
        setCustPrescription('');
        setOdEsf(''); setOdCil(''); setOdEje(''); setOdAdi(''); setOdPrism(''); setOdAv('');
        setOiEsf(''); setOiCil(''); setOiEje(''); setOiAdi(''); setOiPrism(''); setOiAv('');
        setDp('');
        setErrorMsg('');
        setIsCreateOpen(true);
    };

    const openEditModal = (cust: Customer) => {
        setSelectedCust(cust);
        setCustType(cust.customer_type || 'persona');
        setCustName(cust.name);
        setCustLastName(cust.last_name || '');
        setCustDocType(cust.document_type);
        setCustDocNum(cust.document_number);
        setCustPhone(cust.phone);
        setCustEmail(cust.email || '');
        setCustAddress(cust.address || '');
        setErrorMsg('');
        
        if (category === 'optica') {
            try {
                if (cust.lens_prescription && cust.lens_prescription.trim().startsWith('{')) {
                    const parsed = JSON.parse(cust.lens_prescription);
                    setOdEsf(parsed.od?.esf || '');
                    setOdCil(parsed.od?.cil || '');
                    setOdEje(parsed.od?.eje || '');
                    setOdAdi(parsed.od?.adi || '');
                    setOdPrism(parsed.od?.prism || '');
                    setOdAv(parsed.od?.av || '');

                    setOiEsf(parsed.oi?.esf || '');
                    setOiCil(parsed.oi?.cil || '');
                    setOiEje(parsed.oi?.eje || '');
                    setOiAdi(parsed.oi?.adi || '');
                    setOiPrism(parsed.oi?.prism || '');
                    setOiAv(parsed.oi?.av || '');

                    setDp(parsed.dp || '');
                    setCustPrescription('');
                } else {
                    setCustPrescription(cust.lens_prescription || '');
                    setOdEsf(''); setOdCil(''); setOdEje(''); setOdAdi(''); setOdPrism(''); setOdAv('');
                    setOiEsf(''); setOiCil(''); setOiEje(''); setOiAdi(''); setOiPrism(''); setOiAv('');
                    setDp('');
                }
            } catch (e) {
                setCustPrescription(cust.lens_prescription || '');
                setOdEsf(''); setOdCil(''); setOdEje(''); setOdAdi(''); setOdPrism(''); setOdAv('');
                setOiEsf(''); setOiCil(''); setOiEje(''); setOiAdi(''); setOiPrism(''); setOiAv('');
                setDp('');
            }
        } else {
            setCustPrescription(cust.lens_prescription || '');
        }

        setIsProfileOpen(false);
        setIsCreateOpen(true);
    };

    const openProfileModal = async (cust: Customer) => {
        setSelectedCust(cust);
        setIsProfileOpen(true);
        setLoadingAppointments(true);
        setLoadingLabJobs(true);

        try {
            const res = await fetch(`/api/clients/${clientId}/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                const cleanName = (n: string) => n ? n.toLowerCase().replace(/\s+/g, ' ').trim() : '';
                const filteredApps = (json.appointments || []).filter((app: any) => {
                    const appId = app.crm_customer_id;
                    const docApp = app.customer_document_number ? app.customer_document_number.toString().trim() : '';
                    const docCust = cust.document_number ? cust.document_number.toString().trim() : '';
                    const phoneApp = app.customer_phone ? app.customer_phone.replace(/\D/g, '') : '';
                    const phoneCust = cust.phone ? cust.phone.replace(/\D/g, '') : '';
                    const nameApp = cleanName(app.customer_name);
                    const nameCust = cleanName(`${cust.name} ${cust.last_name || ''}`);

                    const matchPhone = phoneApp && phoneCust && (phoneApp.endsWith(phoneCust) || phoneCust.endsWith(phoneApp));
                    const matchName = nameApp && nameCust && (nameApp.includes(nameCust) || nameCust.includes(nameApp));

                    return (
                        (appId && appId === cust.id) ||
                        (docApp && docCust && docApp === docCust) ||
                        matchPhone ||
                        matchName
                    );
                });
                filteredApps.sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
                setCustAppointments(filteredApps);
            }
        } catch (err) {
            console.error("Error fetching patient appointments:", err);
        } finally {
            setLoadingAppointments(false);
        }

        try {
            const res = await fetch(`/api/clients/${clientId}/lab-jobs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                const filteredJobs = (json.labJobs || []).filter((job: any) => job.customer_id === cust.id);
                setCustLabJobs(filteredJobs);
            }
        } catch (err) {
            console.error("Error fetching patient lab jobs:", err);
        } finally {
            setLoadingLabJobs(false);
        }
    };

    // Calculate dynamic follow-up warning (6 months of inactivity)
    const isNeedsFollowUp = (cust: Customer) => {
        const lastDateStr = cust.last_interaction_at || cust.created_at;
        const lastDate = new Date(lastDateStr);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return lastDate < sixMonthsAgo;
    };

    // Get invoices linked to customer document number
    const getCustomerInvoices = (docNum: string) => {
        return invoices.filter(inv => inv.customer_document_number === docNum);
    };

    const getCustomerTotalDebt = (docNum: string) => {
        return invoices
            .filter(inv => inv.customer_document_number === docNum && inv.status !== 'paid')
            .reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
    };

    // Filter customers
    const filteredCustomers = customers.filter(cust => {
        const matchesTab = crmTab === 'empresas' 
            ? cust.customer_type === 'empresa' 
            : (!cust.customer_type || cust.customer_type === 'persona');
            
        if (!matchesTab) return false;
        
        return cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cust.last_name && cust.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            cust.document_number.includes(searchQuery) ||
            cust.phone.includes(searchQuery);
    });

    const totalPersonsCount = customers.filter(c => !c.customer_type || c.customer_type === 'persona').length;
    const totalCompaniesCount = customers.filter(c => c.customer_type === 'empresa').length;
    const followUpCount = customers.filter(c => isNeedsFollowUp(c)).length;
    const totalGlobalDebt = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

    return (
        <div className="space-y-6 text-[#161616] font-sans antialiased">
            {/* Header Principal Wabi-Sabi */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
                <div>
                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
                        DIRECTORIO & CRM
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
                        Directorio de Clientes & CRM
                    </h2>
                    <p className="text-xs text-[#76746E] mt-1.5">
                        Historias clínicas, prescripción óptica, órdenes de laboratorio y auditoría de cartera por cliente.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        onClick={fetchData}
                        className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-white border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Refrescar
                    </button>
                    <button 
                        type="button"
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-[#161616] text-[#F6F4EE] hover:bg-[#2b2b2b] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-xs"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        {crmTab === 'empresas' ? 'Nueva Empresa' : 'Nuevo Cliente'}
                    </button>
                </div>
            </div>

            {/* Sub-Navegación / Barra Zen de Pestañas */}
            <div className="bg-white border border-[#E2DFD7] p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => setCrmTab('personas')}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
                            crmTab === 'personas'
                                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        Personas ({totalPersonsCount})
                    </button>

                    <button
                        type="button"
                        onClick={() => setCrmTab('empresas')}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
                            crmTab === 'empresas'
                                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">domain</span>
                        Empresas ({totalCompaniesCount})
                    </button>
                </div>

                <div className="hidden md:flex items-center gap-4 text-xs font-mono text-[#76746E] pr-2">
                    <span>Retención (&gt;6m): <strong className="text-[#D9381E]">{followUpCount}</strong></span>
                    <span>•</span>
                    <span>Cartera Pendiente: <strong className="text-[#161616]">${totalGlobalDebt.toLocaleString('es-CO')}</strong></span>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Total Directorio Activo</span>
                    <p className="text-2xl font-bold text-[#161616] font-mono mt-1">{customers.length} Registros</p>
                    <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                        {totalPersonsCount} Pacientes / {totalCompaniesCount} Empresas
                    </p>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Alerta de Inactividad</span>
                    <p className="text-2xl font-bold text-[#D9381E] font-mono mt-1">{followUpCount} Pacientes</p>
                    <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                        Sin control en más de 6 meses
                    </p>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Total Cuentas por Cobrar</span>
                    <p className="text-2xl font-bold text-[#C5221F] font-mono mt-1">${totalGlobalDebt.toLocaleString('es-CO')}</p>
                    <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                        Facturas pendientes de cobro
                    </p>
                </div>
            </div>

            {/* Search and filtering */}
            <div className="flex items-center gap-3 bg-white border border-[#E2DFD7] px-4 py-3 rounded-none shadow-xs">
                <span className="material-symbols-outlined text-[20px] text-[#76746E]">search</span>
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar cliente o empresa por nombre, documento o WhatsApp..."
                    className="flex-grow bg-transparent border-0 outline-none text-xs text-[#161616] focus:ring-0 placeholder:text-[#76746E]/60 font-mono"
                />
                {searchQuery && (
                    <button 
                        type="button" 
                        onClick={() => setSearchQuery('')}
                        className="text-[11px] font-mono text-[#76746E] hover:text-[#161616] cursor-pointer"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2DFD7] rounded-none">
                    <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando directorio CRM...</p>
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="bg-white border border-[#E2DFD7] p-12 text-center rounded-none shadow-xs space-y-2">
                    <span className="material-symbols-outlined text-[#76746E] text-[36px]">contact_page</span>
                    <p className="text-sm font-serif text-[#161616]">No se encontraron registros en el directorio.</p>
                    <p className="text-xs text-[#76746E] font-mono">Intenta con otro término de búsqueda o crea un nuevo registro.</p>
                </div>
            ) : (
                /* Directory Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map(cust => {
                        const needsFollowUp = isNeedsFollowUp(cust);
                        const debt = getCustomerTotalDebt(cust.document_number);

                        return (
                            <div 
                                key={cust.id} 
                                onClick={() => openProfileModal(cust)}
                                className="bg-white border border-[#E2DFD7] p-5 rounded-none flex flex-col justify-between hover:border-[#161616] cursor-pointer transition shadow-xs relative"
                            >
                                {/* Needs follow up badge */}
                                {needsFollowUp && (
                                    <span className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FFF5F5] text-[#D9381E] border border-[#D9381E]/30">
                                        Retención &gt;6m
                                    </span>
                                )}

                                <div>
                                    <div className="pr-20">
                                        <h3 className="font-serif font-bold text-base text-[#161616] leading-tight mb-1">
                                            {cust.name} {cust.last_name || ''}
                                        </h3>
                                        <p className="text-[10px] font-mono text-[#76746E]">
                                            {cust.document_type}: <span className="text-[#161616] font-semibold">{cust.document_number}</span>
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-2 mt-4 text-xs text-[#76746E]">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[15px] text-[#161616]">call</span>
                                            <span className="font-mono text-[#161616]">+{cust.phone}</span>
                                        </div>
                                        {cust.lens_prescription && (
                                            <div className="flex items-start gap-2 max-h-[36px] overflow-hidden text-[11px]">
                                                <span className="material-symbols-outlined text-[15px] text-[#D9381E]">
                                                    {category === 'optica' ? 'eyeglasses' :
                                                     category === 'restaurante' ? 'restaurant' : 'notes'}
                                                </span>
                                                <span className="truncate italic text-[#76746E]">
                                                    {category === 'optica' ? 'Fórmula' :
                                                     category === 'restaurante' ? 'Preferencias' : 'Notas'}: {getPrescriptionSummary(cust.lens_prescription)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-[#E2DFD7] pt-3 mt-4 flex justify-between items-center text-[10px] font-mono">
                                    <span className="text-[#76746E] uppercase">Saldo Cartera:</span>
                                    <span className={`font-bold ${debt > 0 ? 'text-[#C5221F]' : 'text-[#137333]'}`}>
                                        {debt > 0 ? `$${debt.toLocaleString('es-CO')}` : 'Al Día (Sin Deuda)'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE / EDIT CLIENT FORM MODAL */}
            {isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#F6F4EE] border border-[#161616] max-w-lg w-full rounded-none p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] tracking-widest block">
                                    {selectedCust ? 'ACTUALIZAR REGISTRO' : 'NUEVO REGISTRO'}
                                </span>
                                <h3 className="font-serif font-bold text-xl text-[#161616]">
                                    {selectedCust 
                                        ? (custType === 'empresa' ? 'Editar Empresa' : 'Editar Cliente') 
                                        : (custType === 'empresa' ? 'Registrar Nueva Empresa' : 'Registrar Nuevo Cliente')}
                                </h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[#E2DFD7] transition border-0 cursor-pointer text-[#161616]"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-[#FFF5F5] border border-[#D9381E] text-[#D9381E] text-xs p-3 rounded-none mb-4 font-mono font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className={`space-y-1 ${custType === 'empresa' ? 'col-span-2' : ''}`}>
                                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">
                                        {custType === 'empresa' ? 'Nombre de la Empresa *' : 'Nombre *'}
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        value={custName}
                                        onChange={(e) => setCustName(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                        placeholder={custType === 'empresa' ? 'Ej: Óptica Santa Fe S.A.S.' : 'Ej: Pedro'}
                                    />
                                </div>
                                {custType !== 'empresa' && (
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Apellido</label>
                                        <input 
                                            type="text"
                                            value={custLastName}
                                            onChange={(e) => setCustLastName(e.target.value)}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                            placeholder="Ej: Martínez"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {custType !== 'empresa' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Doc.</label>
                                            <select 
                                                value={custDocType}
                                                onChange={(e) => setCustDocType(e.target.value)}
                                                className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none cursor-pointer text-xs font-mono"
                                            >
                                                <option value="CC">Cédula (CC)</option>
                                                <option value="CE">Cédula Ext. (CE)</option>
                                                <option value="TI">Tarjeta Id. (TI)</option>
                                                <option value="PAS">Pasaporte (PAS)</option>
                                            </select>
                                        </div>

                                        <div className="col-span-2 space-y-1">
                                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Número de Identificación *</label>
                                            <input 
                                                type="text"
                                                required
                                                value={custDocNum}
                                                onChange={(e) => setCustDocNum(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                                placeholder="Ej: 1020400800"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-3 space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">NIT / Identificación de la Empresa *</label>
                                        <input 
                                            type="text"
                                            required
                                            value={custDocNum}
                                            onChange={(e) => setCustDocNum(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                            placeholder="Ej: 900500100"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Teléfono / WhatsApp *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={custPhone}
                                        onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Ej: 573001112222"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Correo Electrónico</label>
                                    <input 
                                        type="email"
                                        value={custEmail}
                                        onChange={(e) => setCustEmail(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                        placeholder="Ej: contacto@correo.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Dirección Física</label>
                                <input 
                                    type="text"
                                    value={custAddress}
                                    onChange={(e) => setCustAddress(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                    placeholder="Ej: Calle 45 # 12 - 34, Local 101"
                                />
                            </div>

                            {category === 'optica' && custType !== 'empresa' ? (
                                <div className="space-y-3 border-t border-[#E2DFD7] pt-4">
                                    <h4 className="font-serif font-bold text-xs text-[#161616] flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[16px] text-[#D9381E]">visibility</span>
                                        Prescripción Óptica (Fórmula Oftálmica)
                                    </h4>
                                    
                                    <div className="overflow-x-auto border border-[#E2DFD7] rounded-none bg-white">
                                        <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] text-[#76746E] font-mono font-bold border-b border-[#E2DFD7] text-center text-[10px] uppercase">
                                                    <th className="py-2 px-2 text-left pl-3">Ojo</th>
                                                    <th className="py-2 px-1">Esf</th>
                                                    <th className="py-2 px-1">Cil</th>
                                                    <th className="py-2 px-1">Eje</th>
                                                    <th className="py-2 px-1">Adi</th>
                                                    <th className="py-2 px-1">Prisma</th>
                                                    <th className="py-2 px-2 pr-3">AV</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-[#E2DFD7] text-center">
                                                    <td className="py-2 px-2 font-mono font-bold text-left pl-3 text-[#161616]">OD (Der)</td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odEsf} onChange={(e) => setOdEsf(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-1.75" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odCil} onChange={(e) => setOdCil(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-2.00" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odEje} onChange={(e) => setOdEje(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="45°" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odAdi} onChange={(e) => setOdAdi(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="+2.00" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odPrism} onChange={(e) => setOdPrism(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="--" />
                                                    </td>
                                                    <td className="py-1 px-2 pr-3">
                                                        <input type="text" value={odAv} onChange={(e) => setOdAv(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="20/20" />
                                                    </td>
                                                </tr>
                                                <tr className="text-center">
                                                    <td className="py-2 px-2 font-mono font-bold text-left pl-3 text-[#D9381E]">OI (Izq)</td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiEsf} onChange={(e) => setOiEsf(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-5.25" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiCil} onChange={(e) => setOiCil(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-1.25" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiEje} onChange={(e) => setOiEje(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="130°" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiAdi} onChange={(e) => setOiAdi(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="+2.00" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiPrism} onChange={(e) => setOiPrism(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="--" />
                                                    </td>
                                                    <td className="py-1 px-2 pr-3">
                                                        <input type="text" value={oiAv} onChange={(e) => setOiAv(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="20/20" />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Distancia Pupilar (DP mm)</label>
                                            <input 
                                                type="text" 
                                                value={dp} 
                                                onChange={(e) => setDp(e.target.value)} 
                                                className="w-full bg-white border border-[#E2DFD7] p-2 rounded-none text-xs text-[#161616] outline-none focus:border-[#161616] font-mono"
                                                placeholder="Ej: 64" 
                                            />
                                        </div>
                                        {custPrescription && (
                                            <div className="space-y-1">
                                                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Notas Clínicas Previas</label>
                                                <input 
                                                    type="text" 
                                                    value={custPrescription} 
                                                    disabled 
                                                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2 rounded-none text-xs text-[#76746E] italic cursor-not-allowed outline-none font-mono" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">
                                        {category === 'restaurante' 
                                            ? 'Preferencias Alimenticias & Notas de Servicio' 
                                            : 'Notas del Cliente & Observaciones'}
                                    </label>
                                    <textarea 
                                        value={custPrescription}
                                        onChange={(e) => setCustPrescription(e.target.value)}
                                        rows={3}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                        placeholder={category === 'restaurante'
                                            ? 'Ej: Alérgico a mariscos, prefiere mesa exterior, cliente frecuente...'
                                            : 'Ej: Prefiere atención telefónica, observaciones generales...'}
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t border-[#E2DFD7]">
                                <button 
                                    type="button" 
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-[#E2DFD7] hover:border-[#161616] text-[#161616] bg-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                                >
                                    {actionLoading ? 'Guardando...' : (selectedCust ? 'Actualizar Ficha' : 'Guardar Cliente')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* DETAILED PROFILE & HISTORIES MODAL */}
            {isProfileOpen && selectedCust && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#F6F4EE] border border-[#161616] max-w-2xl w-full rounded-none overflow-hidden p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        {/* Profile Header */}
                        <div className="flex justify-between items-start border-b border-[#E2DFD7] pb-4 mb-4">
                            <div>
                                <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] tracking-widest block">
                                    EXPEDIENTE / HISTORIAL CLÍNICO
                                </span>
                                <h3 className="font-serif font-bold text-2xl text-[#161616]">
                                    {selectedCust.name} {selectedCust.last_name || ''}
                                </h3>
                                <p className="text-xs text-[#76746E] font-mono mt-0.5">
                                    {selectedCust.document_type}: <span className="text-[#161616] font-semibold">{selectedCust.document_number}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    type="button"
                                    onClick={() => openEditModal(selectedCust)}
                                    className="px-3 py-1.5 border border-[#E2DFD7] hover:border-[#161616] bg-white text-xs font-mono font-bold uppercase tracking-wider text-[#161616] flex items-center gap-1 cursor-pointer transition shadow-xs"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    Editar
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsProfileOpen(false)}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-[#E2DFD7] transition border-0 cursor-pointer text-[#161616]"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Profile details grid content */}
                        <div className="flex-grow overflow-y-auto space-y-5 pr-1 custom-scrollbar text-xs">
                            {/* Inactivity alert warning */}
                            {isNeedsFollowUp(selectedCust) && (
                                <div className="bg-[#FFF5F5] border border-[#D9381E] text-[#D9381E] p-3 rounded-none font-mono text-xs flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                                    <span>⚠️ Retención recomendada: Paciente con más de 6 meses sin citas de control o compras.</span>
                                </div>
                            )}

                            {/* ACCORDION 1: FICHA PACIENTE */}
                            <div className="space-y-2">
                                <div 
                                    onClick={() => toggleSection('info')}
                                    className="flex justify-between items-center cursor-pointer border-b border-[#E2DFD7] pb-1.5 select-none hover:text-[#D9381E] transition-colors text-[#161616]"
                                >
                                    <h4 className="font-mono font-bold text-xs uppercase tracking-wider">Ficha de Contacto</h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.info ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.info && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-4 rounded-none border border-[#E2DFD7] text-left">
                                        <div className="space-y-2 font-mono text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#76746E]">WhatsApp:</span>
                                                <span className="text-[#161616] font-bold">+{selectedCust.phone}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#76746E]">Email:</span>
                                                <span className="text-[#161616]">{selectedCust.email || 'No Registrado'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#76746E]">Dirección:</span>
                                                <span className="text-[#161616]">{selectedCust.address || 'No Registrado'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#76746E]">Último Contacto:</span>
                                                <span className="text-[#161616]">
                                                    {selectedCust.last_interaction_at 
                                                        ? new Date(selectedCust.last_interaction_at).toLocaleDateString('es-CO')
                                                        : 'Desconocido'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ACCORDION 2: FÓRMULA ÓPTICA / DIAGNÓSTICO */}
                            <div className="space-y-2">
                                <div 
                                    onClick={() => toggleSection('formula')}
                                    className="flex justify-between items-center cursor-pointer border-b border-[#E2DFD7] pb-1.5 select-none hover:text-[#D9381E] transition-colors text-[#161616]"
                                >
                                    <h4 className="font-mono font-bold text-xs uppercase tracking-wider">
                                        {category === 'optica' ? 'Fórmula Óptica Activa' :
                                         category === 'restaurante' ? 'Preferencias Alimenticias & Notas' : 'Notas & Observaciones'}
                                    </h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.formula ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.formula && (
                                    <div className="bg-white p-4 rounded-none border border-[#E2DFD7]">
                                        {renderPrescriptionDetail(selectedCust.lens_prescription)}
                                    </div>
                                )}
                            </div>

                            {/* ACCORDION 3: HISTORIAL DE CITAS */}
                            <div className="space-y-2">
                                <div 
                                    onClick={() => toggleSection('citas')}
                                    className="flex justify-between items-center cursor-pointer border-b border-[#E2DFD7] pb-1.5 select-none hover:text-[#D9381E] transition-colors text-[#161616]"
                                >
                                    <h4 className="font-mono font-bold text-xs uppercase tracking-wider">Historial de Citas</h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.citas ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.citas && (
                                    <div className="space-y-3 bg-white p-4 rounded-none border border-[#E2DFD7] text-left">
                                        {/* Selector de filtro */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { value: 'all', label: 'Todos' },
                                                { value: 'examen_vista', label: 'Examen Vista' },
                                                { value: 'venta_lentes', label: 'Venta Lentes' },
                                                { value: 'otros', label: 'Otros' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setVisitReasonFilter(opt.value as any)}
                                                    className={`py-1 px-2.5 rounded-none border text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer text-center ${
                                                        visitReasonFilter === opt.value
                                                            ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                                            : 'bg-[#FAF8F5] border-[#E2DFD7] text-[#76746E] hover:text-[#161616]'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        {loadingAppointments ? (
                                            <p className="text-xs text-[#76746E] italic py-1 animate-pulse font-mono">Cargando historial de citas...</p>
                                        ) : (() => {
                                            const filteredApps = custAppointments.filter((app: any) => {
                                                if (visitReasonFilter !== 'all' && app.visit_reason !== visitReasonFilter) return false;
                                                return true;
                                            });

                                            if (filteredApps.length === 0) {
                                                return <p className="text-[#76746E] italic py-2 text-center text-xs font-mono">No se registran citas que coincidan con la búsqueda.</p>;
                                            }

                                            return (
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                                    {filteredApps.map(app => {
                                                        const cleanReason = app.visit_reason === 'examen_vista' ? 'Examen Vista' :
                                                                           app.visit_reason === 'venta_lentes' ? 'Venta Lentes' :
                                                                           app.visit_reason === 'otros' ? 'Otros' : (app.visit_reason || 'Sin especificar');

                                                        return (
                                                            <div key={app.id} className="flex justify-between items-center p-3 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none text-xs">
                                                                <div>
                                                                    <p className="font-bold text-[#161616] font-mono">
                                                                        📅 {new Date(app.appointment_date).toLocaleDateString('es-CO')} - {new Date(app.appointment_date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                    </p>
                                                                    <p className="text-[10px] text-[#76746E] font-mono mt-0.5">
                                                                        Motivo: <span className="font-bold text-[#161616]">{cleanReason}</span> {app.visit_reason_details ? `(${app.visit_reason_details})` : ''}
                                                                    </p>
                                                                </div>
                                                                <span className={`px-2.5 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                                                    app.status === 'confirmed' ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' :
                                                                    app.status === 'canceled' ? 'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]/30' :
                                                                    app.status === 'attended' ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/30' :
                                                                    'bg-[#FEF7E0] text-[#B06000] border-[#B06000]/30'
                                                                }`}>
                                                                    {app.status === 'confirmed' ? 'Confirmada' :
                                                                     app.status === 'canceled' ? 'Cancelada' :
                                                                     app.status === 'attended' ? 'Atendida' : 'Pendiente'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* ACCORDION 4: TRABAJOS DE LABORATORIO */}
                            {category === 'optica' && (
                                <div className="space-y-2">
                                    <div 
                                        onClick={() => toggleSection('laboratorio')}
                                        className="flex justify-between items-center cursor-pointer border-b border-[#E2DFD7] pb-1.5 select-none hover:text-[#D9381E] transition-colors text-[#161616]"
                                    >
                                        <h4 className="font-mono font-bold text-xs uppercase tracking-wider">Órdenes de Taller / Laboratorio</h4>
                                        <span className="material-symbols-outlined text-[16px]">
                                            {openSections.laboratorio ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </div>
                                    {openSections.laboratorio && (
                                        <div className="bg-white p-4 rounded-none border border-[#E2DFD7] space-y-2">
                                            {loadingLabJobs ? (
                                                <p className="text-xs text-[#76746E] italic py-1 animate-pulse font-mono">Cargando órdenes de laboratorio...</p>
                                            ) : custLabJobs.length === 0 ? (
                                                <p className="text-[#76746E] italic py-2 text-center text-xs font-mono">No se registran trabajos de taller para este paciente.</p>
                                            ) : (
                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                                    {custLabJobs.map(job => (
                                                        <div key={job.id} className="p-3 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none space-y-1.5 text-xs text-left">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold font-mono text-[#161616]">🔬 {job.product_name || 'Lente Formulada'}</span>
                                                                <span className={`px-2 py-0.5 rounded-none text-[8px] font-mono font-bold uppercase tracking-wider border ${
                                                                    job.status === 'pending' ? 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]/30' :
                                                                    job.status === 'sent' ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/30' :
                                                                    job.status === 'received' ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' :
                                                                    job.status === 'delivered' ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' :
                                                                    'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]/30'
                                                                }`}>
                                                                    {job.status === 'pending' ? 'Pendiente' :
                                                                     job.status === 'sent' ? 'En Taller' :
                                                                     job.status === 'received' ? 'En Tienda' :
                                                                     job.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-[#76746E] font-mono">
                                                                Diseño: {job.lens_design || 'N/A'} | Material: {job.lens_material || 'N/A'} | Tratamiento: {job.lens_treatment || 'N/A'}
                                                            </div>
                                                            <div className="text-[10px] text-[#76746E] font-mono flex justify-between border-t border-[#E2DFD7] pt-1.5">
                                                                <span>Proveedor: {job.supplier_name || 'Sin asignar'}</span>
                                                                {job.delivered_at && <span>Entregado: {new Date(job.delivered_at).toLocaleDateString('es-CO')}</span>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ACCORDION 5: HISTORIAL DE FACTURACIÓN */}
                            <div className="space-y-2">
                                <div 
                                    onClick={() => toggleSection('facturacion')}
                                    className="flex justify-between items-center cursor-pointer border-b border-[#E2DFD7] pb-1.5 select-none hover:text-[#D9381E] transition-colors text-[#161616]"
                                >
                                    <h4 className="font-mono font-bold text-xs uppercase tracking-wider">Historial de Facturación & Cartera</h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.facturacion ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.facturacion && (
                                    <div className="bg-white p-4 rounded-none border border-[#E2DFD7]">
                                        {getCustomerInvoices(selectedCust.document_number).length === 0 ? (
                                            <p className="text-[#76746E] italic py-2 text-center text-xs font-mono">No se registran compras o facturas en el historial.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {getCustomerInvoices(selectedCust.document_number).map(inv => (
                                                    <div key={inv.id} className="flex justify-between items-center p-3 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none text-left">
                                                        <div>
                                                            <span className="font-bold font-mono text-[#161616]">{inv.invoice_number}</span>
                                                            <span className="text-[10px] text-[#76746E] ml-2 font-mono">Vence: {new Date(inv.due_date).toLocaleDateString('es-CO')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-[#161616] font-mono">${Number(inv.total_amount || 0).toLocaleString('es-CO')}</span>
                                                            <span className={`px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase border ${
                                                                inv.status === 'paid' ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' : 'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]/30'
                                                            }`}>
                                                                {inv.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Profile Footer */}
                        <div className="border-t border-[#E2DFD7] pt-4 mt-4 flex justify-between items-center">
                            <button 
                                type="button"
                                onClick={() => handleDeleteCustomer(selectedCust.id, selectedCust.name)}
                                className="px-3.5 py-2 bg-white border border-[#C5221F] text-[#C5221F] hover:bg-[#FFF5F5] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 shadow-xs"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Eliminar Ficha
                            </button>
                            <button 
                                type="button"
                                onClick={() => setIsProfileOpen(false)}
                                className="px-4 py-2 bg-[#161616] text-[#F6F4EE] hover:bg-[#2b2b2b] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
