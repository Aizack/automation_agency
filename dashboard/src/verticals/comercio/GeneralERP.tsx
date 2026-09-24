import React from 'react';
import { ClientDashboard } from '../../components/ClientDashboard';

interface GeneralERPProps {
    clientId: string;
    onBack?: () => void;
}

/**
 * GeneralERP: ERP para Comercio General, Retail y Servicios Estándar.
 */
export const GeneralERP: React.FC<GeneralERPProps> = ({ clientId, onBack }) => {
    return (
        <ClientDashboard 
            clientId={clientId} 
            category="comercio" 
            onBack={onBack || (() => {})} 
        />
    );
};
