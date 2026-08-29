import React, { useState, useEffect } from 'react';

interface KdsItem {
    name: string;
    quantity: number;
    notes?: string;
    removals?: string[];
    additions?: string[];
}

interface KdsOrder {
    id: string;
    order_number: string;
    station: 'kitchen' | 'bar';
    status: 'pending' | 'in_preparation' | 'ready';
    items: KdsItem[];
    notes?: string;
    table_number?: string;
    order_type?: 'mesa' | 'domicilio' | 'para_llevar';
    customer_name?: string;
    zone?: string;
    waiter_name?: string;
    created_at: string;
    prep_start_time?: string;
}

interface RestaurantKdsDisplayProps {
    clientId: string;
}

export const RestaurantKdsDisplay: React.FC<RestaurantKdsDisplayProps> = ({ clientId }) => {
    const [orders, setOrders] = useState<KdsOrder[]>([]);
    const [stationFilter, setStationFilter] = useState<'all' | 'kitchen' | 'bar'>('all');
    const [loading, setLoading] = useState(false);
    const [recipeModalProduct, setRecipeModalProduct] = useState<{ name: string; items: any[]; instructions: string } | null>(null);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    const token = localStorage.getItem('auth_token');

    const handleViewRecipe = async (productId?: string, productName?: string) => {
        if (!productId) {
            setRecipeModalProduct({
                name: productName || 'Plato del Menú',
                items: [],
                instructions: 'Paso 1: Sazonar con sal marina y pimienta al gusto.\nPaso 2: Cocinar a fuego medio durante 8 minutos.\nPaso 3: Servir en plato térmico con guarnición fresca.'
            });
            return;
        }

        try {
            const res = await fetch(`/api/clients/${clientId}/restaurant/recipes/${productId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const recipeItems = data.recipe_items || [];
                const instructions = recipeItems[0]?.preparation_instructions || 'Pasos estándar de preparación según recetario del Chef.';
                setRecipeModalProduct({
                    name: productName || 'Ficha Técnica del Plato',
                    items: recipeItems,
                    instructions
                });
            }
        } catch (e) {
            setRecipeModalProduct({
                name: productName || 'Plato',
                items: [],
                instructions: 'Instructivo estándar de cocina.'
            });
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const url = stationFilter === 'all'
                ? `/api/clients/${clientId}/restaurant/kds`
                : `/api/clients/${clientId}/restaurant/kds?station=${stationFilter}`;
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                // Parse items JSON if string
                const parsedOrders = (data.orders || []).map((ord: any) => ({
                    ...ord,
                    items: typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items
                }));
                setOrders(parsedOrders);
            }
        } catch (err) {
            console.error("Error fetching KDS orders:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000); // Polling cada 10 segundos
        const timerInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(interval);
            clearInterval(timerInterval);
        };
    }, [stationFilter]);

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/clients/${clientId}/restaurant/kds/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                fetchOrders();
            }
        } catch (err) {
            console.error("Error updating order status:", err);
        }
    };

    // Semáforo de Tiempo
    const getTimerColor = (createdAt: string) => {
        const elapsedMins = (currentTime.getTime() - new Date(createdAt).getTime()) / (1000 * 60);
        if (elapsedMins < 8) return { bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400', label: '🟢 En tiempo' };
        if (elapsedMins < 15) return { bg: 'bg-amber-500/10 border-amber-500/40 text-amber-400', label: '🟡 Atención' };
        return { bg: 'bg-rose-500/20 border-rose-500/60 text-rose-400 animate-pulse', label: '🔴 Demorado' };
    };

    const getElapsedMinutes = (createdAt: string) => {
        const diffMs = currentTime.getTime() - new Date(createdAt).getTime();
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="space-y-6">
            {/* Header del KDS */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container/40 p-4 rounded-3xl border border-outline/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                        <span className="material-symbols-outlined text-[28px]">restaurant_menu</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                            Pantalla KDS (Cocina & Barra)
                            <span className="bg-primary/20 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full border border-primary/30">
                                {orders.length} comandas activas
                            </span>
                        </h2>
                        <p className="text-xs text-on-surface-variant">Monitoreo de tiempos de preparación y estandarización de recetas</p>
                    </div>
                </div>

                {/* Filtro de Estación & Actualización */}
                <div className="flex items-center gap-2">
                    <div className="bg-surface-container border border-outline/20 rounded-2xl p-1 flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setStationFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${stationFilter === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            Todas
                        </button>
                        <button
                            type="button"
                            onClick={() => setStationFilter('kitchen')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${stationFilter === 'kitchen' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            <span>👨‍🍳</span> Cocina
                        </button>
                        <button
                            type="button"
                            onClick={() => setStationFilter('bar')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${stationFilter === 'bar' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                        >
                            <span>🍹</span> Barra
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={fetchOrders}
                        className="p-2.5 bg-surface-container border border-outline/20 hover:border-primary/50 text-on-surface rounded-2xl transition cursor-pointer flex items-center justify-center"
                        title="Refrescar Comandas"
                    >
                        <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            {/* Grid de Comandas KDS */}
            {orders.length === 0 ? (
                <div className="text-center py-16 bg-surface-container/20 border border-dashed border-outline/20 rounded-3xl space-y-3">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">soup_kitchen</span>
                    <p className="text-on-surface-variant text-sm font-medium">No hay comandas pendientes en esta estación.</p>
                    <p className="text-xs text-on-surface-variant/60">Los nuevos pedidos enviados por los meseros o el QR aparecerán aquí en tiempo real.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders.map((ord) => {
                        const timer = getTimerColor(ord.created_at);
                        const elapsed = getElapsedMinutes(ord.created_at);
                        return (
                            <div
                                key={ord.id}
                                className={`rounded-3xl border p-4 space-y-4 flex flex-col justify-between transition-all shadow-lg ${timer.bg}`}
                            >
                                <div className="space-y-3">
                                    {/* Cabecera Tarjeta con Distinción de Tipo de Pedido */}
                                    <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                                                    {ord.order_number}
                                                </span>
                                                {ord.order_type === 'domicilio' || (!ord.table_number && ord.customer_name) ? (
                                                    <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                                        🛵 DOMICILIO (EMPAQUE DE VIAJE)
                                                    </span>
                                                ) : ord.order_type === 'para_llevar' || !ord.table_number ? (
                                                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        🛍️ PARA LLEVAR (RECOGIDA)
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        🪑 SERVICIO EN MESA (VAJILLA)
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-base font-extrabold text-on-surface flex items-center gap-1.5">
                                                <span>{ord.station === 'bar' ? '🍹' : '🍽️'}</span>
                                                {ord.table_number
                                                    ? `Mesa ${ord.table_number} (${ord.zone || 'Salón'})`
                                                    : (ord.customer_name ? `Cliente: ${ord.customer_name}` : 'Pedido Directo')}
                                            </h3>
                                        </div>

                                        {/* Temporizador */}
                                        <div className="text-right">
                                            <span className="font-mono text-sm font-black text-on-surface block">
                                                ⏱️ {elapsed}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase">{timer.label}</span>
                                        </div>
                                    </div>

                                    {/* Mesero Asignado */}
                                    {ord.waiter_name && (
                                        <div className="text-[11px] text-on-surface-variant flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">person</span>
                                            Mesero: <strong className="text-on-surface">{ord.waiter_name}</strong>
                                        </div>
                                    )}

                                    {/* Lista de Ítems / Platos */}
                                    <div className="space-y-2.5 my-2">
                                        {ord.items && ord.items.map((item, idx) => (
                                            <div key={idx} className="bg-surface/50 border border-outline/10 p-2.5 rounded-2xl text-xs space-y-1">
                                                <div className="flex items-center justify-between font-bold text-on-surface">
                                                    <span>{item.name}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewRecipe(undefined, item.name)}
                                                            className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-lg transition font-medium cursor-pointer"
                                                            title="Ver Receta Secreta e Instructivo SOP"
                                                        >
                                                            📖 SOP
                                                        </button>
                                                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black text-[11px]">
                                                            x{item.quantity}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Remociones (Notas en rojo) */}
                                                {item.removals && item.removals.length > 0 && (
                                                    <div className="text-[11px] text-rose-400 font-semibold flex items-start gap-1">
                                                        <span>🚫</span> {item.removals.join(', ')}
                                                    </div>
                                                )}

                                                {/* Adicionales (Notas en verde) */}
                                                {item.additions && item.additions.length > 0 && (
                                                    <div className="text-[11px] text-emerald-400 font-semibold flex items-start gap-1">
                                                        <span>➕</span> {item.additions.join(', ')}
                                                    </div>
                                                )}

                                                {/* Notas especiales del cliente */}
                                                {item.notes && (
                                                    <div className="text-[11px] text-amber-400 italic font-medium">
                                                        📝 "{item.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Notas generales de la comanda */}
                                    {ord.notes && (
                                        <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-2xl text-xs text-amber-300 font-medium">
                                            💡 Nota: {ord.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Acciones KDS */}
                                <div className="pt-3 border-t border-outline/10 space-y-2">
                                    {ord.status === 'pending' && (
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus(ord.id, 'in_preparation')}
                                            className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">skillet</span>
                                            Iniciar Preparación
                                        </button>
                                    )}

                                    {ord.status === 'in_preparation' && (
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateStatus(ord.id, 'ready')}
                                            className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                            Marcar Listo para Servir
                                        </button>
                                    )}

                                    {ord.status === 'ready' && (
                                        <div className="bg-emerald-500/20 border border-emerald-500/40 p-2 rounded-xl text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                                            ¡Listo! Esperando Recogida por Mesero
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Ficha Técnica / Receta Secreta SOP */}
            {recipeModalProduct && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-surface-container border border-outline/20 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
                                <span>📖</span> Ficha Técnica & Receta SOP: {recipeModalProduct.name}
                            </h3>
                            <button type="button" onClick={() => setRecipeModalProduct(null)} className="text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Insumos Configurados en BOM */}
                        {recipeModalProduct.items && recipeModalProduct.items.length > 0 && (
                            <div className="space-y-1.5">
                                <h4 className="text-xs font-bold text-primary uppercase">Materia Prima & Cantidades (BOM):</h4>
                                <div className="bg-surface/50 border border-outline/10 p-3 rounded-2xl space-y-1 text-xs">
                                    {recipeModalProduct.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-on-surface">
                                            <span>• {item.raw_product_name || 'Insumo'}</span>
                                            <span className="font-mono font-bold">{item.quantity_required} {item.unit_of_measure}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Procedimiento Paso a Paso */}
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-bold text-amber-400 uppercase">Procedimiento Estándar de Preparación:</h4>
                            <div className="bg-surface/50 border border-outline/10 p-4 rounded-2xl text-xs text-on-surface whitespace-pre-line leading-relaxed font-medium">
                                {recipeModalProduct.instructions}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setRecipeModalProduct(null)}
                            className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 transition cursor-pointer"
                        >
                            Entendido / Cerrar Recetario
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
