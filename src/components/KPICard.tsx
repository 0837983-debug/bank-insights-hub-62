import { Card } from "@/components/ui/card";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  InfoIcon,
  Landmark,
  TrendingUp,
  Percent,
  Activity,
  Wallet,
  Users,
  UserCheck,
  UserMinus,
  RefreshCw,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLayout, useAllKPIs } from "@/hooks/useAPI";
import { formatValue } from "@/lib/formatters";

// Icon mapping for dynamic icon rendering from layout
const iconMap: Record<string, LucideIcon> = {
  Landmark,
  TrendingUp,
  Percent,
  Activity,
  Wallet,
  Users,
  UserCheck,
  UserMinus,
  RefreshCw,
  BarChart3,
};

/**
 * Renders an icon component from a string icon name
 * @param iconName - Name of the icon from layout (e.g., "TrendingUp")
 * @returns React component for the icon or null if not found
 */
function renderIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent className="w-5 h-5" />;
}

interface KPICardProps {
  componentId: string;
}

export const KPICard = ({ componentId }: KPICardProps) => {
  // Получаем layout и kpis из кэша React Query (не делает новые запросы!)
  const { data: layout } = useLayout();
  const { data: kpis } = useAllKPIs();

  // Находим компонент в layout по ID
  const component = layout?.sections
    .flatMap((section) => section.components)
    .find((c) => c.id === componentId && c.type === "card");

  // Находим соответствующий KPI по componentId
  const kpi = kpis?.find((k) => k.id === component?.componentId);

  // Если компонент или KPI не найдены, не рендерим карточку
  if (!component || !kpi) {
    if (import.meta.env.DEV) {
      console.warn(`KPI card not found for componentId: ${componentId}`, {
        componentFound: !!component,
        kpiFound: !!kpi,
        componentId: component?.componentId,
      });
    }
    return null;
  }

  // Получаем formatId из метаданных компонента
  const formatId = component.format?.value;

  // Форматируем значение используя формат из layout.formats
  const formattedValue = formatId
    ? formatValue(formatId, kpi.value)
    : kpi.value.toString();

  const isPositive = kpi.change !== undefined && kpi.change > 0;
  const isYtdPositive = kpi.ytdChange !== undefined && kpi.ytdChange > 0;
  const changeColor = isPositive ? "text-success" : "text-destructive";
  const ytdChangeColor = isYtdPositive ? "text-success" : "text-destructive";

  return (
    <Card className="p-3 hover:shadow-lg transition-shadow min-w-0">
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {component.title}
            </p>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-3 h-3 text-muted-foreground/60 cursor-help flex-shrink-0" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{component.tooltip || ""}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h3 className="text-xl font-bold text-foreground">{formattedValue}</h3>
          {kpi.change !== undefined && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 cursor-help">
                      {isPositive ? (
                        <ArrowUpIcon className={cn("w-3 h-3", changeColor)} />
                      ) : (
                        <ArrowDownIcon className={cn("w-3 h-3", changeColor)} />
                      )}
                      <span className={cn("text-xs font-semibold", changeColor)}>
                        {Math.abs(kpi.change)}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">PPTD — изменение к предыдущему периоду</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {kpi.ytdChange !== undefined && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn("text-xs cursor-help", ytdChangeColor)}>
                        ({isYtdPositive ? "↑" : "↓"}
                        {Math.abs(kpi.ytdChange)}%)
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">YTD — изменение с начала года</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
        {component.icon && (
          <div className="p-2 bg-accent/10 rounded-lg flex-shrink-0">
            {renderIcon(component.icon)}
          </div>
        )}
      </div>
    </Card>
  );
};