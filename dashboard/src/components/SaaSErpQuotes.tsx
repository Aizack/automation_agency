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
    model?: string | null;
    color?: string | null;
    material?: string | null;
    style?: string | null;
    description?: string | null;
    variants?: any[] | null;
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

    const calcSubtotal = lineItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const calcDiscount = lineItems.reduce((acc, item) => {
        const disc = item.discount_pct || 0;
        return acc + (item.unit_price * (disc / 100) * item.quantity);
    }, 0);
    const calcTotal = lineItems.reduce((acc, item) => acc + item.subtotal, 0);

    const resetCreateForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerDocument('');
        setValidDays(15);
        setNotes('Precios válidos por los días estipulados. Incluye asesoría personalizada.');
        setSellerName(localStorage.getItem('user_name') || 'Asesor Comercial');
        setLineItems([]);
        setProdSearchInput('');
        setSelectedProdId('');
        setSelectedProdName('');
        setAddQty(1);
        setAddCustomPrice('');
        setAddDiscountPct(0);
    };

    const handleCreateQuote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim()) {
            alert('Por favor ingresa el nombre del cliente o prospecto.');
            return;
        }
        if (lineItems.length === 0) {
            alert('Debes agregar al menos un ítem o producto a la cotización.');
            return;
        }

        const validUntilDate = new Date();
        validUntilDate.setDate(validUntilDate.getDate() + validDays);

        const payload = {
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim() || null,
            customer_email: customerEmail.trim() || null,
            customer_document: customerDocument.trim() || null,
            items: lineItems,
            subtotal: calcSubtotal,
            discount_amount: calcDiscount,
            tax_amount: 0,
            total_amount: calcTotal,
            valid_until: validUntilDate.toISOString().split('T')[0],
            notes: notes.trim() || null,
            seller_name: sellerName.trim() || null
        };

        try {
            const res = await fetch(`/api/clients/${clientId}/quotes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                alert(`Cotización ${json.quote?.quote_number || ''} creada exitosamente.`);
                setIsCreateModalOpen(false);
                resetCreateForm();
                fetchQuotes();
            } else {
                alert(json.error || 'Error al guardar la cotización.');
            }
        } catch (err) {
            console.error('Error creating quote:', err);
            alert('Error de red al guardar la cotización.');
        }
    };

    const handleExecuteConvert = async () => {
        if (!convertQuote) return;
        setConverting(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/quotes/${convertQuote.id}/convert-to-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_method: convertPaymentMethod })
            });
            const json = await res.json();
            if (json.success) {
                alert(`¡Cotización convertida a Factura ${json.invoice_number} con éxito!`);
                setConvertQuote(null);
                fetchQuotes();
            } else {
                alert(json.error || 'Error al convertir la cotización a factura.');
            }
        } catch (err) {
            console.error('Error converting quote:', err);
            alert('Error de red al convertir la cotización.');
        } finally {
            setConverting(false);
        }
    };

    const handleDeleteQuote = async (id: string, quoteNumber: string) => {
        if (!window.confirm(`¿Estás seguro de eliminar la cotización ${quoteNumber}?`)) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/quotes/${id}`, {
                method: 'DELETE'
            });
            const json = await res.json();
            if (json.success) {
                fetchQuotes();
            } else {
                alert(json.error || 'Error al eliminar cotización.');
            }
        } catch (err) {
            console.error('Error deleting quote:', err);
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
        <div className="space-y-6 text-[#161616] font-sans antialiased">
            {/* Header Editorial Wabi-Sabi */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5">
                <div>
                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
                        VENTAS & PROSPECTOS
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#161616] tracking-tight leading-none">
                        Cotizaciones y Propuestas Comerciales
                    </h2>
                    <p className="text-xs text-[#76746E] mt-2">
                        Genera cotizaciones profesionales, captura prospectos con alta intención de compra y conviértelas a factura en 1 clic.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={fetchQuotes}
                        className="h-9 px-3.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] rounded-none flex items-center justify-center transition cursor-pointer text-xs font-mono font-bold uppercase tracking-wider shadow-xs"
                        title="Refrescar cotizaciones"
                    >
                        <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#D9381E]">refresh</span>
                        Refrescar
                    </button>
                    <button
                        type="button"
                        onClick={() => { resetCreateForm(); setIsCreateModalOpen(true); }}
                        className="h-9 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-mono font-bold px-4 rounded-none flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer border-0 uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        Nueva Cotización
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">COTIZACIONES EMITIDAS</span>
                        <span className="w-8 h-8 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#161616]">
                            <span className="material-symbols-outlined text-[18px]">description</span>
                        </span>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-[#161616] font-mono">{totalCount}</p>
                        <p className="text-[11px] text-[#76746E] mt-0.5">Propuestas comerciales creadas</p>
                    </div>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">MONTO TOTAL COTIZADO</span>
                        <span className="w-8 h-8 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#D9381E]">
                            <span className="material-symbols-outlined text-[18px]">payments</span>
                        </span>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-[#D9381E] font-mono">{formatCOP(totalAmountSum)}</p>
                        <p className="text-[11px] text-[#76746E] mt-0.5">Valor potencial en prospectos</p>
                    </div>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">TASA CONVERSIÓN A VENTA</span>
                        <span className="w-8 h-8 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#137333]">
                            <span className="material-symbols-outlined text-[18px]">trending_up</span>
                        </span>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-[#137333] font-mono">{conversionRate}%</p>
                        <p className="text-[11px] text-[#76746E] mt-0.5">{convertedCount} cotizaciones facturadas</p>
                    </div>
                </div>

                <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">PROSPECTOS CRM</span>
                        <span className="w-8 h-8 bg-[#FAF8F5] border border-[#E2DFD7] flex items-center justify-center text-[#161616]">
                            <span className="material-symbols-outlined text-[18px]">group_add</span>
                        </span>
                    </div>
                    <div className="mt-3">
                        <p className="text-2xl font-bold text-[#161616] font-mono">{quotes.filter(q => q.customer_phone).length}</p>
                        <p className="text-[11px] text-[#76746E] mt-0.5">Leads capturados con teléfono</p>
                    </div>
                </div>
            </div>

            {/* Filter and Search Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-none border border-[#E2DFD7] shadow-xs">
                <div className="relative w-full sm:w-80">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#76746E] pointer-events-none">
                        <span className="material-symbols-outlined text-[18px]">search</span>
                    </span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por N° cotización, cliente o teléfono..."
                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none py-2 pl-9 pr-3 text-xs text-[#161616] placeholder-[#76746E] focus:border-[#161616] outline-none font-mono"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                    {(['all', 'pending', 'converted', 'expired'] as const).map(st => (
                        <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold transition cursor-pointer border uppercase tracking-wider shrink-0 ${
                                statusFilter === st
                                    ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                    : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] hover:bg-white border-[#E2DFD7]'
                            }`}
                        >
                            {st === 'all' ? 'Todas' : st === 'pending' ? 'Pendientes' : st === 'converted' ? 'Convertidas' : 'Vencidas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#E2DFD7] rounded-none overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#FAF8F5] text-[#76746E] font-mono uppercase font-bold border-b border-[#E2DFD7] text-[10px] tracking-wider">
                                <th className="p-3.5">N° Cotización</th>
                                <th className="p-3.5">Cliente / Prospecto</th>
                                <th className="p-3.5">Fecha & Validez</th>
                                <th className="p-3.5">Total</th>
                                <th className="p-3.5 text-center">Estado</th>
                                <th className="p-3.5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2DFD7]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-[#76746E] font-mono uppercase text-xs tracking-wider">
                                        <div className="w-6 h-6 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p>Cargando cotizaciones...</p>
                                    </td>
                                </tr>
                            ) : filteredQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-[#76746E]">
                                        <span className="material-symbols-outlined text-[36px] text-[#76746E]/40 mb-1">request_quote</span>
                                        <p className="font-serif text-sm font-bold text-[#161616]">No se encontraron cotizaciones.</p>
                                        <p className="text-xs text-[#76746E] mt-1">Crea una nueva cotización para registrar prospectos de venta.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotes.map(q => {
                                    const parsedItems: QuoteItem[] = typeof q.items === 'string' ? JSON.parse(q.items) : (q.items || []);
                                    return (
                                        <tr key={q.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                                            <td className="p-3.5">
                                                <div className="font-bold text-[#161616] font-mono flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[#D9381E] text-[16px]">receipt_long</span>
                                                    {q.quote_number}
                                                </div>
                                                <span className="text-[10px] text-[#76746E] font-mono">{parsedItems.length} ítems cotizados</span>
                                            </td>

                                            <td className="p-3.5">
                                                <p className="font-serif font-bold text-[#161616] text-sm">{q.customer_name}</p>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                                                    {q.customer_phone && (
                                                        <a
                                                            href={`https://wa.me/${q.customer_phone.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[#137333] hover:underline flex items-center gap-0.5 font-mono font-bold"
                                                            title="Enviar WhatsApp al prospecto"
                                                        >
                                                            <span className="material-symbols-outlined text-[13px]">chat</span>
                                                            {q.customer_phone}
                                                        </a>
                                                    )}
                                                    {q.customer_document && <span className="text-[#76746E] font-mono">• CC/NIT: {q.customer_document}</span>}
                                                </div>
                                            </td>

                                            <td className="p-3.5 text-[#161616] font-mono">
                                                <p>{new Date(q.created_at).toLocaleDateString('es-CO')}</p>
                                                {q.valid_until && (
                                                    <p className="text-[10px] text-[#D9381E] flex items-center gap-1 mt-0.5 font-bold">
                                                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                        Vence: {new Date(q.valid_until).toLocaleDateString('es-CO')}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="p-3.5 font-mono font-bold text-sm text-[#161616]">
                                                {formatCOP(q.total_amount)}
                                            </td>

                                            <td className="p-3.5 text-center">
                                                {q.status === 'pending' && (
                                                    <span className="px-2.5 py-1 bg-[#FEF7E0] text-[#B45309] border border-[#FDE68A] text-[9px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                                                        Pendiente
                                                    </span>
                                                )}
                                                {q.status === 'converted' && (
                                                    <span className="px-2.5 py-1 bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] text-[9px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                        Facturada
                                                    </span>
                                                )}
                                                {q.status === 'expired' && (
                                                    <span className="px-2.5 py-1 bg-[#FCE8E6] text-[#C5221F] border border-[#FAD2CF] text-[9px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">cancel</span>
                                                        Vencida
                                                    </span>
                                                )}
                                                {q.status === 'cancelled' && (
                                                    <span className="px-2.5 py-1 bg-[#FAF8F5] text-[#76746E] border border-[#E2DFD7] text-[9px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[13px]">cancel</span>
                                                        Cancelada
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-3.5 text-right space-x-1.5">
                                                {q.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConvertQuote(q)}
                                                        className="px-2.5 py-1.5 bg-[#137333] hover:bg-[#0f5b28] text-white font-mono font-bold text-[10px] transition-colors border-0 cursor-pointer shadow-xs inline-flex items-center gap-1 rounded-none uppercase tracking-wider"
                                                        title="Convertir a Factura de Venta real"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">point_of_sale</span>
                                                        Facturar
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => setViewQuote(q)}
                                                    className="p-1.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] rounded-none transition-colors cursor-pointer inline-flex items-center shadow-xs"
                                                    title="Ver e Imprimir Cotización"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteQuote(q.id, q.quote_number)}
                                                    className="p-1.5 bg-white hover:bg-[#FCE8E6] text-[#C5221F] border border-[#E2DFD7] hover:border-[#FAD2CF] rounded-none transition-colors cursor-pointer inline-flex items-center shadow-xs"
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left animate-fade-in">
                    <form onSubmit={handleCreateQuote} className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                            <div>
                                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">PROPUESTA COMERCIAL</span>
                                <h3 className="font-serif text-xl font-bold text-[#161616] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D9381E] text-[22px]">request_quote</span>
                                    Nueva Cotización Comercial
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 hover:bg-[#EAE6DF] border-0 bg-transparent text-[#76746E] hover:text-[#161616] cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Datos del Prospecto / Cliente */}
                        <div className="bg-white border border-[#E2DFD7] p-4 rounded-none space-y-3 shadow-xs">
                            <h4 className="text-[11px] font-mono font-bold text-[#D9381E] uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">person_add</span>
                                Datos del Cliente / Prospecto Comercial
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-[#76746E] font-medium font-mono uppercase">Nombre Completo *</label>
                                    <input
                                        type="text"
                                        required
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Ej: Carlos Mendoza"
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-[#76746E] font-medium font-mono uppercase">Teléfono / WhatsApp *</label>
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Ej: 3001234567"
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none mt-1 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-[#76746E] font-medium font-mono uppercase">Cédula / NIT</label>
                                    <input
                                        type="text"
                                        value={customerDocument}
                                        onChange={(e) => setCustomerDocument(e.target.value)}
                                        placeholder="Ej: 1098765432"
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none mt-1 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-[#76746E] font-medium font-mono uppercase">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="cliente@ejemplo.com"
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Agregar Ítems */}
                        <div className="bg-white border border-[#E2DFD7] p-4 rounded-none space-y-3 shadow-xs">
                            <h4 className="text-[11px] font-mono font-bold text-[#D9381E] uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                                Seleccionar Productos / Servicios
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                                {/* Buscador de producto por Nombre / SKU */}
                                <div className="sm:col-span-5 relative">
                                    <label className="text-[10px] text-[#76746E] font-mono font-bold uppercase">Buscar Artículo / Servicio</label>
                                    <div className="relative mt-1">
                                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#76746E] text-[14px] pointer-events-none">search</span>
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
                                            className={`w-full bg-[#FAF8F5] border rounded-none pl-8 pr-7 py-2 text-xs text-[#161616] focus:border-[#161616] outline-none transition ${
                                                selectedProdId ? 'border-[#161616] bg-white font-bold' : 'border-[#E2DFD7]'
                                            }`}
                                            autoComplete="off"
                                        />
                                        {prodSearchInput && (
                                            <button
                                                type="button"
                                                onClick={() => { setProdSearchInput(''); setSelectedProdId(''); setSelectedProdName(''); setAddCustomPrice(''); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#76746E] hover:text-[#C5221F] border-0 bg-transparent p-0 cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        )}
                                    </div>
                                    {/* Desplegable de sugerencias */}
                                    {prodSearchInput && !selectedProdId && (() => {
                                        const rawQuery = prodSearchInput.trim().toLowerCase();
                                        if (!rawQuery) return null;
                                        const terms = rawQuery.split(/\s+/).filter(Boolean);
                                        const suggestions = products.filter(p => {
                                            const variantsStr = Array.isArray(p.variants)
                                                ? p.variants.map((v: any) => `${v.name || ''} ${v.sku || ''} ${v.options || ''}`).join(' ')
                                                : '';
                                            const fullSearchable = `${p.name || ''} ${p.sku || ''} ${p.brand || ''} ${p.model || ''} ${p.color || ''} ${p.material || ''} ${p.style || ''} ${p.description || ''} ${variantsStr}`.toLowerCase();
                                            return terms.every(term => fullSearchable.includes(term));
                                        }).slice(0, 15);
                                        return (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#161616] rounded-none shadow-2xl z-50 max-h-60 overflow-y-auto">
                                                {suggestions.length === 0 ? (
                                                    <div className="p-3 text-xs text-[#76746E] italic text-center">No hay productos con ese término. Presiona Agregar para crearlo como ítem libre.</div>
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
                                                            className="w-full text-left px-3 py-2.5 hover:bg-[#FAF8F5] flex items-center justify-between gap-2 transition-colors cursor-pointer border-0 bg-transparent border-b border-[#E2DFD7] last:border-0"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-semibold text-[#161616]">{p.name}</p>
                                                                <p className="text-[10px] text-[#76746E]">
                                                                    {p.brand ? <span className="font-semibold text-[#161616]">Marca: {p.brand} • </span> : ''}
                                                                    {p.sku ? `SKU: ${p.sku} • ` : ''}
                                                                    {p.color ? `Color: ${p.color} • ` : ''}
                                                                    {p.material ? `Mat: ${p.material} • ` : ''}
                                                                    Stock: <span className={p.stock > 0 ? "text-[#161616] font-semibold" : "text-[#D9381E] font-bold"}>{p.stock}</span>
                                                                </p>
                                                            </div>
                                                            <span className="text-xs font-bold text-[#D9381E] font-mono shrink-0">${Number(p.price).toLocaleString('es-CO')}</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Precio Unitario editable */}
                                <div className="sm:col-span-3">
                                    <label className="text-[10px] text-[#76746E] font-mono font-bold uppercase">Precio Unit. ($)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={addCustomPrice}
                                        onChange={(e) => setAddCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2 text-xs text-[#161616] text-right font-mono font-bold focus:border-[#161616] outline-none mt-1"
                                    />
                                </div>

                                {/* Cantidad */}
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] text-[#76746E] font-mono font-bold uppercase">Cant.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={addQty}
                                        onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2 text-xs text-[#161616] text-center font-mono font-bold mt-1 focus:border-[#161616] outline-none"
                                    />
                                </div>

                                {/* Desc % */}
                                <div className="sm:col-span-2">
                                    <label className="text-[10px] text-[#76746E] font-mono font-bold uppercase">% Desc.</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={addDiscountPct}
                                        onChange={(e) => setAddDiscountPct(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-none p-2 text-xs text-[#161616] text-center font-mono mt-1 focus:border-[#161616] outline-none"
                                    />
                                </div>
                            </div>

                            {/* Botón Agregar Ítem */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleAddLineItem}
                                    disabled={!selectedProdId && !prodSearchInput.trim()}
                                    className="bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] font-mono font-bold text-xs py-2 px-4 rounded-none transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-xs uppercase tracking-wider"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-[#D9381E]">add_circle</span>
                                    + Agregar Ítem a Cotización
                                </button>
                            </div>

                            {/* Lista de Ítems Agregados con edición en línea */}
                            {lineItems.length > 0 && (
                                <div className="mt-3 border border-[#E2DFD7] rounded-none overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-[#FAF8F5] text-[#76746E] font-mono font-bold uppercase border-b border-[#E2DFD7] text-[10px]">
                                            <tr>
                                                <th className="p-2">Ítem</th>
                                                <th className="p-2 text-center">Cant</th>
                                                <th className="p-2 text-right">Precio Unit ($)</th>
                                                <th className="p-2 text-center">Desc %</th>
                                                <th className="p-2 text-right">Subtotal</th>
                                                <th className="p-2 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#E2DFD7]">
                                            {lineItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-[#FAF8F5]/60">
                                                    <td className="p-2 font-semibold text-[#161616]">
                                                        {item.name}
                                                        {item.sku ? <span className="text-[10px] text-[#76746E] font-mono ml-1">({item.sku})</span> : null}
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
                                                            className="w-16 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none px-1.5 py-1 text-xs text-[#161616] text-center font-mono font-bold focus:border-[#161616] outline-none"
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
                                                            className="w-24 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none px-1.5 py-1 text-xs text-[#161616] text-right font-mono font-bold focus:border-[#161616] outline-none"
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
                                                            className="w-16 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none px-1.5 py-1 text-xs text-[#D9381E] text-center font-mono focus:border-[#161616] outline-none"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-bold text-[#161616]">{formatCOP(item.subtotal)}</td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveLineItem(idx)}
                                                            className="text-[#C5221F] hover:text-[#900] bg-transparent border-0 cursor-pointer p-1"
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
                                <label className="text-[11px] text-[#76746E] font-mono font-medium uppercase">Días de Validez de Oferta</label>
                                <select
                                    value={validDays}
                                    onChange={(e) => setValidDays(parseInt(e.target.value))}
                                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none mt-1 font-mono"
                                >
                                    <option value={7}>7 Días</option>
                                    <option value={15}>15 Días (Recomendado)</option>
                                    <option value={30}>30 Días</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] text-[#76746E] font-mono font-medium uppercase">Asesor Comercial</label>
                                <input
                                    type="text"
                                    value={sellerName}
                                    onChange={(e) => setSellerName(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none mt-1"
                                />
                            </div>
                        </div>

                        {/* Resumen Total */}
                        <div className="bg-white p-4 rounded-none border border-[#E2DFD7] flex justify-between items-center shadow-xs">
                            <span className="text-xs font-mono font-bold uppercase text-[#76746E]">TOTAL COTIZADO</span>
                            <span className="text-2xl font-bold text-[#D9381E] font-mono">{formatCOP(calcTotal)}</span>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="px-4 py-2 bg-white hover:bg-[#FAF8F5] text-[#161616] text-xs font-mono font-bold rounded-none border border-[#E2DFD7] cursor-pointer uppercase tracking-wider"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none transition-colors border-0 cursor-pointer shadow-xs flex items-center gap-1.5 uppercase tracking-wider"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                                Generar Cotización
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}

            {/* Modal: Convertir a Factura */}
            {convertQuote && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left animate-fade-in">
                    <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                            <div>
                                <span className="text-[10px] font-mono tracking-widest text-[#137333] uppercase block font-bold">FACTURACIÓN RÁPIDA</span>
                                <h3 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#137333] text-[22px]">point_of_sale</span>
                                    Convertir Cotización en Factura
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setConvertQuote(null)}
                                className="p-1 hover:bg-[#EAE6DF] border-0 bg-transparent text-[#76746E] hover:text-[#161616] cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="bg-white p-3.5 rounded-none border border-[#E2DFD7] text-xs space-y-1 shadow-xs">
                            <p className="text-[#161616] font-bold font-serif">{convertQuote.quote_number} - {convertQuote.customer_name}</p>
                            <p className="text-[#76746E]">Total a facturar: <strong className="text-[#161616] text-sm font-mono">{formatCOP(convertQuote.total_amount)}</strong></p>
                        </div>

                        <div>
                            <label className="text-xs font-mono font-bold text-[#76746E] uppercase tracking-wider block mb-1">Método de Pago *</label>
                            <select
                                value={convertPaymentMethod}
                                onChange={(e) => setConvertPaymentMethod(e.target.value as any)}
                                className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] focus:border-[#161616] outline-none font-mono font-bold"
                            >
                                <option value="efectivo">Efectivo 💵</option>
                                <option value="transferencia">Transferencia / Nequi / Daviplata 📲</option>
                                <option value="tarjeta">Datáfono / Tarjeta 💳</option>
                                <option value="credito">Crédito / Cuotas 🤝</option>
                            </select>
                        </div>

                        <p className="text-[11px] text-[#B45309] bg-[#FEF7E0] p-3 rounded-none border border-[#FDE68A] leading-relaxed">
                            ℹ️ Al confirmar, el sistema creará la Factura de Venta oficial, descontará el stock de inventario y registrará al cliente.
                        </p>

                        <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                            <button
                                type="button"
                                onClick={() => setConvertQuote(null)}
                                className="px-4 py-2 bg-white hover:bg-[#FAF8F5] text-[#161616] text-xs font-mono font-bold rounded-none border border-[#E2DFD7] cursor-pointer uppercase tracking-wider"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteConvert}
                                disabled={converting}
                                className="px-5 py-2 bg-[#137333] hover:bg-[#0f5b28] text-white font-mono font-bold text-xs rounded-none transition-colors border-0 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 uppercase tracking-wider"
                            >
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                {converting ? 'Facturando...' : 'Confirmar Factura'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal: Vista e Impresión de Cotización */}
            {viewQuote && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left animate-fade-in">
                    <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                            <div>
                                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">VISTA DE DOCUMENTO</span>
                                <h3 className="font-serif text-xl font-bold text-[#161616] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D9381E] text-[22px]">description</span>
                                    Cotización {viewQuote.quote_number}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewQuote(null)}
                                className="p-1 hover:bg-[#EAE6DF] border-0 bg-transparent text-[#76746E] hover:text-[#161616] cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Vista Imprimible / Ticket elegante Wabi-Sabi */}
                        <div className="bg-white p-5 rounded-none border border-[#E2DFD7] space-y-4 text-xs shadow-xs">
                            <div className="flex justify-between items-start border-b border-[#E2DFD7] pb-3">
                                <div>
                                    <h4 className="font-serif font-bold text-sm text-[#161616]">{viewQuote.customer_name}</h4>
                                    <p className="text-[#76746E] font-mono">Tel: {viewQuote.customer_phone || 'N/A'}</p>
                                    <p className="text-[#76746E] font-mono">CC/NIT: {viewQuote.customer_document || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-[#D9381E] font-bold">{viewQuote.quote_number}</p>
                                    <p className="text-[#76746E] font-mono">{new Date(viewQuote.created_at).toLocaleDateString('es-CO')}</p>
                                    <p className="text-[#76746E]">Asesor: {viewQuote.seller_name || 'Comercial'}</p>
                                </div>
                            </div>

                            <table className="w-full text-left text-xs">
                                <thead className="text-[#76746E] font-mono uppercase text-[10px] border-b border-[#E2DFD7]">
                                    <tr>
                                        <th className="py-1.5">Ítem</th>
                                        <th className="py-1.5 text-center">Cant</th>
                                        <th className="py-1.5 text-right">Precio Unit</th>
                                        <th className="py-1.5 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2DFD7]">
                                    {(typeof viewQuote.items === 'string' ? JSON.parse(viewQuote.items) : (viewQuote.items || [])).map((it: QuoteItem, idx: number) => (
                                        <tr key={idx}>
                                            <td className="py-2 text-[#161616] font-medium">{it.name}</td>
                                            <td className="py-2 text-center font-mono">{it.quantity}</td>
                                            <td className="py-2 text-right font-mono">{formatCOP(it.unit_price)}</td>
                                            <td className="py-2 text-right font-mono font-bold text-[#161616]">{formatCOP(it.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="border-t border-[#E2DFD7] pt-3 flex justify-between items-center text-sm">
                                <span className="font-mono font-bold uppercase text-[#76746E]">TOTAL</span>
                                <span className="font-bold text-[#D9381E] font-mono text-lg">{formatCOP(viewQuote.total_amount)}</span>
                            </div>

                            {viewQuote.notes && (
                                <div className="bg-[#FAF8F5] p-2.5 rounded-none border border-[#E2DFD7] text-[11px] text-[#76746E]">
                                    📌 {viewQuote.notes}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2.5">
                            {viewQuote.customer_phone && (
                                <a
                                    href={`https://wa.me/${viewQuote.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${viewQuote.customer_name}, te enviamos la cotización ${viewQuote.quote_number} por un valor de ${formatCOP(viewQuote.total_amount)}. ¡Quedamos atentos a tus comentarios!`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-[#137333] hover:bg-[#0f5b28] text-white font-mono font-bold text-xs rounded-none transition-colors inline-flex items-center gap-1.5 uppercase tracking-wider"
                                >
                                    <span className="material-symbols-outlined text-[16px]">chat</span>
                                    WhatsApp
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-[#161616] hover:bg-[#2c2f35] text-[#F6F4EE] font-mono font-bold text-xs rounded-none transition-colors border-0 cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                            >
                                <span className="material-symbols-outlined text-[16px]">print</span>
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
