import { pool } from '../src/database/postgres';

async function main() {
  console.log('Running category auto-linking...');

  // 1. Link products by exact/partial category name match
  const res = await pool.query(`
    UPDATE products p
    SET category_id = pc.id
    FROM product_categories pc
    WHERE p.client_id = pc.client_id
      AND p.category_id IS NULL
      AND (
        LOWER(p.name) LIKE CONCAT('%', LOWER(pc.name), '%')
        OR (LOWER(pc.name) LIKE '%montura%' AND LOWER(p.name) LIKE '%montura%')
        OR (LOWER(pc.name) LIKE '%lente%' AND LOWER(p.name) LIKE '%lente%')
        OR (LOWER(pc.name) LIKE '%estuche%' AND LOWER(p.name) LIKE '%estuche%')
        OR (LOWER(pc.name) LIKE '%examen%' AND LOWER(p.name) LIKE '%examen%')
      )
  `);

  console.log(`✅ Updated ${res.rowCount} products with missing category_id!`);

  // Check remaining count in client_test_optica
  const checkRes = await pool.query(`
    SELECT pc.name as cat_name, COUNT(p.id) as count
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE p.client_id = 'client_test_optica'
    GROUP BY pc.name
  `);

  console.log('Category distribution in client_test_optica:', checkRes.rows);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
