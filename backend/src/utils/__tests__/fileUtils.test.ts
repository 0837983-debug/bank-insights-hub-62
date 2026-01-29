import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import {
  generateTimestampFilename,
  checkFileExtension,
  ensureDirectoryExists,
  getFileType,
  getProcessedFilePath,
} from "../fileUtils.js";

describe("fileUtils", () => {
  describe("generateTimestampFilename", () => {
    it("должен генерировать имя файла с timestamp", () => {
      const result = generateTimestampFilename("test.csv");
      // Формат: filename_YYYYMMDD_HHmmssZ.ext
      expect(result).toMatch(/^test_\d{8}_\d{6}Z\.csv$/);
    });

    it("должен сохранять расширение файла", () => {
      const result1 = generateTimestampFilename("data.xlsx");
      const result2 = generateTimestampFilename("report.csv");
      expect(result1).toMatch(/\.xlsx$/);
      expect(result2).toMatch(/\.csv$/);
    });

    it("должен обрабатывать файлы без расширения", () => {
      const result = generateTimestampFilename("file");
      // Формат: filename_YYYYMMDD_HHmmssZ
      expect(result).toMatch(/^file_\d{8}_\d{6}Z$/);
    });
  });

  describe("checkFileExtension", () => {
    it("должен вернуть true для разрешенных расширений", () => {
      expect(checkFileExtension("test.csv", ["csv", "xlsx"])).toBe(true);
      expect(checkFileExtension("data.xlsx", ["csv", "xlsx"])).toBe(true);
      expect(checkFileExtension("file.CSV", ["csv", "xlsx"])).toBe(true); // case-insensitive
    });

    it("должен вернуть false для неразрешенных расширений", () => {
      expect(checkFileExtension("test.pdf", ["csv", "xlsx"])).toBe(false);
      expect(checkFileExtension("data.txt", ["csv", "xlsx"])).toBe(false);
    });

    it("должен обрабатывать файлы без расширения", () => {
      expect(checkFileExtension("file", ["csv", "xlsx"])).toBe(false);
    });
  });

  describe("ensureDirectoryExists", () => {
    const testDir = join(process.cwd(), "test-temp-dir");

    beforeEach(() => {
      // Удаляем директорию если существует
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      // Очистка после теста
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it("должен создать директорию если она не существует", () => {
      expect(existsSync(testDir)).toBe(false);
      ensureDirectoryExists(testDir);
      expect(existsSync(testDir)).toBe(true);
    });

    it("не должен выбрасывать ошибку если директория уже существует", () => {
      mkdirSync(testDir, { recursive: true });
      expect(() => ensureDirectoryExists(testDir)).not.toThrow();
    });
  });

  describe("getFileType", () => {
    it("должен вернуть 'csv' для CSV файлов", () => {
      expect(getFileType("test.csv")).toBe("csv");
      expect(getFileType("data.CSV")).toBe("csv"); // case-insensitive
    });

    it("должен вернуть 'xlsx' для XLSX и XLS файлов", () => {
      expect(getFileType("test.xlsx")).toBe("xlsx");
      expect(getFileType("data.xls")).toBe("xlsx");
      expect(getFileType("file.XLSX")).toBe("xlsx"); // case-insensitive
    });

    it("должен вернуть undefined для неподдерживаемых форматов", () => {
      expect(getFileType("test.pdf")).toBeUndefined();
      expect(getFileType("data.txt")).toBeUndefined();
      expect(getFileType("file")).toBeUndefined();
    });
  });

  describe("getProcessedFilePath", () => {
    const testBaseDir = join(process.cwd(), "test-processed");

    beforeEach(() => {
      if (existsSync(testBaseDir)) {
        rmSync(testBaseDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      if (existsSync(testBaseDir)) {
        rmSync(testBaseDir, { recursive: true, force: true });
      }
    });

    it("должен создать директорию и вернуть путь", () => {
      const result = getProcessedFilePath("balance", "test.csv", testBaseDir);
      expect(result).toContain("balance");
      expect(result).toContain("test.csv");
      expect(existsSync(join(testBaseDir, "balance"))).toBe(true);
    });

    it("должен использовать базовую директорию по умолчанию", () => {
      const result = getProcessedFilePath("balance", "test.csv");
      expect(result).toContain("row/processed");
      expect(result).toContain("balance");
    });
  });
});
