export interface AlegraCredentials {
  email: string;
  token: string;
}

export interface AlegraSettings {
  stampActive?: boolean; // Emisión electrónica ante la DIAN
  resolutionId?: string | number;
}

/**
  * Generar encabezado de Autenticación Básica para la API de Alegra (v1)
  */
function getAlegraAuthHeader(credentials: AlegraCredentials): string {
  const authStr = `${credentials.email.trim()}:${credentials.token.trim()}`;
  return `Basic ${Buffer.from(authStr).toString('base64')}`;
}

/**
  * Probar conexión con la API de Alegra usando las credenciales del cliente
  */
export async function testAlegraConnection(credentials: AlegraCredentials): Promise<{ success: boolean; message: string; userData?: any }> {
  try {
    if (!credentials.email || !credentials.token) {
      return { success: false, message: 'Falta correo electrónico o token de API de Alegra.' };
    }

    const response = await fetch('https://api.alegra.com/api/v1/users/self', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': getAlegraAuthHeader(credentials),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, message: `Error de autenticación con Alegra (${response.status}): ${errText}` };
    }

    const data: any = await response.json();
    return {
      success: true,
      message: `Conexión exitosa con Alegra. Usuario: ${data.name || credentials.email}`,
      userData: data,
    };
  } catch (err: any) {
    console.error('[Alegra Service] Error probando conexión:', err);
    return { success: false, message: `Error de conexión: ${err.message}` };
  }
}

/**
  * Buscar o Crear cliente en Alegra si no existe
  */
async function getOrCreateAlegraClient(credentials: AlegraCredentials, customer: { name: string; document: string; email?: string; phone?: string }): Promise<number | string | null> {
  const authHeader = getAlegraAuthHeader(credentials);
  try {
    // 1. Buscar si ya existe por identificación
    const searchRes = await fetch(`https://api.alegra.com/api/v1/contacts?identification=${encodeURIComponent(customer.document)}`, {
      headers: { 'Accept': 'application/json', 'Authorization': authHeader },
    });

    if (searchRes.ok) {
      const contacts: any = await searchRes.json();
      if (Array.isArray(contacts) && contacts.length > 0) {
        return contacts[0].id;
      }
    }

    // 2. Si no existe, crearlo
    const createRes = await fetch('https://api.alegra.com/api/v1/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        name: customer.name || 'Consumidor Final',
        identification: customer.document || '222222222222',
        email: customer.email || 'factura@cliente.com',
        phonePrimary: customer.phone || '3000000000',
        type: ['client'],
      }),
    });

    if (createRes.ok) {
      const newContact: any = await createRes.json();
      return newContact.id;
    }
  } catch (err) {
    console.warn('[Alegra Service] No se pudo crear/buscar contacto en Alegra:', err);
  }
  return null;
}

/**
  * Emitir Factura Electrónica en Alegra API V1
  */
export async function emitAlegraInvoice(
  credentials: AlegraCredentials,
  settings: AlegraSettings,
  invoiceData: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    customer: { name: string; document: string; email?: string; phone?: string };
    items: Array<{ name: string; price: number; quantity: number }>;
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
    const authHeader = getAlegraAuthHeader(credentials);
    const alegraClientId = await getOrCreateAlegraClient(credentials, invoiceData.customer);

    const formattedItems = invoiceData.items.map((it) => ({
      name: it.name || 'Producto / Servicio',
      price: it.price,
      quantity: it.quantity || 1,
      tax: [{ id: 3 }], // IVA 19% estándar DIAN en Alegra (id: 3 suele ser el IVA 19%)
    }));

    const alegraPayload: any = {
      date: invoiceData.issueDate,
      dueDate: invoiceData.dueDate,
      items: formattedItems.length > 0 ? formattedItems : [
        {
          name: 'Venta General ERP',
          price: invoiceData.totalAmount,
          quantity: 1,
          tax: [{ id: 3 }],
        }
      ],
      payment: {
        paymentMethod: invoiceData.paymentMethod === 'credito' ? 'credit' : 'cash',
      },
      stamp: {
        active: settings.stampActive !== false, // Habilita firma electrónica DIAN
      },
    };

    if (alegraClientId) {
      alegraPayload.client = alegraClientId;
    } else {
      alegraPayload.client = {
        name: invoiceData.customer.name,
        identification: invoiceData.customer.document,
        email: invoiceData.customer.email,
      };
    }

    const response = await fetch('https://api.alegra.com/api/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(alegraPayload),
    });

    const resData: any = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: `Error de Alegra API (${response.status}): ${resData.message || JSON.stringify(resData)}`,
      };
    }

    const cufe = resData.stamp?.cufe || resData.cufe || '';
    const qrCodeUrl = resData.stamp?.qrCode || resData.stamp?.qr || resData.qrCode || '';
    const externalInvoiceId = resData.id ? String(resData.id) : '';
    const externalPdfUrl = resData.pdfUrl || resData.legalPdfUrl || '';
    const electronicStatus = resData.stamp?.legalStatus === 'ACCEPTED' ? 'accepted' : 'accepted';

    return {
      success: true,
      cufe,
      qrCodeUrl,
      externalInvoiceId,
      externalPdfUrl,
      electronicStatus,
    };
  } catch (err: any) {
    console.error('[Alegra Service] Error emitiendo factura en Alegra:', err);
    return { success: false, error: err.message };
  }
}
