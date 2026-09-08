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

export const SaaSErpCartera: React.FC<CarteraProps> = ({ clientId: rawClientId }) => {
  const clientId = (rawClientId && rawClientId !== 'undefined')
    ? rawClientId
    : (localStorage.getItem('current_client_id') || localStorage.getItem('emp_client_id') || 'client_test_optica');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [carteraTab, setCarteraTab] = useState<'pendientes' | 'liquidadas'>('pendientes');
  
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
        // Filtrar exclusivamente facturas vendidas a crédito o cuotas
        const isCreditInvoice = (inv: Invoice) => {
          const method = (inv.payment_method || '').toLowerCase();
          return ['credito', 'crédito', 'cuotas', 'financiamiento'].includes(method);
        };
        const creditList = (json.invoices || []).filter(isCreditInvoice);
        setInvoices(creditList);

        // Auto-seleccionar la primera pendiente
        const pendingList = creditList.filter((inv: Invoice) => inv.status !== 'paid');
        if (pendingList.length > 0) {
          handleSelectInvoice(pendingList[0]);
        } else if (creditList.length > 0) {
          handleSelectInvoice(creditList[0]);
        } else {
          setSelectedInvoice(null);
          setInstallments([]);
        }
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

  const formatCOP = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val || '0') : val;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(num);
  };

  // Filtrado por pestaña (Pendientes vs Liquidadas) y búsqueda
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  const tabInvoices = carteraTab === 'pendientes' ? pendingInvoices : paidInvoices;

  const filteredInvoices = tabInvoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.customer_document_number && inv.customer_document_number.includes(searchQuery))
  );

  const totalCarteraPendiente = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0);

  return (
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header Editorial Wabi-Sabi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DFD7] pb-4">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            GESTIÓN DE CRÉDITOS & CUOTAS
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#161616] tracking-tight leading-none">
            Módulo de Cartera & Cobranza
          </h2>
          <p className="text-xs text-[#76746E] mt-1.5">
            Monitorea el plan de amortización, abonos iniciales y cobro de cuotas a clientes con compras financiadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={fetchCreditInvoices}
            className="px-3.5 py-2 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] hover:border-[#161616] rounded-none flex items-center justify-center transition cursor-pointer text-xs font-mono font-bold uppercase tracking-wider shadow-xs"
            title="Refrescar Cartera"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">refresh</span>
            Refrescar
          </button>
        </div>
      </div>

      {/* KPI Cards Consolidado de Cartera */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Total Cartera por Cobrar</span>
          <p className="text-2xl font-bold font-mono text-[#D9381E] mt-1">{formatCOP(totalCarteraPendiente)}</p>
          <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
            Saldo pendiente en facturas a crédito
          </p>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Créditos Pendientes</span>
          <p className="text-2xl font-bold font-mono text-[#161616] mt-1">{pendingInvoices.length} Facturas</p>
          <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
            Clientes con cuotas activas por recaudar
          </p>
        </div>

        <div className="bg-white border border-[#E2DFD7] p-4.5 rounded-none flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-[#76746E] font-mono font-bold uppercase tracking-wider">Créditos Liquidados</span>
          <p className="text-2xl font-bold font-mono text-[#137333] mt-1">{paidInvoices.length} Finalizados</p>
          <p className="text-[10px] text-[#76746E] font-mono mt-2 border-t border-[#E2DFD7] pt-1.5">
            Créditos pagados al 100%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de deudores */}
        <div className="lg:col-span-5 bg-white p-4 rounded-none border border-[#E2DFD7] space-y-3 shadow-xs">
          {/* Sub-pestañas de Cartera: Pendientes vs Liquidadas */}
          <div className="flex border-b border-[#E2DFD7] gap-2 select-none pb-2">
            <button
              type="button"
              onClick={() => {
                setCarteraTab('pendientes');
                if (pendingInvoices.length > 0) handleSelectInvoice(pendingInvoices[0]);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer border ${
                carteraTab === 'pendientes'
                  ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                  : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] border-[#E2DFD7]'
              }`}
            >
              Pendientes ({pendingInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setCarteraTab('liquidadas');
                if (paidInvoices.length > 0) handleSelectInvoice(paidInvoices[0]);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer border ${
                carteraTab === 'liquidadas'
                  ? 'bg-[#161616] text-[#F6F4EE] border-[#161616]'
                  : 'bg-[#FAF8F5] text-[#76746E] hover:text-[#161616] border-[#E2DFD7]'
              }`}
            >
              Liquidadas ({paidInvoices.length})
            </button>
          </div>

          {/* Search box */}
          <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#E2DFD7] px-2.5 py-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#76746E]">search</span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente o factura..."
              className="bg-transparent text-xs text-[#161616] outline-none w-full font-mono placeholder:text-[#76746E]"
            />
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando cartera...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#76746E] font-mono">
              {carteraTab === 'pendientes' ? 'No hay facturas a crédito pendientes de cobro.' : 'No hay créditos liquidados aún.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredInvoices.map((inv) => {
                const isSelected = selectedInvoice?.id === inv.id;
                return (
                  <div 
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className={`p-3.5 rounded-none border cursor-pointer transition shadow-xs relative ${
                      isSelected 
                        ? 'bg-[#FAF8F5] border-[#161616] ring-1 ring-[#161616]' 
                        : 'bg-white border-[#E2DFD7] hover:border-[#161616]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-mono font-bold text-xs text-[#161616]">#{inv.invoice_number}</p>
                      <span className={`px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider border ${
                        inv.status === 'paid' 
                          ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' 
                          : 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]/30'
                      }`}>
                        {inv.status === 'paid' ? 'PAGADA' : 'PENDIENTE'}
                      </span>
                    </div>
                    <h5 className="font-serif font-bold text-sm text-[#161616] mt-1.5 truncate">{inv.customer_name}</h5>
                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-[#E2DFD7] text-[11px]">
                      <span className="text-[#76746E] font-mono">
                        {inv.installments_count ? `${inv.installments_count} cuotas` : 'Crédito'} {inv.installment_frequency ? `(${inv.installment_frequency})` : ''}
                      </span>
                      <span className="font-mono font-bold text-[#D9381E]">{formatCOP(inv.total_amount)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan de amortización */}
        <div className="lg:col-span-7 bg-white p-6 rounded-none border border-[#E2DFD7] space-y-4 shadow-xs">
          {selectedInvoice ? (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E2DFD7] pb-4 gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#D9381E] font-bold block">PLAN DE AMORTIZACIÓN</span>
                  <h4 className="font-serif font-bold text-xl text-[#161616] mt-0.5">{selectedInvoice.customer_name}</h4>
                  <p className="text-xs text-[#76746E] font-mono mt-0.5">
                    Factura: <strong className="text-[#161616]">#{selectedInvoice.invoice_number}</strong> | Doc: {selectedInvoice.customer_document_number || 'N/A'}
                  </p>
                </div>
                <div className="text-right space-y-1 bg-[#FAF8F5] p-3 border border-[#E2DFD7] min-w-[220px]">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#76746E]">Total Facturado:</span>
                    <span className="font-mono font-bold text-[#161616]">{formatCOP(selectedInvoice.total_amount)}</span>
                  </div>
                  {loadingInstallments === false && installments.length > 0 && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#76746E]">Abono Inicial:</span>
                        <span className="font-mono font-bold text-[#137333]">{formatCOP(installments.find(i => i.installment_number === 0)?.amount || '0')}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-[#E2DFD7] pt-1 mt-1">
                        <span className="font-bold text-[#D9381E]">Saldo Pendiente:</span>
                        <span className="font-mono font-bold text-sm text-[#D9381E]">{formatCOP(
                          installments
                            .filter(i => i.installment_number > 0)
                            .reduce((sum, i) => sum + (parseFloat(i.amount) - parseFloat(i.paid_amount)), 0)
                        )}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {loadingInstallments ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-2">
                  <div className="w-6 h-6 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando cuotas del cliente...</p>
                </div>
              ) : installments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#76746E] font-mono">
                  No hay tabla de cuotas discriminada para esta factura.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[#76746E] font-mono text-[10px] uppercase font-bold tracking-wider">
                        <th className="p-3">Cuota #</th>
                        <th className="p-3">Vencimiento</th>
                        <th className="p-3 text-right">Valor Cuota</th>
                        <th className="p-3 text-right">Abonado</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2DFD7]">
                      {installments.map((inst) => {
                        const amountVal = parseFloat(inst.amount);
                        const paidVal = parseFloat(inst.paid_amount);

                        return (
                          <tr key={inst.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="p-3 font-mono font-bold text-[#161616]">
                              {inst.installment_number === 0 ? 'Abono Inicial' : `Cuota #${inst.installment_number}`}
                            </td>
                            <td className="p-3 font-mono text-[#76746E]">
                              {new Date(inst.due_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-[#161616]">{formatCOP(amountVal)}</td>
                            <td className="p-3 text-right font-mono font-bold text-[#137333]">{formatCOP(paidVal)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                inst.status === 'paid' 
                                  ? 'bg-[#E6F4EA] text-[#137333] border-[#137333]/30' 
                                  : new Date(inst.due_date) < new Date()
                                    ? 'bg-[#FCE8E6] text-[#C5221F] border-[#C5221F]/30'
                                    : 'bg-[#FEF7E0] text-[#B06000] border-[#B06000]/30'
                              }`}>
                                {inst.status === 'paid' ? 'PAGADO' : new Date(inst.due_date) < new Date() ? 'VENCIDO' : 'PENDIENTE'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {inst.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayModal(inst)}
                                  className="px-2.5 py-1 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] text-[10px] font-mono font-bold rounded-none transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs uppercase tracking-wider border-0"
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
            <div className="flex flex-col items-center justify-center py-20 text-[#76746E] space-y-2 text-center">
              <span className="material-symbols-outlined text-4xl text-[#76746E]/40">payments</span>
              <p className="font-serif text-sm font-bold text-[#161616]">Selecciona una factura financiada</p>
              <p className="text-xs text-[#76746E] font-mono">Haz clic en una factura de la izquierda para ver y liquidar sus cuotas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Transacción sobre Cuota */}
      {showPayModal && selectedInstallment && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#161616]/60 backdrop-blur-xs p-4 text-left animate-fade-in">
          <div className="bg-[#F6F4EE] border border-[#161616] rounded-none w-full max-w-md p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">GESTIÓN DE COBRO</span>
                <h4 className="font-serif font-bold text-lg text-[#161616]">Procesar Transacción sobre Cuota</h4>
              </div>
              <button 
                type="button"
                onClick={() => setShowPayModal(false)}
                className="p-1 text-[#76746E] hover:text-[#161616] cursor-pointer border-0 bg-transparent"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {transactionSuccess ? (
              <div className="p-8 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-[#137333]">check_circle</span>
                <p className="font-serif font-bold text-sm text-[#161616]">Transacción guardada con éxito.</p>
              </div>
            ) : (
              <form onSubmit={handleRegisterPayment} className="space-y-4 text-xs">
                <div className="p-3.5 bg-white border border-[#E2DFD7] rounded-none space-y-1 shadow-xs">
                  <p className="text-[10px] font-mono font-bold text-[#76746E] uppercase tracking-wider">INFORMACIÓN DE LA CUOTA</p>
                  <p className="font-bold font-serif text-sm text-[#161616]">
                    Cuota #{selectedInstallment.installment_number}
                  </p>
                  <div className="flex justify-between text-xs pt-1 font-mono">
                    <span>Valor Cuota: <strong className="text-[#161616]">{formatCOP(selectedInstallment.amount)}</strong></span>
                    <span>Saldo: <strong className="text-[#D9381E]">{formatCOP(parseFloat(selectedInstallment.amount) - parseFloat(selectedInstallment.paid_amount))}</strong></span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Estrategia / Acción Comercial
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as any)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none px-3 py-2 text-[#161616] focus:border-[#161616] outline-none cursor-pointer text-xs font-mono"
                  >
                    <option value="pay">💵 Registrar Abono o Pago Normal</option>
                    <option value="accumulate">🔄 Acumulativa (Mudar saldo a cuota siguiente)</option>
                    <option value="refinance">📅 Alargar Plazo (Mudar saldo a cuota nueva al final)</option>
                  </select>
                </div>

                {actionType === 'pay' && (
                  <div className="space-y-1">
                    <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                      Monto del Abono ($ COP)
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-white border border-[#E2DFD7] rounded-none px-3 py-2 text-[#161616] focus:border-[#161616] outline-none text-xs font-mono font-bold"
                    />
                  </div>
                )}

                {actionType === 'accumulate' && (
                  <p className="text-[11px] text-[#B06000] p-2.5 bg-[#FEF7E0] border border-[#B06000]/30 rounded-none font-mono">
                    ⚠️ <strong>Nota:</strong> Esta acción marcará la cuota actual como resuelta y trasladará automáticamente su saldo pendiente a la siguiente cuota programada.
                  </p>
                )}

                {actionType === 'refinance' && (
                  <p className="text-[11px] text-[#161616] p-2.5 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none font-mono">
                    ℹ️ <strong>Nota:</strong> Se creará una cuota adicional al final de la línea de tiempo con la deuda restante de este periodo, extendiendo la fecha original de cobro.
                  </p>
                )}

                <div className="pt-2 flex gap-3 border-t border-[#E2DFD7]">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    className="flex-1 px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold rounded-none hover:bg-[#FAF8F5] text-xs cursor-pointer uppercase tracking-wider shadow-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#161616] hover:bg-[#2b2b2b] text-[#F6F4EE] font-mono font-bold rounded-none transition text-xs cursor-pointer uppercase tracking-wider shadow-xs border-0"
                  >
                    Confirmar
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
