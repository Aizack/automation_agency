import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';
import { printBarcodes } from '../utils/barcodePrinter';

interface Supplier {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    price: string | number;
}

interface PurchaseOrderItem {
    id?: string;
    product_id: string;
    product_name?: string;
    sku?: string;
    quantity: number;
    cost_price: number;
}

interface PurchaseOrder {
    id: string;
    order_number: string;
    status: 'pending' | 'received' | 'shipped' | 'cancelled';
    total_amount: string | number;
    delivery_method: string;
    carrier_name: string | null;
    tracking_number: string | null;
    shipping_cost: string | number;
    notes: string | null;
    supplier_name: string | null;
    supplier_phone: string | null;
    items: PurchaseOrderItem[];
    created_at: string;
    received_at: string | null;
}

interface PurchaseOrdersProps {
    clientId: string;
}

export const SaaSErpPurchaseOrders: React.FC<PurchaseOrdersProps> = ({ clientId }) => {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    // Form fields
    const [supplierId, setSupplierId] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('envio_tienda');
    const [carrierName, setCarrierName] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [shippingCost, setShippingCost] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<PurchaseOrderItem[]>([{ product_id: '', quantity: 1, cost_price: 0 }]);

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [poRes, supRes, prodRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/purchase-orders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/clients/${clientId}/suppliers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/clients/${clientId}/products`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const poJson = await poRes.json();
            const supJson = await supRes.json();
            const prodJson = await prodRes.json();

            if (poJson.success) setPurchaseOrders(poJson.purchaseOrders);
            if (supJson.success) setSuppliers(supJson.suppliers);
            if (prodJson.success) setProducts(prodJson.products);
        } catch (err) {
            console.error("Error loading purchase orders data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId]);

    const handleOpenCreateModal = () => {
        setSupplierId('');
        setOrderNumber('');
        setDeliveryMethod('envio_tienda');
        setCarrierName('');
        setTrackingNumber('');
        setShippingCost('');
        setNotes('');
        setItems([{ product_id: '', quantity: 1, cost_price: 0 }]);
        setIsCreateModalOpen(true);
    };

    const handleAddItemField = () => {
        setItems([...items, { product_id: '', quantity: 1, cost_price: 0 }]);
    };

    const handleRemoveItemField = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
        const newItems = [...items];
        if (field === 'quantity') {
            newItems[index].quantity = parseInt(value) || 0;
        } else if (field === 'cost_price') {
            newItems[index].cost_price = parseFloat(value) || 0;
        } else if (field === 'product_id') {
            newItems[index].product_id = value;
            // Opcional: auto-sugerir costo unitario basado en el precio actual del producto si es posible
        }
        setItems(newItems);
    };

    const handleSaveOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validación básica
        if (!supplierId) {
            alert('Por favor selecciona un proveedor.');
            return;
        }
        const invalidItem = items.some(item => !item.product_id || item.quantity <= 0 || item.cost_price < 0);
        if (invalidItem) {
            alert('Por favor completa todos los productos con cantidades válidas mayores a 0.');
            return;
        }

        const body = {
            supplier_id: supplierId,
            order_number: orderNumber.trim() || undefined,
            delivery_method: deliveryMethod,
            carrier_name: carrierName.trim() || null,
            tracking_number: trackingNumber.trim() || null,
            shipping_cost: shippingCost === '' ? 0 : shippingCost,
            notes: notes.trim() || null,
            items
        };

        try {
            const res = await fetch(`/api/clients/${clientId}/purchase-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const json = await res.json();
            if (json.success) {
                setIsCreateModalOpen(false);
                fetchData();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al guardar la orden de compra.');
        }
    };

    const handleReceiveOrder = async (orderId: string) => {
        if (!confirm('¿Confirmar recepción física de esta mercancía? El stock y los precios de costo de los productos se actualizarán automáticamente.')) return;

        try {
            const res = await fetch(`/api/clients/${clientId}/purchase-orders/${orderId}/receive`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const json = await res.json();
            if (json.success) {
                fetchData();
                
                // Disparar flujo de impresión de etiquetas para los productos recibidos
                if (json.products && json.products.length > 0) {
                    const printItems = json.products.map((p: any) => ({
                        name: p.name,
                        sku: p.sku,
                        price: p.price,
                        quantity: p.quantity
                    }));
                    
                    if (confirm(`Mercancía registrada con éxito. Se ingresaron ${printItems.reduce((acc: number, curr: any) => acc + curr.quantity, 0)} unidades al stock. ¿Deseas imprimir las etiquetas de código de barras ahora?`)) {
                        printBarcodes(printItems);
                    }
                } else {
                    alert('Mercancía registrada con éxito.');
                }
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al procesar la recepción de mercancía.');
        }
    };

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num || 0);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-outline/10 pb-4">
                <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Órdenes de Compra</h3>
                    <p className="text-on-surface-variant text-body-md opacity-70">
                        Genera pedidos a laboratorios o proveedores, registra costos de flete, y actualiza el stock al recibir la mercancía.
                    </p>
                </div>
                <button 
                    onClick={handleOpenCreateModal}
                    className="bg-primary text-on-primary font-label-md px-4 py-2.5 rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    Nueva Orden
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : purchaseOrders.length === 0 ? (
                <div className="glass-card p-12 text-center border border-outline/10 rounded-2xl">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant opacity-40 mb-3">inventory_2</span>
                    <p className="text-sm text-on-surface-variant">No hay órdenes de compra registradas.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {purchaseOrders.map(po => {
                        const isExpanded = expandedOrder === po.id;
                        return (
                            <div key={po.id} className="glass-card rounded-2xl border border-outline/10 overflow-hidden hover:border-outline/20 transition">
                                <div 
                                    className="p-4 flex flex-wrap md:flex-nowrap justify-between items-center gap-4 cursor-pointer select-none"
                                    onClick={() => setExpandedOrder(isExpanded ? null : po.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                                            <span className="material-symbols-outlined text-[22px]">assignment</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-on-surface">{po.order_number}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    po.status === 'received' 
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                    {po.status === 'received' ? 'Recibido' : 'Pendiente'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-on-surface-variant opacity-75 mt-0.5">
                                                Proveedor: {po.supplier_name || 'N/A'} • {new Date(po.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-xs text-on-surface-variant opacity-75">Total de Compra</p>
                                            <p className="font-bold text-sm text-on-surface">{formatCurrency(po.total_amount)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {po.status === 'pending' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReceiveOrder(po.id);
                                                    }}
                                                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition flex items-center gap-1 border-0 cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">done_all</span>
                                                    Recibir
                                                </button>
                                            )}
                                            <span className="material-symbols-outlined text-on-surface-variant opacity-60">
                                                {isExpanded ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-surface-container/30 border-t border-outline/5 p-4 space-y-4">
                                        {/* Detalle Logística */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container/60 p-3.5 rounded-xl border border-outline/5 text-xs">
                                            <div>
                                                <span className="text-on-surface-variant font-medium block">Logística / Transporte:</span>
                                                <span className="font-semibold text-on-surface mt-0.5 block">
                                                    {po.delivery_method === 'envio_tienda' ? '🚚 Envío por Proveedor' : '🏪 Recogida en Local'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant font-medium block">Transportadora & Guía:</span>
                                                <span className="font-semibold text-on-surface mt-0.5 block">
                                                    {po.carrier_name || 'Sin especificar'} {po.tracking_number ? `(Guía: ${po.tracking_number})` : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-on-surface-variant font-medium block">Costo de Envío / Flete:</span>
                                                <span className="font-semibold text-on-surface mt-0.5 block">
                                                    {formatCurrency(po.shipping_cost)}
                                                </span>
                                            </div>
                                            {po.notes && (
                                                <div className="md:col-span-3 pt-2 border-t border-outline/5">
                                                    <span className="text-on-surface-variant font-medium block">Observaciones:</span>
                                                    <span className="text-on-surface opacity-80 mt-0.5 block">{po.notes}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Listado de ítems */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block ml-1">Productos del Pedido</h4>
                                            <div className="border border-outline/10 rounded-xl overflow-hidden bg-surface-container">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-surface-container-high border-b border-outline/10">
                                                            <th className="p-3 font-semibold text-on-surface">Producto</th>
                                                            <th className="p-3 font-semibold text-on-surface">SKU</th>
                                                            <th className="p-3 font-semibold text-on-surface text-center">Cantidad</th>
                                                            <th className="p-3 font-semibold text-on-surface text-right">Costo Unitario</th>
                                                            <th className="p-3 font-semibold text-on-surface text-right">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {po.items.map((item, idx) => (
                                                            <tr key={idx} className="border-b border-outline/5 last:border-0">
                                                                <td className="p-3 text-on-surface font-medium">{item.product_name || 'Producto Eliminado'}</td>
                                                                <td className="p-3 text-on-surface-variant font-mono">{item.sku || 'N/A'}</td>
                                                                <td className="p-3 text-on-surface text-center">{item.quantity} uds</td>
                                                                <td className="p-3 text-on-surface text-right">{formatCurrency(item.cost_price)}</td>
                                                                <td className="p-3 text-on-surface text-right font-bold">{formatCurrency(item.quantity * item.cost_price)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Creación de Orden de Compra */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleSaveOrder} className="bg-surface-container-high border border-outline/10 p-6 rounded-2xl max-w-3xl w-full shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="font-bold text-base text-on-surface">Crear Orden de Compra</h3>
                            <button 
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 hover:bg-surface-container-highest rounded-full border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Contenido con scroll */}
                        <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar flex-grow">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-on-surface-variant font-medium">Proveedor *</label>
                                    <select 
                                        required
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                    >
                                        <option value="" className="bg-surface-container">-- Selecciona Proveedor --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id} className="bg-surface-container">{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-on-surface-variant font-medium">Código / Número de Orden (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        placeholder="Ej: OC-9821 (Vacio para autogenerar)"
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-on-surface-variant font-medium">Método de Transporte</label>
                                    <select 
                                        value={deliveryMethod}
                                        onChange={(e) => setDeliveryMethod(e.target.value)}
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                    >
                                        <option value="envio_tienda" className="bg-surface-container">🚚 Envío por Proveedor</option>
                                        <option value="recogida_local" className="bg-surface-container">🏪 Recogida en Local / Chofer</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-on-surface-variant font-medium">Costo de Envío / Flete (COP)</label>
                                    <input 
                                        type="number" 
                                        value={shippingCost}
                                        onChange={(e) => setShippingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="Ej: 15000"
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-on-surface-variant font-medium">Transportadora / Chofer responsable</label>
                                    <input 
                                        type="text" 
                                        value={carrierName}
                                        onChange={(e) => setCarrierName(e.target.value)}
                                        placeholder="Ej: Servientrega / Juan Chofer"
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-on-surface-variant font-medium">Número de Guía / Rastreo</label>
                                    <input 
                                        type="text" 
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        placeholder="Ej: 902381283"
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-xs text-on-surface-variant font-medium">Observaciones de la Orden</label>
                                    <textarea 
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Instrucciones adicionales para el laboratorio o proveedor..."
                                        rows={2}
                                        className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm focus:border-primary text-on-surface outline-none transition resize-none"
                                    />
                                </div>
                            </div>

                            {/* Detalle de Productos */}
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Productos del Pedido</h4>
                                    <button 
                                        type="button"
                                        onClick={handleAddItemField}
                                        className="bg-surface-container hover:bg-surface-container-highest border border-outline/10 text-primary text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">add_circle</span>
                                        Añadir Producto
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-end bg-surface-container/40 p-3 rounded-xl border border-outline/5">
                                            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-on-surface-variant font-semibold">Producto</label>
                                                    <select 
                                                        required
                                                        value={item.product_id}
                                                        onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none"
                                                    >
                                                        <option value="">-- Selecciona --</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-on-surface-variant font-semibold">Cantidad</label>
                                                    <input 
                                                        type="number" 
                                                        required
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-on-surface-variant font-semibold">Costo Unitario (COP)</label>
                                                    <input 
                                                        type="number" 
                                                        required
                                                        min="0"
                                                        value={item.cost_price || ''}
                                                        onChange={(e) => handleItemChange(idx, 'cost_price', e.target.value)}
                                                        placeholder="Costo"
                                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                type="button"
                                                disabled={items.length === 1}
                                                onClick={() => handleRemoveItemField(idx)}
                                                className="p-2 hover:bg-red-500/15 text-red-400 rounded-lg transition border-0 bg-transparent cursor-pointer disabled:opacity-30"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-outline/5 flex-shrink-0 mt-4">
                            <button 
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                            >
                                Registrar Orden de Compra
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
