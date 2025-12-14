import { pool } from "../config/database.js";

/**
 * Builds layout JSON structure from database
 */
export async function buildLayoutFromDB() {
  const client = await pool.connect();
  try {
    // 1. Fetch formats
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

    // 2. Fetch filter groups and items
    const filterGroupsResult = await client.query(`
      SELECT id, label, sort_order
      FROM config.filter_groups
      ORDER BY sort_order, id
    `);
    const filters: any[] = [];
    for (const groupRow of filterGroupsResult.rows) {
      const filterItemsResult = await client.query(
        `SELECT filter_id, label, type, params, sort_order
         FROM config.filter_items
         WHERE filter_group_id = $1
         ORDER BY sort_order, filter_id`,
        [groupRow.id]
      );
      filters.push({
        group: groupRow.id,
        items: filterItemsResult.rows.map((item) => ({
          id: item.filter_id,
          label: item.label,
          type: item.type,
          ...(item.params && { params: item.params }),
        })),
      });
    }

    // 3. Fetch sections with components
    const sectionsResult = await client.query(`
      SELECT id, title, sort_order
      FROM config.sections
      ORDER BY sort_order, id
    `);
    const sections: any[] = [];
    for (const sectionRow of sectionsResult.rows) {
      // Fetch components for this section
      const componentsResult = await client.query(
        `SELECT 
          id, type, title, tooltip, icon, data_source_key,
          compact_display, groupable_fields, sort_order
         FROM config.components
         WHERE section_id = $1
         ORDER BY sort_order, id`,
        [sectionRow.id]
      );
      const components: any[] = [];
      for (const compRow of componentsResult.rows) {
        if (compRow.type === "card") {
          // Fetch format info for card from columns table
          const cardColumnsResult = await client.query(
            `SELECT format_value, format_pptd, format_ytd
             FROM config.columns
             WHERE component_id = $1 AND column_id = 'value'
             LIMIT 1`,
            [compRow.id]
          );
          const cardComponent: any = {
            id: compRow.id,
            type: compRow.type,
            title: compRow.title,
            ...(compRow.tooltip && { tooltip: compRow.tooltip }),
            ...(compRow.icon && { icon: compRow.icon }),
            dataSourceKey: compRow.data_source_key,
            ...(compRow.compact_display !== null && { compactDisplay: compRow.compact_display }),
          };
          if (cardColumnsResult.rows.length > 0) {
            const formatRow = cardColumnsResult.rows[0];
            const format: any = {};
            if (formatRow.format_value) format.value = formatRow.format_value;
            if (formatRow.format_pptd) format.PPTD = formatRow.format_pptd;
            if (formatRow.format_ytd) format.YTD = formatRow.format_ytd;
            if (Object.keys(format).length > 0) {
              cardComponent.format = format;
            }
          }
          components.push(cardComponent);
        } else if (compRow.type === "table") {
          // Fetch columns for table
          const tableColumnsResult = await client.query(
            `SELECT 
              column_id, label, type, is_dimension, is_measure,
              format_value, format_pptd, format_ytd, sort_order
             FROM config.columns
             WHERE component_id = $1
             ORDER BY sort_order, column_id`,
            [compRow.id]
          );
          const columns = tableColumnsResult.rows.map((col) => {
            const column: any = {
              id: col.column_id,
              label: col.label,
              type: col.type,
              ...(col.is_dimension && { isDimension: col.is_dimension }),
              ...(col.is_measure && { isMeasure: col.is_measure }),
            };
            const format: any = {};
            if (col.format_value) format.value = col.format_value;
            if (col.format_pptd) format.PPTD = col.format_pptd;
            if (col.format_ytd) format.YTD = col.format_ytd;
            if (Object.keys(format).length > 0) {
              column.format = format;
            }
            return column;
          });
          const tableComponent: any = {
            id: compRow.id,
            type: compRow.type,
            title: compRow.title,
            ...(compRow.groupable_fields && compRow.groupable_fields.length > 0 && {
              groupableFields: compRow.groupable_fields,
            }),
            columns,
          };
          components.push(tableComponent);
        }
      }
      sections.push({
        id: sectionRow.id,
        title: sectionRow.title,
        components,
      });
    }

    return {
      formats,
      ...(filters.length > 0 && { filters }),
      sections,
    };
  } finally {
    client.release();
  }
}
