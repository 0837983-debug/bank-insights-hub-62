import { pool } from "../../config/database.js";
import { getAssets } from "../mart/balanceService.js";

/**
 * Строит JSON структуру layout из базы данных
 */
export async function buildLayoutFromDB(requestedLayoutId?: string) {
  try {
    // Определяем целевой layout
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
      // Если layout еще не настроен, возвращаем минимальную структуру
      return { formats: {}, sections: [] };
    }

    // 1) Собираем все ID форматов, которые используются в активных компонентах этого layout
    // Включаем форматы из всех полей: основных (без parent_field_id) и дочерних (с parent_field_id)
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
    console.log('[layoutService] Used format IDs from all component fields:', formatIds);

    // 2) Загружаем все форматы, которые используются в компонентах layout'а
    const formatsDataResult = await pool.query(
      formatIds.length > 0
        ? `SELECT 
            id, kind, pattern, prefix_unit_symbol as "prefixUnitSymbol",
            suffix_unit_symbol as "suffixUnitSymbol", minimum_fraction_digits as "minimumFractionDigits",
            maximum_fraction_digits as "maximumFractionDigits", thousand_separator as "thousandSeparator",
            multiplier, shorten
          FROM config.formats
          WHERE id = ANY($1::varchar[])
            AND deleted_at IS NULL
            AND is_active = TRUE
          ORDER BY id ASC`
        : `SELECT * FROM config.formats WHERE FALSE`,
      formatIds.length > 0 ? [formatIds] : []
    );
    const formatsData = formatsDataResult.rows;

    console.log('[layoutService] Loaded', formatsData.length, 'formats:', formatsData.map((f: { id: string }) => f.id));

    const formats: any = {};
    console.log('[layoutService] Building formats object from', formatsData.length, 'formats');
    for (const format of formatsData) {
      console.log('[layoutService] Adding format:', format.id);
      formats[format.id] = {
        kind: format.kind,
        ...(format.pattern && { pattern: format.pattern }),
        ...(format.prefixUnitSymbol && { prefixUnitSymbol: format.prefixUnitSymbol }),
        ...(format.suffixUnitSymbol && { suffixUnitSymbol: format.suffixUnitSymbol }),
        ...(format.minimumFractionDigits !== null && { minimumFractionDigits: format.minimumFractionDigits }),
        ...(format.maximumFractionDigits !== null && { maximumFractionDigits: format.maximumFractionDigits }),
        ...(format.thousandSeparator !== null && { thousandSeparator: format.thousandSeparator }),
        ...(format.multiplier !== null && { multiplier: Number(format.multiplier) }),
        ...(format.shorten !== null && { shorten: format.shorten }),
      };
    }

    // 2) Секции (контейнеры верхнего уровня)
    const sectionsDataResult = await pool.query(
      `SELECT 
        lcm.id, lcm.layout_id as "layoutId", lcm.component_id as "componentId",
        lcm.display_order as "displayOrder", lcm.is_visible as "isVisible",
        c.id as "component.id", c.component_type as "component.componentType",
        c.title as "component.title", c.label as "component.label",
        c.tooltip as "component.tooltip", c.icon as "component.icon",
        c.action_type as "component.actionType",
        c.action_target as "component.actionTarget", c.action_params as "component.actionParams",
        c.settings as "component.settings", c.description as "component.description",
        c.category as "component.category", c.is_active as "component.isActive",
        c.data_source_key as "component.dataSourceKey"
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.layout_id = $1
        AND lcm.parent_component_id IS NULL
        AND lcm.deleted_at IS NULL
        AND c.component_type = 'container'
      ORDER BY lcm.display_order ASC, lcm.id ASC`,
      [layoutId]
    );
    const sectionsData = sectionsDataResult.rows.map((row: any) => ({
      id: row.id,
      layoutId: row.layoutId,
      componentId: row.componentId,
      displayOrder: row.displayOrder,
      isVisible: row.isVisible,
      component: {
        id: row["component.id"],
        componentType: row["component.componentType"],
        title: row["component.title"],
        label: row["component.label"],
        tooltip: row["component.tooltip"],
        icon: row["component.icon"],
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
      const sectionComponentId = sectionMapping.componentId;
      const sectionTitle = sectionMapping.component.title || sectionComponentId;

      // 3) Дочерние компоненты для каждой секции
      // parent_component_id ссылается на component_id родителя
      const childComponentsResult = await pool.query(
        `SELECT 
          lcm.id, lcm.layout_id as "layoutId", lcm.component_id as "componentId",
          lcm.display_order as "displayOrder", lcm.is_visible as "isVisible",
          c.id as "component.id", c.component_type as "component.componentType",
          c.title as "component.title", c.label as "component.label",
          c.tooltip as "component.tooltip", c.icon as "component.icon",
          c.action_type as "component.actionType",
          c.action_target as "component.actionTarget", c.action_params as "component.actionParams",
          c.settings as "component.settings", c.description as "component.description",
          c.category as "component.category", c.is_active as "component.isActive",
          c.data_source_key as "component.dataSourceKey"
        FROM config.layout_component_mapping lcm
        INNER JOIN config.components c ON lcm.component_id = c.id
        WHERE lcm.layout_id = $1
          AND lcm.parent_component_id = $2
          AND lcm.deleted_at IS NULL
        ORDER BY lcm.display_order ASC, lcm.id ASC`,
        [layoutId, sectionComponentId]
      );
      console.log(`[layoutService] Found ${childComponentsResult.rows.length} child components for section "${sectionTitle}"`);
      childComponentsResult.rows.forEach((row: any) => {
        console.log(`[layoutService]   - ${row.componentId}: ${row["component.componentType"]}`);
      });
      const childComponents = childComponentsResult.rows.map((row: any) => ({
        id: row.id,
        layoutId: row.layoutId,
        componentId: row.componentId,
        displayOrder: row.displayOrder,
        isVisible: row.isVisible,
        component: {
          id: row["component.id"],
          componentType: row["component.componentType"],
          title: row["component.title"],
          label: row["component.label"],
          tooltip: row["component.tooltip"],
          icon: row["component.icon"],
          actionType: row["component.actionType"],
          actionTarget: row["component.actionTarget"],
          actionParams: row["component.actionParams"],
          settings: row["component.settings"],
          description: row["component.description"],
          category: row["component.category"],
          isActive: row["component.isActive"],
          dataSourceKey: row["component.dataSourceKey"],
        },
      }));

      const components: any[] = [];
      console.log(`[layoutService] Processing section "${sectionTitle}" with ${childComponents.length} child components`);
      for (const mapping of childComponents) {
        const type = mapping.component.componentType;
        // Формируем составной ID: layoutId::sectionId::componentId (используем :: как разделитель)
        const compositeId = `${layoutId}::${sectionComponentId}::${mapping.componentId}`;
        console.log(`[layoutService] Component: compositeId=${compositeId}, componentId: ${mapping.componentId}, type: ${type}`);
        if (type === "card") {
          // Получаем поля для компонента card с иерархией parent_field_id
          // Используем сырой SQL для прямого доступа к базе данных
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

          // Разделяем основные поля (без родителя) и дочерние поля (с родителем)
          const mainFields = cardFields.filter((f: { parentFieldId: string | null }) => !f.parentFieldId);
          const childFields = cardFields.filter((f: { parentFieldId: string | null }) => f.parentFieldId);

          // Строим columns из основных полей, включая sub_columns для дочерних полей
          const columns = mainFields
            .filter((f: { isVisible: boolean | null }) => f.isVisible !== false)
            .map((f: any) => {
              const column: any = {
                id: f.fieldId,
                label: f.label ?? f.fieldId,
                type: f.fieldType,
              };

              // Добавляем формат, если есть
              if (f.formatId) {
                column.format = f.formatId;
              }

              // Добавляем описание, если есть
              if (f.description) {
                column.description = f.description;
              }

              // Находим дочерние поля для этого основного поля
              const subColumns = childFields
                .filter((cf: any) => cf.parentFieldId === f.fieldId)
                .map((childField: any) => {
                  const subCol: any = {
                    id: childField.fieldId,
                    label: childField.label ?? childField.fieldId,
                    type: childField.fieldType,
                  };

                  if (childField.formatId) {
                    subCol.format = childField.formatId;
                  }

                  if (childField.description) {
                    subCol.description = childField.description;
                  }

                  return subCol;
                });

              // Добавляем sub_columns, если они есть
              if (subColumns.length > 0) {
                column.sub_columns = subColumns;
              }

              return column;
            });

          // Формируем составной ID: layoutId::sectionId::componentId (используем :: как разделитель)
          const compositeId = `${layoutId}::${sectionComponentId}::${mapping.componentId}`;

          const card: any = {
            id: compositeId,
            componentId: mapping.componentId,
            type: "card",
            title: mapping.component.title ?? mapping.componentId,
            ...(mapping.component.tooltip ? { tooltip: mapping.component.tooltip } : {}),
            ...(mapping.component.icon ? { icon: mapping.component.icon } : {}),
            ...(columns.length > 0 ? { columns } : {}),
            ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
          };
          components.push(card);
        } else if (type === "table") {
          // Получаем поля для указанного компонента
          // Используем сырой SQL для прямого доступа к базе данных
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

          // Разделяем основные поля (без родителя) и дочерние поля (с родителем)
          const mainFields = fields.filter((f: { parentFieldId: string | null }) => !f.parentFieldId);
          const childFields = fields.filter((f: { parentFieldId: string | null }) => f.parentFieldId);

          // Строим columns из основных полей, включая sub_columns для дочерних полей
          const columns = mainFields
            .filter((f: { isVisible: boolean | null }) => f.isVisible !== false)
            .map((f: any) => {
              const column: any = {
                id: f.fieldId,
                label: f.label ?? f.fieldId,
                type: f.fieldType,
              };

              // Добавляем isDimension и isMeasure для определения типа колонки
              if (f.isDimension !== undefined) {
                column.isDimension = f.isDimension;
              }
              if (f.isMeasure !== undefined) {
                column.isMeasure = f.isMeasure;
              }

              // Добавляем формат, если есть
              if (f.formatId) {
                column.format = f.formatId;
              }

              // Добавляем описание, если есть
              if (f.description) {
                column.description = f.description;
              }

              // Находим дочерние поля для этого основного поля
              const subColumns = childFields
                .filter((cf: any) => cf.parentFieldId === f.fieldId)
                .map((childField: any) => {
                  const subCol: any = {
                    id: childField.fieldId,
                    label: childField.label ?? childField.fieldId,
                    type: childField.fieldType,
                  };

                  if (childField.formatId) {
                    subCol.format = childField.formatId;
                  }

                  if (childField.description) {
                    subCol.description = childField.description;
                  }

                  return subCol;
                });

              // Добавляем sub_columns, если они есть
              if (subColumns.length > 0) {
                column.sub_columns = subColumns;
              }

              return column;
            });
          
          // Формируем составной ID: layoutId::sectionId::componentId (используем :: как разделитель)
          const compositeId = `${layoutId}::${sectionComponentId}::${mapping.componentId}`;
          
          const table: any = {
            id: compositeId,
            componentId: mapping.componentId,
            type: "table",
            title: mapping.component.title ?? mapping.componentId,
            columns,
            ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
          };

          // Если это таблица assets в секции Balance, включаем данные
          if (mapping.componentId === "assets" || mapping.componentId === "balance_assets") {
            console.log(`[layoutService] Loading assets data for table ${compositeId} (componentId: ${mapping.componentId})`);
            try {
              const assetsData = await getAssets();
              console.log(`[layoutService] Loaded ${assetsData.length} rows for assets table`);
              // Передаем данные как есть - TableRowData соответствует TableRow
              table.data = {
                tableId: mapping.componentId,
                rows: assetsData,
              };
              console.log(`[layoutService] Added data to assets table, first row:`, table.data.rows[0]);
            } catch (error) {
              console.error(`[layoutService] Error loading assets data for table ${compositeId}:`, error);
              // Продолжаем без данных, если загрузка не удалась
            }
          } else {
            console.log(`[layoutService] Table ${compositeId} is not assets table (componentId: ${mapping.componentId})`);
          }

          // Получаем дочерние компоненты таблицы (кнопки)
          const tableButtonsResult = await pool.query(
            `SELECT 
              lcm.id, lcm.layout_id as "layoutId", lcm.component_id as "componentId",
              lcm.display_order as "displayOrder", lcm.is_visible as "isVisible",
              c.id as "component.id", c.component_type as "component.componentType",
              c.title as "component.title", c.label as "component.label",
              c.tooltip as "component.tooltip", c.icon as "component.icon",
              c.action_type as "component.actionType",
              c.action_target as "component.actionTarget", c.action_params as "component.actionParams",
              c.settings as "component.settings", c.description as "component.description",
              c.category as "component.category", c.is_active as "component.isActive",
              c.data_source_key as "component.dataSourceKey"
            FROM config.layout_component_mapping lcm
            INNER JOIN config.components c ON lcm.component_id = c.id
            WHERE lcm.layout_id = $1
              AND lcm.parent_component_id = $2
              AND lcm.deleted_at IS NULL
              AND c.component_type = 'button'
            ORDER BY lcm.display_order ASC, lcm.id ASC`,
            [layoutId, mapping.componentId]
          );

          const buttons: any[] = [];
          for (const buttonRow of tableButtonsResult.rows) {
            const buttonCompositeId = `${layoutId}::${sectionComponentId}::${mapping.componentId}::${buttonRow.componentId}`;
            const button: any = {
              id: buttonCompositeId,
              componentId: buttonRow.componentId,
              type: "button",
              title: buttonRow["component.title"] ?? buttonRow.componentId,
              ...(buttonRow["component.label"] ? { label: buttonRow["component.label"] } : {}),
              ...(buttonRow["component.tooltip"] ? { tooltip: buttonRow["component.tooltip"] } : {}),
              ...(buttonRow["component.icon"] ? { icon: buttonRow["component.icon"] } : {}),
              ...(buttonRow["component.settings"] ? { settings: buttonRow["component.settings"] } : {}),
              ...(buttonRow["component.dataSourceKey"] ? { dataSourceKey: buttonRow["component.dataSourceKey"] } : {}),
            };
            buttons.push(button);
          }

          // Добавляем кнопки в таблицу, если они есть
          if (buttons.length > 0) {
            table.buttons = buttons;
          }

          components.push(table);
        } else if (type === "chart") {
          // Формируем составной ID: layoutId::sectionId::componentId (используем :: как разделитель)
          const compositeId = `${layoutId}::${sectionComponentId}::${mapping.componentId}`;
          
          const chart: any = {
            id: compositeId,
            componentId: mapping.componentId,
            type: "chart",
            title: mapping.component.title ?? mapping.componentId,
            ...(mapping.component.dataSourceKey ? { dataSourceKey: mapping.component.dataSourceKey } : {}),
          };
          components.push(chart);
        } else if (type === "header") {
          // Header не должен быть в секциях - он обрабатывается отдельно как top-level компонент
          // Пропускаем header здесь
          continue;
        } else if (type === "button") {
          // Кнопки обрабатываются как дочерние компоненты таблиц выше
          // Если кнопка попала сюда, значит она не привязана к таблице - пропускаем
          continue;
        } else if (type === "filter") {
          // Фильтры будут добавлены в filters[] позже при необходимости; пропускаем добавление как компонент
          continue;
        }
      }

      sections.push({
        id: sectionComponentId,
        title: sectionTitle,
        components,
      });
    }

    // 4) Header как отдельный top-level компонент (не в секциях)
    const headerResult = await pool.query(
      `SELECT 
        lcm.id, lcm.layout_id as "layoutId", lcm.component_id as "componentId",
        lcm.display_order as "displayOrder", lcm.is_visible as "isVisible",
        c.id as "component.id", c.component_type as "component.componentType",
        c.title as "component.title", c.label as "component.label",
        c.tooltip as "component.tooltip", c.icon as "component.icon",
        c.action_type as "component.actionType",
        c.action_target as "component.actionTarget", c.action_params as "component.actionParams",
        c.settings as "component.settings", c.description as "component.description",
        c.category as "component.category", c.is_active as "component.isActive",
        c.data_source_key as "component.dataSourceKey"
      FROM config.layout_component_mapping lcm
      INNER JOIN config.components c ON lcm.component_id = c.id
      WHERE lcm.layout_id = $1
        AND lcm.parent_component_id IS NULL
        AND lcm.deleted_at IS NULL
        AND c.component_type = 'header'
      ORDER BY lcm.display_order ASC, lcm.id ASC
      LIMIT 1`,
      [layoutId]
    );

    let header: any = null;
    if (headerResult.rows.length > 0) {
      const row = headerResult.rows[0];
      const componentId = row.componentId;
      const compositeId = `${layoutId}::${componentId}`;

      header = {
        id: compositeId,
        componentId: componentId,
        type: "header",
        title: row["component.title"] ?? componentId,
        ...(row["component.tooltip"] ? { tooltip: row["component.tooltip"] } : {}),
        ...(row["component.icon"] ? { icon: row["component.icon"] } : {}),
        ...(row["component.dataSourceKey"] ? { dataSourceKey: row["component.dataSourceKey"] } : {}),
      };
    }

    // Возвращаем layout с header отдельным полем
    const result: any = { formats, sections };
    if (header) {
      result.header = header;
    }

    return result;
  } catch (error) {
    console.error('[layoutService] Error building layout:', error);
    throw error;
  }
}
