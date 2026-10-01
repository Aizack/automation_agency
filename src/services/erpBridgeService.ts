import { pool } from '../database/postgres';

export class ERPBridgeService {

  /**
   * Consulta el inventario del ERP para un cliente específico.
   */
  static async consultarInventario(clientId: string, params: { sku?: string; busqueda?: string }) {
    try {
      let query = `SELECT sku, name, description, price, stock, category 
                   FROM products 
                   WHERE client_id = $1`;
      const queryParams: any[] = [clientId];

      if (params.sku) {
        query += ` AND LOWER(sku) = LOWER($2)`;
        queryParams.push(params.sku);
      } else if (params.busqueda) {
        query += ` AND (LOWER(name) LIKE LOWER($2) OR LOWER(description) LIKE LOWER($2) OR LOWER(sku) LIKE LOWER($2))`;
        queryParams.push(`%${params.busqueda}%`);
      }

      query += ` LIMIT 10`;
      const res = await pool.query(query, queryParams);

      if (res.rows.length === 0) {
        return { success: true, count: 0, items: [], message: 'No se encontraron productos coincidentes en el inventario.' };
      }

      return {
        success: true,
        count: res.rows.length,
        items: res.rows.map(row => ({
          sku: row.sku,
          nombre: row.name,
          descripcion: row.description,
          precio: Number(row.price),
          stock: row.stock,
          categoria: row.category
        }))
      };
    } catch (error: any) {
      console.error('[ERPBridge] Error al consultar inventario:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Consulta el estado de cuenta y facturas pendientes en el ERP.
   */
  static async consultarEstadoCuenta(clientId: string, params: { clienteName?: string; documentNumber?: string }) {
    try {
      let query = `SELECT invoice_number, customer_name, total_amount, balance_due, due_date, status 
                   FROM invoices 
                   WHERE client_id = $1`;
      const queryParams: any[] = [clientId];

      if (params.documentNumber) {
        query += ` AND document_number = $2`;
        queryParams.push(params.documentNumber);
      } else if (params.clienteName) {
        query += ` AND LOWER(customer_name) LIKE LOWER($2)`;
        queryParams.push(`%${params.clienteName}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT 10`;
      const res = await pool.query(query, queryParams);

      if (res.rows.length === 0) {
        return { success: true, count: 0, invoices: [], message: 'No se encontraron facturas ni registros de cartera.' };
      }

      return {
        success: true,
        count: res.rows.length,
        invoices: res.rows.map(row => ({
          numeroFactura: row.invoice_number,
          cliente: row.customer_name,
          montoTotal: Number(row.total_amount),
          saldoPendiente: Number(row.balance_due),
          fechaVencimiento: row.due_date,
          estado: row.status
        }))
      };
    } catch (error: any) {
      console.error('[ERPBridge] Error al consultar estado de cuenta:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Registra el reporte de pago de una factura en el ERP.
   */
  static async reportarPago(clientId: string, params: { invoiceNumber: string; montoPagado: number }) {
    try {
      const invRes = await pool.query(
        `SELECT id, balance_due, status FROM invoices WHERE client_id = $1 AND LOWER(invoice_number) = LOWER($2)`,
        [clientId, params.invoiceNumber]
      );

      if (invRes.rows.length === 0) {
        return { success: false, error: `La factura '${params.invoiceNumber}' no fue encontrada.` };
      }

      const inv = invRes.rows[0];
      const newBalance = Math.max(0, Number(inv.balance_due) - params.montoPagado);
      const newStatus = newBalance === 0 ? 'paid' : 'partial';

      await pool.query(
        `UPDATE invoices SET balance_due = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [newBalance, newStatus, inv.id]
      );

      return {
        success: true,
        invoiceNumber: params.invoiceNumber,
        montoAbonado: params.montoPagado,
        nuevoSaldo: newBalance,
        nuevoEstado: newStatus
      };
    } catch (error: any) {
      console.error('[ERPBridge] Error al reportar pago:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Asigna una tarea a personal del ERP.
   */
  static async asignarTarea(clientId: string, params: { titulo: string; descripcion?: string; nombreEmpleado?: string; rolEmpleado?: string; diasPlazo?: number }) {
    try {
      const plazo = params.diasPlazo || 1;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + plazo);

      const res = await pool.query(
        `INSERT INTO tasks (client_id, title, description, assigned_to_name, assigned_to_role, due_date, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
         RETURNING id`,
        [clientId, params.titulo, params.descripcion || '', params.nombreEmpleado || null, params.rolEmpleado || null, dueDate]
      );

      return {
        success: true,
        taskId: res.rows[0].id,
        titulo: params.titulo,
        asignadoA: params.nombreEmpleado || params.rolEmpleado || 'General',
        fechaEntrega: dueDate.toISOString().split('T')[0]
      };
    } catch (error: any) {
      console.error('[ERPBridge] Error al asignar tarea:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Consulta el estado de despacho/domicilio vinculado a un pedido o factura.
   */
  static async consultarDomicilio(clientId: string, params: { invoiceNumber?: string; orderId?: string }) {
    try {
      let query = `SELECT d.id, d.invoice_number, d.status, d.driver_name, d.driver_phone, d.address, d.tracking_url, d.updated_at
                   FROM deliveries d
                   WHERE d.client_id = $1`;
      const queryParams: any[] = [clientId];

      if (params.invoiceNumber) {
        query += ` AND LOWER(d.invoice_number) = LOWER($2)`;
        queryParams.push(params.invoiceNumber);
      } else if (params.orderId) {
        query += ` AND d.order_id = $2`;
        queryParams.push(params.orderId);
      }

      query += ` ORDER BY d.created_at DESC LIMIT 1`;
      const res = await pool.query(query, queryParams);

      if (res.rows.length === 0) {
        return { success: true, count: 0, message: 'No se encontró un registro de envío asociado a este documento.' };
      }

      const delivery = res.rows[0];
      return {
        success: true,
        deliveryId: delivery.id,
        factura: delivery.invoice_number,
        estadoEnvio: delivery.status,
        repartidor: delivery.driver_name || 'Sin asignar',
        telefonoRepartidor: delivery.driver_phone || 'N/A',
        direccion: delivery.address,
        linkRastreo: delivery.tracking_url,
        ultimaActualizacion: delivery.updated_at
      };
    } catch (error: any) {
      console.error('[ERPBridge] Error al consultar domicilio:', error);
      return { success: false, error: error.message };
    }
  }
}
