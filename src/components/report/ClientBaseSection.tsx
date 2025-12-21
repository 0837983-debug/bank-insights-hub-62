import { useState, useCallback } from "react";
import { KPICard } from "@/components/KPICard";
import { FinancialTable, TableRowData } from "@/components/FinancialTable";
import { CollapsibleSection } from "@/components/report/CollapsibleSection";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersIcon, UserCheckIcon, TrendingUpIcon, UserMinusIcon, WalletIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHierarchicalSort } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/SortableHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// KPI Metrics
const kpiMetrics = [
  {
    title: "MAU",
    value: "2.4 млн",
    description: "Число уникальных клиентов, совершивших ≥1 операцию за месяц",
    change: 8.5,
    ytdChange: 15.2,
    icon: <UsersIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "DAU",
    value: "785 тыс",
    description: "Число уникальных клиентов, совершивших ≥1 операцию за день",
    change: 6.2,
    ytdChange: 11.8,
    icon: <UserCheckIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "ARPU",
    value: "₽1,475",
    description: "Средний доход на одного клиента за период",
    change: 5.8,
    ytdChange: 9.4,
    icon: <WalletIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Retention",
    value: "78.5%",
    description: "Доля клиентов, совершивших ≥1 операцию и в текущем, и в предыдущем месяце",
    change: 2.1,
    ytdChange: 3.8,
    icon: <TrendingUpIcon className="w-5 h-5 text-accent" />,
  },
  {
    title: "Churn",
    value: "4.2%",
    description: "Доля клиентов, активных в прошлом месяце, но не совершивших операций в текущем",
    change: -1.3,
    ytdChange: -2.1,
    icon: <UserMinusIcon className="w-5 h-5 text-accent" />,
  },
];

// Structural metrics - Averages and concentration
const averagesAndConcentrationData: TableRowData[] = [
  {
    id: "avg-balance",
    name: "Средний баланс на клиента",
    value: 45820,
    change: 7.3,
    description: "Средний совокупный объём средств на счетах клиента",
  },
  {
    id: "revenue-concentration",
    name: "Концентрация дохода (80% выручки)",
    value: 18.5,
    percentage: 18.5,
    change: -2.1,
    description: "Доля клиентов, генерирующих 80% выручки (показатель Парето)",
  },
  {
    id: "asset-concentration",
    name: "Концентрация активов (80% активов)",
    value: 12.3,
    percentage: 12.3,
    change: -1.8,
    description: "Доля клиентов, владеющих 80% активов",
  },
  {
    id: "avg-transactions",
    name: "Средняя транзакционная активность",
    value: 18.3,
    change: 9.4,
    description: "Среднее количество операций на одного активного клиента",
  },
];

// Structural metrics - Client shares by operation type
const clientSharesData: TableRowData[] = [
  {
    id: "international-transfers",
    name: "Доля клиентов с международными переводами",
    value: 28.5,
    percentage: 28.5,
    change: 4.2,
    description: "Включая входящие и исходящие трансграничные операции",
  },
  {
    id: "fx-operations",
    name: "Доля клиентов с FX",
    value: 34.2,
    percentage: 34.2,
    change: 5.8,
    description: "Клиенты, совершавшие операции конвертации валют",
  },
  {
    id: "domestic-card",
    name: "Доля клиентов с карточными транзакциями (РФ)",
    value: 67.8,
    percentage: 67.8,
    change: 6.1,
    description: "Карточные операции на территории РФ, за исключением международных переводов",
  },
];

// Segmentation data structure - Asset bands as first level, client types as second level
interface SegmentRow {
  id: string;
  segment: string;
  clientType?: string;
  clientCount: number;
  assets: number;
  commissionIncome: number;
  avgIncomePerClient: number;
  transactionCount: number;
  mau: number;
  isGroupHeader?: boolean;
  children?: SegmentRow[];
}

const assetBands = [
  { id: "0-1k", name: "0–1 тыс" },
  { id: "1k-100k", name: "1 тыс – 100 тыс" },
  { id: "100k-1m", name: "100 тыс – 1 млн" },
  { id: "1m-5m", name: "1–5 млн" },
  { id: "5m-10m", name: "5–10 млн" },
  { id: "10m-50m", name: "10–50 млн" },
  { id: "50m-100m", name: "50–100 млн" },
  { id: "100m-1b", name: "100 млн – 1 млрд" },
  { id: "1b+", name: "> 1 млрд" },
];

const clientTypes = [
  { id: "ind-res", name: "Физические лица–резиденты" },
  { id: "ind-nonres", name: "Физические лица–нерезиденты" },
  { id: "ip", name: "Индивидуальные предприниматели" },
  { id: "legal", name: "Юридические лица" },
];

// Raw data by asset band -> client type
const rawData: Record<string, Record<string, { clientCount: number; assets: number; commissionIncome: number; avgIncomePerClient: number; transactionCount: number; mau: number }>> = {
  "0-1k": {
    "ind-res": { clientCount: 485000, assets: 0.2, commissionIncome: 0.8, avgIncomePerClient: 1.6, transactionCount: 2100000, mau: 245000 },
    "ind-nonres": { clientCount: 28000, assets: 0.01, commissionIncome: 0.2, avgIncomePerClient: 7.1, transactionCount: 180000, mau: 18000 },
    "ip": { clientCount: 4200, assets: 0.002, commissionIncome: 0.04, avgIncomePerClient: 9.5, transactionCount: 28000, mau: 2800 },
    "legal": { clientCount: 1800, assets: 0.001, commissionIncome: 0.02, avgIncomePerClient: 11.1, transactionCount: 12000, mau: 1200 },
  },
  "1k-100k": {
    "ind-res": { clientCount: 892000, assets: 12.4, commissionIncome: 8.2, avgIncomePerClient: 9.2, transactionCount: 15800000, mau: 756000 },
    "ind-nonres": { clientCount: 72000, assets: 2.8, commissionIncome: 2.4, avgIncomePerClient: 33.3, transactionCount: 1450000, mau: 62000 },
    "ip": { clientCount: 18500, assets: 0.8, commissionIncome: 0.8, avgIncomePerClient: 43.2, transactionCount: 680000, mau: 16200 },
    "legal": { clientCount: 5200, assets: 0.24, commissionIncome: 0.4, avgIncomePerClient: 76.9, transactionCount: 185000, mau: 4800 },
  },
  "100k-1m": {
    "ind-res": { clientCount: 524000, assets: 48.6, commissionIncome: 12.8, avgIncomePerClient: 24.4, transactionCount: 14200000, mau: 485000 },
    "ind-nonres": { clientCount: 58000, assets: 12.4, commissionIncome: 4.2, avgIncomePerClient: 72.4, transactionCount: 1680000, mau: 52000 },
    "ip": { clientCount: 12800, assets: 4.2, commissionIncome: 1.2, avgIncomePerClient: 93.8, transactionCount: 780000, mau: 11800 },
    "legal": { clientCount: 7800, assets: 3.8, commissionIncome: 1.8, avgIncomePerClient: 230.8, transactionCount: 920000, mau: 7200 },
  },
  "1m-5m": {
    "ind-res": { clientCount: 186000, assets: 42.8, commissionIncome: 4.8, avgIncomePerClient: 25.8, transactionCount: 4800000, mau: 172000 },
    "ind-nonres": { clientCount: 21000, assets: 6.8, commissionIncome: 1.4, avgIncomePerClient: 66.7, transactionCount: 720000, mau: 18500 },
    "ip": { clientCount: 4800, assets: 2.4, commissionIncome: 0.56, avgIncomePerClient: 116.7, transactionCount: 285000, mau: 4500 },
    "legal": { clientCount: 5200, assets: 12.4, commissionIncome: 2.2, avgIncomePerClient: 423.1, transactionCount: 850000, mau: 4900 },
  },
  "5m-10m": {
    "ind-res": { clientCount: 42000, assets: 28.4, commissionIncome: 1.2, avgIncomePerClient: 28.6, transactionCount: 1200000, mau: 38000 },
    "ind-nonres": { clientCount: 4800, assets: 1.8, commissionIncome: 0.32, avgIncomePerClient: 66.7, transactionCount: 145000, mau: 4200 },
    "ip": { clientCount: 1200, assets: 0.72, commissionIncome: 0.14, avgIncomePerClient: 116.7, transactionCount: 58000, mau: 1100 },
    "legal": { clientCount: 1800, assets: 12.8, commissionIncome: 0.86, avgIncomePerClient: 477.8, transactionCount: 320000, mau: 1700 },
  },
  "10m-50m": {
    "ind-res": { clientCount: 18000, assets: 21.2, commissionIncome: 0.5, avgIncomePerClient: 27.8, transactionCount: 380000, mau: 16500 },
    "ind-nonres": { clientCount: 1100, assets: 0.38, commissionIncome: 0.06, avgIncomePerClient: 54.5, transactionCount: 24000, mau: 980 },
    "ip": { clientCount: 420, assets: 0.26, commissionIncome: 0.05, avgIncomePerClient: 119, transactionCount: 18000, mau: 385 },
    "legal": { clientCount: 920, assets: 10.2, commissionIncome: 0.36, avgIncomePerClient: 391.3, transactionCount: 142000, mau: 880 },
  },
  "50m-100m": {
    "ind-res": { clientCount: 2800, assets: 2.8, commissionIncome: 0.08, avgIncomePerClient: 28.6, transactionCount: 18000, mau: 2600 },
    "ind-nonres": { clientCount: 90, assets: 0.02, commissionIncome: 0.018, avgIncomePerClient: 200, transactionCount: 800, mau: 85 },
    "ip": { clientCount: 72, assets: 0.016, commissionIncome: 0.008, avgIncomePerClient: 111.1, transactionCount: 980, mau: 68 },
    "legal": { clientCount: 220, assets: 2.4, commissionIncome: 0.05, avgIncomePerClient: 227.3, transactionCount: 18000, mau: 210 },
  },
  "100m-1b": {
    "ind-res": { clientCount: 180, assets: 0.36, commissionIncome: 0.02, avgIncomePerClient: 111.1, transactionCount: 1800, mau: 175 },
    "ind-nonres": { clientCount: 10, assets: 0.002, commissionIncome: 0.002, avgIncomePerClient: 200, transactionCount: 50, mau: 10 },
    "ip": { clientCount: 8, assets: 0.002, commissionIncome: 0.002, avgIncomePerClient: 250, transactionCount: 20, mau: 8 },
    "legal": { clientCount: 52, assets: 0.72, commissionIncome: 0.008, avgIncomePerClient: 153.8, transactionCount: 2800, mau: 50 },
  },
  "1b+": {
    "ind-res": { clientCount: 20, assets: 0.04, commissionIncome: 0.002, avgIncomePerClient: 100, transactionCount: 200, mau: 18 },
    "legal": { clientCount: 8, assets: 0.04, commissionIncome: 0.002, avgIncomePerClient: 250, transactionCount: 200, mau: 8 },
  },
};

// Build segmentation data with asset bands as first level
const segmentationData: SegmentRow[] = assetBands.map(band => {
  const bandData = rawData[band.id] || {};
  const children: SegmentRow[] = clientTypes
    .filter(ct => bandData[ct.id])
    .map(ct => ({
      id: `${band.id}-${ct.id}`,
      segment: band.name,
      clientType: ct.name,
      ...bandData[ct.id],
    }));
  
  // Calculate totals for the band
  const totals = children.reduce((acc, child) => ({
    clientCount: acc.clientCount + child.clientCount,
    assets: acc.assets + child.assets,
    commissionIncome: acc.commissionIncome + child.commissionIncome,
    transactionCount: acc.transactionCount + child.transactionCount,
    mau: acc.mau + child.mau,
  }), { clientCount: 0, assets: 0, commissionIncome: 0, transactionCount: 0, mau: 0 });
  
  const avgIncomePerClient = totals.clientCount > 0 
    ? (totals.commissionIncome * 1000000000) / totals.clientCount / 1000 
    : 0;

  return {
    id: band.id,
    segment: band.name,
    clientCount: totals.clientCount,
    assets: totals.assets,
    commissionIncome: totals.commissionIncome,
    avgIncomePerClient: parseFloat(avgIncomePerClient.toFixed(1)),
    transactionCount: totals.transactionCount,
    mau: totals.mau,
    isGroupHeader: true,
    children,
  };
});

// Helper function to format numbers
const formatNumber = (value: number, type: 'count' | 'currency' | 'decimal' = 'count'): string => {
  if (type === 'currency') {
    if (value >= 1) return `${value.toFixed(1)} млрд`;
    return `${(value * 1000).toFixed(0)} млн`;
  }
  if (type === 'decimal') {
    return value.toFixed(1);
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)} млн`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)} тыс`;
  return value.toString();
};

export const ClientBaseSection = () => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["0-1k"]));

  const getValueFn = useCallback((row: SegmentRow, column: string): number | string => {
    switch (column) {
      case "segment":
        return row.segment;
      case "clientCount":
        return row.clientCount;
      case "assets":
        return row.assets;
      case "commissionIncome":
        return row.commissionIncome;
      case "avgIncomePerClient":
        return row.avgIncomePerClient;
      case "transactionCount":
        return row.transactionCount;
      case "mau":
        return row.mau;
      default:
        return row.segment;
    }
  }, []);

  const { sortedData, sortState, handleSort } = useHierarchicalSort(segmentationData, getValueFn);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(segmentationData.map((g) => g.id)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  return (
    <CollapsibleSection title="Клиентская база и сегменты">
      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {kpiMetrics.map((metric) => (
          <KPICard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            description={metric.description}
            change={metric.change}
            ytdChange={metric.ytdChange}
            showChange={true}
            icon={metric.icon}
          />
        ))}
      </div>

      {/* Structural Metrics Tables - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FinancialTable
          title="Средние показатели и концентрация"
          rows={averagesAndConcentrationData}
          showPercentage={true}
          showChange={true}
        />
        <FinancialTable
          title="Доля клиентов по типу операций"
          rows={clientSharesData}
          showPercentage={true}
          showChange={true}
        />
      </div>

      {/* Segmentation Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Детализированная сегментация</h3>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={collapseAll}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Свернуть все</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={expandAll}>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Развернуть все</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[280px]">
                  <SortableHeader
                    label="Сегмент"
                    column="segment"
                    currentColumn={sortState.column}
                    direction={sortState.direction}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  <div className="flex justify-end">
                    <SortableHeader
                      label="Кол-во клиентов"
                      column="clientCount"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  <div className="flex justify-end">
                    <SortableHeader
                      label="Активы, млрд руб"
                      column="assets"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[140px]">
                  <div className="flex justify-end">
                    <SortableHeader
                      label="Комиссионный доход"
                      column="commissionIncome"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[140px]">
                  <div className="flex justify-end">
                    <SortableHeader
                      label="Ср. доход на клиента"
                      column="avgIncomePerClient"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[120px]">
                  <div className="flex justify-end">
                    <SortableHeader
                      label="Транзакций"
                      column="transactionCount"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[100px]">
                  <div className="flex justify-end">
                    <SortableHeader
                      label="MAU"
                      column="mau"
                      currentColumn={sortState.column}
                      direction={sortState.direction}
                      onSort={handleSort}
                    />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((group) => (
                <>
                  {/* Group header row */}
                  <TableRow
                    key={group.id}
                    className="bg-muted/50 hover:bg-muted cursor-pointer font-medium"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        {expandedGroups.has(group.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        {group.segment}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(group.clientCount)}</TableCell>
                    <TableCell className="text-right font-semibold">{group.assets.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-semibold">{group.commissionIncome.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-semibold">{group.avgIncomePerClient.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(group.transactionCount)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(group.mau)}</TableCell>
                  </TableRow>

                  {/* Child rows */}
                  {expandedGroups.has(group.id) &&
                    group.children?.map((child) => (
                      <TableRow key={child.id} className="hover:bg-muted/30">
                        <TableCell className="pl-10 text-muted-foreground">{child.clientType}</TableCell>
                        <TableCell className="text-right">{formatNumber(child.clientCount)}</TableCell>
                        <TableCell className="text-right">{child.assets.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{child.commissionIncome.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{child.avgIncomePerClient.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{formatNumber(child.transactionCount)}</TableCell>
                        <TableCell className="text-right">{formatNumber(child.mau)}</TableCell>
                      </TableRow>
                    ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </CollapsibleSection>
  );
};
