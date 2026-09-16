import React, { useState, useEffect, useRef } from 'react';
import { authFetch as fetch } from '../utils/api';

interface HistoricalInvoicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    onSuccess: () => void;
    currentNextInvoiceNumber?: string;
}

export const HistoricalInvoicesModal: React.FC<HistoricalInvoicesModalProps> = ({
    isOpen,
    onClose,
    clientId,
    onSuccess,
    currentNextInvoiceNumber = 'FV-1001'
}) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'ocr'>('manual');

    // --- ESTADO CLIENTES CRM Y AUTOCOMPLETADO ---
    const [crmCustomers, setCrmCustomers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
    const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState<boolean>(false);

    // Formulario Registrar Nuevo Cliente (Idéntico a CRM Directorio)
    const [quickCustType, _setQuickCustType] = useState<'persona' | 'empresa'>('persona');
    const [quickCustName, setQuickCustName] = useState<string>('');
    const [quickCustLastName, setQuickCustLastName] = useState<string>('');
    const [quickCustDocType, setQuickCustDocType] = useState<string>('CC');
    const [quickCustDocNum, setQuickCustDocNum] = useState<string>('');
    const [quickCustPhone, setQuickCustPhone] = useState<string>('');
    const [quickCustEmail, setQuickCustEmail] = useState<string>('');
    const [quickCustAddress, setQuickCustAddress] = useState<string>('');
    
    // Campos de Prescripción Óptica (Fórmula Oftálmica)
    const [odEsf, setOdEsf] = useState('');
    const [odCil, setOdCil] = useState('');
    const [odEje, setOdEje] = useState('');
    const [odAdi, setOdAdi] = useState('');
    const [odPrism, setOdPrism] = useState('');
    const [odAv, setOdAv] = useState('');

    const [oiEsf, setOiEsf] = useState('');
    const [oiCil, setOiCil] = useState('');
    const [oiEje, setOiEje] = useState('');
    const [oiAdi, setOiAdi] = useState('');
    const [oiPrism, setOiPrism] = useState('');
    const [oiAv, setOiAv] = useState('');

    const [dp, setDp] = useState('');
    const [savingQuickCust, setSavingQuickCust] = useState<boolean>(false);

    // --- ESTADO TAB 1: MANUAL SECUENCIAL ---
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
    const [selectedMonth, setSelectedMonth] = useState<string>(() => {
        const m = new Date().getMonth() + 1;
        return m < 10 ? `0${m}` : String(m);
    });
    const [consecutive, setConsecutive] = useState<string>(currentNextInvoiceNumber || 'FV-1501');
    const [day, setDay] = useState<string>('01');
    const [customerName, setCustomerName] = useState<string>('');
    const [customerDoc, setCustomerDoc] = useState<string>('');
    const [customerPhone, setCustomerPhone] = useState<string>('');
    const [itemDescription, setItemDescription] = useState<string>('Venta Factura Antigua');
    const [totalAmount, setTotalAmount] = useState<string>('');
    const [savingManual, setSavingManual] = useState<boolean>(false);
    const [manualLogs, setManualLogs] = useState<Array<{ num: string; date: string; customer: string; amount: number }>>([]);
    const dayInputRef = useRef<HTMLInputElement>(null);

    // --- ESTADO TAB 2: ESCÁNER IA ---
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [analyzingOcr, setAnalyzingOcr] = useState<boolean>(false);
    const [ocrResults, setOcrResults] = useState<any[]>([]);
    const [confirmingBatch, setConfirmingBatch] = useState<boolean>(false);
    const [ocrError, setOcrError] = useState<string | null>(null);

    // Cargar clientes CRM al abrir modal
    useEffect(() => {
        if (isOpen && clientId) {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
            fetch(`/api/clients/${clientId}/crm-customers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && Array.isArray(data.customers)) {
                        setCrmCustomers(data.customers);
                    }
                })
                .catch(err => console.warn('[HistoricalModal] Error al cargar clientes CRM:', err));
        }
    }, [isOpen, clientId]);

    if (!isOpen) return null;

    // Incrementar consecutivo numérico manteniendo prefijo
    const incrementConsecutive = (current: string) => {
        const match = current.match(/(\d+)/);
        if (!match) return current;
        const numStr = match[1];
        const prefixMatch = current.match(/^([^\d]+)/);
        const prefix = prefixMatch ? prefixMatch[1] : 'FV-';
        const nextNum = parseInt(numStr, 10) + 1;
        const padded = String(nextNum).padStart(numStr.length, '0');
        return `${prefix}${padded}`;
    };

    // Clientes filtrados para autocompletado
    const filteredCustomers = crmCustomers.filter(c => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return false;
        const fullName = `${c.name || ''} ${c.last_name || ''}`.toLowerCase();
        const doc = (c.document_number || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        return fullName.includes(query) || doc.includes(query) || phone.includes(query);
    });

    const selectCustomer = (c: any) => {
        const fullName = `${c.name || ''} ${c.last_name || ''}`.trim();
        setCustomerName(fullName);
        setCustomerDoc(c.document_number || '');
        setCustomerPhone(c.phone || '');
        setSearchQuery('');
        setShowCustomerDropdown(false);
    };

    // Crear cliente rápido en el CRM (Homologado con CRM Directorio)
    const handleCreateQuickCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickCustName || !quickCustPhone || !quickCustDocNum) {
            alert('Por favor completa el Nombre, Número de Identificación y Teléfono.');
            return;
        }

        setSavingQuickCust(true);
        try {
            const rxObject = {
                od: { esf: odEsf, cil: odCil, eje: odEje, adi: odAdi, prism: odPrism, av: odAv },
                oi: { esf: oiEsf, cil: oiCil, eje: oiEje, adi: oiAdi, prism: oiPrism, av: oiAv },
                dp: dp
            };

            const hasRx = Boolean(odEsf || oiEsf || odCil || oiCil);
            const prescriptionValue = hasRx ? JSON.stringify(rxObject) : null;

            const body = {
                name: quickCustName.trim(),
                last_name: quickCustLastName.trim(),
                document_type: quickCustDocType,
                document_number: quickCustDocNum.trim(),
                phone: quickCustPhone.trim(),
                email: quickCustEmail.trim() || null,
                address: quickCustAddress.trim() || null,
                lens_prescription: prescriptionValue,
                customer_type: quickCustType
            };

            const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
            const res = await fetch(`/api/clients/${clientId}/crm-customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const json = await res.json();

            const targetCustomer = json.customer || json.data;

            if (json.success && targetCustomer) {
                const newCustomer = targetCustomer;

                // Si hay fórmula óptica, registrar también en tabla de formulas
                if (hasRx) {
                    try {
                        await fetch(`/api/clients/${clientId}/formulas`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                customerId: newCustomer.id,
                                odSphere: odEsf || null,
                                odCylinder: odCil || null,
                                odAxis: odEje || null,
                                odAddition: odAdi || null,
                                oiSphere: oiEsf || null,
                                oiCylinder: oiCil || null,
                                oiAxis: oiEje || null,
                                oiAddition: oiAdi || null,
                                dpDistance: dp || null,
                                notes: 'Registrado desde Facturación / Históricas'
                            })
                        });
                    } catch (rxErr) {
                        console.warn('[QuickCustomer] Advertencia guardando tabla de formulas:', rxErr);
                    }
                }

                setCrmCustomers(prev => [newCustomer, ...prev.filter(c => c.id !== newCustomer.id)]);
                selectCustomer(newCustomer);
                setIsQuickCustomerOpen(false);

                // Reset de todos los campos del formulario
                setQuickCustName('');
                setQuickCustLastName('');
                setQuickCustDocNum('');
                setQuickCustPhone('');
                setQuickCustEmail('');
                setQuickCustAddress('');
                setOdEsf(''); setOdCil(''); setOdEje(''); setOdAdi(''); setOdPrism(''); setOdAv('');
                setOiEsf(''); setOiCil(''); setOiEje(''); setOiAdi(''); setOiPrism(''); setOiAv('');
                setDp('');
            } else if (json.existingCustomer) {
                const existing = json.existingCustomer;
                const useExisting = window.confirm(
                    `${json.error}\n\n¿Deseas seleccionar a este cliente existente (${existing.name} ${existing.last_name || ''}) para continuar con la factura?`
                );
                if (useExisting) {
                    setCrmCustomers(prev => [existing, ...prev.filter(c => c.id !== existing.id)]);
                    selectCustomer(existing);
                    setIsQuickCustomerOpen(false);
                    setQuickCustName('');
                    setQuickCustLastName('');
                    setQuickCustDocNum('');
                    setQuickCustPhone('');
                    setQuickCustEmail('');
                    setQuickCustAddress('');
                }
            } else {
                alert(`Error al registrar cliente: ${json.error || 'Error desconocido'}`);
            }
        } catch (err: any) {
            alert(`Error de red: ${err.message}`);
        } finally {
            setSavingQuickCust(false);
        }
    };

    // Manejo de guardado rápido manual (Tab 1)
    const handleSaveManualInvoice = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!day || !customerName || !totalAmount) {
            alert('Por favor completa el Día, Nombre del Cliente y el Valor Total.');
            return;
        }

        const paddedDay = day.length === 1 ? `0${day}` : day;
        const issueDateStr = `${selectedYear}-${selectedMonth}-${paddedDay}`;
        const cleanTotal = parseFloat(totalAmount) || 0;

        setSavingManual(true);
        try {
            const body = {
                invoiceNumber: consecutive,
                issueDate: issueDateStr,
                isHistorical: true, // Omite descuento de inventario
                customerName: customerName.trim(),
                customerDocumentType: 'CC',
                customerDocumentNumber: customerDoc.trim(),
                customerPhone: customerPhone.trim(),
                customerEmail: '',
                customerAddress: '',
                totalAmount: cleanTotal,
                dueDate: issueDateStr,
                paymentMethod: 'efectivo',
                items: [{
                    productName: itemDescription || 'Venta Factura Antigua',
                    quantity: 1,
                    price: cleanTotal,
                    productType: 'inventory'
                }]
            };

            const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
            const res = await fetch(`/api/clients/${clientId}/invoices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const json = await res.json();

            if (json.success) {
                setManualLogs(prev => [
                    { num: consecutive, date: issueDateStr, customer: customerName, amount: cleanTotal },
                    ...prev
                ]);
                // Auto-incrementar consecutivo
                setConsecutive(prev => incrementConsecutive(prev));
                // Limpiar datos del cliente/monto pero mantener día o reenfocar día
                setCustomerName('');
                setCustomerDoc('');
                setCustomerPhone('');
                setTotalAmount('');
                onSuccess();
                setTimeout(() => {
                    dayInputRef.current?.focus();
                }, 100);
            } else {
                alert(`Error al guardar la factura: ${json.error || 'Error desconocido'}`);
            }
        } catch (err: any) {
            alert(`Error de red: ${err.message}`);
        } finally {
            setSavingManual(false);
        }
    };

    // Manejar selección de archivos (Tab 2)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setFilePreviews(prev => [...prev, ev.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    // Analizar lote con IA (Tab 2)
    const handleAnalyzeOcrBatch = async () => {
        if (filePreviews.length === 0) {
            alert('Por favor sube al menos una foto de factura.');
            return;
        }

        setAnalyzingOcr(true);
        setOcrError(null);
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
            const res = await fetch(`/api/clients/${clientId}/invoices/ocr-scan-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ images: filePreviews })
            });
            const json = await res.json();

            if (json.success && Array.isArray(json.invoices)) {
                setOcrResults(json.invoices);
            } else {
                setOcrError(json.error || 'Error al analizar las imágenes con la IA.');
            }
        } catch (err: any) {
            setOcrError(`Error de conexión: ${err.message}`);
        } finally {
            setAnalyzingOcr(false);
        }
    };

    // Confirmar e importar lote OCR (Tab 2)
    const handleConfirmBatch = async () => {
        if (ocrResults.length === 0) return;

        setConfirmingBatch(true);
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
            const res = await fetch(`/api/clients/${clientId}/invoices/batch-confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ invoices: ocrResults })
            });
            const json = await res.json();

            if (json.success) {
                alert(`✅ Se registraron exitosamente ${json.count} facturas históricas con sus clientes y fórmulas en el sistema.`);
                onSuccess();
                onClose();
            } else {
                alert(`Error al guardar el lote: ${json.error || 'Error desconocido'}`);
            }
        } catch (err: any) {
            alert(`Error de red: ${err.message}`);
        } finally {
            setConfirmingBatch(false);
        }
    };

    // Actualizar fila OCR directamente
    const updateOcrField = (index: number, field: string, value: any) => {
        setOcrResults(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // Eliminar fila de OCR
    const removeOcrRow = (index: number) => {
        setOcrResults(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#FAF8F5] border border-[#E2DFD7] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] font-sans relative">
                
                {/* Header del Modal */}
                <div className="bg-[#161616] text-[#F9F6F0] p-5 flex items-center justify-between border-b border-[#2C2C2C]">
                    <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#C8A968] block">Módulo de Carga Histórica</span>
                        <h2 className="text-xl font-serif font-bold text-[#F9F6F0]">🏛️ Importar Facturas Antiguas</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-[#9E9E9E] hover:text-white text-xl font-bold transition p-1 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs de Navegación */}
                <div className="flex border-b border-[#E2DFD7] bg-white">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3.5 px-5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === 'manual' 
                                ? 'border-[#161616] text-[#161616] bg-[#FAF8F5]' 
                                : 'border-transparent text-[#6B6862] hover:text-[#161616]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">keyboard</span>
                        1. Digitación Secuencial Rápida
                    </button>
                    <button
                        onClick={() => setActiveTab('ocr')}
                        className={`flex-1 py-3.5 px-5 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                            activeTab === 'ocr' 
                                ? 'border-[#161616] text-[#161616] bg-[#FAF8F5]' 
                                : 'border-transparent text-[#6B6862] hover:text-[#161616]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">photo_camera</span>
                        2. Escáner Masivo por IA (Fotos)
                    </button>
                </div>

                {/* Contenido Modal */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">

                    {/* ================= PESTAÑA 1: MANUAL SECUENCIAL ================= */}
                    {activeTab === 'manual' && (
                        <div className="space-y-6">
                            {/* Barra Superior de Contexto Fijo */}
                            <div className="bg-white p-4 border border-[#E2DFD7] rounded-none grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Año de las Facturas</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs font-bold text-[#161616] outline-none"
                                    >
                                        {[2024, 2025, 2026].map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Mes del Lote</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs font-bold text-[#161616] outline-none"
                                    >
                                        <option value="01">Enero</option>
                                        <option value="02">Febrero</option>
                                        <option value="03">Marzo</option>
                                        <option value="04">Abril</option>
                                        <option value="05">Mayo</option>
                                        <option value="06">Junio</option>
                                        <option value="07">Julio</option>
                                        <option value="08">Agosto</option>
                                        <option value="09">Septiembre</option>
                                        <option value="10">Octubre</option>
                                        <option value="11">Noviembre</option>
                                        <option value="12">Diciembre</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Consecutivo Actual</label>
                                    <input
                                        type="text"
                                        value={consecutive}
                                        onChange={(e) => setConsecutive(e.target.value)}
                                        className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs font-mono font-bold text-[#161616] outline-none"
                                    />
                                </div>
                            </div>

                            {/* Formulario Rápido Entrada de Datos */}
                            <form onSubmit={handleSaveManualInvoice} className="bg-white p-5 border border-[#E2DFD7] space-y-4 shadow-sm relative">
                                <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#161616]">
                                        Registrar Factura N° {consecutive} ({selectedYear}-{selectedMonth}-{day})
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsQuickCustomerOpen(true)}
                                            className="text-[11px] font-bold text-[#C8A968] hover:text-[#B39353] bg-[#FAF8F5] border border-[#E2DFD7] px-2.5 py-1 uppercase tracking-wider transition flex items-center gap-1 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">person_add</span>
                                            + Crear Cliente CRM
                                        </button>
                                        <span className="text-[10px] text-[#2E7D32] bg-[#E8F5E9] font-bold px-2 py-1 rounded">
                                            🛡️ Sin descuento de stock
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Día del Mes *</label>
                                        <input
                                            ref={dayInputRef}
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={day}
                                            onChange={(e) => setDay(e.target.value)}
                                            className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs font-mono font-bold text-[#161616] outline-none focus:border-[#161616]"
                                            required
                                        />
                                    </div>

                                    {/* Búsqueda Autocompletado de Cliente */}
                                    <div className="md:col-span-2 relative">
                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">
                                            Nombre Cliente * (Buscar en CRM)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o tipea uno nuevo..."
                                            value={customerName}
                                            onChange={(e) => {
                                                setCustomerName(e.target.value);
                                                setSearchQuery(e.target.value);
                                                setShowCustomerDropdown(true);
                                            }}
                                            onFocus={() => setShowCustomerDropdown(true)}
                                            className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs font-semibold text-[#161616] outline-none focus:border-[#161616]"
                                            required
                                        />

                                        {/* Dropdown de Autocompletado de Clientes */}
                                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E2DFD7] shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-[#F0ECE1]">
                                                {filteredCustomers.map(c => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => selectCustomer(c)}
                                                        className="p-2.5 hover:bg-[#FAF8F5] cursor-pointer text-xs transition flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <div className="font-bold text-[#161616]">{c.name} {c.last_name}</div>
                                                            <div className="text-[10px] text-[#6B6862]">Doc: {c.document_number || 'N/A'} | Tel: {c.phone || 'N/A'}</div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-[#C8A968] uppercase">Seleccionar</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Cédula / Documento</label>
                                        <input
                                            type="text"
                                            placeholder="Buscar o tipear doc..."
                                            value={customerDoc}
                                            onChange={(e) => {
                                                setCustomerDoc(e.target.value);
                                                setSearchQuery(e.target.value);
                                                setShowCustomerDropdown(true);
                                            }}
                                            className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Teléfono</label>
                                        <input
                                            type="text"
                                            placeholder="Opcional"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Detalle / Ítem</label>
                                        <input
                                            type="text"
                                            value={itemDescription}
                                            onChange={(e) => setItemDescription(e.target.value)}
                                            className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Valor Total ($) *</label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 150000"
                                            value={totalAmount}
                                            onChange={(e) => setTotalAmount(e.target.value)}
                                            className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs font-mono font-bold text-[#161616] outline-none focus:border-[#161616]"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={savingManual}
                                        className="bg-[#161616] hover:bg-[#2C2C2C] text-white px-6 py-3 text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                                    >
                                        {savingManual ? 'Guardando...' : '⚡ Guardar Factura y Pasar a la Siguiente (Enter)'}
                                    </button>
                                </div>
                            </form>

                            {/* Resumen del Lote Creado en Sesión */}
                            {manualLogs.length > 0 && (
                                <div className="bg-white p-4 border border-[#E2DFD7] space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#161616] flex items-center justify-between">
                                        <span>Facturas ingresadas en esta sesión ({manualLogs.length})</span>
                                        <span className="text-[11px] font-mono text-[#6B6862]">
                                            Total Lote: ${manualLogs.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('es-CO')}
                                        </span>
                                    </h4>
                                    <div className="max-h-36 overflow-y-auto space-y-1.5 divide-y divide-[#F0ECE1]">
                                        {manualLogs.map((log, idx) => (
                                            <div key={idx} className="pt-1.5 flex items-center justify-between text-xs font-mono">
                                                <span className="font-bold text-[#161616]">{log.num}</span>
                                                <span className="text-[#6B6862]">{log.date}</span>
                                                <span className="font-semibold text-[#161616]">{log.customer}</span>
                                                <span className="font-bold text-[#2E7D32]">${log.amount.toLocaleString('es-CO')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ================= PESTAÑA 2: ESCÁNER MASIVO IA ================= */}
                    {activeTab === 'ocr' && (
                        <div className="space-y-6">
                            {/* Zona de Carga de Archivos / Fotos */}
                            <div className="bg-white p-6 border-2 border-dashed border-[#E2DFD7] text-center space-y-3">
                                <span className="material-symbols-outlined text-4xl text-[#C8A968]">add_a_photo</span>
                                <div>
                                    <h4 className="text-sm font-bold text-[#161616]">Selecciona o toma fotos de las facturas físicas</h4>
                                    <p className="text-xs text-[#6B6862] mt-0.5">Puedes cargar múltiples fotos o tomar fotos consecutivamente desde la cámara de tu celular.</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    id="ocr-file-input"
                                    className="hidden"
                                />
                                <label
                                    htmlFor="ocr-file-input"
                                    className="inline-block bg-[#161616] hover:bg-[#2C2C2C] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer transition shadow"
                                >
                                    📷 Seleccionar / Tomar Fotos ({selectedFiles.length} cargadas)
                                </label>
                            </div>

                            {/* Previsualización de imágenes seleccionadas */}
                            {filePreviews.length > 0 && ocrResults.length === 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#161616]">
                                            Fotos preparadas para escáner ({filePreviews.length})
                                        </h4>
                                        <button
                                            onClick={handleAnalyzeOcrBatch}
                                            disabled={analyzingOcr}
                                            className="bg-[#C8A968] hover:bg-[#B39353] text-[#161616] px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition shadow flex items-center gap-2 cursor-pointer"
                                        >
                                            {analyzingOcr ? '🧠 Analizando con IA Gemini...' : '⚡ Analizar Facturas con IA'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-2 bg-[#FAF8F5] border border-[#E2DFD7]">
                                        {filePreviews.map((preview, i) => (
                                            <div key={i} className="relative group border border-[#E2DFD7] bg-white p-1">
                                                <img src={preview} alt={`Preview ${i}`} className="h-24 w-full object-cover" />
                                                <button
                                                    onClick={() => {
                                                        setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
                                                        setFilePreviews(prev => prev.filter((_, idx) => idx !== i));
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 font-bold shadow"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {ocrError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                                    {ocrError}
                                </div>
                            )}

                            {/* Tabla de Verificación Human-in-the-Loop */}
                            {ocrResults.length > 0 && (
                                <div className="space-y-4 bg-white p-4 border border-[#E2DFD7] shadow-sm">
                                    <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-[#C8A968] tracking-widest block">Verificación de Datos Leídos</span>
                                            <h4 className="text-sm font-bold text-[#161616]">
                                                Resultados Detectados ({ocrResults.length} Facturas)
                                            </h4>
                                        </div>
                                        <button
                                            onClick={handleConfirmBatch}
                                            disabled={confirmingBatch}
                                            className="bg-[#2E7D32] hover:bg-[#256628] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition shadow flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                        >
                                            {confirmingBatch ? 'Guardando...' : `✅ Confirmar e Importar ${ocrResults.length} Facturas`}
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto max-h-80 overflow-y-auto border border-[#E2DFD7]">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#6B6862] uppercase tracking-wider font-semibold text-[10px]">
                                                    <th className="p-2.5">N° Factura</th>
                                                    <th className="p-2.5">Fecha</th>
                                                    <th className="p-2.5">Cliente</th>
                                                    <th className="p-2.5">Cédula</th>
                                                    <th className="p-2.5">Total ($)</th>
                                                    <th className="p-2.5">Fórmula Óptica</th>
                                                    <th className="p-2.5 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#E2DFD7]">
                                                {ocrResults.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-[#FAF8F5] transition">
                                                        <td className="p-2 font-mono">
                                                            <input
                                                                type="text"
                                                                value={row.invoice_number}
                                                                onChange={(e) => updateOcrField(idx, 'invoice_number', e.target.value)}
                                                                className="w-24 bg-white border border-[#E2DFD7] p-1 font-bold outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2 font-mono">
                                                            <input
                                                                type="date"
                                                                value={row.issue_date}
                                                                onChange={(e) => updateOcrField(idx, 'issue_date', e.target.value)}
                                                                className="w-32 bg-white border border-[#E2DFD7] p-1 outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={row.customer_name}
                                                                onChange={(e) => updateOcrField(idx, 'customer_name', e.target.value)}
                                                                className="w-36 bg-white border border-[#E2DFD7] p-1 font-semibold outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2 font-mono">
                                                            <input
                                                                type="text"
                                                                value={row.customer_document_number}
                                                                onChange={(e) => updateOcrField(idx, 'customer_document_number', e.target.value)}
                                                                className="w-24 bg-white border border-[#E2DFD7] p-1 outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2 font-mono">
                                                            <input
                                                                type="number"
                                                                value={row.total_amount}
                                                                onChange={(e) => updateOcrField(idx, 'total_amount', parseFloat(e.target.value) || 0)}
                                                                className="w-24 bg-white border border-[#E2DFD7] p-1 font-bold text-[#2E7D32] outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            {row.prescription && row.prescription.has_prescription ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded" title={`OD: ${row.prescription.od_sphere} | OI: ${row.prescription.os_sphere}`}>
                                                                    👁️ OD: {row.prescription.od_sphere || '0.00'} | OI: {row.prescription.os_sphere || '0.00'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-[#9E9E9E]">Sin Fórmula</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                onClick={() => removeOcrRow(idx)}
                                                                className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                                                            >
                                                                ✕ Quitar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* MODAL SECUNDARIO: CREACIÓN RÁPIDA DE CLIENTE (IDÉNTICO A CRM DIRECTORIO) */}
                {isQuickCustomerOpen && (
                    <div className="fixed inset-0 z-[9999] bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-[#F6F4EE] border border-[#161616] max-w-lg w-full rounded-none p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                                <div>
                                    <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] tracking-widest block">
                                        NUEVO REGISTRO
                                    </span>
                                    <h3 className="font-serif font-bold text-xl text-[#161616]">
                                        Registrar Nuevo Cliente
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

                            <form onSubmit={handleCreateQuickCustomer} className="space-y-4 text-xs font-sans">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">
                                            Nombre *
                                        </label>
                                        <input 
                                            type="text"
                                            required
                                            value={quickCustName}
                                            onChange={(e) => setQuickCustName(e.target.value)}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                            placeholder="Ej: Pedro"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">
                                            Apellido
                                        </label>
                                        <input 
                                            type="text"
                                            value={quickCustLastName}
                                            onChange={(e) => setQuickCustLastName(e.target.value)}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                            placeholder="Ej: Martínez"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Doc.</label>
                                        <select 
                                            value={quickCustDocType}
                                            onChange={(e) => setQuickCustDocType(e.target.value)}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none cursor-pointer text-xs font-mono"
                                        >
                                            <option value="CC">Cédula (CC)</option>
                                            <option value="CE">Cédula Ext. (CE)</option>
                                            <option value="NIT">NIT</option>
                                            <option value="PAS">Pasaporte (PAS)</option>
                                        </select>
                                    </div>

                                    <div className="col-span-2 space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Número de Identificación *</label>
                                        <input 
                                            type="text"
                                            required
                                            value={quickCustDocNum}
                                            onChange={(e) => setQuickCustDocNum(e.target.value)}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                            placeholder="Ej: 1020400800"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Teléfono / WhatsApp *</label>
                                        <input 
                                            type="text"
                                            required
                                            value={quickCustPhone}
                                            onChange={(e) => setQuickCustPhone(e.target.value)}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                            placeholder="Ej: 573001112222"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Correo Electrónico</label>
                                        <input 
                                            type="email"
                                            value={quickCustEmail}
                                            onChange={(e) => setQuickCustEmail(e.target.value)}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                            placeholder="Ej: contacto@correo.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Dirección Física</label>
                                    <input 
                                        type="text"
                                        value={quickCustAddress}
                                        onChange={(e) => setQuickCustAddress(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none text-xs font-mono"
                                        placeholder="Ej: Calle 45 # 12 - 34, Local 101"
                                    />
                                </div>

                                {/* PRESCRIPCIÓN ÓPTICA / FÓRMULA OFTÁLMICA GRID */}
                                <div className="space-y-3 border-t border-[#E2DFD7] pt-4">
                                    <h4 className="font-serif font-bold text-xs text-[#161616] flex items-center gap-1.5 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[16px] text-[#D9381E]">visibility</span>
                                        Prescripción Óptica (Fórmula Oftálmica)
                                    </h4>
                                    
                                    <div className="overflow-x-auto border border-[#E2DFD7] rounded-none bg-white">
                                        <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                                            <thead>
                                                <tr className="bg-[#FAF8F5] text-[#76746E] font-mono font-bold border-b border-[#E2DFD7] text-center text-[10px] uppercase">
                                                    <th className="py-2 px-2 text-left pl-3">Ojo</th>
                                                    <th className="py-2 px-1">Esf</th>
                                                    <th className="py-2 px-1">Cil</th>
                                                    <th className="py-2 px-1">Eje</th>
                                                    <th className="py-2 px-1">Adi</th>
                                                    <th className="py-2 px-1">Prisma</th>
                                                    <th className="py-2 px-2 pr-3">AV</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-[#E2DFD7] text-center">
                                                    <td className="py-2 px-2 font-mono font-bold text-left pl-3 text-[#161616]">OD (Der)</td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odEsf} onChange={(e) => setOdEsf(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-1.75" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odCil} onChange={(e) => setOdCil(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-2.00" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odEje} onChange={(e) => setOdEje(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="45°" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odAdi} onChange={(e) => setOdAdi(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="+2.00" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={odPrism} onChange={(e) => setOdPrism(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="--" />
                                                    </td>
                                                    <td className="py-1 px-2 pr-3">
                                                        <input type="text" value={odAv} onChange={(e) => setOdAv(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="20/20" />
                                                    </td>
                                                </tr>
                                                <tr className="text-center">
                                                    <td className="py-2 px-2 font-mono font-bold text-left pl-3 text-[#D9381E]">OI (Izq)</td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiEsf} onChange={(e) => setOiEsf(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-5.25" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiCil} onChange={(e) => setOiCil(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="-1.25" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiEje} onChange={(e) => setOiEje(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="130°" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiAdi} onChange={(e) => setOiAdi(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="+2.00" />
                                                    </td>
                                                    <td className="py-1 px-1">
                                                        <input type="text" value={oiPrism} onChange={(e) => setOiPrism(e.target.value)} className="w-12 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="--" />
                                                    </td>
                                                    <td className="py-1 px-2 pr-3">
                                                        <input type="text" value={oiAv} onChange={(e) => setOiAv(e.target.value)} className="w-14 bg-[#FAF8F5] border border-[#E2DFD7] p-1 text-center font-mono text-xs text-[#161616] outline-none focus:border-[#161616]" placeholder="20/20" />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Distancia Pupilar (DP MM)</label>
                                        <input 
                                            type="text" 
                                            value={dp} 
                                            onChange={(e) => setDp(e.target.value)} 
                                            className="w-full bg-white border border-[#E2DFD7] p-2 rounded-none text-xs text-[#161616] outline-none focus:border-[#161616] font-mono"
                                            placeholder="Ej: 64" 
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-[#E2DFD7]">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsQuickCustomerOpen(false)}
                                        className="px-4 py-2 border border-[#E2DFD7] hover:border-[#161616] text-[#161616] bg-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={savingQuickCust}
                                        className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                                    >
                                        {savingQuickCust ? 'Guardando...' : 'Guardar Cliente'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Footer Modal */}
                <div className="bg-[#FAF8F5] p-4 border-t border-[#E2DFD7] flex items-center justify-between text-xs text-[#6B6862]">
                    <span>ℹ️ Las facturas registradas en este módulo omiten el descuento automático de inventario y actualizan el CRM.</span>
                    <button
                        onClick={onClose}
                        className="bg-[#E2DFD7] hover:bg-[#D0CCC2] text-[#161616] px-5 py-2 font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
