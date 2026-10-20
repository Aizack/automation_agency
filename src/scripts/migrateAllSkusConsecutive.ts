import { pool } from '../database/postgres';

export async function runGlobalSkuMigration() {
  console.log('=====================================================');
  console.log('[SKU Migration] 🚀 Iniciando migración global de SKUs a formato consecutivo de 8 dígitos...');
  console.log('=====================================================');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Garantizar que la secuencia exista
    await client.query(`CREATE SEQUENCE IF NOT EXISTS product_sku_seq START WITH 10000001;`);

    const migrationSql = `
      DO $MIG$
      DECLARE
          prod RECORD;
          v RECORD;
          curr_sku BIGINT := 10000001;
          total_prods INT := 0;
          total_variants INT := 0;
          first_v_sku TEXT;
      BEGIN
          FOR prod IN 
              SELECT id, name, has_variants, created_at 
              FROM products 
              ORDER BY created_at ASC, id ASC 
          LOOP
              IF prod.has_variants = false THEN
                  UPDATE products 
                  SET sku = curr_sku::TEXT 
                  WHERE id = prod.id;
                  
                  total_prods := total_prods + 1;
                  curr_sku := curr_sku + 1;
              ELSE
                  first_v_sku := NULL;
                  FOR v IN 
                      SELECT id, variant_name, sku 
                      FROM product_variants 
                      WHERE product_id = prod.id 
                      ORDER BY created_at ASC, id ASC 
                  LOOP
                      UPDATE product_variants 
                      SET sku = curr_sku::TEXT 
                      WHERE id = v.id;
                      
                      IF first_v_sku IS NULL THEN
                          first_v_sku := curr_sku::TEXT;
                      END IF;
                      
                      total_variants := total_variants + 1;
                      curr_sku := curr_sku + 1;
                  END LOOP;
                  
                  IF first_v_sku IS NOT NULL THEN
                      UPDATE products 
                      SET sku = first_v_sku 
                      WHERE id = prod.id;
                  END IF;
              END IF;
          END LOOP;
          
          PERFORM setval('product_sku_seq', curr_sku - 1);
          
          RAISE NOTICE 'SUCCESS_SUMMARY: prods=%, variants=%, next_seq=%', total_prods, total_variants, curr_sku;
      END $MIG$;
    `;

    await client.query(migrationSql);
    await client.query('COMMIT');

    const checkSeq = await client.query(`SELECT last_value FROM product_sku_seq;`);
    console.log(`[SKU Migration] ✅ Migración completada con éxito. Secuencia product_sku_seq establecida en: ${checkSeq.rows[0]?.last_value}`);
    return { success: true, last_value: checkSeq.rows[0]?.last_value };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SKU Migration] ❌ Error ejecutando migración de SKUs:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runGlobalSkuMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
