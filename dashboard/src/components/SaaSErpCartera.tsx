import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { authFetch as fetch } from '../utils/api';

interface CarteraProps {
  clientId: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  customer_document_number: string;
  total_amount: string;
  status: string;
  payment_method: string;
  installments_count: number;
  installment_frequency: string;
  created_at: string;
}

interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: string;
  status: string;
  paid_amount: string;
  paid_at: string | null;
}

export const SaaSErpCartera: React.FC<CarteraProps> = ({ clientId }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  
  // Modal de transacción
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [actionType, setActionType] = useState<'pay' | 'refinance' | 'accumulate'>('pay');
  const [transactionSuccess, setTransactionSuccess] = useState(false);

  const fetchCreditInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/invoices`);
      const json = await res.json();
      if (json.success) {
        // Filtrar solo las facturas a cuotas
        const creditList = (json.invoices || []).filter((inv: Invoice) => inv.payment_method === 'cuotas');
        setInvoices(creditList);
      }
    } catch (err) {
      console.error("Error al cargar cartera:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditInvoices();
  }, [clientId]);

  const handleSelectInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setLoadingInstallments(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/invoices/${invoice.id}/installments`);
      const json = await res.json();
      if (json.success) {
        setInstallments(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInstallments(false);
    }
  };

  const handleOpenPayModal = (inst: Installment) => {
    setSelectedInstallment(inst);
    const pending = parseFloat(inst.amount) - parseFloat(inst.paid_amount);
    setPayAmount(pending.toFixed(2));
    setActionType('pay');
    setShowPayModal(true);
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedInstallment) return;

    try {
      const res = await fetch(`/api/clients/${clientId}/invoices/${selectedInvoice.id}/installments/${selectedInstallment.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payAmount) || 0,
          actionType: actionType
        })
      });
      const json = await res.json();
      if (json.success) {
        setTransactionSuccess(true);
        setTimeout(() => {
          setTransactionSuccess(false);
          setShowPayModal(false);
          // Refrescar cuotas y listado de facturas
          handleSelectInvoice(selectedInvoice);
          fetchCreditInvoices();
        }, 1500);
      } else {
        alert(json.error || 'Error al procesar la cuota.');
      }
    } catch (err: any) {
      alert('Error de conexión.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline/10 pb-4">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Módulo de Cartera y Cobranza</h3>
          <p className="text-on-surface-variant text-body-md opacity-70">
            Monitorea el plan de amortización, abonos iniciales y acciones negociables de clientes con compras a cuotas.
          </p>
        </div>
        <button 
          onClick={fetchCreditInvoices}
          className="w-9 h-9 bg-surface-container-high/40 hover:bg-surface-variant/40 text-on-surface rounded-xl flex items-center justify-center border border-outline/10 cursor-pointer transition shadow"
          title="Refrescar Cartera"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de deudores */}
        <div className="lg:col-span-1 glass-card p-4 rounded-2xl border border-outline/10 space-y-4">
          <h4 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant ml-1">Facturas Financiadas</h4>
          
          {loading ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">Cargando cuentas...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">No hay facturas a crédito registradas.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {invoices.map((inv) => (
                <div 
                  key={inv.id}
                  onClick={() => handleSelectInvoice(inv)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    selectedInvoice?.id === inv.id 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-surface-container/20 border-outline/10 hover:bg-surface-container/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-xs text-on-surface"># {inv.invoice_number}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      inv.status === 'paid' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                    }`}>
                      {inv.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}
                    </span>
                  </div>
                  <h5 className="font-bold text-sm text-on-surface mt-1 truncate">{inv.customer_name}</h5>
                  <div className="flex justify-between items-end mt-2 pt-2 border-t border-outline/5">
                    <span className="text-[10px] text-on-surface-variant">{inv.installments_count} cuotas ({inv.installment_frequency})</span>
                    <span className="text-xs text-on-surface-variant">Tot: ${parseFloat(inv.total_amount).toLocaleString('es-CO')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plan de amortización */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-outline/10 space-y-4">
          {selectedInvoice ? (
            <>
              <div className="flex justify-between items-start border-b border-outline/5 pb-3">
                <div>
                  <h4 className="font-extrabold text-base text-on-surface">Detalle de Financiación</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Cliente: <strong>{selectedInvoice.customer_name}</strong> | Documento: {selectedInvoice.customer_document_number}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold">Total Facturado</p>
                  <p className="font-extrabold text-sm text-on-surface">${parseFloat(selectedInvoice.total_amount).toLocaleString('es-CO')}</p>
                  {loadingInstallments === false && installments.length > 0 && (
                    <>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold mt-2">Abono Inicial</p>
                      <p className="font-bold text-sm text-green-500">${installments.find(i => i.installment_number === 0)?.amount || '0'}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold mt-2">Saldo Pendiente</p>
                      <p className="font-extrabold text-lg text-primary">${(
                        installments
                          .filter(i => i.installment_number > 0)
                          .reduce((sum, i) => sum + (parseFloat(i.amount) - parseFloat(i.paid_amount)), 0)
                      ).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </>
                  )}
                </div>
              </div>

              {loadingInstallments ? (
                <div className="p-12 text-center text-xs text-on-surface-variant">Cargando cuotas del cliente...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-outline/10 text-on-surface-variant text-[10px] uppercase font-bold">
                        <th className="py-2.5">Cuota #</th>
                        <th className="py-2.5">Fecha Vencimiento</th>
                        <th className="py-2.5 text-right">Valor Cuota</th>
                        <th className="py-2.5 text-right">Abonado</th>
                        <th className="py-2.5 text-center">Estado</th>
                        <th className="py-2.5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline/5 text-xs text-on-surface">
                      {installments.map((inst) => {
                        const amountVal = parseFloat(inst.amount);
                        const paidVal = parseFloat(inst.paid_amount);

                        return (
                          <tr key={inst.id} className="hover:bg-surface-variant/10">
                            <td className="py-3 font-mono font-bold">
                              {inst.installment_number === 0 ? 'Abono Inicial' : `Cuota ${inst.installment_number}`}
                            </td>
                            <td className="py-3">
                              {new Date(inst.due_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-3 text-right font-bold">${amountVal.toLocaleString('es-CO')}</td>
                            <td className="py-3 text-right text-green-500">${paidVal.toLocaleString('es-CO')}</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                inst.status === 'paid' 
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                  : new Date(inst.due_date) < new Date()
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse'
                                    : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                              }`}>
                                {inst.status === 'paid' ? 'PAGADO' : new Date(inst.due_date) < new Date() ? 'VENCIDO' : 'PENDIENTE'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {inst.status !== 'paid' && (
                                <button
                                  onClick={() => handleOpenPayModal(inst)}
                                  className="px-2.5 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1 inline-flex"
                                >
                                  <span className="material-symbols-outlined text-[12px]">point_of_sale</span>
                                  Recibir Pago
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-on-surface-variant/40 space-y-3">
              <span className="material-symbols-outlined text-6xl">payments</span>
              <p className="text-sm font-semibold">Selecciona una factura financiada para ver y liquidar sus cuotas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Transacción sobre Cuota */}
      {showPayModal && selectedInstallment && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3 mb-4">
              <h4 className="font-extrabold text-sm text-on-surface">Procesar Transacción sobre Cuota</h4>
              <button 
                onClick={() => setShowPayModal(false)}
                className="p-1 hover:bg-surface-variant rounded-full text-on-surface-variant cursor-pointer border-0 bg-transparent"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {transactionSuccess ? (
              <div className="p-8 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-green-500 animate-bounce">check_circle</span>
                <p className="font-bold text-sm text-on-surface">Transacción guardada con éxito.</p>
              </div>
            ) : (
              <form onSubmit={handleRegisterPayment} className="space-y-4">
                <div className="p-3 bg-surface-container/50 rounded-xl space-y-1">
                  <p className="text-[11px] text-on-surface-variant">INFORMACIÓN DE LA CUOTA</p>
                  <p className="font-bold text-xs text-on-surface">
                    Cuota #{selectedInstallment.installment_number}
                  </p>
                  <div className="flex justify-between text-xs pt-1">
                    <span>Valor Cuota: <strong>${parseFloat(selectedInstallment.amount).toLocaleString('es-CO')}</strong></span>
                    <span>Saldo Pendiente: <strong>${(parseFloat(selectedInstallment.amount) - parseFloat(selectedInstallment.paid_amount)).toLocaleString('es-CO')}</strong></span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-label-md text-on-surface-variant ml-1">Estrategia / Acción comercial</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full bg-surface-container border border-outline/30 rounded-xl px-4 py-2 text-on-surface focus:border-primary outline-none cursor-pointer text-xs"
                  >
                    <option value="pay">💵 Registrar Abono o Pago Normal</option>
                    <option value="accumulate">🔄 Acumulativa (Mudar saldo a cuota siguiente)</option>
                    <option value="refinance">📅 Alargar Plazo (Mudar saldo a cuota nueva al final)</option>
                  </select>
                </div>

                {actionType === 'pay' && (
                  <div className="space-y-1">
                    <label className="font-label-md text-on-surface-variant ml-1">Monto del Abono ($)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-surface-container border-outline/30 border rounded-xl px-4 py-2 text-on-surface focus:border-primary outline-none text-xs font-bold"
                    />
                  </div>
                )}

                {actionType === 'accumulate' && (
                  <p className="text-[11px] text-orange-400 p-2.5 bg-orange-400/10 rounded-xl">
                    ⚠️ <strong>Nota:</strong> Esta acción marcará la cuota actual como resuelta y trasladará automáticamente su saldo pendiente a la siguiente cuota programada.
                  </p>
                )}

                {actionType === 'refinance' && (
                  <p className="text-[11px] text-blue-400 p-2.5 bg-blue-400/10 rounded-xl">
                    ℹ️ <strong>Nota:</strong> Se creará una cuota adicional al final de la línea de tiempo con la deuda restante de este periodo, extendiendo la fecha original de cobro.
                  </p>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 px-4 py-2 border border-outline/20 text-on-surface font-label-md rounded-xl hover:bg-surface-variant/30 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-on-primary font-label-md rounded-xl hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    Confirmar Transacción
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
