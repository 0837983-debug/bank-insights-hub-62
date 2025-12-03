import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  TrendingUpIcon, 
  TrendingDownIcon,
  DollarSignIcon,
  PieChartIcon,
  UsersIcon,
  LayersIcon,
  RepeatIcon,
  TargetIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTableSort } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/SortableHeader";

interface ProductLineData {
  id: string;
  name: string;
  revenue: number;
  revenueChange: number;
  pau: number;
  pauChange: number;
  arppu: number;
  arppuChange: number;
  repeatRate: number;
  repeatRateChange: number;
  crossSellIndex: number;
  crossSellChange: number;
  revenueShare: number;
  revenueShareChange: number;
  margin: number;
  marginChange: number;
}

interface PenetrationData {
  id: string;
  segment: string;
  clientCount: number;
  clientCountChange: number;
  sharePercent: number;
  shareChange: number;
  avgRevenue: number;
  avgRevenueChange: number;
  avgActivity: number;
  avgActivityChange: number;
}

const productLines: ProductLineData[] = [
  {
    id: "international",
    name: "Международные переводы",
    revenue: 2850,
    revenueChange: 12.5,
    pau: 245000,
    pauChange: 8.3,
    arppu: 11633,
    arppuChange: 3.9,
    repeatRate: 72.4,
    repeatRateChange: 2.1,
    crossSellIndex: 2.3,
    crossSellChange: 0.2,
    revenueShare: 58.2,
    revenueShareChange: 1.8,
    margin: 34.5,
    marginChange: -0.8,
  },
  {
    id: "fx",
    name: "FX",
    revenue: 680,
    revenueChange: 15.2,
    pau: 89000,
    pauChange: 11.4,
    arppu: 7640,
    arppuChange: 3.4,
    repeatRate: 65.8,
    repeatRateChange: 3.2,
    crossSellIndex: 2.8,
    crossSellChange: 0.3,
    revenueShare: 13.9,
    revenueShareChange: 0.9,
    margin: 28.3,
    marginChange: 1.2,
  },
  {
    id: "cards",
    name: "Карты",
    revenue: 520,
    revenueChange: 8.7,
    pau: 312000,
    pauChange: 5.6,
    arppu: 1667,
    arppuChange: 2.9,
    repeatRate: 89.2,
    repeatRateChange: 1.4,
    crossSellIndex: 1.9,
    crossSellChange: 0.1,
    revenueShare: 10.6,
    revenueShareChange: -0.3,
    margin: 22.1,
    marginChange: -1.5,
  },
  {
    id: "private",
    name: "Private Banking",
    revenue: 420,
    revenueChange: 6.3,
    pau: 1250,
    pauChange: 4.2,
    arppu: 336000,
    arppuChange: 2.0,
    repeatRate: 94.5,
    repeatRateChange: 0.8,
    crossSellIndex: 3.4,
    crossSellChange: 0.2,
    revenueShare: 8.6,
    revenueShareChange: -0.2,
    margin: 45.2,
    marginChange: 0.5,
  },
  {
    id: "baas",
    name: "BaaS",
    revenue: 180,
    revenueChange: 28.4,
    pau: 45,
    pauChange: 15.4,
    arppu: 4000000,
    arppuChange: 11.3,
    repeatRate: 97.8,
    repeatRateChange: 0.4,
    crossSellIndex: 1.2,
    crossSellChange: 0.1,
    revenueShare: 3.7,
    revenueShareChange: 0.8,
    margin: 52.3,
    marginChange: 2.1,
  },
  {
    id: "migrant",
    name: "Мигрантские продукты",
    revenue: 156,
    revenueChange: 18.9,
    pau: 78000,
    pauChange: 14.2,
    arppu: 2000,
    arppuChange: 4.1,
    repeatRate: 58.3,
    repeatRateChange: 5.6,
    crossSellIndex: 1.6,
    crossSellChange: 0.3,
    revenueShare: 3.2,
    revenueShareChange: 0.4,
    margin: 31.8,
    marginChange: 1.8,
  },
  {
    id: "acquiring",
    name: "Эквайринг",
    revenue: 89,
    revenueChange: 22.1,
    pau: 3200,
    pauChange: 18.5,
    arppu: 27813,
    arppuChange: 3.0,
    repeatRate: 85.6,
    repeatRateChange: 2.3,
    crossSellIndex: 2.1,
    crossSellChange: 0.2,
    revenueShare: 1.8,
    revenueShareChange: 0.3,
    margin: 18.4,
    marginChange: -0.6,
  },
];

const penetrationData: PenetrationData[] = [
  {
    id: "1product",
    segment: "Клиенты с 1 продуктом",
    clientCount: 245000,
    clientCountChange: -3.2,
    sharePercent: 42.8,
    shareChange: -2.1,
    avgRevenue: 4500,
    avgRevenueChange: 5.2,
    avgActivity: 3.2,
    avgActivityChange: 1.8,
  },
  {
    id: "2products",
    segment: "Клиенты с 2 продуктами",
    clientCount: 189000,
    clientCountChange: 8.4,
    sharePercent: 33.0,
    shareChange: 1.2,
    avgRevenue: 12800,
    avgRevenueChange: 7.3,
    avgActivity: 8.5,
    avgActivityChange: 3.2,
  },
  {
    id: "3products",
    segment: "Клиенты с 3 продуктами",
    clientCount: 98000,
    clientCountChange: 12.6,
    sharePercent: 17.1,
    shareChange: 0.9,
    avgRevenue: 28500,
    avgRevenueChange: 9.1,
    avgActivity: 15.4,
    avgActivityChange: 4.8,
  },
  {
    id: "4products",
    segment: "Клиенты с 4+ продуктами",
    clientCount: 40500,
    clientCountChange: 15.8,
    sharePercent: 7.1,
    shareChange: 0.6,
    avgRevenue: 67200,
    avgRevenueChange: 11.2,
    avgActivity: 28.7,
    avgActivityChange: 6.3,
  },
];

const formatNumber = (num: number, type: 'currency' | 'count' | 'percent' | 'decimal' = 'count'): string => {
  if (type === 'percent') {
    return `${num.toFixed(1)}%`;
  }
  if (type === 'decimal') {
    return num.toFixed(1);
  }
  if (type === 'currency') {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)} млн`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)} тыс`;
    }
    return num.toFixed(0);
  }
  // count
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)} млн`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} тыс`;
  }
  return num.toLocaleString('ru-RU');
};

const MetricCell = ({ value, change, format = 'count' }: { value: number; change: number; format?: 'currency' | 'count' | 'percent' | 'decimal' }) => {
  const isPositive = change >= 0;
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-medium text-foreground">{formatNumber(value, format)}</span>
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUpIcon className="w-3 h-3 text-success" />
        ) : (
          <TrendingDownIcon className="w-3 h-3 text-destructive" />
        )}
        <span className={cn("text-xs", isPositive ? "text-success" : "text-destructive")}>
          {isPositive ? "+" : ""}{change.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

const HeaderWithTooltip = ({ 
  label, 
  tooltip, 
  column, 
  currentColumn, 
  direction, 
  onSort 
}: { 
  label: string; 
  tooltip: string; 
  column: string;
  currentColumn: string | null;
  direction: "asc" | "desc" | null;
  onSort: (column: string) => void;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="cursor-help">
        <SortableHeader
          label={label}
          column={column}
          currentColumn={currentColumn}
          direction={direction}
          onSort={onSort}
          className="border-b border-dotted border-muted-foreground/50"
        />
      </div>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs">
      <p className="text-sm">{tooltip}</p>
    </TooltipContent>
  </Tooltip>
);

export const Products = () => {
  // Calculate totals for KPIs
  const totalRevenue = productLines.reduce((sum, p) => sum + p.revenue, 0);
  const topProduct = productLines.reduce((max, p) => p.revenue > max.revenue ? p : max, productLines[0]);
  const totalPAU = 572500; // deduplicated union
  const avgARPPU = totalRevenue * 1000000 / totalPAU;
  const avgCrossSell = 2.1;
  const multiProductShare = 57.2; // clients with 2+ products

  // Product lines sorting
  const getProductValueFn = useCallback((row: ProductLineData, column: string): number | string => {
    switch (column) {
      case "name": return row.name;
      case "revenue": return row.revenue;
      case "pau": return row.pau;
      case "arppu": return row.arppu;
      case "repeatRate": return row.repeatRate;
      case "crossSellIndex": return row.crossSellIndex;
      case "revenueShare": return row.revenueShare;
      case "margin": return row.margin;
      default: return row.name;
    }
  }, []);

  const { sortedData: sortedProducts, sortState: productSortState, handleSort: handleProductSort } = useTableSort(productLines, getProductValueFn);

  // Penetration sorting
  const getPenetrationValueFn = useCallback((row: PenetrationData, column: string): number | string => {
    switch (column) {
      case "segment": return row.segment;
      case "clientCount": return row.clientCount;
      case "sharePercent": return row.sharePercent;
      case "avgRevenue": return row.avgRevenue;
      case "avgActivity": return row.avgActivity;
      default: return row.segment;
    }
  }, []);

  const { sortedData: sortedPenetration, sortState: penetrationSortState, handleSort: handlePenetrationSort } = useTableSort(penetrationData, getPenetrationValueFn);

  return (
    <section>
      <h2 className="text-3xl font-bold text-foreground mb-6">Продукты и коммерческая активность</h2>
      
      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KPICard
          title="Общая выручка"
          value={`${(totalRevenue / 1000).toFixed(1)} млрд ₽`}
          description="Суммарная выручка по всем продуктовым линиям"
          change={11.8}
          showChange
          icon={<DollarSignIcon className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Топ-продукт"
          value={`${topProduct.revenueShare.toFixed(0)}%`}
          subtitle={topProduct.name}
          description="Доля ведущего продукта в общей выручке"
          change={topProduct.revenueShareChange}
          showChange
          icon={<PieChartIcon className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Средний ARPPU"
          value={`${formatNumber(avgARPPU, 'currency')} ₽`}
          description="Средняя выручка на платящего пользователя по всем продуктам"
          change={4.2}
          showChange
          icon={<TargetIcon className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Cross-sell Index"
          value={avgCrossSell.toFixed(1)}
          description="Среднее количество продуктов на одного клиента"
          change={5.0}
          showChange
          icon={<LayersIcon className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Мультипродуктовые"
          value={`${multiProductShare}%`}
          description="Доля клиентов, использующих 2 и более продукта"
          change={2.8}
          showChange
          icon={<RepeatIcon className="w-5 h-5 text-primary" />}
        />
        <KPICard
          title="Активные PAU"
          value={formatNumber(totalPAU, 'count')}
          description="Общее количество уникальных активных пользователей продуктов"
          change={9.2}
          showChange
          icon={<UsersIcon className="w-5 h-5 text-primary" />}
        />
      </div>

      {/* Product Lines Table */}
      <Card className="mb-8">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-foreground">Продуктовые линии</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[180px]">
                  <SortableHeader
                    label="Продуктовая линия"
                    column="name"
                    currentColumn={productSortState.column}
                    direction={productSortState.direction}
                    onSort={handleProductSort}
                  />
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Выручка, млн ₽" 
                      tooltip="Общая выручка по продуктовой линии"
                      column="revenue"
                      currentColumn={productSortState.column}
                      direction={productSortState.direction}
                      onSort={handleProductSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="PAU" 
                      tooltip="Product Active Users — количество активных пользователей продукта"
                      column="pau"
                      currentColumn={productSortState.column}
                      direction={productSortState.direction}
                      onSort={handleProductSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="ARPPU, ₽" 
                      tooltip="Average Revenue Per Paying User — средняя выручка на платящего пользователя"
                      column="arppu"
                      currentColumn={productSortState.column}
                      direction={productSortState.direction}
                      onSort={handleProductSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Repeat Rate" 
                      tooltip="Доля клиентов, совершивших повторную транзакцию по продукту"
                      column="repeatRate"
                      currentColumn={productSortState.column}
                      direction={productSortState.direction}
                      onSort={handleProductSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Cross-sell" 
                      tooltip="Среднее количество других продуктов у клиентов этой линии"
                      column="crossSellIndex"
                      currentColumn={productSortState.column}
                      direction={productSortState.direction}
                      onSort={handleProductSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Доля выручки" 
                      tooltip="Вклад продукта в общую выручку банка"
                      column="revenueShare"
                      currentColumn={productSortState.column}
                      direction={productSortState.direction}
                      onSort={handleProductSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Маржа" 
                      tooltip="Маржинальность продуктовой линии"
                      column="margin"
                      currentColumn={productSortState.column}
                      direction={productSortState.direction}
                      onSort={handleProductSort}
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={product.revenue} change={product.revenueChange} format="count" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={product.pau} change={product.pauChange} format="count" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={product.arppu} change={product.arppuChange} format="count" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={product.repeatRate} change={product.repeatRateChange} format="percent" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={product.crossSellIndex} change={product.crossSellChange} format="decimal" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={product.revenueShare} change={product.revenueShareChange} format="percent" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={product.margin} change={product.marginChange} format="percent" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Product Penetration Table */}
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-foreground">Product Penetration</h3>
          <p className="text-sm text-muted-foreground mt-1">Структура набора продуктов у клиентов</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[200px]">
                  <SortableHeader
                    label="Сегмент"
                    column="segment"
                    currentColumn={penetrationSortState.column}
                    direction={penetrationSortState.direction}
                    onSort={handlePenetrationSort}
                  />
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Количество клиентов" 
                      tooltip="Число клиентов в данном сегменте по количеству продуктов"
                      column="clientCount"
                      currentColumn={penetrationSortState.column}
                      direction={penetrationSortState.direction}
                      onSort={handlePenetrationSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Доля от базы" 
                      tooltip="Процент от общего числа клиентов банка"
                      column="sharePercent"
                      currentColumn={penetrationSortState.column}
                      direction={penetrationSortState.direction}
                      onSort={handlePenetrationSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Средний доход, ₽" 
                      tooltip="Средняя выручка на клиента в сегменте"
                      column="avgRevenue"
                      currentColumn={penetrationSortState.column}
                      direction={penetrationSortState.direction}
                      onSort={handlePenetrationSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right font-semibold">
                  <div className="flex justify-end">
                    <HeaderWithTooltip 
                      label="Средняя активность" 
                      tooltip="Среднее число транзакций на клиента в месяц"
                      column="avgActivity"
                      currentColumn={penetrationSortState.column}
                      direction={penetrationSortState.direction}
                      onSort={handlePenetrationSort}
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPenetration.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{row.segment}</TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={row.clientCount} change={row.clientCountChange} format="count" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={row.sharePercent} change={row.shareChange} format="percent" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={row.avgRevenue} change={row.avgRevenueChange} format="count" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell value={row.avgActivity} change={row.avgActivityChange} format="decimal" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
};
