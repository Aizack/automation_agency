import React, { useState, useEffect } from 'react';

interface Modifier {
    name: string;
    price: number;
}

interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: string;
    category_id?: string;
    available_modifiers?: Modifier[] | string;
}

interface CartItem {
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    removals: string[];
    additions: { name: string; price: number }[];
    notes: string;
}

interface RestaurantInfo {
    id: string;
    name: string;
    category?: string;
    logo_url?: string;
    phone_number?: string;
}

interface PublicRestaurantMenuProps {
    clientId?: string;
}

export const PublicRestaurantMenu: React.FC<PublicRestaurantMenuProps> = ({ clientId: propClientId }) => {
    // Extraer y decodificar clientId y número de mesa (Soporta token de seguridad o ID directo)
    const pathParts = window.location.pathname.split('/');
    const lastPathSegment = pathParts[pathParts.length - 1] || '';

    let activeClientId = propClientId || 'CLIENT-RESTAURANTE-TEST';
    let activeTableNumber = '';

    // Si la URL contiene un token de seguridad t_...
    if (lastPathSegment.startsWith('t_')) {
        try {
            const rawB64 = lastPathSegment.slice(2).replace(/-/g, '+').replace(/_/g, '/');
            const decoded = JSON.parse(atob(rawB64));
            if (decoded.c) activeClientId = decoded.c;
            if (decoded.t) activeTableNumber = decoded.t;
        } catch (e) {
            console.error("Error decoding secure menu token:", e);
        }
    } else if (lastPathSegment && lastPathSegment !== 'menu' && !lastPathSegment.startsWith('mesa-')) {
        activeClientId = lastPathSegment;
    }

    const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros y Búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');

    // Modal de Personalización de Plato
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [itemQty, setItemQty] = useState(1);
    const [removalsList, setRemovalsList] = useState<string[]>([]);
    const [additionsList, setAdditionsList] = useState<{ name: string; price: number }[]>([]);
    const [additionName, setAdditionName] = useState('');
    const [additionPrice, setAdditionPrice] = useState('');
    const [itemNotes, setItemNotes] = useState('');

    // Carrito de Compras
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Datos del Cliente y Tipo de Orden
    const [orderType, setOrderType] = useState<'mesa' | 'domicilio'>('mesa');
    const [tableNumber, setTableNumber] = useState(activeTableNumber);
    const [customerName, setCustomerName] = useState('');
    const [customerDni, setCustomerDni] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [isIndividualAccount, setIsIndividualAccount] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

    const fetchMenu = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/public/menu/${activeClientId}`);
            const data = await res.json();
            if (data.success) {
                setRestaurant(data.restaurant);
                setMenuItems(data.menu_items || []);
            }
        } catch (err) {
            console.error("Error loading public menu:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();

        // Extraer número de mesa si viene por query param tradicional
        const params = new URLSearchParams(window.location.search);
        const mesaParam = params.get('table') || params.get('mesa') || activeTableNumber;
        if (mesaParam) {
            setTableNumber(mesaParam);
            setOrderType('mesa');
        }

        // Ocultar / Enmascarar la URL en la barra del navegador por seguridad
        const maskedTable = mesaParam || activeTableNumber;
        const cleanPath = maskedTable ? `/m/mesa-${maskedTable}` : `/m/menu-digital`;
        if (window.location.pathname !== cleanPath) {
            window.history.replaceState({}, '', cleanPath);
        }
    }, [activeClientId]);

    // Extraer Categorías Únicas
    const categories = ['TODOS', ...Array.from(new Set(menuItems.map(item => item.category_id || 'Menú General')))];

    // Filtrar Productos
    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (item.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'TODOS' || (item.category_id || 'Menú General') === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const openCustomizationModal = (item: MenuItem) => {
        setSelectedItem(item);
        setItemQty(1);
        setRemovalsList([]);
        setAdditionsList([]);
        setAdditionName('');
        setAdditionPrice('');
        setItemNotes('');
    };



    const handleAddCustomAddition = () => {
        if (!additionName.trim()) return;
        setAdditionsList(prev => [...prev, { name: additionName.trim(), price: parseFloat(additionPrice) || 0 }]);
        setAdditionName('');
        setAdditionPrice('');
    };

    const handleAddToCart = () => {
        if (!selectedItem) return;
        const priceNum = parseFloat(selectedItem.price) || 0;

        setCart(prev => [
            ...prev,
            {
                product_id: selectedItem.id,
                name: selectedItem.name,
                price: priceNum,
                quantity: itemQty,
                removals: [...removalsList],
                additions: [...additionsList],
                notes: itemNotes
            }
        ]);

        setSelectedItem(null);
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    // Cálculos de Totales
    const cartSubtotal = cart.reduce((sum, item) => {
        const addonsCost = item.additions.reduce((s, a) => s + a.price, 0);
        return sum + (item.price + addonsCost) * item.quantity;
    }, 0);

    const impoconsumo = Math.round(cartSubtotal * 0.08); // 8% Impoconsumo Colombia
    const deliveryFee = orderType === 'domicilio' ? 4000 : 0;
    const cartTotal = cartSubtotal + impoconsumo + deliveryFee;

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;

        if (orderType === 'mesa' && !tableNumber) {
            alert("Por favor ingresa tu Número de Mesa.");
            return;
        }

        if (orderType === 'mesa' && isIndividualAccount && (!customerName.trim() || !customerDni.trim())) {
            alert("Por favor ingresa tu Nombre y Cédula/NIT para tu cuenta individual.");
            return;
        }

        if (orderType === 'domicilio' && (!customerName || !customerPhone || !customerAddress)) {
            alert("Por favor completa tu Nombre, Teléfono y Dirección de entrega.");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch('/api/public/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: activeClientId,
                    order_type: orderType,
                    table_number: tableNumber,
                    customer_name: isIndividualAccount ? customerName : (customerName || `Mesa #${tableNumber}`),
                    customer_dni: customerDni || null,
                    customer_phone: customerPhone,
                    customer_address: customerAddress,
                    is_individual: isIndividualAccount,
                    items: cart,
                    notes: `Pedido desde Carta Digital Web`
                })
            });

            const data = await res.json();
            if (data.success) {
                setOrderSuccess(data);
                setCart([]);
                setIsCartOpen(false);
            } else {
                alert(`Error al enviar pedido: ${data.error}`);
            }
        } catch (err) {
            console.error("Error submitting order:", err);
            alert("Error de conexión al enviar el pedido.");
        } finally {
            setSubmitting(false);
        }
    };

    const sendWhatsAppConfirmation = () => {
        if (!orderSuccess || !restaurant) return;
        const text = `*¡Hola ${restaurant.name}!* 👋🏼\nAcabo de realizar el pedido *#${orderSuccess.order_number}* por la Carta Digital:\n\n*Modalidad:* ${orderType === 'domicilio' ? `🛵 Domicilio (${customerAddress})` : `🪑 Mesa #${tableNumber}`}\n*Total:* $${orderSuccess.total_amount?.toLocaleString()} COP\n\nQuedo atento a la confirmación de la cocina. ¡Gracias!`;
        const phone = restaurant.phone_number || '573000000000';
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-amber-300 tracking-wider uppercase animate-pulse">Cargando carta gastronómica...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-on-surface font-sans pb-32">
            {/* Header Hero Banner */}
            <header className="bg-gradient-to-b from-amber-950/40 via-[#0a0a0c] to-[#0a0a0c] border-b border-outline/10 p-6 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/10">
                                🍽️
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-white tracking-tight">{restaurant?.name || 'Restaurante Exclusivo'}</h1>
                                <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 uppercase">
                                    {restaurant?.category || 'Menú Digital Gourmet'}
                                </span>
                            </div>
                        </div>

                        {/* Selector de Modalidad */}
                        <div className="bg-surface/80 p-1 rounded-2xl border border-outline/10 flex gap-1">
                            <button
                                type="button"
                                onClick={() => setOrderType('mesa')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                    orderType === 'mesa' ? 'bg-amber-500 text-black shadow-md' : 'text-on-surface-variant hover:text-white'
                                }`}
                            >
                                🪑 En Mesa
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrderType('domicilio')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                    orderType === 'domicilio' ? 'bg-emerald-500 text-black shadow-md' : 'text-on-surface-variant hover:text-white'
                                }`}
                            >
                                🛵 Domicilio
                            </button>
                        </div>
                    </div>

                    {/* Buscador */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-on-surface-variant text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar salchipapas, entradas, bebidas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface/90 border border-outline/20 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-on-surface-variant/60 outline-none focus:border-amber-400 transition"
                        />
                    </div>

                    {/* Navegación por Categorías */}
                    <div className="flex gap-2 overflow-x-auto pt-1 no-scrollbar select-none">
                        {categories.map((cat, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                                    selectedCategory === cat
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20'
                                        : 'bg-surface/60 border border-outline/10 text-on-surface-variant hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Grid de Platos */}
            <main className="max-w-4xl mx-auto p-4 md:p-6">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-16 space-y-3 bg-surface/20 border border-outline/10 rounded-3xl p-6">
                        <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">restaurant_menu</span>
                        <p className="text-xs font-bold text-on-surface-variant">No encontramos platos en esta categoría.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredItems.map(item => {
                            const priceNum = parseFloat(item.price) || 0;
                            const mods = typeof item.available_modifiers === 'string' ? JSON.parse(item.available_modifiers || '[]') : (item.available_modifiers || []);
                            return (
                                <div key={item.id} className="bg-surface/50 border border-outline/10 p-5 rounded-3xl space-y-4 hover:border-amber-500/30 transition flex flex-col justify-between shadow-xl backdrop-blur-md">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-extrabold text-white text-base leading-tight">{item.name}</h3>
                                            <span className="font-black text-amber-400 text-sm whitespace-nowrap bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                                                ${priceNum.toLocaleString()} COP
                                            </span>
                                        </div>

                                        {item.description && (
                                            <p className="text-xs text-on-surface-variant/80 line-clamp-3 leading-relaxed">{item.description}</p>
                                        )}

                                        {mods.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                                    ✨ {mods.length} adicionales disponibles
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => openCustomizationModal(item)}
                                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-2xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                                        Ordenar
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal de Personalización de Plato para Cliente */}
            {selectedItem && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-md bg-black/85 flex items-center justify-center p-4">
                    <div className="bg-[#121216] border border-outline/20 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <div>
                                <h3 className="font-extrabold text-white text-base">{selectedItem.name}</h3>
                                <span className="text-xs font-black text-amber-400">${(parseFloat(selectedItem.price) || 0).toLocaleString()} COP</span>
                            </div>
                            <button type="button" onClick={() => setSelectedItem(null)} className="text-on-surface-variant hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Cantidad */}
                        <div className="flex items-center justify-between bg-surface/50 p-3 rounded-2xl border border-outline/10">
                            <span className="text-xs font-bold text-white">Cantidad de Porciones:</span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setItemQty(q => Math.max(1, q - 1))}
                                    className="w-8 h-8 rounded-xl bg-surface border border-outline/20 text-white font-bold text-sm flex items-center justify-center"
                                >
                                    -
                                </button>
                                <span className="font-extrabold text-amber-400 text-sm">{itemQty}</span>
                                <button
                                    type="button"
                                    onClick={() => setItemQty(q => q + 1)}
                                    className="w-8 h-8 rounded-xl bg-surface border border-outline/20 text-white font-bold text-sm flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Adicionales Pre-configurados en 1-Clic */}
                        {(() => {
                            const parsedMods = typeof selectedItem.available_modifiers === 'string'
                                ? JSON.parse(selectedItem.available_modifiers || '[]')
                                : (selectedItem.available_modifiers || []);
                            if (!Array.isArray(parsedMods) || parsedMods.length === 0) return null;
                            return (
                                <div className="space-y-2 bg-surface/50 p-3 rounded-2xl border border-outline/10">
                                    <label className="text-xs font-extrabold text-emerald-400 uppercase">💡 Adicionales Sugeridos (1-Clic):</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {parsedMods.map((mod: any, idx: number) => {
                                            const isSelected = additionsList.some(a => a.name === mod.name);
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setAdditionsList(prev => prev.filter(a => a.name !== mod.name));
                                                        } else {
                                                            setAdditionsList(prev => [...prev, { name: mod.name, price: parseFloat(mod.price) || 0 }]);
                                                        }
                                                    }}
                                                    className={`text-xs px-3 py-1.5 rounded-xl border font-extrabold transition cursor-pointer flex items-center gap-1 ${
                                                        isSelected
                                                            ? 'bg-emerald-500 text-black border-emerald-400 shadow-md scale-105'
                                                            : 'bg-surface border-outline/20 text-emerald-300 hover:bg-emerald-500/20'
                                                    }`}
                                                >
                                                    {isSelected ? '✓' : '+'} {mod.name} (+${(parseFloat(mod.price) || 0).toLocaleString()} COP)
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Adicionales Personalizados */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-on-surface-variant">Otro Adicional Personalizado:</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Ej: Extra queso"
                                    value={additionName}
                                    onChange={(e) => setAdditionName(e.target.value)}
                                    className="col-span-2 bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                                />
                                <input
                                    type="number"
                                    placeholder="Precio ($)"
                                    value={additionPrice}
                                    onChange={(e) => setAdditionPrice(e.target.value)}
                                    className="bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                                />
                            </div>
                            <button type="button" onClick={handleAddCustomAddition} className="w-full py-2 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-500/30">
                                + Agregar Adicional Extra
                            </button>
                            {additionsList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {additionsList.map((a, i) => (
                                        <span key={i} className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                                            ➕ {a.name} (+${a.price.toLocaleString()} COP)
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Nota especial */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-on-surface-variant">Instrucciones Especiales para Cocina:</label>
                            <input
                                type="text"
                                placeholder="Ej: Salsa aparte, bien tostado..."
                                value={itemNotes}
                                onChange={(e) => setItemNotes(e.target.value)}
                                className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-2xl hover:opacity-90 shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
                            Agregar al Carrito de la Orden
                        </button>
                    </div>
                </div>
            )}

            {/* Barra Flotante / Carrito de Compras */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-black via-black/90 to-transparent backdrop-blur-xl border-t border-outline/10">
                    <div className="max-w-4xl mx-auto flex items-center justify-between bg-surface/90 border border-amber-500/40 p-4 rounded-3xl shadow-2xl shadow-amber-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-black font-black flex items-center justify-center text-sm shadow-md">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </div>
                            <div>
                                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Total de tu Pedido:</span>
                                <strong className="text-base font-black text-white">${cartTotal.toLocaleString()} COP</strong>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-2xl hover:opacity-90 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                            <span>Ver Pedido</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Drawer de Confirmación de Pedido */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-md bg-black/90 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-[#121216] border border-outline/20 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                                🛒 Resumen de tu Pedido
                            </h3>
                            <button type="button" onClick={() => setIsCartOpen(false)} className="text-on-surface-variant hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modalidad Selector */}
                        <div className="space-y-2 bg-surface/50 p-3 rounded-2xl border border-outline/10">
                            <label className="text-xs font-bold text-amber-400">Modalidad de Atención:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOrderType('mesa')}
                                    className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                        orderType === 'mesa' ? 'bg-amber-500 text-black shadow-md' : 'bg-surface border border-outline/20 text-on-surface-variant'
                                    }`}
                                >
                                    🪑 Consumo en Mesa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderType('domicilio')}
                                    className={`py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                        orderType === 'domicilio' ? 'bg-emerald-500 text-black shadow-md' : 'bg-surface border border-outline/20 text-on-surface-variant'
                                    }`}
                                >
                                    🛵 Domicilio a Casa
                                </button>
                            </div>
                        </div>

                        {/* Formulario según modalidad */}
                        {orderType === 'mesa' ? (
                            <div className="space-y-3 bg-surface/50 p-3.5 rounded-2xl border border-outline/10">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white">Número de Mesa *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Mesa 4, Terraza 2"
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-400 font-bold"
                                        required
                                    />
                                </div>

                                {/* Modalidad de Cuenta: Individual por Comensal vs Cuenta Conjunta */}
                                <div className="space-y-2 pt-1 border-t border-outline/10">
                                    <label className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wide">💳 Modalidad de Cobro para la Mesa:</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsIndividualAccount(false)}
                                            className={`py-2 rounded-xl text-[11px] font-extrabold transition cursor-pointer border ${
                                                !isIndividualAccount ? 'bg-amber-500 text-black border-amber-400 shadow-md' : 'bg-surface border-outline/20 text-on-surface-variant'
                                            }`}
                                        >
                                            🪑 Cuenta Conjunta de Mesa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsIndividualAccount(true)}
                                            className={`py-2 rounded-xl text-[11px] font-extrabold transition cursor-pointer border ${
                                                isIndividualAccount ? 'bg-amber-500 text-black border-amber-400 shadow-md' : 'bg-surface border-outline/20 text-on-surface-variant'
                                            }`}
                                        >
                                            👤 Cuenta Individual por Persona
                                        </button>
                                    </div>

                                    {isIndividualAccount && (
                                        <div className="space-y-2 pt-2">
                                            <p className="text-[11px] text-amber-300 font-medium leading-relaxed">
                                                💡 Tu pedido quedará separado a tu nombre para que al pagar solo canceles tu consumo individual.
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-white">Nombre y Apellido *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Laura Restrepo"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-white outline-none focus:border-amber-400 font-semibold"
                                                        required={isIndividualAccount}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-white">Cédula / NIT *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 1020304050"
                                                        value={customerDni}
                                                        onChange={(e) => setCustomerDni(e.target.value)}
                                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-white outline-none focus:border-amber-400 font-mono"
                                                        required={isIndividualAccount}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: María Gómez"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-400"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-white">Teléfono Celular *</label>
                                        <input
                                            type="tel"
                                            placeholder="3001234567"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-400"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-white">Dirección de Entrega *</label>
                                        <input
                                            type="text"
                                            placeholder="Calle 45 #12-34 Apt 301"
                                            value={customerAddress}
                                            onChange={(e) => setCustomerAddress(e.target.value)}
                                            className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-400"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lista de Ítems */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between bg-surface/60 p-3 rounded-2xl border border-outline/10 text-xs">
                                    <div className="space-y-0.5">
                                        <strong className="text-white text-xs">{item.quantity}x {item.name}</strong>
                                        {item.removals.length > 0 && <p className="text-[10px] text-rose-300">Sin: {item.removals.join(', ')}</p>}
                                        {item.additions.length > 0 && <p className="text-[10px] text-emerald-300">Con: {item.additions.map(a => a.name).join(', ')}</p>}
                                        {item.notes && <p className="text-[10px] text-on-surface-variant italic">Nota: {item.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <strong className="text-amber-400">${(item.price * item.quantity).toLocaleString()}</strong>
                                        <button type="button" onClick={() => removeFromCart(idx)} className="text-rose-400 hover:text-rose-300">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totales */}
                        <div className="space-y-1 bg-surface-container/60 p-4 rounded-2xl border border-outline/10 text-xs">
                            <div className="flex justify-between text-on-surface-variant">
                                <span>Subtotal:</span>
                                <span>${cartSubtotal.toLocaleString()} COP</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                                <span>Impoconsumo (8%):</span>
                                <span>${impoconsumo.toLocaleString()} COP</span>
                            </div>
                            {orderType === 'domicilio' && (
                                <div className="flex justify-between text-emerald-400 font-bold">
                                    <span>Flete de Domicilio:</span>
                                    <span>${deliveryFee.toLocaleString()} COP</span>
                                </div>
                            )}
                            <div className="flex justify-between text-white font-black text-sm pt-2 border-t border-outline/10">
                                <span>Total a Pagar:</span>
                                <span className="text-amber-400 text-base">${cartTotal.toLocaleString()} COP</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSubmitOrder}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-2xl hover:opacity-90 shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                            {submitting ? 'Enviando Pedido a Cocina...' : '🚀 Confirmar & Enviar Pedido a Cocina'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Éxito de Pedido */}
            {orderSuccess && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-md bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-[#121216] border border-amber-500/40 w-full max-w-md rounded-3xl p-6 text-center space-y-5 shadow-2xl">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl border ${
                            orderType === 'domicilio' 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}>
                            {orderType === 'domicilio' ? '⏳' : '✓'}
                        </div>
                        <div>
                            <h3 className="font-extrabold text-white text-xl">
                                {orderType === 'domicilio' ? '🟡 Pedido Registrado (Pago Pendiente)' : '¡Pedido Recibido en Cocina!'}
                            </h3>
                            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                                {orderType === 'domicilio' ? (
                                    <>
                                        Tu orden <strong>#{orderSuccess.order_number}</strong> está registrada. Para envíos a domicilio, <strong>envía tu comprobante de pago por WhatsApp</strong> para que la caja valide e inicie la preparación en cocina.
                                    </>
                                ) : (
                                    <>
                                        Tu comanda <strong>#{orderSuccess.order_number}</strong> para la <strong>Mesa #{tableNumber}</strong> ha sido enviada al KDS de cocina.
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="bg-surface/50 p-4 rounded-2xl border border-outline/10 text-xs space-y-1">
                            <span className="text-on-surface-variant block">Total de la Orden:</span>
                            <strong className="text-amber-400 text-lg font-black">${orderSuccess.total_amount?.toLocaleString()} COP</strong>
                        </div>

                        <div className="space-y-2">
                            {orderType === 'domicilio' ? (
                                <button
                                    type="button"
                                    onClick={sendWhatsAppConfirmation}
                                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chat</span>
                                    💬 Adjuntar Comprobante de Pago por WhatsApp
                                </button>
                            ) : (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    ¡Comanda enviada 100% digital a la pantalla de cocina!
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setOrderSuccess(null)}
                                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs rounded-xl hover:opacity-90 transition cursor-pointer"
                            >
                                {orderType === 'mesa' ? '🍽️ Pedir Algo Más para la Mesa' : 'Volver a la Carta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
