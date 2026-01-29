import { useState } from "react";
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
import { calculatePercentChange } from "@/lib/calculations";
import type { KPIMetric } from "@/lib/api";

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
  kpis?: KPIMetric[];
}

export const KPICard = ({ componentId, kpis: kpisFromProps }: KPICardProps) => {
  // Состояние для переключения между процентными и абсолютными изменениями
  const [showAbsolute, setShowAbsolute] = useState(false);

  // Получаем layout из кэша React Query
  const { data: layout } = useLayout();
  
  // Используем kpis из props, если переданы, иначе пытаемся получить из кэша
  const { data: kpisFromCache } = useAllKPIs(undefined, { enabled: false });
  const kpis = kpisFromProps || kpisFromCache;

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

  // Получаем формат для основного значения (value) из columns
  const valueColumn = component.columns?.[0] as any;
  // format может быть строкой в columns или объектом в старом формате component.format
  const valueFormatId = typeof valueColumn?.format === "string" 
    ? valueColumn.format 
    : (valueColumn?.format?.value || component.format?.value);

  // Форматируем значение используя формат из layout.formats
  const formattedValue = valueFormatId
    ? formatValue(valueFormatId, kpi.value)
    : kpi.value.toString();

  // Получаем форматы для изменений из sub_columns
  const ppChangeSubColumn = (valueColumn?.sub_columns as any[])?.find((col: any) => col.id === "ppChange");
  const ppChangeAbsoluteSubColumn = (valueColumn?.sub_columns as any[])?.find((col: any) => col.id === "ppChangeAbsolute");
  const ytdChangeSubColumn = (valueColumn?.sub_columns as any[])?.find((col: any) => col.id === "ytdChange");
  const ytdChangeAbsoluteSubColumn = (valueColumn?.sub_columns as any[])?.find((col: any) => col.id === "ytdChangeAbsolute");

  // Рассчитываем процентные изменения через утилиту
  // Используем value, previousValue, previousYearValue (или ytdValue) из kpi
  const percentChanges = calculatePercentChange(
    kpi.value,
    kpi.previousValue,
    kpi.ytdValue // или previousYearValue, если будет в API
  );

  // Используем рассчитанные значения: процентные по умолчанию, абсолютные при клике
  const ppChange = showAbsolute 
    ? percentChanges.ppDiff
    : percentChanges.ppPercent;
  const ytdChange = showAbsolute 
    ? percentChanges.ytdDiff
    : percentChanges.ytdPercent;
  
  // Извлекаем formatId из sub_columns (format может быть строкой)
  const getFormatId = (subColumn: any): string | undefined => {
    if (!subColumn) return undefined;
    return typeof subColumn.format === "string" ? subColumn.format : subColumn.format?.value;
  };
  
  const ppChangeFormatId = showAbsolute 
    ? (getFormatId(ppChangeAbsoluteSubColumn) || valueFormatId)
    : (getFormatId(ppChangeSubColumn) || "percent");
  const ytdChangeFormatId = showAbsolute
    ? (getFormatId(ytdChangeAbsoluteSubColumn) || valueFormatId)
    : (getFormatId(ytdChangeSubColumn) || "percent");

  // Определяем знак изменений (для ppChange и ytdChange значения в долях)
  const isPositive = ppChange !== undefined && ppChange > 0;
  const isYtdPositive = ytdChange !== undefined && ytdChange > 0;
  const changeColor = isPositive ? "text-success" : "text-destructive";
  const ytdChangeColor = isYtdPositive ? "text-success" : "text-destructive";

  // Форматируем изменения
  // formatValue сам применит multiplier из конфигурации формата, поэтому передаем значение как есть
  const formattedPpChange = ppChange !== undefined 
    ? formatValue(ppChangeFormatId, Math.abs(ppChange))
    : undefined;
  const formattedYtdChange = ytdChange !== undefined
    ? formatValue(ytdChangeFormatId, Math.abs(ytdChange))
    : undefined;

  return (
    <Card 
      className="p-3 hover:shadow-lg transition-shadow min-w-0 cursor-pointer"
      onClick={() => setShowAbsolute(!showAbsolute)}
      data-testid={`kpi-card-${componentId}`}
    >
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
          {ppChange !== undefined && (
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
                        {formattedPpChange}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">
                      {showAbsolute 
                        ? "PPTD — абсолютное изменение к предыдущему периоду" 
                        : "PPTD — изменение к предыдущему периоду"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {formattedYtdChange !== undefined && (
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn("text-xs cursor-help", ytdChangeColor)}>
                        ({isYtdPositive ? "↑" : "↓"}
                        {formattedYtdChange})
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">
                        {showAbsolute 
                          ? "YTD — абсолютное изменение с начала года" 
                          : "YTD — изменение с начала года"}
                      </p>
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