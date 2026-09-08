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
    <div className="space-y-6 text-[#161616] font-sans antialiased">
      {/* Header Editorial Wabi-Sabi */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2DFD7] pb-5">
        <div>
          <span className="text-[11px] font-bold text-[#D9381E] uppercase tracking-widest font-mono block mb-1">
            DOCUMENTOS ELECTRÓNICOS DIAN
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#161616] tracking-tight leading-none flex items-center gap-2">
            <span className="material-symbols-outlined text-[#D9381E] text-[28px]">description</span>
            Documentos Soporte Electrónicos (DS)
          </h2>
          <p className="text-xs text-[#76746E] mt-2">
            Soporta fiscalmente tus compras y contratación a Personas Naturales no obligadas a facturar (Res. 000167 de 2021 DIAN).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchSupportDocuments}
            className="h-9 px-3.5 bg-white hover:bg-[#FAF8F5] text-[#161616] border border-[#E2DFD7] rounded-none flex items-center justify-center transition cursor-pointer text-xs font-mono font-bold uppercase tracking-wider shadow-xs"
            title="Refrescar documentos"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5 text-[#D9381E]">refresh</span>
            Refrescar
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="h-9 px-4 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors flex items-center gap-2 cursor-pointer border-0 uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Crear Documento Soporte
          </button>
        </div>
      </div>

      {/* Tabla de Documentos Soporte */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-[#E2DFD7] rounded-none">
          <div className="w-8 h-8 border-2 border-[#D9381E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-mono uppercase text-[#76746E] tracking-wider">Cargando documentos soporte...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white border border-[#E2DFD7] rounded-none p-16 text-center space-y-3 shadow-xs">
          <span className="material-symbols-outlined text-[#76746E]/40 text-[48px]">assignment_turned_in</span>
          <p className="font-serif text-sm font-bold text-[#161616]">No registras Documentos Soporte emitidos todavía.</p>
          <p className="text-xs text-[#76746E] max-w-md mx-auto">
            Utiliza este módulo cada vez que contrates un servicio profesional, mantenimiento o compra a una persona natural que no emita factura electrónica.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2DFD7] rounded-none overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E2DFD7] text-[10px] font-mono text-[#76746E] uppercase font-bold tracking-wider">
                <th className="p-3.5">N° Documento</th>
                <th className="p-3.5">Proveedor / Contratista</th>
                <th className="p-3.5">Valor Bruto</th>
                <th className="p-3.5">Retefuente</th>
                <th className="p-3.5">Valor Neto</th>
                <th className="p-3.5">Estado DIAN</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-xs text-[#161616] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#D9381E] text-[16px]">receipt</span>
                    {doc.document_number}
                  </td>
                  <td className="p-3.5">
                    <p className="font-serif font-bold text-[#161616] text-sm">{doc.provider_name}</p>
                    <p className="text-[10px] text-[#76746E] font-mono">C.C. {doc.provider_document}</p>
                  </td>
                  <td className="p-3.5 font-mono text-xs text-[#161616]">{formatCOP(doc.gross_amount)}</td>
                  <td className="p-3.5 font-mono text-xs text-[#B45309]">-{formatCOP(doc.tax_withholding_amount)} ({doc.tax_withholding_rate}%)</td>
                  <td className="p-3.5 font-mono font-bold text-xs text-[#137333]">{formatCOP(doc.net_amount)}</td>
                  <td className="p-3.5">
                    {doc.status === 'accepted' ? (
                      <span className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] flex items-center gap-1 w-fit rounded-none">
                        <span className="material-symbols-outlined text-[12px]">verified</span>
                        Aceptado DIAN
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FEF7E0] text-[#B45309] border border-[#FDE68A] w-fit rounded-none">
                        Borrador
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {doc.status !== 'accepted' && (
                      <button
                        onClick={() => handleTransmitDIAN(doc.id)}
                        disabled={transmittingId === doc.id}
                        className="px-3 py-1.5 bg-[#161616] hover:bg-[#2c2f35] text-[#F6F4EE] font-mono font-bold text-xs rounded-none transition-colors border-0 cursor-pointer uppercase tracking-wider shadow-xs"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F6F4EE] border border-[#161616] p-6 rounded-none w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar my-auto text-left">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#D9381E] uppercase block font-bold">FACTURA ELECTRÓNICA</span>
                <h3 className="font-serif text-lg font-bold text-[#161616] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#D9381E]">post_add</span>
                  Nuevo Documento Soporte Electrónico
                </h3>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-[#76746E] hover:text-[#161616] bg-transparent border-0 cursor-pointer p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Nombre Completo del Contratista / Proveedor *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Fernando Carrillo"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Cédula (C.C. / NIT) *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 1143467534"
                    value={providerDocument}
                    onChange={(e) => setProviderDocument(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Celular / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 3001234567"
                    value={providerPhone}
                    onChange={(e) => setProviderPhone(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                  Concepto del Servicio o Compra
                </label>
                <input
                  type="text"
                  placeholder="Ej: Asistencia técnica de sistemas / Honorarios de mantenimiento"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Valor Bruto ($ COP) *
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 3535000"
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono font-bold uppercase text-[10px] text-[#76746E] tracking-wider block">
                    Retención en la Fuente %
                  </label>
                  <select
                    value={withholdingRate}
                    onChange={(e) => setWithholdingRate(e.target.value)}
                    className="w-full bg-white border border-[#E2DFD7] rounded-none p-2.5 text-xs text-[#161616] outline-none focus:border-[#161616] cursor-pointer font-mono"
                  >
                    <option value="0">0% (Sin retención)</option>
                    <option value="4">4% (Servicios generales)</option>
                    <option value="10">10% (Honorarios declarar)</option>
                    <option value="11">11% (Honorarios no declarar)</option>
                  </select>
                </div>
              </div>

              {grossAmount && (
                <div className="p-3.5 bg-white rounded-none border border-[#E2DFD7] font-mono text-xs space-y-1.5 shadow-xs">
                  <div className="flex justify-between text-[#76746E]">
                    <span>Valor Bruto:</span>
                    <span className="text-[#161616]">{formatCOP(parseFloat(grossAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[#B45309]">
                    <span>Retefuente ({withholdingRate}%):</span>
                    <span>-{formatCOP(Math.round((parseFloat(grossAmount) || 0) * (parseFloat(withholdingRate) / 100)))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#137333] border-t border-[#E2DFD7] pt-1.5 text-sm">
                    <span>Neto a Pagar:</span>
                    <span>{formatCOP(Math.round((parseFloat(grossAmount) || 0) * (1 - parseFloat(withholdingRate) / 100)))}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2DFD7]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] bg-white text-[#161616] font-mono font-bold text-xs rounded-none hover:bg-[#FAF8F5] cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D9381E] hover:bg-[#b82e18] text-white font-mono font-bold text-xs rounded-none shadow-xs transition-colors cursor-pointer border-0 uppercase tracking-wider"
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
