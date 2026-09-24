import React, { useState, useEffect } from 'react';
import { OpticaERP } from './optica/OpticaERP';
import { RestaurantERP } from './restaurante/RestaurantERP';
import { GeneralERP } from './comercio/GeneralERP';

interface VerticalRouterProps {
    clientId: string;
    category?: string;
    onBack?: () => void;
}

/**
 * VerticalRouter: Enrutador Maestro de Inquilinos por Dominio.
 * Carga el ERP correspondiente sin intersecionar estilos ni lógica entre verticales.
 * Por defecto y ante cualquier duda, enruta hacia OpticaERP para garantizar Zero-Break en producción.
 */
export const VerticalRouter: React.FC<VerticalRouterProps> = ({ clientId, category: initialCategory, onBack }) => {
    const [clientCategory, setClientCategory] = useState<string>(initialCategory || '');
    const [loading, setLoading] = useState(!initialCategory);

    useEffect(() => {
        if (!initialCategory && clientId) {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('emp_token');
            fetch(`/api/clients/${clientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.data?.category) {
                        setClientCategory(data.data.category);
                    }
                })
                .catch(err => console.error("Error fetching client category in VerticalRouter:", err))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [clientId, initialCategory]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F6F4EE] text-[#161616] flex flex-col items-center justify-center font-sans">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-10 h-10 border-3 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-[#6B6862] font-bold uppercase tracking-wider animate-pulse font-mono">
                        Cargando ERP Específico del Inquilino...
                    </p>
                </div>
            </div>
        );
    }

    const catLower = (clientCategory || initialCategory || '').toLowerCase().trim();

    if (catLower.includes('restauran') || catLower.includes('gastro') || catLower.includes('food') || catLower.includes('bar')) {
        return <RestaurantERP clientId={clientId} onBack={onBack} />;
    }

    if (catLower.includes('comercio') || catLower.includes('retail')) {
        return <GeneralERP clientId={clientId} onBack={onBack} />;
    }

    // Por defecto (Garantía Zero-Break para tiendas en producción VPS): Carga OpticaERP
    return <OpticaERP clientId={clientId} onBack={onBack} />;
};
