import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LayoutData {
  formats?: Record<string, unknown>;
  filters?: Array<{
    group: string;
    items: Array<{
      id: string;
      label: string;
      type: string;
      params?: Record<string, unknown>;
    }>;
  }>;
  sections: Array<{
    id: string;
    title: string;
    components: Array<{
      id: string;
      type: string;
      title?: string;
      tooltip?: string;
      icon?: string;
      dataSourceKey?: string;
      format?: Record<string, string>;
      compactDisplay?: boolean;
      columns?: Array<{
        id: string;
        label: string;
        type: string;
        isDimension?: boolean;
        isMeasure?: boolean;
        format?: Record<string, string>;
      }>;
      groupableFields?: string[];
    }>;
  }>;
}

async function migrateLayoutData() {
  const client = await pool.connect();
  try {
    console.log("Starting layout data migration...");

    // Read layout.json
    const layoutPath = join(__dirname, "../mockups/layout.json");
    const layoutContent = await readFile(layoutPath, "utf-8");
    const layoutData: LayoutData = JSON.parse(layoutContent);

    // 1. Create main layout
    console.log("Creating main layout...");
    await client.query(
      `INSERT INTO config.layouts (
        id, name, description, status, is_active, is_default, display_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_default = EXCLUDED.is_default,
        updated_at = CURRENT_TIMESTAMP`,
      [
        "main_dashboard",
        "Основной дашборд",
        "Главный дашборд банка с финансовыми показателями",
        "published",
        true,
        true,
        0,
        "system",
      ]
    );
    console.log("✅ Layout 'main_dashboard' created");

    const layoutId = "main_dashboard";
    let displayOrder = 0;

    // 2. Migrate sections as container components
    for (const section of layoutData.sections) {
      const sectionComponentId = `section_${section.id}`;
      displayOrder++;

      // Create section component (container)
      await client.query(
        `INSERT INTO config.components (
          id, component_type, title, description, category, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP`,
        [
          sectionComponentId,
          "container",
          section.title,
          `Секция: ${section.title}`,
          "section",
          true,
          "system",
        ]
      );

      // Create mapping for section (top level, parent = NULL)
      await client.query(
        `INSERT INTO config.layout_component_mapping (
          layout_id, component_id, instance_id, parent_instance_id, display_order, is_visible, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (layout_id, instance_id) DO UPDATE SET
          display_order = EXCLUDED.display_order,
          updated_at = CURRENT_TIMESTAMP`,
        [layoutId, sectionComponentId, sectionComponentId, null, displayOrder, true, "system"]
      );

      // 3. Migrate components within section
      let componentOrder = 0;
      for (const comp of section.components) {
        componentOrder++;

        // Create component
        await client.query(
          `INSERT INTO config.components (
            id, component_type, title, label, tooltip, icon, data_source_key, 
            settings, description, category, is_active, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            label = EXCLUDED.label,
            tooltip = EXCLUDED.tooltip,
            icon = EXCLUDED.icon,
            data_source_key = EXCLUDED.data_source_key,
            settings = EXCLUDED.settings,
            updated_at = CURRENT_TIMESTAMP`,
          [
            comp.id,
            comp.type,
            comp.title,
            comp.title,
            comp.tooltip || null,
            comp.icon || null,
            comp.dataSourceKey || null,
            comp.groupableFields ? JSON.stringify({ groupableFields: comp.groupableFields }) : null,
            comp.type === "table" ? `Таблица: ${comp.title}` : comp.type === "card" ? `Карточка: ${comp.title}` : null,
            comp.type,
            true,
            "system",
          ]
        );

        // Create mapping for component (child of section)
        await client.query(
          `INSERT INTO config.layout_component_mapping (
            layout_id, component_id, instance_id, parent_instance_id, display_order, is_visible, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (layout_id, instance_id) DO UPDATE SET
            display_order = EXCLUDED.display_order,
            updated_at = CURRENT_TIMESTAMP`,
          [layoutId, comp.id, comp.id, sectionComponentId, componentOrder, true, "system"]
        );

        // 4. For tables, migrate columns as component_fields
        if (comp.type === "table" && comp.columns) {
          let fieldOrder = 0;
          for (const col of comp.columns) {
            fieldOrder++;

            // Determine format_id from column format
            let formatId = null;
            if (col.format && col.format.value) {
              formatId = col.format.value;
            }

            // Check if field already exists
            const existingField = await client.query(
              `SELECT id FROM config.component_fields 
               WHERE component_id = $1 AND field_id = $2 AND deleted_at IS NULL`,
              [comp.id, col.id]
            );

            if (existingField.rows.length === 0) {
              await client.query(
                `INSERT INTO config.component_fields (
                  component_id, field_id, field_type, label, description, format_id,
                  is_visible, is_sortable, display_order, is_active, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                  comp.id,
                  col.id,
                  col.type,
                  col.label,
                  col.isDimension ? "Измерение" : col.isMeasure ? "Метрика" : null,
                  formatId,
                  true,
                  col.isMeasure !== false, // Measures are sortable by default
                  fieldOrder,
                  true,
                  "system",
                ]
              );
            } else {
              // Update existing field
              await client.query(
                `UPDATE config.component_fields SET
                  field_type = $3, label = $4, description = $5, format_id = $6,
                  is_visible = $7, is_sortable = $8, display_order = $9,
                  updated_at = CURRENT_TIMESTAMP
                WHERE component_id = $1 AND field_id = $2`,
                [
                  comp.id,
                  col.id,
                  col.type,
                  col.label,
                  col.isDimension ? "Измерение" : col.isMeasure ? "Метрика" : null,
                  formatId,
                  true,
                  col.isMeasure !== false,
                  fieldOrder,
                ]
              );
            }
          }
          console.log(`  ✅ Migrated ${comp.columns.length} fields for table '${comp.id}'`);
        }

        // 5. For cards, handle format settings
        if (comp.type === "card" && comp.format) {
          // Format is stored in component settings or can be handled via overrides in mapping
          // For now, we'll store it in settings
          const formatSettings = JSON.stringify(comp.format);
          await client.query(
            `UPDATE config.components 
             SET settings = $1::jsonb
             WHERE id = $2`,
            [formatSettings, comp.id]
          );
        }
      }

      console.log(`✅ Migrated section '${section.id}' with ${section.components.length} components`);
    }

    // 6. Migrate filters
    if (layoutData.filters && layoutData.filters.length > 0) {
      let filterGroupOrder = 0;
      for (const filterGroup of layoutData.filters) {
        filterGroupOrder++;

        // Create filter group as container component
        const filterGroupComponentId = `filter_group_${filterGroup.group}`;
        await client.query(
          `INSERT INTO config.components (
            id, component_type, title, description, category, is_active, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            updated_at = CURRENT_TIMESTAMP`,
          [
            filterGroupComponentId,
            "container",
            `Фильтры: ${filterGroup.group}`,
            `Группа фильтров: ${filterGroup.group}`,
            "filter",
            true,
            "system",
          ]
        );

        // Create mapping for filter group
        await client.query(
          `INSERT INTO config.layout_component_mapping (
            layout_id, component_id, instance_id, parent_instance_id, display_order, is_visible, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (layout_id, instance_id) DO UPDATE SET
            display_order = EXCLUDED.display_order,
            updated_at = CURRENT_TIMESTAMP`,
          [
            layoutId,
            filterGroupComponentId,
            filterGroupComponentId,
            null,
            1000 + filterGroupOrder, // Place filters after sections
            true,
            "system",
          ]
        );

        // Create filter items
        let filterItemOrder = 0;
        for (const filterItem of filterGroup.items) {
          filterItemOrder++;

          // Create filter component
          await client.query(
            `INSERT INTO config.components (
              id, component_type, title, label, data_source_key, action_params, 
              description, category, is_active, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              label = EXCLUDED.label,
              action_params = EXCLUDED.action_params,
              updated_at = CURRENT_TIMESTAMP`,
            [
              filterItem.id,
              "filter",
              filterItem.label,
              filterItem.label,
              filterItem.id,
              filterItem.params ? JSON.stringify(filterItem.params) : null,
              `Фильтр: ${filterItem.label}`,
              "filter",
              true,
              "system",
            ]
          );

          // Create mapping for filter item
          await client.query(
            `INSERT INTO config.layout_component_mapping (
              layout_id, component_id, instance_id, parent_instance_id, display_order, is_visible, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (layout_id, instance_id) DO UPDATE SET
              display_order = EXCLUDED.display_order,
              updated_at = CURRENT_TIMESTAMP`,
            [
              layoutId,
              filterItem.id,
              filterItem.id,
              filterGroupComponentId,
              filterItemOrder,
              true,
              "system",
            ]
          );
        }

        console.log(`✅ Migrated filter group '${filterGroup.group}' with ${filterGroup.items.length} items`);
      }
    }

    console.log("✅ Layout data migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateLayoutData().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

