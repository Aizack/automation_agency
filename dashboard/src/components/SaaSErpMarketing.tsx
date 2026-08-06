import React, { useState, useEffect } from 'react';

interface Campaign {
    id: string;
    name: string;
    base_message: string;
    target_segment: 'all' | 'leads' | 'customers';
    status: 'pending' | 'sending' | 'paused' | 'completed' | 'failed';
    created_at: string;
    total_targets: number;
    sent_count: number;
    failed_count: number;
    opt_out_count: number;
}

interface CampaignLog {
    id: string;
    customer_phone: string;
    customer_name: string;
    status: 'pending' | 'sent' | 'failed' | 'opt-out';
    rewritten_message: string | null;
    sent_at: string | null;
}

interface SaaSErpMarketingProps {
    clientId: string;
}

export const SaaSErpMarketing: React.FC<SaaSErpMarketingProps> = ({ clientId }) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [logs, setLogs] = useState<CampaignLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form inputs
    const [name, setName] = useState('');
    const [targetSegment, setTargetSegment] = useState<'all' | 'leads' | 'customers'>('all');
    const [baseMessage, setBaseMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const token = localStorage.getItem('auth_token');

    const loadCampaigns = async () => {
        try {
            setLoading(true);
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetch(`/api/clients/${clientId}/marketing/campaigns`, { headers });
            const json = await res.json();
            if (json.success) {
                setCampaigns(json.campaigns || []);
            }
        } catch (err) {
            console.error("Error loading marketing campaigns:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async (campaignId: string) => {
        try {
            setLogsLoading(true);
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await fetch(`/api/clients/${clientId}/marketing/campaigns/${campaignId}/logs`, { headers });
            const json = await res.json();
            if (json.success) {
                setLogs(json.logs || []);
            }
        } catch (err) {
            console.error("Error loading campaign logs:", err);
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();
    }, [clientId]);

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !baseMessage) {
            setErrorMsg('Nombre de campaña y prompt/mensaje base son requeridos.');
            return;
        }

        try {
            setActionLoading(true);
            setErrorMsg('');
            setSuccessMsg('');
            const res = await fetch(`/api/clients/${clientId}/marketing/campaigns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    base_message: baseMessage,
                    target_segment: targetSegment
                })
            });
            const json = await res.json();
            if (json.success) {
                setSuccessMsg('Campaña de difusión masiva iniciada con éxito.');
                setName('');
                setBaseMessage('');
                setTargetSegment('all');
                setIsCreateOpen(false);
                loadCampaigns();
            } else {
                setErrorMsg(json.error || 'Error al iniciar campaña de difusión.');
            }
        } catch (err: any) {
            setErrorMsg('Error de red al conectar con el servidor.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSelectCampaign = (c: Campaign) => {
        setSelectedCampaign(c);
        loadLogs(c.id);
    };

    return (
        <div className="space-y-6 text-on-surface">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-on-surface">Difusión y Marketing con IA</h2>
                    <p className="text-xs text-on-surface-variant">Lanza campañas masivas automatizadas por WhatsApp. La IA reescribe individualmente cada mensaje y aplica retardo secuencial (20-45s) para evitar baneos.</p>
                </div>
                <button
                    onClick={() => { setErrorMsg(''); setSuccessMsg(''); setIsCreateOpen(true); }}
                    className="px-4 py-2.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
                >
                    <span className="material-symbols-outlined text-[16px]">campaign</span>
                    Lanzar Campaña IA
                </button>
            </div>

            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs p-3 rounded-xl font-bold">
                    ✅ {successMsg}
                </div>
            )}

            {/* Main Area: Split Screen Campaigns + Real-time Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Campaigns List (Left side) */}
                <div className="lg:col-span-5 space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Campañas Históricas</h3>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-outline/25 rounded-2xl">
                            <span className="material-symbols-outlined text-on-surface-variant/40 text-[40px] mb-2">mark_email_unread</span>
                            <p className="text-xs font-bold text-on-surface-variant">Sin campañas creadas aún.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {campaigns.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => handleSelectCampaign(c)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                        selectedCampaign?.id === c.id 
                                            ? 'bg-primary/10 border-primary shadow-lg' 
                                            : 'bg-surface-container/20 border-outline/10 hover:bg-surface-container/40'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-xs text-white">{c.name}</h4>
                                            <span className="text-[9px] text-on-surface-variant font-mono">{new Date(c.created_at).toLocaleString('es-CO')}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                            c.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                            c.status === 'sending' ? 'bg-blue-500/10 text-blue-500' :
                                            c.status === 'paused' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                            {c.status}
                                        </span>
                                    </div>

                                    {/* Stats tags */}
                                    <div className="grid grid-cols-4 gap-1.5 mt-3 text-center text-[9px] font-mono border-t border-outline/5 pt-2 text-on-surface-variant">
                                        <div>
                                            <span className="block text-white font-bold">{c.total_targets}</span>
                                            <span>Enviados</span>
                                        </div>
                                        <div>
                                            <span className="block text-green-500 font-bold">{c.sent_count}</span>
                                            <span>Entregas</span>
                                        </div>
                                        <div>
                                            <span className="block text-red-500 font-bold">{c.failed_count}</span>
                                            <span>Fallas</span>
                                        </div>
                                        <div>
                                            <span className="block text-amber-500 font-bold">{c.opt_out_count}</span>
                                            <span>Opt-out</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Campaign Detail Logs (Right side) */}
                <div className="lg:col-span-7 space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Historial y Mensajes Personalizados por IA</h3>
                    {!selectedCampaign ? (
                        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-outline/20 rounded-2xl text-center bg-surface-container/5">
                            <span className="material-symbols-outlined text-on-surface-variant/40 text-[48px] mb-2">quickreply</span>
                            <p className="text-xs text-on-surface-variant/80 font-bold">Selecciona una campaña de la izquierda</p>
                            <p className="text-[10px] text-on-surface-variant/60">Para visualizar los logs de reescrituras de la IA y envíos en vivo.</p>
                        </div>
                    ) : (
                        <div className="glass-card p-5 rounded-2xl border border-outline/10 space-y-4">
                            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
                                <div>
                                    <h4 className="font-bold text-sm text-white">{selectedCampaign.name}</h4>
                                    <p className="text-[10px] text-on-surface-variant italic">Segmento: {selectedCampaign.target_segment.toUpperCase()}</p>
                                </div>
                                <button
                                    onClick={() => loadLogs(selectedCampaign.id)}
                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-lg border-0 cursor-pointer transition inline-flex"
                                    title="Actualizar Logs"
                                >
                                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                                </button>
                            </div>

                            {/* Logs listing */}
                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {logsLoading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : logs.length === 0 ? (
                                    <p className="text-xs text-on-surface-variant/60 py-6 text-center italic">No hay registros de envío para esta campaña.</p>
                                ) : (
                                    logs.map(log => (
                                        <div key={log.id} className="p-3 bg-surface-container/30 border border-outline/5 rounded-xl space-y-1.5 text-[11px]">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-white">{log.customer_name}</span>
                                                    <span className="text-[9px] text-on-surface-variant ml-2 font-mono">+{log.customer_phone}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                                    log.status === 'sent' ? 'bg-green-500/15 text-green-400' :
                                                    log.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                                                    log.status === 'opt-out' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>

                                            {log.rewritten_message ? (
                                                <p className="text-[10px] text-on-surface-variant bg-white/5 p-2 rounded-lg italic">
                                                    "{log.rewritten_message}"
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-on-surface-variant/40 italic">Mensaje en cola de personalización por IA...</p>
                                            )}

                                            {log.sent_at && (
                                                <p className="text-[8px] text-on-surface-variant/50 text-right font-mono">
                                                    Enviado: {new Date(log.sent_at).toLocaleTimeString('es-CO')}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE CAMPAIGN MODAL */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-2xl animate-float">
                        <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
                            <h3 className="font-bold text-lg text-on-surface">Iniciar Campaña de Difusión</h3>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-variant/40 border-0 cursor-pointer text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl mb-4 font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Nombre de la Campaña</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none"
                                    placeholder="Ej: Oferta de Invierno 2026"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Segmento de Clientes Destinatario</label>
                                <select
                                    value={targetSegment}
                                    onChange={(e) => setTargetSegment(e.target.value as any)}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none cursor-pointer"
                                >
                                    <option value="all">Todos los Contactos del CRM</option>
                                    <option value="leads">Solamente Leads/Prospectos</option>
                                    <option value="customers">Solamente Clientes Registrados</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-on-surface-variant uppercase">Prompt e Instrucciones de Mensaje Base</label>
                                <textarea
                                    required
                                    value={baseMessage}
                                    onChange={(e) => setBaseMessage(e.target.value)}
                                    rows={5}
                                    className="w-full bg-surface-container-high/40 border border-outline/20 p-2.5 rounded-xl text-on-surface focus:border-primary outline-none resize-none"
                                    placeholder="Ej: Escribe un mensaje entusiasta ofreciendo un descuento del 15% para cursos de inglés este mes, agregando un sentido de urgencia."
                                />
                                <span className="text-[9px] text-on-surface-variant/70 leading-relaxed block">
                                    💡 <strong>Consejo:</strong> La Inteligencia Artificial de Gemini tomará tu mensaje base, lo reescribirá amistosamente saludando al cliente por su nombre de pila registrado en el CRM, y agregará variaciones para evitar que WhatsApp detecte envíos repetitivos.
                                </span>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-outline/10">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-outline/20 text-on-surface hover:bg-surface-variant/20 rounded-xl font-bold cursor-pointer transition text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary hover:bg-primary-container text-white rounded-xl font-bold cursor-pointer transition text-xs"
                                >
                                    {actionLoading ? 'Encolando...' : 'Iniciar Difusión'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
