import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';
import { AuditLogModal } from './AuditLogModal';

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
    brand?: string | null;
    model?: string | null;
    color?: string | null;
    material?: string | null;
    style?: string | null;
    description?: string | null;
    variants?: any[] | null;
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
    const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
    const [clientProfile, setClientProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Estado para Modal de Auditoría Contextual por Factura
    const [auditModalOpen, setAuditModalOpen] = useState(false);
    const [auditModalTitle, setAuditModalTitle] = useState('');
    const [auditModalSubtitle, setAuditModalSubtitle] = useState('');
    const [auditEntityId, setAuditEntityId] = useState<string | undefined>(undefined);
    const [auditEntityType, setAuditEntityType] = useState<string | undefined>(undefined);

    const openAuditModalForInvoice = (inv: Invoice) => {
        setAuditModalTitle(`Historial de Factura #${inv.invoice_number}`);
        setAuditModalSubtitle(`Cliente: ${inv.customer_name} | ID: ${inv.id}`);
        setAuditEntityType('invoice');
        setAuditEntityId(inv.id);
        setAuditModalOpen(true);
    };

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

    // Modal de Creación Rápida de Cliente en Facturación
    const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
    const [quickCustType, setQuickCustType] = useState<'persona' | 'empresa'>('persona');
    const [quickCustName, setQuickCustName] = useState('');
    const [quickCustLastName, setQuickCustLastName] = useState('');
    const [quickCustDocType, setQuickCustDocType] = useState('CC');
    const [quickCustDocNum, setQuickCustDocNum] = useState('');
    const [quickCustPhone, setQuickCustPhone] = useState('');
    const [quickCustEmail, setQuickCustEmail] = useState('');
    const [quickCustAddress, setQuickCustAddress] = useState('');
    const [quickCustSaving, setQuickCustSaving] = useState(false);
    const [quickCustError, setQuickCustError] = useState<string | null>(null);
    // Condiciones de Pago
    const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta_credito' | 'tarjeta_debito' | 'credito'>('efectivo');
    const [transferBank, setTransferBank] = useState('');
    const [transferBankSelect, setTransferBankSelect] = useState('');
    const [customTransferBank, setCustomTransferBank] = useState('');
    const [transferDestinationAccount, setTransferDestinationAccount] = useState('');
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const getDefaultFirstDueDate = (freq: 'semanal' | 'quincenal' | 'mensual') => {
        const d = new Date();
        if (freq === 'semanal') {
            d.setDate(d.getDate() + 7);
        } else if (freq === 'quincenal') {
            d.setDate(d.getDate() + 15);
        } else {
            d.setMonth(d.getMonth() + 1);
        }
        return d.toISOString().split('T')[0];
    };

    const [installmentsCount, setInstallmentsCount] = useState<number | string>(1);
    const [installmentFrequency, setInstallmentFrequency] = useState<'semanal' | 'quincenal' | 'mensual'>('mensual');
    const [firstDueDate, setFirstDueDate] = useState<string>(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
    });
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

    const getNextInvoiceNumber = (invList: Invoice[]) => {
        if (!invList || invList.length === 0) return 'F-1001';

        let maxNum = 0;
        let prefix = 'F-';

        for (const inv of invList) {
            if (!inv.invoice_number) continue;
            const match = inv.invoice_number.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                    const prefixMatch = inv.invoice_number.match(/^([^\d]+)/);
                    if (prefixMatch) prefix = prefixMatch[1];
                }
            }
        }

        const nextNum = maxNum > 0 ? maxNum + 1 : 1001;
        return `${prefix}${nextNum}`;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const [invRes, prodRes, crmRes, clientRes, bankRes, empRes, tblRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/invoices`),
                fetch(`/api/clients/${clientId}/products`),
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
            const crmData = crmRes.ok ? await crmRes.json() : { success: false };
            const clientData = clientRes.ok ? await clientRes.json() : { success: false };
            const bankData = bankRes.ok ? await bankRes.json() : { success: false };
            const empData = empRes.ok ? await empRes.json() : { success: false };
            const tblData = tblRes.ok ? await tblRes.json() : { success: false };

            if (invData.success) {
                const fetchedInvoices = invData.invoices || [];
                setInvoices(fetchedInvoices);
                setInvoiceNumber(getNextInvoiceNumber(fetchedInvoices));
            } else if (invData.error) console.warn('[Facturas] Error API:', invData.error);
            else if (invData.error) console.warn('[Facturas] Error API:', invData.error);
            if (prodData.success) setProducts(prodData.products || []);
            else if (prodData.error) console.warn('[Productos] Error API:', prodData.error);
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
            const count = typeof installmentsCount === 'string' ? (parseInt(installmentsCount, 10) || 1) : installmentsCount;
            const baseDate = firstDueDate ? new Date(firstDueDate + 'T12:00:00') : new Date();
            const date = new Date(baseDate);
            const remainingSteps = Math.max(0, count - 1);
            if (installmentFrequency === 'semanal') {
                date.setDate(date.getDate() + remainingSteps * 7);
            } else if (installmentFrequency === 'quincenal') {
                date.setDate(date.getDate() + remainingSteps * 15);
            } else {
                date.setMonth(date.getMonth() + remainingSteps);
            }
            setDueDate(date.toISOString().split('T')[0]);
        } else {
            setDueDate(new Date().toISOString().split('T')[0]);
        }
    }, [paymentMethod, installmentsCount, installmentFrequency, firstDueDate]);

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

    const handleAddLensServiceItem = () => {
        setSelectedItems(prev => [
            ...prev,
            {
                productId: '',
                categoryId: '',
                productSearch: 'Servicio de Lentes',
                productName: 'Servicio de Lentes',
                quantity: 1,
                price: 0,
                discountPercentage: 0,
                productType: 'lens',
                lensDesign: '',
                lensMaterial: '',
                lensTreatment: ''
            }
        ]);
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
            } else if (field === 'lensDesign' || field === 'lensMaterial' || field === 'lensTreatment') {
                (item as any)[field] = value;
                const parts = [];
                if (item.lensDesign) parts.push(item.lensDesign);
                if (item.lensMaterial) parts.push(item.lensMaterial);
                if (item.lensTreatment) parts.push(item.lensTreatment);
                const generatedName = parts.length > 0 ? `Lente ${parts.join(' - ')}` : 'Servicio de Lentes';
                item.productName = generatedName;
                item.productSearch = generatedName;
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
            dueDate: paymentMethod === 'credito' ? (dueDate || firstDueDate) : (dueDate || new Date().toISOString().split('T')[0]),
            firstDueDate: paymentMethod === 'credito' ? firstDueDate : null,
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

    const resetForm = (customInvoices?: Invoice[] | any) => {
        const list = Array.isArray(customInvoices) ? customInvoices : invoices;
        setInvoiceNumber(getNextInvoiceNumber(list));
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
        setFirstDueDate(getDefaultFirstDueDate('mensual'));
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

    const openQuickCustomerModal = (prefillValue?: string) => {
        setActiveDropdownField(null);
        setQuickCustType('persona');
        setQuickCustError(null);
        setQuickCustSaving(false);

        const trimmed = (prefillValue || customerName || customerDocumentNumber || customerPhone || '').trim();

        if (/^\d{5,12}$/.test(trimmed)) {
            setQuickCustDocNum(trimmed);
            setQuickCustName('');
            setQuickCustPhone(customerPhone || '');
        } else if (/^\+?\d{7,15}$/.test(trimmed)) {
            setQuickCustPhone(trimmed);
            setQuickCustName(customerName || '');
            setQuickCustDocNum(customerDocumentNumber || '');
        } else {
            setQuickCustName(trimmed || customerName || '');
            setQuickCustDocNum(customerDocumentNumber || '');
            setQuickCustPhone(customerPhone || '');
        }

        setQuickCustLastName('');
        setQuickCustDocType('CC');
        setQuickCustEmail(customerEmail || '');
        setQuickCustAddress(customerAddress || '');
        setIsQuickCustomerOpen(true);
    };

    const handleSaveQuickCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCustName.trim() || !quickCustDocNum.trim() || !quickCustPhone.trim()) {
            setQuickCustError('Nombre, número de documento y teléfono son requeridos.');
            return;
        }

        try {
            setQuickCustSaving(true);
            setQuickCustError(null);
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

            const res = await fetch(`/api/clients/${clientId}/crm-customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: quickCustName.trim(),
                    last_name: quickCustType === 'empresa' ? '' : quickCustLastName.trim(),
                    document_type: quickCustType === 'empresa' ? 'NIT' : quickCustDocType,
                    document_number: quickCustDocNum.trim(),
                    phone: quickCustPhone.trim(),
                    email: quickCustEmail.trim() || null,
                    address: quickCustAddress.trim() || null,
                    customer_type: quickCustType
                })
            });

            const json = await res.json();
            if (json.success && json.customer) {
                const newCust = json.customer;
                setCrmCustomers(prev => [newCust, ...prev]);
                selectCustomer(newCust);
                setIsQuickCustomerOpen(false);
            } else {
                setQuickCustError(json.error || 'Error al guardar el cliente.');
            }
        } catch (err: any) {
            setQuickCustError(err.message || 'Error de conexión al registrar cliente.');
        } finally {
            setQuickCustSaving(false);
        }
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
            <div className="absolute left-0 right-0 top-[70px] bg-white border border-[#161616] shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-[#E2DFD7] rounded-none">
                {filtered.length === 0 ? (
                    <div className="p-3 text-xs text-[#6B6862] italic text-center bg-white">
                        No se encontraron coincidencias.
                    </div>
                ) : (
                    filtered.map(c => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left p-3 hover:bg-[#FAF8F5] text-xs text-[#161616] font-medium flex justify-between items-center transition-colors cursor-pointer border-0 bg-transparent"
                        >
                            <div className="truncate pr-2">
                                <p className="font-bold text-[#161616] truncate">{c.name} {c.last_name || ''}</p>
                                <p className="text-[10px] text-[#6B6862] truncate">{c.email || 'Sin correo'} • {c.phone}</p>
                            </div>
                            <span className="text-[10px] bg-[#F6F4EE] text-[#161616] border border-[#E2DFD7] px-2 py-0.5 font-bold font-mono uppercase shrink-0">
                                {c.document_type || 'CC'}: {c.document_number}
                            </span>
                        </button>
                    ))
                )}
                {currentFieldVal.trim() !== '' && (
                    <button
                        type="button"
                        onClick={onSelectNew}
                        className="w-full text-left p-3 hover:bg-[#FAF8F5] text-xs text-[#D9381E] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-0 bg-transparent border-t border-[#E2DFD7]"
                    >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        Registrar como cliente nuevo: "{currentFieldVal}"
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 text-[#161616] font-sans">
            {/* Header Editorial Wabi-Sabi */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5 mb-8">
                <div>
                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-sans block mb-1">VENTAS & FACTURACIÓN</span>
                    <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#161616] tracking-tight leading-none">Facturación POS & Electrónica DIAN</h2>
                    <p className="text-xs text-[#6B6862] mt-2 font-sans">Emisión y control de facturas POS y Electrónicas DIAN con CUFE, QR fiscal y tiquetes térmicos 80mm.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowUpgradeModal(true)}
                        className="bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] text-[11px] font-bold py-2.5 px-3.5 flex items-center gap-1.5 transition cursor-pointer uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-[16px] text-[#D9381E]">workspace_premium</span>
                        Planes & Upgrade
                    </button>
                    <button
                        type="button"
                        onClick={() => { resetForm(); setIsFormOpen(true); }}
                        className="bg-[#161616] hover:bg-[#D9381E] text-white text-[12px] font-bold py-3.5 px-7 flex items-center gap-2 transition-all cursor-pointer border-0 uppercase tracking-widest shadow-sm"
                    >
                        + CREAR FACTURA
                    </button>
                </div>
            </div>

            {/* METRICAS Y PROGRESO DE FACTURACIÓN WABI-SABI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                {/* Tarjeta Ventas Totales */}
                <div className="bg-white border border-[#E2DFD7] p-6 flex flex-col justify-between transition-all hover:border-[#161616]">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-widest text-[#6B6862] font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#D9381E]">payments</span>
                            VENTAS TOTALES
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 bg-[#FAF8F5] border border-[#E2DFD7] font-mono font-bold text-[#161616] uppercase tracking-wider">
                            Suma de facturación
                        </span>
                    </div>
                    <div className="mt-4">
                        <h2 className="font-serif text-4xl sm:text-5xl text-[#161616] font-normal leading-none font-mono">
                            ${invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h2>
                        <p className="text-[#6B6862] text-xs mt-3 font-sans">Total acumulado de ventas facturadas en sistema</p>
                    </div>
                </div>

                {/* Tarjeta Plan & DIAN Quota */}
                {planStatus && (
                    <div className="bg-white border border-[#E2DFD7] border-l-4 border-l-[#D9381E] p-6 flex flex-col justify-between transition-all hover:border-[#161616]">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase tracking-widest text-[#6B6862] font-semibold flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-[#D9381E]">verified</span>
                                PLAN ACTUAL & DIAN
                            </span>
                            <span className="text-xs font-bold uppercase text-[#D9381E] tracking-wider">
                                {planStatus.planTier === 'enterprise' ? '👑 Enterprise IA' : planStatus.planTier === 'pro' ? '🚀 Pro' : '🟢 Básico'}
                            </span>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="font-serif text-4xl sm:text-5xl text-[#161616] font-normal leading-none font-mono flex items-baseline gap-2">
                                    {planStatus.used || 0} <span className="font-sans text-sm text-[#6B6862] font-normal">/ {planStatus.limit >= 99999 ? '∞' : (planStatus.limit || 10)}</span>
                                </h2>
                                <p className="text-[#6B6862] text-xs mt-3 font-sans">Facturas electrónicas DIAN emitidas este mes</p>
                            </div>
                            {planStatus.planTier === 'basic' && (
                                <button
                                    type="button"
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-[11px] px-3.5 py-2 transition uppercase tracking-wider cursor-pointer border-0 shrink-0"
                                >
                                    Upgrade Pro
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL POPUP WIDESCREEN EDITORIAL WABI-SABI PARA CREACIÓN DE FACTURA (createPortal) */}
            {isFormOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
                    <div className="bg-[#F6F4EE] border border-[#161616] w-full max-w-[1540px] max-h-[calc(100vh-2rem)] h-full sm:h-[88vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-fade-in">
                        
                        {/* Header del Modal */}
                        <div className="px-5 sm:px-8 py-3.5 sm:py-5 border-b border-[#E2DFD7] flex justify-between items-center bg-[#F6F4EE] shrink-0">
                            <div>
                                <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-sans block">FACTURACIÓN & CAJA POS / DIAN</span>
                                <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] leading-tight">
                                    Emitir Factura de Venta POS / DIAN
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="text-[#161616] hover:text-[#D9381E] text-3xl font-light cursor-pointer border-0 bg-transparent leading-none"
                                title="Cerrar modal"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Formulario en 2 Columnas: Izquierda Formulario Scrollable, Derecha Liquidación Live */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                            <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 sm:gap-8 min-h-0">
                                
                                {/* Columna Izquierda: Secciones de Facturación */}
                                <div className="overflow-y-auto pr-4 sm:pr-8 space-y-6 max-h-full min-h-0 flex-1 custom-scrollbar" ref={dropdownRef}>
                                    
                                    {/* 1. Datos del Cliente / Comprador */}
                                    <div>
                                        <h4 className="font-serif text-xl text-[#161616] border-b border-[#E2DFD7] pb-2 mb-4 font-normal flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <span>1. Datos del Cliente / Comprador</span>
                                                <button
                                                    type="button"
                                                    onClick={() => openQuickCustomerModal()}
                                                    className="px-2 py-0.5 bg-[#161616] text-[#F6F4EE] hover:bg-[#D9381E] text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border-0"
                                                    title="Registrar nuevo cliente sin salir de la factura"
                                                >
                                                    <span className="material-symbols-outlined text-[13px]">person_add</span>
                                                    + Nuevo Cliente
                                                </button>
                                            </div>
                                            <span className="text-[11px] text-[#6B6862] font-sans font-semibold uppercase tracking-wider">Requerido para DIAN</span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Factura N° *</label>
                                                <input 
                                                    type="text" 
                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-mono font-bold" 
                                                    value={invoiceNumber} 
                                                    onChange={(e) => setInvoiceNumber(e.target.value)} 
                                                    required 
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5 relative">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Nombre del Cliente *</label>
                                                <input 
                                                    type="text" 
                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans font-semibold w-full" 
                                                    value={customerName} 
                                                    onChange={(e) => {
                                                        setCustomerName(e.target.value);
                                                        setActiveDropdownField('name');
                                                    }}
                                                    onFocus={() => setActiveDropdownField('name')}
                                                    placeholder="Buscar por nombre o cédula..."
                                                    required 
                                                />
                                                {activeDropdownField === 'name' && renderSuggestions(customerName, customerName, () => openQuickCustomerModal(customerName))}
                                            </div>
                                            <div className="flex flex-col gap-1.5 relative">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Documento de Identidad *</label>
                                                <div className="flex gap-1.5">
                                                    <select 
                                                        className="bg-white border border-[#E2DFD7] px-2.5 text-xs focus:border-[#161616] outline-none text-[#161616] font-bold rounded-none cursor-pointer" 
                                                        value={customerDocumentType} 
                                                        onChange={(e) => setCustomerDocumentType(e.target.value)}
                                                    >
                                                        <option value="CC">CC</option>
                                                        <option value="NIT">NIT</option>
                                                        <option value="CE">CE</option>
                                                        <option value="PP">PP</option>
                                                    </select>
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-mono font-semibold" 
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
                                                {activeDropdownField === 'document' && renderSuggestions(customerDocumentNumber, customerDocumentNumber, () => openQuickCustomerModal(customerDocumentNumber))}
                                            </div>
                                            <div className="flex flex-col gap-1.5 relative">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">WhatsApp *</label>
                                                <input 
                                                    type="text" 
                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-mono w-full" 
                                                    value={customerPhone} 
                                                    onChange={(e) => {
                                                        setCustomerPhone(e.target.value);
                                                        setActiveDropdownField('phone');
                                                    }} 
                                                    onFocus={() => setActiveDropdownField('phone')}
                                                    placeholder="57300..."
                                                    required 
                                                />
                                                {activeDropdownField === 'phone' && renderSuggestions(customerPhone, customerPhone, () => openQuickCustomerModal(customerPhone))}
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Correo Electrónico *</label>
                                                <input 
                                                    type="email" 
                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans" 
                                                    value={customerEmail} 
                                                    onChange={(e) => setCustomerEmail(e.target.value)} 
                                                    placeholder="cliente@correo.com"
                                                    required 
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Dirección de Residencia</label>
                                                <input 
                                                    type="text" 
                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans" 
                                                    value={customerAddress} 
                                                    onChange={(e) => setCustomerAddress(e.target.value)} 
                                                    placeholder="Calle / Carrera / Ciudad..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Configuración Específica de Restaurantes & Gastronomía (Si aplica) */}
                                    {clientProfile?.category === 'restaurante' && (
                                        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-5">
                                            <h4 className="font-serif text-lg text-[#161616] border-b border-[#E2DFD7] pb-2 mb-4 font-normal flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[#D9381E] text-[20px]">restaurant</span>
                                                Servicio Gastronómico: Mesa, Impoconsumo 8% & Propina Sugerida
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Mesa de Servicio</label>
                                                    <select
                                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-semibold outline-none focus:border-[#161616] cursor-pointer rounded-none"
                                                        value={selectedTableId}
                                                        onChange={(e) => setSelectedTableId(e.target.value)}
                                                    >
                                                        <option value="">🛒 Venta Directa (Barra / Llevar)</option>
                                                        {tables.map(t => (
                                                            <option key={t.id} value={t.id}>
                                                                🪑 Mesa #{t.table_number} ({t.zone})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Mesero Atribuidor</label>
                                                    <select
                                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-semibold outline-none focus:border-[#161616] cursor-pointer rounded-none"
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
                                                    <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Impuesto Gastronómico</label>
                                                    <select
                                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs font-bold outline-none focus:border-[#161616] cursor-pointer text-[#D9381E] rounded-none"
                                                        value={taxMode}
                                                        onChange={(e) => setTaxMode(e.target.value as any)}
                                                    >
                                                        <option value="impoconsumo_8">🏷️ Impoconsumo (8% E.T.)</option>
                                                        <option value="iva_19">🏷️ IVA (19%)</option>
                                                        <option value="exento">🛡️ Exento de Impuestos (RST)</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1.5 justify-center">
                                                    <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Propina (Ley 1935)</label>
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <input
                                                            type="checkbox"
                                                            id="includeTipCheck"
                                                            checked={includeTip}
                                                            onChange={(e) => setIncludeTip(e.target.checked)}
                                                            className="w-4 h-4 accent-[#D9381E] cursor-pointer"
                                                        />
                                                        <label htmlFor="includeTipCheck" className="text-xs font-bold text-[#161616] cursor-pointer flex items-center gap-1">
                                                            <span>Incluir</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="30"
                                                                value={tipPercentage}
                                                                onChange={(e) => setTipPercentage(parseFloat(e.target.value) || 0)}
                                                                className="w-12 bg-white border border-[#E2DFD7] px-1 py-0.5 text-xs text-center font-bold text-[#D9381E] outline-none rounded-none"
                                                            />
                                                            <span>% Voluntario</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. Condiciones y Método de Pago */}
                                    <div>
                                        <h4 className="font-serif text-lg text-[#161616] border-b border-[#E2DFD7] pb-2 mb-3 font-normal">
                                            2. Condiciones y Método de Pago
                                        </h4>
                                        <div className={`grid grid-cols-1 sm:grid-cols-2 ${paymentMethod === 'credito' ? 'lg:grid-cols-5' : paymentMethod === 'transferencia' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-3`}>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold truncate" title="Método de Pago">
                                                    Método de Pago *
                                                </label>
                                                <select 
                                                    className="bg-white border border-[#E2DFD7] px-2.5 py-2 text-xs focus:border-[#161616] text-[#161616] font-semibold outline-none rounded-none cursor-pointer w-full" 
                                                    value={paymentMethod} 
                                                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                                                    required
                                                >
                                                    <option value="efectivo">💵 Efectivo</option>
                                                    <option value="transferencia">🏦 Transferencia</option>
                                                    <option value="tarjeta_credito">💳 Tarjeta Crédito</option>
                                                    <option value="tarjeta_debito">💳 Tarjeta Débito</option>
                                                    <option value="credito">📋 Crédito / Cuotas</option>
                                                </select>
                                            </div>

                                            {paymentMethod === 'transferencia' && (
                                                <>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold truncate" title="Banco Origen">
                                                            Banco Origen
                                                        </label>
                                                        <select
                                                            className="bg-white border border-[#E2DFD7] px-2.5 py-2 text-xs focus:border-[#161616] text-[#161616] outline-none rounded-none cursor-pointer w-full"
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
                                                            <option value="">-- Seleccionar Banco --</option>
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
                                                            <option value="otro">➕ Otro / Extranjero...</option>
                                                        </select>

                                                        {transferBankSelect === 'otro' && (
                                                            <input 
                                                                type="text" 
                                                                className="bg-white border border-[#E2DFD7] px-2.5 py-1.5 text-xs focus:border-[#161616] text-[#161616] outline-none mt-1 rounded-none font-sans w-full"
                                                                placeholder="Nombre del banco..."
                                                                value={customTransferBank}
                                                                onChange={(e) => {
                                                                    setCustomTransferBank(e.target.value);
                                                                    setTransferBank(e.target.value);
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold truncate" title="Cuenta Propia de Destino">
                                                            Cuenta de Destino
                                                        </label>
                                                        {bankAccounts.length > 0 ? (
                                                            <select 
                                                                className="bg-white border border-[#E2DFD7] px-2.5 py-2 text-xs focus:border-[#161616] text-[#161616] outline-none rounded-none cursor-pointer w-full"
                                                                value={transferDestinationAccount}
                                                                onChange={(e) => setTransferDestinationAccount(e.target.value)}
                                                            >
                                                                <option value="">-- Seleccionar Cuenta --</option>
                                                                {bankAccounts.map(b => (
                                                                    <option key={b.id} value={`${b.bank_name} - ${b.account_type} #${b.account_number}`}>
                                                                        {b.bank_name} ({b.account_type}) - #{b.account_number}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                className="bg-white border border-[#E2DFD7] px-2.5 py-2 text-xs focus:border-[#161616] text-[#161616] outline-none rounded-none font-sans w-full"
                                                                placeholder="Ej: Bancolombia #1234"
                                                                value={transferDestinationAccount}
                                                                onChange={(e) => setTransferDestinationAccount(e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {paymentMethod === 'credito' && (
                                                <>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold truncate" title="Abono Inicial ($)">
                                                            Abono Inicial ($) *
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            className="bg-white border border-[#E2DFD7] px-2.5 py-2 text-xs focus:border-[#161616] text-[#161616] outline-none font-mono rounded-none w-full" 
                                                            value={abono} 
                                                            onChange={(e) => setAbono(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold truncate" title="Número de Cuotas">
                                                            N° de Cuotas *
                                                        </label>
                                                        <input 
                                                            type="number" 
                                                            className="bg-white border border-[#E2DFD7] px-2.5 py-2 text-xs focus:border-[#161616] text-[#161616] outline-none font-mono rounded-none w-full" 
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
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold truncate" title="Frecuencia de Cobro">
                                                            Frecuencia *
                                                        </label>
                                                        <select 
                                                            className="bg-white border border-[#E2DFD7] px-2.5 py-2 text-xs focus:border-[#161616] text-[#161616] outline-none rounded-none cursor-pointer w-full" 
                                                            value={installmentFrequency} 
                                                            onChange={(e) => {
                                                                const val = e.target.value as any;
                                                                setInstallmentFrequency(val);
                                                                setFirstDueDate(getDefaultFirstDueDate(val));
                                                            }}
                                                            required
                                                        >
                                                            <option value="semanal">Semanal</option>
                                                            <option value="quincenal">Quincenal</option>
                                                            <option value="mensual">Mensual</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-[10px] uppercase tracking-wider text-[#6B6862] font-semibold truncate" title="Fecha 1ª Cuota / Inicio">
                                                            Fecha 1ª Cuota *
                                                        </label>
                                                        <input 
                                                            type="date" 
                                                            className="bg-white border border-[#E2DFD7] px-2 py-2 text-[11px] focus:border-[#161616] text-[#161616] outline-none font-mono rounded-none cursor-pointer w-full" 
                                                            value={firstDueDate} 
                                                            onChange={(e) => setFirstDueDate(e.target.value)}
                                                            required
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Despacho y Logística */}
                                    <div>
                                        <h4 className="font-serif text-xl text-[#161616] border-b border-[#E2DFD7] pb-2 mb-4 font-normal">
                                            3. Despacho y Logística
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Modalidad de Entrega</label>
                                                <select 
                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs focus:border-[#161616] text-[#161616] outline-none rounded-none cursor-pointer" 
                                                    value={deliveryMethod} 
                                                    onChange={(e) => setDeliveryMethod(e.target.value as any)}
                                                >
                                                    <option value="local">🏪 Retiro en Local / Tienda</option>
                                                    <option value="domicilio">🚚 Despacho a Domicilio</option>
                                                </select>
                                            </div>

                                            {deliveryMethod === 'domicilio' && (
                                                <>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Costo de Domicilio ($)</label>
                                                        <input 
                                                            type="number" 
                                                            className="bg-white border border-[#E2DFD7] p-3 text-xs focus:border-[#161616] text-[#161616] outline-none font-mono rounded-none" 
                                                            value={deliveryFee} 
                                                            onChange={(e) => setDeliveryFee(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Fecha Estimada</label>
                                                        <input 
                                                            type="date" 
                                                            className="bg-white border border-[#E2DFD7] p-3 text-xs focus:border-[#161616] text-[#161616] outline-none rounded-none" 
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
                                                            className="w-4 h-4 accent-[#D9381E] cursor-pointer"
                                                        />
                                                        <label htmlFor="diffAddress" className="text-xs text-[#161616] font-semibold cursor-pointer">
                                                            Dirección Alternativa
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        
                                        {deliveryMethod === 'domicilio' && differentDeliveryAddress && (
                                            <div className="flex flex-col gap-1.5 pt-3">
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Dirección de Entrega Alternativa</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ej. Oficina de trabajo, dirección de familiar..."
                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs focus:border-[#161616] text-[#161616] outline-none rounded-none font-sans" 
                                                    value={altDeliveryAddress} 
                                                    onChange={(e) => setAltDeliveryAddress(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Detalle de la Venta e Inventario */}
                                    <div>
                                        <h4 className="font-serif text-xl text-[#161616] border-b border-[#E2DFD7] pb-2 mb-4 font-normal">
                                            4. Detalle de la Venta e Inventario
                                        </h4>

                                        {/* Barcode Fast Scanner Banner */}
                                        <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 flex flex-col md:flex-row items-center gap-4 justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[24px] text-[#D9381E]">barcode_scanner</span>
                                                <div className="text-left">
                                                    <p className="text-xs font-bold text-[#161616] uppercase tracking-wider">Lector de Códigos de Barras SKU</p>
                                                    <p className="text-[10px] text-[#6B6862]">Dispara tu pistola lectora para cargar artículos físicos al instante</p>
                                                </div>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Escanear SKU / Pistola..."
                                                value={barcodeScanInput}
                                                onChange={(e) => setBarcodeScanInput(e.target.value)}
                                                onKeyDown={handleBarcodeScan}
                                                className="bg-white border border-[#E2DFD7] py-2 px-3 text-xs text-[#161616] focus:border-[#161616] outline-none w-full md:w-72 font-mono uppercase rounded-none"
                                            />
                                        </div>

                                        {/* Lista de Items */}
                                        <div className="space-y-3">
                                            {selectedItems.map((item, index) => {
                                                return (
                                                    <div key={index} className="bg-white p-4 border border-[#E2DFD7] space-y-3 transition hover:border-[#161616]">
                                                        <div className="grid grid-cols-1 md:grid-cols-[3.4fr_0.7fr_1.2fr_0.7fr_44px] gap-3 items-end">
                                                            
                                                            {item.productType === 'lens' ? (
                                                                <div className="flex flex-col gap-1 relative">
                                                                    <label className="text-[10px] text-[#161616] font-bold uppercase tracking-wider flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[14px] text-[#D9381E]">visibility</span>
                                                                        CONCEPTO DEL SERVICIO DE LENTES
                                                                    </label>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            value={item.productName || 'Servicio de Lentes'}
                                                                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                                                            className="bg-[#FAF8F5] border border-[#161616] px-3 py-2.5 text-xs text-[#161616] font-bold outline-none h-10 w-full rounded-none font-sans"
                                                                            placeholder="Servicio de Lentes"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 relative">
                                                                    <label className="text-[10px] text-[#6B6862] font-bold uppercase tracking-wider">Artículo del Inventario *</label>
                                                                    <div className="relative">
                                                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6862] text-[16px] pointer-events-none">search</span>
                                                                        <input
                                                                            type="text"
                                                                            placeholder={products.length === 0 ? 'Sin productos en inventario...' : `Buscar entre ${products.length} producto(s)...`}
                                                                            value={item.productSearch}
                                                                            onChange={(e) => handleItemChange(index, 'productSearch', e.target.value)}
                                                                            onBlur={() => setTimeout(() => {
                                                                                if (!item.productId) handleItemChange(index, 'productSearch', '');
                                                                            }, 200)}
                                                                            className={`bg-white border pl-9 pr-8 py-2.5 text-xs focus:border-[#161616] text-[#161616] outline-none h-10 w-full transition rounded-none font-sans ${
                                                                                item.productId ? 'border-[#161616] font-bold bg-[#FAF8F5]' : 'border-[#E2DFD7]'
                                                                            }`}
                                                                            autoComplete="off"
                                                                        />
                                                                        {item.productId && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => { handleItemChange(index, 'productId', ''); handleItemChange(index, 'productSearch', ''); }}
                                                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6862] hover:text-[#D9381E] transition cursor-pointer border-0 bg-transparent p-0"
                                                                                title="Limpiar selección"
                                                                            >
                                                                                <span className="material-symbols-outlined text-[16px]">close</span>
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Dropdown de sugerencias de productos */}
                                                                    {item.productSearch && !item.productId && (() => {
                                                                        const rawQuery = item.productSearch.trim().toLowerCase();
                                                                        if (!rawQuery) return null;
                                                                        const terms = rawQuery.split(/\s+/).filter(Boolean);

                                                                        const suggestions: {
                                                                            productId: string;
                                                                            variantId?: string;
                                                                            variantName?: string;
                                                                            displayName: string;
                                                                            sku?: string;
                                                                            color?: string;
                                                                            brand?: string;
                                                                            material?: string;
                                                                            stock: number;
                                                                            price: number;
                                                                            discountPercentage: number;
                                                                            categoryId?: string;
                                                                        }[] = [];

                                                                        for (const p of products) {
                                                                            if (Array.isArray(p.variants) && p.variants.length > 0) {
                                                                                for (const v of p.variants) {
                                                                                    const varName = v.variant_name || v.name || v.color || v.options || '';
                                                                                    const fullSearchable = `${p.name || ''} ${varName} ${v.sku || p.sku || ''} ${p.brand || ''} ${p.model || ''} ${v.color || p.color || ''} ${p.material || ''} ${p.description || ''}`.toLowerCase();
                                                                                    if (terms.every(t => fullSearchable.includes(t))) {
                                                                                        suggestions.push({
                                                                                            productId: p.id,
                                                                                            variantId: v.id || v.variant_id,
                                                                                            variantName: varName,
                                                                                            displayName: varName ? `${p.name} - Color: ${varName}` : p.name,
                                                                                            sku: v.sku || p.sku || undefined,
                                                                                            color: v.color || varName || p.color || undefined,
                                                                                            brand: p.brand || undefined,
                                                                                            material: p.material || undefined,
                                                                                            stock: v.stock !== undefined && v.stock !== null ? Number(v.stock) : p.stock,
                                                                                            price: v.price ? Number(v.price) : Number(p.price),
                                                                                            discountPercentage: p.promo_discount ? Number(p.promo_discount) : 0,
                                                                                            categoryId: p.category_id || undefined,
                                                                                        });
                                                                                    }
                                                                                }
                                                                            } else if (p.color && p.color.includes(',')) {
                                                                                const colorList = p.color.split(',').map(c => c.trim()).filter(Boolean);
                                                                                for (const col of colorList) {
                                                                                    const fullSearchable = `${p.name || ''} ${col} ${p.sku || ''} ${p.brand || ''} ${p.model || ''} ${p.material || ''} ${p.description || ''}`.toLowerCase();
                                                                                    if (terms.every(t => fullSearchable.includes(t))) {
                                                                                        suggestions.push({
                                                                                            productId: p.id,
                                                                                            variantName: col,
                                                                                            displayName: `${p.name} - Color: ${col}`,
                                                                                            sku: p.sku || undefined,
                                                                                            color: col,
                                                                                            brand: p.brand || undefined,
                                                                                            material: p.material || undefined,
                                                                                            stock: p.stock,
                                                                                            price: Number(p.price),
                                                                                            discountPercentage: p.promo_discount ? Number(p.promo_discount) : 0,
                                                                                            categoryId: p.category_id || undefined,
                                                                                        });
                                                                                    }
                                                                                }
                                                                            } else {
                                                                                const variantsStr = Array.isArray(p.variants)
                                                                                    ? p.variants.map((v: any) => `${v.name || ''} ${v.sku || ''} ${v.options || ''}`).join(' ')
                                                                                    : '';
                                                                                const fullSearchable = `${p.name || ''} ${p.sku || ''} ${p.brand || ''} ${p.model || ''} ${p.color || ''} ${p.material || ''} ${p.style || ''} ${p.description || ''} ${variantsStr}`.toLowerCase();
                                                                                if (terms.every(t => fullSearchable.includes(t))) {
                                                                                    suggestions.push({
                                                                                        productId: p.id,
                                                                                        displayName: p.name,
                                                                                        sku: p.sku || undefined,
                                                                                        color: p.color || undefined,
                                                                                        brand: p.brand || undefined,
                                                                                        material: p.material || undefined,
                                                                                        stock: p.stock,
                                                                                        price: Number(p.price),
                                                                                        discountPercentage: p.promo_discount ? Number(p.promo_discount) : 0,
                                                                                        categoryId: p.category_id || undefined,
                                                                                    });
                                                                                }
                                                                            }
                                                                        }

                                                                        const list = suggestions.slice(0, 20);

                                                                        return (
                                                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#161616] shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-[#E2DFD7] rounded-none">
                                                                                {list.length === 0 ? (
                                                                                    <div className="p-3 text-xs text-[#6B6862] italic text-center">No se encontraron productos coincidentes con ese término.</div>
                                                                                ) : (
                                                                                    list.map((s, sIdx) => (
                                                                                        <button
                                                                                            key={`${s.productId}-${s.variantId || s.color || sIdx}`}
                                                                                            type="button"
                                                                                            onMouseDown={(e) => e.preventDefault()}
                                                                                            onClick={() => {
                                                                                                setSelectedItems(prev => {
                                                                                                    const copy = [...prev];
                                                                                                    copy[index] = {
                                                                                                        ...copy[index],
                                                                                                        productId: s.productId,
                                                                                                        variantId: s.variantId,
                                                                                                        variantName: s.variantName,
                                                                                                        productName: s.displayName,
                                                                                                        productSearch: s.displayName,
                                                                                                        categoryId: s.categoryId || copy[index].categoryId,
                                                                                                        price: s.price,
                                                                                                        discountPercentage: s.discountPercentage
                                                                                                    };
                                                                                                    return copy;
                                                                                                });
                                                                                            }}
                                                                                            className="w-full text-left px-3 py-2.5 hover:bg-[#FAF8F5] flex items-center justify-between gap-2 transition-colors cursor-pointer border-0 bg-transparent"
                                                                                        >
                                                                                            <div>
                                                                                                <p className="text-xs font-bold text-[#161616]">{s.displayName}</p>
                                                                                                <p className="text-[10px] text-[#6B6862]">
                                                                                                    {s.brand ? <span className="font-semibold text-[#161616]">Marca: {s.brand} • </span> : ''}
                                                                                                    {s.sku ? `SKU: ${s.sku} • ` : ''}
                                                                                                    {s.color ? `Color: ${s.color} • ` : ''}
                                                                                                    Stock: <span className={s.stock > 0 ? "text-[#161616] font-semibold" : "text-[#D9381E] font-bold"}>{s.stock}</span>
                                                                                                </p>
                                                                                            </div>
                                                                                            <span className="text-xs font-bold text-[#D9381E] font-mono shrink-0">${s.price.toLocaleString('es-CO')}</span>
                                                                                        </button>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-[10px] text-[#6B6862] font-bold text-center uppercase tracking-wider">Cant.</label>
                                                                <input 
                                                                    type="number" 
                                                                    min={1} 
                                                                    className="bg-white text-center border border-[#E2DFD7] p-2 text-xs focus:border-[#161616] text-[#161616] outline-none w-full h-10 font-mono font-bold rounded-none" 
                                                                    value={item.quantity} 
                                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                                                                    required 
                                                                />
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-[10px] text-[#6B6862] font-bold uppercase tracking-wider">Precio Unit.</label>
                                                                <input 
                                                                    type="number" 
                                                                    className="bg-white border border-[#E2DFD7] p-2 text-xs focus:border-[#161616] text-[#161616] outline-none w-full h-10 font-mono font-bold rounded-none" 
                                                                    value={item.price} 
                                                                    onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                                                                    readOnly={item.productType === 'inventory' && !item.productId}
                                                                    required 
                                                                />
                                                            </div>
                                                            
                                                            <div className="flex flex-col gap-1">
                                                                <label className="text-[10px] text-[#6B6862] font-bold text-center uppercase tracking-wider">% Desc.</label>
                                                                <input 
                                                                    type="number" 
                                                                    min={0} 
                                                                    max={100} 
                                                                    className="bg-white border border-[#E2DFD7] p-2 text-xs focus:border-[#161616] text-[#161616] outline-none w-full h-10 text-center font-mono rounded-none" 
                                                                    value={item.discountPercentage} 
                                                                    onChange={(e) => handleItemChange(index, 'discountPercentage', e.target.value)} 
                                                                />
                                                            </div>

                                                            <div className="flex justify-center items-end pb-0.5">
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleRemoveItem(index)} 
                                                                    className="w-10 h-10 p-0 bg-transparent hover:bg-[#FAF8F5] text-[#6B6862] hover:text-[#D9381E] border border-[#E2DFD7] hover:border-[#161616] cursor-pointer flex items-center justify-center transition rounded-none"
                                                                    title="Eliminar línea"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {item.productType === 'lens' && (
                                                            <div className="mt-3 p-3 bg-[#FAF8F5] border border-[#E2DFD7] grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] text-[#161616] font-bold uppercase tracking-wider">Tipo de Uso</label>
                                                                    <select
                                                                        value={item.lensDesign || ''}
                                                                        onChange={(e) => handleItemChange(index, 'lensDesign', e.target.value)}
                                                                        className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none rounded-none font-sans"
                                                                    >
                                                                        <option value="">-- Seleccionar Uso --</option>
                                                                        <option value="Monofocal">Monofocal</option>
                                                                        <option value="Bifocal">Bifocal</option>
                                                                        <option value="Progresivo">Progresivo</option>
                                                                        <option value="Lectura">Lectura</option>
                                                                        <option value="Deportivo">Deportivo</option>
                                                                        <option value="Trabajo">Trabajo</option>
                                                                        <option value="Sin Especificar">Sin Especificar</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] text-[#161616] font-bold uppercase tracking-wider">Material del Cristal</label>
                                                                    <select
                                                                        value={item.lensMaterial || ''}
                                                                        onChange={(e) => handleItemChange(index, 'lensMaterial', e.target.value)}
                                                                        className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none rounded-none font-sans"
                                                                    >
                                                                        <option value="">-- Seleccionar Material --</option>
                                                                        <option value="CR-39 (Estándar)">CR-39 (Estándar)</option>
                                                                        <option value="Policarbonato">Policarbonato</option>
                                                                        <option value="Alto Índice 1.67">Alto Índice 1.67</option>
                                                                        <option value="Alto Índice 1.74">Alto Índice 1.74</option>
                                                                        <option value="Trivex">Trivex</option>
                                                                        <option value="Cristal Mineral">Cristal Mineral</option>
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <label className="text-[10px] text-[#161616] font-bold uppercase tracking-wider">Tratamiento / Filtro</label>
                                                                    <select
                                                                        value={item.lensTreatment || ''}
                                                                        onChange={(e) => handleItemChange(index, 'lensTreatment', e.target.value)}
                                                                        className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] focus:border-[#161616] outline-none rounded-none font-sans"
                                                                    >
                                                                        <option value="">-- Seleccionar Tratamiento --</option>
                                                                        <option value="Antirreflejo Estándar">Antirreflejo Estándar</option>
                                                                        <option value="Filtro Azul (Blue Block)">Filtro Azul (Blue Block)</option>
                                                                        <option value="Fotocromático (Transitions)">Fotocromático (Transitions)</option>
                                                                        <option value="Antirreflejo + Filtro Azul">Antirreflejo + Filtro Azul</option>
                                                                        <option value="Antirreflejo + Fotocromático">Antirreflejo + Fotocromático</option>
                                                                        <option value="Antirreflejo + Transitions + Filtro Azul">Antirreflejo + Transitions + Filtro Azul</option>
                                                                        <option value="Espejado">Espejado</option>
                                                                        <option value="Polarizado">Polarizado</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-3 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={handleAddItem}
                                                className="bg-white border border-[#E2DFD7] hover:border-[#161616] hover:bg-[#FAF8F5] text-[#161616] text-xs font-bold py-2.5 px-4 rounded-none flex items-center gap-1.5 cursor-pointer transition uppercase tracking-wider"
                                            >
                                                <span className="material-symbols-outlined text-[16px] text-[#D9381E]">add_circle</span>
                                                + AGREGAR OTRO PRODUCTO / LÍNEA
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleAddLensServiceItem}
                                                className="bg-[#161616] hover:bg-[#2c2c2c] text-white text-xs font-bold py-2.5 px-4 rounded-none flex items-center gap-1.5 cursor-pointer transition uppercase tracking-wider shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-[16px] text-[#E2DFD7]">visibility</span>
                                                + AGREGAR SERVICIO DE LENTES
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Columna Derecha: Sidebar con Liquidación y Resumen Live */}
                                <div className="flex flex-col justify-between space-y-6 h-full max-h-full overflow-y-auto custom-scrollbar pr-1 min-h-0 flex-1">
                                    <div className="space-y-4">
                                        {/* Card Resumen de Cliente */}
                                        <div className="bg-white border border-[#E2DFD7] p-5 shadow-sm space-y-3">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6862] block border-b border-[#E2DFD7] pb-2">
                                                CLIENTE ASIGNADO
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-[#161616]">{customerName || 'Consumidor Final / Sin Asignar'}</p>
                                                <p className="text-xs text-[#6B6862] mt-0.5 font-mono">
                                                    {customerDocumentType}: {customerDocumentNumber || '222222222222'}
                                                </p>
                                                {customerPhone && (
                                                    <p className="text-xs text-[#6B6862] font-mono mt-0.5">Tel: +{customerPhone}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Liquidación de Factura */}
                                        <div className="bg-white border border-[#E2DFD7] p-5 shadow-sm space-y-3">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6862] block border-b border-[#E2DFD7] pb-2">
                                                LIQUIDACIÓN DE FACTURA
                                            </span>
                                            
                                            <div className="text-xs space-y-2 text-[#6B6862]">
                                                <div className="flex justify-between items-center">
                                                    <span>Subtotal ({selectedItems.filter(i => i.productId || i.productName).length} ítems):</span>
                                                    <span className="font-mono font-bold text-[#161616]">{formatPrice(subtotalItems)}</span>
                                                </div>

                                                {deliveryMethod === 'domicilio' && (
                                                    <div className="flex justify-between items-center">
                                                        <span>Despacho a Domicilio:</span>
                                                        <span className="font-mono font-bold text-[#161616]">{formatPrice(parseFloat(deliveryFee) || 0)}</span>
                                                    </div>
                                                )}

                                                {clientProfile?.category === 'restaurante' && taxAmount > 0 && (
                                                    <div className="flex justify-between items-center text-[#D9381E]">
                                                        <span>Impuesto ({taxMode === 'impoconsumo_8' ? 'Impoconsumo 8%' : 'IVA 19%'}):</span>
                                                        <span className="font-mono font-bold">{formatPrice(taxAmount)}</span>
                                                    </div>
                                                )}

                                                {clientProfile?.category === 'restaurante' && includeTip && tipAmount > 0 && (
                                                    <div className="flex justify-between items-center">
                                                        <span>Propina Sugerida ({tipPercentage}%):</span>
                                                        <span className="font-mono font-bold text-[#161616]">{formatPrice(tipAmount)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border-t border-[#E2DFD7] pt-4 mt-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6862] block">
                                                    TOTAL A COBRAR
                                                </span>
                                                <div className="font-serif text-3xl font-normal text-[#D9381E] font-mono leading-tight mt-1">
                                                    {formatPrice(totalAmount + (deliveryMethod === 'domicilio' ? parseFloat(deliveryFee) || 0 : 0))}
                                                </div>
                                            </div>

                                            <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 text-xs space-y-1">
                                                <p className="font-bold text-[#161616] uppercase text-[10px] tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px] text-[#D9381E]">account_balance_wallet</span>
                                                    Condición: {paymentMethod.toUpperCase()}
                                                </p>
                                                {paymentMethod === 'credito' && (
                                                    <p className="text-[11px] text-[#6B6862]">
                                                        Abono: <strong className="text-[#161616] font-mono">{formatPrice(parseFloat(abono) || 0)}</strong> • {installmentsCount} cuotas ({installmentFrequency})
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-[#6B6862]">Vence: {dueDate || 'Hoy'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer del Modal */}
                            <div className="modal-bottom px-8 py-4 border-t border-[#E2DFD7] flex flex-wrap items-center justify-end gap-3 bg-[#F6F4EE] shrink-0">
                                <button 
                                    type="button" 
                                    onClick={resetForm}
                                    className="bg-transparent border border-[#E2DFD7] hover:border-[#161616] text-[#161616] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-none cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="bg-[#D9381E] hover:bg-[#b82e18] text-white border-0 px-7 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                                    EMITIR FACTURA DE VENTA 🧾
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* BARRA DE BÚSQUEDA Y FILTROS WABI-SABI */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-[#161616] pb-3 mb-6">
                <div className="relative flex-1 flex items-center min-w-[280px]">
                    <span className="material-symbols-outlined text-[18px] text-[#6B6862] mr-2 shrink-0">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente, N° factura, teléfono o cédula..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-none py-1.5 text-xs text-[#161616] placeholder-[#6B6862] outline-none font-sans"
                    />
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs text-[#161616]">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#6B6862] uppercase tracking-wider font-bold">ESTADO:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="bg-white border border-[#E2DFD7] py-1.5 px-2.5 text-xs text-[#161616] outline-none cursor-pointer rounded-none font-sans"
                        >
                            <option value="all">Todas las Facturas</option>
                            <option value="paid">✅ Pagadas</option>
                            <option value="pending">⏳ Pendientes</option>
                            <option value="overdue">🔴 En Mora</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#6B6862] uppercase tracking-wider font-bold">VENDEDOR:</span>
                        <select
                            value={sellerFilter}
                            onChange={(e) => setSellerFilter(e.target.value)}
                            className="bg-white border border-[#E2DFD7] py-1.5 px-2.5 text-xs text-[#161616] outline-none cursor-pointer rounded-none font-sans"
                        >
                            <option value="all">Todos los Vendedores</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    👤 {emp.name} {emp.last_name || ''} ({emp.role || 'Vendedor'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`px-3 py-1.5 rounded-none border text-xs font-semibold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer ${
                            showAdvancedFilters || dateFrom || dateTo || minAmount || maxAmount
                                ? 'bg-[#161616] text-white border-[#161616]'
                                : 'bg-white border-[#E2DFD7] text-[#161616] hover:border-[#161616]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        Filtros
                    </button>

                    {(searchTerm || statusFilter !== 'all' || sellerFilter !== 'all' || dateFrom || dateTo || minAmount || maxAmount) && (
                        <button
                            onClick={resetFilters}
                            className="px-3 py-1.5 rounded-none bg-[#D9381E] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border-0"
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-[#FAF8F5] border border-[#E2DFD7] mb-6 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#6B6862] font-bold uppercase tracking-wider">Fecha Desde</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#6B6862] font-bold uppercase tracking-wider">Fecha Hasta</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#6B6862] font-bold uppercase tracking-wider">Monto Mínimo ($)</label>
                        <input
                            type="number"
                            placeholder="Ej: 50000"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono rounded-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#6B6862] font-bold uppercase tracking-wider">Monto Máximo ($)</label>
                        <input
                            type="number"
                            placeholder="Ej: 500000"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono rounded-none"
                        />
                    </div>
                </div>
            )}

            {/* TABLA DE FACTURAS WABI-SABI */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : fetchError ? (
                <div className="bg-white border border-[#E2DFD7] p-8 text-center space-y-3">
                    <span className="material-symbols-outlined text-4xl text-[#D9381E]">wifi_off</span>
                    <p className="text-sm font-semibold text-[#D9381E]">{fetchError}</p>
                    <button
                        onClick={() => fetchData()}
                        className="bg-[#161616] hover:bg-[#D9381E] text-white text-xs font-semibold py-2 px-4 rounded-none transition cursor-pointer uppercase tracking-wider border-0"
                    >
                        Reintentar
                    </button>
                </div>
            ) : filteredInvoices.length === 0 ? (
                <div className="bg-white border border-[#E2DFD7] p-12 text-center space-y-2">
                    <span className="material-symbols-outlined text-3xl text-[#6B6862]">receipt_long</span>
                    <p className="text-sm text-[#6B6862]">
                        {invoices.length === 0 ? 'Aún no hay facturas registradas. ¡Crea tu primera factura!' : 'No se encontraron facturas con los filtros seleccionados.'}
                    </p>
                    {(searchTerm || statusFilter !== 'all' || dateFrom || dateTo) && (
                        <button onClick={resetFilters} className="text-xs text-[#D9381E] hover:underline cursor-pointer border-0 bg-transparent font-bold">
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white border border-[#E2DFD7] overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[11px] text-[#6B6862] uppercase tracking-wider font-semibold">
                                <th className="p-4">Factura / Cliente</th>
                                <th className="p-4">WhatsApp</th>
                                <th className="p-4">Monto Total</th>
                                <th className="p-4">Despacho</th>
                                <th className="p-4">Vence</th>
                                <th className="p-4">Estado / Soporte</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2DFD7] text-xs">
                            {filteredInvoices.map((inv) => (
                                <tr 
                                    key={inv.id} 
                                    onClick={() => handleOpenInvoiceDetail(inv)}
                                    className="hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-[#161616] text-xs font-mono bg-[#F6F4EE] py-1 px-2.5 border border-[#E2DFD7] group-hover:border-[#161616] transition shrink-0">
                                                {inv.invoice_number}
                                            </span>
                                            <div>
                                                <p className="font-bold text-[#161616] group-hover:text-[#D9381E] transition">{inv.customer_name}</p>
                                                <p className="text-[10px] text-[#6B6862] flex items-center gap-1 mt-0.5 font-medium">
                                                    <span className="material-symbols-outlined text-[13px] opacity-75">payments</span>
                                                    {inv.payment_method === 'efectivo' || inv.payment_method === 'contado' ? '💵 Efectivo' :
                                                     inv.payment_method === 'transferencia' ? `🏦 Transf. (${inv.transfer_bank || 'Banco'})` :
                                                     inv.payment_method === 'tarjeta_credito' || inv.payment_method === 'tarjeta' ? '💳 Tarjeta Crédito' :
                                                     inv.payment_method === 'tarjeta_debito' ? '💳 Tarjeta Débito' :
                                                     `📋 Crédito (${inv.installments_count || 1} cuotas)`}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-[#6B6862]">+{inv.customer_phone}</td>
                                    <td className="p-4 font-bold text-[#161616] text-xs font-mono">
                                        {formatPrice(parseFloat(inv.total_amount) + parseFloat(inv.delivery_fee || '0'))}
                                    </td>
                                    <td className="p-4 text-xs text-[#6B6862] font-semibold">
                                        <div className="flex items-center gap-1 uppercase text-[10px] tracking-wider">
                                            <span className="material-symbols-outlined text-[15px]">
                                                {inv.delivery_method === 'domicilio' ? 'local_shipping' : 'storefront'}
                                            </span>
                                            {inv.delivery_method === 'domicilio' ? `Envío (${inv.delivery_status})` : 'Local'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs font-medium text-[#6B6862]">
                                        {new Date(inv.due_date).toLocaleDateString('es-CO')}
                                    </td>
                                    <td className="p-4 space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                                inv.status === 'paid' ? 'bg-[#E6F4EA] text-[#1E4620] border border-[#A8DADC]' :
                                                inv.status === 'overdue' ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#F5C6CB]' :
                                                'bg-[#FEF7E0] text-[#7A5A00] border border-[#FEEFC3]'
                                            }`}>
                                                {inv.status === 'paid' ? 'Pagado' : inv.status === 'overdue' ? 'Mora' : 'Pendiente'}
                                            </span>
                                            {inv.payment_receipt_url && (
                                                <span 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLightboxUrl(inv.payment_receipt_url!);
                                                    }}
                                                    className="bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] hover:border-[#161616] px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                                                    title="Ver foto del comprobante de transferencia"
                                                >
                                                    <span className="material-symbols-outlined text-[11px] text-[#D9381E]">receipt_long</span>
                                                    Soporte 📸
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-1.5">
                                            <button 
                                                onClick={() => handleOpenInvoiceDetail(inv)}
                                                className="p-1.5 bg-white hover:bg-[#FAF8F5] text-[#161616] rounded-none transition cursor-pointer flex items-center justify-center border border-[#E2DFD7]"
                                                title="Ver Detalle Completo de Factura"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                            </button>
                                            {inv.status !== 'paid' && (
                                                <>
                                                    <button 
                                                        onClick={() => handlePayInvoice(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 bg-[#E6F4EA] hover:bg-[#c9ebd0] text-[#1E4620] border border-[#A8DADC] rounded-none transition cursor-pointer flex items-center justify-center disabled:opacity-40 font-bold"
                                                        title="Registrar Pago"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">check</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleTriggerCollection(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 bg-white hover:bg-[#FAF8F5] text-[#D9381E] border border-[#E2DFD7] rounded-none transition cursor-pointer flex items-center justify-center disabled:opacity-40"
                                                        title="Enviar Cobro por WhatsApp"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">send</span>
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handlePrintInvoice(inv)}
                                                className="p-1.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] rounded-none transition cursor-pointer flex items-center justify-center"
                                                title="Imprimir Recibo Térmico (80mm)"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">print</span>
                                            </button>
                                            <button 
                                                onClick={() => openAuditModalForInvoice(inv)}
                                                className="p-1.5 bg-white hover:bg-[#FAF8F5] text-amber-600 border border-[#E2DFD7] rounded-none transition cursor-pointer flex items-center justify-center"
                                                title="Ver Historial de Cambios / Auditoría"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">history</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL DETALLE COMPLETO DE FACTURA WABI-SABI */}
            {selectedInvoice && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="relative bg-[#F6F4EE] border border-[#161616] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-none shadow-2xl overflow-hidden animate-fade-in">
                        
                        {/* Header Fijo Sticky del Modal */}
                        <div className="sticky top-0 z-30 bg-[#F6F4EE] border-b border-[#E2DFD7] p-5 sm:p-6 flex items-center justify-between shadow-xs shrink-0">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-sans block">DOCUMENTO DE FACTURACIÓN</span>
                                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                        selectedInvoice.status === 'paid' ? 'bg-[#E6F4EA] text-[#1E4620] border border-[#A8DADC]' :
                                        selectedInvoice.status === 'overdue' ? 'bg-[#FCE8E6] text-[#C5221F] border border-[#F5C6CB]' :
                                        'bg-[#FEF7E0] text-[#7A5A00] border border-[#FEEFC3]'
                                    }`}>
                                        {selectedInvoice.status === 'paid' ? 'PAGADO' : selectedInvoice.status === 'overdue' ? 'VENCIDO' : 'PENDIENTE'}
                                    </span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-serif font-normal text-[#161616] mt-1">
                                    Factura #{selectedInvoice.invoice_number}
                                </h2>
                                <p className="text-xs text-[#6B6862] mt-1">
                                    Emisión: {new Date(selectedInvoice.created_at || Date.now()).toLocaleString('es-CO')} | Vencimiento: {new Date(selectedInvoice.due_date).toLocaleDateString('es-CO')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedInvoice(null)}
                                className="text-[#161616] hover:text-[#D9381E] text-3xl font-light cursor-pointer border-0 bg-transparent leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Cuerpo Escroleable del Modal */}
                        <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar space-y-5 flex-grow bg-[#F6F4EE]">
                            {/* INFORMACIÓN DEL CLIENTE & CONDICIONES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="bg-white border border-[#E2DFD7] p-5 space-y-3">
                                    <h3 className="font-serif text-lg text-[#161616] border-b border-[#E2DFD7] pb-2 font-normal flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px] text-[#D9381E]">person</span>
                                        Información del Cliente
                                    </h3>
                                    <div className="text-xs space-y-2 text-[#6B6862]">
                                        <p><strong className="text-[#161616]">Nombre:</strong> {selectedInvoice.customer_name}</p>
                                        <p><strong className="text-[#161616]">Documento:</strong> {selectedInvoice.customer_document_type || 'CC'} {selectedInvoice.customer_document_number || 'N/A'}</p>
                                        <p><strong className="text-[#161616]">WhatsApp:</strong> <span className="font-mono text-[#161616]">+{selectedInvoice.customer_phone}</span></p>
                                        <p><strong className="text-[#161616]">Email:</strong> <span className="font-mono text-[#161616]">{selectedInvoice.customer_email || 'Sin correo'}</span></p>
                                        {selectedInvoice.customer_address && (
                                            <p className="border-t border-[#E2DFD7] pt-2"><strong className="text-[#161616]">Dirección:</strong> {selectedInvoice.customer_address}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white border border-[#E2DFD7] p-5 space-y-3">
                                    <h3 className="font-serif text-lg text-[#161616] border-b border-[#E2DFD7] pb-2 font-normal flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[18px] text-[#D9381E]">local_shipping</span>
                                        Condiciones de Pago & Logística
                                    </h3>
                                    <div className="text-xs space-y-2 text-[#6B6862]">
                                        <p className="flex items-center gap-2">
                                            <strong className="text-[#161616]">Método de Pago:</strong> 
                                            <span className="uppercase font-bold bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] px-2 py-0.5 text-[10px]">
                                                {selectedInvoice.payment_method || 'Efectivo'}
                                            </span>
                                        </p>
                                        {selectedInvoice.transfer_bank && (
                                            <p><strong className="text-[#161616]">Banco Origen:</strong> {selectedInvoice.transfer_bank}</p>
                                        )}
                                        {selectedInvoice.transfer_destination_account && (
                                            <p><strong className="text-[#161616]">Cuenta Destino:</strong> {selectedInvoice.transfer_destination_account}</p>
                                        )}
                                        {selectedInvoice.installments_count && selectedInvoice.installments_count > 1 && (
                                            <p><strong className="text-[#161616]">Plan Cuotas:</strong> {selectedInvoice.installments_count} cuotas ({selectedInvoice.installment_frequency})</p>
                                        )}
                                        <p><strong className="text-[#161616]">Logística:</strong> {selectedInvoice.delivery_method === 'domicilio' ? '🚚 Envío a Domicilio' : '🏪 Entrega en Tienda / Local'}</p>
                                        {selectedInvoice.delivery_address && (
                                            <p><strong className="text-[#161616]">Dirección Envío:</strong> {selectedInvoice.delivery_address}</p>
                                        )}

                                        <div className="border-t border-[#E2DFD7] pt-2 mt-2 space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <strong className="text-[#161616]">Vendedor Asignado:</strong>
                                                <span className="text-[#D9381E] font-bold">{selectedInvoice.seller_name || 'Sin asignar'}</span>
                                            </div>
                                            <select
                                                value={selectedInvoice.seller_employee_id || ''}
                                                onChange={(e) => handleAssignSellerToInvoice(selectedInvoice.id, e.target.value)}
                                                className="w-full bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer font-medium rounded-none"
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
                            <div className="bg-white border border-[#E2DFD7] p-5 space-y-3">
                                <h3 className="font-serif text-lg text-[#161616] border-b border-[#E2DFD7] pb-2 font-normal flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px] text-[#D9381E]">receipt</span>
                                    Comprobante de Pago / Soporte de Transferencia
                                </h3>

                                {selectedInvoice.payment_receipt_url ? (
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={selectedInvoice.payment_receipt_url}
                                            alt="Comprobante"
                                            onClick={() => setLightboxUrl(selectedInvoice.payment_receipt_url || null)}
                                            className="w-20 h-20 object-cover border border-[#E2DFD7] cursor-pointer hover:border-[#161616] transition"
                                            title="Clic para ampliar"
                                        />
                                        <div className="text-xs space-y-1">
                                            <p className="text-[#1E4620] font-bold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[16px]">check_circle</span> Comprobante Adjunto
                                            </p>
                                            <a
                                                href={selectedInvoice.payment_receipt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#D9381E] hover:underline font-mono text-[11px] block font-bold"
                                            >
                                                Ver foto en tamaño completo ↗
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#6B6862] italic">No hay comprobante de pago adjunto aún a esta factura.</p>
                                )}

                                <div className="flex gap-2 pt-2 border-t border-[#E2DFD7]">
                                    <input
                                        type="text"
                                        placeholder="Pegar URL o enlace de la foto del comprobante..."
                                        value={receiptInputUrl}
                                        onChange={(e) => setReceiptInputUrl(e.target.value)}
                                        className="flex-grow bg-white border border-[#E2DFD7] px-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616] font-medium rounded-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveReceiptUrl}
                                        disabled={isUpdatingReceipt || !receiptInputUrl.trim()}
                                        className="bg-[#161616] hover:bg-[#333333] text-white text-xs font-bold px-4 py-2 rounded-none transition disabled:opacity-50 cursor-pointer shrink-0 uppercase tracking-wider border-0"
                                    >
                                        {isUpdatingReceipt ? 'Guardando...' : 'Guardar Comprobante'}
                                    </button>
                                </div>
                            </div>

                            {/* DETALLE DE ÍTEMS COMPRADOS */}
                            <div className="space-y-3">
                                <h3 className="font-serif text-lg text-[#161616] border-b border-[#E2DFD7] pb-2 font-normal flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px] text-[#D9381E]">shopping_bag</span>
                                    Productos e Ítems de la Factura
                                </h3>
                                {loadingDetail ? (
                                    <div className="py-6 text-center text-xs text-[#6B6862] animate-pulse">Cargando productos de la factura...</div>
                                ) : invoiceDetail?.items?.length > 0 ? (
                                    <div className="bg-white overflow-hidden border border-[#E2DFD7]">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#6B6862] uppercase font-bold tracking-wider text-[11px]">
                                                    <th className="p-3">PRODUCTO / DESCRIPCIÓN</th>
                                                    <th className="p-3 text-center">CANT.</th>
                                                    <th className="p-3 text-right">PRECIO UNIT.</th>
                                                    <th className="p-3 text-right">TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E2DFD7]">
                                                {invoiceDetail.items.map((item: any) => (
                                                    <tr key={item.id} className="hover:bg-[#FAF8F5]">
                                                        <td className="p-3">
                                                            <p className="font-bold text-[#161616]">{item.product_name || item.inventory_name}</p>
                                                            {item.product_type === 'optical_lens' && (
                                                                <div className="flex gap-1.5 mt-1 flex-wrap">
                                                                    {item.lens_design && <span className="bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] text-[9px] px-1.5 py-0.5 font-mono">Diseño: {item.lens_design}</span>}
                                                                    {item.lens_material && <span className="bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] text-[9px] px-1.5 py-0.5 font-mono">Mat: {item.lens_material}</span>}
                                                                    {item.lens_treatment && <span className="bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] text-[9px] px-1.5 py-0.5 font-mono">Trat: {item.lens_treatment}</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center font-mono font-bold text-[#161616]">{item.quantity}</td>
                                                        <td className="p-3 text-right font-mono text-[#6B6862]">{formatPrice(parseFloat(item.price))}</td>
                                                        <td className="p-3 text-right font-bold text-[#161616] font-mono">{formatPrice(parseFloat(item.price) * item.quantity)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-xs text-[#6B6862] italic">No se encontraron ítems detallados.</p>
                                )}
                            </div>
                        </div>

                        {/* Pie Fijo Sticky del Modal con Grid de Botones Wabi-Sabi */}
                        <div className="sticky bottom-0 z-30 bg-[#F6F4EE] border-t border-[#E2DFD7] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg shrink-0">
                            <div className="shrink-0 min-w-[160px]">
                                <p className="text-xs text-[#6B6862]">
                                    Envío Domicilio: <span className="font-semibold text-[#161616]">{formatPrice(parseFloat(selectedInvoice.delivery_fee || '0'))}</span>
                                </p>
                                <span className="text-[10px] text-[#6B6862] uppercase font-bold tracking-wider mt-0.5 block">TOTAL FACTURA</span>
                                <p className="text-2xl sm:text-3xl font-serif font-normal text-[#D9381E] font-mono tracking-tight">
                                    {formatPrice(parseFloat(selectedInvoice.total_amount) + parseFloat(selectedInvoice.delivery_fee || '0'))}
                                </p>
                            </div>

                            {/* Grid 2x3 de Botones de Acción */}
                            <div className="grid grid-cols-3 gap-2 max-w-[460px] shrink-0 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => handleSendInvoiceWhatsApp(selectedInvoice)}
                                    className="bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] font-semibold text-[11px] py-2 px-2.5 rounded-none transition cursor-pointer flex items-center justify-center gap-1 truncate uppercase tracking-wider"
                                    title="Enviar factura por WhatsApp"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0">chat</span>
                                    <span className="truncate">WhatsApp</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSendInvoiceEmail(selectedInvoice)}
                                    className="bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] font-semibold text-[11px] py-2 px-2.5 rounded-none transition cursor-pointer flex items-center justify-center gap-1 truncate uppercase tracking-wider"
                                    title="Enviar factura por Correo Electrónico"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-blue-600 shrink-0">mail</span>
                                    <span className="truncate">Email</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handlePrintInvoice(selectedInvoice)}
                                    className="bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] font-semibold text-[11px] py-2 px-2.5 rounded-none transition cursor-pointer flex items-center justify-center gap-1 truncate uppercase tracking-wider"
                                >
                                    <span className="material-symbols-outlined text-[14px] shrink-0">print</span>
                                    <span className="truncate">Imprimir (80mm)</span>
                                </button>

                                {!selectedInvoice.cufe ? (
                                    <button
                                        type="button"
                                        disabled={generatingElectronicId === selectedInvoice.id}
                                        onClick={() => handleGenerateElectronicInvoice(selectedInvoice.id)}
                                        className="bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-[11px] py-2 px-2.5 rounded-none transition cursor-pointer flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 truncate uppercase tracking-wider border-0"
                                        title="Emitir factura electrónica DIAN oficial"
                                    >
                                        <span className="material-symbols-outlined text-[14px] shrink-0">bolt</span>
                                        <span className="truncate">{generatingElectronicId === selectedInvoice.id ? 'Emitiendo...' : 'Factura DIAN'}</span>
                                    </button>
                                ) : (
                                    <div 
                                        className="bg-[#E6F4EA] text-[#1E4620] border border-[#A8DADC] font-bold text-[11px] py-2 px-2.5 rounded-none flex items-center justify-center gap-1 select-none truncate uppercase tracking-wider"
                                        title="Factura validada ante la DIAN"
                                    >
                                        <span className="material-symbols-outlined text-[14px] shrink-0">verified</span>
                                        <span className="truncate">DIAN OK</span>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handlePrintPOS(selectedInvoice.id)}
                                    className="bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] font-semibold text-[11px] py-2 px-2.5 rounded-none transition cursor-pointer flex items-center justify-center gap-1 truncate uppercase tracking-wider"
                                >
                                    <span className="material-symbols-outlined text-[14px] shrink-0">receipt_long</span>
                                    <span className="truncate">POS (80mm)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedInvoice(null)}
                                    className="bg-[#161616] hover:bg-[#333333] border-0 text-white font-semibold text-[11px] py-2 px-2.5 rounded-none transition cursor-pointer text-center truncate uppercase tracking-wider"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DE UPGRADE A PLAN PRO (FEATURE GATING) WABI-SABI */}
            {showUpgradeModal && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
                    <div className="bg-[#F6F4EE] border border-[#161616] rounded-none max-w-lg w-full p-8 space-y-6 shadow-2xl relative animate-fade-in max-h-[85vh] overflow-y-auto custom-scrollbar my-auto text-left">
                        <div className="text-center space-y-2">
                            <div className="w-14 h-14 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none flex items-center justify-center mx-auto text-[#D9381E] shadow-sm">
                                <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                            </div>
                            <span className="text-[10px] font-bold text-[#D9381E] uppercase tracking-widest block">FEATURE GATING</span>
                            <h3 className="text-2xl font-serif text-[#161616] font-normal">Límite del Plan Básico Alcanzado</h3>
                            <p className="text-xs text-[#6B6862] max-w-sm mx-auto">
                                Has emitido las 10 Facturas Electrónicas incluidas de este mes. Pásate al <strong className="text-[#161616]">Plan Pro</strong> para disfrutar de emisión ilimitada ante la DIAN.
                            </p>
                        </div>

                        <div className="bg-white border border-[#E2DFD7] p-5 space-y-3">
                            <div className="flex items-center gap-2.5 text-xs text-[#161616] font-medium">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                                Facturación Electrónica DIAN Ilimitada con CUFE & QR
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-[#161616] font-medium">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                                Envío automático de PDF por WhatsApp a tus clientes
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-[#161616] font-medium">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                                Impresiones Térmicas POS 80mm ilimitadas
                            </div>
                            <div className="flex items-center gap-2.5 text-xs text-[#161616] font-medium">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                                Soporte técnico prioritario 24/7 para habilitación fiscal
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    alert('🚀 ¡Solicitud enviada! Nuestro equipo se pondrá en contacto para activar tu Plan Pro.');
                                    setShowUpgradeModal(false);
                                }}
                                className="flex-1 bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-xs py-3 rounded-none transition text-center cursor-pointer shadow-sm uppercase tracking-wider border-0"
                            >
                                Actualizar a Plan Pro Ahora
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowUpgradeModal(false)}
                                className="px-5 py-3 bg-transparent hover:bg-[#FAF8F5] border border-[#E2DFD7] text-[#161616] font-semibold text-xs rounded-none transition cursor-pointer uppercase tracking-wider"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* LIGHTBOX FULLSCREEN PARA FOTO DE COMPROBANTE WABI-SABI */}
            {lightboxUrl && createPortal(
                <div 
                    onClick={() => setLightboxUrl(null)}
                    className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#161616]/85 backdrop-blur-md p-4 cursor-pointer animate-fade-in"
                >
                    <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute -top-10 right-0 text-white hover:text-[#D9381E] text-xs font-bold flex items-center gap-1 bg-[#161616] px-3 py-1.5 rounded-none border border-[#E2DFD7] cursor-pointer shadow-lg uppercase tracking-wider"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            Cerrar [ESC]
                        </button>
                        <img
                            src={lightboxUrl}
                            alt="Comprobante de Pago Completo"
                            className="max-w-full max-h-[85vh] object-contain rounded-none shadow-2xl border border-[#E2DFD7]"
                        />
                        <div className="mt-3 text-center">
                            <a
                                href={lightboxUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[#F6F4EE] hover:text-[#D9381E] font-semibold inline-flex items-center gap-1 transition"
                            >
                                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                Abrir imagen en pestaña nueva
                            </a>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL POPUP CREACIÓN RÁPIDA DE CLIENTE (createPortal) */}
            {isQuickCustomerOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-xs flex items-center justify-center z-[100000] p-4">
                    <div className="bg-[#F6F4EE] border border-[#161616] max-w-lg w-full rounded-none p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] tracking-widest block">FACTURACIÓN RÁPIDA</span>
                                <h3 className="font-serif font-bold text-xl text-[#161616]">
                                    {quickCustType === 'empresa' ? 'Registrar Empresa Cliente' : 'Registrar Cliente Nuevo'}
                                </h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsQuickCustomerOpen(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[#E2DFD7] transition border-0 cursor-pointer text-[#161616]"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {quickCustError && (
                            <div className="mb-4 p-3 bg-[#FFF5F5] border-l-4 border-[#D9381E] text-xs text-[#D9381E] font-mono">
                                {quickCustError}
                            </div>
                        )}

                        <form onSubmit={handleSaveQuickCustomer} className="space-y-4">
                            {/* Selector Persona vs Empresa */}
                            <div className="flex bg-white border border-[#E2DFD7] p-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuickCustType('persona');
                                        if (quickCustDocType === 'NIT') setQuickCustDocType('CC');
                                    }}
                                    className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase transition border-0 cursor-pointer ${
                                        quickCustType === 'persona' ? 'bg-[#161616] text-[#F6F4EE]' : 'bg-transparent text-[#76746E] hover:text-[#161616]'
                                    }`}
                                >
                                    👤 Persona Natural
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuickCustType('empresa');
                                        setQuickCustDocType('NIT');
                                    }}
                                    className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase transition border-0 cursor-pointer ${
                                        quickCustType === 'empresa' ? 'bg-[#161616] text-[#F6F4EE]' : 'bg-transparent text-[#76746E] hover:text-[#161616]'
                                    }`}
                                >
                                    🏢 Empresa (NIT)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase mb-1">
                                        {quickCustType === 'empresa' ? 'Razón Social / Nombre Empresa *' : 'Nombre *'}
                                    </label>
                                    <input 
                                        type="text"
                                        value={quickCustName}
                                        onChange={(e) => setQuickCustName(e.target.value)}
                                        placeholder={quickCustType === 'empresa' ? 'Ej: Distribuidora S.A.S.' : 'Ej: Juan Pablo'}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-sans font-semibold rounded-none"
                                        required
                                    />
                                </div>

                                {quickCustType === 'persona' && (
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase mb-1">Apellidos</label>
                                        <input 
                                            type="text"
                                            value={quickCustLastName}
                                            onChange={(e) => setQuickCustLastName(e.target.value)}
                                            placeholder="Ej: Pérez Gómez"
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-sans rounded-none"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase mb-1">Tipo Documento</label>
                                    <select
                                        value={quickCustDocType}
                                        onChange={(e) => setQuickCustDocType(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono font-bold rounded-none cursor-pointer"
                                    >
                                        <option value="CC">Cédula (CC)</option>
                                        <option value="NIT">NIT (Empresa)</option>
                                        <option value="CE">Cédula Extranjería (CE)</option>
                                        <option value="PP">Pasaporte (PP)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase mb-1">Número Documento *</label>
                                    <input 
                                        type="text"
                                        value={quickCustDocNum}
                                        onChange={(e) => setQuickCustDocNum(e.target.value)}
                                        placeholder="Ej: 1020304050"
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono font-bold rounded-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase mb-1">WhatsApp / Teléfono *</label>
                                    <input 
                                        type="text"
                                        value={quickCustPhone}
                                        onChange={(e) => setQuickCustPhone(e.target.value)}
                                        placeholder="Ej: 573001234567"
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono rounded-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase mb-1">Correo Electrónico</label>
                                    <input 
                                        type="email"
                                        value={quickCustEmail}
                                        onChange={(e) => setQuickCustEmail(e.target.value)}
                                        placeholder="cliente@correo.com"
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-sans rounded-none"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase mb-1">Dirección de Residencia / Empresa</label>
                                    <input 
                                        type="text"
                                        value={quickCustAddress}
                                        onChange={(e) => setQuickCustAddress(e.target.value)}
                                        placeholder="Calle / Carrera / Ciudad..."
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-sans rounded-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-[#E2DFD7] pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsQuickCustomerOpen(false)}
                                    className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#76746E] hover:text-[#161616] bg-transparent border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={quickCustSaving}
                                    className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-[#D9381E] text-white hover:bg-[#b82a13] transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border-0"
                                >
                                    {quickCustSaving ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                            Guardar y Asignar a Factura
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            {/* Modal de Historial de Auditoría Contextual por Factura */}
            <AuditLogModal
                isOpen={auditModalOpen}
                onClose={() => setAuditModalOpen(false)}
                clientId={clientId}
                title={auditModalTitle}
                subtitle={auditModalSubtitle}
                entityType={auditEntityType}
                entityId={auditEntityId}
                module="Facturación"
            />
        </div>
    );
};
