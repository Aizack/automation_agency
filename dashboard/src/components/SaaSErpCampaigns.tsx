import React, { useState, useEffect } from 'react';

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
            const [visitsRes, empRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/field-visits`, { headers }),
                fetch(`/api/clients/${clientId}/employees`, { headers })
            ]);

            const visitsJson = await visitsRes.json();
            const empJson = await empRes.json();

            if (visitsJson.success) setVisits(visitsJson.visits || []);
            if (empJson.success) setEmployees(empJson.employees || []);
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
            alert('La geolocalización no es soportada por tu navegador.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLatitude(pos.coords.latitude.toString());
                setLongitude(pos.coords.longitude.toString());
            },
            () => {
                alert('No se pudo obtener la ubicación. Por favor digitala manualmente.');
            }
        );
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !address || !contactName) {
            setErrorMsg('Nombre, dirección y contacto principal son obligatorios.');
            return;
        }

        try {
            setErrorMsg('');
            setSuccessMsg('');
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
                    point_of_sale: pointOfSale || 'Principal',
                    address,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                    contact_name: contactName,
                    secondary_contacts: secondaryContacts ? [secondaryContacts] : [],
                    agreement_terms: agreementTerms || null,
                    proof_photo_url: proofPhoto || null,
                    status: 'programada'
                })
            });

            const json = await res.json();
            if (json.success) {
                setSuccessMsg('Campaña programada exitosamente.');
                setIsCreateOpen(false);
                // Reset form
                setName('');
                setEmployeeId('');
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
            setErrorMsg(err.message || 'Error de red.');
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
        <div className="space-y-6 text-on-surface">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Campañas de Campo y Visitas</h2>
                    <p className="text-xs text-on-surface-variant">Programa y gestiona las campañas puerta a puerta (Calle) o ventas directas en convenios institucionales (Sitio).</p>
                </div>
                <button
                    onClick={() => { setErrorMsg(''); setIsCreateOpen(true); }}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
                >
                    <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
                    Programar Campaña
                </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface-container/20 border border-outline/10 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold">Total Campañas</p>
                        <p className="text-2xl font-black mt-1 text-white">{totalCampaigns}</p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[32px]">campaign</span>
                </div>

                <div className="bg-surface-container/20 border border-outline/10 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold">Inscritos Captados</p>
                        <p className="text-2xl font-black mt-1 text-white">{totalCustomersCaptured} Leads</p>
                    </div>
                    <span className="material-symbols-outlined text-green-500 text-[32px]">group_add</span>
                </div>

                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase font-mono tracking-wider text-on-surface-variant font-bold">Retorno ROI de Ventas</p>
                        <p className="text-2xl font-black mt-1 text-green-500">${new Intl.NumberFormat('es-CO').format(totalROI)} COP</p>
                    </div>
                    <span className="material-symbols-outlined text-white text-[32px]">paid</span>
                </div>
            </div>

            {/* Success message banner */}
            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs p-3 rounded-xl font-bold">
                    ✅ {successMsg}
                </div>
            )}

            {/* Listing grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : visits.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-outline/20 rounded-2xl">
                    <span className="material-symbols-outlined text-on-surface-variant/40 text-[48px] mb-2">map</span>
                    <p className="text-sm font-bold text-on-surface-variant">No hay campañas programadas en esta zona.</p>
                    <p className="text-xs text-on-surface-variant/60 mt-1">Haz clic en "Programar Campaña" para agendar tu primera visita.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {visits.map(v => (
                        <div key={v.id} className="glass-card p-5 rounded-2xl border border-outline/10 flex flex-col justify-between space-y-4">
                            {/* Card Header info */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`material-symbols-outlined text-[16px] ${v.campaign_type === 'calle' ? 'text-amber-500' : 'text-primary'}`}>
                                            {v.campaign_type === 'calle' ? 'streetview' : 'domain'}
                                        </span>
                                        <h3 className="font-bold text-sm text-on-surface capitalize">{v.name}</h3>
                                    </div>
                                    <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">Asignado: {v.employee_name || 'Sin Asignar'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    v.status === 'programada' ? 'bg-blue-500/10 text-blue-500' :
                                    v.status === 'en_progreso' ? 'bg-amber-500/10 text-amber-500' :
                                    v.status === 'completada' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                    {v.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Details table / info list */}
                            <div className="text-xs space-y-2 bg-surface-container/20 p-3 rounded-xl border border-outline/5">
                                <div className="grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant">
                                    <p>📍 Municipio: <strong className="text-on-surface">{v.municipio} ({v.department})</strong></p>
                                    <p>🏡 Barrio: <strong className="text-on-surface">{v.barrio || 'Sin Barrio'}</strong></p>
                                    <p>⛪ Punto de Venta: <strong className="text-on-surface">{v.point_of_sale}</strong></p>
                                    <p>🗺️ Ubicación: <strong className="text-on-surface font-mono">{v.latitude?.toFixed(4)}, {v.longitude?.toFixed(4)}</strong></p>
                                </div>
                                <p className="text-[10px] text-on-surface-variant border-t border-outline/5 pt-1.5 mt-1.5">
                                    Dirección: <span className="font-bold text-on-surface">{v.address}</span>
                                </p>
                                <p className="text-[10px] text-on-surface-variant">
                                    Contacto Principal: <span className="font-bold text-on-surface">{v.contact_name}</span>
                                </p>
                                {v.agreement_terms && (
                                    <p className="text-[10px] text-primary bg-primary/5 p-2 rounded-lg italic">
                                        💡 Convenio/Términos: {v.agreement_terms}
                                    </p>
                                )}
                            </div>

                            {/* Performance indicators */}
                            <div className="grid grid-cols-2 gap-3 text-center border-y border-outline/5 py-2.5">
                                <div>
                                    <p className="text-[9px] text-on-surface-variant uppercase">Captados</p>
                                    <p className="font-bold text-xs text-white">{v.registered_customers_count} inscritos</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-on-surface-variant uppercase">ROI Ventas</p>
                                    <p className="font-bold text-xs text-green-500">${new Intl.NumberFormat('es-CO').format(v.total_sales_amount)}</p>
                                </div>
                            </div>

                            {/* Verification photo proof */}
                            {v.proof_photo_url ? (
                                <div className="space-y-1">
                                    <p className="text-[9px] text-on-surface-variant font-bold uppercase">Foto de Comprobación check-in:</p>
                                    <div className="rounded-xl overflow-hidden border border-outline/10 h-32 w-full bg-surface-container">
                                        <img 
                                            src={v.proof_photo_url} 
                                            alt="Prueba de visita" 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[9px] text-on-surface-variant/60 italic text-center py-2">Sin comprobante fotográfico adjunto.</p>
                            )}

                            {/* Actions buttons */}
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={() => handleDeleteCampaign(v.id)}
                                    className="p-2 text-red-500 hover:bg-red-500/10 border-0 rounded-lg cursor-pointer transition inline-flex"
                                    title="Eliminar campaña"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>

                                {v.status === 'programada' && (
                                    <button
                                        onClick={() => handleUpdateStatus(v.id, 'en_progreso')}
                                        className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer transition flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                                        Iniciar Visita
                                    </button>
                                )}

                                {v.status === 'en_progreso' && (
                                    <button
                                        onClick={() => handleUpdateStatus(v.id, 'completada')}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-lg border-0 cursor-pointer transition flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">check</span>
                                        Completar check-out
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE CAMPAIGN MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-lg w-full rounded-2xl overflow-hidden p-6 shadow-2xl animate-float max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Programar Nueva Campaña</h3>
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

                        <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Nombre de la Campaña</label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: Visita Institucional Sena"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Tipo de Campaña</label>
                                    <select
                                        value={campaignType}
                                        onChange={(e) => setCampaignType(e.target.value as any)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                    >
                                        <option value="sitio">Sitio (Empresa, Colegio, Convenio)</option>
                                        <option value="calle">Calle (Puerta a Puerta / Barrio)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Asesor Responsable</label>
                                <select
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                >
                                    <option value="">Selecciona asesor responsable...</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Departamento (Región)</label>
                                    <input
                                        type="text"
                                        required
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Municipio o Ciudad</label>
                                    <input
                                        type="text"
                                        required
                                        value={municipio}
                                        onChange={(e) => setMunicipio(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Barrio / Comuna</label>
                                    <input
                                        type="text"
                                        value={barrio}
                                        onChange={(e) => setBarrio(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: Suba, Chapinero..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Punto de Venta / Locación</label>
                                    <input
                                        type="text"
                                        value={pointOfSale}
                                        onChange={(e) => setPointOfSale(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: Colegio San Carlos, Parroquia..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Dirección Física</label>
                                <input
                                    type="text"
                                    required
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                    placeholder="Ej: Calle 45 # 12 - 34"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Nombre de Contacto / Encargado</label>
                                    <input
                                        type="text"
                                        required
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: Rector Jorge Torres"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Teléfono Encargado</label>
                                    <input
                                        type="text"
                                        value={secondaryContacts}
                                        onChange={(e) => setSecondaryContacts(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                        placeholder="Ej: 3105556677"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Términos del Convenio / Beneficios</label>
                                <textarea
                                    value={agreementTerms}
                                    onChange={(e) => setAgreementTerms(e.target.value)}
                                    rows={2}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none resize-none"
                                    placeholder="Ej: Descuento del 10% en matrículas..."
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Coordenadas GPS</label>
                                    <button
                                        type="button"
                                        onClick={handleGetCurrentLocation}
                                        className="text-[9px] text-primary hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-0.5"
                                    >
                                        <span className="material-symbols-outlined text-[11px]">my_location</span>
                                        Obtener Ubicación
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2 rounded-xl text-on-surface focus:border-primary outline-none font-mono"
                                        placeholder="Latitud"
                                    />
                                    <input
                                        type="text"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        className="w-full bg-surface-container-high/40 border border-outline/20 p-2 rounded-xl text-on-surface focus:border-primary outline-none font-mono"
                                        placeholder="Longitud"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Foto de Respaldo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="w-full text-xs text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer file:cursor-pointer"
                                />
                                {proofPhoto && (
                                    <div className="rounded-xl overflow-hidden border border-outline/10 h-24 w-full bg-surface-container">
                                        <img src={proofPhoto} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-outline/10">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer transition text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer transition text-xs"
                                >
                                    Crear Campaña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
