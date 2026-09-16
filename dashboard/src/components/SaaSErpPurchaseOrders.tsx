import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';
import { printBarcodes } from '../utils/barcodePrinter';
import { SaaSErpProductFormModal } from './SaaSErpProductFormModal';

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

interface NewProductData {
    name: string;
    sku?: string;
    price?: number;
    cost_price?: number;
    stock?: number;
    category_id?: string;
    product_type?: string;
    attributes?: Record<string, any>;
    variants?: any[];
    [key: string]: any;
}

interface PurchaseOrderItem {
    id?: string;
    product_id?: string | null;
    product_name?: string;
    sku?: string;
    quantity: number;
    cost_price: number;
    is_new_product?: boolean;
    new_product_data?: NewProductData | null;
    received_quantity?: number;
    item_status?: 'pendiente' | 'recibido' | 'faltante' | 'defectuoso' | 'reclamo';
}

interface PurchaseOrder {
    id: string;
    order_number: string;
    status: 'pendiente' | 'en_revision' | 'reclamo' | 'recibido' | 'pending' | 'received';
    total_amount: string | number;
    delivery_method: string;
    carrier_name: string | null;
    tracking_number: string | null;
    shipping_cost: string | number;
    notes: string | null;
    dispute_notes?: string | null;
    supplier_name: string | null;
    supplier_phone: string | null;
    items: PurchaseOrderItem[];
    created_at: string;
    received_at: string | null;
}

interface Category {
    id: string;
    name: string;
}

interface PurchaseOrdersProps {
    clientId: string;
}

export const SaaSErpPurchaseOrders: React.FC<PurchaseOrdersProps> = ({ clientId }) => {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    // Modal para definir Producto Nuevo (JSON temporal)
    const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
    // Modal de Producto Nuevo Target Index
    const [newProductTargetIndex, setNewProductTargetIndex] = useState<number | null>(null);

    // Modal de Revisión y Verificación Físico
    const [reviewOrder, setReviewOrder] = useState<PurchaseOrder | null>(null);
    const [reviewItems, setReviewItems] = useState<PurchaseOrderItem[]>([]);
    const [disputeNotesInput, setDisputeNotesInput] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Campos formulario Orden de Compra
    const [supplierId, setSupplierId] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState('envio_tienda');
    const [carrierName, setCarrierName] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [shippingCost, setShippingCost] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<PurchaseOrderItem[]>([{ product_id: '', quantity: 1, cost_price: 0, is_new_product: false }]);

    const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';

    const fetchData = async () => {
        try {
            setLoading(true);
            const [poRes, supRes, prodRes, catRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/purchase-orders`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/clients/${clientId}/suppliers`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/clients/${clientId}/products`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`/api/clients/${clientId}/categories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            const poJson = await poRes.json();
            const supJson = await supRes.json();
            const prodJson = await prodRes.json();
            const catJson = await catRes.json();

            if (poJson.success) setPurchaseOrders(poJson.purchaseOrders);
            if (supJson.success) setSuppliers(supJson.suppliers);
            if (prodJson.success) setProducts(prodJson.products);
            if (catJson.success && Array.isArray(catJson.categories)) setCategories(catJson.categories);
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
        setItems([{ product_id: '', quantity: 1, cost_price: 0, is_new_product: false }]);
        setIsCreateModalOpen(true);
    };

    const handleAddItemField = () => {
        setItems([...items, { product_id: '', quantity: 1, cost_price: 0, is_new_product: false }]);
    };

    const handleRemoveItemField = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
        const newItems = [...items];
        if (field === 'quantity') {
            const val = parseInt(value) || 0;
            newItems[index].quantity = val;
            if (newItems[index].is_new_product && newItems[index].new_product_data) {
                newItems[index].new_product_data = {
                    ...newItems[index].new_product_data,
                    stock: val
                };
            }
        } else if (field === 'cost_price') {
            const val = parseFloat(value) || 0;
            newItems[index].cost_price = val;
            if (newItems[index].is_new_product && newItems[index].new_product_data) {
                newItems[index].new_product_data = {
                    ...newItems[index].new_product_data,
                    cost_price: val
                };
            }
        } else if (field === 'product_id') {
            newItems[index].product_id = value;
            newItems[index].is_new_product = false;
            newItems[index].new_product_data = null;
        }
        setItems(newItems);
    };

    // Abrir Modal de Producto Nuevo para una fila específica
    const handleOpenNewProductModal = (index: number) => {
        setNewProductTargetIndex(index);
        setIsNewProductModalOpen(true);
    };

    // Guardar borrador del Producto Nuevo (JSON sin insertar en catálogo) usando el formulario completo de Inventario
    const handleSaveProductDraftFromModal = (draftData: any, keepOpen?: boolean) => {
        if (newProductTargetIndex === null) return;

        const currentItem = items[newProductTargetIndex];
        const totalQty = draftData.stock > 0 ? draftData.stock : (currentItem?.quantity || 1);
        const costUnit = (draftData.cost_price !== undefined && draftData.cost_price !== '' && draftData.cost_price !== null) 
            ? Number(draftData.cost_price) 
            : (currentItem?.cost_price || 0);

        const updatedItems = [...items];
        updatedItems[newProductTargetIndex] = {
            product_id: null,
            product_name: `✨ [NUEVO] ${draftData.name || 'Producto Sin Nombre'}`,
            sku: draftData.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
            quantity: totalQty,
            cost_price: costUnit,
            is_new_product: true,
            new_product_data: {
                ...draftData,
                stock: totalQty,
                cost_price: costUnit
            }
        };

        setItems(updatedItems);
        if (!keepOpen) {
            setIsNewProductModalOpen(false);
            setNewProductTargetIndex(null);
        }
    };

    // Guardar la Orden de Compra en Estado "Pendiente"
    const handleSaveOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!supplierId) {
            alert('Por favor selecciona un proveedor.');
            return;
        }

        const invalidItem = items.some(item => 
            (!item.is_new_product && !item.product_id) || 
            item.quantity <= 0 || 
            item.cost_price === undefined || 
            item.cost_price < 0
        );

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

    // Abrir Modal de Revisión / Recepción Físico
    const handleOpenReviewModal = (po: PurchaseOrder) => {
        setReviewOrder(po);
        setDisputeNotesInput(po.dispute_notes || '');
        setReviewItems(
            po.items.map(it => ({
                ...it,
                received_quantity: it.received_quantity !== undefined ? it.received_quantity : it.quantity,
                item_status: it.item_status || 'recibido'
            }))
        );
    };

    // Declarar Reclamo a Proveedor
    const handleDeclareDispute = async () => {
        if (!reviewOrder) return;
        if (!disputeNotesInput.trim()) {
            alert('Por favor especifica las razones del reclamo (ej. faltaron 2 unidades, monturas partidas, etc.).');
            return;
        }

        setIsSubmittingReview(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/purchase-orders/${reviewOrder.id}/dispute`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dispute_notes: disputeNotesInput.trim(),
                    items: reviewItems
                })
            });

            const json = await res.json();
            if (json.success) {
                alert('⚠️ Orden marcada en Reclamo a Proveedor. No se ingresó stock hasta corregir el pedido.');
                setReviewOrder(null);
                fetchData();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error de red: ${err.message}`);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Confirmar e Ingresar al Inventario (Pasa de JSON/Pendiente a Catálogo Real & Stock)
    const handleConfirmAndCompleteReceive = async () => {
        if (!reviewOrder) return;

        const hasZeroQty = reviewItems.every(it => (it.received_quantity || 0) <= 0);
        if (hasZeroQty) {
            alert('No hay unidades marcadas como recibidas.');
            return;
        }

        if (!confirm('¿Confirmar ingreso físico al inventario? Los productos borrador nuevos se crearán en el catálogo y el stock de los productos recibidos se actualizará.')) return;

        setIsSubmittingReview(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/purchase-orders/${reviewOrder.id}/receive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reviewed_items: reviewItems
                })
            });

            const json = await res.json();
            if (json.success) {
                setReviewOrder(null);
                fetchData();
                
                if (json.products && json.products.length > 0) {
                    const printItems = json.products.map((p: any) => ({
                        name: p.name,
                        sku: p.sku,
                        price: p.price,
                        quantity: p.quantity
                    }));
                    
                    if (confirm(`✅ Mercancía recibida e ingresada al inventario exitosamente. Se crearon e ingresaron ${printItems.reduce((acc: number, curr: any) => acc + curr.quantity, 0)} unidades al stock. ¿Deseas imprimir las etiquetas de código de barras ahora?`)) {
                        printBarcodes(printItems);
                    }
                } else {
                    alert('✅ Mercancía recibida e ingresada al inventario exitosamente.');
                }
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error de conexión: ${err.message}`);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const formatCurrency = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num || 0);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'recibido':
            case 'received':
                return <span className="bg-green-500/10 text-green-700 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Recibido</span>;
            case 'reclamo':
                return <span className="bg-red-500/10 text-red-700 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">En Reclamo</span>;
            case 'en_revision':
                return <span className="bg-blue-500/10 text-blue-700 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">En Revisión</span>;
            case 'pendiente':
            case 'pending':
            default:
                return <span className="bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Pendiente</span>;
        }
    };

    return (
        <div className="space-y-6 text-[#161616]">
            {/* Header Módulo */}
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-4">
                <div>
                    <h3 className="font-serif text-2xl font-bold text-[#161616]">Órdenes de Compra</h3>
                    <p className="text-xs text-[#6B6862]">
                        Genera pedidos a proveedores, registra productos borrador nuevos en JSON y confirma el ingreso físico al inventario.
                    </p>
                </div>
                <button 
                    onClick={handleOpenCreateModal}
                    className="bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-xs px-4 py-2 rounded-md shadow transition cursor-pointer flex items-center gap-1.5"
                >
                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    NUEVA ORDEN DE COMPRA
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : purchaseOrders.length === 0 ? (
                <div className="bg-white border border-[#E2DFD7] p-12 text-center rounded-xl shadow-xs">
                    <span className="material-symbols-outlined text-4xl text-[#6B6862] opacity-40 mb-3">inventory_2</span>
                    <p className="text-sm text-[#6B6862]">No hay órdenes de compra registradas.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {purchaseOrders.map(po => {
                        const isExpanded = expandedOrder === po.id;
                        const isPendingOrClaim = po.status !== 'recibido' && po.status !== 'received';

                        return (
                            <div key={po.id} className="bg-white rounded-xl border border-[#E2DFD7] overflow-hidden hover:border-[#161616]/30 transition shadow-xs">
                                <div 
                                    className="p-4 flex flex-wrap md:flex-nowrap justify-between items-center gap-4 cursor-pointer select-none"
                                    onClick={() => setExpandedOrder(isExpanded ? null : po.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#FAF8F3] border border-[#E2DFD7] flex items-center justify-center text-[#161616]">
                                            <span className="material-symbols-outlined text-[22px]">assignment</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-[#161616]">{po.order_number}</span>
                                                {getStatusBadge(po.status)}
                                            </div>
                                            <p className="text-xs text-[#6B6862] mt-0.5">
                                                Proveedor: {po.supplier_name || 'N/A'} • {new Date(po.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] text-[#6B6862] uppercase tracking-wider">Total de Compra</p>
                                            <p className="font-bold text-sm text-[#161616] font-mono">{formatCurrency(po.total_amount)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isPendingOrClaim && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenReviewModal(po);
                                                    }}
                                                    className="bg-[#161616] hover:bg-[#333] text-white font-bold text-xs px-3.5 py-2 rounded-md transition flex items-center gap-1.5 border-0 cursor-pointer shadow-xs"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">fact_check</span>
                                                    Revisar & Recibir
                                                </button>
                                            )}
                                            <span className="material-symbols-outlined text-[#6B6862]">
                                                {isExpanded ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="bg-[#FAF8F5] border-t border-[#E2DFD7] p-4 space-y-4">
                                        {/* Detalle Logística y Reclamos */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-3.5 rounded-lg border border-[#E2DFD7] text-xs">
                                            <div>
                                                <span className="text-[#6B6862] font-semibold block">Logística / Transporte:</span>
                                                <span className="font-bold text-[#161616] mt-0.5 block">
                                                    {po.delivery_method === 'envio_tienda' ? '🚚 Envío por Proveedor' : '🏪 Recogida en Local'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[#6B6862] font-semibold block">Transportadora & Guía:</span>
                                                <span className="font-bold text-[#161616] mt-0.5 block">
                                                    {po.carrier_name || 'Sin especificar'} {po.tracking_number ? `(Guía: ${po.tracking_number})` : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[#6B6862] font-semibold block">Costo de Envío / Flete:</span>
                                                <span className="font-bold text-[#161616] font-mono mt-0.5 block">
                                                    {formatCurrency(po.shipping_cost)}
                                                </span>
                                            </div>
                                            {po.dispute_notes && (
                                                <div className="md:col-span-3 pt-2 border-t border-red-200 bg-red-50/50 p-2.5 rounded-md">
                                                    <span className="text-[#D9381E] font-bold block flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-base">warning</span>
                                                        Notas de Reclamo a Proveedor:
                                                    </span>
                                                    <span className="text-[#161616] mt-0.5 block font-medium">{po.dispute_notes}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Listado de ítems */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-[#161616] uppercase tracking-wider block ml-1">Productos del Pedido</h4>
                                            <div className="border border-[#E2DFD7] rounded-lg overflow-hidden bg-white">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-[#F6F4EE] border-b border-[#E2DFD7]">
                                                            <th className="p-3 font-bold text-[#161616]">Producto</th>
                                                            <th className="p-3 font-bold text-[#161616]">SKU</th>
                                                            <th className="p-3 font-bold text-[#161616] text-center">Cantidad Pedida</th>
                                                            <th className="p-3 font-bold text-[#161616] text-center">Recibida</th>
                                                            <th className="p-3 font-bold text-[#161616] text-right">Costo Unitario</th>
                                                            <th className="p-3 font-bold text-[#161616] text-right">Subtotal</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {po.items.map((item, idx) => (
                                                            <tr key={idx} className="border-b border-[#E2DFD7] last:border-0">
                                                                <td className="p-3 text-[#161616] font-medium">
                                                                    {item.is_new_product ? (
                                                                        <span className="text-[#D9381E] font-bold flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-sm">new_releases</span>
                                                                            {item.product_name || item.new_product_data?.name || 'Producto Nuevo (Borrador JSON)'}
                                                                        </span>
                                                                    ) : (
                                                                        item.product_name || 'Producto del Catálogo'
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-[#6B6862] font-mono">{item.sku || 'N/A'}</td>
                                                                <td className="p-3 text-[#161616] text-center font-bold">{item.quantity} uds</td>
                                                                <td className="p-3 text-[#161616] text-center font-bold">
                                                                    {item.received_quantity !== undefined ? `${item.received_quantity} uds` : '--'}
                                                                </td>
                                                                <td className="p-3 text-[#161616] text-right font-mono">{formatCurrency(item.cost_price)}</td>
                                                                <td className="p-3 text-[#161616] text-right font-mono font-bold">{formatCurrency(item.quantity * item.cost_price)}</td>
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
            {isCreateModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-left">
                    <form onSubmit={handleSaveOrder} className="bg-white border border-[#E2DFD7] p-6 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[88vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center mb-4 flex-shrink-0 border-b border-[#E2DFD7] pb-3">
                            <h3 className="font-serif text-xl font-bold text-[#161616]">Crear Orden de Compra</h3>
                            <button 
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 hover:bg-[#FAF8F3] rounded-md border-0 bg-transparent text-[#161616] cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Contenido con scroll */}
                        <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar flex-grow text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase">Proveedor *</label>
                                    <select 
                                        required
                                        value={supplierId}
                                        onChange={(e) => setSupplierId(e.target.value)}
                                        className="bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none transition cursor-pointer font-semibold"
                                    >
                                        <option value="">-- Selecciona Proveedor --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase">Código / Número de Orden (Opcional)</label>
                                    <input 
                                        type="text" 
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        placeholder="Ej: OC-9821 (Vacio para autogenerar)"
                                        className="bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase">Método de Transporte</label>
                                    <select 
                                        value={deliveryMethod}
                                        onChange={(e) => setDeliveryMethod(e.target.value)}
                                        className="bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none transition cursor-pointer font-semibold"
                                    >
                                        <option value="envio_tienda">🚚 Envío por Proveedor</option>
                                        <option value="recogida_local">🏪 Recogida en Local / Chofer</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase">Costo de Envío / Flete (COP)</label>
                                    <input 
                                        type="number" 
                                        value={shippingCost}
                                        onChange={(e) => setShippingCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="Ej: 15000"
                                        className="bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase">Transportadora / Chofer responsable</label>
                                    <input 
                                        type="text" 
                                        value={carrierName}
                                        onChange={(e) => setCarrierName(e.target.value)}
                                        placeholder="Ej: Servientrega / Juan Chofer"
                                        className="bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase">Número de Guía / Rastreo</label>
                                    <input 
                                        type="text" 
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        placeholder="Ej: 902381283"
                                        className="bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none font-mono"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 md:col-span-2">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase">Observaciones de la Orden</label>
                                    <textarea 
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Instrucciones adicionales para el laboratorio o proveedor..."
                                        rows={2}
                                        className="bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none resize-none"
                                    />
                                </div>
                            </div>

                            {/* Detalle de Productos */}
                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2">
                                    <h4 className="text-xs font-bold text-[#161616] uppercase tracking-wider">Productos del Pedido</h4>
                                    <button 
                                        type="button"
                                        onClick={handleAddItemField}
                                        className="bg-[#FAF8F3] hover:bg-[#EAE6DF] border border-[#E2DFD7] text-[#161616] text-xs font-bold px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[15px]">add_circle</span>
                                        Añadir Fila de Producto
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="bg-[#FAF8F5] p-3 rounded-lg border border-[#E2DFD7] space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-[#D9381E] uppercase">Ítem #{idx + 1}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenNewProductModal(idx)}
                                                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1 cursor-pointer border ${
                                                            item.is_new_product
                                                                ? 'bg-[#D9381E] text-white border-[#D9381E]'
                                                                : 'bg-white text-[#161616] border-[#E2DFD7] hover:bg-[#FAF8F3]'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">add_box</span>
                                                        {item.is_new_product ? '✨ Producto Nuevo Defini' : '+ Producto Nuevo'}
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        disabled={items.length === 1}
                                                        onClick={() => handleRemoveItemField(idx)}
                                                        className="p-1 hover:bg-red-50 text-[#D9381E] rounded-md transition border-0 bg-transparent cursor-pointer disabled:opacity-30"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-[#6B6862] font-semibold">Producto del Pedido</label>
                                                    {item.is_new_product ? (
                                                        <div className="p-2 bg-white rounded-md border border-[#D9381E]/40 text-xs flex justify-between items-center h-[38px]">
                                                            <div className="overflow-hidden">
                                                                <p className="font-bold text-[#D9381E] truncate">{item.product_name}</p>
                                                                <p className="text-[10px] text-[#6B6862] truncate">SKU: {item.sku}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenNewProductModal(idx)}
                                                                className="text-[10px] font-bold text-[#161616] underline cursor-pointer shrink-0 ml-1"
                                                            >
                                                                Editar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <select 
                                                            required={!item.is_new_product}
                                                            value={item.product_id || ''}
                                                            onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                                                            className="bg-white border border-[#E2DFD7] rounded-md p-2 text-xs text-[#161616] outline-none cursor-pointer h-[38px]"
                                                        >
                                                            <option value="">-- Selecciona del Catálogo --</option>
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-[#6B6862] font-semibold">Cantidad a Pedir *</label>
                                                    <input 
                                                        type="number" 
                                                        required
                                                        min="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                        className="bg-white border border-[#E2DFD7] rounded-md p-2 text-xs text-[#161616] outline-none font-bold h-[38px]"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] text-[#6B6862] font-semibold">Costo Unitario (COP) *</label>
                                                    <input 
                                                        type="number" 
                                                        required
                                                        min="0"
                                                        value={item.cost_price ?? 0}
                                                        onChange={(e) => handleItemChange(idx, 'cost_price', e.target.value)}
                                                        placeholder="Costo"
                                                        className="bg-white border border-[#E2DFD7] rounded-md p-2 text-xs text-[#161616] outline-none font-mono h-[38px]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-[#E2DFD7] flex-shrink-0 mt-4">
                            <button 
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 bg-white hover:bg-[#FAF8F3] border border-[#E2DFD7] text-[#161616] text-xs font-bold rounded-md transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-xs rounded-md shadow-xs transition cursor-pointer"
                            >
                                Guardar Orden en Pendiente
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Modal para Definir Producto Nuevo (Borrador JSON usando el Formulario Completo ERP) */}
            <SaaSErpProductFormModal
                isOpen={isNewProductModalOpen}
                onClose={() => {
                    setIsNewProductModalOpen(false);
                    setNewProductTargetIndex(null);
                }}
                clientId={clientId}
                categories={categories}
                token={token}
                isAdmin={true}
                editingProduct={newProductTargetIndex !== null && items[newProductTargetIndex]?.is_new_product ? items[newProductTargetIndex].new_product_data : null}
                isDraftMode={true}
                onSaveDraft={handleSaveProductDraftFromModal}
                fetchCategories={async () => {
                    try {
                        const res = await fetch(`/api/clients/${clientId}/categories`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const json = await res.json();
                        if (json.success && Array.isArray(json.categories)) setCategories(json.categories);
                    } catch (e) {
                        console.error('Error refreshing categories:', e);
                    }
                }}
            />


            {/* Modal de Revisión y Verificación de Mercancía (Etapa de Recepción) */}
            {reviewOrder && createPortal(
                <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[10000] p-4 text-left">
                    <div className="bg-white border border-[#E2DFD7] p-6 rounded-2xl max-w-4xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                            <div>
                                <h3 className="font-serif text-xl font-bold text-[#161616]">
                                    🔍 Revisión y Recepción Físico - Orden {reviewOrder.order_number}
                                </h3>
                                <p className="text-xs text-[#6B6862]">
                                    Proveedor: <strong>{reviewOrder.supplier_name}</strong> • Verifica las cantidades y estados recibidos antes de pasar al inventario.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReviewOrder(null)}
                                className="p-1 hover:bg-[#FAF8F3] rounded-md border-0 bg-transparent text-[#161616] cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Tabla de Conteo Físico */}
                        <div className="space-y-3 text-xs">
                            <div className="border border-[#E2DFD7] rounded-lg overflow-hidden bg-white">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-[#F6F4EE] border-b border-[#E2DFD7]">
                                            <th className="p-3 font-bold text-[#161616]">Producto / Borrador</th>
                                            <th className="p-3 font-bold text-[#161616] text-center">Cant. Pedida</th>
                                            <th className="p-3 font-bold text-[#161616] text-center">Cant. Recibida Físicamente</th>
                                            <th className="p-3 font-bold text-[#161616] text-center">Estado del Ítem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reviewItems.map((item, idx) => (
                                            <tr key={idx} className="border-b border-[#E2DFD7] last:border-0">
                                                <td className="p-3 font-medium text-[#161616]">
                                                    {item.is_new_product ? (
                                                        <span className="text-[#D9381E] font-bold block">
                                                            ✨ {item.product_name || item.new_product_data?.name} (Borrador Nuevo)
                                                        </span>
                                                    ) : (
                                                        item.product_name || 'Producto del Catálogo'
                                                    )}
                                                    <span className="text-[10px] text-[#6B6862] block font-mono">SKU: {item.sku || 'N/A'}</span>
                                                </td>
                                                <td className="p-3 text-center font-bold text-[#161616]">{item.quantity} uds</td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.received_quantity !== undefined ? item.received_quantity : item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setReviewItems(prev => {
                                                                const next = [...prev];
                                                                next[idx].received_quantity = val;
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-20 text-center bg-white border border-[#E2DFD7] rounded-md p-1.5 font-bold text-[#161616] outline-none"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <select
                                                        value={item.item_status || 'recibido'}
                                                        onChange={(e) => {
                                                            const val = e.target.value as any;
                                                            setReviewItems(prev => {
                                                                const next = [...prev];
                                                                next[idx].item_status = val;
                                                                return next;
                                                            });
                                                        }}
                                                        className="bg-white border border-[#E2DFD7] rounded-md p-1.5 text-xs text-[#161616] font-semibold outline-none cursor-pointer"
                                                    >
                                                        <option value="recibido">✅ Recibido OK</option>
                                                        <option value="faltante">⚠️ Faltante</option>
                                                        <option value="defectuoso">❌ Defectuoso</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Sección de Observaciones y Reclamo */}
                            <div className="space-y-1 pt-2">
                                <label className="text-[11px] font-bold text-[#6B6862] uppercase">
                                    Observaciones o Motivos de Reclamo (Si hay faltantes o defectos)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Ej. El laboratorio entregó 2 unidades menos y 1 montura llegó con el marco rayado..."
                                    value={disputeNotesInput}
                                    onChange={(e) => setDisputeNotesInput(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] rounded-md p-2.5 text-xs text-[#161616] outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-[#E2DFD7]">
                            <button
                                type="button"
                                disabled={isSubmittingReview}
                                onClick={handleDeclareDispute}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-md shadow-xs transition cursor-pointer flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-base">warning</span>
                                Declarar Reclamo a Proveedor
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setReviewOrder(null)}
                                    className="px-4 py-2 bg-white border border-[#E2DFD7] text-[#161616] text-xs font-bold rounded-md"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmittingReview}
                                    onClick={handleConfirmAndCompleteReceive}
                                    className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-xs rounded-md shadow-xs transition cursor-pointer flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-base">check_circle</span>
                                    {isSubmittingReview ? 'Procesando...' : 'Confirmar e Ingresar al Inventario'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
