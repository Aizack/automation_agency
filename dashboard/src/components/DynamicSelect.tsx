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
    const [deletingOpt, setDeletingOpt] = useState<string | null>(null);

    // Estado para búsqueda y gestión (Eliminar / Filtrar)
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

    // Ordenamiento alfabético A-Z y deduplicación insensible a mayúsculas/minúsculas
    const sortedOptions = useMemo(() => {
        const seen = new Set<string>();
        const unique: string[] = [];
        for (const opt of options) {
            if (!opt) continue;
            const norm = opt.trim().toLowerCase();
            if (!seen.has(norm)) {
                seen.add(norm);
                unique.push(opt.trim());
            }
        }
        return unique.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }, [options]);

    // Opciones filtradas en tiempo real para el modal de gestión
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
        } else if (val === '__MANAGE_OPTIONS__') {
            setSearchQuery('');
            setIsSearchOpen(true);
        } else {
            onChange(val);
        }
    };

    const handleSaveNewOption = async (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const cleanVal = newOptionValue.trim();
        if (!cleanVal) return;

        // Monitor anti-duplicados local: si ya existe (ignorando mayúsculas), autoseleccionar y salir
        const existing = options.find(o => o.trim().toLowerCase() === cleanVal.toLowerCase());
        if (existing) {
            onChange(existing);
            setIsAddModalOpen(false);
            setNewOptionValue('');
            return;
        }

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

    const handleDeleteOption = async (optToDelete: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${optToDelete}"? Se borrará de la lista de marcas de todas las sedes.`)) {
            return;
        }

        try {
            setDeletingOpt(optToDelete);
            const res = await fetch(`/api/clients/${clientId}/custom-options`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryKey, optionValue: optToDelete })
            });
            const json = await res.json();
            if (json.success && json.options) {
                setOptions(json.options);
                if (value && value.trim().toLowerCase() === optToDelete.trim().toLowerCase()) {
                    onChange('');
                }
            } else {
                alert(json.error || 'No se pudo eliminar la opción.');
            }
        } catch (err) {
            console.error('Error eliminando opción:', err);
            alert('Error de conexión al eliminar la opción.');
        } finally {
            setDeletingOpt(null);
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
                        title={`Buscar y administrar ${displayTitle}`}
                    >
                        <span className="material-symbols-outlined text-[13px]">tune</span>
                        Gestionar / Borrar
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
                    <option value="__MANAGE_OPTIONS__" className="font-bold text-[#D9381E] bg-[#FFF5F5]">
                        🗑️ Eliminar / Gestionar marcas...
                    </option>
                </select>

                <button
                    type="button"
                    onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(true);
                    }}
                    title={`Buscar ${displayTitle}`}
                    disabled={disabled || loading}
                    className="px-2.5 bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] text-[#161616] transition cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[16px]">search</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setSearchQuery('');
                        setIsSearchOpen(true);
                    }}
                    title={`Eliminar marcas de la lista (${displayTitle})`}
                    disabled={disabled || loading}
                    className="px-2.5 bg-[#FFF5F5] hover:bg-[#FAD2CF] border border-[#E2DFD7] hover:border-[#D9381E] text-[#D9381E] transition cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
            </div>

            {/* Modal de Gestión y Eliminación de Opciones Portaleado a document.body */}
            {isSearchOpen && createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div
                        className="fixed inset-0"
                        onClick={() => setIsSearchOpen(false)}
                    />
                    <div className="relative bg-[#FAF8F5] border-2 border-[#161616] shadow-2xl p-6 w-full max-w-lg space-y-4 text-left z-10 max-h-[90vh] flex flex-col">
                        <div className="flex items-start justify-between border-b border-[#E2DFD7] pb-3">
                            <div>
                                <h4 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#D9381E] text-[22px]">tune</span>
                                    Gestionar y Eliminar {displayTitle}
                                </h4>
                                <p className="text-[11px] text-[#6B6862] mt-0.5">
                                    Selecciona una opción para usarla, o haz clic en <strong>Eliminar</strong> para borrarla permanentemente de la lista de todas las sedes.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(false)}
                                className="text-sm font-bold text-[#6B6862] hover:text-[#D9381E] p-1 border-0 bg-transparent cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#6B6862]">
                                search
                            </span>
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Buscar o filtrar ${displayTitle}...`}
                                className="w-full bg-white border border-[#E2DFD7] pl-9 pr-3 py-2 text-xs text-[#161616] outline-none focus:border-[#161616] font-sans"
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

                        <div className="flex-1 overflow-y-auto max-h-64 border border-[#E2DFD7] bg-white divide-y divide-[#E2DFD7]/60">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => {
                                    const isSelected = opt.toLowerCase() === (value || '').toLowerCase();
                                    return (
                                        <div
                                            key={opt}
                                            className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition ${
                                                isSelected
                                                    ? 'bg-[#161616] text-white font-bold'
                                                    : 'hover:bg-[#FAF8F5] text-[#161616]'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onChange(opt);
                                                    setIsSearchOpen(false);
                                                }}
                                                className="flex-1 text-left bg-transparent border-0 cursor-pointer p-0 text-inherit font-inherit flex items-center gap-2 py-1"
                                                title={`Seleccionar "${opt}"`}
                                            >
                                                <span>{opt}</span>
                                                {isSelected && <span className="text-xs text-white bg-[#D9381E] px-1.5 py-0.2 rounded-xs font-mono font-bold">Activa</span>}
                                            </button>
                                            <button
                                                type="button"
                                                title={`Eliminar permanentemente "${opt}" de la lista`}
                                                disabled={deletingOpt === opt}
                                                onClick={(e) => handleDeleteOption(opt, e)}
                                                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none cursor-pointer transition flex items-center gap-1 border shrink-0 ml-3 ${
                                                    isSelected
                                                        ? 'bg-white/10 hover:bg-[#D9381E] text-white border-white/20'
                                                        : 'bg-[#FFF5F5] hover:bg-[#D9381E] text-[#D9381E] hover:text-white border-[#FAD2CF]'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">
                                                    {deletingOpt === opt ? 'sync' : 'delete'}
                                                </span>
                                                {deletingOpt === opt ? 'Borrando...' : 'Borrar'}
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-5 text-center space-y-3">
                                    <p className="text-xs text-[#6B6862]">
                                        No se encontró "<strong>{searchQuery}</strong>".
                                    </p>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setNewOptionValue(searchQuery.trim());
                                            setIsSearchOpen(false);
                                            setIsAddModalOpen(true);
                                        }}
                                        className="py-2 px-4 bg-[#D9381E] hover:bg-[#b82e17] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer border-0 transition"
                                    >
                                        ➕ Crear "{searchQuery.trim()}"
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#E2DFD7]">
                            <span className="text-[11px] text-[#6B6862] font-mono">
                                {filteredOptions.length} de {sortedOptions.length} opciones
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setNewOptionValue('');
                                        setIsAddModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] text-[11px] font-bold uppercase tracking-wider cursor-pointer transition flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px] text-[#D9381E]">add</span>
                                    Nueva Opción
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsSearchOpen(false)}
                                    className="px-4 py-1.5 bg-[#161616] hover:bg-[#2c2c2c] text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer border-0 transition"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Quick Creation: Completamente aislado sin tag <form> para no disparar guardado del producto */}
            {isAddModalOpen && createPortal(
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div
                        className="fixed inset-0"
                        onClick={() => !saving && setIsAddModalOpen(false)}
                    />
                    <div className="relative bg-[#FAF8F5] border-2 border-[#161616] shadow-2xl p-6 w-full max-w-sm space-y-4 text-left z-10">
                        <div className="flex items-center justify-between border-b border-[#E2DFD7] pb-3">
                            <h4 className="font-serif text-base font-bold text-[#161616] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[#D9381E] text-[20px]">add_circle</span>
                                Nueva Opción ({displayTitle})
                            </h4>
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-xs font-bold text-[#6B6862] hover:text-[#D9381E] border-0 bg-transparent cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6B6862] uppercase tracking-wider">
                                Nombre de la nueva opción:
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={newOptionValue}
                                onChange={(e) => setNewOptionValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveNewOption();
                                    }
                                }}
                                placeholder="Ej: Ray-Ban, Acetato Premium..."
                                className="w-full bg-white border border-[#E2DFD7] p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] rounded-none font-sans"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-[#E2DFD7]">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => setIsAddModalOpen(false)}
                                className="bg-white border border-[#E2DFD7] hover:border-[#161616] text-[#161616] px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={saving || !newOptionValue.trim()}
                                onClick={handleSaveNewOption}
                                className="bg-[#D9381E] hover:bg-[#b82e18] text-white border-0 px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                                {saving ? 'Guardando...' : 'Guardar y Seleccionar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
