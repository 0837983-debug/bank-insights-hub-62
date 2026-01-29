/**
 * API endpoints для загрузки файлов
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { pool } from "../config/database.js";
import { parseFile, validateFileStructure, getRowValue } from "../services/upload/fileParserService.js";
import {
  validateData,
  checkDuplicatePeriodsInODS,
  aggregateValidationErrors,
  getFieldMapping,
} from "../services/upload/validationService.js";
import { saveUploadedFile } from "../services/upload/storageService.js";
import {
  loadToSTG,
  loadFinResultsToSTG,
  transformSTGToODS,
  transformODSToMART,
  updateUploadStatus,
  saveValidationErrors,
} from "../services/upload/ingestionService.js";
import { rollbackUpload } from "../services/upload/rollbackService.js";
import { checkFileExtension, getFileType } from "../utils/fileUtils.js";
import { parseDate, formatDateForSQL } from "../utils/dateUtils.js";

/**
 * Декодирует имя файла из ISO-8859-1 (Latin-1) в UTF-8
 * Исправляет mojibake, когда UTF-8 байты были интерпретированы как ISO-8859-1
 * @param filename - имя файла, возможно с mojibake
 * @returns декодированное имя файла в UTF-8
 */
function decodeFilename(filename: string): string {
  // Проверяем, содержит ли имя файла типичные mojibake символы кириллицы
  // (Ð, Ñ, Ðµ, Ð±, Ð° и т.д. - это UTF-8 байты кириллицы, интерпретированные как ISO-8859-1)
  const mojibakePattern = /[ÐÑÐµÐ±Ð°Ð»Ð°Ð½ÑÐ´ÐµÐºÐ°Ð±Ñ]/;
  
  if (!mojibakePattern.test(filename)) {
    // Если mojibake не обнаружен, возвращаем оригинальное имя
    return filename;
  }
  
  try {
    // Создаём Buffer из строки, интерпретируя каждый символ как байт (0-255)
    // Это работает, потому что mojibake символы - это UTF-8 байты, интерпретированные как Latin-1
    const bytes: number[] = [];
    for (let i = 0; i < filename.length; i++) {
      const charCode = filename.charCodeAt(i);
      // Если код символа > 255, это уже не mojibake, оставляем как есть
      if (charCode > 255) {
        // Если встретили не-mojibake символ, возможно строка уже правильная
        return filename;
      }
      bytes.push(charCode);
    }
    
    // Создаём Buffer из байтов и декодируем как UTF-8
    const buffer = Buffer.from(bytes);
    return buffer.toString('utf8');
  } catch (error) {
    // Если декодирование не удалось, возвращаем оригинальное имя
    console.warn(`Failed to decode filename "${filename}":`, error);
    return filename;
  }
}

const router = Router();

// Настройка multer для сохранения файлов в памяти (для парсинга)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ["csv", "xlsx", "xls"];
    if (checkFileExtension(file.originalname, allowedExtensions)) {
      cb(null, true);
    } else {
      cb(new Error("Неподдерживаемый формат файла. Поддерживаются: CSV, XLSX"));
    }
  },
});

/**
 * GET /api/upload/:uploadId
 * Получение статуса загрузки
 */
router.get("/:uploadId", async (req: Request, res: Response) => {
  try {
    const uploadId = parseInt(req.params.uploadId);
    if (isNaN(uploadId)) {
      return res.status(400).json({ error: "Неверный ID загрузки" });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, filename, original_filename, file_path, file_size, file_type,
                target_table, status, rows_processed, rows_successful, rows_failed,
                validation_errors, created_at, updated_at, rolled_back_at, rolled_back_by
         FROM ing.uploads
         WHERE id = $1`,
        [uploadId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Загрузка не найдена" });
      }

      const upload = result.rows[0];
      return res.json({
        id: upload.id,
        filename: upload.filename,
        originalFilename: upload.original_filename,
        fileType: upload.file_type,
        targetTable: upload.target_table,
        status: upload.status,
        rowsProcessed: upload.rows_processed,
        rowsSuccessful: upload.rows_successful,
        rowsFailed: upload.rows_failed,
        validationErrors: upload.validation_errors,
        createdAt: upload.created_at,
        updatedAt: upload.updated_at,
        rolledBackAt: upload.rolled_back_at,
        rolledBackBy: upload.rolled_back_by,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching upload status:", error);
    return res.status(500).json({ error: "Ошибка получения статуса загрузки" });
  }
});

/**
 * GET /api/upload/:uploadId/sheets
 * Получение списка листов для XLSX файла
 */
router.get("/:uploadId/sheets", async (req: Request, res: Response) => {
  try {
    const uploadId = parseInt(req.params.uploadId);
    if (isNaN(uploadId)) {
      return res.status(400).json({ error: "Неверный ID загрузки" });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT file_path, file_type FROM ing.uploads WHERE id = $1`,
        [uploadId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Загрузка не найдена" });
      }

      const upload = result.rows[0];
      
      if (upload.file_type !== "xlsx") {
        return res.status(400).json({ error: "Файл не является XLSX" });
      }

      // Парсим файл для получения списка листов
      const { readFile } = await import("fs/promises");
      const fileBuffer = await readFile(upload.file_path);
      const parseResult = await parseFile(fileBuffer, upload.file_path);

      return res.json({
        uploadId,
        availableSheets: parseResult.availableSheets || [],
        currentSheet: parseResult.sheetName,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching sheets:", error);
    return res.status(500).json({ error: "Ошибка получения списка листов" });
  }
});

/**
 * POST /api/upload
 * Загрузка файла
 */
router.post("/", (req: Request, res: Response, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      console.error("Multer error:", err);
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Размер файла превышает максимальный (50MB)" });
        }
        if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({ error: "Неверное количество файлов" });
        }
        return res.status(400).json({ error: `Ошибка загрузки файла: ${err.message}` });
      }
      if (err.message) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: "Ошибка загрузки файла" });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    console.log("Upload request body:", req.body);
    console.log("Upload request file:", req.file);
    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ error: "Файл не был загружен" });
    }
    if (req.file.size === 0) {
      console.error("Empty file in request");
      return res.status(400).json({ error: "Файл пустой" });
    }

    const { targetTable, sheetName } = req.body;
    console.log("Upload request:", { 
      filename: req.file.originalname, 
      size: req.file.size, 
      targetTable,
      sheetName 
    });

    if (!targetTable) {
      return res.status(400).json({ error: "Параметр targetTable обязателен" });
    }

    // Проверяем поддерживаемую таблицу
    const supportedTables = ["balance", "fin_results"];
    if (!supportedTables.includes(targetTable)) {
      return res.status(400).json({
        error: `Неподдерживаемая таблица: ${targetTable}. Поддерживаются: ${supportedTables.join(", ")}`,
      });
    }

    const fileBuffer = req.file.buffer;
    // Декодируем имя файла из ISO-8859-1 в UTF-8 (исправляем mojibake)
    const originalFilename = decodeFilename(req.file.originalname);
    const fileType = getFileType(originalFilename);

    if (!fileType) {
      return res.status(400).json({
        error: "Неподдерживаемый формат файла. Поддерживаются: CSV, XLSX",
      });
    }

    const client = await pool.connect();
    let uploadId: number | null = null;

    try {
      // 1. Сохраняем файл
      const { filePath, filename } = await saveUploadedFile(
        fileBuffer,
        originalFilename,
        targetTable
      );

      // 2. Создаем запись о загрузке
      const uploadResult = await client.query(
        `INSERT INTO ing.uploads 
         (filename, original_filename, file_path, file_size, file_type, target_table, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         RETURNING id`,
        [filename, originalFilename, filePath, fileBuffer.length, fileType, targetTable]
      );

      uploadId = uploadResult.rows[0].id;

      if (!uploadId) {
        throw new Error("Failed to create upload record");
      }

      // 3. Парсим файл
      await updateUploadStatus(uploadId, "processing");
      console.log("Parsing file:", originalFilename);
      let parseResult;
      try {
        parseResult = await parseFile(fileBuffer, originalFilename, sheetName);
        console.log("File parsed successfully:", {
          headers: parseResult.headers,
          rowsCount: parseResult.rows.length
        });
      } catch (parseError: any) {
        console.error("Parse error:", parseError);
        await saveValidationErrors(uploadId, aggregateValidationErrors([{
          fieldName: "file_parsing",
          errorType: "parse_error",
          errorMessage: parseError.message || "Ошибка парсинга файла",
        }]));
        await updateUploadStatus(uploadId, "failed");
        return res.status(400).json({
          uploadId,
          status: "failed",
          error: parseError.message || "Ошибка парсинга файла",
        });
      }

      // 4. Валидация структуры файла
      // Получаем обязательные заголовки из mapping
      const fieldMapping = await getFieldMapping(targetTable);
      const requiredHeaders = fieldMapping
        .filter((m) => m.isRequired)
        .map((m) => m.sourceField);
      
      const structureValidation = validateFileStructure(parseResult.headers, requiredHeaders);
      if (!structureValidation.valid) {
        const errors = aggregateValidationErrors([
          {
            fieldName: "file_structure",
            errorType: "missing_headers",
            errorMessage: `Отсутствуют обязательные заголовки: ${structureValidation.missing.join(", ")}`,
          },
        ]);

        await saveValidationErrors(uploadId, errors);
        await updateUploadStatus(uploadId, "failed", parseResult.rows.length, 0, parseResult.rows.length);

        return res.status(400).json({
          uploadId,
          status: "failed",
          validationErrors: errors,
        });
      }

      // 5. Валидация данных
      const validationResult = await validateData(parseResult.rows, targetTable);

      if (!validationResult.valid) {
        const aggregatedErrors = aggregateValidationErrors(validationResult.errors);
        await saveValidationErrors(uploadId, aggregatedErrors);
        await updateUploadStatus(
          uploadId,
          "failed",
          parseResult.rows.length,
          validationResult.errors.length === 0 ? parseResult.rows.length : 0,
          validationResult.errorCount
        );

        return res.status(400).json({
          uploadId,
          status: "failed",
          validationErrors: aggregatedErrors,
        });
      }

      // 6. Проверка дубликатов периодов в ODS (опционально - можно предупредить пользователя)
      // Находим поле period_date в mapping
      const periodDateField = fieldMapping.find((m) => m.targetField === "period_date");
      const periodDates = periodDateField
        ? parseResult.rows
            .map((row) => {
              const dateValue = getRowValue(row, periodDateField.sourceField);
              const date = typeof dateValue === "string" ? parseDate(dateValue) : null;
              return date;
            })
            .filter((d): d is Date => d !== null)
        : [];

      const duplicatePeriods = await checkDuplicatePeriodsInODS(periodDates, targetTable);
      // Не блокируем загрузку, но можно вернуть предупреждение

      // 7. Используем уже полученный mapping для загрузки данных
      const mapping = fieldMapping.map((m) => ({
        sourceField: m.sourceField,
        targetField: m.targetField,
        fieldType: m.fieldType,
      }));

      // 8. Загружаем данные в зависимости от целевой таблицы
      let rowsLoadedToSTG: number;
      let rowsLoadedToODS = 0;
      let rowsLoadedToMART = 0;

      if (targetTable === "fin_results") {
        // Financial Results: только STG (ODS/MART будут добавлены позже)
        rowsLoadedToSTG = await loadFinResultsToSTG(uploadId, parseResult.rows, mapping);
        
        // 9. Обновляем статус
        await updateUploadStatus(
          uploadId,
          "completed",
          parseResult.rows.length,
          rowsLoadedToSTG,
          0
        );

        return res.json({
          uploadId,
          status: "completed",
          rowsProcessed: parseResult.rows.length,
          rowsSuccessful: rowsLoadedToSTG,
          rowsFailed: 0,
          message: "Данные успешно загружены в STG",
        });
      } else {
        // Balance: полный pipeline STG → ODS → MART
        rowsLoadedToSTG = await loadToSTG(uploadId, parseResult.rows, mapping);
        rowsLoadedToODS = await transformSTGToODS(uploadId);
        rowsLoadedToMART = await transformODSToMART(uploadId);

        // 9. Обновляем статус
        await updateUploadStatus(
          uploadId,
          "completed",
          parseResult.rows.length,
          rowsLoadedToMART,
          0
        );

        return res.json({
          uploadId,
          status: "completed",
          rowsProcessed: parseResult.rows.length,
          rowsSuccessful: rowsLoadedToMART,
          rowsFailed: 0,
          duplicatePeriodsWarning: duplicatePeriods.length > 0 
            ? `Найдено ${duplicatePeriods.length} дубликатов периодов в ODS. Данные будут перезаписаны.`
            : undefined,
        });
      }
    } catch (error: any) {
      console.error("Error processing upload:", error);
      
      if (uploadId) {
        await updateUploadStatus(uploadId, "failed");
      }

      return res.status(500).json({
        error: error.message || "Ошибка обработки загрузки",
        uploadId: uploadId || null,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error in upload endpoint:", error);
    return res.status(500).json({ error: "Ошибка загрузки файла" });
  }
});

/**
 * POST /api/upload/:uploadId/rollback
 * Откат загрузки
 */
router.post("/:uploadId/rollback", async (req: Request, res: Response) => {
  try {
    const uploadId = parseInt(req.params.uploadId);
    if (isNaN(uploadId)) {
      return res.status(400).json({ error: "Неверный ID загрузки" });
    }

    const { rolledBackBy } = req.body || {};

    try {
      await rollbackUpload(uploadId, rolledBackBy || "system");
      return res.json({
        uploadId,
        status: "rolled_back",
        message: "Загрузка успешно откачена",
      });
    } catch (error: any) {
      if (error.message.includes("не найдена")) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes("уже была откачена")) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error rolling back upload:", error);
    return res.status(500).json({ error: "Ошибка отката загрузки" });
  }
});

/**
 * GET /api/uploads
 * История загрузок
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { targetTable, status, limit = 50, offset = 0 } = req.query;

    const client = await pool.connect();
    try {
      let query = `SELECT id, filename, original_filename, file_type, target_table, status,
                          rows_processed, rows_successful, rows_failed, validation_errors,
                          created_at, updated_at, rolled_back_at, rolled_back_by
                   FROM ing.uploads`;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (targetTable) {
        conditions.push(`target_table = $${paramIndex}`);
        values.push(targetTable);
        paramIndex++;
      }

      if (status) {
        conditions.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(parseInt(String(limit)), parseInt(String(offset)));

      const result = await client.query(query, values);

      return res.json({
        uploads: result.rows.map((row: any) => ({
          id: row.id,
          filename: row.filename,
          originalFilename: row.original_filename,
          fileType: row.file_type,
          targetTable: row.target_table,
          status: row.status,
          rowsProcessed: row.rows_processed,
          rowsSuccessful: row.rows_successful,
          rowsFailed: row.rows_failed,
          validationErrors: row.validation_errors,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          rolledBackAt: row.rolled_back_at,
          rolledBackBy: row.rolled_back_by,
        })),
        total: result.rows.length,
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching upload history:", error);
    return res.status(500).json({ error: "Ошибка получения истории загрузок" });
  }
});

export default router;
