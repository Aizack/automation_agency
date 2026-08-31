import React, { useState, useEffect } from 'react';

interface Product {
    id: string;
    name: string;
    price: string;
    cost_price?: string;
    stock: number;
    description?: string;
    sku?: string | null;
    category_id?: string;
    available_modifiers?: { name: string; price: number }[];
}

interface RecipeItem {
    id?: string;
    raw_product_id: string;
    raw_product_name: string;
    quantity_required: number;
    unit_of_measure: string;
    waste_percentage: number; // Merma Primaria (%)
    raw_cost: number;
}

interface RestaurantMenuBuilderProps {
    clientId: string;
}

export const RestaurantMenuBuilder: React.FC<RestaurantMenuBuilderProps> = ({ clientId }) => {
    const [dishes, setDishes] = useState<Product[]>([]);
    const [rawMaterials, setRawMaterials] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dishName, setDishName] = useState('');
    const [dishPrice, setDishPrice] = useState('');
    const [dishCategory, setDishCategory] = useState('Platos Fuertes');
    const [dishDescription, setDishDescription] = useState('');
    const [dishImageUrl, setDishImageUrl] = useState('');
    const [dishSopInstructions, setDishSopInstructions] = useState('');

    // Menu Categories Management State
    const [menuCategories, setMenuCategories] = useState<string[]>([
        'Entradas & Snacks',
        'Platos Fuertes',
        'Salchipapas & Comida Rápida',
        'Bebidas & Coctelería',
        'Postres & Dulces',
        'Adicionales & Acompañamientos'
    ]);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [newCatInput, setNewCatInput] = useState('');
    const [editingCatIdx, setEditingCatIdx] = useState<number | null>(null);
    const [editingCatName, setEditingCatName] = useState('');

    // Pre-configured Modifiers State
    const [availableModifiers, setAvailableModifiers] = useState<{ name: string; price: number }[]>([]);
    const [modName, setModName] = useState('');
    const [modPrice, setModPrice] = useState('');

    // AI Import Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiInputText, setAiInputText] = useState('');
    const [aiFileBase64, setAiFileBase64] = useState<string | null>(null);
    const [aiMimeType, setAiMimeType] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [selectedRawId, setSelectedRawId] = useState('');
    const [rawQty, setRawQty] = useState('');
    const [rawUnit, setRawUnit] = useState('gramos');

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, catRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/clients/${clientId}/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const prodData = await prodRes.json();
            if (prodData.success) {
                const allProds: Product[] = prodData.products || [];
                setDishes(allProds);
                setRawMaterials(allProds);
            }

            const catData = await catRes.json();
            if (catData.success && catData.categories && catData.categories.length > 0) {
                const fetchedNames: string[] = catData.categories.map((c: any) => c.name);
                // Combine default menu categories with fetched categories uniquely
                setMenuCategories(prev => Array.from(new Set([...prev, ...fetchedNames])));
            }
        } catch (err) {
            console.error("Error loading menu builder data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = () => {
        if (!newCatInput.trim()) return;
        const name = newCatInput.trim();
        if (!menuCategories.includes(name)) {
            setMenuCategories(prev => [...prev, name]);
            setDishCategory(name);
        }
        setNewCatInput('');
    };

    const handleSaveEditCategory = (index: number) => {
        if (!editingCatName.trim()) return;
        const updated = [...menuCategories];
        const oldName = updated[index];
        updated[index] = editingCatName.trim();
        setMenuCategories(updated);
        if (dishCategory === oldName) {
            setDishCategory(editingCatName.trim());
        }
        setEditingCatIdx(null);
        setEditingCatName('');
    };

    const handleDeleteCategory = (index: number) => {
        if (menuCategories.length <= 1) return;
        const nameToRemove = menuCategories[index];
        const updated = menuCategories.filter((_, i) => i !== index);
        setMenuCategories(updated);
        if (dishCategory === nameToRemove) {
            setDishCategory(updated[0]);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddIngredientToRecipe = () => {
        if (!selectedRawId || !rawQty) return;
        const rawProd = rawMaterials.find(p => p.id === selectedRawId);
        if (!rawProd) return;

        const qty = parseFloat(rawQty) || 0;
        const unitCost = parseFloat(rawProd.cost_price || '0');

        // Cálculo directo del costo según cantidad y unidad
        const baseCost = unitCost * (rawUnit === 'gramos' ? qty / 1000 : qty);

        setRecipeItems(prev => [
            ...prev,
            {
                raw_product_id: rawProd.id,
                raw_product_name: rawProd.name,
                quantity_required: qty,
                unit_of_measure: rawUnit,
                waste_percentage: 0,
                raw_cost: baseCost
            }
        ]);

        setSelectedRawId('');
        setRawQty('');
    };

    const handleRemoveIngredient = (index: number) => {
        setRecipeItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddModifier = () => {
        if (!modName.trim()) return;
        const p = parseFloat(modPrice) || 0;
        setAvailableModifiers(prev => [...prev, { name: modName.trim(), price: p }]);
        setModName('');
        setModPrice('');
    };

    const handleRemoveModifier = (index: number) => {
        setAvailableModifiers(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAiMimeType(file.type);
        const reader = new FileReader();
        reader.onloadend = () => {
            setAiFileBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleImportMenuAI = async () => {
        if (!aiInputText.trim() && !aiFileBase64) {
            alert("Ingresa un texto o selecciona una foto/PDF del menú.");
            return;
        }

        try {
            setAiLoading(true);
            const res = await fetch(`/api/clients/${clientId}/restaurant/import-menu-ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    textContent: aiInputText,
                    fileBase64: aiFileBase64,
                    mimeType: aiMimeType
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`🎉 ${data.message}`);
                setIsAiModalOpen(false);
                setAiInputText('');
                setAiFileBase64(null);
                setAiMimeType(null);
                fetchData();
            } else {
                alert(`Error al importar: ${data.error}`);
            }
        } catch (err) {
            console.error("Error importing menu:", err);
            alert("Error de conexión al importar el menú con IA.");
        } finally {
            setAiLoading(false);
        }
    };

    // Calcular Costo Total del Recetario BOM (Escandallo Financiero)
    const totalBomCost = recipeItems.reduce((sum, item) => sum + item.raw_cost, 0);
    const salePriceNum = parseFloat(dishPrice) || 0;
    const estimatedMargin = salePriceNum > 0 ? ((salePriceNum - totalBomCost) / salePriceNum) * 100 : 0;

    const handleSaveDish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dishName || !dishPrice) {
            alert("Por favor completa el nombre del plato y el precio de venta.");
            return;
        }

        try {
            setLoading(true);
            // 1. Crear el producto en el catálogo
            const prodRes = await fetch(`/api/clients/${clientId}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: dishName,
                    price: parseFloat(dishPrice),
                    cost_price: totalBomCost,
                    stock: 9999,
                    description: dishDescription,
                    available_modifiers: availableModifiers,
                    image_url: dishImageUrl
                })
            });

            const prodJson = await prodRes.json();
            if (prodJson.success && prodJson.product) {
                const createdProduct = prodJson.product;

                // 2. Guardar los ingredientes en product_recipes
                for (const item of recipeItems) {
                    await fetch(`/api/clients/${clientId}/restaurant/recipes`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            product_id: createdProduct.id,
                            raw_product_id: item.raw_product_id,
                            quantity_required: item.quantity_required,
                            unit_of_measure: item.unit_of_measure,
                            preparation_instructions: dishSopInstructions
                        })
                    });
                }

                alert(`✅ Plato '${dishName}' creado con sus adicionales e instructivo SOP de cocina.`);
                setIsModalOpen(false);
                // Reset Form
                setDishName('');
                setDishPrice('');
                setDishDescription('');
                setDishSopInstructions('');
                setRecipeItems([]);
                setAvailableModifiers([]);
                fetchData();
            } else {
                alert(`Error: ${prodJson.error}`);
            }
        } catch (err) {
            console.error("Error saving dish:", err);
            alert("Error de conexión al guardar el plato.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container/40 p-5 rounded-3xl border border-outline/10 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                        <span className="material-symbols-outlined text-[28px]">menu_book</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">Crear Menú & Recetario (Escandallo Financiero)</h2>
                        <p className="text-xs text-on-surface-variant">Configura platos, gramaje en crudo, merma primaria e instructivo secreto SOP</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsAiModalOpen(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-2xl hover:opacity-95 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-500/20 border border-purple-400/30"
                    >
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        ✨ Importar Menú con IA (PDF / Foto / Texto)
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:opacity-90 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Crear Nuevo Plato
                    </button>
                </div>
            </div>

            {/* Guía Explicativa del Gramaje & Escandallo */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-3xl text-xs space-y-1 text-amber-300">
                <h4 className="font-extrabold flex items-center gap-1.5 text-amber-200">
                    <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                    💡 Reglas Gastronómicas de Porcionado & Escandallo:
                </h4>
                <p className="opacity-90">
                    <strong>1. Peso en Carta:</strong> Corresponde al peso en <em>crudo limpio</em> tras la merma primaria. No se compensa físicamente en cocina.<br/>
                    <strong>2. Escandallo Financiero:</strong> La merma primaria (limpieza/hueso) se absorbe en el costo del insumo dentro de la ficha técnica para proteger el margen del restaurante.
                </p>
            </div>

            {/* Catálogo Actual de Platos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dishes.map((dish) => {
                    const costNum = parseFloat(dish.cost_price || '0');
                    const priceNum = parseFloat(dish.price || '0');
                    const margin = priceNum > 0 ? ((priceNum - costNum) / priceNum) * 100 : 0;
                    const mods = dish.available_modifiers || [];
                    return (
                        <div key={dish.id} className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3 shadow-md hover:border-primary/30 transition flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                                    <div>
                                        <h3 className="font-extrabold text-on-surface text-sm">{dish.name}</h3>
                                        <span className="text-[11px] text-on-surface-variant">Menú Comercial</span>
                                    </div>
                                    <span className="font-black text-primary text-sm">${priceNum.toLocaleString()} COP</span>
                                </div>

                                {dish.description && (
                                    <p className="text-xs text-on-surface-variant line-clamp-2">{dish.description}</p>
                                )}

                                <div className="grid grid-cols-2 gap-2 text-xs bg-surface/40 p-2.5 rounded-2xl border border-outline/5">
                                    <div>
                                        <span className="text-on-surface-variant block text-[10px]">Costo Escandallo:</span>
                                        <strong className="text-on-surface">${costNum.toLocaleString()}</strong>
                                    </div>
                                    <div>
                                        <span className="text-on-surface-variant block text-[10px]">Margen Estimado:</span>
                                        <strong className={margin >= 40 ? 'text-emerald-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                                            {margin.toFixed(1)}%
                                        </strong>
                                    </div>
                                </div>

                                {mods.length > 0 && (
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-on-surface-variant uppercase">Adicionales Configurados ({mods.length}):</span>
                                        <div className="flex flex-wrap gap-1">
                                            {mods.map((m, i) => (
                                                <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                                    +{m.name} (${m.price.toLocaleString()})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {dish.sku && <p className="text-[11px] text-on-surface-variant/70 italic pt-1">SKU/Código: {dish.sku}</p>}
                        </div>
                    );
                })}
            </div>

            {/* Modal para Importación de Menú con IA */}
            {isAiModalOpen && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-surface-container border border-outline/20 w-full max-w-xl rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-400">auto_awesome</span>
                                ✨ Importar Carta / Menú con IA
                            </h3>
                            <button type="button" onClick={() => setIsAiModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <p className="text-on-surface-variant">
                                Sube la <strong>foto de tu carta física</strong>, archivo <strong>PDF</strong> o <strong>pega el texto</strong> del menú. La IA extraerá automáticamente todos los platos, precios, descripciones y sugerencias de adicionales.
                            </p>

                            {/* Opción 1: Archivo Imagen o PDF */}
                            <div className="space-y-1">
                                <label className="font-bold text-on-surface">Opción 1: Subir Foto de la Carta o PDF</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={handleFileUpload}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none cursor-pointer"
                                />
                                {aiFileBase64 && (
                                    <p className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Archivo cargado listo para análisis con IA
                                    </p>
                                )}
                            </div>

                            {/* Opción 2: Texto Copiado */}
                            <div className="space-y-1">
                                <label className="font-bold text-on-surface">Opción 2: Pegar Texto de la Carta</label>
                                <textarea
                                    rows={5}
                                    placeholder="Ej: Hamburguesa Angus - $32.000 COP (150g carne, queso cheddar)\nSalchipapa Costeña - $10.000 COP..."
                                    value={aiInputText}
                                    onChange={(e) => setAiInputText(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-3 text-xs text-on-surface outline-none focus:border-purple-500 font-mono"
                                />
                            </div>

                            <button
                                type="button"
                                disabled={aiLoading}
                                onClick={handleImportMenuAI}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl hover:opacity-90 shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">psychology</span>
                                {aiLoading ? 'Analizando Menú con IA de Gemini...' : 'Procesar e Importar Menú de Inmediato'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Crear/Editar Plato del Menú */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="bg-surface-container border border-outline/20 w-full max-w-2xl rounded-3xl p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
                                <span>🍽️</span> Crear Plato del Menú & Recetario (BOM)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="w-9 h-9 bg-surface hover:bg-rose-500/20 border border-outline/20 hover:border-rose-500/40 rounded-full text-on-surface hover:text-rose-400 transition cursor-pointer flex items-center justify-center shadow shrink-0"
                                title="Cerrar ventana"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveDish} className="space-y-5">
                            {/* Información Básica */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2 space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Nombre del Plato *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Bife de Chorizo 300g"
                                        value={dishName}
                                        onChange={(e) => setDishName(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Precio de Venta ($ COP) *</label>
                                    <input
                                        type="number"
                                        placeholder="45000"
                                        value={dishPrice}
                                        onChange={(e) => setDishPrice(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-bold text-primary"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Categoría, Foto & Descripción */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-on-surface-variant">Categoría del Menú</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsCatModalOpen(true)}
                                            className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">settings</span>
                                            Editar Categorías
                                        </button>
                                    </div>
                                    <select
                                        value={dishCategory}
                                        onChange={(e) => setDishCategory(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer font-semibold"
                                    >
                                        {menuCategories.map((cat, idx) => (
                                            <option key={idx} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Foto del Plato (URL)</label>
                                    <input
                                        type="url"
                                        placeholder="https://.../foto.jpg"
                                        value={dishImageUrl}
                                        onChange={(e) => setDishImageUrl(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Descripción Breve</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Papa crujiente, salchicha picada..."
                                        value={dishDescription}
                                        onChange={(e) => setDishDescription(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Adicionales Pre-configurados por Plato */}
                            <div className="space-y-2 bg-surface/50 border border-outline/10 p-4 rounded-2xl">
                                <h4 className="text-xs font-extrabold text-emerald-400 uppercase flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                    Adicionales Pre-configurados para este Plato (Con Costo Extra)
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nombre (Ej: Queso costeño)"
                                        value={modName}
                                        onChange={(e) => setModName(e.target.value)}
                                        className="col-span-2 bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Precio ($)"
                                        value={modPrice}
                                        onChange={(e) => setModPrice(e.target.value)}
                                        className="bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddModifier}
                                    className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs rounded-xl transition cursor-pointer border border-emerald-500/30"
                                >
                                    + Agregar Adicional Configurado
                                </button>
                                {availableModifiers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {availableModifiers.map((mod, index) => (
                                            <span key={index} className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1">
                                                ➕ {mod.name} (+${mod.price.toLocaleString()} COP)
                                                <button type="button" onClick={() => handleRemoveModifier(index)} className="text-rose-400 hover:text-rose-300 ml-1">✕</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Configuración de Insumos / Gramajes & Merma (BOM) */}
                            <div className="space-y-3 bg-surface/50 border border-outline/10 p-4 rounded-2xl">
                                <h4 className="text-xs font-extrabold text-primary uppercase flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                                    Insumos del Inventario
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                                    <div className="sm:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-on-surface-variant block">Seleccionar Insumo</label>
                                        <select
                                            value={selectedRawId}
                                            onChange={(e) => setSelectedRawId(e.target.value)}
                                            className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                                        >
                                            <option value="">-- Insumo de Bodega --</option>
                                            {rawMaterials.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} (${parseFloat(m.cost_price || '0').toLocaleString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-on-surface-variant block">Cantidad/Gramaje</label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 300"
                                            value={rawQty}
                                            onChange={(e) => setRawQty(e.target.value)}
                                            className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-on-surface-variant block">Unidad Medida</label>
                                        <select
                                            value={rawUnit}
                                            onChange={(e) => setRawUnit(e.target.value)}
                                            className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                                        >
                                            <option value="gramos">Gramos (g)</option>
                                            <option value="ml">Mililitros (ml)</option>
                                            <option value="unidades">Unidades</option>
                                        </select>
                                    </div>

                                    <div className="sm:col-span-1">
                                        <button
                                            type="button"
                                            onClick={handleAddIngredientToRecipe}
                                            disabled={!selectedRawId || !rawQty}
                                            className={`w-full py-2 px-3 font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow ${
                                                selectedRawId && rawQty
                                                    ? 'bg-primary text-on-primary hover:opacity-90 border border-primary/30'
                                                    : 'bg-surface-variant/40 text-on-surface-variant/40 cursor-not-allowed border border-outline/10'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                            + Agregar Insumo
                                        </button>
                                    </div>
                                </div>

                                {/* Tabla de Insumos Agregados */}
                                {recipeItems.length > 0 && (
                                    <div className="space-y-1 pt-2">
                                        <div className="text-[11px] font-bold text-on-surface-variant flex justify-between px-1">
                                            <span>Insumo</span>
                                            <span>Cantidad / Costo Calculado</span>
                                        </div>
                                        {recipeItems.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between bg-surface p-2 rounded-xl text-xs border border-outline/5">
                                                <span>{item.raw_product_name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-primary">
                                                        {item.quantity_required} {item.unit_of_measure}
                                                    </span>
                                                    <span className="font-bold text-on-surface">${Math.round(item.raw_cost).toLocaleString()}</span>
                                                    <button type="button" onClick={() => handleRemoveIngredient(index)} className="text-rose-400 hover:text-rose-300">
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Instructivo Técnico SOP para Cocina */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-amber-400">Instructivo Técnico SOP de Preparación (Secret Recipe):</label>
                                <textarea
                                    rows={3}
                                    placeholder="Paso 1: Sazonar la carne en crudo... Paso 2: Sellar a alta temperatura..."
                                    value={dishSopInstructions}
                                    onChange={(e) => setDishSopInstructions(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-mono"
                                />
                            </div>

                            {/* Resumen de Margen */}
                            <div className="flex items-center justify-between bg-surface-container/60 p-4 rounded-2xl border border-outline/10 text-xs">
                                <div>
                                    <span className="text-on-surface-variant block">Costo Escandallo Financiero:</span>
                                    <strong className="text-on-surface text-sm">${Math.round(totalBomCost).toLocaleString()} COP</strong>
                                </div>
                                <div className="text-right">
                                    <span className="text-on-surface-variant block">Margen Neto de Ganancia:</span>
                                    <strong className={`text-sm font-extrabold ${estimatedMargin >= 40 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {estimatedMargin.toFixed(1)}%
                                    </strong>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3.5 bg-surface hover:bg-surface-variant border border-outline/20 text-on-surface font-bold text-xs rounded-2xl transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3.5 bg-primary text-on-primary font-extrabold text-xs rounded-2xl hover:opacity-90 shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                    {loading ? 'Guardando...' : 'Guardar Plato & Escandallo BOM'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Gestión y Edición de Categorías del Menú */}
            {isCatModalOpen && (
                <div
                    className="fixed inset-0 z-[10000] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setIsCatModalOpen(false)}
                >
                    <div
                        className="bg-surface-container border border-outline/20 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">category</span>
                                Administrar Categorías del Menú
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsCatModalOpen(false)}
                                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Nueva Categoría */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nombre de nueva categoría..."
                                value={newCatInput}
                                onChange={(e) => setNewCatInput(e.target.value)}
                                className="flex-1 bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                            />
                            <button
                                type="button"
                                onClick={handleAddCategory}
                                className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 transition cursor-pointer shrink-0"
                            >
                                + Crear
                            </button>
                        </div>

                        {/* Lista de Categorías Existentes */}
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pt-2">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Categorías Existentes ({menuCategories.length})</label>
                            {menuCategories.map((cat, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-surface p-2.5 rounded-xl border border-outline/10 text-xs">
                                    {editingCatIdx === idx ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <input
                                                type="text"
                                                value={editingCatName}
                                                onChange={(e) => setEditingCatName(e.target.value)}
                                                className="flex-1 bg-surface-container border border-primary rounded-lg p-1.5 text-xs text-on-surface outline-none"
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveEditCategory(idx)}
                                                className="text-emerald-400 font-bold hover:text-emerald-300 px-2"
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingCatIdx(null)}
                                                className="text-on-surface-variant hover:text-on-surface"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-semibold text-on-surface">{cat}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingCatIdx(idx);
                                                        setEditingCatName(cat);
                                                    }}
                                                    className="p-1 text-on-surface-variant hover:text-primary transition"
                                                    title="Editar nombre"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                                </button>
                                                {menuCategories.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCategory(idx)}
                                                        className="p-1 text-on-surface-variant hover:text-rose-400 transition"
                                                        title="Eliminar categoría"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-outline/10 text-right">
                            <button
                                type="button"
                                onClick={() => setIsCatModalOpen(false)}
                                className="px-5 py-2 bg-surface hover:bg-surface-variant border border-outline/20 text-on-surface font-bold text-xs rounded-xl cursor-pointer"
                            >
                                Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
