import React, { useState, useEffect } from 'react';

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
    created_at: string;
}

interface Product {
    id: string;
    name: string;
    price: string;
    stock: number;
}

interface InvoiceItemInput {
    productId: string;
    quantity: number;
    price: number;
}

interface SaaSErpInvoicesProps {
    clientId: string;
}

export const SaaSErpInvoices: React.FC<SaaSErpInvoicesProps> = ({ clientId }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
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
    const [dueDate, setDueDate] = useState('');
    const [selectedItems, setSelectedItems] = useState<InvoiceItemInput[]>([]);

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, prodRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/invoices`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/products`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const invData = await invRes.json();
            const prodData = await prodRes.json();

            if (invData.success) setInvoices(invData.invoices || []);
            if (prodData.success) setProducts(prodData.products || []);
        } catch (err) {
            console.error("Error loading invoices data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Generar un número de factura correlativo simulado
        setInvoiceNumber(`F-${Math.floor(100 + Math.random() * 900)}`);
    }, [clientId]);

    const handleAddItem = () => {
        setSelectedItems([...selectedItems, { productId: '', quantity: 1, price: 0 }]);
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
                item.price = parseFloat(selectedProd.price);
            }
        } else if (field === 'quantity') {
            item.quantity = Math.max(1, parseInt(value) || 1);
        } else if (field === 'price') {
            item.price = Math.max(0, parseFloat(value) || 0);
        }

        copy[index] = item;
        setSelectedItems(copy);
    };

    const totalAmount = selectedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedItems.length === 0) {
            alert('Agrega al menos un producto a la factura.');
            return;
        }

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
            items: selectedItems
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

    const resetForm = () => {
        setInvoiceNumber(`F-${Math.floor(100 + Math.random() * 900)}`);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerDocumentNumber('');
        setCustomerEmail('');
        setCustomerAddress('');
        setDueDate('');
        setSelectedItems([]);
        setIsFormOpen(false);
    };

    const formatPrice = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0
        }).format(num);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Facturación y Cartera (Cobros)</h2>
                    <p className="text-xs text-gray-400">Emite facturas y gestiona la cartera del negocio con alertas de WhatsApp.</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsFormOpen(true); }}
                    className="bg-[#0a5cff] hover:bg-[#0047d4] text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Crear Factura
                </button>
            </div>

            {isFormOpen && (
                <div className="bg-[#0d1527] border border-white/10 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Generar Nueva Factura</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Datos del cliente */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Factura N° *</label>
                                <input type="text" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Fecha de Vencimiento *</label>
                                <input type="date" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition text-gray-300" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Nombre del Paciente / Cliente *</label>
                                <input type="text" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Documento de Identidad *</label>
                                <div className="flex gap-1">
                                    <select className="bg-white/5 border border-white/10 rounded-xl px-2 text-xs focus:border-[#0a5cff] outline-none text-gray-300" value={customerDocumentType} onChange={(e) => setCustomerDocumentType(e.target.value)}>
                                        <option value="CC" className="bg-[#070b13]">CC</option>
                                        <option value="NIT" className="bg-[#070b13]">NIT</option>
                                        <option value="CE" className="bg-[#070b13]">CE</option>
                                    </select>
                                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition" value={customerDocumentNumber} onChange={(e) => setCustomerDocumentNumber(e.target.value)} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">WhatsApp (con código de país, ej: 57300...) *</label>
                                <input type="text" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-gray-400 font-medium">Correo Electrónico *</label>
                                <input type="email" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                            </div>
                            <div className="flex flex-col gap-1.5 md:col-span-3">
                                <label className="text-xs text-gray-400 font-medium">Dirección</label>
                                <input type="text" className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-[#0a5cff] outline-none transition" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                            </div>
                        </div>

                        {/* Items / Detalle */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Detalle de Productos / Monturas</h4>
                                <button type="button" onClick={handleAddItem} className="bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] font-bold py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer">
                                    <span className="material-symbols-outlined text-[14px]">add</span>
                                    Agregar Línea
                                </button>
                            </div>

                            {selectedItems.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="md:col-span-6 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-400">Producto / Lente</label>
                                        <select className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs focus:border-[#0a5cff] outline-none text-gray-300" value={item.productId} onChange={(e) => handleItemChange(index, 'productId', e.target.value)} required>
                                            <option value="" className="bg-[#070b13]">-- Selecciona --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id} className="bg-[#070b13]">
                                                    {p.name} (Stock: {p.stock} uds) - {formatPrice(p.price)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-400">Cant.</label>
                                        <input type="number" min={1} className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs focus:border-[#0a5cff] outline-none" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required />
                                    </div>
                                    <div className="md:col-span-3 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-400">Precio Unitario</label>
                                        <input type="number" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs focus:border-[#0a5cff] outline-none" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} required />
                                    </div>
                                    <div className="md:col-span-1 flex justify-center pb-1">
                                        <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer">
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total y Botones */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/10 pt-4">
                            <div className="text-left">
                                <p className="text-xs text-gray-400">Total Facturado:</p>
                                <p className="text-2xl font-black text-[#0a5cff]">{formatPrice(totalAmount)}</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={resetForm} className="bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" className="bg-[#0a5cff] hover:bg-[#0047d4] text-white text-xs font-bold py-2 px-4 rounded-xl transition cursor-pointer shadow-lg shadow-[#0a5cff]/20">
                                    Emitir Factura
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-[#0a5cff] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : invoices.length === 0 ? (
                <div className="bg-[#090d16] border border-white/5 p-12 text-center rounded-2xl">
                    <p className="text-sm text-gray-500">No hay facturas o cobros registrados en la base de datos aún.</p>
                </div>
            ) : (
                <div className="bg-[#0d1527]/50 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/10 text-xs text-gray-400 uppercase font-bold">
                                <th className="p-4">Factura / Paciente</th>
                                <th className="p-4">WhatsApp</th>
                                <th className="p-4">Monto</th>
                                <th className="p-4">Vence</th>
                                <th className="p-4">Estado / Notif.</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-xs font-mono bg-white/5 py-1 px-2 rounded-lg border border-white/5">
                                                {inv.invoice_number}
                                            </span>
                                            <p className="font-bold text-white">{inv.customer_name}</p>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-xs">+{inv.customer_phone}</td>
                                    <td className="p-4 font-semibold text-white">{formatPrice(inv.total_amount)}</td>
                                    <td className="p-4 text-xs font-medium text-gray-300">
                                        {new Date(inv.due_date).toLocaleDateString('es-CO')}
                                    </td>
                                    <td className="p-4 space-y-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                inv.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                                                inv.status === 'overdue' ? 'bg-red-500/10 text-red-400' :
                                                'bg-yellow-500/10 text-yellow-400'
                                            }`}>
                                                {inv.status === 'paid' ? 'Pagado' : inv.status === 'overdue' ? 'Mora' : 'Pendiente'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 text-[10px] text-gray-400 font-mono">
                                            <span>Recordatorio: {inv.reminder_sent ? '✅' : '❌'}</span>
                                            <span>Mora: {inv.overdue_sent ? '✅' : '❌'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-1.5">
                                            {inv.status !== 'paid' && (
                                                <>
                                                    <button 
                                                        onClick={() => handlePayInvoice(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition cursor-pointer flex items-center justify-center disabled:opacity-40"
                                                        title="Registrar Pago"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleTriggerCollection(inv.id)}
                                                        disabled={actionLoadingId === inv.id}
                                                        className="p-1.5 bg-[#0a5cff]/10 hover:bg-[#0a5cff]/20 text-[#0a5cff] rounded-lg transition cursor-pointer flex items-center justify-center disabled:opacity-40"
                                                        title="Enviar Cobro por WhatsApp"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">send</span>
                                                    </button>
                                                </>
                                            )}
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
