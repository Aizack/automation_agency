import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface StoreSettingsProps {
  clientId: string;
  onProfileUpdated: () => void;
}

export const SaaSErpStoreSettings: React.FC<StoreSettingsProps> = ({ clientId, onProfileUpdated }) => {
  const [storeName, setStoreName] = useState('');
  const [nit, setNit] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [invoiceFooter, setInvoiceFooter] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cargar datos actuales del perfil del cliente
    fetch(`/api/clients/${clientId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setStoreName(json.data.name || '');
          setNit(json.data.nit || '');
          setAddress(json.data.address || '');
          setPhone(json.data.phoneNumber || ''); // Guardado originalmente como phoneNumber
          setEmail(json.data.email || '');
          setInvoiceFooter(json.data.invoiceFooter || '');
        }
      })
      .catch(err => {
        console.error("Error al cargar configuracion comercial:", err);
        setError("No se pudo cargar la configuración de la tienda.");
      });
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}/profile-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          nit,
          address,
          phone_number: phone,
          email,
          invoice_footer: invoiceFooter
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        onProfileUpdated();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(json.error || 'Error al guardar los cambios.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-[#161616]">
      <div className="border-b border-[#E2DFD7] pb-4">
        <h3 className="font-serif font-bold text-2xl text-[#161616] tracking-tight">CONFIGURACIÓN DE PERFIL COMERCIAL</h3>
        <p className="text-xs text-[#666666] mt-1">
          Define la información tributaria y de contacto que aparecerá en tus facturas impresas.
        </p>
      </div>

      {success && (
        <div className="p-4 bg-[#E6F4EA] border border-[#A8DADC] text-[#1E4620] rounded-md text-xs font-semibold flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-[#2E7D32]">check_circle</span>
          ¡Configuración guardada exitosamente!
        </div>
      )}

      {error && (
        <div className="p-4 bg-[#FCE8E6] border border-[#F5C6CB] text-[#C5221F] rounded-md text-xs font-semibold flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-[#C5221F]">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl bg-white border border-[#E2DFD7] p-6 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Nombre / Razón Social Legal del Negocio *</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="ej. Óptica Nuevo Horizonte"
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md px-3.5 py-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] focus:ring-1 focus:ring-[#D9381E] outline-none transition-all font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">NIT / RUT del Negocio</label>
            <input
              type="text"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="ej. 900.123.456-7"
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md px-3.5 py-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] focus:ring-1 focus:ring-[#D9381E] outline-none transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Dirección Comercial</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ej. Calle 45 # 12-34 Local 101"
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md px-3.5 py-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] focus:ring-1 focus:ring-[#D9381E] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Teléfono de Atención</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ej. 573104567890"
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md px-3.5 py-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] focus:ring-1 focus:ring-[#D9381E] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Email Comercial</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ej. contacto@minegocio.com"
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md px-3.5 py-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] focus:ring-1 focus:ring-[#D9381E] outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Términos de Garantía y Pie de Factura</label>
          <textarea
            value={invoiceFooter}
            onChange={(e) => setInvoiceFooter(e.target.value)}
            rows={4}
            placeholder="ej. Garantía de 1 año en monturas por defectos de fabricación. No se aceptan devoluciones de lentes formulados personalizados una vez cortados."
            className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md px-3.5 py-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] focus:ring-1 focus:ring-[#D9381E] outline-none transition-all font-sans resize-none"
          />
          <p className="text-[11px] text-[#777777]">Este texto aparecerá en la parte inferior del recibo térmico de 80mm.</p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#D9381E] hover:bg-[#b82e18] text-white font-bold text-xs px-6 py-2.5 rounded-md flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                Guardando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                Guardar Configuración
              </>
            )}
          </button>
        </div>
      </form>

      {/* Sección Cuentas Bancarias del Negocio */}
      <BankAccountsManager clientId={clientId} />
    </div>
  );
};

const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Nequi',
  'Daviplata',
  'Davivienda',
  'Banco de Bogotá',
  'BBVA Colombia',
  'Banco de Occidente',
  'Banco Popular',
  'Banco AV Villas',
  'Lulo Bank',
  'Nu Colombia (Nubank)',
  'RappiPay',
  'Scotiabank Colpatria',
  'Banco Falabella',
  'Banco Agrario',
  'Bold',
  'Mercado Pago',
  'Otro Banco / Entidad'
];

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder?: string;
  is_active: boolean;
}

const BankAccountsManager: React.FC<{ clientId: string }> = ({ clientId }) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedBankSelect, setSelectedBankSelect] = useState('Bancolombia');
  const [customBankName, setCustomBankName] = useState('');
  const [accountType, setAccountType] = useState('ahorros');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/bank-accounts`);
      const json = await res.json();
      if (json.success) setAccounts(json.accounts || []);
    } catch (err) {
      console.error("Error cargando cuentas bancarias:", err);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
  }, [clientId]);

  const getEffectiveBankName = () => {
    if (selectedBankSelect === 'Otro Banco / Entidad') {
      return customBankName.trim();
    }
    return selectedBankSelect;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveBankName = getEffectiveBankName();
    if (!effectiveBankName || !accountNumber.trim()) {
      alert('Por favor selecciona un banco válido e ingresa el número de cuenta.');
      return;
    }

    try {
      setLoading(true);
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/clients/${clientId}/bank-accounts/${editingId}`
        : `/api/clients/${clientId}/bank-accounts`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_name: effectiveBankName,
          account_type: accountType,
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim()
        })
      });

      const json = await res.json();
      if (json.success) {
        setSelectedBankSelect('Bancolombia');
        setCustomBankName('');
        setAccountNumber('');
        setAccountHolder('');
        setEditingId(null);
        fetchBankAccounts();
      } else {
        alert(json.error || 'Error guardando cuenta bancaria');
      }
    } catch (err) {
      alert('Error de conexión al guardar cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (acc: BankAccount) => {
    setEditingId(acc.id);
    if (COLOMBIAN_BANKS.includes(acc.bank_name)) {
      setSelectedBankSelect(acc.bank_name);
      setCustomBankName('');
    } else {
      setSelectedBankSelect('Otro Banco / Entidad');
      setCustomBankName(acc.bank_name);
    }
    setAccountType(acc.account_type);
    setAccountNumber(acc.account_number);
    setAccountHolder(acc.account_holder || '');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta cuenta bancaria?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/bank-accounts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchBankAccounts();
      } else {
        alert(json.error || 'No se pudo eliminar la cuenta bancaria.');
      }
    } catch (err) {
      console.error('Error eliminando cuenta bancaria:', err);
    }
  };

  return (
    <div className="space-y-5 pt-6 border-t border-[#E2DFD7]">
      <div>
        <h4 className="font-serif font-bold text-xl text-[#161616] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#D9381E] text-[20px]">account_balance</span>
          Cuentas Bancarias del Negocio (para recibir transferencias)
        </h4>
        <p className="text-xs text-[#666666] mt-0.5">
          Registra las cuentas bancarias de la empresa para que aparezcan disponibles al facturar con transferencia.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleSave} className="lg:col-span-5 bg-white border border-[#E2DFD7] p-5 rounded-lg shadow-sm space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Banco / Entidad *</label>
            <select
              required
              value={selectedBankSelect}
              onChange={(e) => setSelectedBankSelect(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md p-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] outline-none cursor-pointer"
            >
              {COLOMBIAN_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {selectedBankSelect === 'Otro Banco / Entidad' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Nombre de Entidad Bancaria *</label>
              <input
                type="text"
                required
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                placeholder="Escribe el nombre de la entidad..."
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md p-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Tipo de Cuenta</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md p-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] outline-none cursor-pointer"
              >
                <option value="ahorros">Ahorros</option>
                <option value="corriente">Corriente</option>
                <option value="nequi">Nequi / Daviplata</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Número *</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="123456789"
                className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md p-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#555]">Titular / NIT</label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Nombre de la empresa o NIT"
              className="w-full bg-[#FAF8F5] border border-[#E2DFD7] rounded-md p-2.5 text-xs text-[#161616] focus:bg-white focus:border-[#D9381E] outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setSelectedBankSelect('Bancolombia'); setCustomBankName(''); setAccountNumber(''); setAccountHolder(''); }}
                className="px-4 py-2 border border-[#E2DFD7] text-xs font-bold text-[#555] hover:bg-[#FAF8F5] rounded-md cursor-pointer transition-all"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white text-xs font-bold rounded-md cursor-pointer shadow-sm transition-all border-0"
            >
              {editingId ? 'Actualizar Cuenta' : 'Agregar Cuenta'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-7 bg-white border border-[#E2DFD7] p-5 rounded-lg shadow-sm space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-[#555]">Cuentas Registradas</h5>
          {accounts.length === 0 ? (
            <p className="text-xs text-[#777777] py-8 text-center italic">No hay cuentas bancarias registradas.</p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {accounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center p-3.5 bg-[#FAF8F5] border border-[#E2DFD7] rounded-md hover:border-[#D9381E]/40 transition-all">
                  <div>
                    <p className="font-bold text-xs text-[#161616]">{acc.bank_name} ({acc.account_type.toUpperCase()})</p>
                    <p className="text-xs text-[#D9381E] font-mono font-bold mt-0.5">#{acc.account_number}</p>
                    {acc.account_holder && <p className="text-[11px] text-[#666666]">{acc.account_holder}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(acc)}
                      className="p-1.5 text-[#555] hover:text-[#161616] hover:bg-white border border-transparent hover:border-[#E2DFD7] rounded cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, acc.id)}
                      className="p-1.5 text-[#C5221F] hover:bg-[#FCE8E6] rounded cursor-pointer border-0 bg-transparent transition-all"
                      title="Eliminar cuenta bancaria"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
