const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'invoice_items'`);
  console.log('invoice_items columns:', res.rows.map(r => r.column_name));
  await pool.end();
}

checkSchema();
