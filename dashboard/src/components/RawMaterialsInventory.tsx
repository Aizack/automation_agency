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
    expiration_date?: string;
    batch_number?: string;
    is_casual_purchase?: boolean;
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
    const [category, setCategory] = useState('Panadería, Harinas & Masa');
    const [purchaseUnit, setPurchaseUnit] = useState('unidad');
    const [purchaseUnitCost, setPurchaseUnitCost] = useState('');
    const [purchaseQuantity, setPurchaseQuantity] = useState('1');
    const [minStockAlert, setMinStockAlert] = useState('1000');
    const [expirationDate, setExpirationDate] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [isCasualPurchase, setIsCasualPurchase] = useState(false);
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

    // Determinar factor de conversión y unidad de consumo ordenados de sencillo a mayor
    const getConversionPreset = (unitKey: string) => {
        switch (unitKey) {
            case 'unidad':
                return { factor: 1, consumptionUnit: 'unid', label: 'Unidad Individual (1 unid)' };
            case 'libra':
                return { factor: 454, consumptionUnit: 'g', label: 'Libra (454 g)' };
            case 'kg':
                return { factor: 1000, consumptionUnit: 'g', label: 'Kilogramo (1.000 g)' };
            case 'litro':
                return { factor: 1000, consumptionUnit: 'ml', label: 'Litro (1.000 ml)' };
            case 'caja_24':
                return { factor: 24, consumptionUnit: 'unid', label: 'Caja de 24 Unidades' };
            case 'garrafa_20l':
                return { factor: 20000, consumptionUnit: 'ml', label: 'Garrafa de 20 Litros (20.000 ml)' };
            case 'bulto_25kg':
                return { factor: 25000, consumptionUnit: 'g', label: 'Bulto / Saco de 25 kg (25.000 g)' };
            case 'bulto_50kg':
                return { factor: 50000, consumptionUnit: 'g', label: 'Bulto / Saco de 50 kg (50.000 g)' };
            default:
                return { factor: 1, consumptionUnit: 'unid', label: 'Unidad Individual (1 unid)' };
        }
    };

    const preset = getConversionPreset(purchaseUnit);
    const unitCostNum = parseFloat(purchaseUnitCost) || 0;
    const qtyPurchasedNum = parseFloat(purchaseQuantity) || 1;

    const totalStockAdded = qtyPurchasedNum * preset.factor;
    const totalPurchaseSpend = unitCostNum * qtyPurchasedNum;
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
                    expiration_date: expirationDate || null,
                    batch_number: batchNumber || null,
                    is_casual_purchase: isCasualPurchase,
                    supplier_name: isCasualPurchase ? (supplierName || 'Compra Ocasional Caja Menor') : supplierName
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ ${isCasualPurchase ? '⚡ Compra Ocasional de Caja Menor' : 'Insumo'} '${name}' registrado con stock de ${totalStockAdded.toLocaleString()} ${preset.consumptionUnit}.`);
                setIsModalOpen(false);
                setName('');
                setPurchaseUnitCost('');
                setSupplierName('');
                setExpirationDate('');
                setBatchNumber('');
                setIsCasualPurchase(false);
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

    // Helper de Estado de Vencimiento
    const getExpirationStatus = (expDateStr?: string) => {
        if (!expDateStr) return null;
        const expDate = new Date(expDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { label: `🔴 Vencido hace ${Math.abs(diffDays)}d`, color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
        } else if (diffDays <= 5) {
            return { label: `🟡 Vence en ${diffDays}d (Revisar FIFO)`, color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
        }
        return { label: `🟢 Vence: ${expDate.toLocaleDateString()}`, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
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
                        <p className="text-xs text-on-surface-variant">Bodega interna de cocina: Harinas, carnes frías, salchichas, vencimientos y compras de caja menor</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setIsCasualPurchase(true);
                            setSupplierName('Caja Menor / Compra Ocasional');
                            setIsModalOpen(true);
                        }}
                        className="px-3.5 py-2.5 bg-amber-500/20 text-amber-300 font-bold text-xs rounded-2xl border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer flex items-center gap-1.5"
                    >
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                        + Compra Ocasional / Caja Menor
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsCasualPurchase(false);
                            setSupplierName('');
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-2xl hover:opacity-90 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-[18px]">add_box</span>
                        Registrar Insumo Regular
                    </button>
                </div>
            </div>

            {/* Banner Informativo sobre Rotación PEPS / FIFO */}
            <div className="bg-surface-container/30 border border-outline/10 p-4 rounded-3xl text-xs space-y-1 text-on-surface-variant flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[28px]">published_with_changes</span>
                <div>
                    <strong className="text-on-surface block font-bold">Rotación de Inventario FIFO / PEPS (Primeras en Entrar, Primeras en Salir):</strong>
                    <span>Las materias primas con fechas de vencimiento más próximas deben usarse primero en cocina para evitar mermas térmicas o pérdidas de insumos.</span>
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
                        const expStatus = getExpirationStatus(mat.expiration_date);

                        return (
                            <div key={mat.id} className="bg-surface-container/30 border border-outline/10 p-5 rounded-3xl space-y-3 shadow-md hover:border-primary/30 transition flex flex-col justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between border-b border-outline/10 pb-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-extrabold text-on-surface text-sm">{mat.name}</h3>
                                                {mat.is_casual_purchase && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Compra Ocasional / Caja Menor">
                                                        ⚡ Caja Menor
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-on-surface-variant">{mat.category}</span>
                                        </div>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${isLowStock ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                                            {isLowStock ? '⚠️ Stock Bajo' : '🟢 Stock OK'}
                                        </span>
                                    </div>

                                    {/* Alerta de Vencimiento */}
                                    {expStatus && (
                                        <div className={`text-[11px] font-bold px-3 py-1 rounded-xl border flex items-center justify-between ${expStatus.color}`}>
                                            <span>{expStatus.label}</span>
                                            {mat.batch_number && <span className="text-[9px] opacity-80">Lote: {mat.batch_number}</span>}
                                        </div>
                                    )}

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

            {/* Modal Registrar Insumo / Compra Ocasional */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] backdrop-blur-sm bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-surface-container border border-outline/20 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between border-b border-outline/10 pb-3">
                            <h3 className="font-extrabold text-on-surface text-base flex items-center gap-2">
                                <span>{isCasualPurchase ? '⚡' : '🥦'}</span>
                                {isCasualPurchase ? 'Registrar Compra Ocasional (Caja Menor / Emergencia)' : 'Registrar Insumo / Materia Prima'}
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
                                        placeholder="Ej: Harina de Trigo, Salchichas, Queso"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Categoría Gastronómica</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary cursor-pointer font-semibold"
                                    >
                                        <option value="Panadería, Harinas & Masa">Panadería, Harinas & Masa</option>
                                        <option value="Embutidos, Salchichas & Charcutería">Embutidos, Salchichas & Charcutería</option>
                                        <option value="Carnes & Aves">Carnes & Aves</option>
                                        <option value="Pescados & Mariscos">Pescados & Mariscos</option>
                                        <option value="Lácteos & Quesos">Lácteos & Quesos</option>
                                        <option value="Verduras & Vegetales">Verduras & Vegetales</option>
                                        <option value="Abarrotes, Salsas & Aceites">Abarrotes, Salsas & Aceites</option>
                                        <option value="Bebidas & Licores">Bebidas & Licores</option>
                                        <option value="Empaques & Desechables">Empaques & Desechables</option>
                                    </select>
                                </div>
                            </div>

                            {/* Selector Ordenado de Unidad de Compra (De Sencillo a Mayor) */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-on-surface-variant">Unidad de Medida de Compra (Escala Simple ➔ Mayorista)</label>
                                <select
                                    value={purchaseUnit}
                                    onChange={(e) => setPurchaseUnit(e.target.value)}
                                    className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-semibold cursor-pointer"
                                >
                                    <option value="unidad">🧃 1. Unidad Individual (1 unid)</option>
                                    <option value="libra">⚖️ 2. Libra (454 g)</option>
                                    <option value="kg">⚖️ 3. Kilogramo (1.000 g)</option>
                                    <option value="litro">🥛 4. Litro (1.000 ml)</option>
                                    <option value="caja_24">📦 5. Caja de 24 Unidades</option>
                                    <option value="garrafa_20l">🛢️ 6. Garrafa de 20 Litros (20.000 ml)</option>
                                    <option value="bulto_25kg">📦 7. Bulto / Saco de 25 Kilogramos (25.000 g)</option>
                                    <option value="bulto_50kg">📦 8. Bulto / Saco de 50 Kilogramos (50.000 g)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-on-surface-variant">Costo Unitario de Compra ($ COP) *</label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 1800"
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
                                        min="1"
                                        value={purchaseQuantity}
                                        onChange={(e) => setPurchaseQuantity(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary font-bold"
                                    />
                                </div>
                            </div>

                            {/* Fecha de Vencimiento & Lote */}
                            <div className="grid grid-cols-2 gap-3 bg-surface/50 p-3 rounded-2xl border border-outline/10">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-on-surface-variant">Fecha de Vencimiento (Alerta)</label>
                                    <input
                                        type="date"
                                        value={expirationDate}
                                        onChange={(e) => setExpirationDate(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary font-semibold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-on-surface-variant">Número de Lote (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: LOTE-8823"
                                        value={batchNumber}
                                        onChange={(e) => setBatchNumber(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2 text-xs text-on-surface outline-none focus:border-primary font-mono"
                                    />
                                </div>
                            </div>

                            {/* Resumen de Conversión en Tiempo Real */}
                            <div className="bg-surface/60 border border-outline/10 p-3.5 rounded-2xl space-y-1.5 text-xs">
                                <div className="flex justify-between font-bold">
                                    <span className="text-on-surface-variant">Conversión a Consumo (Stock a Bodega):</span>
                                    <span className="text-primary font-extrabold text-sm">
                                        +{totalStockAdded.toLocaleString()} {preset.consumptionUnit}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs border-t border-outline/10 pt-1.5 font-bold">
                                    <span className="text-on-surface-variant">Total Inversión / Egreso de Caja:</span>
                                    <span className="text-amber-400 font-mono font-extrabold">
                                        ${Math.round(totalPurchaseSpend).toLocaleString('es-CO')} COP ({qtyPurchasedNum} × ${unitCostNum.toLocaleString('es-CO')})
                                    </span>
                                </div>
                                <div className="flex justify-between text-[11px] text-on-surface-variant/80 pt-0.5">
                                    <span>Costo por {preset.consumptionUnit}:</span>
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
                                    <label className="text-xs font-bold text-on-surface-variant">Proveedor / Fuente</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Distribuidora / Tienda Local"
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        className="w-full bg-surface border border-outline/20 rounded-xl p-2.5 text-xs text-on-surface outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 font-extrabold text-xs rounded-2xl hover:opacity-90 shadow-lg transition cursor-pointer flex items-center justify-center gap-2 ${isCasualPurchase ? 'bg-amber-500 text-black' : 'bg-primary text-on-primary'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {loading ? 'Guardando...' : isCasualPurchase ? 'Registrar Compra Ocasional de Caja Menor' : 'Guardar Insumo en Bodega'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
