import React, { useState, useEffect } from 'react';

interface Product {
    id: string;
    name: string;
    price: string;
    cost_price?: string;
    stock: number;
    sku?: string | null;
    category_id?: string;
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
    const [dishSopInstructions, setDishSopInstructions] = useState('');

    // Recipe BOM items for the dish being created/edited
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [selectedRawId, setSelectedRawId] = useState('');
    const [rawQty, setRawQty] = useState('');
    const [rawUnit, setRawUnit] = useState('gramos');
    const [rawWaste, setRawWaste] = useState('0'); // Merma primaria por defecto 0%

    const token = localStorage.getItem('auth_token');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes] = await Promise.all([
                fetch(`/api/clients/${clientId}/products`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const prodData = await prodRes.json();
            if (prodData.success) {
                const allProds: Product[] = prodData.products || [];
                setDishes(allProds);
                setRawMaterials(allProds);
            }
        } catch (err) {
            console.error("Error loading menu builder data:", err);
        } finally {
            setLoading(false);
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
        const wastePct = parseFloat(rawWaste) || 0;
        const unitCost = parseFloat(rawProd.cost_price || '0');

        // Cálculo del costo base
        const baseCost = unitCost * (rawUnit === 'gramos' ? qty / 1000 : qty);
        // Ajuste del costo financiero por Merma Primaria en crudo
        const adjustedCost = wastePct > 0 && wastePct < 100 ? baseCost / (1 - wastePct / 100) : baseCost;

        setRecipeItems(prev => [
            ...prev,
            {
                raw_product_id: rawProd.id,
                raw_product_name: rawProd.name,
                quantity_required: qty,
                unit_of_measure: rawUnit,
                waste_percentage: wastePct,
                raw_cost: adjustedCost
            }
        ]);

        setSelectedRawId('');
        setRawQty('');
        setRawWaste('0');
    };

    const handleRemoveIngredient = (index: number) => {
        setRecipeItems(prev => prev.filter((_, i) => i !== index));
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
                    description: dishDescription
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

                alert(`✅ Plato '${dishName}' creado con su recetario e instructivo SOP de cocina.`);
                setIsModalOpen(false);
                // Reset Form
                setDishName('');
                setDishPrice('');
                setDishDescription('');
                setDishSopInstructions('');
                setRecipeItems([]);
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

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:opacity-90 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Crear Nuevo Plato del Menú
                </button>
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
                    return (
                        <div key={dish.id} className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3 shadow-md hover:border-primary/30 transition">
                            <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                                <div>
                                    <h3 className="font-extrabold text-on-surface text-sm">{dish.name}</h3>
                                    <span className="text-[11px] text-on-surface-variant">Menú Comercial</span>
                                </div>
                                <span className="font-black text-primary text-sm">${priceNum.toLocaleString()} COP</span>
                            </div>

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

                            {dish.sku && <p className="text-[11px] text-on-surface-variant/70 italic">SKU/Código: {dish.sku}</p>}
                        </div>
                    );
                })}
            </div>

            {/* Modal para Crear/Editar Plato del Menú */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-surface-container border border-outline/20 w-full max-w-2xl rounded-3xl p-6 space-y-6 shadow-2xl my-8">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
                                <span>🍽️</span> Crear Plato del Menú & Recetario (BOM)
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
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

                            {/* Categoría & Descripción */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Categoría del Menú</label>
                                    <select
                                        value={dishCategory}
                                        onChange={(e) => setDishCategory(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                                    >
                                        <option value="Entradas">Entradas & Snacks</option>
                                        <option value="Platos Fuertes">Platos Fuertes</option>
                                        <option value="Bebidas">Bebidas & Coctelería</option>
                                        <option value="Postres">Postres & Dulces</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Descripción Breve</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Corte magro de res 300g en crudo, acompañado de papas..."
                                        value={dishDescription}
                                        onChange={(e) => setDishDescription(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Configuración de Insumos / Gramajes & Merma (BOM) */}
                            <div className="space-y-3 bg-surface/50 border border-outline/10 p-4 rounded-2xl">
                                <h4 className="text-xs font-extrabold text-primary uppercase flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">scale</span>
                                    Insumos, Gramaje & Merma Primaria (Escandallo)
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                    <select
                                        value={selectedRawId}
                                        onChange={(e) => setSelectedRawId(e.target.value)}
                                        className="sm:col-span-2 bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                                    >
                                        <option value="">-- Insumo de Bodega --</option>
                                        {rawMaterials.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} (${parseFloat(m.cost_price || '0').toLocaleString()})
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="Gramaje (Ej: 300)"
                                        value={rawQty}
                                        onChange={(e) => setRawQty(e.target.value)}
                                        className="bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                    />

                                    <select
                                        value={rawUnit}
                                        onChange={(e) => setRawUnit(e.target.value)}
                                        className="bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                                    >
                                        <option value="gramos">Gramos (g)</option>
                                        <option value="ml">Mililitros (ml)</option>
                                        <option value="unidades">Unidades</option>
                                    </select>

                                    <input
                                        type="number"
                                        placeholder="Merma % (Ej: 15)"
                                        value={rawWaste}
                                        onChange={(e) => setRawWaste(e.target.value)}
                                        className="bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddIngredientToRecipe}
                                    className="w-full py-1.5 bg-surface-variant text-on-surface font-bold text-xs rounded-xl hover:bg-surface-variant/80 transition"
                                >
                                    + Agregar Insumo con Merma al Escandallo
                                </button>

                                {/* Tabla de Insumos Agregados */}
                                {recipeItems.length > 0 && (
                                    <div className="space-y-1 pt-2">
                                        <div className="text-[11px] font-bold text-on-surface-variant flex justify-between px-1">
                                            <span>Insumo</span>
                                            <span>Cantidad / Merma / Costo Ajustado</span>
                                        </div>
                                        {recipeItems.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between bg-surface p-2 rounded-xl text-xs border border-outline/5">
                                                <span>{item.raw_product_name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-primary">
                                                        {item.quantity_required} {item.unit_of_measure} {item.waste_percentage > 0 ? `(Merma: ${item.waste_percentage}%)` : ''}
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

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-primary text-on-primary font-extrabold text-xs rounded-2xl hover:opacity-90 shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {loading ? 'Guardando...' : 'Guardar Plato & Escandallo BOM'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
