import React from 'react';
import { ClientDashboard } from '../../components/ClientDashboard';

interface OpticaERPProps {
    clientId: string;
    onBack?: () => void;
}

/**
 * OpticaERP: Contenedor congelado e intocable para negocios tipo Óptica y Salud Visual.
 * Mantiene intactas las funcionalidades de Historias Clínicas, Prescripciones, Laboratorio
 * y Administración de Personal de Óptica (con Tarjeta Profesional).
 */
export const OpticaERP: React.FC<OpticaERPProps> = ({ clientId, onBack }) => {
    return (
        <ClientDashboard 
            clientId={clientId} 
            category="optica" 
            onBack={onBack || (() => {})} 
        />
    );
};
