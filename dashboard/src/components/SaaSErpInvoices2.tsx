import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface InvoiceItem {
    productId?: string;
    productName: string;
    productSearch: string;
    categoryId?: string;
    quantity: number;
    price: number;
    discountPercentage: number;
    productType?: 'inventory' | 'service';
}

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_phone: string;
    customer_document_type?: string;
    customer_document_number?: string;
    customer_email?: string;
    customer_address?: string;
    total_amount: number;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    due_date?: string;
    payment_method: string;
    transfer_bank?: string;
    transfer_destination_account?: string;
    payment_receipt_url?: string;
    installments_count?: number;
    installment_frequency?: string;
    delivery_method?: string;
    delivery_fee?: number;
    delivery_address?: string;
    delivery_date?: string;
    cufe?: string;
    qr_code_url?: string;
    electronic_status?: string;
    seller_employee_id?: string;
    seller_name?: string;
    created_at: string;
}

interface Product {
    id: string;
    name: string;
    sku?: string;
    price: number;
    stock: number;
    category_id?: string;
    promo_discount?: number;
}

interface Category {
    id: string;
    name: string;
}

interface Employee {
    id: string;
    name: string;
    last_name?: string;
}

interface BankAccount {
    id: string;
    bank_name: string;
    account_number: string;
    account_type: string;
}

interface SaaSErpInvoices2Props {
    clientId: string;
}

export const SaaSErpInvoices2: React.FC<SaaSErpInvoices2Props> = ({ clientId }) => {
    // Principal Data States
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Plan & Electronic Invoicing Status
    const [planStatus, setPlanStatus] = useState<{
        planTier?: string;
        limit?: number;
        used?: number;
        allowed?: boolean;
    }>({});

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modal & Form States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [receiptLightboxUrl, setReceiptLightboxUrl] = useState<string | null>(null);

    // New Invoice Form Data
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerDocType, setCustomerDocType] = useState('CC');
    const [customerDocNumber, setCustomerDocNumber] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [sellerEmployeeId, setSellerEmployeeId] = useState('');
    
    // Items Form Data
    const [items, setItems] = useState<InvoiceItem[]>([
        { productName: '', productSearch: '', quantity: 1, price: 0, discountPercentage: 0 }
    ]);

    // Payment & Delivery Parameters
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta_credito' | 'tarjeta_debito' | 'credito'>('efectivo');
    const [transferBank, setTransferBank] = useState('Bancolombia');
    const [transferCustomBank, setTransferCustomBank] = useState('');
    const [transferDestinationAccount, setTransferDestinationAccount] = useState('');
    const [installmentsCount, setInstallmentsCount] = useState(1);
    const [installmentFrequency, setInstallmentFrequency] = useState('mensual');
    const [abonoInicial, setAbonoInicial] = useState(0);
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });

    const [deliveryMethod, setDeliveryMethod] = useState<'local' | 'domicilio'>('local');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [deliveryAddress, setDeliveryAddress] = useState('');

    // Common Banks List in Colombia
    const bankOptions = [
        'Bancolombia', 'Nequi', 'Daviplata', 'Davivienda', 'Banco de Bogotá', 
        'BBVA', 'Banco Agrario', 'Scotiabank Colpatria', 'Nu Bank', 'Lulo Bank', 
        'Bold / Mercado Pago', '➕ Otro / Banco Extranjero...'
    ];

    // Load initial data safely
    const fetchData = async () => {
        try {
            setLoading(true);
            setFetchError(null);

            const [invRes, prodRes, catRes, bankRes, empRes, planRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/invoices`),
                fetch(`/api/clients/${clientId}/products`),
                fetch(`/api/clients/${clientId}/categories`),
                fetch(`/api/clients/${clientId}/bank-accounts`),
                fetch(`/api/clients/${clientId}/employees`),
                fetch(`/api/clients/${clientId}/plan-status`)
            ]);

            if (invRes.status === 401 || invRes.status === 403 || prodRes.status === 401 || prodRes.status === 403) {
                setFetchError('Tu sesión ha expirado o no tienes permisos suficientes.');
                return;
            }

            const invData = invRes.ok ? await invRes.json() : { success: false };
            const prodData = prodRes.ok ? await prodRes.json() : { success: false };
            const catData = catRes.ok ? await catRes.json() : { success: false };
            const bankData = bankRes.ok ? await bankRes.json() : { success: false };
            const empData = empRes.ok ? await empRes.json() : { success: false };
            const planData = planRes.ok ? await planRes.json() : { success: false };

            if (invData.success) setInvoices(invData.invoices || []);
            if (prodData.success) setProducts(prodData.products || []);
            if (catData.success) setCategories(catData.categories || []);
            if (bankData.success) setBankAccounts(bankData.accounts || []);
            if (empData.success) setEmployees(empData.employees || []);
            if (planData.success) setPlanStatus(planData);
        } catch (err: any) {
            console.error('[Facturación v2] Error cargando datos:', err);
            setFetchError(`Error al cargar datos: ${err?.message || 'Fallo de conexión'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId]);

    // Calculate totals for new invoice
    const calculateTotals = () => {
        let subtotal = 0;
        items.forEach(it => {
            const itemTotal = it.price * it.quantity;
            const discount = itemTotal * ((it.discountPercentage || 0) / 100);
            subtotal += (itemTotal - discount);
        });
        const shipping = deliveryMethod === 'domicilio' ? Number(deliveryFee || 0) : 0;
        const total = subtotal + shipping;
        return { subtotal, shipping, total };
    };

    // Item changes handler
    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        setItems(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const handleAddItem = () => {
        setItems(prev => [...prev, { productName: '', productSearch: '', quantity: 1, price: 0, discountPercentage: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Select product from combobox
    const selectProductForItem = (index: number, product: Product) => {
        setItems(prev => {
            const copy = [...prev];
            copy[index] = {
                ...copy[index],
                productId: product.id,
                productName: product.name,
                productSearch: product.name,
                categoryId: product.category_id || copy[index].categoryId,
                price: Number(product.price),
                discountPercentage: Number(product.promo_discount || 0)
            };
            return copy;
        });
    };

    // Reset Form
    const resetForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerDocType('CC');
        setCustomerDocNumber('');
        setCustomerEmail('');
        setCustomerAddress('');
        setSellerEmployeeId('');
        setItems([{ productName: '', productSearch: '', quantity: 1, price: 0, discountPercentage: 0 }]);
        setPaymentMethod('efectivo');
        setTransferBank('Bancolombia');
        setTransferCustomBank('');
        setTransferDestinationAccount('');
        setInstallmentsCount(1);
        setInstallmentFrequency('mensual');
        setAbonoInicial(0);
        setDeliveryMethod('local');
        setDeliveryFee(0);
        setDeliveryAddress('');
    };

    // Create Invoice Handler
    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0 || !items[0].productName.trim()) {
            alert('Por favor agrega al menos un producto a la venta.');
            return;
        }

        try {
            setSubmitting(true);
            const { total } = calculateTotals();
            const selectedBankName = transferBank === '➕ Otro / Banco Extranjero...' ? transferCustomBank : transferBank;

            const payload = {
                customerName: customerName || 'Cliente Ocasional',
                customerPhone: customerPhone || '',
                customerDocumentType: customerDocType,
                customerDocumentNumber: customerDocNumber || '',
                customerEmail: customerEmail || '',
                customerAddress: customerAddress || '',
                sellerEmployeeId: sellerEmployeeId || null,
                totalAmount: total,
                dueDate: dueDate,
                paymentMethod: paymentMethod,
                transferBank: paymentMethod === 'transferencia' ? selectedBankName : null,
                transferDestinationAccount: paymentMethod === 'transferencia' ? transferDestinationAccount : null,
                installmentsCount: paymentMethod === 'credito' ? Number(installmentsCount) : 1,
                installmentFrequency: paymentMethod === 'credito' ? installmentFrequency : null,
                abono: paymentMethod === 'credito' ? Number(abonoInicial) : 0,
                deliveryMethod: deliveryMethod,
                deliveryFee: deliveryMethod === 'domicilio' ? Number(deliveryFee) : 0,
                deliveryAddress: deliveryMethod === 'domicilio' ? deliveryAddress : null,
                items: items.map(it => ({
                    productId: it.productId || null,
                    productName: it.productName || it.productSearch,
                    quantity: Number(it.quantity),
                    price: Number(it.price),
                    discountPercentage: Number(it.discountPercentage || 0)
                }))
            };

            const res = await fetch(`/api/clients/${clientId}/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            if (json.success) {
                setIsFormOpen(false);
                resetForm();
                fetchData();
            } else {
                alert(`Error al emitir factura: ${json.error || 'Fallo inesperado'}`);
            }
        } catch (err: any) {
            console.error('Error enviando factura:', err);
            alert('Error de conexión al guardar la factura.');
        } finally {
            setSubmitting(false);
        }
    };

    // Mark as paid handler
    const handleMarkAsPaid = async (invoiceId: string) => {
        if (!confirm('¿Confirmas que esta factura ha sido pagada en su totalidad?')) return;
        try {
            setActionLoadingId(invoiceId);
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/pay`, { method: 'PUT' });
            const json = await res.json();
            if (json.success) {
                fetchData();
            } else {
                alert(json.error || 'No se pudo actualizar el pago.');
            }
        } catch (err) {
            console.error('Error pagando factura:', err);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Trigger Electronic Invoice (DIAN)
    const handleGenerateElectronicInvoice = async (invoiceId: string) => {
        if (!confirm('¿Deseas generar la Factura Electrónica DIAN con firma digital y CUFE?')) return;
        try {
            setActionLoadingId(invoiceId);
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/electronic`, { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                alert('¡Factura Electrónica DIAN generada y firmada con éxito!');
                fetchData();
            } else {
                alert(json.error || 'Error al emitir Factura Electrónica DIAN.');
            }
        } catch (err) {
            console.error('Error DIAN electronic invoice:', err);
        } finally {
            setActionLoadingId(null);
        }
    };

    // Filter invoices logic
    const filteredInvoices = invoices.filter(inv => {
        // Status filter
        if (statusFilter === 'paid' && inv.status !== 'paid') return false;
        if (statusFilter === 'pending' && inv.status !== 'pending') return false;
        if (statusFilter === 'overdue' && inv.status !== 'overdue') return false;

        // Date range filter
        if (dateFrom && new Date(inv.created_at) < new Date(dateFrom)) return false;
        if (dateTo && new Date(inv.created_at) > new Date(dateTo + 'T23:59:59')) return false;

        // Search text filter
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            const num = (inv.invoice_number || '').toLowerCase();
            const name = (inv.customer_name || '').toLowerCase();
            const phone = (inv.customer_phone || '').toLowerCase();
            const doc = (inv.customer_document_number || '').toLowerCase();
            return num.includes(q) || name.includes(q) || phone.includes(q) || doc.includes(q);
        }

        return true;
    });

    const totals = calculateTotals();

    return (
        <div className="space-y-6">
            {/* Top Bar / Header */}
            <div className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-on-surface tracking-tight">Facturación & Ventas v2</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/20 text-primary border border-primary/30 uppercase">
                            Módulo Paralelo
                        </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1">
                        Gestión completa de ventas POS, crédito a cuotas, transferencias y Facturación Electrónica DIAN.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {planStatus.planTier && (
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container border border-outline/10 text-xs">
                            <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                            <div>
                                <span className="font-bold text-on-surface uppercase">{planStatus.planTier}</span>
                                <span className="text-[10px] text-on-surface-variant block">
                                    DIAN: {planStatus.used || 0} / {planStatus.limit || '∞'}
                                </span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="bg-primary hover:opacity-90 text-on-primary font-bold text-xs px-5 py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg w-full md:w-auto"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Crear Nueva Factura
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="glass-card p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Search Input */}
                    <div className="relative sm:col-span-2">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por N° factura, cliente, teléfono o cédula..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-surface-container border border-outline/20 rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface focus:border-primary outline-none w-full h-10"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs">
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none h-10 cursor-pointer"
                    >
                        <option value="all">Todas las Facturas</option>
                        <option value="paid">✅ Solo Pagadas</option>
                        <option value="pending">⏳ Pendientes</option>
                        <option value="overdue">🔴 En Mora</option>
                    </select>

                    {/* Date From */}
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none h-10"
                        placeholder="Fecha desde"
                    />
                </div>
            </div>

            {/* Main Table Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-on-surface-variant font-bold animate-pulse">Cargando facturas...</p>
                </div>
            ) : fetchError ? (
                <div className="glass-card p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-red-400">error</span>
                    <p className="text-sm font-semibold text-red-400">{fetchError}</p>
                    <button onClick={fetchData} className="bg-primary text-on-primary text-xs font-bold py-2 px-4 rounded-xl cursor-pointer">
                        Reintentar
                    </button>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">receipt_long</span>
                    <p className="text-sm text-on-surface-variant font-semibold">
                        {invoices.length === 0 ? 'Aún no se han emitido facturas. ¡Crea tu primera factura!' : 'No se encontraron facturas con los filtros seleccionados.'}
                    </p>
                    {searchTerm || statusFilter !== 'all' || dateFrom ? (
                        <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }} className="text-xs text-primary underline cursor-pointer">
                            Limpiar filtros
                        </button>
                    ) : null}
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-surface-container-high/40 text-on-surface-variant border-b border-outline/10 uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="p-3.5">N° Factura</th>
                                    <th className="p-3.5">Fecha</th>
                                    <th className="p-3.5">Cliente</th>
                                    <th className="p-3.5">Vendedor</th>
                                    <th className="p-3.5">Método de Pago</th>
                                    <th className="p-3.5 text-right">Total</th>
                                    <th className="p-3.5 text-center">Estado</th>
                                    <th className="p-3.5 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline/5 text-on-surface">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-surface-container/30 transition-colors">
                                        <td className="p-3.5 font-mono font-bold text-primary">
                                            {inv.invoice_number}
                                            {inv.electronic_status === 'accepted' && (
                                                <span className="ml-1 text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-sans" title="Factura Electrónica DIAN Aceptada">
                                                    DIAN ✓
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-on-surface-variant">
                                            {new Date(inv.created_at).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="p-3.5">
                                            <p className="font-semibold text-on-surface">{inv.customer_name || 'Cliente Ocasional'}</p>
                                            {inv.customer_phone && (
                                                <p className="text-[10px] text-on-surface-variant font-mono">{inv.customer_phone}</p>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-on-surface-variant">
                                            {inv.seller_name || 'Sin asignar'}
                                        </td>
                                        <td className="p-3.5 capitalize">
                                            <span className="px-2 py-0.5 rounded-lg bg-surface-container border border-outline/10 text-[11px]">
                                                {inv.payment_method === 'transferencia' ? `Transferencia (${inv.transfer_bank || 'Banco'})` : inv.payment_method}
                                            </span>
                                            {inv.payment_receipt_url && (
                                                <span className="ml-1 text-[10px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded" title="Comprobante disponible">
                                                    📸
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-right font-mono font-bold text-on-surface">
                                            ${Number(inv.total_amount).toLocaleString('es-CO')}
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                                inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                inv.status === 'overdue' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                                'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            }`}>
                                                {inv.status === 'paid' ? 'Pagada' : inv.status === 'overdue' ? 'En Mora' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => { setSelectedInvoice(inv); setIsDetailModalOpen(true); }}
                                                    className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-primary transition cursor-pointer"
                                                    title="Ver detalle completo"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>

                                                {inv.status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleMarkAsPaid(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition cursor-pointer"
                                                        title="Marcar como pagada"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                                    </button>
                                                )}

                                                <a
                                                    href={`/api/clients/${clientId}/invoices/${inv.id}/pos-print`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant hover:text-primary transition"
                                                    title="Imprimir Tiquete POS 80mm"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">print</span>
                                                </a>

                                                {inv.electronic_status !== 'accepted' && (
                                                    <button
                                                        onClick={() => handleGenerateElectronicInvoice(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 hover:bg-primary/20 text-primary rounded-lg transition cursor-pointer"
                                                        title="Emitir Factura Electrónica DIAN"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Nueva Factura */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="glass-card max-w-4xl w-full p-6 space-y-6 my-8 border border-outline/20 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-4">
                            <h3 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">add_shopping_cart</span>
                                Emisión de Nueva Factura / Venta POS
                            </h3>
                            <button onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvoice} className="space-y-6">
                            {/* Datos del Cliente & Vendedor */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container/30 p-4 rounded-xl border border-outline/10">
                                <div>
                                    <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Nombre Cliente *</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Ej. Juan Pérez"
                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Teléfono WhatsApp</label>
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="Ej. 573001234567"
                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-on-surface-variant block mb-1">Vendedor Asignado</label>
                                    <select
                                        value={sellerEmployeeId}
                                        onChange={(e) => setSellerEmployeeId(e.target.value)}
                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full cursor-pointer"
                                    >
                                        <option value="">-- Sin Vendedor Asignado --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name} {emp.last_name || ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Items / Productos Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Productos / Artículos</h4>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                        + Agregar Producto
                                    </button>
                                </div>

                                {items.map((it, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-surface-container/40 p-3 rounded-xl border border-outline/10">
                                        <div className="md:col-span-5 relative">
                                            <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Artículo del Inventario</label>
                                            <input
                                                type="text"
                                                placeholder={products.length === 0 ? 'Sin productos en inventario...' : `Buscar entre ${products.length} productos...`}
                                                value={it.productSearch}
                                                onChange={(e) => handleItemChange(idx, 'productSearch', e.target.value)}
                                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full"
                                            />
                                            {/* Product Suggestions Dropdown */}
                                            {it.productSearch && !it.productId && (() => {
                                                const matches = products.filter(p => p.name.toLowerCase().includes(it.productSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(it.productSearch.toLowerCase()))).slice(0, 6);
                                                if (matches.length === 0) return null;
                                                return (
                                                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container border border-outline/30 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                                        {matches.map(p => {
                                                            const cat = categories.find(c => c.id === p.category_id);
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    onClick={() => selectProductForItem(idx, p)}
                                                                    className="w-full text-left p-2 hover:bg-primary/10 flex items-center justify-between text-xs cursor-pointer border-b border-outline/5 last:border-0"
                                                                >
                                                                    <div>
                                                                        <p className="font-semibold text-on-surface">{p.name}</p>
                                                                        <p className="text-[10px] text-on-surface-variant">
                                                                            Stock: {p.stock} {cat ? `• ${cat.name}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <span className="font-bold text-primary font-mono">${Number(p.price).toLocaleString('es-CO')}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Cantidad</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={it.quantity}
                                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-center focus:border-primary text-on-surface outline-none w-full"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-3">
                                            <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Precio Unitario ($)</label>
                                            <input
                                                type="number"
                                                value={it.price}
                                                onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full font-mono"
                                                required
                                            />
                                        </div>

                                        <div className="md:col-span-2 flex items-center justify-between gap-2">
                                            <div className="w-full">
                                                <label className="text-[10px] font-bold text-on-surface-variant block mb-1">% Desc.</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={it.discountPercentage}
                                                    onChange={(e) => handleItemChange(idx, 'discountPercentage', e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-center focus:border-primary text-on-surface outline-none w-full"
                                                />
                                            </div>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="text-red-400 hover:text-red-300 p-2 cursor-pointer mt-4"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Method & Delivery Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Método de Pago */}
                                <div className="bg-surface-container/30 p-4 rounded-xl border border-outline/10 space-y-3">
                                    <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">Método de Pago</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full cursor-pointer font-bold"
                                    >
                                        <option value="efectivo">💵 Efectivo (Pago Inmediato)</option>
                                        <option value="transferencia">🏦 Transferencia Bancaria (Bancolombia, Nequi, etc.)</option>
                                        <option value="credito">💳 Crédito a Cuotas / Financiado</option>
                                        <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                                        <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                                    </select>

                                    {/* Transfer Options */}
                                    {paymentMethod === 'transferencia' && (
                                        <div className="space-y-2 pt-2 border-t border-outline/10">
                                            <label className="text-[10px] font-bold text-on-surface-variant block">Banco Origen del Cliente</label>
                                            <select
                                                value={transferBank}
                                                onChange={(e) => setTransferBank(e.target.value)}
                                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full cursor-pointer"
                                            >
                                                {bankOptions.map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                            {transferBank === '➕ Otro / Banco Extranjero...' && (
                                                <input
                                                    type="text"
                                                    placeholder="Nombre del banco o entidad..."
                                                    value={transferCustomBank}
                                                    onChange={(e) => setTransferCustomBank(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full"
                                                />
                                            )}

                                            <label className="text-[10px] font-bold text-on-surface-variant block mt-2">Cuenta Destino de la Empresa</label>
                                            {bankAccounts.length > 0 ? (
                                                <select
                                                    value={transferDestinationAccount}
                                                    onChange={(e) => setTransferDestinationAccount(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full cursor-pointer"
                                                >
                                                    <option value="">-- Seleccionar Cuenta Destino --</option>
                                                    {bankAccounts.map(b => (
                                                        <option key={b.id} value={`${b.bank_name} - ${b.account_type} #${b.account_number}`}>
                                                            {b.bank_name} ({b.account_type}) - #{b.account_number}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Ahorros Bancolombia #1234"
                                                    value={transferDestinationAccount}
                                                    onChange={(e) => setTransferDestinationAccount(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full"
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* Credit / Installments Options */}
                                    {paymentMethod === 'credito' && (
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline/10">
                                            <div>
                                                <label className="text-[10px] font-bold text-on-surface-variant block">N° Cuotas</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="24"
                                                    value={installmentsCount}
                                                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-center focus:border-primary text-on-surface outline-none w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-on-surface-variant block">Frecuencia</label>
                                                <select
                                                    value={installmentFrequency}
                                                    onChange={(e) => setInstallmentFrequency(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full cursor-pointer"
                                                >
                                                    <option value="semanal">Semanal</option>
                                                    <option value="quincenal">Quincenal</option>
                                                    <option value="mensual">Mensual</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Fecha Vencimiento Final</label>
                                                <input
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Despacho / Domicilio */}
                                <div className="bg-surface-container/30 p-4 rounded-xl border border-outline/10 space-y-3">
                                    <label className="text-xs font-bold text-on-surface uppercase tracking-wider block">Entrega / Despacho</label>
                                    <select
                                        value={deliveryMethod}
                                        onChange={(e) => setDeliveryMethod(e.target.value as any)}
                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full cursor-pointer"
                                    >
                                        <option value="local">🏪 Entrega en Tienda / Local</option>
                                        <option value="domicilio">🛵 Domicilio / Envío Mensajería</option>
                                    </select>

                                    {deliveryMethod === 'domicilio' && (
                                        <div className="space-y-2 pt-2 border-t border-outline/10">
                                            <div>
                                                <label className="text-[10px] font-bold text-on-surface-variant block">Costo de Envío ($)</label>
                                                <input
                                                    type="number"
                                                    value={deliveryFee}
                                                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-on-surface-variant block">Dirección de Envío</label>
                                                <input
                                                    type="text"
                                                    value={deliveryAddress}
                                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                                    placeholder="Calle, carrera, apto..."
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Totals Summary & Submit Button */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline/10 pt-4">
                                <div className="text-left">
                                    <p className="text-xs text-on-surface-variant">Subtotal: <span className="font-mono font-bold text-on-surface">${totals.subtotal.toLocaleString('es-CO')}</span></p>
                                    {totals.shipping > 0 && <p className="text-xs text-on-surface-variant">Envío: <span className="font-mono font-bold text-on-surface">${totals.shipping.toLocaleString('es-CO')}</span></p>}
                                    <p className="text-lg font-black text-primary font-mono mt-1">Total: ${totals.total.toLocaleString('es-CO')}</p>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold px-4 py-3 rounded-xl cursor-pointer w-full sm:w-auto"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-primary hover:opacity-90 text-on-primary text-xs font-bold px-6 py-3 rounded-xl shadow-lg cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2"
                                    >
                                        {submitting ? 'Emitiendo Factura...' : 'Emitir Factura Ahora'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalle 360° Factura */}
            {isDetailModalOpen && selectedInvoice && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-card max-w-2xl w-full p-6 space-y-4 border border-outline/20 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <div>
                                <h3 className="text-base font-extrabold text-on-surface font-mono">
                                    Factura {selectedInvoice.invoice_number}
                                </h3>
                                <p className="text-[11px] text-on-surface-variant">
                                    Emitida el {new Date(selectedInvoice.created_at).toLocaleString('es-CO')}
                                </p>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div className="bg-surface-container/30 p-3 rounded-xl space-y-1">
                                <p className="font-bold text-on-surface-variant uppercase text-[10px]">Cliente</p>
                                <p className="font-semibold text-on-surface">{selectedInvoice.customer_name || 'Cliente Ocasional'}</p>
                                <p className="text-on-surface-variant font-mono">{selectedInvoice.customer_phone}</p>
                            </div>
                            <div className="bg-surface-container/30 p-3 rounded-xl space-y-1">
                                <p className="font-bold text-on-surface-variant uppercase text-[10px]">Detalles de Pago</p>
                                <p className="capitalize text-on-surface">Método: <span className="font-bold">{selectedInvoice.payment_method}</span></p>
                                <p className="font-mono font-bold text-primary text-sm">${Number(selectedInvoice.total_amount).toLocaleString('es-CO')}</p>
                            </div>
                        </div>

                        {selectedInvoice.payment_receipt_url && (
                            <div className="bg-surface-container/30 p-3 rounded-xl space-y-2">
                                <p className="font-bold text-on-surface-variant uppercase text-[10px]">Soporte de Transferencia</p>
                                <button
                                    onClick={() => setReceiptLightboxUrl(selectedInvoice.payment_receipt_url!)}
                                    className="text-xs text-primary underline flex items-center gap-1 cursor-pointer"
                                >
                                    📷 Abrir comprobante a pantalla completa
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end pt-3 border-t border-outline/10">
                            <button onClick={() => setIsDetailModalOpen(false)} className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox para Comprobante */}
            {receiptLightboxUrl && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setReceiptLightboxUrl(null)}>
                    <div className="relative max-w-3xl max-h-[90vh]">
                        <img src={receiptLightboxUrl} alt="Comprobante" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
                        <button onClick={() => setReceiptLightboxUrl(null)} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full text-xs">
                            ✕ Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
