import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';
import JsBarcode from 'jsbarcode';
import { printBarcodes, previewBarcodes, LABEL_PRINT_PROFILES, DEFAULT_LABEL_PRINT_SETTINGS, type LabelProfileId } from '../utils/barcodePrinter';
import { AuditLogModal } from './AuditLogModal';

interface ProductVariant {
    id?: string;
    variant_name?: string;
    color: string;
    color_hex?: string;
    sku: string;
    stock: number;
    min_stock?: number;
    image_url?: string | null;
}

interface Product {
    id: string;
    client_id: string;
    name: string;
    sku: string | null;
    description: string | null;
    price: string;
    stock: number;
    cost_price: string;
    min_stock?: number;
    supplier_name: string | null;
    supplier_phone: string | null;
    brand: string | null;
    model?: string | null;
    material: string | null;
    style: string | null;
    color: string | null;
    promo_discount: string;
    category_id?: string | null;
    product_type?: 'product' | 'service';
    has_variants?: boolean;
    variants?: ProductVariant[];
    created_at: string;
}

interface SaaSErpInventoryProps {
    clientId: string;
    category?: string;
}


const BarcodeSVG: React.FC<{ value: string; size?: 'sm' | 'md' }> = ({ value, size = 'md' }) => {
    const cleanValue = (value || '').toUpperCase().replace(/[^0-9A-Z\-\.\s]/g, '').trim();
    if (!cleanValue) return null;

    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        const svgNode = svgRef.current;
        if (!svgNode) return;

        svgNode.innerHTML = '';
        JsBarcode(svgNode, cleanValue, {
            format: 'CODE128',
            displayValue: false,
            width: size === 'sm' ? 1.2 : 1.6,
            height: size === 'sm' ? 22 : 40,
            margin: 4,
            background: '#ffffff',
            lineColor: '#000000',
            fontSize: 12,
            textMargin: 0
        });
    }, [cleanValue, size]);

    return (
        <div className="flex flex-col items-center gap-0.5 my-1">
            <svg
                ref={svgRef}
                width={size === 'sm' ? 120 : 170}
                height={size === 'sm' ? 24 : 44}
                viewBox={size === 'sm' ? '0 0 120 24' : '0 0 170 44'}
                className="bg-white p-0.5 rounded"
                aria-label={`Código de barras ${cleanValue}`}
            />
            <span className="text-[8px] font-mono tracking-widest text-on-surface-variant uppercase">{cleanValue}</span>
        </div>
    );
};
const getColorHex = (colorName?: string, colorHex?: string) => {
    if (colorHex && colorHex.startsWith('#')) return colorHex;
    if (!colorName) return '#6b7280';
    const name = colorName.toLowerCase();
    if (name.includes('negro') || name.includes('black')) return '#111111';
    if (name.includes('café') || name.includes('cafe') || name.includes('marrón') || name.includes('marron') || name.includes('brown')) return '#5c3a21';
    if (name.includes('carey') || name.includes('tortoise')) return '#8b5a2b';
    if (name.includes('azul') || name.includes('blue')) return '#1e40af';
    if (name.includes('rojo') || name.includes('red')) return '#b91c1c';
    if (name.includes('verde') || name.includes('green')) return '#15803d';
    if (name.includes('amarillo') || name.includes('yellow')) return '#eab308';
    if (name.includes('dorado') || name.includes('gold')) return '#d97706';
    if (name.includes('plateado') || name.includes('silver')) return '#9ca3af';
    if (name.includes('rosa') || name.includes('pink')) return '#ec4899';
    if (name.includes('gris') || name.includes('gray')) return '#6b7280';
    if (name.includes('morado') || name.includes('purple')) return '#7e22ce';
    if (name.includes('blanco') || name.includes('white')) return '#ffffff';
    if (name.includes('habano') || name.includes('beige')) return '#d2b48c';
    if (name.includes('transparente') || name.includes('clear')) return '#e5e7eb';
    return '#6b7280';
};

interface ColorOption {
    name: string;
    value: string;
    preview: string;
}

const colorOptions: ColorOption[] = [
    { name: 'Negro', value: 'Negro', preview: '#000000' },
    { name: 'Carey (Animal Print)', value: 'Carey', preview: 'repeating-linear-gradient(45deg, #1f1107, #1f1107 4px, #8c5827 4px, #8c5827 8px)' },
    { name: 'Havana', value: 'Havana', preview: 'linear-gradient(135deg, #2b180d 0%, #a66a38 50%, #2b180d 100%)' },
    { name: 'Dorado', value: 'Dorado', preview: '#d4af37' },
    { name: 'Plateado', value: 'Plateado', preview: '#c0c0c0' },
    { name: 'Café / Marrón', value: 'Cafe', preview: '#5c4033' },
    { name: 'Azul Marino', value: 'Azul Marino', preview: '#000080' },
    { name: 'Rosado', value: 'Rosado', preview: '#ffc0cb' },
    { name: 'Transparente', value: 'Transparente', preview: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 40%, rgba(255,0,0,0.6) 45%, rgba(255,0,0,0.6) 55%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.1) 100%)' },
    { name: 'Gris', value: 'Gris', preview: '#808080' },
    { name: 'Rojo', value: 'Rojo', preview: '#ff0000' }
];

const getColorPreview = (name: string, colorHex?: string): string => {
    if (colorHex && colorHex.startsWith('#')) return colorHex;
    if (!name) return '#808080';
    const clean = name.trim().toLowerCase();
    const opt = colorOptions.find(o => 
        o.value.toLowerCase() === clean || 
        o.name.toLowerCase() === clean || 
        clean.includes(o.value.toLowerCase()) || 
        o.value.toLowerCase().includes(clean)
    );
    if (opt) return opt.preview;
    return getColorHex(name, colorHex);
};

// Sub-componente para edición inline de promociones
const FieldWrapper: React.FC<{ 
    fieldId: string;
    label: string;
    hidden?: boolean;
    onToggleHidden?: (fieldId: string) => void;
    children: React.ReactNode;
}> = ({ fieldId, label, hidden = false, onToggleHidden, children }) => {
    if (hidden) return null;
    
    return (
        <div className="flex flex-col gap-1.5 relative group">
            <div className="flex items-center justify-between gap-2">
                <label className="text-xs text-on-surface-variant font-medium">{label}</label>
                {onToggleHidden && (
                    <button
                        type="button"
                        onClick={() => onToggleHidden(fieldId)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 text-red-400 rounded transition cursor-pointer border-0 bg-transparent text-xs transition"
                        title="Remover este campo"
                    >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                )}
            </div>
            {children}
        </div>
    );
};

// Sub-componente para edición inline de promociones
const PromoDiscountRow: React.FC<{
    prod: Product;
    formatPrice: (v: string) => string;
    onSave: (prod: Product, val: number) => void;
    category?: string;
}> = ({ prod, formatPrice, onSave, category = 'optica' }) => {
    const [pct, setPct] = useState(prod.promo_discount ? parseFloat(prod.promo_discount) : 0);
    const priceNum = parseFloat(prod.price);
    const promoPrice = priceNum * (1 - pct / 100);

    return (
        <tr className="hover:bg-surface-container/30 transition-colors">
            <td className="p-4">
                <p className="font-semibold text-on-surface text-sm">{prod.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-on-surface-variant">
                    {prod.sku && <span className="font-mono bg-surface-container px-1 py-0.5 rounded">SKU: {prod.sku}</span>}
                    {category === 'optica' && prod.brand && <span>• Marca: {prod.brand}</span>}
                    {category === 'optica' && prod.color && <span>• Color: {prod.color}</span>}
                </div>
            </td>
            <td className="p-4 font-semibold text-on-surface">
                {formatPrice(prod.price)}
            </td>
            <td className="p-4">
                <div className="flex items-center gap-1.5 max-w-[120px]">
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) => setPct(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="bg-surface-container border border-outline/20 rounded-lg p-1.5 w-16 text-center text-xs font-semibold text-on-surface focus:border-primary outline-none"
                    />
                    <span className="text-xs text-on-surface-variant">%</span>
                </div>
            </td>
            <td className="p-4">
                <div className="flex flex-col">
                    <span className="font-bold text-primary text-sm">{formatPrice(promoPrice.toString())}</span>
                    {pct > 0 && <span className="text-[10px] text-green-400 font-medium">Ahorras: {formatPrice((priceNum - promoPrice).toString())}</span>}
                </div>
            </td>
            <td className="p-4 text-right">
                <button
                    type="button"
                    onClick={() => onSave(prod, pct)}
                    disabled={parseFloat(prod.promo_discount || '0') === pct}
                    className="bg-primary disabled:bg-surface-container-high/65 disabled:text-on-surface-variant/40 hover:opacity-90 text-on-primary text-[11px] font-bold py-1.5 px-3.5 rounded-lg flex items-center gap-1 transition cursor-pointer ml-auto border-0"
                >
                    <span className="material-symbols-outlined text-[14px]">save</span>
                    {parseFloat(prod.promo_discount || '0') === pct ? 'Guardado' : 'Guardar'}
                </button>
            </td>
        </tr>
    );
};

export const SaaSErpInventory: React.FC<SaaSErpInventoryProps> = ({ clientId: rawClientId, category = 'optica' }) => {
    const clientId = (rawClientId && rawClientId !== 'undefined' && rawClientId !== 'admin')
        ? rawClientId
        : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
    const sessionRole = (localStorage.getItem('session_role') || '').toLowerCase();
    const empRole = (localStorage.getItem('emp_role') || localStorage.getItem('employee_role') || '').toLowerCase();
    const isEmployee = empRole === 'employee' || empRole === 'vendedor' || empRole === 'optometrista' || sessionRole === 'employee' || sessionRole === 'vendedor';
    const isAdmin = !isEmployee && (sessionRole === 'admin' || sessionRole === 'superadmin' || sessionRole === 'client' || (!sessionRole && !empRole));

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [addProductStep, setAddProductStep] = useState<'closed' | 'open'>('closed');
    const isFormOpen = addProductStep !== 'closed';
    const [productFormStep, setProductFormStep] = useState<number>(1);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [activeTab, setActiveTab] = useState<'catalog' | 'promotions' | 'rotation'>('catalog');
    const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
    const [showCreateCategoryPrompt, setShowCreateCategoryPrompt] = useState(false);
    const [printProfileId, setPrintProfileId] = useState<LabelProfileId>('two-column');

    // Cross-Branch Stock Modal State
    const [crossStockModalOpen, setCrossStockModalOpen] = useState(false);
    const [selectedCrossProduct, setSelectedCrossProduct] = useState<Product | null>(null);
    const [crossSearchQuery, setCrossSearchQuery] = useState('');
    const [crossStockList, setCrossStockList] = useState<any[]>([]);
    const [crossStockLoading, setCrossStockLoading] = useState(false);
    const [transferringBranchId, setTransferringBranchId] = useState<string | null>(null);
    const [transferQty, setTransferQty] = useState<number>(1);

    // Bulk Selection & Transfer State
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [bulkTransferModalOpen, setBulkTransferModalOpen] = useState(false);
    const [branchesList, setBranchesList] = useState<any[]>([]);
    const [targetBranchId, setTargetBranchId] = useState<string>('');
    const [isBulkTransferring, setIsBulkTransferring] = useState(false);

    // Variant View Barcodes Modal State
    const [isVariantViewModalOpen, setIsVariantViewModalOpen] = useState(false);
    const [selectedVariantProduct, setSelectedVariantProduct] = useState<Product | null>(null);

    // Fetch available branches
    useEffect(() => {
        if (!clientId) return;
        fetch(`/api/clients/${clientId}/branches`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.branches)) {
                    setBranchesList(json.branches);
                }
            })
            .catch(err => console.error("Error cargando sedes:", err));
    }, [clientId]);

    const handleOpenCrossStock = async (prod?: Product | null, initialQuery: string = '') => {
        setSelectedCrossProduct(prod || null);
        const queryTerm = prod ? (prod.sku || prod.name) : initialQuery;
        setCrossSearchQuery(queryTerm);
        setCrossStockModalOpen(true);
        fetchCrossStock(queryTerm);
    };

    const fetchCrossStock = async (queryTerm: string) => {
        setCrossStockLoading(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/products/cross-branch-stock?name=${encodeURIComponent(queryTerm)}&sku=${encodeURIComponent(queryTerm)}`);
            const json = await res.json();
            if (json.success) {
                setCrossStockList(json.cross_stock || []);
            }
        } catch (err) {
            console.error("Error consultando stock inter-sedes:", err);
        } finally {
            setCrossStockLoading(false);
        }
    };

    const handleExecuteTransfer = async (fromBranchId: string, fromBranchName: string) => {
        if (!selectedCrossProduct || transferQty <= 0) return;
        try {
            setTransferringBranchId(fromBranchId);
            const res = await fetch(`/api/clients/${fromBranchId}/inventory/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to_client_id: clientId,
                    product_id: selectedCrossProduct.id,
                    product_name: selectedCrossProduct.name,
                    quantity: transferQty,
                    notes: `Solicitud de traspaso directo desde ${fromBranchName}`
                })
            });
            const json = await res.json();
            if (json.success) {
                alert(json.message);
                fetchProducts();
                handleOpenCrossStock(selectedCrossProduct);
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error de conexión: ${err.message}`);
        } finally {
            setTransferringBranchId(null);
        }
    };

    const handleExecuteBulkTransfer = async () => {
        if (!targetBranchId) {
            alert("Por favor seleccione la sede de destino.");
            return;
        }
        if (targetBranchId === clientId) {
            alert("La sede de destino debe ser diferente a la sede actual.");
            return;
        }
        if (selectedProductIds.length === 0) return;

        try {
            setIsBulkTransferring(true);
            const selectedItems = products
                .filter(p => selectedProductIds.includes(p.id))
                .map(p => ({
                    product_id: p.id,
                    quantity: p.stock || 1
                }));

            const res = await fetch(`/api/clients/${clientId}/inventory/bulk-transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to_client_id: targetBranchId,
                    items: selectedItems,
                    notes: 'Traslado masivo de inventario seleccionado'
                })
            });

            const json = await res.json();
            if (json.success) {
                alert(`✅ ${json.message}`);
                setSelectedProductIds([]);
                setBulkTransferModalOpen(false);
                fetchProducts();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error de conexión: ${err.message}`);
        } finally {
            setIsBulkTransferring(false);
        }
    };

    // Form fields
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const [costPrice, setCostPrice] = useState<number | ''>('');
    const [stock, setStock] = useState<number | ''>('');
    const [minStock, setMinStock] = useState<number | ''>(5);
    const [brand, setBrand] = useState('');
    const [material, setMaterial] = useState('');
    const [style, setStyle] = useState('');
    const [color, setColor] = useState('');

    const [filterBrand, setFilterBrand] = useState<string>('all');
    const [filterStock, setFilterStock] = useState<string>('all');
    const [filterMinPrice, setFilterMinPrice] = useState<string>('');
    // Estado para Modal de Auditoría / Historial Contextual
    const [auditModalOpen, setAuditModalOpen] = useState(false);
    const [auditModalTitle, setAuditModalTitle] = useState('');
    const [auditModalSubtitle, setAuditModalSubtitle] = useState('');
    const [auditEntityId, setAuditEntityId] = useState<string | undefined>(undefined);
    const [auditEntityType, setAuditEntityType] = useState<string | undefined>(undefined);

    const openAuditModalForProduct = (prod: Product) => {
        setAuditModalTitle(`Historial de Registro: ${prod.name}`);
        setAuditModalSubtitle(`SKU: ${prod.sku || 'Sin SKU'} | ID: ${prod.id}`);
        setAuditEntityType('product');
        setAuditEntityId(prod.id);
        setAuditModalOpen(true);
    };

    const openAuditModalGeneral = () => {
        setAuditModalTitle(`Bitácora de Auditoría de Inventario`);
        setAuditModalSubtitle(`Historial completo de creación, modificaciones, recargas y traslados.`);
        setAuditEntityType(undefined);
        setAuditEntityId(undefined);
        setAuditModalOpen(true);
    };
    const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');

    // Silence unused warnings for compatibility
    if (false as boolean) { console.log(minStock, color, setActiveTab, setFilterStock, setFilterMinPrice, setFilterMaxPrice); }
    const [promoDiscount, setPromoDiscount] = useState<number | ''>('');
    const [taxRate, setTaxRate] = useState<number>(0);
    const [activePhotoColorIdx, setActivePhotoColorIdx] = useState<number>(0);
    const [colorStartIndex, setColorStartIndex] = useState<number>(0);
    const [productType, setProductType] = useState<'product' | 'service'>('product');
    const [lensDesign, setLensDesign] = useState<string>('');
    const [lensMaterial, setLensMaterial] = useState<string>('');
    const [lensTreatment, setLensTreatment] = useState<string>('');
    const [isLensMode, setIsLensMode] = useState<boolean>(false);
    const [customAttrs, setCustomAttrs] = useState<any>({});
    // Estructura de Colores con Previsualización y Soporte para Paint Picker
    const [allColors, setAllColors] = useState<Array<{ id: string; name: string; value: string; preview: string; isCustom?: boolean }>>([
        { id: 'negro', name: 'Negro', value: 'Negro', preview: '#000000' },
        { id: 'carey', name: 'Carey (Animal Print)', value: 'Carey', preview: 'repeating-linear-gradient(45deg, #1f1107, #1f1107 4px, #8c5827 4px, #8c5827 8px)' },
        { id: 'havana', name: 'Havana', value: 'Havana', preview: 'linear-gradient(135deg, #2b180d 0%, #a66a38 50%, #2b180d 100%)' },
        { id: 'dorado', name: 'Dorado', value: 'Dorado', preview: '#d4af37' },
        { id: 'plateado', name: 'Plateado', value: 'Plateado', preview: '#c0c0c0' },
        { id: 'cafe', name: 'Café / Marrón', value: 'Cafe', preview: '#5c4033' },
        { id: 'azul', name: 'Azul Marino', value: 'Azul Marino', preview: '#000080' },
        { id: 'rosado', name: 'Rosado', value: 'Rosado', preview: '#ffc0cb' },
        { id: 'transparente', name: 'Transparente', value: 'Transparente', preview: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 40%, rgba(255,0,0,0.6) 45%, rgba(255,0,0,0.6) 55%, rgba(255,255,255,0.1) 60%, rgba(255,255,255,0.1) 100%)' },
        { id: 'gris', name: 'Gris', value: 'Gris', preview: '#808080' },
        { id: 'rojo', name: 'Rojo', value: 'Rojo', preview: '#ff0000' },
        { id: 'verde', name: 'Verde', value: 'Verde', preview: '#008000' },
        { id: 'violeta', name: 'Violeta / Morado', value: 'Violeta', preview: '#8a2be2' }
    ]);

    // Modal para el Selector Interactivo Estilo Paint (Dividido 50% / 50%)
    const [isPaintModalOpen, setIsPaintModalOpen] = useState(false);
    const [editingColor, setEditingColor] = useState<{ id: string; name: string; preview: string } | null>(null);
    const [colorNameInput, setColorNameInput] = useState('');
    const [colorHexInput, setColorHexInput] = useState('#8a2be2');
    const [paintTargetVariantIdx, setPaintTargetVariantIdx] = useState<number | null>(null);

    const openCreateColorModal = (targetVariantIdx?: number) => {
        setEditingColor(null);
        setColorNameInput('');
        setColorHexInput('#8a2be2');
        setPaintTargetVariantIdx(targetVariantIdx !== undefined ? targetVariantIdx : null);
        setIsPaintModalOpen(true);
    };

    const openEditColorModal = (item: { id: string; name: string; preview: string }) => {
        setEditingColor(item);
        setColorNameInput(item.name);
        setColorHexInput(item.preview.startsWith('#') ? item.preview : '#8a2be2');
        setIsPaintModalOpen(true);
    };

    const handleSavePaintColor = (e: React.FormEvent) => {
        e.preventDefault();
        const name = colorNameInput.trim();
        if (!name) return;

        if (editingColor) {
            // Actualizar color existente
            setAllColors(prev => prev.map(c => c.id === editingColor.id ? { ...c, name, value: name, preview: colorHexInput } : c));
            setVariantList(prev => prev.map(v => v.color === editingColor.name ? { ...v, color: name } : v));
        } else {
            // Crear nuevo color personalizado
            const newColorObj = {
                id: 'custom_' + Date.now(),
                name,
                value: name,
                preview: colorHexInput,
                isCustom: true
            };
            setAllColors(prev => [...prev, newColorObj]);
            if (paintTargetVariantIdx !== null && paintTargetVariantIdx >= 0) {
                setVariantList(prev => {
                    const updated = [...prev];
                    if (updated[paintTargetVariantIdx]) {
                        updated[paintTargetVariantIdx].color = name;
                    }
                    return updated;
                });
            }
        }
        setIsPaintModalOpen(false);
    };

    const handleDeleteColor = (id: string) => {
        if (!window.confirm("¿Deseas eliminar este color personalizado?")) return;
        setAllColors(prev => prev.filter(c => c.id !== id));
    };

    const [variantList, setVariantList] = useState<Array<{ id?: string; color: string; sku?: string; stock: number | ''; min_stock: number | ''; image_url: string }>>([
        { color: 'Negro', sku: '', stock: 10, min_stock: 2, image_url: '' }
    ]);

    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [importSuccessMsg, setImportSuccessMsg] = useState('');
    const [importErrorMsg, setImportErrorMsg] = useState('');
    const [importing, setImporting] = useState(false);

    // Barcode Printing States
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printProduct, setPrintProduct] = useState<Product | null>(null);
    const [selectedPrintVariant, setSelectedPrintVariant] = useState<any>(null);
    const [printQuantity, setPrintQuantity] = useState(1);
    const [isRefillPrompt, setIsRefillPrompt] = useState(false);

    const openPrintModal = (prod: Product, targetVariant?: any) => {
        setPrintProduct(prod);
        setIsRefillPrompt(false);
        if (targetVariant) {
            setSelectedPrintVariant(targetVariant);
            setPrintQuantity(targetVariant.stock || 1);
        } else if (prod.variants && prod.variants.length > 0) {
            setSelectedPrintVariant(prod.variants[0]);
            setPrintQuantity(prod.variants[0].stock || 1);
        } else {
            setSelectedPrintVariant(null);
            setPrintQuantity(prod.stock || 1);
        }
        setIsPrintModalOpen(true);
    };

    const handlePrintBarcodes = () => {
        if (!printProduct) return;
        const activeSku = selectedPrintVariant ? (selectedPrintVariant.sku || printProduct.sku || '') : (printProduct.sku || '');
        const activeVariantName = selectedPrintVariant ? (selectedPrintVariant.variant_name || selectedPrintVariant.color) : '';
        const activeName = activeVariantName ? `${printProduct.name} (${activeVariantName})` : printProduct.name;
        const selectedSettings = LABEL_PRINT_PROFILES[printProfileId] || DEFAULT_LABEL_PRINT_SETTINGS;
        
        printBarcodes([{
            name: activeName,
            sku: activeSku,
            price: printProduct.price,
            quantity: parseInt(printQuantity.toString()) || 1
        }], selectedSettings);

        setIsPrintModalOpen(false);
    };

    const handlePreviewBarcodes = () => {
        if (!printProduct) return;
        const activeSku = selectedPrintVariant ? (selectedPrintVariant.sku || printProduct.sku || '') : (printProduct.sku || '');
        const activeVariantName = selectedPrintVariant ? (selectedPrintVariant.variant_name || selectedPrintVariant.color) : '';
        const activeName = activeVariantName ? `${printProduct.name} (${activeVariantName})` : printProduct.name;
        const selectedSettings = LABEL_PRINT_PROFILES[printProfileId] || DEFAULT_LABEL_PRINT_SETTINGS;

        previewBarcodes([{
            name: activeName,
            sku: activeSku,
            price: printProduct.price,
            quantity: parseInt(printQuantity.toString()) || 1
        }], selectedSettings);
    };

    // Categories and Refill States
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [refillProduct, setRefillProduct] = useState<Product | null>(null);
    const [refillQuantity, setRefillQuantity] = useState<number | ''>('');
    const [refillVariantQuantities, setRefillVariantQuantities] = useState<Record<string, number | ''>>({});
    const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
    const [printAfterRefill, setPrintAfterRefill] = useState(true);

    const [dynamicColorOptions, setDynamicColorOptions] = useState<ColorOption[]>(() => {
        const stored = localStorage.getItem(`custom_colors_${clientId}`);
        const parsed = stored ? JSON.parse(stored) : [];
        return [...colorOptions, ...parsed];
    });
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewColorPrompt, setShowNewColorPrompt] = useState(false);
    const [newColorName, setNewColorName] = useState('');
    const [newColorHex, setNewColorHex] = useState('#3b82f6');

    const searchInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/products`);
            const json = await res.json();
            if (json.success) {
                setProducts(json.products || []);
            }
        } catch (err) {
            console.error("Error loading products:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch(`/api/clients/${clientId}/categories`);
            const json = await res.json();
            if (json.success) {
                let catList = json.categories || [];
                const hasLentesCat = catList.some((c: any) => c.name.toLowerCase().includes('lente'));
                if (!hasLentesCat) {
                    try {
                        const createRes = await fetch(`/api/clients/${clientId}/categories`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: 'Lentes' })
                        });
                        const createJson = await createRes.json();
                        if (createJson.success && createJson.category) {
                            catList = [...catList, createJson.category];
                        }
                    } catch (e) {
                        console.warn("Auto-create category Lentes error:", e);
                    }
                }
                setCategories(catList);
            }
        } catch (err) {
            console.error("Error loading categories:", err);
        }
    };

    const handleAddCustomColor = () => {
        if (!newColorName.trim()) return;
        const colorName = newColorName.trim();
        const exists = dynamicColorOptions.some(c => c.name.toLowerCase() === colorName.toLowerCase());
        if (exists) {
            alert('Este color ya existe en la lista.');
            return;
        }

        const newOption: ColorOption = {
            name: colorName,
            value: colorName,
            preview: newColorHex
        };

        const stored = localStorage.getItem(`custom_colors_${clientId}`);
        const parsed = stored ? JSON.parse(stored) : [];
        const nextCustomColors = [...parsed, newOption];
        localStorage.setItem(`custom_colors_${clientId}`, JSON.stringify(nextCustomColors));

        setDynamicColorOptions([...colorOptions, ...nextCustomColors]);
        setColor(colorName);
        setNewColorName('');
        setShowNewColorPrompt(false);
    };

    const handleSelectCategory = (catId: string) => {
        setCategoryId(catId);
        setHiddenFields(new Set());
        const selectedCat = categories.find((c: any) => c.id === catId);
        if (selectedCat && selectedCat.name.toLowerCase().includes('lente')) {
            setIsLensMode(true);
            setProductType('service');
            setStock(999999);
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newCategoryName })
            });
            const json = await res.json();
            if (json.success) {
                await fetchCategories();
                setCategoryId(json.category.id.toString());
                setNewCategoryName('');
                setShowCreateCategoryPrompt(false);
            } else {
                alert(json.error || 'Error al crear la categoría.');
            }
        } catch (err: any) {
            alert('Error de conexión al crear categoría: ' + err.message);
        }
    };

    const toggleFieldHidden = (fieldName: string) => {
        const newHidden = new Set(hiddenFields);
        if (newHidden.has(fieldName)) {
            newHidden.delete(fieldName);
        } else {
            newHidden.add(fieldName);
        }
        setHiddenFields(newHidden);
    };

    if (false as boolean) {
        console.log(allColors, FieldWrapper, isAdmin, openCreateColorModal, openEditColorModal, handleDeleteColor, toggleFieldHidden, VisualColorDropdown);
    }

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [clientId]);

    // Barcode Autofocus hook: ensures search input remains focused for physical scanning guns
    useEffect(() => {
        if (!loading && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [loading, isFormOpen, activeTab]);

    const [hasVariants, setHasVariants] = useState<boolean>(true);

    useEffect(() => {
        if (activePhotoColorIdx < colorStartIndex) {
            setColorStartIndex(activePhotoColorIdx);
        } else if (activePhotoColorIdx >= colorStartIndex + 4) {
            setColorStartIndex(Math.max(0, activePhotoColorIdx - 3));
        }
    }, [activePhotoColorIdx]);

    useEffect(() => {
        if (colorStartIndex > Math.max(0, variantList.length - 4)) {
            setColorStartIndex(Math.max(0, variantList.length - 4));
        }
    }, [variantList.length]);

    const handleSubmit = async (e: React.FormEvent, keepOpen: boolean = false) => {
        e.preventDefault();
        
        const isLensType = isLensMode || (categoryId && categories.find((c: any) => c.id === categoryId)?.name.toLowerCase().includes('lente')) || Boolean(lensDesign || lensMaterial || lensTreatment);
        const resolvedProductType = productType === 'service' ? 'service' : (isLensType ? 'product' : productType);
        const hasVarBool = !isLensType && hasVariants && resolvedProductType === 'product' && variantList.length > 0;

        const formattedVariants = hasVarBool ? variantList.map(v => ({
            ...(v.id ? { id: v.id } : {}),
            variant_name: v.color || 'Variante',
            color_hex: null,
            sku: v.sku ? v.sku.trim() : '',
            stock: v.stock === '' ? 0 : (parseInt(v.stock.toString()) || 0),
            min_stock: v.min_stock === '' ? 2 : (parseInt(v.min_stock.toString()) || 2),
            image_url: v.image_url || null
        })) : [];

        const calculatedTotalStock = resolvedProductType === 'service'
            ? 0
            : (hasVarBool 
                ? variantList.reduce((sum, v) => sum + (parseInt(v.stock?.toString() || '0') || 0), 0)
                : (stock === '' ? 0 : (parseInt(stock.toString()) || 0)));

        const calculatedMinStock = resolvedProductType === 'service'
            ? 0
            : (hasVarBool 
                ? (variantList.length > 0 ? (parseInt(variantList[0].min_stock?.toString() || '1') || 1) : 2)
                : (minStock === '' ? 2 : (parseInt(minStock.toString()) || 2)));

        const finalSku = hasVarBool 
            ? null 
            : (sku.trim() || (isLensType ? 'LENS-' + Math.floor(10000 + Math.random() * 90000) : 'OP' + Math.floor(100000 + Math.random() * 900000)));

        const primaryImageUrl = hasVarBool 
            ? (variantList.find(v => v.image_url?.trim())?.image_url || null) 
            : null;

        const lensDetailStr = [lensDesign, lensMaterial, lensTreatment].filter(Boolean).join(' - ');

        const finalName = name.trim() || (isLensType ? `Lente ${lensDetailStr}`.trim() : 'Producto Sin Nombre');

        const body = { 
            name: finalName, 
            sku: finalSku, 
            description: description.trim() || (isLensType ? lensTreatment : null), 
            price: price === '' ? 0 : price, 
            stock: calculatedTotalStock,
            min_stock: calculatedMinStock,
            cost_price: isAdmin ? (costPrice === '' ? 0 : costPrice) : (editingProduct ? (editingProduct.cost_price || 0) : 0),
            brand: brand.trim() || (isLensType ? 'Lentes' : null),
            material: isLensType ? (lensMaterial || material || null) : (material || null),
            style: isLensType ? (lensDesign || style || null) : (style || null),
            color: hasVarBool ? variantList.map(v => v.color).filter(Boolean).join(', ') : (color || null),
            image_url: primaryImageUrl,
            promo_discount: promoDiscount === '' ? 0 : promoDiscount,
            tax_rate: taxRate,
            category_id: categoryId || null,
            product_type: resolvedProductType,
            has_variants: hasVarBool,
            variants: formattedVariants,
            attributes: {
                ...(customAttrs || {}),
                tax_rate: taxRate,
                is_lens: isLensType,
                lens_design: lensDesign,
                lens_material: lensMaterial,
                lens_treatment: lensTreatment
            }
        };

        try {
            const url = editingProduct 
                ? `/api/clients/${clientId}/products/${editingProduct.id}`
                : `/api/clients/${clientId}/products`;
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                await fetchProducts();
                if (keepOpen) {
                    setEditingProduct(null);
                    setName('');
                    setSku('');
                    setDescription('');
                    setPrice('');
                    setCostPrice('');
                    setStock('');
                    setMinStock(5);
                    setBrand('');
                    setMaterial('');
                    setStyle('');
                    setColor('');
                    setPromoDiscount('');
                    setCustomAttrs({});
                    setHasVariants(true);
                    setVariantList([{ color: 'Negro', sku: '', stock: 10, min_stock: 2, image_url: '' }]);
                    setActivePhotoColorIdx(0);
                    setAddProductStep('open');
                    alert('✓ Producto guardado con éxito.\n\nFormulario despejado para ingresar un nuevo producto.');
                } else {
                    resetForm();
                    alert(editingProduct ? '✓ Producto actualizado con éxito.' : '✓ Producto guardado con éxito.');
                }
            } else {
                alert(`Error al guardar producto: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Error de conexión al guardar el producto: ${err.message}`);
        }
    };

    const handleUpdatePromoDiscount = async (prod: Product, val: number) => {
        if (!isAdmin) {
            alert('No tienes permisos de administrador para modificar promociones de productos.');
            return;
        }
        const cleanDiscount = Math.max(0, Math.min(100, val));
        const body = {
            name: prod.name,
            sku: prod.sku,
            description: prod.description,
            price: parseFloat(prod.price),
            stock: prod.stock,
            cost_price: parseFloat(prod.cost_price || '0'),
            brand: prod.brand,
            material: prod.material,
            style: prod.style,
            color: prod.color,
            promo_discount: cleanDiscount
        };

        try {
            const res = await fetch(`/api/clients/${clientId}/products/${prod.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                // Update local state smoothly
                setProducts(products.map(p => p.id === prod.id ? { ...p, promo_discount: cleanDiscount.toString() } : p));
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al guardar promoción.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) {
            alert('No tienes permisos de administrador para eliminar productos.');
            return;
        }
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/products/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                fetchProducts();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al eliminar producto.');
        }
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            setImportSuccessMsg('');
            setImportErrorMsg('');

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/clients/${clientId}/products/import`, {
                method: 'POST',
                body: formData
            });
            const json = await res.json();

            if (json.success) {
                setImportSuccessMsg(json.message || 'Productos importados correctamente.');
                fetchProducts();
            } else {
                setImportErrorMsg(json.error || 'Error al importar archivo CSV.');
            }
        } catch (err) {
            setImportErrorMsg('Error de conexión al enviar el archivo.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const openEdit = (prod: Product) => {
        setEditingProduct(prod);
        setName(prod.name);
        setSku(prod.sku || '');
        setDescription(prod.description || '');
        setPrice(parseFloat(prod.price));
        setCostPrice(prod.cost_price ? parseFloat(prod.cost_price) : 0);
        setStock(prod.stock);
        setMinStock(prod.min_stock !== undefined ? prod.min_stock : 5);
        setBrand(prod.brand || '');
        setMaterial(prod.material || '');
        setStyle(prod.style || '');
        setColor(prod.color || '');
        setPromoDiscount(prod.promo_discount ? parseFloat(prod.promo_discount) : 0);
        const rawTax = (prod as any).tax_rate !== undefined && (prod as any).tax_rate !== null 
            ? (prod as any).tax_rate 
            : ((prod as any).attributes?.tax_rate !== undefined ? (prod as any).attributes.tax_rate : 0);
        setTaxRate(parseFloat(rawTax.toString()) || 0);
        setCategoryId(prod.category_id || '');
        const isService = prod.product_type === 'service' || (prod.stock && prod.stock >= 999999);
        setProductType(isService ? 'service' : 'product');
        const attrs = (prod as any).attributes || {};
        setCustomAttrs(attrs);

        const lDesign = attrs.lens_design || prod.style || '';
        const lMaterial = attrs.lens_material || prod.material || '';
        const lTreatment = attrs.lens_treatment || prod.description || '';
        const isLensCat = prod.category_id && categories.find((c: any) => c.id === prod.category_id)?.name.toLowerCase().includes('lente');
        const isLens = attrs.is_lens || (isService && (lDesign || lMaterial || lTreatment || isLensCat));

        setIsLensMode(Boolean(isLens));
        setLensDesign(lDesign);
        setLensMaterial(lMaterial);
        setLensTreatment(lTreatment);

        setAddProductStep('open');
        setHiddenFields(new Set());

        // Cargar las variantes por color registradas
        if (prod.variants && prod.variants.length > 0) {
            setHasVariants(true);
            setVariantList(prod.variants.map((v: any) => ({
                id: v.id,
                color: v.variant_name || v.color || 'Negro',
                sku: v.sku || '',
                stock: v.stock !== undefined ? v.stock : 0,
                min_stock: v.min_stock !== undefined ? v.min_stock : 2,
                image_url: v.image_url || ''
            })));
        } else if (prod.has_variants && prod.color && prod.color.includes(',')) {
            setHasVariants(true);
            const colorNames = prod.color.split(',').map((c: string) => c.trim()).filter(Boolean);
            setVariantList(colorNames.map((c: string) => ({
                color: c,
                sku: '',
                stock: Math.floor((prod.stock || 0) / colorNames.length) || 0,
                min_stock: prod.min_stock || 2,
                image_url: ''
            })));
        } else {
            setHasVariants(Boolean(prod.has_variants));
            if (prod.has_variants) {
                setVariantList([{ color: prod.color || 'Negro', sku: prod.sku || '', stock: prod.stock || 0, min_stock: prod.min_stock || 2, image_url: '' }]);
            } else {
                setVariantList([{ color: 'Negro', sku: '', stock: prod.stock || 0, min_stock: prod.min_stock || 2, image_url: '' }]);
            }
        }
    };

    const resetForm = () => {
        setProductFormStep(1);
        setEditingProduct(null);
        setName('');
        setSku('');
        setDescription('');
        setPrice('');
        setCostPrice('');
        setStock('');
        setMinStock(5);
        setBrand('');
        setMaterial('');
        setStyle('');
        setColor('');
        setPromoDiscount('');
        setTaxRate(0);
        setCategoryId('');
        setProductType('product');
        setCustomAttrs({});
        setHiddenFields(new Set());
        setHasVariants(true);
        setVariantList([{ color: 'Negro', sku: '', stock: 10, min_stock: 2, image_url: '' }]);
        setLensDesign('');
        setLensMaterial('');
        setLensTreatment('');
        setIsLensMode(false);
        setAddProductStep('closed');
    };

    const openRefillModal = (prod: Product) => {
        setRefillProduct(prod);
        setRefillQuantity('');
        setPrintAfterRefill(true);

        if (prod.variants && prod.variants.length > 0) {
            const initialMap: Record<string, number | ''> = {};
            prod.variants.forEach((v: any, idx: number) => {
                const key = v.id || v.sku || v.variant_name || v.color || `var_${idx}`;
                initialMap[key] = '';
            });
            setRefillVariantQuantities(initialMap);
        } else {
            setRefillVariantQuantities({});
        }

        setIsRefillModalOpen(true);
    };

    const handleSaveRefill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!refillProduct) return;

        const hasVars = Boolean(refillProduct.variants && refillProduct.variants.length > 0);
        let updatedVariants: any[] = [];
        let addedTotalStock = 0;
        const labelsToPrint: any[] = [];

        if (hasVars) {
            updatedVariants = refillProduct.variants!.map((v: any, idx: number) => {
                const key = v.id || v.sku || v.variant_name || v.color || `var_${idx}`;
                const addedForThisVar = parseInt(refillVariantQuantities[key]?.toString() || '0', 10) || 0;
                if (addedForThisVar > 0) {
                    addedTotalStock += addedForThisVar;
                    labelsToPrint.push({
                        name: `${refillProduct.name} (${v.variant_name || v.color})`,
                        sku: v.sku || refillProduct.sku || '',
                        price: refillProduct.price,
                        quantity: addedForThisVar
                    });
                }
                return {
                    id: v.id,
                    variant_name: v.variant_name || v.color,
                    color_hex: v.color_hex || null,
                    sku: v.sku,
                    stock: (parseInt(v.stock?.toString() || '0') || 0) + addedForThisVar,
                    min_stock: v.min_stock || 2,
                    image_url: v.image_url || null
                };
            });

            if (addedTotalStock <= 0) {
                alert('Por favor ingresa la cantidad a rellenar (mayor a 0) en al menos una variante de color.');
                return;
            }
        } else {
            const addedQty = parseInt(refillQuantity.toString() || '0', 10) || 0;
            if (addedQty <= 0) {
                alert('Ingresa una cantidad válida mayor a 0.');
                return;
            }
            addedTotalStock = addedQty;
            labelsToPrint.push({
                name: refillProduct.name,
                sku: refillProduct.sku || '',
                price: refillProduct.price,
                quantity: addedQty
            });
        }

        const newStock = (refillProduct.stock || 0) + addedTotalStock;

        const body = {
            name: refillProduct.name,
            sku: refillProduct.sku || null,
            description: refillProduct.description || null,
            price: refillProduct.price,
            stock: newStock,
            cost_price: refillProduct.cost_price || 0,
            min_stock: refillProduct.min_stock || 5,
            supplier_name: refillProduct.supplier_name || null,
            supplier_phone: refillProduct.supplier_phone || null,
            brand: refillProduct.brand || null,
            material: refillProduct.material || null,
            style: refillProduct.style || null,
            color: refillProduct.color || null,
            promo_discount: refillProduct.promo_discount || 0,
            category_id: refillProduct.category_id || null,
            has_variants: hasVars,
            variants: hasVars ? updatedVariants : undefined
        };

        try {
            const res = await fetch(`/api/clients/${clientId}/products/${refillProduct.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const json = await res.json();
            if (json.success) {
                setIsRefillModalOpen(false);
                fetchProducts();
                
                if (printAfterRefill && labelsToPrint.length > 0) {
                    setTimeout(() => {
                        for (const item of labelsToPrint) {
                            printBarcodes([item]);
                        }
                    }, 300);
                }
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al rellenar inventario.');
        }
    };

    const formatPrice = (val: string | number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0
        }).format(parseFloat(val?.toString() || '0') || 0);
    };

    const uniqueBrands = Array.from(
        new Set(products.map(p => p.brand).filter((b): b is string => Boolean(b && b.trim())))
    ).sort();

    const filteredProducts = products.filter(prod => {
        const rawMatch = searchTerm.trim().toLowerCase();
        const terms = rawMatch.split(/\s+/).filter(Boolean);
        const variantsStr = Array.isArray(prod.variants)
            ? prod.variants.map((v: any) => `${v.name || ''} ${v.sku || ''} ${v.options || ''}`).join(' ')
            : '';
        const fullSearchable = `${prod.name || ''} ${prod.sku || ''} ${prod.brand || ''} ${prod.model || ''} ${prod.color || ''} ${prod.material || ''} ${prod.style || ''} ${prod.description || ''} ${variantsStr}`.toLowerCase();

        const matchesSearch = terms.length === 0 || terms.every(term => fullSearchable.includes(term));

        const matchesBrand = filterBrand === 'all' || (prod.brand && prod.brand.toLowerCase() === filterBrand.toLowerCase());

        const itemStock = prod.stock || 0;
        const itemMinStock = prod.min_stock || 2;
        let matchesStock = true;
        if (filterStock === 'in_stock') matchesStock = itemStock > 0;
        else if (filterStock === 'low_stock') matchesStock = itemStock > 0 && itemStock <= itemMinStock;
        else if (filterStock === 'out_of_stock') matchesStock = itemStock === 0;

        const itemPrice = parseFloat(prod.price || '0');
        const minP = filterMinPrice !== '' ? parseFloat(filterMinPrice) : null;
        const maxP = filterMaxPrice !== '' ? parseFloat(filterMaxPrice) : null;

        let matchesPrice = true;
        if (minP !== null && !isNaN(minP)) matchesPrice = matchesPrice && itemPrice >= minP;
        if (maxP !== null && !isNaN(maxP)) matchesPrice = matchesPrice && itemPrice <= maxP;

        return matchesSearch && matchesBrand && matchesStock && matchesPrice;
    });

    return (
        <div className="space-y-6 text-[#161616] font-sans">
            {/* Barra de Subsecciones Compacta para Móvil (Segmented Control Horizontal) */}
            <div className="compact-subsections-bar md:hidden">
                <button 
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className={`subsection-item cursor-pointer border-0 ${activeTab === 'catalog' ? 'bg-white text-[#161616] shadow-sm font-bold' : 'bg-transparent text-[#6B6862]'}`}
                >
                    CATÁLOGO
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveTab('promotions')}
                    className={`subsection-item cursor-pointer border-0 ${activeTab === 'promotions' ? 'bg-white text-[#161616] shadow-sm font-bold' : 'bg-transparent text-[#6B6862]'}`}
                >
                    PROMOCIONES
                </button>
                <button 
                    type="button"
                    onClick={() => setActiveTab('rotation')}
                    className={`subsection-item cursor-pointer border-0 ${activeTab === 'rotation' ? 'bg-white text-[#161616] shadow-sm font-bold' : 'bg-transparent text-[#6B6862]'}`}
                >
                    ROTACIÓN & KARDEX
                </button>
            </div>

            {/* Header Editorial Wabi-Sabi */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5 mb-8">
                <div>
                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-sans block mb-1">LOGÍSTICA & STOCK</span>
                    <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#161616] tracking-tight leading-none">Inventario de Productos</h2>
                </div>
                <div className="flex items-center gap-3">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportCSV} 
                        className="hidden" 
                        accept=".csv" 
                    />
                    {isAdmin && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] text-[11px] font-bold py-2.5 px-3.5 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                            title="Importar CSV"
                        >
                            <span className="material-symbols-outlined text-[16px] text-[#D9381E]">publish</span>
                            {importing ? '...' : 'CSV'}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={fetchProducts}
                        className="p-2.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] cursor-pointer transition text-[11px] font-bold shrink-0 uppercase tracking-wider"
                        title="Refrescar catálogo"
                    >
                        <span className="material-symbols-outlined text-[16px] text-[#D9381E]">refresh</span>
                    </button>
                    <button
                        type="button"
                        onClick={openAuditModalGeneral}
                        className="p-2.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] cursor-pointer transition text-[11px] font-bold shrink-0 uppercase tracking-wider flex items-center gap-1.5"
                        title="Ver Bitácora de Cambios de Inventario"
                    >
                        <span className="material-symbols-outlined text-[16px] text-amber-600">history</span>
                        Historial
                    </button>
                    <button
                        onClick={() => { resetForm(); setAddProductStep('open'); }}
                        className="bg-[#161616] hover:bg-[#D9381E] text-white text-[12px] font-bold py-3.5 px-7 flex items-center gap-2 transition-all cursor-pointer border-0 uppercase tracking-widest shadow-sm"
                    >
                        + NUEVO PRODUCTO / ÍTEM
                    </button>
                </div>
            </div>

            {/* Banners feedback */}
            {importSuccessMsg && (
                <div className="bg-[#E6F4EA] border border-[#A8DADC] text-[#1E4620] text-xs p-3 font-semibold flex items-center gap-2">
                    ✓ {importSuccessMsg}
                </div>
            )}
            {importErrorMsg && (
                <div className="bg-[#FCE8E6] border border-[#F5C6CB] text-[#C5221F] text-xs p-3 font-semibold flex items-center gap-2">
                    ⚠️ {importErrorMsg}
                </div>
            )}

            {/* TARJETAS RESUMEN KPI (TOTAL PRODUCTOS, DINERO INVENTARIO, ALERTAS - EXACTO IMAGEN 2) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* 1. TOTAL DE ÍTEMS EN STOCK */}
                <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-6 flex flex-col justify-between transition-all hover:border-[#161616]">
                    <span className="text-[11px] uppercase tracking-widest text-[#6B6862] font-semibold">TOTAL DE ÍTEMS EN STOCK</span>
                    <div className="mt-4">
                        <div className="font-serif text-4xl sm:text-5xl text-[#161616] font-normal leading-none flex items-baseline gap-2">
                            {products.reduce((acc, p) => acc + (p.product_type === 'service' || (p.stock || 0) >= 999999 ? 0 : (p.stock || 0)), 0)} <span className="font-sans text-sm text-[#6B6862] font-normal">items</span>
                        </div>
                        <p className="text-[#6B6862] text-xs mt-3 font-sans">Catalogados en sistema ERP (Excluye servicios)</p>
                    </div>
                </div>

                {/* 2. VALOR EN INVENTARIO */}
                <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-6 flex flex-col justify-between transition-all hover:border-[#161616]">
                    <span className="text-[11px] uppercase tracking-widest text-[#6B6862] font-semibold">
                        {isAdmin ? 'VALOR EN INVENTARIO' : 'VALOR COMERCIAL EN INVENTARIO'}
                    </span>
                    <div className="mt-4">
                        <div className="font-serif text-4xl sm:text-5xl text-[#161616] font-normal leading-none">
                            {(() => {
                                const totalVal = products.reduce((acc, p) => {
                                    if (p.product_type === 'service' || (p.stock || 0) >= 999999) return acc;
                                    const itemPrice = parseFloat((isAdmin ? (p.cost_price || p.price) : p.price) || '0') || 0;
                                    return acc + ((p.stock || 0) * itemPrice);
                                }, 0);
                                if (totalVal >= 1000000) {
                                    return `$${(totalVal / 1000000).toFixed(1)}M COP`;
                                }
                                return `$${totalVal.toLocaleString('es-CO')} COP`;
                            })()}
                        </div>
                        <p className="text-[#6B6862] text-xs mt-3 font-sans">
                            {isAdmin ? 'Costo total de productos físicos en bodega' : 'Valor total estimado a precio de venta (PVP)'}
                        </p>
                    </div>
                </div>

                {/* 3. ALERTAS DE STOCK BAJO */}
                <div className="bg-[#FAF8F5] border border-[#E2DFD7] border-l-4 border-l-[#D9381E] p-6 flex flex-col justify-between transition-all hover:border-[#161616]">
                    <span className="text-[11px] uppercase tracking-widest text-[#6B6862] font-semibold">ALERTAS DE STOCK BAJO</span>
                    <div className="mt-4">
                        <div className="font-serif text-4xl sm:text-5xl text-[#D9381E] font-normal leading-none flex items-baseline gap-2">
                            {products.filter(p => p.product_type !== 'service' && (p.stock || 0) < 999999 && (p.stock || 0) <= (p.min_stock !== undefined ? p.min_stock : 5)).length} <span className="font-sans text-sm text-[#6B6862] font-normal">Alertas</span>
                        </div>
                        <p className="text-[#6B6862] text-xs mt-3 font-sans">Ítems por debajo del stock mínimo</p>
                    </div>
                </div>
            </div>

            {/* Buscador Zen Sutil con Sistema de Filtros Completo Wabi-Sabi */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-[#161616] pb-3 mb-6">
                <div className="relative flex-1 flex items-center min-w-[280px]">
                    <span className="material-symbols-outlined text-[18px] text-[#6B6862] mr-2 shrink-0">search</span>
                    <input 
                        type="text"
                        ref={searchInputRef}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por SKU, referencia, nombre o marca..."
                        className="w-full bg-transparent border-none py-1.5 text-xs text-[#161616] placeholder-[#6B6862] outline-none font-sans"
                    />
                </div>

                {/* Filtros Integrados (Marca, Nivel de Stock, Rango de Precios) en Estética Papel Wabi-Sabi */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-[#161616]">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#6B6862] uppercase tracking-wider font-bold">MARCA:</span>
                        <select
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                            className="bg-white border border-[#E2DFD7] py-1.5 px-2.5 text-xs text-[#161616] outline-none cursor-pointer rounded-none font-sans"
                        >
                            <option value="all">Todas ({uniqueBrands.length})</option>
                            {uniqueBrands.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#6B6862] uppercase tracking-wider font-bold">STOCK:</span>
                        <select
                            value={filterStock}
                            onChange={(e) => setFilterStock(e.target.value)}
                            className="bg-white border border-[#E2DFD7] py-1.5 px-2.5 text-xs text-[#161616] outline-none cursor-pointer rounded-none font-sans"
                        >
                            <option value="all">Todo</option>
                            <option value="in_stock">Disponible (&gt;0)</option>
                            <option value="low_stock">Stock Bajo</option>
                            <option value="out_of_stock">Agotado (0)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#6B6862] uppercase tracking-wider font-bold">PRECIO:</span>
                        <input
                            type="number"
                            value={filterMinPrice}
                            onChange={(e) => setFilterMinPrice(e.target.value)}
                            placeholder="Mín"
                            className="w-16 bg-white border border-[#E2DFD7] p-1.5 text-xs text-[#161616] outline-none font-mono rounded-none"
                        />
                        <span className="text-[#6B6862]">-</span>
                        <input
                            type="number"
                            value={filterMaxPrice}
                            onChange={(e) => setFilterMaxPrice(e.target.value)}
                            placeholder="Máx"
                            className="w-16 bg-white border border-[#E2DFD7] p-1.5 text-xs text-[#161616] outline-none font-mono rounded-none"
                        />
                    </div>

                    {(filterBrand !== 'all' || filterStock !== 'all' || filterMinPrice !== '' || filterMaxPrice !== '') && (
                        <button
                            type="button"
                            onClick={() => {
                                setFilterBrand('all');
                                setFilterStock('all');
                                setFilterMinPrice('');
                                setFilterMaxPrice('');
                            }}
                            className="px-2 py-1 bg-[#D9381E] text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer border-0 rounded-none"
                            title="Limpiar Filtros"
                        >
                            Limpiar
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => handleOpenCrossStock(null, searchTerm)}
                        className="px-3 py-1.5 bg-[#161616] hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-wider cursor-pointer border-0 rounded-none flex items-center gap-1.5 shadow-sm transition"
                        title="Consultar disponibilidad de stock en todas las sedes sucursales"
                    >
                        <span className="material-symbols-outlined text-[16px]">domain</span>
                        Stock Inter-Sedes
                    </button>
                </div>
            </div>

            {/* Render Tab Contents */}
            {activeTab === 'catalog' ? (
                <>
                    {/* Modal Rápido para Crear Nueva Categoría */}
                    {showCreateCategoryPrompt && createPortal(
                        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-left">
                            <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none max-w-md w-full shadow-2xl space-y-4">
                                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                                    <h3 className="font-serif text-xl font-normal text-[#161616] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#D9381E] text-[20px]">add_box</span>
                                        Nueva Categoría
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCreateCategoryPrompt(false)}
                                        className="p-1 text-[#6B6862] hover:text-[#161616] border-0 bg-transparent cursor-pointer transition text-lg"
                                    >
                                        &times;
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-[#6B6862] font-bold uppercase tracking-wider">Nombre de Categoría</label>
                                    <input 
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Ej: Monturas, Lentes, Estuches..."
                                        className="bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none transition rounded-none"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleCreateCategory();
                                            }
                                        }}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                                    <button 
                                        type="button"
                                        onClick={() => setShowCreateCategoryPrompt(false)}
                                        className="px-4 py-2 bg-transparent border border-[#E2DFD7] text-[#161616] text-xs font-semibold rounded-none transition cursor-pointer uppercase tracking-wider"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={!newCategoryName.trim()}
                                        className="px-4 py-2 bg-[#D9381E] hover:bg-[#b82e18] disabled:opacity-50 text-white text-xs font-semibold rounded-none transition cursor-pointer border-0 flex items-center gap-1.5 uppercase tracking-wider"
                                    >
                                        Crear
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* MODAL POPUP WIDESCREEN EDITORIAL WABI-SABI PARA AGREGAR / EDITAR PRODUCTOS */}
                    {isFormOpen && createPortal(
                        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
                            <div className="bg-[#F6F4EE] border border-[#161616] w-full max-w-[1540px] max-h-[calc(100vh-2.5rem)] h-full sm:h-[86vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-fade-in modal-stepper-mobile">
                                
                                {/* Header del Modal */}
                                <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E2DFD7] flex justify-between items-center bg-[#F6F4EE] shrink-0">
                                    <div>
                                        <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-sans block">FORMULARIO DE INVENTARIO ERP</span>
                                        <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] leading-tight">
                                            {editingProduct ? 'Editar Producto o Servicio' : 'Crear / Editar Producto o Servicio de Venta'}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="text-[#161616] hover:text-[#D9381E] text-3xl font-light cursor-pointer border-0 bg-transparent leading-none"
                                        title="Cerrar modal"
                                    >
                                        &times;
                                    </button>
                                </div>

                                {/* Indicador Stepper de Pasos Wabi-Sabi */}
                                <div className="px-4 py-2.5 bg-[#FAF8F5] border-b border-[#E2DFD7] flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto w-full custom-scrollbar pb-1">
                                        <button
                                            type="button"
                                            onClick={() => setProductFormStep(1)}
                                            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition flex items-center gap-1.5 shrink-0 ${
                                                productFormStep === 1
                                                    ? 'bg-[#161616] text-white border-[#161616]'
                                                    : productFormStep > 1
                                                    ? 'bg-[#EAE6DF] text-[#161616] border-[#E2DFD7]'
                                                    : 'bg-white text-[#6B6862] border-[#E2DFD7]'
                                            }`}
                                        >
                                            <span className="w-4 h-4 rounded-full bg-[#D9381E] text-white text-[9px] flex items-center justify-center font-mono font-bold">1</span>
                                            <span>1. Datos & Foto</span>
                                        </button>

                                        <span className="text-[#E2DFD7] font-bold text-xs shrink-0">→</span>

                                        <button
                                            type="button"
                                            onClick={() => setProductFormStep(2)}
                                            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition flex items-center gap-1.5 shrink-0 ${
                                                productFormStep === 2
                                                    ? 'bg-[#161616] text-white border-[#161616]'
                                                    : productFormStep > 2
                                                    ? 'bg-[#EAE6DF] text-[#161616] border-[#E2DFD7]'
                                                    : 'bg-white text-[#6B6862] border-[#E2DFD7]'
                                            }`}
                                        >
                                            <span className="w-4 h-4 rounded-full bg-[#D9381E] text-white text-[9px] flex items-center justify-center font-mono font-bold">2</span>
                                            <span>2. Variantes & Stock ({variantList.length})</span>
                                        </button>

                                        <span className="text-[#E2DFD7] font-bold text-xs shrink-0">→</span>

                                        <button
                                            type="button"
                                            onClick={() => setProductFormStep(3)}
                                            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition flex items-center gap-1.5 shrink-0 ${
                                                productFormStep === 3
                                                    ? 'bg-[#D9381E] text-white border-[#D9381E]'
                                                    : 'bg-white text-[#6B6862] border-[#E2DFD7]'
                                            }`}
                                        >
                                            <span className="w-4 h-4 rounded-full bg-white text-[#161616] text-[9px] flex items-center justify-center font-mono font-bold">3</span>
                                            <span>3. Precios & Guardar</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Formulario Dinámico por Pasos */}
                                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                                    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar">
                                        
                                        {/* PASO 1: DATOS BÁSICOS Y FOTOGRAFÍA */}
                                        {productFormStep === 1 && (
                                            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                                                <h4 className="font-serif text-xl text-[#161616] border-b border-[#E2DFD7] pb-2 mb-4 font-normal">
                                                    1. Datos Básicos, Clasificación & Fotografía
                                                </h4>

                                                {/* Selector Categoría + Selector Tipo de Ítem */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Tipo de Ítem *</label>
                                                        <select
                                                            value={isLensMode ? 'lens' : productType}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'lens') {
                                                                    setIsLensMode(true);
                                                                    setProductType('service');
                                                                    setStock(999999);
                                                                    const lentesCat = categories.find((c: any) => c.name.toLowerCase().includes('lente'));
                                                                    if (lentesCat) setCategoryId(lentesCat.id);
                                                                } else {
                                                                    setIsLensMode(false);
                                                                    const pVal = val as 'product' | 'service';
                                                                    setProductType(pVal);
                                                                    if (pVal === 'service') setStock(999999);
                                                                    else if (stock === 999999) setStock('');
                                                                }
                                                            }}
                                                            className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] font-semibold outline-none focus:border-[#161616] transition rounded-none"
                                                        >
                                                            <option value="product">Producto Inventariable (Físico)</option>
                                                            <option value="service">Servicio / Honorario Médico (Sin Stock)</option>
                                                            <option value="lens">Lente / Cristal Oftálmico (Servicio Sin Stock)</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold flex items-center justify-between">
                                                            <span>Categoría del Producto *</span>
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <select 
                                                                className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] font-semibold outline-none focus:border-[#161616] transition w-full rounded-none"
                                                                value={categoryId}
                                                                onChange={(e) => {
                                                                    if (e.target.value === 'new') {
                                                                        setShowCreateCategoryPrompt(true);
                                                                    } else {
                                                                        handleSelectCategory(e.target.value);
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">-- Selecciona Categoría --</option>
                                                                {categories.map((cat: any) => (
                                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                                ))}
                                                                <option value="new" className="font-bold text-[#D9381E]">+ Crear Nueva Categoría</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Características del Lente */}
                                                {(isLensMode || (categoryId && categories.find((c: any) => c.id === categoryId)?.name.toLowerCase().includes('lente'))) && (
                                                    <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-4 space-y-4 mb-5 rounded-none text-[#161616]">
                                                        <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[#D9381E] text-[18px]">visibility</span>
                                                                <span className="text-xs font-bold text-[#161616] uppercase tracking-wider">Características del Lente / Cristal</span>
                                                            </div>
                                                            <span className="text-[10px] bg-white text-[#6B6862] border border-[#E2DFD7] px-2 py-0.5 font-mono uppercase tracking-wider">
                                                                Servicio Sin Stock
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Tipo de Uso</label>
                                                                <select
                                                                    value={lensDesign}
                                                                    onChange={(e) => setLensDesign(e.target.value)}
                                                                    className="w-full bg-white border border-[#E2DFD7] text-[#161616] p-3 text-xs font-semibold outline-none focus:border-[#161616] transition rounded-none"
                                                                >
                                                                    <option value="">– Seleccione Tipo de Uso –</option>
                                                                    <option value="Monofocal">Monofocal</option>
                                                                    <option value="Bifocal">Bifocal</option>
                                                                    <option value="Progresivo">Progresivo / Multifocal</option>
                                                                    <option value="Ocupacional">Ocupacional</option>
                                                                    <option value="Anti-fatiga">Anti-fatiga</option>
                                                                    <option value="Lente de Contacto">Lente de Contacto</option>
                                                                </select>
                                                            </div>

                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Material del Cristal</label>
                                                                <select
                                                                    value={lensMaterial}
                                                                    onChange={(e) => setLensMaterial(e.target.value)}
                                                                    className="w-full bg-white border border-[#E2DFD7] text-[#161616] p-3 text-xs font-semibold outline-none focus:border-[#161616] transition rounded-none"
                                                                >
                                                                    <option value="">– Seleccione Material –</option>
                                                                    <option value="CR-39 / Orgánico">CR-39 / Orgánico (1.56)</option>
                                                                    <option value="Policarbonato">Policarbonato (1.59)</option>
                                                                    <option value="Alto Índice 1.67">Alto Índice 1.67</option>
                                                                    <option value="Alto Índice 1.74">Alto Índice 1.74</option>
                                                                    <option value="Trivex / Polilite">Trivex / Polilite</option>
                                                                    <option value="Cristal / Vidrio">Cristal / Vidrio</option>
                                                                    <option value="Hidrogel de Silicona">Hidrogel de Silicona</option>
                                                                </select>
                                                            </div>

                                                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Tratamiento / Filtro</label>
                                                                <select
                                                                    value={lensTreatment}
                                                                    onChange={(e) => setLensTreatment(e.target.value)}
                                                                    className="w-full bg-white border border-[#E2DFD7] text-[#161616] p-3 text-xs font-semibold outline-none focus:border-[#161616] transition rounded-none"
                                                                >
                                                                    <option value="">– Seleccione Tratamiento –</option>
                                                                    <option value="Sencillo / Blanco">Sencillo / Blanco (Sin Filtro)</option>
                                                                    <option value="Antirreflejo (AR)">Antirreflejo (AR)</option>
                                                                    <option value="AR-Blue (Filtro Azul)">AR-Blue (Filtro Azul / AR Blue)</option>
                                                                    <option value="Fotocromático (Transitions)">Fotocromático (Transitions)</option>
                                                                    <option value="Fotocromático AR-Blue">Fotocromático AR-Blue (Transitions + AR Blue)</option>
                                                                    <option value="Polarizado">Polarizado</option>
                                                                    <option value="Espejado">Espejado</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Marca & Referencia */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                                                    {productType === 'product' && (
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Marca / Fabricante *</label>
                                                            <input 
                                                                type="text"
                                                                className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans"
                                                                value={brand}
                                                                onChange={(e) => setBrand(e.target.value)}
                                                                placeholder="Ej: Ray-Ban, Gucci, Oakley, Bausch + Lomb"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className={`flex flex-col gap-1.5 ${productType === 'service' ? 'col-span-2' : ''}`}>
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Nombre / Referencia / Modelo *</label>
                                                        <input 
                                                            type="text"
                                                            className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans font-semibold"
                                                            value={name}
                                                            onChange={(e) => setName(e.target.value)}
                                                            placeholder="Ej: Montura Acetato KOI Titanium Black"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {/* SKU Producto Simple */}
                                                {(!hasVariants || productType === 'service') ? (
                                                    <div className="flex flex-col gap-1.5 mb-4">
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold flex items-center justify-between">
                                                            <span>SKU / Código de Barras (Producto Simple)</span>
                                                            <span className="text-[10px] text-[#D9381E] font-bold flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[13px]">barcode_scanner</span>
                                                                Pistola Lectora
                                                            </span>
                                                        </label>
                                                        <input 
                                                            type="text"
                                                            className="w-full bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition font-mono uppercase rounded-none"
                                                            value={sku}
                                                            onChange={(e) => setSku(e.target.value)}
                                                            placeholder="Disparar pistola lectora o dejar en blanco..."
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-3 flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[#D9381E] text-[20px]">palette</span>
                                                            <div>
                                                                <p className="text-xs font-bold text-[#161616]">Producto con Variantes de Color Activas</p>
                                                                <p className="text-[10px] text-[#6B6862]">Los códigos de barras y stock se definen individualmente por cada color en el Paso 2.</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setHasVariants(false)}
                                                            className="px-3 py-1 bg-[#FCE8E6] hover:bg-[#F5C6CB] text-[#C5221F] border border-[#F5C6CB] text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 rounded-none uppercase tracking-wider"
                                                            title="Convertir a Producto Simple"
                                                        >
                                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                                            Producto Simple
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Sección de Fotografía del Producto */}
                                                <div className="bg-white border border-[#E2DFD7] p-5 space-y-4">
                                                    <div className="flex justify-between items-baseline border-b border-[#E2DFD7] pb-2">
                                                        <h4 className="font-serif text-lg text-[#161616] font-normal">Fotografía del Ítem</h4>
                                                        <span className="text-[10px] text-[#D9381E] font-bold uppercase tracking-wider">
                                                            COLOR: {variantList[activePhotoColorIdx]?.color || 'NEGRO'}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                                        <label className="photo-dropzone-compact relative group cursor-pointer shrink-0 w-[160px] h-[160px] border-2 border-dashed border-[#E2DFD7] flex flex-col items-center justify-center bg-[#FAF8F5] hover:border-[#161616] transition">
                                                            {variantList[activePhotoColorIdx]?.image_url ? (
                                                                <>
                                                                    <img 
                                                                        src={variantList[activePhotoColorIdx].image_url!} 
                                                                        alt="Preview" 
                                                                        className="w-full h-full object-cover" 
                                                                    />
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                                        <span className="material-symbols-outlined text-white text-2xl">edit</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="material-symbols-outlined text-3xl text-[#6B6862] group-hover:text-[#D9381E]">photo_camera</span>
                                                                    <span className="text-[11px] font-medium text-center px-3 text-[#6B6862] mt-1">
                                                                        Subir foto para variante
                                                                    </span>
                                                                </>
                                                            )}
                                                            <input 
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = () => {
                                                                            if (reader.result) {
                                                                                const updated = [...variantList];
                                                                                if (updated[activePhotoColorIdx]) {
                                                                                    updated[activePhotoColorIdx].image_url = reader.result.toString();
                                                                                    setVariantList(updated);
                                                                                }
                                                                            }
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                            />
                                                        </label>

                                                        {variantList.length > 0 && (
                                                            <div className="flex flex-col gap-2 flex-1">
                                                                <span className="text-[10px] text-[#6B6862] font-semibold uppercase tracking-wider">
                                                                    COLOR SELECCIONADO PARA FOTO: {variantList[activePhotoColorIdx]?.color || 'NEGRO'}
                                                                </span>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {variantList.map((v, idx) => (
                                                                        <button
                                                                            key={idx}
                                                                            type="button"
                                                                            onClick={() => setActivePhotoColorIdx(idx)}
                                                                            className={`px-3 py-1.5 text-xs font-bold border cursor-pointer transition flex items-center gap-1.5 ${
                                                                                idx === activePhotoColorIdx
                                                                                    ? 'bg-[#161616] text-white border-[#161616]'
                                                                                    : 'bg-white text-[#161616] border-[#E2DFD7]'
                                                                            }`}
                                                                        >
                                                                            <span 
                                                                                className="w-3 h-3 rounded-full border border-black/20" 
                                                                                style={{ background: getColorPreview(v.color) }}
                                                                            />
                                                                            <span>{v.color || `Color ${idx + 1}`}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Navegación Paso 1 */}
                                                <div className="pt-6 border-t border-[#E2DFD7] flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductFormStep(2)}
                                                        className="bg-[#161616] hover:bg-[#2c2c2c] text-white border-0 px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-2 transition"
                                                    >
                                                        Siguiente
                                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* PASO 2: VARIANTES DE COLOR Y STOCK */}
                                        {productFormStep === 2 && (
                                            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                                                <h4 className="font-serif text-xl text-[#161616] border-b border-[#E2DFD7] pb-2 mb-4 font-normal">
                                                    2. Variantes de Color & Control de Stock
                                                </h4>

                                                {productType === 'product' && (
                                                    <div className="space-y-4">
                                                        {hasVariants ? (
                                                            <div className="bg-white p-5 border border-[#E2DFD7] space-y-4">
                                                                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                                                                    <div>
                                                                        <h5 className="font-bold text-xs uppercase tracking-wider text-[#161616]">Tabla de Existencias por Color</h5>
                                                                        <p className="text-[11px] text-[#6B6862]">Asigna códigos SKU y stock físico para cada variante de color.</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setVariantList([...variantList, { color: '', sku: '', stock: 1, min_stock: 2, image_url: '' }])}
                                                                        className="bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-[10px] font-bold py-2 px-3 rounded-none flex items-center gap-1 transition uppercase tracking-wider"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[14px] text-[#D9381E]">add</span>
                                                                        + Color
                                                                    </button>
                                                                </div>

                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-left text-xs border-collapse">
                                                                        <thead>
                                                                            <tr className="border-b border-[#E2DFD7] text-[#6B6862] text-[10px] uppercase font-mono">
                                                                                <th className="py-2 pr-2">Color / Variante</th>
                                                                                <th className="py-2 px-2">Código SKU / Barras</th>
                                                                                <th className="py-2 px-2 text-center">Stock</th>
                                                                                <th className="py-2 px-2 text-center">Min. Stock</th>
                                                                                <th className="py-2 pl-2 text-right">Acción</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-[#FAF8F5]">
                                                                            {variantList.map((v, idx) => (
                                                                                <tr key={idx}>
                                                                                    <td className="py-2 pr-2">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={v.color}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...variantList];
                                                                                                updated[idx].color = e.target.value;
                                                                                                setVariantList(updated);
                                                                                            }}
                                                                                            placeholder="Ej: Negro Matte"
                                                                                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] font-bold outline-none rounded-none w-full"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="py-2 px-2">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={v.sku || ''}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...variantList];
                                                                                                updated[idx].sku = e.target.value;
                                                                                                setVariantList(updated);
                                                                                            }}
                                                                                            placeholder="SKU-COLOR"
                                                                                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] font-mono outline-none rounded-none w-full uppercase"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="py-2 px-2 text-center">
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            value={v.stock}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...variantList];
                                                                                                updated[idx].stock = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                                                                                setVariantList(updated);
                                                                                            }}
                                                                                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] font-mono font-bold text-center outline-none rounded-none w-20"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="py-2 px-2 text-center">
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            value={v.min_stock}
                                                                                            onChange={(e) => {
                                                                                                const updated = [...variantList];
                                                                                                updated[idx].min_stock = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                                                                                setVariantList(updated);
                                                                                            }}
                                                                                            className="bg-white border border-[#E2DFD7] p-2 text-xs text-[#161616] font-mono text-center outline-none rounded-none w-16"
                                                                                        />
                                                                                    </td>
                                                                                    <td className="py-2 pl-2 text-right">
                                                                                        <button
                                                                                            type="button"
                                                                                            disabled={variantList.length === 1}
                                                                                            onClick={() => setVariantList(variantList.filter((_, i) => i !== idx))}
                                                                                            className="text-[#6B6862] hover:text-[#D9381E] transition border-0 bg-transparent cursor-pointer disabled:opacity-30"
                                                                                            title="Eliminar variante"
                                                                                        >
                                                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>

                                                                <div className="pt-3 border-t border-[#E2DFD7] flex justify-between items-center">
                                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6862]">Stock Total Calculado:</span>
                                                                    <span className="font-mono text-base font-bold text-[#D9381E]">
                                                                        {variantList.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)} Unidades Físicas
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white p-5 border border-[#E2DFD7] space-y-4">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Stock Disponible *</label>
                                                                        <input 
                                                                            type="number"
                                                                            min="0"
                                                                            className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] font-mono font-bold outline-none rounded-none"
                                                                            value={stock}
                                                                            onChange={(e) => setStock(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                                                                            placeholder="Ej: 15"
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col gap-1.5">
                                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Stock Mínimo de Alerta</label>
                                                                        <input 
                                                                            type="number"
                                                                            min="0"
                                                                            className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] font-mono outline-none rounded-none"
                                                                            value={minStock}
                                                                            onChange={(e) => setMinStock(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                                                                            placeholder="5"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Navegación Paso 2 */}
                                                <div className="pt-6 border-t border-[#E2DFD7] flex justify-between items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductFormStep(1)}
                                                        className="bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1.5 transition"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                                        Atrás
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductFormStep(3)}
                                                        className="bg-[#161616] hover:bg-[#2c2c2c] text-white border-0 px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-2 transition"
                                                    >
                                                        Siguiente
                                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* PASO 3: PRECIOS, IMPUESTOS Y CONFIRMACIÓN */}
                                        {productFormStep === 3 && (
                                            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                                                <h4 className="font-serif text-xl text-[#161616] border-b border-[#E2DFD7] pb-2 mb-4 font-normal">
                                                    3. Precios, Impuestos (DIAN) & Confirmación
                                                </h4>

                                                <div className="bg-white p-5 border border-[#E2DFD7] space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                                        {isAdmin && (
                                                            <div className="flex flex-col gap-1.5">
                                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Precio Costo ($)</label>
                                                                <input 
                                                                    type="number"
                                                                    className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none font-mono focus:border-[#161616] transition rounded-none h-[42px]"
                                                                    value={costPrice}
                                                                    onFocus={(e) => e.target.select()}
                                                                    onChange={(e) => setCostPrice(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                                                    placeholder="Ej: 180000"
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Precio Venta ($) *</label>
                                                            <input 
                                                                type="number"
                                                                className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none font-mono font-bold focus:border-[#161616] transition rounded-none h-[42px]"
                                                                value={price}
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={(e) => setPrice(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                                                placeholder="Ej: 350000"
                                                                required
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Desc. Promo (%)</label>
                                                            <input 
                                                                type="number"
                                                                min={0}
                                                                max={100}
                                                                className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none font-mono focus:border-[#161616] transition rounded-none h-[42px]"
                                                                value={promoDiscount}
                                                                onFocus={(e) => e.target.select()}
                                                                onChange={(e) => setPromoDiscount(e.target.value === '' ? '' : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                                                placeholder="0"
                                                            />
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Impuesto / IVA</label>
                                                            <select
                                                                value={taxRate}
                                                                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                                                className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans cursor-pointer h-[42px]"
                                                            >
                                                                <option value={0}>0% (Exento / Gafas)</option>
                                                                <option value={19}>19% (IVA General)</option>
                                                                <option value={5}>5% (IVA Reducido)</option>
                                                                <option value={8}>8% (INC Consumo)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-1.5 pt-2">
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Descripción Comercial</label>
                                                        <textarea 
                                                            rows={3}
                                                            className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans"
                                                            value={description}
                                                            onChange={(e) => setDescription(e.target.value)}
                                                            placeholder="Detalles de garantía, ficha técnica, indicaciones para el cliente..."
                                                        />
                                                    </div>
                                                </div>

                                                {/* Live Resumen de Registro Card */}
                                                <div className="bg-[#FAF8F5] border border-[#E2DFD7] p-5 space-y-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6862] block">
                                                        RESUMEN DE REGISTRO
                                                    </span>
                                                    <p className="text-base font-bold text-[#161616]">{name || 'Montura / Producto Ejemplo'}</p>
                                                    {brand && <p className="text-xs text-[#6B6862]">Marca: {brand}</p>}
                                                    <div className="text-2xl font-serif text-[#D9381E] font-normal pt-1">
                                                        {price ? formatPrice(price.toString()) : '$ 0 COP'}
                                                    </div>
                                                </div>

                                                {/* Navegación Paso 3 (Guardar) */}
                                                <div className="pt-6 border-t border-[#E2DFD7] flex justify-between items-center pb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductFormStep(2)}
                                                        className="bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1.5 transition"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                                        Atrás
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleSubmit(e, false)}
                                                            className="bg-[#161616] hover:bg-[#333333] text-white border-0 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm transition"
                                                        >
                                                            {editingProduct ? 'Guardar Cambios 💾' : 'Guardar Producto 💾'}
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => handleSubmit(e, true)}
                                                            className="bg-[#D9381E] hover:bg-[#b82e18] text-white border-0 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-1.5 transition"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                            Guardar y Agregar Otro
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>,
                        document.body
                    )}

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="bg-white border border-[#E2DFD7] p-12 text-center">
                            <p className="text-sm text-[#6B6862]">No hay productos que coincidan con la búsqueda o filtros seleccionados.</p>
                        </div>
                    ) : (
                        <div className="w-full table-responsive-wrapper">
                            <table className="inventory-table w-full text-left">
                                <thead>
                                    <tr>
                                        <th style={{ width: '4%' }} className="text-center">
                                            <input 
                                                type="checkbox"
                                                checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedProductIds(filteredProducts.map(p => p.id));
                                                    } else {
                                                        setSelectedProductIds([]);
                                                    }
                                                }}
                                                className="cursor-pointer"
                                                title="Seleccionar Todos"
                                            />
                                        </th>
                                        <th style={{ width: '12%' }}>MARCA</th>
                                        <th style={{ width: '19%' }}>REFERENCIA</th>
                                        <th style={{ width: '15%' }}>VARIANTES</th>
                                        <th style={{ width: '9%' }}>UNIDADES</th>
                                        <th style={{ width: '12%' }}>PRECIO</th>
                                        <th style={{ width: '14%' }}>VALOR TOTAL</th>
                                        <th style={{ width: '6%' }}>DCTO</th>
                                        <th style={{ width: '9%' }}>IMPUESTOS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((prod) => {
                                        const stockUnits = prod.stock || 0;
                                        const unitPrice = parseFloat(prod.price?.toString() || '0') || 0;
                                        const totalValue = unitPrice * stockUnits;
                                        const isLowStock = stockUnits <= (prod.min_stock !== undefined ? prod.min_stock : 5);
                                        const variantCount = prod.variants?.length || 0;
                                        const hasDiscount = (parseFloat(prod.promo_discount?.toString() || '0') || 0) > 0;
                                        const isSelected = selectedProductIds.includes(prod.id);
                                        return (
                                            <tr key={prod.id} className={`hover:bg-white/80 transition-colors group cursor-pointer ${isSelected ? 'bg-[#FAF8F5]' : ''}`} onClick={() => openEdit(prod)}>
                                                {/* Checkbox de selección múltiple */}
                                                <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedProductIds(prev => [...prev, prod.id]);
                                                            } else {
                                                                setSelectedProductIds(prev => prev.filter(id => id !== prod.id));
                                                            }
                                                        }}
                                                        className="cursor-pointer"
                                                    />
                                                </td>

                                                {/* 1. MARCA */}
                                                <td>
                                                    <span className="font-semibold text-xs text-[#161616] tracking-wide">
                                                        {prod.brand || '—'}
                                                    </span>
                                                </td>

                                                {/* 2. REFERENCIA */}
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-[#161616] group-hover:text-[#D9381E] transition-colors">
                                                            {prod.name}
                                                        </span>
                                                        {prod.sku && (
                                                            <span className="font-mono text-[10px] text-[#6B6862]">
                                                                SKU: {prod.sku}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 3. VARIANTES */}
                                                <td>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {variantCount > 0 ? (
                                                            <>
                                                                <span className="text-xs font-semibold text-[#161616]">
                                                                    {variantCount} Variantes
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    {prod.variants?.slice(0, 4).map((v, i) => (
                                                                        <span 
                                                                            key={i} 
                                                                            className="color-swatch-box" 
                                                                            style={{ background: getColorPreview(v.variant_name || v.color) }}
                                                                            title={v.variant_name || v.color || 'Variante'}
                                                                        />
                                                                    ))}
                                                                    {variantCount > 4 && (
                                                                        <span className="text-[10px] text-[#6B6862] font-mono">+{variantCount - 4}</span>
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : prod.color ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="color-swatch-box" style={{ background: getColorPreview(prod.color) }} title={prod.color} />
                                                                <span className="text-xs text-[#6B6862]">{prod.color}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-[#6B6862]">Simple</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 4. UNIDADES (al lado de Variantes) */}
                                                <td>
                                                    {prod.product_type === 'service' || stockUnits >= 999999 ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold text-[#6B6862] font-mono">—</span>
                                                            <span className="text-[9px] bg-[#FAF8F5] text-[#6B6862] border border-[#E2DFD7] px-1.5 py-0.5 font-mono uppercase tracking-wider">
                                                                Servicio
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-xs font-bold font-mono ${isLowStock ? 'text-[#D9381E]' : 'text-[#161616]'}`}>
                                                                {stockUnits} Uds
                                                            </span>
                                                            {isLowStock && (
                                                                <span className="text-[8px] font-mono font-bold bg-[#D9381E]/10 text-[#D9381E] px-1 py-0.2 border border-[#D9381E]/20" title="Bajo stock">
                                                                    Bajo
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 5. PRECIO UNITARIO */}
                                                <td className="font-mono font-bold text-xs text-[#161616]">
                                                    {formatPrice(prod.price)} <span className="text-[9px] text-[#6B6862] font-normal font-sans">COP</span>
                                                </td>

                                                {/* 6. VALOR TOTAL EN STOCK */}
                                                <td className="font-mono font-bold text-xs text-[#161616]">
                                                    {prod.product_type === 'service' || stockUnits >= 999999 ? (
                                                        <span className="text-xs text-[#6B6862] font-mono">—</span>
                                                    ) : (
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-[#161616]">
                                                                {formatPrice(totalValue)} <span className="text-[9px] text-[#6B6862] font-normal font-sans">COP</span>
                                                            </span>
                                                            <span className="text-[9px] text-[#76746E] font-mono font-normal">
                                                                ({stockUnits} × {formatPrice(prod.price)})
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* 7. DESCUENTO (si aplica) */}
                                                <td>
                                                    {hasDiscount ? (
                                                        <span className="bg-[#D9381E]/10 text-[#D9381E] font-bold text-xs px-1.5 py-0.5 border border-[#D9381E]/20 font-mono">
                                                            -{prod.promo_discount}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-[#6B6862]">—</span>
                                                    )}
                                                </td>

                                                {/* 8. IMPUESTOS & ACCIONES */}
                                                <td>
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-xs font-medium whitespace-nowrap">
                                                            {(() => {
                                                                const rawTax = (prod as any).tax_rate !== undefined && (prod as any).tax_rate !== null 
                                                                    ? (prod as any).tax_rate 
                                                                    : ((prod as any).attributes?.tax_rate !== undefined ? (prod as any).attributes.tax_rate : 0);
                                                                const rate = parseFloat(rawTax.toString()) || 0;
                                                                if (rate === 0) return <span className="text-xs font-medium text-[#6B6862]">0% Exento</span>;
                                                                if (rate === 19) return <span className="text-xs font-bold text-[#161616]">19% IVA</span>;
                                                                if (rate === 5) return <span className="text-xs font-bold text-[#161616]">5% IVA</span>;
                                                                if (rate === 8) return <span className="text-xs font-bold text-[#161616]">8% INC</span>;
                                                                return <span className="text-xs font-bold text-[#161616]">{rate}% Imp.</span>;
                                                            })()}
                                                        </span>

                                                        {/* Acciones Rápidas ERP al Hover */}
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); openAuditModalForProduct(prod); }}
                                                                className="p-1 hover:bg-[#E2DFD7] text-amber-600 cursor-pointer"
                                                                title="Ver Historial de Cambios / Bitácora"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">history</span>
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handleOpenCrossStock(prod); }}
                                                                className="p-1 hover:bg-[#E2DFD7] text-[#161616] cursor-pointer"
                                                                title="Consultar Stock Inter-Sedes"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">domain</span>
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); openRefillModal(prod); }}
                                                                className="p-1 hover:bg-[#E2DFD7] text-[#161616] cursor-pointer"
                                                                title="Refill / Rellenar Stock"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">add_box</span>
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); openPrintModal(prod); }}
                                                                className="p-1 hover:bg-[#E2DFD7] text-[#161616] cursor-pointer"
                                                                title="Imprimir Etiquetas de Código de Barras"
                                                            >
                                                                <span className="material-symbols-outlined text-[15px]">print</span>
                                                            </button>
                                                            {isAdmin && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(prod.id); }}
                                                                    className="p-1 hover:bg-red-500/20 text-red-500 cursor-pointer"
                                                                    title="Eliminar"
                                                                >
                                                                    <span className="material-symbols-outlined text-[15px]">delete</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Barra Flotante para Traslado Masivo de Productos Seleccionados */}
                    {selectedProductIds.length > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#161616] text-white px-6 py-3.5 shadow-2xl z-[9999] flex items-center gap-5 border border-[#E2DFD7]/30 rounded-none animate-fade-in">
                            <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#D9381E] text-[18px]">inventory_2</span>
                                {selectedProductIds.length} producto(s) seleccionado(s)
                            </span>
                            <div className="h-4 w-[1px] bg-white/20"></div>
                            <button
                                type="button"
                                onClick={() => setBulkTransferModalOpen(true)}
                                className="bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 cursor-pointer border-0 flex items-center gap-1.5 transition shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                                Trasladar a otra sede
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedProductIds([])}
                                className="text-white/70 hover:text-white text-xs uppercase tracking-wider font-semibold cursor-pointer bg-transparent border-0"
                            >
                                Descartar
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* promotions tab contents */
                <>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <p className="text-sm text-on-surface-variant">No hay productos disponibles para configurar promociones.</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-semibold">
                                        <th className="p-4">Producto</th>
                                        <th className="p-4">Precio de Lista</th>
                                        <th className="p-4">% Descuento Promo</th>
                                        <th className="p-4">Precio con Promo</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline/10 text-sm">
                                    {filteredProducts.map((prod) => (
                                        <PromoDiscountRow 
                                            key={prod.id} 
                                            prod={prod} 
                                            formatPrice={formatPrice} 
                                            onSave={handleUpdatePromoDiscount} 
                                            category={category}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Modal para Agregar Color Nuevo */}
            {showNewColorPrompt && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#141517] border border-[#2d3036] p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center mb-2 border-b border-outline/10 pb-3">
                            <h3 className="font-bold text-base text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                                Agregar Color Nuevo
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setShowNewColorPrompt(false)}
                                className="p-1 hover:bg-surface-container-highest rounded-lg border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Nombre del Color</label>
                                <input 
                                    type="text"
                                    value={newColorName}
                                    onChange={(e) => setNewColorName(e.target.value)}
                                    placeholder="Ej: Azul Océano, Púrpura Metalizado"
                                    className="bg-surface-container border border-outline/20 rounded-md p-2.5 text-xs focus:border-primary text-on-surface outline-none transition"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddCustomColor();
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-on-surface-variant font-bold uppercase">Código de Color (Hex)</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="color"
                                        value={newColorHex}
                                        onChange={(e) => setNewColorHex(e.target.value)}
                                        className="w-12 h-10 rounded-md cursor-pointer border border-outline/20"
                                    />
                                    <input 
                                        type="text"
                                        value={newColorHex}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                                                setNewColorHex(val);
                                            }
                                        }}
                                        placeholder="#3b82f6"
                                        className="bg-surface-container border border-outline/20 rounded-md p-2 text-xs font-mono focus:border-primary text-on-surface outline-none transition flex-grow"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-surface-container/30 rounded-md border border-outline/10">
                                <span className="text-xs text-on-surface-variant font-medium">Vista previa:</span>
                                <span 
                                    className="w-6 h-6 rounded-md border-2 border-white/30"
                                    style={{ backgroundColor: newColorHex }}
                                />
                                <span className="text-xs text-on-surface-variant">{newColorName || 'Tu color'}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-outline/10">
                            <button 
                                type="button"
                                onClick={() => setShowNewColorPrompt(false)}
                                className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-md transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleAddCustomColor}
                                disabled={!newColorName.trim()}
                                className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary text-xs font-bold rounded-md transition cursor-pointer border-0 flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Agregar Color
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Impresión de Códigos de Barras - Wabi-Sabi */}
            {isPrintModalOpen && printProduct && (() => {
                const activePrintSku = selectedPrintVariant ? (selectedPrintVariant.sku || printProduct.sku || '') : (printProduct.sku || '');
                const activeVariantLabel = selectedPrintVariant ? (selectedPrintVariant.variant_name || selectedPrintVariant.color) : '';
                return createPortal(
                    <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
                        <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 rounded-none font-sans max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                            <div className="flex justify-between items-start border-b border-[#E2DFD7] pb-3">
                                <div>
                                    <h3 className="font-serif text-2xl text-[#161616] font-normal flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#D9381E] text-[22px]">print</span>
                                        {isRefillPrompt ? 'Impresión por Reabastecimiento' : 'Imprimir Código de Barras'}
                                    </h3>
                                    <p className="text-xs text-[#6B6862] mt-1 font-mono">
                                        {printProduct.name}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="p-1 hover:bg-[#EAE7DE] text-[#6B6862] hover:text-[#161616] border-0 bg-transparent cursor-pointer transition rounded-none"
                                    title="Cerrar"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>

                            {isRefillPrompt ? (
                                <div className="bg-white border-l-4 border-l-[#D9381E] border border-[#E2DFD7] p-3 text-xs text-[#161616] leading-relaxed shadow-2xs">
                                    <strong className="text-[#D9381E]">¡Reabastecimiento detectado!</strong> Se han añadido nuevas unidades al stock. ¿Cuántas etiquetas de códigos de barras deseas imprimir para esta tanda?
                                </div>
                            ) : (
                                <p className="text-xs text-[#6B6862] leading-relaxed">
                                    Elige cuántas etiquetas autoadhesivas deseas generar para tu impresora térmica (Tamaño estándar 50mm x 30mm).
                                </p>
                            )}

                            <div className="space-y-4">
                                {/* Selector de Variante / Color si el producto tiene variantes */}
                                {printProduct.variants && printProduct.variants.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-[#6B6862] uppercase tracking-wider block">
                                            Variante / Color de la Referencia
                                        </label>
                                        <select
                                            value={selectedPrintVariant?.sku || selectedPrintVariant?.variant_name || selectedPrintVariant?.color || ''}
                                            onChange={(e) => {
                                                const found = printProduct.variants?.find((v: any) => (
                                                    v.sku === e.target.value || 
                                                    v.variant_name === e.target.value || 
                                                    v.color === e.target.value
                                                ));
                                                if (found) {
                                                    setSelectedPrintVariant(found);
                                                    setPrintQuantity(found.stock || 1);
                                                }
                                            }}
                                            className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs font-bold text-[#161616] outline-none focus:border-[#161616] cursor-pointer rounded-none"
                                        >
                                            {printProduct.variants.map((v: any, idx: number) => (
                                                <option key={idx} value={v.sku || v.variant_name || v.color}>
                                                    {v.variant_name || v.color} — (SKU: {v.sku || 'N/A'}) — Stock: {v.stock} uds
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Tarjeta Visual Wabi-Sabi: SKU, Precio y Código de Barras Renderizado en Vivo */}
                                <div className="bg-white p-4 border border-[#E2DFD7] rounded-none shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between gap-4 border-b border-[#E2DFD7] pb-2.5">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-[#6B6862] uppercase font-bold tracking-wider">Código SKU</p>
                                            <p className="text-sm font-mono text-[#161616] font-bold mt-0.5 truncate">
                                                {activePrintSku || 'Sin SKU asignado'}
                                                {activeVariantLabel && (
                                                    <span className="ml-2 text-[11px] text-[#D9381E] font-sans font-semibold uppercase">
                                                        • {activeVariantLabel}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] text-[#6B6862] uppercase font-bold tracking-wider">Precio de Venta</p>
                                            <p className="text-sm text-[#161616] font-bold font-mono mt-0.5">{formatPrice(printProduct.price)}</p>
                                        </div>
                                    </div>

                                    {/* Previsualización del Código de Barras del Color Seleccionado */}
                                    <div className="flex flex-col items-center justify-center p-3 bg-[#FAF8F5] border border-[#E2DFD7]">
                                        {activePrintSku ? (
                                            <BarcodeSVG value={activePrintSku} size="md" />
                                        ) : (
                                            <div className="py-2 text-center">
                                                <span className="text-[11px] text-[#6B6862] italic">
                                                    Sin código de barras asignado a esta variante
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase tracking-wider block">
                                        Tipo de Etiqueta
                                    </label>
                                    <select
                                        value={printProfileId}
                                        onChange={(e) => setPrintProfileId(e.target.value as LabelProfileId)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-medium outline-none focus:border-[#161616] rounded-none cursor-pointer"
                                    >
                                        {Object.values(LABEL_PRINT_PROFILES).map((profile) => (
                                            <option key={profile.id} value={profile.id}>
                                                {profile.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase tracking-wider block">
                                        Cantidad a Imprimir
                                    </label>
                                    <div className="flex gap-2">
                                        <button 
                                            type="button"
                                            onClick={() => setPrintQuantity(1)}
                                            className={`flex-1 py-2 px-3 border text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none ${
                                                printQuantity === 1 
                                                    ? 'bg-white border-2 border-[#D9381E] text-[#D9381E]' 
                                                    : 'bg-white border-[#E2DFD7] text-[#6B6862] hover:border-[#161616] hover:text-[#161616]'
                                            }`}
                                        >
                                            1 Copia (Prueba)
                                        </button>
                                        {isRefillPrompt && (
                                            <button 
                                                type="button"
                                                onClick={() => setPrintQuantity(printQuantity)}
                                                className={`flex-1 py-2 px-3 border text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none bg-white border-2 border-[#D9381E] text-[#D9381E]`}
                                            >
                                                {printQuantity} Copias (Refill)
                                            </button>
                                        )}
                                        <button 
                                            type="button"
                                            onClick={() => setPrintQuantity(selectedPrintVariant ? (selectedPrintVariant.stock || 1) : printProduct.stock)}
                                            className={`flex-1 py-2 px-3 border text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none ${
                                                printQuantity === (selectedPrintVariant ? selectedPrintVariant.stock : printProduct.stock)
                                                    ? 'bg-white border-2 border-[#D9381E] text-[#D9381E]' 
                                                    : 'bg-white border-[#E2DFD7] text-[#6B6862] hover:border-[#161616] hover:text-[#161616]'
                                            }`}
                                        >
                                            Stock Completo ({selectedPrintVariant ? selectedPrintVariant.stock : printProduct.stock})
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-[#6B6862] uppercase tracking-wider block">
                                        Cantidad Personalizada
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="500"
                                            value={printQuantity}
                                            onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="bg-white border border-[#E2DFD7] p-2 text-xs font-mono font-bold text-[#161616] outline-none w-24 text-center focus:border-[#161616] rounded-none"
                                        />
                                        <span className="text-[11px] text-[#6B6862] font-sans">etiquetas autoadhesivas</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2DFD7] mt-5">
                                <button
                                    type="button"
                                    onClick={handlePreviewBarcodes}
                                    className="px-4 py-2.5 bg-transparent hover:bg-[#EAE7DE] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none"
                                >
                                    Vista previa
                                </button>
                                <button 
                                    onClick={() => setIsPrintModalOpen(false)}
                                    className="px-4 py-2.5 bg-transparent hover:bg-[#EAE7DE] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handlePrintBarcodes}
                                    className="px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 rounded-none border-0 shadow-xs"
                                >
                                    <span className="material-symbols-outlined text-[16px]">print</span>
                                    Confirmar e Imprimir
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                );
            })()}
            {/* Modal de Reabastecimiento Rápido (Refill) - Wabi-Sabi */}
            {isRefillModalOpen && refillProduct && createPortal(
                <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
                    <form onSubmit={handleSaveRefill} className="bg-[#F6F4EE] border border-[#E2DFD7] p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 rounded-none font-sans max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                            <h3 className="font-serif text-2xl text-[#161616] font-normal flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#D9381E] text-[22px]">add_box</span>
                                Rellenar Inventario
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setIsRefillModalOpen(false)}
                                className="p-1 hover:bg-[#EAE7DE] text-[#6B6862] hover:text-[#161616] border-0 bg-transparent cursor-pointer transition rounded-none"
                                title="Cerrar"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Tarjeta de Resumen del Producto */}
                        <div className="bg-white p-4 border border-[#E2DFD7] rounded-none text-xs space-y-1.5 shadow-2xs">
                            <p className="text-sm font-bold text-[#161616] leading-snug">{refillProduct.name}</p>
                            <p className="text-[11px] font-mono text-[#6B6862]">
                                SKU: <span className="text-[#161616] font-semibold">{refillProduct.sku || 'N/A'}</span>
                            </p>
                            <p className="text-[11px] text-[#6B6862]">
                                Stock Actual: <strong className="text-[#161616] font-mono">{refillProduct.stock} uds</strong> 
                                <span className="opacity-70 ml-1.5">(Mínimo: {refillProduct.min_stock !== undefined ? refillProduct.min_stock : 5} uds)</span>
                            </p>
                        </div>

                        {refillProduct.variants && refillProduct.variants.length > 0 ? (
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-bold text-[#6B6862] uppercase tracking-wider block">
                                    RELLENAR STOCK POR COLOR / VARIANTE *
                                </label>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                    {refillProduct.variants.map((v: any, idx: number) => {
                                        const key = v.id || v.sku || v.variant_name || v.color || `var_${idx}`;
                                        return (
                                            <div key={idx} className="bg-white p-3 border border-[#E2DFD7] hover:border-[#161616] flex items-center justify-between gap-3 rounded-none transition shadow-2xs">
                                                <div className="flex items-center gap-2.5">
                                                    <span 
                                                        className="w-4 h-4 border border-[#E2DFD7] inline-block shrink-0 rounded-none shadow-2xs"
                                                        style={{ background: getColorPreview(v.color || v.variant_name, v.color_hex) }}
                                                    />
                                                    <div>
                                                        <p className="text-xs font-bold text-[#161616]">{v.variant_name || v.color}</p>
                                                        <p className="text-[10px] text-[#6B6862] font-mono">Stock actual: <span className="text-[#161616] font-semibold">{v.stock} uds</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-[#D9381E] font-mono">+</span>
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        placeholder="0"
                                                        value={refillVariantQuantities[key] ?? ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                                                            setRefillVariantQuantities(prev => ({
                                                                ...prev,
                                                                [key]: val
                                                            }));
                                                        }}
                                                        className="bg-[#FAF8F5] border border-[#E2DFD7] p-1.5 text-xs font-mono font-bold text-[#161616] outline-none w-20 text-center focus:border-[#161616] focus:bg-white transition rounded-none"
                                                    />
                                                    <span className="text-[10px] text-[#6B6862] font-mono">uds</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold text-[#6B6862] uppercase tracking-wider">
                                    CANTIDAD A INGRESAR *
                                </label>
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    placeholder="Ej: 50"
                                    value={refillQuantity}
                                    onChange={(e) => setRefillQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                                    className="bg-white border border-[#E2DFD7] p-3 text-xs font-mono font-bold text-[#161616] outline-none w-full focus:border-[#161616] transition rounded-none"
                                />
                            </div>
                        )}

                        <label className="flex items-center gap-2.5 cursor-pointer select-none py-1 text-xs text-[#161616]">
                            <input 
                                type="checkbox" 
                                checked={printAfterRefill} 
                                onChange={(e) => setPrintAfterRefill(e.target.checked)}
                                className="accent-[#D9381E] w-4 h-4 rounded-none cursor-pointer"
                            />
                            <span className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">
                                Imprimir códigos de barra para estas nuevas unidades
                            </span>
                        </label>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[#E2DFD7] mt-4">
                            <button 
                                type="button"
                                onClick={() => setIsRefillModalOpen(false)}
                                className="px-5 py-2.5 bg-transparent hover:bg-[#EAE7DE] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-bold uppercase tracking-wider transition cursor-pointer rounded-none"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 rounded-none border-0 shadow-xs"
                            >
                                <span className="material-symbols-outlined text-[16px]">done</span>
                                Confirmar Refill
                            </button>
                        </div>
                    </form>
                </div>,
                document.body
            )}
            {/* Pestaña de Rotación de Inventario */}
            {activeTab === 'rotation' && (
                <InventoryRotationView clientId={clientId} formatPrice={formatPrice} />
            )}

            {/* Modal Estilo Paint para Crear/Editar Colores (Wabi-Sabi) */}
            {isPaintModalOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999]" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-[#F6F4EE] border border-[#E2DFD7] p-6 max-w-lg w-full space-y-4 shadow-2xl rounded-none relative z-[100000] font-sans text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                            <h4 className="font-serif text-2xl text-[#161616] font-normal flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#D9381E] text-[22px]">palette</span>
                                {editingColor ? 'Editar Color Personalizado' : 'Crear / Personalizar Nuevo Color'}
                            </h4>
                            <button 
                                type="button" 
                                onClick={() => setIsPaintModalOpen(false)} 
                                className="p-1 hover:bg-[#EAE7DE] text-[#6B6862] hover:text-[#161616] cursor-pointer bg-transparent border-0 rounded-none transition"
                                title="Cerrar"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSavePaintColor} className="space-y-4">
                            {/* Campo dividido a la mitad 50% / 50% */}
                            <div className="grid grid-cols-2 gap-4 items-end">
                                {/* Izquierda (50%): Nombre del color */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B6862]">
                                        Nombre del Color *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Violeta, Azul Rey"
                                        value={colorNameInput}
                                        onChange={(e) => setColorNameInput(e.target.value)}
                                        className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] font-bold outline-none focus:border-[#161616] rounded-none h-[42px]"
                                    />
                                </div>

                                {/* Derecha (50%): Selector Interactivo Paint */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B6862]">
                                        Color Interactivo (Paint) *
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={colorHexInput}
                                            onChange={(e) => setColorHexInput(e.target.value)}
                                            className="w-full h-[42px] bg-white border border-[#E2DFD7] p-1 cursor-pointer outline-none rounded-none"
                                            title="Haz clic para abrir la paleta interactiva de colores"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Previsualización del Color */}
                            <div className="p-3.5 bg-white border border-[#E2DFD7] rounded-none flex items-center justify-between shadow-2xs">
                                <span className="text-xs font-bold text-[#6B6862] uppercase tracking-wider">Vista Previa:</span>
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-8 h-8 border border-[#E2DFD7] rounded-none shadow-2xs"
                                        style={{ background: colorHexInput }}
                                    />
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-[#161616]">{colorNameInput || 'Sin Nombre'}</p>
                                        <p className="text-[10px] font-mono text-[#6B6862] uppercase font-semibold">{colorHexInput}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                                <button
                                    type="button"
                                    onClick={() => setIsPaintModalOpen(false)}
                                    className="px-5 py-2.5 bg-transparent hover:bg-[#EAE7DE] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-bold uppercase tracking-wider rounded-none transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider rounded-none transition cursor-pointer flex items-center gap-1.5 border-0 shadow-xs"
                                >
                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                    {editingColor ? 'Guardar Cambios' : 'Crear Color'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Stock Inter-Sedes & Traspasos Directos */}
            {crossStockModalOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-fade-in">
                    <div className="bg-[#F6F4EE] border border-[#161616] p-6 max-w-2xl w-full shadow-2xl space-y-4 rounded-none text-left">
                        <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
                            <div>
                                <h3 className="font-serif text-2xl text-[#161616] font-normal flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D9381E] text-[24px]">domain</span>
                                    Consulta de Stock Inter-Sedes
                                </h3>
                                <p className="text-xs text-[#6B6862] font-medium mt-0.5">
                                    {selectedCrossProduct ? (
                                        <>Producto: <strong className="text-[#161616]">{selectedCrossProduct.name}</strong> (SKU: {selectedCrossProduct.sku || 'N/A'})</>
                                    ) : (
                                        <>Consulta la disponibilidad en todas las tiendas y sedes sucursales.</>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => setCrossStockModalOpen(false)}
                                className="p-1 text-[#6B6862] hover:text-[#161616] bg-transparent border-0 cursor-pointer transition text-xl"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Search Bar inside Modal */}
                        <div className="flex items-center gap-2 bg-white border border-[#E2DFD7] p-2.5 shadow-2xs">
                            <span className="material-symbols-outlined text-[18px] text-[#6B6862]">search</span>
                            <input 
                                type="text"
                                value={crossSearchQuery}
                                onChange={(e) => {
                                    setCrossSearchQuery(e.target.value);
                                    fetchCrossStock(e.target.value);
                                }}
                                placeholder="Escribe el nombre del producto, marca o SKU..."
                                className="w-full bg-transparent border-none text-xs text-[#161616] outline-none font-sans"
                            />
                            {crossSearchQuery && (
                                <button 
                                    onClick={() => { setCrossSearchQuery(''); fetchCrossStock(''); }} 
                                    className="text-xs text-[#6B6862] hover:text-[#161616] cursor-pointer bg-transparent border-0"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>

                        {crossStockLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : crossStockList.length === 0 ? (
                            <div className="p-8 text-center text-xs text-[#6B6862] bg-white border border-[#E2DFD7]">
                                No se encontraron existencias de este producto o término en las sedes registradas.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                                {crossStockList.map((item: any) => {
                                    const isCurrent = item.client_id === clientId;
                                    return (
                                        <div 
                                            key={`${item.client_id}-${item.product_id}`} 
                                            className={`p-4 border flex items-center justify-between transition ${
                                                isCurrent 
                                                    ? 'bg-[#FAF8F5] border-[#161616]' 
                                                    : 'bg-white border-[#E2DFD7] hover:border-[#161616]'
                                            }`}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-[#161616]">
                                                        {item.is_main_branch ? '🏢' : '📍'} {item.branch_name}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="text-[9px] font-bold uppercase bg-[#D9381E]/10 text-[#D9381E] px-2 py-0.5 border border-[#D9381E]/20">
                                                            Sede Actual
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[#161616] font-semibold">
                                                    {item.name} {item.brand ? `(${item.brand})` : ''}
                                                </p>
                                                <p className="text-xs font-mono font-bold">
                                                    Stock Disponible: <span className={item.stock > 0 ? 'text-[#161616] font-extrabold' : 'text-[#D9381E] font-bold'}>{item.stock} ud.</span>
                                                    <span className="ml-3 text-[#6B6862] text-[11px] font-normal">
                                                        Precio: {formatPrice(item.price)} COP
                                                    </span>
                                                </p>
                                            </div>

                                            {!isCurrent && item.stock > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number"
                                                        min="1"
                                                        max={item.stock}
                                                        value={transferQty}
                                                        onChange={(e) => setTransferQty(Math.max(1, Math.min(item.stock, parseInt(e.target.value) || 1)))}
                                                        className="w-14 bg-white border border-[#E2DFD7] p-1.5 text-xs text-center font-mono font-bold text-[#161616] outline-none"
                                                    />
                                                    <button
                                                        disabled={transferringBranchId === item.client_id}
                                                        onClick={() => handleExecuteTransfer(item.client_id, item.branch_name)}
                                                        className="px-3.5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border-0 shadow-xs"
                                                    >
                                                        {transferringBranchId === item.client_id ? 'Transfiriendo...' : 'Solicitar Traspaso'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Traslado Masivo entre Sedes */}
            {bulkTransferModalOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-fade-in text-left">
                    <div className="bg-[#F6F4EE] border border-[#161616] p-6 max-w-lg w-full shadow-2xl space-y-5 rounded-none">
                        <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
                            <div>
                                <h3 className="font-serif text-2xl text-[#161616] font-normal flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D9381E] text-[24px]">local_shipping</span>
                                    Traslado Masivo entre Sedes
                                </h3>
                                <p className="text-xs text-[#6B6862] mt-0.5 font-medium">
                                    Se transferirán <strong className="text-[#161616]">{selectedProductIds.length} producto(s)</strong> desde la sede actual.
                                </p>
                            </div>
                            <button
                                onClick={() => setBulkTransferModalOpen(false)}
                                className="p-1 text-[#6B6862] hover:text-[#161616] bg-transparent border-0 cursor-pointer text-xl"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B6862]">
                                    Seleccione la Sede de Destino *
                                </label>
                                <select
                                    value={targetBranchId}
                                    onChange={(e) => setTargetBranchId(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-3 text-xs font-bold text-[#161616] outline-none cursor-pointer focus:border-[#161616]"
                                >
                                    <option value="">-- Seleccionar Sede Destino --</option>
                                    {branchesList.map(b => (
                                        <option key={b.id} value={b.id} disabled={b.id === clientId}>
                                            {b.is_main_branch ? '🏢' : '📍'} {b.branch_name || b.name} {b.id === clientId ? '(Sede Actual)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-white border border-[#E2DFD7] p-3.5 text-xs text-[#6B6862] space-y-1 font-sans">
                                <p className="font-bold text-[#161616] flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[#D9381E] text-[16px]">info</span>
                                    Detalles de la Operación
                                </p>
                                <p>• El stock de los productos seleccionados se reducirá en esta sede y se sumará automáticamente en la sede destino.</p>
                                <p>• Si el producto no existía en la sede destino, se creará conservando su precio, variantes y fotos.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                            <button
                                type="button"
                                onClick={() => setBulkTransferModalOpen(false)}
                                className="px-5 py-2.5 bg-transparent border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isBulkTransferring || !targetBranchId}
                                onClick={handleExecuteBulkTransfer}
                                className="px-6 py-2.5 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold uppercase tracking-wider border-0 cursor-pointer flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                {isBulkTransferring ? 'Ejecutando Traslado...' : `Confirmar Traslado (${selectedProductIds.length})`}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal de Detalle de Variantes (Ojito Barcodes) */}
            {isVariantViewModalOpen && selectedVariantProduct && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#141517] border border-[#2d3036] p-6 rounded-2xl max-w-xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3">
                            <div>
                                <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-400">qr_code_2</span>
                                    Códigos de Barras por Variante
                                </h3>
                                <p className="text-[11px] text-on-surface-variant">{selectedVariantProduct.name}</p>
                            </div>
                            <button
                                onClick={() => { setIsVariantViewModalOpen(false); setSelectedVariantProduct(null); }}
                                className="text-on-surface-variant hover:text-on-surface bg-transparent border-0 cursor-pointer"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {selectedVariantProduct.variants && selectedVariantProduct.variants.length > 0 ? (
                                selectedVariantProduct.variants.map((v: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-[#181a1c] border border-[#2d3036] rounded-xl flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-5 h-5 rounded-full border border-white/20 shrink-0 shadow-sm"
                                                style={{ background: getColorPreview(v.color || v.variant_name, v.color_hex) }}
                                            />
                                            <div>
                                                <p className="font-bold text-xs text-on-surface">{v.variant_name || v.color}</p>
                                                <p className="text-[10px] font-mono text-on-surface-variant">Stock: {v.stock} uds</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {v.sku && <BarcodeSVG value={v.sku} size="sm" />}
                                            <button
                                                onClick={() => openPrintModal(selectedVariantProduct, v)}
                                                className="px-2.5 py-1.5 bg-primary/20 text-primary font-bold text-xs rounded-lg hover:bg-primary/30 transition border border-primary/30 cursor-pointer flex items-center gap-1"
                                                title="Imprimir código de barras"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">print</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-on-surface-variant italic">No hay variantes registradas.</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-outline/10">
                            <button
                                onClick={() => { setIsVariantViewModalOpen(false); setSelectedVariantProduct(null); }}
                                className="px-4 py-2 border border-outline/20 rounded-xl text-on-surface text-xs hover:bg-surface-container cursor-pointer bg-transparent"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Componente Modal de Historial de Auditoría Contextual */}
            <AuditLogModal
                isOpen={auditModalOpen}
                onClose={() => setAuditModalOpen(false)}
                clientId={clientId}
                title={auditModalTitle}
                subtitle={auditModalSubtitle}
                entityType={auditEntityType}
                entityId={auditEntityId}
                module="Inventario"
            />
        </div>
    );
};

interface RotationProduct {
    product_id: string;
    product_name: string;
    current_stock: number;
    units_sold: number;
    rotation_rate: number;
    rotation_label: string;
    days_of_stock: number;
    recommendation: string;
}

const InventoryRotationView: React.FC<{ clientId: string; formatPrice: (v: string) => string }> = ({ clientId }) => {
    const [products, setProducts] = useState<RotationProduct[]>([]);
    const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
    const [loading, setLoading] = useState(true);

    const fetchRotation = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/clients/${clientId}/inventory/rotation?period=${period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setProducts(json.products || []);
            }
        } catch (err) {
            console.error("Error al cargar rotación:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRotation();
    }, [clientId, period]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container/20 border border-outline/10 p-5 rounded-2xl">
                <div>
                    <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">sync_alt</span>
                        Análisis de Rotación de Inventario
                    </h3>
                    <p className="text-xs text-on-surface-variant opacity-75">
                        Supervisa el ritmo de ventas por producto, pronostica días de stock y detecta ítems candidatos a descontinuar.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-surface-container border border-outline/20 p-1 rounded-xl">
                    <button
                        onClick={() => setPeriod('month')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer border-0 ${
                            period === 'month' ? 'bg-primary text-white shadow' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setPeriod('quarter')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer border-0 ${
                            period === 'quarter' ? 'bg-primary text-white shadow' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        Trimestral
                    </button>
                    <button
                        onClick={() => setPeriod('year')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer border-0 ${
                            period === 'year' ? 'bg-primary text-white shadow' : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                        }`}
                    >
                        Anual
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : products.length === 0 ? (
                <div className="p-8 text-center bg-surface-container/20 rounded-2xl border border-outline/10 text-on-surface-variant opacity-60 text-xs italic">
                    No hay productos o datos de ventas suficientes para este período.
                </div>
            ) : (
                <div className="bg-surface-container/30 border border-outline/10 rounded-2xl p-6 overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-outline/10 text-on-surface-variant uppercase font-bold tracking-tight">
                                <th className="py-3 px-2">Producto</th>
                                <th className="py-3 px-2 text-center">Stock Actual</th>
                                <th className="py-3 px-2 text-center">Unidades Vendidas</th>
                                <th className="py-3 px-2 text-center">Índice de Rotación (ud/día)</th>
                                <th className="py-3 px-2 text-center">Días de Stock Est.</th>
                                <th className="py-3 px-2 text-right">Recomendación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.product_id} className="border-b border-outline/5 hover:bg-surface-variant/20 transition-all">
                                    <td className="py-3.5 px-2 font-bold text-on-surface">{p.product_name}</td>
                                    <td className="py-3.5 px-2 text-center font-mono font-bold">{p.current_stock}</td>
                                    <td className="py-3.5 px-2 text-center font-mono font-bold text-primary">{p.units_sold}</td>
                                    <td className="py-3.5 px-2 text-center font-mono">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            p.rotation_label === 'Alta' ? 'bg-green-500/15 text-green-500' :
                                            p.rotation_label === 'Media' ? 'bg-yellow-500/15 text-yellow-500' :
                                            'bg-red-500/15 text-red-500'
                                        }`}>
                                            {p.rotation_rate} ({p.rotation_label})
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-2 text-center font-mono">
                                        {p.days_of_stock >= 365 ? '+365 días' : `${p.days_of_stock} días`}
                                    </td>
                                    <td className="py-3.5 px-2 text-right">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                            p.recommendation.includes('Reabastecer') ? 'bg-orange-500/15 text-orange-500 border border-orange-500/30' :
                                            p.recommendation.includes('descontinuar') ? 'bg-red-500/15 text-red-500 border border-red-500/30' :
                                            'bg-surface-container-highest text-on-surface-variant'
                                        }`}>
                                            {p.recommendation}
                                        </span>
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

// Componente Selector Visual de Color con Muestras al lado de CADA Nombre de la lista desplegada (Wabi-Sabi)
const VisualColorDropdown: React.FC<{
    selectedColor: string;
    colors: Array<{ id: string; name: string; value: string; preview: string; isCustom?: boolean }>;
    onSelect: (colorName: string) => void;
    onOpenPaintNew: () => void;
    onEditColor: (item: { id: string; name: string; preview: string }) => void;
    onDeleteColor: (id: string) => void;
}> = ({ selectedColor, colors, onSelect, onOpenPaintNew, onEditColor, onDeleteColor }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const currentItem = colors.find(
        c => c.value.toLowerCase() === (selectedColor || '').toLowerCase() || c.name.toLowerCase() === (selectedColor || '').toLowerCase()
    ) || { name: selectedColor || 'Negro', preview: '#000000' };

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Botón Cerrado con Cuadro de Muestra y Nombre */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-[#E2DFD7] hover:border-[#161616] p-2 text-xs text-[#161616] font-bold outline-none cursor-pointer flex items-center justify-between transition rounded-none shadow-2xs"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span 
                        className="w-3.5 h-3.5 border border-[#E2DFD7] shrink-0 rounded-none shadow-2xs"
                        style={{ background: currentItem.preview }}
                    />
                    <span className="truncate">{currentItem.name}</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#6B6862]">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {/* Menú Desplegable Abierto con Cuadritos al Lado de CADA Opción */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E2DFD7] shadow-xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-1 rounded-none custom-scrollbar">
                    <div className="text-[10px] font-bold text-[#6B6862] uppercase px-2 py-1 tracking-wider border-b border-[#E2DFD7]">
                        Colores Disponibles
                    </div>

                    <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                        {colors.map((c) => (
                            <div
                                key={c.id}
                                onClick={() => {
                                    onSelect(c.name);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center justify-between p-2 cursor-pointer transition text-xs font-semibold rounded-none ${
                                    (selectedColor || '').toLowerCase() === c.name.toLowerCase()
                                        ? 'bg-[#FAF8F5] text-[#D9381E] font-bold border-l-2 border-l-[#D9381E]'
                                        : 'text-[#161616] hover:bg-[#F6F4EE]'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <span 
                                        className="w-3.5 h-3.5 border border-[#E2DFD7] shrink-0 rounded-none shadow-2xs"
                                        style={{ background: c.preview }}
                                    />
                                    <span className="truncate">{c.name}</span>
                                </div>

                                {c.isCustom && (
                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsOpen(false);
                                                onEditColor(c);
                                            }}
                                            className="p-1 text-[#6B6862] hover:text-[#161616] hover:bg-[#EAE7DE] rounded-none cursor-pointer border-0 bg-transparent flex items-center transition"
                                            title="Editar este color"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onDeleteColor(c.id);
                                            }}
                                            className="p-1 text-[#D9381E] hover:bg-[#FCE8E6] rounded-none cursor-pointer border-0 bg-transparent flex items-center transition"
                                            title="Eliminar este color"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="pt-1.5 border-t border-[#E2DFD7]">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onOpenPaintNew();
                            }}
                            className="w-full py-2 px-2 bg-[#FAF8F5] hover:bg-[#F6F4EE] text-[#D9381E] border border-dashed border-[#D9381E] font-bold text-[11px] uppercase tracking-wider rounded-none transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                            <span className="material-symbols-outlined text-[15px]">palette</span>
                            + Crear Nuevo Color (Paint)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

