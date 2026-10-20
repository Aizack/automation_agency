import React, { useState, useEffect, useMemo } from 'react';
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

    // Estado para búsqueda rápida mediante Lupita
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    // Ordenamiento alfabético A-Z automático
    const sortedOptions = useMemo(() => {
        return [...options].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }, [options]);

    // Opciones filtradas en tiempo real para la Lupita de búsqueda
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return sortedOptions;
        const q = searchQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        return sortedOptions.filter(opt =>
            opt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q)
        );
    }, [sortedOptions, searchQuery]);

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
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-[#6B6862] uppercase tracking-wider">
                        {label} {required && <span className="text-[#D9381E]">*</span>}
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            setSearchQuery('');
                            setIsSearchOpen(true);
                        }}
                        className="text-[10px] font-bold text-[#6B6862] hover:text-[#D9381E] flex items-center gap-1 cursor-pointer transition uppercase tracking-wider bg-transparent border-0"
                        title={`Buscar en ${displayTitle} con lupa`}
                    >
                        <span className="material-symbols-outlined text-[13px]">search</span>
                        Buscar
                    </button>
                </div>
            )}

            <div className="flex items-stretch gap-1 w-full relative">
                <select
                    value={value || ''}
                    onChange={handleSelectChange}
                    disabled={disabled || loading}
                    required={required}
                    className={`${className} flex-1`}
                >
                    <option value="">{loading ? 'Cargando opciones...' : placeholder}</option>
                    {sortedOptions.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                    {value && !sortedOptions.includes(value) && (
                        <option value={value}>{value}</option>
                    )}
                    <option value="__ADD_NEW__" className="font-bold text-[#D9381E] bg-[#FAF8F5]">
                        ➕ Agregar nueva opción...
                    </option>
                </select>

                <button
                    type="button"
                    onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(!isSearchOpen);
                    }}
                    title={`Buscar ${displayTitle} (Lupa)`}
                    disabled={disabled || loading}
                    className="px-2.5 bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] transition cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[16px]">search</span>
                </button>
            </div>

            {/* Popover de Búsqueda Rápida con Lupita */}
            {isSearchOpen && (
                <div className="relative w-full">
                    {/* Backdrop para cerrar al hacer clic afuera */}
                    <div
                        className="fixed inset-0 z-[99998]"
                        onClick={() => setIsSearchOpen(false)}
                    />
                    <div className="absolute top-1 left-0 right-0 z-[99999] bg-[#FAF8F5] border-2 border-[#161616] shadow-2xl p-2.5 space-y-2 animate-fade-in text-left">
                        <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-1.5">
                            <span className="text-[10px] font-bold text-[#6B6862] uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-[#D9381E]">search</span>
                                Buscar {displayTitle}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(false)}
                                className="text-xs font-bold text-[#6B6862] hover:text-[#D9381E] px-1 py-0.5 border-0 bg-transparent cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[15px] text-[#6B6862]">
                                search
                            </span>
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Escribe para filtrar ${displayTitle}...`}
                                className="w-full bg-white border border-[#E2DFD7] pl-8 pr-3 py-1.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-sans"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setIsSearchOpen(false);
                                    } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                                        e.preventDefault();
                                        onChange(filteredOptions[0]);
                                        setIsSearchOpen(false);
                                    }
                                }}
                            />
                        </div>

                        <div className="max-h-52 overflow-y-auto border border-[#E2DFD7] bg-white divide-y divide-[#E2DFD7]/50">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => {
                                    const isSelected = opt.toLowerCase() === (value || '').toLowerCase();
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                                onChange(opt);
                                                setIsSearchOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition ${
                                                isSelected
                                                    ? 'bg-[#161616] text-white font-bold'
                                                    : 'hover:bg-[#FAF8F5] text-[#161616]'
                                            }`}
                                        >
                                            <span>{opt}</span>
                                            {isSelected && <span className="text-xs">✓</span>}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-3 text-center space-y-2">
                                    <p className="text-xs text-[#6B6862]">
                                        No se encontró "<strong>{searchQuery}</strong>".
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewOptionValue(searchQuery.trim());
                                            setIsSearchOpen(false);
                                            setIsAddModalOpen(true);
                                        }}
                                        className="w-full py-1.5 px-3 bg-[#D9381E] hover:bg-[#b82e17] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer border-0 transition"
                                    >
                                        ➕ Crear "{searchQuery.trim()}"
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[#6B6862]">
                                {filteredOptions.length} de {sortedOptions.length} opciones
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSearchOpen(false);
                                    setNewOptionValue('');
                                    setIsAddModalOpen(true);
                                }}
                                className="text-[10px] font-bold text-[#D9381E] hover:underline cursor-pointer bg-transparent border-0"
                            >
                                + Nueva opción personalizada
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                                    placeholder="Ej: LUXOR, Titanio Flexible, AR Verde, etc."
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
