import React, { useState, useEffect } from 'react';
import { authFetch as fetch } from '../utils/api';

interface SaaSErpSupportDocumentsProps {
  clientId: string;
}

interface SupportDocument {
  id: string;
  document_number: string;
  provider_name: string;
  provider_document: string;
  provider_phone: string;
  provider_email: string;
  concept: string;
  gross_amount: number;
  tax_withholding_rate: number;
  tax_withholding_amount: number;
  net_amount: number;
  created_at: string;
  csds?: string;
  status: 'draft' | 'accepted' | 'rejected';
}

export const SaaSErpSupportDocuments: React.FC<SaaSErpSupportDocumentsProps> = ({ clientId }) => {
  const [documents, setDocuments] = useState<SupportDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transmittingId, setTransmittingId] = useState<string | null>(null);

  // Campos del formulario
  const [providerName, setProviderName] = useState('');
  const [providerDocument, setProviderDocument] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerEmail, setProviderEmail] = useState('');
  const [concept, setConcept] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [withholdingRate, setWithholdingRate] = useState('11'); // 11% por defecto para honorarios/servicios

  const token = localStorage.getItem('auth_token');

  const fetchSupportDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Filtrar facturas que sean Documentos Soporte (DS)
        const dsList = (data.invoices || [])
          .filter((inv: any) => inv.invoice_number?.startsWith('DS') || inv.document_type === 'DS')
          .map((inv: any) => ({
            id: inv.id,
            document_number: inv.invoice_number,
            provider_name: inv.customer_name,
            provider_document: inv.customer_document_number,
            provider_phone: inv.customer_phone,
            provider_email: inv.customer_email,
            concept: 'Adquisición a Persona Natural No Obligada a Facturar',
            gross_amount: parseFloat(inv.total_amount || '0'),
            tax_withholding_rate: 11,
            tax_withholding_amount: Math.round(parseFloat(inv.total_amount || '0') * 0.11),
            net_amount: Math.round(parseFloat(inv.total_amount || '0') * 0.89),
            created_at: inv.created_at,
            csds: inv.cufe,
            status: inv.electronic_status === 'accepted' ? 'accepted' : 'draft'
          }));
        setDocuments(dsList);
      }
    } catch (err) {
      console.error("Error al cargar documentos soporte:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportDocuments();
  }, [clientId]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName || !providerDocument || !grossAmount) {
      alert("Por favor diligencia el nombre, cédula y monto bruto del proveedor.");
      return;
    }

    try {
      setLoading(true);
      const gross = parseFloat(grossAmount) || 0;

      const nextNum = `DS-${Date.now().toString().slice(-4)}`;

      const res = await fetch(`/api/clients/${clientId}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoiceNumber: nextNum,
          customerName: providerName,
          customerDocumentType: 'CC',
          customerDocumentNumber: providerDocument,
          customerPhone: providerPhone || '3000000000',
          customerEmail: providerEmail || 'proveedor@correo.com',
          dueDate: new Date().toISOString().split('T')[0],
          totalAmount: gross,
          paymentMethod: 'efectivo',
          items: [{
            productName: concept || 'Servicios Profesionales / Bienes Persona Natural',
            quantity: 1,
            price: gross,
            productType: 'service'
          }],
          document_type: 'DS'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Documento Soporte ${nextNum} creado con éxito.`);
        setIsFormOpen(false);
        setProviderName('');
        setProviderDocument('');
        setProviderPhone('');
        setProviderEmail('');
        setConcept('');
        setGrossAmount('');
        fetchSupportDocuments();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("Error al crear el documento soporte.");
    } finally {
      setLoading(false);
    }
  };

  const handleTransmitDIAN = async (docId: string) => {
    try {
      setTransmittingId(docId);
      const res = await fetch(`/api/clients/${clientId}/invoices/${docId}/electronic`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Documento Soporte transmitido y validado exitosamente ante la DIAN (CSDS generado).");
        fetchSupportDocuments();
      } else {
        alert(`Error en transmisión DIAN: ${data.error}`);
      }
    } catch (err) {
      alert("Error en comunicación con DIAN.");
    } finally {
      setTransmittingId(null);
    }
  };

  const formatCOP = (amt: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline/10 pb-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">description</span>
            Documentos Soporte Electrónicos (DS)
          </h2>
          <p className="text-xs text-on-surface-variant opacity-75">
            Soporta fiscalmente tus compras y contratación a Personas Naturales no obligadas a facturar (Res. 000167 de 2021 DIAN).
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-lg hover:opacity-90 transition flex items-center gap-2 cursor-pointer border-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Crear Documento Soporte
        </button>
      </div>

      {/* Tabla de Documentos Soporte */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-on-surface-variant text-[48px] opacity-40">assignment_turned_in</span>
          <p className="text-sm text-on-surface-variant">No registras Documentos Soporte emitidos todavía.</p>
          <p className="text-xs text-on-surface-variant opacity-60 max-w-md mx-auto">
            Utiliza este módulo cada vez que contrates un servicio profesional, mantenimiento o compra a una persona natural que no emita factura electrónica.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container/50 border-b border-outline/10 text-xs text-on-surface-variant uppercase font-semibold">
                <th className="p-4">N° Documento</th>
                <th className="p-4">Proveedor / Contratista</th>
                <th className="p-4">Valor Bruto</th>
                <th className="p-4">Retefuente</th>
                <th className="p-4">Valor Neto</th>
                <th className="p-4">Estado DIAN</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10 text-sm">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-container/40 transition">
                  <td className="p-4 font-mono font-bold text-xs text-primary">{doc.document_number}</td>
                  <td className="p-4">
                    <p className="font-bold text-on-surface text-xs">{doc.provider_name}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono">C.C. {doc.provider_document}</p>
                  </td>
                  <td className="p-4 font-mono text-xs">{formatCOP(doc.gross_amount)}</td>
                  <td className="p-4 font-mono text-xs text-amber-400">-{formatCOP(doc.tax_withholding_amount)} ({doc.tax_withholding_rate}%)</td>
                  <td className="p-4 font-mono font-bold text-xs text-green-400">{formatCOP(doc.net_amount)}</td>
                  <td className="p-4">
                    {doc.status === 'accepted' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1 w-fit">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        Aceptado DIAN
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
                        Borrador
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {doc.status !== 'accepted' && (
                      <button
                        onClick={() => handleTransmitDIAN(doc.id)}
                        disabled={transmittingId === doc.id}
                        className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary font-bold text-xs rounded-lg transition border border-primary/30 cursor-pointer"
                      >
                        {transmittingId === doc.id ? 'Transmitiendo...' : 'Emitir a DIAN'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nuevo Documento Soporte */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface border border-outline/20 p-6 rounded-3xl w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto">
            <div className="flex justify-between items-center border-b border-outline/10 pb-3">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">post_add</span>
                Nuevo Documento Soporte Electrónico
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-on-surface-variant hover:text-on-surface bg-transparent border-0 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Nombre Completo del Contratista / Proveedor *</label>
                <input
                  type="text"
                  placeholder="Ej: Fernando Carrillo"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Cédula (C.C. / NIT) *</label>
                  <input
                    type="text"
                    placeholder="Ej: 1143467534"
                    value={providerDocument}
                    onChange={(e) => setProviderDocument(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Celular / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 3001234567"
                    value={providerPhone}
                    onChange={(e) => setProviderPhone(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-on-surface-variant">Concepto del Servicio o Compra</label>
                <input
                  type="text"
                  placeholder="Ej: Asistencia técnica de sistemas / Honorarios de mantenimiento"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Valor Bruto (\$ COP) *</label>
                  <input
                    type="number"
                    placeholder="Ej: 3535000"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-on-surface-variant">Retención en la Fuente %</label>
                  <select
                    value={withholdingRate}
                    onChange={(e) => setWithholdingRate(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-2.5 text-on-surface outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="0">0% (Sin retención)</option>
                    <option value="4">4% (Servicios generales)</option>
                    <option value="10">10% (Honorarios declarar)</option>
                    <option value="11">11% (Honorarios no declarar)</option>
                  </select>
                </div>
              </div>

              {grossAmount && (
                <div className="p-3 bg-surface-container/50 rounded-xl border border-outline/10 font-mono text-xs space-y-1">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Valor Bruto:</span>
                    <span>{formatCOP(parseFloat(grossAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Retefuente ({withholdingRate}%):</span>
                    <span>-{formatCOP(Math.round((parseFloat(grossAmount) || 0) * (parseFloat(withholdingRate) / 100)))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-green-400 border-t border-outline/10 pt-1 text-sm">
                    <span>Neto a Pagar:</span>
                    <span>{formatCOP(Math.round((parseFloat(grossAmount) || 0) * (1 - parseFloat(withholdingRate) / 100)))}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-outline/10">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-outline/20 rounded-xl text-on-surface text-xs hover:bg-surface-container cursor-pointer bg-transparent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-on-primary font-bold rounded-xl text-xs hover:opacity-90 transition cursor-pointer border-0"
                >
                  Crear Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
