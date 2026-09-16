import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ColorOption {
    name: string;
    value: string;
    preview: string;
}

export const colorOptions: ColorOption[] = [
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

export const getColorHex = (colorName?: string, colorHex?: string) => {
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

export const getColorPreview = (name: string, colorHex?: string, customOptions?: ColorOption[]): string => {
    if (colorHex && colorHex.startsWith('#')) return colorHex;
    if (!name) return '#808080';
    const clean = name.trim().toLowerCase();
    const list = customOptions && customOptions.length > 0 ? customOptions : colorOptions;
    const opt = list.find(o => 
        o.value.toLowerCase() === clean || 
        o.name.toLowerCase() === clean || 
        clean.includes(o.value.toLowerCase()) || 
        o.value.toLowerCase().includes(clean)
    );
    if (opt) return opt.preview;
    return getColorHex(name, colorHex);
};

export interface SaaSErpProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    categories: any[];
    token?: string | null;
    isAdmin?: boolean;
    editingProduct?: any | null;
    isDraftMode?: boolean;
    onSaveDraft?: (draftPayload: any, keepOpen?: boolean) => void;
    onProductSaved?: () => void;
    fetchCategories?: () => Promise<void>;
}

export const SaaSErpProductFormModal: React.FC<SaaSErpProductFormModalProps> = ({
    isOpen,
    onClose,
    clientId,
    categories,
    isAdmin = true,
    editingProduct = null,
    isDraftMode = false,
    onSaveDraft,
    onProductSaved,
    fetchCategories
}) => {
    const [productFormStep, setProductFormStep] = useState<number>(1);
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [brand, setBrand] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [price, setPrice] = useState<number | string>('');
    const [costPrice, setCostPrice] = useState<number | string>('');
    const [promoDiscount, setPromoDiscount] = useState<number | string>('');
    const [taxRate, setTaxRate] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [productType, setProductType] = useState<'product' | 'service'>('product');
    
    // Óptica / Lentes
    const [isLensMode, setIsLensMode] = useState<boolean>(false);
    const [lensDesign, setLensDesign] = useState<string>('');
    const [lensMaterial, setLensMaterial] = useState<string>('');
    const [lensTreatment, setLensTreatment] = useState<string>('');
    
    // Atributos de Marcos / Items
    const [material, setMaterial] = useState('');
    const [style, setStyle] = useState('');
    const [color, setColor] = useState('');

    // Variantes & Stock
    const [hasVariants, setHasVariants] = useState<boolean>(true);
    const [stock, setStock] = useState<number | string>('');
    const [minStock, setMinStock] = useState<number | string>(5);
    const [variantList, setVariantList] = useState<Array<{ id?: string, color: string, sku: string, stock: number | string, min_stock: number | string, image_url?: string }>>([
        { color: 'Negro', sku: '', stock: 10, min_stock: 2, image_url: '' }
    ]);
    const [activePhotoColorIdx, setActivePhotoColorIdx] = useState<number>(0);
    const [customAttrs, setCustomAttrs] = useState<Record<string, any>>({});

    // Selector de Color Personalizado & Lista de Opciones (Wabi-Sabi)
    const [availableColorOptions, setAvailableColorOptions] = useState<ColorOption[]>(colorOptions);
    const [openColorDropdownIdx, setOpenColorDropdownIdx] = useState<number | null>(null);
    const [colorDropdownCoords, setColorDropdownCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const [showCustomColorModal, setShowCustomColorModal] = useState<boolean>(false);
    const [customColorTargetIdx, setCustomColorTargetIdx] = useState<number | null>(null);
    const [newCustomColorName, setNewCustomColorName] = useState<string>('');
    const [newCustomColorHex, setNewCustomColorHex] = useState<string>('#D9381E');

    // Categoría modal rápida
    const [showCreateCategoryPrompt, setShowCreateCategoryPrompt] = useState<boolean>(false);
    const [newCategoryName, setNewCategoryName] = useState<string>('');

    const handleCreateCustomColor = () => {
        if (!newCustomColorName.trim()) return;
        const colorName = newCustomColorName.trim();
        const hex = newCustomColorHex;
        
        const newOpt: ColorOption = {
            name: colorName,
            value: colorName,
            preview: hex
        };

        setAvailableColorOptions(prev => {
            if (prev.some(o => o.value.toLowerCase() === colorName.toLowerCase())) return prev;
            return [...prev, newOpt];
        });

        if (customColorTargetIdx !== null && variantList[customColorTargetIdx]) {
            const updated = [...variantList];
            updated[customColorTargetIdx].color = colorName;
            setVariantList(updated);
        }

        setNewCustomColorName('');
        setNewCustomColorHex('#D9381E');
        setShowCustomColorModal(false);
        setCustomColorTargetIdx(null);
    };

    // Reset or initialize form when opened or editingProduct changes
    useEffect(() => {
        if (!isOpen) return;

        setProductFormStep(1);
        if (editingProduct) {
            setName(editingProduct.name || '');
            setSku(editingProduct.sku || '');
            setBrand(editingProduct.brand || '');
            setCategoryId(editingProduct.category_id ? String(editingProduct.category_id) : '');
            setPrice(editingProduct.price ?? '');
            setCostPrice(editingProduct.cost_price ?? '');
            setPromoDiscount(editingProduct.promo_discount ?? '');
            setTaxRate(editingProduct.tax_rate ?? 0);
            setDescription(editingProduct.description || '');
            setProductType(editingProduct.product_type || 'product');

            const attrs = editingProduct.attributes || {};
            setCustomAttrs(attrs);
            setIsLensMode(Boolean(attrs.is_lens));
            setLensDesign(attrs.lens_design || '');
            setLensMaterial(attrs.lens_material || '');
            setLensTreatment(attrs.lens_treatment || '');
            setMaterial(editingProduct.material || '');
            setStyle(editingProduct.style || '');
            setColor(editingProduct.color || '');

            setHasVariants(editingProduct.has_variants ?? true);
            setStock(editingProduct.stock ?? '');
            setMinStock(editingProduct.min_stock ?? 5);

            if (Array.isArray(editingProduct.variants) && editingProduct.variants.length > 0) {
                setVariantList(editingProduct.variants.map((v: any) => ({
                    id: v.id,
                    color: v.variant_name || v.color || '',
                    sku: v.sku || '',
                    stock: v.stock ?? 0,
                    min_stock: v.min_stock ?? 2,
                    image_url: v.image_url || ''
                })));
            } else {
                setVariantList([{ color: 'Negro', sku: editingProduct.sku || '', stock: editingProduct.stock || 10, min_stock: editingProduct.min_stock || 2, image_url: editingProduct.image_url || '' }]);
            }
            setActivePhotoColorIdx(0);
        } else {
            resetFormFields();
        }
    }, [isOpen, editingProduct]);

    const resetFormFields = () => {
        setProductFormStep(1);
        setName('');
        setSku('');
        setBrand('');
        setCategoryId('');
        setPrice('');
        setCostPrice('');
        setPromoDiscount('');
        setTaxRate(0);
        setDescription('');
        setProductType('product');
        setIsLensMode(false);
        setLensDesign('');
        setLensMaterial('');
        setLensTreatment('');
        setMaterial('');
        setStyle('');
        setColor('');
        setHasVariants(true);
        setStock('');
        setMinStock(5);
        setVariantList([{ color: 'Negro', sku: '', stock: 10, min_stock: 2, image_url: '' }]);
        setActivePhotoColorIdx(0);
        setCustomAttrs({});
    };

    const handleSelectCategory = (catId: string) => {
        setCategoryId(catId);
        const selectedCat = categories.find((c: any) => String(c.id) === String(catId));
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCategoryName })
            });
            const json = await res.json();
            if (json.success) {
                if (fetchCategories) await fetchCategories();
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

    const handleSubmit = async (e: React.FormEvent, keepOpen: boolean = false) => {
        e.preventDefault();

        const isLensType = isLensMode || (categoryId && categories.find((c: any) => String(c.id) === String(categoryId))?.name.toLowerCase().includes('lente')) || Boolean(lensDesign || lensMaterial || lensTreatment);
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
            price: price === '' ? 0 : (typeof price === 'string' ? parseFloat(price) : price), 
            stock: calculatedTotalStock,
            min_stock: calculatedMinStock,
            cost_price: costPrice === '' ? 0 : (typeof costPrice === 'string' ? parseFloat(costPrice) : costPrice),
            brand: brand.trim() || (isLensType ? 'Lentes' : null),
            material: isLensType ? (lensMaterial || material || null) : (material || null),
            style: isLensType ? (lensDesign || style || null) : (style || null),
            color: hasVarBool ? variantList.map(v => v.color).filter(Boolean).join(', ') : (color || null),
            image_url: primaryImageUrl,
            promo_discount: promoDiscount === '' ? 0 : (typeof promoDiscount === 'string' ? parseFloat(promoDiscount) : promoDiscount),
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

        if (isDraftMode) {
            if (onSaveDraft) {
                onSaveDraft(body, keepOpen);
            }
            if (keepOpen) {
                resetFormFields();
                alert('✓ Producto borrador guardado.\n\nFormulario preparado para agregar otro producto.');
            } else {
                onClose();
            }
            return;
        }

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
                if (onProductSaved) onProductSaved();
                if (keepOpen) {
                    resetFormFields();
                    alert('✓ Producto guardado con éxito.\n\nFormulario despejado para ingresar un nuevo producto.');
                } else {
                    onClose();
                }
            } else {
                alert(data.error || 'Error al guardar el producto.');
            }
        } catch (err: any) {
            alert('Error al procesar la solicitud: ' + err.message);
        }
    };

    const formatPrice = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) return '$ 0 COP';
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-2 sm:p-4">
            
            {/* Modal Secundario Rápido para Crear Nueva Categoría */}
            {showCreateCategoryPrompt && (
                <div className="fixed inset-0 bg-black/50 z-[10005] flex items-center justify-center p-4">
                    <div className="bg-[#F6F4EE] border border-[#161616] p-6 w-full max-w-md shadow-xl space-y-4">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2">
                            <h4 className="font-serif text-lg text-[#161616]">Crear Nueva Categoría</h4>
                            <button 
                                type="button" 
                                onClick={() => setShowCreateCategoryPrompt(false)}
                                className="text-[#161616] hover:text-[#D9381E] text-2xl font-light cursor-pointer border-0 bg-transparent"
                            >
                                &times;
                            </button>
                        </div>
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">Nombre de la Categoría</label>
                            <input 
                                type="text"
                                className="w-full bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none font-sans font-semibold"
                                placeholder="Ej: Monturas Sol, Lentes de Contacto..."
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
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
                </div>
            )}

            {/* Modal Crear / Personalizar Nuevo Color (Estilo Paint) - Wabi-Sabi */}
            {showCustomColorModal && (
                <div className="fixed inset-0 bg-black/60 z-[10005] flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-[#F6F4EE] border border-[#161616] p-6 w-full max-w-md shadow-2xl space-y-5 animate-fade-in">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#D9381E] text-[22px]">palette</span>
                                <h4 className="font-serif text-lg text-[#161616] font-normal">
                                    Crear / Personalizar Nuevo Color
                                </h4>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowCustomColorModal(false);
                                    setCustomColorTargetIdx(null);
                                }}
                                className="text-[#161616] hover:text-[#D9381E] text-2xl font-light cursor-pointer border-0 bg-transparent"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">
                                    Nombre del Color *
                                </label>
                                <input 
                                    type="text"
                                    className="w-full bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none font-sans font-medium"
                                    placeholder="Ej. Violeta, Azul Rey, Verde Esmeralda"
                                    value={newCustomColorName}
                                    onChange={(e) => setNewCustomColorName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold block mb-1">
                                    Color Interactivo (Paint) *
                                </label>
                                <div className="flex gap-3 items-center">
                                    <input 
                                        type="color"
                                        className="w-12 h-12 border border-[#E2DFD7] cursor-pointer p-0 bg-transparent rounded-none"
                                        value={newCustomColorHex}
                                        onChange={(e) => setNewCustomColorHex(e.target.value)}
                                    />
                                    <input 
                                        type="text"
                                        className="flex-1 bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] font-mono outline-none focus:border-[#161616] rounded-none uppercase font-semibold"
                                        value={newCustomColorHex}
                                        onChange={(e) => setNewCustomColorHex(e.target.value)}
                                        placeholder="#HEX"
                                    />
                                </div>
                            </div>

                            {/* Card de Vista Previa Wabi-Sabi */}
                            <div className="bg-white border border-[#E2DFD7] p-4 flex items-center justify-between">
                                <span className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">
                                    Vista Previa:
                                </span>
                                <div className="flex items-center gap-3">
                                    <span 
                                        className="w-7 h-7 rounded-none border border-black/20 shadow-xs"
                                        style={{ background: newCustomColorHex }}
                                    />
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-[#161616]">
                                            {newCustomColorName.trim() || 'Sin Nombre'}
                                        </p>
                                        <p className="text-[10px] text-[#6B6862] font-mono uppercase">
                                            {newCustomColorHex}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowCustomColorModal(false);
                                    setCustomColorTargetIdx(null);
                                }}
                                className="px-5 py-2.5 bg-transparent border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-xs font-bold rounded-none transition cursor-pointer uppercase tracking-wider"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleCreateCustomColor}
                                disabled={!newCustomColorName.trim()}
                                className="px-6 py-2.5 bg-[#161616] hover:bg-[#D9381E] disabled:opacity-50 text-white text-xs font-bold rounded-none transition cursor-pointer border-0 flex items-center gap-1.5 uppercase tracking-wider shadow-sm"
                            >
                                <span className="material-symbols-outlined text-[16px]">check</span>
                                Crear Color
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WIDESCREEN EDITORIAL WABI-SABI PRODUCT FORM MODAL */}
            <div className="bg-[#F6F4EE] border border-[#161616] w-full max-w-[1540px] max-h-[calc(100vh-2.5rem)] h-full sm:h-[86vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-fade-in modal-stepper-mobile">
                
                {/* Header del Modal */}
                <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-[#E2DFD7] flex justify-between items-center bg-[#F6F4EE] shrink-0">
                    <div>
                        <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-sans block">
                            {isDraftMode ? 'ORDEN DE COMPRA — PRODUCTO BORRADOR' : 'FORMULARIO DE INVENTARIO ERP'}
                        </span>
                        <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] leading-tight">
                            {editingProduct ? 'Editar Producto o Servicio' : 'Crear / Editar Producto o Servicio de Venta'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
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
                            <span>1. Datos Básicos</span>
                        </button>

                        {productType === 'product' && (
                            <>
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
                            </>
                        )}

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
                            <span className="w-4 h-4 rounded-full bg-white text-[#161616] text-[9px] flex items-center justify-center font-mono font-bold">
                                {productType === 'service' ? '2' : '3'}
                            </span>
                            <span>{productType === 'service' ? '2. Precios & Guardar' : '3. Precios & Guardar'}</span>
                        </button>
                    </div>
                </div>

                {/* Formulario Dinámico por Pasos */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar">
                        
                        {/* PASO 1: DATOS BÁSICOS Y CLASIFICACIÓN */}
                        {productFormStep === 1 && (
                            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2 mb-4">
                                    <h4 className="font-serif text-xl text-[#161616] font-normal">
                                        1. Datos Básicos & Clasificación
                                    </h4>
                                    {editingProduct && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleSubmit(e, false)}
                                            className="bg-[#161616] hover:bg-[#D9381E] text-white border-0 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1.5 transition shadow-sm"
                                            title="Guardar Cambios Rápido"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">save</span>
                                            <span>Guardar</span>
                                        </button>
                                    )}
                                </div>

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
                                                    setHasVariants(false);
                                                    setVariantList([{ color: 'NEGRO', sku: sku || '', stock: 999999, min_stock: 0, image_url: '' }]);
                                                    setActivePhotoColorIdx(0);
                                                    const lentesCat = categories.find((c: any) => c.name.toLowerCase().includes('lente'));
                                                    if (lentesCat) setCategoryId(String(lentesCat.id));
                                                } else {
                                                    setIsLensMode(false);
                                                    const pVal = val as 'product' | 'service';
                                                    setProductType(pVal);
                                                    if (pVal === 'service') {
                                                        setStock(999999);
                                                        setHasVariants(false);
                                                        setVariantList([{ color: 'NEGRO', sku: sku || '', stock: 999999, min_stock: 0, image_url: '' }]);
                                                        setActivePhotoColorIdx(0);
                                                    } else {
                                                        if (stock === 999999) setStock('');
                                                        setHasVariants(true);
                                                    }
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
                                {(isLensMode || (categoryId && categories.find((c: any) => String(c.id) === String(categoryId))?.name.toLowerCase().includes('lente'))) && (
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

                                {/* Material de Montura / Ítem & Género */}
                                {productType === 'product' && Boolean(categoryId && (categories.find((c: any) => String(c.id) === String(categoryId))?.name || '').toLowerCase().includes('montura')) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Material de Montura / Marco</label>
                                            <select
                                                value={material}
                                                onChange={(e) => setMaterial(e.target.value)}
                                                className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans font-semibold"
                                            >
                                                <option value="">– Seleccionar Material –</option>
                                                <option value="Acetato">Acetato</option>
                                                <option value="Metal / Aleación">Metal / Aleación</option>
                                                <option value="TR-90 / Grilamid">TR-90 / Grilamid</option>
                                                <option value="Titanio / Beta-Titanio">Titanio / Beta-Titanio</option>
                                                <option value="Combinado (Acetato + Metal)">Combinado (Acetato + Metal)</option>
                                                <option value="Madera / Bamboo">Madera / Bamboo</option>
                                                <option value="Inyectado / Ultem">Inyectado / Ultem</option>
                                                <option value="Silicona / Flexible">Silicona / Flexible (Infantil)</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Género / Público Objetivo</label>
                                            <select
                                                value={style}
                                                onChange={(e) => setStyle(e.target.value)}
                                                className="bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] transition rounded-none font-sans font-semibold"
                                            >
                                                <option value="">– Seleccionar Género –</option>
                                                <option value="Unisex">Unisex</option>
                                                <option value="Hombre">Hombre</option>
                                                <option value="Mujer">Mujer</option>
                                                <option value="Niño">Niño</option>
                                                <option value="Niña">Niña</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

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

                                {/* Navegación Paso 1 */}
                                <div className="pt-6 border-t border-[#E2DFD7] flex justify-between items-center">
                                    <div>
                                        {editingProduct && (
                                            <span className="text-[10px] text-[#6B6862] font-medium hidden sm:inline">
                                                * Puedes guardar cambios desde cualquier paso sin recorrer todo el formulario.
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {editingProduct && (
                                            <button 
                                                type="button"
                                                onClick={(e) => handleSubmit(e, false)}
                                                className="bg-[#D9381E] hover:bg-[#b82e18] text-white border-0 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-1.5 transition"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">save</span>
                                                Guardar Cambios
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setProductFormStep(productType === 'service' ? 3 : 2)}
                                            className="bg-[#161616] hover:bg-[#2c2c2c] text-white border-0 px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-2 transition"
                                        >
                                            Siguiente
                                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASO 2: VARIANTES DE COLOR Y STOCK */}
                        {productFormStep === 2 && productType === 'product' && (
                            <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
                                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-2 mb-4">
                                    <h4 className="font-serif text-xl text-[#161616] font-normal">
                                        2. Variantes de Color, Fotografía & Control de Stock
                                    </h4>
                                    {editingProduct && (
                                        <button
                                            type="button"
                                            onClick={(e) => handleSubmit(e, false)}
                                            className="bg-[#161616] hover:bg-[#D9381E] text-white border-0 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1.5 transition shadow-sm"
                                            title="Guardar Cambios Rápido"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">save</span>
                                            <span>Guardar</span>
                                        </button>
                                    )}
                                </div>

                                {/* Sección de Fotografía del Producto por Variante */}
                                <div className="bg-white border border-[#E2DFD7] p-5 space-y-4 mb-4">
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
                                                                className="w-3.5 h-3.5 rounded-none border border-black/20 shrink-0" 
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

                                {productType === 'product' && (
                                    <div className="space-y-4">
                                        {hasVariants ? (
                                            <div className="bg-white p-5 border border-[#E2DFD7] space-y-4">
                                                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                                                    <div>
                                                        <h5 className="font-bold text-xs uppercase tracking-wider text-[#161616]">Tabla de Existencias por Color</h5>
                                                        <p className="text-[11px] text-[#6B6862]">Asigna códigos SKU y cantidad para cada variante de color.</p>
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
                                                                <th className="py-2 px-2 text-center">{isDraftMode ? 'Cantidad a Pedir' : 'Stock'}</th>
                                                                <th className="py-2 px-2 text-center">Min. Stock</th>
                                                                <th className="py-2 pl-2 text-right">Acción</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[#FAF8F5]">
                                                            {variantList.map((v, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="py-2 pr-2 min-w-[210px] relative">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                if (openColorDropdownIdx === idx) {
                                                                                    setOpenColorDropdownIdx(null);
                                                                                    setColorDropdownCoords(null);
                                                                                } else {
                                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                                    setColorDropdownCoords({
                                                                                        top: rect.bottom + 4,
                                                                                        left: rect.left,
                                                                                        width: Math.max(rect.width, 240)
                                                                                    });
                                                                                    setOpenColorDropdownIdx(idx);
                                                                                }
                                                                            }}
                                                                            className="w-full bg-white border border-[#E2DFD7] hover:border-[#161616] p-2 text-xs text-[#161616] font-normal flex items-center justify-between transition rounded-none cursor-pointer"
                                                                        >
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <span 
                                                                                    className="w-4 h-4 rounded-none border border-black/20 shrink-0 shadow-xs" 
                                                                                    style={{ background: getColorPreview(v.color, undefined, availableColorOptions) }}
                                                                                />
                                                                                <span className="truncate font-sans font-medium text-[#161616]">
                                                                                    {v.color || 'Seleccionar Color'}
                                                                                </span>
                                                                            </div>
                                                                            <span className="material-symbols-outlined text-[16px] text-[#6B6862] shrink-0">
                                                                                {openColorDropdownIdx === idx ? 'expand_less' : 'expand_more'}
                                                                            </span>
                                                                        </button>
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
                                                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6862]">
                                                        {isDraftMode ? 'Cantidad Total a Pedir:' : 'Stock Total Calculado:'}
                                                    </span>
                                                    <span className="font-mono text-base font-bold text-[#D9381E]">
                                                        {variantList.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)} Unidades
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-5 border border-[#E2DFD7] space-y-4">
                                                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-3">
                                                    <div>
                                                        <h5 className="font-bold text-xs uppercase tracking-wider text-[#161616]">Control de Stock Único</h5>
                                                        <p className="text-[11px] text-[#6B6862]">Producto simple sin variantes de color.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setHasVariants(true)}
                                                        className="bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-[10px] font-bold py-2 px-3 rounded-none flex items-center gap-1 transition uppercase tracking-wider cursor-pointer"
                                                    >
                                                        <span className="material-symbols-outlined text-[14px] text-[#D9381E]">palette</span>
                                                        + Activar Variantes de Color
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">
                                                            {isDraftMode ? 'Cantidad a Pedir *' : 'Stock Disponible *'}
                                                        </label>
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
                                    <div className="flex items-center gap-2">
                                        {editingProduct && (
                                            <button 
                                                type="button"
                                                onClick={(e) => handleSubmit(e, false)}
                                                className="bg-[#D9381E] hover:bg-[#b82e18] text-white border-0 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-1.5 transition"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">save</span>
                                                Guardar Cambios
                                            </button>
                                        )}
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
                                                <label className="text-[11px] uppercase tracking-wider text-[#6B6862] font-semibold">Costo Unitario ($)</label>
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
                                        RESUMEN DE REGISTRO {isDraftMode ? '(BORRADOR ORDEN DE COMPRA)' : ''}
                                    </span>
                                    <p className="text-base font-bold text-[#161616]">{name || 'Montura / Producto Ejemplo'}</p>
                                    {brand && <p className="text-xs text-[#6B6862]">Marca: {brand}</p>}
                                    <div className="text-2xl font-serif text-[#D9381E] font-normal pt-1">
                                        {price ? formatPrice(price) : '$ 0 COP'}
                                    </div>
                                </div>

                                {/* Navegación Paso 3 (Guardar) */}
                                <div className="pt-6 border-t border-[#E2DFD7] flex justify-between items-center pb-4">
                                    <button
                                        type="button"
                                        onClick={() => setProductFormStep(productType === 'service' ? 1 : 2)}
                                        className="bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer flex items-center gap-1.5 transition"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                        Atrás
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={(e) => handleSubmit(e, false)}
                                            className="bg-[#161616] hover:bg-[#333333] text-white border-0 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer shadow-sm flex items-center gap-1.5 transition"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">save</span>
                                            {isDraftMode 
                                                ? 'Guardar Producto Borrador' 
                                                : (editingProduct ? 'Guardar Cambios' : 'Guardar Producto')}
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

            {/* Dropdown Flotante en Portal Sin Clipping (Z-Index alto) */}
            {openColorDropdownIdx !== null && colorDropdownCoords && (
                <>
                    <div 
                        className="fixed inset-0 z-[10008]" 
                        onClick={() => {
                            setOpenColorDropdownIdx(null);
                            setColorDropdownCoords(null);
                        }}
                    />
                    <div 
                        style={{
                            position: 'fixed',
                            top: `${colorDropdownCoords.top}px`,
                            left: `${colorDropdownCoords.left}px`,
                            width: `${colorDropdownCoords.width}px`,
                        }}
                        className="bg-[#F6F4EE] border border-[#161616] shadow-2xl z-[10009] animate-fade-in py-1 max-h-[260px] overflow-y-auto custom-scrollbar"
                    >
                        <div className="px-3 py-1.5 border-b border-[#E2DFD7] text-[10px] font-bold text-[#6B6862] uppercase tracking-wider">
                            COLORES DISPONIBLES
                        </div>
                        {availableColorOptions.map((opt, oIdx) => (
                            <button
                                key={oIdx}
                                type="button"
                                onClick={() => {
                                    const updated = [...variantList];
                                    if (updated[openColorDropdownIdx]) {
                                        updated[openColorDropdownIdx].color = opt.value;
                                        setVariantList(updated);
                                    }
                                    setOpenColorDropdownIdx(null);
                                    setColorDropdownCoords(null);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs font-medium cursor-pointer flex items-center gap-2.5 transition ${
                                    (variantList[openColorDropdownIdx]?.color || '').toLowerCase() === opt.value.toLowerCase()
                                        ? 'bg-[#161616] text-white'
                                        : 'text-[#161616] hover:bg-[#FAF8F5]'
                                }`}
                            >
                                <span 
                                    className="w-4 h-4 rounded-none border border-black/20 shrink-0 shadow-xs" 
                                    style={{ background: opt.preview }}
                                />
                                <span className="truncate">{opt.name}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                setCustomColorTargetIdx(openColorDropdownIdx);
                                setShowCustomColorModal(true);
                                setOpenColorDropdownIdx(null);
                                setColorDropdownCoords(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-[#D9381E] border-t border-[#E2DFD7] hover:bg-[#FAF8F5] cursor-pointer flex items-center gap-2 transition uppercase tracking-wider mt-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">palette</span>
                            + Crear / Personalizar Color
                        </button>
                    </div>
                </>
            )}
        </div>,
        document.body
    );
};
