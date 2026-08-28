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

interface Employee {
    id: string;
    name: string;
    role?: string;
    position?: string;
}

interface Product {
    id: string;
    name: string;
    price: string;
    category_id?: string;
    available_modifiers?: { name: string; price: number }[] | string;
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
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [orderCart, setOrderCart] = useState<SelectedOrderItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [removalsList, setRemovalsList] = useState<string[]>([]);
    const [additionNameInput, setAdditionNameInput] = useState('');
    const [additionPriceInput, setAdditionPriceInput] = useState('');
    const [additionsList, setAdditionsList] = useState<{ name: string; price: number }[]>([]);
    const [itemNotes, setItemNotes] = useState('');
    const [itemStation, setItemStation] = useState<'kitchen' | 'bar'>('kitchen');
    const [loading, setLoading] = useState(false);

    // Modal Crear / Editar Mesa
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [modalTableNumber, setModalTableNumber] = useState('');
    const [modalZone, setModalZone] = useState('Salón Principal');
    const [modalCapacity, setModalCapacity] = useState('4');
    const [modalWaiterId, setModalWaiterId] = useState('');

    // Modal Código QR Único de Mesa
    const [qrModalTable, setQrModalTable] = useState<Table | null>(null);

    const getTableQrUrl = (tNumber: string) => {
        try {
            const payload = JSON.stringify({ c: clientId, t: tNumber });
            const b64 = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            return `${window.location.protocol}//${window.location.host}/m/t_${b64}`;
        } catch {
            return `${window.location.protocol}//${window.location.host}/m/${clientId}?table=${encodeURIComponent(tNumber)}`;
        }
    };

    const handleCopyQRUrl = (tNumber: string) => {
        const url = getTableQrUrl(tNumber);
        navigator.clipboard.writeText(url);
        alert(`¡Enlace copiado al portapapeles!\n${url}`);
    };

    const handlePrintQRWindow = (table: Table) => {
        const url = getTableQrUrl(table.table_number);
        const printWin = window.open('', '_blank');
        if (!printWin) return;
        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Stand - Mesa ${table.table_number}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; color: #111; }
                    .stand-card { width: 320px; border: 3px solid #111; border-radius: 24px; padding: 30px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                    .badge { background: #d8a24e; color: #000; font-weight: 900; padding: 6px 16px; border-radius: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                    h1 { margin: 15px 0 5px; font-size: 32px; font-weight: 900; }
                    p { font-size: 13px; color: #555; margin-bottom: 20px; }
                    img { width: 220px; height: 220px; border-radius: 16px; border: 2px solid #eee; }
                    .footer { font-size: 11px; color: #888; margin-top: 15px; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="stand-card">
                    <span class="badge">${table.zone || 'RESTAURANTE'}</span>
                    <h1>MESA ${table.table_number}</h1>
                    <p>Escanea con tu celular para ver la carta digital y realizar tu pedido</p>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}" alt="QR Mesa ${table.table_number}" />
                    <div class="footer">CARTA DIGITAL SMART MENU</div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWin.document.close();
    };


    const token = localStorage.getItem('auth_token') || localStorage.getItem('emp_token');

    const fetchTablesProductsAndEmployees = async () => {
        try {
            setLoading(true);
            const [tabRes, prodRes, empRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/restaurant/tables`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/employees`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const tabData = await tabRes.json();
            const prodData = await prodRes.json();
            const empData = await empRes.json();

            if (tabData.success) setTables(tabData.tables || []);
            if (prodData.success) setProducts(prodData.products || []);
            if (empData.success) setEmployees(empData.employees || empData.data || []);
        } catch (err) {
            console.error("Error loading waiter portal data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTablesProductsAndEmployees();
        const interval = setInterval(fetchTablesProductsAndEmployees, 12000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalTableNumber) {
            alert("Por favor ingresa el número o código de la mesa.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/restaurant/tables`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    table_number: modalTableNumber,
                    zone: modalZone,
                    capacity: parseInt(modalCapacity) || 4,
                    assigned_waiter_id: modalWaiterId || null
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ Mesa '${modalTableNumber}' guardada exitosamente.`);
                setIsTableModalOpen(false);
                setModalTableNumber('');
                setModalWaiterId('');
                fetchTablesProductsAndEmployees();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error("Error saving table:", err);
            alert("Error al guardar la mesa.");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAssignWaiter = async (table: Table, newWaiterId: string) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/restaurant/tables/${table.id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: table.status,
                    assigned_waiter_id: newWaiterId || null
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchTablesProductsAndEmployees();
            }
        } catch (err) {
            console.error("Error assigning waiter:", err);
        } finally {
            setLoading(false);
        }
    };



    const handleAddAddition = () => {
        if (!additionNameInput.trim()) return;
        const price = parseFloat(additionPriceInput) || 0;
        setAdditionsList(prev => [...prev, { name: additionNameInput.trim(), price }]);
        setAdditionNameInput('');
        setAdditionPriceInput('');
    };

    const handleRemoveAdditionTag = (index: number) => {
        setAdditionsList(prev => prev.filter((_, i) => i !== index));
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
                        waiter_id: waiterId || selectedTable.assigned_waiter_id || null,
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
                        waiter_id: waiterId || selectedTable.assigned_waiter_id || null,
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
            fetchTablesProductsAndEmployees();
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
            {/* Header Comandero & Gestión de Mesas */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container/40 p-4 rounded-3xl border border-outline/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                        <span className="material-symbols-outlined text-[28px]">room_service</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">Comandero Móvil & Mapa de Mesas</h2>
                        <p className="text-xs text-on-surface-variant">
                            {waiterName ? `Atendiendo como: ${waiterName}` : 'Selección de mesas, asignación de meseros y comanda'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIsTableModalOpen(true)}
                        className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:opacity-90 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_location</span>
                        + Crear / Configurar Mesa
                    </button>

                    <div className="hidden sm:flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Libre</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Ocupada</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> En Cocina</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Pidiendo Cuenta</span>
                    </div>
                </div>
            </div>

            {/* Mapa de Mesas por Zonas */}
            {!selectedTable ? (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">table_restaurant</span>
                            Mapa de Mesas & Meseros Asignados
                        </h3>
                    </div>

                    {tables.length === 0 ? (
                        <div className="text-center py-12 bg-surface-container/20 border border-dashed border-outline/20 rounded-3xl space-y-3">
                            <p className="text-on-surface-variant text-sm">No hay mesas registradas en el sistema.</p>
                            <button
                                type="button"
                                onClick={() => setIsTableModalOpen(true)}
                                className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:opacity-90 transition cursor-pointer inline-flex items-center gap-2 shadow-lg"
                            >
                                <span className="material-symbols-outlined text-[18px]">add_location</span>
                                Crear Primera Mesa
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {tables.map(table => (
                                <div
                                    key={table.id}
                                    className={`p-5 rounded-3xl border flex flex-col justify-between gap-3 shadow-md hover:border-primary/50 transition ${getTableBadgeColor(table.status)}`}
                                >
                                    {/* Encabezado Mesa */}
                                    <div
                                        onClick={() => setSelectedTable(table)}
                                        className="cursor-pointer flex items-center justify-between border-b border-outline/10 pb-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[28px]">table_restaurant</span>
                                            <div>
                                                <span className="font-extrabold text-base text-on-surface block">Mesa {table.table_number}</span>
                                                <span className="text-[10px] opacity-80 block">{table.zone} ({table.capacity} p)</span>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-black/20 border border-outline/10">
                                            {getTableStatusLabel(table.status)}
                                        </span>
                                    </div>

                                    {/* Asignación de Mesero */}
                                    <div className="space-y-1 bg-surface/40 p-2 rounded-2xl border border-outline/5 text-xs">
                                        <label className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">person</span>
                                            Mesero Asignado:
                                        </label>
                                        <select
                                            value={table.assigned_waiter_id || ''}
                                            onChange={(e) => handleQuickAssignWaiter(table, e.target.value)}
                                            className="w-full bg-surface border border-outline/20 rounded-xl p-1.5 text-xs text-on-surface font-semibold outline-none focus:border-primary cursor-pointer"
                                        >
                                            <option value="">-- Sin Mesero --</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.name} {emp.role ? `(${emp.role})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Botones Tomar Pedido & Generar QR */}
                                     <div className="grid grid-cols-2 gap-2">
                                         <button
                                             type="button"
                                             onClick={() => setSelectedTable(table)}
                                             className="py-2 bg-primary/20 hover:bg-primary text-primary hover:text-on-primary font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                                         >
                                             <span className="material-symbols-outlined text-[15px]">touch_app</span>
                                             Tomar Pedido
                                         </button>
                                         <button
                                             type="button"
                                             onClick={() => setQrModalTable(table)}
                                             className="py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-xs rounded-xl border border-amber-500/30 transition cursor-pointer flex items-center justify-center gap-1"
                                         >
                                             <span className="material-symbols-outlined text-[15px]">qr_code_2</span>
                                             QR Mesa
                                         </button>
                                     </div>
                                 </div>
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
                                     <p className="text-xs text-on-surface-variant">
                                         {selectedTable.waiter_name ? `Atendida por: ${selectedTable.waiter_name}` : 'Toca un plato para personalizar e incluir en la comanda'}
                                     </p>
                                 </div>
                             </div>
                         </div>

                         {/* Tarjeta Anclada Visible del Código QR de la Mesa */}
                         <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-white rounded-xl border border-amber-500/40 shadow-md">
                                     <img
                                         src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(getTableQrUrl(selectedTable.table_number))}`}
                                         alt={`QR Mesa ${selectedTable.table_number}`}
                                         className="w-14 h-14 rounded"
                                     />
                                 </div>
                                 <div>
                                     <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Código QR Anclado Mesa #{selectedTable.table_number}</span>
                                     <strong className="text-xs text-white block">Escaneo Directo a Carta Digital</strong>
                                     <span className="text-[10px] text-on-surface-variant font-mono block truncate max-w-[200px] sm:max-w-[280px]">
                                         {getTableQrUrl(selectedTable.table_number)}
                                     </span>
                                 </div>
                             </div>

                             <div className="flex items-center gap-2 w-full sm:w-auto">
                                 <button
                                     type="button"
                                     onClick={() => handlePrintQRWindow(selectedTable)}
                                     className="flex-1 sm:flex-none px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1"
                                     title="Imprimir Stand para la mesa"
                                 >
                                     <span className="material-symbols-outlined text-[16px]">print</span>
                                     Imprimir
                                 </button>
                                 <button
                                     type="button"
                                     onClick={() => handleCopyQRUrl(selectedTable.table_number)}
                                     className="flex-1 sm:flex-none px-3 py-2 bg-surface hover:bg-surface-variant border border-outline/20 text-on-surface font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                                     title="Copiar Enlace Directo"
                                 >
                                     <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                     Copiar
                                 </button>
                                 <button
                                     type="button"
                                     onClick={() => setQrModalTable(selectedTable)}
                                     className="px-2.5 py-2 bg-surface hover:bg-surface-variant border border-outline/20 text-amber-300 font-bold text-xs rounded-xl transition cursor-pointer"
                                     title="Ver QR ampliado"
                                 >
                                     <span className="material-symbols-outlined text-[16px]">fullscreen</span>
                                 </button>
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

            {/* Modal Crear / Configurar Mesa */}
            {isTableModalOpen && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-surface-container border border-outline/20 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
                                <span>🍽️</span> Crear / Asignar Mesa
                            </h3>
                            <button type="button" onClick={() => setIsTableModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveTable} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant">Número / Nombre de la Mesa *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Mesa 1, Mesa 2, Terraza 3, VIP A"
                                    value={modalTableNumber}
                                    onChange={(e) => setModalTableNumber(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-bold"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Zona del Restaurante</label>
                                    <select
                                        value={modalZone}
                                        onChange={(e) => setModalZone(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                                    >
                                        <option value="Salón Principal">Salón Principal</option>
                                        <option value="Terraza">Terraza / Exterior</option>
                                        <option value="VIP">Zona VIP</option>
                                        <option value="Barra">Barra / Mostrador</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Capacidad (Personas)</label>
                                    <input
                                        type="number"
                                        placeholder="4"
                                        value={modalCapacity}
                                        onChange={(e) => setModalCapacity(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant">Asignar Mesero Responsable</label>
                                <select
                                    value={modalWaiterId}
                                    onChange={(e) => setModalWaiterId(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer font-semibold"
                                >
                                    <option value="">-- Sin Mesero Asignado --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            👤 {emp.name} {emp.role ? `(${emp.role})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary text-on-primary font-extrabold text-xs rounded-xl hover:opacity-90 shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {loading ? 'Guardando...' : 'Guardar Mesa'}
                            </button>
                        </form>
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



                        {/* Adicionales Con Costo Extra */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-on-surface-variant">Adicionales (Con costo extra):</label>

                            {/* Adicionales Frecuentes / Pre-configurados en 1-Clic */}
                            {selectedProduct?.available_modifiers && (() => {
                                const parsedMods = typeof selectedProduct.available_modifiers === 'string' 
                                    ? JSON.parse(selectedProduct.available_modifiers) 
                                    : selectedProduct.available_modifiers;
                                if (!Array.isArray(parsedMods) || parsedMods.length === 0) return null;
                                return (
                                    <div className="space-y-1 bg-surface/50 p-2.5 rounded-2xl border border-outline/10">
                                        <label className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide">💡 Adicionales del Menú (1-Clic):</label>
                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
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
                                                        className={`text-[11px] px-2.5 py-1 rounded-xl border font-extrabold transition cursor-pointer flex items-center gap-1 ${
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
                            <div className="grid grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Nombre adicional (Ej: Queso costeño)"
                                    value={additionNameInput}
                                    onChange={(e) => setAdditionNameInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddition(); } }}
                                    className="col-span-2 bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                />
                                <input
                                    type="number"
                                    placeholder="Precio ($)"
                                    value={additionPriceInput}
                                    onChange={(e) => setAdditionPriceInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddition(); } }}
                                    className="bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddAddition}
                                className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                + Agregar Adicional a la Comanda
                            </button>
                            {additionsList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {additionsList.map((add, i) => (
                                        <button
                                            type="button"
                                            key={i}
                                            onClick={() => handleRemoveAdditionTag(i)}
                                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1 font-semibold cursor-pointer transition"
                                            title="Click para eliminar adicional"
                                        >
                                            ➕ {add.name} (+${add.price.toLocaleString()} COP) <span className="text-[10px] opacity-70">✕</span>
                                        </button>
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

            {/* Modal Código QR Único de Mesa */}
            {qrModalTable && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-md bg-black/85 flex items-center justify-center p-4">
                    <div className="bg-[#121216] border border-amber-500/40 w-full max-w-md rounded-3xl p-6 space-y-5 shadow-2xl text-center">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-400">qr_code_2</span>
                                Código QR Único - Mesa {qrModalTable.table_number}
                            </h3>
                            <button type="button" onClick={() => setQrModalTable(null)} className="text-on-surface-variant hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Tarjeta del QR / Stand de Mesa */}
                        <div className="bg-surface/60 border border-outline/20 p-5 rounded-3xl space-y-3 flex flex-col items-center shadow-inner">
                            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">
                                {qrModalTable.zone || 'Salón Principal'}
                            </span>
                            <h4 className="font-black text-white text-xl">MESA {qrModalTable.table_number}</h4>
                            <p className="text-xs text-on-surface-variant/90 max-w-xs">
                                Escanea este código para acceder a la carta digital exclusiva y enviar pedidos directamente a la mesa.
                            </p>

                            <div className="p-3 bg-white rounded-2xl border-4 border-amber-500/30 shadow-xl my-2">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getTableQrUrl(qrModalTable.table_number))}`}
                                    alt={`QR Mesa ${qrModalTable.table_number}`}
                                    className="w-48 h-48 rounded-lg"
                                />
                            </div>

                            <div className="w-full bg-surface border border-outline/10 p-2.5 rounded-xl text-[11px] font-mono text-amber-300 truncate select-all">
                                {getTableQrUrl(qrModalTable.table_number)}
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handlePrintQRWindow(qrModalTable)}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">print</span>
                                🖨️ Imprimir Stand para la Mesa
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleCopyQRUrl(qrModalTable.table_number)}
                                    className="py-2.5 bg-surface hover:bg-surface-variant text-on-surface font-bold text-xs rounded-xl border border-outline/20 transition cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                    Copiar Enlace
                                </button>
                                <a
                                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(getTableQrUrl(qrModalTable.table_number))}`}
                                    download={`QR-Mesa-${qrModalTable.table_number}.png`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-2.5 bg-surface hover:bg-surface-variant text-on-surface font-bold text-xs rounded-xl border border-outline/20 transition cursor-pointer flex items-center justify-center gap-1 text-center"
                                >
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    Descargar PNG
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
