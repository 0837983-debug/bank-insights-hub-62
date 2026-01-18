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

      // Should accept the file and start processing
      expect([200, 201, 202]).toContain(response.status());

      const data = await response.json();
      expect(data).toHaveProperty("uploadId");
      expect(data.uploadId).toBeGreaterThan(0);
      expect(data).toHaveProperty("status");
      expect(["pending", "processing", "completed"]).toContain(data.status);
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
      
      // Should either reject immediately or return with validation errors
      if (response.ok()) {
        expect(data).toHaveProperty("uploadId");
        expect(data).toHaveProperty("validationErrors");
        expect(Array.isArray(data.validationErrors)).toBe(true);
      } else {
        // Or reject with 400/422 if validation happens before processing
        expect([400, 422]).toContain(response.status());
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
      if (response.ok() && data.validationErrors) {
        expect(Array.isArray(data.validationErrors)).toBe(true);
        expect(data.validationErrors.length).toBeGreaterThan(0);
        
        // Check error structure
        const error = data.validationErrors[0];
        expect(error).toHaveProperty("errorType");
        expect(error).toHaveProperty("errorMessage");
        expect(error).toHaveProperty("fieldName");
      } else if (response.status() === 400 || response.status() === 422) {
        // Or reject immediately if validation happens before upload
        expect(data).toHaveProperty("error");
      }
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

      if (!uploadResponse.ok()) {
        test.skip(); // Skip if upload endpoint is not working
        return;
      }

      const uploadData = await uploadResponse.json();
      const uploadId = uploadData.uploadId;

      // Get upload status
      const statusResponse = await request.get(`${API_BASE_URL}/upload/${uploadId}`);

      expect(statusResponse.ok()).toBeTruthy();
      expect(statusResponse.status()).toBe(200);

      const statusData = await statusResponse.json();
      expect(statusData).toHaveProperty("uploadId");
      expect(statusData.uploadId).toBe(uploadId);
      expect(statusData).toHaveProperty("status");
      expect(["pending", "processing", "completed", "failed"]).toContain(statusData.status);
    });

    test("should return 404 for non-existent upload", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/upload/999999`);

      expect(response.status()).toBe(404);
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

      if (!uploadResponse.ok()) {
        test.skip(); // Skip if upload endpoint is not working
        return;
      }

      const uploadData = await uploadResponse.json();
      const uploadId = uploadData.uploadId;

      // Wait a bit for upload to process
      await new Promise((resolve) => setTimeout(resolve, 1000));

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

      expect(response.status()).toBe(404);
    });
  });

  test.describe("GET /api/uploads", () => {
    test("should return upload history", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/uploads`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // If there are uploads, check structure
      if (data.length > 0) {
        const upload = data[0];
        expect(upload).toHaveProperty("uploadId");
        expect(upload).toHaveProperty("status");
        expect(upload).toHaveProperty("filename");
        expect(upload).toHaveProperty("targetTable");
        expect(upload).toHaveProperty("createdAt");
      }
    });

    test("should support filtering by status", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/uploads?status=completed`);

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // All returned uploads should have completed status
      data.forEach((upload: any) => {
        expect(upload.status).toBe("completed");
      });
    });
  });
});
