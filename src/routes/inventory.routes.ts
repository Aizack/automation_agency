import { Router, Request, Response, RequestHandler } from 'express';
import { pool } from '../database/postgres';
import { authenticateToken, authorizeClientAccess } from '../middlewares/authMiddleware';

export const inventoryRouter = Router({ mergeParams: true });

inventoryRouter.use(authenticateToken as RequestHandler);
inventoryRouter.use(authorizeClientAccess as RequestHandler);

/**
 * GET /api/clients/:clientId/inventory/rotation
 */
inventoryRouter.get('/rotation', (async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { period = 'month' } = req.query;

    const daysInPeriod = period === 'year' ? 365 : period === 'quarter' ? 90 : 30;

    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COALESCE(p.stock, 0) as current_stock,
        COALESCE(SUM(ii.quantity), 0) as units_sold
      FROM products p
      LEFT JOIN invoice_items ii ON ii.product_id = p.id
      LEFT JOIN invoices i ON ii.invoice_id = i.id AND i.status != 'cancelled' AND i.created_at >= NOW() - INTERVAL '${daysInPeriod} days'
      WHERE p.client_id = $1
      GROUP BY p.id, p.name, p.stock
      ORDER BY units_sold DESC;
    `;

    const result = await pool.query(query, [clientId]);

    const products = result.rows.map(row => {
      const currentStock = parseInt(row.current_stock, 10);
      const unitsSold = parseInt(row.units_sold, 10);
      const rotationRate = Number((unitsSold / daysInPeriod).toFixed(2));
      
      let rotationLabel = 'Media';
      let recommendation = 'Mantener nivel de stock';

      if (rotationRate > 0.5) {
        rotationLabel = 'Alta';
        recommendation = 'Reabastecer pronto';
      } else if (rotationRate < 0.1) {
        rotationLabel = 'Baja';
        recommendation = 'Candidato a descontinuar / promoción';
      }

      const daysOfStock = rotationRate > 0 ? Math.round(currentStock / rotationRate) : 999;

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        current_stock: currentStock,
        units_sold: unitsSold,
        rotation_rate: rotationRate,
        rotation_label: rotationLabel,
        days_of_stock: daysOfStock,
        recommendation
      };
    });

    res.json({ success: true, period, products });
  } catch (err: any) {
    console.error("[Inventory Router] Error calculando rotación:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}) as RequestHandler);
