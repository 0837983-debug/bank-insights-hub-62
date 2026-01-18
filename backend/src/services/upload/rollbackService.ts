/**
 * Сервис для отката загрузки файлов
 */

import { pool } from "../../config/database.js";

/**
 * Откат загрузки (удаление данных из STG, ODS, MART)
 * @param uploadId - ID загрузки
 * @param rolledBackBy - пользователь, выполняющий откат
 */
export async function rollbackUpload(
  uploadId: number,
  rolledBackBy: string = "system"
): Promise<void> {
  const client = await pool.connect();
  try {
    // Проверяем статус загрузки
    const uploadResult = await client.query(
      `SELECT status FROM ing.uploads WHERE id = $1`,
      [uploadId]
    );

    if (uploadResult.rows.length === 0) {
      throw new Error(`Загрузка с ID ${uploadId} не найдена`);
    }

    const status = uploadResult.rows[0].status;
    if (status === "rolled_back") {
      throw new Error("Загрузка уже была откачена");
    }

    // Удаляем данные из STG
    await client.query(
      `DELETE FROM stg.balance_upload WHERE upload_id = $1`,
      [uploadId]
    );

    // Soft delete данных из ODS, которые были созданы этой загрузкой
    await client.query(
      `UPDATE ods.balance 
       SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
       WHERE upload_id = $1 AND deleted_at IS NULL`,
      [uploadId, rolledBackBy]
    );

    // Удаляем данные из MART за те же периоды, что были в ODS
    const periodsResult = await client.query(
      `SELECT DISTINCT period_date, class, section, item
       FROM ods.balance
       WHERE upload_id = $1 AND deleted_at IS NOT NULL`,
      [uploadId]
    );

    for (const period of periodsResult.rows) {
      await client.query(
        `DELETE FROM mart.balance
         WHERE period_date = $1
           AND class = $2
           AND COALESCE(section, '') = COALESCE($3::varchar, '')
           AND COALESCE(item, '') = COALESCE($4::varchar, '')`,
        [period.period_date, period.class, period.section, period.item]
      );
    }

    // Обновляем статус загрузки
    await client.query(
      `UPDATE ing.uploads 
       SET status = 'rolled_back',
           rolled_back_at = CURRENT_TIMESTAMP,
           rolled_back_by = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [uploadId, rolledBackBy]
    );
  } finally {
    client.release();
  }
}

/**
 * Восстановление старых данных (если они были помечены удаленными)
 * Примечание: Это опциональная функция, может использоваться если нужно восстановить
 * предыдущее состояние данных после отката новой загрузки
 * @param uploadId - ID откатываемой загрузки
 */
export async function restorePreviousData(
  uploadId: number
): Promise<number> {
  const client = await pool.connect();
  try {
    // Находим периоды, которые были заменены этой загрузкой
    const periodsResult = await client.query(
      `SELECT DISTINCT period_date, class, section, item
       FROM ods.balance
       WHERE upload_id = $1`,
      [uploadId]
    );

    let restoredCount = 0;

    // Восстанавливаем последние данные за эти периоды (если они были удалены при загрузке)
    // Это сложная логика - можно реализовать позже, если понадобится
    // Пока просто возвращаем 0

    return restoredCount;
  } finally {
    client.release();
  }
}
