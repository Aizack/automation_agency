import React from 'react';
import { ClientDashboard } from '../../components/ClientDashboard';

interface RestaurantERPProps {
    clientId: string;
    onBack?: () => void;
}

/**
 * RestaurantERP: ERP dedicado e independiente para Restaurantes, Gastronomía, Bares y Cocinas Ocultas.
 * Aislado completamente de módulos de optometría y salud.
 */
export const RestaurantERP: React.FC<RestaurantERPProps> = ({ clientId, onBack }) => {
    return (
        <ClientDashboard 
            clientId={clientId} 
            category="restaurante" 
            onBack={onBack || (() => {})} 
        />
    );
};
