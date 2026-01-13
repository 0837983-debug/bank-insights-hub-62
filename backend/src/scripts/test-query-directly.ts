import { pool } from "../config/database.js";

async function testQuery() {
  const client = await pool.connect();
  try {
    const layoutId = 'main_dashboard';
    
    console.log('Testing query directly...\n');
    
    // Test the exact query from layoutService
    const formatsResult = await client.query(`
      SELECT DISTINCT
        f.id, f.kind, f.pattern, f.currency, f.prefix_unit_symbol, f.suffix_unit_symbol,
        f.minimum_fraction_digits, f.maximum_fraction_digits, f.thousand_separator,
        f.multiplier, f.shorten, f.color_rules, f.symbol_rules
      FROM config.formats f
      INNER JOIN config.component_fields cf ON cf.format_id = f.id
      INNER JOIN config.layout_component_mapping m ON m.component_id = cf.component_id
      WHERE m.layout_id = $1
        AND m.deleted_at IS NULL
        AND cf.deleted_at IS NULL
        AND cf.is_active = TRUE
        AND cf.format_id IS NOT NULL
        AND f.deleted_at IS NULL
        AND f.is_active = TRUE
      ORDER BY f.id
    `, [layoutId]);
    
    console.log('Query returned', formatsResult.rows.length, 'formats:');
    formatsResult.rows.forEach(r => {
      console.log(`  - ${r.id} (is_active check should be TRUE)`);
    });
    
    // Also check all formats in DB
    const allFormats = await client.query(`
      SELECT id, is_active, deleted_at
      FROM config.formats
      ORDER BY id
    `);
    
    console.log('\nAll formats in DB:');
    allFormats.rows.forEach(f => {
      console.log(`  - ${f.id}: is_active=${f.is_active}, deleted_at=${f.deleted_at}`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

testQuery();
