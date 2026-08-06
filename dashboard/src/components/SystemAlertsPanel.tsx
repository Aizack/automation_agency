import React, { useState, useEffect } from 'react';

interface SystemAlert {
    id: string;
    alert_key: string;
    severity: 'red' | 'orange' | 'yellow';
    message: string;
    status: 'active' | 'resolved';
    created_at: string;
    resolved_at: string | null;
}

interface SystemAlertsPanelProps {
    clientId?: string;
}

export const SystemAlertsPanel: React.FC<SystemAlertsPanelProps> = ({ clientId }) => {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

    const token = localStorage.getItem('auth_token');

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const url = clientId 
                ? `/api/clients/${clientId}/alerts/history`
                : '/api/admin/alerts/history';
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setAlerts(json.alerts || []);
            }
        } catch (err) {
            console.error("Error loading system alerts history:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, [clientId]);

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'active') return alert.status === 'active';
        if (filter === 'resolved') return alert.status === 'resolved';
        return true;
    });

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="space-y-6 text-on-surface">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Registro de Estado del Sistema</h2>
                    <p className="text-xs text-on-surface-variant">Historial de alertas de conexión de WhatsApp y novedades operativas.</p>
                </div>
                <button
                    onClick={fetchAlerts}
                    disabled={loading}
                    className="bg-primary hover:bg-primary-container text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                >
                    <span className="material-symbols-outlined text-[16px] animate-spin-slow">refresh</span>
                    Actualizar Logs
                </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 border-b border-outline/10 pb-3 text-xs">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${filter === 'all' ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    Todos ({alerts.length})
                </button>
                <button
                    onClick={() => setFilter('active')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${filter === 'active' ? 'bg-red-500/10 text-red-400 font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    🔴 Activos ({alerts.filter(a => a.status === 'active').length})
                </button>
                <button
                    onClick={() => setFilter('resolved')}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${filter === 'resolved' ? 'bg-green-500/10 text-green-400 font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    🟢 Resueltos ({alerts.filter(a => a.status === 'resolved').length})
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-2xl">
                    <p className="text-sm text-on-surface-variant">No se encontraron alertas en esta categoría.</p>
                </div>
            ) : (
                <div className="glass-card rounded-2xl overflow-hidden border border-outline/10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-bold">
                                <th className="p-4">Gravedad</th>
                                <th className="p-4">Identificador</th>
                                <th className="p-4">Mensaje de Incidencia</th>
                                <th className="p-4">Inicio del Fallo</th>
                                <th className="p-4">Resolución</th>
                                <th className="p-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline/10 text-sm">
                            {filteredAlerts.map((alert) => (
                                <tr key={alert.id} className="hover:bg-surface-variant/20 transition-colors">
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            alert.severity === 'red' ? 'bg-red-500/10 text-red-400' :
                                            alert.severity === 'orange' ? 'bg-orange-500/10 text-orange-400' :
                                            'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                            {alert.severity === 'red' ? 'CRÍTICO' : alert.severity === 'orange' ? 'AVISO' : 'INFO'}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-on-surface">{alert.alert_key}</td>
                                    <td className="p-4 text-xs max-w-sm">
                                        <p className="text-on-surface font-medium">{alert.message}</p>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-on-surface-variant">
                                        {formatDateTime(alert.created_at)}
                                    </td>
                                    <td className="p-4 font-mono text-xs text-on-surface-variant">
                                        {formatDateTime(alert.resolved_at)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            alert.status === 'active' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                                        }`}>
                                            {alert.status === 'active' ? 'Activo' : 'Resuelto'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
