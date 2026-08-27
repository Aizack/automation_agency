import React, { useState, useEffect } from 'react';

interface Table {
    id: string;
    table_number: string;
    zone: string;
    capacity: number;
    status: 'free' | 'occupied' | 'waiting_food' | 'billing';
    assigned_waiter_id?: string;
    waiter_name?: string;
}

interface Product {
    id: string;
    name: string;
    price: string;
    category_id?: string;
}

interface SelectedOrderItem {
    product: Product;
    quantity: number;
    removals: string[];
    additions: { name: string; price: number }[];
    notes: string;
    station: 'kitchen' | 'bar';
}

interface RestaurantWaiterPortalProps {
    clientId: string;
    waiterId?: string;
    waiterName?: string;
}

export const RestaurantWaiterPortal: React.FC<RestaurantWaiterPortalProps> = ({ clientId, waiterId, waiterName }) => {
    const [tables, setTables] = useState<Table[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [orderCart, setOrderCart] = useState<SelectedOrderItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [removalInput, setRemovalInput] = useState('');
    const [removalsList, setRemovalsList] = useState<string[]>([]);
    const [additionNameInput, setAdditionNameInput] = useState('');
    const [additionPriceInput, setAdditionPriceInput] = useState('');
    const [additionsList, setAdditionsList] = useState<{ name: string; price: number }[]>([]);
    const [itemNotes, setItemNotes] = useState('');
    const [itemStation, setItemStation] = useState<'kitchen' | 'bar'>('kitchen');
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('auth_token');

    const fetchTablesAndProducts = async () => {
        try {
            setLoading(true);
            const [tabRes, prodRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/restaurant/tables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/products`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const tabData = await tabRes.json();
            const prodData = await prodRes.json();

            if (tabData.success) setTables(tabData.tables || []);
            if (prodData.success) setProducts(prodData.products || []);
        } catch (err) {
            console.error("Error loading waiter portal data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTablesAndProducts();
        const interval = setInterval(fetchTablesAndProducts, 12000);
        return () => clearInterval(interval);
    }, []);

    const handleAddRemoval = () => {
        if (!removalInput.trim()) return;
        setRemovalsList(prev => [...prev, removalInput.trim()]);
        setRemovalInput('');
    };

    const handleAddAddition = () => {
        if (!additionNameInput.trim()) return;
        const price = parseFloat(additionPriceInput) || 0;
        setAdditionsList(prev => [...prev, { name: additionNameInput.trim(), price }]);
        setAdditionNameInput('');
        setAdditionPriceInput('');
    };

    const handleAddItemToCart = () => {
        if (!selectedProduct) return;
        setOrderCart(prev => [
            ...prev,
            {
                product: selectedProduct,
                quantity: 1,
                removals: removalsList,
                additions: additionsList,
                notes: itemNotes,
                station: itemStation
            }
        ]);
        // Reset modal state
        setSelectedProduct(null);
        setRemovalsList([]);
        setAdditionsList([]);
        setItemNotes('');
    };

    const handleSendOrderToKds = async () => {
        if (!selectedTable || orderCart.length === 0) return;
        try {
            setLoading(true);

            // Separar comandas de Cocina vs. Barra
            const kitchenItems = orderCart.filter(i => i.station === 'kitchen');
            const barItems = orderCart.filter(i => i.station === 'bar');

            if (kitchenItems.length > 0) {
                await fetch(`/api/clients/${clientId}/restaurant/kds`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        table_id: selectedTable.id,
                        waiter_id: waiterId || null,
                        station: 'kitchen',
                        items: kitchenItems.map(i => ({
                            name: i.product.name,
                            quantity: i.quantity,
                            removals: i.removals,
                            additions: i.additions.map(a => `${a.name} (+$${a.price.toLocaleString()})`),
                            notes: i.notes
                        }))
                    })
                });
            }

            if (barItems.length > 0) {
                await fetch(`/api/clients/${clientId}/restaurant/kds`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        table_id: selectedTable.id,
                        waiter_id: waiterId || null,
                        station: 'bar',
                        items: barItems.map(i => ({
                            name: i.product.name,
                            quantity: i.quantity,
                            removals: i.removals,
                            additions: i.additions.map(a => `${a.name} (+$${a.price.toLocaleString()})`),
                            notes: i.notes
                        }))
                    })
                });
            }

            alert(`✅ Comanda de Mesa ${selectedTable.table_number} enviada a Cocina/Barra con éxito.`);
            setOrderCart([]);
            setSelectedTable(null);
            fetchTablesAndProducts();
        } catch (err) {
            console.error("Error sending order to KDS:", err);
            alert("Error al enviar comanda a cocina.");
        } finally {
            setLoading(false);
        }
    };

    const getTableBadgeColor = (status: string) => {
        switch (status) {
            case 'free': return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
            case 'occupied': return 'bg-rose-500/20 border-rose-500/50 text-rose-400';
            case 'waiting_food': return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
            case 'billing': return 'bg-sky-500/20 border-sky-500/50 text-sky-400';
            default: return 'bg-surface-container border-outline/20 text-on-surface';
        }
    };

    const getTableStatusLabel = (status: string) => {
        switch (status) {
            case 'free': return 'Libre';
            case 'occupied': return 'Ocupada';
            case 'waiting_food': return 'En Cocina';
            case 'billing': return 'Pidiendo Cuenta';
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Comandero */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container/40 p-4 rounded-3xl border border-outline/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                        <span className="material-symbols-outlined text-[28px]">room_service</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">Comandero Móvil de Meseros</h2>
                        <p className="text-xs text-on-surface-variant">
                            {waiterName ? `Atendiendo como: ${waiterName}` : 'Selección de mesas y envío rápido a cocina/barra'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Libre</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Ocupada</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> En Cocina</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Pidiendo Cuenta</span>
                </div>
            </div>

            {/* Mapa de Mesas por Zonas */}
            {!selectedTable ? (
                <div className="space-y-6">
                    <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">table_restaurant</span>
                        Selecciona una Mesa para Tomar Pedido
                    </h3>

                    {tables.length === 0 ? (
                        <div className="text-center py-12 bg-surface-container/20 border border-dashed border-outline/20 rounded-3xl">
                            <p className="text-on-surface-variant text-sm">No hay mesas registradas. Puedes crearlas desde la administración del ERP.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {tables.map(table => (
                                <button
                                    key={table.id}
                                    type="button"
                                    onClick={() => setSelectedTable(table)}
                                    className={`p-5 rounded-3xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 shadow-md hover:scale-105 ${getTableBadgeColor(table.status)}`}
                                >
                                    <span className="material-symbols-outlined text-[36px]">table_restaurant</span>
                                    <span className="font-extrabold text-base text-on-surface">Mesa {table.table_number}</span>
                                    <span className="text-[11px] font-semibold">{getTableStatusLabel(table.status)}</span>
                                    <span className="text-[10px] opacity-75">{table.zone} ({table.capacity} p)</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Panel de Pedido de la Mesa Seleccionada */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Catálogo de Menú */}
                    <div className="lg:col-span-2 bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTable(null)}
                                    className="p-2 bg-surface-container border border-outline/20 hover:bg-surface-variant rounded-xl transition text-on-surface"
                                >
                                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                </button>
                                <div>
                                    <h3 className="font-bold text-on-surface text-base">
                                        Mesa {selectedTable.table_number} ({selectedTable.zone})
                                    </h3>
                                    <p className="text-xs text-on-surface-variant">Toca un plato para personalizar e incluir en la comanda</p>
                                </div>
                            </div>
                        </div>

                        {/* Grid de Productos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {products.map(prod => (
                                <button
                                    key={prod.id}
                                    type="button"
                                    onClick={() => setSelectedProduct(prod)}
                                    className="p-3.5 bg-surface-container/60 hover:bg-primary/10 border border-outline/20 hover:border-primary/40 rounded-2xl text-left transition cursor-pointer flex flex-col justify-between"
                                >
                                    <span className="font-bold text-on-surface text-xs block mb-1">{prod.name}</span>
                                    <span className="text-primary font-black text-xs">${parseFloat(prod.price).toLocaleString()} COP</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comanda Actual (Carrito de Mesa) */}
                    <div className="bg-surface-container/40 border border-outline/10 p-5 rounded-3xl space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                            <h3 className="font-bold text-on-surface text-base flex items-center justify-between">
                                <span>Comanda de Mesa</span>
                                <span className="bg-primary/20 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold">
                                    {orderCart.length} ítems
                                </span>
                            </h3>

                            {orderCart.length === 0 ? (
                                <p className="text-xs text-on-surface-variant text-center py-8 italic">
                                    La comanda está vacía. Selecciona un plato del menú.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                    {orderCart.map((item, idx) => (
                                        <div key={idx} className="bg-surface/50 border border-outline/10 p-3 rounded-2xl text-xs space-y-1">
                                            <div className="flex items-center justify-between font-bold text-on-surface">
                                                <span>{item.product.name}</span>
                                                <span className="text-primary">${parseFloat(item.product.price).toLocaleString()}</span>
                                            </div>
                                            {item.removals.length > 0 && (
                                                <p className="text-[11px] text-rose-400">🚫 {item.removals.join(', ')}</p>
                                            )}
                                            {item.additions.length > 0 && (
                                                <p className="text-[11px] text-emerald-400">➕ {item.additions.map(a => `${a.name} (+$${a.price})`).join(', ')}</p>
                                            )}
                                            {item.notes && (
                                                <p className="text-[11px] text-amber-400 italic">📝 "{item.notes}"</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {orderCart.length > 0 && (
                            <button
                                type="button"
                                onClick={handleSendOrderToKds}
                                disabled={loading}
                                className="w-full py-3.5 bg-primary text-on-primary font-extrabold text-xs rounded-2xl hover:opacity-90 shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                {loading ? 'Enviando...' : 'Enviar Comanda a Cocina/Barra'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Personalizador de Plato */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-surface-container border border-outline/20 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-bold text-on-surface text-base">Personalizar {selectedProduct.name}</h3>
                            <button type="button" onClick={() => setSelectedProduct(null)} className="text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Estación de Destino */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-on-surface-variant">Estación de Destino:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setItemStation('kitchen')}
                                    className={`py-2 rounded-xl text-xs font-bold transition ${itemStation === 'kitchen' ? 'bg-primary text-on-primary' : 'bg-surface border border-outline/20 text-on-surface-variant'}`}
                                >
                                    👨‍🍳 Cocina
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setItemStation('bar')}
                                    className={`py-2 rounded-xl text-xs font-bold transition ${itemStation === 'bar' ? 'bg-primary text-on-primary' : 'bg-surface border border-outline/20 text-on-surface-variant'}`}
                                >
                                    🍹 Barra
                                </button>
                            </div>
                        </div>

                        {/* Remociones Sin Costo */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-on-surface-variant">Remociones / Quitar Insumo (Sin costo):</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ej: Sin cebolla, Sin picante..."
                                    value={removalInput}
                                    onChange={(e) => setRemovalInput(e.target.value)}
                                    className="flex-grow bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                />
                                <button type="button" onClick={handleAddRemoval} className="px-3 bg-surface-variant text-on-surface font-bold text-xs rounded-xl">
                                    +
                                </button>
                            </div>
                            {removalsList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {removalsList.map((rem, i) => (
                                        <span key={i} className="bg-rose-500/20 text-rose-300 text-[11px] px-2 py-0.5 rounded-lg border border-rose-500/30">
                                            🚫 {rem}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Adicionales Con Costo */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-on-surface-variant">Adicionales (Con costo extra):</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Nombre adicion..."
                                    value={additionNameInput}
                                    onChange={(e) => setAdditionNameInput(e.target.value)}
                                    className="col-span-2 bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                />
                                <input
                                    type="number"
                                    placeholder="Precio ($)"
                                    value={additionPriceInput}
                                    onChange={(e) => setAdditionPriceInput(e.target.value)}
                                    className="bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                />
                            </div>
                            <button type="button" onClick={handleAddAddition} className="w-full py-1.5 bg-surface-variant text-on-surface font-bold text-xs rounded-xl">
                                + Agregar Adicional
                            </button>
                            {additionsList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {additionsList.map((add, i) => (
                                        <span key={i} className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2 py-0.5 rounded-lg border border-emerald-500/30">
                                            ➕ {add.name} (+${add.price})
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Nota especial */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-on-surface-variant">Nota para Cocina:</label>
                            <input
                                type="text"
                                placeholder="Ej: Término medio, salsa aparte..."
                                value={itemNotes}
                                onChange={(e) => setItemNotes(e.target.value)}
                                className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleAddItemToCart}
                            className="w-full py-3 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 transition cursor-pointer"
                        >
                            Agregar a Comanda
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
