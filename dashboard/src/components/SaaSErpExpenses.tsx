import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface SaaSErpExpensesProps {
  clientId: string;
}

interface FixedExpense {
  id: string;
  concept: string;
  category: string;
  expense_type?: 'fijo' | 'ocasional';
  expense_date?: string;
  effective_date?: string;
  amount: string;
  notes?: string;
  created_at: string;
}

export const SaaSErpExpenses: React.FC<SaaSErpExpensesProps> = ({ clientId }) => {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del Formulario de Registro de Gasto
  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('operativo');
  const [expenseType, setExpenseType] = useState<'fijo' | 'ocasional'>('fijo');
  const [expenseDate, setExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtro del historial
  const [filterType, setFilterType] = useState<'todos' | 'fijo' | 'ocasional'>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/fixed-expenses`);
      const json = await res.json();
      if (json.success) {
        setFixedExpenses(json.expenses || []);
      }
    } catch (err) {
      console.error("Error al cargar lista de gastos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [clientId]);

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseConcept || !expenseAmount) return;
    try {
      setSavingExpense(true);
      setSuccessMessage(null);

      const res = await fetch(`/api/clients/${clientId}/fixed-expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: expenseConcept,
          category: expenseCategory,
          expense_type: expenseType,
          expense_date: expenseDate,
          amount: parseFloat(expenseAmount),
          notes: expenseNotes
        })
      });

      const json = await res.json();
      if (json.success) {
        setExpenseConcept('');
        setExpenseAmount('');
        setExpenseNotes('');
        setExpenseDate(new Date().toISOString().split('T')[0]);
        setExpenseType('fijo');
        setExpenseCategory('operativo');
        setSuccessMessage('¡Gasto registrado exitosamente!');
        setTimeout(() => setSuccessMessage(null), 4000);
        fetchExpenses();
      } else {
        alert(json.error || 'Error al guardar gasto.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de gasto?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/fixed-expenses/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchExpenses();
      } else {
        alert(json.error || 'No se pudo eliminar el gasto.');
      }
    } catch (err) {
      console.error('Error borrando gasto:', err);
    }
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(amount);
  };

  // Filtrado de gastos para el historial
  const filteredExpenses = fixedExpenses.filter(item => {
    if (filterType !== 'todos' && item.expense_type !== filterType) return false;
    if (filterCategory !== 'todas' && item.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const conceptMatch = item.concept.toLowerCase().includes(q);
      const notesMatch = (item.notes || '').toLowerCase().includes(q);
      const catMatch = item.category.toLowerCase().includes(q);
      if (!conceptMatch && !notesMatch && !catMatch) return false;
    }
    return true;
  });

  const totalFilteredSum = filteredExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);

  return (
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header Wabi-Sabi */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            EGRESOS & COSTOS OPERATIVOS
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#161616] tracking-tight leading-none flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#D9381E] text-[30px]">receipt_long</span>
            Registro de Gastos
          </h2>
          <p className="text-xs text-[#76746E] mt-2">
            Módulo para la declaración y control de gastos fijos y ocasionales (arriendo, servicios públicos, mantenimiento, insumos).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchExpenses}
            className="h-9 px-3.5 bg-white border border-[#E2DFD7] hover:bg-[#FAF8F5] text-xs font-mono font-bold text-[#161616] flex items-center gap-1.5 transition cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            Refrescar Historial
          </button>
        </div>
      </div>

      {/* Alerta de éxito al guardar */}
      {successMessage && (
        <div className="bg-[#FAF8F5] border-l-4 border-emerald-600 p-3.5 border-y border-r border-[#E2DFD7] text-emerald-800 text-xs font-mono flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
            <span className="font-bold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="cursor-pointer hover:opacity-75 border-0 bg-transparent text-[#76746E]">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Layout de 2 columnas: Formulario Inline & Historial de Gastos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Formulario de Registro de Gasto (Inline) */}
        <div className="lg:col-span-5 bg-white border border-[#E2DFD7] p-6 shadow-xs space-y-5">
          <div className="border-b border-[#E2DFD7] pb-3">
            <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">NUEVO REGISTRO DE EGRESO</span>
            <h3 className="font-serif text-xl font-bold text-[#161616] flex items-center gap-2 mt-0.5">
              <span className="material-symbols-outlined text-[#D9381E] text-[22px]">add_circle</span>
              Formulario de Registro
            </h3>
          </div>

          <form onSubmit={handleAddFixedExpense} className="space-y-4 text-xs">
            {/* Selector de Tipo de Gasto */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Tipo de Gasto *</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#FAF8F5] border border-[#E2DFD7] rounded-none">
                <button
                  type="button"
                  onClick={() => setExpenseType('fijo')}
                  className={`py-2 px-3 text-xs font-mono font-bold rounded-none transition border-0 cursor-pointer uppercase tracking-wider ${
                    expenseType === 'fijo' 
                      ? 'bg-[#161616] text-[#F6F4EE] shadow-xs' 
                      : 'bg-transparent text-[#76746E] hover:text-[#161616]'
                  }`}
                >
                  <span>📌 Fijo Recurrente</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseType('ocasional')}
                  className={`py-2 px-3 text-xs font-mono font-bold rounded-none transition border-0 cursor-pointer uppercase tracking-wider ${
                    expenseType === 'ocasional' 
                      ? 'bg-[#161616] text-[#F6F4EE] shadow-xs' 
                      : 'bg-transparent text-[#76746E] hover:text-[#161616]'
                  }`}
                >
                  <span>⚡ Ocasional</span>
                </button>
              </div>
            </div>

            {/* Concepto del Gasto */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Concepto del Gasto *</label>
              <input
                type="text"
                required
                placeholder={expenseType === 'fijo' ? "Ej. Arriendo de Local, Servicios Públicos, Internet" : "Ej. Reparación de equipo, Papelería, Mantenimiento"}
                value={expenseConcept}
                onChange={(e) => setExpenseConcept(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] focus:bg-white rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] transition-colors font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Categoría */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Categoría</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] focus:bg-white rounded-none p-2.5 text-xs text-[#161616] outline-none cursor-pointer focus:border-[#161616] font-mono transition-colors"
                >
                  <option value="operativo">Arriendo / Local</option>
                  <option value="servicios">Servicios Públicos</option>
                  <option value="tecnologia">Internet / Software</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="insumos">Insumos / Materiales</option>
                  <option value="transporte">Transporte / Fletes</option>
                  <option value="otros">Otros Gastos</option>
                </select>
              </div>

              {/* Monto ($ COP) */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Monto ($ COP) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="2000000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E2DFD7] focus:bg-white rounded-none p-2.5 text-xs text-[#D9381E] font-mono font-bold outline-none focus:border-[#161616] transition-colors"
                />
              </div>
            </div>

            {/* Fecha del Gasto */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E] flex items-center justify-between">
                <span>Fecha del Gasto *</span>
                <span className="text-[10px] text-[#D9381E] font-bold flex items-center gap-1 font-mono">
                  <span className="material-symbols-outlined text-[13px]">history</span>
                  Imputación Histórica
                </span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] focus:bg-white rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono transition-colors"
              />
            </div>

            {/* Notas Adicionales */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#76746E]">Notas / Justificación</label>
              <textarea
                placeholder="Detalles del gasto, número de factura o comprobante..."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] focus:bg-white rounded-none p-2.5 text-xs text-[#161616] outline-none resize-none h-20 focus:border-[#161616] transition-colors font-sans"
              />
            </div>

            {/* Botón Guardar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={savingExpense}
                className="w-full py-3 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none cursor-pointer shadow-xs transition-all flex items-center justify-center gap-2 border-0 uppercase tracking-wider active:scale-[0.99] disabled:opacity-50"
              >
                {savingExpense ? (
                  <><span className="material-symbols-outlined text-[18px] animate-spin">sync</span> Guardando Gasto...</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">save</span> Registrar Gasto en Sistema</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: Historial de Gastos Registrados */}
        <div className="lg:col-span-7 bg-white border border-[#E2DFD7] p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2DFD7] pb-3">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-[#76746E] uppercase block font-bold">BITÁCORA DE GASTOS</span>
              <h3 className="font-serif text-xl font-bold text-[#161616] flex items-center gap-2 mt-0.5">
                <span className="material-symbols-outlined text-[#D9381E] text-[22px]">account_balance_wallet</span>
                Gastos Registrados
              </h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#76746E] font-mono font-bold uppercase">Total Acumulado</p>
              <p className="text-xl font-bold text-[#D9381E] font-mono">{formatCOP(totalFilteredSum)}</p>
            </div>
          </div>

          {/* Filtros de Busqueda e Historial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-[#FAF8F5] p-3 border border-[#E2DFD7]">
            <div>
              <label className="text-[9px] font-mono font-bold uppercase text-[#76746E] block mb-1">Buscar Concepto</label>
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#E2DFD7] p-2 text-xs font-mono outline-none focus:border-[#161616]"
              />
            </div>

            <div>
              <label className="text-[9px] font-mono font-bold uppercase text-[#76746E] block mb-1">Tipo Gasto</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full bg-white border border-[#E2DFD7] p-2 text-xs font-mono outline-none focus:border-[#161616] cursor-pointer"
              >
                <option value="todos">Todos los Tipos</option>
                <option value="fijo">📌 Fijos Recurrentes</option>
                <option value="ocasional">⚡ Ocasionales</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono font-bold uppercase text-[#76746E] block mb-1">Categoría</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-white border border-[#E2DFD7] p-2 text-xs font-mono outline-none focus:border-[#161616] cursor-pointer"
              >
                <option value="todas">Todas las Categorías</option>
                <option value="operativo">Arriendo / Local</option>
                <option value="servicios">Servicios Públicos</option>
                <option value="tecnologia">Internet / Software</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="insumos">Insumos / Materiales</option>
                <option value="transporte">Transporte / Fletes</option>
                <option value="otros">Otros Gastos</option>
              </select>
            </div>
          </div>

          {/* Lista / Grid de Gastos */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-[#FAF8F5] border border-[#E2DFD7]">
              <div className="w-7 h-7 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando registros de gastos...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-16 text-center bg-[#FAF8F5] border border-[#E2DFD7] p-6 space-y-2">
              <span className="material-symbols-outlined text-3xl text-[#76746E]">payments</span>
              <p className="text-xs text-[#76746E] italic font-mono">
                No hay registros de gastos que coincidan con los criterios.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {filteredExpenses.map((item) => {
                const isOccasional = item.expense_type === 'ocasional';
                const dateStr = item.effective_date || item.expense_date || item.created_at;
                const formattedDate = dateStr ? dateStr.substring(0, 10) : '';

                return (
                  <div key={item.id} className="bg-[#FAF8F5] border border-[#E2DFD7] hover:border-[#161616] p-4 rounded-none flex justify-between items-start transition-colors shadow-xs">
                    <div className="space-y-1 flex-1 pr-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-none border ${
                          isOccasional 
                            ? 'bg-white text-[#161616] border-[#E2DFD7]' 
                            : 'bg-[#FEF7E0] text-[#B45309] border-[#FDE68A]'
                        }`}>
                          {isOccasional ? '⚡ Ocasional' : '📌 Fijo'}
                        </span>
                        <span className="text-[9px] uppercase font-mono font-bold text-[#76746E] px-2 py-0.5 bg-white rounded-none border border-[#E2DFD7]">
                          {item.category}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-[#161616]">{item.concept}</h4>
                      <p className="text-sm font-mono font-bold text-[#D9381E]">{formatCOP(parseFloat(item.amount))}</p>
                      <p className="text-[10px] text-[#76746E] font-mono flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                        Fecha: {formattedDate}
                      </p>
                      {item.notes && <p className="text-[11px] text-[#76746E] italic bg-white p-2 border border-[#E2DFD7] mt-1">{item.notes}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(item.id)}
                      className="text-[#76746E] hover:text-[#D9381E] p-1.5 rounded-none hover:bg-white border border-transparent hover:border-[#E2DFD7] transition cursor-pointer"
                      title="Eliminar gasto"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
