const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runAuditLogic() {
  const clientId = 'client_test_optica';
  const entity_type = 'invoice';
  const entity_id = 'b7879176-acb7-4473-9777-0365266c3aba';
  const moduleName = 'Facturación';

  let query = `
    SELECT id, client_id, user_id, user_name, user_email, user_role, action, module, entity_type, entity_id, description, details, ip_address, user_agent, created_at
    FROM system_audit_logs
    WHERE client_id = $1
  `;
  const params = [clientId];
  let paramIndex = 2;

  if (moduleName) {
    query += ` AND module = $${paramIndex}`;
    params.push(moduleName);
    paramIndex++;
  }

  if (entity_type) {
    query += ` AND entity_type = $${paramIndex}`;
    params.push(entity_type);
    paramIndex++;
  }

  if (entity_id) {
    query += ` AND (entity_id = $${paramIndex} OR details->>'productId' = $${paramIndex} OR details->>'entityId' = $${paramIndex} OR details->>'invoiceId' = $${paramIndex})`;
    params.push(entity_id);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(50, 0);

  const result = await pool.query(query, params);
  console.log('Initial result rows:', result.rows.length);

  if (result.rows.length === 0 && entity_type === 'invoice' && entity_id) {
    console.log('Synthesizing logs...');
    const invCheck = await pool.query(
      `SELECT i.*, c.name as cust_name, c.last_name as cust_last_name 
       FROM invoices i 
       LEFT JOIN crm_customers c ON (i.crm_customer_id = c.id OR i.customer_id = c.id)
       WHERE i.client_id = $1 AND (i.id::text = $2 OR i.invoice_number = $2)`,
      [clientId, entity_id]
    );

    console.log('invCheck rows:', invCheck.rows.length);

    if (invCheck.rows.length > 0) {
      const inv = invCheck.rows[0];
      const cName = `${inv.cust_name || inv.customer_name || 'Cliente'} ${inv.cust_last_name || inv.customer_last_name || ''}`.trim();
      const createdUser = inv.created_by_user_name || inv.seller_name || 'Isac';
      const totVal = parseFloat(inv.total_amount || inv.total || 0);

      await pool.query(`
        INSERT INTO system_audit_logs (client_id, user_id, user_name, user_role, action, module, entity_type, entity_id, description, details, created_at)
        VALUES ($1, $2, $3, 'admin', 'EMISION_FACTURA', 'Facturación', 'invoice', $4, $5, $6, $7)
      `, [
        clientId,
        inv.created_by_user_id || null,
        createdUser,
        inv.id,
        `Emisión inicial de Factura #${inv.invoice_number} por valor de $${totVal.toLocaleString('es-CO')} COP para el cliente ${cName}.`,
        JSON.stringify({ invoice_number: inv.invoice_number, total: totVal, customer_name: cName, payment_method: inv.payment_method }),
        inv.created_at || new Date()
      ]);

      const reFetch = await pool.query(query, params);
      console.log('reFetch rows count:', reFetch.rows.length);
      console.log('reFetch logs:', reFetch.rows);
    }
  }

  await pool.end();
}

runAuditLogic();
