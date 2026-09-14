const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixInvoice112() {
  try {
    const invId = 'b7879176-acb7-4473-9777-0365266c3aba';
    console.log('Fixing invoice FAC-112...');

    // 1. Update total_amount to 195000.00 in invoices
    await pool.query(`UPDATE invoices SET total_amount = 195000.00 WHERE id = $1`, [invId]);

    // 2. Check items
    const itemsRes = await pool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [invId]);
    console.log('Current items:', itemsRes.rows.length);

    const hasDomicilio = itemsRes.rows.some(it => it.product_name && it.product_name.toLowerCase().includes('domicilio'));
    if (!hasDomicilio) {
      await pool.query(`
        INSERT INTO invoice_items (invoice_id, product_name, quantity, price, product_type)
        VALUES ($1, 'Servicio de Domicilio / Envío', 1, 5000.00, 'service')
      `, [invId]);
      console.log('✅ Line item for Domicilio added to invoice_items.');
    }

    // 3. Update installments if present
    const instRes = await pool.query(`SELECT * FROM invoice_installments WHERE invoice_id = $1 ORDER BY installment_number ASC`, [invId]);
    console.log('Current installments:', instRes.rows);

    for (const inst of instRes.rows) {
      if (inst.installment_number > 0) {
        // Update pending installment to 95000.00
        await pool.query(`UPDATE invoice_installments SET amount = 95000.00 WHERE id = $1`, [inst.id]);
        console.log(`✅ Installment #${inst.installment_number} updated to $95.000 COP.`);
      }
    }

    console.log('FAC-112 updated successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fixInvoice112();
