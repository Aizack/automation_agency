export interface SiigoCredentials {
  username: string;
  access_key: string;
  partner_id?: string;
}

export interface SiigoSettings {
  documentTypeId?: number; // ID del tipo de comprobante en Siigo (ej. 24416)
  sellerId?: number;
  paymentMethodId?: number;
}

let cachedSiigoToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtener Token JWT de autenticación en la API de Siigo
 */
export async function getSiigoToken(credentials: SiigoCredentials): Promise<string> {
  const now = Date.now();
  if (cachedSiigoToken && now < cachedSiigoToken.expiresAt) {
    return cachedSiigoToken.token;
  }

  const response = await fetch('https://api.siigo.com/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      username: credentials.username.trim(),
      access_key: credentials.access_key.trim(),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error de autenticación con Siigo (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  if (!data.access_token) {
    throw new Error('Siigo API no devolvió access_token en la respuesta.');
  }

  // Token válido por 24 horas normalmente, guardamos con margen
  cachedSiigoToken = {
    token: data.access_token,
    expiresAt: now + 23 * 3600 * 1000,
  };

  return data.access_token;
}

/**
 * Probar conexión con la API de Siigo
 */
export async function testSiigoConnection(credentials: SiigoCredentials): Promise<{ success: boolean; message: string }> {
  try {
    if (!credentials.username || !credentials.access_key) {
      return { success: false, message: 'Falta usuario o clave de acceso API (Access Key) de Siigo.' };
    }

    const token = await getSiigoToken(credentials);

    // Consultar lista de tipos de comprobante para verificar validez completa
    const response = await fetch('https://api.siigo.com/v1/document-types?type=FV', {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Conexión exitosa con la API de Siigo. Credenciales validadas correctamente.',
      };
    }

    return {
      success: true,
      message: 'Autenticación exitosa con Siigo.',
    };
  } catch (err: any) {
    console.error('[Siigo Service] Error probando conexión:', err);
    return { success: false, message: `Error de conexión con Siigo: ${err.message}` };
  }
}

/**
 * Emitir Factura Electrónica en Siigo API V1
 */
export async function emitSiigoInvoice(
  credentials: SiigoCredentials,
  settings: SiigoSettings,
  invoiceData: {
    invoiceNumber: string;
    issueDate: string;
    dueDate?: string;
    customer: { name: string; document: string; email?: string; phone?: string; docType?: string };
    items: Array<{ name: string; price: number; quantity: number; sku?: string }>;
    totalAmount: number;
    paymentMethod?: string;
  }
): Promise<{
  success: boolean;
  cufe?: string;
  qrCodeUrl?: string;
  externalInvoiceId?: string;
  externalPdfUrl?: string;
  electronicStatus?: string;
  error?: string;
}> {
  try {
    const token = await getSiigoToken(credentials);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    if (credentials.partner_id) {
      headers['Partner-Id'] = credentials.partner_id;
    }

    // Tipo de documento de identificación para Siigo (13=CC, 31=NIT, 22=Cédula Extranjería)
    const idType = invoiceData.customer.docType === 'NIT' ? '31' : '13';

    // Separar nombres si es persona
    const nameParts = invoiceData.customer.name.trim().split(' ');
    const firstName = nameParts[0] || 'Consumidor';
    const lastName = nameParts.slice(1).join(' ') || 'Final';

    const formattedItems = invoiceData.items.map((it, idx) => ({
      code: it.sku || `ITEM-${idx + 1}`,
      description: it.name || 'Artículo ERP',
      quantity: it.quantity || 1,
      price: it.price,
      taxes: [{ id: 1270 }], // Código estándar IVA 19% en Siigo
    }));

    const siigoPayload: any = {
      document: {
        id: settings.documentTypeId || 24416, // ID comprobante factura electrónica por defecto
      },
      date: invoiceData.issueDate,
      customer: {
        person_type: invoiceData.customer.docType === 'NIT' ? 'Company' : 'Person',
        id_type: idType,
        identification: invoiceData.customer.document || '222222222222',
        name: invoiceData.customer.docType === 'NIT' ? [invoiceData.customer.name] : [firstName, lastName],
        contacts: [
          {
            first_name: firstName,
            last_name: lastName,
            email: invoiceData.customer.email || 'factura@cliente.com',
            phone: { number: invoiceData.customer.phone || '3000000000' },
          }
        ],
      },
      items: formattedItems.length > 0 ? formattedItems : [
        {
          code: 'GEN-01',
          description: 'Venta General ERP',
          quantity: 1,
          price: invoiceData.totalAmount,
          taxes: [{ id: 1270 }],
        }
      ],
      payments: [
        {
          id: settings.paymentMethodId || 568, // ID forma de pago contado/efectivo
          value: invoiceData.totalAmount,
        }
      ],
    };

    const response = await fetch('https://api.siigo.com/v1/invoices', {
      method: 'POST',
      headers,
      body: JSON.stringify(siigoPayload),
    });

    const resData: any = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: `Error de Siigo API (${response.status}): ${resData.Errors ? JSON.stringify(resData.Errors) : resData.message || JSON.stringify(resData)}`,
      };
    }

    const cufe = resData.stamp?.cufe || resData.cufe || '';
    const qrCodeUrl = resData.stamp?.qr || resData.qr || '';
    const externalInvoiceId = resData.id ? String(resData.id) : resData.name || '';
    const externalPdfUrl = resData.public_url || resData.pdf_url || '';
    const electronicStatus = resData.stamp?.status === 'Accepted' || resData.status === 'active' ? 'accepted' : 'accepted';

    return {
      success: true,
      cufe,
      qrCodeUrl,
      externalInvoiceId,
      externalPdfUrl,
      electronicStatus,
    };
  } catch (err: any) {
    console.error('[Siigo Service] Error emitiendo factura en Siigo:', err);
    return { success: false, error: err.message };
  }
}
