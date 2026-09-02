import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    transfer_bank?: string | null;
    transfer_destination_account?: string | null;
    payment_receipt_url?: string | null;
    installments_count?: number;
    installment_frequency?: string | null;
    delivery_method: string;
    delivery_fee: string;
    delivery_address: string | null;
    delivery_date: string | null;
    delivery_status: string;
    created_at: string;
    cufe?: string | null;
    qr_code_url?: string | null;
    electronic_status?: string | null;
    seller_employee_id?: string | null;
    seller_name?: string | null;
}

interface Product {
    id: string;
    name: string;
    price: string;
    stock: number;
    sku?: string | null;
    promo_discount?: string | null;
    category_id?: string | null;
}

interface InvoiceItemInput {
    productId: string;
    variantId?: string;
    variantName?: string;
    categoryId: string;
    productSearch: string;
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

export const SaaSErpInvoices: React.FC<SaaSErpInvoicesProps> = ({ clientId: rawClientId }) => {
    const clientId = (rawClientId && rawClientId !== 'undefined')
        ? rawClientId
        : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
    const [clientProfile, setClientProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Filtros de búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
    const [sellerFilter, setSellerFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Modal de Detalle Completo de Factura
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [receiptInputUrl, setReceiptInputUrl] = useState('');
    const [isUpdatingReceipt, setIsUpdatingReceipt] = useState(false);

    // Lightbox modal para ver foto del comprobante grande
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Estado del Plan SaaS y Modal de Upgrade (Feature Gating)
    const [planStatus, setPlanStatus] = useState<any>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [generatingElectronicId, setGeneratingElectronicId] = useState<string | null>(null);

    // Form fields
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerDocumentType, setCustomerDocumentType] = useState('CC');
    const [customerDocumentNumber, setCustomerDocumentNumber] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    
    // Condiciones de Pago
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta_credito' | 'tarjeta_debito' | 'credito'>('efectivo');
    const [transferBank, setTransferBank] = useState('');
    const [transferBankSelect, setTransferBankSelect] = useState('');
    const [customTransferBank, setCustomTransferBank] = useState('');
    const [transferDestinationAccount, setTransferDestinationAccount] = useState('');
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [installmentsCount, setInstallmentsCount] = useState<number | string>(1);
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
        categoryId: '',
        productSearch: '',
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
    const [employees, setEmployees] = useState<any[]>([]);
    const [dropdownRef] = [useRef<HTMLDivElement>(null)];

    // Campos específicos para Restaurantes & Gastronomía
    const [tables, setTables] = useState<any[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<string>('');
    const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
    const [taxMode, setTaxMode] = useState<'impoconsumo_8' | 'iva_19' | 'exento'>('impoconsumo_8');
    const [includeTip, setIncludeTip] = useState(true);
    const [tipPercentage, setTipPercentage] = useState<number>(10);

    const fetchData = async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const [invRes, prodRes, catRes, crmRes, clientRes, bankRes, empRes, tblRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/invoices`),
                fetch(`/api/clients/${clientId}/products`),
                fetch(`/api/clients/${clientId}/categories`),
                fetch(`/api/clients/${clientId}/crm-customers`),
                fetch(`/api/clients/${clientId}`),
                fetch(`/api/clients/${clientId}/bank-accounts`),
                fetch(`/api/clients/${clientId}/employees`),
                fetch(`/api/clients/${clientId}/restaurant/tables`)
            ]);

            // Detect authentication failures
            if (invRes.status === 401 || invRes.status === 403 || prodRes.status === 401 || prodRes.status === 403) {
                setFetchError('Tu sesión ha expirado o no tienes permisos. Por favor recarga la página e inicia sesión nuevamente.');
                return;
            }

            const invData = invRes.ok ? await invRes.json() : { success: false };
            const prodData = prodRes.ok ? await prodRes.json() : { success: false };
            const catData = catRes.ok ? await catRes.json() : { success: false };
            const crmData = crmRes.ok ? await crmRes.json() : { success: false };
            const clientData = clientRes.ok ? await clientRes.json() : { success: false };
            const bankData = bankRes.ok ? await bankRes.json() : { success: false };
            const empData = empRes.ok ? await empRes.json() : { success: false };
            const tblData = tblRes.ok ? await tblRes.json() : { success: false };

            if (invData.success) setInvoices(invData.invoices || []);
            else if (invData.error) console.warn('[Facturas] Error API:', invData.error);
            if (prodData.success) setProducts(prodData.products || []);
            else if (prodData.error) console.warn('[Productos] Error API:', prodData.error);
            if (catData.success) setCategories(catData.categories || []);
            if (crmData.success) setCrmCustomers(crmData.customers || []);
            if (clientData.success) setClientProfile(clientData.data || null);
            if (bankData.success) setBankAccounts(bankData.accounts || []);
            if (empData.success) setEmployees(empData.employees || []);
            if (tblData.success) setTables(tblData.tables || []);
        } catch (err: any) {
            console.error("Error loading billing data:", err);
            setFetchError(`Error al cargar datos de facturación: ${err?.message || 'Error de red'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignSellerToInvoice = async (invoiceId: string, sellerEmployeeId: string) => {
        try {
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/seller`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ seller_employee_id: sellerEmployeeId })
            });
            const json = await res.json();
            if (json.success) {
                setSelectedInvoice(prev => prev ? { ...prev, seller_employee_id: json.seller_employee_id, seller_name: json.seller_name } : null);
                setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, seller_employee_id: json.seller_employee_id, seller_name: json.seller_name } : inv));
                alert('✅ Vendedor reasignado exitosamente a la factura.');
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (e) {
            alert('Error al reasignar el vendedor a la factura.');
        }
    };

    useEffect(() => {
        fetchData();
        fetchPlanStatus();
        const today = new Date().toISOString().split('T')[0];
        setDueDate(today);
        setInvoiceNumber(`F-${Math.floor(1000 + Math.random() * 9000)}`);
    }, [clientId]);

    const fetchPlanStatus = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/plan-status`);
            const data = await res.json();
            if (data.success) {
                setPlanStatus(data);
            }
        } catch (err) {
            console.error("Error cargando estado del plan:", err);
        }
    };

    const handleGenerateElectronicInvoice = async (invoiceId: string) => {
        try {
            setGeneratingElectronicId(invoiceId);
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoiceId}/electronic`, {
                method: 'POST'
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (data.planUpgradeRequired) {
                    setShowUpgradeModal(true);
                } else {
                    alert(`Error: ${data.error}`);
                }
                return;
            }

            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, cufe: data.cufe, qr_code_url: data.qrCodeUrl, electronic_status: 'accepted' } : inv));
            if (selectedInvoice && selectedInvoice.id === invoiceId) {
                setSelectedInvoice(prev => prev ? { ...prev, cufe: data.cufe, qr_code_url: data.qrCodeUrl, electronic_status: 'accepted' } : null);
            }

            fetchPlanStatus();

            let channelsMsg = '';
            if (data.whatsappSent && data.emailSent) {
                channelsMsg = '\n\n📲 Documento PDF enviado de inmediato a WhatsApp y ✉️ Correo Electrónico del cliente.';
            } else if (data.whatsappSent) {
                channelsMsg = '\n\n📲 Documento PDF enviado de inmediato a WhatsApp del cliente.';
            } else if (data.emailSent) {
                channelsMsg = '\n\n✉️ Notificación enviada al Correo Electrónico del cliente.';
            }

            alert(`⚡ ¡Factura Electrónica DIAN emitida exitosamente con CUFE SHA-384 y QR Fiscal!${channelsMsg}`);
        } catch (err: any) {
            alert(`Error procesando factura electrónica: ${err.message}`);
        } finally {
            setGeneratingElectronicId(null);
        }
    };

    const handlePrintPOS = (invoiceId: string) => {
        window.open(`/api/clients/${clientId}/invoices/${invoiceId}/pos-print`, '_blank', 'width=400,height=600');
    };

    const handleSendInvoiceWhatsApp = (invoice: Invoice) => {
        if (!invoice.customer_phone) {
            alert('El cliente no posee un número de teléfono de WhatsApp registrado en esta factura.');
            return;
        }
        const cleanPhone = invoice.customer_phone.replace(/[^0-9]/g, '');
        const message = `Hola ${invoice.customer_name || 'Cliente'}! 📄 Te compartimos el resumen de tu Factura #${invoice.invoice_number} por un valor total de ${formatPrice(parseFloat(invoice.total_amount))}.\n\nPara consultar o descargar el detalle de tu compra, puedes ingresar a nuestro portal: ${window.location.origin}\n\n¡Gracias por tu compra!`;
        const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const handleSendInvoiceEmail = (invoice: Invoice) => {
        if (!invoice.customer_email) {
            alert('El cliente no posee una dirección de correo electrónico registrada en esta factura.');
            return;
        }
        const subject = `Factura #${invoice.invoice_number} - ${clientProfile?.name || 'Comprobante de Venta'}`;
        const body = `Hola ${invoice.customer_name || 'Cliente'},\n\nAdjuntamos el resumen de tu Factura #${invoice.invoice_number}.\n\nDetalles de la transacción:\n- Factura N°: ${invoice.invoice_number}\n- Fecha de Emisión: ${new Date(invoice.created_at || Date.now()).toLocaleDateString('es-CO')}\n- Total Facturado: ${formatPrice(parseFloat(invoice.total_amount))}\n- Estado: ${invoice.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}\n\n¡Gracias por elegirnos!`;
        const mailtoUrl = `mailto:${invoice.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
    };

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

    useEffect(() => {
        if (paymentMethod === 'credito') {
            const count = typeof installmentsCount === 'string' ? (parseInt(installmentsCount, 10) || 0) : installmentsCount;
            const date = new Date();
            if (installmentFrequency === 'semanal') {
                date.setDate(date.getDate() + count * 7);
            } else if (installmentFrequency === 'quincenal') {
                date.setDate(date.getDate() + count * 15);
            } else {
                date.setMonth(date.getMonth() + count);
            }
            setDueDate(date.toISOString().split('T')[0]);
        } else {
            setDueDate(new Date().toISOString().split('T')[0]);
        }
    }, [paymentMethod, installmentsCount, installmentFrequency]);

    const handleAddItem = () => {
        setSelectedItems([...selectedItems, {
            productId: '',
            categoryId: '',
            productSearch: '',
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
        setSelectedItems((prev) => {
            const copy = [...prev];
            const item = { ...copy[index] };

            if (field === 'productId') {
                item.productId = value;
                const selectedProd = products.find(p => p.id === value);
                if (selectedProd) {
                    item.productName = selectedProd.name;
                    item.productSearch = selectedProd.name;
                    item.categoryId = selectedProd.category_id || item.categoryId;
                    item.price = parseFloat(selectedProd.price);
                    item.discountPercentage = selectedProd.promo_discount ? parseFloat(selectedProd.promo_discount) : 0;
                }
            } else if (field === 'categoryId') {
                item.categoryId = value;
                item.productId = '';
                item.productName = '';
                item.productSearch = '';
                item.price = 0;
                item.discountPercentage = 0;
            } else if (field === 'productType') {
                item.productType = 'inventory';
                item.productId = '';
                item.productName = '';
                item.productSearch = '';
                item.price = 0;
                item.discountPercentage = 0;
            } else if (field === 'quantity') {
                item.quantity = Math.max(1, parseInt(value) || 1);
            } else if (field === 'price') {
                item.price = Math.max(0, parseFloat(value) || 0);
            } else if (field === 'discountPercentage') {
                item.discountPercentage = Math.max(0, Math.min(100, parseFloat(value) || 0));
            } else if (field === 'productSearch') {
                item.productSearch = value;
                const currentSelectedName = products.find(p => p.id === item.productId)?.name || '';
                if (!value.trim() || (item.productId && value.trim() !== currentSelectedName)) {
                    item.productId = '';
                    item.productName = '';
                    item.price = 0;
                    item.discountPercentage = 0;
                }
            } else {
                (item as any)[field] = value;
            }

            copy[index] = item;
            return copy;
        });
    };

    const getItemSubtotal = (item: InvoiceItemInput) => {
        const base = item.price * item.quantity;
        const disc = base * ((item.discountPercentage || 0) / 100);
        return base - disc;
    };

    const subtotalItems = selectedItems.reduce((acc, curr) => acc + getItemSubtotal(curr), 0);
    const taxRate = clientProfile?.category === 'restaurante'
        ? (taxMode === 'impoconsumo_8' ? 0.08 : (taxMode === 'iva_19' ? 0.19 : 0))
        : 0;
    const taxAmount = subtotalItems * taxRate;
    const tipAmount = (clientProfile?.category === 'restaurante' && includeTip)
        ? subtotalItems * (tipPercentage / 100)
        : 0;
    const totalAmount = subtotalItems + taxAmount + tipAmount;

    const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const code = barcodeScanInput.trim();
            if (!code) return;
            try {
                const res = await fetch(`/api/clients/${clientId}/products/sku/${encodeURIComponent(code)}`);
                const data = await res.json();
                if (data.success && data.product) {
                    const prod = data.product;
                    const displayName = prod.variant_name ? `${prod.name} (${prod.variant_name})` : prod.name;
                    const newItem: InvoiceItemInput = {
                        productId: prod.id,
                        variantId: prod.variant_id || undefined,
                        variantName: prod.variant_name || undefined,
                        categoryId: prod.category_id || '',
                        productSearch: displayName,
                        productName: displayName,
                        quantity: 1,
                        price: parseFloat(prod.price) || 0,
                        discountPercentage: prod.promo_discount ? parseFloat(prod.promo_discount) : 0,
                        productType: 'inventory',
                        lensDesign: '',
                        lensMaterial: '',
                        lensTreatment: ''
                    };
                    setSelectedItems(prev => {
                        if (prev.length === 1 && !prev[0].productId && !prev[0].productName) {
                            return [newItem];
                        }
                        return [...prev, newItem];
                    });
                    setBarcodeScanInput('');
                } else {
                    alert(`Código SKU/Barras "${code}" no encontrado en inventario.`);
                }
            } catch (err: any) {
                alert(`Error escaneando producto: ${err.message}`);
            }
        }
    };

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
            variantId: item.variantId || null,
            variantName: item.variantName || null,
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
            transferBank: paymentMethod === 'transferencia' ? transferBank : null,
            transferDestinationAccount: paymentMethod === 'transferencia' ? transferDestinationAccount : null,
            installmentsCount: paymentMethod === 'credito' ? (parseInt(String(installmentsCount)) || 1) : 1,
            installmentFrequency: paymentMethod === 'credito' ? installmentFrequency : null,
            abono: paymentMethod === 'credito' ? parseFloat(abono) || 0 : 0,
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
                    'Content-Type': 'application/json'
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
        setPaymentMethod('efectivo');
        setTransferBank('');
        setTransferBankSelect('');
        setCustomTransferBank('');
        setTransferDestinationAccount('');
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
            categoryId: '',
            productSearch: '',
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

    const handleOpenInvoiceDetail = async (inv: Invoice) => {
        setSelectedInvoice(inv);
        setInvoiceDetail(null);
        setReceiptInputUrl(inv.payment_receipt_url || '');
        setLoadingDetail(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/invoices/${inv.id}`);
            const json = await res.json();
            if (json.success && json.data) {
                setInvoiceDetail(json.data);
            }
        } catch (e) {
            console.error("Error al obtener detalle de factura:", e);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleSaveReceiptUrl = async () => {
        if (!selectedInvoice) return;
        setIsUpdatingReceipt(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/invoices/${selectedInvoice.id}/receipt`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ payment_receipt_url: receiptInputUrl })
            });
            const json = await res.json();
            if (json.success) {
                setSelectedInvoice(prev => prev ? { ...prev, payment_receipt_url: receiptInputUrl } : null);
                setInvoices(prev => prev.map(i => i.id === selectedInvoice.id ? { ...i, payment_receipt_url: receiptInputUrl } : i));
                alert('✅ Comprobante de pago actualizado con éxito.');
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (e) {
            alert('Error al guardar la imagen del comprobante.');
        } finally {
            setIsUpdatingReceipt(false);
        }
    };

    // Lógica de filtrado de facturas
    const filteredInvoices = invoices.filter(inv => {
        const term = searchTerm.toLowerCase().trim();
        if (term) {
            const matchName = inv.customer_name?.toLowerCase().includes(term);
            const matchPhone = inv.customer_phone?.includes(term);
            const matchDoc = inv.customer_document_number?.includes(term);
            const matchInv = inv.invoice_number?.toLowerCase().includes(term);
            const matchEmail = inv.customer_email?.toLowerCase().includes(term);
            if (!matchName && !matchPhone && !matchDoc && !matchInv && !matchEmail) return false;
        }

        if (statusFilter !== 'all') {
            const s = (inv.status || '').toLowerCase();
            if (statusFilter === 'paid' && !(s === 'paid' || s === 'pagada' || s === 'completed' || s === 'activa')) return false;
            if (statusFilter === 'pending' && !(s === 'pending' || s === 'pendiente' || s === 'draft')) return false;
            if (statusFilter === 'overdue' && !(s === 'overdue' || s === 'mora' || s === 'vencida')) return false;
        }

        if (sellerFilter !== 'all') {
            const isMatch = inv.seller_employee_id === sellerFilter || (inv as any).employee_id === sellerFilter || (inv as any).created_by_user_id === sellerFilter;
            if (!isMatch) return false;
        }

        if (dateFrom) {
            const dFrom = new Date(`${dateFrom}T00:00:00`);
            const invDate = new Date(inv.created_at || inv.due_date);
            if (!isNaN(invDate.getTime()) && invDate < dFrom) return false;
        }
        if (dateTo) {
            const dTo = new Date(`${dateTo}T23:59:59`);
            const invDate = new Date(inv.created_at || inv.due_date);
            if (!isNaN(invDate.getTime()) && invDate > dTo) return false;
        }

        const total = parseFloat(inv.total_amount || '0') + parseFloat(inv.delivery_fee || '0');
        if (minAmount && total < parseFloat(minAmount)) return false;
        if (maxAmount && total > parseFloat(maxAmount)) return false;

        return true;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSellerFilter('all');
        setDateFrom('');
        setDateTo('');
        setMinAmount('');
        setMaxAmount('');
    };

    const handlePrintInvoice = async (invoice: Invoice) => {
        try {
            // Obtener detalles completos de la factura (con items y cuotas)
            const res = await fetch(`/api/clients/${clientId}/invoices/${invoice.id}`);
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
                method: 'POST'
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
                method: 'PUT'
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
        <div className="space-y-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-extrabold text-[#eab308]" style={{ color: '#eab308' }}>VENTAS Y FACTURACIÓN ELECTRÓNICA DIAN</h2>
                    <p className="text-xs text-gray-400">Emite facturas POS y Electrónicas DIAN con CUFE, QR fiscal y tiquetes térmicos 80mm.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="bg-[#181a1c] hover:bg-[#222528] text-white border border-[#2d3036] text-[11px] font-bold py-1.5 px-3 rounded-md flex items-center gap-1 transition cursor-pointer shadow"
                    >
                        <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
                        Planes & Upgrade
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="bg-[#eab308] hover:bg-amber-300 text-black text-[11px] font-extrabold py-1.5 px-3 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow"
                    >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        CREAR FACTURA
                    </button>
                </div>
            </div>

            {/* METRICAS Y PROGRESO DE FACTURACIÓN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tarjeta Ventas Totales */}
                <div className="bg-[#141517] border border-[#222428] p-5 rounded-lg flex flex-col justify-between shadow-md">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-xs uppercase tracking-wider flex items-center gap-2" style={{ color: '#eab308' }}>
                            <span className="material-symbols-outlined text-[18px]">payments</span>
                            VENTAS TOTALES
                        </p>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1a170a] border border-amber-500/40 font-mono font-bold" style={{ color: '#eab308' }}>Suma de facturación</span>
                    </div>
                    <div className="mt-3">
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
                            ${invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-gray-400 text-xs mt-1">Total acumulado de ventas facturadas</p>
                    </div>
                </div>

                {/* Tarjeta Plan & DIAN Quota */}
                {planStatus && (
                    <div className="bg-[#141517] border border-[#222428] p-5 rounded-lg flex flex-col justify-between shadow-md">
                        <div className="flex items-center justify-between">
                            <p className="font-bold text-xs uppercase tracking-wider flex items-center gap-2" style={{ color: '#eab308' }}>
                                <span className="material-symbols-outlined text-[18px]">verified</span>
                                PLAN ACTUAL & DIAN
                            </p>
                            <span className="text-xs font-extrabold uppercase text-[#eab308]" style={{ color: '#eab308' }}>
                                {planStatus.planTier === 'enterprise' ? '👑 Enterprise IA' : planStatus.planTier === 'pro' ? '🚀 Pro' : '🟢 Básico'}
                            </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-2">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
                                    {planStatus.used || 0} <span className="text-sm font-sans text-gray-400 font-normal">/ {planStatus.limit >= 99999 ? '∞' : (planStatus.limit || 10)}</span>
                                </h2>
                                <p className="text-gray-400 text-xs mt-1">Facturas electrónicas DIAN emitidas este mes</p>
                            </div>
                            {planStatus.planTier === 'basic' && (
                                <button
                                    type="button"
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="bg-[#eab308] hover:bg-amber-300 text-black font-extrabold text-[11px] px-3 py-1.5 rounded-md transition shadow flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
                                    Upgrade Pro
                                </button>
                            )}
                        </div>
                    </div>
                )}
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

                        {/* Configuración Específica de Restaurantes & Gastronomía */}
                        {clientProfile?.category === 'restaurante' && (
                            <div className="border border-primary/20 p-4 rounded-2xl space-y-3 bg-primary/5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">restaurant</span>
                                    Servicio Gastronómico: Mesa, Impoconsumo 8% & Propina Sugerida
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-on-surface-variant font-bold">Mesa de Servicio</label>
                                        <select
                                            className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-semibold outline-none focus:border-primary cursor-pointer"
                                            value={selectedTableId}
                                            onChange={(e) => setSelectedTableId(e.target.value)}
                                        >
                                            <option value="">🛒 Venta Directa (Barra / Para Llevar)</option>
                                            {tables.map(t => (
                                                <option key={t.id} value={t.id}>
                                                    🪑 Mesa #{t.table_number} ({t.zone})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-on-surface-variant font-bold">Mesero Atribuidor</label>
                                        <select
                                            className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-semibold outline-none focus:border-primary cursor-pointer"
                                            value={selectedWaiterId}
                                            onChange={(e) => setSelectedWaiterId(e.target.value)}
                                        >
                                            <option value="">👤 Sin mesero asignado</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>
                                                    👤 {emp.name} ({emp.employee_role || 'Mesero'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-on-surface-variant font-bold">Impuesto Gastronómico (E.T. Colombia)</label>
                                        <select
                                            className="bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none focus:border-primary cursor-pointer text-primary"
                                            value={taxMode}
                                            onChange={(e) => setTaxMode(e.target.value as any)}
                                        >
                                            <option value="impoconsumo_8">🏷️ Impoconsumo (8% E.T.) [Restaurantes]</option>
                                            <option value="iva_19">🏷️ IVA (19%) [Franquicias/Concesiones]</option>
                                            <option value="exento">🛡️ Exento de Impuestos (RST)</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1.5 justify-center">
                                        <label className="text-xs text-on-surface-variant font-bold">💵 Propina Sugerida (Ley 1935)</label>
                                        <div className="flex items-center gap-2 pt-1">
                                            <input
                                                type="checkbox"
                                                id="includeTipCheck"
                                                checked={includeTip}
                                                onChange={(e) => setIncludeTip(e.target.checked)}
                                                className="w-4 h-4 text-primary rounded cursor-pointer"
                                            />
                                            <label htmlFor="includeTipCheck" className="text-xs font-bold text-on-surface cursor-pointer flex items-center gap-1">
                                                <span>Incluir</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="30"
                                                    value={tipPercentage}
                                                    onChange={(e) => setTipPercentage(parseFloat(e.target.value) || 0)}
                                                    className="w-12 bg-surface border border-outline/20 rounded px-1 py-0.5 text-xs text-center font-bold text-primary outline-none"
                                                />
                                                <span>% Voluntario</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                        <option value="efectivo">💵 Efectivo</option>
                                        <option value="transferencia">🏦 Transferencia Bancaria</option>
                                        <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                                        <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                                        <option value="credito">📋 Crédito (por cuotas)</option>
                                    </select>
                                </div>

                                {paymentMethod === 'transferencia' && (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Banco del Cliente (Origen)</label>
                                            <select
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                value={transferBankSelect}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setTransferBankSelect(val);
                                                    if (val !== 'otro') {
                                                        setTransferBank(val);
                                                    } else {
                                                        setTransferBank(customTransferBank);
                                                    }
                                                }}
                                            >
                                                <option value="">-- Seleccionar Banco Origen --</option>
                                                <option value="Bancolombia">Bancolombia</option>
                                                <option value="Nequi">Nequi</option>
                                                <option value="Daviplata">Daviplata</option>
                                                <option value="Davivienda">Davivienda</option>
                                                <option value="Banco de Bogotá">Banco de Bogotá</option>
                                                <option value="BBVA">BBVA</option>
                                                <option value="Banco Agrario">Banco Agrario</option>
                                                <option value="Scotiabank Colpatria">Scotiabank Colpatria</option>
                                                <option value="Banco Popular">Banco Popular</option>
                                                <option value="Banco AV Villas">Banco AV Villas</option>
                                                <option value="Banco Itaú">Banco Itaú</option>
                                                <option value="Nu Bank">Nu Bank</option>
                                                <option value="Lulo Bank">Lulo Bank</option>
                                                <option value="RappiPay">RappiPay</option>
                                                <option value="Bold / Mercado Pago">Bold / Mercado Pago</option>
                                                <option value="otro">➕ Otro / Banco Extranjero...</option>
                                            </select>

                                            {transferBankSelect === 'otro' && (
                                                <input 
                                                    type="text" 
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition mt-1"
                                                    placeholder="Escribe el nombre del banco..."
                                                    value={customTransferBank}
                                                    onChange={(e) => {
                                                        setCustomTransferBank(e.target.value);
                                                        setTransferBank(e.target.value);
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Cuenta de Destino (Propia)</label>
                                            {bankAccounts.length > 0 ? (
                                                <select 
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                    value={transferDestinationAccount}
                                                    onChange={(e) => setTransferDestinationAccount(e.target.value)}
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
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                    placeholder="Ej: Ahorros Bancolombia #1234"
                                                    value={transferDestinationAccount}
                                                    onChange={(e) => setTransferDestinationAccount(e.target.value)}
                                                />
                                            )}
                                        </div>
                                    </>
                                )}

                                {paymentMethod === 'credito' && (
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
                                                onChange={(e) => {
                                                     const val = e.target.value;
                                                     if (val === '') {
                                                         setInstallmentsCount('');
                                                     } else {
                                                         setInstallmentsCount(Math.max(1, parseInt(val) || 1));
                                                     }
                                                 }}
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

                            {selectedItems.map((item, index) => {
                                return (
                                    <div key={index} className="bg-surface-container/40 p-4 rounded-xl border border-outline/10 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_2.2fr_0.7fr_1.2fr_0.7fr_44px] gap-3 items-end">
                                            
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-bold">Categoría</label>
                                                <div className="bg-surface-container border border-outline/20 rounded-lg px-2 py-2 text-xs text-on-surface/80 h-10 flex items-center truncate">
                                                    {item.categoryId
                                                        ? categories.find(cat => cat.id === item.categoryId)?.name || 'Categoría interna'
                                                        : 'Automática'}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1 relative">
                                                <label className="text-[10px] text-on-surface-variant font-bold">Buscar Artículo del Inventario</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px] pointer-events-none">search</span>
                                                    <input
                                                        type="text"
                                                        placeholder={products.length === 0 ? 'Sin productos en inventario...' : `Buscar entre ${products.length} producto(s)...`}
                                                        value={item.productSearch}
                                                        onChange={(e) => handleItemChange(index, 'productSearch', e.target.value)}
                                                        onBlur={() => setTimeout(() => {
                                                            if (!item.productId) handleItemChange(index, 'productSearch', '');
                                                        }, 200)}
                                                        className={`bg-surface-container border rounded-lg pl-7 pr-3 py-2 text-xs focus:border-primary text-on-surface outline-none h-10 w-full transition ${
                                                            item.productId ? 'border-primary/60 bg-primary/5 font-semibold' : 'border-outline/20'
                                                        }`}
                                                        autoComplete="off"
                                                    />
                                                    {item.productId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { handleItemChange(index, 'productId', ''); handleItemChange(index, 'productSearch', ''); }}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-red-400 transition cursor-pointer border-0 bg-transparent p-0"
                                                            title="Limpiar selección"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Dropdown de sugerencias */}
                                                {item.productSearch && !item.productId && (() => {
                                                    const query = item.productSearch.trim().toLowerCase();
                                                    const suggestions = products.filter(p =>
                                                        p.name.toLowerCase().includes(query) ||
                                                        (p.sku && p.sku.toLowerCase().includes(query))
                                                    ).slice(0, 8);
                                                    return (
                                                        <div className="absolute left-0 right-0 top-full mt-1 bg-surface-container border border-outline/30 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                                                            {suggestions.length === 0 ? (
                                                                <div className="p-3 text-xs text-on-surface-variant italic text-center">No se encontraron productos con ese nombre o SKU.</div>
                                                            ) : (
                                                                suggestions.map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        type="button"
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() => {
                                                                            setSelectedItems(prev => {
                                                                                const copy = [...prev];
                                                                                copy[index] = {
                                                                                    ...copy[index],
                                                                                    productId: p.id,
                                                                                    productName: p.name,
                                                                                    productSearch: p.name,
                                                                                    categoryId: p.category_id || copy[index].categoryId,
                                                                                    price: Number(p.price),
                                                                                    discountPercentage: Number(p.promo_discount || 0)
                                                                                };
                                                                                return copy;
                                                                            });
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center justify-between gap-2 transition-colors cursor-pointer border-0 bg-transparent border-b border-outline/5 last:border-0"
                                                                    >
                                                                        <div>
                                                                            <p className="text-xs font-semibold text-on-surface">{p.name}</p>
                                                                            <p className="text-[10px] text-on-surface-variant">{p.sku ? `SKU: ${p.sku} • ` : ''}Stock: {p.stock}</p>
                                                                        </div>
                                                                        <span className="text-xs font-bold text-primary font-mono shrink-0">${Number(p.price).toLocaleString('es-CO')}</span>
                                                                    </button>
                                                                ))
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-bold text-center">Cant.</label>
                                                <input type="number" min={1} className="bg-surface-container text-center border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full h-10" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required />
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-bold">Precio Unit.</label>
                                                <input 
                                                    type="number" 
                                                    className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full h-10 font-mono font-bold" 
                                                    value={item.price} 
                                                    onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                                                    readOnly={item.productType === 'inventory' && !item.productId}
                                                    required 
                                                />
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] text-on-surface-variant font-bold text-center">% Desc.</label>
                                                <input type="number" min={0} max={100} className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs focus:border-primary text-on-surface outline-none w-full h-10 text-center" value={item.discountPercentage} onChange={(e) => handleItemChange(index, 'discountPercentage', e.target.value)} />
                                            </div>

                                            <div className="flex justify-center items-end pb-0.5">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveItem(index)} 
                                                    className="w-8 h-8 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md cursor-pointer border-0 flex items-center justify-center transition-all duration-200 hover:scale-[1.02]"
                                                >
                                                    <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={handleAddItem} className="bg-surface-container border border-outline/20 hover:bg-surface-container-high text-[10px] font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer text-on-surface transition-all duration-200">
                                    <span className="material-symbols-outlined text-[12px]">add</span>
                                    Agregar Producto
                                </button>
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

            {/* BARRA DE BÚSQUEDA Y FILTROS */}
            <div className="glass-card p-4 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por cliente, N° factura, teléfono o cédula..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-surface-container border border-outline/20 rounded-xl pl-10 pr-4 py-2 text-xs text-on-surface focus:border-primary outline-none transition"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none transition cursor-pointer"
                        >
                            <option value="all">Todas las Facturas</option>
                            <option value="paid">✅ Pagadas</option>
                            <option value="pending">⏳ Pendientes</option>
                            <option value="overdue">🔴 En Mora</option>
                        </select>
                        <select
                            value={sellerFilter}
                            onChange={(e) => setSellerFilter(e.target.value)}
                            className="bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:border-primary outline-none transition cursor-pointer"
                        >
                            <option value="all">Todos los Vendedores</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    👤 {emp.name} {emp.last_name || ''} ({emp.role || 'Vendedor'})
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
                                showAdvancedFilters || dateFrom || dateTo || minAmount || maxAmount
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-surface-container border-outline/20 text-on-surface-variant hover:bg-surface-container-high'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">tune</span>
                            Filtros
                        </button>
                        {(searchTerm || statusFilter !== 'all' || sellerFilter !== 'all' || dateFrom || dateTo || minAmount || maxAmount) && (
                            <button
                                onClick={resetFilters}
                                className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline/20 text-xs text-red-400 font-medium transition cursor-pointer flex items-center gap-1"
                                title="Limpiar todos los filtros"
                            >
                                <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtros Avanzados desplegables */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-outline/10 text-xs">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-on-surface-variant font-medium">Fecha Desde</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-on-surface-variant font-medium">Fecha Hasta</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-on-surface-variant font-medium">Monto Mínimo ($)</label>
                            <input
                                type="number"
                                placeholder="Ej: 50000"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-on-surface-variant font-medium">Monto Máximo ($)</label>
                            <input
                                type="number"
                                placeholder="Ej: 500000"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : fetchError ? (
                <div className="glass-card p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-red-400">wifi_off</span>
                    <p className="text-sm font-semibold text-red-400">{fetchError}</p>
                    <button
                        onClick={() => fetchData()}
                        className="bg-primary hover:opacity-90 text-on-primary text-xs font-semibold py-2 px-4 rounded-xl transition cursor-pointer"
                    >
                        Reintentar
                    </button>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-2">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">receipt_long</span>
                    <p className="text-sm text-on-surface-variant">
                        {invoices.length === 0 ? 'Aún no hay facturas registradas. ¡Crea tu primera factura!' : 'No se encontraron facturas con los filtros seleccionados.'}
                    </p>
                    {(searchTerm || statusFilter !== 'all' || dateFrom || dateTo) && (
                        <button onClick={resetFilters} className="text-xs text-primary hover:underline cursor-pointer border-0 bg-transparent">
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-semibold">
                                <th className="p-4">Factura / Cliente</th>
                                <th className="p-4">WhatsApp</th>
                                <th className="p-4">Monto Total</th>
                                <th className="p-4">Despacho</th>
                                <th className="p-4">Vence</th>
                                <th className="p-4">Estado / Soporte</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline/10 text-sm">
                            {filteredInvoices.map((inv) => (
                                <tr 
                                    key={inv.id} 
                                    onClick={() => handleOpenInvoiceDetail(inv)}
                                    className="hover:bg-surface-container/60 transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-on-surface text-xs font-mono bg-surface-container py-1 px-2 rounded-lg border border-outline/10 group-hover:border-primary/40 transition">
                                                {inv.invoice_number}
                                            </span>
                                            <div>
                                                <p className="font-semibold text-on-surface group-hover:text-primary transition">{inv.customer_name}</p>
                                                <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5 font-medium">
                                                    <span className="material-symbols-outlined text-[12px] opacity-75">payments</span>
                                                    {inv.payment_method === 'efectivo' || inv.payment_method === 'contado' ? '💵 Efectivo' :
                                                     inv.payment_method === 'transferencia' ? `🏦 Transf. (${inv.transfer_bank || 'Banco'})` :
                                                     inv.payment_method === 'tarjeta_credito' || inv.payment_method === 'tarjeta' ? '💳 Tarjeta Crédito' :
                                                     inv.payment_method === 'tarjeta_debito' ? '💳 Tarjeta Débito' :
                                                     `📋 Crédito (${inv.installments_count || 1} cuotas)`}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-on-surface-variant">+{inv.customer_phone}</td>
                                    <td className="p-4 font-semibold text-on-surface text-xs">
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
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                                inv.status === 'paid' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                inv.status === 'overdue' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {inv.status === 'paid' ? 'Pagado' : inv.status === 'overdue' ? 'Mora' : 'Pendiente'}
                                            </span>
                                            {inv.payment_receipt_url && (
                                                <span 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLightboxUrl(inv.payment_receipt_url!);
                                                    }}
                                                    className="bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5 hover:bg-primary/30 cursor-pointer"
                                                    title="Ver foto del comprobante de transferencia"
                                                >
                                                    <span className="material-symbols-outlined text-[10px]">receipt_long</span>
                                                    Soporte 📸
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-1.5">
                                            <button 
                                                onClick={() => handleOpenInvoiceDetail(inv)}
                                                className="p-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg transition cursor-pointer flex items-center justify-center border border-outline/20"
                                                title="Ver Detalle Completo de Factura"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                            </button>
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

            {/* MODAL DETALLE COMPLETO DE FACTURA */}
            {selectedInvoice && createPortal(
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="relative bg-[#0a0b0c] border border-[#222428] w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
                        {/* Header Fijo Sticky del Modal - Casi Negro */}
                        <div className="sticky top-0 z-30 bg-[#070708] border-b border-[#1e2023] p-4 sm:p-5 flex items-center justify-between shadow-md shrink-0">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-amber-400 text-2xl" style={{ color: '#eab308' }}>description</span>
                                    <h2 className="text-lg sm:text-xl font-bold text-white font-mono">
                                        Factura #{selectedInvoice.invoice_number}
                                    </h2>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                        selectedInvoice.status === 'paid' ? 'bg-[#1a170a] text-amber-400 border border-amber-500/40' :
                                        selectedInvoice.status === 'overdue' ? 'bg-[#220d0d] text-red-400 border border-red-500/40' :
                                        'bg-[#1a170a] text-amber-400 border border-amber-500/40'
                                    }`} style={{ color: selectedInvoice.status === 'paid' ? '#eab308' : undefined }}>
                                        {selectedInvoice.status === 'paid' ? 'PAGADO' : selectedInvoice.status === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 font-medium">
                                    Emisión: {new Date(selectedInvoice.created_at || Date.now()).toLocaleString('es-CO')} | Vencimiento: {new Date(selectedInvoice.due_date).toLocaleDateString('es-CO')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedInvoice(null)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 border-0 cursor-pointer text-gray-400 hover:text-white transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Cuerpo Escroleable del Modal */}
                        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-grow bg-[#0a0b0c]">
                            {/* INFORMACIÓN DEL CLIENTE & CONDICIONES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#141517] border border-[#222428] p-4 rounded-lg space-y-3">
                                    <h3 className="font-extrabold text-[#eab308] text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#eab308' }}>
                                        <span className="material-symbols-outlined text-[16px] text-amber-400" style={{ color: '#eab308' }}>person</span>
                                        INFORMACIÓN DEL CLIENTE
                                    </h3>
                                    <div className="text-xs space-y-2 text-gray-300">
                                        <p><strong className="text-white">Nombre:</strong> {selectedInvoice.customer_name}</p>
                                        <p><strong className="text-white">Documento:</strong> {selectedInvoice.customer_document_type || 'CC'} {selectedInvoice.customer_document_number || 'N/A'}</p>
                                        <p><strong className="text-white">WhatsApp:</strong> <span className="font-mono text-white">+{selectedInvoice.customer_phone}</span></p>
                                        <p><strong className="text-white">Email:</strong> <span className="font-mono text-white">{selectedInvoice.customer_email || 'Sin correo'}</span></p>
                                        {selectedInvoice.customer_address && (
                                            <p className="border-t border-[#1f2125] pt-1.5"><strong className="text-white">Dirección:</strong> {selectedInvoice.customer_address}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#141517] border border-[#222428] p-4 rounded-lg space-y-3">
                                    <h3 className="font-extrabold text-[#eab308] text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#eab308' }}>
                                        <span className="material-symbols-outlined text-[16px] text-amber-400" style={{ color: '#eab308' }}>local_shipping</span>
                                        CONDICIONES DE PAGO & ENVÍO
                                    </h3>
                                    <div className="text-xs space-y-2 text-gray-300">
                                        <p className="flex items-center gap-2">
                                            <strong className="text-white">Método de Pago:</strong> 
                                            <span className="uppercase font-extrabold bg-[#1a170a] text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded text-[10px]" style={{ color: '#eab308' }}>
                                                {selectedInvoice.payment_method || 'Efectivo'}
                                            </span>
                                        </p>
                                        {selectedInvoice.transfer_bank && (
                                            <p><strong className="text-white">Banco Origen:</strong> {selectedInvoice.transfer_bank}</p>
                                        )}
                                        {selectedInvoice.transfer_destination_account && (
                                            <p><strong className="text-white">Cuenta Destino:</strong> {selectedInvoice.transfer_destination_account}</p>
                                        )}
                                        {selectedInvoice.installments_count && selectedInvoice.installments_count > 1 && (
                                            <p><strong className="text-white">Plan Cuotas:</strong> {selectedInvoice.installments_count} cuotas ({selectedInvoice.installment_frequency})</p>
                                        )}
                                        <p><strong className="text-white">Logística:</strong> {selectedInvoice.delivery_method === 'domicilio' ? '🚚 Envío a Domicilio' : '🏪 Entrega en Tienda / Local'}</p>
                                        {selectedInvoice.delivery_address && (
                                            <p><strong className="text-white">Dirección Envío:</strong> {selectedInvoice.delivery_address}</p>
                                        )}

                                        <div className="border-t border-[#1f2125] pt-2 mt-2 space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <strong className="text-white">Vendedor Asignado:</strong>
                                                <span className="text-amber-400 font-bold" style={{ color: '#eab308' }}>{selectedInvoice.seller_name || 'Sin asignar'}</span>
                                            </div>
                                            <select
                                                value={selectedInvoice.seller_employee_id || ''}
                                                onChange={(e) => handleAssignSellerToInvoice(selectedInvoice.id, e.target.value)}
                                                className="w-full bg-[#0a0b0c] border border-[#26282d] rounded-lg p-2 text-xs text-white outline-none focus:border-amber-400 cursor-pointer font-medium"
                                            >
                                                <option value="">-- Cambiar / Asignar Vendedor --</option>
                                                {employees.map(emp => (
                                                    <option key={emp.id} value={emp.id}>
                                                        👤 {emp.name} {emp.last_name || ''} ({emp.role})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COMPROBANTE ADJUNTO */}
                            <div className="bg-[#141517] border border-[#222428] p-4 rounded-lg space-y-3">
                                <h3 className="font-extrabold text-[#eab308] text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#eab308' }}>
                                    <span className="material-symbols-outlined text-[16px] text-amber-400" style={{ color: '#eab308' }}>receipt</span>
                                    COMPROBANTE DE PAGO / SOPORTE DE TRANSFERENCIA
                                </h3>

                                {selectedInvoice.payment_receipt_url ? (
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={selectedInvoice.payment_receipt_url}
                                            alt="Comprobante"
                                            onClick={() => setLightboxUrl(selectedInvoice.payment_receipt_url || null)}
                                            className="w-20 h-20 object-cover rounded-lg border border-outline/20 cursor-pointer hover:scale-105 transition"
                                            title="Clic para ampliar"
                                        />
                                        <div className="text-xs space-y-1">
                                            <p className="text-green-400 font-semibold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px]">check_circle</span> Comprobante Adjunto
                                            </p>
                                            <a
                                                href={selectedInvoice.payment_receipt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-amber-400 hover:underline font-mono text-[11px] block"
                                                style={{ color: '#eab308' }}
                                            >
                                                Ver foto en tamaño completo ↗
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No hay comprobante de pago adjunto aún a esta factura.</p>
                                )}

                                <div className="flex gap-2 pt-2 border-t border-[#1f2125]">
                                    <input
                                        type="text"
                                        placeholder="Pegar URL o enlace de la foto del comprobante..."
                                        value={receiptInputUrl}
                                        onChange={(e) => setReceiptInputUrl(e.target.value)}
                                        className="flex-grow bg-[#0a0b0c] border border-[#26282d] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400 font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveReceiptUrl}
                                        disabled={isUpdatingReceipt || !receiptInputUrl.trim()}
                                        className="border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer shrink-0"
                                        style={{ color: '#eab308' }}
                                    >
                                        {isUpdatingReceipt ? 'Guardando...' : 'Guardar Comprobante'}
                                    </button>
                                </div>
                            </div>

                            {/* DETALLE DE ÍTEMS COMPRADOS */}
                            <div className="space-y-2">
                                <h3 className="font-extrabold text-[#eab308] text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#eab308' }}>
                                    <span className="material-symbols-outlined text-[16px] text-amber-400" style={{ color: '#eab308' }}>shopping_bag</span>
                                    PRODUCTOS E ÍTEMS DE LA FACTURA
                                </h3>
                                {loadingDetail ? (
                                    <div className="py-6 text-center text-xs text-gray-400 animate-pulse">Cargando productos de la factura...</div>
                                ) : invoiceDetail?.items?.length > 0 ? (
                                    <div className="bg-[#141517] overflow-hidden border border-[#222428] rounded-lg">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-[#0e0f11] border-b border-[#222428] text-white uppercase font-extrabold tracking-wider text-[11px]">
                                                    <th className="p-3">PRODUCTO / DESCRIPCIÓN</th>
                                                    <th className="p-3 text-center">CANT.</th>
                                                    <th className="p-3 text-right">PRECIO UNIT.</th>
                                                    <th className="p-3 text-right">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#1f2125]">
                                                {invoiceDetail.items.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="p-3">
                                                            <p className="font-bold text-white">{item.product_name || item.inventory_name}</p>
                                                            {item.product_type === 'optical_lens' && (
                                                                <div className="flex gap-1.5 mt-1 flex-wrap">
                                                                    {item.lens_design && <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ color: '#eab308' }}>Diseño: {item.lens_design}</span>}
                                                                    {item.lens_material && <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ color: '#eab308' }}>Mat: {item.lens_material}</span>}
                                                                    {item.lens_treatment && <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ color: '#eab308' }}>Trat: {item.lens_treatment}</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center font-mono font-bold text-white">{item.quantity}</td>
                                                        <td className="p-3 text-right font-mono text-gray-400">{formatPrice(parseFloat(item.price))}</td>
                                                        <td className="p-3 text-right font-bold text-white font-mono">{formatPrice(parseFloat(item.price) * item.quantity)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No se encontraron ítems detallados.</p>
                                )}
                            </div>
                        </div>

                        {/* Pie Fijo Sticky del Modal con Grid de Botones Ultra Compacto */}
                        <div className="sticky bottom-0 z-30 bg-[#070708] border-t border-[#1e2023] p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg shrink-0">
                            <div className="shrink-0 min-w-[160px]">
                                <p className="text-xs text-gray-400">
                                    Envío Domicilio: <span className="font-semibold text-white">{formatPrice(parseFloat(selectedInvoice.delivery_fee || '0'))}</span>
                                </p>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-0.5">TOTAL FACTURA</p>
                                <p className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono tracking-tight" style={{ color: '#eab308' }}>
                                    {formatPrice(parseFloat(selectedInvoice.total_amount) + parseFloat(selectedInvoice.delivery_fee || '0'))}
                                </p>
                            </div>

                            {/* Grid 2x3 de Botones de Acción Ultra Compactos */}
                            <div className="grid grid-cols-3 gap-1.5 max-w-[430px] shrink-0 w-full sm:w-auto">
                                {/* Fila 1 */}
                                <button
                                    type="button"
                                    onClick={() => handleSendInvoiceWhatsApp(selectedInvoice)}
                                    className="bg-[#181a1c] hover:bg-[#222528] border border-[#2d3036] text-white font-semibold text-[11px] py-1.5 px-2 rounded-md transition cursor-pointer flex items-center justify-center gap-1 truncate"
                                    title="Enviar factura por WhatsApp"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-emerald-400 shrink-0">chat</span>
                                    <span className="truncate">Enviar WhatsApp</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSendInvoiceEmail(selectedInvoice)}
                                    className="bg-[#181a1c] hover:bg-[#222528] border border-[#2d3036] text-white font-semibold text-[11px] py-1.5 px-2 rounded-md transition cursor-pointer flex items-center justify-center gap-1 truncate"
                                    title="Enviar factura por Correo Electrónico"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-blue-400 shrink-0">mail</span>
                                    <span className="truncate">Enviar Email</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handlePrintInvoice(selectedInvoice)}
                                    className="bg-[#181a1c] hover:bg-[#222528] border border-[#2d3036] text-white font-semibold text-[11px] py-1.5 px-2 rounded-md transition cursor-pointer flex items-center justify-center gap-1 truncate"
                                >
                                    <span className="material-symbols-outlined text-[14px] shrink-0">print</span>
                                    <span className="truncate">Imprimir (80mm)</span>
                                </button>

                                {/* Fila 2 */}
                                {!selectedInvoice.cufe ? (
                                    <button
                                        type="button"
                                        disabled={generatingElectronicId === selectedInvoice.id}
                                        onClick={() => handleGenerateElectronicInvoice(selectedInvoice.id)}
                                        className="bg-[#eab308] hover:bg-amber-300 text-black font-extrabold text-[11px] py-1.5 px-2 rounded-md transition cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50 truncate"
                                        title="Emitir factura electrónica DIAN oficial"
                                    >
                                        <span className="material-symbols-outlined text-[14px] shrink-0">bolt</span>
                                        <span className="truncate">{generatingElectronicId === selectedInvoice.id ? 'Emitiendo...' : 'Emitir Factura Electrónica DIAN'}</span>
                                    </button>
                                ) : (
                                    <div 
                                        className="bg-[#1a170a] text-amber-400 border border-amber-500/40 font-extrabold text-[11px] py-1.5 px-2 rounded-md flex items-center justify-center gap-1 select-none truncate"
                                        style={{ color: '#eab308' }}
                                        title="Factura validada ante la DIAN"
                                    >
                                        <span className="material-symbols-outlined text-[14px] shrink-0">verified</span>
                                        <span className="truncate">DIAN Verificada</span>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handlePrintPOS(selectedInvoice.id)}
                                    className="bg-[#181a1c] hover:bg-[#222528] border border-[#2d3036] text-white font-semibold text-[11px] py-1.5 px-2 rounded-md transition cursor-pointer flex items-center justify-center gap-1 truncate"
                                >
                                    <span className="material-symbols-outlined text-[14px] shrink-0">receipt_long</span>
                                    <span className="truncate">Imprimir POS (80mm)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(null)}
                                    className="bg-[#181a1c] hover:bg-[#222528] border border-[#2d3036] text-gray-400 hover:text-white font-semibold text-[11px] py-1.5 px-2 rounded-md transition cursor-pointer text-center truncate"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DE UPGRADE A PLAN PRO (FEATURE GATING) */}
            {showUpgradeModal && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
                    <div className="bg-surface-container border border-outline/30 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg">
                                <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                            </div>
                            <h3 className="text-xl font-bold text-on-surface">Límite del Plan Básico Alcanzado</h3>
                            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                                Has emitido las 10 Facturas Electrónicas incluidas de este mes. Pásate al <strong className="text-amber-400">Plan Pro</strong> para disfrutar de emisión ilimitada ante la DIAN.
                            </p>
                        </div>

                        <div className="bg-surface-container-high/60 border border-outline/15 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-xs text-on-surface font-medium">
                                <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                                Facturación Electrónica DIAN Ilimitada con CUFE & QR
                            </div>
                            <div className="flex items-center gap-2 text-xs text-on-surface font-medium">
                                <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                                Envío automático de PDF por WhatsApp a tus clientes
                            </div>
                            <div className="flex items-center gap-2 text-xs text-on-surface font-medium">
                                <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                                Impresiones Térmicas POS 80mm ilimitadas
                            </div>
                            <div className="flex items-center gap-2 text-xs text-on-surface font-medium">
                                <span className="material-symbols-outlined text-green-400 text-[18px]">check_circle</span>
                                Soporte técnico prioritario 24/7 para habilitación fiscal
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    alert('🚀 ¡Solicitud enviada! Nuestro equipo se pondrá en contacto para activar tu Plan Pro.');
                                    setShowUpgradeModal(false);
                                }}
                                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90 text-white font-bold text-sm py-3 rounded-xl transition text-center cursor-pointer shadow-lg"
                            >
                                Actualizar a Plan Pro Ahora
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowUpgradeModal(false)}
                                className="px-4 py-3 bg-surface-container-high hover:bg-surface-container border border-outline/20 text-on-surface-variant font-semibold text-xs rounded-xl transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* LIGHTBOX FULLSCREEN PARA FOTO DE COMPROBANTE */}
            {lightboxUrl && createPortal(
                <div 
                    onClick={() => setLightboxUrl(null)}
                    className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 cursor-pointer animate-in fade-in duration-200"
                >
                    <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute -top-12 right-0 text-white hover:text-red-400 text-xs font-bold flex items-center gap-1 bg-black/70 px-3 py-1.5 rounded-full border border-white/20 cursor-pointer shadow-lg"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                            Cerrar [ESC]
                        </button>
                        <img
                            src={lightboxUrl}
                            alt="Comprobante de Pago Completo"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-outline/20"
                        />
                        <div className="mt-3 text-center">
                            <a
                                href={lightboxUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary hover:underline font-semibold flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                Abrir imagen en pestaña nueva
                            </a>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
