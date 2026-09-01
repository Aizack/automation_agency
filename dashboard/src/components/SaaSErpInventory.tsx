import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';
import JsBarcode from 'jsbarcode';
import { printBarcodes, previewBarcodes, LABEL_PRINT_PROFILES, DEFAULT_LABEL_PRINT_SETTINGS, type LabelProfileId } from '../utils/barcodePrinter';

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
    material: string | null;
    style: string | null;
    color: string | null;
    promo_discount: string;
    category_id?: string | null;
    product_type?: 'product' | 'service';
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

const getColorPreview = (name: string): string => {
    const opt = colorOptions.find(o => o.value.toLowerCase() === (name || '').toLowerCase() || o.name.toLowerCase() === (name || '').toLowerCase());
    return opt ? opt.preview : '#808080';
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
    const clientId = (rawClientId && rawClientId !== 'undefined')
        ? rawClientId
        : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [addProductStep, setAddProductStep] = useState<'closed' | 'open'>('closed');
    const isFormOpen = addProductStep !== 'closed';
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [activeTab, setActiveTab] = useState<'catalog' | 'promotions' | 'rotation'>('catalog');
    const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
    const [showCreateCategoryPrompt, setShowCreateCategoryPrompt] = useState(false);
    const [printProfileId, setPrintProfileId] = useState<LabelProfileId>('two-column');

    // Cross-Branch Stock Modal State
    const [crossStockModalOpen, setCrossStockModalOpen] = useState(false);
    const [selectedCrossProduct, setSelectedCrossProduct] = useState<Product | null>(null);
    const [crossStockList, setCrossStockList] = useState<any[]>([]);
    const [crossStockLoading, setCrossStockLoading] = useState(false);
    const [transferringBranchId, setTransferringBranchId] = useState<string | null>(null);
    const [transferQty, setTransferQty] = useState<number>(1);

    const handleOpenCrossStock = async (prod: Product) => {
        setSelectedCrossProduct(prod);
        setCrossStockModalOpen(true);
        setCrossStockLoading(true);
        try {
            const res = await fetch(`/api/clients/${clientId}/products/cross-branch-stock?name=${encodeURIComponent(prod.name)}&sku=${encodeURIComponent(prod.sku || '')}`);
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

    // Silence unused warnings for compatibility
    if (false as boolean) { console.log(minStock, color); }
    const [promoDiscount, setPromoDiscount] = useState<number | ''>('');
    const [productType, setProductType] = useState<'product' | 'service'>('product');
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
    const [printQuantity, setPrintQuantity] = useState(1);
    const [isRefillPrompt, setIsRefillPrompt] = useState(false);

    // Categories and Refill States
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [refillProduct, setRefillProduct] = useState<Product | null>(null);
    const [refillQuantity, setRefillQuantity] = useState<number | ''>('');
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
    const token = localStorage.getItem('auth_token');

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
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
            const res = await fetch(`/api/clients/${clientId}/categories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setCategories(json.categories || []);
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
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Generate automatic SKU if left blank
        const finalSku = sku.trim() || 'OP' + Math.floor(100000 + Math.random() * 900000);
        
        const calculatedTotalStock = productType === 'service'
            ? 999999
            : variantList.reduce((sum, v) => sum + (parseInt(v.stock?.toString() || '0') || 0), 0);

        const calculatedMinStock = productType === 'service'
            ? 1
            : (variantList.length > 0 ? (parseInt(variantList[0].min_stock?.toString() || '1') || 1) : 5);

        const primaryImageUrl = variantList.find(v => v.image_url?.trim())?.image_url || null;

        const body = { 
            name, 
            sku: finalSku, 
            description, 
            price: price === '' ? 0 : price, 
            stock: calculatedTotalStock,
            min_stock: calculatedMinStock,
            cost_price: costPrice === '' ? 0 : costPrice,
            brand: brand.trim() || null,
            material: material || null,
            style: style || null,
            color: variantList.map(v => v.color).filter(Boolean).join(', ') || null,
            image_url: primaryImageUrl,
            promo_discount: promoDiscount === '' ? 0 : promoDiscount,
            category_id: categoryId || null,
            product_type: productType,
            attributes: customAttrs
        };

        try {
            const url = editingProduct 
                ? `/api/clients/${clientId}/products/${editingProduct.id}`
                : `/api/clients/${clientId}/products`;
            const method = editingProduct ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                const prodId = data.product?.id || editingProduct?.id;
                if (prodId && productType === 'product' && variantList.length > 0) {
                    for (const v of variantList) {
                        if (v.color?.trim()) {
                            await fetch(`/api/clients/${clientId}/products/${prodId}/variants`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({
                                    variant_name: v.color,
                                    stock: v.stock === '' ? 0 : v.stock,
                                    min_stock: v.min_stock === '' ? 1 : v.min_stock,
                                    image_url: v.image_url || null
                                })
                            });
                        }
                    }
                }

                if (editingProduct) {
                    const oldStock = editingProduct.stock;
                    const newStock = parseInt(body.stock.toString());
                    if (newStock > oldStock) {
                        const addedStock = newStock - oldStock;
                        const updatedProduct: Product = { 
                            ...editingProduct, 
                            ...body, 
                            price: body.price.toString(),
                            cost_price: body.cost_price.toString(),
                            promo_discount: body.promo_discount.toString(),
                            category_id: body.category_id,
                            stock: newStock 
                        };
                        setTimeout(() => {
                            openPrintModal(updatedProduct, addedStock);
                        }, 300);
                    }
                }
                fetchProducts();
                if (editingProduct) {
                    resetForm();
                } else {
                    setName('');
                    setSku('');
                    setDescription('');
                    setPrice('');
                    setCostPrice('');
                    setStock('');
                    setBrand('');
                    setMaterial('');
                    setStyle('');
                    setPromoDiscount('');
                    setCustomAttrs({});
                    alert('Producto guardado con éxito. El formulario continúa activo para seguir registrando bajo esta categoría.');
                }
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            alert('Error al guardar el producto.');
        }
    };

    const handleUpdatePromoDiscount = async (prod: Product, val: number) => {
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            const res = await fetch(`/api/clients/${clientId}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
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
                headers: {
                    'Authorization': `Bearer ${token}`
                },
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

    const openPrintModal = (prod: Product, defaultQty: number = 1) => {
        setPrintProduct(prod);
        setPrintQuantity(defaultQty);
        setPrintProfileId('two-column');
        setIsRefillPrompt(defaultQty > 1);
        setIsPrintModalOpen(true);
    };

    const handlePrintBarcodes = () => {
        if (!printProduct || !printProduct.sku) return;
        const selectedSettings = LABEL_PRINT_PROFILES[printProfileId] || DEFAULT_LABEL_PRINT_SETTINGS;
        printBarcodes([{
            name: printProduct.name,
            sku: printProduct.sku,
            price: printProduct.price,
            quantity: parseInt(printQuantity.toString()) || 1
        }], selectedSettings);
        setIsPrintModalOpen(false);
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
        setCategoryId(prod.category_id || '');
        setProductType(prod.product_type === 'service' || (prod.stock && prod.stock >= 999999) ? 'service' : 'product');
        setCustomAttrs((prod as any).attributes || {});
        setAddProductStep('open');
        setHiddenFields(new Set());
    };

    const resetForm = () => {
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
        setCategoryId('');
        setProductType('product');
        setCustomAttrs({});
        setHiddenFields(new Set());
        setAddProductStep('closed');
    };

    const openRefillModal = (prod: Product) => {
        setRefillProduct(prod);
        setRefillQuantity('');
        setPrintAfterRefill(true);
        setIsRefillModalOpen(true);
    };

    const handleSaveRefill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!refillProduct || !refillQuantity || refillQuantity <= 0) return;

        const addedQty = parseInt(refillQuantity.toString());
        const currentStock = refillProduct.stock || 0;
        const newStock = currentStock + addedQty;

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
            category_id: refillProduct.category_id || null
        };

        try {
            const res = await fetch(`/api/clients/${clientId}/products/${refillProduct.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const json = await res.json();
            if (json.success) {
                setIsRefillModalOpen(false);
                fetchProducts();
                
                if (printAfterRefill) {
                    setTimeout(() => {
                        printBarcodes([{
                            name: refillProduct.name,
                            sku: refillProduct.sku || '',
                            price: refillProduct.price,
                            quantity: addedQty
                        }]);
                    }, 300);
                }
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert('Error al rellenar inventario.');
        }
    };

    const formatPrice = (val: string) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0
        }).format(parseFloat(val));
    };

    const filteredProducts = products.filter(prod => {
        const match = searchTerm.trim().toLowerCase();
        if (!match) return true;
        return (
            prod.name.toLowerCase().includes(match) ||
            (prod.sku && prod.sku.toLowerCase().includes(match)) ||
            (prod.brand && prod.brand.toLowerCase().includes(match)) ||
            (prod.material && prod.material.toLowerCase().includes(match)) ||
            (prod.style && prod.style.toLowerCase().includes(match)) ||
            (prod.color && prod.color.toLowerCase().includes(match))
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">Inventario y Promociones</h2>
                    <p className="text-xs text-gray-400 font-medium font-sans">Administra los productos, precios de costo, venta y descuentos.</p>
                </div>
                {activeTab === 'catalog' && (
                    <div className="flex items-center gap-3">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImportCSV} 
                            className="hidden" 
                            accept=".csv" 
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined text-[16px]">publish</span>
                            {importing ? 'Importando...' : 'Importar CSV'}
                        </button>
                        <button
                            type="button"
                            onClick={fetchProducts}
                            className="w-9 h-9 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-xl flex items-center justify-center border border-outline/10 cursor-pointer transition shadow shrink-0"
                            title="Refrescar catálogo"
                        >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                        </button>
                        <button
                            onClick={() => { resetForm(); setAddProductStep('open'); }}
                            className="bg-primary hover:opacity-90 text-on-primary text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border-0"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Agregar Producto
                        </button>
                    </div>
                )}
            </div>

            {/* Banners feedback */}
            {importSuccessMsg && (
                <div className="bg-primary/10 border border-primary/20 text-primary text-xs p-3 rounded-xl font-medium">
                    ✓ {importSuccessMsg}
                </div>
            )}
            {importErrorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl font-medium">
                    ⚠️ {importErrorMsg}
                </div>
            )}

            {/* Tabs selection */}
            <div className="flex border-b border-outline/10">
                <button
                    onClick={() => { setActiveTab('catalog'); setAddProductStep('closed'); }}
                    className={`pb-3 px-6 text-sm font-semibold border-b-2 cursor-pointer transition border-0 bg-transparent ${
                        activeTab === 'catalog'
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    Catálogo de Inventario
                </button>
                <button
                    onClick={() => { setActiveTab('promotions'); setAddProductStep('closed'); }}
                    className={`pb-3 px-6 text-sm font-semibold border-b-2 cursor-pointer transition border-0 bg-transparent ${
                        activeTab === 'promotions'
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    Descuentos por Promoción %
                </button>
                <button
                    onClick={() => { setActiveTab('rotation'); setAddProductStep('closed'); }}
                    className={`pb-3 px-6 text-sm font-semibold border-b-2 cursor-pointer transition border-0 bg-transparent flex items-center gap-1.5 ${
                        activeTab === 'rotation'
                            ? 'border-primary text-primary font-bold'
                            : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                    <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                    Rotación de Inventario
                </button>
            </div>

            {/* Barcode-focused Search Bar */}
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant/70 pointer-events-none">
                    <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
                </span>
                <input 
                    type="text"
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={category === 'optica' 
                        ? "Buscador por código de barras SKU, nombre, marca o material..." 
                        : "Buscador por código de barras, nombre o descripción..."}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl py-3 pl-10 pr-4 text-sm text-on-surface focus:border-primary outline-none transition"
                />
                {searchTerm && (
                    <button 
                        onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 border-0 bg-transparent text-on-surface-variant cursor-pointer hover:text-on-surface"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                )}
            </div>

            {/* Render Tab Contents */}
            {activeTab === 'catalog' ? (
                <>
                    {/* Selector de Categoría - Fuera del Formulario */}
                    {isFormOpen && (
                        <div className="bg-surface-container-high border border-outline/10 p-4 rounded-2xl space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">category</span>
                                <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Categoría del Producto</label>
                            </div>
                            <div className="flex gap-2 items-end">
                                <select 
                                    className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition flex-grow"
                                    value={categoryId}
                                    onChange={(e) => {
                                        if (e.target.value === 'new') {
                                            setShowCreateCategoryPrompt(true);
                                        } else {
                                            handleSelectCategory(e.target.value);
                                        }
                                    }}
                                >
                                    <option value="" className="bg-surface-container">-- Selecciona una categoría --</option>
                                    {categories.map((cat: any) => (
                                        <option key={cat.id} value={cat.id} className="bg-surface-container">{cat.name}</option>
                                    ))}
                                    <option value="new" className="bg-primary text-on-primary">+ Crear nueva categoría</option>
                                </select>
                                {categoryId && (
                                    <button 
                                        type="button"
                                        onClick={() => { setCategoryId(''); setHiddenFields(new Set()); }}
                                        className="p-2.5 hover:bg-red-500/20 text-red-400 rounded-lg transition cursor-pointer border border-red-500/30 bg-transparent text-xs"
                                        title="Limpiar selección"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Modal Rápido para Crear Nueva Categoría */}
                    {showCreateCategoryPrompt && createPortal(
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-left">
                            <div className="bg-surface-container-high border border-outline/10 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-fade-in space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-base text-on-surface flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-primary text-[20px]">add_box</span>
                                        Nueva Categoría
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={() => setShowCreateCategoryPrompt(false)}
                                        className="p-1 hover:bg-surface-container-highest rounded-full border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-on-surface-variant font-bold uppercase">Nombre</label>
                                    <input 
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Ej: Monturas, Lentes, Estuches..."
                                        className="bg-surface-container border border-outline/20 rounded-lg p-2.5 text-xs focus:border-primary text-on-surface outline-none transition"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleCreateCategory();
                                            }
                                        }}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-outline/5">
                                    <button 
                                        type="button"
                                        onClick={() => setShowCreateCategoryPrompt(false)}
                                        className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-lg transition cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={!newCategoryName.trim()}
                                        className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary text-xs font-bold rounded-lg transition cursor-pointer border-0 flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">add</span>
                                        Crear
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {isFormOpen && (
                        <div className="glass-card p-6 space-y-4">
                            <h3 className="text-sm font-semibold tracking-tight text-on-surface">
                                {editingProduct ? 'Editar Producto / Servicio' : 'Nuevo Producto / Servicio'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Tipo de Ítem *</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductType('product');
                                                if (stock === 999999) setStock('');
                                            }}
                                            className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                                                productType === 'product'
                                                    ? 'bg-primary border-primary text-on-primary shadow-md'
                                                    : 'bg-surface-container border-outline/20 text-on-surface-variant hover:border-primary/50'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                                            Producto Físico (Con Stock)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductType('service');
                                                setStock(999999);
                                            }}
                                            className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                                                productType === 'service'
                                                    ? 'bg-primary border-primary text-on-primary shadow-md'
                                                    : 'bg-surface-container border-outline/20 text-on-surface-variant hover:border-primary/50'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">medical_services</span>
                                            Servicio / Examen (Sin Stock)
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-on-surface-variant font-medium">Nombre del Producto *</label>
                                        <input 
                                            type="text"
                                            className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ej: Gafa rosada"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs text-on-surface-variant font-medium flex items-center justify-between">
                                            <span>SKU / Código de Barras</span>
                                            <span className="text-[10px] text-primary font-semibold flex items-center gap-0.5">
                                                <span className="material-symbols-outlined text-[13px]">barcode_scanner</span>
                                                Listo para Pistola Lectora
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 pr-10 text-sm focus:border-primary text-on-surface outline-none transition font-mono uppercase"
                                                value={sku}
                                                onChange={(e) => setSku(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                placeholder="Disparar pistola lectora o dejar en blanco..."
                                            />
                                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
                                                barcode_scanner
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-on-surface-variant">Si lo dejas en blanco, el sistema autogenerará un código único.</p>
                                    </div>

                                    {(() => {
                                        const selectedCat = categories.find((cat: any) => cat.id.toString() === categoryId.toString());
                                        const selectedCatName = selectedCat ? selectedCat.name.toLowerCase().trim() : '';
                                        const catLower = selectedCatName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

                                        const handleAttrChange = (key: string, val: any) => {
                                            setCustomAttrs((prev: any) => ({ ...prev, [key]: val }));
                                        };

                                        return (
                                            <>
                                                {/* Brand is for physical products only */}
                                                {productType === 'product' && (
                                                    <div className="col-span-1 md:col-span-2">
                                                        <FieldWrapper 
                                                            fieldId="brand" 
                                                            label="Marca / Fabricante"
                                                            hidden={hiddenFields.has('brand')}
                                                            onToggleHidden={toggleFieldHidden}
                                                        >
                                                            <input 
                                                                type="text"
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={brand}
                                                                onChange={(e) => setBrand(e.target.value)}
                                                                placeholder="Ej: Ray-Ban, Alcon, Bausch + Lomb"
                                                            />
                                                        </FieldWrapper>
                                                    </div>
                                                )}

                                                {/* 1. MONTURAS */}
                                                {catLower.includes('montura') && (
                                                    <>
                                                        {!hiddenFields.has('material-frame') && (
                                                            <FieldWrapper 
                                                                fieldId="material-frame" 
                                                                label="Material de la Montura"
                                                                hidden={false}
                                                                onToggleHidden={toggleFieldHidden}
                                                                children={
                                                                    <select 
                                                                        className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                        value={customAttrs.material || ''}
                                                                        onChange={(e) => handleAttrChange('material', e.target.value)}
                                                                    >
                                                                        <option value="">-- Seleccione Material --</option>
                                                                        <option value="Acetato">Acetato</option>
                                                                        <option value="Metal">Metal</option>
                                                                        <option value="Titanio">Titanio</option>
                                                                        <option value="TR-90">TR-90</option>
                                                                        <option value="Madera">Madera / Orgánico</option>
                                                                    </select>
                                                                }
                                                            />
                                                        )}
                                                        {!hiddenFields.has('style-frame') && (
                                                            <FieldWrapper 
                                                                fieldId="style-frame" 
                                                                label="Estilo de Montura"
                                                                hidden={false}
                                                                onToggleHidden={toggleFieldHidden}
                                                                children={
                                                                    <select 
                                                                        className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                        value={customAttrs.style || ''}
                                                                        onChange={(e) => handleAttrChange('style', e.target.value)}
                                                                    >
                                                                        <option value="">-- Seleccione Estilo --</option>
                                                                        <option value="Completa">Aro Completo</option>
                                                                        <option value="Semi-flotante">Ranurada / Semi-flotante</option>
                                                                        <option value="Flotante">Tres Piezas / Flotante</option>
                                                                    </select>
                                                                }
                                                            />
                                                        )}
                                                        {!hiddenFields.has('shape') && (
                                                            <FieldWrapper 
                                                                fieldId="shape" 
                                                                label="Forma del Lente"
                                                                hidden={false}
                                                                onToggleHidden={toggleFieldHidden}
                                                                children={
                                                                    <select 
                                                                        className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                        value={customAttrs.shape || ''}
                                                                        onChange={(e) => handleAttrChange('shape', e.target.value)}
                                                                    >
                                                                        <option value="">-- Seleccione Forma --</option>
                                                                        <option value="Aviador">Aviador</option>
                                                                        <option value="Redonda">Redonda</option>
                                                                        <option value="Cuadrada">Cuadrada</option>
                                                                        <option value="Rectangular">Rectangular</option>
                                                                        <option value="Gato">Cat-Eye / Gato</option>
                                                                        <option value="Pantalla">Pantalla / Máscara</option>
                                                                    </select>
                                                                }
                                                            />
                                                        )}
                                                        {!hiddenFields.has('dimensions') && (
                                                            <FieldWrapper 
                                                                fieldId="dimensions" 
                                                                label="Medidas (Aro - Puente - Varilla)"
                                                                hidden={false}
                                                                onToggleHidden={toggleFieldHidden}
                                                                children={
                                                                    <input 
                                                                        type="text"
                                                                        className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                        value={customAttrs.dimensions || ''}
                                                                        onChange={(e) => handleAttrChange('dimensions', e.target.value)}
                                                                        placeholder="Ej: 52-18-140"
                                                                    />
                                                                }
                                                            />
                                                        )}
                                                    </>
                                                )}

                                                {/* 2. LENTES OFTÁLMICOS */}
                                                {catLower.includes('lente') && !catLower.includes('contacto') && (
                                                    <>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Tipo de Diseño</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.design || ''}
                                                                onChange={(e) => handleAttrChange('design', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione Diseño --</option>
                                                                <option value="Monofocal">Monofocal</option>
                                                                <option value="Bifocal">Bifocal</option>
                                                                <option value="Progresivo">Progresivo</option>
                                                                <option value="Ocupacional">Ocupacional</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Material del Cristal</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.material || ''}
                                                                onChange={(e) => handleAttrChange('material', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione Material --</option>
                                                                <option value="CR-39">CR-39 (Estándar)</option>
                                                                <option value="Policarbonato">Policarbonato (Resistente)</option>
                                                                <option value="Alto Indice 1.67">Alto Índice 1.67 (Delgado)</option>
                                                                <option value="Alto Indice 1.74">Alto Índice 1.74 (Extra Delgado)</option>
                                                                <option value="Trivex">Trivex</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
                                                            <label className="text-xs text-on-surface-variant font-medium">Tratamiento / Filtro</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.treatment || ''}
                                                                onChange={(e) => handleAttrChange('treatment', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione Tratamiento --</option>
                                                                <option value="Antirreflejo">Antirreflejo Convencional</option>
                                                                <option value="Filtro Azul">Filtro de Luz Azul / Blue Protect</option>
                                                                <option value="Fotocromatico">Fotocromático (Transitions)</option>
                                                                <option value="Fotocromatico + Filtro Azul">Fotocromático + Filtro Azul</option>
                                                                <option value="Polarizado">Polarizado</option>
                                                            </select>
                                                        </div>
                                                    </>
                                                )}

                                                {/* 3. LENTES DE CONTACTO */}
                                                {catLower.includes('contacto') && (
                                                    <>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Tipo de Reemplazo</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.replacement || ''}
                                                                onChange={(e) => handleAttrChange('replacement', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione --</option>
                                                                <option value="Diario">Diario</option>
                                                                <option value="Quincenal">Quincenal</option>
                                                                <option value="Mensual">Mensual</option>
                                                                <option value="Anual">Anual</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Diseño / Aplicación</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.design || ''}
                                                                onChange={(e) => handleAttrChange('design', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione --</option>
                                                                <option value="Esferico">Esférico (Miopía/Hipermetropía)</option>
                                                                <option value="Torico">Tórico (Astigmatismo)</option>
                                                                <option value="Multifocal">Multifocal (Presbicia)</option>
                                                                <option value="Cosmetico">Cosmético / Color</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Curva Base (BC)</label>
                                                            <input 
                                                                type="text"
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.baseCurve || ''}
                                                                onChange={(e) => handleAttrChange('baseCurve', e.target.value)}
                                                                placeholder="Ej: 8.6"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Diámetro (DIA)</label>
                                                            <input 
                                                                type="text"
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.diameter || ''}
                                                                onChange={(e) => handleAttrChange('diameter', e.target.value)}
                                                                placeholder="Ej: 14.2"
                                                            />
                                                        </div>
                                                    </>
                                                )}

                                                {/* 4. ESTUCHES */}
                                                {catLower.includes('estuche') && (
                                                    <>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Tipo de Estuche</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.type || ''}
                                                                onChange={(e) => handleAttrChange('type', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione --</option>
                                                                <option value="Rigido">Rígido / Antigolpes</option>
                                                                <option value="Semi-rigido">Semi-rígido</option>
                                                                <option value="Blando">Blando / Tipo Bolsa</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Material Externo</label>
                                                            <input 
                                                                type="text"
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.material || ''}
                                                                onChange={(e) => handleAttrChange('material', e.target.value)}
                                                                placeholder="Ej: Cuero sintético, Metal"
                                                            />
                                                        </div>
                                                    </>
                                                )}

                                                {/* 5. LÍQUIDOS LIMPIA LENTES */}
                                                {catLower.includes('liquido') && (
                                                    <>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Capacidad / Volumen</label>
                                                            <input 
                                                                type="text"
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.volume || ''}
                                                                onChange={(e) => handleAttrChange('volume', e.target.value)}
                                                                placeholder="Ej: 60 ml, 2 Oz"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Presentación</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.packaging || ''}
                                                                onChange={(e) => handleAttrChange('packaging', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione --</option>
                                                                <option value="Atomizador">Atomizador / Spray</option>
                                                                <option value="Gotero">Gotero</option>
                                                            </select>
                                                        </div>
                                                    </>
                                                )}

                                                {/* 6. PAÑOS MICROFIBRA */}
                                                {catLower.includes('pano') && (
                                                    <>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Dimensiones</label>
                                                            <input 
                                                                type="text"
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.dimensions || ''}
                                                                onChange={(e) => handleAttrChange('dimensions', e.target.value)}
                                                                placeholder="Ej: 15x15 cm"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-xs text-on-surface-variant font-medium">Tipo de Personalización</label>
                                                            <select 
                                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition"
                                                                value={customAttrs.design || ''}
                                                                onChange={(e) => handleAttrChange('design', e.target.value)}
                                                            >
                                                                <option value="">-- Seleccione --</option>
                                                                <option value="Unicolor">Unicolor básico</option>
                                                                <option value="Estampado">Estampado / Con diseños</option>
                                                                <option value="Logo Tienda">Con logo de la óptica</option>
                                                            </select>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                    
                                    {/* Matriz de Variantes por Referencia Única */}
                                    {productType === 'product' && (
                                        <div className="col-span-1 md:col-span-2 space-y-2 bg-surface-container/20 p-3 rounded-2xl border border-outline/10 my-1">
                                            <div className="flex justify-between items-center pb-1 border-b border-outline/10">
                                                <label className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-primary text-[18px]">palette</span>
                                                    Matriz de Variantes por Color (Stock / Mínimo / Foto)
                                                </label>
                                            </div>

                                            {/* Nombres de los Campos / Encabezados de la Tabla */}
                                            <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-on-surface-variant px-2 py-1 tracking-wider border-b border-outline/10">
                                                <div className="col-span-3">COLOR / VARIANTE</div>
                                                <div className="col-span-2 text-center">STOCK ACTUAL</div>
                                                <div className="col-span-2 text-center">STOCK MÍNIMO</div>
                                                <div className="col-span-2 text-center">FOTO PRODUCTO</div>
                                                <div className="col-span-2 text-center">SKU / BARRAS</div>
                                                <div className="col-span-1 text-center">ACCIONES</div>
                                            </div>

                                            <div className="space-y-2">
                                                {variantList.map((v, idx) => (
                                                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-surface-container/60 p-2.5 rounded-xl border border-outline/10">
                                                        {/* 1. Selector Visual de Color con Círculos en CADA Opción y Edición */}
                                                        <div className="sm:col-span-3 flex flex-col gap-1">
                                                            <label className="text-[9px] font-bold text-on-surface-variant uppercase sm:hidden">Color / Variante</label>
                                                            <VisualColorDropdown
                                                                selectedColor={v.color}
                                                                colors={allColors}
                                                                onSelect={(colorName) => {
                                                                    const updated = [...variantList];
                                                                    updated[idx].color = colorName;
                                                                    setVariantList(updated);
                                                                }}
                                                                onOpenPaintNew={() => openCreateColorModal(idx)}
                                                                onEditColor={(c) => openEditColorModal(c)}
                                                                onDeleteColor={(id) => handleDeleteColor(id)}
                                                            />
                                                        </div>

                                                        {/* 2. Stock Actual */}
                                                        <div className="sm:col-span-2 flex flex-col gap-1">
                                                            <label className="text-[9px] font-bold text-on-surface-variant uppercase sm:hidden">Stock Actual</label>
                                                            <input
                                                                type="number"
                                                                placeholder="Stock *"
                                                                value={v.stock}
                                                                onChange={(e) => {
                                                                    const updated = [...variantList];
                                                                    updated[idx].stock = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                                                    setVariantList(updated);
                                                                }}
                                                                className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none font-mono text-center font-bold"
                                                            />
                                                        </div>

                                                        {/* 3. Stock Mínimo */}
                                                        <div className="sm:col-span-2 flex flex-col gap-1">
                                                            <label className="text-[9px] font-bold text-on-surface-variant uppercase sm:hidden">Stock Mínimo</label>
                                                            <input
                                                                type="number"
                                                                placeholder="Mínimo *"
                                                                value={v.min_stock}
                                                                onChange={(e) => {
                                                                    const updated = [...variantList];
                                                                    updated[idx].min_stock = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                                                    setVariantList(updated);
                                                                }}
                                                                className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none font-mono text-center"
                                                            />
                                                        </div>

                                                        {/* 4. Cuadro de Carga de Foto de Producto */}
                                                        <div className="sm:col-span-2 flex flex-col items-center gap-1">
                                                            <label className="text-[9px] font-bold text-on-surface-variant uppercase sm:hidden">Foto del Producto</label>
                                                            <label className="relative cursor-pointer flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container border-2 border-dashed border-outline/30 hover:border-primary transition group overflow-hidden shadow-sm">
                                                                {v.image_url ? (
                                                                    <>
                                                                        <img src={v.image_url} alt={v.color} className="w-full h-full object-cover rounded-lg" />
                                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                                            <span className="material-symbols-outlined text-white text-[16px]">edit</span>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center text-on-surface-variant group-hover:text-primary transition p-1 text-center">
                                                                        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                                                                    </div>
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
                                                                                    updated[idx].image_url = reader.result.toString();
                                                                                    setVariantList(updated);
                                                                                }
                                                                            };
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>

                                                        {/* 5. SKU / Código de Barras por Color */}
                                                        <div className="sm:col-span-2 flex flex-col gap-1">
                                                            <label className="text-[9px] font-bold text-on-surface-variant uppercase sm:hidden">SKU / Barras</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Escanear / Vacío"
                                                                value={v.sku || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...variantList];
                                                                    updated[idx].sku = e.target.value;
                                                                    setVariantList(updated);
                                                                }}
                                                                className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-[11px] text-on-surface outline-none font-mono text-center focus:border-primary"
                                                            />
                                                        </div>

                                                        {/* 6. Acciones / Eliminar */}
                                                        <div className="sm:col-span-1 flex justify-center">
                                                            {variantList.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setVariantList(variantList.filter((_, i) => i !== idx))}
                                                                    className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer bg-transparent border-0 transition"
                                                                    title="Eliminar variante"
                                                                >
                                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                                <button
                                                type="button"
                                                onClick={() => setVariantList([...variantList, { color: 'Carey', stock: 5, min_stock: 1, image_url: '' }])}
                                                className="w-full py-2 bg-primary/10 border border-dashed border-primary/40 rounded-xl text-xs font-bold text-primary hover:bg-primary/20 transition cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">add</span>
                                                + (Si presiono el más abajo se agrega)
                                            </button>
                                        </div>
                                    )}

                                    {/* Fila de Precios (Precio Costo | Precio Venta | Descuento Promocional) */}
                                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Precio Costo (COP)</label>
                                            <input 
                                                type="number"
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition font-mono"
                                                value={costPrice}
                                                onChange={(e) => setCostPrice(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                                onFocus={(e) => e.target.select()}
                                                placeholder="Ej: 80000"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs text-on-surface-variant font-medium">Precio Venta (COP) *</label>
                                            <input 
                                                type="number"
                                                className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition font-mono font-bold"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                                onFocus={(e) => e.target.select()}
                                                required
                                            />
                                        </div>
                                        {productType === 'product' && (
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs text-on-surface-variant font-medium">Descuento Promocional (%)</label>
                                                <input 
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    className="bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition font-mono"
                                                    value={promoDiscount}
                                                    onChange={(e) => setPromoDiscount(e.target.value === '' ? '' : Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Fila de Descripción */}
                                    {!hiddenFields.has('description') && (
                                        <div className="col-span-1 md:col-span-2">
                                            <FieldWrapper 
                                                fieldId="description" 
                                                label="Descripción"
                                                hidden={false}
                                                onToggleHidden={toggleFieldHidden}
                                                children={
                                                    <textarea 
                                                        className="w-full bg-surface-container border border-outline/20 rounded-xl p-3 text-sm focus:border-primary text-on-surface outline-none transition min-h-[60px]"
                                                        value={description}
                                                        onChange={(e) => setDescription(e.target.value)}
                                                        placeholder="Escribe la descripción del producto o servicio..."
                                                    />
                                                }
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Barcode Display at the bottom of form */}
                                {(sku || (editingProduct && editingProduct.sku)) && (
                                    <div className="flex flex-col items-center justify-center p-4 bg-surface-container/30 border border-outline/10 rounded-xl mt-2">
                                        <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider mb-1">Código de Barras Generado</span>
                                        <BarcodeSVG value={sku || editingProduct?.sku || ''} />
                                    </div>
                                )}

                                {/*upsell custom form request*/}
                                <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-2 text-center my-3">
                                    <p className="text-[11px] text-on-surface-variant font-medium">¿Necesitas campos adicionales o un esquema de inventario a tu medida?</p>
                                    <a 
                                        href="https://wa.me/573116718652?text=Hola%20Diaz%20Lab%20Automation,%20deseo%20solicitar%20un%20formulario%20personalizado%20para%20el%20inventario%20de%20mi%20empresa."
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">contact_support</span>
                                        Solicitar formulario personalizado
                                    </a>
                                </div>

                                <div className="flex justify-between items-center gap-3 pt-4 border-t border-outline/5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setName('');
                                            setSku('');
                                            setDescription('');
                                            setPrice('');
                                            setCostPrice('');
                                            setStock('');
                                            setBrand('');
                                            setMaterial('');
                                            setStyle('');
                                            setColor('');
                                            setPromoDiscount('');
                                            setCustomAttrs({});
                                            setHiddenFields(new Set());
                                        }}
                                        className="bg-surface-container border border-outline/20 hover:bg-surface-container-high text-xs font-semibold py-2 px-4 rounded-xl transition cursor-pointer text-on-surface border-0"
                                    >
                                        Limpiar
                                    </button>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="bg-surface-container/50 border border-outline/20 hover:bg-surface-container-high text-xs font-semibold py-2 px-4 rounded-xl transition cursor-pointer text-on-surface border-0 flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                            Terminar
                                        </button>
                                        <button
                                            type="submit"
                                            className="bg-primary hover:opacity-90 text-on-primary text-xs font-semibold py-2 px-4 rounded-xl transition cursor-pointer border-0 flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-[14px]">save</span>
                                            {editingProduct ? 'Actualizar' : 'Guardar'}
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
                    ) : filteredProducts.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <p className="text-sm text-on-surface-variant">No hay productos que coincidan con la búsqueda.</p>
                        </div>
                    ) : (
                        <div className="glass-card overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-semibold">
                                        <th className="p-4">Producto</th>
                                        <th className="p-4">Código de Barras / SKU</th>
                                        <th className="p-4">Costo</th>
                                        <th className="p-4">Precio Venta</th>
                                        <th className="p-4">Stock</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline/10 text-sm">
                                    {filteredProducts.map((prod) => (
                                        <tr key={prod.id} className="hover:bg-surface-container/30 transition-colors">
                                            <td 
                                                className="p-4 cursor-pointer" 
                                                onClick={() => openEdit(prod)}
                                            >
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-on-surface text-sm">{prod.name}</p>
                                                        {parseFloat(prod.promo_discount || '0') > 0 && (
                                                            <span className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                                -{parseFloat(prod.promo_discount)}% Promoción
                                                            </span>
                                                        )}
                                                    </div>
                                                    {prod.description && <p className="text-xs text-on-surface-variant mt-0.5">{prod.description}</p>}
                                                    {category === 'optica' && (
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-on-surface-variant">
                                                            {prod.brand && <span className="bg-surface-container border border-outline/10 px-1.5 py-0.5 rounded">Marca: {prod.brand}</span>}
                                                            {prod.material && <span className="bg-surface-container border border-outline/10 px-1.5 py-0.5 rounded">Material: {prod.material}</span>}
                                                            {prod.style && <span className="bg-surface-container border border-outline/10 px-1.5 py-0.5 rounded">Estilo: {prod.style}</span>}
                                                            {prod.color && (
                                                                <span className="bg-surface-container border border-outline/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    Color: 
                                                                    <span 
                                                                        className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block"
                                                                        style={{ background: getColorPreview(prod.color) }}
                                                                    />
                                                                    {prod.color}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td 
                                                className="p-4 cursor-pointer"
                                                onClick={() => prod.sku && openPrintModal(prod)}
                                                title={prod.sku ? "Haga clic para imprimir etiquetas" : undefined}
                                            >
                                                {prod.sku ? (
                                                    <BarcodeSVG value={prod.sku} size="sm" />
                                                ) : (
                                                    <span className="text-xs text-on-surface-variant/50 font-mono">-</span>
                                                )}
                                            </td>
                                            <td 
                                                className="p-4 font-mono text-xs text-on-surface-variant cursor-pointer"
                                                onClick={() => openEdit(prod)}
                                            >
                                                {prod.cost_price ? formatPrice(prod.cost_price) : '$0'}
                                            </td>
                                            <td 
                                                className="p-4 font-semibold text-on-surface cursor-pointer"
                                                onClick={() => openEdit(prod)}
                                            >
                                                {formatPrice(prod.price)}
                                            </td>
                                            <td 
                                                className="p-4 cursor-pointer"
                                                onClick={() => openEdit(prod)}
                                            >
                                                {prod.product_type === 'service' || prod.stock >= 999999 ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 w-fit">
                                                        <span className="material-symbols-outlined text-[14px]">medical_services</span>
                                                        Servicio (Infinito)
                                                    </span>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        prod.stock <= (prod.min_stock !== undefined ? prod.min_stock : 5)
                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                            : prod.stock <= (prod.min_stock !== undefined ? prod.min_stock : 5) * 2
                                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                : 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                    }`}>
                                                        {prod.stock} uds
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => handleOpenCrossStock(prod)}
                                                        className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded transition cursor-pointer border-0 bg-transparent"
                                                        title="Ver Stock en Otras Sedes / Solicitar Traspaso"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">domain</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => openRefillModal(prod)}
                                                        className="p-1.5 hover:bg-green-500/10 text-green-400 rounded transition cursor-pointer border-0 bg-transparent"
                                                        title="Rellenar Stock (Refill)"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">add_box</span>
                                                    </button>
                                                    {prod.sku && (
                                                        <button 
                                                            onClick={() => openPrintModal(prod)}
                                                            className="p-1.5 hover:bg-secondary/10 text-secondary rounded transition cursor-pointer border-0 bg-transparent"
                                                            title="Imprimir Código de Barras"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">print</span>
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => openEdit(prod)}
                                                        className="p-1.5 hover:bg-primary/10 text-primary rounded transition cursor-pointer border-0 bg-transparent"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(prod.id)}
                                                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition cursor-pointer border-0 bg-transparent"
                                                        title="Eliminar"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
            {showNewColorPrompt && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-container-high border border-outline/10 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-base text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                                Agregar Color Nuevo
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setShowNewColorPrompt(false)}
                                className="p-1 hover:bg-surface-container-highest rounded-full border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
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
                                    className="bg-surface-container border border-outline/20 rounded-lg p-2.5 text-xs focus:border-primary text-on-surface outline-none transition"
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
                                        className="w-12 h-10 rounded-lg cursor-pointer border border-outline/20"
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
                                        className="bg-surface-container border border-outline/20 rounded-lg p-2 text-xs font-mono focus:border-primary text-on-surface outline-none transition flex-grow"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-surface-container/30 rounded-lg border border-outline/10">
                                <span className="text-xs text-on-surface-variant font-medium">Vista previa:</span>
                                <span 
                                    className="w-6 h-6 rounded-lg border-2 border-white/30"
                                    style={{ backgroundColor: newColorHex }}
                                />
                                <span className="text-xs text-on-surface-variant">{newColorName || 'Tu color'}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-outline/5">
                            <button 
                                type="button"
                                onClick={() => setShowNewColorPrompt(false)}
                                className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-lg transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleAddCustomColor}
                                disabled={!newColorName.trim()}
                                className="px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary text-xs font-bold rounded-lg transition cursor-pointer border-0 flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Agregar Color
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Impresión de Códigos de Barras */}
            {isPrintModalOpen && printProduct && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-container-high border border-outline/10 p-6 rounded-2xl max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-base text-on-surface">
                                    {isRefillPrompt ? 'ðŸ“¦ Impresión por Reabastecimiento' : 'ðŸ–¨ï¸ Imprimir Código de Barras'}
                                </h3>
                                <p className="text-xs text-on-surface-variant opacity-75 mt-1">
                                    {printProduct.name}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsPrintModalOpen(false)}
                                className="p-1 hover:bg-surface-container-highest rounded-full border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {isRefillPrompt ? (
                            <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl mb-4 text-xs text-on-surface-variant leading-relaxed">
                                <strong className="text-primary">¡Reabastecimiento detectado!</strong> Se han añadido nuevas unidades al stock. ¿Cuántas etiquetas de códigos de barras deseas imprimir para esta tanda?
                            </div>
                        ) : (
                            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                                Elige cuántas etiquetas autoadhesivas deseas generar para tu impresora térmica (Tamaño estándar 50mm x 30mm).
                            </p>
                        )}

                        <div className="space-y-4">
                            <div className="bg-surface-container p-3 rounded-xl border border-outline/5 flex items-center gap-3">
                                <div className="flex-grow">
                                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Código SKU</p>
                                    <p className="text-sm font-mono text-on-surface font-semibold mt-0.5">{printProduct.sku}</p>
                                </div>
                                <div className="w-px h-8 bg-outline/10" />
                                <div>
                                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Precio de Venta</p>
                                    <p className="text-sm text-on-surface font-bold mt-0.5">{formatPrice(printProduct.price)}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Tipo de Etiqueta</label>
                                <select
                                    value={printProfileId}
                                    onChange={(e) => setPrintProfileId(e.target.value as LabelProfileId)}
                                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-sm text-on-surface outline-none focus:border-primary"
                                >
                                    {Object.values(LABEL_PRINT_PROFILES).map((profile) => (
                                        <option key={profile.id} value={profile.id}>
                                            {profile.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Cantidad a Imprimir</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setPrintQuantity(1)}
                                        className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold transition cursor-pointer ${printQuantity === 1 ? 'bg-primary/15 border-primary text-primary' : 'bg-transparent border-outline/20 text-on-surface hover:bg-surface-container'}`}
                                    >
                                        1 Copia (Prueba)
                                    </button>
                                    {isRefillPrompt && (
                                        <button 
                                            type="button"
                                            onClick={() => setPrintQuantity(printQuantity)}
                                            className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold transition cursor-pointer bg-primary/15 border-primary text-primary`}
                                        >
                                            {printQuantity} Copias (Refill)
                                        </button>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={() => setPrintQuantity(printProduct.stock)}
                                        className={`flex-1 py-2 px-3 border rounded-xl text-xs font-bold transition cursor-pointer ${printQuantity === printProduct.stock ? 'bg-primary/15 border-primary text-primary' : 'bg-transparent border-outline/20 text-on-surface hover:bg-surface-container'}`}
                                    >
                                        Stock Completo ({printProduct.stock})
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Cantidad Personalizada</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="500"
                                        value={printQuantity}
                                        onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="bg-surface-container border border-outline/20 p-2 rounded-xl text-sm font-semibold text-on-surface outline-none w-28 text-center"
                                    />
                                    <span className="text-xs text-on-surface-variant opacity-60 font-sans">etiquetas autoadhesivas</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-outline/5 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    const selectedSettings = LABEL_PRINT_PROFILES[printProfileId] || DEFAULT_LABEL_PRINT_SETTINGS;
                                    previewBarcodes([{
                                        name: printProduct.name,
                                        sku: printProduct.sku || '',
                                        price: printProduct.price,
                                        quantity: parseInt(printQuantity.toString()) || 1
                                    }], selectedSettings);
                                }}
                                className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Vista previa
                            </button>
                            <button 
                                onClick={() => setIsPrintModalOpen(false)}
                                className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handlePrintBarcodes}
                                className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[16px]">print</span>
                                Confirmar e Imprimir
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Reabastecimiento Rápido (Refill) */}
            {isRefillModalOpen && refillProduct && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <form onSubmit={handleSaveRefill} className="bg-surface-container-high border border-outline/10 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-base text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-green-400">add_box</span>
                                Rellenar Inventario
                            </h3>
                            <button 
                                type="button"
                                onClick={() => setIsRefillModalOpen(false)}
                                className="p-1 hover:bg-surface-container-highest rounded-full border-0 bg-transparent text-on-surface-variant cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="bg-surface-container p-3 rounded-xl border border-outline/5 text-xs space-y-1">
                            <p className="text-on-surface font-semibold">{refillProduct.name}</p>
                            <p className="text-on-surface-variant opacity-75 font-mono">SKU: {refillProduct.sku || 'N/A'}</p>
                            <p className="text-on-surface-variant opacity-75">Stock Actual: <strong className="text-on-surface">{refillProduct.stock} uds</strong> (Mínimo: {refillProduct.min_stock !== undefined ? refillProduct.min_stock : 5} uds)</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Cantidad a ingresar *</label>
                            <input 
                                type="number" 
                                required
                                min="1"
                                placeholder="Ej: 50"
                                value={refillQuantity}
                                onChange={(e) => setRefillQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="bg-surface-container border border-outline/20 p-3 rounded-xl text-sm font-semibold text-on-surface outline-none w-full"
                            />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer select-none py-1 ml-1 text-xs text-on-surface-variant">
                            <input 
                                type="checkbox" 
                                checked={printAfterRefill} 
                                onChange={(e) => setPrintAfterRefill(e.target.checked)}
                                className="accent-primary w-4 h-4 rounded"
                            />
                            <span>Imprimir códigos de barra para estas nuevas unidades</span>
                        </label>

                        <div className="flex justify-end gap-3 pt-4 border-t border-outline/5 mt-4">
                            <button 
                                type="button"
                                onClick={() => setIsRefillModalOpen(false)}
                                className="px-4 py-2 bg-transparent hover:bg-surface-container-highest border border-outline/20 text-on-surface text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 border-0"
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

            {/* Modal Estilo Paint para Crear/Editar Colores (Teleportado a document.body con z-[99999]) */}
            {isPaintModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-surface-container-highest border border-outline/30 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative z-[100000]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3">
                            <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">palette</span>
                                {editingColor ? 'Editar Color' : 'Crear / Personalizar Nuevo Color (Estilo Paint)'}
                            </h4>
                            <button type="button" onClick={() => setIsPaintModalOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSavePaintColor} className="space-y-4">
                            {/* Campo dividido a la mitad 50% / 50% */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Izquierda (50%): Nombre del color */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                                        Nombre del Color *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej. Violeta, Azul Rey"
                                        value={colorNameInput}
                                        onChange={(e) => setColorNameInput(e.target.value)}
                                        className="w-full bg-surface-container border border-outline/30 rounded-xl p-3 text-xs text-on-surface font-bold outline-none focus:border-primary transition"
                                    />
                                </div>

                                {/* Derecha (50%): Selector Interactivo Paint */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase text-on-surface-variant">
                                        Color Interactivo (Paint) *
                                    </label>
                                    <input
                                        type="color"
                                        value={colorHexInput}
                                        onChange={(e) => setColorHexInput(e.target.value)}
                                        className="w-full h-11 bg-surface-container border border-outline/30 rounded-xl p-1 cursor-pointer outline-none"
                                    />
                                </div>
                            </div>

                            {/* Previsualización del Color */}
                            <div className="p-3 bg-surface-container/50 border border-outline/15 rounded-xl flex items-center justify-between">
                                <span className="text-xs font-bold text-on-surface-variant">Vista Previa:</span>
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-8 h-8 rounded-full border-2 border-white/40 shadow-lg transition-all"
                                        style={{ background: colorHexInput }}
                                    />
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-on-surface">{colorNameInput || 'Sin Nombre'}</p>
                                        <p className="text-[10px] font-mono text-on-surface-variant uppercase">{colorHexInput}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-outline/10">
                                <button
                                    type="button"
                                    onClick={() => setIsPaintModalOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface font-bold text-xs rounded-xl cursor-pointer hover:bg-surface-container-high"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl cursor-pointer shadow hover:opacity-90 flex items-center gap-1.5"
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
            {crossStockModalOpen && selectedCrossProduct && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-surface-container-highest border border-outline/30 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">domain</span>
                                    Disponibilidad de Stock Inter-Sedes
                                </h3>
                                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                                    Producto: <strong className="text-primary">{selectedCrossProduct.name}</strong> (SKU: {selectedCrossProduct.sku || 'N/A'})
                                </p>
                            </div>
                            <button
                                onClick={() => setCrossStockModalOpen(false)}
                                className="p-1 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {crossStockLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : crossStockList.length === 0 ? (
                            <div className="p-6 text-center text-xs text-on-surface-variant">
                                No se encontraron existencias de este producto en otras sedes registradas.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {crossStockList.map((item: any) => {
                                    const isCurrent = item.client_id === clientId;
                                    return (
                                        <div 
                                            key={item.client_id} 
                                            className={`p-3.5 rounded-2xl border flex items-center justify-between transition ${
                                                isCurrent 
                                                    ? 'bg-primary/5 border-primary/30' 
                                                    : 'bg-surface-container/40 border-outline/10 hover:border-outline/30'
                                            }`}
                                        >
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-on-surface">
                                                        {item.is_main_branch ? '🏢' : '📍'} {item.branch_name}
                                                    </span>
                                                    {isCurrent && (
                                                        <span className="text-[9px] font-bold uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                                            Sede Actual
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-mono font-bold">
                                                    Stock: <span className={item.stock > 0 ? 'text-emerald-400 font-extrabold' : 'text-rose-400 font-bold'}>{item.stock} ud.</span>
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
                                                        className="w-14 bg-surface-container border border-outline/20 p-1.5 rounded-lg text-xs text-center font-bold text-on-surface outline-none"
                                                    />
                                                    <button
                                                        disabled={transferringBranchId === item.client_id}
                                                        onClick={() => handleExecuteTransfer(item.client_id, item.branch_name)}
                                                        className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
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
                </div>
            )}
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

// Componente Selector Visual de Color con Círculos al lado de CADA Nombre de la lista desplegada
const VisualColorDropdown: React.FC<{
    selectedColor: string;
    colors: Array<{ id: string; name: string; value: string; preview: string; isCustom?: boolean }>;
    onSelect: (colorName: string) => void;
    onOpenPaintNew: () => void;
    onEditColor: (item: { id: string; name: string; preview: string }) => void;
    onDeleteColor: (id: string) => void;
}> = ({ selectedColor, colors, onSelect, onOpenPaintNew, onEditColor, onDeleteColor }) => {
    const [isOpen, setIsOpen] = useState(false);

    const currentItem = colors.find(
        c => c.value.toLowerCase() === (selectedColor || '').toLowerCase() || c.name.toLowerCase() === (selectedColor || '').toLowerCase()
    ) || { name: selectedColor || 'Negro', preview: '#808080' };

    return (
        <div className="relative w-full">
            {/* Botón Cerrado con Círculo y Nombre */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold outline-none cursor-pointer flex items-center justify-between hover:border-primary/50 transition shadow-sm"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div 
                        className="w-5 h-5 rounded-full border-2 border-outline/40 flex-shrink-0 shadow-sm"
                        style={{ background: currentItem.preview }}
                    />
                    <span className="truncate">{currentItem.name}</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {/* Menú Desplegable Abierto con Círculos al Lado de CADA Opciones */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-highest border border-outline/30 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 space-y-1 backdrop-blur-md">
                    <div className="text-[10px] font-bold text-on-surface-variant uppercase px-2 py-1 tracking-wider border-b border-outline/10">
                        Colores Disponibles
                    </div>

                    {colors.map((c) => (
                        <div
                            key={c.id}
                            onClick={() => {
                                onSelect(c.name);
                                setIsOpen(false);
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs font-bold ${
                                (selectedColor || '').toLowerCase() === c.name.toLowerCase()
                                    ? 'bg-primary/20 text-primary'
                                    : 'text-on-surface hover:bg-surface-container-high'
                            }`}
                        >
                            <div className="flex items-center gap-2.5 truncate">
                                <div 
                                    className="w-5 h-5 rounded-full border border-outline/30 flex-shrink-0 shadow-sm"
                                    style={{ background: c.preview }}
                                />
                                <span>{c.name}</span>
                            </div>

                            {c.isCustom && (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            onEditColor(c);
                                        }}
                                        className="p-1 text-primary hover:bg-primary/20 rounded cursor-pointer border-0 bg-transparent flex items-center"
                                        title="Editar este color"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onDeleteColor(c.id);
                                        }}
                                        className="p-1 text-rose-400 hover:bg-rose-500/20 rounded cursor-pointer border-0 bg-transparent flex items-center"
                                        title="Eliminar este color"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="pt-1 border-t border-outline/10">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onOpenPaintNew();
                            }}
                            className="w-full py-2 px-2 bg-primary/10 text-primary font-bold text-xs rounded-lg hover:bg-primary/20 transition cursor-pointer flex items-center justify-center gap-1.5 border border-dashed border-primary/40"
                        >
                            <span className="material-symbols-outlined text-[16px]">palette</span>
                            + 🎨 Crear Nuevo Color (Paint)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

