import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Github,
  Database,
  Server,
  Globe,
  Terminal,
  Trash2,
  Plus,
  Calculator,
} from "lucide-react";
import {
  formatValue,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatChange,
} from "@/lib/formatters";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "checking";
  url?: string;
  message?: string;
}

interface CommandResult {
  command: string;
  status: "running" | "success" | "error" | "idle";
  output?: string;
  timestamp?: string;
}

interface APIEndpoint {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  description: string;
  pathParams?: { name: string; example: string; description: string }[];
  queryParams?: { name: string; example: string; description: string }[];
  bodyExample?: string;
  responseExample?: string;
}

interface ParamValue {
  name: string;
  value: string;
}

export default function DevTools() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Frontend (Vite)", status: "checking", url: "http://localhost:8080" },
    { name: "Backend API", status: "checking", url: "http://localhost:3001" },
    { name: "PostgreSQL", status: "checking" },
  ]);

  const [commands, setCommands] = useState<Record<string, CommandResult>>({
    test: { command: "npm run test", status: "idle" },
    "test:e2e": { command: "npm run test:e2e", status: "idle" },
    "test:e2e:api": { command: "npm run test:e2e:api", status: "idle" },
    lint: { command: "npm run lint", status: "idle" },
    format: { command: "npm run format:check", status: "idle" },
    typecheck: { command: "npm run type-check", status: "idle" },
    validate: { command: "npm run validate", status: "idle" },
  });

  const [selectedCommandKey, setSelectedCommandKey] = useState<string | null>(null);

  // API Endpoints catalog
  const apiEndpoints: APIEndpoint[] = [
    {
      id: "health",
      name: "Health Check",
      method: "GET",
      path: "/api/health",
      description: "Проверка статуса backend сервера",
      responseExample: JSON.stringify({ status: "ok", message: "Backend is running" }, null, 2),
    },
    {
      id: "layout",
      name: "Get Layout",
      method: "GET",
      path: "/api/layout",
      description: "Получить структуру всего приложения (секции, компоненты, форматы)",
      responseExample: JSON.stringify({ formats: {}, sections: [] }, null, 2),
    },
    {
      id: "kpi-categories",
      name: "Get KPI Categories",
      method: "GET",
      path: "/api/kpis/categories",
      description: "Получить список всех категорий KPI",
      responseExample: JSON.stringify(
        [{ id: "finance", name: "Финансы", description: "..." }],
        null,
        2
      ),
    },
    {
      id: "all-kpis",
      name: "Get All KPIs",
      method: "GET",
      path: "/api/kpis",
      description: "Получить все KPI метрики",
      responseExample: JSON.stringify(
        [
          {
            id: "capital",
            title: "Капитал",
            value: 8200000000,
            change: 5.2,
          },
        ],
        null,
        2
      ),
    },
    {
      id: "kpi-by-id",
      name: "Get KPI by ID",
      method: "GET",
      path: "/api/kpis/:id",
      description: "Получить конкретный KPI по ID",
      pathParams: [
        {
          name: "id",
          example: "capital",
          description: "ID метрики (capital, ebitda, mau, etc.)",
        },
      ],
      responseExample: JSON.stringify(
        {
          id: "capital",
          title: "Капитал",
          value: 8200000000,
        },
        null,
        2
      ),
    },
    {
      id: "kpis-by-category",
      name: "Get KPIs by Category",
      method: "GET",
      path: "/api/kpis/category/:categoryId",
      description: "Получить KPI по категории",
      pathParams: [
        {
          name: "categoryId",
          example: "finance",
          description: "ID категории (finance, clients, conversion)",
        },
      ],
      responseExample: JSON.stringify([{ id: "capital" }], null, 2),
    },
    {
      id: "table-data",
      name: "Get Table Data",
      method: "GET",
      path: "/api/table-data",
      description: "Получить данные таблицы с фильтрами",
      queryParams: [
        { name: "tableId", example: "income_structure", description: "ID таблицы" },
        {
          name: "dateFrom",
          example: "2025-01-01",
          description: "Дата начала (опционально)",
        },
        {
          name: "dateTo",
          example: "2025-12-31",
          description: "Дата окончания (опционально)",
        },
        {
          name: "groupBy",
          example: "region",
          description: "Группировка (опционально)",
        },
      ],
      responseExample: JSON.stringify(
        { tableId: "income_structure", columns: [], rows: [] },
        null,
        2
      ),
    },
  ];

  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [pathParams, setPathParams] = useState<ParamValue[]>([]);
  const [queryParams, setQueryParams] = useState<ParamValue[]>([]);
  const [requestBody, setRequestBody] = useState<string>("");
  const [apiResponse, setApiResponse] = useState<string>("");
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const resources = [
    {
      name: "GitHub Repository",
      url: "https://github.com/0837983-debug/bank-insights-hub-62",
      icon: Github,
    },
    {
      name: "Frontend (Dev Server)",
      url: "http://localhost:8080",
      icon: Globe,
    },
    {
      name: "Backend API",
      url: "http://localhost:3001/api",
      icon: Server,
    },
    {
      name: "API Documentation",
      url: "http://localhost:3001/api-docs",
      icon: ExternalLink,
    },
  ];

  // Check service statuses
  useEffect(() => {
    const checkServices = async () => {
      const newStatuses = await Promise.all(
        services.map(async (service) => {
          try {
            if (service.url) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);

              // For backend, use health endpoint; for frontend, just check if it responds
              const checkUrl =
                service.name === "Backend API" ? `${service.url}/api/health` : service.url;

              const response = await fetch(checkUrl, {
                signal: controller.signal,
              });
              clearTimeout(timeoutId);

              if (response.ok || service.name === "Frontend (Vite)") {
                return {
                  ...service,
                  status: "online" as const,
                  message: "Service is running",
                };
              } else {
                return {
                  ...service,
                  status: "offline" as const,
                  message: `HTTP ${response.status}`,
                };
              }
            } else {
              // For PostgreSQL, we can't check directly from frontend
              return {
                ...service,
                status: "online" as const,
                message: "Check via backend",
              };
            }
          } catch (error) {
            return {
              ...service,
              status: "offline" as const,
              message: error instanceof Error ? error.message : "Service unavailable",
            };
          }
        })
      );
      setServices(newStatuses);
    };

    checkServices();
    const interval = setInterval(checkServices, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const runCommand = async (key: string) => {
    setSelectedCommandKey(key);
    setCommands((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: "running",
        timestamp: new Date().toISOString(),
        output: undefined,
      },
    }));

    try {
      const response = await fetch("http://localhost:3001/api/commands/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ commandKey: key }),
      });

      const data = await response.json();

      setCommands((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          status: data.success ? "success" : "error",
          output: data.output || data.rawOutput || "No output",
          timestamp: data.timestamp || new Date().toISOString(),
        },
      }));
    } catch (error) {
      setCommands((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          status: "error",
          output: `Failed to execute command: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date().toISOString(),
        },
      }));
    }
  };

  const getButtonLabel = (key: string, command: string) => {
    const nameMap: Record<string, string> = {
      test: "Test",
      "test:e2e": "Test E2e",
      "test:e2e:api": "Test E2e Api",
      lint: "Lint",
      format: "Format",
      typecheck: "Typecheck",
      validate: "Validate",
      build: "Build",
    };
    const displayName = nameMap[key] || key.replace(/:/g, " ");
    return `${displayName} (${command})`;
  };

  const isOutputSuccessful = (output: string, status: string): boolean => {
    // Check output content first - it's the most reliable indicator
    const outputLower = output.toLowerCase();

    // Explicit success patterns (highest priority)
    if (
      output.includes("Status: ✅") ||
      output.includes("All tests passed") ||
      output.includes("✅ All tests passed") ||
      output.includes("Status: ✅ All tests passed")
    ) {
      return true;
    }

    // Check for "Summary" with failed count
    const summaryMatch = output.match(/Summary:\s*(\d+)\s+passed[,\s]+(\d+)\s+failed/);
    if (summaryMatch) {
      const failedCount = parseInt(summaryMatch[2], 10);
      if (failedCount === 0) {
        return true;
      } else {
        return false;
      }
    }

    // Explicit failure patterns
    if (
      output.includes("Status: ❌") ||
      output.includes("Some tests failed") ||
      output.includes("❌ Some tests failed") ||
      output.includes("Failed Endpoints:") ||
      (output.includes("❌ Failed") && !output.includes("0 failed"))
    ) {
      return false;
    }

    // Check for passed/failed counts in output
    const passedMatch = output.match(/✅\s+Passed:\s*(\d+)/);
    const failedMatch = output.match(/❌\s+Failed:\s*(\d+)/);
    if (passedMatch && failedMatch) {
      const failedCount = parseInt(failedMatch[1], 10);
      return failedCount === 0;
    }

    // For lint/format/typecheck, check for error patterns
    if (
      (outputLower.includes("error") &&
        !outputLower.includes("0 error") &&
        !outputLower.includes("no error")) ||
      (outputLower.includes("problems found") && !outputLower.includes("0 problems"))
    ) {
      return false;
    }

    // If status is explicitly error and no success indicators found, it's not successful
    if (status === "error") {
      // But double-check output - sometimes status is wrong
      if (output.includes("Status: ✅") || output.includes("All tests passed")) {
        return true;
      }
      return false;
    }

    // If status is success, trust it
    if (status === "success") {
      return true;
    }

    // Default: if no explicit failure indicators, consider it successful
    return true;
  };

  // Handle endpoint selection
  const handleEndpointSelect = (endpointId: string) => {
    const endpoint = apiEndpoints.find((e) => e.id === endpointId);
    if (!endpoint) return;

    setSelectedEndpoint(endpointId);

    // Initialize path params
    if (endpoint.pathParams) {
      setPathParams(endpoint.pathParams.map((p) => ({ name: p.name, value: p.example })));
    } else {
      setPathParams([]);
    }

    // Initialize query params
    if (endpoint.queryParams) {
      setQueryParams(endpoint.queryParams.map((p) => ({ name: p.name, value: p.example })));
    } else {
      setQueryParams([]);
    }

    // Initialize request body
    if (endpoint.bodyExample) {
      setRequestBody(endpoint.bodyExample);
    } else {
      setRequestBody("");
    }

    // Clear previous response
    setApiResponse("");
    setApiStatus("idle");
  };

  // Build full URL with params
  const buildApiUrl = () => {
    const endpoint = apiEndpoints.find((e) => e.id === selectedEndpoint);
    if (!endpoint) return "";

    const baseUrl = "http://localhost:3001";
    let path = endpoint.path;

    // Replace path params
    pathParams.forEach((param) => {
      path = path.replace(`:${param.name}`, param.value);
    });

    // Add query params
    const activeQueryParams = queryParams.filter((p) => p.value.trim() !== "");
    if (activeQueryParams.length > 0) {
      const queryString = activeQueryParams
        .map((p) => `${p.name}=${encodeURIComponent(p.value)}`)
        .join("&");
      path += `?${queryString}`;
    }

    return baseUrl + path;
  };

  const testApiEndpoint = async () => {
    const endpoint = apiEndpoints.find((e) => e.id === selectedEndpoint);
    if (!endpoint) return;

    setApiStatus("loading");
    setApiResponse("");

    try {
      const url = buildApiUrl();

      const options: RequestInit = {
        method: endpoint.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (endpoint.method !== "GET" && requestBody.trim()) {
        options.body = requestBody;
      }

      const response = await fetch(url, options);
      const data = await response.json();

      setApiStatus(response.ok ? "success" : "error");
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiStatus("error");
      setApiResponse(error instanceof Error ? error.message : "Unknown error occurred");
    }
  };

  // Update param value
  const updatePathParam = (index: number, value: string) => {
    setPathParams((prev) => {
      const updated = [...prev];
      updated[index].value = value;
      return updated;
    });
  };

  const updateQueryParam = (index: number, value: string) => {
    setQueryParams((prev) => {
      const updated = [...prev];
      updated[index].value = value;
      return updated;
    });
  };

  const addQueryParam = () => {
    setQueryParams((prev) => [...prev, { name: "", value: "" }]);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams((prev) => prev.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "offline":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "checking":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
  };

  const getCommandStatusIcon = (status: CommandResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "idle":
        return <Terminal className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dev Tools</h1>
        <Badge variant="outline" className="text-sm">
          Development Environment
        </Badge>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <div className="font-medium">{service.name}</div>
                  {service.url && (
                    <div className="text-xs text-muted-foreground">{service.url}</div>
                  )}
                </div>
              </div>
              <Badge
                variant={
                  service.status === "online"
                    ? "default"
                    : service.status === "offline"
                      ? "destructive"
                      : "secondary"
                }
              >
                {service.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resources.map((resource) => (
              <a
                key={resource.name}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <resource.icon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{resource.name}</span>
                <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Command Execution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Run Commands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(commands).map(([key, cmd]) => (
              <Button
                key={key}
                onClick={() => {
                  if (cmd.output) {
                    setSelectedCommandKey(key);
                  } else {
                    runCommand(key);
                  }
                }}
                disabled={cmd.status === "running"}
                className="w-full relative"
                size="sm"
                variant={selectedCommandKey === key && cmd.output ? "default" : "outline"}
              >
                <div className="absolute top-1 right-1">{getCommandStatusIcon(cmd.status)}</div>
                {cmd.status === "running" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {getButtonLabel(key, cmd.command)}
                  </>
                )}
              </Button>
            ))}
          </div>

          {/* Unified Output Window */}
          {selectedCommandKey && commands[selectedCommandKey]?.output && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Output: {getButtonLabel(selectedCommandKey, commands[selectedCommandKey].command)}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCommandKey(null)}
                  className="h-8"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <div
                className={`text-sm p-4 rounded-lg border max-h-96 overflow-y-auto font-mono whitespace-pre-wrap ${
                  isOutputSuccessful(
                    commands[selectedCommandKey].output,
                    commands[selectedCommandKey].status
                  )
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {commands[selectedCommandKey].output}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            API Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Endpoint Selection */}
          <div className="space-y-2">
            <Label>Выберите API Endpoint</Label>
            <Select value={selectedEndpoint} onValueChange={handleEndpointSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите endpoint для тестирования" />
              </SelectTrigger>
              <SelectContent>
                {apiEndpoints.map((endpoint) => (
                  <SelectItem key={endpoint.id} value={endpoint.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {endpoint.method}
                      </Badge>
                      {endpoint.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEndpoint && (
              <p className="text-sm text-muted-foreground">
                {apiEndpoints.find((e) => e.id === selectedEndpoint)?.description}
              </p>
            )}
          </div>

          {selectedEndpoint && (
            <>
              {/* Request URL Preview */}
              <div className="space-y-2">
                <Label>Request URL</Label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                  <span className="font-semibold text-blue-600">
                    {apiEndpoints.find((e) => e.id === selectedEndpoint)?.method}
                  </span>{" "}
                  {buildApiUrl()}
                </div>
              </div>

              {/* Path Parameters */}
              {pathParams.length > 0 && (
                <div className="space-y-2">
                  <Label>Path Parameters</Label>
                  <div className="space-y-2">
                    {pathParams.map((param, index) => {
                      const paramDef = apiEndpoints
                        .find((e) => e.id === selectedEndpoint)
                        ?.pathParams?.find((p) => p.name === param.name);
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">{param.name}</Label>
                            {paramDef && (
                              <span className="text-xs text-muted-foreground">
                                {paramDef.description}
                              </span>
                            )}
                          </div>
                          <Input
                            value={param.value}
                            onChange={(e) => updatePathParam(index, e.target.value)}
                            placeholder={paramDef?.example}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Query Parameters */}
              {queryParams.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Query Parameters</Label>
                    <Button variant="ghost" size="sm" onClick={addQueryParam} className="h-8">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {queryParams.map((param, index) => {
                      const paramDef = apiEndpoints
                        .find((e) => e.id === selectedEndpoint)
                        ?.queryParams?.find((p) => p.name === param.name);
                      return (
                        <div key={index} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">{param.name}</Label>
                            {paramDef && (
                              <span className="text-xs text-muted-foreground">
                                {paramDef.description}
                              </span>
                            )}
                            {index >=
                              (apiEndpoints.find((e) => e.id === selectedEndpoint)?.queryParams
                                ?.length || 0) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQueryParam(index)}
                                className="h-6 w-6 p-0 ml-auto"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <Input
                            value={param.value}
                            onChange={(e) => updateQueryParam(index, e.target.value)}
                            placeholder={paramDef?.example || "value"}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Request Body */}
              {apiEndpoints.find((e) => e.id === selectedEndpoint)?.method !== "GET" && (
                <div className="space-y-2">
                  <Label>Request Body (JSON)</Label>
                  <Textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              {/* Test Button */}
              <Button
                onClick={testApiEndpoint}
                disabled={apiStatus === "loading"}
                className="w-full"
              >
                {apiStatus === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Test Endpoint
                  </>
                )}
              </Button>

              {/* Response */}
              {apiResponse && (
                <div className="space-y-2">
                  <Label>Response</Label>
                  <div
                    className={`p-4 rounded-lg border ${
                      apiStatus === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {apiResponse}
                    </pre>
                  </div>
                </div>
              )}

              {/* Expected Response Example */}
              {apiEndpoints.find((e) => e.id === selectedEndpoint)?.responseExample && (
                <div className="space-y-2">
                  <Label>Expected Response Example</Label>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {apiEndpoints.find((e) => e.id === selectedEndpoint)?.responseExample}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Formatter Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Formatter Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Тестирование функций форматирования чисел из{" "}
            <code className="bg-muted px-1 rounded">@/lib/formatters</code>
          </p>

          {/* formatCurrency examples */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              formatCurrency(value, currency, shorten)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatCurrency(8200000000)</span>
                <span className="font-semibold">{formatCurrency(8200000000)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">
                  formatCurrency(2100000000, "RUB")
                </span>
                <span className="font-semibold">{formatCurrency(2100000000, "RUB")}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">
                  formatCurrency(1475, "RUB", false)
                </span>
                <span className="font-semibold">{formatCurrency(1475, "RUB", false)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatCurrency(214800)</span>
                <span className="font-semibold">{formatCurrency(214800)}</span>
              </div>
            </div>
          </div>

          {/* formatNumber examples */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              formatNumber(value, shorten, decimals)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatNumber(2400000)</span>
                <span className="font-semibold">{formatNumber(2400000)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatNumber(785000)</span>
                <span className="font-semibold">{formatNumber(785000)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatNumber(705500)</span>
                <span className="font-semibold">{formatNumber(705500)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">
                  formatNumber(3.78, false, 2)
                </span>
                <span className="font-semibold">{formatNumber(3.78, false, 2)}</span>
              </div>
            </div>
          </div>

          {/* formatPercent examples */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">formatPercent(value, decimals)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatPercent(42.5)</span>
                <span className="font-semibold">{formatPercent(42.5)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatPercent(2.8)</span>
                <span className="font-semibold">{formatPercent(2.8)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatPercent(18.2)</span>
                <span className="font-semibold">{formatPercent(18.2)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatPercent(1.82, 2)</span>
                <span className="font-semibold">{formatPercent(1.82, 2)}</span>
              </div>
            </div>
          </div>

          {/* formatChange examples */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">formatChange(value, decimals)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatChange(5.2)</span>
                <span className="font-semibold text-green-600">{formatChange(5.2)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatChange(-3.1)</span>
                <span className="font-semibold text-red-600">{formatChange(-3.1)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatChange(12.3)</span>
                <span className="font-semibold text-green-600">{formatChange(12.3)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground">formatChange(-0.08, 2)</span>
                <span className="font-semibold text-red-600">{formatChange(-0.08, 2)}</span>
              </div>
            </div>
          </div>

          {/* formatValue with config examples */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">formatValue(value, config)</Label>
            <p className="text-xs text-muted-foreground">
              Универсальная функция форматирования с конфигурацией из layout.json
            </p>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground text-xs">
                  formatValue(8200000, {"{"} kind: "number", prefixUnitSymbol: "₽", shorten: true{" "}
                  {"}"})
                </span>
                <span className="font-semibold">
                  {formatValue(8200000, {
                    kind: "number",
                    prefixUnitSymbol: "₽",
                    shorten: true,
                    thousandSeparator: true,
                  })}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground text-xs">
                  formatValue(42.5, {"{"} kind: "number", suffixUnitSymbol: "%",
                  maximumFractionDigits: 1 {"}"})
                </span>
                <span className="font-semibold">
                  {formatValue(42.5, {
                    kind: "number",
                    suffixUnitSymbol: "%",
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-muted-foreground text-xs">
                  formatValue(null) → "-"
                </span>
                <span className="font-semibold">{formatValue(null)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Environment</div>
              <div>{import.meta.env.MODE}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Node Version</div>
              <div>Check terminal</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">React Version</div>
              <div>18.3.1</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">TypeScript Version</div>
              <div>5.8.3</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
