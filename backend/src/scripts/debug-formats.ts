import { pool } from "../config/database.js";

async function debugFormats() {
  const client = await pool.connect();
  try {
    // Get default layout
    const layoutResult = await client.query(`
      SELECT id
      FROM config.layouts
      WHERE is_default = TRUE AND is_active = TRUE AND deleted_at IS NULL
      ORDER BY display_order, updated_at DESC, id
      LIMIT 1
    `);
    
    if (layoutResult.rows.length === 0) {
      console.log("No default layout found");
      return;
    }
    
    const layoutId = layoutResult.rows[0].id;
    console.log("Layout ID:", layoutId);
    
    // Check what formats are used in component_fields
    const usedFormats = await client.query(`
      SELECT DISTINCT cf.format_id
      FROM config.component_fields cf
      INNER JOIN config.layout_component_mapping m ON m.component_id = cf.component_id
      WHERE m.layout_id = $1
        AND m.deleted_at IS NULL
        AND cf.deleted_at IS NULL
        AND cf.is_active = TRUE
        AND cf.format_id IS NOT NULL
    `, [layoutId]);
    
    console.log("\nUsed format IDs from query:", usedFormats.rows.map(r => r.format_id));
    
    // Check all formats in database
    const allFormats = await client.query(`
      SELECT id, deleted_at, is_active
      FROM config.formats
      ORDER BY id
    `);
    
    console.log("\nAll formats in database:");
    for (const f of allFormats.rows) {
      console.log(`  ${f.id}: deleted_at=${f.deleted_at}, is_active=${f.is_active}`);
    }
    
    // Check what formats would be returned by current query
    const usedFormatIds = usedFormats.rows.map(r => r.format_id).filter(id => id !== null);
    if (usedFormatIds.length > 0) {
      const formatsResult = await client.query(`
        SELECT id
        FROM config.formats
        WHERE id = ANY($1::VARCHAR[])
          AND deleted_at IS NULL
          AND is_active = TRUE
        ORDER BY id
      `, [usedFormatIds]);
      
      console.log("\nFormats that should be returned:", formatsResult.rows.map(r => r.id));
    } else {
      console.log("\nNo formats should be returned (usedFormatIds is empty)");
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

debugFormats();
