const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkInvoice() {
  try {
    const invId = 'b7879176-acb7-4473-9777-0365266c3aba';
    console.log('--- BUSCANDO FACTURA ---');
    const res = await pool.query(`SELECT * FROM invoices WHERE id = $1 OR invoice_number = 'FAC-112'`, [invId]);
    console.log('Invoice in DB:', res.rows);

    console.log('--- BUSCANDO AUDIT LOGS ---');
    const logsRes = await pool.query(`SELECT * FROM system_audit_logs WHERE entity_id = $1 OR details->>'invoiceId' = $1`, [invId]);
    console.log('Audit logs in DB:', logsRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkInvoice();
