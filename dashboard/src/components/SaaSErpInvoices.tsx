import React, { useState, useEffect, useRef } from 'react';
import { authFetch as fetch } from '../utils/api';

interface Invoice {
    id: string;
    invoice_number: string;
    customer_name: string;
    customer_phone: string;
    customer_document_type: string;
    customer_document_number: string;
    customer_email: string;
    customer_address: string | null;
    total_amount: string;
    status: 'pending' | 'paid' | 'overdue';
    due_date: string;
    reminder_sent: boolean;
    overdue_sent: boolean;
    payment_method?: string;
    installments_count?: number;
    installment_frequency?: string | null;
    delivery_method: string;
    delivery_fee: string;
    delivery_address: string | null;
    delivery_date: string | null;
    delivery_status: string;
    created_at: string;
}

interface Product {
    id: string;
    name: string;
    price: string;
    stock: number;
    sku?: string | null;
    promo_discount?: string | null;
}

interface InvoiceItemInput {
    productId: string;
    quantity: number;
    price: number;
    discountPercentage: number;
    productType: 'inventory' | 'lens';
    productName: string;
    lensDesign: string;
    lensMaterial: string;
    lensTreatment: string;
}

interface SaaSErpInvoicesProps {
    clientId: string;
}

export const SaaSErpInvoices: React.FC<SaaSErpInvoicesProps> = ({ clientId }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
    const [clientProfile, setClientProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Form fields
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerDocumentType, setCustomerDocumentType] = useState('CC');
    const [customerDocumentNumber, setCustomerDocumentNumber] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    
    // Condiciones de Pago
    const [paymentMethod, setPaymentMethod] = useState<'contado' | 'tarjeta' | 'cuotas'>('contado');
    const [installmentsCount, setInstallmentsCount] = useState<number>(1);
    const [installmentFrequency, setInstallmentFrequency] = useState<'semanal' | 'quincenal' | 'mensual'>('mensual');
    const [abono, setAbono] = useState('0'); // Abono inicial
    const [dueDate, setDueDate] = useState('');

    // Logística de Entrega
    const [deliveryMethod, setDeliveryMethod] = useState<'local' | 'domicilio'>('local');
    const [deliveryFee, setDeliveryFee] = useState('0');
    const [differentDeliveryAddress, setDifferentDeliveryAddress] = useState(false);
    const [altDeliveryAddress, setAltDeliveryAddress] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');

    // Form Items (inicializado con 1 fila vacía por defecto)
    const [selectedItems, setSelectedItems] = useState<InvoiceItemInput[]>([{
        productId: '',
        quantity: 1,
        price: 0,
        discountPercentage: 0,
        productType: 'inventory',
        productName: '',
        lensDesign: '',
        lensMaterial: '',
        lensTreatment: ''
    }]);

    const [barcodeScanInput, setBarcodeScanInput] = useState('');
    const [activeDropdownField, setActiveDropdownField] = useState<'name' | 'document' | 'phone' | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, prodRes, crmRes, clientRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/invoices`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/crm-customers`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const invData = await invRes.json();
            const prodData = await prodRes.json();
            const crmData = await crmRes.json();
            const clientData = await clientRes.json();

            if (invData.success) setInvoices(invData.invoices || []);
            if (prodData.success) setProducts(prodData.products || []);
            if (crmData.success) setCrmCustomers(crmData.customers || []);
            if (clientData.success) setClientProfile(clientData.data || null);
        } catch (err) {
            console.error("Error loading billing data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const today = new Date().toISOString().split('T')[0];
        setDueDate(today);
        setInvoiceNumber(`F-${Math.floor(1000 + Math.random() * 9000)}`);
    }, [clientId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdownField(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Calcular fecha de vencimiento según la frecuencia elegida
    useEffect(() => {
        if (paymentMethod === 'cuotas') {
            const date = new Date();
            if (installmentFrequency === 'semanal') {
                date.setDate(date.getDate() + installmentsCount * 7);
            } else if (installmentFrequency === 'quincenal') {
                date.setDate(date.getDate() + installmentsCount * 15);
            } else {
                date.setMonth(date.getMonth() + installmentsCount);
            }
            setDueDate(date.toISOString().split('T')[0]);
        } else {
            setDueDate(new Date().toISOString().split('T')[0]);
        }
    }, [paymentMethod, installmentsCount, installmentFrequency]);

    const handleAddItem = () => {
        setSelectedItems([...selectedItems, {
            productId: '',
            quantity: 1,
            price: 0,
            discountPercentage: 0,
            productType: 'inventory',
            productName: '',
            lensDesign: '',
            lensMaterial: '',
            lensTreatment: ''
        }]);
    };

    const handleRemoveItem = (index: number) => {
        const copy = [...selectedItems];
        copy.splice(index, 1);
        setSelectedItems(copy);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItemInput, value: any) => {
        const copy = [...selectedItems];
        const item = { ...copy[index] };

        if (field === 'productId') {
            item.productId = value;
            const selectedProd = products.find(p => p.id === value);
            if (selectedProd) {
                item.productName = selectedProd.name;
                item.price = parseFloat(selectedProd.price);
                item.discountPercentage = selectedProd.promo_discount ? parseFloat(selectedProd.promo_discount) : 0;
            }
        } else if (field === 'productType') {
            item.productType = value;
            item.productId = '';
            item.productName = value === 'lens' ? 'Lente de Laboratorio' : '';
            item.price = 0;
            item.discountPercentage = 0;
        } else if (field === 'quantity') {
            item.quantity = Math.max(1, parseInt(value) || 1);
        } else if (field === 'price') {
            item.price = Math.max(0, parseFloat(value) || 0);
        } else if (field === 'discountPercentage') {
            item.discountPercentage = Math.max(0, Math.min(100, parseFloat(value) || 0));
        } else {
            (item as any)[field] = value;
        }

        copy[index] = item;
        setSelectedItems(copy);
    };

    const getItemSubtotal = (item: InvoiceItemInput) => {
        const base = item.price * item.quantity;
        const disc = base * ((item.discountPercentage || 0) / 100);
        return base - disc;
    };

    const totalAmount = selectedItems.reduce((acc, curr) => acc + getItemSubtotal(curr), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedItems.length === 0 || selectedItems.some(i => i.productType === 'inventory' && !i.productId)) {
            alert('Por favor selecciona un producto válido en todas las líneas de detalle.');
            return;
        }

        // Double confirmation for discounts > 50%
        for (const item of selectedItems) {
            if (item.discountPercentage > 50) {
                const name = item.productType === 'lens' ? 'Lente' : (products.find(p => p.id === item.productId)?.name || 'Producto');
                const confirm1 = confirm(`⚠️ ADVERTENCIA: Has colocado un descuento del ${item.discountPercentage}% (más del 50%) para "${name}". ¿Deseas aplicar este descuento?`);
                if (!confirm1) return;
                const confirm2 = confirm(`❗ RE-CONFIRMACIÓN: ¿Seguro que autorizas el descuento especial de ${item.discountPercentage}% para "${name}"?`);
                if (!confirm2) return;
            }
        }

        // Apply discount percentage directly to unit price sent to the database
        const itemsPayload = selectedItems.map(item => ({
            productId: item.productId || null,
            productType: item.productType,
            productName: item.productName || (products.find(p => p.id === item.productId)?.name) || 'Producto',
            quantity: item.quantity,
            price: item.price * (1 - (item.discountPercentage || 0) / 100),
            lensDesign: item.productType === 'lens' ? item.lensDesign : null,
            lensMaterial: item.productType === 'lens' ? item.lensMaterial : null,
            lensTreatment: item.productType === 'lens' ? item.lensTreatment : null
        }));

        const body = {
            invoiceNumber,
            customerName,
            customerPhone,
            customerDocumentType,
            customerDocumentNumber,
            customerEmail,
            customerAddress,
            totalAmount,
            dueDate,
            paymentMethod,
            installmentsCount: paymentMethod === 'cuotas' ? installmentsCount : 1,
            installmentFrequency: paymentMethod === 'cuotas' ? installmentFrequency : null,
            abono: paymentMethod === 'cuotas' ? parseFloat(abono) || 0 : 0,
            deliveryMethod,
            deliveryFee: deliveryMethod === 'domicilio' ? parseFloat(deliveryFee) || 0 : 0,
            deliveryAddress: (deliveryMethod === 'domicilio' && differentDeliveryAddress) ? altDeliveryAddress : customerAddress,
            deliveryDate: deliveryMethod === 'domicilio' ? deliveryDate : null,
            items: itemsPayload
        };

        try {
            const res = await fetch(`/api/clients/${clientId}/invoices`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                fetchData();
                resetForm();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al registrar la factura.');
        }
    };

    const resetForm = () => {
        setInvoiceNumber(`F-${Math.floor(1000 + Math.random() * 9000)}`);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerDocumentNumber('');
        setCustomerEmail('');
        setCustomerAddress('');
        setPaymentMethod('contado');
        setInstallmentsCount(1);
        setInstallmentFrequency('mensual');
        setAbono('0');
        setDeliveryMethod('local');
        setDeliveryFee('0');
        setDifferentDeliveryAddress(false);
        setAltDeliveryAddress('');
        setDeliveryDate('');
        setSelectedItems([{
            productId: '',
            quantity: 1,
            price: 0,
            discountPercentage: 0,
            productType: 'inventory',
            productName: '',
            lensDesign: '',
            lensMaterial: '',
            lensTreatment: ''
        }]);
        setBarcodeScanInput('');
        setIsFormOpen(false);
    };

    const handlePrintInvoice = async (invoice: Invoice) => {
        try {
            // Obtener detalles completos de la factura (con items y cuotas)
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoice.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (!json.success || !json.data) {
                alert('No se pudieron obtener los detalles de la factura para impresión.');
                return;
            }

            const data = json.data;
            const printWindow = window.open('', '_blank', 'width=600,height=800');
            if (!printWindow) return;

            const itemsHtml = (data.items || []).map((it: any) => {
                const desc = it.product_type === 'lens'
                    ? `Lente Lab (${it.lens_design || 'N/A'}, ${it.lens_material || 'N/A'}, ${it.lens_treatment || 'N/A'})`
                    : (it.inventory_name || it.product_name || 'Producto');
                return `
                    <tr>
                        <td style="padding:3px 0;">${it.quantity}</td>
                        <td style="padding:3px 0;">${desc}</td>
                        <td style="padding:3px 0;text-align:right;">$${Math.round(parseFloat(it.price) * it.quantity).toLocaleString('es-CO')}</td>
                    </tr>
                `;
            }).join('');

            const installmentsHtml = (data.installments && data.installments.length > 0)
                ? `
                    <div style="margin-top:10px; border-top:1px dashed #000; padding-top:5px;">
                        <div style="font-weight:bold; text-align:center; font-size:10px; margin-bottom:5px;">PLAN DE CUOTAS</div>
                        <table style="width:100%; font-size:9px;">
                            ${data.installments.map((inst: any) => {
                                const due = new Date(inst.due_date).toLocaleDateString('es-CO');
                                return `
                                    <tr>
                                        <td>Cuota #${inst.installment_number} (${due})</td>
                                        <td style="text-align:right;">$${Math.round(parseFloat(inst.amount)).toLocaleString('es-CO')}</td>
                                        <td style="text-align:right; font-weight:bold; color:${inst.status === 'paid' ? 'green' : 'red'};">
                                            ${inst.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </table>
                    </div>
                ` : '';

            const subtotal = parseFloat(data.total_amount);
            const fee = parseFloat(data.delivery_fee || '0');
            const total = subtotal + fee;

            printWindow.document.write(`
                <html>
                <head>
                    <title>Factura ${data.invoice_number}</title>
                    <style>
                        @page { size: 80mm auto; margin: 0; }
                        body { width: 70mm; font-family: 'Courier New', Courier, monospace; font-size: 10px; padding: 3mm; box-sizing: border-box; color: #000; background: #fff; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .border-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                        .margin-t { margin-top: 8px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { font-size: 9px; vertical-align: top; }
                    </style>
                </head>
                <body>
                    <div class="text-center font-bold" style="font-size: 12px; text-transform: uppercase;">${clientProfile?.name || 'Díaz Lab'}</div>
                    <div class="text-center">${clientProfile?.nit ? 'NIT: ' + clientProfile.nit : ''}</div>
                    <div class="text-center">${clientProfile?.address || ''}</div>
                    <div class="text-center">${clientProfile?.phoneNumber ? 'Tel: ' + clientProfile.phoneNumber : ''}</div>
                    
                    <div class="border-b margin-t"></div>
                    <div><strong>FACTURA:</strong> ${data.invoice_number}</div>
                    <div><strong>FECHA:</strong> ${new Date(data.created_at).toLocaleString('es-CO')}</div>
                    <div><strong>CLIENTE:</strong> ${data.customer_name}</div>
                    <div><strong>C.C./NIT:</strong> ${data.customer_document_number}</div>
                    <div><strong>TEL:</strong> ${data.customer_phone}</div>
                    
                    <div class="border-b margin-t"></div>
                    <table>
                        <thead>
                            <tr style="border-bottom:1px dashed #000; font-weight:bold;">
                                <th style="text-align:left; width:10%;">Cant</th>
                                <th style="text-align:left; width:65%;">Detalle</th>
                                <th style="text-align:right; width:25%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <div class="border-b margin-t"></div>
                    <div class="text-right">SUBTOTAL: $${Math.round(subtotal).toLocaleString('es-CO')}</div>
                    ${fee > 0 ? `<div class="text-right">ENVÍO: $${Math.round(fee).toLocaleString('es-CO')}</div>` : ''}
                    <div class="text-right font-bold" style="font-size:11px;">TOTAL: $${Math.round(total).toLocaleString('es-CO')}</div>
                    
                    ${installmentsHtml}

                    <div class="border-b margin-t"></div>
                    <div class="text-center" style="font-size: 8px; white-space: pre-wrap; margin-top: 8px;">
                        ${clientProfile?.invoiceFooter || 'Garantía legal según normatividad vigente.'}
                    </div>
                    <div class="text-center margin-t" style="font-weight:bold;">¡Gracias por su confianza!</div>
                    
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (err) {
            console.error(err);
            alert('Error al abrir la ventana de impresión.');
        }
    };

    const handleTriggerCollection = async (invoiceId: string) => {
        try {
            setActionLoadingId(invoiceId);
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/trigger-collection`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                alert('🚀 Cobro enviado exitosamente por WhatsApp.');
                fetchData();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al disparar el cobro por WhatsApp.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handlePayInvoice = async (invoiceId: string) => {
        if (!confirm('¿Deseas registrar el pago total de esta factura y pasar su estado a Pagado?')) return;
        try {
            setActionLoadingId(invoiceId);
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/pay`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                fetchData();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al registrar el pago.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const scannedSku = barcodeScanInput.trim();
            if (!scannedSku) return;

            const matchedProd = products.find(p => p.sku && p.sku.toUpperCase() === scannedSku.toUpperCase());
            if (matchedProd) {
                const existingIndex = selectedItems.findIndex(item => item.productType === 'inventory' && item.productId === matchedProd.id);
                if (existingIndex > -1) {
                    const copy = [...selectedItems];
                    copy[existingIndex].quantity += 1;
                    setSelectedItems(copy);
                } else {
                    // Si la primera fila está vacía, la reemplazamos
                    if (selectedItems.length === 1 && !selectedItems[0].productId && selectedItems[0].productType === 'inventory') {
                        setSelectedItems([{
                            productId: matchedProd.id,
                            productType: 'inventory',
                            productName: matchedProd.name,
                            quantity: 1,
                            price: parseFloat(matchedProd.price),
                            discountPercentage: matchedProd.promo_discount ? parseFloat(matchedProd.promo_discount) : 0,
                            lensDesign: '',
                            lensMaterial: '',
                            lensTreatment: ''
                        }]);
                    } else {
                        setSelectedItems([...selectedItems, {
                            productId: matchedProd.id,
                            productType: 'inventory',
                            productName: matchedProd.name,
                            quantity: 1,
                            price: parseFloat(matchedProd.price),
                            discountPercentage: matchedProd.promo_discount ? parseFloat(matchedProd.promo_discount) : 0,
                            lensDesign: '',
                            lensMaterial: '',
                            lensTreatment: ''
                        }]);
                    }
                }
                setBarcodeScanInput('');
            } else {
                alert(`Producto con SKU/Código "${scannedSku}" no encontrado.`);
                setBarcodeScanInput('');
            }
        }
    };

    const formatPrice = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0
        }).format(num);
    };

    const getFilteredCustomers = (queryStr: string) => {
        const query = queryStr.toLowerCase().trim();
        if (!query) return crmCustomers;
        return crmCustomers.filter(c => {
            const fullName = `${c.name} ${c.last_name || ''}`.toLowerCase();
            return fullName.includes(query) || 
                   (c.document_number && c.document_number.includes(query)) ||
                   (c.phone && c.phone.includes(query));
        });
    };

    const selectCustomer = (c: any) => {
        const fullName = c.last_name ? `${c.name} ${c.last_name}` : c.name;
        setCustomerName(fullName);
        setCustomerPhone(c.phone || '');
        setCustomerDocumentType(c.document_type || 'CC');
        setCustomerDocumentNumber(c.document_number || '');
        setCustomerEmail(c.email || '');
        setCustomerAddress(c.address || '');
        setActiveDropdownField(null);
    };

    const renderSuggestions = (queryStr: string, currentFieldVal: string, onSelectNew: () => void) => {
        const filtered = getFilteredCustomers(queryStr);
        return (
            <div className="absolute left-0 right-0 top-[76px] bg-surface-container border border-outline/30 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-outline/5">
                {filtered.length === 0 ? (
                    <div className="p-3 text-xs text-on-surface-variant italic text-center bg-surface-container">
                        No se encontraron coincidencias.
                    </div>
                ) : (
                    filtered.map(c => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left p-3 hover:bg-primary/10 text-xs text-on-surface font-medium flex justify-between items-center transition-colors cursor-pointer border-0 bg-transparent"
                        >
                            <div className="truncate pr-2">
                                <p className="font-semibold text-on-surface truncate">{c.name} {c.last_name || ''}</p>
                                <p className="text-[10px] text-on-surface-variant opacity-75 truncate">{c.email || 'Sin correo'} • {c.phone}</p>
                            </div>
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold font-mono uppercase shrink-0">
                                {c.document_type || 'CC'}: {c.document_number}
                            </span>
                        </button>
                    ))
                )}
                {currentFieldVal.trim() !== '' && (
                    <button
                        type="button"
                        onClick={onSelectNew}
                        className="w-full text-left p-3 hover:bg-secondary/15 text-xs text-secondary font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border-0 bg-transparent border-t border-outline/10"
                    >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        Registrar como cliente nuevo: "{currentFieldVal}"
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Ventas y Facturación</h2>
                    <p className="text-xs text-on-surface-variant">Emite facturas al instante, configura despachos e imprime recibos de 80mm.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsFormOpen(true); }}
                    className="bg-primary hover:opacity-90 text-on-primary text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Crear Factura
                </button>
            </div>

            {isFormOpen && (
                <div className="glass-card p-6 space-y-4">
                    <h3 className="text-sm font-semibold tracking-tight text-on-surface">Generar Nueva Factura</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Datos del cliente */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" ref={dropdownRef}>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-on-surface-variant font-medium">Factura N° *</label>
                                <input type="text" className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
                            </div>
                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs text-on-surface-variant font-medium">Nombre del Cliente *</label>
                                <input 
                                    type="text" 
                                    className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition w-full" 
                                    value={customerName} 
                                    onChange={(e) => {
                                        setCustomerName(e.target.value);
                                        setActiveDropdownField('name');
                                    }}
                                    onFocus={() => setActiveDropdownField('name')}
                                    placeholder="Buscar por nombre o cédula..."
                                    required 
                                />
                                {activeDropdownField === 'name' && renderSuggestions(customerName, customerName, () => setActiveDropdownField(null))}
                            </div>
                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs text-on-surface-variant font-medium">Documento de Identidad *</label>
                                <div className="flex gap-1">
                                    <select className="bg-surface-container border border-outline/20 rounded-xl px-2 text-xs focus:border-primary outline-none text-on-surface" value={customerDocumentType} onChange={(e) => setCustomerDocumentType(e.target.value)}>
                                        <option value="CC" className="bg-surface-container">CC</option>
                                        <option value="NIT" className="bg-surface-container">NIT</option>
                                        <option value="CE" className="bg-surface-container">CE</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                        value={customerDocumentNumber} 
                                        onChange={(e) => {
                                            setCustomerDocumentNumber(e.target.value);
                                            setActiveDropdownField('document');
                                        }} 
                                        onFocus={() => setActiveDropdownField('document')}
                                        placeholder="Número..."
                                        required 
                                    />
                                </div>
                                {activeDropdownField === 'document' && renderSuggestions(customerDocumentNumber, customerDocumentNumber, () => setActiveDropdownField(null))}
                            </div>
                            <div className="flex flex-col gap-1.5 relative">
                                <label className="text-xs text-on-surface-variant font-medium">WhatsApp *</label>
                                <input 
                                    type="text" 
                                    className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition w-full" 
                                    value={customerPhone} 
                                    onChange={(e) => {
                                        setCustomerPhone(e.target.value);
                                        setActiveDropdownField('phone');
                                    }} 
                                    onFocus={() => setActiveDropdownField('phone')}
                                    placeholder="57300..."
                                    required 
                                />
                                {activeDropdownField === 'phone' && renderSuggestions(customerPhone, customerPhone, () => setActiveDropdownField(null))}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-on-surface-variant font-medium">Correo Electrónico *</label>
                                <input type="email" className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-on-surface-variant font-medium">Dirección de Residencia</label>
                                <input type="text" className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                            </div>
                        </div>

                        {/* Condiciones de Pago */}
                        <div className="border border-outline/10 p-4 rounded-xl space-y-3 bg-surface-container/10">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">payments</span>
                                Condiciones y Método de Pago
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-on-surface-variant font-medium">Método de Pago *</label>
                                    <select 
                                        className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                        value={paymentMethod} 
                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                        required
                                    >
                                        <option value="contado">Contado</option>
                                        <option value="tarjeta">Tarjeta Débito / Crédito</option>
                                        <option value="cuotas">Venta Financiada (Cuotas)</option>
                                    </select>
                                </div>

                                {paymentMethod === 'cuotas' && (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Abono Inicial ($) *</label>
                                            <input 
                                                type="number" 
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                                value={abono} 
                                                onChange={(e) => setAbono(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Número de Cuotas *</label>
                                            <input 
                                                type="number" 
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                                value={installmentsCount} 
                                                onChange={(e) => setInstallmentsCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Frecuencia de Cobro *</label>
                                            <select 
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                                value={installmentFrequency} 
                                                onChange={(e) => setInstallmentFrequency(e.target.value as any)}
                                                required
                                            >
                                                <option value="semanal">Semanal</option>
                                                <option value="quincenal">Quincenal</option>
                                                <option value="mensual">Mensual</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Logística de Despacho */}
                        <div className="border border-outline/10 p-4 rounded-xl space-y-3 bg-surface-container/10">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                                Despacho y Logística
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-on-surface-variant font-medium">Modalidad de Entrega</label>
                                    <select 
                                        className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                        value={deliveryMethod} 
                                        onChange={(e) => setDeliveryMethod(e.target.value as any)}
                                    >
                                        <option value="local">Retiro en Local</option>
                                        <option value="domicilio">Despacho a Domicilio</option>
                                    </select>
                                </div>

                                {deliveryMethod === 'domicilio' && (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Costo de Domicilio ($)</label>
                                            <input 
                                                type="number" 
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                                value={deliveryFee} 
                                                onChange={(e) => setDeliveryFee(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Fecha Estimada de Entrega</label>
                                            <input 
                                                type="date" 
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                                value={deliveryDate} 
                                                onChange={(e) => setDeliveryDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-6">
                                            <input 
                                                type="checkbox" 
                                                id="diffAddress"
                                                checked={differentDeliveryAddress}
                                                onChange={(e) => setDifferentDeliveryAddress(e.target.checked)}
                                                className="w-4 h-4 cursor-pointer"
                                            />
                                            <label htmlFor="diffAddress" className="text-xs text-on-surface font-medium cursor-pointer">
                                                Dirección Alternativa
                                            </label>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {deliveryMethod === 'domicilio' && differentDeliveryAddress && (
                                <div className="flex flex-col gap-1.5 pt-2">
                                    <label className="text-xs text-on-surface-variant font-medium">Dirección de Entrega Alternativa</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ej. Oficina de trabajo, dirección de familiar..."
                                        className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition" 
                                        value={altDeliveryAddress} 
                                        onChange={(e) => setAltDeliveryAddress(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Items / Detalle */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Detalle de la Venta</h4>
                                <button type="button" onClick={handleAddItem} className="bg-surface-container border border-outline/20 hover:bg-surface-container-high text-[11px] font-semibold py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer text-on-surface">
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    Agregar Línea
                                </button>
                            </div>

                            {/* Barcode Fast Scanner */}
                            <div className="bg-surface-container/30 border border-outline/10 p-4 rounded-xl flex flex-col md:flex-row items-center gap-3 justify-between">
                                <div className="flex items-center gap-2 text-primary">
                                    <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
                                    <div className="text-left">
                                        <p className="text-xs font-semibold text-on-surface">Lector de Códigos de Barras</p>
                                        <p className="text-[10px] text-on-surface-variant">Dispara tu lector para cargar productos físicos de stock al instante</p>
                                    </div>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Escanear SKU..."
                                    value={barcodeScanInput}
                                    onChange={(e) => setBarcodeScanInput(e.target.value)}
                                    onKeyDown={handleBarcodeScan}
                                    className="bg-surface-container border border-outline/20 rounded-lg py-1.5 px-3 text-xs text-on-surface focus:border-primary outline-none w-full md:w-64 font-mono uppercase"
                                />
                            </div>

                            {selectedItems.map((item, index) => (
                                <div key={index} className="bg-surface-container/40 p-4 rounded-xl border border-outline/10 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        
                                        {/* Tipo de Producto */}
                                        <div className="md:col-span-3 flex flex-col gap-1">
                                            <label className="text-[10px] text-on-surface-variant font-bold">Tipo de Artículo</label>
                                            <select 
                                                value={item.productType} 
                                                onChange={(e) => handleItemChange(index, 'productType', e.target.value as any)}
                                                className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary outline-none text-on-surface"
                                            >
                                                <option value="inventory">📦 Producto en Stock (Monturas, Estuches)</option>
                                                <option value="lens">🧪 Lente Formulada (Laboratorio Bajo Demanda)</option>
                                            </select>
                                        </div>

                                        {/* Selector / Input de Producto */}
                                        <div className="md:col-span-4 flex flex-col gap-1">
                                            <label className="text-[10px] text-on-surface-variant font-bold">Nombre del Artículo</label>
                                            {item.productType === 'lens' ? (
                                                <input 
                                                    type="text" 
                                                    value={item.productName} 
                                                    onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                                    placeholder="ej. Monofocal CR-39 Antirreflejo"
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none"
                                                    required
                                                />
                                            ) : (
                                                <select 
                                                    value={item.productId} 
                                                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)} 
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary outline-none text-on-surface" 
                                                    required
                                                >
                                                    <option value="">-- Selecciona del Inventario --</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} {p.sku ? `[${p.sku}]` : ''} (Stock: {p.stock} uds) - {formatPrice(p.price)}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="md:col-span-1 flex flex-col gap-1">
                                            <label className="text-[10px] text-on-surface-variant font-bold text-center">Cant.</label>
                                            <input type="number" min={1} className="bg-surface-container text-center border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none w-full" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required />
                                        </div>
                                        
                                        <div className="md:col-span-2 flex flex-col gap-1">
                                            <label className="text-[10px] text-on-surface-variant font-bold">Precio Unit.</label>
                                            <input 
                                                type="number" 
                                                className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none w-full font-mono font-bold" 
                                                value={item.price} 
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                                                readOnly={item.productType === 'inventory' && !item.productId}
                                                required 
                                            />
                                        </div>
                                        
                                        <div className="md:col-span-1 flex flex-col gap-1">
                                            <label className="text-[10px] text-on-surface-variant font-bold text-center">% Desc.</label>
                                            <input type="number" min={0} max={100} className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs focus:border-primary text-on-surface outline-none w-full text-center" value={item.discountPercentage} onChange={(e) => handleItemChange(index, 'discountPercentage', e.target.value)} />
                                        </div>

                                        <div className="md:col-span-1 flex justify-center pb-1">
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveItem(index)} 
                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer border-0"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Campos adicionales exclusivos para Lentes Oftálmicos formulados */}
                                    {item.productType === 'lens' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-surface-container/30 rounded-xl border border-outline/5 text-xs">
                                            <div className="space-y-1">
                                                <label className="text-on-surface-variant text-[10px] font-bold">Diseño del Lente</label>
                                                <select
                                                    value={item.lensDesign}
                                                    onChange={e => handleItemChange(index, 'lensDesign', e.target.value)}
                                                    className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="">-- Selecciona --</option>
                                                    <option value="Monofocal">Monofocal</option>
                                                    <option value="Bifocal">Bifocal (Flattop)</option>
                                                    <option value="Progresivo">Progresivo (Multifocal)</option>
                                                    <option value="Ocupacional">Ocupacional / Office</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-on-surface-variant text-[10px] font-bold">Material del Lente</label>
                                                <select
                                                    value={item.lensMaterial}
                                                    onChange={e => handleItemChange(index, 'lensMaterial', e.target.value)}
                                                    className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="">-- Selecciona --</option>
                                                    <option value="CR-39">CR-39 (Resina Básica 1.50)</option>
                                                    <option value="Policarbonato">Policarbonato (Resistente 1.59)</option>
                                                    <option value="Alto Indice">Alto Índice (Sleek/Ultrathin 1.67 / 1.74)</option>
                                                    <option value="Trivex">Trivex (Máxima Claridad 1.53)</option>
                                                    <option value="Vidrio">Vidrio (Mineral)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-on-surface-variant text-[10px] font-bold">Tratamientos Filtros</label>
                                                <select
                                                    value={item.lensTreatment}
                                                    onChange={e => handleItemChange(index, 'lensTreatment', e.target.value)}
                                                    className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-on-surface outline-none cursor-pointer"
                                                >
                                                    <option value="">-- Selecciona --</option>
                                                    <option value="Blanco">Blanco (Sin tratamiento)</option>
                                                    <option value="AR">Antirreflejo Estándar (AR)</option>
                                                    <option value="Blue Block">Filtro de Luz Azul (Blue Cut / UV)</option>
                                                    <option value="Transitions">Transitions / Fotocromático (AR)</option>
                                                    <option value="Polarizado">Polarizado (Solar)</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Total y Botones */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-outline/10 pt-4">
                            <div className="text-left">
                                <p className="text-xs text-on-surface-variant">Subtotal Factura: {formatPrice(totalAmount)}</p>
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                    Domicilio: {deliveryMethod === 'domicilio' ? formatPrice(parseFloat(deliveryFee) || 0) : '$0'}
                                </p>
                                <p className="text-xl font-bold text-[#00ff88]">
                                    Total: {formatPrice(totalAmount + (deliveryMethod === 'domicilio' ? parseFloat(deliveryFee) || 0 : 0))}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={resetForm} className="bg-surface-container border border-outline/20 hover:bg-surface-container-high text-xs font-semibold py-2 px-4 rounded-xl transition cursor-pointer text-on-surface">
                                    Cancelar
                                </button>
                                <button type="submit" className="bg-primary hover:opacity-90 text-on-primary text-xs font-semibold py-2 px-4 rounded-xl transition cursor-pointer">
                                    Emitir Factura
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : invoices.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-sm text-on-surface-variant">No hay facturas o cobros registrados en la base de datos aún.</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-semibold">
                                <th className="p-4">Factura / Cliente</th>
                                <th className="p-4">WhatsApp</th>
                                <th className="p-4">Monto</th>
                                <th className="p-4">Despacho</th>
                                <th className="p-4">Vence</th>
                                <th className="p-4">Estado / Notif.</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline/10 text-sm">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-surface-container/40 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-on-surface text-xs font-mono bg-surface-container py-1 px-2 rounded-lg border border-outline/10">
                                                {inv.invoice_number}
                                            </span>
                                            <div>
                                                <p className="font-semibold text-on-surface">{inv.customer_name}</p>
                                                <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5 font-medium">
                                                    <span className="material-symbols-outlined text-[12px] opacity-75">payments</span>
                                                    {inv.payment_method === 'contado' ? 'Contado' :
                                                     inv.payment_method === 'tarjeta' ? 'Tarjeta Débito/Crédito' :
                                                     `Financiación (${inv.installments_count} cuotas)`}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-on-surface-variant">+{inv.customer_phone}</td>
                                    <td className="p-4 font-semibold text-on-surface">
                                        {formatPrice(parseFloat(inv.total_amount) + parseFloat(inv.delivery_fee || '0'))}
                                    </td>
                                    <td className="p-4 text-xs text-on-surface-variant font-medium">
                                        <div className="flex items-center gap-1 uppercase text-[9px] font-bold">
                                            <span className="material-symbols-outlined text-[14px]">
                                                {inv.delivery_method === 'domicilio' ? 'local_shipping' : 'storefront'}
                                            </span>
                                            {inv.delivery_method === 'domicilio' ? `Envío (${inv.delivery_status})` : 'Local'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-medium text-on-surface-variant">
                                        {new Date(inv.due_date).toLocaleDateString('es-CO')}
                                    </td>
                                    <td className="p-4 space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                                inv.status === 'paid' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                inv.status === 'overdue' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {inv.status === 'paid' ? 'Pagado' : inv.status === 'overdue' ? 'Mora' : 'Pendiente'}
                                            </span>
                                        </div>
                                        {inv.payment_method === 'cuotas' && (
                                            <div className="flex gap-2 text-[10px] text-on-surface-variant font-mono">
                                                <span>Rec.: {inv.reminder_sent ? '✅' : '❌'}</span>
                                                <span>Mora: {inv.overdue_sent ? '✅' : '❌'}</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {inv.status !== 'paid' && (
                                                <>
                                                    <button 
                                                        onClick={() => handlePayInvoice(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition cursor-pointer flex items-center justify-center disabled:opacity-40"
                                                        title="Registrar Pago"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleTriggerCollection(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition cursor-pointer flex items-center justify-center disabled:opacity-40"
                                                        title="Enviar Cobro por WhatsApp"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">send</span>
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handlePrintInvoice(inv)}
                                                className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition cursor-pointer flex items-center justify-center"
                                                title="Imprimir Recibo Térmico (80mm)"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">print</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
