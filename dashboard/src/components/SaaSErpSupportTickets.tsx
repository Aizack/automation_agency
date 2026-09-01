import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface SupportTicket {
  id: string;
  ticket_code: string;
  created_by_user_name: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'ai_fixing' | 'ai_resolved' | 'escalated_human' | 'closed';
  ai_diagnosis?: string;
  ai_action_taken?: string;
  created_at: string;
  updated_at: string;
}

interface SaaSErpSupportTicketsProps {
  clientId: string;
  onClose?: () => void;
}

export const SaaSErpSupportTickets: React.FC<SaaSErpSupportTicketsProps> = ({ clientId, onClose }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario Nuevo Ticket
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AutoFix manual
  const [fixingTicketId, setFixingTicketId] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/support-tickets`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.tickets || []);
      }
    } catch (err) {
      console.error("Error cargando tickets de soporte:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [clientId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/clients/${clientId}/support-tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, description })
      });
      const json = await res.json();
      if (json.success) {
        setIsNewModalOpen(false);
        setTitle('');
        setDescription('');
        fetchTickets();
      } else {
        alert(json.error || 'Error creando ticket de soporte.');
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerAutoFix = async (ticketId: string) => {
    try {
      setFixingTicketId(ticketId);
      const res = await fetch(`/api/clients/${clientId}/support-tickets/${ticketId}/autofix`, {
        method: 'POST'
      });
      const json = await res.json();
      if (json.success) {
        fetchTickets();
      }
    } catch (err) {
      console.error("Error al ejecutar AutoFix:", err);
    } finally {
      setFixingTicketId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ai_resolved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">bolt</span>
            Resuelto por IA ⚡
          </span>
        );
      case 'ai_fixing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30 animate-pulse flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">smart_toy</span>
            IA Evaluando Caso...
          </span>
        );
      case 'escalated_human':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">engineering</span>
            Escalado a Ingeniero 🛠️
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-surface-container-high text-on-surface border border-outline/20">
            Abierto
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Modal / Componente */}
      <div className="flex justify-between items-center border-b border-outline/10 pb-4">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">support_agent</span>
            Soporte Técnico & Tickets AutoFix IA
          </h3>
          <p className="text-on-surface-variant text-body-md opacity-70">
            Reporta cualquier fallo. El agente de IA de autodiagnóstico evaluará el caso y aplicará correcciones seguras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow"
          >
            <span className="material-symbols-outlined text-[16px]">add_task</span>
            Reportar Problema
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-on-surface-variant hover:text-on-surface rounded-xl border border-outline/10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de Tickets */}
      {loading ? (
        <div className="p-12 text-center text-xs text-on-surface-variant">Cargando tickets de soporte...</div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-on-surface-variant/40 space-y-3">
          <span className="material-symbols-outlined text-6xl">verified</span>
          <p className="text-sm font-semibold">No hay tickets de soporte reportados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="glass-card p-5 rounded-2xl border border-outline/20 hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{t.ticket_code}</span>
                  <h4 className="font-extrabold text-sm text-on-surface">{t.title}</h4>
                </div>
                {getStatusBadge(t.status)}
              </div>

              <p className="text-xs text-on-surface-variant">{t.description}</p>

              {/* Diagnóstico y Acción tomada por IA */}
              {(t.ai_diagnosis || t.ai_action_taken) && (
                <div className="bg-surface-container/60 border border-outline/10 p-3 rounded-xl space-y-1.5 text-xs">
                  {t.ai_diagnosis && (
                    <div>
                      <strong className="text-primary font-bold text-[11px] block">Diagnóstico de IA:</strong>
                      <span className="text-on-surface opacity-90">{t.ai_diagnosis}</span>
                    </div>
                  )}
                  {t.ai_action_taken && (
                    <div className="pt-1 border-t border-outline/5">
                      <strong className="text-emerald-400 font-bold text-[11px] block">Acción Ejecutada:</strong>
                      <span className="text-on-surface opacity-90">{t.ai_action_taken}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-on-surface-variant border-t border-outline/5 pt-2">
                <span>Reportado por: <strong>{t.created_by_user_name}</strong> • {new Date(t.created_at).toLocaleString()}</span>
                {t.status === 'ai_fixing' && (
                  <button
                    type="button"
                    disabled={fixingTicketId === t.id}
                    onClick={() => handleTriggerAutoFix(t.id)}
                    className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-[10px] font-bold hover:bg-purple-500/30 cursor-pointer"
                  >
                    {fixingTicketId === t.id ? 'Reevaluando...' : 'Forzar Evaluación IA'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Ticket */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-highest border border-outline/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
              <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">report_problem</span>
                Reportar Problema a Soporte & IA AutoFix
              </h4>
              <button onClick={() => setIsNewModalOpen(false)} className="text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">Título del Problema *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. No me deja cerrar el turno de caja"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface outline-none"
                >
                  <option value="general">General</option>
                  <option value="caja">Turno de Caja / Arqueo</option>
                  <option value="facturacion">Facturación / DIAN</option>
                  <option value="inventario">Inventario / Stock</option>
                  <option value="logistica">Domicilios / Repartidores</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-on-surface-variant">Descripción Detallada del Fallo *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe paso a paso lo que ocurrió para que la IA AutoFix pueda diagnosticar el caso..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-container border border-outline/30 rounded-xl p-2.5 text-xs text-on-surface outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline/10">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-outline/20 text-on-surface font-bold text-xs rounded-xl cursor-pointer hover:bg-surface-container-high"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl cursor-pointer shadow hover:opacity-90"
                >
                  {submitting ? 'Enviando...' : 'Enviar a IA AutoFix'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
