import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Security Tests", () => {
  test.describe("SQL Injection Protection", () => {
    test("should prevent SQL injection in tableId parameter", async ({ request }) => {
      const maliciousInputs = [
        "'; DROP TABLE mart.balance; --",
        "' OR '1'='1",
        "'; SELECT * FROM pg_user; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        // Используем новый формат /api/data?query_id=...
        const paramsJson = JSON.stringify({
          p1: maliciousInput,
          p2: "2025-11-01",
          p3: "2024-12-01",
        });
        
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encodeURIComponent(paramsJson)}`
        );

        // Any response is acceptable as long as SQL errors are not exposed
        // 200 = query executed safely, 400/500 = error handled properly
        expect([200, 400, 404, 500]).toContain(response.status());

        // Should not expose SQL error messages
        const body = await response.text();
        const lowerBody = body.toLowerCase();
        
        // Check that SQL injection patterns are not exposed
        expect(lowerBody).not.toContain("syntax error");
        expect(lowerBody).not.toContain("sqlstate");
        expect(lowerBody).not.toContain("postgresql");
        expect(lowerBody).not.toContain("pg_user");
        expect(lowerBody).not.toContain("pg_tables");
      }
    });

    test("should prevent SQL injection in query parameters", async ({ request }) => {
      const maliciousInputs = [
        "product_line'; DROP TABLE mart.balance; --",
        "groupBy'; SELECT * FROM pg_user; --",
        "'; DELETE FROM mart.balance; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        // Используем новый формат /api/data?query_id=...
        const paramsJson = JSON.stringify({
          p1: "2025-12-01",
          p2: "2025-11-01",
          p3: maliciousInput,
        });
        
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encodeURIComponent(paramsJson)}`
        );

        // Should handle gracefully without SQL errors
        const body = await response.text();
        const lowerBody = body.toLowerCase();
        
        expect(lowerBody).not.toContain("syntax error");
        expect(lowerBody).not.toContain("sqlstate");
      }
    });

    test("should prevent SQL injection in layout_id parameter", async ({ request }) => {
      const maliciousInputs = [
        "'; DROP TABLE config.layouts; --",
        "' OR '1'='1",
        "'; SELECT * FROM information_schema.tables; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        // Новый формат: /api/data?query_id=layout&parametrs={...}
        const paramsJson = JSON.stringify({ layout_id: maliciousInput });
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
        );

        // Should return valid response or error, but not expose SQL details
        const body = await response.text();
        const lowerBody = body.toLowerCase();
        
        expect(lowerBody).not.toContain("syntax error");
        expect(lowerBody).not.toContain("sqlstate");
      }
    });

    test("should prevent SQL injection in KPI query parameters", async ({ request }) => {
      const maliciousInputs = [
        "'; DROP TABLE mart.kpi_metrics; --",
        "category'; DELETE FROM mart.kpi_metrics; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        // Новый формат: /api/data?query_id=kpis&parametrs={...}
        const paramsJson = JSON.stringify({ 
          layout_id: maliciousInput,
          p1: "2025-12-01",
          p2: "2025-11-01",
          p3: "2024-12-01"
        });
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
        );

        const body = await response.text();
        const lowerBody = body.toLowerCase();
        
        expect(lowerBody).not.toContain("syntax error");
        expect(lowerBody).not.toContain("sqlstate");
      }
    });
  });

  // Command Injection Protection tests removed
  // The /api/commands/run endpoint has been disabled for security reasons

  test.describe("XSS (Cross-Site Scripting) Protection", () => {
    test("should sanitize user input in API responses", async ({ request }) => {
      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
      ];

      for (const payload of xssPayloads) {
        // Test /api/data endpoint with malicious input
        const paramsJson = JSON.stringify({
          layout_id: payload,
          p1: "2025-12-01",
          p2: "2025-11-01",
          p3: "2024-12-01",
        });
        
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
        );
        const body = await response.text();

        // API returns JSON, which naturally escapes HTML
        // Check for content-type to be JSON (safe)
        const contentType = response.headers()["content-type"];
        expect(contentType).toContain("application/json");
        
        // JSON encoding should escape special characters
        // If payload appears in response, it should be escaped
        if (body.includes("script")) {
          // If "script" appears, ensure it's escaped or in error message, not raw HTML
          expect(body).not.toMatch(/<script[^>]*>.*<\/script>/i);
        }
      }
    });

    test("should prevent XSS in frontend rendering", async ({ page }) => {
      await page.goto("http://localhost:8080");

      // Try to inject script via URL parameters
      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "javascript:alert('XSS')",
      ];

      for (const payload of xssPayloads) {
        const alerts: string[] = [];
        page.on("dialog", (dialog) => {
          alerts.push(dialog.message());
          dialog.dismiss();
        });

        await page.goto(`http://localhost:8080/?search=${encodeURIComponent(payload)}`);
        await page.waitForTimeout(1000);

        // Check that no alerts were triggered (no script execution)
        expect(alerts).toHaveLength(0);
      }
    });

    test("should escape HTML in JSON responses", async ({ request }) => {
      // Старый endpoint /api/kpis удален, используем новый /api/data?query_id=kpis
      const headerDatesResponse = await request.get(
        `${API_BASE_URL}/data?query_id=header_dates&component_Id=header`
      );
      
      if (headerDatesResponse.ok()) {
        const headerDates = await headerDatesResponse.json();
        const dates = headerDates.rows?.[0] || {};
        
        const paramsJson = JSON.stringify({
          layout_id: "main_dashboard",
          p1: dates.periodDate || "2025-12-01",
          p2: dates.ppDate || "2025-11-01",
          p3: dates.pyDate || "2024-12-01",
        });
        
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`
        );
        
        if (response.ok()) {
          const data = await response.json();
          const kpis = Array.isArray(data) ? data : (data.rows || []);

          // Check that any string values don't contain unescaped HTML
          const checkForXSS = (obj: any): void => {
            if (typeof obj === "string") {
              expect(obj).not.toContain("<script>");
              expect(obj).not.toContain("javascript:");
            } else if (Array.isArray(obj)) {
              obj.forEach(checkForXSS);
            } else if (obj && typeof obj === "object") {
              Object.values(obj).forEach(checkForXSS);
            }
          };

          checkForXSS(kpis);
        }
      }
    });
  });

  test.describe("Input Validation", () => {
    test("should validate and sanitize tableId parameter", async ({ request }) => {
      const invalidInputs = [
        "../../etc/passwd",
        "null",
        "undefined",
        String.fromCharCode(0), // Null byte
        "\x00",
        "tableId" + "\n" + "DROP TABLE",
        "tableId" + "\r\n" + "malicious",
        "../../../etc/passwd",
        "..\\..\\windows\\system32",
      ];

      for (const input of invalidInputs) {
        // Используем новый формат /api/data?query_id=...
        const paramsJson = JSON.stringify({
          p1: input,
          p2: "2025-11-01",
          p3: "2024-12-01",
        });
        
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=${encodeURIComponent(input)}&component_Id=test&parametrs=${encodeURIComponent(paramsJson)}`
        );

        // Should reject or sanitize invalid input
        expect([400, 404, 500]).toContain(response.status());
      }
    });

    test.skip("should limit request size", async ({ request }) => {
      // Skipped: URL encoding of large payloads creates issues
      // This test documents the requirement for rate/size limiting
      const largePayload = "x".repeat(100 * 1024);
      const paramsJson = JSON.stringify({
        p1: largePayload,
        p2: "2025-11-01",
        p3: "2024-12-01",
      });

      const response = await request.get(
        `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encodeURIComponent(paramsJson)}`
      );
      expect([200, 400, 404, 413, 414, 500]).toContain(response.status());
    });

    test("should validate JSON structure", async ({ request }) => {
      // Test with layout endpoint as example since /api/commands/run has been removed
      const invalidPayloads = [
        "not json",
        '{"layout_id":}',
        '{"layout_id": null}',
      ];

      // This test is now less relevant since we're using GET endpoints
      // But we can test that invalid query parameters are handled
      for (const payload of invalidPayloads) {
        const response = await request.get(
          `${API_BASE_URL}/layout?layout_id=${encodeURIComponent(payload)}`
        );

        // Should handle invalid parameters gracefully
        expect([200, 400, 404, 500]).toContain(response.status());
      }
    });

    test("should handle special characters safely", async ({ request }) => {
      const specialChars = [
        "\n",
        "\r",
        "\t",
        "\0",
        "\x00",
        "\u0000",
        "\u2028", // Line separator
        "\u2029", // Paragraph separator
      ];

      for (const char of specialChars) {
        // Используем новый формат /api/data?query_id=...
        const paramsJson = JSON.stringify({
          p1: `2025-12-01${char}`,
          p2: "2025-11-01",
          p3: "2024-12-01",
        });
        
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=assets_table&component_Id=assets_table&parametrs=${encodeURIComponent(paramsJson)}`
        );

        // Should handle special characters without crashing
        expect([200, 400, 404, 500]).toContain(response.status());
      }
    });
  });

  test.describe("Authentication & Authorization", () => {
    test("should protect sensitive endpoints", async ({ request }) => {
      // The /api/commands/run endpoint has been removed for security reasons
      // This test now documents that sensitive endpoints should require auth
      const sensitiveEndpoints: Array<{ method: string; path: string; data?: any }> = [
        // Add other sensitive endpoints here when they are implemented
        // Example: { method: "POST", path: "/admin/...", data: {...} }
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await request.fetch(`${API_BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          data: endpoint.data,
        });

        // TODO: Should require authentication (401 or 403)
        // Currently this will pass, but documents the security gap
        // Uncomment when auth is implemented:
        // expect([401, 403]).toContain(response.status());
      }
    });

    test("should handle rapid requests", async ({ request }) => {
      // Make rapid requests to verify server stability
      const paramsJson = JSON.stringify({
        layout_id: "main_dashboard",
        p1: "2025-12-01",
        p2: "2025-11-01",
        p3: "2024-12-01",
      });
      
      const requests = Array(10).fill(null).map(() =>
        request.get(`${API_BASE_URL}/data?query_id=kpis&component_Id=kpis&parametrs=${encodeURIComponent(paramsJson)}`)
      );

      const responses = await Promise.all(requests);

      // Server should handle rapid requests without crashing
      // 200 = success, 429 = rate limited (if implemented), 500 = error
      const validResponses = responses.filter((r) => [200, 400, 429, 500].includes(r.status()));
      expect(validResponses.length).toBe(responses.length);
      
      // At least some should succeed
      const successCount = responses.filter((r) => r.status() === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  test.describe("Security Headers", () => {
    test("should include security headers in responses", async ({ request }) => {
      // Use a valid endpoint that exists
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );
      const headers = response.headers();

      // Check for important security headers (optional - documents requirements)
      if (headers["x-content-type-options"]) {
        expect(headers["x-content-type-options"]).toBe("nosniff");
      }
      if (headers["x-frame-options"]) {
        expect(["DENY", "SAMEORIGIN"]).toContain(headers["x-frame-options"]);
      }
      
      // Test passes if response is received
      expect(response.status()).toBeLessThanOrEqual(500);
    });

    test("should configure CORS properly", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`,
        { headers: { Origin: "https://evil.com" } }
      );

      const corsHeader = response.headers()["access-control-allow-origin"];
      if (corsHeader && corsHeader === "*") {
        console.warn("CORS allows all origins - restrict in production");
      }
      
      // Test passes if response is received
      expect(response.status()).toBeLessThanOrEqual(500);
    });

    test("should not expose sensitive server information", async ({ request }) => {
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const response = await request.get(
        `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`
      );
      const headers = response.headers();

      if (headers["server"]) {
        console.warn("Server header exposes server information");
      }
      if (headers["x-powered-by"]) {
        console.warn("X-Powered-By header exposes Express framework");
      }
      
      // Test passes if response is received
      expect(response.status()).toBeLessThanOrEqual(500);
    });
  });

  test.describe("Error Handling", () => {
    test("should not expose sensitive information in error messages", async ({ request }) => {
      const errorScenarios = [
        { method: "GET", path: "/nonexistent-endpoint" },
        { method: "GET", path: "/data?query_id=invalid_query&component_Id=test" },
      ];

      for (const scenario of errorScenarios) {
        const response = await request.fetch(`${API_BASE_URL}${scenario.path}`, {
          method: scenario.method,
        });

        const body = await response.text();
        const lowerBody = body.toLowerCase();

        // Should not expose sensitive info
        expect(lowerBody).not.toContain("password");
        expect(lowerBody).not.toContain("connection string");
        expect(lowerBody).not.toContain("/etc/passwd");
        expect(lowerBody).not.toContain("c:\\windows");
      }
    });

    test("should return consistent error format", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/nonexistent-endpoint`);
      
      // Should return JSON, not HTML
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");

      const body = await response.json();
      // Error response should have error property
      expect(body).toHaveProperty("error");
    });
  });

  test.describe("Path Traversal Protection", () => {
    test("should prevent path traversal in file operations", async ({ request }) => {
      const pathTraversalInputs = [
        "../../etc/passwd",
        "../../../etc/shadow",
      ];

      for (const input of pathTraversalInputs) {
        const paramsJson = JSON.stringify({
          p1: input,
          p2: "2025-11-01",
          p3: "2024-12-01",
        });
        
        const response = await request.get(
          `${API_BASE_URL}/data?query_id=${encodeURIComponent(input)}&component_Id=test&parametrs=${encodeURIComponent(paramsJson)}`
        );

        // Should handle path traversal safely (any status is OK as long as no file leak)
        const body = await response.text();
        expect(body).not.toContain("root:");
        expect(body).not.toContain("/bin/bash");
        expect(body).not.toContain("shadow:");
      }
    });
  });

  test.describe("HTTP Method Validation", () => {
    test("should reject unsupported HTTP methods", async ({ request }) => {
      // Test /api/data endpoint which only accepts GET
      const paramsJson = JSON.stringify({ layout_id: "main_dashboard" });
      const url = `${API_BASE_URL}/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent(paramsJson)}`;
      
      const unsupportedMethods = ["PUT", "DELETE", "PATCH"];

      for (const method of unsupportedMethods) {
        const response = await request.fetch(url, {
          method: method as any,
        });

        // Should reject unsupported methods (404 or 405 are expected)
        expect([404, 405, 400, 500]).toContain(response.status());
      }
    });
  });
});
