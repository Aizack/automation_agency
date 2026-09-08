import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
        <div className="space-y-6 text-[#161616] font-sans antialiased">
            {/* Header Principal Wabi-Sabi */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DFD7]">
                <div>
                    <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
                        MARKETING & DIFUSIÓN
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
                        Difusión Promocional & Campañas IA
                    </h2>
                    <p className="text-xs text-[#76746E] mt-1.5">
                        Campañas por WhatsApp con reescritura personalizada por IA y cadencia programada anti-bloqueos.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadCampaigns}
                        className="px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#161616] bg-white border border-[#E2DFD7] hover:border-[#161616] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Refrescar
                    </button>
                    <button
                        type="button"
                        onClick={() => { setErrorMsg(''); setSuccessMsg(''); setIsCreateOpen(true); }}
                        className="px-4 py-2 bg-[#161616] text-[#F6F4EE] hover:bg-[#2b2b2b] text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-xs"
                    >
                        <span className="material-symbols-outlined text-[16px]">campaign</span>
                        Lanzar Campaña IA
                    </button>
                </div>
            </div>

            {successMsg && (
                <div className="bg-[#E6F4EA] border border-[#137333] text-[#137333] text-xs p-3 rounded-none font-mono font-bold shadow-xs">
                    ✅ {successMsg}
                </div>
            )}

            {/* Main Area: Split Screen Campaigns + Real-time Logs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Campaigns List (Left side) */}
                <div className="lg:col-span-5 space-y-3">
                    <div className="flex justify-between items-center pb-1 border-b border-[#E2DFD7]">
                        <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-[#76746E]">
                            Campañas Históricas ({campaigns.length})
                        </h3>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 bg-white border border-[#E2DFD7] rounded-none">
                            <div className="w-6 h-6 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p className="text-[10px] font-mono text-[#76746E]">Cargando historial...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-12 bg-white border border-[#E2DFD7] rounded-none shadow-xs space-y-2">
                            <span className="material-symbols-outlined text-[#76746E] text-[36px]">mark_email_unread</span>
                            <p className="text-xs font-serif text-[#161616]">Sin campañas creadas aún.</p>
                            <p className="text-[10px] font-mono text-[#76746E]">Haz clic en "Lanzar Campaña IA" para comenzar.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[550px] overflow-y-auto custom-scrollbar">
                            {campaigns.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => handleSelectCampaign(c)}
                                    className={`p-4 rounded-none border cursor-pointer transition shadow-xs ${
                                        selectedCampaign?.id === c.id 
                                            ? 'bg-[#FAF8F5] border-[#161616] ring-1 ring-[#161616]' 
                                            : 'bg-white border-[#E2DFD7] hover:border-[#161616]'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-serif font-bold text-sm text-[#161616]">{c.name}</h4>
                                            <span className="text-[10px] text-[#76746E] font-mono">{new Date(c.created_at).toLocaleString('es-CO')}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-none text-[8px] font-mono font-bold uppercase tracking-wider border ${
                                            c.status === 'completed' ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' :
                                            c.status === 'sending' ? 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/30' :
                                            c.status === 'paused' ? 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]/30' : 
                                            'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]/30'
                                        }`}>
                                            {c.status}
                                        </span>
                                    </div>

                                    {/* Stats tags */}
                                    <div className="grid grid-cols-4 gap-1.5 mt-3 text-center text-[10px] font-mono border-t border-[#E2DFD7] pt-2">
                                        <div>
                                            <span className="block text-[#161616] font-bold">{c.total_targets}</span>
                                            <span className="text-[#76746E] text-[9px] uppercase">Total</span>
                                        </div>
                                        <div>
                                            <span className="block text-[#137333] font-bold">{c.sent_count}</span>
                                            <span className="text-[#76746E] text-[9px] uppercase">Entregas</span>
                                        </div>
                                        <div>
                                            <span className="block text-[#C5221F] font-bold">{c.failed_count}</span>
                                            <span className="text-[#76746E] text-[9px] uppercase">Fallas</span>
                                        </div>
                                        <div>
                                            <span className="block text-[#B06000] font-bold">{c.opt_out_count}</span>
                                            <span className="text-[#76746E] text-[9px] uppercase">Opt-out</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Campaign Detail Logs (Right side) */}
                <div className="lg:col-span-7 space-y-3">
                    <div className="flex justify-between items-center pb-1 border-b border-[#E2DFD7]">
                        <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-[#76746E]">
                            Personalización IA & Envíos en Vivo
                        </h3>
                    </div>

                    {!selectedCampaign ? (
                        <div className="flex flex-col items-center justify-center py-24 border border-[#E2DFD7] bg-white rounded-none text-center shadow-xs space-y-2">
                            <span className="material-symbols-outlined text-[#76746E] text-[40px]">quickreply</span>
                            <p className="text-sm font-serif text-[#161616]">Selecciona una campaña de la lista izquierda</p>
                            <p className="text-xs text-[#76746E] font-mono">Para visualizar los logs de reescrituras de la IA y el estado de entrega en vivo.</p>
                        </div>
                    ) : (
                        <div className="bg-white p-5 rounded-none border border-[#E2DFD7] space-y-4 shadow-xs">
                            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                                <div>
                                    <h4 className="font-serif font-bold text-base text-[#161616]">{selectedCampaign.name}</h4>
                                    <p className="text-[10px] text-[#76746E] font-mono">Segmento: <span className="text-[#161616] font-bold">{selectedCampaign.target_segment.toUpperCase()}</span></p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadLogs(selectedCampaign.id)}
                                    className="p-1.5 text-[#161616] hover:bg-[#FAF8F5] border border-[#E2DFD7] transition cursor-pointer flex items-center justify-center"
                                    title="Actualizar Logs"
                                >
                                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                                </button>
                            </div>

                            {/* Logs listing */}
                            <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                                {logsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <p className="text-xs font-mono text-[#76746E]">Consultando logs de envío...</p>
                                    </div>
                                ) : logs.length === 0 ? (
                                    <p className="text-xs text-[#76746E] py-8 text-center italic font-mono">No hay registros de envío para esta campaña.</p>
                                ) : (
                                    logs.map(log => (
                                        <div key={log.id} className="p-3 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none space-y-1.5 text-xs">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-[#161616] font-serif">{log.customer_name}</span>
                                                    <span className="text-[10px] text-[#76746E] ml-2 font-mono">+{log.customer_phone}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-none text-[8px] font-mono font-bold uppercase tracking-wider border ${
                                                    log.status === 'sent' ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' :
                                                    log.status === 'failed' ? 'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]/30' :
                                                    log.status === 'opt-out' ? 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]/30' : 
                                                    'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/30'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>

                                            {log.rewritten_message ? (
                                                <p className="text-[11px] text-[#161616] bg-white p-2 border border-[#E2DFD7] italic font-sans leading-relaxed">
                                                    "{log.rewritten_message}"
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-[#76746E] italic font-mono">Mensaje en cola de personalización por IA...</p>
                                            )}

                                            {log.sent_at && (
                                                <p className="text-[9px] text-[#76746E] text-right font-mono">
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
            {isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-[#161616]/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-left">
                    <div className="bg-[#F6F4EE] border border-[#161616] max-w-md w-full rounded-none overflow-hidden p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar my-auto">
                        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
                            <div>
                                <span className="text-[10px] font-mono uppercase font-bold text-[#D9381E] tracking-widest block">
                                    NUEVA DIFUSIÓN
                                </span>
                                <h3 className="font-serif font-bold text-xl text-[#161616]">Iniciar Campaña con IA</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[#E2DFD7] transition border-0 cursor-pointer text-[#161616]"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="bg-[#FFF5F5] border border-[#D9381E] text-[#D9381E] text-xs p-3 rounded-none mb-4 font-mono font-bold">
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Nombre de la Campaña *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none font-mono text-xs"
                                    placeholder="Ej: Oferta de Temporada 2026"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Segmento de Clientes Destinatario</label>
                                <select
                                    value={targetSegment}
                                    onChange={(e) => setTargetSegment(e.target.value as any)}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none cursor-pointer font-mono text-xs"
                                >
                                    <option value="all">Todos los Contactos del CRM</option>
                                    <option value="leads">Solamente Leads / Prospectos</option>
                                    <option value="customers">Solamente Clientes Registrados</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">Instrucción o Mensaje Base (Prompt IA) *</label>
                                <textarea
                                    required
                                    value={baseMessage}
                                    onChange={(e) => setBaseMessage(e.target.value)}
                                    rows={4}
                                    className="w-full bg-white border border-[#E2DFD7] p-2.5 rounded-none text-[#161616] focus:border-[#161616] outline-none resize-none font-mono text-xs"
                                    placeholder="Ej: Escribe un mensaje cordial ofreciendo un chequeo visual gratuito y 20% en lentes antirreflejo durante esta semana."
                                />
                                <span className="text-[10px] text-[#76746E] leading-relaxed block font-sans">
                                    💡 <strong>Personalización inteligente:</strong> El modelo de IA reescribirá el mensaje saludando a cada cliente por su nombre de pila registrado en el CRM, generando variaciones de redacción y aplicando pausas aleatorias para garantizar alta entregabilidad.
                                </span>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-[#E2DFD7]">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="px-4 py-2 border border-[#E2DFD7] hover:border-[#161616] text-[#161616] bg-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold text-xs uppercase tracking-wider cursor-pointer transition shadow-xs disabled:opacity-50"
                                >
                                    {actionLoading ? 'Encolando...' : 'Iniciar Difusión'}
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
