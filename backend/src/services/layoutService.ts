import { pool } from "../config/database.js";

/**
 * Builds layout JSON structure from database
 */
export async function buildLayoutFromDB(requestedLayoutId?: string) {
  const client = await pool.connect();
  try {
    // Resolve target layout
    let layoutId = requestedLayoutId;
    if (!layoutId) {
      const def = await client.query(
        `SELECT id
         FROM config.layouts
         WHERE is_default = TRUE AND is_active = TRUE AND deleted_at IS NULL
         ORDER BY display_order, updated_at DESC, id
         LIMIT 1`
      );
      if (def.rows.length > 0) {
        layoutId = def.rows[0].id as string;
      }
    }
    if (!layoutId) {
      // If no layout configured yet, return minimal structure
      return { formats: {}, sections: [] };
    }

    // 1) Formats
    const formatsResult = await client.query(`
      SELECT 
        id, kind, pattern, currency, prefix_unit_symbol, suffix_unit_symbol,
        minimum_fraction_digits, maximum_fraction_digits, thousand_separator,
        multiplier, shorten, color_rules, symbol_rules
      FROM config.formats
      ORDER BY id
    `);
    const formats: any = {};
    for (const row of formatsResult.rows) {
      formats[row.id] = {
        kind: row.kind,
        ...(row.pattern && { pattern: row.pattern }),
        ...(row.currency && { currency: row.currency }),
        ...(row.prefix_unit_symbol && { prefixUnitSymbol: row.prefix_unit_symbol }),
        ...(row.suffix_unit_symbol && { suffixUnitSymbol: row.suffix_unit_symbol }),
        ...(row.minimum_fraction_digits !== null && { minimumFractionDigits: row.minimum_fraction_digits }),
        ...(row.maximum_fraction_digits !== null && { maximumFractionDigits: row.maximum_fraction_digits }),
        ...(row.thousand_separator !== null && { thousandSeparator: row.thousand_separator }),
        ...(row.multiplier !== null && { multiplier: parseFloat(row.multiplier) }),
        ...(row.shorten !== null && { shorten: row.shorten }),
        ...(row.color_rules && { colorRules: row.color_rules }),
        ...(row.symbol_rules && { symbolRules: row.symbol_rules }),
      };
    }

    // 2) Sections (containers at top level)
    const sectionsQuery = await client.query(
      `SELECT 
         m.instance_id AS section_instance_id,
         COALESCE(m.title_override, c.title, m.instance_id) AS section_title
       FROM config.layout_component_mapping m
       JOIN config.components c ON c.id = m.component_id
       WHERE m.layout_id = $1
         AND m.parent_instance_id IS NULL
         AND c.component_type = 'container'
         AND m.deleted_at IS NULL
       ORDER BY m.display_order, m.id`,
      [layoutId]
    );

    const sections: any[] = [];
    for (const s of sectionsQuery.rows) {
      const sectionInstanceId: string = s.section_instance_id;

      // 3) Child components for each section
      const comps = await client.query(
        `SELECT 
           m.instance_id,
           m.title_override,
           m.tooltip_override,
           m.icon_override,
           m.data_source_key_override,
           c.id AS component_id,
           c.component_type,
           c.title AS component_title,
           c.tooltip,
           c.icon,
           c.data_source_key
         FROM config.layout_component_mapping m
         JOIN config.components c ON c.id = m.component_id
         WHERE m.layout_id = $1
           AND m.parent_instance_id = $2
           AND m.deleted_at IS NULL
         ORDER BY m.display_order, m.id`,
        [layoutId, sectionInstanceId]
      );

      const components: any[] = [];
      for (const r of comps.rows) {
        const type: string = r.component_type;
        if (type === "card") {
          const card: any = {
            id: r.instance_id,
            type: "card",
            title: r.title_override ?? r.component_title ?? r.instance_id,
            ...(r.tooltip_override ?? r.tooltip ? { tooltip: r.tooltip_override ?? r.tooltip } : {}),
            ...(r.icon_override ?? r.icon ? { icon: r.icon_override ?? r.icon } : {}),
            dataSourceKey: r.data_source_key_override ?? r.data_source_key,
          };
          components.push(card);
        } else if (type === "table") {
          // Fetch fields for the referenced component
          const fields = await client.query(
            `SELECT 
               field_id, label, field_type, format_id, is_visible, display_order
             FROM config.component_fields
             WHERE component_id = $1
               AND (deleted_at IS NULL)
               AND (is_active = TRUE)
             ORDER BY display_order, id`,
            [r.component_id]
          );
          const columns = fields.rows
            .filter((f) => f.is_visible !== false)
            .map((f) => {
              const col: any = {
                id: f.field_id,
                label: f.label ?? f.field_id,
                type: f.field_type,
              };
              if (f.format_id) {
                col.format = { value: f.format_id };
              }
              return col;
            });
          const table: any = {
            id: r.instance_id,
            type: "table",
            title: r.title_override ?? r.component_title ?? r.instance_id,
            columns,
            dataSourceKey: r.data_source_key_override ?? r.data_source_key,
          };
          components.push(table);
        } else if (type === "chart") {
          const chart: any = {
            id: r.instance_id,
            type: "chart",
            title: r.title_override ?? r.component_title ?? r.instance_id,
            dataSourceKey: r.data_source_key_override ?? r.data_source_key,
          };
          components.push(chart);
        } else if (type === "filter") {
          // Filters will be projected into filters[] later if needed; skip adding as component
          continue;
        }
      }

      sections.push({
        id: sectionInstanceId,
        title: s.section_title,
        components,
      });
    }

    return { formats, sections };
  } finally {
    client.release();
  }
}
