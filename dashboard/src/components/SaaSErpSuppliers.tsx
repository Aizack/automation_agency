import React, { useState, useEffect } from 'react';
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
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    
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
            setSelectedCategories(sup.categories.map(c => c.id));
        } else {
            setEditingSupplier(null);
            setSupplierName('');
            setSupplierPhone('');
            setSupplierEmail('');
            setSupplierAddress('');
            setSupplierContact('');
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
            
            const json = await res.json();
            if (json.success) {
                setIsSupplierModalOpen(false);
                fetchData();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al guardar el proveedor.');
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
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-outline/10 pb-4">
                <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Proveedores y Categorías</h3>
                    <p className="text-on-surface-variant text-body-md opacity-70">
                        Administra tu directorio de proveedores y clasifica tus líneas de productos.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-surface-container hover:bg-surface-container-highest text-on-surface border border-outline/20 font-label-md px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[18px]">tag</span>
                        Categorías
                    </button>
                    <button 
                        onClick={() => handleOpenSupplierModal()}
                        className="bg-primary text-on-primary font-label-md px-4 py-2.5 rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Nuevo Proveedor
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
                                        <h4 className="font-bold text-sm text-on-surface">{sup.name}</h4>
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
            {isSupplierModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSaveSupplier} className="bg-surface-container-high border border-outline/10 p-6 rounded-2xl max-w-lg w-full shadow-2xl animate-fade-in space-y-4">
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
                </div>
            )}

            {/* Modal Categorías */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-container-high border border-outline/10 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-fade-in space-y-4">
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
                </div>
            )}
        </div>
    );
};
