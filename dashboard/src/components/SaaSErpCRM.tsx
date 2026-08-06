import React, { useState, useEffect } from 'react';

interface Customer {
    id: string;
    name: string;
    document_type: string;
    document_number: string;
    phone: string;
    email: string | null;
    address: string | null;
    lens_prescription: string | null;
    last_interaction_at: string | null;
    created_at: string;
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

    // Modal state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedCust, setSelectedCust] = useState<Customer | null>(null);

    // Form inputs
    const [custName, setCustName] = useState('');
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
                    document_type: custDocType,
                    document_number: custDocNum,
                    phone: custPhone,
                    email: custEmail || null,
                    address: custAddress || null,
                    lens_prescription: lensPrescriptionValue || null
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
        setCustName('');
        setCustDocType('CC');
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
        setCustName(cust.name);
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

    const openProfileModal = (cust: Customer) => {
        setSelectedCust(cust);
        setIsProfileOpen(true);
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
    const filteredCustomers = customers.filter(cust => 
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.document_number.includes(searchQuery) ||
        cust.phone.includes(searchQuery)
    );

    return (
        <div className="space-y-6 text-on-surface">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Directorio de Clientes (CRM)</h2>
                    <p className="text-xs text-on-surface-variant">Registra historias clínicas, prescripción de lentes y audita deudas de pacientes.</p>
                </div>
                <button 
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Nuevo Cliente
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
                                    <h3 className="font-bold text-base text-on-surface leading-tight mb-1 pr-16">{cust.name}</h3>
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
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden p-6 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">
                                {selectedCust ? 'Editar Información' : 'Registrar Cliente Nuevo'}
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
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-on-surface-variant">Nombre Completo</label>
                                <input 
                                    type="text"
                                    required
                                    value={custName}
                                    onChange={(e) => setCustName(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                    placeholder="Ej: Pedro Martínez"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-on-surface-variant">Documento</label>
                                    <select 
                                        value={custDocType}
                                        onChange={(e) => setCustDocType(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                    >
                                        <option value="CC">Cédula de C. (CC)</option>
                                        <option value="NIT">NIT (Empresa)</option>
                                        <option value="CE">Cédula Extranjera (CE)</option>
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

                            {category === 'optica' ? (
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
                </div>
            )}

            {/* DETAILED PROFILE & HISTORIES MODAL */}
            {isProfileOpen && selectedCust && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-2xl w-full rounded-2xl overflow-hidden p-6 shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Profile Header */}
                        <div className="flex justify-between items-start border-b border-outline/10 pb-4 mb-4">
                            <div>
                                <h3 className="font-bold text-xl text-on-surface">{selectedCust.name}</h3>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <h4 className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-outline/5 pb-1">Ficha del Paciente</h4>
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

                                <div className="space-y-3">
                                    <h4 className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-outline/5 pb-1">
                                        {category === 'optica' ? 'Fórmula Óptica' :
                                         category === 'restaurante' ? 'Preferencias Alimenticias & Notas' : 'Notas & Observaciones'}
                                    </h4>
                                    {renderPrescriptionDetail(selectedCust.lens_prescription)}
                                </div>
                            </div>

                            {/* Billing & Debt link information */}
                            <div className="space-y-3">
                                <h4 className="font-bold text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-outline/5 pb-1">Historial de Facturación</h4>
                                {getCustomerInvoices(selectedCust.document_number).length === 0 ? (
                                    <p className="text-on-surface-variant/60 italic py-2">No se registran compras o deudas en el historial de facturación.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {getCustomerInvoices(selectedCust.document_number).map(inv => (
                                            <div key={inv.id} className="flex justify-between items-center p-3 bg-surface-container/20 border border-outline/5 rounded-xl">
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
                </div>
            )}
        </div>
    );
};
