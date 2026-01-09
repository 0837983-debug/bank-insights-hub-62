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
import { ActivityIcon, AlertCircleIcon, ClockIcon, TrendingUpIcon } from "lucide-react";

const incidentData = [
  { month: "Янв", incidents: 12, mttr: 45 },
  { month: "Фев", incidents: 8, mttr: 38 },
  { month: "Мар", incidents: 15, mttr: 52 },
  { month: "Апр", incidents: 10, mttr: 41 },
  { month: "Май", incidents: 7, mttr: 35 },
  { month: "Июн", incidents: 9, mttr: 39 },
];

export const TechnologyMetrics = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">3. Технологические метрики</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Uptime систем"
          value="99.97%"
          showChange={true}
          change={0.05}
          description="Доступность"
          icon={<TrendingUpIcon className="w-6 h-6 text-success" />}
        />
        <KPICard
          title="Время обработки"
          value="0.42 сек"
          showChange={true}
          change={-8.5}
          description="Средняя транзакция"
          icon={<ClockIcon className="w-6 h-6 text-accent" />}
        />
        <KPICard
          title="Инциденты"
          value="9"
          showChange={true}
          change={-22.2}
          description="За текущий месяц"
          icon={<AlertCircleIcon className="w-6 h-6 text-warning" />}
        />
        <KPICard
          title="Загруженность API"
          value="12.4K RPS"
          showChange={true}
          change={15.3}
          description="Запросов в секунду"
          icon={<ActivityIcon className="w-6 h-6 text-accent" />}
        />
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">ИТ-инциденты и MTTR</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={incidentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
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
              dataKey="incidents"
              fill="hsl(var(--chart-1))"
              name="Инциденты"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="mttr"
              fill="hsl(var(--chart-2))"
              name="MTTR (мин)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
