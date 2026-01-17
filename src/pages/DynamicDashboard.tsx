import { useState, useCallback, useEffect } from "react";
import { useLayout, useAllKPIs, useTableData } from "@/hooks/useAPI";
import { KPICard } from "@/components/KPICard";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { initializeFormats } from "@/lib/formatters";
import {
  FinancialTable,
  type TableRowData,
  type GroupingOption,
} from "@/components/FinancialTable";
import type { LayoutComponent, TableData } from "@/lib/api";

// Helper function to transform API table data to FinancialTable format
// Handles different table structures by detecting name/value fields dynamically
function transformTableData(apiData: TableData): TableRowData[] {
  return apiData.rows.map((row) => {
    // Try to find name field: name > segment > first string field
    const nameValue =
      row.name ??
      (row.segment as string) ??
      (typeof row[Object.keys(row).find((k) => typeof row[k] === "string" && k !== "id") || ""] ===
      "string"
        ? (row[
            Object.keys(row).find((k) => typeof row[k] === "string" && k !== "id") || ""
          ] as string)
        : "");

    // Try to find primary value field: value > transactions > clientCount > volumeRub
    const valueField =
      row.value ??
      (row.transactions as number) ??
      (row.clientCount as number) ??
      (row.volumeRub as number) ??
      0;

    // Try to find change field: change_pptd > transactionsChange > change
    const changeValue =
      row.change_pptd ?? (row.transactionsChange as number) ?? (row.change as number) ?? undefined;

    // Try to find YTD change field: change_ytd > volumeRubChange
    const changeYtdValue = row.change_ytd ?? (row.volumeRubChange as number) ?? undefined;

    return {
      id: row.id,
      name: nameValue,
      value: typeof valueField === "number" ? valueField : 0,
      percentage: row.percentage,
      change: changeValue,
      changeYtd: changeYtdValue,
      description: typeof row.description === "string" ? row.description : undefined,
      isGroup: row.isGroup,
      isTotal: row.isTotal,
      parentId: row.parentId,
    };
  });
}

// Component for rendering a single table from layout
interface DynamicTableProps {
  component: LayoutComponent;
}

function DynamicTable({ component }: DynamicTableProps) {
  const [activeGrouping, setActiveGrouping] = useState<string | null>(null);

  // Generate grouping options from layout component's groupableFields
  const groupingOptions: GroupingOption[] = component.groupableFields
    ? component.groupableFields.map((field) => {
        // Map common field names to readable labels
        const labelMap: Record<string, string> = {
          product_line: "Продуктовая линейка",
          region: "Регион",
          client_type: "Тип клиента",
          cfo: "ЦФО",
          segment: "Сегмент",
        };

        const label =
          labelMap[field] ||
          field
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

        return {
          id: field,
          label,
        };
      })
    : [];

  // Load table data with grouping parameter
  const { data, isLoading, error } = useTableData(component.componentId, {
    groupBy: activeGrouping || undefined,
  });

  const handleGroupingChange = useCallback((groupBy: string | null) => {
    setActiveGrouping(groupBy);
  }, []);

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Ошибка загрузки таблицы</AlertTitle>
        <AlertDescription>
          Не удалось загрузить данные для таблицы "{component.title}"
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="mt-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="text-sm text-muted-foreground mt-4 p-4 border rounded-lg">
        Нет данных для таблицы "{component.title}"
      </div>
    );
  }

  const tableRows = transformTableData(data);

  return (
    <div className="mt-6">
      <FinancialTable
        title={component.title}
        rows={tableRows}
        showPercentage={true}
        showChange={true}
        tableId={component.componentId}
        groupingOptions={groupingOptions.length > 0 ? groupingOptions : undefined}
        activeGrouping={activeGrouping}
        onGroupingChange={handleGroupingChange}
        isLoading={isLoading}
      />
    </div>
  );
}

export default function DynamicDashboard() {
  const { data: layout, isLoading: layoutLoading, error: layoutError } = useLayout();
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useAllKPIs();

  // Initialize formats cache when layout is loaded
  useEffect(() => {
    if (layout && layout.formats) {
      initializeFormats(layout.formats);
    }
  }, [layout]);

  if (layoutError || kpisError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
        <Header />
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
        <Header />
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
        <Header />
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
      <Header />
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
                    component={tableComponent}
                  />
                ))}
            </CollapsibleSection>
          );
        })}
      </main>
    </div>
  );
}
