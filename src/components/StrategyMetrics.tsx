import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { KPICard } from "./MetricCard";
import { TrendingUpIcon, SmartphoneIcon, StarIcon } from "lucide-react";

const revenueData = [
  { segment: "Комиссии", retail: 45, corporate: 35 },
  { segment: "Эквайринг", retail: 25, corporate: 40 },
  { segment: "Обслуживание", retail: 20, corporate: 15 },
  { segment: "Прочее", retail: 10, corporate: 10 },
];

export const StrategyMetrics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">5. Стратегические метрики</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="CAC"
          value="₽3,450"
          showChange={true}
          change={-5.2}
          description="Стоимость привлечения"
          icon={<TrendingUpIcon className="w-6 h-6 text-accent" />}
        />
        <KPICard
          title="LTV"
          value="₽42,800"
          showChange={true}
          change={8.7}
          description="Lifetime Value"
          icon={<TrendingUpIcon className="w-6 h-6 text-success" />}
        />
        <KPICard
          title="Digital операции"
          value="87.5%"
          showChange={true}
          change={6.3}
          description="Доля цифровых каналов"
          icon={<SmartphoneIcon className="w-6 h-6 text-accent" />}
        />
        <KPICard
          title="NPS"
          value="72"
          showChange={true}
          change={4.0}
          description="Индекс лояльности"
          icon={<StarIcon className="w-6 h-6 text-success" />}
        />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Структура доходов по сегментам
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="segment"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              dataKey="retail"
              fill="hsl(var(--chart-1))"
              name="Физ. лица (%)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="corporate"
              fill="hsl(var(--chart-2))"
              name="Корпоративные (%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
