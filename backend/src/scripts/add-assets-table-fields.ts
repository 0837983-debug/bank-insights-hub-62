/**
 * Add component_fields for assets_table with attributes similar to roa_card
 * Fields: previousValue, ytdValue, ppChange, ppChangeAbsolute, ytdChange, ytdChangeAbsolute
 */

import { pool } from "../config/database.js";

async function addAssetsTableFields() {
  const client = await pool.connect();
  try {
    console.log("=== Добавление полей для assets_table ===\n");

    // Check if assets_table component exists
    const componentCheck = await client.query(
      `SELECT id FROM config.components WHERE id = 'assets_table' AND deleted_at IS NULL`
    );

    if (componentCheck.rows.length === 0) {
      console.log("⚠️  Компонент assets_table не найден");
      return;
    }

    console.log("✓ Компонент assets_table найден\n");

    // Get current fields for assets_table
    const currentFields = await client.query(`
      SELECT field_id, field_type, label, format_id, is_visible, display_order
      FROM config.component_fields
      WHERE component_id = 'assets_table'
        AND deleted_at IS NULL
      ORDER BY display_order, field_id
    `);

    console.log(`Текущие поля (${currentFields.rows.length}):`);
    currentFields.rows.forEach((field) => {
      console.log(`  - ${field.field_id}: order=${field.display_order}, format=${field.format_id || 'none'}`);
    });

    // Fields to add/update based on roa_card structure
    // Note: roa_card doesn't have previousValue and ytdValue as separate visible fields,
    // but they might be needed for assets_table. Let's check what's needed.
    
    // Get max order from existing fields to set proper order
    const maxOrder = Math.max(...currentFields.rows.map(f => f.display_order || 0), 0);
    
    const fieldsToAdd = [
      {
        field_id: 'previousValue',
        field_type: 'number',
        label: 'Предыдущее значение',
        format_id: 'currency_rub', // Using same format as value field
        is_visible: true,
        display_order: maxOrder + 1, // After existing fields
      },
      {
        field_id: 'ytdValue',
        field_type: 'number',
        label: 'Значение YTD',
        format_id: 'currency_rub', // Using same format as value field
        is_visible: true,
        display_order: maxOrder + 2,
      },
      // ppChange already exists with order 4, so we keep it
      // ppChangeAbsolute should be after ppChange
      {
        field_id: 'ppChangeAbsolute',
        field_type: 'number',
        label: 'Изменение к ПП (абс.)',
        format_id: 'number',
        is_visible: true,
        display_order: maxOrder + 3,
      },
      {
        field_id: 'ytdChange',
        field_type: 'number',
        label: 'Изменение YTD',
        format_id: 'percent',
        is_visible: true,
        display_order: maxOrder + 4,
      },
      {
        field_id: 'ytdChangeAbsolute',
        field_type: 'number',
        label: 'Изменение YTD (абс.)',
        format_id: 'number',
        is_visible: true,
        display_order: maxOrder + 5,
      },
    ];

    console.log("\nДобавление/обновление полей:\n");

    let addedCount = 0;
    let updatedCount = 0;

    for (const field of fieldsToAdd) {
      const existing = currentFields.rows.find(f => f.field_id === field.field_id);

      if (existing) {
        // Update existing field
        await client.query(
          `UPDATE config.component_fields
           SET 
             field_type = $1,
             label = $2,
             format_id = $3,
             is_visible = $4,
             display_order = $5,
             updated_at = CURRENT_TIMESTAMP
           WHERE component_id = 'assets_table' AND field_id = $6`,
          [field.field_type, field.label, field.format_id, field.is_visible, field.display_order, field.field_id]
        );
        console.log(`  ✓ ${field.field_id}: обновлено`);
        updatedCount++;
      } else {
        // Insert new field
        await client.query(
          `INSERT INTO config.component_fields 
           (component_id, field_id, field_type, label, format_id, is_visible, is_groupable, parent_field_id, display_order, is_active, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, FALSE, NULL, $7, TRUE, 'system')`,
          ['assets_table', field.field_id, field.field_type, field.label, field.format_id, field.is_visible, field.display_order]
        );
        console.log(`  + ${field.field_id}: добавлено (order=${field.display_order}, format=${field.format_id})`);
        addedCount++;
      }
    }

    // Also check/update ppChange if it exists but format might be wrong
    const ppChangeExists = currentFields.rows.find(f => f.field_id === 'ppChange');
    if (ppChangeExists) {
      // Ensure ppChange has correct format (percent)
      if (ppChangeExists.format_id !== 'percent') {
        await client.query(
          `UPDATE config.component_fields
           SET format_id = 'percent', updated_at = CURRENT_TIMESTAMP
           WHERE component_id = 'assets_table' AND field_id = 'ppChange'`
        );
        console.log(`  ✓ ppChange: формат обновлен на percent`);
      } else {
        console.log(`  ✓ ppChange: уже существует с правильным форматом`);
      }
    }

    console.log(`\n=== Завершено ===`);
    console.log(`Добавлено полей: ${addedCount}`);
    console.log(`Обновлено полей: ${updatedCount}`);

    // Verify result
    console.log("\nПроверка результата:");
    const updatedFields = await client.query(`
      SELECT field_id, field_type, label, format_id, is_visible, display_order
      FROM config.component_fields
      WHERE component_id = 'assets_table'
        AND field_id IN ('previousValue', 'ytdValue', 'ppChange', 'ppChangeAbsolute', 'ytdChange', 'ytdChangeAbsolute')
        AND deleted_at IS NULL
      ORDER BY display_order, field_id
    `);

    console.log(`\nНайдено полей: ${updatedFields.rows.length}`);
    updatedFields.rows.forEach((field) => {
      console.log(`  - ${field.field_id}: type=${field.field_type}, format=${field.format_id || 'none'}, visible=${field.is_visible}, order=${field.display_order}`);
    });

  } catch (error) {
    console.error("Ошибка при добавлении полей:", error);
    throw error;
  } finally {
    client.release();
  }
}

addAssetsTableFields()
  .then(() => {
    console.log("\nСкрипт выполнен успешно");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ошибка выполнения скрипта:", error);
    process.exit(1);
  });
