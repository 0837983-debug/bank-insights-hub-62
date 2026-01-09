import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

/**
 * Clean ANSI escape codes and control characters from output
 */
function cleanAnsiCodes(text: string): string {
  // Remove ANSI escape sequences (using Unicode escape sequences)
  // eslint-disable-next-line no-control-regex
  text = text.replace(/\u001B\[[0-9;]*[a-zA-Z]/g, "");
  // Remove control characters like [1A, [2K, etc.
  text = text.replace(/\[\d+[A-Z]/g, "");
  // Remove other control characters (using Unicode escape sequences)
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  // Clean up multiple spaces
  text = text.replace(/[ \t]+/g, " ");
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

// Allowed commands for security
const ALLOWED_COMMANDS: Record<string, string> = {
  test: "npm run test",
  lint: "npm run lint",
  format: "npm run format:check",
  typecheck: "npm run type-check",
  validate: "npm run validate",
  build: "npm run build",
  "test:e2e": "npm run test:e2e",
  "test:e2e:api": "npm run test:e2e:api",
};

// Get project root (two levels up from backend/src/routes)
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

/**
 * POST /api/commands/run
 * Execute a command and return the output
 */
router.post("/run", async (req, res) => {
  try {
    const { commandKey } = req.body;

    if (!commandKey || typeof commandKey !== "string") {
      return res.status(400).json({ error: "commandKey is required" });
    }

    const command = ALLOWED_COMMANDS[commandKey];

    if (!command) {
      return res.status(400).json({ error: `Command "${commandKey}" is not allowed` });
    }

    // Measure execution time
    const startTime = Date.now();

    // Execute command in project root
    const { stdout, stderr } = await execAsync(command, {
      cwd: PROJECT_ROOT,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 300000, // 5 minutes timeout
    });

    const endTime = Date.now();
    const executionTime = ((endTime - startTime) / 1000).toFixed(2) + "s";

    // Determine status based on stderr and exit code
    const hasErrors = stderr.length > 0;
    let output = stdout + (stderr ? `\n${stderr}` : "");
    
    // Clean ANSI escape codes and control characters
    output = cleanAnsiCodes(output);

    // Parse test results if it's a test command
    let parsedOutput = output;
    let testSummary = null;
    let isSuccessful = !hasErrors && output.length > 0;

    if (commandKey === "test" || commandKey.startsWith("test:")) {
      testSummary = parseTestOutput(output, commandKey);
      parsedOutput = formatTestOutput(output, testSummary, commandKey);
      
      // For tests, determine success based on actual test results, not just stderr
      // Check if all tests passed
      if (testSummary.failed !== undefined) {
        isSuccessful = testSummary.failed === 0;
      } else if (parsedOutput.includes("Status: ✅") || parsedOutput.includes("All tests passed")) {
        isSuccessful = true;
      } else if (parsedOutput.includes("Status: ❌") || parsedOutput.includes("Some tests failed")) {
        isSuccessful = false;
      } else if (parsedOutput.includes("Summary:")) {
        // Check summary for failed count
        const summaryMatch = parsedOutput.match(/Summary:\s*(\d+)\s+passed[,\s]+(\d+)\s+failed/);
        if (summaryMatch) {
          const failedCount = parseInt(summaryMatch[2], 10);
          isSuccessful = failedCount === 0;
        }
      } else {
        // Fallback: check raw output directly for Playwright format "16 passed"
        const rawPassedMatch = output.match(/(\d+)\s+passed/);
        const rawFailedMatch = output.match(/(\d+)\s+failed/);
        if (rawPassedMatch && !rawFailedMatch) {
          // If only "passed" count found and no "failed", assume success
          isSuccessful = true;
        } else if (rawFailedMatch) {
          const failedCount = parseInt(rawFailedMatch[1], 10);
          isSuccessful = failedCount === 0;
        }
      }
    } else if (commandKey === "lint") {
      parsedOutput = formatLintOutput(output);
      // For lint, check if there are actual errors (not just warnings)
      const errorMatch = output.match(/(\d+)\s+error/);
      if (errorMatch) {
        isSuccessful = parseInt(errorMatch[1], 10) === 0;
      }
    } else if (commandKey === "format") {
      parsedOutput = formatFormatOutput(output);
      // For format check, success means no formatting issues
      const wouldBeReformatted = output.includes("would be reformatted");
      const codeStyleIssues = output.match(/(\d+)\s+file/);
      const filesCount = codeStyleIssues ? parseInt(codeStyleIssues[1], 10) : 0;
      isSuccessful = !wouldBeReformatted && filesCount === 0;
    } else if (commandKey === "typecheck") {
      parsedOutput = formatTypeCheckOutput(output);
      // For type check, success means no type errors
      const errorMatch = output.match(/Found\s+(\d+)\s+error/);
      const errorCount = errorMatch ? parseInt(errorMatch[1], 10) : 0;
      const hasErrorLines = output.includes("error TS");
      isSuccessful = errorCount === 0 && !hasErrorLines;
    } else if (commandKey === "validate") {
      parsedOutput = formatValidateOutput(output, executionTime);
      // For validate, check if all steps passed
      // Check for explicit failure indicators
      const hasFailed = output.includes("failed") || 
                        output.includes("✗") ||
                        (output.includes("error") && !output.includes("0 error"));
      const hasSuccess = output.includes("All checks passed") || 
                         output.includes("All validation checks passed") ||
                         (output.includes("passed") && !hasFailed);
      isSuccessful = hasSuccess && !hasFailed;
    }

    res.json({
      success: isSuccessful,
      output: parsedOutput,
      rawOutput: output,
      testSummary,
      timestamp: new Date().toISOString(),
      duration: executionTime,
    });
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    const errorOutput = error.stdout || error.stderr || errorMessage;

    res.status(500).json({
      success: false,
      output: `Error: ${errorMessage}\n\n${errorOutput}`,
      rawOutput: errorOutput,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Parse test output to extract summary
 */
function parseTestOutput(output: string, commandKey: string) {
  const lines = output.split("\n");
  const summary: {
    passed?: number;
    failed?: number;
    total?: number;
    duration?: string;
    files?: number;
    endpoints?: Array<{ name: string; status: "OK" | "FAILED"; details?: string }>;
  } = {};

  // For E2E API tests, parse endpoint results
  if (commandKey === "test:e2e:api" || commandKey === "test:e2e") {
    summary.endpoints = parseE2EAPIResults(output);
  }

  // Look for patterns like "Test Files  5 passed (5)"
  const testFilesMatch = output.match(/Test Files\s+(\d+)\s+passed/);
  if (testFilesMatch) {
    summary.files = parseInt(testFilesMatch[1], 10);
  }

  // Look for patterns like "Tests  42 passed (42)" or "16 passed (2.4s)" for Playwright
  let testsMatch = output.match(/Tests\s+(\d+)\s+passed(?:.*?(\d+)\s+failed)?/);
  if (!testsMatch && (commandKey === "test:e2e" || commandKey === "test:e2e:api")) {
    // For Playwright E2E tests, look for pattern like "16 passed (2.4s)"
    testsMatch = output.match(/(\d+)\s+passed\s+\([\d.]+s\)(?:.*?(\d+)\s+failed)?/);
  }
  if (testsMatch) {
    summary.passed = parseInt(testsMatch[1], 10);
    if (testsMatch[2]) {
      summary.failed = parseInt(testsMatch[2], 10);
    } else {
      // If no failed count, check if there are any failed tests
      const failedCountMatch = output.match(/(\d+)\s+failed/);
      if (failedCountMatch) {
        summary.failed = parseInt(failedCountMatch[1], 10);
      } else {
        // If no failed mentioned, assume all passed
        summary.failed = 0;
      }
    }
    summary.total = summary.passed + (summary.failed || 0);
  }

  // Look for duration
  const durationMatch = output.match(/Duration\s+([\d.]+s)/);
  if (durationMatch) {
    summary.duration = durationMatch[1];
  }

  // Extract failed test names
  const failedTests: string[] = [];
  const failedTestRegex = /(\d+)\s+\[chromium\]\s+›\s+(.+?)\s+›\s+(.+?)$/gm;
  let match;
  while ((match = failedTestRegex.exec(output)) !== null) {
    failedTests.push(`${match[2]} > ${match[3]}`);
  }

  return {
    ...summary,
    failedTests: failedTests.length > 0 ? failedTests : undefined,
  };
}

/**
 * Parse E2E API test results to extract endpoint statuses
 */
function parseE2EAPIResults(output: string): Array<{ name: string; status: "OK" | "FAILED"; details?: string }> {
  const endpoints: Array<{ name: string; status: "OK" | "FAILED"; details?: string }> = [];
  const endpointMap = new Map<string, { name: string; status: "OK" | "FAILED"; details?: string }>();
  
  // Clean output first
  const cleanOutput = cleanAnsiCodes(output);
  
  // Map of test descriptions to endpoint paths
  const testToEndpoint: Record<string, string> = {
    "should return health status": "/api/health",
    "should fetch all KPIs": "/api/kpis",
    "should fetch KPI categories": "/api/kpis/categories",
    "should fetch KPIs by category": "/api/kpis/category/:categoryId",
    "should fetch single KPI by ID": "/api/kpis/:id",
    "should return 404 for non-existent KPI": "/api/kpis/:id (404)",
    "should fetch layout structure": "/api/layout",
    "should handle table data request": "/api/table-data/:tableId",
    "should handle table data with groupBy param": "/api/table-data/:tableId?groupBy",
    "should return error for non-existent table": "/api/table-data/:tableId (error)",
    "should fetch chart data if available": "/api/chart-data/:chartId",
    "should return 404 for non-existent chart": "/api/chart-data/:chartId (404)",
    "should return 404 for non-existent endpoint": "/api/* (404)",
    "should handle invalid table ID gracefully": "/api/table-data/:tableId (invalid)",
    "should return JSON content type": "/api/health (content-type)",
    "should have CORS headers": "/api/health (CORS)",
  };

  // Parse test results - look for test execution lines
  // Pattern: [N/Total] [chromium] › file › group › test name
  // More flexible pattern that matches the actual format
  // Example: [1/16] [chromium] › e2e/api.integration.spec.ts:5:5 › API Integration Tests › Health Check › should return health status
  const testLineRegex = /\[(\d+)\/(\d+)\]\s+\[chromium\]\s+›\s+[^›]+?\s+›\s+(.+?)\s+›\s+(.+?)(?:\s+\([\d.]+ms\)|$|passed)/g;
  let match;
  const testResults = new Map<string, { status: "OK" | "FAILED"; testName: string }>();
  
  // First, check overall test result
  const overallPassedMatch = cleanOutput.match(/(\d+)\s+passed/);
  const overallFailedMatch = cleanOutput.match(/(\d+)\s+failed/);
  const totalPassed = overallPassedMatch ? parseInt(overallPassedMatch[1], 10) : 0;
  const totalFailed = overallFailedMatch ? parseInt(overallFailedMatch[1], 10) : 0;
  
  // If all tests passed, mark all endpoints as OK by default
  const allTestsPassed = totalFailed === 0 && totalPassed > 0;
  
  while ((match = testLineRegex.exec(cleanOutput)) !== null) {
    const testNum = parseInt(match[1], 10);
    const totalTests = parseInt(match[2], 10);
    const group = match[3].trim();
    let testName = match[4].trim();
    
    // Clean test name - remove trailing text like "16 passed"
    testName = testName.replace(/\s+\d+\s+passed.*$/, "").trim();
    
    // Check if this test failed
    // If we have overall results and this is one of the failed ones, mark it
    let isFailed = false;
    
    // Look for FAIL markers near this test
    const testPattern = `[${testNum}/${totalTests}]`;
    const testIndex = cleanOutput.indexOf(testPattern);
    
    if (testIndex !== -1) {
      // Look ahead for failure indicators
      const context = cleanOutput.substring(testIndex, Math.min(testIndex + 2000, cleanOutput.length));
      isFailed = context.includes("FAIL") || 
                 context.includes("✘") || 
                 context.includes("Error:") ||
                 context.includes("AssertionError") ||
                 context.includes("Timeout");
    }
    
    // Map test name to endpoint
    const endpoint = testToEndpoint[testName];
    
    if (endpoint) {
      // Only add if we haven't seen this endpoint yet, or update if status changed
      if (!testResults.has(endpoint) || testResults.get(endpoint)!.status === "OK") {
        // If all tests passed, assume OK; otherwise check isFailed flag
        const finalStatus = allTestsPassed ? "OK" : (isFailed ? "FAILED" : "OK");
        testResults.set(endpoint, {
          status: finalStatus,
          testName: `${group} > ${testName}`
        });
      }
    }
  }
  
  // If we didn't parse enough endpoints but have total count, create default endpoints
  if (testResults.size === 0 && totalPassed > 0) {
    // Create endpoints based on test descriptions we see in output
    // Try matching test names from the test descriptions that appear in output
    for (const [testName, endpoint] of Object.entries(testToEndpoint)) {
      // Check if test name appears in output (case-insensitive partial match)
      const testNameWords = testName.toLowerCase().split(/\s+/);
      const testNamePattern = testNameWords.join(".*?");
      const testNameRegex = new RegExp(testNamePattern, "i");
      
      // Also check for exact match in cleaned output
      if ((testNameRegex.test(cleanOutput) || cleanOutput.toLowerCase().includes(testName.toLowerCase())) 
          && !testResults.has(endpoint)) {
        testResults.set(endpoint, {
          status: allTestsPassed ? "OK" : "FAILED",
          testName: testName
        });
      }
    }
    
    // If still no results, create a generic summary based on test counts
    if (testResults.size === 0 && totalPassed > 0) {
      // At least add a generic endpoint entry showing test results
      testResults.set("/api/*", {
        status: allTestsPassed ? "OK" : "FAILED",
        testName: `Total: ${totalPassed} passed, ${totalFailed} failed`
      });
    }
  }
  
  // If we didn't find enough endpoints but have overall results, try to infer
  if (testResults.size < totalPassed + totalFailed && totalPassed + totalFailed > 0) {
    // Try alternative parsing - look for test names in describe blocks
    const describeBlocks = cleanOutput.match(/test\.describe\(["'](.+?)["']/g) || [];
    const testBlocks = cleanOutput.match(/test\(["'](.+?)["']/g) || [];
    
    // Try to match test names to endpoints
    for (const testBlock of testBlocks) {
      const testMatch = testBlock.match(/test\(["'](.+?)["']/);
      if (testMatch) {
        const testName = testMatch[1];
        const endpoint = testToEndpoint[testName];
        if (endpoint && !testResults.has(endpoint)) {
          // Assume passed if not marked as failed
          testResults.set(endpoint, {
            status: "OK",
            testName: testName
          });
        }
      }
    }
  }
  
  // Convert to endpoints array, sorted by name
  for (const [endpoint, result] of testResults.entries()) {
    endpoints.push({
      name: endpoint,
      status: result.status
    });
  }
  
  // Sort endpoints by name for consistent output
  endpoints.sort((a, b) => a.name.localeCompare(b.name));

  // Extract error details for failed tests
  for (const endpoint of endpoints) {
    if (endpoint.status === "FAILED") {
      const testName = endpointMap.get(endpoint.name) || endpoint.name;
      
      // Try to find error message near the test name
      const testPattern = new RegExp(
        `(${testName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*?)(?=\\n\\n|$)`,
        "s"
      );
      const errorMatch = cleanOutput.match(testPattern);
      
      if (errorMatch) {
        const errorSection = errorMatch[1];
        // Extract error message
        const errorMsgMatch = errorSection.match(/Error[:\s]+(.+?)(?:\n|at |$)/s);
        if (errorMsgMatch) {
          endpoint.details = errorMsgMatch[1].trim().split("\n")[0].substring(0, 150);
        } else {
          // Try to find assertion error
          const assertionMatch = errorSection.match(/Expected[^]+?Received[^]+?(?:\n|$)/s);
          if (assertionMatch) {
            endpoint.details = assertionMatch[0].trim().substring(0, 150);
          }
        }
      }
    }
  }

  // Sort: passed first, then failed
  endpoints.sort((a, b) => {
    if (a.status === "OK" && b.status === "FAILED") return -1;
    if (a.status === "FAILED" && b.status === "OK") return 1;
    return a.name.localeCompare(b.name);
  });

  return endpoints;
}

/**
 * Format test output with highlights and business-friendly format
 */
function formatTestOutput(output: string, summary: any, commandKey: string) {
  // For E2E API tests, show business-friendly endpoint status
  if (commandKey === "test:e2e:api") {
    return formatBusinessFriendlyOutput(summary, output);
  }

  // For E2E tests (general), show simplified summary
  if (commandKey === "test:e2e") {
    return formatE2ETestOutput(summary, output);
  }

  // For unit tests, show simplified summary
  if (commandKey === "test") {
    return formatUnitTestOutput(summary, output);
  }

  // Default formatting with highlights
  let formatted = output;

  // Highlight test results
  if (summary.passed !== undefined) {
    formatted = formatted.replace(
      /Tests\s+(\d+)\s+passed/g,
      `Tests  ✅ $1 passed`
    );
  }

  if (summary.failed !== undefined && summary.failed > 0) {
    formatted = formatted.replace(
      /(\d+)\s+failed/g,
      `❌ $1 failed`
    );
  }

  // Add summary at the top if available
  if (summary.total !== undefined) {
    const summaryLine = `\n📊 Test Summary: ${summary.passed || 0}/${summary.total} passed${
      summary.failed ? `, ${summary.failed} failed` : ""
    }${summary.duration ? ` (${summary.duration})` : ""}\n`;

    if (summary.failedTests && summary.failedTests.length > 0) {
      const failedList = summary.failedTests.map((t: string) => `  ❌ ${t}`).join("\n");
      formatted = summaryLine + "\nFailed tests:\n" + failedList + "\n\n" + formatted;
    } else {
      formatted = summaryLine + formatted;
    }
  }

  return formatted;
}

/**
 * Format E2E test output in business-friendly way
 */
function formatE2ETestOutput(summary: any, rawOutput: string): string {
  let result = "📋 E2E Tests Results\n";
  result += "=".repeat(60) + "\n\n";

  // Extract test results from Playwright output
  const passedMatch = rawOutput.match(/(\d+)\s+passed/);
  const failedMatch = rawOutput.match(/(\d+)\s+failed/);
  const totalMatch = rawOutput.match(/(\d+)\s+test/);
  
  const passed = passedMatch ? parseInt(passedMatch[1], 10) : (summary.passed || 0);
  const failed = failedMatch ? parseInt(failedMatch[1], 10) : (summary.failed || 0);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : (summary.total || passed + failed);

  if (total > 0) {
    result += `Total Tests: ${total}\n`;
    result += `✅ Passed: ${passed}\n`;
    if (failed > 0) {
      result += `❌ Failed: ${failed}\n`;
    }
    if (summary.duration) {
      result += `⏱ Duration: ${summary.duration}\n`;
    }
    result += "\n";
  }

  // Extract passed test names
  const passedTests: string[] = [];
  
  // Parse passed tests from Playwright output
  // Format: ✓ test name (123ms)
  const passedRegex = /✓\s+(.+?)(?:\s+\([\d.]+ms\)|$)/g;
  let match;
  while ((match = passedRegex.exec(rawOutput)) !== null) {
    const testName = match[1].trim();
    if (testName && !passedTests.includes(testName)) {
      passedTests.push(testName);
    }
  }

  // Also try PASS format: PASS e2e/file.spec.ts > test name
  const passFormatRegex = /PASS\s+.*?›\s+(.+?)\s+›\s+(.+?)(?:\s+\([\d.]+ms\)|$)/gm;
  while ((match = passFormatRegex.exec(rawOutput)) !== null) {
    const group = match[1].trim();
    const test = match[2].trim();
    const fullTestName = `${group} > ${test}`;
    if (!passedTests.includes(fullTestName)) {
      passedTests.push(fullTestName);
    }
  }

  // Show passed tests
  if (passedTests.length > 0) {
    result += "✅ Passed Tests:\n";
    result += "-".repeat(60) + "\n";
    for (const test of passedTests) {
      result += `  ✅ ${test}\n`;
    }
    result += "\n";
  }

  // Extract failed test names if available
  if (summary.failedTests && summary.failedTests.length > 0) {
    result += "❌ Failed Tests:\n";
    result += "-".repeat(60) + "\n";
    for (const test of summary.failedTests.slice(0, 10)) {
      result += `  • ${test}\n`;
    }
    if (summary.failedTests.length > 10) {
      result += `  ... and ${summary.failedTests.length - 10} more\n`;
    }
    result += "\n";
  }

  result += "=".repeat(60) + "\n";
  if (failed > 0) {
    result += "\nStatus: ❌ Some E2E tests failed\n";
  } else {
    result += "\nStatus: ✅ All E2E tests passed\n";
  }

  return result;
}

/**
 * Format business-friendly output for E2E API tests
 */
function formatBusinessFriendlyOutput(summary: any, rawOutput: string): string {
  let result = "📋 API Endpoints Test Results\n";
  result += "=".repeat(60) + "\n\n";

  let endpoints = summary.endpoints || [];
  
  // If no endpoints parsed, try to parse from raw output
  if (endpoints.length === 0) {
    endpoints = parseE2EAPIResults(rawOutput);
  }

  const passed = endpoints.filter((e: any) => e.status === "OK");
  const failed = endpoints.filter((e: any) => e.status === "FAILED");
  
  // Extract passed/failed counts from raw output if endpoints are empty
  const rawPassedMatch = rawOutput.match(/(\d+)\s+passed/);
  const rawFailedMatch = rawOutput.match(/(\d+)\s+failed/);
  const rawPassed = rawPassedMatch ? parseInt(rawPassedMatch[1], 10) : 0;
  const rawFailed = rawFailedMatch ? parseInt(rawFailedMatch[1], 10) : 0;
  
  // Use summary values if available, otherwise use parsed values
  const totalPassed = summary.passed !== undefined ? summary.passed : (passed.length > 0 ? passed.length : rawPassed);
  const totalFailed = summary.failed !== undefined ? summary.failed : (failed.length > 0 ? failed.length : rawFailed);

  // Show all endpoints in a simple list format
  if (endpoints.length > 0) {
    result += "Tested Endpoints:\n";
    result += "-".repeat(60) + "\n";
    
    // Sort: passed first, then failed, then by name
    const sortedEndpoints = [...endpoints].sort((a, b) => {
      if (a.status === "OK" && b.status === "FAILED") return -1;
      if (a.status === "FAILED" && b.status === "OK") return 1;
      return a.name.localeCompare(b.name);
    });
    
    for (const endpoint of sortedEndpoints) {
      const status = endpoint.status === "OK" ? "OK" : "FAILED";
      const icon = endpoint.status === "OK" ? "✅" : "❌";
      result += `  ${icon} ${endpoint.name} - ${status}\n`;
    }
    
    result += "\n";
  } else {
    // If endpoints not parsed, show simple summary
    result += `Total Tests: ${totalPassed + totalFailed}\n`;
    result += `✅ Passed: ${totalPassed}\n`;
    if (totalFailed > 0) {
      result += `❌ Failed: ${totalFailed}\n`;
    }
    result += "\n";
  }

  // Summary
  result += "=".repeat(60) + "\n";
  result += `Summary: ${totalPassed} passed, ${totalFailed} failed`;
  
  // Try to extract duration from output
  // Look for patterns like "16 passed (2.4s)" or just duration "(2.4s)"
  const durationMatch = rawOutput.match(/(\d+)\s+passed\s+\(([\d.]+s)\)/) || rawOutput.match(/\(([\d.]+s)\)/);
  if (durationMatch) {
    const duration = durationMatch[2] || durationMatch[1];
    result += ` (${duration})`;
  } else if (summary.duration) {
    result += ` (${summary.duration})`;
  }
  result += "\n";

  // Add status line for DevTools to recognize success
  // Use the values we calculated above
  if (totalFailed > 0) {
    result += "\nStatus: ❌ Some tests failed\n";
  } else if (totalPassed > 0) {
    result += "\nStatus: ✅ All tests passed\n";
  } else {
    // Fallback: if output contains "passed" without "failed", assume success
    if (rawOutput.includes("passed") && !rawOutput.includes("failed")) {
      result += "\nStatus: ✅ All tests passed\n";
    }
  }

  return result;
}

/**
 * Format unit test output in business-friendly way
 */
function formatUnitTestOutput(summary: any, rawOutput: string): string {
  let result = "📋 Unit Tests Results\n";
  result += "=".repeat(60) + "\n\n";

  // Extract test file names and their status
  const testFiles: Array<{ name: string; status: "OK" | "FAILED"; tests?: string[] }> = [];
  
  // Parse test files from output
  const fileRegex = /(PASS|FAIL)\s+(.+?\.(test|spec)\.(ts|tsx|js|jsx))/g;
  let match;
  const fileMap = new Map<string, "OK" | "FAILED">();
  
  while ((match = fileRegex.exec(rawOutput)) !== null) {
    const status = match[1] === "PASS" ? "OK" : "FAILED";
    const fileName = match[2];
    // Only keep the most recent status (last one wins)
    fileMap.set(fileName, status);
  }
  
  // Also try to parse from test summary
  const testFileSummaryRegex = /Test Files\s+(\d+)\s+passed(?:.*?(\d+)\s+failed)?/;
  const fileSummaryMatch = rawOutput.match(testFileSummaryRegex);
  
  if (fileMap.size > 0) {
    for (const [fileName, status] of fileMap.entries()) {
      const shortName = fileName.split("/").pop() || fileName;
      testFiles.push({ name: shortName, status });
    }
  }

  // Show summary
  if (summary.total !== undefined) {
    result += `Total Tests: ${summary.total}\n`;
    result += `✅ Passed: ${summary.passed || 0}\n`;
    if (summary.failed && summary.failed > 0) {
      result += `❌ Failed: ${summary.failed}\n`;
    }
    if (summary.files !== undefined) {
      result += `📁 Test Files: ${summary.files}\n`;
    }
    if (summary.duration) {
      result += `⏱ Duration: ${summary.duration}\n`;
    }
    result += "\n";
  }

  // Extract passed test names from output
  const passedTests: string[] = [];
  
  // Parse passed tests from Vitest output
  // Format: ✓ test name (123ms)
  const passedRegex = /✓\s+(.+?)(?:\s+\([\d.]+ms\)|$)/g;
  while ((match = passedRegex.exec(rawOutput)) !== null) {
    const testName = match[1].trim();
    if (testName && !passedTests.includes(testName)) {
      passedTests.push(testName);
    }
  }

  // Also try to extract from test describe blocks
  const describeRegex = /describe\(["'](.+?)["']/g;
  const testRegex = /(?:it|test)\(["'](.+?)["']/g;
  const testSuites = new Set<string>();
  
  while ((match = describeRegex.exec(rawOutput)) !== null) {
    testSuites.add(match[1]);
  }

  // Show test files status
  if (testFiles.length > 0) {
    const passedFiles = testFiles.filter(f => f.status === "OK");
    const failedFiles = testFiles.filter(f => f.status === "FAILED");
    
    if (passedFiles.length > 0) {
      result += "✅ Passed Test Files:\n";
      result += "-".repeat(60) + "\n";
      for (const file of passedFiles) {
        result += `  ✅ ${file.name}\n`;
      }
      result += "\n";
    }
    
    if (failedFiles.length > 0) {
      result += "❌ Failed Test Files:\n";
      result += "-".repeat(60) + "\n";
      for (const file of failedFiles) {
        result += `  ❌ ${file.name}\n`;
      }
      result += "\n";
    }
  }

  // Show passed tests if available
  if (passedTests.length > 0) {
    result += "✅ Passed Test Cases:\n";
    result += "-".repeat(60) + "\n";
    // Show first 20 passed tests
    for (const test of passedTests.slice(0, 20)) {
      result += `  ✅ ${test}\n`;
    }
    if (passedTests.length > 20) {
      result += `  ... and ${passedTests.length - 20} more test(s)\n`;
    }
    result += "\n";
  }

  // Show failed tests if any
  if (summary.failedTests && summary.failedTests.length > 0) {
    result += "❌ Failed Test Cases:\n";
    result += "-".repeat(60) + "\n";
    for (const test of summary.failedTests) {
      result += `  • ${test}\n`;
    }
    result += "\n";
  }

  // Show summary status
  result += "=".repeat(60) + "\n";
  if (summary.failed && summary.failed > 0) {
    result += "Status: ❌ Some tests failed\n";
  } else {
    result += "Status: ✅ All tests passed\n";
  }

  return result;
}

/**
 * Format lint output
 */
function formatLintOutput(output: string) {
  let result = "📋 ESLint Results\n";
  result += "=".repeat(60) + "\n\n";

  // Count warnings and errors
  const errorMatch = output.match(/(\d+)\s+error/);
  const warningMatch = output.match(/(\d+)\s+warning/);
  const errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;
  const warnings = warningMatch ? parseInt(warningMatch[1], 10) : 0;

  if (errors === 0 && warnings === 0) {
    result += "Status: ✅ No issues found\n";
    result += "\nAll code quality checks passed!\n";
    return result;
  }

  result += `Errors: ${errors}\n`;
  result += `Warnings: ${warnings}\n`;
  result += "\n";

  if (errors > 0) {
    result += "❌ Errors found:\n";
    result += "-".repeat(60) + "\n";
    
    // Extract error messages (first 10)
    const errorLines = output.split("\n").filter(line => 
      line.includes("error") && (line.includes("✖") || line.match(/\d+:\d+/))
    ).slice(0, 10);
    
    for (const line of errorLines) {
      const cleanLine = line.replace(/✖\s*/, "").trim();
      if (cleanLine) {
        result += `  • ${cleanLine.substring(0, 100)}${cleanLine.length > 100 ? "..." : ""}\n`;
      }
    }
    
    if (errorLines.length < errors) {
      result += `  ... and ${errors - errorLines.length} more error(s)\n`;
    }
    result += "\n";
  }

  result += "=".repeat(60) + "\n";
  if (errors > 0) {
    result += "Status: ❌ Linting failed\n";
    result += "💡 Tip: Run 'npm run lint:fix' to auto-fix issues\n";
  } else {
    result += "Status: ⚠️  Warnings found (no errors)\n";
  }

  return result;
}

/**
 * Format format check output
 */
function formatFormatOutput(output: string): string {
  let result = "📋 Code Formatting Check\n";
  result += "=".repeat(60) + "\n\n";

  // Check for formatting issues
  const wouldBeReformatted = output.includes("would be reformatted");
  const codeStyleIssues = output.match(/(\d+)\s+file/);
  const filesCount = codeStyleIssues ? parseInt(codeStyleIssues[1], 10) : 0;

  if (!wouldBeReformatted && filesCount === 0) {
    result += "Status: ✅ All files are properly formatted\n";
    result += "\nNo formatting issues found!\n";
    return result;
  }

  if (filesCount > 0) {
    result += `❌ Found formatting issues in ${filesCount} file${filesCount !== 1 ? "s" : ""}\n`;
    result += "-".repeat(60) + "\n";
    
    // Extract file names that need formatting
    const fileLines = output.split("\n").filter(line => 
      line.trim().endsWith(".ts") || 
      line.trim().endsWith(".tsx") || 
      line.trim().endsWith(".js") ||
      line.trim().endsWith(".jsx")
    ).slice(0, 10);
    
    if (fileLines.length > 0) {
      result += "Files needing formatting:\n";
      for (const line of fileLines) {
        const fileName = line.trim();
        result += `  • ${fileName}\n`;
      }
      if (fileLines.length < filesCount) {
        result += `  ... and ${filesCount - fileLines.length} more file(s)\n`;
      }
    }
    result += "\n";
  }

  result += "=".repeat(60) + "\n";
  result += "Status: ❌ Formatting check failed\n";
  result += "💡 Tip: Run 'npm run format' to auto-format code\n";

  return result;
}

/**
 * Format type check output
 */
function formatTypeCheckOutput(output: string): string {
  let result = "📋 TypeScript Type Check\n";
  result += "=".repeat(60) + "\n\n";

  // Check for type errors
  const errorMatch = output.match(/Found\s+(\d+)\s+error/);
  const errorCount = errorMatch ? parseInt(errorMatch[1], 10) : 0;
  
  // Also check for individual error lines
  const errorLines = output.split("\n").filter(line => 
    line.includes("error TS") || line.match(/^\s*\d+\s+error/)
  );

  if (errorCount === 0 && errorLines.length === 0) {
    result += "Status: ✅ No type errors found\n";
    result += "\nAll TypeScript types are correct!\n";
    return result;
  }

  const actualErrorCount = errorCount > 0 ? errorCount : errorLines.length;

  result += `❌ Found ${actualErrorCount} type error${actualErrorCount !== 1 ? "s" : ""}\n`;
  result += "-".repeat(60) + "\n";

  // Extract first 10 error messages
  const errors = errorLines.slice(0, 10);
  for (const error of errors) {
    const cleanError = error.trim().substring(0, 150);
    if (cleanError) {
      result += `  • ${cleanError}${cleanError.length >= 150 ? "..." : ""}\n`;
    }
  }

  if (errors.length < actualErrorCount) {
    result += `  ... and ${actualErrorCount - errors.length} more error(s)\n`;
  }

  result += "\n";
  result += "=".repeat(60) + "\n";
  result += "Status: ❌ Type checking failed\n";

  return result;
}

/**
 * Format validate output (combines multiple checks)
 */
function formatValidateOutput(output: string, totalExecutionTime?: string): string {
  let result = "📋 Full Validation Results\n";
  result += "=".repeat(60) + "\n\n";

  // Parse validation steps with duration
  const steps: Array<{ name: string; status: "OK" | "FAILED"; duration?: string }> = [];
  
  // Check for each validation step
  const stepPatterns = [
    { pattern: /type-check|Type checking|TypeScript Type Check/i, name: "Type Check" },
    { pattern: /lint|Linting|ESLint/i, name: "Lint" },
    { pattern: /format|Formatting|Code Formatting/i, name: "Format" },
    { pattern: /npm run test|Unit Tests|Unit Tests Results/i, name: "Unit Tests" },
    { pattern: /test:e2e:api|E2E API|API Endpoints Test/i, name: "E2E API Tests" },
  ];

  // Try to extract step results by looking for command execution patterns
  // Validate runs: type-check, lint, format:check, test, test:e2e:api, test:e2e
  
  // Track command positions to estimate durations
  const commandPositions: Array<{ name: string; start: number; end?: number }> = [];
  
  // Find all command executions
  const commandRegex = />\s+(npm run|vite_react_shadcn_ts@)/g;
  let match;
  while ((match = commandRegex.exec(output)) !== null) {
    const pos = match.index;
    // Look for command name in next lines
    const nextLines = output.substring(pos, pos + 200);
    if (nextLines.includes("type-check")) {
      commandPositions.push({ name: "Type Check", start: pos });
    } else if (nextLines.includes("lint")) {
      commandPositions.push({ name: "Lint", start: pos });
    } else if (nextLines.includes("format:check")) {
      commandPositions.push({ name: "Format", start: pos });
    } else if (nextLines.includes("test") && !nextLines.includes("test:e2e")) {
      commandPositions.push({ name: "Unit Tests", start: pos });
    } else if (nextLines.includes("test:e2e:api")) {
      commandPositions.push({ name: "E2E API Tests", start: pos });
    } else if (nextLines.includes("test:e2e") && !nextLines.includes("test:e2e:api")) {
      commandPositions.push({ name: "E2E Tests", start: pos });
    }
  }
  
  // Calculate end positions
  for (let i = 0; i < commandPositions.length; i++) {
    if (i < commandPositions.length - 1) {
      commandPositions[i].end = commandPositions[i + 1].start;
    } else {
      commandPositions[i].end = output.length;
    }
  }
  
  // Check for Type Check
  if (output.includes("TypeScript Type Check") || output.includes("type-check")) {
    const hasTypeErrors = output.includes("Found") && output.match(/Found\s+\d+\s+error/) ||
                          output.includes("error TS");
    
    // Find duration from command position or output
    const typeCheckPos = commandPositions.find(p => p.name === "Type Check");
    let duration: string | undefined;
    
    if (typeCheckPos) {
      const section = output.substring(typeCheckPos.start, typeCheckPos.end);
      const durationMatch = section.match(/(?:Done in |took |\(|in )([\d.]+s)/) ||
                            section.match(/([\d.]+)\s*s(?!\w)/);
      if (durationMatch) {
        duration = durationMatch[1].includes("s") ? durationMatch[1] : durationMatch[1] + "s";
      }
    } else {
      // Fallback: search in output
      const typeCheckIndex = output.indexOf("type-check");
      if (typeCheckIndex !== -1) {
        const nextCommandIndex = output.indexOf("npm run", typeCheckIndex + 10);
        const sectionEnd = nextCommandIndex !== -1 ? nextCommandIndex : typeCheckIndex + 2000;
        const typeCheckSection = output.substring(typeCheckIndex, sectionEnd);
        const durationMatch = typeCheckSection.match(/(?:Done in |took |\(|in )([\d.]+s)/) ||
                              typeCheckSection.match(/([\d.]+)\s*s(?!\w)/);
        if (durationMatch) {
          duration = durationMatch[1].includes("s") ? durationMatch[1] : durationMatch[1] + "s";
        }
      }
    }
    
    steps.push({ 
      name: "Type Check", 
      status: hasTypeErrors ? "FAILED" : "OK",
      duration
    });
  }

  // Check for Lint
  if (output.includes("ESLint") || output.includes("lint")) {
    const errorMatch = output.match(/(\d+)\s+error/);
    const errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;
    
    // Find duration from command position or output
    const lintPos = commandPositions.find(p => p.name === "Lint");
    let duration: string | undefined;
    
    if (lintPos) {
      const section = output.substring(lintPos.start, lintPos.end);
      const durationMatch = section.match(/(?:Done in |took |\(|in )([\d.]+s)/) ||
                            section.match(/([\d.]+)\s*s(?!\w)/);
      if (durationMatch) {
        duration = durationMatch[1].includes("s") ? durationMatch[1] : durationMatch[1] + "s";
      }
    } else {
      // Fallback
      const lintIndex = output.indexOf("lint");
      if (lintIndex !== -1) {
        const nextCommandIndex = output.indexOf("npm run", lintIndex + 10);
        const sectionEnd = nextCommandIndex !== -1 ? nextCommandIndex : lintIndex + 2000;
        const lintSection = output.substring(lintIndex, sectionEnd);
        const durationMatch = lintSection.match(/(?:Done in |took |\(|in )([\d.]+s)/) ||
                              lintSection.match(/([\d.]+)\s*s(?!\w)/);
        if (durationMatch) {
          duration = durationMatch[1].includes("s") ? durationMatch[1] : durationMatch[1] + "s";
        }
      }
    }
    
    steps.push({ 
      name: "Lint", 
      status: errors > 0 ? "FAILED" : "OK",
      duration
    });
  }

  // Check for Format
  if (output.includes("Code Formatting") || output.includes("format:check") || output.includes("Prettier")) {
    const hasFormatIssues = output.includes("would be reformatted") || 
                            output.match(/(\d+)\s+file/);
    
    // Find duration from command position or output
    const formatPos = commandPositions.find(p => p.name === "Format");
    let duration: string | undefined;
    
    if (formatPos) {
      const section = output.substring(formatPos.start, formatPos.end);
      const durationMatch = section.match(/(?:Done in |took |\(|in )([\d.]+s)/) ||
                            section.match(/([\d.]+)\s*s(?!\w)/);
      if (durationMatch) {
        duration = durationMatch[1].includes("s") ? durationMatch[1] : durationMatch[1] + "s";
      }
    } else {
      // Fallback
      const formatIndex = output.indexOf("format:check");
      if (formatIndex !== -1) {
        const nextCommandIndex = output.indexOf("npm run", formatIndex + 10);
        const sectionEnd = nextCommandIndex !== -1 ? nextCommandIndex : formatIndex + 2000;
        const formatSection = output.substring(formatIndex, sectionEnd);
        const durationMatch = formatSection.match(/(?:Done in |took |\(|in )([\d.]+s)/) ||
                              formatSection.match(/([\d.]+)\s*s(?!\w)/);
        if (durationMatch) {
          duration = durationMatch[1].includes("s") ? durationMatch[1] : durationMatch[1] + "s";
        }
      }
    }
    
    steps.push({ 
      name: "Format", 
      status: hasFormatIssues ? "FAILED" : "OK",
      duration
    });
  }

  // Check for Unit Tests
  if (output.includes("Unit Tests") || output.includes("npm run test") || 
      (output.includes("Test Files") && output.includes("Tests"))) {
    const testFailedMatch = output.match(/Failed:\s*(\d+)/);
    const testFailed = testFailedMatch ? parseInt(testFailedMatch[1], 10) : 0;
    const hasTestFailures = output.includes("Some tests failed") || 
                           output.includes("Status: ❌") ||
                           testFailed > 0;
    
    // Find duration from command position or output
    const testPos = commandPositions.find(p => p.name === "Unit Tests");
    let duration: string | undefined;
    
    if (testPos) {
      const section = output.substring(testPos.start, testPos.end);
      const durationMatch = section.match(/Duration\s+([\d.]+s)/) ||
                            section.match(/([\d.]+s)\)/);
      if (durationMatch) {
        duration = durationMatch[1];
      }
    } else {
      // Fallback: search in output
      const durationMatch = output.match(/Duration\s+([\d.]+s)/);
      duration = durationMatch ? durationMatch[1] : undefined;
    }
    
    steps.push({ 
      name: "Unit Tests", 
      status: hasTestFailures ? "FAILED" : "OK",
      duration
    });
  }

  // Check for E2E API Tests
  if (output.includes("API Endpoints") || output.includes("test:e2e:api") || 
      output.includes("E2E API")) {
    const apiFailedMatch = output.match(/Summary:\s*\d+\s+passed[,\s]+(\d+)\s+failed/);
    const apiFailed = apiFailedMatch ? parseInt(apiFailedMatch[1], 10) : 0;
    const hasApiFailures = output.includes("Failed Endpoints:") || 
                          output.includes("Status: ❌") ||
                          apiFailed > 0;
    
    // Find duration from command position or output
    const apiPos = commandPositions.find(p => p.name === "E2E API Tests");
    let duration: string | undefined;
    
    if (apiPos) {
      const section = output.substring(apiPos.start, apiPos.end);
      const durationMatch = section.match(/(\d+)\s+passed\s+\(([\d.]+s)\)/) || 
                            section.match(/(\d+)\s+passed.*?\(([\d.]+s)\)/) ||
                            section.match(/\(([\d.]+s)\)/);
      if (durationMatch) {
        duration = durationMatch[2] || durationMatch[1];
      }
    } else {
      // Fallback
      const apiIndex = output.indexOf("test:e2e:api");
      if (apiIndex !== -1) {
        const nextCommandIndex = output.indexOf("npm run", apiIndex + 15);
        const sectionEnd = nextCommandIndex !== -1 ? nextCommandIndex : apiIndex + 10000;
        const apiSection = output.substring(apiIndex, sectionEnd);
        const durationMatch = apiSection.match(/(\d+)\s+passed\s+\(([\d.]+s)\)/) || 
                              apiSection.match(/(\d+)\s+passed.*?\(([\d.]+s)\)/) ||
                              apiSection.match(/\(([\d.]+s)\)/);
        if (durationMatch) {
          duration = durationMatch[2] || durationMatch[1];
        }
      }
    }
    
    steps.push({ 
      name: "E2E API Tests", 
      status: hasApiFailures ? "FAILED" : "OK",
      duration
    });
  }

  // Check for E2E Tests (general) - look for test:e2e command execution
  // Find the section where test:e2e was executed (but not test:e2e:api)
  const e2eApiIndex = output.indexOf("test:e2e:api");
  const e2eIndex = output.lastIndexOf("test:e2e");
  
  // Check if test:e2e was run after test:e2e:api (which means it's the general E2E tests)
  if (e2eIndex !== -1 && (e2eApiIndex === -1 || e2eIndex > e2eApiIndex)) {
    // Extract section after the last test:e2e command
    const e2eSection = output.substring(e2eIndex);
    
    // Look for test results in this section
    // Pattern: "X passed" or "X failed" after test execution
    const passedMatches = e2eSection.match(/(\d+)\s+passed/g);
    const failedMatches = e2eSection.match(/(\d+)\s+failed/g);
    
    // Get the last match (most recent result)
    const lastPassed = passedMatches ? passedMatches[passedMatches.length - 1] : null;
    const lastFailed = failedMatches ? failedMatches[failedMatches.length - 1] : null;
    
    // Check if this section contains basic.spec.ts (which means it's general E2E, not just API)
    const hasBasicTests = e2eSection.includes("basic.spec.ts") || 
                         e2eSection.includes("Basic Site Functionality");
    
    // Only add if we found general E2E tests (not just API tests)
    if (hasBasicTests || (lastPassed && !e2eSection.includes("e2e/api.integration.spec.ts"))) {
      const passedCount = lastPassed ? parseInt(lastPassed.match(/(\d+)/)?.[1] || "0", 10) : 0;
      const failedCount = lastFailed ? parseInt(lastFailed.match(/(\d+)/)?.[1] || "0", 10) : 0;
      
      const hasE2EFailures = failedCount > 0 || 
                            e2eSection.includes("Some E2E tests failed") || 
                            e2eSection.includes("Status: ❌");
      
      // Extract duration from E2E test output
      // Look for patterns like "20 passed (4.8s)" or "X test (Ys)"
      let duration: string | undefined;
      
      const e2ePos = commandPositions.find(p => p.name === "E2E Tests");
      if (e2ePos) {
        const section = output.substring(e2ePos.start, e2ePos.end);
        const durationMatch = section.match(/(\d+)\s+passed\s+\(([\d.]+s)\)/) || 
                              section.match(/(\d+)\s+test.*?\(([\d.]+s)\)/) ||
                              section.match(/(\d+)\s+passed.*?\(([\d.]+s)\)/) ||
                              section.match(/\(([\d.]+s)\)/);
        if (durationMatch) {
          duration = durationMatch[2] || durationMatch[1];
        }
      } else {
        // Fallback: search in e2eSection
        const durationMatch = e2eSection.match(/(\d+)\s+passed\s+\(([\d.]+s)\)/) || 
                              e2eSection.match(/(\d+)\s+test.*?\(([\d.]+s)\)/) ||
                              e2eSection.match(/(\d+)\s+passed.*?\(([\d.]+s)\)/) ||
                              e2eSection.match(/\(([\d.]+s)\)/);
        if (durationMatch) {
          duration = durationMatch[2] || durationMatch[1];
        }
      }
      
      steps.push({ 
        name: "E2E Tests", 
        status: hasE2EFailures ? "FAILED" : "OK",
        duration
      });
    }
  }
  
  // Also check for E2E Tests Results format
  if (output.includes("E2E Tests Results") && !output.includes("API Endpoints")) {
    const e2eFailedMatch = output.match(/Failed:\s*(\d+)/);
    const e2eFailed = e2eFailedMatch ? parseInt(e2eFailedMatch[1], 10) : 0;
    const hasE2EFailures = output.includes("Some E2E tests failed") || 
                          output.includes("Status: ❌") ||
                          e2eFailed > 0;
    
    // Extract duration from E2E Tests Results format
    const durationMatch = output.match(/Duration:\s+([\d.]+s)/) ||
                          output.match(/(\d+)\s+passed\s+\(([\d.]+s)\)/) ||
                          output.match(/\(([\d.]+s)\)/);
    const duration = durationMatch ? (durationMatch[2] || durationMatch[1]) : undefined;
    
    // Check if E2E Tests step already added
    if (!steps.find(s => s.name === "E2E Tests")) {
      steps.push({ 
        name: "E2E Tests", 
        status: hasE2EFailures ? "FAILED" : "OK",
        duration
      });
    }
  }

  // If we couldn't parse steps, try alternative parsing
  if (steps.length === 0) {
    // Check for overall result
    if (output.includes("All checks passed") || output.includes("successful")) {
      steps.push({ name: "All Checks", status: "OK" });
    } else if (output.includes("failed") || output.includes("error")) {
      steps.push({ name: "Validation", status: "FAILED" });
    }
  }

  // Calculate total duration
  let totalDurationSeconds = 0;
  for (const step of steps) {
    if (step.duration) {
      const durationStr = step.duration.replace("s", "");
      const seconds = parseFloat(durationStr);
      if (!isNaN(seconds)) {
        totalDurationSeconds += seconds;
      }
    }
  }
  
  // Use measured execution time if available and more accurate
  let totalDuration: string | undefined;
  if (totalExecutionTime) {
    totalDuration = totalExecutionTime;
  } else if (totalDurationSeconds > 0) {
    totalDuration = `${totalDurationSeconds.toFixed(2)}s`;
  }

  // Display steps
  if (steps.length > 0) {
    const passed = steps.filter(s => s.status === "OK");
    const failed = steps.filter(s => s.status === "FAILED");

    if (passed.length > 0) {
      result += "✅ Passed Steps:\n";
      result += "-".repeat(60) + "\n";
      for (const step of passed) {
        const durationStr = step.duration ? ` (${step.duration})` : "";
        result += `  ✅ ${step.name}${durationStr}\n`;
      }
      result += "\n";
    }

    if (failed.length > 0) {
      result += "❌ Failed Steps:\n";
      result += "-".repeat(60) + "\n";
      for (const step of failed) {
        const durationStr = step.duration ? ` (${step.duration})` : "";
        result += `  ❌ ${step.name}${durationStr}\n`;
      }
      result += "\n";
    }
  }

  result += "=".repeat(60) + "\n";
  const allPassed = steps.length > 0 && steps.every(s => s.status === "OK");
  if (allPassed) {
    result += "Status: ✅ All validation checks passed";
  } else {
    result += "Status: ❌ Some validation checks failed";
  }
  
  if (totalDuration) {
    result += `\nTotal Duration: ${totalDuration}`;
  }
  result += "\n";

  return result;
}

export default router;

