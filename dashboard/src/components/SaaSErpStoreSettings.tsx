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
    </div>
  );
};
