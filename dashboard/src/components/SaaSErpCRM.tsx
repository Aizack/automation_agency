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

export const SaaSErpCRM: React.FC<SaaSErpCRMProps> = ({ clientId, category = 'optica' }) => {
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

    // Campos estructurados de Fórmula Oftálmica (Fase 2)
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

    const renderPrescriptionDetail = (prescriptionStr: string | null) => {
        if (!prescriptionStr) {
            return (
                <p className="text-on-surface-variant/60 italic text-xs">
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
                            <div className="overflow-x-auto border border-outline/10 rounded-xl bg-surface-container/30">
                                <table className="w-full text-center text-xs border-collapse min-w-[350px]">
                                    <thead>
                                        <tr className="bg-surface-container-high/40 text-on-surface-variant font-bold border-b border-outline/10">
                                            <th className="py-2 px-2 text-left pl-3">Ojo</th>
                                            <th className="py-2 px-1">Esf</th>
                                            <th className="py-2 px-1">Cil</th>
                                            <th className="py-2 px-1">Eje</th>
                                            <th className="py-2 px-1">Adi</th>
                                            <th className="py-2 px-1">Prism</th>
                                            <th className="py-2 px-1 pr-3">AV</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-outline/5">
                                            <td className="py-2 px-2 font-bold text-left pl-3 text-secondary">OD</td>
                                            <td className="py-2 px-1 font-mono">{parsed.od?.esf || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.od?.cil || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.od?.eje || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.od?.adi || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.od?.prism || '--'}</td>
                                            <td className="py-2 px-1 font-mono pr-3">{parsed.od?.av || '--'}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 px-2 font-bold text-left pl-3 text-primary">OI</td>
                                            <td className="py-2 px-1 font-mono">{parsed.oi?.esf || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.oi?.cil || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.oi?.eje || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.oi?.adi || '--'}</td>
                                            <td className="py-2 px-1 font-mono">{parsed.oi?.prism || '--'}</td>
                                            <td className="py-2 px-1 font-mono pr-3">{parsed.oi?.av || '--'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {parsed.dp && (
                                <div className="text-xs bg-surface-container/20 p-2.5 rounded-xl border border-outline/5 flex items-center justify-between">
                                    <span className="text-on-surface-variant font-bold">Distancia Pupilar (DP):</span>
                                    <span className="font-mono font-bold text-primary">{parsed.dp}</span>
                                </div>
                            )}
                        </div>
                    );
                }
            } catch (e) {
                // fallback a texto plano abajo
            }
        }

        return (
            <div className="p-3 bg-surface-container/40 border border-outline/10 rounded-xl text-xs whitespace-pre-wrap leading-relaxed text-on-surface font-mono">
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

    return (
        <div className="space-y-6 text-on-surface">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Directorio de Clientes (CRM)</h2>
                    <p className="text-xs text-on-surface-variant">Registra historias clínicas, prescripción de lentes y audita deudas de pacientes.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchData}
                        className="w-9 h-9 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-xl flex items-center justify-center border border-outline/10 cursor-pointer transition shadow"
                        title="Refrescar CRM"
                    >
                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                    </button>
                    <button 
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        {crmTab === 'empresas' ? 'Nueva Empresa' : 'Nuevo Cliente'}
                    </button>
                </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-outline/10 gap-2 select-none">
                <button
                    type="button"
                    onClick={() => setCrmTab('personas')}
                    className={`px-4 py-2 text-xs font-bold border-0 border-b-2 cursor-pointer transition-all bg-transparent ${
                        crmTab === 'personas'
                            ? 'border-primary text-primary font-black'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    Personas ({customers.filter(c => !c.customer_type || c.customer_type === 'persona').length})
                </button>
                <button
                    type="button"
                    onClick={() => setCrmTab('empresas')}
                    className={`px-4 py-2 text-xs font-bold border-0 border-b-2 cursor-pointer transition-all bg-transparent ${
                        crmTab === 'empresas'
                            ? 'border-primary text-primary font-black'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    Empresas ({customers.filter(c => c.customer_type === 'empresa').length})
                </button>
            </div>

            {/* Search and filtering */}
            <div className="flex items-center gap-3 bg-surface-container-high/20 border border-outline/10 px-4 py-3 rounded-2xl">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">search</span>
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar cliente por nombre, cédula o WhatsApp..."
                    className="flex-grow bg-transparent border-0 outline-none text-xs text-on-surface focus:ring-0 placeholder:text-on-surface-variant/50"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredCustomers.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-2xl">
                    <p className="text-sm text-on-surface-variant">No se encontraron clientes en el directorio.</p>
                </div>
            ) : (
                /* Directory Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map(cust => {
                        const needsFollowUp = isNeedsFollowUp(cust);
                        const debt = getCustomerTotalDebt(cust.document_number);

                        return (
                            <div 
                                key={cust.id} 
                                onClick={() => openProfileModal(cust)}
                                className="glass-card p-5 rounded-2xl flex flex-col justify-between hover:border-primary/50 cursor-pointer transition relative"
                            >
                                {/* Needs follow up badge */}
                                {needsFollowUp && (
                                    <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[8px] font-black bg-orange-500/15 text-orange-500 border border-orange-500/20 animate-pulse">
                                        Retención (6 Meses)
                                    </span>
                                )}

                                <div>
                                    <h3 className="font-bold text-base text-on-surface leading-tight mb-1 pr-16">{cust.name} {cust.last_name || ''}</h3>
                                    <p className="text-[10px] font-mono text-on-surface-variant">{cust.document_type}: {cust.document_number}</p>
                                    
                                    <div className="space-y-2 mt-4 text-xs text-on-surface-variant">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[16px] text-primary">call</span>
                                            <span className="font-mono">+{cust.phone}</span>
                                        </div>
                                        {cust.lens_prescription && (
                                            <div className="flex items-start gap-2 max-h-[36px] overflow-hidden">
                                                <span className="material-symbols-outlined text-[16px] text-secondary">
                                                    {category === 'optica' ? 'eyeglasses' :
                                                     category === 'restaurante' ? 'restaurant' : 'notes'}
                                                </span>
                                                <span className="truncate italic">
                                                    {category === 'optica' ? 'Fórmula' :
                                                     category === 'restaurante' ? 'Preferencias' : 'Notas'}: {getPrescriptionSummary(cust.lens_prescription)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-outline/10 pt-3 mt-4 flex justify-between items-center text-[10px]">
                                    <span className="text-on-surface-variant">Saldo Deuda:</span>
                                    <span className={`font-mono font-bold ${debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {debt > 0 ? `$${debt.toLocaleString('es-CO')}` : 'Al Día'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CREATE / EDIT CLIENT FORM MODAL */}
            {isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="glass-card max-w-lg w-full rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">
                                {selectedCust 
                                    ? (custType === 'empresa' ? 'Editar Empresa' : 'Editar Cliente') 
                                    : (custType === 'empresa' ? 'Registrar Nueva Empresa' : 'Registrar Nuevo Cliente')}
                            </h3>
                            <button 
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl mb-4 font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSaveCustomer} className="space-y-4 text-sm">

                            <div className="grid grid-cols-2 gap-3">
                                <div className={`space-y-1 ${custType === 'empresa' ? 'col-span-2' : ''}`}>
                                    <label className="block text-xs font-bold text-on-surface-variant">
                                        {custType === 'empresa' ? 'Nombre de la Empresa' : 'Nombre'}
                                    </label>
                                    <input 
                                        type="text"
                                        required
                                        value={custName}
                                        onChange={(e) => setCustName(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder={custType === 'empresa' ? 'Ej: Óptica Santa Fe' : 'Ej: Pedro'}
                                    />
                                </div>
                                {custType !== 'empresa' && (
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-on-surface-variant">Apellido</label>
                                        <input 
                                            type="text"
                                            value={custLastName}
                                            onChange={(e) => setCustLastName(e.target.value)}
                                            className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                            placeholder="Ej: Martínez"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {custType !== 'empresa' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="block text-xs font-bold text-on-surface-variant">Documento</label>
                                            <select 
                                                value={custDocType}
                                                onChange={(e) => setCustDocType(e.target.value)}
                                                className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                            >
                                                <option value="CC">Cédula (CC)</option>
                                                <option value="CE">Cédula Ext. (CE)</option>
                                            </select>
                                        </div>

                                        <div className="col-span-2 space-y-1">
                                            <label className="block text-xs font-bold text-on-surface-variant">Número de Identificación</label>
                                            <input 
                                                type="text"
                                                required
                                                value={custDocNum}
                                                onChange={(e) => setCustDocNum(e.target.value.replace(/\D/g, ''))}
                                                className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono"
                                                placeholder="Ej: 1020400800"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-3 space-y-1">
                                        <label className="block text-xs font-bold text-on-surface-variant">NIT / Identificación de la Empresa</label>
                                        <input 
                                            type="text"
                                            required
                                            value={custDocNum}
                                            onChange={(e) => setCustDocNum(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono"
                                            placeholder="Ej: 900500100"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Teléfono (WhatsApp)</label>
                                    <input 
                                        type="text"
                                        required
                                        value={custPhone}
                                        onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none font-mono"
                                        placeholder="Ej: 573001112222"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Correo Electrónico</label>
                                    <input 
                                        type="email"
                                        value={custEmail}
                                        onChange={(e) => setCustEmail(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: pedro@correo.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Dirección Física</label>
                                <input 
                                    type="text"
                                    value={custAddress}
                                    onChange={(e) => setCustAddress(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                    placeholder="Ej: Calle 45 # 12 - 34, Apt 401"
                                />
                            </div>

                             {category === 'optica' && custType !== 'empresa' ? (
                                <div className="space-y-4 border-t border-outline/10 pt-4">
                                    <h4 className="font-bold text-xs text-primary flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                                        Prescripción Óptica (Fórmula Oftálmica)
                                    </h4>
                                    
                                    <div className="overflow-x-auto border border-outline/10 rounded-xl bg-surface-container/20">
                                        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                                            <thead>
                                                <tr className="bg-surface-container-high/40 text-on-surface-variant font-bold border-b border-outline/10 text-center">
                                                    <th className="py-2 px-1 text-left pl-3">Ojo</th>
                                                    <th className="py-2 px-1">Esf (Esfera)</th>
                                                    <th className="py-2 px-1">Cil (Cilindro)</th>
                                                    <th className="py-2 px-1">Eje</th>
                                                    <th className="py-2 px-1">Adi (Adición)</th>
                                                    <th className="py-2 px-1">Prisma</th>
                                                    <th className="py-2 px-1 pr-3">AV (Agudeza)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-outline/5 text-center">
                                                    <td className="py-2 px-1 font-bold text-left pl-3 text-secondary">OD (Derecho)</td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={odEsf} onChange={(e) => setOdEsf(e.target.value)} className="w-16 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="-1.75" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={odCil} onChange={(e) => setOdCil(e.target.value)} className="w-16 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="-2.00" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={odEje} onChange={(e) => setOdEje(e.target.value)} className="w-12 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="45" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={odAdi} onChange={(e) => setOdAdi(e.target.value)} className="w-12 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="2.00" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={odPrism} onChange={(e) => setOdPrism(e.target.value)} className="w-12 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="--" />
                                                    </td>
                                                    <td className="py-2 px-1 pr-3">
                                                        <input type="text" value={odAv} onChange={(e) => setOdAv(e.target.value)} className="w-16 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="20/20" />
                                                    </td>
                                                </tr>
                                                <tr className="text-center">
                                                    <td className="py-2 px-1 font-bold text-left pl-3 text-primary">OI (Izquierdo)</td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={oiEsf} onChange={(e) => setOiEsf(e.target.value)} className="w-16 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="-5.25" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={oiCil} onChange={(e) => setOiCil(e.target.value)} className="w-16 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="-1.25" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={oiEje} onChange={(e) => setOiEje(e.target.value)} className="w-12 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="130" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={oiAdi} onChange={(e) => setOiAdi(e.target.value)} className="w-12 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="2.00" />
                                                    </td>
                                                    <td className="py-2 px-1">
                                                        <input type="text" value={oiPrism} onChange={(e) => setOiPrism(e.target.value)} className="w-12 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="--" />
                                                    </td>
                                                    <td className="py-2 px-1 pr-3">
                                                        <input type="text" value={oiAv} onChange={(e) => setOiAv(e.target.value)} className="w-16 bg-surface-container border border-outline/20 rounded p-1 text-center font-mono text-xs text-on-surface outline-none focus:border-primary" placeholder="20/20" />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-bold text-on-surface-variant uppercase">DP (Distancia Pupilar)</label>
                                            <input 
                                                type="text" 
                                                value={dp} 
                                                onChange={(e) => setDp(e.target.value)} 
                                                className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-xs text-on-surface outline-none focus:border-primary font-mono"
                                                placeholder="Ej: 64" 
                                            />
                                        </div>
                                        {custPrescription && (
                                            <div className="space-y-1">
                                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Notas Clínicas Anteriores</label>
                                                <input 
                                                    type="text" 
                                                    value={custPrescription} 
                                                    disabled 
                                                    className="w-full bg-surface-container/50 border border-outline/10 p-2.5 rounded-xl text-xs text-on-surface-variant italic cursor-not-allowed outline-none font-mono" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">
                                        {category === 'restaurante' 
                                            ? 'Preferencias Alimenticias & Notas de Servicio' 
                                            : 'Notas del Cliente & Observaciones'}
                                    </label>
                                    <textarea 
                                        value={custPrescription}
                                        onChange={(e) => setCustPrescription(e.target.value)}
                                        rows={3}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none text-xs"
                                        placeholder={category === 'restaurante'
                                            ? 'Ej: Alérgico a mariscos, prefiere mesa exterior, cliente frecuente...'
                                            : 'Ej: Prefiere atención telefónica, observaciones generales...'}
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-4 border-t border-outline/10">
                                <button 
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer text-xs transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer text-xs transition flex items-center gap-1 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Guardando...' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* DETAILED PROFILE & HISTORIES MODAL */}
            {isProfileOpen && selectedCust && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="glass-card max-w-2xl w-full rounded-2xl overflow-hidden p-6 shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Profile Header */}
                        <div className="flex justify-between items-start border-b border-outline/10 pb-4 mb-4">
                            <div>
                                <h3 className="font-bold text-xl text-on-surface">{selectedCust.name} {selectedCust.last_name || ''}</h3>
                                <p className="text-xs text-on-surface-variant font-mono">{selectedCust.document_type}: {selectedCust.document_number}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => openEditModal(selectedCust)}
                                    className="px-3 py-1.5 border border-outline/20 hover:bg-surface-variant/20 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                                >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                    Editar
                                </button>
                                <button 
                                    onClick={() => setIsProfileOpen(false)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Profile details grid content */}
                        <div className="flex-grow overflow-y-auto space-y-6 pr-1 custom-scrollbar text-xs">
                            {/* Inactivity alert warning */}
                            {isNeedsFollowUp(selectedCust) && (
                                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-4 rounded-xl font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined">campaign</span>
                                    <span>⚠️ Retención recomendada: Este paciente lleva más de 6 meses sin interactuar o sin agendar citas de control.</span>
                                </div>
                            )}

                            {/* ACCORDION 1: FICHA PACIENTE */}
                            <div className="space-y-3">
                                <div 
                                    onClick={() => toggleSection('info')}
                                    className="flex justify-between items-center cursor-pointer border-b border-outline/5 pb-1 select-none hover:text-primary transition-colors text-on-surface-variant"
                                >
                                    <h4 className="font-bold text-[10px] uppercase tracking-wider">Ficha del Paciente</h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.info ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.info && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container/10 p-4 rounded-xl border border-outline/5 text-left">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant">WhatsApp:</span>
                                                <span className="font-mono text-on-surface font-bold">+{selectedCust.phone}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant">Email:</span>
                                                <span className="text-on-surface">{selectedCust.email || 'No Registrado'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant">Dirección:</span>
                                                <span className="text-on-surface">{selectedCust.address || 'No Registrado'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-on-surface-variant">Último Contacto:</span>
                                                <span className="text-on-surface">
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
                            <div className="space-y-3">
                                <div 
                                    onClick={() => toggleSection('formula')}
                                    className="flex justify-between items-center cursor-pointer border-b border-outline/5 pb-1 select-none hover:text-primary transition-colors text-on-surface-variant"
                                >
                                    <h4 className="font-bold text-[10px] uppercase tracking-wider">
                                        {category === 'optica' ? 'Fórmula Óptica' :
                                         category === 'restaurante' ? 'Preferencias Alimenticias & Notas' : 'Notas & Observaciones'}
                                    </h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.formula ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.formula && (
                                    <div className="bg-surface-container/10 p-4 rounded-xl border border-outline/5">
                                        {renderPrescriptionDetail(selectedCust.lens_prescription)}
                                    </div>
                                )}
                            </div>

                            {/* ACCORDION 3: HISTORIAL DE CITAS (WITH ACCORDION & SEARCH FILTER) */}
                            <div className="space-y-3">
                                <div 
                                    onClick={() => toggleSection('citas')}
                                    className="flex justify-between items-center cursor-pointer border-b border-outline/5 pb-1 select-none hover:text-primary transition-colors text-on-surface-variant"
                                >
                                    <h4 className="font-bold text-[10px] uppercase tracking-wider">Historial de Citas</h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.citas ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.citas && (
                                    <div className="space-y-3 bg-surface-container/10 p-4 rounded-xl border border-outline/5 text-left">
                                        {/* Selector de tipo de cita (Estilo Excel) */}
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
                                                    className={`py-1 px-2.5 rounded-lg border text-[10px] font-semibold transition cursor-pointer text-center border-0 ${
                                                        visitReasonFilter === opt.value
                                                            ? 'bg-primary text-white border-primary shadow-sm'
                                                            : 'bg-surface-container-high/30 border-outline/10 text-on-surface-variant hover:bg-surface-variant/30'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>

                                        {loadingAppointments ? (
                                            <p className="text-xs text-on-surface-variant italic py-1 animate-pulse">Cargando historial de citas...</p>
                                        ) : (() => {
                                            const filteredApps = custAppointments.filter((app: any) => {
                                                // Filtrar por píldora Excel
                                                if (visitReasonFilter !== 'all' && app.visit_reason !== visitReasonFilter) return false;
                                                return true;
                                            });

                                            if (filteredApps.length === 0) {
                                                return <p className="text-on-surface-variant/60 italic py-2 text-center text-xs">No se registran citas que coincidan con la búsqueda.</p>;
                                            }

                                            return (
                                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                    {filteredApps.map(app => {
                                                        const cleanReason = app.visit_reason === 'examen_vista' ? 'Examen Vista' :
                                                                           app.visit_reason === 'venta_lentes' ? 'Venta Lentes' :
                                                                           app.visit_reason === 'otros' ? 'Otros' : (app.visit_reason || 'Sin especificar');

                                                        return (
                                                            <div key={app.id} className="flex justify-between items-center p-3 bg-surface-container/30 border border-outline/5 rounded-xl text-xs">
                                                                <div>
                                                                    <p className="font-bold text-on-surface">📅 {new Date(app.appointment_date).toLocaleDateString('es-CO')} - {new Date(app.appointment_date).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                                                    <p className="text-[10px] text-on-surface-variant mt-0.5">Motivo: <span className="font-bold text-primary">{cleanReason}</span> {app.visit_reason_details ? `(${app.visit_reason_details})` : ''}</p>
                                                                </div>
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                                    app.status === 'confirmed' ? 'bg-green-500/10 text-green-500' :
                                                                    app.status === 'canceled' ? 'bg-red-500/10 text-red-500' :
                                                                    app.status === 'attended' ? 'bg-blue-500/10 text-blue-500' :
                                                                    'bg-yellow-500/10 text-yellow-500'
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

                            {/* ACCORDION 4: TRABAJOS DE LABORATORIO (LENTES) */}
                            {category === 'optica' && (
                                <div className="space-y-3">
                                    <div 
                                        onClick={() => toggleSection('laboratorio')}
                                        className="flex justify-between items-center cursor-pointer border-b border-outline/5 pb-1 select-none hover:text-primary transition-colors text-on-surface-variant"
                                    >
                                        <h4 className="font-bold text-[10px] uppercase tracking-wider">Trabajos de Laboratorio (Lentes)</h4>
                                        <span className="material-symbols-outlined text-[16px]">
                                            {openSections.laboratorio ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </div>
                                    {openSections.laboratorio && (
                                        <div className="bg-surface-container/10 p-4 rounded-xl border border-outline/5 space-y-2">
                                            {loadingLabJobs ? (
                                                <p className="text-xs text-on-surface-variant italic py-1 animate-pulse">Cargando órdenes de laboratorio...</p>
                                            ) : custLabJobs.length === 0 ? (
                                                <p className="text-on-surface-variant/60 italic py-2 text-center text-xs">No se registran trabajos de taller para este paciente.</p>
                                            ) : (
                                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                                    {custLabJobs.map(job => (
                                                        <div key={job.id} className="p-3 bg-surface-container/30 border border-outline/5 rounded-xl space-y-1.5 text-xs text-left">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-on-surface">🔬 {job.product_name || 'Lente Formulada'}</span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                                                                    job.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                                    job.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                                                                    job.status === 'received' ? 'bg-green-500/10 text-green-500' :
                                                                    job.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-500' :
                                                                    'bg-red-500/10 text-red-500'
                                                                }`}>
                                                                    {job.status === 'pending' ? 'Pendiente' :
                                                                     job.status === 'sent' ? 'En Laboratorio' :
                                                                     job.status === 'received' ? 'En Tienda' :
                                                                     job.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-on-surface-variant font-mono">
                                                                Diseño: {job.lens_design || 'N/A'} | Material: {job.lens_material || 'N/A'} | Tratamiento: {job.lens_treatment || 'N/A'}
                                                            </div>
                                                            <div className="text-[10px] text-on-surface-variant flex justify-between border-t border-outline/5 pt-1.5">
                                                                <span>Lab: {job.supplier_name || 'Sin asignar'}</span>
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
                            <div className="space-y-3">
                                <div 
                                    onClick={() => toggleSection('facturacion')}
                                    className="flex justify-between items-center cursor-pointer border-b border-outline/5 pb-1 select-none hover:text-primary transition-colors text-on-surface-variant"
                                >
                                    <h4 className="font-bold text-[10px] uppercase tracking-wider">Historial de Facturación</h4>
                                    <span className="material-symbols-outlined text-[16px]">
                                        {openSections.facturacion ? 'expand_less' : 'expand_more'}
                                    </span>
                                </div>
                                {openSections.facturacion && (
                                    <div className="bg-surface-container/10 p-4 rounded-xl border border-outline/5">
                                        {getCustomerInvoices(selectedCust.document_number).length === 0 ? (
                                            <p className="text-on-surface-variant/60 italic py-2 text-center text-xs">No se registran compras o deudas en el historial de facturación.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {getCustomerInvoices(selectedCust.document_number).map(inv => (
                                                    <div key={inv.id} className="flex justify-between items-center p-3 bg-surface-container/30 border border-outline/5 rounded-xl text-left">
                                                        <div>
                                                            <span className="font-bold font-mono text-on-surface">{inv.invoice_number}</span>
                                                            <span className="text-[10px] text-on-surface-variant ml-2 font-mono">Vence: {new Date(inv.due_date).toLocaleDateString('es-CO')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-on-surface font-mono">${Number(inv.total_amount || 0).toLocaleString('es-CO')}</span>
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                                inv.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
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
                        <div className="border-t border-outline/10 pt-4 mt-4 flex justify-between">
                            <button 
                                onClick={() => handleDeleteCustomer(selectedCust.id, selectedCust.name)}
                                className="px-3 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl font-bold cursor-pointer transition flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                Eliminar Ficha
                            </button>
                            <button 
                                onClick={() => setIsProfileOpen(false)}
                                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl font-bold cursor-pointer transition"
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
