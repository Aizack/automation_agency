import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface StoreSettingsProps {
  clientId: string;
  onProfileUpdated: () => void;
}

export const SaaSErpStoreSettings: React.FC<StoreSettingsProps> = ({ clientId, onProfileUpdated }) => {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-outline/10 pb-4">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Configuración de Perfil Comercial</h3>
          <p className="text-on-surface-variant text-body-md opacity-70">
            Define la información tributaria y de contacto que aparecerá en tus facturas impresas.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          ¡Configuración guardada exitosamente!
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl bg-surface-container/30 border border-outline/10 p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant ml-1">NIT / RUT del Negocio</label>
            <input
              type="text"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="ej. 900.123.456-7"
              className="w-full bg-surface-container border-outline/30 border rounded-xl px-4 py-2.5 text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant ml-1">Dirección Comercial</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ej. Calle 45 # 12-34 Local 101"
              className="w-full bg-surface-container border-outline/30 border rounded-xl px-4 py-2.5 text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant ml-1">Teléfono de Atención</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ej. 573104567890"
              className="w-full bg-surface-container border-outline/30 border rounded-xl px-4 py-2.5 text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant ml-1">Email Comercial</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ej. contacto@minegocio.com"
              className="w-full bg-surface-container border-outline/30 border rounded-xl px-4 py-2.5 text-on-surface focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-label-md text-on-surface-variant ml-1">Términos de Garantía y Pie de Factura</label>
          <textarea
            value={invoiceFooter}
            onChange={(e) => setInvoiceFooter(e.target.value)}
            rows={4}
            placeholder="ej. Garantía de 1 año en monturas por defectos de fabricación. No se aceptan devoluciones de lentes formulados personalizados una vez cortados."
            className="w-full bg-surface-container border-outline/30 border rounded-xl px-4 py-2.5 text-on-surface focus:border-primary outline-none transition-all font-sans text-sm resize-none"
          />
          <p className="text-[10px] text-on-surface-variant opacity-60 ml-1">Este texto aparecerá en la parte inferior del recibo térmico de 80mm.</p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-container text-on-primary-container font-label-md px-6 py-2.5 rounded-xl flex items-center gap-2 primary-glow hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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

      {/* Sección Selector de Temas Dinámicos Open-Design (5 Paletas Visuales) */}
      <ThemeSelectorManager />
    </div>
  );
};

// Componente Selector de Temas Dinámicos Open-Design
const ThemeSelectorManager: React.FC = () => {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem('app_theme') || 'obsidian-gold';
  });

  const themes = [
    {
      id: 'obsidian-gold',
      name: 'Obsidian Gold',
      subtitle: 'Oscuro Lujo & Oro (Predeterminado)',
      bg: '#0d0d0d',
      primary: '#d8a24e',
      border: 'rgba(216, 162, 78, 0.4)',
      tag: 'Lujo / Premium'
    },
    {
      id: 'emerald-lux',
      name: 'Emerald Lux',
      subtitle: 'Verde Esmeralda & Menta',
      bg: '#061a14',
      primary: '#10b981',
      border: 'rgba(52, 211, 153, 0.4)',
      tag: 'Eco / Salud'
    },
    {
      id: 'cyberpunk-neon',
      name: 'Cyberpunk Neon',
      subtitle: 'Neón Morado & Cian Futurista',
      bg: '#090514',
      primary: '#a855f7',
      border: 'rgba(168, 85, 247, 0.4)',
      tag: 'Tech / Neón'
    },
    {
      id: 'royal-light',
      name: 'Royal Light',
      subtitle: 'Modo Claro Pulcro & Azul Rey',
      bg: '#f8fafc',
      primary: '#2563eb',
      border: 'rgba(37, 99, 235, 0.4)',
      tag: 'Corporativo'
    },
    {
      id: 'sunset-violet',
      name: 'Sunset Violet',
      subtitle: 'Violeta Profundo & Rosa Neón',
      bg: '#120b1c',
      primary: '#ec4899',
      border: 'rgba(236, 72, 153, 0.4)',
      tag: 'Boutique / Moda'
    },
    {
      id: 'monolith-noir',
      name: 'Monolith Noir',
      subtitle: 'Neo-Brutalismo & Minimalismo Extremo',
      bg: '#121414',
      primary: '#ffffff',
      border: '#919191',
      tag: 'Neo-Brutalist'
    }
  ];

  const applyTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('app_theme', themeId);
  };

  useEffect(() => {
    const saved = localStorage.getItem('app_theme') || 'obsidian-gold';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  return (
    <div className="space-y-4 pt-6 border-t border-outline/10">
      <div>
        <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">palette</span>
          Personalización Visual & Paleta de Temas (Open-Design Tokens)
        </h4>
        <p className="text-xs text-on-surface-variant opacity-75">
          Selecciona el estilo visual que mejor combine con la identidad corporativa de tu marca. El cambio se aplica instantáneamente.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map((theme) => {
          const isSelected = currentTheme === theme.id;
          return (
            <div
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'border-2 ring-2 ring-primary/40 shadow-xl scale-[1.02]'
                  : 'border-outline/15 hover:border-outline/40 opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: theme.bg,
                borderColor: isSelected ? theme.primary : undefined
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 text-white/80" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                    {theme.tag}
                  </span>
                  <h5 className="font-bold text-sm text-white mt-1.5">{theme.name}</h5>
                  <p className="text-[11px] text-white/70">{theme.subtitle}</p>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.primary }} />
                <div className="w-5 h-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.bg }} />
                <span className="text-[10px] text-white/60 font-mono ml-auto">
                  {isSelected ? '✓ Activo' : 'Haz clic para aplicar'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
  const [bankName, setBankName] = useState('');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim()) return;

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
          bank_name: bankName.trim(),
          account_type: accountType,
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim()
        })
      });

      const json = await res.json();
      if (json.success) {
        setBankName('');
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
    setBankName(acc.bank_name);
    setAccountType(acc.account_type);
    setAccountNumber(acc.account_number);
    setAccountHolder(acc.account_holder || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta cuenta bancaria?')) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/bank-accounts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) fetchBankAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-outline/10">
      <div>
        <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">account_balance</span>
          Cuentas Bancarias del Negocio (para recibir transferencias)
        </h4>
        <p className="text-xs text-on-surface-variant opacity-75">
          Registra las cuentas bancarias de la empresa para que aparezcan disponibles al facturar con transferencia.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <form onSubmit={handleSave} className="lg:col-span-5 bg-surface-container/20 border border-outline/10 p-4 rounded-xl space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase">Banco / Entidad *</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ej: Bancolombia, Nequi, Davivienda"
              className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase">Tipo de Cuenta</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none cursor-pointer"
              >
                <option value="ahorros">Ahorros</option>
                <option value="corriente">Corriente</option>
                <option value="nequi">Nequi / Daviplata</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase">Número *</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="123456789"
                className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-on-surface-variant uppercase">Titular / NIT</label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Nombre de la empresa o NIT"
              className="w-full bg-surface-container border border-outline/20 rounded-lg p-2 text-xs text-on-surface outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={() => { setEditingId(null); setBankName(''); setAccountNumber(''); setAccountHolder(''); }}
                className="px-3 py-1.5 border border-outline/20 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg cursor-pointer border-0 shadow"
            >
              {editingId ? 'Actualizar Cuenta' : 'Agregar Cuenta'}
            </button>
          </div>
        </form>

        <div className="lg:col-span-7 bg-surface-container/20 border border-outline/10 p-4 rounded-xl space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Cuentas Registradas</h5>
          {accounts.length === 0 ? (
            <p className="text-xs text-on-surface-variant opacity-60 py-6 text-center italic">No hay cuentas bancarias registradas.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {accounts.map(acc => (
                <div key={acc.id} className="flex justify-between items-center p-3 bg-surface-container/50 border border-outline/10 rounded-lg">
                  <div>
                    <p className="font-bold text-xs text-on-surface">{acc.bank_name} ({acc.account_type.toUpperCase()})</p>
                    <p className="text-[11px] text-primary font-mono font-bold">#{acc.account_number}</p>
                    {acc.account_holder && <p className="text-[10px] text-on-surface-variant opacity-75">{acc.account_holder}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(acc)}
                      className="p-1 text-on-surface hover:bg-surface-variant/40 rounded cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(acc.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded cursor-pointer"
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
