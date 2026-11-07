import os

# 1. Update SaaSErpCartera.tsx
cartera_path = os.path.join(os.getcwd(), 'dashboard', 'src', 'components', 'SaaSErpCartera.tsx')
with open(cartera_path, 'r', encoding='utf-8') as f:
    cartera_content = f.read()

cartera_content = cartera_content.replace(
    '''        // Filtrar exclusivamente facturas vendidas a crédito o cuotas
        const isCreditInvoice = (inv: Invoice) => {
          const method = (inv.payment_method || '').toLowerCase();
          return ['credito', 'crédito', 'cuotas', 'financiamiento'].includes(method);
        };
        const creditList = (json.invoices || []).filter(isCreditInvoice);
        setInvoices(creditList);

        // Auto-seleccionar la primera pendiente
        const pendingList = creditList.filter((inv: Invoice) => inv.status !== 'paid');''',
    '''        // Filtrar exclusivamente facturas vendidas a crédito o cuotas (excluyendo estrictamente anuladas)
        const isCreditInvoice = (inv: Invoice) => {
          if (inv.status === ('annulled' as any) || inv.status === ('anulada' as any) || (inv.status as any) === 'cancelled') return false;
          const method = (inv.payment_method || '').toLowerCase();
          return ['credito', 'crédito', 'cuotas', 'financiamiento'].includes(method);
        };
        const creditList = (json.invoices || []).filter(isCreditInvoice);
        setInvoices(creditList);

        // Auto-seleccionar la primera pendiente
        const pendingList = creditList.filter((inv: Invoice) => inv.status !== 'paid' && inv.status !== ('annulled' as any) && inv.status !== ('anulada' as any) && (inv.status as any) !== 'cancelled');'''
)

cartera_content = cartera_content.replace(
    '''  // Filtrado por pestaña (Pendientes vs Liquidadas) y búsqueda
  const pendingInvoices = invoices.filter(inv => inv.status !== 'paid');
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');

  const tabInvoices = carteraTab === 'pendientes' ? pendingInvoices : paidInvoices;

  const filteredInvoices = tabInvoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.customer_document_number && inv.customer_document_number.includes(searchQuery))
  );

  const totalCarteraPendiente = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0);''',
    '''  // Filtrado por pestaña (Pendientes vs Liquidadas) excluyendo facturas anuladas
  const activeInvoices = invoices.filter(inv => inv.status !== ('annulled' as any) && inv.status !== ('anulada' as any) && (inv.status as any) !== 'cancelled');
  const pendingInvoices = activeInvoices.filter(inv => inv.status !== 'paid');
  const paidInvoices = activeInvoices.filter(inv => inv.status === 'paid');

  const tabInvoices = carteraTab === 'pendientes' ? pendingInvoices : paidInvoices;

  const filteredInvoices = tabInvoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.customer_document_number && inv.customer_document_number.includes(searchQuery))
  );

  // El saldo pendiente de cartera suma el saldo por cobrar real (balance_due)
  const totalCarteraPendiente = pendingInvoices.reduce((sum, inv) => {
    const balance = parseFloat(String(inv.balance_due ?? inv.total_amount ?? '0'));
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);'''
)

with open(cartera_path, 'w', encoding='utf-8') as f:
    f.write(cartera_content)
print('Updated SaaSErpCartera.tsx')

# 2. Update SaaSErpInvoices.tsx
invoices_path = os.path.join(os.getcwd(), 'dashboard', 'src', 'components', 'SaaSErpInvoices.tsx')
with open(invoices_path, 'r', encoding='utf-8') as f:
    invoices_content = f.read()

target_invoices = '''                {/* Tarjeta Ventas Totales */}
                <div className="bg-white border border-[#E2DFD7] p-6 flex flex-col justify-between transition-all hover:border-[#161616]">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-widest text-[#6B6862] font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#D9381E]">payments</span>
                            VENTAS TOTALES
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 bg-[#FAF8F5] border border-[#E2DFD7] font-mono font-bold text-[#161616] uppercase tracking-wider">
                            Suma de facturación
                        </span>
                    </div>
                    <div className="mt-4">
                        <h2 className="font-serif text-4xl sm:text-5xl text-[#161616] font-normal leading-none font-mono">
                            ${invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h2>
                        <p className="text-[#6B6862] text-xs mt-3 font-sans">Total acumulado de ventas facturadas en sistema</p>
                    </div>
                </div>'''

replacement_invoices = '''                {/* Tarjeta Ventas Totales */}
                {(() => {
                    const activeInvoices = invoices.filter(inv => inv.status !== ('annulled' as any) && inv.status !== ('anulada' as any) && (inv.status as any) !== 'cancelled');
                    const totalFacturado = activeInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
                    const totalRecaudado = activeInvoices.reduce((sum, inv) => {
                        const paid = parseFloat(String(inv.total_paid ?? (inv.status === 'paid' ? inv.total_amount : 0)));
                        return sum + (isNaN(paid) ? 0 : paid);
                    }, 0);
                    const totalCartera = activeInvoices.reduce((sum, inv) => {
                        const balance = parseFloat(String(inv.balance_due ?? 0));
                        return sum + (isNaN(balance) ? 0 : balance);
                    }, 0);

                    return (
                        <div className="bg-white border border-[#E2DFD7] p-6 flex flex-col justify-between transition-all hover:border-[#161616]">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] uppercase tracking-widest text-[#6B6862] font-semibold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-[#D9381E]">payments</span>
                                    VENTAS TOTALES
                                </span>
                                <span className="text-[10px] px-2.5 py-0.5 bg-[#FAF8F5] border border-[#E2DFD7] font-mono font-bold text-[#161616] uppercase tracking-wider">
                                    Facturación Vigente
                                </span>
                            </div>
                            <div className="mt-4">
                                <h2 className="font-serif text-4xl sm:text-5xl text-[#161616] font-normal leading-none font-mono">
                                    ${totalFacturado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </h2>
                                <p className="text-[#6B6862] text-xs mt-2 font-sans">Total acumulado de ventas vigentes (excluye anuladas)</p>

                                {/* Desglose de Recaudo vs Cartera */}
                                <div className="mt-4 pt-3 border-t border-[#E2DFD7] grid grid-cols-2 gap-3">
                                    <div className="bg-[#FAF8F5] p-2.5 border border-[#E2DFD7]">
                                        <span className="text-[10px] uppercase tracking-wider text-[#137333] font-bold block font-mono">
                                            💵 Recaudado en Caja
                                        </span>
                                        <span className="text-sm font-bold font-mono text-[#161616] mt-0.5 block">
                                            ${totalRecaudado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                    <div className="bg-[#FAF8F5] p-2.5 border border-[#E2DFD7]">
                                        <span className="text-[10px] uppercase tracking-wider text-[#D9381E] font-bold block font-mono">
                                            📋 Cartera por Cobrar
                                        </span>
                                        <span className="text-sm font-bold font-mono text-[#161616] mt-0.5 block">
                                            ${totalCartera.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}'''

# Normalize line endings
invoices_norm = invoices_content.replace('\r\n', '\n')
target_norm = target_invoices.replace('\r\n', '\n')
repl_norm = replacement_invoices.replace('\r\n', '\n')

if target_norm in invoices_norm:
    invoices_norm = invoices_norm.replace(target_norm, repl_norm, 1)
    with open(invoices_path, 'w', encoding='utf-8') as f:
        f.write(invoices_norm)
    print('Updated SaaSErpInvoices.tsx')
else:
    print('WARNING: target_invoices not found in SaaSErpInvoices.tsx')

# 3. Update SaaSErpAccounting.tsx
accounting_path = os.path.join(os.getcwd(), 'dashboard', 'src', 'components', 'SaaSErpAccounting.tsx')
with open(accounting_path, 'r', encoding='utf-8') as f:
    acc_content = f.read()

acc_target = '''  const filteredInvoices = invoicesList.filter(inv => {
    if (!tableSearch.trim()) return true;'''

acc_repl = '''  const filteredInvoices = invoicesList
    .filter(inv => inv.status !== 'annulled' && (inv.status as any) !== 'anulada' && inv.status !== 'cancelled')
    .filter(inv => {
    if (!tableSearch.trim()) return true;'''

acc_norm = acc_content.replace('\r\n', '\n')
acc_target_norm = acc_target.replace('\r\n', '\n')
acc_repl_norm = acc_repl.replace('\r\n', '\n')

if acc_target_norm in acc_norm:
    acc_norm = acc_norm.replace(acc_target_norm, acc_repl_norm, 1)
    with open(accounting_path, 'w', encoding='utf-8') as f:
        f.write(acc_norm)
    print('Updated SaaSErpAccounting.tsx')
else:
    print('WARNING: acc_target not found in SaaSErpAccounting.tsx')
