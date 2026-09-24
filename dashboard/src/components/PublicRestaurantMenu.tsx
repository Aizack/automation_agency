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
    image_url?: string;
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
    banner_url?: string;
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
    } else if (lastPathSegment.startsWith('mesa-')) {
        activeTableNumber = lastPathSegment.replace('mesa-', '');
    } else if (lastPathSegment && lastPathSegment !== 'menu-digital' && lastPathSegment !== 'menu') {
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
    const [isTableLocked, setIsTableLocked] = useState(false);
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

        // Extraer número de mesa si viene por query param tradicional (?table=2 o ?mesa=2)
        const params = new URLSearchParams(window.location.search);
        const mesaParam = params.get('table') || params.get('mesa') || activeTableNumber;
        if (mesaParam) {
            setTableNumber(mesaParam);
            setIsTableLocked(true);
            setOrderType('mesa');
        }

        // Mantener la identidad del restaurante y la mesa en la barra de navegación al compartir/recargar
        const currentPath = window.location.pathname;
        let cleanPath = currentPath;
        if (currentPath === '/m/' || currentPath === '/m' || currentPath === '/menu' || currentPath === '/menu/') {
            cleanPath = activeClientId !== 'CLIENT-RESTAURANTE-TEST' ? `/m/${activeClientId}` : '/m/menu-digital';
        }

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
                    notes: `Pedido desde Carta Digital Web Wabi-Sabi`
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
            <div className="min-h-screen bg-[#FAF8F5] text-[#2C2825] flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-12 h-12 border-4 border-[#D9381E]/30 border-t-[#D9381E] rounded-full animate-spin"></div>
                <p className="text-xs font-serif font-bold text-[#6C655F] tracking-widest uppercase animate-pulse">Cargando carta gastronómica...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#2C2825] font-sans pb-32">
            {/* Header Hero Banner del Restaurante con Estética Wabi-Sabi Paper */}
            <header className="relative border-b border-[#E5E0D8] backdrop-blur-md sticky top-0 z-40 bg-[#FAF8F5]/95 shadow-sm">
                {/* Banner de Portada / Hero Background */}
                <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-[#EBE6DD]">
                    {restaurant?.banner_url ? (
                        <img
                            src={restaurant.banner_url}
                            alt="Banner Restaurante"
                            className="w-full h-full object-cover opacity-85"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-[#F0EDE6] via-[#EAE5DD] to-[#E2DDD3] flex items-center justify-center">
                            <span className="text-4xl opacity-20">🍃</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/40 to-transparent" />
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-12 relative z-10 space-y-4 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FAF7F2] border-2 border-[#D9381E]/30 text-[#D9381E] flex items-center justify-center text-3xl shadow-md overflow-hidden shrink-0">
                                {restaurant?.logo_url ? (
                                    <img src={restaurant.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    '⛩️'
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-serif font-black text-[#2C2825] tracking-tight drop-shadow-sm">{restaurant?.name || 'Restaurante Gastronómico'}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-bold text-[#D9381E] bg-[#D9381E]/10 px-2.5 py-0.5 rounded-md border border-[#D9381E]/20 uppercase tracking-wider">
                                        {restaurant?.category || 'Menú Digital Gourmet'}
                                    </span>
                                    {tableNumber && (
                                        <span className="text-[11px] font-bold text-[#2E593C] bg-[#EAF2ED] px-2.5 py-0.5 rounded-md border border-[#3B6E4C]/30 flex items-center gap-1">
                                            🪑 Mesa #{tableNumber} {isTableLocked && '🔒'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Selector de Modalidad */}
                        <div className="bg-[#EAE6DF] p-1 rounded-xl border border-[#D8D2C7] flex gap-1 shadow-inner self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setOrderType('mesa')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                    orderType === 'mesa' ? 'bg-[#D9381E] text-white shadow-sm' : 'text-[#6C655F] hover:text-[#2C2825]'
                                }`}
                            >
                                🪑 En Mesa {tableNumber ? `(#${tableNumber})` : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setOrderType('domicilio')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                    orderType === 'domicilio' ? 'bg-[#2E593C] text-white shadow-sm' : 'text-[#6C655F] hover:text-[#2C2825]'
                                }`}
                            >
                                🛵 Domicilio
                            </button>
                        </div>
                    </div>

                    {/* Buscador Wabi-Sabi */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-[#8C857B] text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar platos, entradas, bebidas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#FAF7F2] border border-[#E5E0D8] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#2C2825] placeholder:text-[#8C857B] outline-none focus:border-[#D9381E] transition shadow-inner"
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
                                        ? 'bg-[#D9381E] text-white shadow-sm'
                                        : 'bg-[#FAF7F2] border border-[#E5E0D8] text-[#6C655F] hover:text-[#2C2825]'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Grid de Platos Wabi-Sabi Paper */}
            <main className="max-w-4xl mx-auto p-4 md:p-6">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-16 space-y-3 bg-[#FAF7F2] border border-[#E5E0D8] rounded-3xl p-6">
                        <span className="material-symbols-outlined text-4xl text-[#8C857B]">restaurant_menu</span>
                        <p className="text-xs font-serif font-bold text-[#6C655F]">No encontramos platos disponibles en esta sección.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {filteredItems.map(item => {
                            const priceNum = parseFloat(item.price) || 0;
                            const mods = typeof item.available_modifiers === 'string' ? JSON.parse(item.available_modifiers || '[]') : (item.available_modifiers || []);
                            return (
                                <div key={item.id} className="bg-[#FAF7F2] border border-[#E5E0D8] rounded-2xl overflow-hidden hover:border-[#D9381E]/40 transition flex flex-col justify-between shadow-sm group">
                                    <div className="space-y-3 p-4 sm:p-5">
                                        {/* Foto del Plato */}
                                        <div className="relative h-44 w-full rounded-xl overflow-hidden bg-[#EBE6DD] border border-[#E5E0D8]">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-[#8C857B] space-y-1">
                                                    <span className="material-symbols-outlined text-4xl">restaurant</span>
                                                    <span className="text-[10px] font-serif font-bold uppercase tracking-widest text-[#8C857B]">Plato Wabi-Sabi</span>
                                                </div>
                                            )}
                                            <span className="absolute top-3 right-3 font-serif font-bold text-[#2C2825] text-xs bg-[#FAF7F2]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#E5E0D8] shadow-sm">
                                                ${priceNum.toLocaleString()} COP
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <h3 className="font-serif font-bold text-[#2C2825] text-base leading-tight">{item.name}</h3>

                                            {item.description && (
                                                <p className="text-xs text-[#6C655F] line-clamp-3 leading-relaxed">{item.description}</p>
                                            )}

                                            {mods.length > 0 && (
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <span className="text-[10px] text-[#2E593C] font-bold bg-[#EAF2ED] px-2 py-0.5 rounded-md border border-[#3B6E4C]/20">
                                                        ✨ {mods.length} opcionales disponibles
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                                        <button
                                            type="button"
                                            onClick={() => openCustomizationModal(item)}
                                            className="w-full py-2.5 bg-[#D9381E] hover:bg-[#C22E15] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                                            Seleccionar y Personalizar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal de Personalización de Plato para Cliente */}
            {selectedItem && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-[#FAF8F5] border border-[#E5E0D8] w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl my-auto max-h-[90vh] overflow-y-auto text-[#2C2825]">
                        <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
                            <div>
                                <h3 className="font-serif font-bold text-[#2C2825] text-lg">{selectedItem.name}</h3>
                                <span className="text-xs font-serif font-bold text-[#D9381E]">${(parseFloat(selectedItem.price) || 0).toLocaleString()} COP</span>
                            </div>
                            <button type="button" onClick={() => setSelectedItem(null)} className="text-[#8C857B] hover:text-[#2C2825]">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Cantidad */}
                        <div className="flex items-center justify-between bg-[#FAF7F2] p-3 rounded-xl border border-[#E5E0D8]">
                            <span className="text-xs font-bold text-[#2C2825]">Cantidad de Porciones:</span>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setItemQty(q => Math.max(1, q - 1))}
                                    className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#D8D2C7] text-[#2C2825] font-bold text-sm flex items-center justify-center hover:bg-[#EAE6DF]"
                                >
                                    -
                                </button>
                                <span className="font-bold text-[#D9381E] text-sm">{itemQty}</span>
                                <button
                                    type="button"
                                    onClick={() => setItemQty(q => q + 1)}
                                    className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#D8D2C7] text-[#2C2825] font-bold text-sm flex items-center justify-center hover:bg-[#EAE6DF]"
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
                                <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E5E0D8]">
                                    <label className="text-xs font-bold text-[#2E593C] uppercase tracking-wider block">💡 Adicionales Sugeridos (1-Clic):</label>
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
                                                    className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer flex items-center gap-1 ${
                                                        isSelected
                                                            ? 'bg-[#2E593C] text-white border-[#2E593C] shadow-sm'
                                                            : 'bg-[#FAF8F5] border-[#D8D2C7] text-[#2C2825] hover:bg-[#EAF2ED]'
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
                            <label className="text-xs font-bold text-[#6C655F]">Otro Adicional Personalizado:</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Ej: Extra queso"
                                    value={additionName}
                                    onChange={(e) => setAdditionName(e.target.value)}
                                    className="col-span-2 bg-[#FAF7F2] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2C2825] outline-none focus:border-[#D9381E]"
                                />
                                <input
                                    type="number"
                                    placeholder="Precio ($)"
                                    value={additionPrice}
                                    onChange={(e) => setAdditionPrice(e.target.value)}
                                    className="bg-[#FAF7F2] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2C2825] outline-none focus:border-[#D9381E]"
                                />
                            </div>
                            <button type="button" onClick={handleAddCustomAddition} className="w-full py-2 bg-[#EAF2ED] text-[#2E593C] font-bold text-xs rounded-xl border border-[#3B6E4C]/30 hover:bg-[#DCEAE0] transition">
                                + Agregar Adicional Extra
                            </button>
                            {additionsList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {additionsList.map((a, i) => (
                                        <span key={i} className="bg-[#EAF2ED] text-[#2E593C] text-[11px] px-2.5 py-0.5 rounded-lg border border-[#3B6E4C]/30 font-medium">
                                            ➕ {a.name} (+${a.price.toLocaleString()} COP)
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Nota especial */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-[#6C655F]">Instrucciones Especiales para Cocina:</label>
                            <input
                                type="text"
                                placeholder="Ej: Salsa aparte, bien tostado..."
                                value={itemNotes}
                                onChange={(e) => setItemNotes(e.target.value)}
                                className="w-full bg-[#FAF7F2] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2C2825] outline-none focus:border-[#D9381E]"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="w-full py-3.5 bg-[#D9381E] hover:bg-[#C22E15] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">shopping_basket</span>
                            Agregar al Carrito de la Orden
                        </button>
                    </div>
                </div>
            )}

            {/* Barra Flotante / Carrito de Compras Wabi-Sabi */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/90 to-transparent backdrop-blur-md">
                    <div className="max-w-4xl mx-auto flex items-center justify-between bg-[#FAF7F2] border border-[#D9381E]/30 p-4 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#D9381E] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </div>
                            <div>
                                <span className="text-[10px] text-[#8C857B] font-bold uppercase tracking-wider block">Total de tu Pedido:</span>
                                <strong className="text-base font-serif font-bold text-[#2C2825]">${cartTotal.toLocaleString()} COP</strong>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsCartOpen(true)}
                            className="px-5 py-3 bg-[#D9381E] hover:bg-[#C22E15] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
                        >
                            <span>Ver Pedido</span>
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Drawer de Confirmación de Pedido Wabi-Sabi */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-[#FAF8F5] border border-[#E5E0D8] w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto text-[#2C2825]">
                        <div className="flex items-center justify-between border-b border-[#E5E0D8] pb-3">
                            <h3 className="font-serif font-bold text-[#2C2825] text-lg flex items-center gap-2">
                                🛒 Resumen de tu Pedido
                            </h3>
                            <button type="button" onClick={() => setIsCartOpen(false)} className="text-[#8C857B] hover:text-[#2C2825]">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modalidad Selector */}
                        <div className="space-y-2 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E5E0D8]">
                            <label className="text-xs font-bold text-[#D9381E] uppercase tracking-wider block">Modalidad de Atención:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOrderType('mesa')}
                                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        orderType === 'mesa' ? 'bg-[#D9381E] text-white shadow-sm' : 'bg-[#FAF8F5] border border-[#E5E0D8] text-[#6C655F]'
                                    }`}
                                >
                                    🪑 Consumo en Mesa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderType('domicilio')}
                                    className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        orderType === 'domicilio' ? 'bg-[#2E593C] text-white shadow-sm' : 'bg-[#FAF8F5] border border-[#E5E0D8] text-[#6C655F]'
                                    }`}
                                >
                                    🛵 Domicilio a Casa
                                </button>
                            </div>
                        </div>

                        {/* Formulario según modalidad */}
                        {orderType === 'mesa' ? (
                            <div className="space-y-3 bg-[#FAF7F2] p-4 rounded-xl border border-[#E5E0D8]">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#2C2825] flex items-center justify-between">
                                        <span>Número de Mesa *</span>
                                        {isTableLocked && (
                                            <span className="text-[10px] text-[#2E593C] bg-[#EAF2ED] px-2 py-0.5 rounded border border-[#3B6E4C]/30 font-bold">
                                                🔒 Sujetada por QR de Mesa
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Mesa 4, Terraza 2"
                                        value={tableNumber}
                                        readOnly={isTableLocked}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                        className={`w-full border rounded-xl p-2.5 text-xs text-[#2C2825] outline-none font-bold ${
                                            isTableLocked 
                                                ? 'bg-[#EAE6DF] border-[#D8D2C7] cursor-not-allowed text-[#2C2825]' 
                                                : 'bg-[#FAF8F5] border-[#E5E0D8] focus:border-[#D9381E]'
                                        }`}
                                        required
                                    />
                                </div>

                                {/* Modalidad de Cuenta: Individual por Comensal vs Cuenta Conjunta */}
                                <div className="space-y-2 pt-2 border-t border-[#E5E0D8]">
                                    <label className="text-[11px] font-bold text-[#D9381E] uppercase tracking-wide block">💳 Modalidad de Cobro para la Mesa:</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsIndividualAccount(false)}
                                            className={`py-2 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                                                !isIndividualAccount ? 'bg-[#D9381E] text-white border-[#D9381E] shadow-sm' : 'bg-[#FAF8F5] border-[#E5E0D8] text-[#6C655F]'
                                            }`}
                                        >
                                            🪑 Cuenta Conjunta
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsIndividualAccount(true)}
                                            className={`py-2 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                                                isIndividualAccount ? 'bg-[#D9381E] text-white border-[#D9381E] shadow-sm' : 'bg-[#FAF8F5] border-[#E5E0D8] text-[#6C655F]'
                                            }`}
                                        >
                                            👤 Cuenta Individual
                                        </button>
                                    </div>

                                    {isIndividualAccount && (
                                        <div className="space-y-2 pt-2">
                                            <p className="text-[11px] text-[#6C655F] font-medium leading-relaxed bg-[#FAF8F5] p-2.5 rounded-lg border border-[#E5E0D8]">
                                                💡 Tu pedido quedará separado a tu nombre para que al pagar solo canceles tu consumo individual.
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-[#2C2825]">Nombre y Apellido *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Laura Restrepo"
                                                        value={customerName}
                                                        onChange={(e) => setCustomerName(e.target.value)}
                                                        className="w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2C2825] outline-none focus:border-[#D9381E] font-semibold"
                                                        required={isIndividualAccount}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-bold text-[#2C2825]">Cédula / NIT *</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 1020304050"
                                                        value={customerDni}
                                                        onChange={(e) => setCustomerDni(e.target.value)}
                                                        className="w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl p-2 text-xs text-[#2C2825] outline-none focus:border-[#D9381E] font-mono"
                                                        required={isIndividualAccount}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 bg-[#FAF7F2] p-4 rounded-xl border border-[#E5E0D8]">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-[#2C2825]">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: María Gómez"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2C2825] outline-none focus:border-[#2E593C]"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#2C2825]">Teléfono Celular *</label>
                                        <input
                                            type="tel"
                                            placeholder="3001234567"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2C2825] outline-none focus:border-[#2E593C]"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-[#2C2825]">Dirección de Entrega *</label>
                                        <input
                                            type="text"
                                            placeholder="Calle 45 #12-34 Apt 301"
                                            value={customerAddress}
                                            onChange={(e) => setCustomerAddress(e.target.value)}
                                            className="w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl p-2.5 text-xs text-[#2C2825] outline-none focus:border-[#2E593C]"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lista de Ítems */}
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between bg-[#FAF7F2] p-3 rounded-xl border border-[#E5E0D8] text-xs">
                                    <div className="space-y-0.5">
                                        <strong className="text-[#2C2825] text-xs">{item.quantity}x {item.name}</strong>
                                        {item.removals.length > 0 && <p className="text-[10px] text-[#D9381E]">Sin: {item.removals.join(', ')}</p>}
                                        {item.additions.length > 0 && <p className="text-[10px] text-[#2E593C]">Con: {item.additions.map(a => a.name).join(', ')}</p>}
                                        {item.notes && <p className="text-[10px] text-[#6C655F] italic">Nota: {item.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <strong className="text-[#D9381E]">${(item.price * item.quantity).toLocaleString()}</strong>
                                        <button type="button" onClick={() => removeFromCart(idx)} className="text-[#8C857B] hover:text-[#D9381E]">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totales */}
                        <div className="space-y-1.5 bg-[#FAF7F2] p-4 rounded-xl border border-[#E5E0D8] text-xs">
                            <div className="flex justify-between text-[#6C655F]">
                                <span>Subtotal:</span>
                                <span>${cartSubtotal.toLocaleString()} COP</span>
                            </div>
                            <div className="flex justify-between text-[#6C655F]">
                                <span>Impoconsumo (8%):</span>
                                <span>${impoconsumo.toLocaleString()} COP</span>
                            </div>
                            {orderType === 'domicilio' && (
                                <div className="flex justify-between text-[#2E593C] font-bold">
                                    <span>Flete de Domicilio:</span>
                                    <span>${deliveryFee.toLocaleString()} COP</span>
                                </div>
                            )}
                            <div className="flex justify-between text-[#2C2825] font-serif font-bold text-sm pt-2 border-t border-[#E5E0D8]">
                                <span>Total a Pagar:</span>
                                <span className="text-[#D9381E] text-base">${cartTotal.toLocaleString()} COP</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleSubmitOrder}
                            className="w-full py-4 bg-[#D9381E] hover:bg-[#C22E15] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">send</span>
                            {submitting ? 'Enviando Pedido a Cocina...' : '🚀 Confirmar & Enviar Pedido a Cocina'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Éxito de Pedido Wabi-Sabi */}
            {orderSuccess && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-[#FAF8F5] border border-[#E5E0D8] w-full max-w-md rounded-2xl p-6 text-center space-y-5 shadow-2xl text-[#2C2825]">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl border ${
                            orderType === 'domicilio' 
                                ? 'bg-[#EAF2ED] text-[#2E593C] border-[#3B6E4C]/30' 
                                : 'bg-[#D9381E]/10 text-[#D9381E] border-[#D9381E]/30'
                        }`}>
                            {orderType === 'domicilio' ? '⏳' : '✓'}
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-[#2C2825] text-xl">
                                {orderType === 'domicilio' ? '🟡 Pedido Registrado (Pago Pendiente)' : '¡Pedido Recibido en Cocina!'}
                            </h3>
                            <p className="text-xs text-[#6C655F] mt-1.5 leading-relaxed">
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

                        <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E5E0D8] text-xs space-y-1">
                            <span className="text-[#6C655F] block">Total de la Orden:</span>
                            <strong className="text-[#D9381E] text-lg font-serif font-bold">${orderSuccess.total_amount?.toLocaleString()} COP</strong>
                        </div>

                        <div className="space-y-2">
                            {orderType === 'domicilio' ? (
                                <button
                                    type="button"
                                    onClick={sendWhatsAppConfirmation}
                                    className="w-full py-3.5 bg-[#2E593C] hover:bg-[#244730] text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chat</span>
                                    💬 Adjuntar Comprobante de Pago por WhatsApp
                                </button>
                            ) : (
                                <div className="p-3 bg-[#EAF2ED] border border-[#3B6E4C]/30 rounded-xl text-xs text-[#2E593C] font-bold flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                    ¡Comanda enviada 100% digital a la pantalla de cocina!
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setOrderSuccess(null)}
                                className="w-full py-3 bg-[#D9381E] hover:bg-[#C22E15] text-white font-bold text-xs rounded-xl transition cursor-pointer"
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

