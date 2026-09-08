import { Router, Request, Response, RequestHandler } from 'express';
import { pool } from '../database/postgres';
import { authenticateToken, authorizeClientAccess } from '../middlewares/authMiddleware';
import { logReqAudit } from '../services/auditService';

export const accountingRouter = Router({ mergeParams: true });

accountingRouter.use(authenticateToken as RequestHandler);
accountingRouter.use(authorizeClientAccess as RequestHandler);

/**
 * GET /api/clients/:clientId/accounting/summary
 */
accountingRouter.get('/summary', (async (req: Request, res: Response) => {
  try {
    const rawClientId = req.params.clientId;
    const clientId = Array.isArray(rawClientId) ? rawClientId[0] : (rawClientId || '');
    const { period = 'month', date } = req.query;

    const refDate = date ? new Date(date as string) : new Date();
    let dateFrom: Date;
    const dateTo: Date = new Date(refDate);

    if (period === 'day') {
      dateFrom = new Date(refDate.setHours(0,0,0,0));
      dateTo.setHours(23,59,59,999);
    } else if (period === 'week') {
      const dayOfWeek = refDate.getDay();
      dateFrom = new Date(refDate);
      dateFrom.setDate(refDate.getDate() - dayOfWeek);
      dateFrom.setHours(0,0,0,0);
    } else if (period === 'year') {
      dateFrom = new Date(refDate.getFullYear(), 0, 1);
    } else {
      dateFrom = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    }

    const query = `
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
      FROM invoices
      WHERE client_id = $1
        AND created_at >= $2
        AND created_at <= $3
        AND status != 'cancelled'
      GROUP BY payment_method
      ORDER BY total DESC;
    `;

    const result = await pool.query(query, [clientId, dateFrom, dateTo]);
    const byPaymentMethod = result.rows.map(r => ({
      method: r.payment_method || 'efectivo',
      count: parseInt(r.count, 10),
      total: parseFloat(r.total)
    }));

    const totalRevenue = byPaymentMethod.reduce((sum, item) => sum + item.total, 0);
    const totalInvoices = byPaymentMethod.reduce((sum, item) => sum + item.count, 0);
    const averageTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    logReqAudit(req as any, clientId, 'ACCOUNTING_SUMMARY_VIEW', 'Facturación', `Consulta de resumen contable (${period})`, { period, totalRevenue });

    res.json({
      success: true,
      period,
      date_range: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      total_revenue: totalRevenue,
      total_invoices: totalInvoices,
      average_ticket: averageTicket,
      by_payment_method: byPaymentMethod
    });
  } catch (err: any) {
    console.error("[Accounting Router] Error obteniendo resumen:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}) as RequestHandler);

/**
 * GET /api/clients/:clientId/bank-accounts
 */
accountingRouter.get('/bank-accounts', (async (req: Request, res: Response) => {
  try {
    const rawClientId = req.params.clientId;
    const clientId = Array.isArray(rawClientId) ? rawClientId[0] : (rawClientId || '');
    const result = await pool.query(
      `SELECT * FROM business_bank_accounts WHERE client_id = $1 AND is_active = true ORDER BY created_at DESC`,
      [clientId]
    );
    res.json({ success: true, accounts: result.rows });
  } catch (err: any) {
    console.error("[Accounting Router] Error listando cuentas bancarias:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}) as RequestHandler);

/**
 * POST /api/clients/:clientId/bank-accounts
 */
accountingRouter.post('/bank-accounts', (async (req: Request, res: Response) => {
  try {
    const rawClientId = req.params.clientId;
    const clientId = Array.isArray(rawClientId) ? rawClientId[0] : (rawClientId || '');
    const { bank_name, account_type = 'ahorros', account_number, account_holder } = req.body;

    if (!bank_name || !account_number) {
      return res.status(400).json({ success: false, error: 'El nombre del banco y número de cuenta son obligatorios.' });
    }

    const result = await pool.query(
      `INSERT INTO business_bank_accounts (client_id, bank_name, account_type, account_number, account_holder)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [clientId, bank_name, account_type, account_number, account_holder]
    );

    logReqAudit(req as any, clientId, 'CREATE_BANK_ACCOUNT', 'Configuración', `Creación de cuenta bancaria (${bank_name})`, { bank_name, account_number });

    res.json({ success: true, account: result.rows[0] });
  } catch (err: any) {
    console.error("[Accounting Router] Error creando cuenta bancaria:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}) as RequestHandler);
