import { useState, useCallback, useEffect, useMemo } from "react";
import { useLayout, useAllKPIs, useGetData } from "@/hooks/useAPI";
import { KPICard } from "@/components/KPICard";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { initializeFormats } from "@/lib/formatters";
import { executeCalculation } from "@/lib/calculations";
import {
  FinancialTable,
  type TableRowData,
  type GroupingOption,
} from "@/components/FinancialTable";
import type { LayoutComponent, TableData, FetchKPIsParams, FieldType, CalculationConfig } from "@/lib/api";

// Тип для колонки из layout с поддержкой fieldType
interface LayoutColumn {
  id: string;
  label?: string;
  type?: string;
  format?: string;
  fieldType?: FieldType;
  calculationConfig?: CalculationConfig;
  sub_columns?: LayoutColumn[];
}

// Default hierarchy для обратной совместимости (если columns не передан)
const DEFAULT_HIERARCHY = ["class", "section", "item", "sub_item"];

/**
 * Универсальная функция трансформации данных API в формат FinancialTable с иерархией.
 * 
 * @param apiData - данные от API
 * @param columns - колонки из layout с fieldType
 * @returns массив строк для FinancialTable
 * 
 * Иерархия определяется по fieldType='dimension' колонкам в порядке из layout.
 * Агрегация выполняется по всем fieldType='measure' колонкам.
 * Calculated поля вычисляются через executeCalculation.
 */
export function transformTableData(
  apiData: TableData, 
  columns?: LayoutColumn[]
): TableRowData[] {
  const rows = apiData.rows;
  if (rows.length === 0) return [];

  // Определяем dimension и measure поля из layout columns по fieldType
  // Порядок dimension полей определяет иерархию
  const dimensionFields = columns
    ?.filter(col => col.fieldType === 'dimension')
    .map(col => col.id) || DEFAULT_HIERARCHY;
  
  const measureFields = columns
    ?.filter(col => col.fieldType === 'measure')
    .map(col => col.id) || ["value"];
  
  // Собираем все calculated поля из columns и sub_columns
  const calculatedFields = [
    ...(columns?.filter(c => c.fieldType === 'calculated') || []),
    ...(columns?.flatMap(c => c.sub_columns || []).filter(c => c.fieldType === 'calculated') || [])
  ];
  
  // Собираем dependency поля из calculationConfig всех calculated полей
  // Эти поля нужны для корректного расчёта calculated полей на агрегатах
  const dependencyFields = new Set<string>();
  calculatedFields.forEach(field => {
    const config = field.calculationConfig;
    if (!config) return;
    
    // Добавляем все поля, используемые в calculationConfig
    if (config.current) dependencyFields.add(config.current);
    if (config.base) dependencyFields.add(config.base);
    if (config.minuend) dependencyFields.add(config.minuend);
    if (config.subtrahend) dependencyFields.add(config.subtrahend);
    if (config.numerator) dependencyFields.add(config.numerator);
    if (config.denominator) dependencyFields.add(config.denominator);
  });
  
  // aggregationFields = measureFields ∪ dependencyFields
  // Это все поля, которые нужно агрегировать для корректных calculated полей
  const aggregationFields = [...new Set([...measureFields, ...dependencyFields])];
  
  // Основной measure для процентов
  const primaryMeasure = measureFields[0] || "value";
  const rootTotal = rows.reduce((sum, row) => sum + (Number((row as Record<string, unknown>)[primaryMeasure]) || 0), 0);

  type GroupNode = {
    id: string;
    level: number;
    pathParts: string[];
    parentId?: string;
    order: number;
    measures: Record<string, number>; // Динамические measure поля
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
    
    // Инициализируем все aggregationFields нулями
    // (measureFields + dependencyFields из calculationConfig)
    const measures: Record<string, number> = {};
    aggregationFields.forEach(field => {
      measures[field] = 0;
    });
    
    const group: GroupNode = {
      id,
      level,
      pathParts: [...pathParts],
      parentId,
      order: orderCounter++,
      measures,
    };
    groupMap.set(id, group);
    return group;
  };

  rows.forEach((row) => {
    let parentId: string | undefined;
    const pathParts: string[] = [];
    const rowData = row as Record<string, unknown>;

    // Строим иерархию по dimension полям
    dimensionFields.forEach((field, idx) => {
      const levelValue = rowData[field];
      if (!levelValue) return;
      pathParts.push(String(levelValue));
      const group = getOrCreateGroup(pathParts, idx, parentId);
      parentId = group.id;

      // Агрегируем все aggregationFields (measureFields + dependencyFields)
      aggregationFields.forEach(aggField => {
        const value = Number(rowData[aggField]) || 0;
        group.measures[aggField] += value;
      });
    });

    // Создаём leaf row используя spread для передачи всех полей из API
    const leafRow: TableRowData = {
      ...(row as unknown as TableRowData), // Все поля из API как есть
      id: String(rowData.id || `leaf-${orderCounter}`),
      parentId,
      isGroup: false,
      sortOrder: orderCounter++,
    };
    
    // Вычисляем calculated значения для leaf row
    calculatedFields.forEach(calcField => {
      if (calcField.calculationConfig) {
        (leafRow as Record<string, unknown>)[calcField.id] = executeCalculation(
          calcField.calculationConfig,
          rowData
        );
      }
    });

    addChild(parentId, leafRow);
  });

  const groupRows: TableRowData[] = [];
  groupMap.forEach((group) => {
    // Собираем dimension поля для группы
    const fields: Record<string, string | undefined> = {};
    dimensionFields.forEach((field, idx) => {
      if (idx <= group.level) {
        fields[field] = group.pathParts[idx];
      }
    });

    // Получаем значения measure полей
    const value = group.measures[primaryMeasure] || 0;
    
    // Строим объект с агрегированными measure полями (для отображения в row)
    const measureValues: Record<string, number | undefined> = {};
    measureFields.forEach(field => {
      const val = group.measures[field];
      measureValues[field] = val !== 0 ? val : undefined;
    });
    
    // Все агрегированные значения (включая dependencyFields) для расчётов
    const aggregatedValues: Record<string, number> = { ...group.measures };

    const groupRow: TableRowData = {
      id: group.id,
      ...fields,
      ...measureValues, // Все агрегированные measure поля
      value,
      percentage: rootTotal ? value / rootTotal : undefined,
      parentId: group.parentId,
      isGroup: true,
      sortOrder: group.order,
    };
    
    // Вычисляем calculated значения для group row
    // Используем aggregatedValues (measureFields + dependencyFields)
    calculatedFields.forEach(calcField => {
      if (calcField.calculationConfig) {
        (groupRow as Record<string, unknown>)[calcField.id] = executeCalculation(
          calcField.calculationConfig,
          aggregatedValues
        );
      }
    });

    groupRows.push(groupRow);
    addChild(group.parentId, groupRow);
  });

  const sortChildren = (parentId: string | undefined): TableRowData[] => {
    const children = childrenByParent.get(parentId) ?? [];
    return [...children].sort((a, b) => {
      const aOrder = a.sortOrder ?? 0;
      const bOrder = b.sortOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.id).localeCompare(String(b.id));
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

  // Загружаем данные через getData
  const { 
    data: tableData, 
    isLoading,
    error,
  } = useGetData(
    dataSourceKey || null,
    dates ? {
      p1: dates.periodDate,
      p2: dates.ppDate,
      p3: dates.pyDate,
    } : {},
    { 
      enabled: !!dataSourceKey && !!dates && !!component.componentId,
      componentId: component.componentId,
    }
  );

  // Преобразуем данные из getData в формат TableData
  const transformedData = useMemo(() => {
    if (tableData) {
      return {
        componentId: tableData.componentId,
        type: tableData.type,
        rows: (tableData.rows || []) as TableData["rows"],
      };
    }
    return null;
  }, [tableData]);

  const handleButtonClick = useCallback((buttonId: string | null) => {
    setActiveButtonId(buttonId);
  }, []);

  // Обработка ошибок
  const hasError = error && !transformedData;
  
  if (hasError) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error) || "Unknown error";
    
    // Если нет дат, показываем специальное сообщение
    const missingDatesError = !dates;
    
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

  const tableRows = transformTableData(transformedData, component.columns);

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
  
  // Константа для layout_id (можно вынести в конфиг)
  const DEFAULT_LAYOUT_ID = "main_dashboard";
  
  // Используем header из layout.header (top-level элемент)
  const headerComponent = useMemo(() => {
    if (!layout) return null;
    return layout.header || null;
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
      enabled: !!headerDataSourceKey && !!headerComponent?.componentId,
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

  // Загружаем KPIs через getData с параметрами дат и layout_id
  // Убеждаемся, что все даты присутствуют перед вызовом
  const kpiParams = useMemo(() => {
    if (!dates || !layout) return undefined;
    // Проверяем, что все даты заполнены
    if (!dates.periodDate || !dates.ppDate || !dates.pyDate) {
      console.warn("[DynamicDashboard] Dates incomplete, skipping KPIs:", dates);
      return undefined;
    }
    return {
      layoutId: DEFAULT_LAYOUT_ID,
      p1: dates.periodDate,
      p2: dates.ppDate,
      p3: dates.pyDate,
    };
  }, [dates, layout]);
  
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useAllKPIs(
    kpiParams,
    {
      enabled: !!kpiParams, // Включаем только если есть все параметры
    }
  );

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

  // Рендерим legacy Header только если header компонент не найден в layout (обратная совместимость)
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
        {/* Рендерим header из layout над секциями */}
        {headerComponent && (
          <header className="border-b border-border bg-card sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4">
              <h1 className="text-xl font-bold text-foreground">
                {headerComponent.title || headerComponent.componentId}
              </h1>
            </div>
          </header>
        )}
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
      {/* Рендерим header из layout над секциями */}
      {headerComponent && (
        <header className="border-b border-border bg-card sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <h1 className="text-xl font-bold text-foreground">
              {headerComponent.title || headerComponent.componentId}
            </h1>
            {dates && (
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span data-testid="header-date-periodDate">
                  Период: {dates.periodDate}
                </span>
                <span data-testid="header-date-ppDate">
                  ПП: {dates.ppDate}
                </span>
                <span data-testid="header-date-pyDate">
                  ПГ: {dates.pyDate}
                </span>
              </div>
            )}
          </div>
        </header>
      )}
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
                    <KPICard key={component.id} componentId={component.id} kpis={kpis} />
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
