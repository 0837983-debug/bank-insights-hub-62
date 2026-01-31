/**
 * API Client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// API Error class
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

// Generic fetch wrapper with error handling
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // Обработка сетевых ошибок (ERR_CONNECTION_REFUSED и т.д.)
    if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("Failed to fetch"))) {
      throw new APIError(
        `Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен на ${API_BASE_URL}`,
        0,
        { originalError: error.message }
      );
    }
    throw new APIError(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

// ============================================================================
// Layout API
// ============================================================================

export interface LayoutFormat {
  kind: string;
  pattern?: string;
  prefixUnitSymbol?: string;
  suffixUnitSymbol?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  thousandSeparator?: boolean;
  multiplier?: number;
  shorten?: boolean;
}

export interface LayoutFilter {
  group: string;
  items: Array<{
    id: string;
    label: string;
    type: string;
    params?: Record<string, unknown>;
  }>;
}

export interface LayoutComponent {
  id: string; // уникальный идентификатор экземпляра (SERIAL из layout_component_mapping)
  componentId: string; // идентификатор компонента для связи с данными (KPIs API, table-data API)
  type: "card" | "table" | "chart" | "header" | "button";
  title: string;
  tooltip?: string;
  icon?: string;
  format?: Record<string, string>;
  compactDisplay?: boolean;
  dataSourceKey?: string; // ключ источника данных (query_id для getData)
  columns?: Array<{
    id: string;
    label: string;
    type: string;
    format?: string; // formatId для основного поля
    description?: string;
    isDimension?: boolean;
    isMeasure?: boolean;
    sub_columns?: Array<{
      id: string;
      label: string;
      type: string;
      format?: string; // formatId для sub_column
      description?: string;
    }>;
  }>;
  groupableFields?: string[]; // Deprecated: используйте buttons вместо этого
  buttons?: LayoutComponent[]; // Дочерние кнопки-компоненты
}

export interface LayoutSection {
  id: string;
  title: string;
  components: LayoutComponent[];
}

export interface Layout {
  formats: Record<string, LayoutFormat>;
  filters?: LayoutFilter[];
  header?: LayoutComponent; // Header как top-level элемент
  sections: LayoutSection[];
}

// Константа для layout_id (можно вынести в конфиг)
const DEFAULT_LAYOUT_ID = "main_dashboard";

/**
 * Интерфейс для ответа нового endpoint /api/data?query_id=layout
 */
interface LayoutDataResponse {
  sections: Array<{
    id: string;
    title: string;
    formats?: Record<string, LayoutFormat>;
    components?: LayoutComponent[];
  }>;
}

/**
 * Загружает layout через новый endpoint /api/data
 * Преобразует новый формат { sections: [...] } в старый формат { formats, header, sections }
 * 
 * @param layoutId - ID layout или объект контекста от React Query (будет проигнорирован)
 */
export async function fetchLayout(layoutId?: string | unknown): Promise<Layout> {
  // React Query может передать объект контекста вместо строки, поэтому проверяем тип
  let targetLayoutId: string = DEFAULT_LAYOUT_ID;
  if (typeof layoutId === "string" && layoutId.trim() !== "") {
    targetLayoutId = layoutId;
  }
  
  // Формируем параметры для запроса - всегда передаем layout_id как строку
  const paramsObject = { layout_id: targetLayoutId };
  const paramsJson = JSON.stringify(paramsObject);
  
  // Формируем endpoint с query параметрами вручную, используя encodeURIComponent
  // Важно: каждый параметр кодируется отдельно для безопасности
  const queryParts: string[] = [];
  queryParts.push(`query_id=${encodeURIComponent("layout")}`);
  queryParts.push(`component_Id=${encodeURIComponent("layout")}`);
  queryParts.push(`parametrs=${encodeURIComponent(paramsJson)}`);
  
  const endpoint = `/data?${queryParts.join("&")}`;
  
  // Вызываем apiFetch напрямую, так как формат ответа для layout отличается от стандартного getData
  const response = await apiFetch<LayoutDataResponse>(endpoint);
  
  // Извлекаем formats из секции id="formats"
  const formatsSection = response.sections.find((s) => s.id === "formats");
  const formats = formatsSection?.formats || {};
  
  // Извлекаем header из секции id="header" и берем components[0]
  const headerSection = response.sections.find((s) => s.id === "header");
  const header = headerSection?.components?.[0];
  
  // Фильтруем sections, исключая formats и header
  const contentSections = response.sections.filter(
    (s) => s.id !== "formats" && s.id !== "header"
  );
  
  // Формируем итоговый объект Layout в старом формате
  return {
    formats,
    header,
    sections: contentSections.map((s) => ({
      id: s.id,
      title: s.title,
      components: s.components || [],
    })),
  };
}

// ============================================================================
// KPI API
// ============================================================================

export interface KPIMetric {
  id: string;
  value: number;
  change?: number; // Deprecated: используйте ppChange
  previousValue?: number; // Значение за предыдущий период
  ytdValue?: number; // Значение за аналогичный период прошлого года
  ppChange?: number; // Изменение к предыдущему периоду (в долях)
  ppChangeAbsolute?: number; // Абсолютное изменение к предыдущему периоду
  ytdChange?: number; // Изменение YTD (в долях)
  ytdChangeAbsolute?: number; // Абсолютное изменение YTD
}

/**
 * Интерфейс для параметров загрузки KPIs
 */
export interface FetchKPIsParams {
  layoutId?: string;
  p1?: string; // periodDate
  p2?: string; // ppDate
  p3?: string; // pyDate
}

/**
 * Загружает все KPI метрики через новый endpoint /api/data
 * @param params - Параметры запроса (layout_id, даты)
 */
export async function fetchAllKPIs(params?: FetchKPIsParams): Promise<KPIMetric[]> {
  const layoutId = params?.layoutId || DEFAULT_LAYOUT_ID;
  
  // Формируем параметры для запроса
  const paramsObject: Record<string, string> = {
    layout_id: layoutId,
  };
  
  // Добавляем даты, если они переданы (не undefined и не пустая строка)
  if (params?.p1 && params.p1.trim() !== "") {
    paramsObject.p1 = params.p1;
  }
  if (params?.p2 && params.p2.trim() !== "") {
    paramsObject.p2 = params.p2;
  }
  if (params?.p3 && params.p3.trim() !== "") {
    paramsObject.p3 = params.p3;
  }
  
  const paramsJson = JSON.stringify(paramsObject);
  
  // Логирование для отладки
  console.log("[fetchAllKPIs] Request params:", {
    params,
    paramsObject,
    paramsJson,
  });
  
  // Формируем endpoint с query параметрами
  const queryParts: string[] = [];
  queryParts.push(`query_id=${encodeURIComponent("kpis")}`);
  queryParts.push(`component_Id=${encodeURIComponent("kpis")}`);
  queryParts.push(`parametrs=${encodeURIComponent(paramsJson)}`);
  
  const endpoint = `/data?${queryParts.join("&")}`;
  
  console.log("[fetchAllKPIs] Endpoint:", endpoint);
  
  // Backend для kpis возвращает массив KPIMetric[] напрямую (не GetDataResponse)
  // Это специальная обработка в dataRoutes.ts для query_id === "kpis"
  const response = await apiFetch<KPIMetric[] | GetDataResponse>(endpoint);
  
  // Проверяем формат ответа
  if (Array.isArray(response)) {
    // Если это массив - значит это уже KPIMetric[] (формат для kpis)
    console.log("[fetchAllKPIs] Received KPIMetric[] directly:", response);
    return response;
  }
  
  // Если это GetDataResponse - извлекаем rows
  if (response && typeof response === "object" && "rows" in response) {
    const dataResponse = response as GetDataResponse;
    if (dataResponse.rows && Array.isArray(dataResponse.rows)) {
      console.log("[fetchAllKPIs] Extracted from GetDataResponse:", dataResponse.rows);
      return dataResponse.rows as KPIMetric[];
    }
  }
  
  console.warn("[fetchAllKPIs] Unexpected response format:", response);
  return [];
}

// ============================================================================
// Table Data API
// ============================================================================

export interface TableRow {
  // Поля из mart.balance (основные)
  class?: string;
  section?: string;
  item?: string;
  sub_item?: string;
  value?: number;
  // Расчетные поля
  percentage?: number;
  previousValue?: number;
  ytdValue?: number;
  ppChange?: number; // в долях
  ppChangeAbsolute?: number;
  ytdChange?: number; // в долях
  ytdChangeAbsolute?: number;
  // Поля из mart.balance (аналитика)
  client_type?: string;
  client_segment?: string;
  product_code?: string;
  portfolio_code?: string;
  currency_code?: string;
  // Служебные поля
  id: string;
  period_date?: string;
  description?: string;
  [key: string]: unknown;
}

export interface TableData {
  componentId: string;
  type: "table";
  rows: TableRow[];
  requestedPeriod?: string;
  groupBy?: string[];
}

export async function fetchTableData(
  tableId: string,
  params?: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: string | string[];
  }
): Promise<TableData> {
  const queryParams = new URLSearchParams();

  if (params?.dateFrom) queryParams.append("dateFrom", params.dateFrom);
  if (params?.dateTo) queryParams.append("dateTo", params.dateTo);
  if (params?.groupBy) {
    if (Array.isArray(params.groupBy)) {
      params.groupBy.forEach((g) => queryParams.append("groupBy", g));
    } else {
      queryParams.append("groupBy", params.groupBy);
    }
  }

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/table-data/${tableId}?${queryString}` : `/table-data/${tableId}`;

  return apiFetch<TableData>(endpoint);
}

export interface GroupingOption {
  id: string;
  label: string;
}

// ============================================================================
// Health Check
// ============================================================================

export interface HealthStatus {
  status: string;
  message: string;
}

export async function fetchHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/health");
}

// ============================================================================
// Upload API
// ============================================================================

export interface UploadResponse {
  uploadId: number;
  status: "pending" | "processing" | "completed" | "failed" | "rolled_back";
  validationErrors?: AggregatedValidationError[]; // Бэкенд возвращает агрегированные ошибки
  rowsProcessed?: number;
  rowsSuccessful?: number;
  rowsFailed?: number;
  duplicatePeriodsWarning?: string;
  error?: string; // Общее сообщение об ошибке (если есть)
}

export interface ValidationError {
  fieldName: string;
  errorType: string;
  errorMessage: string;
  exampleRow?: number;
}

export interface AggregatedValidationError {
  fieldName?: string;
  errorType: string;
  errorMessage: string;
  exampleMessages?: string[];  // для обратной совместимости
  rowNumbers?: number[];       // Новое: первые 5 строк с ошибкой
  sampleValue?: string;        // Новое: пример значения
  totalAffected?: number;      // Новое: всего ошибок этого типа
  totalCount: number;          // Оставляем для совместимости
}

export interface UploadStatus {
  id: number;
  filename: string;
  originalFilename: string;
  fileType: string;
  targetTable: string;
  status: "pending" | "processing" | "completed" | "failed" | "rolled_back";
  rowsProcessed: number | null;
  rowsSuccessful: number | null;
  rowsFailed: number | null;
  validationErrors: AggregatedValidationError[] | null;
  createdAt: string;
  updatedAt: string;
  rolledBackAt: string | null;
  rolledBackBy: string | null;
}

export interface UploadSheets {
  uploadId: number;
  availableSheets: string[];
  currentSheet: string | null;
}

export interface UploadHistoryResponse {
  uploads: UploadStatus[]; // Включаем validationErrors для отображения деталей ошибок
  total: number;
}

/**
 * Загружает файл на сервер
 * @param file - Файл для загрузки
 * @param targetTable - Целевая таблица (например, "balance")
 * @param sheetName - Имя листа для XLSX (опционально)
 * @returns Информация о загрузке
 */
export async function uploadFile(
  file: File,
  targetTable: string,
  sheetName?: string,
  sessionId?: string
): Promise<UploadResponse> {
  // Проверка размера файла
  if (file.size === 0) {
    throw new APIError("Файл пустой. Размер файла: 0 байт");
  }

  // Логирование перед отправкой
  console.log("Uploading file:", {
    name: file.name,
    size: file.size,
    type: file.type,
    targetTable,
    sheetName,
    sessionId,
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("targetTable", targetTable);
  // Явно передаём имя файла для правильной обработки кириллицы на сервере
  // Используем encodeURIComponent для правильной кодировки, но сервер должен декодировать
  formData.append("originalFilename", file.name);
  if (sheetName) {
    formData.append("sheetName", sheetName);
  }
  // Передаём sessionId для отслеживания прогресса через SSE
  if (sessionId) {
    formData.append("sessionId", sessionId);
  }

  const url = `${API_BASE_URL}/upload`;
  
  try {
    // ВАЖНО: НЕ устанавливаем Content-Type вручную для FormData
    // Браузер должен установить автоматически с boundary
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      cache: "no-store",
      // НЕ добавляем headers здесь - браузер установит Content-Type автоматически
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Если в ответе есть validationErrors и uploadId, возвращаем их как часть ответа
      // Это позволяет обработать ошибки валидации как обычный ответ, а не как исключение
      if (errorData.validationErrors && Array.isArray(errorData.validationErrors) && errorData.uploadId) {
        // Возвращаем ответ с ошибками валидации, чтобы компонент мог их обработать
        return {
          uploadId: errorData.uploadId,
          status: errorData.status || "failed",
          validationErrors: errorData.validationErrors,
          rowsProcessed: errorData.rowsProcessed,
          rowsSuccessful: errorData.rowsSuccessful || 0,
          rowsFailed: errorData.rowsFailed || 0,
        } as UploadResponse;
      }
      
      // Для других ошибок бросаем исключение
      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

/**
 * Получает статус загрузки по ID
 * @param uploadId - ID загрузки
 * @returns Статус загрузки
 */
export async function getUploadStatus(uploadId: number): Promise<UploadStatus> {
  return apiFetch<UploadStatus>(`/upload/${uploadId}`);
}

/**
 * Получает список листов для XLSX файла
 * @param uploadId - ID загрузки
 * @returns Список доступных листов
 */
export async function getUploadSheets(uploadId: number): Promise<UploadSheets> {
  return apiFetch<UploadSheets>(`/upload/${uploadId}/sheets`);
}

/**
 * Откатывает загрузку
 * @param uploadId - ID загрузки
 * @param rolledBackBy - Кто откатил (опционально)
 * @returns Результат отката
 */
export async function rollbackUpload(
  uploadId: number,
  rolledBackBy?: string
): Promise<{ uploadId: number; status: string; message: string }> {
  const body = rolledBackBy ? { rolledBackBy } : {};
  
  const url = `${API_BASE_URL}/upload/${uploadId}/rollback`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error instanceof Error ? error.message : "Unknown error occurred");
  }
}

/**
 * Получает историю загрузок
 * @param params - Параметры фильтрации
 * @returns История загрузок
 */
export async function getUploadHistory(params?: {
  targetTable?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<UploadHistoryResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.targetTable) queryParams.append("targetTable", params.targetTable);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.offset) queryParams.append("offset", String(params.offset));

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/upload?${queryString}` : "/upload";

  return apiFetch<UploadHistoryResponse>(endpoint);
}

// ============================================================================
// GetData API (unified data endpoint)
// ============================================================================

export interface GetDataParams {
  [key: string]: string | number | boolean | Date;
}

export interface GetDataResponse {
  componentId: string;
  type: "table" | "card" | "chart";
  rows: unknown[];
}

/**
 * Получает данные через единый endpoint getData
 * @param queryId - ID запроса (data_source_key, передается как query_id)
 * @param params - Параметры запроса (преобразуются в JSON-строку parametrs)
 * @param componentId - ID компонента (обязательно, передается как component_Id)
 * @returns Данные в формате { componentId, type, rows }
 */
export async function getData(
  queryId: string,
  params: GetDataParams = {},
  componentId?: string
): Promise<GetDataResponse> {
  // Валидация: componentId обязателен
  if (!componentId) {
    throw new APIError("componentId is required for getData");
  }

  // Формируем endpoint без API_BASE_URL, так как apiFetch добавит его сам
  const endpoint = `/data`;
  
  // Преобразуем Date в строку для JSON
  const serializedParams: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value instanceof Date) {
      serializedParams[key] = value.toISOString().split('T')[0]; // YYYY-MM-DD
    } else {
      serializedParams[key] = value;
    }
  }

  // Преобразуем params в JSON-строку для parametrs
  const parametrsJson = JSON.stringify(serializedParams);

  const queryParams = new URLSearchParams();
  
  // Добавляем обязательные параметры согласно контракту Backend
  queryParams.append("query_id", queryId);
  queryParams.append("component_Id", componentId);
  
  // Добавляем parametrs как JSON-строку (только если есть параметры)
  if (Object.keys(serializedParams).length > 0) {
    queryParams.append("parametrs", parametrsJson);
  }

  const queryString = queryParams.toString();
  const finalEndpoint = `${endpoint}?${queryString}`;

  return apiFetch<GetDataResponse>(finalEndpoint);
}
