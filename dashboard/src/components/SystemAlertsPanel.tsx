import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SystemAlert {
    id: string;
    alert_key: string;
    severity: 'red' | 'orange' | 'yellow';
    message: string;
    status: 'active' | 'resolved';
    created_at: string;
    resolved_at: string | null;
    resolved_by?: string;
    resolution_notes?: string;
    snooze_until?: string;
    reopen_count?: number;
}

interface SystemAlertsPanelProps {
    clientId?: string;
}

export const SystemAlertsPanel: React.FC<SystemAlertsPanelProps> = ({ clientId }) => {
    const [alerts, setAlerts] = useState<SystemAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
    
    // Modal de resolución
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolving, setResolving] = useState(false);
    
    // Snooze
    const [snoozingAlertId, setSnoozingAlertId] = useState<string | null>(null);
    const [snoozeMinutes, setSnoozeMinutes] = useState(60);
    const [snoozing, setSnoozing] = useState(false);

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
        // Auto-refresh cada 30 segundos
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
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

    const handleResolveClick = (alert: SystemAlert) => {
        setSelectedAlert(alert);
        setResolutionNotes('');
        setShowResolveModal(true);
    };

    const handleResolveSubmit = async () => {
        if (!selectedAlert || !resolutionNotes.trim()) {
            alert('Por favor ingresa una nota de resolución');
            return;
        }

        setResolving(true);
        try {
            const res = await fetch(`/api/admin/alerts/${selectedAlert.id}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolutionNotes })
            });

            const json = await res.json();
            if (json.success) {
                alert('✅ Alerta resuelta exitosamente');
                setShowResolveModal(false);
                fetchAlerts();
            } else {
                alert(`❌ Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error: ${err}`);
        } finally {
            setResolving(false);
        }
    };

    const handleSnooze = async (alertId: string) => {
        setSnoozingAlertId(alertId);
        setSnoozing(true);
        try {
            const res = await fetch(`/api/admin/alerts/${alertId}/snooze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ snoozeMinutes })
            });

            const json = await res.json();
            if (json.success) {
                alert(`✅ Alerta silenciada por ${snoozeMinutes} minutos`);
                fetchAlerts();
            } else {
                alert(`❌ Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error: ${err}`);
        } finally {
            setSnoozing(false);
            setSnoozingAlertId(null);
            setSnoozeMinutes(60);
        }
    };

    const handleReopen = async (alertId: string) => {
        if (!confirm('¿Estás seguro de que deseas reabrir esta alerta?')) return;

        try {
            const res = await fetch(`/api/admin/alerts/${alertId}/reopen`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const json = await res.json();
            if (json.success) {
                alert('✅ Alerta reabierta');
                fetchAlerts();
            } else {
                alert(`❌ Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error: ${err}`);
        }
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
                                <th className="p-4">Acciones</th>
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
                                        {alert.resolution_notes && (
                                            <p className="text-on-surface-variant text-[11px] mt-1">📝 {alert.resolution_notes}</p>
                                        )}
                                    </td>
                                    <td className="p-4 font-mono text-xs text-on-surface-variant">
                                        {formatDateTime(alert.created_at)}
                                    </td>
                                    <td className="p-4 text-xs">
                                        {alert.resolved_by ? (
                                            <div className="text-on-surface-variant">
                                                <p className="font-bold">Por: {alert.resolved_by}</p>
                                                <p>{formatDateTime(alert.resolved_at)}</p>
                                            </div>
                                        ) : (
                                            <span className="text-on-surface-variant">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            alert.status === 'active' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                                        }`}>
                                            {alert.status === 'active' ? 'Activo' : 'Resuelto'}
                                        </span>
                                        {alert.snooze_until && new Date(alert.snooze_until) > new Date() && (
                                            <p className="text-[10px] text-yellow-400 mt-1">⏰ Silenciado</p>
                                        )}
                                    </td>
                                    <td className="p-4 flex gap-2 flex-wrap">
                                        {alert.status === 'active' && (
                                            <>
                                                <button
                                                    onClick={() => handleResolveClick(alert)}
                                                    className="text-xs px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded transition flex items-center gap-1"
                                                    title="Marcar como resuelta"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    Resolver
                                                </button>
                                                <button
                                                    onClick={() => handleSnooze(alert.id)}
                                                    disabled={snoozing && snoozingAlertId === alert.id}
                                                    className="text-xs px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded transition flex items-center gap-1 disabled:opacity-50"
                                                    title="Silenciar por N minutos"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">snooze</span>
                                                    {snoozing && snoozingAlertId === alert.id ? 'Silenciando...' : 'Snooze'}
                                                </button>
                                            </>
                                        )}
                                        {alert.status === 'resolved' && (
                                            <button
                                                onClick={() => handleReopen(alert.id)}
                                                className="text-xs px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition flex items-center gap-1"
                                                title="Reabrir alerta"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">history</span>
                                                Reabrir
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Resolución */}
            {showResolveModal && selectedAlert && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="bg-surface rounded-3xl p-6 max-w-md w-full mx-4 border border-outline/10 shadow-lg max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Resolver Alerta</h3>
                            <button
                                onClick={() => setShowResolveModal(false)}
                                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full cursor-pointer bg-transparent border-0"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div>
                                <p className="text-xs text-on-surface-variant uppercase">Alerta</p>
                                <p className="font-mono text-sm">{selectedAlert.alert_key}</p>
                            </div>
                            <div>
                                <p className="text-xs text-on-surface-variant uppercase">Mensaje</p>
                                <p className="text-sm">{selectedAlert.message}</p>
                            </div>
                            <div>
                                <label className="text-xs text-on-surface-variant uppercase block mb-2">
                                    Nota de Resolución (Obligatoria)
                                </label>
                                <textarea
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Describe qué acción tomaste para resolver esta alerta..."
                                    className="w-full h-24 bg-surface-container border border-outline/20 rounded-lg p-3 text-on-surface text-sm focus:border-primary focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowResolveModal(false)}
                                className="flex-1 text-xs font-bold py-2.5 rounded-lg bg-surface-container hover:bg-surface-container/80 text-on-surface transition cursor-pointer border border-outline/20"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleResolveSubmit}
                                disabled={resolving || !resolutionNotes.trim()}
                                className="flex-1 text-xs font-bold py-2.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition cursor-pointer border border-green-500/20 disabled:opacity-50"
                            >
                                {resolving ? 'Resolviendo...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
