import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface DynamicSelectProps {
    clientId: string;
    categoryKey: string;
    categoryTitle?: string;
    value: string;
    onChange: (newValue: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    required?: boolean;
    disabled?: boolean;
}

export const DynamicSelect: React.FC<DynamicSelectProps> = ({
    clientId,
    categoryKey,
    categoryTitle,
    value,
    onChange,
    label,
    placeholder = '-- Seleccionar opción --',
    className = 'bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none w-full font-sans cursor-pointer',
    required = false,
    disabled = false
}) => {
    const [options, setOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newOptionValue, setNewOptionValue] = useState('');
    const [saving, setSaving] = useState(false);

    const loadOptions = async () => {
        if (!clientId) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/clients/${clientId}/custom-options`);
            const json = await res.json();
            if (json.success && json.options && json.options[categoryKey]) {
                setOptions(json.options[categoryKey]);
            }
        } catch (err) {
            console.error(`Error cargando opciones dinámicas (${categoryKey}):`, err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOptions();
    }, [clientId, categoryKey]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === '__ADD_NEW__') {
            setNewOptionValue('');
            setIsAddModalOpen(true);
        } else {
            onChange(val);
        }
    };

    const handleSaveNewOption = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanVal = newOptionValue.trim();
        if (!cleanVal) return;

        try {
            setSaving(true);
            const res = await fetch(`/api/clients/${clientId}/custom-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryKey, optionValue: cleanVal })
            });
            const json = await res.json();
            if (json.success && json.options) {
                setOptions(json.options);
                onChange(cleanVal);
                setIsAddModalOpen(false);
                setNewOptionValue('');
            } else {
                alert(json.error || 'No se pudo agregar la opción.');
            }
        } catch (err) {
            console.error('Error guardando opción dinámica:', err);
            alert('Error de conexión al guardar la nueva opción.');
        } finally {
            setSaving(false);
        }
    };

    const displayTitle = categoryTitle || categoryKey.replace(/_/g, ' ').toUpperCase();

    return (
        <div className="w-full">
            {label && (
                <label className="block text-[11px] font-bold text-[#6B6862] uppercase tracking-wider mb-1">
                    {label} {required && <span className="text-[#D9381E]">*</span>}
                </label>
            )}

            <select
                value={value || ''}
                onChange={handleSelectChange}
                disabled={disabled || loading}
                required={required}
                className={className}
            >
                <option value="">{loading ? 'Cargando opciones...' : placeholder}</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
                {value && !options.includes(value) && (
                    <option value={value}>{value}</option>
                )}
                <option value="__ADD_NEW__" className="font-bold text-[#D9381E] bg-[#FAF8F5]">
                    ➕ Agregar nueva opción...
                </option>
            </select>

            {/* Modal Quick Creation */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/70 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left">
                    <div className="bg-[#F6F4EE] border-2 border-[#161616] p-6 max-w-md w-full shadow-2xl animate-fade-in space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
                            <h3 className="font-serif text-lg font-normal text-[#161616] flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#D9381E]">add_circle</span>
                                Agregar Opción Personalizada
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-xl font-light text-[#161616] hover:text-[#D9381E] cursor-pointer border-0 bg-transparent"
                            >
                                &times;
                            </button>
                        </div>

                        <p className="text-xs text-[#6B6862]">
                            Ingresa el nombre de la nueva opción para <strong>{displayTitle}</strong>. Quedará guardada permanentemente para tu tienda.
                        </p>

                        <form onSubmit={handleSaveNewOption} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#161616] mb-1">
                                    Nombre de la Nueva Opción *
                                </label>
                                <input
                                    type="text"
                                    value={newOptionValue}
                                    onChange={(e) => setNewOptionValue(e.target.value)}
                                    placeholder="Ej: Titanio Flexible, AR Verde, etc."
                                    className="w-full bg-white border border-[#E2DFD7] p-3 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2DFD7]">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 bg-white border border-[#E2DFD7] text-[#161616] text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !newOptionValue.trim()}
                                    className="px-5 py-2 bg-[#161616] hover:bg-[#D9381E] text-white text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none border-0 transition disabled:opacity-50"
                                >
                                    {saving ? 'Guardando...' : 'Guardar y Seleccionar ✓'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
