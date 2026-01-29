/**
 * Скрипт для исправления кириллицы в именах файлов в БД
 * Декодирует mojibake из ISO-8859-1 в UTF-8
 */

import { pool } from "../config/database.js";

/**
 * Декодирует имя файла из ISO-8859-1 (Latin-1) в UTF-8
 */
function decodeFilename(filename: string): string {
  const mojibakePattern = /[ÐÑÐµÐ±Ð°Ð»Ð°Ð½ÑÐ´ÐµÐºÐ°Ð±Ñ]/;
  
  if (!mojibakePattern.test(filename)) {
    return filename;
  }
  
  try {
    const bytes: number[] = [];
    for (let i = 0; i < filename.length; i++) {
      const charCode = filename.charCodeAt(i);
      if (charCode > 255) {
        return filename;
      }
      bytes.push(charCode);
    }
    
    const buffer = Buffer.from(bytes);
    return buffer.toString('utf8');
  } catch (error) {
    console.warn(`Failed to decode filename "${filename}":`, error);
    return filename;
  }
}

async function fixCyrillicFilenames() {
  const client = await pool.connect();
  try {
    // Получаем все записи с mojibake в original_filename
    const result = await client.query(
      `SELECT id, original_filename 
       FROM ing.uploads 
       WHERE original_filename ~ '[ÐÑÐµÐ±Ð°Ð»Ð°Ð½ÑÐ´ÐµÐºÐ°Ð±Ñ]'
       ORDER BY id`
    );

    console.log(`Найдено записей с mojibake: ${result.rows.length}`);

    let fixedCount = 0;
    for (const row of result.rows) {
      const originalFilename = row.original_filename;
      const decodedFilename = decodeFilename(originalFilename);

      if (decodedFilename !== originalFilename) {
        await client.query(
          `UPDATE ing.uploads 
           SET original_filename = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [decodedFilename, row.id]
        );
        console.log(`ID ${row.id}: "${originalFilename.substring(0, 50)}..." -> "${decodedFilename.substring(0, 50)}..."`);
        fixedCount++;
      }
    }

    console.log(`\nИсправлено записей: ${fixedCount}`);
  } finally {
    client.release();
    await pool.end();
  }
}

fixCyrillicFilenames().catch(console.error);
