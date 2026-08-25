import { pool } from '../database/postgres';
import { uploadTenantFile } from './storageService';

export interface InvoicePrintData {
  invoice: any;
  items: any[];
  installments: any[];
  client: any;
}

/**
 * Obtiene todos los datos requeridos para la representación gráfica de la factura.
 */
export const getInvoicePrintData = async (clientId: string, invoiceId: string): Promise<InvoicePrintData | null> => {
  const invRes = await pool.query(
    `SELECT i.*, c.name as business_name, c.phone_number as business_phone
     FROM invoices i
     JOIN clients c ON i.client_id = c.id
     WHERE i.client_id = $1 AND i.id = $2`,
    [clientId, invoiceId]
  );

  if (invRes.rows.length === 0) return null;

  const invoice = invRes.rows[0];

  const itemsRes = await pool.query(
    `SELECT ii.*, p.name as inventory_name, p.sku
     FROM invoice_items ii
     LEFT JOIN products p ON ii.product_id = p.id
     WHERE ii.invoice_id = $1`,
    [invoiceId]
  );

  const installmentsRes = await pool.query(
    `SELECT * FROM invoice_installments WHERE invoice_id = $1 ORDER BY installment_number ASC`,
    [invoiceId]
  );

  return {
    invoice,
    items: itemsRes.rows,
    installments: installmentsRes.rows,
    client: { name: invoice.business_name, phone: invoice.business_phone }
  };
};

/**
 * Genera el documento HTML imprimible para Tiquete Térmico POS 80mm.
 */
export const generatePOSThermalTicketHTML = (data: InvoicePrintData): string => {
  const { invoice, items } = data;
  const createdDate = new Date(invoice.created_at).toLocaleString('es-CO');
  const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(parseFloat(invoice.total_amount || 0));

  let itemsRows = '';
  items.forEach(item => {
    const itemTotal = (parseFloat(item.price) * item.quantity).toLocaleString('es-CO');
    const name = item.product_name || item.inventory_name || 'Producto';
    itemsRows += `
      <tr>
        <td style="padding: 4px 0; text-align: left; font-size: 11px;">${item.quantity}x ${name}</td>
        <td style="padding: 4px 0; text-align: right; font-size: 11px;">$${itemTotal}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Tiquete POS #${invoice.invoice_number}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: 'Courier New', Courier, monospace;
          width: 78mm;
          margin: 0 auto;
          padding: 8px 4px;
          color: #000;
          font-size: 11px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; }
      </style>
    </head>
    <body onload="window.print()">
      <div class="text-center">
        <h2 style="margin: 0; font-size: 14px;">${invoice.business_name || 'ÓPTICA / COMERCIO'}</h2>
        <p style="margin: 2px 0;">NIT: 1129520837-8</p>
        <p style="margin: 2px 0;">Tel: ${invoice.business_phone || ''}</p>
        <p style="margin: 2px 0;">Factura POS #${invoice.invoice_number}</p>
      </div>

      <div class="divider"></div>

      <p style="margin: 2px 0;">Fecha: ${createdDate}</p>
      <p style="margin: 2px 0;">Cliente: ${invoice.customer_name}</p>
      <p style="margin: 2px 0;">Cédula/NIT: ${invoice.customer_document_number || '222222222222'}</p>
      <p style="margin: 2px 0;">Forma Pago: ${invoice.payment_method?.toUpperCase()}</p>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left; font-size: 10px;">CANT / ITEM</th>
            <th style="text-align: right; font-size: 10px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="divider"></div>

      <table style="font-size: 12px;" class="bold">
        <tr>
          <td>TOTAL PAGAR:</td>
          <td class="text-right">${formattedTotal}</td>
        </tr>
      </table>

      ${invoice.cufe ? `
        <div class="divider"></div>
        <div class="text-center" style="font-size: 8px; word-break: break-all;">
          <p class="bold" style="margin: 2px 0;">CUFE (Factura Electrónica):</p>
          <p style="margin: 2px 0;">${invoice.cufe}</p>
          ${invoice.qr_code_url ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(invoice.qr_code_url)}" style="width: 80px; height: 80px; margin-top: 4px;" />` : ''}
        </div>
      ` : ''}

      <div class="divider"></div>

      <div class="text-center" style="margin-top: 8px; font-size: 10px;">
        <p style="margin: 2px 0;">¡Gracias por su compra!</p>
        <p style="margin: 2px 0;">Representación Gráfica Documento POS</p>
      </div>
    </body>
    </html>
  `;
};
