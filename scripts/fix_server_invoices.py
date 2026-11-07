import os

server_path = os.path.join(os.getcwd(), 'src', 'server.ts')
with open(server_path, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    # 1. Annul endpoint: Cancel installments in invoice_installments
    (
        '''    // Cancelar órdenes de laboratorio asociadas si existían
    try {
      await dbClient.query(`UPDATE lab_jobs SET status = 'cancelled' WHERE invoice_id = $1 AND client_id = $2`, [invoiceId, clientId]);
    } catch (labErr) {
      // Ignorar si no aplica
    }''',
        '''    // Cancelar órdenes de laboratorio asociadas si existían
    try {
      await dbClient.query(`UPDATE lab_jobs SET status = 'cancelled' WHERE invoice_id = $1 AND client_id = $2`, [invoiceId, clientId]);
    } catch (labErr) {
      // Ignorar si no aplica
    }

    // Cancelar cuotas asociadas en invoice_installments (Cartera)
    try {
      await dbClient.query(`UPDATE invoice_installments SET status = 'cancelled' WHERE invoice_id = $1`, [invoiceId]);
    } catch (instErr) {
      console.warn('[Invoice Annul] Warning al cancelar cuotas de cartera:', instErr);
    }'''
    ),
    # 2. GET invoices balance_due and total_paid
    (
        '''              (SELECT COALESCE(SUM(ii.paid_amount), 0)::numeric FROM invoice_installments ii WHERE ii.invoice_id = i.id) as total_paid,
              (SELECT COALESCE(SUM(ii.amount - ii.paid_amount), 0)::numeric FROM invoice_installments ii WHERE ii.invoice_id = i.id AND ii.status != 'paid') as balance_due,
              (SELECT COUNT(*)::int FROM invoice_installments ii WHERE ii.invoice_id = i.id AND ii.installment_number > 0) as total_installments_count,
              (SELECT COUNT(*)::int FROM invoice_installments ii WHERE ii.invoice_id = i.id AND ii.status = 'pending' AND ii.installment_number > 0) as pending_installments_count''',
        '''              (CASE WHEN i.status IN ('annulled', 'anulada', 'cancelled') THEN 0 ELSE (SELECT COALESCE(SUM(ii.paid_amount), 0)::numeric FROM invoice_installments ii WHERE ii.invoice_id = i.id AND ii.status != 'cancelled') END) as total_paid,
              (CASE WHEN i.status IN ('annulled', 'anulada', 'cancelled') THEN 0 ELSE (SELECT COALESCE(SUM(ii.amount - ii.paid_amount), 0)::numeric FROM invoice_installments ii WHERE ii.invoice_id = i.id AND ii.status NOT IN ('paid', 'cancelled')) END) as balance_due,
              (CASE WHEN i.status IN ('annulled', 'anulada', 'cancelled') THEN 0 ELSE (SELECT COUNT(*)::int FROM invoice_installments ii WHERE ii.invoice_id = i.id AND ii.installment_number > 0 AND ii.status != 'cancelled') END) as total_installments_count,
              (CASE WHEN i.status IN ('annulled', 'anulada', 'cancelled') THEN 0 ELSE (SELECT COUNT(*)::int FROM invoice_installments ii WHERE ii.invoice_id = i.id AND ii.status = 'pending' AND ii.installment_number > 0) END) as pending_installments_count'''
    ),
    # 3. dashboard-metrics
    (
        '`SELECT COALESCE(SUM(total_amount), 0) as "totalSales" FROM invoices WHERE client_id = $1`,',
        '`SELECT COALESCE(SUM(total_amount), 0) as "totalSales" FROM invoices WHERE client_id = $1 AND status NOT IN (\'cancelled\', \'annulled\', \'anulada\')`,'
    ),
    # 4. accounting/summary
    (
        '''        FROM invoices
        WHERE client_id = $1
          AND created_at >= $2
          AND created_at <= $3
          AND status != 'cancelled'
        GROUP BY LOWER(payment_method)''',
        '''        FROM invoices
        WHERE client_id = $1
          AND created_at >= $2
          AND created_at <= $3
          AND status NOT IN ('cancelled', 'annulled', 'anulada')
        GROUP BY LOWER(payment_method)'''
    ),
    # 5. accounting/top-products
    (
        '''        WHERE i.client_id = $1
          AND i.created_at >= $2
          AND i.created_at <= $3
          AND i.status != 'cancelled'
        GROUP BY p.id, p.name''',
        '''        WHERE i.client_id = $1
          AND i.created_at >= $2
          AND i.created_at <= $3
          AND i.status NOT IN ('cancelled', 'annulled', 'anulada')
        GROUP BY p.id, p.name'''
    ),
    # 6. accounting/daily-trend
    (
        '''        FROM invoices
        WHERE client_id = $1
          AND created_at >= $2
          AND created_at <= $3
          AND status != 'cancelled'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')''',
        '''        FROM invoices
        WHERE client_id = $1
          AND created_at >= $2
          AND created_at <= $3
          AND status NOT IN ('cancelled', 'annulled', 'anulada')
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')'''
    ),
    # 7. accounting/invoices
    (
        '''        WHERE i.client_id = $1
          AND i.created_at >= $2
          AND i.created_at <= $3
          AND i.status != 'cancelled'
        ORDER BY i.created_at DESC''',
        '''        WHERE i.client_id = $1
          AND i.created_at >= $2
          AND i.created_at <= $3
          AND i.status NOT IN ('cancelled', 'annulled', 'anulada')
        ORDER BY i.created_at DESC'''
    ),
    # 8. accounting/product-rotation
    (
        '''        LEFT JOIN invoices i ON ii.invoice_id = i.id 
          AND i.client_id = $1 
          AND i.created_at >= $2 
          AND i.created_at <= $3 
          AND i.status != 'cancelled'
        WHERE p.client_id = $1''',
        '''        LEFT JOIN invoices i ON ii.invoice_id = i.id 
          AND i.client_id = $1 
          AND i.created_at >= $2 
          AND i.created_at <= $3 
          AND i.status NOT IN ('cancelled', 'annulled', 'anulada')
        WHERE p.client_id = $1'''
    ),
    # 9. growth-insights
    (
        '''      const invRes = await pool.query(
        `SELECT AVG(total_amount) as avg_ticket, COUNT(*) as total_invoices, SUM(total_amount) as total_revenue
         FROM invoices WHERE client_id = $1 AND status != 'cancelled'`,
        [clientId]
      );''',
        '''      const invRes = await pool.query(
        `SELECT AVG(total_amount) as avg_ticket, COUNT(*) as total_invoices, SUM(total_amount) as total_revenue
         FROM invoices WHERE client_id = $1 AND status NOT IN ('cancelled', 'annulled', 'anulada')`,
        [clientId]
      );'''
    ),
    (
        '''      const dayRes = await pool.query(
        `SELECT EXTRACT(DOW FROM created_at) as dow, SUM(total_amount) as total
         FROM invoices WHERE client_id = $1 AND status != 'cancelled'
         GROUP BY dow ORDER BY total ASC LIMIT 1`,
        [clientId]
      );''',
        '''      const dayRes = await pool.query(
        `SELECT EXTRACT(DOW FROM created_at) as dow, SUM(total_amount) as total
         FROM invoices WHERE client_id = $1 AND status NOT IN ('cancelled', 'annulled', 'anulada')
         GROUP BY dow ORDER BY total ASC LIMIT 1`,
        [clientId]
      );'''
    ),
    # 10. cash-shifts
    (
        '''          WHERE client_id = $1 
            AND status != 'cancelled'
            AND (
              created_at >= $2''',
        '''          WHERE client_id = $1 
            AND status NOT IN ('cancelled', 'annulled', 'anulada')
            AND (
              created_at >= $2'''
    ),
    (
        '''          WHERE client_id = $1 AND DATE(created_at) = CURRENT_DATE AND status != 'cancelled'
          GROUP BY LOWER(COALESCE(payment_method, 'efectivo'))''',
        '''          WHERE client_id = $1 AND DATE(created_at) = CURRENT_DATE AND status NOT IN ('cancelled', 'annulled', 'anulada')
          GROUP BY LOWER(COALESCE(payment_method, 'efectivo'))'''
    ),
    (
        '''         FROM invoices
         WHERE client_id = $1 
           AND status != 'cancelled'
           AND LOWER(COALESCE(payment_method, 'efectivo')) IN ('efectivo', 'contado')''',
        '''         FROM invoices
         WHERE client_id = $1 
           AND status NOT IN ('cancelled', 'annulled', 'anulada')
           AND LOWER(COALESCE(payment_method, 'efectivo')) IN ('efectivo', 'contado')'''
    ),
    # 11. employee-targets
    (
        '''              AND (status IS NULL OR status != 'cancelled')`,''',
        '''              AND (status IS NULL OR status NOT IN ('cancelled', 'annulled', 'anulada'))`,'''
    )
]

# Normalize line endings for replacement
content_normalized = content.replace('\r\n', '\n')

applied = 0
for idx, (target, repl) in enumerate(replacements):
    target_norm = target.replace('\r\n', '\n')
    repl_norm = repl.replace('\r\n', '\n')
    if target_norm in content_normalized:
        content_normalized = content_normalized.replace(target_norm, repl_norm, 1)
        applied += 1
        print(f'Applied replacement {idx+1}')
    else:
        print(f'WARNING: target {idx+1} not found')

with open(server_path, 'w', encoding='utf-8') as f:
    f.write(content_normalized)

print(f'Total applied: {applied}/{len(replacements)}')
