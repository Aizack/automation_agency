import React, { useState, useEffect } from 'react';

interface RawMaterial {
    id: string;
    name: string;
    category: string;
    purchase_unit: string;
    purchase_unit_cost: number;
    conversion_factor_to_consumption: number;
    consumption_unit: string;
    stock_in_consumption_units: number;
    min_stock_alert: number;
    supplier_name?: string;
}

interface RawMaterialsInventoryProps {
    clientId: string;
}

export const RawMaterialsInventory: React.FC<RawMaterialsInventoryProps> = ({ clientId }) => {
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [loading, setLoading] = useState(false);

    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Verduras');
    const [purchaseUnit, setPurchaseUnit] = useState('bulto_50kg');
    const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
    const [purchaseQuantity, setPurchaseQuantity] = useState('1');
    const [minStockAlert, setMinStockAlert] = useState('1000');
    const [supplierName, setSupplierName] = useState('');

    const token = localStorage.getItem('auth_token');

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/raw-materials`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setMaterials(data.raw_materials || []);
        } catch (err) {
            console.error("Error loading raw materials:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, []);

    // Determinar factor de conversión y unidad de consumo según la unidad de compra seleccionada
    const getConversionPreset = (unitKey: string) => {
        switch (unitKey) {
            case 'bulto_50kg':
                return { factor: 50000, consumptionUnit: 'g', label: 'Bulto de 50 kg (50.000 g)' };
            case 'bulto_25kg':
                return { factor: 25000, consumptionUnit: 'g', label: 'Bulto de 25 kg (25.000 g)' };
            case 'kg':
                return { factor: 1000, consumptionUnit: 'g', label: 'Kilogramo (1.000 g)' };
            case 'libra':
                return { factor: 454, consumptionUnit: 'g', label: 'Libra (454 g)' };
            case 'garrafa_20l':
                return { factor: 20000, consumptionUnit: 'ml', label: 'Garrafa de 20 Litros (20.000 ml)' };
            case 'litro':
                return { factor: 1000, consumptionUnit: 'ml', label: 'Litro (1.000 ml)' };
            case 'caja_24':
                return { factor: 24, consumptionUnit: 'unid', label: 'Caja de 24 Unidades' };
            case 'unidad':
            default:
                return { factor: 1, consumptionUnit: 'unid', label: 'Unidad Individual' };
        }
    };

    const preset = getConversionPreset(purchaseUnit);
    const unitCostNum = parseFloat(purchaseUnitCost) || 0;
    const qtyPurchasedNum = parseFloat(purchaseQuantity) || 0;

    const totalStockAdded = qtyPurchasedNum * preset.factor;
    const costPerConsumptionUnit = preset.factor > 0 ? unitCostNum / preset.factor : 0;
    const costPerKgOrLiter = preset.consumptionUnit === 'g' ? costPerConsumptionUnit * 1000 : costPerConsumptionUnit * 1000;

    const handleSaveMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !purchaseUnitCost) {
            alert("Por favor ingresa el nombre del ingrediente y el costo de compra.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/raw-materials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    category,
                    purchase_unit: preset.label,
                    purchase_unit_cost: unitCostNum,
                    conversion_factor_to_consumption: preset.factor,
                    consumption_unit: preset.consumptionUnit,
                    stock_in_consumption_units: totalStockAdded,
                    min_stock_alert: parseFloat(minStockAlert) || 1000,
                    supplier_name: supplierName
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ Insumo '${name}' registrado con stock de ${totalStockAdded.toLocaleString()} ${preset.consumptionUnit}.`);
                setIsModalOpen(false);
                setName('');
                setPurchaseUnitCost('');
                setSupplierName('');
                fetchMaterials();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error("Error saving raw material:", err);
            alert("Error al guardar ingrediente.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMaterial = async (id: string) => {
        if (!confirm("¿Seguro de eliminar este insumo de la bodega?")) return;
        try {
            setLoading(true);
            await fetch(`/api/clients/${clientId}/raw-materials/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchMaterials();
        } catch (err) {
            console.error("Error deleting material:", err);
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
                        <span className="material-symbols-outlined text-[28px]">inventory</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-on-surface">Inventario de Insumos & Materias Primas</h2>
                        <p className="text-xs text-on-surface-variant">Control de bodega para ingredientes, conversiones (Bulto/Kg/Lb ➔ Gramos/ML) y mermas</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:opacity-90 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <span className="material-symbols-outlined text-[18px]">add_box</span>
                    Registrar Nuevo Insumo / Materia Prima
                </button>
            </div>

            {/* Banner Informativo */}
            <div className="bg-surface-container/30 border border-outline/10 p-4 rounded-3xl text-xs space-y-1 text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[28px]">scale</span>
                <div>
                    <strong className="text-on-surface block font-bold">Conversión Transparente de Compra a Consumo:</strong>
                    <span>Registras tus compras por Bulto, Kilo o Libra y el ERP calcula automáticamente el costo por gramo/mililitro para deducirlo de bodega en cada plato vendido.</span>
                </div>
            </div>

            {/* Grilla de Insumos */}
            {materials.length === 0 ? (
                <div className="text-center py-12 bg-surface-container/20 border border-dashed border-outline/20 rounded-3xl space-y-3">
                    <p className="text-on-surface-variant text-sm">No hay insumos o materias primas registradas en bodega.</p>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 transition cursor-pointer"
                    >
                        + Registrar Primer Insumo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {materials.map(mat => {
                        const stockNum = Number(mat.stock_in_consumption_units);
                        const minAlertNum = Number(mat.min_stock_alert);
                        const factor = Number(mat.conversion_factor_to_consumption) || 1;
                        const unitCost = Number(mat.purchase_unit_cost) || 0;
                        const costPerGram = factor > 0 ? unitCost / factor : 0;
                        const isLowStock = stockNum <= minAlertNum;

                        return (
                            <div key={mat.id} className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3 shadow-md hover:border-primary/30 transition flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between border-b border-outline/10 pb-2">
                                        <div>
                                            <h3 className="font-extrabold text-on-surface text-sm">{mat.name}</h3>
                                            <span className="text-[11px] text-on-surface-variant">{mat.category}</span>
                                        </div>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isLowStock ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                                            {isLowStock ? '⚠️ Stock Bajo' : '🟢 Stock OK'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs bg-surface/40 p-2.5 rounded-2xl border border-outline/5">
                                        <div>
                                            <span className="text-on-surface-variant block text-[10px]">Costo Compra:</span>
                                            <strong className="text-on-surface">${unitCost.toLocaleString()} COP</strong>
                                            <span className="text-[10px] opacity-75 block">({mat.purchase_unit})</span>
                                        </div>
                                        <div>
                                            <span className="text-on-surface-variant block text-[10px]">Costo por {mat.consumption_unit}:</span>
                                            <strong className="text-primary font-bold">${costPerGram.toFixed(2)} COP/{mat.consumption_unit}</strong>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-1">
                                        <span className="text-on-surface-variant">Stock Disponible:</span>
                                        <strong className="text-on-surface font-mono font-bold text-sm">
                                            {stockNum >= 1000 && mat.consumption_unit === 'g'
                                                ? `${(stockNum / 1000).toFixed(2)} kg (${stockNum.toLocaleString()} g)`
                                                : `${stockNum.toLocaleString()} ${mat.consumption_unit}`}
                                        </strong>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-outline/10 pt-3 text-xs">
                                    <span className="text-on-surface-variant text-[11px] italic">
                                        {mat.supplier_name ? `Proveedor: ${mat.supplier_name}` : 'Sin proveedor asignado'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMaterial(mat.id)}
                                        className="text-rose-400 hover:text-rose-300 transition p-1"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Registrar Insumo */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-surface-container border border-outline/20 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
                                <span>🥦</span> Registrar Insumo / Materia Prima
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSaveMaterial} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Nombre del Insumo *</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Papa Sabanera, Carne Angus"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Categoría</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer"
                                    >
                                        <option value="Verduras & Vegetales">Verduras & Vegetales</option>
                                        <option value="Carnes & Aves">Carnes & Aves</option>
                                        <option value="Lácteos & Quesos">Lácteos & Quesos</option>
                                        <option value="Abarrotes & Aceites">Abarrotes & Aceites</option>
                                        <option value="Bebidas & Licores">Bebidas & Licores</option>
                                        <option value="Empaques & Desechables">Empaques & Desechables</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant">Unidad de Medida de Compra</label>
                                <select
                                    value={purchaseUnit}
                                    onChange={(e) => setPurchaseUnit(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-semibold cursor-pointer"
                                >
                                    <option value="bulto_50kg">📦 Bulto de 50 Kilogramos (50.000 g)</option>
                                    <option value="bulto_25kg">📦 Bulto de 25 Kilogramos (25.000 g)</option>
                                    <option value="kg">⚖️ Kilogramo (1.000 g)</option>
                                    <option value="libra">⚖️ Libra (454 g)</option>
                                    <option value="garrafa_20l">🛢️ Garrafa de 20 Litros (20.000 ml)</option>
                                    <option value="litro">🥛 Litro (1.000 ml)</option>
                                    <option value="caja_24">📦 Caja de 24 Unidades</option>
                                    <option value="unidad">🧃 Unidad Individual</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Costo por Unidad de Compra ($ COP) *</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 100000"
                                        value={purchaseUnitCost}
                                        onChange={(e) => setPurchaseUnitCost(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface font-bold text-primary outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Cantidad Comprada</label>
                                    <input
                                        type="number"
                                        placeholder="1"
                                        value={purchaseQuantity}
                                        onChange={(e) => setPurchaseQuantity(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* Resumen de Conversión en Tiempo Real */}
                            <div className="bg-surface/60 border border-outline/10 p-3 rounded-2xl space-y-1 text-xs">
                                <div className="flex justify-between font-bold">
                                    <span className="text-on-surface-variant">Conversión a Consumo:</span>
                                    <span className="text-primary font-bold">
                                        +{totalStockAdded.toLocaleString()} {preset.consumptionUnit}
                                    </span>
                                </div>
                                <div className="flex justify-between text-[11px] text-on-surface-variant/80">
                                    <span>Costo Unitario Calculado:</span>
                                    <span>${costPerConsumptionUnit.toFixed(2)} COP por {preset.consumptionUnit} (${Math.round(costPerKgOrLiter).toLocaleString()} COP/kg)</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Alerta Stock Mínimo ({preset.consumptionUnit})</label>
                                    <input
                                        type="number"
                                        placeholder="1000"
                                        value={minStockAlert}
                                        onChange={(e) => setMinStockAlert(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Proveedor (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Distribuidora Central"
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-primary text-on-primary font-extrabold text-xs rounded-2xl hover:opacity-90 shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {loading ? 'Guardando...' : 'Guardar Insumo en Bodega'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
