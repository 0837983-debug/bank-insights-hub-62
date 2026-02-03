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
  LayoutTemplate,
  Heart,
  Table2,
  PanelTop,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchLayout, type Layout, type LayoutFormat } from "@/lib/api";
import { formatValue, initializeFormats } from "@/lib/formatters";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "checking";
  url?: string;
  message?: string;
}

export default function DevTools() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Frontend (Vite)", status: "checking", url: "http://localhost:8080" },
    { name: "Backend API", status: "checking", url: "http://localhost:3001" },
    { name: "PostgreSQL", status: "checking" },
    { name: "Docs", status: "checking", url: "http://localhost:5173" },
  ]);


  // API quick-test URLs
  const API_BASE = "http://localhost:3001";

  // API quick-test states
  const [apiResponse, setApiResponse] = useState<string>("");
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Data modal states
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [queryIds, setQueryIds] = useState<
    Array<{
      id: string;
      description: string | null;
      config?: { params?: Record<string, unknown>; paramTypes?: Record<string, string> };
    }>
  >([]);
  const [queryIdsLoading, setQueryIdsLoading] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string>("");
  const [dataModalParams, setDataModalParams] = useState<Record<string, string>>({});
  const [dataModalResponse, setDataModalResponse] = useState<string>("");
  const [dataModalStatus, setDataModalStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

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

  // Quick API test handlers
  const runQuickApiTest = async (url: string) => {
    setApiStatus("loading");
    setApiResponse("");
    try {
      const response = await fetch(url);
      const data = await response.json();
      setApiStatus(response.ok ? "success" : "error");
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiStatus("error");
      setApiResponse(error instanceof Error ? error.message : "Unknown error occurred");
    }
  };

  const handleLayoutTest = () =>
    runQuickApiTest(
      `${API_BASE}/api/data?query_id=layout&component_Id=layout&parametrs=${encodeURIComponent('{"layout_id":"main_dashboard"}')}`
    );
  const handleHeaderTest = () =>
    runQuickApiTest(
      `${API_BASE}/api/data?query_id=header_dates&component_Id=header&parametrs=${encodeURIComponent("{}")}`
    );
  const handleHealthTest = () => runQuickApiTest(`${API_BASE}/api/health`);

  // Data modal: open and load query IDs
  const handleOpenDataModal = async () => {
    setDataModalOpen(true);
    setSelectedQueryId("");
    setDataModalParams({});
    setDataModalConfig(null);
    setDataModalResponse("");
    setDataModalStatus("idle");
    setQueryIdsLoading(true);
    setQueryIds([]);
    try {
      const res = await fetch(`${API_BASE}/api/sql-builder/query-ids`);
      if (res.ok) {
        const data = await res.json();
        setQueryIds(data.queryIds || []);
      } else {
        setQueryIds([]);
      }
    } catch {
      setQueryIds([]);
    } finally {
      setQueryIdsLoading(false);
    }
  };

  // Data modal: when query_id selected, get params from config (loaded with query-ids)
  const selectedConfig = queryIds.find((q) => q.id === selectedQueryId)?.config;
  const paramSpecs = (() => {
    const types = selectedConfig?.paramTypes && typeof selectedConfig.paramTypes === "object" ? selectedConfig.paramTypes : null;
    const defs = selectedConfig?.params && typeof selectedConfig.params === "object" ? selectedConfig.params : null;
    const keys = new Set([...(types ? Object.keys(types) : []), ...(defs ? Object.keys(defs) : [])]);
    if (keys.size === 0) return [];
    return Array.from(keys).map((name) => ({
      name,
      type: (types && name in types ? types[name] : "string") as string,
      defaultValue: defs && name in defs ? String(defs[name] ?? "") : "",
    }));
  })();

  useEffect(() => {
    if (!dataModalOpen || !selectedQueryId) {
      setDataModalParams({});
      return;
    }
    const cfg = queryIds.find((q) => q.id === selectedQueryId)?.config;
    const types = cfg?.paramTypes && typeof cfg.paramTypes === "object" ? cfg.paramTypes : null;
    const defs = cfg?.params && typeof cfg.params === "object" ? cfg.params : null;
    const keys = new Set([...(types ? Object.keys(types) : []), ...(defs ? Object.keys(defs) : [])]);
    if (keys.size === 0) {
      setDataModalParams({});
      return;
    }
    const prefill: Record<string, string> = {};
    for (const k of keys) {
      prefill[k] = defs && k in defs ? String(defs[k] ?? "") : "";
    }
    setDataModalParams(prefill);
  }, [dataModalOpen, selectedQueryId, queryIds]);

  // Data modal: run test
  const handleDataModalTest = async () => {
    if (!selectedQueryId) return;
    setDataModalStatus("loading");
    setDataModalResponse("");
    try {
      const parametrs = JSON.stringify(
        Object.fromEntries(Object.entries(dataModalParams).filter(([, v]) => v !== ""))
      );
      const url = `${API_BASE}/api/data?query_id=${encodeURIComponent(selectedQueryId)}&component_Id=${encodeURIComponent(selectedQueryId)}&parametrs=${encodeURIComponent(parametrs)}`;
      const response = await fetch(url);
      const data = await response.json();
      setDataModalStatus(response.ok ? "success" : "error");
      setDataModalResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setDataModalStatus("error");
      setDataModalResponse(error instanceof Error ? error.message : "Unknown error");
    }
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
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLayoutTest}
              disabled={apiStatus === "loading"}
              className="gap-1.5"
            >
              {apiStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LayoutTemplate className="h-4 w-4" />
              )}
              layout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHeaderTest}
              disabled={apiStatus === "loading"}
              className="gap-1.5"
            >
              {apiStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PanelTop className="h-4 w-4" />
              )}
              header
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHealthTest}
              disabled={apiStatus === "loading"}
              className="gap-1.5"
            >
              {apiStatus === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              health
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDataModal}
              className="gap-1.5"
            >
              <Table2 className="h-4 w-4" />
              data
            </Button>
          </div>

          {/* Response */}
          {apiResponse && (
            <div className="space-y-2">
              <Label>Response</Label>
              <div
                className={`p-4 rounded-lg border ${
                  apiStatus === "success"
                    ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                }`}
              >
                <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                  {apiResponse}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data modal */}
      <Dialog open={dataModalOpen} onOpenChange={setDataModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test /api/data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>query_id</Label>
              <select
                value={selectedQueryId}
                onChange={(e) => setSelectedQueryId(e.target.value)}
                disabled={queryIdsLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {queryIdsLoading ? "Загрузка..." : "Выберите query_id"}
                </option>
                {queryIds.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.description ? `${q.id} — ${q.description}` : q.id}
                  </option>
                ))}
              </select>
            </div>

            {selectedQueryId && paramSpecs.length > 0 && (
              <div className="space-y-2">
                <Label>Parameters (paramTypes + params from config)</Label>
                <div className="space-y-2">
                  {paramSpecs.map((p) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <Label className="text-xs w-24 shrink-0" title={p.type}>
                        {p.name}
                      </Label>
                      <Input
                        type={p.type === "date" ? "date" : p.type === "number" ? "number" : "text"}
                        value={dataModalParams[p.name] ?? ""}
                        onChange={(e) =>
                          setDataModalParams((prev) => ({ ...prev, [p.name]: e.target.value }))
                        }
                        placeholder={p.defaultValue || p.name}
                        className="font-mono"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">{p.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleDataModalTest}
              disabled={!selectedQueryId || dataModalStatus === "loading"}
              className="w-full"
            >
              {dataModalStatus === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Test
                </>
              )}
            </Button>

            {dataModalResponse && (
              <div className="space-y-2">
                <Label>Response</Label>
                <div
                  className={`p-4 rounded-lg border max-h-60 overflow-auto ${
                    dataModalStatus === "success"
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  }`}
                >
                  <pre className="text-xs font-mono whitespace-pre-wrap">{dataModalResponse}</pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
