import { useState, useCallback, useEffect, useMemo } from "react";
import { useLayout, useAllKPIs, useTableData, useGetData } from "@/hooks/useAPI";
import { KPICard } from "@/components/KPICard";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { initializeFormats } from "@/lib/formatters";
import {
  FinancialTable,
  type TableRowData,
  type GroupingOption,
} from "@/components/FinancialTable";
import type { LayoutComponent, TableData } from "@/lib/api";

// Helper function to transform API table data to FinancialTable format with hierarchy
// Все текстовые поля до value - это иерархия (class, section, item, sub_item)
// Поля от value - это числовые значения (value, percentage, ppChange, ytdChange)
function transformTableData(apiData: TableData): TableRowData[] {
  const rows = apiData.rows;
  const hierarchyLevels = ["class", "section", "item", "sub_item"] as const;
  const rootTotal = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);

  type GroupNode = {
    id: string;
    level: number;
    pathParts: string[];
    parentId?: string;
    order: number;
    value: number;
    previousValue: number;
    ytdValue: number;
  };

  let orderCounter = 0;
  const groupMap = new Map<string, GroupNode>();
  const childrenByParent = new Map<string | undefined, TableRowData[]>();

  const addChild = (parentId: string | undefined, row: TableRowData) => {
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId)!.push(row);
  };

  const getOrCreateGroup = (
    pathParts: string[],
    level: number,
    parentId: string | undefined
  ): GroupNode => {
    const id = pathParts.join("::");
    const existing = groupMap.get(id);
    if (existing) return existing;
    const group: GroupNode = {
      id,
      level,
      pathParts: [...pathParts],
      parentId,
      order: orderCounter++,
      value: 0,
      previousValue: 0,
      ytdValue: 0,
    };
    groupMap.set(id, group);
    return group;
  };

  rows.forEach((row) => {
    let parentId: string | undefined;
    const pathParts: string[] = [];

    hierarchyLevels.forEach((level, idx) => {
      const levelValue = row[level];
      if (!levelValue) return;
      pathParts.push(String(levelValue));
      const group = getOrCreateGroup(pathParts, idx, parentId);
      parentId = group.id;

      group.value += row.value ?? 0;
      group.previousValue += row.previousValue ?? 0;
      group.ytdValue += row.ytdValue ?? 0;
    });

    const leafRow: TableRowData = {
      class: row.class,
      section: row.section,
      item: row.item,
      sub_item: row.sub_item,
      value: row.value,
      percentage: row.percentage,
      previousValue: row.previousValue,
      ytdValue: row.ytdValue,
      ppChange: row.ppChange,
      ppChangeAbsolute: row.ppChangeAbsolute,
      ytdChange: row.ytdChange,
      ytdChangeAbsolute: row.ytdChangeAbsolute,
      client_type: row.client_type,
      client_segment: row.client_segment,
      product_code: row.product_code,
      portfolio_code: row.portfolio_code,
      currency_code: row.currency_code,
      id: row.id,
      period_date: row.period_date,
      description:
        typeof row.description === "string" ? row.description : undefined,
      parentId,
      isGroup: false,
      sortOrder: orderCounter++,
    };

    addChild(parentId, leafRow);
  });

  const groupRows: TableRowData[] = [];
  groupMap.forEach((group) => {
    const fields: Record<string, string | undefined> = {};
    hierarchyLevels.forEach((level, idx) => {
      if (idx <= group.level) {
        fields[level] = group.pathParts[idx];
      }
    });

    const value = group.value;
    const previousValue =
      group.previousValue !== 0 ? group.previousValue : undefined;
    const ytdValue = group.ytdValue !== 0 ? group.ytdValue : undefined;
    const ppChange =
      previousValue !== undefined && previousValue !== 0
        ? (value - previousValue) / previousValue
        : undefined;
    const ytdChange =
      ytdValue !== undefined && ytdValue !== 0
        ? (value - ytdValue) / ytdValue
        : undefined;

    const groupRow: TableRowData = {
      id: group.id,
      ...fields,
      value,
      previousValue,
      ytdValue,
      percentage: rootTotal ? value / rootTotal : undefined,
      ppChange,
      ppChangeAbsolute:
        previousValue !== undefined ? value - previousValue : undefined,
      ytdChange,
      ytdChangeAbsolute:
        ytdValue !== undefined ? value - ytdValue : undefined,
      parentId: group.parentId,
      isGroup: true,
      sortOrder: group.order,
    };

    groupRows.push(groupRow);
    addChild(group.parentId, groupRow);
  });

  const sortChildren = (parentId: string | undefined): TableRowData[] => {
    const children = childrenByParent.get(parentId) ?? [];
    return [...children].sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.id.localeCompare(b.id);
    });
  };

  const result: TableRowData[] = [];
  const walk = (parentId: string | undefined) => {
    const children = sortChildren(parentId);
    children.forEach((child) => {
      result.push(child);
      if (child.isGroup) {
        walk(child.id);
      }
    });
  };

  walk(undefined);
  return result;
}

// Component for rendering a single table from layout
interface DynamicTableProps {
  component: LayoutComponent;
}

function DynamicTable({ component }: DynamicTableProps) {
  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);

  // Получаем кнопки из layout компонента
  const buttons = component.buttons || [];

  // Определяем активную кнопку
  const activeButton = activeButtonId
    ? buttons.find((btn) => btn.id === activeButtonId)
    : null;

  // Определяем data_source_key для загрузки данных:
  // 1. Если есть активная кнопка - используем её data_source_key
  // 2. Иначе используем data_source_key таблицы
  const dataSourceKey = activeButton?.dataSourceKey || component.dataSourceKey;

  // Получаем dates из контекста родительского компонента
  const dates = (component as any).dates; // TODO: типизировать через props

  // Загружаем данные через getData, если есть data_source_key
  const { 
    data: tableDataFromGetData, 
    isLoading: isLoadingGetData,
    error: getDataError,
  } = useGetData(
    dataSourceKey || null,
    dates ? {
      p1: dates.periodDate,
      p2: dates.ppDate,
      p3: dates.pyDate,
    } : {},
    { 
      enabled: !!dataSourceKey && !!dates, // Включаем только если есть dates
      componentId: component.componentId,
    }
  );

  // Fallback на старый endpoint, если нет data_source_key
  const { data: tableDataFromLegacy, isLoading: isLoadingLegacy, error } = useTableData(
    component.componentId,
    {
      periodDate: dates?.periodDate,
    },
    { enabled: !dataSourceKey }
  );

  // Используем данные из getData или из legacy endpoint
  const isLoading = dataSourceKey ? isLoadingGetData : isLoadingLegacy;

  // Преобразуем данные из getData в формат TableData, если нужно
  const transformedData = useMemo(() => {
    if (dataSourceKey && tableDataFromGetData) {
      // Данные из getData приходят в формате { componentId, type, rows }
      // Используем напрямую, так как формат уже соответствует TableData
      return {
        componentId: tableDataFromGetData.componentId,
        type: tableDataFromGetData.type,
        rows: (tableDataFromGetData.rows || []) as TableData["rows"],
      };
    }
    
    return tableDataFromLegacy;
  }, [dataSourceKey, tableDataFromGetData, tableDataFromLegacy]);

  const handleButtonClick = useCallback((buttonId: string | null) => {
    setActiveButtonId(buttonId);
  }, []);

  // Обработка ошибок
  const currentError = dataSourceKey ? getDataError : error;
  const hasError = currentError && !transformedData;
  
  if (hasError) {
    const errorMessage = currentError instanceof Error 
      ? currentError.message 
      : String(currentError) || "Unknown error";
    
    // Если нет дат, показываем специальное сообщение
    const missingDatesError = dataSourceKey && !dates;
    
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка загрузки таблицы</AlertTitle>
        <AlertDescription>
          {missingDatesError ? (
            <>
              Не удалось загрузить даты из header. Таблица "{component.title}" не может загрузить данные без параметров дат.
              <div className="mt-2 text-xs font-mono">
                Data source: {dataSourceKey}, Dates: {dates ? "loaded" : "not loaded"}
              </div>
            </>
          ) : (
            <>
              Не удалось загрузить данные для таблицы "{component.title}" (componentId: {component.componentId})
              {errorMessage && <div className="mt-2 text-xs font-mono">{errorMessage}</div>}
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading && !transformedData) {
    return (
      <div className="mt-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!transformedData || !transformedData.rows || transformedData.rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-4 p-4 border rounded-lg">
        Нет данных для таблицы "{component.title}"
      </div>
    );
  }

  const tableRows = transformTableData(transformedData);

  return (
    <div className="mt-6">
      <FinancialTable
        title={component.title}
        rows={tableRows}
        showPercentage={true}
        showChange={true}
        tableId={component.componentId}
        componentId={component.componentId}
        buttons={buttons.length > 0 ? buttons : undefined}
        activeButtonId={activeButtonId}
        onButtonClick={handleButtonClick}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function DynamicDashboard() {
  const { data: layout, isLoading: layoutLoading, error: layoutError } = useLayout();
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useAllKPIs();

  // Находим header компонент в layout
  const headerComponent = useMemo(() => {
    if (!layout) return null;
    // Ищем header компонент во всех секциях
    for (const section of layout.sections) {
      const header = section.components.find((c) => c.type === "header");
      if (header) return header;
    }
    return null;
  }, [layout]);

  // Получаем data_source_key для header (используем componentId, если data_source_key не задан)
  const headerDataSourceKey = useMemo(() => {
    if (!headerComponent) return null;
    return headerComponent.dataSourceKey || "header_dates"; // fallback на header_dates
  }, [headerComponent]);

  // Загружаем даты через getData
  const { 
    data: headerData, 
    isLoading: headerDataLoading, 
    error: headerDataError 
  } = useGetData(
    headerDataSourceKey,
    {},
    { 
      enabled: !!headerDataSourceKey,
      componentId: headerComponent?.componentId,
    }
  );

  // Логирование ошибок загрузки дат
  useEffect(() => {
    if (headerDataError) {
      console.error("[DynamicDashboard] Error loading header dates:", headerDataError);
    }
  }, [headerDataError]);

  // Извлекаем даты из ответа getData
  // Новый формат: { componentId, type, rows }
  const dates = useMemo(() => {
    if (!headerData?.rows || !Array.isArray(headerData.rows) || headerData.rows.length === 0) {
      console.warn("[DynamicDashboard] Header data is empty or invalid:", headerData);
      return null;
    }
    // Предполагаем, что данные приходят в формате [{ periodDate, ppDate, pyDate }]
    const firstRow = headerData.rows[0] as Record<string, string>;
    const extractedDates = {
      periodDate: firstRow.periodDate || firstRow.period_date || firstRow.p1,
      ppDate: firstRow.ppDate || firstRow.pp_date || firstRow.p2,
      pyDate: firstRow.pyDate || firstRow.py_date || firstRow.p3,
    };
    
    // Логирование для проверки
    console.log("[DynamicDashboard] Extracted dates from header:", {
      headerData,
      firstRow,
      extractedDates,
    });
    
    // Проверяем, что все даты извлечены
    if (!extractedDates.periodDate || !extractedDates.ppDate || !extractedDates.pyDate) {
      console.warn("[DynamicDashboard] Missing dates in header data:", {
        extractedDates,
        firstRow,
      });
    }
    
    return extractedDates;
  }, [headerData]);

  // Initialize formats cache when layout is loaded
  useEffect(() => {
    if (layout && layout.formats) {
      initializeFormats(layout.formats);
    }
  }, [layout]);

  // Логирование data_source_key для всех компонентов (для отладки)
  useEffect(() => {
    if (layout) {
      const componentsWithDataSource = layout.sections.flatMap((section) =>
        section.components
          .filter((c) => c.dataSourceKey)
          .map((c) => ({
            type: c.type,
            componentId: c.componentId,
            dataSourceKey: c.dataSourceKey,
          }))
      );
      if (componentsWithDataSource.length > 0) {
        console.log("[DynamicDashboard] Components with data_source_key:", componentsWithDataSource);
      }
    }
  }, [layout]);

  // Рендерим Header только если header компонент не найден в layout (обратная совместимость)
  const shouldRenderLegacyHeader = !headerComponent;

  if (layoutError || kpisError) {
    return (
      <div className="min-h-screen bg-background">
        {shouldRenderLegacyHeader && <Header />}
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка загрузки данных</AlertTitle>
            <AlertDescription>
              {layoutError
                ? `Не удалось загрузить layout: ${layoutError instanceof Error ? layoutError.message : "Unknown error"}`
                : `Не удалось загрузить KPI: ${kpisError instanceof Error ? kpisError.message : "Unknown error"}`}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (layoutLoading || kpisLoading) {
    return (
      <div className="min-h-screen bg-background">
        {shouldRenderLegacyHeader && <Header />}
        <div className="container mx-auto p-6 space-y-8">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!layout || !kpis) {
    return (
      <div className="min-h-screen bg-background">
        {shouldRenderLegacyHeader && <Header />}
        <div className="container mx-auto p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Нет данных</AlertTitle>
            <AlertDescription>Не удалось загрузить данные для отображения.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Filter out sections with no components
  const sectionsWithContent = layout.sections.filter(
    (section) => section.components && section.components.length > 0
  );

  if (sectionsWithContent.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        {shouldRenderLegacyHeader && <Header />}
        <main className="container mx-auto px-6 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Нет разделов для отображения</AlertTitle>
            <AlertDescription>
              В layout нет разделов с компонентами для отображения.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {shouldRenderLegacyHeader && <Header />}
      <main className="container mx-auto px-6 py-8 space-y-12">
        {sectionsWithContent.map((section) => {
          const cardComponents = section.components.filter(
            (component) => component.type === "card"
          );

          return (
            <CollapsibleSection key={section.id} title={section.title}>
              {cardComponents.length > 0 ? (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${cardComponents.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                  {cardComponents.map((component) => (
                    <KPICard key={component.id} componentId={component.id} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4">
                  Нет доступных карточек KPI для отображения в этом разделе.
                </div>
              )}

              {/* Render tables from layout */}
              {section.components
                .filter((c) => c.type === "table")
                .map((tableComponent) => (
                  <DynamicTable
                    key={tableComponent.id}
                    component={{ ...tableComponent, dates } as LayoutComponent & { dates: typeof dates }}
                  />
                ))}
            </CollapsibleSection>
          );
        })}
      </main>
    </div>
  );
}
