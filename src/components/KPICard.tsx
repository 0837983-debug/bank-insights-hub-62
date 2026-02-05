import { useState, useMemo } from "react";
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
import { executeCalculation } from "@/lib/calculations";
import type { KPIMetric, LayoutColumn } from "@/lib/api";

// Тип для calculated поля с вычисленным значением
interface CalculatedFieldResult {
  id: string;
  label: string;
  format?: string;
  value: number | undefined;
  displayGroup?: 'percent' | 'absolute';
  isDefault?: boolean;
}

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

  const resolveComponentKey = (layoutComponentId?: string, componentIdValue?: string) => {
    if (componentIdValue) return componentIdValue;
    if (!layoutComponentId) return undefined;
    const parts = layoutComponentId.split("::");
    return parts[parts.length - 1] || undefined;
  };

  const componentKey = resolveComponentKey(component?.id, component?.componentId);

  // Находим соответствующий KPI по componentId (или id) из API
  const kpi = kpis?.find((k) => {
    const kpiKey = (k as { componentId?: string; id?: string }).componentId ?? k.id;
    return kpiKey === componentKey;
  });

  // Если компонент или KPI не найдены, не рендерим карточку
  if (!component || !kpi) {
    if (import.meta.env.DEV) {
      console.warn(`KPI card not found for componentId: ${componentId}`, {
        componentFound: !!component,
        kpiFound: !!kpi,
        componentId: component?.componentId,
        componentKey,
      });
    }
    return null;
  }

  // Получаем формат для основного значения (value) из columns
  const valueColumn = component.columns?.[0] as LayoutColumn | undefined;
  // format может быть строкой в columns или объектом в старом формате component.format
  const valueFormatId = typeof valueColumn?.format === "string" 
    ? valueColumn.format 
    : (component.format?.value);

  // Форматируем значение используя формат из layout.formats
  const formattedValue = valueFormatId
    ? formatValue(valueFormatId, kpi.value)
    : kpi.value.toString();

  // Собираем все calculated поля из sub_columns в порядке layout
  const calculatedFields = useMemo(() => {
    if (!component?.columns) return [];
    return component.columns.flatMap((col) => 
      (col.sub_columns || []).filter((sub) => sub.fieldType === 'calculated')
    );
  }, [component?.columns]);

  // Вычисляем значения для каждого calculated поля через executeCalculation
  // Включаем displayGroup и isDefault из layout для группировки
  const calculatedResults: CalculatedFieldResult[] = useMemo(() => {
    return calculatedFields.map((field) => {
      const value = field.calculationConfig 
        ? executeCalculation(field.calculationConfig, kpi as Record<string, unknown>)
        : undefined;
      return {
        id: field.id,
        label: field.label,
        format: field.format,
        value,
        displayGroup: field.displayGroup,
        isDefault: field.isDefault,
      };
    });
  }, [calculatedFields, kpi]);

  // Группируем calculated поля по displayGroup из layout
  const groupedFields = useMemo(() => {
    const groups = new Map<string, CalculatedFieldResult[]>();
    
    calculatedResults.forEach((result) => {
      if (result.value === undefined) return;
      
      // Используем displayGroup из layout, fallback на 'default'
      const group = result.displayGroup || 'default';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(result);
    });
    
    return groups;
  }, [calculatedResults]);

  // Определяем группу по умолчанию через isDefault из layout
  const defaultGroup = useMemo(() => {
    const fieldWithDefault = calculatedResults.find(f => f.isDefault);
    return fieldWithDefault?.displayGroup || 'percent';
  }, [calculatedResults]);

  // Получаем список доступных групп
  const availableGroups = useMemo(() => {
    return Array.from(groupedFields.keys());
  }, [groupedFields]);

  // Показываем toggle только если есть больше одной группы
  const hasToggle = availableGroups.length > 1;

  // Выбираем активную группу
  const activeFields = useMemo(() => {
    if (!hasToggle) {
      // Если только одна группа - показываем её
      const firstGroup = availableGroups[0];
      return firstGroup ? (groupedFields.get(firstGroup) || []) : [];
    }
    // Если есть несколько групп - выбираем по toggle
    // showAbsolute = false → группа по умолчанию (defaultGroup)
    // showAbsolute = true → другая группа
    const targetGroup = showAbsolute 
      ? availableGroups.find(g => g !== defaultGroup) || defaultGroup
      : defaultGroup;
    return groupedFields.get(targetGroup) || [];
  }, [hasToggle, showAbsolute, groupedFields, availableGroups, defaultGroup]);

  return (
    <Card 
      className={cn(
        "p-3 hover:shadow-lg transition-shadow min-w-0",
        hasToggle && "cursor-pointer"
      )}
      onClick={hasToggle ? () => setShowAbsolute(!showAbsolute) : undefined}
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
          {activeFields.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {activeFields.map((field, index) => {
                const isPositive = field.value !== undefined && field.value > 0;
                const changeColor = isPositive ? "text-success" : "text-destructive";
                const formattedChange = field.format && field.value !== undefined
                  ? formatValue(field.format, Math.abs(field.value))
                  : field.value?.toString() ?? "-";
                
                // Первое поле показываем с иконкой, остальные в скобках
                if (index === 0) {
                  return (
                    <TooltipProvider key={field.id} delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-0.5 cursor-help">
                            {isPositive ? (
                              <ArrowUpIcon className={cn("w-3 h-3", changeColor)} />
                            ) : (
                              <ArrowDownIcon className={cn("w-3 h-3", changeColor)} />
                            )}
                            <span className={cn("text-xs font-semibold", changeColor)}>
                              {formattedChange}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{field.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }
                
                return (
                  <TooltipProvider key={field.id} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn("text-xs cursor-help", changeColor)}>
                          ({isPositive ? "↑" : "↓"}{formattedChange})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{field.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
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