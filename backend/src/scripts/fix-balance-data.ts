/**
 * Script to fix balance data:
 * 1. Delete all data from mart.balance except for balance_assets_table and balance_liabilities_table
 * 2. Update component_fields to mark hierarchy fields correctly
 * 3. Mark analytical fields as groupable and not visible
 */

import { pool } from "../config/database.js";

async function fixBalanceData() {
  const client = await pool.connect();
  try {
    console.log("=== Исправление данных balance ===\n");

    // Step 1: Check current table_component_id values
    console.log("1. Проверка текущих table_component_id в mart.balance:");
    const currentTables = await client.query(`
      SELECT DISTINCT table_component_id, COUNT(*) as count
      FROM mart.balance
      GROUP BY table_component_id
      ORDER BY table_component_id
    `);
    
    console.log(`   Найдено table_component_id: ${currentTables.rows.length}`);
    currentTables.rows.forEach((row) => {
      console.log(`   - ${row.table_component_id}: ${row.count} записей`);
    });

    // Step 2: Delete data for other tables
    const validTables = ['balance_assets_table', 'balance_liabilities_table'];
    const tablesToDelete = currentTables.rows
      .filter(row => !validTables.includes(row.table_component_id))
      .map(row => row.table_component_id);

    if (tablesToDelete.length > 0) {
      console.log(`\n2. Удаление данных для других таблиц: ${tablesToDelete.join(', ')}`);
      const deleteResult = await client.query(
        `DELETE FROM mart.balance 
         WHERE table_component_id = ANY($1::varchar[])`,
        [tablesToDelete]
      );
      console.log(`   ✓ Удалено записей: ${deleteResult.rowCount}`);
    } else {
      console.log("\n2. ✓ Все данные уже соответствуют требуемым таблицам");
    }

    // Step 3: Check current component_fields for both tables
    console.log("\n3. Проверка component_fields для balance_assets_table и balance_liabilities_table:");
    
    const componentFields = await client.query(`
      SELECT 
        component_id,
        field_id,
        field_type,
        is_visible,
        is_groupable,
        parent_field_id,
        display_order
      FROM config.component_fields
      WHERE component_id IN ('balance_assets_table', 'balance_liabilities_table')
        AND deleted_at IS NULL
      ORDER BY component_id, display_order, field_id
    `);

    console.log(`   Найдено полей: ${componentFields.rows.length}`);
    const fieldsByComponent: Record<string, typeof componentFields.rows> = {};
    componentFields.rows.forEach((row) => {
      if (!fieldsByComponent[row.component_id]) {
        fieldsByComponent[row.component_id] = [];
      }
      fieldsByComponent[row.component_id].push(row);
    });

    // Hierarchy fields from first screenshot
    const hierarchyFields = ['class', 'section', 'item', 'sub_item'];
    
    // Analytical fields from second screenshot
    const analyticalFields = ['client_type', 'client_segment', 'product_code', 'portfolio_code', 'currency_code'];

    // Step 4: Ensure components exist, then update component_fields
    console.log("\n4. Проверка и создание компонентов (если нужно):");
    
    for (const componentId of ['balance_assets_table', 'balance_liabilities_table']) {
      // Check if component exists
      const componentCheck = await client.query(
        `SELECT id FROM config.components WHERE id = $1`,
        [componentId]
      );

      if (componentCheck.rows.length === 0) {
        // Component doesn't exist, need to create it
        const title = componentId === 'balance_assets_table' ? 'Активы' : 'Пассивы';
        const dataSourceKey = componentId === 'balance_assets_table' ? 'balance_assets' : 'balance_liabilities';
        
        await client.query(
          `INSERT INTO config.components 
           (id, component_type, title, data_source_key, is_active, created_by)
           VALUES ($1, 'table', $2, $3, TRUE, 'system')`,
          [componentId, title, dataSourceKey]
        );
        console.log(`     + ${componentId}: компонент создан`);
      } else {
        console.log(`     ✓ ${componentId}: компонент существует`);
      }
    }

    // Step 5: Update component_fields
    console.log("\n5. Обновление component_fields:");
    
    // Re-fetch component_fields after potentially creating components
    const updatedComponentFields = await client.query(`
      SELECT 
        component_id,
        field_id,
        field_type,
        is_visible,
        is_groupable,
        parent_field_id,
        display_order
      FROM config.component_fields
      WHERE component_id IN ('balance_assets_table', 'balance_liabilities_table')
        AND deleted_at IS NULL
      ORDER BY component_id, display_order, field_id
    `);
    
    for (const componentId of ['balance_assets_table', 'balance_liabilities_table']) {
      console.log(`\n   Компонент: ${componentId}`);
      
      // Update hierarchy fields
      for (const fieldId of hierarchyFields) {
        // Find the field
        const existingField = updatedComponentFields.rows.find(
          f => f.component_id === componentId && f.field_id === fieldId
        );

        // Determine parent_field_id based on hierarchy
        let parentFieldId: string | null = null;
        if (fieldId === 'section') {
          parentFieldId = 'class';
        } else if (fieldId === 'item') {
          parentFieldId = 'section';
        } else if (fieldId === 'sub_item') {
          parentFieldId = 'item';
        }

        if (existingField) {
          // Update: should be visible, hierarchy, not groupable
          await client.query(
            `UPDATE config.component_fields
             SET 
               is_visible = TRUE,
               is_groupable = FALSE,
               parent_field_id = $1,
               updated_at = CURRENT_TIMESTAMP
             WHERE component_id = $2 AND field_id = $3`,
            [parentFieldId, componentId, fieldId]
          );
          
          console.log(`     ✓ ${fieldId}: иерархия (parent: ${parentFieldId || 'none'})`);
        } else {
          // Field doesn't exist, create it
          const displayOrder = hierarchyFields.indexOf(fieldId);
          
          await client.query(
            `INSERT INTO config.component_fields 
             (component_id, field_id, field_type, label, is_visible, is_groupable, parent_field_id, display_order, is_active, created_by)
             VALUES ($1, $2, 'string', $3, TRUE, FALSE, $4, $5, TRUE, 'system')`,
            [componentId, fieldId, fieldId, parentFieldId, displayOrder]
          );
          console.log(`     + ${fieldId}: создано как иерархия (parent: ${parentFieldId || 'none'})`);
        }
      }

      // Update analytical fields
      for (const fieldId of analyticalFields) {
        const existingField = updatedComponentFields.rows.find(
          f => f.component_id === componentId && f.field_id === fieldId
        );

        if (existingField) {
          // Update: not visible, groupable, no parent
          await client.query(
            `UPDATE config.component_fields
             SET 
               is_visible = FALSE,
               is_groupable = TRUE,
               parent_field_id = NULL,
               updated_at = CURRENT_TIMESTAMP
             WHERE component_id = $1 AND field_id = $2`,
            [componentId, fieldId]
          );
          console.log(`     ✓ ${fieldId}: аналитическое (groupable, не видимое)`);
        } else {
          // Field doesn't exist, create it
          const displayOrder = 100 + analyticalFields.indexOf(fieldId);
          
          await client.query(
            `INSERT INTO config.component_fields 
             (component_id, field_id, field_type, label, is_visible, is_groupable, parent_field_id, display_order, is_active, created_by)
             VALUES ($1, $2, 'string', $3, FALSE, TRUE, NULL, $4, TRUE, 'system')`,
            [componentId, fieldId, fieldId, displayOrder]
          );
          console.log(`     + ${fieldId}: создано как аналитическое (groupable, не видимое)`);
        }
      }
    }

    // Step 6: Verify the result
    console.log("\n6. Проверка результата:");
    
    const remainingTables = await client.query(`
      SELECT DISTINCT table_component_id, COUNT(*) as count
      FROM mart.balance
      GROUP BY table_component_id
      ORDER BY table_component_id
    `);
    
    console.log(`   Осталось table_component_id: ${remainingTables.rows.length}`);
    remainingTables.rows.forEach((row) => {
      console.log(`   - ${row.table_component_id}: ${row.count} записей`);
    });

    const updatedFields = await client.query(`
      SELECT 
        component_id,
        field_id,
        is_visible,
        is_groupable,
        parent_field_id
      FROM config.component_fields
      WHERE component_id IN ('balance_assets_table', 'balance_liabilities_table')
        AND deleted_at IS NULL
        AND field_id IN (
          'class', 'section', 'item', 'sub_item',
          'client_type', 'client_segment', 'product_code', 'portfolio_code', 'currency_code'
        )
      ORDER BY component_id, field_id
    `);

    console.log(`\n   Обновлено полей: ${updatedFields.rows.length}`);
    const fieldsByType: Record<string, typeof updatedFields.rows> = {
      hierarchy: [],
      analytical: []
    };

    updatedFields.rows.forEach((row) => {
      if (hierarchyFields.includes(row.field_id)) {
        fieldsByType.hierarchy.push(row);
      } else if (analyticalFields.includes(row.field_id)) {
        fieldsByType.analytical.push(row);
      }
    });

    console.log(`\n   Иерархия (${fieldsByType.hierarchy.length}):`);
    fieldsByType.hierarchy.forEach((row) => {
      console.log(`     - ${row.component_id}.${row.field_id}: visible=${row.is_visible}, groupable=${row.is_groupable}, parent=${row.parent_field_id || 'none'}`);
    });

    console.log(`\n   Аналитические (${fieldsByType.analytical.length}):`);
    fieldsByType.analytical.forEach((row) => {
      console.log(`     - ${row.component_id}.${row.field_id}: visible=${row.is_visible}, groupable=${row.is_groupable}`);
    });

    console.log("\n=== Завершено ===");
  } catch (error) {
    console.error("Ошибка при исправлении данных:", error);
    throw error;
  } finally {
    client.release();
  }
}

fixBalanceData()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
