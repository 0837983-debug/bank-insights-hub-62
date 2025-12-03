import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/KPICard";
import { FinancialTable } from "@/components/FinancialTable";
import { UsersIcon, UserCheckIcon, UserMinusIcon, TrendingUpIcon, WalletIcon } from "lucide-react";

// Key aggregates data
const keyAggregatesData = [
  { id: "avg_balance", name: "Средний баланс на клиента", value: 45820, description: "Средний объём клиентских средств (депозиты + остатки ДВС) на одного клиента", change: 7.3 },
  { id: "p80_revenue", name: "Концентрация дохода (P80)", value: 18.5, description: "Доля клиентов, формирующих 80% совокупного дохода", change: -1.2, unit: "%" },
  { id: "p80_assets", name: "Концентрация активов (P80)", value: 12.3, description: "Доля клиентов, на которых приходится 80% клиентских активов", change: -0.8, unit: "%" },
  { id: "avg_transactions", name: "Средняя транзакционная активность", value: 18.3, description: "Среднее количество транзакций на одного клиента за период", change: 9.4, unit: "tx/клиент" },
  { id: "penetration_intl", name: "Penetration международных переводов", value: 28.5, description: "Доля клиентов, использующих международные переводы ≥1 раз за период", change: 4.2, unit: "%" },
  { id: "penetration_cards", name: "Penetration карточных операций", value: 67.8, description: "Доля клиентов, совершающих карточные транзакции внутри страны", change: 6.1, unit: "%" },
];

// Client segments by type (Level 1)
const clientSegmentsData = [
  { id: "segments", name: "Клиентские сегменты", value: 2400000, isGroup: true, change: 8.5 },
  { id: "s1", name: "Физические лица — резиденты", value: 1850000, percentage: 77.1, description: "Резиденты РФ — физические лица", parentId: "segments", change: 9.2 },
  { id: "s2", name: "Физические лица — нерезиденты", value: 320000, percentage: 13.3, description: "Нерезиденты — физические лица", parentId: "segments", change: 12.5 },
  { id: "s3", name: "Юридические лица", value: 180000, percentage: 7.5, description: "Корпоративные клиенты", parentId: "segments", change: 4.8 },
  { id: "s4", name: "Индивидуальные предприниматели", value: 50000, percentage: 2.1, description: "ИП и самозанятые", parentId: "segments", change: 6.3 },
];

// Client segments assets
const clientSegmentsAssetsData = [
  { id: "assets", name: "Активы по сегментам, млрд руб", value: 110, isGroup: true, change: 11.2 },
  { id: "a1", name: "Физические лица — резиденты", value: 65.2, percentage: 59.3, parentId: "assets", change: 8.5 },
  { id: "a2", name: "Физические лица — нерезиденты", value: 28.4, percentage: 25.8, parentId: "assets", change: 18.2 },
  { id: "a3", name: "Юридические лица", value: 14.1, percentage: 12.8, parentId: "assets", change: 7.1 },
  { id: "a4", name: "Индивидуальные предприниматели", value: 2.3, percentage: 2.1, parentId: "assets", change: 5.9 },
];

// Client segments revenue
const clientSegmentsRevenueData = [
  { id: "revenue", name: "Доходы по сегментам, млрд руб", value: 42.5, isGroup: true, change: 14.8 },
  { id: "r1", name: "Физические лица — резиденты", value: 24.8, percentage: 58.4, parentId: "revenue", change: 12.3 },
  { id: "r2", name: "Физические лица — нерезиденты", value: 12.1, percentage: 28.5, parentId: "revenue", change: 22.5 },
  { id: "r3", name: "Юридические лица", value: 4.6, percentage: 10.8, parentId: "revenue", change: 8.7 },
  { id: "r4", name: "Индивидуальные предприниматели", value: 1.0, percentage: 2.3, parentId: "revenue", change: 9.2 },
];

// Asset buckets data (Level 2)
const assetBucketsData = [
  { id: "buckets", name: "Коридоры активов", value: 2400000, isGroup: true, change: 8.5 },
  { id: "b1", name: "до 1 тыс. руб.", value: 520000, percentage: 21.7, description: "Низкоактивные клиенты", parentId: "buckets", change: -2.1 },
  { id: "b2", name: "до 100 тыс. руб.", value: 890000, percentage: 37.1, parentId: "buckets", change: 5.8 },
  { id: "b3", name: "до 1 млн руб.", value: 620000, percentage: 25.8, parentId: "buckets", change: 12.4 },
  { id: "b4", name: "до 5 млн руб.", value: 245000, percentage: 10.2, parentId: "buckets", change: 15.2 },
  { id: "b5", name: "до 10 млн руб.", value: 78000, percentage: 3.3, parentId: "buckets", change: 18.7 },
  { id: "b6", name: "до 50 млн руб.", value: 32000, percentage: 1.3, parentId: "buckets", change: 14.3 },
  { id: "b7", name: "до 100 млн руб.", value: 9500, percentage: 0.4, parentId: "buckets", change: 11.2 },
  { id: "b8", name: "до 1 млрд руб.", value: 4800, percentage: 0.2, parentId: "buckets", change: 8.9 },
  { id: "b9", name: "свыше 1 млрд руб.", value: 700, percentage: 0.03, description: "VIP/UHNW клиенты", parentId: "buckets", change: 6.5 },
];

// Asset buckets by assets amount
const assetBucketsAmountData = [
  { id: "bucket_assets", name: "Активы по коридорам, млрд руб", value: 110, isGroup: true, change: 11.2 },
  { id: "ba1", name: "до 1 тыс. руб.", value: 0.3, percentage: 0.3, parentId: "bucket_assets", change: -5.2 },
  { id: "ba2", name: "до 100 тыс. руб.", value: 8.5, percentage: 7.7, parentId: "bucket_assets", change: 4.1 },
  { id: "ba3", name: "до 1 млн руб.", value: 18.2, percentage: 16.5, parentId: "bucket_assets", change: 9.8 },
  { id: "ba4", name: "до 5 млн руб.", value: 22.4, percentage: 20.4, parentId: "bucket_assets", change: 12.3 },
  { id: "ba5", name: "до 10 млн руб.", value: 14.8, percentage: 13.5, parentId: "bucket_assets", change: 15.1 },
  { id: "ba6", name: "до 50 млн руб.", value: 18.5, percentage: 16.8, parentId: "bucket_assets", change: 11.7 },
  { id: "ba7", name: "до 100 млн руб.", value: 12.3, percentage: 11.2, parentId: "bucket_assets", change: 9.4 },
  { id: "ba8", name: "до 1 млрд руб.", value: 9.8, percentage: 8.9, parentId: "bucket_assets", change: 7.2 },
  { id: "ba9", name: "свыше 1 млрд руб.", value: 5.2, percentage: 4.7, parentId: "bucket_assets", change: 4.8 },
];

// Concentration metrics
const concentrationData = [
  { id: "concentration", name: "Концентрационные показатели", value: 0, isGroup: true },
  { id: "c1", name: "P80 по доходу", value: 18.5, description: "% клиентов, формирующих 80% дохода (сортировка по доходу)", parentId: "concentration", change: -1.2, unit: "%" },
  { id: "c2", name: "P80 по активам", value: 12.3, description: "% клиентов, на которых приходится 80% активов (сортировка по активам)", parentId: "concentration", change: -0.8, unit: "%" },
  { id: "c3", name: "Gini-коэффициент (доходы)", value: 0.72, description: "Индекс концентрации доходов (0-1)", parentId: "concentration", change: -2.1 },
  { id: "c4", name: "Gini-коэффициент (активы)", value: 0.68, description: "Индекс концентрации активов (0-1)", parentId: "concentration", change: -1.5 },
];

export const ClientBase = () => {
  return (
    <section>
      <h2 className="text-3xl font-bold text-foreground mb-6">Клиентская база и сегменты</h2>
      
      {/* Key Metrics - KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <KPICard
          title="MAO"
          value="2.4 млн"
          change={8.5}
          showChange={true}
          subtitle="Monthly Active Owners"
          description="Количество уникальных клиентов, совершивших ≥1 операцию за месяц"
          icon={<UsersIcon className="w-5 h-5" />}
        />
        
        <KPICard
          title="DAO"
          value="785 тыс"
          change={6.2}
          showChange={true}
          subtitle="Daily Active Owners"
          description="Среднее дневное число уникальных клиентов, совершивших ≥1 операцию"
          icon={<UserCheckIcon className="w-5 h-5" />}
        />
        
        <KPICard
          title="ARPU"
          value="₽1,475"
          change={5.8}
          showChange={true}
          subtitle="Avg Revenue Per User"
          description="Средний доход на одного активного клиента за период"
          icon={<WalletIcon className="w-5 h-5" />}
        />
        
        <KPICard
          title="Retention M→M"
          value="78.5%"
          change={2.1}
          showChange={true}
          subtitle="Удержание"
          description="Доля клиентов, совершивших ≥1 операцию в текущем и предыдущем месяце"
          icon={<TrendingUpIcon className="w-5 h-5" />}
        />
        
        <KPICard
          title="Churn"
          value="4.2%"
          change={-1.3}
          showChange={true}
          subtitle="Отток клиентов"
          description="Доля клиентов, не совершивших операций в текущем периоде, но активных в предыдущем"
          icon={<UserMinusIcon className="w-5 h-5" />}
        />
      </div>

      {/* Key Aggregates Table */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Ключевые агрегаты клиентской базы</h3>
        <div className="space-y-3">
          {keyAggregatesData.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground">
                  {item.unit === "%" ? `${item.value}%` : 
                   item.unit === "tx/клиент" ? `${item.value} tx/клиент` :
                   `₽${item.value.toLocaleString('ru-RU')}`}
                </div>
                <div className={`text-xs flex items-center justify-end gap-1 ${item.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Client Segments by Type - 3 tables side by side */}
      <h3 className="text-xl font-semibold text-foreground mb-4">Структура по типу клиента</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <FinancialTable
          title="Количество клиентов"
          rows={clientSegmentsData}
          showPercentage={true}
          showChange={true}
        />
        <FinancialTable
          title="Активы"
          rows={clientSegmentsAssetsData}
          showPercentage={true}
          showChange={true}
        />
        <FinancialTable
          title="Доходы"
          rows={clientSegmentsRevenueData}
          showPercentage={true}
          showChange={true}
        />
      </div>

      {/* Asset Buckets */}
      <h3 className="text-xl font-semibold text-foreground mb-4">Коридоры клиентских активов</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <FinancialTable
          title="Распределение клиентов"
          rows={assetBucketsData}
          showPercentage={true}
          showChange={true}
        />
        <FinancialTable
          title="Распределение активов"
          rows={assetBucketsAmountData}
          showPercentage={true}
          showChange={true}
        />
      </div>

      {/* Concentration Metrics */}
      <FinancialTable
        title="Концентрационные показатели"
        rows={concentrationData}
        showPercentage={false}
        showChange={true}
      />
    </section>
  );
};
