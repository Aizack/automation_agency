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
                setShowResolveModal(false);
                fetchAlerts();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error de red: ${err}`);
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
                fetchAlerts();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error de red: ${err}`);
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
                fetchAlerts();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err) {
            alert(`Error de red: ${err}`);
        }
    };

    return (
        <div className="space-y-6 text-[#161616]">
            {/* Cabecera Wabi-Sabi */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-4">
                <div>
                    <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">
                        MONITOR DE SALUD & CONECTIVIDAD
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight">
                        Estado del Sistema & Alertas
                    </h2>
                    <p className="text-xs text-[#76746E] font-sans mt-0.5">
                        Historial de alertas de conexión de WhatsApp, webhook health y novedades operativas.
                    </p>
                </div>

                <button
                    onClick={fetchAlerts}
                    disabled={loading}
                    className="px-4 py-2 border border-[#E2DFD7] bg-white hover:bg-[#FAF8F5] text-xs font-mono font-bold text-[#161616] flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
                    Actualizar Logs
                </button>
            </div>

            {/* Filtros de Pestañas Wabi-Sabi */}
            <div className="bg-white border border-[#E2DFD7] p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
                            filter === 'all'
                                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
                        }`}
                    >
                        Todos ({alerts.length})
                    </button>

                    <button
                        onClick={() => setFilter('active')}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
                            filter === 'active'
                                ? 'bg-[#D9381E] text-[#F6F4EE] border-[#D9381E]'
                                : 'bg-transparent text-[#76746E] hover:text-[#D9381E] hover:bg-[#FAF8F5] border-transparent'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-[#D9381E]"></span>
                        Activos ({alerts.filter(a => a.status === 'active').length})
                    </button>

                    <button
                        onClick={() => setFilter('resolved')}
                        className={`px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 border ${
                            filter === 'resolved'
                                ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                                : 'bg-transparent text-[#76746E] hover:text-[#161616] hover:bg-[#FAF8F5] border-transparent'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        Resueltos ({alerts.filter(a => a.status === 'resolved').length})
                    </button>
                </div>
            </div>

            {/* Tabla de Alertas */}
            <div className="bg-white border border-[#E2DFD7] overflow-hidden shadow-xs">
                {loading ? (
                    <div className="p-12 text-center text-[#76746E] space-y-2">
                        <span className="material-symbols-outlined animate-spin text-3xl text-[#161616]">sync</span>
                        <p className="text-xs font-mono uppercase tracking-wider">Cargando estado del sistema...</p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div className="p-12 text-center text-[#76746E] space-y-2">
                        <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                        <p className="text-sm font-serif text-[#161616]">Sin incidencias registradas</p>
                        <p className="text-xs font-mono text-[#76746E]">No hay alertas pendientes en esta categoría. El sistema opera normalmente.</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse font-sans">
                            <thead>
                                <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">
                                    <th className="py-2.5 px-3">GRAVEDAD</th>
                                    <th className="py-2.5 px-3">IDENTIFICADOR</th>
                                    <th className="py-2.5 px-3">MENSAJE DE INCIDENCIA</th>
                                    <th className="py-2.5 px-3">INICIO DEL FALLO</th>
                                    <th className="py-2.5 px-3">RESOLUCIÓN</th>
                                    <th className="py-2.5 px-3">ESTADO</th>
                                    <th className="py-2.5 px-3 text-right">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2DFD7] text-xs">
                                {filteredAlerts.map((alert) => (
                                    <tr key={alert.id} className="hover:bg-[#FAF8F5] transition-colors">
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                                                alert.severity === 'red' ? 'bg-[#FAF8F5] text-[#D9381E] border-[#D9381E]' :
                                                alert.severity === 'orange' ? 'bg-[#FAF8F5] text-amber-700 border-amber-400' :
                                                'bg-[#FAF8F5] text-[#76746E] border-[#E2DFD7]'
                                            }`}>
                                                {alert.severity === 'red' ? 'CRÍTICO' : alert.severity === 'orange' ? 'AVISO' : 'INFO'}
                                            </span>
                                        </td>

                                        <td className="py-2.5 px-3 font-mono text-xs text-[#161616] font-bold whitespace-nowrap">
                                            {alert.alert_key}
                                        </td>

                                        <td className="py-2.5 px-3 text-xs max-w-sm">
                                            <p className="font-sans text-[#161616] line-clamp-2" title={alert.message}>
                                                {alert.message}
                                            </p>
                                        </td>

                                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#76746E] whitespace-nowrap">
                                            {formatDateTime(alert.created_at)}
                                        </td>

                                        <td className="py-2.5 px-3 text-xs text-[#76746E]">
                                            {alert.resolved_at ? (
                                                <div className="space-y-0.5">
                                                    <span className="text-[10px] font-mono text-emerald-700 block">
                                                        {formatDateTime(alert.resolved_at)}
                                                    </span>
                                                    {alert.resolved_by && (
                                                        <span className="text-[9px] text-[#76746E] block">
                                                            Por: {alert.resolved_by}
                                                        </span>
                                                    )}
                                                    {alert.resolution_notes && (
                                                        <span className="text-[10px] italic text-[#161616] line-clamp-1 block" title={alert.resolution_notes}>
                                                            "{alert.resolution_notes}"
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[#76746E] font-mono text-[11px]">Pendiente</span>
                                            )}
                                        </td>

                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                                                alert.status === 'active'
                                                    ? 'bg-[#FAF8F5] text-[#D9381E] border-[#D9381E]'
                                                    : 'bg-[#FAF8F5] text-emerald-700 border-emerald-300'
                                            }`}>
                                                {alert.status === 'active' ? 'ACTIVO' : 'RESUELTO'}
                                            </span>
                                        </td>

                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {alert.status === 'active' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleResolveClick(alert)}
                                                            className="px-2.5 py-1 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] text-[11px] font-mono font-bold uppercase transition cursor-pointer"
                                                        >
                                                            Resolver
                                                        </button>
                                                        {snoozingAlertId === alert.id ? (
                                                            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 border border-[#E2DFD7]">
                                                                <select
                                                                    value={snoozeMinutes}
                                                                    onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
                                                                    className="text-[10px] font-mono bg-white border border-[#E2DFD7] p-0.5"
                                                                >
                                                                    <option value={15}>15m</option>
                                                                    <option value={60}>1h</option>
                                                                    <option value={240}>4h</option>
                                                                    <option value={1440}>24h</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => handleSnooze(alert.id)}
                                                                    disabled={snoozing}
                                                                    className="text-[10px] font-mono font-bold text-[#161616] px-1 bg-white border border-[#E2DFD7] hover:bg-[#FAF8F5]"
                                                                >
                                                                    OK
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setSnoozingAlertId(alert.id)}
                                                                className="px-2 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-xs text-[#76746E] hover:text-[#161616] transition cursor-pointer"
                                                                title="Silenciar alerta"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">snooze</span>
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReopen(alert.id)}
                                                        className="px-2.5 py-1 bg-white hover:bg-[#FAF8F5] border border-[#E2DFD7] text-[#76746E] hover:text-[#161616] text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[13px]">refresh</span>
                                                        Reabrir
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Resolución Wabi-Sabi */}
            {showResolveModal && selectedAlert && createPortal(
                <div 
                    className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 text-left"
                    onClick={() => setShowResolveModal(false)}
                >
                    <div 
                        className="bg-[#F6F4EE] border border-[#E2DFD7] max-w-lg w-full rounded-none overflow-hidden p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-bold text-[#D9381E] uppercase font-mono tracking-widest block">
                                    RESOLUCIÓN DE INCIDENCIA
                                </span>
                                <h3 className="font-serif text-xl font-normal text-[#161616]">
                                    Resolver Alerta #{selectedAlert.alert_key}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowResolveModal(false)}
                                className="w-8 h-8 rounded-none flex items-center justify-center hover:bg-[#E2DFD7] border border-transparent hover:border-[#161616] cursor-pointer text-[#161616] transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="space-y-4 text-xs font-sans">
                            <div className="bg-white p-3 border border-[#E2DFD7]">
                                <span className="text-[10px] font-mono font-bold text-[#76746E] uppercase block mb-1">
                                    Mensaje Original:
                                </span>
                                <p className="text-xs text-[#161616]">
                                    {selectedAlert.message}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider text-[#76746E] font-bold font-mono">
                                    Nota de Resolución & Acciones Tomadas *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Ej: Se reconectó el código QR de WhatsApp y se verificó el webhook exitosamente..."
                                    className="w-full bg-[#FAF8F5] border border-[#E2DFD7] p-2.5 text-xs text-[#161616] focus:border-[#161616] focus:bg-white outline-none font-sans rounded-none transition-colors"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                                <button
                                    type="button"
                                    onClick={() => setShowResolveModal(false)}
                                    className="px-4 py-2 bg-white border border-[#E2DFD7] text-xs font-mono font-bold text-[#161616] hover:bg-[#FAF8F5] transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResolveSubmit}
                                    disabled={resolving || !resolutionNotes.trim()}
                                    className="px-5 py-2 bg-[#161616] hover:bg-[#D9381E] text-[#F6F4EE] border border-[#161616] hover:border-[#D9381E] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                                >
                                    {resolving ? 'Guardando...' : 'Marcar como Resuelto'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
