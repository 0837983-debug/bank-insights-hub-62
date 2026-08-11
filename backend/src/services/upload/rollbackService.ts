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

    // Удаляем данные из MART за те же периоды, что были в ODS.
    // mart.balance и связанные витрины — материализованные представления,
    // поэтому их нельзя менять напрямую: данные из ODS уже помечены
    // удалёнными (soft delete), а витрины обновляем через REFRESH.
    const periodsResult = await client.query(
      `SELECT DISTINCT period_date, class, section, item
       FROM ods.balance
       WHERE upload_id = $1 AND deleted_at IS NOT NULL`,
      [uploadId]
    );

    // Уточняем источник данных для витрины: если загрузка касалась баланса,
    // обновляем соответствующие материализованные представления
    const targetResult = await client.query(
      `SELECT target_table FROM ing.uploads WHERE id = $1`,
      [uploadId]
    );
    const targetTable = targetResult.rows[0]?.target_table ?? "balance";

    if (targetTable === "fin_results") {
      await client.query('REFRESH MATERIALIZED VIEW mart.fin_results');
      await client.query('REFRESH MATERIALIZED VIEW mart.mv_kpi_fin_results');
      await client.query('REFRESH MATERIALIZED VIEW mart.mv_kpi_derived');
    } else {
      // Баланс: витрина строится по данным ODS, помеченным как удалённые,
      // поэтому после soft-delete достаточно обновить представления
      await client.query('REFRESH MATERIALIZED VIEW mart.balance');
      await client.query('REFRESH MATERIALIZED VIEW mart.mv_kpi_balance');
      await client.query('REFRESH MATERIALIZED VIEW mart.mv_kpi_derived');
    }
    void periodsResult;

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
