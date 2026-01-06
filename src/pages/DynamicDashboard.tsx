import { useLayout, useAllKPIs } from "@/hooks/useAPI";
import { KPICard } from "@/components/KPICard";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { formatValue, type FormatConfig } from "@/lib/formatters";

export default function DynamicDashboard() {
  const { data: layout, isLoading: layoutLoading, error: layoutError } = useLayout();
  const { data: kpis, isLoading: kpisLoading, error: kpisError } = useAllKPIs();

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

  // Create KPI lookup map
  const kpiMap = new Map(kpis.map((kpi) => [kpi.id, kpi]));

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
          const cardKPIs = cardComponents
            .map((component) => {
              const kpi = kpiMap.get(component.dataSourceKey);
              return kpi ? { component, kpi } : null;
            })
            .filter(Boolean);

          return (
            <CollapsibleSection key={section.id} title={section.title}>
              {cardKPIs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {cardKPIs.map(({ component, kpi }) => {
                    // Get format config from layout for this component
                    const formatId = component.format?.value;
                    const formatConfig = formatId
                      ? (layout.formats[formatId] as FormatConfig)
                      : undefined;

                    return (
                      <KPICard
                        key={component.id}
                        title={kpi.title}
                        value={formatValue(kpi.value, formatConfig)}
                        description={kpi.description}
                        change={kpi.change}
                        ytdChange={kpi.ytdChange}
                        showChange={true}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4">
                  Нет доступных карточек KPI для отображения в этом разделе.
                </div>
              )}

              {/* Tables would be rendered here */}
              {section.components.some((c) => c.type === "table") && (
                <div className="text-sm text-muted-foreground mt-4">
                  Таблицы будут добавлены в следующей версии
                </div>
              )}
            </CollapsibleSection>
          );
        })}
      </main>
    </div>
  );
}
