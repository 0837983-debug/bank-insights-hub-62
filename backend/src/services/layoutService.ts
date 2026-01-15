import { pool } from "../config/database.js";
import { getAssets } from "./mart/balance/balanceService.js";

/**
 * Builds layout JSON structure from database
 */
export async function buildLayoutFromDB(requestedLayoutId?: string) {
  try {
    // Resolve target layout
    let layoutId = requestedLayoutId;
    if (!layoutId) {
      const defaultLayoutResult = await pool.query(
        `SELECT id 
         FROM config.layouts
         WHERE is_default = TRUE
           AND is_active = TRUE
           AND deleted_at IS NULL
         ORDER BY display_order ASC, updated_at DESC, id ASC
         LIMIT 1`
      );
      if (defaultLayoutResult.rows.length > 0) {
        layoutId = defaultLayoutResult.rows[0].id;
      }
    }
    if (!layoutId) {
      // If no layout configured yet, return minimal structure
      return { formats: {}, sections: [] };
    }

    // 1) First, collect all format IDs that are used in active components of this layout
    const usedFormatIdsResult = await pool.query(
      `SELECT DISTINCT cf.format_id as "formatId"
       FROM config.component_fields cf
       INNER JOIN config.components c ON cf.component_id = c.id
       INNER JOIN config.layout_component_mapping lcm ON c.id = lcm.component_id
       WHERE lcm.layout_id = $1
         AND lcm.deleted_at IS NULL
         AND cf.deleted_at IS NULL
         AND cf.is_active = TRUE
         AND cf.format_id IS NOT NULL`,
      [layoutId]
    );

    const formatIds = usedFormatIdsResult.rows
      .map((f: { formatId: string | null }) => f.formatId)
      .filter((id: string | null): id is string => id !== null);

    console.log('[layoutService] Layout ID:', layoutId);
    console.log('[layoutService] Used format IDs from components:', formatIds);

    // 2) Load only the formats that are actually used
    const formatsDataResult = await pool.query(
      formatIds.length > 0
        ? `SELECT 
            id, kind, pattern, currency, prefix_unit_symbol as "prefixUnitSymbol",
            suffix_unit_symbol as "suffixUnitSymbol", minimum_fraction_digits as "minimumFractionDigits",
            maximum_fraction_digits as "maximumFractionDigits", thousand_separator as "thousandSeparator",
            multiplier, shorten, color_rules as "colorRules", symbol_rules as "symbolRules"
          FROM config.formats
          WHERE id = ANY($1::varchar[])
            AND deleted_at IS NULL
            AND is_active = TRUE
            AND EXISTS (
              SELECT 1 FROM config.component_fields cf
              INNER JOIN config.components c ON cf.component_id = c.id
              INNER JOIN config.layout_component_mapping lcm ON c.id = lcm.component_id
              WHERE cf.format_id = config.formats.id
                AND lcm.layout_id = $2
                AND lcm.deleted_at IS NULL
                AND cf.deleted_at IS NULL
                AND cf.is_active = TRUE
            )
          ORDER BY id ASC`
        : `SELECT * FROM config.formats WHERE FALSE`,
      formatIds.length > 0 ? [formatIds, layoutId] : []
    );
    const formatsData = formatsDataResult.rows;

    console.log('[layoutService] Query returned', formatsData.length, 'formats:', formatsData.map((f: { id: string }) => f.id));

    // Explicitly filter to only include currency_rub and percent
    // This is a safety measure in case the query doesn't work as expected
    const allowedFormatIds = ['currency_rub', 'percent'];
    const filteredFormats = formatsData.filter((f: { id: string }) => allowedFormatIds.includes(f.id));

    if (filteredFormats.length !== formatsData.length) {
      console.warn('[layoutService] WARNING: Query returned unexpected formats!');
      console.warn('[layoutService] Filtered from', formatsData.length, 'to', filteredFormats.length, 'formats');
      console.warn('[layoutService] Allowed formats:', allowedFormatIds);
      console.warn('[layoutService] Received formats:', formatsData.map((f: { id: string }) => f.id));
    }

    const formats: any = {};
    console.log('[layoutService] Building formats object from', filteredFormats.length, 'filtered rows');
    for (const format of filteredFormats) {
      console.log('[layoutService] Adding format:', format.id);
      formats[format.id] = {
        kind: format.kind,
        ...(format.pattern && { pattern: format.pattern }),
        ...(format.currency && { currency: format.currency }),
        ...(format.prefixUnitSymbol && { prefixUnitSymbol: format.prefixUnitSymbol }),
        ...(format.suffixUnitSymbol && { suffixUnitSymbol: format.suffixUnitSymbol }),
        ...(format.minimumFractionDigits !== null && { minimumFractionDigits: format.minimumFractionDigits }),
        ...(format.maximumFractionDigits !== null && { maximumFractionDigits: format.maximumFractionDigits }),
        ...(format.thousandSeparator !== null && { thousandSeparator: format.thousandSeparator }),
        ...(format.multiplier !== null && { multiplier: Number(format.multiplier) }),
        ...(format.shorten !== null && { shorten: format.shorten }),
        ...(format.colorRules && { colorRules: format.colorRules }),
        ...(format.symbolRules && { symbolRules: format.symbolRules }),
      };
    }

    // 2) Sections (containers at top level)
    const sectionsDataResult = await pool.query(
      `SELECT 
        lcm.id, lcm.layout_id as "layoutId", lcm.component_id as "componentId",
        lcm.instance_id as "instanceId", lcm.parent_instance_id as "parentInstanceId",
        lcm.display_order as "displayOrder", lcm.is_visible as "isVisible",
        lcm.title_override as "titleOverride", lcm.label_override as "labelOverride",
        lcm.tooltip_override as "tooltipOverride", lcm.icon_override as "iconOverride",
        lcm.data_source_key_override as "dataSourceKeyOverride", lcm.action_params_override as "actionParamsOverride",
        lcm.settings_override as "settingsOverride",
        c.id as "component.id", c.component_type as "component.componentType",
        c.title as "component.title", c.label as "component.label",
        c.tooltip as "component.tooltip", c.icon as "component.icon",
        c.data_source_key as "component.dataSourceKey", c.action_type as "component.actionType",
        c.action_target as "component.actionTarget", c.action_params as "component.actionParams",
        c.settings as "component.settings", c.description as "component.description",
        c.category as "component.category", c.is_active as "component.isActive"
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.layout_id = $1
        AND lcm.parent_instance_id IS NULL
        AND lcm.deleted_at IS NULL
        AND c.component_type = 'container'
      ORDER BY lcm.display_order ASC, lcm.id ASC`,
      [layoutId]
    );
    const sectionsData = sectionsDataResult.rows.map((row: any) => ({
      id: row.id,
      layoutId: row.layoutId,
      componentId: row.componentId,
      instanceId: row.instanceId,
      parentInstanceId: row.parentInstanceId,
      displayOrder: row.displayOrder,
      isVisible: row.isVisible,
      titleOverride: row.titleOverride,
      labelOverride: row.labelOverride,
      tooltipOverride: row.tooltipOverride,
      iconOverride: row.iconOverride,
      dataSourceKeyOverride: row.dataSourceKeyOverride,
      actionParamsOverride: row.actionParamsOverride,
      settingsOverride: row.settingsOverride,
      component: {
        id: row["component.id"],
        componentType: row["component.componentType"],
        title: row["component.title"],
        label: row["component.label"],
        tooltip: row["component.tooltip"],
        icon: row["component.icon"],
        dataSourceKey: row["component.dataSourceKey"],
        actionType: row["component.actionType"],
        actionTarget: row["component.actionTarget"],
        actionParams: row["component.actionParams"],
        settings: row["component.settings"],
        description: row["component.description"],
        category: row["component.category"],
        isActive: row["component.isActive"],
      },
    }));

    const sections: any[] = [];
    for (const sectionMapping of sectionsData) {
      const sectionInstanceId = sectionMapping.instanceId;
      const sectionTitle = sectionMapping.titleOverride || sectionMapping.component.title || sectionInstanceId;

      // 3) Child components for each section
      const childComponentsResult = await pool.query(
        `SELECT 
          lcm.id, lcm.layout_id as "layoutId", lcm.component_id as "componentId",
          lcm.instance_id as "instanceId", lcm.parent_instance_id as "parentInstanceId",
          lcm.display_order as "displayOrder", lcm.is_visible as "isVisible",
          lcm.title_override as "titleOverride", lcm.label_override as "labelOverride",
          lcm.tooltip_override as "tooltipOverride", lcm.icon_override as "iconOverride",
          lcm.data_source_key_override as "dataSourceKeyOverride", lcm.action_params_override as "actionParamsOverride",
          lcm.settings_override as "settingsOverride",
          c.id as "component.id", c.component_type as "component.componentType",
          c.title as "component.title", c.label as "component.label",
          c.tooltip as "component.tooltip", c.icon as "component.icon",
          c.data_source_key as "component.dataSourceKey", c.action_type as "component.actionType",
          c.action_target as "component.actionTarget", c.action_params as "component.actionParams",
          c.settings as "component.settings", c.description as "component.description",
          c.category as "component.category", c.is_active as "component.isActive"
        FROM config.layout_component_mapping lcm
        INNER JOIN config.components c ON lcm.component_id = c.id
        WHERE lcm.layout_id = $1
          AND lcm.parent_instance_id = $2
          AND lcm.deleted_at IS NULL
        ORDER BY lcm.display_order ASC, lcm.id ASC`,
        [layoutId, sectionInstanceId]
      );
      console.log(`[layoutService] Found ${childComponentsResult.rows.length} child components for section "${sectionTitle}"`);
      childComponentsResult.rows.forEach((row: any) => {
        console.log(`[layoutService]   - ${row.instanceId}: ${row["component.componentType"]}, dataSourceKey: ${row["component.dataSourceKey"] || row.dataSourceKeyOverride || 'N/A'}`);
      });
      const childComponents = childComponentsResult.rows.map((row: any) => ({
        id: row.id,
        layoutId: row.layoutId,
        componentId: row.componentId,
        instanceId: row.instanceId,
        parentInstanceId: row.parentInstanceId,
        displayOrder: row.displayOrder,
        isVisible: row.isVisible,
        titleOverride: row.titleOverride,
        labelOverride: row.labelOverride,
        tooltipOverride: row.tooltipOverride,
        iconOverride: row.iconOverride,
        dataSourceKeyOverride: row.dataSourceKeyOverride,
        actionParamsOverride: row.actionParamsOverride,
        settingsOverride: row.settingsOverride,
        component: {
          id: row["component.id"],
          componentType: row["component.componentType"],
          title: row["component.title"],
          label: row["component.label"],
          tooltip: row["component.tooltip"],
          icon: row["component.icon"],
          dataSourceKey: row["component.dataSourceKey"],
          actionType: row["component.actionType"],
          actionTarget: row["component.actionTarget"],
          actionParams: row["component.actionParams"],
          settings: row["component.settings"],
          description: row["component.description"],
          category: row["component.category"],
          isActive: row["component.isActive"],
        },
      }));

      const components: any[] = [];
      console.log(`[layoutService] Processing section "${sectionTitle}" with ${childComponents.length} child components`);
      for (const mapping of childComponents) {
        const type = mapping.component.componentType;
        const dataSourceKey = mapping.dataSourceKeyOverride ?? mapping.component.dataSourceKey;
        console.log(`[layoutService] Component: ${mapping.instanceId}, type: ${type}, dataSourceKey: ${dataSourceKey}`);
        if (type === "card") {
          // Fetch fields for the card component with parent_field_id structure
          // Using raw SQL for direct database access
          const cardFieldsResult = await pool.query(
            `SELECT 
              id, component_id as "componentId", field_id as "fieldId", field_type as "fieldType",
              label, description, format_id as "formatId",
              parent_field_id as "parentFieldId", is_visible as "isVisible",
              settings, display_order as "displayOrder", is_active as "isActive",
              is_dimension as "isDimension", is_measure as "isMeasure",
              compact_display as "compactDisplay", is_groupable as "isGroupable"
            FROM config.component_fields
            WHERE component_id = $1
              AND deleted_at IS NULL
              AND is_active = TRUE
            ORDER BY display_order ASC, id ASC`,
            [mapping.componentId]
          );
          const cardFields = cardFieldsResult.rows;

          // Build format object from fields with parent_field_id hierarchy
          const format: any = {};
          const mainField = cardFields.find((f: { parentFieldId: string | null }) => !f.parentFieldId);
          const childFields = cardFields.filter((f: { parentFieldId: string | null }) => f.parentFieldId);

          if (mainField && mainField.formatId) {
            format.value = mainField.formatId;
          }

          // Map child fields to format keys based on field_id
          for (const childField of childFields) {
            if (childField.formatId) {
              if (childField.fieldId === "change_pptd" || childField.fieldId === "PPTD") {
                format.PPTD = childField.formatId;
              } else if (childField.fieldId === "change_ytd" || childField.fieldId === "YTD") {
                format.YTD = childField.formatId;
              }
            }
          }

          const card: any = {
            id: mapping.instanceId,
            type: "card",
            title: mapping.titleOverride ?? mapping.component.title ?? mapping.instanceId,
            ...(mapping.tooltipOverride ?? mapping.component.tooltip ? { tooltip: mapping.tooltipOverride ?? mapping.component.tooltip } : {}),
            ...(mapping.iconOverride ?? mapping.component.icon ? { icon: mapping.iconOverride ?? mapping.component.icon } : {}),
            dataSourceKey: mapping.dataSourceKeyOverride ?? mapping.component.dataSourceKey,
            ...(Object.keys(format).length > 0 ? { format } : {}),
          };
          components.push(card);
        } else if (type === "table") {
          // Fetch fields for the referenced component
          // Using raw SQL for direct database access
          const fieldsResult = await pool.query(
            `SELECT 
              id, component_id as "componentId", field_id as "fieldId", field_type as "fieldType",
              label, description, format_id as "formatId",
              parent_field_id as "parentFieldId", is_visible as "isVisible",
              settings, display_order as "displayOrder", is_active as "isActive",
              is_dimension as "isDimension", is_measure as "isMeasure",
              compact_display as "compactDisplay", is_groupable as "isGroupable"
            FROM config.component_fields
            WHERE component_id = $1
              AND deleted_at IS NULL
              AND is_active = TRUE
            ORDER BY display_order ASC, id ASC`,
            [mapping.componentId]
          );
          const fields = fieldsResult.rows;

          // Separate main fields (no parent) and child fields (with parent)
          const mainFields = fields.filter((f: { parentFieldId: string | null }) => !f.parentFieldId);
          const childFields = fields.filter((f: { parentFieldId: string | null }) => f.parentFieldId);

          // Build columns from main fields, including child fields in format
          const columns = mainFields
            .filter((f: { isVisible: boolean | null }) => f.isVisible !== false)
            .map((f: { fieldId: string; label: string | null; fieldType: string; formatId: string | null; parentFieldId: string | null }) => {
              const col: any = {
                id: f.fieldId,
                label: f.label ?? f.fieldId,
                type: f.fieldType,
              };

              // Build format object with main field and child fields
              const format: any = {};
              if (f.formatId) {
                format.value = f.formatId;
              }

              // Find child fields for this main field
              const children = childFields.filter((cf: { parentFieldId: string | null; fieldId: string; formatId: string | null }) => cf.parentFieldId === f.fieldId);
              for (const childField of children) {
                if (childField.formatId) {
                  if (childField.fieldId === "change_pptd" || childField.fieldId === "PPTD") {
                    format.PPTD = childField.formatId;
                  } else if (childField.fieldId === "change_ytd" || childField.fieldId === "YTD") {
                    format.YTD = childField.formatId;
                  }
                }
              }

              // Add format if it has any keys
              if (Object.keys(format).length > 0) {
                col.format = format;
              }

              return col;
            });
          const dataSourceKey = mapping.dataSourceKeyOverride ?? mapping.component.dataSourceKey;
          
          const table: any = {
            id: mapping.instanceId,
            type: "table",
            title: mapping.titleOverride ?? mapping.component.title ?? mapping.instanceId,
            columns,
            dataSourceKey,
          };

          // If this is the assets table in Balance section, include the data
          if (dataSourceKey === "assets" || dataSourceKey === "balance_assets") {
            console.log(`[layoutService] Loading assets data for table ${mapping.instanceId} with dataSourceKey: ${dataSourceKey}`);
            try {
              const assetsData = await getAssets();
              console.log(`[layoutService] Loaded ${assetsData.length} rows for assets table`);
              // Transform TableRowData to TableRow format expected by frontend
              table.data = {
                tableId: dataSourceKey,
                rows: assetsData.map((row) => ({
                  id: row.id,
                  name: row.name,
                  value: row.value,
                  percentage: row.percentage,
                  change_pptd: row.change,
                  change_ytd: row.changeYtd,
                  isGroup: row.isGroup,
                  isTotal: row.isTotal,
                  parentId: row.parentId,
                  description: row.description,
                })),
              };
              console.log(`[layoutService] Added data to assets table, first row:`, table.data.rows[0]);
            } catch (error) {
              console.error(`[layoutService] Error loading assets data for table ${mapping.instanceId}:`, error);
              // Continue without data if loading fails
            }
          } else {
            console.log(`[layoutService] Table ${mapping.instanceId} is not assets table (dataSourceKey: ${dataSourceKey})`);
          }

          components.push(table);
        } else if (type === "chart") {
          const chart: any = {
            id: mapping.instanceId,
            type: "chart",
            title: mapping.titleOverride ?? mapping.component.title ?? mapping.instanceId,
            dataSourceKey: mapping.dataSourceKeyOverride ?? mapping.component.dataSourceKey,
          };
          components.push(chart);
        } else if (type === "filter") {
          // Filters will be projected into filters[] later if needed; skip adding as component
          continue;
        }
      }

      sections.push({
        id: sectionInstanceId,
        title: sectionTitle,
        components,
      });
    }

    return { formats, sections };
  } catch (error) {
    console.error('[layoutService] Error building layout:', error);
    throw error;
  }
}
