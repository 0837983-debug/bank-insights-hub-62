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
  Trash2,
  Plus,
  Hash,
  Code,
} from "lucide-react";
import { fetchLayout, type Layout, type LayoutFormat } from "@/lib/api";
import { formatValue, initializeFormats } from "@/lib/formatters";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "checking";
  url?: string;
  message?: string;
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
    { name: "Docs", status: "checking", url: "http://localhost:5173" },
  ]);


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
      id: "table-data",
      name: "Get Table Data",
      method: "GET",
      path: "/api/table-data/:tableId",
      description: "Получить данные таблицы с фильтрами",
      pathParams: [{ name: "tableId", example: "assets", description: "ID таблицы" }],
      queryParams: [
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
        { tableId: "assets", columns: [], rows: [] },
        null,
        2
      ),
    },
    {
      id: "data-get",
      name: "Get Data",
      method: "GET",
      path: "/api/data/:query_id",
      description: "Получить данные через SQL Builder по query_id. Параметры передаются отдельными query параметрами",
      pathParams: [{ name: "query_id", example: "assets_table", description: "ID запроса из config.component_queries" }],
      queryParams: [
        {
          name: "component_id",
          example: "assets_table",
          description: "Идентификатор компонента (обязательно для табличных запросов)",
        },
        {
          name: "p1",
          example: "2025-12-31",
          description: "Параметр p1 (дата)",
        },
        {
          name: "p2",
          example: "2025-11-30",
          description: "Параметр p2 (дата)",
        },
        {
          name: "p3",
          example: "2025-12-31",
          description: "Параметр p3 (дата)",
        },
        {
          name: "class",
          example: "assets",
          description: "Класс данных (например: assets)",
        },
      ],
      responseExample: JSON.stringify(
        {
          componentId: "assets_table",
          type: "table",
          rows: [{ class: "assets", value: 1000000 }],
        },
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

  // Format testing states
  const [layout, setLayout] = useState<Layout | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string>("");
  const [testValue, setTestValue] = useState<string>("");
  const [formattedResult, setFormattedResult] = useState<string>("");

  // SQL Builder states
  const [sqlBuilderQueryId, setSqlBuilderQueryId] = useState<string>("");
  const [sqlBuilderParams, setSqlBuilderParams] = useState<string>("");
  const [sqlBuilderResult, setSqlBuilderResult] = useState<{
    sql: string;
    params: unknown[];
    config?: unknown;
  } | null>(null);
  const [sqlBuilderStatus, setSqlBuilderStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sqlBuilderError, setSqlBuilderError] = useState<string>("");

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
      url: "http://localhost:5173",
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

  // Load layout and initialize formats
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const layoutData = await fetchLayout();
        setLayout(layoutData);
        initializeFormats(layoutData.formats);
      } catch (error) {
        console.error("Failed to load layout:", error);
      }
    };
    loadLayout();
  }, []);

  // Format value when format or value changes
  useEffect(() => {
    if (selectedFormatId && testValue !== "") {
      const numValue = parseFloat(testValue);
      if (!isNaN(numValue)) {
        const result = formatValue(selectedFormatId, numValue);
        setFormattedResult(result);
      } else {
        setFormattedResult("");
      }
    } else {
      setFormattedResult("");
    }
  }, [selectedFormatId, testValue]);

  // SQL Builder: Test query
  const handleSqlBuilderTest = async () => {
    if (!sqlBuilderQueryId.trim()) {
      setSqlBuilderError("Query ID is required");
      setSqlBuilderStatus("error");
      return;
    }

    setSqlBuilderStatus("loading");
    setSqlBuilderError("");
    setSqlBuilderResult(null);

    try {
      let params = {};
      if (sqlBuilderParams.trim()) {
        params = JSON.parse(sqlBuilderParams);
      }

      const response = await fetch("http://localhost:3001/api/sql-builder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query_id: sqlBuilderQueryId,
          params: params,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to build SQL query");
      }

      setSqlBuilderResult(data);
      setSqlBuilderStatus("success");
    } catch (error: any) {
      setSqlBuilderError(error.message || "Invalid JSON or config error");
      setSqlBuilderStatus("error");
      setSqlBuilderResult(null);
    }
  };

  // Load example params
  const loadExampleParams = () => {
    const example = {
      p1: "2025-08-01",
      p2: "2025-07-01",
      p3: "2024-08-01",
      class: "assets",
    };
    setSqlBuilderParams(JSON.stringify(example, null, 2));
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


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dev Tools</h1>
        <Badge variant="outline" className="text-sm">
          Development Environment
        </Badge>
      </div>

      {/* Service Status & Quick Links */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Service Status */}
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-3">
                {services.map((service) => {
                  // Извлекаем короткое название сервиса
                  const shortName = service.name
                    .replace("Frontend (Vite)", "Frontend")
                    .replace("Backend API", "Backend");
                  
                  return (
                    <span
                      key={service.name}
                      className={`font-medium ${
                        service.status === "online"
                          ? "text-green-600 dark:text-green-400"
                          : service.status === "offline"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-500"
                      }`}
                    >
                      {shortName}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-3 flex-wrap">
                {resources.map((resource) => {
                  const isExternal = resource.url?.startsWith("http") && !resource.url?.startsWith(window.location.origin);
                  
                  // Сокращаем названия
                  const shortName = resource.name
                    .replace("GitHub Repository", "GitHub")
                    .replace("Frontend (Dev Server)", "Frontend")
                    .replace("Backend API", "API")
                    .replace("API Documentation", "Docs");
                  
                  return (
                    <a
                      key={resource.name}
                      href={resource.url || "#"}
                      target={isExternal ? "_blank" : "_self"}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      onClick={(e) => {
                        if (!resource.url) {
                          e.preventDefault();
                          return;
                        }
                        
                        // Для локальных ссылок - используем нативную навигацию
                        if (!isExternal) {
                          return;
                        }
                        
                        // Для внешних ссылок - пытаемся открыть в новой вкладке
                        e.preventDefault();
                        const newWindow = window.open(resource.url, "_blank", "noopener,noreferrer");
                        
                        // Если window.open заблокирован (как в Cursor браузере), используем fallback
                        if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
                          // Fallback: открываем в текущей вкладке
                          window.location.href = resource.url;
                        }
                      }}
                      className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer no-underline"
                    >
                      {shortName}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
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

      {/* Format Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Format Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Выберите формат</Label>
            <Select
              value={selectedFormatId}
              onValueChange={(value) => {
                setSelectedFormatId(value);
              }}
              disabled={!layout || Object.keys(layout.formats).length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !layout
                      ? "Загрузка форматов..."
                      : Object.keys(layout.formats).length === 0
                        ? "Форматы не найдены"
                        : "Выберите формат для тестирования"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {layout &&
                  Object.keys(layout.formats).map((formatId) => (
                    <SelectItem key={formatId} value={formatId}>
                      {formatId}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            <Label>Введите число для форматирования</Label>
            <Input
              type="number"
              placeholder="Например: 1234567.89"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              disabled={!selectedFormatId}
            />
          </div>

          {/* Formatted Result */}
          {formattedResult && (
            <div className="space-y-2">
              <Label>Результат форматирования</Label>
              <div className="p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 font-mono">
                  {formattedResult}
                </div>
              </div>
            </div>
          )}

          {/* Format Fields Display */}
          {selectedFormatId && layout && layout.formats[selectedFormatId] && (
            <div className="space-y-2">
              <Label>Поля формата "{selectedFormatId}"</Label>
              <div className="p-4 rounded-lg border bg-muted/30">
                <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(layout.formats[selectedFormatId], null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SQL Builder Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            SQL Builder Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query ID Input */}
          <div className="space-y-2">
            <Label>Query ID</Label>
            <Input
              placeholder="Введите query_id (например: assets_table, header_dates)"
              value={sqlBuilderQueryId}
              onChange={(e) => setSqlBuilderQueryId(e.target.value)}
            />
          </div>

          {/* Params Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Parameters (JSON)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadExampleParams}
              >
                Load Example
              </Button>
            </div>
            <Textarea
              placeholder='{"p1": "2025-08-01", "class": "assets"}'
              value={sqlBuilderParams}
              onChange={(e) => setSqlBuilderParams(e.target.value)}
              className="font-mono text-sm min-h-[150px]"
            />
          </div>
          
          <Button
            onClick={handleSqlBuilderTest}
            disabled={sqlBuilderStatus === "loading" || !sqlBuilderQueryId.trim()}
            className="w-full"
          >
            {sqlBuilderStatus === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building SQL...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-4 w-4" />
                Build SQL Query
              </>
            )}
          </Button>

          {/* Error Display */}
          {sqlBuilderStatus === "error" && sqlBuilderError && (
            <div className="p-4 rounded-lg border bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold">Error</span>
              </div>
              <pre className="mt-2 text-sm font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {sqlBuilderError}
              </pre>
            </div>
          )}

          {/* Result Display */}
          {sqlBuilderStatus === "success" && sqlBuilderResult && (
            <div className="space-y-4">
              {/* SQL Result */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Generated SQL
                </Label>
                <div className="p-4 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <pre className="text-sm font-mono text-green-900 dark:text-green-100 whitespace-pre-wrap overflow-x-auto">
                    {sqlBuilderResult.sql}
                  </pre>
                </div>
              </div>

              {/* Parameters */}
              <div className="space-y-2">
                <Label>Parameters (in order of use)</Label>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(sqlBuilderResult.params, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Formatted SQL */}
              <div className="space-y-2">
                <Label>Formatted SQL</Label>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    {sqlBuilderResult.sql
                      .replace(/SELECT /g, "SELECT\n  ")
                      .replace(/FROM /g, "\nFROM ")
                      .replace(/WHERE /g, "\nWHERE ")
                      .replace(/GROUP BY /g, "\nGROUP BY ")
                      .replace(/ORDER BY /g, "\nORDER BY ")
                      .replace(/LIMIT /g, "\nLIMIT ")
                      .replace(/OFFSET /g, "\nOFFSET ")
                      .replace(/,/g, ",\n  ")}
                  </pre>
                </div>
              </div>

              {/* JSON Config */}
              {sqlBuilderResult.config && (
                <div className="space-y-2">
                  <Label>JSON Config</Label>
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(sqlBuilderResult.config, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
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
