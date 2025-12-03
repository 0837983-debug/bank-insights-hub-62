import { useState } from "react";
import { KPICard } from "@/components/KPICard";
import { FinancialTable, TableRowData } from "@/components/FinancialTable";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsersIcon, UserCheckIcon, TrendingUpIcon, UserMinusIcon, WalletIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// KPI Metrics
const kpiMetrics = [
  {
    title: "MAO",
    value: "2.4 млн",
    subtitle: "Ежемесячно активные клиенты",
    description: "Число уникальных клиентов, совершивших ≥1 операцию за месяц",
    change: 8.5,
    icon: <UsersIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "DAO",
    value: "785 тыс",
    subtitle: "Ежедневно активные клиенты",
    description: "Число уникальных клиентов, совершивших ≥1 операцию за день",
    change: 6.2,
    icon: <UserCheckIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "ARPU",
    value: "₽1,475",
    subtitle: "Средний доход на клиента",
    description: "Средний доход на одного клиента за период",
    change: 5.8,
    icon: <WalletIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "Retention",
    value: "78.5%",
    subtitle: "Месячное удержание",
    description: "Доля клиентов, совершивших ≥1 операцию и в текущем, и в предыдущем месяце",
    change: 2.1,
    icon: <TrendingUpIcon className="w-6 h-6 text-accent" />,
  },
  {
    title: "Churn",
    value: "4.2%",
    subtitle: "Ушедшие клиенты",
    description: "Доля клиентов, активных в прошлом месяце, но не совершивших операций в текущем",
    change: -1.3,
    icon: <UserMinusIcon className="w-6 h-6 text-accent" />,
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

// Segmentation data structure
interface SegmentRow {
  id: string;
  clientType: string;
  assetBand?: string;
  clientCount: number;
  assets: number;
  commissionIncome: number;
  avgIncomePerClient: number;
  transactionCount: number;
  mau: number;
  isGroupHeader?: boolean;
  children?: SegmentRow[];
}

const segmentationData: SegmentRow[] = [
  {
    id: "individuals-resident",
    clientType: "Физические лица–резиденты",
    clientCount: 2150000,
    assets: 156.8,
    commissionIncome: 28.4,
    avgIncomePerClient: 13.2,
    transactionCount: 38500000,
    mau: 1820000,
    isGroupHeader: true,
    children: [
      { id: "ind-res-0-1k", clientType: "Физические лица–резиденты", assetBand: "0–1 тыс", clientCount: 485000, assets: 0.2, commissionIncome: 0.8, avgIncomePerClient: 1.6, transactionCount: 2100000, mau: 245000 },
      { id: "ind-res-1k-100k", clientType: "Физические лица–резиденты", assetBand: "1 тыс – 100 тыс", clientCount: 892000, assets: 12.4, commissionIncome: 8.2, avgIncomePerClient: 9.2, transactionCount: 15800000, mau: 756000 },
      { id: "ind-res-100k-1m", clientType: "Физические лица–резиденты", assetBand: "100 тыс – 1 млн", clientCount: 524000, assets: 48.6, commissionIncome: 12.8, avgIncomePerClient: 24.4, transactionCount: 14200000, mau: 485000 },
      { id: "ind-res-1m-5m", clientType: "Физические лица–резиденты", assetBand: "1–5 млн", clientCount: 186000, assets: 42.8, commissionIncome: 4.8, avgIncomePerClient: 25.8, transactionCount: 4800000, mau: 172000 },
      { id: "ind-res-5m-10m", clientType: "Физические лица–резиденты", assetBand: "5–10 млн", clientCount: 42000, assets: 28.4, commissionIncome: 1.2, avgIncomePerClient: 28.6, transactionCount: 1200000, mau: 38000 },
      { id: "ind-res-10m-50m", clientType: "Физические лица–резиденты", assetBand: "10–50 млн", clientCount: 18000, assets: 21.2, commissionIncome: 0.5, avgIncomePerClient: 27.8, transactionCount: 380000, mau: 16500 },
      { id: "ind-res-50m-100m", clientType: "Физические лица–резиденты", assetBand: "50–100 млн", clientCount: 2800, assets: 2.8, commissionIncome: 0.08, avgIncomePerClient: 28.6, transactionCount: 18000, mau: 2600 },
      { id: "ind-res-100m-1b", clientType: "Физические лица–резиденты", assetBand: "100 млн – 1 млрд", clientCount: 180, assets: 0.36, commissionIncome: 0.02, avgIncomePerClient: 111.1, transactionCount: 1800, mau: 175 },
      { id: "ind-res-1b+", clientType: "Физические лица–резиденты", assetBand: "> 1 млрд", clientCount: 20, assets: 0.04, commissionIncome: 0.002, avgIncomePerClient: 100, transactionCount: 200, mau: 18 },
    ],
  },
  {
    id: "individuals-nonresident",
    clientType: "Физические лица–нерезиденты",
    clientCount: 185000,
    assets: 24.2,
    commissionIncome: 8.6,
    avgIncomePerClient: 46.5,
    transactionCount: 4200000,
    mau: 156000,
    isGroupHeader: true,
    children: [
      { id: "ind-nonres-0-1k", clientType: "Физические лица–нерезиденты", assetBand: "0–1 тыс", clientCount: 28000, assets: 0.01, commissionIncome: 0.2, avgIncomePerClient: 7.1, transactionCount: 180000, mau: 18000 },
      { id: "ind-nonres-1k-100k", clientType: "Физические лица–нерезиденты", assetBand: "1 тыс – 100 тыс", clientCount: 72000, assets: 2.8, commissionIncome: 2.4, avgIncomePerClient: 33.3, transactionCount: 1450000, mau: 62000 },
      { id: "ind-nonres-100k-1m", clientType: "Физические лица–нерезиденты", assetBand: "100 тыс – 1 млн", clientCount: 58000, assets: 12.4, commissionIncome: 4.2, avgIncomePerClient: 72.4, transactionCount: 1680000, mau: 52000 },
      { id: "ind-nonres-1m-5m", clientType: "Физические лица–нерезиденты", assetBand: "1–5 млн", clientCount: 21000, assets: 6.8, commissionIncome: 1.4, avgIncomePerClient: 66.7, transactionCount: 720000, mau: 18500 },
      { id: "ind-nonres-5m-10m", clientType: "Физические лица–нерезиденты", assetBand: "5–10 млн", clientCount: 4800, assets: 1.8, commissionIncome: 0.32, avgIncomePerClient: 66.7, transactionCount: 145000, mau: 4200 },
      { id: "ind-nonres-10m-50m", clientType: "Физические лица–нерезиденты", assetBand: "10–50 млн", clientCount: 1100, assets: 0.38, commissionIncome: 0.06, avgIncomePerClient: 54.5, transactionCount: 24000, mau: 980 },
      { id: "ind-nonres-50m-100m", clientType: "Физические лица–нерезиденты", assetBand: "50–100 млн", clientCount: 90, assets: 0.02, commissionIncome: 0.018, avgIncomePerClient: 200, transactionCount: 800, mau: 85 },
      { id: "ind-nonres-100m-1b", clientType: "Физические лица–нерезиденты", assetBand: "100 млн – 1 млрд", clientCount: 10, assets: 0.002, commissionIncome: 0.002, avgIncomePerClient: 200, transactionCount: 50, mau: 10 },
    ],
  },
  {
    id: "ip",
    clientType: "Индивидуальные предприниматели",
    clientCount: 42000,
    assets: 8.4,
    commissionIncome: 2.8,
    avgIncomePerClient: 66.7,
    transactionCount: 1850000,
    mau: 38000,
    isGroupHeader: true,
    children: [
      { id: "ip-0-1k", clientType: "Индивидуальные предприниматели", assetBand: "0–1 тыс", clientCount: 4200, assets: 0.002, commissionIncome: 0.04, avgIncomePerClient: 9.5, transactionCount: 28000, mau: 2800 },
      { id: "ip-1k-100k", clientType: "Индивидуальные предприниматели", assetBand: "1 тыс – 100 тыс", clientCount: 18500, assets: 0.8, commissionIncome: 0.8, avgIncomePerClient: 43.2, transactionCount: 680000, mau: 16200 },
      { id: "ip-100k-1m", clientType: "Индивидуальные предприниматели", assetBand: "100 тыс – 1 млн", clientCount: 12800, assets: 4.2, commissionIncome: 1.2, avgIncomePerClient: 93.8, transactionCount: 780000, mau: 11800 },
      { id: "ip-1m-5m", clientType: "Индивидуальные предприниматели", assetBand: "1–5 млн", clientCount: 4800, assets: 2.4, commissionIncome: 0.56, avgIncomePerClient: 116.7, transactionCount: 285000, mau: 4500 },
      { id: "ip-5m-10m", clientType: "Индивидуальные предприниматели", assetBand: "5–10 млн", clientCount: 1200, assets: 0.72, commissionIncome: 0.14, avgIncomePerClient: 116.7, transactionCount: 58000, mau: 1100 },
      { id: "ip-10m-50m", clientType: "Индивидуальные предприниматели", assetBand: "10–50 млн", clientCount: 420, assets: 0.26, commissionIncome: 0.05, avgIncomePerClient: 119, transactionCount: 18000, mau: 385 },
      { id: "ip-50m-100m", clientType: "Индивидуальные предприниматели", assetBand: "50–100 млн", clientCount: 72, assets: 0.016, commissionIncome: 0.008, avgIncomePerClient: 111.1, transactionCount: 980, mau: 68 },
      { id: "ip-100m-1b", clientType: "Индивидуальные предприниматели", assetBand: "100 млн – 1 млрд", clientCount: 8, assets: 0.002, commissionIncome: 0.002, avgIncomePerClient: 250, transactionCount: 20, mau: 8 },
    ],
  },
  {
    id: "legal",
    clientType: "Юридические лица",
    clientCount: 23000,
    assets: 42.6,
    commissionIncome: 5.7,
    avgIncomePerClient: 247.8,
    transactionCount: 2450000,
    mau: 21500,
    isGroupHeader: true,
    children: [
      { id: "legal-0-1k", clientType: "Юридические лица", assetBand: "0–1 тыс", clientCount: 1800, assets: 0.001, commissionIncome: 0.02, avgIncomePerClient: 11.1, transactionCount: 12000, mau: 1200 },
      { id: "legal-1k-100k", clientType: "Юридические лица", assetBand: "1 тыс – 100 тыс", clientCount: 5200, assets: 0.24, commissionIncome: 0.4, avgIncomePerClient: 76.9, transactionCount: 185000, mau: 4800 },
      { id: "legal-100k-1m", clientType: "Юридические лица", assetBand: "100 тыс – 1 млн", clientCount: 7800, assets: 3.8, commissionIncome: 1.8, avgIncomePerClient: 230.8, transactionCount: 920000, mau: 7200 },
      { id: "legal-1m-5m", clientType: "Юридические лица", assetBand: "1–5 млн", clientCount: 5200, assets: 12.4, commissionIncome: 2.2, avgIncomePerClient: 423.1, transactionCount: 850000, mau: 4900 },
      { id: "legal-5m-10m", clientType: "Юридические лица", assetBand: "5–10 млн", clientCount: 1800, assets: 12.8, commissionIncome: 0.86, avgIncomePerClient: 477.8, transactionCount: 320000, mau: 1700 },
      { id: "legal-10m-50m", clientType: "Юридические лица", assetBand: "10–50 млн", clientCount: 920, assets: 10.2, commissionIncome: 0.36, avgIncomePerClient: 391.3, transactionCount: 142000, mau: 880 },
      { id: "legal-50m-100m", clientType: "Юридические лица", assetBand: "50–100 млн", clientCount: 220, assets: 2.4, commissionIncome: 0.05, avgIncomePerClient: 227.3, transactionCount: 18000, mau: 210 },
      { id: "legal-100m-1b", clientType: "Юридические лица", assetBand: "100 млн – 1 млрд", clientCount: 52, assets: 0.72, commissionIncome: 0.008, avgIncomePerClient: 153.8, transactionCount: 2800, mau: 50 },
      { id: "legal-1b+", clientType: "Юридические лица", assetBand: "> 1 млрд", clientCount: 8, assets: 0.04, commissionIncome: 0.002, avgIncomePerClient: 250, transactionCount: 200, mau: 8 },
    ],
  },
];

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["individuals-resident"]));

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
    <section>
      <h2 className="text-3xl font-bold text-foreground mb-6">Клиентская база и сегменты</h2>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        {kpiMetrics.map((metric) => (
          <KPICard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            description={metric.description}
            change={metric.change}
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Свернуть
            </Button>
            <Button variant="outline" size="sm" onClick={expandAll}>
              Развернуть
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[280px]">Сегмент</TableHead>
                <TableHead className="text-right min-w-[120px]">Кол-во клиентов</TableHead>
                <TableHead className="text-right min-w-[120px]">Активы, млрд руб</TableHead>
                <TableHead className="text-right min-w-[140px]">Комиссионный доход, млрд руб</TableHead>
                <TableHead className="text-right min-w-[140px]">Ср. доход на клиента, тыс руб</TableHead>
                <TableHead className="text-right min-w-[120px]">Транзакций</TableHead>
                <TableHead className="text-right min-w-[100px]">MAU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segmentationData.map((group) => (
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
                        {group.clientType}
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
                        <TableCell className="pl-10 text-muted-foreground">{child.assetBand}</TableCell>
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
    </section>
  );
};
