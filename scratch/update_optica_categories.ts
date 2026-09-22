import { pool } from '../src/database/postgres';

async function main() {
  const res = await pool.query(
    `UPDATE product_categories SET is_visible_web = false WHERE client_id = $1 AND name IN ('Examen', 'Lentes')`,
    ['client_test_optica']
  );
  console.log(`Updated ${res.rowCount} categories to invisible.`);

  const catalogRes = await pool.query(
    `SELECT p.id, p.name, pc.name as cat_name, pc.is_visible_web
     FROM products p
     JOIN product_categories pc ON pc.id = p.category_id
     WHERE p.client_id = 'client_test_optica' AND (pc.is_visible_web IS TRUE)`
  );
  console.log(`Visible products count now: ${catalogRes.rows.length}`);
  console.log(`Sample visible products:`, catalogRes.rows.slice(0, 5));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
