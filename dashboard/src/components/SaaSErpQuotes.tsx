import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface QuoteItem {
    product_id?: string;
    name: string;
    sku?: string;
    quantity: number;
    unit_price: number;
    discount_pct?: number;
    subtotal: number;
}

interface Quote {
    id: string;
    client_id: string;
    quote_number: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    customer_document: string | null;
    items: QuoteItem[] | string;
    subtotal: string | number;
    discount_amount: string | number;
    tax_amount: string | number;
    total_amount: string | number;
    status: 'pending' | 'converted' | 'expired' | 'cancelled';
    valid_until: string | null;
    notes: string | null;
    seller_name: string | null;
    converted_invoice_id: string | null;
    created_at: string;
}

interface Product {
    id: string;
    name: string;
    sku: string | null;
    price: string;
    stock: number;
    brand?: string | null;
}

interface SaaSErpQuotesProps {
    clientId: string;
}

export const SaaSErpQuotes: React.FC<SaaSErpQuotesProps> = ({ clientId: rawClientId }) => {
    const clientId = (rawClientId && rawClientId !== 'undefined' && rawClientId !== 'admin')
        ? rawClientId
        : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');

    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'converted' | 'expired'>('all');

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerDocument, setCustomerDocument] = useState('');
    const [validDays, setValidDays] = useState<number>(15);
    const [notes, setNotes] = useState('Precios válidos por los días estipulados. Incluye asesoría personalizada.');
    const [sellerName, setSellerName] = useState(localStorage.getItem('user_name') || 'Asesor Comercial');

    // Line items state for create modal
    const [lineItems, setLineItems] = useState<QuoteItem[]>([]);
    const [prodSearchInput, setProdSearchInput] = useState('');
    const [selectedProdId, setSelectedProdId] = useState('');
    const [selectedProdName, setSelectedProdName] = useState('');
    const [addQty, setAddQty] = useState<number>(1);
    const [addCustomPrice, setAddCustomPrice] = useState<number | ''>('');
    const [addDiscountPct, setAddDiscountPct] = useState<number>(0);

    // Convert to Invoice Modal State
    const [convertQuote, setConvertQuote] = useState<Quote | null>(null);
    const [convertPaymentMethod, setConvertPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'credito'>('efectivo');
    const [converting, setConverting] = useState(false);

    // Print Modal State
    const [viewQuote, setViewQuote] = useState<Quote | null>(null);

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/quotes`);
            const json = await res.json();
            if (json.success) {
                setQuotes(json.quotes || []);
            }
        } catch (err) {
            console.error("Error loading quotes:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/products`);
            const json = await res.json();
            if (json.success) {
                setProducts(json.products || []);
            }
        } catch (err) {
            console.error("Error loading products:", err);
        }
    };

    useEffect(() => {
        fetchQuotes();
        fetchProducts();
    }, [clientId]);

    // Handle adding item to quote draft
    const handleAddLineItem = () => {
        const name = selectedProdName || prodSearchInput.trim();
        if (!name) return;

        const prod = products.find(p => p.id === selectedProdId);
        const basePrice = addCustomPrice !== '' ? Number(addCustomPrice) : (prod ? parseFloat(prod.price || '0') : 0);
        const qty = Math.max(1, addQty);
        const disc = Math.max(0, Math.min(100, addDiscountPct));
        const unitWithDisc = basePrice * (1 - disc / 100);
        const subtotal = unitWithDisc * qty;

        const newItem: QuoteItem = {
            product_id: selectedProdId || undefined,
            name: name,
            sku: prod?.sku || undefined,
            quantity: qty,
            unit_price: basePrice,
            discount_pct: disc,
            subtotal
        };

        setLineItems(prev => [...prev, newItem]);
        setProdSearchInput('');
        setSelectedProdId('');
        setSelectedProdName('');
        setAddQty(1);
        setAddCustomPrice('');
        setAddDiscountPct(0);
    };

    const handleRemoveLineItem = (idx: number) => {
        setLineItems(prev => prev.filter((_, i) => i !== idx));
    };

    // Calculate totals
    const calcSubtotal = lineItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const calcDiscounts = lineItems.reduce((acc, item) => {
        const discPct = item.discount_pct || 0;
        return acc + ((item.unit_price * (discPct / 100)) * item.quantity);
    }, 0);
    const calcTotal = calcSubtotal - calcDiscounts;

    const handleCreateQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim()) {
            alert("Por favor ingresa el nombre del cliente.");
            return;
        }
        if (lineItems.length === 0) {
            alert("Agrega al menos un producto o servicio a la cotización.");
            return;
        }

        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + validDays);
        const validUntilStr = validUntilDate.toISOString().split('T')[0];

        const payload = {
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim() || null,
            customer_email: customerEmail.trim() || null,
            customer_document: customerDocument.trim() || null,
            items: lineItems,
            subtotal: calcSubtotal,
            discount_amount: calcDiscounts,
            tax_amount: 0,
            total_amount: calcTotal,
            valid_until: validUntilStr,
            notes: notes.trim() || null,
            seller_name: sellerName.trim() || 'Vendedor'
        };

        try {
            const res = await fetch(`/api/clients/${clientId}/quotes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                alert(`✓ Cotización ${json.quote.quote_number} generada con éxito y registrada en prospectos CRM.`);
                setIsCreateModalOpen(false);
                resetCreateForm();
                fetchQuotes();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error al crear la cotización: ${err.message}`);
        }
    };

    const resetCreateForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerDocument('');
        setLineItems([]);
        setProdSearchInput('');
        setSelectedProdId('');
        setSelectedProdName('');
        setAddQty(1);
        setAddCustomPrice('');
        setAddDiscountPct(0);
        setValidDays(15);
        setNotes('Precios válidos por los días estipulados. Incluye asesoría personalizada.');
    };

    const handleExecuteConvert = async () => {
        if (!convertQuote) return;
        try {
            setConverting(true);
            const res = await fetch(`/api/clients/${clientId}/quotes/${convertQuote.id}/convert-to-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_method: convertPaymentMethod })
            });
            const json = await res.json();
            if (json.success) {
                alert(`🎉 ¡Excelente! La cotización ${convertQuote.quote_number} fue convertida exitosamente a la Factura ${json.invoice.invoice_number}. El inventario ha sido actualizado y el prospecto marcado como cliente activo en el CRM.`);
                setConvertQuote(null);
                fetchQuotes();
            } else {
                alert(`Error al convertir: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error de conexión: ${err.message}`);
        } finally {
            setConverting(false);
        }
    };

    const handleDeleteQuote = async (id: string, qNum: string) => {
        if (!confirm(`¿Estás seguro de eliminar la cotización ${qNum}?`)) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/quotes/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                fetchQuotes();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al eliminar la cotización.');
        }
    };

    const formatCOP = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val || '0') : val;
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
    };

    // Filter quotes
    const filteredQuotes = quotes.filter(q => {
        const matchesSearch = !searchTerm || (
            q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (q.customer_phone && q.customer_phone.includes(searchTerm))
        );

        if (statusFilter === 'all') return matchesSearch;
        return matchesSearch && q.status === statusFilter;
    });

    // KPI Summary Calculations
    const totalCount = quotes.length;
    const totalAmountSum = quotes.reduce((acc, q) => acc + parseFloat(q.total_amount?.toString() || '0'), 0);
    const convertedCount = quotes.filter(q => q.status === 'converted').length;
    const conversionRate = totalCount > 0 ? ((convertedCount / totalCount) * 100).toFixed(1) : '0.0';

    return (
        <div className="space-y-6 text-white font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-extrabold text-[#eab308] tracking-tight flex items-center gap-2" style={{ color: '#eab308' }}>
                        <span className="material-symbols-outlined text-[24px]">request_quote</span>
                        COTIZACIONES Y PROSPECTOS DE VENTA
                    </h2>
                    <p className="text-xs text-gray-400 font-medium">Genera cotizaciones profesionales, captura prospectos con alta intención de compra y conviértelas a factura en 1 clic.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchQuotes}
                        className="h-9 px-3 bg-[#181a1c] hover:bg-[#222528] text-white rounded-lg flex items-center justify-center border border-[#2d3036] cursor-pointer transition text-xs font-semibold shrink-0"
                        title="Refrescar cotizaciones"
                    >
                        <span className="material-symbols-outlined text-[16px] mr-1">refresh</span>
                        Refrescar
                    </button>
                    <button
                        type="button"
                        onClick={() => { resetCreateForm(); setIsCreateModalOpen(true); }}
                        className="h-9 bg-[#eab308] hover:bg-amber-300 text-black text-xs font-extrabold px-4 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer border-0"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        NUEVA COTIZACIÓN
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#141517] border border-[#222428] p-4 rounded-xl flex flex-col justify-between shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">COTIZACIONES EMITIDAS</span>
                        <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                        </span>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-extrabold text-white font-mono">{totalCount}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Propuestas comerciales creadas</p>
                    </div>
                </div>

                <div className="bg-[#141517] border border-[#222428] p-4 rounded-xl flex flex-col justify-between shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">MONTO TOTAL COTIZADO</span>
                        <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <span className="material-symbols-outlined text-[20px]">attach_money</span>
                        </span>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-extrabold text-emerald-400 font-mono">{formatCOP(totalAmountSum)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Valor potencial en prospectos</p>
                    </div>
                </div>

                <div className="bg-[#141517] border border-[#222428] p-4 rounded-xl flex flex-col justify-between shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">TASA CONVERSIÓN A VENTA</span>
                        <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <span className="material-symbols-outlined text-[20px]">trending_up</span>
                        </span>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-extrabold text-blue-400 font-mono">{conversionRate}%</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{convertedCount} cotizaciones facturadas</p>
                    </div>
                </div>

                <div className="bg-[#141517] border border-[#222428] p-4 rounded-xl flex flex-col justify-between shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">PROSPECTOS CRM</span>
                        <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <span className="material-symbols-outlined text-[20px]">group_add</span>
                        </span>
                    </div>
                    <div className="mt-2">
                        <p className="text-2xl font-extrabold text-purple-300 font-mono">{quotes.filter(q => q.customer_phone).length}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Leads capturados con teléfono</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#141517] p-3 rounded-xl border border-[#222428]">
                <div className="relative w-full sm:w-80">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                        <span className="material-symbols-outlined text-[18px]">search</span>
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por N° cotización, cliente o teléfono..."
                        className="w-full bg-[#1c1e22] border border-[#2d3036] rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-[#eab308] outline-none"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                    {(['all', 'pending', 'converted', 'expired'] as const).map(st => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border-0 capitalize shrink-0 ${
                                statusFilter === st
                                    ? 'bg-[#eab308] text-black shadow'
                                    : 'bg-[#1c1e22] text-gray-400 hover:text-white border border-[#2d3036]'
                            }`}
                        >
                            {st === 'all' ? 'Todas' : st === 'pending' ? 'Pendientes' : st === 'converted' ? 'Convertidas a Factura' : 'Vencidas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#141517] border border-[#222428] rounded-xl overflow-hidden shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#1a1c20] text-gray-400 uppercase font-bold border-b border-[#222428]">
                                <th className="p-3.5">N° Cotización</th>
                                <th className="p-3.5">Cliente / Prospecto</th>
                                <th className="p-3.5">Fecha & Validez</th>
                                <th className="p-3.5">Total</th>
                                <th className="p-3.5 text-center">Estado</th>
                                <th className="p-3.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222428]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        <span className="material-symbols-outlined animate-spin text-[24px] mb-1">sync</span>
                                        <p>Cargando cotizaciones...</p>
                                    </td>
                                </tr>
                            ) : filteredQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        <span className="material-symbols-outlined text-[32px] text-gray-500 mb-1">request_quote</span>
                                        <p className="font-semibold">No se encontraron cotizaciones.</p>
                                        <p className="text-[11px] text-gray-500 mt-1">Crea una nueva cotización para registrar prospectos de venta.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotes.map(q => {
                                    const parsedItems: QuoteItem[] = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
                                    return (
                                        <tr key={q.id} className="hover:bg-[#1a1c20]/60 transition-colors">
                                            <td className="p-3.5">
                                                <div className="font-bold text-white font-mono flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-amber-400 text-[16px]">receipt_long</span>
                                                    {q.quote_number}
                                                </div>
                                                <span className="text-[10px] text-gray-400">{parsedItems.length} ítems cotizados</span>
                                            </td>

                                            <td className="p-3.5">
                                                <p className="font-bold text-white text-sm">{q.customer_name}</p>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                                    {q.customer_phone && (
                                                        <a
                                                            href={`https://wa.me/${q.customer_phone.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-green-400 hover:underline flex items-center gap-0.5 font-mono"
                                                            title="Enviar WhatsApp al prospecto"
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">chat</span>
                                                            {q.customer_phone}
                                                        </a>
                                                    )}
                                                    {q.customer_document && <span className="text-gray-400">• CC/NIT: {q.customer_document}</span>}
                                                </div>
                                            </td>

                                            <td className="p-3.5 text-gray-300">
                                                <p>{new Date(q.created_at).toLocaleDateString('es-CO')}</p>
                                                {q.valid_until && (
                                                    <p className="text-[10px] text-amber-400/90 flex items-center gap-1 mt-0.5">
                                                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                        Vence: {new Date(q.valid_until).toLocaleDateString('es-CO')}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <p className="font-extrabold text-emerald-400 text-sm font-mono">{formatCOP(q.total_amount)}</p>
                                            </td>

                                            <td className="p-3.5 text-center">
                                                {q.status === 'converted' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                        Facturada 🧾
                                                    </span>
                                                ) : q.status === 'pending' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                        <span className="material-symbols-outlined text-[13px]">pending</span>
                                                        Cotizada / Pendiente
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                                        <span className="material-symbols-outlined text-[13px]">cancel</span>
                                                        Vencida / Cancelada
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-right space-x-1.5">
                                                {q.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConvertQuote(q)}
                                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all border-0 cursor-pointer shadow inline-flex items-center gap-1"
                                                        title="Convertir a Factura de Venta real"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">point_of_sale</span>
                                                        Convertir a Factura 🧾
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => setViewQuote(q)}
                                                    className="p-1.5 bg-[#222428] hover:bg-[#2c2f35] text-gray-200 rounded-lg transition border-0 cursor-pointer inline-flex items-center"
                                                    title="Ver e Imprimir Cotización"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteQuote(q.id, q.quote_number)}
                                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition border-0 cursor-pointer inline-flex items-center"
                                                    title="Eliminar cotización"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal: Crear Nueva Cotización */}
            {isCreateModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <form onSubmit={handleCreateQuote} className="bg-[#141517] border border-[#2d3036] p-6 rounded-2xl max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-[#2d3036] pb-3">
                            <h3 className="font-extrabold text-base text-[#eab308] flex items-center gap-2" style={{ color: '#eab308' }}>
                                <span className="material-symbols-outlined text-[22px]">request_quote</span>
                                NUEVA COTIZACIÓN COMERCIAL
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 hover:bg-[#222528] rounded-lg border-0 bg-transparent text-gray-400 cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Datos del Prospecto / Cliente */}
                        <div className="bg-[#1c1e22] border border-[#2d3036] p-4 rounded-xl space-y-3">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">person_add</span>
                                Datos del Cliente / Prospecto Comercial
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-gray-300 font-medium">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Ej: Carlos Mendoza"
                                        className="w-full bg-[#141517] border border-[#2d3036] rounded-lg p-2.5 text-xs text-white focus:border-[#eab308] outline-none mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-300 font-medium">Teléfono / WhatsApp *</label>
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Ej: 3001234567"
                                        className="w-full bg-[#141517] border border-[#2d3036] rounded-lg p-2.5 text-xs text-white focus:border-[#eab308] outline-none mt-1 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-300 font-medium">Cédula / NIT</label>
                                    <input
                                        type="text"
                                        value={customerDocument}
                                        onChange={(e) => setCustomerDocument(e.target.value)}
                                        placeholder="Ej: 1098765432"
                                        className="w-full bg-[#141517] border border-[#2d3036] rounded-lg p-2.5 text-xs text-white focus:border-[#eab308] outline-none mt-1 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-300 font-medium">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="cliente@ejemplo.com"
                                        className="w-full bg-[#141517] border border-[#2d3036] rounded-lg p-2.5 text-xs text-white focus:border-[#eab308] outline-none mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Agregar Ítems */}
                        <div className="bg-[#1c1e22] border border-[#2d3036] p-4 rounded-xl space-y-3">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                                Seleccionar Productos / Servicios
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                {/* Buscador de producto por Nombre / SKU */}
                                <div className="sm:col-span-5 relative">
                                    <label className="text-[10px] text-gray-400 font-bold">Buscar Artículo / Servicio (Nombre o SKU)</label>
                                    <div className="relative mt-1">
                                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[14px] pointer-events-none">search</span>
                                        <input
                                            type="text"
                                            placeholder={products.length === 0 ? "Escribe o busca..." : `Buscar entre ${products.length} productos o SKU...`}
                                            value={prodSearchInput}
                                            onChange={(e) => {
                                                setProdSearchInput(e.target.value);
                                                if (selectedProdId) {
                                                    setSelectedProdId('');
                                                    setSelectedProdName('');
                                                }
                                            }}
                                            className={`w-full bg-[#141517] border rounded-lg pl-8 pr-7 py-2 text-xs text-white focus:border-[#eab308] outline-none transition ${
                                                selectedProdId ? 'border-[#eab308]/60 bg-[#eab308]/10 font-bold' : 'border-[#2d3036]'
                                            }`}
                                            autoComplete="off"
                                        />
                                        {prodSearchInput && (
                                            <button
                                                type="button"
                                                onClick={() => { setProdSearchInput(''); setSelectedProdId(''); setSelectedProdName(''); setAddCustomPrice(''); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-400 border-0 bg-transparent p-0 cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        )}
                                    </div>
                                    {/* Desplegable de sugerencias */}
                                    {prodSearchInput && !selectedProdId && (() => {
                                        const q = prodSearchInput.trim().toLowerCase();
                                        const suggestions = products.filter(p =>
                                            p.name.toLowerCase().includes(q) ||
                                            (p.sku && p.sku.toLowerCase().includes(q))
                                        ).slice(0, 8);
                                        return (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-[#1c1e22] border border-[#2d3036] rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                                                {suggestions.length === 0 ? (
                                                    <div className="p-3 text-xs text-gray-400 italic text-center">No hay productos con ese término. Presiona Agregar para crearlo como ítem libre.</div>
                                                ) : (
                                                    suggestions.map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                setSelectedProdId(p.id);
                                                                setSelectedProdName(p.name);
                                                                setProdSearchInput(p.name);
                                                                setAddCustomPrice(parseFloat(p.price || '0'));
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-[#eab308]/15 flex items-center justify-between gap-2 transition-colors cursor-pointer border-0 bg-transparent border-b border-[#2d3036]/40 last:border-0"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-semibold text-white">{p.name}</p>
                                                                <p className="text-[10px] text-gray-400">{p.sku ? `SKU: ${p.sku} • ` : ''}Stock: {p.stock}</p>
                                                            </div>
                                                            <span className="text-xs font-bold text-amber-400 font-mono shrink-0">${Number(p.price).toLocaleString('es-CO')}</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Precio Unitario editable */}
                                <div className="sm:col-span-3">
                                    <label className="text-[10px] text-gray-400 font-bold">Precio Unit. ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={addCustomPrice}
                                        onChange={(e) => setAddCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full bg-[#141517] border border-[#2d3036] rounded-lg p-2 text-xs text-white text-right font-mono font-bold focus:border-[#eab308] outline-none mt-1"
                                    />
                                </div>

                                {/* Cantidad */}
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] text-gray-400 font-bold">Cant.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addQty}
                                        onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                                        className="w-full bg-[#141517] border border-[#2d3036] rounded-lg p-2 text-xs text-white text-center font-mono font-bold mt-1 focus:border-[#eab308] outline-none"
                                    />
                                </div>

                                {/* Desc % */}
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] text-gray-400 font-bold">% Desc.</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={addDiscountPct}
                                        onChange={(e) => setAddDiscountPct(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-[#141517] border border-[#2d3036] rounded-lg p-2 text-xs text-white text-center font-mono mt-1 focus:border-[#eab308] outline-none"
                                    />
                                </div>
                            </div>

                            {/* Botón Agregar Ítem */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleAddLineItem}
                                    disabled={!selectedProdId && !prodSearchInput.trim()}
                                    className="bg-[#eab308] hover:bg-amber-300 text-black font-extrabold text-xs py-2 px-4 rounded-lg transition-all border-0 cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                    + AGREGAR ÍTEM A COTIZACIÓN
                                </button>
                            </div>

                            {/* Lista de Ítems Agregados con edición en línea */}
                            {lineItems.length > 0 && (
                                <div className="mt-3 border border-[#2d3036] rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-[#141517] text-gray-400 font-bold uppercase border-b border-[#2d3036]">
                                            <tr>
                                                <th className="p-2">Ítem</th>
                                                <th className="p-2 text-center">Cant</th>
                                                <th className="p-2 text-right">Precio Unit ($)</th>
                                                <th className="p-2 text-center">Desc %</th>
                                                <th className="p-2 text-right">Subtotal</th>
                                                <th className="p-2 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#2d3036]">
                                            {lineItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-[#141517]/50">
                                                    <td className="p-2 font-semibold text-white">
                                                        {item.name}
                                                        {item.sku ? <span className="text-[10px] text-gray-400 font-mono ml-1">({item.sku})</span> : null}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => {
                                                                const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                                                setLineItems(prev => {
                                                                    const copy = [...prev];
                                                                    const disc = copy[idx].discount_pct || 0;
                                                                    const sub = (copy[idx].unit_price * (1 - disc / 100)) * newQty;
                                                                    copy[idx] = { ...copy[idx], quantity: newQty, subtotal: sub };
                                                                    return copy;
                                                                });
                                                            }}
                                                            className="w-16 bg-[#141517] border border-[#2d3036] rounded px-1.5 py-1 text-xs text-white text-center font-mono font-bold focus:border-[#eab308] outline-none"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={item.unit_price}
                                                            onChange={(e) => {
                                                                const newPrice = parseFloat(e.target.value) || 0;
                                                                setLineItems(prev => {
                                                                    const copy = [...prev];
                                                                    const disc = copy[idx].discount_pct || 0;
                                                                    const sub = (newPrice * (1 - disc / 100)) * copy[idx].quantity;
                                                                    copy[idx] = { ...copy[idx], unit_price: newPrice, subtotal: sub };
                                                                    return copy;
                                                                });
                                                            }}
                                                            className="w-24 bg-[#141517] border border-[#2d3036] rounded px-1.5 py-1 text-xs text-white text-right font-mono font-bold focus:border-[#eab308] outline-none"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={item.discount_pct || 0}
                                                            onChange={(e) => {
                                                                const newDisc = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                                                                setLineItems(prev => {
                                                                    const copy = [...prev];
                                                                    const sub = (copy[idx].unit_price * (1 - newDisc / 100)) * copy[idx].quantity;
                                                                    copy[idx] = { ...copy[idx], discount_pct: newDisc, subtotal: sub };
                                                                    return copy;
                                                                });
                                                            }}
                                                            className="w-16 bg-[#141517] border border-[#2d3036] rounded px-1.5 py-1 text-xs text-amber-400 text-center font-mono focus:border-[#eab308] outline-none"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-400">{formatCOP(item.subtotal)}</td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveLineItem(idx)}
                                                            className="text-rose-400 hover:text-rose-300 bg-transparent border-0 cursor-pointer p-1"
                                                            title="Eliminar ítem"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Validez & Notas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] text-gray-300 font-medium">Días de Validez de Oferta</label>
                                <select
                                    value={validDays}
                                    onChange={(e) => setValidDays(parseInt(e.target.value))}
                                    className="w-full bg-[#1c1e22] border border-[#2d3036] rounded-lg p-2.5 text-xs text-white focus:border-[#eab308] outline-none mt-1"
                                >
                                    <option value={7}>7 Días</option>
                                    <option value={15}>15 Días (Recomendado)</option>
                                    <option value={30}>30 Días</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-300 font-medium">Asesor Comercial</label>
                                <input
                                    type="text"
                                    value={sellerName}
                                    onChange={(e) => setSellerName(e.target.value)}
                                    className="w-full bg-[#1c1e22] border border-[#2d3036] rounded-lg p-2.5 text-xs text-white focus:border-[#eab308] outline-none mt-1"
                                />
                            </div>
                        </div>

                        {/* Resumen Total */}
                        <div className="bg-[#1c1e22] p-4 rounded-xl border border-[#2d3036] flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-gray-400">TOTAL COTIZADO</span>
                            <span className="text-2xl font-extrabold text-emerald-400 font-mono">{formatCOP(calcTotal)}</span>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-[#2d3036]">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 bg-transparent hover:bg-[#222528] text-gray-300 text-xs font-bold rounded-lg border border-[#2d3036] cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-[#eab308] hover:bg-amber-300 text-black font-extrabold text-xs rounded-lg transition-all border-0 cursor-pointer shadow-md flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                GENERAR Y GUARDAR COTIZACIÓN
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Modal: Convertir a Factura */}
            {convertQuote && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#141517] border border-[#2d3036] p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-[#2d3036] pb-3">
                            <h3 className="font-extrabold text-base text-emerald-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
                                CONVERTIR COTIZACIÓN EN FACTURA 🧾
                            </h3>
                            <button
                                type="button"
                                onClick={() => setConvertQuote(null)}
                                className="p-1 hover:bg-[#222528] rounded-lg border-0 bg-transparent text-gray-400 cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="bg-[#1c1e22] p-3 rounded-xl border border-[#2d3036] text-xs space-y-1">
                            <p className="text-white font-bold">{convertQuote.quote_number} - {convertQuote.customer_name}</p>
                            <p className="text-gray-400">Total a facturar: <strong className="text-emerald-400 text-sm font-mono">{formatCOP(convertQuote.total_amount)}</strong></p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-300 uppercase">Método de Pago *</label>
                            <select
                                value={convertPaymentMethod}
                                onChange={(e) => setConvertPaymentMethod(e.target.value as any)}
                                className="w-full bg-[#1c1e22] border border-[#2d3036] rounded-lg p-3 text-xs text-white focus:border-emerald-400 outline-none mt-1 font-bold"
                            >
                                <option value="efectivo">Efectivo 💵</option>
                                <option value="transferencia">Transferencia Bancaria / Nequi / Daviplata 📲</option>
                                <option value="tarjeta">Datafono / Tarjeta 💳</option>
                                <option value="credito">Crédito / Cuotas 🤝</option>
                            </select>
                        </div>

                        <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                            ℹ️ Al confirmar, el sistema creará la Factura de Venta oficial, descontará el stock de inventario y actualizará al prospecto a <strong>Cliente Activo</strong> en el CRM.
                        </p>

                        <div className="flex justify-end gap-3 pt-3 border-t border-[#2d3036]">
                            <button
                                type="button"
                                onClick={() => setConvertQuote(null)}
                                className="px-4 py-2 bg-transparent hover:bg-[#222528] text-gray-300 text-xs font-bold rounded-lg border border-[#2d3036] cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteConvert}
                                disabled={converting}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg transition-all border-0 cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                {converting ? 'Facturando...' : 'CONFIRMAR Y FACTURAR'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Vista e Impresión de Cotización */}
            {viewQuote && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#141517] border border-[#2d3036] p-6 rounded-2xl max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center border-b border-[#2d3036] pb-3">
                            <h3 className="font-extrabold text-base text-[#eab308] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[22px]">description</span>
                                COTIZACIÓN {viewQuote.quote_number}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setViewQuote(null)}
                                className="p-1 hover:bg-[#222528] rounded-lg border-0 bg-transparent text-gray-400 cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Vista Imprimible / Ticket elegante */}
                        <div className="bg-[#1c1e22] p-5 rounded-xl border border-[#2d3036] space-y-4 text-xs">
                            <div className="flex justify-between items-start border-b border-[#2d3036] pb-3">
                                <div>
                                    <h4 className="font-bold text-sm text-white">{viewQuote.customer_name}</h4>
                                    <p className="text-gray-400">Tel: {viewQuote.customer_phone || 'N/A'}</p>
                                    <p className="text-gray-400">CC/NIT: {viewQuote.customer_document || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-amber-400 font-bold">{viewQuote.quote_number}</p>
                                    <p className="text-gray-400">{new Date(viewQuote.created_at).toLocaleDateString('es-CO')}</p>
                                    <p className="text-gray-400">Asesor: {viewQuote.seller_name || 'Óptica'}</p>
                                </div>
                            </div>

                            <table className="w-full text-left text-xs">
                                <thead className="text-gray-400 border-b border-[#2d3036]">
                                    <tr>
                                        <th className="py-1">Ítem</th>
                                        <th className="py-1 text-center">Cant</th>
                                        <th className="py-1 text-right">Precio Unit</th>
                                        <th className="py-1 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2d3036]/50">
                                    {(typeof viewQuote.items === 'string' ? JSON.parse(viewQuote.items) : (viewQuote.items || [])).map((it: QuoteItem, idx: number) => (
                                        <tr key={idx}>
                                            <td className="py-2 text-white">{it.name}</td>
                                            <td className="py-2 text-center font-mono">{it.quantity}</td>
                                            <td className="py-2 text-right font-mono">{formatCOP(it.unit_price)}</td>
                                            <td className="py-2 text-right font-mono font-bold text-emerald-400">{formatCOP(it.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="border-t border-[#2d3036] pt-3 flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-300">TOTAL</span>
                                <span className="font-extrabold text-emerald-400 font-mono text-lg">{formatCOP(viewQuote.total_amount)}</span>
                            </div>

                            {viewQuote.notes && (
                                <div className="bg-[#141517] p-2.5 rounded-lg border border-[#2d3036] text-[11px] text-gray-400">
                                    📌 {viewQuote.notes}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            {viewQuote.customer_phone && (
                                <a
                                    href={`https://wa.me/${viewQuote.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${viewQuote.customer_name}, te enviamos la cotización ${viewQuote.quote_number} por un valor de ${formatCOP(viewQuote.total_amount)}. ¡Quedamos atentos a tus comentarios!`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-lg transition-all inline-flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-[16px]">chat</span>
                                    Compartir por WhatsApp
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-[#eab308] hover:bg-amber-300 text-black font-extrabold text-xs rounded-lg transition-all border-0 cursor-pointer flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">print</span>
                                Imprimir Cotización
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
