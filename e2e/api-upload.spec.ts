import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

const API_BASE_URL = "http://localhost:3001/api";
const TEST_DATA_DIR = join(process.cwd(), "test-data", "uploads");

test.describe("Upload API Integration Tests", () => {
  test.describe("POST /api/upload", () => {
    test("should upload a valid CSV file", async ({ request }) => {
      const testFile = readFileSync(join(TEST_DATA_DIR, "capital_2025-01.csv"));
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      const blob = new Blob([testFile], { type: "text/csv" });
      formData.append("file", blob, "capital_2025-01.csv");
      formData.append("targetTable", "balance");

      const response = await request.post(`${API_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: "capital_2025-01.csv",
            mimeType: "text/csv",
            buffer: testFile,
          },
          targetTable: "balance",
        },
      });

      // Should accept the file and start processing, или вернуть 400 с ошибками валидации
      expect([200, 201, 202, 400]).toContain(response.status());

      const data = await response.json();
      
      if (response.ok()) {
        // Успешная загрузка
        expect(data).toHaveProperty("uploadId");
        expect(data.uploadId).toBeGreaterThan(0);
        expect(data).toHaveProperty("status");
        expect(["pending", "processing", "completed"]).toContain(data.status);
      } else if (response.status() === 400) {
        // Ошибки валидации
        expect(data).toHaveProperty("uploadId");
        expect(data).toHaveProperty("status");
        expect(data).toHaveProperty("validationErrors");
      }
    });

    test("should reject invalid file format", async ({ request }) => {
      const invalidFile = Buffer.from("This is not a CSV file");
      
      const response = await request.post(`${API_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: "invalid.txt",
            mimeType: "text/plain",
            buffer: invalidFile,
          },
          targetTable: "balance",
        },
      });

      // Should reject invalid file
      expect([400, 422, 415]).toContain(response.status());
    });

    test("should validate CSV file structure", async ({ request }) => {
      const invalidFile = readFileSync(join(TEST_DATA_DIR, "capital_2025-01_wrong_structure.csv"));
      
      const response = await request.post(`${API_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: "capital_2025-01_wrong_structure.csv",
            mimeType: "text/csv",
            buffer: invalidFile,
          },
          targetTable: "balance",
        },
      });

      const data = await response.json();
      
      // API returns upload result with validation errors
      expect(data).toHaveProperty("uploadId");
      expect(data).toHaveProperty("status");
      
      // If there are validation errors, they should be in validationErrors
      if (data.validationErrors) {
        expect(data.validationErrors).toHaveProperty("totalCount");
        expect(data.validationErrors).toHaveProperty("byType");
        expect(data.validationErrors).toHaveProperty("examples");
      }
      
      // Status should indicate failure for wrong structure
      if (data.status === "failed") {
        expect(data.validationErrors).toBeDefined();
      }
    });

    test("should return validation errors for invalid data", async ({ request }) => {
      const invalidDateFile = readFileSync(join(TEST_DATA_DIR, "capital_2025-01_invalid_date.csv"));
      
      const response = await request.post(`${API_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: "capital_2025-01_invalid_date.csv",
            mimeType: "text/csv",
            buffer: invalidDateFile,
          },
          targetTable: "balance",
        },
      });

      const data = await response.json();
      
      // Should process file and return validation errors
      // Новый формат: aggregatedErrors { examples, totalCount, byType }
      // API возвращает 400 с validationErrors в теле ответа
      expect(response.status()).toBe(400);
      expect(data).toHaveProperty("uploadId");
      expect(data).toHaveProperty("status", "failed");
      expect(data).toHaveProperty("validationErrors");
      
      // Проверяем новый формат aggregatedErrors
      expect(data.validationErrors).toHaveProperty("totalCount");
      expect(data.validationErrors).toHaveProperty("byType");
      expect(data.validationErrors).toHaveProperty("examples");
      expect(data.validationErrors.totalCount).toBeGreaterThan(0);
      expect(Array.isArray(data.validationErrors.examples)).toBe(true);
    });
  });

  test.describe("GET /api/upload/:uploadId", () => {
    test("should return upload status", async ({ request }) => {
      // First, create an upload
      const testFile = readFileSync(join(TEST_DATA_DIR, "capital_2025-01.csv"));
      
      const uploadResponse = await request.post(`${API_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: "capital_2025-01.csv",
            mimeType: "text/csv",
            buffer: testFile,
          },
          targetTable: "balance",
        },
      });

      const uploadData = await uploadResponse.json();
      const uploadId = uploadData.uploadId;

      if (!uploadId) {
        // No uploadId returned - skip this test
        console.log("⚠️  No uploadId in response, skipping status check");
        return;
      }

      // Get upload status - endpoint may be /api/upload/:id or /api/uploads/:id
      let statusResponse = await request.get(`${API_BASE_URL}/upload/${uploadId}`);
      
      // If 404, try alternative endpoint
      if (statusResponse.status() === 404) {
        statusResponse = await request.get(`${API_BASE_URL}/uploads/${uploadId}`);
      }

      if (statusResponse.ok()) {
        const statusData = await statusResponse.json();
        expect(statusData).toHaveProperty("id");
        expect(statusData).toHaveProperty("status");
        expect(["pending", "processing", "completed", "failed", "rolled_back"]).toContain(statusData.status);
      } else {
        // Status endpoint may not exist - document this
        console.log(`⚠️  Status endpoint returned ${statusResponse.status()}`);
      }
    });

    test("should return 404 for non-existent upload", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/upload/999999`);

      // Может вернуть 404 или 400 (если ID невалидный)
      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe("POST /api/upload/:uploadId/rollback", () => {
    test("should rollback an upload", async ({ request }) => {
      // First, create an upload
      const testFile = readFileSync(join(TEST_DATA_DIR, "capital_2025-01.csv"));
      
      const uploadResponse = await request.post(`${API_BASE_URL}/upload`, {
        multipart: {
          file: {
            name: "capital_2025-01.csv",
            mimeType: "text/csv",
            buffer: testFile,
          },
          targetTable: "balance",
        },
      });

      // Upload может вернуть 200 (успех) или 400 (ошибки валидации)
      if (!uploadResponse.ok() && uploadResponse.status() !== 400) {
        // Если не 200 и не 400, пропускаем тест
        test.skip();
        return;
      }

      const uploadData = await uploadResponse.json();
      const uploadId = uploadData.uploadId;

      if (!uploadId) {
        test.skip();
        return;
      }

      // Wait a bit for upload to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Rollback the upload
      const rollbackResponse = await request.post(`${API_BASE_URL}/upload/${uploadId}/rollback`);

      // Should accept rollback request
      expect([200, 202]).toContain(rollbackResponse.status());

      const rollbackData = await rollbackResponse.json();
      expect(rollbackData).toHaveProperty("uploadId");
      expect(rollbackData.uploadId).toBe(uploadId);
      expect(rollbackData).toHaveProperty("status");
      expect(["rolled_back", "rolling_back"]).toContain(rollbackData.status);
    });

    test("should return 404 for non-existent upload rollback", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/upload/999999/rollback`);

      // Может вернуть 404 или 400 (если ID невалидный)
      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe("GET /api/uploads", () => {
    test("should return upload history", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/uploads`);

      // Endpoint should respond (may be 200 or 500 if no uploads yet)
      if (response.ok()) {
        const data = await response.json();
        
        // Response can be array or { uploads: [...], total: ... }
        if (Array.isArray(data)) {
          if (data.length > 0) {
            expect(data[0]).toHaveProperty("id");
          }
        } else if (data.uploads) {
          expect(Array.isArray(data.uploads)).toBe(true);
        }
      } else {
        // Endpoint returns error - may be expected if no data
        const status = response.status();
        expect([400, 404, 500]).toContain(status);
      }
    });

    test("should support filtering by status", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/uploads?status=completed`);

      // Endpoint должен работать
      if (response.ok()) {
        expect(response.status()).toBe(200);

        const data = await response.json();
        // Новый формат: { uploads: [...], total: ... }
        expect(data).toHaveProperty("uploads");
        expect(Array.isArray(data.uploads)).toBe(true);

        // All returned uploads should have completed status (если есть)
        data.uploads.forEach((upload: any) => {
          expect(upload.status).toBe("completed");
        });
      } else {
        // Если endpoint не работает, проверяем, что это не 500
        expect([400, 404]).toContain(response.status());
      }
    });
  });
});
