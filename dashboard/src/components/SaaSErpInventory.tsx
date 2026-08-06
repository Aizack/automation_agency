import React, { useState, useEffect, useRef } from 'react';

interface Product {
    id: string;
    name: string;
    sku: string | null;
    description: string | null;
    price: string;
    stock: number;
    created_at: string;
}

interface SaaSErpInventoryProps {
    clientId: string;
}

export const SaaSErpInventory: React.FC<SaaSErpInventoryProps> = ({ clientId }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form fields
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState(0);
    const [stock, setStock] = useState(0);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [importSuccessMsg, setImportSuccessMsg] = useState('');
    const [importErrorMsg, setImportErrorMsg] = useState('');
    const [importing, setImporting] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const token = localStorage.getItem('auth_token');

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setProducts(json.products || []);
            }
        } catch (err) {
            console.error("Error loading products:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [clientId]);

    // Barcode Autofocus hook: ensures search input remains focused for physical scanning guns
    useEffect(() => {
        if (!loading && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [loading, isFormOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const body = { name, sku, description, price, stock };

        try {
            const url = editingProduct 
                ? `/api/clients/${clientId}/products/${editingProduct.id}`
                : `/api/clients/${clientId}/products`;
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                fetchProducts();
                resetForm();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al guardar el producto.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchProducts();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al eliminar producto.');
        }
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            setImportSuccessMsg('');
            setImportErrorMsg('');

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/clients/${clientId}/products/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const json = await res.json();

            if (json.success) {
                setImportSuccessMsg(json.message || 'Productos importados correctamente.');
                fetchProducts();
            } else {
                setImportErrorMsg(json.error || 'Error al importar archivo CSV.');
            }
        } catch (err) {
            setImportErrorMsg('Error de conexión al enviar el archivo.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const openEdit = (prod: Product) => {
        setEditingProduct(prod);
        setName(prod.name);
        setSku(prod.sku || '');
        setDescription(prod.description || '');
        setPrice(parseFloat(prod.price));
        setStock(prod.stock);
        setIsFormOpen(true);
    };

    const resetForm = () => {
        setEditingProduct(null);
        setName('');
        setSku('');
        setDescription('');
        setPrice(0);
        setStock(0);
        setIsFormOpen(false);
    };

    const formatPrice = (val: string) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0
        }).format(parseFloat(val));
    };

    const filteredProducts = products.filter(prod => {
        const match = searchTerm.trim().toLowerCase();
        if (!match) return true;
        return (
            prod.name.toLowerCase().includes(match) ||
            (prod.sku && prod.sku.toLowerCase().includes(match))
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Catálogo de Inventario</h2>
                    <p className="text-xs text-gray-400 font-medium">Administra los productos, lentes y monturas. Lee SKU de barra en foco.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportCSV} 
                        className="hidden" 
                        accept=".csv" 
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[16px]">publish</span>
                        {importing ? 'Importando...' : 'Importar CSV'}
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="bg-[#0a5cff] hover:bg-[#0047d4] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Agregar Producto
                    </button>
                </div>
            </div>

            {/* Banners feedback */}
            {importSuccessMsg && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs p-3 rounded-xl font-bold">
                    ✅ {importSuccessMsg}
                </div>
            )}
            {importErrorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl font-bold">
                    ⚠️ {importErrorMsg}
                </div>
            )}

            {/* Barcode-focused Search Bar */}
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                    <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
                </span>
                <input 
                    type="text"
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscador por código de barras SKU o nombre..."
                    className="w-full bg-[#0d1527]/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-[#0a5cff] outline-none transition"
                />
                {searchTerm && (
                    <button 
                        onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 border-0 bg-transparent text-gray-400 cursor-pointer hover:text-white"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                )}
            </div>

            {isFormOpen && (
                <div className="bg-[#0d1527] border border-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                        {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 font-medium">Nombre del Producto *</label>
                            <input 
                                type="text"
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 font-medium">SKU / Código Único</label>
                            <input 
                                type="text"
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 font-medium">Precio de Venta (COP) *</label>
                            <input 
                                type="number"
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition"
                                value={price}
                                onChange={(e) => setPrice(parseFloat(e.target.value))}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-gray-400 font-medium">Stock en Existencias *</label>
                            <input 
                                type="number"
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition"
                                value={stock}
                                onChange={(e) => setStock(parseInt(e.target.value))}
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-xs text-gray-400 font-medium">Descripción</label>
                            <textarea 
                                className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition min-h-[80px]"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer text-white"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-[#0a5cff] hover:bg-[#0047d4] text-white text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer"
                            >
                                {editingProduct ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-[#0a5cff] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="bg-[#090d16] border border-white/5 p-12 text-center rounded-2xl">
                    <p className="text-sm text-gray-500">No hay productos que coincidan con la búsqueda.</p>
                </div>
            ) : (
                <div className="bg-[#0d1527]/50 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase font-bold">
                                <th className="p-4">Producto</th>
                                <th className="p-4">SKU</th>
                                <th className="p-4">Precio</th>
                                <th className="p-4">Stock</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {filteredProducts.map((prod) => (
                                <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <p className="font-bold text-white">{prod.name}</p>
                                        {prod.description && <p className="text-xs text-gray-400 mt-0.5">{prod.description}</p>}
                                    </td>
                                    <td className="p-4 font-mono text-xs text-white">{prod.sku || '-'}</td>
                                    <td className="p-4 font-semibold text-white">{formatPrice(prod.price)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${prod.stock < 5 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {prod.stock} uds
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            <button 
                                                onClick={() => openEdit(prod)}
                                                className="p-1.5 hover:bg-[#0a5cff]/20 text-[#0a5cff] rounded transition cursor-pointer border-0 bg-transparent"
                                                title="Editar"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(prod.id)}
                                                className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition cursor-pointer border-0 bg-transparent"
                                                title="Eliminar"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
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
