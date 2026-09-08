import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Visit {
    id: string;
    employee_id: string | null;
    employee_name: string | null;
    name: string;
    campaign_type: 'calle' | 'sitio';
    agreement_terms: string | null;
    department: string;
    municipio: string;
    barrio: string | null;
    point_of_sale: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    contact_name: string;
    secondary_contacts: string | null;
    proof_photo_url: string | null;
    visit_date: string;
    status: 'programada' | 'en_progreso' | 'completada' | 'cancelada';
    registered_customers_count: number;
    total_sales_amount: number;
}

interface Employee {
    id: string;
    name: string;
}

interface SaaSErpCampaignsProps {
    clientId: string;
}

export const SaaSErpCampaigns: React.FC<SaaSErpCampaignsProps> = ({ clientId }) => {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [showPointOfSaleSuggestions, setShowPointOfSaleSuggestions] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [campaignType, setCampaignType] = useState<'calle' | 'sitio'>('sitio');
    const [employeeId, setEmployeeId] = useState('');
    const [department, setDepartment] = useState('Cundinamarca');
    const [municipio, setMunicipio] = useState('Bogotá');
    const [barrio, setBarrio] = useState('');
    const [pointOfSale, setPointOfSale] = useState('');
    const [address, setAddress] = useState('');
    const [contactName, setContactName] = useState('');
    const [secondaryContacts, setSecondaryContacts] = useState('');
    const [agreementTerms, setAgreementTerms] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [proofPhoto, setProofPhoto] = useState<string | null>(null);

    const token = localStorage.getItem('auth_token');

    const loadData = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${token}` };
            const [visitsRes, empRes, crmRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/field-visits`, { headers }),
                fetch(`/api/clients/${clientId}/employees`, { headers }),
                fetch(`/api/clients/${clientId}/crm-customers`, { headers })
            ]);

            const visitsJson = await visitsRes.json();
            const empJson = await empRes.json();
            const crmJson = await crmRes.json();

            if (visitsJson.success) setVisits(visitsJson.visits || []);
            if (empJson.success) setEmployees(empJson.employees || []);
            if (crmJson.success) {
                const comp = (crmJson.customers || []).filter((c: any) => c.customer_type === 'empresa');
                setCompanies(comp);
            }
        } catch (err) {
            console.error("Error loading field visits data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [clientId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('La geolocalización no está soportada por tu navegador.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude.toFixed(6));
                setLongitude(pos.coords.longitude.toFixed(6));
            },
            (err) => {
                alert('No se pudo obtener la ubicación: ' + err.message);
            }
        );
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!name || !address || !contactName) {
            setErrorMsg('Nombre de campaña, dirección y contacto principal son obligatorios.');
            return;
        }

        try {
            const res = await fetch(`/api/clients/${clientId}/field-visits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    campaign_type: campaignType,
                    employee_id: employeeId || null,
                    department,
                    municipio,
                    barrio: barrio || null,
                    point_of_sale: pointOfSale || name,
                    address,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                    contact_name: contactName,
                    secondary_contacts: secondaryContacts || null,
                    agreement_terms: agreementTerms || null,
                    proof_photo_url: proofPhoto
                })
            });

            const json = await res.json();
            if (json.success) {
                setSuccessMsg('Campaña creada y asignada exitosamente.');
                setIsCreateOpen(false);
                // Reset form
                setName('');
                setBarrio('');
                setPointOfSale('');
                setAddress('');
                setContactName('');
                setSecondaryContacts('');
                setAgreementTerms('');
                setLatitude('');
                setLongitude('');
                setProofPhoto(null);
                loadData();
            } else {
                setErrorMsg(json.error || 'Error al crear la campaña.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión.');
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!window.confirm('¿Estás seguro de eliminar esta campaña?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/field-visits/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                loadData();
            }
        } catch (err) {
            console.error("Error deleting campaign:", err);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: 'en_progreso' | 'completada' | 'cancelada') => {
        let photoUrl: string | null = null;
        if (newStatus === 'completada') {
            const confirmFinish = window.confirm('¿Deseas dar por completada la campaña y registrar el check-out?');
            if (!confirmFinish) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        photoUrl = reader.result as string;
                        await sendUpdate(id, newStatus, photoUrl);
                    };
                    reader.readAsDataURL(file);
                } else {
                    await sendUpdate(id, newStatus, null);
                }
            };
            input.click();
        } else {
            await sendUpdate(id, newStatus, null);
        }
    };

    const sendUpdate = async (id: string, status: string, photo: string | null) => {
        try {
            const res = await fetch(`/api/clients/${clientId}/field-visits/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, proof_photo_url: photo })
            });
            const json = await res.json();
            if (json.success) {
                loadData();
            } else {
                alert(json.error || 'Error al actualizar campaña.');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Calculate aggregated metrics
    const totalCampaigns = visits.length;
    const totalCustomersCaptured = visits.reduce((acc, curr) => acc + curr.registered_customers_count, 0);
    const totalROI = visits.reduce((acc, curr) => acc + curr.total_sales_amount, 0);

    return (
        <div className="space-y-6 text-[#161616] font-sans antialiased">
            {/* Header Principal Wabi-Sabi */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
                <div>
                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
                        CAMPO & CONVENIOS
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
                        Campañas de Campo & Visitas
                    </h2>
                    <p className="text-xs text-[#76746E] mt-1.5">
                        Programa brigadas puerta a puerta (Calle) y convenios comerciales e institucionales (Sitio).
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadData}
                        className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-white border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Refrescar
                    </button>
                    <button
                        type="button"
                        onClick={() => { setErrorMsg(''); setIsCreateOpen(true); }}
                        className="px-4 py-2 bg-[#161616] text-[#F6F4EE] hover:bg-[#2b2b2b] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-xs"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                        Programar Campaña
                    </button>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#76746E] font-bold">Total Campañas</span>
                    <p className="text-2xl font-bold font-mono text-[#161616] mt-1">{totalCampaigns}</p>
                    <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                        En campo y convenios registrados
                    </p>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#76746E] font-bold">Inscritos Captados</span>
                    <p className="text-2xl font-bold font-mono text-[#137333] mt-1">{totalCustomersCaptured} Leads</p>
                    <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                        Clientes potenciales incorporados
                    </p>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-[#76746E] font-bold">Retorno ROI de Ventas</span>
                    <p className="text-2xl font-bold font-mono text-[#161616] mt-1">${new Intl.NumberFormat('es-CO').format(totalROI)} COP</p>
                    <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
                        Facturación atribuida a campo
                    </p>
                </div>
            </div>

            {/* Success message banner */}
            {successMsg && (
                <div className="bg-[#E6F4EA] border border-[#137333] text-[#137333] text-xs p-3 rounded-none font-mono font-bold shadow-xs">
                    ✅ {successMsg}
                </div>
            )}

            {/* Listing grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E2DFD7] rounded-none">
                    <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando campañas de campo...</p>
                </div>
            ) : visits.length === 0 ? (
                <div className="bg-white border border-[#E2DFD7] p-12 text-center rounded-none shadow-xs space-y-2">
                    <span className="material-symbols-outlined text-[#76746E] text-[36px]">map</span>
                    <p className="text-sm font-serif text-[#161616]">No hay campañas programadas en esta zona.</p>
                    <p className="text-xs text-[#76746E] font-mono">Haz clic en "Programar Campaña" para agendar tu primera visita en campo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visits.map(v => (
                        <div key={v.id} className="bg-white border border-[#E2DFD7] p-5 rounded-none flex flex-col justify-between space-y-4 hover:border-[#161616] transition shadow-xs">
                            {/* Card Header info */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`material-symbols-outlined text-[18px] ${v.campaign_type === 'calle' ? 'text-[#B06000]' : 'text-[#161616]'}`}>
                                            {v.campaign_type === 'calle' ? 'streetview' : 'domain'}
                                        </span>
                                        <h3 className="font-serif font-bold text-base text-[#161616] capitalize">{v.name}</h3>
                                    </div>
                                    <p className="text-[10px] text-[#76746E] font-mono mt-0.5">
                                        Asignado a: <span className="text-[#161616] font-semibold">{v.employee_name || 'Sin Asignar'}</span>
                                    </p>
                                </div>
                                <span className={`px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider border rounded-none ${
                                    v.status === 'programada' ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/30' :
                                    v.status === 'en_progreso' ? 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]/30' :
                                    v.status === 'completada' ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' : 
                                    'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]/30'
                                }`}>
                                    {v.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Details table / info list */}
                            <div className="text-xs space-y-2 bg-[#FAF8F5] p-3.5 border border-[#E2DFD7] font-mono text-[11px]">
                                <div className="grid grid-cols-2 gap-2 text-[#76746E]">
                                    <p>📍 Municipio: <strong className="text-[#161616]">{v.municipio} ({v.department})</strong></p>
                                    <p>🏡 Barrio: <strong className="text-[#161616]">{v.barrio || 'Sin Barrio'}</strong></p>
                                    <p>🏢 Punto Venta: <strong className="text-[#161616]">{v.point_of_sale}</strong></p>
                                    <p>🗺️ GPS: <strong className="text-[#161616]">{v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}</strong></p>
                                </div>
                                <p className="text-[#76746E] border-t border-[#E2DFD7] pt-1.5 mt-1.5">
                                    Dirección: <span className="font-bold text-[#161616]">{v.address}</span>
                                </p>
                                <p className="text-[#76746E]">
                                    Contacto Principal: <span className="font-bold text-[#161616]">{v.contact_name}</span>
                                </p>
                                {v.agreement_terms && (
                                    <p className="text-[#161616] bg-white p-2 border border-[#E2DFD7] italic text-[10px]">
                                        💡 Convenio: {v.agreement_terms}
                                    </p>
                                )}
                            </div>

                            {/* Performance indicators */}
                            <div className="grid grid-cols-2 gap-3 text-center border-y border-[#E2DFD7] py-2.5 font-mono">
                                <div>
                                    <p className="text-[9px] text-[#76746E] uppercase">Captados</p>
                                    <p className="font-bold text-xs text-[#161616]">{v.registered_customers_count} inscritos</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-[#76746E] uppercase">ROI Ventas</p>
                                    <p className="font-bold text-xs text-[#137333]">${new Intl.NumberFormat('es-CO').format(v.total_sales_amount)}</p>
                                </div>
                            </div>

                            {/* Verification photo proof */}
                            {v.proof_photo_url ? (
                                <div className="space-y-1">
                                    <p className="text-[9px] text-[#76746E] font-mono font-bold uppercase">Foto de Comprobación Check-in:</p>
                                    <div className="border border-[#E2DFD7] h-32 w-full bg-[#FAF8F5]">
                                        <img 
                                            src={v.proof_photo_url} 
                                            alt="Prueba de visita" 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-[#76746E] italic text-center py-1 font-mono">Sin comprobante fotográfico adjunto.</p>
                            )}

                            {/* Actions buttons */}
                            <div className="flex gap-2 justify-end pt-2 border-t border-[#E2DFD7]">
                                <button
                                    type="button"
                                    onClick={() => handleDeleteCampaign(v.id)}
                                    className="p-1.5 text-[#C5221F] hover:bg-[#FFF5F5] border border-transparent hover:border-[#C5221F] transition cursor-pointer flex items-center justify-center"
                                    title="Eliminar campaña"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>

                                {v.status === 'programada' && (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(v.id, 'en_progreso')}
                                        className="px-3 py-1.5 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] text-[10px] font-mono font-bold uppercase tracking-wider border-0 cursor-pointer transition flex items-center gap-1 shadow-xs"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                                        Iniciar Visita
                                    </button>
                                )}

                                {v.status === 'en_progreso' && (
                                    <button
                                        type="button"
                                        onClick={() => handleUpdateStatus(v.id, 'completada')}
                                        className="px-3 py-1.5 bg-[#137333] hover:bg-[#0f5b28] text-white text-[10px] font-mono font-bold uppercase tracking-wider border-0 cursor-pointer transition flex items-center gap-1 shadow-xs"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">check</span>
                                        Completar Check-out
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE CAMPAIGN MODAL */}
            {isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
                    <div className="bg-[#F6F4EE] border border-[#161616] max-w-lg w-full rounded-none overflow-hidden p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] tracking-widest block">
                                    NUEVA ACTIVIDAD
                                </span>
                                <h3 className="font-serif font-bold text-xl text-[#161616]">Programar Nueva Campaña</h3>
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

                        <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Nombre de la Campaña *</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Ej: Visita Institucional Sena"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Tipo de Campaña *</label>
                                    <select
                                        value={campaignType}
                                        onChange={(e) => setCampaignType(e.target.value as any)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none cursor-pointer font-mono text-xs"
                                    >
                                        <option value="sitio">Sitio (Empresa, Colegio, Convenio)</option>
                                        <option value="calle">Calle (Puerta a Puerta / Barrio)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Asesor Responsable</label>
                                <select
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none cursor-pointer font-mono text-xs"
                                >
                                    <option value="">Selecciona asesor responsable...</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Departamento</label>
                                    <input
                                        type="text"
                                        required
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Municipio o Ciudad</label>
                                    <input
                                        type="text"
                                        required
                                        value={municipio}
                                        onChange={(e) => setMunicipio(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Barrio / Comuna</label>
                                    <input
                                        type="text"
                                        value={barrio}
                                        onChange={(e) => setBarrio(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Ej: Suba, Chapinero..."
                                    />
                                </div>

                                <div className="space-y-1 relative">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Locación / Empresa CRM</label>
                                    <input
                                        type="text"
                                        value={pointOfSale}
                                        onChange={(e) => {
                                            setPointOfSale(e.target.value);
                                            setShowPointOfSaleSuggestions(true);
                                        }}
                                        onFocus={() => setShowPointOfSaleSuggestions(true)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Busca o escribe una empresa..."
                                    />
                                    {showPointOfSaleSuggestions && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#161616] rounded-none shadow-2xl max-h-40 overflow-y-auto z-[99999] custom-scrollbar text-xs font-mono">
                                            <div className="p-2 border-b border-[#E2DFD7] flex justify-between items-center bg-[#FAF8F5]">
                                                <span className="font-bold text-[9px] uppercase tracking-wider text-[#76746E]">Sugerencias CRM</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPointOfSaleSuggestions(false)}
                                                    className="text-[#D9381E] hover:underline text-[10px] font-bold bg-transparent border-0 cursor-pointer"
                                                >
                                                    Cerrar
                                                </button>
                                            </div>
                                            {companies.filter(c => 
                                                c.name.toLowerCase().includes(pointOfSale.toLowerCase())
                                            ).length === 0 ? (
                                                <div className="p-3 text-[#76746E] italic">
                                                    No se encontraron empresas.
                                                </div>
                                            ) : (
                                                companies.filter(c => 
                                                    c.name.toLowerCase().includes(pointOfSale.toLowerCase())
                                                ).map(comp => (
                                                    <div 
                                                        key={comp.id}
                                                        onClick={() => {
                                                            setPointOfSale(comp.name);
                                                            if (comp.address) setAddress(comp.address);
                                                            setShowPointOfSaleSuggestions(false);
                                                        }}
                                                        className="p-2.5 hover:bg-[#FAF8F5] cursor-pointer border-b border-[#E2DFD7] text-[#161616] flex flex-col"
                                                    >
                                                        <span className="font-bold">{comp.name}</span>
                                                        {comp.address && <span className="text-[10px] text-[#76746E]">{comp.address}</span>}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Dirección Física *</label>
                                <input
                                    type="text"
                                    required
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                    placeholder="Ej: Calle 45 # 12 - 34"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Contacto / Encargado *</label>
                                    <input
                                        type="text"
                                        required
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Ej: Rector Jorge Torres"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Teléfono Encargado</label>
                                    <input
                                        type="text"
                                        value={secondaryContacts}
                                        onChange={(e) => setSecondaryContacts(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Ej: 3105556677"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Términos del Convenio / Beneficios</label>
                                <textarea
                                    value={agreementTerms}
                                    onChange={(e) => setAgreementTerms(e.target.value)}
                                    rows={2}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none resize-none font-mono text-xs"
                                    placeholder="Ej: Descuento del 10% en monturas, exámenes gratis..."
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Coordenadas GPS</label>
                                    <button
                                        type="button"
                                        onClick={handleGetCurrentLocation}
                                        className="text-[10px] font-mono text-[#D9381E] hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-0.5"
                                    >
                                        <span className="material-symbols-outlined text-[12px]">my_location</span>
                                        Obtener Ubicación Actual
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Latitud"
                                    />
                                    <input
                                        type="text"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                        placeholder="Longitud"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Foto de Respaldo / Check-in</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="w-full text-xs text-[#76746E] font-mono file:mr-3 file:py-1.5 file:px-3 file:rounded-none file:border file:border-[#E2DFD7] file:text-xs file:font-mono file:font-bold file:bg-[#FAF8F5] file:text-[#161616] hover:file:bg-[#E2DFD7] cursor-pointer file:cursor-pointer"
                                />
                                {proofPhoto && (
                                    <div className="border border-[#E2DFD7] h-24 w-full bg-[#FAF8F5] mt-1">
                                        <img src={proofPhoto} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

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
                                    className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs"
                                >
                                    Crear Campaña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
