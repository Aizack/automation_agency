import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface Category {
    id: string;
    name: string;
    created_at: string;
}

interface Supplier {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    contact_name: string | null;
    is_laboratory: boolean;
    categories: Array<{ id: string; name: string }>;
    created_at: string;
}

interface SuppliersProps {
    clientId: string;
}

export const SaaSErpSuppliers: React.FC<SuppliersProps> = ({ clientId }) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [catLoading, setCatLoading] = useState(false);
    
    // Modals
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    
    // Supplier Form
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [supplierName, setSupplierName] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierEmail, setSupplierEmail] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');
    const [supplierContact, setSupplierContact] = useState('');
    const [supplierIsLab, setSupplierIsLab] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    
    // Laboratory jobs view states
    const [selectedLabForJobs, setSelectedLabForJobs] = useState<Supplier | null>(null);
    const [labJobsForSelected, setLabJobsForSelected] = useState<any[]>([]);
    const [loadingSelectedJobs, setLoadingSelectedJobs] = useState(false);
    
    // Category Form
    const [categoryName, setCategoryName] = useState('');

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [supRes, catRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/suppliers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/clients/${clientId}/categories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            const supJson = await supRes.json();
            const catJson = await catRes.json();
            
            if (supJson.success) setSuppliers(supJson.suppliers);
            if (catJson.success) setCategories(catJson.categories);
        } catch (err) {
            console.error("Error loading suppliers/categories data:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchJobsForLab = async (supplierId: string) => {
        try {
            setLoadingSelectedJobs(true);
            const res = await fetch(`/api/clients/${clientId}/lab-jobs?supplierId=${supplierId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setLabJobsForSelected(json.labJobs || []);
            }
        } catch (err) {
            console.error("Error loading lab jobs for supplier:", err);
        } finally {
            setLoadingSelectedJobs(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId]);

    const handleOpenSupplierModal = (sup: Supplier | null = null) => {
        if (sup) {
            setEditingSupplier(sup);
            setSupplierName(sup.name);
            setSupplierPhone(sup.phone || '');
            setSupplierEmail(sup.email || '');
            setSupplierAddress(sup.address || '');
            setSupplierContact(sup.contact_name || '');
            setSupplierIsLab(!!sup.is_laboratory);
            setSelectedCategories(sup.categories.map(c => c.id));
        } else {
            setEditingSupplier(null);
            setSupplierName('');
            setSupplierPhone('');
            setSupplierEmail('');
            setSupplierAddress('');
            setSupplierContact('');
            setSupplierIsLab(false);
            setSelectedCategories([]);
        }
        setIsSupplierModalOpen(true);
    };

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierName.trim()) return;

        const body = {
            name: supplierName.trim(),
            phone: supplierPhone.trim() || null,
            email: supplierEmail.trim() || null,
            address: supplierAddress.trim() || null,
            contact_name: supplierContact.trim() || null,
            is_laboratory: supplierIsLab,
            category_ids: selectedCategories
        };

        try {
            const url = editingSupplier 
                ? `/api/clients/${clientId}/suppliers/${editingSupplier.id}`
                : `/api/clients/${clientId}/suppliers`;
            const method = editingSupplier ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`[Supplier Save] HTTP ${res.status}:`, errorText);
                alert(`Error del servidor: ${res.status}. Verifica la consola para más detalles.`);
                return;
            }

            const json = await res.json();
            if (json.success) {
                setIsSupplierModalOpen(false);
                fetchData();
            } else {
                alert(`Error: ${json.error || 'Error desconocido'}`);
            }
        } catch (err: any) {
            console.error('[Supplier Save Error]:', err);
            alert(`Error al guardar el proveedor: ${err.message}`);
        }
    };

    const handleDeleteSupplier = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este proveedor?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/suppliers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                fetchData();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al eliminar el proveedor.');
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryName.trim()) return;
        try {
            setCatLoading(true);
            const res = await fetch(`/api/clients/${clientId}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: categoryName.trim() })
            });
            const json = await res.json();
            if (json.success) {
                setCategoryName('');
                fetchData();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al crear la categoría.');
        } finally {
            setCatLoading(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Los productos asociados quedarán huérfanos de categoría.')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                fetchData();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al eliminar la categoría.');
        }
    };

    const toggleCategorySelection = (id: string) => {
        setSelectedCategories(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6 text-white">
            <div className="flex justify-between items-center border-b border-[#222428] pb-4">
                <div>
                    <h3 className="font-extrabold text-xl text-[#eab308]" style={{ color: '#eab308' }}>PROVEEDORES Y CATEGORÍAS</h3>
                    <p className="text-xs text-gray-400">
                        Administra tu directorio de proveedores y clasifica tus líneas de productos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-[#181a1c] hover:bg-[#222528] text-white border border-[#2d3036] text-[11px] font-bold px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">category</span>
                        CATEGORÍAS
                    </button>
                    <button 
                        onClick={() => handleOpenSupplierModal(null)}
                        className="bg-[#eab308] hover:bg-amber-300 text-black font-extrabold text-[11px] px-3 py-1.5 rounded-md shadow transition cursor-pointer flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        NUEVO PROVEEDOR
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : suppliers.length === 0 ? (
                <div className="glass-card p-12 text-center border border-outline/10 rounded-2xl">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40 mb-3">contact_mail</span>
                    <p className="text-sm text-on-surface-variant">No hay proveedores registrados en este momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {suppliers.map(sup => (
                        <div key={sup.id} className="glass-card p-5 rounded-2xl border border-outline/10 hover:border-primary/20 transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-sm text-on-surface">{sup.name}</h4>
                                            {sup.is_laboratory && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold bg-primary/10 text-primary uppercase tracking-wider">Laboratorio</span>
                                            )}
                                        </div>
                                        {sup.contact_name && (
                                            <p className="text-xs text-on-surface-variant opacity-70 mt-0.5 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">person</span>
                                                Contacto: {sup.contact_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => handleOpenSupplierModal(sup)}
                                            className="p-1.5 hover:bg-primary/10 text-primary rounded transition border-0 bg-transparent cursor-pointer"
                                            title="Editar"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSupplier(sup.id)}
                                            className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition border-0 bg-transparent cursor-pointer"
                                            title="Eliminar"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 text-xs font-sans text-on-surface-variant">
                                    {sup.phone && (
                                        <p className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[14px]">phone</span>
                                            {sup.phone}
                                        </p>
                                    )}
                                    {sup.email && (
                                        <p className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[14px]">mail</span>
                                            {sup.email}
                                        </p>
                                    )}
                                    {sup.address && (
                                        <p className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                                            {sup.address}
                                        </p>
                                    )}
                                    {sup.is_laboratory && (
                                        <button 
                                            onClick={() => {
                                                setSelectedLabForJobs(sup);
                                                fetchJobsForLab(sup.id);
                                            }}
                                            className="mt-3 w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-xl transition border-0 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">science</span>
                                            Ver Trabajos Asignados
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-outline/5 flex flex-wrap gap-1">
                                {sup.categories.length > 0 ? (
                                    sup.categories.map(c => (
                                        <span key={c.id} className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                            {c.name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[10px] text-on-surface-variant opacity-50 italic">Sin categorías asociadas</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Proveedor */}
            {isSupplierModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <form onSubmit={handleSaveSupplier} className="bg-surface-container-high border border-outline/10 p-6 rounded-3xl max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-base text-on-surface">
                                {editingSupplier ? 'Editar Proveedor' : 'Agregar Nuevo Proveedor'}
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setIsSupplierModalOpen(false)}
                                className="p-1 hover:bg-surface-container-highest rounded-full border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-on-surface-variant font-medium">Nombre de la Empresa *</label>
                                <input 
                                    type="text" 
                                    required
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                    placeholder="Ej: Distribuidora Óptica Internacional"
                                    className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-on-surface-variant font-medium">Persona de Contacto</label>
                                <input 
                                    type="text" 
                                    value={supplierContact}
                                    onChange={(e) => setSupplierContact(e.target.value)}
                                    placeholder="Ej: Carlos Mario Pérez"
                                    className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-on-surface-variant font-medium">Teléfono</label>
                                <input 
                                    type="text" 
                                    value={supplierPhone}
                                    onChange={(e) => setSupplierPhone(e.target.value)}
                                    placeholder="Ej: +57 312 4567890"
                                    className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-on-surface-variant font-medium">Correo Electrónico</label>
                                <input 
                                    type="email" 
                                    value={supplierEmail}
                                    onChange={(e) => setSupplierEmail(e.target.value)}
                                    placeholder="Ej: ventas@proveedor.com"
                                    className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                />
                            </div>
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs text-on-surface-variant font-medium">Dirección Física</label>
                                <input 
                                    type="text" 
                                    value={supplierAddress}
                                    onChange={(e) => setSupplierAddress(e.target.value)}
                                    placeholder="Ej: Calle 80 # 24-10 Oficina 301, Bogotá"
                                    className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 py-2">
                            <input 
                                type="checkbox" 
                                id="is_laboratory"
                                checked={supplierIsLab}
                                onChange={(e) => setSupplierIsLab(e.target.checked)}
                                className="w-4 h-4 text-primary bg-surface-container border-outline/20 rounded cursor-pointer"
                            />
                            <label htmlFor="is_laboratory" className="text-xs text-on-surface font-medium cursor-pointer">Este proveedor es un Laboratorio / Taller (Lentes formuladas)</label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider block">Categorías que Provee</label>
                            {categories.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic opacity-60">No hay categorías creadas aún. Agrégalas en el botón de categorías.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-outline/10 rounded-xl">
                                    {categories.map(cat => (
                                        <button 
                                            key={cat.id}
                                            type="button"
                                            onClick={() => toggleCategorySelection(cat.id)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border ${selectedCategories.includes(cat.id) ? 'bg-primary/10 text-primary border-primary' : 'bg-transparent border-outline/20 text-on-surface hover:bg-surface-container-highest'}`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-outline/5">
                            <button 
                                type="button"
                                onClick={() => setIsSupplierModalOpen(false)}
                                className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                            >
                                Guardar Proveedor
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Modal Categorías */}
            {isCategoryModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="bg-surface-container-high border border-outline/10 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-base text-on-surface">Categorías de Producto</h3>
                            <button 
                                type="button"
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="p-1 hover:bg-surface-container-highest rounded-full border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Nueva Categoría Form */}
                        <form onSubmit={handleCreateCategory} className="flex gap-2">
                            <input 
                                type="text"
                                required
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                placeholder="Nueva categoría (ej: Monturas)"
                                className="flex-grow bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                            />
                            <button 
                                type="submit"
                                disabled={catLoading}
                                className="bg-primary text-on-primary font-bold text-xs px-4 rounded-xl primary-glow hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-50"
                            >
                                {catLoading ? 'Creando...' : 'Crear'}
                            </button>
                        </form>

                        {/* Listado de Categorías */}
                        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block ml-1 mb-1">Listado</h4>
                            {categories.length === 0 ? (
                                <p className="text-xs text-on-surface-variant italic opacity-60 text-center py-4">No hay categorías registradas.</p>
                            ) : (
                                categories.map(cat => (
                                    <div key={cat.id} className="flex justify-between items-center bg-surface-container p-2.5 rounded-xl border border-outline/5">
                                        <span className="text-xs font-semibold text-on-surface">{cat.name}</span>
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            className="p-1 hover:bg-red-500/10 text-red-400 rounded transition border-0 bg-transparent cursor-pointer"
                                            title="Eliminar Categoría"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-outline/5">
                            <button 
                                type="button"
                                onClick={() => setIsCategoryModalOpen(false)}
                                className="px-4 py-2 bg-surface-container border border-outline/20 text-on-surface text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {selectedLabForJobs && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 text-left">
                    <div className="bg-surface border border-outline/10 p-6 rounded-3xl w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto flex flex-col">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-2 shrink-0">
                            <div>
                                <h3 className="font-bold text-sm text-on-surface">Trabajos Asignados</h3>
                                <p className="text-xs text-on-surface-variant">Laboratorio: {selectedLabForJobs.name}</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setSelectedLabForJobs(null);
                                    setLabJobsForSelected([]);
                                }}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                            {loadingSelectedJobs ? (
                                <p className="text-xs text-on-surface-variant italic py-6 text-center animate-pulse">Cargando trabajos...</p>
                            ) : labJobsForSelected.length === 0 ? (
                                <p className="text-xs text-on-surface-variant/60 italic py-6 text-center">Este laboratorio no tiene trabajos de lentes asignados.</p>
                            ) : (
                                labJobsForSelected.map(job => (
                                    <div key={job.id} className="p-3.5 bg-surface-container/20 border border-outline/5 rounded-xl text-xs space-y-2 text-left">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-on-surface text-xs">{job.customer_name} {job.customer_last_name}</h4>
                                                <p className="text-[9px] text-on-surface-variant">{new Date(job.created_at).toLocaleDateString('es-CO')}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                                                job.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                                job.status === 'sent' ? 'bg-blue-500/10 text-blue-500' :
                                                job.status === 'received' ? 'bg-green-500/10 text-green-500' :
                                                'bg-emerald-500/20 text-emerald-500'
                                            }`}>
                                                {job.status === 'pending' ? 'Pendiente' :
                                                 job.status === 'sent' ? 'En Taller' :
                                                 job.status === 'received' ? 'Listo en Tienda' : 'Entregado'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 p-2 bg-surface-container/30 rounded-lg text-[9px] font-mono leading-tight">
                                            <div>Lente: <strong>{job.product_name}</strong></div>
                                            <div>Costo: <strong>${Number(job.job_value || 0).toLocaleString('es-CO')}</strong></div>
                                            {job.lens_design && <div className="col-span-2">Diseño: <strong>{job.lens_design}</strong></div>}
                                        </div>
                                        {job.notes && (
                                            <p className="text-[9px] text-on-surface-variant/70 italic bg-surface-container/10 p-1.5 rounded">
                                                "{job.notes}"
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end pt-2 border-t border-outline/5 shrink-0">
                            <button 
                                onClick={() => {
                                    setSelectedLabForJobs(null);
                                    setLabJobsForSelected([]);
                                }}
                                className="px-4 py-2 border border-outline/20 text-on-surface rounded-xl hover:bg-surface-container text-xs cursor-pointer bg-transparent"
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
